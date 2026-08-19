import Point from "@arcgis/core/geometry/Point";
import Polygon from "@arcgis/core/geometry/Polygon";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import { AADT_VIZ_STOPS } from "@/lib/data-query-app/countSurveyVisualization";
import { VolumeAadtPeriodRow } from "@/lib/data-services/VolumeSitesApiService";
import {
  crossTabKey,
  listJurisdictionPlaces,
  NamedCount,
  StackedChartData,
} from "@/lib/data-query-app/safetyIncidentStats";
import { VolumeSite } from "@/lib/volume-app/siteTemporalQuery";

export type { NamedCount };

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export interface CountSurveyRoadUserSummary {
  totalSites: number;
  bikeOnly: number;
  pedOnly: number;
  both: number;
  neither: number;
}

export interface FilteredCountSurveyStats {
  roadUser: CountSurveyRoadUserSummary;
  totalSurveyPeriods: number;
  byYear: NamedCount[];
  byMonth: NamedCount[];
  byDayType: NamedCount[];
  bySource: NamedCount[];
  byJurisdiction: NamedCount[];
  aadtThresholdsBike: NamedCount[];
  aadtThresholdsPed: NamedCount[];
  crossTabs: Record<string, StackedChartData>;
  truncated: boolean;
  periodCount: number;
}

export const EMPTY_COUNT_SURVEY_STATS: FilteredCountSurveyStats = {
  roadUser: {
    totalSites: 0,
    bikeOnly: 0,
    pedOnly: 0,
    both: 0,
    neither: 0,
  },
  totalSurveyPeriods: 0,
  byYear: [],
  byMonth: [],
  byDayType: [],
  bySource: [],
  byJurisdiction: [],
  aadtThresholdsBike: [],
  aadtThresholdsPed: [],
  crossTabs: {},
  truncated: false,
  periodCount: 0,
};

const DAY_TYPE_ORDER = [
  "Weekday & weekend",
  "Weekday only",
  "Weekend only",
  "All-days (no split)",
];

const ROAD_USER_PERIOD_ORDER = ["Bicyclist", "Pedestrian", "Unknown"];

const PERIOD_CROSS_TAB_DIMS = [
  "year",
  "month",
  "dayType",
  "roadUser",
  "source",
] as const;

type PeriodCrossTabDimension =
  | (typeof PERIOD_CROSS_TAB_DIMS)[number]
  | "jurisdiction";

function bump(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) || 0) + by);
}

