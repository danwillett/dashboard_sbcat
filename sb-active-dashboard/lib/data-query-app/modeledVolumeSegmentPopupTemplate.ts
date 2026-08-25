import PopupTemplate from "@arcgis/core/PopupTemplate";
import FieldsContent from "@arcgis/core/popup/content/FieldsContent";
import TextContent from "@arcgis/core/popup/content/TextContent";
import {
  ModeledVolumeCountType,
  ModeledVolumeModel,
} from "@/lib/data-query-app/modeledVolumeFields";

export function modeledVolumeModelLabel(model: ModeledVolumeModel): string {
  return model === "cost-benefit" ? "Cost-Benefit" : "Strava Bias-Corrected";
}

export function modeledVolumeCountTypeLabel(
  countType: ModeledVolumeCountType
): string {
  return countType === "bike" ? "Bicycle" : "Pedestrian";
}

function segmentPopupTitle(feature: __esri.Feature): string {
  const street = feature.graphic?.attributes?.street;
  if (typeof street === "string" && street.trim()) {
    return street.trim();
  }
  return "Network segment";
}

export function createModeledVolumeSegmentPopupTemplate(options: {
  model: ModeledVolumeModel;
  countType: ModeledVolumeCountType;
  field: string;
  year: number;
}): PopupTemplate {
  const modelLabel = modeledVolumeModelLabel(options.model);
  const userLabel = modeledVolumeCountTypeLabel(options.countType);

  return new PopupTemplate({
    title: segmentPopupTitle,
    content: [
      new FieldsContent({
        fieldInfos: [
          {
            fieldName: "street",
            label: "Street",
          },
          {
            fieldName: options.field,
            label: `AADT bin (${options.year})`,
          },
        ],
      }),
      new TextContent({
        text: `<div style="margin-top:6px;line-height:1.5"><strong>Model:</strong> ${modelLabel}<br><strong>Road user:</strong> ${userLabel}</div>`,
      }),
    ],
    outFields: ["street", options.field],
  });
}
