import DateRangeSection from "../../components/filters/DateRangeSection";
import YearSelector from "../../components/filters/YearSelector";
import GeographicLevelSection, { SchoolDistrictFilter } from "../../components/filters/GeographicLevelSection";
import ModelCountTypeSection from "../components/left-sidebar/ModelCountTypeSection";
import RoadUserSection from "../components/left-sidebar/RoadUserSection";
import SortDataSection from "../components/left-sidebar/SortDataSection";
import SiteCountHistory from "../components/left-sidebar/SiteCountHistory";
import VolumeTemporalFilters from "../components/left-sidebar/VolumeTemporalFilters";
import { VolumeSiteQueryFilters } from "../../../lib/volume-app/siteTemporalQuery";

/** Temporary: hide geographic selection until the raw-data flow is stable. */
const SHOW_GEOGRAPHIC_LEVEL = false;

interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

interface VolumeLeftSidebarProps {
  activeTab: string;
  showBicyclist: boolean;
  setShowBicyclist: (show: boolean) => void;
  showPedestrian: boolean;
  setShowPedestrian: (show: boolean) => void;
  selectedMode: 'bike' | 'ped';
  onModeChange: (mode: 'bike' | 'ped') => void;
  modelCountsBy: string;
  setModelCountsBy: (type: string) => void;
  geographicLevel: string;
  onGeographicLevelChange: (level: string) => void;
  schoolDistrictFilter?: SchoolDistrictFilter;
  onSchoolDistrictFilterChange?: (filter: SchoolDistrictFilter) => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (dateRange: DateRangeValue) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  siteFilters: VolumeSiteQueryFilters;
  availableYears: number[];
  onSiteFiltersChange: (filters: Partial<Pick<VolumeSiteQueryFilters, "years" | "weekdayFilter">>) => void;
  selectedCountSite?: string | null;
  selectedSiteName?: string | null;
  onClearSelectedSite?: () => void;
  siteCount?: number;
  sitesError?: string | null;
}

export default function VolumeLeftSidebar({ 
  activeTab,
  showBicyclist,
  setShowBicyclist,
  showPedestrian,
  setShowPedestrian,
  selectedMode,
  onModeChange,
  modelCountsBy,
  setModelCountsBy,
  geographicLevel,
  onGeographicLevelChange,
  schoolDistrictFilter,
  onSchoolDistrictFilterChange,
  dateRange,
  onDateRangeChange,
  selectedYear,
  onYearChange,
  siteFilters,
  availableYears,
  onSiteFiltersChange,
  selectedCountSite,
  selectedSiteName,
  onClearSelectedSite,
  siteCount,
  sitesError,
}: VolumeLeftSidebarProps) {
  return (
    <div id="volume-filters-sidebar" className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
      <SortDataSection />
      {activeTab === 'raw-data' && (
        <>
          <SiteCountHistory
            siteId={selectedCountSite ?? null}
            siteName={selectedSiteName}
            filters={siteFilters}
            onClear={onClearSelectedSite}
          />
        </>
      )}
      {SHOW_GEOGRAPHIC_LEVEL && (
        <>
          <hr className="border-gray-200" />
          <GeographicLevelSection 
            geographicLevel={geographicLevel}
            onGeographicLevelChange={onGeographicLevelChange}
            schoolDistrictFilter={schoolDistrictFilter}
            onSchoolDistrictFilterChange={onSchoolDistrictFilterChange}
          />
          {geographicLevel === 'custom' && (
            <>
              <hr className="border-gray-200" />
              <div
                id="custom-draw-tool-instructions"
                className="p-4 bg-blue-100 border-l-4 border-blue-500"
              >
                <h3 className="text-base font-medium text-gray-900">Custom Draw Tool</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Click on the map to draw a custom area. Click the first point again to complete the polygon.
                </p>
              </div>
            </>
          )}
          <hr className="border-gray-200" />
        </>
      )}
      {activeTab === 'modeled-data' && (
        <>
          <ModelCountTypeSection 
            modelCountsBy={modelCountsBy}
            setModelCountsBy={setModelCountsBy}
          />
          <hr className="border-gray-200" />
        </>
      )}
      <RoadUserSection 
        activeTab={activeTab}
        showBicyclist={showBicyclist}
        setShowBicyclist={setShowBicyclist}
        showPedestrian={showPedestrian}
        setShowPedestrian={setShowPedestrian}
        selectedMode={selectedMode}
        onModeChange={onModeChange}
      />
      <hr className="border-gray-200" />
      {activeTab === 'modeled-data' ? (
        <YearSelector 
          selectedYear={selectedYear}
          onYearChange={onYearChange}
          modelType={modelCountsBy}
        />
      ) : (
        <>
          {activeTab === 'raw-data' && (
            <>
              <VolumeTemporalFilters
                filters={siteFilters}
                availableYears={availableYears}
                onFiltersChange={onSiteFiltersChange}
              />
              <hr className="border-gray-200" />
              {typeof siteCount === "number" && (
                <div className="px-4 pb-2 text-xs text-gray-500">
                  {sitesError ? sitesError : `${siteCount} survey site${siteCount === 1 ? "" : "s"} shown`}
                </div>
              )}
            </>
          )}
          <DateRangeSection 
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
        </>
      )}
    </div>
  );
}
