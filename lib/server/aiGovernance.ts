export type AiCapability =
  | "ai-tutor-chat"
  | "ai-tutor-ocr"
  | "ai-tutor-speech"
  | "ai-tutor-voice"
  | "lesson-audio"
  | "profile-avatar"
  | "assignment-image"
  | "classroom-work-sample";

export type AiCapabilityRateLimitRule = {
  name: "minute" | "hour" | "day" | string;
  max: number;
  windowMs: number;
};

export type AiCapabilityRateLimitEvent = {
  capability: AiCapability;
  userId: string;
  createdAt: string;
};

export type AiGovernanceAuditAction = "request-admitted" | "rate-limit-blocked" | "media-policy-blocked";

export type AiGovernanceAuditEvent = {
  action: AiGovernanceAuditAction;
  capability: AiCapability;
  createdAt: string;
  reason: string;
  userId: string;
};

export type AiGovernanceSummary = {
  activeUserCount: number;
  byCapability: Partial<Record<AiCapability, { total: number; admitted: number; blocked: number }>>;
  byAction: Record<AiGovernanceAuditAction, number>;
  windowEventCount: number;
  windowMs: number;
};

export type AiCapabilityRateLimitDecision = {
  allowed: boolean;
  reason: "ok" | "rate-limit";
  retryAfterSeconds: number;
  remaining: number;
  resetAt: Date;
  rule?: AiCapabilityRateLimitRule;
};

export type AiMediaStoragePolicy = {
  objectStorageRequired: boolean;
  requireEncryption: boolean;
  requirePassedScan: boolean;
  retentionDays: number;
  maxDataUrlBytes: number;
};

export type AiMediaDescriptor =
  | {
      kind: "data-url";
      mimeType: string;
      byteLength: number;
    }
  | {
      kind: "object-reference";
      objectKey: string;
      mimeType: string;
      byteLength: number;
      encrypted: boolean;
      scanStatus: "pending" | "passed" | "failed";
      retentionExpiresAt: string;
    };

export type AiMediaStorageDecision = {
  allowed: boolean;
  code:
    | "media-accepted"
    | "legacy-data-url-accepted"
    | "media-too-large"
    | "object-storage-required"
    | "media-object-reference-invalid"
    | "media-encryption-required"
    | "media-scan-required"
    | "media-retention-required";
  message: string;
};

type EnvLike = Record<string, string | undefined>;

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;

