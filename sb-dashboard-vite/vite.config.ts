// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      // keep Lumina out of the production bundle
      external: ["@arcgis/lumina"],
    },
  },

  optimizeDeps: {
    // skip heavy ArcGIS deps so esbuild doesn’t choke
    exclude: [
      "@arcgis/core",
      "@arcgis/map-components",
      "@arcgis/map-components-react",
      "@arcgis/lumina",
    ],
    // Force-bundle MUI & Grid so they resolve once
    include: ["@mui/material", "@mui/material/Grid2"],
  },

  resolve: {
    alias: [
      // most-specific alias first (grabs "@/app/…")
      { find: /^@\/app/, replacement: path.resolve(__dirname, ".") },
      // generic @ maps to project root
      { find: "@", replacement: path.resolve(__dirname, ".") },
    ],
  },

  plugins: [
    // Emotion needs two extra options for the React plugin
    react({
      jsxImportSource: "@emotion/react",            // 👈 tells React 17/18 JSX to use Emotion’s jsx
      babel: { plugins: ["@emotion/babel-plugin"] }, // 👈 enables css prop & component selectors
    }),                                             // docs :contentReference[oaicite:0]{index=0}
  ],
});
