import React, { Suspense, lazy } from "react";
import { Box } from "@mui/material";
import Header from "@/ui/dashboard/Header";
import LayerProvider from "@/lib/context/MapContext";
import LoadingSpinner from "@/ui/components/LoadingSpinner";

const InfrastructureEquityApp = lazy(
  () => import("@/ui/infrastructure-equity-app/InfrastructureEquityApp")
);

const headerApps = [
  { name: "Home", link: "/" },
  { name: "About", link: "/about" },
  { name: "Contact", link: "/contact" },
];

function InfrastructureEquityLoadingFallback() {
  return (
    <div
      id="infrastructure-equity-loading-container"
      className="flex h-full flex-1 items-center justify-center bg-white"
    >
      <LoadingSpinner
        message="Loading Infrastructure Equity..."
        size="large"
        className="flex-col"
      />
    </div>
  );
}

export default function InfrastructureEquityPage() {
  return (
    <Box
      id="infrastructure-equity-page"
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Header apps={headerApps} />
      <Box
        id="infrastructure-equity-page-content"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <LayerProvider>
          <Suspense fallback={<InfrastructureEquityLoadingFallback />}>
            <InfrastructureEquityApp />
          </Suspense>
        </LayerProvider>
      </Box>
    </Box>
  );
}
