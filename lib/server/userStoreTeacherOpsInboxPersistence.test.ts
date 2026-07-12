import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsInboxPersistenceStore,
  teacherOpsInboxMessagesFor,
  toTeacherOpsMessageEntry,
  type TeacherOpsInboxPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsInboxPersistence";
import type { CurriculumProfile, ParentMessageCategory, TeacherInboxThread, TeacherMessage } from "@/types";

const fixedNow = "2026-06-21T09:00:00.000Z";

type TeacherOpsInboxSeedBoundaryModule = {
  normalizeTeacherOpsInboxCollections?: (
    collections: {
      teacher_messages?: Array<Record<string, unknown> & {
        id: string;
        student_id: string;
        teacher_id: string;
        subject_en: string;
        subject_zh: string;
        latest_message: string;
        status: "unread" | "open" | "resolved";
        priority: "normal" | "urgent";
        last_message_at: string;
        created_at: string;
      }>;
      teacher_message_entries?: TeacherOpsInboxPersistenceDatabase["teacher_message_entries"];
    },
    now: string,
    options: {
      deletedAssignmentIds: ReadonlySet<string>;
      demoTeacherId: string;
      demoUserId: string;
      isValidParentMessageCategory: (value: unknown) => value is ParentMessageCategory;
      shouldSeedDemoUser: () => boolean;
    }
  ) => {
    teacher_messages: Array<Record<string, unknown>>;
    teacher_message_entries: Array<Record<string, unknown>>;
  };
  teacherOpsSeedTeacherMessageRecords?: (
    now: string,
    options: {
      shouldSeedDemoUser: () => boolean;
      demoUserId: string;
      demoTeacherId: string;
    }
  ) => TeacherOpsInboxPersistenceDatabase["teacher_messages"];
  teacherOpsSeedTeacherMessageEntryRecords?: (
    now: string,
    options: {
      shouldSeedDemoUser: () => boolean;
      demoUserId: string;
      demoTeacherId: string;
    }
  ) => TeacherOpsInboxPersistenceDatabase["teacher_message_entries"];
};

type TeacherOpsInboxCurriculumBoundaryModule = {
  teacherOpsInboxCurriculumProfileForThread?: (
    database: TeacherOpsInboxPersistenceDatabase,
    thread: TeacherOpsInboxPersistenceDatabase["teacher_messages"][number],
    dependencies: {
      curriculumProfileForClass: (
        database: TeacherOpsInboxPersistenceDatabase,
        teacherClass: TeacherOpsInboxPersistenceDatabase["teacher_classes"][number]
      ) => CurriculumProfile;
      curriculumProfileForUser: (
        database: TeacherOpsInboxPersistenceDatabase,
        userId?: string | null
      ) => CurriculumProfile;
    }
  ) => CurriculumProfile;
};

