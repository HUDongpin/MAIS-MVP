import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  calculateArtifactHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";

const FROZEN_FIELDS = Object.freeze(["localDeterministicEvidence", "bPrimeCritique", "bPrimeRevision", "validatedScope"]);
const FROZEN_REASONS = Object.freeze([...DESIGN.providerControls.deepSeekEnvelope.c0PrimeMandatoryTriggerPredicates]);
const LOCAL_ALGORITHM_SET_HASH = sha256V5R3("MAIS_NATURAL_CA60_V5_R5_LOCAL_DETERMINISTIC_C0_EVIDENCE_V1");

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function exactObject(value) { return value && typeof value === "object" && !Array.isArray(value); }
function sortedUnique(values) { return [...new Set(values)].sort(); }
function exactKeys(value, keys) {
  return exactObject(value) && canonicalJsonV5R3(Object.keys(value).sort()) === canonicalJsonV5R3([...keys].sort());
}
function stringSet(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.length > 0)
    && new Set(value).size === value.length;
}
function exactStringSet(value, expected) {
  return stringSet(value) && canonicalJsonV5R3([...value].sort()) === canonicalJsonV5R3([...expected].sort());
}
function artifactHashMatches(value) {
  return exactObject(value) && typeof value.artifactHash === "string"
    && value.artifactHash === calculateArtifactHash(value, "artifactHash");
}

function findingKey(finding) { return `${finding?.code ?? "MALFORMED"}|${finding?.evidenceLocator ?? "MISSING"}`; }
function exactRoleOutput(output, role, itemHash) {
  return validateSelfHashV5R3(output) && output.provider === "DEEPSEEK_DIRECT" && output.model === "deepseek-v4-pro"
    && output.endpoint === "https://api.deepseek.com/chat/completions" && output.role === role && output.itemHash === itemHash
    && output.referenceInputCount === 0 && output.deepSeekInputCount === 0 && exactObject(output.parsedPayload);
}

