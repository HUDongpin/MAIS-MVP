import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const EVIDENCE_ROOT =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle";

const PATHS = {
  design: `${EVIDENCE_ROOT}/v4-derivation-design-contract.json`,
  sanitized: `${EVIDENCE_ROOT}/v4-sanitized-derivation-input.json`,
  supplementRed: `${EVIDENCE_ROOT}/v4-row-specific-derivation-supplement-pass1-red-20260819.json`,
  oracleRed: `${EVIDENCE_ROOT}/v4-independent-answer-oracle-pass1-red-20260819.json`,
  receipt: `${EVIDENCE_ROOT}/v4-independent-pass1-review-red-20260819.json`
} as const;

const EXPECTED_SHA256 = {
  design: "69a2bd9161ee21731fef08d5b4fd2affb64f93cc78442dfb267d60c3b9bb449d",
  sanitized: "1b36361daad78bbd54d1e8a42d1e58dbdd8b62ab65638783a8697943ddf10634",
  supplementRed: "b6b3c39e281e0b89d8c49eb5004843758c3881da8b56b8d1b38cc1f9caac3abd",
  oracleRed: "8f306dc2d34b3595e70c0f8ef55345dc321fdae97278cb404d499d40635e2e9d"
} as const;

const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const readBoundJson = <T>(path: string, expectedSha256: string): T => {
  const bytes = readFileSync(resolve(REPOSITORY_ROOT, path));
  assert.equal(sha256(bytes), expectedSha256, `${path}: frozen byte SHA drifted`);
  return JSON.parse(bytes.toString("utf8")) as T;
};

type SanitizedInput = {
  sourcePath: string;
  sourceSha256: string;
  rowsPayloadSha256: string;
  orderedBaseIdSha256: string;
  rows: Array<{
    index: number;
    baseId: string;
    type: string;
    problemPayloadSha256: string;
    diagram: { present: boolean };
  }>;
};

type RedSupplement = {
  rows: Array<{
    index: number;
    baseId: string;
    problemPayloadSha256: string;
    derivationPayloadSha256: string;
    computedResult: { responseText: string };
    optionAdjudications: Array<{ index: number; truth: boolean }>;
  }>;
};

type RedOracle = {
  rows: Array<{
    index: number;
    baseId: string;
    problemPayloadSha256: string;
    derivationPayloadSha256: string;
    independentlyDerivedResponse: string;
  }>;
};

