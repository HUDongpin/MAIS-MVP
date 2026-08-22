import assert from "node:assert/strict";
import test from "node:test";
import v1QuestionPackJson from "../data/generated-content/mainland-bnu-primary-generated-bank-v1-1500/question-pack.json";
import v2QuestionPackJson from "../data/generated-content/mainland-bnu-primary-generated-bank-v2-1500/question-pack.json";
import v1CoordinationQuestionPackJson from "../coordination/content-qa/mainland-bnu-primary-generated-bank-v1-1500/question-pack.json";
import chinaPromptUnitContractsJson from "../data/chinaPromptUnitContracts.json";
import {
  independentMainlandBnuPrimaryAnswer,
  mainlandBnuPrimaryQuestionGenerationMetadata,
  mainlandBnuPrimaryQuestions,
  mainlandBnuPrimaryV1Questions,
  mainlandBnuPrimaryV2Questions
} from "../data/mainlandBnuPrimaryQuestions";
import { mainlandBnuPrimaryLessonSeeds } from "../data/mainlandBnuPrimaryLessons";
import { mainlandBnuPrimaryTopicMetadata, mainlandBnuPrimaryTopics } from "../data/mainlandBnuPrimaryTopics";
import { questions } from "../data/questions";
import { mainlandBnuPrimaryRagCards } from "../data/rag/mainlandBnuPrimary";
import { mainlandBnuPrimaryAssessmentPatternCards } from "../data/rag/mainlandBnuPrimaryAssessmentPatterns";
import { GET as getQuestionsRoute } from "../app/api/questions/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "./session";
import { questionAnswerMatches } from "./server/answerMatching";
import {
  createStudentUser,
  getLessonBySlug,
  getLessonEntryTarget,
  getPublicQuestions,
  getRoadmapData
} from "./server/userStore";
import type { CurriculumProfile, GradeId, QuestionType } from "@/types";

const primaryGrades: Extract<GradeId, "P1" | "P2" | "P3" | "P4" | "P5" | "P6">[] = ["P1", "P2", "P3", "P4", "P5", "P6"];
const juniorGrades: Extract<GradeId, "S1" | "S2" | "S3">[] = ["S1", "S2", "S3"];
const seniorGrades: Extract<GradeId, "S4" | "S5" | "S6">[] = ["S4", "S5", "S6"];
const generatedTypes: Exclude<QuestionType, "graph">[] = ["multiple-choice", "fill-in", "short-answer"];
const mainlandBnuProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" };
const mainlandPepProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_PEP" };
const mainlandHjbProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_HJB" };
const expectedBnuPrimaryQuestionCountPerBatch = 1500;
const expectedBnuPrimaryQuestionCount = 3000;

const a18ContentDefectIds = [
  "bnu-primary-ds-v1-p1-055",
  "bnu-primary-ds-v1-p1-061",
  "bnu-primary-ds-v1-p1-062",
  "bnu-primary-ds-v1-p1-117",
  "bnu-primary-ds-v1-p1-126",
  "bnu-primary-ds-v1-p1-164",
  "bnu-primary-ds-v1-p1-170",
  "bnu-primary-ds-v1-p1-172",
  "bnu-primary-ds-v1-p1-180",
  "bnu-primary-ds-v1-p1-189",
  "bnu-primary-ds-v1-p1-193",
  "bnu-primary-ds-v1-p1-222",
  "bnu-primary-ds-v1-p3-016",
  "bnu-primary-ds-v1-p3-022",
  "bnu-primary-ds-v1-p3-079",
  "bnu-primary-ds-v1-p3-142",
  "bnu-primary-ds-v1-p4-016",
  "bnu-primary-ds-v1-p4-067",
  "bnu-primary-ds-v1-p4-070",
  "bnu-primary-ds-v1-p4-073",
  "bnu-primary-ds-v1-p4-082",
  "bnu-primary-ds-v1-p4-139",
  "bnu-primary-ds-v1-p4-157",
  "bnu-primary-ds-v1-p4-197",
  "bnu-primary-ds-v1-p4-231",
  "bnu-primary-ds-v1-p4-245",
  "bnu-primary-ds-v1-p5-001",
  "bnu-primary-ds-v1-p5-105",
  "bnu-primary-ds-v1-p5-221",
  "bnu-primary-ds-v1-p6-037",
  "bnu-primary-ds-v1-p6-086",
  "bnu-primary-ds-v1-p6-139",
  "bnu-primary-ds-v1-p6-184",
  "bnu-primary-ds-v2-p1-052",
  "bnu-primary-ds-v2-p1-057",
  "bnu-primary-ds-v2-p1-060",
  "bnu-primary-ds-v2-p1-087",
  "bnu-primary-ds-v2-p1-161",
  "bnu-primary-ds-v2-p1-204",
  "bnu-primary-ds-v2-p1-245",
  "bnu-primary-ds-v2-p2-032",
  "bnu-primary-ds-v2-p3-025",
  "bnu-primary-ds-v2-p3-139",
  "bnu-primary-ds-v2-p3-231",
  "bnu-primary-ds-v2-p3-237",
  "bnu-primary-ds-v2-p4-094",
  "bnu-primary-ds-v2-p4-145",
  "bnu-primary-ds-v2-p4-193",
  "bnu-primary-ds-v2-p4-195",
  "bnu-primary-ds-v2-p4-206",
  "bnu-primary-ds-v2-p4-229",
  "bnu-primary-ds-v2-p5-145",
  "bnu-primary-ds-v2-p5-239",
  "bnu-primary-ds-v2-p6-052",
  "bnu-primary-ds-v2-p6-181",
] as const;

