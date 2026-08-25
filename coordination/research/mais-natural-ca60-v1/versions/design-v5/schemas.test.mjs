import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { jcsHash } from "./design-contract.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMAS = path.join(HERE, "schemas");

async function loadSchemas() {
  const filenames = (await readdir(SCHEMAS)).filter((name) => name.endsWith(".schema.json")).sort();
  return Promise.all(filenames.map(async (filename) => ({
    filename,
    schema: JSON.parse(await readFile(path.join(SCHEMAS, filename), "utf8")),
  })));
}

async function loadJson(filename) {
  return JSON.parse(await readFile(path.join(HERE, filename), "utf8"));
}

test("every V5 root schema is closed, versioned, and requires its entire root field set", async () => {
  const schemas = await loadSchemas();
  assert.equal(schemas.length, 10);
  assert.deepEqual(schemas.map(({ schema }) => schema.title), [
    "NaturalCaPilotDesignRegistrationV5",
    "NaturalCaStatisticalPowerV5",
    "OpenAIProjectRoutePreflightReceiptV1",
    "OpenAIReferenceRoleOutputV1",
    "PredecessorPackageInventoryV2",
    "ProviderAttemptReceiptV2",
    "ProviderAuthorizationV2",
    "ProviderLogicalRequestV2",
    "ProviderWireEvidenceV2",
    "V5PackageManifestV1",
  ]);

  for (const { filename, schema } of schemas) {
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema", filename);
    assert.equal(schema.$id, `https://mais.local/schemas/${schema.title}.schema.json`, filename);
    assert.equal(schema.type, "object", filename);
    assert.equal(schema.additionalProperties, false, filename);
    assert.equal(schema.properties.schemaVersion.const, schema.title, filename);
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort(), filename);
    assert.equal(filename, `${schema.title}.schema.json`);
  }
});

test("registration schema catalog hashes the exact ten current V5 schemas", async () => {
  const registration = await loadJson("design-registration.json");
  const schemas = await loadSchemas();
  const expected = Object.fromEntries(schemas.map(({ filename, schema }) => [schema.title, {
    filename,
    id: schema.$id,
    canonicalHash: jcsHash(schema),
  }]));
  assert.deepEqual(registration.interfaces.canonicalSchemaCatalog, expected);
  assert.equal(registration.interfaces.schemaSetHash, jcsHash(expected));
  assert.deepEqual(Object.keys(registration).sort(), [...(await loadJson("schemas/NaturalCaPilotDesignRegistrationV5.schema.json")).required].sort());
});

test("new authorization and attempt schemas bind residency, route, request envelopes, usage, cost, and receipt chaining", async () => {
  const authorization = await loadJson("schemas/ProviderAuthorizationV2.schema.json");
  const attempt = await loadJson("schemas/ProviderAttemptReceiptV2.schema.json");
  const logical = await loadJson("schemas/ProviderLogicalRequestV2.schema.json");
  const wire = await loadJson("schemas/ProviderWireEvidenceV2.schema.json");

  for (const field of [
    "registrationHash",
    "frameRegistrationHash",
    "sampleManifestHash",
    "runnerCommit",
    "runnerHash",
    "adapterHash",
    "providerRouteDecisionHash",
    "projectRoutePreflightReceiptHash",
    "projectResidency",
    "dataRegion",
    "apiSurface",
    "endpoint",
    "model",
    "logicalRequestTemplateHash",
    "wireRequestTemplateHash",
    "egressAllowlist",
    "egressDenylist",
    "privacyScreenHash",
    "rightsScreenHash",
    "maximumAttempts",
    "maximumTokens",
    "maximumEstimatedUsd",
    "priceSnapshotHash",
    "issuedAt",
    "expiresAt",
    "authorizedBy",
    "nonAuthorizations",
    "authorizationHash",
  ]) assert.ok(authorization.required.includes(field), field);

  for (const field of [
    "requestedProvider",
    "observedProvider",
    "requestedModel",
    "observedModel",
    "requestedEndpoint",
    "observedEndpoint",
    "projectResidency",
    "responseId",
    "providerRequestId",
    "logicalRequestHash",
    "wireRequestBodyHash",
    "reasoningContextRequested",
    "reasoningContextObserved",
    "storeRequested",
    "backgroundRequested",
    "inputTokens",
    "outputTokens",
    "reasoningTokens",
    "totalTokens",
    "estimatedCost",
    "previousReceiptHash",
    "selfHash",
  ]) assert.ok(attempt.required.includes(field), field);

  assert.equal(logical.properties.requestedSeed.type, "null");
  assert.equal(logical.properties.previousResponseId.type, "null");
  assert.equal(logical.properties.conversation.type, "null");
  assert.ok(wire.required.includes("requestHeadersAllowlistHash"));
  assert.ok(wire.required.includes("rawResponseBodyHash"));
  assert.doesNotMatch(JSON.stringify({ authorization, attempt, logical, wire }), /qwen3\.8-max|QWEN_MACHINE_REFERENCE/u);
});

test("the four tracked V5 root JSON artifacts match their schema identities and self-hash rules", async () => {
  const registration = await loadJson("design-registration.json");
  const inventory = await loadJson("predecessor-package-inventory-v4.json");
  const power = await loadJson("statistical-power.json");
  const manifest = await loadJson("package-manifest.json");

  assert.equal(registration.schemaVersion, "NaturalCaPilotDesignRegistrationV5");
  assert.equal(inventory.schemaVersion, "PredecessorPackageInventoryV2");
  assert.equal(power.schemaVersion, "NaturalCaStatisticalPowerV5");
  assert.equal(manifest.schemaVersion, "V5PackageManifestV1");
  assert.equal(power.designRegistrationHash, registration.registrationHash);
  const powerPreimage = { ...power };
  delete powerPreimage.selfHash;
  assert.equal(power.selfHash, jcsHash(powerPreimage));
  assert.equal(power.perfectPerformanceRequirements.simultaneousSurfaceGateFeasibleAtN60, false);
  assert.equal(power.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(power.thresholdReductionAfterLabelsOrResultsAllowed, false);
  assert.equal(manifest.registrationHash, registration.registrationHash);
  assert.equal(manifest.schemaSetHash, registration.interfaces.schemaSetHash);
  const manifestPreimage = { ...manifest };
  delete manifestPreimage.selfHash;
  assert.equal(manifest.selfHash, jcsHash(manifestPreimage));
});
