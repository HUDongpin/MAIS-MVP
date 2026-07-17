import assert from "node:assert/strict";
import test from "node:test";
import approvedQuestionPackJson from "../coordination/content-qa/mainland-bnu-junior-generated-bank-v1-1500/approved-question-pack.json";
import {
  independentMainlandBnuJuniorAnswer,
  mainlandBnuJuniorQuestionGenerationMetadata,
  mainlandBnuJuniorQuestions
} from "../data/mainlandBnuJuniorQuestions";
import { mainlandBnuJuniorLessonSeeds, mainlandBnuJuniorSourceLessonCount } from "../data/mainlandBnuJuniorLessons";
import { mainlandBnuJuniorTopicMetadata, mainlandBnuJuniorTopics } from "../data/mainlandBnuJuniorTopics";
import { questions } from "../data/questions";
import { topics } from "../data/topics";
import { mainlandBnuJuniorRagCards } from "../data/rag/mainlandBnuJunior";
import { mainlandBnuJuniorAssessmentPatternCards } from "../data/rag/mainlandBnuJuniorAssessmentPatterns";
import { mainlandJuniorZhongkaoExamPatternCards } from "../data/rag/mainlandJuniorZhongkaoExamPatterns";
import { GET as getQuestionsRoute } from "../app/api/questions/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "./session";
import {
  createStudentUser,
  getLessonBySlug,
  getLessonEntryTarget,
  getPublicQuestions,
  getRoadmapData
} from "./server/userStore";
import type { CurriculumProfile, GradeId, QuestionType } from "@/types";

type ApprovedQuestionPack = {
  approval: {
    decision: string;
    repairedRows: number;
    deepseekFailRowsReviewed: number;
  };
  questions: Array<{
    id: string;
    grade: GradeId;
    topicId: string;
    type: Exclude<QuestionType, "graph">;
    difficulty: string;
  }>;
};

const approvedQuestionPack = approvedQuestionPackJson as ApprovedQuestionPack;
const juniorGrades: Extract<GradeId, "S1" | "S2" | "S3">[] = ["S1", "S2", "S3"];
const generatedTypes: Exclude<QuestionType, "graph">[] = ["multiple-choice", "fill-in", "short-answer"];
const mainlandBnuProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_BNU" };
const mainlandPepProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_PEP" };
const mainlandHjbProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_HJB" };
const expectedJuniorQuestionCount = 1500;
const expectedTopicCounts: Record<(typeof juniorGrades)[number], number> = { S1: 12, S2: 13, S3: 10 };

