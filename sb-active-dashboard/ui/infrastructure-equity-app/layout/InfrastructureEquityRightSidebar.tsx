import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import PanelEdgeToggle from "@/ui/data-query-app/components/PanelEdgeToggle";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import type MapView from "@arcgis/core/views/MapView";
import EquityAnalysisDistributionCharts from "@/ui/infrastructure-equity-app/components/EquityAnalysisDistributionCharts";
import EquityExportPanel from "@/ui/infrastructure-equity-app/components/EquityExportPanel";
import { InfrastructureEquityAnalysisResult } from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysis";
import { equityContextCategoryLabel } from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";
import { formatEquityAnalysisContextMetricLabel } from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";
import { formatEquityAnalysisSummaryBullets } from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";
import { PinnedEquityAnalysis } from "@/lib/infrastructure-equity-app/infrastructureEquityPinned";

/** Matches previous `w-80` panel width. */
const MIN_PANEL_WIDTH_PX = 320;
const MAX_PANEL_WIDTH_PX = 720;

interface InfrastructureEquityRightSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  analysis: InfrastructureEquityAnalysisResult | null;
  pinnedAnalyses: PinnedEquityAnalysis[];
  activeAnalysisId: string | null;
  onSelectAnalysis: (analysisId: string) => void;
  analysisRunning: boolean;
  onScatterUnitClick?: (objectId: number) => void;
  mapView: MapView | null;
  resolveInfrastructureDataset: (datasetId: number) => CatalogDataset | null;
}

function clampPanelWidth(width: number): number {
  const viewportCap =
    typeof window !== "undefined"
      ? Math.floor(window.innerWidth * 0.55)
      : MAX_PANEL_WIDTH_PX;
  const maxWidth = Math.max(
    MIN_PANEL_WIDTH_PX,
    Math.min(MAX_PANEL_WIDTH_PX, viewportCap)
  );
  return Math.min(maxWidth, Math.max(MIN_PANEL_WIDTH_PX, Math.round(width)));
}