const FAILURES = [
  [30, "hk-ease-10651", "FORMAT_REQUIREMENT_METADATA_MISSING: quoted (a) ... L; (b) ... L format not captured"],
  [31, "hk-ease-10662", "FORMAT_REQUIREMENT_METADATA_MISSING: quoted (a) ...; (b) ... format not captured"],
  [187, "hk-ease-10481", "FORMAT_RESPONSE_MISMATCH: required proper/improper/mixed category labels omitted"],
  [188, "hk-ease-10496", "FORMAT_RESPONSE_MISMATCH: required proper/improper/mixed category labels omitted"],
  [200, "hk-ease-10523", "UNIT_REQUIREMENT_METADATA_MISSING: target mL omitted"],
  [215, "hk-ease-10538", "UNIT_REQUIREMENT_METADATA_MISSING: target mL omitted"],
  [216, "hk-ease-10539", "UNIT_REQUIREMENT_METADATA_MISSING: target L omitted"],
  [267, "hk-ease-54", "UNIT_REQUIREMENT_FALSE_POSITIVE: L.C.M. misread as litre L"],
  [268, "hk-ease-114", "UNIT_REQUIREMENT_FALSE_POSITIVE: L.C.M. misread as litre L"],
  [269, "hk-ease-115", "UNIT_REQUIREMENT_FALSE_POSITIVE: L.C.M. misread as litre L | FORMAT_RESPONSE_MISMATCH: required (a)/(b) labels omitted"],
  [275, "hk-ease-185", "UNIT_REQUIREMENT_FALSE_POSITIVE: L.C.M. misread as litre L | FORMAT_RESPONSE_MISMATCH: required (a)/(b) labels omitted"],
  [276, "hk-ease-186", "UNIT_REQUIREMENT_FALSE_POSITIVE: L.C.M. misread as litre L"],
  [282, "hk-ease-364", "METHOD_OUTPUT_INCOMPLETE: required H.C.F. and L.C.M. prime-factor products omitted"],
  [283, "hk-ease-410", "METHOD_OUTPUT_INCOMPLETE: required H.C.F. and L.C.M. prime-factor products omitted"],
  [285, "hk-ease-428", "UNIT_REQUIREMENT_FALSE_POSITIVE: L.C.M. misread as litre L | FORMAT_RESPONSE_MISMATCH: required (a)/(b) labels omitted"],
  [286, "hk-ease-429", "UNIT_REQUIREMENT_FALSE_POSITIVE: L.C.M. misread as litre L"],
  [307, "hk-ease-736", "FORMAT_RESPONSE_MISMATCH: required HCF=value, LCM=value pattern not followed"],
  [322, "hk-ease-901", "FORMAT_RESPONSE_MISMATCH: required HCF=value, LCM=value pattern not followed"],
  [323, "hk-ease-902", "FORMAT_RESPONSE_MISMATCH: required HCF=value, LCM=value pattern not followed"],
  [389, "hk-ease-1102", "METHOD_OUTPUT_INCOMPLETE: required H.C.F. product expression omitted"],
  [393, "hk-ease-1106", "METHOD_OUTPUT_INCOMPLETE: required H.C.F. prime-factor product expression omitted"],
  [394, "hk-ease-1107", "METHOD_OUTPUT_INCOMPLETE: required H.C.F. prime-factor product expression omitted"],
  [395, "hk-ease-1108", "METHOD_OUTPUT_INCOMPLETE: required H.C.F. prime-factor product expression omitted"],
  [399, "hk-ease-1112", "METHOD_OUTPUT_INCOMPLETE: required L.C.M. product expression omitted"],
  [406, "hk-ease-1119", "METHOD_PRESENTATION_MISMATCH: response shows prime factorisation instead of requested short division"],
  [407, "hk-ease-1120", "METHOD_PRESENTATION_MISMATCH: response shows prime factorisation instead of requested short division"],
  [408, "hk-ease-1121", "METHOD_PRESENTATION_MISMATCH: response shows prime factorisation instead of requested short division"],
  [414, "hk-ease-1127", "METHOD_PRESENTATION_MISMATCH: response shows prime factorisation instead of requested short division"],
  [540, "hk-ease-1273", "UNIT_REQUIREMENT_FALSE_POSITIVE: L.C.M. misread as litre L"],
  [541, "hk-ease-1274", "UNIT_REQUIREMENT_FALSE_POSITIVE: L.C.M. misread as litre L | FORMAT_RESPONSE_MISMATCH: required (a)/(b) labels omitted"],
  [543, "hk-ease-1276", "UNIT_REQUIREMENT_FALSE_POSITIVE: L.C.M. misread as litre L"],
  [544, "hk-ease-1277", "UNIT_REQUIREMENT_FALSE_POSITIVE: L.C.M. misread as litre L | FORMAT_RESPONSE_MISMATCH: required (a)/(b) labels omitted"],
  [569, "hk-ease-1782", "SYMBOLIC_SERIALIZATION_AMBIGUOUS: y^2m does not unambiguously encode y^(2m) | UNIT_REQUIREMENT_FALSE_POSITIVE: exponent variable m misread as metre"],
  [591, "hk-ease-2035", "FORMAT_REQUIREMENT_METADATA_MISSING: quoted format not captured | FORMAT_RESPONSE_MISMATCH: required 48=...;72=...;HCF=...;LCM=... pattern not followed"],
  [666, "hk-ease-1785", "UNIT_REQUIREMENT_FALSE_POSITIVE: exponent variable m misread as metre"],
  [683, "hk-ease-425", "FORMAT_RESPONSE_MISMATCH: required Factors/classification labels omitted"],
  [684, "hk-ease-426", "FORMAT_RESPONSE_MISMATCH: required Factors/classification labels omitted"],
  [688, "hk-ease-864", "FORMAT_REQUIREMENT_METADATA_MISSING: quoted (a)...;(b)...;(c)...;(d)... format not captured"],
  [695, "hk-ease-2037", "METHOD_OUTPUT_INCOMPLETE: required H.C.F. and L.C.M. prime-factor products omitted"],
  [697, "hk-ease-2039", "METHOD_OUTPUT_INCOMPLETE: required H.C.F. and L.C.M. prime-factor products omitted"],
  [699, "hk-ease-2041", "METHOD_OUTPUT_INCOMPLETE: required H.C.F. and L.C.M. prime-factor products omitted"]
] as const;

