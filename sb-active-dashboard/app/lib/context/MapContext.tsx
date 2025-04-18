'use client'

import React, { ReactNode, createContext, useContext, useState } from 'react'
import Map from "@arcgis/core/Map"
import MapView from "@arcgis/core/views/MapView"
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import LayerList from '@arcgis/core/widgets/LayerList';
import TimeSlider from "@arcgis/core/widgets/TimeSlider"

type MapContextType = {
    
    mapRef: Map | null,
    setMapRef: React.Dispatch<React.SetStateAction<Map | null>>,

    viewRef: MapView | null,
    setViewRef: React.Dispatch<React.SetStateAction<MapView | null>>,

    censusGroupLayer: GroupLayer | null,
    setCensusGroupLayer: React.Dispatch<React.SetStateAction<GroupLayer | null>>,

    countGroupLayer: GroupLayer | null,
    setCountGroupLayer: React.Dispatch<React.SetStateAction<GroupLayer | null>>,
    
    incidentGroupLayer: GroupLayer | null,
    setIncidentGroupLayer: React.Dispatch<React.SetStateAction<GroupLayer | null>>,

    layerList: LayerList | null,
    setLayerList: React.Dispatch<React.SetStateAction<LayerList | null>>,

    timeSlider: TimeSlider | null,
    setTimeSlider: React.Dispatch<React.SetStateAction<TimeSlider | null>>

}
const MapContext = createContext<MapContextType | undefined>(undefined)

interface MapProviderProps {
    children: ReactNode;
}

export default function MapProvider({children}: MapProviderProps){

    // map components
    const [ mapRef, setMapRef ] = useState<Map | null>(null)
    const [ viewRef, setViewRef ] = useState<MapView | null>(null)
    const [ layerList, setLayerList ] = useState<LayerList | null>(null)
    const [ timeSlider, setTimeSlider ] = useState<TimeSlider | null>(null)

    // data layers
    const [ censusGroupLayer, setCensusGroupLayer ] = useState<GroupLayer | null>(null)
    const [ countGroupLayer, setCountGroupLayer ] = useState<GroupLayer | null>(null)
    const [ incidentGroupLayer, setIncidentGroupLayer ] = useState<GroupLayer | null>(null)

    
    
    return (
        <MapContext.Provider
            value={{
                mapRef, setMapRef, 
                viewRef, setViewRef,
                layerList, setLayerList,
                timeSlider, setTimeSlider,

                censusGroupLayer, setCensusGroupLayer, 
                countGroupLayer, setCountGroupLayer, 
                incidentGroupLayer, setIncidentGroupLayer,
                
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