const a18FreeAnswerDefectIds = [
  "bnu-primary-ds-v1-p1-164",
  "bnu-primary-ds-v1-p1-170",
  "bnu-primary-ds-v2-p1-161",
  "bnu-primary-ds-v2-p1-204",
  "bnu-primary-ds-v1-p1-222",
  "bnu-primary-ds-v1-p1-180",
  "bnu-primary-ds-v1-p1-062",
  "bnu-primary-ds-v1-p1-126",
  "bnu-primary-ds-v1-p1-117",
  "bnu-primary-ds-v1-p1-011",
  "bnu-primary-ds-v2-p1-012",
  "bnu-primary-ds-v1-p1-074",
  "bnu-primary-ds-v1-p1-144",
  "bnu-primary-ds-v2-p1-135",
  "bnu-primary-ds-v1-p1-141",
  "bnu-primary-ds-v1-p1-102",
  "bnu-primary-ds-v1-p1-108",
  "bnu-primary-ds-v2-p2-144",
  "bnu-primary-ds-v2-p2-150",
  "bnu-primary-ds-v1-p2-202",
  "bnu-primary-ds-v1-p2-208",
  "bnu-primary-ds-v1-p2-009",
  "bnu-primary-ds-v1-p2-014",
  "bnu-primary-ds-v1-p2-003",
  "bnu-primary-ds-v2-p2-125",
  "bnu-primary-ds-v1-p2-102",
  "bnu-primary-ds-v1-p2-093",
  "bnu-primary-ds-v1-p2-096",
  "bnu-primary-ds-v1-p2-099",
  "bnu-primary-ds-v1-p2-101",
  "bnu-primary-ds-v1-p2-105",
  "bnu-primary-ds-v1-p2-107",
  "bnu-primary-ds-v1-p2-057",
  "bnu-primary-ds-v1-p3-238",
  "bnu-primary-ds-v1-p3-159",
  "bnu-primary-ds-v1-p3-174",
  "bnu-primary-ds-v2-p3-174",
  "bnu-primary-ds-v2-p3-102",
  "bnu-primary-ds-v2-p3-105",
  "bnu-primary-ds-v1-p3-081",
  "bnu-primary-ds-v1-p3-087",
  "bnu-primary-ds-v1-p3-018",
  "bnu-primary-ds-v2-p3-030",
  "bnu-primary-ds-v2-p3-017",
  "bnu-primary-ds-v1-p3-021",
  "bnu-primary-ds-v1-p3-027",
  "bnu-primary-ds-v2-p3-038",
  "bnu-primary-ds-v2-p3-032",
  "bnu-primary-ds-v2-p4-156",
  "bnu-primary-ds-v1-p4-184",
  "bnu-primary-ds-v1-p4-186",
  "bnu-primary-ds-v1-p4-190",
  "bnu-primary-ds-v2-p4-196",
  "bnu-primary-ds-v2-p4-202",
  "bnu-primary-ds-v2-p4-204",
  "bnu-primary-ds-v1-p4-174",
  "bnu-primary-ds-v1-p4-074",
  "bnu-primary-ds-v2-p4-066",
  "bnu-primary-ds-v2-p4-069",
  "bnu-primary-ds-v1-p4-075",
  "bnu-primary-ds-v2-p4-075",
  "bnu-primary-ds-v2-p4-083",
  "bnu-primary-ds-v2-p4-084",
  "bnu-primary-ds-v1-p4-087",
  "bnu-primary-ds-v2-p4-003",
  "bnu-primary-ds-v1-p4-015",
  "bnu-primary-ds-v1-p4-018",
  "bnu-primary-ds-v1-p4-141",
  "bnu-primary-ds-v2-p4-045",
  "bnu-primary-ds-v2-p4-126",
  "bnu-primary-ds-v1-p5-138",
  "bnu-primary-ds-v2-p5-147",
  "bnu-primary-ds-v1-p5-140",
  "bnu-primary-ds-v1-p5-210",
  "bnu-primary-ds-v2-p5-210",
  "bnu-primary-ds-v2-p5-129",
  "bnu-primary-ds-v2-p5-194",
  "bnu-primary-ds-v1-p5-152",
  "bnu-primary-ds-v2-p5-009",
  "bnu-primary-ds-v2-p5-012",
  "bnu-primary-ds-v1-p5-062",
  "bnu-primary-ds-v2-p5-065",
  "bnu-primary-ds-v1-p5-048",
  "bnu-primary-ds-v2-p5-048",
  "bnu-primary-ds-v1-p5-093",
  "bnu-primary-ds-v1-p5-096",
  "bnu-primary-ds-v1-p5-099",
  "bnu-primary-ds-v1-p5-117",
  "bnu-primary-ds-v1-p5-018",
  "bnu-primary-ds-v1-p6-198",
  "bnu-primary-ds-v1-p6-226",
  "bnu-primary-ds-v1-p6-180",
  "bnu-primary-ds-v1-p6-177",
  "bnu-primary-ds-v1-p6-009",
  "bnu-primary-ds-v2-p6-009",
  "bnu-primary-ds-v1-p6-003",
  "bnu-primary-ds-v2-p6-003",
  "bnu-primary-ds-v1-p6-089",
  "bnu-primary-ds-v2-p6-042",
  "bnu-primary-ds-v1-p6-039",
  "bnu-primary-ds-v2-p6-039",
  "bnu-primary-ds-v2-p6-047",
  "bnu-primary-ds-v1-p6-051",
  "bnu-primary-ds-v2-p6-044",
  "bnu-primary-ds-v2-p6-048",
  "bnu-primary-ds-v2-p6-134",
] as const;

const a18SupplementalRepairIds = [
  "bnu-primary-ds-v2-p1-090",
  "bnu-primary-ds-v1-p2-034",
  "bnu-primary-ds-v1-p2-118",
  "bnu-primary-ds-v2-p2-033",
  "bnu-primary-ds-v2-p2-056",
  "bnu-primary-ds-v2-p2-112",
  "bnu-primary-ds-v2-p2-197",
  "bnu-primary-ds-v2-p3-010",
  "bnu-primary-ds-v2-p3-079",
  "bnu-primary-ds-v1-p4-037",
  "bnu-primary-ds-v1-p5-101",
  "bnu-primary-ds-v2-p5-124",
  "bnu-primary-ds-v2-p5-191",
  "bnu-primary-ds-v2-p5-250",
  "bnu-primary-ds-v1-p6-028",
  "bnu-primary-ds-v2-p6-145",
  "bnu-primary-ds-v2-p6-233",
  "bnu-primary-ds-v2-p6-242",
  "bnu-primary-ds-v2-p6-250"
] as const;

const previouslyAcceptedCompoundPartials: Record<string, string> = {
  "bnu-primary-ds-v2-p1-161": "红色的门",
  "bnu-primary-ds-v2-p1-012": "3",
  "bnu-primary-ds-v2-p1-135": "5",
  "bnu-primary-ds-v1-p1-141": "对",
  "bnu-primary-ds-v1-p2-202": "少了43本",
  "bnu-primary-ds-v1-p2-014": "6",
  "bnu-primary-ds-v2-p2-125": "4名",
  "bnu-primary-ds-v1-p2-102": "4盒",
  "bnu-primary-ds-v1-p2-093": "30 ÷ 5 = 6（个）",
  "bnu-primary-ds-v1-p2-096": "15 ÷ 5 = 3（个）",
  "bnu-primary-ds-v1-p2-099": "32 ÷ 4 = 8（个）",
  "bnu-primary-ds-v1-p2-105": "6个",
  "bnu-primary-ds-v1-p2-107": "54",
  "bnu-primary-ds-v1-p3-238": "5辆",
  "bnu-primary-ds-v1-p3-159": "(3,5)",
  "bnu-primary-ds-v2-p3-174": "大约600棵",
  "bnu-primary-ds-v1-p4-184": "3千克",
  "bnu-primary-ds-v1-p4-174": "等腰直角三角形",
  "bnu-primary-ds-v1-p4-018": "130°",
  "bnu-primary-ds-v2-p4-045": "1416",
  "bnu-primary-ds-v1-p5-138": "184平方厘米",
  "bnu-primary-ds-v1-p5-210": "x=50",
  "bnu-primary-ds-v2-p5-210": "45",
  "bnu-primary-ds-v2-p5-009": "大10倍",
  "bnu-primary-ds-v1-p5-062": "7/4",
  "bnu-primary-ds-v2-p5-065": "3/5，真",
  "bnu-primary-ds-v1-p5-093": "红色或蓝色",
  "bnu-primary-ds-v1-p5-096": "公平",
  "bnu-primary-ds-v1-p5-099": "一样大",
  "bnu-primary-ds-v1-p5-117": "鸡3只，兔5只",
  "bnu-primary-ds-v1-p6-226": "不满足。修改方案：将深度增加至0.6米",
  "bnu-primary-ds-v1-p6-180": "正比例"
};

function countBy(values: string[]) {
  const counts: Record<string, number> = {};
  values.forEach((value) => {
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return counts;
}

function batchCount(questionIds: string[], batch: "bnu-primary-v1" | "bnu-primary-v2") {
  return questionIds.filter((questionId) => mainlandBnuPrimaryQuestionGenerationMetadata[questionId]?.batch === batch).length;
}

function asGradingQuestion(question: (typeof mainlandBnuPrimaryQuestions)[number]) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers,
    options: question.options
  };
}

