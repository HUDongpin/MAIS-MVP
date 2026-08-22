import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS,
  HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS,
  resolveHongKongEaseExact3Exact26FrozenCoordinate,
  resolveHongKongEaseExact3ImmutablePreimage
} from "./hk-ease-exact3-immutable-preimage-relocation";
import { evaluateHongKongEaseExact3Phase2AContract } from
  "./hk-ease-exact3-phase2a-candidate-semantics";

type JsonRecord = Record<string, any>;

const BUILDER_PATH = "coordination/content-qa/build-hk-ease-exact3-phase2a-candidate.ts";
const FOCUSED_TEST_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2a-candidate.test.ts";
const SEMANTICS_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2a-candidate-semantics.ts";
const RELOCATION_PATH =
  "coordination/content-qa/hk-ease-exact3-immutable-preimage-relocation.ts";
const STEP0_MATERIALIZER_PATH =
  "coordination/content-qa/materialize-hk-ease-exact3-step0-immutable-preimages.ts";
const CANDIDATE_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2a-candidate";
const QUESTION_OUTPUT_PATH = `${CANDIDATE_DIRECTORY}/question-successor-rows-v1.json`;
const CONTRACT_OUTPUT_PATH =
  `${CANDIDATE_DIRECTORY}/strict-response-contract-successor-rows-v1.json`;
const AUDIT_OUTPUT_PATH =
  `${CANDIDATE_DIRECTORY}/response-contract-audit-successor-rows-v1.json`;
const HISTORY_OUTPUT_PATH = `${CANDIDATE_DIRECTORY}/v3-history-v1.json`;
const VERSION_OUTPUT_PATH = `${CANDIDATE_DIRECTORY}/version-manifest-delta-v1.json`;
const AUTHORITY_OUTPUT_PATH = `${CANDIDATE_DIRECTORY}/candidate-authority-v1.json`;

export const HK_EASE_EXACT3_PHASE2A_OUTPUT_PATHS = [
  QUESTION_OUTPUT_PATH,
  CONTRACT_OUTPUT_PATH,
  AUDIT_OUTPUT_PATH,
  HISTORY_OUTPUT_PATH,
  VERSION_OUTPUT_PATH,
  AUTHORITY_OUTPUT_PATH
] as const;

const PHASE1_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimage-v1.json";
const PHASE1_SHA256 = "8c087e024d184f92e1a6a51798cdb5f9ae3ddcff7dbc15e7ec65bb0fe1c2b608";
const STEP0_RECEIPT_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/step0-immutable-preimage-relocation-v1.json";
const STEP0_RECEIPT_SHA256 =
  "9d661d739710a72c9a4744e224f221ffe808632dacb12b63d49c39fe4886262e";
const V2_HISTORY_PATH = "data/historical/hongKongQuestions-hk-ease-39847.json";
const V2_HISTORY_SHA256 =
  "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1";

const QUESTION_PACK_LOGICAL_PATH =
  "data/generated-content/hk-ease-practice-bank-v2/question-pack.json";
const CONTRACTS_LOGICAL_PATH =
  "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json";
const AUDIT_LOGICAL_PATH =
  "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json";
const VERSION_LOGICAL_PATH = "data/historical/hongKongQuestionVersionManifest.json";
const V4_RUNTIME_PREDECESSOR_SHA256 =
  "697c62f2433bf03ca0d9296dd66a90e441fed22a904f55ca2cdb074f49ffa2c1";
const V4_RUNTIME_SUCCESSOR_SHA256 =
  "11c46a9ed03fe592065db05e579165c9a5bf65a660be948d6d582cf10dd5be8c";
const V4_RUNTIME_SUCCESSOR_AUTHORITY_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-runtime-successor-provenance/v4-runtime-successor-authority-v1.json";
const V4_RUNTIME_SUCCESSOR_AUTHORITY_SHA256 =
  "4feebefec120b2c227a913a22f517496170604903fcbfe452a0a7578f6e706fa";

function unchangedForbiddenLiveEntry(
  path: string,
  observedSha256: string,
  disposition = "unchanged-by-phase2a-candidate-creation"
) {
  return {
    path,
    preMaterializationObservedSha256: observedSha256,
    observedSha256,
    postMaterializationObservedSha256: observedSha256,
    candidateBuilderWriteTarget: false,
    candidateWriteAuthorized: false,
    disposition
  };
}

const FORBIDDEN_LIVE_INVENTORY_ENTRIES = [
  unchangedForbiddenLiveEntry(
    QUESTION_PACK_LOGICAL_PATH,
    "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2"
  ),
  unchangedForbiddenLiveEntry(
    CONTRACTS_LOGICAL_PATH,
    "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4"
  ),
  unchangedForbiddenLiveEntry(
    AUDIT_LOGICAL_PATH,
    "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28"
  ),
  unchangedForbiddenLiveEntry(
    VERSION_LOGICAL_PATH,
    "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92"
  ),
  unchangedForbiddenLiveEntry(
    "data/questions.ts",
    "96d90f3c090b14bd7797155ffcbb20edcbf2230147a945f6c02ec32a470dbca8"
  ),
  unchangedForbiddenLiveEntry(
    "data/hongKongEasePracticeQuestions.ts",
    "01bf8aef5f76dfa46d17b357b110957fa551ba12fd98027315a1a8e825f40137"
  ),
  unchangedForbiddenLiveEntry(
    "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle-v4.json",
    "8f306dc2d34b3595e70c0f8ef55345dc321fdae97278cb404d499d40635e2e9d"
  ),
  {
    ...unchangedForbiddenLiveEntry(
      "lib/hongKongEaseIndependentOracleV4.ts",
      V4_RUNTIME_SUCCESSOR_SHA256,
      "external-concurrent-drift-never-a-candidate-input-or-write"
    ),
    externalConcurrentDrift: {
      classification: "external-concurrent-drift-never-a-candidate-input-or-write",
      historicalPredecessorSha256: V4_RUNTIME_PREDECESSOR_SHA256,
      observedSuccessorSha256: V4_RUNTIME_SUCCESSOR_SHA256,
      successorAuthority: {
        path: V4_RUNTIME_SUCCESSOR_AUTHORITY_PATH,
        sha256: V4_RUNTIME_SUCCESSOR_AUTHORITY_SHA256
      },
      candidateAdoptionPolicy:
        "not-adopted-by-candidate-handled-only-by-successor-authority"
    }
  },
  unchangedForbiddenLiveEntry(
    "lib/hongKongEaseIndependentOracleV4.test.ts",
    "cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472"
  ),
  unchangedForbiddenLiveEntry(
    "lib/server/hongKongEaseResponseContracts.ts",
    "1ebefbb799f3f5b64f57ae9beff0f5641939eb5ea6f81aa93f5fe9fc21def3f1"
  ),
  unchangedForbiddenLiveEntry(
    "lib/fullQuestionBankSolvability.test.ts",
    "f964d1f2d11dbd5eeb8c1ebf2aea5a3bdf73d73189ed511fa68dc09d2ebe984c"
  ),
  unchangedForbiddenLiveEntry(
    "coordination/content-qa/hk-question-bank-evidence-runner.mjs",
    "7288e9d91fe6e6057b22a2c5d35c2237bd07588ace11d8141729c539f64f052d"
  )
] as const;

