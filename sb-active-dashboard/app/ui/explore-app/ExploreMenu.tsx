import React, {useRef, useState} from "react";

import { List, Typography, Box } from "@mui/material";

import MenuItem from "../dashboard/Menu/MenuItem";
import MenuPanel from "../dashboard/Menu/MenuPanel";
import LayerSearch from "./LayerSearch";
import FilterTabs from "./FilterTabs";


export default function ExploreMenu(props: any) {
    const [safetyChecks, setSafetyChecks] = useState({
            "Biking Incidents": false,
            "Walking Incidents": false
        })

    const [volumeChecks, setVolumeChecks] = useState({
            "Biking Volumes": false,
            "Modeled Biking Volumes": false,
            "Walking Volumes": false,
            "Modeled Walking Volumes": false
        })
  
    const [demographicChecks, setDemographicChecks] = useState({
            "Income": false,
            "Race": false,
            "Education": false
        })
  
    return (

      <MenuPanel>    

          <Box p={2}>
            {/* <Typography variant="h5" my={1} sx={{fontWeight: 'bold'}}>
              Welcome!
            </Typography> */}
            <Typography mb={2} variant="h6" sx={{fontWeight: 'bold'}}>
              Explore
            </Typography>
            <Typography mb={2} variant="body2">
              Use this page to explore and access data, or check out our curated dashboards about volumes, safety, infrastructure, and equity.
            </Typography>

            <Typography mb={2} variant="body2">
              <strong>Step 1:</strong> Add datasets to the map.
            </Typography>
            <LayerSearch 
              safetyChecks={safetyChecks} 
              setSafetyChecks={setSafetyChecks} 
              volumeChecks={volumeChecks} 
              setVolumeChecks={setVolumeChecks} 
              demographicChecks={demographicChecks}
              setDemographicChecks={setDemographicChecks} 
              />
            <Typography my={2} variant="body2">
              <strong>Step 2:</strong> Apply filters.
            </Typography>
            <FilterTabs safetyChecks={safetyChecks} volumeChecks={volumeChecks} />

          </Box> 

        
      </MenuPanel>


      
      
    
  );
}

 