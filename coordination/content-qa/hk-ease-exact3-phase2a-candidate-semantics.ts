type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;
}

function normalizeExact3Text(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\\left|\\right/g, "")
    .replace(/\\[()]/g, "")
    .replace(/\$/g, "")
    .replace(/(\d+)\s*\\(?:d)?frac\s*\{(\d+)\}\s*\{(\d+)\}/g, "$1 $2/$3")
    .replace(/\\(?:d)?frac\s*\{(\d+)\}\s*\{(\d+)\}/g, "$1/$2")
    .replace(/[；]/g, ";")
    .replace(/[：]/g, ":")
    .replace(/[，、]/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function exactFractionRepresentation(value: string) {
  const normalized = normalizeExact3Text(value).trim();
  const mixed = normalized.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return `${mixed[1]} ${mixed[2]}/${mixed[3]}`;
  const fraction = normalized.match(/^(\d+)\s*\/\s*(\d+)$/);
  return fraction ? `${fraction[1]}/${fraction[2]}` : null;
}

function exactFractionRepresentationList(value: string) {
  const parts = normalizeExact3Text(value)
    .split(/\s*(?:,|\band\b|和)\s*/iu)
    .filter(Boolean);
  if (!parts.length) return null;
  const representations = parts.map(exactFractionRepresentation);
  return representations.every((item): item is string => item !== null)
    ? representations
    : null;
}

function exactUnorderedRepresentationsMatch(actual: string[] | null, expected: string[]) {
  return Boolean(
    actual &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    actual.every((item) => expected.includes(item))
  );
}

function matchNamedClassifiedGroups(params: JsonRecord, selectedAnswer: string) {
  const labels = stringArray(params.labels);
  const expectedGroups = Array.isArray(params.expectedOriginalRepresentationGroups)
    ? params.expectedOriginalRepresentationGroups.map(stringArray)
    : null;
  if (
    !labels ||
    labels.join("") !== "abc" ||
    !expectedGroups ||
    expectedGroups.length !== 3 ||
    expectedGroups.some((group) => !group || group.length !== 2)
  ) return false;
  const categoryNames = isRecord(params.categoryNames) ? params.categoryNames : null;
  const englishNames = categoryNames ? stringArray(categoryNames.en) : null;
  const chineseNames = categoryNames ? stringArray(categoryNames.zh) : null;
  if (
    !englishNames ||
    !chineseNames ||
    englishNames.join("\u0000") !==
      ["proper fractions", "improper fractions", "mixed numbers"].join("\u0000") ||
    chineseNames.join("\u0000") !== ["真分數", "假分數", "帶分數"].join("\u0000")
  ) return false;

  const normalized = normalizeExact3Text(selectedAnswer).replace(/[。.]$/, "").trim();
  const english = normalized.match(
    /^\(a\)\s*proper fractions\s*:\s*([\s\S]*?)\s*;\s*\(b\)\s*improper fractions\s*:\s*([\s\S]*?)\s*;\s*\(c\)\s*mixed numbers\s*:\s*([\s\S]*?)$/i
  );
  const chinese = normalized.match(
    /^\(a\)\s*真分數\s*:\s*([\s\S]*?)\s*;\s*\(b\)\s*假分數\s*:\s*([\s\S]*?)\s*;\s*\(c\)\s*帶分數\s*:\s*([\s\S]*?)$/
  );
  const groups = english ?? chinese;
  if (!groups) return false;
  return expectedGroups.every((expected, index) =>
    exactUnorderedRepresentationsMatch(
      exactFractionRepresentationList(groups[index + 1] ?? ""),
      expected as string[]
    )
  );
}

function exactBooleanToken(value: string, aliases: JsonRecord) {
  const normalized = normalizeExact3Text(value).trim();
  const trueAliases = stringArray(aliases.true);
  const falseAliases = stringArray(aliases.false);
  if (!trueAliases || !falseAliases) return null;
  const matches = (candidate: string) =>
    /^[A-Za-z]+$/.test(candidate)
      ? normalized.toLocaleLowerCase("en") === candidate.toLocaleLowerCase("en")
      : normalized === candidate;
  if (trueAliases.some(matches)) return true;
  if (falseAliases.some(matches)) return false;
  return null;
}

function booleanMatrix(value: unknown): boolean[][] | null {
  if (
    !Array.isArray(value) ||
    value.length !== 6 ||
    value.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== 3 ||
        row.some((item) => typeof item !== "boolean")
    )
  ) return null;
  return value as boolean[][];
}

function matchLabelledDivisibilityMatrix(params: JsonRecord, selectedAnswer: string) {
  const labels = stringArray(params.labels);
  const columns = params.columns;
  const expected = booleanMatrix(params.expectedBooleanMatrix);
  const aliases = isRecord(params.tokenAliases) ? params.tokenAliases : null;
  if (
    !labels ||
    labels.join("") !== "abcdef" ||
    !Array.isArray(columns) ||
    columns.length !== 3 ||
    columns[0] !== 2 ||
    columns[1] !== 5 ||
    columns[2] !== 10 ||
    !expected ||
    !aliases
  ) return false;
  const normalized = normalizeExact3Text(selectedAnswer).replace(/[。.]$/, "").trim();
  const match = normalized.match(
    /^\(a\)\s*:?\s*([^;\n]+)\s*(?:;|\n)\s*\(b\)\s*:?\s*([^;\n]+)\s*(?:;|\n)\s*\(c\)\s*:?\s*([^;\n]+)\s*(?:;|\n)\s*\(d\)\s*:?\s*([^;\n]+)\s*(?:;|\n)\s*\(e\)\s*:?\s*([^;\n]+)\s*(?:;|\n)\s*\(f\)\s*:?\s*([^;\n]+)$/
  );
  if (!match) return false;
  return expected.every((expectedRow, rowIndex) => {
    const tokens = (match[rowIndex + 1] ?? "").split(/\s*,\s*/);
    const decisions = tokens.map((token) => exactBooleanToken(token, aliases));
    return decisions.length === 3 && decisions.every(
      (decision, columnIndex) => decision === expectedRow[columnIndex]
    );
  });
}

/**
 * Candidate-only full semantic parser. Phase2A deliberately does not register
 * either kind with the production response-contract dispatcher.
 */
export function evaluateHongKongEaseExact3Phase2AContract(
  contract: JsonRecord,
  selectedAnswer: string
) {
  if (!isRecord(contract) || !isRecord(contract.params) || !selectedAnswer.trim()) return false;
  if (contract.kind === "exact3-named-classified-number-groups-v1") {
    return matchNamedClassifiedGroups(contract.params, selectedAnswer);
  }
  if (contract.kind === "exact3-labelled-divisibility-matrix-v1") {
    return matchLabelledDivisibilityMatrix(contract.params, selectedAnswer);
  }
  return false;
}
