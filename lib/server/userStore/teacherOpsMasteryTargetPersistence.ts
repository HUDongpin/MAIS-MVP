import { randomUUID } from "crypto";
import type {
  GradeId,
  TeacherStudentMasteryTarget
} from "@/types";

type TeacherOpsMasteryTargetUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsMasteryTargetUserRecord = {
  id: string;
  role: TeacherOpsMasteryTargetUserRole;
  username?: string;
};

type TeacherOpsMasteryTargetClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsMasteryTargetSchoolMembershipRecord = {
  user_id: string;
  role: TeacherOpsMasteryTargetUserRole;
  class_id?: string;
};

type TeacherOpsMasteryTargetEnrollmentRecord = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

export type TeacherOpsMasteryTargetRecord = {
  id: string;
  teacher_id: string;
  student_id: string;
  topic_id: string;
  mastery: number;
  note: string;
  updated_at: string;
};

export type TeacherOpsMasteryTargetPersistenceDatabase = {
  class_enrollments: TeacherOpsMasteryTargetEnrollmentRecord[];
  school_memberships?: TeacherOpsMasteryTargetSchoolMembershipRecord[];
  teacher_classes: TeacherOpsMasteryTargetClassRecord[];
  teacher_mastery_targets: TeacherOpsMasteryTargetRecord[];
  users: TeacherOpsMasteryTargetUserRecord[];
};

export type TeacherOpsMasteryTargetPersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsMasteryTargetPersistenceDatabase>;
  mutateDatabase: <T>(
    mutator: (database: TeacherOpsMasteryTargetPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  teacherDisplayName: (
    database: TeacherOpsMasteryTargetPersistenceDatabase,
    teacherId: string
  ) => string;
  topicIdsForClass: (
    database: TeacherOpsMasteryTargetPersistenceDatabase,
    teacherClass: TeacherOpsMasteryTargetClassRecord
  ) => string[];
};

export type TeacherOpsMasteryTargetPersistenceStore = ReturnType<typeof createTeacherOpsMasteryTargetPersistenceStore>;

function canUseTeacherArea(user?: TeacherOpsMasteryTargetUserRecord | null): user is TeacherOpsMasteryTargetUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function boundedMasteryPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeTeacherMasteryTargetRecords(
  existingRecords: TeacherOpsMasteryTargetRecord[] | undefined,
  now: string,
  createId = () => randomUUID()
) {
  return (existingRecords ?? [])
    .filter((record) =>
      typeof record.teacher_id === "string" &&
      typeof record.student_id === "string" &&
      typeof record.topic_id === "string" &&
      typeof record.mastery === "number" &&
      Number.isFinite(record.mastery)
    )
    .map((record) => ({
      id: typeof record.id === "string" && record.id.trim() ? record.id : `mastery-target-${createId()}`,
      teacher_id: record.teacher_id,
      student_id: record.student_id,
      topic_id: record.topic_id,
      mastery: boundedMasteryPercent(record.mastery),
      note: typeof record.note === "string" ? record.note.slice(0, 280) : "",
      updated_at: typeof record.updated_at === "string" ? record.updated_at : now
    }));
}

function teacherCanAccessClass(
  database: TeacherOpsMasteryTargetPersistenceDatabase,
  user: TeacherOpsMasteryTargetUserRecord,
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

export function toTeacherOpsStudentMasteryTarget({
  database,
  record,
  teacherDisplayName
}: {
  database: TeacherOpsMasteryTargetPersistenceDatabase;
  record: TeacherOpsMasteryTargetRecord;
  teacherDisplayName: TeacherOpsMasteryTargetPersistenceStoreDependencies["teacherDisplayName"];
}): TeacherStudentMasteryTarget {
  return {
    topicId: record.topic_id,
    mastery: record.mastery,
    note: record.note,
    updatedAt: record.updated_at,
    teacherName: teacherDisplayName(database, record.teacher_id)
  };
}

function teacherCanSetMasteryTargetForTopic({
  database,
  user,
  classId,
  studentId,
  topicId,
  topicIdsForClass
}: {
  database: TeacherOpsMasteryTargetPersistenceDatabase;
  user: TeacherOpsMasteryTargetUserRecord;
  classId: string;
  studentId: string;
  topicId: string;
  topicIdsForClass: TeacherOpsMasteryTargetPersistenceStoreDependencies["topicIdsForClass"];
}) {
  const teacherClass = teacherCanAccessClass(database, user, classId);
  if (!teacherClass) return false;
  const isEnrolled = database.class_enrollments.some(
    (enrollment) => enrollment.class_id === teacherClass.id && enrollment.student_id === studentId
  );
  if (!isEnrolled) return false;
  return topicIdsForClass(database, teacherClass).includes(topicId);
}

export function createTeacherOpsMasteryTargetPersistenceStore({
  createId = () => randomUUID(),
  now = () => new Date(),
  readDatabase: _readDatabase,
  mutateDatabase,
  teacherDisplayName,
  topicIdsForClass
}: TeacherOpsMasteryTargetPersistenceStoreDependencies) {
  return {
    async setTeacherStudentMasteryTarget({
      teacherId,
      classId,
      studentId,
      topicId,
      mastery,
      note
    }: {
      teacherId: string;
      classId: string;
      studentId: string;
      topicId: string;
      mastery: number;
      note?: string;
    }) {
      if (!topicId.trim() || !Number.isFinite(mastery)) return { status: "invalid" as const };
      const boundedMastery = boundedMasteryPercent(mastery);
      const trimmedNote = (note ?? "").trim().slice(0, 280);

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const student = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
        if (!student) return { status: "student-not-found" as const };
        if (!teacherCanSetMasteryTargetForTopic({ database, user, classId, studentId, topicId, topicIdsForClass })) {
          return { status: "topic-not-found" as const };
        }

        const updatedAt = now().toISOString();
        let target = database.teacher_mastery_targets.find(
          (candidate) => candidate.teacher_id === user.id && candidate.student_id === studentId && candidate.topic_id === topicId
        );
        if (!target) {
          target = {
            id: `mastery-target-${createId()}`,
            teacher_id: user.id,
            student_id: studentId,
            topic_id: topicId,
            mastery: boundedMastery,
            note: trimmedNote,
            updated_at: updatedAt
          };
          database.teacher_mastery_targets.push(target);
        } else {
          target.mastery = boundedMastery;
          target.note = trimmedNote;
          target.updated_at = updatedAt;
        }

        return {
          status: "saved" as const,
          target: toTeacherOpsStudentMasteryTarget({ database, record: target, teacherDisplayName })
        };
      });
    },

    async clearTeacherStudentMasteryTarget({
      teacherId,
      classId,
      studentId,
      topicId
    }: {
      teacherId: string;
      classId: string;
      studentId: string;
      topicId: string;
    }) {
      if (!topicId.trim()) return { status: "invalid" as const };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        if (!teacherCanSetMasteryTargetForTopic({ database, user, classId, studentId, topicId, topicIdsForClass })) {
          return { status: "topic-not-found" as const };
        }

        database.teacher_mastery_targets = database.teacher_mastery_targets.filter(
          (candidate) => !(candidate.teacher_id === user.id && candidate.student_id === studentId && candidate.topic_id === topicId)
        );

        return { status: "cleared" as const };
      });
    }
  };
}
