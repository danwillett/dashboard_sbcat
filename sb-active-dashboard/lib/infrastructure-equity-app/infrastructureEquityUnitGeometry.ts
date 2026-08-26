import Polygon from "@arcgis/core/geometry/Polygon";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import * as projection from "@arcgis/core/geometry/projection";

/** Minimum share of a unit polygon that must fall inside the extent boundary. */
export const EQUITY_UNIT_MAJORITY_AREA_THRESHOLD = 0.5;

export interface PreparedEquityUnitGeometry {
  analysisGeometry: Polygon;
  displayGeometry: Polygon;
}

async function projectPolygonToSpatialReference(
  polygon: Polygon,
  targetSpatialReference: __esri.SpatialReference
): Promise<Polygon> {
  if (polygon.spatialReference?.wkid === targetSpatialReference.wkid) {
    return polygon;
  }

  await projection.load();
  return projection.project(polygon, targetSpatialReference) as Polygon;
}

function polygonGeodesicAreaSquareMeters(polygon: Polygon): number {
  return Math.abs(geometryEngine.geodesicArea(polygon, "square-meters"));
}

/**
 * When a geographic boundary is active, keep only units whose majority area falls
 * inside the boundary and clip geometry for analysis/display. Without a
 * boundary, the full unit polygon is used.
 */
export async function prepareEquityUnitGeometry(
  featureGeometry: __esri.Geometry,
  boundaryGeometry: Polygon | null,
  threshold = EQUITY_UNIT_MAJORITY_AREA_THRESHOLD
): Promise<PreparedEquityUnitGeometry | null> {
  if (featureGeometry.type !== "polygon") return null;

  let featurePolygon = featureGeometry as Polygon;

  if (!boundaryGeometry) {
    return {
      analysisGeometry: featurePolygon,
      displayGeometry: featurePolygon,
    };
  }

  featurePolygon = await projectPolygonToSpatialReference(
    featurePolygon,
    boundaryGeometry.spatialReference
  );

  const intersection = geometryEngine.intersect(
    featurePolygon,
    boundaryGeometry
  ) as Polygon | null;

  if (!intersection || intersection.type !== "polygon") {
    return null;
  }

  const featureArea = polygonGeodesicAreaSquareMeters(featurePolygon);
  const intersectArea = polygonGeodesicAreaSquareMeters(intersection);

  if (featureArea <= 0 || intersectArea <= 0) {
    return null;
  }

  if (intersectArea / featureArea < threshold) {
    return null;
  }

  return {
    analysisGeometry: intersection,
    displayGeometry: intersection,
  };
}
