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
import mainlandPepPrimaryLessonPackJson from "../data/generated-content/mainland-pep-primary-lessons-v1/lessons.json";
import { mainlandPepPrimaryLessonSeeds } from "../data/mainlandPepPrimaryLessons";
import { mainlandPepPrimaryTopics } from "../data/mainlandPepPrimaryTopics";
import { productionLessonByTopicId, type ProductionLessonSeed } from "../data/lessons";
import { questions } from "../data/questions";
import { mainlandPepPrimaryExamPatternCards } from "../data/rag/mainlandPepPrimaryExamPatterns";
import { mainlandPepPrimaryRagCards } from "../data/rag/mainlandPepPrimary";
import {
  mainlandPepQuestionAssetFor,
  mainlandPepQuestionAssetSrc,
  mainlandPepQuestionIllustrationApprovals,
  mainlandPepQuestionPromptHash
} from "./mainlandPepQuestionAssets";
import { dedupePracticeQuestions } from "./practiceQuestionDeduping";
import { questionAnswerMatches } from "./server/answerMatching";
import type { Difficulty, GradeId, Question, QuestionType } from "@/types";

const primaryGrades: Extract<GradeId, "P1" | "P2" | "P3" | "P4" | "P5" | "P6">[] = ["P1", "P2", "P3", "P4", "P5", "P6"];
const generatedTypes: Exclude<QuestionType, "graph">[] = ["multiple-choice", "fill-in", "short-answer"];
const expectedPrimaryQuestionCount = 1200;
const cjkPattern = /[\u3400-\u9fff]/u;
const ambiguousMultiplicationX = /(?:\d+(?:\.\d+)?|[)）□%]|length|width|height|side|base|factor|groups?|rows?|columns?|长|長|宽|寬|高|边|邊|底)\s*[xX]\s*(?:\d+(?:\.\d+)?|[(（□%]|length|width|height|side|base|factor|groups?|rows?|columns?|长|長|宽|寬|高|边|邊|底)/iu;

const reviewedPrimaryLessonPractice = {
  "pep-primary-p1-upper-number-sense": [
    ["pep-primary-p1-u-mc-001", "3"],
    ["pep-primary-p1-u-mc-002", "17"],
    ["pep-primary-p1-u-mc-003", "10"],
    ["pep-primary-p1-u-mc-005", "9"],
    ["pep-primary-p1-u-mc-006", "8"]
  ],
  "pep-primary-p1-upper-shapes-position-time": [
    ["pep-primary-p1-u-mc-051", "sphere"],
    ["pep-primary-p1-u-mc-052", "cuboid"],
    ["pep-primary-p1-u-mc-053", "cube"],
    ["pep-primary-p1-u-mc-054", "cylinder"],
    ["pep-primary-p1-u-fi-091", "cuboid"]
  ],
  "pep-primary-p1-lower-within-100-add-sub": [
    ["pep-primary-p1-l-fi-101", "60"],
    ["pep-primary-p1-l-fi-102", "57"],
    ["pep-primary-p1-l-fi-103", "75"],
    ["pep-primary-p1-l-fi-104", "51"],
    ["pep-primary-p1-l-fi-105", "76"]
  ],
  "pep-primary-p1-lower-money-data-review": [
    ["pep-primary-p1-l-fi-151", "7"],
    ["pep-primary-p1-l-fi-152", "8"],
    ["pep-primary-p1-l-fi-153", "30 min"],
    ["pep-primary-p1-l-fi-155", "9"],
    ["pep-primary-p1-l-sa-191", "11"]
  ],
  "pep-primary-p2-upper-multiplication-arrays": [
    ["pep-primary-p2-u-mc-001", "16"],
    ["pep-primary-p2-u-mc-002", "12"],
    ["pep-primary-p2-u-mc-003", "8"],
    ["pep-primary-p2-u-mc-004", "36"],
    ["pep-primary-p2-u-mc-005", "63"]
  ],
  "pep-primary-p2-upper-length-angles-observation": [
    ["pep-primary-p2-u-mc-051", "92 cm"],
    ["pep-primary-p2-u-mc-052", "4"],
    ["pep-primary-p2-u-mc-053", "3"],
    ["pep-primary-p2-u-mc-054", "37 cm"],
    ["pep-primary-p2-u-fi-091", "39 cm"]
  ],
  "pep-primary-p2-lower-division-remainder": [
    ["pep-primary-p2-l-fi-101", "4"],
    ["pep-primary-p2-l-fi-102", "9"],
    ["pep-primary-p2-l-fi-103", "6 R 5"],
    ["pep-primary-p2-l-fi-104", "8"],
    ["pep-primary-p2-l-fi-105", "3 R 1"]
  ],
  "pep-primary-p2-lower-place-value-measurement-data": [
    ["pep-primary-p2-l-fi-151", "3"],
    ["pep-primary-p2-l-fi-152", "2000"],
    ["pep-primary-p2-l-fi-153", "8"],
    ["pep-primary-p2-l-fi-154", "2"],
    ["pep-primary-p2-l-fi-155", "5"]
  ],
  "pep-primary-p3-upper-operations-fractions": [
    ["pep-primary-p3-u-mc-001", "7/8"],
    ["pep-primary-p3-u-mc-002", "624"],
    ["pep-primary-p3-u-mc-003", "56"],
    ["pep-primary-p3-u-mc-004", "5/8"],
    ["pep-primary-p3-u-mc-005", "3/4"]
  ],
  "pep-primary-p3-upper-measurement-time-geometry": [
    ["pep-primary-p3-u-mc-051", "300 cm"],
    ["pep-primary-p3-u-mc-052", "right angle"],
    ["pep-primary-p3-u-mc-053", "366"],
    ["pep-primary-p3-u-mc-054", "45 min"],
    ["pep-primary-p3-u-fi-076", "235 cm"]
  ],
  "pep-primary-p3-lower-area-decimals": [
    ["pep-primary-p3-l-fi-101", "48 cm^2"],
    ["pep-primary-p3-l-fi-102", "4.3"],
    ["pep-primary-p3-l-fi-103", "3.8"],
    ["pep-primary-p3-l-fi-104", "4.7"],
    ["pep-primary-p3-l-fi-105", "81 cm^2"]
  ],
  "pep-primary-p3-lower-statistics-review": [
    ["pep-primary-p3-l-sa-151", "4"],
    ["pep-primary-p3-l-sa-152", "22"],
    ["pep-primary-p3-l-sa-153", "9"],
    ["pep-primary-p3-l-sa-154", "4"],
    ["pep-primary-p3-l-sa-155", "39"]
  ],
  "pep-primary-p4-upper-large-numbers-multiplication": [
    ["pep-primary-p4-u-mc-001", "3072"],
    ["pep-primary-p4-u-mc-002", "3540"],
    ["pep-primary-p4-u-mc-003", "12960"],
    ["pep-primary-p4-u-mc-004", "4,005,006"],
    ["pep-primary-p4-u-mc-005", "7,860,000"]
  ],
  "pep-primary-p4-upper-angles-geometry": [
    ["pep-primary-p4-u-mc-051", "42°"],
    ["pep-primary-p4-u-mc-052", "360°"],
    ["pep-primary-p4-u-mc-053", "obtuse angle"],
    ["pep-primary-p4-u-mc-054", "90°"],
    ["pep-primary-p4-u-fi-076", "270°"]
  ],
  "pep-primary-p4-lower-decimals-average": [
    ["pep-primary-p4-l-fi-101", "4.2"],
    ["pep-primary-p4-l-fi-102", "3.2"],
    ["pep-primary-p4-l-fi-103", "8"],
    ["pep-primary-p4-l-fi-104", "0"],
    ["pep-primary-p4-l-fi-105", "6.25"]
  ],
  "pep-primary-p4-lower-perimeter-area-lines": [
    ["pep-primary-p4-l-sa-151", "32 cm"],
    ["pep-primary-p4-l-sa-152", "33 cm^2"],
    ["pep-primary-p4-l-sa-153", "36 cm^2"],
    ["pep-primary-p4-l-sa-154", "90°"],
    ["pep-primary-p4-l-sa-155", "CD"]
  ],
  "pep-primary-p5-upper-decimals-equations": [
    ["pep-primary-p5-u-mc-001", "5"],
    ["pep-primary-p5-u-mc-002", "7.2"],
    ["pep-primary-p5-u-mc-003", "2.1"],
    ["pep-primary-p5-u-mc-004", "7"],
    ["pep-primary-p5-u-mc-005", "10"]
  ],
  "pep-primary-p5-upper-polygon-area": [
    ["pep-primary-p5-u-mc-051", "35 cm^2"],
    ["pep-primary-p5-u-mc-052", "54 cm^2"],
    ["pep-primary-p5-u-mc-053", "50 cm^2"],
    ["pep-primary-p5-u-mc-054", "40 cm^2"],
    ["pep-primary-p5-u-fi-061", "27 cm^2"]
  ],
  "pep-primary-p5-lower-factors-fractions": [
    ["pep-primary-p5-l-fi-101", "1, 2, 3, 6, 9, 18"],
    ["pep-primary-p5-l-fi-102", "6"],
    ["pep-primary-p5-l-fi-103", "24"],
    ["pep-primary-p5-l-fi-104", "7/12"],
    ["pep-primary-p5-l-fi-105", "2/9"]
  ],
  "pep-primary-p5-lower-volume-data": [
    ["pep-primary-p5-l-sa-151", "48 cm^3"],
    ["pep-primary-p5-l-sa-152", "125 cm^3"],
    ["pep-primary-p5-l-sa-153", "6"],
    ["pep-primary-p5-l-sa-154", "56 cm^3"],
    ["pep-primary-p5-l-sa-177", "168 cm^3"]
  ],
  "pep-primary-p6-upper-percent-fractions": [
    ["pep-primary-p6-u-mc-001", "60%"],
    ["pep-primary-p6-u-mc-002", "35%"],
    ["pep-primary-p6-u-mc-003", "20"],
    ["pep-primary-p6-u-mc-004", "96"],
    ["pep-primary-p6-u-mc-005", "90"]
  ],
  "pep-primary-p6-upper-coordinate-data": [
    ["pep-primary-p6-u-mc-051", "(2, 3)"],
    ["pep-primary-p6-u-mc-053", "30"],
    ["pep-primary-p6-u-mc-054", "(4, 2)"],
    ["pep-primary-p6-u-mc-055", "(5, 5)"],
    ["pep-primary-p6-u-fi-061", "(2, 5)"]
  ],
  "pep-primary-p6-lower-ratio-proportion-scale": [
    ["pep-primary-p6-l-fi-101", "18 L"],
    ["pep-primary-p6-l-fi-102", "30 m"],
    ["pep-primary-p6-l-fi-103", "32"],
    ["pep-primary-p6-l-fi-104", "4"],
    ["pep-primary-p6-l-fi-105", "12"]
  ],
  "pep-primary-p6-lower-negative-review": [
    ["pep-primary-p6-l-sa-151", "6°C"],
    ["pep-primary-p6-l-sa-152", "-7°C"],
    ["pep-primary-p6-l-sa-153", "20"],
    ["pep-primary-p6-l-sa-154", "7°C"],
    ["pep-primary-p6-l-sa-155", "10°C"]
  ]
} as const;

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
    ["(6, 3)", "(5, 3)", "(3, 5)", "(5, 4)"]
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

test("all 24 Mainland PEP primary lesson pages pin five independently checked questions after runtime deduping", () => {
  const questionById = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));
  const expectedTopicIds = Object.keys(reviewedPrimaryLessonPractice);
  const displayedQuestionIds: string[] = [];

  assert.equal(mainlandPepPrimaryLessonSeeds.length, 24);
  assert.equal(expectedTopicIds.length, 24);

  expectedTopicIds.forEach((topicId) => {
    const lessonSeed = mainlandPepPrimaryLessonSeeds.find((seed) => seed.topicId === topicId);
    const expectedRows = reviewedPrimaryLessonPractice[topicId as keyof typeof reviewedPrimaryLessonPractice];
    const expectedIds = expectedRows.map(([questionId]) => questionId);

    assert.ok(lessonSeed, `${topicId} should have a production lesson seed`);
    assert.deepEqual(lessonSeed.practiceQuestionIds, expectedIds, `${topicId} should preserve the reviewed five-question order`);
    assert.equal(expectedIds.length, 5, `${topicId} should display exactly five questions`);
    assert.equal(new Set(expectedIds).size, 5, `${topicId} should display five unique question IDs`);

    const selectedQuestions = expectedRows.map(([questionId, expectedAnswer]) => {
      const question = questionById.get(questionId);
      assert.ok(question, `${questionId} should exist in the canonical 1200-row primary bank`);
      assert.equal(question.topicId, topicId, `${questionId} should remain in its reviewed grade/topic`);
      assert.equal(question.answer, expectedAnswer, `${questionId} should retain its independently checked answer`);
      assert.equal(independentMainlandPepPrimaryAnswer(question), expectedAnswer, `${questionId} should retain answer-oracle parity`);
      assert.ok(question.prompt.en.trim() && (question.prompt.zhHans ?? question.prompt.zh).trim(), `${questionId} needs a bilingual prompt`);
      assert.ok(
        question.explanation.en.trim() && (question.explanation.zhHans ?? question.explanation.zh).trim(),
        `${questionId} needs a bilingual explanation`
      );
      assert.doesNotMatch(question.prompt.en, cjkPattern, `${questionId} should have an English-visible prompt`);
      assert.doesNotMatch(question.explanation.en, cjkPattern, `${questionId} should have an English-visible explanation`);
      displayedQuestionIds.push(questionId);
      return question;
    });

    assert.deepEqual(
      dedupePracticeQuestions(selectedQuestions).map((question) => question.id),
      expectedIds,
      `${topicId} should still display exactly the reviewed rows after the real lesson-page deduper`
    );
  });

  assert.equal(displayedQuestionIds.length, 120);
  assert.equal(new Set(displayedQuestionIds).size, 120, "the 24 lesson pages should display 120 distinct canonical question rows");
});

