import { NextResponse } from "next/server";
import { canAccessTeacherArea, requireAuthenticatedUser } from "@/lib/server/auth";
import { reviewTeacherSubmission } from "@/lib/server/userStore";
import type { AssignmentTeacherReviewAction } from "@/types";

export const runtime = "nodejs";

function readAction(value: unknown): AssignmentTeacherReviewAction | null {
  return value === "score-only" || value === "accept" || value === "request-correction" || value === "resolve" ? value : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canAccessTeacherArea(authenticated.user)) return NextResponse.json({ error: "Teacher access required." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    action?: unknown;
    score?: unknown;
    feedback?: unknown;
    correctionRequest?: unknown;
    correctionDueAt?: unknown;
  } | null;
  const action = readAction(body?.action);
  if (!body || !action) return NextResponse.json({ error: "Review action is required." }, { status: 400 });

  const { submissionId } = await params;
  const result = await reviewTeacherSubmission({
    teacherId: authenticated.user.id,
    submissionId,
    action,
    score: typeof body.score === "number" && Number.isFinite(body.score) ? body.score : null,
    feedback: typeof body.feedback === "string" ? body.feedback : "",
    correctionRequest: typeof body.correctionRequest === "string" ? body.correctionRequest : "",
    correctionDueAt: typeof body.correctionDueAt === "string" ? body.correctionDueAt : null
  });

  if (result.status !== "reviewed") {
    return NextResponse.json({ error: result.status }, { status: result.status === "forbidden" ? 403 : 404 });
  }

  return NextResponse.json({ submission: result.submission });
}
