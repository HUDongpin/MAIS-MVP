import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type JsonRecord = Record<string, any>;

const BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-exact3-phase2b-runtime-candidate.ts";
const FOCUSED_TEST_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2b-runtime-candidate.test.ts";
const SHADOW_TEST_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2b-runtime-shadow.test.ts";
const DATA_PLANE_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-data-plane-candidate";
const DATA_PLANE_AUTHORITY_PATH = `${DATA_PLANE_DIRECTORY}/candidate-hold-authority-v1.json`;

export const HONG_KONG_EASE_EXACT3_PHASE2B_RUNTIME_CANDIDATE_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-runtime-candidate";

const LOGICAL_TARGET_PATHS = [
  "data/hongKongEasePracticeQuestions.ts",
  "lib/hongKongQuestionVersioningContract.ts",
  "lib/hongKongQuestionVersioning.ts",
  "lib/server/hongKongEaseResponseContracts.ts"
] as const;

type LogicalTargetPath = (typeof LOGICAL_TARGET_PATHS)[number];

const SNAPSHOT_BASENAME_BY_TARGET: Record<LogicalTargetPath, string> = {
  "data/hongKongEasePracticeQuestions.ts": "data-hongKongEasePracticeQuestions.ts.snapshot",
  "lib/hongKongQuestionVersioningContract.ts": "lib-hongKongQuestionVersioningContract.ts.snapshot",
  "lib/hongKongQuestionVersioning.ts": "lib-hongKongQuestionVersioning.ts.snapshot",
  "lib/server/hongKongEaseResponseContracts.ts": "lib-server-hongKongEaseResponseContracts.ts.snapshot"
};

export const HONG_KONG_EASE_EXACT3_PHASE2B_RUNTIME_POSTIMAGE_PATHS =
  LOGICAL_TARGET_PATHS.map(
    (path) => `${HONG_KONG_EASE_EXACT3_PHASE2B_RUNTIME_CANDIDATE_DIRECTORY}/${SNAPSHOT_BASENAME_BY_TARGET[path]}`
  );

const SOURCE_PREIMAGE_SHA256_BY_PATH: Record<LogicalTargetPath, string> = {
  "data/hongKongEasePracticeQuestions.ts":
    "01bf8aef5f76dfa46d17b357b110957fa551ba12fd98027315a1a8e825f40137",
  "lib/hongKongQuestionVersioningContract.ts":
    "226230450e87dbefa7c89358d8121dac187b212aaba2738f2ccf18f5b13e844d",
  "lib/hongKongQuestionVersioning.ts":
    "66ef792de4ddb2bc6512217fe24a919284c24a5b5dbfb88cb03dcfd2a08a33f1",
  "lib/server/hongKongEaseResponseContracts.ts":
    "1ebefbb799f3f5b64f57ae9beff0f5641939eb5ea6f81aa93f5fe9fc21def3f1"
};

const EXPECTED_POSTIMAGE_BINDING_BY_PATH: Record<
  LogicalTargetPath,
  { sha256: string; byteLength: number }
> = {
  "data/hongKongEasePracticeQuestions.ts": {
    sha256: "692872955440282bd21426e1fa04e18368ae91b8d3b516bc0fdb97b568cb3dff",
    byteLength: 27329
  },
  "lib/hongKongQuestionVersioningContract.ts": {
    sha256: "8c450a89cb767b4864a6c739dd4849c69616245c86f0a36a4db8554a5044fd0a",
    byteLength: 558
  },
  "lib/hongKongQuestionVersioning.ts": {
    sha256: "43001bbdc9a57db6ef3c90aa8bd42913baea6180653436135d94227258252df4",
    byteLength: 25687
  },
  "lib/server/hongKongEaseResponseContracts.ts": {
    sha256: "c3f462f619b0b90bf4a5a98475367927a7209a21300d59695b6e0a3ea97f03dd",
    byteLength: 80546
  }
};

const DATA_PLANE_AUTHORITY_SHA256 =
  "572b0c9826db2c11fe3ec235a375676a82e6155283b8fa20a5a78f5f161eba16";
const DATA_PLANE_AUTHORITY_PAYLOAD_SHA256 =
  "984c473210ca7fa8af6dcd6f90a8d1bb1754189d3986a9a5e58cfc8ff33a4622";

const DATA_ARTIFACT_BINDINGS = {
  pack: {
    path: `${DATA_PLANE_DIRECTORY}/full-question-pack-base-id-v1.json`,
    sha256: "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf"
  },
  audit: {
    path: `${DATA_PLANE_DIRECTORY}/full-response-contract-audit-v1.json`,
    sha256: "3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a"
  },
  strict: {
    path: `${DATA_PLANE_DIRECTORY}/full-strict-response-contracts-v1.json`,
    sha256: "86333f5482a6a90da42c4ae12d575df8e2859409ff12de18032122a6c67c2b2c"
  },
  simple: {
    path: `${DATA_PLANE_DIRECTORY}/full-simple-response-contracts-v1.json`,
    sha256: "d5f226b600e98cd4cfa1df6497137a0844e0f9685d8f87e4a6e1130aaa5c3d41"
  },
  overlay: {
    path: `${DATA_PLANE_DIRECTORY}/independent-answer-oracle-exact3-overlay-supplement-v2.json`,
    sha256: "3b1b5b5a4e4034712086de8345b04e74e435f58e4c7c8ed73c5d801cfad4b19c"
  },
  history: {
    path: `${DATA_PLANE_DIRECTORY}/v3-history-v1.json`,
    sha256: "e5a696da5e8d5e1cc31259a6736d6d9974c08fdf25a57298a6958ffcd11b440b"
  },
  versionManifest: {
    path: `${DATA_PLANE_DIRECTORY}/full-question-version-manifest-v1.json`,
    sha256: "abf8da2300978b554efa07d96c5b70e721a9f0977e190a3f86105388591dfe8d"
  }
} as const;

