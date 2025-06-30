import React, { useRef, useState } from "react";

// import global state variables
import { useSafetyMapContext } from "../../lib/context/SafetyMapContext";
import ToggleButton from "../safety-app/ToggleButton";
import { List, Typography, Box, IconButton, Button } from "@mui/material";
import { CalciteIcon } from "@esri/calcite-components-react";
import { styled } from "@mui/material/styles";
import { Grid } from "@mui/material";

import MenuItem from "../dashboard/Menu/MenuItem";
import MenuPanel from "../dashboard/Menu/MenuPanel";

import MainMenu from "./MainMenu";
import StatsMenu from "./StatsMenu";
import SafetyFilters from "./SafetyFilters";
// import LayerSearch from "./LayerSearch";
// import FilterTabs from "./FilterTabs";
// import StatsView from "./StatsView";

export default function SafetyMenu(props: any) {
  const { drawerOpen, handleDrawer, menuWidth } = props;

  const [statsOpen, setStatsOpen] = useState(false);

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
        {statsOpen ? <StatsMenu setStatsOpen={setStatsOpen} /> : <MainMenu setStatsOpen={setStatsOpen} />}
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
