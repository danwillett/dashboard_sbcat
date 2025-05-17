'use client';

import React, {  useRef, useState, useEffect, useCallback } from "react";
import { defineCustomElements as defineChartsElements, defineCustomElements } from "@arcgis/charts-components/dist/loader";
import { ScatterPlotModel } from "@arcgis/charts-model";


import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

if (typeof window !== "undefined") {
    defineCustomElements(window, { resourcesUrl: "https://js.arcgis.com/charts-components/4.32/assets" })
}

async function createFeatureLayer(url: any) {
  const featureLayer = new FeatureLayer({
    url: url,
  });

  await featureLayer.load();

  return featureLayer;
}

// Default export for the Scatterplot component
// export default function TestMap() {
//   const scatterplotRef = useRef<any>(null);

//   // useCallback to prevent the function from being recreated when the component rebuilds
//   const initScatterplot = useCallback(async () => {
//     const layer = await createFeatureLayer(
//       "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/ArcGIS/rest/services/ChicagoCr/FeatureServer/0",
//     );

//     // Create a new ScatterPlotModel and set the x and y axis fields.
//     const scatterplotModel = new ScatterPlotModel();
//     await scatterplotModel.setup({ layer });

//     await scatterplotModel.setXAxisField("Ward");
//     await scatterplotModel.setYAxisField("Beat");

//     // Set the scatterplot element's layer and model properties.
//     const config = scatterplotModel.getConfig();

//     scatterplotRef.current.layer = layer;
//     scatterplotRef.current.model = config;
//   }, []);

//   // Register a function that will execute after the current render cycle
//   useEffect(() => {
//     initScatterplot().catch(console.error);
//   }, [initScatterplot]);

//   return (
//     <arcgis-chart ref={scatterplotRef} id="scatteplot">
//       <arcgis-charts-action-bar slot="action-bar"></arcgis-charts-action-bar>
//     </arcgis-chart>
//   );
// }

export default function TestMap() {
  const scatterplotRef = useRef<any>(null);

  // useCallback to prevent the function from being recreated when the component rebuilds
  const initScatterplot = useCallback(async () => {
    const layer = await createFeatureLayer(
      "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0"
    );

  }, []);

  // Register a function that will execute after the current render cycle
  useEffect(() => {
    initScatterplot().catch(console.error);
  }, [initScatterplot]);

  return (
    <arcgis-chart ref={scatterplotRef} id="scatteplot">
      <arcgis-charts-action-bar slot="action-bar"></arcgis-charts-action-bar>
    </arcgis-chart>
  );
}