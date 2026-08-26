import {
  TAXONOMY,
  TAXONOMY_FAMILY,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  roleOutputByEvidenceV5R10,
} from "./attempt-graph-v5-r10.mjs";
import {
  validateAttemptGraphReconstructionReceiptV5R10,
} from "./attempt-graph-v5-r10.mjs";
import {
  buildFrozenStatisticalBundleV5R10,
  buildTerminalExecutionDecisionReceiptV5R10,
  verifyFrozenStatisticalBundleV5R10,
} from "./statistical-kernel-v5-r10.mjs";
import {
  reconstructDecisionEvidenceV5R10,
  statisticalDecisionFlagsFromEvidenceV5R10,
} from "./decision-evidence-v5-r10.mjs";
import {
  assertClosedSelfHashedArtifactV5R10,
  validateClosedSelfHashedArtifactV5R10,
} from "./schema-contract-v5-r10.mjs";

const BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3",
  "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);
const STATUS_CODES = new Set(["NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP"]);
const CODE_ORDER = Object.freeze(Object.keys(TAXONOMY));

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function key(itemHash, role) {
  return `${itemHash}:${role}`;
}

function findingProjection(findings, itemId, label) {
  requireCondition(Array.isArray(findings), `${label} finding array is absent`);
  const ids = new Set();
  return findings.map((finding) => {
    requireCondition(finding && typeof finding.findingId === "string" && finding.findingId.length > 0
      && !ids.has(finding.findingId)
      && typeof finding.evidenceLocator === "string" && finding.evidenceLocator.length > 0
      && Object.hasOwn(TAXONOMY, finding.code) && !STATUS_CODES.has(finding.code)
      && finding.family === TAXONOMY_FAMILY[finding.code]
      && finding.severity === TAXONOMY[finding.code],
    `${label} finding identity, evidence, code, family, or severity is invalid`);
    ids.add(finding.findingId);
    return Object.freeze({ itemId, findingId: finding.findingId,
      evidenceLocator: finding.evidenceLocator, code: finding.code,
      family: finding.family, severity: finding.severity });
  }).sort((left, right) => CODE_ORDER.indexOf(left.code) - CODE_ORDER.indexOf(right.code)
    || codePointCompare(left.findingId, right.findingId));
}

function reduceBPrime({ critiqueOutput, revisionOutput, revisionRequestArtifact, itemId }) {
  const reasons = [];
  const critique = critiqueOutput?.parsedPayload;
  const revision = revisionOutput?.parsedPayload;
  if (critique?.valid !== true || revision?.valid !== true
    || critique.surfaceDisposition === "UNASSESSABLE"
    || revision.surfaceDisposition === "UNASSESSABLE") reasons.push("B_PRIME_INVALID_OR_UNASSESSABLE");
  let critiqueFindings = [];
  let revisionFindings = [];
  try {
    critiqueFindings = findingProjection(critique?.findings, itemId, "B-prime critique");
    revisionFindings = findingProjection(revision?.findings, itemId, "B-prime revision");
  } catch {
    reasons.push("B_PRIME_TAXONOMY_OR_FINDING_SCHEMA_CONFLICT");
  }
  const projected = revisionRequestArtifact?.providerInput?.bPrimeCritiqueArtifact;
  if (!projected || projected.itemPseudonym !== critiqueOutput?.itemIdPseudonym
    || projected.role !== "B_PRIME_CRITIQUE"
    || canonicalJsonV5R3(projected.parsedPayload) !== canonicalJsonV5R3(critiqueOutput?.parsedPayload)
    || revisionRequestArtifact?.priorCompletionHashes?.length !== 1
    || revision?.critiqueArtifactHash !== projected.critiqueArtifactHash) {
    reasons.push("B_PRIME_CRITIQUE_REVISION_ARTIFACT_MISMATCH");
  }
  const critiqueIds = critiqueFindings.map(({ findingId }) => findingId);
  const resolutions = Array.isArray(revision?.resolutions) ? revision.resolutions : [];
  const resolutionIds = resolutions.map(({ findingId }) => findingId);
  if (new Set(resolutionIds).size !== resolutionIds.length
    || canonicalJsonV5R3([...critiqueIds].sort()) !== canonicalJsonV5R3([...resolutionIds].sort())) {
    reasons.push("B_PRIME_RESOLUTION_SET_MISMATCH");
  }
  const disposition = new Map(resolutions.map(({ findingId, disposition: value }) => [findingId, value]));
  const expectedFinal = critiqueIds.filter((id) => disposition.get(id) !== "WITHDRAWN").sort();
  if (canonicalJsonV5R3(expectedFinal)
    !== canonicalJsonV5R3(revisionFindings.map(({ findingId }) => findingId).sort())) {
    reasons.push("B_PRIME_AUTHORITATIVE_FINDING_SET_MISMATCH");
  }
  if ((revision?.surfaceDisposition === "NO_FINDING") !== (revisionFindings.length === 0)) {
    reasons.push("B_PRIME_SURFACE_FINDING_CONFLICT");
  }
  return Object.freeze({ status: reasons.length === 0 ? "RESOLVED" : "UNRESOLVED",
    reasons: Object.freeze([...new Set(reasons)].sort()), findings: Object.freeze(revisionFindings) });
}

