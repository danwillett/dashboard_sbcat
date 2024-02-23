import React, {useEffect, useRef, useState} from "react";
import { Box, Grid, Checkbox, Typography, TextField, FormGroup, FormLabel, FormControl, FormControlLabel, Select, InputLabel, MenuItem, Button, RadioGroup, Radio, Modal} from "@mui/material";


export default function Header() {


    return (
        <Typography
                component="h1"
                variant="h4"
                color="inherit"
                align="center"
                sx={{ flex: 0, margin: 3, maxHeight:'10vh' }}
              >
                Santa Barbara ATP Dashboard
              </Typography>
        
    )

}