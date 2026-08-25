import { NextResponse } from "next/server";
import { evaluateMediaStoragePolicy, mediaStoragePolicyFromEnv } from "@/lib/server/aiGovernance";
import {
  mediaObjectReferenceFromUnknown,
  readStoredMediaObject,
  type StoredMediaObjectReference
} from "@/lib/server/mediaObjectStore";
import { practiceAttemptFastPathPersistsRows, submitQuestionAttemptFast } from "@/lib/server/practiceAttemptStore";
import {
  bodyExpectedUserConstraints,
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser,
  requireAuthenticatedUser
} from "@/lib/server/auth";
import type { CurriculumProfile } from "@/types";

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

async function persistLocalAttempt({
  durationSeconds,
  questionId,
  selectedAnswer,
  userId,
  answerWorkPhotos,
  curriculumProfile
}: {
  durationSeconds?: number;
  questionId: string;
  selectedAnswer: string;
  userId: string;
  answerWorkPhotos?: StoredMediaObjectReference[];
  curriculumProfile: CurriculumProfile;
}) {
  const { submitQuestionAttempt } = await import("@/lib/server/userStore/studentActivity");

  return submitQuestionAttempt({
    userId,
    questionId,
    selectedAnswer,
    durationSeconds,
    curriculumTrack: curriculumProfile,
    answerWorkPhotos
  });
}

export async function POST(request: Request) {
  // Authenticate before parsing or validating account-owned content. A caller
  // with a stale page may otherwise finish an asynchronous photo/read step
  // after the browser cookie has moved to another signed-in account.
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Log in before submitting tracked practice attempts." }, { status: 401 });
  }

  const transportExpectedUserConflict = guardExpectedAuthenticatedUser(
    authenticated,
    expectedUserConstraintsFromRequest(request)
  );
  if (transportExpectedUserConflict) return transportExpectedUserConflict;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const expectedUserConflict = guardExpectedAuthenticatedUser(
      authenticated,
      expectedUserConstraintsFromRequest(request),
      { requireConstraint: true }
    );
    if (expectedUserConflict) return expectedUserConflict;
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const expectedUserConflict = guardExpectedAuthenticatedUser(
    authenticated,
    [
      ...expectedUserConstraintsFromRequest(request),
      ...bodyExpectedUserConstraints(body)
    ],
    { requireConstraint: true }
  );
  if (expectedUserConflict) return expectedUserConflict;

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

  const userId = authenticated.user.id;
  const workPhotos = await readAnswerWorkPhotos(body.answerWorkPhotos, { id: userId, role: authenticated.user.role });
  if (workPhotos.error) {
    return NextResponse.json({ error: workPhotos.error }, { status: workPhotos.status ?? 400 });
  }
  const answerWorkPhotos = workPhotos.photos ?? [];

  const feedback = await submitQuestionAttemptFast({
    userId,
    questionId,
    selectedAnswer,
    durationSeconds,
    answerWorkPhotos
  });

  if (!feedback) {
    if (!practiceAttemptFastPathPersistsRows()) {
      const persistedFeedback = await persistLocalAttempt({
        userId,
        questionId,
        selectedAnswer,
        durationSeconds,
        answerWorkPhotos,
        curriculumProfile: authenticated.user.curriculumProfile
      });

      if (persistedFeedback) {
        return NextResponse.json(persistedFeedback);
      }
    }

    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  if (!practiceAttemptFastPathPersistsRows()) {
    const persistedFeedback = await persistLocalAttempt({
      userId,
      questionId,
      selectedAnswer,
      durationSeconds,
      answerWorkPhotos,
      curriculumProfile: authenticated.user.curriculumProfile
    });

    return NextResponse.json(persistedFeedback ?? feedback);
  }

  return NextResponse.json(feedback);
}
