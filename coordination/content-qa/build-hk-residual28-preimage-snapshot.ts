import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import snapshotJson from "../../data/historical/hongKongQuestions-residual28-preimage-20260813.json";

const TARGET_PATH = "data/historical/hongKongQuestions-residual28-preimage-20260813.json";
const SOURCE_QUESTIONS_PATH =
  "coordination/content-qa/authoritative/2026-08-13-data-questions-residual28-preimage.txt";
const SOURCE_QUESTIONS_SHA256 = "24ec6fb77921f0d22a8281179ac3a07f55817351ad31894a94cf72cfa5cc8f7a";
const RECOVERY_RECEIPT_PATH =
  "coordination/content-qa/authoritative/2026-08-13-hk-residual28-source-recovery-receipt.json";
const RECOVERY_RECEIPT_SHA256 = "badd8ba52a6da7f7960a40f1da900357d8f9aac87a5fc0b215004143a6f60807";
const CURRENT_QUESTIONS_PATH = "data/questions.ts";
const CURRENT_QUESTIONS_SHA256 = "96d90f3c090b14bd7797155ffcbb20edcbf2230147a945f6c02ec32a470dbca8";
const ADJUDICATION_LEDGER_PATH =
  "coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger-v2.json";
const ADJUDICATION_LEDGER_SHA256 = "0879eb17b5c65ac76a38f311972f279e1c47d6c3b2c8dec22aabea6af830716c";
const RESIDUAL_PARTITION_PATH =
  "coordination/content-qa/authoritative/2026-08-13-hk-residual47-partition.json";
const RESIDUAL_PARTITION_SHA256 = "d1f7c2eaeea5deaa41fafcf75be28498e0919ce3eff9eeace55cf7c55baeeb37";

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha(relativePath: string) {
  return sha256(readFileSync(join(process.cwd(), relativePath)));
}

function sha256Json(value: unknown) {
  return sha256(JSON.stringify(value));
}

export function buildHongKongResidual28PreimageSnapshot() {
  for (const [path, expectedSha256] of [
    [SOURCE_QUESTIONS_PATH, SOURCE_QUESTIONS_SHA256],
    [RECOVERY_RECEIPT_PATH, RECOVERY_RECEIPT_SHA256],
    [CURRENT_QUESTIONS_PATH, CURRENT_QUESTIONS_SHA256],
    [ADJUDICATION_LEDGER_PATH, ADJUDICATION_LEDGER_SHA256],
    [RESIDUAL_PARTITION_PATH, RESIDUAL_PARTITION_SHA256]
  ] as const) {
    assert.equal(fileSha(path), expectedSha256, `${path}: snapshot authority drift`);
  }
  const snapshot = snapshotJson as any;
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.questions.length, 28);
  assert.equal(sha256Json(snapshot.questions), snapshot.questionsPayloadSha256);
  const orderedIds = snapshot.questions.map((question: { id: string }) => question.id);
  assert.equal(new Set(orderedIds).size, 28);
  assert.equal(sha256Json(orderedIds), snapshot.orderedIdListSha256);
  assert.equal(sha256Json([...orderedIds].sort()), snapshot.sortedIdListSha256);
  assert.deepEqual(snapshot.preExistingHistoricalOverlapIds, ["supp-p4-decimals-guided-example"]);
  assert.equal(snapshot.historyUniqueAdditionCount, 27);
  return {
    ...snapshot,
    sourceQuestionsPath: SOURCE_QUESTIONS_PATH,
    sourceQuestionsSha256: SOURCE_QUESTIONS_SHA256,
    sourceQuestionsRecoveryReceiptPath: RECOVERY_RECEIPT_PATH,
    sourceQuestionsRecoveryReceiptSha256: RECOVERY_RECEIPT_SHA256,
    currentQuestionsPath: CURRENT_QUESTIONS_PATH,
    currentQuestionsSha256: CURRENT_QUESTIONS_SHA256,
    adjudicationLedgerPath: ADJUDICATION_LEDGER_PATH,
    adjudicationLedgerSha256: ADJUDICATION_LEDGER_SHA256,
    residualPartitionPath: RESIDUAL_PARTITION_PATH,
    residualPartitionSha256: RESIDUAL_PARTITION_SHA256
  };
}

export function assertCheckedInHongKongResidual28PreimageSnapshot() {
  const expected = buildHongKongResidual28PreimageSnapshot();
  assert.deepEqual(snapshotJson, expected);
  return expected;
}

if (process.argv[1]?.endsWith("build-hk-residual28-preimage-snapshot.ts")) {
  if (process.argv.includes("--write")) {
    writeFileSync(
      join(process.cwd(), TARGET_PATH),
      `${JSON.stringify(buildHongKongResidual28PreimageSnapshot(), null, 2)}\n`
    );
    process.stdout.write("HK residual28 preimage snapshot: deterministic authority bytes regenerated\n");
  } else {
    assertCheckedInHongKongResidual28PreimageSnapshot();
    process.stdout.write("HK residual28 preimage snapshot: exact deterministic bytes verified\n");
  }
}
