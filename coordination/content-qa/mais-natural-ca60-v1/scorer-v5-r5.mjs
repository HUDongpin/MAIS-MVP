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
  assertClosedSelfHashedArtifactV5R5,
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateActiveRunnerRegistrationV5R5,
  validateFreshRunnerReviewV5R5,
  validateManifestBoundInventoryV5R5,
} from "./execution-evidence-v5-r5.mjs";
import { validateMachineReferenceSealV5R5 } from "./reference-label-seal-v5-r5.mjs";
import {
  validateDeepSeekExecutionRegistrationV5R5,
  validateReferenceSealValidationReceiptV5R5,
} from "./deepseek-execution-registration-v5-r5.mjs";
import { validateDeepSeekC0ExecutionSetV5R5 } from "./c0-trigger-v5-r5.mjs";
import { validateCanaryGateReceiptV5R5 } from "./state-bound-dispatch-v5-r5.mjs";
import { validateExecutionLedgerEntriesV5R4 } from "./atomic-execution-ledger-v5-r4.mjs";
import { validateAndRebuildProviderRequestArtifactV5R4 } from "./provider-request-v5-r4.mjs";
import { SCORER_METHOD_KERNEL_V5_R4 } from "./method-kernel-v5-r4.mjs";

const BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);
const STATUS_CODES = new Set(["NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP"]);

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function codePointCompare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function callKey({ itemHash, role }) { return `${itemHash}:${role}`; }

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
      && finding.family === TAXONOMY_FAMILY[finding.code] && finding.severity === TAXONOMY[finding.code],
    "machine finding taxonomy or stable identity is invalid");
    ids.add(finding.findingId);
    return Object.freeze({ itemId, findingId: finding.findingId, evidenceLocator: finding.evidenceLocator,
      code: finding.code, family: finding.family, severity: finding.severity });
  });
}

function reduceBPrime({ critiqueOutput, revisionOutput, revisionRequestArtifact, itemId }) {
  const reasons = [];
  const critique = critiqueOutput.parsedPayload;
  const revision = revisionOutput.parsedPayload;
  if (critique.valid !== true || revision.valid !== true || critique.surfaceDisposition === "UNASSESSABLE"
    || revision.surfaceDisposition === "UNASSESSABLE") reasons.push("B_PRIME_INVALID_OR_UNASSESSABLE");
  let critiqueFindings = []; let revisionFindings = [];
  try {
    critiqueFindings = semanticFindings(critique.findings, itemId);
    revisionFindings = semanticFindings(revision.findings, itemId);
  } catch { reasons.push("B_PRIME_TAXONOMY_OR_FINDING_SCHEMA_CONFLICT"); }
  const projectedCritique = revisionRequestArtifact.providerInput?.bPrimeCritiqueArtifact;
  if (!projectedCritique || projectedCritique.itemPseudonym !== critiqueOutput.itemIdPseudonym
    || projectedCritique.role !== "B_PRIME_CRITIQUE"
    || canonicalJsonV5R3(projectedCritique.parsedPayload) !== canonicalJsonV5R3(critiqueOutput.parsedPayload)
    || revisionRequestArtifact.priorCompletionHashes.length !== 1
    || revision.critiqueArtifactHash !== projectedCritique.critiqueArtifactHash) {
    reasons.push("B_PRIME_CRITIQUE_REVISION_ARTIFACT_MISMATCH");
  }
  const critiqueIds = critiqueFindings.map(({ findingId }) => findingId);
  const resolutionIds = (revision.resolutions ?? []).map(({ findingId }) => findingId);
  if (new Set(critiqueIds).size !== critiqueIds.length || new Set(resolutionIds).size !== resolutionIds.length
    || canonicalJsonV5R3([...critiqueIds].sort()) !== canonicalJsonV5R3([...resolutionIds].sort())) {
    reasons.push("B_PRIME_RESOLUTION_SET_MISMATCH");
  }
  const dispositionById = new Map((revision.resolutions ?? []).map(({ findingId, disposition }) => [findingId, disposition]));
  const expectedFinalIds = critiqueIds.filter((id) => dispositionById.get(id) !== "WITHDRAWN").sort();
  if (canonicalJsonV5R3(expectedFinalIds) !== canonicalJsonV5R3(revisionFindings.map(({ findingId }) => findingId).sort())) {
    reasons.push("B_PRIME_AUTHORITATIVE_FINDING_SET_MISMATCH");
  }
  if (revision.surfaceDisposition === "NO_FINDING" && revisionFindings.length > 0) reasons.push("B_PRIME_SURFACE_FINDING_CONFLICT");
  if (revision.surfaceDisposition === "FINDING" && revisionFindings.length === 0) reasons.push("B_PRIME_SURFACE_FINDING_CONFLICT");
  return Object.freeze({ status: reasons.length === 0 ? "RESOLVED" : "UNRESOLVED",
    reasons: Object.freeze([...new Set(reasons)].sort()), findings: Object.freeze(revisionFindings) });
}

