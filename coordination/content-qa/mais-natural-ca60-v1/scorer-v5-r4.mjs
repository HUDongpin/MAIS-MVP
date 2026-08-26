import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  BOOTSTRAP_GOLDEN_VECTORS,
  TAXONOMY,
  TAXONOMY_FAMILY,
  bootstrapBoundedIndex,
  calculateArtifactHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import {
  createMetricInputLedger,
  deriveCounterfactualLedger,
  deriveExecutionIntegrity,
  deriveObservedEvaluationLedger,
  deriveOverallDecision,
  recomputeMetricSet,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
  validateClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  validateRunnerRegistrationV5R4,
  validateSampleExecutionInventoryV2,
} from "./execution-evidence-v5-r4.mjs";
import { validateMachineReferenceSealV5R4 } from "./reference-label-seal-v5-r4.mjs";
import {
  validateDeepSeekC0ExecutionSetV5R4,
  validateDeepSeekExecutionRegistrationV5R4,
} from "./deepseek-execution-control-v5-r4.mjs";
import {
  validateExecutionLedgerEntriesV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import { validateAndRebuildProviderRequestArtifactV5R4 } from "./provider-request-v5-r4.mjs";
import { SCORER_METHOD_KERNEL_V5_R4 } from "./method-kernel-v5-r4.mjs";

const BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);
const STATUS_CODES = new Set(["NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP"]);

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function codePointCompare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

function validateRequestEvidence(input) {
  const { deepSeekLedgerEntries, requestArtifacts, deepSeekAuthorization, inventory } = input;
  const reservations = deepSeekLedgerEntries.filter((entry) => entry.entryType === "DISPATCH_RESERVED");
  requireCondition(Array.isArray(requestArtifacts) && requestArtifacts.length === reservations.length, "scoring requires one immutable request artifact for every DeepSeek reservation");
  const requestByHash = new Map(requestArtifacts.map((artifact) => [artifact?.selfHash, artifact]));
  requireCondition(requestByHash.size === requestArtifacts.length, "DeepSeek request artifacts are duplicated");
  const completionByReservation = new Map(deepSeekLedgerEntries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED").map((entry) => [entry.reservationHash, entry]));
  for (const reservation of reservations) {
    const artifact = requestByHash.get(reservation.requestArtifactHash);
    requireCondition(artifact, "DeepSeek reservation request artifact is absent");
    const ledgerIndex = deepSeekLedgerEntries.indexOf(reservation);
    const itemLeaf = input.itemLeaves.find((leaf) => leaf.itemId === input.sampleManifest.selectedRows.find((row) => row.itemHash === reservation.itemHash)?.itemId);
    const errors = validateAndRebuildProviderRequestArtifactV5R4({
      registration: input.registration,
      authorization: deepSeekAuthorization,
      inventory,
      sampleManifest: input.sampleManifest,
      itemLeaf,
      role: reservation.role,
      ledgerEntries: deepSeekLedgerEntries.slice(0, ledgerIndex),
      requestArtifact: artifact,
    });
    requireCondition(errors.length === 0, `DeepSeek request artifact cannot be reconstructed: ${errors.join("; ")}`);
    const completion = completionByReservation.get(reservation.selfHash);
    requireCondition(completion && completion.providerEventReceipt.requestBodyHash === artifact.wireRequestBodyHash
      && completion.providerEventReceipt.requestArtifactHash === artifact.selfHash
      && completion.providerEventReceipt.dispatchPermit.requestArtifactHash === artifact.selfHash
      && completion.providerEventReceipt.dispatchPermit.reservationHash === reservation.selfHash, "DeepSeek request bytes, permit, receipt, and reservation lineage is invalid");
  }
  return requestByHash;
}

function successfulOutput(entries, itemHash, role) {
  const matches = entries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED" && entry.attemptStatus === "SUCCEEDED"
    && entry.roleOutput?.itemHash === itemHash && entry.roleOutput?.role === role);
  requireCondition(matches.length <= 1, `multiple successful ${role} outputs exist for one item`);
  return matches[0]?.roleOutput ?? null;
}

