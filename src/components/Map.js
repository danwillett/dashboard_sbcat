import React, { useEffect, useRef, useState, useContext } from "react";

import Legend from "@arcgis/core/widgets/Legend.js";
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import LayerList from "@arcgis/core/widgets/LayerList.js";
import { arrowLeft16 } from "@esri/calcite-ui-icons";

import { Grid, Box, Button, IconButton, Tab, Tabs, Radio, Typography} from "@mui/material";
import {styled} from "@mui/material/styles"
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';

import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'

import { setRenderer, loadIncidents } from "./apps/risk/utils";

import { MapContext } from "./MapContext"
import { FilterContextProvider } from "./FilterContext";
import RiskOptions from "./apps/risk/RiskOptions";
import VolumeSliderOptions from "./apps/volumes/VolumeSliderOptions";
import VolumeSlider from "./apps/volumes/VolumeSlider";

import {initMapLayers, addSliderEventListener, createSlider, initMapSlider} from "./apps/volumes/utils"

function RiskPanel (inputs) {
    const {setFilters} = inputs
    return (
        <Grid item className="esri-widget" id="riskPanel" style={{ overflowY: 'auto', maxHeight: '75vh', marginBottom: "5px"}}>    
            <FilterContextProvider>
                <RiskOptions setFilters={setFilters} />
            </FilterContextProvider>
        </Grid>
    )
}

