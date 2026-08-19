import {
  buildSeriesQueryParams,
  buildSitesQueryParams,
  siteMatchesYearFallback,
  VolumeSite,
  VolumeSiteQueryFilters,
  VolumeSiteSeriesOptions,
  VolumeSiteSeriesResponse,
  VolumeSitesResponse,
} from "../volume-app/siteTemporalQuery";

const API_BASE = import.meta.env.VITE_SBCAT_API_URL || "/sbcat-api";
const FEATURES_BASE = import.meta.env.VITE_SBCAT_FEATURES_URL || "/sbcat-features";

interface GeoJsonFeature {
  id?: number | string;
  geometry?: { type: string; coordinates?: number[] };
  properties?: {
    id?: number;
    name?: string;
    source?: string;
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text().catch(() => "");
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const apiError = parsed?.error || text.slice(0, 240);
    throw new Error(apiError || `Request failed ${response.status}`);
  }
  return parsed as T;
}

async function fetchFeatureServSites(): Promise<VolumeSite[]> {
  const sites: VolumeSite[] = [];
  let url: string | null =
    `${FEATURES_BASE}/collections/count_surveys.dashboard_sites/items?f=json&limit=1000`;

  while (url) {
    const payload = await fetchJson<{
      features?: GeoJsonFeature[];
      links?: Array<{ rel?: string; href?: string }>;
    }>(url);

    for (const feature of payload.features || []) {
      const coords = feature.geometry?.coordinates;
      const id = Number(feature.properties?.id ?? feature.id);
      if (!Number.isFinite(id) || !coords || coords.length < 2) continue;
      sites.push({
        id,
        name: feature.properties?.name || `Site ${id}`,
        source: feature.properties?.source || "unknown",
        lon: coords[0],
        lat: coords[1],
        first_data: null,
        last_data: null,
      });
    }

    const next = payload.links?.find((link) => link.rel === "next");
    url = next?.href ? next.href.replace(/^https?:\/\/[^/]+/, FEATURES_BASE) : null;
  }

  return sites;
}

function mergeGeometry(apiSites: VolumeSite[], geoSites: VolumeSite[]): VolumeSite[] {
  if (apiSites.length === 0) return geoSites;
  const byId = new Map(geoSites.map((site) => [site.id, site]));
  return apiSites.map((site) => {
    if (site.lon != null && site.lat != null) return site;
    const geo = byId.get(site.id);
    return geo ? { ...site, lon: geo.lon, lat: geo.lat } : site;
  }).filter((site) => site.lon != null && site.lat != null);
}

export async function fetchVolumeSurveySites(
  filters: VolumeSiteQueryFilters
): Promise<{ sites: VolumeSite[]; availableYears: number[]; fromApi: boolean }> {
  const query = buildSitesQueryParams(filters);
  let apiResponse: VolumeSitesResponse | null = null;
  let apiError: unknown = null;

  try {
    apiResponse = await fetchJson<VolumeSitesResponse>(`${API_BASE}/volumes/sites?${query.toString()}`);
  } catch (error) {
    apiError = error;
  }

  let geoSites: VolumeSite[] = [];
  const needsGeometry = !apiResponse?.sites?.some((site) => site.lon != null && site.lat != null);
  if (needsGeometry) {
    try {
      geoSites = await fetchFeatureServSites();
    } catch (error) {
      if (!apiResponse) {
        throw (apiError || error);
      }
    }
  }

  if (!apiResponse) {
    return {
      sites: geoSites,
      availableYears: [],
      fromApi: false,
    };
  }

  let sites = mergeGeometry(apiResponse.sites || [], geoSites);
  if (!apiResponse.filters_applied && filters.years.length > 0) {
    sites = sites.filter((site) => siteMatchesYearFallback(site, filters.years));
  }

  return {
    sites,
    availableYears: apiResponse.available_years || [],
    fromApi: true,
  };
}

export async function fetchVolumeSiteSeries(
  siteId: number,
  filters: VolumeSiteQueryFilters,
  options?: VolumeSiteSeriesOptions
): Promise<VolumeSiteSeriesResponse> {
  const query = buildSeriesQueryParams(filters, options);
  return fetchJson<VolumeSiteSeriesResponse>(
    `${API_BASE}/volumes/sites/${siteId}/series?${query.toString()}`
  );
}

export interface VolumeSiteAadtPeriod {
  year: number | null;
  start_date: string | null;
  end_date: string | null;
  count_type: string | null;
  subset: string | null;
  all_aadt: number | null;
  weekday_aadt: number | null;
  weekend_aadt: number | null;
}

export interface VolumeSiteAadtResponse {
  site_id: number;
  name: string;
  source: string;
  periods: VolumeSiteAadtPeriod[];
  total: number;
}

/** AADT / survey-period rows for a site from count_surveys.all_aadt. */
export async function fetchVolumeSiteAadt(
  siteId: number
): Promise<VolumeSiteAadtResponse> {
  return fetchJson<VolumeSiteAadtResponse>(
    `${API_BASE}/volumes/sites/${siteId}/aadt`
  );
}

export interface VolumeAadtBySiteValue {
  site_id: number;
  count_type: string;
  year: number | null;
  all_aadt: number;
}

/** Preferred-year AADT per site/mode for map visualization styling. */
export async function fetchVolumeAadtBySite(options: {
  years?: number[];
  countTypes?: string[];
  siteIds?: number[];
}): Promise<VolumeAadtBySiteValue[]> {
  const params = new URLSearchParams();
  if (options.years && options.years.length > 0) {
    params.set("years", options.years.join(","));
  }
  if (options.countTypes && options.countTypes.length > 0) {
    params.set("count_types", options.countTypes.join(","));
  }
  if (options.siteIds && options.siteIds.length > 0) {
    params.set("site_ids", options.siteIds.join(","));
  }
  const qs = params.toString();
  const payload = await fetchJson<{ values: VolumeAadtBySiteValue[] }>(
    `${API_BASE}/volumes/aadt-by-site${qs ? `?${qs}` : ""}`
  );
  return payload.values || [];
}

export interface VolumeAadtPeriodRow {
  site_id: number;
  year: number | null;
  start_date: string | null;
  end_date: string | null;
  count_type: string;
  all_aadt: number | null;
  weekday_aadt: number | null;
  weekend_aadt: number | null;
  source: string | null;
}

/** Bulk AADT survey periods for filtered sites (availability stats). */
export async function fetchVolumeAadtPeriods(
  filters: VolumeSiteQueryFilters,
  siteIds: number[],
  options?: { limit?: number }
): Promise<{ periods: VolumeAadtPeriodRow[]; truncated: boolean }> {
  const params = buildSitesQueryParams(filters);
  if (siteIds.length > 0) {
    params.set("site_ids", siteIds.join(","));
  }
  if (options?.limit != null) {
    params.set("limit", String(options.limit));
  }
  const payload = await fetchJson<{
    periods: VolumeAadtPeriodRow[];
    truncated?: boolean;
  }>(`${API_BASE}/volumes/aadt-periods?${params.toString()}`);
  return {
    periods: payload.periods || [],
    truncated: payload.truncated === true,
  };
}
