import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Graphic from "@arcgis/core/Graphic";
import Extent from "@arcgis/core/geometry/Extent";
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  CatalogCategoryNode,
  CatalogDataset,
  datasetDisplayTitle,
} from "@/lib/data-services/CatalogApiService";
import {
  catalogLayerId,
  createClientFeatureLayerFromGeoJson,
  fetchOgcCollectionItems,
  graphicFromGeoJsonFeature,
  maybeProxyFeatureservUrl,
  objectIdFromGeoJsonFeature,
} from "@/lib/data-query-app/catalogLayerFactory";
import {
  buildModeledVolumeBinWhere,
  discoverModeledVolumeYears,
  getModeledVolumeFieldName,
  ModeledVolumeCountType,
  ModeledVolumeModel,
} from "@/lib/data-query-app/modeledVolumeFields";
import {
  collectionForGeometry,
  isModeledVolumeDataset,
  ModeledVolumeFilterState,
  ModeledVolumeGeometry,
  resolveModeledVolumeIdentity,
} from "@/lib/data-query-app/modeledVolumeFilters";
import {
  hexagonLodCollectionId,
  hexResolutionForZoom,
  loadsFullHexCollection,
  MODELED_HEX_TO_SEGMENT_ZOOM,
  ModeledHexResolution,
  segmentFetchMaxFeatures,
  segmentViewportBboxPadRatio,
  segmentViewportContainMargin,
  viewportBboxContainMargin,
  viewportBboxPadRatio,
  viewportFetchMaxFeatures,
} from "@/lib/data-query-app/modeledVolumeHexResolution";
import {
  applyModeledVolumeVisualization,
  DEFAULT_MODELED_VOLUME_VISUALIZATION,
  ModeledVolumeVisualizationState,
} from "@/lib/data-query-app/modeledVolumeVisualization";
import { createModeledVolumeSegmentPopupTemplate } from "@/lib/data-query-app/modeledVolumeSegmentPopupTemplate";
import {
  defaultTileMinZoom,
  modeledVolumeFeaturesCollectionUrl,
} from "@/lib/data-query-app/modeledVolumeTiles";

interface UseModeledVolumeFilteredLayerArgs {
  mapView: __esri.MapView | null;
  tree: CatalogCategoryNode[];
  dataset: CatalogDataset | null;
  enabled: boolean;
  filters: ModeledVolumeFilterState;
  visualization?: ModeledVolumeVisualizationState;
  /** Fired when zoom crosses the hex → segment threshold. */
  onVisualizationChange?: (next: ModeledVolumeVisualizationState) => void;
  /** Last geometry explicitly chosen in the styling panel (null = default hex). */
  geometryUserChoiceRef?: RefObject<ModeledVolumeGeometry | null>;
}

interface UseModeledVolumeFilteredLayerResult {
  loading: boolean;
  error: string | null;
  featureCount: number | null;
  availableYears: number[];
  activeField: string | null;
  identityLabel: string | null;
  zoomTooLow: boolean;
  /** Active H3 resolution when geometry is hexagon; otherwise null. */
  activeResolution: ModeledHexResolution | null;
  /** True when the active hex LOD loaded the full county (not viewport-clipped). */
  fullExtentLoaded: boolean;
}

/** Soft cap on client-side viewport cache (hex res 10 + segments). */
const VIEWPORT_CACHE_MAX = 40000;
/** Full H3 res-9 county (~23k cos bike) — load once, keep on pan. */
const HEX_FULL_MAX_FEATURES = 40000;
const HEX_PAGE_LIMIT = 2000;
const SEGMENT_PAGE_LIMIT = 1000;
const VIEWPORT_DEBOUNCE_MS = 450;

type Wgs84Bbox = [number, number, number, number];

type CachedGeoJsonFeature = {
  id?: number | string;
  type?: string;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  } | null;
  properties?: Record<string, unknown> | null;
};

function featureCacheKey(feature: CachedGeoJsonFeature, index: number): string {
  const fromId = feature.id ?? feature.properties?.id;
  if (fromId != null && fromId !== "") return String(fromId);
  return `idx-${index}`;
}

