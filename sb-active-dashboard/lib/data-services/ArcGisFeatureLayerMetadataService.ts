import { CatalogDataset } from "@/lib/data-services/CatalogApiService";

export interface ArcGisFeatureLayerMetadata {
  layerTitle: string;
  serviceTitle?: string;
  summary?: string;
  description?: string;
  credits?: string;
  useLimitations?: string;
  copyrightText?: string;
  licenseInfo?: string;
  itemId?: string;
  /** Portal item owner username (required for export REST). */
  owner?: string;
  /** e.g. https://www.arcgis.com/sharing/rest */
  portalSharingRoot?: string;
  portalUrl?: string;
  serviceUrl: string;
  /** Symbology saved on the portal item (ArcGIS Online “Visualize” style). */
  portalLayerRenderer?: __esri.RendererProperties;
  portalLayerRendererField?: string;
}

interface ArcGisServiceJson {
  name?: string;
  serviceDescription?: string;
  description?: string;
  copyrightText?: string;
  accessInformation?: string;
  useLimitations?: string;
  serviceItemId?: string;
}

interface ArcGisLayerJson {
  name?: string;
  description?: string;
  copyrightText?: string;
  serviceItemId?: string;
}

interface PortalItemJson {
  title?: string;
  snippet?: string;
  description?: string;
  accessInformation?: string;
  licenseInfo?: string;
  termsOfUse?: string;
  owner?: string;
  error?: { message?: string; code?: number };
}

const PORTAL_SHARING_ROOTS = [
  "https://www.arcgis.com/sharing/rest",
  "https://spatialcenter.grit.ucsb.edu/portal/sharing/rest",
] as const;

interface PortalItemDataJson {
  layers?: Array<{
    id?: number;
    layerDefinition?: {
      drawingInfo?: {
        renderer?: PortalRendererJson;
      };
    };
  }>;
}

export function resolveCatalogLayerIndex(dataset: CatalogDataset): number {
  return dataset.layer_id ?? 0;
}

export interface PortalRendererJson {
  type?: string;
  field?: string;
  field1?: string;
  field2?: string;
}

export function portalRendererField(rendererJson: PortalRendererJson): string | null {
  const type = rendererJson.type;
  if (type === "unique-value" || type === "uniqueValue") {
    return rendererJson.field ?? rendererJson.field1 ?? rendererJson.field2 ?? null;
  }
  if (type === "class-breaks" || type === "classBreaks") {
    return rendererJson.field ?? null;
  }
  return null;
}

async function fetchPortalItemLayerRenderer(
  itemId: string,
  layerIndex: number
): Promise<__esri.RendererProperties | null> {
  const urls = [
    `https://www.arcgis.com/sharing/rest/content/items/${itemId}/data`,
    `https://spatialcenter.grit.ucsb.edu/portal/sharing/rest/content/items/${itemId}/data`,
  ];

  for (const baseUrl of urls) {
    const data = await fetchArcGisJson<PortalItemDataJson>(baseUrl);
    if (!data?.layers?.length) continue;

    const layer =
      data.layers.find((entry) => entry.id === layerIndex) ?? data.layers[0];
    const renderer = layer?.layerDefinition?.drawingInfo?.renderer;
    if (renderer?.type) {
      return renderer as __esri.RendererProperties;
    }
  }

  return null;
}

function withLayerIndex(serviceUrl: string, layerId?: number | null): string {
  const clean = serviceUrl.replace(/\/$/, "");
  if (layerId !== null && layerId !== undefined) {
    return `${clean}/${layerId}`;
  }
  if (/\/FeatureServer$/i.test(clean)) {
    return `${clean}/0`;
  }
  return clean;
}

export function resolveCatalogFeatureLayerUrl(dataset: CatalogDataset): string | null {
  if (dataset.has_feature_server && dataset.feature_service_url) {
    return withLayerIndex(dataset.feature_service_url, dataset.layer_id);
  }
  const primary = dataset.primary_url || "";
  if (primary.includes("FeatureServer")) {
    return withLayerIndex(primary, dataset.layer_id);
  }
  return null;
}

function serviceRootUrl(layerUrl: string): string {
  return layerUrl.replace(/\/\d+$/, "");
}

function cleanText(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return undefined;
}