export const HK_EASE_EXACT3_PHASE2A_FORBIDDEN_LIVE_PATHS =
  FORBIDDEN_LIVE_INVENTORY_ENTRIES.map(({ path }) => path);

const ORDERED_BASE_IDS = ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"] as const;

const NEW_1041_PROMPT_EN =
  "For each number, state in order whether it is divisible by 2, 5, and 10: (a) 75; (b) 130; (c) 502; (d) 1200; (e) 1005; (f) 4020. Give all six parts in one response in the format “(a) No, Yes, No; …; (f) …”. You may use ✓ for Yes and ✗ for No. Each three-entry group must follow the order 2, 5, 10.";
const NEW_1041_PROMPT_ZH =
  "對每個數判斷它能否依次被 2、5、10 整除：(a) 75；(b) 130；(c) 502；(d) 1200；(e) 1005；(f) 4020。請在同一答案中按「(a) 否、是、否；…；(f) …」格式作答；可用 ✓ 表示「是」、✗ 表示「否」。每組順序均為 2、5、10。";
const NEW_1041_PROMPT_PAIR_SHA256 =
  "40bbc41cef6daf614d48f2c4d336d1afa5c151a70b85e351a6ff6a80ad4d442c";

const MATRIX_SYMBOL =
  "(a) ✗, ✓, ✗; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗; (f) ✓, ✓, ✓";
const MATRIX_EN =
  "(a) No, Yes, No; (b) Yes, Yes, Yes; (c) Yes, No, No; (d) Yes, Yes, Yes; (e) No, Yes, No; (f) Yes, Yes, Yes";
const MATRIX_ZH =
  "(a) 否, 是, 否; (b) 是, 是, 是; (c) 是, 否, 否; (d) 是, 是, 是; (e) 否, 是, 否; (f) 是, 是, 是";

const fractionSpecs = {
  "hk-ease-10481": {
    asciiGroups: [["3/5", "11/12"], ["7/4", "9/9"], ["2 1/3", "5 2/7"]],
    displayGroups: [
      ["\\(\\frac{3}{5}\\)", "\\(\\frac{11}{12}\\)"],
      ["\\(\\frac{7}{4}\\)", "\\(\\frac{9}{9}\\)"],
      ["\\(2\\frac{1}{3}\\)", "\\(5\\frac{2}{7}\\)"]
    ],
    negativeInputs: [
      "(a) 3/5, 11/12; (b) 7/4, 9/9; (c) 2 1/3, 5 2/7",
      "(a) proper fractions: 999, 888; (b) improper fractions: 7/4, 9/9; (c) mixed numbers: 2 1/3, 5 2/7",
      "(a) proper fractions: 3/5, 11/12; (b) improper fractions: 7/4, 9/9; (c) mixed numbers: 999, 888",
      "(a) proper fractions: 7/4, 9/9; (b) improper fractions: 3/5, 11/12; (c) mixed numbers: 2 1/3, 5 2/7",
      "(a) proper fractions: 3/5, 3/5; (b) improper fractions: 7/4, 9/9; (c) mixed numbers: 2 1/3, 5 2/7",
      "(a) proper fractions: 3/5; (b) improper fractions: 7/4, 9/9; (c) mixed numbers: 2 1/3, 5 2/7",
      "(a) proper fractions: 3/5, 11/12; (b) improper fractions: 7/4, 9/9; (c) mixed numbers: 2 1/3, 5 2/7, 1/2",
      "(a) proper fractions: 3/5, 11/12; (b) improper fractions: 7/4, 1; (c) mixed numbers: 2 1/3, 5 2/7",
      "(a) proper fractions: 3/5, 11/12; (b) improper fractions: 7/4, 9/9; (c) mixed numbers: 7/3, 37/7",
      "(a) 真分數: 3/5, 11/12; (b) improper fractions: 7/4, 9/9; (c) mixed numbers: 2 1/3, 5 2/7",
      "(a) proper fractions: 3/5, 11/12; (b) improper fractions: 7/4, 9/9; (c) mixed fractions: 2 1/3, 5 2/7"
    ]
  },
  "hk-ease-10496": {
    asciiGroups: [["4/7", "13/15"], ["11/5", "8/8"], ["3 1/2", "6 4/9"]],
    displayGroups: [
      ["\\(\\frac{4}{7}\\)", "\\(\\frac{13}{15}\\)"],
      ["\\(\\frac{11}{5}\\)", "\\(\\frac{8}{8}\\)"],
      ["\\(3\\frac{1}{2}\\)", "\\(6\\frac{4}{9}\\)"]
    ],
    negativeInputs: [
      "(a) 4/7, 13/15; (b) 11/5, 8/8; (c) 3 1/2, 6 4/9",
      "(a) proper fractions: 999, 888; (b) improper fractions: 11/5, 8/8; (c) mixed numbers: 3 1/2, 6 4/9",
      "(a) proper fractions: 4/7, 13/15; (b) improper fractions: 11/5, 8/8; (c) mixed numbers: 999, 888",
      "(a) proper fractions: 11/5, 8/8; (b) improper fractions: 4/7, 13/15; (c) mixed numbers: 3 1/2, 6 4/9",
      "(a) proper fractions: 4/7, 4/7; (b) improper fractions: 11/5, 8/8; (c) mixed numbers: 3 1/2, 6 4/9",
      "(a) proper fractions: 4/7; (b) improper fractions: 11/5, 8/8; (c) mixed numbers: 3 1/2, 6 4/9",
      "(a) proper fractions: 4/7, 13/15; (b) improper fractions: 11/5, 8/8; (c) mixed numbers: 3 1/2, 6 4/9, 1/2",
      "(a) proper fractions: 4/7, 13/15; (b) improper fractions: 11/5, 1; (c) mixed numbers: 3 1/2, 6 4/9",
      "(a) proper fractions: 4/7, 13/15; (b) improper fractions: 11/5, 8/8; (c) mixed numbers: 7/2, 58/9",
      "(a) 真分數: 4/7, 13/15; (b) improper fractions: 11/5, 8/8; (c) mixed numbers: 3 1/2, 6 4/9",
      "(a) proper fractions: 4/7, 13/15; (b) improper fractions: 11/5, 8/8; (c) mixed fractions: 3 1/2, 6 4/9"
    ]
  }
} as const;

const matrixNegativeInputs = [
  "(a) arbitrary; (b) arbitrary; (c) arbitrary; (d) arbitrary; (e) arbitrary; (f) arbitrary",
  "(a) ✓, ✗, ✗; (b) ✓, ✓, ✓; (c) ✗, ✗, ✓; (d) ✓, ✓, ✓; (e) ✓, ✗, ✗; (f) ✓, ✓, ✓",
  "(a) ✗, ✓, ✗; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗",
  "(a) ✗, ✓, ✗; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗; (e) ✓, ✓, ✓",
  "(a) ✗, ✓, maybe; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗; (f) ✓, ✓, ✓",
  "✗, ✓, ✗; ✓, ✓, ✓; ✓, ✗, ✗; ✓, ✓, ✓; ✗, ✓, ✗; ✓, ✓, ✓",
  "(a) ✓, ✓, ✗; (b) ✓, ✓, ✓; (c) ✗, ✓, ✗; (d) ✓, ✓, ✓; (e) ✓, ✓, ✗; (f) ✓, ✓, ✓",
  "(a) No, Yes, No; (b) Yes, Yes, Yes; (c) No, No, Yes; (d) Yes, Yes, Yes; (e) No, Yes, No; (f) Yes, Yes, Yes"
] as const;

