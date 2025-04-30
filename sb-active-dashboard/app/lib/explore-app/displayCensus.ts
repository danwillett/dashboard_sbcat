'use client';

import FeatureSet from "@arcgis/core/rest/support/FeatureSet"
import Field from "@arcgis/core/layers/support/Field";
import Graphic from "@arcgis/core/Graphic"
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer"
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import ColorVariable from "@arcgis/core/renderers/visualVariables/ColorVariable";
import { UniqueValueRenderer } from "@arcgis/core/renderers";

const censusTitle = "Demographics"
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
        new Field({
            name: "OBJECTID",
            type: "oid"
        }),
        new Field({
            name: "tract",
            type: "string"
        }),
        new Field({
            name: "block_group",
            type: "string"
        }),
    ]

    tableAttributes = tableAttributes.filter(name => !new Set(["objectid", "geo_id", "tract", "block_group"]).has(name)) 
    let medianField = ""
    tableAttributes.forEach((attr) => {
        let field = new Field({
            name: attr,
            type: "double"
        })

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
        renderer: new SimpleRenderer({
            symbol: new SimpleFillSymbol({
                outline: {
                    color: "lightgray",
                    width: 0.5
                }
            }),
            // label: "fill this in later",
            visualVariables: [
                new ColorVariable({
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
                })
            
            ]
        })
    })

    return layer
}

async function createIncomeGraphics() {
    const geomLayer = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer"})
    const tableLayer = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/1"})

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
        new Field({
            name: "OBJECTID",
            alias: "Object ID",
            type: "oid"
        }),
        new Field({
            name: "tract",
            alias: "Tract",
            type: "string"
        }),
        new Field({
            name: "block_group",
            alias: "Block Group",
            type: "string"
        }),
        new Field({
            name: "income_median",
            alias: "Median Income",
            type: "double"
        }),
        new Field({
            name: "income_total",
            alias: "Total Residents",
            type: "double"
        }),
        new Field({
            name: "income_less_than_10k",
            alias: "< 10k",
            type: "double"
        }),
        new Field({
            name: "income_10k_to_20k",
            alias: "10k - 20k",
            type: "double"
        }),
        new Field({
            name: "income_20k_to_35k",
            alias: "20k - 35k",
            type: "double"
        }),
        new Field({
            name: "income_35k_to_50k",
            alias: "35k - 50k",
            type: "double"
        }),
        new Field({
            name: "income_50k_to_75k",
            alias: "50k - 75k",
            type: "double"
        }),
        new Field({
            name: "income_75k_to_100k",
            alias: "75k - 100k",
            type: "double"
        }),
        new Field({
            name: "income_100k_and_over",
            alias: "> 100k",
            type: "double"
        })


    ]

    // create new feature layer with graphics
    const layer = new FeatureLayer({
        source: graphics,
        title: "Income",
        objectIdField: "OBJECTID",
        fields: layerFields,
        popupTemplate: {
            title: "Income ACS Data",
            content: [
              {
                type: "fields",
                fieldInfos: [
                  {
                    fieldName: "tract",
                    label: "Tract"
                  },
                  {
                    fieldName: "block_group",
                    label: "Block Group"
                  },
                  {
                    fieldName: "income_median",
                    label: "Median Income",
                    format: { digitSeparator: true, places: 0 }
                  },
                  {
                    fieldName: "income_total",
                    label: "Total Residents",
                    format: { digitSeparator: true, places: 0 }
                  },
                  {
                    fieldName: "income_less_than_10k",
                    label: "< 10k",
                    format: { digitSeparator: true, places: 0 }
                  },
                  {
                    fieldName: "income_10k_to_20k",
                    label: "10k - 20k",
                    format: { digitSeparator: true, places: 0 }
                  },
                  {
                    fieldName: "income_20k_to_35k",
                    label: "20k - 35k",
                    format: { digitSeparator: true, places: 0 }
                  },
                  {
                    fieldName: "income_35k_to_50k",
                    label: "35k - 50k",
                    format: { digitSeparator: true, places: 0 }
                  },
                  {
                    fieldName: "income_50k_to_75k",
                    label: "50k - 75k",
                    format: { digitSeparator: true, places: 0 }
                  },
                  {
                    fieldName: "income_75k_to_100k",
                    label: "75k - 100k",
                    format: { digitSeparator: true, places: 0 }
                  },
                  {
                    fieldName: "income_100k_and_over",
                    label: "> 100k",
                    format: { digitSeparator: true, places: 0 }
                  }
                ]
              }
            ]
        },
        opacity: 0.6,
        renderer: new SimpleRenderer({
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
    })

    return layer
}

// funciton loads all census feature layers (polygons, tables) and create new client side feature layers then groups them into a single group layer
export async function createCensusGroupLayer() {
    
    const censusPolygons = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer"})
            
    const censusIncomeTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/1"})
    // const incomeLayer = await createCensusGraphics(censusPolygons, censusIncomeTable, "Income")
    const incomeLayer = await createIncomeGraphics()

    const censusRaceTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/2"})
    const raceLayer = await createCensusGraphics(censusPolygons, censusRaceTable, "Race")
    
    const censusAgeTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/3"})
    const ageLayer = await createCensusGraphics(censusPolygons, censusAgeTable, "Age")

    const censusTransportationTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/4"})
    const transportationLayer = await createCensusGraphics(censusPolygons, censusTransportationTable, "Transportation")

    const censusEducationTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/5"})
    const educationLayer = await createCensusGraphics(censusPolygons, censusEducationTable, "Education")

    const censusGenderTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_ACS_Census_Data/FeatureServer/6"})
    const genderLayer = await createCensusGraphics(censusPolygons, censusGenderTable, "Gender")
    

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
        

