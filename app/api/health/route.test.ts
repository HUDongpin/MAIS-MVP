import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createHealthGetHandler } from "./handler";

function ready(overrides: Record<string, unknown> = {}) {
  return { provider: "postgres", status: "durable-ready", durableReady: true, configuredPath: true,
    configuredUrl: true, runtime: "local", usingTmpFallback: false, hotAuthTables: { tablesReady: true }, ...overrides };
}
const down = () => ready({ status: "postgres-unavailable", durableReady: false, hotAuthTables: { tablesReady: false } });
const secret = "synthetic-health-cron-secret";
const request = (authorization?: string, cookie?: string) => new Request("https://fixture.test/api/health", {
  headers: { ...(authorization ? { Authorization: authorization } : {}), ...(cookie ? { Cookie: cookie } : {}) }
});
const trusted = () => request(`Bearer ${secret}`);
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; }
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

for (const env of [{}, { NODE_ENV: "development" }, { NODE_ENV: "test" }, { NODE_ENV: "production" }, { VERCEL: "1", VERCEL_ENV: "production" }]) {
  test(`missing explicit cron secret is anonymous in ${JSON.stringify(env)}`, async () => {
    let sends = 0;
    const get = createHealthGetHandler({ env: { ...env, HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" },
      probe: async (options) => { assert.deepEqual(options, { includeDiagnosticsCounts: false }); return down(); },
      fetchImpl: async () => { sends++; return new Response(null); } });
    const response = await get(request(undefined, "mais_session=synthetic-cookie"));
    assert.equal(response.status, 503);
    assert.deepEqual(Object.keys(await response.json()).sort(), ["checkedInMs", "status", "storageReady"]);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(sends, 0);
  });
}

test("only exact configured cron bearer enables details and alerts, including self-hosted production", async () => {
  let sends = 0;
  const get = createHealthGetHandler({ env: { NODE_ENV: "production", CRON_SECRET: secret, HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" },
    probe: async () => down(), fetchImpl: async () => { sends++; return new Response(null); } });
  for (const authorization of [undefined, "Bearer wrong", `bearer ${secret}`, `Bearer  ${secret}`]) {
    const result = await get(request(authorization, "mais_session=synthetic-parent-cookie"));
    assert.equal(Object.hasOwn(await result.json(), "provider"), false);
  }
  assert.equal(sends, 0);
  const response = await get(trusted()); const body = await response.json();
  assert.equal(response.status, 503); assert.equal(body.provider, "postgres"); assert.equal(sends, 1);
  assert.doesNotMatch(JSON.stringify(body), /synthetic-health-cron-secret|hooks\.example/);
});

test("invalid configured cron secret cannot enable trusted even if the request matches its visible text", async () => {
  let sends = 0;
  const get = createHealthGetHandler({ env: { CRON_SECRET: ` ${secret} `, HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" },
    probe: async () => down(), fetchImpl: async () => { sends++; return new Response(null); } });
  assert.equal(Object.hasOwn(await (await get(trusted())).json(), "provider"), false); assert.equal(sends, 0);
});

test("public bursts singleflight the strict probe and never spend the alert or shared-error budget", async () => {
  const held = deferred<unknown>(); let probes = 0; let sends = 0;
  const get = createHealthGetHandler({ env: { CRON_SECRET: secret, HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" },
    probe: async () => { probes++; return held.promise; }, fetchImpl: async () => { sends++; return new Response(null); } });
  const pending = Array.from({ length: 20 }, () => get(request())); await flush();
  assert.equal(probes, 1); held.resolve(down());
  assert.ok((await Promise.all(pending)).every((r) => r.status === 503));
  await get(request()); assert.equal(probes, 1); assert.equal(sends, 0);
  for (const relative of ["app/api/health/handler.ts", "lib/server/healthCheck.ts"]) {
    assert.doesNotMatch(await readFile(path.join(process.cwd(), relative), "utf8"), /captureServerError|errorMonitor|consumeInMemoryRateLimit/);
  }
});

test("trusted concurrent down checks share both the probe and one alert", async () => {
  const held = deferred<unknown>(); let probes = 0; let sends = 0;
  const get = createHealthGetHandler({ env: { CRON_SECRET: secret, HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health" },
    probe: async () => { probes++; return held.promise; }, fetchImpl: async () => { sends++; return new Response(null); } });
  const pending = Array.from({ length: 10 }, () => get(trusted())); await flush();
  assert.equal(probes, 1); held.resolve(down()); await Promise.all(pending); assert.equal(sends, 1);
});

test("production malformed and non-durable SQLite snapshots are degraded; explicit local demo is separate", async () => {
  const demo = { provider: "sqlite", status: "demo-only", durableReady: false, configuredPath: false, usingTmpFallback: false, runtime: "local" };
  for (const value of [undefined, {}, ready({ status: "unknown" }), demo]) {
    const get = createHealthGetHandler({ env: { NODE_ENV: "production", HEALTH_CHECK_ALLOW_LOCAL_DEMO: "true" }, probe: async () => value });
    assert.equal((await get(request())).status, 503);
  }
  const local = createHealthGetHandler({ env: { NODE_ENV: "development", HEALTH_CHECK_ALLOW_LOCAL_DEMO: "true" }, probe: async () => demo });
  const response = await local(request()); assert.equal(response.status, 200); assert.equal((await response.json()).storageReady, false);
});

test("a timed-out underlying probe never creates more hanging probes or unbounded trusted responses", { timeout: 3000 }, async () => {
  let calls = 0;
  const get = createHealthGetHandler({ env: { CRON_SECRET: secret, HEALTH_CHECK_TIMEOUT_MS: "500" }, probe: async () => { calls++; return new Promise(() => {}); } });
  assert.equal((await get(trusted())).status, 503);
  const later = await Promise.all(Array.from({ length: 20 }, () => get(trusted())));
  assert.ok(later.every((r) => r.status === 503)); assert.equal(calls, 1);
});

test("alert transport timeout cannot hold the health response or accumulate uncooperative sends", { timeout: 4000 }, async () => {
  let sends = 0; let healthy = false;
  const get = createHealthGetHandler({ env: { CRON_SECRET: secret, HEALTH_ALERT_WEBHOOK_URL: "https://hooks.example.test/health", HEALTH_ALERT_TIMEOUT_MS: "1000" },
    probe: async () => healthy ? ready() : down(), fetchImpl: async () => { sends++; return new Promise(() => {}); } });
  assert.equal((await get(trusted())).status, 503);
  healthy = true;
  assert.equal((await get(trusted())).status, 200);
  assert.ok((await Promise.all(Array.from({ length: 10 }, () => get(trusted())))).every((r) => r.status === 200));
  assert.equal(sends, 1);
});

test("route assembles existing strict readiness and cron only extends the current deployment configuration", async () => {
  const source = await readFile(path.join(process.cwd(), "app/api/health/route.ts"), "utf8");
  assert.match(source, /getStorageReadinessSnapshot/); assert.match(source, /createHealthGetHandler/);
  assert.doesNotMatch(source, /probeDurableStorageReadable|ensurePostgresStateTable|captureServerError/);
  const vercel = JSON.parse(await readFile(path.join(process.cwd(), "vercel.json"), "utf8"));
  assert.deepEqual(vercel.regions, ["sin1"]);
  assert.deepEqual(vercel.crons.filter((row: { path: string }) => row.path !== "/api/health"), [
    { path: "/api/warm", schedule: "*/5 * * * *" },
    { path: "/api/cron/teacher-notice-email", schedule: "*/5 * * * *" },
    { path: "/api/cron/teacher-notice-resend-webhook-maintenance", schedule: "*/5 * * * *" }
  ]);
  assert.deepEqual(vercel.crons.filter((row: { path: string }) => row.path === "/api/health"), [{ path: "/api/health", schedule: "*/5 * * * *" }]);
});
