import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateArtifactHash,
  createMetricInputLedger,
  deriveCounterfactualLedger,
  deriveDeterministicFindingMatches,
  deriveExecutionIntegrity,
  deriveMachineEvaluationDispositionV4,
  deriveMetricStatus,
  deriveObservedEvaluationLedger,
  deriveOverallDecision,
  enumerateFiniteFindingEndpointAdditionTotals,
  FROZEN_METRIC_RULES,
  FROZEN_PUBLIC_LIMITATIONS_V4,
  FROZEN_PUBLIC_LIMITATIONS_V4_HASH,
  MISSING_DATA_METHOD_SYNC_V4,
  recomputeMetricSet,
  validateFinalEvaluationBundle,
  validateFinalMetricComputationBundle,
  wilsonInterval,
} from "./design-contract.mjs";

const hash = (character) => character.repeat(64);

test("registration sync interface exposes cardinality-based surface worlds and rejects finite finding caps", () => {
  assert.equal(MISSING_DATA_METHOD_SYNC_V4.surfaceWorldCardinalityRule, "PRODUCT_PER_ITEM_MACHINE_CARDINALITY_TIMES_REFERENCE_CARDINALITY_MAX_64");
  assert.equal(MISSING_DATA_METHOD_SYNC_V4.resolvedReferenceMachineNonresolvedWorldsPerItem, 2);
  assert.deepEqual(MISSING_DATA_METHOD_SYNC_V4.unresolvedOrInvalidReferenceWorldsPerItem, {
    observedMachineResolved: 2,
    machineNonresolved: 4,
  });
  assert.deepEqual(MISSING_DATA_METHOD_SYNC_V4.findingDecisionBoundWhenReferenceUnidentified, { lower: 0, upper: 1 });
  assert.equal(MISSING_DATA_METHOD_SYNC_V4.findingMetricStatusWhenReferenceUnidentified, "UNDERPOWERED");
  assert.deepEqual(MISSING_DATA_METHOD_SYNC_V4.metricStatusPrecedence, [
    "OBSERVED_P0_FALSE_NEGATIVE_NOT_MET",
    "DECISIVE_WRONG_SIDE_CONFIDENCE_BOUND_NOT_MET",
    "MINIMUM_N_BLOCKS_MET",
    "FAVORABLE_CONFIDENCE_BOUND_MET",
    "OTHERWISE_UNDERPOWERED",
  ]);
  assert.equal(MISSING_DATA_METHOD_SYNC_V4.minimumNRole, "BLOCKS_MET_ONLY_AND_NEVER_OVERRIDES_DECISIVE_NOT_MET");
  assert.equal(MISSING_DATA_METHOD_SYNC_V4.forbiddenFiniteFindingCapFields.includes("finiteOperationalCodeCount"), true);
});

function withHash(artifact, field) {
  artifact[field] = calculateArtifactHash(artifact, field);
  return artifact;
}

function accounting(overrides = {}) {
  return {
    expectedSampleSize: 60,
    completeReceiptItemCount: 57,
    missingReceiptItemCount: 3,
    resolvedPositiveItemCount: 24,
    resolvedNegativeItemCount: 33,
    unresolvedReferenceItemCount: 0,
    invalidItemCount: 0,
    receiptChainValid: true,
    providerTupleValid: true,
    capsValid: true,
    terminalProviderFailure: false,
    ...overrides,
  };
}

test("execution integrity uses one combined three-item nonresolved allowance", () => {
  assert.deepEqual(deriveExecutionIntegrity(accounting()), {
    status: "INTACT",
    totalNonresolvedItemCount: 3,
    errors: [],
  });

  const fourNonresolved = deriveExecutionIntegrity(accounting({
    resolvedNegativeItemCount: 32,
    unresolvedReferenceItemCount: 1,
  }));
  assert.equal(fourNonresolved.status, "FAILED");
  assert.equal(fourNonresolved.errors.some((error) => error.includes("combined nonresolved")), true);

  const oneMissingTwoUnresolved = deriveExecutionIntegrity(accounting({
    completeReceiptItemCount: 59,
    missingReceiptItemCount: 1,
    resolvedNegativeItemCount: 33,
    unresolvedReferenceItemCount: 2,
  }));
  assert.equal(oneMissingTwoUnresolved.status, "INTACT");

  const below57 = deriveExecutionIntegrity(accounting({
    completeReceiptItemCount: 56,
    missingReceiptItemCount: 4,
    resolvedNegativeItemCount: 32,
  }));
  assert.equal(below57.status, "FAILED");
});

