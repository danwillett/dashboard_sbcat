import React, { useEffect, useRef, useState } from "react";
import { loadModules } from "esri-loader";
// import MapForm from "./MapForm";

export default function VolumeSlider() {
  const mapRef = useRef();
  const infoRef = useRef();
  const sliderRef = useRef();
  const slider = useRef(null);
  const [symbolSize, setSymbolSize] = useState(5)

  useEffect(() => {
    const initMap = async () => {
      const [Map, FeatureLayer, LayerView, MapView, esriConfig, FeatureTable, Query, GraphicsLayer, Graphic, Slider, Legend, Expand, ClassBreaksRenderer] =
        await loadModules([
          "esri/Map",
          "esri/layers/FeatureLayer",
          "esri/views/layers/LayerView",
          "esri/views/MapView",
          "esri/config",
          "esri/widgets/FeatureTable",
          "esri/rest/support/Query",
          "esri/layers/GraphicsLayer",
          "esri/Graphic",
          'esri/widgets/Slider',
          "esri/widgets/Legend",
          "esri/widgets/Expand",
          "esri/renderers/ClassBreaksRenderer"

        ]);
      console.log(esriConfig);

      const bikeVolumes = new FeatureLayer({
        url: "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/ATP_Volumes_SB/FeatureServer/1"
      })

      const sites = new FeatureLayer({
        url: "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/ATP_Volumes_SB/FeatureServer/0"
      })

      const hourFields = ["h_00", "h_01", "h_02", "h_03", "h_04", "h_05", "h_06", "h_07", "h_08", "h_09", "h_10", "h_11", "h_12", "h_13", "h_14", "h_15", "h_16", "h_17", "h_18", "h_19", "h_20", "h_21", "h_22", "h_23"]
      const bikeResultsLayer = new GraphicsLayer()

      const sitesQuery = new Query();
      sitesQuery.where = "";  // query all
      sitesQuery.outFields = ["*"];  // get all fields
      sitesQuery.returnGeometry = true

      sites.queryFeatures(sitesQuery).then((result) => {
        let siteFeatures = result.features
        let siteObj = {}
        siteFeatures.forEach(feature => {
          let siteLocation = feature.attributes.location
          siteObj[siteLocation] = {}
          siteObj[siteLocation]['attributes'] = feature.attributes
          siteObj[siteLocation]['geometry'] = feature.geometry
        })
        console.log(siteObj)

        let statsObj = hourFields.map((field) => (
          {
            onStatisticField: `bike_volumes_${field}`,
            outStatisticFieldName: "avg" + field,
            statisticType: "avg",
          }
        ))

        const statsQuery = new Query({
          outStatistics: statsObj,
          groupByFieldsForStatistics: ["bike_volumes_location"],
          returnGeometry: false,
        });

        bikeVolumes.queryFeatures(statsQuery).then((result) => {
          const volumeFeatures = result.features

          volumeFeatures.forEach(feature => {
            let volumeLocation = feature.attributes['bike_volumes_location']

            let graphicFeature = siteObj[volumeLocation]

            hourFields.forEach(hour => {
              let hourKey = `avg${hour}`
              graphicFeature['attributes'][hourKey] = feature.attributes[hourKey]
            })


            if (graphicFeature['geometry']) {
              let graphic = new Graphic({
                geometry: graphicFeature.geometry,
                attributes: graphicFeature.attributes,
                // symbol: symbol
              })
              bikeResultsLayer.add(graphic)
            }

          })
      

        }).catch(error => {
          console.error("Query error:", error)
          console.error("Query details:", error.details)
        })

      }).catch((error) => {
        console.error("Couldn't get sites: ", error)
      })
      // Create a map
      const map = new Map({
        basemap: "streets-vector",
        layers: [bikeResultsLayer]
      });

      console.log(map)
   

      // Create a view
      const view = new MapView({
        map: map,
        center: [-119.7, 34.5],
        zoom: 11,
        container: mapRef.current,
      });

      
      view.ui.add(
        new Expand({
          view: view,
          content: infoRef.current,
          expandIcon: "list-bullet",
          expanded: true
        }),
        "top-right"
      );
      console.log(bikeResultsLayer)
      view.whenLayerView(bikeResultsLayer).then((layerView) => {
        
        console.log(layerView)
        const legend = new Legend({
          view: view,
          container: "legendDiv"
        });
        
        if (!slider.current) {
          console.log(slider)
          slider.current = new Slider({
            min: 0,
            max: 23,
            values: [0],
            container: sliderRef.current,
            visibleElements: {
              rangeLabels: true
            },
            precision: 0
          });
          console.log(slider)
        }
        console.log(slider.current)
        
  
        const sliderValue = document.getElementById("sliderValue");
  
        const symbolRange = (count) => {
          let size = 0
          if (count < 10) {
            size = 5
          } else if (count < 20) {
            size = 10
          } else if (count < 50) {
            size = 15
          } else if (count < 100) {
            size = 20
          } else if (count == null) {
            size = 0
          } else {
            size = 25
          }
          return size
        }
  
        slider.current.on(["thumb-change", "thumb-drag"], (event) => {
  
          console.log(view)
          let fieldToShow = `avg${hourFields[event.value]}`
  
          let pointsAmount = bikeResultsLayer.graphics.items.length
          let updatedGraphics = []
          for (let i = 0; i < pointsAmount; i++) {
            let countAmount = bikeResultsLayer.graphics.items[i].attributes[fieldToShow]
            let symbolSize = symbolRange(countAmount)
            let symbol = {
                type: "simple-marker",
                color: "blue",
                size: symbolSize,
                outline: {
                  color: "white",
                  width: 1
                }
            
              }
              
              bikeResultsLayer.graphics.items[i].symbol = symbol
              let updatedGraphic = new Graphic({
                geometry: bikeResultsLayer.graphics.items[i].geometry,
                symbol: symbol,
                attributes: bikeResultsLayer.graphics.items[i].attributes,
              });
          
              updatedGraphics.push(updatedGraphic);
          }
  
          sliderValue.innerText = event.value;
  
          // Remove all graphics from the layer
          bikeResultsLayer.graphics.removeAll();

          // Add the updated graphics to the layer
          bikeResultsLayer.graphics.addMany(updatedGraphics);

  
  
        });
  
  
      });


      

      

    };

    initMap();
  }, []);

  return (
    <div>
      <div ref={mapRef} style={{ height: "70vh", width: "70vw" }}></div>
      <div ref={infoRef}>
        <div id="description">
          Show power plants with at least <span id="sliderValue">0</span> megawatts of capacity
        </div>
        <div id="sliderContainer">
          <div ref={sliderRef}></div>
        </div>
        <div id="legendDiv"></div>
      </div>
    </div>
  );
}