test("Mainland PEP primary lesson-facing copy removes internal review labels", () => {
  assert.doesNotMatch(
    JSON.stringify(mainlandPepPrimaryLessonSeeds),
    /Explain the Method Clearly|把方法讲清楚|Misconception clinic|诊断：/,
    "student lesson pages should not expose production or reviewer labels"
  );
});

test("Mainland PEP primary answer-changing overrides clear stale accepted answers", () => {
  const rightAngles = mainlandPepPrimaryRagV1Questions.find((question) => question.id === "pep-primary-p2-u-mc-052");
  const cubeView = mainlandPepPrimaryRagV1Questions.find((question) => question.id === "pep-primary-p2-u-mc-053");
  const percentReview = mainlandPepPrimaryRagV1Questions.find((question) => question.id === "pep-primary-p6-l-sa-153");

  assert.ok(rightAngles && cubeView && percentReview);
  assert.deepEqual(rightAngles.acceptedAnswers ?? [], []);
  assert.deepEqual(cubeView.acceptedAnswers ?? [], []);
  assert.deepEqual(percentReview.acceptedAnswers ?? [], ["20道", "20道题", "20道几何题", "20 questions"]);
  assert.doesNotMatch(JSON.stringify([rightAngles, cubeView, percentReview]), /97厘米|32厘米|4 °C|4摄氏度|4 degrees Celsius/);
});

