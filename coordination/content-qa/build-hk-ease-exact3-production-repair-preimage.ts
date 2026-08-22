import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolveHongKongEaseExact3ImmutablePreimage } from "./hk-ease-exact3-immutable-preimage-relocation";

const BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-exact3-production-repair-preimage.ts";
const OUTPUT_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimage-v1.json";
const ORDERED_BASE_IDS = ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"] as const;

const SOURCE_FILE_SHA256_BY_PATH = {
  "data/generated-content/hk-ease-practice-bank-v2/question-pack.json":
    "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2",
  "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json":
    "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4",
  "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json":
    "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28",
  "data/historical/hongKongQuestionVersionManifest.json":
    "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92",
  "data/historical/hongKongQuestions-hk-ease-39847.json":
    "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1",
  "data/historical/hongKongQuestions-3f8f12c4.json":
    "75af1eb004c8834136eed5307b25c229bc050f473638d1cc476dfca7c81593fd"
} as const;

const RELOCATED_SOURCE_PATHS = new Set<keyof typeof SOURCE_FILE_SHA256_BY_PATH>([
  "data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
  "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
  "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json",
  "data/historical/hongKongQuestionVersionManifest.json"
]);

type JsonRecord = Record<string, unknown>;

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requireRecord(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) throw new Error(`${label}: expected object`);
  return value;
}

function requireRecordArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some((entry) => !isRecord(entry))) {
    throw new Error(`${label}: expected object array`);
  }
  return value as JsonRecord[];
}

function readFrozenJson(root: string, relativePath: keyof typeof SOURCE_FILE_SHA256_BY_PATH) {
  const expectedSha256 = SOURCE_FILE_SHA256_BY_PATH[relativePath];
  const bytes = RELOCATED_SOURCE_PATHS.has(relativePath)
    ? resolveHongKongEaseExact3ImmutablePreimage({
        repositoryRoot: root,
        logicalPath: relativePath,
        expectedOldSha256: expectedSha256
      }).bytes
    : readFileSync(resolve(root, relativePath));
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new Error(`${relativePath}: frozen preimage drift ${actualSha256} != ${expectedSha256}`);
  }
  return JSON.parse(bytes.toString("utf8")) as unknown;
}

function uniqueRecordBy(
  records: JsonRecord[],
  field: string,
  expected: string,
  label: string
) {
  const matches = records.filter((record) => record[field] === expected);
  if (matches.length !== 1) {
    throw new Error(`${label}: expected exactly one ${field}=${expected}, found ${matches.length}`);
  }
  return matches[0];
}

function stringArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label}: expected string array`);
  }
  return value as string[];
}

function stringField(record: JsonRecord, field: string, label: string) {
  const value = record[field];
  if (typeof value !== "string") throw new Error(`${label}.${field}: expected string`);
  return value;
}

function compactQuestionPreimage(question: JsonRecord, label: string) {
  const acceptedAnswers = stringArray(question.acceptedAnswers, `${label}.acceptedAnswers`);
  return {
    recordSha256: sha256(JSON.stringify(question)),
    id: stringField(question, "id", label),
    promptEn: stringField(question, "promptEn", label),
    promptZh: stringField(question, "promptZh", label),
    answer: stringField(question, "answer", label),
    acceptedAnswerCount: acceptedAnswers.length,
    acceptedAnswersSha256: sha256(JSON.stringify(acceptedAnswers))
  };
}

function compactHistoricalPreimage(question: JsonRecord, label: string) {
  const prompt = requireRecord(question.prompt, `${label}.prompt`);
  const acceptedAnswers = stringArray(question.acceptedAnswers, `${label}.acceptedAnswers`);
  return {
    recordSha256: sha256(JSON.stringify(question)),
    id: stringField(question, "id", label),
    promptEn: stringField(prompt, "en", `${label}.prompt`),
    promptZh: stringField(prompt, "zh", `${label}.prompt`),
    answer: stringField(question, "answer", label),
    acceptedAnswerCount: acceptedAnswers.length,
    acceptedAnswersSha256: sha256(JSON.stringify(acceptedAnswers))
  };
}

function canonicalAnswersFromContract(contract: JsonRecord) {
  const answers: string[] = [];
  const walk = (candidate: JsonRecord) => {
    const params = requireRecord(candidate.params, "contract.params");
    if (typeof params.canonicalAnswer === "string") answers.push(params.canonicalAnswer);
    if (Array.isArray(params.contracts)) {
      for (const nested of requireRecordArray(params.contracts, "contract.params.contracts")) walk(nested);
    }
  };
  walk(contract);
  return answers;
}

const targetSemanticContractByBaseId = {
  "hk-ease-10481": {
    kind: "exact-named-classified-number-groups",
    labels: ["a", "b", "c"],
    categoriesEn: ["proper fractions", "improper fractions", "mixed numbers"],
    categoriesZh: ["真分數", "假分數", "帶分數"],
    groups: [["3/5", "11/12"], ["7/4", "9/9"], ["2 1/3", "5 2/7"]],
    categoryLanguagePolicy: "all-English-or-all-Traditional-Chinese-no-mixing",
    representationPolicy: "original-representations-exactly-once-within-group-order-free"
  },
  "hk-ease-10496": {
    kind: "exact-named-classified-number-groups",
    labels: ["a", "b", "c"],
    categoriesEn: ["proper fractions", "improper fractions", "mixed numbers"],
    categoriesZh: ["真分數", "假分數", "帶分數"],
    groups: [["4/7", "13/15"], ["11/5", "8/8"], ["3 1/2", "6 4/9"]],
    categoryLanguagePolicy: "all-English-or-all-Traditional-Chinese-no-mixing",
    representationPolicy: "original-representations-exactly-once-within-group-order-free"
  },
  "hk-ease-1041": {
    kind: "exact-labelled-divisibility-matrix",
    labels: ["a", "b", "c", "d", "e", "f"],
    columns: [2, 5, 10],
    matrix: [
      [false, true, false],
      [true, true, true],
      [true, false, false],
      [true, true, true],
      [false, true, false],
      [true, true, true]
    ],
    aliases: { true: ["Yes", "是", "✓"], false: ["No", "否", "✗"] },
    responsePolicy: "all-six-labels-exactly-once-three-decisions-in-2-5-10-column-order"
  }
} as const;

export function buildHongKongEaseExact3ProductionRepairPreimage(root: string) {
  const questionPack = requireRecord(
    readFrozenJson(root, "data/generated-content/hk-ease-practice-bank-v2/question-pack.json"),
    "question pack"
  );
  const responseContracts = requireRecord(
    readFrozenJson(root, "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json"),
    "response contracts"
  );
  const responseAudit = requireRecord(
    readFrozenJson(root, "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json"),
    "response audit"
  );
  const versionManifest = requireRecord(
    readFrozenJson(root, "data/historical/hongKongQuestionVersionManifest.json"),
    "version manifest"
  );
  const v2History = requireRecord(
    readFrozenJson(root, "data/historical/hongKongQuestions-hk-ease-39847.json"),
    "v2 history"
  );
  const legacyHistory = requireRecord(
    readFrozenJson(root, "data/historical/hongKongQuestions-3f8f12c4.json"),
    "legacy history"
  );

  const questions = requireRecordArray(questionPack.questions, "questionPack.questions");
  const contracts = requireRecordArray(responseContracts.entries, "responseContracts.entries");
  const audits = requireRecordArray(responseAudit.entries, "responseAudit.entries");
  const v2HistoryQuestions = requireRecordArray(v2History.questions, "v2History.questions");
  const legacyHistoryQuestions = requireRecordArray(legacyHistory.questions, "legacyHistory.questions");
  const activeIdByHistoricalId = requireRecord(
    versionManifest.activeIdByHistoricalId,
    "versionManifest.activeIdByHistoricalId"
  );
  const retiredHistoricalIds = stringArray(
    versionManifest.retiredHistoricalIds,
    "versionManifest.retiredHistoricalIds"
  );

  const rows = ORDERED_BASE_IDS.map((baseId) => {
    const activePreimageId = `${baseId}-v2`;
    if (activeIdByHistoricalId[baseId] !== activePreimageId) {
      throw new Error(`${baseId}: active preimage mapping drift`);
    }
    if (!retiredHistoricalIds.includes(baseId) || retiredHistoricalIds.includes(activePreimageId)) {
      throw new Error(`${baseId}: preimage retirement state drift`);
    }
    const candidateQuestion = uniqueRecordBy(questions, "id", baseId, "question pack");
    const strictContract = uniqueRecordBy(contracts, "baseId", baseId, "response contracts");
    const auditEntry = uniqueRecordBy(audits, "baseId", baseId, "response audit");
    const frozenV2History = uniqueRecordBy(v2HistoryQuestions, "id", activePreimageId, "v2 history");
    const frozenLegacyHistory = uniqueRecordBy(legacyHistoryQuestions, "id", baseId, "legacy history");
    const canonicalAnswers = canonicalAnswersFromContract(strictContract);
    if (!canonicalAnswers.length || canonicalAnswers.some((answer) => answer !== candidateQuestion.answer)) {
      throw new Error(`${baseId}: candidate/strict canonical-answer preimage drift`);
    }
    if (frozenV2History.answer !== candidateQuestion.answer) {
      throw new Error(`${baseId}: candidate/v2-history answer preimage drift`);
    }

    const rowWithoutHash = {
      baseId,
      activePreimageId,
      requiredSuccessorId: `${baseId}-v3`,
      frozenV2HistoryStatus: "immutable-do-not-edit",
      candidateQuestion: compactQuestionPreimage(candidateQuestion, `${baseId}.candidateQuestion`),
      strictContract: {
        recordSha256: sha256(JSON.stringify(strictContract)),
        kind: strictContract.kind,
        canonicalAnswerCount: canonicalAnswers.length,
        canonicalAnswersSha256: sha256(JSON.stringify(canonicalAnswers))
      },
      responseAudit: {
        recordSha256: sha256(JSON.stringify(auditEntry)),
        index: auditEntry.index,
        positiveProbesSha256: sha256(JSON.stringify(auditEntry.positiveProbes)),
        negativeProbesSha256: sha256(JSON.stringify(auditEntry.negativeProbes))
      },
      frozenV2History: compactHistoricalPreimage(frozenV2History, `${baseId}.frozenV2History`),
      frozenLegacyHistory: compactHistoricalPreimage(
        frozenLegacyHistory,
        `${baseId}.frozenLegacyHistory`
      ),
      targetSemanticContract: targetSemanticContractByBaseId[baseId]
    };
    return {
      ...rowWithoutHash,
      rowPreimageSha256: sha256(JSON.stringify(rowWithoutHash))
    };
  });

  const authorityWithoutHash = {
    schemaVersion: "hk-ease-exact3-production-repair-preimage-v1",
    builderPath: BUILDER_PATH,
    outputPath: OUTPUT_PATH,
    decision: "needs-repair-do-not-promote-v2",
    runtimePreRepairSha256:
      "af8679b39dce192bcce8c7c18724e5c6538f56e5ec1ce2529bcdb2a1bd51ee91",
    orderedBaseIds: [...ORDERED_BASE_IDS],
    orderedBaseIdSha256: sha256(`${ORDERED_BASE_IDS.join("\n")}\n`),
    sourceFileSha256ByPath: { ...SOURCE_FILE_SHA256_BY_PATH },
    dependentArtifactPaths: {
      immutablePreimages: [
        "data/historical/hongKongQuestions-3f8f12c4.json",
        "data/historical/hongKongQuestions-hk-ease-39847.json"
      ],
      atomicPhase2Mutation: [
        "data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
        "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
        "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json",
        "data/historical/hongKongQuestionVersionManifest.json",
        "lib/server/hongKongEaseResponseContracts.ts",
        "lib/server/hongKongEaseResponseContracts.test.ts",
        "lib/hongKongQuestionVersioning.ts",
        "lib/hongKongQuestionVersioning.test.ts",
        "lib/hongKongQuestionVersioningContract.ts"
      ],
      downstreamRebuildAndRegression: [
        "data/hongKongEasePracticeQuestions.ts",
        "data/questions.ts",
        "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle-v4.json",
        "coordination/content-qa/build-hk-ease-independent-oracle-v4.ts",
        "lib/hongKongEaseIndependentOracleV4.ts",
        "lib/hongKongEaseIndependentOracleV4.test.ts",
        "lib/server/hongKongHistoricalQuestionProjection.ts",
        "lib/server/hongKongHistoricalQuestionProjection.test.ts",
        "lib/fullQuestionBankSolvability.test.ts",
        "coordination/content-qa/hk-question-bank-evidence-runner.mjs",
        "coordination/content-qa/hk-question-bank-evidence-runner.test.mjs"
      ],
      versionManifestProvenanceConsumers: [
        "coordination/content-qa/hongKongResidual28Provenance.ts",
        "lib/hongKongResidual47RepairContract.test.ts"
      ]
    },
    requiredAtomicPhase2Surfaces: [
      "question-pack-successor-material",
      "strict-response-contract-and-audit-successor-material",
      "new-v3-history-artifact",
      "base-and-v2-to-v3-version-mapping-with-v2-retirement",
      "history-safe-provenance-and-promotion-authority",
      "production-runtime-dispatch",
      "independent-v4-oracle-and-full-bank-regression-rebuild"
    ],
    rows
  };
  return {
    ...authorityWithoutHash,
    authorityPayloadSha256: sha256(JSON.stringify(authorityWithoutHash))
  };
}

export function serializeHongKongEaseExact3ProductionRepairPreimage(root: string) {
  return `${JSON.stringify(buildHongKongEaseExact3ProductionRepairPreimage(root), null, 2)}\n`;
}

function writeAuthority(root: string) {
  const output = resolve(root, OUTPUT_PATH);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, serializeHongKongEaseExact3ProductionRepairPreimage(root), "utf8");
  return output;
}

const executedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (executedPath && pathToFileURL(executedPath).href === import.meta.url) {
  const root = process.cwd();
  const output = writeAuthority(root);
  process.stdout.write(`${fileURLToPath(import.meta.url)}\n${output}\n`);
}
