import React, { Suspense, lazy } from "react";

const ExploreMap = lazy(() => import("../../../ui/explore-app/ExploreMap"));
import ExploreProvider from "@/lib/context/ExploreMapContext";

export default function ExplorePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExploreProvider>
        <ExploreMap />
      </ExploreProvider>
    </Suspense>
  );
}
