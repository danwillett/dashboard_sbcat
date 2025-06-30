import React, { useEffect, useRef, useState, useCallback } from "react";

// import global state variables
import { useSafetyMapContext } from "../../lib/context/SafetyMapContext";
import { Typography, Box, Button } from "@mui/material";

import SafetyFilters from "./SafetyFilters";
import "@arcgis/charts-components/components/arcgis-chart";
import "@arcgis/charts-components/components/arcgis-charts-action-bar";

import { createModel } from "@arcgis/charts-components/model";

interface StatsMenuProps {
  setStatsOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export default function StatsMenu(props: StatsMenuProps) {
  
  const { setStatsOpen } = props;
  const { incidentsLayer } = useSafetyMapContext()

  const [mode, setMode] = useState("bicyclist");
  const changeMode = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMode(event.target.value);
  };

  const [region, setRegion] = useState("Santa Barbara");
  const changeRegion = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRegion(event.target.value);
  };

    //  create a filter for incidentslayer
//   useEffect(() => {
//     if (!incidentsLayer) return;
//     const where = `type=${mode}`


//   }, [mode, region, incidentsLayer])


  const filterInputs = {
    mode,
    changeMode,
    region,
    changeRegion,
  };
  return (
    <Box p={2}>
      <Button onClick={() => setStatsOpen(false)}>Back</Button>

      <Typography component="span">Safety Filters</Typography>

      {/* filters */}
      <SafetyFilters {...filterInputs} />
        
    </Box>
  );
}
