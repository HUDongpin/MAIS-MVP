import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyHealthFailure,
  dispatchHealthAlertIfDue,
  evaluateHealthAlert,
  initialHealthAlertState,
  isHealthAlertConfigured,
  probeStorageHealth,
  readHealthAlertConfig,
  readHealthAlertState,
  resetHealthAlertState,
  sendHealthAlert,
  type HealthSnapshot
} from "./healthCheck";

const degradedSnapshot: HealthSnapshot = {
  status: "degraded",
  storageReady: false,
  checkedInMs: 5000,
  failureKind: "postgres-connect-timeout",
  provider: "postgres",
  posture: "postgres-unavailable",
  environment: "production",
  release: "abc123def456",
  region: "pdx1"
};

test("a healthy durable-storage probe reports ok", async () => {
  const snapshot = await probeStorageHealth({
    probe: async () => ({ provider: "postgres", status: "durable-ready", durableReady: true }),
    env: { VERCEL_ENV: "production", VERCEL_REGION: "pdx1", VERCEL_GIT_COMMIT_SHA: "abc123def4567890" }
  });

  assert.equal(snapshot.status, "ok");
  assert.equal(snapshot.storageReady, true);
  assert.equal(snapshot.failureKind, "");
  assert.equal(snapshot.provider, "postgres");
  assert.equal(snapshot.posture, "durable-ready");
  assert.equal(snapshot.environment, "production");
  assert.equal(snapshot.release, "abc123def456");
  assert.equal(snapshot.region, "pdx1");
});

test("an unreachable Postgres is degraded and names the store's own reason", async () => {
  const snapshot = await probeStorageHealth({
    probe: async () => ({ provider: "postgres", status: "postgres-unavailable", durableReady: false }),
    env: {}
  });

  assert.equal(snapshot.status, "degraded");
  assert.equal(snapshot.failureKind, "postgres-unavailable");
  assert.equal(snapshot.storageReady, false);
});

test("a SQLite demo deployment is reported, not alarmed about", async () => {
  // durableReady is false here by configuration (no HK_MATH_DB_PATH), not because anything
  // is broken. Paging on it would make the endpoint useless within a day.
  const snapshot = await probeStorageHealth({
    probe: async () => ({ provider: "sqlite", status: "demo-only", durableReady: false }),
    env: {}
  });

  assert.equal(snapshot.status, "ok");
  assert.equal(snapshot.storageReady, false);
  assert.equal(snapshot.posture, "demo-only");
  assert.equal(snapshot.failureKind, "");
});

test("a throwing probe is classified, not propagated", async () => {
  const snapshot = await probeStorageHealth({
    probe: async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    },
    env: {}
  });

  assert.equal(snapshot.status, "degraded");
  assert.equal(snapshot.failureKind, "postgres-connection");
  assert.equal(snapshot.posture, "probe-failed");
});

test("a hung probe times out instead of hanging the cron", async () => {
  const snapshot = await probeStorageHealth({
    probe: () => new Promise(() => {}),
    env: { HEALTH_CHECK_TIMEOUT_MS: "500" }
  });

  assert.equal(snapshot.status, "degraded");
  assert.equal(snapshot.failureKind, "probe-timeout");
});

test("failure classification names the same causes as the auth boundary", () => {
  assert.equal(classifyHealthFailure(new Error("Neon data transfer quota exceeded")), "postgres-quota");
  assert.equal(classifyHealthFailure(Object.assign(new Error("x"), { code: "CONNECT_TIMEOUT" })), "postgres-connect-timeout");
  assert.equal(classifyHealthFailure(new Error("POSTGRES_URL is required")), "postgres-url-missing");
  assert.equal(classifyHealthFailure(new Error("something else")), "unclassified");
});

test("alerting is not configured without Resend recipients or a webhook", async () => {
  assert.equal(isHealthAlertConfigured({}), false);
  assert.equal(readHealthAlertConfig({ RESEND_API_KEY: "key" }).channel, "none", "an API key alone is not enough");

  const result = await sendHealthAlert({ kind: "down", snapshot: degradedSnapshot, env: {} });
  assert.deepEqual(result, { status: "not-configured", channel: "none" });
});

