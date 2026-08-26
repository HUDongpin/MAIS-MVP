import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import { jcsHash } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import { createLoopbackFixtureHttpTransportV5R2 } from "./live-provider-http-v5-r2.mjs";

async function subject() {
  return import("./openai-project-route-preflight-v5-r2.mjs").catch(() => ({}));
}

async function fixtureEndpoint(t, handler) {
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

function authorization(overrides = {}) {
  const body = {
    schemaVersion: "OpenAIProjectRoutePreflightAuthorizationV1",
    authorizationKind: "OPENAI_PROJECT_ROUTE_PREFLIGHT",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    runnerRegistrationHash: "1".repeat(64),
    provider: "OPENAI_DIRECT",
    projectResidency: "US_STORAGE_PROCESSING",
    endpoint: "https://us.api.openai.com/v1/responses",
    model: "gpt-5.6-luna",
    containsNaturalQuestionTextAuthorized: false,
    credentialReadAuthorized: true,
    providerCallAuthorized: true,
    maximumAttempts: 1,
    maximumTokens: 256,
    maximumEstimatedUsd: 0.1,
    currency: "USD",
    issuedAt: "2026-08-26T03:00:00.000Z",
    expiresAt: "2026-08-26T04:00:00.000Z",
    authorizedBy: "OWNER",
    ownerGrantHash: "2".repeat(64),
    ...overrides,
  };
  return { ...body, authorizationHash: jcsHash(body) };
}

function responseEnvelope(marker) {
  return {
    id: "resp_route_fixture_001",
    object: "response",
    status: "completed",
    model: "gpt-5.6-luna",
    output: [{
      id: "msg_route_fixture_001",
      type: "message",
      status: "completed",
      role: "assistant",
      content: [{
        type: "output_text",
        text: JSON.stringify({ routeReady: true, marker }),
        annotations: [],
      }],
    }],
    usage: {
      input_tokens: 40,
      output_tokens: 12,
      output_tokens_details: { reasoning_tokens: 4 },
      total_tokens: 52,
    },
  };
}

test("OpenAI project-route preflight request is static, US-routed, and contains no natural-question fields", async () => {
  const api = await subject();
  assert.equal(typeof api.buildOpenAIProjectRoutePreflightWireRequestV5R2, "function");
  const request = api.buildOpenAIProjectRoutePreflightWireRequestV5R2();
  assert.equal(request.model, "gpt-5.6-luna");
  assert.equal(request.store, false);
  assert.equal(request.background, false);
  assert.equal(request.stream, false);
  assert.deepEqual(request.reasoning, { effort: "high", context: "current_turn" });
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.strict, true);
  assert.equal(request.max_output_tokens, 128);
  assert.deepEqual(request.tools, []);
  const serialized = JSON.stringify(request);
  for (const forbidden of [
    "prompt",
    "options",
    "storedAnswer",
    "acceptedAnswers",
    "explanation",
    "itemId",
    "itemHash",
    "clusterId",
    "referenceLabel",
    "DeepSeek",
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbidden, "iu"), forbidden);
  }
  assert.match(serialized, /STATIC_NON_NATURAL_PROJECT_ROUTE_PREFLIGHT_V1/u);
  assert.equal(api.OPENAI_PROJECT_ROUTE_PREFLIGHT_V5_R2_CONSTANTS.endpoint,
    "https://us.api.openai.com/v1/responses");
  assert.equal(api.OPENAI_PROJECT_ROUTE_PREFLIGHT_V5_R2_CONSTANTS.containsNaturalQuestionText, false);
});

test("missing narrow preflight authorization returns zero dispatches without touching the transport", async () => {
  const api = await subject();
  assert.equal(typeof api.runOpenAIProjectRoutePreflightV5R2, "function");
  let transportCalls = 0;
  const result = await api.runOpenAIProjectRoutePreflightV5R2({
    authorization: null,
    trustedContext: null,
    transport: {
      kind: "LIVE_PROVIDER_HTTP_AUTHORIZED_V1",
      async send() {
        transportCalls += 1;
        throw new Error("must not dispatch");
      },
    },
    now: "2026-08-26T03:00:00.000Z",
  });
  assert.equal(result.status, "AUTHORIZATION_BLOCKED");
  assert.equal(result.dispatchAllowed, false);
  assert.equal(result.credentialReadCount, 0);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(transportCalls, 0);
  assert.match(result.errors.join("\n"), /authorization/iu);
});

test("a valid hypothetical grant exercises the loopback route parser but creates no provider evidence", async (t) => {
  const api = await subject();
  let requestBody = "";
  const endpoint = await fixtureEndpoint(t, async (request, response) => {
    for await (const chunk of request) requestBody += chunk;
    const envelope = responseEnvelope(api.OPENAI_PROJECT_ROUTE_PREFLIGHT_V5_R2_CONSTANTS.probeMarker);
    response.writeHead(200, {
      "content-type": "application/json",
      "x-request-id": "req_route_fixture_001",
    });
    response.end(JSON.stringify(envelope));
  });
  const grant = authorization();
  const transport = createLoopbackFixtureHttpTransportV5R2({
    provider: "OPENAI_DIRECT",
    productionEndpoint: "https://us.api.openai.com/v1/responses",
    expectedModel: "gpt-5.6-luna",
    fixtureEndpoint: endpoint,
    timeoutMs: 1_000,
    credentialSource: { async readBearerToken() { return "fixture-route-token"; } },
  });
  const result = await api.runOpenAIProjectRoutePreflightV5R2({
    authorization: grant,
    trustedContext: {
      at: "2026-08-26T03:30:00.000Z",
      authorizationHash: grant.authorizationHash,
      ownerGrantHash: grant.ownerGrantHash,
      runnerRegistrationHash: grant.runnerRegistrationHash,
    },
    transport,
    now: "2026-08-26T03:30:00.000Z",
  });
  assert.equal(result.status, "FIXTURE_CONFIRMED_NOT_PROVIDER_EVIDENCE");
  assert.equal(result.dispatchAllowed, true);
  assert.equal(result.credentialReadCount, 1);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 1);
  assert.equal(result.observedModel, "gpt-5.6-luna");
  assert.equal(result.containsNaturalQuestionText, false);
  assert.equal(result.receiptEligible, false);
  assert.match(requestBody, /STATIC_NON_NATURAL_PROJECT_ROUTE_PREFLIGHT_V1/u);
  for (const forbidden of ["storedAnswer", "itemHash", "referenceLabel"]) {
    assert.doesNotMatch(requestBody, new RegExp(forbidden, "u"));
  }
});
