import React, { useEffect, useRef, useState, useContext } from "react";

import Query from '@arcgis/core/rest/support/Query.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import CloseIcon from '@mui/icons-material/Close';
import { Box, Grid, Checkbox, Typography, IconButton, FormControl, FormControlLabel, Select, InputLabel, MenuItem, Button, OutlinedInput, Chip, Divider } from "@mui/material";
import { FilterContext } from "../../FilterContext";


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

    const {
        volumeMode,
        setVolumeMode,
        volumeBikes,
        setVolumeBikes,
        volumePeds,
        setVolumePeds,
        volumeWeekday,
        setVolumeWeekday,
        volumeWeekend,
        setVolumeWeekend,
        volumeYearChoices,
        setVolumeYearChoices,
      } = useContext(FilterContext);

    const [years, setYears] = useState([])
    const { onApplyOptions} = inputs

    const handleSelectChange = (event) => {
        const currentMode = event.target.value
        setVolumeMode(currentMode)
        if (currentMode == "nikes") {
            setVolumeBikes(true)
            setVolumePeds(false)
        } else if (currentMode == "peds") {
            setVolumeBikes(false)
            setVolumePeds(true)
        }
    }

    const handleWeekend = () => {
        setVolumeWeekend(!volumeWeekend)
    }
    const handleWeekday = () => {
        setVolumeWeekday(!volumeWeekday)
    }
    // const handleCheckboxChange = (day) => {
    //     // Update the selected options when a checkbox is changed
    //     if (day == "volumeWeekday") {
    //         setVolumeWeekday(!volumeWeekday)
    //     }
    //     if (day == "setVolumeWeekend") {
    //         setVolumeWeekend(!setVolumeWeekend)
    //     }
    // };

    const handleApplyOptions = (event) => {
        event.stopPropagation()
        event.preventDefault()
        const name = volumeBikes ? "bike" : "ped"
        const days = volumeWeekday ? "'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'" : setVolumeWeekend ? "'Saturday', 'Sunday'" : "'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'"
        const dayFilter = `${name}_volumes_day IN (${days})`

        let yearFilterGood
        let yearFilter
        if (volumeYearChoices.length > 0) {
            const yearSqlPieces = volumeYearChoices.map((year) => {
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
            bikes: volumeBikes,
            peds: volumePeds,
            filter: filters
        }
        // Call the parent component's callback with the selected options
        onApplyOptions(selectedOptions);
        console.log(volumeMode)

    };

    const handleYearChange = (event) => {
        const { target: { value } } = event;
        setVolumeYearChoices(value)
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

    useEffect(() => {
        loadYears()
    }, [])


    return (

                <Grid container direction={"column"} style={{ padding: '5%' }} justifyContent="center" alignItems={"left"}>
                    <Grid item>
                        <Grid container direction="column">
                            <Typography id="description" variant="h8" style={{ textAlign: 'left' }}>
                                Select a travelling mode:
                            </Typography>

                            <FormControl variant='standard'>
                                <Select
                                    labelId="slider-type-label"
                                    id="select-slider-type"
                                    value={volumeMode}
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

                    <Grid container direction="column" style={{ width: "100%", marginBottom: "20px", marginTop: "20px" }}>
                        <Typography id="description" variant="h8" style={{ textAlign: 'left', marginBottom: '10px' }}>
                            Select years:
                        </Typography>
                        <FormControl>
                            <InputLabel id="select-years-label">Years</InputLabel>
                            <Select
                                labelId="select-years-label"
                                id="select-years"

                                multiple
                                value={volumeYearChoices}
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
                    <Grid container direction="column" style={{ width: "100%" }}>
                        <Typography id="description" variant="h8" style={{ textAlign: 'left' }}>
                            Days to include:
                        </Typography>
                        <FormControl>
                            <Grid container direction="row">
                                <Grid container direction="column">
                                    <FormControlLabel
                                        label="Weekends"
                                        control={
                                            <Checkbox
                                                
                                                checked={volumeWeekend}
                                                onChange={handleWeekend}
                                            />
                                        }
                                    />
                                    <FormControlLabel
                                        label="Weekdays"
                                        control={
                                            <Checkbox
                                                checked={volumeWeekday}
                                                onChange={handleWeekday}
                                            />
                                        }
                                    />

                                </Grid>

                            </Grid>
                        </FormControl>
                    </Grid>

                    <Button variant="contained" onClick={handleApplyOptions} style={{marginTop: '20px'}}>Load Counts</Button>

                </Grid >


    )

}