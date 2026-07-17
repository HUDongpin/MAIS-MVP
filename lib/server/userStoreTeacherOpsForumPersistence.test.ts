import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { forumReportNoteMaxLength, type ForumThread } from "@/lib/forum";
import {
  createTeacherOpsForumPersistenceStore,
  type TeacherOpsForumPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsForumPersistence";

const fixedNow = "2026-06-21T10:00:00.000Z";

type TeacherOpsForumSeedBoundaryModule = {
  teacherOpsSeedForumThreadRecords?: (
    now: string,
    options: {
      shouldSeedDemoUser: () => boolean;
      seedThreads: ForumThread[];
    }
  ) => ForumThread[];
};

function localized(value: string) {
  return { en: value, zh: value, zhHans: value };
}

function forumAuthor(id: string, name: string, role: "student" | "teacher" = "student"): ForumThread["author"] {
  return {
    id,
    name,
    role,
    accent: role === "teacher" ? "indigo" : "cyan"
  };
}

function forumThread(overrides: Partial<ForumThread> = {}): ForumThread {
  return {
    classId: "class-owned",
    threadId: "thread-question",
    title: localized("Fractions question"),
    body: localized("How do I compare unlike denominators?"),
    author: forumAuthor("student-1", "Sam Student"),
    role: "student",
    mode: "async",
    kind: "question",
    subject: localized("Fractions"),
    tags: [localized("Fractions")],
    replies: [],
    pinned: false,
    locked: false,
    resolved: false,
    meTooCount: 0,
    meTooUserIds: [],
    createdAt: "2026-06-20T08:00:00.000Z",
    updatedAt: "2026-06-20T08:00:00.000Z",
    moderation: {
      status: "visible",
      reportCount: 0,
      updatedAt: "2026-06-20T08:00:00.000Z"
    },
    ...overrides
  };
}

function createDatabase(): TeacherOpsForumPersistenceDatabase {
  return {
    class_enrollments: [
      { id: "enrollment-1", class_id: "class-owned", student_id: "student-1" },
      { id: "enrollment-2", class_id: "class-owned", student_id: "student-2" },
      { id: "enrollment-3", class_id: "class-shared", student_id: "student-1" }
    ],
    forum_audit_events: [
      {
        auditId: "audit-existing",
        classId: "class-owned",
        threadId: "thread-question",
        action: "thread-created",
        actorId: "student-1",
        actorName: "Sam Student",
        actorRole: "student",
        targetType: "thread",
        targetId: "thread-question",
        createdAt: "2026-06-20T08:00:00.000Z"
      }
    ],
    forum_notifications: [
      {
        notificationId: "notification-existing",
        classId: "class-owned",
        threadId: "thread-question",
        recipientId: "teacher-1",
        actorId: "student-1",
        actorName: "Sam Student",
        type: "thread",
        title: localized("New class discussion"),
        body: localized("Fractions question"),
        targetType: "thread",
        targetId: "thread-question",
        createdAt: "2026-06-20T08:00:00.000Z"
      }
    ],
    forum_reports: [],
    forum_threads: [
      forumThread(),
      forumThread({
        threadId: "thread-live",
        title: localized("Live challenge"),
        body: localized("Share your midpoint strategy."),
        author: forumAuthor("teacher-1", "Tess Teacher", "teacher"),
        role: "teacher",
        mode: "live",
        kind: "strategy",
        subject: localized("Coordinate geometry"),
        tags: [localized("Geometry")],
        live: {
          sessionId: "live-1",
          active: true,
          prompt: localized("Live challenge"),
          pulses: []
        }
      }),
      forumThread({
        threadId: "thread-hidden",
        title: localized("Hidden discussion"),
        body: localized("Hidden body"),
        moderation: {
          status: "hidden",
          reportCount: 1,
          updatedAt: "2026-06-20T09:00:00.000Z"
        }
      })
    ],
    school_memberships: [
      { user_id: "admin-1", role: "admin", class_id: "class-owned" }
    ],
    student_profiles: [
      { user_id: "teacher-1", name: "Tess Teacher" },
      { user_id: "teacher-2", name: "Vera Viewer" },
      { user_id: "teacher-3", name: "Cole CoTeacher" },
      { user_id: "student-1", name: "Sam Student" },
      { user_id: "student-2", name: "Mia Learner" },
      { user_id: "admin-1", name: "Ada Admin" }
    ],
    teacher_class_collaborators: [
      { id: "collab-viewer", class_id: "class-shared", teacher_id: "teacher-2", role: "viewer", status: "active" },
      { id: "collab-co", class_id: "class-owned", teacher_id: "teacher-3", role: "co-teacher", status: "active" }
    ],
    teacher_classes: [
      { id: "class-owned", teacher_id: "teacher-1", name: "S3A", grade: "S3" },
      { id: "class-shared", teacher_id: "teacher-4", name: "S4B", grade: "S4" }
    ],
    users: [
      { id: "teacher-1", username: "tess", role: "teacher" },
      { id: "teacher-2", username: "vera", role: "teacher" },
      { id: "teacher-3", username: "cole", role: "teacher" },
      { id: "teacher-4", username: "owner", role: "teacher" },
      { id: "student-1", username: "sam", role: "student" },
      { id: "student-2", username: "mia", role: "student" },
      { id: "admin-1", username: "admin", role: "admin" },
      { id: "parent-1", username: "parent", role: "parent" }
    ]
  };
}

function createTestStore(database: TeacherOpsForumPersistenceDatabase) {
  let idCounter = 0;
  return createTeacherOpsForumPersistenceStore({
    createId: (prefix) => `${prefix}-generated-${++idCounter}`,
    displayNameForUser: (sourceDatabase, userId) => (
      sourceDatabase.student_profiles?.find((profile) => profile.user_id === userId)?.name ??
      sourceDatabase.users.find((user) => user.id === userId)?.username ??
      "MAIS member"
    ),
    mutateDatabase: async (mutator) => mutator(database),
    now: () => new Date(fixedNow),
    readDatabase: async () => database
  });
}

test("teacher ops forum persistence exposes workspace data without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsForumPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const store = createTestStore(createDatabase());
  const workspace = await store.getForumWorkspaceData({
    userId: "teacher-1",
    classId: "class-owned",
    query: "fractions",
    pageSize: 4
  });

  assert.equal(workspace?.activeClassId, "class-owned");
  assert.equal(workspace?.permissions.canModerate, true);
  assert.deepEqual(workspace?.classes.map((classSpace) => classSpace.classId), ["class-owned"]);
  assert.deepEqual(workspace?.threads.map((thread) => thread.threadId), ["thread-question"]);
  assert.equal(workspace?.pageInfo.query, "fractions");
  assert.equal(workspace?.reports?.length, 0);
  assert.equal(workspace?.auditEvents?.length, 1);
  assert.equal(workspace?.notifications?.[0]?.notificationId, "notification-existing");

  const emptyWorkspace = await store.getForumWorkspaceData({ userId: "teacher-2" });
  assert.equal(emptyWorkspace?.classes.length, 1);
  assert.equal(emptyWorkspace?.permissions.canPost, false);
  assert.equal(emptyWorkspace?.permissions.canModerate, false);
  assert.equal(await store.getForumWorkspaceData({ userId: "parent-1" }), null);
});

