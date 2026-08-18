import { expect, test, type Page } from "@playwright/test";
import { demoTeacher, expectDownloadFrom, uniqueSuffix } from "./helpers";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

test.setTimeout(240_000);

type TeacherRouteProbe = {
  path: string;
  heading: RegExp;
  label: string;
  minTextLength?: number;
};

type RuntimeIssues = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  serverResponses: string[];
  secretLeaks: string[];
};

const teacherRoutes: TeacherRouteProbe[] = [
  { path: "/teacher", heading: /Today.?s teaching queue|Teacher Console|Class command center/i, label: "overview" },
  { path: "/teacher/classes", heading: /Class and student management/i, label: "classes" },
  { path: "/teacher/classes/class-s3a-2026", heading: /S3A Mathematics/i, label: "class detail" },
  { path: "/teacher/students/student-peter", heading: /HK Student Peter/i, label: "student profile" },
  { path: "/teacher/analytics", heading: /Class insight and intervention/i, label: "analytics" },
  { path: "/teacher/rewards", heading: /Rewards and gift redemptions/i, label: "rewards" },
  { path: "/teacher/live", heading: /S3A quadratic checkpoint|Start a classroom check/i, label: "live classroom" },
  { path: "/teacher/assignments", heading: /Assignment distribution/i, label: "assignments" },
  { path: "/teacher/assignments/new", heading: /Create assignment/i, label: "new assignment" },
  { path: "/teacher/assignments/assignment-quadratics-checkpoint", heading: /Quadratic functions checkpoint/i, label: "assignment detail" },
  { path: "/teacher/resources", heading: /Teaching resources and papers/i, label: "resources" },
  { path: "/teacher/assessments", heading: /Quiz, test, and mock exam management/i, label: "assessments" },
  { path: "/teacher/assessments/new", heading: /Create assessment/i, label: "new assessment" },
  { path: "/teacher/assessments/assessment-s3-algebra-quiz", heading: /S3 algebra readiness quiz/i, label: "assessment detail" },
  { path: "/teacher/reports", heading: /Bilingual learning reports/i, label: "reports" },
  { path: "/teacher/inbox", heading: /^Inbox$/i, label: "inbox" }
];

const secretPatterns = [
  /sk-[A-Za-z0-9_-]{16,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/i,
  /api[_-]?key["']?\s*[:=]\s*["'][^"']{8,}/i,
  /secret["']?\s*[:=]\s*["'][^"']{8,}/i
];

function hasSecretLeak(value: string) {
  return secretPatterns.some((pattern) => pattern.test(value));
}

function collectRuntimeIssues(page: Page, app: IsolatedApp): RuntimeIssues {
  const issues: RuntimeIssues = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    serverResponses: [],
    secretLeaks: []
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      // This spec submits deliberately hostile payloads and accepts a 4xx for
      // them (see expectApiOkOrClientError). The browser logs every rejected
      // fetch as a console error, so counting those would fail the run for the
      // API behaving correctly. 5xx is still caught by the serverResponses
      // assertion, and genuine client-side errors are still collected here.
      if (!/Failed to load resource: the server responded with a status of 4\d\d/.test(text)) {
        issues.consoleErrors.push(text);
      }
      if (hasSecretLeak(text)) issues.secretLeaks.push(`console: ${text}`);
    }
  });

  page.on("pageerror", (error) => {
    issues.pageErrors.push(error.message);
    if (hasSecretLeak(error.message)) issues.secretLeaks.push(`pageerror: ${error.message}`);
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    issues.failedRequests.push(`${request.method()} ${request.url()} ${failure}`);
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (url.startsWith(app.baseURL) && status >= 500) {
      issues.serverResponses.push(`${status} ${response.request().method()} ${url}`);
    }
  });

  return issues;
}

