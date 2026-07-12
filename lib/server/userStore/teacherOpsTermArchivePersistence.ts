import { randomUUID } from "crypto";
import type {
  Assignment,
  ClassRosterProfile,
  GradeId,
  Submission,
  TermArchive
} from "@/types";

type TeacherOpsTermArchiveUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsTermArchiveUserRecord = {
  id: string;
  role: TeacherOpsTermArchiveUserRole;
};

type TeacherOpsTermArchiveClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade?: GradeId;
};

type TeacherOpsTermArchiveSchoolMembershipRecord = {
  user_id: string;
  role: TeacherOpsTermArchiveUserRole;
  class_id?: string;
};

type TeacherOpsTermArchiveClassCollaboratorRecord = {
  class_id: string;
  teacher_id: string;
  role: "co-teacher" | "viewer";
  status: "active" | "revoked";
};

type TeacherOpsTermArchiveAssignmentRecord = {
  id: string;
  class_id: string;
  title_en?: string;
  title_zh?: string;
  updated_at: string;
};

type TeacherOpsTermArchiveSubmissionRecord = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: Submission["status"];
  updated_at: string;
};

type TeacherOpsTermArchiveReportRecord = {
  id: string;
  class_id?: string;
  generated_at?: string;
};

type TeacherOpsTermArchiveEnrollmentRecord = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

type TeacherOpsTermArchiveRecord = {
  id: string;
  class_id: string;
  class_name: string;
  term_label: string;
  created_by: string;
  created_at: string;
  snapshot_json: string;
};

export type TeacherOpsTermArchivePersistenceDatabase = {
  assignments: TeacherOpsTermArchiveAssignmentRecord[];
  class_enrollments: TeacherOpsTermArchiveEnrollmentRecord[];
  school_memberships?: TeacherOpsTermArchiveSchoolMembershipRecord[];
  submissions: TeacherOpsTermArchiveSubmissionRecord[];
  teacher_class_collaborators: TeacherOpsTermArchiveClassCollaboratorRecord[];
  teacher_classes: TeacherOpsTermArchiveClassRecord[];
  teacher_reports: TeacherOpsTermArchiveReportRecord[];
  term_archives: TeacherOpsTermArchiveRecord[];
  users: TeacherOpsTermArchiveUserRecord[];
};

