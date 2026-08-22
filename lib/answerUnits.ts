export const COMPACT_ANSWER_UNIT_SUFFIXES = [
  "cm^2",
  "cm2",
  "cm^3",
  "cm3",
  "cm",
  "ml",
  "l",
  "km/h",
  "kmh",
  "km",
  "°",
  "%"
] as const;

export const KNOWN_ANSWER_UNIT_WORDS = [
  "blocks",
  "buttons",
  "cards",
  "cm",
  "counters",
  "cubes",
  "degrees",
  "degree",
  "dollars",
  "items",
  "minutes",
  "pencils",
  "shells",
  "side",
  "sides",
  "stickers",
  "tiles",
  "units"
] as const;

const knownAnswerUnitWordSet = new Set<string>(KNOWN_ANSWER_UNIT_WORDS);
const escapedCompactSuffixes = [...COMPACT_ANSWER_UNIT_SUFFIXES]
  .sort((left, right) => right.length - left.length)
  .map((suffix) => suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const compactAnswerUnitSuffixPattern = new RegExp(
  `^(.*\\d)\\s*(?:${escapedCompactSuffixes.join("|")})$`,
  "i"
);

export function isKnownAttachedAnswerUnit(value: string) {
  return knownAnswerUnitWordSet.has(value.toLowerCase());
}

/**
 * Removes only supported trailing units while retaining interior whitespace.
 * Mixed numbers depend on the separator in `3 1/2`; compacting first changes
 * its value to `31/2`.
 */
export function stripAnswerUnitSuffixPreservingWhitespace(value: string) {
  let stripped = value.trim();

  for (;;) {
    const wordSuffix = stripped.match(/^(.*\S)\s+([a-z]+)$/i);
    if (!wordSuffix || !isKnownAttachedAnswerUnit(wordSuffix[2])) break;
    stripped = wordSuffix[1].trimEnd();
  }

  const compactSuffix = stripped.match(compactAnswerUnitSuffixPattern);
  return (compactSuffix?.[1] ?? stripped).trim();
}
