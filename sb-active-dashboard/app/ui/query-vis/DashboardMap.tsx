'use client';

import React, {  useRef, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "@esri/calcite-components"
import "@arcgis/map-components/dist/components/arcgis-map";
import "@arcgis/map-components/dist/components/arcgis-legend";
import "@arcgis/map-components/dist/components/arcgis-expand";
import "@arcgis/map-components/dist/components/arcgis-layer-list";
import Map from "@arcgis/core/map"
import MapView from "@arcgis/core/views/MapView"
import LayerList from "@arcgis/core/widgets/LayerList"
import Legend from "@arcgis/core/widgets/Legend"

import Menu from "./Menu";
import Header from "./Header";

import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles'

import { ArcgisMap, ArcgisExpand, ArcgisFeatureTable, ArcgisLayerList, ArcgisLegend } from "@arcgis/map-components-react";
import { CssBaseline, Box, Popover, Typography, Toolbar } from "@mui/material";
import Grid from "@mui/material/Grid2"

import { setAssetPath as setCalciteComponentsAssetPath } from '@esri/calcite-components/dist/components';
setCalciteComponentsAssetPath("https://js.arcgis.com/calcite-components/2.13.2/assets");

import { createCensusGroupLayer } from "@/app/lib/displayCensus";
import { createCountLayer } from "@/app/lib/displayCounts";
import { createIncidentGroupLayer } from "@/app/lib/displayIncidents";
import { addVisualizationOptions } from "@/app/lib/utils";
import GroupLayer from "@arcgis/core/layers/GroupLayer";


export default function DashboardMap() {

    const theme = useTheme();
    const [open, setOpen] = React.useState(false);

    const handleDrawerOpen = () => {
    setOpen(true);
    };

    const handleDrawerClose = () => {
    setOpen(false);
    };

    const [showLegend, setShowLegend] = useState<Boolean>(false)
    const [showLayerList, setShowLayerList] = useState<Boolean>(false)
    const [ mapElRef, setMapElRef ] = useState(null)
    const [ mapRef, setMapRef ] = useState<Map | null>(null)
    const [ viewRef, setViewRef ] = useState<MapView | null>(null)
    const [ countLayer, setCountLayer ] = useState<GroupLayer | null>(null)
    const [ incidentLayer, setIncidentLayer ] = useState<GroupLayer | null>(null)

    // once map is generated, load feature layers and add to the map
    useEffect(() => {
        if (mapRef !== null) {

            const createLayers = async () => {
                const censusGroupLayer = await createCensusGroupLayer()
                const countGroupLayer = await createCountLayer()
                const incidentGroupLayer = await createIncidentGroupLayer()

                
                mapRef.add(censusGroupLayer)
                mapRef.add(countGroupLayer)
                mapRef.add(incidentGroupLayer)
                
                setCountLayer(countGroupLayer)
                setIncidentLayer(incidentGroupLayer)
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

            // let widgetNode = document.createElement('div')
            // let widgetRoot = createRoot(widgetNode)
            // viewRef.ui.add(widgetNode)
            // widgetRoot.render(<MenuWidget />)

            const layerList = new LayerList({
                view: viewRef,
                container: 'layer-list-container',
                listItemCreatedFunction: addVisualizationOptions
            })
            const legend = new Legend({
                view: viewRef,
                container: 'legend-container'
            })
            
            // viewRef.ui.add([layerList, legend], "top-left")
            
        }
        
    }, [viewRef])
    
    const assignMap = (event: any) => {

        setMapElRef(event.target)
        setMapRef(event.target.map)
        setViewRef(event.target.view)
        
    }

    


    return (
        <Box id="app-container" sx={{ display: 'flex', height: '100vh'}}>
            <CssBaseline />
            <Header open={open} handleDrawerOpen={handleDrawerOpen} />
            <Menu open={open} handleDrawerClose={handleDrawerClose} setShowLegend={setShowLegend} showLegend={showLegend} setShowLayerList={setShowLayerList} showLayerList={showLayerList} />
            
            {/* Legend Panel */}
            <Grid justifyContent="center" sx={{display: showLegend ? 'block': 'none', marginTop: '64px'}}>
                <Grid size={12} my={2}>
                    <Typography align='center' variant='h5'>Legend</Typography>
                </Grid>
                <div id="legend-container"></div>
            </Grid>
            {/* Layer List Panel */}
            <Grid justifyContent="center" sx={{display: showLayerList ? 'block': 'none', marginTop: '64px'}}>
                <Grid size={12} my={2}>
                        <Typography align='center' variant='h5'>Layers</Typography>
                        
                    </Grid>
                <div id="layer-list-container"></div>
            </Grid>

            
            {/* <Box sx={{display: showLayerList ? 'block': 'none', marginTop: '64px'}}>
                <Typography>Filters</Typography>
                <Toolbar />
                <div id="filter-container"></div>
            </Box> */}
            <Box component="main" sx={{ flexGrow: 1 }}>
                
                    {/* <DrawerHeader /> */}
                <ArcgisMap
                    basemap="topo-vector"
                    // itemId="d5dda743788a4b0688fe48f43ae7beb9"
                    onArcgisViewReadyChange={assignMap}
                    >
                

                {/* <ArcgisLegend position="bottom-left"></ArcgisLegend> */}
                {/* <ArcgisExpand
                    position="top-right"
                    mode="auto"
                    >
                    <ArcgisLayerList />
                    <ArcgisLegend />
                </ArcgisExpand> */}
                
                {/* <ArcgisExpand
                    position="top-right"
                    mode="auto">
                    <ArcgisLayerList />
                </ArcgisExpand> */}
                {/* <ArcgisExpand>
                    <ArcgisFeatureTable
                    
                        layerUrl = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/1"
                        />
                </ArcgisExpand> */}

                </ArcgisMap>
               
                
            </Box>
            
            
        </Box>
    )

    
}