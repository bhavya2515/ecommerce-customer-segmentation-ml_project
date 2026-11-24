import React, { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import {
  HistogramChart,
  HorizontalBarChart,
  SEGMENT_COLORS,
} from "../components/Charts";
import { downloadRfmAnalysisCsv } from "../ml/exporters";
import { FullPipelineResult } from "../ml/types";

export const RfmAnalysisPage: React.FC<{ result: FullPipelineResult }> = ({
  result,
}) => {
  const { scoredRFM, rfmSummary } = result;
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"Monetary" | "Recency" | "Frequency" | "RFM_Total">(
    "Monetary"
  );

  const categoryItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of scoredRFM) {
      counts.set(r.RFM_Category, (counts.get(r.RFM_Category) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count], idx) => ({
        label: cat,
        value: count,
        color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
      }));
  }, [scoredRFM]);

  const categories = useMemo(
    () => ["All", ...categoryItems.map((c) => c.label)],
    [categoryItems]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = scoredRFM.filter((r) => {
      const matchesCat = categoryFilter === "All" || r.RFM_Category === categoryFilter;
      const matchesSearch =
        !q ||
        r.CustomerID.toLowerCase().includes(q) ||
        r.RFM_Category.toLowerCase().includes(q) ||
        r.RFM_Score.includes(q);
      return matchesCat && matchesSearch;
    });
    return [...list].sort((a, b) => {
      if (sortBy === "Recency") return a.Recency - b.Recency;
      return b[sortBy] - a[sortBy];
    });
  }, [scoredRFM, searchQuery, categoryFilter, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            RFM Analysis & Quantile Scoring
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Reference Date:{" "}
            <span className="font-mono-tabular font-medium text-slate-900">
              {rfmSummary.referenceDate}
            </span>{" "}
            (max InvoiceDate + 1 day)
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadRfmAnalysisCsv(result)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download RFM CSV</span>
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Customers Scored</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {rfmSummary.totalCustomers.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Mean / Median Recency</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {rfmSummary.avgRecency}d / {rfmSummary.medianRecency}d
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Mean / Median Frequency</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {rfmSummary.avgFrequency} / {rfmSummary.medianFrequency}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Mean / Median Monetary</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            ${rfmSummary.avgMonetary.toLocaleString()} / $
            {rfmSummary.medianMonetary.toLocaleString()}
          </p>
        </div>
      </div>

      {/* RFM Histograms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HistogramChart
          title="Recency Distribution"
          unit="Days since last order"
          values={scoredRFM.map((r) => r.Recency)}
          color="#2563EB"
        />
        <HistogramChart
          title="Frequency Distribution"
          unit="Unique invoices"
          values={scoredRFM.map((r) => r.Frequency)}
          color="#0D9488"
        />
        <HistogramChart
          title="Monetary Distribution"
          unit="Total spend ($)"
          values={scoredRFM.map((r) => r.Monetary)}
          color="#D97706"
        />
      </div>

      {/* Category Distribution + Scoring Logic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HorizontalBarChart
          title="RFM Score Category Distribution"
          subtitle="Customers per tier"
          items={categoryItems}
        />

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h4 className="text-sm font-semibold text-slate-900">
            Quantile Scoring & Category Logic
          </h4>
          <p className="text-xs leading-relaxed text-slate-600">
            Each metric is divided into 5 equal-sized groups using tie-safe rank quintiles
            so duplicate values or small datasets never raise bin-edge errors:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-600">
            <li>
              <span className="font-semibold text-slate-900">R_Score (1–5):</span> Lower
              Recency (more recent purchase) receives a higher score (5 = best).
            </li>
            <li>
              <span className="font-semibold text-slate-900">F_Score (1–5):</span> Higher
              unique invoice count receives a higher score (5 = most frequent).
            </li>
            <li>
              <span className="font-semibold text-slate-900">M_Score (1–5):</span> Higher
              total spend receives a higher score (5 = highest spender).
            </li>
          </ul>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-900">Category Assignment:</span>{" "}
            Customers are mapped via R and average (F+M)/2 into Champions, Loyal
            Customers, Potential Loyalists, Recent Customers, At Risk Customers,
            Hibernating Customers, and Lost Customers.
          </div>
        </div>
      </div>

      {/* Interactive RFM Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search CustomerID, score, category..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All RFM Categories" : cat}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "Monetary" | "Recency" | "Frequency" | "RFM_Total"
                )
              }
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="Monetary">Sort: Highest Monetary</option>
              <option value="Frequency">Sort: Highest Frequency</option>
              <option value="Recency">Sort: Most Recent</option>
              <option value="RFM_Total">Sort: Highest RFM Total</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-2.5 font-medium">CustomerID</th>
                <th className="px-4 py-2.5 font-medium text-right">Recency (d)</th>
                <th className="px-4 py-2.5 font-medium text-right">Frequency</th>
                <th className="px-4 py-2.5 font-medium text-right">Monetary ($)</th>
                <th className="px-4 py-2.5 font-medium text-center">R · F · M</th>
                <th className="px-4 py-2.5 font-medium text-right">Total</th>
                <th className="px-4 py-2.5 font-medium">RFM Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((r) => (
                <tr key={r.CustomerID} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono-tabular font-medium text-slate-900">
                    {r.CustomerID}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono-tabular text-slate-700">
                    {r.Recency}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono-tabular text-slate-700">
                    {r.Frequency}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono-tabular font-medium text-slate-900">
                    ${r.Monetary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono-tabular text-slate-700">
                    {r.R_Score} · {r.F_Score} · {r.M_Score}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono-tabular text-slate-700">
                    {r.RFM_Total}
                  </td>
                  <td className="px-4 py-2.5 text-slate-800">{r.RFM_Category}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No customers match your current search or category filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
