'use client';
import React, { useEffect, useState } from "react"

// map context and types
import { useMapContext } from "@/app/lib/context/MapContext";
import { SafetyChecks, VolumeChecks, DemographicChecks } from "@/app/lib/explore-app/types"

// arcgis js
import LayerList from "@arcgis/core/widgets/LayerList";

// mui accordion components
import Accordion from '@mui/material/Accordion';
import AccordionActions from '@mui/material/AccordionActions';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';

// mui checkbox components
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Box from "@mui/material/Box";

interface LayerSearchProps {
    safetyChecks: SafetyChecks;
    setSafetyChecks: React.Dispatch<React.SetStateAction<SafetyChecks>>;
    volumeChecks: VolumeChecks;
    setVolumeChecks: React.Dispatch<React.SetStateAction<VolumeChecks>>;
    demographicChecks: DemographicChecks;
    setDemographicChecks: React.Dispatch<React.SetStateAction<DemographicChecks>>;
}


export default function LayerSearch(props: LayerSearchProps) {

    const { mapRef, incidentGroupLayer, censusGroupLayer, countGroupLayer, AADTHexagonLayer, layerList } = useMapContext()
    const { safetyChecks, setSafetyChecks, countSiteChecks, setCountSiteChecks, volumeChecks, setVolumeChecks, demographicChecks, setDemographicChecks } = useMapContext()


    const handleSafetyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation()
        setSafetyChecks({
            ...safetyChecks,
            [event.target.name]: event.target.checked,
          });       
    }


    useEffect(() => {

        if (!mapRef || !incidentGroupLayer) return;

        const safetyGroup = mapRef.allLayers.find((layer) => layer.title === "Safety")

        // add group layer to the map if this is the first load
        if (!safetyGroup) {
            mapRef.add(incidentGroupLayer)
        
        }

        // set visibility based on safetyChecks
        incidentGroupLayer.allLayers.forEach((sublayer) => {
            const title = sublayer.title;

            if (title && title in safetyChecks) {
                const visible = safetyChecks[title as keyof typeof safetyChecks];
                sublayer.visible = visible;
                sublayer.listMode = visible ? "hide" : "show";
            }
            
        })

        const allFalse = Object.values(safetyChecks).every(value => value === false)
        if (allFalse && incidentGroupLayer) {
            mapRef?.remove(incidentGroupLayer)
        }

    }, [safetyChecks])

    const handleCountSiteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation()
        setCountSiteChecks({
            ...countSiteChecks,
            [event.target.name]: event.target.checked,
          });
    }

    useEffect(() => {
        if (!mapRef || !countGroupLayer ) return;

        const countSiteGroup = mapRef.allLayers.find((layer) => layer.title === "Count Sites")
        if (!countSiteGroup) {
            // load in hexagon layers first
            mapRef.add(countGroupLayer)            
        } 
        // countSites
        countGroupLayer.allLayers.forEach((sublayer) => {
            const title = sublayer.title
            if (title && title in countSiteChecks) {
                const visible = countSiteChecks[title as keyof typeof countSiteChecks]
                sublayer.visible = visible;
                sublayer.listMode = visible ? "hide" : "show";
            }
        })

        
        const allFalse = Object.values(countSiteChecks).every(value => value === false)
        if (allFalse) {
            mapRef?.remove(countGroupLayer)
        }

    }, [countSiteChecks])

    const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation()
        setVolumeChecks({
            ...volumeChecks,
            [event.target.name]: event.target.checked,
          });
    }

    useEffect(() => {
        if (!mapRef || !AADTHexagonLayer ) return;
        console.log(AADTHexagonLayer)
        const volumeGroup = mapRef.allLayers.find((layer) => layer.title === "Modeled Volumes")
        if (!volumeGroup) {
            // load in hexagon layers first
            mapRef.add(AADTHexagonLayer)           
        } else {
            // make sure hexagons stay above census group layer
            mapRef.reorder(AADTHexagonLayer, 1)
        }

        // countSites
        
        AADTHexagonLayer.allLayers.forEach((sublayer) => {
            const title = sublayer.title
            console.log(title)
            if (title && title in volumeChecks) {
                const visible = volumeChecks[title as keyof typeof volumeChecks]
                sublayer.visible = visible;
                sublayer.listMode = visible ? "hide" : "show";
            }
        })
        const allFalse = Object.values(volumeChecks).every(value => value === false)
        if (allFalse) {
            mapRef?.remove(AADTHexagonLayer)
        }

    }, [volumeChecks])

    const handleDemographicChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation()
        setDemographicChecks({
            ...demographicChecks,
            [event.target.name]: event.target.checked,
          });
    }

    useEffect(() => {
        if (!mapRef || !censusGroupLayer) return;

        const censusGroup = mapRef.allLayers.find((layer) => layer.title === "Demographics")
        if (!censusGroup) {
            mapRef.add(censusGroupLayer)
        } else {
            // ensure that census layer is always at the bottom, if it isn't already
            mapRef.reorder(censusGroupLayer, 0)
        }

        censusGroupLayer.allLayers.forEach((sublayer) => {
            const title = sublayer.title
            if (title && title in demographicChecks) {
                const visible = demographicChecks[title as keyof typeof demographicChecks]
                sublayer.visible = visible;
                sublayer.listMode = visible ? "hide" : "show";
            }
        })
    
        const allFalse = Object.values(demographicChecks).every(value => value === false)
        if (allFalse && censusGroupLayer) {
            mapRef?.remove(censusGroupLayer)
        }
    }, [demographicChecks])

    // change map order of all layers once loaded in
    

    return (
        <div>
            {incidentGroupLayer && (
                <Accordion>
                    <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="safety-content"
                    id="safety-header"
                    >
                        <Typography component="span">Safety</Typography>
                    </AccordionSummary>
                    
                    <AccordionDetails>
                        <FormGroup id={"incident-layers"}>
                            <FormControlLabel control={<Switch checked={safetyChecks['Biking Incidents']} onChange={handleSafetyChange} name="Biking Incidents" />} label="Biking Incidents" />
                            <FormControlLabel control={<Switch checked={safetyChecks['Walking Incidents']} onChange={handleSafetyChange} name="Walking Incidents" />} label="Walking Incidents" />
                        </FormGroup>
                    </AccordionDetails>
                </Accordion>
            )}
            {countGroupLayer && (
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="volumes-content"
                        id="volumes-header"
                    >
                        <Typography component="span">Volumes</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <FormGroup id={"volume-layers"}>
                            <Typography variant="subtitle2" sx={{  mb: 0.5 }}>
                                Count Sites
                            </Typography>
                            <Box sx={{ mx:1, display: 'flex', flexDirection: 'column'}}>
                                <FormControlLabel control={<Switch checked={countSiteChecks["Biking Sites"]} onChange={handleCountSiteChange} name="Biking Sites" />} label="Biking Sites" />                           
                                <FormControlLabel control={<Switch checked={countSiteChecks["Walking Sites"]} onChange={handleCountSiteChange} name="Walking Sites" />} label="Walking Sites" />                               
                                <FormControlLabel control={<Switch checked={countSiteChecks["All Sites"]} onChange={handleCountSiteChange} name="All Sites" />} label="All Sites" />
                            </Box>
                            
                            <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
                                Modeled Volumes
                            </Typography>
                            <Box sx={{ mx:1, display: 'flex', flexDirection: 'column'}}>
                                <FormControlLabel control={<Switch checked={volumeChecks["Modeled Biking Volumes"]} onChange={handleVolumeChange} name="Modeled Biking Volumes" />} label="Biking Volumes" />
                            <FormControlLabel control={<Switch checked={volumeChecks["Modeled Walking Volumes"]} onChange={handleVolumeChange} name="Modeled Walking Volumes" />} label="Walking Volumes" />

                            </Box>                            

                        </FormGroup>
                    </AccordionDetails>
                </Accordion>
            )}
            
            {censusGroupLayer && (
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="demographics-content"
                        id="demographics-header"
                    >
                        <Typography component="span">Demographics</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <FormGroup id={"demographic-layers"}>
                            <FormControlLabel control={<Switch checked={demographicChecks["Income"]} onChange={handleDemographicChange} name="Income" />} label="Income" />
                            <FormControlLabel control={<Switch checked={demographicChecks["Race"]} onChange={handleDemographicChange} name="Race" />} label="Race" />
                            <FormControlLabel control={<Switch checked={demographicChecks["Education"]} onChange={handleDemographicChange} name="Education" />} label="Education" />
                        </FormGroup>
                    </AccordionDetails>
                    <AccordionActions>
                    </AccordionActions>
                </Accordion>
            )}
            
        </div>
    )

}