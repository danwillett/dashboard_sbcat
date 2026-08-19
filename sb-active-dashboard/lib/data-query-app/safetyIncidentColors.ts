import {
  SAFETY_CONFLICT_COLORS,
  SAFETY_SEVERITY_LEGEND,
} from "@/lib/data-query-app/safetyIncidentVisualization";

/** Age bucket order — keep in sync with safetyIncidentStats AGE_ORDER */
export const AGE_BUCKET_ORDER = [
  "Under 18",
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55–64",
  "65+",
  "Unknown",
] as const;

/** Young → old sequential ramp (Unknown = neutral gray) */
export const AGE_RAMP_COLORS: Record<string, string> = {
  "Under 18": "#dbeafe",
  "18–24": "#93c5fd",
  "25–34": "#3b82f6",
  "35–44": "#2563eb",
  "45–54": "#1d4ed8",
  "55–64": "#1e3a8a",
  "65+": "#172554",
  Unknown: "#9ca3af",
};

export const ROAD_USER_CHART_COLORS: Record<string, string> = {
  "Bicyclist only": "#2563eb",
  "Pedestrian only": "#ea580c",
  Both: "#7c3aed",
  "Neither / unknown": "#9ca3af",
  Bicyclist: "#2563eb",
  Pedestrian: "#ea580c",
};

export const DATA_SOURCE_CHART_COLORS: Record<string, string> = {
  SWITRS: "#1e40af",
  Police: "#1e40af",
  "BikeMaps.org": "#059669",
  BikeMaps: "#059669",
};

export const GENDER_CHART_COLORS: Record<string, string> = {
  Male: "#2563eb",
  Female: "#db2777",
  "Non-binary": "#059669",
  Unknown: "#9ca3af",
};

export const TIME_OF_DAY_CHART_COLORS: Record<string, string> = {
  "Morning (5–11)": "#fbbf24",
  "Afternoon (12–16)": "#f97316",
  "Evening (17–20)": "#a855f7",
  "Night (21–4)": "#1e3a8a",
};

export const WEEKDAY_CHART_COLORS: Record<string, string> = {
  Sunday: "#6366f1",
  Monday: "#2563eb",
  Tuesday: "#0ea5e9",
  Wednesday: "#14b8a6",
  Thursday: "#22c55e",
  Friday: "#eab308",
  Saturday: "#f97316",
};

export const MONTH_CHART_COLORS: Record<string, string> = {
  Jan: "#0ea5e9",
  Feb: "#0284c7",
  Mar: "#06b6d4",
  Apr: "#14b8a6",
  May: "#22c55e",
  Jun: "#84cc16",
  Jul: "#eab308",
  Aug: "#f97316",
  Sep: "#ef4444",
  Oct: "#dc2626",
  Nov: "#9333ea",
  Dec: "#6366f1",
};

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const SEVERITY_COLORS = Object.fromEntries(
  SAFETY_SEVERITY_LEGEND.map((item) => [item.label, item.color])
) as Record<string, string>;

const CONFLICT_COLORS = Object.fromEntries(
  Object.entries(SAFETY_CONFLICT_COLORS).map(([label, rgb]) => [
    label,
    rgbToHex(rgb),
  ])
) as Record<string, string>;

const YEAR_RAMP = [
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#1e40af",
  "#1e3a8a",
  "#172554",
];

const DIMENSION_PALETTES: Record<string, Record<string, string>> = {
  severity: SEVERITY_COLORS,
  roadUser: ROAD_USER_CHART_COLORS,
  dataSource: DATA_SOURCE_CHART_COLORS,
  conflictType: CONFLICT_COLORS,
  gender: GENDER_CHART_COLORS,
  timeOfDay: TIME_OF_DAY_CHART_COLORS,
  weekday: WEEKDAY_CHART_COLORS,
  month: MONTH_CHART_COLORS,
  age: AGE_RAMP_COLORS,
};

/**
 * Resolve a chart color for a category label, aligned with map symbology where
 * applicable (severity, road user, conflict type, data source).
 */
export function chartColorForLabel(
  dimension: string,
  label: string,
  index = 0
): string {
  const palette = DIMENSION_PALETTES[dimension];
  if (palette?.[label]) return palette[label];

  if (dimension === "year") {
    const yearNum = Number(label);
    if (Number.isFinite(yearNum)) {
      const base = 2013;
      const idx = Math.max(0, Math.min(YEAR_RAMP.length - 1, yearNum - base));
      return YEAR_RAMP[idx] ?? YEAR_RAMP[YEAR_RAMP.length - 1];
    }
  }

  if (dimension === "age") {
    return AGE_RAMP_COLORS[label] ?? "#9ca3af";
  }

  const fallback = ["#64748b", "#475569", "#334155", "#94a3b8", "#78716c"];
  return fallback[index % fallback.length];
}
