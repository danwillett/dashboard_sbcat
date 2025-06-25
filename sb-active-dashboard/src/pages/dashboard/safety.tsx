import React, { Suspense, lazy } from "react";

// Lazy-load the SafetyMap component
const SafetyMap = lazy(() => import("../../../ui/safety-app/SafetyMapOld"));

export default function Safety() {
  return (
    <Suspense fallback={<div>Loading safety map...</div>}>
      {/* <SafetyMap /> */}
    </Suspense>
  );
}
