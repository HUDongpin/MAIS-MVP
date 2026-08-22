import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { evaluateHongKongEaseExact3Phase2AContract } from
  "./hk-ease-exact3-phase2a-candidate-semantics";

type JsonRecord = Record<string, any>;

const BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-exact3-phase2b-data-plane-candidate.ts";
const FOCUSED_TEST_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2b-atomic-promotion-dry-run.test.ts";
const SEMANTICS_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2a-candidate-semantics.ts";
const SEMANTICS_SHA256 =
  "f78ce1b211fa2723a635028f18f9db080b60063927d376edfc96e5cc676a8824";

const AUTHORITY_ROOT =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair";
const PHASE2A_ROOT = `${AUTHORITY_ROOT}/phase2a-candidate`;
const PREIMAGE_ROOT = `${AUTHORITY_ROOT}/preimages/sha256`;
const CANDIDATE_DIRECTORY = `${AUTHORITY_ROOT}/phase2b-data-plane-candidate`;

const QUESTION_OUTPUT_PATH = `${CANDIDATE_DIRECTORY}/full-question-pack-base-id-v1.json`;
const AUDIT_OUTPUT_PATH = `${CANDIDATE_DIRECTORY}/full-response-contract-audit-v1.json`;
const STRICT_OUTPUT_PATH = `${CANDIDATE_DIRECTORY}/full-strict-response-contracts-v1.json`;
const SIMPLE_OUTPUT_PATH = `${CANDIDATE_DIRECTORY}/full-simple-response-contracts-v1.json`;
const OVERLAY_OUTPUT_PATH =
  `${CANDIDATE_DIRECTORY}/independent-answer-oracle-exact3-overlay-supplement-v2.json`;
const HISTORY_OUTPUT_PATH = `${CANDIDATE_DIRECTORY}/v3-history-v1.json`;
const VERSION_OUTPUT_PATH = `${CANDIDATE_DIRECTORY}/full-question-version-manifest-v1.json`;

export const HK_EASE_EXACT3_PHASE2B_DATA_OUTPUT_PATHS = [
  QUESTION_OUTPUT_PATH,
  AUDIT_OUTPUT_PATH,
  STRICT_OUTPUT_PATH,
  SIMPLE_OUTPUT_PATH,
  OVERLAY_OUTPUT_PATH,
  HISTORY_OUTPUT_PATH,
  VERSION_OUTPUT_PATH
] as const;

export const HK_EASE_EXACT3_PHASE2B_AUTHORITY_PATH =
  `${CANDIDATE_DIRECTORY}/candidate-hold-authority-v1.json`;

const INDEPENDENT_RECEIPT_PATH =
  `${AUTHORITY_ROOT}/phase2b-independent-oracle-overlay-review-v2.json`;
const INDEPENDENT_RECEIPT_SHA256 =
  "0aacfce318a7839f44beba7d3d5f6722e11a129b4ee6f8a3ac770b712382cd2e";
const INDEPENDENT_RECEIPT_DETACHED_SHA256 =
  "c0387a5f0ea824510ab24d84f8e062a289354e8731caa3acde9320f30ecd825b";
const INDEPENDENT_RECEIPT_CANONICAL_SHA256 =
  "5885a4bd056ad4ed633ccc3a04361843bfd74761072f03327b80c0a0b34c4f33";

const PHASE2A_AUTHORITY_PATH = `${PHASE2A_ROOT}/candidate-authority-v1.json`;
const PHASE2A_AUTHORITY_SHA256 =
  "a116dd12e3221cc623d7698f67f5b998087c6f8086b64f655e5fb40e41dd60f8";
const PHASE2A_QUESTION_PATH = `${PHASE2A_ROOT}/question-successor-rows-v1.json`;
const PHASE2A_QUESTION_SHA256 =
  "0048c168167af24bc0f48ed7d6562d6dd6d503ef21f4dec627ff48b10f203615";
const PHASE2A_AUDIT_PATH = `${PHASE2A_ROOT}/response-contract-audit-successor-rows-v1.json`;
const PHASE2A_AUDIT_SHA256 =
  "b86fbde8450bcf8e8437491eb10e8f9c8f6759d774f4173c416a3143ec9f1cd9";
const PHASE2A_STRICT_PATH = `${PHASE2A_ROOT}/strict-response-contract-successor-rows-v1.json`;
const PHASE2A_STRICT_SHA256 =
  "a79e7471643832b54f2c730f90986dfb72e05c90ed6978f25179ac1ac1fc94db";
const PHASE2A_HISTORY_PATH = `${PHASE2A_ROOT}/v3-history-v1.json`;
const PHASE2A_HISTORY_SHA256 =
  "e5a696da5e8d5e1cc31259a6736d6d9974c08fdf25a57298a6958ffcd11b440b";
const PHASE2A_VERSION_DELTA_PATH = `${PHASE2A_ROOT}/version-manifest-delta-v1.json`;
const PHASE2A_VERSION_DELTA_SHA256 =
  "2916311a4e9de0106e009c0854fb05463344ad6cebad3e2c7bebfd6a1752df96";

const OLD_PACK_PATH =
  `${PREIMAGE_ROOT}/fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2.json`;
const OLD_PACK_SHA256 =
  "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2";
const OLD_AUDIT_PATH =
  `${PREIMAGE_ROOT}/3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28.json`;
const OLD_AUDIT_SHA256 =
  "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28";
const OLD_STRICT_PATH =
  `${PREIMAGE_ROOT}/06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4.json`;
const OLD_STRICT_SHA256 =
  "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4";
const OLD_SIMPLE_PATH =
  `${PREIMAGE_ROOT}/fdb823e7e0923eff7cabb569e171680965dfa6d1e9edce36567fb4bf24ebc597.json`;
