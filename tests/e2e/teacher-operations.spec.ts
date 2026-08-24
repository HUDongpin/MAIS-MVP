import { expect, request as apiRequest, test, type APIRequestContext, type TestInfo } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { authenticateAsTeacher, demoTeacher, demoTeacherUserId, sessionCookieHeaderForUserId, uniqueSuffix } from "./helpers";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const e2eDbPath = process.env.HK_MATH_DB_PATH
  ? path.resolve(process.env.HK_MATH_DB_PATH)
  : path.join(process.cwd(), ".tmp/e2e/hk-math-db.sqlite");

test.setTimeout(90_000);

type AuthSession = {
  user: {
    id: string;
    role: string;
  };
};

type AppStateRow = {
  payload: string;
};

type AppStatePayload = {
  users: Array<{
    id: string;
    role: "student" | "teacher" | "parent" | "admin";
  }>;
};

type NovaLensPolicy = {
  enabled: boolean;
  allowedRoles: string[];
  enabledSurfaces: string[];
  maxSelectionLength: number;
  retentionDays: number;
  blockedPatterns: string[];
};

async function newApiContext(contexts: APIRequestContext[], cookieHeader?: string) {
  const context = await apiRequest.newContext({
    baseURL,
    ...(cookieHeader ? { extraHTTPHeaders: { Cookie: cookieHeader } } : {})
  });
  contexts.push(context);
  return context;
}

async function loginApi(contexts: APIRequestContext[], username: string, password: string) {
  if (username === demoTeacher.username && password === demoTeacher.password) {
    const context = await newApiContext(contexts, await sessionCookieHeaderForUserId(demoTeacherUserId));
    return { context, session: { user: { id: demoTeacherUserId, role: "teacher" } } };
  }

  const context = await newApiContext(contexts);
  const response = await context.post("/api/auth/login", {
    data: {
      username,
      password,
      grade: "S3",
      language: "en",
      theme: "dark"
    }
  });
  expect(response.ok()).toBeTruthy();
  const session = await response.json() as AuthSession;
  return { context, session };
}

async function teacherOperations(context: APIRequestContext, classId?: string) {
  const response = await context.get(classId ? `/api/teacher/operations?classId=${encodeURIComponent(classId)}` : "/api/teacher/operations");
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{
    data: {
      classes: Array<{ id: string; name: string }>;
      notices: Array<{
        id: string;
        teacherId: string;
        classId: string;
        className: string;
        audience: "parents" | "students" | "both";
        channelId: string;
        channelName: string;
        subject: { en: string; zh: string };
        body: { en: string; zh: string };
        status: string;
        dueAt: string | null;
        createdAt: string;
        updatedAt: string;
        sentAt: string | null;
        recipients: unknown[];
        acknowledgement: { total: number; acknowledged: number; pending: number };
        deliveryAttempts: Array<{
          id: string;
          noticeId: string;
          channelId: string;
          channelName: string;
          status: string;
          attemptedAt: string;
          errorCode?: string;
        }>;
      }>;
      roster: Array<{ studentName: string; studentNo?: string; seatLabel?: string; guardianStatus: string }>;
    };
  }>;
}

async function registerStudentApi(context: APIRequestContext, testInfo: TestInfo, label: string) {
  const suffix = uniqueSuffix(testInfo).toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 44);
  const username = `${label}-${suffix}@example.test`;
  const response = await context.post(`${baseURL}/api/auth/register`, {
    data: {
      name: `Nova Ops ${label} ${suffix}`,
      username,
      email: username,
      password: "start12345",
      grade: "S3",
      curriculumTrack: "HK",
      language: "en",
      theme: "dark"
    }
  });
  expect(response.ok()).toBeTruthy();
  const session = await response.json() as AuthSession;
  return { session, username, password: "start12345" };
}