function setIntersection<T>(left: Set<T>, right: Set<T>) {
  return new Set(Array.from(left).filter((value) => right.has(value)));
}

test("Mainland BNU primary public bank promotes approved v1 and v2 1500-question packages", () => {
  const publicBnuQuestions = questions.filter((question) => Boolean(mainlandBnuPrimaryQuestionGenerationMetadata[question.id]));
  const v1Ids = new Set(mainlandBnuPrimaryV1Questions.map((question) => question.id));
  const v2Ids = new Set(mainlandBnuPrimaryV2Questions.map((question) => question.id));

  assert.equal(mainlandBnuPrimaryQuestions.length, expectedBnuPrimaryQuestionCount);
  assert.equal(mainlandBnuPrimaryV1Questions.length, expectedBnuPrimaryQuestionCountPerBatch);
  assert.equal(mainlandBnuPrimaryV2Questions.length, expectedBnuPrimaryQuestionCountPerBatch);
  assert.equal(publicBnuQuestions.length, expectedBnuPrimaryQuestionCount);
  assert.equal(v1Ids.size, expectedBnuPrimaryQuestionCountPerBatch);
  assert.equal(v2Ids.size, expectedBnuPrimaryQuestionCountPerBatch);
  assert.equal(mainlandBnuPrimaryV2Questions.some((question) => v1Ids.has(question.id)), false);
  assert.equal(publicBnuQuestions.every((question) => v1Ids.has(question.id) || v2Ids.has(question.id)), true);
  assert.equal(Object.keys(mainlandBnuPrimaryQuestionGenerationMetadata).filter((questionId) => v2Ids.has(questionId)).length, expectedBnuPrimaryQuestionCountPerBatch);
});

test("Mainland BNU primary v1+v2 bank keeps the approved grade, topic, type, and batch coverage", () => {
  assert.equal(mainlandBnuPrimaryTopics.length, 97);
  assert.equal(Object.keys(mainlandBnuPrimaryTopicMetadata).length, 97);
  assert.deepEqual(countBy(mainlandBnuPrimaryQuestions.map((question) => question.grade)), {
    P1: 500,
    P2: 500,
    P3: 500,
    P4: 500,
    P5: 500,
    P6: 500
  });

  primaryGrades.forEach((grade) => {
    const gradeQuestions = mainlandBnuPrimaryQuestions.filter((question) => question.grade === grade);
    generatedTypes.forEach((type) => {
      assert.ok(gradeQuestions.some((question) => question.type === type), `${grade} should include ${type} questions`);
    });
  });

  mainlandBnuPrimaryTopics.forEach((topic) => {
    const metadata = mainlandBnuPrimaryTopicMetadata[topic.id];
    assert.ok(metadata, `${topic.id} should have topic metadata`);
    assert.equal(metadata.questionCount, metadata.batchCounts["bnu-primary-v1"] + metadata.batchCounts["bnu-primary-v2"]);
    assert.ok(metadata.batchCounts["bnu-primary-v1"] > 0, `${topic.id} should have v1 questions`);
    assert.ok(metadata.batchCounts["bnu-primary-v2"] > 0, `${topic.id} should have v2 questions`);
  });
});