function fail(code: string, detail?: string): never {
  throw new Error(detail ? `${code}: ${detail}` : code);
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value: unknown, code: string) {
  if (!isRecord(value)) fail(code);
  return value;
}

function requireRecordArray(value: unknown, code: string) {
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) fail(code);
  return value as JsonRecord[];
}

function requireStringArray(value: unknown, code: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) fail(code);
  return value as string[];
}

function assertCanonicalRelativePath(path: string) {
  if (
    !path ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) fail("PHASE2A_PATH_INVALID", path);
}

function physicalRoot(repositoryRoot: string) {
  const stats = lstatSync(repositoryRoot);
  if (stats.isSymbolicLink() || !stats.isDirectory()) fail("PHASE2A_ROOT_INVALID");
  return realpathSync(repositoryRoot);
}

function readRepositoryBytes(root: string, path: string, code: string) {
  assertCanonicalRelativePath(path);
  const lexical = resolve(root, path);
  const inside = relative(root, lexical);
  if (!inside || inside === ".." || inside.startsWith(`..${sep}`)) fail(`${code}_ESCAPE`);
  const stats = lstatSync(lexical);
  if (stats.isSymbolicLink() || !stats.isFile()) fail(`${code}_NOT_REGULAR_FILE`, path);
  const physical = realpathSync(lexical);
  if (physical !== lexical) fail(`${code}_PHYSICAL_DRIFT`, path);
  return readFileSync(physical);
}

function readExactBytes(root: string, path: string, expectedSha256: string, code: string) {
  const bytes = readRepositoryBytes(root, path, code);
  const actual = sha256(bytes);
  if (actual !== expectedSha256) fail(`${code}_SHA256_DRIFT`, `${actual} != ${expectedSha256}`);
  return bytes;
}

function parseJson(bytes: Buffer, code: string) {
  try {
    return requireRecord(JSON.parse(bytes.toString("utf8")), `${code}_STRUCTURE_INVALID`);
  } catch (error) {
    if (error instanceof Error && error.message.includes(`${code}_STRUCTURE_INVALID`)) throw error;
    fail(`${code}_JSON_INVALID`);
  }
}

function payloadHashMatches(record: JsonRecord, field: string, code: string) {
  const expected = record[field];
  if (typeof expected !== "string") fail(`${code}_MISSING`);
  const payload = { ...record };
  delete payload[field];
  if (sha256(JSON.stringify(payload)) !== expected) fail(`${code}_DRIFT`);
}

function uniqueBy(records: JsonRecord[], field: string, value: string, code: string) {
  const matches = records.filter((record) => record[field] === value);
  if (matches.length !== 1) fail(code, `${field}=${value} count=${matches.length}`);
  return matches[0];
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function diffPaths(before: unknown, after: unknown, prefix = ""): string[] {
  if (sameJson(before, after)) return [];
  if (!isRecord(before) || !isRecord(after)) return [prefix];
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...paths].flatMap((key) =>
    diffPaths(before[key], after[key], prefix ? `${prefix}.${key}` : key)
  );
}

function assertExactDeltas(before: JsonRecord, after: JsonRecord, expected: string[], code: string) {
  const actual = diffPaths(before, after).sort();
  const allowed = [...expected].sort();
  const matchedAllowed = new Set<string>();
  const unexpected = actual.filter((actualPath) => {
    const allowedPath = allowed.find(
      (candidate) => actualPath === candidate || actualPath.startsWith(`${candidate}.`)
    );
    if (allowedPath) matchedAllowed.add(allowedPath);
    return !allowedPath;
  });
  const untouchedAllowed = allowed.filter((allowedPath) => !matchedAllowed.has(allowedPath));
  if (unexpected.length || untouchedAllowed.length) {
    fail(code, JSON.stringify({ actual, allowed, unexpected, untouchedAllowed }));
  }
}

function promptPairSha(promptEn: string, promptZh: string) {
  return sha256(JSON.stringify({ promptEn, promptZh }));
}

function renderNamedFractionResponse(
  displayGroups: readonly (readonly [string, string])[],
  language: "en" | "zh",
  orderMask: number
) {
  const categories = language === "en"
    ? ["proper fractions", "improper fractions", "mixed numbers"]
    : ["真分數", "假分數", "帶分數"];
  const colon = language === "en" ? ": " : "：";
  const semicolon = language === "en" ? "; " : "；";
  return displayGroups.map((group, index) => {
    const values = orderMask & (1 << index) ? [group[1], group[0]] : [group[0], group[1]];
    return `(${String.fromCharCode(97 + index)}) ${categories[index]}${colon}${values.join(", ")}`;
  }).join(semicolon);
}

function namedFractionAcceptedForms(spec: (typeof fractionSpecs)[keyof typeof fractionSpecs]) {
  const forms = (["en", "zh"] as const).flatMap((language) =>
    Array.from({ length: 8 }, (_, mask) =>
      renderNamedFractionResponse(spec.displayGroups, language, mask)
    )
  );
  if (forms.length !== 16 || new Set(forms).size !== 16) fail("FRACTION_ACCEPTED_FORM_POLICY_DRIFT");
  return forms;
}

function makeFractionContract(baseId: keyof typeof fractionSpecs, parserSha256: string) {
  const spec = fractionSpecs[baseId];
  const acceptedSurfaceForms = namedFractionAcceptedForms(spec);
  return {
    baseId,
    kind: "exact3-named-classified-number-groups-v1",
    params: {
      canonicalAnswer: acceptedSurfaceForms[0],
      acceptedSurfaceForms,
      labels: ["a", "b", "c"],
      categoryNames: {
        en: ["proper fractions", "improper fractions", "mixed numbers"],
        zh: ["真分數", "假分數", "帶分數"]
      },
      expectedOriginalRepresentationGroups: spec.asciiGroups.map((group) => [...group]),
      categoryLanguagePolicy: "one-response-all-English-or-all-Traditional-Chinese-no-mixing",
      representationPolicy:
        "each-original-representation-exactly-once-in-its-named-group-no-value-conversion",
      withinGroupOrder: "not-semantic",
      labelOrder: "exact-a-b-c",
      extraMissingDuplicatePolicy: "reject",
      parserBinding: {
        modulePath: SEMANTICS_PATH,
        exportName: "evaluateHongKongEaseExact3Phase2AContract",
        sourceSha256: parserSha256,
        failurePolicy: "reject-no-surface-only-or-generic-fallback"
      }
    }
  };
}

