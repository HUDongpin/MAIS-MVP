import assert from "node:assert/strict";
import test from "node:test";
import {
  acknowledgeLearningAnalyticsOutbox,
  beginLearningAnalyticsClearFence,
  beginLearningAnalyticsGenerationHandshake,
  buildDailyLearningAnalyticsBuckets,
  clearLearningAnalyticsOutbox,
  clearLearningAnalyticsDurabilityFallbackBeforeBoundary,
  clearVisualizationCompletionTelemetryForUser,
  coalesceLearningAnalyticsEvents,
  confirmLearningAnalyticsGenerationHandshake,
  confirmUnconfirmedLearningAnalyticsOutbox,
  discardLearningAnalyticsOutboxBeforeGeneration,
  finishLearningAnalyticsLowerGenerationRecovery,
  getRollingLearningAnalyticsEvents,
  isHighFrequencyLearningAnalyticsEvent,
  isDurableLearningAnalyticsDeliveryResponse,
  isLearningAnalyticsClearAcknowledgement,
  isValidLearningAnalyticsEvent,
  learningAnalyticsClearFenceStorageKey,
  learningAnalyticsBoundaryLineageStorageKey,
  learningAnalyticsClientProtocolStatus,
  learningAnalyticsCorruptOutboxStorageKey,
  learningAnalyticsDeliveryGeneration,
  learningAnalyticsEventForDelivery,
  learningAnalyticsGenerationHandshakeStorageKey,
  learningAnalyticsGenerationTransitionStorageKey,
  learningAnalyticsGenerationStorageKey,
  learningAnalyticsOutboxStorageKey,
  learningAnalyticsOutboxRecordStorageKey,
  learningAnalyticsQuarantineStorageKey,
  isPreservedPhysicalLearningAnalyticsCommit,
  markLearningAnalyticsClearDeleteAttempted,
  mergeLearningAnalyticsOutbox,
  mergeOrderedLearningAnalyticsEvents,
  mergeUnconfirmedLearningAnalyticsOutbox,
  persistLearningAnalyticsEventsForCurrentProtocol,
  persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback,
  prepareLearningAnalyticsForwardGenerationTransition,
  prepareLearningAnalyticsLowerGenerationRecovery,
  preservePhysicalLearningAnalyticsCommit,
  readLearningAnalyticsClearFence,
  readLearningAnalyticsGeneration,
  readLearningAnalyticsGenerationHandshake,
  readLearningAnalyticsGenerationMismatchReceipt,
  readLearningAnalyticsGenerationTransition,
  readLearningAnalyticsOutbox,
  readUnconfirmedLearningAnalyticsOutbox,
  recoverLearningAnalyticsDurabilityFallback,
  recoverLearningAnalyticsVolatileEvent,
  replaceLearningAnalyticsGeneration,
  resolveLearningAnalyticsClearHandshake,
  resumeLearningAnalyticsGenerationTransition,
  selectLearningAnalyticsDeliveryBatch,
  storeLearningAnalyticsGeneration,
  summarizeLearningAnalytics,
  unconfirmedLearningAnalyticsOutboxStorageKey,
  unconfirmedLearningAnalyticsOutboxRecordStorageKey,
  visualizationCompletionTelemetryStorageKey,
  withLearningAnalyticsDeliveryGeneration
} from "./learningAnalytics";
import * as learningAnalyticsModule from "./learningAnalytics";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LearningAnalyticsEvent } from "@/types";

const now = "2026-05-07T12:00:00.000Z";

function event(overrides: Partial<LearningAnalyticsEvent>): LearningAnalyticsEvent {
  return {
    id: overrides.id ?? "event",
    type: overrides.type ?? "page-view",
    source: overrides.source ?? "dashboard",
    timestamp: overrides.timestamp ?? now,
    grade: overrides.grade ?? "S3",
    topicId: overrides.topicId ?? "dashboard",
    questionId: overrides.questionId,
    durationSeconds: overrides.durationSeconds
  };
}

test("summarizeLearningAnalytics calculates accuracy from answer events only", () => {
  const summary = summarizeLearningAnalytics([
    event({ id: "correct-1", type: "answer-correct", source: "practice", topicId: "quadratic-patterns", durationSeconds: 45 }),
    event({ id: "correct-2", type: "answer-correct", source: "practice", topicId: "quadratic-patterns", durationSeconds: 120 }),
    event({ id: "wrong-1", type: "answer-wrong", source: "practice", topicId: "quadratic-patterns", durationSeconds: 200 }),
    event({ id: "hint-1", type: "hint-request", source: "ai-tutor", topicId: "quadratic-patterns" })
  ], { now });

  assert.equal(summary.answerStats.total, 3);
  assert.equal(summary.answerStats.accuracy, 67);
  assert.equal(summary.counts.hintRequests, 1);
});

test("rolling analytics excludes events outside the selected window", () => {
  const events = [
    event({ id: "old", timestamp: "2026-04-28T12:00:00.000Z" }),
    event({ id: "recent", timestamp: "2026-05-06T12:00:00.000Z" })
  ];

  const rolling = getRollingLearningAnalyticsEvents(events, { now, windowDays: 7 });

  assert.deepEqual(rolling.map((item) => item.id), ["recent"]);
});

test("summarizeLearningAnalytics buckets answer durations", () => {
  const summary = summarizeLearningAnalytics([
    event({ id: "fast", type: "answer-correct", source: "practice", topicId: "coordinates", durationSeconds: 30 }),
    event({ id: "steady", type: "answer-correct", source: "practice", topicId: "coordinates", durationSeconds: 120 }),
    event({ id: "slow", type: "answer-wrong", source: "practice", topicId: "coordinates", durationSeconds: 240 })
  ], { now });

  assert.deepEqual(summary.duration.buckets, { fast: 1, steady: 1, slow: 1 });
  assert.equal(summary.duration.averageSeconds, 130);
});

test("summarizeLearningAnalytics handles an empty event log", () => {
  const summary = summarizeLearningAnalytics([], { now });

  assert.equal(summary.eventCount, 0);
  assert.equal(summary.answerStats.accuracy, null);
  assert.equal(summary.duration.averageSeconds, null);
  assert.equal(summary.engagementScore, null);
});

test("buildDailyLearningAnalyticsBuckets groups events by day", () => {
  const buckets = buildDailyLearningAnalyticsBuckets([
    event({ id: "answer", type: "answer-correct", source: "practice", timestamp: "2026-05-07T09:00:00.000Z", durationSeconds: 60 })
  ], { now, windowDays: 2 });

  assert.equal(buckets.length, 2);
  assert.equal(buckets[1].date, "2026-05-07");
  assert.equal(buckets[1].answers, 1);
  assert.equal(buckets[1].durationSeconds, 60);
});

test("high-frequency learning analytics only coalesces visualization slider drag and probe events", () => {
  assert.equal(isHighFrequencyLearningAnalyticsEvent({ type: "visualization-slider" }), true);
  assert.equal(isHighFrequencyLearningAnalyticsEvent({ type: "visualization-drag" }), true);
  assert.equal(isHighFrequencyLearningAnalyticsEvent({ type: "visualization-probe" }), true);
  assert.equal(isHighFrequencyLearningAnalyticsEvent({ type: "visualization-reset" }), false);
  assert.equal(isHighFrequencyLearningAnalyticsEvent({ type: "answer-correct" }), false);
});

test("coalesceLearningAnalyticsEvents keeps Practice answers while merging repeated visualization chatter", () => {
  const coalesced = coalesceLearningAnalyticsEvents([
    event({ id: "slider-first", type: "visualization-slider", source: "coordinate-plane", topicId: "slope" }),
    event({ id: "practice-answer", type: "answer-correct", source: "practice", topicId: "slope", questionId: "q1", durationSeconds: 18 }),
    event({ id: "slider-latest", type: "visualization-slider", source: "coordinate-plane", topicId: "slope" }),
    event({ id: "probe-only", type: "visualization-probe", source: "coordinate-plane", topicId: "slope" })
  ]);

  assert.deepEqual(coalesced.map((item) => item.id), ["slider-latest", "practice-answer", "probe-only"]);
});

test("opt-in physical visualization commits remain independent while default chatter still coalesces", () => {
  const defaultFirst = event({
    id: "default-first",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  });
  const physicalNoOp = preservePhysicalLearningAnalyticsCommit(event({
    id: "physical-no-op",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  }));
  const physicalChanged = preservePhysicalLearningAnalyticsCommit(event({
    id: "physical-changed",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  }));
  const defaultLatest = event({
    id: "default-latest",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  });

  const coalesced = coalesceLearningAnalyticsEvents([
    defaultFirst,
    physicalNoOp,
    physicalChanged,
    defaultLatest
  ]);

  assert.deepEqual(coalesced.map(({ id }) => id), [
    "default-latest",
    "physical-no-op",
    "physical-changed"
  ]);
  assert.equal(isPreservedPhysicalLearningAnalyticsCommit(coalesced[0]!), false);
  assert.equal(isPreservedPhysicalLearningAnalyticsCommit(coalesced[1]!), true);
  assert.equal(isPreservedPhysicalLearningAnalyticsCommit(coalesced[2]!), true);

  const publicDelivery = learningAnalyticsEventForDelivery(physicalNoOp);
  assert.equal(isPreservedPhysicalLearningAnalyticsCommit(publicDelivery), false);
  assert.deepEqual(Reflect.ownKeys(publicDelivery).sort(), [
    "durationSeconds",
    "grade",
    "id",
    "questionId",
    "source",
    "timestamp",
    "topicId",
    "type"
  ]);
  assert.doesNotMatch(
    JSON.stringify(publicDelivery),
    /mais\.learning-analytics|preserve-physical-commit/iu
  );
});

test("public settings projection contains no private Symbol keys", () => {
  const learningAnalyticsEventsForPublicProjection = (
    learningAnalyticsModule as typeof learningAnalyticsModule & {
      learningAnalyticsEventsForPublicProjection?: (
        events: readonly LearningAnalyticsEvent[]
      ) => LearningAnalyticsEvent[];
    }
  ).learningAnalyticsEventsForPublicProjection;
  assert.equal(typeof learningAnalyticsEventsForPublicProjection, "function");

  const physical = preservePhysicalLearningAnalyticsCommit(event({
    id: "private-marker-must-not-escape",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  }), 73);
  assert.equal(Reflect.ownKeys(physical).some((key) => typeof key === "symbol"), true);

  const projected = learningAnalyticsEventsForPublicProjection!([physical]);
  assert.notEqual(projected[0], physical);
  assert.equal(projected[0]?.id, physical.id);
  assert.deepEqual(
    projected.flatMap((projectedEvent) =>
      Reflect.ownKeys(projectedEvent).filter((key) => typeof key === "symbol")
    ),
    []
  );
});

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    }
  };
}

test("learning analytics outbox is user-scoped, ordered, and idempotent", () => {
  const storage = memoryStorage();
  const early = event({ id: "early", timestamp: "2026-05-07T09:00:00.000Z" });
  const late = event({ id: "late", timestamp: "2026-05-07T11:00:00.000Z" });

  mergeLearningAnalyticsOutbox(storage, "student-a", [late, early, late]);
  mergeLearningAnalyticsOutbox(storage, "student-b", [event({ id: "other-user" })]);

  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-a").map((item) => item.id), ["early", "late"]);
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-b").map((item) => item.id), ["other-user"]);
  assert.notEqual(learningAnalyticsOutboxStorageKey("student-a"), learningAnalyticsOutboxStorageKey("student-b"));
});

test("physical visualization commits survive durable readback and ACK independently", () => {
  const storage = memoryStorage();
  const userId = "physical-student";
  replaceLearningAnalyticsGeneration(storage, userId, 7);
  const defaultFirst = event({
    id: "default-first",
    timestamp: "2026-05-07T09:00:00.000Z",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  });
  const physicalNoOp = preservePhysicalLearningAnalyticsCommit(event({
    id: "physical-no-op",
    timestamp: "2026-05-07T09:00:01.000Z",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  }));
  const physicalChanged = preservePhysicalLearningAnalyticsCommit(event({
    id: "physical-changed",
    timestamp: "2026-05-07T09:00:02.000Z",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  }));
  const defaultLatest = event({
    id: "default-latest",
    timestamp: "2026-05-07T09:00:03.000Z",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  });

  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [defaultFirst, physicalNoOp, physicalChanged, defaultLatest],
      7
    ),
    "confirmed"
  );

  const restarted = readLearningAnalyticsOutbox(storage, userId, 7);
  assert.deepEqual(restarted.map(({ id }) => id), [
    "physical-no-op",
    "physical-changed",
    "default-latest"
  ]);
  assert.deepEqual(
    restarted.map(isPreservedPhysicalLearningAnalyticsCommit),
    [true, true, false]
  );
  assert.notEqual(
    learningAnalyticsOutboxRecordStorageKey(userId, physicalNoOp),
    learningAnalyticsOutboxRecordStorageKey(userId, defaultFirst)
  );
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(learningAnalyticsOutboxStorageKey(userId))) continue;
    const raw = storage.getItem(key);
    assert.ok(raw);
    assert.doesNotMatch(raw, /preserve-physical-commit|mais\.learning-analytics/iu);
  }

  const failedRetrySnapshot = acknowledgeLearningAnalyticsOutbox(
    storage,
    userId,
    new Set(["not-acknowledged"]),
    []
  );
  assert.deepEqual(
    failedRetrySnapshot.map(({ id }) => id),
    restarted.map(({ id }) => id)
  );

  const afterFirstAck = acknowledgeLearningAnalyticsOutbox(
    storage,
    userId,
    new Set([restarted[0]!.id]),
    [restarted[0]!]
  );
  assert.deepEqual(afterFirstAck.map(({ id }) => id), [
    "physical-changed",
    "default-latest"
  ]);
  assert.equal(
    isPreservedPhysicalLearningAnalyticsCommit(afterFirstAck[0]!),
    true
  );
});

test("physical commit creation gives colliding caller IDs unique public IDs across restart, retry, and ACK", () => {
  const createPhysicalLearningAnalyticsCommit = (
    learningAnalyticsModule as typeof learningAnalyticsModule & {
      createPhysicalLearningAnalyticsCommit?: (
        sourceEvent: LearningAnalyticsEvent,
        sequence: number,
        collisionToken: string
      ) => LearningAnalyticsEvent;
    }
  ).createPhysicalLearningAnalyticsCommit;
  assert.equal(typeof createPhysicalLearningAnalyticsCommit, "function");

  const storage = memoryStorage();
  const userId = "colliding-physical-student";
  replaceLearningAnalyticsGeneration(storage, userId, 9);
  const collidingCallerEvent = event({
    id: "same-caller-event-id",
    timestamp: "2026-05-07T09:00:00.000Z",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  });
  const first = createPhysicalLearningAnalyticsCommit!(
    collidingCallerEvent,
    41,
    "capture-a"
  );
  const second = createPhysicalLearningAnalyticsCommit!(
    collidingCallerEvent,
    42,
    "capture-b"
  );

  assert.notEqual(first.id, collidingCallerEvent.id);
  assert.notEqual(second.id, collidingCallerEvent.id);
  assert.notEqual(first.id, second.id);
  assert.equal(learningAnalyticsEventForDelivery(first).id, first.id);
  assert.equal(learningAnalyticsEventForDelivery(second).id, second.id);

  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [first],
      9
    ),
    "confirmed"
  );
  const inFlight = selectLearningAnalyticsDeliveryBatch(
    readLearningAnalyticsOutbox(storage, userId, 9),
    100
  );
  assert.deepEqual(inFlight.map(({ id }) => id), [first.id]);

  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [second],
      9
    ),
    "confirmed"
  );
  const restarted = readLearningAnalyticsOutbox(storage, userId, 9);
  assert.deepEqual(restarted.map(({ id }) => id), [first.id, second.id]);

  const afterFailedAttempt = acknowledgeLearningAnalyticsOutbox(
    storage,
    userId,
    new Set(["not-acknowledged"]),
    []
  );
  assert.deepEqual(afterFailedAttempt.map(({ id }) => id), [first.id, second.id]);

  const afterFirstAck = acknowledgeLearningAnalyticsOutbox(
    storage,
    userId,
    new Set([first.id]),
    inFlight
  );
  assert.deepEqual(afterFirstAck.map(({ id }) => id), [second.id]);

  const finalBatch = selectLearningAnalyticsDeliveryBatch(afterFirstAck, 100);
  assert.deepEqual(finalBatch.map(({ id }) => id), [second.id]);
  const afterSecondAck = acknowledgeLearningAnalyticsOutbox(
    storage,
    userId,
    new Set([second.id]),
    finalBatch
  );
  assert.deepEqual(afterSecondAck, []);
});

test("same-millisecond physical commits retain their capture order across restart", () => {
  const storage = memoryStorage();
  const userId = "ordered-physical-student";
  replaceLearningAnalyticsGeneration(storage, userId, 3);
  const first = preservePhysicalLearningAnalyticsCommit(event({
    id: "z-first-physical-id",
    timestamp: "2026-05-07T09:00:00.000Z",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  }), 41);
  const second = preservePhysicalLearningAnalyticsCommit(event({
    id: "a-second-physical-id",
    timestamp: "2026-05-07T09:00:00.000Z",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  }), 42);
  const defaultPeer = event({
    id: "m-default-peer",
    timestamp: "2026-05-07T09:00:00.000Z",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "another-default-topic"
  });

  persistLearningAnalyticsEventsForCurrentProtocol(
    storage,
    userId,
    [first, defaultPeer, second],
    3
  );

  const restarted = readLearningAnalyticsOutbox(storage, userId, 3);
  assert.deepEqual(
    restarted.map(({ id }) => id),
    ["m-default-peer", "z-first-physical-id", "a-second-physical-id"]
  );
  assert.match(
    learningAnalyticsOutboxRecordStorageKey(userId, restarted[1]!),
    /\/physical-commit\/41\/generation\/3$/u
  );
  assert.match(
    learningAnalyticsOutboxRecordStorageKey(userId, restarted[2]!),
    /\/physical-commit\/42\/generation\/3$/u
  );
});

test("delivery batching isolates each preserved physical commit without changing default batches", () => {
  const defaultOne = event({ id: "default-one" });
  const defaultTwo = event({ id: "default-two", type: "answer-correct" });
  const physicalOne = preservePhysicalLearningAnalyticsCommit(event({
    id: "physical-one",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  }));
  const physicalTwo = preservePhysicalLearningAnalyticsCommit(event({
    id: "physical-two",
    type: "visualization-slider",
    source: "visualization-lab",
    topicId: "decimal-arithmetic"
  }));

  assert.deepEqual(
    selectLearningAnalyticsDeliveryBatch([defaultOne, defaultTwo], 100).map(
      ({ id }) => id
    ),
    ["default-one", "default-two"]
  );
  assert.deepEqual(
    selectLearningAnalyticsDeliveryBatch(
      [defaultOne, defaultTwo, physicalOne, physicalTwo],
      100
    ).map(({ id }) => id),
    ["default-one", "default-two"]
  );
  assert.deepEqual(
    selectLearningAnalyticsDeliveryBatch([physicalOne, physicalTwo], 100).map(
      ({ id }) => id
    ),
    ["physical-one"]
  );
  assert.deepEqual(
    selectLearningAnalyticsDeliveryBatch([physicalTwo], 100).map(
      ({ id }) => id
    ),
    ["physical-two"]
  );
});

