import {
  BusinessKPIs,
  CleanedTransaction,
  ClusteredCustomer,
  ClusteringMetrics,
  ClusterProfile,
  FullPipelineResult,
  KMeansEvalPoint,
  MissingValueSummary,
  PreprocessingStats,
  RawTransactionRow,
  RFMRecord,
  RFMSummary,
  ScoredRFMRecord,
} from "./types";

const SEGMENT_RECOMMENDATIONS: Record<
  string,
  { description: string; action: string }
> = {
  "High Value Customers": {
    description:
      "Most recent buyers who purchase frequently and generate the highest revenue.",
    action:
      "Offer VIP rewards, early access to new collections, priority support, and exclusive loyalty perks.",
  },
  "Loyal Customers": {
    description:
      "Consistent repeat shoppers with strong order frequency and reliable spend.",
    action:
      "Enroll in tiered loyalty programs, offer bundle cross-sells, and request product reviews or referrals.",
  },
  "Potential Loyal Customers": {
    description:
      "Moderately recent shoppers with promising order sizes who can grow into loyal advocates.",
    action:
      "Encourage repeat purchases through personalized product recommendations and second-order incentives.",
  },
  "New Customers": {
    description:
      "Recent first-time or low-frequency buyers still forming a habit with your store.",
    action:
      "Send onboarding welcome sequences, helpful usage guides, and time-limited next-purchase discounts.",
  },
  "At Risk Customers": {
    description:
      "Previously active or high-spending buyers who have not purchased recently.",
    action:
      "Trigger personalized win-back emails, targeted vouchers, and feedback surveys before churn occurs.",
  },
  "Lost Customers": {
    description:
      "Long-inactive customers with low purchase frequency and low recent engagement.",
    action:
      "Launch low-cost reactivation campaigns, seasonal clearance offers, or suppress from expensive ad spend.",
  },
};

