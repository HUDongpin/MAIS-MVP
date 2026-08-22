import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  isCanonicalLearningAnalyticsClearRequestId,
  isValidLearningAnalyticsEventLog,
  maxStoredLearningAnalyticsEvents
} from "@/lib/learningAnalytics";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { emitLearningEventsToLrs } from "@/lib/server/lrsClient";
import { learningEventFastPathPersistsRows } from "@/lib/server/practiceAttemptStore";
import {
  appendLearningEvents,
  appendLearningEventsAtomically,
  clearLearningEventsAtomically,
  clearLearningEventsForUser,
  ensureLearningEventGenerationRequestId
} from "@/lib/server/userStore";
import type { FastLearningEventPersistenceDisposition } from "@/lib/server/learningEventFastPersistence";
import type { LearningAnalyticsEvent } from "@/types";
import { parseExactLearningEventsRequestBody } from "./requestBody";

export const runtime = "nodejs";

function learningEventCanonicalPayloadDigest(event: LearningAnalyticsEvent) {
  // Only fields that cross the durable learning-event boundary participate in
  // revision identity. A fixed-position tuple makes optional fields canonical
  // and independent of caller JSON property order.
  const canonicalPayload = [
    event.id,
    event.type,
    event.source,
    event.timestamp,
    event.grade,
    event.topicId,
    event.questionId ?? null,
    event.classId ?? null,
    event.assignmentId ?? null,
    event.competencyId ?? null,
    event.durationSeconds ?? null
  ];
  return createHash("sha256")
    .update(JSON.stringify(canonicalPayload))
    .digest("hex");
}

function normalizeLearningAnalyticsEventBatch(events: LearningAnalyticsEvent[]) {
  const firstPhysicalRevisionById = new Map<string, {
    digest: string;
    event: LearningAnalyticsEvent;
  }>();
  const conflictingIds = new Set<string>();

  for (const event of events) {
    const digest = learningEventCanonicalPayloadDigest(event);
    const firstRevision = firstPhysicalRevisionById.get(event.id);
    if (!firstRevision) {
      firstPhysicalRevisionById.set(event.id, { digest, event });
      continue;
    }
    if (firstRevision.digest !== digest) conflictingIds.add(event.id);
  }

  return {
    events: [...firstPhysicalRevisionById.values()].map(({ event }) => event),
    conflictingIds
  };
}

function parseCanonicalGenerationHeader(value: string | null) {
  if (value === null || !/^(0|[1-9]\d*)$/.test(value)) return null;
  const generation = Number(value);
  return Number.isSafeInteger(generation) && generation >= 0 && String(generation) === value
    ? generation
    : null;
}

