import Polygon from "@arcgis/core/geometry/Polygon";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import * as projection from "@arcgis/core/geometry/projection";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import { createLayerForCatalogDataset } from "@/lib/data-query-app/catalogLayerFactory";
import {
  listBicycleComfortCategories,
  resolveBicycleComfortBandField,
} from "@/lib/data-query-app/bicycleComfortMapStats";
import { buildBicycleComfortEligibleSegmentsWhereClause } from "@/lib/data-query-app/bicycleComfortSegmentEligibility";
import { buildShapefileZipBase64 } from "@/lib/data-query-app/buildShapefileZip";
import {
  QUERY_EXPORT_MAX_ROWS,
  QUERY_EXPORT_PAGE_SIZE,
  geometryExportColumns,
  geometryExportValues,
  normalizeLayerGeometryType,
} from "@/lib/data-query-app/exportArcGisFeatureLayerQuery";
import { InfrastructureEquityAnalysisResult } from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysis";
import {
  equityBinClassLabel,
  equityMetricBinIndex,
} from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";
import { formatEquityAnalysisContextMetricLabel } from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";
import { buildInfrastructureComfortWhereClause } from "@/lib/infrastructure-equity-app/infrastructureEquityMetrics";
import {
  datedExportFilename,
  downloadCsv,
  rowsToCsv,
} from "@/lib/utilities/shared/csvExport";
import { buildEquityAnalysisPdfArtifact } from "@/lib/infrastructure-equity-app/exportEquityAnalysisPdf";
import type MapView from "@arcgis/core/views/MapView";
import JSZip from "jszip";

export type EquitySpatialExportFormat = "shapefile" | "csv";

export type EquitySpatialExportKind = "raw-filtered" | "output-layer";

export interface EquityExportDownloadResult {
  rowCount: number;
  truncated: boolean;
  filename: string;
}

export interface EquityExportArtifact {
  kind: EquitySpatialExportKind;
  filename: string;
  /** Binary file contents (CSV UTF-8 bytes or shapefile zip bytes). */
  bytes: Uint8Array;
  rowCount: number;
  truncated: boolean;
}

const SHAPEFILE_FIELD_MAX_LEN = 10;
const WGS84 = SpatialReference.WGS84;

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

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function csvToUint8Array(csv: string): Uint8Array {
  return new TextEncoder().encode(`\uFEFF${csv}`);
}

function downloadZipBase64(base64Zip: string, filename: string): void {
  downloadBinaryFile(base64ToUint8Array(base64Zip), filename, "application/zip");
}

function downloadBinaryFile(
  bytes: Uint8Array,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer], { type: mimeType });
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
  return rings.filter((ring) => ring.length >= 3).map((ring) => closeRing(ring));
}

async function polygonToWgs84Rings(
  polygon: Polygon
): Promise<number[][][] | null> {
  await projection.load();
  const projected =
    polygon.spatialReference?.wkid === 4326
      ? polygon
      : (projection.project(polygon, WGS84) as Polygon | null);
  if (!projected || projected.type !== "polygon") return null;
  const rings = polygonRingsToGeoJson(projected.rings ?? []);
  return rings.length > 0 ? rings : null;
}

function shortExportBaseName(kind: EquitySpatialExportKind): string {
  if (kind === "raw-filtered") return "raw_filtered";
  return "output_layer";
}

function artifactFilename(
  kind: EquitySpatialExportKind,
  format: EquitySpatialExportFormat
): string {
  const base = shortExportBaseName(kind);
  return format === "csv" ? `${base}.csv` : `${base}.zip`;
}

function unitBinIndexes(
  analysis: InfrastructureEquityAnalysisResult,
  unit: InfrastructureEquityAnalysisResult["units"][number]
): { infraBin: number; contextBin: number; bivariate: string } {
  const infraBin = equityMetricBinIndex(
    unit.infrastructurePercent,
    analysis.breaks.infrastructure
  );
  const contextBin = equityMetricBinIndex(
    unit.contextValue,
    analysis.breaks.context
  );
  return {
    infraBin,
    contextBin,
    bivariate: `${infraBin}-${contextBin}`,
  };
}

