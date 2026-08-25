import assert from "node:assert/strict";
import test from "node:test";

import {
  createStudentActivityPersistenceStore,
  type LearningEventAppendResult,
  type StudentActivityPersistenceDatabase
} from "@/lib/server/userStore/studentActivityPersistence";
import type { LearningAnalyticsEvent } from "@/types";

const now = new Date("2026-08-09T12:00:00.000Z");

function learningEvent(
  id: string,
  overrides: Partial<LearningAnalyticsEvent> = {}
): LearningAnalyticsEvent {
  return {
    id,
    type: "page-view",
    source: "visualization-lab",
    timestamp: "2026-08-09T11:00:00.000Z",
    grade: "S3",
    topicId: "telemetry-generation-contract",
    durationSeconds: 17,
    ...overrides
  };
}

function createStore(database: StudentActivityPersistenceDatabase) {
  return createStudentActivityPersistenceStore({
    now: () => now,
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database)
  });
}

function createSerializedStore(database: StudentActivityPersistenceDatabase) {
  let mutationQueue: Promise<void> = Promise.resolve();
  return createStudentActivityPersistenceStore({
    now: () => now,
    readDatabase: async () => database,
    mutateDatabase: (mutator) => {
      const run = mutationQueue.then(() => mutator(database));
      mutationQueue = run.then(() => undefined, () => undefined);
      return run;
    }
  });
}

function requireGenerationResult(
  result: number | LearningEventAppendResult
): asserts result is LearningEventAppendResult {
  assert.notEqual(typeof result, "number");
}

function storedLearningEventIds(database: StudentActivityPersistenceDatabase) {
  return database.learning_events?.map((event) => event.id) ?? [];
}

test("nonfast learning-event append returns exact first-write-wins acknowledgements", async () => {
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [],
    learning_event_clears: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createStore(database);
  const first = learningEvent("event-1", { topicId: "first-payload" });
  const duplicate = learningEvent("event-1", { topicId: "must-not-replace-first" });

  const result = await store.appendLearningEvents("student-a", [first, duplicate], 0);

  assert.deepEqual(result, {
    status: "ok",
    generation: 0,
    clearedAt: null,
    acknowledgedEventIds: ["event-1"],
    dispositions: [{ id: "event-1", disposition: "inserted" }]
  });
  assert.deepEqual(database.learning_events?.map((event) => ({
    id: event.id,
    lrsDelivery: event.lrs_delivery,
    topicId: event.topic_id,
    userId: event.user_id
  })), [{
    id: "event-1",
    lrsDelivery: {
      attempts: 0,
      queued_at: now.toISOString(),
      status: "pending",
      updated_at: now.toISOString()
    },
    topicId: "first-payload",
    userId: "student-a"
  }]);
});

test("nonfast exact replay repairs a missing durable LRS job and persists the returned outbox", async () => {
  const event = learningEvent("lrs-replay-event");
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [{
      id: event.id,
      user_id: "student-a",
      type: event.type,
      source: event.source,
      grade: event.grade,
      topic_id: event.topicId,
      duration_seconds: event.durationSeconds,
      created_at: event.timestamp
    }],
    learning_event_clears: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createStore(database);

  const replay = await store.appendLearningEvents("student-a", [event], 0);
  requireGenerationResult(replay);
  assert.equal(replay.status, "ok");
  assert.deepEqual(database.learning_events?.[0]?.lrs_delivery, {
    attempts: 0,
    queued_at: now.toISOString(),
    status: "pending",
    updated_at: now.toISOString()
  });

  const persisted = await store.recordLearningEventLrsDelivery("student-a", [{
    eventId: event.id,
    status: "queued",
    statementId: "statement-lrs-replay-event",
    attempts: 2,
    queuedAt: "2026-08-09T12:01:00.000Z",
    nextRetryAt: "2026-08-09T12:03:00.000Z",
    reason: "http-error",
    httpStatus: 503
  }]);
  assert.equal(persisted, true);
  assert.deepEqual(database.learning_events?.[0]?.lrs_delivery, {
    status: "queued",
    statement_id: "statement-lrs-replay-event",
    attempts: 2,
    queued_at: "2026-08-09T12:01:00.000Z",
    next_retry_at: "2026-08-09T12:03:00.000Z",
    reason: "http-error",
    http_status: 503,
    updated_at: now.toISOString()
  });

  const wrongOwner = await store.recordLearningEventLrsDelivery("student-b", [{
    eventId: event.id,
    status: "sent",
    attempts: 1
  }]);
  assert.equal(wrongOwner, false);
  assert.equal(database.learning_events?.[0]?.lrs_delivery?.status, "queued");

  const sent = await store.recordLearningEventLrsDelivery("student-a", [{
    eventId: event.id,
    status: "sent",
    statementId: "statement-lrs-replay-event",
    attempts: 3,
    queuedAt: "2026-08-09T12:01:00.000Z"
  }]);
  assert.equal(sent, true);
  const durableSent = structuredClone(database.learning_events?.[0]?.lrs_delivery);
  assert.equal(durableSent?.status, "sent");

  const staleQueued = await store.recordLearningEventLrsDelivery("student-a", [{
    eventId: event.id,
    status: "queued",
    statementId: "stale-statement",
    attempts: 4,
    queuedAt: "2026-08-09T12:04:00.000Z",
    nextRetryAt: "2026-08-09T12:08:00.000Z",
    reason: "request-failed"
  }]);
  assert.equal(staleQueued, false);
  assert.deepEqual(
    database.learning_events?.[0]?.lrs_delivery,
    durableSent,
    "a stale delivery attempt must not regress a terminal sent record"
  );
});

