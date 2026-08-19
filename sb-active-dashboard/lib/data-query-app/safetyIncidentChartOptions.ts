import {
  crossTabKey,
  FilteredIncidentStats,
  NamedCount,
  RoadUserSummary,
  StackedChartData,
} from "@/lib/data-query-app/safetyIncidentStats";
import { chartColorForLabel } from "@/lib/data-query-app/safetyIncidentColors";
import { SAFETY_SEVERITY_LEGEND } from "@/lib/data-query-app/safetyIncidentVisualization";

export type SafetyIncidentChartMode = "single" | "stacked";

export type SafetyIncidentChartDimension =
  | "severity"
  | "dataSource"
  | "conflictType"
  | "year"
  | "month"
  | "timeOfDay"
  | "weekday"
  | "age"
  | "gender"
  | "jurisdiction"
  | "roadUser";

export const SAFETY_CHART_DIMENSIONS: Array<{
  id: SafetyIncidentChartDimension;
  label: string;
  description: string;
}> = [
  {
    id: "severity",
    label: "Severity",
    description: "Injury severity categories",
  },
  {
    id: "dataSource",
    label: "Data source",
    description: "Police reports vs self-reports",
  },
  {
    id: "conflictType",
    label: "Conflict type",
    description: "Bike/ped conflict categories",
  },
  { id: "year", label: "Year", description: "Incidents by calendar year" },
  { id: "month", label: "Month", description: "Seasonal pattern" },
  {
    id: "timeOfDay",
    label: "Time of day",
    description: "Morning, afternoon, evening, night",
  },
  { id: "weekday", label: "Weekday", description: "Day-of-week pattern" },
  {
    id: "roadUser",
    label: "Road user",
    description: "Bicyclist, pedestrian, or both",
  },
  {
    id: "age",
    label: "Age (parties)",
    description: "Age buckets from party records",
  },
  {
    id: "gender",
    label: "Gender (parties)",
    description: "Gender from party records",
  },
  {
    id: "jurisdiction",
    label: "Geography",
    description: "Counts by city or service area",
  },
];

/** Dimensions that cannot be used as stack/group axes in stacked mode */
const NON_STACKABLE: SafetyIncidentChartDimension[] = ["jurisdiction"];

export function stackableSecondaryOptions(
  primary: SafetyIncidentChartDimension
): SafetyIncidentChartDimension[] {
  if (NON_STACKABLE.includes(primary)) return [];
  if (primary === "age") return ["gender"];
  if (primary === "gender") return ["age"];

  const options: SafetyIncidentChartDimension[] = [];
  const candidates: SafetyIncidentChartDimension[] = [
    "roadUser",
    "severity",
    "age",
    "gender",
    "dataSource",
    "conflictType",
    "year",
    "month",
    "timeOfDay",
    "weekday",
  ];
  for (const c of candidates) {
    if (c !== primary) options.push(c);
  }
  return options;
}

export function defaultStackSecondary(
  primary: SafetyIncidentChartDimension
): SafetyIncidentChartDimension {
  const options = stackableSecondaryOptions(primary);
  if (primary === "roadUser" && options.includes("age")) return "age";
  if (primary === "timeOfDay" || primary === "weekday") {
    if (options.includes("severity")) return "severity";
    if (options.includes("roadUser")) return "roadUser";
  }
  if (options.includes("severity")) return "severity";
  return options[0] ?? "age";
}

export function stackedChartData(
  stats: FilteredIncidentStats,
  primary: SafetyIncidentChartDimension,
  secondary: SafetyIncidentChartDimension
): StackedChartData | null {
  return stats.crossTabs[crossTabKey(primary, secondary)] ?? null;
}

function roadUserRows(summary: RoadUserSummary): NamedCount[] {
  return [
    { label: "Bicyclist only", count: summary.bicyclist },
    { label: "Pedestrian only", count: summary.pedestrian },
    { label: "Both", count: summary.both },
    { label: "Neither / unknown", count: summary.neither },
  ];
}

export function chartRowsForDimension(
  stats: FilteredIncidentStats,
  dimension: SafetyIncidentChartDimension
): NamedCount[] {
  switch (dimension) {
    case "severity":
      return stats.bySeverity;
    case "dataSource":
      return stats.byDataSource;
    case "conflictType":
      return stats.byConflictType;
    case "year":
      return stats.byYear;
    case "month":
      return stats.byMonth;
    case "timeOfDay":
      return stats.byTimeOfDay;
    case "weekday":
      return stats.byWeekday;
    case "age":
      return stats.byAge;
    case "gender":
      return stats.byGender;
    case "jurisdiction":
      return stats.byJurisdiction;
    case "roadUser":
      return roadUserRows(stats.roadUser);
    default:
      return [];
  }
}

