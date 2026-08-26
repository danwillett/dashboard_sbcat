import Polygon from "@arcgis/core/geometry/Polygon";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { listJurisdictionPlaces } from "@/lib/data-query-app/safetyIncidentStats";

const SANTA_BARBARA_COUNTY_LAYER_URL =
  "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/sb_county_multi_layer/FeatureServer/1";

let cachedSantaBarbaraCountyGeometry: Polygon | null = null;

export type EquityGeographicLevel = "county" | "city" | "service-area";

export interface EquityGeographicFilter {
  level: EquityGeographicLevel;
  /** City or service-area name; ignored for county. */
  placeName: string | null;
}

export function createDefaultEquityGeographicFilter(): EquityGeographicFilter {
  return { level: "county", placeName: null };
}

export function describeEquityGeographic(filter: EquityGeographicFilter): string {
  switch (filter.level) {
    case "county":
      return "Santa Barbara County";
    case "city":
      return filter.placeName
        ? `City of ${filter.placeName}`
        : "Selected city";
    case "service-area":
      return filter.placeName
        ? `${filter.placeName} service area`
        : "Selected service area";
  }
}

export function describeEquityGeographicBoundariesLabel(
  filter: EquityGeographicFilter
): string {
  return `${describeEquityGeographic(filter)} Boundaries`;
}

export async function resolveEquityBoundaryGeometry(
  filter: EquityGeographicFilter
): Promise<Polygon | null> {
  if (filter.level === "county") return null;
  if (!filter.placeName) return null;

  const places = await listJurisdictionPlaces(filter.level);
  const match = places.find((place) => place.name === filter.placeName);
  return match?.geometry ?? null;
}

export async function resolveSantaBarbaraCountyGeometry(): Promise<Polygon | null> {
  if (cachedSantaBarbaraCountyGeometry) {
    return cachedSantaBarbaraCountyGeometry;
  }

  const countyLayer = new FeatureLayer({
    url: SANTA_BARBARA_COUNTY_LAYER_URL,
    outFields: ["NAME"],
  });
  await countyLayer.load();

  const query = countyLayer.createQuery();
  query.where = "NAME = 'Santa Barbara'";
  query.returnGeometry = true;
  query.maxAllowableOffset = 0;

  const result = await countyLayer.queryFeatures(query);
  const geometry = result.features[0]?.geometry as Polygon | undefined;
  if (geometry) {
    cachedSantaBarbaraCountyGeometry = geometry;
  }

  return geometry ?? null;
}

/** Boundary polygon for map preview and zoom (includes full county). */
export async function resolveEquityPreviewExtentGeometry(
  filter: EquityGeographicFilter
): Promise<Polygon | null> {
  if (filter.level === "county") {
    return resolveSantaBarbaraCountyGeometry();
  }

  return resolveEquityBoundaryGeometry(filter);
}

export async function listEquityJurisdictionPlaceNames(
  level: "city" | "service-area"
): Promise<string[]> {
  const places = await listJurisdictionPlaces(level);
  return places.map((place) => place.name);
}
