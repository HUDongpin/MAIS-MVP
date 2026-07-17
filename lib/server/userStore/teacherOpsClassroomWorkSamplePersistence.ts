import { randomUUID } from "node:crypto";

import type { ClassroomWorkSample, ClassroomWorkSampleStatus } from "@/types";

type TeacherOpsClassroomWorkSampleUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsClassroomWorkSampleUserRecord = {
  id: string;
  role: TeacherOpsClassroomWorkSampleUserRole;
};

type TeacherOpsClassroomWorkSampleClassRecord = {
  id: string;
  teacher_id: string;
};

type TeacherOpsClassroomWorkSampleSchoolMembershipRecord = {
  user_id: string;
  class_id?: string;
  role: TeacherOpsClassroomWorkSampleUserRole;
};

type TeacherOpsClassroomWorkSampleEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type TeacherOpsClassroomWorkSampleLiveSessionRecord = {
  id: string;
  class_id: string;
  status: string;
  updated_at: string;
};

export type TeacherOpsClassroomWorkSampleRecord = {
  id: string;
  session_id: string;
  student_id: string;
  image_data_url?: string;
  image_object_key?: string;
  caption: string;
  status: ClassroomWorkSampleStatus;
  created_at: string;
  selected_at: string | null;
};

export type TeacherOpsClassroomWorkSamplePersistenceDatabase = {
  classroom_work_samples: TeacherOpsClassroomWorkSampleRecord[];
  class_enrollments: TeacherOpsClassroomWorkSampleEnrollmentRecord[];
  school_memberships?: TeacherOpsClassroomWorkSampleSchoolMembershipRecord[];
  teacher_classes: TeacherOpsClassroomWorkSampleClassRecord[];
  teacher_live_sessions: TeacherOpsClassroomWorkSampleLiveSessionRecord[];
  users: TeacherOpsClassroomWorkSampleUserRecord[];
};

export type TeacherOpsClassroomWorkSampleCreateInput = {
  userId: string;
  sessionId: string;
  imageDataUrl?: string;
  imageObject?: { objectKey?: unknown } | null;
  caption?: string;
  studentId?: string;
};

export type TeacherOpsClassroomWorkSampleCreateResult =
  | { status: "invalid" }
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "created"; sample: ClassroomWorkSample | undefined };

export type TeacherOpsClassroomWorkSampleUpdateInput = {
  teacherId: string;
  sessionId: string;
  sampleId: string;
  status: ClassroomWorkSampleStatus;
};

export type TeacherOpsClassroomWorkSampleUpdateResult =
  | { status: "invalid" }
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "updated"; samples: ClassroomWorkSample[] };

export type TeacherOpsClassroomWorkSamplePersistenceStoreDependencies = {
  createId?: () => string;
  mutateDatabase: <Result>(
    mutator: (database: TeacherOpsClassroomWorkSamplePersistenceDatabase) => Result | Promise<Result>
  ) => Promise<Result>;
  normalizeObjectKey?: (value: unknown) => string | undefined;
  now?: () => Date;
  toWorkSample: (
    database: TeacherOpsClassroomWorkSamplePersistenceDatabase,
    sample: TeacherOpsClassroomWorkSampleRecord
  ) => ClassroomWorkSample;
};

export type TeacherOpsClassroomWorkSamplePersistenceStore = ReturnType<
  typeof createTeacherOpsClassroomWorkSamplePersistenceStore
>;

const validClassroomWorkSampleStatuses = new Set<ClassroomWorkSampleStatus>(["submitted", "selected", "hidden"]);

export function isValidClassroomWorkSampleStatus(status: unknown): status is ClassroomWorkSampleStatus {
  return validClassroomWorkSampleStatuses.has(status as ClassroomWorkSampleStatus);
}

export function normalizeClassroomWorkSampleStatus(status: unknown): ClassroomWorkSampleStatus {
  return isValidClassroomWorkSampleStatus(status) ? status : "submitted";
}

function canUseTeacherArea(
  user?: TeacherOpsClassroomWorkSampleUserRecord | null
): user is TeacherOpsClassroomWorkSampleUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherCanAccessClass(
  database: TeacherOpsClassroomWorkSamplePersistenceDatabase,
  user: TeacherOpsClassroomWorkSampleUserRecord,
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

function teacherStudentIdsForClass(database: TeacherOpsClassroomWorkSamplePersistenceDatabase, classId: string) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
}

function cleanClassroomWorkSampleText(value: unknown, fallback = "", maxLength = 4000) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
}

function cleanClassroomWorkSampleRecordText(value: unknown, fallback = "", maxLength = 4000) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function isValidWorkSampleImage(value: string) {
  return /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(value) && value.length <= 1_000_000;
}

