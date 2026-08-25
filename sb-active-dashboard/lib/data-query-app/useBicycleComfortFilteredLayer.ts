import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import { useEffect, useRef, useState } from "react";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import { catalogLayerId } from "@/lib/data-query-app/catalogLayerFactory";
import {
  BicycleComfortFilterState,
  buildBicycleComfortCategoryWhereClause,
} from "@/lib/data-query-app/bicycleComfortMapFilters";
import { fetchPlaceBoundaryGeometry } from "@/lib/data-query-app/countSurveyGeography";
import {
  listBicycleComfortCategories,
  listBicycleComfortJurisdictionPlaces,
} from "@/lib/data-query-app/bicycleComfortMapStats";

interface UseBicycleComfortFilteredLayerArgs {
  mapView: __esri.MapView | null;
  dataset: CatalogDataset | null;
  enabled: boolean;
  filters: BicycleComfortFilterState;
  categoryField?: string | null;
}

interface UseBicycleComfortFilteredLayerResult {
  loading: boolean;
  error: string | null;
  featureCount: number | null;
  availableCategories: string[];
  categoriesLoading: boolean;
  jurisdictionPlaces: string[];
  jurisdictionPlacesLoading: boolean;
}

export function useBicycleComfortFilteredLayer({
  mapView,
  dataset,
  enabled,
  filters,
  categoryField,
}: UseBicycleComfortFilteredLayerArgs): UseBicycleComfortFilteredLayerResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureCount, setFeatureCount] = useState<number | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [jurisdictionPlaces, setJurisdictionPlaces] = useState<string[]>([]);
  const [jurisdictionPlacesLoading, setJurisdictionPlacesLoading] =
    useState(false);
  const requestIdRef = useRef(0);
  const layerRef = useRef<FeatureLayer | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    const level = filters.geographic.level;
    if (
      !enabled ||
      (level !== "city" && level !== "service-area")
    ) {
      setJurisdictionPlaces([]);
      return;
    }

    let cancelled = false;
    setJurisdictionPlacesLoading(true);

    listBicycleComfortJurisdictionPlaces(level)
      .then((places) => {
        if (!cancelled) setJurisdictionPlaces(places.map((p) => p.name));
      })
      .catch(() => {
        if (!cancelled) setJurisdictionPlaces([]);
      })
      .finally(() => {
        if (!cancelled) setJurisdictionPlacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, filters.geographic.level]);

  useEffect(() => {
    if (!mapView?.map || !dataset || !enabled) {
      if (!enabled) {
        layerRef.current = null;
        setFeatureCount(null);
        setAvailableCategories([]);
        setError(null);
        setLoading(false);
      }
      return;
    }

    const layerId = catalogLayerId(dataset.id);
    const requestId = ++requestIdRef.current;
    let cancelled = false;
    let extentHandle: __esri.WatchHandle | null = null;
    let stationaryHandle: __esri.WatchHandle | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let countDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    const resolveLayer = async (): Promise<FeatureLayer> => {
      let layer: FeatureLayer | null = layerRef.current;
      if (!layer) {
        for (let i = 0; i < 20; i++) {
          const found = mapView.map!.findLayerById(layerId);
          if (found && found.type === "feature") {
            layer = found as FeatureLayer;
            break;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      if (!layer) {
        throw new Error("Bicycle comfort layer is not on the map yet.");
      }

      await layer.load();
      layerRef.current = layer;
      return layer;
    };

    const geographicFilterGeometry = async (): Promise<__esri.Geometry | undefined> => {
      const { geographic } = filtersRef.current;

      if (geographic.level === "extent" && mapView.extent) {
        return mapView.extent.clone();
      }

      if (
        (geographic.level === "city" || geographic.level === "service-area") &&
        geographic.placeName
      ) {
        const boundary = await fetchPlaceBoundaryGeometry(geographic.placeName);
        if (!boundary) {
          throw new Error(
            `Could not load boundary for "${geographic.placeName}"`
          );
        }
        return boundary;
      }

      return undefined;
    };

    const refreshFeatureCount = async () => {
      try {
        const layer = await resolveLayer();
        if (cancelled || requestId !== requestIdRef.current) return;

        const activeFilters = filtersRef.current;
        const field =
          categoryField && layer.fields?.some((f) => f.name === categoryField)
            ? categoryField
            : "class_export";
        const where = buildBicycleComfortCategoryWhereClause(activeFilters, field);
        const filterGeometry = await geographicFilterGeometry();
        if (cancelled || requestId !== requestIdRef.current) return;

        const countQuery = layer.createQuery();
        countQuery.where = where;
        if (filterGeometry) {
          countQuery.geometry = filterGeometry;
          countQuery.spatialRelationship = "intersects";
        }
        const count = await layer.queryFeatureCount(countQuery);
        if (cancelled || requestId !== requestIdRef.current) return;

        setFeatureCount(count);
        setError(count === 0 ? "No road segments match the current filters." : null);
      } catch (err) {
        if (cancelled || requestId !== requestIdRef.current) return;
        setFeatureCount(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    const applyLayerFilters = async () => {
      setLoading(true);
      setError(null);

      try {
        const layer = await resolveLayer();
        if (cancelled || requestId !== requestIdRef.current) return;

        const activeFilters = filtersRef.current;
        const field =
          categoryField && layer.fields?.some((f) => f.name === categoryField)
            ? categoryField
            : "class_export";
        const where = buildBicycleComfortCategoryWhereClause(activeFilters, field);
        layer.definitionExpression = where;

        const layerView = (await mapView.whenLayerView(
          layer
        )) as __esri.FeatureLayerView;
        if (cancelled || requestId !== requestIdRef.current) return;

        const filterGeometry = await geographicFilterGeometry();
        if (cancelled || requestId !== requestIdRef.current) return;

        if (filterGeometry) {
          layerView.filter = new FeatureFilter({
            geometry: filterGeometry,
            spatialRelationship: "intersects",
          });
        } else {
          layerView.filter = null;
        }

        await refreshFeatureCount();
      } catch (err) {
        if (cancelled || requestId !== requestIdRef.current) return;
        setFeatureCount(null);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    const updateExtentGeographicFilter = async () => {
      try {
        const layer = await resolveLayer();
        if (cancelled || requestId !== requestIdRef.current) return;

        const layerView = (await mapView.whenLayerView(
          layer
        )) as __esri.FeatureLayerView;
        if (cancelled || requestId !== requestIdRef.current) return;

        const filterGeometry = await geographicFilterGeometry();
        if (cancelled || requestId !== requestIdRef.current) return;

        if (filterGeometry) {
          layerView.filter = new FeatureFilter({
            geometry: filterGeometry,
            spatialRelationship: "intersects",
          });
        } else {
          layerView.filter = null;
        }
      } catch {
        // Keep map responsive while panning; count refresh runs when view is stationary.
      }
    };

    const debouncedApply = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void applyLayerFilters();
      }, 250);
    };

    const debouncedExtentFilter = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void updateExtentGeographicFilter();
      }, 120);
    };

    const debouncedCountRefresh = () => {
      if (countDebounceTimer) clearTimeout(countDebounceTimer);
      countDebounceTimer = setTimeout(() => {
        void refreshFeatureCount();
      }, 400);
    };

    debouncedApply();

    if (filters.geographic.level === "extent") {
      extentHandle = mapView.watch("extent", () => {
        debouncedExtentFilter();
      });
      stationaryHandle = mapView.watch("stationary", (stationary) => {
        if (stationary) debouncedCountRefresh();
      });
    }

    return () => {
      cancelled = true;
      extentHandle?.remove();
      stationaryHandle?.remove();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (countDebounceTimer) clearTimeout(countDebounceTimer);
    };
  }, [
    mapView,
    dataset?.id,
    enabled,
    categoryField,
    filters.geographic.level,
    filters.geographic.placeName,
    filters.categoryFilterEnabled,
    filters.selectedCategories,
  ]);

  useEffect(() => {
    if (!mapView?.map || !dataset || !enabled) {
      setAvailableCategories([]);
      setCategoriesLoading(false);
      return;
    }

    const layerId = catalogLayerId(dataset.id);
    let cancelled = false;
    setCategoriesLoading(true);

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
        if (!layer || cancelled) return;
        const categories = await listBicycleComfortCategories(
          layer,
          categoryField ?? undefined
        );
        if (!cancelled) setAvailableCategories(categories);
      } catch {
        if (!cancelled) setAvailableCategories([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapView, dataset?.id, enabled, categoryField]);

  return {
    loading,
    error,
    featureCount,
    availableCategories,
    categoriesLoading,
    jurisdictionPlaces,
    jurisdictionPlacesLoading,
  };
}
