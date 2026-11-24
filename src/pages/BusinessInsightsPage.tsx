import React from "react";
import { HorizontalBarChart, SEGMENT_COLORS } from "../components/Charts";
import { FullPipelineResult } from "../ml/types";

export const BusinessInsightsPage: React.FC<{ result: FullPipelineResult }> = ({
  result,
}) => {
  const { kpis, clusterProfiles } = result;

  const revenueShareItems = clusterProfiles.map((p, idx) => ({
    label: p.segmentName,
    value: p.totalMonetary,
    displayValue: `$${p.totalMonetary.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
  }));

  const customerShareItems = clusterProfiles.map((p, idx) => ({
    label: p.segmentName,
    value: p.customerSharePct,
    displayValue: `${p.customerSharePct}%`,
    color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Executive Business Insights & Playbooks
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Customer segment economics, revenue concentration, and targeted retention
          strategies derived from K-Means cluster averages.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Total Customers</p>
          <p className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {kpis.totalCustomers.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Identified Segments</p>
          <p className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {kpis.numSegments}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Highest-Value Segment</p>
          <p className="text-lg font-semibold text-slate-900 mt-1 truncate" title={kpis.highestValueSegment}>
            {kpis.highestValueSegment}
          </p>
          <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
            Avg Spend ${kpis.highestValueAvgSpend.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Avg Customer Monetary Value</p>
          <p className="text-2xl font-semibold text-slate-900 font-mono-tabular mt-1">
            ${kpis.avgCustomerMonetary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Share Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HorizontalBarChart
          title="Customer Percentage by Segment"
          subtitle="Share of customer base"
          items={customerShareItems}
        />
        <HorizontalBarChart
          title="Revenue Contribution by Segment"
          subtitle="Total Monetary ($)"
          items={revenueShareItems}
        />
      </div>

      {/* Action Playbooks */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Segment Characteristics & Recommended Business Actions
          </h2>
        </div>
        <div className="divide-y divide-slate-200">
          {clusterProfiles.map((p, idx) => (
            <div key={p.cluster} className="p-6 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1.6fr] gap-5 items-start">
              <div>
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{
                      backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
                    }}
                  />
                  <h3 className="text-base font-semibold text-slate-900">
                    {p.segmentName}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Cluster {p.cluster} · {p.customerCount} customers ({p.customerSharePct}% of base)
                </p>
                <p className="text-xs leading-relaxed text-slate-600 mt-2">
                  {p.characteristics}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div>
                  <p className="text-slate-500">Avg Recency</p>
                  <p className="font-mono-tabular font-semibold text-slate-900 mt-0.5">
                    {p.avgRecency.toFixed(1)}d
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Avg Freq</p>
                  <p className="font-mono-tabular font-semibold text-slate-900 mt-0.5">
                    {p.avgFrequency.toFixed(1)}x
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Avg Spend</p>
                  <p className="font-mono-tabular font-semibold text-slate-900 mt-0.5">
                    ${p.avgMonetary.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Recommended Strategy
                </p>
                <p className="text-sm leading-relaxed text-slate-700 mt-1">
                  {p.recommendedAction}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