export function buildC0PredicateInputFromProtectedEvidenceV5R5({ item, itemLeaf, critiqueOutput, revisionOutput }) {
  requireCondition(item && itemLeaf && item.itemHash === critiqueOutput?.itemHash && item.itemHash === revisionOutput?.itemHash,
    "C0 protected item and B-prime output identities differ");
  const critiqueValid = exactRoleOutput(critiqueOutput, "B_PRIME_CRITIQUE", item.itemHash)
    && critiqueOutput.parsedPayload.valid === true && Array.isArray(critiqueOutput.parsedPayload.findings)
    && Array.isArray(critiqueOutput.parsedPayload.requiredRevisionCodes);
  const revisionValid = exactRoleOutput(revisionOutput, "B_PRIME_REVISION", item.itemHash)
    && revisionOutput.parsedPayload.valid === true && Array.isArray(revisionOutput.parsedPayload.findings)
    && Array.isArray(revisionOutput.parsedPayload.resolutions);
  const critiqueFindings = critiqueValid ? critiqueOutput.parsedPayload.findings : [];
  const revisionFindings = revisionValid ? revisionOutput.parsedPayload.findings : [];
  const findingValid = (finding) => exactObject(finding) && typeof finding.findingId === "string" && finding.findingId.length > 0
    && typeof finding.code === "string" && typeof finding.family === "string" && ["P0", "P1", "P2"].includes(finding.severity)
    && typeof finding.evidenceLocator === "string" && finding.evidenceLocator.length > 0;
  const roleSchemaValid = critiqueValid && revisionValid && critiqueFindings.every(findingValid) && revisionFindings.every(findingValid);
  const localIssueCodes = [];
  const promptPresent = itemLeaf.prompt !== null && itemLeaf.prompt !== undefined;
  const answerPresent = itemLeaf.storedAnswer !== null && itemLeaf.storedAnswer !== undefined
    || itemLeaf.answer !== null && itemLeaf.answer !== undefined
    || Array.isArray(itemLeaf.acceptedAnswers) && itemLeaf.acceptedAnswers.length > 0;
  const optionsPresent = itemLeaf.responseForm !== "multiple-choice" || Array.isArray(itemLeaf.options) && itemLeaf.options.length >= 2;
  if (!promptPresent) localIssueCodes.push("PROMPT_MISSING");
  if (!answerPresent) localIssueCodes.push("ANSWER_MATERIAL_MISSING");
  if (!optionsPresent) localIssueCodes.push("MULTIPLE_CHOICE_OPTIONS_MISSING");
  const learnerIssueCodes = [];
  if (itemLeaf.region !== "CALIFORNIA") learnerIssueCodes.push("REGION_NOT_CALIFORNIA");
  if (itemLeaf.curriculumProfile !== "US_CA_MATH") learnerIssueCodes.push("PROFILE_NOT_US_CA_MATH");
  if (!["multiple-choice", "fill-in", "short-answer"].includes(itemLeaf.responseForm)) learnerIssueCodes.push("RESPONSE_FORM_OUT_OF_SCOPE");
  if (!["Low", "Medium", "High"].includes(itemLeaf.difficulty)) learnerIssueCodes.push("DIFFICULTY_OUT_OF_SCOPE");
  const requiredAssetTypes = [];
  if (itemLeaf.diagram != null) requiredAssetTypes.push("DIAGRAM");
  if (Array.isArray(itemLeaf.questionAssets) && itemLeaf.questionAssets.length > 0) requiredAssetTypes.push("QUESTION_ASSET");
  const verifiedAssetTypes = requiredAssetTypes.length === 0 ? [] : [];
  const deterministicFindingKeys = [
    ...localIssueCodes.map((code) => `${code}|LOCAL_STRUCTURE`),
    ...learnerIssueCodes.map((code) => `${code}|LOCAL_SCOPE`),
  ].sort();
  const localDeterministicEvidence = {
    schemaVersion: "C0LocalDeterministicEvidenceV1",
    algorithmSetHash: LOCAL_ALGORITHM_SET_HASH,
    itemHash: item.itemHash,
    mathAnswerKey: { screenComplete: true, issueCodes: [...localIssueCodes] },
    rightsProvenanceReconstruction: {
      screenComplete: typeof item.egressEligible === "boolean",
      disposition: item.egressEligible === true ? "CLEARED_FOR_AUTHORIZED_EGRESS" : "RESTRICTED_EGRESS",
      issueCodes: item.egressEligible === true ? [] : ["EGRESS_INELIGIBLE"],
    },
    learnerFit: { screenComplete: true, checkedDimensions: ["AGE", "GRADE", "CURRICULUM", "LANGUAGE", "REGION"], issueCodes: learnerIssueCodes },
    answerCriticalEvidence: { screenComplete: true, requiredAssetTypes, verifiedAssetTypes,
      issueCodes: requiredAssetTypes.length === 0 ? [] : ["ANSWER_CRITICAL_ASSET_REQUIRES_C0"] },
    validation: { schemaValid: roleSchemaValid, roleSequenceValid: critiqueValid && revisionValid,
      taxonomyCodesValid: roleSchemaValid, errorCodes: roleSchemaValid ? [] : ["B_PRIME_OUTPUT_INVALID"] },
    deterministicFindingKeys,
  };
  const bPrimeCritique = {
    schemaVersion: "BPrimeCritiqueEvidenceV1", itemHash: item.itemHash,
    requiredRevisionCodes: critiqueValid ? [...critiqueOutput.parsedPayload.requiredRevisionCodes] : [],
    validityStatus: critiqueValid ? "VALID" : "MALFORMED",
  };
  bPrimeCritique.artifactHash = calculateArtifactHash(bPrimeCritique, "artifactHash");
  const resolutionIds = revisionValid ? new Set(revisionOutput.parsedPayload.resolutions.map(({ findingId }) => findingId)) : new Set();
  const allCritiqueResolved = critiqueValid && revisionValid && critiqueFindings.every(({ findingId }) => resolutionIds.has(findingId));
  const bPrimeRevision = {
    schemaVersion: "BPrimeRevisionEvidenceV1", itemHash: item.itemHash,
    resolvedCritiqueCodes: allCritiqueResolved ? [...critiqueOutput.parsedPayload.requiredRevisionCodes] : [],
    finalFindingKeys: revisionValid ? sortedUnique(revisionFindings.map(findingKey)) : [],
    validityStatus: revisionValid ? "VALID" : "MALFORMED",
  };
  bPrimeRevision.artifactHash = calculateArtifactHash(bPrimeRevision, "artifactHash");
  const itemScopeTags = [`REGION:${itemLeaf.region}`, `PROFILE:${itemLeaf.curriculumProfile}`, `GRADE:${itemLeaf.grade}`,
    `TOPIC:${itemLeaf.canonicalTopic}`, `RESPONSE:${itemLeaf.responseForm}`, `DIFFICULTY:${itemLeaf.difficulty}`];
  const validatedScope = {
    schemaVersion: "C0ValidatedScopeV1", itemHash: item.itemHash, itemScopeTags,
    allowedScopeTags: learnerIssueCodes.length === 0 ? [...itemScopeTags] : [], metadataEvidenceComplete: true,
    declaredDistribution: learnerIssueCodes.length === 0 ? "IN_SCOPE" : "OUT_OF_DISTRIBUTION",
  };
  const result = { localDeterministicEvidence, bPrimeCritique, bPrimeRevision, validatedScope };
  requireCondition(forbiddenReferencePath(result) === null, "C0 predicate reconstruction leaked reference-provider state");
  return Object.freeze(structuredClone(result));
}
function forbiddenReferencePath(value, parts = []) {
  if (!exactObject(value) && !Array.isArray(value)) return null;
  for (const [key, child] of Object.entries(value)) {
    const next = [...parts, key];
    if (/openai|reference|qwen/iu.test(key)) return next.join(".");
    const nested = forbiddenReferencePath(child, next);
    if (nested) return nested;
  }
  return null;
}

