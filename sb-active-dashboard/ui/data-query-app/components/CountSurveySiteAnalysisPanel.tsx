import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  fetchVolumeSiteAadt,
  fetchVolumeSiteSeries,
  VolumeSiteAadtPeriod,
} from "@/lib/data-services/VolumeSitesApiService";
import {
  VolumeSite,
  VolumeSiteQueryFilters,
  VolumeSeriesLine,
  VolumeSiteSeriesResponse,
} from "@/lib/volume-app/siteTemporalQuery";
import { CountSurveyFilterState } from "@/lib/data-query-app/countSurveyFilters";
import { FilteredCountSurveyStats } from "@/lib/data-query-app/countSurveyStats";
import { buildCountSurveyTimeseriesChartOption } from "@/lib/volume-app/countSurveyTimeseriesChart";
import CountSurveyChartModal from "@/ui/data-query-app/components/CountSurveyChartModal";
import CountSurveyTimeseriesModal from "@/ui/data-query-app/components/CountSurveyTimeseriesModal";

interface CountSurveySiteAnalysisPanelProps {
  sites: VolumeSite[];
  selectedSiteId: string | null;
  selectedSiteName?: string | null;
  filters: VolumeSiteQueryFilters;
  countSurveyFilters: CountSurveyFilterState;
  datasetTitle?: string;
  availableYears?: number[];
  siteCount?: number | null;
  countFiltersLoading?: boolean;
  countFiltersError?: string | null;
  onCountSurveyFiltersChange?: (next: CountSurveyFilterState) => void;
  geographicLevel?: "county" | "city" | "service-area";
  filterStats: FilteredCountSurveyStats;
  filterStatsLoading?: boolean;
  jurisdictionStatsLoading?: boolean;
  onLoadJurisdictionBreakdown?: (
    level: "city" | "service-area"
  ) => Promise<void>;
  onSelectSite: (siteId: string | null, siteName?: string | null) => void;
}

function bucketLabel(payload: VolumeSiteSeriesResponse | null): string | null {
  if (!payload?.bucket) return null;
  const unit =
    payload.bucket === "hour"
      ? "hourly"
      : payload.bucket === "day"
        ? "daily"
        : "weekly";
  const days = payload.aadt_period?.coverage_days;
  if (days != null) {
    return `${unit} sums · latest AADT window (${days} day${days === 1 ? "" : "s"})`;
  }
  return `${unit} sums`;
}

