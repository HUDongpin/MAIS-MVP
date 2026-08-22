import {
  alignFastLearningEventGenerationWithSnapshot,
  appendLearningEventsInFastTransaction,
  clearLearningEventsInFastTransaction,
  type FastLearningEventAppendResult,
  type FastLearningEventClearResult,
  type FastLearningEventTransactionAdapter,
  type LearningEventGenerationState,
  type StoredFastLearningEventRow
} from "@/lib/server/learningEventFastPersistence";
import { isValidLearningAnalyticsEventLog } from "@/lib/learningAnalytics";
import type { LearningAnalyticsEvent } from "@/types";

export type SnapshotLearningEventAppendResult = FastLearningEventAppendResult;
export type SnapshotLearningEventClearResult = FastLearningEventClearResult;

export type AtomicLearningEventSnapshotAdapter = {
  ensureGenerationRequestId(): Promise<LearningEventGenerationState>;
  repairGeneration(
    state: LearningEventGenerationState
  ): Promise<SnapshotLearningEventClearResult>;
  reconcileHistoricalRows(
    fast: FastLearningEventTransactionAdapter,
    events: readonly LearningAnalyticsEvent[]
  ): Promise<
    | { status: "ok" }
    | { status: "id-conflict"; conflictingIds: readonly string[] }
  >;
  append(
    events: LearningAnalyticsEvent[],
    generation: number
  ): Promise<SnapshotLearningEventAppendResult>;
};

export type AtomicLearningEventHistoricalReconciliationPlan = {
  status: "ok";
  fastRowsToReplace: StoredFastLearningEventRow[];
  fastRowsToRecoverInSnapshot: StoredFastLearningEventRow[];
};

export type AtomicLearningEventHistoricalReconciliationConflict = {
  status: "id-conflict";
  conflictingIds: string[];
};

export function canonicalLearningAnalyticsEventFromStoredFastRow(
  row: StoredFastLearningEventRow
): LearningAnalyticsEvent {
  const createdAt = new Date(row.created_at);
  if (!Number.isFinite(createdAt.getTime())) {
    throw new TypeError("Historical fast learning-event timestamp is invalid.");
  }
  const event = {
    id: row.id,
    type: row.type,
    source: row.source,
    timestamp: createdAt.toISOString(),
    grade: row.grade,
    topicId: row.topic_id,
    ...(row.question_id ? { questionId: row.question_id } : {}),
    ...(row.class_id ? { classId: row.class_id } : {}),
    ...(row.assignment_id ? { assignmentId: row.assignment_id } : {}),
    ...(row.competency_id ? { competencyId: row.competency_id } : {}),
    ...(row.duration_seconds === null ? {} : { durationSeconds: row.duration_seconds })
  };
  if (!isValidLearningAnalyticsEventLog([event])) {
    throw new TypeError("Historical fast learning-event row is not canonical.");
  }
  return event;
}

export type AtomicLearningEventTransactionSnapshot<TDatabase> = {
  database: TDatabase;
  adapter: AtomicLearningEventSnapshotAdapter;
  changed(): boolean;
  markPhysicalMutation?(): void;
  afterCommit?(): void | Promise<void>;
};

function fastAdapterWithPhysicalMutationTracking(
  fast: FastLearningEventTransactionAdapter,
  markPhysicalMutation: (() => void) | undefined
): FastLearningEventTransactionAdapter {
  if (!markPhysicalMutation) return fast;
  return {
    readGeneration: (userId) => fast.readGeneration(userId),
    async writeLegacyRequestId(input) {
      await fast.writeLegacyRequestId(input);
      markPhysicalMutation();
    },
    async deleteUserEvents(userId) {
      await fast.deleteUserEvents(userId);
      markPhysicalMutation();
    },
    async replaceGeneration(input) {
      const result = await fast.replaceGeneration(input);
      markPhysicalMutation();
      return result;
    },
    readEvents: (ids) => fast.readEvents(ids),
    async insertEvents(rows) {
      const insertedIds = await fast.insertEvents(rows);
      if (insertedIds.length) markPhysicalMutation();
      return insertedIds;
    },
    async replaceEvents(rows) {
      await fast.replaceEvents(rows);
      if (rows.length) markPhysicalMutation();
    }
  };
}

