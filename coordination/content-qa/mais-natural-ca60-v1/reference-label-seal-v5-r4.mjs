import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  TAXONOMY,
  TAXONOMY_FAMILY,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
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
import {
  executionLedgerTerminalEvidenceV5R4,
  resolveSuccessfulRoleOutputV5R4,
  validateExecutionLedgerEntriesV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";

const BASE_ROLES = Object.freeze(["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"]);
const ALL_ROLES = Object.freeze([...BASE_ROLES, "ADJUDICATOR"]);
const LABELS = new Set(["DEFECT", "NO_FINDING", "UNRESOLVED_REFERENCE"]);
const SEVERITIES = new Set(["NONE", "P2", "P1", "P0", "UNRESOLVED"]);
const STATUS_CODES = new Set(["NO_FINDING", "UNASSESSABLE", "SCHEMA_GAP"]);
const ADJUDICATION_ENGINE_HASH = DESIGN.analysis.frozenMethodComponentRoots.adjudicationStateMachineHash;
const SEVERITY_RANK = Object.freeze({ NONE: 0, P2: 1, P1: 2, P0: 3, UNRESOLVED: 4 });

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function round(value) { return Number(value.toFixed(12)); }
function codePointCompare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }

function validateFindings(findings, itemLabel) {
  requireCondition(Array.isArray(findings), `${itemLabel} findings must be an array`);
  const ids = new Set();
  for (const finding of findings) {
    requireCondition(finding && typeof finding === "object" && !Array.isArray(finding), `${itemLabel} finding is not an object`);
    requireCondition(typeof finding.findingId === "string" && finding.findingId.length > 0 && !ids.has(finding.findingId), `${itemLabel} finding ID is absent or duplicated`);
    ids.add(finding.findingId);
    requireCondition(typeof finding.evidenceLocator === "string" && finding.evidenceLocator.length > 0, `${itemLabel} evidence locator is absent`);
    requireCondition(Object.hasOwn(TAXONOMY, finding.code) && !STATUS_CODES.has(finding.code)
      && finding.family === TAXONOMY_FAMILY[finding.code] && finding.severity === TAXONOMY[finding.code], `${itemLabel} finding taxonomy family or severity drifted`);
  }
}

function validateLabelSemantics({ label, codes, severity, families, findings, uncertain }, itemLabel) {
  requireCondition(LABELS.has(label) && SEVERITIES.has(severity), `${itemLabel} label or severity is invalid`);
  requireCondition(Array.isArray(codes) && codes.length > 0 && new Set(codes).size === codes.length
    && codes.every((code) => Object.hasOwn(TAXONOMY, code)), `${itemLabel} taxonomy codes are invalid`);
  requireCondition(families && typeof families === "object" && !Array.isArray(families), `${itemLabel} finding families are invalid`);
  validateFindings(findings, itemLabel);
  const findingCodes = [...new Set(findings.map(({ code }) => code))].sort();
  const metricCodes = codes.filter((code) => !STATUS_CODES.has(code)).sort();
  requireCondition(canonicalJsonV5R3(findingCodes) === canonicalJsonV5R3(metricCodes), `${itemLabel} codes do not equal finding codes`);
  for (const code of codes) requireCondition((families[code] ?? null) === (STATUS_CODES.has(code) ? null : TAXONOMY_FAMILY[code]), `${itemLabel} family map is invalid`);
  if (label === "NO_FINDING") requireCondition(codes.length === 1 && codes[0] === "NO_FINDING" && severity === "NONE" && findings.length === 0, `${itemLabel} NO_FINDING semantics are invalid`);
  if (label === "DEFECT") requireCondition(findings.length > 0 && severity === findings.reduce((highest, finding) => SEVERITY_RANK[finding.severity] > SEVERITY_RANK[highest] ? finding.severity : highest, "NONE"), `${itemLabel} DEFECT severity is invalid`);
  if (label === "UNRESOLVED_REFERENCE") requireCondition(severity === "UNRESOLVED" || codes.some((code) => ["SCHEMA_GAP", "UNASSESSABLE"].includes(code)) || uncertain === true, `${itemLabel} unresolved semantics are invalid`);
}