test("nonfast persistence never rewrites an accepted event id", async () => {
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [],
    learning_event_clears: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createStore(database);
  const event = learningEvent("");

  const first = await store.appendLearningEvents("student-a", [event], 0);
  const replay = await store.appendLearningEvents("student-a", [event], 0);

  assert.deepEqual(first, {
    status: "ok",
    generation: 0,
    clearedAt: null,
    acknowledgedEventIds: [""],
    dispositions: [{ id: "", disposition: "inserted" }]
  });
  assert.deepEqual(replay, {
    status: "ok",
    generation: 0,
    clearedAt: null,
    acknowledgedEventIds: [""],
    dispositions: [{ id: "", disposition: "already-persisted" }]
  });
  assert.deepEqual(storedLearningEventIds(database), [""]);
});

test("nonfast learning-event append rejects non-exact id replay without partial writes", async () => {
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [],
    learning_event_clears: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createStore(database);
  const original = learningEvent("owned-id", {
    classId: "class-a",
    assignmentId: "assignment-a",
    competencyId: "competency-a"
  });
  const originalResult = await store.appendLearningEvents("student-a", [original], 0);
  requireGenerationResult(originalResult);
  assert.equal(originalResult.status, "ok");

  const exactReplay = await store.appendLearningEvents("student-a", [original], 0);
  assert.deepEqual(exactReplay, {
    status: "ok",
    generation: 0,
    clearedAt: null,
    acknowledgedEventIds: ["owned-id"],
    dispositions: [{ id: "owned-id", disposition: "already-persisted" }]
  });

  const sameOwnerConflict = await store.appendLearningEvents("student-a", [
    learningEvent("new-id"),
    { ...original, topicId: "changed-payload" }
  ], 0);
  assert.deepEqual(sameOwnerConflict, {
    status: "id-conflict",
    generation: 0,
    clearedAt: null,
    acknowledgedEventIds: [],
    dispositions: [
      { id: "new-id", disposition: "not-processed" },
      { id: "owned-id", disposition: "id-conflict" }
    ]
  });
  assert.equal(database.learning_events?.some((event) => event.id === "new-id"), false);

  const crossOwnerConflict = await store.appendLearningEvents("student-b", [original], 0);
  assert.deepEqual(crossOwnerConflict, {
    status: "id-conflict",
    generation: 0,
    clearedAt: null,
    acknowledgedEventIds: [],
    dispositions: [{ id: "owned-id", disposition: "id-conflict" }]
  });
  assert.deepEqual(database.learning_events?.map((event) => event.user_id), ["student-a"]);
});

test("nonfast exact ACK rejects a legacy duplicate id if any stored owner conflicts", async () => {
  const event = learningEvent("legacy-duplicate");
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [
      {
        id: event.id,
        user_id: "student-b",
        type: event.type,
        source: event.source,
        grade: event.grade,
        topic_id: event.topicId,
        duration_seconds: event.durationSeconds,
        created_at: event.timestamp
      },
      {
        id: event.id,
        user_id: "student-a",
        type: event.type,
        source: event.source,
        grade: event.grade,
        topic_id: event.topicId,
        duration_seconds: event.durationSeconds,
        created_at: event.timestamp
      }
    ],
    learning_event_clears: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createStore(database);

  const result = await store.appendLearningEvents("student-a", [event], 0);

  assert.deepEqual(result, {
    status: "id-conflict",
    generation: 0,
    clearedAt: null,
    acknowledgedEventIds: [],
    dispositions: [{ id: event.id, disposition: "id-conflict" }]
  });
});

