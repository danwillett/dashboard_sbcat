import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import {
  CatalogCategoryNode,
  CatalogDataset,
  findDatasetCategoryPath,
} from "@/lib/data-services/CatalogApiService";
import { isBicycleComfortMapDataset } from "@/lib/data-query-app/genericCatalogDataset";

export type EquityContextCategoryKind = "health" | "demographics";

export type EquityGeographyUnit = "zip" | "tract" | "block";

export const ACS_GEO_TYPE_FIELD = "geo_type";

export const DEMOGRAPHICS_GEOGRAPHY_OPTIONS: Array<{
  id: EquityGeographyUnit;
  label: string;
}> = [
  { id: "tract", label: "Census tract" },
  { id: "block", label: "Census block group" },
];

function pathMatches(path: string[], pattern: string): boolean {
  return path.some((name) => name.toLowerCase().includes(pattern));
}

export function equityContextKindFromPath(
  path: string[]
): EquityContextCategoryKind | null {
  if (pathMatches(path, "health")) return "health";
  if (pathMatches(path, "demographic")) return "demographics";
  return null;
}

export function equityContextCategoryLabel(
  kind: EquityContextCategoryKind
): string {
  return kind === "health" ? "Health" : "Demographics";
}

export function inferEquityGeographyUnit(
  dataset: CatalogDataset,
  contextKind: EquityContextCategoryKind
): EquityGeographyUnit {
  if (contextKind === "health") return "zip";

  const haystack = [
    dataset.display_title,
    dataset.service_path,
    dataset.service_name,
    dataset.primary_url,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("block group") || haystack.includes("block_group")) {
    return "block";
  }
  if (haystack.includes("block") && !haystack.includes("tract")) {
    return "block";
  }
  return "tract";
}

export function equityGeographyUnitLabel(unit: EquityGeographyUnit): string {
  switch (unit) {
    case "zip":
      return "ZIP code";
    case "block":
      return "Census block group";
    case "tract":
      return "Census tract";
  }
}

/** `geo_type` attribute value for ACS demographics layers. */
export function equityGeographyUnitGeoTypeValue(
  unit: EquityGeographyUnit
): string | null {
  switch (unit) {
    case "tract":
      return "Census Tract";
    case "block":
      return "Block Group";
    case "zip":
      return null;
  }
}

export function buildDemographicsGeographyWhereClause(
  geographyUnit: EquityGeographyUnit,
  layer?: FeatureLayer
): string {
  const geoTypeValue = equityGeographyUnitGeoTypeValue(geographyUnit);
  if (!geoTypeValue) return "1=1";

  const fields = layer?.fields ?? [];
  const geoTypeField = fields.some((field) => field.name === ACS_GEO_TYPE_FIELD)
    ? ACS_GEO_TYPE_FIELD
    : fields.some((field) => field.name === ACS_GEO_TYPE_FIELD.toUpperCase())
      ? ACS_GEO_TYPE_FIELD.toUpperCase()
      : null;
  if (!geoTypeField) return "1=1";

  const escaped = geoTypeValue.replace(/'/g, "''");
  return `${geoTypeField} = '${escaped}'`;
}

function combineEquityWhereClauses(...clauses: string[]): string {
  const parts = clauses
    .map((clause) => clause.trim())
    .filter((clause) => clause && clause !== "1=1");
  if (parts.length === 0) return "1=1";
  return parts.join(" AND ");
}

export function buildContextLayerGeographyWhereClause(
  geographyUnit: EquityGeographyUnit,
  contextKind: EquityContextCategoryKind | null,
  layer?: FeatureLayer
): string {
  if (contextKind !== "demographics") return "1=1";
  return buildDemographicsGeographyWhereClause(geographyUnit, layer);
}

export function mergeContextLayerWhereClause(
  baseWhere: string,
  geographyUnit: EquityGeographyUnit,
  contextKind: EquityContextCategoryKind | null,
  layer?: FeatureLayer
): string {
  return combineEquityWhereClauses(
    baseWhere,
    buildContextLayerGeographyWhereClause(geographyUnit, contextKind, layer)
  );
}

export function collectDatasetsInCategory(
  nodes: CatalogCategoryNode[],
  categoryPattern: string
): CatalogDataset[] {
  const results: CatalogDataset[] = [];

  const walk = (list: CatalogCategoryNode[], ancestors: string[]) => {
    for (const node of list) {
      const path = [...ancestors, node.name];
      const inCategory = pathMatches(path, categoryPattern);
      if (inCategory) {
        for (const ds of node.datasets || []) {
          if (ds.is_visible !== false) results.push(ds);
        }
      }
      walk(node.children || [], path);
    }
  };

  walk(nodes, []);
  return results;
}

export function collectInfrastructureEquityDatasets(
  tree: CatalogCategoryNode[]
): CatalogDataset[] {
  return collectDatasetsInCategory(tree, "infrastructure").filter(
    (dataset) => isBicycleComfortMapDataset(dataset)
  );
}

export function collectHealthContextDatasets(
  tree: CatalogCategoryNode[]
): CatalogDataset[] {
  return collectDatasetsInCategory(tree, "health");
}

export function collectDemographicsContextDatasets(
  tree: CatalogCategoryNode[]
): CatalogDataset[] {
  return collectDatasetsInCategory(tree, "demographic");
}

export function isEquityInfrastructureDataset(
  dataset: CatalogDataset
): boolean {
  return isBicycleComfortMapDataset(dataset);
}

export function isEquityContextDataset(
  dataset: CatalogDataset,
  tree: CatalogCategoryNode[],
  kind: EquityContextCategoryKind
): boolean {
  const path = findDatasetCategoryPath(tree, dataset.id);
  const detected = equityContextKindFromPath(path);
  return detected === kind;
}
