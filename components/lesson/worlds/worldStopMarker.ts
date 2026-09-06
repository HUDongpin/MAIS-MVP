type LessonWorldStopMarkerInput = {
  candidate: string | null | undefined;
  fallback: string;
  palette: readonly string[];
  stableKey: string;
};

const unicodeNumberPattern = new RegExp("\\p{Number}", "u");
const numericPictogramPattern = /[🔟🔢💯]/u;
const keycapCombiningMark = "\u20e3";
const ultimateFallbackMarker = "🌟";

function isNumericStopMarker(marker: string) {
  return (
    unicodeNumberPattern.test(marker) ||
    marker.includes(keycapCombiningMark) ||
    numericPictogramPattern.test(marker)
  );
}

function stablePaletteIndex(stableKey: string, paletteLength: number) {
  let hash = 2166136261;
  for (let index = 0; index < stableKey.length; index += 1) {
    hash ^= stableKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % paletteLength;
}

/**
 * Keeps curriculum emoji intact while preventing numeric wayfinding icons from
 * leaking into the world map. Replacement markers come from the grade band's
 * fixed palette, keyed by topic so the same unit never changes between renders.
 */
export function selectLessonWorldStopMarker({
  candidate,
  fallback,
  palette,
  stableKey
}: LessonWorldStopMarkerInput) {
  const normalizedCandidate = candidate?.trim() ?? "";
  if (normalizedCandidate && !isNumericStopMarker(normalizedCandidate)) {
    return normalizedCandidate;
  }

  const safePalette = palette.filter((marker) => marker.trim() && !isNumericStopMarker(marker));
  if (safePalette.length) {
    return safePalette[stablePaletteIndex(stableKey, safePalette.length)];
  }

  const normalizedFallback = fallback.trim();
  return normalizedFallback && !isNumericStopMarker(normalizedFallback)
    ? normalizedFallback
    : ultimateFallbackMarker;
}