function unionBbox(a: Wgs84Bbox, b: Wgs84Bbox): Wgs84Bbox {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.max(a[3], b[3]),
  ];
}

function extentToWgs84Bbox(extent: __esri.Extent): Wgs84Bbox | null {
  try {
    const geo =
      extent.spatialReference?.isWGS84 || extent.spatialReference?.wkid === 4326
        ? extent
        : (webMercatorUtils.webMercatorToGeographic(extent) as Extent);
    const xmin = geo.xmin;
    const ymin = geo.ymin;
    const xmax = geo.xmax;
    const ymax = geo.ymax;
    if (
      ![xmin, ymin, xmax, ymax].every((n) => typeof n === "number" && Number.isFinite(n))
    ) {
      return null;
    }
    return [
      Math.min(xmin, xmax),
      Math.min(ymin, ymax),
      Math.max(xmin, xmax),
      Math.max(ymin, ymax),
    ];
  } catch {
    return null;
  }
}

/** Expand bbox by padRatio of its width/height on each side. */
function padWgs84Bbox(bbox: Wgs84Bbox, padRatio: number): Wgs84Bbox {
  const [xmin, ymin, xmax, ymax] = bbox;
  const dx = Math.max(xmax - xmin, 1e-6) * padRatio;
  const dy = Math.max(ymax - ymin, 1e-6) * padRatio;
  return [xmin - dx, ymin - dy, xmax + dx, ymax + dy];
}

/** True if `inner` sits inside `outer` with a small inset margin. */
function bboxContains(
  outer: Wgs84Bbox,
  inner: Wgs84Bbox,
  marginRatio = 0.08
): boolean {
  const [ox0, oy0, ox1, oy1] = outer;
  const [ix0, iy0, ix1, iy1] = inner;
  const mx = (ox1 - ox0) * marginRatio;
  const my = (oy1 - oy0) * marginRatio;
  return (
    ix0 >= ox0 + mx &&
    iy0 >= oy0 + my &&
    ix1 <= ox1 - mx &&
    iy1 <= oy1 - my
  );
}

function applyModeledVolumeSegmentPopup(
  layer: FeatureLayer,
  geometry: ModeledVolumeGeometry,
  identity: {
    model: ModeledVolumeModel;
    countType: ModeledVolumeCountType;
  },
  field: string,
  year: number
): void {
  if (geometry !== "segment") {
    layer.popupTemplate = null;
    return;
  }
  layer.popupEnabled = true;
  layer.popupTemplate = createModeledVolumeSegmentPopupTemplate({
    model: identity.model,
    countType: identity.countType,
    field,
    year,
  });
}

/**
 * Modeled volumes via featureserv.
 * - Hex H3 res 9: load the full county once (no bbox), keep while panning
 * - Hex res 10 + segments: viewport bbox queries (segments at zoom 16+)
 */
