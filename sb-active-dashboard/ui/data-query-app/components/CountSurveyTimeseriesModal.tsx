import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  fetchVolumeSiteSeries,
  VolumeSiteAadtPeriod,
} from "@/lib/data-services/VolumeSitesApiService";
import {
  buildCountSurveyTimeseriesTable,
  bucketLabelForExport,
  buildCountSurveyTimeseriesCsvRows,
  exportCountSurveyTimeseriesCsv,
  TIMESERIES_CSV_MAX_ROWS,
  TIMESERIES_PDF_MAX_ROWS,
  timeseriesCsvExportPrompt,
  timeseriesPdfExportPrompt,
} from "@/lib/data-query-app/countSurveyTimeseriesExport";
import { exportCountSurveyTimeseriesPdf } from "@/lib/data-query-app/exportCountSurveyTimeseriesPdf";
import { getEchartsPngDataUrl } from "@/lib/data-query-app/echartsExportImage";
import { buildCountSurveyTimeseriesChartOption } from "@/lib/volume-app/countSurveyTimeseriesChart";
import { COUNT_SURVEY_TIMEZONE } from "@/lib/volume-app/countSurveyTimestamps";
import {
  SeriesBucket,
  VolumeSiteQueryFilters,
  VolumeSeriesLine,
  VolumeSiteSeriesResponse,
} from "@/lib/volume-app/siteTemporalQuery";

interface SurveyWindow {
  key: string;
  start: string;
  end: string;
  year: number | null;
  modes: string[];
  coverageDays: number;
}

