import { NextResponse } from "next/server";
import { evaluateMediaStoragePolicy, mediaStoragePolicyFromEnv } from "@/lib/server/aiGovernance";
import {
  mediaObjectReferenceFromUnknown,
  readStoredMediaObject,
  type StoredMediaObjectReference
} from "@/lib/server/mediaObjectStore";
import { practiceAttemptFastPathPersistsRows, submitQuestionAttemptFast } from "@/lib/server/practiceAttemptStore";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

const maxAnswerLength = 500;
const maxAnswerWorkPhotoCount = 6;

/**
 * Work photos arrive as governed media-object REFERENCES, not image bytes. The
 * client uploads each photo to `/api/media-objects` (capability
 * `practice-work-photo`) while the student is still working, then submits the
 * returned references here. That keeps scanning, encryption, retention and the
 * per-capability rate limit on one path, and keeps the highest-volume write in
 * the product — the practice attempt — off the megabyte payload path.
 */
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

async function readAnswerWorkPhotos(
  value: unknown,
  requester: { id: string; role: string }
): Promise<{ photos?: StoredMediaObjectReference[]; error?: string; status?: number }> {
  if (typeof value === "undefined" || value === null) return { photos: [] };
  if (!Array.isArray(value) || value.length > maxAnswerWorkPhotoCount) {
    return { error: "Attached work photos must be valid image submissions.", status: 400 };
  }

  const policy = mediaStoragePolicyFromEnv();
  const photos: StoredMediaObjectReference[] = [];

  for (const item of value) {
    const media = mediaObjectReferenceFromUnknown(item);
    // The prefix check is the ownership boundary between capabilities: without
    // it a caller could submit somebody else's assignment-image key here.
    if (!media || !media.objectKey.startsWith("practice-work-photo/")) {
      return { error: "Work photo reference is invalid.", status: 400 };
    }

    const decision = evaluateMediaStoragePolicy({ policy, capability: "practice-work-photo", media });
    if (!decision.allowed) {
      return { error: decision.message, status: 400 };
    }

    // Confirms the object exists, has not passed its retention expiry, and that
    // this student may read it — a reference alone proves none of those.
    const stored = await readStoredMediaObject({ objectKey: media.objectKey, requester });
    if (stored.status !== "ok") {
      return {
        error: stored.message,
        status: stored.status === "forbidden" ? 403 : stored.status === "expired" ? 410 : 404
      };
    }

    photos.push(media);
  }

  return { photos };
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
  userId,
  answerWorkPhotos
}: {
  durationSeconds?: number;
  questionId: string;
  selectedAnswer: string;
  userId: string;
  answerWorkPhotos?: StoredMediaObjectReference[];
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
    curriculumTrack: authenticated?.user.curriculumProfile,
    answerWorkPhotos
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
  if (!questionId || !selectedAnswer) {
    return NextResponse.json({ error: "Question ID and selected answer are required." }, { status: 400 });
  }

  // Auth first: validating work-photo references reads the media store, so it
  // must not run for an unauthenticated caller.
  const session = await verifiedSessionPayload(request);
  if (!session) {
    return NextResponse.json({ error: "Log in before submitting tracked practice attempts." }, { status: 401 });
  }

  const workPhotos = await readAnswerWorkPhotos(body.answerWorkPhotos, { id: session.sub, role: "student" });
  if (workPhotos.error) {
    return NextResponse.json({ error: workPhotos.error }, { status: workPhotos.status ?? 400 });
  }
  const answerWorkPhotos = workPhotos.photos ?? [];

  const feedback = await submitQuestionAttemptFast({
    userId: session.sub,
    questionId,
    selectedAnswer,
    durationSeconds,
    answerWorkPhotos
  });

  if (!feedback) {
    if (!practiceAttemptFastPathPersistsRows()) {
      const persistedFeedback = await persistLocalAttempt({
        userId: session.sub,
        questionId,
        selectedAnswer,
        durationSeconds,
        answerWorkPhotos
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
      durationSeconds,
      answerWorkPhotos
    });

    return NextResponse.json(persistedFeedback ?? feedback);
  }

  return NextResponse.json(feedback);
}
