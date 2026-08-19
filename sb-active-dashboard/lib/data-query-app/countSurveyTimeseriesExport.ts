import {
  SeriesBucket,
  VolumeSeriesLine,
} from "@/lib/volume-app/siteTemporalQuery";
import {
  countSurveyTimestampIsoLocal,
  formatCountSurveyTimestamp,
} from "@/lib/volume-app/countSurveyTimestamps";
import {
  datedExportFilename,
  downloadCsv,
  rowsToCsv,
} from "@/lib/utilities/shared/csvExport";
import { seriesDisplayName } from "@/lib/volume-app/countSurveyTimeseriesChart";

/** Maximum time-bucket rows included in a timeseries PDF table. */
export const TIMESERIES_PDF_MAX_ROWS = 500;

/** Maximum raw count rows in a timeseries CSV export. */
export const TIMESERIES_CSV_MAX_ROWS = 5000;

export interface CountSurveyTimeseriesTable {
  headers: string[];
  rows: string[][];
  totalPoints: number;
  truncated: boolean;
  maxRows: number;
}

export interface CountSurveyTimeseriesSiteInfo {
  siteId: string;
  siteName: string;
  latitude: number | null;
  longitude: number | null;
}

export interface CountSurveyTimeseriesCsvExportResult {
  rowCount: number;
  truncated: boolean;
  filename: string;
}

function seriesLabel(line: VolumeSeriesLine): string {
  return seriesDisplayName(line);
}

function formatTimestamp(value: string): string {
  return formatCountSurveyTimestamp(value);
}

export function buildCountSurveyTimeseriesTable(
  lines: VolumeSeriesLine[],
  maxRows: number = TIMESERIES_PDF_MAX_ROWS
): CountSurveyTimeseriesTable {
  const activeLines = lines.filter((line) => line.points.some((p) => p.t));
  const seriesLabels = activeLines.map(seriesLabel);

  const timestampSet = new Set<string>();
  for (const line of activeLines) {
    for (const point of line.points) {
      if (point.t) timestampSet.add(point.t);
    }
  }

  const timestamps = [...timestampSet].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const valuesByTimestamp = new Map<string, Map<number, number | null>>();
  activeLines.forEach((line, seriesIndex) => {
    for (const point of line.points) {
      if (!point.t) continue;
      if (!valuesByTimestamp.has(point.t)) {
        valuesByTimestamp.set(point.t, new Map());
      }
      valuesByTimestamp.get(point.t)!.set(seriesIndex, point.c);
    }
  });

  const totalPoints = timestamps.length;
  const truncated = totalPoints > maxRows;
  const exportTimestamps = truncated ? timestamps.slice(0, maxRows) : timestamps;

  const headers = ["Timestamp", ...seriesLabels];
  const rows = exportTimestamps.map((timestamp) => {
    const values = valuesByTimestamp.get(timestamp);
    return [
      formatTimestamp(timestamp),
      ...activeLines.map((_, seriesIndex) => {
        const value = values?.get(seriesIndex);
        return value == null ? "" : String(value);
      }),
    ];
  });

  return {
    headers,
    rows,
    totalPoints,
    truncated,
    maxRows,
  };
}

export function bucketLabelForExport(bucket: SeriesBucket | null | undefined): string {
  switch (bucket) {
    case "15min":
      return "15-minute";
    case "hour":
      return "Hourly";
    case "day":
      return "Daily";
    case "week":
      return "Weekly";
    case "month":
      return "Monthly";
    default:
      return "Aggregated";
  }
}

export function timeseriesPdfExportPrompt(table: CountSurveyTimeseriesTable): string {
  if (table.totalPoints === 0) {
    return "No time buckets to export.";
  }
  if (table.truncated) {
    return (
      `Export chart and time series table to PDF?\n\n` +
      `The table will include the first ${table.maxRows.toLocaleString()} of ` +
      `${table.totalPoints.toLocaleString()} time buckets in this range. ` +
      `Raw counts beyond that limit are not included in the PDF.`
    );
  }
  return (
    `Export chart and all ${table.totalPoints.toLocaleString()} time buckets ` +
    `in this range to PDF?`
  );
}

const TIMESERIES_CSV_HEADERS = [
  "site_id",
  "site_name",
  "latitude",
  "longitude",
  "timestamp_local",
  "road_user",
  "count",
  "aggregation_bucket",
  "range_start",
  "range_end",
] as const;

export function buildCountSurveyTimeseriesCsvRows(
  site: CountSurveyTimeseriesSiteInfo,
  lines: VolumeSeriesLine[],
  options: {
    bucket: SeriesBucket | null | undefined;
    startDate: string;
    endDate: string;
    maxRows?: number;
  }
): { rows: string[][]; totalPoints: number; truncated: boolean; maxRows: number } {
  const maxRows = options.maxRows ?? TIMESERIES_CSV_MAX_ROWS;
  const bucketLabel = bucketLabelForExport(options.bucket);
  const flatRows: string[][] = [];

  for (const line of lines) {
    for (const point of line.points) {
      if (!point.t) continue;
      flatRows.push([
        site.siteId,
        site.siteName,
        site.latitude == null ? "" : String(site.latitude),
        site.longitude == null ? "" : String(site.longitude),
        countSurveyTimestampIsoLocal(point.t),
        seriesLabel(line),
        point.c == null ? "" : String(point.c),
        bucketLabel,
        options.startDate,
        options.endDate,
      ]);
    }
  }

  flatRows.sort((a, b) => a[4].localeCompare(b[4]) || a[5].localeCompare(b[5]));

  const totalPoints = flatRows.length;
  const truncated = totalPoints > maxRows;
  const rows = truncated ? flatRows.slice(0, maxRows) : flatRows;

  return { rows, totalPoints, truncated, maxRows };
}

export function timeseriesCsvExportPrompt(args: {
  totalPoints: number;
  truncated: boolean;
  maxRows: number;
}): string {
  if (args.totalPoints === 0) {
    return "No count rows to export.";
  }
  if (args.truncated) {
    return (
      `Export count time series to CSV?\n\n` +
      `The file will include the first ${args.maxRows.toLocaleString()} of ` +
      `${args.totalPoints.toLocaleString()} count rows in this chart. ` +
      `Additional rows are not included.`
    );
  }
  return `Export all ${args.totalPoints.toLocaleString()} count rows in this chart to CSV?`;
}

export function exportCountSurveyTimeseriesCsv(
  site: CountSurveyTimeseriesSiteInfo,
  lines: VolumeSeriesLine[],
  options: {
    bucket: SeriesBucket | null | undefined;
    startDate: string;
    endDate: string;
    maxRows?: number;
  }
): CountSurveyTimeseriesCsvExportResult {
  const built = buildCountSurveyTimeseriesCsvRows(site, lines, options);
  if (built.rows.length === 0) {
    throw new Error("No count rows to export for this chart.");
  }

  const csv = rowsToCsv([...TIMESERIES_CSV_HEADERS], built.rows);
  const filename = datedExportFilename(
    `count-timeseries-site-${site.siteId}`
  );
  downloadCsv(filename, csv);

  return {
    rowCount: built.rows.length,
    truncated: built.truncated,
    filename,
  };
}
