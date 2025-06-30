"use client";
import React, { useEffect, useState } from "react";

// map context and types
import { useSafetyMapContext } from "../../lib/context/SafetyMapContext";
import IncidentYearChart from "./charts/IncidentYearChart";
// arcgis js

// mui accordion components
import Typography from "@mui/material/Typography";

import Button from "@mui/material/Button";

// mui form elements
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import MenuItem from "../dashboard/Menu/MenuItem";
import InputLabel from "@mui/material/InputLabel";

import Slider from "@mui/material/Slider";

import Switch from "@mui/material/Switch";
import Select from "@mui/material/Select";
import Box from "@mui/material/Box";

// mui radio components
import RadioGroup from "@mui/material/RadioGroup";
import Radio from "@mui/material/Radio";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";

interface SafetyFilterProps {
  mode: string;
  changeMode: (event: React.ChangeEvent<HTMLInputElement>) => void;
  region: string;
  changeRegion: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SafetyFilters(props: SafetyFilterProps) {
  const { mode, changeMode, region, changeRegion } = props;
  const { incidentsLayer, citiesLayer, viewRef } = useSafetyMapContext()
  const [ filters, setFilters ] = useState({ where: null, geometry: null })

  // create year slider labels
  const startYear = 2012;
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => startYear + i
  );
  const yearLabels = years.map((year) => {
    return {
      value: year,
      label: String(year)
    }
  })

  // handle change in years

  const [yearValue, setYearValue] = useState<number[]>([startYear, currentYear]);
  const [yearStart, setYearStart] = useState<string>(String(startYear));
  const [yearEnd, setYearEnd] = useState<string>(String(currentYear));

  const handleYearChange = (
      event: Event,
      value: number | number[],
      activeThumb: number
    ) => {
      if (Array.isArray(value)) {
        setYearValue(value);
        setYearStart(String(value[0]));
        setYearEnd(String(value[1]));
      } else {
        setYearValue([value, value]);
        setYearStart(String(value));
        setYearEnd(String(value));
      }
    };
    const handleYearStartChange = (event: SelectChangeEvent) => {
      const label = event.target.value;
  
      setYearStart(label);
  
      // if start time is less than end time, just change start, otherwise set
      // end time to be equal to the new start time
      if (Number(label) <= yearValue[1]) {
        setYearValue([Number(label), yearValue[1]]);
      } else {
        setYearValue([Number(label), Number(label)]);
        setYearEnd(label);
      }
    };
    const handleYearEndChange = (event: SelectChangeEvent) => {
      const label = event.target.value;
  
      setYearEnd(label);
      // if start time is less than end time, just change start, otherwise set
      // end time to be equal to the new start time
      if (Number(label) >= yearValue[0]) {
        setYearValue([yearValue[0], Number(label)]);
      } else {
        setYearValue([Number(label), Number(label)]);
        setYearStart(label);
      }
    };

    useEffect(() => {
      const makeFilters = async () => {
        const geomResults = await citiesLayer?.queryFeatures({where: `City='${region}'`, returnGeometry: true})
        const geom = geomResults?.features[0].geometry

        setFilters({
          where: `${mode}=1`,
          geometry: geom
        })
      }
      
      makeFilters()
      
    }, [mode, region, viewRef, incidentsLayer, citiesLayer])

  useEffect(() => {
    if (incidentsLayer == null) return;
    const applyFilters = async () => {
      const incidentsLayerView = await viewRef?.whenLayerView(incidentsLayer)
      if (incidentsLayerView){
        incidentsLayerView.filter = new FeatureFilter(filters)
      } 
    
    }
    applyFilters()
    }, [filters, incidentsLayer, viewRef])
  return (
    <div>
      {/* DATA SELECTION */}
      {/* transportation mode */}
      <FormControl>
        <FormLabel id="mode-radio-buttons">Transportation Mode</FormLabel>
        <RadioGroup
          row
          value={mode}
          onChange={changeMode}
          aria-labelledby="mode-radio-buttons"
          name="mode-radio-buttons-group"
        >
          <FormControlLabel value="bicyclist" control={<Radio />} label="Bike" />
          <FormControlLabel value="pedestrian" control={<Radio />} label="Walk" />
          <FormControlLabel value="ebike" control={<Radio />} label="Ebike" />
        </RadioGroup>
      </FormControl>
      {/* city/region */}
      <FormControl>
        <FormLabel id="region-radio-buttons">Jurisdiction</FormLabel>
        <RadioGroup
          row
          value={region}
          onChange={changeRegion}
          aria-labelledby="region-radio-buttons"
          name="region-radio-buttons-group"
        >
          {/* <FormControlLabel value="" control={<Radio />} label="SB County" /> */}
          {/* <FormControlLabel value="1=1" control={<Radio />} label="Unicorporated Land" /> */}
          <FormControlLabel value="Buelton" control={<Radio />} label="Buelton" />
          <FormControlLabel value="Carpinteria" control={<Radio />} label="Carpinteria" />
          <FormControlLabel value="Goleta" control={<Radio />} label="Goleta" />
          <FormControlLabel value="Guadalupe" control={<Radio />} label="Guadalupe" />
          <FormControlLabel value="Santa Barbara" control={<Radio />} label="Santa Barbara" />
          <FormControlLabel value="Santa Maria" control={<Radio />} label="Santa Maria" />
          <FormControlLabel value="Solvang" control={<Radio />} label="Solvang" />
        </RadioGroup>
      </FormControl>

      {/* year */}
      <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            flexWrap: "wrap",
            width: "100%",
            mb: 3,
          }}
        >
          <Typography
            variant="body1"
            align="left"
            my={2}
            sx={{ width: "100%" }}
          >
            Years
          </Typography>
          <FormControl>
            <InputLabel id="year-start-select-label">Start</InputLabel>
            <Select
              labelId="year-start-select-label"
              id="select-year-start"
              value={yearStart}
              label="First Year"
              onChange={handleYearStartChange}
            >
              {yearLabels.map((hour) => (
                <MenuItem key={hour.value} value={hour.value}>
                  {hour.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel id="year-end-select-label">End</InputLabel>
            <Select
              labelId="year-end-select-label"
              id="select-year-end"
              value={yearEnd}
              label="Last Year"
              onChange={handleYearEndChange}
            >
              {yearLabels.map((hour) => (
                <MenuItem key={hour.value} value={hour.value}>
                  {hour.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box mt={4} sx={{ width: "100%" }}>
            <Slider
              getAriaLabel={() => "Time of day"}
              value={yearValue}
              step={1}
              min={startYear}
              max={currentYear}
              // marks={yearMarks}
              onChange={handleYearChange}
              valueLabelDisplay="auto"
              // valueLabelFormat={yearValueText}
              // getAriaValueText={yearValueText}
              sx={{ width: "100%" }}
            />
          </Box>
        </Box>
      <IncidentYearChart />
      {/* severity */}
    </div>
  );
}
