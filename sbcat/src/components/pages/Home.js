import React from "react";

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Map from "../Map";

export default function Home() {
    return (

        <Container>
            <Row>
                <Map />
            </Row>

        </Container>
       

    )
}