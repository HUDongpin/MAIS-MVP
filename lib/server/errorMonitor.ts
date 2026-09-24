/** Error monitoring retains the source transport, budgets and after() lifecycle.
 * Events carry fixed classifications; arbitrary error text, paths and stack frames are dropped.
 */
import { after } from "next/server";

import { consumeInMemoryRateLimit } from "./rateLimit";
import { classifyObservedError, normalizeObservedRoute, readErrorString, safeErrorCode, safeErrorName, safeMonitorLabel } from "../observability/errorPolicy";

export type ErrorMonitorChannel = "sentry" | "webhook" | "none";

export type ErrorMonitorStatus = "sent" | "failed" | "not-configured" | "rate-limited";

export type ErrorMonitorScope =
  | "auth-route"
  | "api-route"
  | "ai-tutor"
  | "datastore"
  | "client"
  | "health"
  | "cron";

export type ErrorMonitorLevel = "error" | "warning" | "fatal";

export type ErrorMonitorEnv = Record<string, string | undefined>;

export type ErrorMonitorFetch = typeof fetch;

export type ErrorMonitorResult = {
  status: ErrorMonitorStatus;
  channel: ErrorMonitorChannel;
  eventId?: string;
  errorCode?: "http-error" | "request-failed" | "timeout";
  httpStatus?: number;
};

export type ErrorMonitorConfig = {
  channel: ErrorMonitorChannel;
  /** Fully-qualified endpoint the event is POSTed to. Empty when `channel` is "none". */
  ingestUrl: string;
  /** Sentry public key, used for the `X-Sentry-Auth` header. Empty for other channels. */
  publicKey: string;
  /** Sentry DSN echoed into the envelope header. Empty for other channels. */
  dsn: string;
  environment: string;
  release: string;
  serverName: string;
  timeoutMs: number;
  maxEventsPerMinute: number;
};

export type ErrorMonitorEvent = {
  eventId: string;
  timestamp: number;
  level: ErrorMonitorLevel;
  scope: ErrorMonitorScope;
  message: string;
  errorName: string;
  tags: Record<string, string>;
  extra: Record<string, string | number | boolean>;
};

export type ErrorMonitorContext = {
  scope: ErrorMonitorScope;
  route: string;
  level?: ErrorMonitorLevel;
  kind?: string;
  status?: number;
  tags?: Record<string, unknown>;
  extra?: Record<string, unknown>;
};

const defaultTimeoutMs = 4000;
const minTimeoutMs = 500;
const maxTimeoutMs = 15000;
const defaultMaxEventsPerMinute = 60;
const minMaxEventsPerMinute = 1;
const maxMaxEventsPerMinute = 600;

/**
 * Default-deny allowlists. Anything not named here is dropped by `scrubErrorMonitorEvent`
 * before an event is serialized, so a future caller cannot accidentally widen the payload
 * by passing a richer context object.
 */
export const allowedTagKeys = [
  "route",
  "scope",
  "kind",
  "status",
  "method",
  "runtime",
  "region",
  "environment",
  "release",
  "provider",
  "model",
  "phase",
  "storage",
  "role",
  "source",
  "deployment"
] as const;

export const allowedExtraKeys = [
  "durationMs",
  "attempt",
  "attempts",
  "statusCode",
  "errorName",
  "errorCode",
  "stackHead",
  "checkedInMs",
  "storageReady",
  "revision",
  "payloadBytes",
  "operation"
] as const;

const allowedTagKeySet = new Set<string>(allowedTagKeys);
const allowedExtraKeySet = new Set<string>(allowedExtraKeys);

function cleanEnvValue(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

/**
 * Parses a Sentry DSN (`https://<publicKey>@<host>[/<path>]/<projectId>`) into the envelope
 * endpoint and auth key. Returns null for anything malformed so a typo degrades to "no
 * monitoring configured" rather than to a crash inside an error handler.
 */
export function parseSentryDsn(dsn: string): { ingestUrl: string; publicKey: string } | null {
  const trimmed = cleanEnvValue(dsn);
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    const publicKey = url.username;
    if (!publicKey) return null;

    const segments = url.pathname.split("/").filter(Boolean);
    const projectId = segments.pop() ?? "";
    if (!/^\d+$/.test(projectId)) return null;

    const prefix = segments.length ? `/${segments.join("/")}` : "";
    return {
      ingestUrl: `${url.protocol}//${url.host}${prefix}/api/${projectId}/envelope/`,
      publicKey
    };
  } catch {
    return null;
  }
}

