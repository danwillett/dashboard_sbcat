import { useState, type ReactNode } from "react";
import {
  CatalogCategoryNode,
  CatalogDataset,
  datasetDisplayTitle,
  findDatasetInTree,
} from "@/lib/data-services/CatalogApiService";
import { isBicycleComfortMapDataset } from "@/lib/data-query-app/genericCatalogDataset";
import {
  collectDemographicsContextDatasets,
  collectHealthContextDatasets,
  collectInfrastructureEquityDatasets,
  DEMOGRAPHICS_GEOGRAPHY_OPTIONS,
  EquityContextCategoryKind,
  EquityGeographyUnit,
  equityGeographyUnitLabel,
} from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";
import {
  DEFAULT_INFRASTRUCTURE_COMFORT_SELECTION,
  describeInfrastructureComfortFilter,
  INFRASTRUCTURE_COMFORT_BANDS,
  InfrastructureComfortBand,
  InfrastructureComfortSelection,
  isInfrastructureComfortSelectionValid,
} from "@/lib/infrastructure-equity-app/infrastructureEquityMetrics";
import {
  EquityGeographicFilter,
  EquityGeographicLevel,
} from "@/lib/infrastructure-equity-app/infrastructureEquityGeography";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PanelEdgeToggle from "@/ui/data-query-app/components/PanelEdgeToggle";
import EquityDatasetDescriptionHelp from "@/ui/infrastructure-equity-app/components/EquityDatasetDescriptionHelp";
import EquityInfoTooltip from "@/ui/infrastructure-equity-app/components/EquityInfoTooltip";
import {
  DemographicsGeographySupport,
  isTractOnlyDemographicsSupport,
} from "@/lib/infrastructure-equity-app/infrastructureEquityDemographicsGeography";
import {
  canCombineContextIndicator,
  formatContextIndicatorLabel,
  toggleContextFieldSelection,
} from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";

export type EquitySetupPhase = "intro" | "setup" | "review";
export type EquitySetupStep = "geographic" | "infrastructure" | "context";

export const EQUITY_SETUP_STEPS: EquitySetupStep[] = [
  "geographic",
  "infrastructure",
  "context",
];

interface InfrastructureEquityLeftSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  tree: CatalogCategoryNode[];
  loading: boolean;
  error: string | null;
  phase: EquitySetupPhase;
  setupStep: EquitySetupStep;
  onSetupStepChange: (step: EquitySetupStep) => void;
  onGeographicStepAdvance: () => void | Promise<void>;
  onStartSetup: () => void;
  onBackToIntro: () => void;
  infrastructureDatasetId: number | null;
  onInfrastructureDatasetChange: (datasetId: number) => void;
  infrastructureComfortSelection: InfrastructureComfortSelection;
  onInfrastructureComfortSelectionChange: (
    selection: InfrastructureComfortSelection
  ) => void;
  contextKind: EquityContextCategoryKind | null;
  onContextKindChange: (kind: EquityContextCategoryKind) => void;
  contextDatasetId: number | null;
  onContextDatasetChange: (datasetId: number) => void;
  selectedContextFields: string[];
  onSelectedContextFieldsChange: (fieldNames: string[]) => void;
  contextFieldOptions: __esri.Field[];
  contextFieldsLoading: boolean;
  contextFieldsError: string | null;
  onRunAnalysis: () => void;
  analysisRunning: boolean;
  analysisProgress: { completed: number; total: number } | null;
  analysisError: string | null;
  canRunAnalysis: boolean;
  geographicFilter: EquityGeographicFilter;
  onGeographicLevelChange: (level: EquityGeographicLevel) => void;
  onGeographicPlaceChange: (placeName: string) => void;
  jurisdictionPlaces: string[];
  jurisdictionPlacesLoading: boolean;
  pinnedAnalysisCount: number;
  bikeComfortVisible: boolean;
  onToggleBikeComfortVisible: () => void;
  contextLayerVisible: boolean;
  onToggleContextLayerVisible: () => void;
  demographicsGeographyUnit: EquityGeographyUnit;
  onDemographicsGeographyUnitChange: (unit: EquityGeographyUnit) => void;
  demographicsGeographySupport: Record<number, DemographicsGeographySupport>;
  demographicsIndicatorBlockGroupSupport: Record<
    number,
    Record<string, boolean>
  >;
}

