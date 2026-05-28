import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyLearningAnalyticsBuckets,
  getRollingLearningAnalyticsEvents,
  summarizeLearningAnalytics
} from "./learningAnalytics";
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
