import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { jcsHash } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";

const OPENAI_ENDPOINT = "https://us.api.openai.com/v1/responses";

async function subject() {
  return import("./live-provider-http-v5-r2.mjs").catch(() => ({}));
}

async function fixtureServer(t, handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}/v1/responses`;
}

test("loopback fixture transport exercises exact POST bytes without leaking the fake bearer token", async (t) => {
  const api = await subject();
  assert.equal(typeof api.createLoopbackFixtureHttpTransportV5R2, "function");

  const fakeToken = "sk-fixture-sentinel-never-persist-123456789";
  let receivedBody = "";
  let receivedAuthorization = null;
  const fixtureEndpoint = await fixtureServer(t, async (request, response) => {
    for await (const chunk of request) receivedBody += chunk;
    receivedAuthorization = request.headers.authorization ?? null;
    response.writeHead(200, {
      "content-type": "application/json",
      "x-request-id": "req_fixture_transport_001",
    });
    response.end(JSON.stringify({ id: "resp_fixture_transport_001", model: "gpt-5.6-luna" }));
  });

  let credentialReads = 0;
  const transport = api.createLoopbackFixtureHttpTransportV5R2({
    provider: "OPENAI_DIRECT",
    productionEndpoint: OPENAI_ENDPOINT,
    expectedModel: "gpt-5.6-luna",
    fixtureEndpoint,
    timeoutMs: 1_000,
    credentialSource: {
      async readBearerToken() {
        credentialReads += 1;
        return fakeToken;
      },
    },
  });
  const wireRequest = Object.freeze({ model: "gpt-5.6-luna", input: "fixture-only" });
  const result = await transport.send({
    permit: api.buildFixtureDispatchPermitV5R2({
      provider: "OPENAI_DIRECT",
      productionEndpoint: OPENAI_ENDPOINT,
      expectedModel: "gpt-5.6-luna",
    }),
    wireRequest,
  });

  assert.equal(credentialReads, 1);
  assert.equal(receivedAuthorization, `Bearer ${fakeToken}`);
  assert.deepEqual(JSON.parse(receivedBody), wireRequest);
  assert.equal(result.transportKind, "FIXTURE_HTTP_LOOPBACK_NO_PROVIDER_EVENT_V1");
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 1);
  assert.equal(result.httpStatus, 200);
  assert.equal(result.requestedEndpoint, OPENAI_ENDPOINT);
  assert.equal(result.fixtureEndpoint, fixtureEndpoint);
  assert.equal(result.providerRequestId, "req_fixture_transport_001");
  assert.doesNotMatch(JSON.stringify(result), /sk-fixture-sentinel/u);
  assert.doesNotMatch(receivedBody, /sk-fixture-sentinel/u);
});

test("loopback fixture transport converts an abort deadline into a retryable timeout result", async (t) => {
  const api = await subject();
  const fixtureEndpoint = await fixtureServer(t, (_request, response) => {
    setTimeout(() => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{}");
    }, 50);
  });
  const transport = api.createLoopbackFixtureHttpTransportV5R2({
    provider: "OPENAI_DIRECT",
    productionEndpoint: OPENAI_ENDPOINT,
    expectedModel: "gpt-5.6-luna",
    fixtureEndpoint,
    timeoutMs: 5,
    credentialSource: { async readBearerToken() { return "fixture-token"; } },
  });
  const result = await transport.send({
    permit: api.buildFixtureDispatchPermitV5R2({
      provider: "OPENAI_DIRECT",
      productionEndpoint: OPENAI_ENDPOINT,
      expectedModel: "gpt-5.6-luna",
    }),
    wireRequest: { model: "gpt-5.6-luna", input: "timeout-fixture" },
  });
  assert.equal(result.transportStatus, "TIMEOUT");
  assert.equal(result.retryClassification, "TIMEOUT");
  assert.equal(result.httpRequestCount, 1);
  assert.equal(result.httpStatus, null);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.rawResponseBody, null);
});

test("fixture HTTP status classification preserves malformed 200 bytes for the schema parser", async (t) => {
  const api = await subject();
  for (const [status, body, expectedTransportStatus, expectedRetry] of [
    [429, JSON.stringify({ error: "rate limited" }), "HTTP_429", "HTTP_429"],
    [500, JSON.stringify({ error: "provider failure" }), "HTTP_500", "HTTP_500"],
    [200, "not-json", "DELIVERED", "NOT_A_RETRY"],
  ]) {
    const fixtureEndpoint = await fixtureServer(t, (_request, response) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(body);
    });
    const transport = api.createLoopbackFixtureHttpTransportV5R2({
      provider: "OPENAI_DIRECT",
      productionEndpoint: OPENAI_ENDPOINT,
      expectedModel: "gpt-5.6-luna",
      fixtureEndpoint,
      timeoutMs: 1_000,
      credentialSource: { async readBearerToken() { return "fixture-token"; } },
    });
    const result = await transport.send({
      permit: api.buildFixtureDispatchPermitV5R2({
        provider: "OPENAI_DIRECT",
        productionEndpoint: OPENAI_ENDPOINT,
        expectedModel: "gpt-5.6-luna",
      }),
      wireRequest: { model: "gpt-5.6-luna", input: `status-${status}` },
    });
    assert.equal(result.transportStatus, expectedTransportStatus);
    assert.equal(result.retryClassification, expectedRetry);
    assert.equal(result.httpStatus, status);
    assert.equal(result.rawResponseBody, body);
  }
});

test("live transport refuses a blocked permit before credential access or fetch", async () => {
  const api = await subject();
  assert.equal(typeof api.createLiveProviderHttpTransportV5R2, "function");
  let credentialReads = 0;
  let fetchCalls = 0;
  const transport = api.createLiveProviderHttpTransportV5R2({
    provider: "OPENAI_DIRECT",
    endpoint: OPENAI_ENDPOINT,
    expectedModel: "gpt-5.6-luna",
    timeoutMs: 1_000,
    credentialSource: {
      async readBearerToken() {
        credentialReads += 1;
        return "sk-fake-never-used-123456789";
      },
    },
    async fetchImpl() {
      fetchCalls += 1;
      throw new Error("must not fetch");
    },
  });
  const permitBody = {
    schemaVersion: "ProviderDispatchPermitV1",
    transportKind: "LIVE_PROVIDER_HTTP_AUTHORIZED_V1",
    provider: "OPENAI_DIRECT",
    productionEndpoint: OPENAI_ENDPOINT,
    expectedModel: "gpt-5.6-luna",
    dispatchAllowed: false,
    credentialReadAllowed: false,
    providerCallAllowed: false,
    providerEventCount: 0,
    authorizationHash: "a".repeat(64),
  };
  const blockedPermit = { ...permitBody, permitHash: jcsHash(permitBody) };
  await assert.rejects(
    transport.send({ permit: blockedPermit, wireRequest: { model: "gpt-5.6-luna" } }),
    /permit|blocked|authorization/iu,
  );
  assert.equal(credentialReads, 0);
  assert.equal(fetchCalls, 0);
});

test("live transport uses only the frozen endpoint after an exact allow permit and returns redacted wire evidence", async () => {
  const api = await subject();
  const fakeToken = "sk-live-fixture-sentinel-never-persist-123456789";
  let observedUrl = null;
  let observedOptions = null;
  const transport = api.createLiveProviderHttpTransportV5R2({
    provider: "OPENAI_DIRECT",
    endpoint: OPENAI_ENDPOINT,
    expectedModel: "gpt-5.6-luna",
    timeoutMs: 1_000,
    credentialSource: { async readBearerToken() { return fakeToken; } },
    async fetchImpl(url, options) {
      observedUrl = url;
      observedOptions = options;
      return {
        status: 200,
        redirected: false,
        url: OPENAI_ENDPOINT,
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "req_fake_live_001",
        }),
        async text() {
          return JSON.stringify({ id: "resp_fake_live_001", model: "gpt-5.6-luna" });
        },
      };
    },
  });
  const permitBody = {
    schemaVersion: "ProviderDispatchPermitV1",
    transportKind: "LIVE_PROVIDER_HTTP_AUTHORIZED_V1",
    provider: "OPENAI_DIRECT",
    productionEndpoint: OPENAI_ENDPOINT,
    expectedModel: "gpt-5.6-luna",
    dispatchAllowed: true,
    credentialReadAllowed: true,
    providerCallAllowed: true,
    providerEventCount: 1,
    authorizationHash: "a".repeat(64),
  };
  const permit = { ...permitBody, permitHash: jcsHash(permitBody) };
  const wireRequest = { model: "gpt-5.6-luna", input: "in-memory-fake-fetch-only" };
  const result = await transport.send({ permit, wireRequest });

  assert.equal(observedUrl, OPENAI_ENDPOINT);
  assert.equal(observedOptions.redirect, "error");
  assert.equal(observedOptions.headers.authorization, `Bearer ${fakeToken}`);
  assert.deepEqual(JSON.parse(observedOptions.body), wireRequest);
  assert.equal(result.transportKind, "LIVE_PROVIDER_HTTP_AUTHORIZED_V1");
  assert.equal(result.providerEventCount, 1);
  assert.equal(result.httpRequestCount, 1);
  assert.equal(result.observedEndpoint, OPENAI_ENDPOINT);
  assert.equal(result.providerRequestId, "req_fake_live_001");
  assert.doesNotMatch(JSON.stringify(result), /sk-live-fixture-sentinel/u);
});

test("live transport classifies post-dispatch network failure without returning credential or raw exception text", async () => {
  const api = await subject();
  const secret = "sk-network-fixture-sentinel-never-return-123456789";
  const transport = api.createLiveProviderHttpTransportV5R2({
    provider: "OPENAI_DIRECT",
    endpoint: OPENAI_ENDPOINT,
    expectedModel: "gpt-5.6-luna",
    timeoutMs: 1_000,
    credentialSource: { async readBearerToken() { return secret; } },
    async fetchImpl() { throw new TypeError(`socket failed ${secret}`); },
  });
  const permitBody = {
    schemaVersion: "ProviderDispatchPermitV1",
    transportKind: "LIVE_PROVIDER_HTTP_AUTHORIZED_V1",
    provider: "OPENAI_DIRECT",
    productionEndpoint: OPENAI_ENDPOINT,
    expectedModel: "gpt-5.6-luna",
    dispatchAllowed: true,
    credentialReadAllowed: true,
    providerCallAllowed: true,
    providerEventCount: 1,
    authorizationHash: "a".repeat(64),
  };
  const result = await transport.send({
    permit: { ...permitBody, permitHash: jcsHash(permitBody) },
    wireRequest: { model: "gpt-5.6-luna", input: "network-failure-fixture" },
  });
  assert.equal(result.transportStatus, "TRANSIENT_NETWORK_FAILURE");
  assert.equal(result.retryClassification, "TRANSIENT_NETWORK_FAILURE");
  assert.equal(result.providerEventCount, 1);
  assert.equal(result.httpRequestCount, 1);
  assert.equal(result.observedEndpoint, null);
  assert.doesNotMatch(JSON.stringify(result), /sk-network-fixture-sentinel|socket failed/u);
});

test("loopback fixture transport classifies a simulated connection failure without leaking fake secrets", async () => {
  const api = await subject();
  const secret = "sk-loopback-fixture-sentinel-never-return-123456789";
  const transport = api.createLoopbackFixtureHttpTransportV5R2({
    provider: "DEEPSEEK_DIRECT",
    productionEndpoint: "https://api.deepseek.com/chat/completions",
    expectedModel: "deepseek-v4-pro",
    fixtureEndpoint: "http://127.0.0.1:12345/chat/completions",
    timeoutMs: 1_000,
    credentialSource: { async readBearerToken() { return secret; } },
    async fetchImpl() { throw new TypeError(`fixture socket failed ${secret}`); },
  });
  const result = await transport.send({
    permit: api.buildFixtureDispatchPermitV5R2({
      provider: "DEEPSEEK_DIRECT",
      productionEndpoint: "https://api.deepseek.com/chat/completions",
      expectedModel: "deepseek-v4-pro",
    }),
    wireRequest: { model: "deepseek-v4-pro", messages: [] },
  });
  assert.equal(result.transportStatus, "TRANSIENT_NETWORK_FAILURE");
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 1);
  assert.doesNotMatch(JSON.stringify(result), /sk-loopback-fixture-sentinel|socket failed/u);
});

test("live transport fails closed when the response URL drifts from the frozen endpoint", async () => {
  const api = await subject();
  const transport = api.createLiveProviderHttpTransportV5R2({
    provider: "OPENAI_DIRECT",
    endpoint: OPENAI_ENDPOINT,
    expectedModel: "gpt-5.6-luna",
    timeoutMs: 1_000,
    credentialSource: { async readBearerToken() { return "fixture-token"; } },
    async fetchImpl() {
      return {
        status: 200,
        redirected: true,
        url: "https://example.invalid/v1/responses",
        headers: new Headers(),
        async text() { return "{}"; },
      };
    },
  });
  const permitBody = {
    schemaVersion: "ProviderDispatchPermitV1",
    transportKind: "LIVE_PROVIDER_HTTP_AUTHORIZED_V1",
    provider: "OPENAI_DIRECT",
    productionEndpoint: OPENAI_ENDPOINT,
    expectedModel: "gpt-5.6-luna",
    dispatchAllowed: true,
    credentialReadAllowed: true,
    providerCallAllowed: true,
    providerEventCount: 1,
    authorizationHash: "a".repeat(64),
  };
  const result = await transport.send({
    permit: { ...permitBody, permitHash: jcsHash(permitBody) },
    wireRequest: { model: "gpt-5.6-luna", input: "origin-drift-fixture" },
  });
  assert.equal(result.transportStatus, "CONNECTION_LOST_AFTER_DISPATCH");
  assert.equal(result.integrityFailure, "PROVIDER_ORIGIN_DRIFT");
  assert.equal(result.observedEndpoint, null);
  assert.match(result.driftedEndpointHash, /^[0-9a-f]{64}$/u);
  assert.doesNotMatch(JSON.stringify(result), /example\.invalid/u);
});
