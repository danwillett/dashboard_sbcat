import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import { fetchVolumeSurveySites } from "@/lib/data-services/VolumeSitesApiService";
import {
  catalogLayerId,
  createClientFeatureLayerFromGeoJson,
  isCatalogLayerId,
} from "@/lib/data-query-app/catalogLayerFactory";
import {
  CountSurveyFilterState,
  isCountSurveyDataset,
} from "@/lib/data-query-app/countSurveyFilters";
import { filterSitesByGeographicSelection } from "@/lib/data-query-app/countSurveyGeography";
import {
  buildCountSurveyCrossTabs,
  computeCountSurveyAvailabilityStats,
  computeCountSiteJurisdictionBreakdown,
  EMPTY_COUNT_SURVEY_STATS,
  FilteredCountSurveyStats,
} from "@/lib/data-query-app/countSurveyStats";
import {
  applyCountSurveyVisualization,
  CountSurveyVisualizationState,
  DEFAULT_COUNT_SURVEY_VISUALIZATION,
} from "@/lib/data-query-app/countSurveyVisualization";
import {
  fetchVolumeAadtPeriods,
  VolumeAadtPeriodRow,
} from "@/lib/data-services/VolumeSitesApiService";
import { VolumeSite } from "@/lib/volume-app/siteTemporalQuery";
import { exportCountSurveyCsv } from "@/lib/data-query-app/exportCountSurveyCsv";
import { applyCountSurveySiteHighlight } from "@/lib/volume-app/createCountSurveySitesLayer";
import { createCountSurveySitePopupTemplate } from "@/lib/volume-app/countSurveyPopupTemplate";

interface UseCountSurveyFilteredLayerArgs {
  mapView: __esri.MapView | null;
  dataset: CatalogDataset | null;
  enabled: boolean;
  filters: CountSurveyFilterState;
  visualization?: CountSurveyVisualizationState;
  selectedSiteId?: string | null;
  onSiteSelect?: (siteId: string | null, siteName?: string | null) => void;
}

interface UseCountSurveyFilteredLayerResult {
  sites: VolumeSite[];
  siteCount: number | null;
  availableYears: number[];
  loading: boolean;
  error: string | null;
  vizLoading: boolean;
  vizError: string | null;
  vizYearLabel: string | null;
  availabilityStats: FilteredCountSurveyStats;
  availabilityStatsLoading: boolean;
  jurisdictionStatsLoading: boolean;
  loadJurisdictionBreakdown: (
    level: "city" | "service-area"
  ) => Promise<void>;
  exportFilteredData: () => Promise<{ rowCount: number; truncated: boolean }>;
}

function sitesToGeoJsonFeatures(sites: VolumeSite[]) {
  return sites
    .filter((site) => site.lon != null && site.lat != null)
    .map((site) => ({
      id: site.id,
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [site.lon as number, site.lat as number],
      },
      properties: {
        id: site.id,
        name: site.name,
        source: site.source,
        viz_aadt: 0,
      },
    }));
}

/**
 * Manage the count-survey catalog layer with API temporal filters + panel-only
 * geographic selection (no boundary layers drawn on the map).
 */
