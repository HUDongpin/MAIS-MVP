import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  TAXONOMY,
  TAXONOMY_FAMILY,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";

import SCORE_SCHEMA from "./schemas/NaturalCaAggregateScoreReceiptV5.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  scoreNaturalCaV5R3,
} from "./scorer-v5-r3.mjs";
import {
  roleOutputByEvidenceV5R7,
  validateAttemptGraphReconstructionReceiptV5R7,
} from "./attempt-graph-v5-r7.mjs";
import {
  validateNormalC0ExecutionSetV5R7,
} from "./c0-state-v5-r7.mjs";
import {
  validateRawAuthoritativeMachineReferenceSealV5R7,
} from "./raw-authoritative-reference-v5-r7.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSelfHashedArtifactV5R7,
} from "./schema-contract-v5-r7.mjs";

const BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3",
  "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);
const STATUS_CODES = new Set(["NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP"]);

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function key(itemHash, role) {
  return `${itemHash}:${role}`;
}

function minimalFindings(findings, label) {
  requireCondition(Array.isArray(findings), `${label} findings are absent`);
  const ids = new Set();
  return findings.map((finding) => {
    requireCondition(finding && typeof finding.findingId === "string" && finding.findingId.length > 0
      && !ids.has(finding.findingId) && Object.hasOwn(TAXONOMY, finding.code)
      && !STATUS_CODES.has(finding.code) && finding.family === TAXONOMY_FAMILY[finding.code]
      && finding.severity === TAXONOMY[finding.code],
    `${label} finding identity, code, family, or severity is invalid`);
    ids.add(finding.findingId);
    return Object.freeze({ findingId: finding.findingId, code: finding.code,
      family: finding.family, severity: finding.severity });
  });
}

function mergeMachineFindings(outputs, itemHash) {
  const byId = new Map();
  for (const output of outputs) {
    const payload = output.parsedPayload;
    requireCondition(payload?.valid === true && payload.surfaceDisposition !== "UNASSESSABLE",
      `R7 machine output is invalid or unassessable for ${itemHash}:${output.role}`);
    const findings = minimalFindings(payload.findings, `${itemHash}:${output.role}`);
    requireCondition((payload.surfaceDisposition === "NO_FINDING") === (findings.length === 0),
      `R7 machine output disposition differs from findings for ${itemHash}:${output.role}`);
    for (const finding of findings) {
      const prior = byId.get(finding.findingId);
      requireCondition(!prior || canonicalJsonV5R3(prior) === canonicalJsonV5R3(finding),
        `R7 machine finding ID has conflicting projections for ${itemHash}`);
      byId.set(finding.findingId, finding);
    }
  }
  const codeOrder = Object.keys(TAXONOMY);
  return [...byId.values()].sort((left, right) => codeOrder.indexOf(left.code) - codeOrder.indexOf(right.code)
    || left.findingId.localeCompare(right.findingId));
}

function firstStartedAt(ledgerEntries, label) {
  const values = (ledgerEntries ?? []).filter(({ entryType }) => entryType === "DISPATCH_COMPLETED")
    .map(({ providerEventReceipt }) => providerEventReceipt?.startedAt)
    .filter((value) => Number.isFinite(Date.parse(value)));
  requireCondition(values.length > 0, `${label} has no provider attempt chronology`);
  return values.sort()[0];
}

function expectedDeepSeekKeys(inventory, c0ExecutionSet) {
  const selected = new Set(c0ExecutionSet.selectedItemHashes);
  return inventory.items.flatMap((item) => [...BASE_ROLES, ...(selected.has(item.itemHash) ? C0_ROLES : [])]
    .map((role) => key(item.itemHash, role)));
}

