import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import ClassBreaksRenderer from "@arcgis/core/renderers/ClassBreaksRenderer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";

function rendererFieldNames(renderer: __esri.Renderer | null | undefined): string[] {
  if (!renderer) return [];
  const fields: string[] = [];
  if (renderer.type === "unique-value") {
    const unique = renderer as UniqueValueRenderer;
    if (unique.field) fields.push(unique.field);
    if (unique.field2) fields.push(unique.field2);
    if (unique.field3) fields.push(unique.field3);
  } else if (renderer.type === "class-breaks") {
    const classBreaks = renderer as ClassBreaksRenderer;
    if (classBreaks.field) fields.push(classBreaks.field);
  }
  return fields;
}

function popupTemplateFieldNames(layer: FeatureLayer): string[] {
  const template = layer.popupTemplate;
  if (!template?.fieldInfos?.length) return [];
  return template.fieldInfos
    .map((info) => info.fieldName)
    .filter(
      (name): name is string =>
        !!name && name !== "expression" && !name.startsWith("expression/")
    );
}

/** Fields needed for symbology, popups, and explicit extras — not full attribute payloads. */
export function minimalFeatureLayerOutFields(
  layer: FeatureLayer,
  extraFields: string[] = []
): string[] {
  const validNames = new Set(layer.fields?.map((field) => field.name) ?? []);
  const wanted = new Set<string>();

  const oid = layer.objectIdField;
  if (oid && validNames.has(oid)) {
    wanted.add(oid);
  } else if (validNames.has("OBJECTID")) {
    wanted.add("OBJECTID");
  }

  for (const name of rendererFieldNames(layer.renderer)) {
    if (validNames.has(name)) wanted.add(name);
  }

  if (layer.displayField && validNames.has(layer.displayField)) {
    wanted.add(layer.displayField);
  }

  for (const name of popupTemplateFieldNames(layer)) {
    if (validNames.has(name)) wanted.add(name);
  }

  for (const name of extraFields) {
    if (validNames.has(name)) wanted.add(name);
  }

  return [...wanted];
}

function usesWideOutFields(outFields: string[] | null | undefined): boolean {
  return !outFields?.length || outFields.includes("*");
}

function isServerBackedFeatureLayer(layer: FeatureLayer): boolean {
  return !!layer.url;
}

/**
 * Trim FeatureServer tile payloads to symbology + popup fields.
 * Hosted layers still tile-query on pan; smaller payloads parse and draw faster,
 * and ArcGIS reuses fetched tiles when you pan back over the same area.
 */
export async function optimizeFeatureLayerTileQueries(
  layer: FeatureLayer,
  options?: { extraOutFields?: string[] }
): Promise<void> {
  await layer.load();
  if (!isServerBackedFeatureLayer(layer)) return;

  if (layer.labelsVisible && !layer.labelingInfo?.length) {
    layer.labelsVisible = false;
  }

  if (!usesWideOutFields(layer.outFields as string[])) return;

  const minimal = minimalFeatureLayerOutFields(
    layer,
    options?.extraOutFields ?? []
  );
  if (minimal.length === 0) return;

  layer.outFields = minimal;
}
