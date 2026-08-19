import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Polygon from "@arcgis/core/geometry/Polygon";
import {
  normalizeIncidentSeverity,
  NormalizedSeverity,
} from "@/lib/data-query-app/safetyIncidentVisualization";
import { SafetyIncidentParty } from "@/lib/data-query-app/safetyIncidentQuery";

export interface NamedCount {
  label: string;
  count: number;
}

export interface RoadUserSummary {
  total: number;
  bicyclist: number;
  pedestrian: number;
  both: number;
  neither: number;
}

export interface StackedChartData {
  categories: string[];
  series: Array<{ name: string; data: number[] }>;
}

export interface FilteredIncidentStats {
  roadUser: RoadUserSummary;
  bySeverity: NamedCount[];
  byDataSource: NamedCount[];
  byConflictType: NamedCount[];
  byYear: NamedCount[];
  byMonth: NamedCount[];
  byTimeOfDay: NamedCount[];
  byWeekday: NamedCount[];
  byAge: NamedCount[];
  byGender: NamedCount[];
  byJurisdiction: NamedCount[];
  /** Keys like `roadUser|age` for stacked bar charts */
  crossTabs: Record<string, StackedChartData>;
  truncated: boolean;
  featureCount: number;
  incidentIds: number[];
}

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

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SEVERITY_ORDER: NormalizedSeverity[] = [
  "Fatality",
  "Severe Injury",
  "Injury",
  "No Injury",
  "Near Miss",
  "Unknown",
];

function involvedFlag(value: unknown): boolean {
  return value === 1 || value === true || value === "1" || value === "true";
}

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

function timeOfDayBucket(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Morning (5–11)";
  if (hour >= 12 && hour < 17) return "Afternoon (12–16)";
  if (hour >= 17 && hour < 21) return "Evening (17–20)";
  return "Night (21–4)";
}

function parseTimestamp(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === "number") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === "string") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function ageBucket(raw: unknown): string {
  if (raw == null || raw === "") return "Unknown";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "Unknown";
  if (n < 18) return "Under 18";
  if (n < 25) return "18–24";
  if (n < 35) return "25–34";
  if (n < 45) return "35–44";
  if (n < 55) return "45–54";
  if (n < 65) return "55–64";
  return "65+";
}

function genderLabel(raw: unknown): string {
  if (raw == null || raw === "") return "Unknown";
  const g = String(raw).trim().toLowerCase();
  if (g === "m" || g === "male") return "Male";
  if (g === "f" || g === "female") return "Female";
  if (g === "x" || g === "nonbinary" || g === "non-binary") return "Non-binary";
  return String(raw);
}

const AGE_ORDER = [
  "Under 18",
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55–64",
  "65+",
  "Unknown",
];

const ROAD_USER_ORDER = [
  "Bicyclist only",
  "Pedestrian only",
  "Both",
  "Neither / unknown",
];

export function crossTabKey(
  primary: string,
  secondary: string
): string {
  return `${primary}|${secondary}`;
}

function roadUserLabel(attrs: Record<string, unknown>): string {
  const bike = involvedFlag(attrs.bicyclist_involved);
  const ped = involvedFlag(attrs.pedestrian_involved);
  if (bike && ped) return "Both";
  if (bike) return "Bicyclist only";
  if (ped) return "Pedestrian only";
  return "Neither / unknown";
}

function incidentDimensionLabel(
  attrs: Record<string, unknown>,
  dimension: string
): string | null {
  switch (dimension) {
    case "severity":
      return normalizeIncidentSeverity(attrs.severity, attrs.data_source);
    case "dataSource":
      return attrs.data_source != null ? String(attrs.data_source) : "Unknown";
    case "conflictType":
      return attrs.conflict_type != null && String(attrs.conflict_type).trim()
        ? String(attrs.conflict_type)
        : "Unknown";
    case "roadUser":
      return roadUserLabel(attrs);
    case "year": {
      const ts = parseTimestamp(attrs.timestamp);
      return ts ? String(ts.getFullYear()) : null;
    }
    case "month": {
      const ts = parseTimestamp(attrs.timestamp);
      return ts ? MONTH_LABELS[ts.getMonth()] : null;
    }
    case "timeOfDay": {
      const ts = parseTimestamp(attrs.timestamp);
      return ts ? timeOfDayBucket(ts) : null;
    }
    case "weekday": {
      const ts = parseTimestamp(attrs.timestamp);
      return ts ? WEEKDAY_LABELS[ts.getDay()] : null;
    }
    default:
      return null;
  }
}

