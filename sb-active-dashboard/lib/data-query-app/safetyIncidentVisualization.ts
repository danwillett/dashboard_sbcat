import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import HeatmapRenderer from "@arcgis/core/renderers/HeatmapRenderer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { ALL_CONFLICT_TYPES } from "@/lib/data-query-app/safetyIncidentFilters";
import { IncidentHeatmapRenderer } from "@/lib/safety-app/renderers/IncidentHeatmapRenderer";

export type SafetyIncidentVizStyleBy =
  | "uniform"
  | "heatmap"
  | "severity"
  | "conflict"
  | "source"
  | "roadUser";

export interface SafetyIncidentVisualizationState {
  styleBy: SafetyIncidentVizStyleBy;
}

export const DEFAULT_SAFETY_INCIDENT_VISUALIZATION: SafetyIncidentVisualizationState =
  {
    styleBy: "severity",
  };

export const SAFETY_CONFLICT_COLORS: Record<string, [number, number, number]> = {
  "Bike vs vehicle": [37, 99, 235],
  "Bike vs other": [14, 165, 233],
  "Bike vs bike": [79, 70, 229],
  "Bike vs pedestrian": [168, 85, 247],
  "Bike vs infrastructure": [6, 182, 212],
  "Pedestrian vs vehicle": [234, 88, 12],
  "Pedestrian vs other": [245, 158, 11],
};

export const SAFETY_SEVERITY_LEGEND: Array<{
  value: string;
  label: string;
  color: string;
}> = [
  { value: "Fatality", label: "Fatality", color: "#000000" },
  { value: "Severe Injury", label: "Severe Injury", color: "#D55E00" },
  { value: "Injury", label: "Injury", color: "#E69F00" },
  { value: "No Injury", label: "No Injury", color: "#56B4E9" },
  { value: "Near Miss", label: "Near Miss", color: "#0072B2" },
  { value: "Unknown", label: "Unknown", color: "#999999" },
];

/** Canonical display labels used by charts / legend. */
export type NormalizedSeverity =
  | "Fatality"
  | "Severe Injury"
  | "Injury"
  | "No Injury"
  | "Near Miss"
  | "Unknown";

/**
 * Map DB / FeatureServer severity strings onto display labels.
 * Hosted incidents use lowercase values like "fatality", "severe injury",
 * "near-miss" (see safety.all_incidents.severity). Near-miss is also inferred
 * from BikeMaps "no injury" when the source is BikeMaps.
 */
