import React, {createContext, useState} from 'react'

const MapContext = createContext()

const MapContextProvider = ({children}) => {
    const [map, setMap] = useState(null)
    const [view, setView] = useState(null)

    return (
        <MapContext.Provider value={{map, setMap, view, setView}}>
            {children}
        </MapContext.Provider>
        
    )
}

export {MapContext, MapContextProvider}