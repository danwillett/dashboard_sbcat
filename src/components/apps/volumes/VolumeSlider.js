import React, { useEffect, useRef, useState, useContext } from "react";
import { MapContext } from "../../MapContext";
import { Grid, FormControl, Select,MenuItem } from "@mui/material";
import '../../../App.css'

export default function VolumeSlider(inputs) {
    const {handleSliderChange, sliderRef, sliderType} = inputs

   
    return (
        
            <Grid container alignItems="center" justifyContent="space-between" direction="row" style={{paddingLeft: "50px", paddingRight: "50px"}}>
            
                <Grid item id="sliderContainer" style={{ height: "100px", width: "400px", marginTop: "10px", marginBottom: "10px" }}>
                    <div id="sliderElement" ref={sliderRef}></div>
                </Grid>
                <Grid item style={{paddingLeft: "50px"}}>
                    <FormControl variant='standard'>
                        <Select
                            labelId="slider-type-label"
                            id="select-slider-type"
                            value={sliderType}
                            label="Counts By"
                            onChange={(event) => {

                                handleSliderChange(event)
                            }
                            }
                        >
                            <MenuItem value={"range"} className="esri-widget">Range</MenuItem>
                            <MenuItem value={"hourly"} className="esri-widget">Hourly</MenuItem>

                        </Select>
                    
                    </FormControl>
                </Grid>
            </Grid>
        
    )

}
    