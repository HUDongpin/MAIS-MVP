import { createHash, randomUUID } from "crypto";
import type {
  SubmissionStatus,
  TeacherMissingWorkItem,
  TeacherNoticeDeliveryStatus,
  TeacherReminderRun,
  TeacherReminderThreshold
} from "@/types";
import { normalizeTeacherNoticeRequestIdempotency } from "@/lib/server/userStore/teacherOpsNoticePersistence";

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
  request_idempotency_key_hash?: string;
  request_idempotency_request_hash?: string;
  request_next_cursor?: string | null;
};

type RunTeacherMissingWorkRemindersResult =
  | { status: "ran"; runs: TeacherReminderRun[]; nextCursor?: string | null }
  | { status: "conflict" | "forbidden" | "invalid" | "no-eligible" | "not-found" };

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
  mutateDatabaseWithNoticeOutbox: (
    teacherId: string,
    mutator: (database: TeacherOpsReminderPersistenceDatabase) =>
      | { result: RunTeacherMissingWorkRemindersResult; noticeIds: string[]; noEligibleResult?: RunTeacherMissingWorkRemindersResult; commitWithoutEligibleRows?: boolean }
      | Promise<{ result: RunTeacherMissingWorkRemindersResult; noticeIds: string[]; noEligibleResult?: RunTeacherMissingWorkRemindersResult; commitWithoutEligibleRows?: boolean }>
  ) => Promise<{
    result: RunTeacherMissingWorkRemindersResult;
    outbox: { queued: number; reused: number; recovered: number; skipped: number };
  }>;
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
  sendNotice?: (input: {
    teacherId: string;
    noticeId: string;
    idempotencyKey: string;
  }) => Promise<
    | { status: "sent"; attempt: { status: TeacherNoticeDeliveryStatus; attemptedAt: string } }
    | { status: "invalid" | "conflict" | "not-found" }
  >;
  recordDeliveryResult?: (input: {
    runId: string;
    status: TeacherNoticeDeliveryStatus;
    attemptedAt: string;
  }) => Promise<void>;
  toTeacherReminderRun: (
    database: TeacherOpsReminderPersistenceDatabase,
    record: TeacherOpsReminderRunRecord
  ) => TeacherReminderRun;
};

export type TeacherOpsReminderPersistenceStore = ReturnType<typeof createTeacherOpsReminderPersistenceStore>;

const dayMs = 24 * 60 * 60 * 1000;

function teacherOpsReminderCursorFor(item: { assignmentId: string; studentId: string }) {
  return `${item.assignmentId}\u0000${item.studentId}`;
}

function compareTeacherOpsReminderCursors(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function selectTeacherOpsReminderBatch<Item extends { assignmentId: string; studentId: string }>({
  items,
  cursor,
  limit,
  isEligible
}: {
  items: Item[];
  cursor?: string | null;
  limit: number;
  isEligible: (item: Item) => boolean;
}) {
  const boundedLimit = Number.isInteger(limit) ? Math.max(1, Math.min(100, limit)) : 100;
  const ordered = [...items].sort((left, right) => compareTeacherOpsReminderCursors(
    teacherOpsReminderCursorFor(left),
    teacherOpsReminderCursorFor(right)
  ));
  const eligible = ordered.filter((item) =>
    (!cursor || compareTeacherOpsReminderCursors(teacherOpsReminderCursorFor(item), cursor) > 0) && isEligible(item)
  );
  const selected = eligible.slice(0, boundedLimit);
  return {
    items: selected,
    nextCursor: eligible.length > selected.length && selected.length
      ? teacherOpsReminderCursorFor(selected[selected.length - 1]!)
      : null
  };
}

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
  return user?.role === "teacher";
}

