/**
 * pg_tileserv helpers for modeled volume display + featureserv identify.
 *
 * Display: VectorTileLayer MVT from tileserv
 * Identify: OGC Features bbox query on the same collection id
 */

import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import Point from "@arcgis/core/geometry/Point";
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";
import { getVolumeLevelColor } from "@/ui/theme/volumeLevelColors";
import { maybeProxyFeatureservUrl } from "@/lib/data-query-app/catalogLayerFactory";
import {
  ModeledVolumeBin,
  MODELED_VOLUME_BINS,
} from "@/lib/data-query-app/modeledVolumeFields";
import { ModeledVolumeGeometry } from "@/lib/data-query-app/modeledVolumeFilters";

const DEFAULT_TILES_ORIGIN =
  "https://ca-sbcat-tileserv.happyglacier-722a1c53.westus2.azurecontainerapps.io";

/**
 * Prefer the absolute tileserv origin. ArcGIS fires many concurrent .pbf
 * requests; proxying those through Vite often yields intermittent 500s even
 * when upstream tileserv is healthy. Tileserv already allows CORS (*).
 *
 * Set VITE_SBCAT_TILES_URL=/sbcat-tiles only if you need the Vite proxy.
 */
export function tilesBaseUrl(): string {
  const configured = (import.meta.env.VITE_SBCAT_TILES_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");
  return DEFAULT_TILES_ORIGIN;
}

const FEATURES_BASE =
  import.meta.env.VITE_SBCAT_FEATURES_URL || "/sbcat-features";

const REMOTE_TILES_HOST = "ca-sbcat-tileserv";

/** Rewrite absolute tileserv URLs to the Vite proxy when explicitly configured. */
export function maybeProxyTileservUrl(url: string): string {
  if (!url) return url;
  const base = tilesBaseUrl();
  // Only rewrite to proxy if the app is configured to use /sbcat-tiles
  if (!base.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.includes(REMOTE_TILES_HOST) ||
      parsed.hostname.includes("happyglacier")
    ) {
      return `${base}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // relative already
  }
  return url;
}

export function modeledVolumeTileUrlTemplate(collectionId: string): string {
  return `${tilesBaseUrl()}/${collectionId}/{z}/{x}/{y}.pbf`;
}

export function modeledVolumeTileMetadataUrl(collectionId: string): string {
  return `${tilesBaseUrl()}/${collectionId}.json`;
}

export function modeledVolumeFeaturesCollectionUrl(
  collectionId: string
): string {
  return `${FEATURES_BASE}/collections/${collectionId}`;
}

export interface ModeledVolumeTileStyleOptions {
  collectionId: string;
  field: string;
  geometry: ModeledVolumeGeometry;
  bins: ModeledVolumeBin[];
  bounds?: [number, number, number, number];
  minzoom?: number;
  maxzoom?: number;
}

/**
 * Low zoom tiles for the dense Strava network / res-11 hexes pack too many
 * features into one MVT and cause tileserv timeouts / connection resets when
 * ArcGIS requests many tiles in parallel. Only request workable scales.
 */
export const MODELED_VOLUME_TILE_MINZOOM: Record<ModeledVolumeGeometry, number> =
  {
    segment: 12,
    /** Res-9 overview loads from this zoom; finer LODs kick in higher up. */
    hexagon: 9,
  };

export const MODELED_VOLUME_TILE_MAXZOOM = 22;

export function defaultTileMinZoom(geometry: ModeledVolumeGeometry): number {
  return MODELED_VOLUME_TILE_MINZOOM[geometry];
}

/**
 * Mapbox-style JSON for ArcGIS VectorTileLayer over pg_tileserv MVT.
 * source-layer matches the tileserv layer id (e.g. modeled_volumes.hexagon_volumes_cos_bike).
 */
export function buildModeledVolumeTileStyle(
  options: ModeledVolumeTileStyleOptions
): __esri.VectorTileLayerProperties["style"] {
  const {
    collectionId,
    field,
    geometry,
    bins,
    bounds = [-120.68, 33.46, -119.02, 35.12],
    minzoom = defaultTileMinZoom(geometry),
    maxzoom = MODELED_VOLUME_TILE_MAXZOOM,
  } = options;

  const tileUrl = modeledVolumeTileUrlTemplate(collectionId);
  const high = getVolumeLevelColor("high", geometry === "hexagon");
  const medium = getVolumeLevelColor("medium", geometry === "hexagon");
  const low = getVolumeLevelColor("low", geometry === "hexagon");

  const binFilter =
    bins.length > 0 && bins.length < MODELED_VOLUME_BINS.length
      ? (["in", ["get", field], ["literal", bins]] as unknown[])
      : bins.length === 0
        ? (["==", ["get", field], "__none__"] as unknown[])
        : undefined;

  const paint =
    geometry === "hexagon"
      ? {
          "fill-color": [
            "match",
            ["get", field],
            "High",
            high,
            "Medium",
            medium,
            "Low",
            low,
            "#cccccc",
          ],
          "fill-outline-color": "#6E6E6E",
          "fill-opacity": 0.75,
        }
      : {
          "line-color": [
            "match",
            ["get", field],
            "High",
            high,
            "Medium",
            medium,
            "Low",
            low,
            "#cccccc",
          ],
          "line-width": [
            "match",
            ["get", field],
            "High",
            4,
            "Medium",
            3,
            "Low",
            2,
            1,
          ],
          "line-opacity": 0.95,
        };

  const styleLayer: Record<string, unknown> = {
    id: "modeled-volumes",
    type: geometry === "hexagon" ? "fill" : "line",
    source: "modeled",
    "source-layer": collectionId,
    minzoom,
    maxzoom,
    layout: {},
    paint,
  };
  if (binFilter) {
    styleLayer.filter = binFilter;
  }

  return {
    version: 8,
    sources: {
      modeled: {
        type: "vector",
        tiles: [tileUrl],
        bounds,
        minzoom,
        maxzoom,
      },
    },
    layers: [styleLayer],
  } as __esri.VectorTileLayerProperties["style"];
}

export function createModeledVolumeTileLayer(options: {
  layerId: string;
  title: string;
  collectionId: string;
  field: string;
  geometry: ModeledVolumeGeometry;
  bins: ModeledVolumeBin[];
  bounds?: [number, number, number, number];
}): VectorTileLayer {
  return new VectorTileLayer({
    id: options.layerId,
    title: options.title,
    listMode: "show",
    style: buildModeledVolumeTileStyle({
      collectionId: options.collectionId,
      field: options.field,
      geometry: options.geometry,
      bins: options.bins,
      bounds: options.bounds,
    }),
  });
}

export async function fetchModeledVolumeTileMetadata(
  collectionId: string
): Promise<{
  bounds?: [number, number, number, number];
  fields: string[];
  minzoom?: number;
  maxzoom?: number;
}> {
  const url = modeledVolumeTileMetadataUrl(collectionId);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Tileserv metadata failed (${response.status})`);
  }
  const data = (await response.json()) as {
    bounds?: number[];
    properties?: Array<{ name?: string }>;
    minzoom?: number;
    maxzoom?: number;
  };
  const bounds =
    data.bounds && data.bounds.length === 4
      ? (data.bounds as [number, number, number, number])
      : undefined;
  return {
    bounds,
    fields: (data.properties || [])
      .map((p) => p.name || "")
      .filter(Boolean),
    minzoom: data.minzoom,
    maxzoom: data.maxzoom,
  };
}

