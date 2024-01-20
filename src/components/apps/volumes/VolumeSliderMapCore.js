import React, { useEffect, useRef, useState } from "react";
import { Container, Grid, Checkbox, Typography, FormGroup, FormControl, FormControlLabel, Select, InputLabel, MenuItem } from "@mui/material";
import VolumeSliderOptions from "./VolumeSliderOptions";
import VolumeChart from "./VolumeChart";
import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'
import Query from '@arcgis/core/rest/support/Query.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import Graphic from '@arcgis/core/Graphic.js'
import Expand from '@arcgis/core/widgets/Expand.js'
import Slider from '@arcgis/core/widgets/Slider.js'
import Legend from '@arcgis/core/widgets/Legend.js'
import Fullscreen from "@arcgis/core/widgets/Fullscreen.js";

export default function VolumeSliderMapCore() {
    const [filterOptions, setFilterOptions] = useState({
        bikes: false,
        peds: false,
    });
    const [chartData, setChartData] = useState(null)
    const [showForm, setShowForm] = useState(true)
    const [sliderType, setSliderType] = useState("range")
    const [map, setMap] = useState(null)
    const [resultsLayer, setResultsLayer] = useState(null)

    const handleApplyOptions = (options) => {
        // Update the filter options when the user applies changes
        setFilterOptions(options);
    };

    const mapRef = useRef();
    const sliderRef = useRef();
    const slider = useRef(null);
    const legendRef = useRef()
    const legend = useRef(null);
    const chartRef = useRef()


    const hourFields = ["h_00", "h_01", "h_02", "h_03", "h_04", "h_05", "h_06", "h_07", "h_08", "h_09", "h_10", "h_11", "h_12", "h_13", "h_14", "h_15", "h_16", "h_17", "h_18", "h_19", "h_20", "h_21", "h_22", "h_23"]
    
    const addSliderEventListener = (type, resultsLayer) => {
        
       
        let thumbValueMin = 0
        let thumbValueMax = 23


        slider.current.on(["thumb-change", "thumb-drag"], (event) => {

            let thumbIndex = event.index // if 0, its the min thumb, if 1 its the max thumb
            let thumbValue = event.value

            if (thumbIndex == 0) {
                thumbValueMin = thumbValue
                if (type === "hourly") {
                    thumbValueMax = thumbValue
                }
            } else if (thumbIndex == 1) {
                thumbValueMax = thumbValue
            }
            let fieldsToShow = []
            for (let i = thumbValueMin; i <= thumbValueMax; i++) {
                fieldsToShow.push(`avg${hourFields[i]}`)
            }

            let pointsAmount = resultsLayer.graphics.items.length
            let updatedGraphics = []
            for (let i = 0; i < pointsAmount; i++) {
                let countAmount = 0;
                fieldsToShow.forEach((field) => {
                    countAmount += resultsLayer.graphics.items[i].attributes[field]
                })
                let symbolSize = symbolRange(countAmount)
                let symbol = {
                    type: "simple-marker",
                    color: "blue",
                    size: symbolSize,
                    outline: {
                        color: "white",
                        width: 1
                    }

                }

                resultsLayer.graphics.items[i].symbol = symbol
                let updatedGraphic = new Graphic({
                    geometry: resultsLayer.graphics.items[i].geometry,
                    symbol: symbol,
                    attributes: resultsLayer.graphics.items[i].attributes,
                });
                updatedGraphic['attributes']['current_count'] = countAmount

                updatedGraphics.push(updatedGraphic);
            }

            

            // Remove all graphics from the layer
            resultsLayer.graphics.removeAll();

            // Add the updated graphics to the layer
            resultsLayer.graphics.addMany(updatedGraphics);

            // update charts with location counts
            let chart_labels = [];
            let chart_counts = [];
            updatedGraphics.forEach((graphic) => {
                chart_labels.push(graphic.attributes.location)
                chart_counts.push(graphic.attributes.current_count)
            })

            setChartData({
                labels: chart_labels,
                datasets: [{
                    label: 'Counts',
                    data: chart_counts
                }]
            })

        });
    }

    const handleSliderChange = (event) => {

        event.preventDefault()
        event.stopPropagation()
        console.log(event.target.value)
        setSliderType(event.target.value);
        
        if (slider.current) {
            let values
            let rangeSlider
            if (event.target.value === "hourly") {
                values = [0]
                rangeSlider = false
            } else {
                values = [0, 23]
                rangeSlider = true
            }
            slider.visible=false
            slider.current.destroy()
            const sliderContainer = document.getElementById('sliderContainer')
            const newSliderEl = document.createElement('div')
            sliderRef.current = newSliderEl
            sliderContainer.appendChild(newSliderEl)
            slider.current = new Slider({
                min: 0,
                max: 23,
                values: values,
                container: sliderRef.current,
                visibleElements: {
                    labels:true,
                    rangeLabels: true,
                    ticks: true
                },
                precision: 0,
                rangeSlider: rangeSlider,
                
            });
            console.log(resultsLayer)
            addSliderEventListener(event.target.value, resultsLayer)
        }

        
    };

    const chartOptions = {
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    const symbolRange = (count) => {
        let size = 0
        if (count) {
            size = Math.sqrt(count)
        } else {
            size = 0
        }
        return size
    }

    const initLayers = async () => {
        // console.log(esriConfig);
        const resultsGraphicsLayer = new GraphicsLayer()

        const walkingUrl = "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/ATP_Volumes_SB/FeatureServer/0"
        const bikingUrl = "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/ATP_Volumes_SB/FeatureServer/2"
        let url
        let name

        if (filterOptions.bikes) {
            url = bikingUrl
            name = "bike"
            console.log(name)
        } else if (filterOptions.peds) {
            url = walkingUrl
            name = "ped"
            console.log(name)
        }

        const volumes = new FeatureLayer({
            url: url
        })

        const sites = new FeatureLayer({
            url: "https://services1.arcgis.com/4TXrdeWh0RyCqPgB/arcgis/rest/services/ATP_Volumes_SB/FeatureServer/1"
        })

        const sitesQuery = new Query();
        sitesQuery.where = "";  // query all
        sitesQuery.outFields = ["*"];  // get all fields
        sitesQuery.returnGeometry = true
        
        sites.queryFeatures(sitesQuery).then((result) => {

            let siteFeatures = result.features
            let siteObj = {}
            siteFeatures.forEach(feature => {
                let siteLocation = feature.attributes.location
                siteObj[siteLocation] = {}
                siteObj[siteLocation]['attributes'] = feature.attributes
                siteObj[siteLocation]['geometry'] = feature.geometry
            })


            let statsObj = hourFields.map((field) => (
                {
                    onStatisticField: `${name}_volumes_${field}`,
                    outStatisticFieldName: "avg" + field,
                    statisticType: "avg",
                }
            ))


            const statsQuery = new Query({
                outStatistics: statsObj,
                groupByFieldsForStatistics: [`${name}_volumes_location`],
                returnGeometry: false,
            });

            volumes.queryFeatures(statsQuery).then((result) => {
                
                const volumeFeatures = result.features

                volumeFeatures.forEach(feature => {

                    let volumeLocation = feature.attributes[`${name}_volumes_location`]
                    if (volumeLocation) {
                        let graphicFeature = siteObj[volumeLocation]

                        hourFields.forEach(hour => {
                            let hourKey = `avg${hour}`
                            graphicFeature['attributes'][hourKey] = feature.attributes[hourKey]
                        })

                        graphicFeature['attributes']['type'] = name
                        let countAmount = graphicFeature.attributes['avgh_12']
                        let symbolSize = symbolRange(countAmount)

                        let symbol = {
                            type: "simple-marker",
                            color: "blue",
                            size: symbolSize,
                            outline: {
                                color: "white",
                                width: 1
                            }

                        }

                        if (graphicFeature['geometry']) {
                            let graphic = new Graphic({
                                geometry: graphicFeature.geometry,
                                attributes: graphicFeature.attributes,
                                symbol: symbol
                            })
                            resultsGraphicsLayer.add(graphic)
                        }
                    }

                })
                console.log(resultsGraphicsLayer)
                setResultsLayer(resultsGraphicsLayer)


            }).catch(error => {
                console.error("Query error:", error)
                console.error("Query details:", error.details)
            })

        }).catch((error) => {
            console.error("Couldn't get sites: ", error)
        })
    }

    const initMap = () => {

        // Create a view
        view = new MapView({
            map: map,
            center: [-119.8, 34.45],
            zoom: 11,
            container: mapRef.current,
        });


        const infoDiv = document.getElementById("infoDiv")
        view.ui.add(
            new Expand({
                view: view,
                content: infoDiv,
                expandIcon: "list-bullet",
                expanded: true
            }),
            "top-right"
        );

        

        const fullscreen = new Fullscreen({
            view: view
          });
        

        // fullscreen.on("click", (event) => {
        //     console.log("clicled")
        //     console.log(event)
        // })
        // console.log(fullscreen)

        // view.ui.add(fullscreen, "top-left");

        // view.whenLayerView(resultsLayer).then((layerView) => {

        if (!legend.current) {
            legend.current = new Legend({
                view: view,
                container: legendRef.current,
                // layerInfos: [
                //   {
                //     layer: dummyFeatureLayer,
                //     title: "Hourly Bike Counts", // Add your desired title
                //   },
                // ],
            });
        }

        if (!slider.current) {
            slider.current = new Slider({
                min: 0,
                max: 23,
                values: [0, 23],
                container: sliderRef.current,
                visibleElements: {
                    labels:true,
                    rangeLabels: true,
                    ticks: true
                },
                precision: 0,
                rangeSlider: true,
                
            });
        }

        console.log(resultsLayer.graphics)
        addSliderEventListener("range", resultsLayer)


        // });

    };
    
    let view

    // When chart options get filled out, layers are queried to arcgis portal
    useEffect(()=> {
        if (filterOptions.bikes | filterOptions.peds) {
            console.log("querying data from Enterprise")
            initLayers()
        } 
        
    }, [filterOptions])

    // when query results are stored in resultsLayer, create a new map
    useEffect(() => {
        
        if (resultsLayer !== null) {
            console.log("creating new map with queried data")
            // Create a map
            setMap(new Map({
                basemap: "streets-vector",
                layers: [resultsLayer]
            }));
        } 
        

    }, [resultsLayer]);

    // when new map has been created, create a new map view and add widgets
    useEffect(() => {
        if (map !== null) {
            console.log("creating map view")
            initMap()
        }
    }, [map])


    const handleCloseForm = () => {
        setShowForm(false);
        console.log("closing form")
    };

    return (
        <Container maxWidth='lg'>
            <Grid container direction="column" style={{ width: '100%', justifyContent: 'center' }}>
                <Grid item xs={12} md={8}>

                    <div ref={mapRef} style={{ height: "70vh", width: "100%", padding: '30px', boxSizing: "border-box" }}></div>

                    <Grid container justifyContent="center" direction="column" id="infoDiv" className="esri-widget" style={{ minWidth: "500px" }} spacing={1}>
                        <Grid item>
                            <Typography id="description" variant="h6" style={{ textAlign: 'center' }}>
                                Volumes
                            </Typography>
                        </Grid>
                        <Grid container alignItems="center" justifyContent="center" direction="row">
                            <Grid item id="sliderContainer" style={{ minWidth: "400px", marginTop: "20px", marginBottom: "20px" }}>
                                <div ref={sliderRef}></div>
                            </Grid>
                            <Grid item>
                                <FormControl variant='standard'>
                                    <Select
                                        labelId="slider-type-label"
                                        id="select-slider-type"
                                        value={sliderType}
                                        label="Counts By"
                                        onChange={(event) => {
                                            console.log(sliderType)
                                            console.log(map)
                                            console.log(resultsLayer.graphics.items)
                                            handleSliderChange(event)
                                        }
                                        }
                                    >
                                        <MenuItem value={"range"} className="esri-widget">Range</MenuItem>
                                        <MenuItem value={"hourly"} className="esri-widget">Hourly</MenuItem>

                                    </Select>
                                    {/* <Checkbox className="esri-widget"></Checkbox> */}
                                </FormControl>
                            </Grid>


                        </Grid>

                        <div></div>
                        <div ref={legendRef}></div>
                    </Grid>
                </Grid>

                <Grid item alignContent="center" >
                    {chartData && <VolumeChart data={chartData} />}
                </Grid>



                {showForm && <VolumeSliderOptions showForm={showForm} onApplyOptions={handleApplyOptions} onClose={handleCloseForm} />}
            </Grid>
        </Container>
    );
}
