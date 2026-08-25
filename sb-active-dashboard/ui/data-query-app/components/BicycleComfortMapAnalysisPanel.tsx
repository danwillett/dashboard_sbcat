import { useMemo, useState } from "react";
import {
  BicycleComfortCategoryStats,
  formatComfortLengthMeters,
} from "@/lib/data-query-app/bicycleComfortMapStats";
import {
  BicycleComfortFilterState,
  describeBicycleComfortGeographic,
} from "@/lib/data-query-app/bicycleComfortMapFilters";
import BicycleComfortMapChartModal from "@/ui/data-query-app/components/BicycleComfortMapChartModal";

interface BicycleComfortMapAnalysisPanelProps {
  datasetTitle: string;
  stats: BicycleComfortCategoryStats | null;
  loading?: boolean;
  error?: string | null;
  filters: BicycleComfortFilterState;
  onFiltersChange: (next: BicycleComfortFilterState) => void;
  availableCategories: string[];
  categoriesLoading?: boolean;
  featureCount: number | null;
  jurisdictionPlaces?: string[];
  jurisdictionPlacesLoading?: boolean;
  filtersLoading?: boolean;
  filtersError?: string | null;
}

function StatRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 rounded px-1 py-0.5 ${
        strong ? "bg-gray-100 font-medium" : "bg-white"
      }`}
    >
      <span className="text-gray-600">{label}</span>
      <span className="text-right text-gray-900">{value}</span>
    </div>
  );
}

export default function BicycleComfortMapAnalysisPanel({
  datasetTitle,
  stats,
  loading = false,
  error = null,
  filters,
  onFiltersChange,
  availableCategories,
  categoriesLoading = false,
  featureCount,
  jurisdictionPlaces = [],
  jurisdictionPlacesLoading = false,
  filtersLoading = false,
  filtersError = null,
}: BicycleComfortMapAnalysisPanelProps) {
  const [chartOpen, setChartOpen] = useState(false);

  const scopeDescription = useMemo(
    () => describeBicycleComfortGeographic(filters.geographic),
    [filters.geographic]
  );

  return (
    <div id="bicycle-comfort-map-analysis-panel" className="flex flex-col">
      <div className="border-b border-gray-100 px-4 py-4">
        <h3 className="text-base font-medium text-gray-800">
          Infrastructure summary
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Share of road segments and total length by comfort / infrastructure
          class for the current filters.
        </p>

        <p className="mt-3 text-xs text-gray-600">
          Showing segments within{" "}
          <span className="font-medium text-gray-800">{scopeDescription}</span>.
          Adjust geographic extent and infrastructure class on the Filters tab
          or in the chart view.
        </p>

        {loading && (
          <p className="mt-3 text-sm text-gray-500">Calculating statistics…</p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {!loading && !error && stats && (
          <div className="mt-3 space-y-0.5 text-sm">
            <StatRow
              label="Total segments"
              value={stats.totalSegments.toLocaleString()}
              strong
            />
            <StatRow
              label="Total length"
              value={formatComfortLengthMeters(stats.totalLengthMeters)}
              strong
            />
          </div>
        )}

        {!loading && !error && stats && stats.categories.length > 0 && (
          <button
            type="button"
            onClick={() => setChartOpen(true)}
            className="mt-4 w-full rounded border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
          >
            Explore charts…
          </button>
        )}
      </div>

      {!loading && !error && stats && stats.categories.length > 0 && (
        <div className="px-4 py-4">
          <h4 className="text-sm font-semibold text-gray-800">By category</h4>
          <p className="mt-1 text-xs text-gray-500">
            Categories within{" "}
            <span className="font-medium text-gray-700">{scopeDescription}</span>
            . Field: <span className="font-mono">{stats.categoryField}</span>
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[32%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-1 pr-0.5 font-medium">Category</th>
                  <th className="whitespace-nowrap py-1 pr-1 font-medium text-right">
                    Segments
                  </th>
                  <th className="whitespace-nowrap py-1 pr-0.5 font-medium text-right">
                    % seg
                  </th>
                  <th className="whitespace-nowrap py-1 pr-1 font-medium text-right">
                    Length
                  </th>
                  <th className="whitespace-nowrap py-1 font-medium text-right">
                    % len
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.categories.map((row) => (
                  <tr key={row.category} className="border-b border-gray-100">
                    <td className="align-top py-1 pr-0.5 text-gray-800">
                      <span
                        className="block min-h-[2.5rem] whitespace-normal break-words leading-5"
                      >
                        {row.category}
                      </span>
                    </td>
                    <td className="align-top py-1 pr-1 text-right text-gray-700">
                      {row.segmentCount.toLocaleString()}
                    </td>
                    <td className="align-top py-1 pr-0.5 text-right text-gray-600">
                      {row.percentOfSegments.toFixed(1)}%
                    </td>
                    <td className="align-top py-1 pr-1 text-right text-gray-700">
                      {formatComfortLengthMeters(row.lengthMeters)}
                    </td>
                    <td className="align-top py-1 text-right text-gray-600">
                      {row.percentOfLength.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && stats && stats.categories.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          No category statistics available for {scopeDescription}.
        </p>
      )}

      <BicycleComfortMapChartModal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        datasetTitle={datasetTitle}
        stats={stats}
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableCategories={availableCategories}
        categoriesLoading={categoriesLoading}
        featureCount={featureCount}
        jurisdictionPlaces={jurisdictionPlaces}
        jurisdictionPlacesLoading={jurisdictionPlacesLoading}
        filtersLoading={filtersLoading}
        filtersError={filtersError}
        statsLoading={loading}
      />
    </div>
  );
}