function reduceC0(outputs, itemId) {
  const reasons = []; const findingsById = new Map(); const surface = new Set();
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
  return Object.freeze({ status: reasons.length === 0 ? "RESOLVED" : "UNRESOLVED",
    reasons: Object.freeze([...new Set(reasons)].sort()), findings: Object.freeze([...findingsById.values()]) });
}

function mergeMachineFindings(streams) {
  const byId = new Map(); const conflicts = [];
  for (const finding of streams.flat()) {
    const existing = byId.get(finding.findingId);
    if (existing && canonicalJsonV5R3(existing) !== canonicalJsonV5R3(finding)) conflicts.push("CROSS_REDUCER_FINDING_ID_PROJECTION_CONFLICT");
    else if (!existing) byId.set(finding.findingId, finding);
  }
  const codeOrder = Object.keys(TAXONOMY);
  const findings = [...byId.values()].sort((a, b) => codeOrder.indexOf(a.code) - codeOrder.indexOf(b.code)
    || codePointCompare(a.findingId, b.findingId));
  return Object.freeze({ findings: Object.freeze(findings), conflicts: Object.freeze([...new Set(conflicts)]) });
}

function referenceDisposition(label) {
  if (label.unresolved) return "UNRESOLVED_REFERENCE";
  if (label.label === "DEFECT") return "RESOLVED_POSITIVE";
  if (label.label === "NO_FINDING") return "RESOLVED_NEGATIVE";
  return "INVALID";
}
function referenceFindings(label, itemId) { return (label.findings ?? []).map((finding) => ({ itemId, ...structuredClone(finding) })); }
function itemAttemptReceiptHashes(entries, itemHash) {
  return entries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED" && entry.providerEventReceipt.itemHash === itemHash)
    .map((entry) => entry.providerEventReceiptHash);
}

function validateRequestEvidence(input) {
  const reservations = input.deepSeekLedgerEntries.filter((entry) => entry.entryType === "DISPATCH_RESERVED");
  requireCondition(Array.isArray(input.requestArtifacts) && input.requestArtifacts.length === reservations.length,
    "scoring requires one immutable request artifact for every DeepSeek reservation");
  const requestByHash = new Map(input.requestArtifacts.map((artifact) => [artifact?.selfHash, artifact]));
  requireCondition(requestByHash.size === input.requestArtifacts.length, "DeepSeek request artifacts are duplicated");
  const completionByReservation = new Map(input.deepSeekLedgerEntries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED")
    .map((entry) => [entry.reservationHash, entry]));
  for (const reservation of reservations) {
    const requestArtifact = requestByHash.get(reservation.requestArtifactHash);
    requireCondition(requestArtifact, "DeepSeek reservation request artifact is absent");
    const ledgerIndex = input.deepSeekLedgerEntries.indexOf(reservation);
    const row = input.sampleManifest.selectedRows.find(({ itemHash }) => itemHash === reservation.itemHash);
    const itemLeaf = input.itemLeaves.find(({ itemId }) => itemId === row?.itemId);
    const errors = validateAndRebuildProviderRequestArtifactV5R4({ registration: input.registration,
      authorization: input.deepSeekAuthorization, inventory: input.inventory, sampleManifest: input.sampleManifest,
      itemLeaf, role: reservation.role, ledgerEntries: input.deepSeekLedgerEntries.slice(0, ledgerIndex), requestArtifact });
    requireCondition(errors.length === 0, `DeepSeek request artifact cannot be reconstructed: ${errors.join("; ")}`);
    const completion = completionByReservation.get(reservation.selfHash);
    if (completion) requireCondition(completion.providerEventReceipt.requestBodyHash === requestArtifact.wireRequestBodyHash
      && completion.providerEventReceipt.requestArtifactHash === requestArtifact.selfHash
      && completion.providerEventReceipt.dispatchPermit.requestArtifactHash === requestArtifact.selfHash
      && completion.providerEventReceipt.dispatchPermit.reservationHash === reservation.selfHash,
    "DeepSeek request bytes, permit, receipt, and reservation lineage is invalid");
  }
  return requestByHash;
}

