import React, { useEffect, useRef, useState, useContext } from "react";
import { MapContext, MapContextProvider } from "../../MapContext";
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js'


const setRenderer = async () => {
    const colors = ["rgba(115, 0, 115, 0)", "#820082", "#910091", "#a000a0", "#af00af", "#c300c3", "#d700d7", "#eb00eb", "#ff00ff", "#ff58a0", "#ff896b", "#ffb935", "#ffea00"];

    const incidentRenderer = {
      type: "heatmap",
      // symbol: symbol,
      colorStops: [
        { color: colors[0], ratio: 0 },
        // { color: colors[0], ratio: 0.07 },
        { color: colors[1], ratio: 0.083 },
        { color: colors[2], ratio: 0.166 },
        { color: colors[3], ratio: 0.249 },
        { color: colors[4], ratio: 0.332 },
        { color: colors[5], ratio: 0.415 },
        { color: colors[6], ratio: 0.498 },
        { color: colors[7], ratio: 0.581 },
        { color: colors[8], ratio: 0.664 },
        { color: colors[9], ratio: 0.747 },
        { color: colors[10], ratio: 0.83 },
        { color: colors[11], ratio: 0.913 },
        { color: colors[12], ratio: 1 }
      ],
      radius: 18,
      // maxDensity: 0.05,
      minDensity: 0,
      legendOptions : {
        title: "Car crashes",
        minLabel: "Few crashes",
        maxLabel: "Frequent crashes"
      }
    }
    return incidentRenderer
  }
const loadIncidents = async (setIncidentData, setRenderer, incidentLayerUrl) => {

    const popup = {
      title: "Incident Details",
      content: "<b>Incident Date:</b> {date}<br><b>Incident Type:</b> {incident_t}<br><b>Pedestrian:</b> {pedestrian}<br><b>Bike:</b> {bicyclist}<br><b>EBike:</b> {ebike}<br><b>Age:</b> {age}<br><b>Gender:</b> {gender}<br><b>Source:</b> {data_sourc}",
    }

    const ebikeLayer = new FeatureLayer({
      url: incidentLayerUrl,
      outFields: ['*'],
      renderer: await setRenderer(),
      popupTemplate: popup,
      opacity: 0.55
    })
    console.log(ebikeLayer)

    setIncidentData(ebikeLayer)

}

export {loadIncidents, setRenderer}