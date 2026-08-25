import { SB_CITIES, SB_SERVICE_AREAS } from "@/lib/data-query-app/countSurveyFilters";

export type BicycleComfortGeoLevel =
  | "county"
  | "extent"
  | "city"
  | "service-area";

export interface BicycleComfortGeographicFilter {
  level: BicycleComfortGeoLevel;
  /** City or service-area name; ignored for county and map extent. */
  placeName: string | null;
}

export interface BicycleComfortFilterState {
  geographic: BicycleComfortGeographicFilter;
  categoryFilterEnabled: boolean;
  selectedCategories: string[];
}

export function createDefaultBicycleComfortFilters(): BicycleComfortFilterState {
  return {
    geographic: { level: "county", placeName: null },
    categoryFilterEnabled: false,
    selectedCategories: [],
  };
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildBicycleComfortCategoryWhereClause(
  filters: BicycleComfortFilterState,
  categoryField: string
): string {
  if (!filters.categoryFilterEnabled) {
    return "1=1";
  }

  if (filters.selectedCategories.length === 0) {
    return "1=0";
  }

  const literals = filters.selectedCategories
    .map((value) => `'${escapeSqlLiteral(value)}'`)
    .join(", ");
  return `${categoryField} IN (${literals})`;
}

export function describeBicycleComfortGeographic(
  geographic: BicycleComfortGeographicFilter
): string {
  switch (geographic.level) {
    case "county":
      return "the full county";
    case "extent":
      return "the visible map extent";
    case "city":
      return geographic.placeName
        ? `the city of ${geographic.placeName}`
        : "the selected city";
    case "service-area":
      return geographic.placeName
        ? `the ${geographic.placeName} service area`
        : "the selected service area";
  }
}

export function getBicycleComfortFilterSummary(
  filters: BicycleComfortFilterState
): string {
  const parts: string[] = [describeBicycleComfortGeographic(filters.geographic)];

  if (
    filters.categoryFilterEnabled &&
    filters.selectedCategories.length > 0
  ) {
    if (filters.selectedCategories.length <= 3) {
      parts.push(filters.selectedCategories.join(", "));
    } else {
      parts.push(`${filters.selectedCategories.length} infrastructure classes`);
    }
  }

  return parts.join(" · ");
}

export function defaultPlaceNameForGeoLevel(
  level: BicycleComfortGeoLevel,
  current: BicycleComfortGeographicFilter
): string | null {
  if (level === "city") {
    return (
      current.level === "city" && current.placeName
        ? current.placeName
        : SB_CITIES[0]
    );
  }
  if (level === "service-area") {
    return (
      current.level === "service-area" && current.placeName
        ? current.placeName
        : SB_SERVICE_AREAS[0]
    );
  }
  return null;
}
