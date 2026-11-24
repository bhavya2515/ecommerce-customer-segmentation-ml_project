import React from "react";
import { ArrowRight } from "lucide-react";
import { FullPipelineResult } from "../ml/types";

interface OverviewPageProps {
  result: FullPipelineResult;
  datasetName: string;
  onNavigate: (pageId: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  result,
  datasetName,
  onNavigate,
}) => {
  const { prepStats, clusteringMetrics, kpis } = result;

  const objectives = [
    "Analyze raw e-commerce transaction logs and audit data quality issues automatically.",
    "Calculate Recency (days since last purchase), Frequency (unique invoices), and Monetary (total spend) per customer.",
    "Score customers on a 1–5 rank-based quintile scale and map them into clear RFM tiers.",
    "Apply log1p skewness correction, StandardScaler normalization, and K-Means clustering.",
    "Evaluate cluster cohesion with the Elbow Method (WCSS) and Silhouette Score.",
    "Interpret actual cluster RFM averages into meaningful segments and actionable retention playbooks.",
  ];

  const workflowSteps = [
    {
      step: "01. Data Preprocessing",
      detail:
        "Removes missing CustomerIDs, 'C'-prefixed cancellations, non-positive quantities/prices, and duplicate rows; computes TotalPrice = Quantity × UnitPrice.",
    },
    {
      step: "02. RFM Feature Engineering",
      detail:
        "Sets reference date to max(InvoiceDate) + 1 day and aggregates customer Recency, Frequency, and Monetary metrics.",
    },
    {
      step: "03. RFM Quantile Scoring",
      detail:
        "Assigns 1–5 quintile scores (reversed for Recency) using tie-safe ranking and categorizes customers from Champions to Lost.",
    },
    {
      step: "04. Scaling & K-Means Modeling",
      detail:
        "Transforms skewed RFM distributions with log1p, standardizes to zero mean and unit variance, and fits K-Means++ across k = 2..10.",
    },
    {
      step: "05. Segment Profiling & Export",
      detail:
        "Labels clusters by comparing centroid averages against overall benchmarks and generates CSV and PDF executive reports.",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Summary */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-medium text-slate-500">
              Active Dataset: {datasetName} · Date Range {prepStats.dateMin} to{" "}
              {prepStats.dateMax}
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              E-commerce Customer Segmentation: An RFM and K-Means Clustering Approach
            </h1>
            <p className="text-sm lg:text-[15px] leading-relaxed text-slate-600">
              An end-to-end machine learning analytics workspace that transforms raw retail
              transaction histories into customer-level RFM behavioral scores, discovers
              natural buyer segments with K-Means clustering, and pairs each cohort with
              concrete retention strategies.
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onNavigate("segmentation")}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Inspect Customer Clusters</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Executive KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Cleaned Transactions</p>
          <p className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {prepStats.finalRows.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {prepStats.retentionPct}% retained from {prepStats.initialRows.toLocaleString()} raw rows
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Unique Customers</p>
          <p className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {kpis.totalCustomers.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Across {prepStats.uniqueInvoices.toLocaleString()} unique invoices
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Net Revenue</p>
          <p className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-1">
            ${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Avg ${kpis.avgCustomerMonetary.toLocaleString(undefined, { minimumFractionDigits: 2 })} per customer
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Active K-Means Clusters</p>
          <p className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-1">
            k = {clusteringMetrics.nClusters}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono-tabular">
            Silhouette:{" "}
            {clusteringMetrics.silhouetteScore !== null
              ? clusteringMetrics.silhouetteScore.toFixed(4)
              : "N/A"}
          </p>
        </div>
      </section>

      {/* Two-Column Details: Objectives + Stack vs. ML Workflow */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              Project Objectives
            </h2>
            <ul className="space-y-2.5 text-sm text-slate-600">
              {objectives.map((obj, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="font-mono-tabular text-xs font-semibold text-blue-600 mt-0.5">
                    0{idx + 1}.
                  </span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-5 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Technology Stack & Dataset Compatibility
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-600">
              <div>
                <dt className="font-medium text-slate-900">Python & ML Core</dt>
                <dd>Python 3, Pandas, NumPy, Scikit-learn</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-900">Algorithms</dt>
                <dd>RFM Quantiles, StandardScaler, K-Means++</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-900">Visualization & App</dt>
                <dd>Plotly, Seaborn, Matplotlib, Streamlit</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-900">Recommended Dataset</dt>
                <dd>UCI Online Retail / Online Retail II CSV</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            End-to-End Machine Learning Workflow
          </h2>
          <div className="divide-y divide-slate-100">
            {workflowSteps.map((item) => (
              <div key={item.step} className="py-3 first:pt-0 last:pb-0">
                <h3 className="text-sm font-semibold text-slate-900">{item.step}</h3>
                <p className="text-xs leading-relaxed text-slate-600 mt-1">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
