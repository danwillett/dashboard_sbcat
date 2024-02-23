import React, {useEffect, useRef, useState, useContext} from "react";
import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import PictureMarkerSymbol from '@arcgis/core/symbols/PictureMarkerSymbol.js'
import InfoIcon from '@mui/icons-material/Info';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';

import Graphic from '@arcgis/core/Graphic.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import Expand from '@arcgis/core/widgets/Expand.js'

import InfoPanel from "./widgets/InfoPanel";
import ReportPanel from "./widgets/ReportPanel";
import { MapContext } from "../MapContext";
import { Grid, IconButton, Button } from "@mui/material";


export default function Map() {

  const {map, setMap, view, setView} = useContext(MapContext)

  const mapRef = useRef()
  const infoRef = useRef()
  const reportRef = useRef()
  const [viewInfo, setInfoPanel] = useState(true)
  const [viewReport, setReportPanel] = useState(false)
  const [incidentData, setIncidentData] = useState(null)

  
//   const incidentLayerUrl = "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/ebike_incidents/FeatureServer"//"https://donkey.grit.ucsb.edu/server/rest/services/Hosted/sb_ebike_safety/FeatureServer"
  
//   // load incident portal layer as service layer
//   // layer is not accessible through portal (sharing = organization), but public data collection is enabled
//   const loadIncidents = async () => {

//     const pictureSymbol = new PictureMarkerSymbol({
//       url: `${process.env.PUBLIC_URL}/pictures/collision_icon.png`,
//       width: 20,
//       height: 20,
//     });

//     const popup = {
//       title: "Ebike Incident",
//       content: "<b>Incident Date:</b> {incident_date}<br><b>Incident Type:</b> {incident_type}<br><b>Collision Object:</b> {collision_object}<br><b>Description:</b> {description}",
//     }

//     const incidentRenderer = {
//       type: "simple",
//       symbol: pictureSymbol,

//     }


//     const ebikeLayer = new FeatureLayer({
//       url: incidentLayerUrl,
//       renderer: incidentRenderer,
//       outFields: ["incident_date", "incident_type", "collision_object", "description"],
//       popupTemplate: popup
//     })
    
//     setIncidentData(ebikeLayer)

//   }

  const initMap = () => {

    // Create a view
    if (!view) {
        const newView = new MapView({
            map: map,
            center: [-119.8, 34.45],
            zoom: 12,
            container: mapRef.current,
        });

        const infoDiv = document.getElementById("infoDiv")
        newView.ui.add([infoDiv], "top-right")

        const reportDiv = document.getElementById("reportDiv")
        newView.ui.add([reportDiv], "top-right")

        setView(newView)

    }
  }

    

  useEffect(() => {
    setMap(new Map({
      basemap: "streets-vector"
    }))
    loadIncidents()
  }, [])

  useEffect(() => {

    if (incidentData !== null) {
      map.layers = [incidentData]
    }
    
  }, [incidentData])

  useEffect(() => {
        
    if (map !== null) {
        if (map.layers !== null) {
            initMap()
        } else {

        }
        initMap()
        
    }
}, [map, incidentData])


  return (
    
      <Grid item style={{ flex: 1, overflowY: 'auto' }}>
        
      <div ref={mapRef} style={{ width: "100%", height:'100%',  boxSizing: "border-box"}} sx={{flex:1}}></div>
      <Grid container className="esri-widget" ref={infoRef} id="infoDiv" style={{overflowY: 'auto', maxHeight: '75vh', marginBottom: '5px'}}>
        {viewInfo ? (
          <InfoPanel refreshData={loadIncidents} setView={setInfoPanel}/>
          ): !viewReport ? (
            
            <Button
              variant='outlined'
              color='info'
              onClick={() => setInfoPanel(!viewInfo)}
              startIcon={<InfoIcon fontSize="medium" />}
              style={{padding: '10px', width: '100%', borderRadius: 0, textTransform: 'none'}}
            >
              About
            </Button>
            
          ) : (
            <em></em>
          )
          }
      </Grid>
      <Grid container className="esri-widget" ref={reportRef} id="reportDiv" style={{overflowY: 'auto', maxHeight: '75vh', marginBottom: '5px'}}>
        {viewReport ? (
          <ReportPanel refreshData={loadIncidents} setView={setReportPanel}/>
          ): !viewInfo ? (
            
            <Button
              variant='outlined'
              color='secondary'
              
              onClick={() => setReportPanel(!viewReport)}
              startIcon={<AddBoxOutlinedIcon fontSize="medium"/>}
              style={{padding: '10px', width: '100%', borderRadius: 0, textTransform: 'none'}}
            >
              Make Report
            </Button>
            
          ) : (
            <em></em>
          )
          }
      </Grid>
       
      </Grid>

    
    
  )
}