function reduceC0(outputs, itemId) {
  const reasons = [];
  const findingsById = new Map();
  for (const output of outputs) {
    const payload = output?.parsedPayload;
    if (payload?.valid !== true || payload.surfaceDisposition === "UNASSESSABLE") {
      reasons.push("C0_INVALID_OR_UNASSESSABLE_ROLE");
    }
    let findings = [];
    try { findings = findingProjection(payload?.findings, itemId, output?.role ?? "C0 role"); }
    catch { reasons.push("C0_TAXONOMY_OR_FINDING_SCHEMA_CONFLICT"); }
    if ((payload?.surfaceDisposition === "NO_FINDING") !== (findings.length === 0)) {
      reasons.push("C0_SURFACE_FINDING_CONFLICT");
    }
    for (const finding of findings) {
      const prior = findingsById.get(finding.findingId);
      if (prior && canonicalJsonV5R3(prior) !== canonicalJsonV5R3(finding)) {
        reasons.push("C0_DUPLICATE_FINDING_ID_PROJECTION_CONFLICT");
      } else if (!prior) findingsById.set(finding.findingId, finding);
    }
  }
  return Object.freeze({ status: reasons.length === 0 ? "RESOLVED" : "UNRESOLVED",
    reasons: Object.freeze([...new Set(reasons)].sort()),
    findings: Object.freeze([...findingsById.values()].sort((left, right) =>
      CODE_ORDER.indexOf(left.code) - CODE_ORDER.indexOf(right.code)
      || codePointCompare(left.findingId, right.findingId))) });
}

function mergeFindings(streams) {
  const reasons = [];
  const byId = new Map();
  for (const finding of streams.flat()) {
    const prior = byId.get(finding.findingId);
    if (prior && canonicalJsonV5R3(prior) !== canonicalJsonV5R3(finding)) {
      reasons.push("CROSS_REDUCER_FINDING_ID_PROJECTION_CONFLICT");
    } else if (!prior) byId.set(finding.findingId, finding);
  }
  return Object.freeze({ reasons: Object.freeze([...new Set(reasons)].sort()),
    findings: Object.freeze([...byId.values()].sort((left, right) =>
      CODE_ORDER.indexOf(left.code) - CODE_ORDER.indexOf(right.code)
      || codePointCompare(left.findingId, right.findingId))) });
}

function referenceDisposition(label) {
  if (label.unresolved === true) return "UNRESOLVED_REFERENCE";
  if (label.label === "DEFECT") return "RESOLVED_POSITIVE";
  if (label.label === "NO_FINDING") return "RESOLVED_NEGATIVE";
  return "INVALID";
}

function firstAttemptAt(entries, fallback) {
  const values = (entries ?? []).filter(({ entryType }) => entryType === "DISPATCH_COMPLETED")
    .map(({ providerEventReceipt }) => providerEventReceipt?.startedAt)
    .filter((value) => Number.isFinite(Date.parse(value))).sort();
  return values[0] ?? fallback;
}

