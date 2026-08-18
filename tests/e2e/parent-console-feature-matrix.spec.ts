import { expect, request as apiRequest, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import {
  collectPageErrors,
  demoTeacher,
  demoStudent,
  demoStudentUserId,
  expectNoPageErrors,
  loginAsDemoParent,
  loginAsDemoStudent,
  loginAsTeacher,
  logoutIfVisible,
  uniqueSuffix
} from "./helpers";

// Coverage complement to `parent-console.spec.ts`. That spec verifies auth routing,
// child summaries, reports, invite-code linking and the parent<->teacher message
// contract. The surfaces below are the ones it never drives: the Notices route (its
// nav entry, filter group, and Confirm-receipt button), the shell's Child focus
// selector, the Ask-teacher compose form, and thread selection from the Threads list.

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const e2eDbPath = process.env.HK_MATH_DB_PATH
  ? path.resolve(process.env.HK_MATH_DB_PATH)
  : path.join(process.cwd(), ".tmp/e2e/hk-math-db.sqlite");

type AuthSession = { user: { id: string; name: string; username: string; role: string; grade: string } };

type NoticeRecipient = {
  id: string;
  studentId: string;
  studentName: string;
  guardianId?: string;
  status: "pending" | "acknowledged";
  acknowledgedAt: string | null;
};

type ParentNoticesResponse = {
  data: {
    children: Array<{ student: { id: string; name: string } }>;
    notices: Array<{
      id: string;
      subject: { en: string; zh: string };
      recipients: NoticeRecipient[];
      acknowledgement: { total: number; acknowledged: number; pending: number };
    }>;
  };
};

type ParentFoundationResponse = {
  data: {
    parent: { id: string };
    children: Array<{ student: { id: string; name: string } }>;
    selectedChild: { student: { id: string; name: string } } | null;
  };
};

type ParentMessagesResponse = {
  data: { threads: Array<{ id: string; subject: { en: string }; studentId: string }> };
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function newApiContext(contexts: APIRequestContext[]) {
  const context = await apiRequest.newContext({ baseURL });
  contexts.push(context);
  return context;
}

async function loginApi(contexts: APIRequestContext[], username: string, password: string) {
  const context = await newApiContext(contexts);
  const response = await context.post("/api/auth/login", {
    data: { username, password, grade: "S3", language: "en", theme: "dark" }
  });
  expect(response.ok(), `Login failed for ${username}: ${response.status()}`).toBeTruthy();
  return { context, session: await response.json() as AuthSession };
}

async function disposeAll(contexts: APIRequestContext[]) {
  await Promise.all(contexts.splice(0).map((context) => context.dispose()));
}

function parentInviteCodeForStudent(studentId: string) {
  const sqlite = new DatabaseSync(e2eDbPath);
  try {
    const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as { payload: string } | undefined;
    expect(row).toBeTruthy();
    const payload = JSON.parse(row?.payload ?? "{}") as {
      student_profiles?: Array<{ user_id: string; parent_invite_code?: string }>;
    };
    const inviteCode = payload.student_profiles?.find((profile) => profile.user_id === studentId)?.parent_invite_code;
    expect(inviteCode, `Missing stored parent invite code for ${studentId}`).toMatch(/^MAIS-[A-Z0-9]{10}$/);
    return inviteCode!;
  } finally {
    sqlite.close();
  }
}

async function registerStudentViaApi(contexts: APIRequestContext[], testInfo: TestInfo, label: string) {
  const context = await newApiContext(contexts);
  const suffix = uniqueSuffix(testInfo).slice(0, 40);
  const student = {
    name: `Parent Matrix ${label} ${suffix}`,
    username: `parent-matrix-${label}-${suffix}@example.test`.toLowerCase(),
    password: "start12345"
  };
  const response = await context.post("/api/auth/register", {
    data: {
      name: student.name,
      username: student.username,
      email: student.username,
      password: student.password,
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      language: "en",
      theme: "dark"
    }
  });
  expect(response.ok(), `Register failed: ${response.status()}`).toBeTruthy();
  const session = await response.json() as AuthSession;
  return { ...student, userId: session.user.id };
}

/**
 * Puts a fresh, sent, parents-audience notice in front of the demo parent by
 * creating a class the demo student belongs to. Returns the notice subject and id.
 */
async function sendParentNotice(contexts: APIRequestContext[], testInfo: TestInfo, label: string) {
  const { context } = await loginApi(contexts, demoTeacher.username, demoTeacher.password);
  const suffix = uniqueSuffix(testInfo).slice(0, 28);

  const classResponse = await context.post("/api/teacher/classes", {
    data: {
      name: `Parent Matrix ${label} ${suffix}`,
      grade: "S4",
      academicYear: "2026-2027",
      description: "Created by parent console feature matrix."
    }
  });
  expect(classResponse.ok(), `Class create failed: ${classResponse.status()}`).toBeTruthy();
  const teacherClass = await classResponse.json() as { class: { id: string } };

  const addResponse = await context.post(`/api/teacher/classes/${encodeURIComponent(teacherClass.class.id)}/students`, {
    data: { username: demoStudent.username }
  });
  expect(addResponse.ok(), `Add student failed: ${addResponse.status()}`).toBeTruthy();

  const subject = `Notice matrix ${label} ${suffix}`;
  const createResponse = await context.post("/api/teacher/notices", {
    data: {
      classId: teacherClass.class.id,
      audience: "parents",
      subject,
      body: `Please confirm receipt for ${label}.`,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  });
  expect(createResponse.ok(), `Notice create failed: ${createResponse.status()}`).toBeTruthy();
  const created = await createResponse.json() as { notice: { id: string; acknowledgement: { total: number } } };
  expect(created.notice.acknowledgement.total, "Notice must reach at least the demo guardian").toBeGreaterThan(0);

  const sendResponse = await context.post(`/api/teacher/notices/${encodeURIComponent(created.notice.id)}/deliveries`);
  expect(sendResponse.ok(), `Notice send failed: ${sendResponse.status()}`).toBeTruthy();

  return { subject, noticeId: created.notice.id, classId: teacherClass.class.id };
}

async function parentNotices(page: Page) {
  const response = await page.request.get("/api/parent/notices");
  expect(response.ok()).toBeTruthy();
  return await response.json() as ParentNoticesResponse;
}

function noticeFilter(page: Page, name: "All" | "Pending" | "Acknowledged") {
  return page.getByRole("group", { name: /Notice receipt filter/i }).getByRole("button", { name, exact: true });
}

function noticeCard(page: Page, subject: string) {
  return page.locator("article").filter({ hasText: subject });
}

test.describe.serial("parent console feature matrix", () => {
  const contexts: APIRequestContext[] = [];

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Parent Console feature matrix runs once on desktop Chrome.");
  });

  test.afterEach(async () => {
    await disposeAll(contexts);
  });

  test("the Notices route is reachable from parent navigation and renders its receipt surface", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsDemoParent(page);
    const navigation = page.getByRole("navigation", { name: /Parent navigation/i });

    // parent-console.spec.ts walks Reports/Messages/Connect/Overview but skips Notices,
    // so a broken Notices link would ship unnoticed.
    await navigation.getByRole("link", { name: /^Notices$/i }).click();
    await expect(page).toHaveURL(/\/parent\/notices/);
    await expect(page.getByRole("heading", { name: /Confirm school notices/i })).toBeVisible();

    await expect(page.getByText(/Pending receipts/i)).toBeVisible();
    await expect(page.getByText(/Visible notices/i)).toBeVisible();
    await expect(page.getByRole("group", { name: /Notice receipt filter/i })).toBeVisible();
    for (const name of ["All", "Pending", "Acknowledged"] as const) {
      await expect(noticeFilter(page, name)).toBeVisible();
    }

    const foundation = await page.request.get("/api/parent/foundation");
    const child = (await foundation.json() as ParentFoundationResponse).data.children[0];
    expect(child, "Expected a linked demo child.").toBeTruthy();
    await expect(page.getByRole("link", { name: /All children/i })).toBeVisible();
    await page.getByRole("link", { name: child.student.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`studentId=${escapeRegex(encodeURIComponent(child.student.id))}`));

    expectNoPageErrors(pageErrors);
  });

  test("a sent teacher notice reaches the parent, the filter narrows it, and Confirm receipt records it", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    const { subject } = await sendParentNotice(contexts, testInfo, "confirm");

    await loginAsDemoParent(page);
    await page.goto("/parent/notices");
    await expect(page.getByRole("heading", { name: /Confirm school notices/i })).toBeVisible();

    const card = noticeCard(page, subject);
    await expect(card).toHaveCount(1);
    await expect(card.getByText("Pending", { exact: true })).toBeVisible();

    // Filter group must actually hide non-matching receipts.
    await noticeFilter(page, "Acknowledged").click();
    await expect(card).toHaveCount(0);
    await noticeFilter(page, "Pending").click();
    await expect(card).toHaveCount(1);

    await card.getByRole("button", { name: /Confirm receipt/i }).click();
    await expect(page.getByText(/Receipt confirmed\./i)).toBeVisible();

    await noticeFilter(page, "All").click();
    await expect(noticeCard(page, subject).getByText("Acknowledged", { exact: true })).toBeVisible();
    await expect(noticeCard(page, subject).getByRole("button", { name: /Confirm receipt/i })).toHaveCount(0);

    const notices = await parentNotices(page);
    const acknowledged = notices.data.notices.find((notice) => notice.subject.en === subject);
    const recipient = acknowledged?.recipients[0];
    expect(recipient?.status).toBe("acknowledged");
    expect(recipient?.acknowledgedAt).toBeTruthy();

    // A receipt is evidence of WHEN a guardian confirmed; a repeat POST must not re-stamp it.
    const repeat = await page.request.post(`/api/parent/notices/${encodeURIComponent(recipient!.id)}/ack`);
    expect(repeat.status()).toBe(200);
    const afterRepeat = await parentNotices(page);
    expect(
      afterRepeat.data.notices.find((notice) => notice.subject.en === subject)?.recipients[0]?.acknowledgedAt
    ).toBe(recipient?.acknowledgedAt);

    expectNoPageErrors(pageErrors);
  });

  test("notice receipts stay private to the owning guardian and reject unknown recipients", async ({ page }, testInfo) => {
    const { subject } = await sendParentNotice(contexts, testInfo, "privacy");

    await loginAsDemoParent(page);
    const notices = await parentNotices(page);
    const recipientId = notices.data.notices.find((notice) => notice.subject.en === subject)?.recipients[0]?.id;
    expect(recipientId).toBeTruthy();

    expect((await page.request.post("/api/parent/notices/notice-recipient-does-not-exist/ack")).status()).toBe(404);
    await logoutIfVisible(page);

    await loginAsDemoStudent(page);
    expect((await page.request.get("/api/parent/notices")).status()).toBe(403);
    expect((await page.request.post(`/api/parent/notices/${encodeURIComponent(recipientId!)}/ack`)).status()).toBe(403);
    await logoutIfVisible(page);

    await loginAsTeacher(page);
    expect((await page.request.get("/api/parent/notices")).status()).toBe(403);
    expect((await page.request.post(`/api/parent/notices/${encodeURIComponent(recipientId!)}/ack`)).status()).toBe(403);
  });

  test("the Child focus selector re-scopes list routes and swaps the child detail route", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    const extraChild = await registerStudentViaApi(contexts, testInfo, "focus");

    await loginAsDemoParent(page);
    const linkResponse = await page.request.post("/api/parent/children/link", {
      data: { inviteCode: parentInviteCodeForStudent(extraChild.userId), relationship: "guardian" }
    });
    expect(linkResponse.status()).toBe(200);

    await page.goto("/parent");
    const focus = page.getByLabel(/Child focus/i);
    await expect(focus).toBeVisible();

    await focus.selectOption(extraChild.userId);
    await expect(page).toHaveURL(new RegExp(`studentId=${escapeRegex(encodeURIComponent(extraChild.userId))}`));
    await expect(page.locator("main").getByRole("heading", { name: extraChild.name }).first()).toBeVisible();

    // The selector must carry the focus into a sibling list route rather than resetting it.
    await page.getByRole("navigation", { name: /Parent navigation/i }).getByRole("link", { name: /^Reports$/i }).click();
    await expect(page).toHaveURL(new RegExp(`/parent/reports\\?studentId=${escapeRegex(encodeURIComponent(extraChild.userId))}`));

    // On a child detail route the selector navigates instead of appending a query param.
    await page.goto(`/parent/children/${encodeURIComponent(demoStudentUserId)}`);
    await page.getByLabel(/Child focus/i).selectOption(extraChild.userId);
    await expect(page).toHaveURL(new RegExp(`/parent/children/${escapeRegex(encodeURIComponent(extraChild.userId))}$`));
    await expect(page.locator("main").getByRole("heading", { name: extraChild.name }).first()).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("the Ask teacher form creates a thread and the Threads list switches between them", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    const suffix = uniqueSuffix(testInfo).slice(0, 24);
    const firstSubject = `Matrix compose A ${suffix}`;
    const secondSubject = `Matrix compose B ${suffix}`;

    await loginAsDemoParent(page);
    await page.goto("/parent/messages");
    await expect(page.getByRole("heading", { name: /Ask teacher/i })).toBeVisible();

    const compose = page.locator("form").filter({ has: page.getByPlaceholder("Subject", { exact: true }) });

    for (const subject of [firstSubject, secondSubject]) {
      await compose.getByPlaceholder("Subject", { exact: true }).fill(subject);
      await compose.getByPlaceholder(/What context would help at home/i).fill(`Home context for ${subject}.`);
      const created = page.waitForResponse((response) =>
        response.url().includes("/api/parent/messages") && response.request().method() === "POST");
      await compose.getByRole("button", { name: /Send message/i }).click();
      expect((await created).status()).toBe(200);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(subject), "i") })).toBeVisible();
      await expect(page).toHaveURL(/thread=/);
      // The form clears so the next message does not inherit the previous subject.
      await expect(compose.getByPlaceholder("Subject", { exact: true })).toHaveValue("");
    }

    const threads = page.getByRole("heading", { name: /^Threads$/i }).locator("xpath=ancestor::aside[1]");
    await threads.getByRole("button", { name: new RegExp(escapeRegex(firstSubject), "i") }).click();
    await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(firstSubject), "i") })).toBeVisible();

    const messages = await page.request.get("/api/parent/messages");
    const payload = await messages.json() as ParentMessagesResponse;
    expect(payload.data.threads.filter((thread) => [firstSubject, secondSubject].includes(thread.subject.en))).toHaveLength(2);

    expectNoPageErrors(pageErrors);
  });
});
