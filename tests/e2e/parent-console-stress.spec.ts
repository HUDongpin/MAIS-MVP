import { expect, request as apiRequest, test, type APIRequestContext, type APIResponse, type Locator, type Page, type TestInfo } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import {
  demoParent,
  demoParentUserId,
  demoStudent,
  demoTeacher,
  logoutIfVisible
} from "./helpers";
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
  student: { id: string; name: string; grade: string };
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
    composeTargets: Array<{ studentId: string; classId: string; className: string; teacherName: string }>;
  };
};

type ParentMessageThread = {
  id: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  reportId?: string;
  parentCategory?: string;
  subject: { en: string; zh: string };
  messages: Array<{ senderRole: string; body: string }>;
};

type AppStatePayload = {
  student_profiles?: Array<{ user_id: string; name: string }>;
  teacher_classes?: Array<{ id: string; teacher_id: string; name: string }>;
  assignments?: Array<{
    id: string;
    class_id: string;
    title_en: string;
    title_zh: string;
    title_zh_hans?: string;
    description_en: string;
    description_zh: string;
    description_zh_hans?: string;
    content_type: "lesson";
    target_id: string;
    status: "active";
    due_at: string | null;
    allow_retake: boolean;
    show_answers: boolean;
    count_towards_grade: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
  }>;
  submissions?: Array<{
    id: string;
    assignment_id: string;
    student_id: string;
    status: "not-started";
    score: null;
    submitted_at: null;
    graded_at: null;
    feedback_en: string;
    feedback_zh: string;
    updated_at: string;
  }>;
  teacher_reports?: Array<{
    id: string;
    type: "parent-summary";
    title_en: string;
    title_zh: string;
    class_id: string;
    student_id: string;
    generated_by: string;
    generated_at: string;
    summary_en: string;
    summary_zh: string;
  }>;
  teacher_notices?: Array<{
    id: string;
    teacher_id: string;
    class_id: string;
    audience: "parents";
    channel_id: string;
    channel_name: string;
    subject_en: string;
    subject_zh: string;
    body_en: string;
    body_zh: string;
    status: "sent";
    due_at: string | null;
    created_at: string;
    updated_at: string;
    sent_at: string;
  }>;
  teacher_notice_recipients?: Array<{
    id: string;
    notice_id: string;
    student_id: string;
    guardian_id: string;
    status: "pending";
    acknowledged_at: null;
    created_at: string;
  }>;
  teacher_messages?: Array<{
    id: string;
    class_id: string;
    student_id: string;
    teacher_id: string;
    guardian_id: string;
    parent_category: "learning-support";
    subject_en: string;
    subject_zh: string;
    latest_message: string;
    status: "open";
    priority: "normal";
    starred: boolean;
    last_message_at: string;
    created_at: string;
  }>;
  teacher_message_entries?: Array<{
    id: string;
    thread_id: string;
    sender_id: string;
    sender_role: "parent";
    recipient_id: string;
    body: string;
    attachments: [];
    created_at: string;
  }>;
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
  "/api/parent/messages",
  "/api/parent/notices"
] as const;

const parentOverflowWidths = [320, 375, 768, 1024, 1440] as const;
const horizontalOverflowTolerance = 1;
const overflowFixtures = {
  longUnbrokenMessage: "long-unbroken-message-".padEnd(2000, "U"),
  longUrlMessage: `long-url-message-https://example.test/parent/${"very-long-url-segment/".repeat(16)}?context=${"q".repeat(96)}`,
  longEnglishTitle: `long-english-title-${"FamilyLearningProgressWithoutBreaks".repeat(8)}`,
  longTraditionalTitle: `long-traditional-title-${"繁體中文家校學習進度通知".repeat(18)}`,
  longSimplifiedTitle: `long-simplified-title-${"简体中文家校学习进度通知".repeat(18)}`,
  longChildName: `long-child-name-${"StudentWithoutBreaks".repeat(10)}`,
  longClassName: `long-class-name-${"ClassWithoutBreaks".repeat(12)}`,
  longTeacherName: `long-teacher-name-${"TeacherWithoutBreaks".repeat(11)}`
} as const;

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