const OLD_SIMPLE_SHA256 =
  "fdb823e7e0923eff7cabb569e171680965dfa6d1e9edce36567fb4bf24ebc597";
const OLD_V3_ORACLE_PATH =
  `${PREIMAGE_ROOT}/8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62.json`;
const OLD_V3_ORACLE_SHA256 =
  "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62";
const OLD_VERSION_MANIFEST_PATH =
  `${PREIMAGE_ROOT}/f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92.json`;
const OLD_VERSION_MANIFEST_SHA256 =
  "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92";
const DECLARED_SIMPLE_LEDGER_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/declared-simple-ledger.json";
const DECLARED_SIMPLE_LEDGER_SHA256 =
  "11ad86d97706a08379df4b75630bfe35e73a7e2dba257ce0e435044d03784284";

export const HK_EASE_EXACT3_PHASE2B_REQUIRED_INPUT_PATHS = [
  INDEPENDENT_RECEIPT_PATH,
  PHASE2A_AUTHORITY_PATH,
  PHASE2A_QUESTION_PATH,
  PHASE2A_AUDIT_PATH,
  PHASE2A_STRICT_PATH,
  PHASE2A_HISTORY_PATH,
  PHASE2A_VERSION_DELTA_PATH,
  OLD_PACK_PATH,
  OLD_AUDIT_PATH,
  OLD_STRICT_PATH,
  OLD_SIMPLE_PATH,
  OLD_V3_ORACLE_PATH,
  OLD_VERSION_MANIFEST_PATH,
  DECLARED_SIMPLE_LEDGER_PATH,
  SEMANTICS_PATH
] as const;

const PINNED_JSON_INPUTS = {
  independentReceipt: [INDEPENDENT_RECEIPT_PATH, INDEPENDENT_RECEIPT_SHA256],
  phase2aAuthority: [PHASE2A_AUTHORITY_PATH, PHASE2A_AUTHORITY_SHA256],
  phase2aQuestionRows: [PHASE2A_QUESTION_PATH, PHASE2A_QUESTION_SHA256],
  phase2aAuditRows: [PHASE2A_AUDIT_PATH, PHASE2A_AUDIT_SHA256],
  phase2aStrictRows: [PHASE2A_STRICT_PATH, PHASE2A_STRICT_SHA256],
  phase2aHistory: [PHASE2A_HISTORY_PATH, PHASE2A_HISTORY_SHA256],
  phase2aVersionDelta: [PHASE2A_VERSION_DELTA_PATH, PHASE2A_VERSION_DELTA_SHA256],
  oldPack: [OLD_PACK_PATH, OLD_PACK_SHA256],
  oldAudit: [OLD_AUDIT_PATH, OLD_AUDIT_SHA256],
  oldStrict: [OLD_STRICT_PATH, OLD_STRICT_SHA256],
  oldSimple: [OLD_SIMPLE_PATH, OLD_SIMPLE_SHA256],
  oldV3Oracle: [OLD_V3_ORACLE_PATH, OLD_V3_ORACLE_SHA256],
  oldVersionManifest: [OLD_VERSION_MANIFEST_PATH, OLD_VERSION_MANIFEST_SHA256],
  declaredSimpleLedger: [DECLARED_SIMPLE_LEDGER_PATH, DECLARED_SIMPLE_LEDGER_SHA256]
} as const;

const FORBIDDEN_LIVE_INVENTORY = [
  ["data/generated-content/hk-ease-practice-bank-v2/question-pack.json", OLD_PACK_SHA256],
  ["data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json", OLD_AUDIT_SHA256],
  ["data/generated-content/hk-ease-practice-bank-v2/response-contracts.json", OLD_STRICT_SHA256],
  ["data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json", OLD_SIMPLE_SHA256],
  ["data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json", OLD_V3_ORACLE_SHA256],
  ["data/historical/hongKongQuestions-hk-ease-39847.json",
    "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1"],
  ["data/historical/hongKongQuestionVersionManifest.json", OLD_VERSION_MANIFEST_SHA256],
  ["data/questions.ts", "96d90f3c090b14bd7797155ffcbb20edcbf2230147a945f6c02ec32a470dbca8"],
  ["data/hongKongEasePracticeQuestions.ts",
    "01bf8aef5f76dfa46d17b357b110957fa551ba12fd98027315a1a8e825f40137"],
  ["data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle-v4.json",
    "8f306dc2d34b3595e70c0f8ef55345dc321fdae97278cb404d499d40635e2e9d"],
  ["lib/hongKongEaseIndependentOracleV4.ts",
    "11c46a9ed03fe592065db05e579165c9a5bf65a660be948d6d582cf10dd5be8c"],
  ["lib/hongKongEaseIndependentOracleV4.test.ts",
    "cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472"],
  ["lib/server/hongKongEaseResponseContracts.ts",
    "1ebefbb799f3f5b64f57ae9beff0f5641939eb5ea6f81aa93f5fe9fc21def3f1"],
  ["lib/fullQuestionBankSolvability.test.ts",
    "f964d1f2d11dbd5eeb8c1ebf2aea5a3bdf73d73189ed511fa68dc09d2ebe984c"],
  ["coordination/content-qa/hk-question-bank-evidence-runner.mjs",
    "7288e9d91fe6e6057b22a2c5d35c2237bd07588ace11d8141729c539f64f052d"]
] as const;

export const HK_EASE_EXACT3_PHASE2B_FORBIDDEN_LIVE_PATHS =
  FORBIDDEN_LIVE_INVENTORY.map(([path]) => path);

const ORDERED_BASE_IDS = ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"] as const;
const SOURCE_INDICES = [187, 188, 693] as const;