function semanticFindings(findings, itemId) {
  requireCondition(Array.isArray(findings), "machine findings are absent");
  const ids = new Set();
  return findings.map((finding) => {
    requireCondition(finding && typeof finding.findingId === "string" && finding.findingId.length > 0 && !ids.has(finding.findingId)
      && typeof finding.evidenceLocator === "string" && finding.evidenceLocator.length > 0
      && Object.hasOwn(TAXONOMY, finding.code) && !STATUS_CODES.has(finding.code)
      && finding.family === TAXONOMY_FAMILY[finding.code] && finding.severity === TAXONOMY[finding.code], "machine finding taxonomy or stable identity is invalid");
    ids.add(finding.findingId);
    return Object.freeze({ itemId, findingId: finding.findingId, evidenceLocator: finding.evidenceLocator, code: finding.code, family: finding.family, severity: finding.severity });
  });
}

function reduceBPrime({ critiqueOutput, revisionOutput, revisionRequestArtifact, itemId }) {
  const reasons = [];
  const critique = critiqueOutput.parsedPayload;
  const revision = revisionOutput.parsedPayload;
  if (critique.valid !== true || revision.valid !== true || critique.surfaceDisposition === "UNASSESSABLE" || revision.surfaceDisposition === "UNASSESSABLE") reasons.push("B_PRIME_INVALID_OR_UNASSESSABLE");
  let critiqueFindings = [];
  let revisionFindings = [];
  try {
    critiqueFindings = semanticFindings(critique.findings, itemId);
    revisionFindings = semanticFindings(revision.findings, itemId);
  } catch {
    reasons.push("B_PRIME_TAXONOMY_OR_FINDING_SCHEMA_CONFLICT");
  }
  const projectedCritique = revisionRequestArtifact.providerInput?.bPrimeCritiqueArtifact;
  if (!projectedCritique || projectedCritique.itemPseudonym !== critiqueOutput.itemIdPseudonym
    || projectedCritique.role !== "B_PRIME_CRITIQUE"
    || canonicalJsonV5R3(projectedCritique.parsedPayload) !== canonicalJsonV5R3(critiqueOutput.parsedPayload)
    || revisionRequestArtifact.priorCompletionHashes.length !== 1
    || revision.critiqueArtifactHash !== projectedCritique.critiqueArtifactHash) reasons.push("B_PRIME_CRITIQUE_REVISION_ARTIFACT_MISMATCH");
  const critiqueIds = critiqueFindings.map(({ findingId }) => findingId);
  const resolutionIds = (revision.resolutions ?? []).map(({ findingId }) => findingId);
  if (new Set(critiqueIds).size !== critiqueIds.length || new Set(resolutionIds).size !== resolutionIds.length
    || canonicalJsonV5R3([...critiqueIds].sort()) !== canonicalJsonV5R3([...resolutionIds].sort())) reasons.push("B_PRIME_RESOLUTION_SET_MISMATCH");
  const dispositionById = new Map((revision.resolutions ?? []).map(({ findingId, disposition }) => [findingId, disposition]));
  const expectedFinalIds = critiqueIds.filter((id) => dispositionById.get(id) !== "WITHDRAWN").sort();
  if (canonicalJsonV5R3(expectedFinalIds) !== canonicalJsonV5R3(revisionFindings.map(({ findingId }) => findingId).sort())) reasons.push("B_PRIME_AUTHORITATIVE_FINDING_SET_MISMATCH");
  if (revision.surfaceDisposition === "NO_FINDING" && revisionFindings.length > 0) reasons.push("B_PRIME_SURFACE_FINDING_CONFLICT");
  if (revision.surfaceDisposition === "FINDING" && revisionFindings.length === 0) reasons.push("B_PRIME_SURFACE_FINDING_CONFLICT");
  return Object.freeze({ status: reasons.length === 0 ? "RESOLVED" : "UNRESOLVED", reasons: Object.freeze([...new Set(reasons)].sort()), findings: Object.freeze(revisionFindings) });
}

