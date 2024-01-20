import React from "react";

import {Container, Grid} from '@mui/material';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import VolumeSliderMapCore from '../apps/volumes/VolumeSliderMapCore'

export default function Home() {
    return (


        <Grid container xs={12}>
                <VolumeSliderMapCore />
        </Grid>


       

    )
}