function parseFlexibleDate(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  // Try standard ISO / YYYY-MM-DD HH:MM:SS first
  const isoAttempt = new Date(trimmed.replace(" ", "T"));
  if (!Number.isNaN(isoAttempt.getTime())) {
    return isoAttempt;
  }
  // Try DD/MM/YYYY HH:MM or MM/DD/YYYY HH:MM (common in UCI Online Retail CSVs)
  const match = trimmed.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (match) {
    const p1 = Number(match[1]);
    const p2 = Number(match[2]);
    let yr = Number(match[3]);
    if (yr < 100) yr += 2000;
    const hh = Number(match[4] ?? 0);
    const mm = Number(match[5] ?? 0);
    const ss = Number(match[6] ?? 0);
    // UCI Online Retail uses day/month/year when p1 > 12 or default UK format
    const day = p1 > 12 ? p1 : p2 > 12 ? p2 : p1;
    const month = p1 > 12 ? p2 - 1 : p2 > 12 ? p1 - 1 : p2 - 1;
    const d = new Date(yr, month, day, hh, mm, ss);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function analyzeMissingValues(
  headers: string[],
  rawRows: RawTransactionRow[]
): MissingValueSummary[] {
  const total = Math.max(rawRows.length, 1);
  return headers.map((col) => {
    let missingCount = 0;
    let numericCount = 0;
    let nonEmptyCount = 0;

    for (const row of rawRows) {
      const val = (row[col] ?? "").trim();
      if (val === "" || val.toLowerCase() === "nan" || val.toLowerCase() === "null") {
        missingCount++;
      } else {
        nonEmptyCount++;
        if (!Number.isNaN(Number(val))) numericCount++;
      }
    }

    let dataType = "string";
    if (col === "InvoiceDate") dataType = "datetime";
    else if (nonEmptyCount > 0 && numericCount === nonEmptyCount) dataType = "numeric";

    return {
      column: col,
      dataType,
      missingCount,
      missingPct: Number(((missingCount / total) * 100).toFixed(2)),
    };
  });
}

export function preprocessTransactions(
  headers: string[],
  rawRows: RawTransactionRow[]
): { cleanedRows: CleanedTransaction[]; stats: PreprocessingStats } {
  let removedMissingCustomerId = 0;
  let removedCancelledInvoices = 0;
  let removedNonPositiveQuantity = 0;
  let removedNonPositivePrice = 0;
  let removedInvalidDates = 0;
  let removedDuplicates = 0;

  const seenKeys = new Set<string>();
  const cleanedRows: CleanedTransaction[] = [];

  for (const row of rawRows) {
    const rawCid = (row["CustomerID"] ?? "").trim();
    if (!rawCid || rawCid.toLowerCase() === "nan" || rawCid.toLowerCase() === "null") {
      removedMissingCustomerId++;
      continue;
    }
    const cid = rawCid.replace(/\.0$/, "");

    const invoiceNo = (row["InvoiceNo"] ?? "").trim();
    if (invoiceNo.toUpperCase().startsWith("C")) {
      removedCancelledInvoices++;
      continue;
    }

    const qty = Number(row["Quantity"]);
    const price = Number(row["UnitPrice"]);
    if (Number.isNaN(qty) || qty <= 0) {
      removedNonPositiveQuantity++;
      continue;
    }
    if (Number.isNaN(price) || price <= 0) {
      removedNonPositivePrice++;
      continue;
    }

    const rawDate = (row["InvoiceDate"] ?? "").trim();
    const parsedDate = parseFlexibleDate(rawDate);
    if (!parsedDate) {
      removedInvalidDates++;
      continue;
    }

    const stockCode = (row["StockCode"] ?? "N/A").trim();
    const description = (row["Description"] ?? "Item").trim() || "Item";
    const country = (row["Country"] ?? "Unknown").trim() || "Unknown";

    const dupKey = `${invoiceNo}|${stockCode}|${description}|${qty}|${parsedDate.getTime()}|${price}|${cid}|${country}`;
    if (seenKeys.has(dupKey)) {
      removedDuplicates++;
      continue;
    }
    seenKeys.add(dupKey);

    const totalPrice = Number((qty * price).toFixed(2));
    cleanedRows.push({
      InvoiceNo: invoiceNo,
      StockCode: stockCode,
      Description: description,
      Quantity: qty,
      InvoiceDate: parsedDate,
      InvoiceDateStr: parsedDate.toISOString().slice(0, 19).replace("T", " "),
      UnitPrice: price,
      CustomerID: cid,
      Country: country,
      TotalPrice: totalPrice,
    });
  }

  if (cleanedRows.length === 0) {
    throw new Error("No valid transactions remained after preprocessing. Please inspect your CSV columns and values.");
  }

  const customers = new Set<string>();
  const invoices = new Set<string>();
  let totalRevenue = 0;
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const r of cleanedRows) {
    customers.add(r.CustomerID);
    invoices.add(r.InvoiceNo);
    totalRevenue += r.TotalPrice;
    const t = r.InvoiceDate.getTime();
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
  }

  const stats: PreprocessingStats = {
    initialRows: rawRows.length,
    initialCols: headers.length,
    finalRows: cleanedRows.length,
    finalCols: headers.includes("TotalPrice") ? headers.length : headers.length + 1,
    rowsRemoved: rawRows.length - cleanedRows.length,
    retentionPct: Number(((cleanedRows.length / Math.max(rawRows.length, 1)) * 100).toFixed(2)),
    removedMissingCustomerId,
    removedCancelledInvoices,
    removedNonPositiveQuantity,
    removedNonPositivePrice,
    removedInvalidDates,
    removedDuplicates,
    uniqueCustomers: customers.size,
    uniqueInvoices: invoices.size,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    dateMin: new Date(minTime).toISOString().slice(0, 10),
    dateMax: new Date(maxTime).toISOString().slice(0, 10),
  };

  return { cleanedRows, stats };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateRFM(cleanedRows: CleanedTransaction[]): {
  rfmRows: RFMRecord[];
  rfmSummary: RFMSummary;
} {
  let maxTime = -Infinity;
  for (const r of cleanedRows) {
    const t = r.InvoiceDate.getTime();
    if (t > maxTime) maxTime = t;
  }
  const referenceDate = new Date(maxTime + 24 * 60 * 60 * 1000);

  const grouped = new Map<
    string,
    { lastTime: number; invoices: Set<string>; monetary: number }
  >();

  for (const r of cleanedRows) {
    const existing = grouped.get(r.CustomerID);
    const t = r.InvoiceDate.getTime();
    if (!existing) {
      grouped.set(r.CustomerID, {
        lastTime: t,
        invoices: new Set([r.InvoiceNo]),
        monetary: r.TotalPrice,
      });
    } else {
      if (t > existing.lastTime) existing.lastTime = t;
      existing.invoices.add(r.InvoiceNo);
      existing.monetary += r.TotalPrice;
    }
  }

  const rfmRows: RFMRecord[] = [];
  for (const [cid, data] of grouped.entries()) {
    const diffDays = Math.max(
      1,
      Math.floor((referenceDate.getTime() - data.lastTime) / (1000 * 60 * 60 * 24))
    );
    rfmRows.push({
      CustomerID: cid,
      Recency: diffDays,
      Frequency: data.invoices.size,
      Monetary: Number(data.monetary.toFixed(2)),
    });
  }

  rfmRows.sort((a, b) => b.Monetary - a.Monetary);

  const recencies = rfmRows.map((r) => r.Recency);
  const frequencies = rfmRows.map((r) => r.Frequency);
  const monetaries = rfmRows.map((r) => r.Monetary);
  const n = Math.max(rfmRows.length, 1);

  const rfmSummary: RFMSummary = {
    referenceDate: referenceDate.toISOString().slice(0, 19).replace("T", " "),
    totalCustomers: rfmRows.length,
    avgRecency: Number((recencies.reduce((s, v) => s + v, 0) / n).toFixed(2)),
    medianRecency: Number(median(recencies).toFixed(2)),
    avgFrequency: Number((frequencies.reduce((s, v) => s + v, 0) / n).toFixed(2)),
    medianFrequency: Number(median(frequencies).toFixed(2)),
    avgMonetary: Number((monetaries.reduce((s, v) => s + v, 0) / n).toFixed(2)),
    medianMonetary: Number(median(monetaries).toFixed(2)),
  };

  return { rfmRows, rfmSummary };
}

function assignRankQuantileScores(values: number[], reverse: boolean): number[] {
  const n = values.length;
  if (n === 0) return [];
  const distinct = new Set(values).size;
  if (distinct <= 1) return new Array(n).fill(3);

  const nBins = Math.min(5, n);
  // Sort indices stably to mirror pandas rank(method='first')
  const indexed = values.map((v, idx) => ({ v, idx }));
  indexed.sort((a, b) => (a.v !== b.v ? a.v - b.v : a.idx - b.idx));

  const scores = new Array<number>(n);
  for (let rankPos = 0; rankPos < n; rankPos++) {
    const bin = Math.min(nBins - 1, Math.floor((rankPos * nBins) / n));
    const score = reverse ? nBins - bin : bin + 1;
    scores[indexed[rankPos].idx] = score;
  }
  return scores;
}

function classifyRfmCategory(r: number, f: number, m: number): string {
  const fm = (f + m) / 2;
  if (r >= 4 && fm >= 4.0) return "Champions";
  if (r >= 3 && fm >= 3.5) return "Loyal Customers";
  if (r >= 4 && fm >= 2.0 && fm < 3.5) return "Potential Loyalists";
  if (r >= 4 && fm < 2.0) return "Recent Customers";
  if (r >= 2 && r <= 3 && fm >= 3.0) return "At Risk Customers";
  if (r <= 2 && fm >= 2.0 && fm < 3.0) return "Hibernating Customers";
  if (r === 1 && fm < 2.0) return "Lost Customers";
  if (r === 2 && fm < 2.0) return "Hibernating Customers";
  return "Potential Loyalists";
}

export function scoreRFM(rfmRows: RFMRecord[]): ScoredRFMRecord[] {
  const rScores = assignRankQuantileScores(
    rfmRows.map((r) => r.Recency),
    true
  );
  const fScores = assignRankQuantileScores(
    rfmRows.map((r) => r.Frequency),
    false
  );
  const mScores = assignRankQuantileScores(
    rfmRows.map((r) => r.Monetary),
    false
  );

  return rfmRows.map((row, idx) => {
    const r = rScores[idx];
    const f = fScores[idx];
    const m = mScores[idx];
    return {
      ...row,
      R_Score: r,
      F_Score: f,
      M_Score: m,
      RFM_Score: `${r}${f}${m}`,
      RFM_Total: r + f + m,
      RFM_Category: classifyRfmCategory(r, f, m),
    };
  });
}

// Deterministic PRNG (Mulberry32) for reproducible K-Means++ initialization
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sqEuclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum;
}

function standardizeLogRfm(rfmRows: ScoredRFMRecord[]): number[][] {
  const raw = rfmRows.map((r) => [
    Math.log1p(Math.max(0, r.Recency)),
    Math.log1p(Math.max(0, r.Frequency)),
    Math.log1p(Math.max(0, r.Monetary)),
  ]);

  const n = raw.length;
  const means = [0, 0, 0];
  for (const row of raw) {
    means[0] += row[0];
    means[1] += row[1];
    means[2] += row[2];
  }
  means[0] /= n;
  means[1] /= n;
  means[2] /= n;

  const stds = [0, 0, 0];
  for (const row of raw) {
    stds[0] += (row[0] - means[0]) ** 2;
    stds[1] += (row[1] - means[1]) ** 2;
    stds[2] += (row[2] - means[2]) ** 2;
  }
  stds[0] = Math.sqrt(stds[0] / n) || 1;
  stds[1] = Math.sqrt(stds[1] / n) || 1;
  stds[2] = Math.sqrt(stds[2] / n) || 1;

  return raw.map((row) => [
    (row[0] - means[0]) / stds[0],
    (row[1] - means[1]) / stds[1],
    (row[2] - means[2]) / stds[2],
  ]);
}

function fitKMeansSingleRun(
  points: number[][],
  k: number,
  seed: number,
  maxIter = 100
): { labels: number[]; inertia: number; iterations: number } {
  const n = points.length;
  const dims = points[0].length;
  const rng = mulberry32(seed);

  // K-Means++ initialization
  const centroids: number[][] = [];
  const firstIdx = Math.floor(rng() * n);
  centroids.push([...points[firstIdx]]);

  const distSq = new Array<number>(n).fill(Infinity);
  for (let c = 1; c < k; c++) {
    let totalDist = 0;
    for (let i = 0; i < n; i++) {
      const d = sqEuclidean(points[i], centroids[c - 1]);
      if (d < distSq[i]) distSq[i] = d;
      totalDist += distSq[i];
    }
    if (totalDist === 0) {
      centroids.push([...points[Math.floor(rng() * n)]]);
      continue;
    }
    let threshold = rng() * totalDist;
    let chosen = 0;
    for (let i = 0; i < n; i++) {
      threshold -= distSq[i];
      if (threshold <= 0) {
        chosen = i;
        break;
      }
    }
    centroids.push([...points[chosen]]);
  }

  let labels = new Array<number>(n).fill(0);
  let iterations = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    iterations++;
    let changed = false;

    // Assignment step
    for (let i = 0; i < n; i++) {
      let bestCluster = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const d = sqEuclidean(points[i], centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          bestCluster = c;
        }
      }
      if (labels[i] !== bestCluster) {
        labels[i] = bestCluster;
        changed = true;
      }
    }

    // Update centroids
    const sums = Array.from({ length: k }, () => new Array<number>(dims).fill(0));
    const counts = new Array<number>(k).fill(0);
    for (let i = 0; i < n; i++) {
      const c = labels[i];
      counts[c]++;
      for (let d = 0; d < dims; d++) {
        sums[c][d] += points[i][d];
      }
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < dims; d++) {
          centroids[c][d] = sums[c][d] / counts[c];
        }
      } else {
        centroids[c] = [...points[Math.floor(rng() * n)]];
      }
    }

    if (!changed) break;
  }

  let inertia = 0;
  for (let i = 0; i < n; i++) {
    inertia += sqEuclidean(points[i], centroids[labels[i]]);
  }

  return { labels, inertia, iterations };
}

