'use client';

import Graphic from "@arcgis/core/Graphic"
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer"
import HeatmapRenderer from "@arcgis/core/renderers/HeatmapRenderer.js";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer"
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer"


const colors = ["rgba(115, 0, 115, 0)", "#820082", "#910091", "#a000a0", "#af00af", "#c300c3", "#d700d7", "#eb00eb", "#ff00ff", "#ff58a0", "#ff896b", "#ffb935", "#ffea00"];

const heatmapRenderer = new HeatmapRenderer({
    colorStops: [
        { color: colors[0], ratio: 0 },
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
    type: 'heatmap',
    radius: 15,
    maxDensity: .015,
    minDensity: .005,
    referenceScale: 35000,
    legendOptions : {
        title: "Incidents",
        minLabel: "Few crashes",
        maxLabel: "Frequent crashes"
        }
    })

const pointRenderer = new UniqueValueRenderer({
    type: "unique-value",
    field: "p_type",
    uniqueValueInfos: [
        {
            value: "collision",
            symbol: {
                type: "picture-marker",
                url: "/icons/collision_icon.png",
                width: "18px",
                height: "18px"
            }
        },
        {
            value: "nearmiss",
            symbol: {
                type: "picture-marker",
                url: "/icons/nearmiss_icon.png",
                width: "18px",
                height: "18px"
            }
        },
]
   
    
})

const clusterRenderer = new SimpleRenderer({
    type: "simple",
    symbol: {
        type: "simple-marker",
        size: 6,
        color: 'red'
    }
        
})
const clusterReduction = {
    type: "cluster",
    clusterMinSize: 16.5,
    // defines the label within each cluster
    labelingInfo: [
        {
        deconflictionStrategy: "none",
        labelExpressionInfo: {
            expression: "Text($feature.cluster_count, '#,###')"
        },
        symbol: {
            type: "text",
            color: "white",
            font: {
            family: "Noto Sans",
            size: "12px"
            }
        },
        labelPlacement: "center-center"
        }
    ],
    // information to display when the user clicks a cluster
    popupTemplate: {
        title: "Cluster Summary",
        content: "This cluster represents <b>{cluster_count}</b> safety incidents.",
        fieldInfos: [{
        fieldName: "cluster_count",
        format: {
            places: 0,
            digitSeparator: true
        }
        }]
    }
}


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
        // renderer: heatmapRenderer 
        renderer: pointRenderer,

    })

    
    return layer
    
}

export function changeIncidentRenderer(groupLayer: __esri.GroupLayer, type: string) {

    groupLayer.layers.items.forEach((layer) => {

        if (type === "heatmap") {
            layer.featureReduction = null
            layer.renderer = heatmapRenderer
            layer.opacity = 0.6
            console.log(layer)
            
        } else if (type === "simple") {
            layer.featureReduction = null
            layer.renderer = pointRenderer
            layer.opacity = 0.8
            
            console.log(layer)
           
        } else if (type === "cluster") {
            layer.renderer = clusterRenderer
            layer.featureReduction = clusterReduction
        }

    })

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
    console.log(incidentGroupLayer)
    
    return incidentGroupLayer

}