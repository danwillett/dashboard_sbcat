import Color from "@arcgis/core/Color";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SizeVariable from "@arcgis/core/renderers/visualVariables/SizeVariable";
import ColorVariable from "@arcgis/core/renderers/visualVariables/ColorVariable";
import { fetchVolumeAadtBySite } from "@/lib/data-services/VolumeSitesApiService";
import { applyCountSurveySiteHighlight } from "@/lib/volume-app/createCountSurveySitesLayer";

export type CountSurveyVizMode = "uniform" | "aadt";
export type CountSurveyVizRoadUser = "bike" | "ped";

export type CountSurveyColorRampId =
  | "blues"
  | "oranges"
  | "greens"
  | "purples"
  | "reds"
  | "ylorrd"
  | "viridis"
  | "plasma"
  | "inferno"
  | "magma"
  | "cividis"
  | "turbo";

export interface CountSurveyColorRamp {
  id: CountSurveyColorRampId;
  label: string;
  /** Low → mid → high RGB triples (0–255). */
  colors: [[number, number, number], [number, number, number], [number, number, number]];
}

export const COUNT_SURVEY_COLOR_RAMPS: CountSurveyColorRamp[] = [
  {
    id: "blues",
    label: "Blues",
    colors: [
      [191, 219, 254],
      [59, 130, 246],
      [30, 64, 175],
    ],
  },
  {
    id: "oranges",
    label: "Oranges",
    colors: [
      [254, 215, 170],
      [249, 115, 22],
      [154, 52, 18],
    ],
  },
  {
    id: "greens",
    label: "Greens",
    colors: [
      [187, 247, 208],
      [34, 197, 94],
      [21, 128, 61],
    ],
  },
  {
    id: "purples",
    label: "Purples",
    colors: [
      [233, 213, 255],
      [168, 85, 247],
      [91, 33, 182],
    ],
  },
  {
    id: "reds",
    label: "Reds",
    colors: [
      [254, 202, 202],
      [239, 68, 68],
      [153, 27, 27],
    ],
  },
  {
    id: "ylorrd",
    label: "Yellow–Orange–Red",
    colors: [
      [254, 240, 138],
      [251, 146, 60],
      [185, 28, 28],
    ],
  },
  {
    id: "viridis",
    label: "Viridis",
    colors: [
      [68, 1, 84],
      [33, 145, 140],
      [253, 231, 37],
    ],
  },
  {
    id: "plasma",
    label: "Plasma",
    colors: [
      [13, 8, 135],
      [204, 71, 120],
      [240, 249, 33],
    ],
  },
  {
    id: "inferno",
    label: "Inferno",
    colors: [
      [0, 0, 4],
      [187, 55, 84],
      [252, 255, 164],
    ],
  },
  {
    id: "magma",
    label: "Magma",
    colors: [
      [0, 0, 4],
      [183, 55, 121],
      [252, 253, 191],
    ],
  },
  {
    id: "cividis",
    label: "Cividis",
    colors: [
      [0, 34, 78],
      [96, 131, 108],
      [255, 233, 69],
    ],
  },
  {
    id: "turbo",
    label: "Turbo",
    colors: [
      [48, 18, 59],
      [34, 196, 129],
      [231, 229, 45],
    ],
  },
];

export interface CountSurveyVisualizationState {
  mode: CountSurveyVizMode;
  roadUser: CountSurveyVizRoadUser;
  varyColor: boolean;
  varySize: boolean;
  colorRamp: CountSurveyColorRampId;
}

export const DEFAULT_COUNT_SURVEY_VISUALIZATION: CountSurveyVisualizationState = {
  mode: "uniform",
  roadUser: "bike",
  varyColor: true,
  varySize: true,
  colorRamp: "blues",
};

/** AADT values used for color/size visual-variable stops (must stay in sync with renderer). */
export const AADT_VIZ_STOPS = {
  low: 0,
  mid: 100,
  high: 500,
} as const;

export const AADT_SIZE_RANGE = {
  minSize: 6,
  maxSize: 22,
} as const;

