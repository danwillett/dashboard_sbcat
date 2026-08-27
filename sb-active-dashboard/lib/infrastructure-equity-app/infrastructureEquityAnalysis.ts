import Polygon from "@arcgis/core/geometry/Polygon";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Field from "@arcgis/core/layers/support/Field";
import Graphic from "@arcgis/core/Graphic";
import {
  CatalogDataset,
  datasetDisplayTitle,
} from "@/lib/data-services/CatalogApiService";
import { createLayerForCatalogDataset } from "@/lib/data-query-app/catalogLayerFactory";
import { fetchBicycleComfortCategoryStats } from "@/lib/data-query-app/bicycleComfortMapStats";
import { resolveBicycleComfortBandField } from "@/lib/data-query-app/bicycleComfortMapStats";
import { buildBicycleComfortEligibleSegmentsWhereClause } from "@/lib/data-query-app/bicycleComfortSegmentEligibility";
import {
  InfrastructureComfortSelection,
  infrastructureMetricLabel,
  infrastructureMetricPercent,
} from "@/lib/infrastructure-equity-app/infrastructureEquityMetrics";
import {
  buildEquityBivariateBreaks,
  createEquityBivariateRenderer,
  equityBinClassLabel,
  equityBivariateClass,
  EquityBinCount,
  EquityBivariateBreaks,
  EquityUnitValues,
  DEFAULT_EQUITY_BIN_COUNT,
} from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";
import {
  EquityContextCategoryKind,
  EquityGeographyUnit,
  buildContextLayerGeographyWhereClause,
  equityGeographyUnitLabel,
} from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";
import {
  describeEquityGeographic,
  EquityGeographicFilter,
  resolveEquityBoundaryGeometry,
} from "@/lib/infrastructure-equity-app/infrastructureEquityGeography";
import { createEquityContextPopupTemplate } from "@/lib/infrastructure-equity-app/infrastructureEquityPopupTemplate";
import { parseNumericAttributeValue } from "@/lib/data-query-app/genericFeatureLayerVisualization";
import {
  equityAnalysisResultLayerId,
  EQUITY_LAYER_PROP_TITLE_MAIN,
  EQUITY_LAYER_PROP_TITLE_SUB,
} from "@/lib/infrastructure-equity-app/infrastructureEquityPinned";
import { prepareEquityUnitGeometry } from "@/lib/infrastructure-equity-app/infrastructureEquityUnitGeometry";
import {
  acsTotalFieldName,
  formatCombinedContextIndicatorLabel,
  resolveCombinedContextIndicatorValue,
  normalizeContextFieldSelection,
  shouldUseAcsPercentIndicator,
} from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";

export interface InfrastructureEquityAnalysisResult {
  geographyUnit: EquityGeographyUnit;
  geographyLabel: string;
  geographicFilter: EquityGeographicFilter;
  geographicLabel: string;
  boundaryGeometry: Polygon | null;
  infrastructureComfortSelection: InfrastructureComfortSelection;
  infrastructureMetricLabel: string;
  contextFields: string[];
  contextFieldLabel: string;
  contextValueIsPercent: boolean;
  contextKind: EquityContextCategoryKind;
  contextDatasetTitle: string;
  contextDatasetDescription: string | null;
  infrastructureDatasetTitle: string;
  units: EquityUnitValues[];
  breaks: EquityBivariateBreaks;
  unitsWithData: number;
  unitsTotal: number;
}

function pickLabelField(layer: FeatureLayer): string | null {
  if (layer.displayField && layer.fields?.some((f) => f.name === layer.displayField)) {
    return layer.displayField;
  }
  const candidates = ["name", "NAME", "zip", "ZIP", "ZCTA5CE10", "geoid", "GEOID"];
  for (const name of candidates) {
    if (layer.fields?.some((f) => f.name === name)) return name;
  }
  return null;
}

function numericFieldValue(attrs: Record<string, unknown>, field: string): number | null {
  return parseNumericAttributeValue(attrs[field]);
}

export interface InfrastructureEquityUnitComputation {
  units: EquityUnitValues[];
  unitsTotal: number;
  boundaryGeometry: Polygon | null;
  fieldAliases: Record<string, string | undefined>;
  contextFields: string[];
}

