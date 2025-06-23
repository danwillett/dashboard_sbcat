"use client";

import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";

import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import Field from "@arcgis/core/layers/support/Field";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import GroupLayerView from "@arcgis/core/views/layers/GroupLayerView";
import MapView from "@arcgis/core/views/MapView";
import Map from "@arcgis/core/Map";

export async function getCountStats(
  countGroupLayer: GroupLayer | null,
  mapRef: Map | null,
  viewRef: MapView | null
) {
  if (!countGroupLayer || !mapRef || !viewRef) return;
  const volumeGroup = mapRef.allLayers.find(
    (layer): layer is GroupLayer =>
      layer.title === "Volumes" && layer.type === "group"
  );

  if (!volumeGroup) return;

  const groupIncidentView = (await viewRef?.whenLayerView(
    countGroupLayer
  )) as GroupLayerView;
  const countLayerViews = groupIncidentView.layerViews;

  const countQueries = await Promise.all(
    countLayerViews.map((countView) => {
      return countView.queryFeatures({
        geometry: viewRef.extent,
        spatialRelationship: "intersects",
        returnGeometry: false,
        outFields: ["*"],
      });
    })
  );

  countQueries.forEach((result, index) => {
    console.log(`Layer ${index} features in view: ${result.features.length}`);
  });

  return countQueries;
}
