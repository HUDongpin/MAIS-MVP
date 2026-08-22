import { legacyLearningEventClearRequestId } from "@/lib/server/learningEventClearIdentity";
import type { LearningAnalyticsEvent } from "@/types";

export type FastLearningEventPersistenceDisposition = {
  id: string;
  disposition:
    | "inserted"
    | "already-persisted"
    | "id-conflict"
    | "stale-generation"
    | "not-processed";
};

export type LearningEventGenerationState = {
  generation: number;
  clearedAt: string | null;
  requestId: string | null;
};

export type FastLearningEventAppendResult = LearningEventGenerationState & {
  status: "ok" | "generation-mismatch" | "id-conflict";
  acknowledgedEventIds: string[];
  dispositions: FastLearningEventPersistenceDisposition[];
};

export type FastLearningEventClearResult = LearningEventGenerationState & {
  status: "ok" | "generation-mismatch";
};

export type StoredFastLearningEventRow = {
  id: string;
  user_id: string;
  type: LearningAnalyticsEvent["type"];
  source: LearningAnalyticsEvent["source"];
  grade: LearningAnalyticsEvent["grade"];
  topic_id: string;
  question_id: string | null;
  class_id: string | null;
  assignment_id: string | null;
  competency_id: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export type FastLearningEventTransactionAdapter = {
  readGeneration(userId: string): Promise<LearningEventGenerationState>;
  writeLegacyRequestId(input: {
    userId: string;
    generation: number;
    requestId: string;
  }): Promise<void>;
  deleteUserEvents(userId: string): Promise<void>;
  replaceGeneration(input: {
    userId: string;
    state: LearningEventGenerationState;
  }): Promise<LearningEventGenerationState>;
  readEvents(ids: readonly string[]): Promise<StoredFastLearningEventRow[]>;
  insertEvents(rows: readonly StoredFastLearningEventRow[]): Promise<string[]>;
  replaceEvents(rows: readonly StoredFastLearningEventRow[]): Promise<void>;
};

function canonicalLearningEventClearedAt(value: unknown) {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

export function requireCanonicalLearningEventClearedAt(value: unknown) {
  const canonical = canonicalLearningEventClearedAt(value);
  if (!canonical) {
    throw new TypeError("Learning-event clearedAt must be a canonical ISO timestamp.");
  }
  return canonical;
}

function canonicalLearningEventClearRequestId(value: unknown) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 240 &&
    value === value.trim()
    ? value
    : null;
}

export function requireCanonicalLearningEventClearRequestId(value: unknown) {
  const canonical = canonicalLearningEventClearRequestId(value);
  if (!canonical) {
    throw new TypeError("Learning-event clear requestId must be a canonical protocol identifier.");
  }
  return canonical;
}

function requireLearningEventGenerationState(
  value: LearningEventGenerationState
): LearningEventGenerationState {
  if (!Number.isSafeInteger(value.generation) || value.generation < 0) {
    throw new TypeError("Learning-event generation must be a non-negative safe integer.");
  }
  if (value.generation === 0) {
    if (value.clearedAt !== null || value.requestId !== null) {
      throw new TypeError("Generation zero cannot carry a learning-event clear receipt.");
    }
    return value;
  }
  if (canonicalLearningEventClearedAt(value.clearedAt) !== value.clearedAt) {
    throw new TypeError("A cleared learning-event generation requires a canonical timestamp.");
  }
  if (
    value.requestId !== null &&
    canonicalLearningEventClearRequestId(value.requestId) !== value.requestId
  ) {
    throw new TypeError("Learning-event clear requestId must be canonical when present.");
  }
  return value;
}

function normalizedDurationSeconds(event: LearningAnalyticsEvent) {
  return typeof event.durationSeconds === "number" &&
    Number.isFinite(event.durationSeconds) &&
    event.durationSeconds > 0
    ? Math.round(event.durationSeconds)
    : null;
}

export function storedFastLearningEventRowMatches(
  row: StoredFastLearningEventRow,
  userId: string,
  event: LearningAnalyticsEvent
) {
  return (
    row.user_id === userId &&
    row.type === event.type &&
    row.source === event.source &&
    row.grade === event.grade &&
    row.topic_id === event.topicId &&
    row.question_id === (event.questionId ?? null) &&
    row.class_id === (event.classId ?? null) &&
    row.assignment_id === (event.assignmentId ?? null) &&
    row.competency_id === (event.competencyId ?? null) &&
    row.duration_seconds === normalizedDurationSeconds(event) &&
    new Date(row.created_at).toISOString() === event.timestamp
  );
}

function firstWriteWinsLearningEvents(events: readonly LearningAnalyticsEvent[]) {
  const seenIds = new Set<string>();
  return events.filter((event) => {
    if (seenIds.has(event.id)) return false;
    seenIds.add(event.id);
    return true;
  });
}

function conflictResult(
  generationState: LearningEventGenerationState,
  events: readonly LearningAnalyticsEvent[],
  conflictingIds: ReadonlySet<string>
): FastLearningEventAppendResult {
  return {
    status: "id-conflict",
    ...generationState,
    acknowledgedEventIds: [],
    dispositions: events.map((event) => ({
      id: event.id,
      disposition: conflictingIds.has(event.id) ? "id-conflict" : "not-processed"
    }))
  };
}

/**
 * Raised only after an INSERT race is discovered. The production caller must
 * let this escape its database transaction so every row from the batch rolls
 * back; the public fast-path wrapper converts it to the durable conflict
 * receipt after rollback.
 */
export class FastLearningEventAtomicConflictError extends Error {
  constructor(readonly result: FastLearningEventAppendResult) {
    super("Learning event id conflicts with another owner or payload.");
    this.name = "FastLearningEventAtomicConflictError";
  }
}

export async function alignFastLearningEventGenerationWithSnapshot(
  transaction: FastLearningEventTransactionAdapter,
  userId: string,
  snapshotState?: LearningEventGenerationState
) {
  let current = requireLearningEventGenerationState(
    await transaction.readGeneration(userId)
  );
  if (current.generation > 0 && current.requestId === null) {
    const clearedAt = requireCanonicalLearningEventClearedAt(current.clearedAt);
    const requestId = legacyLearningEventClearRequestId({
      userId,
      generation: current.generation,
      clearedAt
    });
    await transaction.writeLegacyRequestId({
      userId,
      generation: current.generation,
      requestId
    });
    current = requireLearningEventGenerationState(
      await transaction.readGeneration(userId)
    );
    if (current.generation > 0 && current.requestId === null) {
      throw new Error("Historical learning-event clear requestId migration did not persist.");
    }
  }
  if (!snapshotState) return current;

  const snapshot = requireLearningEventGenerationState(snapshotState);
  if (snapshot.generation > 0 && snapshot.requestId === null) {
    throw new Error("Snapshot learning-event generation requires a migrated requestId.");
  }
  if (current.generation > snapshot.generation) return current;
  if (current.generation === snapshot.generation) {
    if (
      current.clearedAt !== snapshot.clearedAt ||
      current.requestId !== snapshot.requestId
    ) {
      throw new Error("Learning-event row and snapshot clear receipts diverged.");
    }
    return current;
  }

  await transaction.deleteUserEvents(userId);
  const persisted = requireLearningEventGenerationState(
    await transaction.replaceGeneration({ userId, state: snapshot })
  );
  if (
    persisted.generation !== snapshot.generation ||
    persisted.clearedAt !== snapshot.clearedAt ||
    persisted.requestId !== snapshot.requestId
  ) {
    throw new Error("Learning-event generation bootstrap did not persist exactly.");
  }
  return persisted;
}

export async function appendLearningEventsInFastTransaction({
  transaction,
  userId,
  events,
  generation,
  snapshotGenerationState
}: {
  transaction: FastLearningEventTransactionAdapter;
  userId: string;
  events: readonly LearningAnalyticsEvent[];
  generation: number;
  snapshotGenerationState?: LearningEventGenerationState;
}): Promise<FastLearningEventAppendResult> {
  const uniqueEvents = firstWriteWinsLearningEvents(events);
  const generationState = await alignFastLearningEventGenerationWithSnapshot(
    transaction,
    userId,
    snapshotGenerationState
  );
  if (generation !== generationState.generation) {
    return {
      status: "generation-mismatch",
      ...generationState,
      acknowledgedEventIds: [],
      dispositions: uniqueEvents.map((event) => ({
        id: event.id,
        disposition: "stale-generation"
      }))
    };
  }

  const eventIds = uniqueEvents.map((event) => event.id);
  const existingRows = eventIds.length
    ? await transaction.readEvents(eventIds)
    : [];
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const conflictingIds = new Set(
    uniqueEvents
      .filter((event) => {
        const existing = existingById.get(event.id);
        return Boolean(existing && !storedFastLearningEventRowMatches(existing, userId, event));
      })
      .map((event) => event.id)
  );
  if (conflictingIds.size > 0) {
    return conflictResult(generationState, uniqueEvents, conflictingIds);
  }

  const newEvents = uniqueEvents.filter((event) => !existingById.has(event.id));
  const rows = newEvents.map((event) => ({
    id: event.id,
    user_id: userId,
    type: event.type,
    source: event.source,
    grade: event.grade,
    topic_id: event.topicId,
    question_id: event.questionId ?? null,
    class_id: event.classId ?? null,
    assignment_id: event.assignmentId ?? null,
    competency_id: event.competencyId ?? null,
    duration_seconds: normalizedDurationSeconds(event),
    created_at: event.timestamp
  } satisfies StoredFastLearningEventRow));
  const insertedIds = new Set(await transaction.insertEvents(rows));

  // IDs are globally unique. A different-user transaction can win the same
  // ID while this transaction holds its per-user advisory lock. Re-read and
  // force rollback if the resulting physical row is not our exact revision.
  const resolvedRows = eventIds.length
    ? await transaction.readEvents(eventIds)
    : [];
  const resolvedById = new Map(resolvedRows.map((row) => [row.id, row]));
  const racedConflictIds = new Set(
    uniqueEvents
      .filter((event) => {
        const resolved = resolvedById.get(event.id);
        return !resolved || !storedFastLearningEventRowMatches(resolved, userId, event);
      })
      .map((event) => event.id)
  );
  if (racedConflictIds.size > 0) {
    throw new FastLearningEventAtomicConflictError(
      conflictResult(generationState, uniqueEvents, racedConflictIds)
    );
  }

  return {
    status: "ok",
    ...generationState,
    acknowledgedEventIds: eventIds,
    dispositions: uniqueEvents.map((event) => ({
      id: event.id,
      disposition: insertedIds.has(event.id) ? "inserted" : "already-persisted"
    }))
  };
}

export async function clearLearningEventsInFastTransaction({
  transaction,
  userId,
  clearedAt,
  baseGeneration,
  requestId,
  snapshotGenerationState
}: {
  transaction: FastLearningEventTransactionAdapter;
  userId: string;
  clearedAt: string;
  baseGeneration: number;
  requestId: string;
  snapshotGenerationState?: LearningEventGenerationState;
}): Promise<FastLearningEventClearResult> {
  const canonicalClearedAt = requireCanonicalLearningEventClearedAt(clearedAt);
  const canonicalRequestId = requireCanonicalLearningEventClearRequestId(requestId);
  if (!Number.isSafeInteger(baseGeneration) || baseGeneration < 0) {
    throw new TypeError("Learning-event clear base generation must be a non-negative safe integer.");
  }

  const generationState = await alignFastLearningEventGenerationWithSnapshot(
    transaction,
    userId,
    snapshotGenerationState
  );
  if (generationState.generation !== baseGeneration) {
    return {
      ...generationState,
      status:
        generationState.generation > baseGeneration &&
        generationState.requestId === canonicalRequestId
          ? "ok"
          : "generation-mismatch"
    };
  }

  await transaction.deleteUserEvents(userId);
  const expected = {
    generation: generationState.generation + 1,
    clearedAt: canonicalClearedAt,
    requestId: canonicalRequestId
  };
  const persisted = requireLearningEventGenerationState(
    await transaction.replaceGeneration({ userId, state: expected })
  );
  if (
    persisted.generation !== expected.generation ||
    persisted.clearedAt !== expected.clearedAt ||
    persisted.requestId !== expected.requestId
  ) {
    throw new Error("Learning-event clear receipt did not persist exactly.");
  }
  return { status: "ok", ...persisted };
}
