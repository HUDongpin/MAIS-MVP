import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { defaultCurriculumProfile } from "@/lib/curriculumProfile";
import { parentMessageBodyMaxLength } from "@/lib/parentConstraints";
import {
  createParentMessagePersistenceStore,
  type ParentMessagePersistenceDatabase
} from "@/lib/server/userStore/parentMessagePersistence";
import type { ParentChildSummary, TeacherReport } from "@/types";

const generatedAt = "2026-06-20T12:00:00.000Z";

function childSummary(studentId: string, name: string): ParentChildSummary {
  return {
    student: {
      id: studentId,
      name,
      username: `${studentId}@example.test`,
      avatarId: "delta",
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: defaultCurriculumProfile,
      role: "student"
    },
    classes: [],
    generatedAt,
    averageMastery: 70,
    learningMinutes7d: 40,
    latestActivityAt: null,
    weeklyActivity: [],
    strengths: [],
    supportTopics: [],
    assignments: [],
    rewardSummary: {
      balance: 0,
      available: 0,
      reserved: 0,
      lifetimeEarned: 0,
      spent: 0,
      pendingRequests: 0,
      approvedRequests: 0
    },
    motivationSummary: null,
    latestParentReport: null,
    celebrate: [],
    support: []
  };
}

function teacherReport(id: string, studentId: string): TeacherReport {
  return {
    id,
    type: "parent-summary",
    title: { en: `${studentId} report`, zh: `${studentId} 報告` },
    studentId,
    generatedBy: "teacher-1",
    generatedAt: generatedAt,
    summary: { en: "Report summary", zh: "報告摘要" }
  };
}