function buildItemResults(input, requestByHash) {
  const labelByHash = new Map(input.referenceSeal.finalLabels.map((label) => [label.itemHash, label]));
  const c0Selected = new Set(input.c0ExecutionSet.selectedItemHashes);
  const results = []; const kernelResults = []; const completedItemMarkers = [];
  for (const item of input.inventory.items) {
    const label = labelByHash.get(item.itemHash);
    requireCondition(label && label.itemIdPseudonym === item.itemIdPseudonym && label.clusterId === item.clusterId,
      "reference label differs from inventory identity");
    const requiredRoleOrder = [...BASE_ROLES, ...(c0Selected.has(item.itemHash) ? C0_ROLES : [])];
    const outputs = Object.fromEntries(requiredRoleOrder.map((role) => [role, successfulOutput(input.deepSeekLedgerEntries, item.itemHash, role)]));
    const complete = requiredRoleOrder.every((role) => outputs[role] !== null);
    const machineReasons = []; let machineFindings = [];
    if (complete) {
      const revisionRequest = requestByHash.get(outputs.B_PRIME_REVISION.requestArtifactHash);
      const bPrime = reduceBPrime({ critiqueOutput: outputs.B_PRIME_CRITIQUE, revisionOutput: outputs.B_PRIME_REVISION,
        revisionRequestArtifact: revisionRequest, itemId: item.itemIdPseudonym });
      let c0 = { status: "NOT_SELECTED", reasons: [], findings: [] };
      if (c0Selected.has(item.itemHash)) c0 = reduceC0(C0_ROLES.map((role) => outputs[role]), item.itemIdPseudonym);
      machineReasons.push(...bPrime.reasons, ...c0.reasons);
      const merged = mergeMachineFindings([bPrime.findings, ...(c0.status === "RESOLVED" ? [c0.findings] : [])]);
      machineReasons.push(...merged.conflicts);
      if (bPrime.status === "RESOLVED" && ["NOT_SELECTED", "RESOLVED"].includes(c0.status)
        && merged.conflicts.length === 0) machineFindings = [...merged.findings];
    } else machineReasons.push("REQUIRED_SUCCESSFUL_ROLE_RECEIPT_MISSING");
    const executionDisposition = complete ? "COMPLETE" : "MISSING_RECEIPT";
    const machineDisposition = !complete ? "MISSING_RECEIPT" : machineReasons.length > 0 ? "UNRESOLVED_MACHINE" : "RESOLVED";
    if (machineDisposition !== "RESOLVED") machineFindings = [];
    const outputHashes = requiredRoleOrder.filter((role) => outputs[role]).map((role) => outputs[role].selfHash);
    const attemptReceiptHashes = itemAttemptReceiptHashes(input.deepSeekLedgerEntries, item.itemHash);
    const marker = complete ? sealV5R3Artifact({
      schemaVersion: "CompletedItemCommitMarkerV2", designId: "MAIS-NATURAL-CA60-V5",
      runnerRegistrationHash: input.activeRegistration.selfHash, sampleManifestHash: input.sampleManifest.sampleManifestHash,
      referenceSealHash: input.referenceSeal.selfHash, executionRegistrationHash: input.executionRegistration.selfHash,
      itemHash: item.itemHash, itemIdPseudonym: item.itemIdPseudonym, clusterId: item.clusterId, requiredRoleOrder,
      successfulRoleOutputHashes: outputHashes, attemptReceiptHashes, executionDisposition: "COMPLETE",
      atomicWrite: true, fileMode: "0600",
    }) : null;
    if (marker) { assertClosedSelfHashedArtifactV5R4(marker, "CompletedItemCommitMarkerV2"); completedItemMarkers.push(marker); }
    const referenceLeaves = referenceFindings(label, item.itemIdPseudonym);
    const result = sealV5R3Artifact({
      schemaVersion: "ItemEvaluationResultV2", designId: "MAIS-NATURAL-CA60-V5",
      runnerRegistrationHash: input.activeRegistration.selfHash, sampleExecutionInventoryHash: input.inventory.selfHash,
      referenceSealHash: input.referenceSeal.selfHash, executionRegistrationHash: input.executionRegistration.selfHash,
      deepSeekAuthorizationHash: input.deepSeekAuthorization.selfHash, c0ExecutionSetHash: input.c0ExecutionSet.selfHash,
      manifestOrdinal: item.manifestOrdinal, itemHash: item.itemHash, itemIdPseudonym: item.itemIdPseudonym,
      clusterId: item.clusterId, executionDisposition, machineDisposition,
      machineNonresolvedReasonCodes: [...new Set(machineReasons)].sort(), referenceDisposition: referenceDisposition(label),
      machineSurfaceFinding: machineDisposition === "RESOLVED" ? machineFindings.length > 0 : null,
      referenceFindings: referenceLeaves, machineFindings, finalReferenceLabelHash: label.selfHash, requiredRoleOrder,
      successfulRoleOutputHashes: outputHashes, attemptReceiptHashes, completedItemMarkerHash: marker?.selfHash ?? null,
    });
    assertClosedSelfHashedArtifactV5R4(result, "ItemEvaluationResultV2");
    results.push(result);
    const kernel = {
      schemaVersion: "ItemEvaluationResultV1", designId: "MAIS-NATURAL-CA60-V4",
      registrationHash: input.activeRegistration.selfHash, sampleManifestHash: input.registration.sampleManifestHash,
      referenceSealHash: input.referenceSeal.selfHash, executionRegistrationHash: input.executionRegistration.selfHash,
      itemId: item.itemIdPseudonym, itemHash: item.itemHash, clusterId: item.clusterId, executionDisposition,
      machineDisposition, machineNonresolvedReasonCodes: result.machineNonresolvedReasonCodes,
      referenceDisposition: result.referenceDisposition, machineSurfaceFinding: result.machineSurfaceFinding,
      referenceFindings: referenceLeaves, machineFindings, finalReferenceLabelHash: label.selfHash,
      attemptReceiptHashes, completedItemCommitMarkerHash: marker?.selfHash ?? null,
    };
    kernel.itemResultHash = calculateArtifactHash(kernel, "itemResultHash");
    kernelResults.push(kernel);
  }
  return Object.freeze({ results: Object.freeze(results), kernelResults: Object.freeze(kernelResults),
    completedItemMarkers: Object.freeze(completedItemMarkers) });
}

