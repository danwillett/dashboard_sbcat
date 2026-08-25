import { useEffect, useRef, useState, type ReactNode } from "react";
import LayerList from "@arcgis/core/widgets/LayerList";
import Legend from "@arcgis/core/widgets/Legend";
import { CalciteIcon } from "@esri/calcite-components-react";
import "../data-query-map-widgets.css";

interface DataQueryMapWidgetsProps {
  mapView: __esri.MapView | null;
  /** Managed layer legends (count surveys, safety, modeled volume) above the Esri legend. */
  customLegend?: ReactNode;
}

/**
 * LayerList (top-left) and Legend (bottom-left) with inline panels — no Expand popout.
 */
export default function DataQueryMapWidgets({
  mapView,
  customLegend,
}: DataQueryMapWidgetsProps) {
  const [layerListOpen, setLayerListOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const layerListContainerRef = useRef<HTMLDivElement>(null);
  const legendContainerRef = useRef<HTMLDivElement>(null);
  const layerListRef = useRef<LayerList | null>(null);
  const legendRef = useRef<Legend | null>(null);
  const autoOpenedRef = useRef(false);

  // Create ArcGIS widgets in our panel containers
  useEffect(() => {
    if (
      !mapView ||
      !layerListContainerRef.current ||
      !legendContainerRef.current
    ) {
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
      },
    });

    const legend = new Legend({
      view: mapView,
      container: legendContainerRef.current,
    });

    layerList.when().then(() => {
      const container = layerList.container as HTMLElement | undefined;
      if (container) {
        container.classList.add("calcite-mode-light");
        container.style.colorScheme = "light";
      }
    });

    legend.when().then(() => {
      const container = legend.container as HTMLElement | undefined;
      if (container) {
        container.classList.add("calcite-mode-light");
        container.style.colorScheme = "light";
      }
    });

    layerListRef.current = layerList;
    legendRef.current = legend;

    return () => {
      layerList.destroy();
      legend.destroy();
      layerListRef.current = null;
      legendRef.current = null;
    };
  }, [mapView]);

  // Open panels when layers or custom legend content appear
  useEffect(() => {
    if (!mapView?.map) return;

    const map = mapView.map;
    const tryAutoOpen = () => {
      if (!autoOpenedRef.current && (map.layers.length > 0 || customLegend)) {
        autoOpenedRef.current = true;
        setLayerListOpen(true);
        setLegendOpen(true);
      }
    };

    tryAutoOpen();
    const handle = map.layers.on("change", tryAutoOpen);
    return () => handle.remove();
  }, [mapView, customLegend]);

  return (
    <div
      id="data-query-map-widgets"
      className="pointer-events-none absolute inset-0 z-20"
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
      <div className="pointer-events-auto absolute bottom-5 left-5">
        <div
          className={
            legendOpen ? "map-widget-panel map-widget-panel--legend" : "hidden"
          }
        >
          <div className="map-widget-panel-header">
            <span className="map-widget-panel-title">Legend</span>
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
            }`}
          >
            {customLegend ? (
              <div className="map-widget-custom-legend">{customLegend}</div>
            ) : null}
            <div
              ref={legendContainerRef}
              className="map-widget-legend-esri"
            />
          </div>
        </div>
        {!legendOpen && (
          <button
            type="button"
            className="map-widget-toggle"
            onClick={() => setLegendOpen(true)}
            aria-label="Open legend"
            title="Legend"
          >
            <CalciteIcon icon="legend" scale="s" />
          </button>
        )}
      </div>
    </div>
  );
}
