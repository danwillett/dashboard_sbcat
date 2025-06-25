import React, { ReactNode, createContext, useContext, useState } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";

type SafetyMapContextType = {
  mapRef: Map | null;
  setMapRef: React.Dispatch<React.SetStateAction<Map | null>>;

  viewRef: MapView | null;
  setViewRef: React.Dispatch<React.SetStateAction<MapView | null>>;

};
const SafetyMapContext = createContext<SafetyMapContextType | undefined>(undefined);

interface MapProviderProps {
  children: ReactNode;
}

export default function SafetyProvider({ children }: MapProviderProps) {
  // map components
  const [mapRef, setMapRef] = useState<Map | null>(null);
  const [viewRef, setViewRef] = useState<MapView | null>(null);

  // data layers
  

  return (
    <SafetyMapContext.Provider
      value={{
        mapRef,
        setMapRef,
        viewRef,
        setViewRef,
        
      }}
    >
      {children}
    </SafetyMapContext.Provider>
  );
}

export const useMapContext = () => {
  const context = useContext(SafetyMapContext);
  if (!context) {
    throw new Error("useMapContext must be used within a LayerProvider");
  }

  return context;
};
