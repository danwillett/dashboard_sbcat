import {
  CatalogCategoryNode,
  CatalogDataset,
  datasetDisplayTitle,
  findDatasetCategoryPath,
} from "@/lib/data-services/CatalogApiService";
import {
  defaultYearsForModel,
  modeledVolumeFieldPrefix,
  ModeledVolumeBin,
  ModeledVolumeCountType,
  ModeledVolumeModel,
  MODELED_VOLUME_BINS,
} from "@/lib/data-query-app/modeledVolumeFields";

export type ModeledVolumeGeometry = "segment" | "hexagon";

export interface ModeledVolumeFilterState {
  year: number;
  bins: ModeledVolumeBin[];
}

export interface ModeledVolumeIdentity {
  model: ModeledVolumeModel;
  countType: ModeledVolumeCountType;
  catalogGeometry: ModeledVolumeGeometry;
  /** e.g. modeled_volumes.segment_volumes_cos_bike */
  segmentCollection: string;
  /** e.g. modeled_volumes.hexagon_volumes_cos_bike */
  hexagonCollection: string;
}

export function createDefaultModeledVolumeFilters(
  model: ModeledVolumeModel = "cost-benefit"
): ModeledVolumeFilterState {
  const years = defaultYearsForModel(model);
  return {
    year: years[years.length - 1] ?? 2023,
    bins: [...MODELED_VOLUME_BINS],
  };
}

/** Catalog datasets backed by modeled volume OGC collections. */
export function isModeledVolumeDataset(dataset: CatalogDataset): boolean {
  const path = (dataset.service_path || "").toLowerCase();
  const url = (
    dataset.ogc_features_url ||
    dataset.feature_service_url ||
    dataset.primary_url ||
    ""
  ).toLowerCase();

  return (
    path.includes("segment_volumes") ||
    path.includes("hexagon_volumes") ||
    path.includes("modeled_volumes.") ||
    url.includes("segment_volumes") ||
    url.includes("hexagon_volumes") ||
    url.includes("modeled_volumes.")
  );
}

export function findModeledVolumeDatasets(
  tree: CatalogCategoryNode[]
): CatalogDataset[] {
  const out: CatalogDataset[] = [];
  const walk = (nodes: CatalogCategoryNode[]) => {
    for (const node of nodes) {
      for (const ds of node.datasets || []) {
        if (isModeledVolumeDataset(ds)) out.push(ds);
      }
      walk(node.children || []);
    }
  };
  walk(tree);
  return out;
}

function inferCountType(dataset: CatalogDataset): ModeledVolumeCountType {
  const path = (dataset.service_path || "").toLowerCase();
  const title = datasetDisplayTitle(dataset).toLowerCase();
  if (path.includes("_ped") || /(?:^|[._-])ped(?:$|[._-])/.test(path)) {
    return "ped";
  }
  if (path.includes("_bike") || /(?:^|[._-])bike(?:$|[._-])/.test(path)) {
    return "bike";
  }
  if (
    title.includes("pedestrian") ||
    title.includes("ped ") ||
    title.includes(" walk")
  ) {
    return "ped";
  }
  return "bike";
}

function inferCatalogGeometry(
  dataset: CatalogDataset
): ModeledVolumeGeometry {
  const path = (dataset.service_path || "").toLowerCase();
  if (path.includes("hexagon")) return "hexagon";
  return "segment";
}

function inferModel(
  tree: CatalogCategoryNode[],
  dataset: CatalogDataset
): ModeledVolumeModel {
  const path = (dataset.service_path || "").toLowerCase();
  // Prefer collection name when catalog points at model×mode views
  if (
    path.includes("_str_") ||
    path.endsWith("_str_bike") ||
    path.endsWith("_str_ped") ||
    /volumes_str_/.test(path)
  ) {
    return "strava-bias";
  }
  if (
    path.includes("_cos_") ||
    path.endsWith("_cos_bike") ||
    path.endsWith("_cos_ped") ||
    /volumes_cos_/.test(path)
  ) {
    return "cost-benefit";
  }

  const pathNames = findDatasetCategoryPath(tree, dataset.id).map((n) =>
    n.toLowerCase()
  );
  const title = datasetDisplayTitle(dataset).toLowerCase();
  const haystack = [...pathNames, title].join(" ");
  if (haystack.includes("strava")) return "strava-bias";
  if (haystack.includes("cost") || haystack.includes("benefit")) {
    return "cost-benefit";
  }
  return "cost-benefit";
}

/** Build OGC collection id for a model × mode × geometry product. */
export function modeledVolumeCollectionId(
  geometry: ModeledVolumeGeometry,
  model: ModeledVolumeModel,
  countType: ModeledVolumeCountType
): string {
  const prefix = modeledVolumeFieldPrefix(model);
  return `modeled_volumes.${geometry}_volumes_${prefix}_${countType}`;
}

/**
 * Resolve which OGC collections this catalog leaf uses.
 * Each Cost-Benefit / Strava × bike / ped leaf maps to a distinct collection.
 */
export function resolveModeledVolumeIdentity(
  tree: CatalogCategoryNode[],
  dataset: CatalogDataset
): ModeledVolumeIdentity {
  const countType = inferCountType(dataset);
  const catalogGeometry = inferCatalogGeometry(dataset);
  const model = inferModel(tree, dataset);

  return {
    model,
    countType,
    catalogGeometry,
    segmentCollection: modeledVolumeCollectionId("segment", model, countType),
    hexagonCollection: modeledVolumeCollectionId("hexagon", model, countType),
  };
}

export function collectionForGeometry(
  identity: ModeledVolumeIdentity,
  geometry: ModeledVolumeGeometry
): string {
  return geometry === "hexagon"
    ? identity.hexagonCollection
    : identity.segmentCollection;
}
