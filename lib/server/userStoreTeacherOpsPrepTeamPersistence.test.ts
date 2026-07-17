import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createTeacherOpsPrepTeamPersistenceStore,
  type TeacherOpsPrepTeamPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsPrepTeamPersistence";
import type { GradeId, PrepTeam, PrepTeamShare, PrepTeamShareKind } from "@/types";

function createDatabase(): TeacherOpsPrepTeamPersistenceDatabase {
  return {
    prep_teams: [
      {
        id: "team-existing",
        school_id: "school-a",
        name_en: "Existing Team",
        name_zh: "Existing Team",
        description_en: "Existing description",
        description_zh: "Existing description",
        grade: "S3",
        teacher_ids: ["teacher-1"],
        created_by: "teacher-1",
        created_at: "2026-06-20T08:00:00.000Z",
        updated_at: "2026-06-20T08:00:00.000Z"
      }
    ],
    prep_team_shares: [
      {
        id: "share-old",
        prep_team_id: "team-existing",
        kind: "note",
        title_en: "Earlier note",
        title_zh: "Earlier note",
        created_by: "teacher-1",
        created_at: "2026-06-20T08:30:00.000Z"
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher", username: "Tess", school_id: "school-a" },
      { id: "teacher-2", role: "teacher", username: "Mo", school_id: "school-a" },
      { id: "teacher-other", role: "teacher", username: "Other", school_id: "school-b" },
      { id: "admin-1", role: "admin", username: "Admin", school_id: "school-a" },
      { id: "admin-global", role: "admin", username: "Global Admin" },
      { id: "student-1", role: "student", username: "Ada", school_id: "school-a" }
    ]
  };
}

function createTestStore(database: TeacherOpsPrepTeamPersistenceDatabase) {
  return createTeacherOpsPrepTeamPersistenceStore({
    createId: (kind) => kind === "share" ? "share-new" : "team-new",
    now: () => new Date("2026-06-21T08:00:00.000Z"),
    mutateDatabase: async (mutator) => mutator(database),
    gradeIsValid: (grade) => new Set<GradeId>(["S3", "S4"]).has(grade),
    teacherDisplayName: (db, teacherId) => db.users.find((candidate) => candidate.id === teacherId)?.username ?? "Teacher"
  });
}

test("teacher ops prep-team persistence creates school-scoped teams without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsPrepTeamPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const result = await createTestStore(database).createPrepTeam({
    teacherId: "teacher-1",
    name: "  Algebra PLC  ",
    description: "  Shared planning  ",
    grade: "S3",
    teacherIds: ["teacher-2", "teacher-other", "admin-1", "student-1", "teacher-1"]
  });

  assert.equal(result.status, "created");
  assert.deepEqual(result.team, {
    id: "prep-team-team-new",
    schoolId: "school-a",
    name: { en: "Algebra PLC", zh: "Algebra PLC" },
    description: { en: "Shared planning", zh: "Shared planning" },
    grade: "S3",
    teacherIds: ["teacher-1", "teacher-2", "admin-1"],
    members: [
      { teacherId: "teacher-1", teacherName: "Tess" },
      { teacherId: "teacher-2", teacherName: "Mo" },
      { teacherId: "admin-1", teacherName: "Admin" }
    ],
    shares: [],
    createdBy: "teacher-1",
    createdAt: "2026-06-21T08:00:00.000Z",
    updatedAt: "2026-06-21T08:00:00.000Z"
  });
  assert.equal(database.prep_teams[0]?.id, "prep-team-team-new");
});

test("teacher ops prep-team persistence creates shares and returns sorted team projections", async () => {
  const database = createDatabase();
  const result = await createTestStore(database).createPrepTeamShare({
    teacherId: "teacher-1",
    prepTeamId: "team-existing",
    kind: "resource",
    title: "  Fractions worksheet  ",
    targetId: "resource-1"
  });

  assert.equal(result.status, "created");
  assert.deepEqual(result.share, {
    id: "prep-team-share-share-new",
    prepTeamId: "team-existing",
    kind: "resource",
    title: { en: "Fractions worksheet", zh: "Fractions worksheet" },
    targetId: "resource-1",
    createdBy: "teacher-1",
    createdByName: "Tess",
    createdAt: "2026-06-21T08:00:00.000Z"
  });
  assert.equal(result.team.updatedAt, "2026-06-21T08:00:00.000Z");
  assert.deepEqual(result.team.shares.map((share) => share.id), ["prep-team-share-share-new", "share-old"]);
  assert.equal(database.prep_team_shares[0]?.id, "prep-team-share-share-new");
  assert.equal(database.prep_teams[0]?.updated_at, "2026-06-21T08:00:00.000Z");
});

test("teacher ops prep-team persistence rejects invalid, forbidden, and unavailable requests", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.createPrepTeam({
    teacherId: "teacher-1",
    name: " ",
    grade: "S3"
  }), { status: "invalid" });
  assert.deepEqual(await store.createPrepTeam({
    teacherId: "teacher-1",
    name: "Team",
    grade: "bad-grade" as GradeId
  }), { status: "invalid" });
  assert.deepEqual(await store.createPrepTeam({
    teacherId: "student-1",
    name: "Team",
    grade: "S3"
  }), { status: "forbidden" });
  assert.deepEqual(await store.createPrepTeamShare({
    teacherId: "teacher-1",
    prepTeamId: "team-existing",
    kind: "resource",
    title: " "
  }), { status: "invalid" });
  assert.deepEqual(await store.createPrepTeamShare({
    teacherId: "teacher-1",
    prepTeamId: "team-existing",
    kind: "bad-kind" as PrepTeamShareKind,
    title: "Resource"
  }), { status: "invalid" });
  assert.deepEqual(await store.createPrepTeamShare({
    teacherId: "student-1",
    prepTeamId: "team-existing",
    kind: "resource",
    title: "Resource"
  }), { status: "forbidden" });
  assert.deepEqual(await store.createPrepTeamShare({
    teacherId: "teacher-other",
    prepTeamId: "team-existing",
    kind: "resource",
    title: "Resource"
  }), { status: "not-found" });
});

