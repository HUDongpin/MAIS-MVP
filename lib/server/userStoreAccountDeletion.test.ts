import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  accountDeletionPlan,
  assessAccountDeletion,
  buildAccountDataExport,
  deleteUserFromDatabase
} from "@/lib/server/userStore/accountDeletionPersistence";

const studentId = "student-alice";
const otherStudentId = "student-bob";
const teacherId = "teacher-chan";
const parentId = "parent-alice-family";

/** Table keys declared on the real `Database` type in lib/server/userStore.ts. */
function databaseTableKeysFromSource(): string[] {
  const source = readFileSync(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const start = source.indexOf("type Database = {");
  assert.ok(start >= 0, "Could not locate the Database type in lib/server/userStore.ts");
  const body = source.slice(start, source.indexOf("\n};", start));
  const keys: string[] = [];
  for (const line of body.split("\n").slice(1)) {
    const match = line.match(/^\s*(\w+)\??:\s*[\w<>[\]]+;/);
    if (match) keys.push(match[1]);
  }
  assert.ok(keys.length > 50, `Expected to parse the full Database type, got ${keys.length} keys`);
  return keys;
}

function seedDatabase() {
  return {
    users: [
      { id: studentId, username: "Alice", role: "student", password_hash: "hash", password_salt: "salt" },
      { id: otherStudentId, username: "Bob", role: "student" },
      { id: teacherId, username: "Chan", role: "teacher" },
      { id: parentId, username: "Alice Parent", role: "parent" }
    ],
    student_profiles: [
      { user_id: studentId, name: "Alice", grade: "P4" },
      { user_id: otherStudentId, name: "Bob", grade: "P4" }
    ],
    user_settings: [{ user_id: studentId, language: "en", theme: "dark", selected_grade: "P4", updated_at: "now" }],
    learner_profiles: [{ user_id: studentId, status: "completed" }],
    auth_identities: [{ user_id: studentId, provider: "google" }],
    password_reset_tokens: [{ id: "reset-1", user_id: studentId, token_hash: "secret-hash" }],
    guardian_links: [{ id: "link-1", parent_id: parentId, student_id: studentId, created_by: teacherId }],
    attempts: [
      { id: "attempt-1", user_id: studentId, question_id: "q1" },
      { id: "attempt-2", user_id: otherStudentId, question_id: "q1" }
    ],
    mistakes: [{ user_id: studentId, question_id: "q1" }],
    lesson_progress: [{ user_id: studentId, topic_id: "t1", status: "completed" }],
    ai_tutor_messages: [{ id: "msg-1", user_id: studentId, body: "help me with fractions" }],
    content_safety_flags: [
      { id: "flag-1", student_id: studentId, student_name: "Alice", acknowledged_by: teacherId, acknowledged_by_name: "Chan" },
      { id: "flag-2", student_id: otherStudentId, student_name: "Bob", acknowledged_by: studentId, acknowledged_by_name: "Alice" }
    ],
    teacher_classes: [{ id: "class-1", teacher_id: teacherId }],
    class_enrollments: [
      { id: "enroll-1", class_id: "class-1", student_id: studentId },
      { id: "enroll-2", class_id: "class-1", student_id: otherStudentId }
    ],
    class_roster_profiles: [
      { enrollment_id: "enroll-1", student_no: "01", display_order: 1 },
      { enrollment_id: "enroll-2", student_no: "02", display_order: 2 }
    ],
    assignments: [{ id: "assign-1", class_id: "class-1", created_by: teacherId }],
    submissions: [
      { id: "sub-1", assignment_id: "assign-1", student_id: studentId },
      { id: "sub-2", assignment_id: "assign-1", student_id: otherStudentId }
    ],
    assignment_submission_attempts: [{ id: "att-1", submission_id: "sub-1", student_id: studentId }],
    assignment_grading_runs: [{ id: "run-1", submission_id: "sub-1", attempt_id: "att-1" }],
    assignment_teacher_reviews: [{ id: "review-1", submission_id: "sub-1", reviewed_by: teacherId }],
    teacher_student_groups: [
      { id: "group-1", class_id: "class-1", teacher_id: teacherId, member_student_ids: [studentId, otherStudentId] }
    ],
    teacher_learning_paths: [
      { id: "path-1", class_id: "class-1", teacher_id: teacherId, assigned_student_ids: [studentId] }
    ],
    learning_path_step_progress: [{ id: "step-1", path_id: "path-1", step_id: "s1", student_id: studentId }],
    teacher_messages: [{ id: "thread-1", student_id: studentId, teacher_id: teacherId, guardian_id: parentId }],
    teacher_message_entries: [
      { id: "entry-1", thread_id: "thread-1", sender_id: teacherId, recipient_id: parentId, body: "About Alice" }
    ],
    teacher_live_sessions: [{ id: "live-1", class_id: "class-1", teacher_id: teacherId }],
    teacher_live_responses: [{ id: "resp-1", session_id: "live-1", prompt_id: "p1", student_id: studentId }],
    teacher_live_tool_states: [
      {
        session_id: "live-1",
        attendance: [
          { studentId, studentName: "Alice", status: "present" },
          { studentId: otherStudentId, studentName: "Bob", status: "present" }
        ],
        random_call: { currentStudentId: studentId, currentStudentName: "Alice", selectedStudentIds: [studentId, otherStudentId] }
      }
    ],
    reward_point_ledger: [{ id: "ledger-1", student_id: studentId, awarded_by: teacherId, points: 10 }],
    gamification_events: [{ id: "game-1", student_id: studentId }],
    forum_threads: [
      {
        classId: "class-1",
        threadId: "thread-a",
        author: { id: studentId, name: "Alice", role: "student" },
        replies: [],
        meTooUserIds: [],
        meTooCount: 0
      },
      {
        classId: "class-1",
        threadId: "thread-b",
        author: { id: otherStudentId, name: "Bob", role: "student" },
        replies: [
          { replyId: "r1", author: { id: studentId, name: "Alice", role: "student" }, body: { en: "me too" } },
          { replyId: "r2", author: { id: otherStudentId, name: "Bob", role: "student" }, body: { en: "thanks" } }
        ],
        meTooUserIds: [studentId, otherStudentId],
        meTooCount: 2
      }
    ],
    forum_notifications: [{ notificationId: "n1", recipientId: studentId, actorId: teacherId }],
    nova_lens_policy: { updated_by: studentId, allowed_scopes: [] },
    schools: [{ id: "school-1", created_by: teacherId }],
    topics: [{ id: "t1", title: "Fractions" }],
    questions: [{ id: "q1", topic_id: "t1" }]
  } as Record<string, unknown>;
}

test("every table in the Database type has an explicit deletion rule", () => {
  const databaseKeys = databaseTableKeysFromSource();
  const planKeys = Object.keys(accountDeletionPlan);

  const missing = databaseKeys.filter((key) => !planKeys.includes(key));
  assert.deepEqual(
    missing,
    [],
    `New state tables must declare how account deletion treats them in accountDeletionPlan: ${missing.join(", ")}`
  );

  const stale = planKeys.filter((key) => !databaseKeys.includes(key));
  assert.deepEqual(stale, [], `accountDeletionPlan names tables that no longer exist: ${stale.join(", ")}`);
});

test("every deletion rule documents its rationale and does something", () => {
  for (const [table, rule] of Object.entries(accountDeletionPlan)) {
    assert.ok(rule.note && rule.note.length > 10, `${table} needs a rationale note`);
    const acts =
      rule.content || rule.custom || rule.purgeWhen?.length || rule.cascadeFrom?.length || rule.dropFromList?.length || rule.scrubActors?.length;
    assert.ok(acts, `${table} declares no deletion behaviour`);
  }
});

test("deleting a student removes their own records", () => {
  const database = seedDatabase();
  const summary = deleteUserFromDatabase(database, studentId);

  assert.equal((database.users as unknown[]).length, 3);
  assert.equal((database.student_profiles as unknown[]).length, 1);
  assert.deepEqual(database.user_settings, []);
  assert.deepEqual(database.learner_profiles, []);
  assert.deepEqual(database.auth_identities, []);
  assert.deepEqual(database.password_reset_tokens, []);
  assert.deepEqual(database.guardian_links, []);
  assert.deepEqual(database.mistakes, []);
  assert.deepEqual(database.lesson_progress, []);
  assert.deepEqual(database.ai_tutor_messages, []);
  assert.equal((database.attempts as unknown[]).length, 1, "the other learner's attempt survives");
  assert.ok(summary.totalRemoved > 10);
});

test("deleting a student cascades through enrollment, submission and live-session chains", () => {
  const database = seedDatabase();
  deleteUserFromDatabase(database, studentId);

  const rosterProfiles = database.class_roster_profiles as Record<string, unknown>[];
  assert.deepEqual(rosterProfiles.map((row) => row.enrollment_id), ["enroll-2"], "roster row follows its enrollment");

  assert.deepEqual((database.submissions as Record<string, unknown>[]).map((row) => row.id), ["sub-2"]);
  assert.deepEqual(database.assignment_submission_attempts, []);
  assert.deepEqual(database.assignment_grading_runs, [], "grading run cascades two hops from the submission");
  assert.deepEqual(database.assignment_teacher_reviews, [], "teacher review cascades with the submission");
  assert.deepEqual(database.learning_path_step_progress, []);
  assert.deepEqual(database.teacher_live_responses, []);

  assert.equal((database.teacher_classes as unknown[]).length, 1, "the class itself survives a learner leaving");
  assert.equal((database.assignments as unknown[]).length, 1, "the teacher's assignment survives");
});

test("rows belonging to other people survive with the departing user de-identified", () => {
  const database = seedDatabase();
  deleteUserFromDatabase(database, studentId);

  const flags = database.content_safety_flags as Record<string, unknown>[];
  assert.equal(flags.length, 1, "only the departing learner's own flag is removed");
  assert.equal(flags[0].student_id, otherStudentId);
  assert.equal(flags[0].acknowledged_by, null, "the departing user's actor reference is cleared");
  assert.equal(flags[0].acknowledged_by_name, null);

  const group = (database.teacher_student_groups as Record<string, unknown>[])[0];
  assert.deepEqual(group.member_student_ids, [otherStudentId], "learner pulled from the roster array");

  const path = (database.teacher_learning_paths as Record<string, unknown>[])[0];
  assert.deepEqual(path.assigned_student_ids, []);
});

test("forum threads, replies and me-too rosters are cleaned", () => {
  const database = seedDatabase();
  deleteUserFromDatabase(database, studentId);

  const threads = database.forum_threads as Record<string, unknown>[];
  assert.equal(threads.length, 1, "the thread the learner authored is removed");
  assert.equal(threads[0].threadId, "thread-b");
  assert.deepEqual((threads[0].replies as Record<string, unknown>[]).map((reply) => reply.replyId), ["r2"]);
  assert.deepEqual(threads[0].meTooUserIds, [otherStudentId]);
  assert.equal(threads[0].meTooCount, 1);
  assert.deepEqual(database.forum_notifications, []);
});

test("nested live-session attendance and random-call rosters drop the learner", () => {
  const database = seedDatabase();
  deleteUserFromDatabase(database, studentId);

  const state = (database.teacher_live_tool_states as Record<string, unknown>[])[0];
  const attendance = state.attendance as Record<string, unknown>[];
  assert.deepEqual(attendance.map((entry) => entry.studentId), [otherStudentId]);

  const randomCall = state.random_call as Record<string, unknown>;
  assert.equal(randomCall.currentStudentId, null);
  assert.equal(randomCall.currentStudentName, null);
  assert.deepEqual(randomCall.selectedStudentIds, [otherStudentId]);
});

test("no trace of the deleted learner remains anywhere in the state", () => {
  const database = seedDatabase();
  deleteUserFromDatabase(database, studentId);

  const serialized = JSON.stringify(database);
  assert.ok(
    !serialized.includes(studentId),
    `Deleted learner id still present in state. Remaining occurrences indicate a table missing from accountDeletionPlan.`
  );
  assert.ok(serialized.includes(otherStudentId), "sanity: the other learner is untouched");
});

test("deleting a parent clears the guardian link and their message thread", () => {
  const database = seedDatabase();
  deleteUserFromDatabase(database, parentId);

  assert.deepEqual(database.guardian_links, []);
  assert.deepEqual(database.teacher_messages, []);
  assert.deepEqual(database.teacher_message_entries, [], "entries cascade with the thread");
  assert.ok(!JSON.stringify(database).includes(parentId));
});

test("teacher deletion is blocked while they own classes with learners", () => {
  const database = seedDatabase();
  const blockers = assessAccountDeletion(database, teacherId, "teacher");

  assert.equal(blockers.length, 1);
  assert.equal(blockers[0].code, "owns-active-classes");
  assert.deepEqual(blockers[0].classIds, ["class-1"]);
});

test("students and parents are never blocked, and an empty-handed teacher is not either", () => {
  const database = seedDatabase();
  assert.deepEqual(assessAccountDeletion(database, studentId, "student"), []);
  assert.deepEqual(assessAccountDeletion(database, parentId, "parent"), []);

  database.class_enrollments = [];
  database.teacher_class_collaborators = [];
  assert.deepEqual(assessAccountDeletion(database, teacherId, "teacher"), []);
});

test("data export returns the subject's own rows without credentials", () => {
  const database = seedDatabase();
  const exported = buildAccountDataExport(database, studentId, "2026-08-18T00:00:00.000Z");

  assert.equal(exported.userId, studentId);
  assert.equal(exported.exportedAt, "2026-08-18T00:00:00.000Z");

  const users = exported.tables.users as Record<string, unknown>[];
  assert.equal(users.length, 1);
  assert.equal(users[0].id, studentId);
  assert.ok(!("password_hash" in users[0]), "credentials must never leave the system");
  assert.ok(!("password_salt" in users[0]));

  const tokens = exported.tables.password_reset_tokens as Record<string, unknown>[];
  assert.ok(!("token_hash" in tokens[0]), "reset token hashes are redacted");

  assert.equal((exported.tables.attempts as unknown[]).length, 1);
  assert.equal((exported.tables.ai_tutor_messages as unknown[]).length, 1);
  assert.equal((exported.tables.forum_threads as unknown[]).length, 1, "threads the learner authored");
  assert.ok(exported.scope.includedTables.includes("attempts"));
});

test("data export excludes other people's records", () => {
  const database = seedDatabase();
  const exported = buildAccountDataExport(database, studentId, "2026-08-18T00:00:00.000Z");

  const flags = (exported.tables.content_safety_flags ?? []) as Record<string, unknown>[];
  for (const flag of flags) assert.equal(flag.student_id, studentId);

  assert.equal(exported.tables.schools, undefined, "institutional rows are not personal data");
  assert.equal(exported.tables.topics, undefined, "curriculum content is not personal data");

  const serialized = JSON.stringify(exported);
  assert.ok(!serialized.includes(otherStudentId), "no other learner's identifiers leak into an export");
});

test("deletion is idempotent and safe on an unknown user", () => {
  const database = seedDatabase();
  const before = JSON.stringify(database);

  const noop = deleteUserFromDatabase(database, "student-does-not-exist");
  assert.equal(noop.totalRemoved, 0);
  assert.equal(JSON.stringify(database), before, "unknown user leaves the state untouched");

  deleteUserFromDatabase(database, studentId);
  const afterFirst = JSON.stringify(database);
  const second = deleteUserFromDatabase(database, studentId);
  assert.equal(second.totalRemoved, 0);
  assert.equal(JSON.stringify(database), afterFirst, "second deletion changes nothing");
});

test("an empty user id is rejected rather than matching blank fields", () => {
  const database = seedDatabase();
  const before = JSON.stringify(database);
  const summary = deleteUserFromDatabase(database, "");
  assert.equal(summary.totalRemoved, 0);
  assert.equal(JSON.stringify(database), before);
});
