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
    probe: async () => ready(),
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
    probe: async () => ready({ status: "postgres-unavailable", durableReady: false, hotAuthTables: { tablesReady: false } }),
    env: {}
  });

  assert.equal(snapshot.status, "degraded");
  assert.equal(snapshot.failureKind, "postgres-unavailable");
  assert.equal(snapshot.storageReady, false);
});

test("an explicitly enabled local test demo is reported without paging", async () => {
  // durableReady is false here by configuration (no HK_MATH_DB_PATH), not because anything
  // is broken. Paging on it would make the endpoint useless within a day.
  const snapshot = await probeStorageHealth({
    probe: async () => demo(),
    env: { NODE_ENV: "test", HEALTH_CHECK_ALLOW_LOCAL_DEMO: "true" }
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

test("a failed alert send does not start the dedupe window", async () => {
  resetHealthAlertState();
  const attempts: string[] = [];
  const env = { HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health", HEALTH_ALERT_REPEAT_MS: "1800000" };
  const failing = async () => {
    attempts.push("down");
    throw new Error("alert transport down");
  };

  const first = await dispatchHealthAlertIfDue({ snapshot: degradedSnapshot, env, fetchImpl: failing, now: 1000 });
  assert.equal(first.status, "failed");
  assert.deepEqual(readHealthAlertState(), initialHealthAlertState, "failed delivery must not be recorded as sent");

  // One minute later — far inside the 30-minute repeat window — the outage must be retried,
  // because nobody has actually been told about it yet.
  const second = await dispatchHealthAlertIfDue({ snapshot: degradedSnapshot, env, fetchImpl: failing, now: 61_000 });
  assert.equal(second.status, "failed");
  assert.deepEqual(attempts, ["down", "down"]);
  resetHealthAlertState();
});

test("a failed recovery notice is retried rather than lost", async () => {
  resetHealthAlertState();
  const healthy = { ...degradedSnapshot, status: "ok" as const, storageReady: true, failureKind: "" };
  const env = { HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" };
  const events: string[] = [];
  const ok = async (_url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    events.push(String((JSON.parse(String(init?.body ?? "{}")) as { event?: string }).event));
    return new Response("{}", { status: 200 });
  };

  await dispatchHealthAlertIfDue({ snapshot: degradedSnapshot, env, fetchImpl: ok, now: 1000 });
  const lostRecovery = await dispatchHealthAlertIfDue({
    snapshot: healthy,
    env,
    fetchImpl: async () => new Response("nope", { status: 500 }),
    now: 2000
  });
  assert.equal(lostRecovery.status, "failed");

  const retried = await dispatchHealthAlertIfDue({ snapshot: healthy, env, fetchImpl: ok, now: 3000 });
  assert.equal(retried.status, "sent");
  assert.deepEqual(events, ["health.down", "health.recovered"]);
  resetHealthAlertState();
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


function ready(overrides: Record<string, unknown> = {}) {
  return { provider: "postgres", status: "durable-ready", durableReady: true, configuredPath: true,
    configuredUrl: true, runtime: "local", usingTmpFallback: false, hotAuthTables: { tablesReady: true }, ...overrides };
}
function demo() { return { provider: "sqlite", status: "demo-only", durableReady: false, configuredPath: false, runtime: "local", usingTmpFallback: false }; }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

for (const [name, value] of [
  ["undefined", undefined], ["null", null], ["array", []], ["empty", {}],
  ["unknown provider", ready({ provider: "unknown-private-label" })],
  ["coercible provider object", ready({ provider: { toString: () => "postgres" } })],
  ["coercible runtime object", ready({ runtime: { toString: () => "local" } })],
  ["unknown status", ready({ status: "some-private-diagnostic" })],
  ["non-boolean durableReady", ready({ durableReady: "true" })],
  ["missing configuration fact", ready({ configuredPath: undefined })],
  ["missing hot-auth readiness", ready({ hotAuthTables: undefined })],
  ["contradictory readiness", ready({ durableReady: false })]
] as const) {
  test(`malformed readiness fails closed: ${name}`, async () => {
    const snapshot = await probeStorageHealth({ probe: async () => value, env: { NODE_ENV: "production" } });
    assert.equal(snapshot.status, "degraded");
    assert.equal(snapshot.storageReady, false);
    assert.doesNotMatch(JSON.stringify(snapshot), /private-label|private-diagnostic/);
  });
}

test("local-demo exception requires explicit local posture and never overrides production", async () => {
  for (const env of [{}, { NODE_ENV: "production" }, { NODE_ENV: "production", HEALTH_CHECK_ALLOW_LOCAL_DEMO: "true" },
    { NODE_ENV: "development", VERCEL: "1", HEALTH_CHECK_ALLOW_LOCAL_DEMO: "true" },
    { NODE_ENV: "test", VERCEL_ENV: "preview", HEALTH_CHECK_ALLOW_LOCAL_DEMO: "true" }]) {
    assert.equal((await probeStorageHealth({ probe: async () => demo(), env })).status, "degraded");
  }
});

test("singleflight includes cache misses and trusted readers but trusted calls bypass completed cache", async () => {
  const { createStorageHealthReader } = await import("./healthCheck");
  let calls = 0; let time = 0; const first = deferred<unknown>();
  const reader = createStorageHealthReader({ probe: async (options) => { assert.deepEqual(options, { includeDiagnosticsCounts: false }); calls++; return calls === 1 ? first.promise : ready(); }, env: {}, now: () => time });
  const pending = [reader.read(false), reader.read(false), reader.read(true)];
  await flush(); assert.equal(calls, 1); first.resolve(ready());
  assert.deepEqual((await Promise.all(pending)).map((x) => x.status), ["ok", "ok", "ok"]);
  await reader.read(false); assert.equal(calls, 1);
  await reader.read(true); assert.equal(calls, 2);
  time += 10_001; await reader.read(false); assert.equal(calls, 3);
});

test("a timed-out never-settling probe retains one latch and every later request remains bounded", { timeout: 3000 }, async () => {
  const { createStorageHealthReader } = await import("./healthCheck");
  let calls = 0;
  const reader = createStorageHealthReader({ probe: async () => { calls++; return new Promise(() => {}); }, env: { HEALTH_CHECK_TIMEOUT_MS: "500" } });
  assert.equal((await reader.read(true)).failureKind, "probe-timeout");
  assert.deepEqual((await Promise.all(Array.from({ length: 20 }, (_, i) => reader.read(i % 2 === 0)))).map((x) => x.failureKind), Array(20).fill("probe-timeout"));
  assert.equal(calls, 1);
});

test("late probe settlement releases the latch without publishing the stale success", { timeout: 3000 }, async () => {
  const { createStorageHealthReader } = await import("./healthCheck");
  let calls = 0; const late = deferred<unknown>();
  const reader = createStorageHealthReader({ probe: async () => { calls++; return calls === 1 ? late.promise : ready({ status: "postgres-unavailable", durableReady: false, hotAuthTables: { tablesReady: false } }); }, env: { HEALTH_CHECK_TIMEOUT_MS: "500" } });
  assert.equal((await reader.read(false)).failureKind, "probe-timeout");
  late.resolve(ready()); await flush();
  assert.equal((await reader.read(false)).failureKind, "probe-timeout");
  assert.equal((await reader.read(true)).status, "degraded"); assert.equal(calls, 2);
});

for (const url of ["http://hooks.example.test/health", "https://user:pass@hooks.example.test/health", "https://hooks.example.test/health#fragment", "not a URL"]) {
  test(`invalid alert destination fails closed: ${url}`, async () => {
    let calls = 0;
    const result = await sendHealthAlert({ kind: "down", snapshot: degradedSnapshot, env: { HEALTH_ALERT_WEBHOOK_URL: url }, fetchImpl: async () => { calls++; return new Response(null); } });
    assert.equal(result.status, "not-configured"); assert.equal(calls, 0);
  });
}

test("shared Resend key requires strict dedicated health sender and recipient configuration", async () => {
  for (const env of [
    { RESEND_API_KEY: "synthetic-key" },
    { RESEND_API_KEY: "synthetic-key", HEALTH_ALERT_FROM: "not-an-address", HEALTH_ALERT_EMAIL_TO: "owner@example.test" },
    { RESEND_API_KEY: "synthetic-key", HEALTH_ALERT_FROM: "ops@example.test", HEALTH_ALERT_EMAIL_TO: "owner@example.test\r\nBcc: other@example.test" },
    { RESEND_API_KEY: "synthetic-key", HEALTH_ALERT_FROM: "ops@example.test", HEALTH_ALERT_EMAIL_TO: "bad", HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" }
  ]) assert.equal(isHealthAlertConfigured(env), false);
});

test("alert serializer rejects arbitrary labels and extra private fields even for a manually built snapshot", async () => {
  let body = "";
  await sendHealthAlert({ kind: "down", snapshot: { ...degradedSnapshot, environment: "private-synthetic-marker", release: "private-synthetic-marker", region: "private-synthetic-marker", provider: "private-synthetic-marker", posture: "private-synthetic-marker", failureKind: "private-synthetic-marker", checkedInMs: Number.NaN } as HealthSnapshot,
    env: { HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" }, fetchImpl: async (_url, init) => { body = String(init?.body); return new Response(null, { status: 200 }); } });
  assert.doesNotMatch(body, /private-synthetic-marker|NaN/);
});

test("transport forbids redirects and cancels every unused response body", async () => {
  for (const status of [200, 302, 500]) {
    let cancelled = 0;
    const result = await sendHealthAlert({ kind: "down", snapshot: degradedSnapshot, env: { HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" },
      fetchImpl: async (_url, init) => { assert.equal(init?.redirect, "error"); assert.equal(init?.credentials, "omit"); return new Response(new ReadableStream({ cancel() { cancelled++; } }), { status }); } });
    assert.equal(result.status, status === 200 ? "sent" : "failed"); assert.equal(cancelled, 1);
  }
});

test("a transport ignoring abort still returns a bounded failure and cancels a late response", { timeout: 3000 }, async () => {
  const late = deferred<Response>(); let cancelled = 0; let signal: AbortSignal | undefined;
  const result = await sendHealthAlert({ kind: "down", snapshot: degradedSnapshot, env: { HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health", HEALTH_ALERT_TIMEOUT_MS: "1000" },
    fetchImpl: async (_url, init) => { signal = init?.signal as AbortSignal; return late.promise; } });
  assert.equal(result.status, "failed"); assert.equal(signal?.aborted, true);
  late.resolve(new Response(new ReadableStream({ cancel() { cancelled++; } }), { status: 200 })); await flush(); assert.equal(cancelled, 1);
});

test("concurrent identical alerts share one send and an observed recovery waits behind it", async () => {
  const { createHealthAlertDispatcher } = await import("./healthCheck");
  const first = deferred<Response>(); const events: string[] = [];
  const dispatcher = createHealthAlertDispatcher({ env: { HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" }, fetchImpl: async (_url, init) => { events.push(JSON.parse(String(init?.body)).event); return events.length === 1 ? first.promise : new Response(null, { status: 200 }); } });
  const down = dispatcher.dispatch({ snapshot: degradedSnapshot, now: 1000 });
  const same = dispatcher.dispatch({ snapshot: degradedSnapshot, now: 1000 });
  const recovered = dispatcher.dispatch({ snapshot: { ...degradedSnapshot, status: "ok", storageReady: true, failureKind: "" }, now: 2000 });
  await flush(); assert.deepEqual(events, ["health.down"]);
  first.resolve(new Response(null, { status: 200 }));
  assert.equal((await down).status, "sent"); assert.equal((await same).status, "sent"); assert.equal((await recovered).status, "sent");
  assert.deepEqual(events, ["health.down", "health.recovered"]); assert.equal(dispatcher.readState().lastStatus, "ok");
});

test("unconfigured alerts never start a dedupe window that masks later configuration", async () => {
  const { createHealthAlertDispatcher } = await import("./healthCheck");
  let calls = 0; const dispatcher = createHealthAlertDispatcher();
  assert.equal((await dispatcher.dispatch({ snapshot: degradedSnapshot, env: {}, now: 1000 })).status, "not-configured");
  assert.equal((await dispatcher.dispatch({ snapshot: degradedSnapshot, env: { HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" }, now: 1001, fetchImpl: async () => { calls++; return new Response(null); } })).status, "sent");
  assert.equal(calls, 1);
});


test("the alert deadline includes response cancellation and retains an unsettled transport latch", { timeout: 3000 }, async () => {
  const { createHealthAlertDispatcher } = await import("./healthCheck");
  let calls = 0;
  const dispatcher = createHealthAlertDispatcher({ env: { HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health", HEALTH_ALERT_TIMEOUT_MS: "1000" },
    fetchImpl: async () => { calls++; return new Response(new ReadableStream({ cancel: () => new Promise(() => {}) }), { status: 200 }); } });
  assert.equal((await dispatcher.dispatch({ snapshot: degradedSnapshot })).status, "failed");
  assert.equal((await dispatcher.dispatch({ snapshot: { ...degradedSnapshot, status: "ok", storageReady: true } })).status, "failed");
  assert.equal(calls, 1);
});


test("health destinations reject URL normalization", () => {
  for (const webhookUrl of ["https:hooks.example.test/health", "https://hooks.example.test/health#", "https://hooks.example.test\\path"]) {
    assert.equal(readHealthAlertConfig({ HEALTH_ALERT_WEBHOOK_URL: webhookUrl }).channel, "none", webhookUrl);
  }
});

test("health destinations reject invalid email dot atoms", () => {
  for (const address of [".ops@example.test", "ops.@example.test", "ops..team@example.test", `${"a".repeat(65)}@example.test`, `ops@${"a".repeat(64)}.test`]) {
    assert.equal(readHealthAlertConfig({ RESEND_API_KEY: "fixture-key", HEALTH_ALERT_FROM: "ops@example.test", HEALTH_ALERT_EMAIL_TO: address }).channel, "none", address);
  }
});