function inventoryWeightedDescriptive(inventory, results) {
  const weights = inventory.items.map(({ secondaryAnalysisWeight }) => secondaryAnalysisWeight);
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const weightSquareSum = weights.reduce((sum, value) => sum + value * value, 0);
  const resolved = results.filter(({ referenceDisposition: disposition }) => ["RESOLVED_POSITIVE", "RESOLVED_NEGATIVE"].includes(disposition));
  const resolvedWeight = resolved.reduce((sum, result) => sum + inventory.items[result.manifestOrdinal - 1].secondaryAnalysisWeight, 0);
  const positiveWeight = resolved.filter(({ referenceDisposition: disposition }) => disposition === "RESOLVED_POSITIVE")
    .reduce((sum, result) => sum + inventory.items[result.manifestOrdinal - 1].secondaryAnalysisWeight, 0);
  return Object.freeze({ purpose: "SECONDARY_DESCRIPTIVE_ONLY", weightSum, weightSquareSum,
    kishEffectiveSampleSize: (weightSum * weightSum) / weightSquareSum,
    weightedResolvedReferencePositiveRate: resolvedWeight === 0 ? null : positiveWeight / resolvedWeight,
    decisionEligible: false });
}

function expectedDeepSeekCallGraph(inventory, c0ExecutionSet) {
  const selected = new Set(c0ExecutionSet.selectedItemHashes); const [canary, ...rest] = inventory.items;
  const calls = BASE_ROLES.map((role) => ({ itemHash: canary.itemHash, role }));
  if (selected.has(canary.itemHash)) for (const role of C0_ROLES) calls.push({ itemHash: canary.itemHash, role });
  for (const item of rest) for (const role of BASE_ROLES) calls.push({ itemHash: item.itemHash, role });
  for (const item of rest) if (selected.has(item.itemHash)) for (const role of C0_ROLES) calls.push({ itemHash: item.itemHash, role });
  return calls;
}

