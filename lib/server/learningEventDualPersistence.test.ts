import assert from "node:assert/strict";
import test from "node:test";

import {
  appendLearningEventsInAtomicDualTransaction,
  AtomicLearningEventDualPersistenceAbort,
  canonicalLearningAnalyticsEventFromStoredFastRow,
  clearLearningEventsInAtomicDualTransaction,
  planAtomicLearningEventHistoricalReconciliation,
  runAtomicLearningEventDualStoreTransaction,
  type AtomicLearningEventSnapshotAdapter
} from "@/lib/server/learningEventAtomicDualPersistence";
import {
  FastLearningEventAtomicConflictError,
  storedFastLearningEventRowMatches,
  type FastLearningEventAppendResult,
  type FastLearningEventClearResult,
  type FastLearningEventTransactionAdapter,
  type LearningEventGenerationState,
  type StoredFastLearningEventRow
} from "@/lib/server/learningEventFastPersistence";
import type { LearningAnalyticsEvent } from "@/types";

type MemoryPostgresState = {
  snapshotRows: StoredFastLearningEventRow[];
  fastRows: StoredFastLearningEventRow[];
  snapshotGenerations: Map<string, LearningEventGenerationState>;
  fastGenerations: Map<string, LearningEventGenerationState>;
  revision: number;
};

type TransactionFaults = {
  failFastInsert?: boolean;
  failSnapshotWrite?: boolean;
};

const original: LearningAnalyticsEvent = {
  id: "historical-global-id",
  type: "page-view",
  source: "visualization-lab",
  timestamp: "2026-08-13T08:00:00.000Z",
  grade: "S3",
  topicId: "snapshot-original-topic"
};
const competing: LearningAnalyticsEvent = {
  ...original,
  topicId: "competing-topic"
};

function rowFor(userId: string, event: LearningAnalyticsEvent): StoredFastLearningEventRow {
  return {
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
    duration_seconds: event.durationSeconds ?? null,
    created_at: event.timestamp
  };
}

function eventFor(row: StoredFastLearningEventRow): LearningAnalyticsEvent {
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    timestamp: new Date(row.created_at).toISOString(),
    grade: row.grade,
    topicId: row.topic_id,
    ...(row.question_id ? { questionId: row.question_id } : {}),
    ...(row.class_id ? { classId: row.class_id } : {}),
    ...(row.assignment_id ? { assignmentId: row.assignment_id } : {}),
    ...(row.competency_id ? { competencyId: row.competency_id } : {}),
    ...(row.duration_seconds === null ? {} : { durationSeconds: row.duration_seconds })
  };
}

function generationFor(
  generations: Map<string, LearningEventGenerationState>,
  userId: string
) {
  return generations.get(userId) ?? { generation: 0, clearedAt: null, requestId: null };
}

function memoryFastAdapter(
  state: MemoryPostgresState,
  faults: TransactionFaults
): FastLearningEventTransactionAdapter {
  return {
    async readGeneration(userId) {
      return { ...generationFor(state.fastGenerations, userId) };
    },
    async writeLegacyRequestId({ userId, generation, requestId }) {
      const current = generationFor(state.fastGenerations, userId);
      if (current.generation === generation && current.requestId === null) {
        state.fastGenerations.set(userId, { ...current, requestId });
      }
    },
    async deleteUserEvents(userId) {
      state.fastRows = state.fastRows.filter((row) => row.user_id !== userId);
    },
    async replaceGeneration({ userId, state: next }) {
      state.fastGenerations.set(userId, { ...next });
      return { ...next };
    },
    async readEvents(ids) {
      const requested = new Set(ids);
      return state.fastRows.filter((row) => requested.has(row.id)).map((row) => ({ ...row }));
    },
    async insertEvents(rows) {
      if (faults.failFastInsert) throw new Error("injected fast-row write failure");
      const inserted: string[] = [];
      for (const row of rows) {
        if (state.fastRows.some(({ id }) => id === row.id)) continue;
        state.fastRows.push({ ...row });
        inserted.push(row.id);
      }
      return inserted;
    },
    async replaceEvents(rows) {
      for (const row of rows) {
        const existing = state.fastRows.find((candidate) => candidate.id === row.id);
        if (existing && existing.user_id !== row.user_id) {
          throw new Error("a user-scoped transaction cannot replace a foreign event ID");
        }
        state.fastRows = state.fastRows.filter((candidate) => candidate.id !== row.id);
        state.fastRows.push({ ...row });
      }
    }
  };
}

