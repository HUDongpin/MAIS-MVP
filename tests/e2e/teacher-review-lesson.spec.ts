import { expect, request as apiRequest, test, type APIRequestContext, type APIResponse, type TestInfo } from "@playwright/test";
import { authenticateAsTeacher, demoTeacherUserId, sessionCookieHeaderForUserId } from "./helpers";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

type AuthSession = {
  user: {
    id: string;
    username: string;
  };
};

async function readJson<T>(response: APIResponse, expectedStatus = 200) {
  expect(response.status()).toBe(expectedStatus);
  return await response.json() as T;
}

async function newApiContext(contexts: APIRequestContext[], cookieHeader?: string) {
  const context = await apiRequest.newContext({
    baseURL,
    ...(cookieHeader ? { extraHTTPHeaders: { Cookie: cookieHeader } } : {})
  });
  contexts.push(context);
  return context;
}

function uniqueSlug(testInfo: TestInfo, label: string) {
  return `${label}-${testInfo.workerIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function loginTeacher(contexts: APIRequestContext[]) {
  return newApiContext(contexts, await sessionCookieHeaderForUserId(demoTeacherUserId));
}

async function registerStudent(contexts: APIRequestContext[], testInfo: TestInfo, label: string) {
  const context = await newApiContext(contexts);
  const id = uniqueSlug(testInfo, label);
  const session = await readJson<AuthSession>(
    await context.post("/api/auth/register", {
      data: {
        name: `Review Lesson Student ${id}`,
        username: `${id}@example.test`,
        email: `${id}@example.test`,
        password: "start12345",
        grade: "S3",
        curriculumTrack: "HK",
        curriculumProfile: {
          region: "HK",
          publisher: "HK_UNITED_PRIME_MIA"
        },
        language: "en",
        theme: "dark"
      }
    })
  );
  return { context, userId: session.user.id, username: session.user.username };
}

test.describe("teacher review lesson UI", () => {
  test("opens generated review lesson, saves edits, and exposes PPTX export", async ({ page }, testInfo) => {
    const contexts: APIRequestContext[] = [];
    try {
      const teacher = await loginTeacher(contexts);
      const student = await registerStudent(contexts, testInfo, "review-ui-correct");
      const peer = await registerStudent(contexts, testInfo, "review-ui-wrong");

      const createdClass = await readJson<{ class: { id: string } }>(
        await teacher.post("/api/teacher/classes", {
          data: {
            name: `Review UI Class ${uniqueSlug(testInfo, "class")}`,
            grade: "S3",
            academicYear: "2026-2027"
          }
        }),
        201
      );

      await readJson<{ ok: true }>(
        await teacher.post(`/api/teacher/classes/${createdClass.class.id}/students`, {
          data: { username: student.username }
        }),
        201
      );
      await readJson<{ ok: true }>(
        await teacher.post(`/api/teacher/classes/${createdClass.class.id}/students`, {
          data: { username: peer.username }
        }),
        201
      );

      const assessment = await readJson<{ assessment: { id: string } }>(
        await teacher.post("/api/teacher/assessments", {
          data: {
            classId: createdClass.class.id,
            title: "Review UI Quiz",
            type: "quiz",
            sourceType: "manual",
            manualQuestions: [
              {
                id: "manual-1",
                prompt: { en: "What is 2 + 2?", zh: "2 + 2 是多少？", zhHans: "2 + 2 是多少？" },
                answer: "4",
                points: 10
              }
            ],
            randomizeQuestionOrder: false,
            showAnswersImmediately: true
          }
        }),
        201
      );

      await readJson<{ submission: { score: number } }>(
        await student.context.post(`/api/assessments/${assessment.assessment.id}/submit`, {
          data: { answers: [{ questionId: "manual-1", answer: "4" }] }
        })
      );
      await readJson<{ submission: { score: number } }>(
        await peer.context.post(`/api/assessments/${assessment.assessment.id}/submit`, {
          data: { answers: [{ questionId: "manual-1", answer: "3" }] }
        })
      );

      const reviewLesson = await readJson<{ reviewLesson: { id: string } }>(
        await teacher.post(`/api/teacher/assessments/${assessment.assessment.id}/review-lessons`, {
          data: { language: "en" }
        }),
        201
      );

      await authenticateAsTeacher(page);
      await page.goto(`/teacher/assessments/${assessment.assessment.id}/review-lessons/${reviewLesson.reviewLesson.id}`);

      await expect(page.getByRole("heading", { name: "Question triage" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Quick review/ })).toBeVisible();
      await expect(page.getByRole("link", { name: "PPTX" })).toBeVisible();

      await page.locator("input").first().fill("Edited UI review lesson");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Saved.")).toBeVisible();

      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("link", { name: "PPTX" }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pptx$/);
    } finally {
      await Promise.all(contexts.map((context) => context.dispose()));
    }
  });
});