test("AppProviders exposes an explicit physical-commit path and isolates its network requests", async () => {
  const source = await readFile(
    path.join(process.cwd(), "components/providers/AppProviders.tsx"),
    "utf8"
  );

  assert.match(
    source,
    /export type LearningAnalyticsRecordOptions = \{[\s\S]*?preservePhysicalCommit\?: boolean;[\s\S]*?\};/u
  );
  assert.match(
    source,
    /const analyticsPhysicalCommitSequenceRef = useRef\(0\);/u
  );
  assert.match(
    source,
    /createPhysicalLearningAnalyticsCommit\([\s\S]*?analyticsPhysicalCommitSequenceRef\.current\+\+[\s\S]*?globalThis\.crypto\.randomUUID\(\)[\s\S]*?\)/u
  );
  assert.match(
    source,
    /isPreservedPhysicalLearningAnalyticsCommit\(analyticsEvent\)[\s\S]*?appendLearningEventsToQueues\(\[analyticsEvent\], recordingIdentity\)[\s\S]*?analyticsImmediateDeliveryRequestedRef\.current[\s\S]*?setAnalyticsDeliveryCycle/u
  );
  assert.match(
    source,
    /selectLearningAnalyticsDeliveryBatch\([\s\S]*?filter\([\s\S]*?learningAnalyticsDeliveryGeneration\(event\)[\s\S]*?flushServerGeneration[\s\S]*?\),\s*100\s*\)/u
  );
  assert.match(
    source,
    /events: events\.map\(learningAnalyticsEventForDelivery\)/u
  );
  assert.match(
    source,
    /const publicLearningAnalyticsEvents = useMemo\([\s\S]*?learningAnalyticsEventsForPublicProjection\(learningAnalyticsEvents\)[\s\S]*?\[learningAnalyticsEvents\][\s\S]*?\);/u
  );
  assert.match(
    source,
    /learningAnalyticsEvents: publicLearningAnalyticsEvents/u
  );
});

test("client event validation rejects IDs that the exact backend contract cannot persist", () => {
  assert.equal(isValidLearningAnalyticsEvent(event({ id: "valid-event" })), true);
  assert.equal(isValidLearningAnalyticsEvent(event({ id: "" })), false);
  assert.equal(isValidLearningAnalyticsEvent(event({ id: "   " })), false);
  assert.equal(isValidLearningAnalyticsEvent(event({ durationSeconds: 1.5 })), false);
  assert.equal(isValidLearningAnalyticsEvent(event({ durationSeconds: 1 })), true);
  assert.equal(
    isValidLearningAnalyticsEvent(event({ timestamp: "2026-05-07T12:00:00Z" })),
    false
  );
  assert.equal(
    isValidLearningAnalyticsEvent(event({ timestamp: "2026-05-07T12:00:00.000Z" })),
    true
  );
  assert.equal(isValidLearningAnalyticsEvent(event({ timestamp: "not-a-date" })), false);
});

test("learning analytics outbox survives failure and clears only acknowledged ids", () => {
  const storage = memoryStorage();
  const first = event({ id: "first", timestamp: "2026-05-07T09:00:00.000Z" });
  const second = event({ id: "second", timestamp: "2026-05-07T10:00:00.000Z" });

  mergeLearningAnalyticsOutbox(storage, "student-a", [first, second]);
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-a").map((item) => item.id), ["first", "second"]);

  // A failed request performs no acknowledgement. Rehydrating and merging the
  // same batch after a remount must preserve order without duplicating ids.
  mergeLearningAnalyticsOutbox(storage, "student-a", readLearningAnalyticsOutbox(storage, "student-a"));
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-a").map((item) => item.id), ["first", "second"]);

  acknowledgeLearningAnalyticsOutbox(storage, "student-a", new Set(["first"]));
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-a").map((item) => item.id), ["second"]);
  acknowledgeLearningAnalyticsOutbox(storage, "student-a", new Set(["second"]));
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-a"), []);
  assert.equal(storage.getItem(learningAnalyticsOutboxStorageKey("student-a", "second")), null);
});

test("acknowledgement reports a physical key that storage failed to remove", () => {
  const storage = memoryStorage();
  const retained = event({ id: "retained-after-ack" });
  mergeLearningAnalyticsOutbox(storage, "student-a", [retained]);
  const removeFailureStorage = {
    get length() {
      return storage.length;
    },
    getItem: storage.getItem,
    key: storage.key,
    removeItem() {
      // Model a storage implementation that silently fails to remove a key.
    },
    setItem: storage.setItem
  };

  const remaining = acknowledgeLearningAnalyticsOutbox(
    removeFailureStorage,
    "student-a",
    new Set([retained.id]),
    [retained]
  );
  assert.deepEqual(remaining.map(({ id }) => id), [retained.id]);
});

test("learning analytics outbox isolates corrupt records and preserves more than the UI history cap", () => {
  const storage = memoryStorage();
  const events = Array.from({ length: 620 }, (_, index) => event({
    id: `answer-${String(index).padStart(3, "0")}`,
    timestamp: new Date(Date.parse(now) + index * 1000).toISOString(),
    type: index % 2 === 0 ? "answer-correct" : "answer-wrong"
  }));
  mergeLearningAnalyticsOutbox(storage, "student-a", events);
  const corruptConfirmedKey = `${learningAnalyticsOutboxStorageKey("student-a")}corrupt`;
  const corruptUnconfirmedKey = `${unconfirmedLearningAnalyticsOutboxStorageKey("student-a")}corrupt`;
  storage.setItem(corruptConfirmedKey, "{not-json");
  storage.setItem(corruptUnconfirmedKey, JSON.stringify({ id: "invalid-event-only" }));

  const restored = readLearningAnalyticsOutbox(storage, "student-a");
  readUnconfirmedLearningAnalyticsOutbox(storage, "student-a");
  assert.equal(restored.length, 620);
  assert.equal(restored[0].id, "answer-000");
  assert.equal(restored.at(-1)?.id, "answer-619");
  assert.equal(storage.getItem(corruptConfirmedKey), "{not-json");
  assert.notEqual(storage.getItem(corruptUnconfirmedKey), null);
  assert.notEqual(
    storage.getItem(learningAnalyticsCorruptOutboxStorageKey("student-a", "confirmed", corruptConfirmedKey)),
    null
  );
  assert.notEqual(
    storage.getItem(learningAnalyticsCorruptOutboxStorageKey("student-a", "unconfirmed", corruptUnconfirmedKey)),
    null
  );
  assert.equal(
    storage.getItem(learningAnalyticsCorruptOutboxStorageKey("student-b", "confirmed", corruptConfirmedKey)),
    null
  );
});

test("corrupt-record quarantine cannot delete a peer repair written during quarantine", () => {
  const backing = memoryStorage();
  const userId = "student-corrupt-repair-race";
  const repaired = event({ id: "repaired-event" });
  const recordKey = learningAnalyticsOutboxRecordStorageKey(userId, repaired);
  const quarantineKey = learningAnalyticsCorruptOutboxStorageKey(
    userId,
    "confirmed",
    recordKey
  );
  backing.setItem(recordKey, "{not-json");
  let repairedDuringQuarantine = false;
  const storage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      if (key === quarantineKey && !repairedDuringQuarantine) {
        repairedDuringQuarantine = true;
        backing.setItem(recordKey, JSON.stringify(repaired));
      }
      backing.setItem(key, value);
    }
  };

  assert.deepEqual(readLearningAnalyticsOutbox(storage, userId), []);
  assert.equal(repairedDuringQuarantine, true);
  assert.equal(backing.getItem(recordKey), JSON.stringify(repaired));
  assert.deepEqual(
    readLearningAnalyticsOutbox(backing, userId).map(({ id, timestamp, topicId, type }) => ({
      id,
      timestamp,
      topicId,
      type
    })),
    [{
      id: repaired.id,
      timestamp: repaired.timestamp,
      topicId: repaired.topicId,
      type: repaired.type
    }]
  );
});

test("event-key acknowledgement cannot remove a concurrently appended peer", () => {
  const storage = memoryStorage();
  const first = event({ id: "first" });
  const concurrent = event({ id: "concurrent", timestamp: "2026-05-07T12:00:01.000Z" });
  mergeLearningAnalyticsOutbox(storage, "student-a", [first]);

  // Model another same-user tab appending after the first tab captured its
  // request batch but before that first request receives its ACK.
  mergeLearningAnalyticsOutbox(storage, "student-a", [concurrent]);
  acknowledgeLearningAnalyticsOutbox(storage, "student-a", new Set([first.id]));

  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-a").map((item) => item.id), ["concurrent"]);
});

test("clearing one user outbox removes every local generation without touching peers", () => {
  const storage = memoryStorage();
  mergeLearningAnalyticsOutbox(storage, "student-a", [event({ id: "a" })]);
  mergeUnconfirmedLearningAnalyticsOutbox(storage, "student-a", [
    event({ id: "a-awaiting-generation" })
  ]);
  mergeLearningAnalyticsOutbox(storage, "student-b", [event({ id: "b" })]);
  mergeUnconfirmedLearningAnalyticsOutbox(storage, "student-b", [
    event({ id: "b-awaiting-generation" })
  ]);
  storage.setItem(
    learningAnalyticsQuarantineStorageKey("student-a", "a-quarantined"),
    JSON.stringify({ raw: "a" })
  );
  storage.setItem(
    learningAnalyticsCorruptOutboxStorageKey("student-a", "confirmed", "a-corrupt"),
    JSON.stringify({ raw: "a" })
  );
  storage.setItem(
    learningAnalyticsQuarantineStorageKey("student-b", "b-quarantined"),
    JSON.stringify({ raw: "b" })
  );
  clearLearningAnalyticsOutbox(storage, "student-a");
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-a"), []);
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(storage, "student-a"), []);
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-b").map((item) => item.id), ["b"]);
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(storage, "student-b").map((item) => item.id),
    ["b-awaiting-generation"]
  );
  assert.equal(storage.getItem(learningAnalyticsQuarantineStorageKey("student-a", "a-quarantined")), null);
  assert.equal(
    storage.getItem(learningAnalyticsCorruptOutboxStorageKey("student-a", "confirmed", "a-corrupt")),
    null
  );
  assert.notEqual(storage.getItem(learningAnalyticsQuarantineStorageKey("student-b", "b-quarantined")), null);
});

test("unconfirmed events survive restart and become exact-generation durable rows before removal", () => {
  const storage = memoryStorage();
  const pending = event({ id: "fresh-device-event", topicId: "after-remote-clear" });

  mergeUnconfirmedLearningAnalyticsOutbox(storage, "student/A+B", [pending]);
  mergeUnconfirmedLearningAnalyticsOutbox(storage, "student/A+B", [
    event({ id: pending.id, topicId: "conflicting-rewrite" })
  ]);
  assert.equal(
    readUnconfirmedLearningAnalyticsOutbox(storage, "student/A+B")[0]?.topicId,
    "after-remote-clear"
  );
  assert.notEqual(
    unconfirmedLearningAnalyticsOutboxStorageKey("student/A+B"),
    unconfirmedLearningAnalyticsOutboxStorageKey("student/A B")
  );

  const confirmed = confirmUnconfirmedLearningAnalyticsOutbox(
    storage,
    "student/A+B",
    4
  );
  assert.deepEqual(confirmed.map((item) => item.id), [pending.id]);
  assert.equal(learningAnalyticsDeliveryGeneration(confirmed[0]), 4);
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(storage, "student/A+B"), []);
  assert.deepEqual(
    readLearningAnalyticsOutbox(storage, "student/A+B", 4).map((item) => item.id),
    [pending.id]
  );
});

test("unconfirmed high-frequency replacement removes the obsolete per-event key", () => {
  const storage = memoryStorage();
  const first = event({
    id: "pending-slider-first",
    type: "visualization-slider",
    source: "coordinate-plane",
    topicId: "slope",
    timestamp: "2026-05-07T12:00:00.000Z"
  });
  const latest = event({
    ...first,
    id: "pending-slider-latest",
    timestamp: "2026-05-07T12:00:01.000Z"
  });

  mergeUnconfirmedLearningAnalyticsOutbox(storage, "student-a", [first]);
  mergeUnconfirmedLearningAnalyticsOutbox(storage, "student-a", [latest]);

  assert.equal(
    storage.getItem(unconfirmedLearningAnalyticsOutboxStorageKey("student-a", first.id)),
    null
  );
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(storage, "student-a").map((item) => item.id),
    [latest.id]
  );
});

test("high-frequency replacement writes the survivor before deleting the obsolete durable key", () => {
  const userId = "student-write-before-delete";
  const first = event({
    id: "slider-first",
    type: "visualization-slider",
    source: "coordinate-plane",
    topicId: "slope",
    timestamp: "2026-05-07T12:00:00.000Z"
  });
  const latest = event({
    ...first,
    id: "slider-latest",
    timestamp: "2026-05-07T12:00:01.000Z"
  });

  for (const confirmed of [false, true]) {
    const storage = memoryStorage();
    const merge = confirmed ? mergeLearningAnalyticsOutbox : mergeUnconfirmedLearningAnalyticsOutbox;
    const keyFor = confirmed ? learningAnalyticsOutboxStorageKey : unconfirmedLearningAnalyticsOutboxStorageKey;
    merge(storage, userId, [first]);
    const firstKey = keyFor(userId, first.id);
    const latestKey = keyFor(userId, latest.id);
    const faultingStorage = {
      get length() {
        return storage.length;
      },
      getItem(key: string) {
        return storage.getItem(key);
      },
      key(index: number) {
        return storage.key(index);
      },
      removeItem(key: string) {
        storage.removeItem(key);
      },
      setItem(key: string, value: string) {
        if (key === latestKey) throw new Error("simulated quota failure");
        storage.setItem(key, value);
      }
    };

    assert.throws(
      () => merge(faultingStorage, userId, [latest]),
      /simulated quota failure/
    );
    assert.notEqual(
      storage.getItem(firstKey),
      null,
      `${confirmed ? "confirmed" : "unconfirmed"} replacement must retain the old durable sample when the new write fails.`
    );
  }
});

test("a sequentially visible durable event id keeps its first stored payload", () => {
  const storage = memoryStorage();
  const original = event({ id: "fixed", topicId: "original" });
  const conflict = event({ id: "fixed", topicId: "conflict" });
  mergeLearningAnalyticsOutbox(storage, "student-a", [original]);
  mergeLearningAnalyticsOutbox(storage, "student-a", [conflict]);
  assert.equal(readLearningAnalyticsOutbox(storage, "student-a")[0]?.topicId, "original");
  assert.equal(mergeOrderedLearningAnalyticsEvents([original], [conflict])[0]?.topicId, "original");
});

test("cross-tab localStorage conflict semantics are explicitly best-effort rather than CAS", () => {
  const concurrencyGuarantee = (learningAnalyticsModule as unknown as {
    learningAnalyticsLocalStorageConcurrencyGuarantee?: string;
  }).learningAnalyticsLocalStorageConcurrencyGuarantee;

  assert.equal(
    concurrencyGuarantee,
    "independent-event-keys-with-server-idempotency-no-cross-tab-cas"
  );
});

test("acknowledging the newest sent high-frequency sample suppresses older physical peers only", () => {
  const storage = memoryStorage();
  const userId = "student-hf-ack";
  const oldSample = withLearningAnalyticsDeliveryGeneration(event({
    id: "slider-old-physical",
    type: "visualization-slider",
    source: "coordinate-plane",
    topicId: "slope",
    timestamp: "2026-05-07T12:00:00.000Z"
  }), 2);
  const sentSample = withLearningAnalyticsDeliveryGeneration(event({
    ...oldSample,
    id: "slider-sent",
    timestamp: "2026-05-07T12:00:01.000Z"
  }), 2);
  const newerAfterRequest = withLearningAnalyticsDeliveryGeneration(event({
    ...oldSample,
    id: "slider-newer-after-request",
    timestamp: "2026-05-07T12:00:02.000Z"
  }), 2);

  // Model two physical same-semantic rows left by independent tabs. The
  // request snapshot contains `sentSample`; the third row arrives afterwards.
  [oldSample, sentSample, newerAfterRequest].forEach((sample) => {
    storage.setItem(
      learningAnalyticsOutboxRecordStorageKey(userId, sample),
      JSON.stringify(sample)
    );
  });

  acknowledgeLearningAnalyticsOutbox(
    storage,
    userId,
    new Set([sentSample.id]),
    [sentSample]
  );

  assert.equal(
    storage.getItem(learningAnalyticsOutboxRecordStorageKey(userId, oldSample)),
    null,
    "An obsolete same-semantic physical key must not reappear after ACK."
  );
  assert.equal(
    storage.getItem(learningAnalyticsOutboxRecordStorageKey(userId, sentSample)),
    null
  );
  assert.notEqual(
    storage.getItem(learningAnalyticsOutboxRecordStorageKey(userId, newerAfterRequest)),
    null,
    "A genuinely newer sample created after the request snapshot must survive."
  );
});

test("learning-event request ACK requires an explicit durable 200 response", () => {
  const expectedIds = new Set(["first", "replayed"]);
  const validResponse = {
    accepted: 1,
    acknowledgedEventIds: ["first", "replayed"],
    acknowledgedUserId: "student-a",
    dispositions: [
      { id: "first", disposition: "inserted" },
      { id: "replayed", disposition: "already-persisted" }
    ],
    durablyPersisted: true,
    generation: 3
  };
  assert.equal(
    isDurableLearningAnalyticsDeliveryResponse(
      200,
      validResponse,
      "student-a",
      3,
      expectedIds
    ),
    true
  );
  assert.equal(
    isDurableLearningAnalyticsDeliveryResponse(202, { accepted: 0, ignored: true }, "student-a", 3, expectedIds),
    false
  );
  assert.equal(
    isDurableLearningAnalyticsDeliveryResponse(200, null, "student-a", 3, expectedIds),
    false,
    "Invalid or unreadable JSON must never acknowledge an outbox batch."
  );
  assert.equal(
    isDurableLearningAnalyticsDeliveryResponse(
      409,
      {
        accepted: 0,
        acknowledgedEventIds: [],
        acknowledgedUserId: "student-a",
        clearedAt: "2026-05-07T12:00:00.000Z",
        currentGeneration: 4,
        dispositions: [
          { id: "first", disposition: "stale-generation" },
          { id: "replayed", disposition: "stale-generation" }
        ],
        durablyPersisted: false,
        reason: "generation-mismatch"
      },
      "student-a",
      3,
      expectedIds
    ),
    false,
    "A generation-mismatch receipt selects recovery; it cannot ACK the sent batch."
  );
  assert.equal(
    isDurableLearningAnalyticsDeliveryResponse(
      200,
      { ...validResponse, acknowledgedEventIds: ["first"] },
      "student-a",
      3,
      expectedIds
    ),
    false
  );
  assert.equal(
    isDurableLearningAnalyticsDeliveryResponse(
      200,
      { ...validResponse, acknowledgedUserId: "student-b" },
      "student-a",
      3,
      expectedIds
    ),
    false
  );
  assert.equal(
    isDurableLearningAnalyticsDeliveryResponse(200, { ...validResponse, generation: 2 }, "student-a", 3, expectedIds),
    false
  );
  assert.equal(
    isDurableLearningAnalyticsDeliveryResponse(
      200,
      { ...validResponse, accepted: 0 },
      "student-a",
      3,
      expectedIds
    ),
    false
  );
  assert.equal(
    isDurableLearningAnalyticsDeliveryResponse(
      200,
      {
        ...validResponse,
        dispositions: [
          { id: "first", disposition: "inserted" },
          { id: "replayed", disposition: "id-conflict" }
        ]
      },
      "student-a",
      3,
      expectedIds
    ),
    false
  );
});