function memorySnapshotAdapter(
  state: MemoryPostgresState,
  userId: string
): AtomicLearningEventSnapshotAdapter {
  return {
    async ensureGenerationRequestId() {
      return { ...generationFor(state.snapshotGenerations, userId) };
    },
    async repairGeneration(next) {
      const current = generationFor(state.snapshotGenerations, userId);
      if (next.generation < current.generation) {
        return { status: "generation-mismatch", ...current };
      }
      if (next.generation > current.generation) {
        state.snapshotRows = state.snapshotRows.filter((row) => row.user_id !== userId);
      }
      state.snapshotGenerations.set(userId, { ...next });
      return { status: "ok", ...next };
    },
    async reconcileHistoricalRows(fast, events) {
      const eventIds = [...new Set(events.map(({ id }) => id))];
      const requested = new Set(eventIds);
      const fastRows = await fast.readEvents(eventIds);
      const plan = planAtomicLearningEventHistoricalReconciliation({
        userId,
        requestedEventIds: eventIds,
        snapshotRows: state.snapshotRows.filter((row) => requested.has(row.id)),
        fastRows
      });
      if (plan.status === "id-conflict") return plan;
      await fast.replaceEvents(plan.fastRowsToReplace);
      for (const row of plan.fastRowsToRecoverInSnapshot) {
        state.snapshotRows.push({ ...row });
      }
      return { status: "ok" };
    },
    async append(events, generation) {
      const generationState = generationFor(state.snapshotGenerations, userId);
      if (generation !== generationState.generation) {
        return {
          status: "generation-mismatch",
          ...generationState,
          acknowledgedEventIds: [],
          dispositions: events.map(({ id }) => ({ id, disposition: "stale-generation" }))
        };
      }
      const conflictingIds = new Set(events.filter((event) => {
        const existing = state.snapshotRows.find(({ id }) => id === event.id);
        return Boolean(existing && !storedFastLearningEventRowMatches(existing, userId, event));
      }).map(({ id }) => id));
      if (conflictingIds.size) {
        return {
          status: "id-conflict",
          ...generationState,
          acknowledgedEventIds: [],
          dispositions: events.map(({ id }) => ({
            id,
            disposition: conflictingIds.has(id) ? "id-conflict" : "not-processed"
          }))
        };
      }
      const inserted = new Set<string>();
      for (const event of events) {
        if (state.snapshotRows.some(({ id }) => id === event.id)) continue;
        state.snapshotRows.push(rowFor(userId, event));
        inserted.add(event.id);
      }
      return {
        status: "ok",
        ...generationState,
        acknowledgedEventIds: events.map(({ id }) => id),
        dispositions: events.map(({ id }) => ({
          id,
          disposition: inserted.has(id) ? "inserted" : "already-persisted"
        }))
      };
    }
  };
}

class MemoryAtomicPostgres {
  state: MemoryPostgresState;
  private tail = Promise.resolve();

  constructor(initial?: Partial<MemoryPostgresState>) {
    this.state = {
      snapshotRows: initial?.snapshotRows?.map((row) => ({ ...row })) ?? [],
      fastRows: initial?.fastRows?.map((row) => ({ ...row })) ?? [],
      snapshotGenerations: new Map(initial?.snapshotGenerations ?? []),
      fastGenerations: new Map(initial?.fastGenerations ?? []),
      revision: initial?.revision ?? 0
    };
  }

  private async begin<T>(
    faults: TransactionFaults,
    callback: (working: MemoryPostgresState) => Promise<T>
  ) {
    let release!: () => void;
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const working = structuredClone(this.state) as MemoryPostgresState;
    const originalSnapshot = JSON.stringify({
      rows: this.state.snapshotRows,
      generations: [...this.state.snapshotGenerations]
    });
    try {
      const result = await callback(working);
      const snapshotChanged = JSON.stringify({
        rows: working.snapshotRows,
        generations: [...working.snapshotGenerations]
      }) !== originalSnapshot;
      if (faults.failSnapshotWrite && snapshotChanged) {
        throw new Error("injected app_state write failure");
      }
      working.revision = this.state.revision + Number(snapshotChanged);
      this.state = working;
      return result;
    } finally {
      release();
    }
  }

