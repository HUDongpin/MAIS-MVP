import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsResourcePersistenceStore,
  type TeacherOpsResourcePersistenceDatabase
} from "@/lib/server/userStore/teacherOpsResourcePersistence";
import type { Difficulty, GradeId, TeacherTopicOption, TeachingResource } from "@/types";

const now = new Date("2026-06-20T12:00:00.000Z");

type TeacherOpsResourceSeedBoundaryModule = {
  normalizeTeacherOpsResourceCollections?: (
    collections: {
      teaching_resources?: Array<Record<string, unknown> & {
        id: string;
        title_en: string;
        title_zh: string;
        type: "slides" | "practice" | "quiz" | "worksheet" | "exam-paper" | "marking-scheme" | "image" | "document" | "other";
        file_name: string;
        file_type: string;
        grade: GradeId;
        uploaded_by: string;
        created_at: string;
      }>;
    },
    now: string,
    options: {
      demoTeacherId: string;
    }
  ) => {
    teaching_resources: Array<Record<string, unknown>>;
  };
  normalizeTeacherOpsResourceRecord?: <Record extends {
    mime_type?: string | null;
    file_size_bytes?: number | null;
    storage_path?: string | null;
  }>(
    resource: Record
  ) => Record & {
    mime_type: string;
    file_size_bytes: number;
    storage_path?: string;
  };
  teacherOpsSeedTeachingResourceRecords?: (
    now: string,
    options: {
      demoTeacherId: string;
    }
  ) => TeacherOpsResourcePersistenceDatabase["teaching_resources"];
};

