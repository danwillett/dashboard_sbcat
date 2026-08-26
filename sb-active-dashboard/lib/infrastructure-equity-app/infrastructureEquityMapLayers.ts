import Polygon from "@arcgis/core/geometry/Polygon";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Field from "@arcgis/core/layers/support/Field";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import {
  CatalogCategoryNode,
  CatalogDataset,
  datasetDisplayTitle,
  findDatasetInTree,
} from "@/lib/data-services/CatalogApiService";
import { createLayerForCatalogDataset } from "@/lib/data-query-app/catalogLayerFactory";
import {
  applyBicycleComfortMapLayerStyle,
  applyCatalogFeatureLayerPortalStyle,
} from "@/lib/data-query-app/bicycleComfortMapLayerStyle";
import { optimizeFeatureLayerTileQueries } from "@/lib/data-query-app/catalogFeatureLayerPerformance";
import { applyBicycleComfortMapPopup } from "@/lib/data-query-app/bicycleComfortMapPopupTemplate";
import { isBicycleComfortMapDataset } from "@/lib/data-query-app/genericCatalogDataset";
import { applyEquityContextFeatureLayerPopup } from "@/lib/infrastructure-equity-app/equityContextFeatureLayerPopupTemplate";
import {
  listBicycleComfortCategories,
  resolveBicycleComfortBandField,
} from "@/lib/data-query-app/bicycleComfortMapStats";
import { buildBicycleComfortEligibleSegmentsWhereClause } from "@/lib/data-query-app/bicycleComfortSegmentEligibility";
import { fetchArcGisFeatureLayerMetadata } from "@/lib/data-services/ArcGisFeatureLayerMetadataService";
import { buildEquityContextFeatureLayer } from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysis";
import { prepareEquityUnitGeometry } from "@/lib/infrastructure-equity-app/infrastructureEquityUnitGeometry";
import {
  buildInfrastructureComfortWhereClause,
  categoriesMatchComfortBands,
  InfrastructureComfortSelection,
} from "@/lib/infrastructure-equity-app/infrastructureEquityMetrics";
import {
  applyEquityContextIndicatorRenderer,
  filterSelectableContextFields,
} from "@/lib/infrastructure-equity-app/infrastructureEquityContextFields";
import {
  EQUITY_COMPUTED_CONTEXT_VALUE_FIELD,
  encodeContextFieldSelection,
  normalizeContextFieldSelection,
  formatCombinedContextIndicatorLabel,
  formatEquityContextLayerTitle,
  resolveCombinedContextIndicatorValue,
  shouldUseAcsPercentIndicator,
  acsTotalFieldName,
} from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";
import {
  EquityContextCategoryKind,
  EquityGeographyUnit,
  mergeContextLayerWhereClause,
} from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";
import {
  EquityGeographicFilter,
  describeEquityGeographicBoundariesLabel,
  resolveEquityPreviewExtentGeometry,
} from "@/lib/infrastructure-equity-app/infrastructureEquityGeography";
import {
  EQUITY_BIKE_COMFORT_REFERENCE_LAYER_ID,
  EQUITY_CONTEXT_REFERENCE_LAYER_ID,
  EQUITY_GEOGRAPHIC_EXTENT_PREVIEW_LAYER_ID,
  equityAnalysisResultLayerId,
  equityResultsExtentGroupId,
  formatEquityResultsGroupTitle,
  isEquityAnalysisResultLayerId,
  isEquityResultsExtentGroupLayerId,
  EQUITY_LAYER_PROP_TITLE_MAIN,
  EQUITY_LAYER_PROP_TITLE_SUB,
  PinnedEquityAnalysis,
} from "@/lib/infrastructure-equity-app/infrastructureEquityPinned";

interface EquityReferenceLayerMeta {
  equitySourceDatasetId?: number;
  equityContextField?: string | null;
  equityBoundaryKey?: string;
  equityGeographyUnit?: EquityGeographyUnit | null;
  equityComfortCategories?: string[];
  equityCategoryField?: string;
}

