import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  independentMainlandPepPrimaryAnswer,
  mainlandPepPrimaryQuestionGenerationMetadata,
  mainlandPepPrimaryManualReviewReplacementQuestionIds,
  mainlandPepPrimaryRagV1Questions
} from "../data/mainlandPepPrimaryQuestions";
import { mainlandPepPrimaryTopics } from "../data/mainlandPepPrimaryTopics";
import { questions } from "../data/questions";
import { mainlandPepPrimaryExamPatternCards } from "../data/rag/mainlandPepPrimaryExamPatterns";
import { mainlandPepPrimaryRagCards } from "../data/rag/mainlandPepPrimary";
import {
  mainlandPepQuestionAssetFor,
  mainlandPepQuestionAssetSrc,
  mainlandPepQuestionIllustrationApprovals,
  mainlandPepQuestionPromptHash
} from "./mainlandPepQuestionAssets";
import type { Difficulty, GradeId, Question, QuestionType } from "@/types";

const primaryGrades: Extract<GradeId, "P1" | "P2" | "P3" | "P4" | "P5" | "P6">[] = ["P1", "P2", "P3", "P4", "P5", "P6"];
const generatedTypes: Exclude<QuestionType, "graph">[] = ["multiple-choice", "fill-in", "short-answer"];
const expectedPrimaryQuestionCount = 1200;
const cjkPattern = /[\u3400-\u9fff]/u;

