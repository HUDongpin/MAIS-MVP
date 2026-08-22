import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import questionPackJson from "../../data/generated-content/hk-ease-practice-bank-v2/question-pack.json";
import responseContractsJson from "../../data/generated-content/hk-ease-practice-bank-v2/response-contracts.json";
import simpleResponseContractsJson from "../../data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json";
import { activeHongKongQuestionIdByHistoricalId } from "../../data/questions";
import { questionAnswerMatches } from "../../lib/server/answerMatching";
import {
  compareHongKongEaseV4DerivedRowToProduction,
  hongKongEaseV4Sha256,
  validateHongKongEaseV4DerivationSupplement,
  type V4ProductionQuestion,
  type V4ResponsePolicy
} from "../../lib/hongKongEaseIndependentOracleV4";
import sanitizedInputJson from "./authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json";
import supplementJson from "./authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json";
import type { HongKongEaseV4SanitizedInput } from "./build-hk-ease-derivation-input-v4";
import type { HongKongEaseV4DerivationSupplement } from "./build-hk-ease-independent-oracle-v4-supplement";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const HK_EASE_V4_ORACLE_PATH =
  "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle-v4.json";

export const HK_EASE_V4_SOURCE_SHA256_BY_PATH = Object.freeze({
  "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json":
    "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62",
  "data/generated-content/hk-ease-practice-bank-v2/question-pack.json":
    "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf",
  "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json":
    "86333f5482a6a90da42c4ae12d575df8e2859409ff12de18032122a6c67c2b2c",
  "data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json":
    "d5f226b600e98cd4cfa1df6497137a0844e0f9685d8f87e4a6e1130aaa5c3d41",
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json":
    "54e9861f4fe6963e005752dbe5f741fed8ba71b8596eec8d80d365fc46ad0cfb",
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json":
    "2eec0d9b7ce7adf06d9f50d1dfa30738df9a8d97481d09c0458ad9023eca181e"
} as const);

export const assertHongKongEaseV4LiveSourceBytes = (
  repositoryRoot = REPOSITORY_ROOT
): void => {
  for (const [path, expectedSha256] of Object.entries(HK_EASE_V4_SOURCE_SHA256_BY_PATH)) {
    const actualSha256 = hongKongEaseV4Sha256(readFileSync(resolve(repositoryRoot, path)));
    if (actualSha256 !== expectedSha256) {
      throw new Error(`V4_SOURCE_LINEAGE_DRIFT:${path}:${expectedSha256}:${actualSha256}`);
    }
  }
};

type QuestionPack = {
  questions: V4ProductionQuestion[];
};

type ContractManifest = {
  entries: Array<{ baseId: string; [key: string]: unknown }>;
};

export type HongKongEaseV4OracleRow = {
  index: number;
  baseId: string;
  activeId: string;
  problemPayloadSha256: string;
  derivationPayloadSha256: string;
  independentlyDerivedResponse: string;
  independentlyDerivedSemanticValueSha256: string;
  promptRequirementsSha256: string;
  answerPayloadSha256: string;
  responsePolicyPayloadSha256: string;
  responsePolicyKind: V4ResponsePolicy["kind"];
  productionComparison: ReturnType<typeof compareHongKongEaseV4DerivedRowToProduction>;
  rowEvidenceSha256: string;
};

export type HongKongEaseV4Oracle = {
  schemaVersion: "hk-ease-independent-answer-oracle-v4";
  status: "candidate-pending-independent-row-by-row-re-review";
  supersedes: {
    path: "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json";
    sha256: "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62";
    preservedImmutable: true;
  };
  sourceSha256ByPath: typeof HK_EASE_V4_SOURCE_SHA256_BY_PATH;
  questionCount: 701;
  rowSpecificDerivationCount: 701;
  classificationOnlyCount: 0;
  strictResponsePolicyCount: 344;
  reviewedSimpleResponsePolicyCount: 357;
  directProductionGraderMatchCount: number;
  structuredSemanticMatchCount: number;
  unresolvedIds: string[];
  orderedBaseIdSha256: string;
  rowsPayloadSha256: string;
  rows: HongKongEaseV4OracleRow[];
};

const rowWithoutEvidenceHash = (row: Omit<HongKongEaseV4OracleRow, "rowEvidenceSha256">) => row;

