import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function schema(name) {
  return JSON.parse(await readFile(new URL(`./schemas/${name}.schema.json`, import.meta.url), "utf8"));
}

function assertClosed(document, required) {
  assert.equal(document.type, "object");
  assert.equal(document.additionalProperties, false);
  assert.deepEqual([...document.required].sort(), Object.keys(document.properties).sort());
  for (const field of required) assert.equal(document.required.includes(field), true, field);
}

test("V5-R2 dispatch permit schema separates fixture and live authority", async () => {
  const document = await schema("ProviderDispatchPermitV1");
  assertClosed(document, ["transportKind", "provider", "productionEndpoint", "expectedModel", "providerCallAllowed", "credentialReadAllowed", "permitHash"]);
  assert.deepEqual(document.properties.transportKind.enum, [
    "FIXTURE_HTTP_LOOPBACK_NO_PROVIDER_EVENT_V1",
    "LIVE_PROVIDER_HTTP_AUTHORIZED_V1",
  ]);
  assert.equal(document.properties.permitHash.pattern, "^[0-9a-f]{64}$");
});

test("route-probe authorization schemas are closed, one-attempt, and forbid natural-question authority", async () => {
  for (const name of ["OpenAIProjectRoutePreflightAuthorizationV1", "DeepSeekRouteProbeAuthorizationV1"]) {
    const document = await schema(name);
    assertClosed(document, ["runnerRegistrationHash", "provider", "endpoint", "model", "containsNaturalQuestionTextAuthorized", "maximumAttempts", "maximumTokens", "authorizationHash"]);
    assert.equal(document.properties.containsNaturalQuestionTextAuthorized.const, false);
    assert.equal(document.properties.maximumAttempts.const, 1);
    assert.equal(document.properties.maximumTokens.maximum, 256);
  }
  const deepSeek = await schema("DeepSeekRouteProbeAuthorizationV1");
  assert.equal(deepSeek.required.includes("referenceSealHash"), true);
  assert.equal(deepSeek.required.includes("referenceAttemptChainHash"), true);
});

test("DeepSeek role output and execution-runner registration schemas bind blindness and zero pre-provider authority", async () => {
  const output = await schema("DeepSeekEvaluationRoleOutputV5R2");
  assertClosed(output, ["referenceSealHash", "executionRegistrationHash", "attemptReceiptHash", "referenceInputCount", "selfHash"]);
  assert.equal(output.properties.referenceInputCount.const, 0);
  const registration = await schema("NaturalCaExecutionRunnerRegistrationV1");
  assertClosed(registration, ["supersedes", "frozenBindings", "sourceRoots", "providerImplementations", "authorityBoundary", "registrationHash"]);
  assert.equal(registration.properties.authorityBoundary.properties.providerExecutionAuthorized.const, false);
  assert.equal(registration.properties.authorityBoundary.properties.credentialReadAuthorized.const, false);
  assert.equal(registration.properties.authorityBoundary.properties.naturalQuestionEgressAuthorized.const, false);
  assert.equal(registration.properties.authorityBoundary.properties.providerEventCount.const, 0);
});
