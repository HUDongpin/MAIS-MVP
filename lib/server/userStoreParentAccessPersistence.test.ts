import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createParentAccessPersistenceStore,
  type ParentAccessPersistenceDatabase
} from "@/lib/server/userStore/parentAccessPersistence";

function createTestStore(database: ParentAccessPersistenceDatabase) {
  const ids = ["guardian-link-new"];

  return createParentAccessPersistenceStore({
    createId: () => ids.shift() ?? "guardian-link-fallback",
    now: () => new Date("2026-06-20T10:00:00.000Z"),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

test("parent access persistence checks active guardian links without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/parentAccessPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const store = createTestStore({
    guardian_links: [
      {
        parent_id: "parent-1",
        student_id: "student-1",
        status: "active"
      },
      {
        parent_id: "parent-1",
        student_id: "student-2",
        status: "pending"
      }
    ],
    users: [
      { id: "parent-1", role: "parent" },
      { id: "student-1", role: "student" },
      { id: "student-2", role: "student" }
    ]
  });

  assert.equal(await store.parentCanAccessStudent("parent-1", "student-1"), true);
  assert.equal(await store.parentCanAccessStudent("parent-1", "student-2"), false);
  assert.equal(await store.parentCanAccessStudent("parent-unknown", "student-1"), false);
});

test("parent access persistence lets admins access existing student records only", async () => {
  const store = createTestStore({
    guardian_links: [],
    users: [
      { id: "admin-1", role: "admin" },
      { id: "teacher-1", role: "teacher" },
      { id: "student-1", role: "student" }
    ]
  });

  assert.equal(await store.parentCanAccessStudent("admin-1", "student-1"), true);
  assert.equal(await store.parentCanAccessStudent("admin-1", "teacher-1"), false);
  assert.equal(await store.parentCanAccessStudent("admin-1", "missing-student"), false);
});

test("parent access persistence never treats legacy profile or link plaintext as an invitation", async () => {
  const database: ParentAccessPersistenceDatabase = {
    guardian_links: [
      {
        id: "guardian-link-existing",
        parent_id: "parent-1",
        student_id: "student-2",
        relationship: "mother",
        status: "revoked",
        invite_code: "MAIS-OLD",
        created_by: "teacher-1",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z"
      }
    ],
    student_profiles: [
      {
        user_id: "parent-1",
        name: "Pat Parent",
        grade: "S3"
      },
      {
        user_id: "student-1",
        name: "Ada Student",
        grade: "S3",
        parent_invite_code: "MAIS-ABC"
      },
      {
        user_id: "student-2",
        name: "Ben Student",
        grade: "S3",
        parent_invite_code: "MAIS-OLD"
      }
    ],
    users: [
      { id: "parent-1", username: "pat", role: "parent" },
      { id: "student-1", username: "ada", role: "student" },
      { id: "student-2", username: "ben", role: "student" },
      { id: "teacher-1", username: "teacher", role: "teacher" }
    ]
  };
  const store = createTestStore(database);

  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    inviteCode: "MAIS-ABC",
    parentId: "parent-1",
    relationship: "father"
  }), { status: "invalid" });
  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    inviteCode: `MAIS-${"A".repeat(24)}`,
    parentId: "parent-1",
    relationship: "guardian"
  }), { status: "not-found" });
  assert.equal(database.guardian_links.length, 1);
  assert.equal(database.guardian_links[0]?.status, "revoked");
  assert.equal(database.guardian_links[0]?.invite_code, "");
  assert.equal(database.student_profiles?.find((profile) => profile.user_id === "student-1")?.parent_invite_code, "");
});

test("parent access persistence owns only normalized one-time guardian invitation helpers", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentAccessPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentAccessPersistence") as Record<string, unknown>;

  const normalizeParentInviteCode = helpers.normalizeParentInviteCode;
  const createGuardianInviteToken = helpers.createGuardianInviteToken;

  assert.equal(typeof normalizeParentInviteCode, "function");
  assert.equal(typeof createGuardianInviteToken, "function");
  assert.match(persistenceSource, /export function normalizeParentInviteCode\b/);
  assert.match(persistenceSource, /export function createGuardianInviteToken\b/);
  assert.doesNotMatch(rootSource, /function normalizeInviteCode\b/);
  assert.equal("createParentInviteCode" in helpers, false);
  assert.equal("uniqueParentInviteCode" in helpers, false);
  assert.equal("ensureParentInviteCodeInDatabase" in helpers, false);
  assert.doesNotMatch(rootSource, /ParentInviteCodeFromParentAccess/);

  assert.equal((normalizeParentInviteCode as (value: string) => string)(" mais abc "), "MAIS ABC");
  assert.match((createGuardianInviteToken as () => string)(), /^MAIS-[A-F0-9]{24}$/);
});

