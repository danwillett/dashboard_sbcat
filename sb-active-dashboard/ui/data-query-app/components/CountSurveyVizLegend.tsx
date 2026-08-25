import {
  AADT_SIZE_RANGE,
  AADT_VIZ_STOPS,
  CountSurveyVisualizationState,
  getColorRamp,
} from "@/lib/data-query-app/countSurveyVisualization";

interface CountSurveyVizLegendProps {
  visualization: CountSurveyVisualizationState;
  yearUsedLabel?: string | null;
  /** Compact card for map overlay vs fuller panel preview */
  variant?: "map" | "panel" | "embedded";
  className?: string;
}

function rgb(color: [number, number, number], alpha = 1): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

/**
 * Legend for count-survey AADT point styling (color ramp and/or size).
 */
export default function CountSurveyVizLegend({
  visualization,
  yearUsedLabel,
  variant = "map",
  className = "",
}: CountSurveyVizLegendProps) {
  if (visualization.mode !== "aadt") return null;
  if (!visualization.varyColor && !visualization.varySize) return null;

  const isMap = variant === "map";
  const isEmbedded = variant === "embedded";
  const ramp = getColorRamp(visualization.colorRamp || "blues");
  const [low, mid, high] = ramp.colors;
  const roadUserLabel =
    visualization.roadUser === "bike" ? "Bicyclist" : "Pedestrian";
  const gradient = `linear-gradient(90deg, ${rgb(low)}, ${rgb(mid)}, ${rgb(high)})`;
  const isMapLike = isMap || isEmbedded;
  const sizeScale = isMapLike ? 1.25 : 1;

  return (
    <div
      id={
        isEmbedded
          ? "count-survey-embedded-legend"
          : isMap
            ? "count-survey-map-legend"
            : "count-survey-panel-legend"
      }
      className={
        isEmbedded
          ? `px-3 py-3 ${className}`
          : `rounded-lg border border-gray-200 bg-white shadow-md ${
              isMap ? "p-4 min-w-[240px] max-w-[280px]" : "p-3"
            } ${className}`
      }
    >
      <h4
        className={`font-semibold text-gray-800 ${
          isMap || isEmbedded ? "text-sm" : "text-xs"
        }`}
      >
        Count sites · {roadUserLabel} AADT
      </h4>
      {yearUsedLabel && (
        <p
          className={`mt-0.5 text-gray-500 ${
            isMap || isEmbedded ? "text-xs" : "text-[10px]"
          }`}
        >
          {yearUsedLabel}
        </p>
      )}

      {visualization.varyColor && (
        <div className={isMap || isEmbedded ? "mt-3" : "mt-2"}>
          <div
            className={`mb-1.5 flex items-center justify-between text-gray-500 ${
              isMap || isEmbedded ? "text-xs" : "text-[10px]"
            }`}
          >
            <span>{ramp.label}</span>
            <span>
              {AADT_VIZ_STOPS.low}–{AADT_VIZ_STOPS.high}+
            </span>
          </div>
          <div
            className={`w-full rounded-sm border border-gray-200 ${
              isMap || isEmbedded ? "h-4" : "h-3"
            }`}
            style={{ background: gradient }}
            aria-hidden
          />
          <div
            className={`mt-1.5 flex justify-between text-gray-600 ${
              isMap || isEmbedded ? "text-xs" : "text-[10px]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block rounded-full border border-white shadow-sm ${
                  isMap || isEmbedded ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                }`}
                style={{ backgroundColor: rgb(low) }}
              />
              Low
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block rounded-full border border-white shadow-sm ${
                  isMapLike ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                }`}
                style={{ backgroundColor: rgb(mid) }}
              />
              Med
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block rounded-full border border-white shadow-sm ${
                  isMapLike ? "h-4 w-4" : "h-3 w-3"
                }`}
                style={{ backgroundColor: rgb(high) }}
              />
              High
            </span>
          </div>
        </div>
      )}

      {visualization.varySize && (
        <div
          className={`${
            visualization.varyColor
              ? isMapLike
                ? "mt-4 border-t border-gray-100 pt-3"
                : "mt-3 border-t border-gray-100 pt-2"
              : isMapLike
                ? "mt-3"
                : "mt-2"
          }`}
        >
          <p
            className={`mb-2 font-medium text-gray-600 ${
              isMapLike ? "text-xs" : "text-[10px]"
            }`}
          >
            Point size
          </p>
          <div className="flex items-end justify-between px-1">
            {(
              [
                { label: String(AADT_VIZ_STOPS.low), size: AADT_SIZE_RANGE.minSize },
                {
                  label: String(AADT_VIZ_STOPS.mid),
                  size:
                    (AADT_SIZE_RANGE.minSize + AADT_SIZE_RANGE.maxSize) / 2,
                },
                { label: `${AADT_VIZ_STOPS.high}+`, size: AADT_SIZE_RANGE.maxSize },
              ] as const
            ).map((stop) => (
              <div
                key={stop.label}
                className={`flex flex-col items-center gap-1.5 text-gray-600 ${
                  isMapLike ? "text-xs" : "text-[10px]"
                }`}
              >
                <span
                  className="rounded-full border border-white shadow-sm"
                  style={{
                    width: stop.size * sizeScale,
                    height: stop.size * sizeScale,
                    backgroundColor: visualization.varyColor
                      ? rgb(mid, 0.9)
                      : "rgba(37, 99, 235, 0.9)",
                  }}
                />
                <span>{stop.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
