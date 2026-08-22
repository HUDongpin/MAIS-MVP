import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  mainlandPepHighQuestionGenerationMetadata,
  mainlandPepHighQuestions,
  mainlandPepHighRagV4QuestionGenerationMetadata,
  mainlandPepHighRagV4Questions,
  mainlandPepHighRagV3Questions,
  mainlandPepHighRagV2Questions,
  mainlandPepHighSeedV1Questions
} from "../data/mainlandPepHighQuestions";
import {
  mainlandBnuHighQuestionGenerationMetadata,
  mainlandBnuHighQuestions
} from "../data/mainlandBnuHighQuestions";
import { mainlandBnuHighLessonSeeds } from "../data/mainlandBnuHighLessons";
import { mainlandPepHighLessonSeeds } from "../data/mainlandPepHighLessons";
import mainlandPepHighLessonPack from "../data/generated-content/mainland-pep-high-lessons-v1/lessons.json";
import {
  mainlandHjbHighQuestionGenerationMetadata,
  mainlandHjbHighQuestions,
  mainlandHjbHighV1Questions,
  mainlandHjbHighV2Questions,
  mainlandHjbHighV3RemediatedQuestions,
  mainlandHjbHighV4RemediatedQuestions
} from "../data/mainlandHjbHighQuestions";
import {
  mainlandHjbPrimaryQuestionGenerationMetadata,
  mainlandHjbPrimaryQuestions
} from "../data/mainlandHjbPrimaryQuestions";
import { mainlandHjbHighTopics } from "../data/mainlandHjbHighTopics";
import { mainlandBnuHighTopics } from "../data/mainlandBnuHighTopics";
import {
  mainlandHjbJuniorQuestionGenerationMetadata,
  mainlandHjbJuniorQuestions
} from "../data/mainlandHjbJuniorQuestions";
import { mainlandHjbJuniorTopics } from "../data/mainlandHjbJuniorTopics";
import { mainlandHjbPrimaryTopics } from "../data/mainlandHjbPrimaryTopics";
import { mainlandPepHighTopics } from "../data/mainlandPepHighTopics";
import { questions } from "../data/questions";
import { topics } from "../data/topics";
import { mainlandPepHighRagCards } from "../data/rag/mainlandPepHigh";
import { mainlandPepHighExamPatternCards } from "../data/rag/mainlandPepHighExamPatterns";
import { GET as getAdaptiveNextRoute } from "../app/api/adaptive-learning/next/route";
import { GET as getQuestionsRoute } from "../app/api/questions/route";
import { dedupePracticeQuestions } from "./practiceQuestionDeduping";
import { questionAnswerMatches } from "./server/answerGrading";
import {
  buildMainlandHighQuestionQualityComparison,
  validateMainlandHighQuestionQualityComparison
} from "../scripts/compare-mainland-high-question-quality";
import { buildMainlandHighRagV4PublicSolvabilityAudit } from "./questionBankSolvability";
import { createSessionToken, SESSION_COOKIE_NAME } from "./session";
import { mainlandPepQuestionAssetFor } from "./mainlandPepQuestionAssets";
import {
  addStudentToTeacherClass,
  authenticateUser,
  buildAITutorDatabaseContext,
  createStudentUser,
  getAdaptiveLearningDecision,
  getDashboardData,
  getLessonBySlug,
  getLessonEntryTarget,
  getProgressData,
  getPublicQuestions,
  getRoadmapData,
  getTeacherAssessmentCreateData,
  getTeacherDashboardData,
  getTeacherResourceLibraryData,
  joinClassByInviteCode,
  submitQuestionAttempt
} from "./server/userStore";
import type { CurriculumProfile, GradeId, Question, QuestionType } from "@/types";

const seniorGrades: Extract<GradeId, "S4" | "S5" | "S6">[] = ["S4", "S5", "S6"];
const juniorGrades: Extract<GradeId, "S1" | "S2" | "S3">[] = ["S1", "S2", "S3"];
const primaryGrades: Extract<GradeId, "P1" | "P2" | "P3" | "P4" | "P5" | "P6">[] = ["P1", "P2", "P3", "P4", "P5", "P6"];
const generatedTypes: Exclude<QuestionType, "graph">[] = ["multiple-choice", "fill-in", "short-answer"];
const hkEphProfile: CurriculumProfile = { region: "HK", publisher: "HK_EPH_MIF" };
const mainlandPepProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_PEP" };
const mainlandBnuProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" };
const mainlandHjbProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_HJB" };
const cjkPattern = /[\u3400-\u9fff]/;

const reviewedPepHighPracticeSelections = {
  "pep-high-s4-sets-logic": {
    families: ["sufficient-condition", "set-intersection", "set-union", "set-complement", "set-intersection"],
    rows: [
      ["pep-high-s4-mc-041", "p is sufficient but not necessary for q."],
      ["pep-high-s4-mc-001", "1"],
      ["pep-high-s4-fi-001", "9"],
      ["pep-high-s4-sa-001", "10"],
      ["pep-high-s4-mc-011", "7"]
    ]
  },
  "pep-high-s4-quadratic-inequalities": {
    families: ["solve-quadratic-inequality", "discriminant-parameter", "axis-of-symmetry", "function-value", "minimum-value"],
    rows: [
      ["pep-high-s4-mc-042", "2<x<3"],
      ["pep-high-s4-fi-042", "4"],
      ["pep-high-s4-mc-002", "-2"],
      ["pep-high-s4-fi-002", "24"],
      ["pep-high-s4-sa-002", "-1"]
    ]
  },
  "pep-high-s4-function-properties": {
    families: ["domain-restriction", "function-value", "function-value", "inverse-evaluation", "inverse-evaluation"],
    rows: [
      ["pep-high-s4-mc-043", "x≠3"],
      ["pep-high-s4-mc-003", "4"],
      ["pep-high-s4-mc-013", "-5"],
      ["pep-high-s4-sa-003", "3"],
      ["pep-high-s4-sa-013", "2"]
    ]
  },
  "pep-high-s4-exp-log": {
    families: ["log-domain", "log-value", "log-value", "scaled-log-value", "log-value"],
    rows: [
      ["pep-high-s4-mc-044", "x>1"],
      ["pep-high-s4-mc-004", "6"],
      ["pep-high-s4-fi-014", "3"],
      ["pep-high-s4-sa-014", "12"],
      ["pep-high-s4-mc-024", "5"]
    ]
  },
  "pep-high-s4-trigonometry": {
    families: ["special-angle", "sine-frequency", "amplitude", "amplitude", "amplitude"],
    rows: [
      ["pep-high-s4-mc-005", "1"],
      ["pep-high-s4-fi-005", "3"],
      ["pep-high-s4-sa-025", "5"],
      ["pep-high-s4-sa-035", "2"],
      ["pep-high-s4-sa-045", "4"]
    ]
  },
  "pep-high-s4-plane-vectors": {
    families: ["perpendicular-parameter", "dot-product", "dot-product", "length-squared", "length-squared"],
    rows: [
      ["pep-high-s4-mc-046", "2"],
      ["pep-high-s4-mc-006", "12"],
      ["pep-high-s4-fi-016", "36"],
      ["pep-high-s4-sa-006", "20"],
      ["pep-high-s4-sa-016", "25"]
    ]
  },
  "pep-high-s4-complex-numbers": {
    families: ["real-part", "imaginary-coefficient", "modulus-squared", "real-part", "imaginary-coefficient"],
    rows: [
      ["pep-high-s4-mc-007", "2"],
      ["pep-high-s4-fi-017", "7"],
      ["pep-high-s4-sa-007", "8"],
      ["pep-high-s4-mc-027", "5"],
      ["pep-high-s4-fi-027", "1"]
    ]
  },
  "pep-high-s4-solid-geometry-intro": {
    families: ["line-plane-perpendicularity", "surface-area", "volume", "space-diagonal-squared", "surface-area"],
    rows: [
      ["pep-high-s4-mc-048", "l is perpendicular to m."],
      ["pep-high-s4-mc-008", "126"],
      ["pep-high-s4-fi-008", "90"],
      ["pep-high-s4-sa-008", "70"],
      ["pep-high-s4-mc-018", "120"]
    ]
  },
  "pep-high-s4-probability": {
    families: ["complement-rule", "single-draw", "single-draw", "ordered-without-replacement", "single-draw"],
    rows: [
      ["pep-high-s4-mc-050", "5/8"],
      ["pep-high-s4-mc-010", "4/7"],
      ["pep-high-s4-fi-020", "3/8"],
      ["pep-high-s4-sa-010", "42"],
      ["pep-high-s4-mc-030", "2/9"]
    ]
  },
  "pep-high-s5-conics": {
    families: ["ellipse-major-axis", "ellipse-focus-parameter", "parabola-parameter", "ellipse-major-axis", "ellipse-focus-parameter"],
    rows: [
      ["pep-high-s5-mc-003", "14"],
      ["pep-high-s5-fi-003", "45"],
      ["pep-high-s5-sa-003", "5"],
      ["pep-high-s5-mc-008", "8"],
      ["pep-high-s5-fi-008", "7"]
    ]
  },
  "pep-high-s5-space-vectors": {
    families: ["perpendicular-parameter", "dot-product", "dot-product", "length-squared", "length-squared"],
    rows: [
      ["pep-high-s5-mc-041", "1"],
      ["pep-high-s5-mc-001", "20"],
      ["pep-high-s5-fi-006", "69"],
      ["pep-high-s5-sa-001", "17"],
      ["pep-high-s5-sa-006", "50"]
    ]
  },
  "pep-high-s5-lines-circles": {
    families: ["line-circle-position", "line-slope", "line-slope", "circle-radius", "circle-radius-squared"],
    rows: [
      ["pep-high-s5-mc-042", "The line is tangent to the circle."],
      ["pep-high-s5-mc-002", "3"],
      ["pep-high-s5-mc-007", "5"],
      ["pep-high-s5-fi-002", "4"],
      ["pep-high-s5-sa-002", "16"]
    ]
  },
  "pep-high-s5-sequences": {
    families: ["geometric-nth-term", "arithmetic-nth-term", "arithmetic-nth-term", "arithmetic-sum", "arithmetic-sum"],
    rows: [
      ["pep-high-s5-mc-044", "48"],
      ["pep-high-s5-mc-004", "46"],
      ["pep-high-s5-fi-009", "21"],
      ["pep-high-s5-sa-004", "234"],
      ["pep-high-s5-sa-009", "84"]
    ]
  },
  "pep-high-s5-derivatives": {
    families: ["closed-interval-minimum", "derivative-evaluation", "derivative-evaluation", "stationary-point", "stationary-point"],
    rows: [
      ["pep-high-s5-mc-045", "1"],
      ["pep-high-s5-mc-005", "6"],
      ["pep-high-s5-fi-010", "27"],
      ["pep-high-s5-sa-005", "-1"],
      ["pep-high-s5-sa-010", "-0.5"]
    ]
  },
  "pep-high-s6-random-variables": {
    families: ["binomial-point-probability", "binomial-expectation", "binomial-expectation", "binomial-variance", "binomial-variance"],
    rows: [
      ["pep-high-s6-mc-037", "3/8"],
      ["pep-high-s6-mc-002", "4"],
      ["pep-high-s6-fi-009", "3"],
      ["pep-high-s6-sa-002", "2"],
      ["pep-high-s6-sa-009", "1.5"]
    ]
  },
  "pep-high-s6-bivariate-data": {
    families: ["correlation-interpretation", "regression-prediction", "regression-prediction", "regression-prediction", "residual"],
    rows: [
      ["pep-high-s6-mc-038", "There is a strong negative linear association."],
      ["pep-high-s6-mc-003", "20"],
      ["pep-high-s6-fi-010", "18"],
      ["pep-high-s6-fi-017", "9"],
      ["pep-high-s6-sa-003", "5"]
    ]
  },
  "pep-high-s6-derivative-synthesis": {
    families: ["monotonic-intervals", "derivative-evaluation", "derivative-evaluation", "stationary-point", "stationary-point"],
    rows: [
      ["pep-high-s6-mc-039", "(-∞,-1)∪(1,∞)"],
      ["pep-high-s6-mc-004", "11"],
      ["pep-high-s6-fi-011", "5"],
      ["pep-high-s6-sa-004", "-0.1"],
      ["pep-high-s6-sa-011", "0.375"]
    ]
  },
  "pep-high-s6-analytic-geometry-synthesis": {
    families: ["line-parabola-intersections", "ellipse-major-axis", "ellipse-focus-parameter", "ellipse-focus-parameter", "parabola-parameter"],
    rows: [
      ["pep-high-s6-mc-040", "2"],
      ["pep-high-s6-mc-005", "8"],
      ["pep-high-s6-fi-012", "48"],
      ["pep-high-s6-fi-019", "33"],
      ["pep-high-s6-sa-005", "7"]
    ]
  },
  "pep-high-s6-probability-statistics-synthesis": {
    families: ["complement-rule", "single-draw", "single-draw", "ordered-without-replacement", "ordered-without-replacement"],
    rows: [
      ["pep-high-s6-mc-041", "13/20"],
      ["pep-high-s6-mc-006", "1/2"],
      ["pep-high-s6-mc-013", "4/7"],
      ["pep-high-s6-sa-006", "56"],
      ["pep-high-s6-sa-013", "42"]
    ]
  },
  "pep-high-s6-exam-practice": {
    families: ["arithmetic-sum", "cubic-derivative", "cubic-derivative", "elementary-probability", "elementary-probability"],
    rows: [
      ["pep-high-s6-mc-042", "155"],
      ["pep-high-s6-mc-007", "192"],
      ["pep-high-s6-fi-014", "108"],
      ["pep-high-s6-sa-007", "1/3"],
      ["pep-high-s6-sa-014", "3/8"]
    ]
  }
} as const;
const hjbGeneratorPrefixPattern = /^(?:(?:V\d+\s*)?(?:修复|安全)?变式|二轮变式)\d{1,4}[：:]\s*(?:解答|填空|选择)?[：:]?/;
const simplifiedTraditionalPairs: Array<[string, string]> = [
  ["题", "題"],
  ["范围", "範圍"],
  ["选择", "選擇"],
  ["函数", "函數"],
  ["图像", "圖像"],
  ["图象", "圖像"],
  ["检查", "檢查"],
  ["计算", "計算"],
  ["练习", "練習"],
  ["学生", "學生"],
  ["老师", "老師"]
];

