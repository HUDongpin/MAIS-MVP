import assert from "node:assert/strict";
import test from "node:test";

import {
  learningEventLrsDeliveryTransitionAllowed,
  learningEventLrsDeliveryUpdates,
  mergeStoredLearningEventLrsDelivery
} from "@/lib/server/learningEventLrsDelivery";
import type { LearningAnalyticsEvent } from "@/types";

const events: LearningAnalyticsEvent[] = ["sent-event", "queued-event"].map((id) => ({
  id,
  type: "page-view",
  source: "visualization-lab",
  timestamp: "2026-08-09T11:00:00.000Z",
  grade: "S3",
  topicId: "lrs-delivery-contract"
}));

test("LRS delivery updates preserve every returned outbox field without losing successful siblings", () => {
  assert.deepEqual(learningEventLrsDeliveryUpdates(events, {
    status: "queued",
    attempted: 2,
    accepted: 1,
    outbox: [{
      statementId: "statement-queued",
      eventId: "queued-event",
      attempts: 3,
      queuedAt: "2026-08-09T12:00:00.000Z",
      nextRetryAt: "2026-08-09T12:03:00.000Z",
      reason: "http-error",
      httpStatus: 503
    }]
  }), [
    { eventId: "sent-event", status: "sent", attempts: 1 },
    {
      eventId: "queued-event",
      status: "queued",
      statementId: "statement-queued",
      attempts: 3,
      queuedAt: "2026-08-09T12:00:00.000Z",
      nextRetryAt: "2026-08-09T12:03:00.000Z",
      reason: "http-error",
      httpStatus: 503
    }
  ]);
});

test("disabled LRS still resolves every durable pending job explicitly", () => {
  assert.deepEqual(learningEventLrsDeliveryUpdates(events, {
    status: "disabled",
    attempted: 0,
    accepted: 0,
    outbox: []
  }), [
    { eventId: "sent-event", status: "disabled", attempts: 0 },
    { eventId: "queued-event", status: "disabled", attempts: 0 }
  ]);
});

test("LRS delivery state is monotonic and retry attempts never move backwards", () => {
  assert.equal(learningEventLrsDeliveryTransitionAllowed("pending", "queued"), true);
  assert.equal(learningEventLrsDeliveryTransitionAllowed("queued", "sent"), true);
  assert.equal(learningEventLrsDeliveryTransitionAllowed("disabled", "sent"), true);
  assert.equal(learningEventLrsDeliveryTransitionAllowed("sent", "sent"), true);
  assert.equal(learningEventLrsDeliveryTransitionAllowed("queued", "disabled"), false);
  assert.equal(learningEventLrsDeliveryTransitionAllowed("sent", "queued"), false);
  assert.equal(learningEventLrsDeliveryTransitionAllowed("sent", "disabled"), false);

  const queued = {
    status: "queued" as const,
    attempts: 3,
    statement_id: "statement-queued",
    queued_at: "2026-08-09T12:00:00.000Z",
    next_retry_at: "2026-08-09T12:03:00.000Z",
    reason: "http-error" as const,
    http_status: 503,
    updated_at: "2026-08-09T12:00:00.000Z"
  };
  assert.equal(mergeStoredLearningEventLrsDelivery(queued, {
    eventId: "queued-event",
    status: "disabled",
    attempts: 0
  }, "2026-08-09T12:04:00.000Z"), null);
  assert.deepEqual(mergeStoredLearningEventLrsDelivery(queued, {
    eventId: "queued-event",
    status: "sent",
    attempts: 1
  }, "2026-08-09T12:04:00.000Z"), {
    status: "sent",
    attempts: 4,
    statement_id: "statement-queued",
    queued_at: "2026-08-09T12:00:00.000Z",
    updated_at: "2026-08-09T12:04:00.000Z"
  });
});