  async append(
    userId: string,
    events: LearningAnalyticsEvent[],
    generation = 0,
    faults: TransactionFaults = {}
  ): Promise<FastLearningEventAppendResult> {
    try {
      return await this.begin(faults, async (working) => {
        const fast = memoryFastAdapter(working, faults);
        return appendLearningEventsInAtomicDualTransaction({
          fast,
          snapshot: memorySnapshotAdapter(working, userId),
          userId,
          events,
          generation
        });
      });
    } catch (error) {
      if (
        error instanceof AtomicLearningEventDualPersistenceAbort ||
        error instanceof FastLearningEventAtomicConflictError
      ) return error.result as FastLearningEventAppendResult;
      throw error;
    }
  }

  async clear(
    userId: string,
    baseGeneration: number,
    requestId: string,
    faults: TransactionFaults = {}
  ): Promise<FastLearningEventClearResult> {
    try {
      return await this.begin(faults, async (working) =>
        clearLearningEventsInAtomicDualTransaction({
          fast: memoryFastAdapter(working, faults),
          snapshot: memorySnapshotAdapter(working, userId),
          userId,
          clearedAt: "2026-08-13T09:00:00.000Z",
          baseGeneration,
          requestId
        })
      );
    } catch (error) {
      if (
        error instanceof AtomicLearningEventDualPersistenceAbort &&
        !("acknowledgedEventIds" in error.result)
      ) return error.result;
      throw error;
    }
  }
}

function exactPhysicalRows(database: MemoryAtomicPostgres) {
  return {
    snapshot: database.state.snapshotRows.map((row) => ({ ...row })),
    fast: database.state.fastRows.map((row) => ({ ...row })),
    snapshotGenerations: [...database.state.snapshotGenerations],
    fastGenerations: [...database.state.fastGenerations],
    revision: database.state.revision
  };
}

test("snapshot-only exact replay backfills fast rows inside the same transaction", async () => {
  const database = new MemoryAtomicPostgres({
    snapshotRows: [rowFor("student-a", original)]
  });
  const result = await database.append("student-a", [original]);

  assert.equal(result.status, "ok");
  assert.deepEqual(result.dispositions, [{ id: original.id, disposition: "already-persisted" }]);
  assert.deepEqual(database.state.fastRows, [rowFor("student-a", original)]);
  assert.deepEqual(database.state.snapshotRows, [rowFor("student-a", original)]);
  assert.equal(database.state.revision, 0, "fast-only repair must not rewrite app_state");
});

test("an exact two-store replay does not advance the app_state revision", async () => {
  const database = new MemoryAtomicPostgres({
    snapshotRows: [rowFor("student-a", original)],
    fastRows: [rowFor("student-a", original)],
    revision: 41
  });
  const result = await database.append("student-a", [original]);

  assert.equal(result.status, "ok");
  assert.deepEqual(result.dispositions, [{ id: original.id, disposition: "already-persisted" }]);
  assert.equal(database.state.revision, 41);
});

test("snapshot-only changed payload is rejected without ever committing the competing fast revision", async () => {
  const database = new MemoryAtomicPostgres({
    snapshotRows: [rowFor("student-a", original)]
  });
  const before = exactPhysicalRows(database);
  const result = await database.append("student-a", [competing]);

  assert.equal(result.status, "id-conflict");
  assert.deepEqual(exactPhysicalRows(database), before);
});

test("hot-only lost-ACK state is recovered into the snapshot before exact replay ACK", async () => {
  const database = new MemoryAtomicPostgres({
    fastRows: [rowFor("student-a", original)]
  });
  const result = await database.append("student-a", [original]);

  assert.equal(result.status, "ok");
  assert.deepEqual(database.state.snapshotRows, [rowFor("student-a", original)]);
  assert.deepEqual(database.state.fastRows, [rowFor("student-a", original)]);
  assert.equal(database.state.revision, 1);
});

test("snapshot and fast historical repair retain every optional event identity field", async () => {
  const enriched: LearningAnalyticsEvent = {
    ...original,
    id: "historical-enriched-id",
    questionId: "question-17",
    classId: "class-4",
    assignmentId: "assignment-9",
    competencyId: "competency-algebra",
    durationSeconds: 37
  };
  const snapshotOnly = new MemoryAtomicPostgres({
    snapshotRows: [rowFor("student-a", enriched)]
  });
  assert.equal((await snapshotOnly.append("student-a", [enriched])).status, "ok");
  assert.deepEqual(snapshotOnly.state.fastRows, [rowFor("student-a", enriched)]);

  const fastOnly = new MemoryAtomicPostgres({
    fastRows: [rowFor("student-a", enriched)]
  });
  assert.equal((await fastOnly.append("student-a", [enriched])).status, "ok");
  assert.deepEqual(fastOnly.state.snapshotRows, [rowFor("student-a", enriched)]);
  assert.deepEqual(eventFor(fastOnly.state.snapshotRows[0]!), enriched);
});