export function createTeacherOpsReminderPersistenceStore({
  createId = () => randomUUID(),
  now = () => new Date(),
  mutateDatabaseWithNoticeOutbox,
  teacherOperationClassRecordsFor,
  teacherCanMutateOperationsClass,
  missingWorkItemsForClasses,
  createNoticeRecord,
  sendNotice,
  recordDeliveryResult,
  toTeacherReminderRun
}: TeacherOpsReminderPersistenceStoreDependencies) {
  return {
    async runTeacherMissingWorkReminders({
      teacherId,
      classId,
      assignmentId,
      manual = false,
      idempotencyKey,
      cursor = null
    }: {
      teacherId: string;
      classId?: string | null;
      assignmentId?: string | null;
      manual?: boolean;
      idempotencyKey?: string;
      cursor?: string | null;
    }) {
      const idempotency = idempotencyKey === undefined
        ? null
        : normalizeTeacherNoticeRequestIdempotency({
            actorId: teacherId,
            key: idempotencyKey,
            operation: "reminder-run",
            payload: { assignmentId: assignmentId ?? null, classId: classId ?? null, cursor, manual }
          });
      if (idempotencyKey !== undefined && !idempotency) return { status: "invalid" as const };
      const publication = await mutateDatabaseWithNoticeOutbox(teacherId, async (database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) {
          return { result: { status: "forbidden" as const }, noticeIds: [] };
        }
        const classRecords = teacherOperationClassRecordsFor(database, user)
          .filter((teacherClass) => !classId || teacherClass.id === classId)
          .filter((teacherClass) => Boolean(teacherCanMutateOperationsClass(database, user, teacherClass.id)));
        if (classId && !classRecords.length) {
          return { result: { status: "not-found" as const }, noticeIds: [] };
        }

        if (idempotency) {
          const replayRuns = database.teacher_reminder_runs.filter(
            (run) => run.request_idempotency_key_hash === idempotency.keyHash
          );
          if (replayRuns.some((run) => run.request_idempotency_request_hash !== idempotency.requestHash)) {
            return { result: { status: "conflict" as const }, noticeIds: [] };
          }
          if (replayRuns.length) {
            return {
              result: {
                status: "ran" as const,
                runs: replayRuns.map((run) => toTeacherReminderRun(database, run)),
                nextCursor: replayRuns[0]?.request_next_cursor ?? null
              },
              noticeIds: replayRuns.flatMap((run) => run.notice_id ? [run.notice_id] : [])
            };
          }
        }

        const selection = selectTeacherOpsReminderBatch({
          items: missingWorkItemsForClasses(database, classRecords),
          cursor,
          limit: 100,
          isEligible: (item) => {
            if (assignmentId && item.assignmentId !== assignmentId) return false;
            const threshold = manual ? "manual" : item.nextThreshold;
            if (!threshold) return false;
            return manual || !database.teacher_reminder_runs.some(
              (run) =>
                run.assignment_id === item.assignmentId &&
                run.student_id === item.studentId &&
                run.threshold === threshold &&
                run.status !== "skipped"
            );
          }
        });
        const items = selection.items;
        const runs: TeacherOpsReminderRunRecord[] = [];
        const noticeIds: string[] = [];

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
          const queuedAt = now().toISOString();
          const run: TeacherOpsReminderRunRecord = {
            id: `teacher-reminder-run-${createId()}`,
            teacher_id: user.id,
            class_id: item.classId,
            assignment_id: item.assignmentId,
            student_id: item.studentId,
            notice_id: notice.id,
            threshold,
            status: "queued",
            reason: manual ? "Manual reminder queued by teacher." : `Automatic missing-work threshold ${threshold} queued.`,
            created_at: queuedAt,
            request_idempotency_key_hash: idempotency?.keyHash,
            request_idempotency_request_hash: idempotency?.requestHash,
            request_next_cursor: selection.nextCursor
          };
          database.teacher_reminder_runs.unshift(run);
          runs.push(run);
          noticeIds.push(notice.id);
        }

        return {
          commitWithoutEligibleRows: true,
          result: {
            status: "ran" as const,
            runs: runs.map((run) => toTeacherReminderRun(database, run)),
            nextCursor: selection.nextCursor
          },
          noEligibleResult: { status: "no-eligible" as const },
          noticeIds
        };
      });
      if (
        publication.result.status !== "ran" ||
        !sendNotice ||
        !recordDeliveryResult
      ) return publication.result;

      const runs = [] as TeacherReminderRun[];
      for (const run of publication.result.runs) {
        if (!run.noticeId) {
          runs.push(run);
          continue;
        }
        const runKey = createHash("sha256")
          .update(JSON.stringify({ noticeId: run.noticeId, runId: run.id }), "utf8")
          .digest("hex");
        const delivery = await sendNotice({
          teacherId,
          noticeId: run.noticeId,
          idempotencyKey: `teacher-reminder-wecom/${runKey}`
        });
        if (delivery.status !== "sent") {
          runs.push(run);
          continue;
        }
        await recordDeliveryResult({
          runId: run.id,
          status: delivery.attempt.status,
          attemptedAt: delivery.attempt.attemptedAt
        });
        runs.push({ ...run, status: delivery.attempt.status });
      }
      return { ...publication.result, runs };
    }
  };
}
