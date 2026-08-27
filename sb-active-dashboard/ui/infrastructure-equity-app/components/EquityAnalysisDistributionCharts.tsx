import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { InfrastructureEquityAnalysisResult } from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysis";
import {
  formatEquityAnalysisContextMetricLabel,
  formatEquityRelationshipChartTitle,
} from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";
import {
  buildEquityMetricHistogramOption,
  buildEquityRelationshipScatterOption,
  computeEquityScatterLinearTrend,
  describeEquityValueSpread,
  equityRankBandColors,
  equityRankBandLabelTextColor,
  equityRankBandLabels,
  formatEquityMetricBreakLabel,
  formatEquityMetricRange,
  formatEquityScatterTrendPValue,
  summarizeEquityAnalysisDistributions,
  EquityMetricDistributionSummary,
} from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysisCharts";

function infrastructureAxisLabel(analysis: InfrastructureEquityAnalysisResult): string {
  return /\(%\)|%/.test(analysis.infrastructureMetricLabel)
    ? analysis.infrastructureMetricLabel
    : `${analysis.infrastructureMetricLabel} (%)`;
}

function RelationshipScatterChart({
  analysis,
  height,
  showBinBreaks = false,
  showTrendLine = false,
  onUnitClick,
}: {
  analysis: InfrastructureEquityAnalysisResult;
  height: number;
  showBinBreaks?: boolean;
  showTrendLine?: boolean;
  onUnitClick?: (objectId: number) => void;
}) {
  const infrastructureLabel = infrastructureAxisLabel(analysis);
  const contextLabel = formatEquityAnalysisContextMetricLabel(analysis);

  const option = useMemo(
    () =>
      buildEquityRelationshipScatterOption({
        units: analysis.units,
        breaks: analysis.breaks,
        infrastructureLabel,
        contextLabel,
        contextValueIsPercent: analysis.contextValueIsPercent,
        showBinBreaks,
        showTrendLine,
      }),
    [
      analysis,
      infrastructureLabel,
      contextLabel,
      showBinBreaks,
      showTrendLine,
    ]
  );

  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      chartRef.current?.getEchartsInstance()?.resize();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height, width: "100%" }}
        notMerge
        lazyUpdate
        onEvents={{
          click: (params: {
            seriesType?: string;
            data?: { objectId?: number };
          }) => {
            if (params.seriesType !== "scatter") return;
            const objectId = params.data?.objectId;
            if (objectId == null || !Number.isFinite(objectId)) return;
            onUnitClick?.(objectId);
          },
        }}
      />
    </div>
  );
}

