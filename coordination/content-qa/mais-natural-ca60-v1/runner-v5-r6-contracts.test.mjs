import assert from "node:assert/strict";
import test from "node:test";

import {
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateActiveRunnerRegistrationV5R6,
  validateExactRunnerRegistrationEvidenceV5R6,
  validateFreshRunnerReviewV5R6,
} from "./execution-evidence-v5-r6.mjs";
import {
  validateStateBoundDispatchAuditV5R6,
} from "./guarded-provider-attempt-v5-r6.mjs";
import {
  validateAndRebuildProviderRequestArtifactV5R6,
  validateResolvedProviderAuthorizationV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  validateExternallyAttestedRouteEvidenceV5R6,
} from "./route-evidence-custody-v5-r6.mjs";
import {
  buildDeepSeekExecutionRegistrationV5R6,
  validateDeepSeekExecutionRegistrationV5R6,
} from "./reference-execution-freeze-v5-r6.mjs";
import {
  buildResolvedGuardedAttemptFixtureV5R6,
} from "./runner-v5-r6-test-fixtures.mjs";
import {
  V5_R6_SCHEMA_CATALOG,
  validateClosedSelfHashedArtifactV5R6,
} from "./schema-contract-v5-r6.mjs";

const R6_SCHEMA_NAMES = Object.freeze([
  "NaturalCaExecutionRunnerSupersedingRegistrationV2",
  "IndependentExecutionRunnerReviewReceiptV4",
  "ExactRunnerSupersedingRegistrationEvidenceV2",
  "DeepSeekC0TerminalPredicateReceiptV1",
  "DeepSeekC0ExecutionSetV4",
  "ExecutionIntegrityEvidenceV2",
  "NaturalCaAggregateScoreReceiptV4",
  "ProviderEvidenceCaptureReceiptV1",
  "AuthenticatedRouteEvidenceReceiptV2",
  "ProviderAuthorizationV5",
  "ProviderRequestArtifactV5",
  "ProviderRawResponseArtifactV1",
  "ProviderRawResponseBindingReceiptV1",
  "CommandTransitionSubreceiptV1",
  "CommandTransitionJournalReceiptV1",
  "ExecutionPlanReceiptV2",
  "StateBoundDispatchAuditReceiptV2",
  "ProviderDispatchPermitV4",
  "ResolvedProviderAttemptReceiptV1",
  "NaturalCaRunnerCommandReceiptV5",
  "ProtectedProviderEvidenceArtifactV1",
  "MachineReferenceSealV5",
  "ReferenceSealValidationReceiptV3",
  "DeepSeekExecutionRegistrationV4",
]);

function resealWith(value, additions) {
  const { selfHash: _discarded, ...body } = structuredClone(value);
  return sealV5R3Artifact({ ...body, ...additions });
}

test("every V5-R6 machine contract is catalogued, identified, top-level closed, and fully required", () => {
  for (const name of R6_SCHEMA_NAMES) {
    const schema = V5_R6_SCHEMA_CATALOG[name];
    assert.ok(schema, `${name} is absent from the R6 validator catalog`);
    assert.equal(schema.title, name);
    assert.equal(schema.$id, `https://mais.local/schemas/${name}.schema.json`);
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual([...(schema.required ?? [])].sort(), Object.keys(schema.properties ?? {}).sort());
  }
});

for (const provider of ["OPENAI_DIRECT", "DEEPSEEK_DIRECT"]) {
  test(`${provider} exact R6 registration, review, route, authorization, plan, and request reconstruct`, () => {
    const fixture = buildResolvedGuardedAttemptFixtureV5R6(provider);
    assert.deepEqual(validateActiveRunnerRegistrationV5R6(fixture.activeRegistration), []);
    assert.deepEqual(validateExactRunnerRegistrationEvidenceV5R6(fixture.registrationEvidence), []);
    assert.deepEqual(validateFreshRunnerReviewV5R6(fixture), []);
    assert.deepEqual(validateExternallyAttestedRouteEvidenceV5R6(fixture.authenticatedRouteEvidence), []);
    assert.deepEqual(validateResolvedProviderAuthorizationV5R6(fixture.authorization), []);
    assert.deepEqual(validateAndRebuildProviderRequestArtifactV5R6(fixture), []);
    assert.deepEqual(validateStateBoundDispatchAuditV5R6(fixture), []);
    if (provider === "DEEPSEEK_DIRECT") {
      assert.deepEqual(validateDeepSeekExecutionRegistrationV5R6(fixture), []);
      assert.deepEqual(buildDeepSeekExecutionRegistrationV5R6({
        ...fixture,
        registeredAt: fixture.executionRegistration.registeredAt,
      }), fixture.executionRegistration);
    }
    for (const artifact of [fixture.activeRegistration, fixture.registrationEvidence, fixture.freshReview,
      fixture.authenticatedRouteEvidence, fixture.authorization, fixture.requestArtifact, fixture.dispatchAudit]) {
      const tampered = resealWith(artifact, { unregisteredRuntimeAuthority: true });
      assert.match(validateClosedSelfHashedArtifactV5R6(tampered).join("; "), /additional property/iu);
    }
  });
}

test("nested registration and provider-request drift is rejected even when the outer artifact is freshly rehashed", () => {
  const fixture = buildResolvedGuardedAttemptFixtureV5R6("OPENAI_DIRECT");
  const activeRegistration = resealWith(fixture.activeRegistration, { unregisteredRuntimeAuthority: true });
  const evidenceBody = structuredClone(fixture.registrationEvidence);
  delete evidenceBody.selfHash;
  evidenceBody.activeRegistration = activeRegistration;
  evidenceBody.registrationHash = activeRegistration.selfHash;
  const evidence = sealV5R3Artifact(evidenceBody);
  assert.match(validateExactRunnerRegistrationEvidenceV5R6(evidence).join("; "), /additional property|registration/iu);

  const requestBody = structuredClone(fixture.requestArtifact);
  delete requestBody.selfHash;
  requestBody.wireRequest = { ...requestBody.wireRequest, unregisteredProviderField: true };
  const requestArtifact = sealV5R3Artifact(requestBody);
  assert.match(validateAndRebuildProviderRequestArtifactV5R6({ ...fixture, requestArtifact }).join("; "),
    /reconstruction|request|wire/iu);
});
