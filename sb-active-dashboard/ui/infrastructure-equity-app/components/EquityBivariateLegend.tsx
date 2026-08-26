import { BIVARIATE_FILL_COLORS } from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";

interface EquityBivariateLegendProps {
  contextLabel: string;
  /** Geographic extent label (e.g. City of Santa Barbara Boundaries). */
  extentLabel?: string;
  /** Active analysis run title (e.g. comfort metric × indicator). */
  runTitle?: string;
}

const CELL_SIZE_PX = 36;
const CELL_GAP_PX = 3;
const GRID_SIZE_PX = CELL_SIZE_PX * 3 + CELL_GAP_PX * 2;

/** Display rows with high context at the top (matches renderer row index 2 → 0). */
const LEGEND_COLOR_ROWS = [...BIVARIATE_FILL_COLORS].reverse();

export default function EquityBivariateLegend({
  contextLabel,
  extentLabel,
  runTitle,
}: EquityBivariateLegendProps) {
  const headerTitle = extentLabel
    ? `Equity Results - ${extentLabel}`
    : "Equity Results";

  return (
    <div className="equity-bivariate-legend px-3 py-3">
      <div className="mb-2 pl-1">
        <div className="text-[13px] font-semibold leading-snug text-gray-900">
          {headerTitle}
        </div>
        {runTitle ? (
          <div className="mt-0.5 text-[11px] leading-snug text-gray-500">
            {runTitle}
          </div>
        ) : null}
      </div>
      <div
        className="flex items-stretch gap-3 pl-1"
        style={{ minHeight: GRID_SIZE_PX }}
      >
        <div
          className="flex flex-col justify-between text-[11px] leading-tight text-gray-500"
          style={{ width: 72, height: GRID_SIZE_PX }}
        >
          <span>High {contextLabel}</span>
          <span>Low {contextLabel}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="grid grid-cols-3"
            style={{
              width: GRID_SIZE_PX,
              height: GRID_SIZE_PX,
              gap: CELL_GAP_PX,
            }}
          >
            {LEGEND_COLOR_ROWS.map((row, rowIndex) =>
              row.map((color, colIndex) => (
                <span
                  key={`${rowIndex}-${colIndex}`}
                  className="border border-white/90"
                  style={{
                    backgroundColor: color,
                    width: CELL_SIZE_PX,
                    height: CELL_SIZE_PX,
                  }}
                  aria-hidden
                />
              ))
            )}
          </div>
          <div
            className="mt-2 flex justify-between text-[11px] text-gray-500"
            style={{ width: GRID_SIZE_PX }}
          >
            <span>Low infra.</span>
            <span>High infra.</span>
          </div>
        </div>
      </div>
      <p className="mt-2 pl-1 text-[10px] leading-snug text-gray-500">
        Colors show relative rank within the selected analysis extent (not
        absolute values from the preview layer).
      </p>
    </div>
  );
}
