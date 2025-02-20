'use client';

import Graphic from "@arcgis/core/Graphic"
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer"



async function createIncidentGraphics(incidentPoints: __esri.FeatureLayer, query: string, title: string) {

    const incidentsQuery = incidentPoints.createQuery();
    incidentsQuery.where = query
    incidentsQuery.outFields = ["*"]

    const queryResults = await incidentPoints.queryFeatures(incidentsQuery)
    const incidentFeatures = queryResults.features
    const graphics: Graphic[] = []
    let graphic

    incidentFeatures.forEach((incident) => {
        // const timestamp = new Date(incident.attributes.timestamp)
        // incident.attributes.timestamp = timestamp
        graphic = new Graphic({
            geometry: incident.geometry,
            attributes: incident.attributes
        })
        graphics.push(graphic)
    })

    const layerFields = [
        {
            name: "OBJECTID",
            type: "oid"
        },
        {
            name: "data_source",
            type: "string"
        },
        {
            name: "age",
            type: "double"
        },
        {
            name: "gender",
            type: "string"
        },
        {
            name: "incident_type",
            type: "string"
        },
        {
            name: "pedestrian",
            type: "string"
        },
        {
            name: "bicyclist",
            type: "string"
        },
        {
            name: "timestamp",
            type: "date"
        }
    ]
    const colors = ["rgba(115, 0, 115, 0)", "#820082", "#910091", "#a000a0", "#af00af", "#c300c3", "#d700d7", "#eb00eb", "#ff00ff", "#ff58a0", "#ff896b", "#ffb935", "#ffea00"];
    const layer = new FeatureLayer({
        source: graphics,
        title: title,
        objectIdField: "OBJECTID",
        fields: layerFields,
        timeInfo: {
            startField: "timestamp",
            interval: {
                unit: "days",
                value: 1
            }
        },
        opacity: 0.5,
        // renderer: {
        //     type: "simple",
        //     symbol: {
        //         type: "simple-marker",
        //         size: 6,
        //         color: "black",
        //         outline: null
        //     }
        // }
        renderer: {
                
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
            radius: 15,
            maxDensity: .015,
            minDensity: .005,
            referenceScale: 35000,
            legendOptions : {
                title: "Incidents",
                minLabel: "Few crashes",
                maxLabel: "Frequent crashes"
                }
            },

    })
    
    return layer
    
}

export async function createIncidentGroupLayer() {
    
    
    const incidentsLayer = new FeatureLayer({url: 'https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Saftey_Incidents/FeatureServer'})

    const combinedIncidentsLayer = await createIncidentGraphics(incidentsLayer, "", "All Incidents")
    const bikeIncidentsLayer = await createIncidentGraphics(incidentsLayer, "bicyclist = 1", "Bike Incidents")
    const pedIncidentsLayer = await createIncidentGraphics(incidentsLayer, "pedestrian = 1", "Pedestrian Incidents")

    const incidentGroupLayer = new GroupLayer({
        layers: [
            combinedIncidentsLayer,
            bikeIncidentsLayer,
            pedIncidentsLayer
        ],
        title: "Safety Incidents",
        visibilityMode: "exclusive"
    })
    
    return incidentGroupLayer

}