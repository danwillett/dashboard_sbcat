import Slider from '@arcgis/core/widgets/Slider.js'
import Query from '@arcgis/core/rest/support/Query.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import Graphic from '@arcgis/core/Graphic.js'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'
import PopupTemplate from "@arcgis/core/PopupTemplate.js";

const hourFields = ["h_00", "h_01", "h_02", "h_03", "h_04", "h_05", "h_06", "h_07", "h_08", "h_09", "h_10", "h_11", "h_12", "h_13", "h_14", "h_15", "h_16", "h_17", "h_18", "h_19", "h_20", "h_21", "h_22", "h_23"]
const symbolRange = (count) => {
    let size = 0
    if (count) {
        size = Math.sqrt(count)
    } else {
        size = 1
    }
    return size
}

export const createSlider = (values, rangeSlider, sliderRef) => {
    let slider = new Slider({
        layout: "horizontal",
        min: 0,
        max: 23,
        values: values,
        container: sliderRef.current,
        visibleElements: {
            labels:true,
            // rangeLabels: true,
            ticks: true
        },
        precision: 0,
        rangeSlider: rangeSlider,
        labelFormatFunction: (value, type) => {
            return (value == 0) ? "12 am" : (value < 12) ? `${value} am` : (value === 12) ? '12 pm' : `${value- 12} pm`;
          },
        
    });

    slider.tickConfigs = [{
        mode: "count",
        values: 24,
        labelsVisible: true,
        tickCreatedFunction: function(initialValue, tickElement, labelElement) {
            tickElement.classList.add("mediumTicks");
            labelElement.classList.add("smallLabels");
            let hourLables = [4, 8, 12, 16, 20] 
            if (hourLables.includes(initialValue)) {
                const time = (initialValue == 0) ? "12 am" : (initialValue < 12) ? `${initialValue} am` : (initialValue === 12) ? '12 pm' : `${initialValue - 12} pm`;

                labelElement.innerHTML = time
            } else {
                labelElement.innerHTML = ''
            }
            
        }
    }]
    
    slider.labelInputsEnabled = true
    const itemsArray =slider.segmentElements['items']
    // console.log(slider.segmentElements._items.getItemAt(0))



    return slider
}

export const initMapSlider = (sliderRef, resultsLayer, slider, sliderType, addSliderEventListener, setChartData) => {
    let values
    console.log(slider)
        let rangeSlider
        if (sliderType === "hourly") {
            values = [0]
            rangeSlider = false
        } else {
            values = [0, 23]
            rangeSlider = true
        }

        

        if (!slider.current) {
            slider.current = createSlider(values, rangeSlider, sliderRef)
           
        } else {
            slider.current.destroy()
            const sliderContainer = document.getElementById('sliderContainer')
            const newSliderEl = document.createElement('div')
            sliderRef.current = newSliderEl
            sliderContainer.appendChild(newSliderEl)
            slider.current = createSlider(values, rangeSlider, sliderRef)

        }
        console.log(resultsLayer)
        if (resultsLayer !== null) {
            addSliderEventListener(sliderType, resultsLayer, slider, setChartData)

        }
}

export const initMapLayers = async (filterOptions, hourFields, setResultsLayer) => {
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
            where: filterOptions.filter,
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
                    let popupTemplate = new PopupTemplate({
                        title: volumeLocation,
                        content: `<b>Counts: </b> ${countAmount}<br />`
                    })
    
                    if (graphicFeature['geometry']) {
                        let graphic = new Graphic({
                            geometry: graphicFeature.geometry,
                            attributes: graphicFeature.attributes,
                            symbol: symbol,
                            popupTemplate: popupTemplate
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

export const addSliderEventListener = (type, resultsLayer, slider, setChartData) => {
        
    const hourMapping = {
        h_00: '12:00 AM',
        h_01: '1:00 AM',
        h_02: '2:00 AM',
        h_03: '3:00 AM',
        h_04: '4:00 AM',
        h_05: '5:00 AM',
        h_06: '6:00 AM',
        h_07: '7:00 AM',
        h_08: '8:00 AM',
        h_09: '9:00 AM',
        h_10: '10:00 AM',
        h_11: '11:00 AM',
        h_12: '12:00 PM',
        h_13: '1:00 PM',
        h_14: '2:00 PM',
        h_15: '3:00 PM',
        h_16: '4:00 PM',
        h_17: '5:00 PM',
        h_18: '6:00 PM',
        h_19: '7:00 PM',
        h_20: '8:00 PM',
        h_21: '9:00 PM',
        h_22: '10:00 PM',
        h_23: '11:00 PM',
        };
            
    let thumbValueMin = 0
    let thumbValueMax = 23

    console.log(slider)
    
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
            countAmount = Math.round(countAmount)
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
            let modeType = resultsLayer.graphics.items[i].attributes.type
            let popupTemplate = resultsLayer.graphics.items[i].popupTemplate
            let timeLabel = type === "range" ? `${hourMapping[hourFields[thumbValueMin]]} to ${hourMapping[hourFields[thumbValueMax]]}` : `${hourMapping[hourFields[thumbValueMin]]} hour`
            popupTemplate.content =  `<b>${modeType} Counts: </b> ${countAmount}<br /><b>Time Period: </b> ${timeLabel}<br />`
            let updatedGraphic = new Graphic({
                geometry: resultsLayer.graphics.items[i].geometry,
                symbol: symbol,
                attributes: resultsLayer.graphics.items[i].attributes,
                popupTemplate: popupTemplate
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
                axis:'y',
                label: 'Counts',
                data: chart_counts
            }]
        })
        
        

    });
}
