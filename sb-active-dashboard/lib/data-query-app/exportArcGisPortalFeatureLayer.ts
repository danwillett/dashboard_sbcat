import esriId from "@arcgis/core/identity/IdentityManager";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import {
  ArcGisFeatureLayerMetadata,
  resolveCatalogLayerIndex,
} from "@/lib/data-services/ArcGisFeatureLayerMetadataService";
import {
  geometryExportColumns,
  geometryExportValues,
  PortalFeatureLayerExportResult,
  queryFilteredLayerFeatures,
  slugifyFilename,
} from "@/lib/data-query-app/exportArcGisFeatureLayerQuery";
import {
  datedExportFilename,
  downloadCsv,
  rowsToCsv,
} from "@/lib/utilities/shared/csvExport";

const PORTAL_SHARING_ROOTS = [
  "https://www.arcgis.com/sharing/rest",
  "https://spatialcenter.grit.ucsb.edu/portal/sharing/rest",
] as const;

const EXPORT_POLL_INTERVAL_MS = 1500;
const EXPORT_POLL_MAX_ATTEMPTS = 120;

interface PortalExportResponse {
  type?: string;
  size?: number;
  jobId?: string;
  exportItemId?: string;
  serviceItemId?: string;
  exportFormat?: string;
  error?: { message?: string; code?: number };
}

interface PortalExportStatusResponse {
  status?: string;
  statusMessage?: string;
  itemId?: string;
  error?: { message?: string; code?: number };
}

export type { PortalFeatureLayerExportResult };

