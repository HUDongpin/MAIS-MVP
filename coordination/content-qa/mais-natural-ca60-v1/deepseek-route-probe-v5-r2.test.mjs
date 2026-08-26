import assert from "node:assert/strict";
import test from "node:test";

import DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import { jcsHash } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";

async function subject() {
  return import("./deepseek-route-probe-v5-r2.mjs").catch(() => ({}));
}

const hash = (character) => character.repeat(64);

function authorizationFixture(overrides = {}) {
  const body = {
    schemaVersion: "DeepSeekRouteProbeAuthorizationV1",
    authorizationKind: "DEEPSEEK_ROUTE_PROBE",
    designId: "MAIS-NATURAL-CA60-V5",
    registrationHash: DESIGN_REGISTRATION.registrationHash,
    runnerRegistrationHash: hash("1"),
    referenceSealHash: hash("2"),
    referenceAttemptChainHash: hash("3"),
    provider: "DEEPSEEK_DIRECT",
    endpoint: "https://api.deepseek.com/chat/completions",
    model: "deepseek-v4-pro",
    containsNaturalQuestionTextAuthorized: false,
    credentialReadAuthorized: true,
    providerCallAuthorized: true,
    maximumAttempts: 1,
    maximumTokens: 256,
    maximumEstimatedUsd: 0.1,
    currency: "USD",
    issuedAt: "2026-08-26T02:00:00.000Z",
    expiresAt: "2026-08-26T03:00:00.000Z",
    authorizedBy: "owner-pseudonym",
    ownerGrantHash: hash("4"),
    ...overrides,
  };
  return { ...body, authorizationHash: jcsHash(body) };
}

test("DeepSeek route probe request is static and contains no natural item or reference material", async () => {
  const api = await subject();
  assert.equal(typeof api.buildDeepSeekRouteProbeWireRequestV5R2, "function");
  const request = api.buildDeepSeekRouteProbeWireRequestV5R2();
  assert.equal(request.model, "deepseek-v4-pro");
  assert.equal(request.stream, false);
  assert.equal(request.temperature, 0);
  assert.deepEqual(request.response_format, { type: "json_object" });
  assert.equal(request.max_tokens, 128);
  const serialized = JSON.stringify(request);
  assert.match(serialized, /STATIC_NON_NATURAL_DEEPSEEK_ROUTE_PROBE_V1/u);
  assert.doesNotMatch(serialized, /What is|storedAnswer|acceptedAnswers|referenceLabel|itemPseudonym/iu);
});

test("missing DeepSeek route authorization blocks before credential or transport access", async () => {
  const api = await subject();
  let sends = 0;
  const result = await api.runDeepSeekRouteProbeV5R2({
    authorization: null,
    trustedContext: null,
    now: "2026-08-26T02:30:00.000Z",
    transport: { kind: "LIVE_PROVIDER_HTTP_AUTHORIZED_V1", async send() { sends += 1; } },
  });
  assert.equal(result.status, "AUTHORIZATION_BLOCKED");
  assert.equal(result.dispatchAllowed, false);
  assert.equal(result.credentialReadCount, 0);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 0);
  assert.equal(sends, 0);
});

test("fixture DeepSeek route response validates syntax but is explicitly not provider evidence", async () => {
  const api = await subject();
  const authorization = authorizationFixture();
  let sends = 0;
  const transport = {
    kind: "FIXTURE_HTTP_LOOPBACK_NO_PROVIDER_EVENT_V1",
    async send({ permit, wireRequest }) {
      sends += 1;
      assert.equal(permit.providerCallAllowed, false);
      assert.equal(permit.providerEventCount, 0);
      assert.deepEqual(wireRequest, api.buildDeepSeekRouteProbeWireRequestV5R2());
      return {
        transportStatus: "DELIVERED",
        httpStatus: 200,
        providerEventCount: 0,
        httpRequestCount: 1,
        providerRequestId: "fixture-deepseek-route-001",
        rawResponseBody: JSON.stringify({
          id: "fixture-route-response-001",
          model: "deepseek-v4-pro",
          choices: [{
            index: 0,
            message: {
              role: "assistant",
              content: JSON.stringify({ routeReady: true, marker: "STATIC_NON_NATURAL_DEEPSEEK_ROUTE_PROBE_V1" }),
            },
            finish_reason: "stop",
          }],
          usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
        }),
      };
    },
  };
  const result = await api.runDeepSeekRouteProbeV5R2({
    authorization,
    trustedContext: {
      at: "2026-08-26T02:30:00.000Z",
      authorizationHash: authorization.authorizationHash,
      ownerGrantHash: authorization.ownerGrantHash,
      runnerRegistrationHash: authorization.runnerRegistrationHash,
      referenceSealHash: authorization.referenceSealHash,
      referenceAttemptChainHash: authorization.referenceAttemptChainHash,
    },
    transport,
    now: "2026-08-26T02:30:00.000Z",
  });
  assert.equal(sends, 1);
  assert.equal(result.status, "FIXTURE_CONFIRMED_NOT_PROVIDER_EVIDENCE");
  assert.equal(result.receiptEligible, false);
  assert.equal(result.containsNaturalQuestionText, false);
  assert.equal(result.providerEventCount, 0);
  assert.equal(result.httpRequestCount, 1);
  assert.equal(result.observedModel, "deepseek-v4-pro");
});