function createDatabase(): TeacherOpsInboxPersistenceDatabase {
  return {
    school_memberships: [
      {
        user_id: "teacher-1",
        class_id: "class-shared",
        role: "teacher"
      }
    ],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1"
      },
      {
        id: "class-shared",
        teacher_id: "teacher-2"
      },
      {
        id: "class-other",
        teacher_id: "teacher-2"
      }
    ],
    teacher_message_entries: [
      {
        id: "entry-owned-2",
        thread_id: "thread-owned",
        sender_id: "teacher-1",
        sender_role: "teacher",
        recipient_id: "student-1",
        body: "Second",
        attachments: [],
        created_at: "2026-06-20T10:10:00.000Z"
      },
      {
        id: "entry-owned-1",
        thread_id: "thread-owned",
        sender_id: "student-1",
        sender_role: "student",
        recipient_id: "teacher-1",
        body: "First",
        attachments: [],
        created_at: "2026-06-20T10:00:00.000Z"
      }
    ],
    teacher_messages: [
      {
        id: "thread-owned",
        class_id: "class-owned",
        student_id: "student-1",
        teacher_id: "teacher-1",
        subject_en: "Owned",
        subject_zh: "Owned",
        latest_message: "Owned latest",
        status: "resolved",
        priority: "normal",
        starred: false,
        last_message_at: "2026-06-20T10:10:00.000Z",
        created_at: "2026-06-20T09:00:00.000Z"
      },
      {
        id: "thread-shared",
        class_id: "class-shared",
        student_id: "student-2",
        teacher_id: "teacher-2",
        guardian_id: "parent-1",
        parent_category: "homework",
        subject_en: "Shared",
        subject_zh: "Shared",
        latest_message: "Shared latest",
        status: "unread",
        priority: "urgent",
        starred: false,
        last_message_at: "2026-06-20T11:00:00.000Z",
        created_at: "2026-06-20T09:30:00.000Z"
      },
      {
        id: "thread-direct",
        student_id: "student-3",
        teacher_id: "teacher-1",
        subject_en: "Direct",
        subject_zh: "Direct",
        latest_message: "Direct latest",
        status: "open",
        priority: "normal",
        starred: true,
        last_message_at: "2026-06-20T09:30:00.000Z",
        created_at: "2026-06-20T09:15:00.000Z"
      },
      {
        id: "thread-other",
        class_id: "class-other",
        student_id: "student-4",
        teacher_id: "teacher-2",
        subject_en: "Other",
        subject_zh: "Other",
        latest_message: "Other latest",
        status: "open",
        priority: "normal",
        starred: false,
        last_message_at: "2026-06-20T12:00:00.000Z",
        created_at: "2026-06-20T09:45:00.000Z"
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" }
    ]
  };
}

function createTestStore(database: TeacherOpsInboxPersistenceDatabase) {
  let idCounter = 0;

  return createTeacherOpsInboxPersistenceStore({
    createId: () => `generated-${++idCounter}`,
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date(fixedNow),
    readDatabase: async () => database,
    toInboxThread: (sourceDatabase, thread) => ({
      id: thread.id,
      classId: thread.class_id,
      studentId: thread.student_id,
      studentName: thread.student_id,
      teacherId: thread.teacher_id,
      guardianId: thread.guardian_id,
      assignmentId: thread.assignment_id,
      topicId: thread.topic_id,
      reportId: thread.report_id,
      parentCategory: thread.parent_category,
      subject: { en: thread.subject_en, zh: thread.subject_zh },
      latestMessage: thread.latest_message,
      status: thread.status,
      priority: thread.priority,
      starred: thread.starred,
      lastMessageAt: thread.last_message_at,
      createdAt: thread.created_at,
      className: thread.class_id,
      studentGrade: "S3",
      messages: sourceDatabase.teacher_message_entries
        .filter((entry) => entry.thread_id === thread.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((entry) => ({
          id: entry.id,
          threadId: entry.thread_id,
          senderId: entry.sender_id,
          senderRole: entry.sender_role,
          senderName: entry.sender_id,
          recipientId: entry.recipient_id,
          body: entry.body,
          attachments: entry.attachments,
          createdAt: entry.created_at
        })),
      parentContext: thread.guardian_id
        ? {
            guardianId: thread.guardian_id,
            guardianName: "Parent",
            category: thread.parent_category ?? "learning-support",
            reportId: thread.report_id
          }
        : undefined,
      studentContext: {
        averageMastery: 0,
        activeMistakes: [],
        currentAssignments: []
      }
    }) satisfies TeacherInboxThread
  });
}

test("teacher ops inbox persistence lists teacher-accessible threads without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsInboxPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const inbox = await createTestStore(createDatabase()).getTeacherInboxData("teacher-1");

  assert.deepEqual(inbox?.threads.map((thread) => thread.id), ["thread-shared", "thread-owned", "thread-direct"]);
  assert.equal(inbox?.selectedThread?.id, "thread-shared");
  assert.deepEqual(inbox?.threads.find((thread) => thread.id === "thread-owned")?.messages.map((entry) => entry.id), [
    "entry-owned-1",
    "entry-owned-2"
  ]);
});