test("Mainland PEP primary displayed wording distinguishes maximum values and division meanings", () => {
  const byId = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));
  const tiedMaximum = byId.get("pep-primary-p1-l-fi-151");
  const shortMaximum = byId.get("pep-primary-p1-l-sa-191");
  const quotativeDivision = byId.get("pep-primary-p2-l-fi-101");
  const qualitativeRightAngle = byId.get("pep-primary-p3-u-mc-052");

  assert.ok(tiedMaximum && shortMaximum && quotativeDivision && qualitativeRightAngle);
  assert.match(tiedMaximum.prompt.zhHans ?? tiedMaximum.prompt.zh, /三个数量中，最大的数量是多少张/u);
  assert.match(tiedMaximum.explanation.zhHans ?? tiedMaximum.explanation.zh, /有2个类别并列最多/u);
  assert.match(shortMaximum.prompt.zhHans ?? shortMaximum.prompt.zh, /数量最多的一类有多少个/u);
  assert.ok(shortMaximum.acceptedAnswers?.includes("11个"));
  assert.doesNotMatch(quotativeDivision.prompt.zhHans ?? quotativeDivision.prompt.zh, /平均分成每组/u);
  assert.equal(qualitativeRightAngle.answer, "right angle");
  assert.ok(qualitativeRightAngle.options?.some((option) => (option.zhHans ?? option.zh) === "直角"));
});