test("parent access persistence owns guardian link seed builder for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentAccessPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentAccessPersistence") as Record<string, unknown>;
  const parentAccessSeedGuardianLinks = helpers.parentAccessSeedGuardianLinks as (
    now: string,
    options: {
      shouldSeedDemoUser: () => boolean;
      demoParentId: string;
      demoUserId: string;
      demoTeacherId: string;
    }
  ) => ParentAccessPersistenceDatabase["guardian_links"];

  assert.equal(typeof parentAccessSeedGuardianLinks, "function");
  assert.match(persistenceSource, /export function parentAccessSeedGuardianLinks\b/);
  assert.match(rootSource, /parentAccessSeedGuardianLinks as seedGuardianLinksFromParentAccess/);
  assert.doesNotMatch(rootSource, /function seedGuardianLinks\b/);

  assert.deepEqual(parentAccessSeedGuardianLinks("2026-06-20T10:00:00.000Z", {
    shouldSeedDemoUser: () => false,
    demoParentId: "parent-1",
    demoUserId: "student-1",
    demoTeacherId: "teacher-1"
  }), []);

  assert.deepEqual(parentAccessSeedGuardianLinks("2026-06-20T10:00:00.000Z", {
    shouldSeedDemoUser: () => true,
    demoParentId: "parent-1",
    demoUserId: "student-1",
    demoTeacherId: "teacher-1"
  }), [
    {
      id: "guardian-link-peter-family",
      parent_id: "parent-1",
      student_id: "student-1",
      relationship: "guardian",
      status: "active",
      invite_code: "",
      created_by: "teacher-1",
      created_at: "2026-06-20T10:00:00.000Z",
      updated_at: "2026-06-20T10:00:00.000Z"
    }
  ]);
});

test("parent access persistence owns guardian link projection helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentAccessPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentAccessPersistence") as Record<string, unknown>;

  assert.equal(typeof helpers.toGuardianLink, "function");
  assert.equal(typeof helpers.parentCanAccessStudentInDatabase, "function");
  assert.match(persistenceSource, /export function toGuardianLink\b/);
  assert.match(persistenceSource, /export function parentCanAccessStudentInDatabase\b/);
  assert.doesNotMatch(rootSource, /function toGuardianLink\(/);
  assert.doesNotMatch(rootSource, /function parentCanAccessStudentInDatabase\(/);
  assert.match(rootSource, /toGuardianLink as toGuardianLinkFromParentAccess/);

  const database: ParentAccessPersistenceDatabase = {
    guardian_links: [
      {
        id: "guardian-link-1",
        parent_id: "parent-1",
        student_id: "student-1",
        relationship: "mother",
        status: "active",
        invite_code: "MAIS-ABC",
        created_by: "teacher-1",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-02T00:00:00.000Z"
      },
      {
        id: "guardian-link-revoked",
        parent_id: "parent-1",
        student_id: "student-2",
        relationship: "guardian",
        status: "revoked"
      }
    ],
    student_profiles: [
      { user_id: "parent-1", name: "Pat Parent", grade: "S3" },
      { user_id: "student-1", name: "Ada Student", grade: "S3" },
      { user_id: "student-2", name: "Ben Student", grade: "S2" }
    ],
    users: [
      { id: "admin-1", username: "Admin", role: "admin" },
      { id: "parent-1", username: "pat", role: "parent" },
      { id: "student-1", username: "ada", role: "student" },
      { id: "student-2", username: "ben", role: "student" },
      { id: "teacher-1", username: "teacher", role: "teacher" }
    ]
  };
  const toGuardianLink = helpers.toGuardianLink as (
    database: ParentAccessPersistenceDatabase,
    record: ParentAccessPersistenceDatabase["guardian_links"][number]
  ) => { id: string; parentName: string; studentName: string; relationship: string; status: string; inviteCode: string };
  const parentCanAccessStudentInDatabase = helpers.parentCanAccessStudentInDatabase as (
    database: ParentAccessPersistenceDatabase,
    parentId: string,
    studentId: string
  ) => boolean;

  assert.deepEqual(toGuardianLink(database, database.guardian_links[0]), {
    id: "guardian-link-1",
    parentId: "parent-1",
    parentName: "Pat Parent",
    studentId: "student-1",
    studentName: "Ada Student",
    studentGrade: "S3",
    relationship: "mother",
    status: "active",
    inviteCode: "",
    createdBy: "teacher-1",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z"
  });
  assert.equal(parentCanAccessStudentInDatabase(database, "parent-1", "student-1"), true);
  assert.equal(parentCanAccessStudentInDatabase(database, "parent-1", "student-2"), false);
  assert.equal(parentCanAccessStudentInDatabase(database, "admin-1", "student-2"), true);
  assert.equal(parentCanAccessStudentInDatabase(database, "admin-1", "teacher-1"), false);
});

