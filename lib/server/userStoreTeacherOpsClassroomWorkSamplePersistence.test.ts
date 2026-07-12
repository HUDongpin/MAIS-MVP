import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsClassroomWorkSamplePersistenceStore,
  type TeacherOpsClassroomWorkSamplePersistenceDatabase
} from "@/lib/server/userStore/teacherOpsClassroomWorkSamplePersistence";
import type { ClassroomWorkSample } from "@/types";

const fixedNow = "2026-06-21T08:00:00.000Z";

function createDatabase(): TeacherOpsClassroomWorkSamplePersistenceDatabase {
  return {
    classroom_work_samples: [
      {
        id: "sample-selected",
        session_id: "session-active",
        student_id: "student-1",
        image_data_url: "data:image/png;base64,selected",
        caption: "Selected",
        status: "selected",
        created_at: "2026-06-20T09:00:00.000Z",
        selected_at: "2026-06-20T09:05:00.000Z"
      },
      {
        id: "sample-submitted",
        session_id: "session-active",
        student_id: "student-2",
        image_data_url: "data:image/png;base64,submitted",
        caption: "Submitted",
        status: "submitted",
        created_at: "2026-06-20T10:00:00.000Z",
        selected_at: null
      },
      {
        id: "sample-hidden",
        session_id: "session-active",
        student_id: "student-2",
        image_data_url: "data:image/png;base64,hidden",
        caption: "Hidden",
        status: "hidden",
        created_at: "2026-06-20T11:00:00.000Z",
        selected_at: null
      }
    ],
    class_enrollments: [
      { class_id: "class-owned", student_id: "student-1" },
      { class_id: "class-owned", student_id: "student-2" },
      { class_id: "class-other", student_id: "student-other" }
    ],
    school_memberships: [
      { user_id: "teacher-member", class_id: "class-owned", role: "teacher" }
    ],
    teacher_classes: [
      { id: "class-owned", teacher_id: "teacher-1" },
      { id: "class-other", teacher_id: "teacher-2" }
    ],
    teacher_live_sessions: [
      {
        id: "session-active",
        class_id: "class-owned",
        status: "active",
        updated_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "session-ended",
        class_id: "class-owned",
        status: "ended",
        updated_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "teacher-member", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" },
      { id: "student-2", role: "student" },
      { id: "student-other", role: "student" }
    ]
  };
}

function createTestStore(database: TeacherOpsClassroomWorkSamplePersistenceDatabase) {
  let idCounter = 0;

  return createTeacherOpsClassroomWorkSamplePersistenceStore({
    createId: () => `generated-${++idCounter}`,
    mutateDatabase: async (mutator) => mutator(database),
    normalizeObjectKey: (value) => typeof value === "string" && value.startsWith("media/")
      ? value.trim()
      : undefined,
    now: () => new Date(fixedNow),
    toWorkSample: (_database, sample) => ({
      id: sample.id,
      sessionId: sample.session_id,
      studentId: sample.student_id,
      studentName: sample.student_id,
      imageDataUrl: sample.image_object_key ? `/media/${sample.image_object_key}` : sample.image_data_url ?? "",
      imageObjectKey: sample.image_object_key,
      imageUrl: sample.image_object_key ? `/media/${sample.image_object_key}` : undefined,
      caption: sample.caption,
      status: sample.status,
      createdAt: sample.created_at,
      selectedAt: sample.selected_at
    }) satisfies ClassroomWorkSample
  });
}

test("teacher ops classroom work sample persistence owns status normalization helpers instead of root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsClassroomWorkSamplePersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassroomWorkSamplePersistence.ts"), "utf8");

  const isValidClassroomWorkSampleStatus = helpers.isValidClassroomWorkSampleStatus;
  const normalizeClassroomWorkSampleStatus = helpers.normalizeClassroomWorkSampleStatus;

  for (const [name, helper] of Object.entries({
    isValidClassroomWorkSampleStatus,
    normalizeClassroomWorkSampleStatus
  })) {
    assert.equal(typeof helper, "function", `${name} should be exported by teacherOpsClassroomWorkSamplePersistence`);
    assert.match(helperSource, new RegExp(`export function ${name}\\b`));
  }

  assert.match(rootSource, /normalizeClassroomWorkSampleStatus as normalizeClassroomWorkSampleStatusFromTeacherOpsClassroomWorkSample/);
  assert.doesNotMatch(rootSource, /const validClassroomWorkSampleStatuses\b/);
  assert.equal((isValidClassroomWorkSampleStatus as (status: unknown) => boolean)("selected"), true);
  assert.equal((isValidClassroomWorkSampleStatus as (status: unknown) => boolean)("archived"), false);
  assert.equal((normalizeClassroomWorkSampleStatus as (status: unknown) => string)("hidden"), "hidden");
  assert.equal((normalizeClassroomWorkSampleStatus as (status: unknown) => string)("archived"), "submitted");
});

