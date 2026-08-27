import Polygon from "@arcgis/core/geometry/Polygon";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import UniqueValueInfo from "@arcgis/core/renderers/support/UniqueValueInfo";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import type { EquityContextCategoryKind } from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";

/** Default/legacy 3×3 bivariate palette (context low→high rows, infrastructure low→high columns). */
export const BIVARIATE_FILL_COLORS = [
  ["#e8e8e8", "#ace4e4", "#5ac8c8"],
  ["#dfb0d6", "#a5add3", "#5698b9"],
  ["#c85eb0", "#9972af", "#57438b"],
];

export type EquityBinCount = 2 | 3 | 4;

export const EQUITY_BIN_COUNT_OPTIONS: EquityBinCount[] = [2, 3, 4];

export const DEFAULT_EQUITY_BIN_COUNT: EquityBinCount = 3;

export interface EquityUnitValues {
  objectId: number;
  infrastructurePercent: number;
  contextValue: number;
  label?: string;
  /** Clipped polygon used for analysis and map display when extent filtering applies. */
  displayGeometry?: Polygon;
}

/** Sorted ascending cut points; length is always `binCount - 1`. */
export interface EquityBivariateBreaks {
  binCount: EquityBinCount;
  infrastructure: number[];
  context: number[];
}

function clampBinCount(binCount: number): EquityBinCount {
  if (binCount <= 2) return 2;
  if (binCount >= 4) return 4;
  return 3;
}

/** Quantile cut points that split `values` into roughly equal-count bins. */
export function computeQuantileBreaks(
  values: number[],
  binCount: EquityBinCount
): number[] {
  const sorted = [...values].filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const count = clampBinCount(binCount);
  if (sorted.length === 0) {
    return Array.from({ length: count - 1 }, () => 0);
  }

  const breaks: number[] = [];
  for (let k = 1; k < count; k += 1) {
    const index = Math.floor((k * sorted.length) / count);
    breaks.push(sorted[Math.min(index, sorted.length - 1)]);
  }

  return normalizeBreaks(breaks, sorted[0], sorted[sorted.length - 1]);
}

/** Ensure breaks are strictly increasing enough for stable bin assignment. */
export function normalizeBreaks(
  breaks: number[],
  minValue?: number,
  maxValue?: number
): number[] {
  if (breaks.length === 0) return [];
  const sorted = [...breaks]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  const normalized = [...sorted];
  for (let i = 1; i < normalized.length; i += 1) {
    if (normalized[i] <= normalized[i - 1]) {
      normalized[i] = normalized[i - 1] + 1e-6;
    }
  }

  if (
    minValue != null &&
    maxValue != null &&
    Number.isFinite(minValue) &&
    Number.isFinite(maxValue) &&
    maxValue > minValue
  ) {
    for (let i = 0; i < normalized.length; i += 1) {
      const lowerPad = (maxValue - minValue) * 0.001;
      const minAllowed = minValue + lowerPad * (i + 1);
      const maxAllowed = maxValue - lowerPad * (normalized.length - i);
      normalized[i] = Math.min(maxAllowed, Math.max(minAllowed, normalized[i]));
    }
    for (let i = 1; i < normalized.length; i += 1) {
      if (normalized[i] <= normalized[i - 1]) {
        normalized[i] = normalized[i - 1] + 1e-6;
      }
    }
  }

  return normalized;
}

export function equityMetricBinIndex(
  value: number,
  breaks: number[]
): number {
  for (let i = 0; i < breaks.length; i += 1) {
    if (value <= breaks[i]) return i;
  }
  return breaks.length;
}

