import assert from "node:assert/strict";
import test from "node:test";

import {
  assignClusterToStratumV2,
  canonicalJson,
  computeCapacityConstrainedHamilton,
  sha256Hex,
  validateFinalEvaluationReceiptV1,
  validateMachineReferenceLabelV1,
  validateSampleManifestV1,
} from "./design-contract.mjs";

const hash = (character) => character.repeat(64);
const cells = ["multiple-choice", "fill-in", "short-answer"]
  .flatMap((responseForm) => ["Low", "Medium", "High"].map((difficulty) => [responseForm, difficulty]));

function withSelfHash(artifact, field) {
  const clone = structuredClone(artifact);
  delete clone[field];
  artifact[field] = sha256Hex(canonicalJson(clone));
  return artifact;
}

function validManifest() {
  const registrationHash = hash("b");
  const samplingFrameHash = hash("a");
  const algorithmVersion = "natural-ca60-hamilton-v2";
  const hamilton = computeCapacityConstrainedHamilton(Array(9).fill(100), 60, 2);
  const allocations = cells.map(([responseForm, difficulty], index) => ({
    responseForm,
    difficulty,
    eligibleClusterCount: 100,
    baseMinimumAllocation: 2,
    finalAllocation: hamilton.finalAllocation[index],
  }));
  let sequence = 0;
  const selectedRows = allocations.flatMap((allocation) => Array.from({ length: allocation.finalAllocation }, () => {
    const clusterId = `cluster-${String(sequence += 1).padStart(3, "0")}`;
    const itemHash = sha256Hex(`item-${String(sequence).padStart(3, "0")}`);
    const stratum = `${allocation.responseForm}::${allocation.difficulty}`;
    return {
      clusterId,
      itemId: `item-${String(sequence).padStart(3, "0")}`,
      itemHash,
      stratum,
      selectionDigest: sha256Hex(`${registrationHash}|${samplingFrameHash}|${algorithmVersion}|${stratum}|${clusterId}|${itemHash}`),
      responseForm: allocation.responseForm,
      difficulty: allocation.difficulty,
      inclusionProbability: 0.1,
      analysisWeight: 1,
    };
  })).sort((left, right) => left.stratum.localeCompare(right.stratum, "en") || left.selectionDigest.localeCompare(right.selectionDigest, "en") || left.itemId.localeCompare(right.itemId, "en"));
  return withSelfHash({
    schemaVersion: "SampleManifestV1",
    designId: "MAIS-NATURAL-CA60-V2",
    registrationHash,
    designHash: registrationHash,
    samplingFrameHash,
    frameHash: samplingFrameHash,
    algorithmVersion,
    manifestFrozenAt: "2026-08-25T01:00:00.000Z",
    supersedesSampleManifestHash: null,
    selectionFormula: "SHA256(designHash|frameHash|algorithmVersion|stratum|clusterId|itemHash)",
    allocationMethod: "HAMILTON_LARGEST_REMAINDER_MINIMUM_TWO",
    totalEligibleClusterCount: 900,
    crossCellComponentCount: 2,
    clusterOwnershipRule: "LOWEST_MEMBER_SELECTION_DIGEST_THEN_ITEM_ID",
    stratumAllocations: allocations,
    hamiltonAudit: hamilton.rounds,
    clusterCount: 60,
    selectedRows,
    manifestRootTupleOrder: "SORTED_ITEM_ID_PLUS_ITEM_HASH_PLUS_CLUSTER_ID",
    primaryAnalysisWeight: 1,
    secondaryWeightMethod: "INVERSE_INCLUSION_PROBABILITY_DESCRIPTIVE_WITH_KISH_EFFECTIVE_N",
    resultBlind: true,
    rerollAfterAnyLabelOrResult: false,
    replacementAfterAnyLabelOrResult: false,
  }, "sampleManifestHash");
}

test("a valid synthetic 60-cluster Hamilton manifest passes semantic validation", () => {
  assert.deepEqual(validateSampleManifestV1(validManifest()), []);
});