function boundaryGeometryKey(boundaryGeometry: Polygon | null): string {
  if (!boundaryGeometry) return "county";
  const extent = boundaryGeometry.extent;
  if (!extent) return "county";
  return [
    extent.xmin,
    extent.ymin,
    extent.xmax,
    extent.ymax,
    boundaryGeometry.spatialReference?.wkid ?? "",
  ].join("|");
}

function assignEquityReferenceLayerMeta(
  layer: FeatureLayer,
  meta: EquityReferenceLayerMeta
): void {
  const target = layer as FeatureLayer & EquityReferenceLayerMeta;
  target.equitySourceDatasetId = meta.equitySourceDatasetId;
  target.equityContextField = meta.equityContextField;
  target.equityBoundaryKey = meta.equityBoundaryKey;
  target.equityGeographyUnit = meta.equityGeographyUnit;
}

function readEquityReferenceLayerMeta(
  layer: FeatureLayer
): EquityReferenceLayerMeta {
  const source = layer as FeatureLayer & EquityReferenceLayerMeta;
  return {
    equitySourceDatasetId: source.equitySourceDatasetId,
    equityContextField: source.equityContextField,
    equityBoundaryKey: source.equityBoundaryKey,
    equityGeographyUnit: source.equityGeographyUnit,
  };
}

function chainLayerSync(
  current: Promise<void>,
  work: () => Promise<void>
): Promise<void> {
  return current.then(work, work);
}

function removeMapLayersById(map: __esri.Map, layerId: string): void {
  for (const layer of map.layers.toArray()) {
    if (layer.id === layerId) {
      map.remove(layer);
      layer.destroy();
    }
  }
}

let bikeComfortReferenceSync: Promise<void> = Promise.resolve();
let contextReferenceSync: Promise<void> = Promise.resolve();

function findEquityResultsExtentGroups(map: __esri.Map): GroupLayer[] {
  return map.layers
    .toArray()
    .filter((layer) => isEquityResultsExtentGroupLayerId(layer.id))
    .map((layer) => layer as GroupLayer);
}

function findEquityResultLayer(
  map: __esri.Map,
  analysisId: string
): __esri.Layer | undefined {
  const layerId = equityAnalysisResultLayerId(analysisId);
  const topLevel = map.findLayerById(layerId);
  if (topLevel) return topLevel;

  for (const group of findEquityResultsExtentGroups(map)) {
    const found = group.findLayerById(layerId);
    if (found) return found;
  }

  return undefined;
}

function findEquityResultsGroupContainingLayer(
  map: __esri.Map,
  layer: __esri.Layer
): GroupLayer | undefined {
  for (const group of findEquityResultsExtentGroups(map)) {
    if (group.layers.includes(layer)) return group;
  }
  return undefined;
}

function getOrCreateEquityResultsExtentGroup(
  map: __esri.Map,
  geographicFilter: EquityGeographicFilter,
  geographicLabel: string
): GroupLayer {
  const groupId = equityResultsExtentGroupId(geographicFilter);
  let group = map.findLayerById(groupId) as GroupLayer | undefined;

  if (!group) {
    group = new GroupLayer({
      id: groupId,
      title: formatEquityResultsGroupTitle(geographicLabel),
      listMode: "show",
      visibilityMode: "independent",
    });
    map.add(group);
  } else {
    group.title = formatEquityResultsGroupTitle(geographicLabel);
  }

  return group;
}

function removeEquityResultsGroupIfEmpty(
  map: __esri.Map,
  groupId: string
): void {
  const group = map.findLayerById(groupId) as GroupLayer | undefined;
  if (!group || group.layers.length > 0) return;

  map.remove(group);
  group.destroy();
}