function makeMatrixContract(parserSha256: string) {
  return {
    baseId: "hk-ease-1041",
    kind: "exact3-labelled-divisibility-matrix-v1",
    params: {
      canonicalAnswer: MATRIX_SYMBOL,
      acceptedSurfaceForms: [MATRIX_SYMBOL, MATRIX_EN, MATRIX_ZH],
      labels: ["a", "b", "c", "d", "e", "f"],
      columns: [2, 5, 10],
      expectedBooleanMatrix: [
        [false, true, false],
        [true, true, true],
        [true, false, false],
        [true, true, true],
        [false, true, false],
        [true, true, true]
      ],
      tokenAliases: { true: ["Yes", "是", "✓"], false: ["No", "否", "✗"] },
      labelPolicy: "each-a-through-f-exactly-once-in-order",
      columnOrderPolicy: "exactly-2-5-10-with-three-decisions-per-label",
      illegalTokenPolicy: "reject",
      parserBinding: {
        modulePath: SEMANTICS_PATH,
        exportName: "evaluateHongKongEaseExact3Phase2AContract",
        sourceSha256: parserSha256,
        failurePolicy: "reject-no-multipart-shape-or-generic-fallback"
      }
    }
  };
}

function probe(input: string, expected: "accept" | "reject", rationale: string) {
  return {
    input,
    expected,
    rationale,
    origin: "deterministic-exact3-phase2a-full-parser-probe"
  };
}

function makeAuditPostimage(
  preimage: JsonRecord,
  contract: JsonRecord,
  positiveInputs: string[],
  negativeInputs: readonly string[]
) {
  const positiveProbes = positiveInputs.map((input) =>
    probe(input, "accept", "Complete candidate response satisfies the dedicated exact3 parser."));
  const negativeProbes = [...negativeInputs].map((input) =>
    probe(input, "reject", "Known false-green is rejected by the dedicated exact3 full parser."));
  for (const candidate of [...positiveProbes, ...negativeProbes]) {
    const actual = evaluateHongKongEaseExact3Phase2AContract(contract, candidate.input);
    if (actual !== (candidate.expected === "accept")) {
      fail("AUDIT_PROBE_SEMANTIC_DRIFT", `${contract.baseId}: ${candidate.input}`);
    }
  }
  return {
    ...preimage,
    kind: contract.kind,
    params: structuredClone(contract.params),
    positiveProbes,
    negativeProbes,
    source: [
      {
        type: "A18-independent-adjudication",
        reviewerLane: "A18",
        task: contract.baseId === "hk-ease-1041"
          ? "independent Task B2 final"
          : "exact3 named-category accepted-form adjudication",
        boundary: "Phase2A candidate-only; production promotion not authorized"
      },
      {
        type: "candidate-full-parser",
        modulePath: SEMANTICS_PATH,
        exportName: "evaluateHongKongEaseExact3Phase2AContract",
        failurePolicy: "reject-no-generic-fallback"
      }
    ],
    onFailure: "reject-no-generic-fallback",
    draftStatus: "phase2a-candidate-hold-promotion-not-authorized"
  };
}

function artifactWithRows(
  schemaVersion: string,
  sourceBindings: JsonRecord,
  rowKey: "questions" | "entries",
  rows: JsonRecord[],
  orderedIds: string[]
) {
  return {
    schemaVersion,
    status: "phase2a-candidate-only-promotion-not-authorized",
    sourceBindings,
    rowCount: rows.length,
    orderedRowIds: orderedIds,
    orderedRowIdSha256: sha256(`${orderedIds.join("\n")}\n`),
    rowsPayloadSha256: sha256(JSON.stringify(rows)),
    rowSha256: rows.map((row) => sha256(JSON.stringify(row))),
    [rowKey]: rows
  };
}

function assertPhase1Authority(phase1Authority: JsonRecord) {
  payloadHashMatches(phase1Authority, "authorityPayloadSha256", "PHASE1_AUTHORITY_PAYLOAD");
  if (
    phase1Authority.schemaVersion !== "hk-ease-exact3-production-repair-preimage-v1" ||
    !sameJson(phase1Authority.orderedBaseIds, ORDERED_BASE_IDS)
  ) fail("ORDERED_BASE_IDS_DRIFT");
  const rows = requireRecordArray(phase1Authority.rows, "PHASE1_ROWS_INVALID");
  if (rows.length !== 3 || !sameJson(rows.map((row) => row.baseId), ORDERED_BASE_IDS)) {
    fail("PHASE1_ROW_ORDER_DRIFT");
  }
  for (const row of rows) {
    if (typeof row.rowPreimageSha256 !== "string") fail("PHASE1_ROW_PAYLOAD_MISSING");
    const payload = { ...row };
    delete payload.rowPreimageSha256;
    if (sha256(JSON.stringify(payload)) !== row.rowPreimageSha256) {
      fail("PHASE1_ROW_PAYLOAD_DRIFT", String(row.baseId));
    }
  }
  return rows;
}

function assertStep0Receipt(step0Receipt: JsonRecord) {
  payloadHashMatches(step0Receipt, "receiptPayloadSha256", "STEP0_RECEIPT_PAYLOAD");
  const sourceRelocations = requireRecordArray(
    step0Receipt.sourceRelocations,
    "STEP0_SOURCE_RELOCATIONS_INVALID"
  );
  const exact26Relocations = requireRecordArray(
    step0Receipt.exact26FrozenCoordinateRelocations,
    "STEP0_EXACT26_RELOCATIONS_INVALID"
  );
  if (sourceRelocations.length !== 6 || exact26Relocations.length !== 6) {
    fail("STEP0_TWELVE_SNAPSHOT_BINDING_DRIFT");
  }
  return [...sourceRelocations, ...exact26Relocations];
}

export type HongKongEaseExact3Phase2AInputs = {
  phase1Authority: JsonRecord;
  step0Receipt: JsonRecord;
  questionPack: JsonRecord;
  responseContracts: JsonRecord;
  responseAudit: JsonRecord;
  versionManifest: JsonRecord;
  v2History: JsonRecord;
};

const snapshotInputPaths = [
  ...HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS,
  ...HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS
].map(({ immutableSnapshotPath }) => immutableSnapshotPath);

export const HK_EASE_EXACT3_PHASE2A_REQUIRED_INPUT_PATHS = [
  PHASE1_PATH,
  STEP0_RECEIPT_PATH,
  V2_HISTORY_PATH,
  BUILDER_PATH,
  FOCUSED_TEST_PATH,
  SEMANTICS_PATH,
  RELOCATION_PATH,
  STEP0_MATERIALIZER_PATH,
  V4_RUNTIME_SUCCESSOR_AUTHORITY_PATH,
  ...snapshotInputPaths
] as const;

