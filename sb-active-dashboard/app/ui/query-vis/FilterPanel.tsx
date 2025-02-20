import React, { useState, useEffect } from "react";

import FeatureFilter from '@arcgis/core/layers/support/FeatureFilter'
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";

import { FormControl, InputLabel, MenuItem, Box, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2"
import Select, { SelectChangeEvent } from '@mui/material/Select';


// changes size visualVariables of counts and incidents
export default function FilterPanel(props) {

    const { countGroupLayer, incidentGroupLayer, timeSlider, viewRef } = props
    const [ userType, setUserType ] = useState("both")
    
    const handleTypeChange = (event: SelectChangeEvent) => {
        setUserType(event.target.value)
        console.log(countGroupLayer)
        console.log(incidentGroupLayer)
        
        incidentGroupLayer.layers.items.map((sublayer) => {
            // sublayer.
        })


        let { start, end } = incidentGroupLayer.timeInfo.fullTimeExtent
        console.log(start, end)

        // countGroupLayer.filter = new FeatureFilter({
        //     timeExtent: 
        // })
    };

    const setIncidentFilters = async () => {
        if (incidentGroupLayer !== null && timeSlider !== null && viewRef !==null) {
            console.log(incidentGroupLayer)
            const groupIncidentView = await viewRef?.whenLayerView(incidentGroupLayer)

            const incidentLayers = incidentGroupLayer.layers.items
            const incidentLayerViews = groupIncidentView.layerViews.items
            
            reactiveUtils.watch(
                () => timeSlider?.timeExtent,
                async () => {
                    const date = new Date(timeSlider.timeExtent.end).toISOString().replace("T", " ").replace("Z", "")
                    incidentLayers.map((layer) => {
                        layer.definitionExpression = "timestamp <= Timestamp '" + date + "'";
                    })

                    incidentLayerViews.map((layerView) => {
                        layerView.featureEffect = {
                            filter: {
                            timeExtent: timeSlider.timeExtent,
                            geometry: viewRef.extent
                            },
                            excludedEffect: "grayscale(20%) opacity(12%)"
                        };
                    })
                }
            )
        }
    }

    // filters
    useEffect(() => {
        if (timeSlider !== null) {
            setIncidentFilters()
        }
    }, [countGroupLayer, incidentGroupLayer, timeSlider])


    return (
        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>

            
            <Box sx={{width: 200}}>
                
                <FormControl fullWidth>
                    <InputLabel id="user-type-select-label">Age</InputLabel>
                        <Select
                            labelId="user-type-select-label"
                            id="user-type-select"
                            value={userType}
                            label="Road User"
                            onChange={handleTypeChange}
                        >
                            <MenuItem value="both">Bikes & Peds</MenuItem>
                            <MenuItem value="bikes">Bikes</MenuItem>
                            <MenuItem value="peds">Peds</MenuItem>
                        </Select>

                    {/* <Typography align='left' variant='body1'>Time</Typography>
                    <InputLabel id="user-type-select-label">Time</InputLabel> */}
                    
                </FormControl>

            </Box>
            <Typography variant='body2' align="left" my={2} sx={{width: '100%', px: '20px'}} >Select a timeframe</Typography>
            <div id="time-slider-container"></div>
            
        </Box>
        
    )


}