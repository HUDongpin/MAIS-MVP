import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createReviewLessonRemediationAssessment } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ reviewLessonId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { reviewLessonId } = await params;
  const result = await createReviewLessonRemediationAssessment(authenticated.user.id, decodeURIComponent(reviewLessonId));
  if (result.status !== "created") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : result.status === "needs-review" ? 409 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ assessment: result.assessment, reviewLesson: result.reviewLesson }, { status: 201 });
}