function categoryOrder(primary: string, categories: string[]): string[] {
  switch (primary) {
    case "severity":
      return [
        ...SEVERITY_ORDER.filter((l) => categories.includes(l)),
        ...categories.filter((c) => !SEVERITY_ORDER.includes(c as NormalizedSeverity)),
      ];
    case "roadUser":
      return ROAD_USER_ORDER.filter((l) => categories.includes(l)).concat(
        categories.filter((c) => !ROAD_USER_ORDER.includes(c))
      );
    case "month":
      return MONTH_LABELS.filter((l) => categories.includes(l));
    case "weekday":
      return WEEKDAY_LABELS.filter((l) => categories.includes(l));
    case "timeOfDay":
      return [
        "Morning (5–11)",
        "Afternoon (12–16)",
        "Evening (17–20)",
        "Night (21–4)",
      ].filter((l) => categories.includes(l));
    case "age":
      return AGE_ORDER.filter((l) => categories.includes(l));
    case "year":
      return [...categories].sort((a, b) => a.localeCompare(b));
    default:
      return [...categories].sort((a, b) => a.localeCompare(b));
  }
}

function seriesOrder(secondary: string, names: string[]): string[] {
  if (secondary === "severity") {
    return [
      ...SEVERITY_ORDER.filter((l) => names.includes(l)),
      ...names.filter((n) => !SEVERITY_ORDER.includes(n as NormalizedSeverity)),
    ];
  }
  if (secondary === "age") {
    return AGE_ORDER.filter((l) => names.includes(l));
  }
  if (secondary === "roadUser") {
    return ROAD_USER_ORDER.filter((l) => names.includes(l));
  }
  if (secondary === "month") {
    return MONTH_LABELS.filter((l) => names.includes(l));
  }
  if (secondary === "weekday") {
    return WEEKDAY_LABELS.filter((l) => names.includes(l));
  }
  if (secondary === "timeOfDay") {
    return [
      "Morning (5–11)",
      "Afternoon (12–16)",
      "Evening (17–20)",
      "Night (21–4)",
    ].filter((l) => names.includes(l));
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function matrixToStacked(
  matrix: Map<string, Map<string, number>>,
  primary: string,
  secondary: string
): StackedChartData {
  const primaryLabels = categoryOrder(primary, [...matrix.keys()]);
  const secondarySet = new Set<string>();
  for (const inner of matrix.values()) {
    for (const key of inner.keys()) secondarySet.add(key);
  }
  const secondaryLabels = seriesOrder(secondary, [...secondarySet]);

  return {
    categories: primaryLabels,
    series: secondaryLabels.map((name) => ({
      name,
      data: primaryLabels.map(
        (cat) => matrix.get(cat)?.get(name) ?? 0
      ),
    })),
  };
}

function buildIncidentCrossTab(
  incidents: Array<Record<string, unknown>>,
  primary: string,
  secondary: string
): StackedChartData {
  const matrix = new Map<string, Map<string, number>>();
  for (const attrs of incidents) {
    const p = incidentDimensionLabel(attrs, primary);
    const s = incidentDimensionLabel(attrs, secondary);
    if (!p || !s) continue;
    if (!matrix.has(p)) matrix.set(p, new Map());
    const inner = matrix.get(p)!;
    inner.set(s, (inner.get(s) || 0) + 1);
  }
  return matrixToStacked(matrix, primary, secondary);
}

function buildPartyCrossTab(
  incidentsById: Map<number, Record<string, unknown>>,
  parties: Array<{ incident_id: number; age?: unknown; gender?: unknown }>,
  primary: string,
  secondary: "age" | "gender"
): StackedChartData {
  const matrix = new Map<string, Map<string, number>>();
  for (const party of parties) {
    const incident = incidentsById.get(party.incident_id);
    if (!incident) continue;
    const p = incidentDimensionLabel(incident, primary);
    if (!p) continue;
    const s =
      secondary === "age"
        ? ageBucket(party.age)
        : genderLabel(party.gender);
    if (!matrix.has(p)) matrix.set(p, new Map());
    const inner = matrix.get(p)!;
    inner.set(s, (inner.get(s) || 0) + 1);
  }
  return matrixToStacked(matrix, primary, secondary);
}

function buildAgeGenderCrossTab(
  parties: Array<{ age?: unknown; gender?: unknown }>
): StackedChartData {
  const matrix = new Map<string, Map<string, number>>();
  for (const party of parties) {
    const p = ageBucket(party.age);
    const s = genderLabel(party.gender);
    if (!matrix.has(p)) matrix.set(p, new Map());
    const inner = matrix.get(p)!;
    inner.set(s, (inner.get(s) || 0) + 1);
  }
  return matrixToStacked(matrix, "age", "gender");
}

function buildAllCrossTabs(
  incidents: Array<Record<string, unknown>>,
  parties: Array<{ incident_id: number; age?: unknown; gender?: unknown }>
): Record<string, StackedChartData> {
  const tabs: Record<string, StackedChartData> = {};
  const incidentsById = new Map<number, Record<string, unknown>>();
  for (const attrs of incidents) {
    const id = Number(attrs.id);
    if (Number.isFinite(id)) incidentsById.set(id, attrs);
  }

  // Incident-level dimensions usable as group-by or stack-by axes.
  const incidentDims = [
    "severity",
    "roadUser",
    "dataSource",
    "conflictType",
    "year",
    "month",
    "timeOfDay",
    "weekday",
  ] as const;

  for (const primary of incidentDims) {
    for (const secondary of incidentDims) {
      if (primary === secondary) continue;
      tabs[crossTabKey(primary, secondary)] = buildIncidentCrossTab(
        incidents,
        primary,
        secondary
      );
    }
  }

  for (const primary of incidentDims) {
    tabs[crossTabKey(primary, "age")] = buildPartyCrossTab(
      incidentsById,
      parties,
      primary,
      "age"
    );
    tabs[crossTabKey(primary, "gender")] = buildPartyCrossTab(
      incidentsById,
      parties,
      primary,
      "gender"
    );
  }

  tabs[crossTabKey("age", "gender")] = buildAgeGenderCrossTab(parties);

  return tabs;
}

async function fetchPartyRecords(
  incidentLayerUrl: string,
  incidentIds: number[]
): Promise<Array<{ incident_id: number; age?: unknown; gender?: unknown }>> {
  const url = partiesLayerUrl(incidentLayerUrl);
  if (!url || incidentIds.length === 0) return [];

  const layer = new FeatureLayer({ url, outFields: ["*"] });
  const chunkSize = 200;
  const parties: Array<{
    incident_id: number;
    age?: unknown;
    gender?: unknown;
  }> = [];

  for (let i = 0; i < incidentIds.length; i += chunkSize) {
    const chunk = incidentIds.slice(i, i + chunkSize);
    const query = layer.createQuery();
    query.where = `incident_id IN (${chunk.join(",")})`;
    query.outFields = ["incident_id", "age", "gender"];
    query.returnGeometry = false;
    query.num = 2000;
    try {
      const result = await layer.queryFeatures(query);
      for (const feature of result.features) {
        const a = feature.attributes || {};
        parties.push({
          incident_id: Number(a.incident_id),
          age: a.age,
          gender: a.gender,
        });
      }
    } catch (err) {
      console.warn("Party records query failed:", err);
      break;
    }
  }
  return parties;
}

export function emptyIncidentStats(): FilteredIncidentStats {
  return {
    roadUser: {
      total: 0,
      bicyclist: 0,
      pedestrian: 0,
      both: 0,
      neither: 0,
    },
    bySeverity: SEVERITY_ORDER.map((label) => ({ label, count: 0 })),
    byDataSource: [],
    byConflictType: [],
    byYear: [],
    byMonth: MONTH_LABELS.map((label) => ({ label, count: 0 })),
    byTimeOfDay: [
      "Morning (5–11)",
      "Afternoon (12–16)",
      "Evening (17–20)",
      "Night (21–4)",
    ].map((label) => ({ label, count: 0 })),
    byWeekday: WEEKDAY_LABELS.map((label) => ({ label, count: 0 })),
    byAge: [],
    byGender: [],
    byJurisdiction: [],
    crossTabs: {},
    truncated: false,
    featureCount: 0,
    incidentIds: [],
  };
}

/**
 * Page through filtered incidents and aggregate chart-friendly breakdowns.
 */
export async function computeFilteredIncidentStats(
  layer: FeatureLayer,
  options?: {
    geometry?: Polygon | null;
    maxFeatures?: number;
    incidentLayerUrl?: string | null;
  }
): Promise<FilteredIncidentStats> {
  const maxFeatures = options?.maxFeatures ?? 8000;
  const pageSize = 1000;
  const attributes: Array<Record<string, unknown>> = [];
  const incidentIds: number[] = [];
  let start = 0;
  let truncated = false;

  while (attributes.length < maxFeatures) {
    const query = layer.createQuery();
    query.where = layer.definitionExpression || "1=1";
    // Hosted pg_featureserv layers use lowercase field names; request all fields.
    query.outFields = ["*"];
    query.returnGeometry = false;
    query.num = Math.min(pageSize, maxFeatures - attributes.length);
    query.start = start;
    if (options?.geometry) {
      query.geometry = options.geometry;
      query.spatialRelationship = "intersects";
    }

    const result = await layer.queryFeatures(query);
    for (const feature of result.features) {
      const attrs = (feature.attributes || {}) as Record<string, unknown>;
      attributes.push(attrs);
      const id = Number(attrs.id);
      if (Number.isFinite(id)) incidentIds.push(id);
    }
    if (result.features.length < pageSize) break;
    start += pageSize;
    if (attributes.length >= maxFeatures) {
      truncated = true;
      break;
    }
  }

  const roadUser: RoadUserSummary = {
    total: attributes.length,
    bicyclist: 0,
    pedestrian: 0,
    both: 0,
    neither: 0,
  };
  const severityMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const conflictMap = new Map<string, number>();
  const yearMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  const todMap = new Map<string, number>();
  const weekdayMap = new Map<string, number>();

  for (const label of SEVERITY_ORDER) severityMap.set(label, 0);
  for (const label of MONTH_LABELS) monthMap.set(label, 0);
  for (const label of WEEKDAY_LABELS) weekdayMap.set(label, 0);
  for (const label of [
    "Morning (5–11)",
    "Afternoon (12–16)",
    "Evening (17–20)",
    "Night (21–4)",
  ]) {
    todMap.set(label, 0);
  }

  for (const attrs of attributes) {
    const bike = involvedFlag(attrs.bicyclist_involved);
    const ped = involvedFlag(attrs.pedestrian_involved);
    if (bike && ped) roadUser.both += 1;
    else if (bike) roadUser.bicyclist += 1;
    else if (ped) roadUser.pedestrian += 1;
    else roadUser.neither += 1;

    const severity = normalizeIncidentSeverity(
      attrs.severity,
      attrs.data_source
    );
    bump(severityMap, severity);

    const source = attrs.data_source != null ? String(attrs.data_source) : "Unknown";
    bump(sourceMap, source);

    const conflict =
      attrs.conflict_type != null && String(attrs.conflict_type).trim()
        ? String(attrs.conflict_type)
        : "Unknown";
    bump(conflictMap, conflict);

    const ts = parseTimestamp(attrs.timestamp);
    if (ts) {
      bump(yearMap, String(ts.getFullYear()));
      bump(monthMap, MONTH_LABELS[ts.getMonth()]);
      bump(todMap, timeOfDayBucket(ts));
      bump(weekdayMap, WEEKDAY_LABELS[ts.getDay()]);
    }
  }

  let crossTabs: Record<string, StackedChartData> = {};
  let byAge: NamedCount[] = [];
  let byGender: NamedCount[] = [];

  if (options?.incidentLayerUrl && incidentIds.length > 0) {
    const parties = await fetchPartyRecords(
      options.incidentLayerUrl,
      incidentIds.slice(0, 1500)
    );
    crossTabs = buildAllCrossTabs(attributes, parties);

    const ageMap = new Map<string, number>();
    const genderMap = new Map<string, number>();
    for (const party of parties) {
      bump(ageMap, ageBucket(party.age));
      bump(genderMap, genderLabel(party.gender));
    }
    byAge = mapToSortedCounts(ageMap, AGE_ORDER);
    byGender = mapToSortedCounts(genderMap);
  }

  return {
    roadUser,
    bySeverity: mapToSortedCounts(severityMap, SEVERITY_ORDER),
    byDataSource: mapToSortedCounts(sourceMap),
    byConflictType: mapToSortedCounts(conflictMap),
    byYear: mapToSortedCounts(yearMap).sort((a, b) =>
      a.label.localeCompare(b.label)
    ),
    byMonth: mapToSortedCounts(monthMap, MONTH_LABELS),
    byTimeOfDay: mapToSortedCounts(todMap, [
      "Morning (5–11)",
      "Afternoon (12–16)",
      "Evening (17–20)",
      "Night (21–4)",
    ]),
    byWeekday: mapToSortedCounts(weekdayMap, WEEKDAY_LABELS),
    byAge,
    byGender,
    byJurisdiction: [],
    crossTabs,
    truncated,
    featureCount: attributes.length,
    incidentIds,
  };
}

function partiesLayerUrl(incidentLayerUrl: string): string | null {
  if (!incidentLayerUrl) return null;
  const cleaned = incidentLayerUrl.replace(/\/+$/, "");
  if (/\/\d+$/.test(cleaned)) {
    return cleaned.replace(/\/\d+$/, "/1");
  }
  return `${cleaned}/1`;
}

/**
 * Aggregate age/gender from the parties FeatureServer layer for a set of
 * incident record ids (safety.all_incidents.id).
 */
export async function computePartyDemographics(
  incidentLayerUrl: string,
  incidentIds: number[]
): Promise<{ byAge: NamedCount[]; byGender: NamedCount[] }> {
  const url = partiesLayerUrl(incidentLayerUrl);
  if (!url || incidentIds.length === 0) {
    return { byAge: [], byGender: [] };
  }

  const ageMap = new Map<string, number>();
  const genderMap = new Map<string, number>();
  const layer = new FeatureLayer({ url, outFields: ["*"] });
  const chunkSize = 200;

  for (let i = 0; i < incidentIds.length; i += chunkSize) {
    const chunk = incidentIds.slice(i, i + chunkSize);
    const query = layer.createQuery();
    query.where = `incident_id IN (${chunk.join(",")})`;
    query.outFields = ["age", "gender", "incident_id"];
    query.returnGeometry = false;
    query.num = 2000;
    try {
      const result = await layer.queryFeatures(query);
      for (const feature of result.features) {
        const a = (feature.attributes || {}) as SafetyIncidentParty & {
          age?: unknown;
          gender?: unknown;
        };
        bump(ageMap, ageBucket(a.age));
        bump(genderMap, genderLabel(a.gender));
      }
    } catch (err) {
      console.warn("Party demographics query failed:", err);
      break;
    }
  }

  const ageOrder = [
    "Under 18",
    "18–24",
    "25–34",
    "35–44",
    "45–54",
    "55–64",
    "65+",
    "Unknown",
  ];
  return {
    byAge: mapToSortedCounts(ageMap, ageOrder),
    byGender: mapToSortedCounts(genderMap),
  };
}

/**
 * Count filtered incidents inside each named place polygon.
 */
export async function computeJurisdictionBreakdown(
  layer: FeatureLayer,
  places: Array<{ name: string; geometry: Polygon }>
): Promise<NamedCount[]> {
  const rows: NamedCount[] = [];
  for (const place of places) {
    const query = layer.createQuery();
    query.where = layer.definitionExpression || "1=1";
    query.geometry = place.geometry;
    query.spatialRelationship = "intersects";
    try {
      const count = await layer.queryFeatureCount(query);
      rows.push({ label: place.name, count });
    } catch {
      rows.push({ label: place.name, count: 0 });
    }
  }
  return rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export async function listJurisdictionPlaces(
  level: "city" | "service-area"
): Promise<Array<{ name: string; geometry: Polygon }>> {
  const url =
    "https://spatialcenter.grit.ucsb.edu/server/rest/services/Hosted/sb_cities_service_areas_multi_layer/FeatureServer/1";
  const placesLayer = new FeatureLayer({
    url,
    outFields: ["name", "type", "fid"],
  });
  await placesLayer.load();

  const query = placesLayer.createQuery();
  // Layer may use different type labels; fetch all and filter client-side.
  query.where = "1=1";
  query.outFields = ["name", "type", "fid"];
  query.returnGeometry = true;
  query.outSpatialReference = { wkid: 4326 };
  query.num = 500;

  const result = await placesLayer.queryFeatures(query);
  const wantCity = level === "city";
  const places: Array<{ name: string; geometry: Polygon }> = [];

  for (const feature of result.features) {
    const name = feature.attributes?.name;
    const type = String(feature.attributes?.type || "").toLowerCase();
    const geometry = feature.geometry as Polygon | undefined;
    if (!name || !geometry) continue;

    const isCity =
      type.includes("city") ||
      type.includes("town") ||
      type === "" ||
      type.includes("incorporated");
    const isService =
      type.includes("service") ||
      type.includes("area") ||
      type.includes("transit");

    if (wantCity && !isCity && isService) continue;
    if (!wantCity && !isService && isCity) continue;

    places.push({ name: String(name), geometry });
  }

  // If type filtering wiped everything, return all named polygons.
  if (places.length === 0) {
    for (const feature of result.features) {
      const name = feature.attributes?.name;
      const geometry = feature.geometry as Polygon | undefined;
      if (name && geometry) {
        places.push({ name: String(name), geometry });
      }
    }
  }

  return places.sort((a, b) => a.name.localeCompare(b.name));
}
