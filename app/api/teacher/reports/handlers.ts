import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import {
  guardExpectedTeacherReportUser,
  teacherReportPrivateJson,
  teacherReportPrivateResponse,
  teacherReportUnavailable
} from "@/app/api/teacher/reports/response";
import {
  getTeacherReportPreview,
  getTeacherReports,
  saveTeacherReportPreview,
  teacherReportPreviewToCsv,
  teacherReportPreviewToPdf
} from "@/lib/server/userStore";
import type { StudentSession, TeacherReportLanguage, TeacherReportType } from "@/types";

const reportTypes = new Set<TeacherReportType>(["student", "class", "assignment", "assessment", "parent-summary"]);
const languages = new Set<TeacherReportLanguage>(["en", "zh", "zh-Hans"]);

type TeacherAuthentication = (
  request: Request
) => Promise<{ user: Pick<StudentSession, "id" | "role"> } | null>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createTeacherReportSavePostHandler({
  authenticateUser = requireAuthenticatedUser,
  loadPreview = getTeacherReportPreview,
  savePreview = saveTeacherReportPreview
}: {
  authenticateUser?: TeacherAuthentication;
  loadPreview?: typeof getTeacherReportPreview;
  savePreview?: typeof saveTeacherReportPreview;
} = {}) {
  return async function teacherReportSavePost(request: Request) {
    try {
      const authenticated = await authenticateUser(request);
      if (!authenticated) return teacherReportPrivateJson({ error: "Not authenticated." }, { status: 401 });
      const expectedUserConflict = guardExpectedTeacherReportUser(authenticated, request);
      if (expectedUserConflict) return expectedUserConflict;
      if (!canAccessTeacherArea(authenticated.user)) return teacherReportPrivateJson({ error: "Teacher access required." }, { status: 403 });

      const body = await request.json().catch(() => null) as unknown;
      if (!isRecord(body)) return teacherReportPrivateJson({ error: "Request body must be an object." }, { status: 400 });
      const bodyExpectedUserConflict = guardExpectedTeacherReportUser(authenticated, request, body);
      if (bodyExpectedUserConflict) return bodyExpectedUserConflict;

      const type = reportTypes.has(body.type as TeacherReportType) ? (body.type as TeacherReportType) : "class";
      const language = languages.has(body.language as TeacherReportLanguage) ? (body.language as TeacherReportLanguage) : "zh";
      const preview = await loadPreview({
        teacherId: authenticated.user.id,
        type,
        language,
        classId: typeof body.classId === "string" ? body.classId : null,
        studentId: typeof body.studentId === "string" ? body.studentId : null,
        assignmentId: typeof body.assignmentId === "string" ? body.assignmentId : null,
        assessmentId: typeof body.assessmentId === "string" ? body.assessmentId : null,
        teacherRemarks: typeof body.remarks === "string" ? body.remarks : ""
      });
      if (!preview) return teacherReportPrivateJson({ error: "Report preview unavailable." }, { status: 404 });

      const result = await savePreview(authenticated.user.id, preview);
      if (result.status !== "saved") return teacherReportPrivateJson({ error: result.status }, { status: 403 });

      return teacherReportPrivateJson({ report: result.report }, { status: 201 });
    } catch {
      return teacherReportUnavailable("Report save temporarily unavailable.");
    }
  };
}

