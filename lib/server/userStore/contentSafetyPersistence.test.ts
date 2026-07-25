import assert from "node:assert/strict";
import test from "node:test";

import {
  createContentSafetyPersistenceStore,
  normalizeContentSafetyFlagRecord,
  type ContentSafetyPersistenceDatabase
} from "@/lib/server/userStore/contentSafetyPersistence";

function createDatabase(): ContentSafetyPersistenceDatabase {
  return {
    content_safety_flags: [],
    users: [
      { id: "student-a", name: "Ada", role: "student" },
      { id: "student-b", name: "Ben", role: "student" },
      { id: "teacher-1", name: "Ms. Reed", role: "teacher" },
      { id: "teacher-2", name: "Mr. Poe", role: "teacher" },
      { id: "admin-1", name: "Principal", role: "admin" }
    ],
    teacher_classes: [
      { id: "class-1", teacher_id: "teacher-1" },
      { id: "class-2", teacher_id: "teacher-2" }
    ],
    class_enrollments: [
      { class_id: "class-1", student_id: "student-a" },
      { class_id: "class-2", student_id: "student-b" }
    ],
    school_memberships: []
  };
}

function createStore(database: ContentSafetyPersistenceDatabase, now = new Date("2026-07-21T10:00:00Z")) {
  let counter = 0;
  return createContentSafetyPersistenceStore({
    createId: () => `id-${++counter}`,
    now: () => now,
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

test("records a flag with normalized fields and student name lookup", async () => {
  const database = createDatabase();
  const store = createStore(database);
  const flag = await store.recordContentSafetyFlag({
    studentId: "student-a",
    category: "self-harm",
    severity: "critical",
    source: "student-input",
    excerpt: "i want to ...",
    matchedTerms: ["i want to"],
    page: "/practice",
    language: "en",
    blockedReply: true
  });

  assert.equal(flag.studentId, "student-a");
  assert.equal(flag.studentName, "Ada");
  assert.equal(flag.status, "new");
  assert.equal(flag.blockedReply, true);
  assert.equal(database.content_safety_flags.length, 1);
});

test("teacher sees only flags for students in their own classes", async () => {
  const database = createDatabase();
  const store = createStore(database);
  await store.recordContentSafetyFlag({
    studentId: "student-a", category: "self-harm", severity: "critical", source: "student-input", excerpt: "a"
  });
  await store.recordContentSafetyFlag({
    studentId: "student-b", category: "harassment", severity: "high", source: "student-input", excerpt: "b"
  });

  const teacher1 = await store.listContentSafetyAlertsForViewer("teacher-1");
  assert.equal(teacher1.flags.length, 1);
  assert.equal(teacher1.flags[0].studentId, "student-a");
  assert.equal(teacher1.counts.total, 1);
  assert.equal(teacher1.counts.open, 1);

  const teacher2 = await store.listContentSafetyAlertsForViewer("teacher-2");
  assert.equal(teacher2.flags.length, 1);
  assert.equal(teacher2.flags[0].studentId, "student-b");
});

test("admin sees all flags", async () => {
  const database = createDatabase();
  const store = createStore(database);
  await store.recordContentSafetyFlag({ studentId: "student-a", category: "self-harm", severity: "critical", source: "student-input", excerpt: "a" });
  await store.recordContentSafetyFlag({ studentId: "student-b", category: "abuse", severity: "critical", source: "student-input", excerpt: "b" });

  const admin = await store.listContentSafetyAlertsForViewer("admin-1");
  assert.equal(admin.flags.length, 2);
  assert.equal(admin.counts.total, 2);
});

test("co-teacher via school membership can see the class", async () => {
  const database = createDatabase();
  database.school_memberships = [{ user_id: "teacher-2", role: "teacher", class_id: "class-1" }];
  const store = createStore(database);
  await store.recordContentSafetyFlag({ studentId: "student-a", category: "self-harm", severity: "critical", source: "student-input", excerpt: "a" });

  const teacher2 = await store.listContentSafetyAlertsForViewer("teacher-2");
  assert.equal(teacher2.flags.length, 1);
});

test("students cannot list alerts", async () => {
  const database = createDatabase();
  const store = createStore(database);
  await store.recordContentSafetyFlag({ studentId: "student-a", category: "self-harm", severity: "critical", source: "student-input", excerpt: "a" });
  const view = await store.listContentSafetyAlertsForViewer("student-a");
  assert.equal(view.flags.length, 0);
  assert.equal(view.counts.total, 0);
});

test("flags sort new-critical first", async () => {
  const database = createDatabase();
  // Enroll both students in class-1 so teacher-1 sees both.
  (database.class_enrollments ??= []).push({ class_id: "class-1", student_id: "student-b" });
  const store = createStore(database);
  const high = await store.recordContentSafetyFlag({ studentId: "student-b", category: "harassment", severity: "high", source: "student-input", excerpt: "high" });
  const critical = await store.recordContentSafetyFlag({ studentId: "student-a", category: "self-harm", severity: "critical", source: "student-input", excerpt: "crit" });

  const view = await store.listContentSafetyAlertsForViewer("teacher-1");
  assert.equal(view.flags[0].id, critical.id);
  assert.equal(view.flags[1].id, high.id);
});

test("acknowledge then resolve transitions and records actor", async () => {
  const database = createDatabase();
  const store = createStore(database);
  const flag = await store.recordContentSafetyFlag({ studentId: "student-a", category: "self-harm", severity: "critical", source: "student-input", excerpt: "a" });

  const ack = await store.updateContentSafetyFlagStatus({ flagId: flag.id, actorId: "teacher-1", status: "acknowledged" });
  assert.equal(ack.ok, true);
  assert.equal(ack.ok && ack.flag.status, "acknowledged");
  assert.equal(ack.ok && ack.flag.acknowledgedByName, "Ms. Reed");

  const resolved = await store.updateContentSafetyFlagStatus({ flagId: flag.id, actorId: "teacher-1", status: "resolved", note: "Met with student and counsellor." });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.ok && resolved.flag.status, "resolved");
  assert.equal(resolved.ok && resolved.flag.resolutionNote, "Met with student and counsellor.");
});

test("resolving directly backfills acknowledgement", async () => {
  const database = createDatabase();
  const store = createStore(database);
  const flag = await store.recordContentSafetyFlag({ studentId: "student-a", category: "self-harm", severity: "critical", source: "student-input", excerpt: "a" });
  const resolved = await store.updateContentSafetyFlagStatus({ flagId: flag.id, actorId: "admin-1", status: "resolved" });
  assert.equal(resolved.ok && resolved.flag.acknowledgedBy, "admin-1");
  assert.equal(resolved.ok && resolved.flag.resolvedBy, "admin-1");
});

test("a teacher cannot update a flag for a student outside their classes", async () => {
  const database = createDatabase();
  const store = createStore(database);
  const flag = await store.recordContentSafetyFlag({ studentId: "student-b", category: "abuse", severity: "critical", source: "student-input", excerpt: "b" });
  const attempt = await store.updateContentSafetyFlagStatus({ flagId: flag.id, actorId: "teacher-1", status: "acknowledged" });
  assert.equal(attempt.ok, false);
  assert.equal(!attempt.ok && attempt.reason, "forbidden");
});

test("updating a missing flag returns not-found", async () => {
  const database = createDatabase();
  const store = createStore(database);
  const attempt = await store.updateContentSafetyFlagStatus({ flagId: "nope", actorId: "admin-1", status: "acknowledged" });
  assert.equal(attempt.ok, false);
  assert.equal(!attempt.ok && attempt.reason, "not-found");
});

test("countOpenContentSafetyAlertsForViewer excludes resolved", async () => {
  const database = createDatabase();
  const store = createStore(database);
  const flag = await store.recordContentSafetyFlag({ studentId: "student-a", category: "self-harm", severity: "critical", source: "student-input", excerpt: "a" });
  assert.equal(await store.countOpenContentSafetyAlertsForViewer("teacher-1"), 1);
  await store.updateContentSafetyFlagStatus({ flagId: flag.id, actorId: "teacher-1", status: "resolved" });
  assert.equal(await store.countOpenContentSafetyAlertsForViewer("teacher-1"), 0);
});

test("normalizeContentSafetyFlagRecord rejects records without a student or valid category", () => {
  assert.equal(normalizeContentSafetyFlagRecord({ category: "self-harm" }), null);
  assert.equal(normalizeContentSafetyFlagRecord({ student_id: "s", category: "not-a-category" }), null);
  const ok = normalizeContentSafetyFlagRecord({ student_id: "s", category: "abuse" });
  assert.ok(ok);
  assert.equal(ok?.severity, "high");
  assert.equal(ok?.status, "new");
});