function generationMismatchResponse({
  userId,
  requestedGeneration,
  currentGeneration,
  clearedAt,
  currentClearRequestId,
  dispositions
}: {
  userId: string;
  requestedGeneration: number;
  currentGeneration: number;
  clearedAt: string | null;
  currentClearRequestId: string | null;
  dispositions?: FastLearningEventPersistenceDisposition[];
}) {
  return NextResponse.json({
    ...(dispositions
      ? { accepted: 0, acknowledgedEventIds: [], dispositions }
      : {}),
    acknowledgedUserId: userId,
    clearedAt: currentGeneration < requestedGeneration ? null : clearedAt,
    currentClearRequestId:
      currentGeneration < requestedGeneration ? null : currentClearRequestId,
    currentGeneration,
    durablyPersisted: false,
    reason: "generation-mismatch"
  }, { status: 409 });
}

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
  if (
    encodedOwnerUserId !== encodeURIComponent(ownerUserId) ||
    ownerUserId !== authenticated.user.id
  ) {
    return NextResponse.json({
      accepted: 0,
      acknowledgedEventIds: [],
      durablyPersisted: false,
      ignored: true,
      reason: "identity-mismatch"
    }, { status: 409 });
  }

  const parsedBody = await parseExactLearningEventsRequestBody(request);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  }

  const events = parsedBody.value.events;
  if (!isValidLearningAnalyticsEventLog(events)) {
    return NextResponse.json({ error: "Expected a valid learning analytics event batch." }, { status: 400 });
  }
  const generation = parsedBody.value.generation;
  if (typeof generation !== "number" || !Number.isSafeInteger(generation) || generation < 0) {
    return NextResponse.json({
      error: "A non-negative safe integer generation is required.",
      reason: "invalid-generation"
    }, { status: 400 });
  }

  const normalizedBatch = normalizeLearningAnalyticsEventBatch(events);
  const eventBatch = normalizedBatch.events;
  if (normalizedBatch.conflictingIds.size > 0) {
    return NextResponse.json({
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: authenticated.user.id,
      dispositions: eventBatch.map((event) => ({
        id: event.id,
        disposition: normalizedBatch.conflictingIds.has(event.id)
          ? "id-conflict" as const
          : "not-processed" as const
      })),
      durablyPersisted: false,
      reason: "id-conflict"
    }, { status: 409 });
  }
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
  let persistenceResult;
  try {
    if (usesFastRows) {
      persistenceResult = await appendLearningEventsAtomically(
        authenticated.user.id,
        eventBatch,
        generation
      );
    } else {
      await ensureLearningEventGenerationRequestId(authenticated.user.id);
      persistenceResult = await appendLearningEvents(
        authenticated.user.id,
        eventBatch,
        generation
      );
    }
  } catch {
    return NextResponse.json({
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: authenticated.user.id,
      durablyPersisted: false,
      reason: "persistence-unavailable"
    }, { status: 503 });
  }
  if (!persistenceResult || typeof persistenceResult === "number") {
    return NextResponse.json({
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: authenticated.user.id,
      durablyPersisted: false,
      reason: "persistence-unavailable"
    }, { status: 503 });
  }
  if (persistenceResult.status !== "ok") {
    if (persistenceResult.status === "generation-mismatch") {
      return generationMismatchResponse({
        userId: authenticated.user.id,
        requestedGeneration: generation,
        currentGeneration: persistenceResult.generation,
        clearedAt: persistenceResult.clearedAt,
        currentClearRequestId: persistenceResult.requestId,
        dispositions: persistenceResult.dispositions
      });
    }
    return NextResponse.json({
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: authenticated.user.id,
      currentGeneration: persistenceResult.generation,
      dispositions: persistenceResult.dispositions,
      durablyPersisted: false,
      reason: persistenceResult.status
    }, { status: 409 });
  }

  scheduleLearningEventsLrsDelivery({
    userId: authenticated.user.id,
    curriculumTrack: authenticated.user.curriculumTrack,
    events: eventBatch
  });

  return NextResponse.json({
    accepted: persistenceResult.dispositions.filter(
      (entry) => entry.disposition === "inserted"
    ).length,
    acknowledgedEventIds: persistenceResult.acknowledgedEventIds,
    acknowledgedUserId: authenticated.user.id,
    dispositions: persistenceResult.dispositions,
    durablyPersisted: true,
    generation: persistenceResult.generation
  });
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
  if (
    encodedOwnerUserId !== encodeURIComponent(ownerUserId) ||
    ownerUserId !== authenticated.user.id
  ) {
    return NextResponse.json({
      acknowledgedEventIds: [],
      durablyPersisted: false,
      ignored: true,
      reason: "identity-mismatch"
    }, { status: 409 });
  }

  const baseGeneration = parseCanonicalGenerationHeader(
    request.headers.get("x-mais-analytics-generation")
  );
  if (baseGeneration === null) {
    return NextResponse.json({
      acknowledgedUserId: authenticated.user.id,
      durablyPersisted: false,
      reason: "invalid-generation"
    }, { status: 400 });
  }
  const clearRequestId = request.headers.get("x-mais-analytics-clear-request-id");
  if (!isCanonicalLearningAnalyticsClearRequestId(clearRequestId)) {
    return NextResponse.json({
      acknowledgedUserId: authenticated.user.id,
      durablyPersisted: false,
      reason: "invalid-clear-request-id"
    }, { status: 400 });
  }

  const usesFastRows = learningEventFastPathPersistsRows();
  const requestedClearedAt = new Date().toISOString();
  let clearResult;
  try {
    if (usesFastRows) {
      clearResult = await clearLearningEventsAtomically(
        authenticated.user.id,
        requestedClearedAt,
        baseGeneration,
        clearRequestId
      );
    } else {
      await ensureLearningEventGenerationRequestId(authenticated.user.id);
      clearResult = await clearLearningEventsForUser(
          authenticated.user.id,
          requestedClearedAt,
          undefined,
          baseGeneration,
          clearRequestId
      );
    }
  } catch {
    return NextResponse.json({
      acknowledgedUserId: authenticated.user.id,
      durablyPersisted: false,
      reason: "persistence-unavailable"
    }, { status: 503 });
  }
  if (!clearResult || typeof clearResult === "boolean") {
    return NextResponse.json({
      acknowledgedUserId: authenticated.user.id,
      durablyPersisted: false,
      reason: "persistence-unavailable"
    }, { status: 503 });
  }
  if (clearResult.status === "generation-mismatch") {
    return generationMismatchResponse({
      userId: authenticated.user.id,
      requestedGeneration: baseGeneration,
      currentGeneration: clearResult.generation,
      clearedAt: clearResult.clearedAt,
      currentClearRequestId: clearResult.requestId
    });
  }
  return NextResponse.json({
    acknowledgedUserId: authenticated.user.id,
    clearedAt: clearResult.clearedAt,
    durablyPersisted: true,
    generation: clearResult.generation,
    ok: true,
    requestId: clearResult.requestId
  });
}