export default function InfrastructureEquityRightSidebar({
  isCollapsed,
  onToggle,
  analysis,
  pinnedAnalyses,
  activeAnalysisId,
  onSelectAnalysis,
  analysisRunning,
  onScatterUnitClick,
  mapView,
  resolveInfrastructureDataset,
}: InfrastructureEquityRightSidebarProps) {
  const [panelWidth, setPanelWidth] = useState(MIN_PANEL_WIDTH_PX);
  const [isResizing, setIsResizing] = useState(false);
  const dragStateRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);

  const analysisSummaryBullets = useMemo(() => {
    if (!analysis) return [];
    const infrastructureLabel = /\(%\)|%/.test(analysis.infrastructureMetricLabel)
      ? analysis.infrastructureMetricLabel
      : `${analysis.infrastructureMetricLabel} (%)`;
    return formatEquityAnalysisSummaryBullets({
      units: analysis.units,
      breaks: analysis.breaks,
      infrastructureLabel,
      contextLabel: formatEquityAnalysisContextMetricLabel(analysis),
      geographyLabel: analysis.geographyLabel,
      contextKind: analysis.contextKind,
      contextDatasetTitle: analysis.contextDatasetTitle,
    });
  }, [analysis]);

  const handleResizeMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragStateRef.current = {
        startX: event.clientX,
        startWidth: panelWidth,
      };
      setIsResizing(true);
    },
    [panelWidth]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const nextWidth = drag.startWidth + (drag.startX - event.clientX);
      setPanelWidth(clampPanelWidth(nextWidth));
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      setIsResizing(false);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const handleWindowResize = () => {
      setPanelWidth((current) => clampPanelWidth(current));
    };
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  if (isCollapsed) {
    return (
      <div
        id="infrastructure-equity-right-sidebar-collapsed"
        className="relative z-30 h-full w-0 flex-shrink-0 overflow-visible"
      >
        <PanelEdgeToggle
          id="infrastructure-equity-right-expand-icon"
          side="right"
          isCollapsed={true}
          onClick={onToggle}
        />
      </div>
    );
  }

  return (
    <div
      id="infrastructure-equity-right-sidebar"
      className="relative z-20 flex h-full flex-shrink-0 flex-col border-l border-gray-200 bg-white"
      style={{ width: panelWidth }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize analysis panel"
        aria-valuemin={MIN_PANEL_WIDTH_PX}
        aria-valuemax={MAX_PANEL_WIDTH_PX}
        aria-valuenow={panelWidth}
        title="Drag to resize"
        className={`absolute bottom-0 left-0 top-0 z-40 w-1.5 -translate-x-1/2 cursor-col-resize touch-none ${
          isResizing ? "bg-blue-400/50" : "bg-transparent hover:bg-blue-300/40"
        }`}
        onMouseDown={handleResizeMouseDown}
      />

      <PanelEdgeToggle
        id="infrastructure-equity-right-collapse-icon"
        side="right"
        isCollapsed={false}
        onClick={onToggle}
      />

      <div className="flex-shrink-0 border-b border-gray-200 px-4 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Analysis</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        {analysisRunning && (
          <p className="text-sm text-gray-600">Running equity analysis…</p>
        )}

        {!analysisRunning && pinnedAnalyses.length > 1 && (
          <section className="mb-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pinned analyses
            </p>
            <select
              className="w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900"
              value={activeAnalysisId ?? ""}
              onChange={(event) => onSelectAnalysis(event.target.value)}
            >
              {pinnedAnalyses.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.layerTitleMain} ({entry.layerSubtitle})
                </option>
              ))}
            </select>
          </section>
        )}

        {analysis && !analysisRunning && (
          <div className="space-y-4">
            {analysisSummaryBullets.length > 0 && (
              <section className="rounded border border-blue-100 bg-blue-50/70 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-800/80">
                  Key takeaways
                </p>
                <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-gray-800">
                  {analysisSummaryBullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Configuration
              </p>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Infrastructure:</span>{" "}
                {analysis.infrastructureDatasetTitle}
              </p>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Metric:</span>{" "}
                {analysis.infrastructureMetricLabel}
              </p>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Context category:</span>{" "}
                {equityContextCategoryLabel(analysis.contextKind)}
              </p>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Context:</span>{" "}
                {analysis.contextDatasetTitle}
              </p>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Context field:</span>{" "}
                {formatEquityAnalysisContextMetricLabel(analysis)}
              </p>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Geographic extent:</span>{" "}
                {analysis.geographicLabel}
              </p>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Aggregation unit:</span>{" "}
                {analysis.geographyLabel}
              </p>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Bins:</span>{" "}
                {analysis.breaks.binCount}×{analysis.breaks.binCount}
              </p>
            </section>

            <section className="space-y-1 rounded border border-gray-200 bg-gray-50 px-3 py-3">
              <p className="text-xs font-semibold text-gray-700">
                Units analyzed
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {analysis.unitsWithData}
              </p>
              <p className="text-xs text-gray-500">
                of {analysis.unitsTotal} eligible geographic units
                {analysis.boundaryGeometry
                  ? " with a majority of area inside the selected extent"
                  : ""}{" "}
                with both infrastructure segments and a context value
              </p>
            </section>

            <EquityAnalysisDistributionCharts
              analysis={analysis}
              onUnitClick={onScatterUnitClick}
            />
          </div>
        )}
      </div>

      {!analysisRunning && pinnedAnalyses.length > 0 && (
        <EquityExportPanel
          pinnedAnalyses={pinnedAnalyses}
          activeAnalysisId={activeAnalysisId}
          analysisRunning={analysisRunning}
          mapView={mapView}
          resolveInfrastructureDataset={resolveInfrastructureDataset}
        />
      )}
    </div>
  );
}
