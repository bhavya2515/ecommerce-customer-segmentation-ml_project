import React, { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Database,
  Download,
  FileUp,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Menu,
  RotateCcw,
  ScatterChart,
  X,
} from "lucide-react";
import sampleRetailCsv from "../ecommerce-customer-segmentation/data/sample_online_retail.csv?raw";
import { parseCsvContent } from "./ml/csvParser";
import { downloadExecutivePdfReport } from "./ml/exporters";
import { runFullSegmentationPipeline } from "./ml/pipeline";
import { BusinessInsightsPage } from "./pages/BusinessInsightsPage";
import { DataAnalysisPage } from "./pages/DataAnalysisPage";
import { DownloadReportsPage } from "./pages/DownloadReportsPage";
import { OverviewPage } from "./pages/OverviewPage";
import { RfmAnalysisPage } from "./pages/RfmAnalysisPage";
import { SegmentationPage } from "./pages/SegmentationPage";

type PageId =
  | "overview"
  | "data"
  | "rfm"
  | "segmentation"
  | "insights"
  | "reports";

const NAV_ITEMS: Array<{ id: PageId; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: "overview", label: "Project Overview", icon: LayoutDashboard },
  { id: "data", label: "Data Analysis", icon: Database },
  { id: "rfm", label: "RFM Analysis", icon: BarChart3 },
  { id: "segmentation", label: "Customer Segmentation", icon: ScatterChart },
  { id: "insights", label: "Business Insights", icon: Lightbulb },
  { id: "reports", label: "Download Reports", icon: Download },
];

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [csvText, setCsvText] = useState<string>(sampleRetailCsv);
  const [datasetName, setDatasetName] = useState<string>(
    "sample_online_retail.csv (Built-in Demo)"
  );
  const [isCustomDataset, setIsCustomDataset] = useState(false);
  const [selectedK, setSelectedK] = useState<number>(4);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pipelineState = useMemo(() => {
    try {
      const parsed = parseCsvContent(csvText);
      const maxValidK = Math.max(2, Math.min(8, parsed.rows.length - 1));
      const clampedK = Math.min(selectedK, maxValidK);
      const result = runFullSegmentationPipeline(
        parsed.headers,
        parsed.rows,
        clampedK
      );
      return { result, error: null as string | null };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to process CSV dataset.";
      return { result: null, error: msg };
    }
  }, [csvText, selectedK]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      try {
        // Validate early before committing state
        const parsed = parseCsvContent(text);
        runFullSegmentationPipeline(parsed.headers, parsed.rows, selectedK);
        setCsvText(text);
        setDatasetName(file.name);
        setIsCustomDataset(true);
      } catch (err) {
        setUploadError(
          err instanceof Error
            ? err.message
            : "Uploaded CSV could not be parsed. Please check required columns."
        );
      }
    };
    reader.onerror = () => {
      setUploadError("Unable to read the selected file.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetSample = () => {
    setCsvText(sampleRetailCsv);
    setDatasetName("sample_online_retail.csv (Built-in Demo)");
    setIsCustomDataset(false);
    setUploadError(null);
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activePage) || NAV_ITEMS[0];
  const maxAllowedK = pipelineState.result
    ? Math.min(8, Math.max(2, pipelineState.result.scoredRFM.length - 1))
    : 8;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="font-semibold text-base tracking-tight text-slate-900 whitespace-nowrap">
            RFM Segmenter
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1 text-slate-500 hover:text-slate-900"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Dashboard sections">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActivePage(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Dataset & Clustering Controls */}
      <div className="p-4 border-t border-slate-200 space-y-4 bg-slate-50/70">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-900">Dataset Source</p>
          <p className="text-xs text-slate-500 truncate" title={datasetName}>
            {datasetName}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Upload Retail CSV</span>
            </button>
            {isCustomDataset && (
              <button
                type="button"
                onClick={handleResetSample}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Sample Dataset</span>
              </button>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="sidebar-k-slider" className="font-semibold text-slate-900">
              K-Means Clusters (k)
            </label>
            <span className="font-mono-tabular font-semibold text-blue-600">
              {selectedK}
            </span>
          </div>
          <input
            id="sidebar-k-slider"
            type="range"
            min={2}
            max={maxAllowedK}
            value={Math.min(selectedK, maxAllowedK)}
            onChange={(e) => setSelectedK(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <p className="text-[11px] text-slate-500 leading-snug">
            Adjust clusters live using Elbow & Silhouette metrics.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on Left, Single Primary Action on Right */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-5 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="hidden sm:inline">Analytics</span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 truncate">
                {currentNav.label}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              disabled={!pipelineState.result}
              onClick={() =>
                pipelineState.result &&
                downloadExecutivePdfReport(pipelineState.result)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8 max-w-[1360px] w-full mx-auto">
          {uploadError && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-4 flex items-center justify-between gap-4 text-xs">
              <span>
                <strong>CSV Upload Notice:</strong> {uploadError}
              </span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-rose-700 hover:text-rose-950 font-medium whitespace-nowrap cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {pipelineState.error || !pipelineState.result ? (
            <div className="bg-white border border-rose-200 rounded-xl p-6 text-sm text-rose-900">
              <p className="font-semibold">Unable to process dataset</p>
              <p className="text-xs text-rose-700 mt-1">{pipelineState.error}</p>
              <button
                type="button"
                onClick={handleResetSample}
                className="mt-4 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Restore Built-in Sample Dataset
              </button>
            </div>
          ) : (
            <>
              {activePage === "overview" && (
                <OverviewPage
                  result={pipelineState.result}
                  datasetName={datasetName}
                  onNavigate={(id) => setActivePage(id as PageId)}
                />
              )}
              {activePage === "data" && (
                <DataAnalysisPage result={pipelineState.result} />
              )}
              {activePage === "rfm" && (
                <RfmAnalysisPage result={pipelineState.result} />
              )}
              {activePage === "segmentation" && (
                <SegmentationPage
                  result={pipelineState.result}
                  selectedK={selectedK}
                  onSelectK={setSelectedK}
                />
              )}
              {activePage === "insights" && (
                <BusinessInsightsPage result={pipelineState.result} />
              )}
              {activePage === "reports" && (
                <DownloadReportsPage result={pipelineState.result} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
