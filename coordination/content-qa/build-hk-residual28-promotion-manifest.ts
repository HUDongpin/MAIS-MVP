import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import repairContractJson from "./authoritative/2026-08-13-hk-residual28-repair-contract.json";
import residual28SnapshotJson from "../../data/historical/hongKongQuestions-residual28-preimage-20260813.json";
import promotionManifestJson from "../../data/historical/hongKongResidual28PromotionManifest.json";
import type { Question } from "../../types";
import { readHongKongResidual28ReconstructionSource } from "./hongKongResidual28Provenance";

const REPAIR_CONTRACT_SHA256 =
  "89891eb15b8823f29c7ca5c22a1a7f59ad4501d5c7600fea7a2ef82dce72f0b4";
const PREIMAGE_SNAPSHOT_SHA256 =
  "8f9cc79f256fec67f1818942c4aaab3d00fbdbb87c465869f4ed4e4675494059";
const ADJUDICATION_LEDGER_SHA256 =
  "0879eb17b5c65ac76a38f311972f279e1c47d6c3b2c8dec22aabea6af830716c";
const SEMANTIC_REAUDIT_V3_SHA256 =
  "e8bbb5926275c612e025c75da1ebb7c63aa35c2f3b753a908948d7a90ad47dc3";

type Repair = {
  fromId: string;
  baseId: string;
  toId: string;
  preimageQuestionPayloadSha256: string;
  allowedPaths: string[];
  replacements: Record<string, string>;
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha(repositoryRoot: string, relativePath: string) {
  return sha256(readFileSync(join(repositoryRoot, relativePath)));
}

function materialQuestionState(question: Question) {
  return {
    curriculumTrack: question.curriculumTrack,
    curriculumProfile: question.curriculumProfile,
    region: question.region,
    publisher: question.publisher,
    canonicalTopicId: question.canonicalTopicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: question.topic,
    difficulty: question.difficulty,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    answer: question.answer,
    acceptedAnswers: question.acceptedAnswers,
    explanation: question.explanation,
    diagram: question.diagram,
    questionAssets: question.questionAssets
  };
}

function materialFingerprint(question: Question) {
  return JSON.stringify(materialQuestionState(question));
}

function applyReplacement(question: Question, path: string, value: string) {
  assert.equal(typeof value, "string", `${question.id}: ${path} replacement must be a string`);
  const optionPath = path.match(/^options\[(\d+)]\.(en|zh)$/);
  if (optionPath) {
    assert.ok(Array.isArray(question.options), `${question.id}: missing options for ${path}`);
    const index = Number(optionPath[1]);
    assert.ok(Number.isInteger(index) && index >= 0 && index < question.options.length, `${question.id}: bad index for ${path}`);
    const locale = optionPath[2] as "en" | "zh";
    assert.equal(typeof question.options[index]?.[locale], "string", `${question.id}: missing locale for ${path}`);
    question.options[index][locale] = value;
    return;
  }
  if (path === "answer") question.answer = value;
  else if (path === "explanation.en") question.explanation.en = value;
  else if (path === "explanation.zh") question.explanation.zh = value;
  else if (path === "prompt.en") question.prompt.en = value;
  else if (path === "prompt.zh") question.prompt.zh = value;
  else assert.fail(`${question.id}: unsupported replacement path ${path}`);
}

export function buildHongKongResidual28PromotionManifest(repositoryRoot?: string) {
  const root = repositoryRoot ?? process.cwd();
  const repairContract = repairContractJson as typeof repairContractJson & { repairs: Repair[] };
  const snapshot = residual28SnapshotJson as unknown as { questions: Question[] };
  const current = promotionManifestJson as any;
  for (const [path, expectedSha256] of [
    ["coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger-v2.json", ADJUDICATION_LEDGER_SHA256],
    ["coordination/content-qa/authoritative/2026-08-13-hk-residual47-partition.json", "d1f7c2eaeea5deaa41fafcf75be28498e0919ce3eff9eeace55cf7c55baeeb37"],
    ["coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v3.json", SEMANTIC_REAUDIT_V3_SHA256],
    ["coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract.json", REPAIR_CONTRACT_SHA256],
    ["data/historical/hongKongQuestions-residual28-preimage-20260813.json", PREIMAGE_SNAPSHOT_SHA256],
    ["coordination/content-qa/authoritative/2026-08-13-data-questions-residual28-preimage.txt", "24ec6fb77921f0d22a8281179ac3a07f55817351ad31894a94cf72cfa5cc8f7a"]
  ] as const) assert.equal(fileSha(root, path), expectedSha256, `${path}: promotion authority drift`);
  const boundVersionManifest = readHongKongResidual28ReconstructionSource({
    repositoryRoot: root,
    sourcePostimagePath: "data/historical/hongKongQuestionVersionManifest.json",
    sourcePostimageSha256:
      "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92"
  });
  assert.equal(
    sha256(boundVersionManifest.bytes),
    "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92",
    "data/historical/hongKongQuestionVersionManifest.json: promotion authority drift"
  );
  const frozenById = new Map(snapshot.questions.map((question) => [question.id, question] as const));
  assert.equal(repairContract.repairs.length, 28);
  assert.equal(frozenById.size, 28);

  const promotions = repairContract.repairs.map((repair) => {
    assert.deepEqual([...repair.allowedPaths].sort(), Object.keys(repair.replacements).sort());
    const frozen = frozenById.get(repair.fromId);
    assert.ok(frozen, `${repair.fromId}: missing frozen preimage`);
    assert.equal(sha256(JSON.stringify(frozen)), repair.preimageQuestionPayloadSha256);
    const successor = structuredClone(frozen);
    successor.id = repair.toId;
    for (const [path, value] of Object.entries(repair.replacements)) {
      applyReplacement(successor, path, value);
    }
    return {
      fromId: repair.fromId,
      baseId: repair.baseId,
      toId: repair.toId,
      preimageQuestionPayloadSha256: sha256(JSON.stringify(frozen)),
      successorQuestionPayloadSha256: sha256(JSON.stringify(successor)),
      preimageMaterialSha256: sha256(materialFingerprint(frozen)),
      successorMaterialSha256: sha256(materialFingerprint(successor)),
      allowedPaths: repair.allowedPaths,
      replacements: repair.replacements,
      materialBindings: {
        question: "question-material-fingerprint-v1"
      }
    };
  });

  return {
    schemaVersion: current.schemaVersion,
    authority: {
      adjudicationLedgerPath:
        "coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger-v2.json",
      adjudicationLedgerSha256:
        ADJUDICATION_LEDGER_SHA256,
      residualPartitionPath: current.authority.residualPartitionPath,
      residualPartitionSha256: current.authority.residualPartitionSha256,
      semanticReauditPath:
        "coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v3.json",
      semanticReauditSha256: SEMANTIC_REAUDIT_V3_SHA256,
      repairContractPath:
        "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract.json",
      repairContractSha256: REPAIR_CONTRACT_SHA256,
      preimageSnapshotPath: current.authority.preimageSnapshotPath,
      preimageSnapshotSha256: PREIMAGE_SNAPSHOT_SHA256,
      preimageSourceQuestionsPath:
        "coordination/content-qa/authoritative/2026-08-13-data-questions-residual28-preimage.txt",
      preimageSourceQuestionsSha256: current.authority.preimageSourceQuestionsSha256
    },
    preimageVersionManifestReconstruction: {
      classification: "explicitly-reconstructible",
      sourcePostimagePath: "data/historical/hongKongQuestionVersionManifest.json",
      sourcePostimageSha256:
        "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92",
      serialization:
        "UTF-8 JSON.stringify({ schemaVersion, historySourceCommit, activeIdByHistoricalId, retiredHistoricalIds }, null, 2) + U+000A after exact28 postimage reversal",
      byteLength: 80523,
      sha256: "9f3c9173152b6cf8bd816df1422de4c18858f1c4c9bd0fbff8a95e49e0123ff1"
    },
    preimageActiveMappingCount: current.preimageActiveMappingCount,
    preimageRetiredIdCount: current.preimageRetiredIdCount,
    preimageHistoricalUniqueCount: current.preimageHistoricalUniqueCount,
    preExistingHistoricalOverlapIds: current.preExistingHistoricalOverlapIds,
    historyUniqueAdditionCount: current.historyUniqueAdditionCount,
    expectedPostActiveMappingCount: current.expectedPostActiveMappingCount,
    expectedPostRetiredIdCount: current.expectedPostRetiredIdCount,
    expectedPostHistoricalUniqueCount: current.expectedPostHistoricalUniqueCount,
    generationDistribution: current.generationDistribution,
    promotions
  };
}

export function assertCheckedInHongKongResidual28PromotionManifest() {
  const expected = buildHongKongResidual28PromotionManifest();
  assert.deepEqual(promotionManifestJson, expected);
  return expected;
}

if (process.argv[1]?.endsWith("build-hk-residual28-promotion-manifest.ts")) {
  const expected = buildHongKongResidual28PromotionManifest();
  if (process.argv.includes("--write")) {
    const target = join(process.cwd(), "data/historical/hongKongResidual28PromotionManifest.json");
    writeFileSync(target, `${JSON.stringify(expected, null, 2)}\n`);
    process.stdout.write("HK residual28 promotion manifest: deterministic bytes regenerated\n");
  } else {
    assert.deepEqual(promotionManifestJson, expected);
    process.stdout.write("HK residual28 promotion manifest: exact deterministic bytes verified\n");
  }
}