test("Mainland BNU primary questions are app-integrated, publisher-scoped, and independently answerable", () => {
  const topicIds = new Set(mainlandBnuPrimaryTopics.map((topic) => topic.id));
  const ids = new Set<string>();
  const prompts = new Set<string>();

  mainlandBnuPrimaryQuestions.forEach((question) => {
    assert.equal(question.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.deepEqual(question.curriculumProfile, mainlandBnuProfile);
    assert.equal(question.region, "MAINLAND");
    assert.equal(question.publisher, "MAINLAND_BNU");
    assert.ok(topicIds.has(question.topicId), `${question.id} uses missing topic ${question.topicId}`);
    assert.ok(!ids.has(question.id), `duplicate question id ${question.id}`);
    ids.add(question.id);

    const normalizedPrompt = `${question.grade}:${question.type}:${question.prompt.zhHans ?? question.prompt.zh}`.replace(/\s+/g, "");
    assert.ok(!prompts.has(normalizedPrompt), `${question.id} duplicates a BNUP primary generated prompt`);
    prompts.add(normalizedPrompt);

    assert.ok(question.prompt.en.trim() && question.prompt.zh.trim() && question.prompt.zhHans?.trim(), `${question.id} is missing localized prompt text`);
    assert.ok(question.explanation.en.trim() && question.explanation.zh.trim() && question.explanation.zhHans?.trim(), `${question.id} is missing localized explanation text`);
    assert.equal(independentMainlandBnuPrimaryAnswer(question), question.answer, `${question.id} answer should match production QA metadata`);
  });
});

test("Mainland BNU primary duplicate replacements are distinct, on-topic, and independently correct", () => {
  const byId = new Map(mainlandBnuPrimaryQuestions.map((question) => [question.id, question]));
  const multiplication = byId.get("bnu-primary-ds-v2-p3-168");
  const percentageMeaning = byId.get("bnu-primary-ds-v1-p6-072");
  assert.ok(multiplication);
  assert.ok(percentageMeaning);

  assert.equal(multiplication.prompt.zhHans ?? multiplication.prompt.zh, "学校为18个班准备读物，每班24本。一共需要准备多少本？");
  assert.equal(multiplication.answer, "432本");
  assert.equal(questionAnswerMatches(asGradingQuestion(multiplication), "432"), true);
  assert.match(multiplication.explanation.zhHans ?? multiplication.explanation.zh, /18×24=.*432/u);

  assert.equal(
    percentageMeaning.prompt.zhHans ?? percentageMeaning.prompt.zh,
    "在“六年级有25%的学生参加合唱团”中，把25%化成最简分数是多少？"
  );
  assert.equal(percentageMeaning.answer, "1/4");
  assert.equal(questionAnswerMatches(asGradingQuestion(percentageMeaning), "四分之一"), true);
  assert.match(percentageMeaning.explanation.zhHans ?? percentageMeaning.explanation.zh, /25%=25\/100.*1\/4/u);
});

test("Mainland BNU primary production metadata marks v1 and v2 rows approved and cites valid evidence", () => {
  const ragCardIds = new Set(mainlandBnuPrimaryRagCards.map((card) => card.id));
  const assessmentPatternCardIds = new Set(mainlandBnuPrimaryAssessmentPatternCards.map((card) => card.id));

  mainlandBnuPrimaryQuestions.forEach((question) => {
    const metadata = mainlandBnuPrimaryQuestionGenerationMetadata[question.id];
    assert.ok(metadata, `${question.id} is missing production metadata`);
    assert.ok(["bnu-primary-v1", "bnu-primary-v2"].includes(metadata.batch));
    assert.equal(metadata.sourceDistanceStatus, "passed-auto-source-scan");
    assert.equal(metadata.mathQaStatus, "pass");
    assert.equal(metadata.terminologyQaStatus, "pass");
    assert.equal(metadata.manualQaStatus, "approved");
    assert.equal(metadata.grade, question.grade);
    assert.equal(metadata.type, question.type);
    assert.equal(metadata.topicId, question.topicId);
    assert.ok(metadata.evidenceCardIds.length > 0, `${question.id} should cite at least one BNUP primary safe-RAG card`);
    assert.ok(metadata.assessmentPatternCardIds.length > 0, `${question.id} should cite at least one BNUP primary assessment-pattern card`);
    assert.deepEqual(metadata.paperPatternCardIds, []);
    assert.ok(metadata.evidenceCardIds.every((cardId) => ragCardIds.has(cardId)), `${question.id} cites unknown BNUP RAG evidence`);
    assert.ok(metadata.assessmentPatternCardIds.every((cardId) => assessmentPatternCardIds.has(cardId)), `${question.id} cites unknown BNUP assessment evidence`);
  });
});

test("Mainland BNU primary multiple-choice items have four unique options and one correct option", () => {
  mainlandBnuPrimaryQuestions
    .filter((question) => question.type === "multiple-choice")
    .forEach((question) => {
      const options = question.options ?? [];
      const optionValues = options.map((option) => option.zhHans ?? option.zh);
      assert.equal(options.length, 4, `${question.id} should have four options`);
      assert.equal(new Set(optionValues).size, 4, `${question.id} should have unique options`);
      assert.equal(optionValues.filter((option) => option === question.answer).length, 1, `${question.id} should have exactly one correct option`);
    });
});

test("Mainland BNU primary A18 protects decimal-reading semantics and the replacement probability contract", () => {
  const decimalQuestion = mainlandBnuPrimaryQuestions.find((question) => question.id === "bnu-primary-ds-v2-p3-118");
  assert.ok(decimalQuestion);
  const decimalOptions = (decimalQuestion.options ?? []).map((option) => option.zhHans ?? option.zh);
  assert.deepEqual(decimalOptions, ["3.5", "3.05", "3.50", "3.005"]);
  assert.equal(new Set(decimalOptions.map((option) => option.normalize("NFKC"))).size, 4);
  const decimalGradingQuestion = {
    id: decimalQuestion.id,
    answer: decimalQuestion.answer,
    accepted_answers: decimalQuestion.acceptedAnswers,
    options: decimalQuestion.options
  };
  assert.deepEqual(
    decimalOptions.flatMap((option, index) => questionAnswerMatches(decimalGradingQuestion, option) ? [index] : []),
    [1]
  );

  const replacementQuestion = mainlandBnuPrimaryQuestions.find((question) => question.id === "bnu-primary-ds-v2-p4-126");
  assert.ok(replacementQuestion);
  assert.match(replacementQuestion.prompt.zhHans ?? replacementQuestion.prompt.zh, /放回.*摇匀/u);
  const replacementGradingQuestion = {
    id: replacementQuestion.id,
    answer: replacementQuestion.answer,
    accepted_answers: replacementQuestion.acceptedAnswers,
    options: replacementQuestion.options
  };
  assert.equal(questionAnswerMatches(replacementGradingQuestion, replacementQuestion.answer), true);
  assert.equal(questionAnswerMatches(replacementGradingQuestion, "同意，因为不放回时第二次抽到双数的概率是5/9"), false);
});

test("Mainland BNU primary A18 manifests preserve the current 55/106/53 overlap and 197-row repair scope", () => {
  const contentIds = new Set<string>(a18ContentDefectIds);
  const freeAnswerIds = new Set<string>(a18FreeAnswerDefectIds);
  const unitContracts = chinaPromptUnitContractsJson.contracts.filter((contract) => contract.pack === "bnuPrimary");
  const unitIds = new Set(unitContracts.map((contract) => contract.id));
  const supplementalIds = new Set<string>(a18SupplementalRepairIds);

  assert.equal(contentIds.size, 55);
  assert.equal(freeAnswerIds.size, 106);
  assert.equal(unitIds.size, 53);
  assert.equal(setIntersection(contentIds, freeAnswerIds).size, 9);
  assert.equal(setIntersection(contentIds, unitIds).size, 0);
  assert.equal(setIntersection(freeAnswerIds, unitIds).size, 27);
  assert.equal(setIntersection(setIntersection(contentIds, freeAnswerIds), unitIds).size, 0);

  const artifactUnion = new Set([...contentIds, ...freeAnswerIds, ...unitIds]);
  assert.equal(artifactUnion.size, 178);
  assert.equal(setIntersection(artifactUnion, supplementalIds).size, 0);
  const completeRepairScope = new Set([...artifactUnion, ...supplementalIds]);
  assert.equal(completeRepairScope.size, 197);

  const rawRows = [
    ...v1QuestionPackJson.questions,
    ...v2QuestionPackJson.questions
  ];
  const rawById = new Map(rawRows.map((question) => [question.id, question]));
  const runtimeById = new Map(mainlandBnuPrimaryQuestions.map((question) => [question.id, question]));
  const normalize = (value: string) => value.normalize("NFKC").trim();

  completeRepairScope.forEach((questionId) => {
    const raw = rawById.get(questionId);
    const runtime = runtimeById.get(questionId);
    assert.ok(raw, `${questionId} should exist in the immutable source pack`);
    assert.ok(runtime, `${questionId} should exist in the reviewed runtime`);
    if (!raw || !runtime) return;
    const rawReview = {
      type: raw.type,
      prompt: normalize(raw.promptZhHans),
      options: raw.optionsZhHans.map(normalize),
      answer: normalize(raw.answer),
      acceptedAnswers: raw.acceptedAnswers.map(normalize),
      explanation: normalize(raw.explanationZhHans)
    };
    const runtimeReview = {
      type: runtime.type,
      prompt: normalize(runtime.prompt.zhHans ?? runtime.prompt.zh),
      options: (runtime.options ?? []).map((option) => normalize(option.zhHans ?? option.zh)),
      answer: normalize(runtime.answer),
      acceptedAnswers: (runtime.acceptedAnswers ?? []).map(normalize),
      explanation: normalize(runtime.explanation.zhHans ?? runtime.explanation.zh)
    };
    assert.notDeepEqual(runtimeReview, rawReview, `${questionId} should have a reviewed runtime repair`);
  });
});

test("Mainland BNU primary 53 prompt-unit contracts accept bare and correct units but reject incompatible units", () => {
  const runtimeById = new Map(mainlandBnuPrimaryQuestions.map((question) => [question.id, question]));
  const contracts = chinaPromptUnitContractsJson.contracts.filter((contract) => contract.pack === "bnuPrimary");
  assert.equal(contracts.length, 53);
  assert.deepEqual(countBy(contracts.map((contract) => contract.dimension)), {
    area: 12,
    count: 27,
    currency: 4,
    length: 5,
    mass: 3,
    time: 1,
    volume: 1
  });

  contracts.forEach((contract) => {
    const question = runtimeById.get(contract.id);
    assert.ok(question, `${contract.id} should exist`);
    if (!question) return;
    const gradingQuestion = asGradingQuestion(question);
    assert.equal(questionAnswerMatches(gradingQuestion, contract.answer), true, `${contract.id} should keep its bare answer`);
    assert.equal(questionAnswerMatches(gradingQuestion, contract.correctUnitAnswer), true, `${contract.id} should accept its explicit correct unit`);
    assert.equal(questionAnswerMatches(gradingQuestion, contract.wrongUnitAnswer), false, `${contract.id} should reject an incompatible unit`);
  });
});

test("Mainland BNU primary unit-only contracts do not demand an ungraded written process", () => {
  const byId = new Map(mainlandBnuPrimaryQuestions.map((question) => [question.id, question]));
  const cases = [
    ["bnu-primary-ds-v1-p3-171", "432", "432本"],
    ["bnu-primary-ds-v1-p3-177", "1008", "1008个"]
  ] as const;

  cases.forEach(([id, bare, explicit]) => {
    const question = byId.get(id);
    assert.ok(question, `${id} should exist`);
    const prompt = question.prompt.zhHans ?? question.prompt.zh;
    assert.doesNotMatch(prompt, /竖式|计算过程/u, `${id} should request only the graded final quantity`);
    assert.equal(questionAnswerMatches(asGradingQuestion(question), bare), true, `${id} bare quantity`);
    assert.equal(questionAnswerMatches(asGradingQuestion(question), explicit), true, `${id} contextual unit`);
    assert.equal(questionAnswerMatches(asGradingQuestion(question), `${bare} cm`), false, `${id} incompatible unit`);
  });
});

test("Mainland BNU primary compound prompts reject the 32 formerly accepted partial responses", () => {
  const runtimeById = new Map(mainlandBnuPrimaryQuestions.map((question) => [question.id, question]));
  assert.equal(Object.keys(previouslyAcceptedCompoundPartials).length, 32);

  Object.entries(previouslyAcceptedCompoundPartials).forEach(([questionId, oldPartial]) => {
    const question = runtimeById.get(questionId);
    assert.ok(question, `${questionId} should exist`);
    if (!question) return;
    const gradingQuestion = asGradingQuestion(question);
    assert.equal(questionAnswerMatches(gradingQuestion, question.answer), true, `${questionId} should accept its complete canonical response`);
    assert.equal(questionAnswerMatches(gradingQuestion, oldPartial), false, `${questionId} should reject the old partial response`);
  });

  const simplifiedTotalQuestion = runtimeById.get("bnu-primary-ds-v1-p2-208");
  assert.ok(simplifiedTotalQuestion);
  assert.doesNotMatch(simplifiedTotalQuestion.prompt.zhHans ?? simplifiedTotalQuestion.prompt.zh, /估算|验算/u);
  assert.equal(questionAnswerMatches(asGradingQuestion(simplifiedTotalQuestion), "756"), true);
  assert.equal(questionAnswerMatches(asGradingQuestion(simplifiedTotalQuestion), "756本"), true);

  const translatedVerticesQuestion = runtimeById.get("bnu-primary-ds-v1-p5-018");
  assert.ok(translatedVerticesQuestion);
  assert.doesNotMatch(translatedVerticesQuestion.prompt.zhHans ?? translatedVerticesQuestion.prompt.zh, /画出/u);
  assert.equal(questionAnswerMatches(asGradingQuestion(translatedVerticesQuestion), "(6,1)、(8,1)、(9,3)、(7,3)"), true);
});

test("Mainland BNU primary reviewed multiple-choice options have one production matcher hit", () => {
  const multipleChoiceQuestions = mainlandBnuPrimaryQuestions.filter((question) => question.type === "multiple-choice");
  assert.equal(multipleChoiceQuestions.length, 1203);
  multipleChoiceQuestions.forEach((question) => {
    const optionValues = (question.options ?? []).map((option) => option.zhHans ?? option.zh);
    const matchedIndexes = optionValues.flatMap((option, index) => (
      questionAnswerMatches(asGradingQuestion(question), option) ? [index] : []
    ));
    assert.equal(matchedIndexes.length, 1, `${question.id} should match exactly one displayed option; got ${matchedIndexes.join(",")}`);
  });

  const trialDivision = mainlandBnuPrimaryQuestions.find((question) => question.id === "bnu-primary-ds-v1-p4-082");
  assert.ok(trialDivision);
  assert.deepEqual(
    (trialDivision.options ?? []).flatMap((option, index) => (
      questionAnswerMatches(asGradingQuestion(trialDivision), option.zhHans ?? option.zh) ? [index] : []
    )),
    [2]
  );

  const fractionDivision = mainlandBnuPrimaryQuestions.find((question) => question.id === "bnu-primary-ds-v2-p5-191");
  assert.ok(fractionDivision);
  assert.deepEqual(
    (fractionDivision.options ?? []).flatMap((option, index) => (
      questionAnswerMatches(asGradingQuestion(fractionDivision), option.zhHans ?? option.zh) ? [index] : []
    )),
    [1]
  );

  const integratedReview = mainlandBnuPrimaryQuestions.find((question) => question.id === "bnu-primary-ds-v1-p5-111");
  assert.ok(integratedReview);
  assert.deepEqual(
    (integratedReview.options ?? []).flatMap((option, index) => (
      questionAnswerMatches(asGradingQuestion(integratedReview), option.zhHans ?? option.zh) ? [index] : []
    )),
    [0]
  );
});

test("Mainland BNU primary closest-number repairs have a unique numeric argmin and the canonical option", () => {
  const rows = [
    { id: "bnu-primary-ds-v2-p2-197", target: 500, values: [501, 498, 503, 504], expectedIndex: 0 },
    { id: "bnu-primary-ds-v1-p3-079", target: 1600, values: [1588, 1506, 1590, 1608], expectedIndex: 3 },
    { id: "bnu-primary-ds-v2-p3-079", target: 1200, values: [1192, 1206, 1188, 1002], expectedIndex: 1 },
    { id: "bnu-primary-ds-v2-p3-139", target: 60, values: [241 / 4, 302 / 5, 365 / 6, 423 / 7], expectedIndex: 0 },
    { id: "bnu-primary-ds-v1-p3-183", target: 1000, values: [10 * 25, 100 * 1, 40 * 25, 200 * 4], expectedIndex: 2 },
    { id: "bnu-primary-ds-v1-p4-016", target: 1_000_000_000, values: [999_999_998, 1_000_000_001, 1_000_000_010, 999_999_990], expectedIndex: 1 },
    { id: "bnu-primary-ds-v1-p4-037", target: 298 * 31, values: [300 * 30, 300 * 31, 290 * 30, 298 * 30], expectedIndex: 1 }
  ];

  rows.forEach(({ id, target, values, expectedIndex }) => {
    const question = mainlandBnuPrimaryQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `${id} should exist`);
    if (!question) return;
    const distances = values.map((value) => Math.abs(value - target));
    const minimum = Math.min(...distances);
    assert.deepEqual(distances.flatMap((distance, index) => distance === minimum ? [index] : []), [expectedIndex]);
    const matchedIndexes = (question.options ?? []).flatMap((option, index) => (
      questionAnswerMatches(asGradingQuestion(question), option.zhHans ?? option.zh) ? [index] : []
    ));
    assert.deepEqual(matchedIndexes, [expectedIndex], `${id} canonical should hit its unique argmin`);
    if (id === "bnu-primary-ds-v1-p3-183") {
      assert.doesNotMatch(
        (question.options ?? []).map((option) => option.zhHans ?? option.zh).join("\n"),
        /小朋友/u,
        `${id} should describe neutral goods rather than children as mass objects`
      );
    }
  });
});

