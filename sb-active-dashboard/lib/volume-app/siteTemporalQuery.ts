export type TimeOfDayPeriod = "morning" | "afternoon" | "evening";
export type DayType = "weekdays" | "weekends";

export type SurveyLengthPreset = "any" | "week" | "month" | "quarter";

export const SURVEY_LENGTH_DAYS: Record<SurveyLengthPreset, number | null> = {
  any: null,
  week: 7,
  month: 30,
  quarter: 90,
};

export interface VolumeSiteQueryFilters {
  years: number[];
  weekdayFilter: {
    enabled: boolean;
    types: DayType[];
  };
  timeOfDay: {
    enabled: boolean;
    periods: TimeOfDayPeriod[];
  };
  showBicyclist: boolean;
  showPedestrian: boolean;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  /** Minimum AADT coverage length (end_date − start_date). */
  surveyLength?: SurveyLengthPreset;
}

export interface VolumeSite {
  id: number;
  name: string;
  source: string;
  lon: number | null;
  lat: number | null;
  first_data: string | null;
  last_data: string | null;
}

export interface VolumeSitesResponse {
  sites: VolumeSite[];
  total: number;
  sources: string[];
  available_years?: number[];
  filters_applied?: boolean;
}

export interface VolumeSeriesPoint {
  t: string | null;
  c: number | null;
}

export interface VolumeSeriesLine {
  count_type: string | null;
  count_subtype: string | null;
  subset: string | null;
  flow?: string | null;
  points: VolumeSeriesPoint[];
  bucketed?: boolean;
}

export interface VolumeSiteSeriesResponse {
  site_id: number;
  name: string;
  source: string;
  start: string | null;
  end: string | null;
  months: string[] | null;
  series: VolumeSeriesLine[];
  bucket?: SeriesBucket | null;
  available_buckets?: SeriesBucket[];
  aggregation?: "avg" | "sum" | null;
  aadt_period?: {
    year: number | null;
    start_date: string;
    end_date: string;
    count_type: string | null;
    coverage_days: number;
  } | null;
}

export type SeriesBucket = "15min" | "hour" | "day" | "week" | "month";

export interface VolumeSiteSeriesOptions {
  /** Prefer SUM aggregation over AVG downsampling. */
  agg?: "avg" | "sum";
  /** Derive window from most recent all_aadt period. */
  window?: "latest_aadt" | null;
  /** Keep last N daily points for long surveys (default 14). */
  targetPoints?: number;
  /** When false, only flow='all' rows are returned. Default true for Volume app. */
  byFlow?: boolean;
  countTypes?: string[];
  start?: Date | null;
  end?: Date | null;
  /** Explicit aggregation bucket (must be available for the window). */
  bucket?: SeriesBucket | null;
}

export const DEFAULT_VOLUME_SITE_FILTERS: Omit<
  VolumeSiteQueryFilters,
  "showBicyclist" | "showPedestrian" | "dateRange"
> = {
  years: [],
  weekdayFilter: { enabled: false, types: ["weekdays", "weekends"] },
  timeOfDay: { enabled: false, periods: ["morning", "afternoon", "evening"] },
  surveyLength: "any",
};

export function countTypesFromModes(showBicyclist: boolean, showPedestrian: boolean): string[] {
  const types: string[] = [];
  if (showBicyclist) types.push("bike");
  if (showPedestrian) types.push("ped");
  return types;
}

export function buildSitesQueryParams(filters: VolumeSiteQueryFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", "2000");

  const countTypes = countTypesFromModes(filters.showBicyclist, filters.showPedestrian);
  if (countTypes.length === 1) {
    params.set("count_types", countTypes[0]);
  } else if (countTypes.length === 0) {
    params.set("count_types", "__none__");
  }

  if (filters.years.length > 0) {
    params.set("years", filters.years.join(","));
  }

  if (filters.weekdayFilter.enabled) {
    const types = filters.weekdayFilter.types;
    // Send all selected day types. API treats both as require weekday_aadt AND weekend_aadt.
    if (types.length > 0) {
      params.set("day_types", types.join(","));
    }
  }

  // Time-of-day is not used for the sites list (all_aadt fast path).

  if (filters.dateRange?.startDate) {
    params.set("start", filters.dateRange.startDate.toISOString());
  }
  if (filters.dateRange?.endDate) {
    const end = new Date(filters.dateRange.endDate);
    end.setHours(23, 59, 59, 999);
    params.set("end", end.toISOString());
  }

  const minDays = SURVEY_LENGTH_DAYS[filters.surveyLength || "any"];
  if (minDays != null) {
    params.set("min_coverage_days", String(minDays));
  }

  return params;
}

export function buildSeriesQueryParams(
  filters: VolumeSiteQueryFilters,
  options?: VolumeSiteSeriesOptions
): URLSearchParams {
  const params = new URLSearchParams();
  const byFlow = options?.byFlow ?? true;
  params.set("by_flow", byFlow ? "1" : "0");
  params.set("max_points", "1500");

  if (options?.agg) {
    params.set("agg", options.agg);
  }
  if (options?.window === "latest_aadt") {
    params.set("window", "latest_aadt");
  }
  if (options?.targetPoints != null) {
    params.set("target_points", String(options.targetPoints));
  }
  if (options?.bucket) {
    params.set("bucket", options.bucket);
  }

  const countTypes =
    options?.countTypes ??
    countTypesFromModes(filters.showBicyclist, filters.showPedestrian);
  if (countTypes.length === 1) {
    params.set("count_types", countTypes[0]);
  } else if (countTypes.length === 2) {
    params.set("count_types", countTypes.join(","));
  } else if (countTypes.length === 0) {
    params.set("count_types", "__none__");
  }

  // latest_aadt window owns the date range unless explicit start/end provided
  const start = options?.start ?? (options?.window === "latest_aadt" ? null : filters.dateRange?.startDate);
  const end = options?.end ?? (options?.window === "latest_aadt" ? null : filters.dateRange?.endDate);

  if (start) {
    params.set("start", start.toISOString());
  }
  if (end) {
    const endCopy = new Date(end);
    endCopy.setHours(23, 59, 59, 999);
    params.set("end", endCopy.toISOString());
  }

  return params;
}

/** Client-side fallback when the deployed API does not yet honor temporal params. */
export function siteMatchesYearFallback(site: VolumeSite, years: number[]): boolean {
  if (years.length === 0) return true;
  if (!site.first_data && !site.last_data) return true;
  const startYear = site.first_data ? new Date(site.first_data).getFullYear() : years[0];
  const endYear = site.last_data ? new Date(site.last_data).getFullYear() : startYear;
  return years.some((year) => year >= startYear && year <= endYear);
}