function reduceC0(outputs, itemId) {
  const reasons = [];
  const findingsById = new Map();
  const surface = new Set();
  for (const output of outputs) {
    const payload = output.parsedPayload;
    if (payload.valid !== true || payload.surfaceDisposition === "UNASSESSABLE") reasons.push("C0_INVALID_OR_UNASSESSABLE_ROLE");
    surface.add(payload.surfaceDisposition);
    let findings = [];
    try { findings = semanticFindings(payload.findings, itemId); } catch { reasons.push("C0_TAXONOMY_OR_FINDING_SCHEMA_CONFLICT"); }
    if (payload.surfaceDisposition === "NO_FINDING" && findings.length > 0) reasons.push("C0_SURFACE_FINDING_CONFLICT");
    if (payload.surfaceDisposition === "FINDING" && findings.length === 0) reasons.push("C0_SURFACE_FINDING_CONFLICT");
    for (const finding of findings) {
      const existing = findingsById.get(finding.findingId);
      if (existing && canonicalJsonV5R3(existing) !== canonicalJsonV5R3(finding)) reasons.push("C0_DUPLICATE_FINDING_ID_PROJECTION_CONFLICT");
      else if (!existing) findingsById.set(finding.findingId, finding);
    }
  }
  if (surface.has("FINDING") && surface.has("NO_FINDING")) reasons.push("C0_CROSS_ROLE_SURFACE_CONFLICT");
  return Object.freeze({
    status: reasons.length === 0 ? "RESOLVED" : "UNRESOLVED",
    reasons: Object.freeze([...new Set(reasons)].sort()),
    findings: Object.freeze([...findingsById.values()]),
  });
}

function mergeMachineFindings(streams) {
  const byId = new Map();
  const conflicts = [];
  for (const finding of streams.flat()) {
    const existing = byId.get(finding.findingId);
    if (existing && canonicalJsonV5R3(existing) !== canonicalJsonV5R3(finding)) conflicts.push("CROSS_REDUCER_FINDING_ID_PROJECTION_CONFLICT");
    else if (!existing) byId.set(finding.findingId, finding);
  }
  const codeOrder = Object.keys(TAXONOMY);
  const findings = [...byId.values()].sort((a, b) => codeOrder.indexOf(a.code) - codeOrder.indexOf(b.code) || codePointCompare(a.findingId, b.findingId));
  return Object.freeze({ findings: Object.freeze(findings), conflicts: Object.freeze([...new Set(conflicts)]) });
}

function referenceDisposition(label) {
  if (label.unresolved) return "UNRESOLVED_REFERENCE";
  if (label.label === "DEFECT") return "RESOLVED_POSITIVE";
  if (label.label === "NO_FINDING") return "RESOLVED_NEGATIVE";
  return "INVALID";
}

function referenceFindings(label, itemId) {
  return (label.findings ?? []).map((finding) => ({ itemId, ...structuredClone(finding) }));
}

function itemAttemptReceiptHashes(entries, itemHash) {
  return entries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED" && entry.providerEventReceipt.itemHash === itemHash)
    .map((entry) => entry.providerEventReceiptHash);
}