export function useModeledVolumeFilteredLayer({
  mapView,
  tree,
  dataset,
  enabled,
  filters,
  visualization = DEFAULT_MODELED_VOLUME_VISUALIZATION,
  onVisualizationChange,
  geometryUserChoiceRef,
}: UseModeledVolumeFilteredLayerArgs): UseModeledVolumeFilteredLayerResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureCount, setFeatureCount] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [zoomTooLow, setZoomTooLow] = useState(false);
  const [extentVersion, setExtentVersion] = useState(0);
  const [activeResolution, setActiveResolution] =
    useState<ModeledHexResolution | null>(null);
  const [fullExtentLoaded, setFullExtentLoaded] = useState(false);

  const layerRef = useRef<FeatureLayer | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  /** Collection id for a full-county hex load already on the map. */
  const fullLoadKeyRef = useRef<string | null>(null);
  /** LOD key last scheduled for fetch — ignore pan when it hasn't changed. */
  const lastFetchLodKeyRef = useRef<string | null>(null);
  /** Padded bbox covering all viewport fetches for this LOD (union). */
  const lastViewportFetchBboxRef = useRef<Wgs84Bbox | null>(null);
  /** Client cache of hex features by id for the active viewport LOD collection. */
  const featureCacheRef = useRef<{
    collectionId: string;
    byId: Map<string, CachedGeoJsonFeature>;
  } | null>(null);
  /** OGC collection id currently on `layerRef` (viewport hex LOD). */
  const layerCollectionIdRef = useRef<string | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const visualizationRef = useRef(visualization);
  visualizationRef.current = visualization;

  const identity = useMemo(() => {
    if (!dataset || !isModeledVolumeDataset(dataset)) return null;
    return resolveModeledVolumeIdentity(tree, dataset);
  }, [tree, dataset]);

  const identityLabel = useMemo(() => {
    if (!identity) return null;
    const model =
      identity.model === "cost-benefit"
        ? "Cost-Benefit"
        : "Strava Bias-Corrected";
    const mode = identity.countType === "bike" ? "Bicycle" : "Pedestrian";
    return `${model} · ${mode}`;
  }, [identity]);

  const identityLabelRef = useRef(identityLabel);
  identityLabelRef.current = identityLabel;

  const hexCollectionBase = identity?.hexagonCollection ?? null;
  const segmentCollectionId = identity?.segmentCollection ?? null;
  const minZoom = defaultTileMinZoom(visualization.geometry);
  const binsKey = filters.bins.slice().sort().join(",");

  // Hexagon mode switches to segments at high zoom instead of showing res-11 hexes.
  useEffect(() => {
    if (!mapView || !enabled || !onVisualizationChange) return;

    const syncGeometryForZoom = () => {
      const zoom = mapView.zoom ?? 0;
      const current = visualizationRef.current.geometry;
      const prefersHex = geometryUserChoiceRef?.current !== "segment";

      if (zoom >= MODELED_HEX_TO_SEGMENT_ZOOM && current === "hexagon") {
        onVisualizationChange({ geometry: "segment" });
      } else if (
        zoom < MODELED_HEX_TO_SEGMENT_ZOOM &&
        current === "segment" &&
        prefersHex
      ) {
        onVisualizationChange({ geometry: "hexagon" });
      }
    };

    syncGeometryForZoom();
    const handle = mapView.watch("zoom", syncGeometryForZoom);
    return () => handle.remove();
  }, [mapView, enabled, onVisualizationChange, geometryUserChoiceRef]);

  // Debounced reload when the map stops moving.
  // Full-county hex (res 9): only bump when the LOD collection changes — never on pan.
  useEffect(() => {
    if (!mapView || !enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setExtentVersion((v) => v + 1), VIEWPORT_DEBOUNCE_MS);
    };

    const lodKeyForView = (): string | null => {
      const zoom = mapView.zoom ?? 0;
      if (visualizationRef.current.geometry === "hexagon") {
        if (!hexCollectionBase) return null;
        const res = hexResolutionForZoom(zoom);
        return hexagonLodCollectionId(hexCollectionBase, res);
      }
      return segmentCollectionId;
    };

    const scheduleIfNeeded = (force: boolean) => {
      const zoom = mapView.zoom ?? 0;
      const useHex = visualizationRef.current.geometry === "hexagon";
      const res = useHex ? hexResolutionForZoom(zoom) : null;
      if (useHex && res != null) {
        setActiveResolution((prev) => (prev === res ? prev : res));
      } else {
        setActiveResolution((prev) => (prev === null ? prev : null));
      }

      const lodKey = lodKeyForView();
      if (!lodKey) return;

      const wantsFull = res != null && loadsFullHexCollection(res);
      const containMargin = useHex
        ? viewportBboxContainMargin(res)
        : segmentViewportContainMargin();

      // Already have (or are loading) this full-county LOD — ignore pan entirely
      if (
        wantsFull &&
        (fullLoadKeyRef.current === lodKey ||
          lastFetchLodKeyRef.current === lodKey)
      ) {
        return;
      }

      // Viewport LOD: skip while still inside the padded/union coverage
      if (!force && !wantsFull && lastFetchLodKeyRef.current === lodKey) {
        const visible =
          mapView.extent != null ? extentToWgs84Bbox(mapView.extent) : null;
        const loaded = lastViewportFetchBboxRef.current;
        if (
          visible &&
          loaded &&
          bboxContains(loaded, visible, containMargin)
        ) {
          return;
        }
      }

      lastFetchLodKeyRef.current = lodKey;
      bump();
    };

    // Initial schedule: no-ops if this full LOD is already loaded / in flight
    scheduleIfNeeded(false);

    const handles = [
      mapView.watch("stationary", (stationary: boolean) => {
        if (stationary) scheduleIfNeeded(false);
      }),
    ];

    return () => {
      if (timer) clearTimeout(timer);
      handles.forEach((h) => h.remove());
    };
  }, [
    mapView,
    enabled,
    visualization.geometry,
    hexCollectionBase,
    segmentCollectionId,
  ]);

  // Load features
  useEffect(() => {
    if (!mapView?.map || !dataset || !enabled || !identity) {
      if (layerRef.current && mapView?.map) {
        mapView.map.remove(layerRef.current);
      }
      layerRef.current = null;
      fullLoadKeyRef.current = null;
      lastViewportFetchBboxRef.current = null;
      featureCacheRef.current = null;
      layerCollectionIdRef.current = null;
      setFeatureCount(null);
      setActiveField(null);
      setActiveResolution(null);
      setFullExtentLoaded(false);
      setZoomTooLow(false);
      setLoading(false);
      setError(null);
      return;
    }

    const zoom = mapView.zoom ?? 0;
    if (zoom < minZoom) {
      if (layerRef.current) {
        mapView.map.remove(layerRef.current);
        layerRef.current = null;
      }
      fullLoadKeyRef.current = null;
      lastViewportFetchBboxRef.current = null;
      featureCacheRef.current = null;
      layerCollectionIdRef.current = null;
      setZoomTooLow(true);
      setFeatureCount(null);
      setActiveResolution(null);
      setFullExtentLoaded(false);
      setLoading(false);
      setError(null);
      return;
    }
    setZoomTooLow(false);

    const useHex = visualization.geometry === "hexagon";
    const resolution = useHex ? hexResolutionForZoom(zoom) : null;
    if (useHex) {
      setActiveResolution((prev) =>
        prev === resolution ? prev : resolution
      );
    } else {
      setActiveResolution((prev) => (prev === null ? prev : null));
    }

    const collectionId = useHex
      ? hexagonLodCollectionId(identity.hexagonCollection, resolution!)
      : collectionForGeometry(identity, "segment");

    const loadFullHex =
      useHex && resolution != null && loadsFullHexCollection(resolution);

    // Switching LOD/collection clears the pan cache
    if (
      featureCacheRef.current &&
      featureCacheRef.current.collectionId !== collectionId
    ) {
      featureCacheRef.current = null;
      lastViewportFetchBboxRef.current = null;
    }

    // Already holding the full county layer — do nothing (no abort cleanup)
    if (
      loadFullHex &&
      fullLoadKeyRef.current === collectionId &&
      layerRef.current
    ) {
      setFullExtentLoaded(true);
      setLoading(false);
      return;
    }

    const visibleBbox = loadFullHex
      ? null
      : mapView.extent
        ? extentToWgs84Bbox(mapView.extent)
        : null;
    if (!loadFullHex && !visibleBbox) {
      setError("Could not read map extent");
      return;
    }

    const padRatio = useHex
      ? viewportBboxPadRatio(resolution)
      : segmentViewportBboxPadRatio();
    const bbox =
      visibleBbox != null ? padWgs84Bbox(visibleBbox, padRatio) : undefined;

    const map = mapView.map;
    const layerId = catalogLayerId(dataset.id);
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const collectionUrl = maybeProxyFeatureservUrl(
          modeledVolumeFeaturesCollectionUrl(collectionId)
        );
        const features = await fetchOgcCollectionItems(collectionUrl, {
          bbox,
          pageLimit: useHex ? HEX_PAGE_LIMIT : SEGMENT_PAGE_LIMIT,
          maxFeatures: loadFullHex
            ? HEX_FULL_MAX_FEATURES
            : useHex
              ? viewportFetchMaxFeatures(resolution)
              : segmentFetchMaxFeatures(),
          signal: abort.signal,
        });

        if (cancelled || requestId !== requestIdRef.current) return;

        // Merge into client cache for viewport loads so panning accumulates features
        let displayFeatures = features as CachedGeoJsonFeature[];
        let appendedToExistingLayer = false;
        if (!loadFullHex) {
          let cache = featureCacheRef.current;
          if (!cache || cache.collectionId !== collectionId) {
            cache = { collectionId, byId: new Map() };
            featureCacheRef.current = cache;
          }

          const newFeaturesForLayer: CachedGeoJsonFeature[] = [];
          features.forEach((f, index) => {
            const cached = f as CachedGeoJsonFeature;
            const key = featureCacheKey(cached, index);
            if (!cache!.byId.has(key)) {
              newFeaturesForLayer.push(cached);
            }
            cache!.byId.set(key, cached);
          });

          const evictedObjectIds: number[] = [];
          while (cache.byId.size > VIEWPORT_CACHE_MAX) {
            const oldest = cache.byId.keys().next().value;
            if (oldest == null) break;
            const evicted = cache.byId.get(oldest);
            if (evicted) {
              evictedObjectIds.push(
                objectIdFromGeoJsonFeature(evicted, 0)
              );
            }
            cache.byId.delete(oldest);
          }

          const existingLayer = layerRef.current;
          const canAppend =
            existingLayer != null &&
            existingLayer.id === layerId &&
            fullLoadKeyRef.current == null &&
            layerCollectionIdRef.current === collectionId;

          if (canAppend) {
            const addGraphics = newFeaturesForLayer
              .map((f, index) => graphicFromGeoJsonFeature(f, index))
              .filter((g): g is __esri.Graphic => g != null);

            if (addGraphics.length > 0) {
              await existingLayer.applyEdits({ addFeatures: addGraphics });
            }

            if (evictedObjectIds.length > 0) {
              await existingLayer.applyEdits({
                deleteFeatures: evictedObjectIds.map(
                  (objectId) =>
                    new Graphic({
                      attributes: { OBJECTID: objectId },
                    })
                ),
              });
            }

            if (bbox) {
              lastViewportFetchBboxRef.current =
                lastViewportFetchBboxRef.current
                  ? unionBbox(lastViewportFetchBboxRef.current, bbox)
                  : bbox;
            }
            setFeatureCount(cache.byId.size);
            setLoading(false);
            appendedToExistingLayer = true;
          }

          displayFeatures = Array.from(cache.byId.values());
        } else if (loadFullHex) {
          featureCacheRef.current = null;
        }

        if (appendedToExistingLayer) {
          return;
        }

        const fieldNames = new Set<string>();
        for (const f of displayFeatures) {
          Object.keys(f.properties || {}).forEach((k) => fieldNames.add(k));
        }
        const years = discoverModeledVolumeYears(
          fieldNames,
          identity.model,
          identity.countType
        );
        if (years.length > 0) setAvailableYears(years);

        const currentFilters = filtersRef.current;
        const currentViz = visualizationRef.current;
        const yearOptions =
          years.length > 0
            ? years
            : discoverModeledVolumeYears([], identity.model, identity.countType);
        let year = currentFilters.year;
        if (yearOptions.length > 0 && !yearOptions.includes(year)) {
          year = yearOptions[yearOptions.length - 1];
        }
        const field = getModeledVolumeFieldName({
          model: identity.model,
          year,
          countType: identity.countType,
        });

        if (displayFeatures.length === 0) {
          // Empty response (e.g. ocean) — keep any existing layer/cache
          if (!layerRef.current) {
            setActiveField(field);
            setFeatureCount(0);
            setFullExtentLoaded(false);
          }
          setLoading(false);
          return;
        }

        const synthetic: CatalogDataset = {
          ...dataset,
          service_path: collectionId,
          ogc_features_url: collectionUrl,
          display_title: dataset.display_title || datasetDisplayTitle(dataset),
        };

        const layer = createClientFeatureLayerFromGeoJson(
          synthetic,
          displayFeatures as Parameters<typeof createClientFeatureLayerFromGeoJson>[1]
        );
        applyModeledVolumeVisualization(layer, {
          field,
          geometry: currentViz.geometry,
          legendTitle: `${identityLabelRef.current || "Modeled AADT"} (${year})`,
          simplified: loadFullHex,
        });
        layer.definitionExpression = buildModeledVolumeBinWhere(
          field,
          currentFilters.bins
        );
        applyModeledVolumeSegmentPopup(
          layer,
          currentViz.geometry,
          identity,
          field,
          year
        );

        const existing = map.findLayerById(layerId);
        if (existing) map.remove(existing);
        map.add(layer);
        layerRef.current = layer;
        fullLoadKeyRef.current = loadFullHex ? collectionId : null;
        layerCollectionIdRef.current = loadFullHex ? null : collectionId;
        if (loadFullHex) {
          lastViewportFetchBboxRef.current = null;
        } else if (bbox) {
          lastViewportFetchBboxRef.current = lastViewportFetchBboxRef.current
            ? unionBbox(lastViewportFetchBboxRef.current, bbox)
            : bbox;
        }
        setActiveField(field);
        setFeatureCount(displayFeatures.length);
        setFullExtentLoaded(loadFullHex);
        setLoading(false);
      } catch (err) {
        if (cancelled || requestId !== requestIdRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : String(err);
        if (useHex && /not found|404|does not exist|unknown collection/i.test(message)) {
          setError(
            `Missing LOD collection ${collectionId}. Re-run migrate_to_modeled_aadt.py --views-only to create _r9/_r10/_r11 views.`
          );
        } else {
          setError(message);
        }
        setLoading(false);
        setFeatureCount(null);
        setFullExtentLoaded(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [
    mapView,
    dataset,
    enabled,
    minZoom,
    extentVersion,
    visualization.geometry,
    hexCollectionBase,
    segmentCollectionId,
    identity?.model,
    identity?.countType,
  ]);

  // Restyle when year/bins change without refetching geometry
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !identity || !enabled || zoomTooLow) return;

    const years =
      availableYears.length > 0
        ? availableYears
        : discoverModeledVolumeYears([], identity.model, identity.countType);
    let year = filters.year;
    if (years.length > 0 && !years.includes(year)) {
      year = years[years.length - 1];
    }
    const field = getModeledVolumeFieldName({
      model: identity.model,
      year,
      countType: identity.countType,
    });

    applyModeledVolumeVisualization(layer, {
      field,
      geometry: visualization.geometry,
      legendTitle: `${identityLabel || "Modeled AADT"} (${year})`,
      simplified:
        visualization.geometry === "hexagon" &&
        fullLoadKeyRef.current != null,
    });
    layer.definitionExpression = buildModeledVolumeBinWhere(field, filters.bins);
    applyModeledVolumeSegmentPopup(
      layer,
      visualization.geometry,
      identity,
      field,
      year
    );
    setActiveField((prev) => (prev === field ? prev : field));
  }, [
    identity,
    identityLabel,
    enabled,
    zoomTooLow,
    filters.year,
    binsKey,
    visualization.geometry,
    availableYears,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (layerRef.current && mapView?.map) {
        mapView.map.remove(layerRef.current);
      }
      layerRef.current = null;
    };
  }, [mapView]);

  return {
    loading,
    error,
    featureCount,
    availableYears:
      availableYears.length > 0
        ? availableYears
        : identity
          ? discoverModeledVolumeYears([], identity.model, identity.countType)
          : [],
    activeField,
    identityLabel,
    zoomTooLow,
    activeResolution,
    fullExtentLoaded,
  };
}
