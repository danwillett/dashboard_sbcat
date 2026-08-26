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
  equityBivariateClass,
  EquityBivariateBreaks,
  EquityUnitValues,
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

export async function runInfrastructureEquityAnalysis(options: {
  infrastructureDataset: CatalogDataset;
  contextDataset: CatalogDataset;
  infrastructureComfortSelection: InfrastructureComfortSelection;
  contextFields: string[];
  geographyUnit: EquityGeographyUnit;
  geographicFilter: EquityGeographicFilter;
  contextKind: EquityContextCategoryKind;
  onProgress?: (completed: number, total: number) => void;
}): Promise<InfrastructureEquityAnalysisResult> {
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

  const breaks = buildEquityBivariateBreaks(units);

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
    unitsTotal: eligibleCount,
  };
}

export async function buildEquityContextFeatureLayer(
  contextDataset: CatalogDataset,
  analysis: InfrastructureEquityAnalysisResult,
  analysisId: string,
  layerTitles?: { titleMain: string; titleSubtitle: string }
): Promise<FeatureLayer> {
  const sourceLayer = (await createLayerForCatalogDataset(contextDataset)) as FeatureLayer;
  await sourceLayer.load();

  const unitByObjectId = new Map(
    analysis.units.map((unit) => [unit.objectId, unit])
  );

  const query = sourceLayer.createQuery();
  query.where = "1=1";
  query.outFields = ["*"];
  query.returnGeometry = true;
  query.num = 5000;

  const result = await sourceLayer.queryFeatures(query);
  const graphics: Graphic[] = [];

  for (const feature of result.features) {
    const attrs = (feature.attributes ?? {}) as Record<string, unknown>;
    const objectId = Number(
      attrs.OBJECTID ?? attrs.objectid ?? attrs.FID ?? attrs.fid
    );
    const unit = unitByObjectId.get(objectId);
    if (!unit || !feature.geometry) continue;

    const displayGeometry = unit.displayGeometry ?? (feature.geometry as Polygon);

    graphics.push(
      new Graphic({
        geometry: displayGeometry,
        attributes: {
          ...attrs,
          equity_infra_pct: unit.infrastructurePercent,
          equity_context_value: unit.contextValue,
          equity_bivariate_class: equityBivariateClass(unit, analysis.breaks),
          equity_unit_label: unit.label ?? "",
        },
      })
    );
  }

  if (graphics.length === 0) {
    throw new Error("Could not build equity map layer from context features.");
  }

  const renderer = createEquityBivariateRenderer(analysis.breaks);
  const equityFields = [
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
  const fields = [...(sourceLayer.fields || []), ...equityFields];

  const titleMain =
    layerTitles?.titleMain ??
    analysis.infrastructureMetricLabel + " × " + analysis.contextFieldLabel;
  const titleSubtitle = layerTitles?.titleSubtitle ?? analysis.geographicLabel;

  const layer = new FeatureLayer({
    id: equityAnalysisResultLayerId(analysisId),
    title: titleMain,
    source: graphics,
    objectIdField: sourceLayer.objectIdField || "OBJECTID",
    geometryType: "polygon",
    spatialReference: sourceLayer.spatialReference,
    fields,
    renderer,
    opacity: 0.85,
    popupEnabled: true,
    popupTemplate: createEquityContextPopupTemplate(analysis),
    legendEnabled: false,
    listMode: "show",
    outFields: ["*"],
  });

  layer.set(EQUITY_LAYER_PROP_TITLE_MAIN, titleMain);
  layer.set(EQUITY_LAYER_PROP_TITLE_SUB, titleSubtitle);
  (layer as FeatureLayer & { equityLayerSubtitle?: string }).equityLayerSubtitle =
    titleSubtitle;

  return layer;
}