test("malformed historical fast rows fail closed before snapshot import", () => {
  const malformed = {
    ...rowFor("student-a", original),
    grade: "not-a-grade"
  } as unknown as StoredFastLearningEventRow;
  assert.throws(
    () => canonicalLearningAnalyticsEventFromStoredFastRow(malformed),
    /not canonical/
  );
  assert.throws(
    () => canonicalLearningAnalyticsEventFromStoredFastRow({
      ...rowFor("student-a", original),
      created_at: "not-a-timestamp"
    }),
    /timestamp is invalid/
  );
});

test("same-user conflicting partial hot row is repaired from historical snapshot authority", async () => {
  const database = new MemoryAtomicPostgres({
    snapshotRows: [rowFor("student-a", original)],
    fastRows: [rowFor("student-a", competing)]
  });
  const result = await database.append("student-a", [original]);

  assert.equal(result.status, "ok");
  assert.deepEqual(database.state.snapshotRows, [rowFor("student-a", original)]);
  assert.deepEqual(database.state.fastRows, [rowFor("student-a", original)]);
});

for (const setup of [
  {
    label: "foreign snapshot-only",
    snapshotRows: [rowFor("student-b", original)],
    fastRows: []
  },
  {
    label: "foreign fast-only",
    snapshotRows: [],
    fastRows: [rowFor("student-b", original)]
  },
  {
    label: "foreign snapshot plus current-user hot row",
    snapshotRows: [rowFor("student-b", original)],
    fastRows: [rowFor("student-a", original)]
  },
  {
    label: "current-user snapshot plus foreign hot row",
    snapshotRows: [rowFor("student-a", original)],
    fastRows: [rowFor("student-b", original)]
  }
]) {
  test(`${setup.label} is an atomic ID conflict with zero physical-store mutation`, async () => {
    const database = new MemoryAtomicPostgres(setup);
    const before = exactPhysicalRows(database);
    const result = await database.append("student-a", [original]);

    assert.equal(result.status, "id-conflict");
    assert.deepEqual(exactPhysicalRows(database), before);
  });
}

test("different users racing the same global ID cannot both commit", async () => {
  const database = new MemoryAtomicPostgres();
  const [left, right] = await Promise.all([
    database.append("student-a", [original]),
    database.append("student-b", [original])
  ]);

  assert.deepEqual([left.status, right.status].sort(), ["id-conflict", "ok"]);
  assert.equal(database.state.snapshotRows.length, 1);
  assert.equal(database.state.fastRows.length, 1);
  assert.equal(database.state.snapshotRows[0]?.user_id, database.state.fastRows[0]?.user_id);
});

test("a mixed batch conflict rolls back an unrelated new ID in both stores", async () => {
  const unrelated: LearningAnalyticsEvent = {
    ...original,
    id: "unrelated-new-id",
    topicId: "unrelated-new-topic"
  };
  const database = new MemoryAtomicPostgres({
    snapshotRows: [rowFor("student-a", original)],
    fastRows: [rowFor("student-a", original)]
  });
  const before = exactPhysicalRows(database);
  const result = await database.append("student-a", [unrelated, competing]);

  assert.equal(result.status, "id-conflict");
  assert.deepEqual(result.dispositions, [
    { id: unrelated.id, disposition: "not-processed" },
    { id: competing.id, disposition: "id-conflict" }
  ]);
  assert.deepEqual(exactPhysicalRows(database), before);
});

test("a generation mismatch rolls back all preparatory historical repairs", async () => {
  const state: LearningEventGenerationState = {
    generation: 1,
    clearedAt: "2026-08-13T07:00:00.000Z",
    requestId: "prior-clear-request"
  };
  const database = new MemoryAtomicPostgres({
    snapshotRows: [rowFor("student-a", original)],
    snapshotGenerations: new Map([["student-a", state]]),
    fastGenerations: new Map([["student-a", state]])
  });
  const before = exactPhysicalRows(database);
  const result = await database.append("student-a", [original], 0);

  assert.equal(result.status, "generation-mismatch");
  assert.deepEqual(exactPhysicalRows(database), before);
});

