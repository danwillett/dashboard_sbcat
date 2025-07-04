import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // or remove if not using
import "@arcgis/core/assets/esri/themes/light/main.css";
import "@esri/calcite-components/dist/calcite/calcite.css";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import { defineCustomElements as defineMapComponents } from "@arcgis/map-components/dist/loader";

defineCustomElements(window);
// Load ArcGIS Map Web Components
defineMapComponents(window);


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
