import { useState } from "react";

interface ExportFilteredDataButtonProps {
  disabled?: boolean;
  disabledReason?: string;
  label?: string;
  description?: string;
  rowNoun?: string;
  /** Omit outer footer chrome when nested inside a shared export panel. */
  embedded?: boolean;
  onExport: () => Promise<{
    rowCount: number;
    truncated: boolean;
    downloadOnly?: boolean;
    filename?: string;
  }>;
}

export default function ExportFilteredDataButton({
  disabled = false,
  disabledReason,
  label = "Export filtered data (CSV)",
  description,
  rowNoun = "rows",
  embedded = false,
  onExport,
}: ExportFilteredDataButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleExport = async () => {
    if (disabled || exporting) return;
    setExporting(true);
    setNotice(null);
    try {
      const result = await onExport();
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

  return (
    <div
      className={
        embedded
          ? ""
          : "shrink-0 border-t border-gray-200 bg-white px-4 py-3"
      }
    >
      {description && !embedded && (
        <p className="mb-2 text-xs leading-relaxed text-gray-500">{description}</p>
      )}
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={disabled || exporting}
        title={disabled ? disabledReason : undefined}
        className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: "#ffffff", color: "#374151" }}
      >
        {exporting ? "Exporting…" : label}
      </button>
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