test("teacher ops inbox persistence keeps selected-thread and access semantics scoped", async () => {
  const store = createTestStore(createDatabase());

  assert.equal((await store.getTeacherInboxData("teacher-1", "thread-owned"))?.selectedThread?.id, "thread-owned");
  assert.deepEqual((await store.getTeacherInboxData("admin-1"))?.threads.map((thread) => thread.id), [
    "thread-other",
    "thread-shared",
    "thread-owned",
    "thread-direct"
  ]);
  assert.equal(await store.getTeacherInboxData("student-1"), null);
});

test("teacher ops inbox persistence sends teacher replies and updates thread metadata", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.replyToTeacherMessageThread({
    teacherId: "teacher-1",
    threadId: "thread-shared",
    body: "  Please check the worksheet note.  "
  });

  assert.equal(result.status, "sent");
  assert.equal(result.status === "sent" ? result.thread.id : null, "thread-shared");
  assert.equal(database.teacher_messages.find((thread) => thread.id === "thread-shared")?.status, "open");
  assert.equal(database.teacher_messages.find((thread) => thread.id === "thread-shared")?.latest_message, "Please check the worksheet note.");
  assert.deepEqual(database.teacher_message_entries.at(-1), {
    id: "message-entry-generated-1",
    thread_id: "thread-shared",
    sender_id: "teacher-1",
    sender_role: "teacher",
    recipient_id: "parent-1",
    body: "Please check the worksheet note.",
    attachments: [],
    created_at: fixedNow
  });

  assert.deepEqual(await store.replyToTeacherMessageThread({
    teacherId: "teacher-1",
    threadId: "thread-shared",
    body: ""
  }), { status: "invalid" });
  assert.deepEqual(await store.replyToTeacherMessageThread({
    teacherId: "student-1",
    threadId: "thread-shared",
    body: "Hello"
  }), { status: "forbidden" });
  assert.deepEqual(await store.replyToTeacherMessageThread({
    teacherId: "teacher-1",
    threadId: "thread-other",
    body: "Hello"
  }), { status: "not-found" });
});

test("teacher ops inbox persistence updates teacher message status and star state", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.updateTeacherMessageThread({
    teacherId: "teacher-1",
    threadId: "thread-shared",
    status: "resolved",
    starred: true
  });

  assert.equal(result.status, "updated");
  assert.equal(database.teacher_messages.find((thread) => thread.id === "thread-shared")?.status, "resolved");
  assert.equal(database.teacher_messages.find((thread) => thread.id === "thread-shared")?.starred, true);

  assert.deepEqual(await store.updateTeacherMessageThread({
    teacherId: "student-1",
    threadId: "thread-shared",
    status: "open"
  }), { status: "forbidden" });
  assert.deepEqual(await store.updateTeacherMessageThread({
    teacherId: "teacher-1",
    threadId: "thread-other",
    status: "open"
  }), { status: "not-found" });
});

test("teacher ops inbox persistence owns seed teacher message records for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsInboxPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsInboxPersistence") as TeacherOpsInboxSeedBoundaryModule;

  assert.equal(typeof module.teacherOpsSeedTeacherMessageRecords, "function");
  assert.match(persistenceSource, /export function teacherOpsSeedTeacherMessageRecords\b/);
  assert.match(rootSource, /teacherOpsSeedTeacherMessageRecords as seedTeacherMessagesFromTeacherOpsInbox/);
  assert.doesNotMatch(rootSource, /function seedTeacherMessages\b/);

  assert.deepEqual(module.teacherOpsSeedTeacherMessageRecords?.("2026-06-20T10:00:00.000Z", {
    shouldSeedDemoUser: () => false,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  }), []);

  assert.deepEqual(module.teacherOpsSeedTeacherMessageRecords?.("2026-06-20T10:00:00.000Z", {
    shouldSeedDemoUser: () => true,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  }), [
    {
      id: "message-thread-quadratic-help",
      class_id: "class-s3a-2026",
      student_id: "student-peter",
      teacher_id: "teacher-ms-chan",
      assignment_id: "assignment-quadratics-checkpoint",
      topic_id: "quadratic-functions",
      subject_en: "Need help with vertex form",
      subject_zh: "想請教頂點式",
      latest_message: "I can expand the brackets, but I am not sure how to read the vertex from the graph.",
      status: "unread",
      priority: "normal",
      starred: false,
      last_message_at: "2026-06-20T10:00:00.000Z",
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ]);
});

