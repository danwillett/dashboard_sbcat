import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import ImageryLayer from "@arcgis/core/layers/ImageryLayer";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import OGCFeatureLayer from "@arcgis/core/layers/OGCFeatureLayer";
import Field from "@arcgis/core/layers/support/Field";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import Polyline from "@arcgis/core/geometry/Polyline";
import Polygon from "@arcgis/core/geometry/Polygon";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import {
  CatalogDataset,
  datasetDisplayTitle,
} from "@/lib/data-services/CatalogApiService";

export const CATALOG_LAYER_ID_PREFIX = "catalog-dataset-";

export function catalogLayerId(datasetId: number): string {
  return `${CATALOG_LAYER_ID_PREFIX}${datasetId}`;
}

export function isCatalogLayerId(layerId: string | undefined): boolean {
  return !!layerId && layerId.startsWith(CATALOG_LAYER_ID_PREFIX);
}

/**
 * Rewrite absolute featureserv URLs to the Vite proxy in local/dev so browser
 * requests avoid CORS issues.
 */
export function maybeProxyFeatureservUrl(url: string): string {
  if (!url) return url;
  const featuresBase =
    import.meta.env.VITE_SBCAT_FEATURES_URL || "/sbcat-features";
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.includes("sbcat-featureserv") ||
      parsed.hostname.includes("happyglacier")
    ) {
      return `${featuresBase}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // relative URL already
  }
  return url;
}

function isFeatureservDataset(dataset: CatalogDataset): boolean {
  const urls = [
    dataset.server_base_url,
    dataset.ogc_features_url,
    dataset.primary_url,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    urls.includes("sbcat-featureserv") ||
    urls.includes("happyglacier") ||
    urls.includes("/sbcat-features")
  );
}

function withLayerIndex(serviceUrl: string, layerId?: number | null): string {
  if (layerId === null || layerId === undefined) return serviceUrl;
  return `${serviceUrl.replace(/\/$/, "")}/${layerId}`;
}

interface GeoJsonFeature {
  id?: number | string;
  type?: string;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  } | null;
  properties?: Record<string, unknown> | null;
}

interface GeoJsonFeatureCollection {
  features?: GeoJsonFeature[];
  links?: Array<{ rel?: string; href?: string }>;
}

const FEATURES_BASE =
  import.meta.env.VITE_SBCAT_FEATURES_URL || "/sbcat-features";

/**
 * Page through an OGC API Features /items collection and return all features.
 */
export async function fetchAllOgcCollectionItems(
  collectionUrl: string,
  pageLimit = 1000
): Promise<GeoJsonFeature[]> {
  const features: GeoJsonFeature[] = [];
  const base = maybeProxyFeatureservUrl(collectionUrl).replace(/\/$/, "");
  let url: string | null = `${base}/items?f=json&limit=${pageLimit}`;

  while (url) {
    const response = await fetch(url);
    const text = await response.text().catch(() => "");
    let payload: GeoJsonFeatureCollection | null = null;
    try {
      payload = text ? (JSON.parse(text) as GeoJsonFeatureCollection) : null;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      throw new Error(
        (payload as { error?: string } | null)?.error ||
          text.slice(0, 240) ||
          `OGC items request failed (${response.status})`
      );
    }

    features.push(...(payload?.features || []));

    const next = payload?.links?.find((link) => link.rel === "next");
    if (!next?.href) {
      url = null;
    } else {
      url = next.href.replace(/^https?:\/\/[^/]+/, FEATURES_BASE);
    }
  }

  return features;
}

function inferFieldType(
  value: unknown
): "string" | "integer" | "double" | "date" {
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "double";
  }
  if (typeof value === "boolean") return "integer";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return "date";
  }
  return "string";
}

function geometryFromGeoJson(
  geometry: GeoJsonFeature["geometry"]
): __esri.Geometry | null {
  if (!geometry?.type || !geometry.coordinates) return null;
  const sr = { wkid: 4326 };

  if (geometry.type === "Point") {
    const coords = geometry.coordinates as number[];
    if (coords.length < 2) return null;
    return new Point({
      longitude: coords[0],
      latitude: coords[1],
      spatialReference: sr,
    });
  }

  if (geometry.type === "MultiPoint") {
    const first = (geometry.coordinates as number[][])[0];
    if (!first || first.length < 2) return null;
    return new Point({
      longitude: first[0],
      latitude: first[1],
      spatialReference: sr,
    });
  }

  if (geometry.type === "LineString") {
    return new Polyline({
      paths: [geometry.coordinates as number[][]],
      spatialReference: sr,
    });
  }

  if (geometry.type === "MultiLineString") {
    return new Polyline({
      paths: geometry.coordinates as number[][][],
      spatialReference: sr,
    });
  }

  if (geometry.type === "Polygon") {
    return new Polygon({
      rings: geometry.coordinates as number[][][],
      spatialReference: sr,
    });
  }

  if (geometry.type === "MultiPolygon") {
    const rings = (geometry.coordinates as number[][][][]).flat();
    return new Polygon({
      rings,
      spatialReference: sr,
    });
  }

  return null;
}

function defaultRendererForGeometry(
  geometryType: "point" | "polyline" | "polygon"
): SimpleRenderer {
  if (geometryType === "polyline") {
    return new SimpleRenderer({
      symbol: new SimpleLineSymbol({
        color: [37, 99, 235, 0.9],
        width: 2,
      }),
    });
  }
  if (geometryType === "polygon") {
    return new SimpleRenderer({
      symbol: new SimpleFillSymbol({
        color: [37, 99, 235, 0.25],
        outline: { color: [37, 99, 235, 0.9], width: 1 },
      }),
    });
  }
  return new SimpleRenderer({
    symbol: new SimpleMarkerSymbol({
      size: 9,
      color: [37, 99, 235, 0.9],
      outline: { color: [255, 255, 255, 1], width: 1 },
    }),
  });
}

/**
 * Build a client-side FeatureLayer from OGC GeoJSON features.
 * Used for pg_featureserv collections that omit top-level feature ids
 * (ArcGIS OGCFeatureLayer requires a unique id and fails without one).
 */
export function createClientFeatureLayerFromGeoJson(
  dataset: CatalogDataset,
  features: GeoJsonFeature[]
): FeatureLayer {
  const title = datasetDisplayTitle(dataset);
  const id = catalogLayerId(dataset.id);

  const graphics: Graphic[] = [];
  let geometryType: "point" | "polyline" | "polygon" = "point";
  const propertyKeys = new Set<string>();

  features.forEach((feature, index) => {
    const geometry = geometryFromGeoJson(feature.geometry);
    if (!geometry) return;

    if (geometry.type === "polyline") geometryType = "polyline";
    else if (geometry.type === "polygon") geometryType = "polygon";

    const props = { ...(feature.properties || {}) };
    Object.keys(props).forEach((key) => propertyKeys.add(key));

    const objectId =
      Number(feature.id ?? props.id ?? index + 1) || index + 1;

    graphics.push(
      new Graphic({
        geometry,
        attributes: {
          OBJECTID: objectId,
          ...props,
        },
      })
    );
  });

  if (graphics.length === 0) {
    throw new Error(`No features returned for ${title}`);
  }

  const sample = features.find((f) => f.properties)?.properties || {};
  const fields: __esri.Field[] = [
    new Field({ name: "OBJECTID", alias: "Object ID", type: "oid" }),
  ];

  for (const key of propertyKeys) {
    if (key.toUpperCase() === "OBJECTID") continue;
    fields.push(
      new Field({
        name: key,
        alias: key,
        type: inferFieldType(sample[key]),
      })
    );
  }

  return new FeatureLayer({
    id,
    title,
    listMode: "show",
    source: graphics,
    objectIdField: "OBJECTID",
    geometryType,
    spatialReference: { wkid: 4326 },
    fields,
    outFields: ["*"],
    popupEnabled: true,
    renderer: defaultRendererForGeometry(geometryType),
  });
}

function createOgcFeatureLayer(
  dataset: CatalogDataset,
  common: { id: string; title: string; listMode: "show" }
): OGCFeatureLayer {
  const collectionUrl = maybeProxyFeatureservUrl(
    dataset.ogc_features_url ||
      `${dataset.server_base_url}/collections/${dataset.service_path}`
  );
  const serverRoot = maybeProxyFeatureservUrl(dataset.server_base_url);

  // pg_featureserv puts the unique key in properties (e.g. "id"), not as a
  // top-level GeoJSON feature id — ArcGIS needs objectIdField set explicitly.
  return new OGCFeatureLayer({
    ...common,
    url: serverRoot || collectionUrl,
    collectionId: dataset.service_path,
    objectIdField: "id",
  });
}

/**
 * Build an ArcGIS layer for a catalog dataset.
 * Featureserv OGC collections are fetched in full and added as client layers
 * so all features (e.g. all dashboard sites) appear without a site-id filter.
 */
export async function createLayerForCatalogDataset(
  dataset: CatalogDataset
): Promise<__esri.Layer> {
  const title = datasetDisplayTitle(dataset);
  const id = catalogLayerId(dataset.id);
  const common = {
    id,
    title,
    listMode: "show" as const,
  };

  if (dataset.has_feature_server && dataset.feature_service_url) {
    return new FeatureLayer({
      ...common,
      url: withLayerIndex(dataset.feature_service_url, dataset.layer_id),
      outFields: ["*"],
    });
  }

  if (dataset.has_map_server && dataset.map_service_url) {
    return new MapImageLayer({
      ...common,
      url: dataset.map_service_url,
    });
  }

  if (dataset.has_image_server && dataset.image_service_url) {
    return new ImageryLayer({
      ...common,
      url: dataset.image_service_url,
    });
  }

  if (dataset.has_ogc_features && (dataset.ogc_features_url || dataset.service_path)) {
    if (isFeatureservDataset(dataset)) {
      const collectionUrl =
        dataset.ogc_features_url ||
        `${dataset.server_base_url}/collections/${dataset.service_path}`;
      const features = await fetchAllOgcCollectionItems(collectionUrl);
      return createClientFeatureLayerFromGeoJson(dataset, features);
    }
    return createOgcFeatureLayer(dataset, common);
  }

  if (dataset.primary_url) {
    const url = maybeProxyFeatureservUrl(dataset.primary_url);
    if (url.includes("/collections/") || dataset.has_ogc_features) {
      if (isFeatureservDataset(dataset)) {
        const features = await fetchAllOgcCollectionItems(
          dataset.ogc_features_url || url
        );
        return createClientFeatureLayerFromGeoJson(dataset, features);
      }
      return createOgcFeatureLayer(dataset, common);
    }
    if (url.includes("FeatureServer")) {
      return new FeatureLayer({
        ...common,
        url: withLayerIndex(url, dataset.layer_id),
        outFields: ["*"],
      });
    }
    if (url.includes("MapServer")) {
      return new MapImageLayer({ ...common, url });
    }
    if (url.includes("ImageServer")) {
      return new ImageryLayer({ ...common, url });
    }
  }

  throw new Error(
    `No supported service endpoint for dataset ${dataset.id} (${title})`
  );
}