function countBy(values: string[]) {
  const counts: Record<string, number> = {};
  values.forEach((value) => {
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return counts;
}

test("Mainland BNU junior public bank promotes the S18-approved 1500-question package", () => {
  const publicBnuJuniorQuestions = questions.filter((question) => Boolean(mainlandBnuJuniorQuestionGenerationMetadata[question.id]));
  const approvedIds = new Set(approvedQuestionPack.questions.map((question) => question.id));
  const bankIds = new Set(mainlandBnuJuniorQuestions.map((question) => question.id));

  assert.equal(approvedQuestionPack.approval.decision, "approved-for-public-integration");
  assert.equal(approvedQuestionPack.approval.deepseekFailRowsReviewed, 153);
  assert.ok(approvedQuestionPack.approval.repairedRows >= 153);
  assert.equal(approvedQuestionPack.questions.length, expectedJuniorQuestionCount);
  assert.equal(mainlandBnuJuniorQuestions.length, expectedJuniorQuestionCount);
  assert.equal(Object.keys(mainlandBnuJuniorQuestionGenerationMetadata).length, expectedJuniorQuestionCount);
  assert.equal(publicBnuJuniorQuestions.length, expectedJuniorQuestionCount);
  assert.equal(approvedIds.size, expectedJuniorQuestionCount);
  assert.equal(bankIds.size, expectedJuniorQuestionCount);
  assert.ok(publicBnuJuniorQuestions.every((question) => approvedIds.has(question.id)));
});

test("Mainland BNU junior bank keeps approved grade, type, difficulty, and topic coverage", () => {
  assert.equal(mainlandBnuJuniorTopics.length, 35);
  assert.equal(Object.keys(mainlandBnuJuniorTopicMetadata).length, 35);
  assert.deepEqual(countBy(mainlandBnuJuniorQuestions.map((question) => question.grade)), {
    S1: 500,
    S2: 500,
    S3: 500
  });
  assert.deepEqual(countBy(mainlandBnuJuniorQuestions.map((question) => question.type)), {
    "multiple-choice": 525,
    "short-answer": 525,
    "fill-in": 450
  });
  assert.deepEqual(countBy(mainlandBnuJuniorQuestions.map((question) => question.difficulty)), {
    Medium: 695,
    Low: 290,
    High: 515
  });

  juniorGrades.forEach((grade) => {
    const gradeQuestions = mainlandBnuJuniorQuestions.filter((question) => question.grade === grade);
    generatedTypes.forEach((type) => {
      assert.ok(gradeQuestions.some((question) => question.type === type), `${grade} should include ${type} questions`);
    });
  });

  mainlandBnuJuniorTopics.forEach((topic) => {
    const metadata = mainlandBnuJuniorTopicMetadata[topic.id];
    assert.ok(metadata, `${topic.id} should have topic metadata`);
    assert.ok(metadata.questionCount > 0, `${topic.id} should have generated questions`);
    assert.ok(topics.some((candidate) => candidate.id === topic.id && candidate.publisher === "MAINLAND_BNU"));
  });
});

test("Mainland BNU junior questions are publisher-scoped, approved, and independently answerable", () => {
  const topicIds = new Set(mainlandBnuJuniorTopics.map((topic) => topic.id));
  const ids = new Set<string>();
  const prompts = new Set<string>();

  mainlandBnuJuniorQuestions.forEach((question) => {
    assert.equal(question.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.deepEqual(question.curriculumProfile, mainlandBnuProfile);
    assert.equal(question.region, "MAINLAND");
    assert.equal(question.publisher, "MAINLAND_BNU");
    assert.ok(topicIds.has(question.topicId), `${question.id} uses missing topic ${question.topicId}`);
    assert.ok(!ids.has(question.id), `duplicate question id ${question.id}`);
    ids.add(question.id);

    const normalizedPrompt = `${question.grade}:${question.type}:${question.prompt.zhHans ?? question.prompt.zh}`.replace(/\s+/g, "");
    assert.ok(!prompts.has(normalizedPrompt), `${question.id} duplicates a BNU junior generated prompt`);
    prompts.add(normalizedPrompt);

    assert.ok(question.prompt.en.trim() && question.prompt.zh.trim() && question.prompt.zhHans?.trim(), `${question.id} is missing localized prompt text`);
    assert.ok(question.explanation.en.trim() && question.explanation.zh.trim() && question.explanation.zhHans?.trim(), `${question.id} is missing localized explanation text`);
    assert.equal(/term-[0-9a-f]+/i.test(`${question.prompt.en} ${question.explanation.en}`), false, `${question.id} should not expose machine placeholder tokens in English fallback`);
    assert.equal(independentMainlandBnuJuniorAnswer(question), question.answer, `${question.id} answer should match approved QA metadata`);
  });
});

test("Mainland BNU junior production metadata marks rows approved and cites valid evidence", () => {
  const ragCardIds = new Set(mainlandBnuJuniorRagCards.map((card) => card.id));
  const assessmentPatternCardIds = new Set(mainlandBnuJuniorAssessmentPatternCards.map((card) => card.id));
  const zhongkaoPatternCardIds = new Set(mainlandJuniorZhongkaoExamPatternCards.map((card) => card.id));

  mainlandBnuJuniorQuestions.forEach((question) => {
    const metadata = mainlandBnuJuniorQuestionGenerationMetadata[question.id];
    assert.ok(metadata, `${question.id} is missing production metadata`);
    assert.equal(metadata.batch, "bnu-junior-v1-1500");
    assert.equal(metadata.sourceDistanceStatus, "passed-auto-source-scan");
    assert.equal(metadata.mathQaStatus, "pass");
    assert.equal(metadata.terminologyQaStatus, "pass");
    assert.equal(metadata.manualQaStatus, "approved");
    assert.equal(metadata.grade, question.grade);
    assert.equal(metadata.type, question.type);
    assert.equal(metadata.topicId, question.topicId);
    assert.ok(metadata.evidenceCardIds.length > 0, `${question.id} should cite at least one BNU junior safe-RAG card`);
    assert.ok(metadata.assessmentPatternCardIds.length > 0, `${question.id} should cite at least one BNU junior assessment-pattern card`);
    assert.ok(metadata.zhongkaoPatternCardIds.length > 0, `${question.id} should cite at least one shared zhongkao pattern card`);
    assert.ok(metadata.evidenceCardIds.every((cardId) => ragCardIds.has(cardId)), `${question.id} cites unknown BNU junior RAG evidence`);
    assert.ok(metadata.assessmentPatternCardIds.every((cardId) => assessmentPatternCardIds.has(cardId)), `${question.id} cites unknown BNU junior assessment evidence`);
    assert.ok(metadata.zhongkaoPatternCardIds.every((cardId) => zhongkaoPatternCardIds.has(cardId)), `${question.id} cites unknown zhongkao evidence`);
  });
});

test("Mainland BNU junior multiple-choice items have four unique options and one correct option", () => {
  mainlandBnuJuniorQuestions
    .filter((question) => question.type === "multiple-choice")
    .forEach((question) => {
      const options = question.options ?? [];
      const optionValues = options.map((option) => option.zhHans ?? option.zh);
      assert.equal(options.length, 4, `${question.id} should have four options`);
      assert.equal(new Set(optionValues).size, 4, `${question.id} should have unique options`);
      assert.equal(optionValues.filter((option) => option === question.answer).length, 1, `${question.id} should have exactly one correct option`);
    });
});

test("Mainland BNU junior lesson seeds provide formal S1-S3 textbook coverage", () => {
  const bnuQuestionIds = new Set(mainlandBnuJuniorQuestions.map((question) => question.id));
  const lessonTopicIds = new Set(mainlandBnuJuniorLessonSeeds.map((lesson) => lesson.topicId));

  assert.equal(mainlandBnuJuniorSourceLessonCount, 105);
  assert.equal(mainlandBnuJuniorLessonSeeds.length, mainlandBnuJuniorTopics.length);
  mainlandBnuJuniorTopics.forEach((topic) => {
    assert.equal(lessonTopicIds.has(topic.id), true, `${topic.id} should have a BNUP junior formal lesson`);
  });
  mainlandBnuJuniorLessonSeeds.forEach((lessonSeed) => {
    assert.ok(lessonSeed.topicId.startsWith("bnu-junior-"), `${lessonSeed.topicId} should use a BNUP junior slug`);
    assert.equal(lessonSeed.productionReady, true);
    assert.equal(lessonSeed.practiceQuestionIds?.length, 8, `${lessonSeed.topicId} should have an 8-question checkpoint`);
    assert.ok(lessonSeed.practiceQuestionIds?.every((questionId) => bnuQuestionIds.has(questionId) && /^bnu-junior-ds-v1-/.test(questionId)));
    assert.ok(lessonSeed.blocks.some((block) => block.type === "teacher-guide"), `${lessonSeed.topicId} should include teacher guidance`);
  });
});

test("Mainland BNU S1-S3 Lesson, Roadmap, Practice, and question API expose approved junior content", async () => {
  const bnuJuniorQuestionIds = new Set(mainlandBnuJuniorQuestions.map((question) => question.id));

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
    assert.equal(roadmap.topics.length, expectedTopicCounts[grade]);
    assert.ok(roadmap.topics.every((topic) => topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.publisher === "MAINLAND_BNU"));

    const questionsForGrade = await getPublicQuestions({ grade, curriculumProfile: result.session.user.curriculumProfile });
    assert.equal(questionsForGrade.length, 500);
    assert.ok(questionsForGrade.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_BNU"));
    assert.ok(questionsForGrade.every((question) => bnuJuniorQuestionIds.has(question.id) && /^bnu-junior-ds-v1-/.test(question.id)));

    const entryTarget = await getLessonEntryTarget(result.session.user.id, grade, result.session.user.curriculumProfile);
    assert.ok(entryTarget, `${grade} should resolve a BNUP junior lesson entry`);
    assert.match(entryTarget?.slug ?? "", /^bnu-junior-/);
    const lesson = entryTarget ? await getLessonBySlug(result.session.user.id, entryTarget.slug, result.session.user.curriculumProfile) : null;
    assert.ok(lesson, `${grade} should load the scoped BNUP junior lesson`);
    assert.equal(lesson?.publisher, "MAINLAND_BNU");
    assert.equal(lesson?.topic.curriculumTrack, "MAINLAND_PEP_HIGH");
    assert.equal(lesson?.topic.publisher, "MAINLAND_BNU");
    assert.equal(lesson?.practiceQuestions.length, 8);
    assert.ok(lesson?.practiceQuestions.every((question) => question.publisher === "MAINLAND_BNU" && bnuJuniorQuestionIds.has(question.id) && /^bnu-junior-ds-v1-/.test(question.id)));
    assert.ok(lesson?.blocks.some((block) => block.type === "teacher-guide"));

    const teacherView = entryTarget ? await getLessonBySlug(null, entryTarget.slug, mainlandBnuProfile) : null;
    assert.equal(teacherView?.publisher, "MAINLAND_BNU");
    assert.equal(teacherView?.practiceQuestions.length, 8);
    assert.ok(teacherView?.practiceQuestions.every((question) => question.publisher === "MAINLAND_BNU" && /^bnu-junior-ds-v1-/.test(question.id)));
    assert.ok(teacherView?.blocks.some((block) => block.type === "teacher-guide"));
  }

  const pepS1Questions = await getPublicQuestions({ grade: "S1", curriculumProfile: mainlandPepProfile });
  assert.equal(pepS1Questions.some((question) => bnuJuniorQuestionIds.has(question.id)), false);
  assert.ok(pepS1Questions.every((question) => question.publisher === "MAINLAND_PEP"));

  const hjbS1Questions = await getPublicQuestions({ grade: "S1", curriculumProfile: mainlandHjbProfile });
  assert.equal(hjbS1Questions.some((question) => bnuJuniorQuestionIds.has(question.id)), false);
  assert.ok(hjbS1Questions.every((question) => question.publisher === "MAINLAND_HJB"));

  const result = await createStudentUser({
    name: "Mainland BNU API S1",
    username: `mainland-bnu-api-s1-${Date.now()}@example.test`,
    password: "start12345",
    grade: "S1",
    curriculumProfile: mainlandBnuProfile,
    language: "zh-Hans",
    theme: "dark"
  });
  assert.equal(result.status, "created");
  if (result.status !== "created") return;

  const token = await createSessionToken(result.session.user.id);
  const response = await getQuestionsRoute(new Request("http://localhost/api/questions?grade=S1&publisher=MAINLAND_BNU", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}` }
  }));
  const body = await response.json() as { questions?: Array<{ curriculumTrack?: string; publisher?: string; id?: string }> };

  assert.equal(response.status, 200);
  assert.equal(body.questions?.length, 500);
  assert.ok(body.questions?.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_BNU" && /^bnu-junior-ds-v1-/.test(question.id ?? "")));
});