/**
 * Dependency-injected executable boundary for the production PostgreSQL
 * transaction. `begin` must resolve only after COMMIT. Consequently the
 * optional non-transactional cache invalidation runs after commit and never
 * after a callback/write/commit failure.
 */
export async function runAtomicLearningEventDualStoreTransaction<
  TTransaction,
  TDatabase,
  TResult
>({
  userId,
  eventIds,
  begin,
  acquireUserLock,
  acquireEventIdLocks,
  readSnapshotForUpdate,
  createSnapshot,
  createFastAdapter,
  mutate,
  writeSnapshot
}: {
  userId: string;
  eventIds: readonly string[];
  begin(callback: (transaction: TTransaction) => Promise<TResult>): Promise<TResult>;
  acquireUserLock(transaction: TTransaction, userId: string): Promise<void>;
  acquireEventIdLocks(
    transaction: TTransaction,
    eventIds: readonly string[]
  ): Promise<void>;
  readSnapshotForUpdate(transaction: TTransaction): Promise<TDatabase>;
  createSnapshot(database: TDatabase): AtomicLearningEventTransactionSnapshot<TDatabase>;
  createFastAdapter(transaction: TTransaction): FastLearningEventTransactionAdapter;
  mutate(input: {
    fast: FastLearningEventTransactionAdapter;
    snapshot: AtomicLearningEventSnapshotAdapter;
  }): Promise<TResult>;
  writeSnapshot(transaction: TTransaction, database: TDatabase): Promise<void>;
}) {
  let afterCommit: (() => void | Promise<void>) | undefined;
  const result = await begin(async (transaction) => {
    await acquireUserLock(transaction, userId);
    await acquireEventIdLocks(transaction, eventIds);
    const database = await readSnapshotForUpdate(transaction);
    const snapshot = createSnapshot(database);
    const transactionResult = await mutate({
      fast: fastAdapterWithPhysicalMutationTracking(
        createFastAdapter(transaction),
        snapshot.markPhysicalMutation
      ),
      snapshot: snapshot.adapter
    });
    if (snapshot.changed()) await writeSnapshot(transaction, snapshot.database);
    afterCommit = snapshot.afterCommit;
    return transactionResult;
  });
  await afterCommit?.();
  return result;
}

function storedRowsMatch(
  left: StoredFastLearningEventRow,
  right: StoredFastLearningEventRow
) {
  return left.id === right.id &&
    left.user_id === right.user_id &&
    left.type === right.type &&
    left.source === right.source &&
    left.grade === right.grade &&
    left.topic_id === right.topic_id &&
    left.question_id === right.question_id &&
    left.class_id === right.class_id &&
    left.assignment_id === right.assignment_id &&
    left.competency_id === right.competency_id &&
    left.duration_seconds === right.duration_seconds &&
    new Date(left.created_at).toISOString() === new Date(right.created_at).toISOString();
}

/**
 * Plans recovery for historical one-sided rows without mutating either store.
 * Event IDs are global. A row owned by another user is therefore a hard
 * conflict and must never be copied, replaced, or deleted while only the
 * current user's advisory lock is held.
 */
