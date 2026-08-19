import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactECharts from "echarts-for-react";
import {
  barChartOption,
  chartRowsForDimension,
  COUNT_SURVEY_CHART_DIMENSIONS,
  CountSurveyChartDimension,
  CountSurveyChartMode,
  defaultStackSecondary,
  dimensionLabel,
  stackedBarChartOption,
  stackedChartData,
  stackableSecondaryOptions,
} from "@/lib/data-query-app/countSurveyChartOptions";
import {
  CountSurveyFilterState,
  getCountSurveyFilterSummary,
} from "@/lib/data-query-app/countSurveyFilters";
import { FilteredCountSurveyStats } from "@/lib/data-query-app/countSurveyStats";
import CountSurveyFiltersPanel from "@/ui/data-query-app/components/CountSurveyFiltersPanel";

const PORTAL_ID = "data-query-page-content";

interface CountSurveyChartModalProps {
  open: boolean;
  onClose: () => void;
  datasetTitle: string;
  filters: CountSurveyFilterState;
  onFiltersChange: (next: CountSurveyFilterState) => void;
  availableYears: number[];
  siteCount: number | null;
  filtersLoading: boolean;
  filtersError: string | null;
  filterStats: FilteredCountSurveyStats;
  filterStatsLoading: boolean;
  jurisdictionStatsLoading: boolean;
  onLoadJurisdictionBreakdown: (
    level: "city" | "service-area"
  ) => Promise<void>;
  initialDimension?: CountSurveyChartDimension;
}

function portalTarget(): HTMLElement {
  return document.getElementById(PORTAL_ID) ?? document.body;
}

