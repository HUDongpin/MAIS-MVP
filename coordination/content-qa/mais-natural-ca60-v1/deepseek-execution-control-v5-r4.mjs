import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  TAXONOMY,
  TAXONOMY_FAMILY,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import {
  calculateFrozenNaturalItemLeafHashV4,
  deriveProtectedFrozenItemProjectionV4,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import { buildSampleBoundProtectedItemEnvelopeV4 } from "./sample-contract-v5.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
  validateClosedSelfHashedArtifactV5R4,
  validateFreshA11RunnerReviewV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  validateRunnerRegistrationV5R4,
  validateSampleExecutionInventoryV2,
} from "./execution-evidence-v5-r4.mjs";
import { validateProviderAuthorizationV5R4 } from "./route-authorization-v5-r4.mjs";
import {
  buildReferenceSealValidationReceiptV5R4,
  validateMachineReferenceSealV5R4,
} from "./reference-label-seal-v5-r4.mjs";
import {
  resolveSuccessfulRoleOutputV5R4,
  validateExecutionLedgerEntriesV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import {
  C0_REASON_CODES_V5_R4,
  C0_TRIGGER_ENGINE_HASH_V5_R4,
} from "./method-kernel-v5-r4.mjs";

const C0_REASON_CODES = C0_REASON_CODES_V5_R4;
const C0_ROLE_SET = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);
export { C0_TRIGGER_ENGINE_HASH_V5_R4 };

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function exactProviderTuple(output, role) {
  return output.provider === "DEEPSEEK_DIRECT" && output.model === "deepseek-v4-pro"
    && output.endpoint === "https://api.deepseek.com/chat/completions" && output.role === role;
}

export function buildDeepSeekExecutionRegistrationV5R4(input) {
  const { registration, review, deepSeekAuthorization, inventory, referenceSeal, referenceSealValidationReceipt, registeredAt } = input;
  const errors = [
    ...validateRunnerRegistrationV5R4(registration),
    ...validateFreshA11RunnerReviewV5R4({ registration, review }),
    ...validateSampleExecutionInventoryV2({ registration, inventory }),
    ...validateProviderAuthorizationV5R4({ ...input.deepSeekAuthorizationContext, registration, review, inventory, authorization: deepSeekAuthorization, at: registeredAt }),
    ...validateMachineReferenceSealV5R4({ ...input.referenceSealContext, registration, inventory, seal: referenceSeal }),
    ...validateClosedSelfHashedArtifactV5R4(referenceSealValidationReceipt, "ReferenceSealValidationReceiptV1"),
  ];
  requireCondition(errors.length === 0, errors.join("; "));
  const rebuiltValidation = buildReferenceSealValidationReceiptV5R4({
    ...input.referenceSealContext,
    registration,
    inventory,
    seal: referenceSeal,
    validatedAt: referenceSealValidationReceipt.validatedAt,
  });
  requireCondition(canonicalJsonV5R3(rebuiltValidation) === canonicalJsonV5R3(referenceSealValidationReceipt), "reference seal validation receipt does not rebuild from the actual seal and ledger");
  requireCondition(deepSeekAuthorization.provider === "DEEPSEEK_DIRECT"
    && deepSeekAuthorization.referenceSealHash === referenceSeal.selfHash
    && deepSeekAuthorization.referenceAttemptChainHash === referenceSeal.attemptChainHash
    && deepSeekAuthorization.sampleExecutionInventoryHash === inventory.selfHash, "DeepSeek authorization does not bind the actual reference seal, attempt chain, and inventory");
  requireCondition(Date.parse(referenceSeal.sealedAt) < Date.parse(referenceSealValidationReceipt.validatedAt)
    && Date.parse(referenceSealValidationReceipt.validatedAt) < Date.parse(deepSeekAuthorization.issuedAt)
    && Date.parse(deepSeekAuthorization.issuedAt) < Date.parse(registeredAt), "reference seal, validation, DeepSeek authorization, and execution registration chronology is invalid");
  const artifact = sealV5R3Artifact({
    schemaVersion: "DeepSeekExecutionRegistrationV2",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt,
    runnerRegistrationHash: registration.selfHash,
    freshRunnerReviewHash: review.selfHash,
    deepSeekAuthorizationHash: deepSeekAuthorization.selfHash,
    referenceSealHash: referenceSeal.selfHash,
    referenceAttemptChainHash: referenceSeal.attemptChainHash,
    referenceLedgerTerminalHash: referenceSeal.executionLedgerTerminalHash,
    referenceSealValidationReceiptHash: referenceSealValidationReceipt.selfHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    frameRegistrationHash: registration.frameRegistrationHash,
    sampleManifestHash: registration.sampleManifestHash,
    c0RandomAuditHash: registration.c0RandomAuditHash,
    routeEvidenceBundleHash: deepSeekAuthorization.routeEvidenceBundleHash,
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    adapterHash: deepSeekAuthorization.providerImplementationHash,
  });
  assertClosedSelfHashedArtifactV5R4(artifact, "DeepSeekExecutionRegistrationV2");
  return artifact;
}

