import React, { useEffect, useRef, useState } from "react";

import Query from '@arcgis/core/rest/support/Query.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'

import { Box, Grid, Checkbox, Typography, FormGroup, FormControl, FormControlLabel, Select, InputLabel, MenuItem, Button, OutlinedInput, Chip} from "@mui/material";
import { addSliderEventListener, createSlider } from "./utils";


const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const YearMenuProps = {
    PaperProps: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
      },
    },
  };

export default function VolumeSliderOptions(inputs) {

    const {onApplyOptions, handleSliderChange, sliderRef, sliderType} = inputs
    const [mode, setMode] = useState("bikes")
    const [bikes, setBikes] = useState(true)
    const [peds, setPeds] = useState(false)
    const [weekday, setWeekday] = useState(true)
    const [weekend, setWeekend] = useState(true)
    const [years, setYears] = useState([])
    const [yearChoices, setYearChoices] = useState([])

    const handleSelectChange = (event) => {
        const currentMode = event.target.value
        setMode(currentMode)
        if (currentMode == "bikes") {
            setBikes(true)
            setPeds(false)
        } else if (currentMode == "peds") {
            setBikes(false)
            setPeds(true)
        }
    }

    const handleWeekend = () => {
        setWeekend(!weekend)
    }
    const handleWeekday = () => {
        setWeekday(!weekday)
    }
    // const handleCheckboxChange = (day) => {
    //     // Update the selected options when a checkbox is changed
    //     if (day == "weekday") {
    //         setWeekday(!weekday)
    //     }
    //     if (day == "weekend") {
    //         setWeekend(!weekend)
    //     }
    // };

    const handleApplyOptions = () => {
        const name = bikes? "bike" : "ped"
        const days = weekday ? "'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'" : weekend ? "'Saturday', 'Sunday'" : "'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'"
        const dayFilter = `${name}_volumes_day IN (${days})`

        let yearFilterGood
        let yearFilter
        if (yearChoices.length > 0) {
          const yearSqlPieces = yearChoices.map((year)=> {
            return `${name}_volumes_date >= timestamp '${year}-01-01 00:00:00' And ${name}_volumes_date <= timestamp '${year}-12-31 12:59:59'` //Or bike_volumes_date >= timestamp '2020-01-01 00:00:00' And bike_volumes_date <= timestamp '2020-12-31 12:59:59'
          })
            yearFilter = yearSqlPieces.join(' Or ')
            yearFilterGood = true
          
        } else {
            yearFilterGood = false
        }

        const filters = yearFilterGood ? `${dayFilter} And ${yearFilter}` : dayFilter
        console.log(filters)

        const selectedOptions = {
            bikes: bikes,
            peds: peds,
            filter: filters
        }
        // Call the parent component's callback with the selected options
        onApplyOptions(selectedOptions);
       
    };

    const handleYearChange = (event) => {
        const {target: {value}} = event;
        setYearChoices(value)
    }

    const loadYears = () => {
        // return available years in walking_volumes (which may have more years than biking_volumes) to populate years filter option
        const dataUrl = "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/ATP_Volumes_SB/FeatureServer/0"
        const dateLayer = new FeatureLayer({
          url: dataUrl
        })
        const dateQuery = new Query()
        dateQuery.where = ""
        dateQuery.outFields = ["ped_volumes_date"];
        dateQuery.returnGeometry = false
        dateLayer.queryFeatures(dateQuery).then((results) => {
          let dateColumn = results.features
          const yearArray = dateColumn.map((entry) => {
            let timestamp = entry.attributes.ped_volumes_date
            let dateObj = new Date(timestamp)
  
            return dateObj.getFullYear()
          })
          const yearFilterArray = [...new Set(yearArray)]
          console.log(yearFilterArray)
          setYears(yearFilterArray.sort((a, b) => a - b))
  
        })
  
  
      }

    useEffect(()=>{
        loadYears()
    }, [])
  

    return (
        <Grid container>
            <Grid item>
                <Typography id="description" variant="h6" style={{ textAlign: 'center' }}>
                    Volumes
                </Typography>
            </Grid>
            <Grid item style={{width: "100%"}}>
                
            <Grid container style= {{ width: '100%'}} direction={"column"} justifyContent="center" alignItems="center">
            <Grid item>
                <Grid container direction="column">
                    <Typography id="description" variant="h8" style={{ textAlign: 'left' }}>
                        Select a travelling mode:
                    </Typography>
                    
                    <FormControl variant='standard'>
                        <Select
                            labelId="slider-type-label"
                            id="select-slider-type"
                            value={mode}
                            label="Counts By"
                            onChange={(event) => {

                                handleSelectChange(event)
                            }
                            }
                        >
                            <MenuItem value={"bikes"} className="esri-widget">Biking</MenuItem>
                            <MenuItem value={"peds"} className="esri-widget">Walking</MenuItem>

                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
            <Grid container direction="row" marginTop="20px" justifyContent="space-around" alignItems="center">
                <Grid container direction ="column" style={{maxWidth: "50%", width: "30%"}}>
                    <Typography id="description" variant="h8" style={{ textAlign: 'left', marginBottom: '10px'  }}>
                    Select years:
                    </Typography>
                    <FormControl>
                        <InputLabel id="select-years-label">Years</InputLabel>
                        <Select
                            labelId="select-years-label"
                            id="select-years"
                            
                            multiple
                            value={yearChoices}
                            onChange={handleYearChange}
                            input={<OutlinedInput id="select-multiple-chip" label="Chip" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                    <Chip key={value} label={value} />
                                ))}
                                </Box>
                            )}
                            MenuProps={YearMenuProps}
                            >
                            {years.map((year) => (
                                <MenuItem
                                key={year}
                                value={year}
                                // style={getStyles(year, personName, theme)}
                                >
                                {year}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid container direction ="column" style={{maxWidth: "50%", width: "30%"}}>
                    <Typography id="description" variant="h8" style={{ textAlign: 'left'}}>
                    Days to include:
                    </Typography>
                    <FormControl>
                        <Grid container direction="row">
                            <Grid container direction = "column">
                                <FormControlLabel
                                    label="Weekends"
                                    control={
                                        <Checkbox
                                        
                                        defaultChecked
                                        onChange={handleWeekend}
                                        />
                                    }
                                />
                                <FormControlLabel
                                    label="Weekdays"
                                    control={
                                        <Checkbox
                                        defaultChecked
                                        onChange={handleWeekday}
                                        />
                                    }
                                />
                                
                            </Grid>
                        
                        </Grid>
                    </FormControl>
                </Grid>
            </Grid>
            
            <Button variant="contained" onClick={handleApplyOptions}>Load Counts</Button>

        </Grid >
            </Grid>
            <Grid container alignItems="center" justifyContent="space-between" direction="row" padding={3}>
                <Grid item id="sliderContainer" style={{ height: "100px", width: "400px", marginTop: "10px", marginBottom: "10px" }}>
                    <div id="sliderElement" ref={sliderRef}></div>
                </Grid>
                <Grid item>
                    <FormControl variant='standard'>
                        <Select
                            labelId="slider-type-label"
                            id="select-slider-type"
                            value={sliderType}
                            label="Counts By"
                            onChange={(event) => {

                                handleSliderChange(event)
                            }
                            }
                            >
                            <MenuItem value={"range"} className="esri-widget">Range</MenuItem>
                            <MenuItem value={"hourly"} className="esri-widget">Hourly</MenuItem>

                        </Select>
                        {/* <Checkbox className="esri-widget"></Checkbox> */}
                    </FormControl>
                </Grid>
            </Grid>


        </Grid>
                        
    
        
    )

}