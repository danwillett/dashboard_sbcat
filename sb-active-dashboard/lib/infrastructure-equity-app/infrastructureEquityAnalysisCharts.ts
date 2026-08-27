import type { EChartsOption } from "echarts";
import {
  countUnitsByMetricBin,
  equityMetricBinIndex,
  EquityBinCount,
  EquityBivariateBreaks,
  EquityUnitValues,
  getBivariateFillColors,
} from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";

export type EquityMetricAxis = "infrastructure" | "context";

export interface EquityMetricDistributionSummary {
  axis: EquityMetricAxis;
  label: string;
  values: number[];
  breaks: number[];
  binCount: EquityBinCount;
  min: number;
  max: number;
  mean: number;
  binCounts: number[];
  valueSpread: number;
}

export interface EquityHistogramBin {
  start: number;
  end: number;
  count: number;
  mid: number;
  rankBin: number;
}

const HISTOGRAM_BIN_COUNT = 12;

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rankColorsForAxis(
  axis: EquityMetricAxis,
  binCount: EquityBinCount
): string[] {
  // Sequential palettes for custom bin charts/map previews.
  // Infrastructure = purple; equity metric (context) = green. Low → high.
  if (axis === "infrastructure") {
    if (binCount === 2) return ["#e9d5ff", "#7e22ce"];
    if (binCount === 4) return ["#f3e8ff", "#d8b4fe", "#9333ea", "#6b21a8"];
    return ["#ede9fe", "#a855f7", "#6b21a8"];
  }

  if (binCount === 2) return ["#bbf7d0", "#15803d"];
  if (binCount === 4) return ["#ecfdf5", "#86efac", "#22c55e", "#166534"];
  return ["#dcfce7", "#4ade80", "#166534"];
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 3 && normalized.length !== 6) return null;
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

/** Dark text on light fills, white text on darker fills. */
export function equityRankBandLabelTextColor(backgroundHex: string): string {
  const rgb = parseHexColor(backgroundHex);
  if (!rgb) return "#111827";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "#111827" : "#ffffff";
}

export function buildEquityHistogramBins(
  values: number[],
  breaks: number[],
  histogramBinCount = HISTOGRAM_BIN_COUNT
): EquityHistogramBin[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  if (span <= 0) {
    return [
      {
        start: min,
        end: max,
        count: values.length,
        mid: min,
        rankBin: equityMetricBinIndex(min, breaks),
      },
    ];
  }

  const width = span / histogramBinCount;
  const bins: EquityHistogramBin[] = Array.from(
    { length: histogramBinCount },
    (_, index) => {
      const start = min + index * width;
      const end =
        index === histogramBinCount - 1 ? max : min + (index + 1) * width;
      const mid = (start + end) / 2;
      return {
        start,
        end,
        count: 0,
        mid,
        rankBin: equityMetricBinIndex(mid, breaks),
      };
    }
  );

  for (const value of values) {
    let index = Math.floor((value - min) / width);
    if (index < 0) index = 0;
    if (index >= histogramBinCount) index = histogramBinCount - 1;
    bins[index].count += 1;
  }

  return bins;
}

export function summarizeEquityMetricDistribution(options: {
  axis: EquityMetricAxis;
  label: string;
  values: number[];
  breaks: number[];
  binCount: EquityBinCount;
}): EquityMetricDistributionSummary {
  const values = options.values.filter((value) => Number.isFinite(value));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  return {
    axis: options.axis,
    label: options.label,
    values,
    breaks: options.breaks,
    binCount: options.binCount,
    min,
    max,
    mean: average(values),
    binCounts: countUnitsByMetricBin(values, options.breaks),
    valueSpread: max - min,
  };
}

