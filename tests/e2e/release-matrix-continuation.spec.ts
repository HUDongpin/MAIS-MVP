import { expect, request as apiRequest, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { gradeIds } from "../../data/grades";
import { questions } from "../../data/questions";
import {
  contentMatchesCurriculumProfile,
  curriculumProfileForPublisher,
  curriculumProfileForTrack,
  curriculumTrackForProfile
} from "../../lib/curriculumProfile";
import type { CurriculumProfile, GradeId, PublicQuestion, Question } from "../../types";
import { uniqueSuffix } from "./helpers";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const forbiddenPublicCopyPatterns = [
  /\bundefined\b/i,
  /\bNaN\b/i,
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /lorem ipsum/i,
  /source locator/i,
  /\b(?:API_KEY|POSTGRES_URL|AUTH_SESSION_SECRET|NEXTAUTH_SECRET|BEGIN PRIVATE KEY)\b/i,
  /OCR|scan artifact|screenshot artifact/i
];

type QuestionCell = {
  grade: GradeId;
  profile: CurriculumProfile;
  topicId: string;
  expectedIds: string[];
};

type AuthProfileContext = {
  context: APIRequestContext;
  profile: CurriculumProfile;
};

function profileKey(profile: CurriculumProfile) {
  return `${profile.region}:${profile.publisher}`;
}

function profileForQuestion(question: Question): CurriculumProfile {
  if (question.curriculumProfile) return question.curriculumProfile;
  if (question.publisher) return curriculumProfileForPublisher(question.publisher);
  return curriculumProfileForTrack(question.curriculumTrack);
}

function expectedQuestionCells() {
  const cells = new Map<string, QuestionCell>();

  for (const question of questions) {
    const profile = profileForQuestion(question);
    const key = `${profileKey(profile)}:${question.grade}:${question.topicId}`;
    const current = cells.get(key) ?? {
      grade: question.grade,
      profile,
      topicId: question.topicId,
      expectedIds: []
    };
    current.expectedIds.push(question.id);
    cells.set(key, current);
  }

  return Array.from(cells.values()).sort((left, right) =>
    profileKey(left.profile).localeCompare(profileKey(right.profile)) ||
    gradeIds.indexOf(left.grade) - gradeIds.indexOf(right.grade) ||
    left.topicId.localeCompare(right.topicId)
  );
}

function idsFor(questionsPayload: Array<Pick<PublicQuestion, "id">>) {
  return questionsPayload.map((question) => question.id).sort();
}

function publicQuestionMatchesProfile(question: PublicQuestion, profile: CurriculumProfile) {
  return contentMatchesCurriculumProfile({
    curriculumTrack: question.curriculumTrack,
    region: question.region,
    publisher: question.publisher
  }, profile);
}

async function registerContextForProfile(testInfo: TestInfo, profile: CurriculumProfile, grade: GradeId) {
  const context = await apiRequest.newContext({ baseURL });
  const suffix = uniqueSuffix(testInfo).replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  const response = await context.post("/api/auth/register", {
    data: {
      name: `Release Matrix ${profile.publisher} ${suffix}`,
      username: `release-matrix-${profile.publisher.toLowerCase()}-${suffix}@example.test`,
      email: `release-matrix-${profile.publisher.toLowerCase()}-${suffix}@example.test`,
      password: "matrix12345",
      grade,
      curriculumTrack: curriculumTrackForProfile(profile),
      curriculumProfile: profile,
      language: profile.region === "MAINLAND" ? "zh-Hans" : "en",
      theme: "dark"
    }
  });
  expect(response.status(), `register ${profileKey(profile)} release-matrix student`).toBe(200);
  return { context, profile } satisfies AuthProfileContext;
}

async function readQuestions(context: APIRequestContext, query: string) {
  const response = await context.get(`/api/questions?${query}`);
  expect(response.status(), `GET /api/questions?${query}`).toBe(200);
  const body = await response.json() as { questions?: PublicQuestion[] };
  expect(Array.isArray(body.questions), `/api/questions?${query} should return questions array`).toBe(true);
  return body.questions ?? [];
}

async function loginDemoStudentOnMobile(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "HK Student Peter",
      password: "12345",
      grade: "S3",
      curriculumTrack: "HK",
      language: "en",
      theme: "light"
    }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  await page.goto("/dashboard");
}

async function loginDemoTeacherOnMobile(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "HK Teacher Chan",
      password: "12345",
      grade: "S3",
      curriculumTrack: "HK",
      language: "en",
      theme: "light"
    }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  await page.goto("/teacher/dashboard");
}

function assertNoForbiddenPublicCopy(label: string, value: string) {
  for (const pattern of forbiddenPublicCopyPatterns) {
    expect(value, `${label} should not expose ${pattern}`).not.toMatch(pattern);
  }
}

