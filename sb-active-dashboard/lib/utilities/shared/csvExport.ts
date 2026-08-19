/** Escape a cell value for RFC 4180-style CSV. */
export function escapeCsvValue(value: unknown): string {
  if (value == null) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];
  return lines.join("\r\n");
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = "text/plain;charset=utf-8"
): void {
  const blob = new Blob(["\uFEFF", content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, content: string): void {
  downloadTextFile(filename, content, "text/csv;charset=utf-8");
}

export function datedExportFilename(prefix: string, extension = "csv"): string {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  return `${prefix}-${stamp}.${extension}`;
}