export async function computeInfrastructureEquityUnits(options: {
  infrastructureDataset: CatalogDataset;
  contextDataset: CatalogDataset;
  infrastructureComfortSelection: InfrastructureComfortSelection;
  contextFields: string[];
  geographyUnit: EquityGeographyUnit;
  geographicFilter: EquityGeographicFilter;
  contextKind: EquityContextCategoryKind;
  onProgress?: (completed: number, total: number) => void;
}): Promise<InfrastructureEquityUnitComputation> {
  const boundaryGeometry = await resolveEquityBoundaryGeometry(
    options.geographicFilter
  );

  if (
    options.geographicFilter.level !== "county" &&
    !boundaryGeometry
  ) {
    throw new Error(
      "Could not load a boundary for the selected city or service area."
    );
  }

  const infrastructureLayer = (await createLayerForCatalogDataset(
    options.infrastructureDataset
  )) as FeatureLayer;
  await infrastructureLayer.load();
  const infrastructureBandField = await resolveBicycleComfortBandField(
    infrastructureLayer
  );

  const contextLayer = (await createLayerForCatalogDataset(
    options.contextDataset
  )) as FeatureLayer;
  await contextLayer.load();

  if (contextLayer.geometryType !== "polygon") {
    throw new Error(
      "Context dataset must be a polygon layer for geographic aggregation."
    );
  }

  const contextFields = normalizeContextFieldSelection(options.contextFields);
  if (contextFields.length === 0) {
    throw new Error("Select at least one equity indicator field.");
  }

  for (const fieldName of contextFields) {
    const contextFieldMeta = contextLayer.fields?.find(
      (field) => field.name === fieldName
    );
    if (!contextFieldMeta) {
      throw new Error(
        "Field \"" + fieldName + "\" was not found on the context layer."
      );
    }
  }

  const fieldAliases = Object.fromEntries(
    contextFields.map((fieldName) => {
      const meta = contextLayer.fields?.find((field) => field.name === fieldName);
      return [fieldName, meta?.alias];
    })
  );

  const labelField = pickLabelField(contextLayer);
  const geographyWhere = buildContextLayerGeographyWhereClause(
    options.geographyUnit,
    options.contextKind,
    contextLayer
  );
  const outFieldSet = new Set<string>(["*"]);
  for (const fieldName of contextFields) {
    outFieldSet.add(fieldName);
    const totalField = acsTotalFieldName(fieldName);
    if (totalField) outFieldSet.add(totalField);
  }
  const query = contextLayer.createQuery();
  query.where = geographyWhere;
  query.outFields = Array.from(outFieldSet);
  query.returnGeometry = true;
  query.num = 5000;

  if (boundaryGeometry) {
    query.geometry = boundaryGeometry;
    query.spatialRelationship = "intersects";
  }

  const contextFeatures = await contextLayer.queryFeatures(query);
  const units: EquityUnitValues[] = [];
  const queryMatchCount = contextFeatures.features.length;
  let eligibleCount = 0;
  let processed = 0;

  for (const feature of contextFeatures.features) {
    const geometry = feature.geometry;
    if (!geometry) continue;

    const prepared = await prepareEquityUnitGeometry(geometry, boundaryGeometry);
    if (!prepared) continue;

    eligibleCount += 1;

    const attrs = (feature.attributes ?? {}) as Record<string, unknown>;
    const contextValue = resolveCombinedContextIndicatorValue(
      attrs,
      contextFields,
      options.contextDataset,
      options.contextKind
    );
    if (contextValue == null) continue;

    const stats = await fetchBicycleComfortCategoryStats(infrastructureLayer, {
      geometry: prepared.analysisGeometry,
      scope: "jurisdiction",
      scopeLabel: labelField
        ? String(attrs[labelField] ?? "Area")
        : equityGeographyUnitLabel(options.geographyUnit),
      categoryField: infrastructureBandField,
      additionalWhere: buildBicycleComfortEligibleSegmentsWhereClause(
        infrastructureLayer
      ),
    });

    const infrastructurePercent = infrastructureMetricPercent(
      stats,
      options.infrastructureComfortSelection
    );

    const objectId = Number(
      attrs.OBJECTID ?? attrs.objectid ?? attrs.FID ?? attrs.fid ?? units.length + 1
    );

    units.push({
      objectId,
      infrastructurePercent,
      contextValue,
      label: labelField ? String(attrs[labelField] ?? "") : undefined,
      displayGeometry: prepared.displayGeometry,
    });

    processed += 1;
    options.onProgress?.(processed, queryMatchCount);
  }

  if (units.length === 0) {
    throw new Error(
      boundaryGeometry
        ? "No geographic units with a majority of their area inside the selected extent had both infrastructure segments and a numeric context value."
        : "No geographic units had both infrastructure segments and a numeric context value."
    );
  }

  return {
    units,
    unitsTotal: eligibleCount,
    boundaryGeometry,
    fieldAliases,
    contextFields,
  };
}

