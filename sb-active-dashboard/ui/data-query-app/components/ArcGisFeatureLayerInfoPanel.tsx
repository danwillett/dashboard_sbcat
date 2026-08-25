import {
  ArcGisFeatureLayerMetadata,
} from "@/lib/data-services/ArcGisFeatureLayerMetadataService";
import {
  CatalogCategoryNode,
  CatalogDataset,
  datasetDisplayTitle,
  findDatasetCategoryPath,
} from "@/lib/data-services/CatalogApiService";
import {
  formatArcGisMetadataHtml,
  metadataContainsHtml,
} from "@/lib/data-query-app/formatArcGisMetadataHtml";

interface ArcGisFeatureLayerInfoPanelProps {
  dataset: CatalogDataset;
  tree: CatalogCategoryNode[];
  metadata: ArcGisFeatureLayerMetadata | null;
  loading: boolean;
  error: string | null;
}

function MetadataBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value?.trim()) return null;

  const trimmed = value.trim();
  const useHtml = metadataContainsHtml(trimmed);
  const html = useHtml ? formatArcGisMetadataHtml(trimmed) : "";

  return (
    <section className="rounded-md border border-gray-200 bg-gray-50/70 px-3 py-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </h4>
      {useHtml && html ? (
        <div
          className="arcgis-metadata-html mt-2 text-sm text-gray-700 [&_a]:text-blue-600 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
          {trimmed}
        </p>
      )}
    </section>
  );
}

export default function ArcGisFeatureLayerInfoPanel({
  dataset,
  tree,
  metadata,
  loading,
  error,
}: ArcGisFeatureLayerInfoPanelProps) {
  const categoryPath = findDatasetCategoryPath(tree, dataset.id);
  const title = metadata?.layerTitle || datasetDisplayTitle(dataset);

  return (
    <div id="arcgis-feature-layer-info-panel" className="space-y-4 px-4 py-4">
      <div>
        <h3 className="text-base font-medium text-gray-800">{title}</h3>
        {categoryPath.length > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {categoryPath.join(" › ")}
          </p>
        )}
      </div>

      {loading && (
        <p className="text-xs text-gray-500">Loading service metadata…</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {!loading && !error && metadata && (
        <div className="space-y-3">
          {metadata.serviceTitle &&
            metadata.serviceTitle !== metadata.layerTitle && (
              <MetadataBlock label="Service" value={metadata.serviceTitle} />
            )}
          <MetadataBlock label="Summary" value={metadata.summary} />
          <MetadataBlock label="Description" value={metadata.description} />
          <MetadataBlock label="Credits" value={metadata.credits} />
          <MetadataBlock
            label="Copyright"
            value={metadata.copyrightText}
          />
          <MetadataBlock
            label="Use limitations"
            value={metadata.useLimitations}
          />
          <MetadataBlock label="License" value={metadata.licenseInfo} />
        </div>
      )}

      {!loading && !error && !metadata && (
        <p className="text-sm text-gray-600">
          No ArcGIS metadata available for this layer.
        </p>
      )}
    </div>
  );
}
