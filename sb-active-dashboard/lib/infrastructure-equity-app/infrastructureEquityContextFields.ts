import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import ClassBreaksRenderer from "@arcgis/core/renderers/ClassBreaksRenderer";
import ClassBreakInfo from "@arcgis/core/renderers/support/ClassBreakInfo";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import * as typeRendererCreator from "@arcgis/core/smartMapping/renderers/type";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import { createLayerForCatalogDataset } from "@/lib/data-query-app/catalogLayerFactory";
import {
  getStylableFieldType,
  listNumericLayerFields,
  parseNumericAttributeValue,
} from "@/lib/data-query-app/genericFeatureLayerVisualization";
import { EquityContextCategoryKind } from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";
import {
  EQUITY_COMPUTED_CONTEXT_VALUE_FIELD,
  isAcsDemographicsDataset,
  isAcsTotalField,
  resolveAcsIndicatorValue,
  resolveCombinedContextIndicatorValue,
  shouldUseAcsPercentIndicator,
  acsTotalFieldName,
  sortEquityContextFields,
  normalizeContextFieldSelection,
} from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";

export { formatContextIndicatorLabel } from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";
export { formatEquityContextLayerTitle } from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";

export const EQUITY_CONTEXT_INDICATOR_NUM_CLASSES = 4;

const NUMERIC_FIELD_HINTS = [
  "pct",
  "percent",
  "rate",
  "score",
  "index",
  "income",
  "poverty",
];

/** Administrative / join fields that are not equity indicators. */
const EXCLUDED_CONTEXT_FIELD_NAMES = new Set([
  "geo_id",
  "tract",
  "acs2024tot",
]);

function fieldLabel(field: __esri.Field): string {
  return field.alias?.trim() || field.name;
}

function isExcludedContextField(field: __esri.Field): boolean {
  const name = field.name.toLowerCase();
  if (EXCLUDED_CONTEXT_FIELD_NAMES.has(name)) return true;

  if (name === "zip" || name === "zip_code" || name === "zipcode") return true;

  const alias = fieldLabel(field).toLowerCase();
  if (alias === "zip code" || alias.includes("zip code")) return true;

  return false;
}

export function filterSelectableContextFields(
  fields: __esri.Field[],
  options?: {
    dataset?: CatalogDataset | null;
    contextKind?: EquityContextCategoryKind | null;
  }
): __esri.Field[] {
  return fields.filter((field) => {
    if (isExcludedContextField(field)) return false;

    if (
      options?.dataset &&
      options.contextKind === "demographics" &&
      isAcsDemographicsDataset(options.dataset) &&
      isAcsTotalField(field.name)
    ) {
      return false;
    }

    return true;
  });
}

export function shouldShowContextFieldSelector(fields: __esri.Field[]): boolean {
  return fields.length > 1;
}

export async function loadNumericContextFields(
  dataset: CatalogDataset,
  contextKind?: EquityContextCategoryKind | null
): Promise<__esri.Field[]> {
  const layer = (await createLayerForCatalogDataset(dataset)) as FeatureLayer;
  await layer.load();
  const fields = filterSelectableContextFields(listNumericLayerFields(layer), {
    dataset,
    contextKind,
  });

  if (contextKind === "health" || contextKind === "demographics") {
    return sortEquityContextFields(fields, dataset, contextKind);
  }

  return fields;
}

function findMedianField(fields: __esri.Field[]): __esri.Field | undefined {
  return fields.find((field) => {
    const name = field.name.toLowerCase();
    const alias = field.alias?.toLowerCase() ?? "";
    return name.includes("median") || alias.includes("median");
  });
}

export function pickDefaultNumericContextField(
  fields: __esri.Field[],
  options?: {
    contextKind?: EquityContextCategoryKind | null;
    dataset?: CatalogDataset | null;
  }
): __esri.Field | undefined {
  if (
    options?.contextKind === "demographics" &&
    options.dataset &&
    isAcsDemographicsDataset(options.dataset)
  ) {
    const median = findMedianField(fields);
    if (median) return median;
  }

  if (options?.contextKind === "demographics") {
    const median = findMedianField(fields);
    if (median) return median;
  }

  for (const hint of NUMERIC_FIELD_HINTS) {
    const match = fields.find((field) =>
      field.name.toLowerCase().includes(hint)
    );
    if (match) return match;
  }

  return fields[0];
}