function completeItemResults({ positiveCount = 24, code = "EQUIVALENT_ANSWER_NOT_ACCEPTED", machineMissIndexes = [] } = {}) {
  const codeMetadata = {
    EQUIVALENT_ANSWER_NOT_ACCEPTED: { family: "RESPONSE_ACCEPTANCE", severity: "P1" },
    WRONG_CANONICAL_ANSWER: { family: "CANONICAL_ANSWER_SOLVABILITY", severity: "P0" },
    MINOR_WORDING_OR_FORMAT: { family: "WORDING_FORMAT", severity: "P2" },
  }[code];
  return Array.from({ length: 60 }, (_, index) => {
    const positive = index < positiveCount;
    const detected = positive && !machineMissIndexes.includes(index);
    const itemId = `item-${String(index + 1).padStart(3, "0")}`;
    const finding = {
      itemId,
      findingId: `${itemId}-finding-001`,
      evidenceLocator: "STORED_ANSWER",
      family: codeMetadata.family,
      code,
      severity: codeMetadata.severity,
    };
    return withHash({
      schemaVersion: "ItemEvaluationResultV1",
      designId: "MAIS-NATURAL-CA60-V4",
      registrationHash: hash("3"),
      sampleManifestHash: hash("4"),
      referenceSealHash: hash("5"),
      executionRegistrationHash: hash("6"),
      itemId,
      itemHash: calculateArtifactHash({ itemId }, "none"),
      clusterId: `cluster-${String(index + 1).padStart(3, "0")}`,
      executionDisposition: "COMPLETE",
      machineDisposition: "RESOLVED",
      referenceDisposition: positive ? "RESOLVED_POSITIVE" : "RESOLVED_NEGATIVE",
      machineSurfaceFinding: detected,
      referenceFindings: positive ? [finding] : [],
      machineFindings: detected ? [finding] : [],
      finalReferenceLabelHash: calculateArtifactHash({ itemId, kind: "reference" }, "none"),
      attemptReceiptHashes: [calculateArtifactHash({ itemId, kind: "attempt" }, "none")],
      machineNonresolvedReasonCodes: [],
    }, "itemResultHash");
  });
}

test("observed evaluation ledger is recomputed from 60 item results", () => {
  const ledger = deriveObservedEvaluationLedger(completeItemResults());
  assert.deepEqual(ledger.confusionMatrix, { tp: 24, fp: 0, fn: 0, tn: 36 });
  assert.deepEqual(ledger.accounting, {
    expectedSampleSize: 60,
    completeReceiptItemCount: 60,
    missingReceiptItemCount: 0,
    resolvedPositiveItemCount: 24,
    resolvedNegativeItemCount: 36,
    unresolvedReferenceItemCount: 0,
    invalidItemCount: 0,
  });
  assert.equal(ledger.findingCounts.familyMatchedReferenceCount, 24);
  assert.equal(ledger.findingCounts.exactMatchedReferenceCount, 24);

  const duplicateItem = completeItemResults();
  duplicateItem[1].itemId = duplicateItem[0].itemId;
  withHash(duplicateItem[1], "itemResultHash");
  assert.throws(() => deriveObservedEvaluationLedger(duplicateItem), /unique item/u);
});

test("finding matching is exact-first, family-second, deterministic, and one-to-one", () => {
  const itemId = "item-match";
  const reference = [
    { itemId, findingId: "ref-001", evidenceLocator: "ACCEPTED_ANSWERS", family: "RESPONSE_ACCEPTANCE", code: "EQUIVALENT_ANSWER_NOT_ACCEPTED", severity: "P1" },
    { itemId, findingId: "ref-002", evidenceLocator: "RUBRIC", family: "RESPONSE_ACCEPTANCE", code: "FALSE_REJECT_CORRECT_RESPONSE", severity: "P0" },
  ];
  const machine = [
    { itemId, findingId: "machine-001", evidenceLocator: "RUBRIC", family: "RESPONSE_ACCEPTANCE", code: "FALSE_REJECT_CORRECT_RESPONSE", severity: "P0" },
  ];
  const result = deriveDeterministicFindingMatches(reference, machine);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].matchType, "EXACT_CODE_AND_FAMILY");
  assert.equal(result.unmatchedReference.length, 1);
  assert.equal(result.unmatchedMachine.length, 0);
  assert.deepEqual(result, deriveDeterministicFindingMatches([...reference].reverse(), [...machine].reverse()));
});

test("finding IDs bind one complete leaf globally and matching is permutation invariant", () => {
  const itemId = "item-global-finding";
  const first = { itemId, findingId: "finding-a", evidenceLocator: "PROMPT", family: "WORDING_FORMAT", code: "MINOR_WORDING_OR_FORMAT", severity: "P2" };
  const second = { itemId, findingId: "finding-b", evidenceLocator: "STORED_ANSWER", family: "RESPONSE_ACCEPTANCE", code: "EQUIVALENT_ANSWER_NOT_ACCEPTED", severity: "P1" };
  assert.deepEqual(
    deriveDeterministicFindingMatches([first, second], [second, first]),
    deriveDeterministicFindingMatches([second, first], [first, second]),
  );
  assert.throws(() => deriveDeterministicFindingMatches([first, structuredClone(first)], [second]), /duplicate.*findingId|globally unique/iu);
  assert.throws(() => deriveDeterministicFindingMatches([
    first,
    { ...second, findingId: first.findingId },
  ], [second]), /duplicate.*findingId|conflict|globally unique/iu);

  const globalDuplicate = completeItemResults({ positiveCount: 2 });
  globalDuplicate[1].referenceFindings[0].findingId = globalDuplicate[0].referenceFindings[0].findingId;
  globalDuplicate[1].machineFindings[0].findingId = globalDuplicate[0].machineFindings[0].findingId;
  withHash(globalDuplicate[1], "itemResultHash");
  assert.throws(() => deriveObservedEvaluationLedger(globalDuplicate), /duplicate.*findingId|global.*finding/iu);
});

