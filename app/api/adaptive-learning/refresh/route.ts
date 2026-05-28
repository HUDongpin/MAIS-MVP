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