export function verifyHongKongEaseExact3Phase2ACandidateCreationLiveInventory(
  repositoryRoot: string,
  observation: "pre-materialization" | "authority-build" | "post-materialization"
) {
  const root = physicalRoot(repositoryRoot);
  const observationField = {
    "pre-materialization": "preMaterializationObservedSha256",
    "authority-build": "observedSha256",
    "post-materialization": "postMaterializationObservedSha256"
  }[observation] as
    | "preMaterializationObservedSha256"
    | "observedSha256"
    | "postMaterializationObservedSha256"
    | undefined;
  if (!observationField) fail("PHASE2A_FORBIDDEN_LIVE_OBSERVATION_INVALID");
  if (
    FORBIDDEN_LIVE_INVENTORY_ENTRIES.length !== 12 ||
    new Set(HK_EASE_EXACT3_PHASE2A_FORBIDDEN_LIVE_PATHS).size !== 12
  ) fail("PHASE2A_FORBIDDEN_LIVE_EXACT_INVENTORY_DRIFT");
  const observationCode = observation.replaceAll("-", "_").toUpperCase();
  for (const entry of FORBIDDEN_LIVE_INVENTORY_ENTRIES) {
    if ((HK_EASE_EXACT3_PHASE2A_OUTPUT_PATHS as readonly string[]).includes(entry.path)) {
      fail("PHASE2A_FORBIDDEN_LIVE_OUTPUT_OVERLAP", entry.path);
    }
    readExactBytes(
      root,
      entry.path,
      entry[observationField],
      `PHASE2A_FORBIDDEN_LIVE_${observationCode}`
    );
  }
  readExactBytes(
    root,
    V4_RUNTIME_SUCCESSOR_AUTHORITY_PATH,
    V4_RUNTIME_SUCCESSOR_AUTHORITY_SHA256,
    "PHASE2A_V4_RUNTIME_SUCCESSOR_AUTHORITY"
  );
}

export function readHongKongEaseExact3Phase2AInputs(
  repositoryRoot: string
): HongKongEaseExact3Phase2AInputs {
  const root = physicalRoot(repositoryRoot);
  const phase1Authority = parseJson(
    readExactBytes(root, PHASE1_PATH, PHASE1_SHA256, "PHASE1_AUTHORITY"),
    "PHASE1_AUTHORITY"
  );
  const step0Receipt = parseJson(
    readExactBytes(root, STEP0_RECEIPT_PATH, STEP0_RECEIPT_SHA256, "STEP0_RECEIPT"),
    "STEP0_RECEIPT"
  );
  assertPhase1Authority(phase1Authority);
  const receiptSnapshotBindings = assertStep0Receipt(step0Receipt);

  const resolvedByLogicalPath = new Map<string, Buffer>();
  for (const relocation of HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS) {
    const resolution = resolveHongKongEaseExact3ImmutablePreimage({
      repositoryRoot: root,
      logicalPath: relocation.logicalPath,
      expectedOldSha256: relocation.expectedOldSha256
    });
    resolvedByLogicalPath.set(relocation.logicalPath, resolution.bytes);
  }
  for (const relocation of HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS) {
    resolveHongKongEaseExact3Exact26FrozenCoordinate({
      repositoryRoot: root,
      logicalPath: relocation.logicalPath,
      expectedOldSha256: relocation.expectedOldSha256
    });
  }
  const expectedSnapshotBindings = [
    ...HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS,
    ...HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS
  ].map(({ logicalPath, expectedOldSha256, immutableSnapshotPath }) => ({
    logicalPath,
    expectedOldSha256,
    immutableSnapshotPath
  }));
  if (!sameJson(receiptSnapshotBindings.map(({ logicalPath, expectedOldSha256, immutableSnapshotPath }) => ({
    logicalPath,
    expectedOldSha256,
    immutableSnapshotPath
  })), expectedSnapshotBindings)) fail("STEP0_RECEIPT_SNAPSHOT_BINDING_DRIFT");

  const implementationBindings = requireRecordArray(
    step0Receipt.implementationSourceBindings,
    "STEP0_IMPLEMENTATION_BINDINGS_INVALID"
  );
  for (const binding of implementationBindings) {
    if (typeof binding.path !== "string" || typeof binding.sha256 !== "string") {
      fail("STEP0_IMPLEMENTATION_BINDING_INVALID");
    }
    readExactBytes(root, binding.path, binding.sha256, "STEP0_IMPLEMENTATION_SOURCE");
  }

  const frozenJson = (logicalPath: string, code: string) => {
    const bytes = resolvedByLogicalPath.get(logicalPath);
    if (!bytes) fail(`${code}_SNAPSHOT_MISSING`);
    return parseJson(bytes, code);
  };
  return {
    phase1Authority,
    step0Receipt,
    questionPack: frozenJson(QUESTION_PACK_LOGICAL_PATH, "QUESTION_PACK"),
    responseContracts: frozenJson(CONTRACTS_LOGICAL_PATH, "RESPONSE_CONTRACTS"),
    responseAudit: frozenJson(AUDIT_LOGICAL_PATH, "RESPONSE_AUDIT"),
    versionManifest: frozenJson(VERSION_LOGICAL_PATH, "VERSION_MANIFEST"),
    v2History: parseJson(
      readExactBytes(root, V2_HISTORY_PATH, V2_HISTORY_SHA256, "V2_HISTORY"),
      "V2_HISTORY"
    )
  };
}

function assertInputsMatchPinnedRepositoryBytes(
  root: string,
  inputs: HongKongEaseExact3Phase2AInputs
) {
  const pinned = readHongKongEaseExact3Phase2AInputs(root);
  const fields: (keyof HongKongEaseExact3Phase2AInputs)[] = [
    "phase1Authority",
    "step0Receipt",
    "questionPack",
    "responseContracts",
    "responseAudit",
    "versionManifest",
    "v2History"
  ];
  const drift = fields.filter((field) => !sameJson(inputs[field], pinned[field]));
  if (drift.length) fail("PHASE2A_PINNED_INPUT_DRIFT", drift.join(","));
}

function questionMaterial(question: JsonRecord) {
  const material = { ...question };
  delete material.id;
  return material;
}

function makePostimageBinding(path: string, artifact: JsonRecord) {
  const rows = Array.isArray(artifact.questions) ? artifact.questions : artifact.entries;
  const ids = artifact.orderedRowIds;
  const bytes = `${JSON.stringify(artifact, null, 2)}\n`;
  return {
    path,
    sha256: sha256(bytes),
    byteLength: Buffer.byteLength(bytes),
    rowCount: artifact.rowCount,
    orderedRowIds: ids,
    orderedRowIdSha256: artifact.orderedRowIdSha256,
    rowsPayloadSha256: artifact.rowsPayloadSha256,
    rowSha256: artifact.rowSha256,
    recomputedRowsPayloadSha256: sha256(JSON.stringify(rows))
  };
}