test("teacher ops inbox persistence owns seed teacher message entry records for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsInboxPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsInboxPersistence") as TeacherOpsInboxSeedBoundaryModule;

  assert.equal(typeof module.teacherOpsSeedTeacherMessageEntryRecords, "function");
  assert.match(persistenceSource, /export function teacherOpsSeedTeacherMessageEntryRecords\b/);
  assert.match(rootSource, /teacherOpsSeedTeacherMessageEntryRecords as seedTeacherMessageEntriesFromTeacherOpsInbox/);
  assert.doesNotMatch(rootSource, /function seedTeacherMessageEntries\b/);

  assert.deepEqual(module.teacherOpsSeedTeacherMessageEntryRecords?.("2026-06-20T10:00:00.000Z", {
    shouldSeedDemoUser: () => false,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  }), []);

  assert.deepEqual(module.teacherOpsSeedTeacherMessageEntryRecords?.("2026-06-20T10:00:00.000Z", {
    shouldSeedDemoUser: () => true,
    demoUserId: "student-peter",
    demoTeacherId: "teacher-ms-chan"
  }), [
    {
      id: "message-entry-quadratic-help-student",
      thread_id: "message-thread-quadratic-help",
      sender_id: "student-peter",
      sender_role: "student",
      recipient_id: "teacher-ms-chan",
      body: "I can expand the brackets, but I am not sure how to read the vertex from the graph.",
      attachments: [],
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ]);
});

test("teacher ops inbox persistence owns teacher message record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsInboxPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsInboxPersistence") as Record<string, unknown>;
  const normalizeMessage = helpers.normalizeTeacherOpsMessageRecord as ((
    message: {
      id: string;
      starred?: boolean | null;
      assignment_id?: string;
      parent_category?: unknown;
    },
    dependencies: {
      deletedAssignmentIds: ReadonlySet<string>;
      isValidParentMessageCategory: (value: unknown) => boolean;
    }
  ) => Record<string, unknown>) | undefined;

  assert.equal(typeof normalizeMessage, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsMessageRecord\b/);
  assert.doesNotMatch(rootSource, /normalizeTeacherOpsMessageRecord as normalizeTeacherMessageRecordFromTeacherOpsInbox/);
  assert.doesNotMatch(rootSource, /starred: message\.starred \?\? false/);
  assert.doesNotMatch(rootSource, /assignment_id: message\.assignment_id && !deletedAssignmentIds\.has\(message\.assignment_id\)/);
  assert.doesNotMatch(rootSource, /parent_category: isValidParentMessageCategoryFromParentMessage\(message\.parent_category\)/);

  const deletedAssignmentIds = new Set(["assignment-deleted"]);
  const dependencies = {
    deletedAssignmentIds,
    isValidParentMessageCategory: (value: unknown) => value === "homework"
  };

  assert.deepEqual(normalizeMessage?.({
    id: "message-invalid",
    starred: null,
    assignment_id: "assignment-deleted",
    parent_category: "billing"
  }, dependencies), {
    id: "message-invalid",
    starred: false,
    assignment_id: undefined,
    parent_category: undefined
  });

  assert.deepEqual(normalizeMessage?.({
    id: "message-valid",
    starred: true,
    assignment_id: "assignment-keep",
    parent_category: "homework"
  }, dependencies), {
    id: "message-valid",
    starred: true,
    assignment_id: "assignment-keep",
    parent_category: "homework"
  });
});