function buildItemResults(input, requestByHash) {
  const labelByHash = new Map(input.referenceSeal.finalLabels.map((label) => [label.itemHash, label]));
  const c0Selected = new Set(input.c0ExecutionSet.selectedItemHashes);
  const results = [];
  const kernelResults = [];
  const completedItemMarkers = [];
  for (const item of input.inventory.items) {
    const label = labelByHash.get(item.itemHash);
    requireCondition(label && label.itemIdPseudonym === item.itemIdPseudonym && label.clusterId === item.clusterId, "reference label differs from inventory identity");
    const requiredRoleOrder = [...BASE_ROLES, ...(c0Selected.has(item.itemHash) ? C0_ROLES : [])];
    const outputs = Object.fromEntries(requiredRoleOrder.map((role) => [role, successfulOutput(input.deepSeekLedgerEntries, item.itemHash, role)]));
    const complete = requiredRoleOrder.every((role) => outputs[role] !== null);
    const machineReasons = [];
    let machineFindings = [];
    if (complete) {
      const revisionRequest = requestByHash.get(outputs.B_PRIME_REVISION.requestArtifactHash);
      const bPrime = reduceBPrime({ critiqueOutput: outputs.B_PRIME_CRITIQUE, revisionOutput: outputs.B_PRIME_REVISION, revisionRequestArtifact: revisionRequest, itemId: item.itemIdPseudonym });
      let c0 = { status: "NOT_SELECTED", reasons: [], findings: [] };
      if (c0Selected.has(item.itemHash)) c0 = reduceC0(C0_ROLES.map((role) => outputs[role]), item.itemIdPseudonym);
      machineReasons.push(...bPrime.reasons, ...c0.reasons);
      const merged = mergeMachineFindings([bPrime.findings, ...(c0.status === "RESOLVED" ? [c0.findings] : [])]);
      machineReasons.push(...merged.conflicts);
      if (bPrime.status === "RESOLVED" && ["NOT_SELECTED", "RESOLVED"].includes(c0.status) && merged.conflicts.length === 0) machineFindings = [...merged.findings];
    } else machineReasons.push("REQUIRED_SUCCESSFUL_ROLE_RECEIPT_MISSING");
    const executionDisposition = complete ? "COMPLETE" : "MISSING_RECEIPT";
    const machineDisposition = !complete ? "MISSING_RECEIPT" : machineReasons.length > 0 ? "UNRESOLVED_MACHINE" : "RESOLVED";
    if (machineDisposition !== "RESOLVED") machineFindings = [];
    const outputHashes = requiredRoleOrder.filter((role) => outputs[role]).map((role) => outputs[role].selfHash);
    const attemptReceiptHashes = itemAttemptReceiptHashes(input.deepSeekLedgerEntries, item.itemHash);
    const marker = complete ? sealV5R3Artifact({
      schemaVersion: "CompletedItemCommitMarkerV2",
      designId: "MAIS-NATURAL-CA60-V5",
      runnerRegistrationHash: input.registration.selfHash,
      sampleManifestHash: input.sampleManifest.sampleManifestHash,
      referenceSealHash: input.referenceSeal.selfHash,
      executionRegistrationHash: input.executionRegistration.selfHash,
      itemHash: item.itemHash,
      itemIdPseudonym: item.itemIdPseudonym,
      clusterId: item.clusterId,
      requiredRoleOrder,
      successfulRoleOutputHashes: outputHashes,
      attemptReceiptHashes,
      executionDisposition: "COMPLETE",
      atomicWrite: true,
      fileMode: "0600",
    }) : null;
    if (marker) {
      assertClosedSelfHashedArtifactV5R4(marker, "CompletedItemCommitMarkerV2");
      completedItemMarkers.push(marker);
    }
    const referenceLeaves = referenceFindings(label, item.itemIdPseudonym);
    const result = sealV5R3Artifact({
      schemaVersion: "ItemEvaluationResultV2",
      designId: "MAIS-NATURAL-CA60-V5",
      runnerRegistrationHash: input.registration.selfHash,
      sampleExecutionInventoryHash: input.inventory.selfHash,
      referenceSealHash: input.referenceSeal.selfHash,
      executionRegistrationHash: input.executionRegistration.selfHash,
      deepSeekAuthorizationHash: input.deepSeekAuthorization.selfHash,
      c0ExecutionSetHash: input.c0ExecutionSet.selfHash,
      manifestOrdinal: item.manifestOrdinal,
      itemHash: item.itemHash,
      itemIdPseudonym: item.itemIdPseudonym,
      clusterId: item.clusterId,
      executionDisposition,
      machineDisposition,
      machineNonresolvedReasonCodes: [...new Set(machineReasons)].sort(),
      referenceDisposition: referenceDisposition(label),
      machineSurfaceFinding: machineDisposition === "RESOLVED" ? machineFindings.length > 0 : null,
      referenceFindings: referenceLeaves,
      machineFindings,
      finalReferenceLabelHash: label.selfHash,
      requiredRoleOrder,
      successfulRoleOutputHashes: outputHashes,
      attemptReceiptHashes,
      completedItemMarkerHash: marker?.selfHash ?? null,
    });
    assertClosedSelfHashedArtifactV5R4(result, "ItemEvaluationResultV2");
    results.push(result);
    const kernel = {
      schemaVersion: "ItemEvaluationResultV1",
      designId: "MAIS-NATURAL-CA60-V4",
      registrationHash: input.registration.selfHash,
      sampleManifestHash: input.registration.sampleManifestHash,
      referenceSealHash: input.referenceSeal.selfHash,
      executionRegistrationHash: input.executionRegistration.selfHash,
      itemId: item.itemIdPseudonym,
      itemHash: item.itemHash,
      clusterId: item.clusterId,
      executionDisposition,
      machineDisposition,
      machineNonresolvedReasonCodes: result.machineNonresolvedReasonCodes,
      referenceDisposition: result.referenceDisposition,
      machineSurfaceFinding: result.machineSurfaceFinding,
      referenceFindings: referenceLeaves,
      machineFindings,
      finalReferenceLabelHash: label.selfHash,
      attemptReceiptHashes,
      completedItemCommitMarkerHash: marker?.selfHash ?? null,
    };
    kernel.itemResultHash = calculateArtifactHash(kernel, "itemResultHash");
    kernelResults.push(kernel);
  }
  return Object.freeze({
    results: Object.freeze(results),
    kernelResults: Object.freeze(kernelResults),
    completedItemMarkers: Object.freeze(completedItemMarkers),
  });
}