test("cross-cell homology cluster receives one deterministic representative and stratum", () => {
  const common = { designHash: hash("b"), frameHash: hash("a"), algorithmVersion: "natural-ca60-hamilton-v2", clusterId: "cluster-cross-cell" };
  const members = [
    { itemId: "item-z", itemHash: hash("8"), responseForm: "fill-in", difficulty: "High" },
    { itemId: "item-a", itemHash: hash("8"), responseForm: "fill-in", difficulty: "High" },
    { itemId: "item-m", itemHash: hash("9"), responseForm: "short-answer", difficulty: "Low" },
  ];
  const forward = assignClusterToStratumV2({ ...common, members });
  const reverse = assignClusterToStratumV2({ ...common, members: [...members].reverse() });
  assert.deepEqual(forward, reverse);
  assert.equal(members.some((member) => member.itemId === forward.itemId), true);
  assert.equal(["fill-in::High", "short-answer::Low"].includes(forward.assignedStratum), true);
  const tied = assignClusterToStratumV2({ ...common, clusterId: "cluster-tie", members: members.slice(0, 2) });
  assert.equal(tied.itemId, "item-a");
});

function machineLabelCommon() {
  return {
    schemaVersion: "MachineReferenceLabelV1",
    designId: "MAIS-NATURAL-CA60-V2",
    registrationHash: hash("b"),
    sampleManifestHash: hash("c"),
    clusterId: "cluster-001",
    itemId: "item-001",
    referenceSourceType: "MACHINE_REFERENCE_PANEL",
    humanReferenceClaimAllowed: false,
    requestedProvider: "ALIBABA_CLOUD_MODEL_STUDIO",
    requestedModel: "qwen3.8-max",
    observedProvider: "ALIBABA_CLOUD_MODEL_STUDIO",
    observedModel: "qwen3.8-max",
    promptHash: hash("2"),
    schemaHash: hash("3"),
    inputReceiptHash: hash("4"),
    solveAttemptReceiptHash: hash("8"),
    labelAttemptReceiptHash: hash("9"),
    labeledAt: "2026-08-25T03:00:00.000Z",
  };
}

function validRawMachineLabel() {
  return withSelfHash({
    ...machineLabelCommon(),
    labelStage: "RAW_RATER",
    role: "A_LABEL",
    raterPseudonym: "rater-a-01",
    adjudicatorPseudonym: null,
    blindingAttestations: {
      deepSeekOutputNotSeen: true,
      otherRaterLabelNotSeen: true,
      adjudicatorInputsLimitedToItemAndRawLabels: null,
    },
    rawLabel: "NO_FINDING",
    rawTaxonomyCodes: ["NO_FINDING"],
    rawSeverity: "NONE",
    rawFindingFamilies: { NO_FINDING: null },
    rawUncertain: false,
    requiresAdjudication: false,
    finalLabel: null,
    finalTaxonomyCodes: [],
    finalSeverity: null,
    finalFindingFamilies: null,
    acceptedCodeSets: [],
    rawLabelHashes: [],
    disagreementStatus: null,
    adjudicationReasonCodes: [],
    disagreementAdjudicationReceiptHash: null,
  }, "labelHash");
}

function validFinalMachineLabel() {
  return withSelfHash({
    ...machineLabelCommon(),
    labelStage: "FINAL_ADJUDICATED",
    role: "ADJUDICATOR",
    raterPseudonym: null,
    adjudicatorPseudonym: "adjudicator-01",
    blindingAttestations: {
      deepSeekOutputNotSeen: true,
      otherRaterLabelNotSeen: null,
      adjudicatorInputsLimitedToItemAndRawLabels: true,
    },
    rawLabel: null,
    rawTaxonomyCodes: [],
    rawSeverity: null,
    rawFindingFamilies: null,
    rawUncertain: null,
    requiresAdjudication: false,
    finalLabel: "NO_FINDING",
    finalTaxonomyCodes: ["NO_FINDING"],
    finalSeverity: "NONE",
    finalFindingFamilies: { NO_FINDING: null },
    acceptedCodeSets: [],
    rawLabelHashes: [hash("5"), hash("6")],
    disagreementStatus: "AGREEMENT",
    adjudicationReasonCodes: [],
    disagreementAdjudicationReceiptHash: hash("7"),
  }, "labelHash");
}

