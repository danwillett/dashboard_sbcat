import { useEffect, useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import type MapView from "@arcgis/core/views/MapView";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import {
  downloadEquityExportBundle,
  EquitySpatialExportFormat,
  EquitySpatialExportKind,
} from "@/lib/infrastructure-equity-app/exportEquityAnalysisDownloads";
import { formatEquityAnalysisContextMetricLabel } from "@/lib/infrastructure-equity-app/infrastructureEquityAcsIndicators";
import { formatEquityAnalysisSummaryBullets } from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";
import { PinnedEquityAnalysis } from "@/lib/infrastructure-equity-app/infrastructureEquityPinned";

type ExportStatus = {
  tone: "ok" | "error" | "info";
  message: string;
} | null;

interface EquityExportPanelProps {
  pinnedAnalyses: PinnedEquityAnalysis[];
  activeAnalysisId: string | null;
  analysisRunning?: boolean;
  mapView: MapView | null;
  resolveInfrastructureDataset: (datasetId: number) => CatalogDataset | null;
}

const SPATIAL_EXPORT_OPTIONS: Array<{
  kind: EquitySpatialExportKind;
  title: string;
  description: string;
}> = [
  {
    kind: "raw-filtered",
    title: "Raw filtered data",
    description:
      "Infrastructure segments inside the selected extent after comfort-level filters are applied (pre-aggregation).",
  },
  {
    kind: "output-layer",
    title: "Output layer",
    description:
      "Bivariate analysis polygons with class labels, metric values, and ranks used on the map.",
  },
];

const DEFAULT_INCLUDED: Record<EquitySpatialExportKind, boolean> = {
  "raw-filtered": true,
  "output-layer": true,
};

const DEFAULT_FORMATS: Record<EquitySpatialExportKind, EquitySpatialExportFormat> =
  {
    "raw-filtered": "shapefile",
    "output-layer": "shapefile",
  };

function analysisOptionLabel(entry: PinnedEquityAnalysis): string {
  return `${entry.layerTitleMain} (${entry.layerSubtitle})`;
}

function ExportIncludeRow({
  title,
  description,
  included,
  format,
  disabled,
  onIncludedChange,
  onFormatChange,
}: {
  title: string;
  description: string;
  included: boolean;
  format: EquitySpatialExportFormat;
  disabled?: boolean;
  onIncludedChange: (included: boolean) => void;
  onFormatChange: (format: EquitySpatialExportFormat) => void;
}) {
  return (
    <div
      className={`rounded border px-3 py-3 ${
        included
          ? "border-gray-200 bg-white"
          : "border-gray-200 bg-gray-50/80 opacity-80"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          className="equity-form-checkbox mt-0.5"
          checked={included}
          disabled={disabled}
          onChange={(event) => onIncludedChange(event.target.checked)}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-gray-900">{title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-gray-500">
            {description}
          </span>
        </span>
      </label>

      <div className="mt-3 flex items-center justify-between gap-3 pl-6">
        <span className="text-xs font-medium text-gray-600">Format</span>
        <select
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          value={format}
          disabled={disabled || !included}
          onChange={(event) =>
            onFormatChange(event.target.value as EquitySpatialExportFormat)
          }
        >
          <option value="shapefile">Shapefile (.zip)</option>
          <option value="csv">CSV</option>
        </select>
      </div>
    </div>
  );
}

export default function EquityExportPanel({
  pinnedAnalyses,
  activeAnalysisId,
  analysisRunning = false,
  mapView,
  resolveInfrastructureDataset,
}: EquityExportPanelProps) {
  const [open, setOpen] = useState(false);
  const [exportAnalysisId, setExportAnalysisId] = useState<string | null>(
    activeAnalysisId
  );
  const [included, setIncluded] =
    useState<Record<EquitySpatialExportKind, boolean>>(DEFAULT_INCLUDED);
  const [formats, setFormats] =
    useState<Record<EquitySpatialExportKind, EquitySpatialExportFormat>>(
      DEFAULT_FORMATS
    );
  const [includePdf, setIncludePdf] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ExportStatus>(null);

  useEffect(() => {
    if (
      exportAnalysisId &&
      pinnedAnalyses.some((entry) => entry.id === exportAnalysisId)
    ) {
      return;
    }
    setExportAnalysisId(activeAnalysisId ?? pinnedAnalyses[0]?.id ?? null);
  }, [activeAnalysisId, exportAnalysisId, pinnedAnalyses]);

  const handleOpen = () => {
    setExportAnalysisId(activeAnalysisId ?? pinnedAnalyses[0]?.id ?? null);
    setIncluded({ ...DEFAULT_INCLUDED });
    setFormats({ ...DEFAULT_FORMATS });
    setIncludePdf(true);
    setStatus(null);
    setOpen(true);
  };

  const handleClose = () => {
    if (busy) return;
    setOpen(false);
  };

  const exportEntry = useMemo(
    () => pinnedAnalyses.find((entry) => entry.id === exportAnalysisId) ?? null,
    [pinnedAnalyses, exportAnalysisId]
  );
  const analysis = exportEntry?.result ?? null;

  const selectedCount = useMemo(
    () =>
      SPATIAL_EXPORT_OPTIONS.reduce(
        (count, option) => count + (included[option.kind] ? 1 : 0),
        0
      ) + (includePdf ? 1 : 0),
    [included, includePdf]
  );

  const takeawayPreview = useMemo(() => {
    if (!analysis) return [];
    const infrastructureLabel = /\(%\)|%/.test(analysis.infrastructureMetricLabel)
      ? analysis.infrastructureMetricLabel
      : `${analysis.infrastructureMetricLabel} (%)`;
    return formatEquityAnalysisSummaryBullets({
      units: analysis.units,
      breaks: analysis.breaks,
      infrastructureLabel,
      contextLabel: formatEquityAnalysisContextMetricLabel(analysis),
      geographyLabel: analysis.geographyLabel,
      contextKind: analysis.contextKind,
      contextDatasetTitle: analysis.contextDatasetTitle,
    }).slice(0, 2);
  }, [analysis]);

  const handleDownloadBundle = async () => {
    if (!analysis || !exportEntry || busy) return;

    const selections = SPATIAL_EXPORT_OPTIONS.filter(
      (option) => included[option.kind]
    ).map((option) => ({
      kind: option.kind,
      format: formats[option.kind],
    }));

    if (selections.length === 0 && !includePdf) {
      setStatus({
        tone: "info",
        message: "Select at least one item to include in the zip.",
      });
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await downloadEquityExportBundle({
        analysis,
        analysisId: exportEntry.id,
        infrastructureDataset: resolveInfrastructureDataset(
          exportEntry.infrastructureDatasetId
        ),
        mapView,
        selections,
        includePdf,
      });
      setStatus({
        tone: "ok",
        message: `Downloaded ${result.filename} (${selectedCount} item${
          selectedCount === 1 ? "" : "s"
        }).`,
      });
    } catch (error) {
      console.error("Equity export bundle failed", error);
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Export failed. Try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (pinnedAnalyses.length === 0 || analysisRunning) {
    return null;
  }

  return (
    <>
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={handleOpen}
          className="w-full rounded border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Export results
        </button>
      </div>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="equity-export-results-title"
      >
        <DialogTitle
          id="equity-export-results-title"
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            pr: 1,
          }}
        >
          <div className="min-w-0">
            <span className="block text-base font-semibold text-gray-900">
              Export results
            </span>
            <span className="mt-0.5 block text-sm font-normal text-gray-500">
              Choose what to include, pick a format for each layer, then download
              one zip.
            </span>
          </div>
          <IconButton
            aria-label="Close export dialog"
            onClick={handleClose}
            size="small"
            disabled={busy}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2 }}>
          <div className="space-y-3">
            {pinnedAnalyses.length > 1 && (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-gray-700">
                  Analysis to export
                </span>
                <select
                  className="w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900"
                  value={exportAnalysisId ?? ""}
                  disabled={busy}
                  onChange={(event) => {
                    setExportAnalysisId(event.target.value);
                    setStatus(null);
                  }}
                >
                  {pinnedAnalyses.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {analysisOptionLabel(entry)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {analysis && (
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2.5">
                <p className="text-sm font-medium text-gray-900">
                  {exportEntry?.layerTitleMain}
                </p>
                <p className="text-xs text-gray-500">
                  {exportEntry?.layerSubtitle}
                </p>
                <p className="mt-1.5 text-xs text-gray-600">
                  {analysis.unitsWithData.toLocaleString()} units ·{" "}
                  {analysis.breaks.binCount}×{analysis.breaks.binCount} bins
                </p>
                {takeawayPreview.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-snug text-gray-500">
                    {takeawayPreview.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="space-y-2">
              {SPATIAL_EXPORT_OPTIONS.map((option) => (
                <ExportIncludeRow
                  key={option.kind}
                  title={option.title}
                  description={option.description}
                  included={included[option.kind]}
                  format={formats[option.kind]}
                  disabled={busy || !analysis}
                  onIncludedChange={(next) => {
                    setIncluded((prev) => ({ ...prev, [option.kind]: next }));
                    setStatus(null);
                  }}
                  onFormatChange={(next) => {
                    setFormats((prev) => ({ ...prev, [option.kind]: next }));
                    setStatus(null);
                  }}
                />
              ))}

              <div
                className={`rounded border px-3 py-3 ${
                  includePdf
                    ? "border-gray-200 bg-white"
                    : "border-gray-200 bg-gray-50/80 opacity-80"
                }`}
              >
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    className="equity-form-checkbox mt-0.5"
                    checked={includePdf}
                    disabled={busy || !analysis}
                    onChange={(event) => {
                      setIncludePdf(event.target.checked);
                      setStatus(null);
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">
                      PDF report
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                      Two-page report: analysis summary and histograms on page 1;
                      result map (with legend) and scatter plot with trend/bins on
                      page 2.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || !analysis || selectedCount === 0}
              onClick={() => void handleDownloadBundle()}
              className="w-full rounded border border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? includePdf
                  ? "Preparing report and zip…"
                  : "Preparing zip…"
                : selectedCount === 0
                  ? "Select items to download"
                  : `Download zip (${selectedCount} item${
                      selectedCount === 1 ? "" : "s"
                    })`}
            </button>

            {status && (
              <p
                className={`text-xs leading-relaxed ${
                  status.tone === "error"
                    ? "text-red-600"
                    : status.tone === "ok"
                      ? "text-emerald-700"
                      : "text-gray-500"
                }`}
              >
                {status.message}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
