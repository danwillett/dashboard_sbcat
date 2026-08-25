import {
  GenericClassificationMethod,
  GenericFeatureLayerVisualizationState,
  GenericStylableFieldType,
  getStylableFieldType,
} from "@/lib/data-query-app/genericFeatureLayerVisualization";
import type { CSSProperties } from "react";

interface ArcGisFeatureLayerVisualizationPanelProps {
  visualization: GenericFeatureLayerVisualizationState;
  onChange: (next: GenericFeatureLayerVisualizationState) => void;
  numericFields: __esri.Field[];
  loading?: boolean;
  error?: string | null;
  layerReady?: boolean;
}

const CLASSIFICATION_OPTIONS: Array<{
  id: GenericClassificationMethod;
  label: string;
  description: string;
}> = [
  {
    id: "quantile",
    label: "Quantile",
    description: "Equal count per class (common server default).",
  },
  {
    id: "equal-interval",
    label: "Equal interval",
    description: "Equal value range per class.",
  },
];

const LIGHT_SELECT_CLASS =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100";

const LIGHT_SELECT_STYLE: CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#111827",
  colorScheme: "light",
};

const LIGHT_OPTION_STYLE: CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#111827",
};

function fieldTypeLabel(type: GenericStylableFieldType): string {
  return type === "categorical" ? "Categories" : "Numeric";
}

export default function ArcGisFeatureLayerVisualizationPanel({
  visualization,
  onChange,
  numericFields,
  loading = false,
  error = null,
  layerReady = false,
}: ArcGisFeatureLayerVisualizationPanelProps) {
  const stylableFields = numericFields;
  const isCategorical = visualization.fieldType === "categorical";

  return (
    <div
      id="arcgis-feature-layer-visualization-panel"
      className="space-y-5 px-4 py-4"
    >
      <div>
        <h3 className="text-base font-medium text-gray-800">Map styling</h3>
        <p className="mt-1 text-xs text-gray-500">
          Adjust classification and transparency. Changes apply to the map
          layer immediately.
        </p>
      </div>

      {!layerReady && !loading && (
        <p className="text-xs text-gray-500">
          Turn on the layer to configure styling.
        </p>
      )}

      <div>
        <label
          htmlFor="generic-feature-field"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Attribute
        </label>
        <select
          id="generic-feature-field"
          value={visualization.field ?? ""}
          onChange={(e) => {
            const fieldName = e.target.value || null;
            const fieldMeta = stylableFields.find((f) => f.name === fieldName);
            onChange({
              ...visualization,
              field: fieldName,
              fieldType: fieldMeta ? getStylableFieldType(fieldMeta) : null,
            });
          }}
          disabled={!layerReady || stylableFields.length === 0}
          className={LIGHT_SELECT_CLASS}
          style={LIGHT_SELECT_STYLE}
        >
          {stylableFields.length === 0 ? (
            <option value="" style={LIGHT_OPTION_STYLE}>
              No stylable fields
            </option>
          ) : (
            stylableFields.map((field) => (
              <option
                key={field.name}
                value={field.name}
                style={LIGHT_OPTION_STYLE}
              >
                {field.alias || field.name} (
                {fieldTypeLabel(getStylableFieldType(field))})
              </option>
            ))
          )}
        </select>
      </div>

      {isCategorical && (
        <p className="text-xs text-gray-500">
          Categorical attributes use unique colors per value (for example
          comfort class labels).
        </p>
      )}

      {!isCategorical && (
        <>
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">
              Classification
            </h4>
            <div className="space-y-2">
              {CLASSIFICATION_OPTIONS.map((option) => {
                const selected =
                  visualization.classificationMethod === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...visualization,
                        classificationMethod: option.id,
                      })
                    }
                    disabled={!layerReady}
                    className={`w-full rounded border px-3 py-2 text-left disabled:opacity-60 ${
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
                    <div className="text-xs text-gray-500">
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="generic-feature-classes"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Number of classes
            </label>
            <select
              id="generic-feature-classes"
              value={visualization.numClasses}
              onChange={(e) =>
                onChange({
                  ...visualization,
                  numClasses: Number(e.target.value),
                })
              }
              disabled={!layerReady}
              className={LIGHT_SELECT_CLASS}
              style={LIGHT_SELECT_STYLE}
            >
              {[3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n} style={LIGHT_OPTION_STYLE}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div>
        <label
          htmlFor="generic-feature-opacity"
          className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700"
        >
          <span>Layer transparency</span>
          <span className="text-xs text-gray-500">
            {Math.round(visualization.opacity * 100)}%
          </span>
        </label>
        <input
          id="generic-feature-opacity"
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={visualization.opacity}
          onChange={(e) =>
            onChange({
              ...visualization,
              opacity: Number(e.target.value),
            })
          }
          disabled={!layerReady}
          className="w-full"
          style={{ colorScheme: "light", accentColor: "#2563eb" }}
        />
      </div>

      {(loading || error) && (
        <p className={`text-xs ${error ? "text-red-600" : "text-gray-500"}`}>
          {error || "Updating map style…"}
        </p>
      )}
    </div>
  );
}
