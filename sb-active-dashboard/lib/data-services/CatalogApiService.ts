export interface CatalogDataset {
  id: number;
  server_base_url: string;
  service_path: string;
  service_name?: string | null;
  has_feature_server?: boolean;
  has_map_server?: boolean;
  has_image_server?: boolean;
  has_ogc_features?: boolean;
  feature_service_url?: string | null;
  map_service_url?: string | null;
  image_service_url?: string | null;
  ogc_features_url?: string | null;
  primary_url?: string | null;
  display_title?: string | null;
  description?: string | null;
  layer_id?: number | null;
  display_order?: number;
  is_visible?: boolean;
  is_default_on?: boolean;
  category_ids?: number[];
}

export interface CatalogCategoryNode {
  id: number;
  name: string;
  description?: string | null;
  parent_id?: number | null;
  display_order?: number;
  children?: CatalogCategoryNode[];
  datasets?: CatalogDataset[];
}

const API_BASE = import.meta.env.VITE_SBCAT_API_URL || "/sbcat-api";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text().catch(() => "");
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const apiError =
      (parsed as { error?: string } | null)?.error || text.slice(0, 240);
    throw new Error(apiError || `Request failed ${response.status}`);
  }
  return parsed as T;
}

/**
 * Fetch hierarchical categories with nested datasets from the management API.
 */
export async function fetchCatalogTree(): Promise<CatalogCategoryNode[]> {
  const data = await fetchJson<CatalogCategoryNode[]>(
    `${API_BASE}/catalog/datasets-by-category`
  );
  return Array.isArray(data) ? data : [];
}

export function datasetDisplayTitle(dataset: CatalogDataset): string {
  return (
    dataset.display_title?.trim() ||
    dataset.service_name?.trim() ||
    dataset.service_path ||
    `Dataset ${dataset.id}`
  );
}

/** Keep only visible datasets; drop empty branches. */
export function filterVisibleCatalogTree(
  nodes: CatalogCategoryNode[]
): CatalogCategoryNode[] {
  return nodes
    .map((node) => {
      const children = filterVisibleCatalogTree(node.children || []);
      const datasets = (node.datasets || []).filter((ds) => ds.is_visible !== false);
      return { ...node, children, datasets };
    })
    .filter(
      (node) =>
        (node.datasets && node.datasets.length > 0) ||
        (node.children && node.children.length > 0)
    );
}

export function collectDefaultOnDatasetIds(
  nodes: CatalogCategoryNode[]
): number[] {
  const ids: number[] = [];
  const walk = (list: CatalogCategoryNode[]) => {
    for (const node of list) {
      for (const ds of node.datasets || []) {
        if (ds.is_default_on && ds.is_visible !== false) {
          ids.push(ds.id);
        }
      }
      walk(node.children || []);
    }
  };
  walk(nodes);
  return ids;
}

export function findDatasetInTree(
  nodes: CatalogCategoryNode[],
  datasetId: number
): CatalogDataset | null {
  for (const node of nodes) {
    const match = (node.datasets || []).find((ds) => ds.id === datasetId);
    if (match) return match;
    const nested = findDatasetInTree(node.children || [], datasetId);
    if (nested) return nested;
  }
  return null;
}

/**
 * Ancestor category names from root to the category that owns the dataset
 * (excludes the dataset title itself). Empty if not found.
 */
export function findDatasetCategoryPath(
  nodes: CatalogCategoryNode[],
  datasetId: number,
  ancestors: string[] = []
): string[] {
  for (const node of nodes) {
    const path = [...ancestors, node.name];
    if ((node.datasets || []).some((ds) => ds.id === datasetId)) {
      return path;
    }
    const nested = findDatasetCategoryPath(
      node.children || [],
      datasetId,
      path
    );
    if (nested.length > 0) return nested;
  }
  return [];
}
