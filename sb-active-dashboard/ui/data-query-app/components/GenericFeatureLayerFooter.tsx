import { useState } from "react";
import ExportFilteredDataButton from "@/ui/data-query-app/components/ExportFilteredDataButton";

type GenericFeatureExportFormat = "shapefile" | "csv";

interface GenericFeatureLayerFooterProps {
  portalUrl?: string;
  isBicycleComfort?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onExportCsv: () => Promise<{
    rowCount: number;
    truncated: boolean;
    downloadOnly?: boolean;
    filename?: string;
  }>;
  onExportShapefile: () => Promise<{
    rowCount: number;
    truncated: boolean;
    downloadOnly?: boolean;
    filename?: string;
  }>;
}

export default function GenericFeatureLayerFooter({
  portalUrl,
  isBicycleComfort = false,
  disabled = false,
  disabledReason,
  onExportCsv,
  onExportShapefile,
}: GenericFeatureLayerFooterProps) {
  const [exportFormat, setExportFormat] =
    useState<GenericFeatureExportFormat>("shapefile");

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
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

      <label
        htmlFor="generic-feature-export-format"
        className="mb-1 block text-xs font-medium text-gray-600"
      >
        Export format
      </label>
      <select
        id="generic-feature-export-format"
        value={exportFormat}
        onChange={(event) =>
          setExportFormat(event.target.value as GenericFeatureExportFormat)
        }
        className="mb-2 w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700"
        style={{ backgroundColor: "#ffffff", color: "#374151" }}
      >
        <option value="shapefile">Shapefile (.zip)</option>
        <option value="csv">CSV</option>
      </select>

      <p className="mb-2 text-xs leading-relaxed text-gray-500">
        {isBicycleComfort
          ? "Exports use category filters (WGS 84). Geographic map extent filters are not included. Shapefile field names are truncated to 10 characters."
          : "Exports from the feature service (WGS 84). Shapefile field names are truncated to 10 characters."}
      </p>

      <ExportFilteredDataButton
        embedded
        label="Export data"
        rowNoun={exportFormat === "shapefile" ? "features" : "rows"}
        onExport={
          exportFormat === "shapefile" ? onExportShapefile : onExportCsv
        }
        disabled={disabled}
        disabledReason={disabledReason}
      />
    </div>
  );
}