function unitProperties(
  analysis: InfrastructureEquityAnalysisResult,
  unit: InfrastructureEquityAnalysisResult["units"][number]
): Record<string, unknown> {
  const { infraBin, contextBin, bivariate } = unitBinIndexes(analysis, unit);
  const infraClass = equityBinClassLabel(infraBin, analysis.breaks.binCount);
  const equityClass = equityBinClassLabel(contextBin, analysis.breaks.binCount);

  // Shapefile DBF names are truncated to 10 chars — keep these short and stable.
  return {
    object_id: unit.objectId,
    unit_label: unit.label ?? "",
    infra_pct: unit.infrastructurePercent,
    ctx_value: unit.contextValue,
    infra_bin: infraBin,
    ctx_bin: contextBin,
    infra_cls: infraClass,
    eqty_cls: equityClass,
    biv_class: bivariate,
    geo_extent: analysis.geographicLabel,
    geo_unit: analysis.geographyLabel,
    bin_count: analysis.breaks.binCount,
  };
}

function unitCsvHeaders(
  analysis: InfrastructureEquityAnalysisResult
): string[] {
  const infraHeader = analysis.infrastructureMetricLabel;
  const contextHeader = formatEquityAnalysisContextMetricLabel(analysis);
  return [
    "object_id",
    "unit_label",
    "geography_unit",
    "geographic_extent",
    infraHeader,
    contextHeader,
    "infrastructure_bin",
    "context_bin",
    "infrastructure_class",
    "equity_class",
    "bivariate_class",
    "bin_count",
  ];
}

function unitCsvRow(
  analysis: InfrastructureEquityAnalysisResult,
  unit: InfrastructureEquityAnalysisResult["units"][number]
): unknown[] {
  const { infraBin, contextBin, bivariate } = unitBinIndexes(analysis, unit);
  return [
    unit.objectId,
    unit.label ?? "",
    analysis.geographyLabel,
    analysis.geographicLabel,
    unit.infrastructurePercent,
    unit.contextValue,
    infraBin,
    contextBin,
    equityBinClassLabel(infraBin, analysis.breaks.binCount),
    equityBinClassLabel(contextBin, analysis.breaks.binCount),
    bivariate,
    analysis.breaks.binCount,
  ];
}

async function buildUnitPolygonFeatures(
  analysis: InfrastructureEquityAnalysisResult
): Promise<
  Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: number[][][] };
    properties: Record<string, unknown>;
  }>
> {
  const features: Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: number[][][] };
    properties: Record<string, unknown>;
  }> = [];

  for (const unit of analysis.units) {
    if (!unit.displayGeometry) continue;
    const rings = await polygonToWgs84Rings(unit.displayGeometry);
    if (!rings) continue;

    const rawProps = unitProperties(analysis, unit);
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawProps)) {
      properties[shapefileFieldName(key)] = shapefilePropertyValue(value);
    }

    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: rings },
      properties,
    });
  }

  return features;
}

export async function buildEquityUnitResultsArtifact(
  analysis: InfrastructureEquityAnalysisResult,
  format: EquitySpatialExportFormat
): Promise<EquityExportArtifact> {
  if (analysis.units.length === 0) {
    throw new Error("No analysis units available to export.");
  }

  const baseName = shortExportBaseName("output-layer");
  const filename = artifactFilename("output-layer", format);

  if (format === "csv") {
    const headers = unitCsvHeaders(analysis);
    const rows = analysis.units.map((unit) => unitCsvRow(analysis, unit));
    return {
      kind: "output-layer",
      filename,
      bytes: csvToUint8Array(rowsToCsv(headers, rows)),
      rowCount: rows.length,
      truncated: false,
    };
  }

  const features = await buildUnitPolygonFeatures(analysis);
  if (features.length === 0) {
    throw new Error("No unit geometries available for shapefile export.");
  }

  const zipBase64 = await buildShapefileZipBase64(
    { type: "FeatureCollection", features },
    baseName
  );
  return {
    kind: "output-layer",
    filename,
    bytes: base64ToUint8Array(zipBase64),
    rowCount: features.length,
    truncated: false,
  };
}

export async function exportEquityUnitResults(
  analysis: InfrastructureEquityAnalysisResult,
  format: EquitySpatialExportFormat
): Promise<EquityExportDownloadResult> {
  const artifact = await buildEquityUnitResultsArtifact(analysis, format);
  if (format === "csv") {
    downloadCsv(
      artifact.filename,
      new TextDecoder().decode(artifact.bytes).replace(/^\uFEFF/, "")
    );
  } else {
    downloadBinaryFile(artifact.bytes, artifact.filename, "application/zip");
  }
  return {
    rowCount: artifact.rowCount,
    truncated: artifact.truncated,
    filename: artifact.filename,
  };
}

