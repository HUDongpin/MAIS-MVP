import assert from "node:assert/strict";
import test from "node:test";
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
import { SESSION_COOKIE_NAME } from "./session";
import { createSessionTokenForUserId } from "./server/sessionCookie";
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

  const token = await createSessionTokenForUserId(result.session.user.id);
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
