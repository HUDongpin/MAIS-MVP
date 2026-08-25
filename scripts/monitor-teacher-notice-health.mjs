#!/usr/bin/env node
import { pathToFileURL } from "node:url";

export const TEACHER_NOTICE_HEALTH_ORIGINS = Object.freeze([
  "https://www.mais.ac",
  "https://www.mais.hk"
]);
const HEALTH_PATH = "/api/health/teacher-notices";
const SECRET_PATTERN = /^[^\s\u0000-\u001f\u007f-\u009f]{32,512}$/u;
const MAX_RESPONSE_BYTES = 64 * 1024;
const ALLOWED_REASONS = new Set([
  "outbox-actionable-stale",
  "outbox-stale-lease",
  "outbox-terminal-recent",
  "provider-adverse-events",
  "webhook-reconciliation-stale",
  "scheduler-heartbeat-missing",
  "scheduler-heartbeat-incomplete",
  "scheduler-heartbeat-failed",
  "scheduler-heartbeat-stale",
  "scheduler-release-mismatch"
]);
export const TEACHER_NOTICE_MONITOR_WORST_CASE_ORIGIN_MS =
  3 * 15_000 + 30_000 + 55_000;

export async function monitorTeacherNoticeHealth({
  drillFailure = false,
  fetchImpl = globalThis.fetch,
  maxAttempts = 3,
  origins = TEACHER_NOTICE_HEALTH_ORIGINS,
  random = Math.random,
  secret = process.env.TEACHER_NOTICE_HEALTH_SECRET,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  timeoutMs = 15_000
} = {}) {
  if (!SECRET_PATTERN.test(String(secret ?? ""))) {
    throw new Error("Teacher-notice monitor credential is unavailable or invalid; details redacted.");
  }
  if (
    !Array.isArray(origins) ||
    origins.length !== TEACHER_NOTICE_HEALTH_ORIGINS.length ||
    origins.some((origin, index) => origin !== TEACHER_NOTICE_HEALTH_ORIGINS[index])
  ) {
    throw new Error("Teacher-notice monitor origins are outside the approved production boundary.");
  }
  if (
    !Number.isSafeInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > 3 ||
    typeof random !== "function" ||
    typeof sleep !== "function"
  ) {
    throw new Error("Teacher-notice monitor retry policy is invalid.");
  }
  const settled = await Promise.allSettled(origins.map(async (origin) => {
    let health = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        health = await checkTeacherNoticeHealthOrigin({
          fetchImpl,
          origin,
          secret,
          timeoutMs
        });
        break;
      } catch (error) {
        const retryable = error instanceof TeacherNoticeMonitorError && error.retryable;
        if (!retryable || attempt === maxAttempts - 1) throw error;
        await sleep(teacherNoticeMonitorRetryDelayMs(attempt, random));
      }
    }
    if (!health) {
      throw new Error("Teacher-notice production health request failed; details redacted.");
    }
    return {
      origin,
      heartbeatAgeSeconds: health.scheduler.heartbeatAgeSeconds,
      observedAt: health.observedAt,
      status: "healthy"
    };
  }));
  const failure = settled.find((result) => result.status === "rejected");
  if (failure) {
    throw failure.reason instanceof Error
      ? failure.reason
      : new Error("Teacher-notice production health request failed; details redacted.");
  }
  const results = settled.map((result) => result.value);
  if (drillFailure) {
    throw new Error("TEACHER_NOTICE_MONITOR_ALERT_DRILL");
  }
  return { checkedAt: new Date().toISOString(), results };
}

class TeacherNoticeMonitorError extends Error {
  constructor(message, { retryable = false } = {}) {
    super(message);
    this.retryable = retryable;
  }
}

async function checkTeacherNoticeHealthOrigin({ fetchImpl, origin, secret, timeoutMs }) {
  let response;
  try {
    response = await fetchImpl(`${origin}${HEALTH_PATH}`, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: "application/json",
        authorization: `Bearer ${secret}`,
        "user-agent": "MAIS-Teacher-Notice-Health-Monitor/1.0"
      }
    });
  } catch {
    throw new TeacherNoticeMonitorError(
      "Teacher-notice production health request failed; details redacted.",
      { retryable: true }
    );
  }
  if ([429, 502, 504].includes(response?.status)) {
    throw new TeacherNoticeMonitorError(
      "Teacher-notice production health request was temporarily unavailable.",
      { retryable: true }
    );
  }
  assertHealthResponseHeaders(response);
  const payload = await readBoundedJson(response);
  if (response.status === 503) {
    throw new TeacherNoticeMonitorError(
      "Teacher-notice production health was not healthy; details redacted.",
      { retryable: true }
    );
  }
  return validateHealthyPayload(payload);
}