export async function addPinnedEquityAnalysisToMap(
  mapView: __esri.MapView,
  pinned: PinnedEquityAnalysis,
  contextDataset: CatalogDataset
): Promise<FeatureLayer> {
  const map = mapView.map;
  if (!map) {
    throw new Error("Map is not available.");
  }

  const existing = findEquityResultLayer(map, pinned.id);
  if (existing) {
    const group = findEquityResultsGroupContainingLayer(map, existing);
    if (group) {
      group.remove(existing);
    } else {
      map.remove(existing);
    }
    existing.destroy();
  }

  const resultLayer = await buildEquityContextFeatureLayer(
    contextDataset,
    pinned.result,
    pinned.id,
    {
      titleMain: pinned.layerTitleMain,
      titleSubtitle: pinned.layerSubtitle,
    }
  );

  const group = getOrCreateEquityResultsExtentGroup(
    map,
    pinned.result.geographicFilter,
    pinned.result.geographicLabel
  );
  group.add(resultLayer);
  group.visible = true;

  if (pinned.result.boundaryGeometry) {
    await mapView.goTo(pinned.result.boundaryGeometry).catch(() => {});
  } else {
    const extentResult = await resultLayer.queryExtent();
    if (extentResult.extent) {
      await mapView.goTo(extentResult.extent.expand(1.08)).catch(() => {});
    }
  }

  return resultLayer;
}

async function createBikeComfortReferenceLayer(
  infrastructureDataset: CatalogDataset
): Promise<FeatureLayer> {
  const layer = (await createLayerForCatalogDataset(
    infrastructureDataset
  )) as FeatureLayer;
  layer.id = EQUITY_BIKE_COMFORT_REFERENCE_LAYER_ID;
  layer.title = datasetDisplayTitle(infrastructureDataset);
  layer.opacity = 0.85;
  layer.popupEnabled = true;
  layer.legendEnabled = true;
  layer.listMode = "show";
  layer.labelsVisible = false;

  await applyBicycleComfortMapLayerStyle(layer, infrastructureDataset);

  const metadata = await fetchArcGisFeatureLayerMetadata(infrastructureDataset);
  const categoryField = metadata?.portalLayerRendererField ?? "class_export";

  await applyBicycleComfortMapPopup(layer);

  await optimizeFeatureLayerTileQueries(layer, {
    extraOutFields: [categoryField, "name", "class_export", "comfort_class"],
  });

  return layer;
}

async function resolveBikeComfortCategoryField(
  layer: FeatureLayer,
  infrastructureDataset: CatalogDataset
): Promise<string> {
  const metadata = await fetchArcGisFeatureLayerMetadata(infrastructureDataset);
  const categoryField = metadata?.portalLayerRendererField ?? "class_export";
  await layer.load();
  if (layer.fields?.some((field) => field.name === categoryField)) {
    return categoryField;
  }
  if (layer.fields?.some((field) => field.name === "class_export")) {
    return "class_export";
  }
  return categoryField;
}

async function resolveBikeComfortBandCategories(
  layer: FeatureLayer,
  infrastructureDataset: CatalogDataset
): Promise<{ bandField: string; bandCategoryValues: string[] }> {
  await layer.load();
  const layerMeta = layer as FeatureLayer & EquityReferenceLayerMeta;
  const metadata = await fetchArcGisFeatureLayerMetadata(infrastructureDataset);
  const bandField = await resolveBicycleComfortBandField(
    layer,
    metadata?.portalLayerRendererField
  );
  const eligibility = buildBicycleComfortEligibleSegmentsWhereClause(layer);

  const cachedCategories = layerMeta.equityComfortCategories;
  const cacheLooksValid =
    layerMeta.equityCategoryField === bandField &&
    cachedCategories?.length &&
    (bandField !== "comfort_class" ||
      categoriesMatchComfortBands(cachedCategories, ["low", "medium", "high"]).length >
        0);

  if (cacheLooksValid && cachedCategories) {
    return {
      bandField,
      bandCategoryValues: cachedCategories,
    };
  }

  const bandCategoryValues = await listBicycleComfortCategories(
    layer,
    bandField,
    eligibility
  );
  layerMeta.equityCategoryField = bandField;
  layerMeta.equityComfortCategories = bandCategoryValues;
  return { bandField, bandCategoryValues };
}