export function validateDeepSeekExecutionRegistrationV5R4(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R4(input?.executionRegistration, "DeepSeekExecutionRegistrationV2")];
  try {
    const rebuilt = buildDeepSeekExecutionRegistrationV5R4({ ...input, registeredAt: input.executionRegistration?.registeredAt });
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.executionRegistration)) errors.push("DeepSeek execution registration differs from full reference-seal reconstruction");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

function semanticFindingErrors(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.findings)) return ["ROLE_PAYLOAD_MALFORMED"];
  const ids = new Set();
  for (const finding of payload.findings) {
    if (!finding || typeof finding.findingId !== "string" || finding.findingId.length === 0 || ids.has(finding.findingId)
      || typeof finding.evidenceLocator !== "string" || finding.evidenceLocator.length === 0
      || !Object.hasOwn(TAXONOMY, finding.code) || finding.family !== TAXONOMY_FAMILY[finding.code]
      || finding.severity !== TAXONOMY[finding.code]) errors.push("FINDING_TAXONOMY_OR_IDENTITY_INVALID");
    else ids.add(finding.findingId);
  }
  if (payload.surfaceDisposition === "NO_FINDING" && payload.findings.length > 0) errors.push("NO_FINDING_WITH_FINDINGS");
  if (payload.surfaceDisposition === "FINDING" && payload.findings.length === 0) errors.push("FINDING_WITHOUT_FINDINGS");
  return [...new Set(errors)];
}

function critiqueRevisionConflicts(critique, revision) {
  const reasons = [];
  const critiqueIds = (critique.findings ?? []).map(({ findingId }) => findingId);
  const resolutions = revision.resolutions ?? [];
  const resolutionIds = resolutions.map(({ findingId }) => findingId);
  if (new Set(critiqueIds).size !== critiqueIds.length || new Set(resolutionIds).size !== resolutionIds.length
    || canonicalJsonV5R3([...critiqueIds].sort()) !== canonicalJsonV5R3([...resolutionIds].sort())) reasons.push("CRITIQUE_RESOLUTION_SET_MISMATCH");
  const expectedFinalIds = resolutions.filter(({ disposition }) => disposition !== "WITHDRAWN").map(({ findingId }) => findingId).sort();
  const finalIds = (revision.findings ?? []).map(({ findingId }) => findingId).sort();
  if (canonicalJsonV5R3(expectedFinalIds) !== canonicalJsonV5R3(finalIds)) reasons.push("REVISION_FINAL_FINDING_SET_MISMATCH");
  return reasons;
}

function itemLeafByHash({ itemLeaves, sampleManifest }) {
  requireCondition(Array.isArray(itemLeaves) && itemLeaves.length === 60, "C0 trigger engine requires exactly 60 protected item leaves");
  const result = new Map();
  for (const itemLeaf of itemLeaves) {
    const envelope = buildSampleBoundProtectedItemEnvelopeV4({ item: itemLeaf, sampleManifest });
    requireCondition(calculateFrozenNaturalItemLeafHashV4(itemLeaf) === envelope.itemHash && !result.has(envelope.itemHash), "C0 protected item leaf is duplicated or not bound to the sample manifest");
    result.set(envelope.itemHash, { itemLeaf, envelope, projection: deriveProtectedFrozenItemProjectionV4(itemLeaf) });
  }
  return result;
}