function expectedParentHeaders(parentUserId: string) {
  return { "X-MAIS-Expected-User-Id": parentUserId };
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
  if (session.user.role !== "parent") return { context, session };

  const parentContext = await apiRequest.newContext({
    baseURL: app.baseURL,
    storageState: await context.storageState(),
    extraHTTPHeaders: expectedParentHeaders(session.user.id)
  });
  contexts.push(parentContext);
  return { context: parentContext, session };
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

async function registerStudentViaApi(
  app: IsolatedApp,
  contexts: APIRequestContext[],
  testInfo: TestInfo,
  label: string,
  grade = "S3",
  requestedName?: string
) {
  const context = await newApiContext(app, contexts);
  const id = uniqueSlug(testInfo, label);
  const student = {
    name: requestedName ?? `Stress Student ${id}`,
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
        curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
        language: "en",
        theme: "dark"
      }
    })
  );
  expect(session.user.role).toBe("student");
  if (requestedName) expect(session.user.name).toBe(requestedName);
  return { ...student, userId: session.user.id } satisfies TestUser;
}

async function registerTeacherViaApi(
  app: IsolatedApp,
  contexts: APIRequestContext[],
  testInfo: TestInfo,
  label: string,
  requestedName: string
) {
  const context = await newApiContext(app, contexts);
  const id = uniqueSlug(testInfo, label);
  const teacher = {
    name: requestedName,
    username: `${id}@example.test`,
    email: `${id}@example.test`,
    password: "start12345"
  };
  const session = await readJson<AuthSession>(
    await context.post("/api/auth/register", {
      data: {
        role: "teacher",
        name: teacher.name,
        username: teacher.username,
        email: teacher.email,
        password: teacher.password,
        grade: "S3",
        curriculumTrack: "HK",
        curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
        language: "en",
        theme: "dark"
      }
    })
  );
  expect(session.user.role).toBe("teacher");
  expect(session.user.name).toBe(requestedName);
  return { ...teacher, userId: session.user.id } satisfies TestUser;
}

