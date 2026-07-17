import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import {
  mainlandPepHighLessonIllustrationWithdrawal,
  mainlandPepHighLessonIllustrations
} from "../../data/mainlandPepHighLessonIllustrations";
import { mainlandPepHighLessonSeeds } from "../../data/mainlandPepHighLessons";
import { mainlandPepHighTopics } from "../../data/mainlandPepHighTopics";
import { lessonSlugForTopicId } from "../../lib/lessonLinks";
import type { GradeId } from "../../types";

const requiredBlockTypes = new Set(["concept", "worked-example", "checklist", "practice", "extension"]);
const expectedTopicCountsByGrade: Record<"S4" | "S5" | "S6", number> = {
  S4: 10,
  S5: 5,
  S6: 7
};

const representativeRouteTopicIds = [
  "pep-high-s4-quadratic-inequalities",
  "pep-high-s5-derivatives",
  "pep-high-s6-probability-statistics-synthesis"
] as const;

type MainlandPepLessonPayload = {
  lesson?: {
    slug?: string;
    topicId?: string;
    grade?: GradeId;
    topic?: {
      curriculumTrack?: string;
      publisher?: string;
    };
    title?: {
      en?: string;
      zh?: string;
    };
    description?: {
      en?: string;
      zh?: string;
    };
    blocks?: Array<{ type?: string }>;
    practiceQuestions?: Array<{
      curriculumTrack?: string;
      publisher?: string;
    }>;
  };
};

function topicsByGrade() {
  const groups = new Map<"S4" | "S5" | "S6", typeof mainlandPepHighTopics>();
  mainlandPepHighTopics.forEach((topic) => {
    const grade = topic.grade as "S4" | "S5" | "S6";
    groups.set(grade, [...(groups.get(grade) ?? []), topic]);
  });
  return groups;
}

