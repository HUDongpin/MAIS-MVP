import assert from "node:assert/strict";
import test from "node:test";

import {
  appendLearningEventsInFastTransaction,
  clearLearningEventsInFastTransaction,
  FastLearningEventAtomicConflictError,
  type FastLearningEventTransactionAdapter,
  type LearningEventGenerationState,
  type StoredFastLearningEventRow
} from "@/lib/server/learningEventFastPersistence";
import type { LearningAnalyticsEvent } from "@/types";

type MemoryState = {
  generations: Map<string, LearningEventGenerationState>;
  events: Map<string, StoredFastLearningEventRow>;
};

function cloneState(state: MemoryState): MemoryState {
  return {
    generations: new Map(
      [...state.generations].map(([userId, generation]) => [userId, { ...generation }])
    ),
    events: new Map([...state.events].map(([id, event]) => [id, { ...event }]))
  };
}

function replaceState(target: MemoryState, source: MemoryState) {
  target.generations = source.generations;
  target.events = source.events;
}

function adapterFor(
  state: MemoryState,
  hooks: {
    afterInsert?: (state: MemoryState, rows: readonly StoredFastLearningEventRow[]) => void;
    afterDelete?: (state: MemoryState) => void;
    beforeReplace?: (state: MemoryState) => void;
  } = {}
): FastLearningEventTransactionAdapter {
  return {
    async readGeneration(userId) {
      return { ...(state.generations.get(userId) ?? {
        generation: 0,
        clearedAt: null,
        requestId: null
      }) };
    },
    async writeLegacyRequestId({ userId, generation, requestId }) {
      const current = state.generations.get(userId);
      if (current?.generation === generation && current.requestId === null) {
        state.generations.set(userId, { ...current, requestId });
      }
    },
    async deleteUserEvents(userId) {
      for (const [id, row] of state.events) {
        if (row.user_id === userId) state.events.delete(id);
      }
      hooks.afterDelete?.(state);
    },
    async replaceGeneration({ userId, state: generation }) {
      hooks.beforeReplace?.(state);
      state.generations.set(userId, { ...generation });
      return { ...generation };
    },
    async readEvents(ids) {
      return ids.flatMap((id) => {
        const row = state.events.get(id);
        return row ? [{ ...row }] : [];
      });
    },
    async insertEvents(rows) {
      const inserted: string[] = [];
      for (const row of rows) {
        if (state.events.has(row.id)) continue;
        state.events.set(row.id, { ...row });
        inserted.push(row.id);
      }
      hooks.afterInsert?.(state, rows);
      return inserted;
    },
    async replaceEvents(rows) {
      for (const row of rows) state.events.set(row.id, { ...row });
    }
  };
}

async function transaction<T>(
  committed: MemoryState,
  run: (adapter: FastLearningEventTransactionAdapter) => Promise<T>,
  hooks?: Parameters<typeof adapterFor>[1]
) {
  const working = cloneState(committed);
  const result = await run(adapterFor(working, hooks));
  replaceState(committed, working);
  return result;
}

function event(overrides: Partial<LearningAnalyticsEvent> = {}): LearningAnalyticsEvent {
  return {
    id: "fast-event-a",
    type: "page-view",
    source: "visualization-lab",
    timestamp: "2026-08-13T01:00:00.000Z",
    grade: "S3",
    topicId: "us-ca-math-s3-chapter-03",
    ...overrides
  };
}

function stored(userId: string, value: LearningAnalyticsEvent): StoredFastLearningEventRow {
  return {
    id: value.id,
    user_id: userId,
    type: value.type,
    source: value.source,
    grade: value.grade,
    topic_id: value.topicId,
    question_id: value.questionId ?? null,
    class_id: value.classId ?? null,
    assignment_id: value.assignmentId ?? null,
    competency_id: value.competencyId ?? null,
    duration_seconds: value.durationSeconds ?? null,
    created_at: value.timestamp
  };
}

test("snapshot generation seven bootstraps a missing fast generation in one transaction", async () => {
  const old = event({ id: "pre-bootstrap-event" });
  const state: MemoryState = {
    generations: new Map(),
    events: new Map([[old.id, stored("student-a", old)]])
  };
  const snapshot = {
    generation: 7,
    clearedAt: "2026-08-13T02:00:00.000Z",
    requestId: "legacy-clear-v1-snapshot-seven"
  };
  const current = event({ id: "generation-seven-event" });

  const receipt = await transaction(state, (fast) => appendLearningEventsInFastTransaction({
    transaction: fast,
    userId: "student-a",
    events: [current],
    generation: 7,
    snapshotGenerationState: snapshot
  }));

  assert.deepEqual(receipt, {
    status: "ok",
    ...snapshot,
    acknowledgedEventIds: [current.id],
    dispositions: [{ id: current.id, disposition: "inserted" }]
  });
  assert.deepEqual(state.generations.get("student-a"), snapshot);
  assert.deepEqual([...state.events], [[current.id, stored("student-a", current)]]);
});

