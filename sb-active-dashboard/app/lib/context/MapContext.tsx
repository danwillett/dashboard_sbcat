'use client'

import React, { ReactNode, createContext, useContext, useState } from 'react'
import Map from "@arcgis/core/Map"
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import LayerList from '@arcgis/core/widgets/LayerList';

type MapContextType = {
    
    mapRef: Map | null,
    setMapRef: React.Dispatch<React.SetStateAction<Map | null>>,

    censusGroupLayer: GroupLayer | null,
    setCensusGroupLayer: React.Dispatch<React.SetStateAction<GroupLayer | null>>,

    countGroupLayer: GroupLayer | null,
    setCountGroupLayer: React.Dispatch<React.SetStateAction<GroupLayer | null>>,
    
    incidentGroupLayer: GroupLayer | null,
    setIncidentGroupLayer: React.Dispatch<React.SetStateAction<GroupLayer | null>>,

    layerList: LayerList | null,
    setLayerList: React.Dispatch<React.SetStateAction<LayerList | null>>

}
const MapContext = createContext<MapContextType | undefined>(undefined)

interface MapProviderProps {
    children: ReactNode;
}

export default function MapProvider({children}: MapProviderProps){

    const [ mapRef, setMapRef ] = useState<Map | null>(null)
    const [ censusGroupLayer, setCensusGroupLayer ] = useState<GroupLayer | null>(null)
    const [ countGroupLayer, setCountGroupLayer ] = useState<GroupLayer | null>(null)
    const [ incidentGroupLayer, setIncidentGroupLayer ] = useState<GroupLayer | null>(null)
    const [ layerList, setLayerList ] = useState<LayerList | null>(null)
    
    return (
        <MapContext.Provider
            value={{
                mapRef, setMapRef, 
                censusGroupLayer, setCensusGroupLayer, 
                countGroupLayer, setCountGroupLayer, 
                incidentGroupLayer, setIncidentGroupLayer,
                layerList, setLayerList 
            }}
            >
            {children}
        </MapContext.Provider>
    )
}

export const useMapContext = () => {
    const context = useContext(MapContext)
    if (!context) {
        throw new Error('useMapContext must be used within a LayerProvider')
    }

    return context
}