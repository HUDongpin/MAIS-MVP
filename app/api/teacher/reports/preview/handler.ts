import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherReportPreview } from "@/lib/server/userStore";
import type { StudentSession, TeacherReportLanguage, TeacherReportType } from "@/types";

const reportTypes = new Set<TeacherReportType>(["student", "class", "assignment", "assessment", "parent-summary"]);
const languages = new Set<TeacherReportLanguage>(["en", "zh", "zh-Hans"]);

type TeacherAuthentication = (
  request: Request
) => Promise<{ user: Pick<StudentSession, "id" | "role"> } | null>;

export function createTeacherReportPreviewGetHandler({
  authenticateUser = requireAuthenticatedUser,
  loadPreview = getTeacherReportPreview
}: {
  authenticateUser?: TeacherAuthentication;
  loadPreview?: typeof getTeacherReportPreview;
} = {}) {
  return async function teacherReportPreviewGet(request: Request) {
    const authenticated = await authenticateUser(request);
    if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

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
    if (!preview) return NextResponse.json({ error: "Report preview unavailable." }, { status: 404 });

    return NextResponse.json({ preview });
  };
}
