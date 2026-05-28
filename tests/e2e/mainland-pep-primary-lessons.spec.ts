import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { mainlandPepHighTopics } from "../../data/mainlandPepHighTopics";
import { getMainlandPepJuniorLessonIllustration } from "../../data/mainlandPepJuniorLessonIllustrations";
import { mainlandPepJuniorTopics } from "../../data/mainlandPepJuniorTopics";
import { getMainlandPepPrimaryLessonIllustration } from "../../data/mainlandPepPrimaryLessonIllustrations";
import { mainlandPepPrimaryTopics } from "../../data/mainlandPepPrimaryTopics";
import { lessonSlugForTopicId } from "../../lib/lessonLinks";
import type { GradeId } from "../../types";

const requiredBlockTypes = new Set(["concept", "worked-example", "checklist", "practice", "extension"]);
const mainlandPepTopics = [...mainlandPepPrimaryTopics, ...mainlandPepJuniorTopics, ...mainlandPepHighTopics];
const expectedTopicCountsByGrade: Record<GradeId, number> = {
  P1: 4,
  P2: 4,
  P3: 4,
  P4: 4,
  P5: 4,
  P6: 4,
  S1: 5,
  S2: 4,
  S3: 2,
  S4: 10,
  S5: 5,
  S6: 7
};
const representativePageTopicIds = new Set([
  "pep-primary-p1-upper-number-sense",
  "pep-primary-p3-upper-operations-fractions",
  "pep-primary-p6-lower-negative-review",
  "pep-junior-s1-upper-rational-numbers",
  "pep-junior-s3-upper-quadratics-circle-probability",
  "pep-high-s4-sets-logic",
  "pep-high-s6-exam-practice"
]);
const representativeJuniorIllustrationTopicIds = [
  "pep-junior-s1-upper-rational-numbers",
  "pep-junior-s3-upper-quadratics-circle-probability"
] as const;
const representativePrimaryIllustrationTopicIds = [
  "pep-primary-p1-upper-number-sense",
  "pep-primary-p3-upper-operations-fractions",
  "pep-primary-p6-lower-negative-review"
] as const;

function topicsByGrade() {
  const groups = new Map<GradeId, typeof mainlandPepTopics>();
  mainlandPepTopics.forEach((topic) => {
    groups.set(topic.grade, [...(groups.get(topic.grade) ?? []), topic]);
  });
  return groups;
}

function uniqueUsername(testInfo: TestInfo, grade: GradeId) {
  return [
    "mainland-primary-lesson-qa",
    grade.toLowerCase(),
    testInfo.project.name,
    testInfo.workerIndex,
    Date.now(),
    Math.random().toString(36).slice(2, 8)
  ]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
}

async function registerMainlandPepStudent(request: APIRequestContext, testInfo: TestInfo, grade: GradeId) {
  const username = `${uniqueUsername(testInfo, grade)}@example.test`;
  const response = await request.post("/api/auth/register", {
    data: {
      name: `Mainland Primary Lesson QA ${grade}`,
      username,
      email: username,
      password: "lesson12345",
      grade,
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      language: "zh-Hans",
      theme: "dark"
    }
  });
  expect(response.status(), `register ${grade} Mainland PEP QA student`).toBe(200);
}