function RelationshipScatterCard({
  analysis,
  onUnitClick,
}: {
  analysis: InfrastructureEquityAnalysisResult;
  onUnitClick?: (objectId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showBinBreaks, setShowBinBreaks] = useState(false);
  const [showTrendLine, setShowTrendLine] = useState(false);
  const relationshipTitle = formatEquityRelationshipChartTitle(analysis);
  const contextMetricLabel = formatEquityAnalysisContextMetricLabel(analysis);

  const trend = useMemo(
    () =>
      computeEquityScatterLinearTrend(
        analysis.units.map((unit) => ({
          x: unit.infrastructurePercent,
          y: unit.contextValue,
        }))
      ),
    [analysis.units]
  );

  return (
    <section className="space-y-2 rounded border border-gray-200 bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {relationshipTitle}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug text-gray-900">
            Each point is one geographic unit
          </p>
        </div>
        <IconButton
          type="button"
          size="small"
          onClick={() => setExpanded(true)}
          aria-label="Expand scatter plot"
          title="Expand chart"
          sx={{ color: "#6b7280", p: 0.5, flexShrink: 0 }}
        >
          <OpenInFullIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </div>

      <RelationshipScatterChart
        analysis={analysis}
        height={260}
        onUnitClick={onUnitClick}
      />

      <p className="text-[11px] leading-snug text-gray-500">
        Click a point to highlight that unit on the map. Expand the chart to
        toggle bin breaks and a trend line.
      </p>

      <Dialog
        open={expanded}
        onClose={() => setExpanded(false)}
        maxWidth="lg"
        fullWidth
        aria-labelledby="equity-relationship-scatter-title"
      >
        <DialogTitle
          id="equity-relationship-scatter-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            pr: 1,
          }}
        >
          <div className="min-w-0">
            <span className="block text-base font-semibold text-gray-900">
              {relationshipTitle}
            </span>
            <span className="mt-0.5 block text-sm font-normal text-gray-600">
              {infrastructureAxisLabel(analysis)} vs {contextMetricLabel}
            </span>
          </div>
          <IconButton
            aria-label="Close expanded chart"
            onClick={() => setExpanded(false)}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <div className="mb-3 flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="equity-form-checkbox"
                checked={showBinBreaks}
                onChange={(event) => setShowBinBreaks(event.target.checked)}
              />
              Show bin breaks
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="equity-form-checkbox"
                checked={showTrendLine}
                onChange={(event) => setShowTrendLine(event.target.checked)}
              />
              Show trend line
            </label>
          </div>

          <RelationshipScatterChart
            analysis={analysis}
            height={520}
            showBinBreaks={showBinBreaks}
            showTrendLine={showTrendLine}
            onUnitClick={onUnitClick}
          />

          {showTrendLine && trend && (
            <p className="mt-3 text-sm text-gray-700">
              Linear trend: R² = {trend.r2.toFixed(3)}, p ={" "}
              {formatEquityScatterTrendPValue(trend.pValue)} (n = {trend.n})
            </p>
          )}
          {showTrendLine && !trend && (
            <p className="mt-3 text-sm text-gray-500">
              Need at least 3 units with valid values to fit a trend line.
            </p>
          )}

          <p className="mt-2 text-xs leading-snug text-gray-500">
            Point colors match the bivariate map classes. Click a point to
            highlight that unit on the map.
            {showBinBreaks
              ? " Dashed lines show analysis bin cut points."
              : ""}
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function MetricDistributionCard({
  summary,
  datasetTitle,
}: {
  summary: EquityMetricDistributionSummary;
  datasetTitle: string;
}) {
  const option = useMemo(
    () => buildEquityMetricHistogramOption(summary),
    [summary]
  );
  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLElement>(null);
  const labels = equityRankBandLabels(summary.binCount);
  const pillColors = equityRankBandColors(summary.axis, summary.binCount);
  const spreadNote = describeEquityValueSpread(summary);
  const isNarrow =
    spreadNote.toLowerCase().includes("narrow") ||
    spreadNote.toLowerCase().includes("no variation");

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      chartRef.current?.getEchartsInstance()?.resize();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={containerRef}
      className="space-y-2 rounded border border-gray-200 bg-white px-3 py-3"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {datasetTitle}
        </p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-gray-900">
          {summary.label}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {labels.map((label, index) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 text-[11px]"
            style={{
              backgroundColor: pillColors[index],
              color: equityRankBandLabelTextColor(pillColors[index]),
            }}
          >
            <span className="font-medium">{label}</span>
            <span className="tabular-nums">{summary.binCounts[index] ?? 0}</span>
          </span>
        ))}
      </div>

      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: 180, width: "100%" }}
        notMerge
        lazyUpdate
      />

      <div className="space-y-1 text-[11px] leading-snug text-gray-500">
        <p>
          <span className="font-medium text-gray-600">Range:</span>{" "}
          {formatEquityMetricRange(summary)}
        </p>
        <p>
          <span className="font-medium text-gray-600">Bin cuts:</span>{" "}
          {formatEquityMetricBreakLabel(summary)}
        </p>
        <p className={isNarrow ? "font-medium text-amber-700" : undefined}>
          {spreadNote}
        </p>
      </div>
    </section>
  );
}

export default function EquityAnalysisDistributionCharts({
  analysis,
  onUnitClick,
}: {
  analysis: InfrastructureEquityAnalysisResult;
  onUnitClick?: (objectId: number) => void;
}) {
  const contextMetricLabel = formatEquityAnalysisContextMetricLabel(analysis);
  const summaries = useMemo(
    () =>
      summarizeEquityAnalysisDistributions({
        units: analysis.units,
        breaks: analysis.breaks,
        infrastructureLabel: infrastructureAxisLabel(analysis),
        contextLabel: contextMetricLabel,
      }),
    [analysis, contextMetricLabel]
  );

  return (
    <div className="space-y-3">
      <RelationshipScatterCard analysis={analysis} onUnitClick={onUnitClick} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Relative rank distributions
        </p>
        <p className="mt-1 text-[11px] leading-snug text-gray-500">
          Bins are ranks within this analysis extent
          {analysis.breaks.binCount === 3
            ? " (default equal-count terciles)"
            : ` (${analysis.breaks.binCount} equal-count quantile bands, or custom cuts)`}
          . Chart colors follow those rank bands.
        </p>
      </div>

      <MetricDistributionCard
        summary={summaries.infrastructure}
        datasetTitle={analysis.infrastructureDatasetTitle}
      />
      <MetricDistributionCard
        summary={summaries.context}
        datasetTitle={analysis.contextDatasetTitle}
      />
    </div>
  );
}
