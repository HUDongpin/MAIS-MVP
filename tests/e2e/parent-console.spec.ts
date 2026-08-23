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
  student: { id: string; name: string; grade: string };
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
  classId?: string;
  studentId?: string;
  title: { en: string; zh: string };
};

type ParentFoundationResponse = {
  data: {
    parent: { id: string; name: string };
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
    selectedChild: ParentChildSummary | null;
    threads: ParentMessageThread[];
    selectedThread: ParentMessageThread | null;
    reports: TeacherReport[];
    composeTargets: Array<{ studentId: string; classId: string; className: string; teacherName: string }>;
  };
};

type ParentMessageThread = {
  id: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
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
  return { classId: classPayload.class.id, teacherContext: context };
}

async function issueGuardianInvitationForStudent(
  contexts: APIRequestContext[],
  testInfo: TestInfo,
  student: TestStudent
) {
  const { classId, teacherContext } = await createTeacherClassForStudent(contexts, testInfo, student);
  const response = await teacherContext.post(
    `/api/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(student.userId)}/guardian-invitations`
  );
  expect(response.status()).toBe(201);
  const payload = await response.json() as {
    invitation: { token: string; version: number; expiresAt: string };
  };
  expect(payload.invitation.token).toMatch(/^MAIS-[A-F0-9]{24}$/);
  return { classId, inviteCode: payload.invitation.token };
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
    test.setTimeout(120_000);
    const pageErrors = collectPageErrors(page);

    await loginAsDemoParent(page);
    // parent-locale-theme-matrix: this existing desktop+mobile test exercises
    // all three UI languages in both themes without increasing the 40-item
    // Playwright project-test enumeration.
    const combinations = [
      {
        language: "en",
        theme: "light",
        htmlLang: "en-HK",
        navigation: "Parent navigation",
        focus: "Today’s focus",
        week: "This week",
        childFocus: "Child focus",
        messages: "Messages",
        details: "View learning details",
        chart: "Weekly learning activity",
        dailyUnit: "minutes",
        separator: ", "
      },
      {
        language: "en",
        theme: "dark",
        htmlLang: "en-HK",
        navigation: "Parent navigation",
        focus: "Today’s focus",
        week: "This week",
        childFocus: "Child focus",
        messages: "Messages",
        details: "View learning details",
        chart: "Weekly learning activity",
        dailyUnit: "minutes",
        separator: ", "
      },
      {
        language: "zh",
        theme: "light",
        htmlLang: "zh-Hant-HK",
        navigation: "家長導覽",
        focus: "今日關注",
        week: "本週概覽",
        childFocus: "孩子焦點",
        messages: "家校私信",
        details: "查看學習詳情",
        chart: "每週學習活動",
        dailyUnit: "分鐘",
        separator: "；"
      },
      {
        language: "zh",
        theme: "dark",
        htmlLang: "zh-Hant-HK",
        navigation: "家長導覽",
        focus: "今日關注",
        week: "本週概覽",
        childFocus: "孩子焦點",
        messages: "家校私信",
        details: "查看學習詳情",
        chart: "每週學習活動",
        dailyUnit: "分鐘",
        separator: "；"
      },
      {
        language: "zh-Hans",
        theme: "light",
        htmlLang: "zh-Hans-CN",
        navigation: "家长导航",
        focus: "今日关注",
        week: "本周概览",
        childFocus: "孩子焦点",
        messages: "家校私信",
        details: "查看学习详情",
        chart: "每周学习活动",
        dailyUnit: "分钟",
        separator: "；"
      },
      {
        language: "zh-Hans",
        theme: "dark",
        htmlLang: "zh-Hans-CN",
        navigation: "家长导航",
        focus: "今日关注",
        week: "本周概览",
        childFocus: "孩子焦点",
        messages: "家校私信",
        details: "查看学习详情",
        chart: "每周学习活动",
        dailyUnit: "分钟",
        separator: "；"
      }
    ] as const;
    expect(combinations).toHaveLength(6);

    try {
      for (const combination of combinations) {
        const settings = await page.request.patch("/api/me/settings", {
          data: { language: combination.language, theme: combination.theme }
        });
        expect(settings.status()).toBe(200);
        await page.goto("/parent");

        const html = page.locator("html");
        await expect(html).toHaveAttribute("lang", combination.htmlLang);
        if (combination.theme === "dark") {
          await expect(html).toHaveClass(/\bdark\b/);
        } else {
          await expect(html).not.toHaveClass(/\bdark\b/);
        }
        await expect(page.getByRole("navigation", { name: combination.navigation })).toBeVisible();
        await expect(page.getByRole("heading", { name: combination.focus })).toBeVisible();
        await expect(page.getByRole("heading", { name: combination.week })).toBeVisible();
        await expect(page.getByLabel(combination.childFocus)).toBeVisible();
        await expect(page.getByRole("link", { name: combination.messages })).toBeVisible();
        await expect(page.getByRole("link", { name: combination.details })).toBeVisible();

        const weeklyChart = page.getByRole("img", { name: new RegExp(`^${escapeRegex(combination.chart)}\\.`) });
        await expect(weeklyChart).toBeVisible();
        const weeklyDescription = await weeklyChart.getAttribute("aria-label");
        expect(weeklyDescription).toContain(combination.dailyUnit);
        expect(weeklyDescription?.split(combination.separator)).toHaveLength(7);
        const horizontalOverflow = await page.evaluate(() => (
          document.documentElement.scrollWidth - document.documentElement.clientWidth
        ));
        expect(horizontalOverflow).toBeLessThanOrEqual(1);
      }
    } finally {
      const restore = await page.request.patch("/api/me/settings", {
        data: { language: "en", theme: "dark" }
      });
      expect(restore.status()).toBe(200);
      await page.goto("/parent");
    }

    const languageSelector = page.getByRole("button", { name: "Language selector" });
    await languageSelector.focus();
    await expect(languageSelector).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu", { name: "Language menu" })).toBeVisible();
    await page.keyboard.press("End");
    await expect(page.getByRole("menuitemradio", { name: "Use Traditional Chinese" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(languageSelector).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu", { name: "Language menu" })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("menu", { name: "Language menu" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeFocused();

    await languageSelector.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu", { name: "Language menu" })).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("menu", { name: "Language menu" })).toBeHidden();
    await expect(languageSelector).toBeFocused();

    const messagesLink = page
      .getByRole("navigation", { name: "Parent navigation" })
      .getByRole("link", { name: "Messages", exact: true });
    await messagesLink.focus();
    await expect(messagesLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/parent\/messages/);
    await expect(page.getByRole("heading", { name: /^Threads$/i })).toBeVisible();

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
    await expect(page.getByRole("heading", { name: /Today’s focus/i })).toBeVisible();

    const childDetailsLink = page.getByRole("link", { name: /View learning details/i });
    await expect(childDetailsLink).toHaveAttribute("href", childPath);
    await childDetailsLink.click();
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
    // A teacher URL must never serve a parent account's workspace (QA BUG-003/004/005):
    // non-teacher sessions get an explicit teacher-login ask, not a silent dashboard swap.
    await expect(page).toHaveURL(
      /\/login\?next=(?:%2Fteacher%2Fdashboard|\/teacher\/dashboard)&reason=teacher-account-required/
    );
    // The parent now lands on /login (no dashboard logout control), so clear the session
    // through the API before switching accounts.
    await page.request.post("/api/auth/logout");

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
      const { inviteCode: unlinkedInviteCode } = await issueGuardianInvitationForStudent(contexts, testInfo, unlinkedStudent);

      await loginAsDemoParent(page);
      const foundation = await parentFoundation(page);
      expect(Object.keys(foundation.data.parent).sort()).toEqual(["id", "name"]);
      expect(foundation.data.parent.id).toEqual(expect.any(String));
      expect(foundation.data.parent.name).toEqual(expect.any(String));
      expect(foundation.data.children.length).toBeGreaterThanOrEqual(1);
      expect(foundation.data.selectedChild).toBeTruthy();
      expect(foundation.data.totals.children).toBe(foundation.data.children.length);
      expect(typeof foundation.data.totals.activeReports).toBe("number");
      expect(typeof foundation.data.totals.openMessages).toBe("number");
      expect(typeof foundation.data.totals.pendingAssignments).toBe("number");

      const child = foundation.data.selectedChild;
      if (!child) throw new Error("Expected a linked demo child.");
      const childId = child.student.id;
      const overview = page.locator("main");
      await expect(overview.getByRole("heading", { name: /Today’s focus/i })).toBeVisible();
      await expect(overview.getByText(child.student.name, { exact: true }).first()).toBeVisible();
      await expect(overview.locator(`a[href="/parent/children/${encodeURIComponent(childId)}"]`)).toHaveCount(1);

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
      await expect(page.getByText(/Messages and AI Tutor|Last AI message|Create assignment|Generate report|Save report|Edit profile/i)).toHaveCount(0);

      expect((await page.request.get(`/api/parent/children/${encodeURIComponent(unlinkedStudent.userId)}/summary`)).status()).toBe(404);
      const linkResponse = await page.request.post("/api/parent/children/link", {
        data: {
          inviteCode: unlinkedInviteCode,
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
      const { classId, inviteCode: firstInviteCode } = await issueGuardianInvitationForStudent(contexts, testInfo, studentToLink);

      await loginAsTeacher(page);
      await page.goto(`/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentToLink.userId)}`);
      await expect(page.getByRole("heading", { name: /Parent access/i })).toBeVisible();
      await expect(page.getByText(firstInviteCode, { exact: true })).toHaveCount(0);
      await expect(page.getByText(/No parent accounts linked yet/i)).toBeVisible();
      await page.getByRole("button", { name: /Issue \/ rotate code/i }).click();
      const inviteCode = (await page.locator("code").filter({ hasText: /^MAIS-[A-F0-9]{24}$/ }).textContent())?.trim() ?? "";
      expect(inviteCode).toMatch(/^MAIS-[A-F0-9]{24}$/);
      expect(inviteCode).not.toBe(firstInviteCode);
      await logoutIfVisible(page);

      await loginAs(page, noChildParentStudent.username, noChildParentStudent.password, /\/parent/);
      await expect(page.getByRole("heading", { name: /Connect your first child/i })).toBeVisible();
      await page.goto("/parent/connect");
      await expect(page.getByRole("heading", { name: /Use a parent invite code/i })).toBeVisible();

      await page.getByLabel(/Invite code/i).fill("MAIS-NOPE");
      await page.getByRole("button", { name: /^Connect$/i }).click();
      // Text alone passes whether or not the failure is announced. A parent who
      // cannot see the red text gets no signal that the link failed, so assert the
      // alert role — the login form's convention for exactly this.
      // Filtered by text because Next.js always renders its own empty route announcer
      // (<div role="alert" id="__next-route-announcer__">), so a bare getByRole("alert")
      // is a strict-mode violation rather than an assertion about this message.
      await expect(
        page.getByRole("alert").filter({ hasText: /Check the invite code and relationship/i })
      ).toBeVisible();

      await page.getByLabel(/Invite code/i).fill(inviteCode);
      await page.getByLabel(/Relationship/i).selectOption("guardian");
      await page.getByRole("button", { name: /^Connect$/i }).click();
      await expect(page).toHaveURL(/\/parent/);
      await expect(page.locator("main").getByRole("heading", { name: studentToLink.name }).first()).toBeVisible();

      const parentSessionResponse = await page.request.get("/api/me");
      const parentSession = await parentSessionResponse.json() as AuthSession;
      const repeatLinkResponse = await page.request.post("/api/parent/children/link", {
        data: { inviteCode, relationship: "guardian" }
      });
      expect(repeatLinkResponse.status()).toBe(200);
      const changedRelationshipReplay = await page.request.post("/api/parent/children/link", {
        data: { inviteCode, relationship: "mother" }
      });
      expect(changedRelationshipReplay.status()).toBe(409);
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
    const createIdempotencyKey = `parent-create-${suffix}`;

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
      expect(linkedReport?.classId).toBeTruthy();
      const classId = linkedReport?.classId ?? "";

      const invalidMessageResponse = await page.request.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          classId,
          idempotencyKey: `invalid-empty-${suffix}`,
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
          classId,
          idempotencyKey: `invalid-report-${suffix}`,
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
          classId,
          idempotencyKey: `oversized-create-${suffix}`,
          category: "homework",
          subject: "x".repeat(parentMessageSubjectMaxLength + 1),
          body: "x".repeat(parentMessageBodyMaxLength + 1),
          reportId: linkedReport?.id
        }
      });
      expect(oversizedMessageResponse.status()).toBe(413);

      const createPayload = {
        studentId: child.student.id,
        classId,
        idempotencyKey: createIdempotencyKey,
        category: "homework",
        subject: parentSubject,
        body: parentBody,
        reportId: linkedReport?.id
      };
      const createMessageResponse = await page.request.post("/api/parent/messages", { data: createPayload });
      expect(createMessageResponse.status()).toBe(201);
      const created = await createMessageResponse.json() as { thread: ParentMessageThread; replayed: boolean };
      expect(created.replayed).toBe(false);
      expect(created.thread.parentCategory).toBe("homework");
      expect(created.thread.reportId).toBe(linkedReport?.id);
      expect(created.thread.classId).toBe(classId);
      expect(created.thread.messages[0]?.senderRole).toBe("parent");

      const replayedCreateResponse = await page.request.post("/api/parent/messages", { data: createPayload });
      expect(replayedCreateResponse.status()).toBe(200);
      const replayedCreate = await replayedCreateResponse.json() as { thread: ParentMessageThread; replayed: boolean };
      expect(replayedCreate.replayed).toBe(true);
      expect(replayedCreate.thread.id).toBe(created.thread.id);
      const conflictingCreateResponse = await page.request.post("/api/parent/messages", {
        data: { ...createPayload, body: `${parentBody} changed` }
      });
      expect(conflictingCreateResponse.status()).toBe(409);

      const oversizedReplyResponse = await page.request.post(`/api/parent/messages/${encodeURIComponent(created.thread.id)}/reply`, {
        data: {
          idempotencyKey: `oversized-reply-${suffix}`,
          body: "x".repeat(parentMessageBodyMaxLength + 1)
        }
      });
      expect(oversizedReplyResponse.status()).toBe(413);

      const directReplyPayload = {
        idempotencyKey: `parent-reply-${suffix}`,
        body: `Parent API idempotency follow-up ${suffix}.`
      };
      const directReplyResponse = await page.request.post(`/api/parent/messages/${encodeURIComponent(created.thread.id)}/reply`, {
        data: directReplyPayload
      });
      expect(directReplyResponse.status()).toBe(201);
      const directReply = await directReplyResponse.json() as { entryId: string; replayed: boolean };
      expect(directReply.replayed).toBe(false);
      const replayedReplyResponse = await page.request.post(`/api/parent/messages/${encodeURIComponent(created.thread.id)}/reply`, {
        data: directReplyPayload
      });
      expect(replayedReplyResponse.status()).toBe(200);
      const replayedReply = await replayedReplyResponse.json() as { entryId: string; replayed: boolean };
      expect(replayedReply.replayed).toBe(true);
      expect(replayedReply.entryId).toBe(directReply.entryId);
      expect((await page.request.post(`/api/parent/messages/${encodeURIComponent(created.thread.id)}/reply`, {
        data: { ...directReplyPayload, body: `${directReplyPayload.body} changed` }
      })).status()).toBe(409);

      const parentMessagesResponse = await page.request.get("/api/parent/messages");
      const parentMessages = await parentMessagesResponse.json() as ParentMessagesResponse;
      expect(parentMessages.data.selectedChild, "All messages must remain unfiltered without an explicit studentId").toBeNull();
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
      const sentParentReply = await parentReplyResponse;
      expect(sentParentReply.status()).toBe(201);
      const parentReplyRequest = sentParentReply.request().postDataJSON() as { idempotencyKey?: unknown };
      expect(parentReplyRequest.idempotencyKey).toMatch(/^[A-Za-z0-9._:~-]{16,128}$/);
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