function buildItemResults(input, outputs, roleEvidence) {
  const outputByKey = new Map(outputs.map((output) => [key(output.itemHash, output.role), output]));
  requireCondition(outputByKey.size === outputs.length,
    "R10 successful role-output stream contains duplicate item-role successes");
  const labelByItem = new Map(input.compatibilityReferenceSeal.finalLabels
    .map((label) => [label.itemHash, label]));
  requireCondition(labelByItem.size === 60 && input.inventory.items.length === 60,
    "R10 scoring requires 60 unique reference labels and inventory items");
  const selected = new Set(input.c0ExecutionSet.selectedItemHashes);
  const requestByHash = new Map((input.deepSeekAttemptGraphContext.requestArtifacts ?? [])
    .map((request) => [request.selfHash, request]));
  const attemptEvidenceByItem = new Map();
  for (const evidence of roleEvidence) {
    const rows = attemptEvidenceByItem.get(evidence.itemHash) ?? [];
    rows.push(evidence);
    attemptEvidenceByItem.set(evidence.itemHash, rows);
  }
  const itemResults = [];
  const completedItemMarkers = [];
  for (const item of input.inventory.items) {
    const label = labelByItem.get(item.itemHash);
    requireCondition(validateSelfHashV5R3(label) && label.itemIdPseudonym === item.itemIdPseudonym
      && label.clusterId === item.clusterId,
    `R10 reference label differs from inventory identity for ${item.itemHash}`);
    const requiredRoleOrder = [...BASE_ROLES, ...(selected.has(item.itemHash) ? C0_ROLES : [])];
    const itemOutputs = Object.fromEntries(requiredRoleOrder.map((role) =>
      [role, outputByKey.get(key(item.itemHash, role)) ?? null]));
    const complete = requiredRoleOrder.every((role) => itemOutputs[role]);
    const reasons = [];
    let machineFindings = [];
    if (complete) {
      const revisionEvidence = roleEvidence.find((evidence) => evidence.itemHash === item.itemHash
        && evidence.role === "B_PRIME_REVISION" && evidence.attemptStatus === "SUCCEEDED");
      const revisionRequest = requestByHash.get(revisionEvidence?.requestArtifactHash);
      const bPrime = reduceBPrime({ critiqueOutput: itemOutputs.B_PRIME_CRITIQUE,
        revisionOutput: itemOutputs.B_PRIME_REVISION, revisionRequestArtifact: revisionRequest,
        itemId: item.itemIdPseudonym });
      reasons.push(...bPrime.reasons);
      let c0 = { status: "NOT_SELECTED", reasons: [], findings: [] };
      if (selected.has(item.itemHash)) {
        c0 = reduceC0(C0_ROLES.map((role) => itemOutputs[role]), item.itemIdPseudonym);
        reasons.push(...c0.reasons);
      }
      const merged = mergeFindings([bPrime.findings,
        ...(c0.status === "RESOLVED" ? [c0.findings] : [])]);
      reasons.push(...merged.reasons);
      if (bPrime.status === "RESOLVED" && ["NOT_SELECTED", "RESOLVED"].includes(c0.status)
        && merged.reasons.length === 0) machineFindings = [...merged.findings];
    } else reasons.push("REQUIRED_SUCCESSFUL_ROLE_RECEIPT_MISSING");
    const executionDisposition = complete ? "COMPLETE" : "MISSING_RECEIPT";
    const machineDisposition = !complete ? "MISSING_RECEIPT"
      : reasons.length > 0 ? "UNRESOLVED_MACHINE" : "RESOLVED";
    if (machineDisposition !== "RESOLVED") machineFindings = [];
    const itemEvidence = attemptEvidenceByItem.get(item.itemHash) ?? [];
    const successfulRoleOutputHashes = requiredRoleOrder.filter((role) => itemOutputs[role])
      .map((role) => itemOutputs[role].selfHash);
    const attemptReceiptHashes = itemEvidence.map(({ resolvedAttemptReceiptHash }) =>
      resolvedAttemptReceiptHash);
    const marker = complete ? assertClosedSelfHashedArtifactV5R10(sealV5R3Artifact({
      schemaVersion: "CompletedItemCommitMarkerV2",
      designId: "MAIS-NATURAL-CA60-V5",
      runnerRegistrationHash: input.activeRegistration.selfHash,
      sampleManifestHash: input.activeRegistration.sampleManifestHash,
      referenceSealHash: input.referenceSeal.selfHash,
      executionRegistrationHash: input.executionRegistration.selfHash,
      itemHash: item.itemHash,
      itemIdPseudonym: item.itemIdPseudonym,
      clusterId: item.clusterId,
      requiredRoleOrder,
      successfulRoleOutputHashes,
      attemptReceiptHashes,
      executionDisposition: "COMPLETE",
      atomicWrite: true,
      fileMode: "0600",
    }), "CompletedItemCommitMarkerV2") : null;
    if (marker) completedItemMarkers.push(marker);
    const referenceFindings = findingProjection(label.findings ?? [], item.itemIdPseudonym,
      `reference:${item.itemHash}`);
    const result = assertClosedSelfHashedArtifactV5R10(sealV5R3Artifact({
      schemaVersion: "ItemEvaluationResultV2",
      designId: "MAIS-NATURAL-CA60-V5",
      runnerRegistrationHash: input.activeRegistration.selfHash,
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
      machineNonresolvedReasonCodes: [...new Set(reasons)].sort(),
      referenceDisposition: referenceDisposition(label),
      machineSurfaceFinding: machineDisposition === "RESOLVED" ? machineFindings.length > 0 : null,
      referenceFindings,
      machineFindings,
      finalReferenceLabelHash: label.selfHash,
      requiredRoleOrder,
      successfulRoleOutputHashes,
      attemptReceiptHashes,
      completedItemMarkerHash: marker?.selfHash ?? null,
    }), "ItemEvaluationResultV2");
    itemResults.push(result);
  }
  return Object.freeze({ itemResults: Object.freeze(itemResults),
    completedItemMarkers: Object.freeze(completedItemMarkers) });
}