test("Mainland BNU primary arithmetic distractor repairs have four distinct values and one keyed result", () => {
  const rows = [
    { id: "bnu-primary-ds-v2-p2-112", values: [42, 13, 41, 43], expectedIndex: 0 },
    { id: "bnu-primary-ds-v2-p3-010", values: [34, 20, 18, -6], expectedIndex: 2 },
    { id: "bnu-primary-ds-v1-p4-139", values: [21_000, 56_000, 3_500, 14_000], expectedIndex: 3 },
    { id: "bnu-primary-ds-v2-p5-124", values: [7 / 8, 3 / 4, 11 / 16, 1], expectedIndex: 0 },
    { id: "bnu-primary-ds-v2-p5-191", values: [25 / 6, 1 / 6, 6, 31 / 30], expectedIndex: 1 },
    { id: "bnu-primary-ds-v2-p5-250", values: [2, 32, 1 / 2, 8], expectedIndex: 0 },
    { id: "bnu-primary-ds-v2-p6-145", values: [62.8, 31.4, 62.8 / 3, 17.56], expectedIndex: 0 },
    { id: "bnu-primary-ds-v2-p6-233", values: [36, 21, 30, 42], expectedIndex: 0 },
    { id: "bnu-primary-ds-v2-p6-242", values: [31.4, 62.8, 12.56, 125.6], expectedIndex: 1 },
    { id: "bnu-primary-ds-v2-p6-250", values: [6, 18, 2, 4], expectedIndex: 1 },
    { id: "bnu-primary-ds-v1-p6-028", values: [6, 24 / 25, 2 / 3, 48 / 25], expectedIndex: 1 }
  ];

  rows.forEach(({ id, values, expectedIndex }) => {
    const question = mainlandBnuPrimaryQuestions.find((candidate) => candidate.id === id);
    assert.ok(question, `${id} should exist`);
    if (!question) return;
    assert.equal(new Set(values).size, 4, `${id} should not repeat an equivalent numeric distractor`);
    const matchedIndexes = (question.options ?? []).flatMap((option, index) => (
      questionAnswerMatches(asGradingQuestion(question), option.zhHans ?? option.zh) ? [index] : []
    ));
    assert.deepEqual(matchedIndexes, [expectedIndex], `${id} should key its one independently evaluated result`);
  });
});