const EXPECTED_FIXED_OUTPUTS: Record<string, { sha256: string; byteLength: number }> = {
  [QUESTION_OUTPUT_PATH]: {
    sha256: "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf",
    byteLength: 1_435_398
  },
  [AUDIT_OUTPUT_PATH]: {
    sha256: "3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a",
    byteLength: 890_576
  },
  [STRICT_OUTPUT_PATH]: {
    sha256: "86333f5482a6a90da42c4ae12d575df8e2859409ff12de18032122a6c67c2b2c",
    byteLength: 298_862
  },
  [SIMPLE_OUTPUT_PATH]: {
    sha256: "d5f226b600e98cd4cfa1df6497137a0844e0f9685d8f87e4a6e1130aaa5c3d41",
    byteLength: 1_259_409
  },
  [HISTORY_OUTPUT_PATH]: {
    sha256: PHASE2A_HISTORY_SHA256,
    byteLength: 13_338
  },
  [VERSION_OUTPUT_PATH]: {
    sha256: "abf8da2300978b554efa07d96c5b70e721a9f0977e190a3f86105388591dfe8d",
    byteLength: 84_368
  }
};

function fail(code: string, detail?: string): never {
  throw new Error(detail ? `${code}: ${detail}` : code);
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function prettyJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertRecord(value: unknown, code: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  return value as JsonRecord;
}

function assertPhysicalFile(root: string, path: string, code: string) {
  const physicalRoot = realpathSync(root);
  const absolute = resolve(physicalRoot, path);
  const rel = relative(physicalRoot, absolute);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || resolve(absolute) !== absolute) {
    fail(code, path);
  }
  if (!existsSync(absolute)) fail(code, `${path}:missing`);
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(code, `${path}:not-regular`);
  const physical = realpathSync(absolute);
  const physicalRel = relative(physicalRoot, physical);
  if (!physicalRel || physicalRel === ".." || physicalRel.startsWith(`..${sep}`)) {
    fail(code, `${path}:physical-escape`);
  }
  return absolute;
}

function readExactJson(root: string, path: string, expectedSha256: string, code: string) {
  const absolute = assertPhysicalFile(root, path, code);
  const bytes = readFileSync(absolute);
  if (sha256(bytes) !== expectedSha256) fail(code, `${path}:sha256`);
  try {
    return JSON.parse(bytes.toString("utf8")) as JsonRecord;
  } catch {
    fail(code, `${path}:json`);
  }
}

function assertPinnedJson(value: JsonRecord, expectedSha256: string, code: string) {
  if (sha256(prettyJson(value)) !== expectedSha256) fail(code);
}

function sourceSha(root: string, path: string, expected?: string) {
  const actual = sha256(readFileSync(assertPhysicalFile(root, path, "PHASE2B_SOURCE_BINDING_INVALID")));
  if (expected && actual !== expected) fail("PHASE2B_SOURCE_BINDING_INVALID", path);
  return actual;
}

export function verifyHongKongEaseExact3Phase2BForbiddenLiveInventory(repositoryRoot: string) {
  for (const [path, expectedSha256] of FORBIDDEN_LIVE_INVENTORY) {
    const actual = sha256(readFileSync(
      assertPhysicalFile(repositoryRoot, path, "PHASE2B_FORBIDDEN_LIVE_DRIFT")
    ));
    if (actual !== expectedSha256) fail("PHASE2B_FORBIDDEN_LIVE_DRIFT", path);
  }
}

export function readHongKongEaseExact3Phase2BDataPlaneInputs(repositoryRoot: string) {
  const result: JsonRecord = {};
  for (const [key, [path, expectedSha256]] of Object.entries(PINNED_JSON_INPUTS)) {
    result[key] = readExactJson(
      repositoryRoot,
      path,
      expectedSha256,
      key === "independentReceipt"
        ? "PHASE2B_INDEPENDENT_RECEIPT_INVALID"
        : "PHASE2B_PINNED_INPUT_DRIFT"
    );
  }
  sourceSha(repositoryRoot, SEMANTICS_PATH, SEMANTICS_SHA256);
  return result;
}

