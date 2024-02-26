import React, { useEffect, useRef, useState, useContext } from "react";

import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'
import Query from '@arcgis/core/rest/support/Query.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import Legend from "@arcgis/core/widgets/Legend.js";
import * as heatmapRendererCreator from "@arcgis/core/smartMapping/renderers/heatmap.js";
import heatmapStatistics from "@arcgis/core/smartMapping/statistics/heatmapStatistics.js";
import PictureMarkerSymbol from '@arcgis/core/symbols/PictureMarkerSymbol.js'
import Symbol from "@arcgis/core/symbols/Symbol.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import { Grid } from "@mui/material";
import { setRenderer, loadIncidents } from "./utils";

import { MapContext, MapContextProvider } from "../../MapContext";
import RiskOptions from "./RiskOptions";


export default function RiskMap() {
  
  const { map, setMap, view, setView, incidentData, setIncidentData } = useContext(MapContext)

  const mapRef = useRef()
  const infoRef = useRef()

  const [filters, setFilters] = useState(null)

  const incidentLayerUrl = "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/SB_Incidents/FeatureServer"//"https://donkey.grit.ucsb.edu/server/rest/services/Hosted/AllIncidentsPoints/FeatureServer"

  const initMap = () => {
    console.log(map)
    console.log("reinitializing")
    console.log(view)

    // Create a view
    if (!view) {
      const newView = new MapView({
        map: map,
        center: [-119.8, 34.45],
        zoom: 11,
        container: mapRef.current,
      });

      const infoDiv = document.getElementById("infoDiv")
      newView.ui.add([infoDiv], "top-right")

      let legend = new Legend({
        view: newView
      });
      
      newView.ui.add(legend, "bottom-right");

      setView(newView)

    }
  }

  useEffect(() => {
    setMap(new Map({
      basemap: "streets-vector"
    }))
    console.log(map)
    loadIncidents(setIncidentData, setRenderer, incidentLayerUrl)
  }, [])

  useEffect(() => {
    console.log(incidentData)
    console.log(map)
    if (incidentData !== null) {

      map.layers = [incidentData]
    }

  }, [incidentData])

  useEffect(() => {

    const loadView = async () => {
      console.log(view)
      if (view !== null) {
        console.log(view)
        await view.when()
        if (filters !== null) {
          incidentData.definitionExpression = filters
        }

        const simpleRenderer = {
          type: "simple",
          symbol: {
            type: "simple-marker",
            color: "#c80000",
            size: 5
          }
        };

        let heatmapRenderer
        reactiveUtils.watch(
          () => view.scale,
          async () => {

            const stats = await heatmapStatistics({
              layer: incidentData,
              view: view
            })
  
            heatmapRenderer = await setRenderer()
            incidentData.renderer = view.scale <= 20000 ? simpleRenderer : heatmapRenderer;
            incidentData.opacity = view.scale <= 20000 ? 1 : 0.55;
          }
        );


      }
    }
    loadView()

  }, [view, filters])

  useEffect(() => {
    console.log("new incident data")
  }, [filters])

  useEffect(() => {

    if (map !== null) {
      if (map.layers !== null) {
        console.log(map.layers)
        console.log("creating map view")
        initMap()
      } else {

      }
      initMap()

    }
  }, [map, incidentData])

  return (


    <Grid item style={{ flex: 1, overflowY: 'auto' }}>

      <div ref={mapRef} style={{ width: "100%", height: '100%', boxSizing: "border-box" }} sx={{ flex: 1 }}></div>
      <Grid container className="esri-widget" ref={infoRef} id="infoDiv" style={{ overflowY: 'auto', maxHeight: '75vh', width: "500px" }}>
        <RiskOptions setFilters={setFilters} />
      </Grid>

    </Grid>



  )
}