interface CountSurveyTimeseriesModalProps {
  open: boolean;
  onClose: () => void;
  siteId: string;
  siteName: string;
  siteLatitude?: number | null;
  siteLongitude?: number | null;
  filters: VolumeSiteQueryFilters;
  periods: VolumeSiteAadtPeriod[];
  initialBucketLabel?: string | null;
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function uniqueSurveyWindows(periods: VolumeSiteAadtPeriod[]): SurveyWindow[] {
  const map = new Map<string, SurveyWindow>();

  for (const period of periods) {
    if (!period.start_date || !period.end_date) continue;
    const start = toInputDate(new Date(period.start_date));
    const end = toInputDate(new Date(period.end_date));
    const key = `${start}|${end}`;
    const existing = map.get(key);
    if (existing) {
      if (period.count_type && !existing.modes.includes(period.count_type)) {
        existing.modes.push(period.count_type);
      }
      if (period.year != null && (existing.year == null || period.year > existing.year)) {
        existing.year = period.year;
      }
    } else {
      const coverageDays = Math.max(
        1,
        Math.round(
          (new Date(period.end_date).getTime() -
            new Date(period.start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      );
      map.set(key, {
        key,
        start,
        end,
        year: period.year,
        modes: period.count_type ? [period.count_type] : [],
        coverageDays,
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.end !== b.end) return b.end.localeCompare(a.end);
    return b.start.localeCompare(a.start);
  });
}

function formatModeList(modes: string[]): string {
  if (modes.length === 0) return "";
  return modes
    .map((m) => (m === "bike" ? "bike" : m === "ped" ? "ped" : m))
    .join(", ");
}

const BUCKET_LABELS: Record<SeriesBucket, string> = {
  "15min": "15 min",
  hour: "Hourly",
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

function yAxisNameForBucket(bucket: SeriesBucket | null | undefined): string {
  switch (bucket) {
    case "15min":
      return "Counts / 15 min";
    case "hour":
      return "Counts / hour";
    case "day":
      return "Counts / day";
    case "week":
      return "Counts / week";
    case "month":
      return "Counts / month";
    default:
      return "Counts";
  }
}

/**
 * Pop-out timeseries explorer: custom date range + road-user filters.
 * Defaults to the most recent AADT survey window; period chips prefill the range.
 */
export default function CountSurveyTimeseriesModal({
  open,
  onClose,
  siteId,
  siteName,
  siteLatitude = null,
  siteLongitude = null,
  filters,
  periods,
  initialBucketLabel,
}: CountSurveyTimeseriesModalProps) {
  const chartRef = useRef<ReactECharts>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const surveyWindows = useMemo(() => uniqueSurveyWindows(periods), [periods]);
  const latestWindow = surveyWindows[0] || null;

  const [showBike, setShowBike] = useState(filters.showBicyclist);
  const [showPed, setShowPed] = useState(filters.showPedestrian);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rangeReady, setRangeReady] = useState(false);
  /** User-chosen bucket; null means let the API pick a sensible default. */
  const [userBucket, setUserBucket] = useState<SeriesBucket | null>(null);
  const [availableBuckets, setAvailableBuckets] = useState<SeriesBucket[]>([]);
  const [activeBucket, setActiveBucket] = useState<SeriesBucket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<VolumeSiteSeriesResponse | null>(null);

  // When the modal opens, seed start/end from the latest AADT period
  useEffect(() => {
    if (!open) {
      setRangeReady(false);
      return;
    }

    setShowBike(filters.showBicyclist);
    setShowPed(filters.showPedestrian);
    setUserBucket(null);

    if (latestWindow) {
      setStartDate(latestWindow.start);
      setEndDate(latestWindow.end);
    } else {
      setStartDate(toInputDate(filters.dateRange?.startDate || new Date(2020, 0, 1)));
      setEndDate(toInputDate(filters.dateRange?.endDate || new Date()));
    }
    setRangeReady(true);
  }, [open, siteId, latestWindow, filters]);

  useEffect(() => {
    if (!open || !rangeReady || !startDate || !endDate) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const countTypes: string[] = [];
    if (showBike) countTypes.push("bike");
    if (showPed) countTypes.push("ped");

    fetchVolumeSiteSeries(Number(siteId), filters, {
      agg: "sum",
      byFlow: false,
      countTypes,
      start: new Date(`${startDate}T00:00:00`),
      end: new Date(`${endDate}T00:00:00`),
      window: null,
      bucket: userBucket,
    })
      .then((res) => {
        if (cancelled) return;
        setPayload(res);
        const available = (res.available_buckets || []).filter(Boolean) as SeriesBucket[];
        setAvailableBuckets(available);
        setActiveBucket((res.bucket as SeriesBucket) || null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setPayload(null);
        setAvailableBuckets([]);
        setActiveBucket(null);
        setError(err.message || "Failed to load timeseries");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    rangeReady,
    siteId,
    filters,
    showBike,
    showPed,
    startDate,
    endDate,
    userBucket,
  ]);

  const activeWindowKey = `${startDate}|${endDate}`;

  const applyWindow = (window: SurveyWindow) => {
    setUserBucket(null);
    setStartDate(window.start);
    setEndDate(window.end);
  };

  const selectedBucket = userBucket || activeBucket;

  const lines: VolumeSeriesLine[] = useMemo(() => {
    const series = payload?.series || [];
    return series.filter((line) => !line.flow || line.flow === "all");
  }, [payload]);

  const chartOption = useMemo(
    () =>
      buildCountSurveyTimeseriesChartOption({
        lines,
        bucket: selectedBucket,
        yAxisName: yAxisNameForBucket(selectedBucket),
      }),
    [lines, selectedBucket]
  );

  const exportTable = useMemo(
    () => buildCountSurveyTimeseriesTable(lines),
    [lines]
  );

  const csvPreview = useMemo(
    () =>
      buildCountSurveyTimeseriesCsvRows(
        {
          siteId,
          siteName,
          latitude: siteLatitude,
          longitude: siteLongitude,
        },
        lines,
        {
          bucket: selectedBucket,
          startDate,
          endDate,
        }
      ),
    [
      siteId,
      siteName,
      siteLatitude,
      siteLongitude,
      lines,
      selectedBucket,
      startDate,
      endDate,
    ]
  );

  const canExport = !loading && !error && lines.length > 0;
  const siteInfo = {
    siteId,
    siteName,
    latitude: siteLatitude,
    longitude: siteLongitude,
  };

  const handleExportPdf = async () => {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance || !canExport || exportingPdf || exportingCsv) return;

    const prompt = timeseriesPdfExportPrompt(exportTable);
    if (!window.confirm(prompt)) return;

    setExportingPdf(true);
    try {
      const dataUrl = await getEchartsPngDataUrl(instance, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const roadUsers: string[] = [];
      if (showBike) roadUsers.push("Bicyclist");
      if (showPed) roadUsers.push("Pedestrian");

      const bucketText = bucketLabelForExport(selectedBucket);
      await exportCountSurveyTimeseriesPdf({
        chartDataUrl: dataUrl,
        title: `Count timeseries · ${siteName}`,
        subtitle: `${bucketText} SUM totals (flow = all) for the selected date range. Times shown in ${COUNT_SURVEY_TIMEZONE}.`,
        contextLines: [
          `Site ID: ${siteId}`,
          siteLatitude != null && siteLongitude != null
            ? `Coordinates: ${siteLatitude}, ${siteLongitude}`
            : "Coordinates: unavailable",
          `Date range: ${startDate} to ${endDate}`,
          `Road users: ${roadUsers.length > 0 ? roadUsers.join(", ") : "None selected"}`,
          `Aggregation: ${bucketText}`,
          `Table limit: up to ${TIMESERIES_PDF_MAX_ROWS.toLocaleString()} time buckets per PDF export.`,
        ],
        dataTable: exportTable,
      });
    } catch (err) {
      console.error("Failed to export timeseries PDF:", err);
      window.alert(
        err instanceof Error ? err.message : "Failed to export timeseries PDF."
      );
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    if (!canExport || exportingPdf || exportingCsv) return;

    const prompt = timeseriesCsvExportPrompt({
      totalPoints: csvPreview.totalPoints,
      truncated: csvPreview.truncated,
      maxRows: csvPreview.maxRows,
    });
    if (!window.confirm(prompt)) return;

    setExportingCsv(true);
    try {
      exportCountSurveyTimeseriesCsv(siteInfo, lines, {
        bucket: selectedBucket,
        startDate,
        endDate,
      });
    } catch (err) {
      console.error("Failed to export timeseries CSV:", err);
      window.alert(
        err instanceof Error ? err.message : "Failed to export timeseries CSV."
      );
    } finally {
      setExportingCsv(false);
    }
  };

  if (!open) return null;

  return (
    <div
      id="count-survey-timeseries-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="count-survey-timeseries-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
        style={{ colorScheme: "light", backgroundColor: "#ffffff", color: "#111827" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2
              id="count-survey-timeseries-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              Count timeseries · {siteName}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              SUM aggregation of flow=&quot;all&quot; counts.
              {selectedBucket
                ? ` Showing ${BUCKET_LABELS[selectedBucket].toLowerCase()} totals.`
                : ""}{" "}
              Times in Pacific Time. Lines break across gaps with no counts
              (e.g. between morning and afternoon).
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={!canExport || exportingPdf || exportingCsv}
              title={
                canExport
                  ? `CSV includes site info and up to ${TIMESERIES_CSV_MAX_ROWS.toLocaleString()} count rows`
                  : "Load chart data to export"
              }
              className="rounded border border-gray-200 px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: "#ffffff", color: "#4b5563" }}
            >
              {exportingCsv ? "Exporting…" : "Export CSV"}
            </button>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={!canExport || exportingPdf || exportingCsv}
              title={
                canExport
                  ? `PDF includes chart and up to ${TIMESERIES_PDF_MAX_ROWS.toLocaleString()} table rows`
                  : "Load chart data to export"
              }
              className="rounded border border-gray-200 px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: "#ffffff", color: "#4b5563" }}
            >
              {exportingPdf ? "Exporting…" : "Export PDF"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-200 px-2 py-1 text-sm text-gray-600"
              style={{ backgroundColor: "#ffffff", color: "#4b5563" }}
            >
              Close
            </button>
          </div>
        </div>

        {canExport && (
          <p className="border-b border-gray-100 px-5 py-2 text-xs text-gray-500">
            CSV export includes site name, coordinates, and count rows (max{" "}
            {TIMESERIES_CSV_MAX_ROWS.toLocaleString()}
            {csvPreview.truncated
              ? `; this chart has ${csvPreview.totalPoints.toLocaleString()} rows and will be truncated`
              : ""}
            ). PDF export includes the chart and table (max{" "}
            {TIMESERIES_PDF_MAX_ROWS.toLocaleString()} buckets
            {exportTable.truncated
              ? `; ${exportTable.totalPoints.toLocaleString()} buckets in range`
              : ""}
            ). Confirm before downloading.
          </p>
        )}

        {surveyWindows.length > 0 && (
          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Survey periods
            </h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Click a period to load that date range.
            </p>
            <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {surveyWindows.map((window) => {
                const selected = window.key === activeWindowKey;
                const modeLabel = formatModeList(window.modes);
                return (
                  <button
                    key={window.key}
                    type="button"
                    onClick={() => applyWindow(window)}
                    className={`rounded border px-2.5 py-1.5 text-left text-xs ${
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-800"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                    style={{
                      backgroundColor: selected ? "#eff6ff" : "#ffffff",
                      color: selected ? "#1e40af" : "#374151",
                    }}
                    title="Load this survey period"
                  >
                    <span className="font-medium">
                      {window.year != null ? `${window.year} · ` : ""}
                      {new Date(`${window.start}T00:00:00`).toLocaleDateString()}
                      {" – "}
                      {new Date(`${window.end}T00:00:00`).toLocaleDateString()}
                    </span>
                    <span className="mt-0.5 block text-[10px] opacity-80">
                      {window.coverageDays} day
                      {window.coverageDays === 1 ? "" : "s"}
                      {modeLabel ? ` · ${modeLabel}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 border-b border-gray-100 px-5 py-3">
          <label className="text-xs font-medium text-gray-600">
            Start
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setUserBucket(null);
                setStartDate(e.target.value);
              }}
              className="mt-1 block rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
              style={{
                backgroundColor: "#ffffff",
                color: "#1f2937",
                colorScheme: "light",
              }}
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            End
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setUserBucket(null);
                setEndDate(e.target.value);
              }}
              className="mt-1 block rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
              style={{
                backgroundColor: "#ffffff",
                color: "#1f2937",
                colorScheme: "light",
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showBike}
              onChange={(e) => setShowBike(e.target.checked)}
            />
            Bicyclist
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showPed}
              onChange={(e) => setShowPed(e.target.checked)}
            />
            Pedestrian
          </label>
          <p className="text-xs text-gray-400">
            Direction filters coming later.
          </p>
        </div>

        {availableBuckets.length > 0 && (
          <div className="border-b border-gray-100 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Aggregation
            </h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Options depend on the actual count interval and coverage in this
              date range.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {availableBuckets.map((bucket) => {
                const selected = selectedBucket === bucket;
                return (
                  <button
                    key={bucket}
                    type="button"
                    onClick={() => setUserBucket(bucket)}
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
                    {BUCKET_LABELS[bucket]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {loading && (
            <p className="py-10 text-center text-sm text-gray-500">Loading…</p>
          )}
          {!loading && error && (
            <p className="py-6 text-center text-sm text-red-600">{error}</p>
          )}
          {!loading && !error && lines.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-500">
              No counts in this range.
            </p>
          )}
          {!loading && !error && lines.length > 0 && (
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
  );
}
