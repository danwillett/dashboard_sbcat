import {
  CatalogDataset,
  datasetDisplayTitle,
} from "@/lib/data-services/CatalogApiService";
import {
  DEFAULT_VOLUME_SITE_FILTERS,
  VolumeSiteQueryFilters,
} from "@/lib/volume-app/siteTemporalQuery";

export type CountSurveyGeoLevel = "county" | "city" | "service-area";

export interface CountSurveyGeographicFilter {
  level: CountSurveyGeoLevel;
  /** Selected city or service-area name; ignored when level is county. */
  placeName: string | null;
}

export interface CountSurveyFilterState {
  geographic: CountSurveyGeographicFilter;
  siteFilters: VolumeSiteQueryFilters;
}

export const SB_CITIES = [
  "Santa Barbara",
  "Goleta",
  "Carpinteria",
  "Santa Maria",
  "Lompoc",
  "Solvang",
  "Buellton",
  "Guadalupe",
] as const;

export const SB_SERVICE_AREAS = [
  "Isla Vista",
  "Montecito",
  "Eastern Goleta Valley",
  "Toro Canyon",
  "Summerland",
  "Santa Ynez",
  "Los Alamos",
  "Los Olivos",
  "Ballard",
  "Mission Hills",
  "Orcutt",
  "Vandenberg Village",
  "Casmalia",
  "Sisquoc",
  "Cuyama",
  "New Cuyama",
  "Garey",
] as const;

export function createDefaultCountSurveyFilters(): CountSurveyFilterState {
  const today = new Date();
  return {
    geographic: {
      level: "county",
      placeName: null,
    },
    siteFilters: {
      ...DEFAULT_VOLUME_SITE_FILTERS,
      showBicyclist: true,
      showPedestrian: true,
      dateRange: {
        startDate: new Date(2020, 0, 1),
        endDate: today,
      },
    },
  };
}

/** Catalog datasets that represent count survey sites (OGC dashboard_sites). */
export function isCountSurveyDataset(dataset: CatalogDataset): boolean {
  const path = (dataset.service_path || "").toLowerCase();
  const title = datasetDisplayTitle(dataset).toLowerCase();
  return (
    path.includes("dashboard_sites") ||
    path.includes("count_surveys.dashboard") ||
    title.includes("dashboard_sites") ||
    title.includes("count survey")
  );
}

export function findCountSurveyDatasets(
  tree: { datasets?: CatalogDataset[]; children?: unknown[] }[]
): CatalogDataset[] {
  const found: CatalogDataset[] = [];
  const walk = (nodes: typeof tree) => {
    for (const node of nodes) {
      for (const ds of node.datasets || []) {
        if (isCountSurveyDataset(ds)) found.push(ds);
      }
      if (node.children?.length) {
        walk(node.children as typeof tree);
      }
    }
  };
  walk(tree);
  return found;
}

export interface CountSurveyFilterSummaryItem {
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

/** Human-readable summary of core count survey filters for chart context. */
export function getCountSurveyFilterSummary(
  state: CountSurveyFilterState
): CountSurveyFilterSummaryItem[] {
  const { geographic, siteFilters } = state;

  let geoLabel = "Area";
  let geoValue = "Santa Barbara County";
  if (geographic.level === "city") {
    geoLabel = "City";
    geoValue = geographic.placeName ?? "Santa Barbara County";
  } else if (geographic.level === "service-area") {
    geoLabel = "Service area";
    geoValue = geographic.placeName ?? "Santa Barbara County";
  }

  const start = siteFilters.dateRange?.startDate ?? new Date(2020, 0, 1);
  const end = siteFilters.dateRange?.endDate ?? new Date();

  const showBike = siteFilters.showBicyclist !== false;
  const showPed = siteFilters.showPedestrian !== false;
  let roadUserValue = "Bicyclists & pedestrians";
  if (showBike && !showPed) roadUserValue = "Bicyclists only";
  else if (!showBike && showPed) roadUserValue = "Pedestrians only";
  else if (!showBike && !showPed) roadUserValue = "None selected";

  const years =
    siteFilters.years.length > 0
      ? siteFilters.years.join(", ")
      : "All available years";

  return [
    { label: geoLabel, value: geoValue },
    {
      label: "Date range",
      value: `${formatSummaryDate(start)} – ${formatSummaryDate(end)}`,
    },
    { label: "Road users", value: roadUserValue },
    { label: "Years", value: years },
  ];
}