function threeMissingItemResults() {
  const results = completeItemResults();
  for (const item of results.slice(-3)) {
    item.executionDisposition = "MISSING_RECEIPT";
    item.machineDisposition = "MISSING_RECEIPT";
    item.machineSurfaceFinding = null;
    item.machineFindings = [];
    item.attemptReceiptHashes = [];
    withHash(item, "itemResultHash");
  }
  return results;
}

test("counterfactual ledger keeps observed counts separate and caps the finite three-item universe", () => {
  const observed = deriveObservedEvaluationLedger(threeMissingItemResults());
  assert.equal(observed.accounting.completeReceiptItemCount, 57);
  assert.equal(observed.accounting.missingReceiptItemCount, 3);
  assert.equal(observed.accounting.resolvedNegativeItemCount, 33);
  const ledger = deriveCounterfactualLedger(observed);
  assert.equal(ledger.nonresolvedItemCount, 3);
  assert.deepEqual(ledger.maximumAdverseFindingOpportunityAdditions, {
    familyRecall: 0,
    exactCodeAndFamilyRecall: 0,
    p1Recall: 0,
    p2MissedOrUnresolved: 0,
  });
  assert.equal(ledger.findingDecisionBoundUnidentified, false);
  assert.equal(ledger.surfaceAssignmentCount, 8);
  assert.equal(ledger.surfaceEnumerationRule, "FIX_SEALED_REFERENCE_WHEN_RESOLVED_AND_ENUMERATE_TWO_MACHINE_STATES_FOR_MACHINE_NONRESOLUTION; FIX_OBSERVED_MACHINE_STATE_AND_ENUMERATE_TWO_REFERENCE_STATES_FOR_REFERENCE_NONRESOLUTION");
  assert.equal(ledger.p0MissingFalseNegativesFabricated, 0);
  assert.equal(ledger.counterfactualLedgerSeparateFromObservedCounts, true);
});

test("surface counterfactuals enumerate only feasible worlds under each observed machine prediction", () => {
  const results = completeItemResults({ positiveCount: 1 });
  results[0].referenceDisposition = "UNRESOLVED_REFERENCE";
  results[0].referenceFindings = [];
  withHash(results[0], "itemResultHash");
  results[1].referenceDisposition = "UNRESOLVED_REFERENCE";
  withHash(results[1], "itemResultHash");
  const observed = deriveObservedEvaluationLedger(results);
  const ledger = deriveCounterfactualLedger(observed);
  assert.equal(ledger.surfaceWorlds.length, 4);
  for (const world of ledger.surfaceWorlds) {
    const predictedPositive = world.assignments.find(({ itemId }) => itemId === results[0].itemId);
    const predictedNegative = world.assignments.find(({ itemId }) => itemId === results[1].itemId);
    assert.notEqual(predictedPositive.classification, "FN");
    assert.notEqual(predictedNegative.classification, "FP");
  }
});

test("MISSING_RECEIPT keeps the sealed resolved reference fixed and varies only the machine side", () => {
  const results = completeItemResults({ positiveCount: 60 });
  results[0].executionDisposition = "MISSING_RECEIPT";
  results[0].machineDisposition = "MISSING_RECEIPT";
  results[0].machineSurfaceFinding = null;
  results[0].machineFindings = [];
  results[0].machineNonresolvedReasonCodes = ["MISSING_RECEIPT"];
  results[0].attemptReceiptHashes = [];
  withHash(results[0], "itemResultHash");
  const observed = deriveObservedEvaluationLedger(results);
  const counterfactual = deriveCounterfactualLedger(observed);
  assert.equal(counterfactual.surfaceWorlds.length, 2);
  const assignments = counterfactual.surfaceWorlds.map((world) => world.assignments[0]);
  assert.deepEqual(new Set(assignments.map(({ assignedReferenceDisposition }) => assignedReferenceDisposition)), new Set(["RESOLVED_POSITIVE"]));
  assert.deepEqual(new Set(assignments.map(({ classification }) => classification)), new Set(["TP", "FN"]));
  assert.equal(counterfactual.maximumAdverseFindingOpportunityAdditions.familyRecall, 1);
  assert.equal(counterfactual.findingDecisionBoundUnidentified, false);
  const family = recomputeMetricSet(observed, counterfactual).find(({ metric }) => metric === "FAMILY_RECALL");
  assert.equal(Math.abs(family.worstCaseMissingLower - wilsonInterval(59, 60, 1.6448536269514722).lower) < 1e-12, true);
});

