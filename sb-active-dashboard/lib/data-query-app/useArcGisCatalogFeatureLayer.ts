import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useEffect, useRef, useState } from "react";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import {
  ArcGisFeatureLayerMetadata,
  fetchArcGisFeatureLayerMetadata,
} from "@/lib/data-services/ArcGisFeatureLayerMetadataService";
import { catalogLayerId } from "@/lib/data-query-app/catalogLayerFactory";
import {
  applyGenericFeatureLayerVisualization,
  DEFAULT_GENERIC_FEATURE_LAYER_VISUALIZATION,
  GenericFeatureLayerVisualizationState,
  getStylableFieldType,
  inferVisualizationFromLayer,
  listStylableLayerFields,
  pickDefaultStylableField,
  rendererFromPortalJson,
  shouldUsePortalRenderer,
} from "@/lib/data-query-app/genericFeatureLayerVisualization";
import { optimizeFeatureLayerTileQueries } from "@/lib/data-query-app/catalogFeatureLayerPerformance";

interface UseArcGisCatalogFeatureLayerArgs {
  mapView: __esri.MapView | null;
  dataset: CatalogDataset | null;
  enabled: boolean;
  visualization: GenericFeatureLayerVisualizationState;
  onVisualizationChange?: (next: GenericFeatureLayerVisualizationState) => void;
}

interface UseArcGisCatalogFeatureLayerResult {
  loading: boolean;
  error: string | null;
  metadata: ArcGisFeatureLayerMetadata | null;
  metadataLoading: boolean;
  metadataError: string | null;
  numericFields: __esri.Field[];
  layerReady: boolean;
}