export function summarizeEquityAnalysisDistributions(options: {
  units: EquityUnitValues[];
  breaks: EquityBivariateBreaks;
  infrastructureLabel: string;
  contextLabel: string;
}): {
  infrastructure: EquityMetricDistributionSummary;
  context: EquityMetricDistributionSummary;
} {
  return {
    infrastructure: summarizeEquityMetricDistribution({
      axis: "infrastructure",
      label: options.infrastructureLabel,
      values: options.units.map((unit) => unit.infrastructurePercent),
      breaks: options.breaks.infrastructure,
      binCount: options.breaks.binCount,
    }),
    context: summarizeEquityMetricDistribution({
      axis: "context",
      label: options.contextLabel,
      values: options.units.map((unit) => unit.contextValue),
      breaks: options.breaks.context,
      binCount: options.breaks.binCount,
    }),
  };
}

export function formatAxisValue(value: number, isPercent: boolean): string {
  if (!Number.isFinite(value)) return "—";
  if (isPercent) {
    if (Math.abs(value) >= 10 || Number.isInteger(value)) {
      return `${value.toFixed(0)}%`;
    }
    return `${value.toFixed(1)}%`;
  }
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (Math.abs(value) >= 10 || Number.isInteger(value)) {
    return value.toFixed(0);
  }
  return value.toFixed(1);
}

export function looksLikePercentLabel(label: string): boolean {
  return /\(%\)|%/.test(label);
}

export function isEquityMetricPercent(
  summary: Pick<EquityMetricDistributionSummary, "axis" | "label">
): boolean {
  return (
    summary.axis === "infrastructure" || looksLikePercentLabel(summary.label)
  );
}

function rankLabels(binCount: EquityBinCount): string[] {
  if (binCount === 2) return ["Low", "High"];
  if (binCount === 4) return ["Low", "Med-low", "Med-high", "High"];
  return ["Low", "Medium", "High"];
}

export function buildEquityMetricHistogramOption(
  summary: EquityMetricDistributionSummary
): EChartsOption {
  const isPercent = isEquityMetricPercent(summary);
  const bins = buildEquityHistogramBins(summary.values, summary.breaks);
  const colors = rankColorsForAxis(summary.axis, summary.binCount);
  const labels = rankLabels(summary.binCount);
  const categories = bins.map((bin) => {
    if (bin.start === bin.end) return formatAxisValue(bin.start, isPercent);
    return `${formatAxisValue(bin.start, isPercent)}–${formatAxisValue(
      bin.end,
      isPercent
    )}`;
  });

  return {
    animation: false,
    grid: {
      left: 36,
      right: 10,
      top: 12,
      bottom: bins.length > 6 ? 48 : 36,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const items = Array.isArray(params) ? params : [params];
        const item = items[0] as {
          dataIndex?: number;
          name?: string;
        };
        const bin = bins[item.dataIndex ?? 0];
        if (!bin) return "";
        const rankLabel = labels[bin.rankBin] ?? `Bin ${bin.rankBin + 1}`;
        return [
          `<strong>${item.name}</strong>`,
          `Units: ${bin.count}`,
          `Rank band: ${rankLabel}`,
        ].join("<br/>");
      },
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        fontSize: 9,
        color: "#6b7280",
        rotate: bins.length > 6 ? 35 : 0,
        interval: 0,
        hideOverlap: true,
      },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#d1d5db" } },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { fontSize: 10, color: "#6b7280" },
      splitLine: { lineStyle: { color: "#f3f4f6" } },
      name: "Units",
      nameTextStyle: { fontSize: 10, color: "#9ca3af", padding: [0, 0, 0, 8] },
    },
    series: [
      {
        type: "bar",
        data: bins.map((bin) => ({
          value: bin.count,
          itemStyle: {
            color: colors[bin.rankBin] ?? colors[colors.length - 1],
          },
        })),
        barMaxWidth: 18,
      },
    ],
  };
}

export function formatEquityMetricBreakLabel(
  summary: EquityMetricDistributionSummary
): string {
  const isPercent = isEquityMetricPercent(summary);
  const labels = rankLabels(summary.binCount);
  if (summary.breaks.length === 0) return labels.join(" · ");

  const parts: string[] = [];
  for (let i = 0; i < summary.binCount; i += 1) {
    const label = labels[i] ?? `Bin ${i + 1}`;
    if (i === 0) {
      parts.push(`${label} ≤ ${formatAxisValue(summary.breaks[0], isPercent)}`);
    } else if (i === summary.binCount - 1) {
      parts.push(
        `${label} > ${formatAxisValue(
          summary.breaks[summary.breaks.length - 1],
          isPercent
        )}`
      );
    } else {
      parts.push(
        `${label} ≤ ${formatAxisValue(summary.breaks[i], isPercent)}`
      );
    }
  }
  return parts.join(" · ");
}