test("Mainland PEP primary displayed cuboid prompts uniquely distinguish a cuboid from a cube", () => {
  const byId = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));
  const multipleChoice = byId.get("pep-primary-p1-u-mc-052");
  const fillIn = byId.get("pep-primary-p1-u-fi-091");

  assert.ok(multipleChoice && fillIn);
  [multipleChoice, fillIn].forEach((question) => {
    assert.equal(question.answer, "cuboid");
    assert.match(question.prompt.en, /six flat faces/u);
    assert.match(question.prompt.en, /opposite faces (?:have )?the same shape and size/iu);
    assert.match(question.prompt.en, /at least one face (?:that )?is not a square/u);
    assert.match(question.prompt.zhHans ?? question.prompt.zh, /六个平平的面/u);
    assert.match(question.prompt.zhHans ?? question.prompt.zh, /相对的面形状和大小相同/u);
    assert.match(question.prompt.zhHans ?? question.prompt.zh, /至少有一个面不是正方形/u);
    assert.match(question.explanation.en, /rules out a cube/u);
    assert.match(question.explanation.zhHans ?? question.explanation.zh, /排除了.*正方体/u);
  });

  assert.equal(multipleChoice.options?.length, 4);
  assert.deepEqual(
    new Set(multipleChoice.options?.map((option) => option.en)),
    new Set(["cuboid", "cube", "cylinder", "sphere"])
  );
  assert.equal(
    multipleChoice.options?.filter((option) =>
      questionAnswerMatches(
        {
          answer: multipleChoice.answer,
          accepted_answers: multipleChoice.acceptedAnswers ?? null,
          options: multipleChoice.options ?? null
        },
        option.en
      )
    ).length,
    1
  );
});

test("Mainland PEP primary multiplication explanations use the multiplication sign rather than a Latin x", () => {
  const displayedIds = reviewedPrimaryLessonPractice["pep-primary-p2-upper-multiplication-arrays"]
    .map(([questionId]) => questionId);
  const byId = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));

  displayedIds.forEach((questionId) => {
    const question = byId.get(questionId);
    assert.ok(question, `${questionId} should remain in the primary bank`);
    assert.match(question.explanation.en, /\d×\d/u);
    assert.match(question.explanation.zhHans ?? question.explanation.zh, /\d×\d/u);
    assert.doesNotMatch(question.explanation.en, /\d\s*x\s*\d/iu);
    assert.doesNotMatch(question.explanation.zhHans ?? question.explanation.zh, /\d\s*x\s*\d/iu);
  });
});

