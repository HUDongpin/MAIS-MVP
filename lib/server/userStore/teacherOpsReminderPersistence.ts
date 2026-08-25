import { randomUUID } from "crypto";
import type {
  SubmissionStatus,
  TeacherMissingWorkItem,
  TeacherNoticeDeliveryStatus,
  TeacherReminderRun,
  TeacherReminderThreshold
} from "@/types";

type TeacherOpsReminderUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsReminderUserRecord = {
  id: string;
  role: TeacherOpsReminderUserRole;
  username?: string;
};

type TeacherOpsReminderClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
};

type TeacherOpsReminderAssignmentRecord = {
  id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  due_at: string | null;
  status?: string;
};

type TeacherOpsReminderClassEnrollmentRecord = {
  id?: string;
  class_id: string;
  joined_at?: string;
  student_id: string;
};

type TeacherOpsReminderStudentProfileRecord = {
  user_id: string;
  name?: string;
};

type TeacherOpsReminderSubmissionRecord = {
  id: string;
  assignment_id: string;
  feedback_en?: string;
  feedback_zh?: string;
  graded_at?: string | null;
  score?: number | null;
  student_id: string;
  status: SubmissionStatus;
  submitted_at?: string | null;
  updated_at?: string;
};

type TeacherOpsReminderNoticeRecord = {
  id: string;
};

type TeacherOpsReminderDeliveryAttemptRecord = {
  status: TeacherNoticeDeliveryStatus | "skipped";
  attempted_at: string;
};

export type TeacherOpsReminderRunRecord = {
  id: string;
  teacher_id: string;
  class_id: string;
  assignment_id: string;
  student_id: string;
  notice_id?: string;
  threshold: TeacherReminderThreshold;
  status: TeacherNoticeDeliveryStatus | "skipped";
  reason: string;
  created_at: string;
};

export type TeacherOpsReminderPersistenceDatabase = {
  assignments: TeacherOpsReminderAssignmentRecord[];
  class_enrollments?: TeacherOpsReminderClassEnrollmentRecord[];
  student_profiles?: TeacherOpsReminderStudentProfileRecord[];
  submissions?: TeacherOpsReminderSubmissionRecord[];
  teacher_classes: TeacherOpsReminderClassRecord[];
  teacher_reminder_runs: TeacherOpsReminderRunRecord[];
  users: TeacherOpsReminderUserRecord[];
};