export function buildNaturalCaScoringInputFromAuthoritativeEvidenceV5R7(input) {
  const graphErrors = validateAttemptGraphReconstructionReceiptV5R7({
    ...(input.deepSeekAttemptGraphContext ?? {}),
    attemptGraphReceipt: input.deepSeekAttemptGraphReceipt,
  });
  requireCondition(graphErrors.length === 0 && input.deepSeekAttemptGraphReceipt.graphStatus === "COMPLETE_VALID"
    && input.deepSeekAttemptGraphReceipt.provider === "DEEPSEEK_DIRECT",
  `R7 scoring requires a complete DeepSeek attempt graph: ${graphErrors.join("; ")}`);
  const c0Errors = validateNormalC0ExecutionSetV5R7({
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    executionRegistrationHash: input.executionRegistration.selfHash,
    inventory: input.inventory,
    predicateInputsByItem: input.predicateInputsByItem,
    c0ExecutionSet: input.c0ExecutionSet,
  });
  requireCondition(c0Errors.length === 0, `R7 scoring C0 set is invalid: ${c0Errors.join("; ")}`);
  const referenceErrors = validateRawAuthoritativeMachineReferenceSealV5R7({
    ...(input.referenceSealContext ?? {}),
    seal: input.referenceSeal,
    compatibilityReferenceSeal: input.compatibilityReferenceSeal,
  });
  requireCondition(referenceErrors.length === 0,
    `R7 scoring reference seal is not raw-authoritative: ${referenceErrors.join("; ")}`);
  const semanticErrors = validateClosedSelfHashedArtifactV5R7(input.semanticDispatchVerificationReceipt,
    "SemanticDispatchVerificationReceiptV1");
  const evidence = input.deepSeekAttemptGraphReceipt.roleAttemptEvidenceReceipts;
  const expectedKeys = expectedDeepSeekKeys(input.inventory, input.c0ExecutionSet);
  const observedKeys = evidence.filter(({ attemptStatus }) => attemptStatus === "SUCCEEDED")
    .map(({ itemHash, role }) => key(itemHash, role));
  const semanticBound = semanticErrors.length === 0
    && input.semanticDispatchVerificationReceipt.activeRunnerRegistrationHash === input.activeRegistration.selfHash
    && input.semanticDispatchVerificationReceipt.authorizationHash === input.deepSeekAuthorization.selfHash
    && input.semanticDispatchVerificationReceipt.executionRegistrationHash === input.executionRegistration.selfHash
    && input.semanticDispatchVerificationReceipt.sampleExecutionInventoryHash === input.inventory.selfHash
    && input.semanticDispatchVerificationReceipt.c0ExecutionSetHash === input.c0ExecutionSet.selfHash
    && canonicalJsonV5R3(input.semanticDispatchVerificationReceipt.roleAttemptEvidenceHashes)
      === canonicalJsonV5R3(evidence.map(({ selfHash }) => selfHash))
    && canonicalJsonV5R3(input.semanticDispatchVerificationReceipt.dispatchAuditHashes)
      === canonicalJsonV5R3(evidence.map(({ dispatchAuditHash }) => dispatchAuditHash))
    && canonicalJsonV5R3(input.semanticDispatchVerificationReceipt.semanticDispatchAuthorityHashes)
      === canonicalJsonV5R3(evidence.map(({ semanticDispatchAuthorityHash }) =>
        semanticDispatchAuthorityHash));
  const exactCallGraph = new Set(observedKeys).size === observedKeys.length
    && canonicalJsonV5R3([...observedKeys].sort()) === canonicalJsonV5R3([...expectedKeys].sort());
  const outputs = roleOutputByEvidenceV5R7({
    roleAttemptEvidenceReceipts: evidence.filter(({ attemptStatus }) => attemptStatus === "SUCCEEDED"),
    ledgerEntries: input.deepSeekAttemptGraphContext.ledgerEntries,
  });
  const outputByKey = new Map(outputs.map((output) => [key(output.itemHash, output.role), output]));
  requireCondition(outputByKey.size === outputs.length, "R7 scoring role outputs are duplicated");
  const labelByItem = new Map(input.compatibilityReferenceSeal.finalLabels
    .map((label) => [label.itemHash, label]));
  requireCondition(labelByItem.size === 60, "R7 scoring requires 60 unique final reference labels");
  const selected = new Set(input.c0ExecutionSet.selectedItemHashes);
  let machineUnresolvedCount = 0;
  const items = input.inventory.items.map((item) => {
    const label = labelByItem.get(item.itemHash);
    requireCondition(label && label.itemIdPseudonym === item.itemIdPseudonym
      && label.clusterId === item.clusterId, "R7 reference label differs from inventory identity");
    const requiredRoles = [...BASE_ROLES, ...(selected.has(item.itemHash) ? C0_ROLES : [])];
    const itemOutputs = requiredRoles.map((role) => outputByKey.get(key(item.itemHash, role)));
    requireCondition(itemOutputs.every(Boolean), `R7 item ${item.itemHash} lacks a required successful role output`);
    let machineFindings = [];
    try {
      machineFindings = mergeMachineFindings([
        outputByKey.get(key(item.itemHash, "B_PRIME_REVISION")),
        ...C0_ROLES.filter((role) => selected.has(item.itemHash))
          .map((role) => outputByKey.get(key(item.itemHash, role))),
      ], item.itemHash);
    } catch {
      machineUnresolvedCount += 1;
    }
    return Object.freeze({
      itemHash: item.itemHash,
      clusterId: item.clusterId,
      referenceFindings: minimalFindings(label.findings, `reference:${item.itemHash}`),
      machineFindings,
    });
  });
  const referenceUnresolvedCount = input.compatibilityReferenceSeal.finalLabels
    .filter(({ unresolved }) => unresolved).length;
  const requestLeakage = (input.deepSeekAttemptGraphContext.requestArtifacts ?? []).some((artifact) =>
    artifact.referenceInputCount !== 0
    || /(?:qwen|reference(?:label|seal)|final(?:reference)?label|goldlabel)/iu
      .test(canonicalJsonV5R3(artifact.providerInput)));
  return sealV5R3Artifact({
    schemaVersion: "NaturalCaScoringInputV1",
    registrationHash: input.activeRegistration.selfHash,
    referenceSealHash: input.referenceSeal.selfHash,
    executionRegistrationHash: input.executionRegistration.selfHash,
    thresholdsFrozenAt: DESIGN.thresholdsFrozenAt,
    firstReferenceAttemptAt: firstStartedAt(input.referenceSealContext.attemptGraphContext.ledgerEntries,
      "R7 reference graph"),
    firstEvaluationAttemptAt: firstStartedAt(input.deepSeekAttemptGraphContext.ledgerEntries,
      "R7 DeepSeek graph"),
    executionIntegrityValid: exactCallGraph && semanticBound,
    labelLeakageDetected: requestLeakage,
    unresolvedOrInvalidCount: referenceUnresolvedCount + machineUnresolvedCount,
    expectedItemCount: 60,
    items,
  });
}