async function queryFilteredInfrastructureFeatures(
  dataset: CatalogDataset,
  analysis: InfrastructureEquityAnalysisResult
): Promise<{
  features: Array<{
    attributes: Record<string, unknown>;
    geometry?: __esri.Geometry;
  }>;
  fieldNames: string[];
  geometryType: ReturnType<typeof normalizeLayerGeometryType>;
  truncated: boolean;
}> {
  const layer = (await createLayerForCatalogDataset(dataset)) as FeatureLayer;
  await layer.load();

  const bandField = await resolveBicycleComfortBandField(layer);
  const bandCategoryValues = await listBicycleComfortCategories(
    layer,
    bandField,
    buildBicycleComfortEligibleSegmentsWhereClause(layer)
  );
  const where = buildInfrastructureComfortWhereClause(
    analysis.infrastructureComfortSelection,
    bandField,
    bandCategoryValues,
    layer
  );

  const geometryType = normalizeLayerGeometryType(layer);
  const fieldNames = (layer.fields ?? [])
    .map((field) => field.name)
    .filter((name) => Boolean(name) && name.toLowerCase() !== "shape");

  if (fieldNames.length === 0) {
    throw new Error("Could not determine infrastructure fields to export.");
  }

  const features: Array<{
    attributes: Record<string, unknown>;
    geometry?: __esri.Geometry;
  }> = [];
  let start = 0;
  let truncated = false;

  while (features.length < QUERY_EXPORT_MAX_ROWS) {
    const query = layer.createQuery();
    query.where = where;
    query.outFields = fieldNames;
    query.returnGeometry = geometryType != null;
    if (geometryType != null) {
      query.outSpatialReference = { wkid: 4326 };
    }
    query.num = Math.min(
      QUERY_EXPORT_PAGE_SIZE,
      QUERY_EXPORT_MAX_ROWS - features.length
    );
    query.start = start;

    if (analysis.boundaryGeometry) {
      query.geometry = analysis.boundaryGeometry;
      query.spatialRelationship = "intersects";
    }

    const result = await layer.queryFeatures(query);
    for (const feature of result.features) {
      features.push({
        attributes: (feature.attributes ?? {}) as Record<string, unknown>,
        geometry: feature.geometry ?? undefined,
      });
    }

    if (result.features.length < (query.num ?? 0)) break;

    start += QUERY_EXPORT_PAGE_SIZE;
    if (features.length >= QUERY_EXPORT_MAX_ROWS) {
      truncated = true;
      break;
    }
  }

  if (features.length === 0) {
    throw new Error(
      "No infrastructure segments match the analysis filters and extent."
    );
  }

  return { features, fieldNames, geometryType, truncated };
}

function polylineToGeoJsonFeatures(
  geometry: __esri.Polyline,
  properties: Record<string, unknown>
): Array<{
  type: "Feature";
  geometry: { type: "LineString"; coordinates: number[][] };
  properties: Record<string, unknown>;
}> {
  const features: Array<{
    type: "Feature";
    geometry: { type: "LineString"; coordinates: number[][] };
    properties: Record<string, unknown>;
  }> = [];

  for (const path of geometry.paths ?? []) {
    if (!path.length) continue;
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: path },
      properties,
    });
  }
  return features;
}