export function teacherNoticeMonitorRetryDelayMs(attempt, random = Math.random) {
  const sample = Number(random());
  if (
    !Number.isSafeInteger(attempt) ||
    attempt < 0 ||
    attempt > 1 ||
    !Number.isFinite(sample) ||
    sample < 0 ||
    sample >= 1
  ) {
    throw new Error("Teacher-notice monitor retry policy is invalid.");
  }
  const base = 25_000 * 2 ** attempt;
  return base + Math.floor(sample * 5_001);
}

function assertHealthResponseHeaders(response) {
  if (!response || ![200, 503].includes(response.status) || !response.headers) {
    throw new Error("Teacher-notice production health was not healthy; details redacted.");
  }
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? "";
  const cdnCacheControl = response.headers.get("cdn-cache-control")?.toLowerCase() ?? null;
  const vercelCdnCacheControl = response.headers.get("vercel-cdn-cache-control")?.toLowerCase() ?? null;
  const vercelCache = response.headers.get("x-vercel-cache")?.toUpperCase() ?? null;
  if (
    !hasExactCacheDirectives(cacheControl, ["private", "no-store"]) ||
    response.headers.has("set-cookie") ||
    vercelCache === "HIT" ||
    vercelCache === "STALE" ||
    (cdnCacheControl !== null && !hasExactCacheDirectives(cdnCacheControl, ["private", "no-store"])) ||
    (vercelCdnCacheControl !== null && !hasExactCacheDirectives(vercelCdnCacheControl, ["private", "no-store"]))
  ) {
    throw new Error("Teacher-notice production health cache or cookie contract failed.");
  }
}

function hasExactCacheDirectives(value, requiredDirectives) {
  const directives = new Set(
    value
      .split(",")
      .map((directive) => directive.trim().toLowerCase())
      .filter(Boolean)
  );
  return requiredDirectives.every((directive) => directives.has(directive));
}

async function readBoundedJson(response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("Teacher-notice production health response exceeded its bound.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Teacher-notice production health response was empty.");
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Teacher-notice production health response exceeded its bound.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("Teacher-notice production health response was invalid JSON.");
  }
}

function validateHealthyPayload(payload) {
  const health = payload?.health;
  const observedAt = typeof health?.observedAt === "string"
    ? Date.parse(health.observedAt)
    : Number.NaN;
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Object.keys(payload).sort().join("\n") !== "health" ||
    !health ||
    typeof health !== "object" ||
    health.status !== "healthy" ||
    !Array.isArray(health.reasons) ||
    health.reasons.length !== 0 ||
    health.reasons.some((reason) => !ALLOWED_REASONS.has(reason)) ||
    health.scheduler?.heartbeatStatus !== "succeeded" ||
    health.scheduler?.candidateMatch !== true ||
    !Number.isSafeInteger(health.scheduler?.heartbeatAgeSeconds) ||
    health.scheduler.heartbeatAgeSeconds < 0 ||
    health.scheduler.heartbeatAgeSeconds > 15 * 60 ||
    !Number.isFinite(observedAt) ||
    new Date(observedAt).toISOString() !== health.observedAt
  ) {
    throw new Error("Teacher-notice production health payload was not healthy; details redacted.");
  }
  return health;
}

function parseArgs(argv) {
  let drillFailure = false;
  for (const argument of argv) {
    if (argument === "--drill-failure") drillFailure = true;
    else {
      throw new Error(argument.startsWith("--")
        ? `Unknown argument flag: ${argument.split("=", 1)[0]}`
        : "Unknown argument.");
    }
  }
  return { drillFailure };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  monitorTeacherNoticeHealth(parseArgs(process.argv.slice(2)))
    .then((result) => {
      console.log(`Teacher-notice production health passed on ${result.results.length} approved origins.`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "Teacher-notice monitor failed; details redacted.");
      process.exitCode = 1;
    });
}
