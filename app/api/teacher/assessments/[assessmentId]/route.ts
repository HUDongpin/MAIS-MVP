import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { getTeacherAssessmentDetailData } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { assessmentId } = await params;
  const assessment = await getTeacherAssessmentDetailData(authenticated.user.id, assessmentId);
  if (!assessment) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

  return NextResponse.json({ assessment });
}