export type TeacherOpsTermArchivePersistenceStoreDependencies = {
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsTermArchivePersistenceDatabase>;
  mutateDatabase: <T>(
    mutator: (database: TeacherOpsTermArchivePersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  isSubmissionComplete?: (submission: TeacherOpsTermArchiveSubmissionRecord) => boolean;
  rosterProfilesForClass: (
    database: TeacherOpsTermArchivePersistenceDatabase,
    classId: string
  ) => ClassRosterProfile[];
  toAssignment: (
    database: TeacherOpsTermArchivePersistenceDatabase,
    assignment: TeacherOpsTermArchiveAssignmentRecord
  ) => Assignment;
  toSubmission: (
    database: TeacherOpsTermArchivePersistenceDatabase,
    submission: TeacherOpsTermArchiveSubmissionRecord
  ) => Submission;
};

export type TeacherOpsTermArchivePersistenceStore = ReturnType<typeof createTeacherOpsTermArchivePersistenceStore>;

function canUseTeacherArea(user?: TeacherOpsTermArchiveUserRecord | null): user is TeacherOpsTermArchiveUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherCanAccessClass(
  database: TeacherOpsTermArchivePersistenceDatabase,
  user: TeacherOpsTermArchiveUserRecord,
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

function teacherCanReadOperationsClass(
  database: TeacherOpsTermArchivePersistenceDatabase,
  user: TeacherOpsTermArchiveUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (teacherCanAccessClass(database, user, classId)) return teacherClass;
  const collaborator = database.teacher_class_collaborators.find(
    (candidate) => candidate.class_id === classId && candidate.teacher_id === user.id && candidate.status === "active"
  );
  return collaborator ? teacherClass : null;
}

function teacherCanManageOperationsClass(
  database: TeacherOpsTermArchivePersistenceDatabase,
  user: TeacherOpsTermArchiveUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (user.role === "admin" || teacherClass.teacher_id === user.id) return teacherClass;
  const hasAdminMembership = (database.school_memberships ?? []).some(
    (membership) => membership.user_id === user.id && membership.class_id === classId && membership.role === "admin"
  );
  return hasAdminMembership ? teacherClass : null;
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function defaultSubmissionComplete(submission: TeacherOpsTermArchiveSubmissionRecord) {
  return (
    submission.status === "submitted" ||
    submission.status === "graded" ||
    submission.status === "late" ||
    submission.status === "correction-required" ||
    submission.status === "correction-submitted" ||
    submission.status === "resolved"
  );
}

export function teacherOpsTermArchiveSnapshot(record: TeacherOpsTermArchiveRecord): TermArchive["snapshot"] {
  try {
    const parsed = JSON.parse(record.snapshot_json) as Partial<TermArchive["snapshot"]>;
    return {
      studentCount: Number(parsed.studentCount) || 0,
      assignmentCount: Number(parsed.assignmentCount) || 0,
      submissionCount: Number(parsed.submissionCount) || 0,
      reportCount: Number(parsed.reportCount) || 0,
      averageCompletionRate: Number(parsed.averageCompletionRate) || 0
    };
  } catch {
    return {
      studentCount: 0,
      assignmentCount: 0,
      submissionCount: 0,
      reportCount: 0,
      averageCompletionRate: 0
    };
  }
}

export function toTeacherOpsTermArchive(record: TeacherOpsTermArchiveRecord): TermArchive {
  return {
    id: record.id,
    classId: record.class_id,
    className: record.class_name,
    termLabel: record.term_label,
    createdBy: record.created_by,
    createdAt: record.created_at,
    snapshot: teacherOpsTermArchiveSnapshot(record),
    exportUrl: `/api/teacher/term-archives/${encodeURIComponent(record.id)}/export`
  };
}

function archiveExportFileName(termLabel: string) {
  return `${termLabel.replace(/[^A-Za-z0-9_-]+/g, "-") || "term-archive"}.json`;
}

export function createTeacherOpsTermArchivePersistenceStore({
  createId = () => randomUUID(),
  now = () => new Date(),
  readDatabase,
  mutateDatabase,
  isSubmissionComplete = defaultSubmissionComplete,
  rosterProfilesForClass,
  toAssignment,
  toSubmission
}: TeacherOpsTermArchivePersistenceStoreDependencies) {
  return {
    async createTermArchive({
      teacherId,
      classId,
      termLabel
    }: {
      teacherId: string;
      classId: string;
      termLabel: string;
    }) {
      const trimmedTermLabel = termLabel.trim();
      if (!trimmedTermLabel) return { status: "invalid" as const };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const teacherClass = teacherCanManageOperationsClass(database, user, classId);
        if (!teacherClass) return { status: "forbidden" as const };

        const assignments = database.assignments.filter((assignment) => assignment.class_id === classId);
        const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
        const submissions = database.submissions.filter((submission) => assignmentIds.has(submission.assignment_id));
        const reports = database.teacher_reports.filter((report) => report.class_id === classId);
        const snapshot: TermArchive["snapshot"] = {
          studentCount: database.class_enrollments.filter((enrollment) => enrollment.class_id === classId).length,
          assignmentCount: assignments.length,
          submissionCount: submissions.length,
          reportCount: reports.length,
          averageCompletionRate: percent(submissions.filter(isSubmissionComplete).length, submissions.length)
        };
        const archive: TeacherOpsTermArchiveRecord = {
          id: `term-archive-${createId()}`,
          class_id: classId,
          class_name: teacherClass.name,
          term_label: trimmedTermLabel,
          created_by: user.id,
          created_at: now().toISOString(),
          snapshot_json: JSON.stringify(snapshot)
        };
        database.term_archives.unshift(archive);
        return { status: "created" as const, archive: toTeacherOpsTermArchive(archive) };
      });
    },

    async getTermArchiveExport(teacherId: string, archiveId: string) {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return null;
      const archive = database.term_archives.find((candidate) => candidate.id === archiveId);
      if (!archive || !teacherCanReadOperationsClass(database, user, archive.class_id)) return null;

      const assignments = database.assignments.filter((assignment) => assignment.class_id === archive.class_id);
      const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
      const submissions = database.submissions.filter((submission) => assignmentIds.has(submission.assignment_id));

      return {
        fileName: archiveExportFileName(archive.term_label),
        payload: {
          archive: toTeacherOpsTermArchive(archive),
          roster: rosterProfilesForClass(database, archive.class_id),
          assignments: assignments.map((assignment) => toAssignment(database, assignment)),
          submissions: submissions.map((submission) => toSubmission(database, submission))
        }
      };
    }
  };
}
