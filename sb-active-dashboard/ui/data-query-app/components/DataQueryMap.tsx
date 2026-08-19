import { useEffect, useRef, useState } from "react";
import { Box as MuiBox } from "@mui/material";
import { ArcgisMap } from "@arcgis/map-components-react";

interface DataQueryMapProps {
  onMapViewReady?: (mapView: __esri.MapView) => void;
}

export default function DataQueryMap({ onMapViewReady }: DataQueryMapProps) {
  const mapViewRef = useRef<__esri.MapView | null>(null);
  const [viewReady, setViewReady] = useState(false);

  useEffect(() => {
    if (!viewReady || !mapViewRef.current) return;

    mapViewRef.current.goTo({
      center: [-120, 34.7],
      zoom: 9,
    }).catch(() => {
      // Ignore goTo interruptions from later view updates
    });
  }, [viewReady]);

  const handleArcgisViewReadyChange = (event: CustomEvent) => {
    const view = (event.target as any)?.view as __esri.MapView | undefined;
    if (!view) return;

    mapViewRef.current = view;
    setViewReady(true);
    onMapViewReady?.(view);
  };

  return (
    <MuiBox
      id="data-query-map"
      sx={{
        position: "relative",
        height: "100%",
        width: "100%",
        background: "#fff",
      }}
    >
      <ArcgisMap
        basemap="topo-vector"
        onArcgisViewReadyChange={handleArcgisViewReadyChange}
      />
    </MuiBox>
  );
}
