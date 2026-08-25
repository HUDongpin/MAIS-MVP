import { NextResponse } from "next/server";
import { isValidLearningAnalyticsEventLog, maxStoredLearningAnalyticsEvents } from "@/lib/learningAnalytics";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { learningEventLrsDeliveryUpdates } from "@/lib/server/learningEventLrsDelivery";
import { emitLearningEventsToLrs } from "@/lib/server/lrsClient";
import {
  appendLearningEventsFast,
  clearLearningEventsFast,
  learningEventFastPathPersistsRows,
  recordLearningEventLrsDeliveryFast
} from "@/lib/server/practiceAttemptStore";
import {
  appendLearningEvents,
  clearLearningEventsForUser,
  ensureFastLearningStreakReward,
  invalidateStudentDashboardCacheForUser,
  recordLearningEventLrsDelivery
} from "@/lib/server/userStore";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ accepted: 0, ignored: true }, { status: 202 });
  }

  if (authenticated.user.role !== "student") {
    return NextResponse.json({ accepted: 0, ignored: true }, { status: 202 });
  }

  const encodedOwnerUserId = request.headers.get("x-mais-analytics-user-id");
  if (!encodedOwnerUserId) {
    return NextResponse.json({
      accepted: 0,
      acknowledgedEventIds: [],
      durablyPersisted: false,
      ignored: true,
      reason: "missing-owner"
    }, { status: 409 });
  }
  let ownerUserId = "";
  try {
    ownerUserId = decodeURIComponent(encodedOwnerUserId);
  } catch {
    return NextResponse.json({
      accepted: 0,
      acknowledgedEventIds: [],
      durablyPersisted: false,
      ignored: true,
      reason: "invalid-owner"
    }, { status: 409 });
  }
  if (ownerUserId !== authenticated.user.id) {
    return NextResponse.json({
      accepted: 0,
      acknowledgedEventIds: [],
      durablyPersisted: false,
      ignored: true,
      reason: "identity-mismatch"
    }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const bodyRecord = body as { events?: unknown; generation?: unknown } | null;
  const events = bodyRecord?.events;
  if (
    Array.isArray(events) &&
    events.some((event) => {
      const id = (event as { id?: unknown } | null)?.id;
      return typeof id === "string" && id.trim().length === 0;
    })
  ) {
    return NextResponse.json({
      error: "Learning analytics event ids must be non-empty.",
      reason: "invalid-event-id"
    }, { status: 400 });
  }
  if (Array.isArray(events) && events.some((event) => {
    const durationSeconds = (event as { durationSeconds?: unknown } | null)?.durationSeconds;
    return typeof durationSeconds === "number" && !Number.isSafeInteger(durationSeconds);
  })) {
    return NextResponse.json({
      error: "Learning analytics durations must use whole seconds.",
      reason: "invalid-event-duration"
    }, { status: 400 });
  }
  if (Array.isArray(events) && events.some((event) => {
    const timestamp = (event as { timestamp?: unknown } | null)?.timestamp;
    if (typeof timestamp !== "string") return false;
    const parsed = new Date(timestamp);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString() !== timestamp;
  })) {
    return NextResponse.json({
      error: "Learning analytics timestamps must use canonical ISO format.",
      reason: "invalid-event-timestamp"
    }, { status: 400 });
  }
  if (!isValidLearningAnalyticsEventLog(events)) {
    return NextResponse.json({ error: "Expected a valid learning analytics event batch." }, { status: 400 });
  }
  const generation = bodyRecord?.generation;
  if (typeof generation !== "number" || !Number.isSafeInteger(generation) || generation < 0) {
    return NextResponse.json({
      error: "A non-negative safe integer generation is required.",
      reason: "invalid-generation"
    }, { status: 400 });
  }

  const seenEventIds = new Set<string>();
  const eventBatch = events.filter((event) => {
    if (seenEventIds.has(event.id)) return false;
    seenEventIds.add(event.id);
    return true;
  });
  const maxBatchSize = Math.min(maxStoredLearningAnalyticsEvents, 200);
  if (eventBatch.length > maxBatchSize) {
    return NextResponse.json({
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: authenticated.user.id,
      dispositions: eventBatch.map((event) => ({
        id: event.id,
        disposition: "not-processed" as const
      })),
      durablyPersisted: false,
      maxBatchSize,
      reason: "batch-too-large"
    }, { status: 413 });
  }
  const usesFastRows = learningEventFastPathPersistsRows();
  const persistenceResult = usesFastRows
    ? await appendLearningEventsFast(authenticated.user.id, eventBatch, generation)
    : await appendLearningEvents(authenticated.user.id, eventBatch, generation);
  if (!persistenceResult || typeof persistenceResult === "number") {
    return NextResponse.json({
      accepted: 0,
      acknowledgedEventIds: [],
      durablyPersisted: false,
      reason: "persistence-unavailable"
    }, { status: 503 });
  }
  if (persistenceResult.status !== "ok") {
    return NextResponse.json({
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: authenticated.user.id,
      ...(persistenceResult.status === "generation-mismatch"
        ? {
          clearedAt: persistenceResult.generation < generation
            ? null
            : persistenceResult.clearedAt
        }
        : {}),
      currentGeneration: persistenceResult.generation,
      dispositions: persistenceResult.dispositions,
      durablyPersisted: false,
      reason: persistenceResult.status
    }, { status: 409 });
  }

  const insertedIds = new Set(
    persistenceResult.dispositions
      .filter((entry) => entry.disposition === "inserted")
      .map((entry) => entry.id)
  );
  const insertedEvents = eventBatch.filter((event) => insertedIds.has(event.id));
  const learningStreakRewardAt = usesFastRows &&
    "learningStreakRewardAt" in persistenceResult &&
    typeof persistenceResult.learningStreakRewardAt === "string"
      ? persistenceResult.learningStreakRewardAt
      : null;
  if (usesFastRows && insertedIds.size > 0) {
    // The row commit is already durable. Invalidate before any subsequent
    // side effect can return a retryable 503, otherwise an exact replay has
    // no newly inserted ids with which to repair the stale cache.
    invalidateStudentDashboardCacheForUser(authenticated.user.id);
  }
  if (learningStreakRewardAt) {
    let streakRewardPersisted = false;
    try {
      streakRewardPersisted = await ensureFastLearningStreakReward(
        authenticated.user.id,
        learningStreakRewardAt
      );
    } catch {
      streakRewardPersisted = false;
    }
    if (!streakRewardPersisted) {
      return NextResponse.json({
        accepted: 0,
        acknowledgedEventIds: [],
        acknowledgedUserId: authenticated.user.id,
        durablyPersisted: false,
        locallyPersisted: true,
        reason: "learning-streak-reward-persistence-unavailable"
      }, { status: 503 });
    }
  }
  if (eventBatch.length > 0) {
    let lrsResult: Awaited<ReturnType<typeof emitLearningEventsToLrs>>;
    try {
      lrsResult = await emitLearningEventsToLrs({
        userId: authenticated.user.id,
        curriculumTrack: authenticated.user.curriculumTrack,
        events: eventBatch
      });
    } catch {
      // The event rows already contain a durable pending job. Do not ACK the
      // browser batch until a later exact replay can attempt delivery again.
      return NextResponse.json({
        accepted: 0,
        acknowledgedEventIds: [],
        acknowledgedUserId: authenticated.user.id,
        durablyPersisted: false,
        locallyPersisted: true,
        reason: "lrs-delivery-unavailable"
      }, { status: 503 });
    }
    const deliveryUpdates = learningEventLrsDeliveryUpdates(eventBatch, lrsResult);
    const deliveryPersisted = usesFastRows
      ? await recordLearningEventLrsDeliveryFast(authenticated.user.id, deliveryUpdates)
      : await recordLearningEventLrsDelivery(authenticated.user.id, deliveryUpdates);
    if (deliveryPersisted !== true) {
      return NextResponse.json({
        accepted: 0,
        acknowledgedEventIds: [],
        acknowledgedUserId: authenticated.user.id,
        durablyPersisted: false,
        locallyPersisted: true,
        reason: "lrs-delivery-persistence-unavailable"
      }, { status: 503 });
    }
    if (lrsResult.status === "queued") {
      // The durable server row records the exact retry state, but there is no
      // autonomous LRS outbox worker. Keep the browser's exact-user outbox as
      // the retry trigger and ACK only after an exact replay reaches the LRS.
      return NextResponse.json({
        accepted: 0,
        acknowledgedEventIds: [],
        acknowledgedUserId: authenticated.user.id,
        durablyPersisted: false,
        locallyPersisted: true,
        reason: "lrs-delivery-queued"
      }, { status: 503 });
    }
  }

  return NextResponse.json({ accepted: insertedEvents.length,
    acknowledgedEventIds: persistenceResult.acknowledgedEventIds,
    acknowledgedUserId: authenticated.user.id,
    dispositions: persistenceResult.dispositions,
    durablyPersisted: true,
    generation: persistenceResult.generation
  });
}

export async function DELETE(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (authenticated.user.role !== "student") {
    return NextResponse.json({
      error: "Student access required.",
      reason: "student-only"
    }, { status: 403 });
  }

  const encodedOwnerUserId = request.headers.get("x-mais-analytics-user-id");
  if (!encodedOwnerUserId) {
    return NextResponse.json({
      acknowledgedEventIds: [],
      durablyPersisted: false,
      ignored: true,
      reason: "missing-owner"
    }, { status: 409 });
  }
  let ownerUserId = "";
  try {
    ownerUserId = decodeURIComponent(encodedOwnerUserId);
  } catch {
    return NextResponse.json({
      acknowledgedEventIds: [],
      durablyPersisted: false,
      ignored: true,
      reason: "invalid-owner"
    }, { status: 409 });
  }
  if (ownerUserId !== authenticated.user.id) {
    return NextResponse.json({
      acknowledgedEventIds: [],
      durablyPersisted: false,
      ignored: true,
      reason: "identity-mismatch"
    }, { status: 409 });
  }

  const usesFastRows = learningEventFastPathPersistsRows();
  const clearResult = usesFastRows
    ? await clearLearningEventsFast(authenticated.user.id)
    : await clearLearningEventsForUser(authenticated.user.id);
  if (!clearResult || typeof clearResult === "boolean") {
    return NextResponse.json({
      acknowledgedUserId: authenticated.user.id,
      durablyPersisted: false,
      reason: "persistence-unavailable"
    }, { status: 503 });
  }
  if (usesFastRows) {
    // The row store is authoritative for the returned generation. Clear the
    // legacy snapshot mirror as well so old pre-fast-path rows cannot reappear
    // in summary/export fallbacks. A mirror failure must not hide the already
    // committed authoritative ACK or cause a retry to advance it again.
    try {
      await clearLearningEventsForUser(
        authenticated.user.id,
        clearResult.clearedAt,
        clearResult.generation
      );
    } catch {
      console.warn("Legacy learning-event clear mirror failed after the authoritative row-store clear.");
    }
    invalidateStudentDashboardCacheForUser(authenticated.user.id);
  }
  return NextResponse.json({
    acknowledgedUserId: authenticated.user.id,
    clearedAt: clearResult.clearedAt,
    durablyPersisted: true,
    generation: clearResult.generation,
    ok: true
  });
}
