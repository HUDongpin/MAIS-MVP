import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createParentAccessPersistenceStore,
  type ParentAccessPersistenceDatabase
} from "@/lib/server/userStore/parentAccessPersistence";

type GuardianInvitationTestRecord = {
  id: string;
  student_id: string;
  version: number;
  token_digest: string;
  expires_at: string;
  consumed_at: string | null;
  consumed_by_parent_id: string | null;
  consumed_relationship?: string | null;
  consumed_link_id?: string | null;
  revoked_at: string | null;
  created_by: string;
  created_at: string;
};

type GuardianInvitationTestDatabase = ParentAccessPersistenceDatabase & {
  guardian_invitations: GuardianInvitationTestRecord[];
  teacher_classes: Array<{ id: string; teacher_id: string }>;
  class_enrollments: Array<{ class_id: string; student_id: string }>;
  school_memberships?: Array<{ user_id: string; role: string; class_id?: string }>;
};

type GuardianInvitationStore = ReturnType<typeof createParentAccessPersistenceStore> & {
  issueGuardianInvitationForTeacher(input: {
    teacherId: string;
    classId: string;
    studentId: string;
  }): Promise<
    | { status: "issued"; invitation: { version: number; token: string; expiresAt: string } }
    | { status: string }
  >;
  revokeGuardianLinkForTeacher(input: {
    teacherId: string;
    classId: string;
    studentId: string;
    linkId: string;
  }): Promise<{ status: string; revokedAt?: string }>;
};

const firstToken = `MAIS-${"A".repeat(24)}`;
const secondToken = `MAIS-${"B".repeat(24)}`;

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createDatabase(): GuardianInvitationTestDatabase {
  return {
    guardian_invitations: [],
    guardian_links: [
      {
        id: "link-revoked-history",
        parent_id: "parent-1",
        student_id: "student-1",
        relationship: "mother",
        status: "revoked",
        invite_code: "LEGACY-LINK-PLAINTEXT",
        created_by: "teacher-1",
        created_at: "2026-08-20T00:00:00.000Z",
        updated_at: "2026-08-20T01:00:00.000Z"
      }
    ],
    student_profiles: [
      {
        user_id: "parent-1",
        name: "Parent One",
        grade: "S3"
      },
      {
        user_id: "parent-2",
        name: "Parent Two",
        grade: "S3"
      },
      {
        user_id: "student-1",
        name: "Student One",
        grade: "S3",
        parent_invite_code: "LEGACY-PROFILE-PLAINTEXT"
      },
      {
        user_id: "student-2",
        name: "Student Two",
        grade: "S3"
      }
    ],
    teacher_classes: [
      { id: "class-1", teacher_id: "teacher-1" },
      { id: "class-2", teacher_id: "teacher-2" }
    ],
    class_enrollments: [
      { class_id: "class-1", student_id: "student-1" },
      { class_id: "class-2", student_id: "student-2" }
    ],
    school_memberships: [
      { user_id: "teacher-member", role: "teacher", class_id: "class-1" }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "teacher-member", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "parent-1", role: "parent" },
      { id: "parent-2", role: "parent" },
      { id: "student-1", role: "student" },
      { id: "student-2", role: "student" }
    ]
  };
}

function createStore(
  database: GuardianInvitationTestDatabase,
  tokenSequence: string[] = [firstToken, secondToken]
) {
  const clock = { value: "2026-08-23T10:00:00.000Z" };
  const tokens = [...tokenSequence];
  const ids = ["invite-1", "link-new-1", "invite-2", "link-new-2"];
  const store = createParentAccessPersistenceStore({
    createId: () => ids.shift() ?? "fallback-id",
    createInviteToken: () => tokens.shift() ?? `MAIS-${"C".repeat(24)}`,
    now: () => new Date(clock.value),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  } as Parameters<typeof createParentAccessPersistenceStore>[0]) as GuardianInvitationStore;
  return { clock, store };
}

test("guardian invitation issue stores only a digest and rotates the prior version", async () => {
  const database = createDatabase();
  const { store } = createStore(database);

  assert.equal(typeof store.issueGuardianInvitationForTeacher, "function");
  const first = await store.issueGuardianInvitationForTeacher({
    teacherId: "teacher-1",
    classId: "class-1",
    studentId: "student-1"
  });
  assert.deepEqual(first, {
    status: "issued",
    invitation: {
      version: 1,
      token: firstToken,
      expiresAt: "2026-08-24T10:00:00.000Z"
    }
  });
  assert.equal(database.guardian_invitations[0]?.token_digest, digest(firstToken));
  assert.doesNotMatch(JSON.stringify(database), new RegExp(firstToken));
  assert.equal(database.student_profiles?.find((profile) => profile.user_id === "student-1")?.parent_invite_code, "");
  assert.equal(database.guardian_links[0]?.invite_code, "");

  const second = await store.issueGuardianInvitationForTeacher({
    teacherId: "teacher-1",
    classId: "class-1",
    studentId: "student-1"
  });
  assert.equal(second.status, "issued");
  assert.equal(second.status === "issued" ? second.invitation.version : null, 2);
  assert.equal(database.guardian_invitations[0]?.revoked_at, "2026-08-23T10:00:00.000Z");
  assert.equal(database.guardian_invitations[1]?.token_digest, digest(secondToken));
});

