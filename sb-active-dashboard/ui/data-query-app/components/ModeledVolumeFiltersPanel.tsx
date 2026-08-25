import YearSelector from "@/ui/components/filters/YearSelector";
import {
  ModeledVolumeFilterState,
} from "@/lib/data-query-app/modeledVolumeFilters";
import {
  MODELED_VOLUME_BINS,
  ModeledVolumeBin,
  ModeledVolumeModel,
} from "@/lib/data-query-app/modeledVolumeFields";

interface ModeledVolumeFiltersPanelProps {
  datasetTitle: string;
  model: ModeledVolumeModel;
  identityLabel?: string | null;
  filters: ModeledVolumeFilterState;
  availableYears: number[];
  activeField: string | null;
  loading: boolean;
  error: string | null;
  zoomTooLow?: boolean;
  featureCount?: number | null;
  activeResolution?: number | null;
  fullExtentLoaded?: boolean;
  onFiltersChange: (next: ModeledVolumeFilterState) => void;
  showHeader?: boolean;
}

export default function ModeledVolumeFiltersPanel({
  datasetTitle,
  model,
  identityLabel,
  filters,
  availableYears,
  activeField,
  loading,
  error,
  zoomTooLow = false,
  featureCount = null,
  activeResolution = null,
  fullExtentLoaded = false,
  onFiltersChange,
  showHeader = true,
}: ModeledVolumeFiltersPanelProps) {
  const toggleBin = (bin: ModeledVolumeBin) => {
    const has = filters.bins.includes(bin);
    const next = has
      ? filters.bins.filter((b) => b !== bin)
      : [...filters.bins, bin];
    onFiltersChange({ ...filters, bins: next });
  };

  return (
    <div id="modeled-volume-filters-panel" className="space-y-1">
      {showHeader && (
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-base font-medium text-gray-800">{datasetTitle}</h3>
          {identityLabel && (
            <p className="mt-0.5 text-xs text-gray-500">{identityLabel}</p>
          )}
        </div>
      )}

      <div className="px-4 pt-3">
        <p className="text-xs text-gray-500">
          Model and road user come from the catalog leaf. Choose the estimate
          year and which AADT bins to show on the map.
        </p>
        {activeField && (
          <p className="mt-1 font-mono text-[11px] text-gray-400">
            Field: {activeField}
          </p>
        )}
      </div>

      <YearSelector
        selectedYear={filters.year}
        onYearChange={(year) => onFiltersChange({ ...filters, year })}
        availableYears={availableYears}
        modelType={model}
      />

      <div className="px-4 pb-4">
        <h3 className="mb-2 text-base font-medium text-gray-700">AADT bins</h3>
        <div className="space-y-2 rounded-md bg-gray-100 p-3">
          {MODELED_VOLUME_BINS.map((bin) => {
            const checked = filters.bins.includes(bin);
            return (
              <label
                key={bin}
                className="flex cursor-pointer items-center gap-2 text-sm text-gray-800"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleBin(bin)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {bin}
              </label>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
        {loading ? (
          <span>
            {activeResolution === 9
              ? "Loading full H3 res 9 county…"
              : "Loading viewport features…"}
          </span>
        ) : error ? (
          <span className="text-red-600">{error}</span>
        ) : zoomTooLow ? (
          <span>
            Zoom in to load modeled volumes (hexagons ≥ z9, segments ≥ z12).
          </span>
        ) : (
          <span>
            {fullExtentLoaded
              ? "Full county loaded"
              : "Viewport features via OGC Features"}
            {featureCount != null
              ? ` · ${featureCount.toLocaleString()} features`
              : ""}
            {activeResolution != null ? ` · H3 res ${activeResolution}` : ""}
            {fullExtentLoaded
              ? ". Zoom in for res-10 hexes or segments at z16+."
              : ". Pan to load more."}
            {filters.bins.length < MODELED_VOLUME_BINS.length
              ? ` · bins: ${filters.bins.join(", ") || "none"}`
              : ""}
          </span>
        )}
      </div>
    </div>
  );
}
