import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_TUTOR_CLIENT_MAX_RETRY_AFTER_MS,
  isAiTutorHttpRateLimited,
  nextAiTutorBackoffMs,
  parseRetryAfterMs,
  shouldReuseClassroomPolicy
} from "./aiTutorClientBackoff";

test("Retry-After seconds and HTTP-date values are bounded for a single student retry", () => {
  assert.equal(parseRetryAfterMs("2"), 2_000);
  assert.equal(parseRetryAfterMs("0.4"), 400);
  assert.equal(parseRetryAfterMs("30"), AI_TUTOR_CLIENT_MAX_RETRY_AFTER_MS);
  assert.equal(parseRetryAfterMs(undefined, 1_500), 1_500);
  const httpDate = new Date(Date.now() + 1_200).toUTCString();
  const parsedDate = parseRetryAfterMs(httpDate);
  assert.ok(parsedDate >= 400 && parsedDate <= 1_500);
});

test("status and chat backoff honor Retry-After before exponential fallback", () => {
  assert.equal(nextAiTutorBackoffMs({ attempt: 0, retryAfterHeader: "3" }), 3_000);
  assert.equal(nextAiTutorBackoffMs({ attempt: 1, fallbackMs: 1_000 }), 2_000);
  assert.equal(isAiTutorHttpRateLimited(429), true);
  assert.equal(isAiTutorHttpRateLimited(200), false);
  assert.equal(isAiTutorHttpRateLimited(503), false);
});

test("classroom policy reuse covers a fresh fetch and a 429 backoff window", () => {
  const nowMs = Date.parse("2026-09-15T12:00:00.000Z");
  assert.equal(shouldReuseClassroomPolicy({
    fetchedAtMs: nowMs - 5_000,
    nowMs
  }), true);
  assert.equal(shouldReuseClassroomPolicy({
    fetchedAtMs: nowMs - 25_000,
    nowMs
  }), false);
  assert.equal(shouldReuseClassroomPolicy({
    fetchedAtMs: nowMs - 25_000,
    nowMs,
    backoffUntilMs: nowMs + 10_000
  }), true);
  assert.equal(shouldReuseClassroomPolicy({
    fetchedAtMs: null,
    nowMs
  }), false);
});
