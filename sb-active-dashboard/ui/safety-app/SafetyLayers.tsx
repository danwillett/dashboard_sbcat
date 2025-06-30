import React, { useEffect, useState } from "react";

import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

export default function SafetyLayers() {
  return (
    <FormGroup>
      <FormControlLabel 
        control={
            <Switch name="Incident Reports" />
            } 
        label="Incident Reports"
        />

        <FormControlLabel 
            control={
                <Switch name="High Collision Areas" />
                } 
            label="High Collision Areas"
        />

        <FormControlLabel 
            control={
                <Switch name="High Risk Areas" />
                } 
            label="High Risk Areas"
        />

    </FormGroup>
  );
}
