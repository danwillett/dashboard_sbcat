import { describe, expect, it } from "vitest";
import { parseCountSurveyTimestamp } from "./countSurveyTimestamps";
import { buildGapAwareSeriesData } from "./countSurveyTimeseriesChart";

describe("countSurveyTimestamps", () => {
  it("treats naive API timestamps as Pacific wall time", () => {
    const ms = parseCountSurveyTimestamp("2024-06-15T07:00:00");
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      hour12: true,
    }).format(ms);
    expect(label).toMatch(/7.*AM/i);
  });
});

describe("buildGapAwareSeriesData", () => {
  it("inserts null breaks when hourly gaps exceed one bucket", () => {
    const data = buildGapAwareSeriesData(
      [
        { t: "2024-06-15T07:00:00", c: 12 },
        { t: "2024-06-15T16:00:00", c: 18 },
        { t: "2024-06-16T07:00:00", c: 10 },
      ],
      "hour"
    );

    expect(data).toHaveLength(5);
    expect(data[1][1]).toBeNull();
    expect(data[3][1]).toBeNull();
  });

  it("keeps consecutive hourly points connected", () => {
    const data = buildGapAwareSeriesData(
      [
        { t: "2024-06-15T07:00:00", c: 12 },
        { t: "2024-06-15T08:00:00", c: 9 },
      ],
      "hour"
    );

    expect(data).toHaveLength(2);
    expect(data.every(([, value]) => value != null)).toBe(true);
  });
});