function malformed(input) {
  return !exactKeys(input, FROZEN_FIELDS)
    || FROZEN_FIELDS.some((field) => !exactObject(input[field]))
    || forbiddenReferencePath(input) !== null;
}

function derivePredicateReasons(input, itemHash) {
  if (malformed(input)) return ["INVALID_TAXONOMY_SCHEMA_OR_ROLE"];
  const { localDeterministicEvidence: local, bPrimeCritique: critique, bPrimeRevision: revision, validatedScope: scope } = input;
  const reasons = [];
  const localValid = exactKeys(local, ["schemaVersion", "algorithmSetHash", "itemHash", "mathAnswerKey",
    "rightsProvenanceReconstruction", "learnerFit", "answerCriticalEvidence", "validation", "deterministicFindingKeys"])
    && local.schemaVersion === "C0LocalDeterministicEvidenceV1" && local.itemHash === itemHash
    && /^[0-9a-f]{64}$/u.test(local.algorithmSetHash ?? "");

  const math = localValid ? local.mathAnswerKey : null;
  const mathValid = exactKeys(math, ["screenComplete", "issueCodes"])
    && math.screenComplete === true && stringSet(math.issueCodes);
  if (!mathValid || math.issueCodes.length > 0) reasons.push("POSSIBLE_P0_OR_P1_MATH_OR_ANSWER_KEY");

  const rights = localValid ? local.rightsProvenanceReconstruction : null;
  const rightsValid = exactKeys(rights, ["screenComplete", "disposition", "issueCodes"])
    && rights.screenComplete === true && stringSet(rights.issueCodes)
    && ["CLEARED_FOR_AUTHORIZED_EGRESS", "RESTRICTED_EGRESS", "COPYRIGHT_OR_LICENSE_RISK", "PROVENANCE_RISK",
      "RECONSTRUCTION_RISK", "UNKNOWN", "MALFORMED"].includes(rights.disposition);
  if (!rightsValid || rights.disposition !== "CLEARED_FOR_AUTHORIZED_EGRESS" || rights.issueCodes.length > 0) {
    reasons.push("SOURCE_RIGHTS_OR_RECONSTRUCTION_RISK");
  }

  const learner = localValid ? local.learnerFit : null;
  const learnerValid = exactKeys(learner, ["screenComplete", "checkedDimensions", "issueCodes"])
    && learner.screenComplete === true
    && exactStringSet(learner.checkedDimensions, ["AGE", "GRADE", "CURRICULUM", "LANGUAGE", "REGION"])
    && stringSet(learner.issueCodes);
  if (!learnerValid || learner.issueCodes.length > 0) reasons.push("AGE_GRADE_CURRICULUM_LANGUAGE_OR_REGION_RISK");

  const critical = localValid ? local.answerCriticalEvidence : null;
  const criticalValid = exactKeys(critical, ["screenComplete", "requiredAssetTypes", "verifiedAssetTypes", "issueCodes"])
    && critical.screenComplete === true && stringSet(critical.requiredAssetTypes)
    && stringSet(critical.verifiedAssetTypes) && stringSet(critical.issueCodes);
  const missingCritical = criticalValid
    ? critical.requiredAssetTypes.filter((assetType) => !critical.verifiedAssetTypes.includes(assetType))
    : [];
  if (!criticalValid || critical.issueCodes.length > 0 || missingCritical.length > 0) reasons.push("ANSWER_CRITICAL_VISUAL_OR_EVIDENCE");

  const validation = localValid ? local.validation : null;
  const validationValid = exactKeys(validation, ["schemaValid", "roleSequenceValid", "taxonomyCodesValid", "errorCodes"])
    && validation.schemaValid === true && validation.roleSequenceValid === true
    && validation.taxonomyCodesValid === true && stringSet(validation.errorCodes) && validation.errorCodes.length === 0;
  const critiqueValid = exactKeys(critique, ["schemaVersion", "itemHash", "requiredRevisionCodes", "validityStatus", "artifactHash"])
    && critique.schemaVersion === "BPrimeCritiqueEvidenceV1" && critique.itemHash === itemHash
    && critique.validityStatus === "VALID" && stringSet(critique.requiredRevisionCodes) && artifactHashMatches(critique);
  const revisionValid = exactKeys(revision, ["schemaVersion", "itemHash", "resolvedCritiqueCodes", "finalFindingKeys", "validityStatus", "artifactHash"])
    && revision.schemaVersion === "BPrimeRevisionEvidenceV1" && revision.itemHash === itemHash
    && revision.validityStatus === "VALID" && stringSet(revision.resolvedCritiqueCodes)
    && stringSet(revision.finalFindingKeys) && artifactHashMatches(revision);
  const deterministicKeysValid = localValid && stringSet(local.deterministicFindingKeys);
  if (!revisionValid || !deterministicKeysValid
    || canonicalJsonV5R3([...(local?.deterministicFindingKeys ?? [])].sort()) !== canonicalJsonV5R3([...(revision?.finalFindingKeys ?? [])].sort())) {
    reasons.push("DETERMINISTIC_VS_B_PRIME_CONFLICT");
  }
  const unresolvedCritique = critiqueValid && revisionValid
    ? critique.requiredRevisionCodes.filter((code) => !revision.resolvedCritiqueCodes.includes(code))
    : [];
  if (!critiqueValid || !revisionValid || unresolvedCritique.length > 0) reasons.push("CRITIQUE_VS_REVISION_CONFLICT");
  if (!validationValid || !critiqueValid || !revisionValid) reasons.push("INVALID_TAXONOMY_SCHEMA_OR_ROLE");

  const scopeValid = exactKeys(scope, ["schemaVersion", "itemHash", "itemScopeTags", "allowedScopeTags", "metadataEvidenceComplete", "declaredDistribution"])
    && scope.schemaVersion === "C0ValidatedScopeV1" && scope.itemHash === itemHash
    && stringSet(scope.itemScopeTags) && stringSet(scope.allowedScopeTags) && scope.metadataEvidenceComplete === true
    && ["IN_SCOPE", "OUT_OF_DISTRIBUTION", "UNKNOWN", "MALFORMED"].includes(scope.declaredDistribution);
  const outOfScopeTags = scopeValid ? scope.itemScopeTags.filter((tag) => !scope.allowedScopeTags.includes(tag)) : [];
  if (!scopeValid || outOfScopeTags.length > 0) reasons.push("OUT_OF_SCOPE_METADATA_OR_EVIDENCE");
  if (!scopeValid || scope.declaredDistribution !== "IN_SCOPE") reasons.push("DECLARED_OUT_OF_DISTRIBUTION");
  return sortedUnique(reasons);
}

