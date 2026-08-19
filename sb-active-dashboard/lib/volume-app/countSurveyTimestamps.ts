/** Santa Barbara County count surveys use Pacific wall-clock timestamps. */
export const COUNT_SURVEY_TIMEZONE = "America/Los_Angeles";

interface WallClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function utcMsToWallParts(
  utcMs: number,
  timeZone: string
): WallClockParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function wallClockToUtcMs(parts: WallClockParts, timeZone: string): number {
  let utc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  for (let attempt = 0; attempt < 4; attempt++) {
    const resolved = utcMsToWallParts(utc, timeZone);
    const diffMinutes =
      (parts.year - resolved.year) * 525600 +
      (parts.month - resolved.month) * 43200 +
      (parts.day - resolved.day) * 1440 +
      (parts.hour - resolved.hour) * 60 +
      (parts.minute - resolved.minute) +
      (parts.second - resolved.second) / 60;
    if (Math.abs(diffMinutes) < 0.001) break;
    utc += diffMinutes * 60 * 1000;
  }

  return utc;
}

function parseWallClock(iso: string): WallClockParts | null {
  const cleaned = iso.trim().replace(/(Z|[+-]\d{2}:\d{2}(?::\d{2})?)$/i, "");
  const match = cleaned.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?)?/
  );
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? "0"),
    minute: Number(match[5] ?? "0"),
    second: Number(Math.floor(Number(match[6] ?? "0"))),
  };
}

/** Parse API count timestamps as Pacific local wall time (epoch ms). */
export function parseCountSurveyTimestamp(iso: string): number {
  const wall = parseWallClock(iso);
  if (!wall) return new Date(iso).getTime();
  return wallClockToUtcMs(wall, COUNT_SURVEY_TIMEZONE);
}

export function formatCountSurveyTimestamp(
  iso: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const ms = parseCountSurveyTimestamp(iso);
  if (Number.isNaN(ms)) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: COUNT_SURVEY_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(ms);
}

export function formatCountSurveyTimestampMs(
  ms: number,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: COUNT_SURVEY_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(ms);
}

/** ISO-like local timestamp string in Pacific (for CSV export). */
export function countSurveyTimestampIsoLocal(iso: string): string {
  const ms = parseCountSurveyTimestamp(iso);
  if (Number.isNaN(ms)) return iso;
  const parts = utcMsToWallParts(ms, COUNT_SURVEY_TIMEZONE);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T` +
    `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`
  );
}