export function normalizeIncidentSeverity(
  rawSeverity: unknown,
  dataSource?: unknown
): NormalizedSeverity {
  const sev = String(rawSeverity ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  const source = String(dataSource ?? "").trim().toLowerCase();
  const isBikeMaps = source.includes("bikemaps");

  if (!sev) return "Unknown";
  if (sev === "fatality" || sev === "fatal") return "Fatality";
  if (sev === "severe injury" || sev === "severe") return "Severe Injury";
  if (sev === "injury" || sev === "minor injury") return "Injury";
  if (sev === "near miss" || sev === "nearmiss") return "Near Miss";
  if (
    sev === "no injury" ||
    sev === "property damage only" ||
    sev === "pdo" ||
    sev === "no injury near miss"
  ) {
    return isBikeMaps ? "Near Miss" : "No Injury";
  }
  if (sev === "unknown") return "Unknown";

  // Title-case pass-through if already canonical
  if (sev === "fatality") return "Fatality";
  return "Unknown";
}

function marker(
  rgb: [number, number, number],
  size = 8
): SimpleMarkerSymbol {
  return new SimpleMarkerSymbol({
    style: "circle",
    color: [...rgb, 1],
    size,
    outline: { color: [255, 255, 255, 1], width: 1 },
  });
}

const SEVERITY_SYMBOLS: Record<NormalizedSeverity, SimpleMarkerSymbol> = {
  Fatality: marker([0, 0, 0], 12),
  "Severe Injury": marker([213, 94, 0], 10),
  Injury: marker([230, 159, 0], 8),
  "No Injury": marker([86, 180, 233], 8),
  "Near Miss": marker([0, 114, 178], 8),
  Unknown: marker([153, 153, 153], 7),
};

/**
 * Every known raw FeatureServer value → symbol. Field-based UVR is more
 * reliable than Arcade when the hosted layer has no maxSeverity field.
 */
const RAW_SEVERITY_VALUE_INFOS: Array<{
  value: string;
  label: string;
  symbol: SimpleMarkerSymbol;
}> = [
  // Fatality
  { value: "fatality", label: "Fatality", symbol: SEVERITY_SYMBOLS.Fatality },
  { value: "Fatality", label: "Fatality", symbol: SEVERITY_SYMBOLS.Fatality },
  { value: "FATALITY", label: "Fatality", symbol: SEVERITY_SYMBOLS.Fatality },
  { value: "fatal", label: "Fatality", symbol: SEVERITY_SYMBOLS.Fatality },
  // Severe Injury
  {
    value: "severe injury",
    label: "Severe Injury",
    symbol: SEVERITY_SYMBOLS["Severe Injury"],
  },
  {
    value: "Severe Injury",
    label: "Severe Injury",
    symbol: SEVERITY_SYMBOLS["Severe Injury"],
  },
  {
    value: "severe_injury",
    label: "Severe Injury",
    symbol: SEVERITY_SYMBOLS["Severe Injury"],
  },
  // Injury
  { value: "injury", label: "Injury", symbol: SEVERITY_SYMBOLS.Injury },
  { value: "Injury", label: "Injury", symbol: SEVERITY_SYMBOLS.Injury },
  { value: "minor injury", label: "Injury", symbol: SEVERITY_SYMBOLS.Injury },
  // No Injury / Near Miss raw strings
  {
    value: "no injury",
    label: "No Injury",
    symbol: SEVERITY_SYMBOLS["No Injury"],
  },
  {
    value: "No Injury",
    label: "No Injury",
    symbol: SEVERITY_SYMBOLS["No Injury"],
  },
  {
    value: "property_damage_only",
    label: "No Injury",
    symbol: SEVERITY_SYMBOLS["No Injury"],
  },
  {
    value: "near-miss",
    label: "Near Miss",
    symbol: SEVERITY_SYMBOLS["Near Miss"],
  },
  {
    value: "near miss",
    label: "Near Miss",
    symbol: SEVERITY_SYMBOLS["Near Miss"],
  },
  {
    value: "Near Miss",
    label: "Near Miss",
    symbol: SEVERITY_SYMBOLS["Near Miss"],
  },
  {
    value: "nearmiss",
    label: "Near Miss",
    symbol: SEVERITY_SYMBOLS["Near Miss"],
  },
  // Unknown
  { value: "unknown", label: "Unknown", symbol: SEVERITY_SYMBOLS.Unknown },
  { value: "Unknown", label: "Unknown", symbol: SEVERITY_SYMBOLS.Unknown },
];

function severityArcade(): string {
  // Prefer Arcade so BikeMaps "no injury" → Near Miss. Also normalize
  // hyphens/underscores and casing from safety.all_incidents.severity.
  return `
    var sev = $feature.severity;
    if (sev == null || IsEmpty(sev)) {
      sev = $feature.maxSeverity;
    }
    if (sev == null || IsEmpty(sev)) {
      return "Unknown";
    }

    var source = $feature.data_source;
    if (source == null) { source = ""; }
    source = Lower(source);

    sev = Lower(Trim(Text(sev)));
    sev = Replace(sev, '-', ' ');
    sev = Replace(sev, '_', ' ');

    if (sev == "fatality" || sev == "fatal") { return "Fatality"; }
    if (sev == "severe injury" || sev == "severe") { return "Severe Injury"; }
    if (sev == "injury" || sev == "minor injury") { return "Injury"; }
    if (sev == "near miss" || sev == "nearmiss") { return "Near Miss"; }
    if (sev == "unknown") { return "Unknown"; }
    if (sev == "no injury" || sev == "property damage only" || sev == "pdo" || sev == "no injury near miss") {
      if (Find("bikemaps", source) >= 0) { return "Near Miss"; }
      return "No Injury";
    }
    return "Unknown";
  `;
}

function severityRenderer(): UniqueValueRenderer {
  return new UniqueValueRenderer({
    valueExpression: severityArcade(),
    valueExpressionTitle: "Incident severity",
    defaultSymbol: SEVERITY_SYMBOLS.Unknown,
    defaultLabel: "Unknown",
    uniqueValueInfos: [
      {
        value: "Fatality",
        label: "Fatality",
        symbol: SEVERITY_SYMBOLS.Fatality,
      },
      {
        value: "Severe Injury",
        label: "Severe Injury",
        symbol: SEVERITY_SYMBOLS["Severe Injury"],
      },
      {
        value: "Injury",
        label: "Injury",
        symbol: SEVERITY_SYMBOLS.Injury,
      },
      {
        value: "No Injury",
        label: "No Injury",
        symbol: SEVERITY_SYMBOLS["No Injury"],
      },
      {
        value: "Near Miss",
        label: "Near Miss",
        symbol: SEVERITY_SYMBOLS["Near Miss"],
      },
      {
        value: "Unknown",
        label: "Unknown",
        symbol: SEVERITY_SYMBOLS.Unknown,
      },
    ],
  });
}

/** Fallback if Arcade fails on the service — style by raw severity field. */
function severityFieldRenderer(): UniqueValueRenderer {
  return new UniqueValueRenderer({
    field: "severity",
    defaultSymbol: SEVERITY_SYMBOLS.Unknown,
    defaultLabel: "Unknown",
    uniqueValueInfos: RAW_SEVERITY_VALUE_INFOS,
  });
}

function uniformRenderer(): SimpleRenderer {
  return new SimpleRenderer({
    symbol: marker([220, 38, 38], 8),
  });
}

function heatmapRenderer(): HeatmapRenderer {
  return IncidentHeatmapRenderer.createDensityHeatmap();
}

function conflictRenderer(): UniqueValueRenderer {
  return new UniqueValueRenderer({
    field: "conflict_type",
    defaultSymbol: marker([156, 163, 175], 7),
    defaultLabel: "Other / unknown",
    uniqueValueInfos: ALL_CONFLICT_TYPES.map((value) => ({
      value,
      label: value,
      symbol: marker(SAFETY_CONFLICT_COLORS[value] || [107, 114, 128], 8),
    })),
  });
}

function sourceRenderer(): UniqueValueRenderer {
  return new UniqueValueRenderer({
    field: "data_source",
    defaultSymbol: marker([156, 163, 175], 7),
    defaultLabel: "Other",
    uniqueValueInfos: [
      {
        value: "SWITRS",
        label: "Police reports (SWITRS)",
        symbol: marker([30, 64, 175], 8),
      },
      {
        value: "Police",
        label: "Police reports",
        symbol: marker([30, 64, 175], 8),
      },
      {
        value: "BikeMaps.org",
        label: "Self-reports (BikeMaps.org)",
        symbol: marker([5, 150, 105], 8),
      },
      {
        value: "BikeMaps",
        label: "Self-reports (BikeMaps)",
        symbol: marker([5, 150, 105], 8),
      },
    ],
  });
}

function roadUserRenderer(): UniqueValueRenderer {
  return new UniqueValueRenderer({
    valueExpression: `
      var bike = $feature.bicyclist_involved;
      var ped = $feature.pedestrian_involved;
      if (bike == 1 && ped == 1) { return "Both"; }
      if (bike == 1 || bike == true) { return "Bicyclist"; }
      if (ped == 1 || ped == true) { return "Pedestrian"; }
      return "Unknown";
    `,
    valueExpressionTitle: "Road user",
    defaultSymbol: marker([156, 163, 175], 7),
    defaultLabel: "Unknown",
    uniqueValueInfos: [
      {
        value: "Bicyclist",
        label: "Bicyclist",
        symbol: marker([37, 99, 235], 8),
      },
      {
        value: "Pedestrian",
        label: "Pedestrian",
        symbol: marker([234, 88, 12], 8),
      },
      {
        value: "Both",
        label: "Both",
        symbol: marker([124, 58, 237], 8),
      },
      {
        value: "Unknown",
        label: "Unknown",
        symbol: marker([156, 163, 175], 7),
      },
    ],
  });
}

export function createSafetyIncidentRenderer(
  visualization: SafetyIncidentVisualizationState
): UniqueValueRenderer | SimpleRenderer | HeatmapRenderer {
  switch (visualization.styleBy) {
    case "heatmap":
      return heatmapRenderer();
    case "severity":
      return severityRenderer();
    case "conflict":
      return conflictRenderer();
    case "source":
      return sourceRenderer();
    case "roadUser":
      return roadUserRenderer();
    default:
      return uniformRenderer();
  }
}

function findSeverityFieldName(layer: FeatureLayer): string | null {
  const fields = layer.fields || [];
  const match = fields.find((f) => {
    const n = (f.name || "").toLowerCase();
    return n === "severity" || n === "maxseverity";
  });
  return match?.name || null;
}

export async function applySafetyIncidentVisualization(
  layer: FeatureLayer,
  visualization: SafetyIncidentVisualizationState
): Promise<void> {
  if (typeof layer.load === "function") {
    try {
      await layer.load();
    } catch {
      // Still try to set a renderer
    }
  }
  layer.outFields = ["*"];

  if (visualization.styleBy === "severity") {
    const fieldName = findSeverityFieldName(layer) || "severity";

    // Probe live values so we can extend uniqueValueInfos for whatever the
    // FeatureServer actually stores (e.g. "near-miss", "fatality").
    let rawSamples: Array<{ severity: unknown; source: unknown }> = [];
    try {
      const probe = layer.createQuery();
      probe.where = layer.definitionExpression || "1=1";
      probe.outFields = [fieldName, "data_source"];
      probe.returnGeometry = false;
      probe.num = 100;
      const sample = await layer.queryFeatures(probe);
      rawSamples = sample.features.map((f) => ({
        severity: f.attributes?.[fieldName] ?? f.attributes?.severity,
        source: f.attributes?.data_source,
      }));
      const distinct = [
        ...new Set(
          rawSamples
            .map((s) => s.severity)
            .filter((v) => v != null && String(v).trim() !== "")
            .map(String)
        ),
      ];
      if (distinct.length > 0) {
        console.info(
          "[safety viz] severity field:",
          fieldName,
          "sample values:",
          distinct
        );
      }
    } catch (err) {
      console.warn("[safety viz] Could not probe severity values:", err);
    }

    const needsSourceSplit = rawSamples.some((s) => {
      const norm = String(s.severity ?? "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ");
      const src = String(s.source ?? "").toLowerCase();
      return (
        (norm === "no injury" || norm === "property damage only" || norm === "pdo") &&
        src.includes("bikemaps")
      );
    });

    if (needsSourceSplit) {
      // Arcade can split BikeMaps "no injury" → Near Miss.
      layer.renderer = severityRenderer();
      console.info("[safety viz] Using Arcade severity renderer (Near Miss split)");
      return;
    }

    // Field-based UVR: more reliable for lowercase DB values like "fatality".
    const fieldRenderer = severityFieldRenderer();
    fieldRenderer.field = fieldName;
    const seen = new Set(
      fieldRenderer.uniqueValueInfos.map((u) => String(u.value))
    );
    for (const sample of rawSamples) {
      if (sample.severity == null || String(sample.severity).trim() === "") continue;
      const key = String(sample.severity);
      if (seen.has(key)) continue;
      seen.add(key);
      const label = normalizeIncidentSeverity(sample.severity, sample.source);
      fieldRenderer.uniqueValueInfos.push({
        value: key,
        label,
        symbol: SEVERITY_SYMBOLS[label],
      });
    }
    layer.renderer = fieldRenderer;
    console.info(
      "[safety viz] Using field-based severity renderer on",
      fieldName,
      "with",
      fieldRenderer.uniqueValueInfos.length,
      "value infos"
    );
    return;
  }

  layer.renderer = createSafetyIncidentRenderer(visualization);
}

export function safetyLegendItems(
  visualization: SafetyIncidentVisualizationState
): Array<{ label: string; color: string }> {
  switch (visualization.styleBy) {
    case "heatmap":
      return [
        { label: "Low density", color: "rgb(65,182,196)" },
        { label: "Medium", color: "rgb(254,204,92)" },
        { label: "High density", color: "rgb(227,26,28)" },
      ];
    case "severity":
      return SAFETY_SEVERITY_LEGEND.map((item) => ({
        label: item.label,
        color: item.color,
      }));
    case "conflict":
      return ALL_CONFLICT_TYPES.map((label) => {
        const rgb = SAFETY_CONFLICT_COLORS[label] || [107, 114, 128];
        return {
          label,
          color: `rgb(${rgb.join(",")})`,
        };
      });
    case "source":
      return [
        { label: "Police reports (SWITRS)", color: "rgb(30,64,175)" },
        { label: "Self-reports (BikeMaps.org)", color: "rgb(5,150,105)" },
      ];
    case "roadUser":
      return [
        { label: "Bicyclist", color: "rgb(37,99,235)" },
        { label: "Pedestrian", color: "rgb(234,88,12)" },
        { label: "Both", color: "rgb(124,58,237)" },
      ];
    default:
      return [{ label: "Incidents", color: "rgb(220,38,38)" }];
  }
}

export function rgbToCss(rgb: [number, number, number]): string {
  return `rgb(${rgb.join(",")})`;
}

export const SAFETY_VIZ_STYLE_OPTIONS: Array<{
  id: SafetyIncidentVizStyleBy;
  label: string;
  description: string;
}> = [
  {
    id: "uniform",
    label: "Uniform",
    description: "Same symbol for every incident",
  },
  {
    id: "heatmap",
    label: "Heatmap",
    description: "Density heatmap of currently filtered incidents",
  },
  {
    id: "severity",
    label: "Severity",
    description: "Color and size by maximum injury severity",
  },
  {
    id: "conflict",
    label: "Conflict type",
    description: "Color by bike/ped conflict category",
  },
  {
    id: "source",
    label: "Data source",
    description: "Police reports vs self-reports",
  },
  {
    id: "roadUser",
    label: "Road user",
    description: "Bicyclist, pedestrian, or both involved",
  },
];
