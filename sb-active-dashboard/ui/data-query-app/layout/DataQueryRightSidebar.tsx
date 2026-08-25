import { useEffect, useState } from "react";
import PanelEdgeToggle from "@/ui/data-query-app/components/PanelEdgeToggle";
import ExportFilteredDataButton from "@/ui/data-query-app/components/ExportFilteredDataButton";
import CountSurveyFiltersPanel from "@/ui/data-query-app/components/CountSurveyFiltersPanel";
import CountSurveyVisualizationPanel from "@/ui/data-query-app/components/CountSurveyVisualizationPanel";
import CountSurveySiteAnalysisPanel from "@/ui/data-query-app/components/CountSurveySiteAnalysisPanel";
import SafetyIncidentFiltersPanel from "@/ui/data-query-app/components/SafetyIncidentFiltersPanel";
import SafetyIncidentVisualizationPanel from "@/ui/data-query-app/components/SafetyIncidentVisualizationPanel";
import SafetyIncidentAnalysisPanel from "@/ui/data-query-app/components/SafetyIncidentAnalysisPanel";
import ModeledVolumeFiltersPanel from "@/ui/data-query-app/components/ModeledVolumeFiltersPanel";
import ModeledVolumeVisualizationPanel from "@/ui/data-query-app/components/ModeledVolumeVisualizationPanel";
import ArcGisFeatureLayerInfoPanel from "@/ui/data-query-app/components/ArcGisFeatureLayerInfoPanel";
import ArcGisFeatureLayerVisualizationPanel from "@/ui/data-query-app/components/ArcGisFeatureLayerVisualizationPanel";
import GenericFeatureLayerFooter from "@/ui/data-query-app/components/GenericFeatureLayerFooter";
import BicycleComfortMapAnalysisPanel from "@/ui/data-query-app/components/BicycleComfortMapAnalysisPanel";
import BicycleComfortMapFiltersPanel from "@/ui/data-query-app/components/BicycleComfortMapFiltersPanel";
import {
  CatalogCategoryNode,
  CatalogDataset,
  datasetDisplayTitle,
  findDatasetCategoryPath,
} from "@/lib/data-services/CatalogApiService";
import { CountSurveyFilterState, isCountSurveyDataset } from "@/lib/data-query-app/countSurveyFilters";
import {
  CountSurveyVisualizationState,
} from "@/lib/data-query-app/countSurveyVisualization";
import {
  isSafetyIncidentDataset,
  SafetyIncidentFilterState,
} from "@/lib/data-query-app/safetyIncidentFilters";
import { SafetyIncidentVisualizationState } from "@/lib/data-query-app/safetyIncidentVisualization";
import {
  isModeledVolumeDataset,
  ModeledVolumeFilterState,
} from "@/lib/data-query-app/modeledVolumeFilters";
import { ModeledVolumeModel } from "@/lib/data-query-app/modeledVolumeFields";
import { ModeledVolumeVisualizationState } from "@/lib/data-query-app/modeledVolumeVisualization";
import { isArcGisFeatureCatalogDataset, isBicycleComfortMapDataset } from "@/lib/data-query-app/genericCatalogDataset";
import { GenericFeatureLayerVisualizationState } from "@/lib/data-query-app/genericFeatureLayerVisualization";
import { BicycleComfortCategoryStats } from "@/lib/data-query-app/bicycleComfortMapStats";
import { BicycleComfortFilterState } from "@/lib/data-query-app/bicycleComfortMapFilters";
import { ArcGisFeatureLayerMetadata } from "@/lib/data-services/ArcGisFeatureLayerMetadataService";
import { SafetyIncidentSummary } from "@/lib/data-query-app/safetyIncidentQuery";
import { FilteredIncidentStats } from "@/lib/data-query-app/safetyIncidentStats";
import { VolumeSite } from "@/lib/volume-app/siteTemporalQuery";
import { FilteredCountSurveyStats, EMPTY_COUNT_SURVEY_STATS } from "@/lib/data-query-app/countSurveyStats";

export type DataQueryPanelSection =
  | "info"
  | "filters"
  | "visualization"
  | "site-analysis"
  | "incident-analysis"
  | "layer-analysis";

/** @deprecated Use DataQueryPanelSection */
export type CountSurveyPanelSection = DataQueryPanelSection;

