import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { BicycleComfortCategoryStats } from "@/lib/data-query-app/bicycleComfortMapStats";
import {
  buildBicycleComfortEligibleSegmentsWhereClause,
  combineSqlWhereClauses,
} from "@/lib/data-query-app/bicycleComfortSegmentEligibility";

export type InfrastructureComfortBand = "low" | "medium" | "high";

export type InfrastructureComfortSelection =
  | { mode: "all" }
  | { mode: "bands"; bands: InfrastructureComfortBand[] };

export const DEFAULT_INFRASTRUCTURE_COMFORT_SELECTION: InfrastructureComfortSelection =
  { mode: "all" };

export const INFRASTRUCTURE_COMFORT_ALL_OPTION = {
  label: "All comfort levels",
  description:
    "Percent of segments classified into any comfort level (low, medium, or high).",
};

export const INFRASTRUCTURE_COMFORT_BANDS: Array<{
  id: InfrastructureComfortBand;
  label: string;
  description: string;
}> = [
  {
    id: "low",
    label: "Low comfort",
    description:
      "Percent of segments classified as low comfort infrastructure.",
  },
  {
    id: "medium",
    label: "Medium comfort",
    description:
      "Percent of segments classified as medium comfort infrastructure.",
  },
  {
    id: "high",
    label: "High comfort",
    description:
      "Percent of segments classified as high comfort infrastructure.",
  },
];

function comfortBand(category: string): InfrastructureComfortBand | "other" {
  const normalized = category.toLowerCase();
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium") || normalized.includes("moderate")) {
    return "medium";
  }
  if (normalized.includes("low")) return "low";
  return "other";
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

const CANONICAL_COMFORT_CLASS_BAND_LABELS: Record<
  InfrastructureComfortBand,
  string[]
> = {
  low: ["Low comfort"],
  medium: ["Medium comfort"],
  high: ["High comfort"],
};

function buildComfortBandLikeWhere(
  field: string,
  bands: InfrastructureComfortBand[]
): string {
  const parts: string[] = [];
  for (const band of bands) {
    if (band === "high") {
      parts.push(`LOWER(${field}) LIKE '%high%'`);
    } else if (band === "medium") {
      parts.push(`LOWER(${field}) LIKE '%medium%'`);
      parts.push(`LOWER(${field}) LIKE '%moderate%'`);
    } else if (band === "low") {
      parts.push(`LOWER(${field}) LIKE '%low%'`);
    }
  }
  if (parts.length === 0) return "1=0";
  return parts.join(" OR ");
}

function buildCanonicalComfortClassBandWhere(
  field: string,
  bands: InfrastructureComfortBand[]
): string {
  const labels = bands.flatMap((band) => CANONICAL_COMFORT_CLASS_BAND_LABELS[band]);
  if (labels.length === 0) return "1=0";

  const parts = labels.map(
    (label) =>
      `LOWER(${field}) = '${escapeSqlLiteral(label.toLowerCase())}'`
  );
  return parts.join(" OR ");
}

export function categoriesMatchComfortBands(
  categoryValues: string[],
  bands: InfrastructureComfortBand[]
): string[] {
  return categoryValues.filter((category) => {
    const band = comfortBand(category);
    return band !== "other" && bands.includes(band);
  });
}

/** SQL WHERE for map preview — optional band checkboxes; none selected shows all classes. */
export function buildInfrastructureComfortWhereClause(
  selection: InfrastructureComfortSelection,
  bandField: string,
  bandCategoryValues: string[],
  layer?: FeatureLayer
): string {
  const eligibility = buildBicycleComfortEligibleSegmentsWhereClause(layer);

  if (selection.mode === "all") {
    return eligibility;
  }

  const matched = categoriesMatchComfortBands(
    bandCategoryValues,
    selection.bands
  );

  let bandWhere: string;
  if (matched.length > 0) {
    const literals = matched
      .map((value) => `'${escapeSqlLiteral(value)}'`)
      .join(", ");
    bandWhere = `${bandField} IN (${literals})`;
  } else if (bandField === "comfort_class") {
    bandWhere = buildCanonicalComfortClassBandWhere(bandField, selection.bands);
  } else {
    const fieldType = layer?.fields?.find((field) => field.name === bandField)?.type;
    if (fieldType === "string") {
      bandWhere = buildComfortBandLikeWhere(bandField, selection.bands);
    } else {
      bandWhere = "1=0";
    }
  }

  return combineSqlWhereClauses(eligibility, bandWhere);
}

export function describeInfrastructureComfortFilter(
  selection: InfrastructureComfortSelection
): string {
  if (selection.mode === "all") {
    return INFRASTRUCTURE_COMFORT_ALL_OPTION.label;
  }
  return infrastructureMetricLabel(selection);
}

export function isInfrastructureComfortSelectionValid(
  selection: InfrastructureComfortSelection | null
): boolean {
  if (!selection) return false;
  if (selection.mode === "all") return true;
  return selection.bands.length > 0;
}

/** Segment-count percentage for the selected comfort metric(s). */
export function infrastructureMetricPercent(
  stats: BicycleComfortCategoryStats,
  selection: InfrastructureComfortSelection
): number {
  if (stats.totalSegments <= 0) return 0;

  let segmentCount = 0;
  for (const row of stats.categories) {
    const band = comfortBand(row.category);
    if (band === "other") continue;

    if (selection.mode === "all") {
      segmentCount += row.segmentCount;
    } else if (selection.bands.includes(band)) {
      segmentCount += row.segmentCount;
    }
  }

  return (segmentCount / stats.totalSegments) * 100;
}

function bandLabel(band: InfrastructureComfortBand): string {
  return (
    INFRASTRUCTURE_COMFORT_BANDS.find((entry) => entry.id === band)?.label ??
    band
  );
}

export function infrastructureMetricLabel(
  selection: InfrastructureComfortSelection
): string {
  if (selection.mode === "all") {
    return INFRASTRUCTURE_COMFORT_ALL_OPTION.label;
  }

  const labels = selection.bands.map(bandLabel);
  if (labels.length === 0) return INFRASTRUCTURE_COMFORT_ALL_OPTION.label;
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return labels.join(" + ");
  return (
    labels.slice(0, -1).join(", ") + " + " + labels[labels.length - 1]
  );
}
