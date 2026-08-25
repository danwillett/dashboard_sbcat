import CustomContent from "@arcgis/core/popup/content/CustomContent";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import {
  fetchIncidentParties,
  summarizeIncidentAttributes,
} from "@/lib/data-query-app/safetyIncidentQuery";
import {
  incidentSelectionLabel,
  safetyIncidentPartiesHtml,
  safetyIncidentSummaryHtml,
} from "@/lib/data-query-app/safetyIncidentDisplay";

export function createSafetyIncidentPopupTemplate(
  getIncidentLayerUrl: () => string | null
): PopupTemplate {
  return new PopupTemplate({
    title: (feature) => {
      const summary = summarizeIncidentAttributes(
        (feature.graphic?.attributes ?? {}) as Record<string, unknown>
      );
      return summary ? incidentSelectionLabel(summary) : "Safety incident";
    },
    content: [
      new CustomContent({
        creator: (feature) => {
          const container = document.createElement("div");
          const summary = summarizeIncidentAttributes(
            (feature.graphic?.attributes ?? {}) as Record<string, unknown>
          );
          if (!summary) {
            container.textContent = "Could not read incident attributes.";
            return container;
          }
          container.innerHTML = safetyIncidentSummaryHtml(summary);
          return container;
        },
      }),
      new CustomContent({
        creator: (feature) => {
          const container = document.createElement("div");
          container.innerHTML =
            '<p style="margin:0;font-size:12px;color:#6b7280">Loading party records…</p>';

          const summary = summarizeIncidentAttributes(
            (feature.graphic?.attributes ?? {}) as Record<string, unknown>
          );
          const layerUrl = getIncidentLayerUrl();
          const incidentId = summary?.incidentId;

          if (!layerUrl || incidentId == null) {
            container.innerHTML = safetyIncidentPartiesHtml([]);
            return container;
          }

          void fetchIncidentParties(layerUrl, incidentId)
            .then((parties) => {
              container.innerHTML = safetyIncidentPartiesHtml(parties);
            })
            .catch(() => {
              container.innerHTML =
                '<p style="margin:0;font-size:12px;color:#dc2626">Could not load party records.</p>';
            });

          return container;
        },
      }),
    ],
    outFields: ["*"],
  });
}
