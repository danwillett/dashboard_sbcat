import CustomContent from "@arcgis/core/popup/content/CustomContent";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import {
  fetchVolumeSiteAadt,
  VolumeSiteAadtPeriod,
} from "@/lib/data-services/VolumeSitesApiService";

interface TimelineRow {
  year: number;
  countType: string;
  startDate: string | null;
  endDate: string | null;
}

interface AadvCell {
  bike: number | null;
  ped: number | null;
}

function formatPeriod(startDate: string | null, endDate: string | null): string {
  if (startDate && endDate) {
    const start = new Date(startDate).toLocaleDateString("en-US");
    const end = new Date(endDate).toLocaleDateString("en-US");
    return start === end ? start : `${start} - ${end}`;
  }
  if (startDate) return new Date(startDate).toLocaleDateString("en-US");
  return "—";
}

/**
 * Collapse all_aadt rows to one timeline entry per year + mode.
 * Prefer subset IS NULL when present; otherwise keep the widest date span.
 */
function collapsePeriods(periods: VolumeSiteAadtPeriod[]): {
  timeline: TimelineRow[];
  aadvByYear: Map<number, AadvCell>;
  firstSurvey: string | null;
  lastSurvey: string | null;
} {
  type Acc = {
    startDate: string | null;
    endDate: string | null;
    allAadt: number | null;
    preferred: boolean;
  };

  const byKey = new Map<string, Acc>();

  for (const period of periods) {
    if (period.year == null || !period.count_type) continue;
    const countType = period.count_type.toLowerCase();
    if (countType !== "bike" && countType !== "ped") continue;

    const key = `${period.year}|${countType}`;
    const preferred = period.subset == null || period.subset === "";
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, {
        startDate: period.start_date,
        endDate: period.end_date,
        allAadt: period.all_aadt,
        preferred,
      });
      continue;
    }

    // Prefer null-subset rows for AADT value; always widen date coverage
    if (preferred && !existing.preferred) {
      existing.allAadt = period.all_aadt;
      existing.preferred = true;
    } else if (preferred === existing.preferred && period.all_aadt != null) {
      existing.allAadt = period.all_aadt;
    }

    if (
      period.start_date &&
      (!existing.startDate || period.start_date < existing.startDate)
    ) {
      existing.startDate = period.start_date;
    }
    if (
      period.end_date &&
      (!existing.endDate || period.end_date > existing.endDate)
    ) {
      existing.endDate = period.end_date;
    }
  }

  const timeline: TimelineRow[] = [];
  const aadvByYear = new Map<number, AadvCell>();
  let firstSurvey: string | null = null;
  let lastSurvey: string | null = null;

  for (const [key, acc] of byKey) {
    const [yearStr, countType] = key.split("|");
    const year = Number(yearStr);
    timeline.push({
      year,
      countType,
      startDate: acc.startDate,
      endDate: acc.endDate,
    });

    if (!aadvByYear.has(year)) {
      aadvByYear.set(year, { bike: null, ped: null });
    }
    const cell = aadvByYear.get(year)!;
    if (countType === "bike") cell.bike = acc.allAadt;
    if (countType === "ped") cell.ped = acc.allAadt;

    if (acc.startDate && (!firstSurvey || acc.startDate < firstSurvey)) {
      firstSurvey = acc.startDate;
    }
    if (acc.endDate && (!lastSurvey || acc.endDate > lastSurvey)) {
      lastSurvey = acc.endDate;
    }
  }

  timeline.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return a.countType.localeCompare(b.countType);
  });

  return { timeline, aadvByYear, firstSurvey, lastSurvey };
}