function resolveEnvironment(env: ErrorMonitorEnv) {
  return (
    cleanEnvValue(env.ERROR_MONITOR_ENVIRONMENT) ||
    cleanEnvValue(env.VERCEL_ENV) ||
    cleanEnvValue(env.NODE_ENV) ||
    "development"
  );
}

function resolveRelease(env: ErrorMonitorEnv) {
  const explicit = cleanEnvValue(env.ERROR_MONITOR_RELEASE);
  if (explicit) return explicit;
  const sha = cleanEnvValue(env.VERCEL_GIT_COMMIT_SHA);
  return sha ? sha.slice(0, 12) : "local";
}

function resolveServerName(env: ErrorMonitorEnv) {
  // Explicit configuration wins over the inferred default, matching `resolveEnvironment` and
  // `resolveRelease`. With the old order, `ERROR_MONITOR_SERVER_NAME` was silently unreachable
  // on Vercel — the one platform where it would ever be set.
  return cleanEnvValue(env.ERROR_MONITOR_SERVER_NAME) || cleanEnvValue(env.VERCEL_REGION) || "unknown";
}

export function readErrorMonitorConfig(env: ErrorMonitorEnv = process.env): ErrorMonitorConfig {
  const shared = {
    environment: resolveEnvironment(env),
    release: resolveRelease(env),
    serverName: resolveServerName(env),
    timeoutMs: boundedNumber(env.ERROR_MONITOR_TIMEOUT_MS, defaultTimeoutMs, minTimeoutMs, maxTimeoutMs),
    maxEventsPerMinute: boundedNumber(
      env.ERROR_MONITOR_MAX_EVENTS_PER_MINUTE,
      defaultMaxEventsPerMinute,
      minMaxEventsPerMinute,
      maxMaxEventsPerMinute
    )
  };

  const dsn = cleanEnvValue(env.SENTRY_DSN);
  const parsed = parseSentryDsn(dsn);
  if (parsed) {
    return { channel: "sentry", ingestUrl: parsed.ingestUrl, publicKey: parsed.publicKey, dsn, ...shared };
  }

  const webhookUrl = cleanEnvValue(env.ERROR_MONITOR_WEBHOOK_URL);
  if (webhookUrl) {
    try {
      const url = new URL(webhookUrl);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return { channel: "webhook", ingestUrl: webhookUrl, publicKey: "", dsn: "", ...shared };
      }
    } catch { /* Invalid configuration is treated as unconfigured. */ }
  }

  return { channel: "none", ingestUrl: "", publicKey: "", dsn: "", ...shared };
}

export function isErrorMonitorConfigured(env: ErrorMonitorEnv = process.env) {
  return readErrorMonitorConfig(env).channel !== "none";
}

/** Kept as a compatibility export: text is now reduced to a fixed category. */
export function redactSensitiveText(value: unknown, _maxLength?: number) {
  return classifyObservedError(value);
}

/** Applied again at transport: manually constructed events cannot widen the wire schema. */
export function scrubErrorMonitorEvent(event: ErrorMonitorEvent): ErrorMonitorEvent {
  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(event.tags ?? {})) {
    if (!allowedTagKeySet.has(key)) continue;
    if (key === "route") tags[key] = normalizeObservedRoute(value);
    else if (key === "status" && /^[1-5][0-9]{2}$/.test(value)) tags[key] = value;
    else if (key === "method" && ["GET", "POST", "PATCH", "PUT", "DELETE"].includes(value)) tags[key] = value;
    else tags[key] = safeMonitorLabel(value);
  }
  const extra: Record<string, string | number | boolean> = {};
  const numericKeys = new Set(["durationMs", "attempt", "attempts", "statusCode", "checkedInMs", "revision", "payloadBytes"]);
  for (const [key, value] of Object.entries(event.extra ?? {})) {
    if (!allowedExtraKeySet.has(key)) continue;
    if (numericKeys.has(key) && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1e12) extra[key] = value;
    else if (key === "storageReady" && typeof value === "boolean") extra[key] = value;
    else if (key === "errorName") extra[key] = safeErrorName(value);
    else if (key === "errorCode" && safeErrorCode(value)) extra[key] = safeErrorCode(value);
    else if (key === "operation") extra[key] = safeMonitorLabel(value);
    // Raw stack frames and unknown string fields are intentionally absent.
  }
  return {
    eventId: /^[a-f0-9]{32}$/.test(event.eventId) ? event.eventId : newEventId(),
    timestamp: Number.isFinite(event.timestamp) && event.timestamp >= 0 && event.timestamp <= 8.64e15 ? event.timestamp : Date.now(),
    level: ["error", "warning", "fatal"].includes(event.level) ? event.level : "error",
    scope: ["auth-route", "api-route", "ai-tutor", "datastore", "health", "client", "cron"].includes(event.scope) ? event.scope : "api-route",
    message: classifyObservedError({ message: event.message, name: event.errorName }),
    errorName: safeErrorName(event.errorName), tags, extra
  };
}

