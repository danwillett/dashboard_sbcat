import {
  CatalogDataset,
  datasetDisplayTitle,
} from "@/lib/data-services/CatalogApiService";
import { parseNumericAttributeValue } from "@/lib/data-query-app/genericFeatureLayerVisualization";
import { EquityContextCategoryKind } from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";

export const EQUITY_COMPUTED_CONTEXT_VALUE_FIELD = "equity_context_indicator_value";

/** Encodes multi-indicator selections for map layer metadata. */
export const CONTEXT_FIELD_SELECTION_DELIMITER = "\u001f";

export function normalizeContextFieldSelection(fieldNames: string[]): string[] {
  return [...new Set(fieldNames.filter(Boolean))];
}

export function encodeContextFieldSelection(fieldNames: string[]): string {
  return normalizeContextFieldSelection(fieldNames).join(
    CONTEXT_FIELD_SELECTION_DELIMITER
  );
}

export function decodeContextFieldSelection(encoded: string): string[] {
  if (!encoded) return [];
  return normalizeContextFieldSelection(
    encoded.split(CONTEXT_FIELD_SELECTION_DELIMITER)
  );
}

export function areContextIndicatorsCombinable(
  fieldNames: string[],
  dataset: CatalogDataset | null,
  contextKind: EquityContextCategoryKind | null
): boolean {
  const fields = normalizeContextFieldSelection(fieldNames);
  if (fields.length <= 1) return true;

  const prefix = acsFieldPrefix(fields[0]);
  if (!prefix) return false;

  for (const fieldName of fields) {
    if (isAcsMedianField(fieldName)) return false;
    if (acsFieldPrefix(fieldName) !== prefix) return false;
    if (!shouldUseAcsPercentIndicator(fieldName, dataset, contextKind)) {
      return false;
    }
  }

  return true;
}

export function canCombineContextIndicator(
  fieldName: string,
  dataset: CatalogDataset | null,
  contextKind: EquityContextCategoryKind | null
): boolean {
  if (isAcsMedianField(fieldName)) return false;
  return shouldUseAcsPercentIndicator(fieldName, dataset, contextKind);
}

export function toggleContextFieldSelection(
  fieldName: string,
  selectedFields: string[],
  dataset: CatalogDataset | null,
  contextKind: EquityContextCategoryKind | null
): string[] {
  const current = normalizeContextFieldSelection(selectedFields);
  const isSelected = current.includes(fieldName);

  if (isAcsMedianField(fieldName)) {
    return isSelected ? [] : [fieldName];
  }

  if (isSelected) {
    return current.filter((entry) => entry !== fieldName);
  }

  if (current.length === 0) {
    return [fieldName];
  }

  if (current.some((entry) => isAcsMedianField(entry))) {
    return [fieldName];
  }

  const next = [...current, fieldName];
  if (!areContextIndicatorsCombinable(next, dataset, contextKind)) {
    return [fieldName];
  }

  return next;
}

