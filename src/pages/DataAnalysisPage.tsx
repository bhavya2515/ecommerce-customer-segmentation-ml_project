import React, { useMemo, useState } from "react";
import { HorizontalBarChart } from "../components/Charts";
import { FullPipelineResult } from "../ml/types";

export const DataAnalysisPage: React.FC<{ result: FullPipelineResult }> = ({
  result,
}) => {
  const [activeTab, setActiveTab] = useState<"preview" | "cleaning" | "missing">(
    "preview"
  );
  const { rawHeaders, rawRows, cleanedRows, missingSummary, prepStats } = result;

  const countryItems = useMemo(() => {
    const revMap = new Map<string, number>();
    for (const r of cleanedRows) {
      revMap.set(r.Country, (revMap.get(r.Country) || 0) + r.TotalPrice);
    }
    return Array.from(revMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country, rev]) => ({
        label: country,
        value: rev,
        displayValue: `$${rev.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      }));
  }, [cleanedRows]);

  const cleaningSteps = [
    {
      step: "1. Missing CustomerID removed",
      removed: prepStats.removedMissingCustomerId,
      rationale: "Customer-level RFM metrics require a valid CustomerID.",
    },
    {
      step: "2. Cancelled invoices ('C' prefix) removed",
      removed: prepStats.removedCancelledInvoices,
      rationale: "Credit/cancellation invoices distort net purchase behavior.",
    },
    {
      step: "3. Non-positive Quantity (<= 0) removed",
      removed: prepStats.removedNonPositiveQuantity,
      rationale: "Returns and damaged stock adjustments are excluded.",
    },
    {
      step: "4. Non-positive UnitPrice (<= 0) removed",
      removed: prepStats.removedNonPositivePrice,
      rationale: "Zero-price adjustments add noise to Monetary spend.",
    },
    {
      step: "5. Invalid InvoiceDate rows removed",
      removed: prepStats.removedInvalidDates,
      rationale: "Valid timestamps are essential to compute Recency.",
    },
    {
      step: "6. Exact duplicate records removed",
      removed: prepStats.removedDuplicates,
      rationale: "Prevents double-counting identical line items in revenue.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Data Analysis & Preprocessing Pipeline
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Audit raw dataset dimensions, missing values, and the 11-step cleaning transformations
          applied prior to RFM modeling.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Raw Dimensions</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {prepStats.initialRows.toLocaleString()} × {prepStats.initialCols}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Cleaned Dimensions</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {prepStats.finalRows.toLocaleString()} × {prepStats.finalCols}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Records Removed</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {prepStats.rowsRemoved.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Retention Rate</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {prepStats.retentionPct}%
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === "preview"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Before vs. After Preview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cleaning")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === "cleaning"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Data Cleaning Summary
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("missing")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === "missing"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Missing Values Analysis
        </button>
      </div>

      {activeTab === "preview" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Before Preprocessing (First 12 Rows)
              </h3>
              <span className="text-xs font-mono-tabular text-slate-500">
                {prepStats.initialRows} rows
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
                    {rawHeaders.slice(0, 8).map((h) => (
                      <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawRows.slice(0, 12).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {rawHeaders.slice(0, 8).map((h) => (
                        <td
                          key={h}
                          className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[160px] truncate font-mono-tabular"
                        >
                          {row[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                After Preprocessing (With TotalPrice)
              </h3>
              <span className="text-xs font-mono-tabular text-slate-500">
                {prepStats.finalRows} rows
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
                    <th className="px-3 py-2 font-medium whitespace-nowrap">InvoiceNo</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Description</th>
                    <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Qty</th>
                    <th className="px-3 py-2 font-medium text-right whitespace-nowrap">UnitPrice</th>
                    <th className="px-3 py-2 font-medium text-right whitespace-nowrap">TotalPrice</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">CustomerID</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">InvoiceDate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cleanedRows.slice(0, 12).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono-tabular text-slate-700 whitespace-nowrap">
                        {row.InvoiceNo}
                      </td>
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[160px] truncate">
                        {row.Description}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-tabular text-slate-700">
                        {row.Quantity}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-tabular text-slate-700">
                        ${row.UnitPrice.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono-tabular font-medium text-slate-900">
                        ${row.TotalPrice.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-700">
                        {row.CustomerID}
                      </td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-500 whitespace-nowrap">
                        {row.InvoiceDateStr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "cleaning" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Step-by-Step Cleaning Audit
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
                  <th className="px-5 py-2.5 font-medium">Preprocessing Rule</th>
                  <th className="px-5 py-2.5 font-medium text-right">Records Removed</th>
                  <th className="px-5 py-2.5 font-medium">Engineering Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cleaningSteps.map((s) => (
                  <tr key={s.step} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{s.step}</td>
                    <td className="px-5 py-3 text-right font-mono-tabular text-slate-900">
                      {s.removed.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{s.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "missing" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Raw Column Schema & Missing Value Report
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
                  <th className="px-5 py-2.5 font-medium">Column</th>
                  <th className="px-5 py-2.5 font-medium">Detected Type</th>
                  <th className="px-5 py-2.5 font-medium text-right">Missing Count</th>
                  <th className="px-5 py-2.5 font-medium text-right">Missing (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {missingSummary.map((m) => (
                  <tr key={m.column} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono-tabular font-medium text-slate-900">
                      {m.column}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{m.dataType}</td>
                    <td className="px-5 py-3 text-right font-mono-tabular text-slate-900">
                      {m.missingCount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-mono-tabular text-slate-700">
                      {m.missingPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Revenue Analysis */}
      <HorizontalBarChart
        title="Transaction Revenue by Country (Cleaned Dataset)"
        subtitle="Top markets by TotalPrice ($)"
        items={countryItems}
        defaultColor="#2563EB"
      />
    </div>
  );
};