async function expectLessonApiPayload(request: APIRequestContext, topic: (typeof mainlandPepTopics)[number]) {
  const slug = lessonSlugForTopicId(topic.id);
  const response = await request.get(`/api/lessons/${encodeURIComponent(slug)}`);
  expect(response.status(), `GET /api/lessons/${slug}`).toBe(200);
  const body = await response.json();
  const lesson = body.lesson;
  expect(lesson, `${slug} lesson payload`).toBeTruthy();
  expect(lesson.slug).toBe(slug);
  expect(lesson.topicId).toBe(topic.id);
  expect(lesson.grade).toBe(topic.grade);
  expect(lesson.topic?.curriculumTrack).toBe("MAINLAND_PEP_HIGH");
  expect(lesson.topic?.publisher).toBe("MAINLAND_PEP");
  expect(lesson.title?.en?.trim()).toBeTruthy();
  expect(lesson.title?.zh?.trim()).toBeTruthy();
  expect(lesson.description?.en?.trim()).toBeTruthy();
  expect(lesson.description?.zh?.trim()).toBeTruthy();
  expect(lesson.practiceQuestions?.length, `${slug} has linked practice questions`).toBeGreaterThan(0);
  expect(
    lesson.practiceQuestions.every((question: { curriculumTrack?: string; publisher?: string }) =>
      question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_PEP"
    ),
    `${slug} lesson practice questions stay Mainland PEP scoped`
  ).toBe(true);

  const blockTypes = new Set((lesson.blocks ?? []).map((block: { type: string }) => block.type));
  requiredBlockTypes.forEach((type) => {
    expect(blockTypes.has(type), `${slug} includes ${type} block`).toBe(true);
  });

  const renderedText = JSON.stringify({
    title: lesson.title,
    description: lesson.description,
    blocks: lesson.blocks
  });
  expect(renderedText).not.toMatch(/\b(?:undefined|NaN)\b/i);
  expect(renderedText).not.toMatch(/教材|课本|OCR|扫描|截图|source|locator|PDF/i);
}

async function expectPracticeApiPayload(request: APIRequestContext, grade: GradeId) {
  const response = await request.get(`/api/questions?grade=${encodeURIComponent(grade)}&publisher=MAINLAND_PEP`);
  expect(response.status(), `GET /api/questions for Mainland PEP ${grade}`).toBe(200);
  const body = await response.json();
  const questions = body.questions as Array<{ curriculumTrack?: string; publisher?: string }> | undefined;
  expect(questions?.length ?? 0, `${grade} Mainland PEP practice questions`).toBeGreaterThan(0);
  expect(
    questions?.every((question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_PEP") ?? false,
    `${grade} Practice Arena API stays Mainland PEP scoped`
  ).toBe(true);

  const adaptiveResponse = await request.get(`/api/adaptive-learning/next?grade=${encodeURIComponent(grade)}`);
  expect(adaptiveResponse.status(), `GET /api/adaptive-learning/next for Mainland PEP ${grade}`).toBe(200);
  const adaptiveBody = await adaptiveResponse.json();
  expect(adaptiveBody.decision?.topic?.curriculumTrack, `${grade} adaptive topic uses Mainland PEP`).toBe("MAINLAND_PEP_HIGH");
  expect(adaptiveBody.decision?.questions?.length ?? 0, `${grade} adaptive questions`).toBeGreaterThan(0);
  expect(
    adaptiveBody.decision.questions.every((question: { curriculumTrack?: string; publisher?: string }) =>
      question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_PEP"
    ),
    `${grade} adaptive questions stay Mainland PEP scoped`
  ).toBe(true);
}

async function expectLessonPageRoute(request: APIRequestContext, topic: (typeof mainlandPepTopics)[number]) {
  const slug = lessonSlugForTopicId(topic.id);
  const response = await request.get(`/lesson/${encodeURIComponent(slug)}`);
  expect(response.status(), `GET /lesson/${slug}`).toBe(200);
  const html = await response.text();
  expect(html).not.toMatch(/Lesson not found|This page is not available/i);
}

async function loginMainlandPepTeacher(page: Page, grade: GradeId) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "Mainland Teacher Phoebe",
      password: "12345",
      grade,
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_PEP" },
      language: "zh-Hans",
      theme: "dark"
    }
  });
  expect(response.status(), "login Mainland PEP teacher").toBe(200);
}

async function expectJuniorLessonIllustrationsVisible(page: Page, topicId: (typeof representativeJuniorIllustrationTopicIds)[number]) {
  const topic = mainlandPepJuniorTopics.find((candidate) => candidate.id === topicId);
  const concept = getMainlandPepJuniorLessonIllustration(topicId, "concept");
  const workedExample = getMainlandPepJuniorLessonIllustration(topicId, "worked-example");
  if (!topic) throw new Error(`${topicId} topic exists`);
  if (!concept) throw new Error(`${topicId} concept illustration metadata exists`);
  if (!workedExample) throw new Error(`${topicId} worked-example illustration metadata exists`);

  await page.goto(`/lesson/${lessonSlugForTopicId(topicId)}`);
  await expect(page.locator("main")).toContainText(concept.caption.zhHans ?? concept.caption.zh, { timeout: 45_000 });
  await expect(page.locator(`img[src*="mainland-pep-junior"][src*="${topicId}"]`)).toHaveCount(2);
  await expect(page.locator("main")).toContainText(workedExample.caption.zhHans ?? workedExample.caption.zh);
}