function InfrastructureDatasetOption({
  dataset,
  selected,
  onSelect,
  mapVisible,
  onToggleMapVisible,
  comfortSelection,
  onComfortSelectionChange,
}: {
  dataset: CatalogDataset;
  selected: boolean;
  onSelect: () => void;
  mapVisible: boolean;
  onToggleMapVisible: () => void;
  comfortSelection: InfrastructureComfortSelection;
  onComfortSelectionChange: (selection: InfrastructureComfortSelection) => void;
}) {
  const title = datasetDisplayTitle(dataset);
  const isBikeComfort = isBicycleComfortMapDataset(dataset);
  const [comfortFilterExpanded, setComfortFilterExpanded] = useState(false);
  const selectedBands =
    comfortSelection.mode === "bands" ? comfortSelection.bands : [];

  const handleBandToggle = (band: InfrastructureComfortBand) => {
    if (comfortSelection.mode === "all") {
      onComfortSelectionChange({ mode: "bands", bands: [band] });
      return;
    }

    if (selectedBands.includes(band)) {
      const nextBands = selectedBands.filter((entry) => entry !== band);
      if (nextBands.length === 0) {
        onComfortSelectionChange({ mode: "all" });
        return;
      }
      onComfortSelectionChange({ mode: "bands", bands: nextBands });
      return;
    }

    onComfortSelectionChange({
      mode: "bands",
      bands: [...selectedBands, band],
    });
  };

  const isBandChecked = (band: InfrastructureComfortBand): boolean =>
    comfortSelection.mode === "bands" && selectedBands.includes(band);

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center gap-2 rounded border px-2 py-2 ${
          selected
            ? "border-blue-300 bg-blue-50/60"
            : "border-gray-200 bg-white hover:bg-gray-50"
        }`}
      >
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
          <input
            type="radio"
            className="equity-form-radio"
            checked={selected}
            onChange={onSelect}
          />
          <span className="min-w-0 text-sm font-medium text-gray-900">
            {title}
          </span>
        </label>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          {dataset.description && (
            <EquityDatasetDescriptionHelp
              title={title}
              description={dataset.description}
            />
          )}
          <button
            type="button"
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-0 p-0 hover:bg-gray-100"
            style={{
              backgroundColor: "transparent",
              color: mapVisible ? "#2563eb" : "#9ca3af",
            }}
            onClick={onToggleMapVisible}
            aria-pressed={mapVisible}
            aria-label={
              mapVisible ? `Hide ${title} on map` : `Show ${title} on map`
            }
            title={mapVisible ? "Hide on map" : "Show on map"}
          >
            {mapVisible ? (
              <VisibilityIcon sx={{ fontSize: 18 }} />
            ) : (
              <VisibilityOffIcon sx={{ fontSize: 18 }} />
            )}
          </button>
        </div>
      </div>

      {selected && isBikeComfort && (
        <div
          id="infrastructure-equity-comfort-filter"
          className="ml-6 border-l-2 border-blue-100 pl-3"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded py-1 text-left text-xs font-medium text-gray-600 hover:text-gray-900"
            style={{
              backgroundColor: "transparent",
              color: "#4b5563",
              border: "none",
              padding: "4px 0",
            }}
            onClick={() => setComfortFilterExpanded((prev) => !prev)}
            aria-expanded={comfortFilterExpanded}
          >
            <span className="w-3 text-center text-[10px] text-gray-400">
              {comfortFilterExpanded ? "▾" : "▸"}
            </span>
            <span className="min-w-0 flex-1">
              Comfort filter
              <span className="ml-1 font-normal text-gray-500">
                ({describeInfrastructureComfortFilter(comfortSelection)})
              </span>
            </span>
          </button>

          {comfortFilterExpanded && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-gray-500">
                Optional: check comfort classes to preview only those segments on
                the map and use them as the analysis metric. Leave unchecked to
                include all comfort levels.
              </p>

              {INFRASTRUCTURE_COMFORT_BANDS.map((band) => (
                <label
                  key={band.id}
                  className="flex cursor-pointer items-start gap-2"
                >
                  <input
                    type="checkbox"
                    className="equity-form-checkbox mt-0.5"
                    checked={isBandChecked(band.id)}
                    onChange={() => handleBandToggle(band.id)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-900">
                      {band.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {band.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContextDatasetOption({
  dataset,
  selected,
  onSelect,
  mapVisible,
  onToggleMapVisible,
  selectedContextFields,
  onSelectedContextFieldsChange,
  contextFieldOptions,
  contextFieldsLoading,
  contextFieldsError,
  contextKind,
  tractOnlyIncompatible = false,
  demographicsGeographyUnit,
  indicatorBlockGroupSupport,
}: {
  dataset: CatalogDataset;
  selected: boolean;
  onSelect: () => void;
  mapVisible: boolean;
  onToggleMapVisible: () => void;
  selectedContextFields: string[];
  onSelectedContextFieldsChange: (fieldNames: string[]) => void;
  contextFieldOptions: __esri.Field[];
  contextFieldsLoading: boolean;
  contextFieldsError: string | null;
  contextKind: EquityContextCategoryKind | null;
  tractOnlyIncompatible?: boolean;
  demographicsGeographyUnit: EquityGeographyUnit;
  indicatorBlockGroupSupport: Record<string, boolean>;
}) {
  const title = datasetDisplayTitle(dataset);
  const disabled = tractOnlyIncompatible;
  const showFieldSelector =
    selected &&
    !disabled &&
    !contextFieldsLoading &&
    !contextFieldsError &&
    contextFieldOptions.length > 1;
  const combinableIndicatorsAvailable = contextFieldOptions.some((field) =>
    canCombineContextIndicator(field.name, dataset, contextKind)
  );

  const handleIndicatorToggle = (fieldName: string) => {
    onSelectedContextFieldsChange(
      toggleContextFieldSelection(
        fieldName,
        selectedContextFields,
        dataset,
        contextKind
      )
    );
  };

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center gap-2 rounded border px-2 py-2 ${
          disabled
            ? "border-gray-200 bg-gray-100 opacity-70"
            : selected
              ? "border-blue-300 bg-blue-50/60"
              : "border-gray-200 bg-white hover:bg-gray-50"
        }`}
      >
        <label
          className={`flex min-w-0 flex-1 items-center gap-2 ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <input
            type="radio"
            className="equity-form-radio"
            checked={selected}
            disabled={disabled}
            onChange={() => {
              if (!disabled) onSelect();
            }}
          />
          <span
            className={`min-w-0 text-sm font-medium ${
              disabled ? "text-gray-500" : "text-gray-900"
            }`}
          >
            {title}
          </span>
        </label>
        <div className="flex flex-shrink-0 items-center gap-0.5">
          {tractOnlyIncompatible && (
            <EquityInfoTooltip text="Tract only" align="right" />
          )}
          {dataset.description && (
            <EquityDatasetDescriptionHelp
              title={title}
              description={dataset.description}
            />
          )}
          <button
            type="button"
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-0 p-0 hover:bg-gray-100"
            style={{
              backgroundColor: "transparent",
              color: disabled ? "#d1d5db" : mapVisible ? "#2563eb" : "#9ca3af",
            }}
            onClick={onToggleMapVisible}
            disabled={disabled}
            aria-pressed={mapVisible}
            aria-label={
              mapVisible ? `Hide ${title} on map` : `Show ${title} on map`
            }
            title={mapVisible ? "Hide on map" : "Show on map"}
          >
            {mapVisible ? (
              <VisibilityIcon sx={{ fontSize: 18 }} />
            ) : (
              <VisibilityOffIcon sx={{ fontSize: 18 }} />
            )}
          </button>
        </div>
      </div>

      {selected && contextFieldsError && (
        <p className="ml-6 text-xs text-red-600">{contextFieldsError}</p>
      )}

      {selected &&
        !contextFieldsLoading &&
        !contextFieldsError &&
        contextFieldOptions.length === 0 && (
          <p className="ml-6 text-xs text-gray-500">
            No numeric indicators found on this layer.
          </p>
        )}

      {showFieldSelector && (
        <div className="ml-6 space-y-2 border-l-2 border-blue-100 pl-3">
          <div>
            <p className="text-xs font-medium text-gray-600">Indicators</p>
            {combinableIndicatorsAvailable && (
              <p className="mt-0.5 text-xs text-gray-500">
                Select one or more to combine (e.g. non-white race groups).
              </p>
            )}
          </div>
          <div className="space-y-1">
            {contextFieldOptions.map((field) => {
              const isChecked = selectedContextFields.includes(field.name);
              const blockGroupUnavailable =
                contextKind === "demographics" &&
                demographicsGeographyUnit === "block" &&
                indicatorBlockGroupSupport[field.name] === false;
              const indicatorDisabled = blockGroupUnavailable;

              return (
                <label
                  key={field.name}
                  className={`flex items-center gap-2 rounded border px-2 py-1.5 text-sm ${
                    indicatorDisabled
                      ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500 opacity-70"
                      : isChecked
                        ? "cursor-pointer border-blue-300 bg-blue-50/60 text-blue-800"
                        : "cursor-pointer border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="equity-form-checkbox mt-0"
                    checked={isChecked}
                    disabled={indicatorDisabled}
                    onChange={() => {
                      if (!indicatorDisabled) handleIndicatorToggle(field.name);
                    }}
                  />
                  <span className="flex-1">
                    {formatContextIndicatorLabel(
                      field.name,
                      dataset,
                      contextKind,
                      field.alias
                    )}
                  </span>
                  {indicatorDisabled && (
                    <EquityInfoTooltip text="Tract only" align="right" />
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h3 className="text-base font-semibold text-gray-900">{children}</h3>
  );
}

function FieldHint({ children }: { children: string }) {
  return <p className="text-xs text-gray-500">{children}</p>;
}

function EquityReviewSectionBox({ children }: { children: ReactNode }) {
  return (
    <div className="equity-review-section rounded-lg border border-gray-200 bg-gray-50/90 p-3">
      {children}
    </div>
  );
}

function WizardPageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {subtitle && (
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{subtitle}</p>
      )}
    </div>
  );
}