test("malformed null dispositions fail closed without throwing", () => {
  const expectedIds = new Set(["event-a"]);
  assert.doesNotThrow(() => {
    assert.equal(
      isDurableLearningAnalyticsDeliveryResponse(
        200,
        {
          accepted: 0,
          acknowledgedEventIds: ["event-a"],
          acknowledgedUserId: "student-a",
          dispositions: [null],
          durablyPersisted: true,
          generation: 2
        },
        "student-a",
        2,
        expectedIds
      ),
      false
    );
  });
  assert.doesNotThrow(() => {
    assert.equal(
      readLearningAnalyticsGenerationMismatchReceipt(
        409,
        {
          accepted: 0,
          acknowledgedEventIds: [],
          acknowledgedUserId: "student-a",
          clearedAt: "2026-05-07T12:00:00.000Z",
          currentGeneration: 3,
          dispositions: [null],
          durablyPersisted: false,
          reason: "generation-mismatch"
        },
        "student-a",
        2,
        expectedIds
      ),
      null
    );
  });
});

test("valid payloads stored under non-canonical event keys are quarantined and cannot be acknowledged", () => {
  const storage = memoryStorage();
  const userId = "student-key-mismatch";
  const confirmedEvent = withLearningAnalyticsDeliveryGeneration(
    event({ id: "canonical-confirmed" }),
    4
  );
  const unconfirmedEvent = event({ id: "canonical-unconfirmed" });
  const wrongConfirmedKey = learningAnalyticsOutboxStorageKey(userId, "wrong-confirmed-key");
  const wrongUnconfirmedKey = unconfirmedLearningAnalyticsOutboxStorageKey(userId, "wrong-unconfirmed-key");
  storage.setItem(wrongConfirmedKey, JSON.stringify(confirmedEvent));
  storage.setItem(wrongUnconfirmedKey, JSON.stringify(unconfirmedEvent));

  assert.deepEqual(readLearningAnalyticsOutbox(storage, userId), []);
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(storage, userId), []);
  acknowledgeLearningAnalyticsOutbox(storage, userId, new Set([
    confirmedEvent.id,
    unconfirmedEvent.id
  ]));

  assert.notEqual(storage.getItem(wrongConfirmedKey), null);
  assert.notEqual(storage.getItem(wrongUnconfirmedKey), null);
  assert.notEqual(
    storage.getItem(learningAnalyticsCorruptOutboxStorageKey(
      userId,
      "confirmed",
      wrongConfirmedKey
    )),
    null
  );
  assert.notEqual(
    storage.getItem(learningAnalyticsCorruptOutboxStorageKey(
      userId,
      "unconfirmed",
      wrongUnconfirmedKey
    )),
    null
  );
  assert.equal(
    storage.getItem(learningAnalyticsOutboxStorageKey(userId, confirmedEvent.id)),
    null
  );
});

test("generation metadata is exact-user scoped, stripped from delivery, and stale rows are clearable", () => {
  const storage = memoryStorage();
  assert.notEqual(
    learningAnalyticsGenerationStorageKey("A+B"),
    learningAnalyticsGenerationStorageKey("A B")
  );
  assert.equal(readLearningAnalyticsGeneration(storage, "student-a"), 0);
  assert.equal(storeLearningAnalyticsGeneration(storage, "student-a", 2), 2);
  assert.equal(storeLearningAnalyticsGeneration(storage, "student-a", 1), 2);

  const oldEvent = withLearningAnalyticsDeliveryGeneration(event({ id: "old" }), 1);
  const currentEvent = withLearningAnalyticsDeliveryGeneration(event({ id: "current" }), 2);
  mergeLearningAnalyticsOutbox(storage, "student-a", [oldEvent, currentEvent]);
  assert.equal(learningAnalyticsDeliveryGeneration(oldEvent), 1);
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-a", 2).map((item) => item.id), ["current"]);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      learningAnalyticsEventForDelivery(currentEvent),
      "__maisLearningAnalyticsGeneration"
    ),
    false
  );

  assert.deepEqual([...discardLearningAnalyticsOutboxBeforeGeneration(storage, "student-a", 2)], ["old"]);
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-a").map((item) => item.id), ["current"]);
});

test("clear and generation-mismatch receipts are strict, exact-user, and canonical", () => {
  const clearReceipt = {
    acknowledgedUserId: "student/A+B",
    clearedAt: "2026-05-07T12:00:00.000Z",
    durablyPersisted: true,
    generation: 4,
    ok: true
  };
  assert.equal(
    isLearningAnalyticsClearAcknowledgement(200, clearReceipt, "student/A+B", 3),
    true
  );
  assert.equal(
    isLearningAnalyticsClearAcknowledgement(200, null, "student/A+B", 3),
    false
  );
  assert.equal(
    isLearningAnalyticsClearAcknowledgement(202, clearReceipt, "student/A+B", 3),
    false
  );
  assert.equal(
    isLearningAnalyticsClearAcknowledgement(200, { ...clearReceipt, clearedAt: null }, "student/A+B", 3),
    false
  );
  assert.equal(
    isLearningAnalyticsClearAcknowledgement(200, { ...clearReceipt, clearedAt: "2026-05-07T12:00:00Z" }, "student/A+B", 3),
    false
  );
  assert.equal(
    isLearningAnalyticsClearAcknowledgement(200, { ...clearReceipt, acknowledgedUserId: "student/A B" }, "student/A+B", 3),
    false
  );
  assert.equal(
    isLearningAnalyticsClearAcknowledgement(200, { ...clearReceipt, generation: 3 }, "student/A+B", 3),
    false
  );

  const forward = readLearningAnalyticsGenerationMismatchReceipt(
    409,
    {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: "student/A+B",
      clearedAt: "2026-05-07T12:00:01.000Z",
      currentGeneration: 4,
      dispositions: [],
      durablyPersisted: false,
      reason: "generation-mismatch"
    },
    "student/A+B",
    3,
    new Set()
  );
  assert.deepEqual(forward, {
    clearedAt: "2026-05-07T12:00:01.000Z",
    currentGeneration: 4,
    direction: "forward"
  });

  const lower = readLearningAnalyticsGenerationMismatchReceipt(
    409,
    {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: "student/A+B",
      clearedAt: null,
      currentGeneration: 1,
      dispositions: [],
      durablyPersisted: false,
      reason: "generation-mismatch"
    },
    "student/A+B",
    3,
    new Set()
  );
  assert.deepEqual(lower, {
    clearedAt: null,
    currentGeneration: 1,
    direction: "authoritative-lower"
  });
  assert.equal(
    readLearningAnalyticsGenerationMismatchReceipt(
      409,
      { ...forward, acknowledgedUserId: "student/A+B" },
      "student/A+B",
      3,
      new Set()
    ),
    null,
    "A parsed receipt object must not be accepted as the wire response."
  );
  assert.equal(
    readLearningAnalyticsGenerationMismatchReceipt(
      409,
      {
        accepted: 0,
        acknowledgedEventIds: ["unexpected"],
        acknowledgedUserId: "student/A+B",
        clearedAt: "2026-05-07T12:00:01.000Z",
        currentGeneration: 4,
        dispositions: [],
        durablyPersisted: false,
        reason: "generation-mismatch"
      },
      "student/A+B",
      3,
      new Set()
    ),
    null
  );
});

test("a durable exact-user clear fence blocks every writer and survives a lost DELETE ACK", () => {
  const storage = memoryStorage();
  replaceLearningAnalyticsGeneration(storage, "A+B", 2);
  const fence = beginLearningAnalyticsClearFence(
    storage,
    "A+B",
    2,
    "2026-05-07T12:00:00.000Z",
    "clear-request-1"
  );
  markLearningAnalyticsClearDeleteAttempted(
    storage,
    "A+B",
    fence.requestId,
    "2026-05-07T12:00:00.100Z"
  );

  assert.notEqual(
    learningAnalyticsClearFenceStorageKey("A+B"),
    learningAnalyticsClearFenceStorageKey("A B")
  );
  assert.deepEqual(readLearningAnalyticsClearFence(storage, "A+B").status, "valid");
  assert.equal(learningAnalyticsClientProtocolStatus(storage, "A+B"), "fenced");

  const peerEvent = event({ id: "peer-post-request", timestamp: "2026-05-07T12:00:01.000Z" });
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(storage, "A+B", [peerEvent], 2),
    "unconfirmed"
  );
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "A+B"), []);
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(storage, "A+B").map((item) => item.id),
    [peerEvent.id]
  );

  const restartedFence = readLearningAnalyticsClearFence(storage, "A+B");
  assert.equal(restartedFence.status, "valid");
  if (restartedFence.status !== "valid") throw new Error("Expected a valid restart fence.");
  assert.equal(restartedFence.value.deleteAttemptedAt, "2026-05-07T12:00:00.100Z");
  assert.equal(
    resolveLearningAnalyticsClearHandshake(restartedFence.value, 2, null),
    "retry-delete"
  );
  assert.equal(
    resolveLearningAnalyticsClearHandshake(
      restartedFence.value,
      3,
      "2026-05-07T12:00:00.200Z"
    ),
    "complete-forward"
  );
  assert.equal(
    resolveLearningAnalyticsClearHandshake(restartedFence.value, 3, null),
    "fail-closed"
  );
});

test("the authoritative-generation handshake is itself a durable writer gate", () => {
  const storage = memoryStorage();
  const userId = "student-handshake-gate";
  replaceLearningAnalyticsGeneration(storage, userId, 4);
  beginLearningAnalyticsGenerationHandshake(
    storage,
    userId,
    4,
    "2026-05-07T12:00:00.000Z",
    "handshake-gate"
  );

  assert.equal(learningAnalyticsClientProtocolStatus(storage, userId), "handshaking");
  const duringHandshake = event({ id: "during-handshake" });
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [duringHandshake],
      4
    ),
    "unconfirmed"
  );
  assert.deepEqual(readLearningAnalyticsOutbox(storage, userId), []);
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(storage, userId).map(({ id }) => id),
    [duringHandshake.id]
  );
});

test("a stale empty handshake cannot confirm a post-clear event into the old generation", () => {
  const storage = memoryStorage();
  const userId = "student-handshake-clear-race";
  replaceLearningAnalyticsGeneration(storage, userId, 1);
  const handshake = beginLearningAnalyticsGenerationHandshake(
    storage,
    userId,
    1,
    "2026-05-07T12:00:00.000Z",
    "handshake-before-peer-clear"
  );

  beginLearningAnalyticsClearFence(
    storage,
    userId,
    1,
    "2026-05-07T12:00:01.000Z",
    "peer-clear-fence"
  );
  const postClear = event({
    id: "post-clear-completion",
    type: "visualization-complete",
    source: "visualization-lab",
    topicId: "fractions",
    timestamp: "2026-05-07T12:00:02.000Z"
  });
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [postClear],
      1
    ),
    "unconfirmed"
  );

  assert.equal(
    confirmLearningAnalyticsGenerationHandshake(storage, handshake),
    "superseded"
  );
  assert.deepEqual(readLearningAnalyticsOutbox(storage, userId), []);
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(storage, userId).map((item) => item.id),
    [postClear.id]
  );
  assert.equal(readLearningAnalyticsGeneration(storage, userId), 1);
  assert.equal(readLearningAnalyticsClearFence(storage, userId).status, "valid");
});

test("a peer handshake reuses the held exact-user marker instead of orphaning its writer token", () => {
  const storage = memoryStorage();
  const userId = "student-concurrent-handshakes";
  replaceLearningAnalyticsGeneration(storage, userId, 5);
  const first = beginLearningAnalyticsGenerationHandshake(
    storage,
    userId,
    5,
    "2026-05-07T12:00:00.000Z",
    "handshake-leader"
  );
  const duringFirst = event({ id: "written-under-first-handshake" });
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [duringFirst],
      5
    ),
    "unconfirmed"
  );

  const peer = beginLearningAnalyticsGenerationHandshake(
    storage,
    userId,
    5,
    "2026-05-07T12:00:01.000Z",
    "handshake-peer-must-not-overwrite"
  );
  assert.deepEqual(peer, first);
  assert.equal(
    finishLearningAnalyticsLowerGenerationRecovery(
      storage,
      userId,
      5,
      0,
      first.requestId,
      "2026-05-07T12:00:02.000Z",
      "lower-after-held-handshake"
    ),
    "completed"
  );
  assert.deepEqual(
    readLearningAnalyticsOutbox(storage, userId, 0).map((item) => item.id),
    [duringFirst.id]
  );
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(storage, userId), []);
  assert.equal(
    storage.getItem(learningAnalyticsQuarantineStorageKey(userId, duringFirst.id)),
    null
  );
});

test("a crashed collecting handshake rescans null-token rows before it becomes prepared", () => {
  const backing = memoryStorage();
  const userId = "student-handshake-prepare-crash";
  replaceLearningAnalyticsGeneration(backing, userId, 3);
  const preexisting = event({ id: "preexisting-before-handshake" });
  mergeUnconfirmedLearningAnalyticsOutbox(backing, userId, [preexisting]);
  const handshakeKey = learningAnalyticsGenerationHandshakeStorageKey(userId);
  let markerWrites = 0;
  const crashBetweenPhases = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      if (key === handshakeKey) {
        markerWrites += 1;
        if (markerWrites === 2) throw new Error("crash before prepared marker");
      }
      backing.setItem(key, value);
    }
  };
  assert.throws(
    () => beginLearningAnalyticsGenerationHandshake(
      crashBetweenPhases,
      userId,
      3,
      "2026-05-07T12:00:00.000Z",
      "crashed-handshake"
    ),
    /crash before prepared marker/
  );
  assert.equal(readLearningAnalyticsGenerationHandshake(backing, userId).status, "valid");

  const resumed = beginLearningAnalyticsGenerationHandshake(
    backing,
    userId,
    3,
    "2026-05-07T12:00:01.000Z",
    "peer-resume-must-reuse"
  );
  assert.equal(resumed.phase, "prepared");
  assert.equal(resumed.requestId, "crashed-handshake");
  assert.deepEqual(resumed.existingUnconfirmedEventIds, [preexisting.id]);
  assert.equal(
    confirmLearningAnalyticsGenerationHandshake(backing, resumed),
    "confirmed"
  );
  assert.deepEqual(
    readLearningAnalyticsOutbox(backing, userId, 3).map(({ id }) => id),
    [preexisting.id]
  );
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(backing, userId), []);
});

test("a writer that observed a closing handshake rebases after its post-write marker check", () => {
  const backing = memoryStorage();
  const userId = "student-handshake-close-writer";
  replaceLearningAnalyticsGeneration(backing, userId, 1);
  const handshake = beginLearningAnalyticsGenerationHandshake(
    backing,
    userId,
    1,
    "2026-05-07T12:00:00.000Z",
    "closing-handshake"
  );
  const handshakeKey = learningAnalyticsGenerationHandshakeStorageKey(userId);
  const heldHandshakeRaw = backing.getItem(handshakeKey);
  assert.notEqual(heldHandshakeRaw, null);
  const lateWriterEvent = event({ id: "late-handshake-writer" });
  let writerOutcome: "confirmed" | "unconfirmed" | null = null;
  let exposeStaleHandshake = true;
  const staleWriterStorage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      if (key === handshakeKey && exposeStaleHandshake) return heldHandshakeRaw;
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
      if (key.startsWith(unconfirmedLearningAnalyticsOutboxStorageKey(userId))) {
        exposeStaleHandshake = false;
      }
    }
  };
  const closingStorage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      backing.removeItem(key);
      if (key === handshakeKey && writerOutcome === null) {
        writerOutcome = persistLearningAnalyticsEventsForCurrentProtocol(
          staleWriterStorage,
          userId,
          [lateWriterEvent],
          1
        );
      }
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
    }
  };

  assert.equal(
    confirmLearningAnalyticsGenerationHandshake(closingStorage, handshake),
    "confirmed"
  );
  assert.equal(writerOutcome, "confirmed");
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(backing, userId), []);
  assert.deepEqual(
    readLearningAnalyticsOutbox(backing, userId, 1).map(({ id }) => id),
    [lateWriterEvent.id]
  );
});

test("handshake close drains a writer that commits immediately before the gate is removed", () => {
  const backing = memoryStorage();
  const userId = "student-handshake-pre-remove-writer";
  replaceLearningAnalyticsGeneration(backing, userId, 2);
  const handshake = beginLearningAnalyticsGenerationHandshake(
    backing,
    userId,
    2,
    "2026-05-07T12:00:00.000Z",
    "handshake-pre-remove"
  );
  const late = event({ id: "late-before-handshake-remove" });
  let persistResult: "confirmed" | "unconfirmed" | null = null;
  const storage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      if (
        key === learningAnalyticsGenerationHandshakeStorageKey(userId) &&
        persistResult === null
      ) {
        persistResult = persistLearningAnalyticsEventsForCurrentProtocol(
          backing,
          userId,
          [late],
          2
        );
      }
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
    }
  };

  assert.equal(
    confirmLearningAnalyticsGenerationHandshake(storage, handshake),
    "confirmed"
  );
  assert.equal(persistResult, "unconfirmed");
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(backing, userId), []);
  assert.deepEqual(
    readLearningAnalyticsOutbox(backing, userId, 2).map(({ id }) => id),
    [late.id]
  );
});

test("a restarted handshake adopts lineage rows after a crash immediately following gate removal", () => {
  const backing = memoryStorage();
  const userId = "student-handshake-close-crash";
  replaceLearningAnalyticsGeneration(backing, userId, 0);
  const first = beginLearningAnalyticsGenerationHandshake(
    backing,
    userId,
    0,
    "2026-05-07T12:00:00.000Z",
    "handshake-before-close-crash"
  );
  const late = event({ id: "late-before-crashed-post-close-drain" });
  let injected = false;
  const crashingStorage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      if (
        key === learningAnalyticsGenerationHandshakeStorageKey(userId) &&
        !injected
      ) {
        injected = true;
        assert.equal(
          persistLearningAnalyticsEventsForCurrentProtocol(
            backing,
            userId,
            [late],
            0
          ),
          "unconfirmed"
        );
        backing.removeItem(key);
        throw new Error("crash after handshake gate removal");
      }
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
    }
  };
  assert.equal(
    confirmLearningAnalyticsGenerationHandshake(crashingStorage, first),
    "unavailable"
  );
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(backing, userId).map(({ id }) => id),
    [late.id]
  );

  const restarted = beginLearningAnalyticsGenerationHandshake(
    backing,
    userId,
    0,
    "2026-05-07T12:00:01.000Z",
    "handshake-after-close-crash"
  );
  assert.equal(
    confirmLearningAnalyticsGenerationHandshake(backing, restarted),
    "confirmed"
  );
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(backing, userId), []);
  assert.deepEqual(
    readLearningAnalyticsOutbox(backing, userId, 0).map(({ id }) => id),
    [late.id]
  );
});

test("clear marker quota failure is zero-destructive for completion once-keys", () => {
  const storage = memoryStorage();
  const userId = "student-marker-quota";
  const completionKey = visualizationCompletionTelemetryStorageKey(
    userId,
    "configured-lab",
    "fractions"
  );
  storage.setItem(completionKey, "1");
  const markerKey = learningAnalyticsClearFenceStorageKey(userId);
  const quotaStorage = {
    get length() {
      return storage.length;
    },
    getItem(key: string) {
      return storage.getItem(key);
    },
    key(index: number) {
      return storage.key(index);
    },
    removeItem(key: string) {
      storage.removeItem(key);
    },
    setItem(key: string, value: string) {
      if (key === markerKey) throw new Error("marker quota");
      storage.setItem(key, value);
    }
  };

  assert.throws(
    () => beginLearningAnalyticsClearFence(
      quotaStorage,
      userId,
      2,
      "2026-05-07T12:00:00.000Z",
      "quota-clear"
    ),
    /marker quota/
  );
  assert.equal(storage.getItem(completionKey), "1");
  assert.equal(storage.getItem(markerKey), null);
});

