import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import {
  datedExportFilename,
  downloadCsv,
  rowsToCsv,
} from "@/lib/utilities/shared/csvExport";
import { queryAllFilteredIncidentFeatures } from "@/lib/data-query-app/safetyIncidentQuery";

export const SAFETY_INCIDENT_EXPORT_HEADERS = [
  "id",
  "source_id",
  "timestamp",
  "severity",
  "conflict_type",
  "data_source",
  "loc_desc",
  "pedestrian_involved",
  "bicyclist_involved",
  "vehicle_involved",
  "latitude",
  "longitude",
] as const;

function formatTimestamp(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  return String(value);
}

function involvedFlag(value: unknown): string {
  if (value === true || value === 1 || value === "1") return "1";
  if (value === false || value === 0 || value === "0") return "0";
  return value == null ? "" : String(value);
}

function pointCoordinates(
  geometry?: __esri.Geometry
): { latitude: number | null; longitude: number | null } {
  if (!geometry || geometry.type !== "point") {
    return { latitude: null, longitude: null };
  }
  const point = geometry as __esri.Point;
  return {
    latitude: point.latitude ?? null,
    longitude: point.longitude ?? null,
  };
}

function incidentToExportRow(feature: {
  attributes: Record<string, unknown>;
  geometry?: __esri.Geometry;
}): unknown[] {
  const attrs = feature.attributes;
  const { latitude, longitude } = pointCoordinates(feature.geometry);

  return [
    attrs.id ?? "",
    attrs.source_id ?? "",
    formatTimestamp(attrs.timestamp),
    attrs.severity ?? "",
    attrs.conflict_type ?? "",
    attrs.data_source ?? "",
    attrs.loc_desc ?? "",
    involvedFlag(attrs.pedestrian_involved),
    involvedFlag(attrs.bicyclist_involved),
    involvedFlag(attrs.vehicle_involved),
    latitude ?? "",
    longitude ?? "",
  ];
}

export interface SafetyIncidentCsvExportResult {
  rowCount: number;
  truncated: boolean;
  filename: string;
}

export async function exportSafetyIncidentsCsv(
  layer: FeatureLayer,
  options?: {
    geometry?: __esri.Geometry | null;
    maxFeatures?: number;
  }
): Promise<SafetyIncidentCsvExportResult> {
  const { features, truncated } = await queryAllFilteredIncidentFeatures(layer, {
    geometry: options?.geometry,
    maxFeatures: options?.maxFeatures,
    returnGeometry: true,
  });

  const rows = features.map(incidentToExportRow);
  const csv = rowsToCsv([...SAFETY_INCIDENT_EXPORT_HEADERS], rows);
  const filename = datedExportFilename("safety-incidents-filtered");
  downloadCsv(filename, csv);

  return {
    rowCount: rows.length,
    truncated,
    filename,
  };
}