export function planAtomicLearningEventHistoricalReconciliation({
  userId,
  requestedEventIds,
  snapshotRows,
  fastRows
}: {
  userId: string;
  requestedEventIds: readonly string[];
  snapshotRows: readonly StoredFastLearningEventRow[];
  fastRows: readonly StoredFastLearningEventRow[];
}): AtomicLearningEventHistoricalReconciliationPlan |
  AtomicLearningEventHistoricalReconciliationConflict {
  const requestedIds = [...new Set(requestedEventIds)];
  const requestedIdSet = new Set(requestedIds);
  const snapshotRowsById = new Map<string, StoredFastLearningEventRow[]>();
  const fastRowsById = new Map<string, StoredFastLearningEventRow[]>();
  for (const row of snapshotRows) {
    if (!requestedIdSet.has(row.id)) continue;
    const rows = snapshotRowsById.get(row.id) ?? [];
    rows.push(row);
    snapshotRowsById.set(row.id, rows);
  }
  for (const row of fastRows) {
    if (!requestedIdSet.has(row.id)) continue;
    const rows = fastRowsById.get(row.id) ?? [];
    rows.push(row);
    fastRowsById.set(row.id, rows);
  }

  const conflictingIds = requestedIds.filter((id) => {
    const snapshotMatches = snapshotRowsById.get(id) ?? [];
    const fastMatches = fastRowsById.get(id) ?? [];
    return snapshotMatches.length > 1 ||
      fastMatches.length > 1 ||
      snapshotMatches.some((row) => row.user_id !== userId) ||
      fastMatches.some((row) => row.user_id !== userId);
  });
  if (conflictingIds.length) return { status: "id-conflict", conflictingIds };

  const fastRowsToReplace: StoredFastLearningEventRow[] = [];
  const fastRowsToRecoverInSnapshot: StoredFastLearningEventRow[] = [];
  for (const id of requestedIds) {
    const snapshotRow = snapshotRowsById.get(id)?.[0];
    const fastRow = fastRowsById.get(id)?.[0];
    if (snapshotRow) {
      if (!fastRow || !storedRowsMatch(snapshotRow, fastRow)) {
        fastRowsToReplace.push({ ...snapshotRow });
      }
      continue;
    }
    if (fastRow) fastRowsToRecoverInSnapshot.push({ ...fastRow });
  }
  return {
    status: "ok",
    fastRowsToReplace,
    fastRowsToRecoverInSnapshot
  };
}