function validateSemanticReceipt(input, roleEvidence) {
  const receipt = input.semanticDispatchVerificationReceipt;
  requireCondition(validateSelfHashV5R3(receipt)
    && receipt.activeRunnerRegistrationHash === input.activeRegistration.selfHash
    && receipt.authorizationHash === input.deepSeekAuthorization.selfHash
    && receipt.executionRegistrationHash === input.executionRegistration.selfHash
    && receipt.sampleExecutionInventoryHash === input.inventory.selfHash
    && receipt.c0ExecutionSetHash === input.c0ExecutionSet.selfHash
    && canonicalJsonV5R3(receipt.roleAttemptEvidenceHashes)
      === canonicalJsonV5R3(roleEvidence.map(({ selfHash }) => selfHash)),
  "R10 semantic verification receipt does not equal the complete attempt evidence set");
}

export function buildItemEvaluationEvidenceV5R10(input) {
  const graphErrors = validateAttemptGraphReconstructionReceiptV5R10({
    ...(input.deepSeekAttemptGraphContext ?? {}),
    attemptGraphReceipt: input.deepSeekAttemptGraphReceipt,
  });
  requireCondition(graphErrors.length === 0
    && input.deepSeekAttemptGraphReceipt.graphStatus === "COMPLETE_VALID"
    && input.deepSeekAttemptGraphReceipt.provider === "DEEPSEEK_DIRECT",
  `R10 scoring requires an exact complete-custody DeepSeek graph: ${graphErrors.join("; ")}`);
  const roleEvidence = input.deepSeekAttemptGraphReceipt.roleAttemptEvidenceReceipts;
  validateSemanticReceipt(input, roleEvidence);
  const outputs = roleOutputByEvidenceV5R10({
    roleAttemptEvidenceReceipts: roleEvidence.filter(({ attemptStatus }) =>
      attemptStatus === "SUCCEEDED"),
    ledgerEntries: input.deepSeekAttemptGraphContext.ledgerEntries,
  });
  return buildItemResults(input, outputs, roleEvidence);
}

