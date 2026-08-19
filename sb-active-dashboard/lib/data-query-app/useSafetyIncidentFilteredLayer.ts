import { useEffect, useRef, useState, useCallback } from "react";
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import {
  catalogLayerId,
  isCatalogLayerId,
} from "@/lib/data-query-app/catalogLayerFactory";
import {
  buildSafetyIncidentWhereClause,
  isSafetyIncidentDataset,
  SafetyIncidentFilterState,
} from "@/lib/data-query-app/safetyIncidentFilters";
import { fetchPlaceBoundaryGeometry } from "@/lib/data-query-app/countSurveyGeography";
import {
  applySafetyIncidentVisualization,
  DEFAULT_SAFETY_INCIDENT_VISUALIZATION,
  SafetyIncidentVisualizationState,
} from "@/lib/data-query-app/safetyIncidentVisualization";
import {
  incidentObjectId,
  queryFilteredIncidents,
  queryIncidentByObjectId,
  SafetyIncidentSummary,
  summarizeIncidentAttributes,
} from "@/lib/data-query-app/safetyIncidentQuery";
import {
  computeFilteredIncidentStats,
  computeJurisdictionBreakdown,
  emptyIncidentStats,
  FilteredIncidentStats,
  listJurisdictionPlaces,
} from "@/lib/data-query-app/safetyIncidentStats";
import { exportSafetyIncidentsCsv } from "@/lib/data-query-app/exportSafetyIncidentsCsv";

interface UseSafetyIncidentFilteredLayerArgs {
  mapView: __esri.MapView | null;
  dataset: CatalogDataset | null;
  enabled: boolean;
  filters: SafetyIncidentFilterState;
  visualization?: SafetyIncidentVisualizationState;
  selectedIncidentId?: string | null;
  onIncidentSelect?: (
    objectId: string | null,
    summary?: SafetyIncidentSummary | null
  ) => void;
}

interface UseSafetyIncidentFilteredLayerResult {
  incidentCount: number | null;
  incidents: SafetyIncidentSummary[];
  incidentsTruncated: boolean;
  selectedIncident: SafetyIncidentSummary | null;
  incidentLayerUrl: string | null;
  loading: boolean;
  error: string | null;
  filterStats: FilteredIncidentStats;
  filterStatsLoading: boolean;
  jurisdictionStatsLoading: boolean;
  loadJurisdictionBreakdown: (level: "city" | "service-area") => Promise<void>;
  exportFilteredData: () => Promise<{ rowCount: number; truncated: boolean }>;
}

function graphicObjectId(graphic: __esri.Graphic): string | null {
  const fromApi =
    typeof (graphic as any).getObjectId === "function"
      ? (graphic as any).getObjectId()
      : null;
  if (fromApi != null && fromApi !== "") return String(fromApi);
  return incidentObjectId((graphic.attributes || {}) as Record<string, unknown>);
}

/**
 * Apply Safety-page-style attribute + panel geographic filters to the catalog
 * Safety Incidents FeatureLayer (definitionExpression + layerView FeatureFilter).
 */