function createDatabase(): ParentMessagePersistenceDatabase {
  return {
    class_enrollments: [
      { class_id: "class-a", student_id: "student-1" },
      { class_id: "class-c", student_id: "student-1" },
      { class_id: "class-a", student_id: "student-2" },
      { class_id: "class-b", student_id: "student-3" }
    ],
    guardian_links: [
      { parent_id: "parent-1", student_id: "student-1", status: "active" },
      { parent_id: "parent-1", student_id: "student-2", status: "active" },
      { parent_id: "parent-1", student_id: "student-3", status: "revoked" },
      { parent_id: "parent-2", student_id: "student-3", status: "active" }
    ],
    student_profiles: [
      { user_id: "parent-1", name: "Parent One", grade: "S3" },
      { user_id: "parent-2", name: "Parent Two", grade: "S3" },
      { user_id: "student-1", name: "Ada Student", grade: "S3" },
      { user_id: "student-2", name: "Ben Student", grade: "S3" },
      { user_id: "student-3", name: "Cara Student", grade: "S3" },
      { user_id: "teacher-1", name: "Teacher One", grade: "S3" },
      { user_id: "teacher-2", name: "Teacher Two", grade: "S3" }
    ],
    teacher_classes: [
      { id: "class-a", teacher_id: "teacher-1", name: "S3 Algebra", grade: "S3" },
      { id: "class-c", teacher_id: "teacher-2", name: "S3 Statistics", grade: "S3" },
      { id: "class-b", teacher_id: "teacher-2", name: "S3 Geometry", grade: "S3" }
    ],
    teacher_message_entries: [
      {
        id: "entry-newer-teacher",
        thread_id: "thread-newer",
        sender_id: "teacher-1",
        sender_role: "teacher",
        recipient_id: "parent-1",
        body: "Teacher note",
        attachments: [],
        created_at: "2026-06-19T09:30:00.000Z"
      },
      {
        id: "entry-newer-parent",
        thread_id: "thread-newer",
        sender_id: "parent-1",
        sender_role: "parent",
        recipient_id: "teacher-1",
        body: "Parent reply",
        attachments: [],
        created_at: "2026-06-19T10:00:00.000Z"
      },
      {
        id: "entry-older-parent",
        thread_id: "thread-older",
        sender_id: "parent-1",
        sender_role: "parent",
        recipient_id: "teacher-1",
        body: "Older question",
        attachments: [],
        created_at: "2026-06-18T10:00:00.000Z"
      }
    ],
    teacher_messages: [
      {
        id: "thread-older",
        class_id: "class-a",
        student_id: "student-1",
        teacher_id: "teacher-1",
        guardian_id: "parent-1",
        report_id: "report-student-1",
        parent_category: "homework",
        subject_en: "Older subject",
        subject_zh: "Older subject",
        latest_message: "Older question",
        status: "open",
        priority: "normal",
        starred: false,
        last_message_at: "2026-06-18T10:00:00.000Z",
        created_at: "2026-06-18T10:00:00.000Z"
      },
      {
        id: "thread-newer",
        class_id: "class-a",
        student_id: "student-2",
        teacher_id: "teacher-1",
        guardian_id: "parent-1",
        parent_category: "wellbeing",
        subject_en: "Newer subject",
        subject_zh: "Newer subject",
        latest_message: "Parent reply",
        status: "unread",
        priority: "urgent",
        starred: true,
        last_message_at: "2026-06-19T10:00:00.000Z",
        created_at: "2026-06-19T09:00:00.000Z"
      },
      {
        id: "thread-other-parent",
        class_id: "class-b",
        student_id: "student-3",
        teacher_id: "teacher-2",
        guardian_id: "parent-2",
        parent_category: "logistics",
        subject_en: "Other parent",
        subject_zh: "Other parent",
        latest_message: "Hidden",
        status: "open",
        priority: "normal",
        starred: false,
        last_message_at: "2026-06-19T08:00:00.000Z",
        created_at: "2026-06-19T08:00:00.000Z"
      }
    ],
    teacher_reports: [
      {
        id: "report-student-1",
        type: "parent-summary",
        student_id: "student-1",
        class_id: "class-a",
        generated_by: "teacher-1"
      },
      {
        id: "report-student-1-class-c",
        type: "parent-summary",
        student_id: "student-1",
        class_id: "class-c",
        generated_by: "teacher-2"
      },
      {
        id: "report-student-2",
        type: "parent-summary",
        student_id: "student-2",
        class_id: "class-a",
        generated_by: "teacher-1"
      },
      { id: "report-class", type: "class", student_id: "student-1" }
    ],
    users: [
      { id: "parent-1", username: "parent-one", role: "parent" },
      { id: "parent-2", username: "parent-two", role: "parent" },
      { id: "teacher-1", username: "teacher-one", role: "teacher" },
      { id: "teacher-2", username: "teacher-two", role: "teacher" },
      { id: "student-1", username: "student-one", role: "student" },
      { id: "student-2", username: "student-two", role: "student" },
      { id: "student-3", username: "student-three", role: "student" }
    ]
  };
}

function createTestStore(database = createDatabase()) {
  return createParentMessagePersistenceStore({
    createEntryId: () => "message-entry-created",
    createThreadId: () => "message-thread-created",
    now: () => new Date(generatedAt),
    getParentChildSummaries: (_database, user) => {
      if (user.id !== "parent-1") return [];
      return [
        childSummary("student-1", "Ada Student"),
        childSummary("student-2", "Ben Student")
      ];
    },
    getParentReportsForStudent: (_database, studentId) => [teacherReport(`report-for-${studentId}`, studentId)],
    mutateDatabase: async (mutator) => mutator(database),
    readDatabase: async () => database
  });
}

test("parent message persistence returns visible threads without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/parentMessagePersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const data = await createTestStore().getParentMessagesData("parent-1");

  assert.equal(data?.generatedAt, generatedAt);
  assert.equal(data?.selectedChild, null);
  assert.deepEqual(data?.children.map((child) => child.student.id), ["student-1", "student-2"]);
  assert.deepEqual(data?.threads.map((thread) => thread.id), ["thread-newer", "thread-older"]);
  assert.equal(data?.selectedThread, null);
  assert.equal(data?.threads[0].teacherName, "Teacher One");
  assert.deepEqual(data?.threads[0].messages.map((message) => message.id), [
    "entry-newer-teacher",
    "entry-newer-parent"
  ]);
  assert.deepEqual(data?.reports.map((report) => report.id), ["report-for-student-1", "report-for-student-2"]);
  assert.deepEqual(data?.categories.map((category) => category.id), [
    "learning-support",
    "homework",
    "wellbeing",
    "report-question",
    "logistics"
  ]);
});

