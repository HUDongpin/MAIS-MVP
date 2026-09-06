import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";
import { createTestErrorHandler } from "./handler";

test("a deliberate error probe is disabled without an explicit switch on every runtime", async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-only-observability-secret";
  try {
    const response = await GET(new Request("https://app.example.test/api/observability/test-error", {
      headers: { authorization: "Bearer test-only-observability-secret" }
    }));
    assert.equal(response.status, 404);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("enabled probes still require a secret and exact bearer authentication", async () => {
  let calls = 0;
  for (const env of [
    { NODE_ENV: "production", OBSERVABILITY_TEST_ERROR_ENABLED: "true" },
    { NODE_ENV: "production", OBSERVABILITY_TEST_ERROR_ENABLED: "true", CRON_SECRET: "fixture" },
    { VERCEL: "1", OBSERVABILITY_TEST_ERROR_ENABLED: "false", CRON_SECRET: "fixture" }
  ]) {
    const handler = createTestErrorHandler({ env, report: async () => { calls += 1; return { status: "not-configured", channel: "none" }; } });
    const response = await handler(new Request("https://app.example.test/api/observability/test-error", { headers: { authorization: "Bearer wrong" } }));
    assert.equal(response.status, 404); assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(calls, 0);
});

test("a configured authenticated probe awaits mock delivery and reports only bounded results", async () => {
  let calls = 0;
  const handler = createTestErrorHandler({ env: { NODE_ENV: "production", OBSERVABILITY_TEST_ERROR_ENABLED: "true", CRON_SECRET: "fixture" }, report: async () => { calls += 1; return { status: "not-configured", channel: "none" }; } });
  const response = await handler(new Request("https://app.example.test/api/observability/test-error", { headers: { authorization: "Bearer fixture" } }));
  assert.equal(response.status, 200); assert.equal(calls, 1);
  assert.deepEqual(await response.json(), { probe: "error-monitor", channel: "none", delivery: "not-configured", eventId: null });
});

test("probe transport exceptions are contained", async () => {
  const handler = createTestErrorHandler({ env: { OBSERVABILITY_TEST_ERROR_ENABLED: "true", CRON_SECRET: "fixture" }, report: async () => { throw new Error("private transport diagnostics"); } });
  const response = await handler(new Request("https://app.example.test/api/observability/test-error", { headers: { authorization: "Bearer fixture" } }));
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { probe: "error-monitor", delivery: "failed" });
});