test("teacher ops inbox persistence owns teacher message collection normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsInboxPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsInboxPersistence") as TeacherOpsInboxSeedBoundaryModule;

  assert.equal(typeof module.normalizeTeacherOpsInboxCollections, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsInboxCollections\b/);
  assert.match(rootSource, /normalizeTeacherOpsInboxCollections as normalizeTeacherInboxCollectionsFromTeacherOpsInbox/);
  assert.doesNotMatch(rootSource, /\n    teacher_messages: mergeSeedRecordsPreservingExisting\(/);
  assert.doesNotMatch(rootSource, /\n    teacher_message_entries: mergeSeedRecordsPreservingExisting\(/);

  const normalized = module.normalizeTeacherOpsInboxCollections?.({
    teacher_messages: [
      {
        id: "message-thread-quadratic-help",
        class_id: "class-s3a-2026",
        student_id: "student-custom",
        teacher_id: "teacher-custom",
        assignment_id: "assignment-deleted",
        parent_category: "billing",
        topic_id: "custom-topic",
        subject_en: "Legacy help",
        subject_zh: "Legacy help",
        latest_message: "Legacy latest",
        status: "open",
        priority: "urgent",
        starred: null,
        last_message_at: "2026-06-19T10:00:00.000Z",
        created_at: "2026-06-19T09:00:00.000Z"
      },
      {
        id: "message-custom",
        student_id: "student-custom",
        teacher_id: "teacher-custom",
        parent_category: "homework",
        subject_en: "Custom",
        subject_zh: "Custom",
        latest_message: "Custom latest",
        status: "unread",
        priority: "normal",
        starred: true,
        last_message_at: "2026-06-19T11:00:00.000Z",
        created_at: "2026-06-19T11:00:00.000Z"
      }
    ],
    teacher_message_entries: [
      {
        id: "message-entry-quadratic-help-student",
        thread_id: "message-thread-quadratic-help",
        sender_id: "student-custom",
        sender_role: "student",
        recipient_id: "teacher-custom",
        body: "Legacy entry",
        attachments: [],
        created_at: "2026-06-19T10:00:00.000Z"
      },
      {
        id: "entry-custom",
        thread_id: "message-custom",
        sender_id: "teacher-custom",
        sender_role: "teacher",
        recipient_id: "student-custom",
        body: "Custom entry",
        attachments: [],
        created_at: "2026-06-19T11:00:00.000Z"
      }
    ]
  }, "2026-06-20T10:00:00.000Z", {
    deletedAssignmentIds: new Set(["assignment-deleted"]),
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    isValidParentMessageCategory: (value): value is ParentMessageCategory => value === "homework",
    shouldSeedDemoUser: () => true
  });

  assert.deepEqual(normalized?.teacher_messages.map((message) => message.id), [
    "message-thread-quadratic-help",
    "message-custom"
  ]);
  assert.equal(normalized?.teacher_messages[0]?.latest_message, "Legacy latest");
  assert.equal(normalized?.teacher_messages[0]?.starred, false);
  assert.equal(normalized?.teacher_messages[0]?.assignment_id, undefined);
  assert.equal(normalized?.teacher_messages[0]?.parent_category, undefined);
  assert.equal(normalized?.teacher_messages[1]?.parent_category, "homework");
  assert.deepEqual(normalized?.teacher_message_entries.map((entry) => entry.id), [
    "message-entry-quadratic-help-student",
    "entry-custom"
  ]);
  assert.equal(normalized?.teacher_message_entries[0]?.body, "Legacy entry");

  assert.deepEqual(module.normalizeTeacherOpsInboxCollections?.({
    teacher_messages: [],
    teacher_message_entries: []
  }, "2026-06-20T10:00:00.000Z", {
    deletedAssignmentIds: new Set(),
    demoTeacherId: "teacher-hk",
    demoUserId: "student-hk",
    isValidParentMessageCategory: (value): value is ParentMessageCategory => value === "homework",
    shouldSeedDemoUser: () => false
  }), {
    teacher_messages: [],
    teacher_message_entries: []
  });
});