async function applyBikeComfortReferenceLayerFilters(
  mapView: __esri.MapView,
  layer: FeatureLayer,
  infrastructureDataset: CatalogDataset,
  boundaryGeometry: Polygon | null,
  comfortSelection: InfrastructureComfortSelection
): Promise<void> {
  await layer.load();

  let definitionExpression = "1=1";
  if (isBicycleComfortMapDataset(infrastructureDataset)) {
    const { bandField, bandCategoryValues } = await resolveBikeComfortBandCategories(
      layer,
      infrastructureDataset
    );
    definitionExpression = buildInfrastructureComfortWhereClause(
      comfortSelection,
      bandField,
      bandCategoryValues,
      layer
    );
  }

  layer.definitionExpression = definitionExpression;
  if (layer.url) {
    layer.refresh();
  }

  const layerView = (await mapView.whenLayerView(
    layer
  )) as unknown as __esri.FeatureLayerView;

  if (boundaryGeometry) {
    layerView.filter = new FeatureFilter({
      geometry: boundaryGeometry,
      spatialRelationship: "intersects",
    });
  } else {
    layerView.filter = null;
  }
}

export async function syncBikeComfortReferenceLayer(
  mapView: __esri.MapView | null,
  infrastructureDataset: CatalogDataset | null,
  visible: boolean,
  boundaryGeometry: Polygon | null,
  comfortSelection: InfrastructureComfortSelection
): Promise<void> {
  const task = async () => {
    if (!mapView?.map) return;

    const map = mapView.map;
    let layer = map.findLayerById(
      EQUITY_BIKE_COMFORT_REFERENCE_LAYER_ID
    ) as FeatureLayer | undefined;

    if (!infrastructureDataset) {
      removeMapLayersById(map, EQUITY_BIKE_COMFORT_REFERENCE_LAYER_ID);
      return;
    }

    const datasetChanged =
      layer &&
      (layer as FeatureLayer & { equitySourceDatasetId?: number }).equitySourceDatasetId !==
        infrastructureDataset.id;

    if (layer && !datasetChanged) {
      layer.visible = visible;
    } else {
      removeMapLayersById(map, EQUITY_BIKE_COMFORT_REFERENCE_LAYER_ID);

      layer = await createBikeComfortReferenceLayer(infrastructureDataset);
      (
        layer as FeatureLayer & { equitySourceDatasetId?: number }
      ).equitySourceDatasetId = infrastructureDataset.id;
      map.add(layer, 0);
      layer.visible = visible;
    }

    await applyBikeComfortReferenceLayerFilters(
      mapView,
      layer,
      infrastructureDataset,
      boundaryGeometry,
      comfortSelection
    );
  };

  bikeComfortReferenceSync = chainLayerSync(bikeComfortReferenceSync, task);
  await bikeComfortReferenceSync;
}

export function removePinnedEquityAnalysisFromMap(
  mapView: __esri.MapView | null,
  analysisId: string
): void {
  if (!mapView?.map) return;

  const map = mapView.map;
  const layer = findEquityResultLayer(map, analysisId);
  if (!layer) return;

  const group = findEquityResultsGroupContainingLayer(map, layer);
  if (group) {
    group.remove(layer);
    removeEquityResultsGroupIfEmpty(map, group.id);
  } else {
    map.remove(layer);
  }
  layer.destroy();
}