interface DataQueryRightSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  filterDataset: CatalogDataset | null;
  countSurveyFilters: CountSurveyFilterState;
  safetyFilters: SafetyIncidentFilterState;
  modeledVolumeFilters: ModeledVolumeFilterState;
  countSurveyVisualization: CountSurveyVisualizationState;
  onCountSurveyVisualizationChange: (next: CountSurveyVisualizationState) => void;
  safetyVisualization: SafetyIncidentVisualizationState;
  onSafetyVisualizationChange: (next: SafetyIncidentVisualizationState) => void;
  modeledVolumeVisualization: ModeledVolumeVisualizationState;
  onModeledVolumeVisualizationChange: (
    next: ModeledVolumeVisualizationState
  ) => void;
  availableYears: number[];
  modeledAvailableYears: number[];
  modeledActiveField: string | null;
  modeledIdentityLabel: string | null;
  modeledModel: ModeledVolumeModel;
  modeledZoomTooLow?: boolean;
  modeledFeatureCount?: number | null;
  modeledActiveResolution?: number | null;
  modeledFullExtentLoaded?: boolean;
  sites: VolumeSite[];
  siteCount: number | null;
  countSurveyAvailabilityStats?: FilteredCountSurveyStats;
  countAvailabilityStatsLoading?: boolean;
  countJurisdictionStatsLoading?: boolean;
  onLoadCountJurisdictionBreakdown?: (
    level: "city" | "service-area"
  ) => Promise<void>;
  onExportCountSurveyData?: () => Promise<{ rowCount: number; truncated: boolean }>;
  incidentCount: number | null;
  safetyIncidents: SafetyIncidentSummary[];
  safetyIncidentsTruncated: boolean;
  selectedIncidentId: string | null;
  selectedIncident: SafetyIncidentSummary | null;
  incidentLayerUrl: string | null;
  onSelectIncident: (objectId: string | null) => void;
  filterStats: FilteredIncidentStats;
  filterStatsLoading: boolean;
  jurisdictionStatsLoading: boolean;
  onLoadJurisdictionBreakdown: (
    level: "city" | "service-area"
  ) => Promise<void>;
  onExportSafetyIncidentData?: () => Promise<{ rowCount: number; truncated: boolean }>;
  filtersLoading: boolean;
  filtersError: string | null;
  vizLoading: boolean;
  vizError: string | null;
  vizYearLabel: string | null;
  onCountSurveyFiltersChange: (next: CountSurveyFilterState) => void;
  onSafetyFiltersChange: (next: SafetyIncidentFilterState) => void;
  onModeledVolumeFiltersChange: (next: ModeledVolumeFilterState) => void;
  onCloseFilters: () => void;
  selectedSiteId?: string | null;
  selectedSiteName?: string | null;
  onSelectSite: (siteId: string | null, siteName?: string | null) => void;
  preferredSection?: DataQueryPanelSection | null;
  onPreferredSectionConsumed?: () => void;
  catalogTree?: CatalogCategoryNode[];
  genericFeatureVisualization?: GenericFeatureLayerVisualizationState;
  onGenericFeatureVisualizationChange?: (
    next: GenericFeatureLayerVisualizationState
  ) => void;
  genericFeatureMetadata?: ArcGisFeatureLayerMetadata | null;
  genericFeatureMetadataLoading?: boolean;
  genericFeatureMetadataError?: string | null;
  genericFeatureNumericFields?: __esri.Field[];
  genericFeatureLayerReady?: boolean;
  genericFeatureVizLoading?: boolean;
  genericFeatureVizError?: string | null;
  bicycleComfortStats?: BicycleComfortCategoryStats | null;
  bicycleComfortStatsLoading?: boolean;
  bicycleComfortStatsError?: string | null;
  bicycleComfortFilters?: BicycleComfortFilterState;
  onBicycleComfortFiltersChange?: (next: BicycleComfortFilterState) => void;
  bicycleComfortFeatureCount?: number | null;
  bicycleComfortAvailableCategories?: string[];
  bicycleComfortCategoriesLoading?: boolean;
  bicycleComfortJurisdictionPlaces?: string[];
  bicycleComfortJurisdictionPlacesLoading?: boolean;
  bicycleComfortFiltersLoading?: boolean;
  bicycleComfortFiltersError?: string | null;
  onExportGenericFeatureData?: () => Promise<{
    rowCount: number;
    truncated: boolean;
    downloadOnly?: boolean;
    filename?: string;
  }>;
  onExportGenericFeatureShapefile?: () => Promise<{
    rowCount: number;
    truncated: boolean;
    downloadOnly?: boolean;
    filename?: string;
  }>;
}