export function buildHongKongEaseExact3Phase2ACandidateFromInputs(
  repositoryRoot: string,
  rawInputs: HongKongEaseExact3Phase2AInputs
) {
  const root = physicalRoot(repositoryRoot);
  const inputs = requireRecord(rawInputs, "PHASE2A_INPUTS_INVALID") as HongKongEaseExact3Phase2AInputs;
  const phase1Rows = assertPhase1Authority(inputs.phase1Authority);
  const immutableSnapshotBindings = assertStep0Receipt(inputs.step0Receipt).map(
    ({ logicalPath, expectedOldSha256, immutableSnapshotPath }) => ({
      logicalPath,
      expectedOldSha256,
      immutableSnapshotPath
    })
  );
  if (immutableSnapshotBindings.length !== 12) fail("PHASE2A_SNAPSHOT_COUNT_DRIFT");

  const questionRows = requireRecordArray(inputs.questionPack.questions, "QUESTION_PACK_STRUCTURE_INVALID");
  const contractRows = requireRecordArray(
    inputs.responseContracts.entries,
    "RESPONSE_CONTRACT_STRUCTURE_INVALID"
  );
  const auditRows = requireRecordArray(inputs.responseAudit.entries, "RESPONSE_AUDIT_STRUCTURE_INVALID");
  const historyRows = requireRecordArray(inputs.v2History.questions, "V2_HISTORY_STRUCTURE_INVALID");
  const activeMap = requireRecord(
    inputs.versionManifest.activeIdByHistoricalId,
    "VERSION_MAP_STRUCTURE_INVALID"
  );
  const retired = requireStringArray(
    inputs.versionManifest.retiredHistoricalIds,
    "VERSION_RETIRED_STRUCTURE_INVALID"
  );

  const builderSha256 = sha256(readRepositoryBytes(root, BUILDER_PATH, "PHASE2A_BUILDER_SOURCE"));
  const focusedTestSha256 = sha256(
    readRepositoryBytes(root, FOCUSED_TEST_PATH, "PHASE2A_FOCUSED_TEST_SOURCE")
  );
  const parserSha256 = sha256(readRepositoryBytes(root, SEMANTICS_PATH, "PHASE2A_PARSER_SOURCE"));
  readExactBytes(
    root,
    V4_RUNTIME_SUCCESSOR_AUTHORITY_PATH,
    V4_RUNTIME_SUCCESSOR_AUTHORITY_SHA256,
    "PHASE2A_V4_RUNTIME_SUCCESSOR_AUTHORITY"
  );
  const sourceBindings = {
    phase1PreimageAuthority: { path: PHASE1_PATH, sha256: PHASE1_SHA256 },
    expandedStep0Receipt: { path: STEP0_RECEIPT_PATH, sha256: STEP0_RECEIPT_SHA256 },
    v2History: { path: V2_HISTORY_PATH, sha256: V2_HISTORY_SHA256 }
  };

  const questionSuccessors: JsonRecord[] = [];
  const historySuccessors: JsonRecord[] = [];
  const contractSuccessors: JsonRecord[] = [];
  const auditSuccessors: JsonRecord[] = [];
  const versionEntries: JsonRecord[] = [];
  const rowAuthority: JsonRecord[] = [];

  for (const [index, baseId] of ORDERED_BASE_IDS.entries()) {
    const phase1Row = phase1Rows[index];
    if (phase1Row.baseId !== baseId || phase1Row.requiredSuccessorId !== `${baseId}-v3`) {
      fail("PHASE1_ROW_IDENTITY_DRIFT", baseId);
    }
    const questionPreimage = uniqueBy(
      questionRows,
      "id",
      baseId,
      "UNIQUE_QUESTION_PREIMAGE_REQUIRED"
    );
    const contractPreimage = uniqueBy(
      contractRows,
      "baseId",
      baseId,
      "UNIQUE_CONTRACT_PREIMAGE_REQUIRED"
    );
    const auditPreimage = uniqueBy(
      auditRows,
      "baseId",
      baseId,
      "UNIQUE_AUDIT_PREIMAGE_REQUIRED"
    );
    const v2Id = `${baseId}-v2`;
    const successorId = `${baseId}-v3`;
    const historyPreimage = uniqueBy(
      historyRows,
      "id",
      v2Id,
      "UNIQUE_V2_HISTORY_PREIMAGE_REQUIRED"
    );
    if (
      sha256(JSON.stringify(questionPreimage)) !== phase1Row.candidateQuestion.recordSha256 ||
      sha256(JSON.stringify(contractPreimage)) !== phase1Row.strictContract.recordSha256 ||
      sha256(JSON.stringify(auditPreimage)) !== phase1Row.responseAudit.recordSha256 ||
      sha256(JSON.stringify(historyPreimage)) !== phase1Row.frozenV2History.recordSha256
    ) fail("PHASE1_ROW_PREIMAGE_BINDING_DRIFT", baseId);
    if (
      activeMap[baseId] !== v2Id ||
      Object.prototype.hasOwnProperty.call(activeMap, v2Id) ||
      retired.includes(v2Id) ||
      !retired.includes(baseId) ||
      Object.prototype.hasOwnProperty.call(activeMap, successorId) ||
      retired.includes(successorId)
    ) fail("VERSION_PREIMAGE_DRIFT", baseId);

    const contractPostimage = baseId === "hk-ease-1041"
      ? makeMatrixContract(parserSha256)
      : makeFractionContract(baseId as keyof typeof fractionSpecs, parserSha256);
    const questionPostimage = structuredClone(questionPreimage);
    questionPostimage.id = successorId;
    const questionDeltaPaths = baseId === "hk-ease-1041"
      ? ["id", "promptEn", "promptZh"]
      : ["id", "answer", "acceptedAnswers"];
    if (baseId === "hk-ease-1041") {
      questionPostimage.promptEn = NEW_1041_PROMPT_EN;
      questionPostimage.promptZh = NEW_1041_PROMPT_ZH;
      if (promptPairSha(questionPostimage.promptEn, questionPostimage.promptZh) !==
        NEW_1041_PROMPT_PAIR_SHA256) fail("A18_1041_PROMPT_PAIR_DRIFT");
      if (!sameJson(questionPostimage.acceptedAnswers, [MATRIX_SYMBOL, MATRIX_EN, MATRIX_ZH])) {
        fail("MATRIX_CANONICAL_ALIAS_PREIMAGE_DRIFT");
      }
    } else {
      questionPostimage.answer = contractPostimage.params.canonicalAnswer;
      questionPostimage.acceptedAnswers = structuredClone(
        contractPostimage.params.acceptedSurfaceForms
      );
      if (
        questionPostimage.promptEn !== questionPreimage.promptEn ||
        questionPostimage.promptZh !== questionPreimage.promptZh ||
        questionPostimage.explanationEn !== questionPreimage.explanationEn ||
        questionPostimage.explanationZh !== questionPreimage.explanationZh
      ) fail("FRACTION_PROMPT_EXPLANATION_MUTATION_FORBIDDEN", baseId);
    }
    assertExactDeltas(
      questionPreimage,
      questionPostimage,
      questionDeltaPaths,
      "QUESTION_ALLOWED_DELTA_DRIFT"
    );

    const historyPostimage = structuredClone(historyPreimage);
    historyPostimage.id = successorId;
    const historyDeltaPaths = baseId === "hk-ease-1041"
      ? ["id", "prompt.en", "prompt.zh"]
      : ["id", "answer", "acceptedAnswers"];
    historyPostimage.prompt.en = questionPostimage.promptEn;
    historyPostimage.prompt.zh = questionPostimage.promptZh;
    historyPostimage.answer = questionPostimage.answer;
    historyPostimage.acceptedAnswers = structuredClone(questionPostimage.acceptedAnswers);
    assertExactDeltas(
      historyPreimage,
      historyPostimage,
      historyDeltaPaths,
      "HISTORY_ALLOWED_DELTA_DRIFT"
    );
    if (
      historyPostimage.explanation.en !== questionPostimage.explanationEn ||
      historyPostimage.explanation.zh !== questionPostimage.explanationZh
    ) fail("QUESTION_HISTORY_EXPLANATION_PARITY_DRIFT", baseId);

    assertExactDeltas(
      contractPreimage,
      contractPostimage,
      ["kind", "params"],
      "CONTRACT_ALLOWED_DELTA_DRIFT"
    );
    const positiveInputs = contractPostimage.params.acceptedSurfaceForms as string[];
    const negativeInputs = baseId === "hk-ease-1041"
      ? matrixNegativeInputs
      : fractionSpecs[baseId as keyof typeof fractionSpecs].negativeInputs;
    const auditPostimage = makeAuditPostimage(
      auditPreimage,
      contractPostimage,
      positiveInputs,
      negativeInputs
    );
    const auditDeltaPaths = [
      "kind",
      "params",
      "positiveProbes",
      "negativeProbes",
      "source",
      "draftStatus"
    ];
    assertExactDeltas(
      auditPreimage,
      auditPostimage,
      auditDeltaPaths,
      "AUDIT_ALLOWED_DELTA_DRIFT"
    );

    if (sameJson(questionMaterial(questionPreimage), questionMaterial(questionPostimage))) {
      fail("SUCCESSOR_MATERIAL_DELTA_REQUIRED", baseId);
    }
    questionSuccessors.push(questionPostimage);
    historySuccessors.push(historyPostimage);
    contractSuccessors.push({
      baseId,
      successorId,
      preimageRecordSha256: sha256(JSON.stringify(contractPreimage)),
      postimageRecordSha256: sha256(JSON.stringify(contractPostimage)),
      allowedDeltaPaths: ["kind", "params"],
      postimage: contractPostimage
    });
    auditSuccessors.push({
      baseId,
      successorId,
      preimageRecordSha256: sha256(JSON.stringify(auditPreimage)),
      postimageRecordSha256: sha256(JSON.stringify(auditPostimage)),
      allowedDeltaPaths: auditDeltaPaths,
      postimage: auditPostimage
    });
    versionEntries.push({
      baseId,
      activePreimageId: v2Id,
      successorId,
      activeMappingPostimage: { [baseId]: successorId, [v2Id]: successorId },
      retiredIdsAdded: [baseId, v2Id],
      noChainInvariant: `${successorId}-is-not-a-mapping-key`
    });
    rowAuthority.push({
      baseId,
      activePreimageId: v2Id,
      successorId,
      questionAllowedDeltaPaths: questionDeltaPaths,
      historyAllowedDeltaPaths: historyDeltaPaths,
      contractAllowedDeltaPaths: ["kind", "params"],
      auditAllowedDeltaPaths: auditDeltaPaths,
      questionPreimageRecordSha256: sha256(JSON.stringify(questionPreimage)),
      questionPostimageRecordSha256: sha256(JSON.stringify(questionPostimage)),
      questionPreimageMaterialSha256: sha256(JSON.stringify(questionMaterial(questionPreimage))),
      questionPostimageMaterialSha256: sha256(JSON.stringify(questionMaterial(questionPostimage))),
      v2HistoryPreimageRecordSha256: sha256(JSON.stringify(historyPreimage)),
      v3HistoryPostimageRecordSha256: sha256(JSON.stringify(historyPostimage)),
      acceptedAnswerCount: questionPostimage.acceptedAnswers.length,
      acceptedAnswersSha256: sha256(JSON.stringify(questionPostimage.acceptedAnswers))
    });
  }

  const questionArtifact = artifactWithRows(
    "hk-ease-exact3-phase2a-question-successor-rows-v1",
    sourceBindings,
    "questions",
    questionSuccessors,
    questionSuccessors.map((row) => row.id)
  );
  const contractArtifact = artifactWithRows(
    "hk-ease-exact3-phase2a-strict-response-contract-successor-rows-v1",
    sourceBindings,
    "entries",
    contractSuccessors,
    contractSuccessors.map((row) => row.baseId)
  );
  const auditArtifact = artifactWithRows(
    "hk-ease-exact3-phase2a-response-contract-audit-successor-rows-v1",
    sourceBindings,
    "entries",
    auditSuccessors,
    auditSuccessors.map((row) => row.baseId)
  );
  const historyArtifact = {
    ...artifactWithRows(
      "hk-ease-exact3-phase2a-v3-history-v1",
      sourceBindings,
      "questions",
      historySuccessors,
      historySuccessors.map((row) => row.id)
    ),
    questionCount: historySuccessors.length,
    frozenPredecessorPolicy: "v2-history-bytes-remain-immutable"
  };
  const activeIdByHistoricalIdPostimage = Object.assign(
    {},
    ...versionEntries.map((entry) => entry.activeMappingPostimage)
  );
  const retiredHistoricalIdsAdded = versionEntries.flatMap((entry) => entry.retiredIdsAdded);
  const versionArtifact = {
    ...artifactWithRows(
      "hk-ease-exact3-phase2a-version-manifest-delta-v1",
      sourceBindings,
      "entries",
      versionEntries,
      versionEntries.map((row) => row.baseId)
    ),
    activeIdByHistoricalIdPostimage,
    retiredHistoricalIdsAdded,
    noChainPolicy: "base-and-v2-map-directly-to-v3-v3-is-never-a-map-key"
  };
  const postimages = {
    questionSuccessors: questionArtifact,
    strictContractSuccessors: contractArtifact,
    responseAuditSuccessors: auditArtifact,
    v3History: historyArtifact,
    versionManifestDelta: versionArtifact
  };
  const postimageBindings = [
    makePostimageBinding(QUESTION_OUTPUT_PATH, questionArtifact),
    makePostimageBinding(CONTRACT_OUTPUT_PATH, contractArtifact),
    makePostimageBinding(AUDIT_OUTPUT_PATH, auditArtifact),
    makePostimageBinding(HISTORY_OUTPUT_PATH, historyArtifact),
    makePostimageBinding(VERSION_OUTPUT_PATH, versionArtifact)
  ];
  for (const binding of postimageBindings) {
    if (binding.rowsPayloadSha256 !== binding.recomputedRowsPayloadSha256) {
      fail("POSTIMAGE_ROWS_PAYLOAD_DRIFT", binding.path);
    }
  }
  // The exported mutation seam may exercise structural guards, but it must
  // never return authority or postimages for objects that are not exactly the
  // independently pinned repository inputs named by the emitted bindings.
  assertInputsMatchPinnedRepositoryBytes(root, inputs);

  const exactAllowedDeltas = {
    questionSuccessors: Object.fromEntries(
      rowAuthority.map((row) => [row.baseId, row.questionAllowedDeltaPaths])
    ),
    v3History: Object.fromEntries(
      rowAuthority.map((row) => [row.baseId, row.historyAllowedDeltaPaths])
    ),
    strictContracts: Object.fromEntries(
      rowAuthority.map((row) => [row.baseId, row.contractAllowedDeltaPaths])
    ),
    responseAudit: Object.fromEntries(
      rowAuthority.map((row) => [row.baseId, row.auditAllowedDeltaPaths])
    ),
    versionManifest:
      "add-only-six-direct-mappings-base-and-v2-to-v3-plus-retire-base-and-v2-no-v3-key"
  };
  const authorityWithoutHash = {
    schemaVersion: "hk-ease-exact3-phase2a-candidate-authority-v1",
    status: "candidate-hold-live-promotion-not-authorized",
    builderBinding: { path: BUILDER_PATH, sha256: builderSha256 },
    focusedTestBinding: { path: FOCUSED_TEST_PATH, sha256: focusedTestSha256 },
    semanticParserBinding: {
      path: SEMANTICS_PATH,
      sha256: parserSha256,
      exportName: "evaluateHongKongEaseExact3Phase2AContract"
    },
    phase1PreimageAuthority: { path: PHASE1_PATH, sha256: PHASE1_SHA256 },
    step0ImmutableRelocationReceipt: {
      path: STEP0_RECEIPT_PATH,
      sha256: STEP0_RECEIPT_SHA256,
      snapshotCount: 12
    },
    immutableSnapshotBindings,
    a18MaterialPromptAdjudication: {
      reviewerLane: "A18",
      task: "independent Task B2 final",
      source: "parent-transmitted exact adjudication text in the Phase2A authorization round",
      boundary:
        "new text is first frozen by this candidate authority; it was not present in Phase1 or STEP0",
      promptPairSha256: NEW_1041_PROMPT_PAIR_SHA256,
      promptEnSha256: sha256(NEW_1041_PROMPT_EN),
      promptZhSha256: sha256(NEW_1041_PROMPT_ZH),
      exactText: { promptEn: NEW_1041_PROMPT_EN, promptZh: NEW_1041_PROMPT_ZH }
    },
    orderedBaseIds: [...ORDERED_BASE_IDS],
    orderedBaseIdSha256: sha256(`${ORDERED_BASE_IDS.join("\n")}\n`),
    exactAllowedDeltas,
    rowAuthority,
    postimageBindings,
    rollbackAndPreimage: {
      phase1AuthorityPath: PHASE1_PATH,
      phase1AuthoritySha256: PHASE1_SHA256,
      step0ReceiptPath: STEP0_RECEIPT_PATH,
      step0ReceiptSha256: STEP0_RECEIPT_SHA256,
      v2HistoryPath: V2_HISTORY_PATH,
      v2HistorySha256: V2_HISTORY_SHA256,
      rollbackPolicy:
        "discard candidate-only files; no live byte was overwritten and all predecessors remain intact"
    },
    dependencyAndCascade: {
      candidatePostimages: HK_EASE_EXACT3_PHASE2A_OUTPUT_PATHS.slice(0, 5),
      candidateCreationForbiddenLiveInventory: {
        schemaVersion: "hk-ease-exact3-phase2a-forbidden-live-inventory-v1",
        evidenceBoundary:
          "exact one-time pre-materialization, authority-build, and post-materialization observations for candidate regeneration; no listed path is a candidate write target",
        deterministicRebuildPolicy:
          "recorded evidence is serialized as immutable constants; pure candidate reconstruction never substitutes or adopts future live bytes",
        entryCount: FORBIDDEN_LIVE_INVENTORY_ENTRIES.length,
        orderedPathSha256: sha256(
          `${FORBIDDEN_LIVE_INVENTORY_ENTRIES.map(({ path }) => path).join("\n")}\n`
        ),
        entries: structuredClone(FORBIDDEN_LIVE_INVENTORY_ENTRIES),
        inventoryPayloadSha256: sha256(JSON.stringify(FORBIDDEN_LIVE_INVENTORY_ENTRIES))
      },
      requiredFuturePromotionCascade: [
        "atomic live pack-contract-audit-version-history mutation",
        "production exact3 semantic dispatch and focused runtime tests",
        "practice projection and data/questions rebuild",
        "V4 oracle regeneration and exact701 replay",
        "full-bank, runner, typecheck, build, browser, release, and live proof"
      ]
    },
    promotion: {
      status: "not-authorized-candidate-hold",
      authorizedActions: ["materialize-and-verify-isolated-candidate-postimages"],
      forbiddenActions: ["overwrite-live-source", "runtime-dispatch", "history-promotion", "release"]
    }
  };
  const authority = {
    ...authorityWithoutHash,
    authorityPayloadSha256: sha256(JSON.stringify(authorityWithoutHash))
  };
  return { postimages, authority };
}