function capErrors(entries, authorization) {
  const reservations = entries.filter(({ entryType }) => entryType === "DISPATCH_RESERVED");
  const completions = new Map(entries.filter(({ entryType }) => entryType === "DISPATCH_COMPLETED")
    .map((entry) => [entry.reservationHash, entry]));
  let inputTokens = 0; let outputTokens = 0; let totalTokens = 0; let usd = 0; let successes = 0;
  for (const reservation of reservations) {
    const completion = completions.get(reservation.selfHash); const receipt = completion?.providerEventReceipt;
    if (!completion || !(receipt.providerEventCount === 0 && receipt.httpRequestCount === 0)) {
      if (receipt?.usageSource === "PROVIDER_ENVELOPE") {
        inputTokens += receipt.inputTokens; outputTokens += receipt.outputTokens; totalTokens += receipt.totalTokens; usd += receipt.estimatedCostUsd;
      } else {
        inputTokens += reservation.reservedInputTokens; outputTokens += reservation.reservedOutputTokens;
        totalTokens += reservation.reservedTokens; usd += reservation.reservedUsd;
      }
    }
    if (completion?.attemptStatus === "SUCCEEDED") successes += 1;
  }
  const errors = [];
  if (reservations.length > authorization.maximumAttempts) errors.push("attempt cap exceeded");
  if (successes > authorization.maximumSuccessfulCalls) errors.push("successful-call cap exceeded");
  if (inputTokens > authorization.maximumInputTokens) errors.push("input-token cap exceeded");
  if (outputTokens > authorization.maximumOutputTokens) errors.push("output-token cap exceeded");
  if (totalTokens > authorization.maximumTokens) errors.push("total-token cap exceeded");
  if (Number(usd.toFixed(12)) > authorization.maximumEstimatedUsd) errors.push("USD cap exceeded");
  return errors;
}

function deriveIntegrity(input, expectedCallGraph) {
  const completions = input.deepSeekLedgerEntries.filter(({ entryType }) => entryType === "DISPATCH_COMPLETED");
  const reservations = input.deepSeekLedgerEntries.filter(({ entryType }) => entryType === "DISPATCH_RESERVED");
  const completedReservations = new Set(completions.map(({ reservationHash }) => reservationHash));
  const activeAttemptCount = reservations.filter(({ selfHash }) => !completedReservations.has(selfHash)).length;
  const auditByAttempt = new Map();
  const receiptChainErrors = [...validateExecutionLedgerEntriesV5R4({ entries: input.deepSeekLedgerEntries,
    authorization: input.deepSeekAuthorization, inventory: input.inventory })];
  for (const audit of input.dispatchAudits) {
    const schemaErrors = validateClosedSelfHashedArtifactV5R5(audit, "StateBoundDispatchAuditReceiptV1");
    receiptChainErrors.push(...schemaErrors.map((error) => `dispatch audit: ${error}`));
    if (auditByAttempt.has(audit.attemptId)) receiptChainErrors.push(`duplicate state-bound audit for ${audit.attemptId}`);
    auditByAttempt.set(audit.attemptId, audit);
  }
  const expectedIndex = new Map(expectedCallGraph.map((call, index) => [callKey(call), index]));
  let lastSuccessfulIndex = -1;
  const completedCalls = completions.map((completion) => {
    const receipt = completion.providerEventReceipt;
    const audit = auditByAttempt.get(receipt.attemptId);
    const stateBound = Boolean(audit && audit.activeRunnerRegistrationHash === input.activeRegistration.selfHash
      && audit.freshRunnerReviewHash === input.freshReview.selfHash
      && audit.providerAuthorizationHash === input.deepSeekAuthorization.selfHash
      && audit.sampleExecutionInventoryHash === input.inventory.selfHash
      && audit.itemHash === receipt.itemHash && audit.role === receipt.role);
    let canaryOrOrderViolation = false;
    if (completion.attemptStatus === "SUCCEEDED") {
      const index = expectedIndex.get(callKey(receipt));
      if (index === undefined || index < lastSuccessfulIndex) canaryOrOrderViolation = true;
      else lastSuccessfulIndex = index;
      if (receipt.itemHash !== input.inventory.canaryItemHash
        && Date.parse(receipt.startedAt) <= Date.parse(input.canaryGate.passedAt)) canaryOrOrderViolation = true;
    }
    return { itemHash: receipt.itemHash, role: receipt.role, attemptStatus: completion.attemptStatus,
      stateBound, terminalProviderFailure: false, canaryOrOrderViolation };
  });
  const providerTupleErrors = [];
  for (const completion of completions) {
    const receipt = completion.providerEventReceipt;
    if (receipt.provider !== "DEEPSEEK_DIRECT" || receipt.requestedModel !== "deepseek-v4-pro"
      || receipt.requestedEndpoint !== "https://api.deepseek.com/chat/completions") providerTupleErrors.push(`requested tuple drift at ${receipt.attemptId}`);
    if (completion.attemptStatus === "SUCCEEDED" && (receipt.observedModel !== "deepseek-v4-pro"
      || receipt.observedEndpoint !== "https://api.deepseek.com/chat/completions")) providerTupleErrors.push(`observed tuple drift at ${receipt.attemptId}`);
  }
  const allStarts = [
    ...input.referenceLedgerEntries.filter(({ entryType }) => entryType === "DISPATCH_COMPLETED").map(({ providerEventReceipt }) => providerEventReceipt.startedAt),
    ...completions.map(({ providerEventReceipt }) => providerEventReceipt.startedAt),
  ];
  const labelLeakage = input.requestArtifacts.some((requestArtifact) => requestArtifact.referenceInputCount !== 0
    || /(?:qwen|reference(?:label|seal)|final(?:reference)?label|goldlabel)/iu.test(canonicalJsonV5R3(requestArtifact.providerInput)));
  return deriveExecutionIntegrityEvidenceV5R5({
    activeRunnerRegistrationHash: input.activeRegistration.selfHash, expectedCallGraph, completedCalls, receiptChainErrors,
    capErrors: capErrors(input.deepSeekLedgerEntries, input.deepSeekAuthorization), providerTupleErrors, activeAttemptCount,
    postResultDesignDrift: allStarts.some((startedAt) => Date.parse(input.activeRegistration.registeredAt) >= Date.parse(startedAt)),
    labelLeakage,
    thresholdFrozenAfterLabelOrResult: allStarts.some((startedAt) => Date.parse(DESIGN.thresholdsFrozenAt) >= Date.parse(startedAt)),
    derivedAt: input.scoredAt,
  });
}