export async function runInfrastructureEquityAnalysis(options: {
  infrastructureDataset: CatalogDataset;
  contextDataset: CatalogDataset;
  infrastructureComfortSelection: InfrastructureComfortSelection;
  contextFields: string[];
  geographyUnit: EquityGeographyUnit;
  geographicFilter: EquityGeographicFilter;
  contextKind: EquityContextCategoryKind;
  binCount?: EquityBinCount;
  infrastructureBreaks?: number[] | null;
  contextBreaks?: number[] | null;
  /** Optional precomputed units (e.g. from bin-configuration preview). */
  precomputed?: InfrastructureEquityUnitComputation | null;
  onProgress?: (completed: number, total: number) => void;
}): Promise<InfrastructureEquityAnalysisResult> {
  const computed =
    options.precomputed ??
    (await computeInfrastructureEquityUnits({
      infrastructureDataset: options.infrastructureDataset,
      contextDataset: options.contextDataset,
      infrastructureComfortSelection: options.infrastructureComfortSelection,
      contextFields: options.contextFields,
      geographyUnit: options.geographyUnit,
      geographicFilter: options.geographicFilter,
      contextKind: options.contextKind,
      onProgress: options.onProgress,
    }));

  const { units, unitsTotal, boundaryGeometry, fieldAliases, contextFields } =
    computed;

  const breaks = buildEquityBivariateBreaks(units, {
    binCount: options.binCount ?? DEFAULT_EQUITY_BIN_COUNT,
    infrastructureBreaks: options.infrastructureBreaks,
    contextBreaks: options.contextBreaks,
  });

  return {
    geographyUnit: options.geographyUnit,
    geographyLabel: equityGeographyUnitLabel(options.geographyUnit),
    geographicFilter: options.geographicFilter,
    geographicLabel: describeEquityGeographic(options.geographicFilter),
    boundaryGeometry,
    infrastructureComfortSelection: options.infrastructureComfortSelection,
    infrastructureMetricLabel: infrastructureMetricLabel(
      options.infrastructureComfortSelection
    ),
    contextFields,
    contextFieldLabel: formatCombinedContextIndicatorLabel(
      contextFields,
      options.contextDataset,
      options.contextKind,
      fieldAliases
    ),
    contextValueIsPercent: contextFields.every((fieldName) =>
      shouldUseAcsPercentIndicator(
        fieldName,
        options.contextDataset,
        options.contextKind
      )
    ),
    contextKind: options.contextKind,
    contextDatasetTitle: datasetDisplayTitle(options.contextDataset),
    contextDatasetDescription: options.contextDataset.description?.trim() || null,
    infrastructureDatasetTitle: datasetDisplayTitle(options.infrastructureDataset),
    units,
    breaks,
    unitsWithData: units.length,
    unitsTotal,
  };
}

/** Surface ArcGIS / non-Error rejections with a readable message. */
export function formatEquityAnalysisError(
  error: unknown,
  fallback = "Equity analysis failed."
): string {
  if (error instanceof Error) {
    const message = error.message?.trim();
    return message || fallback;
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object") {
    const record = error as {
      message?: unknown;
      details?: { message?: unknown };
      name?: unknown;
    };
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }
    if (
      typeof record.details?.message === "string" &&
      record.details.message.trim()
    ) {
      return record.details.message.trim();
    }
    if (typeof record.name === "string" && record.name.trim()) {
      return record.name.trim();
    }
  }
  return fallback;
}

