import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useEffect, useState } from "react";
import {
  CatalogCategoryNode,
  datasetDisplayTitle,
  findDatasetInTree,
} from "@/lib/data-services/CatalogApiService";
import { catalogLayerId } from "@/lib/data-query-app/catalogLayerFactory";
import { isArcGisFeatureCatalogDataset } from "@/lib/data-query-app/genericCatalogDataset";
import { MapZoomNotice } from "@/ui/data-query-app/components/DataQueryMapZoomNotice";

export function isMapZoomTooLowForFeatureLayer(
  mapView: __esri.MapView,
  layer: FeatureLayer
): boolean {
  const minScale = layer.minScale;
  if (!minScale || minScale <= 0) return false;
  const scale = mapView.scale;
  return typeof scale === "number" && Number.isFinite(scale) && scale > minScale;
}

/**
 * Map banner notices for enabled catalog feature layers that are zoom-gated
 * via minScale (e.g. bike comfort roads).
 */
export function useCatalogFeatureLayerZoomNotices(
  mapView: __esri.MapView | null,
  tree: CatalogCategoryNode[],
  enabledIds: Set<number>
): MapZoomNotice[] {
  const [notices, setNotices] = useState<MapZoomNotice[]>([]);

  useEffect(() => {
    if (!mapView?.map) {
      setNotices([]);
      return;
    }

    let cancelled = false;

    const sync = async () => {
      if (cancelled) return;

      const next: MapZoomNotice[] = [];

      for (const datasetId of enabledIds) {
        const dataset = findDatasetInTree(tree, datasetId);
        if (!dataset || !isArcGisFeatureCatalogDataset(dataset)) continue;

        const layer = mapView.map!.findLayerById(catalogLayerId(datasetId));
        if (!layer || layer.type !== "feature") continue;

        const featureLayer = layer as FeatureLayer;
        try {
          if (featureLayer.loadStatus !== "loaded") {
            await featureLayer.load();
          }
        } catch {
          continue;
        }

        if (cancelled) return;

        if (isMapZoomTooLowForFeatureLayer(mapView, featureLayer)) {
          next.push({
            layerName: datasetDisplayTitle(dataset),
            detail: "This layer only draws when zoomed in closer.",
          });
        }
      }

      if (!cancelled) setNotices(next);
    };

    sync();
    const scaleHandle = mapView.watch("scale", () => {
      void sync();
    });
    const layerHandle = mapView.map.layers.on("change", () => {
      void sync();
    });

    return () => {
      cancelled = true;
      scaleHandle.remove();
      layerHandle.remove();
    };
  }, [mapView, tree, enabledIds]);

  return notices;
}
