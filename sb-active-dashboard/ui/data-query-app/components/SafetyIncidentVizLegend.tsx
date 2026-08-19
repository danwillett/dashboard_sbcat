import { safetyLegendItems, SafetyIncidentVisualizationState } from "@/lib/data-query-app/safetyIncidentVisualization";

interface SafetyIncidentVizLegendProps {
  visualization: SafetyIncidentVisualizationState;
  incidentCount?: number | null;
}

export default function SafetyIncidentVizLegend({
  visualization,
  incidentCount,
}: SafetyIncidentVizLegendProps) {
  const items = safetyLegendItems(visualization);
  const title =
    visualization.styleBy === "severity"
      ? "Incidents by severity"
      : visualization.styleBy === "conflict"
        ? "Incidents by conflict type"
        : visualization.styleBy === "source"
          ? "Incidents by data source"
          : visualization.styleBy === "roadUser"
            ? "Incidents by road user"
            : "Safety incidents";

  return (
    <div
      id="safety-incident-map-legend"
      className="min-w-[220px] max-w-[280px] rounded-lg border border-gray-200 bg-white p-4 shadow-md"
    >
      <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      {typeof incidentCount === "number" && (
        <p className="mt-0.5 text-xs text-gray-500">
          {incidentCount.toLocaleString()} incident
          {incidentCount === 1 ? "" : "s"} shown
        </p>
      )}
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2 text-xs text-gray-700"
          >
            <span
              className="inline-block h-3.5 w-3.5 flex-shrink-0 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