test("finding-level uncertainty never invents a finite 17/7/4 taxonomy cap", () => {
  assert.throws(() => enumerateFiniteFindingEndpointAdditionTotals(17, 1), /not a registered finding estimand|finite cap/u);
  for (const [metric, rule] of Object.entries(FROZEN_METRIC_RULES)) {
    assert.equal(Object.hasOwn(rule, "missingPerItem"), false, `${metric} must not register a finite per-item finding cap`);
  }

  const unresolved = completeItemResults({ positiveCount: 24 });
  unresolved[59].referenceDisposition = "UNRESOLVED_REFERENCE";
  unresolved[59].referenceFindings = [];
  withHash(unresolved[59], "itemResultHash");
  const observed = deriveObservedEvaluationLedger(unresolved);
  const counterfactual = deriveCounterfactualLedger(observed);
  assert.equal(counterfactual.findingDecisionBoundUnidentified, true);
  assert.deepEqual(counterfactual.findingDecisionBound, { lower: 0, upper: 1 });
  assert.deepEqual(counterfactual.maximumAdverseFindingOpportunityAdditions, {
    familyRecall: null,
    exactCodeAndFamilyRecall: null,
    p1Recall: null,
    p2MissedOrUnresolved: null,
  });
  for (const metricName of ["FAMILY_RECALL", "EXACT_CODE_AND_FAMILY_RECALL", "P1_RECALL", "P2_MISSED_OR_UNRESOLVED_RATE"]) {
    const metric = recomputeMetricSet(observed, counterfactual).find(({ metric }) => metric === metricName);
    assert.equal(metric.worstCaseMissingLower, 0);
    assert.equal(metric.worstCaseMissingUpper, 1);
    assert.equal(metric.status, "UNDERPOWERED");
  }
});

test("metric set recomputes counts, point estimates, intervals, and frozen minimum-N status", () => {
  const observed = deriveObservedEvaluationLedger(completeItemResults());
  const counterfactual = deriveCounterfactualLedger(observed);
  const metrics = recomputeMetricSet(observed, counterfactual);
  const byName = new Map(metrics.map((metric) => [metric.metric, metric]));
  const sensitivity = byName.get("SURFACE_SENSITIVITY");
  assert.equal(sensitivity.numerator, 24);
  assert.equal(sensitivity.denominator, 24);
  assert.equal(sensitivity.pointEstimate, 1);
  assert.equal(sensitivity.minimumN, 25);
  assert.equal(sensitivity.status, "UNDERPOWERED");
  assert.equal(sensitivity.oneSidedWilsonLcb95 < 0.9, true);

  const familyRecall = byName.get("FAMILY_RECALL");
  assert.equal(familyRecall.denominator, 24);
  assert.equal(familyRecall.bootstrapReplicates, 10_000);
  assert.equal(familyRecall.status, "MET");

  assert.equal(byName.get("SPECIFICITY").denominator, 36);
  assert.equal(byName.get("SPECIFICITY").status, "UNDERPOWERED");
  assert.equal(byName.get("P1_RECALL").denominator, 24);
  assert.equal(byName.get("P1_RECALL").status, "UNDERPOWERED");
});

function finalEvaluationBundle(itemResults = completeItemResults()) {
  const observed = deriveObservedEvaluationLedger(itemResults);
  const counterfactualLedger = deriveCounterfactualLedger(observed);
  const metricInputs = createMetricInputLedger(observed);
  const metricResults = recomputeMetricSet(observed, counterfactualLedger);
  const integrity = deriveExecutionIntegrity({
    ...observed.accounting,
    receiptChainValid: true,
    providerTupleValid: true,
    capsValid: true,
    terminalProviderFailure: false,
  });
  const conclusion = deriveOverallDecision({
    integrity,
    metrics: metricResults,
    materialDeviation: false,
    postResultDesignDrift: false,
    labelLeakage: false,
    unauthorizedProviderCall: false,
  });
  const finalReceipt = withHash({
    schemaVersion: "FinalEvaluationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: observed.registrationHash,
    frameRegistrationHash: hash("7"),
    sampleManifestHash: observed.sampleManifestHash,
    referenceSealHash: observed.referenceSealHash,
    executionRegistrationHash: observed.executionRegistrationHash,
    itemResultSetHash: observed.itemResultSetHash,
    counterfactualLedgerHash: counterfactualLedger.counterfactualLedgerHash,
    metricInputLedgerHash: metricInputs.metricInputLedgerHash,
    expectedSampleSize: 60,
    ...observed.accounting,
    unifiedNonresolvedItemCount: integrity.totalNonresolvedItemCount,
    confusionMatrix: observed.confusionMatrix,
    metricResults,
    completeAttemptReceiptCount: 480,
    receiptChainValid: true,
    providerTupleValid: true,
    capsValid: true,
    terminalProviderFailure: false,
    materialDeviation: false,
    postResultDesignDrift: false,
    labelLeakage: false,
    unauthorizedProviderCall: false,
    executionIntegrityStatus: integrity.status,
    policyRevisionRequired: conclusion === "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE",
    structuralFeasibilityGatePassed: false,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimScopeCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    publicLimitations: [...FROZEN_PUBLIC_LIMITATIONS_V4],
    publicLimitationSetHash: FROZEN_PUBLIC_LIMITATIONS_V4_HASH,
    conclusion,
    calculatedAt: "2026-08-25T05:00:00.000Z",
    previousReceiptHash: null,
  }, "receiptHash");
  return { finalReceipt, itemResults, counterfactualLedger, metricInputs };
}

