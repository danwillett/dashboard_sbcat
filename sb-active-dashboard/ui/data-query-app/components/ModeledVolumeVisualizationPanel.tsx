import {
  MODELED_VOLUME_GEOMETRY_OPTIONS,
  ModeledVolumeVisualizationState,
  modeledVolumeLegendItems,
} from "@/lib/data-query-app/modeledVolumeVisualization";

interface ModeledVolumeVisualizationPanelProps {
  visualization: ModeledVolumeVisualizationState;
  onChange: (next: ModeledVolumeVisualizationState) => void;
  identityLabel?: string | null;
  activeField?: string | null;
  loading?: boolean;
  error?: string | null;
}

export default function ModeledVolumeVisualizationPanel({
  visualization,
  onChange,
  identityLabel,
  activeField,
  loading = false,
  error = null,
}: ModeledVolumeVisualizationPanelProps) {
  const legend = modeledVolumeLegendItems();

  return (
    <div
      id="modeled-volume-visualization-panel"
      className="space-y-4 px-4 py-4"
    >
      <div>
        <h3 className="text-base font-medium text-gray-800">Map styling</h3>
        <p className="mt-1 text-xs text-gray-500">
          Switch between network segments and H3 hexagons. Color always maps
          High / Medium / Low for the selected model year.
        </p>
        {identityLabel && (
          <p className="mt-1 text-xs text-gray-500">{identityLabel}</p>
        )}
        {activeField && (
          <p className="mt-0.5 font-mono text-[11px] text-gray-400">
            {activeField}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {MODELED_VOLUME_GEOMETRY_OPTIONS.map((option) => {
          const selected = visualization.geometry === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                onChange({ ...visualization, geometry: option.id })
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
            <li
              key={item.label}
              className="flex items-center gap-2 text-xs text-gray-700"
            >
              <span
                className="inline-block h-3 w-3 rounded-sm border border-white shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span>
                {item.label}
                <span className="ml-1 text-gray-400">({item.description})</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {(loading || error) && (
        <p className={`text-xs ${error ? "text-red-600" : "text-gray-500"}`}>
          {error || "Updating map geometry…"}
        </p>
      )}
    </div>
  );
}