export function buildRawMachineReferenceLabelV5R4(output) {
  assertClosedSelfHashedArtifactV5R4(output, "ProviderRoleOutputV1");
  requireCondition(output.provider === "OPENAI_DIRECT" && output.model === "gpt-5.6-luna"
    && ["A_LABEL", "B_LABEL"].includes(output.role), "raw reference label source role tuple is invalid");
  const payload = output.parsedPayload;
  requireCondition(output.parsedPayloadHash === sha256V5R3(canonicalJsonV5R3(payload)), "raw reference label parsed payload hash is invalid");
  validateLabelSemantics({
    label: payload.rawLabel,
    codes: payload.rawTaxonomyCodes,
    severity: payload.rawSeverity,
    families: payload.rawFindingFamilies,
    findings: payload.rawFindings,
    uncertain: payload.rawUncertain,
  }, output.role);
  const raw = sealV5R3Artifact({
    schemaVersion: "RawMachineReferenceLabelV1",
    labelSourceType: "machine_reference_panel",
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    panelRole: output.role,
    roleOutputHash: output.selfHash,
    attemptReceiptHash: output.attemptReceiptHash,
    itemHash: output.itemHash,
    itemIdPseudonym: output.itemIdPseudonym,
    clusterId: output.clusterId,
    label: payload.rawLabel,
    codes: structuredClone(payload.rawTaxonomyCodes),
    severity: payload.rawSeverity,
    findingFamilies: structuredClone(payload.rawFindingFamilies),
    findings: structuredClone(payload.rawFindings),
    uncertain: payload.rawUncertain,
  });
  assertClosedSelfHashedArtifactV5R4(raw, "RawMachineReferenceLabelV1");
  return raw;
}

function comparableRaw(raw) {
  return {
    label: raw.label,
    codes: raw.codes,
    severity: raw.severity,
    findingFamilies: raw.findingFamilies,
    findings: raw.findings,
    uncertain: raw.uncertain,
  };
}

export function buildOpenAIAdjudicationTriggerV5R4({ item, labelA, labelB }) {
  assertClosedSelfHashedArtifactV5R4(labelA, "RawMachineReferenceLabelV1");
  assertClosedSelfHashedArtifactV5R4(labelB, "RawMachineReferenceLabelV1");
  requireCondition(labelA.panelRole === "A_LABEL" && labelB.panelRole === "B_LABEL"
    && [labelA, labelB].every((label) => label.itemHash === item.itemHash && label.itemIdPseudonym === item.itemIdPseudonym), "adjudication trigger crosses item or role boundaries");
  const reasons = [];
  if (canonicalJsonV5R3(comparableRaw(labelA)) !== canonicalJsonV5R3(comparableRaw(labelB))) reasons.push("FIELD_DISAGREEMENT");
  if (labelA.uncertain || labelB.uncertain) reasons.push("UNCERTAIN");
  if ([labelA.severity, labelB.severity].includes("P0")) reasons.push("P0_RAISED");
  if ([labelA.severity, labelB.severity].includes("P1")) reasons.push("P1_RAISED");
  const trigger = sealV5R3Artifact({
    schemaVersion: "OpenAIAdjudicationTriggerReceiptV1",
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    triggerEngineHash: ADJUDICATION_ENGINE_HASH,
    labelAHash: labelA.selfHash,
    labelBHash: labelB.selfHash,
    reasons: [...new Set(reasons)],
    adjudicationRequired: reasons.length > 0,
  });
  assertClosedSelfHashedArtifactV5R4(trigger, "OpenAIAdjudicationTriggerReceiptV1");
  return trigger;
}

function adjudicatedPayload(output) {
  assertClosedSelfHashedArtifactV5R4(output, "ProviderRoleOutputV1");
  requireCondition(output.role === "ADJUDICATOR" && output.provider === "OPENAI_DIRECT", "adjudicator role tuple is invalid");
  const payload = output.parsedPayload;
  validateLabelSemantics({
    label: payload.finalLabel,
    codes: payload.finalTaxonomyCodes,
    severity: payload.finalSeverity,
    families: payload.finalFindingFamilies,
    findings: payload.finalFindings,
    uncertain: payload.finalLabel === "UNRESOLVED_REFERENCE",
  }, "ADJUDICATOR");
  requireCondition(Array.isArray(payload.adjudicationReasonCodes) && payload.adjudicationReasonCodes.length > 0, "adjudicator reason codes are absent");
  return {
    label: payload.finalLabel,
    taxonomyCodes: structuredClone(payload.finalTaxonomyCodes),
    severity: payload.finalSeverity,
    findingFamilies: structuredClone(payload.finalFindingFamilies),
    findings: structuredClone(payload.finalFindings),
  };
}