test("parent message persistence preserves All while selecting a thread and narrows only for an explicit child", async () => {
  const store = createTestStore();

  const selectedChild = await store.getParentMessagesData("parent-1", "student-2");
  assert.equal(selectedChild?.selectedChild?.student.id, "student-2");
  assert.deepEqual(selectedChild?.threads.map((thread) => thread.id), ["thread-newer"]);
  assert.deepEqual(selectedChild?.reports.map((report) => report.id), ["report-for-student-2"]);

  const selectedThread = await store.getParentMessagesData("parent-1", null, "thread-older");
  assert.equal(selectedThread?.selectedChild, null);
  assert.equal(selectedThread?.selectedThread?.id, "thread-older");
  assert.deepEqual(selectedThread?.threads.map((thread) => thread.id), ["thread-newer", "thread-older"]);
});

test("parent message persistence fails closed for explicit invalid or mismatched filters", async () => {
  const store = createTestStore();

  assert.equal(await store.getParentMessagesData("parent-1", "student-missing", null), null);
  assert.equal(await store.getParentMessagesData("parent-1", null, "thread-missing"), null);
  assert.equal(await store.getParentMessagesData("parent-1", "student-2", "thread-older"), null);
  assert.equal(await store.getParentMessagesData("parent-1", "student-3", "thread-other-parent"), null);
});

test("parent message persistence creates threads through fake storage", async () => {
  const database = createDatabase();
  const result = await createTestStore(database).createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-a",
    idempotencyKey: "create-parent-thread-0001",
    category: "report-question",
    subject: "  New report question  ",
    body: "  Please explain this report.  ",
    reportId: "report-student-1"
  });

  assert.equal(result.status, "created");
  assert.equal(result.thread?.id, "message-thread-created");
  assert.equal(result.thread?.subject.en, "New report question");
  assert.equal(result.thread?.latestMessage, "Please explain this report.");
  assert.equal(result.thread?.parentCategory, "report-question");
  assert.equal(database.teacher_messages[0].id, "message-thread-created");
  assert.equal(database.teacher_message_entries.at(-1)?.id, "message-entry-created");
  assert.equal(database.teacher_message_entries.at(-1)?.recipient_id, "teacher-1");
});

test("parent message creation routes by exact class and report ownership instead of first class", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const direct = await store.createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-c",
    idempotencyKey: "create-parent-thread-0002",
    subject: "Statistics question",
    body: "Please help."
  });
  assert.equal(direct.status, "created");
  assert.equal(direct.thread?.classId, "class-c");
  assert.equal(direct.thread?.teacherName, "Teacher Two");
  assert.equal(database.teacher_message_entries.at(-1)?.recipient_id, "teacher-2");

  const report = await store.createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-c",
    idempotencyKey: "create-parent-thread-0003",
    category: "report-question",
    subject: "Report question",
    body: "Which class generated this?",
    reportId: "report-student-1-class-c"
  });
  assert.equal(report.status, "created");
  assert.equal(report.thread?.classId, "class-c");
  assert.equal(report.thread?.teacherName, "Teacher Two");

  assert.equal((await store.createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-a",
    idempotencyKey: "create-parent-thread-0004",
    subject: "Wrong report route",
    body: "Do not reroute this.",
    reportId: "report-student-1-class-c"
  })).status, "not-found");

  assert.equal((await store.createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "",
    idempotencyKey: "create-parent-thread-0005",
    subject: "Missing class",
    body: "Do not pick the first class."
  })).status, "invalid");
});