export function createTeacherReportCsvExportGetHandler({
  authenticateUser = requireAuthenticatedUser,
  loadPreview = getTeacherReportPreview
}: {
  authenticateUser?: TeacherAuthentication;
  loadPreview?: typeof getTeacherReportPreview;
} = {}) {
  return async function teacherReportCsvExportGet(request: Request) {
    try {
      const authenticated = await authenticateUser(request);
      if (!authenticated) return teacherReportPrivateJson({ error: "Not authenticated." }, { status: 401 });
      const expectedUserConflict = guardExpectedTeacherReportUser(authenticated, request);
      if (expectedUserConflict) return expectedUserConflict;
      if (!canAccessTeacherArea(authenticated.user)) return teacherReportPrivateJson({ error: "Teacher access required." }, { status: 403 });

      const url = new URL(request.url);
      const type = reportTypes.has(url.searchParams.get("type") as TeacherReportType)
        ? (url.searchParams.get("type") as TeacherReportType)
        : "class";
      const language = languages.has(url.searchParams.get("language") as TeacherReportLanguage)
        ? (url.searchParams.get("language") as TeacherReportLanguage)
        : "zh";
      const preview = await loadPreview({
        teacherId: authenticated.user.id,
        type,
        language,
        classId: url.searchParams.get("classId"),
        studentId: url.searchParams.get("studentId"),
        assignmentId: url.searchParams.get("assignmentId"),
        assessmentId: url.searchParams.get("assessmentId"),
        teacherRemarks: url.searchParams.get("remarks") ?? ""
      });
      if (!preview) return teacherReportPrivateJson({ error: "Report export unavailable." }, { status: 404 });

      const csv = teacherReportPreviewToCsv(preview);
      const filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      return teacherReportPrivateResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    } catch {
      return teacherReportUnavailable("Report export temporarily unavailable.");
    }
  };
}

export function createTeacherReportPdfExportGetHandler({
  authenticateUser = requireAuthenticatedUser,
  loadPreview = getTeacherReportPreview
}: {
  authenticateUser?: TeacherAuthentication;
  loadPreview?: typeof getTeacherReportPreview;
} = {}) {
  return async function teacherReportPdfExportGet(request: Request) {
    try {
      const authenticated = await authenticateUser(request);
      if (!authenticated) return teacherReportPrivateJson({ error: "Not authenticated." }, { status: 401 });
      const expectedUserConflict = guardExpectedTeacherReportUser(authenticated, request);
      if (expectedUserConflict) return expectedUserConflict;
      if (!canAccessTeacherArea(authenticated.user)) return teacherReportPrivateJson({ error: "Teacher access required." }, { status: 403 });

      const url = new URL(request.url);
      const type = reportTypes.has(url.searchParams.get("type") as TeacherReportType)
        ? (url.searchParams.get("type") as TeacherReportType)
        : "class";
      const language = languages.has(url.searchParams.get("language") as TeacherReportLanguage)
        ? (url.searchParams.get("language") as TeacherReportLanguage)
        : "zh";
      const preview = await loadPreview({
        teacherId: authenticated.user.id,
        type,
        language,
        classId: url.searchParams.get("classId"),
        studentId: url.searchParams.get("studentId"),
        assignmentId: url.searchParams.get("assignmentId"),
        assessmentId: url.searchParams.get("assessmentId"),
        teacherRemarks: url.searchParams.get("remarks") ?? ""
      });
      if (!preview) return teacherReportPrivateJson({ error: "Report PDF unavailable." }, { status: 404 });

      return teacherReportPrivateResponse(teacherReportPreviewToPdf(preview), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${type}-report-${new Date().toISOString().slice(0, 10)}.pdf"`
        }
      });
    } catch {
      return teacherReportUnavailable("Report PDF temporarily unavailable.");
    }
  };
}

export function createTeacherSavedReportsGetHandler({
  authenticateUser = requireAuthenticatedUser,
  loadReports = getTeacherReports
}: {
  authenticateUser?: TeacherAuthentication;
  loadReports?: typeof getTeacherReports;
} = {}) {
  return async function teacherSavedReportsGet(request: Request) {
    try {
      const authenticated = await authenticateUser(request);
      if (!authenticated) return teacherReportPrivateJson({ error: "Not authenticated." }, { status: 401 });
      const expectedUserConflict = guardExpectedTeacherReportUser(authenticated, request);
      if (expectedUserConflict) return expectedUserConflict;
      if (!canAccessTeacherArea(authenticated.user)) return teacherReportPrivateJson({ error: "Teacher access required." }, { status: 403 });

      const reports = await loadReports(authenticated.user.id);
      return teacherReportPrivateJson({ reports: reports ?? [] });
    } catch {
      return teacherReportUnavailable("Saved reports temporarily unavailable.");
    }
  };
}