export function buildTerminalItemEvaluationEvidenceV5R10(input) {
  const graphErrors = validateAttemptGraphReconstructionReceiptV5R10({
    ...(input.deepSeekAttemptGraphContext ?? {}),
    attemptGraphReceipt: input.deepSeekAttemptGraphReceipt,
  });
  requireCondition(graphErrors.length === 0
    && input.deepSeekAttemptGraphReceipt.graphStatus === "COMPLETE_VALID"
    && input.deepSeekAttemptGraphReceipt.provider === "DEEPSEEK_DIRECT"
    && Array.isArray(input.deepSeekAttemptGraphReceipt.roleAttemptEvidenceReceipts),
  `R10 terminal item reconstruction requires an exact partial-attempt custody graph: ${graphErrors.join("; ")}`);
  const roleEvidence = input.deepSeekAttemptGraphReceipt.roleAttemptEvidenceReceipts;
  requireCondition(roleEvidence.every(validateSelfHashV5R3),
    "R10 terminal partial attempt graph contains unsealed role evidence");
  const outputs = roleOutputByEvidenceV5R10({
    roleAttemptEvidenceReceipts: roleEvidence.filter(({ attemptStatus }) =>
      attemptStatus === "SUCCEEDED"),
    ledgerEntries: input.deepSeekAttemptGraphContext.ledgerEntries,
  });
  return buildItemResults(input, outputs, roleEvidence);
}