test("parent report messages target the authorized co-teacher who generated the report", async () => {
  const database = Object.assign(createDatabase(), {
    school_memberships: [
      { user_id: "teacher-2", class_id: "class-a", role: "teacher" as const }
    ]
  });
  database.teacher_reports?.push({
    id: "report-student-1-co-teacher",
    type: "parent-summary",
    student_id: "student-1",
    class_id: "class-a",
    generated_by: "teacher-2"
  });

  const result = await createTestStore(database).createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-a",
    idempotencyKey: "co-teacher-report-create-0001",
    category: "report-question",
    subject: "Question for the report author",
    body: "Please ask the teacher who generated this report.",
    reportId: "report-student-1-co-teacher"
  });

  assert.equal(result.status, "created");
  assert.equal(result.thread?.teacherName, "Teacher Two");
  assert.equal(database.teacher_messages[0]?.teacher_id, "teacher-2");
  assert.equal(database.teacher_message_entries.at(-1)?.recipient_id, "teacher-2");
});

test("parent replies to a report author only while co-teacher class access remains active", async () => {
  const database = Object.assign(createDatabase(), {
    school_memberships: [
      { user_id: "teacher-2", class_id: "class-a", role: "teacher" as const }
    ]
  });
  database.teacher_messages.unshift({
    id: "thread-co-teacher-report",
    class_id: "class-a",
    student_id: "student-1",
    teacher_id: "teacher-2",
    guardian_id: "parent-1",
    report_id: "report-student-1-co-teacher",
    parent_category: "report-question",
    subject_en: "Question for the report author",
    subject_zh: "Question for the report author",
    latest_message: "Original question",
    status: "open",
    priority: "normal",
    starred: false,
    last_message_at: "2026-06-19T11:00:00.000Z",
    created_at: "2026-06-19T11:00:00.000Z"
  });
  const store = createTestStore(database);

  const activeReply = await store.replyToParentMessageThread({
    parentId: "parent-1",
    threadId: "thread-co-teacher-report",
    idempotencyKey: "co-teacher-report-reply-0001",
    body: "A follow-up for the report author."
  });
  assert.equal(activeReply.status, "sent");
  assert.equal(database.teacher_message_entries.at(-1)?.recipient_id, "teacher-2");

  database.school_memberships = [];
  const entryCountAfterActiveReply = database.teacher_message_entries.length;
  const revokedReply = await store.replyToParentMessageThread({
    parentId: "parent-1",
    threadId: "thread-co-teacher-report",
    idempotencyKey: "co-teacher-report-reply-0002",
    body: "This must fail after access is revoked."
  });

  assert.equal(revokedReply.status, "not-found");
  assert.equal(database.teacher_message_entries.length, entryCountAfterActiveReply);
});

test("parent report messages reject admin authors instead of falling back to the class owner", async () => {
  const database = Object.assign(createDatabase(), {
    school_memberships: [
      { user_id: "admin-1", class_id: "class-a", role: "admin" as const }
    ]
  });
  database.users.push({ id: "admin-1", username: "admin-one", role: "admin" });
  database.teacher_reports?.push({
    id: "report-student-1-admin",
    type: "parent-summary",
    student_id: "student-1",
    class_id: "class-a",
    generated_by: "admin-1"
  });
  const originalThreadCount = database.teacher_messages.length;

  const result = await createTestStore(database).createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-a",
    idempotencyKey: "admin-report-create-000001",
    category: "report-question",
    subject: "Do not route to an admin",
    body: "This request must fail closed.",
    reportId: "report-student-1-admin"
  });

  assert.equal(result.status, "not-found");
  assert.equal(database.teacher_messages.length, originalThreadCount);
});