test("nonfast clear increments a generation fence and rejects stale writers without using client time", async () => {
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [],
    learning_event_clears: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createStore(database);
  const beforeClear = learningEvent("before-clear");
  const beforeClearResult = await store.appendLearningEvents("student-a", [beforeClear], 0);
  requireGenerationResult(beforeClearResult);
  assert.equal(beforeClearResult.status, "ok");

  const cleared = await store.clearLearningEventsForUser("student-a");
  assert.deepEqual(cleared, { generation: 1, clearedAt: now.toISOString() });
  assert.deepEqual(database.learning_event_clears, [{
    user_id: "student-a",
    cleared_at: now.toISOString(),
    generation: 1
  }]);
  assert.deepEqual(database.learning_events, []);

  const stale = await store.appendLearningEvents("student-a", [learningEvent("stale")], 0);
  assert.deepEqual(stale, {
    status: "generation-mismatch",
    generation: 1,
    clearedAt: now.toISOString(),
    acknowledgedEventIds: [],
    dispositions: [{ id: "stale", disposition: "stale-generation" }]
  });
  assert.deepEqual(database.learning_events, []);

  const current = await store.appendLearningEvents("student-a", [learningEvent("current", {
    timestamp: "2000-01-01T00:00:00.000Z"
  })], 1);
  assert.deepEqual(current, {
    status: "ok",
    generation: 1,
    clearedAt: now.toISOString(),
    acknowledgedEventIds: ["current"],
    dispositions: [{ id: "current", disposition: "inserted" }]
  });
  assert.deepEqual(storedLearningEventIds(database), ["current"]);
});

test("nonfast legacy clear records migrate to generation one", async () => {
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [],
    learning_event_clears: [{
      user_id: "student-a",
      cleared_at: "2026-08-01T00:00:00.000Z"
    }],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createStore(database);

  const stale = await store.appendLearningEvents("student-a", [learningEvent("legacy-stale")], 0);
  requireGenerationResult(stale);
  assert.equal(stale.status, "generation-mismatch");
  assert.equal(stale.generation, 1);
  assert.equal(stale.clearedAt, "2026-08-01T00:00:00.000Z");
  assert.deepEqual(database.learning_events, []);

  const current = await store.appendLearningEvents("student-a", [learningEvent("legacy-current", {
    timestamp: "2000-01-01T00:00:00.000Z"
  })], 1);
  requireGenerationResult(current);
  assert.equal(current.status, "ok");
  assert.deepEqual(storedLearningEventIds(database), ["legacy-current"]);
});

test("nonfast mirror clear adopts an authoritative fast-store generation exactly", async () => {
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [
      {
        id: "legacy-row",
        user_id: "student-a",
        type: "page-view",
        source: "visualization-lab",
        grade: "S3",
        topic_id: "legacy-topic",
        created_at: "2026-08-09T11:00:00.000Z"
      }
    ],
    learning_event_clears: [{
      user_id: "student-a",
      cleared_at: "2026-08-01T00:00:00.000Z",
      generation: 9
    }],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createStore(database);

  const result = await store.clearLearningEventsForUser(
    "student-a",
    "2026-08-09T12:00:00.000Z",
    3
  );

  assert.deepEqual(result, {
    generation: 3,
    clearedAt: "2026-08-09T12:00:00.000Z"
  });
  assert.deepEqual(database.learning_event_clears, [{
    user_id: "student-a",
    cleared_at: "2026-08-09T12:00:00.000Z",
    generation: 3
  }]);
  assert.deepEqual(database.learning_events, []);
});

test("an out-of-order older fast clear receipt cannot regress a newer mirrored generation", async () => {
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [
      {
        id: "must-stay-cleared",
        user_id: "student-a",
        type: "page-view",
        source: "visualization-lab",
        grade: "S3",
        topic_id: "legacy-topic",
        created_at: "2026-08-09T11:00:00.000Z"
      }
    ],
    learning_event_clears: [{
      user_id: "student-a",
      cleared_at: "2026-08-09T12:00:01.000Z",
      generation: 2
    }],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createStore(database);

  const result = await store.clearLearningEventsForUser(
    "student-a",
    "2026-08-09T12:00:00.000Z",
    1
  );

  assert.deepEqual(result, {
    generation: 2,
    clearedAt: "2026-08-09T12:00:01.000Z"
  });
  assert.deepEqual(database.learning_event_clears, [{
    user_id: "student-a",
    cleared_at: "2026-08-09T12:00:01.000Z",
    generation: 2
  }]);
  assert.deepEqual(database.learning_events, []);
});