test("final evaluation bundle rejects fabricated point estimates and counterfactual arithmetic", () => {
  assert.deepEqual(validateFinalMetricComputationBundle(finalEvaluationBundle()), []);

  const fabricatedUnifiedUniverse = finalEvaluationBundle();
  fabricatedUnifiedUniverse.finalReceipt.unifiedNonresolvedItemCount = 1;
  withHash(fabricatedUnifiedUniverse.finalReceipt, "receiptHash");
  assert.equal(validateFinalMetricComputationBundle(fabricatedUnifiedUniverse).some((error) => error.includes("unified nonresolved")), true);

  const fabricatedPoint = finalEvaluationBundle();
  fabricatedPoint.finalReceipt.metricResults.find((metric) => metric.metric === "SURFACE_SENSITIVITY").pointEstimate = 0.5;
  withHash(fabricatedPoint.finalReceipt, "receiptHash");
  assert.equal(validateFinalMetricComputationBundle(fabricatedPoint).some((error) => error.includes("metric results")), true);

  const fabricatedMissing = finalEvaluationBundle(threeMissingItemResults());
  fabricatedMissing.counterfactualLedger.findingDecisionBoundUnidentified = true;
  withHash(fabricatedMissing.counterfactualLedger, "counterfactualLedgerHash");
  fabricatedMissing.finalReceipt.counterfactualLedgerHash = fabricatedMissing.counterfactualLedger.counterfactualLedgerHash;
  withHash(fabricatedMissing.finalReceipt, "receiptHash");
  assert.equal(validateFinalMetricComputationBundle(fabricatedMissing).some((error) => error.includes("counterfactual ledger")), true);

  const legacyClaimAlias = finalEvaluationBundle();
  legacyClaimAlias.finalReceipt.claimCeiling = legacyClaimAlias.finalReceipt.claimScopeCeiling;
  delete legacyClaimAlias.finalReceipt.claimScopeCeiling;
  withHash(legacyClaimAlias.finalReceipt, "receiptHash");
  assert.equal(validateFinalMetricComputationBundle(legacyClaimAlias)
    .some((error) => error.includes("claim-scope ceiling")), true);

  const mutatedLimitations = finalEvaluationBundle();
  mutatedLimitations.finalReceipt.publicLimitations = [...FROZEN_PUBLIC_LIMITATIONS_V4].reverse();
  withHash(mutatedLimitations.finalReceipt, "receiptHash");
  assert.equal(validateFinalMetricComputationBundle(mutatedLimitations)
    .some((error) => /public limitation/iu.test(error)), true);

  const staleLimitationHash = finalEvaluationBundle();
  staleLimitationHash.finalReceipt.publicLimitationSetHash = hash("f");
  withHash(staleLimitationHash.finalReceipt, "receiptHash");
  assert.equal(validateFinalMetricComputationBundle(staleLimitationHash)
    .some((error) => /public limitation/iu.test(error)), true);
});

test("overall policy revision uses combined conservative wrong-side bounds", () => {
  const base = {
    metric: "FAMILY_RECALL",
    metricKind: "PROPORTION_DECISION_METRIC",
    thresholdDirection: "MINIMUM",
    threshold: 0.85,
    decisionEligible: true,
    oneSidedWilsonUcb95: 0.84,
    clusterBootstrapP95: 0.92,
    worstCaseMissingUpper: 0.95,
    conservativeUpper: 0.95,
    conservativeLower: 0.7,
    status: "UNDERPOWERED",
  };
  const intact = { status: "INTACT", errors: [], totalNonresolvedItemCount: 0 };
  assert.equal(deriveOverallDecision({ integrity: intact, metrics: [base], materialDeviation: false, postResultDesignDrift: false, labelLeakage: false, unauthorizedProviderCall: false }), "INCONCLUSIVE_MACHINE_REFERENCE");
  assert.equal(deriveOverallDecision({ integrity: intact, metrics: [{ ...base, clusterBootstrapP95: 0.8, worstCaseMissingUpper: 0.82, conservativeUpper: 0.84, status: "NOT_MET" }], materialDeviation: false, postResultDesignDrift: false, labelLeakage: false, unauthorizedProviderCall: false }), "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE");
});

