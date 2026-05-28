import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherReportPreview, saveTeacherReportPreview } from "@/lib/server/userStore";
import type { TeacherReportLanguage, TeacherReportType } from "@/types";

export const runtime = "nodejs";

const reportTypes = new Set<TeacherReportType>(["student", "class", "assignment", "assessment", "parent-summary"]);
const languages = new Set<TeacherReportLanguage>(["en", "zh", "zh-Hans"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as unknown;
  if (!isRecord(body)) return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });

  const type = reportTypes.has(body.type as TeacherReportType) ? (body.type as TeacherReportType) : "class";
  const language = languages.has(body.language as TeacherReportLanguage) ? (body.language as TeacherReportLanguage) : "zh";
  const preview = await getTeacherReportPreview({
    teacherId: authenticated.user.id,
    type,
    language,
    classId: typeof body.classId === "string" ? body.classId : null,
    studentId: typeof body.studentId === "string" ? body.studentId : null,
    assignmentId: typeof body.assignmentId === "string" ? body.assignmentId : null,
    assessmentId: typeof body.assessmentId === "string" ? body.assessmentId : null,
    teacherRemarks: typeof body.remarks === "string" ? body.remarks : ""
  });
  if (!preview) return NextResponse.json({ error: "Report preview unavailable." }, { status: 404 });

  const result = await saveTeacherReportPreview(authenticated.user.id, preview);
  if (result.status !== "saved") return NextResponse.json({ error: result.status }, { status: 403 });

  return NextResponse.json({ report: result.report }, { status: 201 });
}

