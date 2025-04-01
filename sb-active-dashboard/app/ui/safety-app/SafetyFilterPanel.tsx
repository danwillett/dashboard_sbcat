import React, { useState, useEffect } from "react";

import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import FeatureFilter from '@arcgis/core/layers/support/FeatureFilter';
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";

import { FormControl, RadioGroup, FormLabel, FormControlLabel, Radio, Box, Typography } from "@mui/material";


// changes size visualVariables of counts and incidents
export default function SafetyFilterPanel(props: any) {

    const { heatmapLayer, timeSlider, viewRef } = props
    const [ incidentLayerView, setIncidentLayerView ] = useState<null | FeatureLayerView>(null)
    const [ weightFields, setWeightFields ] = useState<null | Record<string, any>[]>(null)
    const [ userType, setUserType ] = useState<null | string>(null)
    
    const filterUser = (event: React.MouseEvent<HTMLButtonElement>) => {
        const newUser = (event.target as HTMLInputElement).value
        setUserType(newUser)

    };

    // weighting factors
    // heatmap weights field
    
    const changeWeightField = (event: React.MouseEvent<HTMLButtonElement>) => {      
        if (heatmapLayer !== null ) {
            heatmapLayer.renderer['field'] = (event.target as HTMLInputElement).value
        }  
    }

    const setLayerView = async () => {
        const layerView = await viewRef?.whenLayerView(heatmapLayer)
        setIncidentLayerView(layerView)
    }

    const setFilters = async () => {
        if (heatmapLayer !== null && incidentLayerView !==null && timeSlider !== null && viewRef !==null) {
            
            // time filter
            reactiveUtils.watch(
                () => timeSlider?.timeExtent,
                async () => {
                    const date = new Date(timeSlider.timeExtent.end).toISOString().replace("T", " ").replace("Z", "")
                
                    heatmapLayer.definitionExpression =  "timestamp <= Timestamp '" + date + "'";
                   
                    incidentLayerView.featureEffect = new FeatureEffect({
                        filter: {
                            timeExtent: timeSlider.timeExtent,
                            geometry: viewRef.extent
                        },
                        excludedEffect: "grayscale(20%) opacity(12%)"
                    });
                    
                }
            )
        }
    }

    useEffect(() => {
        if (heatmapLayer !== null) {
            setLayerView()
        }
    }, [heatmapLayer])

    // filters
    useEffect(() => {
        if (timeSlider !== null && incidentLayerView !== null) {
            setFilters()

            // set heatmap weight fields in form
            let fields:any = heatmapLayer.fields
            fields = fields.filter((field: any) => field.type === "double" || field.name === "oid")
            fields.push({
                "name": "",
                "alias": "No Normalization"
            })

            setWeightFields(fields)

            // set user type filter in form
            setUserType("bicyclist")
        }


    }, [incidentLayerView, timeSlider])

    useEffect(() => {

        if (incidentLayerView !== null && userType !== null) {
            incidentLayerView.filter = new FeatureFilter({
                where: `${userType} = 1`
            })
        }
        
    }, [incidentLayerView, userType])

    const fonts = ['"Avenir Next"', '"Helvetica Neue"', 'helvetica', 'Arial', 'sans-serif'].join(',')

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>

            
            <Box sx={{width: 300}}>

                {/* Peds vs Bicyclists */}
                <FormControl fullWidth sx={{mb: 3}}>
                    <FormLabel sx={{ fontSize: '14px', fontFamily: fonts}} id="select-road-user-label">Select a road user</FormLabel>
                    <RadioGroup
                        row
                        aria-labelledby="select-road-user-label"
                        name="select-road-user"
                        value={userType}
                    >
                        <FormControlLabel 
                            value="bicyclist" 
                            control={<Radio onClick={filterUser} />} 
                            label="Bicyclist" 
                            slotProps={{
                                    typography: {
                                      sx: { fontSize: '14px', fontFamily: "Avenir Next, Helvetica Neue, helvetica, Arial, sans-serif" },
                                    },
                                  }}
                            />
                        <FormControlLabel 
                            value="pedestrian" 
                            disabled 
                            control={<Radio onClick={filterUser} />} 
                            label="Pedestrian" 
                            slotProps={{
                                typography: {
                                  sx: { fontSize: '14px', fontFamily: "Avenir Next, Helvetica Neue, helvetica, Arial, sans-serif" },
                                },
                              }}
                            />
                        
                    </RadioGroup>
                </FormControl>

                <FormLabel sx={{ fontSize: '14px', fontFamily: fonts}} id="render-options">Normalize incidents by:</FormLabel>
                { weightFields && (
                    <RadioGroup
                    aria-labelledby="render-options"
                    defaultValue={weightFields[0].name}
                    name="radio-buttons-group"
                    >
                        { weightFields.map((attribute) => (
                            <FormControlLabel 
                               
                                key={attribute.name} 
                                value={attribute.name} 
                                control={
                                    <Radio 
                                        sx={{
                                            '& .MuiSvgIcon-root': {
                                            fontSize: 20,
                                            }
                                        }}
                                        onClick={changeWeightField} 
                                    />}
                                label={attribute.alias} 
                                slotProps={{
                                    typography: {
                                      sx: { fontSize: '14px', fontFamily: "Avenir Next, Helvetica Neue, helvetica, Arial, sans-serif" },
                                    },
                                  }}
                                />
                        ))}
                        
                    </RadioGroup>
                )}
                
                
                {/* <FormControl fullWidth>
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

                    
                    
                </FormControl> */}

            </Box>
            <Typography variant='body2' align="left" my={2} sx={{width: '100%', px: '20px'}} >Select a timeframe</Typography>
            <div id="safety-time-slider-container"></div>
            
        </Box>
        
    )


}