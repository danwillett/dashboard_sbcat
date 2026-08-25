import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { buildShapefileZipBase64 } from "@/lib/data-query-app/buildShapefileZip";
import { datedExportFilename } from "@/lib/utilities/shared/csvExport";
import { queryAllFilteredIncidentFeatures } from "@/lib/data-query-app/safetyIncidentQuery";
import {
  SAFETY_INCIDENT_EXPORT_HEADERS,
  SafetyIncidentCsvExportResult,
} from "@/lib/data-query-app/exportSafetyIncidentsCsv";

const SHAPEFILE_FIELD_MAX_LEN = 10;

const SHAPEFILE_ATTRIBUTE_HEADERS = SAFETY_INCIDENT_EXPORT_HEADERS.filter(
  (header) => header !== "latitude" && header !== "longitude"
);

function shapefileFieldName(name: string): string {
  return name.slice(0, SHAPEFILE_FIELD_MAX_LEN);
}

function shapefilePropertyValue(value: unknown): string | number {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function incidentShapefileProperties(
  attributes: Record<string, unknown>
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const attrMap: Record<string, string> = {
    id: "id",
    source_id: "source_id",
    timestamp: "timestamp",
    severity: "severity",
    conflict_type: "conflict_type",
    data_source: "data_source",
    loc_desc: "loc_desc",
    pedestrian_involved: "pedestrian_involved",
    bicyclist_involved: "bicyclist_involved",
    vehicle_involved: "vehicle_involved",
  };

  for (const header of SHAPEFILE_ATTRIBUTE_HEADERS) {
    const attrKey = attrMap[header] ?? header;
    properties[shapefileFieldName(header)] = shapefilePropertyValue(
      attributes[attrKey]
    );
  }
  return properties;
}

function downloadZipBase64(base64Zip: string, filename: string): void {
  const binary = atob(base64Zip);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/zip" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

export async function exportSafetyIncidentsShapefile(
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
    outSpatialReference: { wkid: 4326 },
  });

  const geoJsonFeatures = features
    .filter((feature) => feature.geometry?.type === "point")
    .map((feature) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point",
        coordinates: [
          (feature.geometry as __esri.Point).longitude ??
            (feature.geometry as __esri.Point).x,
          (feature.geometry as __esri.Point).latitude ??
            (feature.geometry as __esri.Point).y,
        ],
      },
      properties: incidentShapefileProperties(feature.attributes),
    }));

  if (geoJsonFeatures.length === 0) {
    throw new Error("No incident geometries available for shapefile export.");
  }

  const zipBase64 = await buildShapefileZipBase64(
    { type: "FeatureCollection", features: geoJsonFeatures },
    "safety-incidents-filtered"
  );

  const filename = datedExportFilename("safety-incidents-filtered", "zip");
  downloadZipBase64(zipBase64, filename);

  return {
    rowCount: geoJsonFeatures.length,
    truncated,
    filename,
  };
}
