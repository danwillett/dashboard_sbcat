import {
  CatalogDataset,
  datasetDisplayTitle,
} from "@/lib/data-services/CatalogApiService";
import { SafetyFilters } from "@/lib/safety-app/types";
import {
  CountSurveyGeoLevel,
  CountSurveyGeographicFilter,
  SB_CITIES,
  SB_SERVICE_AREAS,
} from "@/lib/data-query-app/countSurveyFilters";

export type { CountSurveyGeoLevel, CountSurveyGeographicFilter };
export { SB_CITIES, SB_SERVICE_AREAS };

export interface SafetyIncidentFilterState {
  geographic: CountSurveyGeographicFilter;
  filters: Partial<SafetyFilters>;
}

const ALL_CONFLICT_TYPES = [
  "Bike vs vehicle",
  "Bike vs other",
  "Bike vs bike",
  "Bike vs pedestrian",
  "Bike vs infrastructure",
  "Pedestrian vs vehicle",
  "Pedestrian vs other",
];

const ALL_SEVERITY: SafetyFilters["severityTypes"] = [
  "Fatality",
  "Severe Injury",
  "Injury",
  "No Injury",
  "Near Miss",
  "Unknown",
];

export function createDefaultSafetyIncidentFilters(): SafetyIncidentFilterState {
  const today = new Date();
  return {
    geographic: {
      level: "county",
      placeName: null,
    },
    filters: {
      showPedestrian: true,
      showBicyclist: true,
      roadUser: ["pedestrian", "bicyclist"],
      dataSource: ["SWITRS", "BikeMaps.org"],
      severityTypes: [...ALL_SEVERITY],
      conflictType: [...ALL_CONFLICT_TYPES],
      severityFilterEnabled: false,
      dataSourceFilterEnabled: false,
      conflictFilterEnabled: false,
      ebikeMode: false,
      dateRange: {
        start: new Date(2020, 0, 1),
        end: today,
      },
    },
  };
}

export function isSafetyIncidentDataset(dataset: CatalogDataset): boolean {
  const path = (dataset.service_path || "").toLowerCase();
  const title = datasetDisplayTitle(dataset).toLowerCase();
  const url = (dataset.feature_service_url || dataset.primary_url || "").toLowerCase();
  return (
    path.includes("safety_incidents") ||
    path.includes("hosted_safety") ||
    title.includes("safety incident") ||
    url.includes("safety_incidents") ||
    url.includes("hosted_safety")
  );
}

export function findSafetyIncidentDatasets(
  tree: { datasets?: CatalogDataset[]; children?: unknown[] }[]
): CatalogDataset[] {
  const found: CatalogDataset[] = [];
  const walk = (nodes: typeof tree) => {
    for (const node of nodes) {
      for (const ds of node.datasets || []) {
        if (isSafetyIncidentDataset(ds)) found.push(ds);
      }
      if (node.children?.length) {
        walk(node.children as typeof tree);
      }
    }
  };
  walk(tree);
  return found;
}

/**
 * Build an ArcGIS where clause matching Safety page attribute filters.
 * Catalog / FeatureServer layers expose `severity` (not the client-only
 * `maxSeverity` field used by the enriched Safety app layer).
 */
