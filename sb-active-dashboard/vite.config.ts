// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useLocalApi = env.VITE_USE_LOCAL_API === "true";
  const apiTarget = useLocalApi
    ? env.VITE_LOCAL_API_URL || "http://localhost:7071"
    : "https://func-sbcat-manager.azurewebsites.net";

  return {
    server: {
      port: 3000,
      proxy: {
        // Avoid browser CORS on localhost by proxying Azure Functions + pg_featureserv / pg_tileserv
        "/sbcat-api": {
          target: apiTarget,
          changeOrigin: true,
          secure: !useLocalApi,
          rewrite: (p) => p.replace(/^\/sbcat-api/, "/api"),
        },
        "/sbcat-features": {
          target:
            "https://ca-sbcat-featureserv.happyglacier-722a1c53.westus2.azurecontainerapps.io",
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/sbcat-features/, ""),
        },
        "/sbcat-tiles": {
          target:
            "https://ca-sbcat-tileserv.happyglacier-722a1c53.westus2.azurecontainerapps.io",
          changeOrigin: true,
          secure: true,
          // Longer timeouts — ArcGIS requests many MVT tiles in parallel
          timeout: 120_000,
          proxyTimeout: 120_000,
          rewrite: (p) => p.replace(/^\/sbcat-tiles/, ""),
        },
      },
    },

    build: {
      rollupOptions: {
        // Note: Removed external @arcgis/lumina for production deployment
      },
    },

    optimizeDeps: {
      // skip heavy ArcGIS deps so esbuild doesn't choke
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

    css: {
      postcss: {
        plugins: [tailwindcss, autoprefixer],
      },
    },

    plugins: [
      // Emotion needs two extra options for the React plugin
      react({
        jsxImportSource: "@emotion/react",
        babel: { plugins: ["@emotion/babel-plugin"] },
      }),
    ],
  };
});