function validateUpstream(input) {
  const errors = [
    ...validateActiveRunnerRegistrationV5R5({ activeRegistration: input.activeRegistration, baseRegistration: input.registration }),
    ...validateFreshRunnerReviewV5R5({ activeRegistration: input.activeRegistration, freshReview: input.freshReview }),
    ...validateManifestBoundInventoryV5R5(input),
    ...validateMachineReferenceSealV5R5({ ...input.referenceSealContext, activeRegistration: input.activeRegistration,
      registration: input.registration, inventory: input.inventory, seal: input.referenceSeal }),
    ...validateReferenceSealValidationReceiptV5R5(input),
    ...validateDeepSeekExecutionRegistrationV5R5(input),
    ...validateDeepSeekC0ExecutionSetV5R5({ activeRunnerRegistrationHash: input.activeRegistration.selfHash,
      executionRegistrationHash: input.executionRegistration.selfHash, inventory: input.inventory,
      predicateInputsByItem: input.predicateInputsByItem, c0ExecutionSet: input.c0ExecutionSet }),
    ...validateCanaryGateReceiptV5R5(input),
  ];
  requireCondition(errors.length === 0, errors.join("; "));
}

function verifyGoldenVectors() { return BOOTSTRAP_GOLDEN_VECTORS.every((vector) => bootstrapBoundedIndex(vector) === vector.expectedIndex); }

