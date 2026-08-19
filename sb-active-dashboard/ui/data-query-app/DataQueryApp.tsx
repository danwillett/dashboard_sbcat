import { useMemo, useState } from "react";
import DataQueryMap from "./components/DataQueryMap";
import DataQueryLeftSidebar from "./layout/DataQueryLeftSidebar";
import DataQueryRightSidebar, {
  DataQueryPanelSection,
} from "./layout/DataQueryRightSidebar";
import { useCatalogLayers } from "@/lib/data-query-app/useCatalogLayers";
import { useCountSurveyFilteredLayer } from "@/lib/data-query-app/useCountSurveyFilteredLayer";
import { useSafetyIncidentFilteredLayer } from "@/lib/data-query-app/useSafetyIncidentFilteredLayer";
import {
  CatalogDataset,
  findDatasetInTree,
} from "@/lib/data-services/CatalogApiService";
import {
  createDefaultCountSurveyFilters,
  findCountSurveyDatasets,
  isCountSurveyDataset,
} from "@/lib/data-query-app/countSurveyFilters";
import {
  createDefaultSafetyIncidentFilters,
  findSafetyIncidentDatasets,
  isSafetyIncidentDataset,
} from "@/lib/data-query-app/safetyIncidentFilters";
import {
  CountSurveyVisualizationState,
  DEFAULT_COUNT_SURVEY_VISUALIZATION,
} from "@/lib/data-query-app/countSurveyVisualization";
import {
  DEFAULT_SAFETY_INCIDENT_VISUALIZATION,
  SafetyIncidentVisualizationState,
} from "@/lib/data-query-app/safetyIncidentVisualization";
import { SafetyIncidentSummary } from "@/lib/data-query-app/safetyIncidentQuery";
import CountSurveyVizLegend from "@/ui/data-query-app/components/CountSurveyVizLegend";
import SafetyIncidentVizLegend from "@/ui/data-query-app/components/SafetyIncidentVizLegend";