const mainlandPepHighAllGeneratedQuestions = mainlandPepHighQuestions;
const mainlandPepHighAllGenerationMetadata = mainlandPepHighQuestionGenerationMetadata;

function practiceTemplateFingerprint(value: string) {
  return value
    .toLowerCase()
    .replace(/\\[()[\]]/g, "")
    .replace(/[\s，。,.!?！？：:；;、'"“”‘’()（）\[\]{}]/g, "")
    .replace(/[-+]?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?/g, "#")
    .replace(/[a-z](?=[=<>+\-*/^]|$)/g, "v");
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

function assertHjbGeneratedQuestionLocalization(bankName: string, bankQuestions = mainlandHjbHighQuestions) {
  bankQuestions.forEach((question) => {
    const values = [
      [`${question.id} prompt`, question.prompt],
      [`${question.id} explanation`, question.explanation],
      ...(question.options ?? []).map((option, index) => [`${question.id} option ${index + 1}`, option] as const)
    ] as const;

    values.forEach(([label, value]) => {
      assert.ok(value.en.trim(), `${label} should have English text`);
      assert.ok(value.zh.trim(), `${label} should have Traditional Chinese text`);
      assert.ok((value.zhHans ?? "").trim(), `${label} should have Simplified Chinese text`);
      assert.doesNotMatch(value.zhHans ?? value.zh, hjbGeneratorPrefixPattern, `${label} should not expose generator prompt labels`);
      assert.doesNotMatch(value.en, cjkPattern, `${label} English text should not leak Chinese characters`);

      simplifiedTraditionalPairs.forEach(([simplified, traditional]) => {
        if ((value.zhHans ?? "").includes(simplified)) {
          assert.ok(value.zh.includes(traditional), `${label} should render ${simplified} as ${traditional} in Traditional Chinese`);
        }
      });
    });

    if (question.type === "multiple-choice") {
      const options = question.options ?? [];
      const correctOption = options.find((option) =>
        [option.zhHans, option.zh, option.en].some((optionText) => Boolean(optionText && question.acceptedAnswers?.includes(optionText)))
      );
      assert.ok(correctOption, `${bankName} ${question.id} should retain a localized correct option alias`);
      if (!correctOption) return;

      const gradingQuestion = {
        answer: question.answer,
        accepted_answers: question.acceptedAnswers ?? null,
        options
      };
      assert.equal(questionAnswerMatches(gradingQuestion, correctOption.en), true, `${question.id} should grade the English correct option`);
      assert.equal(questionAnswerMatches(gradingQuestion, correctOption.zh), true, `${question.id} should grade the Traditional correct option`);
      assert.equal(
        questionAnswerMatches(gradingQuestion, correctOption.zhHans ?? correctOption.zh),
        true,
        `${question.id} should grade the Simplified correct option`
      );
    }
  });
}

test("Mainland PEP high question bank has the requested grade and type coverage", () => {
  assert.equal(mainlandPepHighSeedV1Questions.length, 900);
  assert.equal(mainlandPepHighRagV2Questions.length, 900);
  assert.equal(mainlandPepHighRagV3Questions.length, 1500);
  assert.equal(mainlandPepHighRagV4Questions.length, 1500);
  assert.equal(mainlandPepHighQuestions.length, 4800);

  seniorGrades.forEach((grade) => {
    const gradeQuestions = mainlandPepHighQuestions.filter((question) => question.grade === grade);
    const ragV2GradeQuestions = mainlandPepHighRagV2Questions.filter((question) => question.grade === grade);
    const ragV3GradeQuestions = mainlandPepHighRagV3Questions.filter((question) => question.grade === grade);
    const ragV4GradeQuestions = mainlandPepHighRagV4Questions.filter((question) => question.grade === grade);
    assert.equal(gradeQuestions.length, 1600);
    assert.equal(ragV2GradeQuestions.length, 300);
    assert.equal(ragV3GradeQuestions.length, 500);
    assert.equal(ragV4GradeQuestions.length, 500);

    generatedTypes.forEach((type) => {
      const expectedGradeTypeTotal = type === "multiple-choice" ? 540 : 530;
      const expectedRagV3TypeTotal = type === "multiple-choice" ? 170 : 165;
      assert.equal(gradeQuestions.filter((question) => question.type === type).length, expectedGradeTypeTotal);
      assert.equal(ragV2GradeQuestions.filter((question) => question.type === type).length, 100);
      assert.equal(ragV3GradeQuestions.filter((question) => question.type === type).length, expectedRagV3TypeTotal);
      assert.equal(ragV4GradeQuestions.filter((question) => question.type === type).length, expectedRagV3TypeTotal);
    });
  });
});

test("Mainland PEP high stationary-point answers keep exact recurring rational values", () => {
  const exactStationaryAnswers = new Map([
    ["pep-high-s5-sa-035", "-1/6"],
    ["pep-high-s6-sa-053", "-1/6"],
    ["pep-high-s6-rag2-sa-051", "-1/6"],
    ["pep-high-s5-rag3-sa-146", "-1/6"],
    ["pep-high-s6-rag3-sa-089", "-1/6"],
    ["pep-high-s5-rag4-sa-147", "-1/6"],
    ["pep-high-s6-rag4-sa-086", "-1/6"],
    ["pep-high-s5-sa-060", "1/6"],
    ["pep-high-s5-rag2-sa-085", "1/6"],
    ["pep-high-s5-rag3-sa-156", "1/6"],
    ["pep-high-s5-rag4-sa-162", "1/6"],
    ["pep-high-s6-sa-088", "-1/3"],
    ["pep-high-s5-rag3-sa-141", "-1/3"],
    ["pep-high-s6-rag3-sa-084", "-1/3"],
    ["pep-high-s5-rag4-sa-157", "-1/3"],
    ["pep-high-s6-rag2-sa-056", "1/3"],
    ["pep-high-s5-rag3-sa-161", "1/3"],
    ["pep-high-s5-rag4-sa-152", "1/3"],
    ["pep-high-s6-rag4-sa-091", "1/3"]
  ] as const);
  const questionById = new Map(mainlandPepHighQuestions.map((question) => [question.id, question]));

  assert.equal(exactStationaryAnswers.size, 19);
  exactStationaryAnswers.forEach((expectedAnswer, questionId) => {
    const question = questionById.get(questionId);
    assert.ok(question, `${questionId} should exist`);
    assert.equal(question.answer, expectedAnswer, `${questionId} should store the exact stationary point`);
    assert.match(question.explanation.en, new RegExp(`x=${expectedAnswer.replace("/", "\\/")}`));
    assert.match(question.explanation.zhHans ?? question.explanation.zh, new RegExp(`x=${expectedAnswer.replace("/", "\\/")}`));

    const gradingQuestion = {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    const truncatedDecimal = expectedAnswer.endsWith("/6")
      ? expectedAnswer.startsWith("-") ? "-0.167" : "0.167"
      : expectedAnswer.startsWith("-") ? "-0.333" : "0.333";
    assert.equal(questionAnswerMatches(gradingQuestion, expectedAnswer), true);
    assert.equal(questionAnswerMatches(gradingQuestion, `x=${expectedAnswer}`), true);
    assert.equal(questionAnswerMatches(gradingQuestion, truncatedDecimal), false, `${questionId} must reject the old rounded key`);
  });
});

test("Mainland PEP high quadratic short answers accept natural minimum-value statements in all four batches", () => {
  const questions = mainlandPepHighQuestions.filter(
    (question) => question.type === "short-answer" && question.topicId === "pep-high-s4-quadratic-inequalities"
  );
  const batchFor = (questionId: string) =>
    questionId.includes("-rag2-") ? "rag-v2"
      : questionId.includes("-rag3-") ? "rag-v3"
        : questionId.includes("-rag4-") ? "rag-v4"
          : "seed-v1";

  assert.equal(questions.length, 52);
  assert.deepEqual(
    Object.fromEntries(
      ["seed-v1", "rag-v2", "rag-v3", "rag-v4"].map((batch) => [
        batch,
        questions.filter((question) => batchFor(question.id) === batch).length
      ])
    ),
    { "seed-v1": 10, "rag-v2": 10, "rag-v3": 16, "rag-v4": 16 }
  );

  questions.forEach((question) => {
    const gradingQuestion = {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    const naturalAliases = [
      `minimum value is ${question.answer}`,
      `the minimum value is ${question.answer}`,
      `最小值为${question.answer}`,
      `最小值是${question.answer}`
    ];
    naturalAliases.forEach((alias) => {
      assert.ok(question.acceptedAnswers?.includes(alias), `${question.id} should store ${alias}`);
      assert.equal(questionAnswerMatches(gradingQuestion, alias), true, `${question.id} should grade ${alias}`);
    });
    const wrongValue = String(Number(question.answer) + 1);
    assert.equal(questionAnswerMatches(gradingQuestion, `最小值为${wrongValue}`), false);
  });
});

test("Mainland PEP high probability short answers accept labeled reduction chains and reject inconsistent chains", () => {
  const questions = mainlandPepHighQuestions.filter(
    (question) => question.type === "short-answer" && question.topicId === "pep-high-s6-exam-practice"
  );
  const batchFor = (questionId: string) =>
    questionId.includes("-rag2-") ? "rag-v2"
      : questionId.includes("-rag3-") ? "rag-v3"
        : questionId.includes("-rag4-") ? "rag-v4"
          : "seed-v1";

  assert.equal(questions.length, 76);
  assert.deepEqual(
    Object.fromEntries(
      ["seed-v1", "rag-v2", "rag-v3", "rag-v4"].map((batch) => [
        batch,
        questions.filter((question) => batchFor(question.id) === batch).length
      ])
    ),
    { "seed-v1": 14, "rag-v2": 14, "rag-v3": 24, "rag-v4": 24 }
  );

  questions.forEach((question) => {
    const outcomeMatch = question.prompt.en.match(
      /has\s+(\d+)\s+(?:favorable\s+)?outcomes\s+(?:among|from)\s+(\d+)\s+equally likely outcomes/i
    );
    assert.ok(outcomeMatch, `${question.id} should state favorable and total outcome counts`);
    const favorableOutcomes = Number(outcomeMatch[1]);
    const totalOutcomes = Number(outcomeMatch[2]);
    const rawProbability = `${favorableOutcomes}/${totalOutcomes}`;
    const gradingQuestion = {
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      options: question.options ?? null
    };
    const requiredAliases = [
      `P=${question.answer}`,
      `probability is ${question.answer}`,
      `概率为${question.answer}`,
      `P=${rawProbability}`,
      `概率为${rawProbability}`
    ];
    if (rawProbability !== question.answer) {
      requiredAliases.push(
        `${rawProbability}=${question.answer}`,
        `P=${rawProbability}=${question.answer}`,
        `probability is ${rawProbability}=${question.answer}`,
        `概率为${rawProbability}=${question.answer}`
      );
    }

    requiredAliases.forEach((alias) => {
      assert.ok(question.acceptedAnswers?.includes(alias), `${question.id} should store ${alias}`);
      assert.equal(questionAnswerMatches(gradingQuestion, alias), true, `${question.id} should grade ${alias}`);
    });
    assert.equal(
      questionAnswerMatches(gradingQuestion, `P=${favorableOutcomes + 1}/${totalOutcomes}=${question.answer}`),
      false,
      `${question.id} should reject a chain whose raw probability is wrong`
    );
    assert.equal(
      questionAnswerMatches(gradingQuestion, `P=${rawProbability}=1/997`),
      false,
      `${question.id} should reject a chain whose reduced result is wrong`
    );
  });
});

test("Mainland PEP rag-v4 short answers request only the deterministically graded final result", () => {
  const questions = mainlandPepHighRagV4Questions.filter((question) => question.type === "short-answer");
  const outputDemandReasoningEn = /brief justification|one clear line of reasoning|a short calculation is enough|explain which part|state the requested quantity|use the standard formula only|keep equivalent forms|check the answer against|choose the simpler route/i;
  const outputDemandReasoningZh = /简要理由|一条清晰思路|简短计算|说明式子中|回答所求量|确认条件匹配后再使用|等价形式与题目要求|代回原符号|选择更简洁/u;

  assert.equal(questions.length, 495);
  questions.forEach((question) => {
    assert.match(question.prompt.en, /Write only the requested final result\./);
    assert.match(question.prompt.zhHans ?? question.prompt.zh, /只写题目要求的最终结果。/);
    assert.doesNotMatch(question.prompt.en, outputDemandReasoningEn, `${question.id} must not demand ungraded reasoning`);
    assert.doesNotMatch(
      question.prompt.zhHans ?? question.prompt.zh,
      outputDemandReasoningZh,
      `${question.id} must not demand ungraded reasoning`
    );
    assert.ok(question.explanation.en.trim(), `${question.id} should keep its educational English explanation`);
    assert.ok((question.explanation.zhHans ?? question.explanation.zh).trim(), `${question.id} should keep its educational Chinese explanation`);
  });
});

test("Mainland PEP rag-v4 MC and fill-in prompts do not require an ungraded explanation component", () => {
  const unsupported = mainlandPepHighRagV4Questions.filter((question) =>
    question.type !== "short-answer"
    && (
      /Explain which part of the expression determines the answer\./iu.test(question.prompt.en)
      || /说明式子中哪一部分决定答案。/u.test(question.prompt.zhHans ?? question.prompt.zh)
    )
  );

  assert.deepEqual(unsupported.map((question) => question.id), []);
});

test("Mainland HJB high V2 bank is integrated as the 1500-question publisher-scoped default", () => {
  assert.equal(mainlandHjbHighQuestions.length, 1500);
  assert.equal(mainlandHjbHighV1Questions.length, 1500);
  assert.equal(mainlandHjbHighV2Questions.length, 1500);
  assert.equal(mainlandHjbHighV3RemediatedQuestions.length, 1500);
  assert.equal(mainlandHjbHighV4RemediatedQuestions.length, 1500);
  assert.equal(mainlandHjbHighTopics.length, 30);

  assert.deepEqual(
    Object.fromEntries(seniorGrades.map((grade) => [grade, mainlandHjbHighQuestions.filter((question) => question.grade === grade).length])),
    { S4: 500, S5: 500, S6: 500 }
  );
  assert.deepEqual(
    Object.fromEntries(seniorGrades.map((grade) => [grade, mainlandHjbHighTopics.filter((topic) => topic.grade === grade).length])),
    { S4: 9, S5: 8, S6: 13 }
  );

  assert.equal(new Set(mainlandHjbHighQuestions.map((question) => question.id)).size, 1500);
  assert.ok(mainlandHjbHighQuestions.every((question) => /^hjb-high-ds-v2-/.test(question.id)));
  assert.ok(mainlandHjbHighQuestions.every((question) => !hjbGeneratorPrefixPattern.test(question.prompt.zhHans ?? question.prompt.zh)));
  assert.deepEqual(
    Object.fromEntries(generatedTypes.map((type) => [type, mainlandHjbHighQuestions.filter((question) => question.type === type).length])),
    { "multiple-choice": 600, "fill-in": 525, "short-answer": 375 }
  );
  assert.deepEqual(
    Object.fromEntries(
      ["hjb-v1", "hjb-v2", "hjb-v3-remediated", "hjb-v4-remediated"].map((batch) => [
        batch,
        mainlandHjbHighQuestions.filter((question) => mainlandHjbHighQuestionGenerationMetadata[question.id]?.batch === batch).length
      ])
    ),
    { "hjb-v1": 0, "hjb-v2": 1500, "hjb-v3-remediated": 0, "hjb-v4-remediated": 0 }
  );

  const topicIds = new Set(mainlandHjbHighTopics.map((topic) => topic.id));
  mainlandHjbHighTopics.forEach((topic) => {
    assert.equal(topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(topic.region, "MAINLAND");
    assert.equal(topic.publisher, "MAINLAND_HJB");
    assert.deepEqual(topic.curriculumProfile, mainlandHjbProfile);
  });
  mainlandHjbHighQuestions.forEach((question) => {
    assert.equal(question.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(question.region, "MAINLAND");
    assert.equal(question.publisher, "MAINLAND_HJB");
    assert.deepEqual(question.curriculumProfile, mainlandHjbProfile);
    assert.ok(topicIds.has(question.topicId), `${question.id} references missing HJB topic ${question.topicId}`);
    assert.equal(mainlandHjbHighQuestionGenerationMetadata[question.id]?.manualQaStatus, "approved");
  });
  const exportedHjbHighQuestions = questions.filter((question) => question.publisher === "MAINLAND_HJB" && /^hjb-high-ds-v2-/.test(question.id));
  assert.equal(exportedHjbHighQuestions.length, 1500);
});

test("Mainland BNU high approved bank is integrated as a 1500-question publisher-scoped pool", () => {
  assert.equal(mainlandBnuHighQuestions.length, 1500);
  assert.equal(mainlandBnuHighTopics.length, 24);

  assert.deepEqual(
    Object.fromEntries(seniorGrades.map((grade) => [grade, mainlandBnuHighQuestions.filter((question) => question.grade === grade).length])),
    { S4: 500, S5: 500, S6: 500 }
  );
  assert.deepEqual(
    Object.fromEntries(generatedTypes.map((type) => [type, mainlandBnuHighQuestions.filter((question) => question.type === type).length])),
    { "multiple-choice": 525, "fill-in": 450, "short-answer": 525 }
  );

  const topicIds = new Set(mainlandBnuHighTopics.map((topic) => topic.id));
  mainlandBnuHighTopics.forEach((topic) => {
    assert.equal(topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(topic.region, "MAINLAND");
    assert.equal(topic.publisher, "MAINLAND_BNU");
    assert.deepEqual(topic.curriculumProfile, mainlandBnuProfile);
  });
  mainlandBnuHighQuestions.forEach((question) => {
    assert.equal(question.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(question.region, "MAINLAND");
    assert.equal(question.publisher, "MAINLAND_BNU");
    assert.deepEqual(question.curriculumProfile, mainlandBnuProfile);
    assert.match(question.id, /^bnu-high-ds-v1-/);
    assert.ok(topicIds.has(question.topicId), `${question.id} references missing BNU high topic ${question.topicId}`);
    assert.equal(mainlandBnuHighQuestionGenerationMetadata[question.id]?.manualQaStatus, "approved");
  });
  const exportedBnuHighQuestions = questions.filter((question) => question.publisher === "MAINLAND_BNU" && /^bnu-high-ds-v1-/.test(question.id));
  assert.equal(exportedBnuHighQuestions.length, 1500);
});

test("Mainland BNU high formal lesson seeds cover every approved senior topic", () => {
  const bnuHighQuestionIds = new Set(mainlandBnuHighQuestions.map((question) => question.id));
  const bnuHighTopicIds = new Set(mainlandBnuHighTopics.map((topic) => topic.id));

  assert.equal(mainlandBnuHighLessonSeeds.length, mainlandBnuHighTopics.length);
  assert.equal(new Set(mainlandBnuHighLessonSeeds.map((lesson) => lesson.topicId)).size, mainlandBnuHighTopics.length);

  mainlandBnuHighLessonSeeds.forEach((lesson) => {
    assert.ok(bnuHighTopicIds.has(lesson.topicId), `${lesson.topicId} should reference an approved BNU high topic`);
    assert.equal(lesson.productionReady, true);
    assert.equal(lesson.practiceQuestionIds?.length, 8, `${lesson.topicId} should expose an 8-question checkpoint`);
    assert.ok(lesson.practiceQuestionIds?.every((questionId) => {
      const metadata = mainlandBnuHighQuestionGenerationMetadata[questionId];
      return (
        bnuHighQuestionIds.has(questionId) &&
        /^bnu-high-ds-v1-/.test(questionId) &&
        metadata?.sourceDistanceStatus === "passed-auto-source-scan" &&
        metadata.mathQaStatus === "pass" &&
        metadata.terminologyQaStatus === "pass" &&
        metadata.manualQaStatus === "approved"
      );
    }));
    assert.deepEqual(
      lesson.blocks.map((block) => block.type),
      ["concept", "worked-example", "checklist", "extension", "teacher-guide"]
    );
    assert.doesNotMatch(JSON.stringify(lesson), /term-[0-9a-f]+/);
  });

  assert.ok(mainlandBnuHighQuestions.every((question) => !/term-[0-9a-f]+/.test(JSON.stringify(question))));
});

test("Mainland BNU S4-S6 Lesson, Roadmap, Practice, and question API expose approved senior content", async () => {
  for (const grade of seniorGrades) {
    const entry = await getLessonEntryTarget(`bnu-high-${grade.toLowerCase()}-smoke`, grade, mainlandBnuProfile);
    assert.ok(entry, `${grade} BNU high should have a lesson entry target`);
    assert.equal(entry?.grade, grade);

    const lesson = await getLessonBySlug(null, entry.slug, mainlandBnuProfile);
    assert.equal(lesson?.grade, grade);
    assert.equal(lesson?.publisher, "MAINLAND_BNU");
    assert.equal(lesson?.topic.publisher, "MAINLAND_BNU");
    assert.ok(lesson?.blocks.some((block) => block.type === "teacher-guide"));
    assert.equal(lesson?.practiceQuestions.length, 8);
    assert.ok(lesson?.practiceQuestions.every((question) =>
      question.publisher === "MAINLAND_BNU" &&
      question.grade === grade &&
      /^bnu-high-ds-v1-/.test(question.id)
    ));
    assert.doesNotMatch(JSON.stringify(lesson), /term-[0-9a-f]+/);
  }
});

test("Mainland HJB primary V1 bank is integrated as a 1500-question publisher-scoped pool", () => {
  assert.equal(mainlandHjbPrimaryQuestions.length, 1500);
  assert.equal(mainlandHjbPrimaryTopics.length, 70);

  assert.deepEqual(
    Object.fromEntries(primaryGrades.map((grade) => [grade, mainlandHjbPrimaryQuestions.filter((question) => question.grade === grade).length])),
    { P1: 250, P2: 250, P3: 250, P4: 250, P5: 250, P6: 250 }
  );
  assert.deepEqual(
    Object.fromEntries(generatedTypes.map((type) => [type, mainlandHjbPrimaryQuestions.filter((question) => question.type === type).length])),
    { "multiple-choice": 600, "fill-in": 533, "short-answer": 367 }
  );
  assert.deepEqual(
    mainlandHjbPrimaryQuestions
      .filter((question) => question.type === "short-answer" && [
        "hjb-primary-ds-v1-p1-161",
        "hjb-primary-ds-v1-p1-196",
        "hjb-primary-ds-v1-p1-216",
        "hjb-primary-ds-v1-p2-116",
        "hjb-primary-ds-v1-p2-119",
        "hjb-primary-ds-v1-p3-234",
        "hjb-primary-ds-v1-p3-236"
      ].includes(question.id))
      .map((question) => question.id)
      .sort(),
    [
      "hjb-primary-ds-v1-p1-161",
      "hjb-primary-ds-v1-p1-196",
      "hjb-primary-ds-v1-p1-216",
      "hjb-primary-ds-v1-p2-116",
      "hjb-primary-ds-v1-p2-119",
      "hjb-primary-ds-v1-p3-234",
      "hjb-primary-ds-v1-p3-236"
    ],
    "the seven explanation/process prompts must remain textarea-compatible short answers"
  );

  const topicIds = new Set(mainlandHjbPrimaryTopics.map((topic) => topic.id));
  mainlandHjbPrimaryTopics.forEach((topic) => {
    assert.equal(topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(topic.region, "MAINLAND");
    assert.equal(topic.publisher, "MAINLAND_HJB");
    assert.deepEqual(topic.curriculumProfile, mainlandHjbProfile);
  });
  mainlandHjbPrimaryQuestions.forEach((question) => {
    assert.equal(question.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(question.region, "MAINLAND");
    assert.equal(question.publisher, "MAINLAND_HJB");
    assert.deepEqual(question.curriculumProfile, mainlandHjbProfile);
    assert.ok(topicIds.has(question.topicId), `${question.id} references missing HJB primary topic ${question.topicId}`);
    assert.equal(mainlandHjbPrimaryQuestionGenerationMetadata[question.id]?.batch, "hjb-primary-v1");
    assert.equal(mainlandHjbPrimaryQuestionGenerationMetadata[question.id]?.manualQaStatus, "approved");
  });

  const exportedHjbPrimaryQuestions = questions.filter((question) => question.publisher === "MAINLAND_HJB" && /^hjb-primary-ds-v1-/.test(question.id));
  assert.equal(exportedHjbPrimaryQuestions.length, 1500);
  assert.equal(new Set(exportedHjbPrimaryQuestions.map((question) => JSON.stringify({
    prompt: question.prompt.zhHans ?? question.prompt.zh,
    options: (question.options ?? []).map((option) => option.zhHans ?? option.zh)
  }))).size, 1500, "learner-facing prompt-plus-option payloads must remain unique");
});

test("Mainland HJB junior V2 bank is integrated as a 1500-question publisher-scoped pool", () => {
  assert.equal(mainlandHjbJuniorQuestions.length, 1500);
  assert.equal(mainlandHjbJuniorTopics.length, 22);

  assert.deepEqual(
    Object.fromEntries(juniorGrades.map((grade) => [grade, mainlandHjbJuniorQuestions.filter((question) => question.grade === grade).length])),
    { S1: 500, S2: 500, S3: 500 }
  );
  assert.deepEqual(
    Object.fromEntries(generatedTypes.map((type) => [type, mainlandHjbJuniorQuestions.filter((question) => question.type === type).length])),
    { "multiple-choice": 600, "fill-in": 525, "short-answer": 375 }
  );

  const topicIds = new Set(mainlandHjbJuniorTopics.map((topic) => topic.id));
  mainlandHjbJuniorTopics.forEach((topic) => {
    assert.equal(topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(topic.region, "MAINLAND");
    assert.equal(topic.publisher, "MAINLAND_HJB");
    assert.deepEqual(topic.curriculumProfile, mainlandHjbProfile);
  });
  mainlandHjbJuniorQuestions.forEach((question) => {
    assert.equal(question.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(question.region, "MAINLAND");
    assert.equal(question.publisher, "MAINLAND_HJB");
    assert.deepEqual(question.curriculumProfile, mainlandHjbProfile);
    assert.ok(topicIds.has(question.topicId), `${question.id} references missing HJB junior topic ${question.topicId}`);
    assert.equal(mainlandHjbJuniorQuestionGenerationMetadata[question.id]?.batch, "hjb-junior-v2-1500");
    assert.equal(mainlandHjbJuniorQuestionGenerationMetadata[question.id]?.manualQaStatus, "approved");
  });

  const exportedHjbJuniorQuestions = questions.filter((question) => question.publisher === "MAINLAND_HJB" && /^hjb-junior-ds-v2-/.test(question.id));
  assert.equal(exportedHjbJuniorQuestions.length, 1500);
  assert.equal(new Set(exportedHjbJuniorQuestions.map((question) => question.prompt.zhHans ?? question.prompt.zh)).size, 1500);
});

test("Mainland HJB generated banks clean generator labels and expose English and Traditional Chinese", () => {
  assertHjbGeneratedQuestionLocalization("HJB high", mainlandHjbHighQuestions);
  assertHjbGeneratedQuestionLocalization("HJB primary", mainlandHjbPrimaryQuestions);
  assertHjbGeneratedQuestionLocalization("HJB junior", mainlandHjbJuniorQuestions);
});

test("Mainland PEP rag-v2 questions follow the requested topic distribution", () => {
  const expectedByGrade: Record<Extract<GradeId, "S4" | "S5" | "S6">, Record<string, number>> = {
    S4: Object.fromEntries(mainlandPepHighTopics.filter((topic) => topic.grade === "S4").map((topic) => [topic.id, 30])),
    S5: Object.fromEntries(mainlandPepHighTopics.filter((topic) => topic.grade === "S5").map((topic) => [topic.id, 60])),
    S6: {
      "pep-high-s6-counting": 43,
      "pep-high-s6-random-variables": 43,
      "pep-high-s6-bivariate-data": 43,
      "pep-high-s6-derivative-synthesis": 43,
      "pep-high-s6-analytic-geometry-synthesis": 43,
      "pep-high-s6-probability-statistics-synthesis": 43,
      "pep-high-s6-exam-practice": 42
    }
  };

  seniorGrades.forEach((grade) => {
    Object.entries(expectedByGrade[grade]).forEach(([topicId, expectedCount]) => {
      assert.equal(
        mainlandPepHighRagV2Questions.filter((question) => question.grade === grade && question.topicId === topicId).length,
        expectedCount,
        `${grade} rag-v2 topic ${topicId} should have ${expectedCount} questions`
      );
    });
  });
});

test("Mainland PEP rag-v3 questions follow the requested topic and type distribution", () => {
  const expectedByGrade: Record<Extract<GradeId, "S4" | "S5" | "S6">, Record<string, number>> = {
    S4: Object.fromEntries(mainlandPepHighTopics.filter((topic) => topic.grade === "S4").map((topic) => [topic.id, 50])),
    S5: Object.fromEntries(mainlandPepHighTopics.filter((topic) => topic.grade === "S5").map((topic) => [topic.id, 100])),
    S6: {
      "pep-high-s6-counting": 72,
      "pep-high-s6-random-variables": 72,
      "pep-high-s6-bivariate-data": 72,
      "pep-high-s6-derivative-synthesis": 71,
      "pep-high-s6-analytic-geometry-synthesis": 71,
      "pep-high-s6-probability-statistics-synthesis": 71,
      "pep-high-s6-exam-practice": 71
    }
  };

  seniorGrades.forEach((grade) => {
    Object.entries(expectedByGrade[grade]).forEach(([topicId, expectedCount]) => {
      assert.equal(
        mainlandPepHighRagV3Questions.filter((question) => question.grade === grade && question.topicId === topicId).length,
        expectedCount,
        `${grade} rag-v3 topic ${topicId} should have ${expectedCount} questions`
      );
    });
  });
});

test("Mainland PEP rag-v4 public questions follow the requested topic and type distribution", () => {
  const expectedByGrade: Record<Extract<GradeId, "S4" | "S5" | "S6">, Record<string, number>> = {
    S4: Object.fromEntries(mainlandPepHighTopics.filter((topic) => topic.grade === "S4").map((topic) => [topic.id, 50])),
    S5: Object.fromEntries(mainlandPepHighTopics.filter((topic) => topic.grade === "S5").map((topic) => [topic.id, 100])),
    S6: {
      "pep-high-s6-counting": 72,
      "pep-high-s6-random-variables": 72,
      "pep-high-s6-bivariate-data": 72,
      "pep-high-s6-derivative-synthesis": 71,
      "pep-high-s6-analytic-geometry-synthesis": 71,
      "pep-high-s6-probability-statistics-synthesis": 71,
      "pep-high-s6-exam-practice": 71
    }
  };

  seniorGrades.forEach((grade) => {
    Object.entries(expectedByGrade[grade]).forEach(([topicId, expectedCount]) => {
      assert.equal(
        mainlandPepHighRagV4Questions.filter((question) => question.grade === grade && question.topicId === topicId).length,
        expectedCount,
        `${grade} rag-v4 topic ${topicId} should have ${expectedCount} public questions`
      );
    });
  });
});

test("Mainland PEP rag-v2, rag-v3, and rag-v4 public questions are traceable to safe RAG cards", () => {
  const ragCardIds = new Set(mainlandPepHighRagCards.map((card) => card.id));
  const examPatternCardIds = new Set(mainlandPepHighExamPatternCards.map((card) => card.id));
  const requiredEvidenceTopics = new Map([
    ["trigonometry", "pep-high-s4-trigonometry"],
    ["sequences", "pep-high-s5-sequences"],
    ["derivatives", "pep-high-s5-derivatives"],
    ["space vectors", "pep-high-s5-space-vectors"],
    ["probability statistics", "pep-high-s6-probability-statistics-synthesis"],
    ["conics", "pep-high-s6-analytic-geometry-synthesis"]
  ]);

  [...mainlandPepHighRagV2Questions, ...mainlandPepHighRagV3Questions, ...mainlandPepHighRagV4Questions].forEach((question) => {
    const metadata = mainlandPepHighAllGenerationMetadata[question.id];
    assert.ok(metadata, `${question.id} is missing generation metadata`);
    assert.ok(
      metadata.batch === "rag-v2" || metadata.batch === "rag-v3" || metadata.batch === "rag-v4",
      `${question.id} has unexpected batch ${metadata.batch}`
    );
    assert.equal(metadata.sourceDistanceStatus, "passed");
    assert.ok(metadata.evidenceCardIds.length > 0, `${question.id} should cite at least one safe RAG card`);
    assert.ok(metadata.evidenceCardIds.every((cardId) => ragCardIds.has(cardId)), `${question.id} has an unknown RAG card`);
    assert.ok(
      metadata.examPatternCardIds.every((cardId) => examPatternCardIds.has(cardId)),
      `${question.id} has an unknown exam-pattern card`
    );
  });

  requiredEvidenceTopics.forEach((topicId, label) => {
    assert.ok(
      mainlandPepHighRagV3Questions.some((question) => question.topicId === topicId),
      `rag-v3 coverage should include ${label}`
    );
    assert.ok(
      mainlandPepHighRagV4Questions.some((question) => question.topicId === topicId),
      `rag-v4 public coverage should include ${label}`
    );
  });
});

test("Mainland PEP seed-v1, rag-v2, rag-v3, and rag-v4 public QA comparison covers all batches", () => {
  const report = buildMainlandHighQuestionQualityComparison("2026-05-21");
  validateMainlandHighQuestionQualityComparison(report);

  assert.equal(report.comparison.baselineBatch, "seed-v1");
  assert.deepEqual(report.comparison.ragBatches, ["rag-v2", "rag-v3", "rag-v4"]);
  assert.equal(report.comparison.noRawSourceAccess, true);
  assert.equal(report.summary.batchSummaries["seed-v1"].count, 900);
  assert.equal(report.summary.batchSummaries["rag-v2"].count, 900);
  assert.equal(report.summary.batchSummaries["rag-v3"].count, 1500);
  assert.equal(report.summary.batchSummaries["rag-v4"].count, 1500);
  assert.equal(report.rows.length, 4800);
  assert.equal(report.sampleReviewQueue.length, 480);

  report.rows.forEach((row) => {
    assert.ok(row.qualityScore >= 0 && row.qualityScore <= 100, `${row.questionId} has invalid quality score`);
    assert.ok(row.knowledgeMatchScore >= 0 && row.knowledgeMatchScore <= 100, `${row.questionId} has invalid knowledge score`);
    assert.ok(row.solvabilityScore >= 0 && row.solvabilityScore <= 100, `${row.questionId} has invalid solvability score`);
    assert.ok(row.reviewRecommendation, `${row.questionId} is missing review recommendation`);
  });
});

test("Mainland PEP rag-v4 solvability audit passes every promoted row", () => {
  const report = buildMainlandHighRagV4PublicSolvabilityAudit("2026-05-23");

  assert.equal(report.summary.publicIntegrated, true);
  assert.equal(report.summary.expectedQuestions, 1500);
  assert.equal(report.summary.totalQuestions, 1500);
  assert.equal(report.summary.publicRagV4Questions, 1500);
  assert.equal(report.summary.publicMainlandPepHighQuestions, 4800);
  assert.deepEqual(report.summary.gradeCounts, { S4: 500, S5: 500, S6: 500 });
  assert.equal(report.summary.duplicateIdCount, 0);
  assert.equal(report.summary.duplicateExactPromptCount, 0);
  assert.equal(report.summary.passRows, 1500);
  assert.equal(report.summary.failingRows, 0);
  assert.equal(report.inventoryIssues.length, 0);
  assert.equal(report.summary.statusCounts.pass, 1500);
  assert.deepEqual(report.summary.batchCounts, { "rag-v4": 1500 });
});

test("Mainland PEP high questions are track-scoped, linked to Mainland topics, and answerable", () => {
  const topicIds = new Set(mainlandPepHighTopics.map((topic) => topic.id));
  const ids = new Set<string>();
  const publicPepHighQuestions = questions.filter((question) => Boolean(mainlandPepHighAllGenerationMetadata[question.id]));

  assert.equal(publicPepHighQuestions.length, 4800);
  publicPepHighQuestions.forEach(assertQuestionImageAssetIsGated);

  mainlandPepHighAllGeneratedQuestions.forEach((question) => {
    assert.equal(question.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.ok(topicIds.has(question.topicId), `${question.id} uses missing topic ${question.topicId}`);
    assert.ok(!ids.has(question.id), `duplicate question id ${question.id}`);
    ids.add(question.id);
    assert.ok(question.answer.trim(), `${question.id} is missing an answer`);
    assert.ok(question.explanation.en.trim() && question.explanation.zh.trim(), `${question.id} is missing an explanation`);

    if (question.type === "multiple-choice") {
      assert.equal(question.options?.length, 4, `${question.id} should have four options`);
      assert.ok(question.options?.some((option) => option.en === question.answer), `${question.id} answer is not in options`);
    }
  });
});

test("Mainland PEP high English-visible question text does not leak Chinese characters", () => {
  mainlandPepHighAllGeneratedQuestions.forEach((question) => {
    englishVisibleTextFields(question).forEach(([field, value]) => {
      assert.doesNotMatch(value, cjkPattern, `${question.id} ${field} should be English-mode safe`);
    });
  });
});

test("Mainland PEP high probability synthesis displays the full binomial probability term", () => {
  const lesson = mainlandPepHighLessonSeeds.find(
    (candidate) => candidate.topicId === "pep-high-s6-probability-statistics-synthesis"
  );
  const workedExample = lesson?.blocks.find((block) => block.type === "worked-example")?.content;
  const lessonSource = mainlandPepHighLessonPack.lessons.find(
    (candidate) => candidate.metadata.topicId === "pep-high-s6-probability-statistics-synthesis"
  );
  const alignedWorkedExample = lessonSource?.studentLesson.bilingualAlignment.find(
    (alignment) => alignment.section === "worked-example-1"
  );

  assert.ok(workedExample, "probability synthesis should expose its worked example");
  assert.match(workedExample.en, /C_3\^2\(0\.6\)\^2\(0\.4\)\^1=0\.432/u);
  assert.match(workedExample.zh, /C_3\^2\(0\.6\)\^2\(0\.4\)\^1=0\.432/u);
  assert.ok(alignedWorkedExample, "probability synthesis should retain its bilingual worked-example alignment");
  assert.match(alignedWorkedExample.en, /C_3\^2\(0\.6\)\^2\(0\.4\)\^1=0\.432/u);
  assert.match(alignedWorkedExample.zhHans, /C_3\^2\(0\.6\)\^2\(0\.4\)\^1=0\.432/u);
});

test("Mainland PEP high reviewed variety slices pin five independently checked answers across three task families", () => {
  const questionById = new Map(mainlandPepHighQuestions.map((question) => [question.id, question]));

  Object.entries(reviewedPepHighPracticeSelections).forEach(([topicId, selection]) => {
    const lessonSeed = mainlandPepHighLessonSeeds.find((seed) => seed.topicId === topicId);
    const expectedIds = selection.rows.map(([questionId]) => questionId);

    assert.ok(lessonSeed, `${topicId} should have a production lesson seed`);
    assert.deepEqual(lessonSeed.practiceQuestionIds, expectedIds, `${topicId} should preserve the reviewed runtime selection`);
    assert.equal(expectedIds.length, 5, `${topicId} should select exactly five practice questions`);
    assert.equal(new Set(expectedIds).size, 5, `${topicId} should select five unique IDs`);
    assert.equal(selection.families.length, 5, `${topicId} should have one reviewed family fingerprint per selected item`);
    assert.ok(new Set(selection.families).size >= 3, `${topicId} should cover at least three manually reviewed mathematical families`);

    const selectedQuestions = selection.rows.map(([questionId, expectedAnswer]) => {
      const question = questionById.get(questionId);
      const expectedGrade = topicId.match(/-s([456])-/)?.[1];
      assert.ok(question, `${questionId} should exist in the public PEP high bank`);
      assert.equal(question.topicId, topicId, `${questionId} should remain in its reviewed topic`);
      assert.equal(question.grade, `S${expectedGrade}`, `${questionId} should remain in the lesson grade`);
      assert.equal(question.curriculumTrack, "MAINLAND_PEP_HIGH", `${questionId} should remain in the PEP high track`);
      assert.equal(question.answer, expectedAnswer, `${questionId} should retain its independently checked answer`);
      assert.ok(question.prompt.en.trim() && question.prompt.zh.trim(), `${questionId} should have bilingual prompt text`);
      assert.ok(question.explanation.en.trim() && question.explanation.zh.trim(), `${questionId} should have bilingual explanation text`);
      assert.doesNotMatch(question.prompt.en, cjkPattern, `${questionId} should have an English-visible prompt`);
      assert.doesNotMatch(question.explanation.en, cjkPattern, `${questionId} should have an English-visible explanation`);
      assert.doesNotMatch(question.prompt.en, /\b(?:original|RAG-v\d|MAIS)\b/iu, `${questionId} prompt should not expose a generation label`);
      assert.doesNotMatch(question.explanation.en, /\b(?:original|RAG-v\d|MAIS)\b/iu, `${questionId} explanation should not expose a generation label`);

      const gradingQuestion = {
        answer: question.answer,
        accepted_answers: question.acceptedAnswers ?? null,
        options: question.options ?? null
      };
      assert.equal(questionAnswerMatches(gradingQuestion, expectedAnswer), true, `${questionId} should grade its independently checked answer`);
      question.acceptedAnswers?.forEach((alias) => {
        assert.equal(questionAnswerMatches(gradingQuestion, alias), true, `${questionId} should grade accepted bilingual alias ${alias}`);
      });

      if (question.type === "multiple-choice") {
        const options = question.options ?? [];
        const englishOptions = options.map((option) => option.en);
        const correctOption = options.find((option) => option.en === question.answer);
        assert.equal(options.length, 4, `${questionId} should have four options`);
        assert.equal(new Set(englishOptions).size, 4, `${questionId} should have four unique English options`);
        assert.equal(englishOptions.filter((option) => option === question.answer).length, 1, `${questionId} should have one answer key`);
        assert.ok(correctOption, `${questionId} should expose the keyed option`);
        if (correctOption) {
          assert.equal(questionAnswerMatches(gradingQuestion, correctOption.en), true, `${questionId} should grade the English key`);
          assert.equal(questionAnswerMatches(gradingQuestion, correctOption.zh), true, `${questionId} should grade the Chinese key`);
        }
      }

      return question;
    });

    assert.equal(new Set(selectedQuestions.map((question) => question.answer)).size, 5, `${topicId} should display five distinct answers`);
    assert.deepEqual(
      dedupePracticeQuestions(selectedQuestions).map((question) => question.id),
      expectedIds,
      `${topicId} should keep all five reviewed items, in order, after the LessonView runtime dedupe`
    );
    assert.ok(
      new Set(selectedQuestions.map((question) => practiceTemplateFingerprint(question.prompt.zhHans ?? question.prompt.zh))).size >= 3,
      `${topicId} should survive the runtime template-variety gate`
    );
  });
});

test("Mainland PEP high displayed feedback uses item-specific mathematics instead of cross-task boilerplate", () => {
  const questionById = new Map(mainlandPepHighQuestions.map((question) => [question.id, question]));
  const handwritingTypes = new Set<QuestionType>(["fill-in", "short-answer", "graph"]);
  const displayedQuestions = mainlandPepHighLessonSeeds.flatMap((seed) => {
    const candidates = seed.practiceQuestionIds === undefined
      ? mainlandPepHighQuestions.filter((question) => question.topicId === seed.topicId)
      : seed.practiceQuestionIds.map((questionId) => {
      const question = questionById.get(questionId);
      assert.ok(question, `${questionId} should exist in the public PEP high bank`);
      return question;
        });
    const deduped = dedupePracticeQuestions(candidates) as Question[];
    const selected = deduped.slice(0, 5);
    if (selected.some((question) => handwritingTypes.has(question.type))) return selected;
    const handwritingQuestion = deduped.find((question) => handwritingTypes.has(question.type));
    return handwritingQuestion ? [...selected.slice(0, 4), handwritingQuestion] : selected;
  });
  const legacyCrossTaskFeedback = [
    "Use standard-angle values or read the graph parameter",
    "使用特殊角取值，或从",
    "Multiply corresponding coordinates and add. For length squared",
    "数量积是对应坐标乘积之和；模长平方",
    "Use the cuboid formulas for surface area, volume, or",
    "根据题意使用长方体表面积、体积公式，或",
    "Summarize the three data values by the requested statistic",
    "按题目指定的统计量处理三个数据",
    "arithmetic-sum formula when needed",
    "需要求和时再用等差数列求和公式",
    "Then substitute or solve the linear equation",
    "再代入或解一元一次方程",
    "Substitute into the regression equation. Residual equals",
    "代入回归方程求预测值；残差等于",
    "Build the sample space first. Probability is favorable outcomes",
    "先建立样本空间，概率等于有利结果数"
  ];

  assert.equal(displayedQuestions.length, 110, "22 PEP high pages should each display exactly five practice questions");
  displayedQuestions.forEach((question) => {
    const explanationText = `${question.explanation.en}\n${question.explanation.zhHans ?? question.explanation.zh}`;
    legacyCrossTaskFeedback.forEach((snippet) => {
      assert.ok(!explanationText.includes(snippet), `${question.id} should not reuse cross-task feedback: ${snippet}`);
    });
    assert.doesNotMatch(
      explanationText,
      /(?:^|[^\d])(\d+\/\d+)=\1(?:[^\d]|$)/u,
      `${question.id} should not repeat a reduced fraction as a reflexive equality`
    );
  });

  const trigFrequency = questionById.get("pep-high-s4-fi-005");
  assert.ok(trigFrequency);
  assert.match(trigFrequency.prompt.en, /\\sin\(3x\)/, "the sine argument should use unambiguous parenthesized notation");
  assert.doesNotMatch(trigFrequency.prompt.en, /y=1\\sin/, "a redundant leading coefficient should not obscure the sine argument");

  const selfIntersection = questionById.get("pep-high-s4-mc-011");
  assert.ok(selfIntersection);
  assert.match(selfIntersection.prompt.en, /B=A/);
  assert.match(selfIntersection.prompt.zhHans ?? selfIntersection.prompt.zh, /A\\cap A=A/);
  assert.match(selfIntersection.explanation.en, /A\\cap A=A/);

  ["pep-high-s4-fi-017", "pep-high-s4-fi-027"].forEach((questionId) => {
    const question = questionById.get(questionId);
    assert.ok(question);
    assert.match(question.prompt.en, /imaginary part/);
    assert.match(question.prompt.zhHans ?? question.prompt.zh, /虚部/);
    assert.doesNotMatch(question.prompt.zhHans ?? question.prompt.zh, /虚部系数/);
  });

  const zeroInterceptPrediction = questionById.get("pep-high-s6-mc-003");
  assert.ok(zeroInterceptPrediction);
  assert.match(zeroInterceptPrediction.prompt.en, /\\hat y=4x/, "zero-intercept regression should keep the standard compact form");
  assert.doesNotMatch(zeroInterceptPrediction.prompt.en, /4x\+0/, "zero-intercept regression should not expose a trailing +0");

  ["pep-high-s6-mc-006", "pep-high-s6-mc-013"].forEach((questionId) => {
    const question = questionById.get(questionId);
    assert.ok(question);
    assert.match(question.prompt.en, /One ball is drawn uniformly at random/);
    assert.match(question.prompt.zhHans ?? question.prompt.zh, /随机摸出一个球/);
  });

  ["pep-high-s6-sa-006", "pep-high-s6-sa-013"].forEach((questionId) => {
    const question = questionById.get(questionId);
    assert.ok(question);
    assert.match(question.prompt.en, /(?:every ball is individually distinguishable|all \d+ balls as distinct)/i);
    assert.match(question.prompt.zhHans ?? question.prompt.zh, /(?:每个球都可区分|把\d+个球都视为不同)/);
  });
});

test("Mainland PEP conic short-answer answer keys match y^2=2px", () => {
  const conicShortAnswerIds = [
    "pep-high-s5-sa-003",
    "pep-high-s5-sa-008",
    "pep-high-s5-sa-013",
    "pep-high-s5-sa-018",
    "pep-high-s5-sa-023",
    "pep-high-s5-sa-028",
    "pep-high-s5-sa-033",
    "pep-high-s5-sa-038",
    "pep-high-s5-sa-043",
    "pep-high-s5-sa-048",
    "pep-high-s5-sa-053",
    "pep-high-s5-sa-058",
    "pep-high-s5-sa-063",
    "pep-high-s5-sa-068",
    "pep-high-s5-sa-073",
    "pep-high-s5-sa-078",
    "pep-high-s5-sa-083",
    "pep-high-s5-sa-088",
    "pep-high-s5-sa-093",
    "pep-high-s5-sa-098",
    "pep-high-s6-sa-005",
    "pep-high-s6-sa-012",
    "pep-high-s6-sa-019",
    "pep-high-s6-sa-026",
    "pep-high-s6-sa-033",
    "pep-high-s6-sa-040",
    "pep-high-s6-sa-047",
    "pep-high-s6-sa-054",
    "pep-high-s6-sa-061",
    "pep-high-s6-sa-068",
    "pep-high-s6-sa-075",
    "pep-high-s6-sa-082",
    "pep-high-s6-sa-089",
    "pep-high-s6-sa-096"
  ];
  const conicShortAnswerIdSet = new Set(conicShortAnswerIds);
  const conicShortAnswers = mainlandPepHighQuestions.filter((question) => conicShortAnswerIdSet.has(question.id));

  assert.equal(conicShortAnswers.length, 34);
  assert.deepEqual(conicShortAnswers.map((question) => question.id), conicShortAnswerIds);

  conicShortAnswers.forEach((question) => {
    assert.equal(question.type, "short-answer");
    assert.ok(
      question.topicId === "pep-high-s5-conics" || question.topicId === "pep-high-s6-analytic-geometry-synthesis",
      `${question.id} should be a conics short-answer question`
    );

    const coefficientMatch = /y\^2=([0-9]+(?:\.[0-9]+)?)x/.exec(question.prompt.en);
    assert.ok(coefficientMatch, `${question.id} is missing a readable y^2=Cx prompt`);

    const coefficient = Number(coefficientMatch[1]);
    const expectedP = coefficient / 2;
    assert.equal(Number(question.answer), expectedP, `${question.id} should store p=${expectedP}`);
  });
});

test("Mainland PEP exp/log short-answer explanations include the coefficient step", () => {
  const expLogShortAnswers = mainlandPepHighQuestions.filter((question) =>
    question.topicId === "pep-high-s4-exp-log" &&
    question.type === "short-answer" &&
    /\\log_/.test(question.prompt.en)
  );

  assert.ok(expLogShortAnswers.length > 0);
  expLogShortAnswers.forEach((question) => {
    const coefficientMatch = /Simplify \\\(([0-9]+)\\log_/.exec(question.prompt.en);
    assert.ok(coefficientMatch, `${question.id} is missing a readable coefficient in the prompt`);
    const coefficient = Number(coefficientMatch[1]);
    const answer = Number(question.answer);

    if (coefficient <= 1) return;
    assert.match(question.explanation.en, /multiplying by the coefficient/, `${question.id} should explain coefficient multiplication`);
    assert.match(question.explanation.zh, /乘以前面的系数/, `${question.id} should explain coefficient multiplication in Chinese`);
    assert.ok(question.explanation.en.includes(`=${answer}`), `${question.id} explanation should reach the stored answer`);
    assert.ok(question.explanation.zh.includes(`=${answer}`), `${question.id} Chinese explanation should reach the stored answer`);
  });
});

test("combined seed question IDs remain unique across HK and Mainland tracks", () => {
  const ids = new Set<string>();
  questions.forEach((question) => {
    assert.ok(!ids.has(question.id), `duplicate combined question id ${question.id}`);
    ids.add(question.id);
  });
});

test("question API defaults to HK and returns publisher-scoped Mainland questions when requested", async () => {
  const defaultS4Questions = await getPublicQuestions({ grade: "S4" });
  assert.ok(defaultS4Questions.length > 0);
  assert.ok(defaultS4Questions.every((question) => question.curriculumTrack === "HK"));

  const mainlandS4Questions = await getPublicQuestions({ grade: "S4", curriculumTrack: "MAINLAND_PEP_HIGH" });
  assert.equal(mainlandS4Questions.length, 1600);
  assert.ok(mainlandS4Questions.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH"));

  const hkEphQuestions = await getPublicQuestions({ grade: "P1", curriculumProfile: hkEphProfile });
  assert.ok(hkEphQuestions.length > 0);
  assert.ok(hkEphQuestions.every((question) => question.region === "HK"));

  const bnuQuestions = await getPublicQuestions({ grade: "S4", curriculumProfile: mainlandBnuProfile });
  assert.equal(bnuQuestions.length, 500);
  assert.ok(bnuQuestions.every((question) => question.publisher === "MAINLAND_BNU" && /^bnu-high-ds-v1-/.test(question.id)));
});

test("authenticated question route cannot be widened to another curriculum by query params", async () => {
  const hkToken = await createSessionToken("student-peter");
  const hkResponse = await getQuestionsRoute(new Request("http://localhost/api/questions?grade=S4&curriculumTrack=MAINLAND_PEP_HIGH&publisher=MAINLAND_PEP", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(hkToken)}` }
  }));
  const hkBody = await hkResponse.json() as { questions?: unknown[] };
  assert.equal(hkResponse.status, 200);
  assert.deepEqual(hkBody.questions, []);

  const usToken = await createSessionToken("student-shirleen-us");
  const usResponse = await getQuestionsRoute(new Request("http://localhost/api/questions?grade=S4&publisher=MAINLAND_PEP", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(usToken)}` }
  }));
  const usBody = await usResponse.json() as { questions?: unknown[] };
  assert.equal(usResponse.status, 200);
  assert.deepEqual(usBody.questions, []);

  const guestResponse = await getQuestionsRoute(new Request("http://localhost/api/questions?grade=S4&publisher=MAINLAND_PEP"));
  const guestBody = await guestResponse.json() as { questions?: unknown[] };
  assert.equal(guestResponse.status, 200);
  assert.deepEqual(guestBody.questions, []);

  const mainlandToken = await createSessionToken("student-li-mainland");
  const mainlandResponse = await getQuestionsRoute(new Request("http://localhost/api/questions?grade=S4&publisher=MAINLAND_PEP", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(mainlandToken)}` }
  }));
  const mainlandBody = await mainlandResponse.json() as { questions?: Array<{ curriculumTrack?: string; publisher?: string }> };
  assert.equal(mainlandResponse.status, 200);
  assert.ok((mainlandBody.questions ?? []).length > 0);
  assert.ok((mainlandBody.questions ?? []).every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_PEP"));

  const bnuStudent = await createStudentUser({
    name: "Mainland BNU API Scope",
    username: `mainland-bnu-api-scope-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S4",
    curriculumProfile: mainlandBnuProfile,
    language: "zh-Hans",
    theme: "dark"
  });
  assert.equal(bnuStudent.status, "created");
  if (bnuStudent.status !== "created") return;

  const bnuToken = await createSessionToken(bnuStudent.session.user.id);
  const bnuSeniorResponse = await getQuestionsRoute(new Request("http://localhost/api/questions?grade=S4&publisher=MAINLAND_BNU", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(bnuToken)}` }
  }));
  const bnuSeniorBody = await bnuSeniorResponse.json() as { questions?: Array<{ id?: string; publisher?: string }> };
  assert.equal(bnuSeniorResponse.status, 200);
  assert.equal((bnuSeniorBody.questions ?? []).length, 500);
  assert.ok((bnuSeniorBody.questions ?? []).every((question) => question.publisher === "MAINLAND_BNU" && /^bnu-high-ds-v1-/.test(question.id ?? "")));

  const bnuJuniorResponse = await getQuestionsRoute(new Request("http://localhost/api/questions?grade=S1&publisher=MAINLAND_BNU", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(bnuToken)}` }
  }));
  const bnuJuniorBody = await bnuJuniorResponse.json() as { questions?: Array<{ id?: string; publisher?: string }> };
  assert.equal(bnuJuniorResponse.status, 200);
  assert.equal((bnuJuniorBody.questions ?? []).length, 500);
  assert.ok((bnuJuniorBody.questions ?? []).every((question) => question.publisher === "MAINLAND_BNU" && /^bnu-junior-ds-v1-/.test(question.id ?? "")));
});

test("US California K-G5 knowledge-point practice is live while North Carolina remains candidate-only", async () => {
  const californiaProfile: CurriculumProfile = { region: "US", publisher: "US_CA_MATH" };
  const northCarolinaProfile: CurriculumProfile = { region: "US", publisher: "US_NC_MATH" };
  const arkansasProfile: CurriculumProfile = { region: "US", publisher: "US_AR_MATH" };
  const floridaProfile: CurriculumProfile = { region: "US", publisher: "US_FL_MATH" };

  const californiaBetaGrades: Extract<GradeId, "K" | "P1" | "P2" | "P3" | "P4" | "P5">[] = ["K", "P1", "P2", "P3", "P4", "P5"];
  // Live US_CA K-G5 practice now draws on two QA-passed live packages: the S18
  // knowledge-point practice pack (us-ca-k5-knowledge-point-practice-v1) and the
  // hand-checked CCSS textbook practice pack (ccss-textbook-practice-v1, packageStatus
  // "live"). The per-grade counts below are the sum of both live packages; update them
  // (and livePracticeIdPattern) whenever either pack's grade coverage changes.
  const expectedCaliforniaPracticeCounts: Record<(typeof californiaBetaGrades)[number], number> = {
    K: 102, // 72 knowledge-point + 30 CCSS textbook
    P1: 237, // 192 knowledge-point + 45 CCSS textbook
    P2: 111, // 48 knowledge-point + 63 CCSS textbook
    P3: 120, // 60 knowledge-point + 60 CCSS textbook
    P4: 138, // 60 knowledge-point + 78 CCSS textbook
    P5: 120 // 60 knowledge-point + 60 CCSS textbook
  };
  const livePracticeIdPattern = /^(?:us-ca-k5-knowledge-point-practice-v1|ccss-textbook-practice-v1)-/;
  for (const grade of californiaBetaGrades) {
    const californiaDashboard = await getDashboardData("student-shirleen-us", grade, californiaProfile);
    assert.equal(californiaDashboard.contentUnavailable, null, `${grade} should be open for US_CA K-G5 knowledge-point practice`);
    assert.ok(californiaDashboard.gradeTopics.length > 0, `${grade} should expose knowledge-point practice topics`);
    assert.ok(californiaDashboard.gradeTopics.every((topic) => topic.curriculumTrack === "US_CA_MATH"));

    const californiaQuestions = await getPublicQuestions({ grade, curriculumProfile: californiaProfile });
    assert.equal(californiaQuestions.length, expectedCaliforniaPracticeCounts[grade], `${grade} should expose the QA-passed live practice count`);
    assert.ok(californiaQuestions.every((question) => question.curriculumTrack === "US_CA_MATH"));
    californiaQuestions.forEach((question) => {
      assert.match(question.id, livePracticeIdPattern, `${question.id} should come from a live California K-G5 practice package`);
      assert.doesNotMatch(question.prompt.en, /DeepSeek|provider|candidate/i, `${question.id} English prompt should not expose provider or candidate labels`);
      assert.doesNotMatch(question.prompt.zh, /DeepSeek|provider|candidate/i, `${question.id} Traditional Chinese prompt should not expose provider or candidate labels`);
      assert.doesNotMatch(question.prompt.zhHans ?? "", /DeepSeek|provider|candidate/i, `${question.id} Simplified Chinese prompt should not expose provider or candidate labels`);
    });

    const californiaDecision = await getAdaptiveLearningDecision({
      userId: "student-shirleen-us",
      grade,
      curriculumTrack: californiaProfile
    });
    assert.ok(californiaDecision, `${grade} should produce an adaptive decision`);
    assert.equal(californiaDecision.topic.curriculumTrack, "US_CA_MATH");
    assert.ok(californiaDecision.questions.length > 0, `${grade} should not recommend an empty question set`);
    assert.ok(
      californiaDecision.questions.every((question) =>
        question.curriculumTrack === "US_CA_MATH" &&
        question.grade === grade &&
        livePracticeIdPattern.test(question.id)
      )
    );
  }

  const californiaOutsideBetaDashboard = await getDashboardData("student-shirleen-us", "S3", californiaProfile);
  assert.ok(californiaOutsideBetaDashboard.contentUnavailable, "US_CA non-K-G5 adaptive content should stay behind the S18/S15 gate");
  const californiaOutsideBetaDecision = await getAdaptiveLearningDecision({
    userId: "student-shirleen-us",
    grade: "S3",
    curriculumTrack: californiaProfile
  });
  assert.equal(californiaOutsideBetaDecision, null);

  const northCarolinaDashboard = await getDashboardData("student-shirleen-us", "S3", northCarolinaProfile);
  assert.ok(northCarolinaDashboard.contentUnavailable, "US_NC should remain candidate-only until S18/S15 promotion");

  const northCarolinaQuestions = await getPublicQuestions({ grade: "S3", curriculumProfile: northCarolinaProfile });
  assert.equal(northCarolinaQuestions.length, 0);

  const northCarolinaDecision = await getAdaptiveLearningDecision({
    userId: "student-shirleen-us",
    grade: "S3",
    curriculumTrack: northCarolinaProfile
  });
  assert.equal(northCarolinaDecision, null);

  const arkansasDashboard = await getDashboardData("student-shirleen-us", "K", arkansasProfile);
  assert.equal(arkansasDashboard.contentUnavailable, null);
  assert.ok(arkansasDashboard.gradeTopics.length > 0);
  assert.ok(arkansasDashboard.gradeTopics.every((topic) => topic.curriculumTrack === "US_AR_MATH"));

  const arkansasKindergartenQuestions = await getPublicQuestions({ grade: "K", curriculumProfile: arkansasProfile });
  assert.equal(arkansasKindergartenQuestions.length, 250);
  assert.ok(arkansasKindergartenQuestions.every((question) => question.curriculumTrack === "US_AR_MATH" && question.publisher === "US_AR_MATH"));

  const arkansasGrade5Questions = await getPublicQuestions({ grade: "P5", curriculumProfile: arkansasProfile });
  assert.equal(arkansasGrade5Questions.length, 250);
  assert.ok(arkansasGrade5Questions.every((question) => question.curriculumTrack === "US_AR_MATH" && question.publisher === "US_AR_MATH"));

  const arkansasGrade6Questions = await getPublicQuestions({ grade: "P6", curriculumProfile: arkansasProfile });
  assert.equal(arkansasGrade6Questions.length, 215);
  assert.ok(arkansasGrade6Questions.every((question) => question.curriculumTrack === "US_AR_MATH" && question.publisher === "US_AR_MATH"));

  const arkansasGrade12Questions = await getPublicQuestions({ grade: "S6", curriculumProfile: arkansasProfile });
  assert.equal(arkansasGrade12Questions.length, 210);
  assert.ok(arkansasGrade12Questions.every((question) => question.curriculumTrack === "US_AR_MATH" && question.publisher === "US_AR_MATH"));

  const arkansasDecision = await getAdaptiveLearningDecision({
    userId: "student-shirleen-us",
    grade: "P6",
    curriculumTrack: arkansasProfile
  });
  assert.ok(arkansasDecision);
  assert.equal(arkansasDecision.topic.curriculumTrack, "US_AR_MATH");
  assert.ok(arkansasDecision.questions.length > 0);

  const floridaDashboard = await getDashboardData("student-shirleen-us", "P6", floridaProfile);
  assert.equal(floridaDashboard.contentUnavailable, null);
  assert.equal(floridaDashboard.gradeTopics.length, 5);
  assert.ok(floridaDashboard.gradeTopics.every((topic) => topic.curriculumTrack === "US_FL_MATH" && topic.publisher === "US_FL_MATH"));

  const floridaGrade6Questions = await getPublicQuestions({ grade: "P6", curriculumProfile: floridaProfile });
  assert.equal(floridaGrade6Questions.length, 25);
  assert.ok(floridaGrade6Questions.every((question) => question.curriculumTrack === "US_FL_MATH" && question.publisher === "US_FL_MATH"));

  const floridaDecision = await getAdaptiveLearningDecision({
    userId: "student-shirleen-us",
    grade: "P6",
    curriculumTrack: floridaProfile
  });
  assert.ok(floridaDecision);
  assert.equal(floridaDecision.topic.curriculumTrack, "US_FL_MATH");
  assert.ok(floridaDecision.questions.length > 0);

  const invalidFloridaStudent = await createStudentUser({
    name: "Florida Invalid Grade",
    username: `florida-invalid-grade-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S4",
    curriculumProfile: floridaProfile,
    language: "en",
    theme: "light"
  });
  assert.equal(invalidFloridaStudent.status, "invalid");

  const floridaStudent = await createStudentUser({
    name: "Florida Grade 6",
    username: `florida-grade-6-${Date.now()}@example.test`,
    password: "start12345",
    grade: "P6",
    curriculumProfile: floridaProfile,
    language: "en",
    theme: "light"
  });
  assert.equal(floridaStudent.status, "created");
  if (floridaStudent.status === "created") {
    const entryTarget = await getLessonEntryTarget(floridaStudent.session.user.id, "P6", floridaStudent.session.user.curriculumProfile);
    assert.ok(entryTarget, "Florida P6 should resolve a lesson entry target");
    assert.match(entryTarget?.slug ?? "", /^us-fl-math-p6-chapter-/);
    const lesson = entryTarget ? await getLessonBySlug(floridaStudent.session.user.id, entryTarget.slug, floridaStudent.session.user.curriculumProfile) : null;
    assert.equal(lesson?.publisher, "US_FL_MATH");
    assert.equal(lesson?.topic.curriculumTrack, "US_FL_MATH");
  }

  const usToken = await createSessionToken("student-shirleen-us");
  const response = await getAdaptiveNextRoute(new Request("http://localhost/api/adaptive-learning/next?grade=P1", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(usToken)}` }
  }));
  const body = await response.json() as {
    decision?: { topic?: { curriculumTrack?: string }; questions?: unknown[] };
    reason?: string;
  };
  assert.equal(response.status, 200);
  assert.equal(body.reason, undefined);
  assert.equal(body.decision?.topic?.curriculumTrack, "US_CA_MATH");
  assert.ok((body.decision?.questions ?? []).length > 0);

  const heldCaliforniaResponse = await getAdaptiveNextRoute(new Request("http://localhost/api/adaptive-learning/next?grade=S3", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(usToken)}` }
  }));
  const heldCaliforniaBody = await heldCaliforniaResponse.json() as {
    reason?: string;
    contentUnavailable?: { en?: string };
  };
  assert.equal(heldCaliforniaResponse.status, 404);
  assert.equal(heldCaliforniaBody.reason, "content-unavailable");
  assert.match(heldCaliforniaBody.contentUnavailable?.en ?? "", /California adaptive practice is preparing/);

  const northCarolinaStudent = await createStudentUser({
    name: "North Carolina Candidate",
    username: `north-carolina-candidate-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S3",
    curriculumProfile: northCarolinaProfile,
    language: "en",
    theme: "light"
  });
  assert.equal(northCarolinaStudent.status, "created");
  if (northCarolinaStudent.status === "created") {
    const northCarolinaToken = await createSessionToken(northCarolinaStudent.session.user.id);
    const northCarolinaResponse = await getAdaptiveNextRoute(new Request("http://localhost/api/adaptive-learning/next?grade=S3", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(northCarolinaToken)}` }
    }));
    const northCarolinaBody = await northCarolinaResponse.json() as {
      reason?: string;
      contentUnavailable?: { en?: string };
    };
    assert.equal(northCarolinaResponse.status, 404);
    assert.equal(northCarolinaBody.reason, "content-unavailable");
    assert.match(northCarolinaBody.contentUnavailable?.en ?? "", /North Carolina adaptive practice is a candidate content pack/);
  }

  const hkDashboard = await getDashboardData("student-peter", "S3", "HK");
  assert.equal(hkDashboard.contentUnavailable, null);
  assert.ok(hkDashboard.gradeTopics.length > 0);
  const hkDecision = await getAdaptiveLearningDecision({ userId: "student-peter", grade: "S3", curriculumTrack: "HK" });
  assert.ok(hkDecision);

  const mainlandDashboard = await getDashboardData("student-li-mainland", "S4", mainlandPepProfile);
  assert.equal(mainlandDashboard.contentUnavailable, null);
  assert.ok(mainlandDashboard.gradeTopics.length > 0);
  const mainlandDecision = await getAdaptiveLearningDecision({
    userId: "student-li-mainland",
    grade: "S4",
    curriculumTrack: mainlandPepProfile
  });
  assert.ok(mainlandDecision);
});

test("student accounts require and persist curriculum profile", async () => {
  const missingTrack = await createStudentUser({
    name: "Missing Track",
    username: `missing-track-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S4"
  } as Parameters<typeof createStudentUser>[0]);
  assert.equal(missingTrack.status, "invalid");

  const result = await createStudentUser({
    name: "Mainland Track",
    username: `mainland-track-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S4",
    curriculumProfile: mainlandPepProfile,
    language: "zh-Hans",
    theme: "dark"
  });

  assert.equal(result.status, "created");
  if (result.status !== "created") return;
  assert.equal(result.session.user.curriculumTrack, "MAINLAND_PEP_HIGH");
  assert.deepEqual(result.session.user.curriculumProfile, mainlandPepProfile);
  assert.equal(result.session.settings.selectedGrade, "S4");
});

test("learning APIs stay scoped to the signed-in curriculum track", async () => {
  const hk = await createStudentUser({
    name: "HK Scope",
    username: `hk-scope-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S4",
    curriculumTrack: "HK",
    language: "en",
    theme: "dark"
  });
  const mainland = await createStudentUser({
    name: "Mainland Scope",
    username: `mainland-scope-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S4",
    curriculumProfile: mainlandPepProfile,
    language: "zh-Hans",
    theme: "dark"
  });
  assert.equal(hk.status, "created");
  assert.equal(mainland.status, "created");
  if (hk.status !== "created" || mainland.status !== "created") return;

  const hkDashboard = await getDashboardData(hk.session.user.id, "S4", "HK");
  assert.ok(hkDashboard.gradeTopics.length > 0);
  assert.ok(hkDashboard.gradeTopics.every((topic) => topic.curriculumTrack === "HK"));

  const mainlandDashboard = await getDashboardData(mainland.session.user.id, "S4", mainland.session.user.curriculumProfile);
  assert.ok(mainlandDashboard.gradeTopics.length > 0);
  assert.ok(mainlandDashboard.gradeTopics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH"));

  const mainlandRoadmap = await getRoadmapData(mainland.session.user.id, "S4", mainland.session.user.curriculumProfile);
  assert.deepEqual(mainlandRoadmap.curriculumProfile, mainlandPepProfile);
  assert.ok(mainlandRoadmap.topics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH"));

  const mainlandProgress = await getProgressData(mainland.session.user.id, "S4", "7d", mainland.session.user.curriculumProfile);
  assert.equal(mainlandProgress.curriculumTrack, "MAINLAND_PEP_HIGH");

  const mainlandDecision = await getAdaptiveLearningDecision({
    userId: mainland.session.user.id,
    grade: "S4",
    curriculumTrack: mainland.session.user.curriculumProfile
  });
  assert.equal(mainlandDecision?.topic.curriculumTrack, "MAINLAND_PEP_HIGH");
});

test("HK EPH profile uses HK baseline while BNU junior and senior are live", async () => {
  const hkEph = await createStudentUser({
    name: "HK EPH",
    username: `hk-eph-${Date.now()}@example.test`,
    password: "start12345",
    grade: "P1",
    curriculumProfile: hkEphProfile,
    language: "zh",
    theme: "dark"
  });
  const mainlandBnu = await createStudentUser({
    name: "Mainland BNU",
    username: `mainland-bnu-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S4",
    curriculumProfile: mainlandBnuProfile,
    language: "zh-Hans",
    theme: "dark"
  });
  assert.equal(hkEph.status, "created");
  assert.equal(mainlandBnu.status, "created");
  if (hkEph.status !== "created" || mainlandBnu.status !== "created") return;

  const ephRoadmap = await getRoadmapData(hkEph.session.user.id, "P1", hkEph.session.user.curriculumProfile);
  assert.deepEqual(ephRoadmap.curriculumProfile, hkEphProfile);
  assert.ok(ephRoadmap.topics.length > 0);
  assert.ok(ephRoadmap.topics.every((topic) => topic.region === "HK"));

  const bnuRoadmap = await getRoadmapData(mainlandBnu.session.user.id, "S4", mainlandBnu.session.user.curriculumProfile);
  assert.deepEqual(bnuRoadmap.curriculumProfile, mainlandBnuProfile);
  assert.equal(bnuRoadmap.contentUnavailable, null);
  assert.equal(bnuRoadmap.topics.length, 14);
  assert.ok(bnuRoadmap.topics.every((topic) => topic.publisher === "MAINLAND_BNU"));

  const bnuQuestions = await getPublicQuestions({ grade: "S4", curriculumProfile: mainlandBnu.session.user.curriculumProfile });
  assert.equal(bnuQuestions.length, 500);
  assert.ok(bnuQuestions.every((question) => question.publisher === "MAINLAND_BNU" && /^bnu-high-ds-v1-/.test(question.id)));

  const bnuJuniorRoadmap = await getRoadmapData(mainlandBnu.session.user.id, "S1", mainlandBnu.session.user.curriculumProfile);
  assert.equal(bnuJuniorRoadmap.contentUnavailable, null);
  assert.equal(bnuJuniorRoadmap.topics.length, 12);
  assert.ok(bnuJuniorRoadmap.topics.every((topic) => topic.publisher === "MAINLAND_BNU"));

  const bnuJuniorQuestions = await getPublicQuestions({ grade: "S1", curriculumProfile: mainlandBnu.session.user.curriculumProfile });
  assert.equal(bnuJuniorQuestions.length, 500);
  assert.ok(bnuJuniorQuestions.every((question) => question.publisher === "MAINLAND_BNU" && /^bnu-junior-ds-v1-/.test(question.id)));
});

test("Mainland junior grades use Mainland PEP content and do not fall back to HK", async () => {
  const result = await createStudentUser({
    name: "Mainland Junior",
    username: `mainland-junior-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S1",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    language: "zh-Hans",
    theme: "dark"
  });
  assert.equal(result.status, "created");
  if (result.status !== "created") return;

  const dashboard = await getDashboardData(result.session.user.id, "S1", "MAINLAND_PEP_HIGH");
  assert.equal(dashboard.contentUnavailable, null);
  assert.equal(dashboard.gradeTopics.length, 5);
  assert.ok(dashboard.gradeTopics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH"));

  const roadmap = await getRoadmapData(result.session.user.id, "S1", "MAINLAND_PEP_HIGH");
  assert.equal(roadmap.contentUnavailable, null);
  assert.equal(roadmap.topics.length, 5);
  assert.ok(roadmap.topics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH"));

  const mainlandJuniorQuestions = await getPublicQuestions({ grade: "S1", curriculumTrack: "MAINLAND_PEP_HIGH" });
  assert.equal(
    mainlandJuniorQuestions.length,
    questions.filter((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_PEP" && question.grade === "S1").length
  );
  assert.ok(mainlandJuniorQuestions.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_PEP"));

  const decision = await getAdaptiveLearningDecision({
    userId: result.session.user.id,
    grade: "S1",
    curriculumTrack: "MAINLAND_PEP_HIGH"
  });
  assert.equal(decision?.topic.curriculumTrack, "MAINLAND_PEP_HIGH");
});

test("Mainland PEP P1-S6 student surfaces expose only Mainland PEP lessons, questions, and adaptive choices", async () => {
  const gradesToCheck: GradeId[] = ["P1", "P6", "S1", "S3", "S4", "S6"];

  for (const grade of gradesToCheck) {
    const result = await createStudentUser({
      name: `Mainland ${grade} Scope`,
      username: `mainland-${grade.toLowerCase()}-scope-${Date.now()}@example.test`,
      password: "start12345",
      grade,
      curriculumProfile: mainlandPepProfile,
      language: "zh-Hans",
      theme: "dark"
    });
    assert.equal(result.status, "created");
    if (result.status !== "created") continue;

    const roadmap = await getRoadmapData(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.equal(roadmap.contentUnavailable, null);
    assert.ok(roadmap.topics.length > 0, `${grade} should have Mainland PEP topics`);
    assert.ok(roadmap.topics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.publisher === "MAINLAND_PEP"));

    const questionsForGrade = await getPublicQuestions({ grade, curriculumProfile: result.session.user.curriculumProfile });
    assert.ok(questionsForGrade.length > 0, `${grade} should have Mainland PEP questions`);
    assert.ok(questionsForGrade.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_PEP"));

    const entryTarget = await getLessonEntryTarget(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.ok(entryTarget, `${grade} should resolve a Mainland PEP lesson entry`);
    const lesson = entryTarget ? await getLessonBySlug(result.session.user.id, entryTarget.slug, result.session.user.curriculumProfile) : null;
    assert.ok(lesson, `${grade} should load the scoped Mainland PEP lesson`);
    assert.equal(lesson?.publisher, "MAINLAND_PEP");
    assert.equal(lesson?.topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.ok(lesson?.practiceQuestions.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH"));

    const decision = await getAdaptiveLearningDecision({
      userId: result.session.user.id,
      grade,
      curriculumTrack: result.session.user.curriculumProfile
    });
    assert.equal(decision?.topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.ok(decision?.questions.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH"));
  }
});

test("Mainland HJB S4-S6 lesson surfaces expose approved HJB topics and 8-question checkpoints", async () => {
  const hjbQuestionIds = new Set(mainlandHjbHighQuestions.map((question) => question.id));

  for (const grade of seniorGrades) {
    const result = await createStudentUser({
      name: `Mainland HJB ${grade} Scope`,
      username: `mainland-hjb-${grade.toLowerCase()}-scope-${Date.now()}@example.test`,
      password: "start12345",
      grade,
      curriculumProfile: mainlandHjbProfile,
      language: "zh-Hans",
      theme: "dark"
    });
    assert.equal(result.status, "created");
    if (result.status !== "created") continue;

    const roadmap = await getRoadmapData(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.equal(roadmap.contentUnavailable, null);
    assert.equal(roadmap.topics.length, grade === "S4" ? 9 : grade === "S5" ? 8 : 13);
    assert.ok(roadmap.topics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.publisher === "MAINLAND_HJB"));

    const questionsForGrade = await getPublicQuestions({ grade, curriculumProfile: result.session.user.curriculumProfile });
    assert.equal(questionsForGrade.length, 500);
    assert.ok(questionsForGrade.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_HJB"));
    assert.ok(questionsForGrade.every((question) => /^hjb-high-ds-v2-/.test(question.id)));
    assert.deepEqual(
      Object.fromEntries(["v1", "v2", "v3", "v4"].map((version) => [version, questionsForGrade.filter((question) => new RegExp(`^hjb-high-ds-${version}-`).test(question.id)).length])),
      { v1: 0, v2: 500, v3: 0, v4: 0 }
    );

    const entryTarget = await getLessonEntryTarget(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.ok(entryTarget, `${grade} should resolve a Mainland HJB lesson entry`);
    assert.match(entryTarget?.slug ?? "", /^hjb-high-/);
    const lesson = entryTarget ? await getLessonBySlug(result.session.user.id, entryTarget.slug, result.session.user.curriculumProfile) : null;
    assert.ok(lesson, `${grade} should load the scoped Mainland HJB lesson`);
    assert.equal(lesson?.publisher, "MAINLAND_HJB");
    assert.equal(lesson?.topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(lesson?.topic.publisher, "MAINLAND_HJB");
    assert.equal(lesson?.practiceQuestions.length, 8);
    assert.ok(lesson?.practiceQuestions.every((question) => question.publisher === "MAINLAND_HJB" && hjbQuestionIds.has(question.id) && /^hjb-high-ds-v2-/.test(question.id)));
    assert.ok(lesson?.blocks.some((block) => block.type === "teacher-guide"));

    const teacherView = entryTarget ? await getLessonBySlug(null, entryTarget.slug, mainlandHjbProfile) : null;
    assert.equal(teacherView?.publisher, "MAINLAND_HJB");
    assert.equal(teacherView?.practiceQuestions.length, 8);
    assert.ok(teacherView?.practiceQuestions.every((question) => question.publisher === "MAINLAND_HJB" && /^hjb-high-ds-v2-/.test(question.id)));
    assert.ok(teacherView?.blocks.some((block) => block.type === "teacher-guide"));
  }

  const pepS4Questions = await getPublicQuestions({ grade: "S4", curriculumProfile: mainlandPepProfile });
  assert.equal(pepS4Questions.some((question) => hjbQuestionIds.has(question.id)), false);
  assert.ok(pepS4Questions.every((question) => question.publisher === "MAINLAND_PEP"));
});

test("Mainland HJB S1-S3 lesson and practice surfaces expose only HJB junior V2 content", async () => {
  const hjbJuniorQuestionIds = new Set(mainlandHjbJuniorQuestions.map((question) => question.id));
  const expectedTopicCounts: Record<(typeof juniorGrades)[number], number> = { S1: 9, S2: 8, S3: 5 };
  assert.equal(mainlandHjbJuniorTopics.length, 22);

  for (const grade of juniorGrades) {
    const result = await createStudentUser({
      name: `Mainland HJB ${grade} Junior Scope`,
      username: `mainland-hjb-${grade.toLowerCase()}-junior-scope-${Date.now()}@example.test`,
      password: "start12345",
      grade,
      curriculumProfile: mainlandHjbProfile,
      language: "zh-Hans",
      theme: "dark"
    });
    assert.equal(result.status, "created");
    if (result.status !== "created") continue;

    const roadmap = await getRoadmapData(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.equal(roadmap.contentUnavailable, null);
    assert.equal(roadmap.topics.length, expectedTopicCounts[grade]);
    assert.ok(roadmap.topics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.publisher === "MAINLAND_HJB"));

    const questionsForGrade = await getPublicQuestions({ grade, curriculumProfile: result.session.user.curriculumProfile });
    assert.equal(questionsForGrade.length, 500);
    assert.ok(questionsForGrade.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_HJB"));
    assert.ok(questionsForGrade.every((question) => /^hjb-junior-ds-v2-/.test(question.id)));

    const entryTarget = await getLessonEntryTarget(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.ok(entryTarget, `${grade} should resolve a Mainland HJB junior lesson entry`);
    assert.match(entryTarget?.slug ?? "", /^hjb-junior-/);
    const lesson = entryTarget ? await getLessonBySlug(result.session.user.id, entryTarget.slug, result.session.user.curriculumProfile) : null;
    assert.ok(lesson, `${grade} should load the scoped Mainland HJB junior lesson`);
    assert.equal(lesson?.publisher, "MAINLAND_HJB");
    assert.equal(lesson?.topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(lesson?.topic.publisher, "MAINLAND_HJB");
    assert.equal(lesson?.practiceQuestions.length, 8);
    assert.ok(lesson?.practiceQuestions.every((question) => question.publisher === "MAINLAND_HJB" && hjbJuniorQuestionIds.has(question.id) && /^hjb-junior-ds-v2-/.test(question.id)));
    assert.ok(lesson?.blocks.some((block) => block.type === "teacher-guide"));

    const teacherView = entryTarget ? await getLessonBySlug(null, entryTarget.slug, mainlandHjbProfile) : null;
    assert.equal(teacherView?.publisher, "MAINLAND_HJB");
    assert.equal(teacherView?.practiceQuestions.length, 8);
    assert.ok(teacherView?.practiceQuestions.every((question) => question.publisher === "MAINLAND_HJB" && /^hjb-junior-ds-v2-/.test(question.id)));
    assert.ok(teacherView?.blocks.some((block) => block.type === "teacher-guide"));
  }

  const pepS1Questions = await getPublicQuestions({ grade: "S1", curriculumProfile: mainlandPepProfile });
  assert.equal(pepS1Questions.some((question) => question.publisher === "MAINLAND_HJB"), false);
  assert.ok(pepS1Questions.every((question) => question.publisher === "MAINLAND_PEP"));
});

test("Mainland HJB P1-P6 lesson and practice surfaces expose only HJB primary V1 content", async () => {
  const hjbPrimaryQuestionIds = new Set(mainlandHjbPrimaryQuestions.map((question) => question.id));
  const expectedTopicCounts: Record<(typeof primaryGrades)[number], number> = { P1: 13, P2: 11, P3: 13, P4: 11, P5: 8, P6: 14 };

  for (const grade of primaryGrades) {
    const result = await createStudentUser({
      name: `Mainland HJB ${grade} Primary Scope`,
      username: `mainland-hjb-${grade.toLowerCase()}-primary-scope-${Date.now()}@example.test`,
      password: "start12345",
      grade,
      curriculumProfile: mainlandHjbProfile,
      language: "zh-Hans",
      theme: "dark"
    });
    assert.equal(result.status, "created");
    if (result.status !== "created") continue;

    const roadmap = await getRoadmapData(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.equal(roadmap.contentUnavailable, null);
    assert.equal(roadmap.topics.length, expectedTopicCounts[grade]);
    assert.ok(roadmap.topics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.publisher === "MAINLAND_HJB"));

    const questionsForGrade = await getPublicQuestions({ grade, curriculumProfile: result.session.user.curriculumProfile });
    assert.equal(questionsForGrade.length, 250);
    assert.ok(questionsForGrade.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_HJB"));
    assert.ok(questionsForGrade.every((question) => /^hjb-primary-ds-v1-/.test(question.id)));
    assert.equal(questionsForGrade.some((question) => /^hjb-high-ds-v1-/.test(question.id)), false);

    const entryTarget = await getLessonEntryTarget(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.ok(entryTarget, `${grade} should resolve a Mainland HJB primary lesson entry`);
    assert.match(entryTarget?.slug ?? "", /^hjb-primary-/);
    const lesson = entryTarget ? await getLessonBySlug(result.session.user.id, entryTarget.slug, result.session.user.curriculumProfile) : null;
    assert.ok(lesson, `${grade} should load the scoped Mainland HJB primary lesson`);
    assert.equal(lesson?.publisher, "MAINLAND_HJB");
    assert.equal(lesson?.topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(lesson?.topic.publisher, "MAINLAND_HJB");
    assert.equal(lesson?.practiceQuestions.length, 8);
    assert.ok(lesson?.practiceQuestions.every((question) => question.publisher === "MAINLAND_HJB" && hjbPrimaryQuestionIds.has(question.id) && /^hjb-primary-ds-v1-/.test(question.id)));
    assert.ok(lesson?.blocks.some((block) => block.type === "teacher-guide"));
  }

  const pepP1Questions = await getPublicQuestions({ grade: "P1", curriculumProfile: mainlandPepProfile });
  assert.equal(pepP1Questions.some((question) => hjbPrimaryQuestionIds.has(question.id)), false);
  assert.ok(pepP1Questions.every((question) => question.publisher === "MAINLAND_PEP"));
});

test("teacher-facing data is scoped by the teacher curriculum profile", async () => {
  const hkTeacher = await authenticateUser("HK Teacher Chan", "12345");
  const mainlandTeacher = await authenticateUser("Teacher Phoebe", "12345");
  assert.ok(hkTeacher);
  assert.ok(mainlandTeacher);
  if (!hkTeacher || !mainlandTeacher) return;

  const mainlandTopicIds = new Set(topics.filter((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH").map((topic) => topic.id));
  const questionById = new Map(questions.map((question) => [question.id, question]));

  const hkDashboard = await getTeacherDashboardData(hkTeacher.user.id);
  assert.ok(hkDashboard);
  assert.ok(hkDashboard?.masteryHeatmap.every((cell) => !mainlandTopicIds.has(cell.topicId)));

  const mainlandDashboard = await getTeacherDashboardData(mainlandTeacher.user.id);
  assert.ok(mainlandDashboard);
  assert.ok((mainlandDashboard?.masteryHeatmap.length ?? 0) > 0);
  assert.ok(mainlandDashboard?.masteryHeatmap.every((cell) => mainlandTopicIds.has(cell.topicId)));

  const hkAssessmentData = await getTeacherAssessmentCreateData(hkTeacher.user.id);
  assert.ok(hkAssessmentData);
  assert.ok(hkAssessmentData?.questionBank.every((question) => questionById.get(question.id)?.curriculumTrack !== "MAINLAND_PEP_HIGH"));

  const mainlandAssessmentData = await getTeacherAssessmentCreateData(mainlandTeacher.user.id);
  assert.ok(mainlandAssessmentData);
  assert.ok((mainlandAssessmentData?.questionBank.length ?? 0) > 0);
  assert.ok(mainlandAssessmentData?.questionBank.every((question) => questionById.get(question.id)?.curriculumTrack === "MAINLAND_PEP_HIGH"));

  const hkResourceData = await getTeacherResourceLibraryData(hkTeacher.user.id);
  assert.ok(hkResourceData);
  assert.ok(hkResourceData?.topicOptions.every((topic) => !mainlandTopicIds.has(topic.id)));

  const mainlandResourceData = await getTeacherResourceLibraryData(mainlandTeacher.user.id);
  assert.ok(mainlandResourceData);
  assert.ok((mainlandResourceData?.topicOptions.length ?? 0) > 0);
  assert.ok(mainlandResourceData?.topicOptions.every((topic) => mainlandTopicIds.has(topic.id)));
});

test("class enrollment rejects cross-curriculum teacher/student pairing", async () => {
  const addResult = await addStudentToTeacherClass({
    teacherId: "teacher-ms-chan",
    classId: "class-s3a-2026",
    username: "Student Peter"
  });
  assert.equal(addResult.status, "curriculum-mismatch");

  const joinResult = await joinClassByInviteCode({
    studentId: "student-li-mainland",
    inviteCode: "S3A-MAIS"
  });
  assert.equal(joinResult.status, "curriculum-mismatch");
});

test("AI Tutor database context ignores spoofed Mainland question and topic ids for HK users", async () => {
  const mainlandQuestion = questions.find((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.grade === "S4");
  assert.ok(mainlandQuestion);
  if (!mainlandQuestion) return;

  const hkContext = await buildAITutorDatabaseContext("student-peter", {
    grade: "S4",
    language: "en",
    questionId: mainlandQuestion.id,
    topicId: mainlandQuestion.topicId
  });
  assert.match(hkContext.text, /Curriculum track: HK/);
  assert.doesNotMatch(hkContext.text, /MAINLAND_PEP_HIGH/);
  assert.ok(!hkContext.text.includes(mainlandQuestion.prompt.en));

  const mainlandContext = await buildAITutorDatabaseContext("student-li-mainland", {
    grade: "S4",
    language: "zh-Hans",
    questionId: mainlandQuestion.id,
    topicId: mainlandQuestion.topicId
  });
  assert.match(mainlandContext.text, /Curriculum track: MAINLAND_PEP_HIGH/);
  assert.ok(mainlandContext.text.includes(mainlandQuestion.prompt.en));
});

test("tracked attempts reject questions outside the learner curriculum track", async () => {
  const result = await createStudentUser({
    name: "Attempt Scope",
    username: `attempt-scope-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S4",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    language: "zh-Hans",
    theme: "dark"
  });
  assert.equal(result.status, "created");
  if (result.status !== "created") return;

  const hkQuestion = questions.find((question) => question.curriculumTrack === "HK" && question.grade === "S4");
  const mainlandQuestion = questions.find((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.grade === "S4");
  assert.ok(hkQuestion);
  assert.ok(mainlandQuestion);

  const rejected = await submitQuestionAttempt({
    userId: result.session.user.id,
    questionId: hkQuestion.id,
    selectedAnswer: "A",
    curriculumTrack: result.session.user.curriculumProfile
  });
  assert.equal(rejected, null);

  const accepted = await submitQuestionAttempt({
    userId: result.session.user.id,
    questionId: mainlandQuestion.id,
    selectedAnswer: mainlandQuestion.answer,
    curriculumTrack: result.session.user.curriculumProfile
  });
  assert.equal(accepted?.correct, true);
});

test("Mainland PEP generated questions do not contain source-copying artifacts", () => {
  const joined = (...parts: string[]) => parts.join("");
  const forbiddenPatterns = [
    joined("高考", "真题"),
    joined("解析", "卷"),
    joined("空白", "卷"),
    joined("官方", "解析"),
    joined("答案", "原句"),
    joined("教", "材", "原", "文"),
    /第[0-9０-９]+页/,
    /page [0-9]+/i,
    /p\.[0-9]+/i,
    /\bMAIS\b/u,
    /\bRAG-v\d\b/iu,
    /safe evidence cards?/iu,
    /原创(?:诊断|计算|建模|推理|复习|综合)?练习/u
  ];
  const serialized = JSON.stringify(mainlandPepHighAllGeneratedQuestions);

  forbiddenPatterns.forEach((pattern) => {
    if (typeof pattern === "string") {
      assert.equal(serialized.includes(pattern), false, `Generated questions contain forbidden text: ${pattern}`);
    } else {
      assert.equal(pattern.test(serialized), false, `Generated questions match forbidden pattern: ${pattern}`);
    }
  });
});

test("Mainland PEP rag-v2 generated questions avoid exact prompt duplication", () => {
  const seenPrompts = new Set<string>();
  mainlandPepHighRagV2Questions.forEach((question) => {
    const normalized = `${question.grade}:${question.type}:${question.prompt.zh}`.replace(/\s+/g, "");
    assert.ok(!seenPrompts.has(normalized), `${question.id} duplicates a rag-v2 prompt`);
    seenPrompts.add(normalized);
  });
});

test("Mainland PEP rag-v3 generated questions avoid exact prompt duplication and reach answers", () => {
  const seenPrompts = new Set<string>();
  const canonicalClusters = new Map<string, number>();

  mainlandPepHighRagV3Questions.forEach((question) => {
    const normalized = `${question.grade}:${question.type}:${question.prompt.zh}`.replace(/\s+/g, "");
    assert.ok(!seenPrompts.has(normalized), `${question.id} duplicates a rag-v3 prompt`);
    seenPrompts.add(normalized);

    const canonical = question.prompt.zh
      .replace(/^(概念辨析|参数讨论|条件核对|表示关联|建模情境|误区诊断|综合拆步)(?:选择题|填空题|解答题)练习\s+[0-9]+：/g, "")
      .replace(/\\\([^)]*\\\)/g, "\\(math\\)")
      .replace(/[0-9]+(?:\.[0-9]+)?/g, "#")
      .replace(/\s+/g, "");
    canonicalClusters.set(canonical, (canonicalClusters.get(canonical) ?? 0) + 1);

    const metadata = mainlandPepHighQuestionGenerationMetadata[question.id];
    assert.ok(metadata, `${question.id} is missing rag-v3 metadata`);
    assert.equal(metadata.batch, "rag-v3");
    assert.ok(metadata.evidenceCardIds.length > 0, `${question.id} should have RAG evidence`);

    if (question.type !== "multiple-choice") {
      const normalizedAnswer = question.answer.toLowerCase().replace(/\s+/g, "");
      const normalizedExplanation = `${question.explanation.en} ${question.explanation.zh}`.toLowerCase().replace(/\s+/g, "");
      assert.ok(
        normalizedExplanation.includes(normalizedAnswer),
        `${question.id} explanation should explicitly reach answer ${question.answer}`
      );
    }
  });

  const largestNearTemplateCluster = Math.max(...canonicalClusters.values());
  assert.ok(
    largestNearTemplateCluster <= 50,
    `rag-v3 near-template cluster is too large: ${largestNearTemplateCluster}`
  );
});

test("Mainland PEP rag-v4 promoted questions avoid exact prompt duplication and reach answers", () => {
  const seenPrompts = new Set<string>();
  const canonicalClusters = new Map<string, number>();

  mainlandPepHighRagV4Questions.forEach((question) => {
    const normalized = `${question.grade}:${question.type}:${question.prompt.zh}`.replace(/\s+/g, "");
    assert.ok(!seenPrompts.has(normalized), `${question.id} duplicates a rag-v4 public prompt`);
    seenPrompts.add(normalized);

    const canonical = question.prompt.zh
      .replace(/RAG-v4 候选题\s+[0-9]+（[^）]+）：(安全抽象|题型结构|误区修正|多步推理|表征转换|建模迁移|运算复核)(选择题|填空题|解答题)任务。/g, "")
      .replace(/\\\([^)]*\\\)/g, "\\(math\\)")
      .replace(/[0-9]+(?:\.[0-9]+)?/g, "#")
      .replace(/\s+/g, "");
    canonicalClusters.set(canonical, (canonicalClusters.get(canonical) ?? 0) + 1);

    const metadata = mainlandPepHighRagV4QuestionGenerationMetadata[question.id];
    assert.ok(metadata, `${question.id} is missing rag-v4 metadata`);
    assert.equal(metadata.batch, "rag-v4");
    assert.ok(metadata.evidenceCardIds.length > 0, `${question.id} should have RAG evidence`);
    const publicMetadata = mainlandPepHighQuestionGenerationMetadata[question.id];
    assert.ok(publicMetadata, `${question.id} should be in public metadata after promotion`);
    assert.equal(publicMetadata.batch, "rag-v4");

    if (question.type !== "multiple-choice") {
      const normalizedAnswer = question.answer.toLowerCase().replace(/\s+/g, "");
      const normalizedExplanation = `${question.explanation.en} ${question.explanation.zh}`.toLowerCase().replace(/\s+/g, "");
      assert.ok(
        normalizedExplanation.includes(normalizedAnswer),
        `${question.id} explanation should explicitly reach answer ${question.answer}`
      );
    }
  });

  const largestNearTemplateCluster = Math.max(...canonicalClusters.values());
  assert.ok(
    largestNearTemplateCluster <= 100,
    `rag-v4 public near-template cluster is too large: ${largestNearTemplateCluster}`
  );
});
