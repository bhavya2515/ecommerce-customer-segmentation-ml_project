import React, { useEffect, useMemo, useRef, useState } from "react";
import { ClusteredCustomer, ClusterProfile, KMeansEvalPoint } from "../ml/types";

export const SEGMENT_COLORS = [
  "#2563EB",
  "#0D9488",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#0284C7",
  "#059669",
  "#B45309",
];

export function getSegmentColorMap(profiles: ClusterProfile[]): Map<string, string> {
  const map = new Map<string, string>();
  profiles.forEach((p, idx) => {
    map.set(p.segmentName, SEGMENT_COLORS[idx % SEGMENT_COLORS.length]);
  });
  return map;
}

interface HistogramProps {
  title: string;
  unit: string;
  values: number[];
  color: string;
  bins?: number;
}

export const HistogramChart: React.FC<HistogramProps> = ({
  title,
  unit,
  values,
  color,
  bins = 12,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const histogram = useMemo(() => {
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const step = span / bins;

    const counts = new Array(bins).fill(0);
    for (const v of values) {
      const idx = Math.min(bins - 1, Math.floor((v - min) / step));
      counts[idx]++;
    }
    return counts.map((count, i) => ({
      start: min + i * step,
      end: min + (i + 1) * step,
      count,
    }));
  }, [values, bins]);

  const maxCount = Math.max(...histogram.map((b) => b.count), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      <div className="relative h-40 flex items-end gap-1 pt-5">
        {histogram.map((bin, idx) => {
          const pct = (bin.count / maxCount) * 100;
          const isHovered = hoverIdx === idx;
          return (
            <div
              key={idx}
              className="flex-1 h-full flex flex-col justify-end group relative cursor-crosshair"
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <div
                className="w-full rounded-t transition-opacity duration-150"
                style={{
                  height: `${Math.max(pct, bin.count > 0 ? 4 : 0)}%`,
                  backgroundColor: color,
                  opacity: hoverIdx === null || isHovered ? 0.9 : 0.45,
                }}
              />
              {isHovered && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white text-[11px] font-mono-tabular px-2 py-1 rounded shadow-sm whitespace-nowrap pointer-events-none">
                  {bin.start.toFixed(0)}–{bin.end.toFixed(0)}: {bin.count}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] font-mono-tabular text-slate-500 mt-2 border-t border-slate-100 pt-1.5">
        <span>{values.length ? Math.min(...values).toFixed(0) : 0}</span>
        <span>{values.length ? Math.max(...values).toFixed(0) : 0}</span>
      </div>
    </div>
  );
};

interface BarItem {
  label: string;
  value: number;
  displayValue?: string;
  color?: string;
}

export const HorizontalBarChart: React.FC<{
  title: string;
  subtitle?: string;
  items: BarItem[];
  defaultColor?: string;
}> = ({ title, subtitle, items, defaultColor = "#2563EB" }) => {
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </div>
      <div className="space-y-2.5">
        {items.map((item) => {
          const pct = (item.value / maxVal) * 100;
          return (
            <div key={item.label} className="grid grid-cols-[140px_1fr_76px] items-center gap-3 text-xs">
              <span className="text-slate-700 font-medium truncate" title={item.label}>
                {item.label}
              </span>
              <div className="h-2.5 bg-slate-100 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-200"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: item.color || defaultColor,
                  }}
                />
              </div>
              <span className="text-right font-mono-tabular text-slate-700">
                {item.displayValue ?? item.value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ElbowChart: React.FC<{
  evalPoints: KMeansEvalPoint[];
  selectedK: number;
  onSelectK?: (k: number) => void;
}> = ({ evalPoints, selectedK, onSelectK }) => {
  const [hovered, setHovered] = useState<KMeansEvalPoint | null>(null);
  const w = 460;
  const h = 240;
  const pad = { top: 20, right: 20, bottom: 36, left: 54 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const minK = evalPoints[0]?.k ?? 2;
  const maxK = evalPoints[evalPoints.length - 1]?.k ?? 10;
  const minI = Math.min(...evalPoints.map((p) => p.inertia));
  const maxI = Math.max(...evalPoints.map((p) => p.inertia));
  const spanI = maxI - minI || 1;

  const getX = (k: number) =>
    pad.left + ((k - minK) / Math.max(maxK - minK, 1)) * plotW;
  const getY = (inertia: number) =>
    pad.top + plotH - ((inertia - minI) / spanI) * plotH;

  const pathD = evalPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.k)} ${getY(p.inertia)}`)
    .join(" ");

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-900">
          Elbow Method (Inertia vs. k)
        </h4>
        <span className="text-xs text-slate-500 font-mono-tabular">
          {hovered ? `k=${hovered.k} · Inertia=${hovered.inertia}` : `Selected k=${selectedK}`}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56 overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yVal = pad.top + plotH * (1 - t);
          const label = (minI + spanI * t).toFixed(0);
          return (
            <g key={t}>
              <line
                x1={pad.left}
                y1={yVal}
                x2={w - pad.right}
                y2={yVal}
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={yVal + 3}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono-tabular"
              >
                {label}
              </text>
            </g>
          );
        })}

        <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2.2" />

        {evalPoints.map((p) => {
          const cx = getX(p.k);
          const cy = getY(p.inertia);
          const isSelected = p.k === selectedK;
          return (
            <g
              key={p.k}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectK?.(p.k)}
            >
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 6.5 : 4}
                fill={isSelected ? "#DC2626" : "#2563EB"}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
              <text
                x={cx}
                y={h - 12}
                textAnchor="middle"
                className={`text-[10px] font-mono-tabular ${
                  isSelected ? "fill-slate-900 font-semibold" : "fill-slate-500"
                }`}
              >
                {p.k}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const SilhouetteChart: React.FC<{
  evalPoints: KMeansEvalPoint[];
  selectedK: number;
  onSelectK?: (k: number) => void;
}> = ({ evalPoints, selectedK, onSelectK }) => {
  const valid = evalPoints.filter((p) => p.silhouetteScore !== null);
  const maxSil = Math.max(...valid.map((p) => p.silhouetteScore ?? 0), 0.1);
  const [hovered, setHovered] = useState<KMeansEvalPoint | null>(null);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-900">
          Silhouette Score by k
        </h4>
        <span className="text-xs text-slate-500 font-mono-tabular">
          {hovered
            ? `k=${hovered.k} · Score=${hovered.silhouetteScore?.toFixed(4)}`
            : "Higher indicates tighter separation"}
        </span>
      </div>
      <div className="h-56 flex items-end gap-2 pt-7 pb-2 px-2">
        {valid.map((p) => {
          const val = p.silhouetteScore ?? 0;
          const heightPct = Math.max(4, (val / maxSil) * 100);
          const isSelected = p.k === selectedK;
          return (
            <button
              type="button"
              key={p.k}
              onClick={() => onSelectK?.(p.k)}
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
              className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer focus:outline-none"
            >
              <span className="text-[10px] font-mono-tabular text-slate-600 mb-1">
                {val.toFixed(2)}
              </span>
              <div
                className="w-full max-w-[36px] rounded-t transition-opacity duration-150"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isSelected ? "#DC2626" : "#0D9488",
                }}
              />
              <span
                className={`text-[11px] font-mono-tabular mt-1.5 ${
                  isSelected ? "text-slate-900 font-semibold" : "text-slate-500"
                }`}
              >
                k={p.k}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const Scatter2DChart: React.FC<{
  customers: ClusteredCustomer[];
  profiles: ClusterProfile[];
  xField: "Recency" | "Frequency";
  yField: "Monetary" | "Frequency";
}> = ({ customers, profiles, xField, yField }) => {
  const colorMap = useMemo(() => getSegmentColorMap(profiles), [profiles]);
  const [hovered, setHovered] = useState<ClusteredCustomer | null>(null);

  const w = 460;
  const h = 280;
  const pad = { top: 18, right: 20, bottom: 38, left: 56 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const xs = customers.map((c) => c[xField]);
  const ys = customers.map((c) => c[yField]);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);

  const getX = (v: number) => pad.left + ((v - minX) / (maxX - minX || 1)) * plotW;
  const getY = (v: number) => pad.top + plotH - ((v - minY) / (maxY - minY || 1)) * plotH;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-900">
          2D Clusters: {xField} vs. {yField}
        </h4>
        <span className="text-xs text-slate-500 font-mono-tabular truncate max-w-[220px]">
          {hovered
            ? `#${hovered.CustomerID} · ${hovered.Segment_Name} ($${hovered.Monetary})`
            : `${customers.length} customers`}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-64 overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yPos = pad.top + plotH * (1 - t);
          const val = minY + (maxY - minY) * t;
          return (
            <g key={t}>
              <line x1={pad.left} y1={yPos} x2={w - pad.right} y2={yPos} stroke="#F1F5F9" />
              <text
                x={pad.left - 8}
                y={yPos + 3}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono-tabular"
              >
                {yField === "Monetary" ? `$${val.toFixed(0)}` : val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {[0, 0.5, 1].map((t) => {
          const xPos = pad.left + plotW * t;
          const val = minX + (maxX - minX) * t;
          return (
            <text
              key={t}
              x={xPos}
              y={h - 14}
              textAnchor="middle"
              className="fill-slate-400 text-[10px] font-mono-tabular"
            >
              {val.toFixed(0)}
            </text>
          );
        })}

        {customers.map((c) => (
          <circle
            key={c.CustomerID}
            cx={getX(c[xField])}
            cy={getY(c[yField])}
            r={hovered?.CustomerID === c.CustomerID ? 6 : 4}
            fill={colorMap.get(c.Segment_Name) || "#2563EB"}
            fillOpacity={0.78}
            stroke="#FFFFFF"
            strokeWidth="0.8"
            className="cursor-pointer"
            onMouseEnter={() => setHovered(c)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
    </div>
  );
};

export const Scatter3DCanvas: React.FC<{
  customers: ClusteredCustomer[];
  profiles: ClusterProfile[];
}> = ({ customers, profiles }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const colorMap = useMemo(() => getSegmentColorMap(profiles), [profiles]);
  const [angles, setAngles] = useState({ yaw: 0.65, pitch: 0.42 });
  const [zoom, setZoom] = useState(1.0);
  const [hovered, setHovered] = useState<ClusteredCustomer | null>(null);
  const draggingRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });

  const projectedPointsRef = useRef<
    Array<{ x: number; y: number; r: number; customer: ClusteredCustomer }>
  >([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    const maxR = Math.max(...customers.map((c) => c.Recency), 1);
    const maxF = Math.max(...customers.map((c) => c.Frequency), 1);
    const maxM = Math.max(...customers.map((c) => c.Monetary), 1);

    const cosY = Math.cos(angles.yaw);
    const sinY = Math.sin(angles.yaw);
    const cosP = Math.cos(angles.pitch);
    const sinP = Math.sin(angles.pitch);
    const scale = Math.min(width, height) * 0.36 * zoom;
    const cx = width / 2;
    const cy = height / 2 + 8;

    const project = (nx: number, ny: number, nz: number) => {
      // Center normalized [-1, 1] cube
      const x1 = nx * cosY - nz * sinY;
      const z1 = nx * sinY + nz * cosY;
      const y2 = ny * cosP - z1 * sinP;
      const z2 = ny * sinP + z1 * cosP;
      const persp = 3.2 / (3.2 - z2 * 0.7);
      return {
        sx: cx + x1 * scale * persp,
        sy: cy - y2 * scale * persp,
        depth: z2,
      };
    };

    // Draw subtle 3D axis lines from origin (-1, -1, -1)
    const origin = project(-1, -1, -1);
    const axes = [
      { end: project(1, -1, -1), label: "Recency (Days)" },
      { end: project(-1, 1, -1), label: "Monetary ($)" },
      { end: project(-1, -1, 1), label: "Frequency (Orders)" },
    ];
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1.2;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = "#64748B";
    for (const ax of axes) {
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(ax.end.sx, ax.end.sy);
      ctx.stroke();
      ctx.fillText(ax.label, ax.end.sx + 4, ax.end.sy + 4);
    }

    // Project and depth-sort customer points
    const pts = customers.map((c) => {
      const nx = (c.Recency / maxR) * 2 - 1;
      const ny = (c.Monetary / maxM) * 2 - 1;
      const nz = (c.Frequency / maxF) * 2 - 1;
      const p = project(nx, ny, nz);
      return {
        sx: p.sx,
        sy: p.sy,
        depth: p.depth,
        customer: c,
      };
    });

    pts.sort((a, b) => a.depth - b.depth);
    const hitList: Array<{ x: number; y: number; r: number; customer: ClusteredCustomer }> = [];

    for (const pt of pts) {
      const radius = 4.2 + (pt.depth + 1) * 1.1;
      const color = colorMap.get(pt.customer.Segment_Name) || "#2563EB";
      const isHovered = hovered?.CustomerID === pt.customer.CustomerID;

      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, isHovered ? radius + 2.5 : radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = isHovered ? 1 : 0.82;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = isHovered ? 2 : 0.8;
      ctx.strokeStyle = isHovered ? "#0F172A" : "#FFFFFF";
      ctx.stroke();

      hitList.push({ x: pt.sx, y: pt.sy, r: radius + 3, customer: pt.customer });
    }
    projectedPointsRef.current = hitList;
  }, [customers, angles, zoom, colorMap, hovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (draggingRef.current.active) {
      const dx = e.clientX - draggingRef.current.x;
      const dy = e.clientY - draggingRef.current.y;
      draggingRef.current.x = e.clientX;
      draggingRef.current.y = e.clientY;
      setAngles((prev) => ({
        yaw: prev.yaw + dx * 0.008,
        pitch: Math.max(-1.2, Math.min(1.2, prev.pitch + dy * 0.008)),
      }));
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: ClusteredCustomer | null = null;
    for (let i = projectedPointsRef.current.length - 1; i >= 0; i--) {
      const pt = projectedPointsRef.current[i];
      const dist = Math.hypot(mx - pt.x, my - pt.y);
      if (dist <= pt.r) {
        found = pt.customer;
        break;
      }
    }
    setHovered(found);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            3D Customer Segmentation (Recency, Frequency, Monetary)
          </h4>
          <p className="text-xs text-slate-500">
            Drag to rotate 3D projection · Hover points to inspect customer RFM profile
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.15).toFixed(2))))}
            className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Zoom Out
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.75, Number((z + 0.15).toFixed(2))))}
            className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Zoom In
          </button>
          <button
            type="button"
            onClick={() => {
              setAngles({ yaw: 0.65, pitch: 0.42 });
              setZoom(1.0);
            }}
            className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Reset View
          </button>
        </div>
      </div>

      <div className="relative border border-slate-100 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-80 cursor-grab active:cursor-grabbing block"
          onMouseDown={(e) => {
            draggingRef.current = { active: true, x: e.clientX, y: e.clientY };
          }}
          onMouseUp={() => {
            draggingRef.current.active = false;
          }}
          onMouseLeave={() => {
            draggingRef.current.active = false;
            setHovered(null);
          }}
          onMouseMove={handleMouseMove}
        />
        {hovered && (
          <div className="absolute top-3 left-3 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-sm pointer-events-none">
            <div className="font-semibold">
              Customer #{hovered.CustomerID} · {hovered.Segment_Name}
            </div>
            <div className="font-mono-tabular text-slate-200 mt-0.5">
              R: {hovered.Recency}d · F: {hovered.Frequency}x · M: ${hovered.Monetary.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
        {profiles.map((p) => (
          <div key={p.cluster} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
              style={{ backgroundColor: colorMap.get(p.segmentName) || "#2563EB" }}
            />
            <span>
              {p.segmentName} ({p.customerCount})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RfmProfileHeatmap: React.FC<{ profiles: ClusterProfile[] }> = ({
  profiles,
}) => {
  const meanR =
    profiles.reduce((s, p) => s + p.avgRecency, 0) / Math.max(profiles.length, 1);
  const meanF =
    profiles.reduce((s, p) => s + p.avgFrequency, 0) / Math.max(profiles.length, 1);
  const meanM =
    profiles.reduce((s, p) => s + p.avgMonetary, 0) / Math.max(profiles.length, 1);

  const cellStyle = (val: number, mean: number, invert = false) => {
    const ratio = (val - mean) / (mean || 1);
    const score = invert ? -ratio : ratio;
    if (score >= 0.4) return "bg-emerald-100 text-emerald-950";
    if (score >= 0.05) return "bg-emerald-50 text-emerald-900";
    if (score <= -0.4) return "bg-rose-100 text-rose-950";
    if (score <= -0.05) return "bg-amber-50 text-amber-900";
    return "bg-slate-50 text-slate-900";
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h4 className="text-sm font-semibold text-slate-900">
          Segment RFM Profile Matrix
        </h4>
        <span className="text-xs text-slate-500">
          Green indicates stronger RFM health relative to segment average
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-left">
              <th className="py-2 pr-4 font-medium">Segment</th>
              <th className="py-2 px-3 font-medium text-right">Avg Recency (Days)</th>
              <th className="py-2 px-3 font-medium text-right">Avg Frequency (Orders)</th>
              <th className="py-2 px-3 font-medium text-right">Avg Monetary ($)</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.cluster} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-4 font-medium text-slate-900">
                  {p.segmentName}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-mono-tabular ${cellStyle(
                    p.avgRecency,
                    meanR,
                    true
                  )}`}
                >
                  {p.avgRecency.toFixed(1)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-mono-tabular ${cellStyle(
                    p.avgFrequency,
                    meanF,
                    false
                  )}`}
                >
                  {p.avgFrequency.toFixed(1)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-mono-tabular ${cellStyle(
                    p.avgMonetary,
                    meanM,
                    false
                  )}`}
                >
                  ${p.avgMonetary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
