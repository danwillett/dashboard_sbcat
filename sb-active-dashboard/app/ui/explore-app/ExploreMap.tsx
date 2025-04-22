'use client';
import React, {  useRef, useState, useEffect } from "react";

// import global state variables
import { useMapContext } from "@/app/lib/context/MapContext";

// import custom components
import ExploreMenu from "./ExploreMenu";

// import custom functions
import { createCensusGroupLayer } from "@/app/lib/explore-app/displayCensus";
import { createCountGroupLayer } from "@/app/lib/explore-app/displayCounts";
import { createIncidentGroupLayer } from "@/app/lib/explore-app/displayIncidents";
import { addVisualizationOptions } from "@/app/lib/utils";
import { changeIncidentRenderer } from "@/app/lib/explore-app/displayIncidents";


// import arcgis and calcite components
import "@esri/calcite-components"
import "@arcgis/map-components/dist/components/arcgis-map";
import "@arcgis/map-components/dist/components/arcgis-legend";
import "@arcgis/map-components/dist/components/arcgis-expand";
import "@arcgis/map-components/dist/components/arcgis-layer-list";
import "@arcgis/map-components/dist/components/arcgis-time-slider";
import "@arcgis/map-components/dist/components/arcgis-print";
import LayerList from "@arcgis/core/widgets/LayerList"
import Legend from "@arcgis/core/widgets/Legend"
import Print from "@arcgis/core/widgets/Print"
import TimeSlider from "@arcgis/core/widgets/TimeSlider"
import TimeInterval from "@arcgis/core/time/TimeInterval"
import { ArcgisMap } from "@arcgis/map-components-react";


import GroupLayer from "@arcgis/core/layers/GroupLayer";

// import mui components
import { CssBaseline, Box, Popover, Typography, Toolbar } from "@mui/material";
import Grid from "@mui/material/Grid2"

// import { setAssetPath as setCalciteComponentsAssetPath } from '@esri/calcite-components/dist/components';
// setCalciteComponentsAssetPath("https://js.arcgis.com/calcite-components/2.13.2/assets");