export default function DashboardMap() {
    const { map, setMap, view, setView, incidentData, setIncidentData } = useContext(MapContext)
    const mapRef = useRef()
    const riskRef = useRef()
    const volumeRef = useRef()
    const volumeSliderRef = useRef()
    const volumeSliderButtonRef = useRef()

    const [dataFilter, setDataFilter] = useState("safety")
    const [viewFilterPanel, setFilterPanel] = useState("none")
    const [viewVolumeSlider, setVolumeSlider] = useState(false)


    // Volumes
    const sliderRef = useRef();
    const slider = useRef(null);
    const [chartData, setChartData] = useState(null)

    const [volumeFilterOptions, setVolumeFilterOptions] = useState({
        bikes: true,
        peds: false,
        weekend: true,
        weekday: true
    });
    const [resultsLayer, setResultsLayer] = useState(null)
    const [sliderType, setSliderType] = useState("range")

    const [filters, setFilters] = useState(null)

    // incidents url
    const incidentLayerUrl = "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/SB_Incidents/FeatureServer"//"https://donkey.grit.ucsb.edu/server/rest/services/Hosted/AllIncidentsPoints/FeatureServer"

    const initMap = () => {    
        // Create a view
        if (!view && incidentData !== null && resultsLayer !== null) {
          const newView = new MapView({
            map: map,
            center: [-119.8, 34.45],
            zoom: 11,
            container: mapRef.current,
          });
          newView.ui.add([riskRef.current, volumeRef.current], "bottom-left")
          
          const layerlist = new LayerList({
            view: newView,
            listItemCreatedFunction: async function (event) {
                let item = event.item;

                await item.layer.when();
                if (item.title == "SB Incidents - AllIncidentsPoints" ) {
                    item.title = "Safety Incidents"
                    item.panel = {
                        content: riskRef.current,
                        // icon: "sliders-horizontal",
                        iconClass: "esri-icon-down-arrow",
                        title: "safety data filters",
                   
                    }
                    console.log(item.panel)
                    
                } else if (item.title == "" ) {
                    item.title = "Volumes"
                    item.panel={
                        content: volumeRef.current,
                        icon: "slider-horizontal",
                        iconClass: "sliders-horizontal",
                        title: "volume data filters",
            
                    }
                    console.log(item.panel)
                } 
                
                setFilterPanel("block")
                 
              }
          })

          
          newView.ui.add(layerlist, "top-left")

          let legend = new Legend({
            view: newView
          });

          newView.ui.add([volumeSliderButtonRef.current], "top-right")
          newView.ui.add(legend, "bottom-right");

          const volumeDiv = document.getElementById('volumeSlider')
          newView.ui.add([volumeDiv], "bottom-left")
          newView.ui.remove([riskRef.current, volumeRef.current])
          setView(newView)

        }
      }

    // create new map, load incident data
    useEffect(() => {

        const renderMap = async () => {
            setMap(new Map({
                basemap: "streets-night-vector"
              }))
              
            await loadIncidents(setIncidentData, setRenderer, incidentLayerUrl)
            await initMapLayers(volumeFilterOptions, hourFields, setResultsLayer)
            initMap()
            console.log("setting Filter Panel")
            
            
        }
        
        renderMap()
        
    }, [])

    

    const hourFields = ["h_00", "h_01", "h_02", "h_03", "h_04", "h_05", "h_06", "h_07", "h_08", "h_09", "h_10", "h_11", "h_12", "h_13", "h_14", "h_15", "h_16", "h_17", "h_18", "h_19", "h_20", "h_21", "h_22", "h_23"]
    const handleSliderChange = (event) => {

        event.preventDefault()
        event.stopPropagation()
        console.log(event.target.value)
        setSliderType(event.target.value);
        
        if (slider.current) {
            let values
            let rangeSlider
            if (event.target.value === "hourly") {
                values = [0]
                rangeSlider = false
            } else {
                values = [0, 23]
                rangeSlider = true
            }
            
            slider.current.destroy()
            const sliderContainer = document.getElementById('sliderContainer')
            const newSliderEl = document.createElement('div')
            sliderRef.current = newSliderEl
            sliderContainer.appendChild(newSliderEl)
            
            slider.current = createSlider(values, rangeSlider, sliderRef)
            addSliderEventListener(event.target.value, resultsLayer, slider, setChartData)
        }

        
    };

    useEffect(()=> {

        if (volumeFilterOptions.bikes | volumeFilterOptions.peds) {
            console.log("querying data from Enterprise")
            initMapLayers(volumeFilterOptions, hourFields, setResultsLayer)
        } 
        
    }, [volumeFilterOptions])

    useEffect(() => {
        let layers
        if (resultsLayer !== null & incidentData !== null) {
            layers = [resultsLayer, incidentData]
            // layers.push(resultsLayer)
        } else if (resultsLayer !== null) {
            layers = resultsLayer
        } else if (incidentData !== null) {
            layers = [incidentData]
        } 
        if (layers) {
            map.layers = layers
        }
    
      }, [incidentData, resultsLayer])

    useEffect(() => {

    const loadView = async () => {
        console.log(view)
        if (view !== null) {
        console.log(view)
        await view.when()
        if (filters !== null) {
            incidentData.definitionExpression = filters
        }

        console.log(incidentData)

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
        console.log(map)
        if (map !== null) {
            initMap()
            
            // 
          }
    }, [map, incidentData, resultsLayer, viewFilterPanel])

    useEffect(() => {
        if (viewVolumeSlider){
            console.log("yay")
            initMapSlider(sliderRef, resultsLayer, slider, sliderType, addSliderEventListener, setChartData)
            
        }
    }, [viewVolumeSlider, sliderType, resultsLayer])


  return (
    
    <Grid item style={{ flex: 1, overflowY: 'auto' }}>

    <div ref={mapRef} style={{ width: "100%", height: '100%', boxSizing: "border-box" }} sx={{ flex: 1 }}></div>
        
    <Grid item className="esri-widget" ref={riskRef} id="riskPanel" style={{ overflowY: 'auto', maxHeight: '75vh', marginBottom: "5px", display: viewFilterPanel}}>    
        <FilterContextProvider>
            <RiskOptions setFilters={setFilters} setPanelView={setFilterPanel} />
        </FilterContextProvider>
    </Grid>
        
    <Grid item className="esri-widget" ref={volumeRef} id="volumePanel" style={{ overflowY: 'auto', maxHeight: '75vh', marginBottom: "5px", display: viewFilterPanel}}>    
        
        <FilterContextProvider>
            <VolumeSliderOptions onApplyOptions={(options) => setVolumeFilterOptions(options)} setPanelView={setVolumeSlider} />
        </FilterContextProvider>
        
    </Grid>
        

    

    <Grid container className="esri-widget" ref={volumeSliderButtonRef} id="volumeSliderButton" style={{ width: "150px", marginBottom: "5px" }}>
        <Button
                variant='outlined'
                color='secondary'
                
                onClick={() => setVolumeSlider(!viewVolumeSlider)}
                startIcon={<Radio checked={viewVolumeSlider} color="secondary" sx={{'& .MuiSvgIcon-root': {fontSize: 20,}, padding: "0px"}} style={{marginLeft: "5px"}} />}
                style={{padding: '10px', width: '100%', borderRadius: 0, textTransform: 'none', justifyContent: 'left'}}
            >

                Volume Slider
        </Button>

    </Grid>

    <Grid container className="esri-widget" ref={volumeSliderRef} id="volumeSlider" style={{ overflowY: 'auto', maxHeight: '75vh', marginBottom: "5px", display: viewVolumeSlider ? "block" : "none" }}>
        <VolumeSlider handleSliderChange={handleSliderChange} sliderRef={sliderRef} sliderType={sliderType} setPanelView={setVolumeSlider} />
      
    </Grid>

    
        

    </Grid>

    
    
  )
}