function PanelTabs({
  id,
  label,
  tabs,
  section,
  onChange,
}: {
  id: string;
  label: string;
  tabs: Array<{ id: DataQueryPanelSection; label: string }>;
  section: DataQueryPanelSection;
  onChange: (next: DataQueryPanelSection) => void;
}) {
  return (
    <div
      id={id}
      role="tablist"
      aria-label={label}
      className="flex border-b border-gray-200"
    >
      {tabs.map((tab) => {
        const active = section === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            id={`${id}-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`relative -mb-px flex-1 px-1 py-2 text-center text-sm font-medium transition-colors ${
              active
                ? "border-b-2 border-blue-600 text-blue-700"
                : "border-b-2 border-transparent text-gray-500 hover:text-gray-800"
            }`}
            style={{
              backgroundColor: "transparent",
              color: active ? "#1d4ed8" : "#6b7280",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function DataQueryRightSidebar({
  isCollapsed,
  onToggle,
  filterDataset,
  countSurveyFilters,
  safetyFilters,
  modeledVolumeFilters,
  countSurveyVisualization,
  onCountSurveyVisualizationChange,
  safetyVisualization,
  onSafetyVisualizationChange,
  modeledVolumeVisualization,
  onModeledVolumeVisualizationChange,
  availableYears,
  modeledAvailableYears,
  modeledActiveField,
  modeledIdentityLabel,
  modeledModel,
  modeledZoomTooLow = false,
  modeledFeatureCount = null,
  modeledActiveResolution = null,
  modeledFullExtentLoaded = false,
  sites,
  siteCount,
  countSurveyAvailabilityStats,
  countAvailabilityStatsLoading = false,
  countJurisdictionStatsLoading = false,
  onLoadCountJurisdictionBreakdown,
  onExportCountSurveyData,
  incidentCount,
  safetyIncidents,
  safetyIncidentsTruncated,
  selectedIncidentId,
  selectedIncident,
  incidentLayerUrl,
  onSelectIncident,
  filterStats,
  filterStatsLoading,
  jurisdictionStatsLoading,
  onLoadJurisdictionBreakdown,
  onExportSafetyIncidentData,
  filtersLoading,
  filtersError,
  vizLoading,
  vizError,
  vizYearLabel,
  onCountSurveyFiltersChange,
  onSafetyFiltersChange,
  onModeledVolumeFiltersChange,
  onCloseFilters,
  selectedSiteId = null,
  selectedSiteName = null,
  onSelectSite,
  preferredSection = null,
  onPreferredSectionConsumed,
  catalogTree = [],
  genericFeatureVisualization,
  onGenericFeatureVisualizationChange,
  genericFeatureMetadata = null,
  genericFeatureMetadataLoading = false,
  genericFeatureMetadataError = null,
  genericFeatureNumericFields = [],
  genericFeatureLayerReady = false,
  genericFeatureVizLoading = false,
  genericFeatureVizError = null,
  bicycleComfortStats = null,
  bicycleComfortStatsLoading = false,
  bicycleComfortStatsError = null,
  bicycleComfortFilters,
  onBicycleComfortFiltersChange,
  bicycleComfortFeatureCount = null,
  bicycleComfortAvailableCategories = [],
  bicycleComfortCategoriesLoading = false,
  bicycleComfortJurisdictionPlaces = [],
  bicycleComfortJurisdictionPlacesLoading = false,
  bicycleComfortFiltersLoading = false,
  bicycleComfortFiltersError = null,
  onExportGenericFeatureData,
  onExportGenericFeatureShapefile,
}: DataQueryRightSidebarProps) {
  const isCountSurvey =
    !!filterDataset && isCountSurveyDataset(filterDataset);
  const isSafety = !!filterDataset && isSafetyIncidentDataset(filterDataset);
  const isModeled =
    !!filterDataset && isModeledVolumeDataset(filterDataset);
  const isGenericFeature =
    !!filterDataset && isArcGisFeatureCatalogDataset(filterDataset);
  const isBicycleComfort =
    !!filterDataset && isBicycleComfortMapDataset(filterDataset);
  const hasTabs = isCountSurvey || isSafety || isModeled || isGenericFeature;

  const [section, setSection] = useState<DataQueryPanelSection>("filters");

  useEffect(() => {
    if (preferredSection) {
      setSection(preferredSection);
      onPreferredSectionConsumed?.();
    }
  }, [preferredSection, onPreferredSectionConsumed]);

  useEffect(() => {
    if (!preferredSection) {
      setSection(
        isBicycleComfort ? "filters" : isGenericFeature ? "info" : "filters"
      );
    }
  }, [filterDataset?.id, isGenericFeature, isBicycleComfort, preferredSection]);

  if (isCollapsed) {
    return (
      <div
        id="data-query-right-sidebar-collapsed"
        className="relative z-30 h-full w-0 flex-shrink-0 overflow-visible"
      >
        <PanelEdgeToggle
          id="data-query-right-expand-icon"
          side="right"
          isCollapsed={true}
          onClick={onToggle}
        />
      </div>
    );
  }

  return (
    <div
      id="data-query-right-sidebar"
      className="relative z-20 flex h-full w-[412px] flex-shrink-0 flex-col border-l border-gray-200 bg-white"
      style={{ colorScheme: "light", backgroundColor: "#ffffff" }}
    >
      <PanelEdgeToggle
        id="data-query-right-collapse-icon"
        side="right"
        isCollapsed={false}
        onClick={onToggle}
      />

      <div
        id="data-query-right-sidebar-header"
        className={`flex flex-shrink-0 flex-col border-b border-gray-200 px-4 ${
          hasTabs ? "pt-4" : "py-4"
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 ${
            hasTabs ? "pb-3" : ""
          }`}
        >
          <h2
            id="data-query-results-title"
            className="min-w-0 truncate text-xl font-semibold text-gray-900"
          >
            {filterDataset ? datasetDisplayTitle(filterDataset) : "Results"}
          </h2>
          {filterDataset && (
            <button
              type="button"
              onClick={onCloseFilters}
              className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
              style={{ backgroundColor: "#ffffff", color: "#4b5563" }}
            >
              Close
            </button>
          )}
        </div>

        {isCountSurvey && (
          <PanelTabs
            id="count-survey-panel-tabs"
            label="Count survey panel sections"
            section={section}
            onChange={setSection}
            tabs={[
              { id: "filters", label: "Filters" },
              { id: "visualization", label: "Visualization" },
              { id: "site-analysis", label: "Site Analysis" },
            ]}
          />
        )}

        {isSafety && (
          <PanelTabs
            id="safety-incident-panel-tabs"
            label="Safety incident panel sections"
            section={section}
            onChange={setSection}
            tabs={[
              { id: "filters", label: "Filters" },
              { id: "visualization", label: "Visualization" },
              { id: "incident-analysis", label: "Incident Analysis" },
            ]}
          />
        )}

        {isModeled && (
          <PanelTabs
            id="modeled-volume-panel-tabs"
            label="Modeled volume panel sections"
            section={section}
            onChange={setSection}
            tabs={[
              { id: "filters", label: "Filters" },
              { id: "visualization", label: "Visualization" },
            ]}
          />
        )}

        {isGenericFeature && (
          <PanelTabs
            id="generic-feature-layer-panel-tabs"
            label="Feature layer panel sections"
            section={section}
            onChange={setSection}
            tabs={
              isBicycleComfort
                ? [
                    { id: "filters", label: "Filters" },
                    { id: "info", label: "Info" },
                    { id: "visualization", label: "Visualization" },
                    { id: "layer-analysis", label: "Analysis" },
                  ]
                : [
                    { id: "info", label: "Info" },
                    { id: "visualization", label: "Visualization" },
                  ]
            }
          />
        )}
      </div>

      <div
        id="data-query-right-sidebar-content"
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        {isCountSurvey && filterDataset && section === "filters" && (
          <CountSurveyFiltersPanel
            datasetTitle={datasetDisplayTitle(filterDataset)}
            filters={countSurveyFilters}
            availableYears={availableYears}
            siteCount={siteCount}
            loading={filtersLoading}
            error={filtersError}
            onFiltersChange={onCountSurveyFiltersChange}
            showHeader={false}
          />
        )}

        {isCountSurvey && section === "visualization" && (
          <CountSurveyVisualizationPanel
            visualization={countSurveyVisualization}
            yearUsedLabel={vizYearLabel}
            loading={vizLoading}
            error={vizError}
            onChange={onCountSurveyVisualizationChange}
          />
        )}

        {isCountSurvey && section === "site-analysis" && (
          <CountSurveySiteAnalysisPanel
            sites={sites}
            selectedSiteId={selectedSiteId}
            selectedSiteName={selectedSiteName}
            filters={countSurveyFilters.siteFilters}
            countSurveyFilters={countSurveyFilters}
            datasetTitle={
              filterDataset ? datasetDisplayTitle(filterDataset) : "Count surveys"
            }
            availableYears={availableYears}
            siteCount={siteCount}
            countFiltersLoading={filtersLoading}
            countFiltersError={filtersError}
            onCountSurveyFiltersChange={onCountSurveyFiltersChange}
            geographicLevel={countSurveyFilters.geographic.level}
            filterStats={countSurveyAvailabilityStats ?? EMPTY_COUNT_SURVEY_STATS}
            filterStatsLoading={countAvailabilityStatsLoading}
            jurisdictionStatsLoading={countJurisdictionStatsLoading}
            onLoadJurisdictionBreakdown={onLoadCountJurisdictionBreakdown}
            onSelectSite={onSelectSite}
          />
        )}

        {isSafety && filterDataset && section === "filters" && (
          <SafetyIncidentFiltersPanel
            datasetTitle={datasetDisplayTitle(filterDataset)}
            filters={safetyFilters}
            incidentCount={incidentCount}
            loading={filtersLoading}
            error={filtersError}
            onFiltersChange={onSafetyFiltersChange}
            showHeader={false}
          />
        )}

        {isSafety && section === "visualization" && (
          <SafetyIncidentVisualizationPanel
            visualization={safetyVisualization}
            onChange={onSafetyVisualizationChange}
          />
        )}

        {isSafety && section === "incident-analysis" && (
          <SafetyIncidentAnalysisPanel
            incidents={safetyIncidents}
            truncated={safetyIncidentsTruncated}
            selectedIncidentId={selectedIncidentId}
            selectedIncident={selectedIncident}
            incidentLayerUrl={incidentLayerUrl}
            loading={filtersLoading}
            error={filtersError}
            datasetTitle={
              filterDataset ? datasetDisplayTitle(filterDataset) : "Safety Incidents"
            }
            filters={safetyFilters}
            onFiltersChange={onSafetyFiltersChange}
            incidentCount={incidentCount}
            filterStats={filterStats}
            filterStatsLoading={filterStatsLoading}
            jurisdictionStatsLoading={jurisdictionStatsLoading}
            geographicLevel={safetyFilters.geographic.level}
            onSelectIncident={onSelectIncident}
            onLoadJurisdictionBreakdown={onLoadJurisdictionBreakdown}
          />
        )}

        {isModeled && filterDataset && section === "filters" && (
          <ModeledVolumeFiltersPanel
            datasetTitle={datasetDisplayTitle(filterDataset)}
            model={modeledModel}
            identityLabel={modeledIdentityLabel}
            filters={modeledVolumeFilters}
            availableYears={modeledAvailableYears}
            activeField={modeledActiveField}
            loading={filtersLoading}
            error={filtersError}
            zoomTooLow={modeledZoomTooLow}
            featureCount={modeledFeatureCount}
            activeResolution={modeledActiveResolution}
            fullExtentLoaded={modeledFullExtentLoaded}
            onFiltersChange={onModeledVolumeFiltersChange}
            showHeader={false}
          />
        )}

        {isModeled && section === "visualization" && (
          <ModeledVolumeVisualizationPanel
            visualization={modeledVolumeVisualization}
            onChange={onModeledVolumeVisualizationChange}
            identityLabel={modeledIdentityLabel}
            activeField={modeledActiveField}
            loading={vizLoading}
            error={vizError}
          />
        )}

        {isGenericFeature && filterDataset && section === "info" && (
            <ArcGisFeatureLayerInfoPanel
              dataset={filterDataset}
              tree={catalogTree}
              metadata={genericFeatureMetadata}
              loading={genericFeatureMetadataLoading}
              error={genericFeatureMetadataError}
            />
          )}

        {isGenericFeature &&
          section === "visualization" &&
          genericFeatureVisualization &&
          onGenericFeatureVisualizationChange && (
            <ArcGisFeatureLayerVisualizationPanel
              visualization={genericFeatureVisualization}
              onChange={onGenericFeatureVisualizationChange}
              numericFields={genericFeatureNumericFields}
              loading={genericFeatureVizLoading}
              error={genericFeatureVizError}
              layerReady={genericFeatureLayerReady}
            />
          )}

        {isBicycleComfort &&
          filterDataset &&
          section === "filters" &&
          bicycleComfortFilters &&
          onBicycleComfortFiltersChange && (
            <BicycleComfortMapFiltersPanel
              datasetTitle={datasetDisplayTitle(filterDataset)}
              filters={bicycleComfortFilters}
              availableCategories={bicycleComfortAvailableCategories}
              categoriesLoading={bicycleComfortCategoriesLoading}
              featureCount={bicycleComfortFeatureCount}
              jurisdictionPlaces={bicycleComfortJurisdictionPlaces}
              jurisdictionPlacesLoading={bicycleComfortJurisdictionPlacesLoading}
              loading={bicycleComfortFiltersLoading}
              error={bicycleComfortFiltersError}
              onFiltersChange={onBicycleComfortFiltersChange}
              showHeader={false}
            />
          )}

        {isBicycleComfort &&
          filterDataset &&
          section === "layer-analysis" &&
          bicycleComfortFilters &&
          onBicycleComfortFiltersChange && (
            <BicycleComfortMapAnalysisPanel
              datasetTitle={datasetDisplayTitle(filterDataset)}
              stats={bicycleComfortStats}
              loading={bicycleComfortStatsLoading}
              error={bicycleComfortStatsError}
              filters={bicycleComfortFilters}
              onFiltersChange={onBicycleComfortFiltersChange}
              availableCategories={bicycleComfortAvailableCategories}
              categoriesLoading={bicycleComfortCategoriesLoading}
              featureCount={bicycleComfortFeatureCount}
              jurisdictionPlaces={bicycleComfortJurisdictionPlaces}
              jurisdictionPlacesLoading={bicycleComfortJurisdictionPlacesLoading}
              filtersLoading={bicycleComfortFiltersLoading}
              filtersError={bicycleComfortFiltersError}
            />
          )}

        {!isCountSurvey &&
          !isSafety &&
          !isModeled &&
          !isGenericFeature &&
          filterDataset && (
          <div className="px-4 py-4">
            <p className="text-sm text-gray-600">
              Layer tools for{" "}
              <strong>{datasetDisplayTitle(filterDataset)}</strong> will appear
              here. Panel views for additional catalog layers are coming soon.
            </p>
          </div>
        )}

        {!filterDataset && (
          <div className="px-4 py-4">
            <p className="text-sm text-gray-600">
              Click a layer in the Layers panel to open its tools here.
            </p>
          </div>
        )}
        </div>

        {isCountSurvey && onExportCountSurveyData && (
          <ExportFilteredDataButton
            label="Export count sites & AADT summary (CSV)"
            description="Site locations and summarized AADT survey periods only — not raw hourly or directional count time series."
            rowNoun="AADT survey period rows"
            onExport={onExportCountSurveyData}
            disabled={
              filtersLoading ||
              !!filtersError ||
              siteCount == null ||
              siteCount === 0
            }
            disabledReason={
              siteCount === 0
                ? "No survey sites match the current filters."
                : siteCount == null
                  ? "Turn on the layer to export filtered data."
                  : undefined
            }
          />
        )}

        {isSafety && onExportSafetyIncidentData && (
          <ExportFilteredDataButton
            onExport={onExportSafetyIncidentData}
            disabled={
              filtersLoading ||
              !!filtersError ||
              incidentCount == null ||
              incidentCount === 0
            }
            disabledReason={
              incidentCount === 0
                ? "No incidents match the current filters."
                : incidentCount == null
                  ? "Turn on the layer to export filtered data."
                  : undefined
            }
          />
        )}

        {isGenericFeature &&
          onExportGenericFeatureData &&
          onExportGenericFeatureShapefile && (
          <GenericFeatureLayerFooter
            portalUrl={genericFeatureMetadata?.portalUrl}
            isBicycleComfort={isBicycleComfort}
            disabled={
              filtersLoading ||
              !!filtersError ||
              !genericFeatureLayerReady ||
              !genericFeatureMetadata?.serviceUrl
            }
            disabledReason={
              !genericFeatureLayerReady
                ? "Turn on the layer to export data."
                : !genericFeatureMetadata?.serviceUrl
                  ? "Layer service URL is not available yet."
                  : undefined
            }
            onExportCsv={onExportGenericFeatureData}
            onExportShapefile={onExportGenericFeatureShapefile}
          />
        )}
      </div>
    </div>
  );
}
