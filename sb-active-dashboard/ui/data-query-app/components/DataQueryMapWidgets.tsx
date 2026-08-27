import { useEffect, useRef, useState, type ReactNode } from "react";
import Collection from "@arcgis/core/core/Collection";
import LayerList from "@arcgis/core/widgets/LayerList";
import Legend from "@arcgis/core/widgets/Legend";
import ActionButton from "@arcgis/core/support/actions/ActionButton";
import { CalciteIcon } from "@esri/calcite-components-react";
import {
  EQUITY_CUSTOM_BIN_CONTEXT_LAYER_ID,
  EQUITY_CUSTOM_BIN_INFRASTRUCTURE_LAYER_ID,
  EQUITY_LAYER_PROP_TITLE_MAIN,
  isEquityAnalysisResultLayerId,
  parseEquityAnalysisIdFromResultLayerId,
} from "@/lib/infrastructure-equity-app/infrastructureEquityPinned";
import "../data-query-map-widgets.css";

interface DataQueryMapWidgetsProps {
  mapView: __esri.MapView | null;
  /** Managed layer legends (count surveys, safety, modeled volume) above the Esri legend. */
  customLegend?: ReactNode;
  /** When set, equity analysis result layers get a remove action in the layer list. */
  onEquityAnalysisRemove?: (analysisId: string) => void;
  /** When set, custom bin preview layers get a remove action in the layer list. */
  onEquityCustomBinPreviewRemove?: (
    axis: "infrastructure" | "context"
  ) => void;
  /** DOM id for the widget root (for page-specific styling). */
  widgetsRootId?: string;
  /** Hide the Esri Legend widget (use with customLegend for analysis-only views). */
  hideEsriLegend?: boolean;
  /** Show the legend panel even when no custom legend is provided. */
  showLegendPanel?: boolean;
  /** Legend panel header when the panel is open. */
  legendPanelTitle?: string;
  /** Hide layer-list visibility toggles. */
  hideLayerListVisibility?: boolean;
}

function decorateEquityResultListItem(event: {
  item: __esri.ListItem;
}) {
  const layer = event.item.layer;
  const layerId = layer?.id != null ? String(layer.id) : undefined;
  if (!isEquityAnalysisResultLayerId(layerId)) return;

  const layerRecord = layer as __esri.FeatureLayer & {
    get?: (key: string) => unknown;
  };
  const titleMain = (layerRecord.get?.(EQUITY_LAYER_PROP_TITLE_MAIN) ??
    layer?.title) as string | undefined;

  if (titleMain) {
    event.item.title = titleMain;
  }
}

/**
 * LayerList (top-left) and Legend (bottom-left) with inline panels — no Expand popout.
 */
