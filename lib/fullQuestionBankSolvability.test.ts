import assert from "node:assert/strict";
import test from "node:test";
import { MAX_ANSWER_LENGTH, MAX_CURATED_ANSWER_LENGTH } from "./answerLimits";
import {
  hongKongEasePracticeQuestionGenerationMetadata,
  hongKongEasePracticeQuestions
} from "../data/hongKongEasePracticeQuestions";
import { contentMatchesCurriculumProfile } from "./curriculumProfile";
import {
  buildFullQuestionBankSolvabilityAudit,
  expectedHkBaseQuestionCount,
  buildMainlandPepFullQuestionBankQaReport,
  expectedFullQuestionBankCount,
  expectedHongKongEasePracticeQuestionCount,
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
  expectedMainlandHjbHighQuestionCount,
  expectedUnitedStatesCaliforniaG6G12QuestionCount,
  expectedUnitedStatesCaliforniaK5QuestionCount,
  expectedUnitedStatesCaliforniaQuestionCount,
  expectedUnitedStatesNorthCarolinaQuestionCount,
  expectedUnitedStatesArkansasG6G12QuestionCount,
  expectedUnitedStatesArkansasK5QuestionCount,
  expectedUnitedStatesArkansasQuestionCount,
  expectedUnitedStatesFloridaMiddleSchoolQuestionCount,
  optionMatchesAcceptedAnswer
} from "./questionBankSolvability";

test("option matching keeps a future 501-character curated correct alias selectable", () => {
  const reviewOnlyAnswer = `42${" ".repeat(MAX_ANSWER_LENGTH - 1)}`;
  assert.equal(reviewOnlyAnswer.length, MAX_ANSWER_LENGTH + 1);

  assert.equal(optionMatchesAcceptedAnswer({
    id: "future-review-only-option",
    curriculumTrack: "HK",
    grade: "P1",
    topicId: "numbers-p1",
    topic: { en: "Numbers", zh: "數字" },
    difficulty: "Low",
    type: "multiple-choice",
    prompt: { en: "Choose 42", zh: "選擇 42" },
    answer: reviewOnlyAnswer,
    acceptedAnswers: [],
    options: [
      { en: "41", zh: "41" },
      { en: "42", zh: "42" },
      { en: "43", zh: "43" }
    ],
    explanation: { en: "42", zh: "42" }
  }, { en: "42", zh: "42" }), true);
});

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
  assert.equal(report.summary.unitedStatesCaliforniaQuestions, expectedUnitedStatesCaliforniaQuestionCount);
  assert.equal(report.summary.unitedStatesNorthCarolinaQuestions, expectedUnitedStatesNorthCarolinaQuestionCount);
  assert.equal(report.summary.unitedStatesArkansasQuestions, expectedUnitedStatesArkansasQuestionCount);
  assert.equal(report.summary.unitedStatesFloridaMiddleSchoolQuestions, expectedUnitedStatesFloridaMiddleSchoolQuestionCount);
  assert.equal(report.summary.batchCounts.hk, expectedHkBaseQuestionCount);
  assert.equal(report.summary.batchCounts["hk-ease-practice-v1"], expectedHongKongEasePracticeQuestionCount);
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
  assert.equal(report.summary.batchCounts["hjb-v1"] ?? 0, 0);
  assert.equal(report.summary.batchCounts["hjb-v2"] ?? 0, expectedMainlandHjbHighQuestionCount);
  assert.equal(report.summary.batchCounts["hjb-v3-remediated"] ?? 0, 0);
  assert.equal(report.summary.batchCounts["hjb-v4-remediated"] ?? 0, 0);
  assert.equal(report.summary.batchCounts["us-ca-k5-knowledge-point-practice-v1"] ?? 0, expectedUnitedStatesCaliforniaK5QuestionCount);
  assert.equal(report.summary.batchCounts["us-ca-k-g5-v3-deepseek"] ?? 0, 0);
  assert.equal(report.summary.batchCounts["us-ca-g6-g12-v2"] ?? 0, expectedUnitedStatesCaliforniaG6G12QuestionCount);
  assert.equal(report.summary.batchCounts["us-ca-live-v1"] ?? 0, 0);
  assert.equal(report.summary.batchCounts["us-nc-live-v1"] ?? 0, expectedUnitedStatesNorthCarolinaQuestionCount);
  assert.equal(report.summary.batchCounts["us-ar-k-g5-v1"] ?? 0, expectedUnitedStatesArkansasK5QuestionCount);
  assert.equal(report.summary.batchCounts["us-ar-g6-g12-v1"] ?? 0, expectedUnitedStatesArkansasG6G12QuestionCount);
  assert.equal(report.summary.batchCounts["us-fl-ms-v1"] ?? 0, expectedUnitedStatesFloridaMiddleSchoolQuestionCount);
  assert.equal(report.rows.length, expectedFullQuestionBankCount);
  assert.equal(report.summary.passRows, expectedFullQuestionBankCount);
  assert.equal(report.summary.failingRows, 0);
  assert.equal(report.summary.reviewOnlyCuratedAnswers, 26);
  assert.equal(report.summary.invalidCuratedAnswers, 0);
  assert.deepEqual(report.failingRows, []);

  const curatedAnswerReviews = report.rows.flatMap((row) => row.curatedAnswerReviews);
  assert.equal(curatedAnswerReviews.length, 26);
  assert.ok(curatedAnswerReviews.every((review) => review.status === "review-only"));
  assert.ok(curatedAnswerReviews.every((review) => review.length > MAX_ANSWER_LENGTH));
  assert.ok(curatedAnswerReviews.every((review) => review.length <= MAX_CURATED_ANSWER_LENGTH));
});

test("Hong Kong EASE Practice V1 exposes only S18 green text-only questions across HK publishers", () => {
  assert.equal(hongKongEasePracticeQuestions.length, expectedHongKongEasePracticeQuestionCount);
  assert.equal(Object.keys(hongKongEasePracticeQuestionGenerationMetadata).length, expectedHongKongEasePracticeQuestionCount);

  const ids = new Set(hongKongEasePracticeQuestions.map((question) => question.id));
  assert.equal(ids.size, hongKongEasePracticeQuestions.length);

  for (const question of hongKongEasePracticeQuestions) {
    const metadata = hongKongEasePracticeQuestionGenerationMetadata[question.id];
    assert.ok(metadata, `${question.id} should have EASE QA metadata`);
    assert.equal(question.curriculumTrack, "HK");
    assert.equal(question.region, "HK");
    assert.equal(question.publisher, undefined);
    assert.equal(question.questionAssets, undefined);
    assert.equal(metadata.sourceDistanceStatus, "passed-s18-ease-text-only-source-scan");
    assert.equal(metadata.mathQaStatus, "pass");
    assert.equal(metadata.answerQaStatus, "pass");
    assert.equal(metadata.assetQaStatus, "text-only");
    assert.equal(metadata.manualQaStatus, "approved-text-only-green-batch");
    assert.ok(metadata.independentAnswer.trim());
    assert.ok(question.acceptedAnswers?.includes(metadata.independentAnswer) || question.answer === metadata.independentAnswer);
    assert.ok(contentMatchesCurriculumProfile(question, { region: "HK", publisher: "HK_UNITED_PRIME_MIA" }));
    assert.ok(contentMatchesCurriculumProfile(question, { region: "HK", publisher: "HK_EPH_MIF" }));
  }
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
