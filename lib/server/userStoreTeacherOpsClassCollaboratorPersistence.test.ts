import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsClassCollaboratorPersistenceStore,
  type TeacherOpsClassCollaboratorPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsClassCollaboratorPersistence";
import type { TeacherClassCollaborator, TeacherClassCollaboratorRole } from "@/types";

function createDatabase(): TeacherOpsClassCollaboratorPersistenceDatabase {
  return {
    school_memberships: [
      {
        id: "membership-admin",
        school_id: "school-a",
        user_id: "teacher-admin-member",
        role: "admin",
        class_id: "class-owned",
        created_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    teacher_class_collaborators: [
      {
        id: "collaborator-existing",
        class_id: "class-owned",
        teacher_id: "teacher-3",
        role: "viewer",
        status: "revoked",
        invited_by: "teacher-1",
        created_at: "2026-06-20T08:00:00.000Z",
        updated_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1",
        name: "S3A",
        school_id: "school-a",
        created_at: "2026-06-19T08:00:00.000Z",
        updated_at: "2026-06-20T08:00:00.000Z"
      },
      {
        id: "class-other",
        teacher_id: "teacher-other",
        name: "S3B",
        school_id: "school-b",
        created_at: "2026-06-19T09:00:00.000Z",
        updated_at: "2026-06-20T09:00:00.000Z"
      }
    ],
    users: [
      {
        id: "teacher-1",
        role: "teacher",
        username: "Tess",
        normalized_username: "tess",
        normalized_email: "tess@example.com",
        school_id: "school-a"
      },
      {
        id: "teacher-2",
        role: "teacher",
        username: "Mo",
        normalized_username: "mo",
        normalized_email: "mo@example.com",
        school_id: "school-a"
      },
      {
        id: "teacher-3",
        role: "teacher",
        username: "Rae",
        normalized_username: "rae",
        normalized_email: "rae@example.com",
        school_id: "school-a"
      },
      {
        id: "teacher-admin-member",
        role: "teacher",
        username: "Admin Member",
        normalized_username: "admin-member",
        normalized_email: "admin-member@example.com",
        school_id: "school-a"
      },
      {
        id: "teacher-other",
        role: "teacher",
        username: "Other",
        normalized_username: "other",
        normalized_email: "other@example.com",
        school_id: "school-b"
      },
      {
        id: "admin-1",
        role: "admin",
        username: "Admin",
        normalized_username: "admin",
        normalized_email: "admin@example.com",
        school_id: "school-a"
      },
      {
        id: "student-1",
        role: "student",
        username: "Ada",
        normalized_username: "ada",
        normalized_email: "ada@example.com",
        school_id: "school-a"
      }
    ]
  };
}

function createTestStore(database: TeacherOpsClassCollaboratorPersistenceDatabase) {
  return createTeacherOpsClassCollaboratorPersistenceStore({
    createId: (kind) => kind === "membership" ? "membership-new" : "collaborator-new",
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    mutateDatabase: async (mutator) => mutator(database),
    teacherDisplayName: (db, teacherId) => db.users.find((candidate) => candidate.id === teacherId)?.username ?? "Teacher"
  });
}

test("teacher ops class collaborator persistence creates co-teachers without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassCollaboratorPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const result = await createTestStore(database).upsertTeacherClassCollaborator({
    teacherId: "teacher-1",
    classId: "class-owned",
    teacherUsername: "  MO@EXAMPLE.COM  ",
    role: "co-teacher"
  });

  assert.equal(result.status, "saved");
  assert.deepEqual(result.collaborator, {
    id: "class-collaborator-collaborator-new",
    classId: "class-owned",
    teacherId: "teacher-2",
    teacherName: "Mo",
    teacherUsername: "Mo",
    role: "co-teacher",
    status: "active",
    invitedBy: "teacher-1",
    createdAt: "2026-06-21T08:00:00.000Z",
    updatedAt: "2026-06-21T08:00:00.000Z"
  });
  assert.deepEqual(database.school_memberships.at(-1), {
    id: "school-membership-membership-new",
    school_id: "school-a",
    user_id: "teacher-2",
    role: "teacher",
    class_id: "class-owned",
    created_at: "2026-06-21T08:00:00.000Z"
  });
});

test("teacher ops class collaborator persistence updates existing collaborators", async () => {
  const database = createDatabase();
  const result = await createTestStore(database).upsertTeacherClassCollaborator({
    teacherId: "teacher-admin-member",
    classId: "class-owned",
    teacherUsername: "rae",
    role: "co-teacher"
  });

  assert.equal(result.status, "saved");
  assert.equal(result.collaborator.id, "collaborator-existing");
  assert.equal(result.collaborator.role, "co-teacher");
  assert.equal(result.collaborator.status, "active");
  assert.equal(result.collaborator.invitedBy, "teacher-1");
  assert.equal(result.collaborator.createdAt, "2026-06-20T08:00:00.000Z");
  assert.equal(result.collaborator.updatedAt, "2026-06-21T08:00:00.000Z");
  assert.equal(database.teacher_class_collaborators.length, 1);
});

