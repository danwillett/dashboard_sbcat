/**
 * Field naming + bin constants for modeled AADT OGC views
 * (cos_{year}_{bike|ped} / str_{year}_{bike|ped}).
 */

export type ModeledVolumeModel = "cost-benefit" | "strava-bias";
export type ModeledVolumeCountType = "bike" | "ped";
export type ModeledVolumeBin = "High" | "Medium" | "Low";

export const MODELED_VOLUME_BINS: ModeledVolumeBin[] = [
  "High",
  "Medium",
  "Low",
];

export const MODELED_VOLUME_FIELD_RE =
  /^(cos|str)_(\d{4})_(bike|ped)$/i;

/** Fallback years when layer fields are not yet available. */
export function defaultYearsForModel(model: ModeledVolumeModel): number[] {
  return model === "strava-bias"
    ? [2023]
    : [2019, 2020, 2021, 2022, 2023];
}

export function modeledVolumeFieldPrefix(model: ModeledVolumeModel): "cos" | "str" {
  return model === "cost-benefit" ? "cos" : "str";
}

export function getModeledVolumeFieldName(options: {
  model: ModeledVolumeModel;
  year: number;
  countType: ModeledVolumeCountType;
}): string {
  return `${modeledVolumeFieldPrefix(options.model)}_${options.year}_${options.countType}`;
}

/** Discover years present on a layer (or GeoJSON property keys) for a model+mode. */
export function discoverModeledVolumeYears(
  fieldNames: Iterable<string>,
  model: ModeledVolumeModel,
  countType: ModeledVolumeCountType
): number[] {
  const prefix = modeledVolumeFieldPrefix(model);
  const years = new Set<number>();
  for (const name of fieldNames) {
    const match = MODELED_VOLUME_FIELD_RE.exec(name);
    if (!match) continue;
    if (match[1].toLowerCase() !== prefix) continue;
    if (match[3].toLowerCase() !== countType) continue;
    years.add(Number(match[2]));
  }
  const list = [...years].sort((a, b) => a - b);
  return list.length > 0 ? list : defaultYearsForModel(model);
}

export function buildModeledVolumeBinWhere(
  field: string,
  bins: ModeledVolumeBin[]
): string {
  if (bins.length === 0) {
    return "1=0";
  }
  if (bins.length >= MODELED_VOLUME_BINS.length) {
    return "1=1";
  }
  const quoted = bins.map((b) => `'${b}'`).join(",");
  return `${field} IN (${quoted})`;
}