test("guardian invitation rotation retries a repeated token so the old code cannot remain valid", async () => {
  const database = createDatabase();
  const { store } = createStore(database, [firstToken, firstToken, secondToken]);

  const first = await store.issueGuardianInvitationForTeacher({
    teacherId: "teacher-1",
    classId: "class-1",
    studentId: "student-1"
  });
  const rotated = await store.issueGuardianInvitationForTeacher({
    teacherId: "teacher-1",
    classId: "class-1",
    studentId: "student-1"
  });

  assert.equal(first.status === "issued" ? first.invitation.token : null, firstToken);
  assert.equal(rotated.status === "issued" ? rotated.invitation.token : null, secondToken);
  assert.equal(database.guardian_invitations[0]?.revoked_at, "2026-08-23T10:00:00.000Z");
  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: firstToken
  }), { status: "revoked" });
});

test("guardian invitation migration rejects ambiguous duplicate current versions", async () => {
  const database = createDatabase();
  database.guardian_invitations = [firstToken, secondToken].map((token, index) => ({
    id: `ambiguous-${index + 1}`,
    student_id: "student-1",
    version: 1,
    token_digest: digest(token),
    expires_at: "2026-08-24T10:00:00.000Z",
    consumed_at: null,
    consumed_by_parent_id: null,
    consumed_relationship: null,
    consumed_link_id: null,
    revoked_at: null,
    created_by: "teacher-1",
    created_at: "2026-08-23T10:00:00.000Z"
  }));
  const { store } = createStore(database);

  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: firstToken
  }), { status: "not-found" });
  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    parentId: "parent-2",
    inviteCode: secondToken
  }), { status: "not-found" });
  assert.deepEqual(database.guardian_invitations, []);
  assert.equal(database.guardian_links.some((link) => link.status === "active"), false);
});

test("guardian invitation consume rejects orphaned or non-student targets without creating links", async () => {
  for (const studentId of ["missing-student", "teacher-2"]) {
    const database = createDatabase();
    database.guardian_invitations = [{
      id: `invalid-target-${studentId}`,
      student_id: studentId,
      version: 1,
      token_digest: digest(firstToken),
      expires_at: "2026-08-24T10:00:00.000Z",
      consumed_at: null,
      consumed_by_parent_id: null,
      consumed_relationship: null,
      consumed_link_id: null,
      revoked_at: null,
      created_by: "teacher-1",
      created_at: "2026-08-23T10:00:00.000Z"
    }];
    const { store } = createStore(database);

    assert.deepEqual(await store.linkParentToStudentByInviteCode({
      parentId: "parent-1",
      inviteCode: firstToken
    }), { status: "not-found" }, studentId);
    assert.equal(database.guardian_invitations[0]?.revoked_at, "2026-08-23T10:00:00.000Z");
    assert.equal(database.guardian_links.some((link) => link.status === "active"), false);
  }
});

