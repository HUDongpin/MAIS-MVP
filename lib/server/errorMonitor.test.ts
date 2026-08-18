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
  scrubErrorMonitorEvent,
  sendErrorMonitorEvent,
  type ErrorMonitorEvent
} from "./errorMonitor";

const sentryEnv = {
  SENTRY_DSN: "https://publickey123@o4507.ingest.sentry.io/4508",
  ERROR_MONITOR_ENVIRONMENT: "preview",
  ERROR_MONITOR_RELEASE: "abc123def456"
};

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
  const result = await reportServerError(new Error("boom"), { scope: "api-route", route: "/api/test" }, {
    env,
    fetchImpl: async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }
  });

  assert.deepEqual(result, { status: "not-configured", channel: "none" });
  assert.equal(called, false);
});

test("captureServerError never throws, even on a hostile error value", () => {
  const hostile = {
    get name() {
      throw new Error("name getter exploded");
    }
  };
  assert.doesNotThrow(() => captureServerError(hostile, { scope: "api-route", route: "/api/test" }));
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

test("beforeSend scrub drops every field that is not explicitly allowlisted", () => {
  const scrubbed = scrubErrorMonitorEvent({
    eventId: "e".repeat(32),
    timestamp: 1_760_000_000_000,
    level: "error",
    scope: "api-route",
    message: "failed",
    errorName: "TypeError",
    tags: {
      route: "/api/auth/login",
      username: "leung.siu.ming",
      email: "parent@example.test",
      studentId: "student-123"
    },
    extra: {
      durationMs: 42,
      requestBody: "{\"message\":\"help me with question 3\"}",
      cookies: "mais_session=abcdef",
      childName: "Siu Ming"
    }
  });

  assert.deepEqual(Object.keys(scrubbed.tags), ["route"]);
  assert.deepEqual(Object.keys(scrubbed.extra), ["durationMs"]);
  assert.equal(scrubbed.extra.durationMs, 42);
});

test("redaction removes emails, credentials, tokens, ids and conversation text", () => {
  const redacted = redactSensitiveText(
    [
      "login failed for parent.name+tag@example.test",
      "connection postgres://appuser:s3cretpw@db.neon.tech/main",
      "cookie: mais_session=Ab12Cd34Ef56",
      "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.KMUFsIDBnQ4mQ9FhF2Yl0w",
      "phone 85298765432",
      "callback https://mais.ac/reset-password?token=secret-token-value",
      "tutor said \"我不明白這道題目可以再解釋一次嗎謝謝老師\"",
      "at handler (/Users/someperson/code/app/route.ts:10:3)"
    ].join(" "),
    2000
  );

  assert.ok(!redacted.includes("parent.name+tag@example.test"), "email survived");
  assert.ok(!redacted.includes("s3cretpw"), "database password survived");
  assert.ok(!redacted.includes("Ab12Cd34Ef56"), "session cookie survived");
  assert.ok(!redacted.includes("eyJhbGciOiJIUzI1NiJ9"), "bearer token survived");
  assert.ok(!redacted.includes("85298765432"), "phone number survived");
  assert.ok(!redacted.includes("secret-token-value"), "reset token survived");
  assert.ok(!/[㐀-鿿]/.test(redacted), "conversation text survived");
  assert.ok(!redacted.includes("someperson"), "home directory account name survived");
  assert.ok(redacted.includes("/Users/[user]/code/app/route.ts"), "the useful part of the path was destroyed");
  assert.ok(redacted.includes("login failed for"), "diagnostic text was destroyed");
});

test("redaction clamps runaway messages", () => {
  const redacted = redactSensitiveText("x".repeat(5000));
  assert.ok(redacted.length <= 241, `message was ${redacted.length} characters`);
});

test("built events keep the route tag and drop caller-supplied PII", () => {
  const event = buildErrorMonitorEvent(
    Object.assign(new Error("insert failed for pupil chan.tai.man@example.test"), { code: "ECONNRESET" }),
    {
      scope: "datastore",
      route: "userStore.writePostgresDatabase",
      kind: "postgres-connection",
      tags: { storage: "postgres", username: "chan.tai.man" },
      extra: { operation: "app_state-upsert", payloadBytes: 5_900_000, studentEmail: "chan@example.test" }
    },
    { now: 1_760_000_000_000, eventId: "a".repeat(32) }
  );

  assert.equal(event.tags.route, "userStore.writePostgresDatabase");
  assert.equal(event.tags.scope, "datastore");
  assert.equal(event.tags.kind, "postgres-connection");
  assert.equal(event.tags.storage, "postgres");
  assert.equal(event.tags.username, undefined);
  assert.equal(event.extra.errorCode, "ECONNRESET");
  assert.equal(event.extra.operation, "app_state-upsert");
  assert.equal(event.extra.studentEmail, undefined);
  assert.ok(!event.message.includes("chan.tai.man@example.test"));
  assert.ok(String(event.extra.stackHead ?? "").includes("Error"));
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
    event: buildErrorMonitorEvent(new Error("boom"), { scope: "api-route", route: "/api/test" }),
    env: sentryEnv,
    fetchImpl: async () => new Response("nope", { status: 429 }),
    rateLimitKey: "test:http-failure"
  });
  assert.equal(httpFailure.status, "failed");
  assert.equal(httpFailure.errorCode, "http-error");
  assert.equal(httpFailure.httpStatus, 429);

  const timeout = await sendErrorMonitorEvent({
    event: buildErrorMonitorEvent(new Error("boom"), { scope: "api-route", route: "/api/test" }),
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
      event: buildErrorMonitorEvent(new Error("loop"), { scope: "api-route", route: "/api/test" }),
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
