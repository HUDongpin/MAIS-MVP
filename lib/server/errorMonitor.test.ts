import assert from "node:assert/strict";
import test from "node:test";
import {
  buildErrorMonitorEvent,
  captureServerError,
  isErrorMonitorConfigured,
  parseSentryDsn,
  readErrorMonitorConfig,
  redactSensitiveText,
  reportServerError,
  scheduleErrorMonitorCapture,
  scrubErrorMonitorEvent,
  sendErrorMonitorEvent,
  type ErrorMonitorEvent
} from "./errorMonitor";

const sentryEnv = {
  SENTRY_DSN: "https://publickey123@o4507.ingest.sentry.io/4508",
  ERROR_MONITOR_ENVIRONMENT: "preview",
  ERROR_MONITOR_RELEASE: "abc123def456"
};

test("malformed webhook configuration remains unconfigured instead of attempting a request", async () => {
  for (const url of ["not a URL", "file:///private", "javascript:private"]) {
    let calls = 0;
    const result = await reportServerError(new Error("fixture"), { scope: "api-route", route: "/api/auth/login" }, {
      env: { ERROR_MONITOR_WEBHOOK_URL: url }, fetchImpl: async () => { calls += 1; return new Response(null, { status: 204 }); }
    });
    assert.equal(result.status, "not-configured"); assert.equal(calls, 0);
  }
});

test("an aborted transport returns timeout without throwing", async () => {
  const config = { ...readErrorMonitorConfig({ ERROR_MONITOR_WEBHOOK_URL: "https://sink.example.test" }), timeoutMs: 5 };
  const event = buildErrorMonitorEvent(new Error("fixture"), { scope: "api-route", route: "/api/auth/login" });
  const result = await sendErrorMonitorEvent({ event, config, rateLimitKey: "test:timeout", fetchImpl: async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Synthetic timeout", "AbortError")), { once: true });
  }) });
  assert.equal(result.status, "failed"); assert.equal(result.errorCode, "timeout");
});

function stubFetch() {
  const calls: Array<{ url: string; headers: Headers; body: string }> = [];
  const fetchImpl = async (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    calls.push({ url: String(url), headers: new Headers(init?.headers), body: String(init?.body ?? "") });
    return new Response("{}", { status: 200 });
  };
  return { calls, fetchImpl };
}

test("error monitor is a no-op with no DSN and no webhook configured", async () => {
  const env = {};
  assert.equal(isErrorMonitorConfigured(env), false);
  assert.equal(readErrorMonitorConfig(env).channel, "none");

  let called = false;
  const result = await reportServerError(new Error("boom"), { scope: "api-route", route: "/api/auth/login" }, {
    env,
    fetchImpl: async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }
  });

  assert.deepEqual(result, { status: "not-configured", channel: "none" });
  assert.equal(called, false);
});

test("browser reports cannot spend the budget that real server errors need", async () => {
  // /api/observability/client-error is unauthenticated. If client and server captures shared
  // one per-minute bucket, flooding that endpoint would silence the monitor for genuine
  // server failures — an attacker disabling the alarm before tripping it.
  const { calls, fetchImpl } = stubFetch();
  const config = readErrorMonitorConfig({ ERROR_MONITOR_WEBHOOK_URL: "https://hooks.example/errors" });
  const budget = { ...config, maxEventsPerMinute: 2 };

  const clientEvent = () =>
    buildErrorMonitorEvent(new Error("browser boom"), { scope: "client", route: "/lesson/x" });
  for (let i = 0; i < 5; i += 1) {
    await sendErrorMonitorEvent({ event: clientEvent(), config: budget, fetchImpl });
  }
  assert.equal(calls.length, 2, "the client budget should have been exhausted");

  const serverResult = await sendErrorMonitorEvent({
    event: buildErrorMonitorEvent(new Error("db down"), { scope: "datastore", route: "userStore.write" }),
    config: budget,
    fetchImpl
  });
  assert.equal(serverResult.status, "sent", "a server capture was starved by browser traffic");
});

test("captures are handed to the platform's after() so they outlive the response", async () => {
  // Regression guard for the failure mode where monitoring looks configured, the test-error
  // probe reports "sent" (it awaits its own send), and every real capture is silently killed
  // when the lambda freezes after the response flushes.
  const scheduled: Array<() => unknown> = [];
  process.env.ERROR_MONITOR_WEBHOOK_URL = "https://hooks.example/errors";
  try {
    scheduleErrorMonitorCapture(new Error("boom"), { scope: "auth-route", route: "/api/auth/login" }, (task) => {
      scheduled.push(task);
    });
    assert.equal(scheduled.length, 1, "the capture was not deferred to the platform scheduler");
  } finally {
    delete process.env.ERROR_MONITOR_WEBHOOK_URL;
  }
});