test("disabled report authors cannot receive a new parent thread", async () => {
  const database = Object.assign(createDatabase(), {
    school_memberships: [
      { user_id: "teacher-2", class_id: "class-a", role: "teacher" as const }
    ]
  });
  const reportAuthor = database.users.find((candidate) => candidate.id === "teacher-2");
  assert.ok(reportAuthor);
  Object.assign(reportAuthor, { disabled_at: "2026-06-20T11:00:00.000Z" });
  database.teacher_reports?.push({
    id: "report-student-1-disabled-author",
    type: "parent-summary",
    student_id: "student-1",
    class_id: "class-a",
    generated_by: "teacher-2"
  });
  const originalThreadCount = database.teacher_messages.length;

  const result = await createTestStore(database).createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-a",
    idempotencyKey: "disabled-report-create-0001",
    category: "report-question",
    subject: "Disabled author must not receive this",
    body: "This request must fail closed.",
    reportId: "report-student-1-disabled-author"
  });

  assert.equal(result.status, "not-found");
  assert.equal(database.teacher_messages.length, originalThreadCount);
});

test("parent replies fail closed when the thread teacher becomes disabled", async () => {
  const database = createDatabase();
  const store = createTestStore(database);
  const created = await store.createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-a",
    idempotencyKey: "disable-after-create-0001",
    subject: "Question before teacher deactivation",
    body: "This thread is created while the teacher is active."
  });
  assert.equal(created.status, "created");

  const threadTeacher = database.users.find((candidate) => candidate.id === "teacher-1");
  assert.ok(threadTeacher);
  Object.assign(threadTeacher, { disabled_at: "2026-06-20T11:30:00.000Z" });
  const entryCountBeforeReply = database.teacher_message_entries.length;

  const result = await store.replyToParentMessageThread({
    parentId: "parent-1",
    threadId: created.thread.id,
    idempotencyKey: "disabled-teacher-reply-0001",
    body: "This reply must not be written."
  });

  assert.equal(result.status, "not-found");
  assert.equal(database.teacher_message_entries.length, entryCountBeforeReply);
});

test("parent message creation is idempotent and rejects key reuse with a different request", async () => {
  const database = createDatabase();
  let nextThread = 0;
  let nextEntry = 0;
  const store = createParentMessagePersistenceStore({
    createEntryId: () => `entry-idempotent-${++nextEntry}`,
    createThreadId: () => `thread-idempotent-${++nextThread}`,
    now: () => new Date(generatedAt),
    getParentChildSummaries: (_database, user) => user.id === "parent-1"
      ? [childSummary("student-1", "Ada Student"), childSummary("student-2", "Ben Student")]
      : [],
    getParentReportsForStudent: (_database, studentId) => [teacherReport(`report-for-${studentId}`, studentId)],
    mutateDatabase: async (mutator) => mutator(database),
    readDatabase: async () => database
  });
  const request = {
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-a",
    idempotencyKey: "stable-create-key-000001",
    category: "homework" as const,
    subject: "Homework question",
    body: "Can you clarify question 2?"
  };

  const first = await store.createParentMessageThread(request);
  const replay = await store.createParentMessageThread(request);
  const conflict = await store.createParentMessageThread({ ...request, body: "A different payload." });

  assert.equal(first.status, "created");
  assert.equal(replay.status, "replayed");
  assert.equal(replay.thread?.id, first.thread?.id);
  assert.equal(conflict.status, "conflict");
  assert.equal(database.teacher_messages.filter((thread) => thread.id.startsWith("thread-idempotent-")).length, 1);
  assert.equal(database.teacher_message_entries.filter((entry) => entry.id.startsWith("entry-idempotent-")).length, 1);
  assert.doesNotMatch(JSON.stringify(database), /stable-create-key-000001/);
});

test("parent message persistence rejects unavailable thread creation", async () => {
  const store = createTestStore();

  assert.equal((await store.createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-a",
    idempotencyKey: "create-parent-thread-0010",
    subject: " ",
    body: "Body"
  })).status, "invalid");
  assert.equal((await store.createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-1",
    classId: "class-a",
    idempotencyKey: "create-parent-thread-0011",
    subject: "Subject",
    body: "x".repeat(parentMessageBodyMaxLength + 1)
  })).status, "too-long");
  assert.equal((await store.createParentMessageThread({
    parentId: "parent-2",
    studentId: "student-1",
    classId: "class-a",
    idempotencyKey: "create-parent-thread-0012",
    subject: "Subject",
    body: "Body"
  })).status, "forbidden");
  assert.equal((await store.createParentMessageThread({
    parentId: "parent-1",
    studentId: "student-2",
    classId: "class-a",
    idempotencyKey: "create-parent-thread-0013",
    subject: "Subject",
    body: "Body",
    reportId: "report-student-1"
  })).status, "not-found");
});

