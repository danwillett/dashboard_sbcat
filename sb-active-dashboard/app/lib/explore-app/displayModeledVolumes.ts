'use client';

import FeatureSet from "@arcgis/core/rest/support/FeatureSet"
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";


async function createModeledVolumeGraphics(network: __esri.FeatureLayer, bikeVolumeTable: __esri.FeatureLayer) {
    
    let queryResultLength = 10000
    let tableArr: Record<string, any>[] = []
    let tableObjectIds : string[] = []
    while (queryResultLength === 10000) {

        const tableQuery = bikeVolumeTable.createQuery()
        tableQuery.where = "1=1"
        tableQuery.outFields = ["*"]
        tableQuery.returnGeometry = false
        tableQuery.maxRecordCountFactor = 5
        if (tableObjectIds.length > 0) {
            tableQuery.objectIds = tableObjectIds
        }
        const tableResults: FeatureSet = await bikeVolumeTable.queryFeatures(tableQuery)
        const tableFeatures = tableResults.features

        tableFeatures.forEach((feature: any) => {
            tableArr.push({...feature.attributes})
            tableObjectIds.push(feature.attributes.objectid)
        })
        queryResultLength = tableFeatures.length
        tableObjectIds = tableObjectIds.map((id) => id + queryResultLength)
        console.log(tableArr)
    }
    console.log(tableArr)

}   

export async function createModeledVolumeLayer() {
    const network = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer/0"})
    const bikeVolumeTable = new FeatureLayer({ url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Bicycle_and_Pedestrian_Modeled_Volumes/FeatureServer/1"})

    const bikeLayer = await createModeledVolumeGraphics(network, bikeVolumeTable)
}   