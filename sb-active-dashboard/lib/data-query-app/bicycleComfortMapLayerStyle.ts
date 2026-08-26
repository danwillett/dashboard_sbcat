import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import { fetchArcGisFeatureLayerMetadata } from "@/lib/data-services/ArcGisFeatureLayerMetadataService";
import { optimizeFeatureLayerTileQueries } from "@/lib/data-query-app/catalogFeatureLayerPerformance";
import { rendererFromPortalJson } from "@/lib/data-query-app/genericFeatureLayerVisualization";

/**
 * Apply portal / ArcGIS Online symbology for catalog feature layers (e.g. Bike Comfort Map).
 * Matches the default styling used in Data Query and Download.
 */
export async function applyCatalogFeatureLayerPortalStyle(
  layer: FeatureLayer,
  dataset: CatalogDataset
): Promise<void> {
  await layer.load();

  const metadata = await fetchArcGisFeatureLayerMetadata(dataset);
  const portalRendererJson = metadata?.portalLayerRenderer;

  if (portalRendererJson) {
    const portalRenderer = rendererFromPortalJson(portalRendererJson);
    if (portalRenderer) {
      layer.renderer = portalRenderer;
    }
  }

  await optimizeFeatureLayerTileQueries(layer, {
    extraOutFields: [metadata?.portalLayerRendererField ?? "class_export"],
  });
}

export async function applyBicycleComfortMapLayerStyle(
  layer: FeatureLayer,
  dataset: CatalogDataset
): Promise<void> {
  await applyCatalogFeatureLayerPortalStyle(layer, dataset);
}
