import assert from "node:assert/strict";
import test from "node:test";

import {
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildCompleteScoreEnvelopeV5R7,
  verifyCompleteScoreEnvelopeV5R7,
} from "./scorer-verifier-v5-r7.mjs";

const H = (value) => sha256V5R3(`r7-score:${value}`);
const ACTIVE = H("active");
const INVENTORY = H("inventory");
const REFERENCE = H("reference");
const EXECUTION = H("execution");
const C0 = H("c0");
const GRAPH = H("graph");
const SEMANTIC = H("semantic");

function scoringInput(items = Array.from({ length: 60 }, (_, index) => ({
  itemHash: H(`item:${index}`),
  clusterId: `cluster-${index + 1}`,
  referenceFindings: [],
  machineFindings: [],
})), overrides = {}) {
  return sealV5R3Artifact({
    schemaVersion: "NaturalCaScoringInputV1",
    registrationHash: ACTIVE,
    referenceSealHash: REFERENCE,
    executionRegistrationHash: EXECUTION,
    thresholdsFrozenAt: "2026-08-25T00:00:00.000Z",
    firstReferenceAttemptAt: "2026-08-26T10:00:00.000Z",
    firstEvaluationAttemptAt: "2026-08-26T11:00:00.000Z",
    executionIntegrityValid: true,
    labelLeakageDetected: false,
    unresolvedOrInvalidCount: 0,
    expectedItemCount: 60,
    items,
    ...overrides,
  });
}

function build(input = scoringInput()) {
  return buildCompleteScoreEnvelopeV5R7({
    activeRunnerRegistrationHash: ACTIVE,
    inventoryHash: INVENTORY,
    referenceSealHash: REFERENCE,
    executionRegistrationHash: EXECUTION,
    c0ExecutionSetHash: C0,
    deepSeekAttemptGraphReceiptHash: GRAPH,
    semanticDispatchVerificationReceiptHash: SEMANTIC,
    scoringInput: input,
    scoredAt: "2026-08-26T12:00:00.000Z",
  });
}

test("R7 complete score recomputes closed matching, Wilson/bootstrap metrics, and the CA60 decision ceiling", () => {
  const built = build();
  assert.equal(built.scoreReceipt.analysisStatus, "COMPLETE_FROZEN_METRIC_ANALYSIS");
  assert.equal(built.scoreReceipt.overallDecision, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(built.scoreReceipt.passClaimAllowed, false);
  assert.equal(built.baseAggregateScoreReceipt.metrics.surfaceSensitivity.status, "UNDERPOWERED");
  assert.equal(built.baseAggregateScoreReceipt.metrics.surfaceSpecificity.status, "MET");
  assert.deepEqual(verifyCompleteScoreEnvelopeV5R7({
    ...built,
    activeRunnerRegistrationHash: ACTIVE,
    inventoryHash: INVENTORY,
    referenceSealHash: REFERENCE,
    executionRegistrationHash: EXECUTION,
    c0ExecutionSetHash: C0,
    deepSeekAttemptGraphReceiptHash: GRAPH,
    semanticDispatchVerificationReceiptHash: SEMANTIC,
  }), []);
});

test("R7 verifier rejects self-hashed fabricated complete metrics and unrelated nested hashes", () => {
  const built = build();
  const { selfHash: _baseHash, ...baseBody } = built.baseAggregateScoreReceipt;
  const fabricatedBase = sealV5R3Artifact({
    ...baseBody,
    overallDecision: "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE",
  });
  assert.ok(verifyCompleteScoreEnvelopeV5R7({
    ...built,
    baseAggregateScoreReceipt: fabricatedBase,
    activeRunnerRegistrationHash: ACTIVE,
    inventoryHash: INVENTORY,
    referenceSealHash: REFERENCE,
    executionRegistrationHash: EXECUTION,
    c0ExecutionSetHash: C0,
    deepSeekAttemptGraphReceiptHash: GRAPH,
    semanticDispatchVerificationReceiptHash: SEMANTIC,
  }).length > 0);

  const { selfHash: _scoreHash, ...scoreBody } = built.scoreReceipt;
  const fabricatedOuter = sealV5R3Artifact({
    ...scoreBody,
    baseAggregateScoreReceiptHash: H("unrelated-base-score"),
  });
  assert.ok(verifyCompleteScoreEnvelopeV5R7({
    ...built,
    scoreReceipt: fabricatedOuter,
    activeRunnerRegistrationHash: ACTIVE,
    inventoryHash: INVENTORY,
    referenceSealHash: REFERENCE,
    executionRegistrationHash: EXECUTION,
    c0ExecutionSetHash: C0,
    deepSeekAttemptGraphReceiptHash: GRAPH,
    semanticDispatchVerificationReceiptHash: SEMANTIC,
  }).length > 0);
});

test("R7 decision precedence remains invalid for late thresholds and policy-revision for a P0 miss", () => {
  const late = build(scoringInput(undefined, {
    thresholdsFrozenAt: "2026-08-27T00:00:00.000Z",
  }));
  assert.equal(late.scoreReceipt.overallDecision, "INVALID_FOR_GENERALIZATION");

  const items = scoringInput().items;
  const p0 = {
    findingId: "reference-p0",
    code: "WRONG_CANONICAL_ANSWER",
    family: "canonical_answer_correctness",
    severity: "P0",
  };
  const p0Items = [{ ...items[0], referenceFindings: [p0] }, ...items.slice(1)];
  const failed = build(scoringInput(p0Items));
  assert.equal(failed.baseAggregateScoreReceipt.metrics.p0FalseNegatives.count, 1);
  assert.equal(failed.scoreReceipt.overallDecision, "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE");
});
