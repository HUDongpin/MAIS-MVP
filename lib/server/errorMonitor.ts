/**
 * Production error monitoring.
 *
 * Why this is hand-rolled instead of `@sentry/nextjs`: the SDK pulls in a build-time
 * webpack plugin (source-map upload, an auth token in CI) and ~20 transitive packages
 * into a deliberately lean dependency tree, and it auto-instruments request bodies,
 * headers and cookies by default — exactly the payload shapes this platform must never
 * ship off-box, since its users are minors. What we actually need is: catch a server or
 * client error, strip everything that is not on an allowlist, and POST it somewhere the
 * owner can see. That is this file, in ~1 dependency-free module, and it speaks Sentry's
 * public envelope protocol so `SENTRY_DSN` alone points it at a real Sentry project.
 *
 * Channels, in precedence order (see `readErrorMonitorConfig`):
 *   1. `SENTRY_DSN`               -> Sentry envelope endpoint (works with sentry.io or self-hosted)
 *   2. `ERROR_MONITOR_WEBHOOK_URL`-> plain JSON POST (Slack relay, Vercel Log Drain, anything)
 *   3. neither                    -> `none`: every capture is a no-op, so local dev and CI
 *                                   builds behave bit-for-bit as they did before this module.
 *
 * PRIVACY CONTRACT (enforced by `scrubErrorMonitorEvent`, covered by errorMonitor.test.ts):
 * tags and extras are DEFAULT-DENY — a key not in `allowedTagKeys` / `allowedExtraKeys` is
 * dropped, never sent. Free-text fields (message, stack) survive only after every redaction
 * rule in `redactionRules` has run. No student names, emails, message bodies, tokens or
 * cookies leave the process.
 */

import { consumeInMemoryRateLimit } from "./rateLimit";

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

const maxMessageLength = 240;
const maxTagValueLength = 64;
const maxExtraStringLength = 400;
const maxStackFrames = 5;

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

/**
 * Ordered redaction rules. Order matters: credentials embedded in a connection string are
 * removed before the e-mail rule can match the `user:pass@host` fragment as an address.
 */
const redactionRules: Array<{ pattern: RegExp; replacement: string }> = [
  // postgres://user:password@host -> postgres://[credentials]@host
  { pattern: /\b([a-z][a-z0-9+.-]*):\/\/[^\s/@]+:[^\s/@]+@/gi, replacement: "$1://[credentials]@" },
  // Any e-mail address (parents, teachers, students, admins).
  { pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: "[email]" },
  // `token=abc`, `password: hunter2`, `Cookie: mais_session=...`, `apiKey="sk-..."`.
  {
    pattern:
      /\b(token|secret|password|passwd|pwd|api[_-]?key|apikey|authorization|auth|session|cookie|dsn)\b\s*[:=]\s*"?[^\s,;"')]+"?/gi,
    replacement: "$1=[redacted]"
  },
  { pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, replacement: "Bearer [redacted]" },
  // JWTs and other three-segment credentials.
  { pattern: /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, replacement: "[jwt]" },
  // Opaque high-entropy strings (session ids, API keys, hashes).
  { pattern: /\b[A-Za-z0-9_-]{32,}\b/g, replacement: "[redacted-token]" },
  // Query strings can carry reset tokens and invite codes; keep the path, drop the rest.
  { pattern: /(https?:\/\/[^\s?#"']+)\?[^\s"']*/gi, replacement: "$1?[redacted-query]" },
  // Long digit runs: phone numbers, ID numbers, anything account-shaped.
  { pattern: /\d{7,}/g, replacement: "[redacted-number]" },
  // Home-directory paths in stack frames carry the developer's account name.
  { pattern: /(\/(?:Users|home)\/)[^/\s)"']+/g, replacement: "$1[user]" },
  // A long quoted run is almost always an echoed request body (a tutor message, an answer).
  { pattern: /"[^"]{41,}"/g, replacement: '"[redacted-text]"' },
  // CJK runs are, in this product, student/parent names or tutor conversation text.
  // Error strings from Node, Postgres and the model providers are ASCII, so this costs
  // us nothing diagnostically and closes the largest remaining leak path.
  { pattern: /[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]{2,}/g, replacement: "[redacted-text]" }
];

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
  return cleanEnvValue(env.VERCEL_REGION) || cleanEnvValue(env.ERROR_MONITOR_SERVER_NAME) || "unknown";
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
    return { channel: "webhook", ingestUrl: webhookUrl, publicKey: "", dsn: "", ...shared };
  }

  return { channel: "none", ingestUrl: "", publicKey: "", dsn: "", ...shared };
}

export function isErrorMonitorConfigured(env: ErrorMonitorEnv = process.env) {
  return readErrorMonitorConfig(env).channel !== "none";
}

/** Applies every redaction rule, then clamps length. Never returns undefined. */
export function redactSensitiveText(value: unknown, maxLength = maxMessageLength) {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" ? value : String(value);
  for (const rule of redactionRules) {
    text = text.replace(rule.pattern, rule.replacement);
  }
  text = text.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

/**
 * The `beforeSend` filter. Everything that leaves this process goes through here.
 */
export function scrubErrorMonitorEvent(event: ErrorMonitorEvent): ErrorMonitorEvent {
  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(event.tags ?? {})) {
    if (!allowedTagKeySet.has(key)) continue;
    const redacted = redactSensitiveText(value, maxTagValueLength);
    if (redacted) tags[key] = redacted;
  }

  const extra: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(event.extra ?? {})) {
    if (!allowedExtraKeySet.has(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      extra[key] = value;
      continue;
    }
    if (typeof value === "boolean") {
      extra[key] = value;
      continue;
    }
    const redacted = redactSensitiveText(value, maxExtraStringLength);
    if (redacted) extra[key] = redacted;
  }

  return {
    eventId: event.eventId,
    timestamp: event.timestamp,
    level: event.level,
    scope: event.scope,
    message: redactSensitiveText(event.message),
    errorName: redactSensitiveText(event.errorName, maxTagValueLength) || "UnknownError",
    tags,
    extra
  };
}

function errorName(error: unknown) {
  if (error instanceof Error && error.name) return error.name;
  if (typeof error === "object" && error && typeof (error as { name?: unknown }).name === "string") {
    return (error as { name: string }).name;
  }
  return "UnknownError";
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "";
}

function errorCode(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" || typeof code === "number" ? String(code) : "";
}

/** First few stack frames only — enough to locate the throw, short enough to stay cheap. */
function stackHead(error: unknown) {
  const stack = error instanceof Error && typeof error.stack === "string" ? error.stack : "";
  if (!stack) return "";
  return stack.split("\n").slice(0, maxStackFrames).join(" | ");
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
  const name = errorName(error);
  const code = errorCode(error);
  const message = errorMessage(error) || name;

  return scrubErrorMonitorEvent({
    eventId: options.eventId ?? newEventId(),
    timestamp: options.now ?? Date.now(),
    level: context.level ?? "error",
    scope: context.scope,
    message: `${context.route}: ${message}`,
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
      ...(stackHead(error) ? { stackHead: stackHead(error) } : {}),
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
  rateLimitKey = "error-monitor:events"
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

/**
 * Fire-and-forget capture for request paths. Never throws, never awaits: an error handler
 * that can itself fail, or that adds latency to an already-failing request, is worse than
 * no monitoring at all.
 */
export function captureServerError(error: unknown, context: ErrorMonitorContext): void {
  try {
    if (!isErrorMonitorConfigured()) return;
    void reportServerError(error, context).catch(() => {
      /* monitoring must never surface as an application failure */
    });
  } catch {
    /* ditto */
  }
}