test("teacher ops forum persistence owns forum thread record normalization", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsForumPersistence") as Record<string, unknown>;
  assert.equal(typeof helpers.normalizeTeacherOpsForumThreadRecord, "function");

  const normalizeTeacherOpsForumThreadRecord =
    helpers.normalizeTeacherOpsForumThreadRecord as (record: unknown, now: string) => ForumThread | null;

  assert.equal(normalizeTeacherOpsForumThreadRecord({ threadId: "broken" }, fixedNow), null);

  const normalized = normalizeTeacherOpsForumThreadRecord(forumThread({
    meTooCount: 0,
    meTooUserIds: [" student-1 ", "student-1", "", "student-2"],
    moderation: undefined,
    attachments: [
      {
        attachmentId: " attachment-1 ",
        kind: "math-snapshot",
        name: "  Snapshot  ",
        url: " https://example.com/snapshot.png ",
        mimeType: " image/png ",
        description: "  Key diagram  ",
        createdAt: ""
      }
    ],
    replies: [
      {
        replyId: "reply-1",
        body: localized("Try common denominators."),
        author: forumAuthor("teacher-1", "Tess Teacher", "teacher"),
        role: "teacher",
        createdAt: "2026-06-20T09:00:00.000Z",
        helpfulCount: 0,
        isTeacherAnswer: true,
        attachments: [
          {
            attachmentId: "reply-attachment",
            kind: "file-link",
            name: "  Worksheet  ",
            url: "https://example.com/worksheet.pdf",
            createdAt: ""
          }
        ],
        moderation: undefined
      }
    ],
    live: {
      sessionId: "live-1",
      active: true,
      prompt: localized("Share a strategy."),
      pulses: [
        {
          pulseId: "pulse-1",
          body: localized("Use a number line."),
          author: forumAuthor("teacher-1", "Tess Teacher", "teacher"),
          role: "teacher",
          createdAt: "2026-06-20T09:30:00.000Z",
          attachments: [
            {
              attachmentId: "pulse-attachment",
              kind: "image",
              name: "  Number line  ",
              url: "https://example.com/line.webp",
              createdAt: ""
            }
          ],
          moderation: undefined
        }
      ]
    }
  }), fixedNow);

  assert.ok(normalized);
  assert.deepEqual(normalized.meTooUserIds, ["student-1", "student-2"]);
  assert.equal(normalized.meTooCount, 2);
  assert.equal(normalized.moderation?.status, "visible");
  assert.equal(normalized.moderation?.updatedAt, normalized.updatedAt);
  assert.equal(normalized.attachments?.[0]?.attachmentId, "attachment-1");
  assert.equal(normalized.attachments?.[0]?.name, "Snapshot");
  assert.equal(normalized.attachments?.[0]?.createdAt, fixedNow);
  assert.equal(normalized.replies[0]?.moderation?.updatedAt, "2026-06-20T09:00:00.000Z");
  assert.equal(normalized.replies[0]?.attachments?.[0]?.name, "Worksheet");
  assert.equal(normalized.replies[0]?.attachments?.[0]?.createdAt, fixedNow);
  assert.equal(normalized.live?.pulses[0]?.moderation?.updatedAt, "2026-06-20T09:30:00.000Z");
  assert.equal(normalized.live?.pulses[0]?.attachments?.[0]?.name, "Number line");
  assert.equal(normalized.live?.pulses[0]?.attachments?.[0]?.createdAt, fixedNow);

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /normalizeTeacherOpsForumThreadRecord as normalizeForumThreadRecordFromTeacherOpsForum/);
  assert.doesNotMatch(rootSource, /function normalizeForumThreadRecord\b/);
});