export async function buildEquityRawFilteredInfrastructureArtifact(
  dataset: CatalogDataset,
  analysis: InfrastructureEquityAnalysisResult,
  format: EquitySpatialExportFormat
): Promise<EquityExportArtifact> {
  const { features, fieldNames, geometryType, truncated } =
    await queryFilteredInfrastructureFeatures(dataset, analysis);

  const baseName = shortExportBaseName("raw-filtered");
  const filename = artifactFilename("raw-filtered", format);

  if (format === "csv") {
    const geometryColumns = geometryExportColumns(geometryType);
    const headers = [...fieldNames, ...geometryColumns];
    const rows = features.map((feature) => {
      const values = fieldNames.map((name) => feature.attributes[name] ?? "");
      return [
        ...values,
        ...geometryExportValues(feature.geometry, geometryType),
      ];
    });
    return {
      kind: "raw-filtered",
      filename,
      bytes: csvToUint8Array(rowsToCsv(headers, rows)),
      rowCount: rows.length,
      truncated,
    };
  }

  const geoJsonFeatures: Array<{
    type: "Feature";
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown>;
  }> = [];

  for (const feature of features) {
    const properties: Record<string, unknown> = {};
    for (const name of fieldNames) {
      properties[shapefileFieldName(name)] = shapefilePropertyValue(
        feature.attributes[name]
      );
    }

    const geometry = feature.geometry;
    if (!geometry) continue;

    if (geometry.type === "polyline") {
      geoJsonFeatures.push(
        ...polylineToGeoJsonFeatures(geometry as __esri.Polyline, properties)
      );
      continue;
    }

    if (geometry.type === "polygon") {
      const rings = polygonRingsToGeoJson(
        ((geometry as Polygon).rings ?? []) as number[][][]
      );
      if (!rings.length) continue;
      geoJsonFeatures.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: rings },
        properties,
      });
      continue;
    }

    if (geometry.type === "point") {
      const point = geometry as __esri.Point;
      const x = point.longitude ?? point.x;
      const y = point.latitude ?? point.y;
      if (x == null || y == null) continue;
      geoJsonFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [x, y] },
        properties,
      });
    }
  }

  if (geoJsonFeatures.length === 0) {
    throw new Error("No geometries available for shapefile export.");
  }

  const zipBase64 = await buildShapefileZipBase64(
    { type: "FeatureCollection", features: geoJsonFeatures },
    baseName
  );
  return {
    kind: "raw-filtered",
    filename,
    bytes: base64ToUint8Array(zipBase64),
    rowCount: geoJsonFeatures.length,
    truncated,
  };
}

export async function exportEquityRawFilteredInfrastructure(
  dataset: CatalogDataset,
  analysis: InfrastructureEquityAnalysisResult,
  format: EquitySpatialExportFormat
): Promise<EquityExportDownloadResult> {
  const artifact = await buildEquityRawFilteredInfrastructureArtifact(
    dataset,
    analysis,
    format
  );
  if (format === "csv") {
    downloadCsv(
      artifact.filename,
      new TextDecoder().decode(artifact.bytes).replace(/^\uFEFF/, "")
    );
  } else {
    downloadBinaryFile(artifact.bytes, artifact.filename, "application/zip");
  }
  return {
    rowCount: artifact.rowCount,
    truncated: artifact.truncated,
    filename: artifact.filename,
  };
}

export interface EquityExportBundleSelection {
  kind: EquitySpatialExportKind;
  format: EquitySpatialExportFormat;
}

export async function downloadEquityExportBundle(options: {
  analysis: InfrastructureEquityAnalysisResult;
  analysisId: string;
  infrastructureDataset: CatalogDataset | null;
  mapView: MapView | null;
  selections: EquityExportBundleSelection[];
  includePdf?: boolean;
}): Promise<EquityExportDownloadResult> {
  if (options.selections.length === 0 && !options.includePdf) {
    throw new Error("Select at least one item to include in the download.");
  }

  const artifacts: Array<{ filename: string; bytes: Uint8Array }> = [];

  for (const selection of options.selections) {
    if (selection.kind === "raw-filtered") {
      if (!options.infrastructureDataset) {
        throw new Error(
          "Could not find the infrastructure dataset for this analysis."
        );
      }
      artifacts.push(
        await buildEquityRawFilteredInfrastructureArtifact(
          options.infrastructureDataset,
          options.analysis,
          selection.format
        )
      );
      continue;
    }

    artifacts.push(
      await buildEquityUnitResultsArtifact(options.analysis, selection.format)
    );
  }

  if (options.includePdf) {
    artifacts.push(
      await buildEquityAnalysisPdfArtifact({
        analysis: options.analysis,
        analysisId: options.analysisId,
        mapView: options.mapView,
      })
    );
  }

  const zip = new JSZip();
  for (const artifact of artifacts) {
    zip.file(artifact.filename, artifact.bytes, { binary: true });
  }

  const bundleBase64 = zip.generate({
    type: "base64",
    compression: "DEFLATE",
  }) as string;

  const filename = datedExportFilename("equity-export", "zip");
  downloadZipBase64(bundleBase64, filename);

  return {
    rowCount: artifacts.length,
    truncated: false,
    filename,
  };
}