export function isAcsDemographicsDataset(dataset: CatalogDataset): boolean {
  const haystack = [
    dataset.display_title,
    dataset.service_path,
    dataset.service_name,
    dataset.primary_url,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes("acs") || haystack.includes("american community");
}

export function isAcsMedianField(fieldName: string): boolean {
  return fieldName.toLowerCase().includes("median");
}

export function isAcsTotalField(fieldName: string): boolean {
  return fieldName.toLowerCase().endsWith("_total");
}

export function acsFieldPrefix(fieldName: string): string | null {
  const underscoreIndex = fieldName.indexOf("_");
  if (underscoreIndex <= 0) return null;
  return fieldName.slice(0, underscoreIndex);
}

export function acsTotalFieldName(fieldName: string): string | null {
  const prefix = acsFieldPrefix(fieldName);
  if (!prefix) return null;
  return `${prefix}_total`;
}

export function shouldUseAcsPercentIndicator(
  fieldName: string,
  dataset: CatalogDataset | null,
  contextKind: EquityContextCategoryKind | null
): boolean {
  if (
    contextKind !== "demographics" ||
    !dataset ||
    !isAcsDemographicsDataset(dataset)
  ) {
    return false;
  }
  if (isAcsMedianField(fieldName) || isAcsTotalField(fieldName)) {
    return false;
  }
  return acsTotalFieldName(fieldName) != null;
}

/** Remove dataset prefix and format remainder (e.g. housing_age_2010_2019 → 2010 to 2019). */
export function formatEquityContextFieldDisplayLabel(
  fieldName: string,
  dataset: CatalogDataset
): string {
  const parts = equityContextFieldRemainderParts(fieldName, dataset);
  if (parts.length === 0) return fieldName;

  return formatEquityContextFieldRemainder(parts);
}

function isNumericSegment(segment: string): boolean {
  return /^\d+$/.test(segment);
}

const LOWERCASE_LABEL_WORDS = new Set(["to", "and"]);

function capitalizeWord(word: string): string {
  if (!word) return word;
  if (LOWERCASE_LABEL_WORDS.has(word.toLowerCase())) {
    return word.toLowerCase();
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function fieldPartMatchesDatasetWord(
  fieldPart: string,
  datasetWord: string
): boolean {
  if (fieldPart === datasetWord) return true;
  if (fieldPart.length < 3 || datasetWord.length < 3) return false;
  return datasetWord.startsWith(fieldPart);
}

function stripDatasetPrefixFromFieldParts(
  parts: string[],
  datasetWords: string[]
): number {
  let index = 0;

  while (
    index < parts.length &&
    index < datasetWords.length &&
    parts[index] === datasetWords[index]
  ) {
    index += 1;
  }

  if (index > 0) return index;

  if (parts.length === 0 || datasetWords.length === 0) return 0;

  if (fieldPartMatchesDatasetWord(parts[0], datasetWords[0])) {
    index = 1;

    while (
      index < parts.length &&
      index < datasetWords.length &&
      parts[index] === datasetWords[index]
    ) {
      index += 1;
    }

    if (
      index < parts.length &&
      index < datasetWords.length &&
      fieldPartMatchesDatasetWord(parts[index], datasetWords[index])
    ) {
      index += 1;
    }

    return index;
  }

  if (datasetWords.includes(parts[0])) {
    return 1;
  }

  return 0;
}

/** Field-name segments after stripping the dataset title prefix. */
export function equityContextFieldRemainderParts(
  fieldName: string,
  dataset: CatalogDataset
): string[] {
  const parts = fieldName.toLowerCase().split("_").filter(Boolean);
  if (parts.length === 0) return parts;

  const datasetWords = datasetDisplayTitle(dataset)
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean);

  const index = stripDatasetPrefixFromFieldParts(parts, datasetWords);
  return parts.slice(index);
}

interface EquityContextIndicatorSortKey {
  tier: number;
  order: number;
  label: string;
}

function equityContextIndicatorSortKey(
  fieldName: string,
  dataset: CatalogDataset,
  contextKind: EquityContextCategoryKind | null
): EquityContextIndicatorSortKey {
  const label = formatContextIndicatorLabel(
    fieldName,
    dataset,
    contextKind
  ).toLowerCase();

  if (contextKind === "health" || contextKind === "demographics") {
    const parts = equityContextFieldRemainderParts(fieldName, dataset);

    if (parts.includes("median")) {
      return { tier: 0, order: 0, label };
    }

    const underIndex = parts.indexOf("under");
    if (underIndex >= 0) {
      const next = parts[underIndex + 1];
      if (next && isNumericSegment(next)) {
        return { tier: 1, order: Number(next), label };
      }
    }

    for (let index = 0; index < parts.length - 2; index += 1) {
      if (
        parts[index + 1] === "to" &&
        isNumericSegment(parts[index]) &&
        isNumericSegment(parts[index + 2])
      ) {
        return { tier: 2, order: Number(parts[index]), label };
      }
    }

    let numericStart = 0;
    while (
      numericStart < parts.length &&
      !isNumericSegment(parts[numericStart])
    ) {
      numericStart += 1;
    }
    const numericParts = parts.slice(numericStart);
    if (
      numericParts.length >= 2 &&
      numericParts.every(isNumericSegment)
    ) {
      return { tier: 2, order: Number(numericParts[0]), label };
    }
  }

  return { tier: 3, order: 0, label };
}

export function compareEquityContextIndicatorFields(
  fieldA: __esri.Field,
  fieldB: __esri.Field,
  dataset: CatalogDataset,
  contextKind: EquityContextCategoryKind | null
): number {
  const keyA = equityContextIndicatorSortKey(
    fieldA.name,
    dataset,
    contextKind
  );
  const keyB = equityContextIndicatorSortKey(
    fieldB.name,
    dataset,
    contextKind
  );

  if (keyA.tier !== keyB.tier) return keyA.tier - keyB.tier;
  if (keyA.order !== keyB.order) return keyA.order - keyB.order;
  return keyA.label.localeCompare(keyB.label, undefined, { sensitivity: "base" });
}

export function sortEquityContextFields(
  fields: __esri.Field[],
  dataset: CatalogDataset,
  contextKind: EquityContextCategoryKind | null
): __esri.Field[] {
  return [...fields].sort((fieldA, fieldB) =>
    compareEquityContextIndicatorFields(
      fieldA,
      fieldB,
      dataset,
      contextKind
    )
  );
}

function formatEquityContextFieldRemainder(parts: string[]): string {
  if (parts.length === 0) return "";

  let numericStart = 0;
  while (numericStart < parts.length && !isNumericSegment(parts[numericStart])) {
    numericStart += 1;
  }

  const numericParts = parts.slice(numericStart);
  const textParts = parts.slice(0, numericStart);

  if (
    numericParts.length >= 2 &&
    numericParts.every(isNumericSegment)
  ) {
    return numericParts.join(" to ");
  }

  return [...textParts, ...numericParts].map(capitalizeWord).join(" ");
}

/** @deprecated Use formatEquityContextFieldDisplayLabel */
export function formatAcsIndicatorDisplayLabel(fieldName: string): string {
  const parts = fieldName.toLowerCase().split("_").filter(Boolean);
  if (parts.length <= 1) return fieldName.replace(/_/g, " ");
  return formatEquityContextFieldRemainder(parts.slice(1));
}

export function formatContextIndicatorLabel(
  fieldName: string,
  dataset: CatalogDataset | null,
  contextKind: EquityContextCategoryKind | null,
  fieldAlias?: string | null
): string {
  let label: string;

  if (
    dataset &&
    (contextKind === "health" || contextKind === "demographics")
  ) {
    label = formatEquityContextFieldDisplayLabel(fieldName, dataset);
  } else {
    label = fieldAlias?.trim() || fieldName.replace(/_/g, " ");
  }

  if (shouldUseAcsPercentIndicator(fieldName, dataset, contextKind)) {
    return `${label} (%)`;
  }

  return label;
}

/** Layer / legend title for a context preview with a selected indicator. */
export function formatEquityContextLayerTitle(
  dataset: CatalogDataset,
  contextFields: string[] | string | null,
  contextKind: EquityContextCategoryKind | null,
  fieldAlias?: string | null,
  options?: { multipleIndicators?: boolean }
): string {
  const datasetTitle = datasetDisplayTitle(dataset);
  const fields = Array.isArray(contextFields)
    ? normalizeContextFieldSelection(contextFields)
    : contextFields
      ? [contextFields]
      : [];
  if (fields.length === 0) return datasetTitle;

  if (options?.multipleIndicators === false) {
    return datasetTitle;
  }

  const indicatorLabel = formatCombinedContextIndicatorLabel(
    fields,
    dataset,
    contextKind,
    fieldAlias ? { [fields[0]]: fieldAlias } : undefined
  );
  return `${datasetTitle} - ${indicatorLabel}`;
}

function stripPercentSuffix(label: string): string {
  return label.replace(/ \(\%\)$/, "");
}

export function formatCombinedContextIndicatorLabel(
  fieldNames: string[] | string,
  dataset: CatalogDataset | null,
  contextKind: EquityContextCategoryKind | null,
  aliases?: Record<string, string | null | undefined>
): string {
  const fields = Array.isArray(fieldNames)
    ? normalizeContextFieldSelection(fieldNames)
    : normalizeContextFieldSelection([fieldNames]);
  if (fields.length === 0) return "";

  if (fields.length === 1) {
    return formatContextIndicatorLabel(
      fields[0],
      dataset,
      contextKind,
      aliases?.[fields[0]]
    );
  }

  const labels = fields.map((fieldName) =>
    stripPercentSuffix(
      formatContextIndicatorLabel(
        fieldName,
        dataset,
        contextKind,
        aliases?.[fieldName]
      )
    )
  );
  return `${labels.join(" + ")} (%)`;
}

function numericFieldValue(
  attrs: Record<string, unknown>,
  field: string
): number | null {
  return parseNumericAttributeValue(attrs[field]);
}

export function resolveAcsIndicatorValue(
  attrs: Record<string, unknown>,
  fieldName: string
): number | null {
  const raw = numericFieldValue(attrs, fieldName);
  if (raw == null) return null;

  if (isAcsMedianField(fieldName)) return raw;

  const totalField = acsTotalFieldName(fieldName);
  if (!totalField) return raw;

  const total = numericFieldValue(attrs, totalField);
  if (total == null || total <= 0) return null;

  return (raw / total) * 100;
}

export function resolveCombinedContextIndicatorValue(
  attrs: Record<string, unknown>,
  fieldNames: string[] | string,
  dataset: CatalogDataset | null,
  contextKind: EquityContextCategoryKind | null
): number | null {
  const fields = Array.isArray(fieldNames)
    ? normalizeContextFieldSelection(fieldNames)
    : normalizeContextFieldSelection([fieldNames]);
  if (fields.length === 0) return null;
  if (fields.length === 1) {
    return resolveContextIndicatorValue(
      attrs,
      fields[0],
      dataset,
      contextKind
    );
  }

  if (!areContextIndicatorsCombinable(fields, dataset, contextKind)) {
    return null;
  }

  const totalField = acsTotalFieldName(fields[0]);
  if (!totalField) return null;

  let sum = 0;
  let hasComponent = false;
  for (const fieldName of fields) {
    const value = numericFieldValue(attrs, fieldName);
    if (value == null) continue;
    sum += value;
    hasComponent = true;
  }
  if (!hasComponent) return null;

  const total = numericFieldValue(attrs, totalField);
  if (total == null || total <= 0) return null;

  return (sum / total) * 100;
}

export function resolveContextIndicatorValue(
  attrs: Record<string, unknown>,
  fieldName: string,
  dataset: CatalogDataset | null,
  contextKind: EquityContextCategoryKind | null
): number | null {
  if (shouldUseAcsPercentIndicator(fieldName, dataset, contextKind)) {
    return resolveAcsIndicatorValue(attrs, fieldName);
  }
  return numericFieldValue(attrs, fieldName);
}