export function scoreNaturalCaV5R5(input) {
  validateUpstream(input);
  requireCondition(verifyGoldenVectors(), "frozen SHA-256 counter PRNG golden vectors failed");
  const requestByHash = validateRequestEvidence(input);
  const { results, kernelResults, completedItemMarkers } = buildItemResults(input, requestByHash);
  const observedLedger = deriveObservedEvaluationLedger(kernelResults);
  const counterfactualLedger = deriveCounterfactualLedger(observedLedger);
  const metricInputLedger = createMetricInputLedger(observedLedger);
  const metricResults = recomputeMetricSet(observedLedger, counterfactualLedger);
  const expectedCallGraph = expectedDeepSeekCallGraph(input.inventory, input.c0ExecutionSet);
  const executionIntegrityEvidence = deriveIntegrity(input, expectedCallGraph);
  const executionIntegrity = deriveExecutionIntegrity({ ...observedLedger.accounting,
    receiptChainValid: executionIntegrityEvidence.receiptChainValid,
    providerTupleValid: executionIntegrityEvidence.providerTupleValid,
    capsValid: executionIntegrityEvidence.capsValid,
    terminalProviderFailure: executionIntegrityEvidence.terminalProviderFailure });
  const deviationFlags = Object.freeze({ materialDeviation: executionIntegrityEvidence.materialDeviation,
    postResultDesignDrift: executionIntegrityEvidence.postResultDesignDrift, labelLeakage: executionIntegrityEvidence.labelLeakage,
    unauthorizedProviderCall: executionIntegrityEvidence.unauthorizedProviderCall,
    thresholdFrozenAfterLabelOrResult: executionIntegrityEvidence.thresholdFrozenAfterLabelOrResult });
  const overallDecision = deriveOverallDecision({ integrity: executionIntegrity, metrics: metricResults,
    materialDeviation: deviationFlags.materialDeviation || deviationFlags.thresholdFrozenAfterLabelOrResult,
    postResultDesignDrift: deviationFlags.postResultDesignDrift, labelLeakage: deviationFlags.labelLeakage,
    unauthorizedProviderCall: deviationFlags.unauthorizedProviderCall });
  const baseAggregateScoreReceipt = sealV5R3Artifact({
    schemaVersion: "NaturalCaAggregateScoreReceiptV2", designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: input.activeRegistration.selfHash, sampleExecutionInventoryHash: input.inventory.selfHash,
    referenceSealHash: input.referenceSeal.selfHash, executionRegistrationHash: input.executionRegistration.selfHash,
    deepSeekAuthorizationHash: input.deepSeekAuthorization.selfHash, c0ExecutionSetHash: input.c0ExecutionSet.selfHash,
    itemResultSetHash: sha256V5R3(canonicalJsonV5R3(results.map(({ selfHash }) => selfHash))), itemResults: results,
    completedItemMarkerRootHash: sha256V5R3(canonicalJsonV5R3(completedItemMarkers.map(({ selfHash }) => selfHash))),
    completedItemMarkers, observedLedger, counterfactualLedger, metricInputLedger, metricResults,
    statisticalKernel: { inheritedMethodVersion: "MAIS-NATURAL-CA60-V4_FROZEN_STATISTICAL_KERNEL",
      metricDecisionMethodHash: DESIGN.analysis.frozenMethodComponentRoots.metricDecisionMethodHash,
      bootstrapGoldenVectorHash: SCORER_METHOD_KERNEL_V5_R4.bootstrapGoldenVectorHash,
      missingDataMethodHash: SCORER_METHOD_KERNEL_V5_R4.missingDataMethodHash, bootstrapReplicates: 10_000,
      bootstrapPrng: DESIGN.analysis.confidenceIntervals.bootstrapPrng, goldenVectorsVerified: true },
    inventoryWeightedDescriptive: inventoryWeightedDescriptive(input.inventory, results), executionIntegrity,
    deviationFlags, overallDecision, decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    passClaimAllowed: false, limitedGeneralizationEvidenceAllowed: false, scoredAt: input.scoredAt,
  });
  assertClosedSelfHashedArtifactV5R4(baseAggregateScoreReceipt, "NaturalCaAggregateScoreReceiptV2");
  const scoreReceipt = buildAggregateScoreEnvelopeV5R5({ activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    baseAggregateScoreReceipt, executionIntegrityEvidence, scoredAt: input.scoredAt });
  return Object.freeze({ scoreReceipt, baseAggregateScoreReceipt, executionIntegrityEvidence,
    itemResults: Object.freeze(results), completedItemMarkers: Object.freeze(completedItemMarkers) });
}

export function validateAggregateScoreReceiptV5R5(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(input?.scoreReceipt, "NaturalCaAggregateScoreReceiptV3")];
  try {
    const rebuilt = scoreNaturalCaV5R5({ ...input, scoredAt: input.scoreReceipt?.scoredAt });
    if (canonicalJsonV5R3(rebuilt.scoreReceipt) !== canonicalJsonV5R3(input.scoreReceipt)) {
      errors.push("R5 aggregate score receipt differs from complete authoritative-evidence reconstruction");
    }
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return Object.freeze([...new Set(errors)]);
}