function mergedPayload(raw) {
  return {
    label: raw.label,
    taxonomyCodes: structuredClone(raw.codes),
    severity: raw.severity,
    findingFamilies: structuredClone(raw.findingFamilies),
    findings: structuredClone(raw.findings),
  };
}

function jaccard(left, right) {
  const a = new Set(left); const b = new Set(right); const union = new Set([...a, ...b]);
  return union.size === 0 ? 1 : [...a].filter((value) => b.has(value)).length / union.size;
}

function categoricalAgreement(pairs) {
  const categories = [...new Set(pairs.flat())].sort();
  const observed = pairs.filter(([a, b]) => a === b).length / pairs.length;
  const left = new Map(categories.map((category) => [category, pairs.filter(([value]) => value === category).length / pairs.length]));
  const right = new Map(categories.map((category) => [category, pairs.filter(([, value]) => value === category).length / pairs.length]));
  const expectedKappa = categories.reduce((sum, category) => sum + left.get(category) * right.get(category), 0);
  const average = categories.map((category) => (left.get(category) + right.get(category)) / 2);
  const expectedAc1 = categories.length <= 1 ? 0 : average.reduce((sum, rate) => sum + rate * (1 - rate), 0) / (categories.length - 1);
  return {
    observed,
    cohenKappa: expectedKappa === 1 ? 1 : (observed - expectedKappa) / (1 - expectedKappa),
    gwetAc1: expectedAc1 === 1 ? 1 : (observed - expectedAc1) / (1 - expectedAc1),
  };
}

function agreementStatistics(pairs, adjudicationCount) {
  const categorical = categoricalAgreement(pairs.map(({ a, b }) => [a.label, b.label]));
  return Object.freeze({
    rawExactAgreement: round(pairs.filter(({ a, b }) => canonicalJsonV5R3(comparableRaw(a)) === canonicalJsonV5R3(comparableRaw(b))).length / pairs.length),
    severityAgreement: round(pairs.filter(({ a, b }) => a.severity === b.severity).length / pairs.length),
    codeJaccard: round(pairs.reduce((sum, { a, b }) => sum + jaccard(a.codes, b.codes), 0) / pairs.length),
    familyJaccard: round(pairs.reduce((sum, { a, b }) => sum + jaccard(Object.values(a.findingFamilies).filter(Boolean), Object.values(b.findingFamilies).filter(Boolean)), 0) / pairs.length),
    cohenKappa: round(categorical.cohenKappa),
    gwetAc1: round(categorical.gwetAc1),
    adjudicationRate: round(adjudicationCount / pairs.length),
  });
}

