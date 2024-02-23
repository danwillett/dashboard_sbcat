import React, { useEffect, useRef, useState, useContext } from "react";

import Query from '@arcgis/core/rest/support/Query.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import { MapContext } from "../../MapContext";

import { Box, Grid, Checkbox, Typography, FormGroup, FormControl, FormControlLabel, Select, InputLabel, MenuItem, Button, OutlinedInput, Chip} from "@mui/material";

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

    const {map, setMap, view, setView, incidentData, setIncidentData} = useContext(MapContext)
    
    const setFilters = inputs.setFilters
    const [mode, setMode] = useState("both")
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
        } else {
            setBikes(true)
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

    const handleApplyOptions = async () => {
        console.log("hey!")
        const mode = bikes? 1 : 0
        const bikeFilt = bikes? 1 : 0
        const pedFilt = peds?1 : 0

        console.log(mode)
        const days = weekday ? "'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'" : weekend ? "'Saturday', 'Sunday'" : "'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'"
        // const dayFilter = `${mode}_volumes_day IN (${days})`
        const dayFilter = ``
        let yearFilterGood
        let yearFilter
        if (yearChoices.length > 0) {
          const yearSqlPieces = yearChoices.map((year)=> {
            return `date >= timestamp '${year}-01-01 00:00:00' And date <= timestamp '${year}-12-31 12:59:59'` //Or bike_volumes_date >= timestamp '2020-01-01 00:00:00' And bike_volumes_date <= timestamp '2020-12-31 12:59:59'
          })
            yearFilter = yearSqlPieces.join(' Or ')
            yearFilterGood = true
          
        } else {
            yearFilterGood = false
        }

        // const filters = yearFilterGood ? `${dayFilter} And ${yearFilter}` : dayFilter
        const modeFilter = `bicyclist = ${bikeFilt} And pedestrian = ${pedFilt}`
        const filters = yearFilterGood ? `${modeFilter} And ${yearFilter}`: modeFilter
        setFilters(filters)
        
        // const riskQuery = new Query()
        // riskQuery.where = `bicyclist = ${mode}`

        // const layerView = await view.whenLayerView(incidentData)
        // await reactiveUtils.whenOnce(() => !layerView.updating);
        // console.log(layerView)
        // layerView.queryFeatures().then(function(results){
        //     console.log(results); 
        // })
        // layerView.filter = {
        //     where: filters
        // }
        // layerView.effect = {
        //     filter: layerView.filter
        // }
        // reactiveUtils.when(
        //         () => !layerView.updating,
        //         (val) => {
        //           layerView.queryFeatures().then(function(results){
        //             console.log(results);  // prints all the client-side features to the console
        //           });
        //         }
        //       );

       
    };

    const handleYearChange = (event) => {
        const {target: {value}} = event;
        setYearChoices(value)
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

    // useEffect(() => {
    //     if (view !== null){
    //         const layerView = view.whenLayerView(incidentData)

    //     }
    // })
  

    return (
        <Grid container style= {{ width: '100%', padding: '5%'}} direction={"column"} justifyContent="center" alignItems="center">

            
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
                            <MenuItem value={"both"} className="esri-widget">Biking & Walking</MenuItem>
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
    )

}