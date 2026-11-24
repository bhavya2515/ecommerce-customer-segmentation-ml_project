export interface RawTransactionRow {
  [key: string]: string;
}

export interface CleanedTransaction {
  InvoiceNo: string;
  StockCode: string;
  Description: string;
  Quantity: number;
  InvoiceDate: Date;
  InvoiceDateStr: string;
  UnitPrice: number;
  CustomerID: string;
  Country: string;
  TotalPrice: number;
}

export interface MissingValueSummary {
  column: string;
  dataType: string;
  missingCount: number;
  missingPct: number;
}

export interface PreprocessingStats {
  initialRows: number;
  initialCols: number;
  finalRows: number;
  finalCols: number;
  rowsRemoved: number;
  retentionPct: number;
  removedMissingCustomerId: number;
  removedCancelledInvoices: number;
  removedNonPositiveQuantity: number;
  removedNonPositivePrice: number;
  removedInvalidDates: number;
  removedDuplicates: number;
  uniqueCustomers: number;
  uniqueInvoices: number;
  totalRevenue: number;
  dateMin: string;
  dateMax: string;
}

export interface RFMRecord {
  CustomerID: string;
  Recency: number;
  Frequency: number;
  Monetary: number;
}

export interface ScoredRFMRecord extends RFMRecord {
  R_Score: number;
  F_Score: number;
  M_Score: number;
  RFM_Score: string;
  RFM_Total: number;
  RFM_Category: string;
}

export interface RFMSummary {
  referenceDate: string;
  totalCustomers: number;
  avgRecency: number;
  medianRecency: number;
  avgFrequency: number;
  medianFrequency: number;
  avgMonetary: number;
  medianMonetary: number;
}

export interface KMeansEvalPoint {
  k: number;
  inertia: number;
  silhouetteScore: number | null;
}

export interface ClusteredCustomer extends ScoredRFMRecord {
  Cluster: number;
  Recency_Scaled: number;
  Frequency_Scaled: number;
  Monetary_Scaled: number;
  Segment_Name: string;
}

export interface ClusterProfile {
  cluster: number;
  segmentName: string;
  customerCount: number;
  customerSharePct: number;
  avgRecency: number;
  avgFrequency: number;
  avgMonetary: number;
  totalMonetary: number;
  characteristics: string;
  recommendedAction: string;
}

export interface ClusteringMetrics {
  nClusters: number;
  inertia: number;
  silhouetteScore: number | null;
  iterations: number;
}

export interface BusinessKPIs {
  totalCustomers: number;
  numSegments: number;
  highestValueSegment: string;
  highestValueAvgSpend: number;
  avgCustomerMonetary: number;
  totalRevenue: number;
}

export interface FullPipelineResult {
  rawHeaders: string[];
  rawRows: RawTransactionRow[];
  missingSummary: MissingValueSummary[];
  cleanedRows: CleanedTransaction[];
  prepStats: PreprocessingStats;
  rfmSummary: RFMSummary;
  scoredRFM: ScoredRFMRecord[];
  evalPoints: KMeansEvalPoint[];
  clusteredCustomers: ClusteredCustomer[];
  clusterProfiles: ClusterProfile[];
  clusteringMetrics: ClusteringMetrics;
  kpis: BusinessKPIs;
}