function uniqueUsername(testInfo: TestInfo, grade: GradeId) {
  return [
    "mainland-pep-high-lesson-smoke",
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

async function registerMainlandPepHighStudent(request: APIRequestContext, testInfo: TestInfo, grade: GradeId) {
  const username = `${uniqueUsername(testInfo, grade)}@example.test`;
  const response = await request.post("/api/auth/register", {
    data: {
      name: `Mainland PEP High Lesson Smoke ${grade}`,
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
  expect(response.status(), `register ${grade} Mainland PEP high smoke student`).toBe(200);
}

async function expectLessonApiPayload(request: APIRequestContext, topic: (typeof mainlandPepHighTopics)[number]) {
  const slug = lessonSlugForTopicId(topic.id);
  const response = await request.get(`/api/lessons/${encodeURIComponent(slug)}`);
  expect(response.status(), `GET /api/lessons/${slug}`).toBe(200);

  const body = await response.json() as MainlandPepLessonPayload;
  const lesson = body.lesson;
  expect(lesson, `${slug} lesson payload`).toBeTruthy();
  expect(lesson?.slug).toBe(slug);
  expect(lesson?.topicId).toBe(topic.id);
  expect(lesson?.grade).toBe(topic.grade);
  expect(lesson?.topic?.curriculumTrack).toBe("MAINLAND_PEP_HIGH");
  expect(lesson?.topic?.publisher).toBe("MAINLAND_PEP");
  expect(lesson?.title?.en?.trim()).toBeTruthy();
  expect(lesson?.title?.zh?.trim()).toBeTruthy();
  expect(lesson?.description?.en?.trim()).toBeTruthy();
  expect(lesson?.description?.zh?.trim()).toBeTruthy();
  expect(lesson?.practiceQuestions?.length ?? 0, `${slug} linked practice questions`).toBeGreaterThan(0);
  expect(
    lesson?.practiceQuestions?.every((question) =>
      question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_PEP"
    ) ?? false,
    `${slug} practice questions stay Mainland PEP high scoped`
  ).toBe(true);

  const blockTypes = new Set((lesson?.blocks ?? []).map((block) => block.type));
  requiredBlockTypes.forEach((type) => {
    expect(blockTypes.has(type), `${slug} includes ${type} block`).toBe(true);
  });

  const renderedText = JSON.stringify({
    title: lesson?.title,
    description: lesson?.description,
    blocks: lesson?.blocks
  });
  expect(renderedText).not.toMatch(/\b(?:undefined|NaN)\b/i);
  expect(renderedText).not.toMatch(/OCR|扫描|截图|source locator|PDF page/i);
}

async function routeSmoke(page: Page, topicId: (typeof representativeRouteTopicIds)[number], testInfo: TestInfo) {
  const topic = mainlandPepHighTopics.find((candidate) => candidate.id === topicId);
  if (!topic) throw new Error(`${topicId} topic exists`);

  await registerMainlandPepHighStudent(page.request, testInfo, topic.grade);

  const slug = lessonSlugForTopicId(topicId);
  const apiResponse = await page.request.get(`/api/lessons/${encodeURIComponent(slug)}`);
  expect(apiResponse.status(), `GET /api/lessons/${slug}`).toBe(200);
  const apiBody = await apiResponse.json() as MainlandPepLessonPayload;
  const titlePattern = new RegExp(
    [apiBody.lesson?.title?.en, apiBody.lesson?.title?.zh, topic.title.en, topic.title.zh]
      .filter((title): title is string => Boolean(title?.trim()))
      .map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")
  );

  const response = await page.goto(`/student/lessons/${encodeURIComponent(slug)}`, { waitUntil: "domcontentloaded" });
  expect(response, `GET /student/lessons/${slug} returned a navigation response`).toBeTruthy();
  expect(response!.status(), `GET /student/lessons/${slug}`).toBeLessThan(400);
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

  await expect(page.locator("main"), `${slug} visible lesson title`).toContainText(titlePattern, { timeout: 45_000 });
  await expect(page.locator("body"), `${slug} not-found guard`).not.toContainText(/Lesson not found|This page is not available/i);
  await expect(page.locator(".katex-error"), `${slug} KaTeX errors`).toHaveCount(0);
  const lessonIllustrations = page.locator(`img[src*="mainland-pep-high"][src*="${topicId}"]`);
  const approvedIllustrations = mainlandPepHighLessonIllustrations.filter((illustration) => illustration.topicId === topicId);
  if (approvedIllustrations.length > 0) {
    await expect(
      lessonIllustrations,
      `${slug} approved high-school lesson illustrations`
    ).toHaveCount(approvedIllustrations.length);
  } else {
    expect(mainlandPepHighLessonIllustrationWithdrawal.decision).toBe("withdrawn-owner-rejected");
    await expect(
      lessonIllustrations,
      `${slug} high-school illustrations stay withdrawn until owner-approved redraw`
    ).toHaveCount(0);
  }

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(horizontalOverflow, `${slug} horizontal overflow`).toBeLessThanOrEqual(2);
}

test.describe("Mainland PEP High S4-S6 lesson release smoke", () => {
  test("keeps all 22 approved high-school lessons available through the Lesson API", async ({ request }, testInfo) => {
    test.setTimeout(120_000);

    expect(mainlandPepHighTopics).toHaveLength(22);
    expect(mainlandPepHighLessonSeeds).toHaveLength(22);
    expect(new Set(mainlandPepHighLessonSeeds.map((seed) => seed.topicId))).toEqual(new Set(mainlandPepHighTopics.map((topic) => topic.id)));
    expect(mainlandPepHighLessonSeeds.every((seed) => seed.productionReady)).toBe(true);

    const groups = topicsByGrade();
    Object.entries(expectedTopicCountsByGrade).forEach(([grade, expectedCount]) => {
      expect(groups.get(grade as "S4" | "S5" | "S6") ?? [], `${grade} Mainland PEP high topics`).toHaveLength(expectedCount);
    });

    for (const [grade, topics] of groups) {
      await registerMainlandPepHighStudent(request, testInfo, grade);
      for (const topic of topics) {
        await expectLessonApiPayload(request, topic);
      }
    }
  });

  test("renders S4, S5, and S6 representative student lesson routes on desktop and mobile", async ({ page }, testInfo) => {
    test.setTimeout(180_000);

    for (const topicId of representativeRouteTopicIds) {
      await routeSmoke(page, topicId, testInfo);
    }
  });
});
