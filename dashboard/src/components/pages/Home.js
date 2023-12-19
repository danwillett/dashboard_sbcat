import React from "react";

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Map from "../Map";
import VolumeSlider from '../apps/VolumeSlider'

export default function Home() {
    return (

        <Container>
            <Row>
                <VolumeSlider />
            </Row>

        </Container>
       

    )
}