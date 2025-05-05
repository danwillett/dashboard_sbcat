'use client'

import React, { useEffect } from "react"

// import global state variables
import { useMapContext } from "@/app/lib/context/MapContext";

import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js"

import Grid from '@mui/material/Grid2'
import { Box, Typography } from "@mui/material"

import { getCountStats } from "@/app/lib/explore-app/getStats"

import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import GroupLayerView from "@arcgis/core/views/layers/GroupLayerView";



export default function StatsView() {
    const { mapRef, viewRef, countGroupLayer, censusGroupLayer, incidentGroupLayer, volumeChecks } = useMapContext()

    // useEffect(() => {
    //     if (!countGroupLayer) return;
    //     console.log("effect activated?")
    //     countGroupLayer.allLayers.map((layer) => {
    //         if (layer.visible) {
    //             layer.watch("filter", (newValue, oldValue, property) => {
    //                 console.log("Filter changed!", newValue, oldValue, property);
    //                 // Update UI elements or perform other actions based on the new filter
    //               })
    //         }
    //     })
    //     console.log(countGroupLayer)
    // }, [volumeChecks])

    const queryCount = () => {

    }

    useEffect(() => {
        
        if (!viewRef || !countGroupLayer || !mapRef) return
        const volumeGroup = mapRef.allLayers.find((layer): layer is GroupLayer => layer.title === "Volumes" && layer.type === "group") as GroupLayer
        
        if (!volumeGroup) return
        const pedLayer = volumeGroup.allLayers.find((layer): layer is FeatureLayer => layer.title === "Walking Volumes") as FeatureLayer
        if (pedLayer !== undefined) {
            viewRef.whenLayerView(pedLayer).then((layerView) => {
                reactiveUtils.whenOnce(() => !layerView.updating).then(() => {
                    layerView.queryFeatures({
                        geometry: viewRef.extent,
                        spatialRelationship: "intersects",
                        returnGeometry: false,
                        outFields: ["*"]
                        }).then((result) => {
                            console.log("ped counts in view from whenonce: ", result.features.length)
                        })
                    
                    
                });
                
                reactiveUtils.watch(
                    () => layerView.updating,
                    (isUpdating) => {
                        console.log(isUpdating, "updating peds?")
                        console.log(layerView.filter)
                        if (!isUpdating) {
                            layerView.queryFeatures({
                                geometry: viewRef.extent,
                                spatialRelationship: "intersects",
                                returnGeometry: false,
                                outFields: ["*"]
                                }).then((result) => {
                                    console.log("ped counts in view from watch: ", result.features.length)
                                    const visiblePoints = result.features.filter((point) => point.visible === true)
                                    console.log(visiblePoints)
                                })
                        }
                    
                    
                    
                });
                
            })
            
        }
        
        
        viewRef?.when().then(() => {
            // Watch for when the view becomes stationary (after user finishes interacting)
            reactiveUtils.watch(
              () => viewRef.stationary,
              async (isStationary) => {
                if (isStationary) {
                  const stats = await getCountStats(countGroupLayer, mapRef, viewRef);
                //   console.log("Updated stats by change in view:", stats);
                }
              }
            );

            
          });        

    }, [viewRef, countGroupLayer, mapRef, volumeChecks])
    
    


    return (
        <Box
            sx={{
                width: '250px',
                height: '250px'
            }}
        >
            These are the stats

        </Box>
    )
}