export function removeAllEquityAnalysisLayersFromMap(
  mapView: __esri.MapView | null
): void {
  if (!mapView?.map) return;

  const map = mapView.map;

  for (const group of findEquityResultsExtentGroups(map)) {
    for (const layer of group.layers.toArray()) {
      group.remove(layer);
      layer.destroy();
    }
    map.remove(group);
    group.destroy();
  }

  for (const layer of map.layers.toArray()) {
    if (isEquityAnalysisResultLayerId(layer.id)) {
      map.remove(layer);
      layer.destroy();
    }
  }
}

export function removeBikeComfortReferenceLayerFromMap(
  mapView: __esri.MapView | null
): void {
  if (!mapView?.map) return;
  const layer = mapView.map.findLayerById(EQUITY_BIKE_COMFORT_REFERENCE_LAYER_ID);
  if (layer) {
    mapView.map.remove(layer);
    layer.destroy();
  }
}

async function createServerContextReferenceLayer(
  contextDataset: CatalogDataset,
  contextKind: EquityContextCategoryKind | null,
  geographyUnit: EquityGeographyUnit | null
): Promise<FeatureLayer> {
  const layer = (await createLayerForCatalogDataset(
    contextDataset
  )) as FeatureLayer;
  await layer.load();

  if (contextKind === "demographics" && geographyUnit) {
    layer.definitionExpression = mergeContextLayerWhereClause(
      "1=1",
      geographyUnit,
      contextKind,
      layer
    );
  }

  layer.id = EQUITY_CONTEXT_REFERENCE_LAYER_ID;
  layer.title = datasetDisplayTitle(contextDataset);
  layer.opacity = 0.75;
  layer.popupEnabled = true;
  layer.legendEnabled = true;
  layer.listMode = "show";

  return layer;
}

async function buildClientContextReferenceLayer(
  contextDataset: CatalogDataset,
  selectedContextFields: string[],
  boundaryGeometry: Polygon | null,
  contextKind: EquityContextCategoryKind | null,
  geographyUnit: EquityGeographyUnit | null
): Promise<FeatureLayer> {
  const contextFields = normalizeContextFieldSelection(selectedContextFields);
  const primaryField = contextFields[0] ?? null;
  const sourceLayer = (await createLayerForCatalogDataset(
    contextDataset
  )) as FeatureLayer;
  await sourceLayer.load();

  const usePercent =
    contextFields.length > 0 &&
    contextFields.every((fieldName) =>
      shouldUseAcsPercentIndicator(fieldName, contextDataset, contextKind)
    );

  const fieldAliases = Object.fromEntries(
    contextFields.map((fieldName) => {
      const meta = sourceLayer.fields?.find((field) => field.name === fieldName);
      return [fieldName, meta?.alias];
    })
  );
  const indicatorLabel =
    contextFields.length > 0
      ? formatCombinedContextIndicatorLabel(
          contextFields,
          contextDataset,
          contextKind,
          fieldAliases
        )
      : "Indicator";

  const query = sourceLayer.createQuery();
  query.where = mergeContextLayerWhereClause(
    "1=1",
    geographyUnit ?? "tract",
    contextKind,
    sourceLayer
  );
  query.outFields = ["*"];
  query.returnGeometry = true;
  query.num = 5000;

  if (boundaryGeometry) {
    query.geometry = boundaryGeometry;
    query.spatialRelationship = "intersects";
  }

  const result = await sourceLayer.queryFeatures(query);
  const graphics: Graphic[] = [];

  for (const feature of result.features) {
    if (!feature.geometry) continue;

    let displayGeometry = feature.geometry;

    if (boundaryGeometry) {
      const prepared = await prepareEquityUnitGeometry(
        feature.geometry,
        boundaryGeometry
      );
      if (!prepared) continue;
      displayGeometry = prepared.displayGeometry;
    }

    const attrs = {
      ...((feature.attributes ?? {}) as Record<string, unknown>),
    };

    if (usePercent && contextFields.length > 0) {
      const percentValue = resolveCombinedContextIndicatorValue(
        attrs,
        contextFields,
        contextDataset,
        contextKind
      );
      if (percentValue == null) continue;
      attrs[EQUITY_COMPUTED_CONTEXT_VALUE_FIELD] = percentValue;
    }

    graphics.push(
      new Graphic({
        geometry: displayGeometry,
        attributes: attrs,
      })
    );
  }

  const fields = [...(sourceLayer.fields || [])];
  if (usePercent) {
    fields.push(
      new Field({
        name: EQUITY_COMPUTED_CONTEXT_VALUE_FIELD,
        type: "double",
        alias: indicatorLabel,
      })
    );
  }

  const selectableFieldCount = filterSelectableContextFields(
    sourceLayer.fields ?? [],
    { dataset: contextDataset, contextKind }
  ).length;
  const multipleIndicators = selectableFieldCount > 1;

  return new FeatureLayer({
    id: EQUITY_CONTEXT_REFERENCE_LAYER_ID,
    title:
      contextFields.length > 0
        ? formatEquityContextLayerTitle(
            contextDataset,
            contextFields,
            contextKind,
            fieldAliases[primaryField ?? ""],
            { multipleIndicators }
          )
        : datasetDisplayTitle(contextDataset),
    source: graphics,
    objectIdField: sourceLayer.objectIdField || "OBJECTID",
    geometryType: "polygon",
    spatialReference: sourceLayer.spatialReference,
    fields,
    popupEnabled: true,
    legendEnabled: true,
    listMode: "show",
    opacity: 0.75,
    outFields: ["*"],
  });
}

