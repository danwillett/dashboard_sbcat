import React, {createContext, useState} from 'react'

const MapContext = createContext()

const MapContextProvider = ({children}) => {
    const [map, setMap] = useState(null)
    const [view, setView] = useState(null)
    const [incidentData, setIncidentData] = useState(null)

    return (
        <MapContext.Provider value={{map, setMap, view, setView, incidentData, setIncidentData}}>
            {children}
        </MapContext.Provider>
        
    )
}

export {MapContext, MapContextProvider}