test("teacher ops forum persistence owns seed forum thread records for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsForumPersistence.ts"),
    "utf8"
  );
  const forumModule = await import("@/lib/server/userStore/teacherOpsForumPersistence") as TeacherOpsForumSeedBoundaryModule;

  const seedForumThreadRecords = forumModule.teacherOpsSeedForumThreadRecords;
  if (typeof seedForumThreadRecords !== "function") {
    assert.fail("Expected teacherOpsSeedForumThreadRecords to be exported");
  }
  assert.match(persistenceSource, /export function teacherOpsSeedForumThreadRecords\b/);
  assert.match(rootSource, /teacherOpsSeedForumThreadRecords as seedForumThreadRecordsFromTeacherOpsForum/);
  assert.doesNotMatch(rootSource, /function seedForumThreadRecords\b/);

  const sourceThread = forumThread({
    moderation: undefined,
    replies: [
      {
        replyId: "reply-seed",
        body: localized("Try a diagram."),
        author: forumAuthor("teacher-1", "Tess Teacher", "teacher"),
        role: "teacher",
        createdAt: "2026-06-20T09:00:00.000Z",
        helpfulCount: 0,
        isTeacherAnswer: true,
        moderation: undefined
      }
    ],
    live: {
      sessionId: "live-seed",
      active: true,
      prompt: localized("Share a method."),
      pulses: [
        {
          pulseId: "pulse-seed",
          body: localized("Use substitution."),
          author: forumAuthor("student-1", "Sam Student"),
          role: "student",
          createdAt: "2026-06-20T09:30:00.000Z",
          moderation: undefined
        }
      ]
    }
  });

  assert.deepEqual(
    seedForumThreadRecords(fixedNow, {
      shouldSeedDemoUser: () => false,
      seedThreads: [sourceThread]
    }),
    []
  );

  const [seededThread] = seedForumThreadRecords(fixedNow, {
    shouldSeedDemoUser: () => true,
    seedThreads: [sourceThread]
  });
  assert.notEqual(seededThread, sourceThread);
  assert.equal(sourceThread.moderation, undefined);
  assert.equal(sourceThread.replies[0]?.moderation, undefined);
  assert.equal(sourceThread.live?.pulses[0]?.moderation, undefined);
  assert.equal(seededThread.threadId, "thread-question");
  assert.equal(seededThread.moderation?.status, "visible");
  assert.equal(seededThread.moderation?.updatedAt, "2026-06-20T08:00:00.000Z");
  assert.equal(seededThread.replies[0]?.moderation?.status, "visible");
  assert.equal(seededThread.replies[0]?.moderation?.updatedAt, "2026-06-20T09:00:00.000Z");
  assert.equal(seededThread.live?.pulses[0]?.moderation?.status, "visible");
  assert.equal(seededThread.live?.pulses[0]?.moderation?.updatedAt, "2026-06-20T09:30:00.000Z");
});