test("Mainland PEP reviewed lesson surfaces use standard multiplication notation and unambiguous row movement", () => {
  const sourceById = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));
  const renderedById = new Map(questions.map((question) => [question.id, question]));
  const multiplicationFields = [
    ["pep-primary-p2-l-fi-103", "explanation"],
    ["pep-primary-p2-l-fi-105", "explanation"],
    ["pep-primary-p3-u-mc-051", "explanation"],
    ["pep-primary-p5-u-mc-002", "prompt"],
    ["pep-primary-p5-u-mc-002", "explanation"],
    ["pep-primary-p5-l-fi-101", "explanation"],
    ["pep-primary-p6-u-mc-004", "explanation"],
    ["pep-primary-p6-u-mc-005", "explanation"]
  ] as const;
  const asciiMultiplication = /(?:\d|%)\s*x\s*(?:\d|%)/iu;

  multiplicationFields.forEach(([questionId, field]) => {
    const sourceQuestion = sourceById.get(questionId);
    const renderedQuestion = renderedById.get(questionId);
    assert.ok(sourceQuestion && renderedQuestion, `${questionId} should exist in source and rendered banks`);

    const sourceText = sourceQuestion[field];
    const renderedText = renderedQuestion[field];
    [sourceText.en, sourceText.zhHans ?? sourceText.zh, renderedText.zh].forEach((value) => {
      assert.match(value, /×/u, `${questionId} ${field} should display the multiplication sign`);
      assert.doesNotMatch(value, asciiMultiplication, `${questionId} ${field} should not use a Latin x for multiplication`);
    });
  });

  assert.equal(ambiguousMultiplicationX.test("Solve 2x+5=13."), false, "algebraic variable x must remain valid");
  assert.equal(ambiguousMultiplicationX.test("解方程：2x+5=13。"), false, "代数未知数x不应被当作乘号");
  assert.equal(ambiguousMultiplicationX.test("2x3=6"), true);
  assert.equal(ambiguousMultiplicationX.test("base x height"), true);

  const displayedQuestionIds = Object.values(reviewedPrimaryLessonPractice)
    .flatMap((rows) => rows.map(([questionId]) => questionId));
  assert.equal(displayedQuestionIds.length, 120);
  assert.equal(new Set(displayedQuestionIds).size, 120);

  displayedQuestionIds.forEach((questionId) => {
    const sourceQuestion = sourceById.get(questionId);
    const renderedQuestion = renderedById.get(questionId);
    assert.ok(sourceQuestion && renderedQuestion, `${questionId} should exist in source and rendered banks`);

    const learnerVisibleFields = [
      ["en.topic", sourceQuestion.topic.en],
      ["en.prompt", sourceQuestion.prompt.en],
      ["en.explanation", sourceQuestion.explanation.en],
      ["zhHans.topic", sourceQuestion.topic.zhHans ?? sourceQuestion.topic.zh],
      ["zhHans.prompt", sourceQuestion.prompt.zhHans ?? sourceQuestion.prompt.zh],
      ["zhHans.explanation", sourceQuestion.explanation.zhHans ?? sourceQuestion.explanation.zh],
      ["zh.topic", renderedQuestion.topic.zh],
      ["zh.prompt", renderedQuestion.prompt.zh],
      ["zh.explanation", renderedQuestion.explanation.zh],
      ["answer", sourceQuestion.answer],
      ...sourceQuestion.options?.flatMap((option, index) => [
        [`en.option[${index}]`, option.en],
        [`zhHans.option[${index}]`, option.zhHans ?? option.zh]
      ]) ?? [],
      ...renderedQuestion.options?.map((option, index) => [`zh.option[${index}]`, option.zh]) ?? [],
      ...sourceQuestion.questionAssets?.flatMap((asset, index) => [
        [`en.asset[${index}].alt`, asset.alt.en],
        [`zhHans.asset[${index}].alt`, asset.alt.zhHans ?? asset.alt.zh],
        [`en.asset[${index}].caption`, asset.caption?.en ?? ""],
        [`zhHans.asset[${index}].caption`, asset.caption?.zhHans ?? asset.caption?.zh ?? ""]
      ]) ?? [],
      ...renderedQuestion.questionAssets?.flatMap((asset, index) => [
        [`zh.asset[${index}].alt`, asset.alt.zh],
        [`zh.asset[${index}].caption`, asset.caption?.zh ?? ""]
      ]) ?? []
    ] as Array<[string, string]>;

    learnerVisibleFields.forEach(([field, value]) => {
      assert.doesNotMatch(
        value,
        ambiguousMultiplicationX,
        `${questionId} ${field} should not use x or X as a multiplication operator`
      );
    });
  });

  const coordinateSource = sourceById.get("pep-primary-p6-u-mc-055");
  const coordinateRendered = renderedById.get("pep-primary-p6-u-mc-055");
  assert.ok(coordinateSource && coordinateRendered);
  assert.match(coordinateSource.prompt.en, /4 rows back/u);
  assert.match(coordinateSource.prompt.zhHans ?? coordinateSource.prompt.zh, /向后移动4行/u);
  assert.match(coordinateRendered.prompt.zh, /向後移動4行/u);
  assert.doesNotMatch(
    `${coordinateSource.prompt.en} ${coordinateSource.prompt.zhHans ?? coordinateSource.prompt.zh}`,
    /rows down|向下移动/u,
    "The seating-grid direction must use the unambiguous front/back row convention"
  );
  assert.equal(coordinateSource.answer, "(5, 5)");

  const grade4StraightAngle = renderedById.get("pep-primary-p4-u-mc-051");
  assert.ok(grade4StraightAngle);
  assert.match(grade4StraightAngle.prompt.zh, /平角被分成兩個角/u);
  assert.doesNotMatch(
    `${grade4StraightAngle.prompt.en} ${grade4StraightAngle.prompt.zh}`,
    /adjacent angles|相鄰角/u,
    "The P4 item must use the taught straight-angle representation rather than the later formal linear-pair term"
  );
  assert.equal(
    coordinateSource.options?.filter((option) =>
      questionAnswerMatches(
        {
          answer: coordinateSource.answer,
          accepted_answers: coordinateSource.acceptedAnswers ?? null,
          options: coordinateSource.options ?? null
        },
        option.en
      )
    ).length,
    1
  );
});

