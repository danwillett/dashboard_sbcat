import {
  formatCountSurveyTimestampMs,
  parseCountSurveyTimestamp,
} from "./countSurveyTimestamps";
import {
  SeriesBucket,
  VolumeSeriesLine,
  VolumeSeriesPoint,
} from "@/lib/volume-app/siteTemporalQuery";

const SERIES_COLORS = ["#2563eb", "#ea580c", "#0ea5e9", "#7c3aed"];

export function bucketDurationMs(bucket: SeriesBucket | null | undefined): number {
  switch (bucket) {
    case "15min":
      return 15 * 60 * 1000;
    case "hour":
      return 60 * 60 * 1000;
    case "day":
      return 24 * 60 * 60 * 1000;
    case "week":
      return 7 * 24 * 60 * 60 * 1000;
    case "month":
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}

export function seriesDisplayName(line: VolumeSeriesLine): string {
  if (line.count_type === "bike") return "Bicyclist";
  if (line.count_type === "ped") return "Pedestrian";
  return line.count_type || "Counts";
}

/**
 * Build ECharts line data that breaks across gaps larger than one bucket.
 * Missing hours/days (e.g. between morning and afternoon counts) no longer connect.
 */
export function buildGapAwareSeriesData(
  points: VolumeSeriesPoint[],
  bucket: SeriesBucket | null | undefined
): Array<[number, number | null]> {
  const maxGap = bucketDurationMs(bucket) * 1.5;
  const sorted = points
    .filter((point) => point.t)
    .map((point) => ({
      t: parseCountSurveyTimestamp(point.t as string),
      c: point.c,
    }))
    .filter((point) => !Number.isNaN(point.t))
    .sort((a, b) => a.t - b.t);

  const data: Array<[number, number | null]> = [];
  for (let index = 0; index < sorted.length; index++) {
    const point = sorted[index];
    if (index > 0) {
      const previous = sorted[index - 1];
      if (point.t - previous.t > maxGap) {
        data.push([previous.t + 1, null]);
      }
    }
    data.push([point.t, point.c ?? null]);
  }
  return data;
}

export function buildCountSurveyTimeseriesChartOption(args: {
  lines: VolumeSeriesLine[];
  bucket: SeriesBucket | null | undefined;
  yAxisName: string;
  compact?: boolean;
}): Record<string, unknown> {
  const { lines, bucket, yAxisName, compact = false } = args;

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line" },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params];
        if (items.length === 0) return "";
        const axisMs = Number((items[0] as { axisValue?: number }).axisValue);
        const header = Number.isFinite(axisMs)
          ? formatCountSurveyTimestampMs(axisMs)
          : String((items[0] as { axisValue?: unknown }).axisValue ?? "");
        const lines = items.map((item) => {
          const row = item as {
            seriesName?: string;
            data?: [number, number | null];
            marker?: string;
          };
          const value = row.data?.[1];
          const display =
            value == null || Number.isNaN(Number(value)) ? "—" : String(value);
          return `${row.marker || ""}${row.seriesName || "Series"}: ${display}`;
        });
        return [header, ...lines].join("<br/>");
      },
    },
    legend: {
      type: "scroll",
      bottom: 0,
      textStyle: { fontSize: compact ? 10 : 11 },
    },
    grid: compact
      ? { left: 48, right: 12, top: 12, bottom: 52 }
      : { left: 56, right: 24, top: 24, bottom: 56 },
    dataZoom: compact
      ? undefined
      : [
          { type: "inside", xAxisIndex: 0 },
          { type: "slider", xAxisIndex: 0, height: 18, bottom: 28 },
        ],
    xAxis: {
      type: "time",
      axisLabel: {
        fontSize: compact ? 10 : 11,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      name: yAxisName,
      nameTextStyle: { fontSize: compact ? 10 : 11 },
      axisLabel: { fontSize: compact ? 10 : 11 },
      min: 0,
    },
    series: lines.map((line, index) => {
      const pointCount = line.points.filter((point) => point.t).length;
      return {
        name: seriesDisplayName(line),
        type: "line",
        connectNulls: false,
        showSymbol: pointCount <= 48,
        symbolSize: 6,
        lineStyle: { width: 2 },
        data: buildGapAwareSeriesData(line.points, bucket),
        itemStyle: { color: SERIES_COLORS[index % SERIES_COLORS.length] },
      };
    }),
  };
}