test("teacher ops class collaborator persistence rejects invalid and unavailable requests", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.upsertTeacherClassCollaborator({
    teacherId: "teacher-1",
    classId: "class-owned",
    teacherUsername: " ",
    role: "co-teacher"
  }), { status: "invalid" });
  assert.deepEqual(await store.upsertTeacherClassCollaborator({
    teacherId: "teacher-1",
    classId: "class-owned",
    teacherUsername: "mo",
    role: "owner" as Exclude<TeacherClassCollaboratorRole, "owner">
  }), { status: "invalid" });
  assert.deepEqual(await store.upsertTeacherClassCollaborator({
    teacherId: "student-1",
    classId: "class-owned",
    teacherUsername: "mo",
    role: "co-teacher"
  }), { status: "forbidden" });
  assert.deepEqual(await store.upsertTeacherClassCollaborator({
    teacherId: "teacher-2",
    classId: "class-owned",
    teacherUsername: "mo",
    role: "co-teacher"
  }), { status: "forbidden" });
  assert.deepEqual(await store.upsertTeacherClassCollaborator({
    teacherId: "teacher-1",
    classId: "class-owned",
    teacherUsername: "missing",
    role: "co-teacher"
  }), { status: "teacher-not-found" });
  assert.deepEqual(await store.upsertTeacherClassCollaborator({
    teacherId: "teacher-1",
    classId: "class-owned",
    teacherUsername: "tess",
    role: "co-teacher"
  }), { status: "owner" });
  assert.deepEqual(await store.upsertTeacherClassCollaborator({
    teacherId: "teacher-1",
    classId: "class-owned",
    teacherUsername: "other",
    role: "co-teacher"
  }), { status: "school-mismatch" });
});

test("teacher ops class collaborator persistence owns collaborator projection helpers for legacy userStore", async () => {
  const collaborators = await import("@/lib/server/userStore/teacherOpsClassCollaboratorPersistence") as Record<string, unknown>;
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsClassCollaboratorPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const toTeacherOpsClassCollaborator = collaborators.toTeacherOpsClassCollaborator as (input: {
    database: TeacherOpsClassCollaboratorPersistenceDatabase;
    record: TeacherOpsClassCollaboratorPersistenceDatabase["teacher_class_collaborators"][number];
    teacherDisplayName: (database: TeacherOpsClassCollaboratorPersistenceDatabase, teacherId: string) => string;
  }) => TeacherClassCollaborator;
  const ownerTeacherOpsClassCollaboratorForClass = collaborators.ownerTeacherOpsClassCollaboratorForClass as (input: {
    database: TeacherOpsClassCollaboratorPersistenceDatabase;
    teacherClass: TeacherOpsClassCollaboratorPersistenceDatabase["teacher_classes"][number];
    teacherDisplayName: (database: TeacherOpsClassCollaboratorPersistenceDatabase, teacherId: string) => string;
  }) => TeacherClassCollaborator;
  const teacherOpsClassCollaboratorsForClass = collaborators.teacherOpsClassCollaboratorsForClass as (input: {
    database: TeacherOpsClassCollaboratorPersistenceDatabase;
    teacherClass: TeacherOpsClassCollaboratorPersistenceDatabase["teacher_classes"][number];
    teacherDisplayName: (database: TeacherOpsClassCollaboratorPersistenceDatabase, teacherId: string) => string;
  }) => TeacherClassCollaborator[];
  const database = createDatabase();
  database.teacher_class_collaborators.push({
    id: "collaborator-earlier",
    class_id: "class-owned",
    teacher_id: "teacher-2",
    role: "co-teacher",
    status: "active",
    invited_by: "teacher-1",
    created_at: "2026-06-19T08:00:00.000Z",
    updated_at: "2026-06-19T08:00:00.000Z"
  });
  const teacherDisplayName = (db: TeacherOpsClassCollaboratorPersistenceDatabase, teacherId: string) =>
    db.users.find((candidate) => candidate.id === teacherId)?.username ?? "Teacher";

  for (const name of [
    "toTeacherOpsClassCollaborator",
    "ownerTeacherOpsClassCollaboratorForClass",
    "teacherOpsClassCollaboratorsForClass"
  ]) {
    assert.equal(typeof collaborators[name], "function", `${name} should be exported by teacherOpsClassCollaboratorPersistence`);
    assert.match(helperSource, new RegExp(`export function ${name}\\b`));
  }

  assert.deepEqual(toTeacherOpsClassCollaborator({
    database,
    record: database.teacher_class_collaborators[0],
    teacherDisplayName
  }), {
    id: "collaborator-existing",
    classId: "class-owned",
    teacherId: "teacher-3",
    teacherName: "Rae",
    teacherUsername: "Rae",
    role: "viewer",
    status: "revoked",
    invitedBy: "teacher-1",
    createdAt: "2026-06-20T08:00:00.000Z",
    updatedAt: "2026-06-20T08:00:00.000Z"
  });
  assert.deepEqual(ownerTeacherOpsClassCollaboratorForClass({
    database,
    teacherClass: database.teacher_classes[0],
    teacherDisplayName
  }), {
    id: "owner-class-owned",
    classId: "class-owned",
    teacherId: "teacher-1",
    teacherName: "Tess",
    teacherUsername: "Tess",
    role: "owner",
    status: "active",
    invitedBy: "teacher-1",
    createdAt: "2026-06-19T08:00:00.000Z",
    updatedAt: "2026-06-20T08:00:00.000Z"
  });
  assert.deepEqual(teacherOpsClassCollaboratorsForClass({
    database,
    teacherClass: database.teacher_classes[0],
    teacherDisplayName
  }).map((collaborator) => collaborator.id), [
    "owner-class-owned",
    "collaborator-earlier",
    "collaborator-existing"
  ]);
  assert.match(rootSource, /teacherOpsClassCollaboratorsForClass as collaboratorsForClassFromTeacherOpsClassCollaborator/);
  assert.doesNotMatch(rootSource, /function toTeacherClassCollaborator\(/);
  assert.doesNotMatch(rootSource, /function ownerCollaboratorForClass\(/);
  assert.doesNotMatch(rootSource, /function collaboratorsForClass\(/);
});

test("legacy userStore delegates class collaborator operations to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const upsertTeacherClassCollaborator = teacherOpsUserStore\.upsertTeacherClassCollaborator/);
  assert.doesNotMatch(source, /export async function upsertTeacherClassCollaborator/);
});