test("parent access persistence owns parent-area role guard for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentAccessPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentAccessPersistence") as Record<string, unknown>;

  assert.equal(typeof helpers.canUseParentArea, "function");
  assert.match(persistenceSource, /export function canUseParentArea\b/);
  assert.doesNotMatch(rootSource, /function canUseParentArea\b/);
  assert.match(rootSource, /canUseParentAreaFromParentAccess/);

  const canUseParentArea = helpers.canUseParentArea as (
    user?: { id: string; role: "student" | "teacher" | "parent" | "admin" } | null
  ) => boolean;

  assert.equal(canUseParentArea({ id: "parent-1", role: "parent" }), true);
  assert.equal(canUseParentArea({ id: "admin-1", role: "admin" }), false);
  assert.equal(canUseParentArea({ id: "teacher-1", role: "teacher" }), false);
  assert.equal(canUseParentArea(null), false);
});

test("parent access persistence owns guardian validation helpers for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentAccessPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentAccessPersistence") as Record<string, unknown>;

  assert.equal(typeof helpers.isValidGuardianRelationship, "function");
  assert.equal(typeof helpers.normalizeGuardianRelationship, "function");
  assert.equal(typeof helpers.isValidGuardianLinkStatus, "function");
  assert.equal(typeof helpers.normalizeGuardianLinkStatus, "function");
  assert.match(persistenceSource, /export function isValidGuardianRelationship\b/);
  assert.match(persistenceSource, /export function normalizeGuardianRelationship\b/);
  assert.match(persistenceSource, /export function isValidGuardianLinkStatus\b/);
  assert.match(persistenceSource, /export function normalizeGuardianLinkStatus\b/);
  assert.doesNotMatch(rootSource, /const validGuardianRelationships\b/);
  assert.doesNotMatch(rootSource, /const validGuardianLinkStatuses\b/);
  assert.match(rootSource, /isValidGuardianLinkStatusFromParentAccess/);
  assert.match(rootSource, /normalizeGuardianRelationshipFromParentAccess/);
  assert.match(rootSource, /normalizeGuardianLinkStatusFromParentAccess/);

  const isValidGuardianRelationship = helpers.isValidGuardianRelationship as (value: unknown) => boolean;
  const normalizeGuardianRelationship = helpers.normalizeGuardianRelationship as (value: unknown) => string;
  const isValidGuardianLinkStatus = helpers.isValidGuardianLinkStatus as (value: unknown) => boolean;
  const normalizeGuardianLinkStatus = helpers.normalizeGuardianLinkStatus as (value: unknown) => string;

  assert.equal(isValidGuardianRelationship("mother"), true);
  assert.equal(isValidGuardianRelationship("unexpected"), false);
  assert.equal(normalizeGuardianRelationship("father"), "father");
  assert.equal(normalizeGuardianRelationship("unexpected"), "guardian");
  assert.equal(isValidGuardianLinkStatus("active"), true);
  assert.equal(isValidGuardianLinkStatus("deleted"), false);
  assert.equal(normalizeGuardianLinkStatus("revoked"), "revoked");
  assert.equal(normalizeGuardianLinkStatus("deleted"), "pending");
});

test("parent access persistence owns guardian-link record normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentAccessPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentAccessPersistence") as Record<string, unknown>;
  const normalizeRecord = helpers.normalizeParentAccessGuardianLinkRecord as
    | (<T extends Record<string, unknown>>(link: T, now: string) => T & {
        relationship: string;
        status: string;
        invite_code: string;
        created_at: string;
        updated_at: string;
      })
    | undefined;

  assert.equal(typeof normalizeRecord, "function");
  assert.match(persistenceSource, /export function normalizeParentAccessGuardianLinkRecord\b/);
  assert.match(rootSource, /normalizeParentAccessGuardianLinkRecord as normalizeGuardianLinkRecordFromParentAccess/);
  assert.doesNotMatch(rootSource, /relationship: normalizeGuardianRelationshipFromParentAccess\(link\.relationship\)/);
  assert.doesNotMatch(rootSource, /status: normalizeGuardianLinkStatusFromParentAccess\(link\.status\)/);

  assert.deepEqual(
    normalizeRecord?.(
      {
        id: "link-1",
        parent_id: "parent-1",
        student_id: "student-1",
        relationship: "unexpected",
        status: "deleted",
        invite_code: " mais abc ",
        created_by: "teacher-1"
      },
      "2026-06-23T10:00:00.000Z"
    ),
    {
      id: "link-1",
      parent_id: "parent-1",
      student_id: "student-1",
      relationship: "guardian",
      status: "pending",
      invite_code: "",
      created_by: "teacher-1",
      created_at: "2026-06-23T10:00:00.000Z",
      updated_at: "2026-06-23T10:00:00.000Z",
      revoked_at: null,
      revoked_by: null
    }
  );
  assert.equal(
    normalizeRecord?.(
      {
        parent_id: "parent-2",
        student_id: "student-2",
        relationship: "mother",
        status: "active",
        invite_code: ""
      },
      "2026-06-23T10:00:00.000Z"
    ).invite_code,
    ""
  );
});