test("teacher ops forum persistence owns forum collection normalization for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsForumPersistence.ts"),
    "utf8"
  );
  const helpers = await import("@/lib/server/userStore/teacherOpsForumPersistence") as Record<string, unknown>;

  const normalizeTeacherOpsForumCollections = helpers.normalizeTeacherOpsForumCollections;

  assert.equal(typeof normalizeTeacherOpsForumCollections, "function", "normalizeTeacherOpsForumCollections should be exported");
  assert.match(persistenceSource, /export function normalizeTeacherOpsForumCollections\b/);
  assert.match(rootSource, /normalizeTeacherOpsForumCollections as normalizeForumCollectionsFromTeacherOpsForum/);
  assert.doesNotMatch(rootSource, /forum_threads: mergeSeedRecordsPreservingExisting\(/);
  assert.doesNotMatch(rootSource, /forum_reports: \(database\.forum_reports \?\? \[\]\)/);
  assert.doesNotMatch(rootSource, /forum_audit_events: \(database\.forum_audit_events \?\? \[\]\)/);
  assert.doesNotMatch(rootSource, /forum_notifications: \(database\.forum_notifications \?\? \[\]\)/);

  type NormalizeTeacherOpsForumCollections = (
    collections: {
      forum_threads?: unknown[];
      forum_reports?: unknown[];
      forum_audit_events?: unknown[];
      forum_notifications?: unknown[];
    },
    now: string,
    options: {
      shouldSeedDemoUser: () => boolean;
      seedThreads: ForumThread[];
    }
  ) => {
    forum_threads: ForumThread[];
    forum_reports: Array<{ reportId: string; note: string }>;
    forum_audit_events: Array<{ auditId: string }>;
    forum_notifications: Array<{ notificationId: string }>;
  };
  const normalize = normalizeTeacherOpsForumCollections as NormalizeTeacherOpsForumCollections;

  const longNote = "x".repeat(forumReportNoteMaxLength + 12);
  const auditEvents = Array.from({ length: 501 }, (_, index) => ({
    auditId: `audit-${index}`,
    classId: "class-owned",
    threadId: "thread-seed",
    action: "thread-created",
    actorId: "teacher-1",
    actorName: "Tess Teacher",
    actorRole: "teacher",
    targetType: "thread",
    targetId: "thread-seed",
    createdAt: "2026-06-20T08:00:00.000Z"
  }));
  const notifications = Array.from({ length: 501 }, (_, index) => ({
    notificationId: `notification-${index}`,
    classId: "class-owned",
    threadId: "thread-seed",
    recipientId: "teacher-1",
    actorId: "student-1",
    actorName: "Sam Student",
    type: "thread",
    title: localized("New class discussion"),
    body: localized("Fractions question"),
    targetType: "thread",
    targetId: "thread-seed",
    createdAt: "2026-06-20T08:00:00.000Z"
  }));

  const collections = normalize({
    forum_threads: [
      forumThread({
        threadId: "thread-seed",
        moderation: undefined,
        meTooCount: 0,
        meTooUserIds: [" student-1 ", "student-1", "", "student-2"],
        attachments: [
          {
            attachmentId: " attachment-1 ",
            kind: "math-snapshot",
            name: "  Snapshot  ",
            url: " https://example.com/snapshot.png ",
            createdAt: ""
          }
        ]
      }),
      forumThread({
        threadId: "thread-extra",
        title: localized("Extra discussion"),
        body: localized("Extra body"),
        moderation: undefined
      }),
      { threadId: "broken" }
    ],
    forum_reports: [
      {
        reportId: "report-1",
        classId: "class-owned",
        threadId: "thread-seed",
        targetType: "thread",
        targetId: "thread-seed",
        reason: "other",
        note: longNote,
        reporterId: "student-1",
        reporterName: "Sam Student",
        createdAt: "2026-06-20T08:00:00.000Z"
      },
      { reportId: "broken" }
    ],
    forum_audit_events: [...auditEvents, { auditId: 42 }],
    forum_notifications: [...notifications, { notificationId: 42 }]
  }, fixedNow, {
    shouldSeedDemoUser: () => true,
    seedThreads: [
      forumThread({
        threadId: "thread-seed",
        title: localized("Seed discussion"),
        body: localized("Seed body")
      })
    ]
  });

  assert.deepEqual(collections.forum_threads.map((thread) => thread.threadId), ["thread-seed", "thread-extra"]);
  assert.equal(collections.forum_threads[0]?.title.en, "Fractions question");
  assert.deepEqual(collections.forum_threads[0]?.meTooUserIds, ["student-1", "student-2"]);
  assert.equal(collections.forum_threads[0]?.meTooCount, 2);
  assert.equal(collections.forum_threads[0]?.moderation?.status, "visible");
  assert.equal(collections.forum_threads[0]?.attachments?.[0]?.name, "Snapshot");
  assert.equal(collections.forum_threads[0]?.attachments?.[0]?.createdAt, fixedNow);
  assert.equal(collections.forum_reports.length, 1);
  assert.equal(collections.forum_reports[0]?.note.length, forumReportNoteMaxLength);
  assert.equal(collections.forum_audit_events.length, 500);
  assert.equal(collections.forum_audit_events[499]?.auditId, "audit-499");
  assert.equal(collections.forum_notifications.length, 500);
  assert.equal(collections.forum_notifications[499]?.notificationId, "notification-499");

  assert.deepEqual(normalize({
    forum_threads: [],
    forum_reports: [],
    forum_audit_events: [],
    forum_notifications: []
  }, fixedNow, {
    shouldSeedDemoUser: () => false,
    seedThreads: [
      forumThread({
        threadId: "thread-seed"
      })
    ]
  }), {
    forum_threads: [],
    forum_reports: [],
    forum_audit_events: [],
    forum_notifications: []
  });
});