export function buildCompleteScoreEnvelopeV5R7({ activeRunnerRegistrationHash, inventoryHash,
  referenceSealHash, executionRegistrationHash, c0ExecutionSetHash, deepSeekAttemptGraphReceiptHash,
  semanticDispatchVerificationReceiptHash, scoringInput, scoredAt }) {
  const scoringErrors = validateClosedSelfHashedArtifactV5R7(scoringInput, "NaturalCaScoringInputV1");
  requireCondition(scoringErrors.length === 0, `R7 scoring input fails its closed schema: ${scoringErrors.join("; ")}`);
  const baseAggregateScoreReceipt = scoreNaturalCaV5R3(scoringInput);
  const baseErrors = validateClosedSelfHashedArtifactV5R7(baseAggregateScoreReceipt,
    "NaturalCaAggregateScoreReceiptV1");
  requireCondition(baseErrors.length === 0 && baseAggregateScoreReceipt.registrationHash === activeRunnerRegistrationHash
    && baseAggregateScoreReceipt.referenceSealHash === referenceSealHash
    && baseAggregateScoreReceipt.executionRegistrationHash === executionRegistrationHash,
  `R7 base score does not bind its closed upstream input: ${baseErrors.join("; ")}`);
  const receipt = sealV5R3Artifact({
    schemaVersion: "NaturalCaAggregateScoreReceiptV5",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    sampleExecutionInventoryHash: inventoryHash,
    referenceSealHash,
    executionRegistrationHash,
    c0ExecutionSetHash,
    deepSeekAttemptGraphReceiptHash,
    semanticDispatchVerificationReceiptHash,
    scoringInputHash: scoringInput.selfHash,
    baseAggregateScoreReceiptHash: baseAggregateScoreReceipt.selfHash,
    completeItemCount: baseAggregateScoreReceipt.completeItemCount,
    missingItemCount: baseAggregateScoreReceipt.missingItemCount,
    analysisStatus: baseAggregateScoreReceipt.completeItemCount === 60
      ? "COMPLETE_FROZEN_METRIC_ANALYSIS" : "INCOMPLETE_EXECUTION_NO_METRIC_INFERENCE",
    overallDecision: baseAggregateScoreReceipt.overallDecision,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
    missingDataImputedAsNegative: false,
    verificationMode: "READ_ONLY_FULL_SCORING_INPUT_MATCHING_METRIC_INTERVAL_AND_DECISION_RECONSTRUCTION",
    scoredAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, SCORE_SCHEMA, receipt.schemaVersion);
  return Object.freeze({ scoreReceipt: receipt, baseAggregateScoreReceipt, scoringInput });
}

export function scoreNaturalCaV5R7(input) {
  const scoringInput = buildNaturalCaScoringInputFromAuthoritativeEvidenceV5R7(input);
  return buildCompleteScoreEnvelopeV5R7({
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    inventoryHash: input.inventory.selfHash,
    referenceSealHash: input.referenceSeal.selfHash,
    executionRegistrationHash: input.executionRegistration.selfHash,
    c0ExecutionSetHash: input.c0ExecutionSet.selfHash,
    deepSeekAttemptGraphReceiptHash: input.deepSeekAttemptGraphReceipt.selfHash,
    semanticDispatchVerificationReceiptHash: input.semanticDispatchVerificationReceipt.selfHash,
    scoringInput,
    scoredAt: input.scoredAt,
  });
}

export function verifyCompleteScoreEnvelopeV5R7({ scoreReceipt, baseAggregateScoreReceipt,
  scoringInput, ...input }) {
  const errors = [
    ...validateClosedSelfHashedAgainstV5R5(scoreReceipt, SCORE_SCHEMA),
    ...validateClosedSelfHashedArtifactV5R7(baseAggregateScoreReceipt,
      "NaturalCaAggregateScoreReceiptV1"),
    ...validateClosedSelfHashedArtifactV5R7(scoringInput, "NaturalCaScoringInputV1"),
  ];
  try {
    const rebuilt = buildCompleteScoreEnvelopeV5R7({
      ...input,
      scoringInput,
      scoredAt: scoreReceipt?.scoredAt,
    });
    if (canonicalJsonV5R3(rebuilt.scoreReceipt) !== canonicalJsonV5R3(scoreReceipt)
      || canonicalJsonV5R3(rebuilt.baseAggregateScoreReceipt)
        !== canonicalJsonV5R3(baseAggregateScoreReceipt)) {
      errors.push("R7 score differs from full scoring-input, matching, interval, and decision reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function verifyNaturalCaScoreFromRawEvidenceV5R7({ scoreReceipt, baseAggregateScoreReceipt,
  scoringInput, ...input }) {
  const errors = [];
  try {
    const rebuilt = scoreNaturalCaV5R7({ ...input, scoredAt: scoreReceipt?.scoredAt });
    if (canonicalJsonV5R3(rebuilt.scoreReceipt) !== canonicalJsonV5R3(scoreReceipt)
      || canonicalJsonV5R3(rebuilt.baseAggregateScoreReceipt)
        !== canonicalJsonV5R3(baseAggregateScoreReceipt)
      || canonicalJsonV5R3(rebuilt.scoringInput) !== canonicalJsonV5R3(scoringInput)) {
      errors.push("R7 read-only verifier found raw-evidence/scoring/decision drift");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const SCORER_VERIFIER_V5_R7_CONSTANTS = Object.freeze({
  bootstrapReplicates: 10_000,
  completeScoreRequiresRawAttemptGraphs: true,
  openNestedMetricObjectsAccepted: false,
  fabricatedSelfHashedAggregateAccepted: false,
  decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
});