test("remote transition publishes a v2 collecting gate before draining stale writers", () => {
  const storage = memoryStorage();
  const userId = "student-collecting-window";
  replaceLearningAnalyticsGeneration(storage, userId, 7);
  mergeLearningAnalyticsOutbox(storage, userId, [
    withLearningAnalyticsDeliveryGeneration(event({ id: "old-before-marker" }), 7)
  ]);
  const staleDuringDrain = withLearningAnalyticsDeliveryGeneration(
    event({ id: "stale-during-drain" }),
    7
  );
  const transitionKey = learningAnalyticsGenerationTransitionStorageKey(userId);
  let injected = false;
  const interleavingStorage = {
    get length() {
      return storage.length;
    },
    getItem(key: string) {
      return storage.getItem(key);
    },
    key(index: number) {
      return storage.key(index);
    },
    removeItem(key: string) {
      storage.removeItem(key);
    },
    setItem(key: string, value: string) {
      storage.setItem(key, value);
      if (key !== transitionKey || injected) return;
      const parsed = JSON.parse(value) as { version?: unknown; phase?: unknown };
      if (parsed.version === 2 && parsed.phase === "collecting") {
        injected = true;
        mergeLearningAnalyticsOutbox(storage, userId, [staleDuringDrain]);
      }
    }
  };

  const marker = prepareLearningAnalyticsForwardGenerationTransition(
    interleavingStorage,
    userId,
    7,
    8,
    "2026-05-07T12:00:00.000Z",
    "collecting-transition",
    "2026-05-07T12:00:01.000Z"
  );

  assert.equal(injected, true, "The first durable transition write must be the collecting gate.");
  assert.equal(marker.version, 2);
  assert.equal(marker.phase, "prepared");
  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "completed");
  assert.deepEqual(readLearningAnalyticsOutbox(storage, userId, 8), []);
  assert.notEqual(
    storage.getItem(learningAnalyticsQuarantineStorageKey(userId, staleDuringDrain.id)),
    null,
    "A stale confirmed writer drained after the gate must be quarantined, never rebased."
  );
});

test("destructive transition reads report unavailable and retain marker and generation", () => {
  const storage = memoryStorage();
  const userId = "student-unavailable-transition";
  replaceLearningAnalyticsGeneration(storage, userId, 2);
  prepareLearningAnalyticsForwardGenerationTransition(
    storage,
    userId,
    2,
    3,
    "2026-05-07T12:00:00.000Z",
    "unavailable-transition",
    "2026-05-07T12:00:01.000Z"
  );
  const unavailableStorage = {
    get length(): number {
      throw new Error("storage enumeration unavailable");
    },
    getItem(key: string) {
      return storage.getItem(key);
    },
    key(index: number) {
      return storage.key(index);
    },
    removeItem(key: string) {
      storage.removeItem(key);
    },
    setItem(key: string, value: string) {
      storage.setItem(key, value);
    }
  };

  assert.equal(
    resumeLearningAnalyticsGenerationTransition(unavailableStorage, userId),
    "unavailable"
  );
  assert.equal(readLearningAnalyticsGeneration(storage, userId), 2);
  assert.equal(readLearningAnalyticsGenerationTransition(storage, userId).status, "valid");
});

test("legacy v1 transition is fail-closed migrated and cannot rebase trusted old preserve ids", () => {
  const storage = memoryStorage();
  const userId = "student-v1-transition";
  replaceLearningAnalyticsGeneration(storage, userId, 5);
  const legacyOld = event({ id: "legacy-v1-preserve" });
  mergeUnconfirmedLearningAnalyticsOutbox(storage, userId, [legacyOld]);
  storage.setItem(
    learningAnalyticsGenerationTransitionStorageKey(userId),
    JSON.stringify({
      version: 1,
      userId,
      kind: "forward-clear",
      fromGeneration: 5,
      toGeneration: 6,
      boundaryClearedAt: "2026-05-07T12:00:00.000Z",
      preserveEventIds: [legacyOld.id],
      quarantineEventIds: [],
      clearedCompletionStorageKeys: [],
      preparedAt: "2026-05-07T12:00:01.000Z",
      transitionId: "legacy-v1",
      preserveAllUnconfirmed: true
    })
  );

  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "completed");
  assert.deepEqual(readLearningAnalyticsOutbox(storage, userId, 6), []);
  assert.notEqual(
    storage.getItem(learningAnalyticsQuarantineStorageKey(userId, legacyOld.id)),
    null
  );
});

test("forward clear transition partitions at the local fence and is restart-idempotent", () => {
  const storage = memoryStorage();
  const userId = "student-forward";
  replaceLearningAnalyticsGeneration(storage, userId, 2);
  const completionBeforeFence = visualizationCompletionTelemetryStorageKey(
    userId,
    "configured-lab",
    "before-fence"
  );
  const completionAfterFence = visualizationCompletionTelemetryStorageKey(
    userId,
    "configured-lab",
    "after-fence"
  );
  const completionOnlyBeforeFence = visualizationCompletionTelemetryStorageKey(
    userId,
    "configured-lab",
    "only-before-fence"
  );
  storage.setItem(completionBeforeFence, "1");
  storage.setItem(completionOnlyBeforeFence, "1");
  mergeLearningAnalyticsOutbox(storage, userId, [
    withLearningAnalyticsDeliveryGeneration(event({ id: "confirmed-before", timestamp: "2026-05-07T11:59:59.000Z" }), 2)
  ]);
  mergeUnconfirmedLearningAnalyticsOutbox(storage, userId, [
    event({ id: "pending-before", timestamp: "2026-05-07T11:59:58.000Z" })
  ]);
  const fence = beginLearningAnalyticsClearFence(
    storage,
    userId,
    2,
    "2026-05-07T12:00:00.000Z",
    "forward-clear"
  );
  assert.equal(storage.getItem(completionBeforeFence), null);
  assert.equal(storage.getItem(completionOnlyBeforeFence), null);
  storage.setItem(completionBeforeFence, "post-fence-recreated");
  storage.setItem(completionAfterFence, "1");
  const sameMillisecondPeer = event({
    id: "peer-same-millisecond",
    timestamp: "2026-05-07T12:00:00.000Z"
  });
  const laterPeer = event({
    id: "peer-after",
    timestamp: "2026-05-07T12:00:03.000Z"
  });
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [sameMillisecondPeer, laterPeer],
      2
    ),
    "unconfirmed"
  );
  assert.equal(
    fence.clearedStorageKeys.some((key) => key.includes("peer-same-millisecond")),
    false,
    "The durable clear snapshot must not grow to include a post-fence peer key."
  );

  const marker = prepareLearningAnalyticsForwardGenerationTransition(
    storage,
    userId,
    2,
    3,
    "2026-05-07T12:00:01.000Z",
    "forward-transition"
  );
  assert.equal(marker.preserveAllUnconfirmed, true);
  assert.deepEqual(marker.preserveEventIds, ["peer-after", "peer-same-millisecond"]);
  assert.equal(readLearningAnalyticsGeneration(storage, userId), 2, "Preparation must be crash-safe and non-destructive.");
  assert.equal(readLearningAnalyticsGenerationTransition(storage, userId).status, "valid");
  const peerDuringTransition = event({
    id: "peer-during-transition",
    timestamp: "2026-05-07T12:00:04.000Z"
  });
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [peerDuringTransition],
      2
    ),
    "unconfirmed"
  );

  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "completed");
  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "absent");
  assert.equal(readLearningAnalyticsGeneration(storage, userId), 3);
  assert.equal(readLearningAnalyticsClearFence(storage, userId).status, "absent");
  assert.equal(storage.getItem(completionOnlyBeforeFence), null);
  assert.equal(
    storage.getItem(completionBeforeFence),
    "post-fence-recreated",
    "A completion recreated under the same exact key after the fence must survive."
  );
  assert.equal(
    storage.getItem(completionAfterFence),
    "1",
    "A completion key created after the local fence must survive transition cleanup."
  );
  assert.deepEqual(
    readLearningAnalyticsOutbox(storage, userId, 3).map((item) => item.id),
    ["peer-same-millisecond", "peer-after", "peer-during-transition"]
  );
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(storage, userId), []);
  storage.setItem(
    learningAnalyticsGenerationTransitionStorageKey(userId),
    JSON.stringify(marker)
  );
  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "completed");
  assert.deepEqual(
    readLearningAnalyticsOutbox(storage, userId, 3).map((item) => item.id),
    ["peer-same-millisecond", "peer-after", "peer-during-transition"]
  );
});

test("a deterministic completion id written after a held clear uses a distinct durable revision", () => {
  const storage = memoryStorage();
  const userId = "student-repeat-after-clear";
  const deterministicId = "viz-completion-v2-repeat";
  replaceLearningAnalyticsGeneration(storage, userId, 2);
  const beforeClear = event({
    id: deterministicId,
    type: "visualization-complete",
    source: "visualization-lab",
    topicId: "fractions",
    timestamp: "2026-05-07T12:00:00.000Z"
  });
  mergeUnconfirmedLearningAnalyticsOutbox(storage, userId, [beforeClear]);

  const fence = beginLearningAnalyticsClearFence(
    storage,
    userId,
    2,
    "2026-05-07T12:00:01.000Z",
    "clear-before-repeat"
  );
  const afterClear = event({
    ...beforeClear,
    timestamp: "2026-05-07T12:00:02.000Z"
  });
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [afterClear],
      2
    ),
    "unconfirmed"
  );
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(storage, userId).map((item) => item.timestamp),
    [beforeClear.timestamp, afterClear.timestamp]
  );
  assert.equal(
    fence.clearedStorageKeys.filter((key) => key.includes(encodeURIComponent(deterministicId))).length,
    1
  );

  prepareLearningAnalyticsForwardGenerationTransition(
    storage,
    userId,
    2,
    3,
    "2026-05-07T12:00:03.000Z",
    "forward-repeat-after-clear"
  );
  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "completed");
  const durable = readLearningAnalyticsOutbox(storage, userId, 3);
  assert.equal(durable.length, 1);
  assert.equal(durable[0]?.id, deterministicId);
  assert.equal(durable[0]?.timestamp, afterClear.timestamp);
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(storage, userId), []);
});

test("remote forward transition uses a causal marker instead of trusting device timestamps", () => {
  const storage = memoryStorage();
  const userId = "student-remote";
  replaceLearningAnalyticsGeneration(storage, userId, 7);
  const completionBeforeMarker = visualizationCompletionTelemetryStorageKey(
    userId,
    "configured-lab",
    "before-marker"
  );
  const completionAfterMarker = visualizationCompletionTelemetryStorageKey(
    userId,
    "configured-lab",
    "after-marker"
  );
  storage.setItem(completionBeforeMarker, "1");
  storage.setItem(
    visualizationCompletionTelemetryStorageKey("student-peer", "configured-lab", "topic-a"),
    "1"
  );
  mergeLearningAnalyticsOutbox(storage, userId, [
    withLearningAnalyticsDeliveryGeneration(event({ id: "old", timestamp: "2026-05-07T11:59:59.000Z" }), 7),
    withLearningAnalyticsDeliveryGeneration(
      event({ id: "old-device-clock-ahead", timestamp: "2036-05-07T12:00:01.000Z" }),
      7
    )
  ]);
  const marker = prepareLearningAnalyticsForwardGenerationTransition(
    storage,
    userId,
    7,
    8,
    "2026-05-07T12:00:00.000Z",
    "remote-forward",
    "2026-05-07T12:00:02.000Z"
  );
  assert.equal(marker.preserveAllUnconfirmed, false);
  assert.deepEqual(marker.preserveEventIds, []);
  assert.deepEqual(marker.quarantineEventIds, ["old", "old-device-clock-ahead"]);

  const postMarker = event({
    id: "created-after-causal-marker",
    timestamp: "2026-05-07T11:00:00.000Z"
  });
  const staleTabConfirmedAfterMarker = withLearningAnalyticsDeliveryGeneration(
    event({
      id: "stale-tab-write-after-marker",
      timestamp: "2026-05-07T10:00:00.000Z"
    }),
    7
  );
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [postMarker],
      7
    ),
    "unconfirmed"
  );
  // Model a tab that captured the old protocol state before observing the
  // marker, then commits its independently keyed row after the marker exists.
  // A confirmed old-generation row is stale even if its physical write lands
  // late; it must be quarantined rather than rebased.
  mergeLearningAnalyticsOutbox(storage, userId, [staleTabConfirmedAfterMarker]);
  storage.setItem(completionAfterMarker, "1");
  assert.equal(
    resumeLearningAnalyticsGenerationTransition(storage, userId),
    "completed"
  );
  assert.deepEqual(
    readLearningAnalyticsOutbox(storage, userId, 8).map((item) => item.id),
    ["created-after-causal-marker"]
  );
  assert.notEqual(
    storage.getItem(
      learningAnalyticsQuarantineStorageKey(
        userId,
        "stale-tab-write-after-marker"
      )
    ),
    null
  );
  assert.notEqual(
    storage.getItem(learningAnalyticsQuarantineStorageKey(userId, "old")),
    null
  );
  assert.notEqual(
    storage.getItem(learningAnalyticsQuarantineStorageKey(userId, "old-device-clock-ahead")),
    null
  );
  assert.equal(
    storage.getItem(completionBeforeMarker),
    null
  );
  assert.equal(storage.getItem(completionAfterMarker), "1");
  assert.equal(
    storage.getItem(visualizationCompletionTelemetryStorageKey("student-peer", "configured-lab", "topic-a")),
    "1"
  );
});

test("remote forward transition preserves only the post-boundary physical revision for a reused id", () => {
  const storage = memoryStorage();
  const userId = "student-remote-same-id";
  const reusedId = "deterministic-completion-id";
  replaceLearningAnalyticsGeneration(storage, userId, 1);
  const before = withLearningAnalyticsDeliveryGeneration(event({
    id: reusedId,
    timestamp: "2026-05-07T11:59:59.000Z",
    durationSeconds: 1
  }), 1);
  mergeUnconfirmedLearningAnalyticsOutbox(storage, userId, [before]);
  const transition = prepareLearningAnalyticsForwardGenerationTransition(
    storage,
    userId,
    1,
    2,
    "2026-05-07T12:00:00.000Z",
    "remote-forward-same-id",
    "2026-05-07T12:00:01.000Z"
  );
  const after = event({
    id: reusedId,
    timestamp: "2026-05-07T12:00:02.000Z",
    durationSeconds: 2
  });
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [after],
      1
    ),
    "unconfirmed"
  );
  assert.equal(transition.transitionId, "remote-forward-same-id");
  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "completed");
  const [survivor] = readLearningAnalyticsOutbox(storage, userId, 2);
  assert.equal(survivor?.id, reusedId);
  assert.equal(survivor?.timestamp, after.timestamp);
  assert.equal(survivor?.durationSeconds, 2);
});

test("transition close adopts a writer that commits immediately before the gate is removed", () => {
  const backing = memoryStorage();
  const userId = "student-transition-pre-remove-writer";
  replaceLearningAnalyticsGeneration(backing, userId, 1);
  const transition = prepareLearningAnalyticsForwardGenerationTransition(
    backing,
    userId,
    1,
    2,
    "2026-05-07T12:00:00.000Z",
    "transition-pre-remove"
  );
  const late = event({ id: "late-before-transition-remove" });
  let persistResult: "confirmed" | "unconfirmed" | null = null;
  const storage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      if (
        key === learningAnalyticsGenerationTransitionStorageKey(userId) &&
        persistResult === null
      ) {
        persistResult = persistLearningAnalyticsEventsForCurrentProtocol(
          backing,
          userId,
          [late],
          1
        );
      }
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
    }
  };

  assert.equal(transition.transitionId, "transition-pre-remove");
  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "completed");
  assert.equal(persistResult, "unconfirmed");
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(backing, userId), []);
  assert.deepEqual(
    readLearningAnalyticsOutbox(backing, userId, 2).map(({ id }) => id),
    [late.id]
  );
});

test("a stale transition snapshot cannot overwrite a newer clear and transition", () => {
  const backing = memoryStorage();
  const userId = "student-stale-transition-control-plane";
  replaceLearningAnalyticsGeneration(backing, userId, 1);
  prepareLearningAnalyticsForwardGenerationTransition(
    backing,
    userId,
    1,
    2,
    "2026-05-07T12:00:00.000Z",
    "transition-one"
  );
  const transitionKey = learningAnalyticsGenerationTransitionStorageKey(userId);
  let installedNewerTransition = false;
  const staleSnapshotStorage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      const captured = backing.getItem(key);
      if (key === transitionKey && !installedNewerTransition) {
        installedNewerTransition = true;
        assert.equal(
          resumeLearningAnalyticsGenerationTransition(backing, userId),
          "completed"
        );
        beginLearningAnalyticsClearFence(
          backing,
          userId,
          2,
          "2026-05-07T12:00:01.000Z",
          "clear-two"
        );
        prepareLearningAnalyticsForwardGenerationTransition(
          backing,
          userId,
          2,
          3,
          "2026-05-07T12:00:02.000Z",
          "transition-two"
        );
      }
      return captured;
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
    }
  };

  assert.equal(
    resumeLearningAnalyticsGenerationTransition(staleSnapshotStorage, userId),
    "unavailable"
  );
  assert.equal(readLearningAnalyticsGeneration(backing, userId), 2);
  const fence = readLearningAnalyticsClearFence(backing, userId);
  assert.equal(fence.status, "valid");
  if (fence.status !== "valid") throw new Error("Expected the newer clear fence.");
  assert.equal(fence.value.requestId, "clear-two");
  const currentTransition = readLearningAnalyticsGenerationTransition(
    backing,
    userId
  );
  assert.equal(currentTransition.status, "valid");
  if (currentTransition.status !== "valid") {
    throw new Error("Expected the newer transition.");
  }
  assert.equal(currentTransition.value.transitionId, "transition-two");
  assert.equal(resumeLearningAnalyticsGenerationTransition(backing, userId), "completed");
  assert.equal(readLearningAnalyticsGeneration(backing, userId), 3);
});

test("authoritative lower recovery preserves only the handshake physical revision for a reused id", () => {
  const storage = memoryStorage();
  const userId = "student-lower-same-id";
  const reusedId = "deterministic-lower-id";
  replaceLearningAnalyticsGeneration(storage, userId, 5);
  mergeUnconfirmedLearningAnalyticsOutbox(storage, userId, [
    withLearningAnalyticsDeliveryGeneration(event({
      id: reusedId,
      timestamp: "2026-05-07T11:59:58.000Z",
      durationSeconds: 1
    }), 5)
  ]);
  const handshake = beginLearningAnalyticsGenerationHandshake(
    storage,
    userId,
    5,
    "2026-05-07T12:00:00.000Z",
    "lower-same-id-handshake"
  );
  const during = event({
    id: reusedId,
    timestamp: "2026-05-07T12:00:01.000Z",
    durationSeconds: 3
  });
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      storage,
      userId,
      [during],
      5
    ),
    "unconfirmed"
  );
  prepareLearningAnalyticsLowerGenerationRecovery(
    storage,
    userId,
    5,
    3,
    handshake.requestId,
    "2026-05-07T12:00:02.000Z",
    "lower-same-id-transition"
  );
  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "completed");
  const [survivor] = readLearningAnalyticsOutbox(storage, userId, 3);
  assert.equal(survivor?.id, reusedId);
  assert.equal(survivor?.timestamp, during.timestamp);
  assert.equal(survivor?.durationSeconds, 3);
});