function deriveMandatoryReasons({ item, projection, critique, revision }) {
  const reasons = [];
  const findings = [...(critique.findings ?? []), ...(revision.findings ?? [])];
  if (findings.some(({ severity }) => ["P0", "P1"].includes(severity))) reasons.push("POSSIBLE_P0_OR_P1_MATH_OR_ANSWER_KEY");
  if (projection.region !== "CALIFORNIA" || projection.curriculumProfile !== "US_CA_MATH") reasons.push("AGE_GRADE_CURRICULUM_LANGUAGE_OR_REGION_RISK");
  const visualPresent = projection.diagram.presence === "PRESENT" || (projection.questionAssets.presence === "PRESENT" && projection.questionAssets.value.length > 0);
  if (visualPresent || findings.some(({ family }) => ["EVIDENCE_INTEGRITY", "OPTION_SET_INTEGRITY"].includes(family))) reasons.push("ANSWER_CRITICAL_VISUAL_OR_EVIDENCE");
  const missingOptions = projection.responseForm === "multiple-choice" && projection.options.presence !== "PRESENT";
  if (missingOptions && !(revision.findings ?? []).some(({ code }) => code === "MISSING_OR_MISMATCHED_OPTIONS")) reasons.push("DETERMINISTIC_VS_B_PRIME_CONFLICT");
  if (critiqueRevisionConflicts(critique, revision).length > 0) reasons.push("CRITIQUE_VS_REVISION_CONFLICT");
  if (semanticFindingErrors(critique).length > 0 || semanticFindingErrors(revision).length > 0) reasons.push("INVALID_TAXONOMY_SCHEMA_OR_ROLE");
  if (!item.egressEligible) reasons.push("SOURCE_RIGHTS_OR_RECONSTRUCTION_RISK");
  if (!["multiple-choice", "fill-in", "short-answer"].includes(projection.responseForm)) reasons.push("OUT_OF_SCOPE_METADATA_OR_EVIDENCE");
  if (!["Low", "Medium", "High"].includes(projection.difficulty)) reasons.push("DECLARED_OUT_OF_DISTRIBUTION");
  return [...new Set(reasons)].sort();
}

export function buildDeepSeekC0DecisionForItemV5R4({
  registration,
  executionRegistration,
  deepSeekAuthorization,
  inventory,
  sampleManifest,
  itemLeaves,
  ledgerEntries,
  itemHash,
}) {
  const protectedLeaves = itemLeafByHash({ itemLeaves, sampleManifest });
  const item = inventory.items.find((candidate) => candidate.itemHash === itemHash);
  const leaf = protectedLeaves.get(itemHash);
  requireCondition(item && leaf && leaf.envelope.itemPseudonym === item.itemIdPseudonym
    && leaf.envelope.homologyClusterId === item.clusterId, "C0 decision item is absent or differs from the frozen inventory");
  requireCondition(executionRegistration.runnerRegistrationHash === registration.selfHash
    && executionRegistration.deepSeekAuthorizationHash === deepSeekAuthorization.selfHash
    && executionRegistration.sampleExecutionInventoryHash === inventory.selfHash, "C0 decision roots are invalid");
  const critiqueOutput = resolveSuccessfulRoleOutputV5R4({ entries: ledgerEntries, authorization: deepSeekAuthorization, inventory, itemHash, role: "B_PRIME_CRITIQUE" }).output;
  const revisionOutput = resolveSuccessfulRoleOutputV5R4({ entries: ledgerEntries, authorization: deepSeekAuthorization, inventory, itemHash, role: "B_PRIME_REVISION" }).output;
  requireCondition(exactProviderTuple(critiqueOutput, "B_PRIME_CRITIQUE") && exactProviderTuple(revisionOutput, "B_PRIME_REVISION")
    && [critiqueOutput, revisionOutput].every((output) => output.referenceInputCount === 0 && output.deepSeekInputCount === 0), "C0 authoritative B-prime outputs violate tuple or reference blindness");
  const mandatoryReasonCodes = deriveMandatoryReasons({ item, projection: leaf.projection, critique: critiqueOutput.parsedPayload, revision: revisionOutput.parsedPayload });
  const triggerInput = {
    runnerRegistrationHash: registration.selfHash,
    executionRegistrationHash: executionRegistration.selfHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    clusterId: item.clusterId,
    itemLeafHash: calculateFrozenNaturalItemLeafHashV4(leaf.itemLeaf),
    privacyScreenEvidenceHash: item.privacyScreenEvidenceHash,
    rightsScreenEvidenceHash: item.rightsScreenEvidenceHash,
    critiqueOutputHash: critiqueOutput.selfHash,
    revisionOutputHash: revisionOutput.selfHash,
    mandatoryReasonCodes,
    referenceInputCount: 0,
  };
  return Object.freeze({
    manifestOrdinal: item.manifestOrdinal,
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    clusterId: item.clusterId,
    registeredRandomAudit: item.registeredRandomAudit,
    mandatoryReasonCodes,
    selectedForC0: item.registeredRandomAudit || mandatoryReasonCodes.length > 0,
    triggerInputHash: sha256V5R3(canonicalJsonV5R3(triggerInput)),
  });
}

