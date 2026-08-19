import {
  SafetyIncidentChartDimension,
  SafetyIncidentChartMode,
} from "@/lib/data-query-app/safetyIncidentChartOptions";

export interface SafetyIncidentChartViewState {
  dimension: SafetyIncidentChartDimension;
  chartMode: SafetyIncidentChartMode;
  stackDimension: SafetyIncidentChartDimension;
  jurisdictionLevel: "city" | "service-area";
}

const STORAGE_KEY = "safety-incident-chart-view-state";

const DEFAULT_VIEW_STATE: SafetyIncidentChartViewState = {
  dimension: "severity",
  chartMode: "single",
  stackDimension: "age",
  jurisdictionLevel: "city",
};

export function loadSafetyIncidentChartViewState(): SafetyIncidentChartViewState | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SafetyIncidentChartViewState>;
    if (!parsed.dimension || !parsed.chartMode) return null;
    return {
      dimension: parsed.dimension,
      chartMode: parsed.chartMode,
      stackDimension: parsed.stackDimension ?? DEFAULT_VIEW_STATE.stackDimension,
      jurisdictionLevel:
        parsed.jurisdictionLevel ?? DEFAULT_VIEW_STATE.jurisdictionLevel,
    };
  } catch {
    return null;
  }
}

export function saveSafetyIncidentChartViewState(
  state: SafetyIncidentChartViewState
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode errors
  }
}

export function resolveSafetyIncidentChartViewState(
  initialDimension: SafetyIncidentChartDimension = "severity"
): SafetyIncidentChartViewState {
  const saved = loadSafetyIncidentChartViewState();
  if (saved) return saved;
  return {
    ...DEFAULT_VIEW_STATE,
    dimension: initialDimension,
  };
}
