import React, { ReactNode, createContext, useContext, useState } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

type SafetyMapContextType = {
  mapRef: Map | null;
  setMapRef: React.Dispatch<React.SetStateAction<Map | null>>;

  viewRef: MapView | null;
  setViewRef: React.Dispatch<React.SetStateAction<MapView | null>>;

  citiesLayer: FeatureLayer | null;
  setCitiesLayer: React.Dispatch<React.SetStateAction<FeatureLayer | null>>;

};
const SafetyMapContext = createContext<SafetyMapContextType | undefined>(undefined);

interface MapProviderProps {
  children: ReactNode;
}

export default function SafetyProvider({ children }: MapProviderProps) {
  // map components
  const [mapRef, setMapRef] = useState<Map | null>(null);
  const [viewRef, setViewRef] = useState<MapView | null>(null);
  const [citiesLayer, setCitiesLayer] = useState<FeatureLayer | null>(null)

  // data layers
  
  return (
    <SafetyMapContext.Provider
      value={{
        mapRef,
        setMapRef,
        viewRef,
        setViewRef,
        citiesLayer,
        setCitiesLayer
        
      }}
    >
      {children}
    </SafetyMapContext.Provider>
  );
}

export const useSafetyMapContext = () => {
  const context = useContext(SafetyMapContext);
  if (!context) {
    throw new Error("useSafetyMapContext must be used within a SafetyProvider");
  }

  return context;
};
