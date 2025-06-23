import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      external: ["@arcgis/lumina"]
    }
  },
  optimizeDeps: {
    exclude: [
      "@arcgis/core",
      "@arcgis/map-components",
      "@arcgis/map-components-react",
      "@arcgis/lumina"
    ]
  },
  resolve: {
    alias: {
      "@/app": path.resolve(__dirname, "."),
      "@": path.resolve(__dirname, "."),
    }
  },
  plugins: [react()]
});
