import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { CatalogDataset } from "@/lib/data-services/CatalogApiService";
import { createLayerForCatalogDataset } from "@/lib/data-query-app/catalogLayerFactory";
import {
  ACS_GEO_TYPE_FIELD,
  equityGeographyUnitGeoTypeValue,
} from "@/lib/infrastructure-equity-app/infrastructureEquityCatalog";

export interface DemographicsGeographySupport {
  tract: boolean;
  blockGroup: boolean;
}

export function isTractOnlyDemographicsSupport(
  support: DemographicsGeographySupport | null | undefined
): boolean {
  if (!support) return false;
  return support.tract && !support.blockGroup;
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

export async function detectDemographicsGeographySupport(
  dataset: CatalogDataset
): Promise<DemographicsGeographySupport> {
  const layer = (await createLayerForCatalogDataset(dataset)) as FeatureLayer;
  await layer.load();

  const fields = layer.fields ?? [];
  const geoTypeField = fields.some((field) => field.name === ACS_GEO_TYPE_FIELD)
    ? ACS_GEO_TYPE_FIELD
    : fields.some((field) => field.name === ACS_GEO_TYPE_FIELD.toUpperCase())
      ? ACS_GEO_TYPE_FIELD.toUpperCase()
      : null;
  if (!geoTypeField) {
    return { tract: true, blockGroup: true };
  }

  const tractValue = equityGeographyUnitGeoTypeValue("tract");
  const blockValue = equityGeographyUnitGeoTypeValue("block");
  if (!tractValue || !blockValue) {
    return { tract: true, blockGroup: false };
  }

  const tractQuery = layer.createQuery();
  tractQuery.where = `${geoTypeField} = '${escapeSqlLiteral(tractValue)}'`;
  tractQuery.returnGeometry = false;

  const blockQuery = layer.createQuery();
  blockQuery.where = `${geoTypeField} = '${escapeSqlLiteral(blockValue)}'`;
  blockQuery.returnGeometry = false;

  const [tractCount, blockCount] = await Promise.all([
    layer.queryFeatureCount(tractQuery),
    layer.queryFeatureCount(blockQuery),
  ]);

  return {
    tract: tractCount > 0,
    blockGroup: blockCount > 0,
  };
}

function combineWhereClauses(...clauses: string[]): string {
  const parts = clauses
    .map((clause) => clause.trim())
    .filter((clause) => clause && clause !== "1=1");
  if (parts.length === 0) return "1=1";
  return parts.join(" AND ");
}

/** Whether each indicator has non-null values at block-group geography. */
export async function detectDemographicsIndicatorBlockGroupSupport(
  dataset: CatalogDataset,
  fieldNames: string[]
): Promise<Record<string, boolean>> {
  const layer = (await createLayerForCatalogDataset(dataset)) as FeatureLayer;
  await layer.load();

  const fields = layer.fields ?? [];
  const geoTypeField = fields.some((field) => field.name === ACS_GEO_TYPE_FIELD)
    ? ACS_GEO_TYPE_FIELD
    : fields.some((field) => field.name === ACS_GEO_TYPE_FIELD.toUpperCase())
      ? ACS_GEO_TYPE_FIELD.toUpperCase()
      : null;

  const blockValue = equityGeographyUnitGeoTypeValue("block");
  const blockWhere =
    geoTypeField && blockValue
      ? `${geoTypeField} = '${escapeSqlLiteral(blockValue)}'`
      : "1=1";

  const support: Record<string, boolean> = {};
  const uniqueFields = [...new Set(fieldNames.filter(Boolean))];

  await Promise.all(
    uniqueFields.map(async (fieldName) => {
      const query = layer.createQuery();
      query.where = combineWhereClauses(blockWhere, `${fieldName} IS NOT NULL`);
      query.returnGeometry = false;
      const count = await layer.queryFeatureCount(query);
      support[fieldName] = count > 0;
    })
  );

  return support;
}
