import DateRangeSection from "@/ui/components/filters/DateRangeSection";
import RoadUserSection from "@/ui/volume-app/components/left-sidebar/RoadUserSection";
import {
  ALL_CONFLICT_TYPES,
  ALL_SEVERITY,
  CountSurveyGeoLevel,
  SafetyIncidentFilterState,
  SB_CITIES,
  SB_SERVICE_AREAS,
} from "@/lib/data-query-app/safetyIncidentFilters";
import { SafetyFilters } from "@/lib/safety-app/types";

interface SafetyIncidentFiltersPanelProps {
  datasetTitle: string;
  filters: SafetyIncidentFilterState;
  incidentCount: number | null;
  loading: boolean;
  error: string | null;
  onFiltersChange: (next: SafetyIncidentFilterState) => void;
  showHeader?: boolean;
  onClose?: () => void;
}

export default function SafetyIncidentFiltersPanel({
  datasetTitle,
  filters,
  incidentCount,
  loading,
  error,
  onFiltersChange,
  showHeader = true,
  onClose,
}: SafetyIncidentFiltersPanelProps) {
  const { geographic, filters: safetyFilters } = filters;

  const updateSafety = (partial: Partial<SafetyFilters>) => {
    onFiltersChange({
      ...filters,
      filters: { ...safetyFilters, ...partial },
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

  const severityTypes = safetyFilters.severityTypes || [...ALL_SEVERITY];
  const dataSources = safetyFilters.dataSource || ["SWITRS", "BikeMaps.org"];
  const conflictTypes = safetyFilters.conflictType || [...ALL_CONFLICT_TYPES];
  const severityFilterEnabled = safetyFilters.severityFilterEnabled === true;
  const dataSourceFilterEnabled = safetyFilters.dataSourceFilterEnabled === true;
  const conflictFilterEnabled = safetyFilters.conflictFilterEnabled === true;

  const setSeverityFilterEnabled = (enabled: boolean) => {
    updateSafety({
      severityFilterEnabled: enabled,
      ...(enabled && severityTypes.length === 0
        ? { severityTypes: [...ALL_SEVERITY] }
        : {}),
    });
  };

  const setDataSourceFilterEnabled = (enabled: boolean) => {
    updateSafety({
      dataSourceFilterEnabled: enabled,
      ...(enabled && dataSources.length === 0
        ? { dataSource: ["SWITRS", "BikeMaps.org"] as SafetyFilters["dataSource"] }
        : {}),
    });
  };

  const setConflictFilterEnabled = (enabled: boolean) => {
    updateSafety({
      conflictFilterEnabled: enabled,
      ...(enabled && conflictTypes.length === 0
        ? { conflictType: [...ALL_CONFLICT_TYPES] }
        : {}),
    });
  };

  const toggleSeverity = (severity: (typeof ALL_SEVERITY)[number]) => {
    const next = severityTypes.includes(severity)
      ? severityTypes.filter((s) => s !== severity)
      : [...severityTypes, severity];
    updateSafety({ severityTypes: next as SafetyFilters["severityTypes"] });
  };

  const toggleDataSource = (source: "SWITRS" | "BikeMaps.org") => {
    const next = dataSources.includes(source)
      ? dataSources.filter((s) => s !== source)
      : [...dataSources, source];
    updateSafety({ dataSource: next as SafetyFilters["dataSource"] });
  };

  const toggleConflict = (conflictType: string) => {
    const next = conflictTypes.includes(conflictType)
      ? conflictTypes.filter((c) => c !== conflictType)
      : [...conflictTypes, conflictType];
    updateSafety({ conflictType: next });
  };

  const dateRange = {
    startDate: safetyFilters.dateRange?.start || new Date(2020, 0, 1),
    endDate: safetyFilters.dateRange?.end || new Date(),
  };

  return (
    <div id="safety-incident-filters-panel" className="flex flex-col">
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

      <div className="overflow-y-auto no-scrollbar">
        <GeographicSelectSection
          level={geographic.level}
          placeName={geographic.placeName}
          onLevelChange={setGeoLevel}
          onPlaceChange={(placeName) =>
            onFiltersChange({
              ...filters,
              geographic: { ...geographic, placeName },
            })
          }
        />

        <hr className="border-gray-200" />

        <RoadUserSection
          activeTab="raw-data"
          showBicyclist={safetyFilters.showBicyclist !== false}
          setShowBicyclist={(show) => updateSafety({ showBicyclist: show })}
          showPedestrian={safetyFilters.showPedestrian !== false}
          setShowPedestrian={(show) => updateSafety({ showPedestrian: show })}
          selectedMode="bike"
          onModeChange={() => undefined}
        />

        <hr className="border-gray-200" />

        <DateRangeSection
          dateRange={dateRange}
          onDateRangeChange={(range) =>
            updateSafety({
              dateRange: { start: range.startDate, end: range.endDate },
            })
          }
          datasetBounds={{
            startOfPeriod: new Date("2013-01-01T00:00:00"),
            endOfPeriod: new Date(),
          }}
        />

        <hr className="border-gray-200" />

        <FilterCategorySection
          id="data-query-safety-severity"
          title="Severity of Incident"
          allIncludedLabel="All severities included."
          enabled={severityFilterEnabled}
          onEnabledChange={setSeverityFilterEnabled}
          items={ALL_SEVERITY.map((label) => ({
            id: label,
            label,
            checked: severityTypes.includes(label),
            onToggle: () => toggleSeverity(label),
          }))}
        />

        <hr className="border-gray-200" />

        <FilterCategorySection
          id="data-query-safety-source"
          title="Data Source"
          allIncludedLabel="All data sources included."
          enabled={dataSourceFilterEnabled}
          onEnabledChange={setDataSourceFilterEnabled}
          items={[
            {
              id: "SWITRS",
              label: "Police Reports (SWITRS)",
              checked: dataSources.includes("SWITRS"),
              onToggle: () => toggleDataSource("SWITRS"),
            },
            {
              id: "BikeMaps.org",
              label: "Self-Reports (BikeMaps.org)",
              checked: dataSources.includes("BikeMaps.org"),
              onToggle: () => toggleDataSource("BikeMaps.org"),
            },
          ]}
        />

        <hr className="border-gray-200" />

        <FilterCategorySection
          id="data-query-safety-conflict"
          title="Conflict Type"
          allIncludedLabel="All conflict types included."
          enabled={conflictFilterEnabled}
          onEnabledChange={setConflictFilterEnabled}
          items={ALL_CONFLICT_TYPES.map((label) => ({
            id: label,
            label,
            checked: conflictTypes.includes(label),
            onToggle: () => toggleConflict(label),
          }))}
        />

        <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          {loading && <p>Updating incidents…</p>}
          {!loading && error && <p className="text-red-600">{error}</p>}
          {!loading && !error && typeof incidentCount === "number" && (
            <p>
              {incidentCount.toLocaleString()} incident
              {incidentCount === 1 ? "" : "s"} match filters
            </p>
          )}
          {!loading && !error && incidentCount === null && (
            <p>Turn on the layer to apply these filters on the map.</p>
          )}
        </div>
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
    <div id="safety-incident-geographic-section" className="px-4 py-4">
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
              name="safety-incident-geo-level"
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
          Showing incidents across Santa Barbara County.
        </p>
      )}
      {placeOptions.length > 0 && (
        <div className="mt-3">
          <label
            htmlFor="safety-incident-place-select"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            {level === "city" ? "City" : "Service area"}
          </label>
          <select
            id="safety-incident-place-select"
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

function FilterCategorySection({
  id,
  title,
  allIncludedLabel,
  enabled,
  onEnabledChange,
  items,
}: {
  id: string;
  title: string;
  allIncludedLabel: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  items: Array<{
    id: string;
    label: string;
    checked: boolean;
    onToggle: () => void;
  }>;
}) {
  return (
    <div id={id} className="px-4 py-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-medium text-gray-700">{title}</h3>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`Filter by ${title}`}
          onClick={() => onEnabledChange(!enabled)}
          className={`flex h-5 w-8 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all ${
            enabled ? "justify-end bg-blue-500" : "justify-start bg-gray-300"
          }`}
        >
          <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
        </button>
      </div>
      {enabled ? (
        <div className="space-y-1.5 pl-1">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={item.onToggle}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="leading-snug">{item.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">{allIncludedLabel}</p>
      )}
    </div>
  );
}