test("a stale tab that finishes its old-generation write after transition resume diverts the row to recovery", () => {
  const storage = memoryStorage();
  const userId = "student-stale-writer";
  const lateEvent = event({ id: "late-stale-tab-write" });
  replaceLearningAnalyticsGeneration(storage, userId, 7);
  const lateEventKey = learningAnalyticsOutboxRecordStorageKey(
    userId,
    withLearningAnalyticsDeliveryGeneration(lateEvent, 7)
  );
  let transitioned = false;
  const interleavingStorage = {
    get length() {
      return storage.length;
    },
    getItem(key: string) {
      return storage.getItem(key);
    },
    key(index: number) {
      return storage.key(index);
    },
    removeItem(key: string) {
      storage.removeItem(key);
    },
    setItem(key: string, value: string) {
      if (key === lateEventKey && !transitioned) {
        transitioned = true;
        prepareLearningAnalyticsForwardGenerationTransition(
          storage,
          userId,
          7,
          8,
          "2026-05-07T12:00:00.000Z",
          "stale-writer-transition",
          "2026-05-07T12:00:01.000Z"
        );
        assert.equal(
          resumeLearningAnalyticsGenerationTransition(storage, userId),
          "completed"
        );
      }
      storage.setItem(key, value);
    }
  };

  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(
      interleavingStorage,
      userId,
      [lateEvent],
      7
    ),
    "unconfirmed"
  );
  assert.deepEqual(readLearningAnalyticsOutbox(storage, userId), []);
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(storage, userId).map((item) => item.id),
    [lateEvent.id]
  );
  confirmUnconfirmedLearningAnalyticsOutbox(storage, userId, 8);
  assert.deepEqual(
    readLearningAnalyticsOutbox(storage, userId, 8).map((item) => item.id),
    [lateEvent.id]
  );
});

test("authoritative lower recovery quarantines old rows and preserves only events created during the held handshake", () => {
  const storage = memoryStorage();
  const userId = "student/A+B";
  replaceLearningAnalyticsGeneration(storage, userId, 5);
  mergeLearningAnalyticsOutbox(storage, userId, [
    withLearningAnalyticsDeliveryGeneration(event({ id: "confirmed-old" }), 5)
  ]);
  mergeUnconfirmedLearningAnalyticsOutbox(storage, userId, [
    event({ id: "pending-before", timestamp: "2026-05-07T11:59:59.000Z" })
  ]);
  const handshake = beginLearningAnalyticsGenerationHandshake(
    storage,
    userId,
    5,
    "2026-05-07T12:00:00.000Z",
    "handshake-lower"
  );
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(storage, userId, [
      event({ id: "pending-during", timestamp: "2026-05-07T12:00:01.000Z" })
    ], 5),
    "unconfirmed"
  );

  assert.equal(readLearningAnalyticsGenerationHandshake(storage, userId).status, "valid");
  const marker = prepareLearningAnalyticsLowerGenerationRecovery(
    storage,
    userId,
    5,
    1,
    handshake.requestId,
    "2026-05-07T12:00:02.000Z",
    "lower-transition"
  );
  assert.deepEqual(marker.preserveEventIds, ["pending-during"]);
  assert.deepEqual(marker.quarantineEventIds, ["confirmed-old", "pending-before"]);
  assert.equal(readLearningAnalyticsGeneration(storage, userId), 5);

  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "completed");
  assert.equal(readLearningAnalyticsGeneration(storage, userId), 1, "Recovery must replace, not max, the local generation.");
  assert.deepEqual(readLearningAnalyticsOutbox(storage, userId, 1).map((item) => item.id), ["pending-during"]);
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(storage, userId), []);
  assert.notEqual(storage.getItem(learningAnalyticsQuarantineStorageKey(userId, "confirmed-old")), null);
  assert.notEqual(storage.getItem(learningAnalyticsQuarantineStorageKey(userId, "pending-before")), null);
  assert.equal(readLearningAnalyticsGenerationHandshake(storage, userId).status, "absent");
  assert.notEqual(
    learningAnalyticsGenerationHandshakeStorageKey("A+B"),
    learningAnalyticsGenerationHandshakeStorageKey("A B")
  );
  assert.notEqual(
    learningAnalyticsGenerationTransitionStorageKey("A+B"),
    learningAnalyticsGenerationTransitionStorageKey("A B")
  );
  storage.setItem(
    learningAnalyticsGenerationTransitionStorageKey(userId),
    JSON.stringify(marker)
  );
  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "completed");
  assert.deepEqual(readLearningAnalyticsOutbox(storage, userId, 1).map((item) => item.id), ["pending-during"]);
});

test("lower recovery convenience path resumes a prepared crash marker", () => {
  const storage = memoryStorage();
  replaceLearningAnalyticsGeneration(storage, "student-lower", 4);
  beginLearningAnalyticsGenerationHandshake(
    storage,
    "student-lower",
    4,
    "2026-05-07T12:00:00.000Z",
    "lower-handshake"
  );
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(storage, "student-lower", [
      event({ id: "during-lower", timestamp: "2026-05-07T12:00:01.000Z" })
    ], 4),
    "unconfirmed"
  );
  assert.equal(
    finishLearningAnalyticsLowerGenerationRecovery(
      storage,
      "student-lower",
      4,
      0,
      "lower-handshake",
      "2026-05-07T12:00:02.000Z",
      "lower-finish"
    ),
    "completed"
  );
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-lower", 0).map((item) => item.id), ["during-lower"]);
});

test("corrupt fences and transition markers fail closed while retaining new events", () => {
  const storage = memoryStorage();
  storage.setItem(learningAnalyticsClearFenceStorageKey("student-corrupt"), "{not-json");
  assert.equal(readLearningAnalyticsClearFence(storage, "student-corrupt").status, "corrupt");
  assert.equal(learningAnalyticsClientProtocolStatus(storage, "student-corrupt"), "corrupt");
  const retained = event({ id: "retained-during-corruption" });
  assert.equal(
    persistLearningAnalyticsEventsForCurrentProtocol(storage, "student-corrupt", [retained], 9),
    "unconfirmed"
  );
  assert.deepEqual(readLearningAnalyticsOutbox(storage, "student-corrupt"), []);
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(storage, "student-corrupt").map((item) => item.id), [retained.id]);

  storage.removeItem(learningAnalyticsClearFenceStorageKey("student-corrupt"));
  storage.setItem(learningAnalyticsGenerationTransitionStorageKey("student-corrupt"), JSON.stringify({ version: 1 }));
  assert.equal(readLearningAnalyticsGenerationTransition(storage, "student-corrupt").status, "corrupt");
  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, "student-corrupt"), "corrupt");
  assert.equal(learningAnalyticsClientProtocolStatus(storage, "student-corrupt"), "corrupt");

  const corruptFenceAfterPreparation = memoryStorage();
  replaceLearningAnalyticsGeneration(corruptFenceAfterPreparation, "student-fence", 1);
  beginLearningAnalyticsClearFence(
    corruptFenceAfterPreparation,
    "student-fence",
    1,
    "2026-05-07T12:00:00.000Z",
    "fence-before-marker"
  );
  prepareLearningAnalyticsForwardGenerationTransition(
    corruptFenceAfterPreparation,
    "student-fence",
    1,
    2,
    "2026-05-07T12:00:01.000Z",
    "marker-before-corruption"
  );
  corruptFenceAfterPreparation.setItem(
    learningAnalyticsClearFenceStorageKey("student-fence"),
    "{corrupted-after-marker"
  );
  assert.equal(
    resumeLearningAnalyticsGenerationTransition(corruptFenceAfterPreparation, "student-fence"),
    "corrupt"
  );
  assert.equal(readLearningAnalyticsGeneration(corruptFenceAfterPreparation, "student-fence"), 1);
});

test("a completed analytics clear releases only the exact user's visualization completion once-keys", () => {
  const storage = memoryStorage();
  storage.setItem(
    visualizationCompletionTelemetryStorageKey("A+B", "configured-lab", "fractions"),
    "1"
  );
  storage.setItem(
    visualizationCompletionTelemetryStorageKey("A B", "configured-lab", "fractions"),
    "1"
  );
  assert.notEqual(
    visualizationCompletionTelemetryStorageKey("A+B", "configured-lab", "fractions"),
    visualizationCompletionTelemetryStorageKey("A B", "configured-lab", "fractions")
  );

  assert.equal(clearVisualizationCompletionTelemetryForUser(storage, "A+B"), 1);
  assert.equal(
    storage.getItem(visualizationCompletionTelemetryStorageKey("A+B", "configured-lab", "fractions")),
    null
  );
  assert.equal(
    storage.getItem(visualizationCompletionTelemetryStorageKey("A B", "configured-lab", "fractions")),
    "1"
  );
});

test("v2 visualization completion marker is pending-first, deterministic, and exact-token complete", () => {
  const helpers = learningAnalyticsModule as unknown as {
    beginVisualizationCompletionTelemetryOnce?: (
      storage: ReturnType<typeof memoryStorage>,
      userId: string,
      moduleId: string,
      topicId: string,
      token: string
    ) => { marker: { eventId: string; eventTimestamp: string; phase: string; token: string }; status: string };
    completeVisualizationCompletionTelemetryOnce?: (
      storage: ReturnType<typeof memoryStorage>,
      marker: { eventId: string; eventTimestamp: string; moduleId: string; phase: "pending"; protocolRevision: string; token: string; topicId: string; userId: string; version: 2 }
    ) => boolean;
    readVisualizationCompletionTelemetryOnce?: (
      storage: ReturnType<typeof memoryStorage>,
      userId: string,
      moduleId: string,
      topicId: string
    ) => { status: string; marker?: { eventId: string; phase: string; token: string } };
  };
  assert.equal(typeof helpers.beginVisualizationCompletionTelemetryOnce, "function");
  assert.equal(typeof helpers.completeVisualizationCompletionTelemetryOnce, "function");
  assert.equal(typeof helpers.readVisualizationCompletionTelemetryOnce, "function");
  if (
    !helpers.beginVisualizationCompletionTelemetryOnce ||
    !helpers.completeVisualizationCompletionTelemetryOnce ||
    !helpers.readVisualizationCompletionTelemetryOnce
  ) throw new Error("Expected v2 completion telemetry helpers.");

  const firstStorage = memoryStorage();
  const secondStorage = memoryStorage();
  const first = helpers.beginVisualizationCompletionTelemetryOnce(
    firstStorage,
    "student/A+B",
    "configured-visualization-lab",
    "fractions",
    "completion-token-a"
  );
  const replay = helpers.beginVisualizationCompletionTelemetryOnce(
    secondStorage,
    "student/A+B",
    "configured-visualization-lab",
    "fractions",
    "completion-token-b"
  );
  assert.equal(first.status, "pending");
  assert.equal(first.marker.phase, "pending");
  assert.equal(first.marker.eventId, replay.marker.eventId);
  const sameStorageReplay = helpers.beginVisualizationCompletionTelemetryOnce(
    firstStorage,
    "student/A+B",
    "configured-visualization-lab",
    "fractions",
    "completion-token-retry"
  );
  assert.equal(sameStorageReplay.marker.eventTimestamp, first.marker.eventTimestamp);
  assert.equal(sameStorageReplay.marker.token, first.marker.token);
  assert.notEqual(
    first.marker.eventId,
    helpers.beginVisualizationCompletionTelemetryOnce(
      memoryStorage(),
      "student/A B",
      "configured-visualization-lab",
      "fractions",
      "completion-token-c"
    ).marker.eventId
  );
  assert.throws(
    () => helpers.beginVisualizationCompletionTelemetryOnce!(
      memoryStorage(),
      "student/A+B",
      "configured-visualization-lab",
      "fractions",
      " completion-token "
    ),
    /token must be canonical/
  );
  assert.equal(
    helpers.completeVisualizationCompletionTelemetryOnce(firstStorage, {
      ...first.marker,
      token: "wrong-token"
    } as never),
    false
  );
  assert.equal(
    helpers.readVisualizationCompletionTelemetryOnce(
      firstStorage,
      "student/A+B",
      "configured-visualization-lab",
      "fractions"
    ).status,
    "pending"
  );
  assert.equal(
    helpers.completeVisualizationCompletionTelemetryOnce(
      firstStorage,
      first.marker as never
    ),
    true
  );
  assert.equal(
    helpers.readVisualizationCompletionTelemetryOnce(
      firstStorage,
      "student/A+B",
      "configured-visualization-lab",
      "fractions"
    ).status,
    "complete"
  );
});

test("legacy completion once marker migrates to v2 complete without creating a duplicate event", () => {
  const helpers = learningAnalyticsModule as unknown as {
    readVisualizationCompletionTelemetryOnce?: (
      storage: ReturnType<typeof memoryStorage>,
      userId: string,
      moduleId: string,
      topicId: string
    ) => { status: string; marker?: { phase: string; protocolRevision: string; version: number } };
  };
  assert.equal(typeof helpers.readVisualizationCompletionTelemetryOnce, "function");
  if (!helpers.readVisualizationCompletionTelemetryOnce) {
    throw new Error("Expected completion telemetry reader.");
  }
  const storage = memoryStorage();
  const key = visualizationCompletionTelemetryStorageKey(
    "student-legacy-completion",
    "configured-visualization-lab",
    "fractions"
  );
  storage.setItem(key, "1");
  const state = helpers.readVisualizationCompletionTelemetryOnce(
    storage,
    "student-legacy-completion",
    "configured-visualization-lab",
    "fractions"
  );
  assert.equal(state.status, "complete");
  assert.equal(state.marker?.version, 2);
  assert.equal(state.marker?.phase, "complete");
  assert.equal(storage.getItem(key), "1");
  assert.notEqual(
    storage.getItem(visualizationCompletionTelemetryStorageKey(
      "student-legacy-completion",
      "configured-visualization-lab",
      "fractions",
      state.marker?.protocolRevision
    )),
    null
  );
});

test("completion once storage failures remain pending or fail closed instead of claiming complete", () => {
  const helpers = learningAnalyticsModule as unknown as {
    beginVisualizationCompletionTelemetryOnce: typeof learningAnalyticsModule.beginVisualizationCompletionTelemetryOnce;
    completeVisualizationCompletionTelemetryOnce: typeof learningAnalyticsModule.completeVisualizationCompletionTelemetryOnce;
    readVisualizationCompletionTelemetryOnce: typeof learningAnalyticsModule.readVisualizationCompletionTelemetryOnce;
  };
  const inaccessible = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    }
  };
  assert.equal(
    helpers.readVisualizationCompletionTelemetryOnce(
      inaccessible,
      "student-a",
      "configured-visualization-lab",
      "fractions"
    ).status,
    "corrupt"
  );
  assert.throws(
    () => helpers.beginVisualizationCompletionTelemetryOnce(
      inaccessible,
      "student-a",
      "configured-visualization-lab",
      "fractions",
      "blocked-storage-token"
    ),
    /fail closed/
  );

  const storage = memoryStorage();
  const pending = helpers.beginVisualizationCompletionTelemetryOnce(
    storage,
    "student-a",
    "configured-visualization-lab",
    "fractions",
    "pending-token"
  );
  const rejectCompleteWrite = {
    getItem: storage.getItem,
    setItem() {
      throw new Error("quota");
    }
  };
  assert.throws(
    () => helpers.completeVisualizationCompletionTelemetryOnce(
      rejectCompleteWrite,
      pending.marker
    ),
    /quota/
  );
  assert.equal(
    helpers.readVisualizationCompletionTelemetryOnce(
      storage,
      "student-a",
      "configured-visualization-lab",
      "fractions"
    ).status,
    "pending"
  );
});

test("a stale completion commit cannot recreate a current marker after a peer clear", () => {
  const backing = memoryStorage();
  const userId = "student-completion-clear-race";
  replaceLearningAnalyticsGeneration(backing, userId, 1);
  const pending = learningAnalyticsModule.beginVisualizationCompletionTelemetryOnce(
    backing,
    userId,
    "configured-visualization-lab",
    "fractions",
    "completion-before-clear"
  );
  assert.equal(pending.status, "pending");
  let clearStarted = false;
  const interleavingStorage = {
    getItem(key: string) {
      return backing.getItem(key);
    },
    setItem(key: string, value: string) {
      if (!clearStarted && value.includes('"phase":"complete"')) {
        clearStarted = true;
        beginLearningAnalyticsClearFence(
          backing,
          userId,
          1,
          "2026-05-07T12:00:01.000Z",
          "clear-between-completion-read-and-write"
        );
      }
      backing.setItem(key, value);
    }
  };

  assert.equal(
    learningAnalyticsModule.completeVisualizationCompletionTelemetryOnce(
      interleavingStorage,
      pending.marker
    ),
    false
  );
  prepareLearningAnalyticsForwardGenerationTransition(
    backing,
    userId,
    1,
    2,
    "2026-05-07T12:00:02.000Z",
    "forward-after-completion-race"
  );
  assert.equal(resumeLearningAnalyticsGenerationTransition(backing, userId), "completed");
  assert.equal(
    learningAnalyticsModule.readVisualizationCompletionTelemetryOnce(
      backing,
      userId,
      "configured-visualization-lab",
      "fractions"
    ).status,
    "absent"
  );
});

test("a stale legacy migration is revision-scoped and cannot ghost-complete after clear", () => {
  const backing = memoryStorage();
  const userId = "student-legacy-completion-clear-race";
  replaceLearningAnalyticsGeneration(backing, userId, 4);
  const legacyKey = visualizationCompletionTelemetryStorageKey(
    userId,
    "configured-visualization-lab",
    "fractions"
  );
  backing.setItem(legacyKey, "1");
  let clearStarted = false;
  const interleavingStorage = {
    getItem(key: string) {
      return backing.getItem(key);
    },
    setItem(key: string, value: string) {
      if (!clearStarted && key !== legacyKey && value.includes('"phase":"complete"')) {
        clearStarted = true;
        beginLearningAnalyticsClearFence(
          backing,
          userId,
          4,
          "2026-05-07T12:00:01.000Z",
          "clear-between-legacy-read-and-migrate"
        );
      }
      backing.setItem(key, value);
    }
  };
  assert.equal(
    learningAnalyticsModule.readVisualizationCompletionTelemetryOnce(
      interleavingStorage,
      userId,
      "configured-visualization-lab",
      "fractions"
    ).status,
    "complete"
  );
  prepareLearningAnalyticsForwardGenerationTransition(
    backing,
    userId,
    4,
    5,
    "2026-05-07T12:00:02.000Z",
    "forward-after-legacy-race"
  );
  assert.equal(resumeLearningAnalyticsGenerationTransition(backing, userId), "completed");
  assert.equal(
    learningAnalyticsModule.readVisualizationCompletionTelemetryOnce(
      backing,
      userId,
      "configured-visualization-lab",
      "fractions"
    ).status,
    "absent"
  );
});

test("an unversioned legacy completion written after a clear cannot resurrect current completion", () => {
  const storage = memoryStorage();
  const userId = "student-late-legacy-completion";
  replaceLearningAnalyticsGeneration(storage, userId, 1);
  beginLearningAnalyticsClearFence(
    storage,
    userId,
    1,
    "2026-05-07T12:00:00.000Z",
    "late-legacy-clear"
  );
  prepareLearningAnalyticsForwardGenerationTransition(
    storage,
    userId,
    1,
    2,
    "2026-05-07T12:00:01.000Z",
    "late-legacy-forward"
  );
  assert.equal(resumeLearningAnalyticsGenerationTransition(storage, userId), "completed");
  storage.setItem(
    visualizationCompletionTelemetryStorageKey(
      userId,
      "configured-visualization-lab",
      "fractions"
    ),
    "1"
  );
  assert.equal(
    learningAnalyticsModule.readVisualizationCompletionTelemetryOnce(
      storage,
      userId,
      "configured-visualization-lab",
      "fractions"
    ).status,
    "absent"
  );
});