test("teacher ops inbox persistence owns curriculum profile routing for message threads", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsInboxPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsInboxPersistence") as TeacherOpsInboxCurriculumBoundaryModule;
  const curriculumProfileForThread = module.teacherOpsInboxCurriculumProfileForThread;
  if (typeof curriculumProfileForThread !== "function") {
    assert.fail("Expected teacherOpsInboxCurriculumProfileForThread to be exported");
  }

  const database = createDatabase();
  const classProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_PEP" };
  const studentProfile: CurriculumProfile = { region: "HK", publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY" };
  const calls: string[] = [];

  assert.deepEqual(
    curriculumProfileForThread(database, database.teacher_messages[0], {
      curriculumProfileForClass: (_database, teacherClass) => {
        calls.push(`class:${teacherClass.id}`);
        return classProfile;
      },
      curriculumProfileForUser: (_database, userId) => {
        calls.push(`user:${userId}`);
        return studentProfile;
      }
    }),
    classProfile
  );

  assert.deepEqual(
    curriculumProfileForThread(database, database.teacher_messages[2], {
      curriculumProfileForClass: (_database, teacherClass) => {
        calls.push(`class:${teacherClass.id}`);
        return classProfile;
      },
      curriculumProfileForUser: (_database, userId) => {
        calls.push(`user:${userId}`);
        return studentProfile;
      }
    }),
    studentProfile
  );

  assert.deepEqual(calls, ["class:class-owned", "user:student-3"]);
  assert.match(persistenceSource, /export function teacherOpsInboxCurriculumProfileForThread\b/);
  assert.match(rootSource, /teacherOpsInboxCurriculumProfileForThread as curriculumProfileForThreadFromTeacherOpsInbox/);
  assert.doesNotMatch(rootSource, /function curriculumProfileForThread\b/);
});

test("teacher ops inbox persistence owns teacher message projection helper for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsInboxPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsInboxPersistence") as Record<string, unknown>;
  const toTeacherMessage = helpers.toTeacherOpsMessage as ((
    database: {
      student_profiles?: Array<{
        user_id: string;
        name?: string;
      }>;
      users: Array<{
        id: string;
        username?: string;
      }>;
    },
    record: {
      id: string;
      class_id?: string;
      student_id: string;
      teacher_id: string;
      guardian_id?: string;
      assignment_id?: string;
      topic_id?: string;
      report_id?: string;
      parent_category?: "homework";
      subject_en: string;
      subject_zh: string;
      latest_message: string;
      status: "unread";
      priority: "urgent";
      starred: boolean;
      last_message_at: string;
      created_at: string;
    }
  ) => TeacherMessage) | undefined;

  assert.equal(typeof toTeacherMessage, "function");
  assert.match(persistenceSource, /export function toTeacherOpsMessage\b/);
  assert.match(rootSource, /toTeacherOpsMessage as toTeacherMessageFromTeacherOpsInbox/);
  assert.doesNotMatch(rootSource, /function toTeacherMessage\(/);

  assert.deepEqual(toTeacherMessage?.({
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada"
      },
      {
        user_id: "parent-1",
        name: "Ada Parent"
      }
    ],
    users: [
      {
        id: "parent-1",
        username: "fallback-parent"
      }
    ]
  }, {
    id: "thread-1",
    class_id: "class-1",
    student_id: "student-1",
    teacher_id: "teacher-1",
    guardian_id: "parent-1",
    assignment_id: "assignment-1",
    topic_id: "topic-1",
    report_id: "report-1",
    parent_category: "homework",
    subject_en: "Homework question",
    subject_zh: "功課問題",
    latest_message: "Please review.",
    status: "unread",
    priority: "urgent",
    starred: true,
    last_message_at: "2026-06-21T08:00:00.000Z",
    created_at: "2026-06-20T08:00:00.000Z"
  }), {
    id: "thread-1",
    classId: "class-1",
    studentId: "student-1",
    studentName: "Ada",
    teacherId: "teacher-1",
    guardianId: "parent-1",
    guardianName: "Ada Parent",
    assignmentId: "assignment-1",
    topicId: "topic-1",
    reportId: "report-1",
    parentCategory: "homework",
    subject: {
      en: "Homework question",
      zh: "功課問題"
    },
    latestMessage: "Please review.",
    status: "unread",
    priority: "urgent",
    starred: true,
    lastMessageAt: "2026-06-21T08:00:00.000Z",
    createdAt: "2026-06-20T08:00:00.000Z"
  });

  assert.equal(toTeacherMessage?.({
    student_profiles: [],
    users: [
      {
        id: "parent-2",
        username: "fallback-parent"
      }
    ]
  }, {
    id: "thread-2",
    student_id: "missing-student",
    teacher_id: "teacher-1",
    guardian_id: "parent-2",
    subject_en: "Fallback",
    subject_zh: "Fallback",
    latest_message: "Fallback",
    status: "unread",
    priority: "urgent",
    starred: false,
    last_message_at: "2026-06-21T08:00:00.000Z",
    created_at: "2026-06-20T08:00:00.000Z"
  }).studentName, "Unknown student");
});

