import DateRangeSection from "@/ui/components/filters/DateRangeSection";
import RoadUserSection from "@/ui/volume-app/components/left-sidebar/RoadUserSection";
import VolumeTemporalFilters from "@/ui/volume-app/components/left-sidebar/VolumeTemporalFilters";
import {
  CountSurveyFilterState,
  CountSurveyGeoLevel,
  SB_CITIES,
  SB_SERVICE_AREAS,
} from "@/lib/data-query-app/countSurveyFilters";
import {
  SurveyLengthPreset,
  VolumeSiteQueryFilters,
} from "@/lib/volume-app/siteTemporalQuery";

interface CountSurveyFiltersPanelProps {
  datasetTitle: string;
  filters: CountSurveyFilterState;
  availableYears: number[];
  siteCount: number | null;
  loading: boolean;
  error: string | null;
  onFiltersChange: (next: CountSurveyFilterState) => void;
  showHeader?: boolean;
  onClose?: () => void;
}

export default function CountSurveyFiltersPanel({
  datasetTitle,
  filters,
  availableYears,
  siteCount,
  loading,
  error,
  onFiltersChange,
  showHeader = true,
  onClose,
}: CountSurveyFiltersPanelProps) {
  const { geographic, siteFilters } = filters;

  const updateSiteFilters = (
    partial: Partial<VolumeSiteQueryFilters>
  ) => {
    onFiltersChange({
      ...filters,
      siteFilters: { ...siteFilters, ...partial },
    });
  };

  const setGeoLevel = (level: CountSurveyGeoLevel) => {
    const placeName =
      level === "city"
        ? geographic.level === "city" && geographic.placeName
          ? geographic.placeName
          : SB_CITIES[0]
        : level === "service-area"
          ? geographic.level === "service-area" && geographic.placeName
            ? geographic.placeName
            : SB_SERVICE_AREAS[0]
          : null;

    onFiltersChange({
      ...filters,
      geographic: { level, placeName },
    });
  };

  const setPlaceName = (placeName: string) => {
    onFiltersChange({
      ...filters,
      geographic: { ...geographic, placeName },
    });
  };

  return (
    <div id="count-survey-filters-panel" className="flex flex-col">
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
        <GeographicSelectSection
          level={geographic.level}
          placeName={geographic.placeName}
          onLevelChange={setGeoLevel}
          onPlaceChange={setPlaceName}
        />

        <hr className="border-gray-200" />

        <RoadUserSection
          activeTab="raw-data"
          showBicyclist={siteFilters.showBicyclist}
          setShowBicyclist={(show) => updateSiteFilters({ showBicyclist: show })}
          showPedestrian={siteFilters.showPedestrian}
          setShowPedestrian={(show) => updateSiteFilters({ showPedestrian: show })}
          selectedMode="bike"
          onModeChange={() => undefined}
        />

        <hr className="border-gray-200" />

        <VolumeTemporalFilters
          filters={siteFilters}
          availableYears={availableYears}
          onFiltersChange={(partial) => updateSiteFilters(partial)}
        />

        <hr className="border-gray-200" />

        <SurveyLengthSection
          value={siteFilters.surveyLength || "any"}
          onChange={(surveyLength) => updateSiteFilters({ surveyLength })}
        />

        <hr className="border-gray-200" />

        <DateRangeSection
          dateRange={siteFilters.dateRange}
          onDateRangeChange={(dateRange) => updateSiteFilters({ dateRange })}
        />

        <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          {loading && <p>Updating survey sites…</p>}
          {!loading && error && <p className="text-red-600">{error}</p>}
          {!loading && !error && typeof siteCount === "number" && (
            <p>
              {siteCount} survey site{siteCount === 1 ? "" : "s"} shown
            </p>
          )}
          {!loading && !error && siteCount === null && (
            <p>Turn on the layer to apply these filters on the map.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SurveyLengthSection({
  value,
  onChange,
}: {
  value: SurveyLengthPreset;
  onChange: (value: SurveyLengthPreset) => void;
}) {
  const options: Array<{ id: SurveyLengthPreset; label: string }> = [
    { id: "any", label: "Any length" },
    { id: "week", label: "≥ 1 week" },
    { id: "month", label: "≥ 1 month" },
    { id: "quarter", label: "≥ 3 months" },
  ];

  return (
    <div id="count-survey-length-section" className="px-4 py-4">
      <h3 className="mb-1 text-base font-medium text-gray-700">Survey length</h3>
      <p className="mb-3 text-xs text-gray-500">
        Minimum AADT coverage window (end date − start date).
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded px-2 py-1 text-xs font-medium ${
              value === option.id
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            style={{
              backgroundColor: value === option.id ? "#3b82f6" : "#f3f4f6",
              color: value === option.id ? "#ffffff" : "#374151",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function GeographicSelectSection({
  level,
  placeName,
  onLevelChange,
  onPlaceChange,
}: {
  level: CountSurveyGeoLevel;
  placeName: string | null;
  onLevelChange: (level: CountSurveyGeoLevel) => void;
  onPlaceChange: (placeName: string) => void;
}) {
  const options: Array<{ id: CountSurveyGeoLevel; label: string }> = [
    { id: "county", label: "County" },
    { id: "city", label: "City" },
    { id: "service-area", label: "Service Area" },
  ];

  const placeOptions =
    level === "city" ? SB_CITIES : level === "service-area" ? SB_SERVICE_AREAS : [];

  return (
    <div id="count-survey-geographic-section" className="px-4 py-4">
      <h3 className="mb-1 text-base font-medium text-gray-700">
        Geographic Extent
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
          >
            <input
              type="radio"
              name="count-survey-geo-level"
              className="sr-only"
              checked={level === option.id}
              onChange={() => onLevelChange(option.id)}
            />
            <span
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                level === option.id
                  ? "border-blue-500 bg-blue-500"
                  : "border-gray-400 bg-transparent"
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
          Showing sites across Santa Barbara County.
        </p>
      )}

      {placeOptions.length > 0 && (
        <div className="mt-3">
          <label
            htmlFor="count-survey-place-select"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            {level === "city" ? "City" : "Service area"}
          </label>
          <select
            id="count-survey-place-select"
            value={placeName || placeOptions[0]}
            onChange={(e) => onPlaceChange(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {placeOptions.map((name) => (
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
