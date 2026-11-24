import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText, FolderArchive } from "lucide-react";
import {
  downloadCleanedDatasetCsv,
  downloadClusterSummaryCsv,
  downloadExecutivePdfReport,
  downloadPythonProjectZip,
  downloadRfmAnalysisCsv,
  downloadSegmentationCsv,
} from "../ml/exporters";
import { FullPipelineResult } from "../ml/types";

export const DownloadReportsPage: React.FC<{ result: FullPipelineResult }> = ({
  result,
}) => {
  const [zipLoading, setZipLoading] = useState(false);

  const handleZipDownload = async () => {
    setZipLoading(true);
    try {
      await downloadPythonProjectZip();
    } finally {
      setZipLoading(false);
    }
  };

  const csvExports = [
    {
      title: "Cleaned Transaction Dataset",
      filename: "cleaned_transactions.csv",
      rows: `${result.cleanedRows.length.toLocaleString()} cleaned transactions with TotalPrice`,
      onClick: () => downloadCleanedDatasetCsv(result),
    },
    {
      title: "Customer RFM Analysis & Scores",
      filename: "rfm_analysis.csv",
      rows: `${result.scoredRFM.length.toLocaleString()} customers with R/F/M scores & RFM categories`,
      onClick: () => downloadRfmAnalysisCsv(result),
    },
    {
      title: "Customer Segmentation Results",
      filename: "customer_segmentation_results.csv",
      rows: `${result.clusteredCustomers.length.toLocaleString()} customers mapped to K-Means clusters & segment names`,
      onClick: () => downloadSegmentationCsv(result),
    },
    {
      title: "Cluster Summary & Recommendations",
      filename: "cluster_summary.csv",
      rows: `${result.clusterProfiles.length} cluster profiles with RFM averages & marketing actions`,
      onClick: () => downloadClusterSummaryCsv(result),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Download Reports & Python Source Package
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Export analysis datasets, a formatted PDF executive summary, or the complete
          modular Python & Streamlit project folder for VS Code execution.
        </p>
      </div>

      {/* CSV Exports */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            CSV Data Exports
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {csvExports.map((item) => (
            <div
              key={item.filename}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-mono-tabular">{item.filename}</span> · {item.rows}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={item.onClick}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* PDF Report & Python/Streamlit Project Bundle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-semibold">
                Executive Summary PDF Report
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Generates a clean, print-ready A4 PDF document containing data cleaning
              statistics, RFM averages, K-Means Elbow & Silhouette evaluation, cluster
              profiles, and business recommendations for every segment.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => downloadExecutivePdfReport(result)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate & Download PDF Report</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900">
              <FolderArchive className="w-4 h-4 text-teal-600" />
              <h2 className="text-base font-semibold">
                Complete Python & Streamlit Project (.zip)
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Downloads the full <code className="font-mono-tabular bg-slate-100 px-1 rounded">ecommerce-customer-segmentation/</code> folder
              with <code className="font-mono-tabular bg-slate-100 px-1 rounded">app.py</code>, all 6 modular <code className="font-mono-tabular bg-slate-100 px-1 rounded">src/*.py</code> scripts,{" "}
              <code className="font-mono-tabular bg-slate-100 px-1 rounded">requirements.txt</code>, <code className="font-mono-tabular bg-slate-100 px-1 rounded">README.md</code>, and{" "}
              <code className="font-mono-tabular bg-slate-100 px-1 rounded">data/sample_online_retail.csv</code>.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={handleZipDownload}
              disabled={zipLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{zipLoading ? "Packaging ZIP..." : "Download Python Project (.zip)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* VS Code & GitHub Execution Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Local Windows (VS Code) Execution & GitHub Steps
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-slate-600">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900">
              1. Run Streamlit Locally in VS Code
            </h3>
            <pre className="bg-slate-950 text-slate-100 p-3.5 rounded-lg overflow-x-auto font-mono-tabular leading-relaxed">
{`cd ecommerce-customer-segmentation
python -m venv venv
.\\venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
streamlit run app.py`}
            </pre>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900">
              2. Push Project to GitHub
            </h3>
            <pre className="bg-slate-950 text-slate-100 p-3.5 rounded-lg overflow-x-auto font-mono-tabular leading-relaxed">
{`git init
git add .
git commit -m "Add RFM & K-Means Customer Segmentation"
git branch -M main
git remote add origin https://github.com/<user>/ecommerce-customer-segmentation.git
git push -u origin main`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
