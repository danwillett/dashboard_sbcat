import React from "react";

import {Container, Grid} from '@mui/material';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import VolumeSliderMap from '../apps/VolumeSliderMap'

export default function Home() {
    return (


        <Grid container xs={12}>
                <VolumeSliderMap />
        </Grid>


       

    )
}