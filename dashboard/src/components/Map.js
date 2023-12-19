import React, {useEffect, useRef, useState} from "react";
import {loadModules} from 'esri-loader'
import MapForm from "./MapForm";


export default function Map() {

  const mapRef = useRef()
  const [showForm, setShowForm] = useState(false)
  const [clickedCoordinates, setClickedCoordinates] = useState(null)
  
  useEffect(()=> {
    
    const initMap = async () => {
      const [Map, MapImageLayer, MapView, Legend, LayerList, esriConfig] = await loadModules([
        'esri/Map', 
        'esri/layers/MapImageLayer', 
        'esri/views/MapView', 
        'esri/widgets/Legend',
        'esri/widgets/LayerList',
        'esri/config'
      ])
      console.log(esriConfig)

      // Create a map
      const map = new Map({
        basemap: 'streets-vector',
      });

      // Create a view
      const viewInstance = new MapView({
        map: map,
        center: [-119.7, 34.5],
        zoom: 11,
        container: mapRef.current
      });

      viewInstance.on("click", (event) => {
        // Get the clicked point's geographic coordinates
        // I want a little bloom graphic on a click
        const clickedPoint = viewInstance.toMap(event);
        const { longitude, latitude } = clickedPoint;

        setClickedCoordinates({latitude, longitude})
        setShowForm(true)
        
      });

    };


    initMap();

  }, [])

  const handleCloseForm = () => {
    setShowForm(false);
    setClickedCoordinates(null);
  };
      
  return (
    <div>
      <div ref={mapRef} style={{ height: '70vh', width: '70vw' }}></div>

      {showForm && <MapForm showForm={showForm} coordinates={clickedCoordinates} onClose={handleCloseForm} />}

    </div>
    
  )
}