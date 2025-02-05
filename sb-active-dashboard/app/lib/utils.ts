'use client';

import Graphic from "@arcgis/core/Graphic"
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import addCensusRenderPanel from "../ui/query-vis/CensusRenderer";
import addCountRenderPanel from "../ui/query-vis/CountRenderer";

export async function createGraphics(geomLayer, tableLayer, geom_id: string, query: string = "") {

    // querying census table information
    let tableQuery = tableLayer.createQuery();
    tableQuery.where = query // No filter, query all records
    tableQuery.outFields = ["*"]

    let tableArr = []
    const tableResults = await tableLayer.queryFeatures(tableQuery)
        
    let tableFeatures = tableResults.features
    tableFeatures.forEach((feature: any) => {
        tableArr.push(feature.attributes)    
    })
    let tableAttributes = Object.keys(tableFeatures[0].attributes)
             
    // querying census for geometry attributes
    // querying census block and tract geometries
    let geomQuery = geomLayer.createQuery()
    geomQuery.where = ""
    geomQuery.outFields = ["id"]
    geomQuery.returnGeometry = true

    let geomArr = []
    const geomResults = await geomLayer.queryFeatures(geomQuery)

    let geomFeatures = geomResults.features
    geomFeatures.forEach((feature) => {
        
        let id = feature.attributes.id
        let geometry = feature.geometry

        geomArr.push({id: id, geometry: geometry})
    })


    // joining geometries with census table
    const mergedData = tableArr.map((tableData) => {
        const geomData = geomArr.find((data) => data.id === tableData[geom_id])
        return {
            ...tableData,
            ...(geomData ? geomData : {})
        }
    })

    
    // creating a new graphics layer 
    let graphics = []
    let graphic
    for (let i=0; i<mergedData.length; i++) {
        graphic = new Graphic({
            geometry: mergedData[i].geometry,
            attributes: mergedData[i]
        })
        graphics.push(graphic)
    }

    // return graphics array and table attributes
    return {graphics, tableAttributes, mergedData}
}

export function addVisualizationOptions(event) {
    
    // if the item is Demographics, add rendering actions for each attribute

    const { item } = event

    if (item.title === "ACS 2023 5-Year Demographics") { // need to make this title a universal variable
        
        item.children.items.forEach((sublayer: any, index: any) => {

            addCensusRenderPanel(sublayer)                
        })

    }

    if (item.title === "Bike & Ped Counts") {

        item.children.items.forEach((sublayer: any, index: any) => {

            addCountRenderPanel(sublayer)
        })
    }

        // if (item.title === "Bike & Ped Counts") {
             
        //     item.children.items.forEach((sublayer: any, index: any) => {
                                
        //         sublayer.panel = {
        //             content: null,
        //             iconClass: "layer-graphics",
        //             title: "visualization fields",
        //         }
                
        //         addRenderPanel(sublayer)
        //     })

        // }
        
    
}