function assertIndependentReceipt(root: string, receipt: JsonRecord, inputs: JsonRecord) {
  if (sha256(JSON.stringify(receipt)) !== INDEPENDENT_RECEIPT_CANONICAL_SHA256) {
    fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");
  }
  if (!sameJson(Object.keys(receipt), [
    "schemaVersion", "status", "detachedPayloadBinding", "reviewPayload"
  ])) fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");
  if (
    receipt.schemaVersion !== "hk-ease-exact3-phase2b-independent-oracle-overlay-review-v2" ||
    receipt.status !== "independent-review-approved-for-candidate-overlay-not-live-promotion"
  ) fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");
  const detached = {
    schemaVersion: receipt.schemaVersion,
    status: receipt.status,
    reviewPayload: receipt.reviewPayload
  };
  if (
    receipt.detachedPayloadBinding?.sha256 !== INDEPENDENT_RECEIPT_DETACHED_SHA256 ||
    sha256(JSON.stringify(detached)) !== INDEPENDENT_RECEIPT_DETACHED_SHA256
  ) fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");

  const review = assertRecord(receipt.reviewPayload, "PHASE2B_INDEPENDENT_RECEIPT_INVALID");
  if (
    review.reviewer?.reviewerIsCandidateBuilder !== false ||
    review.reviewer?.reviewerIsFuturePromotionBuilder !== false ||
    review.independencePolicy?.artifactMayBeWrittenByFuturePromotionBuilder !== false ||
    review.independencePolicy?.selfGeneratedReviewEvidenceForbidden !== true ||
    review.promotionBoundary?.candidateOverlayApproved !== true ||
    review.promotionBoundary?.livePromotionAuthorized !== false ||
    review.promotionBoundary?.runtimeDispatchAuthorized !== false ||
    review.promotionBoundary?.historyPromotionAuthorized !== false ||
    review.promotionBoundary?.releaseAuthorized !== false
  ) fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");
  if (
    !sameJson(review.targetCoordinateBinding?.orderedBaseIds, ORDERED_BASE_IDS) ||
    !sameJson(review.targetCoordinateBinding?.sourceIndicesZeroBased, SOURCE_INDICES) ||
    review.targetCoordinateBinding?.acceptedSurfaceCount !== 35 ||
    review.targetCoordinateBinding?.negativeProbeCount !== 30 ||
    review.requiredMutationNegatives?.length !== 13
  ) fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");

  const bindingChecks = [
    ["oldV3Oracle", OLD_V3_ORACLE_PATH, OLD_V3_ORACLE_SHA256],
    ["oldQuestionPack", OLD_PACK_PATH, OLD_PACK_SHA256]
  ] as const;
  for (const [key, snapshotPath, expectedSha256] of bindingChecks) {
    const binding = review.sourceBindings?.[key];
    if (
      binding?.sha256 !== expectedSha256 ||
      binding?.immutableSnapshot?.physicalPath !== snapshotPath ||
      binding?.immutableSnapshot?.sha256 !== expectedSha256 ||
      binding?.dualKeyResolutionPolicy?.preimageAuthority !== "immutableSnapshot" ||
      binding?.dualKeyResolutionPolicy?.missingSnapshotFallbackAllowed !== false ||
      binding?.dualKeyResolutionPolicy?.livePathFallbackAllowed !== false
    ) fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");
    if (sourceSha(root, snapshotPath) !== expectedSha256) {
      fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");
    }
  }
  if (
    review.sourceBindings?.phase2aAuthority?.sha256 !== PHASE2A_AUTHORITY_SHA256 ||
    review.sourceBindings?.phase2aQuestionSuccessorRows?.sha256 !== PHASE2A_QUESTION_SHA256
  ) fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");

  const rowReviews = review.rowReviews;
  if (!Array.isArray(rowReviews) || rowReviews.length !== 3) {
    fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");
  }
  const surfaces = rowReviews.flatMap((row: JsonRecord) => row.acceptedAnswers ?? []);
  const negatives = rowReviews.flatMap(
    (row: JsonRecord) => row.negativeProbeReview?.probes ?? []
  );
  if (surfaces.length !== 35 || negatives.length !== 30) {
    fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");
  }

  const rawQuestions = inputs.phase2aQuestionRows.questions;
  const strictEntries = new Map<string, JsonRecord>(
    inputs.phase2aStrictRows.entries.map(
      (entry: JsonRecord): [string, JsonRecord] => [entry.baseId, entry.postimage]
    )
  );
  for (let offset = 0; offset < rowReviews.length; offset += 1) {
    const row = rowReviews[offset];
    const baseId = ORDERED_BASE_IDS[offset];
    const raw = rawQuestions[offset];
    if (
      row.baseId !== baseId ||
      row.sourceIndexZeroBased !== SOURCE_INDICES[offset] ||
      row.phase2aRawV3QuestionId !== `${baseId}-v3` ||
      row.productionNormalizedBaseQuestionId !== baseId ||
      raw.id !== `${baseId}-v3` ||
      sha256(JSON.stringify(raw)) !== row.phase2aRawV3QuestionObjectSha256 ||
      row.canonicalAnswer !== raw.answer ||
      !sameJson(row.acceptedAnswers, raw.acceptedAnswers) ||
      row.acceptedAnswerFormCount !== raw.acceptedAnswers.length ||
      row.acceptedAnswersSha256 !== sha256(JSON.stringify(raw.acceptedAnswers)) ||
      row.canonicalAnswer !== row.acceptedAnswers[0]
    ) fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID", baseId);
    const normalized = structuredClone(raw);
    normalized.id = baseId;
    if (
      sha256(JSON.stringify(normalized)) !== row.productionNormalizedBaseQuestionObjectSha256
    ) fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID", `${baseId}:normalized`);
    const contract = strictEntries.get(baseId);
    if (!contract) fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID", `${baseId}:contract`);
    for (const accepted of row.acceptedAnswers) {
      if (!evaluateHongKongEaseExact3Phase2AContract(contract, accepted)) {
        fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID", `${baseId}:false-red`);
      }
    }
    for (const probe of row.negativeProbeReview.probes) {
      if (probe.expected !== "reject" ||
          evaluateHongKongEaseExact3Phase2AContract(contract, probe.input)) {
        fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID", `${baseId}:false-green`);
      }
    }
  }
  if (!sameJson(
    rowReviews.map((row: JsonRecord) =>
      row.calculationDisposition.calculationIsStrictNegative),
    [true, true, false]
  )) fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");
}

function assertInputs(repositoryRoot: string, inputs: JsonRecord) {
  for (const [key, [, expectedSha256]] of Object.entries(PINNED_JSON_INPUTS)) {
    const value = assertRecord(inputs[key], "PHASE2B_PINNED_INPUT_DRIFT");
    if (key === "independentReceipt") {
      if (sha256(JSON.stringify(value)) !== INDEPENDENT_RECEIPT_CANONICAL_SHA256) {
        fail("PHASE2B_INDEPENDENT_RECEIPT_INVALID");
      }
    } else {
      assertPinnedJson(value, expectedSha256, "PHASE2B_PINNED_INPUT_DRIFT");
    }
  }
  sourceSha(repositoryRoot, SEMANTICS_PATH, SEMANTICS_SHA256);
  assertIndependentReceipt(repositoryRoot, inputs.independentReceipt, inputs);
}