test.describe("S11 release matrix continuation", () => {
  test("all live grade/topic question filters stay profile-scoped", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Full API matrix runs once on desktop.");
    test.setTimeout(300_000);

    const cells = expectedQuestionCells();
    const cellsByProfile = new Map<string, QuestionCell[]>();
    for (const cell of cells) {
      const key = profileKey(cell.profile);
      cellsByProfile.set(key, [...(cellsByProfile.get(key) ?? []), cell]);
    }

    const authContexts: AuthProfileContext[] = [];
    try {
      for (const profileCells of cellsByProfile.values()) {
        const [firstCell] = profileCells;
        authContexts.push(await registerContextForProfile(testInfo, firstCell.profile, firstCell.grade));
      }

      const matrixEvidence: Array<{ profile: string; grade: GradeId; topicId: string; expected: number; actual: number }> = [];

      for (const auth of authContexts) {
        const profileCells = cellsByProfile.get(profileKey(auth.profile)) ?? [];
        const gradeGroups = new Map<GradeId, QuestionCell[]>();
        profileCells.forEach((cell) => {
          gradeGroups.set(cell.grade, [...(gradeGroups.get(cell.grade) ?? []), cell]);
        });

        for (const [grade, gradeCells] of gradeGroups) {
          const expectedGradeIds = gradeCells.flatMap((cell) => cell.expectedIds).sort();
          const gradeQuestions = await readQuestions(auth.context, `grade=${encodeURIComponent(grade)}`);
          expect(idsFor(gradeQuestions), `${profileKey(auth.profile)} ${grade} ids`).toEqual(expectedGradeIds);
          expect(gradeQuestions.every((question) => question.grade === grade), `${profileKey(auth.profile)} ${grade} grade scope`).toBe(true);
          expect(gradeQuestions.every((question) => publicQuestionMatchesProfile(question, auth.profile)), `${profileKey(auth.profile)} ${grade} profile scope`).toBe(true);

          for (const cell of gradeCells) {
            const query = `grade=${encodeURIComponent(cell.grade)}&topicId=${encodeURIComponent(cell.topicId)}`;
            const topicQuestions = await readQuestions(auth.context, query);
            expect(idsFor(topicQuestions), `${profileKey(cell.profile)} ${cell.grade}/${cell.topicId} ids`).toEqual([...cell.expectedIds].sort());
            expect(topicQuestions.every((question) => question.topicId === cell.topicId), `${profileKey(cell.profile)} ${cell.topicId} topic scope`).toBe(true);
            expect(topicQuestions.every((question) => publicQuestionMatchesProfile(question, cell.profile)), `${profileKey(cell.profile)} ${cell.topicId} profile scope`).toBe(true);
            matrixEvidence.push({
              profile: profileKey(cell.profile),
              grade: cell.grade,
              topicId: cell.topicId,
              expected: cell.expectedIds.length,
              actual: topicQuestions.length
            });
          }
        }
      }

      await testInfo.attach("release-matrix-grade-topic-filter.json", {
        body: JSON.stringify({ checkedCells: matrixEvidence.length, cells: matrixEvidence }, null, 2),
        contentType: "application/json"
      });
    } finally {
      await Promise.all(authContexts.map(async (auth) => auth.context.dispose()));
    }
  });

  test("mistake book and lesson progress persist across fresh sessions", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Persistence API matrix runs once on desktop.");
    test.setTimeout(90_000);

    const firstContext = await apiRequest.newContext({ baseURL });
    const secondContext = await apiRequest.newContext({ baseURL });
    const thirdContext = await apiRequest.newContext({ baseURL });
    const suffix = uniqueSuffix(testInfo).replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    const username = `release-persistence-${suffix}@example.test`;
    const password = "matrix12345";

    try {
      const register = await firstContext.post("/api/auth/register", {
        data: {
          name: `Release Persistence ${suffix}`,
          username,
          email: username,
          password,
          grade: "S3",
          curriculumTrack: "HK",
          curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
          language: "en",
          theme: "dark"
        }
      });
      expect(register.status()).toBe(200);

      const wrongAttempt = await firstContext.post("/api/attempts", {
        data: {
          questionId: "q5",
          selectedAnswer: "__not_the_axis__",
          durationSeconds: 42
        }
      });
      expect(wrongAttempt.status()).toBe(200);
      expect((await wrongAttempt.json() as { correct: boolean }).correct).toBe(false);

      const lessonProgress = await firstContext.post("/api/lesson-progress", {
        data: {
          slug: "quadratic-functions",
          action: "complete",
          durationSeconds: 660,
          checklistState: { concept: true, practice: true, reflection: true }
        }
      });
      expect(lessonProgress.status()).toBe(200);
      const lessonProgressBody = await lessonProgress.json() as { lesson: { status: string; mastery: number } };
      expect(lessonProgressBody.lesson.status).toBe("completed");
      expect(lessonProgressBody.lesson.mastery).toBeGreaterThanOrEqual(85);

      await firstContext.dispose();

      const loginAgain = await secondContext.post("/api/auth/login", {
        data: {
          username,
          password,
          grade: "S3",
          language: "en",
          theme: "dark"
        }
      });
      expect(loginAgain.status()).toBe(200);

      const activeMistakes = await secondContext.get("/api/mistakes?status=active");
      expect(activeMistakes.status()).toBe(200);
      const activeMistakeBody = await activeMistakes.json() as { mistakes: Array<{ question: { id: string }; mastered: boolean }> };
      expect(activeMistakeBody.mistakes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            mastered: false,
            question: expect.objectContaining({ id: "q5" })
          })
        ])
      );

      const persistedLesson = await secondContext.get("/api/lessons/quadratic-functions");
      expect(persistedLesson.status()).toBe(200);
      const persistedLessonBody = await persistedLesson.json() as { lesson: { status: string; mastery: number; checklistState: Record<string, boolean> } };
      expect(persistedLessonBody.lesson.status).toBe("completed");
      expect(persistedLessonBody.lesson.mastery).toBeGreaterThanOrEqual(85);
      expect(persistedLessonBody.lesson.checklistState).toMatchObject({ concept: true, practice: true, reflection: true });

      const progress = await secondContext.get("/api/progress?grade=S3&window=7d");
      expect(progress.status()).toBe(200);
      const progressBody = await progress.json() as { progress: { totalMinutes: number; weeklyActivity: unknown[] } };
      expect(progressBody.progress.totalMinutes).toBeGreaterThanOrEqual(10);
      expect(progressBody.progress.weeklyActivity.length).toBeGreaterThan(0);

      const mastered = await secondContext.patch("/api/mistakes/q5");
      expect(mastered.status()).toBe(200);
      expect((await mastered.json() as { mistake: { mastered: boolean } }).mistake.mastered).toBe(true);
      await secondContext.dispose();

      const finalLogin = await thirdContext.post("/api/auth/login", {
        data: {
          username,
          password,
          grade: "S3",
          language: "en",
          theme: "dark"
        }
      });
      expect(finalLogin.status()).toBe(200);
      const masteredMistakes = await thirdContext.get("/api/mistakes?status=mastered");
      expect(masteredMistakes.status()).toBe(200);
      const masteredBody = await masteredMistakes.json() as { mistakes: Array<{ question: { id: string }; mastered: boolean }> };
      expect(masteredBody.mistakes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            mastered: true,
            question: expect.objectContaining({ id: "q5" })
          })
        ])
      );
    } finally {
      await Promise.all([secondContext.dispose(), thirdContext.dispose()].map(async (promise) => promise.catch(() => undefined)));
    }
  });

  test("public pages and public question payloads avoid internal guardrail copy", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Public copy guardrail runs once on desktop.");
    test.setTimeout(120_000);

    for (const route of ["/", "/login", "/register", "/practice", "/student/roadmap", "/student/tools/visualizations"]) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route} should render`).toBeLessThan(400);
      assertNoForbiddenPublicCopy(route, await page.locator("body").innerText());
    }

    for (const grade of gradeIds.filter((grade) => grade !== "K")) {
      const response = await request.get(`/api/questions?grade=${encodeURIComponent(grade)}`);
      expect(response.status(), `public HK /api/questions grade ${grade}`).toBe(200);
      const payload = await response.json() as { questions?: PublicQuestion[] };
      const serialized = JSON.stringify({
        grade,
        questions: (payload.questions ?? []).map((question) => ({
          id: question.id,
          topic: question.topic,
          prompt: question.prompt,
          options: question.options,
          diagram: question.diagram,
          questionAssets: question.questionAssets
        }))
      });
      assertNoForbiddenPublicCopy(`public HK questions ${grade}`, serialized);
    }
  });

  test("mobile student and teacher release surfaces remain reachable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "Mobile release matrix runs only on mobile.");
    test.setTimeout(120_000);

    await loginDemoStudentOnMobile(page);
    await expect(page.locator("main")).toContainText(/Welcome back/i);
    await expect(page.locator("main")).toContainText(/HK Student Peter/i);
    await page.goto("/practice");
    await expect(page).toHaveURL(/\/practice$/);
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await expect(page.getByRole("region", { name: /Practice questions/i }).getByText(/Question 1 of/i)).toBeVisible({ timeout: 20_000 });
    await page.goto("/personalized-learning");
    await expect(page.locator("main")).toContainText(/Adaptive Practice Mission|Progress|Recommended next/i);
    await page.goto("/mistake-book");
    await expect(page.getByRole("heading", { name: /Mistake Book/i })).toBeVisible();

    await page.request.post("/api/auth/logout");
    await loginDemoTeacherOnMobile(page);
    await expect(page.locator("main")).toContainText(/teaching queue|Teacher dashboard/i);
    await page.goto("/teacher/classes");
    await expect(page).toHaveURL(/\/teacher\/classes/);
    await expect(page.getByRole("heading", { name: /Class and student management/i })).toBeVisible();
    await page.goto("/teacher/assignments");
    await expect(page).toHaveURL(/\/teacher\/assignments/);
    await expect(page.getByRole("heading", { name: /Assignment distribution/i })).toBeVisible();
  });
});
