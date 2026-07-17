import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyLearningAnalyticsBuckets,
  coalesceLearningAnalyticsEvents,
  getRollingLearningAnalyticsEvents,
  isHighFrequencyLearningAnalyticsEvent,
  summarizeLearningAnalytics
} from "./learningAnalytics";
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

test("AppProviders buffers visualization chatter and flushes it on page lifecycle boundaries", async () => {
  const source = await readFile(path.join(process.cwd(), "components/providers/AppProviders.tsx"), "utf8");
  const callbackStart = source.indexOf("const recordLearningEvent = useCallback");
  const highFrequencyCheckIndex = source.indexOf("isHighFrequencyLearningAnalyticsEvent", callbackStart);
  const immediatePendingIndex = source.indexOf("setPendingLearningEvents", callbackStart);

  assert.notEqual(callbackStart, -1, "AppProviders should expose recordLearningEvent.");
  assert.notEqual(highFrequencyCheckIndex, -1, "AppProviders should detect high-frequency visualization events.");
  assert.notEqual(immediatePendingIndex, -1, "AppProviders should still enqueue normal events immediately.");
  assert.ok(
    callbackStart < highFrequencyCheckIndex && highFrequencyCheckIndex < immediatePendingIndex,
    "Visualization slider, drag, and probe events should be buffered before normal pending-event enqueueing."
  );
  assert.match(source, /document\.addEventListener\("visibilitychange", flushLearningAnalyticsOnPageExit\)/);
  assert.match(source, /window\.addEventListener\("pagehide", flushLearningAnalyticsOnPageExit\)/);
  assert.match(source, /window\.addEventListener\("beforeunload", flushLearningAnalyticsOnPageExit\)/);
  assert.match(source, /index \+= 100/, "Page-exit flushing should keep the 100-events-per-POST batch ceiling.");
});

test("learning-events API responds after local append without awaiting optional LRS delivery", async () => {
  const source = await readFile(path.join(process.cwd(), "app/api/learning-events/route.ts"), "utf8");
  const jsonParseIndex = source.indexOf("await request.json()");
  const appendCallIndex = source.indexOf("await appendLearningEvents", jsonParseIndex);
  const responseIndex = source.indexOf("return NextResponse.json({ accepted", appendCallIndex);
  const lrsCallIndex = source.indexOf("emitLearningEventsToLrs", appendCallIndex);

  assert.notEqual(appendCallIndex, -1, "Student learning events should be appended to local analytics storage.");
  assert.notEqual(responseIndex, -1, "Student learning events should respond after the local write.");
  assert.notEqual(lrsCallIndex, -1, "Optional LRS delivery should still be scheduled for student events.");
  assert.ok(
    jsonParseIndex < appendCallIndex && appendCallIndex < responseIndex && responseIndex < lrsCallIndex,
    "The local analytics write should be the only awaited student learning-events write; optional LRS must not delay the response."
  );
  assert.equal(source.includes("await emitLearningEventsToLrs"), false);
});
