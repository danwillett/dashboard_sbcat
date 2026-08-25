import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import StatisticDefinition from "@arcgis/core/rest/support/StatisticDefinition";
import { listJurisdictionPlaces } from "@/lib/data-query-app/safetyIncidentStats";

export interface BicycleComfortCategoryRow {
  category: string;
  segmentCount: number;
  lengthMeters: number;
  percentOfSegments: number;
  percentOfLength: number;
}

export type BicycleComfortStatsScopeKind = "full" | "extent" | "jurisdiction";

export interface BicycleComfortCategoryStats {
  categoryField: string;
  lengthField: string;
  scope: BicycleComfortStatsScopeKind;
  scopeLabel: string;
  categories: BicycleComfortCategoryRow[];
  totalSegments: number;
  totalLengthMeters: number;
}

const DEFAULT_CATEGORY_FIELD = "class_export";

function pickLengthField(layer: FeatureLayer): string | null {
  const fields = layer.fields || [];
  const shapeLength = fields.find(
    (f) => f.name === "Shape__Length" || f.name === "SHAPE__LENGTH"
  );
  if (shapeLength) return shapeLength.name;

  const geodesic = fields.find(
    (f) =>
      f.name.toLowerCase().includes("shape") &&
      f.name.toLowerCase().includes("length")
  );
  return geodesic?.name ?? null;
}

function pickOidField(layer: FeatureLayer): string {
  return layer.objectIdField || "OBJECTID";
}

function resolveCategoryField(
  layer: FeatureLayer,
  categoryField?: string
): string {
  if (categoryField && layer.fields?.some((f) => f.name === categoryField)) {
    return categoryField;
  }
  if (layer.fields?.some((f) => f.name === DEFAULT_CATEGORY_FIELD)) {
    return DEFAULT_CATEGORY_FIELD;
  }
  return categoryField ?? DEFAULT_CATEGORY_FIELD;
}

function buildCategoryStats(
  categoryField: string,
  lengthField: string,
  scope: BicycleComfortStatsScopeKind,
  scopeLabel: string,
  rows: Array<{ category: string; segmentCount: number; lengthMeters: number }>
): BicycleComfortCategoryStats {
  const totalSegments = rows.reduce((sum, row) => sum + row.segmentCount, 0);
  const totalLengthMeters = rows.reduce((sum, row) => sum + row.lengthMeters, 0);

  const categories: BicycleComfortCategoryRow[] = rows
    .map((row) => ({
      category: row.category,
      segmentCount: row.segmentCount,
      lengthMeters: row.lengthMeters,
      percentOfSegments:
        totalSegments > 0 ? (row.segmentCount / totalSegments) * 100 : 0,
      percentOfLength:
        totalLengthMeters > 0 ? (row.lengthMeters / totalLengthMeters) * 100 : 0,
    }))
    .sort((a, b) => b.lengthMeters - a.lengthMeters);

  return {
    categoryField,
    lengthField,
    scope,
    scopeLabel,
    categories,
    totalSegments,
    totalLengthMeters,
  };
}

export async function fetchBicycleComfortCategoryStats(
  layer: FeatureLayer,
  options?: {
    categoryField?: string;
    extent?: __esri.Extent;
    geometry?: __esri.Geometry;
    scope?: BicycleComfortStatsScopeKind;
    scopeLabel?: string;
    additionalWhere?: string;
  }
): Promise<BicycleComfortCategoryStats> {
  await layer.load();

  const categoryField = resolveCategoryField(layer, options?.categoryField);
  const lengthField = pickLengthField(layer);
  if (!lengthField) {
    throw new Error("Layer has no length field for road statistics.");
  }

  const oidField = pickOidField(layer);
  const query = layer.createQuery();
  const categoryWhere = options?.additionalWhere?.trim();
  query.where =
    categoryWhere && categoryWhere !== "1=1" ? categoryWhere : "1=1";
  query.returnGeometry = false;
  query.outStatistics = [
    new StatisticDefinition({
      statisticType: "count",
      onStatisticField: oidField,
      outStatisticFieldName: "segment_count",
    }),
    new StatisticDefinition({
      statisticType: "sum",
      onStatisticField: lengthField,
      outStatisticFieldName: "total_length",
    }),
  ];
  query.groupByFieldsForStatistics = [categoryField];

  if (options?.geometry) {
    query.geometry = options.geometry;
    query.spatialRelationship = "intersects";
  } else if (options?.extent) {
    query.geometry = options.extent;
    query.spatialRelationship = "intersects";
  }

  const scope = options?.scope ?? (options?.extent ? "extent" : options?.geometry ? "jurisdiction" : "full");
  const scopeLabel =
    options?.scopeLabel ??
    (scope === "extent" ? "Visible map area" : scope === "full" ? "Full county layer" : "Jurisdiction");

  const result = await layer.queryFeatures(query);
  const rows = result.features.map((feature) => {
    const attrs = feature.attributes as Record<string, unknown>;
    const category =
      String(attrs[categoryField] ?? "Unknown").trim() || "Unknown";
    const segmentCount = Number(attrs.segment_count) || 0;
    const lengthMeters = Number(attrs.total_length) || 0;
    return { category, segmentCount, lengthMeters };
  });

  return buildCategoryStats(categoryField, lengthField, scope, scopeLabel, rows);
}

export async function listBicycleComfortCategories(
  layer: FeatureLayer,
  categoryField?: string
): Promise<string[]> {
  await layer.load();
  const field = resolveCategoryField(layer, categoryField);
  const query = layer.createQuery();
  query.where = "1=1";
  query.returnGeometry = false;
  query.outFields = [field];
  query.orderByFields = [field];
  query.num = 2000;

  const result = await layer.queryFeatures(query);
  const values = new Set<string>();
  for (const feature of result.features) {
    const raw = feature.attributes?.[field];
    const label = String(raw ?? "").trim();
    if (label) values.add(label);
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function formatComfortLengthMeters(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters >= 1_000_000) {
    return `${(meters / 1_000_000).toFixed(2)} km`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters).toLocaleString()} m`;
}

export async function listBicycleComfortJurisdictionPlaces(
  level: "city" | "service-area"
): Promise<Array<{ name: string; geometry: __esri.Polygon }>> {
  return listJurisdictionPlaces(level);
}
