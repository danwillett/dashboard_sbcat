import React, { useEffect, useRef, useState } from "react";
import { loadModules } from "esri-loader";
// import MapForm from "./MapForm";

export default function VolumeSlider() {
  const mapRef = useRef();
  const tableRef = useRef();

  useEffect(() => {
    const initMap = async () => {
      const [Map, FeatureLayer, LayerView, MapView, esriConfig, FeatureTable, Query] =
        await loadModules([
          "esri/Map",
          "esri/layers/FeatureLayer",
          "esri/views/layers/LayerView",
          "esri/views/MapView",
          "esri/config",
          "esri/widgets/FeatureTable",
          "esri/rest/support/Query"
          
        ]);
      console.log(esriConfig);

      // Create a map
      const map = new Map({
        basemap: "streets-vector",
      });

      // Create a view
      const viewInstance = new MapView({
        map: map,
        center: [-119.7, 34.5],
        zoom: 11,
        container: mapRef.current,
      });

      // add locations layer
      const pointLocations = new FeatureLayer({
        url: "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/ATP_Volumes_SB/FeatureServer/0",
      });

      map.add(pointLocations);

      const bikeCounts = await new FeatureLayer({
        url: "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/ATP_Volumes_SB/FeatureServer/1",
      });
      console.log(bikeCounts)
      const featureTable = new FeatureTable({
        view: viewInstance, // The view property must be set for the select/highlight to work
        layer: bikeCounts,
        container: tableRef.current
      });

      // make query based on user preferences
      var query = new Query();
      query.where = "";  // query all
      query.outFields = ["*"];  // get all fields

      const hourKeys = ["h_00", "h_01", "h_02", "h_03", "h_04", "h_05", "h_06", "h_07", "h_08", "h_09", "h_10", "h_11", "h_12", "h_13", "h_14", "h_15", "h_16", "h_17", "h_18", "h_19", "h_20", "h_21", "h_22", "h_23"]
      let bikeCountDic = {}
      // Execute the query on the FeatureLayer
      bikeCounts.queryFeatures(query).then(function(result) {
        // Access the features and their attributes
        var features = result.features;
        console.log(features)
        features.forEach(feature => {
            let attributes = feature.attributes;
            let location = attributes.location
            let keys = Object.keys(bikeCountDic)
            if (!keys.includes(location)) {
                bikeCountDic[location] = {}
            }
            
            hourKeys.forEach((hour) => {
                let hours = Object.keys(bikeCountDic[location])
                if (hours.includes(hour)) {
                    bikeCountDic[location][hour].push(attributes[hour])
                } else {
                    bikeCountDic[location][hour] = [attributes[hour]]
                }
                
            })
        });
        console.log(bikeCountDic)

        // then just need to average hours for the sites

    })
      
    };

    initMap();
  }, []);

  return (
    <div>
      <div ref={mapRef} style={{ height: "70vh", width: "70vw" }}></div>
      <div ref={tableRef} style={{ height: "70vh", width: "70vw" }}></div>
    </div>
  );
}