test("snapshot generation seven bootstraps an empty fast authority before a current append", async () => {
  const generationSeven: LearningEventGenerationState = {
    generation: 7,
    clearedAt: "2026-08-13T07:00:00.000Z",
    requestId: "clear-request-seven"
  };
  const staleFastEvent = { ...original, id: "stale-before-seven" };
  const current = { ...original, id: "current-at-seven" };
  const database = new MemoryAtomicPostgres({
    fastRows: [rowFor("student-a", staleFastEvent)],
    snapshotGenerations: new Map([["student-a", generationSeven]])
  });

  const result = await database.append("student-a", [current], 7);
  assert.equal(result.status, "ok");
  assert.deepEqual(database.state.fastGenerations.get("student-a"), generationSeven);
  assert.deepEqual(database.state.snapshotGenerations.get("student-a"), generationSeven);
  assert.deepEqual(database.state.fastRows, [rowFor("student-a", current)]);
  assert.deepEqual(database.state.snapshotRows, [rowFor("student-a", current)]);
});

test("fast generation nine repairs snapshot generation seven before a generation-nine POST", async () => {
  const generationSeven: LearningEventGenerationState = {
    generation: 7,
    clearedAt: "2026-08-13T07:00:00.000Z",
    requestId: "clear-request-seven"
  };
  const generationNine: LearningEventGenerationState = {
    generation: 9,
    clearedAt: "2026-08-13T09:00:00.000Z",
    requestId: "clear-request-nine"
  };
  const staleSnapshotEvent = { ...original, id: "stale-at-seven" };
  const current = { ...original, id: "current-at-nine" };
  const database = new MemoryAtomicPostgres({
    snapshotRows: [rowFor("student-a", staleSnapshotEvent)],
    snapshotGenerations: new Map([["student-a", generationSeven]]),
    fastGenerations: new Map([["student-a", generationNine]])
  });

  const result = await database.append("student-a", [current], 9);
  assert.equal(result.status, "ok");
  assert.deepEqual(database.state.snapshotGenerations.get("student-a"), generationNine);
  assert.deepEqual(database.state.fastGenerations.get("student-a"), generationNine);
  assert.deepEqual(database.state.snapshotRows, [rowFor("student-a", current)]);
  assert.deepEqual(database.state.fastRows, [rowFor("student-a", current)]);
});

test("fast generation eight and snapshot generation seven clear to nine in one transaction", async () => {
  const generationSeven: LearningEventGenerationState = {
    generation: 7,
    clearedAt: "2026-08-13T07:00:00.000Z",
    requestId: "clear-request-seven"
  };
  const generationEight: LearningEventGenerationState = {
    generation: 8,
    clearedAt: "2026-08-13T08:00:00.000Z",
    requestId: "clear-request-eight"
  };
  const database = new MemoryAtomicPostgres({
    snapshotRows: [rowFor("student-a", { ...original, id: "stale-snapshot-seven" })],
    fastRows: [rowFor("student-a", { ...original, id: "current-fast-eight" })],
    snapshotGenerations: new Map([["student-a", generationSeven]]),
    fastGenerations: new Map([["student-a", generationEight]])
  });

  const result = await database.clear("student-a", 8, "clear-request-nine");
  assert.deepEqual(result, {
    status: "ok",
    generation: 9,
    clearedAt: "2026-08-13T09:00:00.000Z",
    requestId: "clear-request-nine"
  });
  assert.deepEqual(database.state.snapshotRows, []);
  assert.deepEqual(database.state.fastRows, []);
  assert.deepEqual(database.state.snapshotGenerations.get("student-a"), {
    generation: 9,
    clearedAt: "2026-08-13T09:00:00.000Z",
    requestId: "clear-request-nine"
  });
  assert.deepEqual(database.state.fastGenerations.get("student-a"), {
    generation: 9,
    clearedAt: "2026-08-13T09:00:00.000Z",
    requestId: "clear-request-nine"
  });
});

test("fast-row failure rolls back the in-memory snapshot mutation and physical row insert", async () => {
  const database = new MemoryAtomicPostgres();
  const before = exactPhysicalRows(database);
  await assert.rejects(
    database.append("student-a", [original], 0, { failFastInsert: true }),
    /injected fast-row write failure/
  );
  assert.deepEqual(exactPhysicalRows(database), before);
});