export function formatEquityMetricRange(
  summary: EquityMetricDistributionSummary
): string {
  const isPercent = isEquityMetricPercent(summary);
  return `${formatAxisValue(summary.min, isPercent)} – ${formatAxisValue(
    summary.max,
    isPercent
  )}`;
}

export function describeEquityValueSpread(
  summary: EquityMetricDistributionSummary
): string {
  const isPercent = isEquityMetricPercent(summary);
  const spread = summary.valueSpread;
  if (summary.values.length === 0) return "No values";
  if (spread <= 0) return "No variation across units";

  if (isPercent) {
    if (spread < 5) {
      return "Narrow spread — High/Low ranks may overstate small differences";
    }
    if (spread < 15) {
      return "Modest spread across units";
    }
    return "Meaningful spread across units";
  }

  const relative =
    Math.abs(summary.mean) > 1e-9
      ? spread / Math.abs(summary.mean)
      : spread / Math.max(Math.abs(summary.max), 1e-9);

  if (relative < 0.1) {
    return "Narrow spread — High/Low ranks may overstate small differences";
  }
  if (relative < 0.3) {
    return "Modest spread across units";
  }
  return "Meaningful spread across units";
}

export function equityRankBandLabels(binCount: EquityBinCount): string[] {
  return rankLabels(binCount);
}

export function equityRankBandColors(
  axis: EquityMetricAxis,
  binCount: EquityBinCount
): string[] {
  return rankColorsForAxis(axis, binCount);
}