export type TeacherOpsReminderPersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  mutateDatabase: <T>(
    mutator: (database: TeacherOpsReminderPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  teacherOperationClassRecordsFor: (
    database: TeacherOpsReminderPersistenceDatabase,
    user: TeacherOpsReminderUserRecord
  ) => TeacherOpsReminderClassRecord[];
  teacherCanMutateOperationsClass: (
    database: TeacherOpsReminderPersistenceDatabase,
    user: TeacherOpsReminderUserRecord,
    classId: string
  ) => TeacherOpsReminderClassRecord | null;
  missingWorkItemsForClasses: (
    database: TeacherOpsReminderPersistenceDatabase,
    classes: TeacherOpsReminderClassRecord[]
  ) => TeacherMissingWorkItem[];
  createNoticeRecord: (args: {
    database: TeacherOpsReminderPersistenceDatabase;
    teacher: TeacherOpsReminderUserRecord;
    teacherClass: TeacherOpsReminderClassRecord;
    subject: string;
    body: string;
    audience: "parents";
    assignmentId: string;
    dueAt: string | null;
    studentIds: string[];
    now: string;
  }) => TeacherOpsReminderNoticeRecord;
  sendNoticeRecord: (
    input: {
      teacherId: string;
      noticeId: string;
      origin?: string;
    }
  ) => Promise<TeacherOpsReminderDeliveryAttemptRecord>;
  toTeacherReminderRun: (
    database: TeacherOpsReminderPersistenceDatabase,
    record: TeacherOpsReminderRunRecord
  ) => TeacherReminderRun;
};

export type TeacherOpsReminderPersistenceStore = ReturnType<typeof createTeacherOpsReminderPersistenceStore>;

const dayMs = 24 * 60 * 60 * 1000;

export function teacherOpsCurrentMissingWorkThreshold(
  assignment: { due_at: string | null },
  nowMs: number
): TeacherReminderThreshold | null {
  if (!assignment.due_at) return null;
  const dueMs = Date.parse(assignment.due_at);
  if (!Number.isFinite(dueMs)) return null;
  const msUntilDue = dueMs - nowMs;
  const msOverdue = nowMs - dueMs;

  if (msUntilDue > 0 && msUntilDue <= dayMs) return "due-24h";
  if (msOverdue >= 3 * dayMs) return "overdue-72h";
  if (msOverdue >= dayMs) return "overdue-24h";
  if (msOverdue >= 0) return "overdue-0h";
  return null;
}

export function teacherOpsMissingWorkItemsForClasses({
  database,
  classes,
  isSubmissionComplete,
  nowMs = Date.now()
}: {
  database: TeacherOpsReminderPersistenceDatabase;
  classes: TeacherOpsReminderClassRecord[];
  isSubmissionComplete: (submission: TeacherOpsReminderSubmissionRecord) => boolean;
  nowMs?: number;
}) {
  const classById = new Map(classes.map((teacherClass) => [teacherClass.id, teacherClass]));
  const items: TeacherMissingWorkItem[] = [];

  database.assignments
    .filter((assignment) => classById.has(assignment.class_id) && assignment.status !== "draft")
    .forEach((assignment) => {
      const teacherClass = classById.get(assignment.class_id);
      if (!teacherClass) return;

      (database.class_enrollments ?? [])
        .filter((enrollment) => enrollment.class_id === assignment.class_id)
        .forEach((enrollment) => {
          const submission = (database.submissions ?? []).find(
            (candidate) => candidate.assignment_id === assignment.id && candidate.student_id === enrollment.student_id
          );
          if (submission && isSubmissionComplete(submission)) return;

          const threshold = teacherOpsCurrentMissingWorkThreshold(assignment, nowMs);
          const alreadySent = threshold
            ? database.teacher_reminder_runs.some(
                (run) =>
                  run.assignment_id === assignment.id &&
                  run.student_id === enrollment.student_id &&
                  run.threshold === threshold &&
                  run.status !== "skipped"
              )
            : false;
          const lastRun = database.teacher_reminder_runs
            .filter((run) => run.assignment_id === assignment.id && run.student_id === enrollment.student_id)
            .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
          const profile = (database.student_profiles ?? []).find((candidate) => candidate.user_id === enrollment.student_id);
          const user = database.users.find((candidate) => candidate.id === enrollment.student_id);

          items.push({
            assignmentId: assignment.id,
            assignmentTitle: {
              en: assignment.title_en,
              zh: assignment.title_zh
            },
            classId: assignment.class_id,
            className: teacherClass.name,
            studentId: enrollment.student_id,
            studentName: profile?.name ?? user?.username ?? "Unknown student",
            submissionId: submission?.id ?? `missing-${assignment.id}-${enrollment.student_id}`,
            submissionStatus: submission?.status ?? "not-started",
            dueAt: assignment.due_at,
            nextThreshold: threshold && !alreadySent ? threshold : null,
            lastReminderAt: lastRun?.created_at ?? null
          });
        });
    });

  return items.sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? "") || a.studentName.localeCompare(b.studentName));
}

export function toTeacherOpsReminderRun(
  _database: TeacherOpsReminderPersistenceDatabase,
  record: TeacherOpsReminderRunRecord
): TeacherReminderRun {
  return {
    id: record.id,
    teacherId: record.teacher_id,
    classId: record.class_id,
    assignmentId: record.assignment_id,
    studentId: record.student_id,
    noticeId: record.notice_id,
    threshold: record.threshold,
    status: record.status,
    reason: record.reason,
    createdAt: record.created_at
  };
}

function canUseTeacherArea(user?: TeacherOpsReminderUserRecord | null): user is TeacherOpsReminderUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

