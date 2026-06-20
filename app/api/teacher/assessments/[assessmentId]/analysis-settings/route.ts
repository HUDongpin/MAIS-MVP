import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { updateTeacherAssessmentAnalysisSettings } from "@/lib/server/userStore";
import type { AssessmentAnalysisSettings } from "@/types";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Invalid analysis settings payload." }, { status: 400 });
  const settings = isRecord(body.analysisSettings) ? body.analysisSettings : body;
  const { assessmentId } = await params;
  const result = await updateTeacherAssessmentAnalysisSettings({
    teacherId: authenticated.user.id,
    assessmentId: decodeURIComponent(assessmentId),
    analysisSettings: settings as Partial<AssessmentAnalysisSettings>,
    examGroupId: typeof body.examGroupId === "string" ? body.examGroupId : null,
    examGroupName: typeof body.examGroupName === "string" ? body.examGroupName : null
  });

  if (result.status !== "updated") {
    const status = result.status === "forbidden" ? 403 : 404;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ assessment: result.assessment });
}
