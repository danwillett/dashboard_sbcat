'use client';

import Graphic from "@arcgis/core/Graphic"
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer"
import * as math from 'mathjs'
import { DataFrame, Str, toJSON } from "danfojs"

// display count locations, change color by average counts/day (?)
async function createCountGraphics(countPoints: __esri.FeatureLayer, countTable: __esri.FeatureLayer, query: string, title: string) {

    let tableQuery = countTable.createQuery();
    tableQuery.where = query // query either only bikes or only peds
    tableQuery.outFields = ["*"]
    tableQuery.groupByFieldsForStatistics = ["site_id", "date"]
    tableQuery.outStatistics = [
        {
            onStatisticField: "counts",
            outStatisticFieldName: "total_daily_count",
            statisticType: "sum"
        }
    ]

    let tableArr = []
    const tableResults = await countTable.queryFeatures(tableQuery)

    let tableFeatures = tableResults.features
    tableFeatures.forEach((feature: any) => {
        tableArr.push({...feature.attributes})
    })
   
    const tableDf = new DataFrame(tableArr)
    const dailyAvgCounts = tableDf.groupby(["site_id"]).agg({total_daily_count: "mean"}).rename({total_daily_count_mean: "avg_daily_count"})
    const dailyAvgsObj = toJSON(dailyAvgCounts)

    // querying count location point geometry attributes
    let geomQuery = countPoints.createQuery()
    geomQuery.where = ""
    geomQuery.outFields = "*"
    geomQuery.returnGeometry = true

    let geomArr = []
    const geomResults = await countPoints.queryFeatures(geomQuery)

    let geomFeatures = geomResults.features

    geomFeatures.forEach((feature) => {
 
        let id = feature.attributes.id
        let source = feature.attributes.source
        let locality = feature.attributes.locality
        let edges = feature.attributes.site_edges_arr
        let numEdges

        if (edges == null) {
            numEdges = 2
        } else {
            let edges_array = edges.split(',').map((edge: Str) => edge.trim())
            numEdges = edges_array.length
        }
        
        let geometry = feature.geometry

        geomArr.push({id: id, geometry: geometry, locality: locality, source: source, num_site_edges: numEdges})
    })

    // joining geometries with daily average counts table
    const mergedData = dailyAvgsObj.map((tableData) => {
        const geomData = geomArr.find((data) => data.id === tableData.site_id)
        return {
            ...tableData,
            ...(geomData ? geomData : {})
        }
    })

      
    // creating a new graphics layer 
    const graphics: Graphic[] = []
    let graphic
    let countArr: number[] = []
    for (let i=0; i<mergedData.length; i++) {
        // if the source is video counts, divide total daily counts by 2 so we're keeping one count per rider
        if (mergedData[i].source = "SB Video Counts") {
            mergedData[i].avg_daily_count = mergedData[i].avg_daily_count/2
            
        }
        graphic = new Graphic({
            geometry: mergedData[i].geometry,
            attributes: mergedData[i]
        })
        graphics.push(graphic)
        countArr.push(mergedData[i].avg_daily_count)
    }
    
    const layerFields = [
        {
            name: "OBJECTID",
            type: "oid"
        },
        {
            name: "name",
            type: "string"
        },
        {
            name: "source",
            type: "string"
        },
        {
            name: "locality",
            type: "string"
        },
        {
            name: "edges",
            type: "double"
        },
        {
            name: "type",
            type: "string"
        },
        {
            name: "avg_daily_count",
            type: "double"
        },

    ]

    // calculate metrics for visualization
    // count_mean = math.mean()
 
    
    const countMean = math.mean(countArr)
    const countStd = math.std(countArr)
    let highStop = Math.round(countMean + countStd)
    let lowStop = Math.round(countMean - countStd)
    lowStop = lowStop < 10 ? 10 : lowStop

    const layer = new FeatureLayer({
        source: graphics,
        title: title,
        objectIdField: "OBJECTID",
        fields: layerFields,
        // popupTemplate: {
        //     content: "<p>heyo! '{tract}' '{block_group}'</p>"
        // },
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-marker",
                size: 5,
                // color: "red",
                outline: {
                    width: 0.5,
                    color: "gray"
                }
            },
            visualVariables: [
                {
                    type: "color",
                    field: "avg_daily_count",
                    stops: [
                        {
                          value: lowStop,
                          color: "#D4EFFF",
                          label: `low daily traffic`
                        },
                        {
                          value: highStop,
                          color: "#FF6E00",
                          label: `high daily traffic`
                        }
                    ]
                }
            
            ]
            
        }
    })
    
    return layer

}

export async function createCountLayer() {

    const countPoints = new FeatureLayer({url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/0"})
    const countTable = new FeatureLayer({url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Counts/FeatureServer/1"})

    const bikeLayer = await createCountGraphics(countPoints, countTable, "type = 'bike'", "Bikes")
    const pedLayer = await createCountGraphics(countPoints, countTable, "type = 'ped'", "Peds")

    const countGroupLayer = new GroupLayer({
        layers: [
            bikeLayer,
            pedLayer
        ],
        title: "Bike & Ped Counts",
        visibilityMode: "exclusive"

    })

    return countGroupLayer

}

