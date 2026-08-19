import { useEffect, useState } from "react";
import PanelEdgeToggle from "@/ui/data-query-app/components/PanelEdgeToggle";
import ExportFilteredDataButton from "@/ui/data-query-app/components/ExportFilteredDataButton";
import CountSurveyFiltersPanel from "@/ui/data-query-app/components/CountSurveyFiltersPanel";
import CountSurveyVisualizationPanel from "@/ui/data-query-app/components/CountSurveyVisualizationPanel";
import CountSurveySiteAnalysisPanel from "@/ui/data-query-app/components/CountSurveySiteAnalysisPanel";
import SafetyIncidentFiltersPanel from "@/ui/data-query-app/components/SafetyIncidentFiltersPanel";
import SafetyIncidentVisualizationPanel from "@/ui/data-query-app/components/SafetyIncidentVisualizationPanel";
import SafetyIncidentAnalysisPanel from "@/ui/data-query-app/components/SafetyIncidentAnalysisPanel";
import { CatalogDataset, datasetDisplayTitle } from "@/lib/data-services/CatalogApiService";
import { CountSurveyFilterState, isCountSurveyDataset } from "@/lib/data-query-app/countSurveyFilters";
import {
  CountSurveyVisualizationState,
} from "@/lib/data-query-app/countSurveyVisualization";
import {
  isSafetyIncidentDataset,
  SafetyIncidentFilterState,
} from "@/lib/data-query-app/safetyIncidentFilters";
import { SafetyIncidentVisualizationState } from "@/lib/data-query-app/safetyIncidentVisualization";
import { SafetyIncidentSummary } from "@/lib/data-query-app/safetyIncidentQuery";
import { FilteredIncidentStats } from "@/lib/data-query-app/safetyIncidentStats";
import { VolumeSite } from "@/lib/volume-app/siteTemporalQuery";
import { FilteredCountSurveyStats, EMPTY_COUNT_SURVEY_STATS } from "@/lib/data-query-app/countSurveyStats";

export type DataQueryPanelSection =
  | "filters"
  | "visualization"
  | "site-analysis"
  | "incident-analysis";

/** @deprecated Use DataQueryPanelSection */
export type CountSurveyPanelSection = DataQueryPanelSection;

interface DataQueryRightSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  filterDataset: CatalogDataset | null;
  countSurveyFilters: CountSurveyFilterState;
  safetyFilters: SafetyIncidentFilterState;
  countSurveyVisualization: CountSurveyVisualizationState;
  onCountSurveyVisualizationChange: (next: CountSurveyVisualizationState) => void;
  safetyVisualization: SafetyIncidentVisualizationState;
  onSafetyVisualizationChange: (next: SafetyIncidentVisualizationState) => void;
  availableYears: number[];
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
  onCloseFilters: () => void;
  selectedSiteId?: string | null;
  selectedSiteName?: string | null;
  onSelectSite: (siteId: string | null, siteName?: string | null) => void;
  preferredSection?: DataQueryPanelSection | null;
  onPreferredSectionConsumed?: () => void;
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
  countSurveyVisualization,
  onCountSurveyVisualizationChange,
  safetyVisualization,
  onSafetyVisualizationChange,
  availableYears,
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
  onCloseFilters,
  selectedSiteId = null,
  selectedSiteName = null,
  onSelectSite,
  preferredSection = null,
  onPreferredSectionConsumed,
}: DataQueryRightSidebarProps) {
  const isCountSurvey =
    !!filterDataset && isCountSurveyDataset(filterDataset);
  const isSafety = !!filterDataset && isSafetyIncidentDataset(filterDataset);
  const hasTabs = isCountSurvey || isSafety;

  const [section, setSection] = useState<DataQueryPanelSection>("filters");

  useEffect(() => {
    if (preferredSection) {
      setSection(preferredSection);
      onPreferredSectionConsumed?.();
    }
  }, [preferredSection, onPreferredSectionConsumed]);

  useEffect(() => {
    if (!preferredSection) {
      setSection("filters");
    }
  }, [filterDataset?.id]);

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

        {!isCountSurvey && !isSafety && filterDataset && (
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
      </div>
    </div>
  );
}
