import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFullQuestionBankSolvabilityAudit,
  buildMainlandPepFullQuestionBankQaReport,
  expectedFullQuestionBankCount,
  expectedHkQuestionCount,
  expectedMainlandPepJuniorQuestionCount,
  expectedMainlandPepFullQuestionBankCount,
  expectedMainlandPepPrimaryQuestionCount,
  expectedMainlandPepHighQuestionCount,
  expectedMainlandBnuHighQuestionCount,
  expectedMainlandBnuPrimaryQuestionCount,
  expectedMainlandBnuJuniorQuestionCount,
  expectedMainlandHjbJuniorQuestionCount,
  expectedMainlandHjbPrimaryQuestionCount,
  expectedMainlandHjbHighQuestionCount
} from "./questionBankSolvability";

test("full question bank is independently solvable and answer-key matched", () => {
  const report = buildFullQuestionBankSolvabilityAudit("2026-05-22");

  assert.equal(report.summary.totalQuestions, expectedFullQuestionBankCount);
  assert.equal(report.summary.hkQuestions, expectedHkQuestionCount);
  assert.equal(report.summary.mainlandPepPrimaryQuestions, expectedMainlandPepPrimaryQuestionCount);
  assert.equal(report.summary.mainlandPepJuniorQuestions, expectedMainlandPepJuniorQuestionCount);
  assert.equal(report.summary.mainlandPepHighQuestions, expectedMainlandPepHighQuestionCount);
  assert.equal(report.summary.mainlandBnuPrimaryQuestions, expectedMainlandBnuPrimaryQuestionCount);
  assert.equal(report.summary.mainlandBnuJuniorQuestions, expectedMainlandBnuJuniorQuestionCount);
  assert.equal(report.summary.mainlandBnuHighQuestions, expectedMainlandBnuHighQuestionCount);
  assert.equal(report.summary.mainlandHjbJuniorQuestions, expectedMainlandHjbJuniorQuestionCount);
  assert.equal(report.summary.mainlandHjbPrimaryQuestions, expectedMainlandHjbPrimaryQuestionCount);
  assert.equal(report.summary.mainlandHjbHighQuestions, expectedMainlandHjbHighQuestionCount);
  assert.equal(report.summary.batchCounts.hk, expectedHkQuestionCount);
  assert.equal(report.summary.batchCounts["primary-rag-v1"], expectedMainlandPepPrimaryQuestionCount);
  assert.equal(report.summary.batchCounts["junior-rag-v2-1200"], expectedMainlandPepJuniorQuestionCount);
  assert.equal(report.summary.batchCounts["seed-v1"], 900);
  assert.equal(report.summary.batchCounts["rag-v2"], 900);
  assert.equal(report.summary.batchCounts["rag-v3"], 1500);
  assert.equal(report.summary.batchCounts["rag-v4"], 1500);
  assert.equal(report.summary.batchCounts["bnu-primary-v1"] ?? 0, 1500);
  assert.equal(report.summary.batchCounts["bnu-primary-v2"] ?? 0, 1500);
  assert.equal(report.summary.batchCounts["bnu-junior-v1-1500"] ?? 0, expectedMainlandBnuJuniorQuestionCount);
  assert.equal(report.summary.batchCounts["bnu-high-v1-approved"] ?? 0, expectedMainlandBnuHighQuestionCount);
  assert.equal(report.summary.batchCounts["hjb-junior-v2-1500"] ?? 0, expectedMainlandHjbJuniorQuestionCount);
  assert.equal(report.summary.batchCounts["hjb-primary-v1"] ?? 0, expectedMainlandHjbPrimaryQuestionCount);
  assert.equal(report.summary.batchCounts["hjb-v1"] ?? 0, 1500);
  assert.equal(report.summary.batchCounts["hjb-v2"] ?? 0, 1500);
  assert.equal(report.summary.batchCounts["hjb-v3-remediated"] ?? 0, 1500);
  assert.equal(report.summary.batchCounts["hjb-v4-remediated"] ?? 0, 1500);
  assert.equal(report.rows.length, expectedFullQuestionBankCount);
  assert.equal(report.summary.passRows, expectedFullQuestionBankCount);
  assert.equal(report.summary.failingRows, 0);
  assert.deepEqual(report.failingRows, []);
});

test("Mainland PEP full question bank emits row-level solvability and answer-key QA verdicts", () => {
  const report = buildMainlandPepFullQuestionBankQaReport("2026-05-24");

  assert.equal(report.summary.expectedQuestions, expectedMainlandPepFullQuestionBankCount);
  assert.equal(report.summary.totalQuestions, expectedMainlandPepFullQuestionBankCount);
  assert.equal(report.summary.primaryQuestions, expectedMainlandPepPrimaryQuestionCount);
  assert.equal(report.summary.juniorQuestions, expectedMainlandPepJuniorQuestionCount);
  assert.equal(report.summary.highQuestions, expectedMainlandPepHighQuestionCount);
  assert.equal(report.rows.length, expectedMainlandPepFullQuestionBankCount);
  assert.equal(report.summary.passRows, expectedMainlandPepFullQuestionBankCount);
  assert.equal(report.summary.reviewRows, 0);
  assert.equal(report.summary.p0Rows, 0);
  assert.equal(report.summary.p1Rows, 0);
  assert.equal(report.summary.p2Rows, 0);
  assert.equal(report.summary.duplicateIdCount, 0);
  assert.equal(report.summary.inventoryIssueCount, 0);
  assert.equal(report.summary.sourceStatusCounts.pass, expectedMainlandPepFullQuestionBankCount);
  assert.deepEqual(report.summary.solvableStatusCounts, { pass: expectedMainlandPepFullQuestionBankCount });
  assert.deepEqual(report.summary.answerMatchStatusCounts, { pass: expectedMainlandPepFullQuestionBankCount });
  assert.deepEqual(report.summary.qaStatusCounts, { pass: expectedMainlandPepFullQuestionBankCount });
  assert.deepEqual(report.summary.batchCounts, {
    "primary-rag-v1": expectedMainlandPepPrimaryQuestionCount,
    "junior-rag-v2-1200": expectedMainlandPepJuniorQuestionCount,
    "seed-v1": 900,
    "rag-v2": 900,
    "rag-v3": 1500,
    "rag-v4": 1500
  });
  assert.ok(report.summary.manualReviewQueueRows > 0);
  assert.ok(report.rows.every((row) => row.independentAnswer.trim()), "every Mainland PEP QA row should include an independent answer");
  assert.ok(report.rows.every((row) => row.solvableStatus === "pass" && row.answerMatchStatus === "pass"));
});
