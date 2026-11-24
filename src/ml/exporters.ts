import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { FullPipelineResult } from "./types";

// Import the real Python/Streamlit project files directly so the downloadable ZIP is 100% synced
import pyApp from "../../ecommerce-customer-segmentation/app.py?raw";
import pyRequirements from "../../ecommerce-customer-segmentation/requirements.txt?raw";
import pyReadme from "../../ecommerce-customer-segmentation/README.md?raw";
import pySampleCsv from "../../ecommerce-customer-segmentation/data/sample_online_retail.csv?raw";
import pyInit from "../../ecommerce-customer-segmentation/src/__init__.py?raw";
import pyPreprocessing from "../../ecommerce-customer-segmentation/src/data_preprocessing.py?raw";
import pyRfmAnalysis from "../../ecommerce-customer-segmentation/src/rfm_analysis.py?raw";
import pyRfmScoring from "../../ecommerce-customer-segmentation/src/rfm_scoring.py?raw";
import pyClustering from "../../ecommerce-customer-segmentation/src/clustering.py?raw";
import pyVisualization from "../../ecommerce-customer-segmentation/src/visualization.py?raw";
import pyBusinessInsights from "../../ecommerce-customer-segmentation/src/business_insights.py?raw";

function escapeCsvCell(val: string | number): string {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsv(
  headers: string[],
  rows: Array<Array<string | number>>,
  filename: string
) {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerBlobDownload(blob, filename);
}

export function downloadCleanedDatasetCsv(result: FullPipelineResult) {
  const headers = [
    "InvoiceNo",
    "StockCode",
    "Description",
    "Quantity",
    "InvoiceDate",
    "UnitPrice",
    "CustomerID",
    "Country",
    "TotalPrice",
  ];
  const rows = result.cleanedRows.map((r) => [
    r.InvoiceNo,
    r.StockCode,
    r.Description,
    r.Quantity,
    r.InvoiceDateStr,
    r.UnitPrice,
    r.CustomerID,
    r.Country,
    r.TotalPrice,
  ]);
  downloadCsv(headers, rows, "cleaned_transactions.csv");
}

export function downloadRfmAnalysisCsv(result: FullPipelineResult) {
  const headers = [
    "CustomerID",
    "Recency",
    "Frequency",
    "Monetary",
    "R_Score",
    "F_Score",
    "M_Score",
    "RFM_Score",
    "RFM_Total",
    "RFM_Category",
  ];
  const rows = result.scoredRFM.map((r) => [
    r.CustomerID,
    r.Recency,
    r.Frequency,
    r.Monetary,
    r.R_Score,
    r.F_Score,
    r.M_Score,
    r.RFM_Score,
    r.RFM_Total,
    r.RFM_Category,
  ]);
  downloadCsv(headers, rows, "rfm_analysis.csv");
}

export function downloadSegmentationCsv(result: FullPipelineResult) {
  const headers = [
    "CustomerID",
    "Recency",
    "Frequency",
    "Monetary",
    "RFM_Score",
    "RFM_Category",
    "Cluster",
    "Segment_Name",
  ];
  const rows = result.clusteredCustomers.map((r) => [
    r.CustomerID,
    r.Recency,
    r.Frequency,
    r.Monetary,
    r.RFM_Score,
    r.RFM_Category,
    r.Cluster,
    r.Segment_Name,
  ]);
  downloadCsv(headers, rows, "customer_segmentation_results.csv");
}

export function downloadClusterSummaryCsv(result: FullPipelineResult) {
  const headers = [
    "Cluster",
    "Segment_Name",
    "Customer_Count",
    "Customer_Share_Pct",
    "Avg_Recency",
    "Avg_Frequency",
    "Avg_Monetary",
    "Total_Monetary",
    "Recommended_Action",
  ];
  const rows = result.clusterProfiles.map((p) => [
    p.cluster,
    p.segmentName,
    p.customerCount,
    p.customerSharePct,
    p.avgRecency,
    p.avgFrequency,
    p.avgMonetary,
    p.totalMonetary,
    p.recommendedAction,
  ]);
  downloadCsv(headers, rows, "cluster_summary.csv");
}

export function downloadExecutivePdfReport(result: FullPipelineResult) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { prepStats, rfmSummary, clusteringMetrics, kpis, clusterProfiles } = result;

  let y = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const usableWidth = pageWidth - margin * 2;

  const checkPageBreak = (needed = 24) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42);
  doc.text("E-commerce Customer Segmentation Report", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("RFM Analysis & K-Means Clustering Executive Summary", margin, y);
  y += 10;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Section 1
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("1. Dataset & Preprocessing Summary", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const s1 = [
    `Raw Rows: ${prepStats.initialRows.toLocaleString()}   |   Cleaned Rows: ${prepStats.finalRows.toLocaleString()}   |   Retention: ${prepStats.retentionPct}%`,
    `Removed Missing CustomerID: ${prepStats.removedMissingCustomerId}   |   Cancelled Invoices: ${prepStats.removedCancelledInvoices}   |   Duplicates: ${prepStats.removedDuplicates}`,
    `Unique Customers: ${prepStats.uniqueCustomers.toLocaleString()}   |   Unique Invoices: ${prepStats.uniqueInvoices.toLocaleString()}   |   Total Revenue: $${prepStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  ];
  for (const line of s1) {
    doc.text(line, margin, y);
    y += 5.5;
  }
  y += 5;

  // Section 2
  checkPageBreak(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("2. RFM & K-Means Evaluation", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const silText =
    clusteringMetrics.silhouetteScore !== null
      ? clusteringMetrics.silhouetteScore.toFixed(4)
      : "N/A";
  const s2 = [
    `Reference Date: ${rfmSummary.referenceDate}`,
    `Mean Recency: ${rfmSummary.avgRecency} days   |   Mean Frequency: ${rfmSummary.avgFrequency} orders   |   Mean Monetary: $${rfmSummary.avgMonetary.toLocaleString()}`,
    `Selected Clusters (k): ${clusteringMetrics.nClusters}   |   Inertia (WCSS): ${clusteringMetrics.inertia.toLocaleString()}   |   Silhouette Score: ${silText}`,
    `Top-Spend Segment: ${kpis.highestValueSegment} (Avg Spend: $${kpis.highestValueAvgSpend.toLocaleString()})`,
  ];
  for (const line of s2) {
    doc.text(line, margin, y);
    y += 5.5;
  }
  y += 6;

  // Section 3
  checkPageBreak(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("3. Customer Segment Profiles & Business Recommendations", margin, y);
  y += 7;

  for (const profile of clusterProfiles) {
    checkPageBreak(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${profile.segmentName} (Cluster ${profile.cluster}) — ${profile.customerCount} customers (${profile.customerSharePct}%)`,
      margin,
      y
    );
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Avg Recency: ${profile.avgRecency} days  |  Avg Frequency: ${profile.avgFrequency} orders  |  Avg Monetary: $${profile.avgMonetary.toLocaleString()}`,
      margin,
      y
    );
    y += 5;

    doc.setTextColor(30, 41, 59);
    const wrapped = doc.splitTextToSize(
      `Recommendation: ${profile.recommendedAction}`,
      usableWidth
    );
    doc.text(wrapped, margin, y);
    y += wrapped.length * 4.8 + 4;
  }

  doc.save("customer_segmentation_report.pdf");
}

export async function downloadPythonProjectZip() {
  const zip = new JSZip();
  const root = zip.folder("ecommerce-customer-segmentation");
  if (!root) return;

  root.file("app.py", pyApp);
  root.file("requirements.txt", pyRequirements);
  root.file("README.md", pyReadme);
  root.file("data/sample_online_retail.csv", pySampleCsv);
  root.file("src/__init__.py", pyInit);
  root.file("src/data_preprocessing.py", pyPreprocessing);
  root.file("src/rfm_analysis.py", pyRfmAnalysis);
  root.file("src/rfm_scoring.py", pyRfmScoring);
  root.file("src/clustering.py", pyClustering);
  root.file("src/visualization.py", pyVisualization);
  root.file("src/business_insights.py", pyBusinessInsights);
  root.file("reports/.gitkeep", "");
  root.file("assets/.gitkeep", "");

  const blob = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(blob, "ecommerce-customer-segmentation.zip");
}