test("teacher ops prep-team persistence owns prep-team projection helpers for legacy userStore", async () => {
  const prepTeamExports = await import("@/lib/server/userStore/teacherOpsPrepTeamPersistence") as Record<string, unknown>;
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsPrepTeamPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const toTeacherOpsPrepTeamShare = prepTeamExports.toTeacherOpsPrepTeamShare as (input: {
    database: TeacherOpsPrepTeamPersistenceDatabase;
    record: TeacherOpsPrepTeamPersistenceDatabase["prep_team_shares"][number];
    teacherDisplayName: (database: TeacherOpsPrepTeamPersistenceDatabase, teacherId: string) => string;
  }) => PrepTeamShare;
  const toTeacherOpsPrepTeam = prepTeamExports.toTeacherOpsPrepTeam as (input: {
    database: TeacherOpsPrepTeamPersistenceDatabase;
    record: TeacherOpsPrepTeamPersistenceDatabase["prep_teams"][number];
    teacherDisplayName: (database: TeacherOpsPrepTeamPersistenceDatabase, teacherId: string) => string;
  }) => PrepTeam;
  const database = createDatabase();
  database.prep_team_shares.push({
    id: "share-newer",
    prep_team_id: "team-existing",
    kind: "resource",
    title_en: "Newer resource",
    title_zh: "Newer resource",
    target_id: "resource-2",
    created_by: "teacher-2",
    created_at: "2026-06-21T08:30:00.000Z"
  });
  database.prep_teams[0].teacher_ids = ["teacher-1", "teacher-2", "missing-teacher"];
  const teacherDisplayName = (db: TeacherOpsPrepTeamPersistenceDatabase, teacherId: string) =>
    db.users.find((candidate) => candidate.id === teacherId)?.username ?? "Teacher";

  for (const name of ["toTeacherOpsPrepTeamShare", "toTeacherOpsPrepTeam"]) {
    assert.equal(typeof prepTeamExports[name], "function", `${name} should be exported by teacherOpsPrepTeamPersistence`);
    assert.match(helperSource, new RegExp(`export function ${name}\\b`));
  }

  assert.deepEqual(toTeacherOpsPrepTeamShare({
    database,
    record: database.prep_team_shares[1],
    teacherDisplayName
  }), {
    id: "share-newer",
    prepTeamId: "team-existing",
    kind: "resource",
    title: {
      en: "Newer resource",
      zh: "Newer resource"
    },
    targetId: "resource-2",
    createdBy: "teacher-2",
    createdByName: "Mo",
    createdAt: "2026-06-21T08:30:00.000Z"
  });
  assert.deepEqual(toTeacherOpsPrepTeam({
    database,
    record: database.prep_teams[0],
    teacherDisplayName
  }), {
    id: "team-existing",
    schoolId: "school-a",
    name: {
      en: "Existing Team",
      zh: "Existing Team"
    },
    description: {
      en: "Existing description",
      zh: "Existing description"
    },
    grade: "S3",
    teacherIds: ["teacher-1", "teacher-2", "missing-teacher"],
    members: [
      { teacherId: "teacher-1", teacherName: "Tess" },
      { teacherId: "teacher-2", teacherName: "Mo" },
      { teacherId: "missing-teacher", teacherName: "Teacher" }
    ],
    shares: [
      {
        id: "share-newer",
        prepTeamId: "team-existing",
        kind: "resource",
        title: {
          en: "Newer resource",
          zh: "Newer resource"
        },
        targetId: "resource-2",
        createdBy: "teacher-2",
        createdByName: "Mo",
        createdAt: "2026-06-21T08:30:00.000Z"
      },
      {
        id: "share-old",
        prepTeamId: "team-existing",
        kind: "note",
        title: {
          en: "Earlier note",
          zh: "Earlier note"
        },
        targetId: undefined,
        createdBy: "teacher-1",
        createdByName: "Tess",
        createdAt: "2026-06-20T08:30:00.000Z"
      }
    ],
    createdBy: "teacher-1",
    createdAt: "2026-06-20T08:00:00.000Z",
    updatedAt: "2026-06-20T08:00:00.000Z"
  });
  assert.match(rootSource, /toTeacherOpsPrepTeam as toPrepTeamFromTeacherOpsPrepTeam/);
  assert.doesNotMatch(rootSource, /function toPrepTeamShare\(/);
  assert.doesNotMatch(rootSource, /function toPrepTeam\(/);
});

test("legacy userStore delegates prep-team operations to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const createPrepTeam = teacherOpsUserStore\.createPrepTeam/);
  assert.match(source, /export const createPrepTeamShare = teacherOpsUserStore\.createPrepTeamShare/);
  assert.doesNotMatch(source, /export async function createPrepTeam/);
  assert.doesNotMatch(source, /export async function createPrepTeamShare/);
});