test("teacher ops forum persistence creates threads, audits, and moderator or mention notifications", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.createClassForumThread({
    userId: "student-1",
    classId: "class-owned",
    title: "  Help @Tess Teacher  ",
    body: "  Can we compare 1/3 and 2/5?  ",
    subject: " Fractions ",
    tags: "fractions, compare, homework",
    mode: "async",
    kind: "question"
  });

  assert.equal(result.status, "created");
  assert.equal(database.forum_threads[0].title.en, "Help @Tess Teacher");
  assert.equal(database.forum_threads[0].author.name, "Sam Student");
  assert.deepEqual(database.forum_threads[0].tags.map((tag) => tag.en), ["fractions", "compare", "homework"]);
  assert.equal(database.forum_audit_events[0].auditId, "forum-audit-generated-1");
  assert.equal(database.forum_audit_events[0].action, "thread-created");
  assert.deepEqual(
    database.forum_notifications.slice(0, 3).map((notification) => notification.recipientId).sort(),
    ["admin-1", "teacher-1", "teacher-3"]
  );

  assert.deepEqual(await store.createClassForumThread({
    userId: "student-1",
    classId: "class-owned",
    title: "Teacher note",
    body: "Students cannot create teacher notes",
    subject: "Math",
    tags: [],
    mode: "async",
    kind: "teacher-note"
  }), { status: "forbidden" });
});

