import {
  DayType,
  VolumeSiteQueryFilters,
} from "@/lib/volume-app/siteTemporalQuery";

interface VolumeTemporalFiltersProps {
  filters: VolumeSiteQueryFilters;
  availableYears: number[];
  onFiltersChange: (filters: Partial<Pick<VolumeSiteQueryFilters, "years" | "weekdayFilter">>) => void;
}

const DEFAULT_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

export default function VolumeTemporalFilters({
  filters,
  availableYears,
  onFiltersChange,
}: VolumeTemporalFiltersProps) {
  const years = availableYears.length > 0 ? availableYears : DEFAULT_YEARS;

  const toggleYear = (year: number) => {
    const selected = filters.years.includes(year)
      ? filters.years.filter((item) => item !== year)
      : [...filters.years, year].sort();
    onFiltersChange({ years: selected });
  };

  return (
    <>
      <YearFilterSection
        years={years}
        selectedYears={filters.years}
        onToggleYear={toggleYear}
        onClear={() => onFiltersChange({ years: [] })}
      />
      <hr className="border-gray-200" />
      <WeekdaysWeekendsSection
        enabled={filters.weekdayFilter.enabled}
        types={filters.weekdayFilter.types}
        onChange={(weekdayFilter) => onFiltersChange({ weekdayFilter })}
      />
    </>
  );
}

function YearFilterSection({
  years,
  selectedYears,
  onToggleYear,
  onClear,
}: {
  years: number[];
  selectedYears: number[];
  onToggleYear: (year: number) => void;
  onClear: () => void;
}) {
  return (
    <div id="volume-year-filter-section" className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-gray-700">Survey Years</h3>
        {selectedYears.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            All years
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-2">
        {selectedYears.length === 0
          ? "Showing sites from all years."
          : "Showing sites with counts in the selected years."}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {years.map((year) => {
          const selected = selectedYears.includes(year);
          return (
            <button
              key={year}
              type="button"
              id={`volume-year-filter-${year}`}
              onClick={() => onToggleYear(year)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors focus:outline-none ${
                selected
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekdaysWeekendsSection({
  enabled,
  types,
  onChange,
}: {
  enabled: boolean;
  types: DayType[];
  onChange: (value: VolumeSiteQueryFilters["weekdayFilter"]) => void;
}) {
  const options: Array<{ id: DayType; label: string }> = [
    { id: "weekdays", label: "Weekdays" },
    { id: "weekends", label: "Weekends" },
  ];

  const toggleType = (type: DayType) => {
    const nextTypes = types.includes(type)
      ? types.filter((item) => item !== type)
      : [...types, type];
    onChange({
      enabled: true,
      types: nextTypes.length === 0 ? [type] : nextTypes,
    });
  };

  return (
    <div id="volume-weekdays-weekends-section" className="px-4 py-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-base font-medium text-gray-700 ${enabled ? "mb-3" : ""}`}>
          Weekdays vs Weekends
        </h3>
        <Toggle
          enabled={enabled}
          onToggle={() => onChange({ enabled: !enabled, types })}
          id="volume-weekdays-weekends-toggle"
        />
      </div>
      {enabled && (
        <div className="bg-gray-100 p-2 rounded-md flex gap-1">
          {options.map((option) => {
            const selected = types.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                id={`volume-day-type-${option.id}`}
                onClick={() => toggleType(option.id)}
                className={`flex-1 px-1.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none ${
                  selected ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Toggle({
  enabled,
  onToggle,
  id,
}: {
  enabled: boolean;
  onToggle: () => void;
  id: string;
}) {
  return (
    <div
      id={id}
      onClick={onToggle}
      className={`w-8 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-all duration-200 ${
        enabled ? "bg-blue-500 justify-end" : "bg-gray-300 justify-start"
      }`}
    >
      <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
    </div>
  );
}