export function buildEquityBivariateBreaks(
  units: EquityUnitValues[],
  options?: {
    binCount?: EquityBinCount;
    infrastructureBreaks?: number[] | null;
    contextBreaks?: number[] | null;
  }
): EquityBivariateBreaks {
  const binCount = clampBinCount(options?.binCount ?? DEFAULT_EQUITY_BIN_COUNT);
  const infraValues = units.map((u) => u.infrastructurePercent);
  const contextValues = units.map((u) => u.contextValue);

  const infraMin = infraValues.length ? Math.min(...infraValues) : 0;
  const infraMax = infraValues.length ? Math.max(...infraValues) : 0;
  const contextMin = contextValues.length ? Math.min(...contextValues) : 0;
  const contextMax = contextValues.length ? Math.max(...contextValues) : 0;

  const infrastructure =
    options?.infrastructureBreaks &&
    options.infrastructureBreaks.length === binCount - 1
      ? normalizeBreaks(options.infrastructureBreaks, infraMin, infraMax)
      : computeQuantileBreaks(infraValues, binCount);

  const context =
    options?.contextBreaks && options.contextBreaks.length === binCount - 1
      ? normalizeBreaks(options.contextBreaks, contextMin, contextMax)
      : computeQuantileBreaks(contextValues, binCount);

  return { binCount, infrastructure, context };
}

export function equityBivariateClass(
  unit: EquityUnitValues,
  breaks: EquityBivariateBreaks
): string {
  const infraBin = equityMetricBinIndex(
    unit.infrastructurePercent,
    breaks.infrastructure
  );
  const contextBin = equityMetricBinIndex(unit.contextValue, breaks.context);
  return `${infraBin}-${contextBin}`;
}

export interface EquityBivariateCornerCounts {
  total: number;
  /** High infrastructure × low equity metric. */
  highInfrastructureLowContext: number;
  /** Low infrastructure × high equity metric. */
  lowInfrastructureHighContext: number;
}

export function countEquityBivariateCornerUnits(
  units: EquityUnitValues[],
  breaks: EquityBivariateBreaks
): EquityBivariateCornerCounts {
  const highBin = Math.max(0, breaks.binCount - 1);
  let highInfrastructureLowContext = 0;
  let lowInfrastructureHighContext = 0;

  for (const unit of units) {
    const infraBin = equityMetricBinIndex(
      unit.infrastructurePercent,
      breaks.infrastructure
    );
    const contextBin = equityMetricBinIndex(unit.contextValue, breaks.context);
    if (infraBin === highBin && contextBin === 0) {
      highInfrastructureLowContext += 1;
    }
    if (infraBin === 0 && contextBin === highBin) {
      lowInfrastructureHighContext += 1;
    }
  }

  return {
    total: units.length,
    highInfrastructureLowContext,
    lowInfrastructureHighContext,
  };
}

export function formatEquityAnalysisSummaryBlurb(options: {
  units: EquityUnitValues[];
  breaks: EquityBivariateBreaks;
  infrastructureLabel: string;
  contextLabel: string;
  geographyLabel?: string;
  contextKind?: EquityContextCategoryKind | null;
  contextDatasetTitle?: string | null;
}): string {
  return formatEquityAnalysisSummaryBullets(options).join(" ");
}

export function formatEquityAnalysisSummaryBullets(options: {
  units: EquityUnitValues[];
  breaks: EquityBivariateBreaks;
  infrastructureLabel: string;
  contextLabel: string;
  geographyLabel?: string;
  contextKind?: EquityContextCategoryKind | null;
  contextDatasetTitle?: string | null;
}): string[] {
  const counts = countEquityBivariateCornerUnits(options.units, options.breaks);
  const unitWord =
    options.geographyLabel?.toLowerCase().includes("zip")
      ? "ZIP codes"
      : options.geographyLabel?.toLowerCase().includes("block")
        ? "block groups"
        : options.geographyLabel?.toLowerCase().includes("tract")
          ? "tracts"
          : "units";

  if (counts.total === 0) {
    return [
      "No geographic units had both infrastructure and equity-metric values for this run.",
    ];
  }

  const infra = options.infrastructureLabel.trim() || "infrastructure";
  let metric = options.contextLabel.trim() || "equity metric";
  if (
    options.contextKind === "demographics" &&
    options.contextDatasetTitle?.trim()
  ) {
    const title = options.contextDatasetTitle.trim();
    if (!metric.toLowerCase().includes(title.toLowerCase())) {
      metric = `${metric} ${title}`;
    }
  }

  return [
    `${counts.highInfrastructureLowContext}/${counts.total} ${unitWord} have High ${infra} & Low ${metric}`,
    `${counts.lowInfrastructureHighContext}/${counts.total} ${unitWord} have Low ${infra} & High ${metric}`,
  ];
}