test("a capture outside a request scope still ships, rather than being dropped", async () => {
  // `after()` throws outside a request scope (cron ticks, scripts). That must degrade to
  // running inline, not to losing the event.
  const { calls, fetchImpl } = stubFetch();
  process.env.ERROR_MONITOR_WEBHOOK_URL = "https://hooks.example/errors";
  const realFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    scheduleErrorMonitorCapture(new Error("boom"), { scope: "cron", route: "/api/health" }, () => {
      throw new Error("`after` was called outside a request scope.");
    });
    // The inline fallback is fire-and-forget; let its microtasks drain.
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(calls.length, 1, "the event was dropped instead of shipped inline");
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.ERROR_MONITOR_WEBHOOK_URL;
  }
});

test("captureServerError never throws, even on a hostile error value", () => {
  const hostile = {
    get name() {
      throw new Error("name getter exploded");
    }
  };
  assert.doesNotThrow(() => captureServerError(hostile, { scope: "api-route", route: "/api/auth/login" }));
  assert.doesNotThrow(() => captureServerError(undefined, { scope: "datastore", route: "userStore" }));
});

test("Sentry DSN parsing accepts hosted and self-hosted forms and rejects malformed ones", () => {
  assert.deepEqual(parseSentryDsn("https://publickey123@o4507.ingest.sentry.io/4508"), {
    ingestUrl: "https://o4507.ingest.sentry.io/api/4508/envelope/",
    publicKey: "publickey123"
  });
  assert.deepEqual(parseSentryDsn("https://key@sentry.example.test/prefix/77"), {
    ingestUrl: "https://sentry.example.test/prefix/api/77/envelope/",
    publicKey: "key"
  });
  assert.equal(parseSentryDsn(""), null);
  assert.equal(parseSentryDsn("https://o4507.ingest.sentry.io/4508"), null, "missing public key");
  assert.equal(parseSentryDsn("https://key@o4507.ingest.sentry.io/project"), null, "non-numeric project id");
  assert.equal(parseSentryDsn("ftp://key@example.test/1"), null, "non-http protocol");
  assert.equal(parseSentryDsn("not a url"), null);
});

test("config precedence: DSN wins over webhook, malformed DSN falls back to webhook", () => {
  const withBoth = readErrorMonitorConfig({
    ...sentryEnv,
    ERROR_MONITOR_WEBHOOK_URL: "https://hooks.example.test/errors"
  });
  assert.equal(withBoth.channel, "sentry");
  assert.equal(withBoth.ingestUrl, "https://o4507.ingest.sentry.io/api/4508/envelope/");

  const withBadDsn = readErrorMonitorConfig({
    SENTRY_DSN: "totally-not-a-dsn",
    ERROR_MONITOR_WEBHOOK_URL: "https://hooks.example.test/errors"
  });
  assert.equal(withBadDsn.channel, "webhook");
  assert.equal(withBadDsn.ingestUrl, "https://hooks.example.test/errors");

  const bounded = readErrorMonitorConfig({ ...sentryEnv, ERROR_MONITOR_TIMEOUT_MS: "999999" });
  assert.equal(bounded.timeoutMs, 15000, "timeout is clamped to a safe ceiling");
});

test("wire scrub drops unknown fields, arbitrary strings and non-finite numeric facts", () => {
  const event = buildErrorMonitorEvent(new Error("private note"), {
    scope: "auth-route", route: "/api/auth/login", status: 503,
    tags: { username: "private-name", runtime: "nodejs", source: "private-name" },
    extra: { username: "private-name", durationMs: 12, attempts: Infinity, stackHead: "private-name" }
  });
  assert.equal(event.message, "unhandled-error");
  assert.equal(event.tags.route, "/api/auth/login");
  assert.equal(event.tags.status, "503");
  assert.equal(event.extra.durationMs, 12);
  assert.equal("attempts" in event.extra, false);
  assert.equal("username" in event.extra, false);
  assert.equal("stackHead" in event.extra, false);
  assert.doesNotMatch(JSON.stringify(event), /private/);
});

test("monitor classifies both runtime errors and SQL failures without their raw text", () => {
  const error = Object.assign(new Error("private query value"), { code: "57014" });
  const event = buildErrorMonitorEvent(error, { scope: "datastore", route: "userStore.writePostgresDatabase" });
  assert.equal(event.message, "postgres-statement-timeout");
  assert.equal(event.extra.errorCode, "57014");
  assert.equal(redactSensitiveText("failed to fetch private draft"), "network-failed");
  assert.doesNotMatch(JSON.stringify(event), /private/);
});

