import { modeledVolumeLegendItems } from "@/lib/data-query-app/modeledVolumeVisualization";
import { ModeledVolumeGeometry } from "@/lib/data-query-app/modeledVolumeFilters";

interface ModeledVolumeVizLegendProps {
  geometry: ModeledVolumeGeometry;
  identityLabel?: string | null;
  year?: number | null;
  activeField?: string | null;
  activeResolution?: number | null;
  variant?: "map" | "embedded";
  className?: string;
}

/**
 * Map overlay legend for modeled AADT Low/Medium/High styling.
 */
export default function ModeledVolumeVizLegend({
  geometry,
  identityLabel,
  year,
  activeField,
  activeResolution = null,
  variant = "map",
  className = "",
}: ModeledVolumeVizLegendProps) {
  const legend = modeledVolumeLegendItems();
  const isEmbedded = variant === "embedded";
  const geometryLabel =
    geometry === "hexagon" ? "H3 hexagons" : "Network segments";

  return (
    <div
      id={isEmbedded ? "modeled-volume-embedded-legend" : "modeled-volume-map-legend"}
      className={
        isEmbedded
          ? `px-3 py-3 ${className}`
          : `min-w-[220px] max-w-[280px] rounded-lg border border-gray-200 bg-white p-4 shadow-md ${className}`
      }
    >
      <h4 className="text-sm font-semibold text-gray-800">
        Modeled AADT · {geometryLabel}
      </h4>
      {identityLabel && (
        <p className="mt-0.5 text-xs text-gray-500">{identityLabel}</p>
      )}
      {year != null && (
        <p className="text-xs text-gray-500">Year {year}</p>
      )}
      {activeField && (
        <p className="mt-0.5 font-mono text-[10px] text-gray-400">
          {activeField}
        </p>
      )}

      <ul className="mt-3 space-y-1.5">
        {legend.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2 text-xs text-gray-700"
          >
            <span
              className={`inline-block border border-white shadow-sm ${
                geometry === "hexagon"
                  ? "h-3.5 w-3.5 rounded-sm"
                  : "h-1 w-5 rounded-full"
              }`}
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-gray-100 pt-2 text-[10px] text-gray-400">
        {geometry === "hexagon"
          ? `H3 res ${activeResolution ?? "9→10→11"} · zoom 9+`
          : "Viewport load · zoom 12+"}
      </p>
    </div>
  );
}
