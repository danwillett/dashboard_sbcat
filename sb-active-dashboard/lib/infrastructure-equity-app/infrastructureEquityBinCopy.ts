import {
  DEFAULT_EQUITY_BIN_COUNT,
  EquityBinCount,
} from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";

/** Shared copy for default binning (left panel tooltip + bin setup panel). */
export const EQUITY_DEFAULT_BINS_DESCRIPTION =
  "Default bins split geographic units into equal-count quantile bands within your selected extent. With 3 bins (default), about one-third of units fall in Low, Medium, and High for each metric—even if the raw values are tightly clustered. These ranks are relative to this analysis, not absolute thresholds.";

export function equityDefaultBinsShortLabel(binCount: EquityBinCount): string {
  if (binCount === 3) {
    return "Default: equal-count terciles (≈⅓ of units per band)";
  }
  return `Default: ${binCount} equal-count quantile bands (≈ even unit counts)`;
}

export function equityBinSetupPanelIntro(
  binCount: EquityBinCount,
  customBinMapping = false
): string {
  const countClause =
    ` You currently have ${binCount} bins selected` +
    (binCount === DEFAULT_EQUITY_BIN_COUNT ? " (the default)." : ".");

  if (!customBinMapping) {
    return EQUITY_DEFAULT_BINS_DESCRIPTION + countClause;
  }

  return (
    EQUITY_DEFAULT_BINS_DESCRIPTION +
    countClause +
    " Drag the handles or edit cut values below to customize the bins used in the analysis."
  );
}
