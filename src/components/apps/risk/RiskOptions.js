import React, { useEffect, useRef, useState, useContext } from "react";

import Query from '@arcgis/core/rest/support/Query.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import { FilterContext } from "../../FilterContext";
import CloseIcon from '@mui/icons-material/Close';
import { Box, Grid, Checkbox, Typography, FormGroup, FormControl, FormControlLabel, Select, InputLabel, MenuItem, IconButton, Button, OutlinedInput, Chip} from "@mui/material";

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

export default function RiskOptions(inputs) {

    const {safetyMode,
        setSafetyMode,
        safetyBikes,
        setSafetyBikes,
        safetyPeds,
        setSafetyPeds,
        safetyWeekend, 
        setSafetyWeekend,
        safetyWeekday, 
        setSafetyWeekday,
        safetyYearChoices,
        setSafetyYearChoices,
        collision,
        setCollision,
        nearCollision,
        setNearCollision,
        fall,
        setFall} = useContext(FilterContext)
    
    const {setFilters, setPanelView} = inputs
    
    const [years, setYears] = useState([])
    const handleSelectChange = (event) => {
        const currentMode = event.target.value
        setSafetyMode(currentMode)
        if (currentMode == "bikes") {
            setSafetyBikes(true)
            setSafetyPeds(false)
        } else if (currentMode == "peds") {
            setSafetyBikes(false)
            setSafetyPeds(true)
        } else {
            setSafetyBikes(true)
            setSafetyPeds(true)
        }
    }

    // const handleWeekend = () => {
    //     setSafetyWeekend(!safetyWeekend)
    // }
    // const handleWeekday = () => {
    //     setSafetyWeekday(!safetyWeekday)
    // }
    // const handleCheckboxChange = (day) => {
    //     // Update the selected options when a checkbox is changed
    //     if (day == "weekday") {
    //         setSafetyWeekday(!weekday)
    //     }
    //     if (day == "weekend") {
    //         setSafetyWeekend(!weekend)
    //     }
    // };

    const handleApplyOptions = async () => {
        console.log("hey!")
        const mode = safetyBikes? 1 : 0
        const bikeFilt = safetyBikes? 1 : 0
        const pedFilt = safetyPeds?1 : 0

        console.log(mode)
        // const days = weekday ? "'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'" : weekend ? "'Saturday', 'Sunday'" : "'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'"
        // // const dayFilter = `${mode}_volumes_day IN (${days})`
        // const dayFilter = ``
        let yearFilterGood
        let yearFilter
        if (safetyYearChoices.length > 0) {
          const yearSqlPieces = safetyYearChoices.map((year)=> {
            return `(date >= timestamp '${year}-01-01 00:00:00' And date <= timestamp '${year}-12-31 12:59:59')` //Or bike_volumes_date >= timestamp '2020-01-01 00:00:00' And bike_volumes_date <= timestamp '2020-12-31 12:59:59'
          })
            yearFilter = yearSqlPieces.join(' Or ')
            yearFilterGood = true
          
        } else {
            yearFilterGood = false
        }

        // const filters = yearFilterGood ? `${dayFilter} And ${yearFilter}` : dayFilter
        const modeFilter = `(bicyclist = ${bikeFilt} Or pedestrian = ${pedFilt})`

        // collision type filters
        let collisionFilter = []
        collision && collisionFilter.push("'Collision'");
        nearCollision && collisionFilter.push("'Near Collision'");
        fall && collisionFilter.push("'Fall'");
        let collisionFilterGood = false
        if (collisionFilter.length > 0) {
            collisionFilter = collisionFilter.join(', ')
            console.log(collisionFilter)
            collisionFilterGood = true
            collisionFilter = `(incident_t IN (${collisionFilter}))`
        }
        // incident_t IN ('Collision', 'Fall', 'Near Collision')
        let filters = yearFilterGood ? `${modeFilter} And (${yearFilter})`: modeFilter
        filters = collisionFilterGood ? `${filters} And ${collisionFilter}`: filters
        console.log(filters)
        setFilters(filters)
     
    };

    const handleYearChange = (event) => {
        const {target: {value}} = event;
        setSafetyYearChoices(value)
    }

    const loadYears = () => {
        // return available years in walking_volumes (which may have more years than biking_volumes) to populate years filter option
        const dataUrl = "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/SB_Incidents/FeatureServer" //"https://donkey.grit.ucsb.edu/server/rest/services/Hosted/AllIncidentsPoints/FeatureServer"
        const dateLayer = new FeatureLayer({
          url: dataUrl
        })
        const dateQuery = new Query()
        dateQuery.where = ""
        dateQuery.outFields = ["date"];
        dateQuery.returnGeometry = false
        dateLayer.queryFeatures(dateQuery).then((results) => {
          let dateColumn = results.features
          const yearArray = dateColumn.map((entry) => {
            let timestamp = entry.attributes.date
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
        <Grid container style= {{ padding: '5%'}} direction={"column"} justifyContent="center" alignItems="left">
           
            <Grid item>
                <Grid container direction="column">
                    <Typography id="description" variant="h8" style={{ textAlign: 'left' }}>
                        Select a travelling mode:
                    </Typography>
                    
                    <FormControl variant='standard'>
                        <Select
                            labelId="slider-type-label"
                            id="select-slider-type"
                            value={safetyMode}
                            label="Counts By"
                            onChange={(event) => {

                                handleSelectChange(event)
                            }
                            }
                        >   
                            <MenuItem value={"both"} className="esri-widget">Biking & Walking</MenuItem>
                            <MenuItem value={"bikes"} className="esri-widget">Biking</MenuItem>
                            <MenuItem value={"peds"} className="esri-widget">Walking</MenuItem>

                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

                <Grid container direction ="column" style={{width: "100%", marginBottom: "20px", marginTop: "20px"}}>
                    <Typography id="description" variant="h8" style={{ textAlign: 'left', marginBottom: '10px'  }}>
                    Select years:
                    </Typography>
                    <FormControl>
                        <InputLabel id="select-years-label">Years</InputLabel>
                        <Select
                            labelId="select-years-label"
                            id="select-years"
                            
                            multiple
                            value={safetyYearChoices}
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
                <Grid container direction ="column" style={{width: "100%"}}>
                    <Typography id="description" variant="h8" style={{ textAlign: 'left'}}>
                    Incident Type:
                    </Typography>
                    <FormControl>
                        <Grid container direction="row">
                            <Grid container direction = "column">
                                <FormControlLabel
                                    label="Collision"
                                    control={
                                        <Checkbox
                                        checked={collision}
                                        onChange={() => setCollision(!collision)}
                                        />
                                    }
                                />
                                <FormControlLabel
                                    label="Near Collision"
                                    control={
                                        <Checkbox
                                        checked={nearCollision}
                                        onChange={() => setNearCollision(!nearCollision)}
                                        />
                                    }
                                />
                                <FormControlLabel
                                    label="Fall"
                                    control={
                                        <Checkbox
                                        checked={fall}
                                        onChange={() => setFall(!fall)}
                                        />
                                    }
                                />
                                
                            </Grid>
                        
                        </Grid>
                    </FormControl>
                </Grid>

            
            <Button variant="contained" onClick={handleApplyOptions} style={{marginTop: '20px'}}>Load Incidents</Button>


            


        </Grid >
    )

}