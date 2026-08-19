import { useEffect, useMemo, useState } from "react";
import { useSelection } from "../../lib/hooks/useSelection";
import { useVolumeAppStore } from "../../lib/stores/volume-app-state";
import VolumeMap from "./components/map/VolumeMap";
import VolumeLeftSidebar from "./layout/VolumeLeftSidebar";
import VolumeRightSidebar from "./layout/VolumeRightSidebar";
import VolumeSubHeader from "./layout/VolumeSubHeader";
import DisclaimerModal from "../components/DisclaimerModal";
import VolumeDataDisclaimer from "../components/VolumeDataDisclaimer";
import { SchoolDistrictFilter } from "../components/filters/GeographicLevelSection";
import { fetchVolumeSurveySites } from "../../lib/data-services/VolumeSitesApiService";
import {
  DEFAULT_VOLUME_SITE_FILTERS,
  VolumeSite,
  VolumeSiteQueryFilters,
} from "../../lib/volume-app/siteTemporalQuery";

const getToday = () => new Date();

export default function VolumeApp() {
  const [activeTab, setActiveTab] = useState('raw-data');
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  const { selectedGeometry, selectedAreaName, onSelectionChange } = useSelection();
  
  const { 
    selectedCountSite, 
    highlightedBinSites, 
    setSelectedCountSite, 
    setMapView: setStoreMapView 
  } = useVolumeAppStore();
  
  const [showBicyclist, setShowBicyclist] = useState(true);
  const [showPedestrian, setShowPedestrian] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'bike' | 'ped'>('bike');
  const [modelCountsBy, setModelCountsBy] = useState<string>("cost-benefit");
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const [aadtLayer, setAadtLayer] = useState<__esri.FeatureLayer | null>(null);
  const [geographicLevel, setGeographicLevel] = useState('county');
  const [schoolDistrictFilter, setSchoolDistrictFilter] = useState<SchoolDistrictFilter>({ gradeFilter: 'high-school' });
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(2020, 0, 1),
    endDate: getToday(),
  });

  const [selectedYear, setSelectedYear] = useState(2023);
  const [years, setYears] = useState<number[]>(DEFAULT_VOLUME_SITE_FILTERS.years);
  const [weekdayFilter, setWeekdayFilter] = useState(DEFAULT_VOLUME_SITE_FILTERS.weekdayFilter);
  const [timeOfDay, setTimeOfDay] = useState(DEFAULT_VOLUME_SITE_FILTERS.timeOfDay);
  const [surveySites, setSurveySites] = useState<VolumeSite[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [sitesLoading, setSitesLoading] = useState(false);

  const siteFilters: VolumeSiteQueryFilters = useMemo(() => ({
    years,
    weekdayFilter,
    timeOfDay,
    showBicyclist,
    showPedestrian,
    dateRange,
  }), [years, weekdayFilter, timeOfDay, showBicyclist, showPedestrian, dateRange]);

  useEffect(() => {
    if (activeTab !== "raw-data") return;

    let cancelled = false;
    setSitesLoading(true);
    setSitesError(null);

    const handle = window.setTimeout(() => {
      fetchVolumeSurveySites(siteFilters)
        .then((result) => {
          if (cancelled) return;
          setSurveySites(result.sites);
          if (result.availableYears.length > 0) {
            setAvailableYears(result.availableYears);
          }
          if (!result.fromApi) {
            setSitesError("Live volume API is unavailable; showing sites from the feature service when possible.");
          }
        })
        .catch((error: Error) => {
          if (cancelled) return;
          setSurveySites([]);
          setSitesError(error.message || "Failed to load count survey sites.");
        })
        .finally(() => {
          if (!cancelled) setSitesLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [activeTab, siteFilters]);

  const selectedSiteName = useMemo(() => {
    if (!selectedCountSite) return null;
    return surveySites.find((site) => String(site.id) === selectedCountSite)?.name || null;
  }, [selectedCountSite, surveySites]);

  useEffect(() => {
    if (!selectedCountSite) return;
    const stillVisible = surveySites.some((site) => String(site.id) === selectedCountSite);
    if (!stillVisible && surveySites.length > 0) {
      setSelectedCountSite(null);
    }
  }, [surveySites, selectedCountSite, setSelectedCountSite]);

  const handleMapViewReady = (view: __esri.MapView) => {
    setMapView(view);
    setStoreMapView(view);
  };

  const handleCountSiteSelect = (siteId: string | null) => {
    setSelectedCountSite(siteId);
  };

  const handleSiteFiltersChange = (
    next: Partial<Pick<VolumeSiteQueryFilters, "years" | "weekdayFilter">>
  ) => {
    if (next.years !== undefined) setYears(next.years);
    if (next.weekdayFilter) setWeekdayFilter(next.weekdayFilter);
  };

  return (
    <>
      <DisclaimerModal
        id="volume-data-disclaimer"
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
        title="Volume Data Information"
      >
        <VolumeDataDisclaimer />
      </DisclaimerModal>

      <div id="volumes-page" className="flex flex-col h-full bg-white">
        <VolumeSubHeader activeTab={activeTab} onTabChange={setActiveTab} />
        <div id="volume-main-content" className="flex flex-1 overflow-hidden">
        <VolumeLeftSidebar 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          setShowBicyclist={setShowBicyclist}
          showPedestrian={showPedestrian}
          setShowPedestrian={setShowPedestrian}
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          modelCountsBy={modelCountsBy}
          setModelCountsBy={setModelCountsBy}
          geographicLevel={geographicLevel}
          onGeographicLevelChange={setGeographicLevel}
          schoolDistrictFilter={schoolDistrictFilter}
          onSchoolDistrictFilterChange={setSchoolDistrictFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          siteFilters={siteFilters}
          availableYears={availableYears}
          onSiteFiltersChange={handleSiteFiltersChange}
          selectedCountSite={selectedCountSite}
          selectedSiteName={selectedSiteName}
          onClearSelectedSite={() => setSelectedCountSite(null)}
          siteCount={sitesLoading ? undefined : surveySites.length}
          sitesError={sitesError}
        />
        <VolumeMap 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          showPedestrian={showPedestrian}
          selectedMode={selectedMode}
          modelCountsBy={modelCountsBy}
          selectedYear={selectedYear}
          onMapViewReady={handleMapViewReady}
          onAadtLayerReady={setAadtLayer}
          geographicLevel={geographicLevel}
          schoolDistrictFilter={schoolDistrictFilter}
          onSelectionChange={onSelectionChange}
          selectedCountSite={selectedCountSite}
          highlightedBinSites={highlightedBinSites}
          showLoadingOverlay={!showDisclaimer}
          surveySites={surveySites}
          onSurveySiteSelect={handleCountSiteSelect}
        />
        <VolumeRightSidebar 
          activeTab={activeTab}
          showBicyclist={showBicyclist}
          showPedestrian={showPedestrian}
          selectedMode={selectedMode}
          modelCountsBy={modelCountsBy}
          mapView={mapView}
          aadtLayer={aadtLayer}
          selectedGeometry={selectedGeometry as any}
          selectedAreaName={selectedAreaName}
          dateRange={dateRange}
          selectedCountSite={selectedCountSite}
          onCountSiteSelect={handleCountSiteSelect}
          highlightedBinSites={highlightedBinSites}
          selectedYear={selectedYear}
        />
      </div>
      </div>
    </>
  );
}
