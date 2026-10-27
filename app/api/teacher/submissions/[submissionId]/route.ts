import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { updateTeacherSubmissionGrade, withAuthenticatedMutation } from "@/lib/server/userStore";
import { learnerAuthorityFailureResponse } from "@/lib/server/learnerAuthorityState";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { submissionId } = await params;
  const body = await request.json().catch(() => null) as { score?: unknown; feedback?: unknown } | null;
  if (!body || typeof body.score !== "number" || !Number.isFinite(body.score)) {
    return NextResponse.json({ error: "Score is required." }, { status: 400 });
  }

  const score = body.score;
  const result = await withAuthenticatedMutation(authenticated, () => updateTeacherSubmissionGrade({
    teacherId: authenticated.user.id,
    submissionId,
    score,
    feedback: typeof body.feedback === "string" ? body.feedback : ""
  }), [], { kind: "submission", id: submissionId }).catch(learnerAuthorityFailureResponse);
  if (result instanceof Response) return result;

  if (result.status !== "graded") {
    return NextResponse.json({ error: result.status }, { status: result.status === "forbidden" ? 403 : 404 });
  }

  return NextResponse.json({ submission: result.submission });
}