test("Mainland PEP primary lesson source and rendered blocks use × while preserving algebraic x", () => {
  type RawPepLesson = {
    reviewStatus: string;
    integrationStatus: string;
    metadata: { topicId: string };
    futureProductionMapping?: { productionLessonSeedReady?: boolean };
  };

  const expectedTopicIds = Object.keys(reviewedPrimaryLessonPractice).sort();
  const rawLessons = (mainlandPepPrimaryLessonPackJson as { lessons: RawPepLesson[] }).lessons.filter(
    (lesson) =>
      lesson.reviewStatus === "approved" &&
      lesson.integrationStatus === "production-integrated" &&
      lesson.futureProductionMapping?.productionLessonSeedReady === true
  );
  assert.equal(rawLessons.length, 24);
  assert.deepEqual(rawLessons.map((lesson) => lesson.metadata.topicId).sort(), expectedTopicIds);
  assert.deepEqual(mainlandPepPrimaryLessonSeeds.map((lesson) => lesson.topicId).sort(), expectedTopicIds);

  const rawStringFields: Array<{ path: string; value: string }> = [];
  const collectRawStrings = (value: unknown, path: string): void => {
    if (typeof value === "string") {
      rawStringFields.push({ path, value });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => collectRawStrings(entry, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, entry]) => collectRawStrings(entry, `${path}.${key}`));
    }
  };
  rawLessons.forEach((lesson) => collectRawStrings(lesson, lesson.metadata.topicId));
  rawStringFields.forEach(({ path, value }) => {
    assert.doesNotMatch(
      value,
      ambiguousMultiplicationX,
      `${path} should not use x or X as a multiplication operator`
    );
  });

  const collectLocalizedSurface = (lesson: ProductionLessonSeed, source: string) => {
    const fields: Array<{ path: string; value: string }> = [];
    const addLocalized = (path: string, value: ProductionLessonSeed["title"]) => {
      (["en", "zhHans", "zh"] as const).forEach((language) => {
        const localizedValue = value[language];
        if (typeof localizedValue === "string") {
          fields.push({ path: `${source}.${lesson.topicId}.${path}.${language}`, value: localizedValue });
        }
      });
    };

    addLocalized("title", lesson.title);
    addLocalized("description", lesson.description);
    lesson.blocks.forEach((block, blockIndex) => {
      addLocalized(`blocks[${blockIndex}].title`, block.title);
      if (block.content) addLocalized(`blocks[${blockIndex}].content`, block.content);
      block.items?.forEach((item, itemIndex) => {
        addLocalized(`blocks[${blockIndex}].items[${itemIndex}]`, item);
      });
    });
    return fields;
  };

  const sourceSurfaceFields = mainlandPepPrimaryLessonSeeds.flatMap((lesson) =>
    collectLocalizedSurface(lesson, "source")
  );
  const renderedSurfaceFields = mainlandPepPrimaryLessonSeeds.flatMap((lesson) => {
    const renderedLesson = productionLessonByTopicId.get(lesson.topicId);
    assert.ok(renderedLesson, `${lesson.topicId} should have a rendered production lesson`);
    return collectLocalizedSurface(renderedLesson, "rendered");
  });

  assert.equal(sourceSurfaceFields.length, 24 * 48);
  assert.equal(renderedSurfaceFields.length, 24 * 48);
  [...sourceSurfaceFields, ...renderedSurfaceFields].forEach(({ path, value }) => {
    assert.doesNotMatch(
      value,
      ambiguousMultiplicationX,
      `${path} should not use x or X as a multiplication operator`
    );
  });

  const equationsLesson = productionLessonByTopicId.get("pep-primary-p5-upper-decimals-equations");
  const equationsConcept = equationsLesson?.blocks.find((block) => block.idSuffix === "concept")?.content;
  const equationsWorkedExample = equationsLesson?.blocks.find(
    (block) => block.idSuffix === "worked-example"
  )?.content;
  assert.ok(equationsConcept && equationsWorkedExample);
  (["en", "zhHans", "zh"] as const).forEach((language) => {
    const concept = equationsConcept[language];
    const workedExample = equationsWorkedExample[language];
    assert.ok(concept && workedExample);
    assert.match(concept, /x \+ 5 = 12/u, `${language} should preserve the algebraic unknown x`);
    assert.match(workedExample, /x \+ 18 = 52/u, `${language} should preserve the algebraic unknown x`);
    assert.match(workedExample, /x - 9 = 21/u, `${language} should preserve the algebraic unknown x`);
  });
});

test("Mainland PEP decimal-estimation check states the valid numerical bound", () => {
  const lesson = mainlandPepPrimaryLessonSeeds.find(
    (candidate) => candidate.topicId === "pep-primary-p4-lower-decimals-average"
  );
  const workedExample = lesson?.blocks.find((block) => block.idSuffix === "worked-example");
  assert.ok(workedExample?.content);

  assert.match(workedExample.content.en, /2\.75 lies between 2\.7 and 2\.8/u);
  assert.match(workedExample.content.en, /6\.35 is in that range/u);
  assert.match(workedExample.content.zhHans ?? workedExample.content.zh, /2\.75在2\.7和2\.8之间/u);
  assert.match(workedExample.content.zhHans ?? workedExample.content.zh, /6\.35符合这个范围/u);
  assert.match(workedExample.content.zh, /2\.75在2\.7和2\.8之間/u);
  assert.match(workedExample.content.zh, /6\.35符合這個範圍/u);
  assert.doesNotMatch(workedExample.content.zhHans ?? workedExample.content.zh, /3\.6 \+ 2\.7 大约是 6\.3/u);
});

test("Mainland PEP primary displayed geometry explanations use the multiplication sign", () => {
  const byId = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));

  ["pep-primary-p4-l-sa-151", "pep-primary-p4-l-sa-152", "pep-primary-p4-l-sa-153"].forEach((questionId) => {
    const question = byId.get(questionId);
    assert.ok(question, `${questionId} should remain in the primary bank`);

    const learnerFacingExplanations = [question.explanation.en, question.explanation.zhHans ?? question.explanation.zh];
    learnerFacingExplanations.forEach((explanation) => {
      assert.match(explanation, /×/u, `${questionId} should display the multiplication sign`);
      assert.doesNotMatch(explanation, /(?:\d|length|width|side|长|宽|边长)\s*x\s*(?:\d|length|width|side|长|宽|边长)/iu);
    });
  });
});