test("Sentry transport ships a well-formed envelope with route tags and no PII", async () => {
  const { calls, fetchImpl } = stubFetch();
  const event = buildErrorMonitorEvent(new Error("boom for leung@example.test"), {
    scope: "auth-route",
    route: "/api/auth/login",
    kind: "postgres-connect-timeout",
    status: 503
  });

  const result = await sendErrorMonitorEvent({
    event,
    env: sentryEnv,
    fetchImpl,
    rateLimitKey: "test:sentry-envelope"
  });

  assert.equal(result.status, "sent");
  assert.equal(result.channel, "sentry");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://o4507.ingest.sentry.io/api/4508/envelope/");
  assert.match(calls[0].headers.get("x-sentry-auth") ?? "", /sentry_key=publickey123/);

  const [header, itemHeader, payloadLine] = calls[0].body.trim().split("\n");
  assert.equal(JSON.parse(header).event_id, event.eventId);
  assert.equal(JSON.parse(itemHeader).type, "event");

  const payload = JSON.parse(payloadLine) as {
    tags: Record<string, string>;
    environment: string;
    release: string;
    transaction: string;
    exception: { values: Array<{ type: string; value: string }> };
  };
  assert.equal(payload.tags.route, "/api/auth/login");
  assert.equal(payload.tags.scope, "auth-route");
  assert.equal(payload.tags.kind, "postgres-connect-timeout");
  assert.equal(payload.tags.status, "503");
  assert.equal(payload.environment, "preview");
  assert.equal(payload.release, "abc123def456");
  assert.equal(payload.transaction, "/api/auth/login");
  assert.equal(payload.exception.values[0].type, "Error");
  assert.ok(!calls[0].body.includes("leung@example.test"), "PII reached the wire");
});

test("webhook transport posts scrubbed JSON", async () => {
  const { calls, fetchImpl } = stubFetch();
  const result = await reportServerError(
    new Error("tutor stream aborted"),
    { scope: "ai-tutor", route: "/api/ai-tutor/resolve", kind: "stream-abort", extra: { durationMs: 1200 } },
    { env: { ERROR_MONITOR_WEBHOOK_URL: "https://hooks.example.test/errors" }, fetchImpl }
  );

  assert.equal(result.status, "sent");
  assert.equal(result.channel, "webhook");
  const body = JSON.parse(calls[0].body) as {
    event: string;
    tags: Record<string, string>;
    extra: Record<string, unknown>;
  };
  assert.equal(body.event, "app.error");
  assert.equal(body.tags.route, "/api/ai-tutor/resolve");
  assert.equal(body.tags.scope, "ai-tutor");
  assert.equal(body.extra.durationMs, 1200);
});

test("transport failures are reported, never thrown", async () => {
  const httpFailure = await sendErrorMonitorEvent({
    event: buildErrorMonitorEvent(new Error("boom"), { scope: "api-route", route: "/api/auth/login" }),
    env: sentryEnv,
    fetchImpl: async () => new Response("nope", { status: 429 }),
    rateLimitKey: "test:http-failure"
  });
  assert.equal(httpFailure.status, "failed");
  assert.equal(httpFailure.errorCode, "http-error");
  assert.equal(httpFailure.httpStatus, 429);

  const timeout = await sendErrorMonitorEvent({
    event: buildErrorMonitorEvent(new Error("boom"), { scope: "api-route", route: "/api/auth/login" }),
    env: sentryEnv,
    fetchImpl: async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    },
    rateLimitKey: "test:timeout"
  });
  assert.equal(timeout.status, "failed");
  assert.equal(timeout.errorCode, "timeout");
});

test("a crash loop cannot flood the monitor", async () => {
  const { calls, fetchImpl } = stubFetch();
  const env = { ...sentryEnv, ERROR_MONITOR_MAX_EVENTS_PER_MINUTE: "2" };
  const send = () =>
    sendErrorMonitorEvent({
      event: buildErrorMonitorEvent(new Error("loop"), { scope: "api-route", route: "/api/auth/login" }),
      env,
      fetchImpl,
      rateLimitKey: "test:flood"
    });

  assert.equal((await send()).status, "sent");
  assert.equal((await send()).status, "sent");
  assert.equal((await send()).status, "rate-limited");
  assert.equal(calls.length, 2);
});

test("scrubbing is idempotent so an already-scrubbed event survives transport unchanged", () => {
  const event: ErrorMonitorEvent = buildErrorMonitorEvent(new Error("plain failure"), {
    scope: "health",
    route: "/api/health",
    extra: { checkedInMs: 120, storageReady: false }
  });

  assert.deepEqual(scrubErrorMonitorEvent(event), event);
  assert.equal(event.extra.storageReady, false);
});
