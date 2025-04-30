'use client';
import React, { useState, useEffect, useRef } from "react";

// map context and types
import { useMapContext } from "@/app/lib/context/MapContext";

// arcgis js

import GroupLayer from "@arcgis/core/layers/GroupLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FeatureLayerView from "@arcgis/core/views/layers/FeatureLayerView";
import GroupLayerView from "@arcgis/core/views/layers/GroupLayerView";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import { SimpleRenderer } from "@arcgis/core/renderers";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";

// mui
import { FormControl, FormLabel, FormGroup, Radio, RadioGroup, InputLabel, MenuItem, Slider, Box, Typography, FormControlLabel, Checkbox } from "@mui/material";
import Select, { SelectChangeEvent } from '@mui/material/Select';
import ColorVariable from "@arcgis/core/renderers/visualVariables/ColorVariable";


type Filters = {
    timeOfDay: string | null,
    dayOfWeek: string | null,
    incidentType: string | null,
    dataSource: string | null
  };

// changes size visualVariables of counts and incidents
export default function DemographicFilters() {

    const { censusGroupLayer, viewRef, mapRef } = useMapContext()

    // Income settings
    const [incomeAttribute, setIncomeAttribute] = useState<string>("Median")
    const handleIncomeDisplay = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIncomeAttribute((event.target as HTMLInputElement).value);
    }
    const incomeMarksFields = [
        {
            value: 0,
            label: '-',
            field0: 'income_less_than_10k'
        },
        {
            value: 10,
            label: '10k',
            field0: 'income_10k_to_20k',
            field1: 'income_less_than_10k'
        },
        {
            value: 20,
            label: '20k',
            field0: 'income_20k_to_35k',
            field1: 'income_10k_to_20k',
        },
        {
            value: 35,
            label: '35k',
            field0: 'income_35k_to_50k',
            field1: 'income_20k_to_35k',
        },
        {
            value: 50,
            label: '50k',
            field0: 'income_50k_to_75k',
            field1: 'income_35k_to_50k',
        },
        {
            value: 75,
            label: '75k',
            field0: 'income_75k_to_100k',
            field1: 'income_50k_to_75k',
        },
        {
            value: 100,
            label: '100k',
            field0: 'income_100k_and_over',
            field1: 'income_75k_to_100k',
        },
        {
            value: 110,
            label: '+',
            field1: 'income_100k_and_over',
        },
      ];

    const incomeMarks = incomeMarksFields.map((entry) => {
        return {
            value: entry.value,
            label: entry.label
        }
    })
    
    function incometext(value: number) {
    const index = incomeMarks.findIndex((entry) => entry.value === value)    
    return `${incomeMarks[index].label}`; 
    }

    const [incomeValue, setIncomeValue] = useState<number[]>([50, 100])
    const handleIncomeChange = (event: Event, value: number | number[], activeThumb: number) => {
        if (Array.isArray(value)) {
            let val0ind
            if (value[0] < 110) {
                val0ind = incomeMarks.findIndex((entry) => entry.value === value[0])
            } else {
                val0ind = 6 // value: 100
            }

            let val1ind
            if (value[1] > 0) {
                val1ind = incomeMarks.findIndex((entry) => entry.value === value[1])
            } else {
                val1ind = 1 // value: 10
            }
            
            // if there is less than 1 between slider marks, force a min distance of 1 mark
            if (val1ind - val0ind < 1) {
                if (activeThumb === 0) {
                    setIncomeValue([incomeMarks[val0ind].value, incomeMarks[val0ind + 1].value])
                    
                } else {
                    setIncomeValue([incomeMarks[val1ind - 1].value, incomeMarks[val1ind].value])
                }
            } 
            // ensure widest marker gap is 7 so we don't have all 100%s
            else if (val1ind - val0ind == 7) {
                if (activeThumb === 0) {
                    setIncomeValue([incomeMarks[val0ind].value, incomeMarks[val1ind - 1].value])
                } else {
                    setIncomeValue([incomeMarks[val0ind + 1].value, incomeMarks[val1ind].value])
                }
            }

            else {
                setIncomeValue([incomeMarks[val0ind].value, incomeMarks[val1ind].value])
            }
        }
    }

    const filterIncome = () => {
        // get fields for filtering
        const lowerFieldInd = incomeMarksFields.findIndex((entry) => entry.value === incomeValue[0])
        const upperFieldInd = incomeMarksFields.findIndex((entry) => entry.value === incomeValue[1])

        const filterMarksFields = incomeMarksFields.slice(lowerFieldInd, upperFieldInd)
        const filterFields = filterMarksFields
            .map((entry, index) => {
                if (index === 0) {
                    return entry.field0
                } else {
                    return entry.field1
                }
            })
            .filter(((value, index, self) => self.indexOf(value) === index))

        const expression = filterFields
            .map(f => `$feature["${f}"]`)
            .join(" + ")

        const valueExpression = `
            var total = (${expression})
            return 100 * (total / $feature.income_total )
        `

        const visualVariables = [
            new ColorVariable({
                valueExpression: valueExpression,
                valueExpressionTitle: '% of Population',
                stops: [
                    { value: 0, color: "#FFFCD4" },
                    { value: 100, color: "#350242" }
                  ]
            })
        ]

        const incomeRangeRenderer = new SimpleRenderer({
            symbol: new SimpleFillSymbol({
                outline: {
                    color: "lightgray",
                    width: 0.5
                }
            }),
            visualVariables: visualVariables

        })
        return incomeRangeRenderer
    }

    useEffect(() => {

        if (censusGroupLayer && viewRef && mapRef) {
            if (incomeAttribute === "Range"){
                const rangeRenderer = filterIncome()
                censusGroupLayer.layers.forEach( async (layer) => {
                    if (layer instanceof FeatureLayer) {
                        if (layer.title === "Income") {
                            layer.renderer = rangeRenderer
                            
                        }
                    } 
                })
            } else {
                const medianRenderer = new SimpleRenderer({
                    symbol: new SimpleFillSymbol({
                        outline: {
                            color: "lightgray",
                            width: 0.5
                        }
                    }),
        
                    visualVariables: [
                        new ColorVariable({
                            field: "income_median",
                            stops: [
                                {
                                  value: 50000,
                                  color: "#FFFCD4",
                                  label: "< $50,000"
                                },
                                {
                                  value: 200000,
                                  color: "#350242",
                                  label: "> $200,000"
                                }
                            ]
                        })
                    
                    ]
                })
                censusGroupLayer.layers.forEach( async (layer) => {
                    if (layer instanceof FeatureLayer) {
                        if (layer.title === "Income") {
                            layer.renderer = medianRenderer
                            
                        }
                    } 
                })
            }
        }
    }, [incomeValue, incomeAttribute])

    return (
        <Box>
            <FormControl>
                <FormLabel id="income-controlled-radio-buttons-group">Income</FormLabel>
                <RadioGroup
                    aria-labelledby="income-controlled-radio-buttons-group"
                    name="controlled-radio-buttons-group"
                    value={incomeAttribute}
                    onChange={handleIncomeDisplay}
                >
                    <FormControlLabel value="Median" control={<Radio />} label="Median Income ($)" />
                    <FormControlLabel value="Range" control={<Radio />} label="Income Range (%)" />
                </RadioGroup>
                
            </FormControl>
    
                <Box sx={{width: '100%'}}>
                    <Slider
                        aria-label="Income levels"
                        value={incomeValue}
                        marks={incomeMarks}
                        min={0}
                        max={110}
                        step={null}
                        onChange={handleIncomeChange}
                        getAriaValueText={incometext}
                        valueLabelFormat={incometext}
                        valueLabelDisplay="auto"
                        disableSwap
                        disabled={incomeAttribute !== "Range"}
                    />
                </Box>

        </Box>
        

    )

}