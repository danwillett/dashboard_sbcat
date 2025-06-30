import React, { useRef, useState } from "react";

// import global state variables
import { useSafetyMapContext } from "../../lib/context/SafetyMapContext";
import ToggleButton from "../safety-app/ToggleButton";
import { List, Typography, Box, IconButton, Button, FormControl, Select, MenuItem } from "@mui/material";
import { CalciteIcon } from "@esri/calcite-components-react";
import { styled } from "@mui/material/styles";
import { Grid } from "@mui/material";

// accordion
import Accordion from "@mui/material/Accordion";
import AccordionActions from "@mui/material/AccordionActions";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import SafetyFilters from "./SafetyFilters";
// import LayerSearch from "./LayerSearch";
// import FilterTabs from "./FilterTabs";
// import StatsView from "./StatsView";

interface MainMenuProps {
  setStatsOpen: (value: boolean | ((prev: boolean) => boolean)) => void

}

export default function MainMenu(props: MainMenuProps) {
  const { setStatsOpen } = props;
  const [mode, setMode] = useState<"bikes" | "pedestrians">("bikes");

  const handleModeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setMode(event.target.value as "bikes" | "pedestrians");
  };

  return (
    <Box p={2}>
    <Typography mb={2} variant="h5">Bicycle & Pedestrian Safety</Typography>
      <Typography mb={2} variant="body2">
        One of the biggest deterrents to biking and walking is feeling unsafe on
        the roads and a sidewalks. Understanding where, when, and how biking and
        walking safety incidents occur can help better inform efforts to improve
        safety outcomes in Santa Barbara County. We compile safety data from
        police- and self-reported incidents across the county (add link here).
        On this page you can view where our data indicates high risk areas. To
        dive deeper, you can launch our [tool name] to gain deeper insights into
        bike and pedestrian safety trends in your region.
      </Typography>

      <Accordion>
        {/* filters */}
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
        >
          <Typography component="span">Safety Filters</Typography>
        </AccordionSummary>
        
      </Accordion>
      

      <Button onClick={()=>setStatsOpen(true)}>Get more insights</Button>

      {/* panel for incidents */}
      {/* visualizization options heatmaps */}
      {/* visul */}

      {/* panel for  */}
    </Box>
  );
}