async function loginTeacher(app: IsolatedApp, page: Page) {
  const response = await page.request.post(app.url("/api/auth/login"), {
    data: {
      username: demoTeacher.username,
      password: demoTeacher.password,
      grade: "S3",
      language: "en",
      theme: "light"
    }
  });
  expect(response.ok(), `Teacher login failed with ${response.status()}`).toBeTruthy();
}

async function expectRouteReady(app: IsolatedApp, page: Page, route: TeacherRouteProbe, issues: RuntimeIssues) {
  const response = await page.goto(app.url(route.path), { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 0, `${route.label} should not return 5xx`).toBeLessThan(500);
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);

  const main = page.locator("main");
  await expect(main, `${route.label} should render a main landmark`).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: route.heading }).first(), `${route.label} heading`).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /This page is not available|Page not found/i })).toHaveCount(0);

  const text = await main.innerText();
  expect(text.trim().length, `${route.label} should render meaningful content`).toBeGreaterThan(route.minTextLength ?? 80);
  if (hasSecretLeak(text)) issues.secretLeaks.push(`main text leak on ${route.path}`);
}

function assertNoCriticalRuntimeIssues(issues: RuntimeIssues) {
  expect(issues.pageErrors, "No unhandled browser page errors").toEqual([]);
  expect(issues.serverResponses, "No app 5xx responses").toEqual([]);
  expect(issues.secretLeaks, "No secret-looking values in visible or console text").toEqual([]);
  expect.soft(issues.consoleErrors, "No browser console errors").toEqual([]);
}

async function expectApiOkOrClientError(responsePromise: Promise<{ status: () => number; text: () => Promise<string> }>, label: string) {
  const response = await responsePromise;
  const status = response.status();
  const text = await response.text().catch(() => "");
  expect(status, `${label} should not produce 5xx`).toBeLessThan(500);
  expect(hasSecretLeak(text), `${label} should not leak secret-looking text`).toBe(false);
  return status;
}