function newEventId() {
  // randomUUID is available in Node 18+ and in the Edge/browser runtimes this may reach.
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(32, "0");
  return uuid.replaceAll("-", "").slice(0, 32);
}

export function buildErrorMonitorEvent(
  error: unknown,
  context: ErrorMonitorContext,
  options: { now?: number; eventId?: string } = {}
): ErrorMonitorEvent {
  const name = safeErrorName(readErrorString(error, "name"));
  const code = safeErrorCode(readErrorString(error, "code"));
  const message = classifyObservedError(error);

  return scrubErrorMonitorEvent({
    eventId: options.eventId ?? newEventId(),
    timestamp: options.now ?? Date.now(),
    level: context.level ?? "error",
    scope: context.scope,
    message,
    errorName: name,
    tags: {
      ...(context.tags ?? {}),
      scope: context.scope,
      route: context.route,
      ...(context.kind ? { kind: context.kind } : {}),
      ...(context.status ? { status: String(context.status) } : {})
    },
    extra: {
      ...(context.extra ?? {}),
      errorName: name,
      ...(code ? { errorCode: code } : {}),
      ...(context.status ? { statusCode: context.status } : {})
    }
  });
}

function sentryEnvelope(event: ErrorMonitorEvent, config: ErrorMonitorConfig) {
  const header = JSON.stringify({
    event_id: event.eventId,
    sent_at: new Date(event.timestamp).toISOString(),
    dsn: config.dsn
  });
  const itemHeader = JSON.stringify({ type: "event" });
  const payload = JSON.stringify({
    event_id: event.eventId,
    timestamp: Math.floor(event.timestamp / 1000),
    platform: event.scope === "client" ? "javascript" : "node",
    level: event.level,
    logger: "mais.error-monitor",
    environment: config.environment,
    release: config.release,
    server_name: config.serverName,
    transaction: event.tags.route,
    message: { formatted: event.message },
    exception: { values: [{ type: event.errorName, value: event.message }] },
    tags: { ...event.tags, environment: config.environment, release: config.release },
    extra: event.extra
  });
  return `${header}\n${itemHeader}\n${payload}\n`;
}

