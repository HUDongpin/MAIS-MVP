import { expect, request as apiRequest, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
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
  data: {
    children: Array<{ student: { id: string; name: string } }>;
    threads: Array<{ id: string; subject: { en: string }; studentId: string }>;
    reports: Array<{
      id: string;
      studentId: string;
      classId?: string;
      title: { en: string; zh: string };
    }>;
    composeTargets: Array<{
      studentId: string;
      classId: string;
      className: string;
      teacherName: string;
    }>;
  };
};

type DeferredParentThreadFetchMode = "success" | "not-found";

type DeferredParentThreadFetchControl = {
  armed: boolean;
  targetThreadId: string;
  mode: DeferredParentThreadFetchMode;
  started: boolean;
  settled: boolean;
  gate: Promise<void> | null;
  release: (() => void) | null;
};

type ParentRaceTestWindow = typeof window & {
  __maisParentDeferredThreadFetch?: DeferredParentThreadFetchControl;
  next?: {
    router?: {
      push: (href: string, options?: { scroll?: boolean }) => void;
    };
  };
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

async function issueGuardianInvitationForStudent(
  contexts: APIRequestContext[],
  testInfo: TestInfo,
  student: { username: string; userId: string },
  label: string
) {
  const { context } = await loginApi(contexts, demoTeacher.username, demoTeacher.password);
  const suffix = uniqueSuffix(testInfo).slice(0, 28);
  const classResponse = await context.post("/api/teacher/classes", {
    data: {
      name: `Parent Matrix Guardian ${label} ${suffix}`,
      grade: "S3",
      academicYear: "2026-2027",
      description: "Created for explicit guardian invitation setup."
    }
  });
  expect(classResponse.ok(), `Class create failed: ${classResponse.status()}`).toBeTruthy();
  const teacherClass = await classResponse.json() as { class: { id: string } };
  const addResponse = await context.post(`/api/teacher/classes/${encodeURIComponent(teacherClass.class.id)}/students`, {
    data: { username: student.username }
  });
  expect(addResponse.ok(), `Add student failed: ${addResponse.status()}`).toBeTruthy();
  const issueResponse = await context.post(
    `/api/teacher/classes/${encodeURIComponent(teacherClass.class.id)}/students/${encodeURIComponent(student.userId)}/guardian-invitations`
  );
  expect(issueResponse.status()).toBe(201);
  const payload = await issueResponse.json() as { invitation: { token: string } };
  expect(payload.invitation.token).toMatch(/^MAIS-[A-F0-9]{24}$/);
  return { inviteCode: payload.invitation.token, classId: teacherClass.class.id };
}

async function saveParentSummaryReport(
  teacherContext: APIRequestContext,
  input: { classId: string; studentId: string; language: "en" | "zh"; marker: string }
) {
  const response = await teacherContext.post("/api/teacher/reports/save", {
    data: {
      type: "parent-summary",
      language: input.language,
      classId: input.classId,
      studentId: input.studentId,
      remarks: input.marker
    }
  });
  expect(response.status()).toBe(201);
  return await response.json() as { report: { id: string } };
}

async function installDeferredParentThreadFetch(page: Page) {
  await page.evaluate(() => {
    const testWindow = window as ParentRaceTestWindow;
    if (testWindow.__maisParentDeferredThreadFetch) return;
    const nativeFetch = window.fetch.bind(window);
    const control: DeferredParentThreadFetchControl = {
      armed: false,
      targetThreadId: "",
      mode: "success",
      started: false,
      settled: false,
      gate: null,
      release: null
    };
    testWindow.__maisParentDeferredThreadFetch = control;

    window.fetch = async (input, init) => {
      const requestUrl = new URL(
        typeof input === "string" ? input : input instanceof Request ? input.url : input.toString(),
        window.location.href
      );
      const requestMethod = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      const shouldDefer = (
        control.armed
        && requestMethod === "GET"
        && requestUrl.pathname === "/api/parent/messages"
        && requestUrl.searchParams.get("thread") === control.targetThreadId
      );
      if (!shouldDefer) return nativeFetch(input, init);

      control.armed = false;
      control.started = true;
      let response: Response;
      if (control.mode === "success") {
        const nativeResponse = await nativeFetch(input, {
          ...init,
          // Deliberately ignore the component's AbortSignal. This models a
          // transport that finishes after navigation and exercises generation
          // and context guards in addition to the normal abort path.
          signal: new AbortController().signal
        });
        response = new Response(await nativeResponse.arrayBuffer(), {
          status: nativeResponse.status,
          statusText: nativeResponse.statusText,
          headers: nativeResponse.headers
        });
      } else {
        response = new Response(JSON.stringify({ error: "Synthetic stale thread." }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      await control.gate;
      const nativeJson = response.json.bind(response);
      response.json = async () => {
        const payload = await nativeJson();
        window.setTimeout(() => { control.settled = true; }, 0);
        return payload;
      };
      return response;
    };
  });
}

async function armDeferredParentThreadFetch(
  page: Page,
  targetThreadId: string,
  mode: DeferredParentThreadFetchMode
) {
  await page.evaluate(({ threadId, responseMode }) => {
    const control = (window as ParentRaceTestWindow).__maisParentDeferredThreadFetch;
    if (!control || control.release) throw new Error("Deferred parent thread fetch is not ready to arm.");
    control.targetThreadId = threadId;
    control.mode = responseMode;
    control.started = false;
    control.settled = false;
    control.gate = new Promise<void>((resolve) => { control.release = resolve; });
    control.armed = true;
  }, { threadId: targetThreadId, responseMode: mode });
}

async function waitForDeferredParentThreadFetch(page: Page) {
  await page.waitForFunction(() => (
    (window as ParentRaceTestWindow).__maisParentDeferredThreadFetch?.started === true
  ));
}

async function releaseDeferredParentThreadFetch(page: Page) {
  await page.evaluate(() => {
    const control = (window as ParentRaceTestWindow).__maisParentDeferredThreadFetch;
    if (!control?.started || !control.release) throw new Error("No deferred parent thread fetch is pending.");
    const release = control.release;
    control.release = null;
    release();
  });
  await page.waitForFunction(() => (
    (window as ParentRaceTestWindow).__maisParentDeferredThreadFetch?.settled === true
  ));
  // Give React and the App Router one bounded turn to surface an illegal stale
  // commit before asserting that the newer context remains authoritative.
  await page.waitForTimeout(250);
}

async function pushParentMessageContext(page: Page, href: string) {
  await page.evaluate((targetHref) => {
    // Next 15 integrates native pushState calls with useSearchParams. Keeping
    // this navigation client-side is essential: both report contexts must be
    // resolved from the exact same initialData batch.
    window.history.pushState(null, "", targetHref);
  }, href);
  await expect(page).toHaveURL(`${baseURL}${href}`);
}

async function expectParentReportComposeContext(
  page: Page,
  expected: { studentId: string; reportId: string; classId: string; subject: string }
) {
  const compose = page.locator("form").filter({ has: page.getByRole("button", { name: /Send message/i }) });
  await expect(compose.getByLabel(/^Child$/i)).toHaveValue(expected.studentId);
  await expect(compose.getByLabel(/Class and teacher/i)).toHaveValue(expected.classId);
  await expect(compose.getByLabel(/Linked report/i)).toHaveValue(expected.reportId);
  await expect(compose.getByLabel(/^Category$/i)).toHaveValue("report-question");
  await expect(compose.getByLabel(/^Subject$/i)).toHaveValue(expected.subject);
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
    test.setTimeout(120_000);
    const pageErrors = collectPageErrors(page);
    const extraChild = await registerStudentViaApi(contexts, testInfo, "focus");
    const { inviteCode, classId: extraClassId } = await issueGuardianInvitationForStudent(
      contexts,
      testInfo,
      extraChild,
      "focus"
    );

    await loginAsDemoParent(page);
    const linkResponse = await page.request.post("/api/parent/children/link", {
      data: { inviteCode, relationship: "guardian" }
    });
    expect(linkResponse.status()).toBe(200);

    await page.goto("/parent");
    const focus = page.getByLabel(/Child focus/i);
    await expect(focus).toBeVisible();

    await focus.selectOption(extraChild.userId);
    await expect(page).toHaveURL(new RegExp(`studentId=${escapeRegex(encodeURIComponent(extraChild.userId))}`));
    const overview = page.locator("main");
    const selectedChildPath = `/parent/children/${encodeURIComponent(extraChild.userId)}`;
    const previousChildPath = `/parent/children/${encodeURIComponent(demoStudentUserId)}`;
    await expect(overview.getByRole("heading", { name: /Today’s focus/i })).toBeVisible();
    await expect(overview.getByText(extraChild.name, { exact: true }).first()).toBeVisible();
    await expect(overview.locator(`a[href="${selectedChildPath}"]`)).toHaveCount(1);
    await expect(overview.locator(`a[href="${previousChildPath}"]`)).toHaveCount(0);

    // The selector must carry the focus into a sibling list route rather than resetting it.
    await page.getByRole("navigation", { name: /Parent navigation/i }).getByRole("link", { name: /^Reports$/i }).click();
    await expect(page).toHaveURL(new RegExp(`/parent/reports\\?studentId=${escapeRegex(encodeURIComponent(extraChild.userId))}`));

    // On a child detail route the selector navigates instead of appending a query param.
    await page.goto(`/parent/children/${encodeURIComponent(demoStudentUserId)}`);
    await page.getByLabel(/Child focus/i).selectOption(extraChild.userId);
    await expect(page).toHaveURL(new RegExp(`/parent/children/${escapeRegex(encodeURIComponent(extraChild.userId))}$`));
    await expect(page.locator("main").getByRole("heading", { name: extraChild.name }).first()).toBeVisible();

    const allMessagesResponse = await page.request.get("/api/parent/messages");
    expect(allMessagesResponse.status()).toBe(200);
    const allMessagesBeforeReports = await allMessagesResponse.json() as ParentMessagesResponse;
    const demoClassId = allMessagesBeforeReports.data.composeTargets.find(
      (target) => target.studentId === demoStudentUserId
    )?.classId;
    expect(demoClassId, "The demo child must expose an authorized teacher target.").toBeTruthy();

    const { context: teacherContext } = await loginApi(contexts, demoTeacher.username, demoTeacher.password);
    const reportA = await saveParentSummaryReport(teacherContext, {
      classId: demoClassId!,
      studentId: demoStudentUserId,
      language: "en",
      marker: `report-context-a ${uniqueSuffix(testInfo)}`
    });
    const reportB = await saveParentSummaryReport(teacherContext, {
      classId: extraClassId,
      studentId: extraChild.userId,
      language: "en",
      marker: `report-context-b ${uniqueSuffix(testInfo)}`
    });

    // Load one unfiltered server batch containing both reports. The client-only
    // history sequence below proves A -> B -> back -> forward never resolves a
    // report/class/student/subject from another data generation.
    await page.goto("/parent/messages");
    const reportPayloadResponse = await page.request.get("/api/parent/messages");
    expect(reportPayloadResponse.status()).toBe(200);
    const reportPayload = await reportPayloadResponse.json() as ParentMessagesResponse;
    const parentReportA = reportPayload.data.reports.find((report) => report.id === reportA.report.id);
    const parentReportB = reportPayload.data.reports.find((report) => report.id === reportB.report.id);
    expect(parentReportA).toBeTruthy();
    expect(parentReportB).toBeTruthy();

    const reportHrefA = `/parent/messages?studentId=${encodeURIComponent(demoStudentUserId)}&category=report-question&reportId=${encodeURIComponent(parentReportA!.id)}`;
    const reportHrefB = `/parent/messages?studentId=${encodeURIComponent(extraChild.userId)}&category=report-question&reportId=${encodeURIComponent(parentReportB!.id)}`;
    const expectedReportA = {
      studentId: demoStudentUserId,
      reportId: parentReportA!.id,
      classId: demoClassId!,
      subject: `Question about ${parentReportA!.title.en}`
    };
    const expectedReportB = {
      studentId: extraChild.userId,
      reportId: parentReportB!.id,
      classId: extraClassId,
      subject: `Question about ${parentReportB!.title.en}`
    };
    await pushParentMessageContext(page, reportHrefA);
    await expectParentReportComposeContext(page, expectedReportA);
    await pushParentMessageContext(page, reportHrefB);
    await expectParentReportComposeContext(page, expectedReportB);
    await page.goBack();
    await expect(page).toHaveURL(`${baseURL}${reportHrefA}`);
    await expectParentReportComposeContext(page, expectedReportA);
    await page.goForward();
    await expect(page).toHaveURL(`${baseURL}${reportHrefB}`);
    await expectParentReportComposeContext(page, expectedReportB);

    expectNoPageErrors(pageErrors);
  });

  test("the Ask teacher form creates a thread and the Threads list switches between them", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const pageErrors = collectPageErrors(page);
    const suffix = uniqueSuffix(testInfo).slice(0, 24);
    const firstSubject = `Matrix compose A ${suffix}`;
    const secondSubject = `Matrix compose B ${suffix}`;
    const extraChild = await registerStudentViaApi(contexts, testInfo, "thread-race");
    const { inviteCode } = await issueGuardianInvitationForStudent(contexts, testInfo, extraChild, "thread-race");

    await loginAsDemoParent(page);
    const linkResponse = await page.request.post("/api/parent/children/link", {
      data: { inviteCode, relationship: "guardian" }
    });
    expect(linkResponse.status()).toBe(200);
    await page.goto("/parent/messages");
    await expect(page.getByRole("heading", { name: /Ask teacher/i })).toBeVisible();

    const compose = page.locator("form").filter({ has: page.getByRole("button", { name: /Send message/i }) });
    const threadBySubject = new Map<string, string>();

    for (const [subject, studentId] of [
      [firstSubject, demoStudentUserId],
      [secondSubject, extraChild.userId]
    ] as const) {
      await compose.getByLabel(/^Child$/i).selectOption(studentId);
      await compose.getByLabel(/^Subject$/i).fill(subject);
      await compose.getByLabel(/^Message$/i).fill(`Home context for ${subject}.`);
      const created = page.waitForResponse((response) =>
        response.url().includes("/api/parent/messages") && response.request().method() === "POST");
      await compose.getByRole("button", { name: /Send message/i }).click();
      const createdResponse = await created;
      expect(createdResponse.status()).toBe(201);
      const createRequest = createdResponse.request().postDataJSON() as {
        classId?: unknown;
        idempotencyKey?: unknown;
      };
      expect(createRequest.classId).toEqual(expect.any(String));
      expect(String(createRequest.classId)).not.toHaveLength(0);
      expect(createRequest.idempotencyKey).toMatch(/^[A-Za-z0-9._:~-]{16,128}$/);
      const createdPayload = await createdResponse.json() as { thread: { id: string } };
      threadBySubject.set(subject, createdPayload.thread.id);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(subject), "i") })).toBeVisible();
      await expect(page).toHaveURL(/thread=/);
      // The form clears so the next message does not inherit the previous subject.
      await expect(compose.getByLabel(/^Subject$/i)).toHaveValue("");
    }

    const threads = page.getByRole("heading", { name: /^Threads$/i }).locator("xpath=ancestor::aside[1]");
    const firstThreadId = threadBySubject.get(firstSubject)!;
    const secondThreadId = threadBySubject.get(secondSubject)!;
    await installDeferredParentThreadFetch(page);

    await armDeferredParentThreadFetch(page, firstThreadId, "success");
    await threads.getByRole("button", { name: new RegExp(escapeRegex(firstSubject), "i") }).click();
    await waitForDeferredParentThreadFetch(page);
    // deferred-thread-context-child: an old A response must not cross the
    // external child-context navigation into B.
    await page.getByLabel(/Child focus/i).selectOption(extraChild.userId);
    await expect(page).toHaveURL(new RegExp(`studentId=${escapeRegex(encodeURIComponent(extraChild.userId))}`));
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(secondSubject), "i") })).toBeVisible();
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(firstSubject), "i") })).toHaveCount(0);
    await releaseDeferredParentThreadFetch(page);
    await expect(page).toHaveURL(new RegExp(`studentId=${escapeRegex(encodeURIComponent(extraChild.userId))}`));
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(firstSubject), "i") })).toHaveCount(0);

    await armDeferredParentThreadFetch(page, secondThreadId, "not-found");
    await threads.getByRole("button", { name: new RegExp(escapeRegex(secondSubject), "i") }).click();
    await waitForDeferredParentThreadFetch(page);
    // deferred-thread-context-all: an old 404 must not surface after switching
    // from filtered B to the unfiltered All context.
    await threads.getByRole("link", { name: /^All$/i }).click();
    await expect(page).toHaveURL(`${baseURL}/parent/messages`);
    await releaseDeferredParentThreadFetch(page);
    await expect(page).toHaveURL(`${baseURL}/parent/messages`);
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(firstSubject), "i") })).toBeVisible();
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(secondSubject), "i") })).toBeVisible();

    const messages = await page.request.get("/api/parent/messages");
    const payload = await messages.json() as ParentMessagesResponse;
    expect(payload.data.threads.filter((thread) => [firstSubject, secondSubject].includes(thread.subject.en))).toHaveLength(2);

    expectNoPageErrors(pageErrors);
  });
});