export function useCountSurveyFilteredLayer({
  mapView,
  dataset,
  enabled,
  filters,
  visualization = DEFAULT_COUNT_SURVEY_VISUALIZATION,
  selectedSiteId = null,
  onSiteSelect,
}: UseCountSurveyFilteredLayerArgs): UseCountSurveyFilteredLayerResult {
  const [sites, setSites] = useState<VolumeSite[]>([]);
  const [siteCount, setSiteCount] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vizLoading, setVizLoading] = useState(false);
  const [vizError, setVizError] = useState<string | null>(null);
  const [vizYearLabel, setVizYearLabel] = useState<string | null>(null);
  const [availabilityStats, setAvailabilityStats] =
    useState<FilteredCountSurveyStats>(EMPTY_COUNT_SURVEY_STATS);
  const [availabilityStatsLoading, setAvailabilityStatsLoading] =
    useState(false);
  const [jurisdictionStatsLoading, setJurisdictionStatsLoading] =
    useState(false);

  const sitesRef = useRef<VolumeSite[]>([]);
  sitesRef.current = sites;
  const periodsRef = useRef<VolumeAadtPeriodRow[]>([]);

  const requestIdRef = useRef(0);
  const vizRequestIdRef = useRef(0);
  const layerRef = useRef<FeatureLayer | null>(null);
  const visualizationRef = useRef(visualization);
  visualizationRef.current = visualization;
  const onSiteSelectRef = useRef(onSiteSelect);
  onSiteSelectRef.current = onSiteSelect;

  const removeLayer = useCallback(() => {
    if (!mapView?.map || !dataset) return;
    const layerId = catalogLayerId(dataset.id);
    const existing = mapView.map.findLayerById(layerId);
    if (existing) mapView.map.remove(existing);
    layerRef.current = null;
  }, [mapView, dataset]);

  useEffect(() => {
    if (!mapView?.map || !dataset || !enabled || !isCountSurveyDataset(dataset)) {
      if (!enabled) {
        removeLayer();
        setSites([]);
        setSiteCount(null);
        setError(null);
        setLoading(false);
        setVizYearLabel(null);
      }
      return;
    }

    const map = mapView.map;
    const layerId = catalogLayerId(dataset.id);
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const handle = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      (async () => {
        try {
          const result = await fetchVolumeSurveySites(filters.siteFilters);
          if (cancelled || requestId !== requestIdRef.current) return;

          const spatiallyFiltered = await filterSitesByGeographicSelection(
            result.sites,
            filters.geographic
          );
          if (cancelled || requestId !== requestIdRef.current) return;

          if (result.availableYears.length > 0) {
            setAvailableYears(result.availableYears);
          }

          const existing = map.findLayerById(layerId);
          if (existing) map.remove(existing);

          if (spatiallyFiltered.length === 0) {
            layerRef.current = null;
            setSites([]);
            setSiteCount(0);
            setError(
              result.fromApi
                ? "No survey sites match the current filters."
                : "Live volume API unavailable and no matching sites found."
            );
            return;
          }

          const layer = createClientFeatureLayerFromGeoJson(
            dataset,
            sitesToGeoJsonFeatures(spatiallyFiltered)
          ) as FeatureLayer;

          layer.popupEnabled = true;
          layer.popupTemplate = createCountSurveySitePopupTemplate();

          map.add(layer);
          if (typeof layer.load === "function") {
            await layer.load();
          }

          layerRef.current = layer;
          setSites(spatiallyFiltered);
          setSiteCount(spatiallyFiltered.length);

          try {
            const vizResult = await applyCountSurveyVisualization(
              layer,
              visualizationRef.current,
              {
                years: filters.siteFilters.years,
                selectedSiteId:
                  visualizationRef.current.mode === "uniform"
                    ? selectedSiteId
                    : null,
              }
            );
            if (!cancelled && requestId === requestIdRef.current) {
              setVizYearLabel(vizResult.yearUsedLabel);
              setVizError(null);
            }
          } catch (vizErr) {
            if (!cancelled && requestId === requestIdRef.current) {
              setVizError(
                vizErr instanceof Error ? vizErr.message : String(vizErr)
              );
            }
          }

          if (!result.fromApi) {
            setError(
              "Live volume API is unavailable; showing sites from the feature service when possible."
            );
          } else {
            setError(null);
          }
        } catch (err) {
          if (cancelled || requestId !== requestIdRef.current) return;
          removeLayer();
          setSites([]);
          setSiteCount(null);
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
    // selectedSiteId / visualization applied in dedicated effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapView, dataset, enabled, filters, removeLayer]);

  // Re-apply visualization when settings or years change (without refetching sites)
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !enabled) return;

    const requestId = ++vizRequestIdRef.current;
    let cancelled = false;
    setVizLoading(true);

    applyCountSurveyVisualization(layer, visualization, {
      years: filters.siteFilters.years,
      selectedSiteId: null,
    })
      .then((result) => {
        if (cancelled || requestId !== vizRequestIdRef.current) return;
        setVizYearLabel(result.yearUsedLabel);
        setVizError(null);
        if (visualization.mode === "uniform") {
          applyCountSurveySiteHighlight(layer, selectedSiteId);
        }
      })
      .catch((err: Error) => {
        if (cancelled || requestId !== vizRequestIdRef.current) return;
        setVizError(err.message || "Failed to update visualization");
      })
      .finally(() => {
        if (!cancelled && requestId === vizRequestIdRef.current) {
          setVizLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // selectedSiteId handled in highlight effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualization, filters.siteFilters.years, enabled, siteCount]);

  // Highlight selected site only for uniform styling (AADT renderer uses viz field)
  useEffect(() => {
    if (!layerRef.current) return;
    if (visualization.mode === "uniform") {
      applyCountSurveySiteHighlight(layerRef.current, selectedSiteId);
    }
  }, [selectedSiteId, visualization.mode]);

  // Click → select site (popup still opens via ArcGIS default behavior)
  useEffect(() => {
    if (!mapView || !enabled || !dataset) return;

    const layerId = catalogLayerId(dataset.id);
    const handle = mapView.on("click", async (event) => {
      try {
        const hit = await mapView.hitTest(event);
        const siteHit = hit.results.find((result: any) => {
          const layer = result.graphic?.layer;
          return (
            layer &&
            isCatalogLayerId(layer.id) &&
            layer.id === layerId &&
            result.graphic
          );
        }) as { graphic?: __esri.Graphic } | undefined;

        if (siteHit?.graphic) {
          const attrs = siteHit.graphic.attributes || {};
          const siteId = attrs.id != null ? String(attrs.id) : null;
          const siteName = attrs.name ? String(attrs.name) : null;
          if (siteId) {
            onSiteSelectRef.current?.(siteId, siteName);
          }
        }
      } catch (err) {
        console.warn("Count survey site click failed:", err);
      }
    });

    return () => handle.remove();
  }, [mapView, dataset, enabled]);

  useEffect(() => {
    return () => {
      removeLayer();
    };
  }, [removeLayer]);

  const siteIdsKey = useMemo(
    () => sites.map((s) => s.id).join(","),
    [sites]
  );

  useEffect(() => {
    if (!enabled || sites.length === 0) {
      setAvailabilityStats(EMPTY_COUNT_SURVEY_STATS);
      periodsRef.current = [];
      setAvailabilityStatsLoading(false);
      return;
    }

    let cancelled = false;
    setAvailabilityStatsLoading(true);

    fetchVolumeAadtPeriods(
      filters.siteFilters,
      sites.map((site) => site.id)
    )
      .then(({ periods, truncated }) => {
        if (cancelled) return;
        periodsRef.current = periods;
        setAvailabilityStats(
          computeCountSurveyAvailabilityStats(sites, periods, { truncated })
        );
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.warn("Count survey availability stats failed:", err);
        periodsRef.current = [];
        setAvailabilityStats(
          computeCountSurveyAvailabilityStats(sites, [], { truncated: false })
        );
      })
      .finally(() => {
        if (!cancelled) setAvailabilityStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, siteIdsKey, filters.siteFilters]);

  const loadJurisdictionBreakdown = useCallback(
    async (level: "city" | "service-area") => {
      const currentSites = sitesRef.current;
      if (currentSites.length === 0) return;
      setJurisdictionStatsLoading(true);
      try {
        const { byJurisdiction, siteJurisdiction } =
          await computeCountSiteJurisdictionBreakdown(currentSites, level);
        const crossTabs = buildCountSurveyCrossTabs(
          currentSites,
          periodsRef.current,
          siteJurisdiction
        );
        setAvailabilityStats((prev) => ({
          ...prev,
          byJurisdiction,
          crossTabs,
        }));
      } catch (err) {
        console.warn("Count site jurisdiction breakdown failed:", err);
      } finally {
        setJurisdictionStatsLoading(false);
      }
    },
    []
  );

  const exportFilteredData = useCallback(async () => {
    const currentSites = sitesRef.current;
    if (currentSites.length === 0) {
      throw new Error("No survey sites match the current filters.");
    }
    const result = await exportCountSurveyCsv(
      currentSites,
      filters.siteFilters
    );
    return { rowCount: result.rowCount, truncated: result.truncated };
  }, [filters.siteFilters]);

  return {
    sites,
    siteCount,
    availableYears,
    loading,
    error,
    vizLoading,
    vizError,
    vizYearLabel,
    availabilityStats,
    availabilityStatsLoading,
    jurisdictionStatsLoading,
    loadJurisdictionBreakdown,
    exportFilteredData,
  };
}
