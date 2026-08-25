import { useEffect } from "react";
import {
  BicycleComfortFilterState,
  BicycleComfortGeoLevel,
  defaultPlaceNameForGeoLevel,
} from "@/lib/data-query-app/bicycleComfortMapFilters";
import FilterCategorySection from "@/ui/data-query-app/components/FilterCategorySection";

interface BicycleComfortMapFiltersPanelProps {
  datasetTitle: string;
  filters: BicycleComfortFilterState;
  availableCategories: string[];
  categoriesLoading?: boolean;
  featureCount: number | null;
  jurisdictionPlaces?: string[];
  jurisdictionPlacesLoading?: boolean;
  loading: boolean;
  error: string | null;
  onFiltersChange: (next: BicycleComfortFilterState) => void;
  showHeader?: boolean;
  onClose?: () => void;
}

const PANEL_LIGHT_STYLE = {
  colorScheme: "light" as const,
  backgroundColor: "#ffffff",
  color: "#111827",
};

export default function BicycleComfortMapFiltersPanel({
  datasetTitle,
  filters,
  availableCategories,
  categoriesLoading = false,
  featureCount,
  jurisdictionPlaces = [],
  jurisdictionPlacesLoading = false,
  loading,
  error,
  onFiltersChange,
  showHeader = true,
  onClose,
}: BicycleComfortMapFiltersPanelProps) {
  const { geographic, categoryFilterEnabled, selectedCategories } = filters;

  const setGeoLevel = (level: BicycleComfortGeoLevel) => {
    onFiltersChange({
      ...filters,
      geographic: {
        level,
        placeName: defaultPlaceNameForGeoLevel(level, geographic),
      },
    });
  };

  const setPlaceName = (placeName: string) => {
    onFiltersChange({
      ...filters,
      geographic: { ...geographic, placeName },
    });
  };

  const setCategoryFilterEnabled = (enabled: boolean) => {
    onFiltersChange({
      ...filters,
      categoryFilterEnabled: enabled,
      selectedCategories:
        enabled && selectedCategories.length === 0
          ? [...availableCategories]
          : selectedCategories,
    });
  };

  const toggleCategory = (category: string) => {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((value) => value !== category)
      : [...selectedCategories, category];
    onFiltersChange({
      ...filters,
      categoryFilterEnabled: true,
      selectedCategories: next,
    });
  };

  const showPlacePicker =
    geographic.level === "city" || geographic.level === "service-area";

  useEffect(() => {
    if (
      showPlacePicker &&
      !geographic.placeName &&
      jurisdictionPlaces.length > 0 &&
      !jurisdictionPlacesLoading
    ) {
      onFiltersChange({
        ...filters,
        geographic: {
          ...geographic,
          placeName: jurisdictionPlaces[0],
        },
      });
    }
  }, [
    showPlacePicker,
    geographic.level,
    geographic.placeName,
    jurisdictionPlaces,
    jurisdictionPlacesLoading,
    onFiltersChange,
    filters,
    geographic,
  ]);

  return (
    <div
      id="bicycle-comfort-map-filters-panel"
      className="flex flex-col"
      style={PANEL_LIGHT_STYLE}
    >
      {showHeader && (
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Filters
            </p>
            <h3 className="truncate text-base font-semibold text-gray-900">
              {datasetTitle}
            </h3>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              style={{ backgroundColor: "#ffffff", color: "#4b5563" }}
            >
              Close
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <GeographicSection
          level={geographic.level}
          placeName={geographic.placeName}
          jurisdictionPlaces={jurisdictionPlaces}
          jurisdictionPlacesLoading={jurisdictionPlacesLoading}
          onLevelChange={setGeoLevel}
          onPlaceChange={setPlaceName}
        />

        <hr className="border-gray-200" />

        {categoriesLoading ? (
          <div className="px-4 py-4">
            <p className="text-sm text-gray-500">Loading infrastructure classes…</p>
          </div>
        ) : (
          <FilterCategorySection
            id="bicycle-comfort-category-section"
            title="Infrastructure class"
            allIncludedLabel="All infrastructure classes included."
            enabled={categoryFilterEnabled}
            onEnabledChange={setCategoryFilterEnabled}
            items={availableCategories.map((category) => ({
              id: category,
              label: category,
              checked: selectedCategories.includes(category),
              onToggle: () => toggleCategory(category),
            }))}
          />
        )}

        <p className="px-4 pb-2 text-xs text-gray-500">
          Field: <span className="font-mono">class_export</span>
        </p>

        <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
          {loading && <p>Applying filters…</p>}
          {!loading && error && <p className="text-red-600">{error}</p>}
          {!loading && !error && featureCount != null && (
            <p>
              <strong>{featureCount.toLocaleString()}</strong> road segments
              match
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function GeographicSection({
  level,
  placeName,
  jurisdictionPlaces,
  jurisdictionPlacesLoading,
  onLevelChange,
  onPlaceChange,
}: {
  level: BicycleComfortGeoLevel;
  placeName: string | null;
  jurisdictionPlaces: string[];
  jurisdictionPlacesLoading: boolean;
  onLevelChange: (level: BicycleComfortGeoLevel) => void;
  onPlaceChange: (placeName: string) => void;
}) {
  const options: Array<{ id: BicycleComfortGeoLevel; label: string }> = [
    { id: "county", label: "Full county" },
    { id: "extent", label: "Map extent" },
    { id: "city", label: "City" },
    { id: "service-area", label: "Service area" },
  ];

  const showPlacePicker = level === "city" || level === "service-area";

  return (
    <div id="bicycle-comfort-geographic-section" className="px-4 py-4">
      <h3 className="mb-1 text-base font-medium text-gray-700">
        Geographic extent
      </h3>
      <p className="mb-3 text-xs text-gray-500">
        Choose an area in this panel. Boundaries are not drawn or clickable on
        the map.
      </p>

      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm ${
              level === option.id
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            style={{
              backgroundColor:
                level === option.id ? "#eff6ff" : "#ffffff",
              color: level === option.id ? "#1d4ed8" : "#374151",
            }}
          >
            <input
              type="radio"
              name="bicycle-comfort-geo-level"
              className="sr-only"
              checked={level === option.id}
              onChange={() => onLevelChange(option.id)}
            />
            <span
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                level === option.id
                  ? "border-blue-500 bg-blue-500"
                  : "border-gray-400 bg-white"
              }`}
            >
              {level === option.id && (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </span>
            {option.label}
          </label>
        ))}
      </div>

      {level === "county" && (
        <p className="mt-3 text-xs text-gray-500">
          Showing road segments across Santa Barbara County.
        </p>
      )}

      {level === "extent" && (
        <p className="mt-3 text-xs text-gray-500">
          Showing segments in the current map view. Pan or zoom to update.
        </p>
      )}

      {showPlacePicker && (
        <div className="mt-3">
          <label
            htmlFor="bicycle-comfort-place-select"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            {level === "city" ? "City" : "Service area"}
          </label>
          <select
            id="bicycle-comfort-place-select"
            value={placeName ?? ""}
            onChange={(e) => onPlaceChange(e.target.value)}
            disabled={
              jurisdictionPlacesLoading || jurisdictionPlaces.length === 0
            }
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ backgroundColor: "#ffffff", color: "#111827" }}
          >
            {jurisdictionPlacesLoading && (
              <option value="">Loading places…</option>
            )}
            {!jurisdictionPlacesLoading && jurisdictionPlaces.length === 0 && (
              <option value="">No places found</option>
            )}
            {jurisdictionPlaces.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
