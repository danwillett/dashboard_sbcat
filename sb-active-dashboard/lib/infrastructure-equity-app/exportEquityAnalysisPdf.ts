import { jsPDF } from "jspdf";
import * as echarts from "echarts";
import type MapView from "@arcgis/core/views/MapView";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import { getEchartsPngDataUrl } from "@/lib/data-query-app/echartsExportImage";
import { InfrastructureEquityAnalysisResult } from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysis";
import {
  formatEquityAnalysisContextMetricLabel,
  formatEquityRelationshipChartTitle,
} from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";
import {
  formatEquityAnalysisSummaryBullets,
  getBivariateFillColors,
} from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";
import {
  buildEquityMetricHistogramOption,
  buildEquityRelationshipScatterOption,
  summarizeEquityAnalysisDistributions,
} from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysisCharts";
import { equityContextCategoryLabel } from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";
import { describeInfrastructureComfortFilter } from "@/lib/infrastructure-equity-app/infrastructureEquityMetrics";
import {
  equityAnalysisResultLayerId,
  isEquityResultsExtentGroupLayerId,
} from "@/lib/infrastructure-equity-app/infrastructureEquityPinned";
import { datedExportFilename } from "@/lib/utilities/shared/csvExport";

export interface EquityAnalysisPdfArtifact {
  filename: string;
  bytes: Uint8Array;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

async function renderEchartsPng(
  option: echarts.EChartsOption,
  width: number,
  height: number
): Promise<string> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-12000px";
  host.style.top = "0";
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  const chart = echarts.init(host, undefined, {
    renderer: "canvas",
    width,
    height,
  });
  chart.setOption({
    ...option,
    animation: false,
  });

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  try {
    return await getEchartsPngDataUrl(chart, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
  } finally {
    chart.dispose();
    host.remove();
  }
}

function drawBivariateLegendDataUrl(options: {
  binCount: number;
  infrastructureLabel: string;
  contextLabel: string;
}): string {
  const binCount = options.binCount;
  const colors = getBivariateFillColors(binCount as 2 | 3 | 4);
  const cell = 22;
  const gap = 2;
  const labelPad = 70;
  const titleH = 28;
  const axisH = 36;
  const grid = binCount * cell + (binCount - 1) * gap;
  const width = labelPad + grid + 24;
  const height = titleH + grid + axisH + 8;

  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create legend canvas.");
  ctx.scale(2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#111827";
  ctx.font = "600 11px Helvetica, Arial, sans-serif";
  ctx.fillText("Bivariate legend", 8, 16);

  ctx.save();
  ctx.translate(18, titleH + grid / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "10px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#4b5563";
  const contextLabel =
    options.contextLabel.length > 28
      ? `${options.contextLabel.slice(0, 27)}…`
      : options.contextLabel;
  ctx.fillText(contextLabel, 0, 0);
  ctx.restore();

  ctx.font = "9px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("High", 34, titleH + 10);
  ctx.fillText("Low", 34, titleH + grid - 2);

  const originX = labelPad;
  const originY = titleH;
  for (let contextBin = 0; contextBin < binCount; contextBin += 1) {
    const row = binCount - 1 - contextBin;
    for (let infraBin = 0; infraBin < binCount; infraBin += 1) {
      ctx.fillStyle = colors[contextBin]?.[infraBin] ?? "#d1d5db";
      ctx.fillRect(
        originX + infraBin * (cell + gap),
        originY + row * (cell + gap),
        cell,
        cell
      );
    }
  }

  ctx.fillStyle = "#4b5563";
  ctx.font = "10px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  const infraLabel =
    options.infrastructureLabel.length > 34
      ? `${options.infrastructureLabel.slice(0, 33)}…`
      : options.infrastructureLabel;
  ctx.fillText(infraLabel, originX + grid / 2, originY + grid + 18);
  ctx.font = "9px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("Low", originX + 8, originY + grid + 32);
  ctx.fillText("High", originX + grid - 8, originY + grid + 32);

  return canvas.toDataURL("image/png");
}

async function captureResultMapScreenshot(
  mapView: __esri.MapView,
  analysisId: string
): Promise<string> {
  const map = mapView.map;
  if (!map) throw new Error("Map is not available for the PDF screenshot.");

  const resultLayerId = equityAnalysisResultLayerId(analysisId);
  const resultLayer = (() => {
    const top = map.findLayerById(resultLayerId);
    if (top) return top;
    for (const layer of map.layers.toArray()) {
      if (!isEquityResultsExtentGroupLayerId(layer.id)) continue;
      const group = layer as GroupLayer;
      const found = group.findLayerById(resultLayerId);
      if (found) return found;
    }
    return null;
  })();

  if (!resultLayer) {
    throw new Error(
      "Could not find the analysis result layer on the map for the PDF screenshot."
    );
  }

  type VisibilitySnapshot = { layer: __esri.Layer; visible: boolean };
  const snapshots: VisibilitySnapshot[] = [];

  const record = (layer: __esri.Layer) => {
    snapshots.push({ layer, visible: layer.visible });
    const group = layer as GroupLayer;
    if (group.layers) {
      group.layers.forEach((child) => record(child));
    }
  };
  map.layers.forEach((layer) => record(layer));

  try {
    for (const { layer } of snapshots) {
      if (layer === resultLayer) {
        layer.visible = true;
        continue;
      }
      if (isEquityResultsExtentGroupLayerId(layer.id)) {
        const group = layer as GroupLayer;
        const containsResult = Boolean(group.findLayerById(resultLayerId));
        layer.visible = containsResult;
        continue;
      }
      if (layer.type === "group") {
        // Keep parent groups that contain the result; hide other groups.
        const group = layer as GroupLayer;
        const containsResult = Boolean(
          group.findLayerById?.(resultLayerId) ?? false
        );
        if (!containsResult) layer.visible = false;
        continue;
      }
      // Keep basemap / ground imagery; hide other operational overlays.
      const id = layer.id ?? "";
      const title = (layer.title ?? "").toLowerCase();
      const isBasemapish =
        id.toLowerCase().includes("basemap") ||
        title.includes("basemap") ||
        layer.type === "imagery" ||
        layer.type === "tile" ||
        layer.type === "vector-tile";
      if (!isBasemapish) layer.visible = false;
    }

    // Ensure result and its parent group stay on.
    resultLayer.visible = true;
    const parent = snapshots.find(
      (entry) =>
        isEquityResultsExtentGroupLayerId(entry.layer.id) &&
        (entry.layer as GroupLayer).findLayerById(resultLayerId)
    );
    if (parent) parent.layer.visible = true;

    if (resultLayer.type === "feature") {
      const featureLayer = resultLayer as __esri.FeatureLayer;
      try {
        const extentResult = await featureLayer.queryExtent();
        if (extentResult.extent) {
          await mapView.goTo(extentResult.extent.expand(1.08));
        }
      } catch {
        // Keep current view if extent query fails.
      }
    }

    await mapView.when();
    await new Promise((resolve) => setTimeout(resolve, 350));

    const shot = await mapView.takeScreenshot({
      format: "png",
      width: 1400,
    });
    return shot.dataUrl;
  } finally {
    for (const { layer, visible } of snapshots) {
      layer.visible = visible;
    }
  }
}

function analysisOverviewText(
  analysis: InfrastructureEquityAnalysisResult
): string {
  const binLabel =
    analysis.breaks.binCount === 3
      ? "equal-count terciles (Low / Medium / High)"
      : analysis.breaks.binCount === 2
        ? "equal-count halves (Low / High)"
        : "equal-count quartile bands (Low / Medium-low / Medium-high / High)";

  return (
    "This equity analysis compares bicycle infrastructure comfort with a selected equity indicator " +
    `across ${analysis.geographyLabel.toLowerCase()} within ${analysis.geographicLabel}. ` +
    `Each unit is ranked into ${binLabel} for both metrics, then mapped with bivariate colors that combine those ranks.`
  );
}

function addImageContain(
  doc: jsPDF,
  dataUrl: string,
  img: HTMLImageElement,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
): number {
  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
  const width = img.width * ratio;
  const height = img.height * ratio;
  const offsetX = x + (maxWidth - width) / 2;
  doc.addImage(dataUrl, "PNG", offsetX, y, width, height);
  return height;
}

export async function buildEquityAnalysisPdfArtifact(options: {
  analysis: InfrastructureEquityAnalysisResult;
  analysisId: string;
  mapView: MapView | null;
}): Promise<EquityAnalysisPdfArtifact> {
  const { analysis, analysisId, mapView } = options;
  if (!mapView) {
    throw new Error("Map view is required to include a map screenshot in the PDF.");
  }

  const contextMetricLabel = formatEquityAnalysisContextMetricLabel(analysis);
  const infrastructureLabel = /\(%\)|%/.test(analysis.infrastructureMetricLabel)
    ? analysis.infrastructureMetricLabel
    : `${analysis.infrastructureMetricLabel} (%)`;

  const summaries = summarizeEquityAnalysisDistributions({
    units: analysis.units,
    breaks: analysis.breaks,
    infrastructureLabel,
    contextLabel: contextMetricLabel,
  });

  const takeaways = formatEquityAnalysisSummaryBullets({
    units: analysis.units,
    breaks: analysis.breaks,
    infrastructureLabel,
    contextLabel: contextMetricLabel,
    geographyLabel: analysis.geographyLabel,
    contextKind: analysis.contextKind,
    contextDatasetTitle: analysis.contextDatasetTitle,
  });

  const [infraHistPng, contextHistPng, scatterPng, mapPng, legendPng] =
    await Promise.all([
      renderEchartsPng(
        buildEquityMetricHistogramOption(summaries.infrastructure),
        720,
        280
      ),
      renderEchartsPng(
        buildEquityMetricHistogramOption(summaries.context),
        720,
        280
      ),
      renderEchartsPng(
        buildEquityRelationshipScatterOption({
          units: analysis.units,
          breaks: analysis.breaks,
          infrastructureLabel,
          contextLabel: contextMetricLabel,
          contextValueIsPercent: analysis.contextValueIsPercent,
          showBinBreaks: true,
          showTrendLine: true,
        }),
        1100,
        620
      ),
      captureResultMapScreenshot(mapView, analysisId),
      Promise.resolve(
        drawBivariateLegendDataUrl({
          binCount: analysis.breaks.binCount,
          infrastructureLabel,
          contextLabel: contextMetricLabel,
        })
      ),
    ]);

  const [
    infraHistImg,
    contextHistImg,
    scatterImg,
    mapImg,
    legendImg,
  ] = await Promise.all([
    loadImage(infraHistPng),
    loadImage(contextHistPng),
    loadImage(scatterPng),
    loadImage(mapPng),
    loadImage(legendPng),
  ]);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const title = formatEquityRelationshipChartTitle(analysis);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(17);
  const titleLines = wrapText(doc, title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 18 + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
  y += 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(31);
  doc.text("Analysis overview", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(45);
  const overviewLines = wrapText(
    doc,
    analysisOverviewText(analysis),
    contentWidth
  );
  doc.text(overviewLines, margin, y);
  y += overviewLines.length * 13 + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(31);
  doc.text("Data and filters", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(45);

  const comfortFilter = describeInfrastructureComfortFilter(
    analysis.infrastructureComfortSelection
  );
  const detailLines = [
    `Infrastructure layer: ${analysis.infrastructureDatasetTitle}`,
    `Infrastructure metric: ${analysis.infrastructureMetricLabel}`,
    `Comfort filter: ${comfortFilter}`,
    `Equity category: ${equityContextCategoryLabel(analysis.contextKind)}`,
    `Equity dataset: ${analysis.contextDatasetTitle}`,
    `Equity indicator: ${contextMetricLabel}`,
    `Geographic extent: ${analysis.geographicLabel}`,
    `Aggregation unit: ${analysis.geographyLabel}`,
    `Bins: ${analysis.breaks.binCount}×${analysis.breaks.binCount}`,
    `Units analyzed: ${analysis.unitsWithData} of ${analysis.unitsTotal} eligible`,
  ];
  for (const line of detailLines) {
    const wrapped = wrapText(doc, line, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 12 + 2;
  }

  if (analysis.contextDatasetDescription?.trim()) {
    y += 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(90);
    const desc = wrapText(
      doc,
      analysis.contextDatasetDescription.trim(),
      contentWidth
    );
    doc.text(desc, margin, y);
    y += desc.length * 11 + 8;
    doc.setFont("helvetica", "normal");
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(31);
  doc.text("Key takeaways", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(45);
  for (const bullet of takeaways) {
    const wrapped = wrapText(doc, `• ${bullet}`, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 12 + 3;
  }

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(31);
  doc.text("Rank distributions", margin, y);
  y += 8;

  const histGap = 12;
  const histWidth = (contentWidth - histGap) / 2;
  const histHeight = Math.min(150, pageHeight - y - margin - 8);
  const leftX = margin;
  const rightX = margin + histWidth + histGap;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75);
  doc.text(analysis.infrastructureDatasetTitle, leftX, y + 10);
  doc.text(analysis.contextDatasetTitle, rightX, y + 10);
  y += 14;

  addImageContain(
    doc,
    infraHistPng,
    infraHistImg,
    leftX,
    y,
    histWidth,
    histHeight
  );
  addImageContain(
    doc,
    contextHistPng,
    contextHistImg,
    rightX,
    y,
    histWidth,
    histHeight
  );

  // Page 2 — map + scatter
  doc.addPage();
  y = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17);
  doc.text("Result map", margin, y);
  y += 10;

  const page2Usable = pageHeight - margin * 2 - 24;
  const mapBlock = page2Usable * 0.48;
  const legendBlock = 54;

  const mapHeight = addImageContain(
    doc,
    mapPng,
    mapImg,
    margin,
    y,
    contentWidth,
    mapBlock - legendBlock
  );
  y += mapHeight + 4;

  const legendHeight = addImageContain(
    doc,
    legendPng,
    legendImg,
    margin,
    y,
    contentWidth,
    legendBlock
  );
  y += legendHeight + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17);
  doc.text("Infrastructure × equity relationship", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(
    "Dashed lines show bin cuts. Trend line includes R². Point colors match bivariate map classes.",
    margin,
    y
  );
  y += 10;

  addImageContain(
    doc,
    scatterPng,
    scatterImg,
    margin,
    y,
    contentWidth,
    Math.max(160, pageHeight - y - margin)
  );

  const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;
  return {
    filename: "report.pdf",
    bytes: new Uint8Array(arrayBuffer),
  };
}

export async function downloadEquityAnalysisPdf(options: {
  analysis: InfrastructureEquityAnalysisResult;
  analysisId: string;
  mapView: MapView | null;
}): Promise<{ filename: string }> {
  const artifact = await buildEquityAnalysisPdfArtifact(options);
  const blob = new Blob(
    [
      artifact.bytes.buffer.slice(
        artifact.bytes.byteOffset,
        artifact.bytes.byteOffset + artifact.bytes.byteLength
      ) as ArrayBuffer,
    ],
    { type: "application/pdf" }
  );
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = datedExportFilename("equity-report", "pdf");
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
  return { filename: anchor.download };
}
