import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { refreshAdaptiveLearningRecommendation } from "@/lib/server/userStore";
import type { GradeId } from "@/types";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (authenticated.user.role !== "student") {
    return NextResponse.json({
      error: "Student access required.",
      reason: "student-only",
      guard: {
        en: "Adaptive learner state refresh is available only to the signed-in student in the P1 pilot loop.",
        zh: "P1 試點閉環中，適性學習者狀態刷新只對已登入學生本人開放。"
      }
    }, { status: 403 });
  }

  const url = new URL(request.url);
  const body = await request.json().catch(() => null) as unknown;
  const bodyRecord = isRecord(body) ? body : {};
  const gradeParam = typeof bodyRecord.grade === "string" ? bodyRecord.grade : url.searchParams.get("grade");
  const topicParam = typeof bodyRecord.topicId === "string" ? bodyRecord.topicId : url.searchParams.get("topicId");
  const grade = isValidGradeId(gradeParam)
    ? (gradeParam as GradeId)
    : authenticated.settings.selectedGrade;

  const result = await refreshAdaptiveLearningRecommendation({
    userId: authenticated.user.id,
    grade,
    topicId: topicParam,
    curriculumTrack: authenticated.user.curriculumProfile
  });

  return NextResponse.json(result);
}
