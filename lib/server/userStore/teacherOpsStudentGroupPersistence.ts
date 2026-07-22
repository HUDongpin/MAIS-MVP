import { randomUUID } from "crypto";
import type {
  GradeId,
  TeacherStudentGroup,
  TeacherStudentGroupMasteryTarget,
  TeacherStudentGroupTier
} from "@/types";

type TeacherOpsStudentGroupUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsStudentGroupUserRecord = {
  id: string;
  role: TeacherOpsStudentGroupUserRole;
  username?: string;
};

type TeacherOpsStudentGroupClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsStudentGroupSchoolMembershipRecord = {
  user_id: string;
  role: TeacherOpsStudentGroupUserRole;
  class_id?: string;
};

type TeacherOpsStudentGroupEnrollmentRecord = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

type TeacherOpsStudentGroupMasteryTargetRecord = {
  id: string;
  teacher_id: string;
  student_id: string;
  topic_id: string;
  mastery: number;
  note: string;
  updated_at: string;
};

export type TeacherOpsStudentGroupRecord = {
  id: string;
  class_id: string;
  teacher_id: string;
  name: string;
  tier: TeacherStudentGroupTier;
  color: string;
  note: string;
  member_student_ids: string[];
  mastery_target_topic_id?: string;
  mastery_target_mastery?: number;
  mastery_target_note?: string;
  mastery_target_updated_at?: string;
  created_at: string;
  updated_at: string;
};

export type TeacherOpsStudentGroupPersistenceDatabase = {
  class_enrollments: TeacherOpsStudentGroupEnrollmentRecord[];
  school_memberships?: TeacherOpsStudentGroupSchoolMembershipRecord[];
  teacher_classes: TeacherOpsStudentGroupClassRecord[];
  teacher_student_groups: TeacherOpsStudentGroupRecord[];
  teacher_mastery_targets: TeacherOpsStudentGroupMasteryTargetRecord[];
  users: TeacherOpsStudentGroupUserRecord[];
};

export type TeacherOpsStudentGroupPersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsStudentGroupPersistenceDatabase>;
  mutateDatabase: <T>(
    mutator: (database: TeacherOpsStudentGroupPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  studentDisplayName: (
    database: TeacherOpsStudentGroupPersistenceDatabase,
    studentId: string
  ) => string;
  topicIdsForClass: (
    database: TeacherOpsStudentGroupPersistenceDatabase,
    teacherClass: TeacherOpsStudentGroupClassRecord
  ) => string[];
};

export type TeacherOpsStudentGroupPersistenceStore = ReturnType<typeof createTeacherOpsStudentGroupPersistenceStore>;

export const teacherStudentGroupTiers = ["support", "core", "stretch", "custom"] as const;
export const teacherStudentGroupColorTokens = ["sky", "amber", "emerald", "violet", "rose", "slate"] as const;

const GROUP_NAME_MAX = 80;
const GROUP_NOTE_MAX = 280;
const GROUP_MEMBER_MAX = 200;

const tierDefaultColor: Record<TeacherStudentGroupTier, (typeof teacherStudentGroupColorTokens)[number]> = {
  support: "amber",
  core: "sky",
  stretch: "emerald",
  custom: "violet"
};

function canUseTeacherArea(
  user?: TeacherOpsStudentGroupUserRecord | null
): user is TeacherOpsStudentGroupUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function boundedMasteryPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeTier(value: unknown): TeacherStudentGroupTier {
  return teacherStudentGroupTiers.includes(value as TeacherStudentGroupTier)
    ? (value as TeacherStudentGroupTier)
    : "custom";
}

function normalizeColor(value: unknown, tier: TeacherStudentGroupTier): string {
  return teacherStudentGroupColorTokens.includes(value as (typeof teacherStudentGroupColorTokens)[number])
    ? (value as string)
    : tierDefaultColor[tier];
}

function teacherCanAccessClass(
  database: TeacherOpsStudentGroupPersistenceDatabase,
  user: TeacherOpsStudentGroupUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (
    user.role !== "admin" &&
    teacherClass.teacher_id !== user.id &&
    !(database.school_memberships ?? []).some(
      (membership) =>
        membership.user_id === user.id &&
        membership.class_id === classId &&
        (membership.role === "teacher" || membership.role === "admin")
    )
  ) {
    return null;
  }
  return teacherClass;
}

function enrolledStudentIdsForClass(database: TeacherOpsStudentGroupPersistenceDatabase, classId: string) {
  return new Set(
    database.class_enrollments
      .filter((enrollment) => enrollment.class_id === classId)
      .map((enrollment) => enrollment.student_id)
  );
}

function sanitizeMemberIds(
  database: TeacherOpsStudentGroupPersistenceDatabase,
  classId: string,
  memberStudentIds: readonly string[] | undefined
) {
  const enrolled = enrolledStudentIdsForClass(database, classId);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const studentId of memberStudentIds ?? []) {
    if (typeof studentId !== "string") continue;
    if (!enrolled.has(studentId) || seen.has(studentId)) continue;
    seen.add(studentId);
    result.push(studentId);
    if (result.length >= GROUP_MEMBER_MAX) break;
  }
  return result;
}

