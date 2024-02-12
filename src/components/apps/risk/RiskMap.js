import React, { useEffect, useRef, useState, useContext } from "react";

import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'
import Query from '@arcgis/core/rest/support/Query.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import PictureMarkerSymbol from '@arcgis/core/symbols/PictureMarkerSymbol.js'
import Symbol from "@arcgis/core/symbols/Symbol.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import { Grid } from "@mui/material";

import { MapContext, MapContextProvider } from "../../MapContext";


export default function RiskMap() {

    const {map, setMap, view, setView} = useContext(MapContext)
  
    const mapRef = useRef()
    const infoRef = useRef()

    const [incidentData, setIncidentData] = useState(null)

    
    const incidentLayerUrl = "https://donkey.grit.ucsb.edu/server/rest/services/Hosted/AllIncidentsPoints/FeatureServer"
    
    // load incident portal layer as service layer
    // layer is not accessible through portal (sharing = organization), but public data collection is enabled
    const loadIncidents = async () => {
  
      
      const popup = {
        title: "Incident Details",
        content: "<b>Incident Date:</b> {date}<br><b>Incident Type:</b> {incident_t}<br><b>Pedestrian:</b> {pedestrian}<br><b>Bike:</b> {bicyclist}<br><b>EBike:</b> {ebike}<br><b>Age:</b> {age}<br><b>Gender:</b> {gender}<br><b>Source:</b> {data_sourc}",
      }
      const colors = ["rgba(115, 0, 115, 0)", "#820082", "#910091", "#a000a0", "#af00af", "#c300c3", "#d700d7", "#eb00eb", "#ff00ff", "#ff58a0", "#ff896b", "#ffb935", "#ffea00"];

      const incidentRenderer = {
        type: "heatmap",
        // symbol: symbol,
        colorStops: [
          { color: colors[0], ratio: 0 },
          { color: colors[1], ratio: 0.083 },
          { color: colors[2], ratio: 0.166 },
          { color: colors[3], ratio: 0.249 },
          { color: colors[4], ratio: 0.332 },
          { color: colors[5], ratio: 0.415 },
          { color: colors[6], ratio: 0.498 },
          { color: colors[7], ratio: 0.581 },
          { color: colors[8], ratio: 0.664 },
          { color: colors[9], ratio: 0.747 },
          { color: colors[10], ratio: 0.83 },
          { color: colors[11], ratio: 0.913 },
          { color: colors[12], ratio: 1 }
        ],
        radius: 18,
        
        maxDensity: 0.04,

        minDensity: 0
      }
  
      const ebikeLayer = new FeatureLayer({
        url: incidentLayerUrl,
        renderer: incidentRenderer,
        outFields: ["incident_date", "incident_type", "collision_object", "description"],
        popupTemplate: popup
      })
      console.log(ebikeLayer)
      
      setIncidentData(ebikeLayer)
  
    }
  
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
  
          // const infoDiv = document.getElementById("infoDiv")
          //   newView.ui.add([infoDiv], "top-right")
  
          setView(newView)
  
      }
    }
  
      
    useEffect(() => {
      setMap(new Map({
        basemap: "streets-vector"
      }))
      console.log(map)
      loadIncidents()
    }, [])
  
    useEffect(() => {
      console.log(incidentData)
      console.log(map)
      if (incidentData !== null) {
        map.layers = [incidentData]
      }
      
    }, [incidentData])

    useEffect(() => {
      console.log(view)
      if (view !== null){
        console.log(view)
        view.when().then(() => {

          console.log(incidentData.renderer)
          const heatmapRenderer = incidentData.renderer.clone();
          const simpleRenderer = {
            type: "simple",
            symbol: {
              type: "simple-marker",
              color: "#c80000",
              size: 5
            }
          };
          

          reactiveUtils.watch(
            () => view.scale,
            () => {
              incidentData.renderer = view.scale <= 40000 ? simpleRenderer : heatmapRenderer;
            }
          );
        })
      }
    }, [view])
  
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
          
        <div ref={mapRef} style={{ width: "100%", height:'100%',  boxSizing: "border-box"}} sx={{flex:1}}></div>
        {/* <Grid container className="esri-widget" ref={infoRef} id="infoDiv" style={{overflowY: 'auto', maxHeight: '75vh'}}>
          <InfoPanel />
        </Grid> */}
         
        </Grid>
  
      
      
    )
  }

