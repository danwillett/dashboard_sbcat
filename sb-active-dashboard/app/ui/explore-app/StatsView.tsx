'use client'

import React, { useEffect, useState } from "react"

// import global state variables
import { useMapContext } from "@/app/lib/context/MapContext";

import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js"

import Grid from '@mui/material/Grid2'
import { Box, Typography, Card, CardContent } from "@mui/material"


import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import GroupLayerView from "@arcgis/core/views/layers/GroupLayerView";

type PedCountStats = {
    filtered_ped: number | null
    total_ped: number | null
}

type CountStats = {
    filtered: number | null
    total: number | null
}

type StatsSetter = React.Dispatch<React.SetStateAction<any>>;

function setupCountLayerWatch({
  view,
  layer,
  reactiveUtils,
  setStats,
  statsKey,
  existingStats,
}: {
  view: __esri.MapView,
  layer: __esri.FeatureLayer,
  reactiveUtils: typeof import("@arcgis/core/core/reactiveUtils"),
  setStats: StatsSetter,
  statsKey: string,
  existingStats: any,
}) {
  view.whenLayerView(layer).then((layerView) => {
    reactiveUtils.watch(
      () => [layerView.updating, view.stationary],
      ([isUpdating, isStationary]) => {
        if (!isUpdating || isStationary) {
          let where = "1=1";
          if (layerView.filter?.where) {
            where = layerView.filter.where;
          }
          console.log(where)
          layerView.queryFeatures({
            geometry: view.extent,
            where,
            spatialRelationship: "intersects",
            returnGeometry: false,
            outFields: ["*"],
          }).then((result) => {
            console.log(result)
            setStats({
              ...existingStats,
              [statsKey]: result.features.length,
            });
          });
        }
      }
    );
  });
}

export default function StatsView() {
    const { mapRef, viewRef, countGroupLayer, censusGroupLayer, incidentGroupLayer, volumeChecks, safetyChecks } = useMapContext()
    // Get count site statistics (number of sites by type)
    const [ pedCountStats, setPedCountStats ] = useState<CountStats>({
        "filtered": null,
        "total": null,
    })
    const [ bikeCountStats, setBikeCountStats ] = useState<CountStats>({
        "filtered": null,
        "total": null
    })
    useEffect(() => {
        
        if (!viewRef || !countGroupLayer || !mapRef) return
        const volumeGroup = mapRef.allLayers.find((layer): layer is GroupLayer => layer.title === "Volumes" && layer.type === "group") as GroupLayer
        
        if (!volumeGroup) {
            setPedCountStats({
                "filtered": null,
                "total": null,
                
            })
            setBikeCountStats({
                "filtered": null,
                "total": null
            })
            return
        } 
        const pedLayer = volumeGroup.allLayers.find((layer): layer is FeatureLayer => layer.title === "Walking Volumes") as FeatureLayer
        if (pedLayer.visible) {
            setupCountLayerWatch({
                view: viewRef,
                layer: pedLayer,
                reactiveUtils,
                setStats: setPedCountStats,
                statsKey: "filtered",
                existingStats: pedCountStats,
              });
            
            
        } else {
            setPedCountStats({
                "filtered": null,
                "total": null
            })
        }

        const bikeLayer = volumeGroup.allLayers.find((layer): layer is FeatureLayer => layer.title === "Biking Volumes") as FeatureLayer
        if (bikeLayer.visible) {

            setupCountLayerWatch({
                view: viewRef,
                layer: bikeLayer,
                reactiveUtils,
                setStats: setBikeCountStats,
                statsKey: "filtered",
                existingStats: bikeCountStats,
              });
            
            
            
        } else {
            setBikeCountStats({
                "filtered": null,
                "total": null
            })
        }
        

    }, [viewRef, countGroupLayer, mapRef, volumeChecks])
    
    

    // Get Safety statistics
    const [ pedSafetyStats, setPedSafetyStats ] = useState<CountStats>({
        filtered: null,
        total: null
    })

    const [ bikeSafetyStats, setBikeSafetyStats ] = useState<CountStats>({
        filtered: null,
        total: null
    })

    useEffect(() => {
        if (!viewRef || !countGroupLayer || !mapRef) return
        const safetyGroup = mapRef.allLayers.find((layer): layer is GroupLayer => layer.title === "Safety" && layer.type === "group") as GroupLayer
        
        if (!safetyGroup) {
            setPedSafetyStats({
                "filtered": null,
                "total": null,
                
            })
            setBikeSafetyStats({
                "filtered": null,
                "total": null
            })
            return
        } 
        const pedLayer = safetyGroup.allLayers.find((layer): layer is FeatureLayer => layer.title === "Walking Incidents") as FeatureLayer
        if (pedLayer.visible) {
            setupCountLayerWatch({
                view: viewRef,
                layer: pedLayer,
                reactiveUtils,
                setStats: setPedSafetyStats,
                statsKey: "filtered",
                existingStats: pedSafetyStats,
              });
            
            
        } else {
            setPedSafetyStats({
                "filtered": null,
                "total": null
            })
        }

        const bikeLayer = safetyGroup.allLayers.find((layer): layer is FeatureLayer => layer.title === "Biking Incidents") as FeatureLayer
        if (bikeLayer.visible) {

            setupCountLayerWatch({
                view: viewRef,
                layer: bikeLayer,
                reactiveUtils,
                setStats: setBikeSafetyStats,
                statsKey: "filtered",
                existingStats: bikeSafetyStats,
              });
            
            
            
        } else {
            setBikeSafetyStats({
                "filtered": null,
                "total": null
            })
        }
    }, [viewRef, incidentGroupLayer, mapRef, safetyChecks ])


    return (
        <Card
        sx={{
          my: 3,
          width: '100%',
          borderRadius: 2,
          boxShadow: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Summary Stats
          </Typography>
          <Grid container spacing={2}>
            {pedCountStats.filtered !== null && (
                <Grid size={6}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Walking Sites
                    </Typography>
                    <Typography variant="h6">{pedCountStats.filtered}</Typography>
              </Grid>
            )}
            {bikeCountStats.filtered !== null && (
                <Grid size={6}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Biking Sites
                    </Typography>
                    <Typography variant="h6">{bikeCountStats.filtered}</Typography>
              </Grid>
            )}
            {pedSafetyStats.filtered !== null && (
                <Grid size={6}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Walking Incidents
                    </Typography>
                    <Typography variant="h6">{pedSafetyStats.filtered}</Typography>
              </Grid>
            )}
            {bikeSafetyStats.filtered !== null && (
                <Grid size={6}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Biking Incidents
                    </Typography>
                    <Typography variant="h6">{bikeSafetyStats.filtered}</Typography>
              </Grid>
            )}
            
          </Grid>
        </CardContent>
      </Card>
    )
}