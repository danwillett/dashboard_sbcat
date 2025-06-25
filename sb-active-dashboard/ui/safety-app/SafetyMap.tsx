import React, { useRef, useState, useEffect } from "react";
import "@esri/calcite-components";
import "@arcgis/map-components/dist/components/arcgis-map";
import "@arcgis/map-components/dist/components/arcgis-legend";
import "@arcgis/map-components/dist/components/arcgis-layer-list";
import "@arcgis/map-components/dist/components/arcgis-time-slider";
import "@arcgis/map-components/dist/components/arcgis-print";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import LayerList from "@arcgis/core/widgets/LayerList";
import TimeInterval from "@arcgis/core/time/TimeInterval";
import Legend from "@arcgis/core/widgets/Legend";
import TimeSlider from "@arcgis/core/widgets/TimeSlider";
import Print from "@arcgis/core/widgets/Print";

import { ArcgisMap } from "@arcgis/map-components-react";
import { CssBaseline, Box, Popover, Typography, Toolbar } from "@mui/material";

import { setAssetPath as setCalciteComponentsAssetPath } from "@esri/calcite-components/dist/components";
setCalciteComponentsAssetPath(
  "https://js.arcgis.com/calcite-components/2.13.2/assets"
);

export default function SafetyMap() {

    
    const assignMap = (event: any) => {
        setMapElRef(event.target);
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
            component="main"
            sx={{
            position: "block",
            zIndex: 1100,
            height: "100%",
            width: `calc(100vw - ${leftMenuOpen ? leftMenuWidth : 0}px`,// - ${rightMenuOpen ? rightMenuWidth : 0}px )`, //
            transition: "width 0.5s ease-in-out, margin 0.5s ease-in-out",
            // marginRight: rightMenuOpen ? `${rightMenuWidth}px` : "0px",
            marginLeft: leftMenuOpen ? `${leftMenuWidth}px` : "0px",
            }}
        >
        <ArcgisMap
            basemap="topo-vector"
            // itemId="d5dda743788a4b0688fe48f43ae7beb9"
            onArcgisViewReadyChange={assignMap}
        ></ArcgisMap>
        </Box>

    )
}