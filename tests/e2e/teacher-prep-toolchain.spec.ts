import { expect, test, type Page } from "@playwright/test";
import { demoTeacher, uniqueSuffix } from "./helpers";
import { startIsolatedApp } from "./isolated-app";

test.setTimeout(180_000);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function localizedTextPattern(value: { en: string; zh: string; zhHans?: string }) {
  const texts = Array.from(new Set([value.en, value.zh, value.zhHans].filter((text): text is string => Boolean(text))));
  return new RegExp(`^(?:${texts.map(escapeRegex).join("|")})$`, "i");
}

async function loginTeacher(page: Page, baseURL: string) {
  const response = await page.request.post(`${baseURL}/api/auth/login`, {
    data: {
      username: demoTeacher.username,
      password: demoTeacher.password,
      grade: "S3",
      language: "zh-Hans",
      theme: "light"
    }
  });
  expect(response.ok(), `Teacher login failed with ${response.status()}`).toBeTruthy();
}

test.describe("mainland teacher prep toolchain", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Prep toolchain writes isolated local data and runs once.");
  });

  test("creates, reviews, publishes, presents, controls, and gates AI generation without LLM config", async ({ page }, testInfo) => {
    const app = await startIsolatedApp(`teacher-prep-${uniqueSuffix(testInfo)}`, testInfo, {
      env: {
        DEEPSEEK_API_KEY: "",
        DEEPSEEK_API_URL: "",
        DEEPSEEK_MODEL: "",
        LLM_API_KEY: "",
        LLM_API_URL: "",
        LLM_MODEL: ""
      },
      warmPaths: ["/teacher/lesson-kits", "/teacher/lesson-kits/new"]
    });

    try {
      await loginTeacher(page, app.baseURL);
      await app.assertAlive("after-login");

      const listResponse = await page.request.get(app.url("/api/teacher/lesson-kits"));
      expect(listResponse.ok()).toBeTruthy();
      await app.assertAlive("after-list");
      const listPayload = await listResponse.json() as {
        data: {
          classes: Array<{ id: string; grade: string }>;
          topicOptions: Array<{ id: string; grade: string; publisher?: string }>;
        };
      };
      const targetClass = listPayload.data.classes[0];
      if (!targetClass) {
        test.skip(true, "No seeded teacher class is available.");
        return;
      }
      const targetTopic = listPayload.data.topicOptions.find((topic) => topic.grade === targetClass.grade && topic.publisher === "MAINLAND_PEP")
        ?? listPayload.data.topicOptions.find((topic) => topic.grade === targetClass.grade && topic.publisher === "MAINLAND_BNU");
      if (!targetTopic) {
        test.skip(true, "No mainland PEP/BNU topic is available for the seeded teacher class.");
        return;
      }

      const createResponse = await page.request.post(app.url("/api/teacher/lesson-kits"), {
        data: {
          classId: targetClass.id,
          publisher: targetTopic.publisher,
          topicId: targetTopic.id,
          lessonPeriod: 1,
          lessonType: "new-lesson",
          durationMinutes: 45
        }
      });
      expect(createResponse.status()).toBe(201);
      const created = await createResponse.json() as { kit: { id: string; sections: unknown[]; lessonTitle: { en: string; zh: string; zhHans?: string } } };
      expect(created.kit.sections.length).toBeGreaterThan(5);
      await app.assertAlive("after-create");

      const generateResponse = await page.request.post(app.url(`/api/teacher/lesson-kits/${created.kit.id}/generation-runs`));
      expect(generateResponse.status()).toBe(503);
      await app.assertAlive("after-generation-503");

      const reviewResponse = await page.request.patch(app.url(`/api/teacher/lesson-kits/${created.kit.id}`), {
        data: { reviewStatus: "approved" }
      });
      expect(reviewResponse.ok()).toBeTruthy();
      await app.assertAlive("after-review");

      const publishResponse = await page.request.post(app.url(`/api/teacher/lesson-kits/${created.kit.id}/publications`));
      expect(publishResponse.ok()).toBeTruthy();
      const published = await publishResponse.json() as { kit: { liveSessionId?: string; publishedResourceIds: string[] } };
      expect(published.kit.publishedResourceIds.length).toBe(3);
      expect(published.kit.liveSessionId).toBeTruthy();
      await app.assertAlive("after-publish");

      await page.goto(app.url(`/teacher/lesson-kits/${created.kit.id}`));
      await expect(page.getByRole("heading", { name: localizedTextPattern(created.kit.lessonTitle), level: 1 })).toBeVisible();
      await app.assertAlive("after-detail-page");

      await page.goto(app.url(`/teacher/classroom-sessions/${published.kit.liveSessionId}/presenter`));
      await expect(page.getByText(/Class code|课堂码|課堂碼/i)).toBeVisible();
      await app.assertAlive("after-presenter-page");

      await page.goto(app.url(`/teacher/classroom-sessions/${published.kit.liveSessionId}/controller`));
      await expect(page.getByText(/Upload work|上传作品|上載作品/i)).toBeVisible();
      await app.assertAlive("after-controller-page");
    } finally {
      await app.attachLogs(testInfo, "teacher-prep-isolated-app.log");
      await app.stop();
    }
  });
});