export const buildHongKongEaseIndependentOracleV4 = (
  questionPack: QuestionPack = questionPackJson as QuestionPack,
  sanitized: HongKongEaseV4SanitizedInput = sanitizedInputJson as HongKongEaseV4SanitizedInput,
  supplement: HongKongEaseV4DerivationSupplement = supplementJson as HongKongEaseV4DerivationSupplement,
  strictManifest: ContractManifest = responseContractsJson as ContractManifest,
  simpleManifest: ContractManifest = simpleResponseContractsJson as ContractManifest,
  activeIdFor: (baseId: string) => string = (baseId) =>
    activeHongKongQuestionIdByHistoricalId.get(baseId) ?? baseId,
  grader = questionAnswerMatches
): HongKongEaseV4Oracle => {
  validateHongKongEaseV4DerivationSupplement(sanitized, supplement);
  if (questionPack.questions.length !== 701) {
    throw new Error(`V4_QUESTION_ORDER_DRIFT:question-pack-count-${questionPack.questions.length}`);
  }
  const strictById = new Map(strictManifest.entries.map((entry) => [entry.baseId, entry]));
  const simpleById = new Map(simpleManifest.entries.map((entry) => [entry.baseId, entry]));
  if (strictById.size !== 344 || simpleById.size !== 357) {
    throw new Error(`V4_RESPONSE_POLICY_BINDING_DRIFT:${strictById.size}:${simpleById.size}`);
  }
  const rows = supplement.rows.map<HongKongEaseV4OracleRow>((derivation, index) => {
    const question = questionPack.questions[index];
    if (!question || question.id !== derivation.baseId || sanitized.rows[index].baseId !== derivation.baseId) {
      throw new Error(`V4_QUESTION_ORDER_DRIFT:${index}:${derivation.baseId}`);
    }
    const strict = strictById.get(derivation.baseId);
    const simple = simpleById.get(derivation.baseId);
    if (Boolean(strict) === Boolean(simple)) {
      throw new Error(`V4_RESPONSE_POLICY_BINDING_DRIFT:${derivation.baseId}:expected-exactly-one-policy`);
    }
    const policy: V4ResponsePolicy = strict
      ? { kind: "strict", contract: strict }
      : { kind: "reviewed-simple", contract: simple! };
    const activeId = activeIdFor(derivation.baseId);
    const answerPayload = {
      canonical: question.answer,
      acceptedAnswers: question.acceptedAnswers
    };
    const productionComparison = compareHongKongEaseV4DerivedRowToProduction(
      question,
      derivation,
      policy,
      activeId,
      grader
    );
    const withoutHash = rowWithoutEvidenceHash({
      index,
      baseId: derivation.baseId,
      activeId,
      problemPayloadSha256: derivation.problemPayloadSha256,
      derivationPayloadSha256: derivation.derivationPayloadSha256,
      independentlyDerivedResponse: derivation.computedResult.responseText,
      independentlyDerivedSemanticValueSha256: hongKongEaseV4Sha256(
        JSON.stringify(derivation.computedResult.semanticValue)
      ),
      promptRequirementsSha256: hongKongEaseV4Sha256(
        JSON.stringify(derivation.promptRequirements)
      ),
      answerPayloadSha256: hongKongEaseV4Sha256(JSON.stringify(answerPayload)),
      responsePolicyPayloadSha256: hongKongEaseV4Sha256(JSON.stringify(policy)),
      responsePolicyKind: policy.kind,
      productionComparison
    });
    return {
      ...withoutHash,
      rowEvidenceSha256: hongKongEaseV4Sha256(JSON.stringify(withoutHash))
    };
  });
  const directProductionGraderMatchCount = rows.filter(
    (row) => row.productionComparison.directProductionGraderAccepted
  ).length;
  const strictResponsePolicyCount = rows.filter(
    (row) => row.responsePolicyKind === "strict"
  ).length;
  const reviewedSimpleResponsePolicyCount = rows.filter(
    (row) => row.responsePolicyKind === "reviewed-simple"
  ).length;
  if (strictResponsePolicyCount !== 344 || reviewedSimpleResponsePolicyCount !== 357) {
    throw new Error("V4_RESPONSE_POLICY_BINDING_DRIFT:post-row-counts");
  }
  const artifact: HongKongEaseV4Oracle = {
    schemaVersion: "hk-ease-independent-answer-oracle-v4",
    status: "candidate-pending-independent-row-by-row-re-review",
    supersedes: {
      path: "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json",
      sha256: "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62",
      preservedImmutable: true
    },
    sourceSha256ByPath: HK_EASE_V4_SOURCE_SHA256_BY_PATH,
    questionCount: 701,
    rowSpecificDerivationCount: 701,
    classificationOnlyCount: 0,
    strictResponsePolicyCount: strictResponsePolicyCount as 344,
    reviewedSimpleResponsePolicyCount: reviewedSimpleResponsePolicyCount as 357,
    directProductionGraderMatchCount,
    structuredSemanticMatchCount: 701 - directProductionGraderMatchCount,
    unresolvedIds: [],
    orderedBaseIdSha256: hongKongEaseV4Sha256(`${rows.map((row) => row.baseId).join("\n")}\n`),
    rowsPayloadSha256: hongKongEaseV4Sha256(JSON.stringify(rows)),
    rows
  };
  return artifact;
};

export const renderHongKongEaseIndependentOracleV4 = (
  artifact: HongKongEaseV4Oracle
): string => `${JSON.stringify(artifact, null, 2)}\n`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assertHongKongEaseV4LiveSourceBytes();
  writeFileSync(
    resolve(REPOSITORY_ROOT, HK_EASE_V4_ORACLE_PATH),
    renderHongKongEaseIndependentOracleV4(buildHongKongEaseIndependentOracleV4()),
    "utf8"
  );
}
