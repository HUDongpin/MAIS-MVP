import { NextResponse } from "next/server";
import { bodyExpectedUserConstraints, expectedUserConstraintsFromRequest, guardExpectedAuthenticatedUser, requireLessonProgressAuthenticatedUser } from "@/lib/server/auth";
import { getLearnerAuthoritySaveIdentity, updateLessonProgress } from "@/lib/server/userStore";
import { issueLearnerAuthorityIntent, readLearnerAuthorityIntent } from "@/lib/server/learnerAuthorityIntent";
import { LearnerAuthorityError } from "@/lib/server/learnerAuthorityState";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = await requireLessonProgressAuthenticatedUser(request);
  if (!authenticated || authenticated.user.role !== "student") return NextResponse.json({ error: "Student access required." }, { status: 401 });
  const conflict = guardExpectedAuthenticatedUser(authenticated, expectedUserConstraintsFromRequest(request), { requireConstraint: true });
  if (conflict) return conflict;
  const identity = await getLearnerAuthoritySaveIdentity(authenticated.user.id);
  return NextResponse.json({ intent: identity ? issueLearnerAuthorityIntent({ userId: authenticated.user.id,
    sessionRevision: authenticated.sessionRevision, generation: identity.generation, resetEpoch: identity.resetEpoch,
    publicationId: identity.publicationId, definitionEpoch: identity.definitionEpoch }) : null },
    { headers: { "Cache-Control": "private, no-store" } });
}

function readChecklistState(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, checked]) => typeof key === "string" && typeof checked === "boolean")
      .map(([key, checked]) => [key, checked])
  );
}

export async function POST(request: Request) {
  const authenticated = await requireLessonProgressAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const transportConflict = guardExpectedAuthenticatedUser(authenticated, expectedUserConstraintsFromRequest(request));
  if (transportConflict) return transportConflict;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const conflict = guardExpectedAuthenticatedUser(authenticated, expectedUserConstraintsFromRequest(request), { requireConstraint: true });
    if (conflict) return conflict;
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const identityConflict = guardExpectedAuthenticatedUser(authenticated, [
    ...expectedUserConstraintsFromRequest(request), ...bodyExpectedUserConstraints(body)
  ], { requireConstraint: true });
  if (identityConflict) return identityConflict;
  if (authenticated.user.role !== "student") {
    return NextResponse.json({ error: "Student access required.", reason: "student-only" }, { status: 403 });
  }

  const record = body as {
    slug?: unknown;
    action?: unknown;
    durationSeconds?: unknown;
    checklistState?: unknown;
    intent?: unknown;
    operationId?: unknown;
  } | null;
  const action = record?.action === "complete" || record?.action === "update" ? record.action : "start";
  const durationSeconds =
    typeof record?.durationSeconds === "number" && Number.isFinite(record.durationSeconds)
      ? record.durationSeconds
      : undefined;

  if (typeof record?.slug !== "string" || !record.slug.trim()) {
    return NextResponse.json({ error: "Lesson slug is required." }, { status: 400 });
  }

  try {
  let authority;
  if (record.intent !== undefined && record.intent !== null) {
    const intent = readLearnerAuthorityIntent(record.intent, { userId: authenticated.user.id, sessionRevision: authenticated.sessionRevision });
    if (typeof record.operationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(record.operationId)) {
      return NextResponse.json({ error: "A valid save operation is required." }, { status: 400 });
    }
    authority = { ...intent, operationId: record.operationId };
  }
  const lesson = await updateLessonProgress({
    userId: authenticated.user.id,
    expectedSessionRevision: authenticated.sessionRevision,
    expectedAccountGeneration: authenticated.accountGeneration,
    authority,
    slug: record.slug,
    action,
    durationSeconds,
    checklistState: readChecklistState(record.checklistState),
    curriculumTrack: authenticated.user.curriculumProfile
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  return NextResponse.json({ lesson });
  } catch (error) {
    if (error instanceof LearnerAuthorityError) return NextResponse.json({ code: error.code, error: "This save could not be confirmed. Reload the lesson before retrying." }, { status: error.status });
    throw error;
  }
}
