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
import { FormControl, InputLabel, MenuItem, Box, Typography, FormControlLabel, Checkbox } from "@mui/material";
import Grid from "@mui/material/Grid2"
import Select, { SelectChangeEvent } from '@mui/material/Select';



// changes size visualVariables of counts and incidents
export default function TimeFilterPanel() {

    const { countGroupLayer, incidentGroupLayer, timeSlider, viewRef, mapRef } = useMapContext()


    // Day of week filters
    // weekdays
    const [wdChecked, setWdChecked] = React.useState([true, true, true, true, true]);
    const handleChangeWeekdays= (event: React.ChangeEvent<HTMLInputElement>) => {
        setWdChecked([event.target.checked, event.target.checked, event.target.checked, event.target.checked, event.target.checked]);
    };
    const handleChangeMon = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWdChecked([event.target.checked, wdChecked[1], wdChecked[2], wdChecked[3], wdChecked[4]]);
    };
    const handleChangeTue = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWdChecked([wdChecked[0], event.target.checked, wdChecked[2], wdChecked[3], wdChecked[4]]);
    };
    const handleChangeWed = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWdChecked([wdChecked[0], wdChecked[1], event.target.checked, wdChecked[3], wdChecked[4]]);
    };
    const handleChangeThu = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWdChecked([wdChecked[0], wdChecked[1], wdChecked[2], event.target.checked,  wdChecked[4]]);
    };
    const handleChangeFri = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWdChecked([wdChecked[0], wdChecked[1], wdChecked[2], wdChecked[3], event.target.checked]);
    };
    const weekdayChildren = (
        <Box sx={{ display: 'flex', flexDirection: 'column', ml: 3 }}>
          <FormControlLabel
            label="Monday"
            control={<Checkbox checked={wdChecked[0]} onChange={handleChangeMon} />}
          />
          <FormControlLabel
            label="Tuesday"
            control={<Checkbox checked={wdChecked[1]} onChange={handleChangeTue} />}
          />
          <FormControlLabel
            label="Wednesday"
            control={<Checkbox checked={wdChecked[2]} onChange={handleChangeWed} />}
          />
          <FormControlLabel
            label="Thursday"
            control={<Checkbox checked={wdChecked[3]} onChange={handleChangeThu} />}
          />
          <FormControlLabel
            label="Friday"
            control={<Checkbox checked={wdChecked[4]} onChange={handleChangeFri} />}
          />
        </Box>
      );
    // weekends
    const [weChecked, setWeChecked] = React.useState([true, true]);
    const handleChangeWeekends = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWeChecked([event.target.checked, event.target.checked])
    };
    const handleChangeSat = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWeChecked([event.target.checked, weChecked[1]])
    }
    const handleChangeSun = (event: React.ChangeEvent<HTMLInputElement>) => {
        setWeChecked([weChecked[0], event.target.checked])
    }
    const weekendChildren = (
        <Box sx={{ display: 'flex', flexDirection: 'column', ml: 3 }}>
          <FormControlLabel
            label="Saturday"
            control={<Checkbox checked={weChecked[0]} onChange={handleChangeSat} />}
          />
          <FormControlLabel
            label="Sunday"
            control={<Checkbox checked={weChecked[1]} onChange={handleChangeSun} />}
          />
        </Box>
      );

    const filterDOW = async () => {
        if (incidentGroupLayer !== null && mapRef !== null && viewRef !== null) {
            const safetyGroup = mapRef.allLayers.find((layer) => layer.title === "Safety")
            if (safetyGroup) {
                const groupIncidentView = await viewRef?.whenLayerView(incidentGroupLayer)
                const incidentLayerViews = groupIncidentView.layerViews.items
                console.log("safety views:", incidentLayerViews)
            }
        }
    }
    
    useEffect(() => {
        console.log(mapRef?.allLayers)
        filterDOW()
    }, [wdChecked, weChecked])

    const [ tod, setTod ] = useState("anytime")
    
 
    const handleTodChange = (event: SelectChangeEvent) => {
        setTod(event.target.value)
    }


    // const setFilters = async () => {
    //     if (incidentGroupLayer !== null && countGroupLayer !== null && timeSlider !== null && viewRef !==null) {
            
    //         // incident layers
    //         const groupIncidentView = await viewRef?.whenLayerView(incidentGroupLayer)
    //         const incidentLayers = incidentGroupLayer.layers.items
    //         const incidentLayerViews = groupIncidentView.layerViews.items

    //         // count layers
    //         const groupCountView = await viewRef?.whenLayerView(countGroupLayer)
    //         const countLayers = countGroupLayer.layers.items
    //         const countLayerViews = groupCountView.layerViews.items
            
    //         reactiveUtils.watch(
    //             () => timeSlider?.timeExtent,
    //             async () => {
                    
    //                 const date = new Date(timeSlider.timeExtent.end).toISOString().replace("T", " ").replace("Z", "")
                
    //                 incidentLayers.map((layer: FeatureLayer) => {
    //                     layer.definitionExpression =  "timestamp <= Timestamp '" + date + "'";
    //                 })

    //                 incidentLayerViews.map((layerView: FeatureLayerView) => {
    //                     layerView.featureEffect = new FeatureEffect({
    //                         filter: {
    //                         timeExtent: timeSlider.timeExtent,
    //                         geometry: viewRef.extent
    //                         },
    //                         excludedEffect: "grayscale(20%) opacity(12%)"
    //                     });
    //                 })

    //                 countLayers.map((layer: FeatureLayer) => {
    //                     console.log(layer)
    //                     layer.definitionExpression =  `end_date <=  Timestamp '${date}'`;
    //                 })

    //                 countLayerViews.map((layerView: FeatureLayerView) => {
    //                     layerView.featureEffect = new FeatureEffect({
    //                         filter: {
    //                         timeExtent: timeSlider.timeExtent,
    //                         geometry: viewRef.extent
    //                         },
    //                         excludedEffect: "grayscale(20%) opacity(12%)"
    //                     });
    //                 })
    //             }
    //         )

    //     }
    // }

    // filters
    useEffect(() => {
        if (timeSlider !== null) {
            console.log("time slider?")
            // setFilters()
        }
    }, [countGroupLayer, incidentGroupLayer, timeSlider])


    return (
        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>

            <Box sx={{width: '100%'}}>

                <Typography variant='body1' align="left" my={2} sx={{width: '100%', px: '20px'}}>Time Filters</Typography>
                
                <FormControl fullWidth sx={{mb: 3}}>
                    <Box sx={{display: 'flex', width: '100%', justifyContent: 'space-around'}}>
                        
                        <Box>
                            <FormControlLabel
                                label="Weekdays"
                                control={
                                    <Checkbox 
                                        checked={wdChecked[0] && wdChecked[1] && wdChecked[2] && wdChecked[3] && wdChecked[4]}
                                        indeterminate={!wdChecked.every(c => c === wdChecked[0])}
                                        onChange={handleChangeWeekdays}
                                    />
                                }
                                />
                            {weekdayChildren}
                        </Box>
                        
                        <Box>
                            <FormControlLabel
                                label="Weekends"
                                control={
                                    <Checkbox 
                                        checked={weChecked[0] && weChecked[1]}
                                        indeterminate={!weChecked.every(c => c === weChecked[0])}
                                        onChange={handleChangeWeekends}
                                    />
                                }
                                />
                            {weekendChildren}
                        </Box>
                    </Box>
                    
                    
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