import type {
  ParentChildSummary,
  ParentReportData,
  StudentSession,
  TeacherReport,
  TeacherReportType
} from "@/types";
import { readTeacherReportPreview } from "@/lib/server/userStore/teacherReportPreviewDecoder";

type UserRole = StudentSession["role"];

type ParentReportUserRecord = {
  id: string;
  username?: string;
  role: UserRole;
};

type ParentReportGuardianLinkRecord = {
  parent_id: string;
  student_id: string;
  status: string;
};

type ParentReportStudentProfileRecord = {
  user_id: string;
  name?: string;
};

type ParentReportRecord = {
  id: string;
  type: TeacherReportType;
  title_en: string;
  title_zh: string;
  class_id?: string;
  student_id?: string;
  generated_by: string;
  generated_at: string;
  summary_en: string;
  summary_zh: string;
  preview_json?: string;
};

export type ParentReportPersistenceDatabase = {
  guardian_links: ParentReportGuardianLinkRecord[];
  student_profiles?: ParentReportStudentProfileRecord[];
  teacher_reports: ParentReportRecord[];
  users: ParentReportUserRecord[];
};

export type ParentReportPersistenceStoreDependencies = {
  getParentChildSummaries: (
    database: ParentReportPersistenceDatabase,
    user: ParentReportUserRecord
  ) => ParentChildSummary[];
  now?: () => Date;
  readDatabase: () => Promise<ParentReportPersistenceDatabase>;
  readParentDatabase?: (parentId: string) => Promise<ParentReportPersistenceDatabase>;
};

export type ParentReportPersistenceStore = ReturnType<typeof createParentReportPersistenceStore>;

function canUseParentArea(user?: ParentReportUserRecord | null): user is ParentReportUserRecord {
  return user?.role === "parent";
}

function reportAuthorName(
  database: Pick<ParentReportPersistenceDatabase, "student_profiles">,
  teacherId: string
) {
  // Parent-safe author labels never fall back to usernames because deployments may use an
  // email address there. A profile name is allowlisted; otherwise use a role label.
  return database.student_profiles?.find((profile) => profile.user_id === teacherId)?.name ?? "Teacher";
}

function toTeacherReport(
  database: Pick<ParentReportPersistenceDatabase, "student_profiles">,
  record: ParentReportRecord
): TeacherReport {
  return {
    id: record.id,
    type: record.type,
    title: {
      en: record.title_en,
      zh: record.title_zh
    },
    classId: record.class_id,
    studentId: record.student_id,
    generatedBy: record.generated_by,
    generatedByName: reportAuthorName(database, record.generated_by),
    generatedAt: record.generated_at,
    summary: {
      en: record.summary_en,
      zh: record.summary_zh
    },
    preview: readTeacherReportPreview(record.preview_json)
  };
}

export function parentReportsForStudent(
  database: Pick<ParentReportPersistenceDatabase, "student_profiles" | "teacher_reports">,
  studentId: string
) {
  return database.teacher_reports
    .filter((report) => report.type === "parent-summary" && report.student_id === studentId)
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
    .map((report) => toTeacherReport(database, report));
}

export function createParentReportPersistenceStore({
  getParentChildSummaries,
  now = () => new Date(),
  readDatabase,
  readParentDatabase
}: ParentReportPersistenceStoreDependencies) {
  const loadParentDatabase = readParentDatabase ?? (async () => readDatabase());

  return {
    async getParentReportData(parentId: string, selectedStudentId?: string | null): Promise<ParentReportData | null> {
      const database = await loadParentDatabase(parentId);
      const user = database.users.find((candidate) => candidate.id === parentId);
      if (!canUseParentArea(user)) return null;
      const children = getParentChildSummaries(database, user);
      // No `studentId` means "All children", which the view already renders as an unscoped
      // list ("All linked children are shown", and the All-children pill marked active when
      // `selectedChild` is null). Defaulting to `children[0]` here silently answered that
      // request with only the first child's reports, so a parent with two or more children saw
      // a subset while the UI told them they were seeing everything.
      // `parentNoticePersistence` resolves the same choice this way.
      const hasSelectedStudent = selectedStudentId !== undefined && selectedStudentId !== null;
      const selectedChild = hasSelectedStudent
        ? children.find((child) => child.student.id === selectedStudentId) ?? null
        : null;
      if (hasSelectedStudent && !selectedChild) return null;
      const allowedStudentIds = new Set(children.map((child) => child.student.id));
      const selectedStudentIds = selectedChild ? new Set([selectedChild.student.id]) : allowedStudentIds;

      return {
        generatedAt: now().toISOString(),
        children,
        selectedChild,
        reports: database.teacher_reports
          .filter((report) => (
            report.type === "parent-summary" &&
            report.student_id &&
            allowedStudentIds.has(report.student_id) &&
            selectedStudentIds.has(report.student_id)
          ))
          .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
          .map((report) => toTeacherReport(database, report))
      };
    }
  };
}
