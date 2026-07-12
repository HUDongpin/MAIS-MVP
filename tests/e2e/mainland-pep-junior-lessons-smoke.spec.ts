import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mainlandPepJuniorTopics } from "../../data/mainlandPepJuniorTopics";
import { lessonSlugForTopicId } from "../../lib/lessonLinks";
import type { GradeId } from "../../types";

type LessonApiPayload = {
  lesson?: {
    slug: string;
    topicId: string;
    grade: GradeId;
    publisher?: string;
    topic?: {
      curriculumTrack?: string;
      publisher?: string;
    };
    title?: {
      en?: string;
      zh?: string;
      zhHans?: string;
    };
    description?: {
      en?: string;
      zh?: string;
      zhHans?: string;
    };
    blocks?: Array<{ type?: string }>;
    practiceQuestions?: Array<{
      id?: string;
      curriculumTrack?: string;
      publisher?: string;
    }>;
  };
};

const expectedTopicCountsByGrade: Partial<Record<GradeId, number>> = {
  S1: 5,
  S2: 4,
  S3: 2
};
const smokeGrades = ["S1", "S2", "S3"] as const satisfies readonly GradeId[];
const requiredBlockTypes = new Set(["concept", "worked-example", "checklist", "practice", "extension"]);

function topicsByGrade() {
  const groups = new Map<GradeId, typeof mainlandPepJuniorTopics>();
  mainlandPepJuniorTopics.forEach((topic) => {
    groups.set(topic.grade, [...(groups.get(topic.grade) ?? []), topic]);
  });
  return groups;
}

function uniqueUsername(testInfo: TestInfo, grade: GradeId) {
  return [
    "mainland-pep-junior-route-smoke",
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

async function registerMainlandPepStudent(page: Page, testInfo: TestInfo, grade: GradeId) {
  const username = `${uniqueUsername(testInfo, grade)}@example.test`;
  const response = await page.request.post("/api/auth/register", {
    data: {
      name: `Mainland PEP Junior Route Smoke ${grade}`,
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

  expect(response.status(), `register Mainland PEP ${grade} smoke student`).toBe(200);

  const session = await page.request.get("/api/me");
  expect(session.status(), `GET /api/me after ${grade} registration`).toBe(200);
  const body = await session.json();
  expect(body.user?.grade, `${grade} session grade`).toBe(grade);
  expect(body.user?.curriculumTrack, `${grade} session curriculum track`).toBe("MAINLAND_PEP_HIGH");
  expect(body.user?.curriculumProfile?.publisher, `${grade} session publisher`).toBe("MAINLAND_PEP");
}

async function expectLessonApi(page: Page, topic: (typeof mainlandPepJuniorTopics)[number]) {
  const slug = lessonSlugForTopicId(topic.id);
  const response = await page.request.get(`/api/lessons/${encodeURIComponent(slug)}`);
  expect(response.status(), `GET /api/lessons/${slug}`).toBe(200);

  const body = (await response.json()) as LessonApiPayload;
  const lesson = body.lesson;
  expect(lesson?.slug, `${slug} API slug`).toBe(slug);
  expect(lesson?.topicId, `${slug} API topic`).toBe(topic.id);
  expect(lesson?.grade, `${slug} API grade`).toBe(topic.grade);
  expect(lesson?.publisher, `${slug} API publisher`).toBe("MAINLAND_PEP");
  expect(lesson?.topic?.curriculumTrack, `${slug} API topic track`).toBe("MAINLAND_PEP_HIGH");
  expect(lesson?.topic?.publisher, `${slug} API topic publisher`).toBe("MAINLAND_PEP");
  expect(lesson?.title?.en?.trim(), `${slug} English title`).toBeTruthy();
  expect((lesson?.title?.zhHans ?? lesson?.title?.zh)?.trim(), `${slug} Simplified Chinese title`).toBeTruthy();
  expect(lesson?.description?.en?.trim(), `${slug} English description`).toBeTruthy();
  expect((lesson?.description?.zhHans ?? lesson?.description?.zh)?.trim(), `${slug} Simplified Chinese description`).toBeTruthy();
  expect(lesson?.practiceQuestions?.length ?? 0, `${slug} linked practice questions`).toBeGreaterThan(0);
  expect(
    lesson?.practiceQuestions?.every(
      (question) => question.curriculumTrack === "MAINLAND_PEP_HIGH" && question.publisher === "MAINLAND_PEP"
    ) ?? false,
    `${slug} practice questions stay Mainland PEP scoped`
  ).toBe(true);

  const blockTypes = new Set((lesson?.blocks ?? []).map((block) => block.type));
  requiredBlockTypes.forEach((blockType) => {
    expect(blockTypes.has(blockType), `${slug} includes ${blockType} block`).toBe(true);
  });

  return lesson;
}

async function expectLessonPage(page: Page, topic: (typeof mainlandPepJuniorTopics)[number]) {
  const slug = lessonSlugForTopicId(topic.id);
  const title = topic.title.zhHans ?? topic.title.zh ?? topic.title.en;
  const main = page.locator("main");

  await page.goto(`/student/lessons/${encodeURIComponent(slug)}`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/student/lessons/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  await expect(main, `${slug} page contains the topic title`).toContainText(title, { timeout: 45_000 });
  await expect(main, `${slug} page contains lesson concept surface`).toContainText(/Core concept|核心概念/i);
  await expect(main, `${slug} page contains practice surface`).toContainText(/Question 1 of|第 1 題，共|第 1 题，共/i);
  await expect(main, `${slug} page has no not-found or invalid placeholders`).not.toContainText(
    /Lesson not found|This page is not available|undefined|NaN/i
  );
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
}

test.describe("Mainland PEP Junior S1-S3 lesson route smoke", () => {
  for (const grade of smokeGrades) {
    test(`serves ${grade} lesson API payloads and browser routes`, async ({ page }, testInfo) => {
      test.setTimeout(240_000);

      expect(mainlandPepJuniorTopics).toHaveLength(11);
      const groups = topicsByGrade();
      Object.entries(expectedTopicCountsByGrade).forEach(([candidateGrade, expectedCount]) => {
        expect(groups.get(candidateGrade as GradeId) ?? [], `${candidateGrade} Mainland PEP Junior topics`).toHaveLength(expectedCount);
      });

      const gradeTopics = groups.get(grade) ?? [];
      const expectedGradeTopicCount = expectedTopicCountsByGrade[grade];
      if (typeof expectedGradeTopicCount !== "number") {
        throw new Error(`${grade} expected topic count is not configured.`);
      }
      expect(gradeTopics, `${grade} Mainland PEP Junior route smoke inventory`).toHaveLength(expectedGradeTopicCount);

      const pageErrors: string[] = [];
      const failedGetResponses: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("response", (response) => {
        if (response.request().method() !== "GET" || response.status() < 400) return;
        const url = new URL(response.url());
        if (url.pathname.startsWith("/_next/")) return;
        if (url.pathname === "/favicon.ico" || url.pathname === "/icon.svg" || url.pathname === "/icon.png") return;
        if (url.pathname === "/api/me" && response.status() === 401) return;
        failedGetResponses.push(`${response.status()} ${url.pathname}`);
      });

      await registerMainlandPepStudent(page, testInfo, grade);
      for (const topic of gradeTopics) {
        await expectLessonApi(page, topic);
        await expectLessonPage(page, topic);
      }

      expect(failedGetResponses, `No failed route, API, or lesson asset GETs during the ${grade} browser smoke`).toEqual([]);
      expect(pageErrors, `No uncaught browser page errors during the ${grade} browser smoke`).toEqual([]);
    });
  }
});