export function buildMachineReferenceSealV5R4({ registration, authorization, inventory, ledgerEntries, sealedAt }) {
  const registrationErrors = validateRunnerRegistrationV5R4(registration);
  const inventoryErrors = validateSampleExecutionInventoryV2({ registration, inventory });
  const ledgerErrors = validateExecutionLedgerEntriesV5R4({ entries: ledgerEntries, authorization, inventory });
  requireCondition(registrationErrors.length + inventoryErrors.length + ledgerErrors.length === 0, [...registrationErrors, ...inventoryErrors, ...ledgerErrors].join("; "));
  assertClosedSelfHashedArtifactV5R4(authorization, "ProviderAuthorizationV4");
  requireCondition(authorization.provider === "OPENAI_DIRECT" && authorization.runnerRegistrationHash === registration.selfHash
    && authorization.sampleExecutionInventoryHash === inventory.selfHash && authorization.referenceSealHash === null
    && authorization.referenceAttemptChainHash === null, "reference seal authorization tuple or chronology is invalid");
  requireCondition(Number.isFinite(Date.parse(sealedAt)) && Date.parse(sealedAt) > Date.parse(authorization.issuedAt), "reference seal chronology is invalid");
  const reservations = ledgerEntries.filter((entry) => entry.entryType === "DISPATCH_RESERVED");
  const completions = ledgerEntries.filter((entry) => entry.entryType === "DISPATCH_COMPLETED");
  requireCondition(reservations.length === completions.length && reservations.length >= 240, "reference ledger contains incomplete attempts or fewer than 240 attempts");
  const completionByReservation = new Map(completions.map((entry) => [entry.reservationHash, entry]));
  requireCondition(reservations.every((reservation) => completionByReservation.has(reservation.selfHash)), "reference ledger contains an uncompleted reservation");
  const summaries = [];
  const finalLabels = [];
  const rawPairs = [];
  const requiredOutputHashes = new Set();
  let adjudicationCount = 0;
  for (const item of inventory.items) {
    const outputs = Object.fromEntries(BASE_ROLES.map((role) => [role, resolveSuccessfulRoleOutputV5R4({ entries: ledgerEntries, authorization, inventory, itemHash: item.itemHash, role }).output]));
    const rawA = buildRawMachineReferenceLabelV5R4(outputs.A_LABEL);
    const rawB = buildRawMachineReferenceLabelV5R4(outputs.B_LABEL);
    rawPairs.push({ a: rawA, b: rawB });
    const trigger = buildOpenAIAdjudicationTriggerV5R4({ item, labelA: rawA, labelB: rawB });
    let resolved;
    let resolutionMethod;
    const roleOrder = [...BASE_ROLES];
    if (trigger.adjudicationRequired) {
      const adjudicator = resolveSuccessfulRoleOutputV5R4({ entries: ledgerEntries, authorization, inventory, itemHash: item.itemHash, role: "ADJUDICATOR" }).output;
      outputs.ADJUDICATOR = adjudicator;
      roleOrder.push("ADJUDICATOR");
      resolved = adjudicatedPayload(adjudicator);
      resolutionMethod = "OPENAI_ADJUDICATION";
      adjudicationCount += 1;
    } else {
      requireCondition(canonicalJsonV5R3(comparableRaw(rawA)) === canonicalJsonV5R3(comparableRaw(rawB)), "non-adjudicated labels do not exactly agree");
      resolved = mergedPayload(rawA);
      resolutionMethod = "DETERMINISTIC_EXACT_AGREEMENT_MERGER";
    }
    for (const role of roleOrder) {
      const output = outputs[role];
      requireCondition(output.deepSeekInputCount === 0 && output.referenceInputCount === 0, "reference output blindness counters are invalid");
      requiredOutputHashes.add(output.selfHash);
    }
    const finalLabel = sealV5R3Artifact({
      schemaVersion: "MachineReferenceLabelV1",
      labelSourceType: "machine_reference_panel",
      humanGold: false,
      sameModelCorrelatedErrorRisk: true,
      provider: "OPENAI_DIRECT",
      model: "gpt-5.6-luna",
      itemHash: item.itemHash,
      itemIdPseudonym: item.itemIdPseudonym,
      clusterId: item.clusterId,
      resolutionMethod,
      sourceRoleOutputHashes: roleOrder.map((role) => outputs[role].selfHash),
      adjudicationTriggerHash: trigger.selfHash,
      ...resolved,
      unresolved: resolved.label === "UNRESOLVED_REFERENCE" || resolved.severity === "UNRESOLVED"
        || resolved.taxonomyCodes.some((code) => ["SCHEMA_GAP", "UNASSESSABLE"].includes(code)),
    });
    assertClosedSelfHashedArtifactV5R4(finalLabel, "MachineReferenceLabelV1");
    finalLabels.push(finalLabel);
    summaries.push(Object.freeze({
      itemHash: item.itemHash,
      itemIdPseudonym: item.itemIdPseudonym,
      clusterId: item.clusterId,
      roleOutputHashes: Object.fromEntries(roleOrder.map((role) => [role, outputs[role].selfHash])),
      adjudicationTriggerHash: trigger.selfHash,
      finalLabelHash: finalLabel.selfHash,
    }));
  }
  const successfulCompletions = completions.filter((entry) => entry.attemptStatus === "SUCCEEDED");
  requireCondition(successfulCompletions.length === 240 + adjudicationCount
    && successfulCompletions.every((entry) => requiredOutputHashes.has(entry.roleOutputHash))
    && requiredOutputHashes.size === successfulCompletions.length, "reference successful-call graph contains a missing, extra, or duplicate role success");
  const chain = executionLedgerTerminalEvidenceV5R4(ledgerEntries);
  const orderedSummaries = [...summaries].sort((a, b) => codePointCompare(a.itemHash, b.itemHash));
  const orderedLabels = [...finalLabels].sort((a, b) => codePointCompare(a.itemHash, b.itemHash));
  const unresolvedCount = orderedLabels.filter(({ unresolved }) => unresolved).length;
  const providerEventCountAtSeal = completions.reduce((sum, entry) => sum + entry.providerEventReceipt.providerEventCount, 0);
  const seal = sealV5R3Artifact({
    schemaVersion: "MachineReferenceSealV3",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: registration.selfHash,
    openAIReferenceAuthorizationHash: authorization.selfHash,
    sampleManifestHash: registration.sampleManifestHash,
    samplePayloadSetHash: registration.samplePayloadSetHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    privacyScreenHash: registration.privacyScreenHash,
    rightsScreenHash: registration.rightsScreenHash,
    taxonomyHash: registration.taxonomyHash,
    labelingAndAdjudicationHash: registration.labelingAndAdjudicationHash,
    provider: "OPENAI_DIRECT",
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    labelSourceType: "machine_reference_panel",
    humanGold: false,
    sameModelCorrelatedErrorRisk: true,
    itemCount: 60,
    baseSuccessfulCallCount: 240,
    adjudicationSuccessfulCallCount: adjudicationCount,
    totalSuccessfulCallCount: successfulCompletions.length,
    totalAttemptCount: reservations.length,
    retryAttemptCount: reservations.length - successfulCompletions.length,
    providerEventCountAtSeal,
    executionLedgerTerminalHash: chain.terminalHash,
    attemptChainHash: chain.attemptChainHash,
    requestArtifactRootHash: sha256V5R3(canonicalJsonV5R3(reservations.map(({ requestArtifactHash }) => requestArtifactHash))),
    completionRootHash: sha256V5R3(canonicalJsonV5R3(completions.map(({ selfHash }) => selfHash))),
    itemSummaries: orderedSummaries,
    itemSealRoot: sha256V5R3(canonicalJsonV5R3(orderedSummaries)),
    finalLabels: orderedLabels,
    finalLabelRoot: sha256V5R3(canonicalJsonV5R3(orderedLabels.map(({ selfHash }) => selfHash))),
    unresolvedCount,
    unresolvedWithinExecutionCap: unresolvedCount <= 3,
    agreementStatistics: agreementStatistics(rawPairs, adjudicationCount),
    labelBlindnessVerified: true,
    sealedAt,
  });
  assertClosedSelfHashedArtifactV5R4(seal, "MachineReferenceSealV3");
  return seal;
}