function setUserRole(userId: string, role: "student" | "teacher" | "parent" | "admin") {
  const sqlite = new DatabaseSync(e2eDbPath);
  try {
    const row = sqlite
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as AppStateRow | undefined;
    expect(row).toBeTruthy();

    const payload = JSON.parse(row?.payload ?? "{}") as AppStatePayload;
    const user = payload.users.find((candidate) => candidate.id === userId);
    expect(user).toBeTruthy();
    if (!user) return;

    user.role = role;
    sqlite
      .prepare("UPDATE app_state SET payload = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(payload), new Date().toISOString(), "primary");
  } finally {
    sqlite.close();
  }
}

function expectNovaLensPolicyToMatch(actual: NovaLensPolicy, expected: NovaLensPolicy) {
  expect(actual.enabled).toBe(expected.enabled);
  expect(actual.allowedRoles).toEqual(expected.allowedRoles);
  expect(actual.enabledSurfaces).toEqual(expected.enabledSurfaces);
  expect(actual.maxSelectionLength).toBe(expected.maxSelectionLength);
  expect(actual.retentionDays).toBe(expected.retentionDays);
  expect(actual.blockedPatterns).toEqual(expected.blockedPatterns);
}

test.describe("teacher operations APIs", () => {
  const contexts: APIRequestContext[] = [];

  test.afterEach(async () => {
    await Promise.all(contexts.splice(0).map((context) => context.dispose()));
  });

  test("teacher sends disabled-mode WeCom notice and parent confirms MAIS receipt", async ({}, testInfo: TestInfo) => {
    const { context: teacherContext } = await loginApi(contexts, demoTeacher.username, demoTeacher.password);
    const operations = await teacherOperations(teacherContext);
    const teacherClass = operations.data.classes[0];
    expect(teacherClass?.id).toBeTruthy();

    const suffix = uniqueSuffix(testInfo);
    const accountSuffix = suffix.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40);
    const csvText = [
      "studentNo,name,grade,email,username,seatLabel,seatRow,seatColumn,parentName,parentEmail",
      `77,Notice Student ${accountSuffix},S3,notice-${accountSuffix}@example.test,notice-${accountSuffix},A7,1,7,Notice Parent,notice-parent-${accountSuffix}@example.test`
    ].join("\n");
    const commitResponse = await teacherContext.post(`/api/teacher/classes/${encodeURIComponent(teacherClass.id)}/roster-import/commit`, {
      data: { csvText }
    });
    expect(commitResponse.ok()).toBeTruthy();
    const commitPayload = await commitResponse.json() as { credentials: Array<{ role: string; username: string; temporaryPassword: string }> };
    const parentCredential = commitPayload.credentials.find((credential) => credential.role === "parent");
    expect(parentCredential?.username).toBeTruthy();

    const subject = `Operations receipt ${suffix}`;
    const createResponse = await teacherContext.post("/api/teacher/notices", {
      data: {
        classId: teacherClass.id,
        audience: "parents",
        subject,
        body: "Please confirm this MAIS-side receipt.",
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    });
    expect(createResponse.ok()).toBeTruthy();
    const created = await createResponse.json() as { notice: { id: string; acknowledgement: { total: number } } };
    expect(created.notice.acknowledgement.total).toBeGreaterThan(0);

    const sendResponse = await teacherContext.post(`/api/teacher/notices/${encodeURIComponent(created.notice.id)}/deliveries`);
    expect(sendResponse.ok()).toBeTruthy();
    const sent = await sendResponse.json() as { notice: { status: string }; attempt: { status: string; errorCode?: string } };
    expect(sent.notice.status).toBe("queued");
    expect(sent.attempt.status).toBe("disabled");
    expect(sent.attempt.errorCode).toBe("wecom-disabled");

    const { context: parentContext } = await loginApi(contexts, parentCredential!.username, parentCredential!.temporaryPassword);
    const noticesResponse = await parentContext.get("/api/parent/notices");
    expect(noticesResponse.ok()).toBeTruthy();
    const noticesPayload = await noticesResponse.json() as {
      data: {
        notices: Array<{
          id: string;
          subject: { en: string };
          recipients: Array<{ id: string; status: string }>;
        }>;
      };
    };
    const parentNotice = noticesPayload.data.notices.find((notice) => notice.subject.en === subject);
    expect(parentNotice).toBeTruthy();
    const recipient = parentNotice?.recipients.find((item) => item.status === "pending");
    expect(recipient?.id).toBeTruthy();

    const ackResponse = await parentContext.post(`/api/parent/notices/${encodeURIComponent(recipient!.id)}/ack`);
    expect(ackResponse.ok()).toBeTruthy();

    const refreshed = await teacherOperations(teacherContext, teacherClass.id);
    const refreshedNotice = refreshed.data.notices.find((notice) => notice.id === created.notice.id);
    expect(refreshedNotice?.acknowledgement.acknowledged).toBeGreaterThan(0);
  });

  test("teacher validates and commits roster CSV with seat metadata", async ({}, testInfo: TestInfo) => {
    const { context: teacherContext } = await loginApi(contexts, demoTeacher.username, demoTeacher.password);
    const operations = await teacherOperations(teacherContext);
    const teacherClass = operations.data.classes[0];
    expect(teacherClass?.id).toBeTruthy();

    const suffix = uniqueSuffix(testInfo).toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40);
    const studentName = `Ops CSV ${suffix}`;
    const csvText = [
      "studentNo,name,grade,email,username,seatLabel,seatRow,seatColumn,parentName,parentEmail",
      `88,${studentName},S3,ops-${suffix}@example.test,ops-${suffix},B8,2,4,Ops Parent,ops-parent-${suffix}@example.test`
    ].join("\n");

    const validateResponse = await teacherContext.post(`/api/teacher/classes/${encodeURIComponent(teacherClass.id)}/roster-import/validate`, {
      data: { csvText }
    });
    expect(validateResponse.ok()).toBeTruthy();
    const validationPayload = await validateResponse.json() as { validation: { valid: boolean; totals: { valid: number; creates: number } } };
    expect(validationPayload.validation.valid).toBeTruthy();
    expect(validationPayload.validation.totals.valid).toBe(1);
    expect(validationPayload.validation.totals.creates).toBe(1);

    const commitResponse = await teacherContext.post(`/api/teacher/classes/${encodeURIComponent(teacherClass.id)}/roster-import/commit`, {
      data: { csvText }
    });
    expect(commitResponse.ok()).toBeTruthy();
    const commitPayload = await commitResponse.json() as { credentials: Array<{ role: string; username: string }>; roster: Array<{ studentName: string; seatLabel?: string; guardianStatus: string }> };
    expect(commitPayload.credentials.some((credential) => credential.role === "student")).toBeTruthy();
    expect(commitPayload.credentials.some((credential) => credential.role === "parent")).toBeTruthy();
    expect(commitPayload.roster.some((row) => row.studentName === studentName && row.seatLabel === "B8" && row.guardianStatus === "linked")).toBeTruthy();
  });
});