test.describe("teacher console browser stress", () => {
  test("renders all teacher routes and tolerates hostile UI inputs, exports, and downloads", async ({ page }, testInfo) => {
    test.slow();
    const suffix = uniqueSuffix(testInfo).slice(0, 34);
    const hostileText = [
      `Stress ${suffix}`,
      "中英混合文字",
      "emoji-🚀-📚",
      "<script>alert('teacher-stress')</script>",
      "x".repeat(420)
    ].join(" | ");

    const app = await startIsolatedApp(`teacher-console-stress-${testInfo.project.name}`, testInfo, {
      warmPaths: teacherRoutes.map((route) => route.path)
    });

    const issues = collectRuntimeIssues(page, app);
    try {
      await loginTeacher(app, page);

      for (const route of teacherRoutes) {
        await expectRouteReady(app, page, route, issues);
      }

      await page.goto(app.url("/teacher"));
      const globalSearch = page.getByPlaceholder(/Search students, assignments, resources/i);
      await globalSearch.fill(hostileText);
      await globalSearch.press("Enter");
      // /teacher redirects to /teacher/dashboard, so the shell publishes ?q= on
      // the dashboard path — /teacher?q= is unreachable. The q round-trip below
      // is what actually proves search carries the hostile query intact.
      await expect(page).toHaveURL(/\/teacher\/dashboard\?q=/);
      expect(new URL(page.url()).searchParams.get("q")).toBe(hostileText);

      await page.goto(app.url("/teacher/classes"));
      const classSection = page.locator("section").filter({ hasText: /Class and student management/i }).first();
      await classSection.getByLabel(/Class name/i).fill(`Stress Class ${hostileText.slice(0, 120)}`);
      await classSection.getByLabel(/Grade/i).selectOption("S4");
      await classSection.getByLabel(/Academic year/i).fill("2026-2027");
      await classSection.getByLabel(/Notes/i).fill(hostileText);
      const createClassResponse = page.waitForResponse((response) =>
        response.url().startsWith(app.url("/api/teacher/classes")) && response.request().method() === "POST"
      );
      await classSection.getByRole("button", { name: /^Create$/i }).click({ force: true });
      await expectApiOkOrClientError(createClassResponse, "class create hostile submit");

      await page.goto(app.url("/teacher/resources"));
      const uploadSection = page.locator("section").filter({ hasText: /Upload resource/i }).first();
      await uploadSection.getByLabel(/Title/i).fill(`Stress Upload ${hostileText.slice(0, 120)}`);
      await uploadSection.getByLabel(/Grade/i).selectOption("S3");
      await uploadSection.getByLabel(/Type/i).selectOption("document");
      // "Core" is a historical difficulty record; the picker offers only the
      // active set (Low/Medium/High). lib/difficulty.ts maps Core -> Medium.
      await uploadSection.getByLabel(/Difficulty/i).selectOption("Medium");
      await uploadSection.locator('input[name="file"]').setInputFiles({
        name: `stress-${suffix}-中英-emoji-🚀.html`,
        mimeType: "text/html",
        buffer: Buffer.from("<!doctype html><script>window.__stress=true</script>", "utf8")
      });
      const uploadResponse = page.waitForResponse((response) =>
        response.url().startsWith(app.url("/api/teacher/resources")) && response.request().method() === "POST"
      );
      await uploadSection.getByRole("button", { name: /Upload/i }).click();
      await expectApiOkOrClientError(uploadResponse, "unicode/wrong-mime resource upload");

      const resourceDownload = await page.request.get(app.url("/api/teacher/resources/resource-s3-quadratics-slides/download"));
      expect(resourceDownload.status(), "seed resource download should not fail").toBe(200);
      expect(resourceDownload.headers()["content-disposition"]).toContain("s3-quadratics-intro");

      await page.goto(app.url("/teacher/reports"));
      await page.getByRole("combobox", { name: /^Type$/i }).selectOption("student");
      await page.getByRole("combobox", { name: /Language/i }).selectOption("en");
      await page.getByRole("textbox", { name: /Teacher remarks/i }).fill(hostileText);
      await expectDownloadFrom(page, () => page.getByRole("link", { name: /Export CSV/i }).click({ force: true }), /student-report-.*\.csv/);
      await expectDownloadFrom(page, () => page.getByRole("link", { name: /Export PDF/i }).click({ force: true }), /student-report-.*\.pdf/);
      // The reports view saves through /api/teacher/saved-reports, which
      // re-exports POST from reports/save — matching only the reports/save path
      // never fires, so this waited out the whole test timeout. Accept either
      // alias in case the view switches back to the canonical path.
      const saveReportResponse = page.waitForResponse((response) =>
        (response.url().startsWith(app.url("/api/teacher/saved-reports")) ||
          response.url().startsWith(app.url("/api/teacher/reports/save"))) &&
        response.request().method() === "POST"
      );
      await page.getByRole("button", { name: /Save report/i }).click({ force: true });
      await expectApiOkOrClientError(saveReportResponse, "long report save");

      await page.goto(app.url("/teacher/inbox?thread=message-thread-quadratic-help"));
      const replyBox = page.getByPlaceholder(/Reply to the student/i);
      await replyBox.fill(hostileText);
      // The inbox sends through .../replies, which re-exports POST from
      // .../reply. "/replies" does not start with "/reply", so matching only
      // the singular path waited out the whole test timeout.
      const replyResponse = page.waitForResponse((response) =>
        (response.url().startsWith(app.url("/api/teacher/inbox/message-thread-quadratic-help/replies")) ||
          response.url().startsWith(app.url("/api/teacher/inbox/message-thread-quadratic-help/reply"))) &&
        response.request().method() === "POST"
      );
      await page.getByRole("button", { name: /Send reply/i }).click();
      await expectApiOkOrClientError(replyResponse, "long inbox reply");

      assertNoCriticalRuntimeIssues(issues);
    } finally {
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });
});
