import { buildShapefileZipBase64 } from "@/lib/data-query-app/buildShapefileZip";
import { datedExportFilename } from "@/lib/utilities/shared/csvExport";
import { VolumeSite } from "@/lib/volume-app/siteTemporalQuery";
import { CountSurveyCsvExportResult } from "@/lib/data-query-app/exportCountSurveyCsv";

const SHAPEFILE_FIELD_MAX_LEN = 10;

function shapefileFieldName(name: string): string {
  return name.slice(0, SHAPEFILE_FIELD_MAX_LEN);
}

function downloadZipBase64(base64Zip: string, filename: string): void {
  const binary = atob(base64Zip);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/zip" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

export async function exportCountSurveyShapefile(
  sites: VolumeSite[]
): Promise<CountSurveyCsvExportResult> {
  if (sites.length === 0) {
    throw new Error("No survey sites match the current filters.");
  }

  const features = sites
    .filter((site) => site.lon != null && site.lat != null)
    .map((site) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point",
        coordinates: [site.lon as number, site.lat as number],
      },
      properties: {
        [shapefileFieldName("site_id")]: site.id,
        [shapefileFieldName("site_name")]: site.name ?? "",
        [shapefileFieldName("site_source")]: site.source ?? "",
      },
    }));

  if (features.length === 0) {
    throw new Error("No site locations available for shapefile export.");
  }

  const zipBase64 = await buildShapefileZipBase64(
    { type: "FeatureCollection", features },
    "count-survey-sites"
  );

  const filename = datedExportFilename("count-survey-sites", "zip");
  downloadZipBase64(zipBase64, filename);

  return {
    rowCount: features.length,
    truncated: false,
    filename,
  };
}