test("parent message persistence replies to allowed threads", async () => {
  const database = createDatabase();
  const result = await createTestStore(database).replyToParentMessageThread({
    parentId: "parent-1",
    threadId: "thread-older",
    idempotencyKey: "reply-parent-thread-0001",
    body: "  Follow-up from home.  "
  });

  const thread = database.teacher_messages.find((candidate) => candidate.id === "thread-older");
  assert.equal(result.status, "sent");
  assert.equal(result.thread?.latestMessage, "Follow-up from home.");
  assert.equal(thread?.latest_message, "Follow-up from home.");
  assert.equal(thread?.last_message_at, generatedAt);
  assert.equal(database.teacher_message_entries.at(-1)?.sender_role, "parent");
  assert.equal(database.teacher_message_entries.at(-1)?.body, "Follow-up from home.");
});

test("parent message replies revalidate current teacher-class access and are idempotent", async () => {
  const database = createDatabase();
  let nextEntry = 0;
  const store = createParentMessagePersistenceStore({
    createEntryId: () => `reply-idempotent-${++nextEntry}`,
    createThreadId: () => "unused",
    now: () => new Date(generatedAt),
    getParentChildSummaries: (_database, user) => user.id === "parent-1"
      ? [childSummary("student-1", "Ada Student"), childSummary("student-2", "Ben Student")]
      : [],
    getParentReportsForStudent: () => [],
    mutateDatabase: async (mutator) => mutator(database),
    readDatabase: async () => database
  });
  const request = {
    parentId: "parent-1",
    threadId: "thread-older",
    idempotencyKey: "stable-reply-key-000001",
    body: "A durable reply."
  };

  const first = await store.replyToParentMessageThread(request);
  const replay = await store.replyToParentMessageThread(request);
  const conflict = await store.replyToParentMessageThread({ ...request, body: "Different reply." });
  assert.equal(first.status, "sent");
  assert.equal(replay.status, "replayed");
  assert.equal(replay.entryId, first.entryId);
  assert.equal(conflict.status, "conflict");
  assert.equal(database.teacher_message_entries.filter((entry) => entry.id.startsWith("reply-idempotent-")).length, 1);
  assert.doesNotMatch(JSON.stringify(database), /stable-reply-key-000001/);

  database.class_enrollments = database.class_enrollments.filter((entry) => (
    entry.class_id !== "class-a" || entry.student_id !== "student-1"
  ));
  assert.equal((await store.replyToParentMessageThread({
    ...request,
    idempotencyKey: "stable-reply-key-000002",
    body: "Should fail after class access changed."
  })).status, "not-found");
});

test("parent message data is a minimal allowlist and omits attachment and internal identity fields", async () => {
  const database = createDatabase();
  database.teacher_message_entries[0].attachments = [{
    id: "attachment-secret",
    fileName: "private.png",
    fileType: "image/png",
    url: "s3://private-bucket/object-key"
  }];

  const data = await createTestStore(database).getParentMessagesData("parent-1");
  const serialized = JSON.stringify(data);
  assert.doesNotMatch(serialized, /student-one|parent-one|teacher-one/);
  assert.doesNotMatch(serialized, /attachment-secret|private\.png|private-bucket|object-key/);
  assert.doesNotMatch(serialized, /senderId|recipientId|guardianId|attachments/);
});