export default function ExploreMap() {

    const { mapRef, setMapRef, viewRef, setViewRef, countGroupLayer, setCountGroupLayer, censusGroupLayer, setCensusGroupLayer, incidentGroupLayer, setIncidentGroupLayer, setLayerList, setTimeSlider } = useMapContext()

    const [showWidgetPanel, setShowWidgetPanel] = useState<Boolean>(false)
    const [showLegend, setShowLegend] = useState<Boolean>(false)
    const [showLayerList, setShowLayerList] = useState<Boolean>(false)
    const [showFilter, setShowFilter] = useState<Boolean>(false)
    const [showPrint, setShowPrint] = useState<Boolean>(false)
    const [ mapElRef, setMapElRef ] = useState(null)
    
    

    const menuProps = {

        showWidgetPanel,
        setShowWidgetPanel,
        showLegend,
        setShowLegend,
        showLayerList,
        setShowLayerList,
        showFilter,
        setShowFilter,
        showPrint,
        setShowPrint
    }

    // once map is generated, load feature layers and add to the map
    useEffect(() => {
        if (mapRef !== null) {

            const createLayers = async () => {
                const censusGroupLayer = await createCensusGroupLayer()
                const countGroupLayer = await createCountGroupLayer()
                const incidentGroupLayer = await createIncidentGroupLayer()
                                
                setCensusGroupLayer(censusGroupLayer)
                setCountGroupLayer(countGroupLayer)
                setIncidentGroupLayer(incidentGroupLayer)

                // add map layers in LayerSearch
                // mapRef.add(censusGroupLayer)
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
            

            if (censusGroupLayer !== null && countGroupLayer !== null && incidentGroupLayer !== null){
                console.log(censusGroupLayer)
                const layerList = new LayerList({
                    view: viewRef,
                    container: 'layer-list-container',
                    // listItemCreatedFunction: addVisualizationOptions,
                    visible: false,
                    dragEnabled: true
                })
    
                layerList.on("trigger-action", (event) => {
                    console.log("pressed")
                    const id = event.action.id;
                    
                    if (id === "change-incident-points") {
                        changeIncidentRenderer(incidentGroupLayer, "simple")
                    } else if (id === "change-incident-heatmap") {
                        changeIncidentRenderer(incidentGroupLayer, "heatmap")
                    } else if (id === "change-incident-clusters") {
                        changeIncidentRenderer(incidentGroupLayer, "cluster")
                    }
                })
                setLayerList(layerList)
                
                const legend = new Legend({
                    view: viewRef,
                    container: 'legend-container'
                })

                // const print = new Print({
                //     view: viewRef,
                //     container: 'print-container',
                    
                //     printServiceUrl:
                //        "https://spatialcenter.grit.ucsb.edu/server/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
                //   });
                                
                const timeSlider = new TimeSlider({
                    view: viewRef,
                    container: 'explore-time-slider-container',
                    mode: 'time-window',
                    timeZone: 'system',
                    stops: {
                        interval: new TimeInterval({
                            value: 1,
                            unit: "years"
                        })
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

                setShowLegend(false)
                setShowLayerList(true)
                setShowPrint(false)
                setShowWidgetPanel(true)

                viewRef.ui.add([layerList, legend], "top-right")
            }
        }
        
    }, [viewRef, incidentGroupLayer, countGroupLayer, censusGroupLayer])

    const assignMap = (event: any) => {

        setMapElRef(event.target)
        setMapRef(event.target.map)
        setViewRef(event.target.view)
        
    }

    return (
        <Box id="app-container" sx={{ display: 'flex', height: "calc(100vh - 70px)"}}>
            <CssBaseline />
            
            <Box sx={{height: "100%"}}>
                <ExploreMenu {...menuProps} />
            </Box>
            
            {/* Widget Panel */}
            {/* <Box sx={{
                display: showLegend || showLayerList || showFilter || showPrint ? 'flex' : 'none',  // Always render, visibility controlled via `display`
                flexDirection: 'column', // Stack vertically first
                flexWrap: 'wrap', // Wrap into another column when needed
                alignItems: "stretch", // Aligns properly to the left
                // maxHeight: "100vh", // Prevents overflow
                // maxWidth: "80vw", // Shrinks to only needed width
                padding: 1,
                flexShrink: 3,
                maxHeight: "calc(100vh - 70px)", // Prevents it from growing indefinitely
                maxWidth: "none",
                }}> */}
                
                      
                {/* Layer List Panel */}
                {/* <Grid justifyContent="center" className="esri-widget" sx={{display: showLayerList ? 'block': 'none'}}>
                    <Grid size={12} my={2}>
                            <Typography align='center' variant='h5'>Layers</Typography>
                            
                        </Grid>
                    <div id="layer-list-container"></div>
                </Grid> */}

                {/* Filter Panel */}
                {/* <Grid className="esri-widget" justifyContent="center" sx={{display: showFilter ? 'block': 'none'}}>
                    <Grid size={12} my={2} >
                            <Typography align='center' variant='h5'>Filters</Typography>
                    </Grid>
                    
                    <FilterPanel {...filterProps} />
                </Grid> */}

                {/* Legend Panel */}
                {/* <Grid justifyContent="center" className="esri-widget" sx={{display: showLegend ? 'block': 'none'}}>
                    <Grid size={12} my={2}>
                        <Typography align='center' variant='h5'>Legend</Typography>
                    </Grid>
                    <div id="legend-container"></div>
                </Grid> */}

                {/* Print Panel */}
                {/* <Grid justifyContent="center" className="esri-widget" sx={{display: showPrint ? 'block': 'none'}}>
                    <Grid size={12} my={2}>
                        <Typography align='center' variant='h5'>Print Map</Typography>
                    </Grid>
                    <div id="print-container"></div>
                </Grid> */}

            {/* </Box> */}
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