async function fetchArcGisJson<T>(url: string): Promise<T | null> {
  const response = await fetch(`${url.replace(/\/$/, "")}?f=json`);
  if (!response.ok) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function sharingRootFromServiceUrl(serviceUrl: string): string | undefined {
  const lower = serviceUrl.toLowerCase();
  if (lower.includes("spatialcenter.grit.ucsb.edu")) {
    return "https://spatialcenter.grit.ucsb.edu/portal/sharing/rest";
  }
  if (lower.includes("arcgis.com")) {
    return "https://www.arcgis.com/sharing/rest";
  }
  return undefined;
}

function portalItemPageUrl(itemId: string, sharingRoot?: string): string {
  if (sharingRoot) {
    const portalHome = sharingRoot.replace(/\/sharing\/rest\/?$/i, "/home");
    return `${portalHome}/item.html?id=${itemId}`;
  }
  return `https://www.arcgis.com/home/item.html?id=${itemId}`;
}

interface PortalItemLookup {
  meta: PortalItemJson;
  sharingRoot: string;
}

async function fetchPortalItemMetadata(
  itemId: string,
  preferredSharingRoot?: string
): Promise<PortalItemLookup | null> {
  const roots = [
    preferredSharingRoot,
    ...PORTAL_SHARING_ROOTS,
  ].filter((root, index, list): root is string => !!root && list.indexOf(root) === index);

  for (const sharingRoot of roots) {
    const data = await fetchArcGisJson<PortalItemJson>(
      `${sharingRoot}/content/items/${itemId}`
    );
    if (
      data &&
      !data.error &&
      (data.title || data.description || data.snippet || data.owner)
    ) {
      return { meta: data, sharingRoot };
    }
  }
  return null;
}

export async function fetchArcGisFeatureLayerMetadata(
  dataset: CatalogDataset
): Promise<ArcGisFeatureLayerMetadata | null> {
  const layerUrl = resolveCatalogFeatureLayerUrl(dataset);
  if (!layerUrl) return null;

  const serviceUrl = serviceRootUrl(layerUrl);
  const [layerMeta, serviceMeta] = await Promise.all([
    fetchArcGisJson<ArcGisLayerJson>(layerUrl),
    fetchArcGisJson<ArcGisServiceJson>(serviceUrl),
  ]);

  const itemId =
    cleanText(layerMeta?.serviceItemId) ||
    cleanText(serviceMeta?.serviceItemId) ||
    undefined;

  const preferredSharingRoot = sharingRootFromServiceUrl(layerUrl);
  const portalLookup = itemId
    ? await fetchPortalItemMetadata(itemId, preferredSharingRoot)
    : null;
  const portalMeta = portalLookup?.meta;
  const portalSharingRoot = portalLookup?.sharingRoot;
  const portalLayerRenderer = itemId
    ? await fetchPortalItemLayerRenderer(itemId, resolveCatalogLayerIndex(dataset))
    : null;
  const portalLayerRendererField = portalLayerRenderer
    ? portalRendererField(portalLayerRenderer as PortalRendererJson)
    : undefined;

  const layerTitle =
    cleanText(portalMeta?.title) ||
    cleanText(layerMeta?.name) ||
    cleanText(serviceMeta?.name) ||
    cleanText(dataset.display_title) ||
    "Layer";

  const summary = firstNonEmpty(
    portalMeta?.snippet,
    serviceMeta?.serviceDescription,
    dataset.description
  );

  let description = firstNonEmpty(
    portalMeta?.description,
    layerMeta?.description,
    serviceMeta?.description,
    dataset.description
  );
  if (description && summary && description === summary) {
    description = undefined;
  }

  const credits = firstNonEmpty(
    portalMeta?.accessInformation,
    serviceMeta?.accessInformation
  );

  const useLimitations = firstNonEmpty(
    portalMeta?.termsOfUse,
    serviceMeta?.useLimitations
  );

  const licenseInfo = cleanText(portalMeta?.licenseInfo);

  const copyrightText = firstNonEmpty(
    layerMeta?.copyrightText,
    serviceMeta?.copyrightText
  );

  return {
    layerTitle,
    serviceTitle: cleanText(serviceMeta?.name),
    summary,
    description,
    credits,
    useLimitations,
    licenseInfo,
    copyrightText,
    itemId,
    owner: cleanText(portalMeta?.owner),
    portalSharingRoot,
    portalUrl: itemId
      ? portalItemPageUrl(itemId, portalSharingRoot ?? preferredSharingRoot)
      : undefined,
    serviceUrl: layerUrl,
    portalLayerRenderer,
    portalLayerRendererField,
  };
}
