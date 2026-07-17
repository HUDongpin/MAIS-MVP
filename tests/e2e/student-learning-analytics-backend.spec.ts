import { expect, request as apiRequest, test, type APIRequestContext, type TestInfo } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

type AuthSession = {
  user: {
    id: string;
    role: "student" | "teacher" | "parent" | "admin";
  };
  settings: {
    selectedGrade: string;
  };
};

function uniqueSlug(testInfo: TestInfo, label: string) {
  return `${label}-${Date.now()}-${testInfo.workerIndex}-${testInfo.project.name}-${Math.random().toString(36).slice(2, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function newApiContext(contexts: APIRequestContext[]) {
  const context = await apiRequest.newContext({ baseURL });
  contexts.push(context);
  return context;
}

async function readJson<T>(response: Awaited<ReturnType<APIRequestContext["get"]>>, expectedStatus = 200) {
  expect(response.status()).toBe(expectedStatus);
  return await response.json() as T;
}

async function disposeAll(contexts: APIRequestContext[]) {
  await Promise.all(contexts.map((context) => context.dispose()));
}

test.describe("student learning analytics backend", () => {
  test("persists, summarizes, exports, and clears student learning events", async ({}, testInfo) => {
    const contexts: APIRequestContext[] = [];
    test.skip(testInfo.project.name !== "desktop-chrome", "API-only analytics smoke runs once.");

    try {
      const anonymous = await newApiContext(contexts);
      expect((await anonymous.get("/api/analytics/summary?grade=S3")).status()).toBe(401);
      expect((await anonymous.get("/api/analytics/export?grade=S3")).status()).toBe(401);

      const teacherSuffix = uniqueSlug(testInfo, "analytics-teacher");
      const teacher = await readJson<AuthSession>(
        await anonymous.post("/api/auth/register", {
          data: {
            role: "teacher",
            name: `Analytics Teacher ${teacherSuffix}`,
            username: `${teacherSuffix}@example.test`,
            email: `${teacherSuffix}@example.test`,
            password: "start12345",
            grade: "S3",
            curriculumTrack: "HK"
          }
        })
      );
      expect(teacher.user.role).toBe("teacher");
      expect((await anonymous.get("/api/analytics/summary?grade=S3")).status()).toBe(403);
      expect((await anonymous.get("/api/analytics/export?grade=S3")).status()).toBe(403);
      const ignoredTeacherEvent = await anonymous.post("/api/learning-events", {
        data: { events: [{ id: "bad-teacher-event" }] }
      });
      expect(ignoredTeacherEvent.status()).toBe(202);
      await anonymous.post("/api/auth/logout");

      const studentSuffix = uniqueSlug(testInfo, "analytics-student");
      const student = await readJson<AuthSession>(
        await anonymous.post("/api/auth/register", {
          data: {
            role: "student",
            name: `Analytics Student ${studentSuffix}`,
            username: `${studentSuffix}@example.test`,
            email: `${studentSuffix}@example.test`,
            password: "start12345",
            grade: "S3",
            curriculumTrack: "HK",
            language: "en",
            theme: "dark"
          }
        })
      );
      expect(student.user.role).toBe("student");
      expect(student.settings.selectedGrade).toBe("S3");

      const invalidEvent = await anonymous.post("/api/learning-events", { data: { events: [{ id: "bad" }] } });
      expect(invalidEvent.status()).toBe(400);

      const event = {
        id: `${studentSuffix}-page-view`,
        type: "page-view",
        source: "dashboard",
        timestamp: new Date().toISOString(),
        grade: "S3",
        topicId: "analytics-smoke-topic",
        durationSeconds: 30
      };
      const accepted = await readJson<{ accepted: number; lrs?: { status?: string; code?: string } }>(
        await anonymous.post("/api/learning-events", { data: { events: [event] } })
      );
      expect(accepted.accepted).toBe(1);
      expect(["disabled", "sent", "deferred"]).toContain(accepted.lrs?.status);

      const duplicate = await readJson<{ accepted: number }>(
        await anonymous.post("/api/learning-events", { data: { events: [event] } })
      );
      expect(duplicate.accepted).toBe(0);

      const summary = await readJson<{ summary: { eventCount: number; counts: { pageViews: number } } }>(
        await anonymous.get("/api/analytics/summary?grade=S3&window=7d")
      );
      expect(summary.summary.eventCount).toBeGreaterThanOrEqual(1);
      expect(summary.summary.counts.pageViews).toBeGreaterThanOrEqual(1);

      const exportedResponse = await anonymous.get("/api/analytics/export?grade=S3&window=7d");
      expect(exportedResponse.status()).toBe(200);
      expect(exportedResponse.headers()["cache-control"]).toContain("private");
      expect(exportedResponse.headers()["content-disposition"]).toContain("learning-analytics-S3.json");
      const exported = await exportedResponse.json() as { grade: string; summary: { eventCount: number } };
      expect(exported.grade).toBe("S3");
      expect(exported.summary.eventCount).toBeGreaterThanOrEqual(1);

      await readJson<{ ok: true }>(await anonymous.delete("/api/learning-events"));
      const cleared = await readJson<{ summary: { eventCount: number } }>(
        await anonymous.get("/api/analytics/summary?grade=S3&window=7d")
      );
      expect(cleared.summary.eventCount).toBe(0);
    } finally {
      await disposeAll(contexts);
    }
  });
});
