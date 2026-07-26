import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createAiTutorTranscriptAccessPersistenceStore,
  normalizeAiTutorTranscriptAccessRecord,
  type AITutorTranscriptAccessPersistenceDatabase
} from "@/lib/server/userStore/aiTutorTranscriptAccessPersistence";

function createDatabase(): AITutorTranscriptAccessPersistenceDatabase {
  return {
    ai_tutor_transcript_access_events: [],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "admin-1", role: "admin" }
    ]
  };
}

function createTestStore(database: AITutorTranscriptAccessPersistenceDatabase) {
  let clockMs = Date.parse("2026-06-20T10:00:00.000Z");
  let counter = 0;
  return createAiTutorTranscriptAccessPersistenceStore({
    createId: () => `id-${++counter}`,
    now: () => new Date((clockMs += 1000)),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

test("transcript access persistence records and lists events newest-first with the message count", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const first = await store.recordAiTutorTranscriptAccess({
    viewerId: "teacher-1",
    viewerName: "Teacher One",
    viewerRole: "teacher",
    studentId: "student-1",
    studentName: "Ada Student",
    messageCount: 5
  });
  await store.recordAiTutorTranscriptAccess({
    viewerId: "teacher-1",
    viewerName: "Teacher One",
    viewerRole: "teacher",
    studentId: "student-3",
    studentName: "Bo Student",
    messageCount: 0
  });

  assert.equal(first.viewerId, "teacher-1");
  assert.equal(first.studentName, "Ada Student");
  assert.equal(first.messageCount, 5);

  const events = await store.listAiTutorTranscriptAccessForViewer("teacher-1");
  // Newest reveal first.
  assert.deepEqual(events.map((event) => event.studentId), ["student-3", "student-1"]);
  assert.deepEqual(events.map((event) => event.messageCount), [0, 5]);
});

test("transcript access persistence scopes visibility to the viewer, with admin seeing all", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  await store.recordAiTutorTranscriptAccess({
    viewerId: "teacher-1",
    viewerName: "Teacher One",
    viewerRole: "teacher",
    studentId: "student-1",
    studentName: "Ada Student",
    messageCount: 4
  });
  await store.recordAiTutorTranscriptAccess({
    viewerId: "teacher-2",
    viewerName: "Teacher Two",
    viewerRole: "teacher",
    studentId: "student-2",
    studentName: "Cy Student",
    messageCount: 2
  });

  const teacherOneEvents = await store.listAiTutorTranscriptAccessForViewer("teacher-1");
  assert.deepEqual(teacherOneEvents.map((event) => event.viewerId), ["teacher-1"]);

  const teacherTwoEvents = await store.listAiTutorTranscriptAccessForViewer("teacher-2");
  assert.deepEqual(teacherTwoEvents.map((event) => event.viewerId), ["teacher-2"]);

  const adminEvents = await store.listAiTutorTranscriptAccessForViewer("admin-1");
  assert.deepEqual(adminEvents.map((event) => event.viewerId).sort(), ["teacher-1", "teacher-2"]);

  // An unknown viewer sees nothing.
  const unknownEvents = await store.listAiTutorTranscriptAccessForViewer("nobody");
  assert.deepEqual(unknownEvents, []);
});

test("transcript access persistence caps stored events and keeps the most recent", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  for (let index = 0; index < 2005; index += 1) {
    await store.recordAiTutorTranscriptAccess({
      viewerId: "teacher-1",
      viewerName: "Teacher One",
      viewerRole: "teacher",
      studentId: `student-${index}`,
      studentName: `Student ${index}`,
      messageCount: 1
    });
  }

  // The snapshot payload is rewritten on every mutation, so the log stays bounded.
  assert.equal(database.ai_tutor_transcript_access_events.length, 2000);
  // The very first inserts were dropped; the newest survive.
  const surviving = new Set(database.ai_tutor_transcript_access_events.map((event) => event.student_id));
  assert.equal(surviving.has("student-0"), false);
  assert.equal(surviving.has("student-2004"), true);
});

test("transcript access persistence ages out events past the retention window", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  // Two years old (outside retention), one week old (inside), one unparseable.
  database.ai_tutor_transcript_access_events.push(
    {
      id: "expired",
      viewer_id: "teacher-1",
      viewer_name: "Teacher One",
      viewer_role: "teacher",
      student_id: "student-expired",
      student_name: "Expired Student",
      message_count: 1,
      created_at: "2024-06-20T10:00:00.000Z"
    },
    {
      id: "recent",
      viewer_id: "teacher-1",
      viewer_name: "Teacher One",
      viewer_role: "teacher",
      student_id: "student-recent",
      student_name: "Recent Student",
      message_count: 1,
      created_at: "2026-06-13T10:00:00.000Z"
    },
    {
      id: "unparseable",
      viewer_id: "teacher-1",
      viewer_name: "Teacher One",
      viewer_role: "teacher",
      student_id: "student-unparseable",
      student_name: "Unparseable Student",
      message_count: 1,
      created_at: "not-a-date"
    }
  );

  await store.recordAiTutorTranscriptAccess({
    viewerId: "teacher-1",
    viewerName: "Teacher One",
    viewerRole: "teacher",
    studentId: "student-new",
    studentName: "New Student",
    messageCount: 3
  });

  const ids = database.ai_tutor_transcript_access_events.map((event) => event.id);
  assert.equal(ids.includes("expired"), false, "records past the retention window are dropped");
  assert.equal(ids.includes("recent"), true, "records inside the window are kept");
  // Unreadable timestamps are audit evidence too: keep them rather than silently drop.
  assert.equal(ids.includes("unparseable"), true, "records with unparseable timestamps are kept");
});

test("transcript access record normalization hardens malformed input", () => {
  const normalized = normalizeAiTutorTranscriptAccessRecord(
    {
      viewer_id: "  teacher-9  ",
      viewer_role: "not-a-role",
      student_name: "   ",
      message_count: -3.6
    },
    "2026-06-20T10:00:00.000Z",
    () => "generated"
  );

  assert.ok(normalized);
  assert.equal(normalized?.id, "ai-tutor-transcript-access-generated");
  assert.equal(normalized?.viewer_id, "teacher-9");
  assert.equal(normalized?.viewer_role, "teacher");
  assert.equal(normalized?.student_name, "Unknown student");
  assert.equal(normalized?.message_count, 0);
  assert.equal(normalized?.created_at, "2026-06-20T10:00:00.000Z");
});

test("transcript access persistence stays free of legacy userStore imports", async () => {
  const source = await readFile(
    path.join(process.cwd(), "lib/server/userStore/aiTutorTranscriptAccessPersistence.ts"),
    "utf8"
  );
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);
});
