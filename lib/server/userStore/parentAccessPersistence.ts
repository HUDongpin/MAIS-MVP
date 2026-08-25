import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import {
  guardianInviteTokenHexLength,
  guardianInviteTokenPrefix,
  guardianInviteTtlMs,
  isValidGuardianInviteToken,
  normalizeGuardianInviteToken,
  parentInviteCodeMaxLength
} from "@/lib/parentConstraints";
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
  revoked_at?: string | null;
  revoked_by?: string | null;
};

export type GuardianInvitationRecord = {
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
  revoked_at?: string | null;
  revoked_by?: string | null;
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
  guardian_invitations?: GuardianInvitationRecord[];
  guardian_links: ParentAccessGuardianLinkRecord[];
  teacher_classes?: Array<{ id: string; teacher_id: string }>;
  class_enrollments?: Array<{ class_id: string; student_id: string }>;
  school_memberships?: Array<{ user_id: string; role: string; class_id?: string }>;
  student_profiles?: ParentAccessStudentProfileRecord[];
  users: ParentAccessUserRecord[];
};

export type ParentAccessPersistenceStoreDependencies = {
  createId?: () => string;
  createInviteToken?: () => string;
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
  return normalizeGuardianInviteToken(value);
}

export function createGuardianInviteToken() {
  return `${guardianInviteTokenPrefix}${randomBytes(guardianInviteTokenHexLength / 2).toString("hex").toUpperCase()}`;
}

