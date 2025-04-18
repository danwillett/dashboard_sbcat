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


interface LayerSearchProps {
    safetyChecks: SafetyChecks;
    setSafetyChecks: React.Dispatch<React.SetStateAction<SafetyChecks>>;
    volumeChecks: VolumeChecks;
    setVolumeChecks: React.Dispatch<React.SetStateAction<VolumeChecks>>;
    demographicChecks: DemographicChecks;
    setDemographicChecks: React.Dispatch<React.SetStateAction<DemographicChecks>>;
}

export default function LayerSearch(props: LayerSearchProps) {

    const { mapRef, incidentGroupLayer, censusGroupLayer, countGroupLayer, layerList } = useMapContext()
    const { safetyChecks, setSafetyChecks, volumeChecks, setVolumeChecks, demographicChecks, setDemographicChecks } = props

    const handleSafetyChange = (event: React.ChangeEvent<HTMLInputElement>) => {

        setSafetyChecks({
            ...safetyChecks,
            [event.target.name]: event.target.checked,
          });       

        if (incidentGroupLayer && mapRef) {

            const safetyGroup = mapRef.allLayers.find((layer) => layer.title === "Safety")

            if (!safetyGroup) {
                mapRef.add(incidentGroupLayer)
                incidentGroupLayer.allLayers.forEach((sublayer) => {
                    sublayer.visible = false
                    sublayer.listMode = "hide"
                })
            }

            const layer = incidentGroupLayer.allLayers.find((sublayer) => sublayer.title == event.target.name)
            
            if (layer) {
                layer.visible = event.target.checked ? true : false
                layer.listMode = event.target.checked ? "show" : "hide"
            }
        }
    }

    useEffect(() => {
        const allFalse = Object.values(safetyChecks).every(value => value === false)
        if (allFalse && incidentGroupLayer) {
            mapRef?.remove(incidentGroupLayer)
        }
        
    }, [safetyChecks])

    

    const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setVolumeChecks({
            ...volumeChecks,
            [event.target.name]: event.target.checked,
          });
        
        if (countGroupLayer && mapRef) {
            const volumeGroup = mapRef.allLayers.find((layer) => layer.title === "Volumes")

            if (!volumeGroup) {
                mapRef.add(countGroupLayer)
                countGroupLayer.allLayers.forEach((sublayer) => {
                    sublayer.visible = false
                    sublayer.listMode = "hide"
                })
            }

            const layer = countGroupLayer.allLayers.find((sublayer) => sublayer.title === event.target.name)

            if (layer) {
                layer.visible = event.target.checked ? true : false
                layer.listMode = event.target.checked ? "show" : "hide"
            }
        }
    }

    useEffect(() => {
        const allFalse = Object.values(volumeChecks).every(value => value === false)
        if (allFalse && countGroupLayer) {
            mapRef?.remove(countGroupLayer)
        }
    }, [volumeChecks])

    

    const handleDemographicChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDemographicChecks({
            ...demographicChecks,
            [event.target.name]: event.target.checked,
          });

        if (censusGroupLayer && mapRef) {
        const censusGroup = mapRef.allLayers.find((layer) => layer.title === "Demographics")

        if (!censusGroup) {
            mapRef.add(censusGroupLayer)
            censusGroupLayer.allLayers.forEach((sublayer) => {
                sublayer.visible = false
                sublayer.listMode = "hide"
            })
        }

        const layer = censusGroupLayer.allLayers.find((sublayer) => sublayer.title === event.target.name)

        if (layer) {
            layer.visible = event.target.checked ? true : false
            layer.listMode = event.target.checked ? "show" : "hide"
        }
    }
    }

    useEffect(() => {
        const allFalse = Object.values(demographicChecks).every(value => value === false)
        if (allFalse && censusGroupLayer) {
            mapRef?.remove(censusGroupLayer)
        }
    }, [demographicChecks])

    useEffect(() => {

        if (layerList) {
            const allChecks = [safetyChecks, volumeChecks, demographicChecks]
            const allFalse = allChecks.every(dict => Object.values(dict).every(value => value === false))
    
            if (allFalse) {
                layerList.visible = false
            } else {
                layerList.visible = true
            }
        }
       
    }, [safetyChecks, volumeChecks, demographicChecks])

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
                        <FormGroup>
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
                        <FormGroup>
                            <FormControlLabel control={<Switch checked={volumeChecks["Biking Volumes"]} onChange={handleVolumeChange} name="Biking Volumes" />} label="Bicycle Count Locations" />
                            {/* <FormControlLabel control={<Switch checked={volumeChecks["Modeled Biking Volumes"]} onChange={handleVolumeChange} name="Modeled Biking Volumes" />} label="Modeled Bicycle Volumes" /> */}
                            <FormControlLabel control={<Switch checked={volumeChecks["Walking Volumes"]} onChange={handleVolumeChange} name="Walking Volumes" />} label="Pedestrian Count Locations" />
                            {/* <FormControlLabel control={<Switch checked={volumeChecks["Modeled Walking Volumes"]} onChange={handleVolumeChange} name="Modeled Walking Volumes" />} label="Modeled Pedestrian Volumes" /> */}
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
                        <FormGroup>
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