test("Mainland BNU primary exact A18 corrections retain no-solution and digit-construction results", () => {
  const byId = new Map(mainlandBnuPrimaryQuestions.map((question) => [question.id, question]));
  assert.equal(byId.get("bnu-primary-ds-v2-p4-003")?.answer, "705020");
  assert.match(byId.get("bnu-primary-ds-v1-p4-015")?.answer ?? "", /^无解；.*最多读出一个零/u);
  assert.equal(questionAnswerMatches(asGradingQuestion(byId.get("bnu-primary-ds-v1-p4-015")!), "无解"), false);
  assert.equal(byId.get("bnu-primary-ds-v2-p3-105")?.answer, "8");
  assert.ok(byId.get("bnu-primary-ds-v2-p3-105")?.acceptedAnswers?.includes("8次"));
  assert.equal(questionAnswerMatches(asGradingQuestion(byId.get("bnu-primary-ds-v2-p3-105")!), "9次"), false);
});

test("Mainland BNU primary symmetry-axis prompt excludes the equilateral special case", () => {
  const question = mainlandBnuPrimaryQuestions.find((candidate) => candidate.id === "bnu-primary-ds-v1-p6-196");
  assert.ok(question);
  assert.match(question.prompt.zhHans ?? question.prompt.zh, /非等边的等腰三角形/u);
  assert.equal(question.answer, "1");
  assert.match(question.explanation.zhHans ?? question.explanation.zh, /非等边/u);
  assert.equal(questionAnswerMatches(asGradingQuestion(question), "1"), true);
  assert.equal(questionAnswerMatches(asGradingQuestion(question), "3"), false);
});

test("Mainland BNU primary A18 closure fixes the 12 remaining current-source defects", () => {
  const byId = new Map(mainlandBnuPrimaryQuestions.map((question) => [question.id, question]));
  const get = (id: string) => {
    const question = byId.get(id);
    assert.ok(question, `${id} should exist`);
    return question;
  };
  const prompt = (id: string) => {
    const question = get(id);
    return question.prompt.zhHans ?? question.prompt.zh;
  };

  const foldCut = get("bnu-primary-ds-v1-p2-057");
  assert.match(prompt(foldCut.id), /纸片内部/u);
  assert.match(prompt(foldCut.id), /不接触任何折痕或边缘/u);
  assert.equal(questionAnswerMatches(asGradingQuestion(foldCut), "4个"), true);

  const multiplicationBlanks = get("bnu-primary-ds-v1-p2-107");
  assert.equal(questionAnswerMatches(asGradingQuestion(multiplicationBlanks), "54，54"), true);
  assert.equal(questionAnswerMatches(asGradingQuestion(multiplicationBlanks), "54,54"), true);
  assert.equal(questionAnswerMatches(asGradingQuestion(multiplicationBlanks), "54"), false);

  const closestProduct = get("bnu-primary-ds-v1-p3-079");
  assert.match(prompt(closestProduct.id), /A\. 397×4/u);
  assert.doesNotMatch(prompt(closestProduct.id), /398×4/u);

  const digitConstruction = get("bnu-primary-ds-v1-p4-015");
  assert.match(digitConstruction.answer, /无解.*6004999.*最多读出一个零/u);
  assert.equal(questionAnswerMatches(asGradingQuestion(digitConstruction), "无解"), false);

  const classification = get("bnu-primary-ds-v1-p4-141");
  assert.match(classification.answer, /44=40\+4.*分配律.*不能.*40×4/u);
  assert.equal(
    questionAnswerMatches(
      asGradingQuestion(classification),
      "（1）大数的读写，正确，50060070读作五千零六万零七十；（2）线与角，正确；（3）运算律，错误，25×44=25×（40+4）=1100"
    ),
    false
  );

  const milk = get("bnu-primary-ds-v1-p4-184");
  assert.match(prompt(milk.id), /0\.25≈0\.3、12≈10/u);
  assert.match(prompt(milk.id), /列式计算准确值/u);
  assert.doesNotMatch(prompt(milk.id), /列竖式/u);
  assert.equal(questionAnswerMatches(asGradingQuestion(milk), milk.answer), true);
  assert.equal(questionAnswerMatches(asGradingQuestion(milk), "3千克"), false);

  const train = get("bnu-primary-ds-v2-p4-045");
  assert.match(prompt(train.id), /只把118看作120，12保持不变/u);
  assert.match(train.answer, /120×12=1440.*118×12=1416/u);

  const decimalDivision = get("bnu-primary-ds-v2-p5-009");
  assert.match(prompt(decimalDivision.id), /得到的商是正确商的多少倍/u);
  assert.match(decimalDivision.answer, /^10倍；/u);
  assert.equal(questionAnswerMatches(asGradingQuestion(decimalDivision), "大10倍"), false);

  const pears = get("bnu-primary-ds-v2-p5-012");
  assert.match(prompt(pears.id), /以0\.1千克为购买单位/u);
  assert.match(prompt(pears.id), /不得超过13\.75元/u);
  assert.equal(pears.answer, "2.8");
  assert.equal(questionAnswerMatches(asGradingQuestion(pears), "2.8千克"), true);
  assert.equal(questionAnswerMatches(asGradingQuestion(pears), "2.9千克"), false);

  const trapezoid = get("bnu-primary-ds-v2-p5-048");
  assert.doesNotMatch(prompt(trapezoid.id), /计算过程/u);
  assert.equal(trapezoid.answer, "35平方厘米");
  assert.equal(questionAnswerMatches(asGradingQuestion(trapezoid), "35"), true);
  assert.equal(questionAnswerMatches(asGradingQuestion(trapezoid), "35平方厘米"), true);
  assert.equal(questionAnswerMatches(asGradingQuestion(trapezoid), "35立方厘米"), false);

  const ropes = get("bnu-primary-ds-v2-p5-129");
  assert.doesNotMatch(prompt(ropes.id), /列式|化简/u);
  assert.equal(ropes.answer, "1/6米");
  assert.equal(questionAnswerMatches(asGradingQuestion(ropes), "1/6"), true);
  assert.equal(questionAnswerMatches(asGradingQuestion(ropes), "1/6米"), true);
  assert.equal(questionAnswerMatches(asGradingQuestion(ropes), "1/6平方米"), false);

  const sandpit = get("bnu-primary-ds-v1-p6-226");
  assert.match(prompt(sandpit.id), /只增加深度/u);
  assert.match(prompt(sandpit.id), /以0\.01米为调整单位/u);
  assert.match(prompt(sandpit.id), /最小深度/u);
  assert.match(sandpit.answer, /0\.52米.*6\.5312/u);
  assert.equal(
    questionAnswerMatches(
      asGradingQuestion(sandpit),
      "V=3.14×2²×0.5=6.28（立方米），6.28<6.5，不满足；可把深度增至0.6米，因为3.14×2²×0.6=7.536>6.5"
    ),
    false
  );
});

