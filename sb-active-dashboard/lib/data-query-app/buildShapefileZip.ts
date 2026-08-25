import JSZip from "jszip";
import {
  loadShpWriteBrowser,
  ShpWriteBrowserApi,
  ShpWriteOutput,
} from "@/lib/data-query-app/shpWriteBrowser";

const WGS84_PRJ =
  'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';

export interface ShapefileGeoJsonFeature {
  type: "Feature";
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

export interface ShapefileGeoJsonCollection {
  type: "FeatureCollection";
  features: ShapefileGeoJsonFeature[];
}

interface WriteLayerPayload {
  geometries: unknown;
  properties: Record<string, unknown>[];
  type: string;
}

function geometryForShpWrite(feature: ShapefileGeoJsonFeature): unknown {
  const { type, coordinates } = feature.geometry;

  // GeoJSON coordinates are already in the structure shp-write expects.
  // Do not use the depth-based justCoords helper — it strips Polygon rings.
  if (type === "Polygon" || type === "LineString" || type === "Point") {
    return coordinates;
  }

  return coordinates;
}

function layerFromGeoJson(
  geometryType: string,
  shpType: string,
  features: ShapefileGeoJsonFeature[]
): WriteLayerPayload | null {
  const matched = features.filter((f) => f.geometry.type === geometryType);
  if (matched.length === 0) return null;

  // One geometry per feature — shp-write writes one shape record per geometries[]
  // entry and one DBF row per properties[] entry; counts must match.
  return {
    geometries: matched.map(geometryForShpWrite),
    properties: matched.map((f) => f.properties),
    type: shpType,
  };
}

function shapefileBaseName(folderName: string, shpType: string): string {
  if (shpType === "POINT") return `${folderName}-points`;
  if (shpType === "POLYGON") return `${folderName}-polygons`;
  return folderName;
}

function writeLayer(
  shpwrite: ShpWriteBrowserApi,
  layer: WriteLayerPayload
): Promise<ShpWriteOutput> {
  const geometries = layer.geometries as unknown[];
  if (geometries.length !== layer.properties.length) {
    throw new Error(
      `Shapefile export mismatch: ${geometries.length} shapes vs ${layer.properties.length} attribute rows.`
    );
  }

  return new Promise((resolve, reject) => {
    shpwrite.write(
      layer.properties,
      layer.type,
      layer.geometries,
      (err: Error | null, files?: ShpWriteOutput) => {
        if (err) {
          reject(err);
          return;
        }
        if (!files) {
          reject(new Error("Shapefile writer returned no files."));
          return;
        }
        resolve(files);
      }
    );
  });
}

/**
 * Build a shapefile ZIP using shp-write's `write` + JSZip 2.x (sync generate).
 * Avoids shp-write's bundled `zip()` which conflicts with JSZip 3 on the page.
 */
export async function buildShapefileZipBase64(
  collection: ShapefileGeoJsonCollection,
  folderName: string
): Promise<string> {
  const shpwrite = await loadShpWriteBrowser();
  const zip = new JSZip();
  const layersFolder = zip.folder(folderName) ?? zip;

  const layers = [
    layerFromGeoJson("Point", "POINT", collection.features),
    layerFromGeoJson("LineString", "POLYLINE", collection.features),
    layerFromGeoJson("Polygon", "POLYGON", collection.features),
  ].filter((layer): layer is WriteLayerPayload => layer != null);

  if (layers.length === 0) {
    throw new Error("No supported geometries for shapefile export.");
  }

  for (const layer of layers) {
    const files = await writeLayer(shpwrite, layer);
    const baseName = shapefileBaseName(folderName, layer.type);

    layersFolder.file(`${baseName}.shp`, files.shp.buffer, { binary: true });
    layersFolder.file(`${baseName}.shx`, files.shx.buffer, { binary: true });
    layersFolder.file(`${baseName}.dbf`, files.dbf.buffer, { binary: true });
    layersFolder.file(`${baseName}.prj`, WGS84_PRJ);
  }

  return zip.generate({ compression: "STORE" });
}
