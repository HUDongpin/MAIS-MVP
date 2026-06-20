import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { generateTeacherReviewLessonPlan } from "@/lib/server/userStore";
import type { Language } from "@/types";

export const runtime = "nodejs";

const validLanguages = new Set<Language>(["en", "zh", "zh-Hans"]);

export async function POST(request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    language?: unknown;
    durationMinutes?: unknown;
  } | null;
  const { assessmentId } = await params;
  const result = await generateTeacherReviewLessonPlan({
    teacherId: authenticated.user.id,
    assessmentId: decodeURIComponent(assessmentId),
    language: validLanguages.has(body?.language as Language) ? (body?.language as Language) : "zh-Hans",
    durationMinutes: typeof body?.durationMinutes === "number" ? body.durationMinutes : 45
  });

  if (result.status !== "generated") {
    const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ reviewLesson: result.reviewLesson }, { status: 201 });
}
