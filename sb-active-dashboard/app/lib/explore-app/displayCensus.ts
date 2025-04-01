'use client';

import FeatureSet from "@arcgis/core/FeatureSet"
import Graphic from "@arcgis/core/Graphic"
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer"

const censusTitle = "ACS 2023 5-Year Demographics"
// function creates a graphics layer for the census data based on a chosen table

async function createCensusGraphics(geomLayer: any, tableLayer: any, layerName: any) {
    
    // create an array of graphics and array of table attribute fields
    let tableQuery = tableLayer.createQuery();
    tableQuery.where = "" // No filter, query all records
    tableQuery.outFields = ["*"]

    let tableArr: Record<string, any>[] = [];  // Array of attribute objects
    const tableResults: FeatureSet = await tableLayer.queryFeatures(tableQuery)
        
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

    let geomArr: Record<string, any>[] = [];  // Array of attribute objects
    const geomResults: FeatureSet  = await geomLayer.queryFeatures(geomQuery)

    let geomFeatures = geomResults.features
    geomFeatures.forEach((feature: any) => {
        
        let id = feature.attributes.id
        let geometry = feature.geometry

        geomArr.push({id: id, geometry: geometry})
    })

    // joining geometries with census table
    const mergedData = tableArr.map((tableData) => {
        const geomData = geomArr.find((data) => data.id === tableData.geo_id)
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
    
    const layerFields = [
        {
            name: "OBJECTID",
            type: "oid"
        },
        {
            name: "tract",
            type: "string"
        },
        {
            name: "block_group",
            type: "string"
        },
    ]

    tableAttributes = tableAttributes.filter(name => !new Set(["objectid", "geo_id", "tract", "block_group"]).has(name)) 
    let medianField = ""
    tableAttributes.forEach((attr) => {
        let field = {
            name: attr,
            type: "double"
        }

        layerFields.push(field)
        if (attr.includes("median")) {
            medianField = attr
        }
    })

    // determine initial rendering based on whether there's a median field or not
    let displayField = ""
    let normField = ""
    let lowStop = 0.1;
    let highStop = 0.5;
    let lowLabel = "<10%"
    let highLabel = ">50%"

    if (medianField !== "") {
        displayField = medianField
        const medianValues = mergedData.map(obj => obj[medianField]).filter(value => value !== null)
        
        lowStop = Math.min(...medianValues)
        highStop = Math.max(...medianValues)

        lowLabel = `$${lowStop}/year`
        highLabel = `$${highStop}/year`
        console.log(lowStop, highStop)
    } else {
        displayField = layerFields[4].name
        normField = layerFields[3].name

    }
    
    // create new feature layer with graphics
    const layer = new FeatureLayer({
        source: graphics,
        title: layerName,
        objectIdField: "OBJECTID",
        fields: layerFields,
        // popupTemplate: {
        //     content: "<p>heyo! '{tract}' '{block_group}'</p>"
        // },
        opacity: 0.6,
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                outline: {
                    color: "lightgray",
                    width: 0.5
                }
            },
            label: "fill this in later",
            visualVariables: [
                {
                    type: "color",
                    field: displayField,
                    normalizationField: normField,
                    stops: [
                        {
                          value: lowStop,
                          color: "#FFFCD4",
                          label: lowLabel
                        },
                        {
                          value: highStop,
                          color: "#350242",
                          label: highLabel
                        }
                    ]
                }
            
            ]
        }
    })

    return layer
}

// funciton loads all census feature layers (polygons, tables) and create new client side feature layers then groups them into a single group layer
export async function createCensusGroupLayer() {
    
    const censusPolygons = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer"})
            
    const censusIncomeTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/1"})
    const incomeLayer = await createCensusGraphics(censusPolygons, censusIncomeTable, "Income Distribution")
    
    const censusRaceTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/2"})
    const raceLayer = await createCensusGraphics(censusPolygons, censusRaceTable, "Race Distribution")
    
    const censusAgeTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/3"})
    const ageLayer = await createCensusGraphics(censusPolygons, censusAgeTable, "Age Distribution")

    const censusTransportationTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/4"})
    const transportationLayer = await createCensusGraphics(censusPolygons, censusTransportationTable, "Transportation Distribution")

    const censusEducationTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/5"})
    const educationLayer = await createCensusGraphics(censusPolygons, censusEducationTable, "Education")

    const censusGenderTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/6"})
    const genderLayer = await createCensusGraphics(censusPolygons, censusGenderTable, "Gender Distribution")
    

    const censusGroupLayer = new GroupLayer({
        layers: [
            incomeLayer,
            raceLayer,
            ageLayer,
            transportationLayer,
            educationLayer,
            genderLayer
        ],
        title: censusTitle,
        visibilityMode: "exclusive"
    })
    return censusGroupLayer
}


    // arcgisLayerList.
        