/**
 * Build the bivariate result layer from analysis unit geometries.
 * Uses a minimal client-side schema (same pattern as custom bin preview) so we
 * avoid reusing hosted-layer Field instances / geometry fields that can make
 * ArcGIS reject FeatureLayer construction with a non-Error object.
 */
export async function buildEquityContextFeatureLayer(
  _contextDataset: CatalogDataset,
  analysis: InfrastructureEquityAnalysisResult,
  analysisId: string,
  layerTitles?: { titleMain: string; titleSubtitle: string }
): Promise<FeatureLayer> {
  const objectIdField = "OBJECTID";
  const graphics: Graphic[] = [];

  for (const unit of analysis.units) {
    if (!unit.displayGeometry) continue;
    const bivariate = equityBivariateClass(unit, analysis.breaks);
    const [infraBinRaw, contextBinRaw] = bivariate.split("-");
    const infraBin = Number(infraBinRaw);
    const contextBin = Number(contextBinRaw);
    graphics.push(
      new Graphic({
        geometry: unit.displayGeometry,
        attributes: {
          [objectIdField]: unit.objectId,
          equity_infra_pct: unit.infrastructurePercent,
          equity_context_value: unit.contextValue,
          equity_infra_bin: infraBin,
          equity_context_bin: contextBin,
          equity_infra_class: equityBinClassLabel(
            infraBin,
            analysis.breaks.binCount
          ),
          equity_context_class: equityBinClassLabel(
            contextBin,
            analysis.breaks.binCount
          ),
          equity_bivariate_class: bivariate,
          equity_unit_label: unit.label ?? "",
        },
      })
    );
  }

  if (graphics.length === 0) {
    throw new Error(
      "Could not build equity map layer — no unit geometries were available."
    );
  }

  const renderer = createEquityBivariateRenderer(analysis.breaks);
  const fields = [
    new Field({ name: objectIdField, type: "oid" }),
    new Field({
      name: "equity_infra_pct",
      type: "double",
      alias: analysis.infrastructureMetricLabel,
    }),
    new Field({
      name: "equity_context_value",
      type: "double",
      alias: analysis.contextFieldLabel,
    }),
    new Field({
      name: "equity_infra_bin",
      type: "integer",
      alias: "Infrastructure bin",
    }),
    new Field({
      name: "equity_context_bin",
      type: "integer",
      alias: "Equity bin",
    }),
    new Field({
      name: "equity_infra_class",
      type: "string",
      alias: "Infrastructure class",
    }),
    new Field({
      name: "equity_context_class",
      type: "string",
      alias: "Equity class",
    }),
    new Field({
      name: "equity_bivariate_class",
      type: "string",
      alias: "Bivariate class",
    }),
    new Field({
      name: "equity_unit_label",
      type: "string",
      alias: "Area",
    }),
  ];

  const titleMain =
    layerTitles?.titleMain ??
    analysis.infrastructureMetricLabel + " × " + analysis.contextFieldLabel;
  const titleSubtitle = layerTitles?.titleSubtitle ?? analysis.geographicLabel;
  const spatialReference =
    graphics[0].geometry?.spatialReference ?? undefined;

  const layer = new FeatureLayer({
    id: equityAnalysisResultLayerId(analysisId),
    title: titleMain,
    source: graphics,
    objectIdField,
    geometryType: "polygon",
    spatialReference,
    fields,
    renderer,
    opacity: 0.85,
    popupEnabled: true,
    popupTemplate: createEquityContextPopupTemplate(analysis),
    legendEnabled: false,
    listMode: "show",
    outFields: ["*"],
  });

  await layer.load();

  layer.set(EQUITY_LAYER_PROP_TITLE_MAIN, titleMain);
  layer.set(EQUITY_LAYER_PROP_TITLE_SUB, titleSubtitle);
  (layer as FeatureLayer & { equityLayerSubtitle?: string }).equityLayerSubtitle =
    titleSubtitle;

  return layer;
}