async function finalizeContextReferenceLayerStyle(
  layer: FeatureLayer,
  contextDataset: CatalogDataset,
  selectedContextFields: string[],
  mapView: __esri.MapView,
  contextKind: EquityContextCategoryKind | null
): Promise<void> {
  const contextFields = normalizeContextFieldSelection(selectedContextFields);
  const primaryField = contextFields[0] ?? null;
  if (primaryField) {
    const fieldAliases = Object.fromEntries(
      contextFields.map((fieldName) => {
        const meta = layer.fields?.find((field) => field.name === fieldName);
        return [fieldName, meta?.alias];
      })
    );
    const indicatorLabel = formatCombinedContextIndicatorLabel(
      contextFields,
      contextDataset,
      contextKind,
      fieldAliases
    );
    const selectableFieldCount = filterSelectableContextFields(
      layer.fields ?? [],
      { dataset: contextDataset, contextKind }
    ).length;
    const multipleIndicators = selectableFieldCount > 1;

    layer.title = formatEquityContextLayerTitle(
      contextDataset,
      contextFields,
      contextKind,
      fieldAliases[primaryField],
      { multipleIndicators }
    );
    const usePercent = contextFields.every((fieldName) =>
      shouldUseAcsPercentIndicator(fieldName, contextDataset, contextKind)
    );
    const rendererField = usePercent
      ? EQUITY_COMPUTED_CONTEXT_VALUE_FIELD
      : primaryField;

    if (!usePercent) {
      setLayerFieldAlias(layer, primaryField, indicatorLabel);
    } else {
      setLayerFieldAlias(layer, EQUITY_COMPUTED_CONTEXT_VALUE_FIELD, indicatorLabel);
    }

    if (!layer.source) {
      await layer.load();
      const extraOutFields = [...contextFields];
      for (const fieldName of contextFields) {
        const totalField = acsTotalFieldName(fieldName);
        if (totalField) extraOutFields.push(totalField);
      }
      await optimizeFeatureLayerTileQueries(layer, {
        extraOutFields,
      });
    }

    await applyEquityContextIndicatorRenderer(layer, mapView, contextFields, {
      dataset: contextDataset,
      contextKind,
      rendererField,
    });
    await applyEquityContextFeatureLayerPopup(layer, contextDataset, contextKind);
    return;
  }

  await applyCatalogFeatureLayerPortalStyle(layer, contextDataset);
  await applyEquityContextFeatureLayerPopup(layer, contextDataset, contextKind);
}

