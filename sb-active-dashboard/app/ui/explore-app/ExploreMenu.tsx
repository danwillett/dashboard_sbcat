import React, {useRef, useState} from "react";

import { List, Typography, Box } from "@mui/material";

import MenuItem from "../dashboard/Menu/MenuItem";
import MenuPanel from "../dashboard/Menu/MenuPanel";
import LayerSearch from "./LayerSearch";


export default function ExploreMenu(props: any) {

    const { setShowLegend, showLegend, setShowLayerList, showLayerList, setShowFilter, showFilter, setShowPrint, showPrint } = props
  
    return (

      <MenuPanel>
        {(drawerOpen) => (
        //   <List>
        //   <MenuItem open={drawerOpen} showWidget={showLayerList} setShowWidget={setShowLayerList} iconName="layers" label="Layers" />
        //   <MenuItem open={drawerOpen} showWidget={showFilter} setShowWidget={setShowFilter} iconName="filter" label="Filters" />
        //   <MenuItem open={drawerOpen} showWidget={showLegend} setShowWidget={setShowLegend} iconName="legend" label="Legend" />
        //   <MenuItem open={drawerOpen} showWidget={showPrint} setShowWidget={setShowPrint} iconName="print" label="Print" />
        // </List>
          <Box p={2}>
            {/* <Typography variant="h5" my={1} sx={{fontWeight: 'bold'}}>
              Welcome!
            </Typography> */}
            <Typography mb={2} variant="body2">
              Welcome to the SB County Active Transportation Dashboard.
            </Typography>
            <Typography mb={2} variant="body2">
              This Dashboard provides data driven insights into biking and walking activity across Santa Barbara County.
            </Typography>
            <Typography mb={2} variant="body2">
              Use this page to explore and access data, or check out our curated dashboards about volumes, safety, infrastructure, and equity.
            </Typography>
            <Typography mb={2} variant="body2">
              This Dashboard was created and managed by UC Santa Barbara with funding provided by the State of California REAP 2.0 program.
            </Typography>

            <LayerSearch />
            
          </Box>

          
        )}
        
        
      </MenuPanel>


      
      
    
  );
}

 