async function expectPrimaryLessonIllustrationsVisible(page: Page, topicId: (typeof representativePrimaryIllustrationTopicIds)[number]) {
  const topic = mainlandPepPrimaryTopics.find((candidate) => candidate.id === topicId);
  const concept = getMainlandPepPrimaryLessonIllustration(topicId, "concept");
  const workedExample = getMainlandPepPrimaryLessonIllustration(topicId, "worked-example");
  if (!topic) throw new Error(`${topicId} topic exists`);
  if (!concept) throw new Error(`${topicId} concept illustration metadata exists`);
  if (!workedExample) throw new Error(`${topicId} worked-example illustration metadata exists`);

  await page.goto(`/lesson/${lessonSlugForTopicId(topicId)}`);
  await expect(page.locator("main")).toContainText(concept.caption.zhHans ?? concept.caption.zh, { timeout: 45_000 });
  await expect(page.locator(`img[src*="mainland-pep-primary"][src*="${topicId}"]`)).toHaveCount(2);
  await expect(page.locator("main")).toContainText(workedExample.caption.zhHans ?? workedExample.caption.zh);
}

test.describe("Mainland PEP P1-S6 lesson and Practice Arena QA gate", () => {
  test("serves all P1-S6 Mainland PEP lesson payloads, representative pages, and practice APIs", async ({ request }, testInfo) => {
    test.setTimeout(180_000);

    expect(mainlandPepPrimaryTopics).toHaveLength(24);
    expect(mainlandPepJuniorTopics).toHaveLength(11);
    expect(mainlandPepHighTopics).toHaveLength(22);
    expect(mainlandPepTopics).toHaveLength(57);

    const groups = topicsByGrade();
    Object.entries(expectedTopicCountsByGrade).forEach(([grade, expectedCount]) => {
      expect(groups.get(grade as GradeId) ?? [], `${grade} Mainland PEP lesson topics`).toHaveLength(expectedCount);
    });

    for (const [grade, topics] of groups) {
      await registerMainlandPepStudent(request, testInfo, grade);
      await expectPracticeApiPayload(request, grade);
      for (const topic of topics) {
        await expectLessonApiPayload(request, topic);
        if (representativePageTopicIds.has(topic.id)) {
          await expectLessonPageRoute(request, topic);
        }
      }
    }
  });

  test("shows approved Mainland PEP junior Lesson illustrations to students and teachers", async ({ page }, testInfo) => {
    test.setTimeout(120_000);

    for (const topicId of representativeJuniorIllustrationTopicIds) {
      const topic = mainlandPepJuniorTopics.find((candidate) => candidate.id === topicId);
      if (!topic) throw new Error(`${topicId} topic exists`);
      await registerMainlandPepStudent(page.request, testInfo, topic.grade);
      await expectJuniorLessonIllustrationsVisible(page, topicId);
    }

    await loginMainlandPepTeacher(page, "S1");
    for (const topicId of representativeJuniorIllustrationTopicIds) {
      await expectJuniorLessonIllustrationsVisible(page, topicId);
    }
  });

  test("shows approved Mainland PEP primary Lesson illustrations to students and teachers", async ({ page }, testInfo) => {
    test.setTimeout(150_000);

    for (const topicId of representativePrimaryIllustrationTopicIds) {
      const topic = mainlandPepPrimaryTopics.find((candidate) => candidate.id === topicId);
      if (!topic) throw new Error(`${topicId} topic exists`);
      await registerMainlandPepStudent(page.request, testInfo, topic.grade);
      await expectPrimaryLessonIllustrationsVisible(page, topicId);
    }

    await loginMainlandPepTeacher(page, "P1");
    for (const topicId of representativePrimaryIllustrationTopicIds) {
      await expectPrimaryLessonIllustrationsVisible(page, topicId);
    }
  });
});