async function createContextReferenceLayer(
  contextDataset: CatalogDataset,
  selectedContextFields: string[],
  boundaryGeometry: Polygon | null,
  contextKind: EquityContextCategoryKind | null,
  geographyUnit: EquityGeographyUnit | null
): Promise<FeatureLayer> {
  const contextFields = normalizeContextFieldSelection(selectedContextFields);
  const usePercent =
    contextFields.length > 1 ||
    (contextFields.length === 1 &&
      shouldUseAcsPercentIndicator(
        contextFields[0],
        contextDataset,
        contextKind
      ));

  if (usePercent || boundaryGeometry) {
    return buildClientContextReferenceLayer(
      contextDataset,
      contextFields,
      boundaryGeometry,
      contextKind,
      geographyUnit
    );
  }

  return createServerContextReferenceLayer(
    contextDataset,
    contextKind,
    geographyUnit
  );
}

function setLayerFieldAlias(
  layer: FeatureLayer,
  fieldName: string,
  alias: string
): void {
  if (!layer.fields?.length) return;

  layer.fields = layer.fields.map((field) => {
    if (field.name !== fieldName) return field;
    return new Field({
      name: field.name,
      type: field.type,
      alias,
    });
  });
}

export async function syncContextReferenceLayer(
  mapView: __esri.MapView | null,
  contextDataset: CatalogDataset | null,
  visible: boolean,
  boundaryGeometry: Polygon | null,
  selectedContextFields: string[],
  contextKind: EquityContextCategoryKind | null,
  geographyUnit: EquityGeographyUnit | null
): Promise<void> {
  const contextFieldKey = encodeContextFieldSelection(selectedContextFields);
  const task = async () => {
    if (!mapView?.map) return;

    const map = mapView.map;
    let layer = map.findLayerById(
      EQUITY_CONTEXT_REFERENCE_LAYER_ID
    ) as FeatureLayer | undefined;

    if (!contextDataset) {
      removeMapLayersById(map, EQUITY_CONTEXT_REFERENCE_LAYER_ID);
      return;
    }

    const boundaryKey = boundaryGeometryKey(boundaryGeometry);
    const existingMeta = layer ? readEquityReferenceLayerMeta(layer) : null;
    const needsRebuild =
      !layer ||
      existingMeta?.equitySourceDatasetId !== contextDataset.id ||
      existingMeta?.equityContextField !== contextFieldKey ||
      existingMeta?.equityBoundaryKey !== boundaryKey ||
      existingMeta?.equityGeographyUnit !== geographyUnit;

    if (layer && !needsRebuild) {
      layer.visible = visible;
    } else {
      removeMapLayersById(map, EQUITY_CONTEXT_REFERENCE_LAYER_ID);

      const normalizedFields = normalizeContextFieldSelection(
        selectedContextFields
      );
      layer = await createContextReferenceLayer(
        contextDataset,
        normalizedFields,
        boundaryGeometry,
        contextKind,
        geographyUnit
      );
      assignEquityReferenceLayerMeta(layer, {
        equitySourceDatasetId: contextDataset.id,
        equityContextField: contextFieldKey,
        equityBoundaryKey: boundaryKey,
        equityGeographyUnit: geographyUnit,
      });
      map.add(layer, 0);
      layer.visible = visible;

      await finalizeContextReferenceLayerStyle(
        layer,
        contextDataset,
        normalizedFields,
        mapView,
        contextKind
      );
    }
  };

  contextReferenceSync = chainLayerSync(contextReferenceSync, task);
  await contextReferenceSync;
}

export function removeContextReferenceLayerFromMap(
  mapView: __esri.MapView | null
): void {
  if (!mapView?.map) return;
  const layer = mapView.map.findLayerById(EQUITY_CONTEXT_REFERENCE_LAYER_ID);
  if (layer) {
    mapView.map.remove(layer);
    layer.destroy();
  }
}

