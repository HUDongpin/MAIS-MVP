import { NextResponse } from "next/server";
import { isValidGradeId } from "@/data/grades";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { getAdaptiveContentUnavailableForCurriculum, getAdaptiveLearningDecision } from "@/lib/server/userStore";
import type { GradeId } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (authenticated.user.role !== "student") {
    return NextResponse.json({
      error: "Student access required.",
      reason: "student-only",
      guard: {
        en: "Adaptive learner state is available only to the signed-in student in the P1 pilot loop.",
        zh: "P1 試點閉環中，適性學習者狀態只對已登入學生本人開放。", zhHans: "P1 试点闭环中，自适应学习者状态只对已登录学生本人开放。"
      }
    }, { status: 403 });
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
    const contentUnavailable = getAdaptiveContentUnavailableForCurriculum(authenticated.user.curriculumProfile, grade);
    if (contentUnavailable) {
      return NextResponse.json({
        error: "No adaptive learning decision is available because this curriculum content is not open yet.",
        reason: "content-unavailable",
        contentUnavailable
      }, { status: 404 });
    }

    return NextResponse.json({ error: "No adaptive learning decision is available." }, { status: 404 });
  }

  return NextResponse.json({ decision });
}
