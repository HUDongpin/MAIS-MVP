import { expect, request as apiRequest, test, type APIRequestContext, type Locator, type Page, type TestInfo } from "@playwright/test";
import {
  collectPageErrors,
  demoParentUserId,
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

function expectedParentHeaders() {
  return expectedUserHeaders(demoParentUserId);
}

function expectedUserHeaders(userId: string) {
  return { "X-MAIS-Expected-User-Id": userId };
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

async function registerTeacherViaApi(contexts: APIRequestContext[], testInfo: TestInfo, label: string) {
  const context = await newApiContext(contexts);
  const suffix = uniqueSuffix(testInfo).slice(0, 40);
  const teacher = {
    name: `Parent Matrix ${label} ${suffix}`,
    username: `parent-matrix-${label}-${suffix}@example.test`.toLowerCase(),
    password: "start12345"
  };
  const response = await context.post("/api/auth/register", {
    data: {
      role: "teacher",
      name: teacher.name,
      username: teacher.username,
      email: teacher.username,
      password: teacher.password,
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      language: "en",
      theme: "dark"
    }
  });
  expect(response.ok(), `Teacher registration failed: ${response.status()}`).toBeTruthy();
  const session = await response.json() as AuthSession;
  expect(session.user.role).toBe("teacher");
  return { context, session };
}

async function issueGuardianInvitationForStudent(
  contexts: APIRequestContext[],
  testInfo: TestInfo,
  student: { username: string; userId: string },
  label: string
) {
  const { context, session } = await loginApi(contexts, demoTeacher.username, demoTeacher.password);
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
    `/api/teacher/classes/${encodeURIComponent(teacherClass.class.id)}/students/${encodeURIComponent(student.userId)}/guardian-invitations`,
    { headers: { "X-MAIS-Expected-User-Id": session.user.id } }
  );
  expect(issueResponse.status()).toBe(201);
  const payload = await issueResponse.json() as { invitation: { token: string } };
  expect(payload.invitation.token).toMatch(/^MAIS-[A-F0-9]{24}$/);
  return { inviteCode: payload.invitation.token, classId: teacherClass.class.id };
}

async function saveParentSummaryReport(
  teacherContext: APIRequestContext,
  input: { teacherId: string; classId: string; studentId: string; language: "en" | "zh"; marker: string }
) {
  const response = await teacherContext.post("/api/teacher/reports/save", {
    headers: expectedUserHeaders(input.teacherId),
    data: {
      type: "parent-summary",
      language: input.language,
      classId: input.classId,
      studentId: input.studentId,
      remarks: input.marker,
      expectedUserId: input.teacherId
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
  expected: {
    studentId: string;
    reportId: string;
    classId: string;
    subject: string;
    className?: string;
    teacherName?: string;
  }
) {
  const compose = parentComposeForm(page);
  await expectParentComposeLabels(compose);
  await expect(compose.locator('[name="studentId"]')).toHaveValue(expected.studentId);
  await expect(compose.locator('[name="classId"]')).toHaveValue(expected.classId);
  await expect(compose.locator('[name="reportId"]')).toHaveValue(expected.reportId);
  await expect(compose.locator('[name="category"]')).toHaveValue("report-question");
  await expect(compose.locator('[name="subject"]')).toHaveValue(expected.subject);
  const selectedClassAndTeacher = compose.locator('[name="classId"] option:checked');
  if (expected.className) await expect(selectedClassAndTeacher).toContainText(expected.className);
  if (expected.teacherName) await expect(selectedClassAndTeacher).toContainText(expected.teacherName);
}

function parentComposeForm(page: Page) {
  return page.locator('form[aria-labelledby="parent-ask-teacher-heading"]');
}

async function expectRuntimeLabelAssociation(field: Locator, expectedLabel: string) {
  const association = await field.evaluate((element) => {
    const control = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const label = control.labels?.[0] ?? null;
    return {
      controlId: control.id,
      labelFor: label?.htmlFor ?? "",
      labelText: label?.querySelector(":scope > span")?.textContent?.trim() ?? ""
    };
  });
  expect(association.controlId).not.toBe("");
  expect(association.labelFor).toBe(association.controlId);
  expect(association.labelText).toBe(expectedLabel);
}

async function expectParentComposeLabels(compose: Locator) {
  for (const [name, label] of [
    ["studentId", "Child"],
    ["classId", "Class and teacher"],
    ["category", "Category"],
    ["reportId", "Linked report"],
    ["subject", "Subject"],
    ["body", "Message"]
  ] as const) {
    await expectRuntimeLabelAssociation(compose.locator(`[name="${name}"]`), label);
  }
}

async function verifyLostResponseIdempotency(page: Page, testInfo: TestInfo) {
  const suffix = uniqueSuffix(testInfo).slice(0, 24);
  const subject = `Lost response ${suffix}`;
  const messageBody = `One durable message for ${suffix}.`;

  await page.goto("/parent/messages");
  const compose = parentComposeForm(page);
  await compose.locator('[name="studentId"]').selectOption(demoStudentUserId);
  const classSelect = compose.locator('[name="classId"]');
  if (await classSelect.inputValue() === "") {
    const firstClassId = await classSelect.locator('option:not([value=""])').first().getAttribute("value");
    expect(firstClassId, "The demo child must have an authorized teacher target.").toBeTruthy();
    await classSelect.selectOption(firstClassId!);
  }
  await compose.locator('[name="subject"]').fill(subject);
  await compose.locator('[name="body"]').fill(messageBody);

  let committedThreadId = "";
  let firstIdempotencyKey = "";
  let droppedFirstResponse = false;
  await page.route("**/api/parent/messages", async (route) => {
    if (route.request().method() !== "POST" || droppedFirstResponse) {
      await route.continue();
      return;
    }
    droppedFirstResponse = true;
    const requestBody = route.request().postDataJSON() as { idempotencyKey?: unknown };
    firstIdempotencyKey = typeof requestBody.idempotencyKey === "string" ? requestBody.idempotencyKey : "";
    const committedResponse = await route.fetch();
    expect(committedResponse.status()).toBe(201);
    const committedPayload = await committedResponse.json() as { thread?: { id?: unknown } };
    committedThreadId = typeof committedPayload.thread?.id === "string" ? committedPayload.thread.id : "";
    expect(committedThreadId).not.toBe("");
    await route.abort("connectionfailed");
  });

  try {
    await compose.getByRole("button", { name: /Send message/i }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText(/Retry safely|安全重試|安全重试/i);
    await expect(compose.getByRole("button", { name: /Send message/i })).toBeEnabled();
    await expect(compose.locator('[name="subject"]')).toHaveValue(subject);
    await expect(compose.locator('[name="body"]')).toHaveValue(messageBody);

    const replayResponsePromise = page.waitForResponse((response) => (
      new URL(response.url()).pathname === "/api/parent/messages"
      && response.request().method() === "POST"
    ));
    await compose.getByRole("button", { name: /Send message/i }).click();
    const replayResponse = await replayResponsePromise;
    expect(replayResponse.status()).toBe(200);
    const replayRequest = replayResponse.request().postDataJSON() as { idempotencyKey?: unknown };
    const replayPayload = await replayResponse.json() as { replayed?: unknown; thread?: { id?: unknown } };
    expect(replayRequest.idempotencyKey).toBe(firstIdempotencyKey);
    expect(replayPayload).toMatchObject({ replayed: true, thread: { id: committedThreadId } });
  } finally {
    await page.unroute("**/api/parent/messages");
  }

  const messagesResponse = await page.request.get("/api/parent/messages", {
    headers: expectedParentHeaders()
  });
  expect(messagesResponse.status()).toBe(200);
  const messagesPayload = await messagesResponse.json() as ParentMessagesResponse;
  expect(messagesPayload.data.threads.filter((thread) => thread.subject.en === subject)).toHaveLength(1);
}

async function verifyMessageTransportFailures(page: Page, testInfo: TestInfo) {
  type FailureScenario = "offline" | "timeout" | "rate-limited" | "unavailable";
  let scenario: FailureScenario = "offline";

  await page.goto("/parent/messages");
  const compose = parentComposeForm(page);
  await compose.locator('[name="studentId"]').selectOption(demoStudentUserId);
  const classSelect = compose.locator('[name="classId"]');
  if (await classSelect.inputValue() === "") {
    const firstClassId = await classSelect.locator('option:not([value=""])').first().getAttribute("value");
    expect(firstClassId).toBeTruthy();
    await classSelect.selectOption(firstClassId!);
  }

  await page.route("**/api/parent/messages", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    if (scenario === "offline") {
      await route.abort("internetdisconnected");
      return;
    }
    if (scenario === "timeout") {
      await route.abort("timedout");
      return;
    }
    if (scenario === "rate-limited") {
      await route.fulfill({
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "7" },
        body: JSON.stringify({ error: "Too many requests." })
      });
      return;
    }
    await route.fulfill({
      status: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Temporarily unavailable." })
    });
  });

  try {
    const cases: Array<{ scenario: FailureScenario; feedback: RegExp }> = [
      { scenario: "offline", feedback: /connection ended before delivery could be confirmed/i },
      { scenario: "timeout", feedback: /connection ended before delivery could be confirmed/i },
      { scenario: "rate-limited", feedback: /Try again in about 7 seconds/i },
      { scenario: "unavailable", feedback: /service is temporarily unavailable/i }
    ];
    const suffix = uniqueSuffix(testInfo).slice(0, 20);
    for (const [index, item] of cases.entries()) {
      scenario = item.scenario;
      const subject = `${item.scenario} ${suffix} ${index}`;
      const body = `Retain this ${item.scenario} draft.`;
      await compose.locator('[name="subject"]').fill(subject);
      await compose.locator('[name="body"]').fill(body);
      const send = compose.getByRole("button", { name: /Send message/i });
      await send.click();
      await expect(page.locator("main").getByRole("alert")).toContainText(item.feedback);
      await expect(send).toBeEnabled();
      await expect(compose.locator('[name="subject"]')).toHaveValue(subject);
      await expect(compose.locator('[name="body"]')).toHaveValue(body);
    }
  } finally {
    await page.unroute("**/api/parent/messages");
  }
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
  const response = await page.request.get("/api/parent/notices", {
    headers: expectedParentHeaders()
  });
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

    const foundation = await page.request.get("/api/parent/foundation", {
      headers: expectedParentHeaders()
    });
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
    await expect(noticeFilter(page, "Acknowledged")).toHaveAttribute("aria-pressed", "true");
    await expect(noticeFilter(page, "Pending")).toHaveAttribute("aria-pressed", "false");
    await expect(card).toHaveCount(0);
    await noticeFilter(page, "Pending").click();
    await expect(noticeFilter(page, "Pending")).toHaveAttribute("aria-pressed", "true");
    await expect(noticeFilter(page, "Acknowledged")).toHaveAttribute("aria-pressed", "false");
    await expect(card).toHaveCount(1);

    await card.getByRole("button", { name: /Confirm receipt/i }).click();
    await expect(page.getByRole("status")).toContainText(/Receipt confirmed\./i);

    await noticeFilter(page, "All").click();
    await expect(noticeCard(page, subject).getByText("Acknowledged", { exact: true })).toBeVisible();
    await expect(noticeCard(page, subject).getByRole("button", { name: /Confirm receipt/i })).toHaveCount(0);

    const notices = await parentNotices(page);
    const acknowledged = notices.data.notices.find((notice) => notice.subject.en === subject);
    const recipient = acknowledged?.recipients[0];
    expect(recipient?.status).toBe("acknowledged");
    expect(recipient?.acknowledgedAt).toBeTruthy();

    // A receipt is evidence of WHEN a guardian confirmed; a repeat POST must not re-stamp it.
    const repeat = await page.request.post(`/api/parent/notices/${encodeURIComponent(recipient!.id)}/ack`, {
      headers: expectedParentHeaders()
    });
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

    expect((await page.request.post("/api/parent/notices/notice-recipient-does-not-exist/ack", {
      headers: expectedParentHeaders()
    })).status()).toBe(404);
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
    test.setTimeout(240_000);
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
      headers: expectedParentHeaders(),
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

    const allMessagesResponse = await page.request.get("/api/parent/messages", {
      headers: expectedParentHeaders()
    });
    expect(allMessagesResponse.status()).toBe(200);
    const allMessagesBeforeReports = await allMessagesResponse.json() as ParentMessagesResponse;
    const { context: teacherContext, session: teacherSession } = await loginApi(
      contexts,
      demoTeacher.username,
      demoTeacher.password
    );
    const demoTarget = allMessagesBeforeReports.data.composeTargets.find((target) => (
      target.studentId === demoStudentUserId && target.teacherName === teacherSession.user.name
    ));
    expect(demoTarget, "The demo child must expose the demo teacher's authorized target.").toBeTruthy();

    const reportA = await saveParentSummaryReport(teacherContext, {
      teacherId: teacherSession.user.id,
      classId: demoTarget!.classId,
      studentId: demoStudentUserId,
      language: "en",
      marker: `report-context-a ${uniqueSuffix(testInfo)}`
    });
    const reportB = await saveParentSummaryReport(teacherContext, {
      teacherId: teacherSession.user.id,
      classId: extraClassId,
      studentId: extraChild.userId,
      language: "en",
      marker: `report-context-b ${uniqueSuffix(testInfo)}`
    });

    // Build one child -> two stable classes -> two different teachers -> two
    // reports. This is deliberately separate from the two-child history case:
    // neither studentId nor display names can disambiguate these report routes.
    const foreignStudent = await registerStudentViaApi(contexts, testInfo, "foreign-report-scope");
    const { context: secondTeacherContext, session: secondTeacherSession } = await registerTeacherViaApi(
      contexts,
      testInfo,
      "second-teacher"
    );
    const secondClassName = `Parent Matrix second teacher ${uniqueSuffix(testInfo).slice(0, 28)}`;
    const secondClassResponse = await secondTeacherContext.post("/api/teacher/classes", {
      headers: expectedUserHeaders(secondTeacherSession.user.id),
      data: {
        name: secondClassName,
        grade: "S3",
        academicYear: "2026-2027",
        description: "Two-teacher parent report routing acceptance fixture."
      }
    });
    expect(secondClassResponse.status()).toBe(201);
    const secondClass = await secondClassResponse.json() as { class: { id: string } };
    for (const username of [demoStudent.username, foreignStudent.username]) {
      const addStudentResponse = await secondTeacherContext.post(
        `/api/teacher/classes/${encodeURIComponent(secondClass.class.id)}/students`,
        {
          headers: expectedUserHeaders(secondTeacherSession.user.id),
          data: { username }
        }
      );
      expect(addStudentResponse.ok(), `Second teacher could not add ${username}.`).toBeTruthy();
    }

    // Real HTTP authorization regression: an accessible class paired with a
    // studentId that only belongs to another teacher's class must fail closed
    // for both preview and save. A fallback to the first student/class would
    // turn either assertion green for the wrong data, so inspect the exact 404.
    const foreignPreviewResponse = await teacherContext.get(
      `/api/teacher/reports/preview?type=parent-summary&language=en&classId=${encodeURIComponent(demoTarget!.classId)}&studentId=${encodeURIComponent(foreignStudent.userId)}`,
      { headers: expectedUserHeaders(teacherSession.user.id) }
    );
    expect(foreignPreviewResponse.status()).toBe(404);
    expect(await foreignPreviewResponse.json()).toEqual({ error: "Report preview unavailable." });
    const foreignSaveResponse = await teacherContext.post("/api/teacher/reports/save", {
      headers: expectedUserHeaders(teacherSession.user.id),
      data: {
        type: "parent-summary",
        language: "en",
        classId: demoTarget!.classId,
        studentId: foreignStudent.userId,
        remarks: "MUST_NOT_BE_SAVED",
        expectedUserId: teacherSession.user.id
      }
    });
    expect(foreignSaveResponse.status()).toBe(404);
    expect(await foreignSaveResponse.json()).toEqual({ error: "Report preview unavailable." });

    const reportC = await saveParentSummaryReport(secondTeacherContext, {
      teacherId: secondTeacherSession.user.id,
      classId: secondClass.class.id,
      studentId: demoStudentUserId,
      language: "en",
      marker: `report-context-second-teacher ${uniqueSuffix(testInfo)}`
    });

    // Load one unfiltered server batch containing both reports. The client-only
    // history sequence below proves A -> B -> back -> forward never resolves a
    // report/class/student/subject from another data generation.
    await page.goto("/parent/messages");
    const reportPayloadResponse = await page.request.get("/api/parent/messages", {
      headers: expectedParentHeaders()
    });
    expect(reportPayloadResponse.status()).toBe(200);
    const reportPayload = await reportPayloadResponse.json() as ParentMessagesResponse;
    const parentReportA = reportPayload.data.reports.find((report) => report.id === reportA.report.id);
    const parentReportB = reportPayload.data.reports.find((report) => report.id === reportB.report.id);
    const parentReportC = reportPayload.data.reports.find((report) => report.id === reportC.report.id);
    const secondTeacherTarget = reportPayload.data.composeTargets.find((target) => (
      target.studentId === demoStudentUserId
      && target.classId === secondClass.class.id
      && target.teacherName === secondTeacherSession.user.name
    ));
    expect(parentReportA).toBeTruthy();
    expect(parentReportB).toBeTruthy();
    expect(parentReportC).toBeTruthy();
    expect(secondTeacherTarget).toMatchObject({
      classId: secondClass.class.id,
      className: secondClassName,
      teacherName: secondTeacherSession.user.name
    });

    const reportHrefA = `/parent/messages?studentId=${encodeURIComponent(demoStudentUserId)}&category=report-question&reportId=${encodeURIComponent(parentReportA!.id)}`;
    const reportHrefB = `/parent/messages?studentId=${encodeURIComponent(extraChild.userId)}&category=report-question&reportId=${encodeURIComponent(parentReportB!.id)}`;
    const reportHrefC = `/parent/messages?studentId=${encodeURIComponent(demoStudentUserId)}&category=report-question&reportId=${encodeURIComponent(parentReportC!.id)}`;
    const expectedReportA = {
      studentId: demoStudentUserId,
      reportId: parentReportA!.id,
      classId: demoTarget!.classId,
      subject: `Question about ${parentReportA!.title.en}`,
      className: demoTarget!.className,
      teacherName: teacherSession.user.name
    };
    const expectedReportB = {
      studentId: extraChild.userId,
      reportId: parentReportB!.id,
      classId: extraClassId,
      subject: `Question about ${parentReportB!.title.en}`
    };
    const expectedReportC = {
      studentId: demoStudentUserId,
      reportId: parentReportC!.id,
      classId: secondClass.class.id,
      subject: `Question about ${parentReportC!.title.en}`,
      className: secondClassName,
      teacherName: secondTeacherSession.user.name
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

    // Now keep studentId fixed and switch only the report. The browser must
    // follow each report's stable classId and generating teacher exactly.
    await pushParentMessageContext(page, reportHrefA);
    await expectParentReportComposeContext(page, expectedReportA);
    await pushParentMessageContext(page, reportHrefC);
    await expectParentReportComposeContext(page, expectedReportC);
    await page.goBack();
    await expect(page).toHaveURL(`${baseURL}${reportHrefA}`);
    await expectParentReportComposeContext(page, expectedReportA);
    await page.goForward();
    await expect(page).toHaveURL(`${baseURL}${reportHrefC}`);
    await expectParentReportComposeContext(page, expectedReportC);

    expectNoPageErrors(pageErrors);
  });

  test("the Ask teacher form creates a thread and the Threads list switches between them", async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    const pageErrors = collectPageErrors(page);
    const suffix = uniqueSuffix(testInfo).slice(0, 24);
    const firstSubject = `Matrix compose A ${suffix}`;
    const secondSubject = `Matrix compose B ${suffix}`;
    const extraChild = await registerStudentViaApi(contexts, testInfo, "thread-race");
    const { inviteCode } = await issueGuardianInvitationForStudent(contexts, testInfo, extraChild, "thread-race");

    await loginAsDemoParent(page);
    const linkResponse = await page.request.post("/api/parent/children/link", {
      headers: expectedParentHeaders(),
      data: { inviteCode, relationship: "guardian" }
    });
    expect(linkResponse.status()).toBe(200);
    await page.goto("/parent/messages");
    await expect(page.getByRole("heading", { name: /Ask teacher/i })).toBeVisible();

    const compose = parentComposeForm(page);
    await expectParentComposeLabels(compose);
    const threadBySubject = new Map<string, string>();

    for (const [subject, studentId] of [
      [firstSubject, demoStudentUserId],
      [secondSubject, extraChild.userId]
    ] as const) {
      await compose.locator('[name="studentId"]').selectOption(studentId);
      const classSelect = compose.locator('[name="classId"]');
      if (await classSelect.inputValue() === "") {
        const firstAuthorizedClassId = await classSelect.locator('option:not([value=""])').first().getAttribute("value");
        expect(firstAuthorizedClassId, "A linked child must expose an authorized class/teacher target.").toBeTruthy();
        await classSelect.selectOption(firstAuthorizedClassId!);
      }
      const selectedClassId = await classSelect.inputValue();
      await compose.locator('[name="subject"]').fill(subject);
      await compose.locator('[name="body"]').fill(`Home context for ${subject}.`);
      const created = page.waitForResponse((response) =>
        response.url().includes("/api/parent/messages") && response.request().method() === "POST");
      await compose.getByRole("button", { name: /Send message/i }).click();
      const createdResponse = await created;
      expect(createdResponse.status()).toBe(201);
      const createRequest = createdResponse.request().postDataJSON() as {
        classId?: unknown;
        idempotencyKey?: unknown;
      };
      expect(createRequest.classId).toBe(selectedClassId);
      expect(createRequest.idempotencyKey).toMatch(/^[A-Za-z0-9._:~-]{16,128}$/);
      const createdPayload = await createdResponse.json() as { thread: { id: string } };
      threadBySubject.set(subject, createdPayload.thread.id);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(subject), "i") })).toBeVisible();
      await expect(page).toHaveURL(/thread=/);
      // The form clears so the next message does not inherit the previous subject.
      await expect(compose.locator('[name="subject"]')).toHaveValue("");
    }

    const threads = page.getByRole("heading", { name: /^Threads$/i }).locator("xpath=ancestor::aside[1]");
    const firstThreadId = threadBySubject.get(firstSubject)!;
    const secondThreadId = threadBySubject.get(secondSubject)!;
    const firstThreadButton = threads.getByRole("button", { name: new RegExp(escapeRegex(firstSubject), "i") });
    const secondThreadButton = threads.getByRole("button", { name: new RegExp(escapeRegex(secondSubject), "i") });
    await expect(firstThreadButton).toHaveAttribute("aria-pressed", "false");
    await expect(secondThreadButton).toHaveAttribute("aria-pressed", "true");
    await installDeferredParentThreadFetch(page);

    await armDeferredParentThreadFetch(page, firstThreadId, "success");
    await firstThreadButton.click();
    await expect(firstThreadButton).toHaveAttribute("aria-busy", "true");
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
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(secondSubject), "i") })).toHaveAttribute("aria-busy", "true");
    await waitForDeferredParentThreadFetch(page);
    // deferred-thread-context-all: an old 404 must not surface after switching
    // from filtered B to the unfiltered All context.
    await threads.getByRole("link", { name: /^All$/i }).click();
    await expect(page).toHaveURL(`${baseURL}/parent/messages`);
    await expect(threads.getByRole("link", { name: /^All$/i })).toHaveAttribute("aria-current", "page");
    await releaseDeferredParentThreadFetch(page);
    await expect(page).toHaveURL(`${baseURL}/parent/messages`);
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(firstSubject), "i") })).toBeVisible();
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(secondSubject), "i") })).toBeVisible();

    // The unfiltered All state is a durable navigation state, not an implicit
    // first-child selection. Prove it survives a document refresh and a real
    // filtered -> All -> back -> forward browser-history sequence.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(`${baseURL}/parent/messages`);
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(firstSubject), "i") })).toBeVisible();
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(secondSubject), "i") })).toBeVisible();
    const childFocus = page.getByRole("combobox", { name: /Child focus/i });
    await childFocus.selectOption(extraChild.userId);
    await expect(page).toHaveURL(new RegExp(`studentId=${escapeRegex(encodeURIComponent(extraChild.userId))}`));
    await threads.getByRole("link", { name: /^All$/i }).click();
    await expect(page).toHaveURL(`${baseURL}/parent/messages`);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`studentId=${escapeRegex(encodeURIComponent(extraChild.userId))}`));
    await page.goForward();
    await expect(page).toHaveURL(`${baseURL}/parent/messages`);
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(firstSubject), "i") })).toBeVisible();
    await expect(threads.getByRole("button", { name: new RegExp(escapeRegex(secondSubject), "i") })).toBeVisible();

    const messages = await page.request.get("/api/parent/messages", {
      headers: expectedParentHeaders()
    });
    const payload = await messages.json() as ParentMessagesResponse;
    expect(payload.data.threads.filter((thread) => [firstSubject, secondSubject].includes(thread.subject.en))).toHaveLength(2);

    // Preserve the full write-path acceptance while keeping this suite's
    // frozen 44 project-instance distribution: the transport and lost-response
    // cases are sub-scenarios of the existing compose/thread contract.
    await verifyLostResponseIdempotency(page, testInfo);
    await verifyMessageTransportFailures(page, testInfo);

    expectNoPageErrors(pageErrors);
  });
});