async function withTimeout<T>(timeoutMs: number, action: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await action(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function requestFailure(config: ErrorMonitorConfig, event: ErrorMonitorEvent, error: unknown): ErrorMonitorResult {
  return {
    status: "failed",
    channel: config.channel,
    eventId: event.eventId,
    errorCode: error instanceof Error && error.name === "AbortError" ? "timeout" : "request-failed"
  };
}

/**
 * Ships one already-built event. Awaited by tests and by callers that want the result;
 * `captureServerError` uses it fire-and-forget.
 */
export async function sendErrorMonitorEvent({
  event,
  env = process.env,
  fetchImpl = fetch,
  config = readErrorMonitorConfig(env),
  // Browser-reported events get their own budget. They arrive on an unauthenticated endpoint,
  // so sharing one bucket would let anyone spend the whole per-minute allowance and blind the
  // monitor to real server failures — an attacker silencing the alarm before tripping it.
  rateLimitKey = event.scope === "client" ? "error-monitor:events:client" : "error-monitor:events:server"
}: {
  event: ErrorMonitorEvent;
  env?: ErrorMonitorEnv;
  fetchImpl?: ErrorMonitorFetch;
  config?: ErrorMonitorConfig;
  /** Test seam: the shipping budget is process-global, so tests use their own bucket. */
  rateLimitKey?: string;
}): Promise<ErrorMonitorResult> {
  if (config.channel === "none") {
    return { status: "not-configured", channel: "none" };
  }

  // A crash loop must not turn into an unbounded egress bill or a monitor-side ban.
  const allowance = consumeInMemoryRateLimit(rateLimitKey, {
    max: config.maxEventsPerMinute,
    windowMs: 60_000
  });
  if (!allowance.allowed) {
    return { status: "rate-limited", channel: config.channel, eventId: event.eventId };
  }

  const scrubbed = scrubErrorMonitorEvent(event);

  try {
    const response = await withTimeout(config.timeoutMs, (signal) =>
      config.channel === "sentry"
        ? fetchImpl(config.ingestUrl, {
            method: "POST",
            signal,
            headers: {
              "Content-Type": "application/x-sentry-envelope",
              "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=mais-error-monitor/1.0, sentry_key=${config.publicKey}`
            },
            body: sentryEnvelope(scrubbed, config)
          })
        : fetchImpl(config.ingestUrl, {
            method: "POST",
            signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "app.error",
              eventId: scrubbed.eventId,
              timestamp: new Date(scrubbed.timestamp).toISOString(),
              level: scrubbed.level,
              environment: config.environment,
              release: config.release,
              serverName: config.serverName,
              message: scrubbed.message,
              errorName: scrubbed.errorName,
              tags: scrubbed.tags,
              extra: scrubbed.extra
            })
          })
    );

    return response.ok
      ? { status: "sent", channel: config.channel, eventId: scrubbed.eventId }
      : {
          status: "failed",
          channel: config.channel,
          eventId: scrubbed.eventId,
          errorCode: "http-error",
          httpStatus: response.status
        };
  } catch (error) {
    return requestFailure(config, scrubbed, error);
  }
}

/** Awaitable capture — used where the caller can spare the round trip (cron, health). */
export async function reportServerError(
  error: unknown,
  context: ErrorMonitorContext,
  options: { env?: ErrorMonitorEnv; fetchImpl?: ErrorMonitorFetch } = {}
): Promise<ErrorMonitorResult> {
  const env = options.env ?? process.env;
  const config = readErrorMonitorConfig(env);
  if (config.channel === "none") return { status: "not-configured", channel: "none" };

  const event = buildErrorMonitorEvent(error, context);
  return sendErrorMonitorEvent({ event, env, fetchImpl: options.fetchImpl, config });
}

export type AfterScheduler = (task: () => unknown) => void;

/**
 * Hands the shipping work to the platform so it outlives the response.
 *
 * This is the difference between monitoring that works and monitoring that only looks like it
 * does. A bare floating promise is not safe on Vercel: once the response flushes, the
 * invocation can be frozen or torn down, and an in-flight `fetch` to Sentry dies with it. The
 * symptom is the worst kind — the setup verifies green (the `/api/observability/test-error`
 * probe *awaits* its send, so it always delivers) while real captures on real request paths
 * silently ship nothing.
 *
 * `after()` from `next/server` is exactly the escape hatch for this: Next keeps the invocation
 * alive until the scheduled task settles. It throws when called outside a request scope — a
 * cron tick, a script, a unit test — so that case falls back to running inline.
 *
 * Exported separately from `captureServerError` so the scheduler can be injected in tests.
 */
export function scheduleErrorMonitorCapture(
  error: unknown,
  context: ErrorMonitorContext,
  scheduler: AfterScheduler
): void {
  try {
    if (!isErrorMonitorConfigured()) return;
    const ship = () =>
      reportServerError(error, context).catch(() => {
        /* monitoring must never surface as an application failure */
      });

    try {
      scheduler(ship);
    } catch {
      // Not inside a request scope: nothing is going to freeze this, so just run it.
      void ship();
    }
  } catch {
    /* ditto */
  }
}

/**
 * Fire-and-forget capture for request paths. Never throws, never blocks the response: an error
 * handler that can itself fail, or that adds latency to an already-failing request, is worse
 * than no monitoring at all.
 */
export function captureServerError(error: unknown, context: ErrorMonitorContext): void {
  scheduleErrorMonitorCapture(error, context, after);
}