function groupMasteryTarget(record: TeacherOpsStudentGroupRecord): TeacherStudentGroupMasteryTarget | null {
  if (typeof record.mastery_target_topic_id !== "string" || !record.mastery_target_topic_id) return null;
  if (typeof record.mastery_target_mastery !== "number" || !Number.isFinite(record.mastery_target_mastery)) return null;
  return {
    topicId: record.mastery_target_topic_id,
    mastery: boundedMasteryPercent(record.mastery_target_mastery),
    note: typeof record.mastery_target_note === "string" ? record.mastery_target_note : "",
    updatedAt:
      typeof record.mastery_target_updated_at === "string" ? record.mastery_target_updated_at : record.updated_at
  };
}

export function toTeacherStudentGroup({
  database,
  record,
  studentDisplayName
}: {
  database: TeacherOpsStudentGroupPersistenceDatabase;
  record: TeacherOpsStudentGroupRecord;
  studentDisplayName: TeacherOpsStudentGroupPersistenceStoreDependencies["studentDisplayName"];
}): TeacherStudentGroup {
  const memberStudentIds = sanitizeMemberIds(database, record.class_id, record.member_student_ids);
  return {
    id: record.id,
    classId: record.class_id,
    name: record.name,
    tier: normalizeTier(record.tier),
    color: normalizeColor(record.color, normalizeTier(record.tier)),
    note: record.note,
    memberStudentIds,
    memberNames: memberStudentIds.map((studentId) => studentDisplayName(database, studentId)),
    studentCount: memberStudentIds.length,
    masteryTarget: groupMasteryTarget(record),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export function listTeacherStudentGroupsForClass({
  database,
  classId,
  studentDisplayName
}: {
  database: TeacherOpsStudentGroupPersistenceDatabase;
  classId: string;
  studentDisplayName: TeacherOpsStudentGroupPersistenceStoreDependencies["studentDisplayName"];
}): TeacherStudentGroup[] {
  return (database.teacher_student_groups ?? [])
    .filter((record) => record.class_id === classId)
    .map((record) => toTeacherStudentGroup({ database, record, studentDisplayName }))
    .sort((a, b) => {
      const tierOrder = teacherStudentGroupTiers.indexOf(a.tier) - teacherStudentGroupTiers.indexOf(b.tier);
      return tierOrder !== 0 ? tierOrder : a.name.localeCompare(b.name);
    });
}

export function normalizeTeacherStudentGroupRecords(
  existingRecords: TeacherOpsStudentGroupRecord[] | undefined,
  now: string,
  createId: () => string = () => randomUUID()
): TeacherOpsStudentGroupRecord[] {
  return (existingRecords ?? [])
    .filter(
      (record) =>
        typeof record?.class_id === "string" &&
        typeof record?.teacher_id === "string" &&
        typeof record?.name === "string"
    )
    .map((record) => {
      const tier = normalizeTier(record.tier);
      const memberSeen = new Set<string>();
      const member_student_ids = (Array.isArray(record.member_student_ids) ? record.member_student_ids : [])
        .filter((studentId): studentId is string => {
          if (typeof studentId !== "string" || memberSeen.has(studentId)) return false;
          memberSeen.add(studentId);
          return true;
        })
        .slice(0, GROUP_MEMBER_MAX);
      const hasTarget =
        typeof record.mastery_target_topic_id === "string" &&
        record.mastery_target_topic_id.trim().length > 0 &&
        typeof record.mastery_target_mastery === "number" &&
        Number.isFinite(record.mastery_target_mastery);
      return {
        id: typeof record.id === "string" && record.id.trim() ? record.id : `student-group-${createId()}`,
        class_id: record.class_id,
        teacher_id: record.teacher_id,
        name: record.name.trim().slice(0, GROUP_NAME_MAX) || "Group",
        tier,
        color: normalizeColor(record.color, tier),
        note: typeof record.note === "string" ? record.note.slice(0, GROUP_NOTE_MAX) : "",
        member_student_ids,
        mastery_target_topic_id: hasTarget ? record.mastery_target_topic_id : undefined,
        mastery_target_mastery: hasTarget ? boundedMasteryPercent(record.mastery_target_mastery as number) : undefined,
        mastery_target_note: hasTarget
          ? typeof record.mastery_target_note === "string"
            ? record.mastery_target_note.slice(0, GROUP_NOTE_MAX)
            : ""
          : undefined,
        mastery_target_updated_at: hasTarget
          ? typeof record.mastery_target_updated_at === "string"
            ? record.mastery_target_updated_at
            : now
          : undefined,
        created_at: typeof record.created_at === "string" ? record.created_at : now,
        updated_at: typeof record.updated_at === "string" ? record.updated_at : now
      };
    });
}

function upsertMasteryTargetForStudent({
  database,
  teacherId,
  studentId,
  topicId,
  mastery,
  note,
  updatedAt,
  createId
}: {
  database: TeacherOpsStudentGroupPersistenceDatabase;
  teacherId: string;
  studentId: string;
  topicId: string;
  mastery: number;
  note: string;
  updatedAt: string;
  createId: () => string;
}) {
  database.teacher_mastery_targets ??= [];
  const existing = database.teacher_mastery_targets.find(
    (candidate) =>
      candidate.teacher_id === teacherId && candidate.student_id === studentId && candidate.topic_id === topicId
  );
  if (existing) {
    existing.mastery = mastery;
    existing.note = note;
    existing.updated_at = updatedAt;
    return;
  }
  database.teacher_mastery_targets.push({
    id: `mastery-target-${createId()}`,
    teacher_id: teacherId,
    student_id: studentId,
    topic_id: topicId,
    mastery,
    note,
    updated_at: updatedAt
  });
}

export function createTeacherOpsStudentGroupPersistenceStore({
  createId = () => randomUUID(),
  now = () => new Date(),
  readDatabase: _readDatabase,
  mutateDatabase,
  studentDisplayName,
  topicIdsForClass
}: TeacherOpsStudentGroupPersistenceStoreDependencies) {
  return {
    async createTeacherStudentGroup({
      teacherId,
      classId,
      name,
      tier,
      color,
      note,
      memberStudentIds
    }: {
      teacherId: string;
      classId: string;
      name: string;
      tier?: string;
      color?: string;
      note?: string;
      memberStudentIds?: string[];
    }) {
      const trimmedName = name.trim().slice(0, GROUP_NAME_MAX);
      if (!trimmedName) return { status: "invalid" as const };
      const resolvedTier = normalizeTier(tier);

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const teacherClass = teacherCanAccessClass(database, user, classId);
        if (!teacherClass) return { status: "not-found" as const };

        const createdAt = now().toISOString();
        const record: TeacherOpsStudentGroupRecord = {
          id: `student-group-${createId()}`,
          class_id: classId,
          teacher_id: user.id,
          name: trimmedName,
          tier: resolvedTier,
          color: normalizeColor(color, resolvedTier),
          note: (note ?? "").trim().slice(0, GROUP_NOTE_MAX),
          member_student_ids: sanitizeMemberIds(database, classId, memberStudentIds),
          created_at: createdAt,
          updated_at: createdAt
        };
        database.teacher_student_groups ??= [];
        database.teacher_student_groups.unshift(record);

        return { status: "created" as const, group: toTeacherStudentGroup({ database, record, studentDisplayName }) };
      });
    },

    async updateTeacherStudentGroup({
      teacherId,
      classId,
      groupId,
      name,
      tier,
      color,
      note,
      memberStudentIds
    }: {
      teacherId: string;
      classId: string;
      groupId: string;
      name?: string;
      tier?: string;
      color?: string;
      note?: string;
      memberStudentIds?: string[];
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        if (!teacherCanAccessClass(database, user, classId)) return { status: "not-found" as const };
        const record = (database.teacher_student_groups ?? []).find(
          (candidate) => candidate.id === groupId && candidate.class_id === classId
        );
        if (!record) return { status: "not-found" as const };

        if (typeof name === "string") {
          const trimmedName = name.trim().slice(0, GROUP_NAME_MAX);
          if (!trimmedName) return { status: "invalid" as const };
          record.name = trimmedName;
        }
        if (typeof tier === "string") record.tier = normalizeTier(tier);
        if (typeof color === "string") record.color = normalizeColor(color, normalizeTier(record.tier));
        if (typeof note === "string") record.note = note.trim().slice(0, GROUP_NOTE_MAX);
        if (Array.isArray(memberStudentIds)) {
          record.member_student_ids = sanitizeMemberIds(database, classId, memberStudentIds);
        }
        record.updated_at = now().toISOString();

        return { status: "saved" as const, group: toTeacherStudentGroup({ database, record, studentDisplayName }) };
      });
    },

    async deleteTeacherStudentGroup({
      teacherId,
      classId,
      groupId
    }: {
      teacherId: string;
      classId: string;
      groupId: string;
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        if (!teacherCanAccessClass(database, user, classId)) return { status: "not-found" as const };
        const exists = (database.teacher_student_groups ?? []).some(
          (candidate) => candidate.id === groupId && candidate.class_id === classId
        );
        if (!exists) return { status: "not-found" as const };

        database.teacher_student_groups = (database.teacher_student_groups ?? []).filter(
          (candidate) => !(candidate.id === groupId && candidate.class_id === classId)
        );
        return { status: "deleted" as const, groupId };
      });
    },

    async setTeacherStudentGroupMasteryTarget({
      teacherId,
      classId,
      groupId,
      topicId,
      mastery,
      note
    }: {
      teacherId: string;
      classId: string;
      groupId: string;
      topicId: string;
      mastery: number;
      note?: string;
    }) {
      if (!topicId.trim() || !Number.isFinite(mastery)) return { status: "invalid" as const };
      const boundedMastery = boundedMasteryPercent(mastery);
      const trimmedNote = (note ?? "").trim().slice(0, GROUP_NOTE_MAX);

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const teacherClass = teacherCanAccessClass(database, user, classId);
        if (!teacherClass) return { status: "not-found" as const };
        const record = (database.teacher_student_groups ?? []).find(
          (candidate) => candidate.id === groupId && candidate.class_id === classId
        );
        if (!record) return { status: "not-found" as const };
        if (!topicIdsForClass(database, teacherClass).includes(topicId)) return { status: "topic-not-found" as const };

        const updatedAt = now().toISOString();
        const memberIds = sanitizeMemberIds(database, classId, record.member_student_ids);
        memberIds.forEach((studentId) => {
          upsertMasteryTargetForStudent({
            database,
            teacherId: user.id,
            studentId,
            topicId,
            mastery: boundedMastery,
            note: trimmedNote,
            updatedAt,
            createId
          });
        });

        record.mastery_target_topic_id = topicId;
        record.mastery_target_mastery = boundedMastery;
        record.mastery_target_note = trimmedNote;
        record.mastery_target_updated_at = updatedAt;
        record.updated_at = updatedAt;

        return {
          status: "saved" as const,
          appliedTo: memberIds.length,
          group: toTeacherStudentGroup({ database, record, studentDisplayName })
        };
      });
    },

    async clearTeacherStudentGroupMasteryTarget({
      teacherId,
      classId,
      groupId
    }: {
      teacherId: string;
      classId: string;
      groupId: string;
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        if (!teacherCanAccessClass(database, user, classId)) return { status: "not-found" as const };
        const record = (database.teacher_student_groups ?? []).find(
          (candidate) => candidate.id === groupId && candidate.class_id === classId
        );
        if (!record) return { status: "not-found" as const };

        const clearedTopicId = record.mastery_target_topic_id;
        if (clearedTopicId) {
          const memberIds = new Set(sanitizeMemberIds(database, classId, record.member_student_ids));
          database.teacher_mastery_targets = (database.teacher_mastery_targets ?? []).filter(
            (candidate) =>
              !(
                candidate.teacher_id === user.id &&
                candidate.topic_id === clearedTopicId &&
                memberIds.has(candidate.student_id)
              )
          );
        }
        record.mastery_target_topic_id = undefined;
        record.mastery_target_mastery = undefined;
        record.mastery_target_note = undefined;
        record.mastery_target_updated_at = undefined;
        record.updated_at = now().toISOString();

        return {
          status: "cleared" as const,
          group: toTeacherStudentGroup({ database, record, studentDisplayName })
        };
      });
    }
  };
}
