import { jsPDF } from "jspdf";
import { ChartExportTable } from "@/lib/data-query-app/safetyIncidentChartOptions";
import { SAFETY_INCIDENT_DATA_CITATION } from "@/lib/data-query-app/safetyIncidentDataCitation";
import { SafetyIncidentFilterSummaryItem } from "@/lib/data-query-app/safetyIncidentFilters";

export interface ExportSafetyIncidentChartPdfArgs {
  chartDataUrl: string;
  title: string;
  subtitle: string;
  filterSummary: SafetyIncidentFilterSummaryItem[];
  statsLine: string;
  dataTable: ChartExportTable;
  generatedAt?: Date;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && doc.getTextWidth(`${trimmed}…`) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function drawDataTable(
  doc: jsPDF,
  table: ChartExportTable,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  startY: number
): void {
  const contentWidth = pageWidth - margin * 2;
  const rowHeight = 14;
  const headerHeight = 16;
  const bottomMargin = 36;
  let y = startY;

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(55);
  ensureSpace(headerHeight + rowHeight);
  doc.text("Chart data summary", margin, y);
  y += 18;

  if (table.rows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("No aggregated data available.", margin, y);
    return;
  }

  if (table.kind === "single") {
    const categoryWidth = contentWidth * 0.72;
    const headers = [table.categoryLabel, table.countLabel];
    const tableTop = y;

    const drawHeader = () => {
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, contentWidth, headerHeight, "F");
      doc.setDrawColor(229, 231, 235);
      doc.rect(margin, y, contentWidth, headerHeight, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(55);
      doc.text(headers[0], margin + 6, y + 11);
      doc.text(headers[1], margin + categoryWidth + 6, y + 11);
      y += headerHeight;
    };

    drawHeader();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(35);

    let grandTotal = 0;
    for (const row of table.rows) {
      if (y + rowHeight > pageHeight - bottomMargin) {
        doc.addPage();
        y = margin;
        drawHeader();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(35);
      }
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, margin + contentWidth, y);
      doc.text(
        truncateText(doc, row.category, categoryWidth - 12),
        margin + 6,
        y + 10
      );
      doc.text(String(row.count), margin + categoryWidth + 6, y + 10);
      grandTotal += row.count;
      y += rowHeight;
    }

    if (y + rowHeight > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
      drawHeader();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(35);
    }
    doc.setDrawColor(209, 213, 219);
    doc.line(margin, y, margin + contentWidth, y);
    doc.setFont("helvetica", "bold");
    doc.text("Total", margin + 6, y + 10);
    doc.text(String(grandTotal), margin + categoryWidth + 6, y + 10);
    doc.rect(margin, tableTop, contentWidth, y + rowHeight - tableTop, "S");
    return;
  }

  const totalColWidth = 52;
  const categoryWidth = Math.min(180, contentWidth * 0.28);
  const seriesCount = table.seriesLabels.length;
  const seriesWidth =
    seriesCount > 0
      ? (contentWidth - categoryWidth - totalColWidth) / seriesCount
      : 0;
  const tableTop = y;

  const drawStackedHeader = () => {
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, contentWidth, headerHeight, "F");
    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, y, contentWidth, headerHeight, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(55);
    doc.text(table.categoryLabel, margin + 4, y + 11);
    table.seriesLabels.forEach((label, i) => {
      doc.text(
        truncateText(doc, label, seriesWidth - 8),
        margin + categoryWidth + i * seriesWidth + 4,
        y + 11
      );
    });
    doc.text("Total", margin + categoryWidth + seriesCount * seriesWidth + 4, y + 11);
    y += headerHeight;
  };

  drawStackedHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(35);

  const columnTotals = new Array(seriesCount).fill(0);
  let grandTotal = 0;

  for (const row of table.rows) {
    if (y + rowHeight > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
      drawStackedHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(35);
    }
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, margin + contentWidth, y);
    doc.text(
      truncateText(doc, row.category, categoryWidth - 8),
      margin + 4,
      y + 10
    );
    row.values.forEach((value, i) => {
      doc.text(
        String(value),
        margin + categoryWidth + i * seriesWidth + 4,
        y + 10
      );
      columnTotals[i] += value;
    });
    doc.text(
      String(row.total),
      margin + categoryWidth + seriesCount * seriesWidth + 4,
      y + 10
    );
    grandTotal += row.total;
    y += rowHeight;
  }

  if (y + rowHeight > pageHeight - bottomMargin) {
    doc.addPage();
    y = margin;
    drawStackedHeader();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(35);
  }
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, margin + contentWidth, y);
  doc.setFont("helvetica", "bold");
  doc.text("Total", margin + 4, y + 10);
  columnTotals.forEach((value, i) => {
    doc.text(
      String(value),
      margin + categoryWidth + i * seriesWidth + 4,
      y + 10
    );
  });
  doc.text(
    String(grandTotal),
    margin + categoryWidth + seriesCount * seriesWidth + 4,
    y + 10
  );
  doc.rect(margin, tableTop, contentWidth, y + rowHeight - tableTop, "S");
}

function drawDataCitation(
  doc: jsPDF,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  startY: number
): void {
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 36;
  let y = startY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(55);
  doc.text(SAFETY_INCIDENT_DATA_CITATION.title, margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.setLineHeightFactor(1.35);

  for (const paragraph of SAFETY_INCIDENT_DATA_CITATION.paragraphs) {
    const lines = doc.splitTextToSize(paragraph, contentWidth);
    if (y + lines.length * 12 > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines, margin, y);
    y += lines.length * 12 + 8;
  }
}

/** Build a PDF with filter summary, chart image, and aggregated data table. */
export async function exportSafetyIncidentChartPdf(
  args: ExportSafetyIncidentChartPdfArgs
): Promise<void> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "letter",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(args.title, margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  const subtitleLines = doc.splitTextToSize(
    args.subtitle,
    pageWidth - margin * 2
  );
  doc.text(subtitleLines, margin, y);
  y += subtitleLines.length * 13 + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(55);
  doc.text("Applied filters", margin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(35);
  for (const item of args.filterSummary) {
    const line = `${item.label}: ${item.value}`;
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 13;
  }

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(args.statsLine, margin, y);
  y += 18;

  const img = await loadImage(args.chartDataUrl);
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = Math.min(280, pageHeight - y - margin - 16);
  const aspect = img.width / img.height;
  let drawWidth = maxWidth;
  let drawHeight = drawWidth / aspect;
  if (drawHeight > maxHeight) {
    drawHeight = maxHeight;
    drawWidth = drawHeight * aspect;
  }

  doc.addImage(args.chartDataUrl, "PNG", margin, y, drawWidth, drawHeight);
  y += drawHeight + 20;

  if (y > pageHeight - 120) {
    doc.addPage();
    y = margin;
  }

  drawDataTable(doc, args.dataTable, margin, pageWidth, pageHeight, y);

  doc.addPage();
  drawDataCitation(doc, margin, pageWidth, pageHeight, margin);

  const generated = (args.generatedAt ?? new Date()).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(`Generated ${generated}`, margin, pageHeight - 22);
  }

  const fileBase = args.title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  doc.save(`${fileBase || "safety-incident-chart"}.pdf`);
}
