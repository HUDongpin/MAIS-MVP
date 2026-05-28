import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getAdaptiveLearningDecision } from "@/lib/server/userStore";
import type { GradeId } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const gradeParam = url.searchParams.get("grade");
  const grade = isValidGradeId(gradeParam)
    ? (gradeParam as GradeId)
    : authenticated.settings.selectedGrade;
  const topicId = url.searchParams.get("topicId");
  const decision = await getAdaptiveLearningDecision({
    userId: authenticated.user.id,
    grade,
    topicId,
    curriculumTrack: authenticated.user.curriculumProfile
  });

  if (!decision) {
    return NextResponse.json({ error: "No adaptive learning decision is available." }, { status: 404 });
  }

  return NextResponse.json({ decision });
}