function exactStringArray(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function reconcileAtomicAppendReceipts(
  snapshot: SnapshotLearningEventAppendResult,
  fast: FastLearningEventAppendResult,
  events: readonly LearningAnalyticsEvent[]
): FastLearningEventAppendResult | null {
  if (snapshot.status !== "ok" || fast.status !== "ok") return null;
  const expectedIds = events.map(({ id }) => id);
  if (
    snapshot.generation !== fast.generation ||
    snapshot.clearedAt !== fast.clearedAt ||
    snapshot.requestId !== fast.requestId ||
    !exactStringArray(snapshot.acknowledgedEventIds, expectedIds) ||
    !exactStringArray(fast.acknowledgedEventIds, expectedIds) ||
    snapshot.dispositions.length !== expectedIds.length ||
    fast.dispositions.length !== expectedIds.length
  ) return null;

  const dispositions: FastLearningEventAppendResult["dispositions"] = [];
  for (let index = 0; index < expectedIds.length; index += 1) {
    const id = expectedIds[index];
    const snapshotDisposition = snapshot.dispositions[index];
    const fastDisposition = fast.dispositions[index];
    if (
      snapshotDisposition?.id !== id ||
      fastDisposition?.id !== id ||
      !["inserted", "already-persisted"].includes(snapshotDisposition.disposition) ||
      !["inserted", "already-persisted"].includes(fastDisposition.disposition)
    ) return null;
    dispositions.push({
      id,
      disposition:
        snapshotDisposition.disposition === "inserted" ||
        fastDisposition.disposition === "inserted"
          ? "inserted"
          : "already-persisted"
    });
  }
  return {
    status: "ok",
    generation: fast.generation,
    clearedAt: fast.clearedAt,
    requestId: fast.requestId,
    acknowledgedEventIds: expectedIds,
    dispositions
  };
}

export class AtomicLearningEventDualPersistenceAbort extends Error {
  constructor(
    readonly result: FastLearningEventAppendResult | FastLearningEventClearResult,
    message = "Atomic learning-event dual persistence could not commit exactly."
  ) {
    super(message);
    this.name = "AtomicLearningEventDualPersistenceAbort";
  }
}

async function alignAtomicGeneration({
  fast,
  snapshot,
  userId
}: {
  fast: FastLearningEventTransactionAdapter;
  snapshot: AtomicLearningEventSnapshotAdapter;
  userId: string;
}) {
  let snapshotState = await snapshot.ensureGenerationRequestId();
  const fastState = await alignFastLearningEventGenerationWithSnapshot(
    fast,
    userId,
    snapshotState
  );
  if (fastState.generation > snapshotState.generation) {
    const repaired = await snapshot.repairGeneration(fastState);
    if (
      repaired.status !== "ok" ||
      repaired.generation !== fastState.generation ||
      repaired.clearedAt !== fastState.clearedAt ||
      repaired.requestId !== fastState.requestId
    ) {
      throw new Error("Snapshot generation could not align to the authoritative fast receipt.");
    }
    snapshotState = fastState;
  }
  return snapshotState;
}

export async function appendLearningEventsInAtomicDualTransaction({
  fast,
  snapshot,
  userId,
  events,
  generation
}: {
  fast: FastLearningEventTransactionAdapter;
  snapshot: AtomicLearningEventSnapshotAdapter;
  userId: string;
  events: LearningAnalyticsEvent[];
  generation: number;
}): Promise<FastLearningEventAppendResult> {
  const generationState = await alignAtomicGeneration({ fast, snapshot, userId });

  // Repair historical one-sided physical revisions before validating this
  // request. This prevents an old snapshot-only ID from accepting a competing
  // fast payload and also makes fast-only lost-ACK state visible to snapshot
  // readers in the same transaction.
  const historicalReconciliation = await snapshot.reconcileHistoricalRows(fast, events);
  if (historicalReconciliation.status === "id-conflict") {
    const conflictingIds = new Set(historicalReconciliation.conflictingIds);
    throw new AtomicLearningEventDualPersistenceAbort({
      status: "id-conflict",
      ...generationState,
      acknowledgedEventIds: [],
      dispositions: events.map(({ id }) => ({
        id,
        disposition: conflictingIds.has(id) ? "id-conflict" : "not-processed"
      }))
    });
  }
  const snapshotReceipt = await snapshot.append(events, generation);
  if (snapshotReceipt.status !== "ok") {
    // A request-level conflict/mismatch must never commit preparatory legacy
    // reconciliation. Exact lost-ACK repair is committed only when the exact
    // request itself validates and both authorities produce an exact ACK.
    throw new AtomicLearningEventDualPersistenceAbort(snapshotReceipt);
  }

  const fastReceipt = await appendLearningEventsInFastTransaction({
    transaction: fast,
    userId,
    events,
    generation,
    snapshotGenerationState: generationState
  });
  if (fastReceipt.status !== "ok") {
    throw new AtomicLearningEventDualPersistenceAbort(fastReceipt);
  }
  const reconciled = reconcileAtomicAppendReceipts(snapshotReceipt, fastReceipt, events);
  if (!reconciled) {
    throw new Error("Atomic learning-event stores produced divergent append receipts.");
  }
  return reconciled;
}

export async function clearLearningEventsInAtomicDualTransaction({
  fast,
  snapshot,
  userId,
  clearedAt,
  baseGeneration,
  requestId
}: {
  fast: FastLearningEventTransactionAdapter;
  snapshot: AtomicLearningEventSnapshotAdapter;
  userId: string;
  clearedAt: string;
  baseGeneration: number;
  requestId: string;
}): Promise<FastLearningEventClearResult> {
  const generationState = await alignAtomicGeneration({ fast, snapshot, userId });
  const fastReceipt = await clearLearningEventsInFastTransaction({
    transaction: fast,
    userId,
    clearedAt,
    baseGeneration,
    requestId,
    snapshotGenerationState: generationState
  });
  if (fastReceipt.status !== "ok") {
    throw new AtomicLearningEventDualPersistenceAbort(fastReceipt);
  }
  const exactFastGenerationState: LearningEventGenerationState = {
    generation: fastReceipt.generation,
    clearedAt: fastReceipt.clearedAt,
    requestId: fastReceipt.requestId
  };
  const snapshotReceipt = await snapshot.repairGeneration(exactFastGenerationState);
  if (
    snapshotReceipt.status !== "ok" ||
    snapshotReceipt.generation !== fastReceipt.generation ||
    snapshotReceipt.clearedAt !== fastReceipt.clearedAt ||
    snapshotReceipt.requestId !== fastReceipt.requestId
  ) {
    throw new Error("Atomic learning-event stores produced divergent clear receipts.");
  }
  return fastReceipt;
}