function mapToSortedCounts(
  map: Map<string, number>,
  order?: string[]
): NamedCount[] {
  if (order) {
    return order.map((label) => ({ label, count: map.get(label) || 0 }));
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export const AADT_THRESHOLD_LABELS = [
  `Low (<${AADT_VIZ_STOPS.mid})`,
  `Medium (${AADT_VIZ_STOPS.mid}–${AADT_VIZ_STOPS.high - 1})`,
  `High (${AADT_VIZ_STOPS.high}+)`,
] as const;

function aadtThresholdBucket(value: number): string {
  if (value < AADT_VIZ_STOPS.mid) return AADT_THRESHOLD_LABELS[0];
  if (value < AADT_VIZ_STOPS.high) return AADT_THRESHOLD_LABELS[1];
  return AADT_THRESHOLD_LABELS[2];
}

function normalizeCountType(raw: string | null | undefined): "bike" | "ped" | null {
  const t = String(raw || "").trim().toLowerCase();
  if (t === "bike" || t === "bicyclist") return "bike";
  if (t === "ped" || t === "pedestrian") return "ped";
  return null;
}

function roadUserPeriodLabel(period: VolumeAadtPeriodRow): string {
  const mode = normalizeCountType(period.count_type);
  if (mode === "bike") return "Bicyclist";
  if (mode === "ped") return "Pedestrian";
  return "Unknown";
}

function dayTypeLabel(period: VolumeAadtPeriodRow): string {
  const hasWeekday = period.weekday_aadt != null;
  const hasWeekend = period.weekend_aadt != null;
  if (hasWeekday && hasWeekend) return "Weekday & weekend";
  if (hasWeekday) return "Weekday only";
  if (hasWeekend) return "Weekend only";
  return "All-days (no split)";
}

function periodDimensionLabel(
  period: VolumeAadtPeriodRow,
  siteSource: Map<number, string>,
  siteJurisdiction: Map<number, string> | undefined,
  dimension: PeriodCrossTabDimension
): string | null {
  switch (dimension) {
    case "year":
      return period.year != null ? String(period.year) : null;
    case "month": {
      if (!period.start_date) return null;
      const d = new Date(period.start_date);
      return Number.isNaN(d.getTime()) ? null : MONTH_LABELS[d.getMonth()];
    }
    case "dayType":
      return dayTypeLabel(period);
    case "roadUser":
      return roadUserPeriodLabel(period);
    case "source":
      return siteSource.get(period.site_id) || "Unknown";
    case "jurisdiction": {
      if (!siteJurisdiction) return null;
      return siteJurisdiction.get(period.site_id) ?? null;
    }
    default:
      return null;
  }
}

function categoryOrder(
  primary: PeriodCrossTabDimension,
  categories: string[],
  matrix?: Map<string, Map<string, number>>
): string[] {
  switch (primary) {
    case "month":
      return MONTH_LABELS.filter((label) => categories.includes(label));
    case "dayType":
      return DAY_TYPE_ORDER.filter((label) => categories.includes(label));
    case "roadUser":
      return ROAD_USER_PERIOD_ORDER.filter((label) => categories.includes(label));
    case "year":
      return [...categories].sort((a, b) => a.localeCompare(b));
    case "jurisdiction":
      if (matrix) {
        return [...categories].sort((a, b) => {
          const sum = (key: string) =>
            [...(matrix.get(key)?.values() ?? [])].reduce((s, v) => s + v, 0);
          return sum(b) - sum(a) || a.localeCompare(b);
        });
      }
      return [...categories].sort((a, b) => a.localeCompare(b));
    default:
      return [...categories].sort((a, b) => a.localeCompare(b));
  }
}

function seriesOrder(
  secondary: PeriodCrossTabDimension,
  names: string[]
): string[] {
  switch (secondary) {
    case "month":
      return MONTH_LABELS.filter((label) => names.includes(label));
    case "dayType":
      return DAY_TYPE_ORDER.filter((label) => names.includes(label));
    case "roadUser":
      return ROAD_USER_PERIOD_ORDER.filter((label) => names.includes(label));
    case "year":
      return [...names].sort((a, b) => a.localeCompare(b));
    default:
      return [...names].sort((a, b) => a.localeCompare(b));
  }
}

function matrixToStacked(
  matrix: Map<string, Map<string, number>>,
  primary: PeriodCrossTabDimension,
  secondary: PeriodCrossTabDimension
): StackedChartData {
  const primaryLabels = categoryOrder(primary, [...matrix.keys()], matrix);
  const secondarySet = new Set<string>();
  for (const inner of matrix.values()) {
    for (const key of inner.keys()) secondarySet.add(key);
  }
  const secondaryLabels = seriesOrder(secondary, [...secondarySet]);

  return {
    categories: primaryLabels,
    series: secondaryLabels.map((name) => ({
      name,
      data: primaryLabels.map((cat) => matrix.get(cat)?.get(name) ?? 0),
    })),
  };
}

function buildPeriodCrossTab(
  periods: VolumeAadtPeriodRow[],
  siteSource: Map<number, string>,
  siteJurisdiction: Map<number, string> | undefined,
  primary: PeriodCrossTabDimension,
  secondary: PeriodCrossTabDimension
): StackedChartData {
  const matrix = new Map<string, Map<string, number>>();
  for (const period of periods) {
    const p = periodDimensionLabel(period, siteSource, siteJurisdiction, primary);
    const s = periodDimensionLabel(period, siteSource, siteJurisdiction, secondary);
    if (!p || !s) continue;
    if (!matrix.has(p)) matrix.set(p, new Map());
    const inner = matrix.get(p)!;
    inner.set(s, (inner.get(s) || 0) + 1);
  }
  return matrixToStacked(matrix, primary, secondary);
}

/** Cross-tab survey periods for stacked availability charts. */
export function buildCountSurveyCrossTabs(
  sites: VolumeSite[],
  periods: VolumeAadtPeriodRow[],
  siteJurisdiction?: Map<number, string>
): Record<string, StackedChartData> {
  const siteIds = new Set(sites.map((site) => site.id));
  const filteredPeriods = periods.filter((period) => siteIds.has(period.site_id));
  const siteSource = new Map(
    sites.map((site) => [site.id, site.source || "Unknown"])
  );

  const dims: PeriodCrossTabDimension[] = [...PERIOD_CROSS_TAB_DIMS];
  if (siteJurisdiction && siteJurisdiction.size > 0) {
    dims.push("jurisdiction");
  }

  const tabs: Record<string, StackedChartData> = {};
  for (const primary of dims) {
    for (const secondary of dims) {
      if (primary === secondary) continue;
      tabs[crossTabKey(primary, secondary)] = buildPeriodCrossTab(
        filteredPeriods,
        siteSource,
        siteJurisdiction,
        primary,
        secondary
      );
    }
  }
  return tabs;
}

/** Aggregate availability stats from filtered sites and AADT period rows. */
export function computeCountSurveyAvailabilityStats(
  sites: VolumeSite[],
  periods: VolumeAadtPeriodRow[],
  options?: { truncated?: boolean }
): FilteredCountSurveyStats {
  if (sites.length === 0) {
    return { ...EMPTY_COUNT_SURVEY_STATS, truncated: options?.truncated === true };
  }

  const siteIds = new Set(sites.map((s) => s.id));
  const filteredPeriods = periods.filter((p) => siteIds.has(p.site_id));

  const yearMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  const dayTypeMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();

  const siteModes = new Map<number, { bike: boolean; ped: boolean }>();
  const siteSource = new Map<number, string>();
  for (const site of sites) {
    siteModes.set(site.id, { bike: false, ped: false });
    siteSource.set(site.id, site.source || "Unknown");
  }

  const latestAadtBySiteMode = new Map<
    string,
    { aadt: number; year: number }
  >();

  for (const period of filteredPeriods) {
    if (period.year != null) {
      bump(yearMap, String(period.year));
    }

    if (period.start_date) {
      const d = new Date(period.start_date);
      if (!Number.isNaN(d.getTime())) {
        bump(monthMap, MONTH_LABELS[d.getMonth()]);
      }
    }

    const hasWeekday = period.weekday_aadt != null;
    const hasWeekend = period.weekend_aadt != null;
    if (hasWeekday && hasWeekend) {
      bump(dayTypeMap, "Weekday & weekend");
    } else if (hasWeekday) {
      bump(dayTypeMap, "Weekday only");
    } else if (hasWeekend) {
      bump(dayTypeMap, "Weekend only");
    } else {
      bump(dayTypeMap, "All-days (no split)");
    }

    const mode = normalizeCountType(period.count_type);
    const modes = siteModes.get(period.site_id);
    if (modes && mode === "bike") modes.bike = true;
    if (modes && mode === "ped") modes.ped = true;

    if (period.all_aadt != null && mode) {
      const key = `${period.site_id}|${mode}`;
      const year = period.year ?? 0;
      const prev = latestAadtBySiteMode.get(key);
      if (!prev || year >= prev.year) {
        latestAadtBySiteMode.set(key, { aadt: period.all_aadt, year });
      }
    }
  }

  for (const site of sites) {
    bump(sourceMap, siteSource.get(site.id) || "Unknown");
  }

  let bikeOnly = 0;
  let pedOnly = 0;
  let both = 0;
  let neither = 0;
  for (const modes of siteModes.values()) {
    if (modes.bike && modes.ped) both += 1;
    else if (modes.bike) bikeOnly += 1;
    else if (modes.ped) pedOnly += 1;
    else neither += 1;
  }

  const bikeThresholdMap = new Map<string, number>();
  const pedThresholdMap = new Map<string, number>();
  for (const site of sites) {
    const bikeEntry = latestAadtBySiteMode.get(`${site.id}|bike`);
    const pedEntry = latestAadtBySiteMode.get(`${site.id}|ped`);
    if (bikeEntry != null) {
      bump(bikeThresholdMap, aadtThresholdBucket(bikeEntry.aadt));
    }
    if (pedEntry != null) {
      bump(pedThresholdMap, aadtThresholdBucket(pedEntry.aadt));
    }
  }

  return {
    roadUser: {
      totalSites: sites.length,
      bikeOnly,
      pedOnly,
      both,
      neither,
    },
    totalSurveyPeriods: filteredPeriods.length,
    byYear: mapToSortedCounts(yearMap).sort((a, b) =>
      a.label.localeCompare(b.label)
    ),
    byMonth: mapToSortedCounts(monthMap, [...MONTH_LABELS]),
    byDayType: mapToSortedCounts(dayTypeMap, [
      "Weekday & weekend",
      "Weekday only",
      "Weekend only",
      "All-days (no split)",
    ]),
    bySource: mapToSortedCounts(sourceMap),
    byJurisdiction: [],
    aadtThresholdsBike: mapToSortedCounts(
      bikeThresholdMap,
      [...AADT_THRESHOLD_LABELS]
    ),
    aadtThresholdsPed: mapToSortedCounts(
      pedThresholdMap,
      [...AADT_THRESHOLD_LABELS]
    ),
    crossTabs: buildCountSurveyCrossTabs(sites, filteredPeriods),
    truncated: options?.truncated === true,
    periodCount: filteredPeriods.length,
  };
}

export interface CountSiteJurisdictionBreakdown {
  byJurisdiction: NamedCount[];
  siteJurisdiction: Map<number, string>;
}

/** Count sites per place and assign each site to its first matching polygon. */
export async function computeCountSiteJurisdictionBreakdown(
  sites: VolumeSite[],
  level: "city" | "service-area"
): Promise<CountSiteJurisdictionBreakdown> {
  const places = await listJurisdictionPlaces(level);
  const rows: NamedCount[] = [];
  const siteJurisdiction = new Map<number, string>();

  for (const site of sites) {
    if (site.lon == null || site.lat == null) continue;
    const point = new Point({
      longitude: site.lon,
      latitude: site.lat,
      spatialReference: { wkid: 4326 },
    });
    for (const place of places) {
      if (
        geometryEngine.contains(place.geometry, point) ||
        geometryEngine.intersects(place.geometry, point)
      ) {
        if (!siteJurisdiction.has(site.id)) {
          siteJurisdiction.set(site.id, place.name);
        }
      }
    }
  }

  for (const place of places) {
    let count = 0;
    for (const site of sites) {
      if (site.lon == null || site.lat == null) continue;
      const point = new Point({
        longitude: site.lon,
        latitude: site.lat,
        spatialReference: { wkid: 4326 },
      });
      if (
        geometryEngine.contains(place.geometry, point) ||
        geometryEngine.intersects(place.geometry, point)
      ) {
        count += 1;
      }
    }
    rows.push({ label: place.name, count });
  }

  return {
    byJurisdiction: rows.sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label)
    ),
    siteJurisdiction,
  };
}
