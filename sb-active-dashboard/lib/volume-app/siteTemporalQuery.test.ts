import { describe, expect, it } from "vitest";
import {
  buildSeriesQueryParams,
  buildSitesQueryParams,
  countTypesFromModes,
  DEFAULT_VOLUME_SITE_FILTERS,
  siteMatchesYearFallback,
  VolumeSiteQueryFilters,
} from "./siteTemporalQuery";

const baseFilters = (): VolumeSiteQueryFilters => ({
  ...DEFAULT_VOLUME_SITE_FILTERS,
  showBicyclist: true,
  showPedestrian: true,
  dateRange: {
    startDate: new Date("2022-01-01T00:00:00.000Z"),
    endDate: new Date("2023-12-31T00:00:00.000Z"),
  },
});

describe("siteTemporalQuery", () => {
  it("omits day params when weekday filter is disabled", () => {
    const params = buildSitesQueryParams(baseFilters());
    expect(params.get("day_types")).toBeNull();
    expect(params.get("periods")).toBeNull();
    expect(params.get("count_types")).toBeNull();
    expect(params.get("start")).toBe("2022-01-01T00:00:00.000Z");
  });

  it("sends weekday, year, and mode filters (no time-of-day on sites list)", () => {
    const params = buildSitesQueryParams({
      ...baseFilters(),
      years: [2023, 2024],
      showPedestrian: false,
      weekdayFilter: { enabled: true, types: ["weekdays"] },
      timeOfDay: { enabled: true, periods: ["morning", "evening"] },
    });

    expect(params.get("years")).toBe("2023,2024");
    expect(params.get("day_types")).toBe("weekdays");
    expect(params.get("periods")).toBeNull();
    expect(params.get("count_types")).toBe("bike");
  });

  it("sends both day types when weekdays and weekends are selected", () => {
    const params = buildSitesQueryParams({
      ...baseFilters(),
      weekdayFilter: { enabled: true, types: ["weekdays", "weekends"] },
    });
    expect(params.get("day_types")).toBe("weekdays,weekends");
  });

  it("asks the series endpoint for mode and direction", () => {
    const params = buildSeriesQueryParams(baseFilters());
    expect(params.get("by_flow")).toBe("1");
    expect(params.get("count_types")).toBe("bike,ped");
  });

  it("maps road-user toggles to count types", () => {
    expect(countTypesFromModes(true, false)).toEqual(["bike"]);
    expect(countTypesFromModes(false, true)).toEqual(["ped"]);
    expect(countTypesFromModes(true, true)).toEqual(["bike", "ped"]);
  });

  it("sends min_coverage_days for survey-length presets", () => {
    expect(
      buildSitesQueryParams({ ...baseFilters(), surveyLength: "any" }).get(
        "min_coverage_days"
      )
    ).toBeNull();
    expect(
      buildSitesQueryParams({ ...baseFilters(), surveyLength: "week" }).get(
        "min_coverage_days"
      )
    ).toBe("7");
    expect(
      buildSitesQueryParams({ ...baseFilters(), surveyLength: "month" }).get(
        "min_coverage_days"
      )
    ).toBe("30");
    expect(
      buildSitesQueryParams({ ...baseFilters(), surveyLength: "quarter" }).get(
        "min_coverage_days"
      )
    ).toBe("90");
  });
});
