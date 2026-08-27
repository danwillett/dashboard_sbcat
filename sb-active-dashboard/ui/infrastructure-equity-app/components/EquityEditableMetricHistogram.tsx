import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import ReactECharts from "echarts-for-react";
import {
  buildEquityMetricHistogramOption,
  equityRankBandColors,
  equityRankBandLabelTextColor,
  equityRankBandLabels,
  formatAxisValue,
  isEquityMetricPercent,
  summarizeEquityMetricDistribution,
  EquityMetricAxis,
} from "@/lib/infrastructure-equity-app/infrastructureEquityAnalysisCharts";
import {
  EquityBinCount,
  normalizeBreaks,
} from "@/lib/infrastructure-equity-app/infrastructureEquityBivariate";

interface EquityEditableMetricHistogramProps {
  axis: EquityMetricAxis;
  label: string;
  values: number[];
  breaks: number[];
  binCount: EquityBinCount;
  onBreaksChange: (breaks: number[]) => void;
}

export default function EquityEditableMetricHistogram({
  axis,
  label,
  values,
  breaks,
  binCount,
  onBreaksChange,
}: EquityEditableMetricHistogramProps) {
  const summary = useMemo(
    () =>
      summarizeEquityMetricDistribution({
        axis,
        label,
        values,
        breaks,
        binCount,
      }),
    [axis, label, values, breaks, binCount]
  );

  const option = useMemo(
    () => buildEquityMetricHistogramOption(summary),
    [summary]
  );
  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [draftInputs, setDraftInputs] = useState<string[]>(() =>
    breaks.map((value) => String(Number(value.toFixed(4))))
  );
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const isPercent = isEquityMetricPercent(summary);
  const labels = equityRankBandLabels(binCount);
  const pillColors = equityRankBandColors(axis, binCount);
  const span = Math.max(summary.max - summary.min, 1e-9);

  useEffect(() => {
    setDraftInputs(breaks.map((value) => String(Number(value.toFixed(4)))));
  }, [breaks]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      chartRef.current?.getEchartsInstance()?.resize();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const commitBreaks = useCallback(
    (nextBreaks: number[]) => {
      onBreaksChange(
        normalizeBreaks(nextBreaks, summary.min, summary.max)
      );
    },
    [onBreaksChange, summary.min, summary.max]
  );

  const valueFromClientX = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return summary.min;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return summary.min;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return summary.min + ratio * span;
    },
    [span, summary.min]
  );

  useEffect(() => {
    if (draggingIndex == null) return;

    const handleMove = (event: MouseEvent) => {
      const nextValue = valueFromClientX(event.clientX);
      const nextBreaks = [...breaks];
      nextBreaks[draggingIndex] = nextValue;
      commitBreaks(nextBreaks);
    };

    const handleUp = () => setDraggingIndex(null);

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggingIndex, breaks, commitBreaks, valueFromClientX]);

  const handleInputCommit = (index: number) => {
    const parsed = Number(draftInputs[index]);
    if (!Number.isFinite(parsed)) {
      setDraftInputs(breaks.map((value) => String(Number(value.toFixed(4)))));
      return;
    }
    const nextBreaks = [...breaks];
    nextBreaks[index] = parsed;
    commitBreaks(nextBreaks);
  };

  const handleThumbMouseDown = (
    index: number,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setDraggingIndex(index);
  };

  return (
    <section
      ref={containerRef}
      className="space-y-2 rounded border border-gray-200 bg-white px-3 py-3"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {axis === "infrastructure" ? "Infrastructure" : "Context"} bins
        </p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-gray-900">
          {label}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {labels.map((bandLabel, index) => (
          <span
            key={bandLabel}
            className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 text-[11px]"
            style={{
              backgroundColor: pillColors[index],
              color: equityRankBandLabelTextColor(pillColors[index]),
            }}
          >
            <span className="font-medium">{bandLabel}</span>
            <span className="tabular-nums">{summary.binCounts[index] ?? 0}</span>
          </span>
        ))}
      </div>

      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: 160, width: "100%" }}
        notMerge
        lazyUpdate
      />

      <div className="space-y-1">
        <p className="text-[11px] text-gray-500">
          Drag handles to set cut points, or edit values below.
        </p>
        <div
          ref={trackRef}
          className="relative mx-1 h-7 rounded bg-gray-100"
          aria-hidden={false}
        >
          <div className="absolute inset-y-0 left-0 right-0 my-auto h-1 rounded bg-gray-300" />
          {breaks.map((breakValue, index) => {
            const left = ((breakValue - summary.min) / span) * 100;
            return (
              <button
                key={`break-thumb-${index}`}
                type="button"
                className={`absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${
                  draggingIndex === index ? "bg-blue-600" : "bg-blue-500"
                }`}
                style={{ left: `${left}%` }}
                title={`Cut ${index + 1}: ${formatAxisValue(breakValue, isPercent)}`}
                aria-label={`Bin cut ${index + 1}`}
                onMouseDown={(event) => handleThumbMouseDown(index, event)}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>{formatAxisValue(summary.min, isPercent)}</span>
          <span>{formatAxisValue(summary.max, isPercent)}</span>
        </div>
      </div>

      <div className="space-y-2">
        {breaks.map((_, index) => (
          <label
            key={`break-input-${index}`}
            className="flex items-center gap-2 text-xs text-gray-700"
          >
            <span className="w-16 flex-shrink-0 text-gray-500">
              Cut {index + 1}
            </span>
            <input
              type="number"
              step="any"
              className="equity-form-select w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
              value={draftInputs[index] ?? ""}
              onChange={(event) => {
                const next = [...draftInputs];
                next[index] = event.target.value;
                setDraftInputs(next);
              }}
              onBlur={() => handleInputCommit(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