function inventoryWeightedDescriptive(inventory, results) {
  const weights = inventory.items.map(({ secondaryAnalysisWeight }) => secondaryAnalysisWeight);
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const weightSquareSum = weights.reduce((sum, value) => sum + value * value, 0);
  const resolved = results.filter((result) => ["RESOLVED_POSITIVE", "RESOLVED_NEGATIVE"].includes(result.referenceDisposition));
  const resolvedWeight = resolved.reduce((sum, result) => sum + inventory.items[result.manifestOrdinal - 1].secondaryAnalysisWeight, 0);
  const positiveWeight = resolved.filter(({ referenceDisposition: disposition }) => disposition === "RESOLVED_POSITIVE")
    .reduce((sum, result) => sum + inventory.items[result.manifestOrdinal - 1].secondaryAnalysisWeight, 0);
  return Object.freeze({
    purpose: "SECONDARY_DESCRIPTIVE_ONLY",
    weightSum,
    weightSquareSum,
    kishEffectiveSampleSize: (weightSum * weightSum) / weightSquareSum,
    weightedResolvedReferencePositiveRate: resolvedWeight === 0 ? null : positiveWeight / resolvedWeight,
    decisionEligible: false,
  });
}

function verifyGoldenVectors() {
  return BOOTSTRAP_GOLDEN_VECTORS.every((vector) => bootstrapBoundedIndex(vector) === vector.expectedIndex);
}

