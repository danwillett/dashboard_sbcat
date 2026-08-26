import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import FieldsContent from "@arcgis/core/popup/content/FieldsContent";
import PopupTemplate from "@arcgis/core/PopupTemplate";

export const BICYCLE_COMFORT_POPUP_FIELDS = [
  "name",
  "class_export",
  "comfort_class",
] as const;

function fieldLabel(layer: FeatureLayer, fieldName: string): string {
  const field = layer.fields?.find((entry) => entry.name === fieldName);
  return field?.alias?.trim() || fieldName;
}

function popupTitle(feature: __esri.Feature): string {
  const name = feature.graphic?.attributes?.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }
  return "Road segment";
}

export function createBicycleComfortMapPopupTemplate(
  layer: FeatureLayer
): PopupTemplate {
  const fieldInfos = BICYCLE_COMFORT_POPUP_FIELDS.filter((fieldName) =>
    layer.fields?.some((field) => field.name === fieldName)
  ).map((fieldName) => ({
    fieldName,
    label: fieldLabel(layer, fieldName),
  }));

  return new PopupTemplate({
    title: popupTitle,
    content: [
      new FieldsContent({
        fieldInfos,
      }),
    ],
  });
}

export async function applyBicycleComfortMapPopup(
  layer: FeatureLayer
): Promise<void> {
  await layer.load();
  layer.popupEnabled = true;
  layer.popupTemplate = createBicycleComfortMapPopupTemplate(layer);
}