function portalErrorMessage(
  payload: { error?: { message?: string } } | null,
  fallback: string
): string {
  return payload?.error?.message?.trim() || fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function exportFilename(
  metadata: ArcGisFeatureLayerMetadata,
  dataset: CatalogDataset
): string {
  return datedExportFilename(
    slugifyFilename(metadata.layerTitle || dataset.display_title || "layer")
  );
}

function portalAccessToken(sharingRoot: string): string | undefined {
  const credential = esriId.findCredential(`${sharingRoot}/sharing`);
  return credential?.token;
}

async function portalJsonFetch<T>(
  url: string,
  options?: { method?: "POST"; body?: URLSearchParams; token?: string }
): Promise<T> {
  const body = options?.body ?? new URLSearchParams();
  if (!body.has("f")) body.set("f", "json");
  if (options?.token) body.set("token", options.token);

  const response = await fetch(url, {
    method: options?.method ?? "GET",
    body: options?.method === "POST" ? body : undefined,
    headers:
      options?.method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : undefined,
  });

  const payload = (await response.json()) as T & {
    error?: { message?: string };
  };
  if (!response.ok || payload.error) {
    throw new Error(
      portalErrorMessage(payload, `Portal request failed (${response.status}).`)
    );
  }
  return payload;
}

async function pollPortalExportJob(
  sharingRoot: string,
  owner: string,
  serviceItemId: string,
  jobId: string,
  token?: string
): Promise<void> {
  const statusUrl = `${sharingRoot}/content/users/${encodeURIComponent(
    owner
  )}/items/${serviceItemId}/status`;

  for (let attempt = 0; attempt < EXPORT_POLL_MAX_ATTEMPTS; attempt += 1) {
    const params = new URLSearchParams({
      f: "json",
      jobType: "export",
      jobId,
    });
    if (token) params.set("token", token);

    const status = await portalJsonFetch<PortalExportStatusResponse>(
      `${statusUrl}?${params.toString()}`
    );

    if (status.status === "completed") return;
    if (status.status === "failed") {
      throw new Error(
        status.statusMessage?.trim() || "Portal export job failed."
      );
    }

    await sleep(EXPORT_POLL_INTERVAL_MS);
  }

  throw new Error("Portal export timed out. Try again in a few minutes.");
}

async function downloadPortalExportItem(
  sharingRoot: string,
  exportItemId: string,
  filename: string,
  token?: string
): Promise<void> {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  const query = params.toString();
  const dataUrl = `${sharingRoot}/content/items/${exportItemId}/data${
    query ? `?${query}` : ""
  }`;

  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(`Portal download failed (${response.status}).`);
  }

  const blob = await response.blob();
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

async function exportViaPortalItem(
  dataset: CatalogDataset,
  metadata: ArcGisFeatureLayerMetadata,
  options?: { where?: string; includeGeometry?: boolean }
): Promise<PortalFeatureLayerExportResult> {
  const itemId = metadata.itemId?.trim();
  const owner = metadata.owner?.trim();
  const sharingRoot = metadata.portalSharingRoot?.trim();

  if (!itemId || !owner || !sharingRoot) {
    throw new Error(
      "Portal export metadata is missing (item id, owner, or portal URL)."
    );
  }

  const token = portalAccessToken(sharingRoot);
  if (!token) {
    throw new Error("Portal export requires signing in to ArcGIS.");
  }

  const layerIndex = resolveCatalogLayerIndex(dataset);
  const where = options?.where?.trim() || "1=1";
  const includeGeometry = options?.includeGeometry ?? true;
  const exportTitle = `${metadata.layerTitle || dataset.display_title || "export"} CSV`;
  const filename = exportFilename(metadata, dataset);

  const exportParameters = JSON.stringify({
    layers: [
      {
        id: layerIndex,
        where,
        includeGeometry,
      },
    ],
  });

  const body = new URLSearchParams({
    itemId,
    title: exportTitle,
    exportFormat: "csv",
    exportParameters,
    f: "json",
    token,
  });

  const exportUrl = `${sharingRoot}/content/users/${encodeURIComponent(owner)}/export`;
  const exportResponse = await portalJsonFetch<PortalExportResponse>(exportUrl, {
    method: "POST",
    body,
    token,
  });

  const jobId = exportResponse.jobId?.trim();
  const exportItemId = exportResponse.exportItemId?.trim();
  const serviceItemId = exportResponse.serviceItemId?.trim() || itemId;

  if (jobId) {
    await pollPortalExportJob(sharingRoot, owner, serviceItemId, jobId, token);
  }

  if (!exportItemId) {
    throw new Error("Portal export did not return a downloadable item.");
  }

  await downloadPortalExportItem(sharingRoot, exportItemId, filename, token);

  return {
    rowCount: 0,
    truncated: false,
    downloadOnly: true,
    filename,
  };
}

/**
 * Export via FeatureServer query — works for public layers without portal sign-in.
 * Portal item export is only used when the user already has an ArcGIS session.
 */
async function exportViaFeatureServiceQuery(
  dataset: CatalogDataset,
  metadata: ArcGisFeatureLayerMetadata,
  options?: { where?: string; mapView?: __esri.MapView | null }
): Promise<PortalFeatureLayerExportResult> {
  const { features, truncated, fieldNames, geometryType } =
    await queryFilteredLayerFeatures(dataset, metadata, options);

  const geometryColumns = geometryExportColumns(geometryType);
  const headers = [...fieldNames, ...geometryColumns];
  const rows = features.map((feature) => {
    const attributeValues = fieldNames.map(
      (name) => feature.attributes[name] ?? ""
    );
    const geometryValues = geometryExportValues(feature.geometry, geometryType);
    return [...attributeValues, ...geometryValues];
  });

  const filename = exportFilename(metadata, dataset);
  const csv = rowsToCsv(headers, rows);
  downloadCsv(filename, csv);

  return {
    rowCount: rows.length,
    truncated,
    filename,
  };
}

export async function exportArcGisPortalFeatureLayerCsv(
  dataset: CatalogDataset,
  metadata: ArcGisFeatureLayerMetadata,
  options?: {
    where?: string;
    includeGeometry?: boolean;
    mapView?: __esri.MapView | null;
  }
): Promise<PortalFeatureLayerExportResult> {
  const sharingRoot = metadata.portalSharingRoot?.trim();
  const portalToken = sharingRoot ? portalAccessToken(sharingRoot) : undefined;
  const hasPortalSession = !!portalToken;

  if (hasPortalSession && metadata.itemId && metadata.owner) {
    try {
      return await exportViaPortalItem(dataset, metadata, options);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/sign in|token|401|403|permission/i.test(message)) {
        throw err;
      }
    }
  }

  return exportViaFeatureServiceQuery(dataset, metadata, options);
}

/** Resolve portal sharing root for an item id (used when metadata was loaded without it). */
export async function resolvePortalSharingRoot(
  itemId: string
): Promise<string | null> {
  for (const root of PORTAL_SHARING_ROOTS) {
    try {
      const response = await fetch(`${root}/content/items/${itemId}?f=json`);
      if (!response.ok) continue;
      const payload = (await response.json()) as {
        owner?: string;
        error?: unknown;
      };
      if (!payload.error && payload.owner) {
        return root;
      }
    } catch {
      // try next root
    }
  }
  return null;
}
