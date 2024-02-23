import React, { useEffect, useRef, useState } from "react";
import { Container, Grid, Checkbox, Typography, FormGroup, FormControl, FormControlLabel, Select, InputLabel, MenuItem } from "@mui/material";
import VolumeSliderOptions from "./VolumeSliderOptions";
import VolumeChart from "./VolumeChart";
import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'
import Query from '@arcgis/core/rest/support/Query.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import Graphic from '@arcgis/core/Graphic.js'
import Expand from '@arcgis/core/widgets/Expand.js'
import Slider from '@arcgis/core/widgets/Slider.js'
import Legend from '@arcgis/core/widgets/Legend.js'
import Fullscreen from "@arcgis/core/widgets/Fullscreen.js";
import { createSlider, initMapSlider, initMapLayers, addSliderEventListener } from "./utils";

export default function VolumeSliderMapCore() {
    const [filterOptions, setFilterOptions] = useState({
        bikes: true,
        peds: false,
        weekend: true,
        weekday: true
    });
    const [chartData, setChartData] = useState(null)
    const [showForm, setShowForm] = useState(true)
    const [sliderType, setSliderType] = useState("range")
    const [map, setMap] = useState(null)
    const [view, setView] = useState(null)
    const [resultsLayer, setResultsLayer] = useState(null)

    const handleApplyOptions = (options) => {
        // Update the filter options when the user applies changes
        setFilterOptions(options);
    };

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

        
    };


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
        if (filterOptions.bikes | filterOptions.peds) {
            console.log("querying data from Enterprise")
            initMapLayers(filterOptions, hourFields, setResultsLayer)
        } 
        
    }, [filterOptions])

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

                    <Grid container justifyContent="center" alignItems="center" direction="column" wrap={false} id="infoDiv" className="esri-widget" style={{ width: "550px", height: "100%", overflowY: 'scroll', maxHeight: '75vh' }}  spacing={1}>
                        <Grid item>
                            <Typography id="description" variant="h6" style={{ textAlign: 'center' }}>
                                Volumes
                            </Typography>
                        </Grid>
                        <Grid item style={{width: "100%"}}>
                            
                            <VolumeSliderOptions onApplyOptions={handleApplyOptions} />
                        </Grid>
                        <Grid container alignItems="center" justifyContent="space-between" direction="row" padding={3}>
                            <Grid item id="sliderContainer" style={{ height: "100px", width: "400px", marginTop: "10px", marginBottom: "10px" }}>
                                <div id="sliderElement" ref={sliderRef}></div>
                            </Grid>
                            <Grid item>
                                <FormControl variant='standard'>
                                    <Select
                                        labelId="slider-type-label"
                                        id="select-slider-type"
                                        value={sliderType}
                                        label="Counts By"
                                        onChange={(event) => {
   
                                            handleSliderChange(event)
                                        }
                                        }
                                      >
                                        <MenuItem value={"range"} className="esri-widget">Range</MenuItem>
                                        <MenuItem value={"hourly"} className="esri-widget">Hourly</MenuItem>

                                    </Select>
                                    {/* <Checkbox className="esri-widget"></Checkbox> */}
                                </FormControl>
                            </Grid>


                        </Grid>
                        
                        <div></div>
                        <div ref={legendRef}></div>
                    </Grid>

                    {chartData && <Grid item alignContent="center" id='chartDiv' className='esri-widget' style={{width: '80%', height: '40vh'}}>
                                        <VolumeChart data={chartData} chartRef={chartRef} />
                                      </Grid>}

                    
                </Grid>

                



                {/* {showForm && <VolumeSliderOptions showForm={showForm} onApplyOptions={handleApplyOptions} onClose={handleCloseForm} />} */}
        
        </div>
    );
}