export function buildSafetyIncidentWhereClause(
  filters: Partial<SafetyFilters>
): string {
  const clauses: string[] = [];

  if (filters.dataSourceFilterEnabled) {
    const dataSources = filters.dataSource || [];
    if (dataSources.length === 0) {
      clauses.push("1=0");
    } else if (dataSources.length === 1) {
      if (dataSources[0] === "SWITRS") {
        clauses.push("(data_source = 'SWITRS' OR data_source = 'Police')");
      } else {
        clauses.push(
          "(data_source = 'BikeMaps.org' OR data_source = 'BikeMaps')"
        );
      }
    }
  }

  if (filters.severityFilterEnabled) {
    const severityTypes = filters.severityTypes;
    if (severityTypes !== undefined) {
      if (severityTypes.length === 0) {
        clauses.push("1=0");
      } else if (severityTypes.length < ALL_SEVERITY.length) {
        const severityConditions: string[] = [];
        for (const type of severityTypes) {
          if (type === "Near Miss") {
            severityConditions.push(
              "((severity = 'Near Miss' OR Lower(severity) = 'nearmiss') OR ((severity = 'No Injury' OR Lower(severity) IN ('no injury', 'property_damage_only', 'pdo')) AND (data_source = 'BikeMaps.org' OR data_source = 'BikeMaps')))"
            );
          } else if (type === "No Injury") {
            severityConditions.push(
              "((severity = 'No Injury' OR Lower(severity) IN ('no injury', 'property_damage_only', 'pdo')) AND (data_source = 'SWITRS' OR data_source = 'Police'))"
            );
          } else if (type === "Fatality") {
            severityConditions.push(
              "(severity = 'Fatality' OR Lower(severity) IN ('fatality', 'fatal'))"
            );
          } else if (type === "Severe Injury") {
            severityConditions.push(
              "(severity = 'Severe Injury' OR Lower(severity) IN ('severe injury', 'severe_injury'))"
            );
          } else if (type === "Injury") {
            severityConditions.push(
              "(severity = 'Injury' OR Lower(severity) = 'injury')"
            );
          } else if (type === "Unknown") {
            severityConditions.push(
              "(severity = 'Unknown' OR Lower(severity) = 'unknown' OR severity IS NULL OR severity = '')"
            );
          } else {
            severityConditions.push(
              `severity = '${String(type).replace(/'/g, "''")}'`
            );
          }
        }
        if (severityConditions.length > 0) {
          clauses.push(`(${severityConditions.join(" OR ")})`);
        }
      }
    }
  }

  if (filters.conflictFilterEnabled) {
    const conflictTypes = filters.conflictType;
    if (conflictTypes !== undefined) {
      if (conflictTypes.length === 0) {
        clauses.push("1=0");
      } else if (conflictTypes.length < ALL_CONFLICT_TYPES.length) {
        const conflictConditions = conflictTypes.map(
          (type) => `conflict_type = '${type.replace(/'/g, "''")}'`
        );
        clauses.push(`(${conflictConditions.join(" OR ")})`);
      }
    }
  }

  if (filters.dateRange?.start && filters.dateRange?.end) {
    const startStr = filters.dateRange.start
      .toISOString()
      .replace("T", " ")
      .replace("Z", "")
      .slice(0, 19);
    const endStr = filters.dateRange.end
      .toISOString()
      .replace("T", " ")
      .replace("Z", "")
      .slice(0, 19);
    clauses.push(
      `timestamp >= TIMESTAMP '${startStr}' AND timestamp <= TIMESTAMP '${endStr}'`
    );
  }

  const showBike = filters.showBicyclist !== false;
  const showPed = filters.showPedestrian !== false;
  if (!showBike && !showPed) {
    clauses.push("1=0");
  } else if (showBike && !showPed) {
    clauses.push("bicyclist_involved = 1");
  } else if (!showBike && showPed) {
    clauses.push("pedestrian_involved = 1");
  }

  if (filters.ebikeMode === true) {
    clauses.push("hasEbike = 1");
  }

  return clauses.length > 0 ? clauses.join(" AND ") : "1=1";
}

export interface SafetyIncidentFilterSummaryItem {
  label: string;
  value: string;
}

function formatSummaryDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Human-readable summary of core safety incident filters for chart context. */
export function getSafetyIncidentFilterSummary(
  state: SafetyIncidentFilterState,
  options?: { extended?: boolean }
): SafetyIncidentFilterSummaryItem[] {
  const { geographic, filters } = state;

  let geoLabel = "Area";
  let geoValue = "Santa Barbara County";
  if (geographic.level === "city") {
    geoLabel = "City";
    geoValue = geographic.placeName ?? "Santa Barbara County";
  } else if (geographic.level === "service-area") {
    geoLabel = "Service area";
    geoValue = geographic.placeName ?? "Santa Barbara County";
  }

  const start = filters.dateRange?.start ?? new Date(2020, 0, 1);
  const end = filters.dateRange?.end ?? new Date();

  const showBike = filters.showBicyclist !== false;
  const showPed = filters.showPedestrian !== false;
  let roadUserValue = "Bicyclists & pedestrians";
  if (showBike && !showPed) {
    roadUserValue = "Bicyclists only";
  } else if (!showBike && showPed) {
    roadUserValue = "Pedestrians only";
  } else if (!showBike && !showPed) {
    roadUserValue = "None selected";
  }

  const summary: SafetyIncidentFilterSummaryItem[] = [
    { label: geoLabel, value: geoValue },
    {
      label: "Date range",
      value: `${formatSummaryDate(start)} – ${formatSummaryDate(end)}`,
    },
    { label: "Road users", value: roadUserValue },
  ];

  if (options?.extended) {
    if (filters.severityFilterEnabled) {
      const selected = filters.severityTypes ?? [];
      summary.push({
        label: "Severity",
        value:
          selected.length === 0
            ? "None selected"
            : selected.join(", "),
      });
    }
    if (filters.dataSourceFilterEnabled) {
      const sources = filters.dataSource ?? [];
      summary.push({
        label: "Data source",
        value:
          sources.length === 0
            ? "None selected"
            : sources
                .map((s) =>
                  s === "SWITRS" ? "Police Reports (SWITRS)" : "Self-Reports (BikeMaps.org)"
                )
                .join(", "),
      });
    }
    if (filters.conflictFilterEnabled) {
      const conflicts = filters.conflictType ?? [];
      summary.push({
        label: "Conflict type",
        value:
          conflicts.length === 0 ? "None selected" : conflicts.join(", "),
      });
    }
  }

  return summary;
}

export { ALL_CONFLICT_TYPES, ALL_SEVERITY };