function replaceRowsByBaseId(
  targetEntries: JsonRecord[],
  wrappedPostimages: JsonRecord[],
  code: string
) {
  for (const wrapped of wrappedPostimages) {
    const index = targetEntries.findIndex((entry) => entry.baseId === wrapped.baseId);
    if (index < 0) fail(code, wrapped.baseId);
    targetEntries[index] = structuredClone(wrapped.postimage);
  }
}

function leafComponentKindCounts(entries: JsonRecord[]) {
  const counts: Record<string, number> = {};
  const visit = (contract: JsonRecord) => {
    if (contract.kind === "all-of" || contract.kind === "any-of") {
      for (const nested of contract.params?.contracts ?? []) visit(nested);
      return;
    }
    if (contract.kind === "reviewed-exact-surface-forms") return;
    if (typeof contract.kind !== "string") fail("PHASE2B_AUDIT_INVALID");
    counts[contract.kind] = (counts[contract.kind] ?? 0) + 1;
  };
  for (const entry of entries) visit(entry);
  return counts;
}

function buildQuestionPack(inputs: JsonRecord) {
  const pack = structuredClone(inputs.oldPack);
  if (!Array.isArray(pack.questions) || pack.questions.length !== 701) {
    fail("PHASE2B_QUESTION_PACK_INVALID");
  }
  for (let offset = 0; offset < ORDERED_BASE_IDS.length; offset += 1) {
    const baseId = ORDERED_BASE_IDS[offset];
    const raw = structuredClone(inputs.phase2aQuestionRows.questions[offset]);
    if (raw.id !== `${baseId}-v3`) fail("PHASE2B_QUESTION_PACK_INVALID", baseId);
    raw.id = baseId;
    if (pack.questions[SOURCE_INDICES[offset]].id !== baseId) {
      fail("PHASE2B_QUESTION_PACK_INVALID", `${baseId}:index`);
    }
    pack.questions[SOURCE_INDICES[offset]] = raw;
  }
  const review = inputs.independentReceipt.reviewPayload;
  const normalized = review.aggregateExpectations.normalizedBaseProduction;
  if (
    sha256(JSON.stringify(pack.questions)) !==
      normalized.questionPackPayloads.rowsPayloadSha256 ||
    sha256(prettyJson(pack)) !== normalized.questionPackPayloads.fullPackSha256 ||
    Buffer.byteLength(prettyJson(pack)) !== normalized.questionPackPayloads.fullPackByteLength
  ) fail("PHASE2B_QUESTION_PACK_INVALID");
  const targetRows = SOURCE_INDICES.map((index) => pack.questions[index]);
  const unchangedRows = pack.questions.filter((_: unknown, index: number) =>
    !SOURCE_INDICES.includes(index as typeof SOURCE_INDICES[number]));
  if (
    sha256(JSON.stringify(targetRows)) !==
      normalized.questionPackPayloads.normalizedTarget3Rows.payloadSha256 ||
    sha256(JSON.stringify(unchangedRows)) !==
      normalized.questionPackPayloads.unchanged698Rows.payloadSha256
  ) fail("PHASE2B_QUESTION_PACK_INVALID");
  return pack;
}

function buildAudit(inputs: JsonRecord, packSha256: string) {
  const audit = structuredClone(inputs.oldAudit);
  replaceRowsByBaseId(audit.entries, inputs.phase2aAuditRows.entries, "PHASE2B_AUDIT_INVALID");
  const positiveProbeCount = audit.entries.reduce(
    (sum: number, entry: JsonRecord) => sum + entry.positiveProbes.length,
    0
  );
  const negativeProbeCount = audit.entries.reduce(
    (sum: number, entry: JsonRecord) => sum + entry.negativeProbes.length,
    0
  );
  const positiveProbeInventorySha256 = sha256(JSON.stringify(
    audit.entries.map(({ baseId, positiveProbes }: JsonRecord) => ({ baseId, positiveProbes }))
  ));
  const negativeProbeInventorySha256 = sha256(JSON.stringify(
    audit.entries.map(({ baseId, negativeProbes }: JsonRecord) => ({ baseId, negativeProbes }))
  ));
  for (const artifact of audit.sourceArtifacts) {
    if (artifact.role === "final-remediated-candidate") artifact.sha256 = packSha256;
  }
  audit.coverage.componentKindCounts = leafComponentKindCounts(audit.entries);
  audit.coverage.positiveProbeCount = positiveProbeCount;
  audit.coverage.negativeProbeCount = negativeProbeCount;
  audit.coverage.candidateSha256 = packSha256;
  audit.coverage.positiveProbeInventorySha256 = positiveProbeInventorySha256;
  audit.coverage.negativeProbeInventorySha256 = negativeProbeInventorySha256;
  if (
    positiveProbeCount !== 584 ||
    negativeProbeCount !== 581 ||
    positiveProbeInventorySha256 !==
      "af50312a607d02244e3733bfa192a80f5dc5ffd53c1d0e186497a9759de9c2e9" ||
    negativeProbeInventorySha256 !==
      "3463a895a11ec4053753c52aa8cd77e91e992b3107a1c89c05f069a6fcc242ce" ||
    audit.coverage.componentKindCounts["multipart-response"] !== 73 ||
    audit.coverage.componentKindCounts["exact3-named-classified-number-groups-v1"] !== 2 ||
    audit.coverage.componentKindCounts["exact3-labelled-divisibility-matrix-v1"] !== 1 ||
    audit.coverage.componentKindCounts["classified-number-groups"] !== undefined
  ) fail("PHASE2B_AUDIT_INVALID");
  return audit;
}