export function buildDeepSeekC0ExecutionSetV5R4({
  registration,
  executionRegistration,
  deepSeekAuthorization,
  inventory,
  sampleManifest,
  itemLeaves,
  ledgerEntries,
}) {
  const errors = [
    ...validateRunnerRegistrationV5R4(registration),
    ...validateSampleExecutionInventoryV2({ registration, inventory }),
    ...validateClosedSelfHashedArtifactV5R4(executionRegistration, "DeepSeekExecutionRegistrationV2"),
    ...validateClosedSelfHashedArtifactV5R4(deepSeekAuthorization, "ProviderAuthorizationV4"),
    ...validateExecutionLedgerEntriesV5R4({ entries: ledgerEntries, authorization: deepSeekAuthorization, inventory }),
  ];
  requireCondition(errors.length === 0, errors.join("; "));
  requireCondition(executionRegistration.runnerRegistrationHash === registration.selfHash
    && executionRegistration.deepSeekAuthorizationHash === deepSeekAuthorization.selfHash
    && executionRegistration.sampleExecutionInventoryHash === inventory.selfHash
    && sampleManifest.sampleManifestHash === registration.sampleManifestHash, "C0 execution roots are invalid");
  const protectedLeaves = itemLeafByHash({ itemLeaves, sampleManifest });
  const decisions = [];
  for (const item of inventory.items) {
    const leaf = protectedLeaves.get(item.itemHash);
    requireCondition(leaf && leaf.envelope.itemPseudonym === item.itemIdPseudonym && leaf.envelope.homologyClusterId === item.clusterId, "C0 item leaf identity differs from inventory");
    decisions.push(buildDeepSeekC0DecisionForItemV5R4({ registration, executionRegistration, deepSeekAuthorization, inventory,
      sampleManifest, itemLeaves, ledgerEntries, itemHash: item.itemHash }));
  }
  const selectedItemHashes = decisions.filter(({ selectedForC0 }) => selectedForC0).map(({ itemHash }) => itemHash);
  const mandatoryItemCount = decisions.filter(({ mandatoryReasonCodes }) => mandatoryReasonCodes.length > 0).length;
  const expectedSuccessfulCallCount = 120 + (5 * selectedItemHashes.length);
  requireCondition(selectedItemHashes.length >= 12 && selectedItemHashes.length <= 60
    && expectedSuccessfulCallCount <= deepSeekAuthorization.maximumSuccessfulCalls, "DeepSeek C0 selection is incomplete or exceeds the immutable successful-call cap");
  const set = sealV5R3Artifact({
    schemaVersion: "DeepSeekC0ExecutionSetV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: registration.selfHash,
    executionRegistrationHash: executionRegistration.selfHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    c0RandomAuditHash: registration.c0RandomAuditHash,
    triggerEngineHash: C0_TRIGGER_ENGINE_HASH_V5_R4,
    registeredRandomAuditCount: decisions.filter(({ registeredRandomAudit }) => registeredRandomAudit).length,
    mandatoryItemCount,
    uniqueC0ItemCount: selectedItemHashes.length,
    expectedSuccessfulCallCount,
    decisions,
    selectedItemHashes,
  });
  assertClosedSelfHashedArtifactV5R4(set, "DeepSeekC0ExecutionSetV2");
  return set;
}

export function validateDeepSeekC0ExecutionSetV5R4(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R4(input?.c0ExecutionSet, "DeepSeekC0ExecutionSetV2")];
  try {
    const rebuilt = buildDeepSeekC0ExecutionSetV5R4(input);
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.c0ExecutionSet)) errors.push("C0 execution set differs from exact item/B-prime reconstruction");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export const DEEPSEEK_EXECUTION_CONTROL_V5_R4_CONSTANTS = Object.freeze({
  c0ReasonCodes: C0_REASON_CODES,
  c0RoleSet: C0_ROLE_SET,
  c0TriggerEngineHash: C0_TRIGGER_ENGINE_HASH_V5_R4,
});