/** Plain Low / Medium / High (or 2-/4-bin) label for a rank bin index. */
export function equityBinClassLabel(
  bin: number,
  binCount: EquityBinCount = 3
): string {
  const labels =
    binCount === 2
      ? ["Low", "High"]
      : binCount === 4
        ? ["Low", "Medium-low", "Medium-high", "High"]
        : ["Low", "Medium", "High"];
  return labels[bin] ?? "—";
}

export function describeEquityBivariateBin(
  bin: number,
  binCount: EquityBinCount = 3
): string {
  return `${equityBinClassLabel(bin, binCount)} (within extent)`;
}

export function parseEquityBivariateClass(
  classValue: string,
  binCount: EquityBinCount = 3
): {
  infrastructureBin: number;
  contextBin: number;
} | null {
  const parts = classValue.split("-");
  if (parts.length !== 2) return null;
  const infrastructureBin = Number(parts[0]);
  const contextBin = Number(parts[1]);
  const maxBin = binCount - 1;
  if (
    !Number.isInteger(infrastructureBin) ||
    !Number.isInteger(contextBin) ||
    infrastructureBin < 0 ||
    infrastructureBin > maxBin ||
    contextBin < 0 ||
    contextBin > maxBin
  ) {
    return null;
  }
  return { infrastructureBin, contextBin };
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb: [number, number, number]): string {
  return (
    "#" +
    rgb
      .map((channel) =>
        Math.max(0, Math.min(255, Math.round(channel)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

function mixHex(a: string, b: string, t: number): string {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  return rgbToHex([
    rgbA[0] + (rgbB[0] - rgbA[0]) * t,
    rgbA[1] + (rgbB[1] - rgbA[1]) * t,
    rgbA[2] + (rgbB[2] - rgbA[2]) * t,
  ]);
}

/** Context rows low→high, infrastructure columns low→high. */
export function getBivariateFillColors(binCount: EquityBinCount): string[][] {
  const count = clampBinCount(binCount);
  if (count === 3) return BIVARIATE_FILL_COLORS.map((row) => [...row]);

  const lowLow = "#e8e8e8";
  const highInfra = "#5ac8c8";
  const highContext = "#c85eb0";
  const highHigh = "#57438b";

  return Array.from({ length: count }, (_, contextBin) => {
    const contextT = count <= 1 ? 0 : contextBin / (count - 1);
    return Array.from({ length: count }, (_, infraBin) => {
      const infraT = count <= 1 ? 0 : infraBin / (count - 1);
      const lowContextColor = mixHex(lowLow, highInfra, infraT);
      const highContextColor = mixHex(highContext, highHigh, infraT);
      return mixHex(lowContextColor, highContextColor, contextT);
    });
  });
}

export function createEquityBivariateRenderer(
  breaks: EquityBivariateBreaks
): UniqueValueRenderer {
  const colors = getBivariateFillColors(breaks.binCount);
  const uniqueValueInfos: __esri.UniqueValueInfo[] = [];

  for (let contextBin = 0; contextBin < breaks.binCount; contextBin += 1) {
    for (let infraBin = 0; infraBin < breaks.binCount; infraBin += 1) {
      const color = colors[contextBin][infraBin];
      uniqueValueInfos.push(
        new UniqueValueInfo({
          value: `${infraBin}-${contextBin}`,
          label: `Infrastructure bin ${infraBin + 1}, context bin ${contextBin + 1}`,
          symbol: new SimpleFillSymbol({
            color,
            outline: { color: [255, 255, 255, 0.85], width: 0.5 },
          }),
        })
      );
    }
  }

  return new UniqueValueRenderer({
    field: "equity_bivariate_class",
    uniqueValueInfos,
    defaultSymbol: new SimpleFillSymbol({
      color: [229, 231, 235, 0.65],
      outline: { color: [255, 255, 255, 0.85], width: 0.5 },
    }),
  });
}

export function countUnitsByMetricBin(
  values: number[],
  breaks: number[]
): number[] {
  const counts = Array.from({ length: breaks.length + 1 }, () => 0);
  for (const value of values) {
    counts[equityMetricBinIndex(value, breaks)] += 1;
  }
  return counts;
}
