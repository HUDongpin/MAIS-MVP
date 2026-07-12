import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateAiCapabilityRateLimit,
  evaluateMediaStoragePolicy,
  aiCapabilityRateLimitRulesFromEnv,
  imageDataUrlMediaDescriptor,
  mediaStoragePolicyFromEnv,
  summarizeAiGovernanceEvents,
  type AiCapabilityRateLimitEvent
} from "./aiGovernance";

function event(createdAt: string): AiCapabilityRateLimitEvent {
  return {
    capability: "ai-tutor-chat",
    createdAt,
    userId: "student-1"
  };
}

test("AI capability governance blocks the first exceeded durable rate-limit window", () => {
  const decision = evaluateAiCapabilityRateLimit({
    capability: "ai-tutor-chat",
    userId: "student-1",
    now: new Date("2026-06-12T10:00:30.000Z"),
    events: [
      event("2026-06-12T10:00:00.000Z"),
      event("2026-06-12T10:00:10.000Z"),
      event("2026-06-12T09:40:00.000Z")
    ],
    rules: [
      { name: "minute", max: 2, windowMs: 60_000 },
      { name: "hour", max: 30, windowMs: 3_600_000 }
    ]
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "rate-limit");
  assert.equal(decision.rule?.name, "minute");
  assert.equal(decision.retryAfterSeconds, 30);
  assert.equal(decision.remaining, 0);
});

test("AI capability governance admits requests and reports the tightest remaining window", () => {
  const decision = evaluateAiCapabilityRateLimit({
    capability: "ai-tutor-chat",
    userId: "student-1",
    now: new Date("2026-06-12T10:00:30.000Z"),
    events: [
      event("2026-06-12T10:00:00.000Z"),
      event("2026-06-12T09:50:00.000Z")
    ],
    rules: [
      { name: "minute", max: 3, windowMs: 60_000 },
      { name: "hour", max: 3, windowMs: 3_600_000 }
    ]
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.remaining, 0);
  assert.equal(decision.retryAfterSeconds, 0);
  assert.equal(decision.resetAt.toISOString(), "2026-06-12T10:50:00.000Z");
});

test("enterprise media policy rejects direct data URLs when object storage is required", () => {
  const policy = mediaStoragePolicyFromEnv({
    AI_MEDIA_OBJECT_STORAGE_REQUIRED: "true",
    AI_MEDIA_RETENTION_DAYS: "120"
  });
  const decision = evaluateMediaStoragePolicy({
    policy,
    capability: "profile-avatar",
    media: {
      kind: "data-url",
      mimeType: "image/png",
      byteLength: 128_000
    }
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.code, "object-storage-required");
  assert.match(decision.message, /object storage/i);
});

test("image data URL descriptors report MIME type and decoded byte length", () => {
  const descriptor = imageDataUrlMediaDescriptor("data:image/png;base64,aGVsbG8=");

  assert.deepEqual(descriptor, {
    kind: "data-url",
    mimeType: "image/png",
    byteLength: 5
  });
});

test("enterprise media policy accepts scanned encrypted object references with retention", () => {
  const policy = mediaStoragePolicyFromEnv({
    AI_MEDIA_OBJECT_STORAGE_REQUIRED: "true",
    AI_MEDIA_RETENTION_DAYS: "120"
  });
  const decision = evaluateMediaStoragePolicy({
    policy,
    capability: "profile-avatar",
    media: {
      kind: "object-reference",
      objectKey: "avatars/student-1/avatar.png",
      mimeType: "image/png",
      byteLength: 128_000,
      encrypted: true,
      scanStatus: "passed",
      retentionExpiresAt: "2026-10-10T00:00:00.000Z"
    }
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.code, "media-accepted");
});

test("AI governance summaries aggregate redacted capability and action counts", () => {
  const summary = summarizeAiGovernanceEvents({
    now: new Date("2026-06-12T12:00:00.000Z"),
    windowMs: 60 * 60 * 1000,
    events: [
      {
        action: "request-admitted",
        capability: "ai-tutor-chat",
        createdAt: "2026-06-12T11:50:00.000Z",
        reason: "ok",
        userId: "student-1"
      },
      {
        action: "rate-limit-blocked",
        capability: "ai-tutor-chat",
        createdAt: "2026-06-12T11:55:00.000Z",
        reason: "rate-limit",
        userId: "student-1"
      },
      {
        action: "request-admitted",
        capability: "ai-tutor-ocr",
        createdAt: "2026-06-12T10:30:00.000Z",
        reason: "ok",
        userId: "student-2"
      }
    ]
  });

  assert.equal(summary.windowEventCount, 2);
  assert.equal(summary.activeUserCount, 1);
  assert.deepEqual(summary.byCapability["ai-tutor-chat"], {
    total: 2,
    admitted: 1,
    blocked: 1
  });
  assert.equal(summary.byCapability["ai-tutor-ocr"], undefined);
});

test("lesson audio uses shared durable governance windows", () => {
  const rules = aiCapabilityRateLimitRulesFromEnv("lesson-audio", {
    LESSON_AUDIO_MAX_REQUESTS_PER_MINUTE: "3",
    LESSON_AUDIO_MAX_REQUESTS_PER_HOUR: "30"
  });

  assert.deepEqual(rules.map((rule) => [rule.name, rule.max]), [
    ["minute", 3],
    ["hour", 30]
  ]);
});
