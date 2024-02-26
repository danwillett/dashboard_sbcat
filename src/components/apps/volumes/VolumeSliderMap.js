import React, { useEffect, useRef, useState, useContext } from "react";
import { MapContext } from "../../MapContext";
import { Container, Grid, Checkbox, Typography, FormGroup, FormControl, FormControlLabel, Select, InputLabel, MenuItem } from "@mui/material";
import VolumeSliderOptions from "./VolumeSliderOptions";
import VolumeChart from "./VolumeChart";
import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'
import Expand from '@arcgis/core/widgets/Expand.js'


import { createSlider, initMapSlider, initMapLayers, addSliderEventListener } from "./utils";

export default function VolumeSliderMapCore() {
    // volume filters
    const [volumeFilterOptions, setVolumeFilterOptions] = useState({
        bikes: true,
        peds: false,
        weekend: true,
        weekday: true
    });
    const [chartData, setChartData] = useState(null)
    const [showForm, setShowForm] = useState(true)
    const [sliderType, setSliderType] = useState("range")
    const { map, setMap, view, setView, incidentData, setIncidentData } = useContext(MapContext)

    const [resultsLayer, setResultsLayer] = useState(null)

    const mapRef = useRef();
    const sliderRef = useRef();
    const slider = useRef(null);
    const legendRef = useRef()
    const legend = useRef(null);
    const chartRef = useRef(null)


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
    }

        
    
    const initMap = () => {
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
            newView.ui.add(
                new Expand({
                    view: view,
                    content: infoDiv,
                    expandIcon: "list-bullet",
                    expanded: true
                }),
                "top-right"
            );
            // const chartDiv = document.getElementById("chartDiv")
            // newView.ui.add([chartDiv], "bottom-left")
            setView(newView)

        }
        
        initMapSlider(sliderRef, resultsLayer, slider, sliderType, addSliderEventListener, setChartData)
        console.log(sliderRef.current)

    };
    
    useEffect(()=> {
        setMap(new Map({
            basemap: "streets-vector"
        }))
    }, [])

    // When chart options get filled out, layers are queried to arcgis portal
    useEffect(()=> {
        if (volumeFilterOptions.bikes | volumeFilterOptions.peds) {
            console.log("querying data from Enterprise")
            initMapLayers(volumeFilterOptions, hourFields, setResultsLayer)
        } 
        
    }, [volumeFilterOptions])

    // when query results are stored in resultsLayer, create a new map
    useEffect(() => {
        console.log(resultsLayer)
        if (resultsLayer !== null) {
            console.log("creating new map with queried data")
            console.log(resultsLayer)
            // Create a map
            map.layers=resultsLayer
        } 
        

    }, [resultsLayer]);

    // when new map has been created, create a new map view and add widgets
    useEffect(() => {
        
        if (map !== null) {
            if (map.layers !== null) {
                console.log(map.layers)
                console.log("creating map view")
                initMap()
            }
            
        }
    }, [map, resultsLayer, sliderType])


    const handleCloseForm = () => {
        setShowForm(false);
        console.log("closing form")
    };

    return (

        <div>
                <Grid item style={{width: '100vw'}}>

                    <div ref={mapRef} style={{ width: "100%", minHeight: "80vh",  boxSizing: "border-box" }}></div>

                    <Grid container className="esri-widget" id="infoDiv" style={{ overflowY: 'auto', maxHeight: '75vh', width: "500px" }}>
                        <VolumeSliderOptions onApplyOptions={(options) => setVolumeFilterOptions(options)} handleSliderChange={handleSliderChange} sliderRef={sliderRef} sliderType={sliderType}  />
                    </Grid>
                    

                    {/* {chartData && <Grid item alignContent="center" id='chartDiv' className='esri-widget' style={{width: '80%', height: '40vh'}}>
                                        <VolumeChart data={chartData} chartRef={chartRef} />
                                      </Grid>} */}

                    
                </Grid>

                



                {/* {showForm && <VolumeSliderOptions showForm={showForm} onApplyOptions={handleApplyOptions} onClose={handleCloseForm} />} */}
        
        </div>
    );
}