export function buildEquityRelationshipScatterOption(options: {
  units: EquityUnitValues[];
  breaks: EquityBivariateBreaks;
  infrastructureLabel: string;
  contextLabel: string;
  contextValueIsPercent?: boolean;
  showBinBreaks?: boolean;
  showTrendLine?: boolean;
}): EChartsOption {
  const contextIsPercent =
    options.contextValueIsPercent ?? looksLikePercentLabel(options.contextLabel);
  const showBinBreaks = options.showBinBreaks === true;
  const showTrendLine = options.showTrendLine === true;
  const colors = getBivariateFillColors(options.breaks.binCount);
  const rankLabelsForBins = rankLabels(options.breaks.binCount);

  const points = options.units
    .filter(
      (unit) =>
        Number.isFinite(unit.infrastructurePercent) &&
        Number.isFinite(unit.contextValue)
    )
    .map((unit) => {
      const infraBin = equityMetricBinIndex(
        unit.infrastructurePercent,
        options.breaks.infrastructure
      );
      const contextBin = equityMetricBinIndex(
        unit.contextValue,
        options.breaks.context
      );
      return {
        value: [unit.infrastructurePercent, unit.contextValue] as [
          number,
          number,
        ],
        name: unit.label?.trim() || undefined,
        objectId: unit.objectId,
        infraBin,
        contextBin,
        itemStyle: {
          color:
            colors[contextBin]?.[infraBin] ??
            colors[colors.length - 1]?.[colors[0]?.length - 1] ??
            "#6b7280",
        },
      };
    });

  const xValues = points.map((point) => point.value[0]);
  const yValues = points.map((point) => point.value[1]);
  const xMin = xValues.length ? Math.min(...xValues) : 0;
  const xMax = xValues.length ? Math.max(...xValues) : 1;
  const yMin = yValues.length ? Math.min(...yValues) : 0;
  const yMax = yValues.length ? Math.max(...yValues) : 1;
  const xPad = Math.max((xMax - xMin) * 0.05, 0.5);
  const yPad = Math.max(
    (yMax - yMin) * 0.05,
    Number.isFinite(yMax - yMin) ? (yMax - yMin) * 0.05 || 0.5 : 0.5
  );
  const xAxisMin = xMin - xPad;
  const xAxisMax = xMax + xPad;

  const markLineData = showBinBreaks
    ? [
        ...options.breaks.infrastructure.map((cut) => ({
          xAxis: cut,
          lineStyle: {
            color: "#9333ea",
            type: "dashed" as const,
            width: 1,
            opacity: 0.55,
          },
          label: { show: false },
        })),
        ...options.breaks.context.map((cut) => ({
          yAxis: cut,
          lineStyle: {
            color: "#16a34a",
            type: "dashed" as const,
            width: 1,
            opacity: 0.55,
          },
          label: { show: false },
        })),
      ]
    : [];

  const trend = showTrendLine
    ? computeEquityScatterLinearTrend(
        points.map((point) => ({
          x: point.value[0],
          y: point.value[1],
        }))
      )
    : null;

  const trendLinePoints =
    trend && Number.isFinite(trend.slope) && Number.isFinite(trend.intercept)
      ? [
          [xAxisMin, trend.slope * xAxisMin + trend.intercept],
          [xAxisMax, trend.slope * xAxisMax + trend.intercept],
        ]
      : null;

  return {
    animation: false,
    grid: {
      left: 48,
      right: 14,
      top: 16,
      bottom: 44,
    },
    tooltip: {
      trigger: "item",
      confine: true,
      appendToBody: false,
      borderWidth: 0,
      padding: [8, 10],
      textStyle: {
        fontSize: 11,
        color: "#111827",
      },
      extraCssText:
        "max-width:200px;white-space:normal;word-break:break-word;line-height:1.35;box-shadow:0 4px 14px rgba(15,23,42,0.12);",
      formatter: (params) => {
        const point = params as {
          seriesType?: string;
          data?: {
            value?: [number, number];
            name?: string;
            infraBin?: number;
            contextBin?: number;
          };
        };
        if (point.seriesType === "line") return "";
        const data = point.data;
        if (!data?.value) return "";
        const [infra, context] = data.value;
        const infraRank =
          rankLabelsForBins[data.infraBin ?? 0] ?? `Bin ${(data.infraBin ?? 0) + 1}`;
        const contextRank =
          rankLabelsForBins[data.contextBin ?? 0] ??
          `Bin ${(data.contextBin ?? 0) + 1}`;
        const unitName = data.name?.trim() || "Geographic unit";
        const truncatedName =
          unitName.length > 42 ? `${unitName.slice(0, 40)}…` : unitName;
        return [
          `<div style="font-weight:600;margin-bottom:4px">${truncatedName}</div>`,
          `<div>Infra: ${formatAxisValue(infra, true)}</div>`,
          `<div>Metric: ${formatAxisValue(context, contextIsPercent)}</div>`,
          `<div style="margin-top:4px;color:#4b5563">Ranks: ${infraRank} × ${contextRank}</div>`,
        ].join("");
      },
    },
    xAxis: {
      type: "value",
      name: options.infrastructureLabel,
      nameLocation: "middle",
      nameGap: 28,
      nameTextStyle: { fontSize: 10, color: "#6b7280" },
      min: xAxisMin,
      max: xAxisMax,
      axisLabel: {
        fontSize: 9,
        color: "#6b7280",
        formatter: (value: number) => formatAxisValue(value, true),
      },
      splitLine: { lineStyle: { color: "#f3f4f6" } },
      axisLine: { lineStyle: { color: "#d1d5db" } },
    },
    yAxis: {
      type: "value",
      name: options.contextLabel,
      nameLocation: "middle",
      nameGap: 36,
      nameTextStyle: { fontSize: 10, color: "#6b7280" },
      min: yMin - yPad,
      max: yMax + yPad,
      axisLabel: {
        fontSize: 9,
        color: "#6b7280",
        formatter: (value: number) => formatAxisValue(value, contextIsPercent),
      },
      splitLine: { lineStyle: { color: "#f3f4f6" } },
      axisLine: { lineStyle: { color: "#d1d5db" } },
    },
    series: [
      {
        type: "scatter",
        symbolSize: points.length > 80 ? 7 : 9,
        data: points,
        z: 2,
        markLine:
          markLineData.length > 0
            ? {
                symbol: "none",
                silent: true,
                data: markLineData,
              }
            : undefined,
      },
      ...(trendLinePoints
        ? [
            {
              type: "line" as const,
              data: trendLinePoints,
              showSymbol: false,
              symbol: "none" as const,
              silent: true,
              z: 1,
              lineStyle: {
                color: "#111827",
                width: 2,
                opacity: 0.85,
              },
              tooltip: { show: false },
            },
          ]
        : []),
    ],
  };
}