export function deriveExecutionIntegrityEvidenceV5R5(input) {
  requireCondition(Array.isArray(input.expectedCallGraph) && Array.isArray(input.completedCalls),
    "execution integrity requires expected and completed call graphs");
  const expectedKeys = input.expectedCallGraph.map(callKey);
  const successful = input.completedCalls.filter(({ attemptStatus }) => attemptStatus === "SUCCEEDED");
  const successfulKeys = successful.map(callKey);
  const extraSuccessfulCalls = successful.filter((call) => !expectedKeys.includes(callKey(call)));
  const missingSuccessfulCalls = input.expectedCallGraph.filter((call) => !successfulKeys.includes(callKey(call)));
  const duplicateSuccessfulCallKeys = [...new Set(successfulKeys.filter((value, index) => successfulKeys.indexOf(value) !== index))];
  const nonStateBoundCalls = input.completedCalls.filter(({ stateBound }) => stateBound !== true);
  const receiptChainValid = (input.receiptChainErrors ?? []).length === 0;
  const capsValid = (input.capErrors ?? []).length === 0;
  const providerTupleValid = (input.providerTupleErrors ?? []).length === 0;
  const terminalProviderFailure = (input.activeAttemptCount ?? 0) > 0 || missingSuccessfulCalls.length > 0
    || input.completedCalls.some(({ terminalProviderFailure: terminal }) => terminal === true);
  const unauthorizedProviderCall = nonStateBoundCalls.length > 0 || extraSuccessfulCalls.length > 0;
  const materialDeviation = unauthorizedProviderCall || duplicateSuccessfulCallKeys.length > 0
    || input.completedCalls.some(({ canaryOrOrderViolation }) => canaryOrOrderViolation === true);
  const postResultDesignDrift = input.postResultDesignDrift === true;
  const labelLeakage = input.labelLeakage === true;
  const thresholdFrozenAfterLabelOrResult = input.thresholdFrozenAfterLabelOrResult === true;
  let overallIntegrityDisposition = "INTACT_PENDING_FROZEN_METRIC_DECISION";
  if (materialDeviation || postResultDesignDrift || labelLeakage || thresholdFrozenAfterLabelOrResult || unauthorizedProviderCall) {
    overallIntegrityDisposition = "INVALID_FOR_GENERALIZATION";
  } else if (!receiptChainValid || !capsValid || !providerTupleValid || terminalProviderFailure) {
    overallIntegrityDisposition = "EXECUTION_INTEGRITY_FAILED";
  }
  const evidence = sealV5R3Artifact({
    schemaVersion: "ExecutionIntegrityEvidenceV1", designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    expectedCallGraphHash: sha256V5R3(canonicalJsonV5R3(input.expectedCallGraph)),
    completedCallGraphHash: sha256V5R3(canonicalJsonV5R3(input.completedCalls)),
    expectedSuccessfulCallCount: input.expectedCallGraph.length, observedSuccessfulCallCount: successful.length,
    extraSuccessfulCalls, missingSuccessfulCalls, duplicateSuccessfulCallKeys,
    nonStateBoundCallCount: nonStateBoundCalls.length, activeAttemptCount: input.activeAttemptCount ?? 0,
    receiptChainValid, providerTupleValid, capsValid, terminalProviderFailure, materialDeviation,
    postResultDesignDrift, labelLeakage, unauthorizedProviderCall, thresholdFrozenAfterLabelOrResult,
    receiptChainErrors: [...new Set(input.receiptChainErrors ?? [])], providerTupleErrors: [...new Set(input.providerTupleErrors ?? [])],
    capErrors: [...new Set(input.capErrors ?? [])], overallIntegrityDisposition, derivedAt: input.derivedAt,
  });
  assertClosedSelfHashedArtifactV5R5(evidence, "ExecutionIntegrityEvidenceV1");
  return evidence;
}

export function buildAggregateScoreEnvelopeV5R5({ activeRunnerRegistrationHash, baseAggregateScoreReceipt,
  executionIntegrityEvidence, scoredAt }) {
  requireCondition(validateClosedSelfHashedArtifactV5R4(baseAggregateScoreReceipt, "NaturalCaAggregateScoreReceiptV2").length === 0
    && validateClosedSelfHashedArtifactV5R5(executionIntegrityEvidence, "ExecutionIntegrityEvidenceV1").length === 0,
  "R5 aggregate envelope inputs fail their closed machine-readable schemas");
  let overallDecision = baseAggregateScoreReceipt.overallDecision;
  if (["INVALID_FOR_GENERALIZATION", "EXECUTION_INTEGRITY_FAILED"].includes(executionIntegrityEvidence.overallIntegrityDisposition)) {
    overallDecision = executionIntegrityEvidence.overallIntegrityDisposition;
  }
  const receipt = sealV5R3Artifact({
    schemaVersion: "NaturalCaAggregateScoreReceiptV3", designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash, baseAggregateScoreReceiptHash: baseAggregateScoreReceipt.selfHash,
    baseAggregateScoreReceipt: structuredClone(baseAggregateScoreReceipt),
    executionIntegrityEvidenceHash: executionIntegrityEvidence.selfHash,
    executionIntegrityEvidence: structuredClone(executionIntegrityEvidence),
    metricResultsHash: sha256V5R3(canonicalJsonV5R3(baseAggregateScoreReceipt.metricResults)), overallDecision,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    passClaimAllowed: false, limitedGeneralizationEvidenceAllowed: false, scoredAt,
  });
  assertClosedSelfHashedArtifactV5R5(receipt, "NaturalCaAggregateScoreReceiptV3");
  return receipt;
}

export const SCORER_V5_R5_CONSTANTS = Object.freeze({
  ...SCORER_METHOD_KERNEL_V5_R4,
  integritySource: "AUTHORITATIVE_R5_CALL_GRAPH_LEDGER_REQUEST_AND_STATE_AUDIT_RECONSTRUCTION",
});
