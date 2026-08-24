import { expect, request as apiRequest, test, type APIRequestContext } from "@playwright/test";
import { collectPageErrors, demoParent, demoStudent, demoTeacher } from "./helpers";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

test.setTimeout(180_000);

type LiveSessionPayload = {
  session: {
    id: string;
    joinCode: string;
    currentPrompt?: { id: string };
  };
};

async function loginContext(app: IsolatedApp, username: string, password: string) {
  const context = await apiRequest.newContext({ baseURL: app.baseURL });
  const response = await context.post("/api/auth/login", {
    data: {
      username,
      password,
      grade: "S3",
      language: "en",
      theme: "light"
    }
  });
  expect(response.ok(), `login ${username} failed with ${response.status()}`).toBeTruthy();
  return context;
}

async function disposeContexts(contexts: APIRequestContext[]) {
  await Promise.all(contexts.map(async (context) => {
    await context.dispose().catch(() => undefined);
  }));
}

test.describe("teacher and parent P1 regressions", () => {
  test.describe.configure({ retries: 0 });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "P1 regression coverage runs once on desktop Chrome.");
  });

  test("ended live-classroom join codes are no longer readable by students", async ({}, testInfo) => {
    const app = await startIsolatedApp("live-classroom-lifecycle-p1", testInfo);
    const contexts: APIRequestContext[] = [];

    try {
      const teacher = await loginContext(app, demoTeacher.username, demoTeacher.password);
      const student = await loginContext(app, demoStudent.username, demoStudent.password);
      contexts.push(teacher, student);

      const liveStart = await teacher.post("/api/teacher/live", {
        data: {
          classId: "class-s3a-2026",
          promptType: "poll",
          question: "Lifecycle regression prompt",
          correctOptionId: "a",
          topicId: "quadratic-functions"
        }
      });
      expect(liveStart.status()).toBe(201);
      const livePayload = await liveStart.json() as LiveSessionPayload;
      expect(livePayload.session.joinCode).toBeTruthy();
      expect(livePayload.session.currentPrompt?.id).toBeTruthy();

      const activeStudentJoin = await student.get(`/api/classroom/live?code=${encodeURIComponent(livePayload.session.joinCode)}`);
      expect(activeStudentJoin.status()).toBe(200);

      const liveEnd = await teacher.patch("/api/teacher/live", {
        data: { sessionId: livePayload.session.id, status: "ended" }
      });
      expect(liveEnd.status()).toBe(200);

      const endedStudentJoin = await student.get(`/api/classroom/live?code=${encodeURIComponent(livePayload.session.joinCode)}`);
      expect(endedStudentJoin.status()).toBe(404);

      const endedTeacherPreview = await teacher.get(`/api/classroom/live?code=${encodeURIComponent(livePayload.session.joinCode)}`);
      expect(endedTeacherPreview.status()).toBe(200);
    } finally {
      await disposeContexts(contexts);
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });

  test("teacher and parent SSR timestamps hydrate without page errors across UTC server and Hong Kong browser", async ({ browser }, testInfo) => {
    const app = await startIsolatedApp("teacher-parent-hydration-p1", testInfo, {
      env: { TZ: "UTC" }
    });
    const context = await browser.newContext({
      baseURL: app.baseURL,
      timezoneId: "Asia/Hong_Kong"
    });

    try {
      const teacherLogin = await context.request.post("/api/auth/login", {
        data: {
          username: demoTeacher.username,
          password: demoTeacher.password,
          grade: "S3",
          language: "en",
          theme: "light"
        }
      });
      expect(teacherLogin.status()).toBe(200);
      const teacherPage = await context.newPage();
      const teacherErrors = collectPageErrors(teacherPage);
      for (const route of ["/teacher", "/teacher/reports", "/teacher/rewards", "/teacher/classes/class-s3a-2026"]) {
        await teacherPage.goto(route);
        await expect(teacherPage.locator("main")).toBeVisible();
        expect(teacherErrors, `teacher hydration errors after ${route}`).toEqual([]);
      }

      const parentLogin = await context.request.post("/api/auth/login", {
        data: {
          username: demoParent.username,
          password: demoParent.password,
          grade: "S3",
          language: "en",
          theme: "light"
        }
      });
      expect(parentLogin.status()).toBe(200);
      const parentPage = await context.newPage();
      const parentErrors = collectPageErrors(parentPage);
      for (const route of ["/parent", "/parent/reports", "/parent/children/student-peter"]) {
        await parentPage.goto(route);
        await expect(parentPage.locator("main")).toBeVisible();
        await expect(parentPage.locator("[data-parent-shell]"), `one parent shell after ${route}`).toHaveCount(1);
        expect(parentErrors, `parent hydration errors after ${route}`).toEqual([]);
      }

      const parentHtml = await (await parentPage.request.get("/parent")).text();
      expect(parentHtml).not.toContain('<template id="B:');
      expect(parentHtml).not.toContain('<div hidden id="S:');
    } finally {
      await context.close();
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });
});