function countBy<T extends string>(values: T[]) {
  const counts: Record<string, number> = {};
  values.forEach((value) => {
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return counts;
}

function expectedTypeQuota(grade: GradeId) {
  if (grade === "P1" || grade === "P2") return { "multiple-choice": 90, "fill-in": 80, "short-answer": 30 };
  if (grade === "P3" || grade === "P4") return { "multiple-choice": 75, "fill-in": 75, "short-answer": 50 };
  return { "multiple-choice": 60, "fill-in": 70, "short-answer": 70 };
}

function expectedDifficultyQuota(grade: GradeId): Record<Difficulty, number> {
  if (grade === "P1" || grade === "P2") return { Low: 120, Medium: 70, High: 10 };
  if (grade === "P3" || grade === "P4") return { Low: 80, Medium: 95, High: 25 };
  return { Low: 60, Medium: 100, High: 40 };
}

function publicAssetPath(src: string) {
  return path.join(process.cwd(), "public", src.replace(/^\//, ""));
}

function assertQuestionImageAssetIsGated(question: Question) {
  const approvedAsset = mainlandPepQuestionAssetFor(question);
  const imageAssets = question.questionAssets?.filter((asset) => asset.kind === "image") ?? [];

  if (!approvedAsset) {
    assert.equal(imageAssets.length, 0, `${question.id} should remain text-only without an approved exact image asset`);
    return;
  }

  assert.deepEqual(
    imageAssets.map((asset) => asset.src),
    [approvedAsset.src],
    `${question.id} should expose only the approved exact image asset`
  );
  assert.equal(existsSync(publicAssetPath(approvedAsset.src)), true, `${question.id} approved PNG asset should exist at ${approvedAsset.src}`);
}

function englishVisibleTextFields(question: Question): Array<[string, string]> {
  return [
    ["topic", question.topic.en],
    ["prompt", question.prompt.en],
    ["answer", question.answer],
    ["explanation", question.explanation.en],
    ...(question.options ?? []).map((option, index) => [`option ${index + 1}`, option.en] as [string, string])
  ];
}

test("Mainland PEP primary rag-v1 question bank has requested grade, semester, type, and difficulty coverage", () => {
  assert.equal(mainlandPepPrimaryManualReviewReplacementQuestionIds.length, 166);
  assert.equal(new Set(mainlandPepPrimaryManualReviewReplacementQuestionIds).size, 166);
  assert.equal(mainlandPepPrimaryRagV1Questions.length, expectedPrimaryQuestionCount);

  mainlandPepPrimaryManualReviewReplacementQuestionIds.forEach((questionId) => {
    const question = mainlandPepPrimaryRagV1Questions.find((candidate) => candidate.id === questionId);
    assert.ok(question, `${questionId} should be restored in the public primary rag-v1 bank`);
    assert.ok(mainlandPepPrimaryQuestionGenerationMetadata[questionId], `${questionId} should have public metadata`);
    assert.equal(/第[0-9０-９]+小组/.test(question.prompt.zh), false, `${questionId} replacement prompt should not use the old group prefix`);
  });

  primaryGrades.forEach((grade) => {
    const gradeQuestions = mainlandPepPrimaryRagV1Questions.filter((question) => question.grade === grade);
    assert.equal(gradeQuestions.length, 200, `${grade} should have 200 primary rag-v1 questions`);

    const semesterCounts = countBy(
      gradeQuestions.map((question) => mainlandPepPrimaryQuestionGenerationMetadata[question.id]?.semester ?? "missing")
    );
    assert.ok((semesterCounts.upper ?? 0) > 0, `${grade} upper semester should retain questions`);
    assert.ok((semesterCounts.lower ?? 0) > 0, `${grade} lower semester should retain questions`);

    const typeCounts = countBy(gradeQuestions.map((question) => question.type));
    generatedTypes.forEach((type) => {
      const originalTypeCount = expectedTypeQuota(grade)[type];
      if (originalTypeCount > 0) assert.ok((typeCounts[type] ?? 0) > 0, `${grade} should retain ${type} questions`);
    });

    const difficultyCounts = countBy(gradeQuestions.map((question) => question.difficulty));
    Object.entries(expectedDifficultyQuota(grade)).forEach(([difficulty, originalCount]) => {
      if (originalCount > 0) assert.ok((difficultyCounts[difficulty] ?? 0) > 0, `${grade} should retain ${difficulty} questions`);
    });
  });
});

test("Mainland PEP primary questions are app-integrated, track-compatible, and independently answerable", () => {
  const topicIds = new Set(mainlandPepPrimaryTopics.map((topic) => topic.id));
  const primaryIds = new Set(mainlandPepPrimaryRagV1Questions.map((question) => question.id));
  const combinedPrimaryQuestions = questions.filter((question) => primaryIds.has(question.id));
  const ids = new Set<string>();

  assert.equal(combinedPrimaryQuestions.length, expectedPrimaryQuestionCount);
  combinedPrimaryQuestions.forEach(assertQuestionImageAssetIsGated);

  mainlandPepPrimaryRagV1Questions.forEach((question) => {
    assert.equal(question.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(question.region, "MAINLAND");
    assert.equal(question.publisher, "MAINLAND_PEP");
    assert.ok(topicIds.has(question.topicId), `${question.id} uses missing topic ${question.topicId}`);
    assert.ok(!ids.has(question.id), `duplicate question id ${question.id}`);
    ids.add(question.id);
    assert.ok(question.prompt.en.trim() && question.prompt.zh.trim(), `${question.id} is missing prompt text`);
    assert.ok(question.explanation.en.trim() && question.explanation.zh.trim(), `${question.id} is missing explanation text`);
    assert.equal(independentMainlandPepPrimaryAnswer(question), question.answer, `${question.id} answer should match deterministic audit solver`);
  });
});

test("Mainland PEP primary English-visible question text does not leak Chinese characters", () => {
  mainlandPepPrimaryRagV1Questions.forEach((question) => {
    englishVisibleTextFields(question).forEach(([field, value]) => {
      assert.doesNotMatch(value, cjkPattern, `${question.id} ${field} should be English-mode safe`);
    });
  });
});

test("Mainland PEP question illustration approvals require the current prompt hash", () => {
  const question = mainlandPepPrimaryRagV1Questions[0];
  assert.ok(question, "sample Mainland PEP primary question should exist");
  const originalApprovalCount = mainlandPepQuestionIllustrationApprovals.length;
  const currentPromptHash = mainlandPepQuestionPromptHash(question);

  try {
    mainlandPepQuestionIllustrationApprovals.push({
      questionId: question.id,
      promptHash: currentPromptHash === "00000000" ? "ffffffff" : "00000000",
      qaStatus: "approved",
      approvedAtHkt: "2026-06-04 00:00:00",
      approvedBySession: "S18",
      mathLayer: "prompt-specific-exact"
    });
    assert.equal(
      mainlandPepQuestionAssetFor(question),
      null,
      "approved row with a stale or mismatched prompt hash must not expose a question image"
    );

    mainlandPepQuestionIllustrationApprovals.push({
      questionId: question.id,
      promptHash: currentPromptHash,
      qaStatus: "approved",
      approvedAtHkt: "2026-06-04 00:00:00",
      approvedBySession: "S18",
      mathLayer: "prompt-specific-exact"
    });
    const approvedAsset = mainlandPepQuestionAssetFor(question);
    assert.equal(approvedAsset?.src, mainlandPepQuestionAssetSrc(question.id));
  } finally {
    mainlandPepQuestionIllustrationApprovals.length = originalApprovalCount;
  }
});

test("Mainland PEP primary generated questions cite safe RAG and paper-pattern evidence", () => {
  const ragCardIds = new Set(mainlandPepPrimaryRagCards.map((card) => card.id));
  const examPatternCardIds = new Set(mainlandPepPrimaryExamPatternCards.map((card) => card.id));

  mainlandPepPrimaryRagV1Questions.forEach((question) => {
    const metadata = mainlandPepPrimaryQuestionGenerationMetadata[question.id];
    assert.ok(metadata, `${question.id} is missing metadata`);
    assert.equal(metadata.batch, "primary-rag-v1");
    assert.equal(metadata.sourceDistanceStatus, "passed");
    assert.equal(metadata.grade, question.grade);
    assert.equal(metadata.type, question.type);
    assert.equal(metadata.topicId, question.topicId);
    assert.ok(metadata.evidenceCardIds.length > 0, `${question.id} should cite at least one primary safe RAG card`);
    assert.ok(metadata.examPatternCardIds.length > 0, `${question.id} should cite at least one primary exam-pattern card`);
    assert.ok(metadata.evidenceCardIds.every((cardId) => ragCardIds.has(cardId)), `${question.id} cites unknown RAG evidence`);
    assert.ok(metadata.examPatternCardIds.every((cardId) => examPatternCardIds.has(cardId)), `${question.id} cites unknown exam-pattern evidence`);
  });
});

test("Mainland PEP primary multiple-choice items have four unique options and one correct option", () => {
  mainlandPepPrimaryRagV1Questions
    .filter((question) => question.type === "multiple-choice")
    .forEach((question) => {
      const options = question.options ?? [];
      const optionValues = options.map((option) => option.en);
      assert.equal(options.length, 4, `${question.id} should have four options`);
      assert.equal(new Set(optionValues).size, 4, `${question.id} should have unique options`);
      assert.equal(optionValues.filter((option) => option === question.answer).length, 1, `${question.id} should have exactly one correct option`);
    });
});

test("Mainland PEP primary coordinate multiple-choice distractors do not append fallback suffixes", () => {
  const question = mainlandPepPrimaryRagV1Questions.find((candidate) => candidate.id === "pep-primary-p6-u-mc-052");
  assert.ok(question, "pep-primary-p6-u-mc-052 should exist");
  assert.deepEqual(
    question.options?.map((option) => option.en),
    ["(-1, 0)", "(0, 0)", "(0, 1)", "(1, 0)"]
  );
});

test("Mainland PEP primary generated questions avoid source-copying artifacts and old group prefixes", () => {
  const joined = (...parts: string[]) => parts.join("");
  const forbiddenPatterns = [
    joined("教", "材", "原", "文"),
    joined("原", "题"),
    joined("答", "案", "原", "句"),
    "OCR",
    "source locator",
    "archive path",
    /第[0-9０-９]+页/,
    /第[0-9０-９]+小组/,
    /Group [0-9０-９]+:/i,
    /page [0-9]+/i,
    /p\.[0-9]+/i
  ];
  const serialized = JSON.stringify(mainlandPepPrimaryRagV1Questions);

  forbiddenPatterns.forEach((pattern) => {
    if (typeof pattern === "string") {
      assert.equal(serialized.includes(pattern), false, `Generated primary questions contain forbidden text: ${pattern}`);
    } else {
      assert.equal(pattern.test(serialized), false, `Generated primary questions match forbidden pattern: ${pattern}`);
    }
  });
});
