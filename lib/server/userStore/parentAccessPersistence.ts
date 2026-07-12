import { randomUUID } from "crypto";
import { parentInviteCodeMaxLength } from "@/lib/parentConstraints";
import type {
  GradeId,
  GuardianLink,
  GuardianLinkStatus,
  GuardianRelationship,
  StudentSession
} from "@/types";

type UserRole = StudentSession["role"];

type ParentAccessUserRecord = {
  id: string;
  username?: string;
  role: UserRole;
};

type ParentAccessGuardianLinkRecord = {
  id?: string;
  parent_id: string;
  student_id: string;
  relationship?: GuardianRelationship;
  status: string;
  invite_code?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type ParentAccessSeedGuardianLinkRecord = {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: GuardianRelationship;
  status: GuardianLinkStatus;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ParentAccessNormalizedGuardianLinkRecord = ParentAccessGuardianLinkRecord & {
  id: string;
  relationship: GuardianRelationship;
  status: GuardianLinkStatus;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ParentAccessStudentProfileRecord = {
  user_id: string;
  name?: string;
  grade?: GradeId;
  parent_invite_code?: string;
};

export type ParentAccessPersistenceDatabase = {
  guardian_links: ParentAccessGuardianLinkRecord[];
  student_profiles?: ParentAccessStudentProfileRecord[];
  users: ParentAccessUserRecord[];
};

export type ParentAccessPersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<ParentAccessPersistenceDatabase>;
  mutateDatabase?: <T>(
    mutator: (database: ParentAccessPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
};

export type ParentAccessPersistenceStore = ReturnType<typeof createParentAccessPersistenceStore>;

const validGuardianRelationships = new Set<GuardianRelationship>(["mother", "father", "guardian", "other"]);
const validGuardianLinkStatuses = new Set<GuardianLinkStatus>(["pending", "active", "revoked"]);

export function isValidGuardianRelationship(value: unknown): value is GuardianRelationship {
  return validGuardianRelationships.has(value as GuardianRelationship);
}

export function normalizeGuardianRelationship(value: unknown): GuardianRelationship {
  return isValidGuardianRelationship(value) ? value : "guardian";
}

export function isValidGuardianLinkStatus(value: unknown): value is GuardianLinkStatus {
  return validGuardianLinkStatuses.has(value as GuardianLinkStatus);
}

export function normalizeGuardianLinkStatus(value: unknown): GuardianLinkStatus {
  return isValidGuardianLinkStatus(value) ? value : "pending";
}

export function normalizeParentInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

export function createParentInviteCode(createId: () => string = randomUUID) {
  return `MAIS-${createId().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

export function normalizeParentAccessGuardianLinkRecord<Record extends ParentAccessGuardianLinkRecord>(
  link: Record,
  now: string,
  createInviteCode: () => string = createParentInviteCode
): Record & {
  relationship: GuardianRelationship;
  status: GuardianLinkStatus;
  invite_code: string;
  created_at: string;
  updated_at: string;
} {
  const inviteCode = normalizeParentInviteCode(link.invite_code || createInviteCode());
  return {
    ...link,
    relationship: normalizeGuardianRelationship(link.relationship),
    status: normalizeGuardianLinkStatus(link.status),
    invite_code: inviteCode || createInviteCode(),
    updated_at: link.updated_at ?? link.created_at ?? now,
    created_at: link.created_at ?? now
  };
}

function mergeParentAccessSeedRecordsPreservingExisting<T>(
  existingRecords: T[] | undefined,
  seedRecords: T[],
  keyFor: (record: T) => string
) {
  const existingByKey = new Map((existingRecords ?? []).map((record) => [keyFor(record), record]));
  const seedKeys = new Set(seedRecords.map(keyFor));
  const seedOrExistingRecords = seedRecords.map((record) => existingByKey.get(keyFor(record)) ?? record);
  const extraRecords = (existingRecords ?? []).filter((record) => !seedKeys.has(keyFor(record)));
  return [...seedOrExistingRecords, ...extraRecords];
}

export function parentAccessSeedGuardianLinks(
  now: string,
  {
    shouldSeedDemoUser,
    demoParentId,
    demoUserId,
    demoTeacherId,
    createParentInviteCode: createInviteCode = createParentInviteCode
  }: {
    shouldSeedDemoUser: () => boolean;
    demoParentId: string;
    demoUserId: string;
    demoTeacherId: string;
    createParentInviteCode?: () => string;
  }
): ParentAccessSeedGuardianLinkRecord[] {
  return shouldSeedDemoUser()
    ? [
        {
          id: "guardian-link-peter-family",
          parent_id: demoParentId,
          student_id: demoUserId,
          relationship: "guardian",
          status: "active",
          invite_code: createInviteCode(),
          created_by: demoTeacherId,
          created_at: now,
          updated_at: now
        }
    ]
    : [];
}

export function normalizeParentAccessGuardianLinkRecords(
  records: ParentAccessGuardianLinkRecord[] | undefined,
  now: string,
  options: {
    shouldSeedDemoUser: () => boolean;
    demoParentId: string;
    demoUserId: string;
    demoTeacherId: string;
    createParentInviteCode?: () => string;
  }
): ParentAccessNormalizedGuardianLinkRecord[] {
  return mergeParentAccessSeedRecordsPreservingExisting(
    records,
    parentAccessSeedGuardianLinks(now, options),
    (link) => link.id ?? ""
  ).map((link) => {
    const normalized = normalizeParentAccessGuardianLinkRecord(link, now, options.createParentInviteCode);
    return {
      ...normalized,
      id: normalized.id ?? "",
      created_by: normalized.created_by ?? normalized.parent_id
    };
  });
}

export function uniqueParentInviteCode(
  database: Pick<ParentAccessPersistenceDatabase, "student_profiles" | "guardian_links">,
  createId: () => string = randomUUID
) {
  const existingCodes = new Set([
    ...(database.student_profiles ?? [])
      .map((profile) => normalizeParentInviteCode(profile.parent_invite_code ?? ""))
      .filter(Boolean),
    ...database.guardian_links
      .map((link) => normalizeParentInviteCode(link.invite_code ?? ""))
      .filter(Boolean)
  ]);
  let code = createParentInviteCode(createId);
  while (existingCodes.has(code)) code = createParentInviteCode(createId);
  return code;
}

export function ensureParentInviteCodeInDatabase(
  database: Pick<ParentAccessPersistenceDatabase, "student_profiles" | "guardian_links">,
  studentId: string,
  createId: () => string = randomUUID
) {
  const profile = database.student_profiles?.find((candidate) => candidate.user_id === studentId);
  if (!profile) return null;
  const existingCode = normalizeParentInviteCode(profile.parent_invite_code ?? "");
  if (existingCode) {
    profile.parent_invite_code = existingCode;
    return existingCode;
  }

  const inviteCode = uniqueParentInviteCode(database, createId);
  profile.parent_invite_code = inviteCode;
  return inviteCode;
}

export function canUseParentArea(user?: ParentAccessUserRecord | null): user is ParentAccessUserRecord {
  return user?.role === "parent" || user?.role === "admin";
}

function studentProfileFor(database: ParentAccessPersistenceDatabase, userId: string) {
  return database.student_profiles?.find((profile) => profile.user_id === userId);
}

export function toGuardianLink(database: ParentAccessPersistenceDatabase, record: ParentAccessGuardianLinkRecord): GuardianLink {
  const parentProfile = studentProfileFor(database, record.parent_id);
  const parentUser = database.users.find((candidate) => candidate.id === record.parent_id);
  const studentProfile = studentProfileFor(database, record.student_id);
  const studentUser = database.users.find((candidate) => candidate.id === record.student_id);

  return {
    id: record.id ?? "",
    parentId: record.parent_id,
    parentName: parentProfile?.name ?? parentUser?.username ?? "Parent",
    studentId: record.student_id,
    studentName: studentProfile?.name ?? studentUser?.username ?? "Student",
    studentGrade: studentProfile?.grade ?? "S3",
    relationship: normalizeGuardianRelationship(record.relationship),
    status: normalizeGuardianLinkStatus(record.status),
    inviteCode: record.invite_code ?? "",
    createdBy: record.created_by ?? record.parent_id,
    createdAt: record.created_at ?? "",
    updatedAt: record.updated_at ?? record.created_at ?? ""
  };
}

export function parentCanAccessStudentInDatabase(
  database: ParentAccessPersistenceDatabase,
  parentId: string,
  studentId: string
) {
  const parent = database.users.find((candidate) => candidate.id === parentId);
  if (parent?.role === "admin") {
    return database.users.some((candidate) => candidate.id === studentId && candidate.role === "student");
  }
  return database.guardian_links.some((link) => (
    link.parent_id === parentId &&
    link.student_id === studentId &&
    link.status === "active"
  ));
}

export function createParentAccessPersistenceStore({
  createId = () => `guardian-link-${randomUUID()}`,
  now = () => new Date(),
  mutateDatabase,
  readDatabase
}: ParentAccessPersistenceStoreDependencies) {
  const runMutation = async <T>(mutator: (database: ParentAccessPersistenceDatabase) => T | Promise<T>) => {
    if (!mutateDatabase) {
      throw new Error("Parent access persistence mutation dependency is not configured.");
    }
    return mutateDatabase(mutator);
  };

  return {
    async parentCanAccessStudent(parentId: string, studentId: string) {
      const database = await readDatabase();
      return parentCanAccessStudentInDatabase(database, parentId, studentId);
    },
    async linkParentToStudentByInviteCode({
      parentId,
      inviteCode,
      relationship = "guardian"
    }: {
      parentId: string;
      inviteCode: string;
      relationship?: GuardianRelationship;
    }) {
      const normalizedCode = normalizeParentInviteCode(inviteCode);
      if (!normalizedCode || normalizedCode.length > parentInviteCodeMaxLength) return { status: "invalid" as const };
      if (relationship !== undefined && !isValidGuardianRelationship(relationship)) return { status: "invalid" as const };

      return runMutation((database) => {
        const parent = database.users.find((candidate) => candidate.id === parentId);
        if (!canUseParentArea(parent)) return { status: "forbidden" as const };

        const studentId = database.student_profiles?.find((profile) =>
          normalizeParentInviteCode(profile.parent_invite_code ?? "") === normalizedCode
        )?.user_id;
        if (!studentId) return { status: "not-found" as const };

        const existingParentLink = database.guardian_links.find((link) =>
          link.parent_id === parent.id && link.student_id === studentId
        );
        const updatedAt = now().toISOString();

        if (existingParentLink) {
          existingParentLink.status = "active";
          existingParentLink.relationship = relationship;
          existingParentLink.invite_code = normalizedCode;
          existingParentLink.updated_at = updatedAt;
          return { status: "linked" as const, link: toGuardianLink(database, existingParentLink) };
        }

        const link: ParentAccessGuardianLinkRecord = {
          id: createId(),
          parent_id: parent.id,
          student_id: studentId,
          relationship,
          status: "active",
          invite_code: normalizedCode,
          created_by: parent.id,
          created_at: updatedAt,
          updated_at: updatedAt
        };
        database.guardian_links.push(link);
        return { status: "linked" as const, link: toGuardianLink(database, link) };
      });
    }
  };
}
