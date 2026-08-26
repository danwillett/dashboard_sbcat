import Polygon from "@arcgis/core/geometry/Polygon";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import UniqueValueInfo from "@arcgis/core/renderers/support/UniqueValueInfo";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";

/** 3×3 bivariate palette (context low→high rows, infrastructure low→high columns). */
export const BIVARIATE_FILL_COLORS = [
  ["#e8e8e8", "#ace4e4", "#5ac8c8"],
  ["#dfb0d6", "#a5add3", "#5698b9"],
  ["#c85eb0", "#9972af", "#57438b"],
];

export interface EquityUnitValues {
  objectId: number;
  infrastructurePercent: number;
  contextValue: number;
  label?: string;
  /** Clipped polygon used for analysis and map display when extent filtering applies. */
  displayGeometry?: Polygon;
}

export interface EquityBivariateBreaks {
  infrastructure: [number, number];
  context: [number, number];
}

function computeBreaks(values: number[]): [number, number] {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return [0, 0];

  const q1Index = Math.floor(sorted.length / 3);
  const q2Index = Math.floor((2 * sorted.length) / 3);
  const q1 = sorted[Math.min(q1Index, sorted.length - 1)];
  const q2 = sorted[Math.min(q2Index, sorted.length - 1)];

  if (q1 === q2) {
    return [q1, q1 + 1e-6];
  }
  return [q1, q2];
}

function binIndex(value: number, breaks: [number, number]): number {
  if (value <= breaks[0]) return 0;
  if (value <= breaks[1]) return 1;
  return 2;
}

export function buildEquityBivariateBreaks(
  units: EquityUnitValues[]
): EquityBivariateBreaks {
  const infraValues = units.map((u) => u.infrastructurePercent);
  const contextValues = units.map((u) => u.contextValue);
  return {
    infrastructure: computeBreaks(infraValues),
    context: computeBreaks(contextValues),
  };
}

export function equityBivariateClass(
  unit: EquityUnitValues,
  breaks: EquityBivariateBreaks
): string {
  const infraBin = binIndex(unit.infrastructurePercent, breaks.infrastructure);
  const contextBin = binIndex(unit.contextValue, breaks.context);
  return `${infraBin}-${contextBin}`;
}

export function describeEquityBivariateBin(bin: number): string {
  switch (bin) {
    case 0:
      return "Low (within extent)";
    case 1:
      return "Medium (within extent)";
    case 2:
      return "High (within extent)";
    default:
      return "—";
  }
}

export function parseEquityBivariateClass(classValue: string): {
  infrastructureBin: number;
  contextBin: number;
} | null {
  const parts = classValue.split("-");
  if (parts.length !== 2) return null;
  const infrastructureBin = Number(parts[0]);
  const contextBin = Number(parts[1]);
  if (
    !Number.isInteger(infrastructureBin) ||
    !Number.isInteger(contextBin) ||
    infrastructureBin < 0 ||
    infrastructureBin > 2 ||
    contextBin < 0 ||
    contextBin > 2
  ) {
    return null;
  }
  return { infrastructureBin, contextBin };
}

export function createEquityBivariateRenderer(
  breaks: EquityBivariateBreaks
): UniqueValueRenderer {
  const uniqueValueInfos: __esri.UniqueValueInfo[] = [];

  for (let contextBin = 0; contextBin < 3; contextBin += 1) {
    for (let infraBin = 0; infraBin < 3; infraBin += 1) {
      const color = BIVARIATE_FILL_COLORS[contextBin][infraBin];
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
