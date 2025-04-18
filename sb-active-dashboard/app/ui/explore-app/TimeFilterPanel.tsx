'use client';
import React, { useState, useEffect } from "react";

// map context and types
import { useMapContext } from "@/app/lib/context/MapContext";

// arcgis js
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect";

// mui
import { FormControl, InputLabel, MenuItem, Box, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2"
import Select, { SelectChangeEvent } from '@mui/material/Select';



// changes size visualVariables of counts and incidents
export default function TimeFilterPanel() {

    const { countGroupLayer, incidentGroupLayer, timeSlider, viewRef } = useMapContext()
    const [ dow, setDow ] = useState("all")
    const [ tod, setTod ] = useState("anytime")
    
    const handleDowChange = (event: SelectChangeEvent) => {
        setDow(event.target.value)
        
    //    add dow filtering
    };

    const handleTodChange = (event: SelectChangeEvent) => {
        setTod(event.target.value)
    }

    const setFilters = async () => {
        if (incidentGroupLayer !== null && countGroupLayer !== null && timeSlider !== null && viewRef !==null) {
            
            // incident layers
            const groupIncidentView = await viewRef?.whenLayerView(incidentGroupLayer)
            const incidentLayers = incidentGroupLayer.layers.items
            const incidentLayerViews = groupIncidentView.layerViews.items

            // count layers
            const groupCountView = await viewRef?.whenLayerView(countGroupLayer)
            const countLayers = countGroupLayer.layers.items
            const countLayerViews = groupCountView.layerViews.items
            
            reactiveUtils.watch(
                () => timeSlider?.timeExtent,
                async () => {
                    
                    const date = new Date(timeSlider.timeExtent.end).toISOString().replace("T", " ").replace("Z", "")
                
                    incidentLayers.map((layer: FeatureLayer) => {
                        layer.definitionExpression =  "timestamp <= Timestamp '" + date + "'";
                    })

                    incidentLayerViews.map((layerView: FeatureLayerView) => {
                        layerView.featureEffect = new FeatureEffect({
                            filter: {
                            timeExtent: timeSlider.timeExtent,
                            geometry: viewRef.extent
                            },
                            excludedEffect: "grayscale(20%) opacity(12%)"
                        });
                    })

                    countLayers.map((layer: FeatureLayer) => {
                        console.log(layer)
                        layer.definitionExpression =  `end_date <=  Timestamp '${date}'`;
                    })

                    countLayerViews.map((layerView: FeatureLayerView) => {
                        layerView.featureEffect = new FeatureEffect({
                            filter: {
                            timeExtent: timeSlider.timeExtent,
                            geometry: viewRef.extent
                            },
                            excludedEffect: "grayscale(20%) opacity(12%)"
                        });
                    })
                }
            )

        }
    }

    // filters
    useEffect(() => {
        if (timeSlider !== null) {
            setFilters()
        }
    }, [countGroupLayer, incidentGroupLayer, timeSlider])


    return (
        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>

            <Box sx={{width: '100%'}}>

                <Typography variant='body1' align="left" my={2} sx={{width: '100%', px: '20px'}}>Time Filters</Typography>
                
                <FormControl fullWidth sx={{mb: 3}}>
                    <InputLabel id="dow-select-label">Day of Week</InputLabel>
                    <Select
                        labelId="dow-select-label"
                        id="dow-select"
                        value={dow}
                        label="Day of Week"
                        onChange={handleDowChange}
                    >
                        <MenuItem value="all">All Days</MenuItem>
                        <MenuItem value="weekdays">Weekdays</MenuItem>
                        <MenuItem value="weekends">Weekends</MenuItem>
                    </Select>
                </FormControl>

                <FormControl fullWidth>
                    <InputLabel id="tod-select-label">Time of Day</InputLabel>
                    <Select
                        labelId="tod-select-label"
                        id="tod-select"
                        value={tod}
                        label="Time of Day"
                        onChange={handleTodChange}
                    >
                        <MenuItem value="anytime">Anytime</MenuItem>
                        <MenuItem value="morning">6AM - 10AM</MenuItem>
                        <MenuItem value="midday">11AM - 3PM</MenuItem>
                        <MenuItem value="evening">4PM - 8PM</MenuItem>
                    </Select>

                    {/* <Typography align='left' variant='body1'>Time</Typography>
                    <InputLabel id="user-type-select-label">Time</InputLabel> */}
                    
                </FormControl>

            </Box>
            <Typography variant='body2' align="left" my={2} sx={{width: '100%', px: '20px'}} >Select a year range</Typography>
            <div id="explore-time-slider-container"></div>
            
        </Box>
        
    )


}