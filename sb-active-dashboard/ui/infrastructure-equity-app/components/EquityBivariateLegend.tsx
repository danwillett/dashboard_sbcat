import {
  getBivariateFillColors,
  EquityBinCount,
} from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";

interface EquityBivariateLegendProps {
  contextLabel: string;
  infrastructureLabel: string;
  binCount?: EquityBinCount;
  /** Geographic extent label (e.g. City of Santa Barbara Boundaries). */
  extentLabel?: string;
  /** Active analysis run title (e.g. comfort metric × indicator). */
  runTitle?: string;
}

const CELL_SIZE_PX = 28;
const CELL_GAP_PX = 2;

function formatAxisPercentLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;
  if (/\(%\)|%/.test(trimmed)) return trimmed;
  return `${trimmed} (%)`;
}

export default function EquityBivariateLegend({
  contextLabel,
  infrastructureLabel,
  binCount = 3,
  extentLabel,
  runTitle,
}: EquityBivariateLegendProps) {
  const colors = getBivariateFillColors(binCount);
  const legendRows = [...colors].reverse();
  const gridSizePx = CELL_SIZE_PX * binCount + CELL_GAP_PX * (binCount - 1);

  const headerTitle = extentLabel
    ? `Equity Results - ${extentLabel}`
    : "Equity Results";
  const yAxisTitle = contextLabel;
  const xAxisTitle = formatAxisPercentLabel(infrastructureLabel);

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

      <div className="flex items-start gap-2 pl-1">
        <div
          className="flex items-stretch gap-1.5"
          style={{ height: gridSizePx }}
        >
          <div
            className="flex items-center justify-center text-[11px] font-medium leading-tight text-gray-600"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              maxHeight: gridSizePx,
            }}
            title={yAxisTitle}
          >
            <span className="line-clamp-3 text-center">{yAxisTitle}</span>
          </div>

          <div className="flex flex-col justify-between py-0.5 text-[10px] leading-none text-gray-500">
            <span>High</span>
            <span>Low</span>
          </div>
        </div>

        <div className="min-w-0">
          <div
            className="grid"
            style={{
              width: gridSizePx,
              height: gridSizePx,
              gap: CELL_GAP_PX,
              gridTemplateColumns: `repeat(${binCount}, ${CELL_SIZE_PX}px)`,
            }}
          >
            {legendRows.map((row, rowIndex) =>
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

          <div style={{ width: gridSizePx }}>
            <div className="mt-1.5 flex justify-between text-[10px] leading-none text-gray-500">
              <span>Low</span>
              <span>High</span>
            </div>
            <div
              className="mt-1 text-center text-[11px] font-medium leading-tight text-gray-600"
              title={xAxisTitle}
            >
              <span className="line-clamp-2">{xAxisTitle}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 pl-1 text-[10px] leading-snug text-gray-500">
        Colors show relative rank within the selected analysis extent (not
        absolute values from the preview layer). {binCount}×{binCount} bins.
      </p>
    </div>
  );
}