export interface ModeledVolumeIdentifyHit {
  id: number | string | null;
  attributes: Record<string, unknown>;
  street?: string | null;
}

/**
 * Query featureserv for features near a map click (small screen buffer → bbox).
 */
export async function identifyModeledVolumeAtPoint(options: {
  collectionId: string;
  mapView: __esri.MapView;
  mapPoint: __esri.Point;
  bufferPixels?: number;
  limit?: number;
}): Promise<ModeledVolumeIdentifyHit | null> {
  const {
    collectionId,
    mapView,
    mapPoint,
    bufferPixels = 8,
    limit = 5,
  } = options;

  const screen = mapView.toScreen(mapPoint);
  if (!screen) return null;

  const cornerA = mapView.toMap({
    x: screen.x - bufferPixels,
    y: screen.y - bufferPixels,
  });
  const cornerB = mapView.toMap({
    x: screen.x + bufferPixels,
    y: screen.y + bufferPixels,
  });
  if (!cornerA || !cornerB) return null;

  const toLonLat = (pt: Point): [number, number] => {
    const geographic =
      pt.spatialReference?.isWGS84 || pt.spatialReference?.wkid === 4326
        ? pt
        : (webMercatorUtils.webMercatorToGeographic(pt) as Point);
    return [geographic.longitude ?? geographic.x, geographic.latitude ?? geographic.y];
  };

  const [lon1, lat1] = toLonLat(cornerA as Point);
  const [lon2, lat2] = toLonLat(cornerB as Point);
  const minx = Math.min(lon1, lon2);
  const maxx = Math.max(lon1, lon2);
  const miny = Math.min(lat1, lat2);
  const maxy = Math.max(lat1, lat2);

  const collectionUrl = maybeProxyFeatureservUrl(
    modeledVolumeFeaturesCollectionUrl(collectionId)
  );
  const url =
    `${collectionUrl.replace(/\/$/, "")}/items` +
    `?f=json&limit=${limit}&bbox=${minx},${miny},${maxx},${maxy}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Identify failed (${response.status})`);
  }
  const payload = (await response.json()) as {
    features?: Array<{
      id?: number | string;
      properties?: Record<string, unknown> | null;
    }>;
  };
  const feature = payload.features?.[0];
  if (!feature) return null;

  const attributes = { ...(feature.properties || {}) };
  return {
    id: (attributes.id as number | string | undefined) ?? feature.id ?? null,
    attributes,
    street: (attributes.street as string | undefined) ?? null,
  };
}