export default function CountSurveyChartModal({
  open,
  onClose,
  datasetTitle,
  filters,
  onFiltersChange,
  availableYears,
  siteCount,
  filtersLoading,
  filtersError,
  filterStats,
  filterStatsLoading,
  jurisdictionStatsLoading,
  onLoadJurisdictionBreakdown,
  initialDimension = "year",
}: CountSurveyChartModalProps) {
  const chartRef = useRef<ReactECharts>(null);
  const [dimension, setDimension] =
    useState<CountSurveyChartDimension>(initialDimension);
  const [chartMode, setChartMode] = useState<CountSurveyChartMode>("single");
  const [stackDimension, setStackDimension] =
    useState<CountSurveyChartDimension>("year");
  const [jurisdictionLevel, setJurisdictionLevel] = useState<
    "city" | "service-area"
  >("city");

  useEffect(() => {
    if (open) setDimension(initialDimension);
  }, [open, initialDimension]);

  useEffect(() => {
    if (chartMode === "stacked") {
      setStackDimension(defaultStackSecondary(dimension));
    }
  }, [chartMode, dimension]);

  const needsJurisdiction =
    dimension === "jurisdiction" ||
    (chartMode === "stacked" && stackDimension === "jurisdiction");

  useEffect(() => {
    if (open && needsJurisdiction && filterStats.byJurisdiction.length === 0) {
      void onLoadJurisdictionBreakdown(jurisdictionLevel);
    }
  }, [
    open,
    needsJurisdiction,
    jurisdictionLevel,
    filterStats.byJurisdiction.length,
    onLoadJurisdictionBreakdown,
  ]);

  const stackOptions = useMemo(
    () => stackableSecondaryOptions(dimension),
    [dimension]
  );

  const rows = useMemo(
    () => chartRowsForDimension(filterStats, dimension),
    [filterStats, dimension]
  );

  const stacked = useMemo(() => {
    if (chartMode !== "stacked") return null;
    return stackedChartData(filterStats, dimension, stackDimension);
  }, [chartMode, filterStats, dimension, stackDimension]);

  const chartOption = useMemo(() => {
    if (chartMode === "stacked" && stacked) {
      return stackedBarChartOption(stacked, stackDimension);
    }
    return barChartOption(rows);
  }, [chartMode, stacked, stackDimension, rows]);

  const dimensionMeta = COUNT_SURVEY_CHART_DIMENSIONS.find(
    (d) => d.id === dimension
  );
  const hasData =
    chartMode === "stacked"
      ? !!stacked?.series.some((series) => series.data.some((value) => value > 0))
      : rows.some((r) => r.count > 0);
  const canStack = stackOptions.length > 0;
  const ru = filterStats.roadUser;
  const chartUpdating =
    filterStatsLoading || filtersLoading || jurisdictionStatsLoading;

  const filterSummary = useMemo(
    () => getCountSurveyFilterSummary(filters),
    [filters]
  );

  const chartSubtitle = useMemo(() => {
    const base =
      chartMode === "stacked"
        ? `${dimensionLabel(dimension)} grouped, stacked by ${dimensionLabel(stackDimension)}`
        : dimensionMeta?.description ?? "Filtered site breakdown";
    if (filterStats.truncated) {
      return `${base} · Stats from first ${filterStats.periodCount.toLocaleString()} survey periods`;
    }
    return base;
  }, [
    chartMode,
    dimension,
    stackDimension,
    dimensionMeta?.description,
    filterStats.truncated,
    filterStats.periodCount,
  ]);

  if (!open) return null;

  const modal = (
    <div
      id="count-survey-chart-modal"
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="count-survey-chart-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(85%,820px)] w-full max-w-7xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
        style={{
          colorScheme: "light",
          backgroundColor: "#ffffff",
          color: "#111827",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="flex w-80 shrink-0 flex-col border-r border-gray-100 bg-gray-50/80">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Filters
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Changes here update the map and the Filters tab.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CountSurveyFiltersPanel
              datasetTitle={datasetTitle}
              filters={filters}
              availableYears={availableYears}
              siteCount={siteCount}
              loading={filtersLoading}
              error={filtersError}
              onFiltersChange={onFiltersChange}
              showHeader={false}
            />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div>
              <h2
                id="count-survey-chart-modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                Count survey data availability
              </h2>
              <p className="mt-1 text-xs text-gray-500">{chartSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-200 px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
              style={{ backgroundColor: "#ffffff", color: "#4b5563" }}
            >
              Close
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Chart type
            </span>
            <div className="flex gap-1">
              {(
                [
                  ["single", "Single"],
                  ["stacked", "Stacked"],
                ] as const
              ).map(([mode, label]) => {
                const selected = chartMode === mode;
                const disabled = mode === "stacked" && !canStack;
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={disabled}
                    onClick={() => setChartMode(mode)}
                    className={`rounded border px-2.5 py-1 text-xs font-medium ${
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-800"
                        : "border-gray-200 text-gray-700"
                    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                    style={{
                      backgroundColor: selected ? "#eff6ff" : "#ffffff",
                      color: selected ? "#1e40af" : "#374151",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {chartMode === "stacked" ? "Group by (x-axis)" : "Plot"}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COUNT_SURVEY_CHART_DIMENSIONS.map((opt) => {
                const selected = dimension === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.description}
                    onClick={() => setDimension(opt.id)}
                    className={`rounded border px-2.5 py-1 text-xs font-medium ${
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-800"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                    style={{
                      backgroundColor: selected ? "#eff6ff" : "#ffffff",
                      color: selected ? "#1e40af" : "#374151",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {chartMode === "stacked" && stackOptions.length > 0 && (
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Stack by
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stackOptions.map((opt) => {
                  const selected = stackDimension === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setStackDimension(opt)}
                      className={`rounded border px-2.5 py-1 text-xs font-medium ${
                        selected
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-gray-200 text-gray-700"
                      }`}
                      style={{
                        backgroundColor: selected ? "#eff6ff" : "#ffffff",
                        color: selected ? "#1e40af" : "#374151",
                      }}
                    >
                      {dimensionLabel(opt)}
                    </button>
                  );
                })}
              </div>
              {stackDimension === "jurisdiction" ||
              dimension === "jurisdiction" ? (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Stacked counts are survey periods assigned to each place.
                </p>
              ) : null}
            </div>
          )}

          {needsJurisdiction && (
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-2">
              <span className="text-xs text-gray-500">Geography level:</span>
              <button
                type="button"
                className={`rounded border px-2 py-0.5 text-xs ${
                  jurisdictionLevel === "city"
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
                style={{
                  backgroundColor:
                    jurisdictionLevel === "city" ? "#eff6ff" : "#ffffff",
                }}
                onClick={() => {
                  setJurisdictionLevel("city");
                  void onLoadJurisdictionBreakdown("city");
                }}
              >
                Cities
              </button>
              <button
                type="button"
                className={`rounded border px-2 py-0.5 text-xs ${
                  jurisdictionLevel === "service-area"
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
                style={{
                  backgroundColor:
                    jurisdictionLevel === "service-area" ? "#eff6ff" : "#ffffff",
                }}
                onClick={() => {
                  setJurisdictionLevel("service-area");
                  void onLoadJurisdictionBreakdown("service-area");
                }}
              >
                Service areas
              </button>
              {jurisdictionStatsLoading && (
                <span className="text-xs text-gray-400">Loading…</span>
              )}
            </div>
          )}

          <div className="border-b border-gray-100 px-5 py-2">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
              <span>
                <strong className="font-medium text-gray-900">
                  {filterStatsLoading ? "…" : ru.totalSites.toLocaleString()}
                </strong>{" "}
                sites
              </span>
              {!filterStatsLoading && (
                <>
                  <span>
                    Survey periods:{" "}
                    <strong>{filterStats.totalSurveyPeriods}</strong>
                  </span>
                  <span>
                    Bike only: <strong>{ru.bikeOnly}</strong>
                  </span>
                  <span>
                    Ped only: <strong>{ru.pedOnly}</strong>
                  </span>
                  <span>
                    Both: <strong>{ru.both}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto px-5 py-4">
            {chartUpdating && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                <p className="text-sm text-gray-600">Updating chart…</p>
              </div>
            )}
            <div className="mb-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Filtered data
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
                {filterSummary.map(({ label, value }) => (
                  <span key={label}>
                    <span className="text-gray-500">{label}:</span>{" "}
                    <span className="font-medium text-gray-800">{value}</span>
                  </span>
                ))}
              </div>
            </div>
            {!filterStatsLoading && !hasData && (
              <p className="py-16 text-center text-sm text-gray-500">
                No data matches the current filters for this breakdown.
              </p>
            )}
            {hasData && (
              <ReactECharts
                ref={chartRef}
                option={chartOption}
                style={{ height: 420, width: "100%" }}
                notMerge
                opts={{ renderer: "svg" }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalTarget());
}