export function buildC0PredicateReceiptV5R5({ activeRunnerRegistrationHash, executionRegistrationHash, inventoryHash, item, predicateInput }) {
  requireCondition(typeof activeRunnerRegistrationHash === "string" && /^[0-9a-f]{64}$/u.test(activeRunnerRegistrationHash), "active runner hash is invalid");
  requireCondition(typeof executionRegistrationHash === "string" && /^[0-9a-f]{64}$/u.test(executionRegistrationHash), "DeepSeek execution registration hash is invalid");
  requireCondition(item && typeof item.itemHash === "string" && typeof item.itemIdPseudonym === "string", "C0 predicate item identity is invalid");
  const mandatoryReasonCodes = derivePredicateReasons(predicateInput, item.itemHash);
  requireCondition(mandatoryReasonCodes.every((reason) => FROZEN_REASONS.includes(reason)), "C0 predicate emitted a non-frozen reason code");
  const receipt = sealV5R3Artifact({
    schemaVersion: "DeepSeekC0PredicateReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    executionRegistrationHash,
    sampleExecutionInventoryHash: inventoryHash,
    itemHash: item.itemHash,
    itemIdPseudonym: item.itemIdPseudonym,
    manifestOrdinal: item.manifestOrdinal,
    frozenPredicateInputFields: [...FROZEN_FIELDS],
    predicateInput: structuredClone(predicateInput),
    predicateInputHash: sha256V5R3(canonicalJsonV5R3(predicateInput)),
    malformedOrMissingInputDisposition: "TRIGGER",
    unknownInputDisposition: "TRIGGER",
    mandatoryReasonCodes,
    mandatoryTrigger: mandatoryReasonCodes.length > 0,
    registeredRandomAudit: item.registeredRandomAudit,
    selectedForC0: item.registeredRandomAudit || mandatoryReasonCodes.length > 0,
    openAIReferenceInputCount: 0,
  });
  assertClosedSelfHashedArtifactV5R5(receipt, "DeepSeekC0PredicateReceiptV1");
  return receipt;
}