function defaultNormalizeObjectKey(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

export function normalizeTeacherOpsClassroomWorkSampleRecord(
  sample: TeacherOpsClassroomWorkSampleRecord,
  now: string,
  normalizeObjectKey: (value: unknown) => string | undefined = defaultNormalizeObjectKey
): TeacherOpsClassroomWorkSampleRecord {
  const status = normalizeClassroomWorkSampleStatus(sample.status);
  return {
    ...sample,
    session_id: cleanClassroomWorkSampleRecordText(sample.session_id, "", 160),
    student_id: cleanClassroomWorkSampleRecordText(sample.student_id, "", 160),
    image_data_url: cleanClassroomWorkSampleRecordText(sample.image_data_url, "", 1_000_000),
    image_object_key: normalizeObjectKey(sample.image_object_key),
    caption: cleanClassroomWorkSampleRecordText(sample.caption, "", 300),
    status,
    created_at: sample.created_at ?? now,
    selected_at: sample.selected_at ?? null
  };
}

function workSamplesForSession(
  database: TeacherOpsClassroomWorkSamplePersistenceDatabase,
  sessionId: string,
  toWorkSample: TeacherOpsClassroomWorkSamplePersistenceStoreDependencies["toWorkSample"]
) {
  return database.classroom_work_samples
    .filter((sample) => sample.session_id === sessionId && sample.status !== "hidden")
    .sort((a, b) => {
      const aSelected = a.status === "selected" ? 0 : 1;
      const bSelected = b.status === "selected" ? 0 : 1;
      return aSelected - bSelected || b.created_at.localeCompare(a.created_at);
    })
    .map((sample) => toWorkSample(database, sample));
}

export function createTeacherOpsClassroomWorkSamplePersistenceStore({
  createId = randomUUID,
  mutateDatabase,
  normalizeObjectKey = defaultNormalizeObjectKey,
  now = () => new Date(),
  toWorkSample
}: TeacherOpsClassroomWorkSamplePersistenceStoreDependencies) {
  return {
    async createClassroomWorkSample({
      userId,
      sessionId,
      imageDataUrl,
      imageObject,
      caption,
      studentId
    }: TeacherOpsClassroomWorkSampleCreateInput): Promise<TeacherOpsClassroomWorkSampleCreateResult> {
      const cleanImageDataUrl = typeof imageDataUrl === "string" && isValidWorkSampleImage(imageDataUrl)
        ? imageDataUrl.trim()
        : undefined;
      const imageObjectKey = normalizeObjectKey(imageObject?.objectKey);
      if (!cleanImageDataUrl && !imageObjectKey) return { status: "invalid" };

      return mutateDatabase((database) => {
        const session = database.teacher_live_sessions.find((candidate) => candidate.id === sessionId);
        if (!session || session.status !== "active") return { status: "not-found" };

        const user = database.users.find((candidate) => candidate.id === userId);
        const isTeacher = canUseTeacherArea(user) && Boolean(teacherCanAccessClass(database, user, session.class_id));
        const enrolledStudentIds = teacherStudentIdsForClass(database, session.class_id);
        const sampleStudentId = isTeacher && studentId && enrolledStudentIds.includes(studentId) ? studentId : userId;
        const enrolled = enrolledStudentIds.includes(sampleStudentId);
        if (!isTeacher && !enrolled) return { status: "forbidden" };

        const nowIso = now().toISOString();
        const record: TeacherOpsClassroomWorkSampleRecord = {
          id: `work-sample-${createId()}`,
          session_id: session.id,
          student_id: sampleStudentId,
          ...(cleanImageDataUrl ? { image_data_url: cleanImageDataUrl } : {}),
          ...(imageObjectKey ? { image_object_key: imageObjectKey } : {}),
          caption: cleanClassroomWorkSampleText(caption, "", 240),
          status: "submitted",
          created_at: nowIso,
          selected_at: null
        };
        database.classroom_work_samples.unshift(record);
        session.updated_at = nowIso;

        return {
          status: "created",
          sample: workSamplesForSession(database, session.id, toWorkSample).find((sample) => sample.id === record.id)
        };
      });
    },
    async updateClassroomWorkSampleStatus({
      teacherId,
      sessionId,
      sampleId,
      status
    }: TeacherOpsClassroomWorkSampleUpdateInput): Promise<TeacherOpsClassroomWorkSampleUpdateResult> {
      if (!isValidClassroomWorkSampleStatus(status)) return { status: "invalid" };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" };

        const session = database.teacher_live_sessions.find((candidate) => candidate.id === sessionId);
        if (!session || !teacherCanAccessClass(database, user, session.class_id)) return { status: "not-found" };

        const sample = database.classroom_work_samples.find(
          (candidate) => candidate.id === sampleId && candidate.session_id === sessionId
        );
        if (!sample) return { status: "not-found" };

        const nowIso = now().toISOString();
        if (status === "selected") {
          database.classroom_work_samples
            .filter((candidate) => candidate.session_id === sessionId && candidate.status === "selected")
            .forEach((candidate) => {
              candidate.status = "submitted";
              candidate.selected_at = null;
            });
          sample.selected_at = nowIso;
        } else {
          sample.selected_at = null;
        }
        sample.status = status;
        session.updated_at = nowIso;

        return {
          status: "updated",
          samples: workSamplesForSession(database, sessionId, toWorkSample)
        };
      });
    }
  };
}