function buildStrict(inputs: JsonRecord, packSha256: string, auditSha256: string) {
  const strict = structuredClone(inputs.oldStrict);
  replaceRowsByBaseId(strict.entries, inputs.phase2aStrictRows.entries, "PHASE2B_STRICT_INVALID");
  strict.candidateSha256 = packSha256;
  strict.auditSha256 = auditSha256;
  strict.positiveProbeCount = 584;
  strict.negativeProbeCount = 581;
  if (
    strict.entries.length !== 344 ||
    strict.positiveProbeCount !== 584 ||
    strict.negativeProbeCount !== 581
  ) fail("PHASE2B_STRICT_INVALID");
  return strict;
}

function buildSimple(inputs: JsonRecord, packSha256: string, strictSha256: string) {
  const simple = structuredClone(inputs.oldSimple);
  if (
    simple.declaredSimpleLedgerSha256 !== DECLARED_SIMPLE_LEDGER_SHA256 ||
    simple.reviewedSimpleQuestionCount !== 357 ||
    simple.strictQuestionCount !== 344
  ) fail("PHASE2B_SIMPLE_INVALID");
  simple.candidateSha256 = packSha256;
  simple.sourceEvidenceSha256ByPath[
    "data/generated-content/hk-ease-practice-bank-v2/question-pack.json"
  ] = packSha256;
  simple.sourceEvidenceSha256ByPath[
    "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json"
  ] = strictSha256;
  return simple;
}

function buildOverlay(inputs: JsonRecord, packSha256: string) {
  const review = inputs.independentReceipt.reviewPayload;
  const overlayRows: JsonRecord[] = [];
  const appliedRows = structuredClone(inputs.oldV3Oracle.questions);
  const preserveExactly = review.oracleFieldPolicy.preserveExactly;
  for (let offset = 0; offset < review.rowReviews.length; offset += 1) {
    const rowReview = review.rowReviews[offset];
    const index = SOURCE_INDICES[offset];
    const before = inputs.oldV3Oracle.questions[index];
    if (
      before.baseId !== rowReview.baseId ||
      sha256(JSON.stringify(before)) !== rowReview.oldOracleRowSha256 ||
      before.independentCalculationAnswer !==
        rowReview.calculationDisposition.independentCalculationAnswer
    ) fail("PHASE2B_ORACLE_OVERLAY_INVALID", rowReview.baseId);
    const after = structuredClone(before);
    after.independentlyReviewedAnswer = rowReview.canonicalAnswer;
    after.differsFromReviewedAnswer = rowReview.calculationDisposition.differsFromReviewedAnswer;
    after.calculationIsStrictNegative =
      rowReview.calculationDisposition.calculationIsStrictNegative;
    after.acceptedAnswerFormCount = rowReview.acceptedAnswerFormCount;
    after.acceptedAnswersSha256 = rowReview.acceptedAnswersSha256;
    after.questionObjectSha256 = rowReview.productionNormalizedBaseQuestionObjectSha256;
    for (const key of preserveExactly) {
      if (!sameJson(after[key], before[key])) {
        fail("PHASE2B_ORACLE_OVERLAY_INVALID", `${rowReview.baseId}:${key}`);
      }
    }
    if (
      sha256(JSON.stringify(after)) !==
        rowReview.productionNormalizedBaseOverlayOracleRowSha256
    ) fail("PHASE2B_ORACLE_OVERLAY_INVALID", `${rowReview.baseId}:row-sha`);
    overlayRows.push(after);
    appliedRows[index] = after;
  }
  const normalized = review.aggregateExpectations.normalizedBaseProduction;
  const unchanged = appliedRows.filter((_: unknown, index: number) =>
    !SOURCE_INDICES.includes(index as typeof SOURCE_INDICES[number]));
  if (
    sha256(JSON.stringify(overlayRows)) !==
      normalized.oracleOverlayPayloads.overlayRowsPayloadSha256 ||
    sha256(JSON.stringify(appliedRows)) !==
      normalized.oracleOverlayPayloads.appliedQuestionsPayloadSha256 ||
    sha256(JSON.stringify(unchanged)) !==
      normalized.oracleOverlayPayloads.unchanged698OracleRowsPayloadSha256
  ) fail("PHASE2B_ORACLE_OVERLAY_INVALID");
  const aggregate = review.aggregateExpectations.semanticInvariantAcrossIdNormalization;
  if (
    appliedRows.reduce((sum: number, row: JsonRecord) =>
      sum + row.acceptedAnswerFormCount, 0) !== aggregate.acceptedAnswerFormCount ||
    appliedRows.filter((row: JsonRecord) => row.differsFromReviewedAnswer).length !==
      aggregate.calculationDifferenceCount ||
    appliedRows.filter((row: JsonRecord) => row.calculationIsStrictNegative).length !==
      aggregate.strictNegativeCalculationCount ||
    sha256(JSON.stringify(appliedRows.map(
      (row: JsonRecord) => [row.baseId, row.independentlyReviewedAnswer]
    ))) !== aggregate.independentlyReviewedAnswerPayloadSha256 ||
    sha256(JSON.stringify(appliedRows.map(
      (row: JsonRecord) => [row.baseId, row.independentCalculationAnswer]
    ))) !== aggregate.independentCalculationPayloadSha256
  ) fail("PHASE2B_ORACLE_OVERLAY_INVALID", "aggregate");
  return {
    schemaVersion: "hk-ease-exact3-phase2b-independent-answer-oracle-overlay-supplement-v2",
    status: "candidate-overlay-approved-not-live-promotion",
    sourceBindings: {
      independentReviewReceipt: {
        path: INDEPENDENT_RECEIPT_PATH,
        sha256: INDEPENDENT_RECEIPT_SHA256
      },
      oldV3OracleImmutablePreimage: {
        logicalPath: "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json",
        immutableSnapshotPath: OLD_V3_ORACLE_PATH,
        sha256: OLD_V3_ORACLE_SHA256,
        livePathFallbackAllowed: false
      },
      normalizedBaseQuestionPackCandidate: {
        path: QUESTION_OUTPUT_PATH,
        sha256: packSha256
      },
      phase2aAuthority: {
        path: PHASE2A_AUTHORITY_PATH,
        sha256: PHASE2A_AUTHORITY_SHA256
      },
      phase2aRawV3QuestionSuccessorRows: {
        path: PHASE2A_QUESTION_PATH,
        sha256: PHASE2A_QUESTION_SHA256,
        role: "provenance-only-not-final-question-coordinate"
      }
    },
    normalizationPolicy: structuredClone(review.normalizationPolicy),
    orderedBaseIds: [...ORDERED_BASE_IDS],
    sourceIndicesZeroBased: [...SOURCE_INDICES],
    rowCount: overlayRows.length,
    rowSha256: overlayRows.map((row) => sha256(JSON.stringify(row))),
    rowsPayloadSha256: sha256(JSON.stringify(overlayRows)),
    appliedOracleQuestionsPayloadSha256: sha256(JSON.stringify(appliedRows)),
    unchanged698OracleRowsPayloadSha256: sha256(JSON.stringify(unchanged)),
    aggregateExpectations: structuredClone(
      review.aggregateExpectations.semanticInvariantAcrossIdNormalization
    ),
    preservedFieldPolicy: {
      preserveExactly: structuredClone(preserveExactly),
      independentCalculationRewriteForbidden: true,
      rawV3QuestionHashesMayPopulateFinalOverlay: false,
      productionNormalizedBaseQuestionHashesRequired: true
    },
    fullOracleEnvelopeSha256Claimed: false,
    fullOracleEnvelopeSha256: null,
    questions: overlayRows,
    promotionBoundary: structuredClone(review.promotionBoundary)
  };
}