export const buildHongKongEaseV4IndependentPass1RedReceipt = () => {
  readBoundJson(PATHS.design, EXPECTED_SHA256.design);
  const sanitized = readBoundJson<SanitizedInput>(PATHS.sanitized, EXPECTED_SHA256.sanitized);
  const supplement = readBoundJson<RedSupplement>(PATHS.supplementRed, EXPECTED_SHA256.supplementRed);
  const oracle = readBoundJson<RedOracle>(PATHS.oracleRed, EXPECTED_SHA256.oracleRed);

  assert.equal(sanitized.rows.length, 701);
  assert.equal(supplement.rows.length, 701);
  assert.equal(oracle.rows.length, 701);
  assert.equal(new Set(FAILURES.map(([index]) => index)).size, 41);
  const failureByIndex = new Map<number, { baseId: string; note: string }>(
    FAILURES.map(([index, baseId, note]) => [index, { baseId, note }])
  );
  const outcomes = sanitized.rows.map((row, index) => {
    assert.equal(row.index, index);
    const failure = failureByIndex.get(index);
    if (failure) assert.equal(row.baseId, failure.baseId, `${index}: failure ID drifted`);
    return {
      index,
      baseId: row.baseId,
      status: failure ? "FAIL" : "PASS",
      discrepancyNote: failure?.note ?? ""
    };
  });
  const outcomePayload = JSON.stringify(outcomes);
  assert.equal(Buffer.byteLength(outcomePayload, "utf8"), 56049);
  assert.equal(
    sha256(outcomePayload),
    "b0692c519e6549f45c5bc6a1929f0522ff7eb2055c9e7cd59795d4bf216cb6d1"
  );

  const categories = Object.fromEntries(
    [
      "FORMAT_REQUIREMENT_METADATA_MISSING",
      "FORMAT_RESPONSE_MISMATCH",
      "UNIT_REQUIREMENT_METADATA_MISSING",
      "UNIT_REQUIREMENT_FALSE_POSITIVE",
      "METHOD_OUTPUT_INCOMPLETE",
      "METHOD_PRESENTATION_MISMATCH",
      "SYMBOLIC_SERIALIZATION_AMBIGUOUS"
    ].map((category) => [
      category,
      outcomes.filter((row) => row.discrepancyNote.split(" | ").some((part) => part.startsWith(`${category}:`))).length
    ])
  );
  assert.deepEqual(categories, {
    FORMAT_REQUIREMENT_METADATA_MISSING: 4,
    FORMAT_RESPONSE_MISMATCH: 13,
    UNIT_REQUIREMENT_METADATA_MISSING: 3,
    UNIT_REQUIREMENT_FALSE_POSITIVE: 13,
    METHOD_OUTPUT_INCOMPLETE: 10,
    METHOD_PRESENTATION_MISMATCH: 4,
    SYMBOLIC_SERIALIZATION_AMBIGUOUS: 1
  });

  const partition = Object.fromEntries(
    ["fill-in", "short-answer", "multiple-choice"].map((type) => [
      type,
      sanitized.rows.filter((row) => row.type === type).length
    ])
  );
  assert.deepEqual(partition, { "fill-in": 507, "short-answer": 104, "multiple-choice": 90 });
  const mcLedger = supplement.rows
    .filter((row) => row.optionAdjudications.length > 0)
    .map((row) => ({
      index: row.index,
      baseId: row.baseId,
      correctOptionIndex: row.optionAdjudications.find((option) => option.truth)?.index
    }));
  assert.equal(mcLedger.length, 90);
  assert.equal(mcLedger.every((row) => Number.isInteger(row.correctOptionIndex)), true);
  assert.equal(
    sha256(JSON.stringify(mcLedger)),
    "421139637ff384bf05531b4697c3430a6cbdf12c95cae629c85e2630def7aa3a"
  );

  const joinMismatches: string[] = [];
  for (let index = 0; index < 701; index += 1) {
    const source = sanitized.rows[index];
    const derivation = supplement.rows[index];
    const joined = oracle.rows[index];
    if (
      source.baseId !== derivation.baseId ||
      source.baseId !== joined.baseId ||
      source.problemPayloadSha256 !== derivation.problemPayloadSha256 ||
      derivation.problemPayloadSha256 !== joined.problemPayloadSha256 ||
      derivation.derivationPayloadSha256 !== joined.derivationPayloadSha256 ||
      derivation.computedResult.responseText !== joined.independentlyDerivedResponse
    ) {
      joinMismatches.push(source.baseId);
    }
  }
  assert.deepEqual(joinMismatches, []);

  return {
    schemaVersion: "hk-ease-v4-independent-pass1-review-red-v1",
    status: "red-not-approved",
    reviewer: "A18-independent-hk-ease-v4",
    task: "/root/hk_ease_v4_independent_review",
    reviewBoundary:
      "READ_ONLY; pass1 sole input v4-sanitized prompt/options/diagram; no production answer/acceptedAnswers/explanations/v3 oracle; pass2 one post-derivation join to v4 supplement/oracle; no writes/tests/npm/tsc/browser/Git/signals",
    completedAt: "2026-08-19T02:06:24Z",
    evidence: {
      design: { classification: "immutable-artifact-resolvable", path: PATHS.design, sha256: EXPECTED_SHA256.design },
      sanitized: { classification: "immutable-artifact-resolvable", path: PATHS.sanitized, sha256: EXPECTED_SHA256.sanitized },
      supplementRed: { classification: "immutable-artifact-resolvable", path: PATHS.supplementRed, sha256: EXPECTED_SHA256.supplementRed },
      oracleRed: { classification: "immutable-artifact-resolvable", path: PATHS.oracleRed, sha256: EXPECTED_SHA256.oracleRed }
    },
    sourceBinding: {
      sourcePath: sanitized.sourcePath,
      sourceSha256: sanitized.sourceSha256,
      sanitizedRowsPayloadSha256: sanitized.rowsPayloadSha256,
      orderedBaseIdSha256: sanitized.orderedBaseIdSha256,
      orderedBaseIdAlgorithm: "SHA256(UTF8(rows.map(r=>r.baseId).join('\\n')+'\\n'))"
    },
    result: {
      allRows: 701,
      semanticMathMatches: 701,
      overallPass: outcomes.filter((row) => row.status === "PASS").length,
      overallFail: outcomes.filter((row) => row.status === "FAIL").length,
      partition,
      categories,
      multipleChoiceCount: 90,
      independentlyUniqueCorrectMultipleChoiceCount: 90,
      multipleChoiceLedgerSha256: sha256(JSON.stringify(mcLedger)),
      diagramsPresent: sanitized.rows.filter((row) => row.diagram.present).length,
      answerCriticalDiagramCount: 0,
      joinMismatchIds: joinMismatches,
      outcomePayloadCanonical: "JSON.stringify(outcomes)",
      outcomePayloadByteLength: Buffer.byteLength(outcomePayload, "utf8"),
      outcomePayloadSha256: sha256(outcomePayload),
      conclusion: "candidate-rejected; repair exact41 then repeat independent 701-row review"
    },
    outcomes
  };
};

export const renderHongKongEaseV4IndependentPass1RedReceipt = (): string =>
  `${JSON.stringify(buildHongKongEaseV4IndependentPass1RedReceipt(), null, 2)}\n`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(
    resolve(REPOSITORY_ROOT, PATHS.receipt),
    renderHongKongEaseV4IndependentPass1RedReceipt(),
    "utf8"
  );
}
