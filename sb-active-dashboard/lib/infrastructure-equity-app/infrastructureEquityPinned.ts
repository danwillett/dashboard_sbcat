import { InfrastructureEquityAnalysisResult } from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysis";
import type { EquityGeographicFilter } from "@/lib/infrastructure-equity-app/infrastructureEquityGeography";

export const EQUITY_ANALYSIS_RESULT_ID_PREFIX = "infrastructure-equity-result-";
/** @deprecated Use result id prefix; kept for layer-list remove handler compatibility. */
export const EQUITY_ANALYSIS_GROUP_ID_PREFIX = EQUITY_ANALYSIS_RESULT_ID_PREFIX;

export const EQUITY_BIKE_COMFORT_REFERENCE_LAYER_ID =
  "infrastructure-equity-bike-comfort-reference";

export const EQUITY_CONTEXT_REFERENCE_LAYER_ID =
  "infrastructure-equity-context-reference";

export const EQUITY_CUSTOM_BIN_CONTEXT_LAYER_ID =
  "infrastructure-equity-custom-bins-context";

export const EQUITY_CUSTOM_BIN_INFRASTRUCTURE_LAYER_ID =
  "infrastructure-equity-custom-bins-infrastructure";

export const EQUITY_GEOGRAPHIC_EXTENT_PREVIEW_LAYER_ID =
  "infrastructure-equity-geographic-extent-preview";

export const EQUITY_RESULTS_EXTENT_GROUP_ID_PREFIX =
  "infrastructure-equity-results-extent-";

/** @deprecated Legacy single group; migrated to per-extent groups. */
export const EQUITY_RESULTS_GROUP_LAYER_ID =
  "infrastructure-equity-results-group";

export const EQUITY_LAYER_PROP_TITLE_MAIN = "equityLayerTitleMain";
export const EQUITY_LAYER_PROP_TITLE_SUB = "equityLayerTitleSub";

export function equityResultsExtentGroupId(
  geographicFilter: EquityGeographicFilter
): string {
  const placePart =
    geographicFilter.placeName?.trim().replace(/\s+/g, "_") ?? "county";
  return `${EQUITY_RESULTS_EXTENT_GROUP_ID_PREFIX}${geographicFilter.level}-${placePart}`;
}

export function formatEquityResultsGroupTitle(geographicLabel: string): string {
  return `Equity Results - ${geographicLabel}`;
}

export interface EquityAnalysisLayerTitles {
  main: string;
  subtitle: string;
  combined: string;
}

export interface PinnedEquityAnalysis {
  id: string;
  result: InfrastructureEquityAnalysisResult;
  infrastructureDatasetId: number;
  contextDatasetId: number;
  layerTitleMain: string;
  layerSubtitle: string;
  layerTitle: string;
  createdAt: number;
}

export function createPinnedEquityAnalysisId(): string {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 9)
  );
}

export function equityAnalysisResultLayerId(analysisId: string): string {
  return EQUITY_ANALYSIS_RESULT_ID_PREFIX + analysisId;
}

export function equityAnalysisGroupLayerId(analysisId: string): string {
  return equityAnalysisResultLayerId(analysisId);
}

export function isEquityAnalysisResultLayerId(
  layerId: string | undefined
): layerId is string {
  return !!layerId && layerId.startsWith(EQUITY_ANALYSIS_RESULT_ID_PREFIX);
}

export function isEquityReferenceLayerId(
  layerId: string | undefined
): boolean {
  return (
    layerId === EQUITY_BIKE_COMFORT_REFERENCE_LAYER_ID ||
    layerId === EQUITY_CONTEXT_REFERENCE_LAYER_ID ||
    layerId === EQUITY_CUSTOM_BIN_CONTEXT_LAYER_ID ||
    layerId === EQUITY_CUSTOM_BIN_INFRASTRUCTURE_LAYER_ID
  );
}

export function isEquityManagedLayerId(
  layerId: string | undefined
): boolean {
  if (!layerId) return false;
  return (
    isEquityReferenceLayerId(layerId) ||
    layerId === EQUITY_GEOGRAPHIC_EXTENT_PREVIEW_LAYER_ID ||
    isEquityResultsExtentGroupLayerId(layerId) ||
    isEquityAnalysisResultLayerId(layerId)
  );
}

export function isEquityResultsExtentGroupLayerId(
  layerId: string | undefined
): boolean {
  if (!layerId) return false;
  return (
    layerId.startsWith(EQUITY_RESULTS_EXTENT_GROUP_ID_PREFIX) ||
    layerId === EQUITY_RESULTS_GROUP_LAYER_ID
  );
}

export function isEquityResultsGroupLayerId(
  layerId: string | undefined
): boolean {
  return isEquityResultsExtentGroupLayerId(layerId);
}

export function isEquityAnalysisGroupLayerId(
  layerId: string | undefined
): layerId is string {
  return isEquityAnalysisResultLayerId(layerId);
}

export function parseEquityAnalysisIdFromResultLayerId(
  layerId: string
): string | null {
  if (!isEquityAnalysisResultLayerId(layerId)) return null;
  return layerId.slice(EQUITY_ANALYSIS_RESULT_ID_PREFIX.length) || null;
}

export function parseEquityAnalysisIdFromGroupLayerId(
  layerId: string
): string | null {
  return parseEquityAnalysisIdFromResultLayerId(layerId);
}

export function buildEquityAnalysisLayerTitles(
  result: InfrastructureEquityAnalysisResult
): EquityAnalysisLayerTitles {
  const main =
    result.infrastructureMetricLabel + " × " + result.contextFieldLabel;
  const subtitle = result.geographicLabel;
  return {
    main,
    subtitle,
    combined: main + " (" + subtitle + ")",
  };
}

export function createPinnedEquityAnalysis(
  result: InfrastructureEquityAnalysisResult,
  infrastructureDatasetId: number,
  contextDatasetId: number
): PinnedEquityAnalysis {
  const id = createPinnedEquityAnalysisId();
  const titles = buildEquityAnalysisLayerTitles(result);
  return {
    id,
    result,
    infrastructureDatasetId,
    contextDatasetId,
    layerTitleMain: titles.main,
    layerSubtitle: titles.subtitle,
    layerTitle: titles.combined,
    createdAt: Date.now(),
  };
}