function createDatabase(): TeacherOpsResourcePersistenceDatabase {
  return {
    teaching_resources: [
      {
        id: "resource-owned",
        title_en: "Owned worksheet",
        title_zh: "Owned worksheet",
        type: "worksheet",
        file_name: "owned.pdf",
        file_type: "PDF",
        mime_type: "application/pdf",
        file_size_bytes: 128,
        storage_path: "seed://owned",
        grade: "S2",
        uploaded_by: "teacher-1",
        created_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "resource-other",
        title_en: "Other worksheet",
        title_zh: "Other worksheet",
        type: "worksheet",
        file_name: "other.pdf",
        file_type: "PDF",
        mime_type: "application/pdf",
        file_size_bytes: 256,
        storage_path: "seed://other",
        grade: "S3",
        uploaded_by: "teacher-2",
        created_at: "2026-06-20T11:00:00.000Z"
      },
      {
        id: "resource-owned-old",
        title_en: "Owned archive",
        title_zh: "Owned archive",
        type: "document",
        file_name: "archive.pdf",
        file_type: "PDF",
        mime_type: "application/pdf",
        file_size_bytes: 512,
        storage_path: "seed://archive",
        grade: "S1",
        uploaded_by: "teacher-1",
        created_at: "2026-06-01T10:00:00.000Z"
      }
    ],
    topics: [
      {
        id: "topic-s2-later",
        grade: "S2",
        sort_order: 2,
        title_en: "Later S2 topic",
        title_zh: "Later S2 topic"
      },
      {
        id: "topic-s1",
        grade: "S1",
        sort_order: 1,
        title_en: "S1 topic",
        title_zh: "S1 topic"
      },
      {
        id: "topic-s2-earlier",
        grade: "S2",
        sort_order: 1,
        title_en: "Earlier S2 topic",
        title_zh: "Earlier S2 topic"
      },
      {
        id: "topic-hidden",
        grade: "S3",
        sort_order: 1,
        title_en: "Hidden topic",
        title_zh: "Hidden topic"
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

function referenceCountsFor(id: string) {
  if (id === "resource-owned") {
    return { assignments: 2, assessments: 1, classroom: 0 };
  }
  if (id === "resource-owned-old") {
    return { assignments: 1, assessments: 0, classroom: 0 };
  }
  return { assignments: 0, assessments: 3, classroom: 0 };
}

function resourceFixture(record: TeacherOpsResourcePersistenceDatabase["teaching_resources"][number]): TeachingResource {
  return {
    id: record.id,
    title: {
      en: record.title_en,
      zh: record.title_zh
    },
    type: record.type,
    fileName: record.file_name,
    fileType: record.file_type,
    mimeType: record.mime_type,
    fileSizeBytes: record.file_size_bytes,
    storagePath: record.storage_path,
    grade: record.grade,
    topicId: record.topic_id,
    difficulty: record.difficulty,
    uploadedBy: record.uploaded_by,
    createdAt: record.created_at,
    referenceCounts: referenceCountsFor(record.id)
  };
}

function topicOptionFixture(record: TeacherOpsResourcePersistenceDatabase["topics"][number]): TeacherTopicOption {
  return {
    id: record.id,
    grade: record.grade,
    title: {
      en: record.title_en,
      zh: record.title_zh
    }
  };
}

function createTestStore(
  database: TeacherOpsResourcePersistenceDatabase,
  storedFiles: Array<{
    storedFileName: string;
    bytes: number[];
  }> = []
) {
  return createTeacherOpsResourcePersistenceStore({
    now: () => now,
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    createId: () => "fixed",
    gradeIsValid: (grade) => new Set<GradeId>(["S1", "S2", "S3"]).has(grade),
    difficultyIsActive: (difficulty): difficulty is Difficulty => new Set<Difficulty>(["Low", "Medium", "High"]).has(difficulty as Difficulty),
    storeResourceFile: async ({ storedFileName, bytes }) => {
      storedFiles.push({ storedFileName, bytes: Array.from(bytes) });
      return `/uploads/${storedFileName}`;
    },
    resourceProjection: (_database, resource) => resourceFixture(resource),
    topicMatchesUserCurriculum: (_database, topic) => topic.id !== "topic-hidden",
    topicOptionProjection: (_database, topic) => topicOptionFixture(topic)
  });
}

test("teacher ops resource persistence returns owned downloads without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsResourcePersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const download = await createTestStore(createDatabase()).getTeacherResourceDownloadData("teacher-1", "resource-owned");

  assert.equal(download?.resource.id, "resource-owned");
  assert.match(Buffer.from(download?.bytes ?? []).toString("utf8"), /Seed resource placeholder/);
  assert.equal(download?.mimeType, "text/plain; charset=utf-8");
  assert.equal(download?.fileName, "owned.txt");
});

test("teacher ops resource persistence keeps downloads scoped to admins and resource uploaders", async () => {
  const store = createTestStore(createDatabase());

  assert.equal(await store.getTeacherResourceDownloadData("teacher-1", "resource-other"), null);
  assert.equal((await store.getTeacherResourceDownloadData("admin-1", "resource-other"))?.resource.id, "resource-other");
  assert.equal(await store.getTeacherResourceDownloadData("student-1", "resource-owned"), null);
  assert.equal(await store.getTeacherResourceDownloadData("teacher-1", "missing-resource"), null);
});

test("teacher ops resource persistence builds scoped resource library data", async () => {
  const store = createTestStore(createDatabase());

  const data = await store.getTeacherResourceLibraryData("teacher-1");

  assert.equal(data?.generatedAt, "2026-06-20T12:00:00.000Z");
  assert.deepEqual(data?.resources.map((resource) => resource.id), ["resource-owned", "resource-owned-old"]);
  assert.deepEqual(data?.topicOptions.map((topic) => topic.id), ["topic-s1", "topic-s2-earlier", "topic-s2-later"]);
  assert.deepEqual(data?.totals, {
    resources: 2,
    uploadedThisWeek: 1,
    assignmentReferences: 3,
    assessmentReferences: 1
  });

  const adminData = await store.getTeacherResourceLibraryData("admin-1");
  assert.deepEqual(adminData?.resources.map((resource) => resource.id), [
    "resource-other",
    "resource-owned",
    "resource-owned-old"
  ]);
  assert.equal(adminData?.totals.assignmentReferences, 3);
  assert.equal(adminData?.totals.assessmentReferences, 4);
  assert.equal(await store.getTeacherResourceLibraryData("student-1"), null);
});

test("teacher ops resource persistence owns resource record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsResourcePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsResourcePersistence") as TeacherOpsResourceSeedBoundaryModule;

  assert.equal(typeof module.normalizeTeacherOpsResourceRecord, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsResourceRecord\b/);
  assert.doesNotMatch(persistenceSource, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(persistenceSource, /from ["']@\/lib\/server\/userStore["']/);
  assert.doesNotMatch(rootSource, /normalizeTeacherOpsResourceRecord as normalizeTeachingResourceRecordFromTeacherOpsResource/);
  assert.doesNotMatch(rootSource, /mime_type: resource\.mime_type \?\? ""/);
  assert.doesNotMatch(rootSource, /file_size_bytes: resource\.file_size_bytes \?\? 0/);

  assert.deepEqual(module.normalizeTeacherOpsResourceRecord?.({
    id: "resource-missing",
    mime_type: null,
    file_size_bytes: null,
    storage_path: null
  }), {
    id: "resource-missing",
    mime_type: "",
    file_size_bytes: 0,
    storage_path: undefined
  });
  assert.deepEqual(module.normalizeTeacherOpsResourceRecord?.({
    id: "resource-present",
    mime_type: "application/pdf",
    file_size_bytes: 128,
    storage_path: "seed://present"
  }), {
    id: "resource-present",
    mime_type: "application/pdf",
    file_size_bytes: 128,
    storage_path: "seed://present"
  });
});

test("teacher resource ownership helpers live in resource persistence, not root userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsResourcePersistence") as Record<string, unknown>;

  assert.equal(typeof helpers.teacherResourceRecordsFor, "function");
  assert.equal(typeof helpers.safeUploadFileName, "function");
  assert.equal(typeof helpers.teacherOpsResourceIsWithinDays, "function");

  const teacherResourceRecordsFor = helpers.teacherResourceRecordsFor as (
    database: TeacherOpsResourcePersistenceDatabase,
    user: { id: string; role: "teacher" | "admin" }
  ) => TeacherOpsResourcePersistenceDatabase["teaching_resources"];
  const safeUploadFileName = helpers.safeUploadFileName as (fileName: string) => string;
  const teacherOpsResourceIsWithinDays = helpers.teacherOpsResourceIsWithinDays as (
    value: string | null | undefined,
    nowMs: number,
    days: number
  ) => boolean;
  const database = createDatabase();

  assert.deepEqual(
    teacherResourceRecordsFor(database, { id: "teacher-1", role: "teacher" }).map((resource) => resource.id),
    ["resource-owned", "resource-owned-old"]
  );
  assert.deepEqual(
    teacherResourceRecordsFor(database, { id: "admin-1", role: "admin" }).map((resource) => resource.id),
    ["resource-owned", "resource-other", "resource-owned-old"]
  );
  assert.equal(safeUploadFileName("../My File!.jpeg"), "My_File_.jpeg");
  assert.equal(safeUploadFileName(""), "resource-upload");
  assert.equal(teacherOpsResourceIsWithinDays("2026-06-20T10:00:00.000Z", now.getTime(), 7), true);
  assert.equal(teacherOpsResourceIsWithinDays("2026-06-01T10:00:00.000Z", now.getTime(), 7), false);
  assert.equal(teacherOpsResourceIsWithinDays("not-a-date", now.getTime(), 7), false);

  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  assert.doesNotMatch(rootSource, /function teacherResourceRecordsFor\(/);
  assert.doesNotMatch(rootSource, /function safeUploadFileName\(/);
  assert.doesNotMatch(rootSource, /function isWithinDays\(/);
  assert.doesNotMatch(rootSource, /teacherOpsResourceIsWithinDays as isWithinDaysFromTeacherOpsResource/);
  assert.match(rootSource, /safeUploadFileName as safeUploadFileNameFromTeacherOpsResource/);
  assert.match(rootSource, /safeExportFileName: safeUploadFileNameFromTeacherOpsResource/);
});

test("teacher ops resource persistence owns resource download payload for legacy userStore", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsResourcePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsResourcePersistence") as Record<string, unknown>;
  const teacherOpsResourceDownloadPayload = helpers.teacherOpsResourceDownloadPayload as (
    database: TeacherOpsResourcePersistenceDatabase,
    resource: TeacherOpsResourcePersistenceDatabase["teaching_resources"][number],
    resourceProjection: (
      database: TeacherOpsResourcePersistenceDatabase,
      resource: TeacherOpsResourcePersistenceDatabase["teaching_resources"][number]
    ) => TeachingResource
  ) => Promise<{
    resource: TeachingResource;
    bytes: Uint8Array;
    mimeType: string;
    fileName: string;
  } | null>;

  assert.equal(typeof helpers.teacherOpsResourceDownloadPayload, "function");
  assert.match(source, /export async function teacherOpsResourceDownloadPayload\b/);
  assert.doesNotMatch(rootSource, /async function resourceDownloadPayload\b/);
  assert.doesNotMatch(rootSource, /resourceDownloadPayload: \(database, resource\) => resourceDownloadPayload/);

  const database = createDatabase();
  const seedPayload = await teacherOpsResourceDownloadPayload(
    database,
    database.teaching_resources[0],
    (_database, resource) => resourceFixture(resource)
  );
  assert.equal(seedPayload?.resource.id, "resource-owned");
  assert.equal(seedPayload?.mimeType, "text/plain; charset=utf-8");
  assert.equal(seedPayload?.fileName, "owned.txt");
  assert.match(Buffer.from(seedPayload?.bytes ?? []).toString("utf8"), /Seed resource placeholder/);

  const uploadDir = await mkdtemp(path.join(tmpdir(), "mais-resource-download-"));
  const uploadPath = path.join(uploadDir, "packet.pdf");
  await writeFile(uploadPath, Buffer.from([10, 20, 30]));
  const realResource = {
    ...database.teaching_resources[0],
    id: "resource-real",
    file_name: "packet.pdf",
    mime_type: "",
    storage_path: uploadPath
  };

  const realPayload = await teacherOpsResourceDownloadPayload(
    database,
    realResource,
    (_database, resource) => resourceFixture(resource)
  );
  assert.equal(realPayload?.resource.id, "resource-real");
  assert.deepEqual(Array.from(realPayload?.bytes ?? []), [10, 20, 30]);
  assert.equal(realPayload?.mimeType, "application/octet-stream");
  assert.equal(realPayload?.fileName, "packet.pdf");

  assert.equal(await teacherOpsResourceDownloadPayload(
    database,
    { ...realResource, storage_path: path.join(uploadDir, "missing.pdf") },
    (_database, resource) => resourceFixture(resource)
  ), null);
  assert.equal(await teacherOpsResourceDownloadPayload(
    database,
    { ...realResource, storage_path: undefined },
    (_database, resource) => resourceFixture(resource)
  ), null);
});

test("teacher ops resource persistence owns teaching resource projection for legacy userStore", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsResourcePersistence") as Record<string, unknown>;
  const toTeacherOpsTeachingResource = helpers.toTeacherOpsTeachingResource as (
    database: TeacherOpsResourcePersistenceDatabase,
    resource: TeacherOpsResourcePersistenceDatabase["teaching_resources"][number]
  ) => TeachingResource;
  const teacherOpsResourceReferenceCounts = helpers.teacherOpsResourceReferenceCounts as (
    database: TeacherOpsResourcePersistenceDatabase,
    resourceId: string
  ) => TeachingResource["referenceCounts"];
  const database: TeacherOpsResourcePersistenceDatabase = {
    ...createDatabase(),
    assignments: [
      { content_type: "resource", target_id: "resource-owned" },
      { content_type: "resource", target_id: "resource-owned" },
      { content_type: "lesson", target_id: "resource-owned" }
    ],
    assessments: [
      { source_resource_id: "resource-owned" },
      { source_resource_id: "resource-other" }
    ]
  };

  assert.equal(typeof helpers.toTeacherOpsTeachingResource, "function");
  assert.equal(typeof helpers.teacherOpsResourceReferenceCounts, "function");
  assert.deepEqual(teacherOpsResourceReferenceCounts(database, "resource-owned"), {
    assignments: 2,
    assessments: 1,
    classroom: 0
  });
  assert.deepEqual(toTeacherOpsTeachingResource(database, database.teaching_resources[0]), {
    ...resourceFixture(database.teaching_resources[0]),
    referenceCounts: {
      assignments: 2,
      assessments: 1,
      classroom: 0
    }
  });
  assert.doesNotMatch(rootSource, /function teachingResourceReferenceCounts\(/);
  assert.doesNotMatch(rootSource, /function toTeachingResource\(/);
  assert.match(rootSource, /toTeacherOpsTeachingResource as toTeachingResourceFromTeacherOpsResource/);
});

test("teacher ops resource persistence owns seed teaching resource records for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsResourcePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsResourcePersistence") as TeacherOpsResourceSeedBoundaryModule;

  assert.equal(typeof module.teacherOpsSeedTeachingResourceRecords, "function");
  assert.match(persistenceSource, /export function teacherOpsSeedTeachingResourceRecords\b/);
  assert.match(rootSource, /teacherOpsSeedTeachingResourceRecords as seedTeachingResourcesFromTeacherOpsResource/);
  assert.doesNotMatch(rootSource, /function seedTeachingResources\b/);

  assert.deepEqual(module.teacherOpsSeedTeachingResourceRecords?.("2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-ms-chan"
  }), [
    {
      id: "resource-s3-quadratics-slides",
      title_en: "S3 Quadratics lesson slides",
      title_zh: "中三二次函數課件",
      type: "slides",
      file_name: "s3-quadratics-intro.pptx",
      file_type: "PPTX",
      mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      file_size_bytes: 2480000,
      storage_path: "seed://s3-quadratics-intro.pptx",
      grade: "S3",
      topic_id: "quadratic-functions",
      difficulty: "Medium",
      uploaded_by: "teacher-ms-chan",
      created_at: "2026-06-20T10:00:00.000Z"
    }
  ]);
});

test("teacher ops resource persistence owns teaching resource collection normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsResourcePersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const module = await import("@/lib/server/userStore/teacherOpsResourcePersistence") as TeacherOpsResourceSeedBoundaryModule;

  assert.equal(typeof module.normalizeTeacherOpsResourceCollections, "function");
  assert.match(persistenceSource, /export function normalizeTeacherOpsResourceCollections\b/);
  assert.match(rootSource, /normalizeTeacherOpsResourceCollections as normalizeTeachingResourceCollectionsFromTeacherOpsResource/);
  assert.doesNotMatch(rootSource, /\n    teaching_resources: mergeSeedRecordsPreservingExisting\(/);

  const normalized = module.normalizeTeacherOpsResourceCollections?.({
    teaching_resources: [
      {
        id: "resource-s3-quadratics-slides",
        title_en: "Legacy slides",
        title_zh: "Legacy slides",
        type: "slides",
        file_name: "legacy-slides.pptx",
        file_type: "PPTX",
        mime_type: null,
        file_size_bytes: null,
        storage_path: null,
        grade: "S3",
        topic_id: "legacy-topic",
        uploaded_by: "teacher-custom",
        created_at: "2026-06-19T10:00:00.000Z"
      },
      {
        id: "resource-custom",
        title_en: "Custom packet",
        title_zh: "Custom packet",
        type: "document",
        file_name: "packet.pdf",
        file_type: "PDF",
        mime_type: "application/pdf",
        file_size_bytes: 128,
        storage_path: "seed://packet.pdf",
        grade: "S2",
        uploaded_by: "teacher-custom",
        created_at: "2026-06-19T11:00:00.000Z"
      }
    ]
  }, "2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-hk"
  });

  assert.deepEqual(normalized?.teaching_resources.map((resource) => resource.id), [
    "resource-s3-quadratics-slides",
    "resource-custom"
  ]);
  assert.equal(normalized?.teaching_resources[0]?.title_en, "Legacy slides");
  assert.equal(normalized?.teaching_resources[0]?.mime_type, "");
  assert.equal(normalized?.teaching_resources[0]?.file_size_bytes, 0);
  assert.equal(normalized?.teaching_resources[0]?.storage_path, undefined);

  assert.deepEqual(module.normalizeTeacherOpsResourceCollections?.({
    teaching_resources: []
  }, "2026-06-20T10:00:00.000Z", {
    demoTeacherId: "teacher-hk"
  }), {
    teaching_resources: [
      {
        id: "resource-s3-quadratics-slides",
        title_en: "S3 Quadratics lesson slides",
        title_zh: "中三二次函數課件",
        type: "slides",
        file_name: "s3-quadratics-intro.pptx",
        file_type: "PPTX",
        mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        file_size_bytes: 2480000,
        storage_path: "seed://s3-quadratics-intro.pptx",
        grade: "S3",
        topic_id: "quadratic-functions",
        difficulty: "Medium",
        uploaded_by: "teacher-hk",
        created_at: "2026-06-20T10:00:00.000Z"
      }
    ]
  });
});

test("teacher ops resource persistence creates sanitized teacher uploads through injected storage", async () => {
  const database = createDatabase();
  const storedFiles: Array<{ storedFileName: string; bytes: number[] }> = [];
  const store = createTestStore(database, storedFiles);

  const created = await store.createTeacherResource({
    teacherId: "teacher-1",
    title: "  Unit 2 Graphs  ",
    grade: "S2",
    topicId: "topic-s2-earlier",
    difficulty: "Medium",
    type: null,
    file: {
      name: "My File!.jpeg",
      type: "image/jpeg",
      size: 2,
      bytes: new Uint8Array([7, 8])
    }
  });

  assert.equal(created.status, "created");
  assert.equal(created.resource.id, "resource-fixed");
  assert.equal(created.resource.title.en, "Unit 2 Graphs");
  assert.equal(created.resource.type, "image");
  assert.equal(created.resource.fileName, "My_File_.jpeg");
  assert.equal(created.resource.fileType, "JPG");
  assert.equal(created.resource.storagePath, "/uploads/resource-fixed-My_File_.jpeg");
  assert.equal(created.resource.topicId, "topic-s2-earlier");
  assert.equal(created.resource.difficulty, "Medium");
  assert.deepEqual(storedFiles, [{ storedFileName: "resource-fixed-My_File_.jpeg", bytes: [7, 8] }]);
  assert.equal(database.teaching_resources[0]?.id, "resource-fixed");
  assert.equal(database.teaching_resources[0]?.uploaded_by, "teacher-1");
});

test("teacher ops resource persistence rejects invalid or unauthorized uploads before storage", async () => {
  const database = createDatabase();
  const storedFiles: Array<{ storedFileName: string; bytes: number[] }> = [];
  const store = createTestStore(database, storedFiles);

  assert.deepEqual(
    await store.createTeacherResource({
      teacherId: "teacher-1",
      title: "   ",
      grade: "S2",
      file: { name: "valid.pdf", type: "application/pdf", size: 4, bytes: new Uint8Array([1]) }
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.createTeacherResource({
      teacherId: "teacher-1",
      title: "Bad grade",
      grade: "XX" as GradeId,
      file: { name: "valid.pdf", type: "application/pdf", size: 4, bytes: new Uint8Array([1]) }
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.createTeacherResource({
      teacherId: "teacher-1",
      title: "Bad extension",
      grade: "S2",
      file: { name: "malware.exe", type: "application/octet-stream", size: 4, bytes: new Uint8Array([1]) }
    }),
    { status: "invalid" }
  );
  assert.deepEqual(
    await store.createTeacherResource({
      teacherId: "student-1",
      title: "Forbidden",
      grade: "S2",
      file: { name: "valid.pdf", type: "application/pdf", size: 4, bytes: new Uint8Array([1]) }
    }),
    { status: "forbidden" }
  );
  assert.deepEqual(database.teaching_resources.map((resource) => resource.id), [
    "resource-owned",
    "resource-other",
    "resource-owned-old"
  ]);
  assert.deepEqual(storedFiles, []);
});

test("teacher ops resource persistence normalizes invalid upload metadata", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const created = await store.createTeacherResource({
    teacherId: "admin-1",
    title: "Review packet",
    grade: "S2",
    topicId: "topic-hidden",
    difficulty: "Legacy" as Difficulty,
    type: null,
    file: {
      name: "../packet.pdf",
      type: "application/pdf",
      size: 3,
      bytes: new Uint8Array([9, 9, 9])
    }
  });

  assert.equal(created.status, "created");
  assert.equal(created.resource.type, "exam-paper");
  assert.equal(created.resource.fileName, "packet.pdf");
  assert.equal(created.resource.topicId, undefined);
  assert.equal(created.resource.difficulty, undefined);
  assert.equal(created.resource.uploadedBy, "admin-1");
});

test("legacy userStore delegates teacher resource operations to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const getTeacherResourceLibraryData = teacherOpsUserStore\.getTeacherResourceLibraryData/);
  assert.match(source, /export const createTeacherResource = teacherOpsUserStore\.createTeacherResource/);
  assert.match(source, /export const getTeacherResourceDownloadData = teacherOpsUserStore\.getTeacherResourceDownloadData/);
  assert.doesNotMatch(source, /export async function getTeacherResourceLibraryData\(/);
  assert.doesNotMatch(source, /export async function createTeacherResource\(/);
  assert.doesNotMatch(source, /export async function getTeacherResourceDownloadData\(/);
});
