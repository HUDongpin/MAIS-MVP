import { NextResponse } from "next/server";
import { practiceAttemptFastPathPersistsRows, submitQuestionAttemptFast } from "@/lib/server/practiceAttemptStore";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

const maxAnswerLength = 500;
const maxAnswerWorkPhotoCount = 6;
const maxAnswerWorkPhotoDataUrlLength = 2_500_000;

type AnswerWorkPhoto = {
  dataUrl: string;
  name: string;
  size: number;
  type: string;
};

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

function readAnswerWorkPhotos(value: unknown): AnswerWorkPhoto[] | null {
  if (typeof value === "undefined") return [];
  if (!Array.isArray(value) || value.length > maxAnswerWorkPhotoCount) return null;

  const photos: AnswerWorkPhoto[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;

    const dataUrl = typeof item.dataUrl === "string" ? item.dataUrl : "";
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 180) : "";
    const size = typeof item.size === "number" && Number.isFinite(item.size) && item.size >= 0 ? Math.round(item.size) : -1;
    const type = typeof item.type === "string" ? item.type.trim().slice(0, 80) : "";

    if (
      !name ||
      size < 0 ||
      !type.startsWith("image/") ||
      dataUrl.length > maxAnswerWorkPhotoDataUrlLength ||
      !/^data:image\/[a-z0-9.+-]+;base64,/i.test(dataUrl)
    ) {
      return null;
    }

    photos.push({ dataUrl, name, size, type });
  }

  return photos;
}

async function verifiedSessionPayload(request: Request) {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!token) return null;

  return verifySessionToken(token);
}

async function persistLocalAttempt({
  durationSeconds,
  questionId,
  selectedAnswer,
  userId
}: {
  durationSeconds?: number;
  questionId: string;
  selectedAnswer: string;
  userId: string;
}) {
  const [{ getAuthenticatedUserById }, { submitQuestionAttempt }] = await Promise.all([
    import("@/lib/server/userStore/auth"),
    import("@/lib/server/userStore/studentActivity")
  ]);
  const authenticated = await getAuthenticatedUserById(userId);

  return submitQuestionAttempt({
    userId,
    questionId,
    selectedAnswer,
    durationSeconds,
    curriculumTrack: authenticated?.user.curriculumProfile
  });
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
  const answerWorkPhotos = readAnswerWorkPhotos(body.answerWorkPhotos);

  if (!questionId || !selectedAnswer) {
    return NextResponse.json({ error: "Question ID and selected answer are required." }, { status: 400 });
  }
  if (answerWorkPhotos === null) {
    return NextResponse.json({ error: "Attached work photos must be valid image submissions." }, { status: 400 });
  }

  const session = await verifiedSessionPayload(request);
  if (!session) {
    return NextResponse.json({ error: "Log in before submitting tracked practice attempts." }, { status: 401 });
  }

  const feedback = await submitQuestionAttemptFast({
    userId: session.sub,
    questionId,
    selectedAnswer,
    durationSeconds
  });

  if (!feedback) {
    if (!practiceAttemptFastPathPersistsRows()) {
      const persistedFeedback = await persistLocalAttempt({
        userId: session.sub,
        questionId,
        selectedAnswer,
        durationSeconds
      });

      if (persistedFeedback) {
        return NextResponse.json(persistedFeedback);
      }
    }

    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  if (!practiceAttemptFastPathPersistsRows()) {
    const persistedFeedback = await persistLocalAttempt({
      userId: session.sub,
      questionId,
      selectedAnswer,
      durationSeconds
    });

    return NextResponse.json(persistedFeedback ?? feedback);
  }

  return NextResponse.json(feedback);
}
