import React, {useRef, useState} from "react";

import { List, Typography, Box } from "@mui/material";

import MenuItem from "../dashboard/Menu/MenuItem";
import MenuPanel from "../dashboard/Menu/MenuPanel";
import LayerSearch from "./LayerSearch";
import FilterTabs from "./FilterTabs";

import Grid from "@mui/material/Grid2"


export default function ExploreDataDisplay(props: any) {

    return (
        <MenuPanel>
            {/* Layer List Panel */}
            <Grid justifyContent="center" className="esri-widget">
                <Grid size={12} my={2}>
                        <Typography align='center' variant="h6" sx={{fontWeight: 'bold'}}>Layer Display</Typography>
                        
                    </Grid>
                <div id="layer-list-container"></div>
            </Grid>

            {/* Legend */}
            <Grid justifyContent="center" className="esri-widget">
                <Grid size={12} my={2}>
                    <Typography align='center' variant="h6" sx={{fontWeight: 'bold'}}>Legend</Typography>
                </Grid>
                <div id="legend-container"></div>
            </Grid> 
        </MenuPanel>
    )
 }