function fitKMeansBest(
  points: number[][],
  k: number,
  nInit = 8
): { labels: number[]; inertia: number; iterations: number } {
  let best = fitKMeansSingleRun(points, k, 42);
  for (let run = 1; run < nInit; run++) {
    const candidate = fitKMeansSingleRun(points, k, 42 + run * 17);
    if (candidate.inertia < best.inertia) {
      best = candidate;
    }
  }
  return best;
}

function computeSilhouetteScore(points: number[][], labels: number[]): number | null {
  const n = points.length;
  const uniqueClusters = Array.from(new Set(labels));
  if (uniqueClusters.length < 2 || uniqueClusters.length >= n) return null;

  // Group indices by cluster
  const clusterMembers = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const arr = clusterMembers.get(labels[i]) || [];
    arr.push(i);
    clusterMembers.set(labels[i], arr);
  }

  let totalScore = 0;
  for (let i = 0; i < n; i++) {
    const ownCluster = labels[i];
    const ownMembers = clusterMembers.get(ownCluster) || [];

    // a(i): mean intra-cluster distance
    let a = 0;
    if (ownMembers.length > 1) {
      let sumOwn = 0;
      for (const j of ownMembers) {
        if (i !== j) {
          sumOwn += Math.sqrt(sqEuclidean(points[i], points[j]));
        }
      }
      a = sumOwn / (ownMembers.length - 1);
    }

    // b(i): minimum mean distance to another cluster
    let b = Infinity;
    for (const [cid, members] of clusterMembers.entries()) {
      if (cid === ownCluster || members.length === 0) continue;
      let sumOther = 0;
      for (const j of members) {
        sumOther += Math.sqrt(sqEuclidean(points[i], points[j]));
      }
      const meanOther = sumOther / members.length;
      if (meanOther < b) b = meanOther;
    }

    const denom = Math.max(a, b);
    const s = denom > 0 ? (b - a) / denom : 0;
    totalScore += s;
  }

  return Number((totalScore / n).toFixed(4));
}