// Narrow A11 borrow for the A13 queued-client contract only. These route-mocked
// cases intentionally cover idempotency keys, HTTP 202, and cursor pagination;
// they do not change the broader teacher-operations API or product matrix.
test.describe("teacher operations queued client contracts", () => {
  test("notice retry reuses one key while a later deliberate send uses a fresh key", async ({ page }) => {
    const observedKeys: string[] = [];
    let requestCount = 0;
    await authenticateAsTeacher(page);
    const initialOperations = await teacherOperations(page.request);
    const originalNotice = initialOperations.data.notices[0];
    expect(originalNotice).toBeDefined();
    if (!originalNotice) return;
    await page.route("**/api/teacher/notices/*/deliveries", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = route.request().postDataJSON() as { idempotencyKey?: string };
      observedKeys.push(body.idempotencyKey ?? "");
      requestCount += 1;
      if (requestCount === 1) return route.abort("failed");
      const noticeId = decodeURIComponent(new URL(route.request().url()).pathname.split("/").at(-2) ?? "notice-unknown");
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          notice: {
            ...originalNotice,
            id: noticeId,
            subject: { en: "Queued notice", zh: "已排隊通知" },
            body: { en: "Queued body", zh: "已排隊內容" },
            status: "queued",
            updatedAt: "2099-08-24T00:00:00.000Z",
          },
          attempt: {
            id: "attempt-route-fixture",
            noticeId,
            channelId: originalNotice.channelId,
            channelName: originalNotice.channelName,
            status: "disabled",
            attemptedAt: "2026-08-24T00:00:00.000Z"
          },
          email: { status: "queued", queued: 1, reused: 0, recovered: 0, skipped: 0 }
        })
      });
    });

    await page.goto("/teacher/operations/notices");
    const sendButton = page.getByRole("button", { name: /^(Send|Retry|Send now|Retry send)$/i }).first();
    await expect(sendButton).toBeVisible({ timeout: 20_000 });
    const noticeCard = sendButton.locator("xpath=ancestor::article[1]");

    await sendButton.click();
    await expect(page.getByRole("alert")).toContainText(/not confirmed/i);
    await page.reload();
    await expect(sendButton).toBeVisible({ timeout: 20_000 });
    await sendButton.click();
    await expect(page.getByRole("status")).toContainText(/accepted and queued/i);
    await expect(noticeCard).toContainText("Queued notice");
    const retryButton = noticeCard.getByRole("button", { name: /Retry/i });
    await expect(retryButton).toBeVisible();
    await retryButton.click();
    await expect.poll(() => observedKeys.length).toBe(3);

    expect(observedKeys[0]).toMatch(/^teacher-operation\/[0-9a-f-]{36}$/u);
    expect(observedKeys[1]).toBe(observedKeys[0]);
    expect(observedKeys[2]).not.toBe(observedKeys[1]);
  });

  test("stable 409 codes distinguish an idempotency conflict from no eligible family recipients", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/api/teacher/notices/*/deliveries", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      requestCount += 1;
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          code: requestCount === 1 ? "IDEMPOTENCY_CONFLICT" : "NO_ELIGIBLE_RECIPIENTS",
          error: "Safe fixture"
        })
      });
    });

    await authenticateAsTeacher(page);
    await page.goto("/teacher/operations/notices");
    const sendButton = page.getByRole("button", { name: /^(Send|Retry|Send now|Retry send)$/i }).first();
    await expect(sendButton).toBeVisible({ timeout: 20_000 });

    await sendButton.click();
    await expect(page.getByRole("alert")).toContainText(/request key conflicts with an earlier action/i);
    await sendButton.click();
    await expect(page.getByRole("alert")).toContainText(/no eligible family email recipients/i);
  });

  test("reminder reload reuses the base key from page zero without storing the raw student cursor", async ({ page }) => {
    const observedBodies: Array<{
      classId: string;
      assignmentId?: string;
      cursor?: string;
      idempotencyKey: string;
    }> = [];
    const rawCursor = "assignment-private-route\u0000student-private-route";
    await page.route("**/api/teacher/reminder-runs", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const body = route.request().postDataJSON() as {
        classId: string;
        assignmentId?: string;
        cursor?: string;
        idempotencyKey: string;
      };
      const callIndex = observedBodies.length;
      observedBodies.push(body);
      if (callIndex === 1) return route.abort("failed");
      const firstPage = callIndex === 0 || callIndex === 2;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          runs: firstPage ? [{
            id: "reminder-run-route",
            teacherId: demoTeacherUserId,
            classId: body.classId,
            assignmentId: "assignment-private-route",
            studentId: "student-private-route",
            threshold: "overdue-24h",
            status: "queued",
            reason: "Fixture",
            createdAt: "2026-08-24T00:00:00.000Z"
          }] : [],
          nextCursor: firstPage ? rawCursor : null
        })
      });
    });

    await authenticateAsTeacher(page);
    await page.goto("/teacher/operations/reminders");
    const runButton = page.getByRole("button", { name: /Run due reminders/i });
    await expect(runButton).toBeVisible({ timeout: 20_000 });

    await runButton.click();
    await expect.poll(() => observedBodies.length).toBe(2);
    await expect(page.getByRole("alert")).toContainText(/same cursor/i);
    const recoveryEntries = await page.evaluate(() => Object.entries(sessionStorage)
      .filter(([key]) => key.startsWith("mais.teacher-operations.")));
    expect(recoveryEntries).toHaveLength(1);
    expect(recoveryEntries[0]?.[0]).toMatch(/^mais\.teacher-operations\.v2\/[a-f0-9]{64}$/u);
    const serializedRecovery = JSON.stringify(recoveryEntries);
    for (const forbidden of [
      demoTeacherUserId,
      observedBodies[0]?.classId ?? "class-private-route",
      "assignment-private-route",
      "student-private-route",
      rawCursor
    ]) {
      expect(serializedRecovery).not.toContain(forbidden);
    }

    await page.reload();
    await expect(runButton).toBeVisible({ timeout: 20_000 });
    await runButton.click();
    await expect.poll(() => observedBodies.length).toBe(4);
    await expect(page.getByRole("status").first()).toContainText(/queued/i);

    expect(observedBodies[0]).not.toHaveProperty("assignmentId");
    expect(observedBodies[0]).not.toHaveProperty("cursor");
    expect(observedBodies[1]?.cursor).toBe(rawCursor);
    expect(observedBodies[2]).not.toHaveProperty("assignmentId");
    expect(observedBodies[2]).not.toHaveProperty("cursor");
    expect(observedBodies[3]?.cursor).toBe(rawCursor);
    expect(observedBodies[2]?.idempotencyKey).toBe(observedBodies[0]?.idempotencyKey);
    expect(observedBodies[3]?.idempotencyKey).toBe(observedBodies[1]?.idempotencyKey);
    await expect.poll(async () => page.evaluate(() => Object.keys(sessionStorage)
      .filter((key) => key.startsWith("mais.teacher-operations.")).length)).toBe(0);

    await runButton.click();
    await expect.poll(() => observedBodies.length).toBe(5);
    expect(observedBodies[4]).not.toHaveProperty("assignmentId");
    expect(observedBodies[4]).not.toHaveProperty("cursor");
    expect(observedBodies[4]?.idempotencyKey).not.toBe(observedBodies[2]?.idempotencyKey);
  });
});

