import {
  FilteredCountSurveyStats,
  NamedCount,
} from "@/lib/data-query-app/countSurveyStats";
import {
  crossTabKey,
  StackedChartData,
} from "@/lib/data-query-app/safetyIncidentStats";

export type CountSurveyChartMode = "single" | "stacked";

export type CountSurveyChartDimension =
  | "jurisdiction"
  | "year"
  | "month"
  | "roadUser"
  | "dayType"
  | "source"
  | "aadtBike"
  | "aadtPed";

const STACKABLE: CountSurveyChartDimension[] = [
  "jurisdiction",
  "year",
  "month",
  "roadUser",
  "dayType",
  "source",
];

const STACK_PALETTE = [
  "#2563eb",
  "#ea580c",
  "#059669",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#ca8a04",
  "#db2777",
];

function chartColorForStackLabel(_dimension: string, _label: string, index: number): string {
  return STACK_PALETTE[index % STACK_PALETTE.length];
}

export function stackableSecondaryOptions(
  primary: CountSurveyChartDimension
): CountSurveyChartDimension[] {
  if (primary === "aadtBike" || primary === "aadtPed") return [];
  return STACKABLE.filter((dimension) => dimension !== primary);
}

export function defaultStackSecondary(
  primary: CountSurveyChartDimension
): CountSurveyChartDimension {
  if (primary === "jurisdiction") return "year";
  if (primary === "year") return "roadUser";
  const options = stackableSecondaryOptions(primary);
  if (options.includes("year")) return "year";
  return options[0] ?? "year";
}

export function stackedChartData(
  stats: FilteredCountSurveyStats,
  primary: CountSurveyChartDimension,
  secondary: CountSurveyChartDimension
): StackedChartData | null {
  return stats.crossTabs[crossTabKey(primary, secondary)] ?? null;
}

export const COUNT_SURVEY_CHART_DIMENSIONS: Array<{
  id: CountSurveyChartDimension;
  label: string;
  description: string;
}> = [
  {
    id: "jurisdiction",
    label: "Geography",
    description: "Count sites by city or service area",
  },
  {
    id: "year",
    label: "Year",
    description: "Survey periods by AADT year",
  },
  {
    id: "month",
    label: "Month",
    description: "When surveys started (calendar month)",
  },
  {
    id: "roadUser",
    label: "Road user",
    description: "Sites with bike, ped, or both modes",
  },
  {
    id: "dayType",
    label: "Day type",
    description: "Weekday / weekend AADT availability",
  },
  {
    id: "source",
    label: "Data source",
    description: "Count program or source",
  },
  {
    id: "aadtBike",
    label: "Bike AADT",
    description: "Sites by bicyclist AADT level",
  },
  {
    id: "aadtPed",
    label: "Ped AADT",
    description: "Sites by pedestrian AADT level",
  },
];

export function dimensionLabel(id: CountSurveyChartDimension): string {
  return COUNT_SURVEY_CHART_DIMENSIONS.find((d) => d.id === id)?.label ?? id;
}

export function chartRowsForDimension(
  stats: FilteredCountSurveyStats,
  dimension: CountSurveyChartDimension
): NamedCount[] {
  switch (dimension) {
    case "jurisdiction":
      return stats.byJurisdiction;
    case "year":
      return stats.byYear;
    case "month":
      return stats.byMonth;
    case "roadUser":
      return [
        { label: "Bicyclist only", count: stats.roadUser.bikeOnly },
        { label: "Pedestrian only", count: stats.roadUser.pedOnly },
        { label: "Both modes", count: stats.roadUser.both },
        { label: "Neither / unknown", count: stats.roadUser.neither },
      ];
    case "dayType":
      return stats.byDayType;
    case "source":
      return stats.bySource;
    case "aadtBike":
      return stats.aadtThresholdsBike;
    case "aadtPed":
      return stats.aadtThresholdsPed;
    default:
      return [];
  }
}

export function barChartOption(
  rows: NamedCount[],
  options?: { title?: string }
): Record<string, unknown> {
  const active = rows.filter((r) => r.count > 0);
  const display = active.length > 0 ? active : rows;

  return {
    grid: {
      left: 12,
      right: 24,
      top: options?.title ? 36 : 24,
      bottom: display.length > 8 ? 72 : 48,
      containLabel: true,
    },
    title: options?.title
      ? {
          text: options.title,
          left: "center",
          textStyle: { fontSize: 12, color: "#374151", fontWeight: 500 },
        }
      : undefined,
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
        data: display.map((r) => ({
          value: r.count,
          itemStyle: { color: "#2563eb" },
        })),
        barMaxWidth: 40,
      },
    ],
  };
}

export function stackedBarChartOption(
  data: StackedChartData,
  stackDimension: CountSurveyChartDimension
): Record<string, unknown> {
  const categories = data.categories;
  const activeSeries = data.series.filter((series) => series.data.some((value) => value > 0));

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
    series: activeSeries.map((segment, index) => ({
      name: segment.name,
      type: "bar",
      stack: "total",
      emphasis: { focus: "series" },
      barMaxWidth: 40,
      itemStyle: {
        color: chartColorForStackLabel(stackDimension, segment.name, index),
      },
      data: segment.data,
    })),
  };
}
