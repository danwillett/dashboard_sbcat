import React, { useEffect, useRef, useState } from "react";
import { loadModules } from "esri-loader";


// import Modal from 'react-bootstrap/Modal'
// import Button from 'react-bootstrap/Button';
// import Form from 'react-bootstrap/Form';
import { Box, Grid, Checkbox, Typography, FormGroup, FormControl, FormControlLabel, Select, InputLabel, MenuItem, Button } from "@mui/material";

export default function VolumeSliderOptions(inputs) {

    const onApplyOptions = inputs.onApplyOptions
    const [mode, setMode] = useState("bikes")
    const [bikes, setBikes] = useState(true)
    const [peds, setPeds] = useState(false)
    const [weekday, setWeekday] = useState(true)
    const [weekend, setWeekend] = useState(true)


    const handleSelectChange = (event) => {
        const currentMode = event.target.value
        setMode(currentMode)
        if (currentMode == "bikes") {
            setBikes(true)
            setPeds(false)
        } else if (currentMode == "peds") {
            setBikes(false)
            setPeds(true)
        }
    }

    const handleWeekend = () => {
        setWeekend(!weekend)
    }
    const handleWeekday = () => {
        setWeekday(!weekday)
    }
    // const handleCheckboxChange = (day) => {
    //     // Update the selected options when a checkbox is changed
    //     if (day == "weekday") {
    //         setWeekday(!weekday)
    //     }
    //     if (day == "weekend") {
    //         setWeekend(!weekend)
    //     }
    // };

    const handleApplyOptions = () => {
        const selectedOptions = {
            bikes: bikes,
            peds: peds,
            weekday: weekday,
            weekend: weekend
        }
        // Call the parent component's callback with the selected options
        onApplyOptions(selectedOptions);
       
    };

    return (
        <Grid container style= {{ width: '80%'}} direction={"column"}>
            {/* <Modal show={showForm} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Select Options</Modal.Title>
                </Modal.Header>
                <Modal.Body> */}
            <Typography id="description" variant="h8" style={{ textAlign: 'center' }}>
                                Select a travelling mode:
                            </Typography>
            
            <FormControl variant='standard'>
                <Select
                    labelId="slider-type-label"
                    id="select-slider-type"
                    value={mode}
                    label="Counts By"
                    onChange={(event) => {

                        handleSelectChange(event)
                    }
                    }
                >
                    <MenuItem value={"bikes"} className="esri-widget">Biking</MenuItem>
                    <MenuItem value={"peds"} className="esri-widget">Walking</MenuItem>

                </Select>
            </FormControl>
            <Grid container direction="row" marginTop="20px">
                <Grid container direction ="column" style={{maxWidth: "50%"}}>
                    <Typography id="description" variant="h8" style={{ textAlign: 'left' }}>
                    Select years:
                    </Typography>
                    <FormControl>
                        <Grid container direction="row">
                            <Grid container direction = "column">
                                <FormControlLabel
                                    label="Year1"
                                    control={
                                        <Checkbox
                                        
                                        defaultChecked
                                        // onChange={handleWeekend}
                                        />
                                    }
                                />
                                <FormControlLabel
                                    label="Year2"
                                    control={
                                        <Checkbox
                                        defaultChecked
                                        // onChange={handleWeekday}
                                        />
                                    }
                                />
                                
                            </Grid>
                        
                        </Grid>
                    </FormControl>
                </Grid>
                <Grid container direction ="column" style={{maxWidth: "50%"}}>
                    <Typography id="description" variant="h8" style={{ textAlign: 'left' }}>
                    Select time range:
                    </Typography>
                    <FormControl>
                        <Grid container direction="row">
                            <Grid container direction = "column">
                                <FormControlLabel
                                    label="Weekends"
                                    control={
                                        <Checkbox
                                        
                                        defaultChecked
                                        onChange={handleWeekend}
                                        />
                                    }
                                />
                                <FormControlLabel
                                    label="Weekdays"
                                    control={
                                        <Checkbox
                                        defaultChecked
                                        onChange={handleWeekday}
                                        />
                                    }
                                />
                                
                            </Grid>
                        
                        </Grid>
                    </FormControl>
                </Grid>
            </Grid>
            
            <Button variant="contained" onClick={handleApplyOptions}>Load Counts</Button>


            {/* <Form>

                <Form.Select onChange={handleSelectChange}>

                    <option value="bikes">Bike Counts</option>
                    <option value="peds">Pedestrian Counts</option>

                </Form.Select>

                <Form.Check
                    inline
                    label="Weekday Counts"
                    name="weekday"
                    type="checkbox"
                    defaultChecked
                    onClick={() => handleCheckboxChange("weekday")}
                    id={`weekday-check`}
                />
                <Form.Check
                    inline
                    label="Weekend Counts"
                    name="weekend"
                    type="checkbox"
                    defaultChecked
                    onClick={() => handleCheckboxChange("weekend")}
                    id={`weekend-check`}
                />


            </Form> */}

            {/* </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>Discard</Button>
                    <Button variant="primary" type="submit" onClick={handleApplyOptions}>Submit</Button>
                </Modal.Footer> */}
        {/* </Modal> */}


        </Grid >
    )

}