test.describe("teacher operations AI Tutor governance UI", () => {
  test("teacher sees read-only redacted governance without admin policy controls", async ({ page }) => {
    await authenticateAsTeacher(page);

    await page.goto("/teacher/operations/ai-governance");
    await expect(page.getByRole("heading", { name: /AI Tutor governance/i })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Read-only redacted AI Tutor agent history/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Redacted run history/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Save policy/i })).toHaveCount(0);
    await expect(page.locator("input[name='enabled']")).toHaveCount(0);
    await expect(page.locator("textarea[name='blockedPatterns']")).toHaveCount(0);
  });

  test("admin can save and restore AI Tutor policy from governance UI", async ({ page }, testInfo) => {
    const registered = await registerStudentApi(page.context().request, testInfo, "admin-governance");
    setUserRole(registered.session.user.id, "admin");

    const originalResponse = await page.context().request.get(`${baseURL}/api/admin/nova-lens/policy`);
    expect(originalResponse.ok()).toBeTruthy();
    const original = (await originalResponse.json()) as { policy: NovaLensPolicy };
    const nextMaxSelectionLength = original.policy.maxSelectionLength === 321 ? 322 : 321;

    try {
      await page.goto("/teacher/operations/ai-governance");
      await expect(page.getByRole("heading", { name: /AI Tutor governance/i })).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(/Admin policy controls and redacted agent runs/i)).toBeVisible({ timeout: 20000 });
      const maxSelectionInput = page.locator("input[name='maxSelectionLength']");
      await expect(maxSelectionInput).toBeVisible({ timeout: 20000 });
      await maxSelectionInput.fill(String(nextMaxSelectionLength));
      await page.getByRole("button", { name: /Save policy/i }).click();
      await expect(page.getByText(/AI Tutor policy saved/i)).toBeVisible({ timeout: 20000 });

      const updatedResponse = await page.context().request.get(`${baseURL}/api/admin/nova-lens/policy`);
      expect(updatedResponse.ok()).toBeTruthy();
      const updated = (await updatedResponse.json()) as { policy: NovaLensPolicy };
      expect(updated.policy.maxSelectionLength).toBe(nextMaxSelectionLength);
    } finally {
      const restoreResponse = await page.context().request.patch(`${baseURL}/api/admin/nova-lens/policy`, {
        data: {
          enabled: original.policy.enabled,
          allowedRoles: original.policy.allowedRoles,
          enabledSurfaces: original.policy.enabledSurfaces,
          maxSelectionLength: original.policy.maxSelectionLength,
          retentionDays: original.policy.retentionDays,
          blockedPatterns: original.policy.blockedPatterns
        }
      });
      expect(restoreResponse.ok()).toBeTruthy();
      const restored = (await restoreResponse.json()) as { policy: NovaLensPolicy };
      expectNovaLensPolicyToMatch(restored.policy, original.policy);
    }
  });
});