export function validateC0PredicateReceiptV5R5(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(input?.predicateReceipt, "DeepSeekC0PredicateReceiptV1")];
  if (!validateSelfHashV5R3(input?.predicateReceipt)) errors.push("R5 C0 predicate receipt self-hash is invalid");
  try {
    const rebuilt = buildC0PredicateReceiptV5R5(input);
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.predicateReceipt)) errors.push("R5 C0 predicate receipt differs from exact four-input reconstruction");
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return Object.freeze([...new Set(errors)]);
}

export function buildDeepSeekC0ExecutionSetV5R5({ activeRunnerRegistrationHash, executionRegistrationHash, inventory, predicateInputsByItem }) {
  requireCondition(inventory?.items?.length === 60 && predicateInputsByItem instanceof Map && predicateInputsByItem.size === 60,
    "R5 C0 execution set requires all 60 frozen items and four-field predicate inputs");
  const decisions = inventory.items.map((item) => buildC0PredicateReceiptV5R5({
    activeRunnerRegistrationHash,
    executionRegistrationHash,
    inventoryHash: inventory.selfHash,
    item,
    predicateInput: predicateInputsByItem.get(item.itemHash),
  }));
  const selectedItemHashes = decisions.filter(({ selectedForC0 }) => selectedForC0).map(({ itemHash }) => itemHash);
  requireCondition(selectedItemHashes.length >= 12 && selectedItemHashes.length <= 60, "R5 C0 union selection cardinality is invalid");
  const executionSet = sealV5R3Artifact({
    schemaVersion: "DeepSeekC0ExecutionSetV3",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash,
    executionRegistrationHash,
    sampleExecutionInventoryHash: inventory.selfHash,
    frozenPredicateInputFields: [...FROZEN_FIELDS],
    predicateReceiptHashes: decisions.map(({ selfHash }) => selfHash),
    decisions,
    selectedItemHashes,
    selectedItemCount: selectedItemHashes.length,
    expectedSuccessfulCallCount: 120 + (5 * selectedItemHashes.length),
    selectionFormula: "UNION(MANDATORY_TRIGGER_SET,RANDOM_AUDIT_12_SET)",
    unknownOrMalformedDisposition: "TRIGGER",
    openAIReferenceInputCount: 0,
  });
  assertClosedSelfHashedArtifactV5R5(executionSet, "DeepSeekC0ExecutionSetV3");
  return executionSet;
}

export function validateDeepSeekC0ExecutionSetV5R5(input) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(input?.c0ExecutionSet, "DeepSeekC0ExecutionSetV3")];
  if (!validateSelfHashV5R3(input?.c0ExecutionSet)) errors.push("R5 C0 execution set self-hash is invalid");
  try {
    const rebuilt = buildDeepSeekC0ExecutionSetV5R5(input);
    if (canonicalJsonV5R3(rebuilt) !== canonicalJsonV5R3(input.c0ExecutionSet)) errors.push("R5 C0 execution set differs from exact four-input reconstruction");
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return Object.freeze([...new Set(errors)]);
}

export const C0_TRIGGER_V5_R5_CONSTANTS = Object.freeze({
  frozenPredicateInputFields: FROZEN_FIELDS,
  frozenReasonCodes: FROZEN_REASONS,
  missingOrMalformedDisposition: "TRIGGER",
  unknownDisposition: "TRIGGER",
  localAlgorithmSetHash: LOCAL_ALGORITHM_SET_HASH,
});
