import assert from "node:assert/strict";
import test from "node:test";
import { createWarmRouteHandler } from "./handler";

function assertPrivateNoStore(response: Response) {
  const cacheControl = response.headers.get("cache-control") ?? "";
  assert.match(cacheControl, /\bprivate\b/iu);
  assert.match(cacheControl, /\bno-store\b/iu);
}

test("warm route exposes only Next-supported route exports", async () => {
  const route = await import("./route");
  assert.deepEqual(Object.keys(route).sort(), ["GET", "dynamic", "runtime"]);
});

test("warm handler is private, fail-closed, and never probes storage without valid cron authorization", async () => {
  let probeCalls = 0;
  const missingSecretHandler = createWarmRouteHandler({
    getStorageReadinessSnapshot: async () => {
      probeCalls += 1;
      return { durableReady: true };
    },
    readCronSecret: () => undefined
  });
  const missingSecretResponse = await missingSecretHandler(new Request("https://mais.example/api/warm"));
  assert.equal(missingSecretResponse.status, 503);
  assert.deepEqual(await missingSecretResponse.json(), { error: "Warm endpoint unavailable." });
  assertPrivateNoStore(missingSecretResponse);
  assert.equal(probeCalls, 0, "a missing server secret must not make the endpoint public");

  const invalidBearerHandler = createWarmRouteHandler({
    getStorageReadinessSnapshot: async () => {
      probeCalls += 1;
      return { durableReady: true };
    },
    readCronSecret: () => "expected-secret"
  });
  const invalidBearerResponse = await invalidBearerHandler(new Request("https://mais.example/api/warm", {
    headers: { authorization: "Bearer wrong-secret" }
  }));
  assert.equal(invalidBearerResponse.status, 401);
  assert.deepEqual(await invalidBearerResponse.json(), { error: "Unauthorized." });
  assertPrivateNoStore(invalidBearerResponse);
  assert.equal(probeCalls, 0, "an invalid bearer must not touch storage");
});

test("authorized warm handler exposes only a stable scalar readiness result", async () => {
  const request = new Request("https://mais.example/api/warm", {
    headers: { authorization: "Bearer expected-secret" }
  });

  let currentTime = 1_000;
  const readyHandler = createWarmRouteHandler({
    getStorageReadinessSnapshot: async () => ({ durableReady: true }),
    now: () => {
      currentTime += 7;
      return currentTime;
    },
    readCronSecret: () => "expected-secret"
  });
  const readyResponse = await readyHandler(request);
  assert.equal(readyResponse.status, 200);
  assert.deepEqual(await readyResponse.json(), {
    warm: true,
    storageReady: true,
    warmedInMs: 7
  });
  assertPrivateNoStore(readyResponse);

  const unavailableHandler = createWarmRouteHandler({
    getStorageReadinessSnapshot: async () => {
      throw Object.assign(
        new Error("secret-db.internal:5432 relation app_state does not exist"),
        { code: "42P01" }
      );
    },
    now: () => 2_000,
    readCronSecret: () => "expected-secret"
  });
  const unavailableResponse = await unavailableHandler(request);
  assert.equal(unavailableResponse.status, 200);
  const unavailableBody = JSON.stringify(await unavailableResponse.json());
  assert.equal(unavailableBody, JSON.stringify({ warm: true, storageReady: false, warmedInMs: 0 }));
  assert.doesNotMatch(unavailableBody, /secret-db|5432|42P01|app_state/iu);
  assertPrivateNoStore(unavailableResponse);
});
