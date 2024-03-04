import React, {createContext, useState} from 'react'

const FilterContext = createContext()

const FilterContextProvider = ({children}) => {
    const [safetyMode, setSafetyMode] = useState("both")
    const [volumeMode, setVolumeMode] = useState("bikes")
    const [safetyBikes, setSafetyBikes] = useState(true)
    const [safetyPeds, setSafetyPeds] = useState(false)
    const [volumeBikes, setVolumeBikes] = useState(true)
    const [volumePeds, setVolumePeds] = useState(false)
    const [volumeWeekday, setVolumeWeekday] = useState(true)
    const [volumeWeekend, setVolumeWeekend] = useState(true)
    const [safetyWeekday, setSafetyWeekday] = useState(true)
    const [safetyWeekend, setSafetyWeekend] = useState(true)
    const [safetyYearChoices, setSafetyYearChoices] = useState([])
    const [volumeYearChoices, setVolumeYearChoices] = useState([])
    const [collision, setCollision] = useState(true)
    const [nearCollision, setNearCollision] = useState(true)
    const [fall, setFall] = useState(true)
    // const [safetyYearChoices, setSafetyYearChoices] = useState([])
    // const [volumeYearChoices, setVolumeYearChoices] = useState([])

    const contextValue = {
        safetyMode,
        setSafetyMode,
        volumeMode,
        setVolumeMode,
        safetyBikes,
        setSafetyBikes,
        safetyPeds,
        setSafetyPeds,
        volumeBikes,
        setVolumeBikes,
        volumePeds,
        setVolumePeds,
        volumeWeekday,
        setVolumeWeekday,
        volumeWeekend,
        setVolumeWeekend,
        safetyYearChoices,
        setSafetyYearChoices,
        volumeYearChoices,
        setVolumeYearChoices,
        safetyWeekday, 
        setSafetyWeekday, 
        safetyWeekend, 
        setSafetyWeekend,
        collision,
        setCollision,
        nearCollision,
        setNearCollision,
        fall,
        setFall
        
      };
    return (
        <FilterContext.Provider value={contextValue}>
            {children}
        </FilterContext.Provider>
        
    )
}

export {FilterContext, FilterContextProvider}