async function issueGuardianInvitationForStudent(
  app: IsolatedApp,
  contexts: APIRequestContext[],
  testInfo: TestInfo,
  student: TestUser,
  label: string
) {
  const { context, session } = await loginApi(app, contexts, demoTeacher.username, demoTeacher.password);
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
    `/api/teacher/classes/${encodeURIComponent(teacherClass.class.id)}/students/${encodeURIComponent(student.userId)}/guardian-invitations`,
    { headers: { "X-MAIS-Expected-User-Id": session.user.id } }
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

function seedParentOverflowFixtures(
  dbPath: string,
  fixture: {
    fixtureKey: string;
    parentId: string;
    studentId: string;
    teacherId: string;
    classId: string;
  }
) {
  const baseTime = Date.now();
  const at = (offsetMs: number) => new Date(baseTime + offsetMs).toISOString();
  const titles = [
    overflowFixtures.longEnglishTitle,
    overflowFixtures.longTraditionalTitle,
    overflowFixtures.longSimplifiedTitle
  ];
  const threadId = `parent-overflow-message-thread-${fixture.fixtureKey}`;

  mutateAppState(dbPath, (payload) => {
    const childProfile = payload.student_profiles?.find((profile) => profile.user_id === fixture.studentId);
    const teacherProfile = payload.student_profiles?.find((profile) => profile.user_id === fixture.teacherId);
    const teacherClass = payload.teacher_classes?.find((candidate) => candidate.id === fixture.classId);
    expect(childProfile?.name, "Overflow child must retain the API-registered long name.").toBe(overflowFixtures.longChildName);
    expect(teacherProfile?.name, "Overflow teacher must retain the API-registered long name.").toBe(overflowFixtures.longTeacherName);
    expect(teacherClass, "Overflow fixture requires the API-created teacher class.").toMatchObject({
      id: fixture.classId,
      teacher_id: fixture.teacherId,
      name: overflowFixtures.longClassName
    });
    if (!childProfile || !teacherProfile || !teacherClass) return;

    payload.assignments ??= [];
    payload.submissions ??= [];
    payload.teacher_reports ??= [];
    payload.teacher_notices ??= [];
    payload.teacher_notice_recipients ??= [];
    payload.teacher_messages ??= [];
    payload.teacher_message_entries ??= [];

    titles.forEach((title, index) => {
      const assignmentId = `parent-overflow-assignment-${fixture.fixtureKey}-${index + 1}`;
      const createdAt = at(index + 1);
      payload.assignments?.unshift({
        id: assignmentId,
        class_id: teacherClass.id,
        title_en: title,
        title_zh: title,
        title_zh_hans: title,
        description_en: title,
        description_zh: title,
        description_zh_hans: title,
        content_type: "lesson",
        target_id: "quadratic-functions",
        status: "active",
        due_at: at(24 * 60 * 60 * 1000),
        allow_retake: true,
        show_answers: false,
        count_towards_grade: true,
        created_by: fixture.teacherId,
        created_at: createdAt,
        updated_at: createdAt
      });
      payload.submissions?.push({
        id: `parent-overflow-submission-${fixture.fixtureKey}-${index + 1}`,
        assignment_id: assignmentId,
        student_id: fixture.studentId,
        status: "not-started",
        score: null,
        submitted_at: null,
        graded_at: null,
        feedback_en: "",
        feedback_zh: "",
        updated_at: createdAt
      });
      payload.teacher_reports?.unshift({
        id: `parent-overflow-report-${fixture.fixtureKey}-${index + 1}`,
        type: "parent-summary",
        title_en: title,
        title_zh: title,
        class_id: teacherClass.id,
        student_id: fixture.studentId,
        generated_by: fixture.teacherId,
        generated_at: createdAt,
        summary_en: title,
        summary_zh: title
      });

      const noticeId = `parent-overflow-notice-${fixture.fixtureKey}-${index + 1}`;
      payload.teacher_notices?.unshift({
        id: noticeId,
        teacher_id: fixture.teacherId,
        class_id: teacherClass.id,
        audience: "parents",
        channel_id: "school-portal",
        channel_name: "School portal",
        subject_en: title,
        subject_zh: title,
        body_en: title,
        body_zh: title,
        status: "sent",
        due_at: null,
        created_at: createdAt,
        updated_at: createdAt,
        sent_at: createdAt
      });
      payload.teacher_notice_recipients?.push({
        id: `parent-overflow-notice-recipient-${fixture.fixtureKey}-${index + 1}`,
        notice_id: noticeId,
        student_id: fixture.studentId,
        guardian_id: fixture.parentId,
        status: "pending",
        acknowledged_at: null,
        created_at: createdAt
      });
    });

    payload.teacher_messages.unshift({
      id: threadId,
      class_id: teacherClass.id,
      student_id: fixture.studentId,
      teacher_id: fixture.teacherId,
      guardian_id: fixture.parentId,
      parent_category: "learning-support",
      subject_en: overflowFixtures.longEnglishTitle,
      subject_zh: overflowFixtures.longTraditionalTitle,
      latest_message: overflowFixtures.longUrlMessage,
      status: "open",
      priority: "normal",
      starred: false,
      last_message_at: at(20),
      created_at: at(10)
    });
    payload.teacher_message_entries.push(
      {
        id: `parent-overflow-message-entry-unbroken-${fixture.fixtureKey}`,
        thread_id: threadId,
        sender_id: fixture.parentId,
        sender_role: "parent",
        recipient_id: fixture.teacherId,
        body: overflowFixtures.longUnbrokenMessage,
        attachments: [],
        created_at: at(11)
      },
      {
        id: `parent-overflow-message-entry-url-${fixture.fixtureKey}`,
        thread_id: threadId,
        sender_id: fixture.parentId,
        sender_role: "parent",
        recipient_id: fixture.teacherId,
        body: overflowFixtures.longUrlMessage,
        attachments: [],
        created_at: at(12)
      }
    );
  });

  return threadId;
}

async function createParentOverflowFixture(
  app: IsolatedApp,
  contexts: APIRequestContext[],
  testInfo: TestInfo
) {
  const fixtureKey = uniqueSlug(testInfo, "overflow");
  const student = await registerStudentViaApi(
    app,
    contexts,
    testInfo,
    "overflow-child",
    "S3",
    overflowFixtures.longChildName
  );
  const teacher = await registerTeacherViaApi(
    app,
    contexts,
    testInfo,
    "overflow-teacher",
    overflowFixtures.longTeacherName
  );
  const { context: teacherContext, session: teacherSession } = await loginApi(
    app,
    contexts,
    teacher.username,
    teacher.password
  );
  const classPayload = await readJson<{ class: { id: string; name: string } }>(
    await teacherContext.post("/api/teacher/classes", {
      data: {
        name: overflowFixtures.longClassName,
        grade: "S3",
        academicYear: "2026-2027",
        description: "Long-name class for Parent Console overflow coverage."
      }
    }),
    201
  );
  expect(classPayload.class.name).toBe(overflowFixtures.longClassName);

  const enrollmentResponse = await teacherContext.post(
    `/api/teacher/classes/${encodeURIComponent(classPayload.class.id)}/students`,
    { data: { username: student.username } }
  );
  expect(enrollmentResponse.ok(), `Overflow student enrollment failed: ${enrollmentResponse.status()}`).toBeTruthy();

  const invitationResponse = await teacherContext.post(
    `/api/teacher/classes/${encodeURIComponent(classPayload.class.id)}/students/${encodeURIComponent(student.userId)}/guardian-invitations`,
    { headers: { "X-MAIS-Expected-User-Id": teacherSession.user.id } }
  );
  const invitationPayload = await readJson<{ invitation: { token: string } }>(invitationResponse, 201);
  expect(invitationPayload.invitation.token).toMatch(/^MAIS-[A-F0-9]{24}$/);

  const { context: parentContext, session: parentSession } = await loginApi(
    app,
    contexts,
    demoParent.username,
    demoParent.password
  );
  expect((await parentContext.post("/api/parent/children/link", {
    data: {
      inviteCode: invitationPayload.invitation.token,
      relationship: "guardian"
    }
  })).status()).toBe(200);

  const threadId = seedParentOverflowFixtures(app.dbPath, {
    fixtureKey,
    parentId: parentSession.user.id,
    studentId: student.userId,
    teacherId: teacher.userId,
    classId: classPayload.class.id
  });

  // This is deliberately the first application read after direct record seeding.
  // It proves normalization preserves API-created non-demo identities before any
  // viewport assertions can accidentally pass against stale/raw SQLite values.
  const firstRead = await readJson<ParentMessagesResponse>(await parentContext.get(
    `/api/parent/messages?studentId=${encodeURIComponent(student.userId)}&thread=${encodeURIComponent(threadId)}`
  ));
  expect(firstRead.data.selectedChild?.student.name).toBe(overflowFixtures.longChildName);
  expect(firstRead.data.selectedThread).toMatchObject({
    id: threadId,
    studentId: student.userId,
    studentName: overflowFixtures.longChildName,
    classId: classPayload.class.id,
    className: overflowFixtures.longClassName,
    teacherName: overflowFixtures.longTeacherName
  });
  expect(firstRead.data.composeTargets).toEqual(expect.arrayContaining([
    expect.objectContaining({
      studentId: student.userId,
      classId: classPayload.class.id,
      className: overflowFixtures.longClassName,
      teacherId: expect.any(String),
      teacherName: overflowFixtures.longTeacherName
    })
  ]));

  return {
    studentId: student.userId,
    threadId
  };
}

async function expectNoPageHorizontalOverflow(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(
    dimensions.scrollWidth,
    `${label} overflowed horizontally: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px + ${horizontalOverflowTolerance}px`
  ).toBeLessThanOrEqual(dimensions.clientWidth + horizontalOverflowTolerance);
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
    test.setTimeout(240_000);
    const app = await startIsolatedApp("parent-console-stress-pages", testInfo);
    const contexts: APIRequestContext[] = [];
    const monitor = monitorPage(page);

    try {
      await page.goto(app.url("/parent"));
      await expect(page).toHaveURL(/\/login\?next=%2Fparent$/);

      await loginViaPage(page, app, demoParent.username, demoParent.password, /\/parent/);
      await expect(page.getByRole("navigation", { name: /Parent navigation/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Today’s focus/i })).toBeVisible();

      const foundation = await readJson<ParentFoundationResponse>(await page.request.get(app.url("/api/parent/foundation"), {
        headers: expectedParentHeaders(demoParentUserId)
      }));
      const child = foundation.data.selectedChild ?? foundation.data.children[0];
      expect(child, "Demo parent should have at least one linked child for page stress.").toBeTruthy();
      if (!child) return;

      const childPath = `/parent/children/${encodeURIComponent(child.student.id)}`;
      if (testInfo.project.name === "desktop-chrome") {
        expect(overflowFixtures.longUnbrokenMessage).toHaveLength(2000);
        const overflowFixture = await createParentOverflowFixture(app, contexts, testInfo);
        const overflowStudentId = encodeURIComponent(overflowFixture.studentId);
        const overflowThreadId = encodeURIComponent(overflowFixture.threadId);
        const overflowRoutes = [
          {
            label: "overview with long child name and navigation",
            path: `/parent?studentId=${overflowStudentId}`,
            assertContent: async () => {
              await expect(page.getByRole("heading", { name: /Today’s focus/i })).toBeVisible();
              await expect(page.getByText(overflowFixtures.longChildName, { exact: true }).first()).toBeVisible();
            }
          },
          {
            label: "reports with long English, Traditional Chinese, and Simplified Chinese titles",
            path: `/parent/reports?studentId=${overflowStudentId}`,
            assertContent: async () => {
              await expect(page.getByRole("heading", { name: /Teacher-published summaries/i })).toBeVisible();
              for (const title of [
                overflowFixtures.longEnglishTitle,
                overflowFixtures.longTraditionalTitle,
                overflowFixtures.longSimplifiedTitle
              ]) {
                await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
              }
            }
          },
          {
            label: "Messages three-column surface with long message, URL, child, class, and teacher names",
            path: `/parent/messages?studentId=${overflowStudentId}&thread=${overflowThreadId}`,
            assertContent: async () => {
              await expect(page.getByRole("heading", { name: /^Threads$/i })).toBeVisible();
              await expect(page.getByRole("heading", { name: /Ask teacher/i })).toBeVisible();
              await expect(page.getByText(overflowFixtures.longUnbrokenMessage, { exact: true })).toBeVisible();
              await expect(page.getByText(overflowFixtures.longUrlMessage, { exact: true }).last()).toBeVisible();
              const compose = page.locator('form[aria-labelledby="parent-ask-teacher-heading"]');
              const childSelect = compose.locator('[name="studentId"]');
              const classSelect = compose.locator('[name="classId"]');
              await expect(childSelect).toBeVisible();
              await expectRuntimeLabelAssociation(childSelect, "Child");
              await expect(childSelect.locator("option:checked")).toHaveText(overflowFixtures.longChildName);
              await expect(classSelect).toBeVisible();
              await expectRuntimeLabelAssociation(classSelect, "Class and teacher");
              await expect(classSelect.locator("option:checked")).toContainText(overflowFixtures.longClassName);
              await expect(classSelect.locator("option:checked")).toContainText(overflowFixtures.longTeacherName);
            }
          },
          {
            label: "notices with long English, Traditional Chinese, and Simplified Chinese titles",
            path: `/parent/notices?studentId=${overflowStudentId}`,
            assertContent: async () => {
              for (const title of [
                overflowFixtures.longEnglishTitle,
                overflowFixtures.longTraditionalTitle,
                overflowFixtures.longSimplifiedTitle
              ]) {
                await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
              }
            }
          },
          {
            label: "child detail with long assignment titles",
            path: `/parent/children/${overflowStudentId}`,
            assertContent: async () => {
              await expect(page.getByRole("heading", { name: /Recent assignments/i })).toBeVisible();
              for (const title of [
                overflowFixtures.longEnglishTitle,
                overflowFixtures.longTraditionalTitle,
                overflowFixtures.longSimplifiedTitle
              ]) {
                await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
              }
            }
          }
        ];

        for (const width of parentOverflowWidths) {
          await page.setViewportSize({ width, height: 960 });
          for (const route of overflowRoutes) {
            await page.goto(app.url(route.path));
            await expect(page.getByRole("navigation", { name: /Parent navigation/i })).toBeVisible();
            await route.assertContent();
            if (width === 1440 && route.label.startsWith("Messages three-column")) {
              const columnCount = await page.locator('[data-parent-messages-layout="three-panel"]').evaluate((element) => (
                getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length
              ));
              expect(columnCount, "Messages must render as three columns at 1440px.").toBe(3);
            }
            await expectNoPageHorizontalOverflow(page, `${route.label} at ${width}px`);
          }
        }
      }

      const pageRoutes = [
        { path: "/parent", heading: /Today’s focus/i },
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
      await expect(page.getByRole("alert").filter({ hasText: /Check the invite code and relationship/i })).toBeVisible();

      // The MAIS-NOPE probe above is meant to fail, and the browser reports that 400
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
        expect((await adminContext.get(apiPath)).status(), `admin ${apiPath}`).toBe(403);
      }

      const foundation = await parentFoundation(parentContext);
      const child = foundation.data.selectedChild ?? foundation.data.children[0];
      expect(child).toBeTruthy();
      if (!child) return;

      expect((await parentContext.get(`/api/parent/children/${encodeURIComponent(child.student.id)}/summary`)).status()).toBe(200);
      expect((await anonymous.get(`/api/parent/children/${encodeURIComponent(child.student.id)}/summary`)).status()).toBe(403);
      expect((await studentContext.get(`/api/parent/children/${encodeURIComponent(child.student.id)}/summary`)).status()).toBe(403);
      expect((await teacherContext.get(`/api/parent/children/${encodeURIComponent(child.student.id)}/summary`)).status()).toBe(403);
      expect((await adminContext.get(`/api/parent/children/${encodeURIComponent(child.student.id)}/summary`)).status()).toBe(403);
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
      const crossReports = await parentContext.get(
        `/api/parent/reports?studentId=${encodeURIComponent(otherStudent.userId)}`
      );
      expect(crossReports.status()).toBe(404);

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
      expect(parentMessagesAfterPrivateThread.data.selectedChild, "All must stay unfiltered without studentId").toBeNull();
      const composeTarget = parentMessagesAfterPrivateThread.data.composeTargets.find(
        (target) => target.studentId === child.student.id
      );
      expect(composeTarget, "Expected an authorized class-specific parent message target.").toBeTruthy();
      const classId = composeTarget?.classId ?? "";

      expect((await parentContext.post("/api/parent/messages", {
        headers: { "Content-Type": "application/json" },
        data: "{not valid json"
      })).status()).toBe(400);
      expect((await parentContext.post("/api/parent/messages", { data: [] })).status()).toBe(400);
      expect((await parentContext.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          classId,
          idempotencyKey: `missing-subject-${uniqueSlug(testInfo, "message")}`,
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
          classId,
          idempotencyKey: `invalid-category-${uniqueSlug(testInfo, "message")}`,
          category: "teacher-only-action",
          subject: invalidCategorySubject,
          body: "Invalid category should not silently become learning-support."
        }
      });
      expect.soft(invalidCategoryResponse.status(), "Invalid parent message category should be rejected instead of coerced.").toBe(400);

      const invalidReportResponse = await parentContext.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          classId,
          idempotencyKey: `invalid-report-${uniqueSlug(testInfo, "message")}`,
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

      const authorizedTargets = await readJson<ParentMessagesResponse>(await parentContext.get("/api/parent/messages"));
      const firstChildTarget = authorizedTargets.data.composeTargets.find(
        (target) => target.studentId === child.student.id
      );
      const secondChildTarget = authorizedTargets.data.composeTargets.find(
        (target) => target.studentId === linkTarget.userId
      );
      expect(firstChildTarget, "Expected a compose target for the first linked child.").toBeTruthy();
      expect(secondChildTarget, "Expected a compose target for the second linked child.").toBeTruthy();

      const firstChildSubject = `First linked child ${uniqueSlug(testInfo, "all-filter-first")}`;
      const secondChildSubject = `Second linked child ${uniqueSlug(testInfo, "all-filter-second")}`;
      expect((await parentContext.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          classId: firstChildTarget?.classId ?? "",
          idempotencyKey: `all-filter-first-${uniqueSlug(testInfo, "message")}`,
          category: "learning-support",
          subject: firstChildSubject,
          body: "Authorized thread for the first linked child."
        }
      })).status()).toBe(201);
      expect((await parentContext.post("/api/parent/messages", {
        data: {
          studentId: linkTarget.userId,
          classId: secondChildTarget?.classId ?? "",
          idempotencyKey: `all-filter-second-${uniqueSlug(testInfo, "message")}`,
          category: "learning-support",
          subject: secondChildSubject,
          body: "Authorized thread for the second linked child."
        }
      })).status()).toBe(201);

      const unfilteredMessages = await readJson<ParentMessagesResponse>(await parentContext.get("/api/parent/messages"));
      expect(unfilteredMessages.data.selectedChild, "Unscoped All must not silently select one child.").toBeNull();
      expect(unfilteredMessages.data.threads.some((thread) => (
        thread.studentId === child.student.id && thread.subject.en === firstChildSubject
      ))).toBeTruthy();
      expect(unfilteredMessages.data.threads.some((thread) => (
        thread.studentId === linkTarget.userId && thread.subject.en === secondChildSubject
      ))).toBeTruthy();

      const firstChildMessages = await readJson<ParentMessagesResponse>(await parentContext.get(
        `/api/parent/messages?studentId=${encodeURIComponent(child.student.id)}`
      ));
      expect(firstChildMessages.data.selectedChild?.student.id).toBe(child.student.id);
      expect(new Set(firstChildMessages.data.threads.map((thread) => thread.studentId))).toEqual(new Set([child.student.id]));
      expect(firstChildMessages.data.threads.some((thread) => thread.subject.en === firstChildSubject)).toBeTruthy();
      expect(firstChildMessages.data.threads.some((thread) => thread.subject.en === secondChildSubject)).toBeFalsy();

      const secondChildMessages = await readJson<ParentMessagesResponse>(await parentContext.get(
        `/api/parent/messages?studentId=${encodeURIComponent(linkTarget.userId)}`
      ));
      expect(secondChildMessages.data.selectedChild?.student.id).toBe(linkTarget.userId);
      expect(new Set(secondChildMessages.data.threads.map((thread) => thread.studentId))).toEqual(new Set([linkTarget.userId]));
      expect(secondChildMessages.data.threads.some((thread) => thread.subject.en === secondChildSubject)).toBeTruthy();
      expect(secondChildMessages.data.threads.some((thread) => thread.subject.en === firstChildSubject)).toBeFalsy();

      const linkLimitResponses = await Promise.all(Array.from({ length: 6 }, () => parentContext.post("/api/parent/children/link", {
        data: { inviteCode: "MAIS-NOPE", relationship: "guardian" }
      })));
      expect(linkLimitResponses.some((response) => response.status() === 429)).toBeTruthy();

      const invalidThreadMessages = await parentContext.get("/api/parent/messages?thread=not-a-real-thread");
      expect.soft(invalidThreadMessages.status(), "Invalid parent message thread must fail closed.").toBe(404);
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
      const messageData = await readJson<ParentMessagesResponse>(await parentContext.get("/api/parent/messages"));
      const composeTarget = messageData.data.composeTargets.find((target) => target.studentId === child.student.id);
      expect(composeTarget).toBeTruthy();
      const classId = composeTarget?.classId ?? "";

      const responses = await Promise.all(subjects.map((subject, index) => parentContext.post("/api/parent/messages", {
        data: {
          studentId: child.student.id,
          classId,
          idempotencyKey: `concurrent-parent-message-${index + 1}-${uniqueSlug(testInfo, "create")}`,
          category: "learning-support",
          subject,
          body: `Concurrent body for ${subject}`
        }
      })));
      responses.forEach((response) => expect(response.status()).toBe(201));

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
