import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import ClassBreaksRenderer from "@arcgis/core/renderers/ClassBreaksRenderer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import UniqueValueInfo from "@arcgis/core/renderers/support/UniqueValueInfo";
import Symbol from "@arcgis/core/symbols/Symbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import Color from "@arcgis/core/Color";
import * as colorRendererCreator from "@arcgis/core/smartMapping/renderers/color";
import * as typeRendererCreator from "@arcgis/core/smartMapping/renderers/type";
import { portalRendererField, PortalRendererJson } from "@/lib/data-services/ArcGisFeatureLayerMetadataService";

interface PortalUniqueValueInfoJson {
  label?: string;
  value?: string;
  values?: string[][];
  symbol?: Record<string, unknown>;
}

interface PortalUniqueValueGroupJson {
  classes?: PortalUniqueValueInfoJson[];
}

function collectPortalUniqueValueInfos(
  rendererJson: Record<string, unknown>
): PortalUniqueValueInfoJson[] {
  const fromInfos =
    (rendererJson.uniqueValueInfos as PortalUniqueValueInfoJson[]) ?? [];
  const fromGroups = (
    (rendererJson.uniqueValueGroups as PortalUniqueValueGroupJson[]) ?? []
  ).flatMap((group) => group.classes ?? []);

  return [...fromInfos, ...fromGroups];
}

function portalLineColor(color?: number[]): Color | undefined {
  if (!color || color.length < 3) return undefined;
  if (color.length >= 4) {
    return Color.fromArray(color);
  }
  return Color.fromArray([color[0], color[1], color[2], 255]);
}

/** Build JS API symbols from portal/REST JSON (esriSLS etc.). */
function symbolFromPortalJson(
  symbolJson?: Record<string, unknown>
): __esri.Symbol | null {
  if (!symbolJson?.type) return null;

  const type = String(symbolJson.type);
  if (type === "esriSLS" || type === "simple-line") {
    return new SimpleLineSymbol({
      color: portalLineColor(symbolJson.color as number[] | undefined),
      width: (symbolJson.width as number) ?? 1,
      style: "solid",
    });
  }

  if (type === "esriSFS" || type === "simple-fill") {
    try {
      const symbol = Symbol.fromJSON(symbolJson as __esri.SymbolProperties);
      return symbol?.type ? symbol : null;
    } catch {
      return null;
    }
  }

  return null;
}

function uniqueValueRendererFromPortalJson(
  rendererJson: Record<string, unknown>
): UniqueValueRenderer | null {
  const field = (rendererJson.field ?? rendererJson.field1) as string | undefined;
  const rawInfos = collectPortalUniqueValueInfos(rendererJson);
  const seen = new Set<string>();
  const uniqueValueInfos: __esri.UniqueValueInfo[] = [];

  for (const info of rawInfos) {
    const value = info.value ?? info.values?.[0]?.[0];
    if (!value || seen.has(value)) continue;

    const symbol = symbolFromPortalJson(info.symbol);
    if (!symbol) continue;

    seen.add(value);
    uniqueValueInfos.push(
      new UniqueValueInfo({
        value,
        label: info.label ?? value,
        symbol: symbol as __esri.SymbolUnion,
      })
    );
  }

  if (!field || uniqueValueInfos.length === 0) return null;

  const defaultSymbol = symbolFromPortalJson(
    rendererJson.defaultSymbol as Record<string, unknown> | undefined
  );

  return new UniqueValueRenderer({
    field,
    uniqueValueInfos,
    defaultSymbol: defaultSymbol as __esri.SymbolUnion | undefined,
  });
}

/**
 * Portal item renderer JSON uses REST/web-document shapes (uniqueValue, field1,
 * esriSLS symbols, uniqueValueGroups). Normalize class-break renderers for fromJSON.
 */
