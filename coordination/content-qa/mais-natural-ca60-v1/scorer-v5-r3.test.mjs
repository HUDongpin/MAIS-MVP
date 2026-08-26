import assert from "node:assert/strict";
import test from "node:test";

import { sealV5R3Artifact, validateSelfHashV5R3 } from "./execution-integrity-v5-r3.mjs";
import { matchFindingsV5R3, scoreNaturalCaV5R3, wilsonIntervalV5R3 } from "./scorer-v5-r3.mjs";

const H = (character) => character.repeat(64);

function finding(id, code, family, severity) { return { findingId: id, code, family, severity }; }

function input(items, overrides = {}) {
  return sealV5R3Artifact({
    schemaVersion: "NaturalCaScoringInputV1",
    registrationHash: H("1"),
    referenceSealHash: H("2"),
    executionRegistrationHash: H("3"),
    thresholdsFrozenAt: "2026-08-26T01:00:00.000Z",
    firstReferenceAttemptAt: "2026-08-26T05:00:00.000Z",
    firstEvaluationAttemptAt: "2026-08-26T06:00:00.000Z",
    executionIntegrityValid: true,
    labelLeakageDetected: false,
    unresolvedOrInvalidCount: 0,
    expectedItemCount: 60,
    items,
    ...overrides,
  });
}

function perfectItems() {
  return Array.from({ length: 60 }, (_, index) => {
    const positive = index < 30;
    const referenceFindings = positive ? [finding(`r-${index}`, "EVIDENCE_MISMATCH", "EVIDENCE", "P1")] : [];
    const machineFindings = positive ? [finding(`m-${index}`, "EVIDENCE_MISMATCH", "EVIDENCE", "P1")] : [];
    return { itemHash: index.toString(16).padStart(64, "0"), clusterId: `cluster-${index}`, referenceFindings, machineFindings };
  });
}

test("Wilson implementation reports one-sided and two-sided exact bounds", () => {
  const interval = wilsonIntervalV5R3(30, 30);
  assert.ok(interval.oneSidedLower95 > 0.9);
  assert.equal(interval.pointEstimate, 1);
  assert.ok(interval.twoSidedLower95 < interval.oneSidedLower95);
  assert.equal(wilsonIntervalV5R3(0, 0).status, "NO_DENOMINATOR");
});

test("finding matching is deterministic one-to-one: exact code+family before family-only", () => {
  const reference = [finding("r1", "A", "F", "P1"), finding("r2", "B", "F", "P1")];
  const machine = [finding("m1", "B", "F", "P1"), finding("m2", "X", "F", "P1"), finding("m3", "A", "G", "P1")];
  const matched = matchFindingsV5R3(reference, machine);
  assert.deepEqual(matched.matches.map((entry) => [entry.referenceFindingId, entry.machineFindingId, entry.matchLevel]), [
    ["r2", "m1", "EXACT_CODE_AND_FAMILY"],
    ["r1", "m2", "FAMILY_ONLY"],
  ]);
  assert.deepEqual(matched.unmatchedMachineFindingIds, ["m3"]);
});

test("perfect CA60 remains INCONCLUSIVE because the specificity denominator is structurally underpowered", () => {
  const result = scoreNaturalCaV5R3(input(perfectItems()));
  assert.equal(validateSelfHashV5R3(result), true);
  assert.equal(result.metrics.surfaceSensitivity.status, "MET");
  assert.equal(result.metrics.surfaceSpecificity.status, "UNDERPOWERED");
  assert.equal(result.overallDecision, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(result.decisionCeiling, "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.doesNotMatch(JSON.stringify(result), /"PASS"|APPROVED|PRODUCTION_READY/u);
});

test("observed P0 false negative forces POLICY_REVISION_REQUIRED_MACHINE_REFERENCE", () => {
  const items = perfectItems();
  items[0] = {
    ...items[0],
    referenceFindings: [finding("p0-ref", "WRONG_CANONICAL_ANSWER", "ANSWER_CORRECTNESS", "P0")],
    machineFindings: [],
  };
  const result = scoreNaturalCaV5R3(input(items));
  assert.equal(result.metrics.p0FalseNegatives.count, 1);
  assert.equal(result.overallDecision, "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE");
});

test("late thresholds, leakage, broken integrity, too many unresolved, or duplicate clusters invalidate/fail execution before metrics claims", () => {
  const late = scoreNaturalCaV5R3(input(perfectItems(), { thresholdsFrozenAt: "2026-08-26T07:00:00.000Z" }));
  assert.equal(late.overallDecision, "INVALID_FOR_GENERALIZATION");
  const leakage = scoreNaturalCaV5R3(input(perfectItems(), { labelLeakageDetected: true }));
  assert.equal(leakage.overallDecision, "INVALID_FOR_GENERALIZATION");
  const integrity = scoreNaturalCaV5R3(input(perfectItems(), { executionIntegrityValid: false }));
  assert.equal(integrity.overallDecision, "EXECUTION_INTEGRITY_FAILED");
  const unresolved = scoreNaturalCaV5R3(input(perfectItems().slice(0, 57), { unresolvedOrInvalidCount: 4 }));
  assert.equal(unresolved.overallDecision, "EXECUTION_INTEGRITY_FAILED");
  const duplicated = perfectItems();
  duplicated[1] = { ...duplicated[1], clusterId: duplicated[0].clusterId };
  assert.throws(() => scoreNaturalCaV5R3(input(duplicated)), /cluster/u);
});