function SetupStepIndicator({ step }: { step: EquitySetupStep }) {
  const stepNumber = EQUITY_SETUP_STEPS.indexOf(step) + 1;
  return (
    <p className="text-xs font-medium text-gray-500">
      Step {stepNumber} of {EQUITY_SETUP_STEPS.length}
    </p>
  );
}

function EquityGeographicFilterSection({
  geographicFilter,
  jurisdictionPlaces,
  jurisdictionPlacesLoading,
  onLevelChange,
  onPlaceChange,
  showSectionHeading = true,
}: {
  geographicFilter: EquityGeographicFilter;
  jurisdictionPlaces: string[];
  jurisdictionPlacesLoading: boolean;
  onLevelChange: (level: EquityGeographicLevel) => void;
  onPlaceChange: (placeName: string) => void;
  showSectionHeading?: boolean;
}) {
  const options: Array<{ id: EquityGeographicLevel; label: string }> = [
    { id: "county", label: "Full county" },
    { id: "city", label: "City" },
    { id: "service-area", label: "Service area" },
  ];

  const showPlacePicker =
    geographicFilter.level === "city" ||
    geographicFilter.level === "service-area";

  return (
    <section className="space-y-2">
      {showSectionHeading && <SectionHeading>Geographic extent</SectionHeading>}
      {showSectionHeading && (
        <FieldHint>
          Limit the analysis to the full county or a specific city or service
          area.
        </FieldHint>
      )}

      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-2 rounded border px-2 py-2 text-sm ${
              geographicFilter.level === option.id
                ? "border-blue-300 bg-blue-50/60 text-blue-800"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            style={{
              backgroundColor:
                geographicFilter.level === option.id ? undefined : "#ffffff",
            }}
          >
            <input
              type="radio"
              name="equity-geographic-level"
              className="equity-form-radio mt-0"
              checked={geographicFilter.level === option.id}
              onChange={() => onLevelChange(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>

      {geographicFilter.level === "county" && (
        <p className="text-xs text-gray-500">
          Including all geographic units across Santa Barbara County.
        </p>
      )}

      {showPlacePicker && (
        <div>
          <label
            htmlFor="equity-geographic-place-select"
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            {geographicFilter.level === "city" ? "City" : "Service area"}
          </label>
          <select
            id="equity-geographic-place-select"
            className="equity-form-select w-full rounded border border-gray-300 bg-white py-2 text-sm text-gray-900"
            value={geographicFilter.placeName ?? ""}
            onChange={(event) => onPlaceChange(event.target.value)}
            disabled={
              jurisdictionPlacesLoading || jurisdictionPlaces.length === 0
            }
          >
            {jurisdictionPlacesLoading && (
              <option value="">Loading places…</option>
            )}
            {!jurisdictionPlacesLoading && jurisdictionPlaces.length === 0 && (
              <option value="">No places available</option>
            )}
            {jurisdictionPlaces.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}

function InfrastructureSection({
  infrastructureDatasets,
  infrastructureDatasetId,
  onInfrastructureDatasetChange,
  infrastructureComfortSelection,
  onInfrastructureComfortSelectionChange,
  bikeComfortVisible,
  onToggleBikeComfortVisible,
  showSectionHeading = false,
}: {
  infrastructureDatasets: CatalogDataset[];
  infrastructureDatasetId: number | null;
  onInfrastructureDatasetChange: (datasetId: number) => void;
  infrastructureComfortSelection: InfrastructureComfortSelection;
  onInfrastructureComfortSelectionChange: (
    selection: InfrastructureComfortSelection
  ) => void;
  bikeComfortVisible: boolean;
  onToggleBikeComfortVisible: () => void;
  showSectionHeading?: boolean;
}) {
  return (
    <section className="space-y-2">
      {showSectionHeading && <SectionHeading>Infrastructure</SectionHeading>}
      {infrastructureDatasets.length === 0 ? (
        <p className="text-xs text-gray-500">
          No infrastructure datasets are available in the catalog yet.
        </p>
      ) : (
        <div className="space-y-2">
          {infrastructureDatasets.map((dataset) => (
            <InfrastructureDatasetOption
              key={dataset.id}
              dataset={dataset}
              selected={infrastructureDatasetId === dataset.id}
              onSelect={() => onInfrastructureDatasetChange(dataset.id)}
              mapVisible={
                bikeComfortVisible && infrastructureDatasetId === dataset.id
              }
              onToggleMapVisible={() => {
                if (infrastructureDatasetId !== dataset.id) {
                  onInfrastructureDatasetChange(dataset.id);
                  if (!bikeComfortVisible) onToggleBikeComfortVisible();
                  return;
                }
                onToggleBikeComfortVisible();
              }}
              comfortSelection={infrastructureComfortSelection}
              onComfortSelectionChange={onInfrastructureComfortSelectionChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function equityContextCategoryAggregationLabel(
  kind: EquityContextCategoryKind
): string {
  return kind === "health" ? "ZIP code level" : "Census tract or block group level";
}

function equityContextCategorySourceLabel(
  kind: EquityContextCategoryKind
): string {
  return kind === "health"
    ? "Data sourced from CalEnviroScreen open-source data."
    : "Data sourced from open-source ACS.";
}

function ContextSetupSection({
  contextKind,
  onContextKindChange,
  contextDatasets,
  contextDatasetId,
  onContextDatasetChange,
  selectedContextFields,
  onSelectedContextFieldsChange,
  contextFieldOptions,
  contextFieldsLoading,
  contextFieldsError,
  contextDataset,
  showSectionHeading = false,
  contextLayerVisible,
  onToggleContextLayerVisible,
  demographicsGeographyUnit,
  onDemographicsGeographyUnitChange,
  demographicsGeographySupport,
  demographicsIndicatorBlockGroupSupport,
}: {
  contextKind: EquityContextCategoryKind | null;
  onContextKindChange: (kind: EquityContextCategoryKind) => void;
  contextDatasets: CatalogDataset[];
  contextDatasetId: number | null;
  onContextDatasetChange: (datasetId: number) => void;
  selectedContextFields: string[];
  onSelectedContextFieldsChange: (fieldNames: string[]) => void;
  contextFieldOptions: __esri.Field[];
  contextFieldsLoading: boolean;
  contextFieldsError: string | null;
  contextDataset: CatalogDataset | null;
  showSectionHeading?: boolean;
  contextLayerVisible: boolean;
  onToggleContextLayerVisible: () => void;
  demographicsGeographyUnit: EquityGeographyUnit;
  onDemographicsGeographyUnitChange: (unit: EquityGeographyUnit) => void;
  demographicsGeographySupport: Record<number, DemographicsGeographySupport>;
  demographicsIndicatorBlockGroupSupport: Record<
    number,
    Record<string, boolean>
  >;
}) {
  const selectedDatasetSupport =
    contextDatasetId != null
      ? demographicsGeographySupport[contextDatasetId]
      : null;
  const blockGroupUnavailable =
    contextKind === "demographics" &&
    selectedDatasetSupport != null &&
    !selectedDatasetSupport.blockGroup;
  const indicatorBlockGroupSupport =
    contextDatasetId != null
      ? demographicsIndicatorBlockGroupSupport[contextDatasetId] ?? {}
      : {};

  return (
    <>
      <section className="space-y-2">
        {showSectionHeading && <SectionHeading>Equity metric</SectionHeading>}
        <div className="flex gap-2">
          <button
            type="button"
            className={`equity-category-toggle flex-1 rounded border px-2 py-2 text-sm font-medium ${
              contextKind === "health"
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            style={{
              backgroundColor:
                contextKind === "health" ? "#eff6ff" : "#ffffff",
            }}
            onClick={() => onContextKindChange("health")}
          >
            Health
          </button>
          <button
            type="button"
            className={`equity-category-toggle flex-1 rounded border px-2 py-2 text-sm font-medium ${
              contextKind === "demographics"
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            style={{
              backgroundColor:
                contextKind === "demographics" ? "#eff6ff" : "#ffffff",
            }}
            onClick={() => onContextKindChange("demographics")}
          >
            Demographics
          </button>
        </div>

        {contextKind != null && (
          <div className="space-y-1 rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Aggregation:</span>{" "}
              {equityContextCategoryAggregationLabel(contextKind)}.
            </p>
            <p className="text-xs text-gray-600">
              {equityContextCategorySourceLabel(contextKind)}
            </p>
          </div>
        )}

        {contextKind === "demographics" && (
          <section className="space-y-2">
            <label className="block text-xs font-medium text-gray-600">
              Aggregation level
            </label>
            <div className="space-y-2">
              {DEMOGRAPHICS_GEOGRAPHY_OPTIONS.map((option) => {
                const isBlockGroup = option.id === "block";
                const disabled = isBlockGroup && blockGroupUnavailable;

                return (
                  <label
                    key={option.id}
                    className={`flex items-center gap-2 rounded border px-2 py-2 text-sm ${
                      disabled
                        ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500 opacity-70"
                        : demographicsGeographyUnit === option.id
                          ? "cursor-pointer border-blue-300 bg-blue-50/60 text-blue-800"
                          : "cursor-pointer border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={{
                      backgroundColor:
                        disabled || demographicsGeographyUnit === option.id
                          ? undefined
                          : "#ffffff",
                    }}
                  >
                    <input
                      type="radio"
                      name="equity-demographics-geography-unit"
                      className="equity-form-radio mt-0"
                      checked={demographicsGeographyUnit === option.id}
                      disabled={disabled}
                      onChange={() => {
                        if (!disabled) {
                          onDemographicsGeographyUnitChange(option.id);
                        }
                      }}
                    />
                    <span className="flex-1">{option.label}</span>
                    {disabled && (
                      <EquityInfoTooltip
                        text="Not available for this layer"
                        align="right"
                      />
                    )}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">
              Infrastructure comfort percentages are calculated within each{" "}
              {equityGeographyUnitLabel(demographicsGeographyUnit).toLowerCase()}.
            </p>
          </section>
        )}
      </section>

      {contextKind != null && (
        <section className="space-y-2">
          {contextDatasets.length === 0 ? (
            <p className="text-xs text-gray-500">
              No datasets found under this category.
            </p>
          ) : (
            <div className="space-y-2">
              {contextDatasets.map((dataset) => (
                <ContextDatasetOption
                  key={dataset.id}
                  dataset={dataset}
                  selected={contextDatasetId === dataset.id}
                  onSelect={() => onContextDatasetChange(dataset.id)}
                  mapVisible={
                    contextLayerVisible && contextDatasetId === dataset.id
                  }
                  onToggleMapVisible={() => {
                    if (contextDatasetId !== dataset.id) {
                      onContextDatasetChange(dataset.id);
                      if (!contextLayerVisible) onToggleContextLayerVisible();
                      return;
                    }
                    onToggleContextLayerVisible();
                  }}
                  selectedContextFields={selectedContextFields}
                  onSelectedContextFieldsChange={onSelectedContextFieldsChange}
                  contextFieldOptions={contextFieldOptions}
                  contextFieldsLoading={contextFieldsLoading}
                  contextFieldsError={contextFieldsError}
                  contextKind={contextKind}
                  tractOnlyIncompatible={
                    demographicsGeographyUnit === "block" &&
                    isTractOnlyDemographicsSupport(
                      demographicsGeographySupport[dataset.id]
                    )
                  }
                  demographicsGeographyUnit={demographicsGeographyUnit}
                  indicatorBlockGroupSupport={indicatorBlockGroupSupport}
                />
              ))}
            </div>
          )}
        </section>
      )}

    </>
  );
}

function AnalysisStatusMessages({
  analysisError,
  analysisRunning,
  analysisProgress,
  pinnedAnalysisCount,
}: {
  analysisError: string | null;
  analysisRunning: boolean;
  analysisProgress: { completed: number; total: number } | null;
  pinnedAnalysisCount: number;
}) {
  return (
    <>
      {analysisError && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {analysisError}
        </div>
      )}

      {analysisRunning && analysisProgress && (
        <p className="text-xs text-gray-600">
          Analyzing geographic units… {analysisProgress.completed} of{" "}
          {analysisProgress.total}
        </p>
      )}

      {pinnedAnalysisCount > 0 && (
        <p className="text-xs text-gray-500">
          {pinnedAnalysisCount} analysis
          {pinnedAnalysisCount === 1 ? "" : "es"} pinned in the map layers
          panel. Run again to compare different configurations.
        </p>
      )}
    </>
  );
}

export default function InfrastructureEquityLeftSidebar({
  isCollapsed,
  onToggle,
  tree,
  loading,
  error,
  phase,
  setupStep,
  onSetupStepChange,
  onGeographicStepAdvance,
  onStartSetup,
  onBackToIntro,
  infrastructureDatasetId,
  onInfrastructureDatasetChange,
  infrastructureComfortSelection,
  onInfrastructureComfortSelectionChange,
  contextKind,
  onContextKindChange,
  contextDatasetId,
  onContextDatasetChange,
  selectedContextFields,
  onSelectedContextFieldsChange,
  contextFieldOptions,
  contextFieldsLoading,
  contextFieldsError,
  onRunAnalysis,
  analysisRunning,
  analysisProgress,
  analysisError,
  canRunAnalysis,
  geographicFilter,
  onGeographicLevelChange,
  onGeographicPlaceChange,
  jurisdictionPlaces,
  jurisdictionPlacesLoading,
  pinnedAnalysisCount,
  bikeComfortVisible,
  onToggleBikeComfortVisible,
  contextLayerVisible,
  onToggleContextLayerVisible,
  demographicsGeographyUnit,
  onDemographicsGeographyUnitChange,
  demographicsGeographySupport,
  demographicsIndicatorBlockGroupSupport,
}: InfrastructureEquityLeftSidebarProps) {
  const infrastructureDatasets = collectInfrastructureEquityDatasets(tree);
  const healthDatasets = collectHealthContextDatasets(tree);
  const demographicsDatasets = collectDemographicsContextDatasets(tree);
  const contextDatasets =
    contextKind === "health"
      ? healthDatasets
      : contextKind === "demographics"
        ? demographicsDatasets
        : [];

  const contextDataset = contextDatasetId
    ? findDatasetInTree(tree, contextDatasetId)
    : null;

  const canAdvanceFromGeographic =
    geographicFilter.level === "county" ||
    (!jurisdictionPlacesLoading &&
      geographicFilter.placeName != null &&
      geographicFilter.placeName.length > 0);

  const canAdvanceFromInfrastructure =
    infrastructureDatasetId != null &&
    isInfrastructureComfortSelectionValid(infrastructureComfortSelection);

  const geographicReviewContent = (
    <EquityGeographicFilterSection
      geographicFilter={geographicFilter}
      jurisdictionPlaces={jurisdictionPlaces}
      jurisdictionPlacesLoading={jurisdictionPlacesLoading}
      onLevelChange={onGeographicLevelChange}
      onPlaceChange={onGeographicPlaceChange}
    />
  );

  const infrastructureReviewContent = (
    <InfrastructureSection
      infrastructureDatasets={infrastructureDatasets}
      infrastructureDatasetId={infrastructureDatasetId}
      onInfrastructureDatasetChange={onInfrastructureDatasetChange}
      infrastructureComfortSelection={infrastructureComfortSelection}
      onInfrastructureComfortSelectionChange={
        onInfrastructureComfortSelectionChange
      }
      bikeComfortVisible={bikeComfortVisible}
      onToggleBikeComfortVisible={onToggleBikeComfortVisible}
      showSectionHeading={phase === "review"}
    />
  );

  const contextReviewContent = (
    <ContextSetupSection
      contextKind={contextKind}
      onContextKindChange={onContextKindChange}
      contextDatasets={contextDatasets}
      contextDatasetId={contextDatasetId}
      onContextDatasetChange={onContextDatasetChange}
      selectedContextFields={selectedContextFields}
      onSelectedContextFieldsChange={onSelectedContextFieldsChange}
      contextFieldOptions={contextFieldOptions}
      contextFieldsLoading={contextFieldsLoading}
      contextFieldsError={contextFieldsError}
      contextDataset={contextDataset}
      showSectionHeading={phase === "review"}
      contextLayerVisible={contextLayerVisible}
      onToggleContextLayerVisible={onToggleContextLayerVisible}
      demographicsGeographyUnit={demographicsGeographyUnit}
      onDemographicsGeographyUnitChange={onDemographicsGeographyUnitChange}
      demographicsGeographySupport={demographicsGeographySupport}
      demographicsIndicatorBlockGroupSupport={
        demographicsIndicatorBlockGroupSupport
      }
    />
  );

  if (isCollapsed) {
    return (
      <div
        id="infrastructure-equity-left-sidebar-collapsed"
        className="relative z-30 h-full w-0 flex-shrink-0 overflow-visible"
      >
        <PanelEdgeToggle
          id="infrastructure-equity-left-expand-icon"
          side="left"
          isCollapsed={true}
          onClick={onToggle}
        />
      </div>
    );
  }

  return (
    <div
      id="infrastructure-equity-left-sidebar"
      className="relative z-20 flex h-full w-80 flex-shrink-0 flex-col border-r border-gray-200 bg-white"
    >
      <PanelEdgeToggle
        id="infrastructure-equity-left-collapse-icon"
        side="left"
        isCollapsed={false}
        onClick={onToggle}
      />

      <div
        id="infrastructure-equity-left-header"
        className="flex-shrink-0 border-b border-gray-200 px-4 py-4"
      >
        <h2 className="text-xl font-semibold text-gray-900">
          Infrastructure Equity
        </h2>
      </div>

      <div
        id="infrastructure-equity-left-content"
        className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar"
      >
        {loading && (
          <p className="text-sm text-gray-500">Loading catalog datasets…</p>
        )}

        {!loading && error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && phase === "intro" && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-gray-700">
              Evaluate accessibility of bicycle and pedestrian infrastructure
              within the context of environmental health and demographic data for
              the county. The goal is to identify gaps in access to good
              infrastructure and whether filling those gaps could improve equity
              across the county.
            </p>
            <p className="text-sm leading-relaxed text-gray-600">
              Start an analysis to compare infrastructure comfort levels against
              a health or demographics indicator at the appropriate geographic
              level.
            </p>
          </div>
        )}

        {!loading && !error && phase === "setup" && (
          <div className="space-y-5">
            <SetupStepIndicator step={setupStep} />

            {setupStep === "geographic" && (
              <>
                <WizardPageTitle
                  title="Geographic extent"
                  subtitle="Limit the analysis to the full county or a specific city or service area."
                />
                <EquityGeographicFilterSection
                  geographicFilter={geographicFilter}
                  jurisdictionPlaces={jurisdictionPlaces}
                  jurisdictionPlacesLoading={jurisdictionPlacesLoading}
                  onLevelChange={onGeographicLevelChange}
                  onPlaceChange={onGeographicPlaceChange}
                  showSectionHeading={false}
                />
              </>
            )}

            {setupStep === "infrastructure" && (
              <>
                <WizardPageTitle
                  title="Infrastructure"
                  subtitle="Choose the infrastructure layer to evaluate against your equity metrics. Use the eye icon to show the infrastructure layer on the map."
                />
                {infrastructureReviewContent}
              </>
            )}

            {setupStep === "context" && (
              <>
                <WizardPageTitle
                  title="Equity metric"
                  subtitle="Select a health or demographics dataset to use as an indicator of equity. This will be evaluated against the infrastructure dataset you chose on the last pane."
                />
                {contextReviewContent}
                <AnalysisStatusMessages
                  analysisError={analysisError}
                  analysisRunning={analysisRunning}
                  analysisProgress={analysisProgress}
                  pinnedAnalysisCount={0}
                />
              </>
            )}
          </div>
        )}

        {!loading && !error && phase === "review" && (
          <div className="space-y-4">
            <WizardPageTitle
              title="Analysis configuration"
              subtitle="Update your selections and run again to compare different configurations."
            />
            <EquityReviewSectionBox>
              {geographicReviewContent}
            </EquityReviewSectionBox>
            <EquityReviewSectionBox>
              {infrastructureReviewContent}
            </EquityReviewSectionBox>
            <EquityReviewSectionBox>{contextReviewContent}</EquityReviewSectionBox>
            <AnalysisStatusMessages
              analysisError={analysisError}
              analysisRunning={analysisRunning}
              analysisProgress={analysisProgress}
              pinnedAnalysisCount={pinnedAnalysisCount}
            />
          </div>
        )}
      </div>

      <div
        id="infrastructure-equity-left-footer"
        className="flex-shrink-0 border-t border-gray-200 px-4 py-4"
      >
        {phase === "intro" && (
          <button
            type="button"
            className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
            disabled={loading || !!error}
            onClick={onStartSetup}
          >
            Start Equity Analysis
          </button>
        )}

        {phase === "setup" && setupStep === "geographic" && (
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              style={{ backgroundColor: "#ffffff" }}
              disabled={loading || !!error}
              onClick={onBackToIntro}
            >
              Back
            </button>
            <button
              type="button"
              className="flex-1 rounded bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
              disabled={!canAdvanceFromGeographic || loading || !!error}
              onClick={() => void onGeographicStepAdvance()}
            >
              Next
            </button>
          </div>
        )}

        {phase === "setup" && setupStep === "infrastructure" && (
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              style={{ backgroundColor: "#ffffff" }}
              onClick={() => onSetupStepChange("geographic")}
            >
              Back
            </button>
            <button
              type="button"
              className="flex-1 rounded bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
              disabled={!canAdvanceFromInfrastructure}
              onClick={() => onSetupStepChange("context")}
            >
              Next
            </button>
          </div>
        )}

        {phase === "setup" && setupStep === "context" && (
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              style={{ backgroundColor: "#ffffff" }}
              onClick={() => onSetupStepChange("infrastructure")}
            >
              Back
            </button>
            <button
              type="button"
              className="flex-1 rounded bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
              disabled={!canRunAnalysis || analysisRunning}
              onClick={onRunAnalysis}
            >
              {analysisRunning ? "Running analysis…" : "Run Equity Analysis"}
            </button>
          </div>
        )}

        {phase === "review" && (
          <button
            type="button"
            className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
            disabled={!canRunAnalysis || analysisRunning}
            onClick={onRunAnalysis}
          >
            {analysisRunning ? "Running analysis…" : "Run Equity Analysis"}
          </button>
        )}
      </div>
    </div>
  );
}
