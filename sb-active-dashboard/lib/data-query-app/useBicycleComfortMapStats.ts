import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useEffect, useRef, useState } from "react";
import { catalogLayerId } from "@/lib/data-query-app/catalogLayerFactory";
import {
  BicycleComfortFilterState,
  buildBicycleComfortCategoryWhereClause,
  describeBicycleComfortGeographic,
} from "@/lib/data-query-app/bicycleComfortMapFilters";
import { fetchPlaceBoundaryGeometry } from "@/lib/data-query-app/countSurveyGeography";
import {
  BicycleComfortCategoryStats,
  fetchBicycleComfortCategoryStats,
} from "@/lib/data-query-app/bicycleComfortMapStats";

interface UseBicycleComfortMapStatsArgs {
  mapView: __esri.MapView | null;
  datasetId: number | null;
  enabled: boolean;
  categoryField?: string | null;
  filters: BicycleComfortFilterState;
}

interface UseBicycleComfortMapStatsResult {
  stats: BicycleComfortCategoryStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBicycleComfortMapStats({
  mapView,
  datasetId,
  enabled,
  categoryField,
  filters,
}: UseBicycleComfortMapStatsArgs): UseBicycleComfortMapStatsResult {
  const [stats, setStats] = useState<BicycleComfortCategoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    if (!mapView || !enabled || datasetId == null) {
      setStats(null);
      setError(null);
      setLoading(false);
      return;
    }

    const layerId = catalogLayerId(datasetId);
    const layer = mapView.map?.findLayerById(layerId);
    if (!layer || layer.type !== "feature") {
      setStats(null);
      setLoading(false);
      return;
    }

    const { geographic } = filters;
    if (
      (geographic.level === "city" || geographic.level === "service-area") &&
      !geographic.placeName
    ) {
      setStats(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let extentHandle: __esri.WatchHandle | null = null;
    let extentTimer: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const featureLayer = layer as FeatureLayer;
        await featureLayer.load();
        if (cancelled) return;

        const activeFilters = filtersRef.current;
        const { geographic: geo } = activeFilters;
        const field =
          categoryField && featureLayer.fields?.some((f) => f.name === categoryField)
            ? categoryField
            : "class_export";

        let extent: __esri.Extent | undefined;
        let geometry: __esri.Geometry | undefined;
        let scopeKind: "full" | "extent" | "jurisdiction" = "full";
        const scopeLabel = describeBicycleComfortGeographic(geo);

        if (geo.level === "extent" && mapView.extent) {
          extent = mapView.extent.clone();
          scopeKind = "extent";
        } else if (geo.level === "city" || geo.level === "service-area") {
          if (!geo.placeName) {
            throw new Error("Select a jurisdiction to view statistics.");
          }
          const boundary = await fetchPlaceBoundaryGeometry(geo.placeName);
          if (!boundary) {
            throw new Error(
              `Could not load boundary for "${geo.placeName}"`
            );
          }
          geometry = boundary;
          scopeKind = "jurisdiction";
        }

        const additionalWhere = buildBicycleComfortCategoryWhereClause(
          activeFilters,
          field
        );

        const result = await fetchBicycleComfortCategoryStats(featureLayer, {
          categoryField: field,
          extent,
          geometry,
          scope: scopeKind,
          scopeLabel,
          additionalWhere,
        });
        if (!cancelled) {
          setStats(result);
        }
      } catch (err) {
        if (!cancelled) {
          setStats(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    if (filters.geographic.level === "extent") {
      const bumpExtent = () => {
        if (extentTimer) clearTimeout(extentTimer);
        extentTimer = setTimeout(() => {
          setRefreshToken((v) => v + 1);
        }, 400);
      };
      extentHandle = mapView.watch("extent", bumpExtent);
    }

    return () => {
      cancelled = true;
      extentHandle?.remove();
      if (extentTimer) clearTimeout(extentTimer);
    };
  }, [
    mapView,
    datasetId,
    enabled,
    categoryField,
    filters.geographic.level,
    filters.geographic.placeName,
    filters.categoryFilterEnabled,
    filters.selectedCategories,
    refreshToken,
  ]);

  return {
    stats,
    loading,
    error,
    refresh: () => setRefreshToken((v) => v + 1),
  };
}