test("teacher ops inbox persistence owns teacher message entry projection helper", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsInboxPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(persistenceSource, /export function toTeacherOpsMessageEntry\b/);
  assert.deepEqual(toTeacherOpsMessageEntry({
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada"
      }
    ],
    users: [
      {
        id: "teacher-1",
        username: "Tess"
      }
    ]
  }, {
    id: "entry-1",
    thread_id: "thread-1",
    sender_id: "student-1",
    sender_role: "student",
    recipient_id: "teacher-1",
    body: "Could you check this?",
    attachments: [],
    created_at: "2026-06-21T08:00:00.000Z"
  }), {
    id: "entry-1",
    threadId: "thread-1",
    senderId: "student-1",
    senderRole: "student",
    senderName: "Ada",
    recipientId: "teacher-1",
    body: "Could you check this?",
    attachments: [],
    createdAt: "2026-06-21T08:00:00.000Z"
  });
  assert.equal(toTeacherOpsMessageEntry({
    student_profiles: [],
    users: []
  }, {
    id: "entry-2",
    thread_id: "thread-1",
    sender_id: "teacher-missing",
    sender_role: "teacher",
    recipient_id: "student-1",
    body: "Fallback",
    attachments: [],
    created_at: "2026-06-21T08:01:00.000Z"
  }).senderName, "Teacher");
  assert.match(rootSource, /toTeacherOpsMessageEntry as toTeacherMessageEntryFromTeacherOpsInbox/);
  assert.doesNotMatch(rootSource, /function toTeacherMessageEntry\b/);
});

test("teacher ops inbox persistence owns teacher message scoping helper", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsInboxPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(persistenceSource, /function teacherMessagesFor\(/);
  assert.match(persistenceSource, /export const teacherOpsInboxMessagesFor = teacherMessagesFor;/);
  assert.match(rootSource, /teacherOpsInboxMessagesFor as teacherMessagesForFromTeacherOpsInbox/);
  assert.doesNotMatch(rootSource, /function teacherMessagesFor\(/);

  const database = createDatabase();
  assert.deepEqual(
    teacherOpsInboxMessagesFor(database, { id: "teacher-1", role: "teacher" }, new Set(["class-shared"])).map((thread) => thread.id),
    ["thread-shared", "thread-owned", "thread-direct"]
  );
  assert.deepEqual(
    teacherOpsInboxMessagesFor(database, { id: "admin-1", role: "admin" }, new Set()).map((thread) => thread.id),
    ["thread-other", "thread-shared", "thread-owned", "thread-direct"]
  );
});

test("legacy userStore delegates teacher inbox operations to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const getTeacherInboxData = teacherOpsUserStore\.getTeacherInboxData/);
  assert.match(source, /export const replyToTeacherMessageThread = teacherOpsUserStore\.replyToTeacherMessageThread/);
  assert.match(source, /export const updateTeacherMessageThread = teacherOpsUserStore\.updateTeacherMessageThread/);
  assert.doesNotMatch(source, /export async function getTeacherInboxData/);
  assert.doesNotMatch(source, /export async function replyToTeacherMessageThread/);
  assert.doesNotMatch(source, /export async function updateTeacherMessageThread/);
});
