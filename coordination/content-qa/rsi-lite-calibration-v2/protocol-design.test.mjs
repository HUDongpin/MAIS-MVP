import assert from "node:assert/strict";
import test from "node:test";

async function subject() {
  return import("./protocol-design.mjs");
}

test("builds 24 region-balanced matched triplets and exactly 168 core provider calls", async () => {
  const {
    ARMS,
    REGIONS,
    buildCalibrationProtocolV2,
    auditCalibrationProtocolV2
  } = await subject();
  const design = buildCalibrationProtocolV2({ seed: "mais-rsi-lite-v2-test-seed" });

  assert.deepEqual(ARMS, ["A_PRIME", "B_PRIME", "C0_PRIME"]);
  assert.deepEqual(REGIONS, ["CA", "HK", "MAINLAND"]);
  assert.equal(design.latentBundles.length, 24);
  assert.equal(design.packageAssignments.length, 72);
  assert.equal(design.corePlan.successfulProviderCalls, 168);
  assert.equal(design.corePlan.providerCallsPerLatentBundle, 7);
  assert.equal(design.packageAssignments.some((row) => row.arm === "C" || row.arm === "C_PRIME"), false);

  for (const region of REGIONS) {
    assert.equal(design.latentBundles.filter((row) => row.region === region).length, 8);
  }
  for (const bundle of design.latentBundles) {
    const rows = design.packageAssignments.filter((row) => row.latentBundleId === bundle.id);
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map((row) => row.arm).sort(), [...ARMS].sort());
    assert.equal(new Set(rows.map((row) => row.variantId)).size, 3);
    assert.equal(rows.reduce((sum, row) => sum + row.providerCalls, 0), 7);
  }
  assert.deepEqual(design.corePlan.successfulProviderCallsByArm, {
    A_PRIME: 0,
    B_PRIME: 48,
    C0_PRIME: 120
  });
  assert.deepEqual(auditCalibrationProtocolV2(design), []);
});

test("precommits repeatability supplements without hiding them inside the 168-call core estimand", async () => {
  const { buildCalibrationProtocolV2 } = await subject();
  const design = buildCalibrationProtocolV2({ seed: "mais-rsi-lite-v2-test-seed" });

  assert.equal(design.repeatabilityPlan.packageRepeats.length, 6);
  assert.equal(design.repeatabilityPlan.successfulProviderCalls, 21);
  assert.equal(design.repeatabilityPlan.corePlusRepeatSuccessfulProviderCalls, 189);
  assert.deepEqual(
    Object.fromEntries(["B_PRIME", "C0_PRIME"].map((arm) => [
      arm,
      design.repeatabilityPlan.packageRepeats.filter((row) => row.arm === arm).length
    ])),
    { B_PRIME: 3, C0_PRIME: 3 }
  );
  for (const region of ["CA", "HK", "MAINLAND"]) {
    const rows = design.repeatabilityPlan.packageRepeats.filter((row) => row.region === region);
    assert.deepEqual(rows.map((row) => row.arm).sort(), ["B_PRIME", "C0_PRIME"]);
    assert.ok(rows.every((row) => row.sameFrozenProjectionRequired === true));
    assert.ok(rows.every((row) => row.sameRequestParametersRequired === true));
  }
});

test("precommits each arm's reviewer sequence and aggregation rule", async () => {
  const { buildCalibrationProtocolV2 } = await subject();
  const design = buildCalibrationProtocolV2({ seed: "mais-rsi-lite-v2-test-seed" });

  assert.deepEqual(design.armContracts.A_PRIME, {
    providerCalls: 0,
    roleSequence: ["deterministic-baseline"],
    aggregateRoles: ["deterministic-baseline"]
  });
  assert.deepEqual(design.armContracts.B_PRIME, {
    providerCalls: 2,
    roleSequence: ["deterministic-baseline", "same-reviewer-critique", "same-reviewer-revision"],
    aggregateRoles: ["deterministic-baseline", "same-reviewer-revision"]
  });
  assert.deepEqual(design.armContracts.C0_PRIME, {
    providerCalls: 5,
    roleSequence: [
      "answer-blind-solver",
      "tool-verifier",
      "adversarial-grader",
      "bilingual-curriculum-critic",
      "evidence-verifier"
    ],
    aggregateRoles: [
      "answer-blind-solver",
      "tool-verifier",
      "adversarial-grader",
      "bilingual-curriculum-critic",
      "evidence-verifier"
    ]
  });
});

test("records a conservative proposed envelope but keeps live execution separately unauthorized", async () => {
  const { buildCalibrationProtocolV2 } = await subject();
  const design = buildCalibrationProtocolV2({ seed: "mais-rsi-lite-v2-test-seed" });

  assert.equal(design.ownerEnvelopeProposal.authorizationStatus, "proposal-only-not-authorized");
  assert.equal(design.ownerEnvelopeProposal.currencyCapUsd, 25);
  assert.equal(design.ownerEnvelopeProposal.providerCallCap, 220);
  assert.equal(design.ownerEnvelopeProposal.tokenCap, 40_000_000);
  assert.equal(design.ownerEnvelopeProposal.retryCallReserve, 31);
  assert.ok(design.ownerEnvelopeProposal.estimatedCorePlusRepeatCostUsd < 25);
  assert.equal(design.executionBoundary.liveProviderAuthorized, false);
  assert.equal(design.executionBoundary.formalExecutionAuthorized, false);
  assert.equal(design.executionBoundary.deploymentAuthorized, false);
  assert.equal(design.executionBoundary.executionEntrypointIncluded, false);
  assert.equal(design.executionBoundary.separateOwnerAuthorizationRequired, true);
});

test("defines an independent labeled natural sample for generalization rather than a per-question release gate", async () => {
  const { buildCalibrationProtocolV2 } = await subject();
  const plan = buildCalibrationProtocolV2({ seed: "mais-rsi-lite-v2-test-seed" }).naturalGeneralizationPlan;

  assert.equal(plan.independentFromSyntheticCalibration, true);
  assert.equal(plan.excludedFromPromptOrTaxonomyTuning, true);
  assert.equal(plan.targetQuestionCount, 180);
  assert.deepEqual(plan.regionQuotas, { CA: 60, HK: 60, MAINLAND: 60 });
  assert.equal(plan.perQuestionHumanReleaseGate, false);
  assert.equal(plan.generalizationClaimRequiresCompletedIndependentLabels, true);
  assert.equal(plan.livePromotionDecisionIncluded, false);
});

test("is deterministic for a seed and changes assignments for a different seed", async () => {
  const { buildCalibrationProtocolV2 } = await subject();
  const first = buildCalibrationProtocolV2({ seed: "v2-seed-one" });
  const second = buildCalibrationProtocolV2({ seed: "v2-seed-one" });
  const changed = buildCalibrationProtocolV2({ seed: "v2-seed-two" });

  assert.deepEqual(first, second);
  assert.notEqual(first.seedCommitmentSha256, changed.seedCommitmentSha256);
  assert.notDeepEqual(first.packageAssignments, changed.packageAssignments);
});
