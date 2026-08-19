import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Point from "@arcgis/core/geometry/Point";
import Polygon from "@arcgis/core/geometry/Polygon";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import { VolumeSite } from "@/lib/volume-app/siteTemporalQuery";
import { CountSurveyGeographicFilter } from "@/lib/data-query-app/countSurveyFilters";

const CITIES_SERVICE_AREAS_URL =
  "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/sb_cities_service_areas_multi_layer/FeatureServer/1";

const geometryCache = new Map<string, Polygon | null>();

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Fetch a city / service-area polygon by name (no map layer added).
 * Results are cached for the session.
 */
export async function fetchPlaceBoundaryGeometry(
  placeName: string
): Promise<Polygon | null> {
  const key = placeName.trim().toLowerCase();
  if (!key) return null;
  if (geometryCache.has(key)) {
    return geometryCache.get(key) || null;
  }

  const layer = new FeatureLayer({
    url: CITIES_SERVICE_AREAS_URL,
    outFields: ["name", "fid"],
  });
  await layer.load();

  const query = layer.createQuery();
  query.where = `LOWER(name) = '${escapeSqlLiteral(key)}'`;
  query.returnGeometry = true;
  query.outFields = ["name", "fid"];
  query.outSpatialReference = { wkid: 4326 };
  query.num = 1;

  const result = await layer.queryFeatures(query);
  const geometry = (result.features[0]?.geometry as Polygon | undefined) || null;
  geometryCache.set(key, geometry);
  return geometry;
}

/**
 * Keep sites that fall inside the selected place polygon.
 * County level returns sites unchanged (dataset is already county-scoped).
 */
export async function filterSitesByGeographicSelection(
  sites: VolumeSite[],
  geographic: CountSurveyGeographicFilter
): Promise<VolumeSite[]> {
  if (geographic.level === "county" || !geographic.placeName) {
    return sites;
  }

  const boundary = await fetchPlaceBoundaryGeometry(geographic.placeName);
  if (!boundary) {
    throw new Error(`Could not load boundary for "${geographic.placeName}"`);
  }

  return sites.filter((site) => {
    if (site.lon == null || site.lat == null) return false;
    const point = new Point({
      longitude: site.lon,
      latitude: site.lat,
      spatialReference: { wkid: 4326 },
    });
    return (
      geometryEngine.contains(boundary, point) ||
      geometryEngine.intersects(boundary, point)
    );
  });
}
