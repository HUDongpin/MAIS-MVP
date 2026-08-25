import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createParentAccessPersistenceStore,
  type ParentAccessPersistenceDatabase
} from "@/lib/server/userStore/parentAccessPersistence";
import type { GuardianRelationship } from "@/types";

type GuardianInvitationTestRecord = {
  id: string;
  student_id: string;
  version: number;
  token_digest: string;
  expires_at: string;
  consumed_at: string | null;
  consumed_by_parent_id: string | null;
  consumed_relationship?: GuardianRelationship | null;
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
  }): Promise<{
    status: string;
    revokedAt?: string;
    invitation?: { version: number; token: string; expiresAt: string };
  }>;
};

const firstToken = `MAIS-${"A".repeat(24)}`;
const secondToken = `MAIS-${"B".repeat(24)}`;
const thirdToken = `MAIS-${"C".repeat(24)}`;
const unrelatedToken = `MAIS-${"D".repeat(24)}`;

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
  tokenSequence: string[] = [firstToken, secondToken],
  idSequence: string[] = ["invite-1", "link-new-1", "invite-2", "link-new-2"]
) {
  const clock = { value: "2026-08-23T10:00:00.000Z" };
  const tokens = [...tokenSequence];
  const ids = [...idSequence];
  const generatorCalls = { id: 0, token: 0 };
  const store = createParentAccessPersistenceStore({
    createId: () => {
      generatorCalls.id += 1;
      return ids.shift() ?? "fallback-id";
    },
    createInviteToken: () => {
      generatorCalls.token += 1;
      return tokens.shift() ?? `MAIS-${"C".repeat(24)}`;
    },
    now: () => new Date(clock.value),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  } as Parameters<typeof createParentAccessPersistenceStore>[0]) as GuardianInvitationStore;
  return { clock, generatorCalls, store };
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

test("guardian invitation issue retries cross-student ID collisions and exhausts atomically", async () => {
  const createOccupiedDatabase = () => {
    const database = createDatabase();
    database.guardian_invitations = [{
      id: "occupied-invitation-id",
      student_id: "student-2",
      version: 1,
      token_digest: digest(unrelatedToken),
      expires_at: "2026-08-24T10:00:00.000Z",
      consumed_at: null,
      consumed_by_parent_id: null,
      consumed_relationship: null,
      consumed_link_id: null,
      revoked_at: null,
      created_by: "teacher-2",
      created_at: "2026-08-23T09:00:00.000Z"
    }];
    return database;
  };

  const retryDatabase = createOccupiedDatabase();
  const retryStore = createStore(
    retryDatabase,
    [firstToken],
    ["occupied-invitation-id", "student-1-unique-invitation-id"]
  ).store;
  const issued = await retryStore.issueGuardianInvitationForTeacher({
    teacherId: "teacher-1",
    classId: "class-1",
    studentId: "student-1"
  });
  assert.equal(issued.status, "issued");
  assert.deepEqual(
    retryDatabase.guardian_invitations.map((invitation) => invitation.id),
    ["occupied-invitation-id", "student-1-unique-invitation-id"]
  );
  assert.equal(new Set(retryDatabase.guardian_invitations.map((invitation) => invitation.id)).size, 2);

  const exhaustedDatabase = createOccupiedDatabase();
  const beforeExhaustion = structuredClone(exhaustedDatabase);
  const exhaustedStore = createStore(
    exhaustedDatabase,
    [firstToken],
    Array.from({ length: 8 }, () => "occupied-invitation-id")
  ).store;
  await assert.rejects(
    exhaustedStore.issueGuardianInvitationForTeacher({
      teacherId: "teacher-1",
      classId: "class-1",
      studentId: "student-1"
    }),
    /could not produce a unique invitation ID/u
  );
  assert.deepEqual(exhaustedDatabase, beforeExhaustion);
});

test("guardian link revoke retries cross-student invitation IDs and exhausts without revoking", async () => {
  const createRevocableDatabase = () => {
    const database = createDatabase();
    database.guardian_links.push({
      id: "student-1-active-link",
      parent_id: "parent-1",
      student_id: "student-1",
      relationship: "guardian",
      status: "active",
      invite_code: "",
      created_by: "parent-1",
      created_at: "2026-08-23T09:00:00.000Z",
      updated_at: "2026-08-23T09:00:00.000Z",
      revoked_at: null,
      revoked_by: null
    });
    database.guardian_invitations = [{
      id: "occupied-invitation-id",
      student_id: "student-2",
      version: 1,
      token_digest: digest(unrelatedToken),
      expires_at: "2026-08-24T10:00:00.000Z",
      consumed_at: null,
      consumed_by_parent_id: null,
      consumed_relationship: null,
      consumed_link_id: null,
      revoked_at: null,
      created_by: "teacher-2",
      created_at: "2026-08-23T09:00:00.000Z"
    }];
    return database;
  };

  const retryDatabase = createRevocableDatabase();
  const retryStore = createStore(
    retryDatabase,
    [firstToken],
    ["occupied-invitation-id", "student-1-replacement-invitation-id"]
  ).store;
  const revoked = await retryStore.revokeGuardianLinkForTeacher({
    teacherId: "teacher-1",
    classId: "class-1",
    studentId: "student-1",
    linkId: "student-1-active-link"
  });
  assert.equal(revoked.status, "revoked");
  assert.deepEqual(
    retryDatabase.guardian_invitations.map((invitation) => invitation.id),
    ["occupied-invitation-id", "student-1-replacement-invitation-id"]
  );
  assert.equal(new Set(retryDatabase.guardian_invitations.map((invitation) => invitation.id)).size, 2);

  const exhaustedDatabase = createRevocableDatabase();
  const beforeExhaustion = structuredClone(exhaustedDatabase);
  const exhaustedStore = createStore(
    exhaustedDatabase,
    [firstToken],
    Array.from({ length: 8 }, () => "occupied-invitation-id")
  ).store;
  await assert.rejects(
    exhaustedStore.revokeGuardianLinkForTeacher({
      teacherId: "teacher-1",
      classId: "class-1",
      studentId: "student-1",
      linkId: "student-1-active-link"
    }),
    /could not produce a unique invitation ID/u
  );
  assert.deepEqual(exhaustedDatabase, beforeExhaustion);
});

test("blank guardian invitation IDs exhaust atomically for issue and revoke", async () => {
  const issueDatabase = createDatabase();
  const beforeIssue = structuredClone(issueDatabase);
  const issueStore = createStore(
    issueDatabase,
    [firstToken],
    Array.from({ length: 8 }, () => "   ")
  ).store;
  await assert.rejects(
    issueStore.issueGuardianInvitationForTeacher({
      teacherId: "teacher-1",
      classId: "class-1",
      studentId: "student-1"
    }),
    /could not produce a unique invitation ID/u
  );
  assert.deepEqual(issueDatabase, beforeIssue);

  const revokeDatabase = createDatabase();
  revokeDatabase.guardian_links.push({
    id: "student-1-active-link",
    parent_id: "parent-1",
    student_id: "student-1",
    relationship: "guardian",
    status: "active",
    invite_code: "",
    created_by: "parent-1",
    created_at: "2026-08-23T09:00:00.000Z",
    updated_at: "2026-08-23T09:00:00.000Z",
    revoked_at: null,
    revoked_by: null
  });
  const beforeRevoke = structuredClone(revokeDatabase);
  const revokeStore = createStore(
    revokeDatabase,
    [firstToken],
    Array.from({ length: 8 }, () => "\t")
  ).store;
  await assert.rejects(
    revokeStore.revokeGuardianLinkForTeacher({
      teacherId: "teacher-1",
      classId: "class-1",
      studentId: "student-1",
      linkId: "student-1-active-link"
    }),
    /could not produce a unique invitation ID/u
  );
  assert.deepEqual(revokeDatabase, beforeRevoke);
});

test("guardian invitation token-digest exhaustion is atomic for issue and revoke", async () => {
  const createOccupiedDatabase = () => {
    const database = createDatabase();
    database.guardian_invitations = [{
      id: "student-2-existing-invitation",
      student_id: "student-2",
      version: 1,
      token_digest: digest(unrelatedToken),
      expires_at: "2026-08-24T10:00:00.000Z",
      consumed_at: null,
      consumed_by_parent_id: null,
      consumed_relationship: null,
      consumed_link_id: null,
      revoked_at: null,
      created_by: "teacher-2",
      created_at: "2026-08-23T09:00:00.000Z"
    }];
    return database;
  };

  const issueDatabase = createOccupiedDatabase();
  const beforeIssue = structuredClone(issueDatabase);
  const issueStore = createStore(
    issueDatabase,
    Array.from({ length: 8 }, () => unrelatedToken),
    ["student-1-new-invitation"]
  ).store;
  await assert.rejects(
    issueStore.issueGuardianInvitationForTeacher({
      teacherId: "teacher-1",
      classId: "class-1",
      studentId: "student-1"
    }),
    /could not produce a unique token/u
  );
  assert.deepEqual(issueDatabase, beforeIssue);

  const revokeDatabase = createOccupiedDatabase();
  revokeDatabase.guardian_links.push({
    id: "student-1-active-link",
    parent_id: "parent-1",
    student_id: "student-1",
    relationship: "guardian",
    status: "active",
    invite_code: "",
    created_by: "parent-1",
    created_at: "2026-08-23T09:00:00.000Z",
    updated_at: "2026-08-23T09:00:00.000Z",
    revoked_at: null,
    revoked_by: null
  });
  const beforeRevoke = structuredClone(revokeDatabase);
  const revokeStore = createStore(
    revokeDatabase,
    Array.from({ length: 8 }, () => unrelatedToken),
    ["student-1-replacement-invitation"]
  ).store;
  await assert.rejects(
    revokeStore.revokeGuardianLinkForTeacher({
      teacherId: "teacher-1",
      classId: "class-1",
      studentId: "student-1",
      linkId: "student-1-active-link"
    }),
    /could not produce a unique token/u
  );
  assert.deepEqual(revokeDatabase, beforeRevoke);
});

test("guardian invitation version exhaustion fails before issue or revoke mutates authority", async () => {
  const createExhaustedDatabase = () => {
    const database = createDatabase();
    database.guardian_invitations = [{
      id: "student-1-max-version",
      student_id: "student-1",
      version: Number.MAX_SAFE_INTEGER,
      token_digest: digest(firstToken),
      expires_at: "2026-08-24T10:00:00.000Z",
      consumed_at: null,
      consumed_by_parent_id: null,
      consumed_relationship: null,
      consumed_link_id: null,
      revoked_at: null,
      created_by: "teacher-1",
      created_at: "2026-08-23T09:00:00.000Z"
    }];
    return database;
  };

  const issueDatabase = createExhaustedDatabase();
  const beforeIssue = structuredClone(issueDatabase);
  const issueHarness = createStore(
    issueDatabase,
    [secondToken],
    ["student-1-overflow-invitation"]
  );
  const issueStore = issueHarness.store;
  await assert.rejects(
    issueStore.issueGuardianInvitationForTeacher({
      teacherId: "teacher-1",
      classId: "class-1",
      studentId: "student-1"
    }),
    /version space is exhausted/u
  );
  assert.deepEqual(issueDatabase, beforeIssue);
  assert.deepEqual(
    issueHarness.generatorCalls,
    { id: 0, token: 0 },
    "version exhaustion must reject before generating any bearer or identifier"
  );

  const revokeDatabase = createExhaustedDatabase();
  revokeDatabase.guardian_links.push({
    id: "student-1-active-link",
    parent_id: "parent-1",
    student_id: "student-1",
    relationship: "guardian",
    status: "active",
    invite_code: "",
    created_by: "parent-1",
    created_at: "2026-08-23T09:00:00.000Z",
    updated_at: "2026-08-23T09:00:00.000Z",
    revoked_at: null,
    revoked_by: null
  });
  const beforeRevoke = structuredClone(revokeDatabase);
  const revokeHarness = createStore(
    revokeDatabase,
    [secondToken],
    ["student-1-overflow-replacement"]
  );
  const revokeStore = revokeHarness.store;
  await assert.rejects(
    revokeStore.revokeGuardianLinkForTeacher({
      teacherId: "teacher-1",
      classId: "class-1",
      studentId: "student-1",
      linkId: "student-1-active-link"
    }),
    /version space is exhausted/u
  );
  assert.deepEqual(revokeDatabase, beforeRevoke);
  assert.deepEqual(
    revokeHarness.generatorCalls,
    { id: 0, token: 0 },
    "version exhaustion must reject before generating replacement authority"
  );
});

test("guardian invitation migration quarantines a student's full history when the latest version is ambiguous", async () => {
  for (const attemptedToken of [firstToken, secondToken, thirdToken]) {
    const database = createDatabase();
    database.guardian_invitations = [
      {
        id: "student-1-old-v1",
        student_id: "student-1",
        version: 1,
        token_digest: digest(firstToken),
        expires_at: "2026-08-24T10:00:00.000Z",
        consumed_at: null,
        consumed_by_parent_id: null,
        consumed_relationship: null,
        consumed_link_id: null,
        revoked_at: null,
        created_by: "teacher-1",
        created_at: "2026-08-22T10:00:00.000Z"
      },
      ...[secondToken, thirdToken].map((token, index) => ({
        id: `student-1-ambiguous-v2-${index + 1}`,
        student_id: "student-1",
        version: 2,
        token_digest: digest(token),
        expires_at: "2026-08-24T10:00:00.000Z",
        consumed_at: null,
        consumed_by_parent_id: null,
        consumed_relationship: null,
        consumed_link_id: null,
        revoked_at: null,
        created_by: "teacher-1",
        created_at: "2026-08-23T10:00:00.000Z"
      })),
      {
        id: "student-2-valid-v1",
        student_id: "student-2",
        version: 1,
        token_digest: digest(unrelatedToken),
        expires_at: "2026-08-24T10:00:00.000Z",
        consumed_at: null,
        consumed_by_parent_id: null,
        consumed_relationship: null,
        consumed_link_id: null,
        revoked_at: null,
        created_by: "teacher-2",
        created_at: "2026-08-23T10:00:00.000Z"
      }
    ];
    const { store } = createStore(database);

    assert.deepEqual(await store.linkParentToStudentByInviteCode({
      parentId: "parent-1",
      inviteCode: attemptedToken
    }), { status: "not-found" }, attemptedToken);
    assert.deepEqual(
      database.guardian_invitations.map((invitation) => ({
        studentId: invitation.student_id,
        version: invitation.version
      })),
      [{ studentId: "student-2", version: 1 }],
      attemptedToken
    );
    assert.equal(database.guardian_links.some((link) => link.status === "active"), false, attemptedToken);
  }
});

test("guardian invitation migration quarantines attributable malformed history without disabling independent students", async () => {
  for (const attemptedToken of [firstToken, secondToken]) {
    const database = createDatabase();
    database.guardian_invitations = [
      {
        id: "student-1-valid-v1",
        student_id: "student-1",
        version: 1,
        token_digest: digest(firstToken),
        expires_at: "2026-08-24T10:00:00.000Z",
        consumed_at: null,
        consumed_by_parent_id: null,
        consumed_relationship: null,
        consumed_link_id: null,
        revoked_at: null,
        created_by: "teacher-1",
        created_at: "2026-08-22T10:00:00.000Z"
      },
      {
        id: "student-1-malformed-v2",
        student_id: "student-1",
        version: 2,
        token_digest: digest(secondToken),
        expires_at: "not-an-iso-timestamp",
        consumed_at: null,
        consumed_by_parent_id: null,
        consumed_relationship: null,
        consumed_link_id: null,
        revoked_at: null,
        created_by: "teacher-1",
        created_at: "2026-08-23T10:00:00.000Z"
      },
      {
        id: "student-2-valid-v1",
        student_id: "student-2",
        version: 1,
        token_digest: digest(unrelatedToken),
        expires_at: "2026-08-24T10:00:00.000Z",
        consumed_at: null,
        consumed_by_parent_id: null,
        consumed_relationship: null,
        consumed_link_id: null,
        revoked_at: null,
        created_by: "teacher-2",
        created_at: "2026-08-23T10:00:00.000Z"
      }
    ];
    const { store } = createStore(database);

    assert.deepEqual(await store.linkParentToStudentByInviteCode({
      parentId: "parent-1",
      inviteCode: attemptedToken
    }), { status: "not-found" }, attemptedToken);
    assert.deepEqual(
      database.guardian_invitations.map((invitation) => invitation.student_id),
      ["student-2"],
      attemptedToken
    );
    assert.equal(database.guardian_links.some((link) => link.status === "active"), false, attemptedToken);
  }
});

test("malformed invitation collisions fail closed only for attributable students", async () => {
  for (const collision of ["id", "digest"] as const) {
    for (const attemptedToken of [firstToken, secondToken, unrelatedToken]) {
      const database = createDatabase();
      const independentId = "student-2-valid-v1";
      const independentDigest = digest(unrelatedToken);
      database.guardian_invitations = [
        {
          id: "student-1-valid-v1",
          student_id: "student-1",
          version: 1,
          token_digest: digest(firstToken),
          expires_at: "2026-08-24T10:00:00.000Z",
          consumed_at: null,
          consumed_by_parent_id: null,
          consumed_relationship: null,
          consumed_link_id: null,
          revoked_at: null,
          created_by: "teacher-1",
          created_at: "2026-08-22T10:00:00.000Z"
        },
        {
          id: collision === "id" ? independentId : "student-1-malformed-v2",
          student_id: "student-1",
          version: 2,
          token_digest: collision === "digest" ? independentDigest : digest(secondToken),
          expires_at: "not-an-iso-timestamp",
          consumed_at: null,
          consumed_by_parent_id: null,
          consumed_relationship: null,
          consumed_link_id: null,
          revoked_at: null,
          created_by: "teacher-1",
          created_at: "2026-08-23T10:00:00.000Z"
        },
        {
          id: independentId,
          student_id: "student-2",
          version: 1,
          token_digest: independentDigest,
          expires_at: "2026-08-24T10:00:00.000Z",
          consumed_at: null,
          consumed_by_parent_id: null,
          consumed_relationship: null,
          consumed_link_id: null,
          revoked_at: null,
          created_by: "teacher-2",
          created_at: "2026-08-23T10:00:00.000Z"
        }
      ];
      const { store } = createStore(database);

      assert.deepEqual(await store.linkParentToStudentByInviteCode({
        parentId: "parent-1",
        inviteCode: attemptedToken
      }), { status: "not-found" }, `${collision}:${attemptedToken}`);
      assert.deepEqual(database.guardian_invitations, [], collision);
      assert.equal(database.guardian_links.some((link) => link.status === "active"), false, collision);
    }
  }
});

test("unassigned malformed identities quarantine every connected guardian authority", async () => {
  const validInvitation = (
    id: string,
    studentId: string,
    version: number,
    token: string,
    createdBy: string
  ): GuardianInvitationTestRecord => ({
    id,
    student_id: studentId,
    version,
    token_digest: digest(token),
    expires_at: "2026-08-24T10:00:00.000Z",
    consumed_at: null,
    consumed_by_parent_id: null,
    consumed_relationship: null,
    consumed_link_id: null,
    revoked_at: null,
    created_by: createdBy,
    created_at: "2026-08-23T09:00:00.000Z"
  });
  const malformedInvitation = (
    id: string,
    token: string,
    studentId?: string
  ) => ({
    id,
    ...(studentId === undefined ? {} : { student_id: studentId }),
    version: 2,
    token_digest: digest(token),
    expires_at: "not-an-iso-timestamp",
    consumed_at: null,
    consumed_by_parent_id: null,
    consumed_relationship: null,
    consumed_link_id: null,
    revoked_at: null,
    created_by: "teacher-1",
    created_at: "2026-08-23T10:00:00.000Z"
  }) as GuardianInvitationTestRecord;
  const independent = () => validInvitation(
    "student-2-independent",
    "student-2",
    1,
    unrelatedToken,
    "teacher-2"
  );

  const scenarios: Array<{
    name: string;
    invitations: GuardianInvitationTestRecord[];
    attemptedTokens: string[];
    remainingStudentIds: string[];
  }> = [
    {
      name: "shared-id-only",
      invitations: [
        validInvitation("student-1-valid-v1", "student-1", 1, firstToken, "teacher-1"),
        malformedInvitation("student-1-valid-v1", secondToken),
        independent()
      ],
      attemptedTokens: [firstToken, secondToken],
      remainingStudentIds: ["student-2"]
    },
    {
      name: "shared-digest-only-with-empty-student-id",
      invitations: [
        validInvitation("student-1-valid-v1", "student-1", 1, firstToken, "teacher-1"),
        malformedInvitation("unassigned-unique-id", firstToken, ""),
        independent()
      ],
      attemptedTokens: [firstToken],
      remainingStudentIds: ["student-2"]
    },
    {
      name: "shared-id-and-digest",
      invitations: [
        validInvitation("student-1-valid-v1", "student-1", 1, firstToken, "teacher-1"),
        malformedInvitation("student-1-valid-v1", firstToken),
        independent()
      ],
      attemptedTokens: [firstToken],
      remainingStudentIds: ["student-2"]
    },
    {
      name: "transitive-cross-student-collision-graph",
      invitations: [
        validInvitation("student-1-valid-v1", "student-1", 1, firstToken, "teacher-1"),
        validInvitation("student-2-valid-v1", "student-2", 1, secondToken, "teacher-2"),
        malformedInvitation("student-1-valid-v1", thirdToken),
        malformedInvitation("student-2-valid-v1", thirdToken, "")
      ],
      attemptedTokens: [firstToken, secondToken, thirdToken],
      remainingStudentIds: []
    }
  ];

  for (const scenario of scenarios) {
    for (const attemptedToken of scenario.attemptedTokens) {
      const database = createDatabase();
      database.guardian_invitations = structuredClone(scenario.invitations);
      const { store } = createStore(database);

      assert.deepEqual(await store.linkParentToStudentByInviteCode({
        parentId: "parent-1",
        inviteCode: attemptedToken
      }), { status: "not-found" }, `${scenario.name}:${attemptedToken}`);
      assert.deepEqual(
        database.guardian_invitations.map((invitation) => invitation.student_id),
        scenario.remainingStudentIds,
        scenario.name
      );
      assert.equal(
        database.guardian_links.some((link) => link.status === "active"),
        false,
        scenario.name
      );
    }
  }
});

test("unconnected unassigned garbage is scrubbed without changing valid guardian authority", async () => {
  const createDatabaseWithGarbage = () => {
    const database = createDatabase();
    database.guardian_invitations = [
      {
        id: "student-2-valid-v1",
        student_id: "student-2",
        version: 1,
        token_digest: digest(unrelatedToken),
        expires_at: "2026-08-24T10:00:00.000Z",
        consumed_at: null,
        consumed_by_parent_id: null,
        consumed_relationship: null,
        consumed_link_id: null,
        revoked_at: null,
        created_by: "teacher-2",
        created_at: "2026-08-23T10:00:00.000Z"
      },
      {
        id: "unassigned-unique-garbage",
        token_digest: digest(secondToken),
        expires_at: "not-an-iso-timestamp"
      } as GuardianInvitationTestRecord
    ];
    return database;
  };

  const validDatabase = createDatabaseWithGarbage();
  const validStore = createStore(validDatabase).store;
  const linked = await validStore.linkParentToStudentByInviteCode({
    parentId: "parent-2",
    inviteCode: unrelatedToken
  });
  assert.equal(linked.status, "linked");
  assert.equal(validDatabase.guardian_links.filter((link) => link.status === "active").length, 1);
  assert.equal(validDatabase.guardian_invitations.length, 1);

  const garbageDatabase = createDatabaseWithGarbage();
  const garbageStore = createStore(garbageDatabase).store;
  assert.deepEqual(await garbageStore.linkParentToStudentByInviteCode({
    parentId: "parent-1",
    inviteCode: secondToken
  }), { status: "not-found" });
  assert.deepEqual(garbageDatabase.guardian_invitations.map((record) => record.student_id), ["student-2"]);
  assert.equal(garbageDatabase.guardian_links.some((link) => link.status === "active"), false);
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

  const rawRecords = [
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
    },
    {
      id: "valid-independent",
      student_id: "student-2",
      version: 1,
      token_digest: digest(unrelatedToken).toUpperCase(),
      expires_at: "2026-08-24T10:00:00.000Z",
      consumed_at: null,
      consumed_by_parent_id: null,
      revoked_at: null,
      created_by: "teacher-2",
      created_at: "2026-08-23T10:00:00.000Z"
    },
    {
      id: "unassigned-unique-normalization-garbage",
      token_digest: digest(thirdToken),
      expires_at: "not-an-iso-timestamp"
    }
  ];
  const normalized = (helpers.normalizeGuardianInvitationRecords as (
    records: unknown[],
    now: string
  ) => GuardianInvitationTestRecord[])(rawRecords, "2026-08-23T10:00:00.000Z");
  assert.deepEqual(normalized, [{
    id: "valid-independent",
    student_id: "student-2",
    version: 1,
    token_digest: digest(unrelatedToken),
    expires_at: "2026-08-24T10:00:00.000Z",
    consumed_at: null,
    consumed_by_parent_id: null,
    consumed_relationship: null,
    consumed_link_id: null,
    revoked_at: null,
    created_by: "teacher-2",
    created_at: "2026-08-23T10:00:00.000Z"
  }]);
  assert.doesNotMatch(JSON.stringify(normalized), new RegExp(firstToken));

  const needsSync = helpers.guardianInvitationRecordsNeedPersistenceSync as (
    records: unknown,
    normalizedRecords: GuardianInvitationTestRecord[],
    options?: { allowSafeSanitization?: boolean }
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
  assert.equal(needsSync(rawRecords, normalized), true, "SQLite/default reads must persist sanitized invitation rows");
  assert.equal(
    needsSync(rawRecords, normalized, { allowSafeSanitization: true }),
    false,
    "Postgres completeness may accept the fail-closed normalized view without a read-side write"
  );
  assert.equal(
    needsSync("legacy-plaintext-collection", [], { allowSafeSanitization: true }),
    true,
    "a non-array collection is not a safely normalizable Postgres snapshot"
  );
  assert.equal(
    needsSync(rawRecords, [], { allowSafeSanitization: true }),
    true,
    "Postgres completeness must reject a caller-supplied view that is not the canonical safe normalization"
  );
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
  assert.match(
    rootSource,
    /guardianInvitationRecordsNeedPersistenceSyncFromParentAccess\(\s*parsed\.guardian_invitations,\s*database\.guardian_invitations,\s*\{ allowSafeSanitization: allowGuardianInvitationSanitization \}\s*\)/u
  );
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

  assert.match(
    rootSource,
    /databaseNeedsPersistenceSync\(parsed, database, \{\s*allowGuardianInvitationSanitization: true\s*\}\)/u,
    "only Postgres snapshot completeness may accept a safely normalized guardian invitation array"
  );
  assert.match(
    rootSource,
    /databaseNeedsPersistenceSync\(latest\.parsed, latest\.database\) \|\| !latest\.metadata/u,
    "SQLite must retain read-side sanitized snapshot persistence"
  );

  const userStore = await import("@/lib/server/userStore") as Record<string, unknown>;
  const hooks = userStore.__userStorePostgresStorageReadinessTestHooks as {
    createCompleteSnapshot: () => Record<string, unknown>;
  };
  const snapshotContractIsComplete = userStore.postgresStorageSnapshotContractIsComplete as (value: unknown) => boolean;
  const postgresSnapshot = hooks.createCompleteSnapshot();
  postgresSnapshot.guardian_invitations = [
    {
      id: "postgres-student-1-valid-v1",
      student_id: "student-1",
      version: 1,
      token_digest: digest(firstToken),
      expires_at: "2026-08-24T10:00:00.000Z",
      consumed_at: null,
      consumed_by_parent_id: null,
      consumed_relationship: null,
      consumed_link_id: null,
      revoked_at: null,
      created_by: "teacher-1",
      created_at: "2026-08-22T10:00:00.000Z"
    },
    {
      id: "postgres-student-1-valid-v1",
      version: 2,
      token_digest: digest(secondToken),
      expires_at: "not-an-iso-timestamp",
      created_by: "teacher-1",
      created_at: "2026-08-23T10:00:00.000Z"
    },
    {
      id: "postgres-student-2-valid-v1",
      student_id: "student-2",
      version: 1,
      token_digest: digest(unrelatedToken),
      expires_at: "2026-08-24T10:00:00.000Z",
      consumed_at: null,
      consumed_by_parent_id: null,
      consumed_relationship: null,
      consumed_link_id: null,
      revoked_at: null,
      created_by: "teacher-2",
      created_at: "2026-08-23T10:00:00.000Z"
    }
  ];
  const beforePostgresRead = structuredClone(postgresSnapshot);
  assert.equal(snapshotContractIsComplete(postgresSnapshot), true);
  assert.deepEqual(postgresSnapshot, beforePostgresRead, "Postgres completeness must not write during a read");
  assert.equal(snapshotContractIsComplete({
    ...postgresSnapshot,
    guardian_invitations: "not-an-array"
  }), false);

  const repairDatabase = createDatabase();
  repairDatabase.guardian_invitations = structuredClone(
    postgresSnapshot.guardian_invitations
  ) as GuardianInvitationTestRecord[];
  const repairStore = createStore(
    repairDatabase,
    [thirdToken],
    ["postgres-student-2-repaired-v2"]
  ).store;
  const repaired = await repairStore.issueGuardianInvitationForTeacher({
    teacherId: "teacher-2",
    classId: "class-2",
    studentId: "student-2"
  });
  assert.equal(repaired.status, "issued");
  assert.equal(repairDatabase.guardian_invitations.some((record) => record.student_id === "student-1"), false);
  assert.deepEqual(
    repairDatabase.guardian_invitations.map((record) => [record.student_id, record.version]),
    [["student-2", 1], ["student-2", 2]]
  );
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

test("teacher revocation atomically rotates the invitation, persists the revoke, and prevents old-code restoration", async () => {
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
  assert.deepEqual(revoked, {
    status: "revoked",
    revokedAt: "2026-08-23T10:00:00.000Z",
    invitation: {
      version: 2,
      token: secondToken,
      expiresAt: "2026-08-24T10:00:00.000Z"
    }
  });
  assert.equal(await store.parentCanAccessStudent("parent-1", "student-1"), false);
  assert.equal(database.guardian_invitations[0]?.revoked_at, "2026-08-23T10:00:00.000Z");
  assert.equal(database.guardian_invitations[1]?.version, 2);
  assert.equal(database.guardian_invitations[1]?.token_digest, digest(secondToken));
  assert.equal(database.guardian_invitations[1]?.revoked_at, null);
  assert.doesNotMatch(JSON.stringify(database), new RegExp(secondToken));
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
