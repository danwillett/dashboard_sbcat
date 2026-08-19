import {
  COUNT_SURVEY_COLOR_RAMPS,
  CountSurveyColorRampId,
  CountSurveyVisualizationState,
  CountSurveyVizRoadUser,
} from "@/lib/data-query-app/countSurveyVisualization";
import CountSurveyVizLegend from "@/ui/data-query-app/components/CountSurveyVizLegend";

interface CountSurveyVisualizationPanelProps {
  visualization: CountSurveyVisualizationState;
  yearUsedLabel?: string | null;
  loading?: boolean;
  error?: string | null;
  onChange: (next: CountSurveyVisualizationState) => void;
}

function rampGradientCss(colors: [[number, number, number], [number, number, number], [number, number, number]]) {
  const [a, b, c] = colors;
  return `linear-gradient(90deg, rgb(${a.join(",")}), rgb(${b.join(",")}), rgb(${c.join(",")}))`;
}

export default function CountSurveyVisualizationPanel({
  visualization,
  yearUsedLabel,
  loading,
  error,
  onChange,
}: CountSurveyVisualizationPanelProps) {
  const setRoadUser = (roadUser: CountSurveyVizRoadUser) => {
    onChange({ ...visualization, roadUser, mode: "aadt" });
  };

  return (
    <div id="count-survey-visualization-panel" className="px-4 py-4 space-y-4">
      <div>
        <h3 className="text-base font-medium text-gray-800">Map styling</h3>
        <p className="mt-1 text-xs text-gray-500">
          Style count sites by AADT (AADV). Uses the selected survey year when
          exactly one year is filtered; otherwise the most recent AADT year per
          site.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="count-survey-viz-mode"
            checked={visualization.mode === "uniform"}
            onChange={() => onChange({ ...visualization, mode: "uniform" })}
          />
          Uniform points
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="radio"
            name="count-survey-viz-mode"
            checked={visualization.mode === "aadt"}
            onChange={() => onChange({ ...visualization, mode: "aadt" })}
          />
          Style by AADT
        </label>
      </div>

      {visualization.mode === "aadt" && (
        <>
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Road user</h4>
            <div className="flex gap-2">
              {(
                [
                  { id: "bike", label: "🚲 Bicyclist" },
                  { id: "ped", label: "👟 Pedestrian" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRoadUser(option.id)}
                  className={`flex-1 rounded border px-2 py-1.5 text-xs font-medium ${
                    visualization.roadUser === option.id
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                  style={{
                    backgroundColor:
                      visualization.roadUser === option.id ? "#eff6ff" : "#ffffff",
                    color:
                      visualization.roadUser === option.id ? "#1d4ed8" : "#374151",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={visualization.varyColor}
                onChange={(e) =>
                  onChange({ ...visualization, varyColor: e.target.checked })
                }
              />
              Vary color by AADT
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={visualization.varySize}
                onChange={(e) =>
                  onChange({ ...visualization, varySize: e.target.checked })
                }
              />
              Vary size by AADT
            </label>
          </div>

          {visualization.varyColor && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700">Color ramp</h4>
              <div className="grid grid-cols-1 gap-1.5">
                {COUNT_SURVEY_COLOR_RAMPS.map((ramp) => {
                  const selected = visualization.colorRamp === ramp.id;
                  return (
                    <button
                      key={ramp.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...visualization,
                          colorRamp: ramp.id as CountSurveyColorRampId,
                        })
                      }
                      className={`flex items-center gap-2 rounded border px-2 py-1.5 text-left text-xs ${
                        selected
                          ? "border-blue-500 ring-1 ring-blue-300"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={{
                        backgroundColor: "#ffffff",
                        color: "#374151",
                      }}
                    >
                      <span
                        className="h-3.5 w-20 flex-shrink-0 rounded-sm border border-gray-200"
                        style={{ background: rampGradientCss(ramp.colors) }}
                        aria-hidden
                      />
                      <span className="font-medium">{ramp.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            {loading && <p>Updating map symbology…</p>}
            {!loading && error && <p className="text-red-600">{error}</p>}
            {!loading && !error && yearUsedLabel && (
              <p>
                AADT year: <strong>{yearUsedLabel}</strong>
              </p>
            )}
          </div>

          <CountSurveyVizLegend
            visualization={visualization}
            yearUsedLabel={yearUsedLabel}
            variant="panel"
          />
        </>
      )}

      <div className="rounded border border-dashed border-gray-200 bg-gray-50 px-3 py-3 opacity-70">
        <label className="flex cursor-not-allowed items-center gap-2 text-sm text-gray-500">
          <input type="radio" name="count-survey-viz-flows" disabled checked={false} />
          Style by traffic flows
        </label>
        <p className="mt-1 text-xs text-gray-400">
          Coming soon — visualize segment traffic flows (AADV) around a count
          site once those values are calculated.
        </p>
      </div>
    </div>
  );
}
