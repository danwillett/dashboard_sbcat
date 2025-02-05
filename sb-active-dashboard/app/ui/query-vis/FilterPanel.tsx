import React, { useState } from "react";
import { FormControl, InputLabel, Select, Slider, Box } from "@mui/material";

// changes size visualVariables of counts and incidents
export default function FilterPanel() {
    const currentYear = new Date().getFullYear()
    const [timeRange, setTimeRange] = React.useState<number[]>([2012, currentYear]);

    const handleChange = (event: Event, newValue: number | number[]) => {
        setTimeRange(newValue as number[]);
    };
    return (
        <Box sx={{width: 200}}>
            
            <Slider
                getAriaLabel={() => 'Temperature range'}
                value={timeRange}
                onChange={handleChange}
                valueLabelDisplay="auto"
            
            />

        </Box>
    )


}