export default function DataQueryApp() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mapView, setMapView] = useState<__esri.MapView | null>(null);
  const [activeFilterDatasetId, setActiveFilterDatasetId] = useState<number | null>(
    null
  );
  const [countSurveyFilters, setCountSurveyFilters] = useState(
    createDefaultCountSurveyFilters
  );
  const [safetyFilters, setSafetyFilters] = useState(
    createDefaultSafetyIncidentFilters
  );
  const [countSurveyVisualization, setCountSurveyVisualization] =
    useState<CountSurveyVisualizationState>(DEFAULT_COUNT_SURVEY_VISUALIZATION);
  const [safetyVisualization, setSafetyVisualization] =
    useState<SafetyIncidentVisualizationState>(
      DEFAULT_SAFETY_INCIDENT_VISUALIZATION
    );
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedSiteName, setSelectedSiteName] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null
  );
  const [preferredSection, setPreferredSection] =
    useState<DataQueryPanelSection | null>(null);

  const {
    tree,
    loading,
    error,
    enabledIds,
    layerErrors,
    toggleDataset,
    refresh,
  } = useCatalogLayers(mapView);

  const filterDataset = useMemo(() => {
    if (activeFilterDatasetId == null) return null;
    return findDatasetInTree(tree, activeFilterDatasetId);
  }, [tree, activeFilterDatasetId]);

  const managedCountSurveyDataset = useMemo(() => {
    const surveys = findCountSurveyDatasets(tree);
    if (filterDataset && isCountSurveyDataset(filterDataset)) {
      return filterDataset;
    }
    return surveys.find((ds) => enabledIds.has(ds.id)) || surveys[0] || null;
  }, [tree, filterDataset, enabledIds]);

  const managedSafetyDataset = useMemo(() => {
    const safety = findSafetyIncidentDatasets(tree);
    if (filterDataset && isSafetyIncidentDataset(filterDataset)) {
      return filterDataset;
    }
    return safety.find((ds) => enabledIds.has(ds.id)) || safety[0] || null;
  }, [tree, filterDataset, enabledIds]);

  const countSurveyEnabled = !!(
    managedCountSurveyDataset && enabledIds.has(managedCountSurveyDataset.id)
  );
  const safetyEnabled = !!(
    managedSafetyDataset && enabledIds.has(managedSafetyDataset.id)
  );

  const handleSiteSelect = (siteId: string | null, siteName?: string | null) => {
    setSelectedSiteId(siteId);
    setSelectedSiteName(siteName ?? null);
    if (siteId) {
      setRightCollapsed(false);
      if (managedCountSurveyDataset) {
        setActiveFilterDatasetId(managedCountSurveyDataset.id);
      }
      setPreferredSection("site-analysis");
    }
  };

  const handleIncidentSelect = (
    objectId: string | null,
    _summary?: SafetyIncidentSummary | null
  ) => {
    setSelectedIncidentId(objectId);
    if (objectId) {
      setRightCollapsed(false);
      if (managedSafetyDataset) {
        setActiveFilterDatasetId(managedSafetyDataset.id);
      }
      setPreferredSection("incident-analysis");
    }
  };

  const {
    sites,
    siteCount,
    availableYears,
    loading: countFiltersLoading,
    error: countFiltersError,
    vizLoading,
    vizError,
    vizYearLabel,
    availabilityStats,
    availabilityStatsLoading,
    jurisdictionStatsLoading: countJurisdictionStatsLoading,
    loadJurisdictionBreakdown: loadCountJurisdictionBreakdown,
    exportFilteredData: exportCountSurveyData,
  } = useCountSurveyFilteredLayer({
    mapView,
    dataset: managedCountSurveyDataset,
    enabled: countSurveyEnabled,
    filters: countSurveyFilters,
    visualization: countSurveyVisualization,
    selectedSiteId,
    onSiteSelect: handleSiteSelect,
  });

  const {
    incidentCount,
    incidents: safetyIncidents,
    incidentsTruncated,
    selectedIncident,
    incidentLayerUrl,
    loading: safetyFiltersLoading,
    error: safetyFiltersError,
    filterStats,
    filterStatsLoading,
    jurisdictionStatsLoading,
    loadJurisdictionBreakdown,
    exportFilteredData: exportSafetyIncidentData,
  } = useSafetyIncidentFilteredLayer({
    mapView,
    dataset: managedSafetyDataset,
    enabled: safetyEnabled,
    filters: safetyFilters,
    visualization: safetyVisualization,
    selectedIncidentId,
    onIncidentSelect: handleIncidentSelect,
  });

  const activeIsSafety =
    !!filterDataset && isSafetyIncidentDataset(filterDataset);

  const handleOpenDatasetPanel = (dataset: CatalogDataset) => {
    setActiveFilterDatasetId(dataset.id);
    setRightCollapsed(false);
    if (!enabledIds.has(dataset.id)) {
      toggleDataset(dataset.id, true);
    }
    if (isCountSurveyDataset(dataset) || isSafetyIncidentDataset(dataset)) {
      setPreferredSection("filters");
    } else {
      setPreferredSection(null);
    }
    if (!isCountSurveyDataset(dataset)) {
      setSelectedSiteId(null);
      setSelectedSiteName(null);
    }
    if (!isSafetyIncidentDataset(dataset)) {
      setSelectedIncidentId(null);
    }
  };

  return (
    <div id="data-query-app" className="flex h-full min-h-0 w-full flex-col bg-white">
      <div id="data-query-main-content" className="flex min-h-0 flex-1 overflow-hidden">
        <DataQueryLeftSidebar
          isCollapsed={leftCollapsed}
          onToggle={() => setLeftCollapsed((prev) => !prev)}
          tree={tree}
          loading={loading}
          error={error}
          enabledIds={enabledIds}
          layerErrors={layerErrors}
          onToggleDataset={(id, enabled) => {
            toggleDataset(id, enabled);
            if (
              !enabled &&
              managedCountSurveyDataset &&
              id === managedCountSurveyDataset.id
            ) {
              setSelectedSiteId(null);
              setSelectedSiteName(null);
            }
            if (
              !enabled &&
              managedSafetyDataset &&
              id === managedSafetyDataset.id
            ) {
              setSelectedIncidentId(null);
            }
          }}
          onRefresh={refresh}
          activeFilterDatasetId={activeFilterDatasetId}
          onOpenDatasetPanel={handleOpenDatasetPanel}
        />

        <div id="data-query-map-area" className="relative min-w-0 flex-1">
          <DataQueryMap onMapViewReady={setMapView} />
          {(countSurveyEnabled &&
            countSurveyVisualization.mode === "aadt" &&
            (countSurveyVisualization.varyColor ||
              countSurveyVisualization.varySize)) ||
          safetyEnabled ? (
            <div className="pointer-events-none absolute bottom-5 left-5 z-10 flex max-w-[280px] flex-col gap-3">
              {countSurveyEnabled &&
                countSurveyVisualization.mode === "aadt" &&
                (countSurveyVisualization.varyColor ||
                  countSurveyVisualization.varySize) && (
                  <CountSurveyVizLegend
                    visualization={countSurveyVisualization}
                    yearUsedLabel={vizYearLabel}
                    variant="map"
                  />
                )}
              {safetyEnabled && (
                <SafetyIncidentVizLegend
                  visualization={safetyVisualization}
                  incidentCount={incidentCount}
                />
              )}
            </div>
          ) : null}
        </div>

        <DataQueryRightSidebar
          isCollapsed={rightCollapsed}
          onToggle={() => setRightCollapsed((prev) => !prev)}
          filterDataset={filterDataset}
          countSurveyFilters={countSurveyFilters}
          safetyFilters={safetyFilters}
          countSurveyVisualization={countSurveyVisualization}
          onCountSurveyVisualizationChange={setCountSurveyVisualization}
          safetyVisualization={safetyVisualization}
          onSafetyVisualizationChange={setSafetyVisualization}
          availableYears={availableYears}
          sites={sites}
          siteCount={countSurveyEnabled ? siteCount : null}
          countSurveyAvailabilityStats={
            countSurveyEnabled ? availabilityStats : undefined
          }
          countAvailabilityStatsLoading={
            countSurveyEnabled ? availabilityStatsLoading : false
          }
          countJurisdictionStatsLoading={
            countSurveyEnabled ? countJurisdictionStatsLoading : false
          }
          onLoadCountJurisdictionBreakdown={loadCountJurisdictionBreakdown}
          onExportCountSurveyData={
            countSurveyEnabled ? exportCountSurveyData : undefined
          }
          incidentCount={safetyEnabled ? incidentCount : null}
          safetyIncidents={safetyIncidents}
          safetyIncidentsTruncated={incidentsTruncated}
          selectedIncidentId={
            filterDataset && isSafetyIncidentDataset(filterDataset)
              ? selectedIncidentId
              : null
          }
          selectedIncident={
            filterDataset && isSafetyIncidentDataset(filterDataset)
              ? selectedIncident
              : null
          }
          incidentLayerUrl={incidentLayerUrl}
          onSelectIncident={handleIncidentSelect}
          filterStats={filterStats}
          filterStatsLoading={filterStatsLoading}
          jurisdictionStatsLoading={jurisdictionStatsLoading}
          onLoadJurisdictionBreakdown={loadJurisdictionBreakdown}
          onExportSafetyIncidentData={
            safetyEnabled ? exportSafetyIncidentData : undefined
          }
          filtersLoading={
            activeIsSafety ? safetyFiltersLoading : countFiltersLoading
          }
          filtersError={activeIsSafety ? safetyFiltersError : countFiltersError}
          vizLoading={vizLoading}
          vizError={vizError}
          vizYearLabel={vizYearLabel}
          onCountSurveyFiltersChange={setCountSurveyFilters}
          onSafetyFiltersChange={setSafetyFilters}
          onCloseFilters={() => setActiveFilterDatasetId(null)}
          selectedSiteId={
            filterDataset && isCountSurveyDataset(filterDataset)
              ? selectedSiteId
              : null
          }
          selectedSiteName={selectedSiteName}
          onSelectSite={handleSiteSelect}
          preferredSection={preferredSection}
          onPreferredSectionConsumed={() => setPreferredSection(null)}
        />
      </div>
    </div>
  );
}
