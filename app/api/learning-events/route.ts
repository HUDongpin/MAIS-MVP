import { NextResponse } from "next/server";
import { isValidLearningAnalyticsEventLog, maxStoredLearningAnalyticsEvents } from "@/lib/learningAnalytics";
import {
  bodyExpectedUserConstraints,
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser,
  requireAuthenticatedUser
} from "@/lib/server/auth";
import { emitLearningEventsToLrs } from "@/lib/server/lrsClient";
import { appendLearningEventsFast, clearLearningEventsFast, learningEventFastPathPersistsRows } from "@/lib/server/practiceAttemptStore";
import { appendLearningEvents, clearLearningEventsForUser } from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ accepted: 0, ignored: true }, { status: 202 });
  }

  const transportExpectedUserConflict = guardExpectedAuthenticatedUser(
    authenticated,
    expectedUserConstraintsFromRequest(request)
  );
  if (transportExpectedUserConflict) return transportExpectedUserConflict;

  if (authenticated.user.role !== "student") {
    const expectedUserConflict = guardExpectedAuthenticatedUser(
      authenticated,
      expectedUserConstraintsFromRequest(request),
      { requireConstraint: true }
    );
    if (expectedUserConflict) return expectedUserConflict;
    return NextResponse.json({ accepted: 0, ignored: true }, { status: 202 });
  }

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
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
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

  const events = (body as { events?: unknown } | null)?.events;
  if (!isValidLearningAnalyticsEventLog(events)) {
    return NextResponse.json({ error: "Expected a valid learning analytics event batch." }, { status: 400 });
  }

  const eventBatch = events.slice(-Math.min(maxStoredLearningAnalyticsEvents, 200));
  const accepted = learningEventFastPathPersistsRows()
    ? await appendLearningEventsFast(authenticated.user.id, eventBatch) ?? 0
    : await appendLearningEvents(authenticated.user.id, eventBatch);
  scheduleLearningEventsLrsDelivery({
    userId: authenticated.user.id,
    curriculumTrack: authenticated.user.curriculumTrack,
    events: eventBatch
  });

  return NextResponse.json({ accepted });
}

function scheduleLearningEventsLrsDelivery(input: Parameters<typeof emitLearningEventsToLrs>[0]) {
  void emitLearningEventsToLrs(input).catch(() => {
    // Optional LRS delivery must not delay or fail the local learning-event write.
  });
}

export async function DELETE(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const expectedUserConflict = guardExpectedAuthenticatedUser(
    authenticated,
    expectedUserConstraintsFromRequest(request),
    { requireConstraint: true }
  );
  if (expectedUserConflict) return expectedUserConflict;
  if (authenticated.user.role !== "student") {
    return NextResponse.json({
      error: "Student access required.",
      reason: "student-only"
    }, { status: 403 });
  }

  if (learningEventFastPathPersistsRows()) {
    await clearLearningEventsFast(authenticated.user.id);
  }
  await clearLearningEventsForUser(authenticated.user.id);
  return NextResponse.json({ ok: true });
}
