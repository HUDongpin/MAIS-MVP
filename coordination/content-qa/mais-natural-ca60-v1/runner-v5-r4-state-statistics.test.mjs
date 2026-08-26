import assert from "node:assert/strict";
import test from "node:test";

import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  FROZEN_METRIC_RULES,
  wilsonInterval,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import { V5_R4_SCHEMA_CATALOG } from "./schema-contract-v5-r4.mjs";
import { planDeepSeekExecutionV5R4 } from "./execution-state-v5-r4.mjs";
import { SCORER_V5_R4_CONSTANTS } from "./scorer-v5-r4.mjs";
import {
  buildAuthorizationFixtureV5R4,
  buildRunnerFixtureV5R4,
} from "./runner-v5-r4-test-fixtures.mjs";

const H = (value) => sha256V5R3(String(value));

function syntheticDeepSeekExecutionRegistration(fixture) {
  return sealV5R3Artifact({
    schemaVersion: "DeepSeekExecutionRegistrationV2",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt: "2026-08-26T00:50:00.000Z",
    runnerRegistrationHash: fixture.registration.selfHash,
    freshRunnerReviewHash: fixture.review.selfHash,
    deepSeekAuthorizationHash: fixture.authorization.selfHash,
    referenceSealHash: fixture.authorization.referenceSealHash,
    referenceAttemptChainHash: fixture.authorization.referenceAttemptChainHash,
    referenceLedgerTerminalHash: H("fixture-reference-terminal"),
    referenceSealValidationReceiptHash: H("fixture-reference-validation"),
    sampleExecutionInventoryHash: fixture.inventory.selfHash,
    frameRegistrationHash: fixture.registration.frameRegistrationHash,
    sampleManifestHash: fixture.registration.sampleManifestHash,
    c0RandomAuditHash: fixture.registration.c0RandomAuditHash,
    routeEvidenceBundleHash: fixture.routeEvidence.selfHash,
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    adapterHash: fixture.authorization.providerImplementationHash,
  });
}

test("DeepSeek canary planner begins only with manifest row one and resume cannot bypass the gate", () => {
  const referenceHash = H("fixture-reference");
  const fixture = buildAuthorizationFixtureV5R4(buildRunnerFixtureV5R4(), "DEEPSEEK_DIRECT", {
    referenceSealHash: referenceHash,
    referenceAttemptChainHash: H("fixture-reference-attempt-chain"),
  });
  const executionRegistration = syntheticDeepSeekExecutionRegistration(fixture);
  const common = {
    registration: fixture.registration,
    deepSeekAuthorization: fixture.authorization,
    inventory: fixture.inventory,
    sampleManifest: fixture.sampleManifest,
    itemLeaves: fixture.itemLeaves,
    ledgerEntries: [],
    executionRegistration,
    generatedAt: fixture.at,
  };
  const canary = planDeepSeekExecutionV5R4({ ...common, mode: "DEEPSEEK_CANARY" });
  assert.equal(canary.planStatus, "NEXT_ACTION");
  assert.equal(canary.manifestOrdinal, 1);
  assert.equal(canary.itemHash, fixture.inventory.items[0].itemHash);
  assert.equal(canary.role, "B_PRIME_CRITIQUE");

  const resume = planDeepSeekExecutionV5R4({ ...common, mode: "DEEPSEEK_RESUME" });
  assert.equal(resume.planStatus, "CANARY_REQUIRED");
  assert.equal(resume.manifestOrdinal, 1);
  assert.equal(resume.itemHash, fixture.inventory.items[0].itemHash);
});

test("frozen Wilson minima make the joint CA60 surface gate structurally impossible", () => {
  const z = DESIGN.analysis.confidenceIntervals.zOneSided95;
  assert.ok(wilsonInterval(24, 24, z).lower < 0.90);
  assert.ok(wilsonInterval(25, 25, z).lower >= 0.90);
  assert.ok(wilsonInterval(51, 51, z).lower < 0.95);
  assert.ok(wilsonInterval(52, 52, z).lower >= 0.95);
  assert.equal(FROZEN_METRIC_RULES.SURFACE_SENSITIVITY.minimumN, 25);
  assert.equal(FROZEN_METRIC_RULES.SPECIFICITY.minimumN, 52);
  assert.equal(25 + 52 > 60, true);
  assert.deepEqual(DESIGN.analysis.structuralFeasibility, {
    targetItems: 60,
    perfectSensitivityMinimumPositiveItems: 25,
    perfectSpecificityMinimumNegativeItems: 52,
    minimumCombinedItems: 77,
    ca60CanSimultaneouslyMeetSurfaceConfidenceGates: false,
    normalHighestDecision: "INCONCLUSIVE_MACHINE_REFERENCE",
  });
});

test("V5-R4 scorer binds the frozen 10,000-replicate kernel and cannot emit PASS or limited-generalization evidence", () => {
  assert.equal(SCORER_V5_R4_CONSTANTS.bootstrapReplicates, 10_000);
  assert.equal(SCORER_V5_R4_CONSTANTS.metricDecisionMethodHash, DESIGN.analysis.frozenMethodComponentRoots.metricDecisionMethodHash);
  assert.match(SCORER_V5_R4_CONSTANTS.bootstrapGoldenVectorHash, /^[0-9a-f]{64}$/u);
  const aggregate = V5_R4_SCHEMA_CATALOG.NaturalCaAggregateScoreReceiptV2.properties;
  assert.deepEqual(aggregate.overallDecision.enum, [
    "INVALID_FOR_GENERALIZATION",
    "EXECUTION_INTEGRITY_FAILED",
    "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE",
    "INCONCLUSIVE_MACHINE_REFERENCE",
  ]);
  assert.equal(aggregate.decisionCeiling.const, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(aggregate.passClaimAllowed.const, false);
  assert.equal(aggregate.limitedGeneralizationEvidenceAllowed.const, false);
  assert.doesNotMatch(JSON.stringify(aggregate.overallDecision.enum), /PASS|APPROVED|PRODUCTION_READY|LIMITED_GENERALIZATION_EVIDENCE/u);
});
