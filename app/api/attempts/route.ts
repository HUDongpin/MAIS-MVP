import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { gradeSeedQuestionAttempt } from "@/lib/server/answerGrading";
import { submitQuestionAttempt } from "@/lib/server/userStore";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

const maxAnswerLength = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCookie(header: string | null, name: string) {
  if (!header) return null;

  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function hasValidSessionToken(request: Request) {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!token) return false;

  return Boolean(await verifySessionToken(token));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const questionId = typeof body.questionId === "string" ? body.questionId.trim() : "";
  const selectedAnswer = typeof body.selectedAnswer === "string" ? body.selectedAnswer.trim().slice(0, maxAnswerLength) : "";
  const durationSeconds =
    typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds) && body.durationSeconds > 0
      ? Math.round(body.durationSeconds)
      : undefined;

  if (!questionId || !selectedAnswer) {
    return NextResponse.json({ error: "Question ID and selected answer are required." }, { status: 400 });
  }

  let authenticated: Awaited<ReturnType<typeof requireAuthenticatedUser>> = null;
  try {
    authenticated = await requireAuthenticatedUser(request);
  } catch {
    // A valid session can still be graded if production storage is temporarily unavailable.
  }

  if (!authenticated) {
    if (!(await hasValidSessionToken(request))) {
      return NextResponse.json({ error: "Log in before submitting tracked practice attempts." }, { status: 401 });
    }

    const fallbackFeedback = gradeSeedQuestionAttempt(questionId, selectedAnswer);
    if (!fallbackFeedback) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    return NextResponse.json(fallbackFeedback);
  }

  const feedback = await submitQuestionAttempt({
    userId: authenticated.user.id,
    questionId,
    selectedAnswer,
    durationSeconds,
    curriculumTrack: authenticated.user.curriculumProfile
  });

  if (!feedback) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  return NextResponse.json(feedback);
}
