import {
  CatalogCategoryNode,
  CatalogDataset,
  findDatasetCategoryPath,
} from "@/lib/data-services/CatalogApiService";
import { isCountSurveyDataset } from "@/lib/data-query-app/countSurveyFilters";
import { isModeledVolumeDataset } from "@/lib/data-query-app/modeledVolumeFilters";
import { isSafetyIncidentDataset } from "@/lib/data-query-app/safetyIncidentFilters";

/** Datasets with dedicated filter / visualization hooks. */
export function isManagedCatalogDataset(dataset: CatalogDataset): boolean {
  return (
    isCountSurveyDataset(dataset) ||
    isSafetyIncidentDataset(dataset) ||
    isModeledVolumeDataset(dataset)
  );
}

/** Catalog tree path includes a demographics or health category. */
export function isDemographicsOrHealthCatalogDataset(
  dataset: CatalogDataset,
  tree: CatalogCategoryNode[]
): boolean {
  const path = findDatasetCategoryPath(tree, dataset.id);
  return path.some((name) => {
    const normalized = name.toLowerCase();
    return normalized.includes("demographic") || normalized.includes("health");
  });
}

/** Catalog datasets backed by an ArcGIS FeatureServer layer (generic styling). */
export function isArcGisFeatureCatalogDataset(dataset: CatalogDataset): boolean {
  if (isManagedCatalogDataset(dataset)) return false;
  if (dataset.has_feature_server && dataset.feature_service_url) return true;
  const url = (dataset.primary_url || "").toLowerCase();
  return url.includes("featureserver");
}

/** Santa Barbara County bicycle comfort / infrastructure draft layer. */
export function isBicycleComfortMapDataset(dataset: CatalogDataset): boolean {
  const path = (dataset.service_path || "").toLowerCase();
  const title = (dataset.display_title || "").toLowerCase();
  return (
    path.includes("arcgis_export_county") ||
    title.includes("bicycle comfort") ||
    title.includes("bike comfort")
  );
}