async function queryNumericFieldValues(
  layer: FeatureLayer,
  field: string | string[],
  options?: {
    dataset?: CatalogDataset | null;
    contextKind?: EquityContextCategoryKind | null;
  }
): Promise<number[]> {
  const fields = Array.isArray(field)
    ? normalizeContextFieldSelection(field)
    : normalizeContextFieldSelection([field]);
  if (fields.length === 0) return [];

  const primaryField = fields[0];
  const usePercent =
    fields.length > 1
      ? fields.every((fieldName) =>
          shouldUseAcsPercentIndicator(
            fieldName,
            options?.dataset ?? null,
            options?.contextKind ?? null
          )
        )
      : shouldUseAcsPercentIndicator(
          primaryField,
          options?.dataset ?? null,
          options?.contextKind ?? null
        );
  const totalField = usePercent ? acsTotalFieldName(primaryField) : null;

  const outFields = [...fields];
  if (usePercent && totalField && !outFields.includes(totalField)) {
    outFields.push(totalField);
  }

  const query = layer.createQuery();
  query.where = `${primaryField} IS NOT NULL`;
  query.outFields = outFields;
  query.returnGeometry = false;
  query.num = 5000;

  const result = await layer.queryFeatures(query);
  const values: number[] = [];

  for (const feature of result.features) {
    const attrs = (feature.attributes ?? {}) as Record<string, unknown>;
    if (usePercent) {
      const pct =
        fields.length > 1
          ? resolveCombinedContextIndicatorValue(
              attrs,
              fields,
              options?.dataset ?? null,
              options?.contextKind ?? null
            )
          : resolveAcsIndicatorValue(attrs, primaryField);
      if (pct != null) values.push(pct);
      continue;
    }

    const raw = attrs[primaryField];
    if (raw == null || raw === "") continue;
    const num = parseNumericAttributeValue(raw);
    if (num != null) values.push(num);
  }

  return values;
}

async function queryFieldValuesDirect(
  layer: FeatureLayer,
  field: string
): Promise<number[]> {
  const query = layer.createQuery();
  query.where = `${field} IS NOT NULL`;
  query.outFields = [field];
  query.returnGeometry = false;
  query.num = 5000;

  const result = await layer.queryFeatures(query);
  const values: number[] = [];

  for (const feature of result.features) {
    const raw = feature.attributes?.[field];
    if (raw == null || raw === "") continue;
    const num = parseNumericAttributeValue(raw);
    if (num != null) values.push(num);
  }

  return values;
}

/** Drop duplicate degenerate bins (e.g. repeated 0–0 quantile classes). */
function mergeDegenerateClassBreaks(
  breaks: Array<{ minValue: number; maxValue: number }>
): Array<{ minValue: number; maxValue: number }> {
  if (breaks.length <= 1) return breaks;

  const merged: Array<{ minValue: number; maxValue: number }> = [];

  for (const br of breaks) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...br });
      continue;
    }

    if (
      br.minValue === br.maxValue &&
      last.minValue === br.minValue &&
      last.maxValue === br.maxValue
    ) {
      continue;
    }

    if (br.minValue === last.maxValue && br.minValue === br.maxValue) {
      last.maxValue = br.maxValue;
      continue;
    }

    merged.push({ ...br });
  }

  return merged.length > 0 ? merged : breaks;
}

function formatClassBreakLabel(min: number, max: number): string {
  const fmt = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (min === max) return fmt(min);
  return `${fmt(min)} – ${fmt(max)}`;
}

function computeQuantileBreaksFromSorted(
  sorted: number[],
  numClasses: number
): Array<{ minValue: number; maxValue: number }> {
  if (sorted.length === 0) return [];

  const distinctCount = new Set(sorted).size;
  const classCount = Math.min(numClasses, distinctCount);
  if (classCount <= 1) {
    return [
      { minValue: sorted[0], maxValue: sorted[sorted.length - 1] },
    ];
  }

  const breaks: Array<{ minValue: number; maxValue: number }> = [];

  for (let i = 0; i < classCount; i++) {
    const lowerIdx = Math.floor((i * sorted.length) / classCount);
    const upperIdx = Math.floor(((i + 1) * sorted.length) / classCount) - 1;
    breaks.push({
      minValue: sorted[lowerIdx],
      maxValue: sorted[Math.max(lowerIdx, upperIdx)],
    });
  }

  return mergeDegenerateClassBreaks(breaks);
}

