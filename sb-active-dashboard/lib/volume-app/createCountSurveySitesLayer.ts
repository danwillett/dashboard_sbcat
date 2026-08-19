import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Field from "@arcgis/core/layers/support/Field";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import { VolumeSite } from "./siteTemporalQuery";

const COUNT_SURVEY_SITES_TITLE = "Count Survey Sites";

export function createCountSurveySitesLayer(sites: VolumeSite[]): FeatureLayer {
  const graphics = sites
    .filter((site) => site.lon != null && site.lat != null)
    .map((site) => new Graphic({
      geometry: new Point({
        longitude: site.lon as number,
        latitude: site.lat as number,
        spatialReference: { wkid: 4326 },
      }),
      attributes: {
        OBJECTID: site.id,
        id: site.id,
        name: site.name,
        source: site.source,
      },
    }));

  return new FeatureLayer({
    title: COUNT_SURVEY_SITES_TITLE,
    source: graphics,
    objectIdField: "OBJECTID",
    geometryType: "point",
    spatialReference: { wkid: 4326 },
    fields: [
      new Field({ name: "OBJECTID", alias: "Object ID", type: "oid" }),
      new Field({ name: "id", alias: "Site ID", type: "integer" }),
      new Field({ name: "name", alias: "Count Site", type: "string" }),
      new Field({ name: "source", alias: "Survey", type: "string" }),
    ],
    outFields: ["*"],
    popupEnabled: false,
    renderer: new SimpleRenderer({
      symbol: new SimpleMarkerSymbol({
        size: 9,
        color: [37, 99, 235, 0.9],
        outline: { color: [255, 255, 255, 1], width: 1 },
      }),
    }),
  });
}

export function applyCountSurveySiteHighlight(layer: FeatureLayer, selectedSiteId: string | null) {
  if (!selectedSiteId) {
    layer.renderer = new SimpleRenderer({
      symbol: new SimpleMarkerSymbol({
        size: 9,
        color: [37, 99, 235, 0.9],
        outline: { color: [255, 255, 255, 1], width: 1 },
      }),
    });
    return;
  }

  layer.renderer = new UniqueValueRenderer({
    field: "id",
    defaultSymbol: new SimpleMarkerSymbol({
      size: 8,
      color: [37, 99, 235, 0.75],
      outline: { color: [255, 255, 255, 1], width: 1 },
    }),
    uniqueValueInfos: [{
      value: Number(selectedSiteId),
      symbol: new SimpleMarkerSymbol({
        size: 14,
        color: [14, 165, 233, 1],
        outline: { color: [255, 255, 255, 1], width: 2 },
      }),
    }],
  });
}

export function isCountSurveySitesLayer(layer: __esri.Layer | null | undefined): boolean {
  return layer?.title === COUNT_SURVEY_SITES_TITLE;
}