export function buildHongKongEaseExact3Phase2ACandidate(repositoryRoot: string) {
  const inputs = readHongKongEaseExact3Phase2AInputs(repositoryRoot);
  return buildHongKongEaseExact3Phase2ACandidateFromInputs(repositoryRoot, inputs);
}

export function serializeHongKongEaseExact3Phase2ACandidate(repositoryRoot: string) {
  const build = buildHongKongEaseExact3Phase2ACandidate(repositoryRoot);
  return {
    [QUESTION_OUTPUT_PATH]: `${JSON.stringify(build.postimages.questionSuccessors, null, 2)}\n`,
    [CONTRACT_OUTPUT_PATH]: `${JSON.stringify(build.postimages.strictContractSuccessors, null, 2)}\n`,
    [AUDIT_OUTPUT_PATH]: `${JSON.stringify(build.postimages.responseAuditSuccessors, null, 2)}\n`,
    [HISTORY_OUTPUT_PATH]: `${JSON.stringify(build.postimages.v3History, null, 2)}\n`,
    [VERSION_OUTPUT_PATH]: `${JSON.stringify(build.postimages.versionManifestDelta, null, 2)}\n`,
    [AUTHORITY_OUTPUT_PATH]: `${JSON.stringify(build.authority, null, 2)}\n`
  };
}

