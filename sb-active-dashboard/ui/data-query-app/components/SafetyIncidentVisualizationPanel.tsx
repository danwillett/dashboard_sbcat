import {
  SAFETY_VIZ_STYLE_OPTIONS,
  SafetyIncidentVisualizationState,
  SafetyIncidentVizStyleBy,
  safetyLegendItems,
} from "@/lib/data-query-app/safetyIncidentVisualization";

interface SafetyIncidentVisualizationPanelProps {
  visualization: SafetyIncidentVisualizationState;
  onChange: (next: SafetyIncidentVisualizationState) => void;
}

export default function SafetyIncidentVisualizationPanel({
  visualization,
  onChange,
}: SafetyIncidentVisualizationPanelProps) {
  const legend = safetyLegendItems(visualization);

  return (
    <div id="safety-incident-visualization-panel" className="px-4 py-4 space-y-4">
      <div>
        <h3 className="text-base font-medium text-gray-800">Map styling</h3>
        <p className="mt-1 text-xs text-gray-500">
          Change how safety incidents are drawn on the map. Filters still
          control which incidents are shown.
        </p>
      </div>

      <div className="space-y-2">
        {SAFETY_VIZ_STYLE_OPTIONS.map((option) => {
          const selected = visualization.styleBy === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange({
                  ...visualization,
                  styleBy: option.id as SafetyIncidentVizStyleBy,
                })
              }
              className={`w-full rounded border px-3 py-2 text-left ${
                selected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
              style={{
                backgroundColor: selected ? "#eff6ff" : "#ffffff",
                color: "#111827",
              }}
            >
              <div className="text-sm font-medium text-gray-800">
                {option.label}
              </div>
              <div className="text-xs text-gray-500">{option.description}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded border border-gray-100 bg-gray-50 px-3 py-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Legend preview
        </h4>
        <ul className="space-y-1.5">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-xs text-gray-700">
              <span
                className="inline-block h-3 w-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
