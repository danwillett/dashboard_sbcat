import { BicycleComfortCategoryRow } from "@/lib/data-query-app/bicycleComfortMapStats";

export type BicycleComfortChartMetric = "length" | "segments";

export function bicycleComfortBarChartOption(
  rows: BicycleComfortCategoryRow[],
  metric: BicycleComfortChartMetric,
  title?: string
): Record<string, unknown> {
  const sorted = [...rows].sort((a, b) =>
    metric === "length"
      ? b.percentOfLength - a.percentOfLength
      : b.percentOfSegments - a.percentOfSegments
  );

  const values =
    metric === "length"
      ? sorted.map((row) => Number(row.percentOfLength.toFixed(1)))
      : sorted.map((row) => Number(row.percentOfSegments.toFixed(1)));

  const metricLabel =
    metric === "length" ? "Share of total road length (%)" : "Share of road segments (%)";

  return {
    grid: {
      left: 12,
      right: 24,
      top: title ? 36 : 24,
      bottom: sorted.length > 8 ? 88 : 56,
      containLabel: true,
    },
    title: title
      ? {
          text: title,
          left: "center",
          textStyle: { fontSize: 12, color: "#374151", fontWeight: 500 },
        }
      : undefined,
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown) => {
        const item = (params as Array<{ dataIndex: number }>)[0];
        if (!item) return "";
        const row = sorted[item.dataIndex];
        if (!row) return "";
        return [
          row.category,
          `${metricLabel}: ${values[item.dataIndex]}%`,
          `${row.segmentCount.toLocaleString()} segments`,
          `${(row.lengthMeters / 1000).toFixed(1)} km`,
        ].join("<br/>");
      },
    },
    xAxis: {
      type: "category",
      data: sorted.map((row) => row.category),
      axisLabel: {
        interval: 0,
        rotate: sorted.length > 6 ? 35 : 0,
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      name: metricLabel,
      max: 100,
      axisLabel: { formatter: "{value}%" },
    },
    series: [
      {
        type: "bar",
        data: values,
        itemStyle: { color: "#2563eb" },
        barMaxWidth: 48,
      },
    ],
  };
}