export default function CountSurveySiteAnalysisPanel({
  sites,
  selectedSiteId,
  selectedSiteName,
  filters,
  countSurveyFilters,
  datasetTitle = "Count surveys",
  availableYears = [],
  siteCount = null,
  countFiltersLoading = false,
  countFiltersError = null,
  onCountSurveyFiltersChange,
  geographicLevel = "county",
  filterStats,
  filterStatsLoading = false,
  jurisdictionStatsLoading = false,
  onLoadJurisdictionBreakdown,
  onSelectSite,
}: CountSurveySiteAnalysisPanelProps) {
  const [periods, setPeriods] = useState<VolumeSiteAadtPeriod[]>([]);
  const [seriesPayload, setSeriesPayload] =
    useState<VolumeSiteSeriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(selectedSiteName || "");
  const [modalOpen, setModalOpen] = useState(false);
  const [chartModalOpen, setChartModalOpen] = useState(false);

  const ru = filterStats.roadUser;

  const sortedSites = useMemo(
    () => [...sites].sort((a, b) => a.name.localeCompare(b.name)),
    [sites]
  );

  const selectedSite = useMemo(
    () =>
      selectedSiteId
        ? sites.find((site) => String(site.id) === selectedSiteId) ?? null
        : null,
    [sites, selectedSiteId]
  );

  useEffect(() => {
    if (!selectedSiteId) {
      setPeriods([]);
      setSeriesPayload(null);
      setError(null);
      setTitle("");
      setModalOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchVolumeSiteAadt(Number(selectedSiteId)),
      fetchVolumeSiteSeries(Number(selectedSiteId), filters, {
        agg: "sum",
        window: "latest_aadt",
        byFlow: false,
        targetPoints: 14,
      }),
    ])
      .then(([aadt, series]) => {
        if (cancelled) return;
        setPeriods(aadt.periods || []);
        setTitle(
          aadt.name || series.name || selectedSiteName || `Site ${selectedSiteId}`
        );
        setSeriesPayload(series);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setPeriods([]);
        setSeriesPayload(null);
        setError(err.message || "Failed to load site analysis");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSiteId, selectedSiteName, filters]);

  const lines = useMemo(() => {
    const series = seriesPayload?.series || [];
    // Initial chart: only flow="all" per road user
    return series.filter((line) => !line.flow || line.flow === "all");
  }, [seriesPayload]);

  const summary = useMemo(() => {
    let pointCount = 0;
    let totalCounts = 0;
    let minT: string | null = null;
    let maxT: string | null = null;
    for (const line of lines) {
      for (const point of line.points) {
        if (!point.t) continue;
        pointCount += 1;
        totalCounts += point.c || 0;
        if (!minT || point.t < minT) minT = point.t;
        if (!maxT || point.t > maxT) maxT = point.t;
      }
    }
    return { pointCount, totalCounts, minT, maxT };
  }, [lines]);

  const yAxisName =
    seriesPayload?.bucket === "hour"
      ? "Counts / hour"
      : seriesPayload?.bucket === "day"
        ? "Counts / day"
        : "Counts";

  const chartOption = useMemo(
    () =>
      buildCountSurveyTimeseriesChartOption({
        lines,
        bucket: seriesPayload?.bucket ?? null,
        yAxisName,
        compact: true,
      }),
    [lines, seriesPayload?.bucket, yAxisName]
  );

  return (
    <div id="count-survey-site-analysis-panel" className="flex flex-col">
      <div className="border-b border-gray-100 px-4 py-4">
        <h3 className="text-base font-medium text-gray-800">
          Filtered data availability
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Summary of count sites and survey periods matching the current Filters
          tab
          {geographicLevel !== "county" ? ` (${geographicLevel})` : ""}.
        </p>
        {filterStatsLoading ? (
          <p className="mt-3 text-sm text-gray-500">Loading summary…</p>
        ) : (
          <div className="mt-3 space-y-0.5 text-sm">
            <StatRow label="Total sites" value={ru.totalSites} strong />
            <StatRow
              label="Survey periods"
              value={filterStats.totalSurveyPeriods}
              strong
            />
            <StatRow label="Bicyclist only" value={ru.bikeOnly} indent />
            <StatRow label="Pedestrian only" value={ru.pedOnly} indent />
            <StatRow label="Both bike & ped" value={ru.both} indent />
            {ru.neither > 0 && (
              <StatRow label="Neither / unknown" value={ru.neither} indent />
            )}
            {filterStats.truncated && (
              <p className="pt-1 text-[11px] text-amber-600">
                Stats use the first {filterStats.periodCount.toLocaleString()}{" "}
                matching survey periods.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setChartModalOpen(true)}
          className="mt-4 w-full rounded border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
        >
          Explore availability charts…
        </button>
        <p className="mt-1.5 text-[11px] text-gray-400">
          Geography, years, months, road users, day types, and AADT levels.
        </p>
      </div>

      <div className="border-b border-gray-100 px-4 py-4">
        <h3 className="text-base font-medium text-gray-800">Site Analysis</h3>
        <p className="mt-1 text-xs text-gray-500">
          Choose a site from the list or click it on the map.
        </p>
        <select
          id="count-survey-site-select"
          className="mt-3 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800"
          value={selectedSiteId || ""}
          onChange={(e) => {
            const id = e.target.value || null;
            const site = sortedSites.find((s) => String(s.id) === id);
            onSelectSite(id, site?.name || null);
          }}
        >
          <option value="">Select a survey site…</option>
          {sortedSites.map((site) => (
            <option key={site.id} value={String(site.id)}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedSiteId && (
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          No site selected.
        </p>
      )}

      {selectedSiteId && loading && (
        <p className="px-4 py-6 text-center text-sm text-gray-500">
          Loading site analysis…
        </p>
      )}

      {selectedSiteId && error && (
        <p className="px-4 py-4 text-sm text-red-600">{error}</p>
      )}

      {selectedSiteId && !loading && !error && (
        <>
          <div className="border-b border-gray-100 px-4 py-3">
            <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="rounded bg-gray-50 px-2 py-1.5">
                <div className="text-gray-400">Chart points</div>
                <div className="font-semibold text-gray-800">
                  {summary.pointCount.toLocaleString()}
                </div>
              </div>
              <div className="rounded bg-gray-50 px-2 py-1.5">
                <div className="text-gray-400">Total (sum of buckets)</div>
                <div className="font-semibold text-gray-800">
                  {Math.round(summary.totalCounts).toLocaleString()}
                </div>
              </div>
              <div className="col-span-2 rounded bg-gray-50 px-2 py-1.5">
                <div className="text-gray-400">Aggregation</div>
                <div className="font-semibold text-gray-800">
                  {bucketLabel(seriesPayload) || "—"}
                </div>
              </div>
              <div className="col-span-2 rounded bg-gray-50 px-2 py-1.5">
                <div className="text-gray-400">Chart time span</div>
                <div className="font-semibold text-gray-800">
                  {summary.minT && summary.maxT
                    ? `${new Date(summary.minT).toLocaleString()} – ${new Date(
                        summary.maxT
                      ).toLocaleString()}`
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 px-4 py-3">
            <h4 className="mb-2 text-sm font-semibold text-gray-800">AADT table</h4>
            {periods.length === 0 ? (
              <p className="text-xs text-gray-500">No AADT rows for this site.</p>
            ) : (
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white text-gray-500">
                    <tr>
                      <th className="py-1 pr-2">Year</th>
                      <th className="py-1 pr-2">Mode</th>
                      <th className="py-1 pr-2">AADT</th>
                      <th className="py-1">Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((row, idx) => (
                      <tr
                        key={`${row.year}-${row.count_type}-${idx}`}
                        className="border-t border-gray-100"
                      >
                        <td className="py-1 pr-2">{row.year ?? "—"}</td>
                        <td className="py-1 pr-2">{row.count_type || "—"}</td>
                        <td className="py-1 pr-2">
                          {row.all_aadt != null ? Math.round(row.all_aadt) : "—"}
                        </td>
                        <td className="py-1 text-gray-500">
                          {row.start_date && row.end_date
                            ? `${new Date(row.start_date).toLocaleDateString()} – ${new Date(
                                row.end_date
                              ).toLocaleDateString()}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-gray-800">
                Count timeseries
              </h4>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                style={{ backgroundColor: "#ffffff", color: "#374151" }}
              >
                Pop out
              </button>
            </div>
            <p className="mb-2 text-xs text-gray-500">
              Showing flow=&quot;all&quot; only, summed over the latest AADT survey
              window (hourly for 1-day surveys; recent daily points for longer
              surveys).
            </p>
            {lines.length === 0 ? (
              <p className="text-xs text-gray-500">
                No all-direction counts for this site in the latest AADT window.
              </p>
            ) : (
              <ReactECharts
                option={chartOption}
                style={{ height: 260, width: "100%" }}
                notMerge
              />
            )}
          </div>
        </>
      )}

      {selectedSiteId && (
        <CountSurveyTimeseriesModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          siteId={selectedSiteId}
          siteName={title || selectedSiteName || `Site ${selectedSiteId}`}
          siteLatitude={selectedSite?.lat ?? null}
          siteLongitude={selectedSite?.lon ?? null}
          filters={filters}
          periods={periods}
          initialBucketLabel={bucketLabel(seriesPayload)}
        />
      )}

      <CountSurveyChartModal
        open={chartModalOpen}
        onClose={() => setChartModalOpen(false)}
        datasetTitle={datasetTitle}
        filters={countSurveyFilters}
        onFiltersChange={onCountSurveyFiltersChange ?? (() => undefined)}
        availableYears={availableYears}
        siteCount={siteCount}
        filtersLoading={countFiltersLoading}
        filtersError={countFiltersError}
        filterStats={filterStats}
        filterStatsLoading={filterStatsLoading}
        jurisdictionStatsLoading={jurisdictionStatsLoading}
        onLoadJurisdictionBreakdown={
          onLoadJurisdictionBreakdown ?? (async () => undefined)
        }
      />
    </div>
  );
}

function StatRow({
  label,
  value,
  indent,
  strong,
}: {
  label: string;
  value: number;
  indent?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-2 ${indent ? "pl-3 text-gray-600" : ""}`}
    >
      <span>{label}</span>
      <span className={strong ? "font-semibold text-gray-900" : ""}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
