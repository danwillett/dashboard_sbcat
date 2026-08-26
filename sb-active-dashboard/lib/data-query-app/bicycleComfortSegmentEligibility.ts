import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

/**
 * Exclude parking lots, driveways, and other segments with no street name
 * and no comfort class from equity infrastructure metrics.
 */
export function buildBicycleComfortEligibleSegmentsWhereClause(
  layer?: FeatureLayer
): string {
  const fields = layer?.fields ?? [];
  const hasName = fields.some((field) => field.name === "name");
  const hasComfortClass = fields.some((field) => field.name === "comfort_class");

  if (!hasName && !hasComfortClass) {
    return "1=1";
  }

  if (!hasName) {
    return "(comfort_class IS NOT NULL AND comfort_class <> '')";
  }

  if (!hasComfortClass) {
    return "(name IS NOT NULL AND name <> '')";
  }

  return (
    "NOT ((name IS NULL OR name = '') AND (comfort_class IS NULL OR comfort_class = ''))"
  );
}

export function combineSqlWhereClauses(...clauses: string[]): string {
  const parts = clauses
    .map((clause) => clause.trim())
    .filter((clause) => clause && clause !== "1=1");
  if (parts.length === 0) return "1=1";
  return parts.join(" AND ");
}
