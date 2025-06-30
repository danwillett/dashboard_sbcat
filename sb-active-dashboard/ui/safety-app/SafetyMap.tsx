import React, { useRef, useState, useEffect, useCallback } from "react";
import "@esri/calcite-components";
import "@arcgis/map-components/dist/components/arcgis-map";
import "@arcgis/charts-components/components/arcgis-chart";
import "@arcgis/charts-components/components/arcgis-charts-action-bar";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { useSafetyMapContext } from "@/lib/context/SafetyMapContext";
import SafetyMenu from "./SafetyMenu";

// Import createModel from the charts-components package
import { createModel } from "@arcgis/charts-components/model";

import { ArcgisMap } from "@arcgis/map-components-react";
import { CssBaseline, Box, Popover, Typography, Toolbar } from "@mui/material";

import { setAssetPath as setCalciteComponentsAssetPath } from "@esri/calcite-components/dist/components";
setCalciteComponentsAssetPath(
  "https://js.arcgis.com/calcite-components/2.13.2/assets"
);

export default function SafetyMap() {
  // import safety global variables
  const { setMapRef, mapRef, setViewRef, viewRef } = useSafetyMapContext();
//   import layers
  const { setCitiesLayer, incidentsLayer, setIncidentsLayer, setIncidentsLayerView } = useSafetyMapContext() 

  // generate safety layers when map is loaded
  const createSafetyLayers = async () => {
    // create layers
    console.log("create layers");
    // inicident records
    setIncidentsLayer(new FeatureLayer({
      url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Hosted_Safety_Incidents/FeatureServer",
      title: "Records"
    }))
    // city boundaries
    setCitiesLayer(new FeatureLayer({
      url: "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/Incorporated_Cities/FeatureServer",
    }));
    // add layers to map
  };
  useEffect(() => {
    // ensure map is loaded
    if (mapRef === null) return;
    // create layers
    createSafetyLayers();
    
  }, [mapRef]);
  
  // adjust map view and add elements
  useEffect(() => {
    // make sure the view is loaded
    if (viewRef === null) return;

    viewRef.goTo({
      center: [-120, 34.7],
      zoom: 9,
    });
  }, [viewRef]);

  // add layers to map
  useEffect(() => {
    if (mapRef == null || incidentsLayer == null) return;

    mapRef.add(incidentsLayer)
      
  }, [mapRef, incidentsLayer])

  useEffect(() => {
    if (viewRef == null || incidentsLayer == null) return;
    const addLayers = async () => {
      const iview = await viewRef.whenLayerView(incidentsLayer)
      setIncidentsLayerView(iview)
    }
    addLayers()
  }, [viewRef, incidentsLayer])

  const assignMap = (event: any) => {
    setMapRef(event.target.map);
    setViewRef(event.target.view);
  };


  // menu rendering
  const [leftMenuOpen, setLeftMenuOpen] = useState(true);
  const leftMenuWidth = 450;
  const handleLeftMenu = () => {
    setLeftMenuOpen((prev) => !prev);
  };


  return (
    <Box
      id="app-container"
      sx={{ position: "relative", height: "calc(100vh - 70px)" }}
    >
      <CssBaseline />
      {/* <Header open={open} handleDrawerOpen={handleDrawerOpen} /> */}

      <SafetyMenu
        drawerOpen={leftMenuOpen}
        handleDrawer={handleLeftMenu}
        menuWidth={leftMenuWidth}
      />

      <Box
        component="main"
        sx={{
          position: "block",
          zIndex: 1100,
          height: "100%",
          width: `calc(100vw - ${leftMenuOpen ? leftMenuWidth : 0}px`, // - ${rightMenuOpen ? rightMenuWidth : 0}px )`, //
          transition: "width 0.5s ease-in-out, margin 0.5s ease-in-out",
          // marginRight: rightMenuOpen ? `${rightMenuWidth}px` : "0px",
          marginLeft: leftMenuOpen ? `${leftMenuWidth}px` : "0px",
        }}
      >
        <ArcgisMap
          basemap="topo-vector"
          onArcgisViewReadyChange={assignMap}
        ></ArcgisMap>

        
      </Box>
    </Box>
  );
}