test("every endpoint freezes its exact minimum-N boundary", () => {
  assert.equal(deriveMetricStatus({ metric: "FAMILY_RECALL", denominator: 15, conservativeLower: 1, conservativeUpper: 1 }), "UNDERPOWERED");
  assert.equal(deriveMetricStatus({ metric: "FAMILY_RECALL", denominator: 16, conservativeLower: wilsonInterval(16, 16, 1.6448536269514722).lower, conservativeUpper: 1 }), "MET");
  assert.equal(deriveMetricStatus({ metric: "SURFACE_SENSITIVITY", denominator: 24, conservativeLower: 1, conservativeUpper: 1 }), "UNDERPOWERED");
  assert.equal(deriveMetricStatus({ metric: "SURFACE_SENSITIVITY", denominator: 25, conservativeLower: wilsonInterval(25, 25, 1.6448536269514722).lower, conservativeUpper: 1 }), "MET");
  assert.equal(deriveMetricStatus({ metric: "SPECIFICITY", denominator: 51, conservativeLower: 1, conservativeUpper: 1 }), "UNDERPOWERED");
  assert.equal(deriveMetricStatus({ metric: "SPECIFICITY", denominator: 52, conservativeLower: wilsonInterval(52, 52, 1.6448536269514722).lower, conservativeUpper: 1 }), "MET");
  assert.equal(deriveMetricStatus({ metric: "P1_RECALL", denominator: 24, conservativeLower: 1, conservativeUpper: 1 }), "UNDERPOWERED");
  assert.equal(deriveMetricStatus({ metric: "P1_RECALL", denominator: 25, conservativeLower: 0.95, conservativeUpper: 1 }), "MET");
  assert.equal(deriveMetricStatus({ metric: "P2_MISSED_OR_UNRESOLVED_RATE", denominator: 24, conservativeLower: 0, conservativeUpper: 0 }), "UNDERPOWERED");
  assert.equal(deriveMetricStatus({ metric: "P2_MISSED_OR_UNRESOLVED_RATE", denominator: 25, conservativeLower: 0, conservativeUpper: wilsonInterval(0, 25, 1.6448536269514722).upper }), "MET");
  assert.equal(FROZEN_METRIC_RULES.P0_FALSE_NEGATIVE_COUNT.minimumN, 59);
  assert.equal(FROZEN_METRIC_RULES.P0_FALSE_NEGATIVE_COUNT.statusAt58ZeroFalseNegatives, "UNDERPOWERED");
  assert.equal(FROZEN_METRIC_RULES.P0_FALSE_NEGATIVE_COUNT.statusAt59ZeroFalseNegatives, "MET");
  assert.equal(deriveMetricStatus({ metric: "FAMILY_RECALL", denominator: 20, conservativeLower: 0.8, conservativeUpper: 0.9 }), "UNDERPOWERED");
  assert.equal(deriveMetricStatus({ metric: "FAMILY_RECALL", denominator: 20, conservativeLower: 0.1, conservativeUpper: 0.84 }), "NOT_MET");
  assert.equal(deriveMetricStatus({ metric: "P2_MISSED_OR_UNRESOLVED_RATE", denominator: 25, conservativeLower: 0.11, conservativeUpper: 0.2 }), "NOT_MET");
  assert.equal(deriveMetricStatus({ metric: "P0_FALSE_NEGATIVE_COUNT", denominator: 1, conservativeLower: null, conservativeUpper: null, observedFalseNegativeCount: 1 }), "NOT_MET");
});

test("a low-N minimum endpoint with a decisive wrong-side UCB is NOT_MET and revises policy", () => {
  const metric = {
    metric: "FAMILY_RECALL",
    metricKind: "PROPORTION_DECISION_METRIC",
    denominator: 10,
    minimumN: 16,
    status: deriveMetricStatus({ metric: "FAMILY_RECALL", denominator: 10, conservativeLower: 0.2, conservativeUpper: 0.8 }),
    thresholdDirection: "MINIMUM",
    threshold: 0.85,
    conservativeLower: 0.2,
    conservativeUpper: 0.8,
    decisionEligible: true,
  };
  assert.equal(metric.status, "NOT_MET");
  assert.equal(deriveOverallDecision({ integrity: { status: "INTACT" }, metrics: [metric], materialDeviation: false, postResultDesignDrift: false, labelLeakage: false, unauthorizedProviderCall: false }), "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE");
});

test("a low-N maximum endpoint with a decisive wrong-side LCB is NOT_MET and revises policy", () => {
  const status = deriveMetricStatus({
    metric: "P2_MISSED_OR_UNRESOLVED_RATE",
    denominator: 10,
    conservativeLower: 0.2,
    conservativeUpper: 0.4,
  });
  const metric = {
    metric: "P2_MISSED_OR_UNRESOLVED_RATE",
    metricKind: "PROPORTION_DECISION_METRIC",
    denominator: 10,
    minimumN: 25,
    status,
    thresholdDirection: "MAXIMUM",
    threshold: 0.1,
    conservativeLower: 0.2,
    conservativeUpper: 0.4,
    decisionEligible: true,
  };
  assert.equal(status, "NOT_MET");
  assert.equal(deriveOverallDecision({ integrity: { status: "INTACT" }, metrics: [metric], materialDeviation: false, postResultDesignDrift: false, labelLeakage: false, unauthorizedProviderCall: false }), "POLICY_REVISION_REQUIRED_MACHINE_REFERENCE");
});

test("minimumN still blocks MET for perfect or threshold-crossing low-N evidence", () => {
  assert.equal(deriveMetricStatus({ metric: "FAMILY_RECALL", denominator: 10, conservativeLower: 1, conservativeUpper: 1 }), "UNDERPOWERED");
  assert.equal(deriveMetricStatus({ metric: "FAMILY_RECALL", denominator: 10, conservativeLower: 0.2, conservativeUpper: 0.9 }), "UNDERPOWERED");
  assert.equal(deriveMetricStatus({ metric: "P2_MISSED_OR_UNRESOLVED_RATE", denominator: 10, conservativeLower: 0, conservativeUpper: 0 }), "UNDERPOWERED");
});

test("worst-case missing surface worlds use Wilson bounds rather than raw ratios", () => {
  const results = completeItemResults({ positiveCount: 0 });
  for (const item of results.slice(-3)) {
    item.executionDisposition = "MISSING_RECEIPT";
    item.machineDisposition = "MISSING_RECEIPT";
    item.machineSurfaceFinding = null;
    item.machineFindings = [];
    item.attemptReceiptHashes = [];
    withHash(item, "itemResultHash");
  }
  const observed = deriveObservedEvaluationLedger(results);
  const metrics = recomputeMetricSet(observed, deriveCounterfactualLedger(observed));
  const byName = new Map(metrics.map((metric) => [metric.metric, metric]));
  const specificity = byName.get("SPECIFICITY");
  const fpr = byName.get("FALSE_POSITIVE_RATE");
  assert.equal(Math.abs(specificity.worstCaseMissingLower - wilsonInterval(57, 60, 1.6448536269514722).lower) < 1e-12, true);
  assert.equal(Math.abs(fpr.worstCaseMissingUpper - wilsonInterval(3, 60, 1.6448536269514722).upper) < 1e-12, true);
  assert.equal(specificity.status === "MET" && fpr.status === "MET", false);
});

