import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { submitStudentAssessment } from "@/lib/server/userStore";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request, { params }: { params: Promise<{ assessmentId: string }> }) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null) as unknown;
  if (!isRecord(body) || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: "Assessment answers are required." }, { status: 400 });
  }

  const answers = body.answers
    .map((answer): { questionId: string; answer: string } | null => {
      if (!isRecord(answer) || typeof answer.questionId !== "string" || typeof answer.answer !== "string") return null;
      return { questionId: answer.questionId, answer: answer.answer };
    })
    .filter((answer): answer is { questionId: string; answer: string } => Boolean(answer));
  if (!answers.length) return NextResponse.json({ error: "Assessment answers are required." }, { status: 400 });

  const { assessmentId } = await params;
  const result = await submitStudentAssessment({
    userId: authenticated.user.id,
    assessmentId: decodeURIComponent(assessmentId),
    answers
  });

  if (result.status === "not-found") return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  if (result.status === "forbidden") return NextResponse.json({ error: "Assessment access denied." }, { status: 403 });
  if (result.status === "closed") return NextResponse.json({ error: "Assessment is not open." }, { status: 409 });
  if (result.status === "max-attempts") return NextResponse.json({ error: "Maximum attempts reached." }, { status: 409 });

  return NextResponse.json({ submission: result.submission, assessment: result.assessment });
}

