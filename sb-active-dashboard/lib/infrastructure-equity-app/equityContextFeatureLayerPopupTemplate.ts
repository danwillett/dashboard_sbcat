import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Field from "@arcgis/core/layers/support/Field";
import FieldsContent from "@arcgis/core/popup/content/FieldsContent";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import { EquityContextCategoryKind } from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";
import {
  EQUITY_COMPUTED_CONTEXT_VALUE_FIELD,
  formatContextIndicatorLabel,
} from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";

const OBJECT_ID_NAME_RE = /^(objectid|oid|fid|ogc_fid)$/i;
const EXCLUDED_POPUP_FIELD_RE =
  /^(shape__length|shape__area|shape_length|shape_area)$/i;

function isObjectIdField(field: __esri.Field, layer: FeatureLayer): boolean {
  if (field.type === "oid") return true;
  if (layer.objectIdField && field.name === layer.objectIdField) return true;
  return OBJECT_ID_NAME_RE.test(field.name);
}

function isExcludedEquityContextPopupField(field: __esri.Field): boolean {
  if (field.name === EQUITY_COMPUTED_CONTEXT_VALUE_FIELD) return true;
  return EXCLUDED_POPUP_FIELD_RE.test(field.name);
}

function popupTitle(layer: FeatureLayer): string {
  const displayField = layer.displayField?.trim();
  if (displayField) return `{${displayField}}`;
  return layer.title?.trim() || "Feature";
}

export function createEquityContextFeatureLayerPopupTemplate(
  layer: FeatureLayer,
  dataset: CatalogDataset,
  contextKind: EquityContextCategoryKind | null
): PopupTemplate {
  const fieldInfos = (layer.fields ?? [])
    .filter(
      (field) =>
        !isObjectIdField(field, layer) &&
        !isExcludedEquityContextPopupField(field)
    )
    .map((field) => ({
      fieldName: field.name,
      label: formatContextIndicatorLabel(
        field.name,
        dataset,
        contextKind,
        field.alias
      ),
    }));

  return new PopupTemplate({
    title: popupTitle(layer),
    content: [
      new FieldsContent({
        fieldInfos,
      }),
    ],
  });
}

export async function applyEquityContextFieldAliases(
  layer: FeatureLayer,
  dataset: CatalogDataset,
  contextKind: EquityContextCategoryKind | null
): Promise<void> {
  if (!layer.fields?.length) return;

  layer.fields = layer.fields.map((field) => {
    if (isObjectIdField(field, layer) || isExcludedEquityContextPopupField(field)) {
      return field;
    }

    return new Field({
      name: field.name,
      type: field.type,
      alias: formatContextIndicatorLabel(
        field.name,
        dataset,
        contextKind,
        field.alias
      ),
    });
  });
}

export async function applyEquityContextFeatureLayerPopup(
  layer: FeatureLayer,
  dataset: CatalogDataset,
  contextKind: EquityContextCategoryKind | null
): Promise<void> {
  await layer.load();
  await applyEquityContextFieldAliases(layer, dataset, contextKind);
  layer.popupEnabled = true;
  layer.popupTemplate = createEquityContextFeatureLayerPopupTemplate(
    layer,
    dataset,
    contextKind
  );
}
