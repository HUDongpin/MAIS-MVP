import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "schemas");
const FILES = [
  "IndependentExecutionRunnerReviewReceiptV2.schema.json",
  "ProviderAuthorizationV3.schema.json",
  "ProviderDispatchPermitV2.schema.json",
  "ProviderEventReceiptV3.schema.json",
  "DeepSeekExecutionRegistrationV1.schema.json",
  "NaturalCaExecutionRunnerRegistrationV2.schema.json",
  "OpenAIProjectRoutePreflightReceiptV2.schema.json",
  "DeepSeekDirectRouteProbeReceiptV1.schema.json",
  "NaturalCaProviderContractErratumV1.schema.json",
  "OwnerProviderGrantV1.schema.json",
  "CredentialReadinessReceiptV1.schema.json",
  "ProviderPriceSnapshotV1.schema.json",
  "SampleExecutionInventoryV1.schema.json",
  "ProviderDispatchReservationV1.schema.json",
  "ProviderDispatchCompletionV1.schema.json",
  "OpenAIAdjudicationTriggerReceiptV1.schema.json",
  "DeepSeekC0TriggerReceiptV1.schema.json",
  "NaturalCaScoringInputV1.schema.json",
  "NaturalCaAggregateScoreReceiptV1.schema.json",
  "RawMachineReferenceLabelV1.schema.json",
  "MachineReferenceLabelV1.schema.json",
  "MachineReferenceSealV2.schema.json",
  "NaturalCaRunnerCommandReceiptV2.schema.json",
];

function assertClosedObjects(node, pointer = "$") {
  if (!node || typeof node !== "object") return;
  if (node.type === "object") {
    assert.ok(node.additionalProperties === false || (node.additionalProperties && typeof node.additionalProperties === "object"), `${pointer} object is unconstrained`);
    if (node.additionalProperties && typeof node.additionalProperties === "object") assertClosedObjects(node.additionalProperties, `${pointer}.additionalProperties`);
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "additionalProperties") continue;
    if (Array.isArray(value)) value.forEach((child, index) => assertClosedObjects(child, `${pointer}.${key}[${index}]`));
    else assertClosedObjects(value, `${pointer}.${key}`);
  }
}

test("all V5-R3 execution schemas exist, close every object, and require selfHash", async () => {
  for (const file of FILES) {
    const schema = JSON.parse(await readFile(path.join(ROOT, file), "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
    assert.ok(schema.required.includes("selfHash"), `${file} must require selfHash`);
    assertClosedObjects(schema);
  }
});

test("registration schema freezes every research root, exact provider tuple, supersedes evidence, and zero-authority state", async () => {
  const schema = JSON.parse(await readFile(path.join(ROOT, "NaturalCaExecutionRunnerRegistrationV2.schema.json"), "utf8"));
  for (const key of [
    "supersedesRunnerRegistrationHash", "discrepancyReviewHash", "designRegistrationHash",
    "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash", "samplePayloadSetHash",
    "privacyScreenHash", "rightsScreenHash", "rightsPolicyHash", "lineageRuleHash", "taxonomyHash",
    "labelingAndAdjudicationHash", "thresholdsDecisionAndPowerHash", "decisionCeiling",
    "providerContractErratumHash", "productionSourceManifest", "productionSourceRootHash",
    "testSourceManifest", "testSourceRootHash", "providerImplementations", "authorizationState",
  ]) assert.ok(schema.required.includes(key), `registration misses ${key}`);
  assert.equal(schema.properties.decisionCeiling.const, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(schema.properties.authorizationState.properties.providerExecutionAuthorized.const, false);
  assert.equal(schema.properties.providerImplementations.properties.openAI.properties.endpoint.const, "https://us.api.openai.com/v1/responses");
  assert.equal(schema.properties.providerImplementations.properties.deepSeek.properties.endpoint.const, "https://api.deepseek.com/chat/completions");
});

test("authorization and permit schemas bind fresh A11 review and forbid caller budget snapshots", async () => {
  const authorization = JSON.parse(await readFile(path.join(ROOT, "ProviderAuthorizationV3.schema.json"), "utf8"));
  assert.ok(authorization.required.includes("freshRunnerReviewHash"));
  assert.ok(authorization.required.includes("roleReservationPolicy"));
  assert.equal(Object.hasOwn(authorization.properties, "budgetState"), false);
  const permit = JSON.parse(await readFile(path.join(ROOT, "ProviderDispatchPermitV2.schema.json"), "utf8"));
  assert.ok(permit.required.includes("reservationHash"));
  assert.ok(permit.required.includes("runnerReviewReceiptHash"));
  assert.ok(Array.isArray(permit.allOf));
});