test("app_state write failure rolls back the hot row and snapshot together", async () => {
  const database = new MemoryAtomicPostgres();
  const before = exactPhysicalRows(database);
  await assert.rejects(
    database.append("student-a", [original], 0, { failSnapshotWrite: true }),
    /injected app_state write failure/
  );
  assert.deepEqual(exactPhysicalRows(database), before);
});

test("clear and its exact request receipt commit to both stores or roll back together", async () => {
  const database = new MemoryAtomicPostgres({
    snapshotRows: [rowFor("student-a", original)],
    fastRows: [rowFor("student-a", original)]
  });
  const before = exactPhysicalRows(database);
  await assert.rejects(
    database.clear("student-a", 0, "clear-request-a", { failSnapshotWrite: true }),
    /injected app_state write failure/
  );
  assert.deepEqual(exactPhysicalRows(database), before);

  const result = await database.clear("student-a", 0, "clear-request-a");
  assert.deepEqual(result, {
    status: "ok",
    generation: 1,
    clearedAt: "2026-08-13T09:00:00.000Z",
    requestId: "clear-request-a"
  });
  assert.deepEqual(database.state.snapshotRows, []);
  assert.deepEqual(database.state.fastRows, []);
  assert.deepEqual(database.state.snapshotGenerations.get("student-a"), {
    generation: 1,
    clearedAt: "2026-08-13T09:00:00.000Z",
    requestId: "clear-request-a"
  });
  assert.deepEqual(database.state.fastGenerations.get("student-a"), {
    generation: 1,
    clearedAt: "2026-08-13T09:00:00.000Z",
    requestId: "clear-request-a"
  });
});

test("exact clear retry is idempotent while a distinct stale request remains a mismatch", async () => {
  const database = new MemoryAtomicPostgres({
    snapshotGenerations: new Map([["student-a", {
      generation: 1,
      clearedAt: "2026-08-13T09:00:00.000Z",
      requestId: "clear-request-a"
    }]]),
    fastGenerations: new Map([["student-a", {
      generation: 1,
      clearedAt: "2026-08-13T09:00:00.000Z",
      requestId: "clear-request-a"
    }]])
  });
  const exact = await database.clear("student-a", 0, "clear-request-a");
  assert.equal(exact.status, "ok");
  assert.equal(exact.generation, 1);
  const revisionAfterExactRetry = database.state.revision;

  const stale = await database.clear("student-a", 0, "clear-request-b");
  assert.equal(stale.status, "generation-mismatch");
  assert.equal(stale.generation, 1);
  assert.equal(database.state.fastGenerations.get("student-a")?.requestId, "clear-request-a");
  assert.equal(database.state.snapshotGenerations.get("student-a")?.requestId, "clear-request-a");
  assert.equal(database.state.revision, revisionAfterExactRetry);
});

test("the production transaction seam writes in-transaction and invalidates only after commit", async () => {
  const calls: string[] = [];
  let committed = false;
  const result = await runAtomicLearningEventDualStoreTransaction({
    userId: "student-a",
    eventIds: [original.id],
    begin: async (callback) => {
      calls.push("begin");
      const value = await callback("transaction");
      calls.push("commit");
      committed = true;
      return value;
    },
    acquireUserLock: async () => { calls.push("user-lock"); },
    acquireEventIdLocks: async () => { calls.push("event-id-lock"); },
    readSnapshotForUpdate: async () => {
      calls.push("snapshot-for-update");
      return { marker: "snapshot" };
    },
    createSnapshot: (database) => ({
      database,
      adapter: {} as AtomicLearningEventSnapshotAdapter,
      changed: () => true,
      afterCommit: () => {
        assert.equal(committed, true);
        calls.push("after-commit-cache-invalidation");
      }
    }),
    createFastAdapter: () => ({} as FastLearningEventTransactionAdapter),
    mutate: async () => {
      calls.push("dual-store-mutation");
      return "durable-result";
    },
    writeSnapshot: async () => { calls.push("snapshot-write"); }
  });

  assert.equal(result, "durable-result");
  assert.deepEqual(calls, [
    "begin",
    "user-lock",
    "event-id-lock",
    "snapshot-for-update",
    "dual-store-mutation",
    "snapshot-write",
    "commit",
    "after-commit-cache-invalidation"
  ]);
});

