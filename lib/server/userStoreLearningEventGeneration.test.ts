import assert from "node:assert/strict";
import test from "node:test";

import {
  createStudentActivityPersistenceStore,
  type StudentActivityPersistenceDatabase
} from "@/lib/server/userStore/studentActivityPersistence";
import { legacyLearningEventClearRequestId } from "@/lib/server/learningEventClearIdentity";
import type { LearningAnalyticsEvent } from "@/types";

function createStore(database: StudentActivityPersistenceDatabase) {
  return createStudentActivityPersistenceStore({
    createId: () => "unused-generated-id",
    now: () => new Date("2026-08-12T12:00:00.000Z"),
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

function event(overrides: Partial<LearningAnalyticsEvent> = {}): LearningAnalyticsEvent {
  return {
    id: "learning-generation-event",
    type: "page-view",
    source: "visualization-lab",
    timestamp: "2099-08-12T12:00:00.000Z",
    grade: "S3",
    topicId: "us-ca-math-s3-chapter-05",
    ...overrides
  };
}

test("snapshot learning-event persistence uses generation as the clear fence and exact payload as revision identity", async () => {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    learning_events: [],
    learning_event_clears: []
  };
  const store = createStore(database);
  const first = event();
  const second = event({
    id: "learning-generation-second",
    timestamp: "2099-08-12T12:00:01.000Z"
  });

  assert.deepEqual(await store.appendLearningEvents("student-a", [first, first, second], 0), {
    status: "ok",
    generation: 0,
    clearedAt: null,
    requestId: null,
    acknowledgedEventIds: [first.id, second.id],
    dispositions: [
      { id: first.id, disposition: "inserted" },
      { id: second.id, disposition: "inserted" }
    ]
  });
  assert.deepEqual(await store.appendLearningEvents("student-a", [second, first], 0), {
    status: "ok",
    generation: 0,
    clearedAt: null,
    requestId: null,
    acknowledgedEventIds: [second.id, first.id],
    dispositions: [
      { id: second.id, disposition: "already-persisted" },
      { id: first.id, disposition: "already-persisted" }
    ]
  });
  assert.deepEqual(await store.appendLearningEvents(
    "student-a",
    [{ ...first, topicId: "different-payload" }],
    0
  ), {
    status: "id-conflict",
    generation: 0,
    clearedAt: null,
    requestId: null,
    acknowledgedEventIds: [],
    dispositions: [{ id: first.id, disposition: "id-conflict" }]
  });

  const clear = await store.clearLearningEventsForUser(
    "student-a",
    "2026-08-12T12:00:00.000Z"
  );
  assert.deepEqual(clear, {
    status: "ok",
    generation: 1,
    clearedAt: "2026-08-12T12:00:00.000Z",
    requestId: null
  });
  assert.deepEqual(await store.appendLearningEvents("student-a", [first], 0), {
    status: "generation-mismatch",
    generation: 1,
    clearedAt: clear.clearedAt,
    requestId: null,
    acknowledgedEventIds: [],
    dispositions: [{ id: first.id, disposition: "stale-generation" }]
  });
  assert.equal(database.learning_events?.length, 0, "the future client timestamp cannot resurrect generation zero");
  assert.deepEqual(await store.appendLearningEvents("student-a", [first], 1), {
    status: "ok",
    generation: 1,
    clearedAt: clear.clearedAt,
    requestId: null,
    acknowledgedEventIds: [first.id],
    dispositions: [{ id: first.id, disposition: "inserted" }]
  });
});

test("a historical generation with no request id is migrated deterministically and idempotently", async () => {
  const clearedAt = "2026-08-12T11:00:00.000Z";
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    learning_events: [],
    learning_event_clears: [{
      user_id: "student-legacy",
      cleared_at: clearedAt,
      generation: 7,
      request_id: null
    }]
  };
  let committedMutations = 0;
  const store = createStudentActivityPersistenceStore({
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    mutateLearningEventsDatabase: async (mutator) => {
      const outcome = await mutator(database);
      if (outcome.changed) committedMutations += 1;
      return outcome.value;
    }
  });
  const requestId = legacyLearningEventClearRequestId({
    userId: "student-legacy",
    generation: 7,
    clearedAt
  });

  assert.deepEqual(await store.ensureLearningEventGenerationRequestId("student-legacy"), {
    generation: 7,
    clearedAt,
    requestId
  });
  assert.deepEqual(await store.ensureLearningEventGenerationRequestId("student-legacy"), {
    generation: 7,
    clearedAt,
    requestId
  });
  assert.equal(committedMutations, 1);
  assert.equal(database.learning_event_clears?.[0]?.request_id, requestId);
});

test("trusted dual-store repair can jump an exact fast receipt while a client clear remains strict plus one", async () => {
  const prior = event({ id: "snapshot-generation-seven-event" });
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    visualization_events: [{
      id: prior.id,
      user_id: "student-a",
      topic_id: prior.topicId,
      source: prior.source,
      created_at: prior.timestamp
    }],
    learning_events: [{
      id: prior.id,
      user_id: "student-a",
      type: prior.type,
      source: prior.source,
      grade: prior.grade,
      topic_id: prior.topicId,
      created_at: prior.timestamp
    }],
    learning_event_clears: [{
      user_id: "student-a",
      cleared_at: "2026-08-12T07:00:00.000Z",
      generation: 7,
      request_id: "clear-seven"
    }]
  };
  let committedMutations = 0;
  const store = createStudentActivityPersistenceStore({
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    mutateLearningEventsDatabase: async (mutator) => {
      const outcome = await mutator(database);
      if (outcome.changed) committedMutations += 1;
      return outcome.value;
    }
  });

  assert.deepEqual(await store.clearLearningEventsForUser(
    "student-a",
    "2026-08-12T09:00:00.000Z",
    9,
    7,
    "clear-nine"
  ), {
    status: "generation-mismatch",
    generation: 7,
    clearedAt: "2026-08-12T07:00:00.000Z",
    requestId: "clear-seven"
  });
  assert.equal(database.learning_events?.length, 1);

  const authoritative = {
    generation: 9,
    clearedAt: "2026-08-12T09:00:00.000Z",
    requestId: "clear-nine"
  };
  assert.deepEqual(await store.repairLearningEventGenerationForUser(
    "student-a",
    authoritative
  ), { status: "ok", ...authoritative });
  assert.deepEqual(database.learning_events, []);
  assert.deepEqual(database.visualization_events, []);
  assert.deepEqual(database.learning_event_clears, [{
    user_id: "student-a",
    cleared_at: authoritative.clearedAt,
    generation: authoritative.generation,
    request_id: authoritative.requestId
  }]);

  assert.deepEqual(await store.repairLearningEventGenerationForUser(
    "student-a",
    authoritative
  ), { status: "ok", ...authoritative });
  assert.equal(committedMutations, 1, "an exact repair replay must not advance snapshot revision");
});
