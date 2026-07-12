import type {
  ParentChildSummary,
  ParentReportData,
  StudentSession,
  TeacherReport,
  TeacherReportPreview,
  TeacherReportType
} from "@/types";

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
};

export type ParentReportPersistenceStore = ReturnType<typeof createParentReportPersistenceStore>;

function canUseParentArea(user?: ParentReportUserRecord | null): user is ParentReportUserRecord {
  return user?.role === "parent" || user?.role === "admin";
}

function readTeacherReportPreview(value?: string): TeacherReportPreview | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<TeacherReportPreview> | null;
    if (
      typeof parsed?.id === "string" &&
      typeof parsed.type === "string" &&
      typeof parsed.title === "string" &&
      typeof parsed.subtitle === "string" &&
      typeof parsed.generatedAt === "string" &&
      typeof parsed.subjectName === "string" &&
      parsed.metrics &&
      Array.isArray(parsed.strengths) &&
      Array.isArray(parsed.weaknesses) &&
      Array.isArray(parsed.mistakeTypes) &&
      Array.isArray(parsed.suggestedPractice)
    ) {
      return parsed as TeacherReportPreview;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function toTeacherReport(record: ParentReportRecord): TeacherReport {
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
    generatedAt: record.generated_at,
    summary: {
      en: record.summary_en,
      zh: record.summary_zh
    },
    preview: readTeacherReportPreview(record.preview_json)
  };
}

export function parentReportsForStudent(
  database: Pick<ParentReportPersistenceDatabase, "teacher_reports">,
  studentId: string
) {
  return database.teacher_reports
    .filter((report) => report.type === "parent-summary" && report.student_id === studentId)
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
    .map((report) => toTeacherReport(report));
}

export function createParentReportPersistenceStore({
  getParentChildSummaries,
  now = () => new Date(),
  readDatabase
}: ParentReportPersistenceStoreDependencies) {
  return {
    async getParentReportData(parentId: string, selectedStudentId?: string | null): Promise<ParentReportData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === parentId);
      if (!canUseParentArea(user)) return null;
      const children = getParentChildSummaries(database, user);
      const selectedChild = selectedStudentId
        ? children.find((child) => child.student.id === selectedStudentId) ?? null
        : children[0] ?? null;
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
          .map((report) => toTeacherReport(report))
      };
    }
  };
}