test("teacher ops classroom work sample persistence owns durable record normalization", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsClassroomWorkSamplePersistence") as Record<string, unknown>;
  assert.equal(typeof helpers.normalizeTeacherOpsClassroomWorkSampleRecord, "function");

  const normalizeTeacherOpsClassroomWorkSampleRecord =
    helpers.normalizeTeacherOpsClassroomWorkSampleRecord as (
      sample: Record<string, unknown>,
      now: string,
      normalizeObjectKey?: (value: unknown) => string | undefined
    ) => Record<string, unknown>;

  assert.deepEqual(
    normalizeTeacherOpsClassroomWorkSampleRecord({
      id: "sample-1",
      session_id: "  session-active  ",
      student_id: "  student-1  ",
      image_data_url: "  data:image/png;base64,abc  ",
      image_object_key: " media/classroom-safe.webp ",
      caption: "  First   selected   strategy  ",
      status: "archived",
      selected_at: undefined
    }, fixedNow, (value) => typeof value === "string" && value.includes("classroom-safe")
      ? "media/classroom-safe.webp"
      : undefined),
    {
      id: "sample-1",
      session_id: "session-active",
      student_id: "student-1",
      image_data_url: "data:image/png;base64,abc",
      image_object_key: "media/classroom-safe.webp",
      caption: "First selected strategy",
      status: "submitted",
      created_at: fixedNow,
      selected_at: null
    }
  );

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.match(rootSource, /normalizeTeacherOpsClassroomWorkSampleRecord as normalizeClassroomWorkSampleRecordFromTeacherOpsClassroomWorkSample/);
  assert.doesNotMatch(rootSource, /function normalizeClassroomWorkSampleRecord\b/);
});

test("teacher ops classroom work sample persistence creates enrolled student samples without legacy userStore imports", async () => {
  const source = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsClassroomWorkSamplePersistence.ts"),
    "utf8"
  );
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const result = await createTestStore(database).createClassroomWorkSample({
    userId: "teacher-1",
    sessionId: "session-active",
    imageObject: { objectKey: "media/classroom/sample-1.webp" },
    caption: "  Teacher-selected example  ",
    studentId: "student-2"
  });

  assert.equal(result.status, "created");
  assert.equal(result.sample?.id, "work-sample-generated-1");
  assert.equal(result.sample?.studentId, "student-2");
  assert.equal(result.sample?.imageObjectKey, "media/classroom/sample-1.webp");
  assert.equal(result.sample?.imageDataUrl, "/media/media/classroom/sample-1.webp");
  assert.equal(result.sample?.caption, "Teacher-selected example");
  assert.equal(database.classroom_work_samples[0]?.id, "work-sample-generated-1");
  assert.equal(database.classroom_work_samples[0]?.created_at, fixedNow);
  assert.equal(database.teacher_live_sessions.find((session) => session.id === "session-active")?.updated_at, fixedNow);
});

test("teacher ops classroom work sample persistence enforces valid media and enrollment access", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(
    await store.createClassroomWorkSample({
      userId: "student-1",
      sessionId: "session-active",
      imageDataUrl: "data:image/png;base64,abcd",
      caption: "Student work"
    }),
    {
      status: "created",
      sample: {
        id: "work-sample-generated-1",
        sessionId: "session-active",
        studentId: "student-1",
        studentName: "student-1",
        imageDataUrl: "data:image/png;base64,abcd",
        imageObjectKey: undefined,
        imageUrl: undefined,
        caption: "Student work",
        status: "submitted",
        createdAt: fixedNow,
        selectedAt: null
      }
    }
  );
  assert.deepEqual(
    await store.createClassroomWorkSample({
      userId: "student-other",
      sessionId: "session-active",
      imageDataUrl: "data:image/png;base64,abcd"
    }),
    { status: "forbidden" }
  );
  assert.deepEqual(
    await store.createClassroomWorkSample({
      userId: "student-1",
      sessionId: "session-active",
      imageDataUrl: "not an image"
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.createClassroomWorkSample({
      userId: "student-1",
      sessionId: "session-ended",
      imageDataUrl: "data:image/png;base64,abcd"
    }),
    { status: "not-found" }
  );
});

test("teacher ops classroom work sample persistence selects one visible sample per session", async () => {
  const database = createDatabase();
  const result = await createTestStore(database).updateClassroomWorkSampleStatus({
    teacherId: "teacher-member",
    sessionId: "session-active",
    sampleId: "sample-submitted",
    status: "selected"
  });

  assert.equal(result.status, "updated");
  assert.deepEqual(result.samples.map((sample) => sample.id), ["sample-submitted", "sample-selected"]);
  assert.equal(result.samples[0]?.selectedAt, fixedNow);
  assert.equal(database.classroom_work_samples.find((sample) => sample.id === "sample-selected")?.status, "submitted");
  assert.equal(database.classroom_work_samples.find((sample) => sample.id === "sample-selected")?.selected_at, null);
  assert.equal(database.classroom_work_samples.find((sample) => sample.id === "sample-submitted")?.status, "selected");
  assert.equal(database.teacher_live_sessions.find((session) => session.id === "session-active")?.updated_at, fixedNow);
});

test("teacher ops classroom work sample persistence validates status updates and delegates legacy exports", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(
    await store.updateClassroomWorkSampleStatus({
      teacherId: "teacher-1",
      sessionId: "session-active",
      sampleId: "sample-submitted",
      status: "archived" as never
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.updateClassroomWorkSampleStatus({
      teacherId: "student-1",
      sessionId: "session-active",
      sampleId: "sample-submitted",
      status: "hidden"
    }),
    { status: "forbidden" }
  );
  assert.deepEqual(
    await store.updateClassroomWorkSampleStatus({
      teacherId: "teacher-2",
      sessionId: "session-active",
      sampleId: "sample-submitted",
      status: "hidden"
    }),
    { status: "not-found" }
  );

  const userStoreSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.match(
    userStoreSource,
    /export const createClassroomWorkSample = teacherOpsUserStore\.createClassroomWorkSample;/
  );
  assert.match(
    userStoreSource,
    /export const updateClassroomWorkSampleStatus = teacherOpsUserStore\.updateClassroomWorkSampleStatus;/
  );
});