test("alert dedupe: alert on the way down, stay quiet, re-alert after the repeat window", () => {
  const repeatMs = 30 * 60 * 1000;

  const first = evaluateHealthAlert(initialHealthAlertState, { status: "degraded", now: 1000, repeatMs });
  assert.equal(first.dispatch, true);
  assert.equal(first.kind, "down");

  const second = evaluateHealthAlert(first.nextState, { status: "degraded", now: 1000 + 5 * 60 * 1000, repeatMs });
  assert.equal(second.dispatch, false);
  assert.equal(second.nextState.lastAlertAt, 1000, "the quiet run must not slide the repeat window");

  const third = evaluateHealthAlert(second.nextState, { status: "degraded", now: 1000 + repeatMs, repeatMs });
  assert.equal(third.dispatch, true);
  assert.equal(third.kind, "down");

  const recovery = evaluateHealthAlert(third.nextState, { status: "ok", now: 1000 + repeatMs + 1000, repeatMs });
  assert.equal(recovery.dispatch, true);
  assert.equal(recovery.kind, "recovered");

  const steady = evaluateHealthAlert(recovery.nextState, { status: "ok", now: 1000 + repeatMs + 2000, repeatMs });
  assert.equal(steady.dispatch, false);
  assert.equal(steady.kind, "none");
});

test("health alerts carry ops facts only — no user-derived fields", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const result = await sendHealthAlert({
    kind: "down",
    snapshot: degradedSnapshot,
    env: { HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" },
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown> });
      return new Response("{}", { status: 200 });
    }
  });

  assert.deepEqual(result, { status: "sent", channel: "webhook" });
  assert.equal(calls[0].url, "https://hooks.example.test/health");
  assert.deepEqual(Object.keys(calls[0].body).sort(), [
    "checkedInMs",
    "environment",
    "event",
    "failureKind",
    "posture",
    "provider",
    "region",
    "release",
    "status",
    "storageReady",
    "subject",
    "text"
  ]);
  assert.equal(calls[0].body.event, "health.down");
  assert.equal(calls[0].body.failureKind, "postgres-connect-timeout");
});

test("Resend alerts go to every configured recipient", async () => {
  const calls: Array<{ url: string; authorization: string; body: Record<string, unknown> }> = [];
  const result = await sendHealthAlert({
    kind: "recovered",
    snapshot: { ...degradedSnapshot, status: "ok", storageReady: true, failureKind: "" },
    env: {
      RESEND_API_KEY: "test-resend-key",
      HEALTH_ALERT_FROM: "MAIS Ops <ops@example.test>",
      HEALTH_ALERT_EMAIL_TO: "owner@example.test, oncall@example.test"
    },
    fetchImpl: async (url, init) => {
      calls.push({
        url: String(url),
        authorization: new Headers(init?.headers).get("authorization") ?? "",
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
      });
      return new Response("{}", { status: 200 });
    }
  });

  assert.deepEqual(result, { status: "sent", channel: "resend" });
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(calls[0].authorization, "Bearer test-resend-key");
  assert.deepEqual(calls[0].body.to, ["owner@example.test", "oncall@example.test"]);
  assert.match(String(calls[0].body.subject), /recovered/);
});

test("a failing alert transport is reported, never thrown", async () => {
  const result = await sendHealthAlert({
    kind: "down",
    snapshot: degradedSnapshot,
    env: { HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" },
    fetchImpl: async () => {
      throw new Error("network down");
    }
  });

  assert.deepEqual(result, { status: "failed", channel: "webhook" });
});

test("the instance-level dispatcher applies dedupe across successive probes", async () => {
  resetHealthAlertState();
  const sent: string[] = [];
  const env = { HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health", HEALTH_ALERT_REPEAT_MS: "60000" };
  const fetchImpl = async (_url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    sent.push(String((JSON.parse(String(init?.body ?? "{}")) as { event?: string }).event));
    return new Response("{}", { status: 200 });
  };

  const down = await dispatchHealthAlertIfDue({ snapshot: degradedSnapshot, env, fetchImpl, now: 10_000 });
  assert.equal(down.status, "sent");

  const quiet = await dispatchHealthAlertIfDue({ snapshot: degradedSnapshot, env, fetchImpl, now: 20_000 });
  assert.equal(quiet.status, "skipped");

  const recovered = await dispatchHealthAlertIfDue({
    snapshot: { ...degradedSnapshot, status: "ok", storageReady: true, failureKind: "" },
    env,
    fetchImpl,
    now: 30_000
  });
  assert.equal(recovered.status, "sent");
  assert.deepEqual(sent, ["health.down", "health.recovered"]);
  assert.equal(readHealthAlertState().lastStatus, "ok");
  resetHealthAlertState();
});
