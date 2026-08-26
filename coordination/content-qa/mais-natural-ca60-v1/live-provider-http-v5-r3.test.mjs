import assert from "node:assert/strict";
import test from "node:test";

import { createLiveProviderTransportV5R3, hashProjectIdentityV5R3 } from "./live-provider-http-v5-r3.mjs";
import { sealV5R3Artifact } from "./execution-integrity-v5-r3.mjs";

const H = (character) => character.repeat(64);

function permit(overrides = {}) {
  return sealV5R3Artifact({
    schemaVersion: "ProviderDispatchPermitV2",
    mode: "LIVE",
    provider: "OPENAI_DIRECT",
    endpoint: "https://us.api.openai.com/v1/responses",
    model: "gpt-5.6-luna",
    authorizationHash: H("a"),
    runnerReviewReceiptHash: H("b"),
    reservationHash: H("c"),
    attemptId: "attempt-1",
    projectIdentityHash: hashProjectIdentityV5R3("project-fixture"),
    ...overrides,
  });
}

test("OpenAI live transport reads credentials only after exact permit and sends bound project identity", async () => {
  let credentialReads = 0;
  let seenHeaders;
  const transport = createLiveProviderTransportV5R3({
    credentialReader: async () => {
      credentialReads += 1;
      return { apiKey: "fixture-secret-never-output", projectId: "project-fixture" };
    },
    fetchImpl: async (_url, init) => {
      seenHeaders = init.headers;
      return {
        status: 200,
        url: "https://us.api.openai.com/v1/responses",
        headers: new Map([["x-request-id", "req-fixture"]]),
        text: async () => JSON.stringify({ id: "resp", model: "gpt-5.6-luna", output: [] }),
      };
    },
  });
  const result = await transport.send({ permit: permit(), wireRequest: { model: "gpt-5.6-luna", input: [] } });
  assert.equal(credentialReads, 1);
  assert.equal(seenHeaders["OpenAI-Project"], "project-fixture");
  assert.equal(result.transportStatus, "DELIVERED");
  assert.doesNotMatch(JSON.stringify(result), /fixture-secret/u);
  assert.doesNotMatch(JSON.stringify(result), /project-fixture/u);
});

test("body-read failure after dispatch is returned as durable evidence input instead of throwing", async () => {
  const transport = createLiveProviderTransportV5R3({
    credentialReader: async () => ({ apiKey: "fake", projectId: "project-fixture" }),
    fetchImpl: async () => ({
      status: 200,
      url: "https://us.api.openai.com/v1/responses",
      headers: new Map(),
      text: async () => { throw new Error("secret response body failure"); },
    }),
  });
  const result = await transport.send({ permit: permit(), wireRequest: { model: "gpt-5.6-luna", input: [] } });
  assert.equal(result.transportStatus, "BODY_READ_FAILED_AFTER_DISPATCH");
  assert.equal(result.providerEventCount, 1);
  assert.equal(result.httpRequestCount, 1);
  assert.equal(result.observedEndpoint, "https://us.api.openai.com/v1/responses");
  assert.doesNotMatch(JSON.stringify(result), /secret response/u);
});

test("origin drift remains origin drift and is never collapsed to connection loss", async () => {
  const transport = createLiveProviderTransportV5R3({
    credentialReader: async () => ({ apiKey: "fake", projectId: "project-fixture" }),
    fetchImpl: async () => ({
      status: 200,
      url: "https://drift.example/v1/responses",
      headers: new Map(),
      text: async () => "{}",
    }),
  });
  const result = await transport.send({ permit: permit(), wireRequest: { model: "gpt-5.6-luna", input: [] } });
  assert.equal(result.transportStatus, "PROVIDER_ORIGIN_DRIFT");
  assert.equal(result.observedEndpoint, "https://drift.example/v1/responses");
});

test("permit or project mismatch blocks before credential read and HTTP", async () => {
  let credentialReads = 0;
  let fetches = 0;
  const transport = createLiveProviderTransportV5R3({
    credentialReader: async () => { credentialReads += 1; return { apiKey: "fake", projectId: "wrong-project" }; },
    fetchImpl: async () => { fetches += 1; throw new Error("must not run"); },
  });
  await assert.rejects(transport.send({ permit: { selfHash: H("0") }, wireRequest: {} }), /permit/u);
  await assert.rejects(transport.send({ permit: permit(), wireRequest: {} }), /project identity/u);
  assert.equal(credentialReads, 1);
  assert.equal(fetches, 0);
});
