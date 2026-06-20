import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { updateTeacherAssessmentSubmissionMarking } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string; submissionId: string }> }
) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!isRecord(body) || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: "Assessment marking answers are required." }, { status: 400 });
  }

  const answers = body.answers
    .filter(isRecord)
    .map((answer) => ({
      questionId: typeof answer.questionId === "string" ? answer.questionId : "",
      pointsEarned: typeof answer.pointsEarned === "number" ? answer.pointsEarned : null,
      isCorrect: typeof answer.isCorrect === "boolean" ? answer.isCorrect : null,
      teacherFeedback: typeof answer.teacherFeedback === "string" ? answer.teacherFeedback : null
    }))
    .filter((answer) => answer.questionId);
  if (!answers.length) return NextResponse.json({ error: "Assessment marking answers are required." }, { status: 400 });

  const { assessmentId, submissionId } = await params;
  const result = await updateTeacherAssessmentSubmissionMarking({
    teacherId: authenticated.user.id,
    assessmentId: decodeURIComponent(assessmentId),
    submissionId: decodeURIComponent(submissionId),
    answers
  });

  if (result.status !== "updated") {
    const status = result.status === "forbidden" ? 403 : 404;
    return NextResponse.json({ error: result.status }, { status });
  }

  return NextResponse.json({ submission: result.submission, assessment: result.assessment });
}
