import React, {useRef, useState} from "react";
import "@arcgis/map-components/dist/components/arcgis-legend";
import "@arcgis/map-components/dist/components/arcgis-layer-list";
import { CalciteIcon } from "@esri/calcite-components-react";

import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles'

import { Box, List, Typography, Divider, IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";

import MenuItem from "../dashboard/Menu/MenuItem";
import MenuPanel from "../dashboard/Menu/MenuPanel";


export default function ExploreMenu(props) {

    const { setShowLegend, showLegend, setShowLayerList, showLayerList, setShowFilter, showFilter } = props
  
    return (

      <MenuPanel>
        {(drawerOpen) => (
          <List>
          <MenuItem open={drawerOpen} showWidget={showLayerList} setShowWidget={setShowLayerList} iconName="layers" label="Layers" />
          <MenuItem open={drawerOpen} showWidget={showFilter} setShowWidget={setShowFilter} iconName="filter" label="Filters" />
          <MenuItem open={drawerOpen} showWidget={showLegend} setShowWidget={setShowLegend} iconName="legend" label="Legend" />
          
      </List>
        )}
        
        
      </MenuPanel>


      
      
    
  );
}

 