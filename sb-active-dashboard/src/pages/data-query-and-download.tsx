import React, { Suspense, lazy } from "react";
import { Box } from "@mui/material";
import Header from "@/ui/dashboard/Header";
import LayerProvider from "@/lib/context/MapContext";
import LoadingSpinner from "@/ui/components/LoadingSpinner";

const DataQueryApp = lazy(() => import("@/ui/data-query-app/DataQueryApp"));

const headerApps = [
  { name: "Home", link: "/" },
  { name: "About", link: "/about" },
  { name: "Contact", link: "/contact" },
];

function DataQueryLoadingFallback() {
  return (
    <div
      id="data-query-loading-container"
      className="flex h-full flex-1 items-center justify-center bg-white"
    >
      <LoadingSpinner
        message="Loading Data Query and Download..."
        size="large"
        className="flex-col"
      />
    </div>
  );
}

export default function DataQueryAndDownloadPage() {
  return (
    <Box
      id="data-query-page"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Header apps={headerApps} />
      <Box id="data-query-page-content" sx={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        <LayerProvider>
          <Suspense fallback={<DataQueryLoadingFallback />}>
            <DataQueryApp />
          </Suspense>
        </LayerProvider>
      </Box>
    </Box>
  );
}