test("the production transaction seam skips no-op snapshot writes and post-commit work on rollback", async () => {
  let snapshotWrites = 0;
  let afterCommitCalls = 0;
  const common = {
    userId: "student-a",
    eventIds: [original.id],
    acquireUserLock: async () => {},
    acquireEventIdLocks: async () => {},
    readSnapshotForUpdate: async () => ({ marker: "snapshot" }),
    createFastAdapter: () => ({} as FastLearningEventTransactionAdapter),
    writeSnapshot: async () => { snapshotWrites += 1; }
  };

  await runAtomicLearningEventDualStoreTransaction({
    ...common,
    begin: async (callback) => callback("transaction"),
    createSnapshot: (database) => ({
      database,
      adapter: {} as AtomicLearningEventSnapshotAdapter,
      changed: () => false,
      afterCommit: () => { afterCommitCalls += 1; }
    }),
    mutate: async () => "exact-replay"
  });
  assert.equal(snapshotWrites, 0);
  assert.equal(afterCommitCalls, 1);

  await assert.rejects(
    runAtomicLearningEventDualStoreTransaction({
      ...common,
      begin: async (callback) => {
        await callback("transaction");
        throw new Error("injected commit failure");
      },
      createSnapshot: (database) => ({
        database,
        adapter: {} as AtomicLearningEventSnapshotAdapter,
        changed: () => true,
        afterCommit: () => { afterCommitCalls += 1; }
      }),
      mutate: async () => "must-not-escape"
    }),
    /injected commit failure/
  );
  assert.equal(snapshotWrites, 1, "the attempted write remains inside the rolled-back callback");
  assert.equal(afterCommitCalls, 1, "rollback must not run post-commit invalidation");
});

test("a replace-only hot repair skips app_state revision but invalidates exactly once after commit", async () => {
  let snapshotWrites = 0;
  let invalidations = 0;
  let committed = false;
  const result = await runAtomicLearningEventDualStoreTransaction({
    userId: "student-a",
    eventIds: [original.id],
    begin: async (callback) => {
      const value = await callback("transaction");
      committed = true;
      return value;
    },
    acquireUserLock: async () => {},
    acquireEventIdLocks: async () => {},
    readSnapshotForUpdate: async () => ({ revision: 17 }),
    createSnapshot: (database) => ({
      database,
      adapter: {} as AtomicLearningEventSnapshotAdapter,
      changed: () => false,
      afterCommit: () => {
        assert.equal(committed, true);
        invalidations += 1;
      }
    }),
    createFastAdapter: () => ({} as FastLearningEventTransactionAdapter),
    mutate: async () => "replace-only-repair",
    writeSnapshot: async () => { snapshotWrites += 1; }
  });
  assert.equal(result, "replace-only-repair");
  assert.equal(snapshotWrites, 0);
  assert.equal(invalidations, 1);

  committed = false;
  await assert.rejects(
    runAtomicLearningEventDualStoreTransaction({
      userId: "student-a",
      eventIds: [original.id],
      begin: async (callback) => {
        await callback("transaction");
        throw new Error("replace-only commit failed");
      },
      acquireUserLock: async () => {},
      acquireEventIdLocks: async () => {},
      readSnapshotForUpdate: async () => ({ revision: 17 }),
      createSnapshot: (database) => ({
        database,
        adapter: {} as AtomicLearningEventSnapshotAdapter,
        changed: () => false,
        afterCommit: () => { invalidations += 1; }
      }),
      createFastAdapter: () => ({} as FastLearningEventTransactionAdapter),
      mutate: async () => "replace-only-repair",
      writeSnapshot: async () => { snapshotWrites += 1; }
    }),
    /replace-only commit failed/
  );
  assert.equal(snapshotWrites, 0);
  assert.equal(invalidations, 1, "a rolled-back hot repair cannot publish invalidation");
});

