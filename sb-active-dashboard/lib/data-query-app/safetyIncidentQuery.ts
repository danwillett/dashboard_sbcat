import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

export interface SafetyIncidentParty {
  party_number?: number;
  victim_number?: number;
  party_type?: string;
  injury_severity?: string;
  bicycle_type?: string;
  age?: string | number;
  gender?: string;
}

export interface SafetyIncidentSummary {
  objectId: string;
  incidentId: number | null;
  timestamp: string | null;
  location: string | null;
  severity: string | null;
  conflictType: string | null;
  dataSource: string | null;
  pedestrianInvolved: boolean;
  bicyclistInvolved: boolean;
  vehicleInvolved: boolean;
  attributes: Record<string, unknown>;
}

const DROPDOWN_LIMIT = 400;

export function incidentObjectId(attrs: Record<string, unknown>): string | null {
  const raw = attrs.OBJECTID ?? attrs.objectid ?? attrs.FID ?? attrs.fid;
  if (raw == null) return null;
  return String(raw);
}

export function incidentRecordId(attrs: Record<string, unknown>): number | null {
  const raw = attrs.id ?? attrs.incident_id;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function summarizeIncidentAttributes(
  attrs: Record<string, unknown>
): SafetyIncidentSummary | null {
  const objectId = incidentObjectId(attrs);
  if (!objectId) return null;

  const ts = attrs.timestamp ?? attrs.Timestamp;
  let timestamp: string | null = null;
  if (ts instanceof Date) timestamp = ts.toISOString();
  else if (typeof ts === "number") timestamp = new Date(ts).toISOString();
  else if (typeof ts === "string") timestamp = ts;

  return {
    objectId,
    incidentId: incidentRecordId(attrs),
    timestamp,
    location: attrs.loc_desc != null ? String(attrs.loc_desc) : null,
    severity:
      attrs.severity != null
        ? String(attrs.severity)
        : attrs.maxSeverity != null
          ? String(attrs.maxSeverity)
          : null,
    conflictType:
      attrs.conflict_type != null ? String(attrs.conflict_type) : null,
    dataSource: attrs.data_source != null ? String(attrs.data_source) : null,
    pedestrianInvolved: Number(attrs.pedestrian_involved) === 1,
    bicyclistInvolved: Number(attrs.bicyclist_involved) === 1,
    vehicleInvolved: Number(attrs.vehicle_involved) === 1,
    attributes: attrs,
  };
}

export async function queryFilteredIncidents(
  layer: FeatureLayer,
  extra?: { geometry?: __esri.Geometry | null }
): Promise<{ incidents: SafetyIncidentSummary[]; truncated: boolean }> {
  const query = layer.createQuery();
  query.where = layer.definitionExpression || "1=1";
  query.outFields = ["*"];
  query.returnGeometry = false;
  query.num = DROPDOWN_LIMIT;
  query.orderByFields = ["timestamp DESC"];
  if (extra?.geometry) {
    query.geometry = extra.geometry;
    query.spatialRelationship = "intersects";
  }

  const result = await layer.queryFeatures(query);
  const incidents = result.features
    .map((f) => summarizeIncidentAttributes(f.attributes || {}))
    .filter((row): row is SafetyIncidentSummary => !!row);

  return {
    incidents,
    truncated: result.features.length >= DROPDOWN_LIMIT,
  };
}

const DEFAULT_EXPORT_LIMIT = 50000;

/** Page through all filtered incidents for CSV export. */
export async function queryAllFilteredIncidentFeatures(
  layer: FeatureLayer,
  options?: {
    geometry?: __esri.Geometry | null;
    maxFeatures?: number;
    returnGeometry?: boolean;
    outSpatialReference?: __esri.SpatialReferenceProperties;
  }
): Promise<{
  features: Array<{ attributes: Record<string, unknown>; geometry?: __esri.Geometry }>;
  truncated: boolean;
}> {
  const maxFeatures = options?.maxFeatures ?? DEFAULT_EXPORT_LIMIT;
  const pageSize = 1000;
  const features: Array<{
    attributes: Record<string, unknown>;
    geometry?: __esri.Geometry;
  }> = [];
  let start = 0;
  let truncated = false;

  while (features.length < maxFeatures) {
    const query = layer.createQuery();
    query.where = layer.definitionExpression || "1=1";
    query.outFields = ["*"];
    query.returnGeometry = options?.returnGeometry === true;
    if (options?.returnGeometry && options.outSpatialReference) {
      query.outSpatialReference = options.outSpatialReference;
    }
    query.orderByFields = ["timestamp DESC"];
    query.num = Math.min(pageSize, maxFeatures - features.length);
    query.start = start;
    if (options?.geometry) {
      query.geometry = options.geometry;
      query.spatialRelationship = "intersects";
    }

    const result = await layer.queryFeatures(query);
    for (const feature of result.features) {
      features.push({
        attributes: (feature.attributes || {}) as Record<string, unknown>,
        geometry: feature.geometry ?? undefined,
      });
    }
    if (result.features.length < pageSize) break;
    start += pageSize;
    if (features.length >= maxFeatures) {
      truncated = true;
      break;
    }
  }

  return { features, truncated };
}

export async function queryIncidentByObjectId(
  layer: FeatureLayer,
  objectId: string
): Promise<SafetyIncidentSummary | null> {
  const oid = Number(objectId);
  if (!Number.isFinite(oid)) return null;

  const query = layer.createQuery();
  query.objectIds = [oid];
  query.outFields = ["*"];
  query.returnGeometry = false;
  query.num = 1;
  const result = await layer.queryFeatures(query);
  const attrs = result.features[0]?.attributes;
  return attrs ? summarizeIncidentAttributes(attrs) : null;
}

function partiesLayerUrl(incidentLayerUrl: string): string | null {
  if (!incidentLayerUrl) return null;
  const cleaned = incidentLayerUrl.replace(/\/+$/, "");
  if (/\/\d+$/.test(cleaned)) {
    return cleaned.replace(/\/\d+$/, "/1");
  }
  return `${cleaned}/1`;
}

export async function fetchIncidentParties(
  incidentLayerUrl: string,
  incidentId: number
): Promise<SafetyIncidentParty[]> {
  const url = partiesLayerUrl(incidentLayerUrl);
  if (!url) return [];

  const layer = new FeatureLayer({ url, outFields: ["*"] });
  const query = layer.createQuery();
  query.where = `incident_id = ${incidentId}`;
  query.outFields = ["*"];
  query.returnGeometry = false;
  query.num = 50;

  try {
    const result = await layer.queryFeatures(query);
    return result.features.map((feature) => {
      const a = feature.attributes || {};
      return {
        party_number: a.party_number,
        victim_number: a.victim_number,
        party_type: a.party_type,
        injury_severity: a.injury_severity,
        bicycle_type: a.bicycle_type,
        age: a.age,
        gender: a.gender,
      };
    });
  } catch (err) {
    console.warn("Could not load incident parties:", err);
    return [];
  }
}
