import { expect, request as apiRequest, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { parentMessageBodyMaxLength, parentMessageSubjectMaxLength } from "../../lib/parentConstraints";
import {
  collectPageErrors,
  demoParent,
  demoStudent,
  expectNoPageErrors,
  loginAs,
  loginAsDemoParent,
  loginAsDemoStudent,
  loginAsTeacher,
  logoutIfVisible,
  uniqueSuffix
} from "./helpers";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const e2eDbPath = process.env.HK_MATH_DB_PATH
  ? path.resolve(process.env.HK_MATH_DB_PATH)
  : path.join(process.cwd(), ".tmp/e2e/hk-math-db.sqlite");

type UserRole = "student" | "teacher" | "parent" | "admin";

type AuthSession = {
  user: {
    id: string;
    name: string;
    username: string;
    role: UserRole;
    grade: string;
  };
};

type TestStudent = {
  name: string;
  username: string;
  password: string;
  userId: string;
};

type AppStateRow = {
  payload: string;
};

type AppStatePayload = {
  users: Array<{
    id: string;
    role: UserRole;
  }>;
  student_profiles?: Array<{
    user_id: string;
    name: string;
    grade: string;
    parent_invite_code?: string;
    avatar_id?: string;
  }>;
  guardian_links?: Array<{
    id: string;
    parent_id: string;
    student_id: string;
    status: "pending" | "active" | "revoked";
  }>;
};

type ParentChildSummary = {
  student: { id: string; name: string; role: string; grade: string };
  averageMastery: number;
  learningMinutes7d: number;
  supportTopics: unknown[];
  assignments: unknown[];
  rewardSummary: { available: number };
  latestParentReport: TeacherReport | null;
};

type TeacherReport = {
  id: string;
  type: string;
  studentId?: string;
  title: { en: string; zh: string };
};

type ParentFoundationResponse = {
  data: {
    parent: { id: string; name: string; role: string };
    children: ParentChildSummary[];
    selectedChild: ParentChildSummary | null;
    totals: {
      children: number;
      activeReports: number;
      openMessages: number;
      pendingAssignments: number;
    };
  };
};

type ParentReportsResponse = {
  data: {
    children: ParentChildSummary[];
    selectedChild: ParentChildSummary | null;
    reports: TeacherReport[];
  };
};

type ParentMessagesResponse = {
  data: {
    threads: ParentMessageThread[];
    selectedThread: ParentMessageThread | null;
    reports: TeacherReport[];
  };
};

type ParentMessageThread = {
  id: string;
  studentId: string;
  studentName: string;
  guardianId?: string;
  parentCategory?: string;
  reportId?: string;
  subject: { en: string; zh: string };
  latestMessage: string;
  messages: Array<{ senderRole: string; body: string }>;
};

type TeacherInboxResponse = {
  inbox: {
    selectedThread: {
      id: string;
      studentName: string;
      parentContext?: {
        guardianName: string;
        category: string;
        reportId?: string;
      };
      messages: Array<{ senderRole: string; body: string }>;
    } | null;
  };
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parentInviteCodeForStudent(studentId: string) {
  const sqlite = new DatabaseSync(e2eDbPath);
  try {
    const row = sqlite
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as AppStateRow | undefined;
    expect(row).toBeTruthy();
    const payload = JSON.parse(row?.payload ?? "{}") as AppStatePayload;
    const inviteCode = payload.student_profiles?.find((profile) => profile.user_id === studentId)?.parent_invite_code;
    expect(inviteCode, `Missing stored parent invite code for ${studentId}`).toMatch(/^MAIS-[A-Z0-9]{10}$/);
    return inviteCode!;
  } finally {
    sqlite.close();
  }
}

async function newApiContext(contexts: APIRequestContext[]) {
  const context = await apiRequest.newContext({ baseURL });
  contexts.push(context);
  return context;
}

async function loginApi(contexts: APIRequestContext[], username: string, password: string) {
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

async function registerStudentViaApi(contexts: APIRequestContext[], testInfo: TestInfo, label: string, grade = "S3") {
  const context = await newApiContext(contexts);
  const suffix = uniqueSuffix(testInfo).slice(0, 44);
  const student = {
    name: `Parent QA ${label} ${suffix}`,
    username: `parent-qa-${label}-${suffix}@example.test`.toLowerCase(),
    password: "start12345"
  };

  const response = await context.post("/api/auth/register", {
    data: {
      name: student.name,
      username: student.username,
      email: student.username,
      password: student.password,
      grade,
      curriculumTrack: "HK",
      curriculumProfile: {
        region: "HK",
        publisher: "HK_UNITED_PRIME_MIA",
      },
      language: "en",
      theme: "dark"
    }
  });
  expect(response.ok()).toBeTruthy();
  const session = await response.json() as AuthSession;
  expect(session.user.role).toBe("student");

  return { ...student, userId: session.user.id } satisfies TestStudent;
}

async function createTeacherClassForStudent(contexts: APIRequestContext[], testInfo: TestInfo, student: TestStudent) {
  const { context } = await loginApi(contexts, "HK Teacher Chan", "12345");
  const suffix = uniqueSuffix(testInfo).slice(0, 28);
  const classResponse = await context.post("/api/teacher/classes", {
    data: {
      name: `Parent QA Class ${suffix}`,
      grade: "S3",
      academicYear: "2026-2027",
      description: "Created by Parent Console verification."
    }
  });
  expect(classResponse.ok()).toBeTruthy();
  const classPayload = await classResponse.json() as { class: { id: string } };

  const addResponse = await context.post(`/api/teacher/classes/${encodeURIComponent(classPayload.class.id)}/students`, {
    data: { username: student.username }
  });
  expect(addResponse.ok()).toBeTruthy();
  return classPayload.class.id;
}

function mutateAppState(mutator: (payload: AppStatePayload) => void) {
  const sqlite = new DatabaseSync(e2eDbPath);
  try {
    const row = sqlite
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as AppStateRow | undefined;
    expect(row).toBeTruthy();

    const payload = JSON.parse(row?.payload ?? "{}") as AppStatePayload;
    mutator(payload);
    sqlite
      .prepare("UPDATE app_state SET payload = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(payload), new Date().toISOString(), "primary");
  } finally {
    sqlite.close();
  }
}

function promoteUserToParent(userId: string, name: string) {
  mutateAppState((payload) => {
    const user = payload.users.find((candidate) => candidate.id === userId);
    expect(user).toBeTruthy();
    if (!user) return;
    user.role = "parent";

    const profile = payload.student_profiles?.find((candidate) => candidate.user_id === userId);
    expect(profile).toBeTruthy();
    if (profile) profile.name = name;
  });
}

function guardianLinksFor(parentId: string, studentId: string) {
  const sqlite = new DatabaseSync(e2eDbPath);
  try {
    const row = sqlite
      .prepare("SELECT payload FROM app_state WHERE id = ?")
      .get("primary") as AppStateRow | undefined;
    expect(row).toBeTruthy();
    const payload = JSON.parse(row?.payload ?? "{}") as AppStatePayload;
    return (payload.guardian_links ?? []).filter((link) => link.parent_id === parentId && link.student_id === studentId);
  } finally {
    sqlite.close();
  }
}

async function disposeAll(contexts: APIRequestContext[]) {
  await Promise.all(contexts.map((context) => context.dispose()));
}

async function parentFoundation(page: Page) {
  const response = await page.request.get("/api/parent/foundation");
  expect(response.ok()).toBeTruthy();
  return await response.json() as ParentFoundationResponse;
}

async function gotoWithDevRetry(page: Page, path: string) {
  try {
    await page.goto(path);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ERR_ABORTED")) throw error;
    await page.goto(path);
  }
}

test.describe("parent console viewport smoke", () => {
  test("parent overview renders without page errors on the active viewport", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsDemoParent(page);
    await expect(page.getByRole("navigation", { name: /Parent navigation/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Today’s home-school picture/i })).toBeVisible();
    await expect(page.getByLabel(/Child focus/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Messages/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Celebrate$/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Support$/i }).first()).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("parent navigation links and child card open their target views", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Parent Console navigation smoke runs once on desktop Chrome.");
    const pageErrors = collectPageErrors(page);

    await loginAsDemoParent(page);
    const foundation = await parentFoundation(page);
    const child = foundation.data.selectedChild ?? foundation.data.children[0];
    if (!child) throw new Error("Expected a linked demo child for parent navigation smoke.");
    const childPath = `/parent/children/${encodeURIComponent(child.student.id)}`;
    const parentNavigation = page.getByRole("navigation", { name: /Parent navigation/i });

    await parentNavigation.getByRole("link", { name: /^Reports$/i }).click();
    await expect(page).toHaveURL(/\/parent\/reports/);
    await expect(page.getByRole("heading", { name: /Teacher-published summaries/i })).toBeVisible();

    await parentNavigation.getByRole("link", { name: /^Messages$/i }).click();
    await expect(page).toHaveURL(/\/parent\/messages/);
    await expect(page.getByRole("heading", { name: /^Threads$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Ask teacher/i })).toBeVisible();

    await parentNavigation.getByRole("link", { name: /Connect child/i }).click();
    await expect(page).toHaveURL(/\/parent\/connect/);
    await expect(page.getByRole("heading", { name: /Use a parent invite code/i })).toBeVisible();

    await parentNavigation.getByRole("link", { name: /^Overview$/i }).click();
    await expect(page).toHaveURL(/\/parent(?:\?studentId=[^&]+)?$/);
    await expect(page.getByRole("heading", { name: /Today’s home-school picture/i })).toBeVisible();

    const childCard = page.locator("main").locator(`a[href="${childPath}"]`);
    await expect(childCard).toHaveCount(1);
    await childCard.click();
    await expect(page).toHaveURL(new RegExp(`${escapeRegex(childPath)}$`));
    await expect(page.getByRole("heading", { name: /Support topics/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Latest parent report/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Recent assignments/i })).toBeVisible();

    expectNoPageErrors(pageErrors);
  });
});

test.describe.serial("parent console end-to-end verification", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Parent Console write-path verification runs once on desktop Chrome.");
  });

  test("auth routing and parent API boundaries are enforced", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/parent");
    await expect(page).toHaveURL(/\/login\?next=%2Fparent/);

    await loginAsDemoParent(page);
    await expect(page).toHaveURL(/\/parent/);
    await expect(page.getByText(demoParent.username).first()).toBeVisible();

    const parentApi = await page.request.get("/api/parent/foundation");
    expect(parentApi.status()).toBe(200);

    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/dashboard/);
    await logoutIfVisible(page);

    await loginAsDemoStudent(page);
    await page.goto("/parent");
    await expect(page).toHaveURL(/\/dashboard/);
    expect((await page.request.get("/api/parent/foundation")).status()).toBe(403);
    await logoutIfVisible(page);

    await loginAsTeacher(page);
    await page.goto("/parent");
    await expect(page).toHaveURL(/\/teacher/);
    expect((await page.request.get("/api/parent/foundation")).status()).toBe(403);

    expectNoPageErrors(pageErrors);
  });

  test("linked child summaries, parent reports, filters, and privacy boundaries work", async ({ page }, testInfo) => {
    const contexts: APIRequestContext[] = [];
    const pageErrors = collectPageErrors(page);

    try {
      const unlinkedStudent = await registerStudentViaApi(contexts, testInfo, "unlinked");

      await loginAsDemoParent(page);
      const foundation = await parentFoundation(page);
      expect(foundation.data.parent.role).toBe("parent");
      expect(foundation.data.children.length).toBeGreaterThanOrEqual(1);
      expect(foundation.data.selectedChild).toBeTruthy();
      expect(foundation.data.totals.children).toBe(foundation.data.children.length);
      expect(typeof foundation.data.totals.activeReports).toBe("number");
      expect(typeof foundation.data.totals.openMessages).toBe("number");
      expect(typeof foundation.data.totals.pendingAssignments).toBe("number");

      const child = foundation.data.selectedChild;
      if (!child) throw new Error("Expected a linked demo child.");
      const childId = child.student.id;
      await expect(page.locator("main").getByRole("heading", { name: child.student.name }).first()).toBeVisible();

      const childSummaryResponse = await page.request.get(`/api/parent/children/${encodeURIComponent(childId)}/summary`);
      expect(childSummaryResponse.status()).toBe(200);
      const childSummary = await childSummaryResponse.json() as { summary: ParentChildSummary };
      expect(childSummary.summary.student.id).toBe(childId);
      expect(typeof childSummary.summary.averageMastery).toBe("number");
      expect(typeof childSummary.summary.learningMinutes7d).toBe("number");
      expect(Array.isArray(childSummary.summary.supportTopics)).toBeTruthy();
      expect(Array.isArray(childSummary.summary.assignments)).toBeTruthy();
      expect(typeof childSummary.summary.rewardSummary.available).toBe("number");

      await page.goto(`/parent/children/${encodeURIComponent(childId)}`);
      await expect(page.getByRole("heading", { name: /Support topics/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Latest parent report/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Recent assignments/i })).toBeVisible();
      await expect(page.getByText(/average mastery/i).first()).toBeVisible();
      await expect(page.getByText(/minutes 7d/i).first()).toBeVisible();
      await expect(page.getByText(/points/i).first()).toBeVisible();
      await expect(page.getByText(/Messages and Nova Tutor|Last AI message|Create assignment|Generate report|Save report|Edit profile/i)).toHaveCount(0);

      expect((await page.request.get(`/api/parent/children/${encodeURIComponent(unlinkedStudent.userId)}/summary`)).status()).toBe(404);
      const linkResponse = await page.request.post("/api/parent/children/link", {
        data: {
          inviteCode: parentInviteCodeForStudent(unlinkedStudent.userId),
          relationship: "guardian"
        }
      });
      expect(linkResponse.status()).toBe(200);
      expect((await page.request.get(`/api/parent/children/${encodeURIComponent(unlinkedStudent.userId)}/summary`)).status()).toBe(200);

      const allReportsResponse = await page.request.get("/api/parent/reports");
      expect(allReportsResponse.status()).toBe(200);
      const allReports = await allReportsResponse.json() as ParentReportsResponse;
      expect(allReports.data.reports.every((report) => report.type === "parent-summary")).toBeTruthy();
      expect(allReports.data.reports.some((report) => report.studentId === childId)).toBeTruthy();

      const demoReportsResponse = await page.request.get(`/api/parent/reports?studentId=${encodeURIComponent(childId)}`);
      const demoReports = await demoReportsResponse.json() as ParentReportsResponse;
      expect(demoReports.data.selectedChild?.student.id).toBe(childId);
      expect(demoReports.data.reports.every((report) => report.studentId === childId && report.type === "parent-summary")).toBeTruthy();

      const linkedReportsResponse = await page.request.get(`/api/parent/reports?studentId=${encodeURIComponent(unlinkedStudent.userId)}`);
      const linkedReports = await linkedReportsResponse.json() as ParentReportsResponse;
      expect(linkedReports.data.selectedChild?.student.id).toBe(unlinkedStudent.userId);
      expect(linkedReports.data.reports.every((report) => report.studentId === unlinkedStudent.userId && report.type === "parent-summary")).toBeTruthy();

      await page.goto(`/parent/reports?studentId=${encodeURIComponent(childId)}`);
      await expect(page.getByRole("heading", { name: /Teacher-published summaries/i })).toBeVisible();
      await expect(page.getByText(/Generate report|Save report|Preview report|Edit report/i)).toHaveCount(0);

      expectNoPageErrors(pageErrors);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("no-child parent can link a child by invite code and repeated links stay idempotent", async ({ page }, testInfo) => {
    const contexts: APIRequestContext[] = [];
    const pageErrors = collectPageErrors(page);

    try {
      const noChildParentStudent = await registerStudentViaApi(contexts, testInfo, "parent-no-child");
      const noChildParentName = `No Child Parent ${uniqueSuffix(testInfo).slice(0, 24)}`;
      promoteUserToParent(noChildParentStudent.userId, noChildParentName);
      const studentToLink = await registerStudentViaApi(contexts, testInfo, "link-child");
      await createTeacherClassForStudent(contexts, testInfo, studentToLink);
      const inviteCode = parentInviteCodeForStudent(studentToLink.userId);

      await loginAsTeacher(page);
      await page.goto(`/teacher/students/${encodeURIComponent(studentToLink.userId)}`);
      await expect(page.getByRole("heading", { name: /Parent access/i })).toBeVisible();
      await expect(page.getByText(inviteCode)).toBeVisible();
      await expect(page.getByText(/No parent accounts linked yet/i)).toBeVisible();
      await logoutIfVisible(page);

      await loginAs(page, noChildParentStudent.username, noChildParentStudent.password, /\/parent/);
      await expect(page.getByRole("heading", { name: /Connect your first child/i })).toBeVisible();
      await page.goto("/parent/connect");
      await expect(page.getByRole("heading", { name: /Use a parent invite code/i })).toBeVisible();

      await page.getByLabel(/Invite code/i).fill("MAIS-NOPE");
      await page.getByRole("button", { name: /^Connect$/i }).click();
      await expect(page.getByText(/Invite code could not be linked/i)).toBeVisible();

      await page.getByLabel(/Invite code/i).fill(inviteCode);
      await page.getByLabel(/Relationship/i).selectOption("guardian");
      await page.getByRole("button", { name: /^Connect$/i }).click();
      await expect(page).toHaveURL(/\/parent/);
      await expect(page.locator("main").getByRole("heading", { name: studentToLink.name }).first()).toBeVisible();

      const parentSessionResponse = await page.request.get("/api/me");
      const parentSession = await parentSessionResponse.json() as AuthSession;
      const repeatLinkResponse = await page.request.post("/api/parent/children/link", {
        data: { inviteCode, relationship: "mother" }
      });
      expect(repeatLinkResponse.status()).toBe(200);
      expect(guardianLinksFor(parentSession.user.id, studentToLink.userId)).toHaveLength(1);

      const foundation = await parentFoundation(page);
      expect(foundation.data.children.filter((child) => child.student.id === studentToLink.userId)).toHaveLength(1);

      expectNoPageErrors(pageErrors);
    } finally {
      await disposeAll(contexts);
    }
  });

  test("parent-teacher messages stay structured and separate from student private threads", async ({ page }, testInfo) => {
    const contexts: APIRequestContext[] = [];
    const pageErrors = collectPageErrors(page);
    const suffix = uniqueSuffix(testInfo).slice(0, 28);
    const studentOnlySubject = `Student private QA ${suffix}`;
    const parentSubject = `Parent support QA ${suffix}`;
    const parentBody = `Could we get a home practice focus for ${suffix}?`;
    const teacherReply = `Teacher parent reply ${suffix}: review two factorisation examples.`;
    const parentFollowUp = `Parent follow-up ${suffix}: we will try that tonight.`;

    try {
      const { context: studentContext } = await loginApi(contexts, demoStudent.username, demoStudent.password);
      const studentThreadResponse = await studentContext.post("/api/messages", {
        data: {
          subject: studentOnlySubject,
          body: "Student-only thread should stay out of Parent Console.",
          priority: "normal"
        }
      });
      expect(studentThreadResponse.status()).toBe(201);

      await loginAsDemoParent(page);
      const foundation = await parentFoundation(page);
      const child = foundation.data.selectedChild;
      if (!child) throw new Error("Expected a linked demo child.");

      const reportsResponse = await page.request.get(`/api/parent/reports?studentId=${encodeURIComponent(child.student.id)}`);
      const reports = await reportsResponse.json() as ParentReportsResponse;
      const linkedReport = reports.data.reports[0];
      expect(linkedReport?.type).toBe("parent-summary");

      const invalidMessageResponse = await page.request.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          category: "homework",
          subject: "",
          body: parentBody,
          reportId: linkedReport?.id
        }
      });
      expect(invalidMessageResponse.status()).toBe(400);

      const invalidReportResponse = await page.request.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          category: "report-question",
          subject: "Invalid report probe",
          body: parentBody,
          reportId: "not-a-real-parent-report"
        }
      });
      expect(invalidReportResponse.status()).toBe(404);

      const oversizedMessageResponse = await page.request.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          category: "homework",
          subject: "x".repeat(parentMessageSubjectMaxLength + 1),
          body: "x".repeat(parentMessageBodyMaxLength + 1),
          reportId: linkedReport?.id
        }
      });
      expect(oversizedMessageResponse.status()).toBe(413);

      const createMessageResponse = await page.request.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          category: "homework",
          subject: parentSubject,
          body: parentBody,
          reportId: linkedReport?.id
        }
      });
      expect(createMessageResponse.status()).toBe(200);
      const created = await createMessageResponse.json() as { thread: ParentMessageThread };
      expect(created.thread.parentCategory).toBe("homework");
      expect(created.thread.reportId).toBe(linkedReport?.id);
      expect(created.thread.messages[0]?.senderRole).toBe("parent");

      const oversizedReplyResponse = await page.request.post(`/api/parent/messages/${encodeURIComponent(created.thread.id)}/reply`, {
        data: { body: "x".repeat(parentMessageBodyMaxLength + 1) }
      });
      expect(oversizedReplyResponse.status()).toBe(413);

      const parentMessagesResponse = await page.request.get("/api/parent/messages");
      const parentMessages = await parentMessagesResponse.json() as ParentMessagesResponse;
      expect(parentMessages.data.threads.some((thread) => thread.subject.en === parentSubject)).toBeTruthy();
      expect(parentMessages.data.threads.some((thread) => thread.subject.en === studentOnlySubject)).toBeFalsy();

      const studentMessagesAfterParentThread = await studentContext.get("/api/messages");
      const studentMessages = await studentMessagesAfterParentThread.json() as ParentMessagesResponse;
      expect(studentMessages.data.threads.some((thread) => thread.subject.en === parentSubject)).toBeFalsy();
      expect(studentMessages.data.threads.some((thread) => thread.subject.en === studentOnlySubject)).toBeTruthy();
      await logoutIfVisible(page);

      await loginAsTeacher(page);
      await expect(page.getByRole("navigation", { name: /Teacher navigation/i })).toBeVisible();
      await gotoWithDevRetry(page, `/teacher/inbox?thread=${encodeURIComponent(created.thread.id)}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(parentSubject), "i") })).toBeVisible();
      await expect(page.locator("main span").filter({ hasText: /^Parent$/ }).first()).toBeVisible();
      await expect(page.getByText(`${demoParent.username} · ${child.student.name}`).first()).toBeVisible();
      await expect(page.getByText(/Homework/i).first()).toBeVisible();
      await page.getByPlaceholder(/Reply to the parent/i).fill(teacherReply);
      await page.getByRole("button", { name: /Send reply/i }).click();
      await expect(page.getByPlaceholder(/Reply to the parent/i)).toBeEmpty();

      const teacherInboxResponse = await page.request.get(`/api/teacher/inbox?thread=${encodeURIComponent(created.thread.id)}`);
      const teacherInbox = await teacherInboxResponse.json() as TeacherInboxResponse;
      expect(teacherInbox.inbox.selectedThread?.parentContext?.guardianName).toBe(demoParent.username);
      expect(teacherInbox.inbox.selectedThread?.parentContext?.category).toBe("homework");
      expect(teacherInbox.inbox.selectedThread?.messages.some((message) => message.body === teacherReply && message.senderRole === "teacher")).toBeTruthy();
      await logoutIfVisible(page);

      await loginAsDemoParent(page);
      await page.goto(`/parent/messages?thread=${encodeURIComponent(created.thread.id)}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(parentSubject), "i") })).toBeVisible();
      await expect(page.locator("main").getByText(teacherReply).last()).toBeVisible();
      await page.locator("textarea").first().fill(parentFollowUp);
      const parentReplyResponse = page.waitForResponse((response) =>
        response.url().includes(`/api/parent/messages/${created.thread.id}/reply`) &&
        response.request().method() === "POST"
      );
      const parentReloadResponse = page.waitForResponse((response) =>
        response.url().includes("/api/parent/messages?") &&
        response.request().method() === "GET"
      );
      await page.getByRole("button", { name: /Send reply/i }).click();
      expect((await parentReplyResponse).ok()).toBeTruthy();
      expect((await parentReloadResponse).ok()).toBeTruthy();
      await expect(page.locator("main").getByText(parentFollowUp).last()).toBeVisible();
      await logoutIfVisible(page);

      await loginAsTeacher(page);
      await expect(page.getByRole("navigation", { name: /Teacher navigation/i })).toBeVisible();
      await gotoWithDevRetry(page, `/teacher/inbox?thread=${encodeURIComponent(created.thread.id)}`);
      await expect(page.locator("main").getByText(parentFollowUp).last()).toBeVisible();

      expectNoPageErrors(pageErrors);
    } finally {
      await disposeAll(contexts);
    }
  });
});
