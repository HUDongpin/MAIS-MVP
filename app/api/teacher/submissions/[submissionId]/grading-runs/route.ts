import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { createTeacherSubmissionGradingRun, withAuthenticatedMutation } from "@/lib/server/userStore";
import { learnerAuthorityFailureResponse } from "@/lib/server/learnerAuthorityState";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const { submissionId } = await params;
  const result = await withAuthenticatedMutation(authenticated, () => createTeacherSubmissionGradingRun({
    teacherId: authenticated.user.id,
    submissionId
  }), [], { kind: "submission", id: submissionId }).catch(learnerAuthorityFailureResponse);
  if (result instanceof Response) return result;

  if (result.status !== "created") {
    return NextResponse.json({ error: result.status }, { status: result.status === "forbidden" ? 403 : 404 });
  }

  return NextResponse.json({ gradingRun: result.gradingRun, submission: result.submission }, { status: 201 });
}
