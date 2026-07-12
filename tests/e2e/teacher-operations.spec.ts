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
        subject: { en: string; zh: string };
        status: string;
        acknowledgement: { total: number; acknowledged: number; pending: number };
        deliveryAttempts: Array<{ status: string; errorCode?: string }>;
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

test.describe("teacher operations Nova Tutor governance UI", () => {
  test("teacher sees read-only redacted governance without admin policy controls", async ({ page }) => {
    await authenticateAsTeacher(page);

    await page.goto("/teacher/operations/ai-governance");
    await expect(page.getByRole("heading", { name: /Nova Tutor governance/i })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Read-only redacted Nova Tutor agent history/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Redacted run history/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Save policy/i })).toHaveCount(0);
    await expect(page.locator("input[name='enabled']")).toHaveCount(0);
    await expect(page.locator("textarea[name='blockedPatterns']")).toHaveCount(0);
  });

  test("admin can save and restore Nova Tutor policy from governance UI", async ({ page }, testInfo) => {
    const registered = await registerStudentApi(page.context().request, testInfo, "admin-governance");
    setUserRole(registered.session.user.id, "admin");

    const originalResponse = await page.context().request.get(`${baseURL}/api/admin/nova-lens/policy`);
    expect(originalResponse.ok()).toBeTruthy();
    const original = (await originalResponse.json()) as { policy: NovaLensPolicy };
    const nextMaxSelectionLength = original.policy.maxSelectionLength === 321 ? 322 : 321;

    try {
      await page.goto("/teacher/operations/ai-governance");
      await expect(page.getByRole("heading", { name: /Nova Tutor governance/i })).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(/Admin policy controls and redacted agent runs/i)).toBeVisible({ timeout: 20000 });
      const maxSelectionInput = page.locator("input[name='maxSelectionLength']");
      await expect(maxSelectionInput).toBeVisible({ timeout: 20000 });
      await maxSelectionInput.fill(String(nextMaxSelectionLength));
      await page.getByRole("button", { name: /Save policy/i }).click();
      await expect(page.getByText(/Nova Tutor policy saved/i)).toBeVisible({ timeout: 20000 });

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