test("a completion committed after the clear writer gate is excluded from its claims", () => {
  const backing = memoryStorage();
  const userId = "student-post-clear-completion-marker";
  replaceLearningAnalyticsGeneration(backing, userId, 1);
  let postBoundaryKey: string | null = null;
  let installed = false;
  const interleavingStorage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
      if (
        !installed &&
        key === learningAnalyticsClearFenceStorageKey(userId)
      ) {
        installed = true;
        const pending = learningAnalyticsModule.beginVisualizationCompletionTelemetryOnce(
          backing,
          userId,
          "configured-visualization-lab",
          "fractions",
          "completion-after-clear-gate"
        );
        assert.equal(
          learningAnalyticsModule.completeVisualizationCompletionTelemetryOnce(
            backing,
            pending.marker
          ),
          true
        );
        postBoundaryKey = visualizationCompletionTelemetryStorageKey(
          userId,
          "configured-visualization-lab",
          "fractions",
          pending.marker.protocolRevision
        );
      }
    }
  };
  const fence = beginLearningAnalyticsClearFence(
    interleavingStorage,
    userId,
    1,
    "2026-05-07T12:00:01.000Z",
    "clear-with-post-boundary-completion"
  );

  assert.notEqual(postBoundaryKey, null);
  assert.equal(
    fence.clearedCompletionStorageKeys.includes(postBoundaryKey!),
    false
  );
  assert.equal(
    learningAnalyticsModule.readVisualizationCompletionTelemetryOnce(
      backing,
      userId,
      "configured-visualization-lab",
      "fractions"
    ).status,
    "complete"
  );
  prepareLearningAnalyticsForwardGenerationTransition(
    backing,
    userId,
    1,
    2,
    "2026-05-07T12:00:02.000Z",
    "forward-post-boundary-completion"
  );
  assert.equal(resumeLearningAnalyticsGenerationTransition(backing, userId), "completed");
  assert.equal(
    learningAnalyticsModule.readVisualizationCompletionTelemetryOnce(
      backing,
      userId,
      "configured-visualization-lab",
      "fractions"
    ).status,
    "complete"
  );
});

test("a completion committed after transition rebase but before gate close recovers through boundary lineage", () => {
  const backing = memoryStorage();
  const userId = "student-completion-transition-close";
  replaceLearningAnalyticsGeneration(backing, userId, 1);
  prepareLearningAnalyticsForwardGenerationTransition(
    backing,
    userId,
    1,
    2,
    "2026-05-07T12:00:00.000Z",
    "completion-close-transition",
    "2026-05-07T12:00:01.000Z"
  );
  let committedDuringClose = false;
  const interleavingStorage = {
    get length() {
      return backing.length;
    },
    getItem(key: string) {
      return backing.getItem(key);
    },
    key(index: number) {
      return backing.key(index);
    },
    removeItem(key: string) {
      backing.removeItem(key);
    },
    setItem(key: string, value: string) {
      backing.setItem(key, value);
      if (
        key === learningAnalyticsBoundaryLineageStorageKey(userId) &&
        !committedDuringClose
      ) {
        committedDuringClose = true;
        const pending = learningAnalyticsModule.beginVisualizationCompletionTelemetryOnce(
          backing,
          userId,
          "configured-visualization-lab",
          "fractions",
          "completion-during-transition-close"
        );
        assert.equal(
          learningAnalyticsModule.completeVisualizationCompletionTelemetryOnce(
            backing,
            pending.marker
          ),
          true
        );
      }
    }
  };

  assert.equal(
    resumeLearningAnalyticsGenerationTransition(interleavingStorage, userId),
    "completed"
  );
  assert.equal(committedDuringClose, true);
  assert.equal(
    learningAnalyticsModule.readVisualizationCompletionTelemetryOnce(
      backing,
      userId,
      "configured-visualization-lab",
      "fractions"
    ).status,
    "complete"
  );
});

test("exact-user clear locking fails closed without Web Locks and uses the encoded exclusive name", async () => {
  const withRequiredLock = (learningAnalyticsModule as unknown as {
    withRequiredLearningAnalyticsClearLock?: <T>(
      lockManager: {
        request: (
          name: string,
          options: { mode: "exclusive" },
          task: () => Promise<T>
        ) => Promise<T>;
      } | null | undefined,
      userId: string,
      task: () => Promise<T>
    ) => Promise<T>;
  }).withRequiredLearningAnalyticsClearLock;
  assert.equal(typeof withRequiredLock, "function");
  if (!withRequiredLock) throw new Error("Expected the required Web Lock helper.");

  let unprotectedTaskRan = false;
  await assert.rejects(
    () => withRequiredLock(undefined, "student/A+B", async () => {
      unprotectedTaskRan = true;
      return "unsafe";
    }),
    /Web Locks/i
  );
  assert.equal(unprotectedTaskRan, false);

  let capturedName = "";
  let capturedMode = "";
  const lockManager = {
    async request<T>(
      name: string,
      options: { mode: "exclusive" },
      task: () => Promise<T>
    ) {
      capturedName = name;
      capturedMode = options.mode;
      return task();
    }
  };
  assert.equal(
    await withRequiredLock(lockManager, "student/A+B", async () => "protected"),
    "protected"
  );
  assert.equal(
    capturedName,
    `mais:learning-analytics-clear:${encodeURIComponent("student/A+B")}`
  );
  assert.equal(capturedMode, "exclusive");
  assert.notEqual(
    `mais:learning-analytics-clear:${encodeURIComponent("student/A+B")}`,
    `mais:learning-analytics-clear:${encodeURIComponent("student/A B")}`
  );
});

test("delivery pause transitions wake sessions exactly on unpause and exhausted retries remain recoverable", () => {
  const pauseTransition = (learningAnalyticsModule as unknown as {
    learningAnalyticsDeliveryPauseTransition?: (
      wasPaused: boolean,
      nextPaused: boolean
    ) => { paused: boolean; wakeVisualizationSessions: boolean };
  }).learningAnalyticsDeliveryPauseTransition;
  const retryDelay = (learningAnalyticsModule as unknown as {
    visualizationSessionOutboxRetryDelayMs?: (failedAttempt: number) => number;
  }).visualizationSessionOutboxRetryDelayMs;
  assert.equal(typeof pauseTransition, "function");
  assert.equal(typeof retryDelay, "function");
  if (!pauseTransition || !retryDelay) {
    throw new Error("Expected delivery state-machine helpers.");
  }

  assert.deepEqual(pauseTransition(false, true), {
    paused: true,
    wakeVisualizationSessions: false
  });
  assert.deepEqual(pauseTransition(true, false), {
    paused: false,
    wakeVisualizationSessions: true
  });
  assert.deepEqual(pauseTransition(false, false), {
    paused: false,
    wakeVisualizationSessions: false
  });
  assert.equal(retryDelay(1), 1_000);
  assert.equal(retryDelay(5), 8_000);
  assert.equal(retryDelay(6), 30_000);
  assert.equal(retryDelay(10_000), 30_000);
});

test("quota failures use an explicit refresh-durable fallback and recover before delivery", () => {
  const helpers = learningAnalyticsModule as unknown as {
    persistLearningAnalyticsEventsWithDurabilityFallback?: (
      primary: ReturnType<typeof memoryStorage>,
      fallback: ReturnType<typeof memoryStorage>,
      userId: string,
      events: LearningAnalyticsEvent[],
      generation: number
    ) => string;
    recoverLearningAnalyticsDurabilityFallback?: (
      primary: ReturnType<typeof memoryStorage>,
      fallback: ReturnType<typeof memoryStorage>,
      userId: string,
      generation: number
    ) => { recovered: LearningAnalyticsEvent[]; remaining: LearningAnalyticsEvent[] };
  };
  assert.equal(typeof helpers.persistLearningAnalyticsEventsWithDurabilityFallback, "function");
  assert.equal(typeof helpers.recoverLearningAnalyticsDurabilityFallback, "function");
  if (
    !helpers.persistLearningAnalyticsEventsWithDurabilityFallback ||
    !helpers.recoverLearningAnalyticsDurabilityFallback
  ) throw new Error("Expected durability fallback helpers.");

  const primary = memoryStorage();
  const fallback = memoryStorage();
  const userId = "student-quota-fallback";
  replaceLearningAnalyticsGeneration(primary, userId, 3);
  const substantive = event({ id: "answer-under-quota", type: "answer-correct" });
  let quotaActive = true;
  const quotaPrimary = {
    get length() {
      return primary.length;
    },
    getItem(key: string) {
      return primary.getItem(key);
    },
    key(index: number) {
      return primary.key(index);
    },
    removeItem(key: string) {
      primary.removeItem(key);
    },
    setItem(key: string, value: string) {
      if (quotaActive && key.startsWith(learningAnalyticsOutboxStorageKey(userId))) {
        throw new Error("quota");
      }
      primary.setItem(key, value);
    }
  };

  assert.equal(
    helpers.persistLearningAnalyticsEventsWithDurabilityFallback(
      quotaPrimary,
      fallback,
      userId,
      [substantive],
      3
    ),
    "fallback"
  );
  assert.deepEqual(readLearningAnalyticsOutbox(primary, userId), []);
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(fallback, userId).map(({ id }) => id),
    [substantive.id],
    "The fallback journal models sessionStorage and therefore survives refresh."
  );

  quotaActive = false;
  const recovery = helpers.recoverLearningAnalyticsDurabilityFallback(
    quotaPrimary,
    fallback,
    userId,
    3
  );
  assert.deepEqual(recovery.recovered.map(({ id }) => id), [substantive.id]);
  assert.deepEqual(recovery.remaining, []);
  assert.deepEqual(readLearningAnalyticsOutbox(primary, userId, 3).map(({ id }) => id), [substantive.id]);
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(fallback, userId), []);
});

test("an exact-user clear drops pre-boundary fallback rows and preserves tagged post-boundary rows", () => {
  const primary = memoryStorage();
  const fallback = memoryStorage();
  const userId = "student-fallback-clear";
  const preBoundary = event({ id: "pre-boundary" });
  const postBoundary = event({
    id: "post-boundary",
    timestamp: "2026-05-07T12:00:01.000Z"
  });
  const peer = event({ id: "peer-user" });

  mergeUnconfirmedLearningAnalyticsOutbox(fallback, userId, [preBoundary]);
  mergeUnconfirmedLearningAnalyticsOutbox(fallback, "student-peer", [peer]);
  const fence = beginLearningAnalyticsClearFence(
    primary,
    userId,
    0,
    now,
    "clear-fallback-boundary"
  );
  let rejectPrimaryUnconfirmedWrites = true;
  const guardedPrimary = {
    get length() {
      return primary.length;
    },
    getItem(key: string) {
      return primary.getItem(key);
    },
    key(index: number) {
      return primary.key(index);
    },
    removeItem(key: string) {
      primary.removeItem(key);
    },
    setItem(key: string, value: string) {
      if (
        rejectPrimaryUnconfirmedWrites &&
        key.startsWith(unconfirmedLearningAnalyticsOutboxStorageKey(userId))
      ) throw new Error("quota");
      primary.setItem(key, value);
    }
  };

  assert.equal(
    persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback(
      guardedPrimary,
      fallback,
      userId,
      [postBoundary]
    ),
    "fallback"
  );
  const cleared = clearLearningAnalyticsDurabilityFallbackBeforeBoundary(
    fallback,
    userId,
    fence.requestId
  );
  assert.deepEqual(cleared, { status: "cleared", cleared: 1 });
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(fallback, userId).map(({ id }) => id),
    [postBoundary.id]
  );
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(fallback, "student-peer").map(({ id }) => id),
    [peer.id]
  );

  rejectPrimaryUnconfirmedWrites = false;
  const fencedRecovery = recoverLearningAnalyticsDurabilityFallback(
    guardedPrimary,
    fallback,
    userId,
    0
  );
  assert.deepEqual(fencedRecovery.recovered, []);
  assert.deepEqual(
    fencedRecovery.remaining.map(({ id }) => id),
    [postBoundary.id]
  );
  prepareLearningAnalyticsForwardGenerationTransition(
    guardedPrimary,
    userId,
    0,
    1,
    "2026-05-07T12:00:02.000Z",
    "fallback-clear-forward"
  );
  assert.equal(
    resumeLearningAnalyticsGenerationTransition(guardedPrimary, userId),
    "completed"
  );
  const recovery = recoverLearningAnalyticsDurabilityFallback(
    guardedPrimary,
    fallback,
    userId,
    0,
  );
  assert.deepEqual(recovery.recovered.map(({ id }) => id), [postBoundary.id]);
  assert.deepEqual(recovery.remaining, []);
  assert.deepEqual(
    readLearningAnalyticsOutbox(primary, userId, 1).map(({ id }) => id),
    [postBoundary.id]
  );
});

test("a peer tab cannot resurrect private pre-clear fallback rows into a newer shared generation", () => {
  const shared = memoryStorage();
  const tabBFallback = memoryStorage();
  const userId = "student-private-fallback-peer-clear";
  replaceLearningAnalyticsGeneration(shared, userId, 1);
  const rejectPrimaryWrites = {
    get length() {
      return shared.length;
    },
    getItem(key: string) {
      return shared.getItem(key);
    },
    key(index: number) {
      return shared.key(index);
    },
    removeItem(key: string) {
      shared.removeItem(key);
    },
    setItem(key: string, value: string) {
      if (
        key.startsWith(learningAnalyticsOutboxStorageKey(userId)) ||
        key.startsWith(unconfirmedLearningAnalyticsOutboxStorageKey(userId))
      ) throw new Error("tab B primary storage unavailable");
      shared.setItem(key, value);
    }
  };
  const beforeClear = event({ id: "tab-b-pre-clear" });
  assert.equal(
    learningAnalyticsModule.persistLearningAnalyticsEventsWithDurabilityFallback(
      rejectPrimaryWrites,
      tabBFallback,
      userId,
      [beforeClear],
      1
    ),
    "fallback"
  );

  const fence = beginLearningAnalyticsClearFence(
    shared,
    userId,
    1,
    "2026-05-07T12:00:01.000Z",
    "peer-clear-private-fallback"
  );
  const afterClear = event({
    id: beforeClear.id,
    timestamp: "2026-05-07T12:00:02.000Z"
  });
  assert.equal(
    learningAnalyticsModule.persistLearningAnalyticsEventsWithDurabilityFallback(
      rejectPrimaryWrites,
      tabBFallback,
      userId,
      [afterClear],
      1
    ),
    "fallback"
  );
  assert.equal(fence.requestId, "peer-clear-private-fallback");
  prepareLearningAnalyticsForwardGenerationTransition(
    shared,
    userId,
    1,
    2,
    "2026-05-07T12:00:03.000Z",
    "forward-private-fallback"
  );
  assert.equal(resumeLearningAnalyticsGenerationTransition(shared, userId), "completed");

  const recovery = recoverLearningAnalyticsDurabilityFallback(
    shared,
    tabBFallback,
    userId,
    2
  );
  assert.deepEqual(recovery.discarded.map(({ timestamp }) => timestamp), [beforeClear.timestamp]);
  assert.deepEqual(recovery.recovered.map(({ timestamp }) => timestamp), [afterClear.timestamp]);
  assert.deepEqual(recovery.remaining, []);
  assert.deepEqual(
    readLearningAnalyticsOutbox(shared, userId, 2).map(({ id }) => id),
    [afterClear.id]
  );
  assert.equal(
    readLearningAnalyticsOutbox(shared, userId, 2)[0]?.timestamp,
    afterClear.timestamp
  );
});

test("fallback recovery ignores a stale caller generation and trusts the shared authoritative generation", () => {
  const primary = memoryStorage();
  const fallback = memoryStorage();
  const userId = "student-stale-recovery-argument";
  replaceLearningAnalyticsGeneration(primary, userId, 1);
  const stale = withLearningAnalyticsDeliveryGeneration(
    event({ id: "stale-private-row" }),
    1
  );
  mergeUnconfirmedLearningAnalyticsOutbox(fallback, userId, [stale]);
  replaceLearningAnalyticsGeneration(primary, userId, 2);

  const recovery = recoverLearningAnalyticsDurabilityFallback(
    primary,
    fallback,
    userId,
    1
  );
  assert.deepEqual(recovery.recovered, []);
  assert.deepEqual(recovery.discarded.map(({ id }) => id), [stale.id]);
  assert.deepEqual(recovery.remaining, []);
  assert.deepEqual(readLearningAnalyticsOutbox(primary, userId, 2), []);
});

test("private fallback recovery cannot borrow a clear token that appears mid-recovery", () => {
  const primary = memoryStorage();
  const fallback = memoryStorage();
  const userId = "student-fallback-mid-clear";
  replaceLearningAnalyticsGeneration(primary, userId, 1);
  const preClear = withLearningAnalyticsDeliveryGeneration(
    event({ id: "private-pre-clear" }),
    1
  );
  mergeUnconfirmedLearningAnalyticsOutbox(fallback, userId, [preClear]);
  let clearStarted = false;
  const interleavingPrimary = {
    get length() {
      return primary.length;
    },
    getItem(key: string) {
      return primary.getItem(key);
    },
    key(index: number) {
      return primary.key(index);
    },
    removeItem(key: string) {
      primary.removeItem(key);
    },
    setItem(key: string, value: string) {
      primary.setItem(key, value);
      if (
        !clearStarted &&
        key.startsWith(unconfirmedLearningAnalyticsOutboxStorageKey(userId))
      ) {
        clearStarted = true;
        beginLearningAnalyticsClearFence(
          primary,
          userId,
          1,
          "2026-05-07T12:00:01.000Z",
          "clear-mid-fallback-recovery"
        );
      }
    }
  };

  const recovery = recoverLearningAnalyticsDurabilityFallback(
    interleavingPrimary,
    fallback,
    userId,
    1
  );
  assert.equal(clearStarted, true);
  assert.deepEqual(recovery.recovered, []);
  assert.deepEqual(recovery.remaining.map(({ id }) => id), [preClear.id]);
  prepareLearningAnalyticsForwardGenerationTransition(
    interleavingPrimary,
    userId,
    1,
    2,
    "2026-05-07T12:00:02.000Z",
    "forward-after-fallback-recovery-race"
  );
  assert.equal(
    resumeLearningAnalyticsGenerationTransition(interleavingPrimary, userId),
    "completed"
  );
  assert.deepEqual(readLearningAnalyticsOutbox(primary, userId, 2), []);
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(primary, userId), []);
  assert.deepEqual(
    readUnconfirmedLearningAnalyticsOutbox(fallback, userId).map(({ id }) => id),
    [preClear.id]
  );
});

test("volatile recovery cannot borrow a clear token that appears mid-recovery", () => {
  const primary = memoryStorage();
  const userId = "student-volatile-mid-clear";
  replaceLearningAnalyticsGeneration(primary, userId, 1);
  const preClear = event({ id: "volatile-pre-clear" });
  let clearStarted = false;
  const interleavingPrimary = {
    get length() {
      return primary.length;
    },
    getItem(key: string) {
      return primary.getItem(key);
    },
    key(index: number) {
      return primary.key(index);
    },
    removeItem(key: string) {
      primary.removeItem(key);
    },
    setItem(key: string, value: string) {
      primary.setItem(key, value);
      if (
        !clearStarted &&
        key.startsWith(unconfirmedLearningAnalyticsOutboxStorageKey(userId))
      ) {
        clearStarted = true;
        beginLearningAnalyticsClearFence(
          primary,
          userId,
          1,
          "2026-05-07T12:00:01.000Z",
          "clear-mid-volatile-recovery"
        );
      }
    }
  };

  assert.equal(
    recoverLearningAnalyticsVolatileEvent(
      interleavingPrimary,
      userId,
      preClear,
      1,
      null,
      1
    ),
    "deferred"
  );
  prepareLearningAnalyticsForwardGenerationTransition(
    interleavingPrimary,
    userId,
    1,
    2,
    "2026-05-07T12:00:02.000Z",
    "forward-after-volatile-recovery-race"
  );
  assert.equal(
    resumeLearningAnalyticsGenerationTransition(interleavingPrimary, userId),
    "completed"
  );
  assert.deepEqual(readLearningAnalyticsOutbox(primary, userId, 2), []);
  assert.deepEqual(readUnconfirmedLearningAnalyticsOutbox(primary, userId), []);
});

