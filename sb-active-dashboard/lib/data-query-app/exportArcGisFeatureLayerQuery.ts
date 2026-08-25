import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import { ArcGisFeatureLayerMetadata } from "@/lib/data-services/ArcGisFeatureLayerMetadataService";
import { catalogLayerId } from "@/lib/data-query-app/catalogLayerFactory";

export interface PortalFeatureLayerExportResult {
  rowCount: number;
  truncated: boolean;
  downloadOnly?: boolean;
  filename: string;
}

export const QUERY_EXPORT_PAGE_SIZE = 2000;
export const QUERY_EXPORT_MAX_ROWS = 100000;

export interface QueriedExportFeature {
  attributes: Record<string, unknown>;
  geometry?: __esri.Geometry;
}

export interface QueryFilteredFeaturesResult {
  features: QueriedExportFeature[];
  truncated: boolean;
  fieldNames: string[];
  geometryType: FeatureLayerGeometryType | null;
}

export type FeatureLayerGeometryType =
  | "point"
  | "polyline"
  | "polygon"
  | "multipoint";

export function slugifyFilename(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "layer";
}

export function normalizeLayerGeometryType(
  layer: FeatureLayer
): FeatureLayerGeometryType | null {
  const raw = layer.geometryType?.toLowerCase();
  if (
    raw === "point" ||
    raw === "polyline" ||
    raw === "polygon" ||
    raw === "multipoint"
  ) {
    return raw;
  }
  return null;
}

export function geometryExportColumns(
  geometryType: FeatureLayerGeometryType | null
): string[] {
  if (geometryType === "point") {
    return ["longitude", "latitude", "geometry_wkt"];
  }
  if (geometryType) {
    return ["geometry_wkt"];
  }
  return [];
}

function pointToWkt(point: __esri.Point): string {
  const x = point.longitude ?? point.x;
  const y = point.latitude ?? point.y;
  if (x == null || y == null) return "";
  return `POINT (${x} ${y})`;
}

function polylineToWkt(polyline: __esri.Polyline): string {
  const paths = polyline.paths ?? [];
  if (paths.length === 0) return "";

  const lineStrings = paths
    .filter((path) => path.length > 0)
    .map((path) => {
      const coords = path.map(([x, y]) => `${x} ${y}`).join(", ");
      return `(${coords})`;
    });

  if (lineStrings.length === 0) return "";
  if (lineStrings.length === 1) {
    return `LINESTRING ${lineStrings[0]}`;
  }
  return `MULTILINESTRING (${lineStrings.join(", ")})`;
}

function polygonToWkt(polygon: __esri.Polygon): string {
  const rings = polygon.rings ?? [];
  if (rings.length === 0) return "";

  const ringStrings = rings
    .filter((ring) => ring.length > 0)
    .map((ring) => {
      const coords = ring.map(([x, y]) => `${x} ${y}`).join(", ");
      return `(${coords})`;
    });

  if (ringStrings.length === 0) return "";
  return `POLYGON (${ringStrings.join(", ")})`;
}

function multipointToWkt(multipoint: __esri.Multipoint): string {
  const points = multipoint.points ?? [];
  if (points.length === 0) return "";
  const coords = points.map(([x, y]) => `${x} ${y}`).join(", ");
  return `MULTIPOINT (${coords})`;
}

function geometryToWkt(geometry: __esri.Geometry): string {
  switch (geometry.type) {
    case "point":
      return pointToWkt(geometry as __esri.Point);
    case "polyline":
      return polylineToWkt(geometry as __esri.Polyline);
    case "polygon":
      return polygonToWkt(geometry as __esri.Polygon);
    case "multipoint":
      return multipointToWkt(geometry as __esri.Multipoint);
    default:
      return "";
  }
}

export function geometryExportValues(
  geometry: __esri.Geometry | null | undefined,
  geometryType: FeatureLayerGeometryType | null
): unknown[] {
  if (!geometry || !geometryType) return [];

  if (geometryType === "point") {
    const point = geometry as __esri.Point;
    return [
      point.longitude ?? point.x ?? "",
      point.latitude ?? point.y ?? "",
      pointToWkt(point),
    ];
  }

  return [geometryToWkt(geometry)];
}

export async function resolveFeatureLayer(
  dataset: CatalogDataset,
  metadata: ArcGisFeatureLayerMetadata,
  mapView?: __esri.MapView | null
): Promise<FeatureLayer> {
  if (mapView?.map) {
    const existing = mapView.map.findLayerById(catalogLayerId(dataset.id));
    if (existing?.type === "feature") {
      return existing as FeatureLayer;
    }
  }

  return new FeatureLayer({
    url: metadata.serviceUrl,
    outFields: ["*"],
  });
}

export async function queryFilteredLayerFeatures(
  dataset: CatalogDataset,
  metadata: ArcGisFeatureLayerMetadata,
  options?: { where?: string; mapView?: __esri.MapView | null }
): Promise<QueryFilteredFeaturesResult> {
  const layer = await resolveFeatureLayer(dataset, metadata, options?.mapView);
  await layer.load();

  const where = options?.where?.trim() || "1=1";
  const geometryType = normalizeLayerGeometryType(layer);
  const fieldNames = (layer.fields ?? [])
    .map((field) => field.name)
    .filter((name) => name && name.toUpperCase() !== "SHAPE");

  if (fieldNames.length === 0) {
    throw new Error("Could not determine fields to export.");
  }

  const features: QueriedExportFeature[] = [];
  let start = 0;
  let truncated = false;
  const needsGeometry = geometryType != null;

  while (features.length < QUERY_EXPORT_MAX_ROWS) {
    const query = layer.createQuery();
    query.where = where;
    query.outFields = fieldNames;
    query.returnGeometry = needsGeometry;
    if (needsGeometry) {
      query.outSpatialReference = { wkid: 4326 };
    }
    query.num = Math.min(
      QUERY_EXPORT_PAGE_SIZE,
      QUERY_EXPORT_MAX_ROWS - features.length
    );
    query.start = start;

    const result = await layer.queryFeatures(query);
    for (const feature of result.features) {
      features.push({
        attributes: (feature.attributes ?? {}) as Record<string, unknown>,
        geometry: feature.geometry ?? undefined,
      });
    }

    if (result.features.length < query.num!) break;

    start += QUERY_EXPORT_PAGE_SIZE;
    if (features.length >= QUERY_EXPORT_MAX_ROWS) {
      truncated = true;
      break;
    }
  }

  if (features.length === 0) {
    throw new Error("No features match the current export filters.");
  }

  return { features, truncated, fieldNames, geometryType };
}
