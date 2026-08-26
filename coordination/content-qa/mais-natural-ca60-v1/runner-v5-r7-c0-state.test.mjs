import assert from "node:assert/strict";
import test from "node:test";

import {
  buildC0PredicateInputMapV5R7,
  buildCanaryPredicateReceiptV5R7,
  buildNormalC0ExecutionSetV5R7,
  validateNormalC0ExecutionSetV5R7,
} from "./c0-state-v5-r7.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildRunnerFixtureV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";

const H = (value) => sha256V5R3(`r7-c0:${value}`);
const ACTIVE = H("active");
const AUTHORIZATION = H("authorization");
const EXECUTION = H("execution");

function payload(role) {
  return role === "B_PRIME_CRITIQUE"
    ? { valid: true, surfaceDisposition: "NO_FINDING", findings: [], requiredRevisionCodes: [] }
    : { valid: true, surfaceDisposition: "NO_FINDING", findings: [], resolutions: [] };
}

function roleBundle(inventory, item, role) {
  const attemptId = `V5R7:${item.itemIdPseudonym}:${role}:1`;
  const parsedPayload = payload(role);
  const providerEventReceiptHash = H(`${attemptId}:event`);
  const compatibilityRequestArtifactHash = H(`${attemptId}:compat-request`);
  const compatibilityAuthorizationHash = H("compatibility-authorization");
  const output = sealV5R3Artifact({
    schemaVersion: "ProviderRoleOutputV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: ACTIVE,
    sampleExecutionInventoryHash: inventory.selfHash,
    authorizationHash: compatibilityAuthorizationHash,
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    role,
    attemptId,
    attemptReceiptHash: providerEventReceiptHash,
    requestArtifactHash: compatibilityRequestArtifactHash,
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    clusterId: item.clusterId,
    rolePromptHash: H(`${attemptId}:prompt`),
    roleSchemaHash: H(`${attemptId}:schema`),
    parsedPayload,
    parsedPayloadHash: sha256V5R3(canonicalJsonV5R3(parsedPayload)),
    referenceInputCount: 0,
    deepSeekInputCount: 0,
  });
  const evidence = sealV5R3Artifact({
    schemaVersion: "RoleAttemptEvidenceReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: ACTIVE,
    authorizationHash: AUTHORIZATION,
    compatibilityAuthorizationHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    attemptId,
    provider: "DEEPSEEK_DIRECT",
    role,
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    attemptStatus: "SUCCEEDED",
    requestArtifactHash: H(`${attemptId}:request`),
    compatibilityRequestArtifactHash,
    dispatchAuditHash: H(`${attemptId}:semantic-authority`),
    semanticDispatchAuthorityHash: H(`${attemptId}:semantic-authority`),
    reservationHash: H(`${attemptId}:reservation`),
    dispatchPermitHash: H(`${attemptId}:permit`),
    compatibilityDispatchPermitHash: H(`${attemptId}:compat-permit`),
    rawResponseArtifactHash: H(`${attemptId}:raw`),
    rawResponseBindingReceiptHash: H(`${attemptId}:binding`),
    providerEventReceiptHash,
    roleOutputHash: output.selfHash,
    completionHash: H(`${attemptId}:completion`),
    resolvedAttemptReceiptHash: H(`${attemptId}:resolved`),
    attemptCommitIntentHash: H(`${attemptId}:intent`),
    rawResponseReparsed: true,
    lineageRebuilt: true,
    naturalQuestionReferenceInputCount: 0,
    derivedAt: "2026-08-26T10:10:00.000Z",
  });
  return { output, evidence };
}

function completeEvidenceFixture() {
  const core = buildRunnerFixtureV5R4();
  const roleOutputs = [];
  const roleAttemptEvidenceReceipts = [];
  for (const item of core.inventory.items) {
    for (const role of ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]) {
      const bundle = roleBundle(core.inventory, item, role);
      roleOutputs.push(bundle.output);
      roleAttemptEvidenceReceipts.push(bundle.evidence);
    }
  }
  return { ...core, roleOutputs, roleAttemptEvidenceReceipts };
}

test("R7 normal path derives all 60 exact four-field predicates and freezes the registered C0 union", () => {
  const fixture = completeEvidenceFixture();
  const predicateInputsByItem = buildC0PredicateInputMapV5R7(fixture);
  assert.equal(predicateInputsByItem.size, 60);
  for (const input of predicateInputsByItem.values()) {
    assert.deepEqual(Object.keys(input).sort(), ["bPrimeCritique", "bPrimeRevision",
      "localDeterministicEvidence", "validatedScope"]);
    assert.doesNotMatch(canonicalJsonV5R3(input), /reference|openai|qwen/iu);
  }
  const c0ExecutionSet = buildNormalC0ExecutionSetV5R7({
    activeRunnerRegistrationHash: ACTIVE,
    executionRegistrationHash: EXECUTION,
    inventory: fixture.inventory,
    predicateInputsByItem,
  });
  assert.deepEqual(validateNormalC0ExecutionSetV5R7({
    activeRunnerRegistrationHash: ACTIVE,
    executionRegistrationHash: EXECUTION,
    inventory: fixture.inventory,
    predicateInputsByItem,
    c0ExecutionSet,
  }), []);
  assert.equal(c0ExecutionSet.selectedItemHashes.length, 12);
  assert.equal(c0ExecutionSet.decisions.filter(({ registeredRandomAudit }) => registeredRandomAudit).length, 12);
  assert.equal(c0ExecutionSet.decisions.filter(({ mandatoryTrigger }) => mandatoryTrigger).length, 0);
  const canaryPredicateReceipt = buildCanaryPredicateReceiptV5R7({
    activeRunnerRegistrationHash: ACTIVE,
    executionRegistrationHash: EXECUTION,
    inventory: fixture.inventory,
    predicateInputsByItem,
  });
  assert.equal(canaryPredicateReceipt.itemHash, fixture.inventory.items[0].itemHash);
});

test("R7 C0 reconstruction rejects missing role evidence, injected reference state, and inventory drift", () => {
  const fixture = completeEvidenceFixture();
  assert.throws(() => buildC0PredicateInputMapV5R7({
    ...fixture,
    roleAttemptEvidenceReceipts: fixture.roleAttemptEvidenceReceipts.slice(1),
  }), /exactly two|120/u);

  const { selfHash: _outputHash, ...outputBody } = fixture.roleOutputs[0];
  const injectedPayload = { ...outputBody.parsedPayload, referenceLabel: "NO_FINDING" };
  const injectedOutput = sealV5R3Artifact({
    ...outputBody,
    parsedPayload: injectedPayload,
    parsedPayloadHash: sha256V5R3(canonicalJsonV5R3(injectedPayload)),
  });
  assert.throws(() => buildC0PredicateInputMapV5R7({
    ...fixture,
    roleOutputs: [injectedOutput, ...fixture.roleOutputs.slice(1)],
  }), /validation|schema|reference|role output/u);

  const { selfHash: _evidenceHash, ...evidenceBody } = fixture.roleAttemptEvidenceReceipts[0];
  const driftedEvidence = sealV5R3Artifact({
    ...evidenceBody,
    sampleExecutionInventoryHash: H("wrong-inventory"),
  });
  assert.throws(() => buildC0PredicateInputMapV5R7({
    ...fixture,
    roleAttemptEvidenceReceipts: [driftedEvidence, ...fixture.roleAttemptEvidenceReceipts.slice(1)],
  }), /inventory|attempt evidence/u);
});