export function validateCompletedItemMarkerBindingsV5R10({ itemResults, completedItemMarkers }) {
  const errors = [];
  try {
    requireCondition(Array.isArray(itemResults) && itemResults.length === 60,
      "R10 completion-marker verification requires all 60 item results");
    requireCondition(Array.isArray(completedItemMarkers),
      "R10 completion-marker verification requires a marker array");
    const expected = itemResults.filter(({ executionDisposition }) =>
      executionDisposition === "COMPLETE");
    const markerByHash = new Map();
    for (const marker of completedItemMarkers) {
      const schemaErrors = validateClosedSelfHashedArtifactV5R10(marker,
        "CompletedItemCommitMarkerV2");
      requireCondition(schemaErrors.length === 0,
        `R10 completed-item marker fails its closed schema: ${schemaErrors.join("; ")}`);
      requireCondition(!markerByHash.has(marker.selfHash),
        "R10 completed-item marker set contains a duplicate hash");
      markerByHash.set(marker.selfHash, marker);
    }
    requireCondition(markerByHash.size === expected.length,
      "R10 completed-item marker set size differs from complete item results");
    const consumed = new Set();
    for (const result of itemResults) {
      if (result.executionDisposition !== "COMPLETE") {
        requireCondition(result.completedItemMarkerHash === null,
          `R10 missing item ${result.itemHash} unexpectedly binds a completion marker`);
        continue;
      }
      const marker = markerByHash.get(result.completedItemMarkerHash);
      requireCondition(marker && !consumed.has(marker.selfHash),
        `R10 item ${result.itemHash} does not resolve to one unused completed-item marker`);
      requireCondition(marker.itemHash === result.itemHash
        && marker.itemIdPseudonym === result.itemIdPseudonym
        && marker.clusterId === result.clusterId
        && canonicalJsonV5R3(marker.requiredRoleOrder)
          === canonicalJsonV5R3(result.requiredRoleOrder)
        && canonicalJsonV5R3(marker.successfulRoleOutputHashes)
          === canonicalJsonV5R3(result.successfulRoleOutputHashes)
        && canonicalJsonV5R3(marker.attemptReceiptHashes)
          === canonicalJsonV5R3(result.attemptReceiptHashes),
      `R10 item ${result.itemHash} and its completed-item marker differ`);
      consumed.add(marker.selfHash);
    }
    requireCondition(consumed.size === markerByHash.size,
      "R10 completed-item marker set contains dangling markers");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

function decisionEvidenceInput(input) {
  const graphContext = input.deepSeekAttemptGraphContext ?? {};
  return {
    ...(input.decisionEvidenceInput ?? {}),
    activeRegistration: input.activeRegistration,
    referenceAttemptGraphReceipt: input.referenceAttemptGraphReceipt ?? null,
    deepSeekAttemptGraphReceipt: input.deepSeekAttemptGraphReceipt,
    inventory: input.inventory,
    c0ExecutionSet: input.c0ExecutionSet,
    executionRegistration: input.executionRegistration,
    authorizations: input.decisionEvidenceInput?.authorizations ?? [input.deepSeekAuthorization],
    requestArtifacts: graphContext.requestArtifacts ?? [],
    resolvedAttemptReceipts: graphContext.resolvedAttemptReceipts ?? [],
    commandJournals: input.decisionEvidenceInput?.commandJournals ?? input.commandJournals ?? [],
    thresholdsFrozenAt: input.thresholdsFrozenAt,
    firstReferenceAttemptAt: input.firstReferenceAttemptAt
      ?? firstAttemptAt(input.referenceLedgerEntries, input.executionRegistration.registeredAt),
    firstEvaluationAttemptAt: input.firstEvaluationAttemptAt
      ?? firstAttemptAt(graphContext.ledgerEntries, input.executionRegistration.registeredAt),
    reconstructedAt: input.scoredAt,
  };
}

function statisticalInput(input, itemResults, decisionEvidenceReceipt) {
  const facts = statisticalDecisionFlagsFromEvidenceV5R10(decisionEvidenceReceipt);
  return Object.freeze({
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    sampleManifestHash: input.activeRegistration.sampleManifestHash,
    referenceSealHash: input.referenceSeal.selfHash,
    executionRegistrationHash: input.executionRegistration.selfHash,
    deepSeekAuthorizationHash: input.deepSeekAuthorization.selfHash,
    c0ExecutionSetHash: input.c0ExecutionSet.selfHash,
    itemResults,
    thresholdsFrozenAt: input.thresholdsFrozenAt,
    firstReferenceAttemptAt: input.firstReferenceAttemptAt
      ?? firstAttemptAt(input.referenceLedgerEntries, input.executionRegistration.registeredAt),
    firstEvaluationAttemptAt: input.firstEvaluationAttemptAt
      ?? firstAttemptAt(input.deepSeekAttemptGraphContext.ledgerEntries,
        input.executionRegistration.registeredAt),
    ...facts,
    scoredAt: input.scoredAt,
  });
}

export function scoreNaturalCaV5R10(input) {
  requireCondition(validateSelfHashV5R3(input.activeRegistration)
    && validateSelfHashV5R3(input.inventory)
    && validateSelfHashV5R3(input.referenceSeal)
    && validateSelfHashV5R3(input.compatibilityReferenceSeal)
    && validateSelfHashV5R3(input.executionRegistration)
    && validateSelfHashV5R3(input.deepSeekAuthorization)
    && validateSelfHashV5R3(input.c0ExecutionSet),
  "R10 scoring upstream roots are not closed self-hashed artifacts");
  const built = buildItemEvaluationEvidenceV5R10(input);
  const decisionEvidenceReceipt = reconstructDecisionEvidenceV5R10(decisionEvidenceInput(input));
  const frozenInput = statisticalInput(input, built.itemResults, decisionEvidenceReceipt);
  const statisticalBundle = buildFrozenStatisticalBundleV5R10(frozenInput);
  const projectedMarkers = built.itemResults
    .filter(({ executionDisposition }) => executionDisposition === "COMPLETE")
    .map(({ manifestOrdinal, itemHash, completedItemMarkerHash }) => ({
      manifestOrdinal,
      itemHash,
      selfHash: completedItemMarkerHash,
    }));
  requireCondition(canonicalJsonV5R3(statisticalBundle.completedItemMarkers)
    === canonicalJsonV5R3(projectedMarkers),
  "R10 completion-marker root inputs differ between raw evidence and statistical custody");
  const markerErrors = validateCompletedItemMarkerBindingsV5R10(built);
  requireCondition(markerErrors.length === 0, markerErrors.join("; "));
  const scoreReceipt = assertClosedSelfHashedArtifactV5R10(sealV5R3Artifact({
    schemaVersion: "NaturalCaAggregateScoreReceiptV7",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    referenceSealHash: input.referenceSeal.selfHash,
    executionRegistrationHash: input.executionRegistration.selfHash,
    c0ExecutionSetHash: input.c0ExecutionSet.selfHash,
    deepSeekAttemptGraphReceiptHash: input.deepSeekAttemptGraphReceipt.selfHash,
    semanticDispatchVerificationReceiptHash: input.semanticDispatchVerificationReceipt.selfHash,
    decisionEvidenceReceiptHash: decisionEvidenceReceipt.selfHash,
    itemResultSetHash: statisticalBundle.observedLedger.itemResultSetHash,
    completedItemMarkerRootHash: statisticalBundle.finalReceipt.completedItemMarkerRootHash,
    finalEvaluationReceiptHash: statisticalBundle.finalReceipt.selfHash,
    completeItemCount: statisticalBundle.observedLedger.accounting.completeReceiptItemCount,
    missingItemCount: statisticalBundle.observedLedger.accounting.missingReceiptItemCount,
    unifiedNonresolvedItemCount: statisticalBundle.observedLedger.accounting.unifiedNonresolvedItemCount,
    metricOutputCount: statisticalBundle.metricResults?.length ?? 0,
    analysisStatus: statisticalBundle.finalReceipt.analysisStatus,
    overallDecision: statisticalBundle.finalReceipt.overallDecision,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
    missingDataImputedAsNegative: false,
    verificationMode: "READ_ONLY_RAW_GRAPH_ITEM_RESULT_STATISTICS_AND_TERMINAL_DECISION_RECONSTRUCTION",
    scoredAt: input.scoredAt,
  }), "NaturalCaAggregateScoreReceiptV7");
  return Object.freeze({ ...statisticalBundle,
    completedItemMarkers: built.completedItemMarkers,
    decisionEvidenceReceipt,
    statisticalInput: frozenInput,
    scoreReceipt });
}

export function buildTerminalExecutionBundleFromRawCustodyV5R10(input) {
  const built = buildTerminalItemEvaluationEvidenceV5R10(input);
  const decisionEvidenceReceipt = reconstructDecisionEvidenceV5R10(decisionEvidenceInput(input));
  const frozenInput = statisticalInput(input, built.itemResults, decisionEvidenceReceipt);
  const terminalCauseCodes = [...new Set(decisionEvidenceReceipt.causeCodes)].sort();
  requireCondition(terminalCauseCodes.length > 0,
    "R10 terminal decision requires a cause reconstructed from immutable custody");
  const terminalCauseEvidenceRootHash = sha256V5R3(canonicalJsonV5R3([
    decisionEvidenceReceipt.selfHash,
    input.deepSeekAttemptGraphReceipt.selfHash,
    decisionEvidenceReceipt.commandJournalRootHash,
    ...terminalCauseCodes,
    ...built.itemResults.map(({ selfHash }) => selfHash),
  ]));
  const terminalReceipt = buildTerminalExecutionDecisionReceiptV5R10({
    ...frozenInput,
    terminalCauseCodes,
    attemptGraphReceiptHash: input.deepSeekAttemptGraphReceipt.selfHash,
    ledgerEntryRootHash: input.deepSeekAttemptGraphReceipt.ledgerEntryRootHash,
    resolvedAttemptReceiptRootHash: decisionEvidenceReceipt.resolvedAttemptReceiptRootHash,
    commandJournalRootHash: decisionEvidenceReceipt.commandJournalRootHash,
    decisionEvidenceReceiptHash: decisionEvidenceReceipt.selfHash,
    terminalCauseEvidenceRootHash,
  });
  return Object.freeze({ ...built, decisionEvidenceReceipt, statisticalInput: frozenInput,
    terminalReceipt, terminalCauseEvidenceRootHash });
}

export function verifyNaturalCaScoreFromRawEvidenceV5R10({ scoreReceipt, ...input }) {
  const errors = [];
  try {
    const schemaErrors = validateClosedSelfHashedArtifactV5R10(scoreReceipt,
      "NaturalCaAggregateScoreReceiptV7");
    requireCondition(schemaErrors.length === 0,
      `R10 score receipt fails its closed schema or self-hash: ${schemaErrors.join("; ")}`);
    const rebuilt = scoreNaturalCaV5R10({ ...input, scoredAt: scoreReceipt.scoredAt });
    if (canonicalJsonV5R3(rebuilt.scoreReceipt) !== canonicalJsonV5R3(scoreReceipt)) {
      errors.push("R10 score receipt differs from raw graph/item/statistical reconstruction");
    }
    if (input.frozenBundle) {
      errors.push(...verifyFrozenStatisticalBundleV5R10(rebuilt.statisticalInput,
        input.frozenBundle));
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const SCORER_VERIFIER_V5_R10_CONSTANTS = Object.freeze({
  legacyScorerV5R3Imported: false,
  fullItemResultCount: 60,
  completeReceiptFloor: 57,
  unifiedNonresolvedMaximum: 3,
  metricOutputCount: 11,
  rawAttemptGraphRequired: true,
  missingDataImputedAsNegative: false,
  decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
});