function geographicFilterKey(filter: EquityGeographicFilter): string {
  return `${filter.level}|${filter.placeName ?? ""}`;
}

let geographicExtentPreviewKey: string | null = null;

export function resetGeographicExtentPreviewCache(): void {
  geographicExtentPreviewKey = null;
}

export async function syncGeographicExtentPreviewLayer(
  mapView: __esri.MapView | null,
  active: boolean,
  geographicFilter: EquityGeographicFilter | null
): Promise<void> {
  if (!mapView?.map) return;

  const map = mapView.map;
  let layer = map.findLayerById(
    EQUITY_GEOGRAPHIC_EXTENT_PREVIEW_LAYER_ID
  ) as GraphicsLayer | undefined;

  if (!active || !geographicFilter) {
    removeMapLayersById(map, EQUITY_GEOGRAPHIC_EXTENT_PREVIEW_LAYER_ID);
    geographicExtentPreviewKey = null;
    return;
  }

  const boundariesLabel = describeEquityGeographicBoundariesLabel(
    geographicFilter
  );
  const filterKey = geographicFilterKey(geographicFilter);

  if (layer && geographicExtentPreviewKey === filterKey) {
    layer.title = boundariesLabel;
    layer.visible = true;
    return;
  }

  const geometry = await resolveEquityPreviewExtentGeometry(geographicFilter);
  if (!geometry) {
    if (layer) layer.visible = false;
    return;
  }

  removeMapLayersById(map, EQUITY_GEOGRAPHIC_EXTENT_PREVIEW_LAYER_ID);

  layer = new GraphicsLayer({
    id: EQUITY_GEOGRAPHIC_EXTENT_PREVIEW_LAYER_ID,
    title: boundariesLabel,
    listMode: "show",
  });
  geographicExtentPreviewKey = filterKey;

  layer.add(
    new Graphic({
      geometry,
      symbol: new SimpleFillSymbol({
        color: [0, 0, 0, 0],
        outline: new SimpleLineSymbol({
          color: [156, 163, 175, 1],
          width: 1.5,
        }),
      }),
    })
  );

  map.add(layer, 0);
  layer.visible = true;
}

const GEOGRAPHIC_EXTENT_ZOOM_DURATION_MS = 1000;

export async function zoomMapToEquityGeographicExtent(
  mapView: __esri.MapView | null,
  geographicFilter: EquityGeographicFilter
): Promise<void> {
  if (!mapView) return;

  const geometry = await resolveEquityPreviewExtentGeometry(geographicFilter);
  if (!geometry) return;

  const extent = geometry.extent?.expand(1.08);
  if (!extent) return;

  await mapView
    .goTo(
      { target: extent },
      {
        animate: true,
        duration: GEOGRAPHIC_EXTENT_ZOOM_DURATION_MS,
        easing: "ease-in-out",
      }
    )
    .catch(() => {});
}

export function removeGeographicExtentPreviewLayerFromMap(
  mapView: __esri.MapView | null
): void {
  if (!mapView?.map) return;

  const layer = mapView.map.findLayerById(
    EQUITY_GEOGRAPHIC_EXTENT_PREVIEW_LAYER_ID
  );
  if (layer) {
    mapView.map.remove(layer);
    layer.destroy();
  }
  geographicExtentPreviewKey = null;
}

export function resolvePinnedEquityDatasets(
  tree: CatalogCategoryNode[],
  pinned: PinnedEquityAnalysis
): {
  infrastructureDataset: CatalogDataset | null;
  contextDataset: CatalogDataset | null;
} {
  return {
    infrastructureDataset: findDatasetInTree(
      tree,
      pinned.infrastructureDatasetId
    ),
    contextDataset: findDatasetInTree(tree, pinned.contextDatasetId),
  };
}

export {
  EQUITY_LAYER_PROP_TITLE_MAIN,
  EQUITY_LAYER_PROP_TITLE_SUB,
  isEquityAnalysisResultLayerId,
};
