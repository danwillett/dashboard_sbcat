import CustomContent from "@arcgis/core/popup/content/CustomContent";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import { InfrastructureEquityAnalysisResult } from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysis";
import {
  describeEquityBivariateBin,
  parseEquityBivariateClass,
} from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";
import { equityContextCategoryLabel } from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";
import { formatEquityAnalysisContextMetricLabel } from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPercent(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toFixed(1) + "%";
}

function formatInfrastructureSegmentPercent(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toFixed(1) + "% of all road segments";
}

function formatContextValue(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  if (Math.abs(num) >= 1000) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function popupAreaTitle(attrs: Record<string, unknown>): string {
  const label = String(attrs.equity_unit_label ?? "").trim();
  if (label) return label;

  for (const key of ["name", "NAME", "zip", "ZIP", "ZCTA5CE10", "geoid", "GEOID"]) {
    const value = attrs[key];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "Geographic unit";
}

function sectionHeading(label: string): string {
  return (
    '<div style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;' +
    'letter-spacing:0.04em;color:#6b7280">' +
    escapeHtml(label) +
    "</div>"
  );
}

function statRow(label: string, value: string): string {
  return (
    '<div style="display:flex;justify-content:space-between;gap:12px;margin:0 0 6px">' +
    '<span style="color:#6b7280">' +
    escapeHtml(label) +
    "</span>" +
    '<span style="font-weight:600;color:#111827;text-align:right">' +
    escapeHtml(value) +
    "</span></div>"
  );
}

export function equityAnalysisPopupHtml(
  attrs: Record<string, unknown>,
  analysis: InfrastructureEquityAnalysisResult
): string {
  const contextCategory = equityContextCategoryLabel(analysis.contextKind);
  const description = analysis.contextDatasetDescription?.trim();
  const bivariateClass = String(attrs.equity_bivariate_class ?? "");
  const parsedClass = parseEquityBivariateClass(
    bivariateClass,
    analysis.breaks.binCount
  );
  const infrastructureRank = parsedClass
    ? describeEquityBivariateBin(
        parsedClass.infrastructureBin,
        analysis.breaks.binCount
      )
    : "—";
  const contextRank = parsedClass
    ? describeEquityBivariateBin(
        parsedClass.contextBin,
        analysis.breaks.binCount
      )
    : "—";

  return (
    '<div style="font-family:system-ui,sans-serif;font-size:13px;color:#111827;line-height:1.45">' +
    '<div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e5e7eb">' +
    sectionHeading("Analysis area") +
    statRow("Extent", analysis.geographicLabel) +
    statRow("Unit type", analysis.geographyLabel) +
    "</div>" +
    '<div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e5e7eb">' +
    sectionHeading("Infrastructure") +
    statRow("Dataset", analysis.infrastructureDatasetTitle) +
    statRow("Metric", analysis.infrastructureMetricLabel) +
    statRow(
      "Value",
      formatInfrastructureSegmentPercent(attrs.equity_infra_pct)
    ) +
    "</div>" +
    '<div style="margin-bottom:0">' +
    sectionHeading(contextCategory) +
    statRow("Dataset", analysis.contextDatasetTitle) +
    (description
      ? '<p style="margin:0 0 8px;font-size:12px;color:#6b7280;line-height:1.4">' +
        escapeHtml(description) +
        "</p>"
      : "") +
    statRow("Indicator", formatEquityAnalysisContextMetricLabel(analysis)) +
    statRow(
      "Value",
      analysis.contextValueIsPercent
        ? formatPercent(attrs.equity_context_value)
        : formatContextValue(attrs.equity_context_value)
    ) +
    "</div>" +
    '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb">' +
    sectionHeading("Bivariate class") +
    statRow("Infrastructure rank", infrastructureRank) +
    statRow("Indicator rank", contextRank) +
    '<p style="margin:8px 0 0;font-size:11px;color:#6b7280;line-height:1.4">' +
    `Map colors combine infrastructure and indicator ranks within the selected geographic extent (${analysis.breaks.binCount}×${analysis.breaks.binCount} grid).` +
    "</p>" +
    "</div>" +
    "</div>"
  );
}

export function createEquityContextPopupTemplate(
  analysis: InfrastructureEquityAnalysisResult
): PopupTemplate {
  return new PopupTemplate({
    title: (feature) => {
      const attrs = (feature.graphic?.attributes ?? {}) as Record<string, unknown>;
      return popupAreaTitle(attrs);
    },
    content: [
      new CustomContent({
        creator: (feature) => {
          const container = document.createElement("div");
          const attrs = (feature.graphic?.attributes ?? {}) as Record<string, unknown>;
          container.innerHTML = equityAnalysisPopupHtml(attrs, analysis);
          return container;
        },
      }),
    ],
    outFields: ["*"],
  });
}