test("parent access persistence owns guardian-link collection normalization for legacy userStore", async () => {
  const persistenceSource = await readFile(path.join(process.cwd(), "lib/server/userStore/parentAccessPersistence.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/parentAccessPersistence") as Record<string, unknown>;
  const normalizeRecords = helpers.normalizeParentAccessGuardianLinkRecords as
    | ((records: ParentAccessPersistenceDatabase["guardian_links"] | undefined, now: string, options: {
        shouldSeedDemoUser: () => boolean;
        demoParentId: string;
        demoUserId: string;
        demoTeacherId: string;
      }) => ParentAccessPersistenceDatabase["guardian_links"])
    | undefined;

  assert.equal(typeof normalizeRecords, "function");
  assert.match(persistenceSource, /export function normalizeParentAccessGuardianLinkRecords\b/);
  assert.match(rootSource, /normalizeParentAccessGuardianLinkRecords as normalizeGuardianLinkRecordsFromParentAccess/);
  assert.doesNotMatch(rootSource, /guardian_links: mergeSeedRecordsPreservingExisting\(database\.guardian_links, seedGuardianLinks\(now\), \(link\) => link\.id\)/);

  const records = normalizeRecords?.([
    {
      id: "guardian-link-peter-family",
      parent_id: "parent-existing",
      student_id: "student-existing",
      relationship: "unexpected" as never,
      status: "deleted",
      invite_code: " mais existing ",
      created_by: "teacher-existing"
    },
    {
      id: "guardian-link-custom",
      parent_id: "parent-custom",
      student_id: "student-custom",
      relationship: "father",
      status: "active",
      invite_code: "",
      created_by: "teacher-custom",
      created_at: "2026-06-19T10:00:00.000Z"
    }
  ], "2026-06-20T10:00:00.000Z", {
    shouldSeedDemoUser: () => true,
    demoParentId: "parent-seed",
    demoUserId: "student-seed",
    demoTeacherId: "teacher-seed"
  });

  assert.deepEqual(records?.map((link) => link.id), [
    "guardian-link-peter-family",
    "guardian-link-custom"
  ]);
  assert.deepEqual(records?.[0], {
    id: "guardian-link-peter-family",
    parent_id: "parent-existing",
    student_id: "student-existing",
    relationship: "guardian",
    status: "pending",
    invite_code: "",
    created_by: "teacher-existing",
    created_at: "2026-06-20T10:00:00.000Z",
    updated_at: "2026-06-20T10:00:00.000Z",
    revoked_at: null,
    revoked_by: null
  });
  assert.deepEqual(records?.[1], {
    id: "guardian-link-custom",
    parent_id: "parent-custom",
    student_id: "student-custom",
    relationship: "father",
    status: "active",
    invite_code: "",
    created_by: "teacher-custom",
    created_at: "2026-06-19T10:00:00.000Z",
    updated_at: "2026-06-19T10:00:00.000Z",
    revoked_at: null,
    revoked_by: null
  });
});

test("parent access persistence rejects invalid or unauthorized invite linking", async () => {
  const validButUnknownToken = `MAIS-${"A".repeat(24)}`;
  const store = createTestStore({
    guardian_links: [],
    student_profiles: [
      {
        user_id: "student-1",
        name: "Ada Student",
        grade: "S3",
        parent_invite_code: "MAIS-ABC"
      }
    ],
    users: [
      { id: "teacher-1", username: "teacher", role: "teacher" },
      { id: "parent-1", username: "parent", role: "parent" },
      { id: "student-1", username: "student", role: "student" }
    ]
  });

  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    inviteCode: "",
    parentId: "parent-1"
  }), { status: "invalid" });
  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    inviteCode: "MAIS-ABC",
    parentId: "parent-1",
    relationship: "cousin" as never
  }), { status: "invalid" });
  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    inviteCode: validButUnknownToken,
    parentId: "teacher-1"
  }), { status: "forbidden" });
  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    inviteCode: validButUnknownToken,
    parentId: "parent-1"
  }), { status: "not-found" });
});

test("legacy userStore delegates parent invite linking through parent domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const linkParentToStudentByInviteCode = parentUserStore\.linkParentToStudentByInviteCode/);
  assert.doesNotMatch(source, /export async function linkParentToStudentByInviteCode/);
});
