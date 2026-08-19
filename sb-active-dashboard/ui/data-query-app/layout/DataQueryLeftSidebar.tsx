import { useState } from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PanelEdgeToggle from "@/ui/data-query-app/components/PanelEdgeToggle";
import {
  CatalogCategoryNode,
  CatalogDataset,
  datasetDisplayTitle,
} from "@/lib/data-services/CatalogApiService";

interface DataQueryLeftSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  tree: CatalogCategoryNode[];
  loading: boolean;
  error: string | null;
  enabledIds: Set<number>;
  layerErrors: Record<number, string>;
  onToggleDataset: (datasetId: number, enabled: boolean) => void;
  onRefresh?: () => void;
  activeFilterDatasetId?: number | null;
  onOpenDatasetPanel?: (dataset: CatalogDataset) => void;
}

function CategorySection({
  node,
  depth,
  enabledIds,
  layerErrors,
  onToggleDataset,
  activeFilterDatasetId,
  onOpenDatasetPanel,
}: {
  node: CatalogCategoryNode;
  depth: number;
  enabledIds: Set<number>;
  layerErrors: Record<number, string>;
  onToggleDataset: (datasetId: number, enabled: boolean) => void;
  activeFilterDatasetId?: number | null;
  onOpenDatasetPanel?: (dataset: CatalogDataset) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const datasets = node.datasets || [];
  const children = node.children || [];
  const enabledCount = datasets.filter((ds) => enabledIds.has(ds.id)).length;

  return (
    <div className="mb-2" style={{ marginLeft: depth > 0 ? 8 : 0 }}>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded bg-white px-1 py-1.5 text-left text-gray-900 hover:bg-gray-50"
        style={{ backgroundColor: "#ffffff", color: "#111827" }}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="w-4 text-center text-xs text-gray-500">
          {expanded ? "▾" : "▸"}
        </span>
        <span className="flex-1 text-sm font-semibold text-gray-900">
          {node.name}
        </span>
        <span className="text-xs text-gray-400">
          {enabledCount > 0 ? `${enabledCount}/` : ""}
          {datasets.length}
        </span>
      </button>

      {expanded && (
        <div className="ml-3 border-l border-gray-100 pl-2">
          {datasets.map((dataset) => (
            <DatasetToggleRow
              key={dataset.id}
              dataset={dataset}
              enabled={enabledIds.has(dataset.id)}
              error={layerErrors[dataset.id]}
              onToggle={onToggleDataset}
              panelActive={activeFilterDatasetId === dataset.id}
              onOpenPanel={onOpenDatasetPanel}
            />
          ))}
          {children.map((child) => (
            <CategorySection
              key={child.id}
              node={child}
              depth={depth + 1}
              enabledIds={enabledIds}
              layerErrors={layerErrors}
              onToggleDataset={onToggleDataset}
              activeFilterDatasetId={activeFilterDatasetId}
              onOpenDatasetPanel={onOpenDatasetPanel}
            />
          ))}
          {datasets.length === 0 && children.length === 0 && (
            <p className="px-1 py-1 text-xs text-gray-400">No layers</p>
          )}
        </div>
      )}
    </div>
  );
}

function DatasetToggleRow({
  dataset,
  enabled,
  error,
  onToggle,
  panelActive,
  onOpenPanel,
}: {
  dataset: CatalogDataset;
  enabled: boolean;
  error?: string;
  onToggle: (datasetId: number, enabled: boolean) => void;
  panelActive?: boolean;
  onOpenPanel?: (dataset: CatalogDataset) => void;
}) {
  const title = datasetDisplayTitle(dataset);
  const badges: string[] = [];
  if (dataset.has_feature_server) badges.push("Feature");
  if (dataset.has_map_server) badges.push("Map");
  if (dataset.has_image_server) badges.push("Image");
  if (dataset.has_ogc_features) badges.push("OGC");

  return (
    <div
      className={`rounded px-1 py-1.5 ${
        panelActive ? "bg-blue-50/70 ring-1 ring-blue-200" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-0 p-0 hover:bg-gray-100"
          style={{
            backgroundColor: "transparent",
            color: enabled ? "#2563eb" : "#9ca3af",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(dataset.id, !enabled);
          }}
          aria-pressed={enabled}
          aria-label={enabled ? `Hide ${title}` : `Show ${title}`}
          title={enabled ? "Hide layer" : "Show layer"}
        >
          {enabled ? (
            <VisibilityIcon sx={{ fontSize: 18 }} />
          ) : (
            <VisibilityOffIcon sx={{ fontSize: 18 }} />
          )}
        </button>

        <button
          type="button"
          className="min-w-0 flex-1 rounded border-0 p-0 text-left"
          style={{ backgroundColor: "transparent", color: "inherit" }}
          onClick={() => onOpenPanel?.(dataset)}
          title={`Open panel for ${title}`}
        >
          <span className="block text-sm font-medium text-gray-800">
            {title}
          </span>
          {dataset.description && (
            <span className="mt-0.5 block text-xs text-gray-500 line-clamp-2">
              {dataset.description}
            </span>
          )}
          {badges.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-1">
              {badges.map((b) => (
                <span
                  key={b}
                  className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
                >
                  {b}
                </span>
              ))}
            </span>
          )}
          {error && (
            <span className="mt-1 block text-xs text-red-600">{error}</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function DataQueryLeftSidebar({
  isCollapsed,
  onToggle,
  tree,
  loading,
  error,
  enabledIds,
  layerErrors,
  onToggleDataset,
  onRefresh,
  activeFilterDatasetId,
  onOpenDatasetPanel,
}: DataQueryLeftSidebarProps) {
  if (isCollapsed) {
    return (
      <div
        id="data-query-left-sidebar-collapsed"
        className="relative z-30 h-full w-0 flex-shrink-0 overflow-visible"
      >
        <PanelEdgeToggle
          id="data-query-left-expand-icon"
          side="left"
          isCollapsed={true}
          onClick={onToggle}
        />
      </div>
    );
  }

  return (
    <div
      id="data-query-left-sidebar"
      className="relative z-20 flex h-full w-80 flex-shrink-0 flex-col border-r border-gray-200 bg-white"
    >
      <PanelEdgeToggle
        id="data-query-left-collapse-icon"
        side="left"
        isCollapsed={false}
        onClick={onToggle}
      />

      <div
        id="data-query-left-sidebar-header"
        className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-4"
      >
        <h2 id="data-query-layers-title" className="text-xl font-semibold text-gray-900">
          Layers
        </h2>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              style={{ backgroundColor: "#ffffff", color: "#374151" }}
              title="Refresh catalog"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      <div
        id="data-query-left-sidebar-content"
        className="flex-1 overflow-y-auto px-3 py-3 no-scrollbar"
      >
        {loading && (
          <p className="px-1 text-sm text-gray-500">Loading catalog layers…</p>
        )}

        {!loading && error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && tree.length === 0 && (
          <p className="px-1 text-sm text-gray-500">
            No visible catalog layers yet. Add datasets under categories in the
            management app Catalog tab.
          </p>
        )}

        {!loading &&
          tree.map((node) => (
            <CategorySection
              key={node.id}
              node={node}
              depth={0}
              enabledIds={enabledIds}
              layerErrors={layerErrors}
              onToggleDataset={onToggleDataset}
              activeFilterDatasetId={activeFilterDatasetId}
              onOpenDatasetPanel={onOpenDatasetPanel}
            />
          ))}
      </div>
    </div>
  );
}
