import { useMemo } from "react";
import EquityEditableMetricHistogram from "@/ui/infrastructure-equity-app/components/EquityEditableMetricHistogram";
import { InfrastructureEquityUnitComputation } from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysis";
import {
  buildEquityBivariateBreaks,
  EQUITY_BIN_COUNT_OPTIONS,
  EquityBinCount,
} from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";
import {
  equityBinSetupPanelIntro,
} from "@/lib/infrastructure-equity-app/infrastructureEquityBinCopy";

interface EquityBinSetupPanelProps {
  binCount: EquityBinCount;
  onBinCountChange: (binCount: EquityBinCount) => void;
  usingDefaultBins: boolean;
  customBinMapping: boolean;
  onCustomBinMappingChange: (enabled: boolean) => void;
  infrastructureBreaks: number[] | null;
  contextBreaks: number[] | null;
  onInfrastructureBreaksChange: (breaks: number[]) => void;
  onContextBreaksChange: (breaks: number[]) => void;
  onResetBreaksToQuantiles: () => void;
  binPreview: InfrastructureEquityUnitComputation | null;
  binPreviewLoading: boolean;
  binPreviewError: string | null;
  binPreviewProgress: { completed: number; total: number } | null;
  infrastructureLabel: string;
  contextLabel: string;
  onToggleContextBinsOnMap: () => void;
  onToggleInfrastructureBinsOnMap: () => void;
  contextBinsMapVisible?: boolean;
  infrastructureBinsMapVisible?: boolean;
  binsMapPreviewBusy?: boolean;
  showSectionHeading?: boolean;
}

export default function EquityBinSetupPanel({
  binCount,
  onBinCountChange,
  usingDefaultBins,
  customBinMapping,
  onCustomBinMappingChange,
  infrastructureBreaks,
  contextBreaks,
  onInfrastructureBreaksChange,
  onContextBreaksChange,
  onResetBreaksToQuantiles,
  binPreview,
  binPreviewLoading,
  binPreviewError,
  binPreviewProgress,
  infrastructureLabel,
  contextLabel,
  onToggleContextBinsOnMap,
  onToggleInfrastructureBinsOnMap,
  contextBinsMapVisible = false,
  infrastructureBinsMapVisible = false,
  binsMapPreviewBusy = false,
  showSectionHeading = false,
}: EquityBinSetupPanelProps) {
  const resolvedBreaks = useMemo(() => {
    if (!binPreview?.units.length) return null;
    return buildEquityBivariateBreaks(binPreview.units, {
      binCount,
      infrastructureBreaks,
      contextBreaks,
    });
  }, [binPreview, binCount, infrastructureBreaks, contextBreaks]);

  const infrastructureChartLabel = /\(%\)|%/.test(infrastructureLabel)
    ? infrastructureLabel
    : `${infrastructureLabel} (%)`;

  return (
    <div className="space-y-4">
      {showSectionHeading && (
        <h3 className="text-base font-semibold text-gray-900">Analysis bins</h3>
      )}

      <section className="space-y-3 rounded border border-gray-200 bg-gray-50 px-3 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Bin mode
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-gray-600">
            {equityBinSetupPanelIntro(binCount, customBinMapping)}
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {customBinMapping
              ? usingDefaultBins
                ? "Custom mapping (equal-count starting cuts)"
                : "Custom mapping"
              : "Default equal-count bins"}
          </p>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            className={`flex-1 rounded border px-2 py-1.5 text-sm font-medium ${
              !customBinMapping
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            style={{
              backgroundColor: !customBinMapping ? "#eff6ff" : "#ffffff",
            }}
            onClick={() => onCustomBinMappingChange(false)}
          >
            Default bins
          </button>
          <button
            type="button"
            className={`flex-1 rounded border px-2 py-1.5 text-sm font-medium ${
              customBinMapping
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            style={{
              backgroundColor: customBinMapping ? "#eff6ff" : "#ffffff",
            }}
            onClick={() => onCustomBinMappingChange(true)}
          >
            Custom bin mapping
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">
            Number of bins
          </label>
          <div className="mt-1.5 flex gap-1">
            {EQUITY_BIN_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                className={`flex-1 rounded border px-2 py-1.5 text-sm font-medium ${
                  binCount === count
                    ? "border-blue-300 bg-blue-50 text-blue-800"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
                style={{
                  backgroundColor: binCount === count ? "#eff6ff" : "#ffffff",
                }}
                onClick={() => onBinCountChange(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </section>

      {customBinMapping && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              style={{ backgroundColor: "#ffffff" }}
              onClick={onResetBreaksToQuantiles}
              disabled={!binPreview || binPreviewLoading}
            >
              Reset to equal-count defaults
            </button>
          </div>

          {binPreviewLoading && (
            <p className="text-sm text-gray-600">
              Computing unit distributions
              {binPreviewProgress
                ? ` (${binPreviewProgress.completed}/${binPreviewProgress.total})`
                : "…"}
            </p>
          )}

          {binPreviewError && (
            <p className="text-sm text-red-600">{binPreviewError}</p>
          )}

          {!binPreviewLoading &&
            !binPreviewError &&
            resolvedBreaks &&
            binPreview && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <EquityEditableMetricHistogram
                    axis="infrastructure"
                    label={infrastructureChartLabel}
                    values={binPreview.units.map(
                      (unit) => unit.infrastructurePercent
                    )}
                    breaks={resolvedBreaks.infrastructure}
                    binCount={binCount}
                    onBreaksChange={onInfrastructureBreaksChange}
                  />
                  <button
                    type="button"
                    className={`w-full rounded border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                      infrastructureBinsMapVisible
                        ? "border-blue-300 bg-blue-50 text-blue-800"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={{
                      backgroundColor: infrastructureBinsMapVisible
                        ? "#eff6ff"
                        : "#ffffff",
                    }}
                    onClick={onToggleInfrastructureBinsOnMap}
                    disabled={binsMapPreviewBusy}
                    aria-pressed={infrastructureBinsMapVisible}
                  >
                    {binsMapPreviewBusy && !infrastructureBinsMapVisible
                      ? "Updating map…"
                      : infrastructureBinsMapVisible
                        ? "Hide infrastructure bins on map"
                        : "View infrastructure bins on map"}
                  </button>
                </div>

                <div className="space-y-2">
                  <EquityEditableMetricHistogram
                    axis="context"
                    label={contextLabel}
                    values={binPreview.units.map((unit) => unit.contextValue)}
                    breaks={resolvedBreaks.context}
                    binCount={binCount}
                    onBreaksChange={onContextBreaksChange}
                  />
                  <button
                    type="button"
                    className={`w-full rounded border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                      contextBinsMapVisible
                        ? "border-blue-300 bg-blue-50 text-blue-800"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    style={{
                      backgroundColor: contextBinsMapVisible
                        ? "#eff6ff"
                        : "#ffffff",
                    }}
                    onClick={onToggleContextBinsOnMap}
                    disabled={binsMapPreviewBusy}
                    aria-pressed={contextBinsMapVisible}
                  >
                    {binsMapPreviewBusy && !contextBinsMapVisible
                      ? "Updating map…"
                      : contextBinsMapVisible
                        ? "Hide context bins on map"
                        : "View context bins on map"}
                  </button>
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}