test("missing and unresolved leaves never enter observed matches, P0 FNs, or P2 counts", () => {
  const results = completeItemResults({ positiveCount: 1, code: "WRONG_CANONICAL_ANSWER" });
  results[0].executionDisposition = "MISSING_RECEIPT";
  results[0].machineDisposition = "MISSING_RECEIPT";
  results[0].machineSurfaceFinding = null;
  results[0].machineFindings = [];
  results[0].attemptReceiptHashes = [];
  withHash(results[0], "itemResultHash");
  results[1].referenceDisposition = "UNRESOLVED_REFERENCE";
  results[1].referenceFindings = [];
  results[1].machineFindings = [];
  results[1].machineSurfaceFinding = false;
  withHash(results[1], "itemResultHash");
  const observed = deriveObservedEvaluationLedger(results);
  assert.equal(observed.findingCounts.p0FalseNegativeCount, 0);
  assert.equal(observed.findingCounts.p0OpportunityItemCount, 0);
  assert.equal(observed.findingCounts.p2ReferenceCount, 0);
  assert.equal(observed.matchRecords.length, 0);
  assert.doesNotThrow(() => recomputeMetricSet(observed, deriveCounterfactualLedger(observed)));
});

test("P0 and finding minimum N count independent item clusters, not raw findings", () => {
  const p0Results = completeItemResults({ positiveCount: 12, code: "WRONG_CANONICAL_ANSWER" });
  for (const item of p0Results.slice(0, 12)) {
    item.referenceFindings = Array.from({ length: 5 }, (_, index) => ({
      ...item.referenceFindings[0],
      findingId: `${item.itemId}-p0-${index + 1}`,
      evidenceLocator: `P0_EVIDENCE_${index + 1}`,
    }));
    item.machineFindings = structuredClone(item.referenceFindings);
    withHash(item, "itemResultHash");
  }
  const p0Observed = deriveObservedEvaluationLedger(p0Results);
  const p0Metric = recomputeMetricSet(p0Observed, deriveCounterfactualLedger(p0Observed)).find((metric) => metric.metric === "P0_FALSE_NEGATIVE_COUNT");
  assert.equal(p0Metric.observedOpportunityCount, 12);
  assert.equal(p0Metric.status, "UNDERPOWERED");
  assert.equal(p0Metric.observedMissRate, 0);
  assert.equal(p0Metric.oneSidedWilsonMissRateUcb95 > 0.05, true);
  assert.equal(p0Metric.missingFalseNegativesFabricated, 0);

  const findingResults = completeItemResults({ positiveCount: 1 });
  findingResults[0].referenceFindings = Array.from({ length: 16 }, (_, index) => ({
    ...findingResults[0].referenceFindings[0],
    findingId: `same-cluster-ref-${index + 1}`,
    evidenceLocator: `ACCEPTANCE_CASE_${index + 1}`,
  }));
  findingResults[0].machineFindings = Array.from({ length: 16 }, (_, index) => ({
    ...findingResults[0].referenceFindings[index],
    findingId: `same-cluster-machine-${index + 1}`,
  }));
  withHash(findingResults[0], "itemResultHash");
  const findingObserved = deriveObservedEvaluationLedger(findingResults);
  const family = recomputeMetricSet(findingObserved, deriveCounterfactualLedger(findingObserved)).find((metric) => metric.metric === "FAMILY_RECALL");
  assert.equal(family.denominator, 16);
  assert.equal(family.independentContributingClusterCount, 1);
  assert.equal(family.status, "UNDERPOWERED");
});

test("bootstrap zero-denominator replicates use the frozen adverse value and never disappear", () => {
  const observed = deriveObservedEvaluationLedger(completeItemResults({ positiveCount: 1 }));
  const family = recomputeMetricSet(observed, deriveCounterfactualLedger(observed)).find((metric) => metric.metric === "FAMILY_RECALL");
  assert.equal(family.bootstrapValidReplicateCount, 10_000);
  assert.equal(family.bootstrapZeroDenominatorRule, "ASSIGN_ADVERSE_BOUND_ZERO_FOR_MINIMUM_ONE_FOR_MAXIMUM");
});

test("metric recomputation rejects pre-poisoned content even when leaf root strings are unchanged", () => {
  const observed = deriveObservedEvaluationLedger(completeItemResults());
  const counterfactual = deriveCounterfactualLedger(observed);
  recomputeMetricSet(observed, counterfactual);
  observed.confusionMatrix.tp = 0;
  assert.throws(() => recomputeMetricSet(observed, counterfactual), /observed ledger self-hash|metric input/u);
});