const DATA_ARTIFACT_NAMES = Object.keys(DATA_ARTIFACT_BINDINGS) as Array<keyof typeof DATA_ARTIFACT_BINDINGS>;

export type HongKongEaseExact3Phase2BRuntimeCandidateInputs = {
  repositoryRoot: string;
  sourcePreimages: Record<LogicalTargetPath, string>;
  dataPlaneAuthority: JsonRecord;
  dataPlaneArtifacts: Record<keyof typeof DATA_ARTIFACT_BINDINGS, JsonRecord>;
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function prettyJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function fail(code: string, detail?: string): never {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function readText(repositoryRoot: string, relativePath: string) {
  const absolutePath = resolve(repositoryRoot, relativePath);
  const stat = lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("PHASE2B2_INPUT_NOT_REGULAR", relativePath);
  return readFileSync(absolutePath, "utf8");
}

function readJson(repositoryRoot: string, relativePath: string) {
  return JSON.parse(readText(repositoryRoot, relativePath)) as JsonRecord;
}

function sourceSha(repositoryRoot: string, relativePath: string) {
  return sha256(readText(repositoryRoot, relativePath));
}

function replaceOnce(source: string, before: string, after: string, label: string) {
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) fail("PHASE2B2_SOURCE_ANCHOR_DRIFT", `${label}:${occurrences}`);
  return source.replace(before, after);
}

function assertJsonArtifact(value: JsonRecord, expectedSha256: string, name: string) {
  if (sha256(prettyJson(value)) !== expectedSha256) {
    fail("PHASE2B2_DATA_ARTIFACT_DRIFT", name);
  }
}

function assertDataPlaneAuthority(authority: JsonRecord) {
  if (sha256(prettyJson(authority)) !== DATA_PLANE_AUTHORITY_SHA256) {
    fail("PHASE2B2_DATA_PLANE_AUTHORITY_DRIFT", "file-sha256");
  }
  const { authorityPayloadSha256, ...payload } = authority;
  if (
    authority.schemaVersion !== "hk-ease-exact3-phase2b-data-plane-candidate-hold-authority-v1" ||
    authority.status !== "candidate-hold-not-promotable-until-phase3" ||
    authorityPayloadSha256 !== DATA_PLANE_AUTHORITY_PAYLOAD_SHA256 ||
    sha256(JSON.stringify(payload)) !== DATA_PLANE_AUTHORITY_PAYLOAD_SHA256 ||
    authority.promotion?.livePromotionAuthorized !== false ||
    authority.promotion?.runtimeDispatchAuthorized !== false ||
    authority.promotion?.historyPromotionAuthorized !== false ||
    authority.outputPolicy?.exactDataArtifactCount !== 7
  ) {
    fail("PHASE2B2_DATA_PLANE_AUTHORITY_DRIFT", "payload");
  }
  const bindings = new Map(
    (authority.outputBindings as JsonRecord[]).map((binding) => [binding.path, binding.sha256])
  );
  for (const binding of Object.values(DATA_ARTIFACT_BINDINGS)) {
    if (bindings.get(binding.path) !== binding.sha256) {
      fail("PHASE2B2_DATA_PLANE_AUTHORITY_DRIFT", binding.path);
    }
  }
}

function assertInputs(inputs: HongKongEaseExact3Phase2BRuntimeCandidateInputs) {
  for (const path of LOGICAL_TARGET_PATHS) {
    if (sha256(inputs.sourcePreimages[path]) !== SOURCE_PREIMAGE_SHA256_BY_PATH[path]) {
      fail("PHASE2B2_SOURCE_PREIMAGE_DRIFT", path);
    }
  }
  assertDataPlaneAuthority(inputs.dataPlaneAuthority);
  for (const name of DATA_ARTIFACT_NAMES) {
    assertJsonArtifact(
      inputs.dataPlaneArtifacts[name],
      DATA_ARTIFACT_BINDINGS[name].sha256,
      name
    );
  }
}

export function loadHongKongEaseExact3Phase2BRuntimeCandidateInputs(
  repositoryRoot = process.cwd()
): HongKongEaseExact3Phase2BRuntimeCandidateInputs {
  const sourcePreimages = Object.fromEntries(
    LOGICAL_TARGET_PATHS.map((path) => [path, readText(repositoryRoot, path)])
  ) as Record<LogicalTargetPath, string>;
  const dataPlaneArtifacts = Object.fromEntries(
    DATA_ARTIFACT_NAMES.map((name) => [name, readJson(repositoryRoot, DATA_ARTIFACT_BINDINGS[name].path)])
  ) as Record<keyof typeof DATA_ARTIFACT_BINDINGS, JsonRecord>;
  return {
    repositoryRoot,
    sourcePreimages,
    dataPlaneAuthority: readJson(repositoryRoot, DATA_PLANE_AUTHORITY_PATH),
    dataPlaneArtifacts
  };
}

const LOADER_OVERLAY_IMPLEMENTATION = String.raw`
const exact3OverlayExpectedIds = ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"] as const;
const exact3OverlayExpectedIndices = [187, 188, 693] as const;
const exact3OverlayExpectedAcceptedHashes = {
  "hk-ease-10481": "ee40735aa81fc6ffa6f0bd4e71d9da27921cc29e49df55f9a205cf0e955ca398",
  "hk-ease-10496": "288cd547d53abdc352154c2980c6228204260b866ad5766b0d024834ec96cc69",
  "hk-ease-1041": "44b4b472092326c4d1e560d4eb902ca5a73f7b2ba79677e2a64d62e6da61fb94"
} as const;
const exact3OverlayExpectedQuestionHashes = {
  "hk-ease-10481": "c5f21c907bf74408e75a0ca2237d72d4c859f3cec43b1d4c1b143322b5d1e4f7",
  "hk-ease-10496": "04dee736b973cd14cf93a23840b8f4c7301a9db0ec2a0517d1b2382657981bf8",
  "hk-ease-1041": "8f7255c66067c2c1b777a4733cea48ad8f5267ebebbc15d51b2b8e62965d2f6e"
} as const;

function exactJson(value: unknown, expected: unknown, label: string) {
  if (JSON.stringify(value) !== JSON.stringify(expected)) throw new Error(label + ": exact JSON drift.");
}

function applyHongKongEaseExact3OracleOverlay(
  preimage: ReturnType<typeof parseIndependentOracle>,
  overlayValue: unknown,
  questions: GeneratedHongKongEasePracticeQuestion[]
) {
  const overlay = record(overlayValue, "HK EASE exact3 oracle overlay");
  exactString(
    overlay.schemaVersion,
    "hk-ease-exact3-phase2b-independent-answer-oracle-overlay-supplement-v2",
    "HK EASE exact3 overlay schemaVersion"
  );
  exactString(
    overlay.status,
    "candidate-overlay-approved-not-live-promotion",
    "HK EASE exact3 overlay status"
  );
  const sourceBindings = record(overlay.sourceBindings, "HK EASE exact3 overlay sourceBindings");
  const oldOracleBinding = record(
    sourceBindings.oldV3OracleImmutablePreimage,
    "HK EASE exact3 overlay old oracle binding"
  );
  exactString(
    oldOracleBinding.sha256,
    HONG_KONG_EASE_V3_INDEPENDENT_ORACLE_SHA256,
    "HK EASE exact3 overlay old oracle SHA"
  );
  if (oldOracleBinding.livePathFallbackAllowed !== false) {
    throw new Error("HK EASE exact3 overlay may not reinterpret live bytes as its V3 preimage.");
  }
  const packBinding = record(
    sourceBindings.normalizedBaseQuestionPackCandidate,
    "HK EASE exact3 overlay pack binding"
  );
  exactString(
    packBinding.sha256,
    HONG_KONG_EASE_V2_QUESTION_PACK_SHA256,
    "HK EASE exact3 overlay pack SHA"
  );
  exactJson(overlay.orderedBaseIds, exact3OverlayExpectedIds, "HK EASE exact3 overlay ordered IDs");
  exactJson(overlay.sourceIndicesZeroBased, exact3OverlayExpectedIndices, "HK EASE exact3 overlay indices");
  if (
    overlay.rowCount !== 3 ||
    overlay.rowsPayloadSha256 !== "53029136ba4f0b57a590bd6c1c54df3eff4aef3483cc6e15c68067a6098b79d3" ||
    overlay.appliedOracleQuestionsPayloadSha256 !== "82717bfa8594a9656c360b9a2131aa5cf7884719ac09fff0d10003bb2936ee2c" ||
    overlay.unchanged698OracleRowsPayloadSha256 !== "ece239d954002246ab497dd9579d9ea70bc03675dcf022edc7a8947f75eb02ed" ||
    !Array.isArray(overlay.questions) ||
    overlay.questions.length !== 3
  ) {
    throw new Error("HK EASE exact3 oracle overlay payload contract drifted.");
  }
  const aggregate = record(overlay.aggregateExpectations, "HK EASE exact3 overlay aggregates");
  if (
    aggregate.reviewedQuestionCount !== 701 ||
    aggregate.mathPassCount !== 701 ||
    aggregate.canonicalAnswerReviewCount !== 701 ||
    aggregate.acceptedAnswerFormsReviewed !== 1912 ||
    aggregate.acceptedAnswerFormCount !== 1912 ||
    aggregate.calculationDifferenceCount !== 167 ||
    aggregate.strictNegativeCalculationCount !== 64 ||
    aggregate.rowSpecificDerivationCount !== 234 ||
    aggregate.reviewMethodClassificationCount !== 467 ||
    aggregate.multipleChoiceReviewCount !== 90 ||
    aggregate.declaredSimpleQuestionCount !== 357
  ) {
    throw new Error("HK EASE exact3 oracle overlay aggregate contract drifted.");
  }
  const preservedFields = [
    "index", "baseId", "independentCalculationAnswer", "independentCalculationPurpose",
    "rowSpecificDerivation", "independentDerivation", "reviewMethodClassification",
    "mathStatus", "reviewer", "reviewArtifact"
  ] as const;
  const rows = preimage.rows.map((row) => ({ ...row }));
  for (const [overlayPosition, expectedBaseId] of exact3OverlayExpectedIds.entries()) {
    const sourceIndex = exact3OverlayExpectedIndices[overlayPosition];
    const candidate = record(overlay.questions[overlayPosition], expectedBaseId + " overlay row");
    const oldRow = preimage.rows[sourceIndex];
    const question = questions[sourceIndex];
    if (!oldRow || !question || oldRow.baseId !== expectedBaseId || question.id !== expectedBaseId) {
      throw new Error(expectedBaseId + ": exact3 overlay index/base join drifted.");
    }
    for (const field of preservedFields) {
      exactJson(candidate[field], oldRow[field], expectedBaseId + ": preserved oracle field " + field);
    }
    if (
      candidate.index !== sourceIndex ||
      candidate.baseId !== expectedBaseId ||
      candidate.independentlyReviewedAnswer !== question.answer ||
      candidate.differsFromReviewedAnswer !== true ||
      candidate.calculationIsStrictNegative !== (expectedBaseId !== "hk-ease-1041") ||
      candidate.acceptedAnswerFormCount !== question.acceptedAnswers.length ||
      candidate.acceptedAnswersSha256 !== exact3OverlayExpectedAcceptedHashes[expectedBaseId] ||
      candidate.questionObjectSha256 !== exact3OverlayExpectedQuestionHashes[expectedBaseId]
    ) {
      throw new Error(expectedBaseId + ": exact3 overlay reviewed-field binding drifted.");
    }
    rows[sourceIndex] = candidate as unknown as IndependentOracleRow;
  }
  if (
    rows.reduce((sum, row) => sum + row.acceptedAnswerFormCount, 0) !== 1912 ||
    rows.filter((row) => row.differsFromReviewedAnswer).length !== 167 ||
    rows.filter((row) => row.calculationIsStrictNegative).length !== 64 ||
    rows.filter((row) => row.rowSpecificDerivation).length !== 234
  ) {
    throw new Error("HK EASE exact3 applied oracle coverage drifted.");
  }
  return {
    status: preimage.status + "+exact3-independent-overlay-v2",
    rows
  };
}
`;

function buildLoaderPostimage(source: string) {
  let result = replaceOnce(
    source,
    'import independentOracleJson from "./generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json";\n',
    'import independentOracleJson from "./generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json";\n' +
      'import exact3OracleOverlayJson from "./generated-content/hk-ease-practice-bank-v2/exact3-independent-oracle-supplement.json";\n',
    "loader-overlay-import"
  );
  result = replaceOnce(
    result,
    'export const HONG_KONG_EASE_V2_QUESTION_PACK_SHA256 =\n  "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2" as const;\n',
    'export const HONG_KONG_EASE_V2_QUESTION_PACK_SHA256 =\n  "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf" as const;\n' +
      'export const HONG_KONG_EASE_V3_ORACLE_PREIMAGE_QUESTION_PACK_SHA256 =\n' +
      '  "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2" as const;\n',
    "loader-pack-sha"
  );
  result = replaceOnce(
    result,
    'export const HONG_KONG_EASE_V3_INDEPENDENT_ORACLE_SHA256 =\n  "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62" as const;\n',
    'export const HONG_KONG_EASE_V3_INDEPENDENT_ORACLE_SHA256 =\n' +
      '  "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62" as const;\n' +
      'export const HONG_KONG_EASE_EXACT3_ORACLE_OVERLAY_SHA256 =\n' +
      '  "3b1b5b5a4e4034712086de8345b04e74e435f58e4c7c8ed73c5d801cfad4b19c" as const;\n',
    "loader-overlay-sha"
  );
  result = replaceOnce(
    result,
    'exactString(oracle.candidateSha256, HONG_KONG_EASE_V2_QUESTION_PACK_SHA256, "HK EASE v2 oracle candidateSha256");',
    'exactString(oracle.candidateSha256, HONG_KONG_EASE_V3_ORACLE_PREIMAGE_QUESTION_PACK_SHA256, "HK EASE V3 oracle preimage candidateSha256");',
    "loader-oracle-preimage-binding"
  );
  result = replaceOnce(
    result,
    '  "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28",\n  "HK EASE v2 response-contract auditSha256"',
    '  "3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a",\n  "HK EASE v2 response-contract auditSha256"',
    "loader-audit-sha"
  );
  result = replaceOnce(
    result,
    "  contractManifest.positiveProbeCount !== 552 ||\n  contractManifest.negativeProbeCount !== 554 ||",
    "  contractManifest.positiveProbeCount !== 584 ||\n  contractManifest.negativeProbeCount !== 581 ||",
    "loader-probe-counts"
  );
  result = replaceOnce(
    result,
    '\nconst pack = record(questionPackJson, "HK EASE v2 question pack");',
    `\n${LOADER_OVERLAY_IMPLEMENTATION}\nconst pack = record(questionPackJson, "HK EASE v2 question pack");`,
    "loader-overlay-implementation"
  );
  result = replaceOnce(
    result,
    'const independentOracle = parseIndependentOracle(independentOracleJson);\nconst oracleById = new Map(independentOracle.rows.map((row) => [row.baseId, row]));',
    'const independentOraclePreimage = parseIndependentOracle(independentOracleJson);\n' +
      'const independentOracle = applyHongKongEaseExact3OracleOverlay(\n' +
      '  independentOraclePreimage,\n' +
      '  exact3OracleOverlayJson,\n' +
      '  generatedQuestions\n' +
      ');\n' +
      'const oracleById = new Map(independentOracle.rows.map((row) => [row.baseId, row]));',
    "loader-overlay-application"
  );
  return result;
}

function buildVersionContractPostimage(source: string) {
  return replaceOnce(
    source,
    'export const HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256 =\n  "39847b22bb9f83246cb2a55ebea78545205544248d37356be1f3ef1a1cdbee00" as const;\n',
    'export const HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256 =\n' +
      '  "39847b22bb9f83246cb2a55ebea78545205544248d37356be1f3ef1a1cdbee00" as const;\n\n' +
      'export const HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256 =\n' +
      '  "e5a696da5e8d5e1cc31259a6736d6d9974c08fdf25a57298a6958ffcd11b440b" as const;\n',
    "version-contract-exact3-history"
  );
}

const VERSIONING_EXACT3_VALIDATION = String.raw`
type Exact3V3HistorySnapshot = {
  schemaVersion: "hk-ease-exact3-phase2a-v3-history-v1";
  status: "phase2a-candidate-only-promotion-not-authorized";
  sourceBindings: {
    v2History: { path: string; sha256: string };
  };
  rowCount: number;
  orderedRowIds: string[];
  orderedRowIdSha256: string;
  rowsPayloadSha256: string;
  rowSha256: string[];
  questions: Question[];
  questionCount: number;
  frozenPredecessorPolicy: string;
};

const typedEaseExact3V3HistorySnapshot = easeExact3V3HistorySnapshot as Exact3V3HistorySnapshot;
const exact3HistoryIds = ["hk-ease-10481-v3", "hk-ease-10496-v3", "hk-ease-1041-v3"];
if (
  typedEaseExact3V3HistorySnapshot.schemaVersion !== "hk-ease-exact3-phase2a-v3-history-v1" ||
  typedEaseExact3V3HistorySnapshot.status !== "phase2a-candidate-only-promotion-not-authorized" ||
  typedEaseExact3V3HistorySnapshot.rowCount !== 3 ||
  typedEaseExact3V3HistorySnapshot.questionCount !== 3 ||
  typedEaseExact3V3HistorySnapshot.questions.length !== 3 ||
  JSON.stringify(typedEaseExact3V3HistorySnapshot.orderedRowIds) !== JSON.stringify(exact3HistoryIds) ||
  JSON.stringify(typedEaseExact3V3HistorySnapshot.questions.map((question) => question.id)) !== JSON.stringify(exact3HistoryIds) ||
  typedEaseExact3V3HistorySnapshot.orderedRowIdSha256 !== "f080f64c2ac8b199571165cdc21eb386379feb5976bc48e5ab8ca7aa3894c380" ||
  typedEaseExact3V3HistorySnapshot.rowsPayloadSha256 !== "354ea19dda82fe00464757cf2304b5fa3530311c7425f34d7576a72d884cf0b1" ||
  typedEaseExact3V3HistorySnapshot.sourceBindings.v2History.sha256 !== "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1" ||
  typedEaseExact3V3HistorySnapshot.frozenPredecessorPolicy !== "v2-history-bytes-remain-immutable"
) {
  throw new Error("Hong Kong EASE exact3 v3 history candidate drifted from its immutable contract.");
}
export const easeExact3V3HistoricalHongKongQuestions: readonly Question[] =
  typedEaseExact3V3HistorySnapshot.questions;
`;

function buildVersioningPostimage(source: string) {
  let result = replaceOnce(
    source,
    'import easeV2HistorySnapshot from "@/data/historical/hongKongQuestions-hk-ease-39847.json";\n',
    'import easeV2HistorySnapshot from "@/data/historical/hongKongQuestions-hk-ease-39847.json";\n' +
      'import easeExact3V3HistorySnapshot from "@/data/historical/hongKongQuestions-hk-ease-exact3-v3.json";\n',
    "versioning-exact3-history-import"
  );
  result = replaceOnce(
    result,
    'import {\n  HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT,\n  HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256,\n  HONG_KONG_QUESTION_SUCCESSOR_HISTORY_SOURCE_PACKAGE_SHA256\n} from "./hongKongQuestionVersioningContract";\n',
    'import {\n' +
      '  HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT,\n' +
      '  HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256,\n' +
      '  HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256,\n' +
      '  HONG_KONG_QUESTION_SUCCESSOR_HISTORY_SOURCE_PACKAGE_SHA256\n' +
      '} from "./hongKongQuestionVersioningContract";\n',
    "versioning-exact3-contract-import"
  );
  result = replaceOnce(
    result,
    'export {\n  HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT,\n  HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256,\n  HONG_KONG_QUESTION_SUCCESSOR_HISTORY_SOURCE_PACKAGE_SHA256\n} from "./hongKongQuestionVersioningContract";\n',
    'export {\n' +
      '  HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT,\n' +
      '  HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256,\n' +
      '  HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256,\n' +
      '  HONG_KONG_QUESTION_SUCCESSOR_HISTORY_SOURCE_PACKAGE_SHA256\n' +
      '} from "./hongKongQuestionVersioningContract";\n',
    "versioning-exact3-contract-export"
  );
  result = replaceOnce(
    result,
    'export const easeV2HistoricalHongKongQuestions: readonly Question[] = typedEaseV2HistorySnapshot.questions;\n',
    'export const easeV2HistoricalHongKongQuestions: readonly Question[] = typedEaseV2HistorySnapshot.questions;\n\n' +
      VERSIONING_EXACT3_VALIDATION + '\n',
    "versioning-exact3-history-validation"
  );
  result = replaceOnce(
    result,
    '  ...successorHistoricalHongKongQuestions,\n  ...easeV2HistoricalHongKongQuestions\n',
    '  ...successorHistoricalHongKongQuestions,\n' +
      '  ...easeV2HistoricalHongKongQuestions,\n' +
      '  ...easeExact3V3HistoricalHongKongQuestions\n',
    "versioning-exact3-history-intake"
  );
  result = replaceOnce(
    result,
    'if (allHistoricalHongKongQuestions.length !== 1788 || historicalQuestionById.size !== 1788) {\n  throw new Error("Hong Kong question history must contain exactly 1788 unique generations after residual28 intake.");\n}',
    'if (allHistoricalHongKongQuestions.length !== 1791 || historicalQuestionById.size !== 1791) {\n' +
      '  throw new Error("Hong Kong question history must contain exactly 1791 unique generations after exact3 intake.");\n' +
      '}',
    "versioning-history-count"
  );
  return result;
}

const RESPONSE_EXACT3_VALIDATION = String.raw`
const exact3ContractKindByBaseId = new Map([
  ["hk-ease-10481", "exact3-named-classified-number-groups-v1"],
  ["hk-ease-10496", "exact3-named-classified-number-groups-v1"],
  ["hk-ease-1041", "exact3-labelled-divisibility-matrix-v1"]
]);

function validateExact3ContractEvidence(contract: Contract, baseId: string) {
  const expectedKind = exact3ContractKindByBaseId.get(baseId);
  if (!expectedKind) return false;
  const parserBinding = isRecord(contract.params.parserBinding) ? contract.params.parserBinding : null;
  const forms = contract.params.acceptedSurfaceForms;
  if (
    contract.kind !== expectedKind ||
    !parserBinding ||
    parserBinding.modulePath !== "coordination/content-qa/hk-ease-exact3-phase2a-candidate-semantics.ts" ||
    parserBinding.exportName !== "evaluateHongKongEaseExact3Phase2AContract" ||
    parserBinding.sourceSha256 !== "f78ce1b211fa2723a635028f18f9db080b60063927d376edfc96e5cc676a8824" ||
    !Array.isArray(forms) ||
    forms.length !== (baseId === "hk-ease-1041" ? 3 : 16) ||
    forms[0] !== contract.params.canonicalAnswer ||
    new Set(forms).size !== forms.length
  ) {
    throw new Error(baseId + ": invalid exact3 parser or accepted-surface binding");
  }
  if (baseId === "hk-ease-1041") {
    if (
      JSON.stringify(contract.params.labels) !== JSON.stringify(["a", "b", "c", "d", "e", "f"]) ||
      JSON.stringify(contract.params.columns) !== JSON.stringify([2, 5, 10]) ||
      JSON.stringify(contract.params.expectedBooleanMatrix) !== JSON.stringify([
        [false, true, false], [true, true, true], [true, false, false],
        [true, true, true], [false, true, false], [true, true, true]
      ]) ||
      JSON.stringify(contract.params.tokenAliases) !== JSON.stringify({ true: ["Yes", "是", "✓"], false: ["No", "否", "✗"] }) ||
      contract.params.labelPolicy !== "each-a-through-f-exactly-once-in-order" ||
      contract.params.columnOrderPolicy !== "exactly-2-5-10-with-three-decisions-per-label" ||
      contract.params.illegalTokenPolicy !== "reject"
    ) throw new Error(baseId + ": exact3 divisibility contract drifted");
    return true;
  }
  if (
    JSON.stringify(contract.params.labels) !== JSON.stringify(["a", "b", "c"]) ||
    JSON.stringify(contract.params.categoryNames) !== JSON.stringify({
      en: ["proper fractions", "improper fractions", "mixed numbers"],
      zh: ["真分數", "假分數", "帶分數"]
    }) ||
    JSON.stringify(contract.params.expectedOriginalRepresentationGroups) !== JSON.stringify(
      baseId === "hk-ease-10481"
        ? [["3/5", "11/12"], ["7/4", "9/9"], ["2 1/3", "5 2/7"]]
        : [["4/7", "13/15"], ["11/5", "8/8"], ["3 1/2", "6 4/9"]]
    ) ||
    contract.params.categoryLanguagePolicy !== "one-response-all-English-or-all-Traditional-Chinese-no-mixing" ||
    contract.params.representationPolicy !== "each-original-representation-exactly-once-in-its-named-group-no-value-conversion" ||
    contract.params.withinGroupOrder !== "not-semantic" ||
    contract.params.labelOrder !== "exact-a-b-c" ||
    contract.params.extraMissingDuplicatePolicy !== "reject"
  ) throw new Error(baseId + ": exact3 named-category contract drifted");
  return true;
}
`;

function buildResponseRuntimePostimage(source: string) {
  let result = source;
  const replacements: Array<[string, string, string]> = [
    [
      "    /^\\(a\\)\\s*proper\\s+fractions?\\s*:\\s*([\\s\\S]*?)\\s*;\\s*\\(b\\)\\s*improper\\s+fractions?\\s*:\\s*([\\s\\S]*?)\\s*;\\s*\\(c\\)\\s*mixed\\s+(?:numbers?|fractions?)\\s*:\\s*([\\s\\S]*?)$/i",
      "    /^\\(a\\)\\s*proper\\s+fractions\\s*:\\s*([\\s\\S]*?)\\s*;\\s*\\(b\\)\\s*improper\\s+fractions\\s*:\\s*([\\s\\S]*?)\\s*;\\s*\\(c\\)\\s*mixed\\s+numbers\\s*:\\s*([\\s\\S]*?)$/i",
      "response-exact3-category-names"
    ],
    [
      'const expectedResponseManifestEvidence = {\n  status: "candidate-pending-independent-review",\n  candidateSha256: "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2",',
      'const expectedResponseManifestEvidence = {\n  status: "candidate-pending-independent-review",\n  candidateSha256: "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf",',
      "response-strict-pack-sha"
    ],
    [
      'auditSha256: "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28",',
      'auditSha256: "3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a",',
      "response-audit-sha"
    ],
    ["  positiveProbeCount: 552,", "  positiveProbeCount: 584,", "response-positive-count"],
    ["  negativeProbeCount: 554,", "  negativeProbeCount: 581,", "response-negative-count"],
    [
      '      "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2",',
      '      "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf",',
      "response-simple-pack-source-sha"
    ],
    [
      '      "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4",',
      '      "86333f5482a6a90da42c4ae12d575df8e2859409ff12de18032122a6c67c2b2c",',
      "response-simple-strict-source-sha"
    ],
    [
      '  candidateSha256: "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2",',
      '  candidateSha256: "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf",',
      "response-simple-pack-sha"
    ],
    [
      '  canonicalPayloadSha256: "ba04330e687afc7c7f5c11a6a4fb2e06880a10d2fb50e7a9862d0812cb3b3221",',
      '  canonicalPayloadSha256: "94e83afdc222d098df971a56c0dd435fca6526256a5513e0cdd79bdff9d7859d",',
      "response-simple-payload-sha"
    ],
    [
      '  fileSha256: "fdb823e7e0923eff7cabb569e171680965dfa6d1e9edce36567fb4bf24ebc597",',
      '  fileSha256: "d5f226b600e98cd4cfa1df6497137a0844e0f9685d8f87e4a6e1130aaa5c3d41",',
      "response-simple-file-sha"
    ]
  ];
  for (const [before, after, label] of replacements) result = replaceOnce(result, before, after, label);
  result = replaceOnce(
    result,
    '\nfunction validateContractEvidence(\n',
    `\n${RESPONSE_EXACT3_VALIDATION}\nfunction validateContractEvidence(\n`,
    "response-exact3-validation"
  );
  result = replaceOnce(
    result,
    '  let reviewedSurfaceFormCount = 0;\n  if (contract.kind === "reviewed-exact-surface-forms") {',
    '  let reviewedSurfaceFormCount = 0;\n' +
      '  if (validateExact3ContractEvidence(contract, baseId)) return 0;\n' +
      '  if (contract.kind === "reviewed-exact-surface-forms") {',
    "response-exact3-contract-evidence-call"
  );
  result = replaceOnce(
    result,
    '  if (\n    reviewedQuestionIds.size !== expectedResponseManifestEvidence.reviewedExactSurfaceQuestionCount ||',
    '  const exact3BaseIds = manifest.entries\n' +
      '    .filter((entry) => exact3ContractKindByBaseId.has(entry.baseId))\n' +
      '    .map((entry) => entry.baseId);\n' +
      '  if (\n' +
      '    JSON.stringify(exact3BaseIds) !== JSON.stringify(["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"]) ||\n' +
      '    reviewedQuestionIds.size !== expectedResponseManifestEvidence.reviewedExactSurfaceQuestionCount ||',
    "response-exact3-coverage"
  );
  result = replaceOnce(
    result,
    '  const contract = contractByBaseId.get(baseId);\n  if (!contract) return null;\n\n  try {\n    return matchContract(contract, selectedAnswer);',
    '  const contract = contractByBaseId.get(baseId);\n' +
      '  if (!contract) return null;\n\n' +
      '  try {\n' +
      '    if (exact3ContractKindByBaseId.has(baseId)) {\n' +
      '      const decision = hongKongEaseExact3SemanticResponseDecision(baseId, selectedAnswer);\n' +
      '      return decision ?? false;\n' +
      '    }\n' +
      '    return matchContract(contract, selectedAnswer);',
    "response-exact3-dispatch"
  );
  return result;
}

function buildPostimages(inputs: HongKongEaseExact3Phase2BRuntimeCandidateInputs) {
  return {
    "data/hongKongEasePracticeQuestions.ts":
      buildLoaderPostimage(inputs.sourcePreimages["data/hongKongEasePracticeQuestions.ts"]),
    "lib/hongKongQuestionVersioningContract.ts":
      buildVersionContractPostimage(inputs.sourcePreimages["lib/hongKongQuestionVersioningContract.ts"]),
    "lib/hongKongQuestionVersioning.ts":
      buildVersioningPostimage(inputs.sourcePreimages["lib/hongKongQuestionVersioning.ts"]),
    "lib/server/hongKongEaseResponseContracts.ts":
      buildResponseRuntimePostimage(inputs.sourcePreimages["lib/server/hongKongEaseResponseContracts.ts"])
  } satisfies Record<LogicalTargetPath, string>;
}

export function buildHongKongEaseExact3Phase2BRuntimeCandidateFromInputs(
  inputs: HongKongEaseExact3Phase2BRuntimeCandidateInputs
) {
  assertInputs(inputs);
  const postimages = buildPostimages(inputs);
  for (const logicalTargetPath of LOGICAL_TARGET_PATHS) {
    const expected = EXPECTED_POSTIMAGE_BINDING_BY_PATH[logicalTargetPath];
    if (
      sha256(postimages[logicalTargetPath]) !== expected.sha256 ||
      Buffer.byteLength(postimages[logicalTargetPath]) !== expected.byteLength
    ) {
      fail("PHASE2B2_POSTIMAGE_DRIFT", logicalTargetPath);
    }
  }
  return {
    schemaVersion: "hk-ease-exact3-phase2b-serving-runtime-candidate-v1" as const,
    status: "candidate-hold-not-live-promotion" as const,
    dataPlaneAuthoritySha256: DATA_PLANE_AUTHORITY_SHA256,
    dataPlaneAuthorityPayloadSha256: DATA_PLANE_AUTHORITY_PAYLOAD_SHA256,
    sourcePreimageBindings: LOGICAL_TARGET_PATHS.map((path) => ({
      path,
      sha256: SOURCE_PREIMAGE_SHA256_BY_PATH[path]
    })),
    postimages,
    postimageBindings: LOGICAL_TARGET_PATHS.map((logicalTargetPath) => ({
      logicalTargetPath,
      snapshotPath:
        `${HONG_KONG_EASE_EXACT3_PHASE2B_RUNTIME_CANDIDATE_DIRECTORY}/${SNAPSHOT_BASENAME_BY_TARGET[logicalTargetPath]}`,
      preimageSha256: SOURCE_PREIMAGE_SHA256_BY_PATH[logicalTargetPath],
      sha256: EXPECTED_POSTIMAGE_BINDING_BY_PATH[logicalTargetPath].sha256,
      byteLength: EXPECTED_POSTIMAGE_BINDING_BY_PATH[logicalTargetPath].byteLength,
      classification: "isolated-full-typescript-postimage-candidate" as const
    }))
  };
}

export function buildHongKongEaseExact3Phase2BRuntimeCandidate(repositoryRoot = process.cwd()) {
  return buildHongKongEaseExact3Phase2BRuntimeCandidateFromInputs(
    loadHongKongEaseExact3Phase2BRuntimeCandidateInputs(repositoryRoot)
  );
}

function buildAuthority(
  repositoryRoot: string,
  candidate: ReturnType<typeof buildHongKongEaseExact3Phase2BRuntimeCandidateFromInputs>
) {
  const payload = {
    schemaVersion: "hk-ease-exact3-phase2b-serving-runtime-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    builderBinding: { path: BUILDER_PATH, sha256: sourceSha(repositoryRoot, BUILDER_PATH) },
    focusedTestBinding: { path: FOCUSED_TEST_PATH, sha256: sourceSha(repositoryRoot, FOCUSED_TEST_PATH) },
    shadowTestBinding: { path: SHADOW_TEST_PATH, sha256: sourceSha(repositoryRoot, SHADOW_TEST_PATH) },
    dataPlaneAuthorityBinding: {
      path: DATA_PLANE_AUTHORITY_PATH,
      sha256: DATA_PLANE_AUTHORITY_SHA256,
      authorityPayloadSha256: DATA_PLANE_AUTHORITY_PAYLOAD_SHA256
    },
    dataArtifactBindings: Object.entries(DATA_ARTIFACT_BINDINGS).map(([name, binding]) => ({
      name,
      ...binding
    })),
    sourcePreimageBindings: candidate.sourcePreimageBindings,
    outputPolicy: {
      exactRuntimePostimageCount: 4,
      exactControlArtifactCount: 1,
      snapshotsAreFullSourcePostimages: true,
      materializationDirectory: HONG_KONG_EASE_EXACT3_PHASE2B_RUNTIME_CANDIDATE_DIRECTORY,
      fileMode: "0444"
    },
    outputBindings: candidate.postimageBindings,
    promotion: {
      liveDataMutationAuthorized: false,
      liveRuntimeMutationAuthorized: false,
      runtimeDispatchAuthorized: false,
      historyPromotionAuthorized: false,
      v4RegenerationAuthorized: false,
      fullBankIntegrationAuthorized: false,
      canonicalRunnerAuthorized: false,
      releaseAuthorized: false,
      remainingGates: [
        "shadow compile and focused serving-runtime execution",
        "Phase2B.3 historical regression and full consumer candidate closure",
        "V4 regeneration for the exact3 hk-ease-1041 prompt",
        "full-bank and canonical runner integration",
        "A11 browser regression and A22 release evidence"
      ]
    }
  };
  return { ...payload, authorityPayloadSha256: sha256(JSON.stringify(payload)) };
}

export function serializeHongKongEaseExact3Phase2BRuntimeCandidate(
  candidate = buildHongKongEaseExact3Phase2BRuntimeCandidate(),
  repositoryRoot = process.cwd()
) {
  const serialized: Record<string, string> = {};
  for (const binding of candidate.postimageBindings) {
    serialized[binding.snapshotPath] = candidate.postimages[binding.logicalTargetPath];
  }
  const authorityPath =
    `${HONG_KONG_EASE_EXACT3_PHASE2B_RUNTIME_CANDIDATE_DIRECTORY}/runtime-hold-authority-v1.json`;
  serialized[authorityPath] = prettyJson(buildAuthority(repositoryRoot, candidate));
  return serialized;
}

export function materializeHongKongEaseExact3Phase2BRuntimeCandidate(repositoryRoot = process.cwd()) {
  const candidate = buildHongKongEaseExact3Phase2BRuntimeCandidate(repositoryRoot);
  const serialized = serializeHongKongEaseExact3Phase2BRuntimeCandidate(candidate, repositoryRoot);
  for (const [relativePath, bytes] of Object.entries(serialized)) {
    const absolutePath = resolve(repositoryRoot, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    if (existsSync(absolutePath)) {
      const stat = lstatSync(absolutePath);
      if (!stat.isFile() || stat.isSymbolicLink() || readFileSync(absolutePath, "utf8") !== bytes) {
        fail("PHASE2B2_MATERIALIZATION_COLLISION", relativePath);
      }
    } else {
      writeFileSync(absolutePath, bytes, { flag: "wx", mode: 0o444 });
    }
    chmodSync(absolutePath, 0o444);
  }
  return serialized;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  materializeHongKongEaseExact3Phase2BRuntimeCandidate(repositoryRoot);
}