export function runFullSegmentationPipeline(
  headers: string[],
  rawRows: RawTransactionRow[],
  selectedK: number
): FullPipelineResult {
  const missingSummary = analyzeMissingValues(headers, rawRows);
  const { cleanedRows, stats: prepStats } = preprocessTransactions(headers, rawRows);
  const { rfmRows, rfmSummary } = calculateRFM(cleanedRows);
  const scoredRFM = scoreRFM(rfmRows);

  const nSamples = scoredRFM.length;
  if (nSamples < 3) {
    throw new Error("At least 3 unique customers are required for K-Means clustering.");
  }

  const scaledPoints = standardizeLogRfm(scoredRFM);
  const upperEvalK = Math.min(10, nSamples - 1);
  const evalPoints: KMeansEvalPoint[] = [];

  for (let k = 2; k <= upperEvalK; k++) {
    const fit = fitKMeansBest(scaledPoints, k, 6);
    const sil = computeSilhouetteScore(scaledPoints, fit.labels);
    evalPoints.push({
      k,
      inertia: Number(fit.inertia.toFixed(2)),
      silhouetteScore: sil,
    });
  }

  const safeK = Math.max(2, Math.min(selectedK, nSamples - 1));
  const finalFit = fitKMeansBest(scaledPoints, safeK, 10);
  const finalSilhouette = computeSilhouetteScore(scaledPoints, finalFit.labels);

  // Build raw cluster aggregations
  const clusterStats = new Map<
    number,
    { count: number; sumR: number; sumF: number; sumM: number }
  >();
  for (let i = 0; i < nSamples; i++) {
    const c = finalFit.labels[i];
    const row = scoredRFM[i];
    const cur = clusterStats.get(c) || { count: 0, sumR: 0, sumF: 0, sumM: 0 };
    cur.count++;
    cur.sumR += row.Recency;
    cur.sumF += row.Frequency;
    cur.sumM += row.Monetary;
    clusterStats.set(c, cur);
  }

  const overallR = rfmSummary.avgRecency;
  const overallF = rfmSummary.avgFrequency;
  const overallM = rfmSummary.avgMonetary;

  const rawProfiles = Array.from(clusterStats.entries()).map(([cluster, st]) => ({
    cluster,
    customerCount: st.count,
    customerSharePct: Number(((st.count / nSamples) * 100).toFixed(2)),
    avgRecency: Number((st.sumR / st.count).toFixed(2)),
    avgFrequency: Number((st.sumF / st.count).toFixed(2)),
    avgMonetary: Number((st.sumM / st.count).toFixed(2)),
    totalMonetary: Number(st.sumM.toFixed(2)),
  }));

  const rMax = Math.max(...rawProfiles.map((p) => p.avgRecency), 1);
  const fMax = Math.max(...rawProfiles.map((p) => p.avgFrequency), 1);
  const mMax = Math.max(...rawProfiles.map((p) => p.avgMonetary), 1);

  const rankedProfiles = rawProfiles
    .map((p) => ({
      ...p,
      healthIndex:
        (1 - p.avgRecency / rMax) * 0.35 +
        (p.avgFrequency / fMax) * 0.3 +
        (p.avgMonetary / mMax) * 0.35,
    }))
    .sort((a, b) => b.healthIndex - a.healthIndex);

  const usedNames = new Map<string, number>();
  const clusterToSegment = new Map<number, string>();

  const clusterProfiles: ClusterProfile[] = rankedProfiles.map((p) => {
    const rRatio = p.avgRecency / Math.max(overallR, 1e-6);
    const fRatio = p.avgFrequency / Math.max(overallF, 1e-6);
    const mRatio = p.avgMonetary / Math.max(overallM, 1e-6);

    let baseName = "Lost Customers";
    if (rRatio <= 0.85 && fRatio >= 1.2 && mRatio >= 1.2) {
      baseName = "High Value Customers";
    } else if (rRatio <= 0.95 && (fRatio >= 0.95 || mRatio >= 1.0)) {
      baseName = "Loyal Customers";
    } else if (rRatio <= 0.85 && fRatio < 0.95) {
      baseName = p.avgFrequency <= 2.2 ? "New Customers" : "Potential Loyal Customers";
    } else if (rRatio > 0.95 && (fRatio >= 0.85 || mRatio >= 0.85)) {
      baseName = "At Risk Customers";
    } else if (rRatio <= 1.25) {
      baseName = "Potential Loyal Customers";
    }

    const seen = (usedNames.get(baseName) || 0) + 1;
    usedNames.set(baseName, seen);
    const segmentName = seen === 1 ? baseName : `${baseName} (${seen})`;
    clusterToSegment.set(p.cluster, segmentName);

    const rec = SEGMENT_RECOMMENDATIONS[baseName] || {
      description: "Distinct behavioral customer cluster.",
      action: "Tailor offers based on cluster RFM averages.",
    };

    return {
      cluster: p.cluster,
      segmentName,
      customerCount: p.customerCount,
      customerSharePct: p.customerSharePct,
      avgRecency: p.avgRecency,
      avgFrequency: p.avgFrequency,
      avgMonetary: p.avgMonetary,
      totalMonetary: p.totalMonetary,
      characteristics: rec.description,
      recommendedAction: rec.action,
    };
  });

  const clusteredCustomers: ClusteredCustomer[] = scoredRFM.map((row, idx) => {
    const cluster = finalFit.labels[idx];
    return {
      ...row,
      Cluster: cluster,
      Recency_Scaled: Number(scaledPoints[idx][0].toFixed(4)),
      Frequency_Scaled: Number(scaledPoints[idx][1].toFixed(4)),
      Monetary_Scaled: Number(scaledPoints[idx][2].toFixed(4)),
      Segment_Name: clusterToSegment.get(cluster) || `Cluster ${cluster}`,
    };
  });

  const topSpendSegment = [...clusterProfiles].sort(
    (a, b) => b.avgMonetary - a.avgMonetary
  )[0];

  const kpis: BusinessKPIs = {
    totalCustomers: nSamples,
    numSegments: clusterProfiles.length,
    highestValueSegment: topSpendSegment.segmentName,
    highestValueAvgSpend: topSpendSegment.avgMonetary,
    avgCustomerMonetary: rfmSummary.avgMonetary,
    totalRevenue: prepStats.totalRevenue,
  };

  const clusteringMetrics: ClusteringMetrics = {
    nClusters: safeK,
    inertia: Number(finalFit.inertia.toFixed(2)),
    silhouetteScore: finalSilhouette,
    iterations: finalFit.iterations,
  };

  return {
    rawHeaders: headers,
    rawRows,
    missingSummary,
    cleanedRows,
    prepStats,
    rfmSummary,
    scoredRFM,
    evalPoints,
    clusteredCustomers,
    clusterProfiles,
    clusteringMetrics,
    kpis,
  };
}