export function useArcGisCatalogFeatureLayer({
  mapView,
  dataset,
  enabled,
  visualization,
  onVisualizationChange,
}: UseArcGisCatalogFeatureLayerArgs): UseArcGisCatalogFeatureLayerResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ArcGisFeatureLayerMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [numericFields, setNumericFields] = useState<__esri.Field[]>([]);
  const [layerReady, setLayerReady] = useState(false);
  const initializedIdsRef = useRef<Set<number>>(new Set());
  const visualizationRef = useRef(visualization);
  visualizationRef.current = visualization;
  const onVisualizationChangeRef = useRef(onVisualizationChange);
  onVisualizationChangeRef.current = onVisualizationChange;

  // Fetch ArcGIS service + portal metadata (panel can show info before layer is enabled)
  useEffect(() => {
    if (!dataset) {
      setMetadata(null);
      setMetadataError(null);
      setMetadataLoading(false);
      return;
    }

    let cancelled = false;
    setMetadataLoading(true);
    setMetadataError(null);

    fetchArcGisFeatureLayerMetadata(dataset)
      .then((result) => {
        if (cancelled) return;
        setMetadata(result);
        if (!result) {
          setMetadataError("Could not load service metadata.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setMetadataError(err instanceof Error ? err.message : String(err));
        setMetadata(null);
      })
      .finally(() => {
        if (!cancelled) setMetadataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataset?.id]);

  // Load layer fields once when the catalog layer appears on the map
  useEffect(() => {
    if (!mapView?.map || !dataset || !enabled) {
      if (!enabled) {
        setLayerReady(false);
        setNumericFields([]);
      }
      setLoading(false);
      setError(null);
      return;
    }

    const layerId = catalogLayerId(dataset.id);
    let cancelled = false;
    let layerHandle: __esri.WatchHandle | null = null;
    let attached = false;

    const attach = async () => {
      if (cancelled || attached) return;

      const layer = mapView.map!.findLayerById(layerId);
      if (!layer || layer.type !== "feature") return;

      attached = true;
      layerHandle?.remove();
      layerHandle = null;

      const featureLayer = layer as FeatureLayer;
      setLoading(true);
      setError(null);

      try {
        await featureLayer.load();
        if (cancelled) return;

        const fields = listStylableLayerFields(featureLayer);
        setNumericFields(fields);
        setLayerReady(true);

        const portalRendererJson = metadata?.portalLayerRenderer;
        const portalField = metadata?.portalLayerRendererField;
        if (
          portalRendererJson &&
          shouldUsePortalRenderer(visualizationRef.current, portalRendererJson)
        ) {
          const portalRenderer = rendererFromPortalJson(portalRendererJson);
          if (portalRenderer) {
            featureLayer.renderer = portalRenderer;
          }
        }

        await optimizeFeatureLayerTileQueries(featureLayer, {
          extraOutFields: [
            portalField ?? visualizationRef.current.field ?? "class_export",
          ],
        });

        if (!initializedIdsRef.current.has(dataset.id)) {
          initializedIdsRef.current.add(dataset.id);
          const inferred = inferVisualizationFromLayer(featureLayer);
          const defaultField =
            portalField ??
            inferred.field ??
            pickDefaultStylableField(featureLayer)?.name ??
            fields[0]?.name ??
            null;
          const defaultFieldMeta = fields.find((f) => f.name === defaultField);
          const next: GenericFeatureLayerVisualizationState = {
            ...DEFAULT_GENERIC_FEATURE_LAYER_VISUALIZATION,
            ...inferred,
            field: defaultField,
            fieldType:
              inferred.fieldType ??
              (defaultFieldMeta
                ? getStylableFieldType(defaultFieldMeta)
                : portalField && defaultField === portalField
                  ? "categorical"
                  : null),
          };
          visualizationRef.current = next;
          onVisualizationChangeRef.current?.(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLayerReady(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (mapView.map.findLayerById(layerId)) {
      attach();
    } else {
      layerHandle = mapView.map.layers.on("change", () => {
        attach();
      });
    }

    return () => {
      cancelled = true;
      layerHandle?.remove();
    };
  }, [
    mapView,
    dataset?.id,
    enabled,
    metadata?.portalLayerRenderer,
    metadata?.portalLayerRendererField,
  ]);

  // Re-apply portal symbology when metadata arrives after the layer was attached
  useEffect(() => {
    if (
      !mapView?.map ||
      !dataset ||
      !enabled ||
      !layerReady ||
      !metadata?.portalLayerRenderer
    ) {
      return;
    }

    const layer = mapView.map.findLayerById(catalogLayerId(dataset.id));
    if (!layer || layer.type !== "feature") return;

    const portalRendererJson = metadata.portalLayerRenderer;
    const portalField = metadata.portalLayerRendererField;
    if (
      !portalRendererJson ||
      !shouldUsePortalRenderer(visualizationRef.current, portalRendererJson)
    ) {
      return;
    }

    const portalRenderer = rendererFromPortalJson(portalRendererJson);
    if (!portalRenderer) return;

    const featureLayer = layer as FeatureLayer;
    featureLayer.renderer = portalRenderer;

    void optimizeFeatureLayerTileQueries(featureLayer, {
      extraOutFields: [portalField ?? visualizationRef.current.field ?? "class_export"],
    });

    if (!visualizationRef.current.field && portalField) {
      const fields = listStylableLayerFields(layer as FeatureLayer);
      const defaultFieldMeta = fields.find((f) => f.name === portalField);
      const next: GenericFeatureLayerVisualizationState = {
        ...visualizationRef.current,
        field: portalField,
        fieldType: defaultFieldMeta
          ? getStylableFieldType(defaultFieldMeta)
          : "categorical",
      };
      visualizationRef.current = next;
      onVisualizationChangeRef.current?.(next);
    }
  }, [
    mapView,
    dataset?.id,
    enabled,
    layerReady,
    metadata?.portalLayerRenderer,
    metadata?.portalLayerRendererField,
  ]);

  // Apply visualization when controls change (separate from attach to avoid loops)
  useEffect(() => {
    if (!mapView?.map || !dataset || !enabled || !layerReady) return;

    const layer = mapView.map.findLayerById(catalogLayerId(dataset.id));
    if (!layer || layer.type !== "feature") return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const featureLayer = layer as FeatureLayer;
    applyGenericFeatureLayerVisualization(
      featureLayer,
      mapView,
      visualization,
      { portalRendererJson: metadata?.portalLayerRenderer }
    )
      .then(() =>
        optimizeFeatureLayerTileQueries(featureLayer, {
          extraOutFields: [
            visualization.field ??
              metadata?.portalLayerRendererField ??
              "class_export",
          ],
        })
      )
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    mapView,
    dataset?.id,
    enabled,
    layerReady,
    visualization.field,
    visualization.fieldType,
    visualization.classificationMethod,
    visualization.numClasses,
    visualization.opacity,
    metadata?.portalLayerRenderer,
  ]);

  return {
    loading,
    error,
    metadata,
    metadataLoading,
    metadataError,
    numericFields,
    layerReady,
  };
}
