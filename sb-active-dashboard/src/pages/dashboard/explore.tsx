import React, { Suspense, lazy } from "react";

const ExploreMap = lazy(() => import("../../../ui/explore-app/ExploreMap"));

export default function ExplorePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExploreMap />
    </Suspense>
  );
}