test("teacher ops forum persistence appends replies and live pulses with audit trails", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const replyResult = await store.addClassForumReply({
    userId: "teacher-1",
    threadId: "thread-question",
    body: "Try common denominators."
  });
  assert.equal(replyResult.status, "created");
  assert.equal(database.forum_threads.find((thread) => thread.threadId === "thread-question")?.replies.length, 1);
  assert.equal(database.forum_audit_events[0].action, "reply-created");
  assert.equal(database.forum_notifications[0].recipientId, "student-1");

  const pulseResult = await store.addClassForumLivePulse({
    userId: "student-1",
    threadId: "thread-live",
    body: "Use the midpoint on the number line."
  });
  assert.equal(pulseResult.status, "created");
  assert.equal(database.forum_threads.find((thread) => thread.threadId === "thread-live")?.live?.pulses.length, 1);
  assert.equal(database.forum_audit_events[0].action, "live-pulse-created");

  assert.deepEqual(await store.addClassForumLivePulse({
    userId: "student-1",
    threadId: "thread-question",
    body: "Not a live thread"
  }), { status: "locked" });
});

test("teacher ops forum persistence updates, reports, moderates, and marks notifications read", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const meToo = await store.updateClassForumThread({
    userId: "student-1",
    threadId: "thread-question",
    action: "me-too"
  });
  assert.equal(meToo.status, "updated");
  assert.equal(database.forum_threads.find((thread) => thread.threadId === "thread-question")?.meTooCount, 1);

  const report = await store.reportClassForumContent({
    userId: "student-2",
    threadId: "thread-question",
    targetType: "thread",
    targetId: "thread-question",
    reason: "off-topic",
    note: "This needs teacher review."
  });
  assert.equal(report.status, "reported");
  assert.equal(database.forum_reports[0].reportId, "forum-report-generated-2");
  assert.equal(database.forum_threads.find((thread) => thread.threadId === "thread-question")?.moderation?.status, "needs-review");

  const moderation = await store.updateClassForumThread({
    userId: "teacher-1",
    threadId: "thread-question",
    action: "moderate",
    targetType: "thread",
    targetId: "thread-question",
    moderationStatus: "hidden",
    reason: "Teacher review complete"
  });
  assert.equal(moderation.status, "updated");
  const moderatedThread = database.forum_threads.find((thread) => thread.threadId === "thread-question");
  assert.equal(moderatedThread?.locked, true);
  assert.equal(moderatedThread?.moderation?.reviewedBy, "teacher-1");

  const markRead = await store.markForumNotificationsRead({
    userId: "teacher-1",
    classId: "class-owned",
    notificationIds: ["notification-existing"]
  });
  assert.deepEqual(markRead, { status: "updated", updated: 1 });
  assert.equal(database.forum_notifications.find((notification) => notification.notificationId === "notification-existing")?.readAt, fixedNow);
});