function buildVersionManifest(inputs: JsonRecord) {
  const manifest = structuredClone(inputs.oldVersionManifest);
  for (const entry of inputs.phase2aVersionDelta.entries) {
    Object.assign(manifest.activeIdByHistoricalId, entry.activeMappingPostimage);
  }
  manifest.activeIdByHistoricalId = Object.fromEntries(
    Object.entries(manifest.activeIdByHistoricalId).sort(([left], [right]) =>
      left.localeCompare(right))
  );
  manifest.retiredHistoricalIds = [...new Set([
    ...manifest.retiredHistoricalIds,
    ...inputs.phase2aVersionDelta.retiredHistoricalIdsAdded
  ])].sort((left, right) => left.localeCompare(right));
  if (
    Object.keys(manifest.activeIdByHistoricalId).length !== 1111 ||
    manifest.retiredHistoricalIds.length !== 1112
  ) fail("PHASE2B_VERSION_MANIFEST_INVALID");
  for (const baseId of ORDERED_BASE_IDS) {
    if (
      manifest.activeIdByHistoricalId[baseId] !== `${baseId}-v3` ||
      manifest.activeIdByHistoricalId[`${baseId}-v2`] !== `${baseId}-v3` ||
      manifest.activeIdByHistoricalId[`${baseId}-v3`] !== undefined ||
      manifest.retiredHistoricalIds.includes(`${baseId}-v3`)
    ) fail("PHASE2B_VERSION_MANIFEST_INVALID", baseId);
  }
  for (const [key, value] of Object.entries(manifest.activeIdByHistoricalId)) {
    if (manifest.activeIdByHistoricalId[value as string]) {
      fail("PHASE2B_VERSION_MANIFEST_INVALID", `${key}:chain`);
    }
    if (manifest.retiredHistoricalIds.includes(value)) {
      fail("PHASE2B_VERSION_MANIFEST_INVALID", `${key}:retired-target`);
    }
  }
  return manifest;
}

function dataSerialization(dataArtifacts: JsonRecord) {
  return Object.fromEntries(HK_EASE_EXACT3_PHASE2B_DATA_OUTPUT_PATHS.map((path) => [
    path,
    prettyJson(dataArtifacts[path])
  ]));
}

function assertFixedOutputs(serialized: Record<string, string>) {
  for (const [path, expected] of Object.entries(EXPECTED_FIXED_OUTPUTS)) {
    if (
      sha256(serialized[path]) !== expected.sha256 ||
      Buffer.byteLength(serialized[path]) !== expected.byteLength
    ) fail("PHASE2B_OUTPUT_DRIFT", path);
  }
}