export function guardianInviteTokenDigest(token: string) {
  return createHash("sha256").update(normalizeGuardianInviteToken(token)).digest("hex");
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function guardianInvitationIdentityKeys(record: Partial<GuardianInvitationRecord>) {
  const keys: string[] = [];
  if (typeof record.id === "string" && record.id.trim()) {
    keys.push(JSON.stringify(["id", record.id]));
  }
  if (typeof record.token_digest === "string" && /^[a-f0-9]{64}$/i.test(record.token_digest)) {
    keys.push(JSON.stringify(["digest", record.token_digest.toLowerCase()]));
  }
  return keys;
}

export function normalizeGuardianInvitationRecords(
  records: unknown,
  _now: string
): GuardianInvitationRecord[] {
  if (!Array.isArray(records)) return [];
  const ambiguousStudentIds = new Set<string>();
  const identityNeighbors = new Map<string, Set<string>>();
  const malformedIdentityKeys = new Set<string>();
  const attributableIdCounts = new Map<string, number>();
  const attributableDigestCounts = new Map<string, number>();
  const attributableStudentVersionCounts = new Map<string, number>();
  for (const value of records) {
    if (!value || typeof value !== "object") continue;
    const record = value as Partial<GuardianInvitationRecord>;
    const identityKeys = guardianInvitationIdentityKeys(record);
    for (const key of identityKeys) {
      if (!identityNeighbors.has(key)) identityNeighbors.set(key, new Set());
    }
    for (let index = 1; index < identityKeys.length; index += 1) {
      identityNeighbors.get(identityKeys[0]!)?.add(identityKeys[index]!);
      identityNeighbors.get(identityKeys[index]!)?.add(identityKeys[0]!);
    }
    const studentId = typeof record.student_id === "string" ? record.student_id.trim() : "";
    if (!studentId) continue;
    if (typeof record.id === "string" && record.id.trim()) {
      attributableIdCounts.set(record.id, (attributableIdCounts.get(record.id) ?? 0) + 1);
    }
    if (typeof record.token_digest === "string" && /^[a-f0-9]{64}$/i.test(record.token_digest)) {
      const digest = record.token_digest.toLowerCase();
      attributableDigestCounts.set(digest, (attributableDigestCounts.get(digest) ?? 0) + 1);
    }
    if (Number.isSafeInteger(record.version) && (record.version ?? 0) >= 1) {
      const studentVersionKey = JSON.stringify([studentId, record.version]);
      attributableStudentVersionCounts.set(
        studentVersionKey,
        (attributableStudentVersionCounts.get(studentVersionKey) ?? 0) + 1
      );
    }
  }

  const normalized = records.flatMap((value): GuardianInvitationRecord[] => {
    if (!value || typeof value !== "object") return [];
    const record = value as Partial<GuardianInvitationRecord>;
    const attributableStudentId = typeof record.student_id === "string" ? record.student_id.trim() : "";
    const rejectRecord = () => {
      if (attributableStudentId) ambiguousStudentIds.add(attributableStudentId);
      for (const key of guardianInvitationIdentityKeys(record)) malformedIdentityKeys.add(key);
      return [] as GuardianInvitationRecord[];
    };
    if (
      typeof record.id !== "string" || !record.id ||
      typeof record.student_id !== "string" || !record.student_id || record.student_id !== attributableStudentId ||
      !Number.isSafeInteger(record.version) || (record.version ?? 0) < 1 ||
      typeof record.token_digest !== "string" || !/^[a-f0-9]{64}$/i.test(record.token_digest) ||
      !isIsoTimestamp(record.expires_at) ||
      typeof record.created_by !== "string" || !record.created_by ||
      !isIsoTimestamp(record.created_at) ||
      (record.revoked_at !== undefined && record.revoked_at !== null && !isIsoTimestamp(record.revoked_at))
    ) return rejectRecord();

    const hasConsumedAt = record.consumed_at !== undefined && record.consumed_at !== null;
    const consumedAt = isIsoTimestamp(record.consumed_at) ? record.consumed_at : null;
    const consumedByParentId = typeof record.consumed_by_parent_id === "string" && record.consumed_by_parent_id
      ? record.consumed_by_parent_id
      : null;
    const consumedRelationship = isValidGuardianRelationship(record.consumed_relationship)
      ? record.consumed_relationship
      : null;
    const consumedLinkId = typeof record.consumed_link_id === "string" && record.consumed_link_id
      ? record.consumed_link_id
      : null;
    const hasAnyConsumedMetadata = Boolean(
      record.consumed_by_parent_id || record.consumed_relationship || record.consumed_link_id
    );
    if (
      (hasConsumedAt && (!consumedAt || !consumedByParentId || !consumedRelationship || !consumedLinkId)) ||
      (!hasConsumedAt && hasAnyConsumedMetadata)
    ) return rejectRecord();

    return [{
      id: record.id,
      student_id: record.student_id,
      version: record.version as number,
      token_digest: record.token_digest.toLowerCase(),
      expires_at: record.expires_at,
      consumed_at: consumedAt,
      consumed_by_parent_id: consumedByParentId,
      consumed_relationship: consumedRelationship,
      consumed_link_id: consumedLinkId,
      revoked_at: isIsoTimestamp(record.revoked_at) ? record.revoked_at : null,
      created_by: record.created_by,
      created_at: record.created_at
    }];
  });

  for (const record of normalized) {
    if (
      attributableIdCounts.get(record.id) !== 1 ||
      attributableDigestCounts.get(record.token_digest) !== 1 ||
      attributableStudentVersionCounts.get(JSON.stringify([record.student_id, record.version])) !== 1
    ) {
      ambiguousStudentIds.add(record.student_id);
    }
  }

  const studentsByIdentity = new Map<string, Set<string>>();
  for (const record of normalized) {
    for (const key of guardianInvitationIdentityKeys(record)) {
      const students = studentsByIdentity.get(key) ?? new Set<string>();
      students.add(record.student_id);
      studentsByIdentity.set(key, students);
    }
  }
  const visitedIdentityKeys = new Set<string>();
  const pendingIdentityKeys = [...malformedIdentityKeys];
  while (pendingIdentityKeys.length > 0) {
    const key = pendingIdentityKeys.pop()!;
    if (visitedIdentityKeys.has(key)) continue;
    visitedIdentityKeys.add(key);
    for (const studentId of studentsByIdentity.get(key) ?? []) {
      ambiguousStudentIds.add(studentId);
    }
    for (const neighbor of identityNeighbors.get(key) ?? []) {
      if (!visitedIdentityKeys.has(neighbor)) pendingIdentityKeys.push(neighbor);
    }
  }

  // Malformed or colliding history must not be repaired by merely deleting the
  // conflicting rows: doing so can make an older bearer token authoritative
  // again. Propagate raw ID/digest collisions, then quarantine each affected
  // student's full invitation history while preserving independent students.
  return normalized.filter((record) => !ambiguousStudentIds.has(record.student_id));
}

export function guardianInvitationRecordsNeedPersistenceSync(
  records: unknown,
  normalizedRecords: GuardianInvitationRecord[],
  { allowSafeSanitization = false }: { allowSafeSanitization?: boolean } = {}
) {
  if (!Array.isArray(records)) return true;
  try {
    const canonicalRecords = normalizeGuardianInvitationRecords(records, "");
    if (JSON.stringify(canonicalRecords) !== JSON.stringify(normalizedRecords)) return true;
    if (JSON.stringify(records) === JSON.stringify(canonicalRecords)) return false;
    return !allowSafeSanitization;
  } catch {
    return true;
  }
}

const guardianInvitationGenerationAttempts = 8;

function existingGuardianInvitationIds(records: unknown, normalizedRecords: GuardianInvitationRecord[]) {
  const ids = new Set(normalizedRecords.map((record) => record.id));
  if (!Array.isArray(records)) return ids;
  for (const value of records) {
    if (!value || typeof value !== "object") continue;
    const id = (value as Partial<GuardianInvitationRecord>).id;
    if (typeof id === "string" && id.trim()) ids.add(id);
  }
  return ids;
}

function existingGuardianInvitationDigests(records: unknown, normalizedRecords: GuardianInvitationRecord[]) {
  const digests = new Set(normalizedRecords.map((record) => record.token_digest));
  if (!Array.isArray(records)) return digests;
  for (const value of records) {
    if (!value || typeof value !== "object") continue;
    const digest = (value as Partial<GuardianInvitationRecord>).token_digest;
    if (typeof digest === "string" && /^[a-f0-9]{64}$/i.test(digest)) digests.add(digest.toLowerCase());
  }
  return digests;
}

function createUniqueGuardianInvitationId(createId: () => string, existingIds: Set<string>) {
  for (let attempt = 0; attempt < guardianInvitationGenerationAttempts; attempt += 1) {
    const candidate = createId().trim();
    if (!candidate || existingIds.has(candidate)) continue;
    return candidate;
  }
  throw new Error("Guardian invitation ID generator could not produce a unique invitation ID.");
}

function nextGuardianInvitationVersion(
  invitations: GuardianInvitationRecord[],
  studentId: string
) {
  const previousVersion = invitations
    .filter((candidate) => candidate.student_id === studentId)
    .reduce((highest, candidate) => Math.max(highest, candidate.version), 0);
  const version = previousVersion + 1;
  if (!Number.isSafeInteger(version)) {
    throw new Error("Guardian invitation version space is exhausted.");
  }
  return version;
}

function guardianInviteDigestMatches(storedDigest: string, candidateDigest: string) {
  if (!/^[a-f0-9]{64}$/i.test(storedDigest) || !/^[a-f0-9]{64}$/i.test(candidateDigest)) return false;
  return timingSafeEqual(Buffer.from(storedDigest, "hex"), Buffer.from(candidateDigest, "hex"));
}

export function normalizeParentAccessGuardianLinkRecord<Record extends ParentAccessGuardianLinkRecord>(
  link: Record,
  now: string
): Record & {
  relationship: GuardianRelationship;
  status: GuardianLinkStatus;
  invite_code: string;
  created_at: string;
  updated_at: string;
} {
  return {
    ...link,
    relationship: normalizeGuardianRelationship(link.relationship),
    status: normalizeGuardianLinkStatus(link.status),
    invite_code: "",
    updated_at: link.updated_at ?? link.created_at ?? now,
    created_at: link.created_at ?? now,
    revoked_at: link.status === "revoked" ? link.revoked_at ?? link.updated_at ?? link.created_at ?? now : null,
    revoked_by: link.status === "revoked" ? link.revoked_by ?? null : null
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
    demoTeacherId
  }: {
    shouldSeedDemoUser: () => boolean;
    demoParentId: string;
    demoUserId: string;
    demoTeacherId: string;
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
          invite_code: "",
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
  }
): ParentAccessNormalizedGuardianLinkRecord[] {
  return mergeParentAccessSeedRecordsPreservingExisting(
    records,
    parentAccessSeedGuardianLinks(now, options),
    (link) => link.id ?? ""
  ).map((link) => {
    const normalized = normalizeParentAccessGuardianLinkRecord(link, now);
    return {
      ...normalized,
      id: normalized.id ?? "",
      created_by: normalized.created_by ?? normalized.parent_id
    };
  });
}

export function canUseParentArea(user?: ParentAccessUserRecord | null): user is ParentAccessUserRecord {
  return user?.role === "parent";
}

export function normalizeParentAccessLegacyInviteFields(database: ParentAccessPersistenceDatabase) {
  for (const profile of database.student_profiles ?? []) profile.parent_invite_code = "";
  for (const link of database.guardian_links) link.invite_code = "";
}

function teacherCanManageStudent(
  database: ParentAccessPersistenceDatabase,
  teacherId: string,
  classId: string,
  studentId: string
) {
  const teacher = database.users.find((candidate) => candidate.id === teacherId);
  if (teacher?.role !== "teacher") return { status: "forbidden" as const };

  const teacherClass = (database.teacher_classes ?? []).find((candidate) => candidate.id === classId);
  if (!teacherClass) return { status: "class-not-found" as const };
  const memberCanAccess = (database.school_memberships ?? []).some((membership) => (
    membership.user_id === teacherId &&
    membership.role === "teacher" &&
    membership.class_id === classId
  ));
  if (teacherClass.teacher_id !== teacherId && !memberCanAccess) return { status: "forbidden" as const };

  const enrolled = (database.class_enrollments ?? []).some((enrollment) => (
    enrollment.class_id === classId && enrollment.student_id === studentId
  ));
  const student = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
  if (!enrolled || !student) return { status: "student-not-found" as const };
  return { status: "allowed" as const };
}

function studentProfileFor(database: ParentAccessPersistenceDatabase, userId: string) {
  return database.student_profiles?.find((profile) => profile.user_id === userId);
}

export function toGuardianLink(database: ParentAccessPersistenceDatabase, record: ParentAccessGuardianLinkRecord): GuardianLink {
  const parentProfile = studentProfileFor(database, record.parent_id);
  const studentProfile = studentProfileFor(database, record.student_id);

  return {
    id: record.id ?? "",
    parentId: record.parent_id,
    parentName: parentProfile?.name ?? "Parent",
    studentId: record.student_id,
    studentName: studentProfile?.name ?? "Student",
    studentGrade: studentProfile?.grade ?? "S3",
    relationship: normalizeGuardianRelationship(record.relationship),
    status: normalizeGuardianLinkStatus(record.status),
    inviteCode: "",
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
  if (!canUseParentArea(parent)) return false;
  return database.guardian_links.some((link) => (
    link.parent_id === parentId &&
    link.student_id === studentId &&
    link.status === "active"
  ));
}

export function createParentAccessPersistenceStore({
  createId = () => `guardian-link-${randomUUID()}`,
  createInviteToken = createGuardianInviteToken,
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
      if (
        !normalizedCode ||
        normalizedCode.length > parentInviteCodeMaxLength ||
        !isValidGuardianInviteToken(normalizedCode)
      ) return { status: "invalid" as const };
      if (relationship !== undefined && !isValidGuardianRelationship(relationship)) return { status: "invalid" as const };

      return runMutation((database) => {
        normalizeParentAccessLegacyInviteFields(database);
        const parent = database.users.find((candidate) => candidate.id === parentId);
        if (!canUseParentArea(parent)) return { status: "forbidden" as const };

        const updatedAt = now().toISOString();
        const invitations = database.guardian_invitations = normalizeGuardianInvitationRecords(
          database.guardian_invitations,
          updatedAt
        );
        const candidateDigest = guardianInviteTokenDigest(normalizedCode);
        let invitation: GuardianInvitationRecord | undefined;
        for (const candidate of invitations) {
          if (guardianInviteDigestMatches(candidate.token_digest, candidateDigest)) invitation = candidate;
        }
        if (!invitation) return { status: "not-found" as const };

        const invitedStudent = database.users.find((candidate) => (
          candidate.id === invitation?.student_id && candidate.role === "student"
        ));
        if (!invitedStudent) {
          for (const candidate of invitations) {
            if (candidate.student_id === invitation.student_id && !candidate.revoked_at) {
              candidate.revoked_at = updatedAt;
            }
          }
          return { status: "not-found" as const };
        }

        const latestVersion = invitations
          .filter((candidate) => candidate.student_id === invitation.student_id)
          .reduce((highest, candidate) => Math.max(highest, candidate.version), 0);
        if (invitation.revoked_at || invitation.version !== latestVersion) return { status: "revoked" as const };

        if (!Number.isFinite(Date.parse(invitation.expires_at)) || Date.parse(invitation.expires_at) <= Date.parse(updatedAt)) {
          return { status: "expired" as const };
        }

        if (invitation.consumed_at) {
          const consumedLink = database.guardian_links.find((link) => (
            link.id === invitation.consumed_link_id &&
            link.parent_id === parent.id &&
            link.student_id === invitation.student_id &&
            link.status === "active"
          ));
          if (
            invitation.consumed_by_parent_id === parent.id &&
            invitation.consumed_relationship === relationship &&
            consumedLink
          ) {
            return { status: "linked" as const, link: toGuardianLink(database, consumedLink) };
          }
          return { status: "consumed" as const };
        }

        const existingActiveLink = database.guardian_links.find((link) => (
          link.parent_id === parent.id &&
          link.student_id === invitation.student_id &&
          link.status === "active"
        ));
        if (existingActiveLink && normalizeGuardianRelationship(existingActiveLink.relationship) !== relationship) {
          return { status: "conflict" as const };
        }
        const link: ParentAccessGuardianLinkRecord = {
          ...(existingActiveLink ?? {
            id: createId(),
            parent_id: parent.id,
            student_id: invitation.student_id,
            relationship,
            status: "active",
            invite_code: "",
            created_by: parent.id,
            created_at: updatedAt,
            updated_at: updatedAt,
            revoked_at: null,
            revoked_by: null
          })
        };
        if (!existingActiveLink) database.guardian_links.push(link);
        invitation.consumed_at = updatedAt;
        invitation.consumed_by_parent_id = parent.id;
        invitation.consumed_relationship = relationship;
        invitation.consumed_link_id = link.id ?? null;
        return { status: "linked" as const, link: toGuardianLink(database, link) };
      });
    },
    async issueGuardianInvitationForTeacher({
      teacherId,
      classId,
      studentId
    }: {
      teacherId: string;
      classId: string;
      studentId: string;
    }) {
      return runMutation((database) => {
        const access = teacherCanManageStudent(database, teacherId, classId, studentId);
        if (access.status !== "allowed") return access;

        const createdAt = now().toISOString();
        const rawInvitations = database.guardian_invitations;
        const invitations = normalizeGuardianInvitationRecords(
          rawInvitations,
          createdAt
        );
        const version = nextGuardianInvitationVersion(invitations, studentId);
        const existingDigests = existingGuardianInvitationDigests(rawInvitations, invitations);
        let token = "";
        let tokenDigest = "";
        for (let attempt = 0; attempt < guardianInvitationGenerationAttempts; attempt += 1) {
          const candidate = normalizeGuardianInviteToken(createInviteToken());
          if (!isValidGuardianInviteToken(candidate)) {
            throw new Error("Guardian invitation token generator returned an invalid token.");
          }
          const candidateDigest = guardianInviteTokenDigest(candidate);
          if (existingDigests.has(candidateDigest)) continue;
          token = candidate;
          tokenDigest = candidateDigest;
          break;
        }
        if (!token || !tokenDigest) {
          throw new Error("Guardian invitation token generator could not produce a unique token.");
        }
        const invitationId = createUniqueGuardianInvitationId(
          createId,
          existingGuardianInvitationIds(rawInvitations, invitations)
        );
        database.guardian_invitations = invitations;
        normalizeParentAccessLegacyInviteFields(database);
        for (const invitation of invitations) {
          if (invitation.student_id === studentId && !invitation.consumed_at && !invitation.revoked_at) {
            invitation.revoked_at = createdAt;
          }
        }

        const expiresAt = new Date(Date.parse(createdAt) + guardianInviteTtlMs).toISOString();
        invitations.push({
          id: invitationId,
          student_id: studentId,
          version,
          token_digest: tokenDigest,
          expires_at: expiresAt,
          consumed_at: null,
          consumed_by_parent_id: null,
          consumed_relationship: null,
          consumed_link_id: null,
          revoked_at: null,
          created_by: teacherId,
          created_at: createdAt
        });

        return {
          status: "issued" as const,
          invitation: { version, token, expiresAt }
        };
      });
    },
    async revokeGuardianLinkForTeacher({
      teacherId,
      classId,
      studentId,
      linkId
    }: {
      teacherId: string;
      classId: string;
      studentId: string;
      linkId: string;
    }) {
      return runMutation((database) => {
        const access = teacherCanManageStudent(database, teacherId, classId, studentId);
        if (access.status !== "allowed") return access;

        const link = database.guardian_links.find((candidate) => (
          candidate.id === linkId && candidate.student_id === studentId
        ));
        if (!link) return { status: "link-not-found" as const };
        if (link.status !== "active") return { status: "conflict" as const };

        const revokedAt = now().toISOString();
        const rawInvitations = database.guardian_invitations;
        const invitations = normalizeGuardianInvitationRecords(
          rawInvitations,
          revokedAt
        );
        const replacementVersion = nextGuardianInvitationVersion(invitations, studentId);
        const existingDigests = existingGuardianInvitationDigests(rawInvitations, invitations);
        let replacementToken = "";
        let replacementTokenDigest = "";
        for (let attempt = 0; attempt < guardianInvitationGenerationAttempts; attempt += 1) {
          const candidate = normalizeGuardianInviteToken(createInviteToken());
          if (!isValidGuardianInviteToken(candidate)) {
            throw new Error("Guardian invitation token generator returned an invalid token.");
          }
          const candidateDigest = guardianInviteTokenDigest(candidate);
          if (existingDigests.has(candidateDigest)) continue;
          replacementToken = candidate;
          replacementTokenDigest = candidateDigest;
          break;
        }
        if (!replacementToken || !replacementTokenDigest) {
          throw new Error("Guardian invitation token generator could not produce a unique token.");
        }
        const replacementInvitationId = createUniqueGuardianInvitationId(
          createId,
          existingGuardianInvitationIds(rawInvitations, invitations)
        );
        const replacementExpiresAt = new Date(Date.parse(revokedAt) + guardianInviteTtlMs).toISOString();

        database.guardian_invitations = invitations;
        link.status = "revoked";
        link.invite_code = "";
        link.revoked_at = revokedAt;
        link.revoked_by = teacherId;
        link.updated_at = revokedAt;
        normalizeParentAccessLegacyInviteFields(database);
        for (const invitation of invitations) {
          if (invitation.student_id === studentId && !invitation.revoked_at) invitation.revoked_at = revokedAt;
        }
        invitations.push({
          id: replacementInvitationId,
          student_id: studentId,
          version: replacementVersion,
          token_digest: replacementTokenDigest,
          expires_at: replacementExpiresAt,
          consumed_at: null,
          consumed_by_parent_id: null,
          consumed_relationship: null,
          consumed_link_id: null,
          revoked_at: null,
          created_by: teacherId,
          created_at: revokedAt
        });
        return {
          status: "revoked" as const,
          revokedAt,
          invitation: {
            version: replacementVersion,
            token: replacementToken,
            expiresAt: replacementExpiresAt
          }
        };
      });
    }
  };
}
