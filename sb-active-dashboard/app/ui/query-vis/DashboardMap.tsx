'use client';

import React, {  useRef, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "@esri/calcite-components"
import "@arcgis/map-components/dist/components/arcgis-map";
import "@arcgis/map-components/dist/components/arcgis-legend";
import "@arcgis/map-components/dist/components/arcgis-expand";
import "@arcgis/map-components/dist/components/arcgis-layer-list";
import "@arcgis/map-components/dist/components/arcgis-time-slider";
import Map from "@arcgis/core/map"
import MapView from "@arcgis/core/views/MapView"
import LayerList from "@arcgis/core/widgets/LayerList"
import Legend from "@arcgis/core/widgets/Legend"
import TimeSlider from "@arcgis/core/widgets/TimeSlider"
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";

import Menu from "./Menu";
import FilterPanel from "./FilterPanel";


import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles'

import { ArcgisMap } from "@arcgis/map-components-react";
import { CssBaseline, Box, Popover, Typography, Toolbar } from "@mui/material";
import Grid from "@mui/material/Grid2"

import { setAssetPath as setCalciteComponentsAssetPath } from '@esri/calcite-components/dist/components';
setCalciteComponentsAssetPath("https://js.arcgis.com/calcite-components/2.13.2/assets");

import { createCensusGroupLayer } from "@/app/lib/displayCensus";
import { createCountGroupLayer } from "@/app/lib/displayCounts";
import { createIncidentGroupLayer } from "@/app/lib/displayIncidents";
import { addVisualizationOptions } from "@/app/lib/utils";
import GroupLayer from "@arcgis/core/layers/GroupLayer";


export default function DashboardMap() {

    const theme = useTheme();

    const [showWidgetPanel, setShowWidgetPanel] = useState<Boolean>(false)
    const [showLegend, setShowLegend] = useState<Boolean>(false)
    const [showLayerList, setShowLayerList] = useState<Boolean>(false)
    const [showFilter, setShowFilter] = useState<Boolean>(false)
    const [ mapElRef, setMapElRef ] = useState(null)
    const [ mapRef, setMapRef ] = useState<Map | null>(null)
    const [ viewRef, setViewRef ] = useState<MapView | null>(null)
    const [ countGroupLayer, setCountGroupLayer ] = useState<GroupLayer | null>(null)
    const [ incidentGroupLayer, setIncidentGroupLayer ] = useState<GroupLayer | null>(null)
    const [timeSlider, setTimeSlider] = useState<TimeSlider | null>(null)

    const menuProps = {

        showWidgetPanel,
        setShowWidgetPanel,
        showLegend,
        setShowLegend,
        showLayerList,
        setShowLayerList,
        showFilter,
        setShowFilter
    }

    const filterProps = {
        timeSlider,
        viewRef,
        countGroupLayer,
        incidentGroupLayer
    }

    // once map is generated, load feature layers and add to the map
    useEffect(() => {
        if (mapRef !== null) {

            const createLayers = async () => {
                const censusGroupLayer = await createCensusGroupLayer()
                const countGroupLayer = await createCountGroupLayer()
                const incidentGroupLayer = await createIncidentGroupLayer()

                
                mapRef.add(censusGroupLayer)
                mapRef.add(countGroupLayer)
                mapRef.add(incidentGroupLayer)
                
                setCountGroupLayer(countGroupLayer)
                setIncidentGroupLayer(incidentGroupLayer)
            }
            
            createLayers()
                        
        }
        
    }, [mapRef])

    

    // set map center and zoom once view has been set and add custom widgets
    useEffect(() => {
        if (viewRef !== null) {
            viewRef.goTo({
                center: [-120, 34.7],
                zoom: 9
            })

            const layerList = new LayerList({
                view: viewRef,
                container: 'layer-list-container',
                listItemCreatedFunction: addVisualizationOptions
            })
            const legend = new Legend({
                view: viewRef,
                container: 'legend-container'
            })

            const timeSlider = new TimeSlider({
                view: viewRef,
                container: 'time-slider-container',
                mode: 'time-window',
                timeZone: 'system',
                stops: {
                    interval: {
                        value: 1,
                        unit: "years"
                    }
                },
                fullTimeExtent: {
                    start: new Date(2012, 1, 1),
                    end: new Date()
                },
                timeExtent: {
                    start: new Date(2012, 1, 1),
                    end: new Date()
                }
            })
            setTimeSlider(timeSlider)
            
        }
        
    }, [viewRef])
    
    

    const assignMap = (event: any) => {

        setMapElRef(event.target)
        setMapRef(event.target.map)
        setViewRef(event.target.view)
        
    }


    return (
        <Box id="app-container" sx={{ display: 'flex', height: "calc(100vh - 70px)"}}>
            <CssBaseline />
            {/* <Header open={open} handleDrawerOpen={handleDrawerOpen} /> */}
            <Box sx={{height: "100%"}}>
                <Menu {...menuProps} />
            </Box>
            
            
            {/* Widget Panel */}
            <Box sx={{
                display: showLegend || showLayerList || showFilter ? 'flex' : 'none',  // Always render, visibility controlled via `display`
                flexDirection: 'column', // Stack vertically first
                flexWrap: 'wrap', // Wrap into another column when needed
                alignItems: "stretch", // Aligns properly to the left
                // maxHeight: "100vh", // Prevents overflow
                // maxWidth: "80vw", // Shrinks to only needed width
                padding: 1,
                flexShrink: 3,
                maxHeight: "calc(100vh - 70px)", // Prevents it from growing indefinitely
                maxWidth: "none",
                }}>
                
                      
                {/* Layer List Panel */}
                <Grid justifyContent="center" className="esri-widget" sx={{display: showLayerList ? 'block': 'none'}}>
                    <Grid size={12} my={2}>
                            <Typography align='center' variant='h5'>Layers</Typography>
                            
                        </Grid>
                    <div id="layer-list-container"></div>
                </Grid>

                {/* Filter Panel */}
                <Grid className="esri-widget" justifyContent="center" sx={{display: showFilter ? 'block': 'none'}}>
                    <Grid size={12} my={2} >
                            <Typography align='center' variant='h5'>Filters</Typography>
                    </Grid>
                    
                    <FilterPanel {...filterProps} />
                </Grid>

                {/* Legend Panel */}
                <Grid justifyContent="center" className="esri-widget" sx={{display: showLegend ? 'block': 'none'}}>
                    <Grid size={12} my={2}>
                        <Typography align='center' variant='h5'>Legend</Typography>
                    </Grid>
                    <div id="legend-container"></div>
                </Grid>
            </Box>
            <Box component="main" sx={{ flexGrow: 1, flexShrink: 1 }}>
                

                <ArcgisMap
                    basemap="topo-vector"
                    // itemId="d5dda743788a4b0688fe48f43ae7beb9"
                    onArcgisViewReadyChange={assignMap}
                    >

                </ArcgisMap>
               
                
            </Box>
            
            
        </Box>
    )

    
}