export function useSafetyIncidentFilteredLayer({
  mapView,
  dataset,
  enabled,
  filters,
  visualization = DEFAULT_SAFETY_INCIDENT_VISUALIZATION,
  selectedIncidentId = null,
  onIncidentSelect,
}: UseSafetyIncidentFilteredLayerArgs): UseSafetyIncidentFilteredLayerResult {
  const [incidentCount, setIncidentCount] = useState<number | null>(null);
  const [incidents, setIncidents] = useState<SafetyIncidentSummary[]>([]);
  const [incidentsTruncated, setIncidentsTruncated] = useState(false);
  const [selectedIncident, setSelectedIncident] =
    useState<SafetyIncidentSummary | null>(null);
  const [incidentLayerUrl, setIncidentLayerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStats, setFilterStats] =
    useState<FilteredIncidentStats>(emptyIncidentStats);
  const [filterStatsLoading, setFilterStatsLoading] = useState(false);
  const [jurisdictionStatsLoading, setJurisdictionStatsLoading] =
    useState(false);
  const requestIdRef = useRef(0);
  const statsRequestIdRef = useRef(0);
  const layerRef = useRef<FeatureLayer | null>(null);
  const boundaryRef = useRef<__esri.Polygon | null>(null);
  const highlightHandleRef = useRef<__esri.Handle | null>(null);
  const onIncidentSelectRef = useRef(onIncidentSelect);
  onIncidentSelectRef.current = onIncidentSelect;
  const visualizationRef = useRef(visualization);
  visualizationRef.current = visualization;

  useEffect(() => {
    if (!mapView?.map || !dataset || !enabled || !isSafetyIncidentDataset(dataset)) {
      if (!enabled) {
        setIncidentCount(null);
        setIncidents([]);
        setSelectedIncident(null);
        setError(null);
        setLoading(false);
      }
      return;
    }

    const layerId = catalogLayerId(dataset.id);
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const handle = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      (async () => {
        try {
          let layer: FeatureLayer | null = null;
          for (let i = 0; i < 20; i++) {
            const found = mapView.map!.findLayerById(layerId);
            if (found && found.type === "feature") {
              layer = found as FeatureLayer;
              break;
            }
            await new Promise((r) => setTimeout(r, 100));
          }

          if (!layer) {
            throw new Error("Safety Incidents layer is not on the map yet.");
          }

          if (cancelled || requestId !== requestIdRef.current) return;

          layer.popupEnabled = true;
          layer.outFields = ["*"];
          await applySafetyIncidentVisualization(layer, visualizationRef.current);
          if (cancelled || requestId !== requestIdRef.current) return;

          layerRef.current = layer;
          setIncidentLayerUrl(layer.url || dataset.feature_service_url || null);

          const where = buildSafetyIncidentWhereClause(filters.filters);
          layer.definitionExpression = where;

          const layerView = (await mapView.whenLayerView(
            layer
          )) as __esri.FeatureLayerView;
          if (cancelled || requestId !== requestIdRef.current) return;

          // Service drawingInfo can win until the layer view is ready — re-apply.
          await applySafetyIncidentVisualization(layer, visualizationRef.current);
          if (cancelled || requestId !== requestIdRef.current) return;

          let boundary = null as __esri.Polygon | null;
          if (
            filters.geographic.level !== "county" &&
            filters.geographic.placeName
          ) {
            boundary = await fetchPlaceBoundaryGeometry(
              filters.geographic.placeName
            );
            if (cancelled || requestId !== requestIdRef.current) return;
            if (!boundary) {
              throw new Error(
                `Could not load boundary for "${filters.geographic.placeName}"`
              );
            }
            layerView.filter = new FeatureFilter({
              geometry: boundary,
              spatialRelationship: "intersects",
            });
          } else {
            layerView.filter = null;
          }

          boundaryRef.current = boundary;

          const query = layer.createQuery();
          query.where = where;
          query.returnGeometry = false;
          if (boundary) {
            query.geometry = boundary;
            query.spatialRelationship = "intersects";
          }
          const count = await layer.queryFeatureCount(query);
          if (cancelled || requestId !== requestIdRef.current) return;

          const listed = await queryFilteredIncidents(layer, {
            geometry: boundary,
          });
          if (cancelled || requestId !== requestIdRef.current) return;

          setIncidentCount(count);
          setIncidents(listed.incidents);
          setIncidentsTruncated(listed.truncated);
          setError(null);

          // Aggregate stats for Incident Analysis (async; don't block filter UI).
          const statsId = ++statsRequestIdRef.current;
          setFilterStatsLoading(true);
          computeFilteredIncidentStats(layer, {
            geometry: boundary,
            incidentLayerUrl: layer.url || dataset.feature_service_url || null,
          })
            .then((stats) => {
              if (cancelled || statsId !== statsRequestIdRef.current) return;
              setFilterStats(stats);
            })
            .catch((err) => {
              console.warn("Incident filter stats failed:", err);
              if (!cancelled && statsId === statsRequestIdRef.current) {
                setFilterStats(emptyIncidentStats());
              }
            })
            .finally(() => {
              if (!cancelled && statsId === statsRequestIdRef.current) {
                setFilterStatsLoading(false);
              }
            });
        } catch (err) {
          if (cancelled || requestId !== requestIdRef.current) return;
          setIncidentCount(null);
          setIncidents([]);
          setFilterStats(emptyIncidentStats());
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          if (!cancelled && requestId === requestIdRef.current) {
            setLoading(false);
          }
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [mapView, dataset, enabled, filters]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !enabled) return;
    let cancelled = false;
    (async () => {
      await applySafetyIncidentVisualization(layer, visualization);
      if (!cancelled && mapView) {
        try {
          await mapView.whenLayerView(layer);
          if (!cancelled) {
            await applySafetyIncidentVisualization(layer, visualization);
          }
        } catch {
          // Layer view not available yet
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visualization, enabled, mapView]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !selectedIncidentId) {
      setSelectedIncident(null);
      return;
    }

    const listed = incidents.find((row) => row.objectId === selectedIncidentId);
    if (listed) {
      setSelectedIncident(listed);
      return;
    }

    let cancelled = false;
    queryIncidentByObjectId(layer, selectedIncidentId)
      .then((summary) => {
        if (!cancelled && summary) setSelectedIncident(summary);
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedIncident((prev) =>
            prev?.objectId === selectedIncidentId ? prev : null
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedIncidentId, incidents]);

  useEffect(() => {
    if (!mapView || !enabled || !dataset) return;

    const layerId = catalogLayerId(dataset.id);
    const handle = mapView.on("click", async (event) => {
      try {
        const hit = await mapView.hitTest(event, {
          include: mapView.map?.findLayerById(layerId) || undefined,
        });
        const incidentHit = hit.results.find((result: any) => {
          const layer = result.graphic?.layer;
          return (
            layer &&
            isCatalogLayerId(layer.id) &&
            layer.id === layerId &&
            result.graphic
          );
        }) as { graphic?: __esri.Graphic } | undefined;

        if (incidentHit?.graphic) {
          const attrs = (incidentHit.graphic.attributes || {}) as Record<
            string,
            unknown
          >;
          const objectId = graphicObjectId(incidentHit.graphic);
          const summary =
            summarizeIncidentAttributes(
              objectId && !attrs.OBJECTID && !attrs.objectid
                ? { ...attrs, OBJECTID: Number(objectId) }
                : attrs
            ) ||
            (objectId
              ? {
                  objectId,
                  incidentId: null,
                  timestamp: null,
                  location: null,
                  severity: null,
                  conflictType: null,
                  dataSource: null,
                  pedestrianInvolved: false,
                  bicyclistInvolved: false,
                  vehicleInvolved: false,
                  attributes: attrs,
                }
              : null);

          if (objectId) {
            if (summary) setSelectedIncident(summary);
            onIncidentSelectRef.current?.(objectId, summary);
          }
        } else {
          // Clicked empty map / another layer — clear selection.
          setSelectedIncident(null);
          onIncidentSelectRef.current?.(null, null);
        }
      } catch (err) {
        console.warn("Safety incident click failed:", err);
      }
    });

    return () => handle.remove();
  }, [mapView, dataset, enabled]);

  // Highlight the selected incident (glow) and dim the rest.
  useEffect(() => {
    let cancelled = false;

    const clearHighlight = () => {
      highlightHandleRef.current?.remove();
      highlightHandleRef.current = null;
    };

    (async () => {
      const layer = layerRef.current;
      if (!mapView || !layer || !enabled) {
        clearHighlight();
        return;
      }

      try {
        const layerView = (await mapView.whenLayerView(
          layer
        )) as __esri.FeatureLayerView;
        if (cancelled) return;

        clearHighlight();
        layerView.featureEffect = null;

        if (!selectedIncidentId) return;

        const oid = Number(selectedIncidentId);
        if (!Number.isFinite(oid)) return;

        layerView.featureEffect = new FeatureEffect({
          filter: new FeatureFilter({ objectIds: [oid] }),
          includedEffect:
            "drop-shadow(0, 0, 12px, #0284c7) drop-shadow(0, 0, 4px, #38bdf8) saturate(1.35)",
          excludedEffect: "opacity(35%)",
        });

        try {
          const query = layer.createQuery();
          query.objectIds = [oid];
          query.returnGeometry = true;
          query.outFields = ["*"];
          const result = await layer.queryFeatures(query);
          const feature = result.features[0];
          if (!cancelled && feature && typeof layerView.highlight === "function") {
            highlightHandleRef.current = layerView.highlight(feature);
          }
        } catch {
          // Highlight API is best-effort; FeatureEffect still applies.
        }
      } catch {
        // Layer view not ready
      }
    })();

    return () => {
      cancelled = true;
      clearHighlight();
      const layer = layerRef.current;
      if (mapView && layer) {
        mapView
          .whenLayerView(layer)
          .then((lv: any) => {
            if (lv) lv.featureEffect = null;
          })
          .catch(() => undefined);
      }
    };
  }, [selectedIncidentId, mapView, enabled, loading]);

  useEffect(() => {
    if (!mapView?.map || !dataset || enabled) return;
    const layer = mapView.map.findLayerById(catalogLayerId(dataset.id));
    if (layer && layer.type === "feature") {
      const fl = layer as FeatureLayer;
      fl.definitionExpression = "1=1";
      mapView
        .whenLayerView(layer)
        .then((lv: any) => {
          if (lv) {
            lv.filter = null;
            lv.featureEffect = null;
          }
        })
        .catch(() => undefined);
    }
  }, [mapView, dataset, enabled]);

  const loadJurisdictionBreakdown = async (
    level: "city" | "service-area"
  ): Promise<void> => {
    const layer = layerRef.current;
    if (!layer) return;
    setJurisdictionStatsLoading(true);
    try {
      const places = await listJurisdictionPlaces(level);
      const rows = await computeJurisdictionBreakdown(layer, places);
      setFilterStats((prev) => ({ ...prev, byJurisdiction: rows }));
    } catch (err) {
      console.warn("Jurisdiction breakdown failed:", err);
    } finally {
      setJurisdictionStatsLoading(false);
    }
  };

  const exportFilteredData = useCallback(async () => {
    const layer = layerRef.current;
    if (!layer) {
      throw new Error("Turn on the Safety Incidents layer to export data.");
    }
    const result = await exportSafetyIncidentsCsv(layer, {
      geometry: boundaryRef.current,
    });
    return { rowCount: result.rowCount, truncated: result.truncated };
  }, []);

  return {
    incidentCount,
    incidents,
    incidentsTruncated,
    selectedIncident,
    incidentLayerUrl,
    loading,
    error,
    filterStats,
    filterStatsLoading,
    jurisdictionStatsLoading,
    loadJurisdictionBreakdown,
    exportFilteredData,
  };
}
