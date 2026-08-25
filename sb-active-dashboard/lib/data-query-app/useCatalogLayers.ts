import { useCallback, useEffect, useRef, useState } from "react";
import {
  CatalogCategoryNode,
  CatalogDataset,
  collectDefaultOnDatasetIds,
  fetchCatalogTree,
  filterVisibleCatalogTree,
  findDatasetInTree,
} from "@/lib/data-services/CatalogApiService";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import {
  catalogLayerId,
  createLayerForCatalogDataset,
  isCatalogLayerId,
} from "@/lib/data-query-app/catalogLayerFactory";
import { optimizeFeatureLayerTileQueries } from "@/lib/data-query-app/catalogFeatureLayerPerformance";
import { isCountSurveyDataset } from "@/lib/data-query-app/countSurveyFilters";
import { isModeledVolumeDataset } from "@/lib/data-query-app/modeledVolumeFilters";
import {
  isDemographicsOrHealthCatalogDataset,
} from "@/lib/data-query-app/genericCatalogDataset";
import { applyGenericCatalogFeatureLayerPopup } from "@/lib/data-query-app/genericCatalogFeatureLayerPopupTemplate";

interface UseCatalogLayersResult {
  tree: CatalogCategoryNode[];
  loading: boolean;
  error: string | null;
  enabledIds: Set<number>;
  layerErrors: Record<number, string>;
  toggleDataset: (datasetId: number, enabled: boolean) => void;
  refresh: () => Promise<void>;
}

/**
 * Load catalog categories/datasets and sync toggled layers onto the map.
 * Count-survey and modeled-volume datasets are skipped here — they are managed
 * by dedicated hooks so filters / geometry toggles can apply.
 */
export function useCatalogLayers(
  mapView: __esri.MapView | null
): UseCatalogLayersResult {
  const [tree, setTree] = useState<CatalogCategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabledIds, setEnabledIds] = useState<Set<number>>(new Set());
  const [layerErrors, setLayerErrors] = useState<Record<number, string>>({});
  const treeRef = useRef<CatalogCategoryNode[]>([]);
  const defaultsAppliedRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fetchCatalogTree();
      const visible = filterVisibleCatalogTree(raw);
      treeRef.current = visible;
      setTree(visible);
      setError(null);

      if (!defaultsAppliedRef.current) {
        const defaults = collectDefaultOnDatasetIds(visible);
        if (defaults.length > 0) {
          setEnabledIds(new Set(defaults));
        }
        defaultsAppliedRef.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const removeCatalogLayers = useCallback((map: __esri.Map) => {
    const toRemove = map.layers
      .toArray()
      .filter((layer) => isCatalogLayerId(layer.id));
    toRemove.forEach((layer) => map.remove(layer));
  }, []);

  // Sync enabled dataset ids -> map layers
  useEffect(() => {
    if (!mapView?.map) return;
    const map = mapView.map;
    let cancelled = false;

    const sync = async () => {
      const desired = new Set(
        [...enabledIds].map((id) => catalogLayerId(id))
      );

      // Remove layers that are no longer enabled
      map.layers.toArray().forEach((layer) => {
        if (isCatalogLayerId(layer.id) && !desired.has(layer.id)) {
          map.remove(layer);
        }
      });

      const nextErrors: Record<number, string> = {};

      for (const datasetId of enabledIds) {
        if (cancelled) return;
        const layerId = catalogLayerId(datasetId);
        const existing = map.findLayerById(layerId);
        if (existing) continue;

        const dataset = findDatasetInTree(treeRef.current, datasetId);
        if (!dataset) {
          nextErrors[datasetId] = "Dataset not found in catalog";
          continue;
        }

        // Managed by useCountSurveyFilteredLayer / useModeledVolumeFilteredLayer
        if (isCountSurveyDataset(dataset)) continue;
        if (isModeledVolumeDataset(dataset)) continue;

        try {
          const layer = await createLayerForCatalogDataset(dataset);
          if (cancelled) return;
          map.add(layer);
          // Load to surface failures early
          if (typeof (layer as any).load === "function") {
            await (layer as any).load();
            if (layer.type === "feature") {
              const featureLayer = layer as FeatureLayer;
              if (isDemographicsOrHealthCatalogDataset(dataset, treeRef.current)) {
                await applyGenericCatalogFeatureLayerPopup(featureLayer);
              }
              await optimizeFeatureLayerTileQueries(featureLayer);
            }
          }
        } catch (err) {
          nextErrors[datasetId] =
            err instanceof Error ? err.message : String(err);
        }
      }

      if (!cancelled) {
        setLayerErrors(nextErrors);
      }
    };

    sync();

    return () => {
      cancelled = true;
    };
  }, [mapView, enabledIds]);

  // Clear catalog layers when map unmounts / changes
  useEffect(() => {
    return () => {
      if (mapView?.map) {
        removeCatalogLayers(mapView.map);
      }
    };
  }, [mapView, removeCatalogLayers]);

  const toggleDataset = useCallback((datasetId: number, enabled: boolean) => {
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(datasetId);
      else next.delete(datasetId);
      return next;
    });
    if (!enabled) {
      setLayerErrors((prev) => {
        const { [datasetId]: _, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  return {
    tree,
    loading,
    error,
    enabledIds,
    layerErrors,
    toggleDataset,
    refresh,
  };
}

export type { CatalogDataset };
