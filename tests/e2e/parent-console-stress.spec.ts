import { expect, request as apiRequest, test, type APIRequestContext, type APIResponse, type Page, type TestInfo } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { demoParent, demoStudent, demoTeacher, logoutIfVisible } from "./helpers";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

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

type TestUser = {
  name: string;
  username: string;
  email: string;
  password: string;
  userId: string;
};

type ParentChildSummary = {
  student: { id: string; name: string; role: string; grade: string };
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
    children: ParentChildSummary[];
    selectedChild: ParentChildSummary | null;
    threads: ParentMessageThread[];
    selectedThread: ParentMessageThread | null;
  };
};

type ParentMessageThread = {
  id: string;
  studentId: string;
  guardianId?: string;
  reportId?: string;
  parentCategory?: string;
  subject: { en: string; zh: string };
  messages: Array<{ senderRole: string; body: string }>;
};

type AppStatePayload = {
  guardian_links?: Array<{
    id: string;
    parent_id: string;
    student_id: string;
    status: "pending" | "active" | "revoked";
    updated_at: string;
  }>;
};

type AppStateRow = {
  payload: string;
};

const apiPaths = [
  "/api/parent/foundation",
  "/api/parent/reports",
  "/api/parent/messages"
] as const;

function activeProjectNextListeners() {
  let listeningPids = new Set<string>();
  try {
    const lsofOutput = execFileSync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    listeningPids = new Set(
      lsofOutput
        .split("\n")
        .slice(1)
        .map((line) => line.trim().split(/\s+/)[1])
        .filter(Boolean)
    );
  } catch {
    return [];
  }

  try {
    const psOutput = execFileSync("ps", ["-axo", "pid=,command="], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return psOutput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => {
        const pid = line.split(/\s+/, 1)[0];
        return (
          listeningPids.has(pid) &&
          line.includes(process.cwd()) &&
          /(?:next (?:dev|start)|node .*node_modules\/\.bin\/next)/.test(line)
        );
      });
  } catch {
    return [];
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueSlug(testInfo: TestInfo, label: string) {
  return `${label}-${Date.now()}-${testInfo.workerIndex}-${testInfo.project.name}-${Math.random().toString(36).slice(2, 8)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function newApiContext(app: IsolatedApp, contexts: APIRequestContext[]) {
  const context = await apiRequest.newContext({ baseURL: app.baseURL });
  contexts.push(context);
  return context;
}

async function readJson<T>(response: APIResponse, expectedStatus = 200) {
  expect(response.status()).toBe(expectedStatus);
  return await response.json() as T;
}

async function loginApi(app: IsolatedApp, contexts: APIRequestContext[], username: string, password: string) {
  const context = await newApiContext(app, contexts);
  const response = await context.post("/api/auth/login", {
    data: {
      username,
      password,
      grade: "S3",
      language: "en",
      theme: "dark"
    }
  });
  const session = await readJson<AuthSession>(response);
  return { context, session };
}

async function registerParentViaApi(app: IsolatedApp, contexts: APIRequestContext[], testInfo: TestInfo, label: string) {
  const context = await newApiContext(app, contexts);
  const id = uniqueSlug(testInfo, label);
  const parent = {
    name: `Stress Parent ${id}`,
    username: `${id}@example.test`,
    email: `${id}@example.test`,
    password: "start12345"
  };
  const session = await readJson<AuthSession>(
    await context.post("/api/auth/register", {
      data: {
        role: "parent",
        name: parent.name,
        username: parent.username,
        email: parent.email,
        password: parent.password,
        language: "en",
        theme: "dark"
      }
    })
  );
  expect(session.user.role).toBe("parent");
  return { ...parent, userId: session.user.id } satisfies TestUser;
}

async function registerStudentViaApi(app: IsolatedApp, contexts: APIRequestContext[], testInfo: TestInfo, label: string, grade = "S3") {
  const context = await newApiContext(app, contexts);
  const id = uniqueSlug(testInfo, label);
  const student = {
    name: `Stress Student ${id}`,
    username: `${id}@example.test`,
    email: `${id}@example.test`,
    password: "start12345"
  };
  const session = await readJson<AuthSession>(
    await context.post("/api/auth/register", {
      data: {
        name: student.name,
        username: student.username,
        email: student.email,
        password: student.password,
        grade,
        curriculumTrack: "HK",
        language: "en",
        theme: "dark"
      }
    })
  );
  expect(session.user.role).toBe("student");
  return { ...student, userId: session.user.id } satisfies TestUser;
}

async function issueGuardianInvitationForStudent(
  app: IsolatedApp,
  contexts: APIRequestContext[],
  testInfo: TestInfo,
  student: TestUser,
  label: string
) {
  const { context } = await loginApi(app, contexts, demoTeacher.username, demoTeacher.password);
  const classResponse = await context.post("/api/teacher/classes", {
    data: {
      name: `Guardian stress ${uniqueSlug(testInfo, label)}`,
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
  return payload.invitation.token;
}

async function disposeAll(contexts: APIRequestContext[]) {
  await Promise.all(contexts.map((context) => context.dispose()));
}

async function loginViaPage(page: Page, app: IsolatedApp, username: string, password: string, expectedPath: RegExp) {
  await page.goto(app.url("/login"));
  await page.getByLabel(/email or username|email or user name|user name/i).fill(username);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegex(app.baseURL)}.*${expectedPath.source}`));
}

