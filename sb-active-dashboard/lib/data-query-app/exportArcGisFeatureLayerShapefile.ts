import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import { ArcGisFeatureLayerMetadata } from "@/lib/data-services/ArcGisFeatureLayerMetadataService";
import {
  PortalFeatureLayerExportResult,
} from "@/lib/data-query-app/exportArcGisFeatureLayerQuery";
import {
  queryFilteredLayerFeatures,
  QueriedExportFeature,
  slugifyFilename,
} from "@/lib/data-query-app/exportArcGisFeatureLayerQuery";
import { buildShapefileZipBase64 } from "@/lib/data-query-app/buildShapefileZip";
import { datedExportFilename } from "@/lib/utilities/shared/csvExport";

interface GeoJsonFeature {
  type: "Feature";
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties: Record<string, unknown>;
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

const SHAPEFILE_FIELD_MAX_LEN = 10;

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

function shapefileProperties(
  attributes: Record<string, unknown>,
  fieldNames: string[]
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const name of fieldNames) {
    properties[shapefileFieldName(name)] = shapefilePropertyValue(
      attributes[name]
    );
  }
  return properties;
}

function closeRing(ring: number[][]): number[][] {
  if (ring.length < 3) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, first];
  }
  return ring;
}

function polygonRingsToGeoJson(rings: number[][][]): number[][][] {
  return rings
    .filter((ring) => ring.length >= 3)
    .map((ring) => closeRing(ring));
}

function geoJsonFeaturesFromQueried(
  rows: QueriedExportFeature[],
  fieldNames: string[]
): GeoJsonFeature[] {
  const features: GeoJsonFeature[] = [];

  for (const row of rows) {
    const properties = shapefileProperties(row.attributes, fieldNames);
    const geometry = row.geometry;
    if (!geometry) continue;

    if (geometry.type === "point") {
      const point = geometry as __esri.Point;
      const x = point.longitude ?? point.x;
      const y = point.latitude ?? point.y;
      if (x == null || y == null) continue;
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [x, y] },
        properties,
      });
      continue;
    }

    if (geometry.type === "polyline") {
      const polyline = geometry as __esri.Polyline;
      for (const path of polyline.paths ?? []) {
        if (!path.length) continue;
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: path },
          properties,
        });
      }
      continue;
    }

    if (geometry.type === "polygon") {
      const polygon = geometry as __esri.Polygon;
      const rings = polygonRingsToGeoJson(polygon.rings ?? []);
      if (!rings.length) continue;
      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: rings },
        properties,
      });
      continue;
    }

    if (geometry.type === "multipoint") {
      const multipoint = geometry as __esri.Multipoint;
      for (const coords of multipoint.points ?? []) {
        if (coords.length < 2) continue;
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: coords },
          properties,
        });
      }
    }
  }

  return features;
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

export async function exportArcGisFeatureLayerShapefile(
  dataset: CatalogDataset,
  metadata: ArcGisFeatureLayerMetadata,
  options?: {
    where?: string;
    mapView?: __esri.MapView | null;
  }
): Promise<PortalFeatureLayerExportResult> {
  const { features, truncated, fieldNames } = await queryFilteredLayerFeatures(
    dataset,
    metadata,
    options
  );

  const geoJsonFeatures = geoJsonFeaturesFromQueried(features, fieldNames);
  if (geoJsonFeatures.length === 0) {
    throw new Error("No geometries available for shapefile export.");
  }

  const collection: GeoJsonFeatureCollection = {
    type: "FeatureCollection",
    features: geoJsonFeatures,
  };

  const folderName = slugifyFilename(
    metadata.layerTitle || dataset.display_title || "layer"
  );

  const zipBase64 = await buildShapefileZipBase64(collection, folderName);

  const filename = datedExportFilename(folderName, "zip");
  downloadZipBase64(zipBase64, filename);

  return {
    rowCount: geoJsonFeatures.length,
    truncated,
    filename,
  };
}
