/**
 * H3 resolution LOD for modeled hexagon volumes.
 * Coarser cells at overview zoom; finer as the user zooms in.
 * Res 11 is not shown in the app — zoom ≥ {@link MODELED_HEX_TO_SEGMENT_ZOOM}
 * switches to network segments instead.
 */

export const MODELED_HEX_RESOLUTIONS = [9, 10, 11] as const;
export type ModeledHexResolution = (typeof MODELED_HEX_RESOLUTIONS)[number];

/** Minimum map zoom before loading hexagon features (res 9 overview). */
export const MODELED_HEX_MIN_ZOOM = 9;

/** At this zoom and above, hexagon mode auto-switches to network segments. */
export const MODELED_HEX_TO_SEGMENT_ZOOM = 16;

/**
 * Map ArcGIS MapView zoom → preferred H3 resolution.
 * - zoom < 14 → 9 (full county)
 * - else → 10 (viewport); segments take over at {@link MODELED_HEX_TO_SEGMENT_ZOOM}
 */
export function hexResolutionForZoom(zoom: number): ModeledHexResolution {
  if (zoom < 14) return 9;
  return 10;
}

/**
 * Res 9 is small enough (~20–25k cells) to load the full county once.
 * Res 10/11 stay viewport-clipped (with padding for smoother pan).
 */
export function loadsFullHexCollection(
  resolution: ModeledHexResolution
): boolean {
  return resolution === 9;
}

/**
 * Expand the visible bbox so neighboring hexes load before they enter view.
 * Ratio is applied on each side (1.0 ≈ 3× visible width/height total).
 */
export function viewportBboxPadRatio(
  resolution: ModeledHexResolution | null
): number {
  if (resolution === 10) return 1.5;
  if (resolution === 11) return 0.5;
  return 0.25;
}

/**
 * Inset when testing whether the visible extent is still inside loaded coverage.
 * Smaller = tolerate panning closer to the edge before refetching.
 */
export function viewportBboxContainMargin(
  resolution: ModeledHexResolution | null
): number {
  if (resolution === 10) return 0.03;
  if (resolution === 11) return 0.06;
  return 0.08;
}

/** Per-request feature cap for a viewport fetch (cache can grow larger). */
export function viewportFetchMaxFeatures(
  resolution: ModeledHexResolution | null
): number {
  if (resolution === 10) return 12000;
  return 8000;
}

/** Viewport padding for network segments (no H3 LOD). */
export function segmentViewportBboxPadRatio(): number {
  return 0.75;
}

export function segmentViewportContainMargin(): number {
  return 0.03;
}

export function segmentFetchMaxFeatures(): number {
  return 10000;
}

/**
 * OGC collection id for a model×mode hexagon leaf at one H3 resolution.
 * Uses resolution-scoped SQL views (`…_r9` / `_r10` / `_r11`) so featureserv
 * does not scan the all-resolutions pivot.
 */
export function hexagonLodCollectionId(
  baseHexagonCollection: string,
  resolution: ModeledHexResolution
): string {
  return `${baseHexagonCollection}_r${resolution}`;
}

/** CQL-ish property filter accepted by pg_featureserv (legacy all-res views). */
export function hexResolutionFilter(resolution: ModeledHexResolution): string {
  return `resolution=${resolution}`;
}