test("parent message persistence owns parent message category normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentMessagePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentMessagePersistence");

  assert.equal(typeof helpers.isValidParentMessageCategory, "function");
  assert.equal(typeof helpers.normalizeParentMessageCategory, "function");
  assert.match(persistenceSource, /export function isValidParentMessageCategory\b/);
  assert.match(persistenceSource, /export function normalizeParentMessageCategory\b/);
  assert.doesNotMatch(rootSource, /const validParentMessageCategories\b/);
  assert.doesNotMatch(rootSource, /function parentMessageCategory\b/);
  assert.match(rootSource, /isValidParentMessageCategoryFromParentMessage/);
  assert.match(rootSource, /normalizeParentMessageCategoryFromParentMessage/);

  assert.equal(helpers.isValidParentMessageCategory("homework"), true);
  assert.equal(helpers.isValidParentMessageCategory("unexpected"), false);
  assert.equal(helpers.normalizeParentMessageCategory("report-question"), "report-question");
  assert.equal(helpers.normalizeParentMessageCategory("unexpected"), "learning-support");
});

test("database normalization preserves only hashed parent idempotency metadata", async () => {
  const { normalizeTeacherOpsInboxCollections } = await import("@/lib/server/userStore/teacherOpsInboxPersistence");
  const database = createDatabase();
  database.teacher_messages[0].parent_idempotency_key_hash = "a".repeat(64);
  database.teacher_messages[0].parent_idempotency_request_hash = "b".repeat(64);
  database.teacher_message_entries[0].parent_idempotency_key_hash = "c".repeat(64);
  database.teacher_message_entries[0].parent_idempotency_request_hash = "d".repeat(64);

  const normalized = normalizeTeacherOpsInboxCollections({
    teacher_messages: database.teacher_messages,
    teacher_message_entries: database.teacher_message_entries
  }, generatedAt, {
    deletedAssignmentIds: new Set(),
    demoTeacherId: "teacher-demo",
    demoUserId: "student-demo",
    isValidParentMessageCategory: (value): value is "learning-support" | "homework" | "wellbeing" | "report-question" | "logistics" => (
      ["learning-support", "homework", "wellbeing", "report-question", "logistics"].includes(String(value))
    ),
    shouldSeedDemoUser: () => false
  });

  assert.equal(normalized.teacher_messages[0].parent_idempotency_key_hash, "a".repeat(64));
  assert.equal(normalized.teacher_messages[0].parent_idempotency_request_hash, "b".repeat(64));
  assert.equal(normalized.teacher_message_entries[0].parent_idempotency_key_hash, "c".repeat(64));
  assert.equal(normalized.teacher_message_entries[0].parent_idempotency_request_hash, "d".repeat(64));
  assert.doesNotMatch(JSON.stringify(normalized), /stable-create-key|stable-reply-key/);
});

test("parent message persistence rejects unavailable replies", async () => {
  const store = createTestStore();

  assert.equal((await store.replyToParentMessageThread({
    parentId: "parent-1",
    threadId: "thread-older",
    idempotencyKey: "reply-parent-thread-0010",
    body: " "
  })).status, "invalid");
  assert.equal((await store.replyToParentMessageThread({
    parentId: "parent-1",
    threadId: "thread-older",
    idempotencyKey: "reply-parent-thread-0011",
    body: "x".repeat(parentMessageBodyMaxLength + 1)
  })).status, "too-long");
  assert.equal((await store.replyToParentMessageThread({
    parentId: "parent-1",
    threadId: "thread-other-parent",
    idempotencyKey: "reply-parent-thread-0012",
    body: "Can I see this?"
  })).status, "not-found");
});

test("legacy userStore delegates parent messages through parent domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const getParentMessagesData = parentUserStore\.getParentMessagesData/);
  assert.match(source, /export const createParentMessageThread = parentUserStore\.createParentMessageThread/);
  assert.match(source, /export const replyToParentMessageThread = parentUserStore\.replyToParentMessageThread/);
  assert.doesNotMatch(source, /export async function getParentMessagesData/);
  assert.doesNotMatch(source, /export async function createParentMessageThread/);
  assert.doesNotMatch(source, /export async function replyToParentMessageThread/);
});