test("raw and sealed final machine-reference panel labels pass provenance validation", () => {
  assert.deepEqual(validateMachineReferenceLabelV1(validRawMachineLabel()), []);
  assert.deepEqual(validateMachineReferenceLabelV1(validFinalMachineLabel()), []);
});

test("machine-reference provenance rejects missing identity, blinding, and raw-to-final lineage", async (context) => {
  const cases = {
    "missing raw rater identity": () => { const label = validRawMachineLabel(); label.raterPseudonym = null; return label; },
    "raw rater saw other label": () => { const label = validRawMachineLabel(); label.blindingAttestations.otherRaterLabelNotSeen = false; return label; },
    "DeepSeek output not blinded": () => { const label = validFinalMachineLabel(); label.blindingAttestations.deepSeekOutputNotSeen = false; return label; },
    "missing raw label lineage": () => { const label = validFinalMachineLabel(); label.rawLabelHashes = []; return label; },
    "missing adjudication receipt": () => { const label = validFinalMachineLabel(); label.disagreementAdjudicationReceiptHash = null; return label; },
    "human reference claim": () => { const label = validFinalMachineLabel(); label.humanReferenceClaimAllowed = true; return label; },
    "family-map extra key": () => { const label = validRawMachineLabel(); label.rawFindingFamilies.SCHEMA_GAP = null; return label; },
  };
  for (const [name, make] of Object.entries(cases)) {
    await context.test(name, () => {
      const label = make();
      withSelfHash(label, "labelHash");
      assert.notDeepEqual(validateMachineReferenceLabelV1(label), []);
    });
  }
});

test("ambiguous literal is preserved only raw, forces adjudication, and can resolve only to schema gap unresolved", () => {
  const raw = validRawMachineLabel();
  raw.rawLabel = "DEFECT";
  raw.rawTaxonomyCodes = ["FALSE_ACCEPT_CORRECT_RESPONSE"];
  raw.rawSeverity = "P0";
  raw.rawFindingFamilies = { FALSE_ACCEPT_CORRECT_RESPONSE: "RESPONSE_ACCEPTANCE" };
  raw.rawUncertain = true;
  raw.requiresAdjudication = true;
  withSelfHash(raw, "labelHash");
  assert.deepEqual(validateMachineReferenceLabelV1(raw), []);

  const final = validFinalMachineLabel();
  final.finalLabel = "UNRESOLVED_REFERENCE";
  final.finalTaxonomyCodes = ["SCHEMA_GAP"];
  final.finalSeverity = "UNRESOLVED";
  final.finalFindingFamilies = { SCHEMA_GAP: null };
  final.requiresAdjudication = true;
  final.disagreementStatus = "DISAGREEMENT";
  final.adjudicationReasonCodes = ["AMBIGUOUS_LITERAL_CODE_FALSE_ACCEPT_CORRECT_RESPONSE"];
  withSelfHash(final, "labelHash");
  assert.deepEqual(validateMachineReferenceLabelV1(final), []);

  final.finalTaxonomyCodes = ["FALSE_ACCEPT_CORRECT_RESPONSE"];
  final.finalSeverity = "P0";
  final.finalLabel = "DEFECT";
  final.finalFindingFamilies = { FALSE_ACCEPT_CORRECT_RESPONSE: "RESPONSE_ACCEPTANCE" };
  withSelfHash(final, "labelHash");
  assert.notDeepEqual(validateMachineReferenceLabelV1(final), []);
});