function booleanFromEnv(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

export function boundedAiGovernanceNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function eventTime(event: AiCapabilityRateLimitEvent) {
  const timestamp = Date.parse(event.createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function auditEventTime(event: AiGovernanceAuditEvent) {
  const timestamp = Date.parse(event.createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function summarizeAiGovernanceEvents({
  events,
  now,
  windowMs
}: {
  events: AiGovernanceAuditEvent[];
  now: Date;
  windowMs: number;
}): AiGovernanceSummary {
  const cutoff = now.getTime() - windowMs;
  const windowEvents = events.filter((event) => {
    const timestamp = auditEventTime(event);
    return timestamp > cutoff && timestamp <= now.getTime();
  });
  const activeUsers = new Set(windowEvents.map((event) => event.userId));
  const byCapability: AiGovernanceSummary["byCapability"] = {};
  const byAction: AiGovernanceSummary["byAction"] = {
    "media-policy-blocked": 0,
    "rate-limit-blocked": 0,
    "request-admitted": 0
  };

  for (const event of windowEvents) {
    const existing = byCapability[event.capability] ?? { total: 0, admitted: 0, blocked: 0 };
    existing.total += 1;
    if (event.action === "request-admitted") {
      existing.admitted += 1;
    } else {
      existing.blocked += 1;
    }
    byCapability[event.capability] = existing;
    byAction[event.action] += 1;
  }

  return {
    activeUserCount: activeUsers.size,
    byCapability,
    byAction,
    windowEventCount: windowEvents.length,
    windowMs
  };
}

export function evaluateAiCapabilityRateLimit({
  capability,
  events,
  now,
  rules,
  userId
}: {
  capability: AiCapability;
  events: AiCapabilityRateLimitEvent[];
  now: Date;
  rules: AiCapabilityRateLimitRule[];
  userId: string;
}): AiCapabilityRateLimitDecision {
  const nowMs = now.getTime();
  let tightestRemaining = Number.MAX_SAFE_INTEGER;
  let tightestResetAt = now;

  for (const rule of rules) {
    const windowStartMs = nowMs - rule.windowMs;
    const relevantTimes = events
      .filter((event) => event.userId === userId && event.capability === capability)
      .map(eventTime)
      .filter((timestamp) => timestamp > windowStartMs && timestamp <= nowMs)
      .sort((left, right) => left - right);

    if (relevantTimes.length >= rule.max) {
      const resetAt = new Date(relevantTimes[0] + rule.windowMs);
      return {
        allowed: false,
        reason: "rate-limit",
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - nowMs) / 1000)),
        remaining: 0,
        resetAt,
        rule
      };
    }

    const remainingAfterAdmit = Math.max(0, rule.max - relevantTimes.length - 1);
    const resetAt = relevantTimes[0]
      ? new Date(relevantTimes[0] + rule.windowMs)
      : new Date(nowMs + rule.windowMs);
    if (remainingAfterAdmit < tightestRemaining) {
      tightestRemaining = remainingAfterAdmit;
      tightestResetAt = resetAt;
    }
  }

  return {
    allowed: true,
    reason: "ok",
    retryAfterSeconds: 0,
    remaining: tightestRemaining,
    resetAt: tightestResetAt
  };
}

export function aiCapabilityRateLimitRulesFromEnv(capability: AiCapability, env: EnvLike = process.env) {
  if (capability === "ai-tutor-chat") {
    return [
      {
        name: "minute",
        max: boundedAiGovernanceNumber(env.AI_TUTOR_MAX_REQUESTS_PER_MINUTE, 6, 1, 60),
        windowMs: minuteMs
      },
      {
        name: "hour",
        max: boundedAiGovernanceNumber(env.AI_TUTOR_MAX_REQUESTS_PER_HOUR, 30, 1, 240),
        windowMs: hourMs
      }
    ] satisfies AiCapabilityRateLimitRule[];
  }

  if (capability === "ai-tutor-ocr") {
    return [
      {
        name: "minute",
        max: boundedAiGovernanceNumber(env.HANDWRITING_RECOGNITION_MAX_REQUESTS_PER_MINUTE, 20, 1, 120),
        windowMs: minuteMs
      },
      {
        name: "hour",
        max: boundedAiGovernanceNumber(env.HANDWRITING_RECOGNITION_MAX_REQUESTS_PER_HOUR, 160, 1, 1000),
        windowMs: hourMs
      }
    ] satisfies AiCapabilityRateLimitRule[];
  }

  if (capability === "ai-tutor-speech") {
    return [
      {
        name: "minute",
        max: boundedAiGovernanceNumber(env.AI_TUTOR_SPEECH_MAX_REQUESTS_PER_MINUTE, 8, 1, 60),
        windowMs: minuteMs
      },
      {
        name: "hour",
        max: boundedAiGovernanceNumber(env.AI_TUTOR_SPEECH_MAX_REQUESTS_PER_HOUR, 80, 1, 600),
        windowMs: hourMs
      }
    ] satisfies AiCapabilityRateLimitRule[];
  }

  if (capability === "ai-tutor-voice") {
    return [
      {
        name: "minute",
        max: boundedAiGovernanceNumber(env.AI_TUTOR_VOICE_MAX_REQUESTS_PER_MINUTE, 12, 1, 60),
        windowMs: minuteMs
      },
      {
        name: "hour",
        max: boundedAiGovernanceNumber(env.AI_TUTOR_VOICE_MAX_REQUESTS_PER_HOUR, 120, 1, 600),
        windowMs: hourMs
      }
    ] satisfies AiCapabilityRateLimitRule[];
  }

  if (capability === "lesson-audio") {
    return [
      {
        name: "minute",
        max: boundedAiGovernanceNumber(env.LESSON_AUDIO_MAX_REQUESTS_PER_MINUTE, 10, 1, 60),
        windowMs: minuteMs
      },
      {
        name: "hour",
        max: boundedAiGovernanceNumber(env.LESSON_AUDIO_MAX_REQUESTS_PER_HOUR, 120, 1, 600),
        windowMs: hourMs
      }
    ] satisfies AiCapabilityRateLimitRule[];
  }

  return [
    {
      name: "minute",
      max: boundedAiGovernanceNumber(env.AI_MEDIA_MAX_REQUESTS_PER_MINUTE, 20, 1, 120),
      windowMs: minuteMs
    }
  ] satisfies AiCapabilityRateLimitRule[];
}

export function mediaStoragePolicyFromEnv(env: EnvLike = process.env): AiMediaStoragePolicy {
  return {
    objectStorageRequired: booleanFromEnv(env.AI_MEDIA_OBJECT_STORAGE_REQUIRED),
    requireEncryption: env.AI_MEDIA_REQUIRE_ENCRYPTION === undefined || booleanFromEnv(env.AI_MEDIA_REQUIRE_ENCRYPTION),
    requirePassedScan: env.AI_MEDIA_REQUIRE_PASSED_SCAN === undefined || booleanFromEnv(env.AI_MEDIA_REQUIRE_PASSED_SCAN),
    retentionDays: boundedAiGovernanceNumber(env.AI_MEDIA_RETENTION_DAYS, 90, 1, 365),
    maxDataUrlBytes: boundedAiGovernanceNumber(env.AI_MEDIA_DATA_URL_MAX_BYTES, 2_000_000, 1_000, 5_000_000)
  };
}

export function imageDataUrlMediaDescriptor(value: string): Extract<AiMediaDescriptor, { kind: "data-url" }> | null {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;
  return {
    kind: "data-url",
    mimeType: match[1],
    byteLength: Buffer.byteLength(match[2].replace(/\s+/g, ""), "base64")
  };
}

export function evaluateMediaStoragePolicy({
  media,
  policy
}: {
  capability: AiCapability;
  media: AiMediaDescriptor;
  policy: AiMediaStoragePolicy;
}): AiMediaStorageDecision {
  if (media.byteLength > policy.maxDataUrlBytes) {
    return {
      allowed: false,
      code: "media-too-large",
      message: "Media exceeds the configured enterprise upload size limit."
    };
  }

  if (media.kind === "data-url") {
    if (policy.objectStorageRequired) {
      return {
        allowed: false,
        code: "object-storage-required",
        message: "Enterprise media storage requires object storage with scanning, encryption, and retention metadata instead of direct data URL persistence."
      };
    }

    return {
      allowed: true,
      code: "legacy-data-url-accepted",
      message: "Legacy data URL storage is allowed by the current media policy."
    };
  }

  if (!media.objectKey.trim()) {
    return {
      allowed: false,
      code: "media-object-reference-invalid",
      message: "Media object references must include a storage object key."
    };
  }

  if (policy.requireEncryption && !media.encrypted) {
    return {
      allowed: false,
      code: "media-encryption-required",
      message: "Media object references must be encrypted before use."
    };
  }

  if (policy.requirePassedScan && media.scanStatus !== "passed") {
    return {
      allowed: false,
      code: "media-scan-required",
      message: "Media object references must pass scanning before use."
    };
  }

  if (!Number.isFinite(Date.parse(media.retentionExpiresAt))) {
    return {
      allowed: false,
      code: "media-retention-required",
      message: "Media object references must include a valid retention expiry timestamp."
    };
  }

  return {
    allowed: true,
    code: "media-accepted",
    message: "Media object reference satisfies enterprise storage policy."
  };
}