test("an atomic clear publishes dashboard invalidation only after its snapshot commit", async () => {
  let committed = false;
  let invalidations = 0;
  const boundary = {
    userId: "student-a",
    eventIds: [] as string[],
    acquireUserLock: async () => {},
    acquireEventIdLocks: async () => {},
    readSnapshotForUpdate: async () => ({ generation: 0 }),
    createFastAdapter: () => ({} as FastLearningEventTransactionAdapter),
    mutate: async () => ({ status: "ok" as const, generation: 1 }),
    writeSnapshot: async () => {}
  };
  await runAtomicLearningEventDualStoreTransaction({
    ...boundary,
    begin: async (callback) => {
      const result = await callback("transaction");
      committed = true;
      return result;
    },
    createSnapshot: (database) => ({
      database,
      adapter: {} as AtomicLearningEventSnapshotAdapter,
      changed: () => true,
      afterCommit: () => {
        assert.equal(committed, true);
        invalidations += 1;
      }
    })
  });
  assert.equal(invalidations, 1);

  committed = false;
  await assert.rejects(
    runAtomicLearningEventDualStoreTransaction({
      ...boundary,
      begin: async (callback) => {
        await callback("transaction");
        throw new Error("clear commit failed");
      },
      createSnapshot: (database) => ({
        database,
        adapter: {} as AtomicLearningEventSnapshotAdapter,
        changed: () => true,
        afterCommit: () => { invalidations += 1; }
      })
    }),
    /clear commit failed/
  );
  assert.equal(invalidations, 1, "a rolled-back clear cannot publish cache invalidation");
});

test("an empty generation handshake invalidates a deleted stale hot row only after commit", async () => {
  const generationSeven: LearningEventGenerationState = {
    generation: 7,
    clearedAt: "2026-08-13T07:00:00.000Z",
    requestId: "clear-request-seven"
  };
  const committedState: MemoryPostgresState = {
    snapshotRows: [],
    fastRows: [rowFor("student-a", { ...original, id: "stale-fast-before-seven" })],
    snapshotGenerations: new Map([["student-a", generationSeven]]),
    fastGenerations: new Map(),
    revision: 23
  };
  let invalidations = 0;
  let snapshotWrites = 0;
  let committed = false;

  const run = (failCommit: boolean) => {
    const working = structuredClone(committedState) as MemoryPostgresState;
    let physicalMutation = false;
    return runAtomicLearningEventDualStoreTransaction<
      MemoryPostgresState,
      MemoryPostgresState,
      FastLearningEventAppendResult
    >({
      userId: "student-a",
      eventIds: [],
      begin: async (callback) => {
        const result = await callback(working);
        if (failCommit) throw new Error("handshake commit failed");
        committedState.fastRows = working.fastRows;
        committedState.fastGenerations = working.fastGenerations;
        committed = true;
        return result;
      },
      acquireUserLock: async () => {},
      acquireEventIdLocks: async () => {},
      readSnapshotForUpdate: async () => working,
      createSnapshot: (database) => ({
        database,
        adapter: memorySnapshotAdapter(working, "student-a"),
        changed: () => false,
        markPhysicalMutation: () => { physicalMutation = true; },
        afterCommit: () => {
          assert.equal(committed, true);
          if (physicalMutation) invalidations += 1;
        }
      }),
      createFastAdapter: () => memoryFastAdapter(working, {}),
      mutate: ({ fast, snapshot }) => appendLearningEventsInAtomicDualTransaction({
        fast,
        snapshot,
        userId: "student-a",
        events: [],
        generation: 7
      }),
      writeSnapshot: async () => { snapshotWrites += 1; }
    });
  };

  const result = await run(false);
  assert.equal(result.status, "ok");
  assert.deepEqual(committedState.fastRows, []);
  assert.deepEqual(committedState.fastGenerations.get("student-a"), generationSeven);
  assert.equal(committedState.revision, 23);
  assert.equal(snapshotWrites, 0);
  assert.equal(invalidations, 1);

  committed = false;
  committedState.fastRows = [rowFor("student-a", { ...original, id: "stale-again" })];
  committedState.fastGenerations = new Map();
  await assert.rejects(run(true), /handshake commit failed/);
  assert.equal(committedState.fastRows.length, 1);
  assert.equal(committedState.fastGenerations.size, 0);
  assert.equal(committedState.revision, 23);
  assert.equal(snapshotWrites, 0);
  assert.equal(invalidations, 1, "rolled-back handshake repair cannot invalidate cache");
});

test("the fake transaction stores the exact event payload used by both authorities", async () => {
  const database = new MemoryAtomicPostgres();
  await database.append("student-a", [original]);
  assert.deepEqual(eventFor(database.state.snapshotRows[0]!), original);
  assert.deepEqual(eventFor(database.state.fastRows[0]!), original);
});