/**
 * Build quantile classes from sampled values. When many tracts are 0% (common for
 * race indicators), reserve one class for zero and quantile the positive values.
 */
function buildEquityIndicatorClassBreaks(
  values: number[],
  numClasses: number
): Array<{ minValue: number; maxValue: number }> {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return [];

  const sorted = [...finite].sort((a, b) => a - b);
  const maxClasses = Math.min(
    numClasses,
    Math.max(1, new Set(sorted).size)
  );

  const zeroValues = sorted.filter((value) => value === 0);
  const positiveValues = sorted.filter((value) => value > 0);

  if (zeroValues.length > 0 && positiveValues.length > 0 && maxClasses > 1) {
    const zeroClassWarranted =
      zeroValues.length >= Math.ceil(sorted.length / maxClasses);

    if (zeroClassWarranted) {
      const positiveBreaks = computeQuantileBreaksFromSorted(
        positiveValues,
        maxClasses - 1
      );
      return mergeDegenerateClassBreaks([
        { minValue: 0, maxValue: 0 },
        ...positiveBreaks,
      ]);
    }
  }

  return computeQuantileBreaksFromSorted(sorted, maxClasses);
}

const EQUITY_INDICATOR_FILL_COLORS = [
  "#edf8fb",
  "#b2e2e2",
  "#66c2a4",
  "#238b45",
];

function resolveEquityIndicatorColors(count: number): string[] {
  if (count <= EQUITY_INDICATOR_FILL_COLORS.length) {
    return EQUITY_INDICATOR_FILL_COLORS.slice(0, count);
  }

  return Array.from({ length: count }, (_, index) => {
    const position = count <= 1 ? 0 : index / (count - 1);
    const paletteIndex = Math.round(
      position * (EQUITY_INDICATOR_FILL_COLORS.length - 1)
    );
    return EQUITY_INDICATOR_FILL_COLORS[paletteIndex];
  });
}

function buildClassBreaksRenderer(
  field: string,
  breaks: Array<{ minValue: number; maxValue: number }>,
  colors: string[]
): ClassBreaksRenderer {
  const classBreakInfos = breaks.map((br, index) =>
    new ClassBreakInfo({
      minValue: br.minValue,
      maxValue: br.maxValue,
      label: formatClassBreakLabel(br.minValue, br.maxValue),
      symbol: new SimpleFillSymbol({
        color: colors[index] ?? colors[colors.length - 1],
        outline: { color: [255, 255, 255, 0.85], width: 0.5 },
      }),
    })
  );

  return new ClassBreaksRenderer({
    field,
    classBreakInfos,
  });
}

/** Graduated (or unique-value) symbology for the selected equity indicator field. */
export async function applyEquityContextIndicatorRenderer(
  layer: FeatureLayer,
  mapView: __esri.MapView,
  contextFields: string | string[],
  options?: {
    dataset?: CatalogDataset | null;
    contextKind?: EquityContextCategoryKind | null;
    rendererField?: string;
  }
): Promise<void> {
  await layer.load();

  const fields = Array.isArray(contextFields)
    ? normalizeContextFieldSelection(contextFields)
    : normalizeContextFieldSelection([contextFields]);
  const primaryField = fields[0];
  if (!primaryField) return;

  const rendererField = options?.rendererField ?? primaryField;
  const fieldMeta = layer.fields?.find((field) => field.name === rendererField);
  const fieldType = fieldMeta ? getStylableFieldType(fieldMeta) : "numeric";
  layer.opacity = 0.75;

  if (fieldType === "categorical") {
    const response = await typeRendererCreator.createRenderer({
      layer,
      view: mapView,
      field: rendererField,
      numTypes: -1,
      defaultSymbolEnabled: true,
    });
    if (response.renderer) {
      layer.renderer = response.renderer;
    }
    return;
  }

  const values =
    rendererField === EQUITY_COMPUTED_CONTEXT_VALUE_FIELD
      ? await queryFieldValuesDirect(layer, rendererField)
      : await queryNumericFieldValues(layer, fields, {
          dataset: options?.dataset,
          contextKind: options?.contextKind,
        });

  const breaks = buildEquityIndicatorClassBreaks(
    values,
    EQUITY_CONTEXT_INDICATOR_NUM_CLASSES
  );
  if (breaks.length === 0) return;

  const colors = resolveEquityIndicatorColors(breaks.length);
  layer.renderer = buildClassBreaksRenderer(rendererField, breaks, colors);
}