function renderPopupHtml(args: {
  siteName: string;
  dataSource: string;
  periods: VolumeSiteAadtPeriod[];
  error?: string | null;
}): string {
  const { siteName, dataSource, periods, error } = args;

  const infoBlock = `
    <div style="margin-bottom: 12px;">
      <h4 style="margin: 0 0 6px 0; color: #333;">Site Information</h4>
      <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
        <tbody>
          <tr>
            <th style="padding: 2px 8px 2px 0; text-align: left; font-weight: 500; color: #666; width: 30%;">Location</th>
            <td style="padding: 2px 0; font-size: 13px;">${siteName}</td>
          </tr>
          <tr>
            <th style="padding: 2px 8px 2px 0; text-align: left; font-weight: 500; color: #666;">Data Source</th>
            <td style="padding: 2px 0; font-size: 13px;">${dataSource || "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  if (error) {
    return `
      <div style="padding: 8px 0;">
        ${infoBlock}
        <p style="margin: 0; color: #b91c1c; font-size: 12px;">${error}</p>
      </div>
    `;
  }

  if (periods.length === 0) {
    return `
      <div style="padding: 8px 0;">
        ${infoBlock}
        <p style="margin: 0; color: #999; font-style: italic; font-size: 12px;">
          No AADT summary available for this site yet.
        </p>
      </div>
    `;
  }

  const { timeline, aadvByYear, firstSurvey, lastSurvey } =
    collapsePeriods(periods);

  const bikeCount = timeline.filter((r) => r.countType === "bike").length;
  const pedCount = timeline.filter((r) => r.countType === "ped").length;
  const firstYear = firstSurvey
    ? new Date(firstSurvey).getFullYear()
    : "Unknown";
  const lastYear = lastSurvey ? new Date(lastSurvey).getFullYear() : "Unknown";
  const surveyRange =
    firstYear === lastYear ? `${firstYear}` : `${firstYear} - ${lastYear}`;

  const observationSummary: string[] = [];
  if (bikeCount > 0) {
    observationSummary.push(
      `🚲 ${bikeCount} biking year${bikeCount !== 1 ? "s" : ""}`
    );
  }
  if (pedCount > 0) {
    observationSummary.push(
      `👟 ${pedCount} walking year${pedCount !== 1 ? "s" : ""}`
    );
  }

  const timelineRows = timeline
    .map((row) => {
      const icon = row.countType === "bike" ? "🚲" : "👟";
      const label = row.countType === "bike" ? "Biking" : "Walking";
      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 6px 8px; font-weight: 500;">${row.year}</td>
          <td style="padding: 6px 8px; font-size: 12px;">${icon} ${label}</td>
          <td style="padding: 6px 8px; font-size: 11px; color: #666;">${formatPeriod(
            row.startDate,
            row.endDate
          )}</td>
        </tr>
      `;
    })
    .join("");

  const years = Array.from(aadvByYear.keys()).sort((a, b) => b - a);
  const aadtRows = years
    .map((year) => {
      const cell = aadvByYear.get(year)!;
      const bikeAADT =
        cell.bike != null && Number.isFinite(cell.bike)
          ? `${Math.round(cell.bike)}`
          : "-";
      const pedAADT =
        cell.ped != null && Number.isFinite(cell.ped)
          ? `${Math.round(cell.ped)}`
          : "-";
      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 4px 8px; font-weight: 500;">${year}</td>
          <td style="padding: 4px 8px; text-align: center;">${bikeAADT}</td>
          <td style="padding: 4px 8px; text-align: center;">${pedAADT}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="padding: 0; max-height: 700px; overflow-y: auto;">
      ${infoBlock}

      <div style="margin-bottom: 12px;">
        <h4 style="margin: 0 0 4px 0; color: #333;">Survey Summary</h4>
        <p style="margin: 0; font-size: 13px; color: #666;">
          <strong>${timeline.length}</strong> year/mode period${
            timeline.length !== 1 ? "s" : ""
          }
          from <strong>${surveyRange}</strong>
        </p>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #888;">
          ${observationSummary.join(" • ")}
        </p>
      </div>

      <div style="margin-bottom: 12px;">
        <h4 style="margin: 0 0 6px 0; color: #333;">Survey Timeline</h4>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
              <th style="padding: 4px 8px; text-align: left;">Year</th>
              <th style="padding: 4px 8px; text-align: left;">Mode</th>
              <th style="padding: 4px 8px; text-align: left;">Period</th>
            </tr>
          </thead>
          <tbody>
            ${timelineRows}
          </tbody>
        </table>
      </div>

      <div>
        <h4 style="margin: 0 0 6px 0; color: #333;">Average Annual Daily Volume (AADV)</h4>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
              <th style="padding: 4px 8px; text-align: left; font-weight: 600;">Year</th>
              <th style="padding: 4px 8px; text-align: center; font-weight: 600;">🚲 Biking</th>
              <th style="padding: 4px 8px; text-align: center; font-weight: 600;">👟 Walking</th>
            </tr>
          </thead>
          <tbody>
            ${aadtRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * ArcGIS popup for Data Query count survey sites.
 * Loads AADT rows from /api/volumes/sites/{id}/aadt (all_aadt) — not the Grit cache.
 */
export function createCountSurveySitePopupTemplate(): PopupTemplate {
  const content = new CustomContent({
    outFields: ["*"],
    creator: async (event) => {
      if (!event?.graphic) {
        return "No site data available.";
      }

      const attrs = event.graphic.attributes || {};
      const siteId = Number(attrs.id ?? attrs.OBJECTID);
      const siteName = String(attrs.name || `Site ${siteId}`);
      const dataSource = String(attrs.source || "");

      if (!Number.isFinite(siteId)) {
        return renderPopupHtml({
          siteName,
          dataSource,
          periods: [],
          error: "Missing site id.",
        });
      }

      try {
        const payload = await fetchVolumeSiteAadt(siteId);
        return renderPopupHtml({
          siteName: payload.name || siteName,
          dataSource: payload.source || dataSource,
          periods: payload.periods || [],
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load AADT summary.";
        return renderPopupHtml({
          siteName,
          dataSource,
          periods: [],
          error: message,
        });
      }
    },
  });

  return new PopupTemplate({
    title: "Count Site: {name}",
    content: [content],
  });
}