test("Mainland PEP P4 large-number practice matches its full curriculum scope", () => {
  const topic = mainlandPepPrimaryTopics.find(
    (candidate) => candidate.id === "pep-primary-p4-upper-large-numbers-multiplication"
  );
  const displayedIds = reviewedPrimaryLessonPractice["pep-primary-p4-upper-large-numbers-multiplication"]
    .map(([questionId]) => questionId);
  const byId = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));
  const displayed = displayedIds.map((questionId) => byId.get(questionId));

  assert.ok(topic);
  assert.equal(topic.title.zh, "大数认识与三位数乘两位数");
  assert.match(topic.title.en, /Three-Digit by Two-Digit Multiplication/u);
  assert.equal(displayed.length, 5);
  assert.ok(displayed.every(Boolean));

  const combinedEnglishPrompts = displayed.map((question) => question?.prompt.en ?? "").join(" ");
  const combinedChinesePrompts = displayed.map((question) => question?.prompt.zhHans ?? question?.prompt.zh ?? "").join(" ");
  assert.match(combinedEnglishPrompts, /128.*24|236.*15|405.*32/u);
  assert.match(combinedEnglishPrompts, /four million five thousand six/u);
  assert.match(combinedEnglishPrompts, /nearest ten thousand/u);
  assert.match(combinedChinesePrompts, /128|236|405/u);
  assert.match(combinedChinesePrompts, /四百万五千零六/u);
  assert.match(combinedChinesePrompts, /四舍五入到万位/u);

  displayed.forEach((question) => {
    assert.ok(question?.options);
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options.map((option) => option.en)).size, 4);
    assert.equal(
      question.options.filter((option) =>
        questionAnswerMatches(
          {
            answer: question.answer,
            accepted_answers: question.acceptedAnswers ?? null,
            options: question.options ?? null
          },
          option.en
        )
      ).length,
      1,
      `${question.id} should expose exactly one accepted option`
    );
  });
});

test("Mainland PEP displayed volume explanations use the multiplication sign", () => {
  const byId = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));

  ["pep-primary-p5-l-sa-151", "pep-primary-p5-l-sa-152", "pep-primary-p5-l-sa-154", "pep-primary-p5-l-sa-177"]
    .forEach((questionId) => {
      const question = byId.get(questionId);
      assert.ok(question, `${questionId} should remain in the primary bank`);
      [question.explanation.en, question.explanation.zhHans ?? question.explanation.zh].forEach((explanation) => {
        assert.match(explanation, /×/u, `${questionId} should display the multiplication sign`);
        assert.doesNotMatch(explanation, /(?:\d|length|width|side|长|宽|高|棱长)\s*x\s*(?:\d|length|width|side|长|宽|高|棱长)/iu);
      });
    });
});

test("Mainland PEP rectangle parallel-side prompt states the vertex-order convention", () => {
  const question = mainlandPepPrimaryRagV1Questions.find((candidate) => candidate.id === "pep-primary-p4-l-sa-155");
  assert.ok(question);
  assert.match(question.prompt.en, /vertices.*named consecutively/u);
  assert.match(question.prompt.zhHans ?? question.prompt.zh, /四个顶点按顺序命名/u);
  assert.equal(question.answer, "CD");
  assert.ok(question.acceptedAnswers?.includes("DC"));
});

test("Mainland PEP ratio explanations retain the answer unit and multiplication sign", () => {
  const byId = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));
  const displayedIds = reviewedPrimaryLessonPractice["pep-primary-p6-lower-ratio-proportion-scale"]
    .map(([questionId]) => questionId);

  const expectedUnitById: Record<string, RegExp | undefined> = {
    "pep-primary-p6-l-fi-101": /(?:L|升)/u,
    "pep-primary-p6-l-fi-102": /(?:m|米)/u,
    "pep-primary-p6-l-fi-103": /(?:yuan|元)/u,
    "pep-primary-p6-l-fi-104": /(?:days|天)/u,
    "pep-primary-p6-l-fi-105": undefined
  };

  displayedIds.forEach((questionId) => {
    const question = byId.get(questionId);
    assert.ok(question, `${questionId} should remain in the primary bank`);
    const expectedUnit = expectedUnitById[questionId];
    [question.explanation.en, question.explanation.zhHans ?? question.explanation.zh].forEach((explanation) => {
      assert.match(explanation, /×/u, `${questionId} should display the multiplication sign`);
      if (expectedUnit) {
        assert.match(explanation, expectedUnit, `${questionId} should retain its answer unit in the explanation`);
      }
    });
  });
});

test("Mainland PEP primary displayed free responses accept natural Chinese classifiers and units", () => {
  const naturalResponses = [
    ["pep-primary-p1-l-fi-101", "60本"],
    ["pep-primary-p1-l-fi-102", "57个"],
    ["pep-primary-p1-l-fi-103", "75张"],
    ["pep-primary-p1-l-fi-104", "51个气球"],
    ["pep-primary-p1-l-fi-105", "76本书"],
    ["pep-primary-p1-l-fi-151", "7张"],
    ["pep-primary-p1-l-fi-155", "9张"],
    ["pep-primary-p2-l-fi-101", "4组"],
    ["pep-primary-p2-l-fi-102", "9个盒子"],
    ["pep-primary-p2-l-fi-104", "8张贴纸"],
    ["pep-primary-p2-l-fi-153", "8个瓶子"],
    ["pep-primary-p3-l-sa-151", "4人"],
    ["pep-primary-p3-l-sa-152", "22本"],
    ["pep-primary-p3-l-sa-153", "9票"],
    ["pep-primary-p3-l-sa-154", "4天"],
    ["pep-primary-p3-l-sa-155", "39人"],
    ["pep-primary-p4-u-fi-076", "270度"],
    ["pep-primary-p4-l-fi-101", "4.2米"],
    ["pep-primary-p4-l-sa-154", "90度"],
    ["pep-primary-p6-u-fi-061", "（2，5）"],
    ["pep-primary-p6-l-sa-153", "20道几何题"]
  ] as const;
  const byId = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));

  naturalResponses.forEach(([questionId, learnerAnswer]) => {
    const question = byId.get(questionId);
    assert.ok(question, `${questionId} should remain in the primary bank`);
    assert.equal(questionAnswerMatches({
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    }, learnerAnswer), true, `${questionId} should accept ${learnerAnswer}`);
  });
});