export function validateMachineReferenceSealV5R4(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R4(input?.seal, "MachineReferenceSealV3")];
  for (const label of input?.seal?.finalLabels ?? []) errors.push(...validateClosedSelfHashedArtifactV5R4(label, "MachineReferenceLabelV1"));
  try {
    const rebuilt = buildMachineReferenceSealV5R4({ ...input, sealedAt: input.seal?.sealedAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.seal)) errors.push("reference seal differs from exact raw-ledger reconstruction");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildReferenceSealValidationReceiptV5R4(input) {
  const errors = validateMachineReferenceSealV5R4(input);
  if (errors.length > 0) throw new TypeError(errors.join("; "));
  const receipt = sealV5R3Artifact({
    schemaVersion: "ReferenceSealValidationReceiptV1",
    runnerRegistrationHash: input.registration.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    openAIReferenceAuthorizationHash: input.authorization.selfHash,
    referenceSealHash: input.seal.selfHash,
    referenceAttemptChainHash: input.seal.attemptChainHash,
    referenceLedgerTerminalHash: input.seal.executionLedgerTerminalHash,
    finalLabelRoot: input.seal.finalLabelRoot,
    itemCount: input.seal.itemCount,
    validationStatus: "VALID",
    validatedAt: input.validatedAt,
  });
  assertClosedSelfHashedArtifactV5R4(receipt, "ReferenceSealValidationReceiptV1");
  return receipt;
}

export const REFERENCE_LABEL_SEAL_V5_R4_CONSTANTS = Object.freeze({
  baseRoles: BASE_ROLES,
  allRoles: ALL_ROLES,
  adjudicationEngineHash: ADJUDICATION_ENGINE_HASH,
});