export function scoreNaturalCaV5R4(input) {
  const upstreamErrors = [
    ...validateRunnerRegistrationV5R4(input.registration),
    ...validateSampleExecutionInventoryV2({ registration: input.registration, inventory: input.inventory }),
    ...validateMachineReferenceSealV5R4({ ...input.referenceSealContext, registration: input.registration, inventory: input.inventory, seal: input.referenceSeal }),
    ...validateDeepSeekExecutionRegistrationV5R4({ ...input.executionRegistrationContext, registration: input.registration, inventory: input.inventory, executionRegistration: input.executionRegistration }),
    ...validateDeepSeekC0ExecutionSetV5R4({
      registration: input.registration,
      executionRegistration: input.executionRegistration,
      deepSeekAuthorization: input.deepSeekAuthorization,
      inventory: input.inventory,
      sampleManifest: input.sampleManifest,
      itemLeaves: input.itemLeaves,
      ledgerEntries: input.deepSeekLedgerEntries,
      c0ExecutionSet: input.c0ExecutionSet,
    }),
    ...validateExecutionLedgerEntriesV5R4({ entries: input.deepSeekLedgerEntries, authorization: input.deepSeekAuthorization, inventory: input.inventory }),
  ];
  requireCondition(upstreamErrors.length === 0, upstreamErrors.join("; "));
  requireCondition(verifyGoldenVectors(), "frozen SHA-256 counter PRNG golden vectors failed");
  const requestByHash = validateRequestEvidence(input);
  const { results, kernelResults, completedItemMarkers } = buildItemResults(input, requestByHash);
  const observedLedger = deriveObservedEvaluationLedger(kernelResults);
  const counterfactualLedger = deriveCounterfactualLedger(observedLedger);
  const metricInputLedger = createMetricInputLedger(observedLedger);
  const metricResults = recomputeMetricSet(observedLedger, counterfactualLedger);
  const completions = input.deepSeekLedgerEntries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED");
  const providerTupleValid = completions.every((entry) => entry.providerEventReceipt.provider === "DEEPSEEK_DIRECT"
    && entry.providerEventReceipt.requestedModel === "deepseek-v4-pro"
    && (entry.attemptStatus !== "SUCCEEDED" || (entry.providerEventReceipt.observedModel === "deepseek-v4-pro"
      && entry.providerEventReceipt.observedEndpoint === "https://api.deepseek.com/chat/completions")));
  const executionIntegrity = deriveExecutionIntegrity({
    ...observedLedger.accounting,
    receiptChainValid: true,
    providerTupleValid,
    capsValid: true,
    terminalProviderFailure: false,
  });
  const allStarts = [
    ...input.referenceLedgerEntries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED").map((entry) => entry.providerEventReceipt.startedAt),
    ...completions.map((entry) => entry.providerEventReceipt.startedAt),
  ];
  const thresholdFrozenAfterLabelOrResult = allStarts.some((startedAt) => Date.parse(DESIGN.thresholdsFrozenAt) >= Date.parse(startedAt));
  const deviationFlags = Object.freeze({
    materialDeviation: false,
    postResultDesignDrift: false,
    labelLeakage: input.requestArtifacts.some((artifact) => artifact.referenceInputCount !== 0
      || /(?:qwen|reference(?:label|seal)|final(?:reference)?label|goldlabel)/iu.test(canonicalJsonV5R3(artifact.providerInput))),
    unauthorizedProviderCall: false,
    thresholdFrozenAfterLabelOrResult,
  });
  const overallDecision = deriveOverallDecision({
    integrity: executionIntegrity,
    metrics: metricResults,
    materialDeviation: deviationFlags.materialDeviation || deviationFlags.thresholdFrozenAfterLabelOrResult,
    postResultDesignDrift: deviationFlags.postResultDesignDrift,
    labelLeakage: deviationFlags.labelLeakage,
    unauthorizedProviderCall: deviationFlags.unauthorizedProviderCall,
  });
  const receipt = sealV5R3Artifact({
    schemaVersion: "NaturalCaAggregateScoreReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: input.registration.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    referenceSealHash: input.referenceSeal.selfHash,
    executionRegistrationHash: input.executionRegistration.selfHash,
    deepSeekAuthorizationHash: input.deepSeekAuthorization.selfHash,
    c0ExecutionSetHash: input.c0ExecutionSet.selfHash,
    itemResultSetHash: sha256V5R3(canonicalJsonV5R3(results.map(({ selfHash }) => selfHash))),
    itemResults: results,
    completedItemMarkerRootHash: sha256V5R3(canonicalJsonV5R3(completedItemMarkers.map(({ selfHash }) => selfHash))),
    completedItemMarkers,
    observedLedger,
    counterfactualLedger,
    metricInputLedger,
    metricResults,
    statisticalKernel: {
      inheritedMethodVersion: "MAIS-NATURAL-CA60-V4_FROZEN_STATISTICAL_KERNEL",
      metricDecisionMethodHash: DESIGN.analysis.frozenMethodComponentRoots.metricDecisionMethodHash,
      bootstrapGoldenVectorHash: SCORER_METHOD_KERNEL_V5_R4.bootstrapGoldenVectorHash,
      missingDataMethodHash: SCORER_METHOD_KERNEL_V5_R4.missingDataMethodHash,
      bootstrapReplicates: 10_000,
      bootstrapPrng: DESIGN.analysis.confidenceIntervals.bootstrapPrng,
      goldenVectorsVerified: true,
    },
    inventoryWeightedDescriptive: inventoryWeightedDescriptive(input.inventory, results),
    executionIntegrity,
    deviationFlags,
    overallDecision,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
    scoredAt: input.scoredAt,
  });
  assertClosedSelfHashedArtifactV5R4(receipt, "NaturalCaAggregateScoreReceiptV2");
  return receipt;
}

export function validateAggregateScoreReceiptV5R4(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R4(input?.scoreReceipt, "NaturalCaAggregateScoreReceiptV2")];
  for (const item of input?.scoreReceipt?.itemResults ?? []) errors.push(...validateClosedSelfHashedArtifactV5R4(item, "ItemEvaluationResultV2"));
  for (const marker of input?.scoreReceipt?.completedItemMarkers ?? []) errors.push(...validateClosedSelfHashedArtifactV5R4(marker, "CompletedItemCommitMarkerV2"));
  try {
    const rebuilt = scoreNaturalCaV5R4({ ...input, scoredAt: input.scoreReceipt?.scoredAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.scoreReceipt)) errors.push("aggregate score receipt differs from complete raw-evidence reconstruction");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const SCORER_V5_R4_CONSTANTS = Object.freeze({
  ...SCORER_METHOD_KERNEL_V5_R4,
});