test("guardian invitation normalization scrubs legacy plaintext and preserves only valid digest records", async () => {
  const helpers = await import("@/lib/server/userStore/parentAccessPersistence") as Record<string, unknown>;
  assert.equal(typeof helpers.normalizeParentAccessLegacyInviteFields, "function");
  assert.equal(typeof helpers.normalizeGuardianInvitationRecords, "function");
  assert.equal(typeof helpers.guardianInvitationRecordsNeedPersistenceSync, "function");
  if (
    typeof helpers.normalizeParentAccessLegacyInviteFields !== "function" ||
    typeof helpers.normalizeGuardianInvitationRecords !== "function" ||
    typeof helpers.guardianInvitationRecordsNeedPersistenceSync !== "function"
  ) return;

  const database = createDatabase();
  (helpers.normalizeParentAccessLegacyInviteFields as (database: ParentAccessPersistenceDatabase) => void)(database);
  assert.equal(database.student_profiles?.[2]?.parent_invite_code, "");
  assert.equal(database.guardian_links[0]?.invite_code, "");

  const normalized = (helpers.normalizeGuardianInvitationRecords as (
    records: unknown[],
    now: string
  ) => GuardianInvitationTestRecord[])([
    {
      id: "valid",
      student_id: "student-1",
      version: 2,
      token_digest: digest(firstToken).toUpperCase(),
      expires_at: "2026-08-24T10:00:00.000Z",
      consumed_at: null,
      consumed_by_parent_id: null,
      revoked_at: null,
      created_by: "teacher-1",
      created_at: "2026-08-23T10:00:00.000Z"
    },
    {
      id: "invalid-plaintext",
      student_id: "student-1",
      version: 3,
      token_digest: firstToken,
      expires_at: "2026-08-24T10:00:00.000Z",
      created_by: "teacher-1",
      created_at: "2026-08-23T10:00:00.000Z"
    },
    {
      id: "unsafe-version",
      student_id: "student-1",
      version: Number.MAX_SAFE_INTEGER + 1,
      token_digest: digest(secondToken),
      expires_at: "2026-08-24T10:00:00.000Z",
      created_by: "teacher-1",
      created_at: "2026-08-23T10:00:00.000Z"
    }
  ], "2026-08-23T10:00:00.000Z");
  assert.deepEqual(normalized, [{
    id: "valid",
    student_id: "student-1",
    version: 2,
    token_digest: digest(firstToken),
    expires_at: "2026-08-24T10:00:00.000Z",
    consumed_at: null,
    consumed_by_parent_id: null,
    consumed_relationship: null,
    consumed_link_id: null,
    revoked_at: null,
    created_by: "teacher-1",
    created_at: "2026-08-23T10:00:00.000Z"
  }]);
  assert.doesNotMatch(JSON.stringify(normalized), new RegExp(firstToken));

  const needsSync = helpers.guardianInvitationRecordsNeedPersistenceSync as (
    records: unknown,
    normalizedRecords: GuardianInvitationTestRecord[]
  ) => boolean;
  assert.equal(needsSync(undefined, []), true);
  assert.deepEqual((helpers.normalizeGuardianInvitationRecords as (
    records: unknown,
    now: string
  ) => GuardianInvitationTestRecord[])("legacy-plaintext-collection", "2026-08-23T10:00:00.000Z"), []);
  assert.equal(needsSync("legacy-plaintext-collection", []), true);
  assert.equal(needsSync([], []), false);
  assert.equal(needsSync([{
    id: "invalid-plaintext",
    student_id: "student-1",
    version: 3,
    token_digest: firstToken,
    expires_at: "2026-08-24T10:00:00.000Z",
    created_by: "teacher-1",
    created_at: "2026-08-23T10:00:00.000Z"
  }], []), true);
  assert.equal(needsSync([{
    ...normalized[0],
    token_digest: digest(firstToken).toUpperCase()
  }], normalized), true);
  assert.equal(needsSync(normalized, normalized), false);
});

test("legacy userStore persists guardian invitations as a first-class snapshot collection", async () => {
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const authSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authSessionPersistence.ts"), "utf8");
  const provisioningSource = await readFile(path.join(process.cwd(), "lib/server/userStore/authProvisioningPersistence.ts"), "utf8");
  const rosterSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsRosterImportPersistence.ts"), "utf8");

  assert.match(rootSource, /guardian_invitations:\s*GuardianInvitationRecord\[\]/);
  assert.match(rootSource, /guardian_invitations:\s*\[\]/);
  assert.match(rootSource, /guardian_invitations:\s*normalizeGuardianInvitationRecordsFromParentAccess\(/);
  assert.match(rootSource, /guardianInvitationRecordsNeedPersistenceSyncFromParentAccess\(\s*parsed\.guardian_invitations,\s*database\.guardian_invitations\s*\)/);
  assert.doesNotMatch(rootSource, /createParentInviteCodeFromParentAccess/);
  assert.doesNotMatch(rootSource, /uniqueParentInviteCodeFromParentAccess/);
  assert.doesNotMatch(authSource, /createParentInviteCode/);
  assert.doesNotMatch(provisioningSource, /createParentInviteCode/);
  assert.doesNotMatch(rosterSource, /createParentInviteCode/);
  assert.doesNotMatch(rootSource, /student_profiles[\s\S]{0,300}parent_invite_code:\s*createParentInviteCodeFromParentAccess\(/);
  assert.doesNotMatch(authSource, /parent_invite_code:\s*createParentInviteCode\(/);
  assert.doesNotMatch(provisioningSource, /parent_invite_code:\s*createParentInviteCode\(/);
  assert.doesNotMatch(rosterSource, /parent_invite_code:\s*createParentInviteCode\(/);
  assert.doesNotMatch(rosterSource, /invite_code:\s*ensureParentInviteCodeInDatabase\(/);
});

test("guardian invitation issue requires a teacher with exact class enrollment access", async () => {
  const database = createDatabase();
  const { store } = createStore(database);

  assert.deepEqual(await store.issueGuardianInvitationForTeacher({
    teacherId: "teacher-2",
    classId: "class-1",
    studentId: "student-1"
  }), { status: "forbidden" });
  assert.deepEqual(await store.issueGuardianInvitationForTeacher({
    teacherId: "admin-1",
    classId: "class-1",
    studentId: "student-1"
  }), { status: "forbidden" });
  assert.deepEqual(await store.issueGuardianInvitationForTeacher({
    teacherId: "teacher-1",
    classId: "class-1",
    studentId: "student-2"
  }), { status: "student-not-found" });
  assert.equal(database.guardian_invitations.length, 0);

  const member = await store.issueGuardianInvitationForTeacher({
    teacherId: "teacher-member",
    classId: "class-1",
    studentId: "student-1"
  });
  assert.equal(member.status, "issued");
});

test("guardian invitation is atomic, single use, and replay-safe for only the same parent relationship", async () => {
  const database = createDatabase();
  const { store } = createStore(database);
  const issued = await store.issueGuardianInvitationForTeacher({
    teacherId: "teacher-1",
    classId: "class-1",
    studentId: "student-1"
  });
  assert.equal(issued.status, "issued");

  const linked = await store.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: firstToken.toLowerCase(),
    relationship: "father"
  });
  assert.equal(linked.status, "linked");
  if (linked.status !== "linked") return;
  assert.notEqual(linked.link.id, "link-revoked-history");
  assert.equal(database.guardian_links.find((link) => link.id === "link-revoked-history")?.status, "revoked");
  assert.equal(database.guardian_invitations[0]?.consumed_by_parent_id, "parent-1");
  assert.equal(database.guardian_invitations[0]?.consumed_link_id, linked.link.id);

  const replay = await store.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: firstToken,
    relationship: "father"
  });
  assert.deepEqual(replay, linked);
  assert.equal(database.guardian_links.filter((link) => link.status === "active").length, 1);

  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: firstToken,
    relationship: "mother"
  }), { status: "consumed" });
  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    parentId: "parent-2",
    inviteCode: firstToken,
    relationship: "father"
  }), { status: "consumed" });
});