function validFinalReceipt() {
  const metric = (metricName, numerator, denominator, pointEstimate, status, decisionEligible, conservativeDecisionBound = pointEstimate) => ({
    metric: metricName,
    numerator,
    denominator,
    pointEstimate,
    oneSidedWilsonLcb95: denominator === 0 ? null : Math.max(0, Math.min(1, Math.min(conservativeDecisionBound ?? 0, pointEstimate ?? 0))),
    oneSidedWilsonUcb95: denominator === 0 ? null : Math.max(0, Math.min(1, Math.max(conservativeDecisionBound ?? 0, pointEstimate ?? 0))),
    twoSidedWilsonL95: denominator === 0 ? null : Math.max(0, Math.min(1, Math.min(conservativeDecisionBound ?? 0, pointEstimate ?? 0))),
    twoSidedWilsonU95: denominator === 0 ? null : Math.max(0, Math.min(1, Math.max(conservativeDecisionBound ?? 0, pointEstimate ?? 0))),
    clusterBootstrapP5: denominator === 0 ? null : Math.max(0, Math.min(1, Math.min(conservativeDecisionBound ?? 0, pointEstimate ?? 0))),
    clusterBootstrapP95: denominator === 0 ? null : Math.max(0, Math.min(1, Math.max(conservativeDecisionBound ?? 0, pointEstimate ?? 0))),
    worstCaseMissingLower: denominator === 0 ? null : Math.max(0, Math.min(1, Math.min(conservativeDecisionBound ?? 0, pointEstimate ?? 0))),
    worstCaseMissingUpper: denominator === 0 ? null : Math.max(0, Math.min(1, Math.max(conservativeDecisionBound ?? 0, pointEstimate ?? 0))),
    conservativeDecisionBound,
    status,
    decisionEligible,
  });
  return withSelfHash({
    schemaVersion: "FinalEvaluationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V2",
    registrationHash: hash("b"),
    frameRegistrationHash: hash("a"),
    sampleManifestHash: hash("c"),
    referenceSealHash: hash("0"),
    executionRegistrationHash: hash("9"),
    authorizationHashes: [hash("d"), hash("e")],
    attemptChainHeadHash: hash("f"),
    itemResultSetHash: hash("1"),
    expectedSampleSize: 60,
    completedItemCount: 60,
    failedItemCount: 0,
    missingItemCount: 0,
    resolvedPositiveN: 24,
    resolvedNegativeN: 36,
    unresolvedN: 0,
    invalidN: 0,
    confusionMatrix: { tp: 24, fp: 0, fn: 0, tn: 36 },
    metricResults: [
      metric("SURFACE_SENSITIVITY", 24, 24, 1, "UNDERPOWERED", true, 0.8986898185110513),
      metric("SPECIFICITY", 36, 36, 1, "UNDERPOWERED", true, 0.930119984840637),
      metric("FALSE_POSITIVE_RATE", 0, 36, 0, "UNDERPOWERED", true, 0.069880015159363),
      metric("FAMILY_RECALL", 8, 8, 1, "UNDERPOWERED", true, 0.75),
      metric("EXACT_CODE_AND_FAMILY_RECALL", 8, 8, 1, "UNDERPOWERED", true, 0.75),
      metric("FAMILY_PRECISION", 8, 8, 1, "UNDERPOWERED", false, 0.75),
      metric("EXACT_CODE_PRECISION", 8, 8, 1, "UNDERPOWERED", false, 0.75),
      metric("FALSE_FINDINGS_PER_100", 0, 60, 0, "UNDERPOWERED", false, 0),
      metric("P0_FALSE_NEGATIVE_COUNT", 0, 24, 0, "UNDERPOWERED", true, 0),
      metric("P1_RECALL", 5, 5, 1, "UNDERPOWERED", true, 0.65),
      metric("P2_MISSED_OR_UNRESOLVED_RATE", 0, 3, 0, "UNDERPOWERED", true, 0.55),
    ],
    findingMatchingMatrixHash: hash("2"),
    clusterStrataWeightSummaryHash: hash("3"),
    machinePanelAgreement: { rawAgreement: 0.9, cohensKappa: 0.8, gwetAc1: 0.85, familyJaccard: 0.9, codeJaccard: 0.85, severityAgreement: 0.9, adjudicationRate: 0.2, sameModelCorrelatedErrorRisk: true, humanValidityClaimAllowed: false },
    executionSummary: { attempts: 600, retries: 10, successfulCalls: 480, latencyMs: 100000, inputTokens: 1000000, outputTokens: 500000, reasoningTokens: 200000, totalTokens: 1700000, estimatedUsd: 20, invoiceIsAuthoritative: true },
    requestedObservedProviderModels: [
      { requestedProvider: "ALIBABA_CLOUD_MODEL_STUDIO", observedProvider: "ALIBABA_CLOUD_MODEL_STUDIO", requestedModel: "qwen3.8-max", observedModel: "qwen3.8-max", requestedEndpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", observedEndpointHostname: "dashscope.aliyuncs.com" },
      { requestedProvider: "DEEPSEEK_DIRECT", observedProvider: "DEEPSEEK_DIRECT", requestedModel: "deepseek-v4-pro", observedModel: "deepseek-v4-pro", requestedEndpoint: "https://api.deepseek.com/chat/completions", observedEndpointHostname: "api.deepseek.com" },
    ],
    deviations: [],
    completionStatus: "COMPLETE_60",
    executionIntegrityStatus: "INTACT",
    generalizationRequested: false,
    policyRevisionRequired: false,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    conclusion: "INCONCLUSIVE_MACHINE_REFERENCE",
    calculatedAt: "2026-08-25T02:00:00.000Z",
    previousReceiptHash: null,
  }, "receiptHash");
}

test("a consistent CA60 final evaluation receipt passes semantic validation", () => {
  assert.deepEqual(validateFinalEvaluationReceiptV1(validFinalReceipt()), []);
});

test("CA60 final evaluation rejects forbidden or inconsistent conclusions and integrity summaries", async (context) => {
  const cases = {
    "LIMITED conclusion": (receipt) => { receipt.conclusion = "LIMITED_MACHINE_REFERENCE"; },
    "integrity conclusion mismatch": (receipt) => { receipt.executionIntegrityStatus = "FAILED"; },
    "unresolved limit conclusion mismatch": (receipt) => { receipt.resolvedNegativeN = 32; receipt.unresolvedN = 4; receipt.confusionMatrix.tn = 32; },
    "completion conclusion mismatch": (receipt) => { receipt.completedItemCount = 59; receipt.failedItemCount = 1; receipt.resolvedNegativeN = 35; receipt.confusionMatrix.tn = 35; receipt.completionStatus = "INCOMPLETE"; },
    "threshold status mismatch": (receipt) => { receipt.metricResults.find((metric) => metric.metric === "SURFACE_SENSITIVITY").status = "MET"; },
    "P0 policy mismatch": (receipt) => { const metric = receipt.metricResults.find((entry) => entry.metric === "P0_FALSE_NEGATIVE_COUNT"); metric.numerator = 1; metric.pointEstimate = 1; },
    "generalization conclusion mismatch": (receipt) => { receipt.generalizationRequested = true; },
    "material deviation conclusion mismatch": (receipt) => { receipt.deviations.push({ code: "PROMPT_HASH_DRIFT", material: true, detailHash: hash("4") }); },
    "observed model mismatch with intact status": (receipt) => { receipt.requestedObservedProviderModels[1].observedModel = "wrong-model"; },
    "combined cost cap exceeded": (receipt) => { receipt.executionSummary.estimatedUsd = 51; },
  };
  for (const [name, mutate] of Object.entries(cases)) {
    await context.test(name, () => {
      const receipt = validFinalReceipt();
      mutate(receipt);
      withSelfHash(receipt, "receiptHash");
      assert.notDeepEqual(validateFinalEvaluationReceiptV1(receipt), []);
    });
  }
});

test("sample manifest semantic validation rejects reviewed drift cases", async (context) => {
  const cases = {
    "repeated cluster": (manifest) => { manifest.selectedRows[1].clusterId = manifest.selectedRows[0].clusterId; },
    "missing stratum": (manifest) => { manifest.stratumAllocations.pop(); },
    "allocation mismatch": (manifest) => { manifest.stratumAllocations[0].finalAllocation += 1; },
    "reroll flag": (manifest) => { manifest.rerollAfterAnyLabelOrResult = true; },
    "replacement flag": (manifest) => { manifest.replacementAfterAnyLabelOrResult = true; },
    "wrong row count": (manifest) => { manifest.selectedRows.pop(); manifest.clusterCount = 59; },
    "wrong manifest tuple root order": (manifest) => { manifest.manifestRootTupleOrder = "DRIFT"; },
    "wrong primary analysis weight": (manifest) => { manifest.selectedRows[0].analysisWeight = 2; },
  };
  for (const [name, mutate] of Object.entries(cases)) {
    await context.test(name, () => {
      const manifest = validManifest();
      mutate(manifest);
      withSelfHash(manifest, "sampleManifestHash");
      assert.notDeepEqual(validateSampleManifestV1(manifest), []);
    });
  }
});