export interface EquityScatterLinearTrend {
  slope: number;
  intercept: number;
  r: number;
  r2: number;
  pValue: number;
  n: number;
}

export function computeEquityScatterLinearTrend(
  points: Array<{ x: number; y: number }>
): EquityScatterLinearTrend | null {
  const cleaned = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
  );
  const n = cleaned.length;
  if (n < 3) return null;

  let sumX = 0;
  let sumY = 0;
  for (const point of cleaned) {
    sumX += point.x;
    sumY += point.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssxx = 0;
  let ssyy = 0;
  let ssxy = 0;
  for (const point of cleaned) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    ssxx += dx * dx;
    ssyy += dy * dy;
    ssxy += dx * dy;
  }

  if (ssxx <= 0 || ssyy <= 0) {
    return {
      slope: 0,
      intercept: meanY,
      r: 0,
      r2: 0,
      pValue: 1,
      n,
    };
  }

  const slope = ssxy / ssxx;
  const intercept = meanY - slope * meanX;
  const r = ssxy / Math.sqrt(ssxx * ssyy);
  const r2 = r * r;
  const df = n - 2;
  const denom = Math.max(1e-12, 1 - r2);
  const t = (r * Math.sqrt(df)) / Math.sqrt(denom);
  const pValue = studentTTwoTailedPValue(t, df);

  return { slope, intercept, r, r2, pValue, n };
}

export function formatEquityScatterTrendPValue(pValue: number): string {
  if (!Number.isFinite(pValue)) return "—";
  if (pValue < 0.001) return "< 0.001";
  if (pValue < 0.01) return pValue.toFixed(3);
  return pValue.toFixed(3);
}

/** Regularized incomplete beta I_x(a, b) via continued fraction. */
function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (!(a > 0) || !(b > 0)) return 1;

  // Symmetry keeps the continued fraction in a stable region.
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedIncompleteBeta(1 - x, b, a);
  }

  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front =
    Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta) / a;
  return front * incompleteBetaContinuedFraction(x, a, b);
}

function incompleteBetaContinuedFraction(
  x: number,
  a: number,
  b: number
): number {
  const maxIterations = 200;
  const epsilon = 1e-10;
  let am = 1;
  let bm = 1;
  let az = 1;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let bz = 1 - (qab * x) / qap;

  for (let m = 1; m <= maxIterations; m += 1) {
    const em = m;
    const tem = em + em;
    let d = (em * (b - em) * x) / ((qam + tem) * (a + tem));
    const ap = az + d * am;
    const bp = bz + d * bm;
    d = (-(a + em) * (qab + em) * x) / ((a + tem) * (qap + tem));
    const app = ap + d * az;
    const bpp = bp + d * bz;
    const aold = az;
    am = ap / bpp;
    bm = bp / bpp;
    az = app / bpp;
    bz = 1;
    if (Math.abs(az - aold) < epsilon * Math.abs(az)) {
      return az;
    }
  }
  return az;
}

function logGamma(z: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.984369654078761e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const x = z - 1;
  let a = c[0];
  for (let i = 1; i < g + 2; i += 1) {
    a += c[i] / (x + i);
  }
  const t = x + g + 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
  );
}

function studentTTwoTailedPValue(t: number, df: number): number {
  if (!Number.isFinite(t) || !(df > 0)) return 1;
  const x = df / (df + t * t);
  return Math.min(1, Math.max(0, regularizedIncompleteBeta(x, df / 2, 0.5)));
}