test("four nonresolved items derive an integrity-failure ledger instead of throwing", () => {
  const results = completeItemResults();
  for (const item of results.slice(-4)) {
    item.executionDisposition = "MISSING_RECEIPT";
    item.machineDisposition = "MISSING_RECEIPT";
    item.machineSurfaceFinding = null;
    item.machineFindings = [];
    item.attemptReceiptHashes = [];
    withHash(item, "itemResultHash");
  }
  const observed = deriveObservedEvaluationLedger(results);
  const ledger = deriveCounterfactualLedger(observed);
  assert.equal(ledger.nonresolvedItemCount, 4);
  assert.equal(ledger.integrityLimitExceeded, true);
  assert.equal(ledger.surfaceAssignmentCount, 0);
  assert.deepEqual(ledger.surfaceWorlds, []);
  assert.equal(ledger.surfaceEnumerationDisposition, "NOT_ENUMERATED_UNIFIED_NONRESOLVED_LIMIT_EXCEEDED");
  const metrics = recomputeMetricSet(observed, ledger);
  const sensitivity = metrics.find((metric) => metric.metric === "SURFACE_SENSITIVITY");
  assert.equal(sensitivity.worstCaseMissingLower, 0);
  assert.equal(sensitivity.worstCaseMissingUpper, 1);
  assert.equal(sensitivity.worstCaseMissingMethod, "INTEGRITY_LIMIT_EXCEEDED_NO_DECISION_BOUND");
  const integrity = deriveExecutionIntegrity({
    ...observed.accounting,
    receiptChainValid: true,
    providerTupleValid: true,
    capsValid: true,
    terminalProviderFailure: false,
  });
  assert.equal(integrity.status, "FAILED");
  assert.equal(deriveOverallDecision({
    integrity,
    metrics,
    materialDeviation: false,
    postResultDesignDrift: false,
    labelLeakage: false,
    unauthorizedProviderCall: false,
  }), "EXECUTION_INTEGRITY_FAILED");
});

test("B-prime unassessable, invalid, or reducer conflict is machine-nonresolved rather than a negative finding", () => {
  const resolved = deriveMachineEvaluationDispositionV4({
    bPrimeCritiquePayload: { valid: true, surfaceDisposition: "NO_FINDING", findings: [] },
    bPrimeRevisionPayload: { valid: true, surfaceDisposition: "NO_FINDING", findings: [] },
    bPrimeReducerStatus: "RESOLVED",
    bPrimeReducerConflictCodes: [],
    c0ReducerStatus: "NOT_SELECTED",
  });
  assert.deepEqual(resolved, { machineDisposition: "RESOLVED", machineNonresolvedReasonCodes: [] });

  for (const input of [
    {
      bPrimeCritiquePayload: { valid: true, surfaceDisposition: "UNASSESSABLE", findings: [] },
      bPrimeRevisionPayload: { valid: true, surfaceDisposition: "NO_FINDING", findings: [] },
      bPrimeReducerStatus: "RESOLVED", bPrimeReducerConflictCodes: [], c0ReducerStatus: "NOT_SELECTED",
    },
    {
      bPrimeCritiquePayload: { valid: false, surfaceDisposition: "NO_FINDING", findings: [] },
      bPrimeRevisionPayload: { valid: true, surfaceDisposition: "NO_FINDING", findings: [] },
      bPrimeReducerStatus: "RESOLVED", bPrimeReducerConflictCodes: [], c0ReducerStatus: "NOT_SELECTED",
    },
    {
      bPrimeCritiquePayload: { valid: true, surfaceDisposition: "NO_FINDING", findings: [] },
      bPrimeRevisionPayload: { valid: true, surfaceDisposition: "NO_FINDING", findings: [] },
      bPrimeReducerStatus: "UNRESOLVED", bPrimeReducerConflictCodes: ["RESOLUTION_CONFLICT"], c0ReducerStatus: "NOT_SELECTED",
    },
  ]) {
    const disposition = deriveMachineEvaluationDispositionV4(input);
    assert.equal(disposition.machineDisposition, "UNRESOLVED_MACHINE");
    assert.equal(disposition.machineNonresolvedReasonCodes.length > 0, true);
  }

  const results = completeItemResults({ positiveCount: 0 });
  results[0].machineDisposition = "UNRESOLVED_MACHINE";
  results[0].machineSurfaceFinding = null;
  results[0].machineFindings = [];
  results[0].machineNonresolvedReasonCodes = ["B_PRIME_UNASSESSABLE"];
  withHash(results[0], "itemResultHash");
  const observed = deriveObservedEvaluationLedger(results);
  assert.deepEqual(observed.confusionMatrix, { tp: 0, fp: 0, fn: 0, tn: 59 });
  assert.equal(observed.accounting.invalidItemCount, 1);
  assert.equal(observed.accounting.resolvedNegativeItemCount, 59);
});

test("final invalidation evidence flags are exact booleans and cannot fail open as strings", () => {
  const bundle = finalEvaluationBundle();
  bundle.finalReceipt.labelLeakage = "false";
  withHash(bundle.finalReceipt, "receiptHash");
  assert.equal(validateFinalMetricComputationBundle(bundle).some((error) => error.includes("invalidation evidence") || error.includes("Boolean")), true);
});

test("public final evaluation validator rejects metric-only self-consistent bundles without raw execution evidence", () => {
  const errors = validateFinalEvaluationBundle(finalEvaluationBundle());
  assert.equal(errors.some((error) => error.includes("reference execution") || error.includes("raw execution evidence") || error.includes("DeepSeek")), true);
});
