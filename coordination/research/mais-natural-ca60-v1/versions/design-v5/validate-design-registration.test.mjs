import assert from "node:assert/strict";
import test from "node:test";

test("the sealed V5 candidate validates offline but is not active or execution-authorized", async () => {
  const validator = await import("./validate-design-registration.mjs");
  const artifacts = await validator.loadDefaultArtifacts();
  const result = await validator.validateArtifacts(artifacts);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.lifecycleStatus, "SEALED_CANDIDATE_PENDING_INDEPENDENT_REVIEW");
  assert.equal(result.active, false);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.providerEventCount, 0);
});

test("semantic validation fails closed on provider, authorization, event, hash, inventory, power, schema, and secret drift", async () => {
  const validator = await import("./validate-design-registration.mjs");
  const base = await validator.loadDefaultArtifacts();
  const cases = [
    ["model drift", (x) => { x.registration.providerControls.openaiReferenceEnvelope.requestedModel = "gpt-5.6-sol"; }],
    ["execution authority drift", (x) => { x.registration.firstProviderExecutionAllowed = true; }],
    ["provider event drift", (x) => { x.registration.providerEventCount = 1; }],
    ["registration hash drift", (x) => { x.registration.registrationHash = "0".repeat(64); }],
    ["inventory drift", (x) => { x.inventory.entries[0].sha256 = "0".repeat(64); }],
    ["power drift", (x) => { x.power.perfectPerformanceRequirements.combinedMinimumItems = 60; }],
    ["schema drift", (x) => { x.schemas[0].schema.additionalProperties = true; }],
    ["secret sentinel", (x) => { x.registration.ownerProviderDecision.apiKey = "sk-forbidden-sentinel"; }],
  ];

  for (const [name, mutate] of cases) {
    const artifacts = structuredClone(base);
    mutate(artifacts);
    const result = await validator.validateArtifacts(artifacts);
    assert.equal(result.ok, false, name);
    assert.ok(result.errors.length > 0, name);
  }
});

test("require-active mode remains blocked while ACTIVE pointer is V3 and no A11 receipt exists", async () => {
  const validator = await import("./validate-design-registration.mjs");
  const result = await validator.validateArtifacts(await validator.loadDefaultArtifacts(), { requireActive: true });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /active V5 design pointer/u.test(error)));
  assert.ok(result.errors.some((error) => /A11 independent review receipt/u.test(error)));
});

test("the validator itself performs no provider operation", async () => {
  const validator = await import("./validate-design-registration.mjs");
  const result = await validator.validateArtifacts(await validator.loadDefaultArtifacts());
  assert.equal(result.networkRequestCount, 0);
  assert.equal(result.credentialReadCount, 0);
  assert.equal(result.naturalQuestionReadCount, 0);
});