function monitorPage(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const serverErrors: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });

  return {
    pageErrors,
    consoleErrors,
    serverErrors,
    // `allowConsoleErrors` is for console output the test itself provokes on purpose
    // (a deliberate 4xx probe): Chrome logs every failed fetch as a console error, so
    // without an allowlist an intentional negative case reads as a product defect.
    expectClean({ allowConsoleErrors = [] }: { allowConsoleErrors?: RegExp[] } = {}) {
      expect(pageErrors, "Unexpected browser pageerror events").toEqual([]);
      expect(
        consoleErrors.filter((message) => !allowConsoleErrors.some((pattern) => pattern.test(message))),
        "Unexpected browser console.error events"
      ).toEqual([]);
      expect(serverErrors, "Unexpected 5xx network responses").toEqual([]);
    }
  };
}

function mutateAppState(dbPath: string, mutator: (payload: AppStatePayload) => void) {
  const sqlite = new DatabaseSync(dbPath);
  try {
    const row = sqlite.prepare("SELECT payload FROM app_state WHERE id = ?").get("primary") as AppStateRow | undefined;
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

function setGuardianStatus(dbPath: string, parentId: string, studentId: string, status: "pending" | "revoked") {
  mutateAppState(dbPath, (payload) => {
    const link = payload.guardian_links?.find((candidate) => candidate.parent_id === parentId && candidate.student_id === studentId);
    expect(link).toBeTruthy();
    if (!link) return;
    link.status = status;
    link.updated_at = new Date().toISOString();
  });
}

async function parentFoundation(context: APIRequestContext) {
  return readJson<ParentFoundationResponse>(await context.get("/api/parent/foundation"));
}

test.describe("parent console robustness stress suite", () => {
  test.beforeEach(() => {
    expect(activeProjectNextListeners(), "Preflight failed: another MAIS-MVP Next server is already listening.").toEqual([]);
  });

  test("parent pages render cleanly across viewport projects and support navigation stress", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const app = await startIsolatedApp("parent-console-stress-pages", testInfo);
    const contexts: APIRequestContext[] = [];
    const monitor = monitorPage(page);

    try {
      await page.goto(app.url("/parent"));
      await expect(page).toHaveURL(/\/login\?next=%2Fparent$/);

      await loginViaPage(page, app, demoParent.username, demoParent.password, /\/parent/);
      await expect(page.getByRole("navigation", { name: /Parent navigation/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /home-school picture/i })).toBeVisible();

      const foundation = await readJson<ParentFoundationResponse>(await page.request.get(app.url("/api/parent/foundation")));
      const child = foundation.data.selectedChild ?? foundation.data.children[0];
      expect(child, "Demo parent should have at least one linked child for page stress.").toBeTruthy();
      if (!child) return;

      const childPath = `/parent/children/${encodeURIComponent(child.student.id)}`;
      const pageRoutes = [
        { path: "/parent", heading: /home-school picture/i },
        { path: `/parent/reports?studentId=${encodeURIComponent(child.student.id)}`, heading: /Teacher-published summaries/i },
        { path: `/parent/messages?studentId=${encodeURIComponent(child.student.id)}`, heading: /^Threads$/i },
        { path: "/parent/connect", heading: /Use a parent invite code/i },
        { path: childPath, heading: /Support topics/i }
      ];

      for (const route of pageRoutes) {
        await page.goto(app.url(route.path));
        await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
        await page.keyboard.press("Tab");
        await expect(page.locator(":focus")).toBeVisible();
      }

      await page.goto(app.url(`/parent/reports?studentId=${encodeURIComponent(child.student.id)}`));
      await page.goto(app.url(`/parent/messages?studentId=${encodeURIComponent(child.student.id)}`));
      await page.goBack();
      await expect(page).toHaveURL(/\/parent\/reports/);
      await page.goForward();
      await expect(page).toHaveURL(/\/parent\/messages/);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: /^Threads$/i })).toBeVisible();

      const secondTab = await page.context().newPage();
      const secondMonitor = monitorPage(secondTab);
      await secondTab.goto(app.url(childPath));
      await expect(secondTab.getByRole("heading", { name: /Support topics/i })).toBeVisible();
      secondMonitor.expectClean();
      await secondTab.close();

      await logoutIfVisible(page);
      const noChildParent = await registerParentViaApi(app, contexts, testInfo, "no-child-browser");
      await loginViaPage(page, app, noChildParent.username, noChildParent.password, /\/parent/);
      await expect(page.getByRole("heading", { name: /Connect your first child/i })).toBeVisible();
      await page.goto(app.url("/parent/connect"));
      await page.getByLabel(/Invite code/i).fill("MAIS-NOPE");
      await page.getByRole("button", { name: /^Connect$/i }).click();
      await expect(page.getByText(/Invite code could not be linked/i)).toBeVisible();

      // The MAIS-NOPE probe above is meant to fail, and the browser reports that 404
      // fetch as a console error. Allow exactly that one; everything else stays strict.
      monitor.expectClean({
        allowConsoleErrors: [/Failed to load resource: the server responded with a status of 400 \(Bad Request\)/]
      });
    } finally {
      await disposeAll(contexts);
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });

  test("parent APIs enforce auth, validation, privacy, and idempotent child linking", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Parent API stress runs once on desktop Chrome.");
    test.setTimeout(180_000);
    const admin = {
      email: `${uniqueSlug(testInfo, "admin")}@example.test`,
      password: "start12345",
      name: "Stress Admin"
    };
    const app = await startIsolatedApp("parent-console-stress-api", testInfo, {
      env: {
        MAIS_BOOTSTRAP_ADMIN_EMAIL: admin.email,
        MAIS_BOOTSTRAP_ADMIN_PASSWORD: admin.password,
        MAIS_BOOTSTRAP_ADMIN_NAME: admin.name
      }
    });
    const contexts: APIRequestContext[] = [];

    try {
      const anonymous = await newApiContext(app, contexts);
      const { context: studentContext } = await loginApi(app, contexts, demoStudent.username, demoStudent.password);
      const { context: teacherContext } = await loginApi(app, contexts, demoTeacher.username, demoTeacher.password);
      const { context: parentContext } = await loginApi(app, contexts, demoParent.username, demoParent.password);
      const { context: adminContext } = await loginApi(app, contexts, admin.email, admin.password);

      for (const apiPath of apiPaths) {
        expect((await anonymous.get(apiPath)).status(), `anonymous ${apiPath}`).toBe(403);
        expect((await studentContext.get(apiPath)).status(), `student ${apiPath}`).toBe(403);
        expect((await teacherContext.get(apiPath)).status(), `teacher ${apiPath}`).toBe(403);
        expect((await parentContext.get(apiPath)).status(), `parent ${apiPath}`).toBe(200);
        expect((await adminContext.get(apiPath)).status(), `admin ${apiPath}`).toBe(200);
      }

      const foundation = await parentFoundation(parentContext);
      const child = foundation.data.selectedChild ?? foundation.data.children[0];
      expect(child).toBeTruthy();
      if (!child) return;

      expect((await parentContext.get(`/api/parent/children/${encodeURIComponent(child.student.id)}/summary`)).status()).toBe(200);
      expect((await anonymous.get(`/api/parent/children/${encodeURIComponent(child.student.id)}/summary`)).status()).toBe(403);
      expect((await studentContext.get(`/api/parent/children/${encodeURIComponent(child.student.id)}/summary`)).status()).toBe(403);
      expect((await teacherContext.get(`/api/parent/children/${encodeURIComponent(child.student.id)}/summary`)).status()).toBe(403);
      expect((await parentContext.get("/api/parent/children/not-a-real-student/summary")).status()).toBe(404);

      const otherParent = await registerParentViaApi(app, contexts, testInfo, "other-parent");
      const otherStudent = await registerStudentViaApi(app, contexts, testInfo, "other-child");
      const otherStudentInviteCode = await issueGuardianInvitationForStudent(app, contexts, testInfo, otherStudent, "other-child");
      const { context: otherParentContext } = await loginApi(app, contexts, otherParent.username, otherParent.password);
      expect((await otherParentContext.post("/api/parent/children/link", {
        data: {
          inviteCode: otherStudentInviteCode,
          relationship: "guardian"
        }
      })).status()).toBe(200);
      expect((await parentContext.get(`/api/parent/children/${encodeURIComponent(otherStudent.userId)}/summary`)).status()).toBe(404);
      const crossReports = await readJson<ParentReportsResponse>(
        await parentContext.get(`/api/parent/reports?studentId=${encodeURIComponent(otherStudent.userId)}`)
      );
      expect(crossReports.data.reports.some((report) => report.studentId === otherStudent.userId)).toBeFalsy();

      const privateSubject = `Private student thread ${uniqueSlug(testInfo, "private")}`;
      expect((await studentContext.post("/api/messages", {
        data: {
          subject: privateSubject,
          body: "This student-only message must not enter Parent Console.",
          priority: "normal"
        }
      })).status()).toBe(201);
      const parentMessagesAfterPrivateThread = await readJson<ParentMessagesResponse>(await parentContext.get("/api/parent/messages"));
      expect(parentMessagesAfterPrivateThread.data.threads.some((thread) => thread.subject.en === privateSubject)).toBeFalsy();

      expect((await parentContext.post("/api/parent/messages", {
        headers: { "Content-Type": "application/json" },
        data: "{not valid json"
      })).status()).toBe(400);
      expect((await parentContext.post("/api/parent/messages", { data: [] })).status()).toBe(400);
      expect((await parentContext.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          category: "homework",
          subject: "",
          body: "Missing subject should fail."
        }
      })).status()).toBe(400);
      expect((await parentContext.post("/api/parent/messages", {
        data: {
          studentId: 123,
          category: ["homework"],
          subject: ["bad"],
          body: { bad: true }
        }
      })).status()).toBe(400);

      const invalidCategorySubject = `Invalid category ${uniqueSlug(testInfo, "category")}`;
      const invalidCategoryResponse = await parentContext.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          category: "teacher-only-action",
          subject: invalidCategorySubject,
          body: "Invalid category should not silently become learning-support."
        }
      });
      expect.soft(invalidCategoryResponse.status(), "Invalid parent message category should be rejected instead of coerced.").toBe(400);

      const invalidReportResponse = await parentContext.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          category: "report-question",
          reportId: "not-a-real-report",
          subject: `Invalid report ${uniqueSlug(testInfo, "report")}`,
          body: "Invalid report id should not be silently ignored."
        }
      });
      expect.soft(invalidReportResponse.status(), "Invalid parent report id should be rejected instead of ignored.").toBe(404);

      expect((await parentContext.post("/api/parent/children/link", {
        headers: { "Content-Type": "application/json" },
        data: "{not valid json"
      })).status()).toBe(400);
      expect((await parentContext.post("/api/parent/children/link", { data: [] })).status()).toBe(400);
      expect((await parentContext.post("/api/parent/children/link", { data: { inviteCode: "", relationship: "guardian" } })).status()).toBe(400);
      expect((await parentContext.post("/api/parent/children/link", { data: { inviteCode: "MAIS-NOPE", relationship: "guardian" } })).status()).toBe(400);

      const linkTarget = await registerStudentViaApi(app, contexts, testInfo, "link-target");
      const linkTargetCode = await issueGuardianInvitationForStudent(app, contexts, testInfo, linkTarget, "link-target");
      expect((await parentContext.get(`/api/parent/children/${encodeURIComponent(linkTarget.userId)}/summary`)).status()).toBe(404);
      expect((await parentContext.post("/api/parent/children/link", {
        data: {
          inviteCode: `  ${linkTargetCode.toLowerCase()}  `,
          relationship: "mother"
        }
      })).status()).toBe(200);
      expect((await parentContext.post("/api/parent/children/link", {
        data: {
          inviteCode: linkTargetCode,
          relationship: "father"
        }
      })).status()).toBe(409);
      const foundationAfterRepeatedLink = await parentFoundation(parentContext);
      expect(foundationAfterRepeatedLink.data.children.filter((summary) => summary.student.id === linkTarget.userId)).toHaveLength(1);

      const linkLimitResponses = await Promise.all(Array.from({ length: 6 }, () => parentContext.post("/api/parent/children/link", {
        data: { inviteCode: "MAIS-NOPE", relationship: "guardian" }
      })));
      expect(linkLimitResponses.some((response) => response.status() === 429)).toBeTruthy();

      const invalidThreadMessages = await readJson<ParentMessagesResponse>(await parentContext.get("/api/parent/messages?thread=not-a-real-thread"));
      expect.soft(invalidThreadMessages.data.selectedThread, "Invalid parent message thread should not silently select an unrelated thread.").toBeNull();
    } finally {
      await disposeAll(contexts);
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });

  test("pending and revoked guardian links do not grant parent access after restart", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Guardian-link state stress runs once on desktop Chrome.");
    test.setTimeout(180_000);
    const sharedRoot = path.join(process.cwd(), ".tmp", "e2e-parent-stress", uniqueSlug(testInfo, "guardian-states"));
    const dbPath = path.join(sharedRoot, "hk-math-db.sqlite");
    rmSync(sharedRoot, { recursive: true, force: true });
    mkdirSync(sharedRoot, { recursive: true });

    let parent: TestUser;
    let student: TestUser;
    let app: IsolatedApp | null = await startIsolatedApp("parent-console-stress-guardian-active", testInfo, { dbPath });
    let contexts: APIRequestContext[] = [];

    try {
      parent = await registerParentViaApi(app, contexts, testInfo, "status-parent");
      student = await registerStudentViaApi(app, contexts, testInfo, "status-child");
      const inviteCode = await issueGuardianInvitationForStudent(app, contexts, testInfo, student, "status-child");
      const { context: parentContext } = await loginApi(app, contexts, parent.username, parent.password);
      expect((await parentContext.post("/api/parent/children/link", {
        data: {
          inviteCode,
          relationship: "guardian"
        }
      })).status()).toBe(200);
      expect((await parentContext.get(`/api/parent/children/${encodeURIComponent(student.userId)}/summary`)).status()).toBe(200);
    } finally {
      await disposeAll(contexts);
      await app?.attachLogs(testInfo, "guardian-active-isolated-app.log");
      await app?.stop();
      app = null;
      contexts = [];
    }

    for (const status of ["revoked", "pending"] as const) {
      setGuardianStatus(dbPath, parent!.userId, student!.userId, status);
      app = await startIsolatedApp(`parent-console-stress-guardian-${status}`, testInfo, { dbPath });
      try {
        const { context: parentContext } = await loginApi(app, contexts, parent!.username, parent!.password);
        expect((await parentContext.get(`/api/parent/children/${encodeURIComponent(student!.userId)}/summary`)).status()).toBe(404);
        const foundation = await parentFoundation(parentContext);
        expect(foundation.data.children.some((summary) => summary.student.id === student!.userId)).toBeFalsy();
      } finally {
        await disposeAll(contexts);
        await app.attachLogs(testInfo, `guardian-${status}-isolated-app.log`);
        await app.stop();
        app = null;
        contexts = [];
      }
    }
  });

  test("concurrent parent message creation persists across a production restart", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Concurrency and restart stress runs once on desktop Chrome.");
    test.setTimeout(180_000);
    const sharedRoot = path.join(process.cwd(), ".tmp", "e2e-parent-stress", uniqueSlug(testInfo, "restart"));
    const dbPath = path.join(sharedRoot, "hk-math-db.sqlite");
    rmSync(sharedRoot, { recursive: true, force: true });
    mkdirSync(sharedRoot, { recursive: true });

    let app: IsolatedApp | null = await startIsolatedApp("parent-console-stress-concurrent-primary", testInfo, { dbPath });
    let contexts: APIRequestContext[] = [];
    const subjects = Array.from({ length: 8 }, (_, index) => `Concurrent parent message ${index + 1} ${uniqueSlug(testInfo, "message")}`);

    try {
      const { context: parentContext } = await loginApi(app, contexts, demoParent.username, demoParent.password);
      const foundation = await parentFoundation(parentContext);
      const child = foundation.data.selectedChild ?? foundation.data.children[0];
      expect(child).toBeTruthy();
      if (!child) return;

      const responses = await Promise.all(subjects.map((subject) => parentContext.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          category: "learning-support",
          subject,
          body: `Concurrent body for ${subject}`
        }
      })));
      responses.forEach((response) => expect(response.status()).toBe(200));

      const messages = await readJson<ParentMessagesResponse>(await parentContext.get("/api/parent/messages"));
      for (const subject of subjects) {
        expect(messages.data.threads.some((thread) => thread.subject.en === subject)).toBeTruthy();
      }
    } finally {
      await disposeAll(contexts);
      await app?.attachLogs(testInfo, "concurrent-primary-isolated-app.log");
      await app?.stop();
      app = null;
      contexts = [];
    }

    app = await startIsolatedApp("parent-console-stress-concurrent-restarted", testInfo, { dbPath });
    try {
      const { context: parentContext } = await loginApi(app, contexts, demoParent.username, demoParent.password);
      const messagesAfterRestart = await readJson<ParentMessagesResponse>(await parentContext.get("/api/parent/messages"));
      for (const subject of subjects) {
        expect(messagesAfterRestart.data.threads.some((thread) => thread.subject.en === subject)).toBeTruthy();
      }
    } finally {
      await disposeAll(contexts);
      await app.attachLogs(testInfo, "concurrent-restarted-isolated-app.log");
      await app.stop();
    }
  });

  test("same SQLite multi-process preflight blocks a second server before stress results are trusted", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Same-DB preflight stress runs once on desktop Chrome.");
    test.setTimeout(180_000);
    const sharedRoot = path.join(process.cwd(), ".tmp", "e2e-parent-stress", uniqueSlug(testInfo, "same-db"));
    const dbPath = path.join(sharedRoot, "hk-math-db.sqlite");
    rmSync(sharedRoot, { recursive: true, force: true });
    mkdirSync(sharedRoot, { recursive: true });

    let primary: IsolatedApp | null = null;
    let second: IsolatedApp | null = null;
    const contexts: APIRequestContext[] = [];

    try {
      primary = await startIsolatedApp("parent-console-stress-same-db-primary", testInfo, { dbPath });
      const { context: parentContext } = await loginApi(primary, contexts, demoParent.username, demoParent.password);
      expect((await parentContext.get("/api/parent/foundation")).status()).toBe(200);

      let blockedError: unknown = null;
      try {
        second = await startIsolatedApp("parent-console-stress-same-db-secondary", testInfo, { dbPath });
      } catch (error) {
        blockedError = error;
      }

      expect(blockedError, "A second Next process using the same SQLite DB should be blocked by preflight.").toBeTruthy();
      expect(String(blockedError)).toMatch(/Preflight failed: SQLite database is already held/);
    } finally {
      await disposeAll(contexts);
      await second?.attachLogs(testInfo, "same-db-secondary-isolated-app.log");
      await second?.stop();
      await primary?.attachLogs(testInfo, "same-db-primary-isolated-app.log");
      await primary?.stop();
    }
  });
});