test("AppProviders persists lifecycle analytics locally and sends them from the regular queue", async () => {
  const source = await readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");
  const callbackStart = source.indexOf("const recordLearningEvent = useCallback");
  const highFrequencyCheckIndex = source.indexOf("isHighFrequencyLearningAnalyticsEvent", callbackStart);
  const immediateHighFrequencyDurabilityIndex = source.indexOf(
    "persistLearningAnalyticsEventsWithDurabilityFallback(\n          window.localStorage,\n          window.sessionStorage,\n          recordingUserId,",
    highFrequencyCheckIndex
  );
  const immediatePendingIndex = source.indexOf("setPendingLearningEvents", callbackStart);
  const lifecycleStart = source.indexOf("const persistLearningAnalyticsOnPageExit = useCallback");
  const freezeStart = source.indexOf("const freezeLearningAnalyticsIdentity = useCallback", lifecycleStart);
  const exitListenerStart = source.indexOf("const finalizeAndPauseLearningAnalytics = useCallback", freezeStart);
  const regularFlushStart = source.indexOf(
    "pendingLearningEvents.length === 0",
    lifecycleStart
  );
  const persistenceSource = source.slice(lifecycleStart, freezeStart);
  const exitListenerSource = source.slice(exitListenerStart, regularFlushStart);
  const postIndex = source.indexOf('fetch("/api/learning-events", {', regularFlushStart);
  const successGuardIndex = source.indexOf("if (!isDurableLearningAnalyticsDeliveryResponse(", postIndex);
  const acknowledgeIndex = source.indexOf("acknowledgeLearningAnalyticsOutbox", successGuardIndex);

  assert.notEqual(callbackStart, -1, "AppProviders should expose recordLearningEvent.");
  assert.notEqual(highFrequencyCheckIndex, -1, "AppProviders should detect high-frequency visualization events.");
  assert.notEqual(
    immediateHighFrequencyDurabilityIndex,
    -1,
    "High-frequency interactions must reach exact-user durable storage before their timer."
  );
  assert.notEqual(immediatePendingIndex, -1, "AppProviders should still enqueue normal events immediately.");
  assert.ok(
    callbackStart < highFrequencyCheckIndex &&
      highFrequencyCheckIndex < immediateHighFrequencyDurabilityIndex &&
      immediateHighFrequencyDurabilityIndex < immediatePendingIndex,
    "Visualization slider, drag, and probe events should be durable before buffered delivery and normal pending-event enqueueing."
  );
  assert.notEqual(lifecycleStart, -1, "AppProviders should define a page-exit persistence callback.");
  assert.notEqual(regularFlushStart, -1, "AppProviders should retain the regular one-second delivery queue.");
  assert.match(exitListenerSource, /window\.addEventListener\("pagehide", finalizeAndPauseLearningAnalytics\)/);
  assert.match(exitListenerSource, /window\.addEventListener\("beforeunload", finalizeAndPauseLearningAnalytics\)/);
  assert.match(
    exitListenerSource,
    /const finalizeAndPauseLearningAnalytics = useCallback\(\(\) => \{\s*finalizeVisibleAnalyticsRef\.current\?\.\(\);\s*pauseLearningAnalyticsDelivery\(\);/
  );
  assert.match(persistenceSource, /const pauseLearningAnalyticsDelivery = useCallback[\s\S]*?persistLearningAnalyticsOnPageExit\(\)/);
  assert.match(
    persistenceSource,
    /persistLearningAnalyticsEventsWithDurabilityFallback\([\s\S]*window\.localStorage,[\s\S]*window\.sessionStorage,[\s\S]*analyticsOwnerIdentity\.userId,[\s\S]*events,[\s\S]*analyticsServerGenerationRef\.current/
  );
  assert.match(
    persistenceSource,
    /isCurrentLearningAnalyticsIdentity\(analyticsIdentityRef\.current, analyticsOwnerIdentity\)/
  );
  assert.doesNotMatch(exitListenerSource, /visibilitychange/);
  assert.doesNotMatch(exitListenerSource, /fetch\(/);
  assert.doesNotMatch(exitListenerSource, /sendBeacon/);
  assert.match(source, /window\.addEventListener\("pageshow", handlePageShow\)/);
  assert.equal(source.includes('sendBeacon("/api/learning-events"'), false);
  assert.doesNotMatch(source, /new AbortController\(\)/);
  assert.equal(source.includes("if (response.status === 400) return;"), false);
  assert.match(source, /"X-MAIS-Analytics-User-Id": encodeURIComponent\(flushUserId\)/);
  assert.match(source.slice(postIndex, successGuardIndex), /keepalive: true/);
  assert.match(
    source.slice(postIndex, successGuardIndex),
    /generation: flushServerGeneration,\s*events: events\.map\(learningAnalyticsEventForDelivery\)/
  );
  assert.match(
    source.slice(successGuardIndex, acknowledgeIndex),
    /delivery,\s*flushUserId,\s*flushServerGeneration,\s*eventIds/
  );
  assert.ok(
    postIndex < successGuardIndex && successGuardIndex < acknowledgeIndex,
    "Only a successful regular POST may acknowledge durable outbox records."
  );
});

test("AppProviders explicit terminal drain bypasses only the normal debounce and keeps durable ACK semantics", async () => {
  const source = await readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");
  const listenerStart = source.indexOf("const flushForAcceptance = () => {");
  const listenerEnd = source.indexOf("window.addEventListener(\n      learningAnalyticsFlushRequestedEventName", listenerStart);
  const deliveryStart = source.indexOf("const deliveryIdentity = analyticsIdentityRef.current;", listenerEnd);
  const deliveryEnd = source.indexOf("useEffect(() => {\n    if (!settingsReady || currentUser?.role !== \"student\") return;", deliveryStart);
  const listenerSource = source.slice(listenerStart, listenerEnd);
  const deliverySource = source.slice(deliveryStart, deliveryEnd);

  assert.match(listenerSource, /clearAnalyticsDeliveryHandle\(\);/);
  assert.match(
    listenerSource,
    /const drainEventIds = drainIdentity\.userId[\s\S]*readLearningAnalyticsOutbox\([\s\S]*readUnconfirmedLearningAnalyticsOutbox\([\s\S]*analyticsImmediateDeliveryRequestedRef\.current =[\s\S]*drainEventIds\.size > 0[\s\S]*\{ \.\.\.drainIdentity, eventIds: drainEventIds \}[\s\S]*: null;[\s\S]*setAnalyticsDeliveryCycle/
  );
  assert.doesNotMatch(listenerSource, /analyticsImmediateDeliveryRequestedRef\.current = true/);
  assert.match(
    deliverySource,
    /const immediateDrain = analyticsImmediateDeliveryRequestedRef\.current;[\s\S]*isCurrentLearningAnalyticsIdentity\(deliveryIdentity, immediateDrain\)[\s\S]*pendingLearningEvents\.some\(\(event\) => immediateDrain\.eventIds\.has\(event\.id\)\)[\s\S]*\? 0[\s\S]*: 1_000;/
  );
  assert.match(
    deliverySource,
    /analyticsDeliveryHandleRef\.current = window\.setTimeout\([\s\S]*\}, deliveryDelayMs\);/
  );
  assert.match(
    deliverySource,
    /isDurableLearningAnalyticsDeliveryResponse\([\s\S]*const remainingAfterAcknowledgement = acknowledgeLearningAnalyticsOutbox\([\s\S]*remainingAfterAcknowledgement\.some\(\(event\) => eventIds\.has\(event\.id\)\)[\s\S]*remainingAfterAcknowledgement\.length === 0[\s\S]*analyticsImmediateDeliveryRequestedRef\.current = null[\s\S]*eventIds\.forEach\(\(eventId\) => activeDrain\.eventIds\.delete\(eventId\)\)/
  );
  assert.match(
    deliverySource,
    /\.catch\(\(\) => \{\s*analyticsImmediateDeliveryRequestedRef\.current = null;/
  );
});

test("AppProviders confirms the server generation before delivering fresh-device events", async () => {
  const source = await readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");
  const recordStart = source.indexOf("const recordLearningEvent = useCallback");
  const handshakeStart = source.indexOf("const handshakeUserId = currentUser.id;");
  const handshakePost = source.indexOf('fetch("/api/learning-events", {', handshakeStart);
  const emptyBatch = source.indexOf(
    "body: JSON.stringify({ generation: handshakeGeneration, events: [] })",
    handshakePost
  );
  const exactEmptyAck = source.indexOf("new Set<string>()", emptyBatch);
  const confirmPending = source.indexOf(
    "confirmLearningAnalyticsGenerationHandshake(",
    exactEmptyAck
  );
  const markReady = source.indexOf(
    "activateLearningAnalyticsGeneration(handshakeUserId, handshakeGeneration)",
    confirmPending
  );
  const regularDeliveryGate = source.indexOf(
    "analyticsGenerationReadyIdentityRef.current,\n        analyticsIdentityRef.current",
    markReady
  );
  const regularPost = source.indexOf('fetch("/api/learning-events", {', regularDeliveryGate);
  const readyCycleState = source.indexOf(
    "const [analyticsGenerationReadyCycle, setAnalyticsGenerationReadyCycle] = useState(0)"
  );
  const readyCycleAdvance = source.indexOf(
    "setAnalyticsGenerationReadyCycle((current) => current + 1)",
    source.indexOf("const activateLearningAnalyticsGeneration = useCallback")
  );
  const pageViewGate = source.indexOf(
    "const pageViewIdentity = analyticsIdentityRef.current",
    readyCycleAdvance
  );
  const pageViewRecord = source.indexOf(
    'recordLearningEvent({ type: "page-view", source, topicId })',
    pageViewGate
  );

  assert.ok(recordStart !== -1 && handshakeStart !== -1);
  assert.match(
    source.slice(recordStart, handshakeStart),
    /!generationIsConfirmed[\s\S]*persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback\([\s\S]*return persistedAs;[\s\S]*withLearningAnalyticsDeliveryGeneration/
  );
  assert.ok(
    handshakePost < emptyBatch &&
      emptyBatch < exactEmptyAck &&
      exactEmptyAck < confirmPending &&
      confirmPending < markReady &&
      markReady < regularDeliveryGate &&
      regularDeliveryGate < regularPost,
    "The exact empty-batch handshake must confirm/rebase pending rows before the ordinary POST gate opens."
  );
  assert.match(
    source.slice(handshakeStart, regularDeliveryGate),
    /readLearningAnalyticsGenerationMismatchReceipt\([\s\S]*adoptLearningAnalyticsForwardGeneration[\s\S]*adoptLearningAnalyticsLowerGeneration/
  );
  const handshakeSource = source.slice(handshakeStart, regularDeliveryGate);
  assert.match(source.slice(handshakePost, emptyBatch), /keepalive: true/);
  assert.match(handshakeSource, /const retryLater = \(\) => \{/);
  assert.match(handshakeSource, /Math\.min\(8_000/);
  assert.match(handshakeSource, /if \(!cancelled\) retryLater\(\)/);
  assert.ok(
    readyCycleState !== -1 &&
      readyCycleAdvance !== -1 &&
      pageViewGate !== -1 &&
      pageViewRecord !== -1 &&
      readyCycleState < readyCycleAdvance &&
      readyCycleAdvance < pageViewGate &&
      pageViewGate < pageViewRecord,
    "The initial page-view must rerun only after the authoritative generation becomes ready."
  );
  const pageViewSource = source.slice(pageViewGate, source.indexOf("useEffect(() => {", pageViewRecord));
  assert.match(
    pageViewSource,
    /isCurrentLearningAnalyticsIdentity\([\s\S]*analyticsGenerationReadyIdentityRef\.current,[\s\S]*pageViewIdentity/
  );
  assert.match(
    pageViewSource,
    /learningAnalyticsClientProtocolStatus\([\s\S]*currentUser\.id[\s\S]*!== "open"/
  );
  assert.match(
    pageViewSource,
    /const outcome = recordLearningEvent[\s\S]*if \(outcome === "ignored"\) return;[\s\S]*recordedPageViewTokenRef\.current = pageVisitToken/
  );
});

test("AppProviders scopes learning-event flights by exact identity, epoch, and generation", async () => {
  const source = await readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");
  const lateResponseFence = source.indexOf(
    "analyticsDeliveryInFlightRef.current?.token !== flight.token"
  );
  const lateResponseAcknowledgement = source.indexOf(
    "acknowledgeLearningAnalyticsOutbox(",
    lateResponseFence
  );
  assert.match(
    source,
    /type LearningAnalyticsDeliveryFlight = LearningAnalyticsIdentity & \{\s*generation: number;\s*token: number;/
  );
  assert.match(
    source,
    /activeFlight\.userId === deliveryIdentity\.userId[\s\S]*activeFlight\.clientEpoch === deliveryIdentity\.clientEpoch[\s\S]*activeFlight\.generation === deliveryGeneration/
  );
  assert.match(
    source,
    /if \(analyticsDeliveryInFlightRef\.current\?\.token === flight\.token\) \{\s*analyticsDeliveryInFlightRef\.current = null;/
  );
  assert.match(
    source,
    /isCurrentLearningAnalyticsIdentity\(\s*analyticsIdentityRef\.current,\s*flight\s*\)[\s\S]*analyticsServerGenerationRef\.current === flight\.generation/
  );
  assert.ok(
    lateResponseFence !== -1 &&
      lateResponseAcknowledgement !== -1 &&
      lateResponseFence < lateResponseAcknowledgement,
    "A late response must pass the exact flight token fence before it can delete durable keys."
  );
});

test("AppProviders clear fences identity, local queues, and the exact server generation", async () => {
  const source = await readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");
  const clearStart = source.indexOf("const clearLearningAnalytics = useCallback");
  const clearEnd = source.indexOf("\n\n  const value = useMemo", clearStart);
  const clearSource = source.slice(clearStart, clearEnd);
  const finalizeIndex = clearSource.indexOf("finalizeVisibleAnalyticsRef.current?.();");
  const epochIndex = clearSource.indexOf("analyticsFlushGenerationRef.current = clearGeneration;");
  const flightEpochIndex = clearSource.indexOf("analyticsDeliveryFlightSequenceRef.current += 1;");
  const clearFlightIndex = clearSource.indexOf("analyticsDeliveryInFlightRef.current = null;");
  const pauseIndex = clearSource.indexOf("analyticsDeliveryPausedRef.current = true;");
  const fenceIndex = clearSource.indexOf("beginLearningAnalyticsClearFence(");
  const localClearIndex = clearSource.indexOf("clearLearningAnalyticsOutbox(");
  const attemptedIndex = clearSource.indexOf("markLearningAnalyticsClearDeleteAttempted(");
  const deleteIndex = clearSource.indexOf('fetch("/api/learning-events", {');
  const strictAckIndex = clearSource.indexOf("isLearningAnalyticsClearAcknowledgement(", deleteIndex);
  const transitionIndex = clearSource.indexOf("adoptLearningAnalyticsForwardGeneration(", strictAckIndex);

  assert.ok(
    clearStart !== -1 &&
      clearEnd !== -1 &&
      finalizeIndex < epochIndex &&
      epochIndex < flightEpochIndex &&
      flightEpochIndex < clearFlightIndex &&
      clearFlightIndex < pauseIndex &&
      pauseIndex < fenceIndex &&
      fenceIndex < localClearIndex &&
      localClearIndex < attemptedIndex &&
      attemptedIndex < deleteIndex &&
      deleteIndex < strictAckIndex &&
      strictAckIndex < transitionIndex
  );
  assert.match(clearSource, /analyticsClearRequestSequenceRef\.current = clearRequestSequence/);
  assert.match(clearSource, /pendingLearningEventsRef\.current = \[\]/);
  assert.match(clearSource, /highFrequencyLearningEventsRef\.current = \[\]/);
  assert.match(clearSource, /setLearningAnalyticsEvents\(\[\]\)/);
  assert.match(clearSource, /setPendingLearningEvents\(\[\]\)/);
  assert.match(
    clearSource,
    /method: "DELETE",\s*headers: \{\s*"X-MAIS-Analytics-User-Id": encodeURIComponent\(clearUserId\)/
  );
  assert.match(clearSource, /isLearningAnalyticsClearAcknowledgement\([\s\S]*clearUserId,[\s\S]*clearFence\.baseGeneration/);
  assert.match(clearSource, /analyticsDeliveryInFlightRef\.current = null/);
  assert.match(clearSource, /withLearningAnalyticsClearLock\(clearUserId, async \(\) =>/);
  assert.match(clearSource, /analyticsDirectClearInFlightRef\.current = \{/);
  assert.match(
    clearSource,
    /clearLearningAnalyticsOutbox\(\s*window\.localStorage,\s*clearUserId,\s*clearFence\.clearedStorageKeys\s*\)/
  );
  assert.doesNotMatch(clearSource, /AbortController|\.abort\(\)/);
});

test("AppProviders gates record, lifecycle, delivery, and peer-clear paths on the durable exact-user protocol", async () => {
  const source = await readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");
  const recordStart = source.indexOf("const recordLearningEvent = useCallback");
  const recordEnd = source.indexOf("const refreshMistakeRecords", recordStart);
  const lifecycleStart = source.indexOf("const persistLearningAnalyticsOnPageExit = useCallback");
  const lifecycleEnd = source.indexOf("const pauseLearningAnalyticsDelivery", lifecycleStart);
  const deliveryStart = source.indexOf("const deliveryIdentity = analyticsIdentityRef.current;");
  const deliveryEnd = source.indexOf("const flushUserId = currentUser.id;", deliveryStart);
  const storageListenerStart = source.indexOf("const handleGenerationChange = (event: StorageEvent)");
  const storageListenerEnd = source.indexOf("window.addEventListener(\"storage\"", storageListenerStart);

  assert.match(
    source.slice(recordStart, recordEnd),
    /learningAnalyticsClientProtocolStatus\(\s*window\.localStorage,\s*recordingUserId\s*\)[\s\S]*persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback/
  );
  assert.match(
    source.slice(lifecycleStart, lifecycleEnd),
    /persistLearningAnalyticsEventsWithDurabilityFallback[\s\S]*persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback/
  );
  assert.match(
    source.slice(deliveryStart, deliveryEnd),
    /learningAnalyticsClientProtocolStatus\(window\.localStorage, deliveryIdentity\.userId\) !== "open"/
  );
  assert.match(
    source.slice(storageListenerStart, storageListenerEnd),
    /event\.key !== clearFenceKey[\s\S]*event\.key !== handshakeKey[\s\S]*event\.key !== transitionKey[\s\S]*invalidateLearningAnalyticsGenerationReadiness[\s\S]*requestLearningAnalyticsGenerationHandshake\(\)/
  );
  assert.match(
    source.slice(0, storageListenerStart),
    /const handshakeKey = learningAnalyticsGenerationHandshakeStorageKey\([\s\S]*currentUser\.id[\s\S]*\);/
  );
  assert.match(source, /beginLearningAnalyticsGenerationHandshake\(/);
  assert.match(source, /readLearningAnalyticsGenerationMismatchReceipt\(/);
  assert.match(source, /finishLearningAnalyticsLowerGenerationRecovery\(/);
  assert.match(source, /resumeLearningAnalyticsGenerationTransition\(/);
  assert.match(
    source,
    /return withRequiredLearningAnalyticsClearLock\(\s*navigator\.locks,\s*userId,\s*task\s*\)/
  );
  const handshakeLock = source.indexOf("withLearningAnalyticsClearLock(handshakeUserId", storageListenerEnd);
  const handshakePost = source.indexOf('fetch("/api/learning-events", {', handshakeLock);
  assert.ok(
    handshakeLock !== -1 && handshakeLock < handshakePost,
    "Every fenced cross-tab handshake must hold the exact-user Web Lock before POST/DELETE."
  );
});

test("AppProviders serializes every production generation transition mutation under the exact-user Web Lock", async () => {
  const source = await readFile(
    path.join(process.cwd(), "components/providers/AppProviders.tsx"),
    "utf8"
  );
  const indexesOf = (needle: string) => {
    const indexes: number[] = [];
    let cursor = 0;
    while (true) {
      const index = source.indexOf(needle, cursor);
      if (index === -1) return indexes;
      indexes.push(index);
      cursor = index + needle.length;
    }
  };
  const inside = (index: number, start: number, end: number) =>
    index >= start && index < end;

  const forwardStart = source.indexOf(
    "const adoptLearningAnalyticsForwardGeneration = useCallback"
  );
  const lowerStart = source.indexOf(
    "const adoptLearningAnalyticsLowerGeneration = useCallback",
    forwardStart
  );
  const storageListenerStart = source.indexOf(
    "const handleGenerationChange = (event: StorageEvent)",
    lowerStart
  );
  const storageListenerEnd = source.indexOf(
    "window.addEventListener(\"storage\"",
    storageListenerStart
  );
  const handshakeStart = source.indexOf("const runHandshake = async", storageListenerEnd);
  const handshakeEnd = source.indexOf("const handleOnlineOrVisible", handshakeStart);
  const deliveryStart = source.indexOf(
    "const flushUserId = currentUser.id;",
    handshakeEnd
  );
  const deliveryEnd = source.indexOf(
    "const refreshMistakeRecordsAfterAttempt = useCallback",
    deliveryStart
  );
  const clearStart = source.indexOf("const clearLearningAnalytics = useCallback", deliveryEnd);
  const clearEnd = source.indexOf("\n\n  const value = useMemo", clearStart);

  assert.ok(
    [
      forwardStart,
      lowerStart,
      storageListenerStart,
      storageListenerEnd,
      handshakeStart,
      handshakeEnd,
      deliveryStart,
      deliveryEnd,
      clearStart,
      clearEnd
    ].every((index) => index !== -1),
    "The transition ownership slices must remain discoverable."
  );

  const resumeCalls = indexesOf("resumeLearningAnalyticsGenerationTransition(");
  const prepareForwardCalls = indexesOf(
    "prepareLearningAnalyticsForwardGenerationTransition("
  );
  const finishLowerCalls = indexesOf("finishLearningAnalyticsLowerGenerationRecovery(");
  const adoptForwardCalls = indexesOf("adoptLearningAnalyticsForwardGeneration(");
  const adoptLowerCalls = indexesOf("adoptLearningAnalyticsLowerGeneration(");

  assert.equal(resumeCalls.length, 2);
  assert.ok(inside(resumeCalls[0]!, forwardStart, lowerStart));
  assert.ok(inside(resumeCalls[1]!, handshakeStart, handshakeEnd));
  assert.deepEqual(prepareForwardCalls.length, 1);
  assert.ok(inside(prepareForwardCalls[0]!, forwardStart, lowerStart));
  assert.deepEqual(finishLowerCalls.length, 1);
  assert.ok(inside(finishLowerCalls[0]!, lowerStart, storageListenerStart));
  assert.doesNotMatch(
    source.slice(storageListenerStart, storageListenerEnd),
    /resumeLearningAnalyticsGenerationTransition|prepareLearningAnalyticsGenerationTransition|finishLearningAnalyticsLowerGenerationRecovery/
  );

  const handshakeSource = source.slice(handshakeStart, handshakeEnd);
  assert.match(
    handshakeSource,
    /if \(!clearLockHeld\) \{[\s\S]*await withLearningAnalyticsClearLock\(handshakeUserId, async \(\) => \{[\s\S]*await runHandshake\(true\);[\s\S]*return;[\s\S]*const resumedTransition = resumeLearningAnalyticsGenerationTransition\(/
  );
  assert.equal(indexesOf("runHandshake(true)").length, 1);

  assert.equal(adoptForwardCalls.length, 5);
  assert.equal(
    adoptForwardCalls.filter((index) => inside(index, handshakeStart, handshakeEnd)).length,
    3
  );
  assert.equal(
    adoptForwardCalls.filter((index) => inside(index, deliveryStart, deliveryEnd)).length,
    1
  );
  assert.equal(
    adoptForwardCalls.filter((index) => inside(index, clearStart, clearEnd)).length,
    1
  );
  assert.equal(adoptLowerCalls.length, 1);
  assert.ok(inside(adoptLowerCalls[0]!, handshakeStart, handshakeEnd));

  assert.match(
    source.slice(deliveryStart, deliveryEnd),
    /await withLearningAnalyticsClearLock\(\s*flushUserId,\s*async \(\) => adoptLearningAnalyticsForwardGeneration\(/
  );
  assert.match(
    source.slice(clearStart, clearEnd),
    /withLearningAnalyticsClearLock\(clearUserId, async \(\) => \{[\s\S]*adoptLearningAnalyticsForwardGeneration\(/
  );
});

test("AppProviders accepts deterministic completion identity only with an honest durability result", async () => {
  const source = await readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");
  const recordStart = source.indexOf("const recordLearningEvent = useCallback");
  const recordEnd = source.indexOf("const refreshMistakeRecords", recordStart);
  const recordSource = source.slice(recordStart, recordEnd);

  assert.match(
    source,
    /export type LearningAnalyticsRecordOptions = \{\s*eventId\?: string;\s*eventTimestamp\?: string;/
  );
  assert.match(
    source,
    /export type LearningAnalyticsRecordResult =[\s\S]*"ignored"[\s\S]*"confirmed"[\s\S]*"unconfirmed"[\s\S]*"fallback"[\s\S]*"volatile"/
  );
  assert.match(
    recordSource,
    /const hasEventId = typeof options\.eventId !== "undefined";[\s\S]*const hasEventTimestamp = typeof options\.eventTimestamp !== "undefined";[\s\S]*hasEventId !== hasEventTimestamp/
  );
  assert.match(
    recordSource,
    /isCanonicalLearningAnalyticsRecordOption\(options\.eventId, "eventId"\)[\s\S]*isCanonicalLearningAnalyticsRecordOption\([\s\S]*options\.eventTimestamp,[\s\S]*"eventTimestamp"/
  );
  assert.match(
    recordSource,
    /options\.eventId \? \{ id: options\.eventId \}[\s\S]*options\.eventTimestamp \? \{ timestamp: options\.eventTimestamp \}/
  );
  assert.match(
    recordSource,
    /persistUnconfirmedLearningAnalyticsEventsWithDurabilityFallback\([\s\S]*persistedAs = "volatile"[\s\S]*return persistedAs;[\s\S]*persistLearningAnalyticsEventsWithDurabilityFallback\([\s\S]*return "confirmed";[\s\S]*return appendLearningEventsToQueues/
  );
});

test("AppProviders leaves dynamic lesson warmup to the navigation owner", async () => {
  const source = await readFile(
    path.join(process.cwd(), "components/providers/AppProviders.tsx"),
    "utf8"
  );
  assert.doesNotMatch(source, /router\.prefetch\(/);
  assert.match(source, /setLessonEntryTarget\(sessionLessonEntryTarget\)/);
  assert.match(source, /const studentLessonHref = currentUser\?\.role === "student"/);
});

test("AppProviders installs remote causal boundaries before finalization and keeps session retries wakeable", async () => {
  const source = await readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");
  const adoptStart = source.indexOf("const adoptLearningAnalyticsForwardGeneration = useCallback");
  const adoptEnd = source.indexOf("const adoptLearningAnalyticsLowerGeneration = useCallback", adoptStart);
  const adoptSource = source.slice(adoptStart, adoptEnd);
  const prepareIndex = adoptSource.indexOf("prepareLearningAnalyticsForwardGenerationTransition(");
  const freezeIndex = adoptSource.indexOf(
    "freezeLearningAnalyticsIdentity({ persistQueuedEvents: false });"
  );
  const resumeIndex = adoptSource.indexOf("resumeLearningAnalyticsGenerationTransition(");
  assert.ok(
    prepareIndex !== -1 &&
      freezeIndex !== -1 &&
      resumeIndex !== -1 &&
      prepareIndex < freezeIndex &&
      freezeIndex < resumeIndex,
    "The ID marker must precede terminal event creation, and resume must follow that finalization."
  );
  assert.match(
    adoptSource,
    /Re-persisting the old in-memory[\s\S]*freezeLearningAnalyticsIdentity\(\{ persistQueuedEvents: false \}\)/
  );

  const storageListenerStart = source.indexOf(
    "const handleGenerationChange = (event: StorageEvent)"
  );
  const storageListenerEnd = source.indexOf(
    'window.addEventListener("storage", handleGenerationChange)',
    storageListenerStart
  );
  const storageListenerSource = source.slice(storageListenerStart, storageListenerEnd);
  assert.match(
    storageListenerSource,
    /event\.newValue !== null[\s\S]*event\.key === clearFenceKey[\s\S]*event\.key === handshakeKey[\s\S]*event\.key === transitionKey[\s\S]*freezeLearningAnalyticsIdentity\(\{ persistQueuedEvents: false \}\)/,
    "A peer-owned marker is already the physical writer boundary; freezing after it must not restamp old React rows with the peer token."
  );

  const learningDeliveryStart = source.indexOf(
    "const deliveryIdentity = analyticsIdentityRef.current;"
  );
  const learningDeliveryEnd = source.indexOf(
    "const refreshMistakeRecordsAfterAttempt = useCallback",
    learningDeliveryStart
  );
  const learningDeliverySource = source.slice(
    learningDeliveryStart,
    learningDeliveryEnd
  );
  assert.match(
    learningDeliverySource,
    /const adopted = await withLearningAnalyticsClearLock\([\s\S]*adoptLearningAnalyticsForwardGeneration\([\s\S]*if \(!adopted\) \{[\s\S]*freezeLearningAnalyticsIdentity\(\{ persistQueuedEvents: false \}\);\s*requestLearningAnalyticsGenerationHandshake\(\);/,
    "A failed forward adoption may already have installed a marker, so its fallback must never re-persist the pre-marker React queue."
  );

  const pauseSetterStart = source.indexOf("const setLearningAnalyticsDeliveryPaused = useCallback");
  const pauseSetterEnd = source.indexOf("const invalidateLearningAnalyticsGenerationReadiness", pauseSetterStart);
  const pauseSetterSource = source.slice(pauseSetterStart, pauseSetterEnd);
  assert.match(pauseSetterSource, /learningAnalyticsDeliveryPauseTransition\(/);
  assert.match(
    pauseSetterSource,
    /transition\.wakeVisualizationSessions[\s\S]*window\.dispatchEvent\(new Event\(visualizationSessionOutboxUpdatedEventName\)\)/
  );

  const sessionStart = source.indexOf("const flushUserId = currentUser.id;", source.indexOf("readVisualizationSessionOutbox"));
  const sessionEnd = source.indexOf("const source = analyticsSourceForPath", sessionStart);
  const sessionSource = source.slice(sessionStart, sessionEnd);
  assert.match(
    sessionSource,
    /const effectUserIsCurrent = \(\) =>[\s\S]*currentUserRef\.current\.id === flushUserId[\s\S]*analyticsIdentityRef\.current\.userId === flushUserId;[\s\S]*const flushIdentity = analyticsIdentityRef\.current;[\s\S]*flushIdentity\.userId !== flushUserId[\s\S]*const sessionDeliveryIsCurrent = \(\) =>[\s\S]*isCurrentLearningAnalyticsIdentity\([\s\S]*flushIdentity/
  );
  assert.match(
    sessionSource,
    /await response\.json\(\)\.catch\(\(\) => null\);\s*if \(!sessionDeliveryIsCurrent\(\)\) break;[\s\S]*quarantineVisualizationSessionOutboxRecord\([\s\S]*record,[\s\S]*"server-rejected-400"[\s\S]*acknowledgeVisualizationSessionOutbox\(window\.localStorage, record\)/
  );
  assert.match(
    sessionSource,
    /if \(failed\) \{\s*retryAttempt \+= 1;[\s\S]*else \{\s*scheduleFlush\(visualizationSessionOutboxRetryDelayMs\(retryAttempt\)\);/
  );
  assert.match(
    sessionSource,
    /analyticsIdentityRef\.current\.userId !== flushUserId[\s\S]*currentUserRef\.current\?\.id !== flushUserId/
  );
});

test("AppProviders hands visualization delivery to the current same-user client epoch exactly once", async () => {
  const source = await readFile(
    path.join(process.cwd(), "components/providers/AppProviders.tsx"),
    "utf8"
  );
  const sessionStart = source.indexOf(
    "const flushUserId = currentUser.id;",
    source.indexOf("readVisualizationSessionOutbox")
  );
  const sessionEnd = source.indexOf("const setSelectedGrade = useCallback", sessionStart);
  const sessionSource = source.slice(sessionStart, sessionEnd);
  const revalidateStart = source.indexOf("const revalidateSession = useCallback");
  const revalidateEnd = source.indexOf("\n\n  useEffect(() => {", revalidateStart);
  const revalidateSource = source.slice(revalidateStart, revalidateEnd);
  const flushStart = sessionSource.indexOf("const flushOutbox = async () => {");
  const recordsStart = sessionSource.indexOf(
    "const records = readVisualizationSessionOutbox",
    flushStart
  );
  const perFlushPrelude = sessionSource.slice(flushStart, recordsStart);

  assert.match(
    perFlushPrelude,
    /const flushIdentity = analyticsIdentityRef\.current;\s*if \(!effectUserIsCurrent\(\) \|\| flushIdentity\.userId !== flushUserId\) return;\s*const sessionDeliveryIsCurrent = \(\) =>[\s\S]*isCurrentLearningAnalyticsIdentity\(\s*analyticsIdentityRef\.current,\s*flushIdentity\s*\)/
  );
  assert.doesNotMatch(sessionSource.slice(0, flushStart), /const flushIdentity =/);
  assert.match(
    sessionSource,
    /if \(!sessionDeliveryIsCurrent\(\)\) break;\s*const response = await fetch\("\/api\/visualization-sessions"/
  );
  assert.match(
    sessionSource,
    /await response\.json\(\)\.catch\(\(\) => null\);\s*if \(!sessionDeliveryIsCurrent\(\)\) break;/
  );
  assert.match(
    sessionSource,
    /catch \{\s*if \(!sessionDeliveryIsCurrent\(\)\) break;\s*failed = true;/
  );
  assert.match(
    sessionSource,
    /inFlight = false;\s*if \(!effectUserIsCurrent\(\)\) return;\s*if \(!isCurrentLearningAnalyticsIdentity\(\s*analyticsIdentityRef\.current,\s*flushIdentity\s*\)\) \{\s*scheduleFlush\(0\);\s*return;\s*\}\s*if \(failed\)/
  );
  assert.match(
    sessionSource,
    /acknowledgeVisualizationSessionOutbox\(window\.localStorage, record\)[\s\S]*dispatchSessionResult\(visualizationSessionOutboxAcknowledgedEventName, record\)/
  );
  assert.match(
    source.slice(sessionStart, source.indexOf("const setSelectedGrade = useCallback", sessionStart)),
    /\}, \[currentUser\?\.id, currentUser\?\.role, settingsReady\]\);/
  );
  assert.doesNotMatch(source, /visualizationSessionDeliveryCycle/);
  assert.match(
    sessionSource,
    /return \(\) => \{\s*cancelled = true;\s*clearRetryHandle\(\);\s*window\.removeEventListener\(visualizationSessionOutboxUpdatedEventName, handleOutboxUpdate\);\s*window\.removeEventListener\("online", handleOnlineOrVisible\);\s*window\.removeEventListener\("pageshow", handleOnlineOrVisible\);\s*document\.removeEventListener\("visibilitychange", handleOnlineOrVisible\);\s*\};/
  );
  assert.ok(
    revalidateSource.indexOf("freezeLearningAnalyticsIdentity();") !== -1 &&
      revalidateSource.indexOf("freezeLearningAnalyticsIdentity();") <
        revalidateSource.indexOf("applyAuthSession(session);")
  );

  type Identity = { userId: string; clientEpoch: number };
  const deliveryIsCurrent = (captured: Identity, active: Identity) =>
    captured.userId === active.userId && captured.clientEpoch === active.clientEpoch;
  const epochN = { userId: "student-a", clientEpoch: 7 };
  const sameUserEpochNPlusOne = { userId: "student-a", clientEpoch: 8 };
  const otherUserSameEpoch = { userId: "student-b", clientEpoch: 8 };
  const runFlight = (
    captured: Identity,
    identityBeforeFetch: Identity,
    identityAfterJson: Identity
  ) => {
    const receipt = {
      fetches: 0,
      acknowledgements: 0,
      acknowledgedEvents: 0,
      failedEvents: 0,
      zeroMsHandoffs: 0
    };
    const finish = (active: Identity) => {
      if (
        captured.userId === active.userId &&
        !deliveryIsCurrent(captured, active)
      ) receipt.zeroMsHandoffs += 1;
      return receipt;
    };

    if (!deliveryIsCurrent(captured, identityBeforeFetch)) {
      return finish(identityBeforeFetch);
    }
    receipt.fetches += 1;
    if (!deliveryIsCurrent(captured, identityAfterJson)) {
      return finish(identityAfterJson);
    }
    receipt.acknowledgements += 1;
    receipt.acknowledgedEvents += 1;
    return finish(identityAfterJson);
  };

  // Rotation after response.json but before ACK leaves the durable record and
  // hands it to one current-identity flush without emitting stale events.
  assert.deepEqual(runFlight(epochN, epochN, sameUserEpochNPlusOne), {
    fetches: 1,
    acknowledgements: 0,
    acknowledgedEvents: 0,
    failedEvents: 0,
    zeroMsHandoffs: 1
  });
  // Rotation before fetch never starts the stale network request.
  assert.deepEqual(runFlight(epochN, sameUserEpochNPlusOne, sameUserEpochNPlusOne), {
    fetches: 0,
    acknowledgements: 0,
    acknowledgedEvents: 0,
    failedEvents: 0,
    zeroMsHandoffs: 1
  });
  // The handoff captures epoch n+1, drains once, ACKs once, and stops.
  assert.deepEqual(
    runFlight(sameUserEpochNPlusOne, sameUserEpochNPlusOne, sameUserEpochNPlusOne),
    {
      fetches: 1,
      acknowledgements: 1,
      acknowledgedEvents: 1,
      failedEvents: 0,
      zeroMsHandoffs: 0
    }
  );
  // Cross-user teardown never ACKs or schedules work for the old owner.
  assert.deepEqual(
    runFlight(sameUserEpochNPlusOne, otherUserSameEpoch, otherUserSameEpoch),
    {
      fetches: 0,
      acknowledgements: 0,
      acknowledgedEvents: 0,
      failedEvents: 0,
      zeroMsHandoffs: 0
    }
  );
});
