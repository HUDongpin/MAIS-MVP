import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { publishTeacherReviewLessonParentDraft } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ reviewLessonId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { reviewLessonId } = await params;
  const result = await publishTeacherReviewLessonParentDraft({
    teacherId: authenticated.user.id,
    reviewLessonId: decodeURIComponent(reviewLessonId)
  });

  if (result.status !== "published") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : result.status === "needs-review" ? 409 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ draft: result.draft });
}
