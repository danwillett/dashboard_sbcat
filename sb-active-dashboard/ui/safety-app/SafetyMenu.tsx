import React, { useRef, useState } from "react";

// import global state variables
import { useSafetyMapContext } from "../../lib/context/SafetyMapContext";
import ToggleButton from "../safety-app/ToggleButton";
import { List, Typography, Box, IconButton } from "@mui/material";
import { CalciteIcon } from "@esri/calcite-components-react";
import { styled } from "@mui/material/styles";
import { Grid } from "@mui/material";


import MenuItem from "../dashboard/Menu/MenuItem";
import MenuPanel from "../dashboard/Menu/MenuPanel";
import SafetyFilters from "./SafetyFilters";
// import LayerSearch from "./LayerSearch";
// import FilterTabs from "./FilterTabs";
// import StatsView from "./StatsView";

export default function SafetyMenu(props: any) {
  const { drawerOpen, handleDrawer, menuWidth } = props;

  const [ mode, setMode ] = useState("bike")
  const changeMode = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMode(event.target.value)
  }

  const [ region, setRegion ] = useState("All County")
  const changeRegion = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRegion(event.target.value)
  }

  const filterInputs = {
    mode, changeMode, region, changeRegion
  }
  return (
    <Box
      sx={{
        height: "100%",
        width: drawerOpen ? menuWidth : "1px",
        transition: "width 0.5s ease-in-out",
        zIndex: 3000,
        position: "absolute",
        top: 0,
        left: 0,
        // overflow: 'hidden',
        display: "flex",
        flexDirection: "column",
      }}
    >
      <MenuPanel drawerOpen={drawerOpen} drawerWidth={menuWidth}>
        <Box p={2}>
          <Typography mb={2} variant="body2">
            Evaluate bike and pedestrian safety across Santa Barbara County.
          </Typography>

          <SafetyFilters {...filterInputs} />
          
          <Typography my={2} variant="h6" sx={{ fontWeight: "bold" }}>
            {mode.toUpperCase()} Safety
          </Typography>



          {/* panel for incidents */}
            {/* visualizization options heatmaps */}
            {/* visul */}

          {/* panel for  */}

          
        </Box>
      </MenuPanel>

      <ToggleButton
        onClick={handleDrawer}
        open={drawerOpen}
        menuWidth={menuWidth}
      >
        <CalciteIcon icon={drawerOpen ? "chevron-left" : "chevron-right"} />
      </ToggleButton>
    </Box>
  );
}