export function createTeacherOpsReminderPersistenceStore({
  createId = () => randomUUID(),
  now = () => new Date(),
  mutateDatabase,
  teacherOperationClassRecordsFor,
  teacherCanMutateOperationsClass,
  missingWorkItemsForClasses,
  createNoticeRecord,
  sendNoticeRecord,
  toTeacherReminderRun
}: TeacherOpsReminderPersistenceStoreDependencies) {
  return {
    async runTeacherMissingWorkReminders({
      teacherId,
      classId,
      assignmentId,
      manual = false,
      origin
    }: {
      teacherId: string;
      classId?: string | null;
      assignmentId?: string | null;
      manual?: boolean;
      origin?: string;
    }) {
      const reservation = await mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const classRecords = teacherOperationClassRecordsFor(database, user)
          .filter((teacherClass) => !classId || teacherClass.id === classId)
          .filter((teacherClass) => Boolean(teacherCanMutateOperationsClass(database, user, teacherClass.id)));
        if (classId && !classRecords.length) return { status: "not-found" as const };

        const items = missingWorkItemsForClasses(database, classRecords)
          .filter((item) => !assignmentId || item.assignmentId === assignmentId)
          .filter((item) => manual || Boolean(item.nextThreshold))
          .slice(0, 100);
        const prepared: Array<{ noticeId: string; runId: string }> = [];

        for (const item of items) {
          const threshold = manual ? "manual" : item.nextThreshold;
          if (!threshold) continue;
          const duplicate = !manual && database.teacher_reminder_runs.some(
            (run) =>
              run.assignment_id === item.assignmentId &&
              run.student_id === item.studentId &&
              run.threshold === threshold &&
              run.status !== "skipped"
          );
          if (duplicate) continue;

          const teacherClass = database.teacher_classes.find((candidate) => candidate.id === item.classId);
          const assignment = database.assignments.find((candidate) => candidate.id === item.assignmentId);
          if (!teacherClass || !assignment) continue;
          const notice = createNoticeRecord({
            database,
            teacher: user,
            teacherClass,
            subject: `未交提醒：${assignment.title_zh || assignment.title_en}`,
            body: `${item.studentName} 尚未完成 ${assignment.title_zh || assignment.title_en}。請在 MAIS 家長端確認並協助跟進。`,
            audience: "parents",
            assignmentId: assignment.id,
            dueAt: assignment.due_at,
            studentIds: [item.studentId],
            now: now().toISOString()
          });
          const run: TeacherOpsReminderRunRecord = {
            id: `teacher-reminder-run-${createId()}`,
            teacher_id: user.id,
            class_id: item.classId,
            assignment_id: item.assignmentId,
            student_id: item.studentId,
            notice_id: notice.id,
            threshold,
            status: "queued",
            reason: manual ? "Manual reminder sent by teacher." : `Automatic missing-work threshold ${threshold}.`,
            created_at: now().toISOString()
          };
          database.teacher_reminder_runs.unshift(run);
          prepared.push({ noticeId: notice.id, runId: run.id });
        }

        return { status: "reserved" as const, prepared };
      });
      if (reservation.status === "forbidden" || reservation.status === "not-found") return reservation;
      if (!reservation.prepared.length) return { status: "ran" as const, runs: [] };

      const outcomes = await Promise.all(reservation.prepared.map(async (prepared) => {
        try {
          return {
            ...prepared,
            attempt: await sendNoticeRecord({ teacherId, noticeId: prepared.noticeId, origin })
          };
        } catch {
          return {
            ...prepared,
            attempt: {
              status: "failed" as const,
              attempted_at: now().toISOString()
            }
          };
        }
      }));

      return mutateDatabase((database) => {
        const runs: TeacherOpsReminderRunRecord[] = [];
        outcomes.forEach(({ runId, attempt }) => {
          const run = database.teacher_reminder_runs.find((candidate) => candidate.id === runId);
          if (!run) return;
          run.status = attempt.status;
          run.created_at = attempt.attempted_at;
          runs.push(run);
        });
        return { status: "ran" as const, runs: runs.map((run) => toTeacherReminderRun(database, run)) };
      });
    }
  };
}
