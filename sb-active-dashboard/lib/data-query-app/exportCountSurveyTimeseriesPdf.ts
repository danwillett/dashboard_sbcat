import { jsPDF } from "jspdf";
import { CountSurveyTimeseriesTable } from "@/lib/data-query-app/countSurveyTimeseriesExport";

export interface ExportCountSurveyTimeseriesPdfArgs {
  chartDataUrl: string;
  title: string;
  subtitle: string;
  contextLines: string[];
  dataTable: CountSurveyTimeseriesTable;
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

function drawTimeseriesTable(
  doc: jsPDF,
  table: CountSurveyTimeseriesTable,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  startY: number
): void {
  const contentWidth = pageWidth - margin * 2;
  const rowHeight = 13;
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
  doc.text("Time series data", margin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  const tableNote =
    table.truncated
      ? `Showing first ${table.rows.length.toLocaleString()} of ${table.totalPoints.toLocaleString()} time buckets (PDF table limit: ${table.maxRows.toLocaleString()}).`
      : `${table.rows.length.toLocaleString()} time bucket${table.rows.length === 1 ? "" : "s"}.`;
  doc.text(tableNote, margin, y);
  y += 14;

  if (table.rows.length === 0) {
    doc.setTextColor(100);
    doc.text("No time series data available.", margin, y);
    return;
  }

  const columnCount = table.headers.length;
  const timestampWidth = Math.min(160, contentWidth * 0.34);
  const valueWidth =
    columnCount > 1
      ? (contentWidth - timestampWidth) / (columnCount - 1)
      : contentWidth - timestampWidth;
  const tableTop = y;

  const drawHeader = () => {
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, contentWidth, headerHeight, "F");
    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, y, contentWidth, headerHeight, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(55);
    table.headers.forEach((header, index) => {
      const x =
        index === 0
          ? margin + 4
          : margin + timestampWidth + (index - 1) * valueWidth + 4;
      const width = index === 0 ? timestampWidth - 8 : valueWidth - 8;
      doc.text(truncateText(doc, header, width), x, y + 11);
    });
    y += headerHeight;
  };

  drawHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(35);

  for (const row of table.rows) {
    if (y + rowHeight > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(35);
    }
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, margin + contentWidth, y);
    row.forEach((cell, index) => {
      const x =
        index === 0
          ? margin + 4
          : margin + timestampWidth + (index - 1) * valueWidth + 4;
      const width = index === 0 ? timestampWidth - 8 : valueWidth - 8;
      doc.text(truncateText(doc, cell, width), x, y + 10);
    });
    y += rowHeight;
  }

  doc.setDrawColor(209, 213, 219);
  doc.line(margin, y, margin + contentWidth, y);
  doc.rect(margin, tableTop, contentWidth, y - tableTop, "S");
}

export async function exportCountSurveyTimeseriesPdf(
  args: ExportCountSurveyTimeseriesPdfArgs
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
  const subtitleLines = doc.splitTextToSize(args.subtitle, pageWidth - margin * 2);
  doc.text(subtitleLines, margin, y);
  y += subtitleLines.length * 13 + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(55);
  doc.text("Chart settings", margin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(35);
  for (const line of args.contextLines) {
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 13;
  }
  y += 10;

  const img = await loadImage(args.chartDataUrl);
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = Math.min(260, pageHeight - y - margin - 16);
  const aspect = img.width / img.height;
  let drawWidth = maxWidth;
  let drawHeight = drawWidth / aspect;
  if (drawHeight > maxHeight) {
    drawHeight = maxHeight;
    drawWidth = drawHeight * aspect;
  }

  doc.addImage(args.chartDataUrl, "PNG", margin, y, drawWidth, drawHeight);
  y += drawHeight + 18;

  if (y > pageHeight - 120) {
    doc.addPage();
    y = margin;
  }

  drawTimeseriesTable(doc, args.dataTable, margin, pageWidth, pageHeight, y);

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
  doc.save(`${fileBase || "count-survey-timeseries"}.pdf`);
}
