'use client';
import React, { useState, useEffect, useRef } from "react";

// map context and types
import { useMapContext } from "@/app/lib/context/MapContext";

// arcgis js
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import GroupLayerView from "@arcgis/core/views/layers/GroupLayerView";
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import TimeSlider from "@arcgis/core/widgets/TimeSlider"
import TimeInterval from "@arcgis/core/time/TimeInterval";


// mui
import { FormControl, InputLabel, MenuItem, Slider, Box, Typography, FormControlLabel, Checkbox } from "@mui/material";
import Grid from "@mui/material/Grid2"
import Select, { SelectChangeEvent } from '@mui/material/Select';



// changes size visualVariables of counts and incidents
export default function SafetyFilters() {

    const { incidentGroupLayer, viewRef, mapRef } = useMapContext()

    // Time of day filters
    // Slider and select UI
    const [todValue, setTodValue ] = useState<number[]>([0, 24])
    const [todStart, setTodStart ] = useState<string>('0')
    const [todEnd, setTodEnd ] = useState<string>('23')

    const handleTodChange = (event: Event, value: number | number[], activeThumb: number) => {
        
        if (Array.isArray(value)) {
            setTodValue(value);
            setTodStart(String(value[0]))
            setTodEnd(String(value[1]))  
        } else {
            setTodValue([value, value])
            setTodStart(String(value))
            setTodEnd(String(value))   
        }
        
    };
    const handleTodStartChange = (event: SelectChangeEvent) => {
        const label = event.target.value
        
        setTodStart(label)
        
        // if start time is less than end time, just change start, otherwise set 
        // end time to be equal to the new start time
        if (Number(label) <= todValue[1]) {
            setTodValue([Number(label), todValue[1]])
        } else {
            setTodValue([Number(label), Number(label)])
            setTodEnd(label)
        }
        

    }
    const handleTodEndChange = (event: SelectChangeEvent) => {
        const label = event.target.value
        
        setTodEnd(label)
        // if start time is less than end time, just change start, otherwise set 
        // end time to be equal to the new start time
        if (Number(label) >= todValue[0]) {
            setTodValue([todValue[0], Number(label)])
        } else {
            setTodValue([Number(label), Number(label)])
            setTodStart(label)
        }

    }
    
    // mark for every hour 
    const todLabels = [
        { value: 0, label: "12:00 AM" },
        { value: 1, label: "1:00 AM" },
        { value: 2, label: "2:00 AM" },
        { value: 3, label: "3:00 AM" },
        { value: 4, label: "4:00 AM" },
        { value: 5, label: "5:00 AM" },
        { value: 6, label: "6:00 AM" },
        { value: 7, label: "7:00 AM" },
        { value: 8, label: "8:00 AM" },
        { value: 9, label: "9:00 AM" },
        { value: 10, label: "10:00 AM" },
        { value: 11, label: "11:00 AM" },
        { value: 12, label: "12:00 PM" },
        { value: 13, label: "1:00 PM" },
        { value: 14, label: "2:00 PM" },
        { value: 15, label: "3:00 PM" },
        { value: 16, label: "4:00 PM" },
        { value: 17, label: "5:00 PM" },
        { value: 18, label: "6:00 PM" },
        { value: 19, label: "7:00 PM" },
        { value: 20, label: "8:00 PM" },
        { value: 21, label: "9:00 PM" },
        { value: 22, label: "10:00 PM" },
        { value: 23, label: "11:00 PM" },
      ];
    const todLabelsEnd = [
        { value: 0, label: "12:59 AM" },
        { value: 1, label: "1:59 AM" },
        { value: 2, label: "2:59 AM" },
        { value: 3, label: "3:59 AM" },
        { value: 4, label: "4:59 AM" },
        { value: 5, label: "5:59 AM" },
        { value: 6, label: "6:59 AM" },
        { value: 7, label: "7:59 AM" },
        { value: 8, label: "8:59 AM" },
        { value: 9, label: "9:59 AM" },
        { value: 10, label: "10:59 AM" },
        { value: 11, label: "11:59 AM" },
        { value: 12, label: "12:59 PM" },
        { value: 13, label: "1:59 PM" },
        { value: 14, label: "2:59 PM" },
        { value: 15, label: "3:59 PM" },
        { value: 16, label: "4:59 PM" },
        { value: 17, label: "5:59 PM" },
        { value: 18, label: "6:59 PM" },
        { value: 19, label: "7:59 PM" },
        { value: 20, label: "8:59 PM" },
        { value: 21, label: "9:59 PM" },
        { value: 22, label: "10:59 PM" },
        { value: 23, label: "11:59 PM" }
      ];
      
    // mark for every hour 
    const todMarks = [
        { value: 6, label: "6:00 AM" },
        { value: 12, label: "12:00 PM" },
        { value: 18, label: "6:00 PM" },
      ];
    const todValueText = (value: number) => {
        const label = todLabels.find((dict) => dict.value == value )
        return `${label?.label}`;
    }

    // time of day filter
    const filterTOD = async () => {
        const todFilter = `EXTRACT(HOUR FROM timestamp) BETWEEN ${todValue[0]} AND ${todValue[1]}`
        if (incidentGroupLayer !== null && mapRef !== null && viewRef !== null) {
            const safetyGroup = mapRef.allLayers.find((layer): layer is GroupLayer => layer.title === "Safety" && layer.type === "group")
            if (safetyGroup) {
                const groupIncidentView = await viewRef?.whenLayerView(incidentGroupLayer) as GroupLayerView;
                const incidentLayerViews = groupIncidentView.layerViews
                incidentLayerViews.map((incidentView: FeatureLayerView) => {
                    incidentView.filter = new FeatureFilter({
                        where: todFilter
                    })
                })
                
            }
        }
    }

    useEffect(() => {
        filterTOD()
    }, [todValue])


    // Day of week filters
    // Day of week UI
    // weekdays
    const [wdChecked, setWdChecked] = useState([true, true, true, true, true]);
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
    const [weChecked, setWeChecked] = useState([true, true]);
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

    // Day of Week data filtering
    const filterDOW = async () => {

        // create day of week filter from checkbox form
        const checks = [weChecked[1], ...wdChecked, weChecked[0]]
        const weekdays = [0, 1, 2, 3, 4, 5, 6] // ordered sunday (0) through saturday (6)
        const included_days = weekdays.filter((_, i) => checks[i])
        const weekdayFilter = `dow IN (${included_days.join(", ")})`

        // filter incidents by day of week
        if (incidentGroupLayer !== null && mapRef !== null && viewRef !== null) {
            const safetyGroup = mapRef.allLayers.find((layer): layer is GroupLayer => layer.title === "Safety" && layer.type === "group")
            if (safetyGroup) {
                const groupIncidentView = await viewRef?.whenLayerView(incidentGroupLayer) as GroupLayerView;
                const incidentLayerViews = groupIncidentView.layerViews
                incidentLayerViews.map((incidentView: FeatureLayerView) => {
                    incidentView.filter = new FeatureFilter({
                        where: weekdayFilter
                    })
                })
                
            }
        }
        
    }
    
    useEffect(() => {
        filterDOW()
    }, [wdChecked, weChecked])


    return (
        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>

            <Box sx={{width: '100%'}}>

                <Typography variant='body1' align="left" my={2} sx={{width: '100%', px: '20px'}}>Day of Week</Typography>
                
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
                
                <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', width: '100%'}}>
                    <FormControl >
                        <InputLabel id="tod-start-select-label">Start</InputLabel>
                        <Select
                            labelId="tod-start-select-label"
                            id="select-tod-start"
                            value={todStart}
                            label="Age"
                            onChange={handleTodStartChange}
                        >
                            {todLabels.map((hour) => (
                                <MenuItem value={hour.value}>{hour.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl >
                        <InputLabel id="tod-end-select-label">End</InputLabel>
                        <Select
                            labelId="tod-end-select-label"
                            id="select-tod-end"
                            value={todEnd}
                            label="Age"
                            onChange={handleTodEndChange}
                        >
                            {todLabelsEnd.map((hour) => (
                                <MenuItem value={hour.value}>{hour.label}</MenuItem>
                            ))}
                            
                        </Select>
                    </FormControl>
                    <Slider
                        getAriaLabel={() => 'Time of day'}
                        value={todValue}
                        step={1}
                        min={0}
                        max={23}
                        marks={todMarks}
                        onChange={handleTodChange}
                        valueLabelDisplay="auto"
                        valueLabelFormat={todValueText}
                        getAriaValueText={todValueText}
                        sx={{width: '100%'}}
                        />

                </Box>      


            </Box>
            
        </Box>
        
    )


}