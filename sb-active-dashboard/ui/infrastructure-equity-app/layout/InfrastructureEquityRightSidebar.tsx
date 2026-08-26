import PanelEdgeToggle from "@/ui/data-query-app/components/PanelEdgeToggle";
import { InfrastructureEquityAnalysisResult } from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysis";
import { equityContextCategoryLabel } from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";
import { PinnedEquityAnalysis } from "@/lib/infrastructure-equity-app/infrastructureEquityPinned";

interface InfrastructureEquityRightSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  analysis: InfrastructureEquityAnalysisResult | null;
  pinnedAnalyses: PinnedEquityAnalysis[];
  activeAnalysisId: string | null;
  onSelectAnalysis: (analysisId: string) => void;
  analysisRunning: boolean;
}

export default function InfrastructureEquityRightSidebar({
  isCollapsed,
  onToggle,
  analysis,
  pinnedAnalyses,
  activeAnalysisId,
  onSelectAnalysis,
  analysisRunning,
}: InfrastructureEquityRightSidebarProps) {
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
      className="relative z-20 flex h-full w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white"
    >
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

        {!analysisRunning && pinnedAnalyses.length === 0 && (
          <p className="text-sm text-gray-600">
            Configure and run an equity analysis to see summary statistics and
            charts here. Each run is pinned in the map layers panel so you can
            compare multiple results.
          </p>
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
                {analysis.contextFieldLabel}
              </p>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Geographic extent:</span>{" "}
                {analysis.geographicLabel}
              </p>
              <p className="text-sm text-gray-900">
                <span className="font-medium">Aggregation unit:</span>{" "}
                {analysis.geographyLabel}
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

            <p className="text-sm text-gray-600">
              Summary charts and deeper statistics will appear here in a future
              update.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
