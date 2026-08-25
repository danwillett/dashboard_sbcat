import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FieldsContent from "@arcgis/core/popup/content/FieldsContent";
import PopupTemplate from "@arcgis/core/PopupTemplate";

const OBJECT_ID_NAME_RE = /^(objectid|oid|fid|ogc_fid)$/i;

function isObjectIdField(field: __esri.Field, layer: FeatureLayer): boolean {
  if (field.type === "oid") return true;
  if (layer.objectIdField && field.name === layer.objectIdField) return true;
  return OBJECT_ID_NAME_RE.test(field.name);
}

function popupTitle(layer: FeatureLayer): string {
  const displayField = layer.displayField?.trim();
  if (displayField) return `{${displayField}}`;
  return layer.title?.trim() || "Feature";
}

/**
 * Simple popup listing all layer attributes (field aliases where available).
 * Omits the object id field.
 */
export function createGenericCatalogFeatureLayerPopupTemplate(
  layer: FeatureLayer
): PopupTemplate {
  const fieldInfos = (layer.fields ?? [])
    .filter((field) => !isObjectIdField(field, layer))
    .map((field) => ({
      fieldName: field.name,
      label: field.alias?.trim() || field.name,
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

export async function applyGenericCatalogFeatureLayerPopup(
  layer: FeatureLayer
): Promise<void> {
  await layer.load();
  layer.popupEnabled = true;
  layer.popupTemplate = createGenericCatalogFeatureLayerPopupTemplate(layer);
}
