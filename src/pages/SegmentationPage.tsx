import React from "react";
import {
  ElbowChart,
  HorizontalBarChart,
  RfmProfileHeatmap,
  Scatter2DChart,
  Scatter3DCanvas,
  SEGMENT_COLORS,
  SilhouetteChart,
} from "../components/Charts";
import { FullPipelineResult } from "../ml/types";

interface SegmentationPageProps {
  result: FullPipelineResult;
  selectedK: number;
  onSelectK: (k: number) => void;
}

export const SegmentationPage: React.FC<SegmentationPageProps> = ({
  result,
  selectedK,
  onSelectK,
}) => {
  const { evalPoints, clusterProfiles, clusteredCustomers, clusteringMetrics } = result;
  const maxK = Math.min(8, Math.max(2, result.scoredRFM.length - 1));

  const clusterSizeItems = clusterProfiles.map((p, idx) => ({
    label: p.segmentName,
    value: p.customerCount,
    displayValue: `${p.customerCount} (${p.customerSharePct}%)`,
    color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            K-Means Customer Segmentation & Evaluation
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Skewed RFM metrics are transformed with <code className="font-mono-tabular text-xs bg-slate-100 px-1.5 py-0.5 rounded">log1p</code> and
            standardized via <code className="font-mono-tabular text-xs bg-slate-100 px-1.5 py-0.5 rounded">StandardScaler</code> before K-Means++ fitting.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3.5 py-2">
          <label htmlFor="k-inline-select" className="text-xs font-medium text-slate-700 whitespace-nowrap">
            Clusters (k):
          </label>
          <input
            id="k-inline-select"
            type="range"
            min={2}
            max={maxK}
            value={selectedK}
            onChange={(e) => onSelectK(Number(e.target.value))}
            className="w-28 accent-blue-600 cursor-pointer"
          />
          <span className="font-mono-tabular text-xs font-semibold text-slate-900 w-4 text-right">
            {selectedK}
          </span>
        </div>
      </div>

      {/* Model Evaluation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Selected Clusters (k)</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {clusteringMetrics.nClusters}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Within-Cluster Inertia (WCSS)</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {clusteringMetrics.inertia.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Silhouette Score</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {clusteringMetrics.silhouetteScore !== null
              ? clusteringMetrics.silhouetteScore.toFixed(4)
              : "N/A"}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">K-Means++ Iterations</p>
          <p className="text-xl font-semibold text-slate-900 font-mono-tabular mt-1">
            {clusteringMetrics.iterations}
          </p>
        </div>
      </div>

      {/* Elbow + Silhouette */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ElbowChart
          evalPoints={evalPoints}
          selectedK={selectedK}
          onSelectK={onSelectK}
        />
        <SilhouetteChart
          evalPoints={evalPoints}
          selectedK={selectedK}
          onSelectK={onSelectK}
        />
      </div>

      {/* Cluster Profiles Table & Size Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Cluster Profiles (Real RFM Centroid Averages)
            </h3>
            <span className="text-xs text-slate-500">
              Named automatically from behavioral metrics
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-left">
                  <th className="px-4 py-2.5 font-medium">Cluster</th>
                  <th className="px-4 py-2.5 font-medium">Segment Name</th>
                  <th className="px-4 py-2.5 font-medium text-right">Customers</th>
                  <th className="px-4 py-2.5 font-medium text-right">Avg Recency</th>
                  <th className="px-4 py-2.5 font-medium text-right">Avg Freq</th>
                  <th className="px-4 py-2.5 font-medium text-right">Avg Monetary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clusterProfiles.map((p) => (
                  <tr key={p.cluster} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono-tabular text-slate-600">
                      C{p.cluster}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {p.segmentName}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-slate-700">
                      {p.customerCount} ({p.customerSharePct}%)
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-slate-700">
                      {p.avgRecency.toFixed(1)}d
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular text-slate-700">
                      {p.avgFrequency.toFixed(1)}x
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tabular font-medium text-slate-900">
                      ${p.avgMonetary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <HorizontalBarChart
          title="Cluster Size Distribution"
          subtitle="Share of customers"
          items={clusterSizeItems}
        />
      </div>

      {/* 2D Scatter Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Scatter2DChart
          customers={clusteredCustomers}
          profiles={clusterProfiles}
          xField="Recency"
          yField="Monetary"
        />
        <Scatter2DChart
          customers={clusteredCustomers}
          profiles={clusterProfiles}
          xField="Frequency"
          yField="Monetary"
        />
      </div>

      {/* Interactive 3D Scatter Plot */}
      <Scatter3DCanvas
        customers={clusteredCustomers}
        profiles={clusterProfiles}
      />

      {/* RFM Heatmap + ML Interpretation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RfmProfileHeatmap profiles={clusterProfiles} />

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h4 className="text-sm font-semibold text-slate-900">
            Why K-Means & Key Model Limitations
          </h4>
          <p className="text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-900">Suitability:</span> RFM features
            form a compact 3-dimensional continuous numeric space where Euclidean distance
            after <code className="font-mono-tabular bg-slate-100 px-1 rounded">log1p</code> +{" "}
            <code className="font-mono-tabular bg-slate-100 px-1 rounded">StandardScaler</code>{" "}
            cleanly separates high-frequency big spenders from dormant low-spend shoppers.
          </p>
          <p className="text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-900">Limitations:</span> K-Means assumes
            roughly spherical clusters of comparable density, is sensitive to extreme wholesale
            outliers (mitigated here by log-scaling), and requires specifying{" "}
            <code className="font-mono-tabular bg-slate-100 px-1 rounded">k</code> upfront—which
            is why pairing the Elbow curve with Silhouette Scores is essential.
          </p>
        </div>
      </div>
    </div>
  );
};
