import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { cloneTeacherAssessment } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { assessmentId } = await params;
  const result = await cloneTeacherAssessment(authenticated.user.id, decodeURIComponent(assessmentId));
  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : 404;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ assessment: result.assessment }, { status: 201 });
}