test("Mainland BNU primary decimal-multiplication questions assess multiplication across durable and runtime layers", () => {
  const topicId = "bnu-primary-p4-lower-decimal-multiplication";
  const allTopicQuestions = mainlandBnuPrimaryQuestions.filter((question) => question.topicId === topicId);
  assert.equal(allTopicQuestions.length, 30);
  allTopicQuestions.forEach((question) => {
    const learnerText = [
      question.prompt.zhHans ?? question.prompt.zh,
      question.answer,
      question.explanation.zhHans ?? question.explanation.zh
    ].join("\n");
    assert.doesNotMatch(learnerText, /÷|小数除法|除数|被除数/u, `${question.id} should stay inside decimal multiplication`);
  });

  const expected = {
    "bnu-primary-ds-v1-p4-180": {
      prompt: "8段同样长的绳子，每段长0.6米。把它们首尾相接，接成的长绳一共长多少米？",
      answer: "4.8米",
      acceptedAnswers: ["4.8米", "4.8"],
      explanation: "0.6×8=4.8（米）。也可以想：6个0.1米乘8得到48个0.1米，也就是4.8米。",
      type: "short-answer",
      positives: ["4.8米", "4.8", "4.8 m", "480厘米", "0.0048千米"],
      negatives: ["4.8厘米", "8米", "4.8段"]
    },
    "bnu-primary-ds-v1-p4-188": {
      prompt: "做一朵花需要0.35米彩带。做6朵这样的花一共需要______米彩带。",
      answer: "2.1",
      acceptedAnswers: ["2.1", "2.1米"],
      explanation: "0.35×6=2.1（米）。也可以想：35个0.01米乘6得到210个0.01米，也就是2.1米。",
      type: "fill-in",
      positives: ["2.1", "2.10", "2.1米", "2.1 m", "210厘米", "0.0021千米"],
      negatives: ["2.1厘米", "6朵", "2.1升"]
    }
  } as const;
  const coordinationById = new Map(v1CoordinationQuestionPackJson.questions.map((question) => [question.id, question]));
  const productionById = new Map(v1QuestionPackJson.questions.map((question) => [question.id, question]));
  const runtimeById = new Map(mainlandBnuPrimaryQuestions.map((question) => [question.id, question]));

  Object.entries(expected).forEach(([id, contract]) => {
    const coordination = coordinationById.get(id);
    const production = productionById.get(id);
    const runtime = runtimeById.get(id);
    assert.ok(coordination && production && runtime, `${id} should exist in all three layers`);
    [coordination, production].forEach((question) => {
      assert.equal(question.promptZhHans, contract.prompt);
      assert.equal(question.answer, contract.answer);
      assert.deepEqual(question.acceptedAnswers, [...contract.acceptedAnswers]);
      assert.equal(question.explanationZhHans, contract.explanation);
      assert.equal(question.type, contract.type);
      assert.deepEqual(question.optionsZhHans, []);
    });
    assert.equal(runtime.prompt.zhHans, contract.prompt);
    assert.equal(runtime.answer, contract.answer);
    assert.equal(runtime.explanation.zhHans, contract.explanation);
    contract.positives.forEach((value) => {
      assert.equal(questionAnswerMatches(asGradingQuestion(runtime), value), true, `${id} should accept ${value}`);
    });
    contract.negatives.forEach((value) => {
      assert.equal(questionAnswerMatches(asGradingQuestion(runtime), value), false, `${id} should reject ${value}`);
    });
  });
});

test("Mainland BNU primary short-answer ordering items include learner-facing Chinese aliases", () => {
  const orderingQuestion = mainlandBnuPrimaryQuestions.find((question) => question.id === "bnu-primary-ds-v1-p4-105");

  assert.ok(orderingQuestion, "BNU ordering question should stay in the approved v1 bank");
  assert.ok(orderingQuestion?.acceptedAnswers?.includes("城市A，城市C，城市D，城市B"));
});

test("Mainland BNU primary lesson seeds provide 8-question v1+v2 balanced checkpoints", () => {
  const bnuQuestionIds = new Set(mainlandBnuPrimaryQuestions.map((question) => question.id));

  assert.equal(mainlandBnuPrimaryLessonSeeds.length, mainlandBnuPrimaryTopics.length);
  mainlandBnuPrimaryLessonSeeds.forEach((lessonSeed) => {
    assert.ok(lessonSeed.topicId.startsWith("bnu-primary-"), `${lessonSeed.topicId} should use a BNUP primary slug`);
    assert.equal(lessonSeed.productionReady, true);
    assert.equal(lessonSeed.practiceQuestionIds?.length, 8, `${lessonSeed.topicId} should have an 8-question checkpoint`);
    assert.ok(lessonSeed.practiceQuestionIds?.every((questionId) => bnuQuestionIds.has(questionId) && /^bnu-primary-ds-v[12]-/.test(questionId)));
    assert.equal(batchCount(lessonSeed.practiceQuestionIds ?? [], "bnu-primary-v1"), 4, `${lessonSeed.topicId} should include 4 v1 checkpoint questions`);
    assert.equal(batchCount(lessonSeed.practiceQuestionIds ?? [], "bnu-primary-v2"), 4, `${lessonSeed.topicId} should include 4 v2 checkpoint questions`);
    assert.ok(lessonSeed.blocks.some((block) => block.type === "teacher-guide"), `${lessonSeed.topicId} should include teacher guidance`);
  });
});

