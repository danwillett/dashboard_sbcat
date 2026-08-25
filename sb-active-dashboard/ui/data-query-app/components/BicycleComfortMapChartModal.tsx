import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ReactECharts from "echarts-for-react";
import {
  BicycleComfortCategoryStats,
  formatComfortLengthMeters,
} from "@/lib/data-query-app/bicycleComfortMapStats";
import {
  BicycleComfortChartMetric,
  bicycleComfortBarChartOption,
} from "@/lib/data-query-app/bicycleComfortMapChartOptions";
import {
  BicycleComfortFilterState,
  getBicycleComfortFilterSummary,
} from "@/lib/data-query-app/bicycleComfortMapFilters";
import BicycleComfortMapFiltersPanel from "@/ui/data-query-app/components/BicycleComfortMapFiltersPanel";

const PORTAL_ID = "data-query-page-content";

interface BicycleComfortMapChartModalProps {
  open: boolean;
  onClose: () => void;
  datasetTitle: string;
  stats: BicycleComfortCategoryStats | null;
  filters: BicycleComfortFilterState;
  onFiltersChange: (next: BicycleComfortFilterState) => void;
  availableCategories: string[];
  categoriesLoading?: boolean;
  featureCount: number | null;
  jurisdictionPlaces?: string[];
  jurisdictionPlacesLoading?: boolean;
  filtersLoading?: boolean;
  filtersError?: string | null;
  statsLoading?: boolean;
}

function portalTarget(): HTMLElement {
  return document.getElementById(PORTAL_ID) ?? document.body;
}

export default function BicycleComfortMapChartModal({
  open,
  onClose,
  datasetTitle,
  stats,
  filters,
  onFiltersChange,
  availableCategories,
  categoriesLoading = false,
  featureCount,
  jurisdictionPlaces = [],
  jurisdictionPlacesLoading = false,
  filtersLoading = false,
  filtersError = null,
  statsLoading = false,
}: BicycleComfortMapChartModalProps) {
  const [metric, setMetric] = useState<BicycleComfortChartMetric>("length");

  useEffect(() => {
    if (open) setMetric("length");
  }, [open]);

  const filterSummary = useMemo(
    () => getBicycleComfortFilterSummary(filters),
    [filters]
  );

  const chartOption = useMemo(() => {
    if (!stats?.categories.length) return null;
    const metricLabel =
      metric === "length" ? "Share of road length" : "Share of road segments";
    return bicycleComfortBarChartOption(
      stats.categories,
      metric,
      `${metricLabel} · ${filterSummary}`
    );
  }, [stats, metric, filterSummary]);

  const chartUpdating = statsLoading || filtersLoading;

  if (!open) return null;

  const modal = (
    <div
      id="bicycle-comfort-map-chart-modal"
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bicycle-comfort-map-chart-modal-title"
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
        <aside
          className="flex w-80 shrink-0 flex-col border-r border-gray-100 bg-gray-50/80"
          style={{ colorScheme: "light", backgroundColor: "#f9fafb" }}
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Filters
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Changes here update the map, chart, and Filters tab.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <BicycleComfortMapFiltersPanel
              datasetTitle={datasetTitle}
              filters={filters}
              availableCategories={availableCategories}
              categoriesLoading={categoriesLoading}
              featureCount={featureCount}
              jurisdictionPlaces={jurisdictionPlaces}
              jurisdictionPlacesLoading={jurisdictionPlacesLoading}
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
                id="bicycle-comfort-map-chart-modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                {datasetTitle} — category chart
              </h2>
              <p className="mt-1 text-xs text-gray-500">{filterSummary}</p>
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

          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Metric
            </span>
            {(
              [
                ["length", "% of total length"],
                ["segments", "% of segments"],
              ] as const
            ).map(([id, label]) => {
              const selected = metric === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMetric(id)}
                  className={`rounded border px-2.5 py-1 text-xs font-medium ${
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                  style={{
                    backgroundColor: selected ? "#eff6ff" : "#ffffff",
                  }}
                >
                  {label}
                </button>
              );
            })}
            {chartUpdating && (
              <span className="text-xs text-gray-400">Updating…</span>
            )}
          </div>

          {stats && (
            <div className="border-b border-gray-100 px-5 py-2 text-sm text-gray-700">
              <span>
                <strong>{stats.totalSegments.toLocaleString()}</strong> segments
              </span>
              <span className="mx-2 text-gray-300">·</span>
              <span>
                <strong>
                  {formatComfortLengthMeters(stats.totalLengthMeters)}
                </strong>{" "}
                total
              </span>
            </div>
          )}

          <div className="min-h-[320px] flex-1 px-2 py-3">
            {chartOption ? (
              <ReactECharts
                option={chartOption}
                style={{ height: "100%", minHeight: 320 }}
                notMerge
              />
            ) : (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                {chartUpdating
                  ? "Loading chart data…"
                  : "No chart data available for the current filters."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalTarget());
}
