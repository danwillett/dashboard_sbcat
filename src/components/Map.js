import React, { useEffect, useRef, useState, useContext } from "react";

import Query from '@arcgis/core/rest/support/Query.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import Legend from "@arcgis/core/widgets/Legend.js";
import * as heatmapRendererCreator from "@arcgis/core/smartMapping/renderers/heatmap.js";
import heatmapStatistics from "@arcgis/core/smartMapping/statistics/heatmapStatistics.js";
import PictureMarkerSymbol from '@arcgis/core/symbols/PictureMarkerSymbol.js'
import Symbol from "@arcgis/core/symbols/Symbol.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";

import { Container, Grid, Checkbox, Typography, FormGroup, FormControl, FormControlLabel, Select, InputLabel, MenuItem } from "@mui/material";
import VolumeSliderOptions from "./apps/volumes/VolumeSliderOptions";
import VolumeChart from "./apps/volumes/VolumeChart";
import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'
import Expand from '@arcgis/core/widgets/Expand.js'
import { setRenderer, loadIncidents } from "./apps/risk/utils";

import { MapContext, MapContextProvider } from "./MapContext"
import RiskOptions from "./apps/risk/RiskOptions";

import {initMapLayers} from "./apps/volumes/utils"


// export default function DashboardMap() {

//     const { map, setMap, view, setView, incidentData, setIncidentData } = useContext(MapContext)
//     const mapRef = useRef()
//     const riskRef = useRef()
//     const volumeRef = useRef()

//     // incidents url
//     const incidentLayerUrl = "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/SB_Incidents/FeatureServer"//"https://donkey.grit.ucsb.edu/server/rest/services/Hosted/AllIncidentsPoints/FeatureServer"



//     const initMap = () => {    
//         // Create a view
//         if (!view) {
//           const newView = new MapView({
//             map: map,
//             center: [-119.8, 34.45],
//             zoom: 11,
//             container: mapRef.current,
//           });
    
//           const riskDiv = document.getElementById("riskPanel")
//           newView.ui.add([riskDiv], "top-right")

//           const volumeDiv = document.getElementById('volumePanel')
    
//           let legend = new Legend({
//             view: newView
//           });
          
//           newView.ui.add(legend, "bottom-right");
    
//           setView(newView)
    
//         }
//       }

//     // create new map, load incident data
//     useEffect(() => {
//         setMap(new Map({
//             basemap: "streets-vector"
//           }))
          
//         loadIncidents(setIncidentData, setRenderer, incidentLayerUrl)
        
//     }, [])

//     // load volumes data
//     const [volumeFilterOptions, setVolumeFilterOptions] = useState({
//         bikes: true,
//         peds: false,
//         weekend: true,
//         weekday: true
//     });
//     const [resultsLayer, setResultsLayer] = useState(null)
//     const [sliderType, setSliderType] = useState("range")

//     const hourFields = ["h_00", "h_01", "h_02", "h_03", "h_04", "h_05", "h_06", "h_07", "h_08", "h_09", "h_10", "h_11", "h_12", "h_13", "h_14", "h_15", "h_16", "h_17", "h_18", "h_19", "h_20", "h_21", "h_22", "h_23"]
//     const handleSliderChange = (event) => {

//         event.preventDefault()
//         event.stopPropagation()
//         console.log(event.target.value)
//         setSliderType(event.target.value);
        
//         if (slider.current) {
//             let values
//             let rangeSlider
//             if (event.target.value === "hourly") {
//                 values = [0]
//                 rangeSlider = false
//             } else {
//                 values = [0, 23]
//                 rangeSlider = true
//             }
            
//             slider.current.destroy()
//             const sliderContainer = document.getElementById('sliderContainer')
//             const newSliderEl = document.createElement('div')
//             sliderRef.current = newSliderEl
//             sliderContainer.appendChild(newSliderEl)
            
//             slider.current = createSlider(values, rangeSlider, sliderRef)
//             addSliderEventListener(event.target.value, resultsLayer, slider, setChartData)
//         }

        
//     };

//     useEffect(()=> {
//         if (volumeFilterOptions.bikes | volumeFilterOptions.peds) {
//             console.log("querying data from Enterprise")
//             initMapLayers(volumeFilterOptions, hourFields, setResultsLayer)
//         } 
        
//     }, [volumeFilterOptions])

//     useEffect(() => {
//         if (resultsLayer !== null) {

//             console.log(map.layers)
            
//             map.layers=resultsLayer
//         } 

//         if (incidentData !== null) {
    
//           map.layers = [incidentData]
//         }
    
//       }, [incidentData, resultsLayer])



    

  


//   return (
    
//     <Grid item style={{ flex: 1, overflowY: 'auto' }}>

//     <div ref={mapRef} style={{ width: "100%", height: '100%', boxSizing: "border-box" }} sx={{ flex: 1 }}></div>
//     <Grid container className="esri-widget" ref={riskRef} id="riskPanel" style={{ overflowY: 'auto', maxHeight: '75vh', width: "500px" }}>
//       <RiskOptions setFilters={setFilters} />
//     </Grid>

//     <Grid container className="esri-widget" ref={volumeRef} id="volumePanel" style={{ overflowY: 'auto', maxHeight: '75vh', width: "500px" }}>
//       <RiskOptions setFilters={setFilters} />
//     </Grid>

//     </Grid>

    
    
//   )
// }