function normalizePortalClassBreaksRendererJson(
  rendererJson: Record<string, unknown>
): Record<string, unknown> | null {
  const rawType = rendererJson.type as string | undefined;
  if (rawType !== "classBreaks" && rawType !== "class-breaks") return null;

  const classBreakInfos = rendererJson.classBreakInfos as
    | Array<Record<string, unknown>>
    | undefined;
  if (!rendererJson.field || !classBreakInfos?.length) return null;

  return {
    type: "class-breaks",
    field: rendererJson.field,
    classBreakInfos: classBreakInfos.map((info) => ({
      ...info,
      symbol: info.symbol,
    })),
    defaultSymbol: rendererJson.defaultSymbol,
  };
}

function isValidRenderer(renderer: __esri.Renderer | null | undefined): boolean {
  return !!renderer?.type;
}

export type GenericClassificationMethod = "quantile" | "equal-interval";
export type GenericStylableFieldType = "numeric" | "categorical";

export interface GenericFeatureLayerVisualizationState {
  field: string | null;
  fieldType: GenericStylableFieldType | null;
  classificationMethod: GenericClassificationMethod;
  numClasses: number;
  /** Layer opacity 0–1 */
  opacity: number;
}

export const DEFAULT_GENERIC_FEATURE_LAYER_VISUALIZATION: GenericFeatureLayerVisualizationState =
  {
    field: null,
    fieldType: null,
    classificationMethod: "quantile",
    numClasses: 5,
    opacity: 0.85,
  };

const NUMERIC_FIELD_TYPES = new Set([
  "small-integer",
  "integer",
  "single",
  "double",
  "long",
  "big-integer",
]);

export function isNumericLayerFieldType(
  fieldType: string | undefined | null
): boolean {
  return fieldType != null && NUMERIC_FIELD_TYPES.has(fieldType);
}

