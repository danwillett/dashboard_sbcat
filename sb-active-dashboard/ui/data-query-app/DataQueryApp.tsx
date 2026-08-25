import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataQueryMap from "./components/DataQueryMap";
import DataQueryLeftSidebar from "./layout/DataQueryLeftSidebar";
import DataQueryRightSidebar, {
  DataQueryPanelSection,
} from "./layout/DataQueryRightSidebar";
import { useCatalogLayers } from "@/lib/data-query-app/useCatalogLayers";
import { useCountSurveyFilteredLayer } from "@/lib/data-query-app/useCountSurveyFilteredLayer";
import { useSafetyIncidentFilteredLayer } from "@/lib/data-query-app/useSafetyIncidentFilteredLayer";
import { useModeledVolumeFilteredLayer } from "@/lib/data-query-app/useModeledVolumeFilteredLayer";
import { useArcGisCatalogFeatureLayer } from "@/lib/data-query-app/useArcGisCatalogFeatureLayer";
import { isArcGisFeatureCatalogDataset, isBicycleComfortMapDataset } from "@/lib/data-query-app/genericCatalogDataset";
import {
  DEFAULT_GENERIC_FEATURE_LAYER_VISUALIZATION,
  GenericFeatureLayerVisualizationState,
} from "@/lib/data-query-app/genericFeatureLayerVisualization";
import {
  CatalogDataset,
  datasetDisplayTitle,
  findDatasetInTree,
} from "@/lib/data-services/CatalogApiService";
import { useBicycleComfortMapStats } from "@/lib/data-query-app/useBicycleComfortMapStats";
import { useBicycleComfortFilteredLayer } from "@/lib/data-query-app/useBicycleComfortFilteredLayer";
import {
  createDefaultBicycleComfortFilters,
  BicycleComfortFilterState,
  buildBicycleComfortCategoryWhereClause,
} from "@/lib/data-query-app/bicycleComfortMapFilters";
import { exportArcGisPortalFeatureLayerCsv } from "@/lib/data-query-app/exportArcGisPortalFeatureLayer";
import { exportArcGisFeatureLayerShapefile } from "@/lib/data-query-app/exportArcGisFeatureLayerShapefile";
import { useCatalogFeatureLayerZoomNotices } from "@/lib/data-query-app/useCatalogFeatureLayerZoomNotices";
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
  createDefaultModeledVolumeFilters,
  findModeledVolumeDatasets,
  isModeledVolumeDataset,
  ModeledVolumeGeometry,
  resolveModeledVolumeIdentity,
} from "@/lib/data-query-app/modeledVolumeFilters";
import {
  CountSurveyVisualizationState,
  DEFAULT_COUNT_SURVEY_VISUALIZATION,
} from "@/lib/data-query-app/countSurveyVisualization";
import {
  DEFAULT_SAFETY_INCIDENT_VISUALIZATION,
  SafetyIncidentVisualizationState,
} from "@/lib/data-query-app/safetyIncidentVisualization";
import {
  DEFAULT_MODELED_VOLUME_VISUALIZATION,
  ModeledVolumeVisualizationState,
} from "@/lib/data-query-app/modeledVolumeVisualization";
import { SafetyIncidentSummary } from "@/lib/data-query-app/safetyIncidentQuery";
import CountSurveyVizLegend from "@/ui/data-query-app/components/CountSurveyVizLegend";
import SafetyIncidentVizLegend from "@/ui/data-query-app/components/SafetyIncidentVizLegend";
import DataQueryMapWidgets from "@/ui/data-query-app/components/DataQueryMapWidgets";
import DataQueryMapZoomNotice, {
  MapZoomNotice,
} from "@/ui/data-query-app/components/DataQueryMapZoomNotice";
import "@/ui/data-query-app/data-query-map-widgets.css";

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
  const [modeledVolumeFilters, setModeledVolumeFilters] = useState(
    createDefaultModeledVolumeFilters
  );
  const [countSurveyVisualization, setCountSurveyVisualization] =
    useState<CountSurveyVisualizationState>(DEFAULT_COUNT_SURVEY_VISUALIZATION);
  const [safetyVisualization, setSafetyVisualization] =
    useState<SafetyIncidentVisualizationState>(
      DEFAULT_SAFETY_INCIDENT_VISUALIZATION
    );
  const [modeledVolumeVisualization, setModeledVolumeVisualization] =
    useState<ModeledVolumeVisualizationState>(
      DEFAULT_MODELED_VOLUME_VISUALIZATION
    );
  const modeledGeometryUserChoice = useRef<ModeledVolumeGeometry | null>(null);
  const [genericFeatureVizById, setGenericFeatureVizById] = useState<
    Record<number, GenericFeatureLayerVisualizationState>
  >({});
  const [bicycleComfortFilters, setBicycleComfortFilters] =
    useState<BicycleComfortFilterState>(createDefaultBicycleComfortFilters());
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

  const managedModeledDataset = useMemo(() => {
    const modeled = findModeledVolumeDatasets(tree);
    if (filterDataset && isModeledVolumeDataset(filterDataset)) {
      return filterDataset;
    }
    return modeled.find((ds) => enabledIds.has(ds.id)) || modeled[0] || null;
  }, [tree, filterDataset, enabledIds]);

  const countSurveyEnabled = !!(
    managedCountSurveyDataset && enabledIds.has(managedCountSurveyDataset.id)
  );
  const safetyEnabled = !!(
    managedSafetyDataset && enabledIds.has(managedSafetyDataset.id)
  );
  const modeledEnabled = !!(
    managedModeledDataset && enabledIds.has(managedModeledDataset.id)
  );

  const modeledIdentity = useMemo(() => {
    if (!managedModeledDataset) return null;
    return resolveModeledVolumeIdentity(tree, managedModeledDataset);
  }, [tree, managedModeledDataset]);

  const panelGenericFeatureDataset = useMemo(() => {
    if (!filterDataset || !isArcGisFeatureCatalogDataset(filterDataset)) {
      return null;
    }
    return filterDataset;
  }, [filterDataset]);

  const panelGenericFeatureViz = useMemo(() => {
    if (!panelGenericFeatureDataset) {
      return DEFAULT_GENERIC_FEATURE_LAYER_VISUALIZATION;
    }
    return (
      genericFeatureVizById[panelGenericFeatureDataset.id] ??
      DEFAULT_GENERIC_FEATURE_LAYER_VISUALIZATION
    );
  }, [panelGenericFeatureDataset, genericFeatureVizById]);

  const handleGenericFeatureVizChange = useCallback(
    (next: GenericFeatureLayerVisualizationState) => {
      if (!panelGenericFeatureDataset) return;
      setGenericFeatureVizById((prev) => ({
        ...prev,
        [panelGenericFeatureDataset.id]: next,
      }));
    },
    [panelGenericFeatureDataset?.id]
  );

  // Keep year valid when switching Cost-Benefit ↔ Strava leaves
  useEffect(() => {
    if (!modeledIdentity) return;
    const defaults = createDefaultModeledVolumeFilters(modeledIdentity.model);
    setModeledVolumeFilters((prev) => {
      const yearsOk =
        modeledIdentity.model === "strava-bias"
          ? prev.year === 2023
          : prev.year >= 2019 && prev.year <= 2023;
      if (yearsOk && prev.bins.length > 0) return prev;
      return {
        year: yearsOk ? prev.year : defaults.year,
        bins: prev.bins.length > 0 ? prev.bins : defaults.bins,
      };
    });
  }, [modeledIdentity?.model, managedModeledDataset?.id]);

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
    exportFilteredShapefile: exportCountSurveyShapefile,
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
    exportFilteredShapefile: exportSafetyIncidentShapefile,
  } = useSafetyIncidentFilteredLayer({
    mapView,
    dataset: managedSafetyDataset,
    enabled: safetyEnabled,
    filters: safetyFilters,
    visualization: safetyVisualization,
    selectedIncidentId,
    onIncidentSelect: handleIncidentSelect,
  });

  const {
    loading: modeledLoading,
    error: modeledError,
    availableYears: modeledAvailableYears,
    activeField: modeledActiveField,
    identityLabel: modeledIdentityLabel,
    featureCount: modeledFeatureCount,
    zoomTooLow: modeledZoomTooLow,
    activeResolution: modeledActiveResolution,
    fullExtentLoaded: modeledFullExtentLoaded,
  } = useModeledVolumeFilteredLayer({
    mapView,
    tree,
    dataset: managedModeledDataset,
    enabled: modeledEnabled,
    filters: modeledVolumeFilters,
    visualization: modeledVolumeVisualization,
    onVisualizationChange: setModeledVolumeVisualization,
    geometryUserChoiceRef: modeledGeometryUserChoice,
  });

  const {
    loading: genericFeatureVizLoading,
    error: genericFeatureVizError,
    metadata: genericFeatureMetadata,
    metadataLoading: genericFeatureMetadataLoading,
    metadataError: genericFeatureMetadataError,
    numericFields: genericFeatureNumericFields,
    layerReady: genericFeatureLayerReady,
  } = useArcGisCatalogFeatureLayer({
    mapView,
    dataset: panelGenericFeatureDataset,
    enabled:
      !!panelGenericFeatureDataset &&
      enabledIds.has(panelGenericFeatureDataset.id),
    visualization: panelGenericFeatureViz,
    onVisualizationChange: handleGenericFeatureVizChange,
  });

  const activeIsSafety =
    !!filterDataset && isSafetyIncidentDataset(filterDataset);
  const activeIsModeled =
    !!filterDataset && isModeledVolumeDataset(filterDataset);
  const activeIsGenericFeature =
    !!filterDataset && isArcGisFeatureCatalogDataset(filterDataset);
  const activeIsBicycleComfort =
    !!filterDataset && isBicycleComfortMapDataset(filterDataset);

  const bicycleComfortDataset = useMemo(() => {
    if (
      !panelGenericFeatureDataset ||
      !isBicycleComfortMapDataset(panelGenericFeatureDataset)
    ) {
      return null;
    }
    return panelGenericFeatureDataset;
  }, [panelGenericFeatureDataset]);

  const bicycleComfortEnabled = !!(
    bicycleComfortDataset && enabledIds.has(bicycleComfortDataset.id)
  );

  const {
    loading: bicycleComfortFiltersLoading,
    error: bicycleComfortFiltersError,
    featureCount: bicycleComfortFeatureCount,
    availableCategories: bicycleComfortAvailableCategories,
    categoriesLoading: bicycleComfortCategoriesLoading,
    jurisdictionPlaces: bicycleComfortJurisdictionPlaces,
    jurisdictionPlacesLoading: bicycleComfortJurisdictionPlacesLoading,
  } = useBicycleComfortFilteredLayer({
    mapView,
    dataset: bicycleComfortDataset,
    enabled: bicycleComfortEnabled && genericFeatureLayerReady,
    filters: bicycleComfortFilters,
    categoryField: panelGenericFeatureViz.field,
  });

  const {
    stats: bicycleComfortStats,
    loading: bicycleComfortStatsLoading,
    error: bicycleComfortStatsError,
  } = useBicycleComfortMapStats({
    mapView,
    datasetId: bicycleComfortDataset?.id ?? null,
    enabled: bicycleComfortEnabled && genericFeatureLayerReady,
    categoryField: panelGenericFeatureViz.field,
    filters: bicycleComfortFilters,
  });

  const catalogFeatureZoomNotices = useCatalogFeatureLayerZoomNotices(
    mapView,
    tree,
    enabledIds
  );

  const genericFeatureEnabled =
    !!panelGenericFeatureDataset &&
    enabledIds.has(panelGenericFeatureDataset.id);

  const exportGenericFeatureData = useCallback(async () => {
    if (!panelGenericFeatureDataset || !genericFeatureMetadata) {
      throw new Error("Turn on the layer to export data.");
    }

    let where = "1=1";
    if (isBicycleComfortMapDataset(panelGenericFeatureDataset)) {
      const categoryField =
        panelGenericFeatureViz.field ??
        genericFeatureMetadata.portalLayerRendererField ??
        "class_export";
      where = buildBicycleComfortCategoryWhereClause(
        bicycleComfortFilters,
        categoryField
      );
    }

    return exportArcGisPortalFeatureLayerCsv(
      panelGenericFeatureDataset,
      genericFeatureMetadata,
      { where, mapView }
    );
  }, [
    panelGenericFeatureDataset,
    genericFeatureMetadata,
    panelGenericFeatureViz.field,
    bicycleComfortFilters,
    mapView,
  ]);

  const exportGenericFeatureShapefile = useCallback(async () => {
    if (!panelGenericFeatureDataset || !genericFeatureMetadata) {
      throw new Error("Turn on the layer to export data.");
    }

    let where = "1=1";
    if (isBicycleComfortMapDataset(panelGenericFeatureDataset)) {
      const categoryField =
        panelGenericFeatureViz.field ??
        genericFeatureMetadata.portalLayerRendererField ??
        "class_export";
      where = buildBicycleComfortCategoryWhereClause(
        bicycleComfortFilters,
        categoryField
      );
    }

    return exportArcGisFeatureLayerShapefile(
      panelGenericFeatureDataset,
      genericFeatureMetadata,
      { where, mapView }
    );
  }, [
    panelGenericFeatureDataset,
    genericFeatureMetadata,
    panelGenericFeatureViz.field,
    bicycleComfortFilters,
    mapView,
  ]);

  const mapZoomNotices = useMemo(() => {
    const notices: MapZoomNotice[] = [...catalogFeatureZoomNotices];
    if (modeledEnabled && modeledZoomTooLow && managedModeledDataset) {
      notices.push({
        layerName: datasetDisplayTitle(managedModeledDataset),
        detail: "Modeled volumes load at zoom 9+ (hexagons) or 12+ (segments).",
      });
    }
    return notices;
  }, [
    catalogFeatureZoomNotices,
    modeledEnabled,
    modeledZoomTooLow,
    managedModeledDataset,
  ]);

  const handleOpenDatasetPanel = (dataset: CatalogDataset) => {
    setActiveFilterDatasetId(dataset.id);
    setRightCollapsed(false);
    if (!enabledIds.has(dataset.id)) {
      toggleDataset(dataset.id, true);
    }
    if (
      isCountSurveyDataset(dataset) ||
      isSafetyIncidentDataset(dataset) ||
      isModeledVolumeDataset(dataset)
    ) {
      setPreferredSection("filters");
    } else if (isArcGisFeatureCatalogDataset(dataset)) {
      setPreferredSection("info");
    } else {
      setPreferredSection(null);
    }
    if (isModeledVolumeDataset(dataset)) {
      const identity = resolveModeledVolumeIdentity(tree, dataset);
      modeledGeometryUserChoice.current = null;
      setModeledVolumeVisualization({
        geometry: "hexagon",
      });
      setModeledVolumeFilters(createDefaultModeledVolumeFilters(identity.model));
    }
    if (!isCountSurveyDataset(dataset)) {
      setSelectedSiteId(null);
      setSelectedSiteName(null);
    }
    if (!isSafetyIncidentDataset(dataset)) {
      setSelectedIncidentId(null);
    }
  };

  const showCountLegend =
    countSurveyEnabled &&
    countSurveyVisualization.mode === "aadt" &&
    (countSurveyVisualization.varyColor || countSurveyVisualization.varySize);
  const showMapLegends = showCountLegend || safetyEnabled;

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
          <DataQueryMapZoomNotice notices={mapZoomNotices} />
          <DataQueryMapWidgets
            mapView={mapView}
            customLegend={
              showMapLegends ? (
                <>
                  {showCountLegend && (
                    <CountSurveyVizLegend
                      visualization={countSurveyVisualization}
                      yearUsedLabel={vizYearLabel}
                      variant="embedded"
                    />
                  )}
                  {safetyEnabled && (
                    <SafetyIncidentVizLegend
                      visualization={safetyVisualization}
                      incidentCount={incidentCount}
                      variant="embedded"
                    />
                  )}
                </>
              ) : undefined
            }
          />
        </div>

        <DataQueryRightSidebar
          isCollapsed={rightCollapsed}
          onToggle={() => setRightCollapsed((prev) => !prev)}
          filterDataset={filterDataset}
          countSurveyFilters={countSurveyFilters}
          safetyFilters={safetyFilters}
          modeledVolumeFilters={modeledVolumeFilters}
          countSurveyVisualization={countSurveyVisualization}
          onCountSurveyVisualizationChange={setCountSurveyVisualization}
          safetyVisualization={safetyVisualization}
          onSafetyVisualizationChange={setSafetyVisualization}
          modeledVolumeVisualization={modeledVolumeVisualization}
          onModeledVolumeVisualizationChange={(next) => {
            modeledGeometryUserChoice.current = next.geometry;
            setModeledVolumeVisualization(next);
          }}
          availableYears={availableYears}
          modeledAvailableYears={modeledAvailableYears}
          modeledActiveField={modeledActiveField}
          modeledIdentityLabel={modeledIdentityLabel}
          modeledModel={modeledIdentity?.model || "cost-benefit"}
          modeledZoomTooLow={modeledZoomTooLow}
          modeledFeatureCount={modeledFeatureCount}
          modeledActiveResolution={modeledActiveResolution}
          modeledFullExtentLoaded={modeledFullExtentLoaded}
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
          onExportCountSurveyShapefile={
            countSurveyEnabled ? exportCountSurveyShapefile : undefined
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
          onExportSafetyIncidentShapefile={
            safetyEnabled ? exportSafetyIncidentShapefile : undefined
          }
          filtersLoading={
            activeIsBicycleComfort
              ? bicycleComfortFiltersLoading ||
                genericFeatureVizLoading ||
                genericFeatureMetadataLoading
              : activeIsGenericFeature
                ? genericFeatureVizLoading || genericFeatureMetadataLoading
                : activeIsModeled
                  ? modeledLoading
                  : activeIsSafety
                    ? safetyFiltersLoading
                    : countFiltersLoading
          }
          filtersError={
            activeIsBicycleComfort
              ? bicycleComfortFiltersError ||
                genericFeatureVizError ||
                genericFeatureMetadataError
              : activeIsGenericFeature
                ? genericFeatureVizError || genericFeatureMetadataError
                : activeIsModeled
                  ? modeledError
                  : activeIsSafety
                    ? safetyFiltersError
                    : countFiltersError
          }
          vizLoading={
            activeIsGenericFeature
              ? genericFeatureVizLoading
              : activeIsModeled
                ? modeledLoading
                : vizLoading
          }
          vizError={
            activeIsGenericFeature
              ? genericFeatureVizError
              : activeIsModeled
                ? modeledError
                : vizError
          }
          vizYearLabel={vizYearLabel}
          onCountSurveyFiltersChange={setCountSurveyFilters}
          onSafetyFiltersChange={setSafetyFilters}
          onModeledVolumeFiltersChange={setModeledVolumeFilters}
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
          catalogTree={tree}
          genericFeatureVisualization={
            activeIsGenericFeature ? panelGenericFeatureViz : undefined
          }
          onGenericFeatureVisualizationChange={
            activeIsGenericFeature ? handleGenericFeatureVizChange : undefined
          }
          genericFeatureMetadata={genericFeatureMetadata}
          genericFeatureMetadataLoading={genericFeatureMetadataLoading}
          genericFeatureMetadataError={genericFeatureMetadataError}
          genericFeatureNumericFields={genericFeatureNumericFields}
          genericFeatureLayerReady={genericFeatureLayerReady}
          genericFeatureVizLoading={genericFeatureVizLoading}
          genericFeatureVizError={genericFeatureVizError}
          bicycleComfortStats={
            activeIsBicycleComfort ? bicycleComfortStats : undefined
          }
          bicycleComfortStatsLoading={
            activeIsBicycleComfort ? bicycleComfortStatsLoading : false
          }
          bicycleComfortStatsError={
            activeIsBicycleComfort ? bicycleComfortStatsError : undefined
          }
          bicycleComfortFilters={
            activeIsBicycleComfort ? bicycleComfortFilters : undefined
          }
          onBicycleComfortFiltersChange={
            activeIsBicycleComfort ? setBicycleComfortFilters : undefined
          }
          bicycleComfortFeatureCount={
            activeIsBicycleComfort ? bicycleComfortFeatureCount : undefined
          }
          bicycleComfortAvailableCategories={
            activeIsBicycleComfort ? bicycleComfortAvailableCategories : undefined
          }
          bicycleComfortCategoriesLoading={
            activeIsBicycleComfort ? bicycleComfortCategoriesLoading : false
          }
          bicycleComfortJurisdictionPlaces={
            activeIsBicycleComfort ? bicycleComfortJurisdictionPlaces : undefined
          }
          bicycleComfortJurisdictionPlacesLoading={
            activeIsBicycleComfort
              ? bicycleComfortJurisdictionPlacesLoading
              : false
          }
          bicycleComfortFiltersLoading={
            activeIsBicycleComfort ? bicycleComfortFiltersLoading : false
          }
          bicycleComfortFiltersError={
            activeIsBicycleComfort ? bicycleComfortFiltersError : undefined
          }
          onExportGenericFeatureData={
            activeIsGenericFeature && genericFeatureEnabled
              ? exportGenericFeatureData
              : undefined
          }
          onExportGenericFeatureShapefile={
            activeIsGenericFeature && genericFeatureEnabled
              ? exportGenericFeatureShapefile
              : undefined
          }
        />
      </div>
    </div>
  );
}