test("a current-generation POST preserves the authoritative fast receipt when snapshot is two generations behind", async () => {
  const fast = {
    generation: 9,
    clearedAt: "2026-08-13T03:00:00.000Z",
    requestId: "clear-nine"
  };
  const snapshot = {
    generation: 7,
    clearedAt: "2026-08-13T02:00:00.000Z",
    requestId: "clear-seven"
  };
  const state: MemoryState = {
    generations: new Map([["student-a", fast]]),
    events: new Map()
  };
  const current = event({ id: "generation-nine-event" });

  const receipt = await transaction(state, (adapter) => appendLearningEventsInFastTransaction({
    transaction: adapter,
    userId: "student-a",
    events: [current],
    generation: 9,
    snapshotGenerationState: snapshot
  }));

  assert.deepEqual(receipt, {
    status: "ok",
    ...fast,
    acknowledgedEventIds: [current.id],
    dispositions: [{ id: current.id, disposition: "inserted" }]
  });
  assert.deepEqual(state.generations.get("student-a"), fast);
});

test("same-request clear retry is idempotent while a distinct stale request cannot delete newer events", async () => {
  const generation = {
    generation: 1,
    clearedAt: "2026-08-13T03:00:00.000Z",
    requestId: "clear-request-a"
  };
  const newer = event({ id: "newer-generation-event" });
  const state: MemoryState = {
    generations: new Map([["student-a", generation]]),
    events: new Map([[newer.id, stored("student-a", newer)]])
  };

  const retry = await transaction(state, (adapter) => clearLearningEventsInFastTransaction({
    transaction: adapter,
    userId: "student-a",
    clearedAt: "2099-01-01T00:00:00.000Z",
    baseGeneration: 0,
    requestId: "clear-request-a"
  }));
  assert.deepEqual(retry, { status: "ok", ...generation });
  assert.equal(state.events.has(newer.id), true);

  const distinct = await transaction(state, (adapter) => clearLearningEventsInFastTransaction({
    transaction: adapter,
    userId: "student-a",
    clearedAt: "2026-08-13T04:00:00.000Z",
    baseGeneration: 0,
    requestId: "clear-request-b"
  }));
  assert.deepEqual(distinct, { status: "generation-mismatch", ...generation });
  assert.equal(state.events.has(newer.id), true);
});

test("an insert race is an atomic conflict and rolls the transaction back", async () => {
  const state: MemoryState = { generations: new Map(), events: new Map() };
  const first = event({ id: "batch-first" });
  const raced = event({ id: "batch-raced", topicId: "expected-topic" });

  await assert.rejects(
    transaction(
      state,
      (adapter) => appendLearningEventsInFastTransaction({
        transaction: adapter,
        userId: "student-a",
        events: [first, raced],
        generation: 0
      }),
      {
        afterInsert(working) {
          working.events.set(raced.id, stored("student-b", {
            ...raced,
            topicId: "conflicting-topic"
          }));
        }
      }
    ),
    (error: unknown) => {
      assert.ok(error instanceof FastLearningEventAtomicConflictError);
      assert.deepEqual(error.result.dispositions, [
        { id: first.id, disposition: "not-processed" },
        { id: raced.id, disposition: "id-conflict" }
      ]);
      return true;
    }
  );
  assert.deepEqual([...state.events], [], "no row from the conflicted batch may commit");
});

test("a clear receipt write failure rolls back the preceding row deletion", async () => {
  const prior = event({ id: "clear-rollback-event" });
  const state: MemoryState = {
    generations: new Map(),
    events: new Map([[prior.id, stored("student-a", prior)]])
  };

  await assert.rejects(
    transaction(
      state,
      (adapter) => clearLearningEventsInFastTransaction({
        transaction: adapter,
        userId: "student-a",
        clearedAt: "2026-08-13T05:00:00.000Z",
        baseGeneration: 0,
        requestId: "clear-write-failure"
      }),
      { beforeReplace() { throw new Error("forced receipt write failure"); } }
    ),
    /forced receipt write failure/
  );
  assert.deepEqual([...state.events], [[prior.id, stored("student-a", prior)]]);
  assert.deepEqual([...state.generations], []);
});
