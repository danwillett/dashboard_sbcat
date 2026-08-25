import Color from "@arcgis/core/Color";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import { getVolumeLevelColor, VOLUME_LEVEL_CONFIG } from "@/ui/theme/volumeLevelColors";
import { ModeledVolumeGeometry } from "@/lib/data-query-app/modeledVolumeFilters";

export interface ModeledVolumeVisualizationState {
  geometry: ModeledVolumeGeometry;
}

export const DEFAULT_MODELED_VOLUME_VISUALIZATION: ModeledVolumeVisualizationState =
  {
    geometry: "hexagon",
  };

export const MODELED_VOLUME_GEOMETRY_OPTIONS: Array<{
  id: ModeledVolumeGeometry;
  label: string;
  description: string;
}> = [
  {
    id: "hexagon",
    label: "H3 hexagons",
    description:
      "Aggregated hex polygons by AADT bin. Res 9 until zoom 14, then res 10; segments at zoom 16+.",
  },
  {
    id: "segment",
    label: "Network segments",
    description:
      "Style Strava network lines by modeled AADT bin. Visible from zoom 12+.",
  },
];

function hexToRgbArray(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  const n = Number.parseInt(cleaned, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lineSymbol(level: "low" | "medium" | "high", width: number) {
  return new SimpleLineSymbol({
    color: getVolumeLevelColor(level),
    width,
    style: "solid",
    cap: "round",
    join: "round",
  });
}

function fillSymbol(level: "low" | "medium" | "high", simplified = false) {
  const [r, g, b] = hexToRgbArray(getVolumeLevelColor(level, true));
  return new SimpleFillSymbol({
    color: new Color([r, g, b, simplified ? 0.7 : 0.75]),
    // Skip outlines on dense county-wide layers — big win for pan FPS
    outline: simplified
      ? undefined
      : new SimpleLineSymbol({
          color: new Color([255, 255, 255, 0.9]),
          width: 0.5,
        }),
  });
}

/**
 * Apply Low/Medium/High UniqueValueRenderer for the active year field.
 */
export function applyModeledVolumeVisualization(
  layer: FeatureLayer,
  options: {
    field: string;
    geometry: ModeledVolumeGeometry;
    legendTitle?: string;
    /** Drop hex outlines for large county-wide layers (smoother pan). */
    simplified?: boolean;
  }
): void {
  const isHex = options.geometry === "hexagon";
  const simplified = Boolean(options.simplified);

  layer.renderer = new UniqueValueRenderer({
    field: options.field,
    defaultSymbol: isHex
      ? new SimpleFillSymbol({
          color: new Color([204, 204, 204, simplified ? 0.4 : 0.45]),
          outline: simplified
            ? undefined
            : new SimpleLineSymbol({
                color: new Color([160, 160, 160, 0.8]),
                width: 0.4,
              }),
        })
      : new SimpleLineSymbol({
          color: "#cccccc",
          width: 1,
          style: "solid",
        }),
    uniqueValueInfos: [
      {
        value: "Low",
        symbol: isHex
          ? fillSymbol("low", simplified)
          : lineSymbol("low", 2),
        label: VOLUME_LEVEL_CONFIG.low.label,
      },
      {
        value: "Medium",
        symbol: isHex
          ? fillSymbol("medium", simplified)
          : lineSymbol("medium", 3),
        label: VOLUME_LEVEL_CONFIG.medium.label,
      },
      {
        value: "High",
        symbol: isHex
          ? fillSymbol("high", simplified)
          : lineSymbol("high", 4),
        label: VOLUME_LEVEL_CONFIG.high.label,
      },
    ],
    legendOptions: {
      title: options.legendTitle || "Modeled AADT",
    },
  });
}

export function modeledVolumeLegendItems(): Array<{
  label: string;
  color: string;
  description: string;
}> {
  return (["low", "medium", "high"] as const).map((level) => ({
    label: VOLUME_LEVEL_CONFIG[level].label,
    color: VOLUME_LEVEL_CONFIG[level].color,
    description: VOLUME_LEVEL_CONFIG[level].description,
  }));
}