export function chartColorsForDimension(
  dimension: SafetyIncidentChartDimension,
  labels?: string[]
): string[] {
  if (labels && labels.length > 0) {
    return labels.map((label, i) => chartColorForLabel(dimension, label, i));
  }
  if (dimension === "severity") {
    return SAFETY_SEVERITY_LEGEND.map((s) => s.color);
  }
  return [];
}

export function barChartOption(
  rows: NamedCount[],
  options?: {
    dimension?: SafetyIncidentChartDimension;
    colors?: string[];
  }
): Record<string, unknown> {
  const active = rows.filter((r) => r.count > 0);
  const display = active.length > 0 ? active : rows;
  const dimension = options?.dimension;

  return {
    grid: {
      left: 12,
      right: 24,
      top: 24,
      bottom: display.length > 8 ? 72 : 48,
      containLabel: true,
    },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: display.map((r) => r.label),
      axisLabel: {
        color: "#6b7280",
        fontSize: 11,
        rotate: display.length > 6 ? 35 : 0,
        interval: 0,
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: "#9ca3af", fontSize: 11 },
      splitLine: { lineStyle: { color: "#f3f4f6" } },
    },
    series: [
      {
        type: "bar",
        data: display.map((r, i) => {
          const color = dimension
            ? chartColorForLabel(dimension, r.label, i)
            : options?.colors?.[i] ?? options?.colors?.[0] ?? "#3b82f6";
          return {
            value: r.count,
            itemStyle: { color },
          };
        }),
        barMaxWidth: 40,
      },
    ],
  };
}

export function stackedBarChartOption(
  data: StackedChartData,
  stackDimension: SafetyIncidentChartDimension
): Record<string, unknown> {
  const categories = data.categories;
  const activeSeries = data.series.filter((s) => s.data.some((v) => v > 0));

  return {
    grid: {
      left: 12,
      right: 24,
      top: 36,
      bottom: categories.length > 6 ? 72 : 48,
      containLabel: true,
    },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      type: "scroll",
      top: 0,
      textStyle: { fontSize: 11, color: "#4b5563" },
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        color: "#6b7280",
        fontSize: 11,
        rotate: categories.length > 5 ? 30 : 0,
        interval: 0,
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: "#9ca3af", fontSize: 11 },
      splitLine: { lineStyle: { color: "#f3f4f6" } },
    },
    series: activeSeries.map((seg, i) => ({
      name: seg.name,
      type: "bar",
      stack: "total",
      emphasis: { focus: "series" },
      barMaxWidth: 40,
      itemStyle: {
        color: chartColorForLabel(stackDimension, seg.name, i),
      },
      data: seg.data,
    })),
  };
}

export function dimensionLabel(id: SafetyIncidentChartDimension): string {
  return SAFETY_CHART_DIMENSIONS.find((d) => d.id === id)?.label ?? id;
}

export type ChartExportTable =
  | {
      kind: "single";
      categoryLabel: string;
      countLabel: string;
      rows: Array<{ category: string; count: number }>;
    }
  | {
      kind: "stacked";
      categoryLabel: string;
      seriesLabels: string[];
      rows: Array<{ category: string; values: number[]; total: number }>;
    };

/** Tabular breakdown matching the data rendered in the chart. */
export function buildChartExportTable(
  stats: FilteredIncidentStats,
  chartMode: SafetyIncidentChartMode,
  dimension: SafetyIncidentChartDimension,
  stackDimension: SafetyIncidentChartDimension
): ChartExportTable {
  if (chartMode === "stacked") {
    const stacked = stackedChartData(stats, dimension, stackDimension);
    if (!stacked) {
      return {
        kind: "single",
        categoryLabel: dimensionLabel(dimension),
        countLabel: "Count",
        rows: [],
      };
    }

    const activeSeries = stacked.series.filter((s) =>
      s.data.some((v) => v > 0)
    );
    const series = activeSeries.length > 0 ? activeSeries : stacked.series;

    return {
      kind: "stacked",
      categoryLabel: dimensionLabel(dimension),
      seriesLabels: series.map((s) => s.name),
      rows: stacked.categories.map((category, index) => {
        const values = series.map((s) => s.data[index] ?? 0);
        return {
          category,
          values,
          total: values.reduce((sum, v) => sum + v, 0),
        };
      }),
    };
  }

  const rows = chartRowsForDimension(stats, dimension);
  const active = rows.filter((r) => r.count > 0);
  const display = active.length > 0 ? active : rows;

  return {
    kind: "single",
    categoryLabel: dimensionLabel(dimension),
    countLabel: "Count",
    rows: display.map((r) => ({ category: r.label, count: r.count })),
  };
}
