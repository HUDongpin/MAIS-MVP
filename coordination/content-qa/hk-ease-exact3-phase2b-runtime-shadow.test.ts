import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

type JsonRecord = Record<string, any>;

const shadowTest = process.env.HK_EASE_PHASE2B2_SHADOW === "1" ? test : test.skip;

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(relativePath: string) {
  return JSON.parse(readFileSync(join(process.cwd(), relativePath), "utf8")) as JsonRecord;
}

shadowTest("Phase2B.2 shadow serves exact3 through one overlay, one-hop history, and strict public grading", async () => {
  const [questionDataModule, loaderModule, versioningModule, answerMatchingModule] = await Promise.all([
    import("../../data/questions") as Promise<unknown>,
    import("../../data/hongKongEasePracticeQuestions") as Promise<unknown>,
    import("../../lib/hongKongQuestionVersioning") as Promise<unknown>,
    import("../../lib/server/answerMatching") as Promise<unknown>
  ]);
  const questionData = questionDataModule as JsonRecord;
  const loader = loaderModule as JsonRecord;
  const versioning = versioningModule as JsonRecord;
  const answerMatching = answerMatchingModule as JsonRecord;

  const pack = readJson("data/generated-content/hk-ease-practice-bank-v2/question-pack.json");
  const audit = readJson("data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json");
  const strict = readJson("data/generated-content/hk-ease-practice-bank-v2/response-contracts.json");
  const simple = readJson("data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json");
  const overlay = readJson("data/generated-content/hk-ease-practice-bank-v2/exact3-independent-oracle-supplement.json");
  const history = readJson("data/historical/hongKongQuestions-hk-ease-exact3-v3.json");
  const versionManifest = readJson("data/historical/hongKongQuestionVersionManifest.json");
  const authority = readJson(
    "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-runtime-candidate/runtime-hold-authority-v1.json"
  );

  assert.equal(loader.HONG_KONG_EASE_V2_QUESTION_PACK_SHA256,
    "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf");
  assert.equal(loader.HONG_KONG_EASE_V3_INDEPENDENT_ORACLE_SHA256,
    "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62");
  assert.equal(loader.HONG_KONG_EASE_EXACT3_ORACLE_OVERLAY_SHA256,
    "3b1b5b5a4e4034712086de8345b04e74e435f58e4c7c8ed73c5d801cfad4b19c");
  assert.equal(versioning.HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256,
    "e5a696da5e8d5e1cc31259a6736d6d9974c08fdf25a57298a6958ffcd11b440b");
  assert.equal(strict.positiveProbeCount, 584);
  assert.equal(strict.negativeProbeCount, 581);
  assert.equal(simple.candidateSha256, loader.HONG_KONG_EASE_V2_QUESTION_PACK_SHA256);
  assert.equal(overlay.rowCount, 3);
  assert.equal(history.questionCount, 3);
  assert.equal(Object.keys(versionManifest.activeIdByHistoricalId).length, 1111);
  assert.equal(versionManifest.retiredHistoricalIds.length, 1112);
  assert.equal(questionData.activeHongKongQuestionIdByHistoricalId.size, 1111);
  assert.equal(questionData.retiredHongKongQuestionIds.size, 1112);
  assert.deepEqual(
    Object.fromEntries(questionData.activeHongKongQuestionIdByHistoricalId),
    versionManifest.activeIdByHistoricalId
  );
  assert.deepEqual(
    [...questionData.retiredHongKongQuestionIds].sort(),
    [...versionManifest.retiredHistoricalIds].sort()
  );

  const targetBaseIds = ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"];
  const packById = new Map(pack.questions.map((row: JsonRecord) => [row.id, row]));
  const activeById = new Map(questionData.questions.map((row: JsonRecord) => [row.id, row]));
  const metadata = loader.hongKongEasePracticeQuestionGenerationMetadata as JsonRecord;
  let acceptedSurfaceCount = 0;
  let negativeProbeCount = 0;
  for (const baseId of targetBaseIds) {
    const activeId = `${baseId}-v3`;
    assert.equal(versionManifest.activeIdByHistoricalId[baseId], activeId);
    assert.equal(versionManifest.activeIdByHistoricalId[`${baseId}-v2`], activeId);
    assert.equal(questionData.retiredHongKongQuestionIds.has(baseId), true);
    assert.equal(questionData.retiredHongKongQuestionIds.has(`${baseId}-v2`), true);
    assert.equal(questionData.retiredHongKongQuestionIds.has(activeId), false);
    assert.ok(versioning.historicalHongKongQuestionForId(baseId), `${baseId}: base preimage`);
    assert.ok(versioning.historicalHongKongQuestionForId(`${baseId}-v2`), `${baseId}: v2 preimage`);
    assert.ok(versioning.historicalHongKongQuestionForId(activeId), `${baseId}: v3 history`);

    const packed = packById.get(baseId) as JsonRecord;
    const active = activeById.get(activeId) as JsonRecord;
    assert.ok(packed && active, `${baseId}: active and pack rows`);
    assert.equal(active.answer, packed.answer);
    assert.deepEqual(active.acceptedAnswers, packed.acceptedAnswers);
    assert.equal(metadata[baseId].independentlyReviewedAnswer, packed.answer);
    assert.match(metadata[baseId].independentOracleStatus, /exact3-independent-overlay-v2$/);

    const gradingPayload = {
      id: activeId,
      answer: active.answer,
      accepted_answers: active.acceptedAnswers,
      options: active.options
    };
    for (const accepted of packed.acceptedAnswers) {
      acceptedSurfaceCount += 1;
      assert.equal(answerMatching.questionAnswerMatches(gradingPayload, accepted), true,
        `${baseId}: accepted ${JSON.stringify(accepted)}`);
    }
    const auditRow = audit.entries.find((row: JsonRecord) => row.baseId === baseId);
    assert.ok(auditRow, `${baseId}: audit row`);
    for (const probe of auditRow.negativeProbes) {
      negativeProbeCount += 1;
      assert.equal(answerMatching.questionAnswerMatches(gradingPayload, probe.input), false,
        `${baseId}: rejected ${JSON.stringify(probe.input)}`);
    }
  }
  assert.equal(acceptedSurfaceCount, 35);
  assert.equal(negativeProbeCount, 30);
  assert.equal(versioning.easeExact3V3HistoricalHongKongQuestions.length, 3);

  for (const binding of authority.outputBindings as JsonRecord[]) {
    assert.equal(
      sha256(readFileSync(join(process.cwd(), binding.logicalTargetPath))),
      binding.sha256,
      `${binding.logicalTargetPath}: shadow postimage SHA`
    );
  }
});