test("guardian invitation rejects expired, rotated, revoked, and non-current versions", async () => {
  const database = createDatabase();
  const { clock, store } = createStore(database);
  await store.issueGuardianInvitationForTeacher({ teacherId: "teacher-1", classId: "class-1", studentId: "student-1" });
  await store.issueGuardianInvitationForTeacher({ teacherId: "teacher-1", classId: "class-1", studentId: "student-1" });

  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: firstToken
  }), { status: "revoked" });

  clock.value = "2026-08-24T10:00:00.001Z";
  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: secondToken
  }), { status: "expired" });
});

test("teacher revocation is immediate, scoped, persisted, and prevents invitation restoration", async () => {
  const database = createDatabase();
  const { store } = createStore(database);
  await store.issueGuardianInvitationForTeacher({ teacherId: "teacher-1", classId: "class-1", studentId: "student-1" });
  const linked = await store.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: firstToken,
    relationship: "guardian"
  });
  assert.equal(linked.status, "linked");
  if (linked.status !== "linked") return;

  assert.deepEqual(await store.revokeGuardianLinkForTeacher({
    teacherId: "teacher-2",
    classId: "class-1",
    studentId: "student-1",
    linkId: linked.link.id
  }), { status: "forbidden" });
  const revoked = await store.revokeGuardianLinkForTeacher({
    teacherId: "teacher-1",
    classId: "class-1",
    studentId: "student-1",
    linkId: linked.link.id
  });
  assert.deepEqual(revoked, { status: "revoked", revokedAt: "2026-08-23T10:00:00.000Z" });
  assert.equal(await store.parentCanAccessStudent("parent-1", "student-1"), false);
  assert.equal(database.guardian_invitations[0]?.revoked_at, "2026-08-23T10:00:00.000Z");
  assert.deepEqual(await store.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: firstToken
  }), { status: "revoked" });

  const persistedDatabase = JSON.parse(JSON.stringify(database)) as GuardianInvitationTestDatabase;
  const restarted = createStore(persistedDatabase).store;
  assert.equal(await restarted.parentCanAccessStudent("parent-1", "student-1"), false);
  assert.deepEqual(await restarted.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: firstToken
  }), { status: "revoked" });

  const replacement = await store.issueGuardianInvitationForTeacher({
    teacherId: "teacher-1",
    classId: "class-1",
    studentId: "student-1"
  });
  assert.equal(replacement.status, "issued");
  const relinked = await store.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: secondToken,
    relationship: "guardian"
  });
  assert.equal(relinked.status, "linked");
  if (relinked.status !== "linked") return;
  assert.notEqual(relinked.link.id, linked.link.id);
  assert.equal(database.guardian_links.find((link) => link.id === linked.link.id)?.status, "revoked");
  assert.equal(database.guardian_links.find((link) => link.id === relinked.link.id)?.status, "active");
});