export function getColorRamp(
  id: CountSurveyColorRampId
): CountSurveyColorRamp {
  return (
    COUNT_SURVEY_COLOR_RAMPS.find((ramp) => ramp.id === id) ||
    COUNT_SURVEY_COLOR_RAMPS[0]
  );
}

function uniformRenderer(): SimpleRenderer {
  return new SimpleRenderer({
    symbol: new SimpleMarkerSymbol({
      size: 9,
      color: [37, 99, 235, 0.9],
      outline: { color: [255, 255, 255, 1], width: 1 },
    }),
  });
}

function aadtRenderer(
  varyColor: boolean,
  varySize: boolean,
  colorRampId: CountSurveyColorRampId
): SimpleRenderer {
  const visualVariables: any[] = [];
  const ramp = getColorRamp(colorRampId);
  const [low, mid, high] = ramp.colors;

  if (varyColor) {
    visualVariables.push(
      new ColorVariable({
        field: "viz_aadt",
        stops: [
          { value: AADT_VIZ_STOPS.low, color: new Color([...low, 0.9]), label: "Low" },
          { value: AADT_VIZ_STOPS.mid, color: new Color([...mid, 0.95]), label: "Medium" },
          { value: AADT_VIZ_STOPS.high, color: new Color([...high, 1]), label: "High" },
        ],
      })
    );
  }

  if (varySize) {
    visualVariables.push(
      new SizeVariable({
        field: "viz_aadt",
        minDataValue: AADT_VIZ_STOPS.low,
        maxDataValue: AADT_VIZ_STOPS.high,
        minSize: AADT_SIZE_RANGE.minSize,
        maxSize: AADT_SIZE_RANGE.maxSize,
      })
    );
  }

  return new SimpleRenderer({
    symbol: new SimpleMarkerSymbol({
      size: 9,
      color: [...mid, 0.9],
      outline: { color: [255, 255, 255, 1], width: 1 },
    }),
    visualVariables: visualVariables.length > 0 ? visualVariables : undefined,
  });
}

/**
 * Apply uniform or AADT-based styling to the client count-sites FeatureLayer.
 * Prefers filter years when provided; otherwise latest year per site/mode.
 */
export async function applyCountSurveyVisualization(
  layer: FeatureLayer,
  visualization: CountSurveyVisualizationState,
  options: {
    years: number[];
    selectedSiteId?: string | null;
  }
): Promise<{ yearUsedLabel: string }> {
  if (visualization.mode === "uniform") {
    layer.renderer = uniformRenderer();
    applyCountSurveySiteHighlight(layer, options.selectedSiteId ?? null);
    return { yearUsedLabel: "Uniform style" };
  }

  const result = await layer.queryFeatures();
  const siteIds = result.features
    .map((f) => Number(f.attributes.id))
    .filter((id) => Number.isFinite(id));

  const years = options.years.length > 0 ? [...options.years] : [];

  const values = await fetchVolumeAadtBySite({
    years: years.length > 0 ? years : undefined,
    countTypes: [visualization.roadUser],
    siteIds,
  });

  const aadtBySite = new Map<number, number>();
  const yearsSeen = new Set<number>();
  for (const row of values) {
    aadtBySite.set(row.site_id, row.all_aadt);
    if (row.year != null) yearsSeen.add(row.year);
  }

  const updates = result.features.map((feature) => {
    const id = Number(feature.attributes.id);
    const aadt = aadtBySite.get(id);
    feature.attributes = {
      ...feature.attributes,
      viz_aadt: aadt != null && Number.isFinite(aadt) ? aadt : 0,
    };
    return feature;
  });

  if (updates.length > 0) {
    await layer.applyEdits({ updateFeatures: updates });
  }

  layer.renderer = aadtRenderer(
    visualization.varyColor,
    visualization.varySize,
    visualization.colorRamp || "blues"
  );

  const yearLabel =
    years.length === 1
      ? `Year ${years[0]}`
      : yearsSeen.size > 0
        ? years.length > 1
          ? `Latest among selected (${Math.max(...yearsSeen)})`
          : `Latest available (${Math.max(...yearsSeen)})`
        : "Latest available";

  return { yearUsedLabel: yearLabel };
}
