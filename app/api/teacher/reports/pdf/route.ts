import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherReportPreview, teacherReportPreviewToPdf } from "@/lib/server/userStore";
import type { TeacherReportLanguage, TeacherReportType } from "@/types";

export const runtime = "nodejs";

const reportTypes = new Set<TeacherReportType>(["student", "class", "assignment", "assessment", "parent-summary"]);
const languages = new Set<TeacherReportLanguage>(["en", "zh", "zh-Hans"]);

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const url = new URL(request.url);
  const type = reportTypes.has(url.searchParams.get("type") as TeacherReportType)
    ? (url.searchParams.get("type") as TeacherReportType)
    : "class";
  const language = languages.has(url.searchParams.get("language") as TeacherReportLanguage)
    ? (url.searchParams.get("language") as TeacherReportLanguage)
    : "zh";
  const preview = await getTeacherReportPreview({
    teacherId: authenticated.user.id,
    type,
    language,
    classId: url.searchParams.get("classId"),
    studentId: url.searchParams.get("studentId"),
    assignmentId: url.searchParams.get("assignmentId"),
    assessmentId: url.searchParams.get("assessmentId"),
    teacherRemarks: url.searchParams.get("remarks") ?? ""
  });
  if (!preview) return NextResponse.json({ error: "Report PDF unavailable." }, { status: 404 });

  return new NextResponse(teacherReportPreviewToPdf(preview), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${type}-report-${new Date().toISOString().slice(0, 10)}.pdf"`
    }
  });
}