export function parseNumericAttributeValue(
  raw: unknown
): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "bigint") {
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

const OID_FIELD_NAMES = new Set(["OBJECTID", "FID", "OID"]);

function isOidFieldName(name: string): boolean {
  return OID_FIELD_NAMES.has(name.toUpperCase());
}

export function getStylableFieldType(
  field: __esri.Field
): GenericStylableFieldType {
  return field.type === "string" ? "categorical" : "numeric";
}

export function listNumericLayerFields(layer: FeatureLayer): __esri.Field[] {
  return (layer.fields || []).filter(
    (field) =>
      isNumericLayerFieldType(field.type) &&
      field.name &&
      !isOidFieldName(field.name) &&
      !field.name.toLowerCase().startsWith("shape")
  );
}

/** Numeric and low-cardinality string fields suitable for map styling. */
export function listStylableLayerFields(layer: FeatureLayer): __esri.Field[] {
  const numeric = listNumericLayerFields(layer);
  const categorical = (layer.fields || []).filter(
    (field) =>
      field.type === "string" &&
      field.name &&
      !isOidFieldName(field.name) &&
      !field.name.toLowerCase().startsWith("shape") &&
      !field.name.toLowerCase().endsWith("_id") &&
      field.name.toLowerCase() !== "osm_id"
  );
  return [...numeric, ...categorical];
}

const DEFAULT_FIELD_HINTS = [
  "class_export",
  "comfort_class",
  "class",
  "category",
  "type",
];

export function pickDefaultStylableField(
  layer: FeatureLayer
): __esri.Field | undefined {
  const stylable = listStylableLayerFields(layer);
  for (const hint of DEFAULT_FIELD_HINTS) {
    const match = stylable.find(
      (field) =>
        field.name.toLowerCase() === hint ||
        field.name.toLowerCase().includes(hint)
    );
    if (match) return match;
  }
  return stylable.find((field) => field.type === "string") ?? stylable[0];
}

export function inferVisualizationFromLayer(
  layer: FeatureLayer
): Partial<GenericFeatureLayerVisualizationState> {
  const renderer = layer.renderer;
  const opacity =
    layer.opacity ?? DEFAULT_GENERIC_FEATURE_LAYER_VISUALIZATION.opacity;

  if (renderer?.type === "class-breaks") {
    const classBreaks = renderer as ClassBreaksRenderer;
    const method = classBreaks.authoringInfo?.classificationMethod;
    const fieldName = classBreaks.field;
    const field = layer.fields?.find((f) => f.name === fieldName);
    return {
      field: fieldName,
      fieldType: field ? getStylableFieldType(field) : "numeric",
      classificationMethod:
        method === "quantile" ? "quantile" : "equal-interval",
      numClasses:
        classBreaks.classBreakInfos?.length ||
        DEFAULT_GENERIC_FEATURE_LAYER_VISUALIZATION.numClasses,
      opacity,
    };
  }

  if (renderer?.type === "unique-value") {
    const uniqueValue = renderer as UniqueValueRenderer;
    const fieldName = uniqueValue.field;
    const field = layer.fields?.find((f) => f.name === fieldName);
    return {
      field: fieldName,
      fieldType: field ? getStylableFieldType(field) : "categorical",
      opacity,
    };
  }

  const defaultField = pickDefaultStylableField(layer);
  return {
    field: defaultField?.name ?? null,
    fieldType: defaultField ? getStylableFieldType(defaultField) : null,
    opacity,
  };
}

export function rendererFromPortalJson(
  rendererJson: __esri.RendererProperties
): __esri.Renderer | null {
  const raw = rendererJson as Record<string, unknown>;
  const rawType = raw.type as string | undefined;
  if (!rawType) return null;

  try {
    if (rawType === "uniqueValue" || rawType === "unique-value") {
      const renderer = uniqueValueRendererFromPortalJson(raw);
      return isValidRenderer(renderer) ? renderer : null;
    }

    const normalized = normalizePortalClassBreaksRendererJson(raw);
    if (normalized?.type === "class-breaks") {
      const renderer = ClassBreaksRenderer.fromJSON(
        normalized as __esri.ClassBreaksRendererProperties
      );
      return isValidRenderer(renderer) ? renderer : null;
    }
  } catch {
    return null;
  }

  return null;
}

export interface ApplyGenericFeatureLayerVisualizationOptions {
  portalRendererJson?: __esri.RendererProperties | null;
}

export function shouldUsePortalRenderer(
  state: GenericFeatureLayerVisualizationState,
  portalRendererJson?: __esri.RendererProperties | null
): boolean {
  if (!portalRendererJson) return false;
  const portalField = portalRendererField(portalRendererJson as PortalRendererJson);
  if (!portalField) return false;
  return state.field === portalField || state.field == null;
}

export async function applyGenericFeatureLayerVisualization(
  layer: FeatureLayer,
  mapView: __esri.MapView,
  state: GenericFeatureLayerVisualizationState,
  options?: ApplyGenericFeatureLayerVisualizationOptions
): Promise<void> {
  layer.opacity = state.opacity;

  const portalRendererJson = options?.portalRendererJson;
  if (portalRendererJson && shouldUsePortalRenderer(state, portalRendererJson)) {
    const portalRenderer = rendererFromPortalJson(portalRendererJson);
    if (portalRenderer) {
      layer.renderer = portalRenderer;
      return;
    }
  }

  if (!state.field) return;

  const field = layer.fields?.find((f) => f.name === state.field);
  const fieldType =
    state.fieldType ??
    (field ? getStylableFieldType(field) : "numeric");

  if (fieldType === "categorical") {
    const response = await typeRendererCreator.createRenderer({
      layer,
      view: mapView,
      field: state.field,
      numTypes: -1,
      defaultSymbolEnabled: true,
    });
    if (response.renderer) {
      layer.renderer = response.renderer;
    }
    return;
  }

  const response = await colorRendererCreator.createClassBreaksRenderer({
    layer,
    view: mapView,
    field: state.field,
    classificationMethod: state.classificationMethod,
    numClasses: state.numClasses,
    defaultSymbolEnabled: true,
  });

  if (response.renderer) {
    layer.renderer = response.renderer;
  }
}