test("Mainland BNU P1-P6 Lesson and Practice surfaces expose only approved BNUP primary content", async () => {
  const bnuQuestionIds = new Set(mainlandBnuPrimaryQuestions.map((question) => question.id));
  const expectedTopicCounts: Record<(typeof primaryGrades)[number], number> = { P1: 16, P2: 17, P3: 17, P4: 16, P5: 17, P6: 14 };

  for (const grade of primaryGrades) {
    const result = await createStudentUser({
      name: `Mainland BNU ${grade} Primary Scope`,
      username: `mainland-bnu-${grade.toLowerCase()}-primary-scope-${Date.now()}@example.test`,
      password: "start12345",
      grade,
      curriculumProfile: mainlandBnuProfile,
      language: "zh-Hans",
      theme: "dark"
    });
    assert.equal(result.status, "created");
    if (result.status !== "created") continue;

    const roadmap = await getRoadmapData(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.equal(roadmap.contentUnavailable, null);
    assert.equal(roadmap.topics.length, expectedTopicCounts[grade]);
    assert.ok(roadmap.topics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.publisher === "MAINLAND_BNU"));

    const questionsForGrade = await getPublicQuestions({ grade, curriculumProfile: result.session.user.curriculumProfile });
    assert.equal(questionsForGrade.length, 500);
    assert.ok(questionsForGrade.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_BNU"));
    assert.ok(questionsForGrade.every((question) => bnuQuestionIds.has(question.id) && /^bnu-primary-ds-v[12]-/.test(question.id)));
    assert.equal(batchCount(questionsForGrade.map((question) => question.id), "bnu-primary-v1"), 250);
    assert.equal(batchCount(questionsForGrade.map((question) => question.id), "bnu-primary-v2"), 250);

    const entryTarget = await getLessonEntryTarget(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.ok(entryTarget, `${grade} should resolve a BNUP primary lesson entry`);
    assert.match(entryTarget?.slug ?? "", /^bnu-primary-/);
    const lesson = entryTarget ? await getLessonBySlug(result.session.user.id, entryTarget.slug, result.session.user.curriculumProfile) : null;
    assert.ok(lesson, `${grade} should load the scoped BNUP primary lesson`);
    assert.equal(lesson?.publisher, "MAINLAND_BNU");
    assert.equal(lesson?.topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(lesson?.topic.publisher, "MAINLAND_BNU");
    assert.equal(lesson?.practiceQuestions.length, 8);
    assert.ok(lesson?.practiceQuestions.every((question) => question.publisher === "MAINLAND_BNU" && bnuQuestionIds.has(question.id) && /^bnu-primary-ds-v[12]-/.test(question.id)));
    assert.equal(batchCount(lesson?.practiceQuestions.map((question) => question.id) ?? [], "bnu-primary-v1"), 4);
    assert.equal(batchCount(lesson?.practiceQuestions.map((question) => question.id) ?? [], "bnu-primary-v2"), 4);
    assert.ok(lesson?.blocks.some((block) => block.type === "teacher-guide"));
  }

  const pepP1Questions = await getPublicQuestions({ grade: "P1", curriculumProfile: mainlandPepProfile });
  assert.equal(pepP1Questions.some((question) => bnuQuestionIds.has(question.id)), false);
  assert.ok(pepP1Questions.every((question) => question.publisher === "MAINLAND_PEP"));

  const hjbP1Questions = await getPublicQuestions({ grade: "P1", curriculumProfile: mainlandHjbProfile });
  assert.equal(hjbP1Questions.some((question) => bnuQuestionIds.has(question.id)), false);
  assert.ok(hjbP1Questions.every((question) => question.publisher === "MAINLAND_HJB"));
});

test("Mainland BNU Practice Arena topic ordering interleaves v1 and v2 for the first free-selection round", async () => {
  const firstPrimaryTopic = mainlandBnuPrimaryTopics.find((topic) => topic.grade === "P1");
  assert.ok(firstPrimaryTopic, "BNUP primary should include a P1 topic");

  const topicQuestions = await getPublicQuestions({
    grade: firstPrimaryTopic.grade,
    topicId: firstPrimaryTopic.id,
    curriculumProfile: mainlandBnuProfile
  });
  const firstRoundQuestionIds = topicQuestions.slice(0, 5).map((question) => question.id);

  assert.ok(topicQuestions.length >= 10);
  assert.equal(firstRoundQuestionIds.length, 5);
  assert.ok(batchCount(firstRoundQuestionIds, "bnu-primary-v1") > 0);
  assert.ok(batchCount(firstRoundQuestionIds, "bnu-primary-v2") > 0);
});

test("Mainland BNU S1-S6 Practice surfaces expose approved secondary content", async () => {
  for (const grade of juniorGrades) {
    const result = await createStudentUser({
      name: `Mainland BNU ${grade} Junior Scope`,
      username: `mainland-bnu-${grade.toLowerCase()}-junior-scope-${Date.now()}@example.test`,
      password: "start12345",
      grade,
      curriculumProfile: mainlandBnuProfile,
      language: "zh-Hans",
      theme: "dark"
    });
    assert.equal(result.status, "created");
    if (result.status !== "created") continue;

    const roadmap = await getRoadmapData(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.equal(roadmap.contentUnavailable, null);
    assert.ok(roadmap.topics.length > 0, `${grade} should expose approved BNUP junior topics`);
    assert.ok(roadmap.topics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.publisher === "MAINLAND_BNU"));

    const questionsForGrade = await getPublicQuestions({ grade, curriculumProfile: result.session.user.curriculumProfile });
    assert.equal(questionsForGrade.length, 500);
    assert.ok(questionsForGrade.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_BNU"));
    assert.ok(questionsForGrade.every((question) => /^bnu-junior-ds-v1-/.test(question.id)));
  }

  for (const grade of seniorGrades) {
    const result = await createStudentUser({
      name: `Mainland BNU ${grade} Secondary Scope`,
      username: `mainland-bnu-${grade.toLowerCase()}-secondary-scope-${Date.now()}@example.test`,
      password: "start12345",
      grade,
      curriculumProfile: mainlandBnuProfile,
      language: "zh-Hans",
      theme: "dark"
    });
    assert.equal(result.status, "created");
    if (result.status !== "created") continue;

    const roadmap = await getRoadmapData(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.equal(roadmap.contentUnavailable, null);
    assert.ok(roadmap.topics.length > 0, `${grade} should expose approved BNUP secondary topics`);
    assert.ok(roadmap.topics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.publisher === "MAINLAND_BNU"));

    const questionsForGrade = await getPublicQuestions({ grade, curriculumProfile: result.session.user.curriculumProfile });
    assert.equal(questionsForGrade.length, 500);
    assert.ok(questionsForGrade.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_BNU"));
    assert.ok(questionsForGrade.every((question) => /^bnu-high-ds-v1-/.test(question.id)));
  }
});

test("question API returns BNUP primary questions only for a BNUP primary authenticated user", async () => {
  const result = await createStudentUser({
    name: "Mainland BNU API P1",
    username: `mainland-bnu-api-p1-${Date.now()}@example.test`,
    password: "start12345",
    grade: "P1",
    curriculumProfile: mainlandBnuProfile,
    language: "zh-Hans",
    theme: "dark"
  });
  assert.equal(result.status, "created");
  if (result.status !== "created") return;

  const token = await createSessionToken(result.session.user.id);
  const response = await getQuestionsRoute(new Request("http://localhost/api/questions?grade=P1&publisher=MAINLAND_BNU", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` }
  }));
  const body = await response.json() as { questions?: Array<{ curriculumTrack?: string; publisher?: string; id?: string }> };

  assert.equal(response.status, 200);
  assert.equal(body.questions?.length, 500);
  assert.ok(body.questions?.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_BNU" && /^bnu-primary-ds-v[12]-/.test(question.id ?? "")));
  assert.equal(batchCount(body.questions?.map((question) => question.id ?? "") ?? [], "bnu-primary-v1"), 250);
  assert.equal(batchCount(body.questions?.map((question) => question.id ?? "") ?? [], "bnu-primary-v2"), 250);
});
