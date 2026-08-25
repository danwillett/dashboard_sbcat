import { useEffect, useRef, useState } from "react";

export type LayerExportFormat = "shapefile" | "csv";

export interface LayerExportResult {
  rowCount: number;
  truncated: boolean;
  downloadOnly?: boolean;
  filename?: string;
}

interface LayerExportFooterProps {
  portalUrl?: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
  onExportCsv: () => Promise<LayerExportResult>;
  onExportShapefile: () => Promise<LayerExportResult>;
}

function exportFormatLabel(format: LayerExportFormat): string {
  return format === "shapefile" ? "shapefile" : "CSV";
}

export default function LayerExportFooter({
  portalUrl,
  description,
  disabled = false,
  disabledReason,
  onExportCsv,
  onExportShapefile,
}: LayerExportFooterProps) {
  const [exportFormat, setExportFormat] =
    useState<LayerExportFormat>("shapefile");
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [menuOpen]);

  const rowNoun = exportFormat === "shapefile" ? "features" : "rows";

  const handleExport = async () => {
    if (disabled || exporting) return;
    setExporting(true);
    setNotice(null);
    try {
      const result =
        exportFormat === "shapefile"
          ? await onExportShapefile()
          : await onExportCsv();

      if (result.downloadOnly) {
        setNotice(
          result.filename
            ? `Downloaded ${result.filename} from the portal.`
            : "Portal export download started."
        );
      } else {
        setNotice(
          result.truncated
            ? `Exported ${result.rowCount.toLocaleString()} ${rowNoun} (export limit reached; more data may exist).`
            : result.filename?.endsWith(".zip")
              ? `Exported ${result.rowCount.toLocaleString()} ${rowNoun} to ${result.filename}.`
              : `Exported ${result.rowCount.toLocaleString()} ${rowNoun} to CSV.`
        );
      }
    } catch (err) {
      console.error("Export failed:", err);
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  const isError =
    notice != null &&
    !notice.startsWith("Exported") &&
    !notice.startsWith("Downloaded") &&
    !notice.startsWith("Portal export download started");

  const chooseFormat = (format: LayerExportFormat) => {
    setExportFormat(format);
    setMenuOpen(false);
  };

  return (
    <div
      className="layer-export-footer shrink-0 border-t border-gray-200 bg-white px-4 py-3"
      style={{ colorScheme: "light", backgroundColor: "#ffffff" }}
    >
      {portalUrl && (
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 flex w-full items-center justify-center rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          style={{ backgroundColor: "#ffffff", color: "#374151" }}
        >
          Open portal item
        </a>
      )}

      <p className="mb-2 text-xs leading-relaxed text-gray-500">{description}</p>

      <div ref={menuRef} className="layer-export-split-button relative flex w-full">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={disabled || exporting}
          title={disabled ? disabledReason : undefined}
          className="min-w-0 flex-1 rounded-l border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#ffffff", color: "#374151" }}
        >
          {exporting
            ? "Exporting…"
            : `Export Data (${exportFormatLabel(exportFormat)})`}
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          disabled={disabled || exporting}
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          aria-label="Choose export format"
          className="flex items-center justify-center rounded-r border border-l-0 border-gray-200 bg-white px-2.5 py-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "#ffffff", color: "#4b5563" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="listbox"
            className="layer-export-format-menu absolute bottom-full right-0 z-10 mb-1 min-w-[10rem] rounded border border-gray-200 bg-white py-1 shadow-md"
            style={{ backgroundColor: "#ffffff", colorScheme: "light" }}
          >
            <button
              type="button"
              role="option"
              aria-selected={exportFormat === "shapefile"}
              onClick={() => chooseFormat("shapefile")}
              className={`block w-full border-0 px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                exportFormat === "shapefile"
                  ? "font-medium text-blue-700"
                  : "text-gray-700"
              }`}
              style={{
                backgroundColor: "#ffffff",
                color: exportFormat === "shapefile" ? "#1d4ed8" : "#374151",
              }}
            >
              Shapefile (.zip)
            </button>
            <button
              type="button"
              role="option"
              aria-selected={exportFormat === "csv"}
              onClick={() => chooseFormat("csv")}
              className={`block w-full border-0 px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                exportFormat === "csv"
                  ? "font-medium text-blue-700"
                  : "text-gray-700"
              }`}
              style={{
                backgroundColor: "#ffffff",
                color: exportFormat === "csv" ? "#1d4ed8" : "#374151",
              }}
            >
              CSV
            </button>
          </div>
        )}
      </div>

      {notice && (
        <p
          className={`mt-2 text-xs ${isError ? "text-red-600" : "text-gray-500"}`}
        >
          {notice}
        </p>
      )}
    </div>
  );
}
