'use client';

import React, {  useRef, useState, useEffect } from "react";

import "@arcgis/map-components/dist/components/arcgis-map";
import "@arcgis/map-components/dist/components/arcgis-legend";
import "@arcgis/map-components/dist/components/arcgis-expand";
import "@arcgis/map-components/dist/components/arcgis-layer-list";
import { ArcgisMap, ArcgisExpand, ArcgisFeatureTable, ArcgisLayerList, ArcgisLegend } from "@arcgis/map-components-react";

import { setAssetPath as setCalciteComponentsAssetPath } from '@esri/calcite-components/dist/components';
setCalciteComponentsAssetPath("https://js.arcgis.com/calcite-components/2.13.2/assets");

import { createCensusGroupLayer, addCensusRendering } from "@/app/lib/displayCensus";

export default function DashboardMap() {


    const [ mapRef, setMapRef ] = useState(null)

    // once map is generated, load feature layers and add to the map
    useEffect(() => {
        if (mapRef !== null) {
            console.log(mapRef)
            const censusGroupLayer = createCensusGroupLayer()

            mapRef.add(censusGroupLayer)
            addCensusRendering()
        }
        
    }, [mapRef])
    
    const assignMap = (event: any) => {
        console.log(event.target)
        setMapRef(event.target.map)
    }



    return (
        <div id="app-container">
            <ArcgisMap
                basemap="topo-vector"
                // itemId="d5dda743788a4b0688fe48f43ae7beb9"
                onArcgisViewReadyChange={assignMap}

            >
                {/* <ArcgisLegend position="bottom-left"></ArcgisLegend> */}
                <ArcgisExpand
                    position="top-right"
                    mode="floating"
                    >
                    <ArcgisLegend />
                </ArcgisExpand>
                <ArcgisExpand
                    position="top-right"
                    mode="floating">
                    <ArcgisLayerList />
                </ArcgisExpand>
                {/* <ArcgisExpand>
                    <ArcgisFeatureTable
                    
                        layerUrl = "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/1"
                        />
                </ArcgisExpand> */}

            </ArcgisMap>
            
        </div>
    )

    
}