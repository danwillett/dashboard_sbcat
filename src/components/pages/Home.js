import React from "react";

import {Container, Grid} from '@mui/material';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import VolumeSliderMap from '../apps/volumes/VolumeSliderMap'
import RiskMap from "../apps/risk/RiskMap";
import Header from "../Header";
import DashboardMap from "../Map";
import { MapContextProvider } from "../MapContext";


export default function Home() {
    console.log("NNOONWOAND")
    return (


        <MapContextProvider>
            <Grid container width="100vw" height="100vh" justifyContent="center" >
                <Grid container direction="column" justifyContent="center" >
                    <Header />
                    {/* <RiskMap /> */}
                    {/* <VolumeSliderMap /> */}
                    <DashboardMap />
                </Grid>
            </Grid>
        </MapContextProvider>
        
       

    )
}