function materializeCandidate(repositoryRoot: string) {
  const root = physicalRoot(repositoryRoot);
  verifyHongKongEaseExact3Phase2ACandidateCreationLiveInventory(
    root,
    "pre-materialization"
  );
  const serialized = serializeHongKongEaseExact3Phase2ACandidate(root);
  verifyHongKongEaseExact3Phase2ACandidateCreationLiveInventory(root, "authority-build");
  for (const path of HK_EASE_EXACT3_PHASE2A_OUTPUT_PATHS) {
    const output = resolve(root, path);
    if (!existsSync(output)) {
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, serialized[path], { flag: "wx", mode: 0o444 });
    } else if (readFileSync(output, "utf8") !== serialized[path]) {
      fail("PHASE2A_CHECKED_IN_CANDIDATE_DRIFT", path);
    }
  }
  verifyHongKongEaseExact3Phase2ACandidateCreationLiveInventory(
    root,
    "post-materialization"
  );
}

const executedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (executedPath && pathToFileURL(executedPath).href === import.meta.url) {
  if (!process.argv.includes("--write")) fail("PHASE2A_WRITE_FLAG_REQUIRED");
  materializeCandidate(process.cwd());
  process.stdout.write(`${fileURLToPath(import.meta.url)}\n${AUTHORITY_OUTPUT_PATH}\n`);
}
