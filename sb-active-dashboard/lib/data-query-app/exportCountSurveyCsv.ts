import {
  datedExportFilename,
  downloadCsv,
  rowsToCsv,
} from "@/lib/utilities/shared/csvExport";
import { fetchVolumeAadtPeriods } from "@/lib/data-services/VolumeSitesApiService";
import { VolumeSite, VolumeSiteQueryFilters } from "@/lib/volume-app/siteTemporalQuery";

export const COUNT_SURVEY_EXPORT_HEADERS = [
  "site_id",
  "site_name",
  "site_source",
  "latitude",
  "longitude",
  "year",
  "start_date",
  "end_date",
  "count_type",
  "all_aadt",
  "weekday_aadt",
  "weekend_aadt",
] as const;

export interface CountSurveyCsvExportResult {
  rowCount: number;
  truncated: boolean;
  filename: string;
}

export async function exportCountSurveyCsv(
  sites: VolumeSite[],
  siteFilters: VolumeSiteQueryFilters,
  options?: { maxPeriods?: number }
): Promise<CountSurveyCsvExportResult> {
  if (sites.length === 0) {
    throw new Error("No survey sites match the current filters.");
  }

  const siteById = new Map(sites.map((site) => [site.id, site]));
  const { periods, truncated } = await fetchVolumeAadtPeriods(
    siteFilters,
    sites.map((site) => site.id),
    { limit: options?.maxPeriods ?? 15000 }
  );

  const rows = periods.map((period) => {
    const site = siteById.get(period.site_id);
    return [
      period.site_id,
      site?.name ?? "",
      site?.source ?? period.source ?? "",
      site?.lat ?? "",
      site?.lon ?? "",
      period.year ?? "",
      period.start_date ?? "",
      period.end_date ?? "",
      period.count_type ?? "",
      period.all_aadt ?? "",
      period.weekday_aadt ?? "",
      period.weekend_aadt ?? "",
    ];
  });

  if (rows.length === 0) {
    throw new Error("No survey periods match the current filters.");
  }

  const csv = rowsToCsv([...COUNT_SURVEY_EXPORT_HEADERS], rows);
  const filename = datedExportFilename("count-surveys-filtered");
  downloadCsv(filename, csv);

  return {
    rowCount: rows.length,
    truncated,
    filename,
  };
}