test("Mainland PEP primary blind-audit follow-up accepts complete natural answers and removes malformed distractors", () => {
  const byId = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));
  const completeResponses = [
    ["pep-primary-p2-l-fi-105", "3组，剩1个"],
    ["pep-primary-p2-l-fi-112", "3组，剩1个"],
    ["pep-primary-p2-l-fi-115", "5袋剩3个"],
    ["pep-primary-p2-l-fi-124", "8袋剩1个"],
    ["pep-primary-p2-l-fi-128", "可以装6袋，还剩0个"],
    ["pep-primary-p3-l-fi-103", "3.8大"]
  ] as const;

  for (const [questionId, learnerAnswer] of completeResponses) {
    const question = byId.get(questionId);
    assert.ok(question, `${questionId} should remain in the 1,200-row bank`);
    assert.equal(questionAnswerMatches({
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    }, learnerAnswer), true, `${questionId} should accept the complete natural response ${learnerAnswer}`);
  }

  const zeroRemainder = byId.get("pep-primary-p2-l-fi-128");
  assert.ok(zeroRemainder);
  assert.equal(questionAnswerMatches({
    id: zeroRemainder.id,
    answer: zeroRemainder.answer,
    accepted_answers: zeroRemainder.acceptedAnswers ?? null,
    options: zeroRemainder.options ?? null
  }, "6"), false, "a quotient-only response must not satisfy a quotient-and-remainder prompt");

  for (const questionId of [
    "pep-primary-p3-u-mc-072",
    "pep-primary-p4-u-mc-060",
    "pep-primary-p4-u-mc-061",
    "pep-primary-p4-u-mc-062"
  ]) {
    const question = byId.get(questionId);
    assert.ok(question?.options, `${questionId} should expose four choices`);
    assert.equal(question.options.length, 4);
    const displayedOptions = question.options.map((option) => option.zhHans ?? option.zh);
    assert.equal(new Set(displayedOptions.map((option) => option.normalize("NFKC").trim())).size, 4);
    assert.ok(displayedOptions.every((option) => !/(?:min|分钟|分鐘|°)1\s*$/iu.test(option)), `${questionId} malformed suffix`);
    const gradingQuestion = {
      id: question.id,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options
    };
    const acceptedIndexes = displayedOptions.flatMap((option, index) =>
      questionAnswerMatches(gradingQuestion, option) ? [index] : []
    );
    assert.deepEqual(acceptedIndexes, [question.options.findIndex((option) => option.en === question.answer)]);
  }
});

test("Mainland PEP primary fraction grading rejects a rounded repeating decimal", () => {
  const question = mainlandPepPrimaryRagV1Questions.find((candidate) => candidate.id === "pep-primary-p5-l-fi-105");
  assert.ok(question);
  const gradingQuestion = {
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null
  };

  assert.equal(questionAnswerMatches(gradingQuestion, "2/9"), true);
  assert.equal(questionAnswerMatches(gradingQuestion, "0.2222"), false);
});

test("Mainland PEP primary elapsed-time MC rows keep exactly one visible 45-minute answer", () => {
  ["pep-primary-p3-u-mc-054", "pep-primary-p3-u-mc-062", "pep-primary-p3-u-mc-070"].forEach((questionId) => {
    const question = mainlandPepPrimaryRagV1Questions.find((candidate) => candidate.id === questionId);
    assert.ok(question, `${questionId} should remain in the 1200-row bank`);
    assert.equal(question.answer, "45 min");
    assert.equal(question.options?.filter((option) => option.en === question.answer).length, 1);
  });
});

test("Mainland PEP primary displayed practice covers the lesson concepts at the assigned grade", () => {
  const questionById = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));
  const promptsFor = (topicId: keyof typeof reviewedPrimaryLessonPractice) =>
    reviewedPrimaryLessonPractice[topicId]
      .map(([questionId]) => questionById.get(questionId)?.prompt.en ?? "")
      .join(" ");

  const grade3Statistics = promptsFor("pep-primary-p3-lower-statistics-review");
  const grade4Angles = promptsFor("pep-primary-p4-upper-angles-geometry");
  const grade4PerimeterAreaLines = promptsFor("pep-primary-p4-lower-perimeter-area-lines");
  const grade5FactorsFractions = promptsFor("pep-primary-p5-lower-factors-fractions");
  const grade6Percent = promptsFor("pep-primary-p6-upper-percent-fractions");
  const grade6Coordinates = promptsFor("pep-primary-p6-upper-coordinate-data");
  const grade6Ratio = promptsFor("pep-primary-p6-lower-ratio-proportion-scale");

  assert.doesNotMatch(grade3Statistics, /average|mean/i, "Grade 3 data reading should not introduce the Grade 4 mean topic");
  assert.match(grade3Statistics, /table|survey|chart/i);
  assert.match(grade4Angles, /straight line|full turn|135°|perpendicular|right angles/i);
  assert.match(grade4PerimeterAreaLines, /border|area|perpendicular|parallel/i);
  assert.match(grade5FactorsFractions, /factors|greatest common factor|least common multiple|5\/6-1\/4|1\/9\+1\/9/i);
  assert.match(grade6Percent, /percentage|25%|discount|45%/i);
  assert.doesNotMatch(grade6Coordinates, /\(-|,\s*-/, "PEP primary ordered-pair practice should stay in positive row-column positions");
  assert.match(grade6Ratio, /ratio|scale|same unit price|person-days|equivalent/i);
});
