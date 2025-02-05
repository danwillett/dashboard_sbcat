import React, {  useRef, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { Radio, RadioGroup, FormControl, FormControlLabel, FormLabel } from '@mui/material';
import * as math from 'mathjs'

interface props {
    sublayer: any
}

function IncidentRenderer(props: props) {
    
    const { sublayer } = props
    console.log(sublayer)
    const [ renderField, setRenderField ] = useState()

    let fields = sublayer.layer.fields
    console.log(fields)

    fields = fields.filter((field: any) => field.type === "double")
    const normField = fields.filter((field: any) => field.name.includes("_total"))[0]
    fields = fields.filter((field: any) => field.name !== normField.name)
    
   
    return (
        <FormControl>
            <FormLabel id="counts-render-button-group">Select by source</FormLabel>
            <RadioGroup
            aria-labelledby="counts-render-button-group"
            defaultValue={fields[0].name}
            name="radio-buttons-group"
            >
                { fields.map((attribute) => (
                    <FormControlLabel 
                        key={attribute.source} 
                        value={attribute.source} 
                        control={<Radio  />} 
                        label={attribute.source} 
                        />
                ))}
                
            </RadioGroup>
      </FormControl>

    )
}

export default function addCountRenderPanel(sublayer: any) {

    const container = document.createElement("div")
    const root = createRoot(container)
    root.render(<IncidentRenderer sublayer={sublayer} />)

    sublayer.panel = {
        content: container,
        iconClass: "layer-graphics",
        title: "filter fields"
    }
}