test("nonfast POST and DELETE serialize generation decisions in invocation order", async () => {
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [],
    learning_event_clears: [],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createSerializedStore(database);

  const appendBeforeClear = store.appendLearningEvents("student-a", [learningEvent("append-before-clear")], 0);
  const clearAfterAppend = store.clearLearningEventsForUser("student-a");
  const [appendResult, firstClearResult] = await Promise.all([appendBeforeClear, clearAfterAppend]);
  requireGenerationResult(appendResult);
  assert.equal(appendResult.status, "ok");
  assert.deepEqual(firstClearResult, { generation: 1, clearedAt: now.toISOString() });
  assert.deepEqual(database.learning_events, []);

  const clearBeforeAppend = store.clearLearningEventsForUser("student-a");
  const staleAppend = store.appendLearningEvents("student-a", [learningEvent("append-after-clear")], 1);
  const [secondClearResult, staleResult] = await Promise.all([clearBeforeAppend, staleAppend]);
  requireGenerationResult(staleResult);
  assert.deepEqual(secondClearResult, { generation: 2, clearedAt: now.toISOString() });
  assert.equal(staleResult.status, "generation-mismatch");
  assert.equal(staleResult.generation, 2);
  assert.deepEqual(database.learning_events, []);

  const currentAppend = await store.appendLearningEvents("student-a", [learningEvent("generation-two")], 2);
  requireGenerationResult(currentAppend);
  assert.equal(currentAppend.status, "ok");
  assert.deepEqual(storedLearningEventIds(database), ["generation-two"]);
});

test("nonfast generation receipts canonicalize legacy timestamps and fail closed on invalid clear dates", async () => {
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [
      {
        id: "must-survive-invalid-clear",
        user_id: "student-a",
        type: "page-view",
        source: "visualization-lab",
        grade: "S3",
        topic_id: "legacy-topic",
        created_at: "2026-08-09T11:00:00.000Z"
      }
    ],
    learning_event_clears: [{
      user_id: "student-a",
      cleared_at: "not-a-date",
      generation: 4
    }],
    visualization_events: [],
    visualization_sessions: []
  };
  const store = createStore(database);

  const mismatch = await store.appendLearningEvents(
    "student-a",
    [learningEvent("invalid-receipt-mismatch")],
    3
  );
  requireGenerationResult(mismatch);
  assert.deepEqual(mismatch, {
    status: "generation-mismatch",
    generation: 4,
    clearedAt: null,
    acknowledgedEventIds: [],
    dispositions: [{ id: "invalid-receipt-mismatch", disposition: "stale-generation" }]
  });

  await assert.rejects(
    () => store.clearLearningEventsForUser("student-a", "still-not-a-date"),
    /canonical ISO timestamp/
  );
  assert.deepEqual(storedLearningEventIds(database), ["must-survive-invalid-clear"]);
  assert.deepEqual(database.learning_event_clears, [{
    user_id: "student-a",
    cleared_at: "not-a-date",
    generation: 4
  }]);
});

test("fast analytics reads never resurrect a failed legacy clear mirror", async () => {
  const database: StudentActivityPersistenceDatabase = {
    learning_events: [
      {
        id: "stale-mirror-row",
        user_id: "student-a",
        type: "page-view",
        source: "visualization-lab",
        grade: "S3",
        topic_id: "stale-mirror-topic",
        created_at: "2026-08-09T11:00:00.000Z"
      }
    ],
    learning_event_clears: [],
    visualization_events: [],
    visualization_sessions: []
  };
  let legacyReads = 0;
  const store = createStudentActivityPersistenceStore({
    now: () => now,
    readDatabase: async () => {
      legacyReads += 1;
      return database;
    },
    readFastLearningAnalyticsEvents: async () => []
  });

  const summary = await store.getAnalyticsSummary("student-a", "7d", "S3");
  const exported = await store.getAnalyticsExport("student-a", "S3", "7d");

  assert.equal(summary.eventCount, 0);
  assert.equal(exported.summary.eventCount, 0);
  assert.equal(legacyReads, 0, "authoritative fast reads must not fall back to stale mirror rows");
});

test("fast analytics read failures fail closed instead of resurrecting the mirror", async () => {
  let legacyReads = 0;
  const store = createStudentActivityPersistenceStore({
    now: () => now,
    readDatabase: async () => {
      legacyReads += 1;
      return {
        learning_events: [],
        learning_event_clears: [],
        visualization_events: [],
        visualization_sessions: []
      };
    },
    readFastLearningAnalyticsEvents: async () => {
      throw new Error("authoritative-fast-read-failed");
    }
  });

  await assert.rejects(
    () => store.getAnalyticsSummary("student-a", "7d", "S3"),
    /authoritative-fast-read-failed/
  );
  assert.equal(legacyReads, 0);
});