export default function DataQueryMapWidgets({
  mapView,
  customLegend,
  onEquityAnalysisRemove,
  onEquityCustomBinPreviewRemove,
  widgetsRootId = "data-query-map-widgets",
  hideEsriLegend = false,
  showLegendPanel,
  legendPanelTitle = "Legend",
  hideLayerListVisibility = false,
}: DataQueryMapWidgetsProps) {
  const [layerListOpen, setLayerListOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const layerListContainerRef = useRef<HTMLDivElement>(null);
  const legendContainerRef = useRef<HTMLDivElement>(null);
  const layerListRef = useRef<LayerList | null>(null);
  const legendRef = useRef<Legend | null>(null);
  const autoOpenedRef = useRef(false);
  const onEquityAnalysisRemoveRef = useRef(onEquityAnalysisRemove);
  onEquityAnalysisRemoveRef.current = onEquityAnalysisRemove;
  const onEquityCustomBinPreviewRemoveRef = useRef(
    onEquityCustomBinPreviewRemove
  );
  onEquityCustomBinPreviewRemoveRef.current = onEquityCustomBinPreviewRemove;

  // LayerList is independent of legend visibility so toggling layers does not reset the list.
  useEffect(() => {
    if (!mapView || !layerListContainerRef.current) {
      return;
    }

    const layerList = new LayerList({
      view: mapView,
      container: layerListContainerRef.current,
      dragEnabled: true,
      visibilityAppearance: "checkbox",
      listItemCreatedFunction: (event) => {
        const container = event.item.panel?.container as HTMLElement | undefined;
        if (container) {
          container.classList.add("calcite-mode-light");
          container.style.colorScheme = "light";
        }

        decorateEquityResultListItem(event);

        const layerId = event.item.layer?.id;
        const layerIdStr = layerId != null ? String(layerId) : undefined;
        const actions: __esri.ActionButton[] = [];

        if (
          onEquityAnalysisRemoveRef.current &&
          isEquityAnalysisResultLayerId(layerIdStr)
        ) {
          actions.push(
            new ActionButton({
              title: "Remove analysis",
              id: "remove-equity-analysis",
              icon: "trash",
            })
          );
        }

        if (
          onEquityCustomBinPreviewRemoveRef.current &&
          (layerIdStr === EQUITY_CUSTOM_BIN_CONTEXT_LAYER_ID ||
            layerIdStr === EQUITY_CUSTOM_BIN_INFRASTRUCTURE_LAYER_ID)
        ) {
          actions.push(
            new ActionButton({
              title: "Remove bin preview",
              id: "remove-equity-custom-bins",
              icon: "trash",
            })
          );
        }

        if (actions.length > 0) {
          event.item.actionsSections = new Collection([
            new Collection(actions),
          ]);
        }
      },
    });

    const handleLayerListAction = layerList.on("trigger-action", (event) => {
      const layerId = event.item.layer?.id;
      const layerIdStr = layerId != null ? String(layerId) : undefined;
      if (!layerIdStr) return;

      if (event.action.id === "remove-equity-analysis") {
        if (!isEquityAnalysisResultLayerId(layerIdStr)) return;
        const analysisId = parseEquityAnalysisIdFromResultLayerId(layerIdStr);
        if (analysisId) {
          onEquityAnalysisRemoveRef.current?.(analysisId);
        }
        return;
      }

      if (event.action.id === "remove-equity-custom-bins") {
        if (layerIdStr === EQUITY_CUSTOM_BIN_CONTEXT_LAYER_ID) {
          onEquityCustomBinPreviewRemoveRef.current?.("context");
        } else if (layerIdStr === EQUITY_CUSTOM_BIN_INFRASTRUCTURE_LAYER_ID) {
          onEquityCustomBinPreviewRemoveRef.current?.("infrastructure");
        }
      }
    });

    layerList.when().then(() => {
      const container = layerList.container as HTMLElement | undefined;
      if (container) {
        container.classList.add("calcite-mode-light");
        container.style.colorScheme = "light";
      }
    });

    layerListRef.current = layerList;

    return () => {
      handleLayerListAction.remove();
      layerList.destroy();
      layerListRef.current = null;
    };
  }, [mapView]);

  useEffect(() => {
    if (!mapView || hideEsriLegend || !legendContainerRef.current) {
      if (legendRef.current) {
        legendRef.current.destroy();
        legendRef.current = null;
      }
      return;
    }

    const legend = new Legend({
      view: mapView,
      container: legendContainerRef.current,
    });

    legend.when().then(() => {
      const container = legend.container as HTMLElement | undefined;
      if (container) {
        container.classList.add("calcite-mode-light");
        container.style.colorScheme = "light";
      }
    });

    legendRef.current = legend;

    return () => {
      legend.destroy();
      legendRef.current = null;
    };
  }, [mapView, hideEsriLegend]);

  // Open panels when layers or custom legend content appear
  useEffect(() => {
    if (!mapView?.map) return;

    const map = mapView.map;
    const tryAutoOpen = () => {
      if (!autoOpenedRef.current && (map.layers.length > 0 || customLegend)) {
        autoOpenedRef.current = true;
        setLayerListOpen(true);
        if (customLegend || !hideEsriLegend) {
          setLegendOpen(true);
        }
      }
    };

    tryAutoOpen();
    const handle = map.layers.on("change", tryAutoOpen);
    return () => handle.remove();
  }, [mapView, customLegend, hideEsriLegend, showLegendPanel]);

  const legendPanelVisible =
    showLegendPanel ?? Boolean(customLegend || !hideEsriLegend);

  // Open the legend when custom legend content appears (e.g. equity analysis).
  useEffect(() => {
    if (customLegend && legendPanelVisible) {
      setLegendOpen(true);
    }
  }, [customLegend, legendPanelVisible]);

  // Open the legend when any layer is turned on.
  useEffect(() => {
    if (!mapView?.map || !legendPanelVisible) return;

    const map = mapView.map;
    const watchHandles: __esri.WatchHandle[] = [];

    const bindLayerVisibility = (layer: __esri.Layer) => {
      watchHandles.push(
        layer.watch("visible", (visible: boolean) => {
          if (visible) setLegendOpen(true);
        })
      );
    };

    map.allLayers.forEach((layer) => bindLayerVisibility(layer));

    const allLayersChangeHandle = map.allLayers.on("change", (event) => {
      event.added.forEach((layer) => {
        bindLayerVisibility(layer);
        if (layer.visible) setLegendOpen(true);
      });
    });

    return () => {
      watchHandles.forEach((handle) => handle.remove());
      allLayersChangeHandle.remove();
    };
  }, [mapView, legendPanelVisible]);

  return (
    <div
      id={widgetsRootId}
      className={`pointer-events-none absolute inset-0 z-20${
        hideLayerListVisibility ? " map-widget-layer-list--no-visibility" : ""
      }`}
    >
      {/* Top-left: layers */}
      <div className="pointer-events-auto absolute top-3 left-3">
        <div
          className={
            layerListOpen ? "map-widget-panel map-widget-panel--layers" : "hidden"
          }
        >
          <div className="map-widget-panel-header">
            <span className="map-widget-panel-title">Layers</span>
            <button
              type="button"
              className="map-widget-close"
              onClick={() => setLayerListOpen(false)}
              aria-label="Close layers"
            >
              ×
            </button>
          </div>
          <div
            ref={layerListContainerRef}
            className="map-widget-panel-body map-widget-panel-body--layers"
          />
        </div>
        {!layerListOpen && (
          <button
            type="button"
            className="map-widget-toggle"
            onClick={() => setLayerListOpen(true)}
            aria-label="Open layers"
            title="Layers"
          >
            <CalciteIcon icon="layers" scale="s" />
          </button>
        )}
      </div>

      {/* Bottom-left: legend */}
      {legendPanelVisible && (
        <div className="pointer-events-auto absolute bottom-5 left-5">
          <div
            className={
              legendOpen ? "map-widget-panel map-widget-panel--legend" : "hidden"
            }
          >
            <div className="map-widget-panel-header">
              <span className="map-widget-panel-title">{legendPanelTitle}</span>
              <button
                type="button"
                className="map-widget-close"
                onClick={() => setLegendOpen(false)}
                aria-label="Close legend"
              >
                ×
              </button>
            </div>
            <div
              className={`map-widget-panel-body map-widget-panel-body--legend${
                customLegend ? " map-widget-panel-body--legend-with-custom" : ""
              }${hideEsriLegend ? " map-widget-panel-body--legend-custom-only" : ""}`}
            >
              {customLegend ? (
                <div className="map-widget-custom-legend">{customLegend}</div>
              ) : null}
              {!hideEsriLegend ? (
                <div
                  ref={legendContainerRef}
                  className="map-widget-legend-esri"
                />
              ) : null}
            </div>
          </div>
          {!legendOpen && (
            <button
              type="button"
              className="map-widget-toggle"
              onClick={() => setLegendOpen(true)}
              aria-label="Open legend"
              title={legendPanelTitle}
            >
              <CalciteIcon icon="legend" scale="s" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