function buildAuthority(
  repositoryRoot: string,
  serializedData: Record<string, string>
) {
  const forbiddenLiveInventory = FORBIDDEN_LIVE_INVENTORY.map(([path, expectedSha256]) => ({
    path,
    preMaterializationObservedSha256: expectedSha256,
    postMaterializationExpectedSha256: expectedSha256,
    candidateBuilderWriteTarget: false,
    candidateWriteAuthorized: false,
    disposition: path === "lib/hongKongEaseIndependentOracleV4.ts"
      ? "external-concurrent-successor-not-adopted-by-phase2b-data-plane"
      : "must-remain-byte-identical"
  }));
  const payload = {
    schemaVersion: "hk-ease-exact3-phase2b-data-plane-candidate-hold-authority-v1",
    status: "candidate-hold-not-promotable-until-phase3",
    builderBinding: {
      path: BUILDER_PATH,
      sha256: sourceSha(repositoryRoot, BUILDER_PATH)
    },
    focusedTestBinding: {
      path: FOCUSED_TEST_PATH,
      sha256: sourceSha(repositoryRoot, FOCUSED_TEST_PATH)
    },
    independentReviewReceipt: {
      path: INDEPENDENT_RECEIPT_PATH,
      sha256: INDEPENDENT_RECEIPT_SHA256,
      detachedPayloadSha256: INDEPENDENT_RECEIPT_DETACHED_SHA256,
      reviewerIndependentOfBuilder: true
    },
    requiredInputBindings: [
      ...Object.entries(PINNED_JSON_INPUTS).map(
        ([name, [path, expectedSha256]]): { name: string; path: string; sha256: string } =>
          ({ name, path, sha256: expectedSha256 })
      ),
      { name: "phase2aSemantics", path: SEMANTICS_PATH, sha256: SEMANTICS_SHA256 }
    ],
    outputPolicy: {
      exactDataArtifactCount: 7,
      exactControlArtifactCount: 1,
      dataArtifactsAreFullPostimages: true,
      authorityIsControlEvidenceNotAnEighthDataArtifact: true,
      materializationDirectory: CANDIDATE_DIRECTORY,
      fileMode: "0444"
    },
    outputBindings: HK_EASE_EXACT3_PHASE2B_DATA_OUTPUT_PATHS.map((path) => ({
      path,
      sha256: sha256(serializedData[path]),
      byteLength: Buffer.byteLength(serializedData[path]),
      classification: "isolated-full-data-postimage-candidate"
    })),
    forbiddenLiveInventory,
    promotion: {
      livePromotionAuthorized: false,
      runtimeDispatchAuthorized: false,
      historyPromotionAuthorized: false,
      v4RegenerationAuthorized: false,
      fullBankIntegrationAuthorized: false,
      canonicalRunnerAuthorized: false,
      releaseAuthorized: false,
      remainingGates: [
        "Phase2B.2 deterministic TypeScript/runtime apply candidate",
        "Phase2B.3 coherent V3 overlay consumption and historical regression closure",
        "V4 sanitized-supplement-oracle regeneration for the new hk-ease-1041 prompt",
        "full-bank and canonical runner integration",
        "A11 regression and A22 release evidence"
      ]
    }
  };
  return {
    ...payload,
    authorityPayloadSha256: sha256(JSON.stringify(payload))
  };
}

export function buildHongKongEaseExact3Phase2BDataPlaneCandidateFromInputs(
  repositoryRoot: string,
  inputs: JsonRecord
) {
  assertInputs(repositoryRoot, inputs);
  const pack = buildQuestionPack(inputs);
  const packBytes = prettyJson(pack);
  const packSha256 = sha256(packBytes);
  const audit = buildAudit(inputs, packSha256);
  const auditBytes = prettyJson(audit);
  const auditSha256 = sha256(auditBytes);
  const strict = buildStrict(inputs, packSha256, auditSha256);
  const strictBytes = prettyJson(strict);
  const strictSha256 = sha256(strictBytes);
  const simple = buildSimple(inputs, packSha256, strictSha256);
  const overlay = buildOverlay(inputs, packSha256);
  const history = structuredClone(inputs.phase2aHistory);
  const versionManifest = buildVersionManifest(inputs);
  const dataArtifacts: JsonRecord = {
    [QUESTION_OUTPUT_PATH]: pack,
    [AUDIT_OUTPUT_PATH]: audit,
    [STRICT_OUTPUT_PATH]: strict,
    [SIMPLE_OUTPUT_PATH]: simple,
    [OVERLAY_OUTPUT_PATH]: overlay,
    [HISTORY_OUTPUT_PATH]: history,
    [VERSION_OUTPUT_PATH]: versionManifest
  };
  const serializedData = dataSerialization(dataArtifacts);
  assertFixedOutputs(serializedData);
  const authority = buildAuthority(repositoryRoot, serializedData);
  return { dataArtifacts, authority };
}

export function buildHongKongEaseExact3Phase2BDataPlaneCandidate(repositoryRoot: string) {
  verifyHongKongEaseExact3Phase2BForbiddenLiveInventory(repositoryRoot);
  return buildHongKongEaseExact3Phase2BDataPlaneCandidateFromInputs(
    repositoryRoot,
    readHongKongEaseExact3Phase2BDataPlaneInputs(repositoryRoot)
  );
}

export function serializeHongKongEaseExact3Phase2BDataPlaneCandidate(repositoryRoot: string) {
  const built = buildHongKongEaseExact3Phase2BDataPlaneCandidate(repositoryRoot);
  const serialized = dataSerialization(built.dataArtifacts);
  serialized[HK_EASE_EXACT3_PHASE2B_AUTHORITY_PATH] = prettyJson(built.authority);
  return serialized;
}

function materialize(repositoryRoot: string) {
  verifyHongKongEaseExact3Phase2BForbiddenLiveInventory(repositoryRoot);
  const serialized = serializeHongKongEaseExact3Phase2BDataPlaneCandidate(repositoryRoot);
  for (const [path, bytes] of Object.entries(serialized)) {
    const absolute = resolve(repositoryRoot, path);
    mkdirSync(dirname(absolute), { recursive: true });
    if (existsSync(absolute)) {
      if (lstatSync(absolute).isSymbolicLink() || readFileSync(absolute, "utf8") !== bytes) {
        fail("PHASE2B_MATERIALIZATION_COLLISION", path);
      }
    } else {
      writeFileSync(absolute, bytes, { flag: "wx", mode: 0o444 });
    }
    chmodSync(absolute, 0o444);
  }
  verifyHongKongEaseExact3Phase2BForbiddenLiveInventory(repositoryRoot);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  materialize(repositoryRoot);
}
