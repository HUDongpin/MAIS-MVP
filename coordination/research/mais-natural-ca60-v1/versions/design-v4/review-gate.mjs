import * as designContract from "./design-contract.mjs";
import ON_DISK_DESIGN_REGISTRATION from "./design-registration.json" with { type: "json" };
import {
  calculateFrameRowsRootV3,
  calculateManifestTupleRootV3,
  deriveSamplePseudonymMappingV4,
  validateSampleAgainstFrame,
  validateRuntimeSourceEnumerationReceiptV1,
} from "./sample-contract.mjs";

const {
  calculateArtifactHash,
  calculateProviderAttemptChainHash,
  canonicalJson,
  deriveCounterfactualLedger,
  deriveExecutionIntegrity,
  deriveObservedEvaluationLedger,
  deriveOverallDecision,
  recomputeMetricSet,
  sha256Hex,
  validateFinalEvaluationBundle,
  validateProviderAttemptChainV1,
  validateReferenceLabelSealExecutionBundle,
} = designContract;

const DESIGN_ID = "MAIS-NATURAL-CA60-V4";
const V4_DESIGN_ID = "MAIS-NATURAL-CA60-V4";
const V4_DESIGN_SCHEMA_VERSION = "NaturalCaPilotDesignRegistrationV4";
const DESIGN_COMPONENT_HASH_FIELDS = Object.freeze([
  "taxonomyHash",
  "labelingAndAdjudicationHash",
  "analysisThresholdAndDecisionHash",
  "providerControlsHash",
  "samplingAndClusteringHash",
  "interfacesAndIntegrityHash",
]);
const FROZEN_METRIC_ORDER = Object.freeze([
  "SURFACE_SENSITIVITY",
  "SPECIFICITY",
  "FALSE_POSITIVE_RATE",
  "FAMILY_RECALL",
  "EXACT_CODE_AND_FAMILY_RECALL",
  "FAMILY_PRECISION",
  "EXACT_CODE_PRECISION",
  "FALSE_FINDINGS_PER_100",
  "P0_FALSE_NEGATIVE_COUNT",
  "P1_RECALL",
  "P2_MISSED_OR_UNRESOLVED_RATE",
]);

export { FROZEN_METRIC_ORDER };
export const DECISION_CEILING = designContract.DECISION_CEILING_V4;
export const CLAIM_SCOPE_CEILING = designContract.CLAIM_SCOPE_CEILING_V4;

export const TRUSTED_CONTEXT_FIELDS = Object.freeze([
  "activeDesignRegistrationHash",
  "activeExecutionRegistrationHash",
  "latestFinalEvaluationReceiptHash",
  "referenceSealHash",
  "frameRegistrationHash",
  "sampleManifestHash",
  "thresholdHash",
  "taxonomyHash",
  "labelSchemaHash",
  "adjudicationMethodHash",
  "severityRuleHash",
  "promptSetHash",
  "schemaSetHash",
  "runnerHash",
  "adapterHash",
  "statisticalPowerHash",
  "designSupersedesHash",
  "methodComponentRootSetHash",
  "reviewLedgerHeadHash",
  "finalFinishedAt",
]);

const FROZEN_ARTIFACT_BINDINGS = Object.freeze({
  threshold: "thresholdHash",
  taxonomy: "taxonomyHash",
  labelSchema: "labelSchemaHash",
  adjudicationMethod: "adjudicationMethodHash",
  severityRule: "severityRuleHash",
  promptSet: "promptSetHash",
  schemaSet: "schemaSetHash",
  runner: "runnerHash",
  adapter: "adapterHash",
  statisticalPower: "statisticalPowerHash",
  designSupersedes: "designSupersedesHash",
});

export const FORBIDDEN_INDEPENDENT_VERIFIER_IMPORT_PATTERNS = Object.freeze([
  "design-contract.mjs",
  "final-evaluation",
  "main-scorer",
  "deriveObservedEvaluationLedger",
  "deriveDeterministicFindingMatches",
  "deriveCounterfactualLedger",
  "recomputeMetricSet",
  "deriveOverallDecision",
  "recomputeC0TriggerInputFromProtectedItemV4",
  "deriveC0TriggerDecision",
  "deriveC0ExecutionSetV4",
  "deriveFinalReceiptSummariesV4",
  "validateFinalMetricComputationBundle",
  "validateFinalEvaluationBundle",
]);

export const FROZEN_PUBLIC_LIMITATION_CODES = Object.freeze([
  ...(Array.isArray(designContract.FROZEN_PUBLIC_LIMITATIONS_V4)
    ? designContract.FROZEN_PUBLIC_LIMITATIONS_V4
    : []),
]);
const PUBLIC_LIMITATION_TEXT_BY_CODE = Object.freeze({
  CALIFORNIA_EGRESS_ELIGIBLE_SUBPOPULATION_ONLY: "This pilot applies only to the frozen California runtime-visible, provider-egress-eligible subpopulation.",
  MACHINE_REFERENCE_PANEL_NOT_HUMAN_GOLD: "Reference labels come from a machine-reference panel and are not human gold labels or expert consensus.",
  SAME_MODEL_CORRELATED_ERROR_RISK: "Qwen rater and adjudicator roles use the same model and may share correlated systematic errors.",
  CA60_STRUCTURALLY_UNDERPOWERED_FOR_JOINT_SURFACE_GATES: "CA60 cannot simultaneously satisfy the frozen sensitivity and specificity confidence thresholds even at perfect observed performance.",
  NO_CROSS_REGION_COMPARISON: "This California-only pilot does not support California, Hong Kong, or Mainland China comparisons.",
  NO_GENERAL_MACHINE_QA_VALIDITY_CLAIM: "The pilot does not establish general, universal, production, cross-region, or future machine-QA validity.",
  NO_AUTOMATIC_PROMOTION_DEPLOYMENT_OR_LIVE_CONTENT_MUTATION: "The pilot does not authorize automatic promotion, deployment, or live content mutation.",
});
export const FROZEN_PUBLIC_LIMITATIONS = Object.freeze(FROZEN_PUBLIC_LIMITATION_CODES.map((code) => Object.freeze({
  code,
  text: PUBLIC_LIMITATION_TEXT_BY_CODE[code] ?? `Registered limitation: ${code}`,
})));

export const PUBLIC_LIMITATION_SET_HASH = sha256Hex(canonicalJson(FROZEN_PUBLIC_LIMITATION_CODES));
export const PUBLIC_CLAIM_TEMPLATE_HASH = sha256Hex(canonicalJson({
  decisionCeiling: DECISION_CEILING,
  claimScopeCeiling: CLAIM_SCOPE_CEILING,
  prohibitedStatuses: ["PASS", "APPROVED", "PRODUCTION_READY", "LIMITED_GENERALIZATION_EVIDENCE"],
}));

const AGGREGATE_PUBLICATION_AUTHORIZATION_STATUS = Object.freeze({
  schemaVersion: "AggregatePublicationAuthorizationStatusV1",
  allowed: false,
  status: "BLOCKED_PENDING_A21_PROTECTED_CUSTODY_REGISTRY",
  authorizationAvailable: false,
  callerSuppliedRootsAuthorized: false,
  blockerCodes: Object.freeze(["EXECUTION_CUSTODY_REGISTRY_NOT_IMPLEMENTED"]),
  requiredCustodyArtifactSchema: "ProtectedExecutionCustodyRegistryV1",
  protectedRegistryRootHash: null,
  runnerHash: null,
});

/**
 * Publication authorization is intentionally unavailable until the A21 runner
 * pins the active execution, authorization, and review-head roots in a
 * protected custody registry that cannot be selected through report evidence.
 */
export function evaluateAggregatePublicationAuthorizationV1() {
  return AGGREGATE_PUBLICATION_AUTHORIZATION_STATUS;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isHash(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function hasValidSelfHash(artifact, field) {
  try {
    return isObject(artifact) && isHash(artifact[field]) && artifact[field] === calculateArtifactHash(artifact, field);
  } catch {
    return false;
  }
}

function exact(left, right) {
  try {
    return canonicalJson(left) === canonicalJson(right);
  } catch {
    return false;
  }
}

function registeredDesignComponentHashes(registration) {
  return registration?.designComponentHashes ?? registration?.frozenContractHashes;
}

function canonicalHash(value) {
  try {
    return sha256Hex(canonicalJson(value));
  } catch {
    return null;
  }
}

function addError(errors, message) {
  if (!errors.includes(message)) errors.push(message);
}

function exactKeys(value, fields) {
  return isObject(value) && exact(Object.keys(value).sort(), [...fields].sort());
}

function validTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function timestampAtOrBefore(left, right) {
  return validTimestamp(left) && validTimestamp(right) && Date.parse(left) <= Date.parse(right);
}

function artifactRoot(artifact, hashField) {
  return hasValidSelfHash(artifact, hashField) ? artifact[hashField] : null;
}

/**
 * Validate the immutable design artifact that is actually shipped beside this
 * review gate. Runner, adapter, authorization, and execution roots are
 * deliberately absent: they are later-stage execution-registration evidence.
 */
function validateReviewDesignRegistrationV4AgainstTrustedRegistration(registration, trustedRegistration) {
  const errors = [];
  if (!isObject(registration)) return ["V4 design registration must be an object"];
  if (registration.schemaVersion !== V4_DESIGN_SCHEMA_VERSION
    || registration.designId !== V4_DESIGN_ID
    || registration.version !== 4
    || registration.designKind !== "IMMUTABLE_PRE_EXECUTION_DESIGN_REGISTRATION") {
    errors.push("actual review design registration is not the immutable V4 artifact");
  }
  if (!hasValidSelfHash(registration, "registrationHash")) {
    errors.push("actual V4 design registration self-hash mismatch");
  }
  const designComponentHashes = registeredDesignComponentHashes(registration);
  if (!isObject(designComponentHashes)
    || !exact(Object.keys(designComponentHashes).sort(), [...DESIGN_COMPONENT_HASH_FIELDS].sort())
    || DESIGN_COMPONENT_HASH_FIELDS.some((field) => !isHash(designComponentHashes[field]))) {
    errors.push("V4 design component hash catalog must contain exactly the six frozen design components");
  }
  const limitationCodes = registration.publicReportContract?.limitationCodes
    ?? registration.publicReport?.limitationCodes;
  if (!Array.isArray(limitationCodes) || limitationCodes.length === 0
    || limitationCodes.some((code) => typeof code !== "string" || code.length === 0)
    || new Set(limitationCodes).size !== limitationCodes.length) {
    errors.push("V4 registration public limitation-code set is missing, empty, or duplicated");
  }
  if (!exact(limitationCodes, FROZEN_PUBLIC_LIMITATION_CODES)) {
    errors.push("V4 registration public limitation-code set differs from the single imported frozen vocabulary");
  }
  if (!isObject(trustedRegistration)
    || registration.registrationHash !== trustedRegistration.registrationHash
    || !exact(registration, trustedRegistration)) {
    errors.push("review design registration is a stale or substituted whole bundle rather than the explicitly trusted V4 artifact");
  }
  return [...new Set(errors)];
}

export function validateReviewDesignRegistrationV4(registration) {
  return validateReviewDesignRegistrationV4AgainstTrustedRegistration(registration, ON_DISK_DESIGN_REGISTRATION);
}

function timestampBefore(left, right) {
  return validTimestamp(left) && validTimestamp(right) && Date.parse(left) < Date.parse(right);
}

/**
 * Validate the V4 append-only registration chain without pulling runner or
 * adapter roots backward into design freeze. The six design components come
 * only from the actual design registration; runner and adapter roots come from
 * their later artifacts and are bound by both authorizations and execution.
 */
function validateV4ReviewStageContextAgainstTrustedRegistration(stage, trustedDesignRegistration) {
  const errors = [];
  try {
    if (!isObject(stage)) return ["V4 review stage context must be an object"];
    for (const error of validateReviewDesignRegistrationV4AgainstTrustedRegistration(stage.designRegistration, trustedDesignRegistration)) addError(errors, error);
    const design = stage.designRegistration;
    const frame = stage.frameRegistration;
    const sample = stage.sampleManifest;
    const runner = stage.runnerArtifact;
    const adapter = stage.adapterArtifact;
    const qwenAuthorization = stage.qwenAuthorization;
    const referenceSeal = stage.referenceLabelSeal;
    const deepSeekAuthorization = stage.deepSeekAuthorization;
    const execution = stage.executionRegistration;

    for (const [name, artifact, hashField] of [
      ["runner", runner, "runnerHash"],
      ["adapter", adapter, "adapterHash"],
      ["frame", frame, "frameRegistrationHash"],
      ["sample", sample, "sampleManifestHash"],
      ["Qwen authorization", qwenAuthorization, "authorizationHash"],
      ["reference-label seal", referenceSeal, "sealHash"],
      ["DeepSeek authorization", deepSeekAuthorization, "authorizationHash"],
      ["execution registration", execution, "executionRegistrationHash"],
    ]) {
      if (!hasValidSelfHash(artifact, hashField)) addError(errors, `V4 ${name} artifact or ${hashField} self-hash mismatch`);
    }

    const registrationHash = design?.registrationHash;
    if (!isHash(registrationHash)) addError(errors, "V4 stage chain design registration root is invalid");
    for (const [name, artifact] of [
      ["runner", runner],
      ["adapter", adapter],
      ["frame", frame],
      ["sample", sample],
      ["Qwen authorization", qwenAuthorization],
      ["reference-label seal", referenceSeal],
      ["DeepSeek authorization", deepSeekAuthorization],
      ["execution registration", execution],
    ]) {
      if (artifact?.designId !== V4_DESIGN_ID || artifact?.registrationHash !== registrationHash) {
        addError(errors, `V4 ${name} does not bind the actual design registration root`);
      }
    }

    const designComponents = registeredDesignComponentHashes(design);
    if (!isObject(designComponents)) {
      addError(errors, "V4 actual design component catalog is unavailable");
    } else {
      for (const [name, artifact] of [
        ["Qwen authorization", qwenAuthorization],
        ["DeepSeek authorization", deepSeekAuthorization],
        ["execution registration", execution],
      ]) {
        if (Object.hasOwn(artifact ?? {}, "designComponentHashes")
          && !exact(artifact.designComponentHashes, designComponents)) {
          addError(errors, `V4 ${name} design component hashes differ from the actual design registration`);
        }
      }
    }

    if (Object.hasOwn(design ?? {}, "runnerHash") || Object.hasOwn(design ?? {}, "adapterHash")) {
      addError(errors, "V4 design registration must not pre-bind later runner or adapter roots");
    }
    for (const [name, artifact] of [
      ["Qwen authorization", qwenAuthorization],
      ["DeepSeek authorization", deepSeekAuthorization],
      ["execution registration", execution],
    ]) {
      if (artifact?.runnerHash !== runner?.runnerHash || artifact?.adapterHash !== adapter?.adapterHash) {
        addError(errors, `V4 ${name} does not bind the later runner and adapter roots`);
      }
    }

    if (sample?.frameRegistrationHash !== frame?.frameRegistrationHash) {
      addError(errors, "V4 sample manifest does not bind the frame registration root");
    }
    for (const [name, artifact] of [
      ["Qwen authorization", qwenAuthorization],
      ["reference-label seal", referenceSeal],
      ["DeepSeek authorization", deepSeekAuthorization],
      ["execution registration", execution],
    ]) {
      if (artifact?.frameRegistrationHash !== frame?.frameRegistrationHash
        || artifact?.sampleManifestHash !== sample?.sampleManifestHash) {
        addError(errors, `V4 ${name} does not bind the exact frame and sample roots`);
      }
    }
    if (referenceSeal?.qwenAuthorizationHash !== qwenAuthorization?.authorizationHash) {
      addError(errors, "V4 reference-label seal does not bind the Qwen authorization root");
    }
    if (deepSeekAuthorization?.referenceSealHash !== referenceSeal?.sealHash) {
      addError(errors, "V4 DeepSeek authorization does not bind the sealed machine-reference root");
    }
    if (execution?.qwenAuthorizationHash !== qwenAuthorization?.authorizationHash
      || execution?.referenceSealHash !== referenceSeal?.sealHash
      || execution?.deepSeekAuthorizationHash !== deepSeekAuthorization?.authorizationHash) {
      addError(errors, "V4 execution registration does not bind both authorizations and the reference-label seal");
    }

    if (!timestampBefore(design?.frozenAt, frame?.frozenAt)
      || !timestampBefore(frame?.frozenAt, sample?.manifestFrozenAt)
      || !timestampBefore(sample?.manifestFrozenAt, qwenAuthorization?.issuedAt)
      || !timestampBefore(qwenAuthorization?.issuedAt, referenceSeal?.referenceLabelsFrozenAt)
      || !timestampBefore(referenceSeal?.referenceLabelsFrozenAt, deepSeekAuthorization?.issuedAt)
      || !timestampBefore(deepSeekAuthorization?.issuedAt, execution?.frozenAt)) {
      addError(errors, "V4 registration chronology must be strictly design < frame < sample < Qwen authorization < reference seal < DeepSeek authorization < execution registration");
    }
    for (const [name, artifact] of [["runner", runner], ["adapter", adapter]]) {
      if (!validTimestamp(artifact?.frozenAt) || !timestampBefore(artifact.frozenAt, qwenAuthorization?.issuedAt)) {
        addError(errors, `V4 later ${name} artifact must be frozen before Qwen authorization without being required before design freeze`);
      }
    }
  } catch (error) {
    addError(errors, `V4 review stage context failed closed: ${error.message}`);
  }
  return [...new Set(errors)];
}

export function validateV4ReviewStageContext(stage) {
  return validateV4ReviewStageContextAgainstTrustedRegistration(stage, ON_DISK_DESIGN_REGISTRATION);
}

function authorizationRootProjection(authorization) {
  return {
    authorizationHash: authorization?.authorizationHash,
    priceSnapshotHash: authorization?.priceSnapshotHash ?? authorization?.priceSnapshot?.priceSnapshotHash,
    ownerGrantRootHash: authorization?.ownerGrantRootHash ?? authorization?.ownerGrantHash,
  };
}

/**
 * Compare provider artifacts with roots delivered outside the protected result
 * bundle. A copied root embedded in result evidence can never satisfy this
 * interface because it is expressly rejected and the trusted argument remains
 * mandatory.
 */
export function validateOutOfBandTrustedAuthorizationRootsV4(raw, trustedAuthorizationRoots) {
  const errors = [];
  try {
    if (!isObject(raw)) return ["V4 protected authorization evidence must be an object"];
    if (Object.hasOwn(raw, "trustedAuthorizationRoots")
      || Object.hasOwn(raw?.executionEvidence ?? {}, "trustedAuthorizationRoots")
      || Object.hasOwn(raw?.finalEvaluationBundle ?? {}, "trustedAuthorizationRoots")) {
      errors.push("V4 protected evidence must not supply its own trusted authorization roots");
    }
    if (!exactKeys(trustedAuthorizationRoots, ["qwen", "deepSeek", "routeProbe"])) {
      errors.push("V4 out-of-band trusted authorization root set must contain exactly Qwen, DeepSeek, and route-probe roots");
    }
    const executionEvidence = rawExecutionEvidence(raw) ?? raw.executionEvidence;
    const qwenAuthorization = executionEvidence?.referenceExecutionBundle?.authorization;
    const deepSeekAuthorization = executionEvidence?.deepSeekAuthorization;
    for (const [name, key, authorization] of [
      ["Qwen", "qwen", qwenAuthorization],
      ["DeepSeek", "deepSeek", deepSeekAuthorization],
    ]) {
      const supplied = authorizationRootProjection(authorization);
      const trusted = trustedAuthorizationRoots?.[key];
      if (!exactKeys(trusted, ["authorizationHash", "priceSnapshotHash", "ownerGrantRootHash"])
        || !Object.values(supplied).every(isHash) || !exact(supplied, trusted)) {
        errors.push(`V4 ${name} authorization does not equal the trusted out-of-band root`);
      }
    }
    const routeProbeAuthorization = raw?.routeProbeAuthorization
      ?? executionEvidence?.routeProbeAuthorization;
    const routeSupplied = {
      authorizationHash: routeProbeAuthorization?.authorizationHash,
      ownerGrantRootHash: routeProbeAuthorization?.ownerGrantRootHash ?? routeProbeAuthorization?.ownerGrantHash,
    };
    if (!hasValidSelfHash(routeProbeAuthorization, "authorizationHash")
      || !exactKeys(trustedAuthorizationRoots?.routeProbe, ["authorizationHash", "ownerGrantRootHash"])
      || !Object.values(routeSupplied).every(isHash)
      || !exact(routeSupplied, trustedAuthorizationRoots?.routeProbe)) {
      errors.push("V4 route-probe authorization does not equal the trusted out-of-band root");
    }
  } catch (error) {
    errors.push(`V4 out-of-band trusted authorization root validation failed closed: ${error.message}`);
  }
  return [...new Set(errors)];
}

function accountingIdentity(value) {
  const source = value?.itemIdentity ?? value?.manifestRow ?? value;
  return isObject(source) ? {
    itemHash: source.itemHash,
    itemIdPseudonym: source.itemIdPseudonym ?? value?.itemIdPseudonym ?? value?.itemProjection?.itemPseudonym,
    clusterId: source.clusterId,
  } : null;
}

function accountingIdentityKey(value) {
  const identity = accountingIdentity(value);
  return identity && isHash(identity.itemHash) && typeof identity.itemIdPseudonym === "string"
    && identity.itemIdPseudonym.length > 0 && typeof identity.clusterId === "string" && identity.clusterId.length > 0
    ? canonicalJson([identity.itemHash, identity.itemIdPseudonym, identity.clusterId])
    : null;
}

/** Validate the V4 60-item partition, including the preregistered 57-59 path. */
export function validateV4DeepSeekItemAccountingForReview(executionEvidence) {
  const errors = [];
  try {
    if (!isObject(executionEvidence)) return ["V4 DeepSeek accounting evidence must be an object"];
    const sampleRows = executionEvidence.sampleManifestRows;
    const sampleManifest = executionEvidence.sampleManifest;
    const complete = executionEvidence.deepSeekCompleteItemBundles;
    const missing = executionEvidence.deepSeekMissingReceiptItemBundles;
    const executionRegistration = executionEvidence.executionRegistration;
    const upstream = {
      registrationHash: executionEvidence.registrationHash ?? executionRegistration?.registrationHash,
      sampleManifestHash: executionEvidence.sampleManifestHash ?? executionRegistration?.sampleManifestHash,
      executionRegistrationHash: executionEvidence.executionRegistrationHash ?? executionRegistration?.executionRegistrationHash,
    };
    if (!Array.isArray(sampleRows) || sampleRows.length !== 60) {
      errors.push("V4 DeepSeek accounting requires exactly 60 manifest rows");
    }
    try {
      deriveSamplePseudonymMappingV4(sampleManifest);
      if (sampleManifest.sampleManifestHash !== upstream.sampleManifestHash
        || !exact(sampleRows, sampleManifest.selectedRows)) {
        errors.push("V4 DeepSeek accounting rows must equal the authoritative self-hashed sample manifest selectedRows");
      }
    } catch (error) {
      errors.push(`V4 DeepSeek accounting authoritative sample manifest invalid: ${error.message}`);
    }
    const sampleKeys = (sampleRows ?? []).map(accountingIdentityKey);
    if (sampleKeys.some((key) => key === null) || new Set(sampleKeys).size !== 60) {
      errors.push("V4 DeepSeek accounting manifest identities must be 60 unique item/hash/cluster tuples");
    }
    if (!Array.isArray(complete) || !Array.isArray(missing)
      || complete.length < 57 || complete.length > 60 || missing.length < 0 || missing.length > 3
      || complete.length + missing.length !== 60) {
      errors.push("V4 DeepSeek execution integrity requires 57-60 complete and at most three hash-bound missing receipt bundles");
    }
    const completeKeys = [];
    for (const [index, bundle] of (complete ?? []).entries()) {
      const key = accountingIdentityKey(bundle);
      const executionDisposition = bundle?.itemResult?.executionDisposition
        ?? bundle?.executionDisposition;
      if (key === null || executionDisposition !== "COMPLETE") {
        errors.push(`V4 complete DeepSeek item bundle ${index} identity or disposition invalid`);
      }
      completeKeys.push(key);
    }
    const missingKeys = [];
    for (const [index, bundle] of (missing ?? []).entries()) {
      const key = accountingIdentityKey(bundle);
      const missingReceiptErrors = designContract.validateMissingReceiptItemBundleV1(bundle);
      if (key === null || missingReceiptErrors.length > 0) {
        errors.push(`V4 missing receipt item bundle ${index} is malformed, unhashed, or contains a forbidden machine finding/result field`);
      }
      if (!Object.values(upstream).every(isHash)
        || bundle?.registrationHash !== upstream.registrationHash
        || bundle?.sampleManifestHash !== upstream.sampleManifestHash
        || bundle?.executionRegistrationHash !== upstream.executionRegistrationHash) {
        errors.push(`V4 missing receipt item bundle ${index} upstream hash binding mismatch`);
      }
      missingKeys.push(key);
    }
    const partitionKeys = [...completeKeys, ...missingKeys];
    if (partitionKeys.some((key) => key === null) || new Set(partitionKeys).size !== partitionKeys.length
      || !exact([...partitionKeys].sort(), [...sampleKeys].sort())) {
      errors.push("V4 complete and missing receipt identity partition must cover every manifest tuple exactly once");
    }
  } catch (error) {
    errors.push(`V4 DeepSeek item accounting failed closed: ${error.message}`);
  }
  return [...new Set(errors)];
}

const A11_C0_REVIEW_FIELDS_V4 = Object.freeze([
  "registrationHash",
  "sampleManifestHash",
  "executionRegistrationHash",
  "sampleRows",
  "registeredRandomAuditRows",
  "protectedItemBundles",
  "sealedTriggerInputs",
  "sealedTriggerDecisions",
  "sealedExecutionSet",
  "deepSeekSuccessfulCallCap",
]);

function c0Identity(value) {
  return isObject(value) ? {
    itemHash: value.itemHash,
    itemIdPseudonym: value.itemIdPseudonym,
    clusterId: value.clusterId,
  } : null;
}

/**
 * A11-side C0 recomputation. Only protected local leaves, B-prime outputs, the
 * frozen sample, and the registered random-audit rows enter the derivation.
 * Stored trigger inputs/decisions/execution-set artifacts are comparison
 * targets and are never accepted as derivation inputs.
 */
export function recomputeA11C0ReviewEvidenceV4(evidence, contracts = designContract) {
  if (!isObject(evidence)) throw new TypeError("A11 C0 review evidence must be an object");
  for (const field of A11_C0_REVIEW_FIELDS_V4) {
    if (!Object.hasOwn(evidence, field)) throw new TypeError(`A11 C0 review evidence missing ${field}`);
  }
  const rebuildInput = contracts?.recomputeC0TriggerInputFromProtectedItemV4;
  const deriveDecision = contracts?.deriveC0TriggerDecision;
  const deriveExecutionSet = contracts?.deriveC0ExecutionSetV4;
  if (typeof rebuildInput !== "function" || typeof deriveDecision !== "function" || typeof deriveExecutionSet !== "function") {
    throw new TypeError("A11 C0 review requires the frozen V4 input, decision, and execution-set contracts");
  }
  const upstream = {
    registrationHash: evidence.registrationHash,
    sampleManifestHash: evidence.sampleManifestHash,
    executionRegistrationHash: evidence.executionRegistrationHash,
  };
  if (Object.values(upstream).some((value) => !isHash(value))) {
    throw new TypeError("A11 C0 review upstream hashes are invalid");
  }
  if (!Array.isArray(evidence.sampleRows) || evidence.sampleRows.length !== 60) {
    throw new TypeError("A11 C0 review requires exactly 60 sample rows");
  }
  if (!Array.isArray(evidence.registeredRandomAuditRows) || evidence.registeredRandomAuditRows.length !== 12) {
    throw new TypeError("A11 C0 review requires exactly 12 registered random-audit rows");
  }
  if (!Array.isArray(evidence.protectedItemBundles) || evidence.protectedItemBundles.length !== 60) {
    throw new TypeError("A11 C0 review requires exactly 60 protected C0 item bundles");
  }

  const sampleByCluster = new Map();
  for (const row of evidence.sampleRows) {
    const identity = c0Identity(row);
    if (!identity || !isHash(identity.itemHash) || typeof identity.itemIdPseudonym !== "string"
      || identity.itemIdPseudonym.length === 0 || typeof identity.clusterId !== "string" || identity.clusterId.length === 0
      || sampleByCluster.has(identity.clusterId)) {
      throw new TypeError("A11 C0 review sample identities must contain 60 unique clusters");
    }
    sampleByCluster.set(identity.clusterId, identity);
  }
  if (new Set([...sampleByCluster.values()].map(({ itemHash }) => itemHash)).size !== 60
    || new Set([...sampleByCluster.values()].map(({ itemIdPseudonym }) => itemIdPseudonym)).size !== 60) {
    throw new TypeError("A11 C0 review sample identities must contain 60 unique items");
  }
  const randomClusters = new Set();
  for (const row of evidence.registeredRandomAuditRows) {
    const expected = sampleByCluster.get(row?.clusterId);
    if (!expected || !exact(c0Identity(row), expected) || randomClusters.has(row.clusterId)) {
      throw new TypeError("A11 C0 registered random audit does not equal 12 unique sample identities");
    }
    randomClusters.add(row.clusterId);
  }
  const bundleByCluster = new Map();
  for (const bundle of evidence.protectedItemBundles) {
    const identity = c0Identity(bundle?.itemIdentity);
    const expected = sampleByCluster.get(identity?.clusterId);
    if (!expected || !exact(identity, expected) || bundleByCluster.has(identity.clusterId)) {
      throw new TypeError("A11 protected C0 item bundle identity differs from the frozen sample");
    }
    if (bundle.registeredRandomAudit !== randomClusters.has(identity.clusterId)) {
      throw new TypeError("A11 protected C0 item bundle random-audit flag differs from registration");
    }
    bundleByCluster.set(identity.clusterId, bundle);
  }

  const triggerInputs = evidence.sampleRows.map((row) => rebuildInput(bundleByCluster.get(row.clusterId), upstream));
  const triggerDecisions = triggerInputs.map((input) => deriveDecision(input));
  if (!Array.isArray(evidence.sealedTriggerInputs) || evidence.sealedTriggerInputs.length !== 60
    || !exact(evidence.sealedTriggerInputs, triggerInputs)) {
    throw new TypeError("A11 recomputed trigger inputs differ from the 60 sealed trigger inputs");
  }
  if (!Array.isArray(evidence.sealedTriggerDecisions) || evidence.sealedTriggerDecisions.length !== 60
    || !exact(evidence.sealedTriggerDecisions, triggerDecisions)) {
    throw new TypeError("A11 recomputed trigger decisions differ from the 60 sealed trigger decisions");
  }
  const executionSet = deriveExecutionSet({
    ...upstream,
    sampleRows: evidence.sampleRows,
    registeredRandomAuditRows: evidence.registeredRandomAuditRows,
    triggerInputs,
    deepSeekSuccessfulCallCap: evidence.deepSeekSuccessfulCallCap,
  });
  if (!isObject(evidence.sealedExecutionSet) || !exact(evidence.sealedExecutionSet, executionSet)) {
    throw new TypeError("A11 recomputed C0 execution set differs from the sealed exact random-12 union mandatory execution set");
  }
  const result = {
    schemaVersion: "A11C0ReviewRecomputationV4",
    designId: contracts.DESIGN_ID,
    ...upstream,
    triggerInputCount: triggerInputs.length,
    triggerDecisionCount: triggerDecisions.length,
    triggerInputRootHash: executionSet.triggerInputRootHash,
    triggerDecisionRootHash: executionSet.triggerDecisionRootHash,
    executionSetHash: executionSet.executionSetHash,
  };
  result.recomputationRootHash = calculateArtifactHash(result, "recomputationRootHash");
  return { result, triggerInputs, triggerDecisions, executionSet };
}

export function validateA11C0ReviewEvidenceV4(evidence, contracts = designContract) {
  try {
    recomputeA11C0ReviewEvidenceV4(evidence, contracts);
    return [];
  } catch (error) {
    return [`A11 protected C0 recomputation failed closed: ${error.message}`];
  }
}

const FINAL_SUMMARY_SOURCE_FIELDS_V4 = Object.freeze([
  "matchingMatrix",
  "strata",
  "clusterWeights",
  "kishEffectiveSampleSize",
  "agreement",
  "adjudicationCount",
  "itemCount",
]);

/** Rebuild every frozen final-summary projection from its protected source. */
export function validateA11FinalReceiptSummariesV4(evidence, contracts = designContract) {
  const errors = [];
  try {
    if (!isObject(evidence) || !isObject(evidence.sourceEvidence)) {
      throw new TypeError("A11 final receipt summary source evidence is missing");
    }
    for (const field of FINAL_SUMMARY_SOURCE_FIELDS_V4) {
      if (!Object.hasOwn(evidence.sourceEvidence, field)) {
        throw new TypeError(`A11 final receipt summary source evidence missing ${field}`);
      }
    }
    if (typeof contracts?.deriveFinalReceiptSummariesV4 !== "function") {
      throw new TypeError("frozen V4 final receipt summary derivation contract unavailable");
    }
    const recomputed = contracts.deriveFinalReceiptSummariesV4(
      Object.fromEntries(FINAL_SUMMARY_SOURCE_FIELDS_V4.map((field) => [field, evidence.sourceEvidence[field]])),
    );
    if (isObject(evidence.finalReceipt)) {
      const recomputedRoot = recomputed.finalSummaryRootHash ?? recomputed.summaryRootHash;
      if (evidence.finalReceipt.matchingMatrixHash !== recomputed.matchingMatrixHash
        || !exact(evidence.finalReceipt.matchingMatrix, recomputed.matchingMatrix)
        || evidence.finalReceipt.strataSummaryHash !== recomputed.strataSummaryHash
        || !exact(evidence.finalReceipt.strataSummary, recomputed.strataSummary)
        || evidence.finalReceipt.clusterWeightSummaryHash !== recomputed.clusterWeightSummaryHash
        || !exact(evidence.finalReceipt.clusterWeightSummary, recomputed.clusterWeightSummary)
        || evidence.finalReceipt.kishEffectiveSampleSize !== recomputed.kishEffectiveSampleSize
        || evidence.finalReceipt.agreementSummaryHash !== recomputed.agreementSummaryHash
        || !exact(evidence.finalReceipt.agreementSummary, recomputed.agreementSummary)
        || !exact(evidence.finalReceipt.adjudicationSummary, recomputed.adjudicationSummary)
        || evidence.finalReceipt.finalSummaryRootHash !== recomputedRoot) {
        errors.push("A11 recomputed final receipt summaries differ from matching, strata, cluster-weight, Kish, agreement, or adjudication source evidence");
      }
    } else if (!isObject(evidence.finalReceiptSummaries) || !exact(evidence.finalReceiptSummaries, recomputed)) {
      errors.push("A11 recomputed final receipt summaries differ from matching, strata, cluster-weight, Kish, agreement, or adjudication source evidence");
    }
    const recomputedRootField = Object.hasOwn(recomputed, "finalSummaryRootHash")
      ? "finalSummaryRootHash"
      : "summaryRootHash";
    if (!hasValidSelfHash(recomputed, recomputedRootField)) {
      errors.push("A11 recomputed final receipt summaries root hash mismatch");
    }
  } catch (error) {
    errors.push(`A11 final receipt summaries failed closed: ${error.message}`);
  }
  return [...new Set(errors)];
}

function rawExecutionEvidence(raw) {
  if (isObject(raw?.executionEvidence)) return raw.executionEvidence;
  if (isObject(raw?.finalEvaluationBundle?.executionEvidence)) return raw.finalEvaluationBundle.executionEvidence;
  if (isObject(raw?.deepSeekExecutionBundle)) {
    return {
      referenceExecutionBundle: raw.referenceExecutionBundle,
      deepSeekAuthorization: raw.deepSeekExecutionBundle.authorization,
      deepSeekAuthorizationExpected: raw.deepSeekExecutionBundle.authorizationExpected,
      deepSeekAttemptChain: raw.deepSeekExecutionBundle.attemptChain,
      deepSeekItemBundles: raw.deepSeekExecutionBundle.itemBundles,
      c0ExecutionSet: raw.deepSeekExecutionBundle.c0ExecutionSet,
      executionRegistration: raw.executionRegistration,
      deviationEvidence: raw.deepSeekExecutionBundle.deviationEvidence ?? raw.deviationEvidence,
    };
  }
  return null;
}

function attemptTimes(raw) {
  const execution = rawExecutionEvidence(raw);
  const qwen = execution?.referenceExecutionBundle?.attemptChain;
  const deepSeek = execution?.deepSeekAttemptChain;
  const attempts = [
    ...(Array.isArray(qwen) ? qwen : []),
    ...(Array.isArray(deepSeek) ? deepSeek : []),
  ];
  return attempts.map((attempt) => attempt?.startedAt).filter(validTimestamp);
}

function contextArtifactRoots(raw, errors) {
  const executionEvidence = rawExecutionEvidence(raw);
  const roots = {};
  roots.activeDesignRegistrationHash = artifactRoot(raw?.designRegistration, "registrationHash");
  roots.activeExecutionRegistrationHash = artifactRoot(raw?.executionRegistration ?? executionEvidence?.executionRegistration, "executionRegistrationHash");
  roots.latestFinalEvaluationReceiptHash = artifactRoot(raw?.finalEvaluationBundle?.finalReceipt, "receiptHash");
  roots.referenceSealHash = artifactRoot(executionEvidence?.referenceExecutionBundle?.referenceSeal, "sealHash");
  roots.frameRegistrationHash = artifactRoot(raw?.frameRegistration, "frameRegistrationHash");
  roots.sampleManifestHash = artifactRoot(raw?.sampleManifest, "sampleManifestHash");
  for (const [artifactName, hashField] of Object.entries(FROZEN_ARTIFACT_BINDINGS)) {
    const artifact = raw?.frozenArtifacts?.[artifactName];
    roots[hashField] = artifactRoot(artifact, hashField);
    if (roots[hashField] === null) addError(errors, `frozen ${artifactName} artifact or ${hashField} self-hash mismatch`);
  }
  roots.reviewLedgerHeadHash = artifactRoot(raw?.reviewLedgerHead, "reviewLedgerHeadHash");
  roots.methodComponentRootSetHash = designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH;
  roots.finalFinishedAt = raw?.finalEvaluationBundle?.finalReceipt?.finalFinishedAt;
  return roots;
}

const V4_TRUSTED_STAGE_HEAD_FIELDS = Object.freeze([
  "activeDesignRegistrationHash",
  "activeExecutionRegistrationHash",
  "frameRegistrationHash",
  "sampleManifestHash",
  "referenceSealHash",
  "runnerHash",
  "adapterHash",
  "methodComponentRootSetHash",
  "latestFinalEvaluationReceiptHash",
  "reviewLedgerHeadHash",
  "finalFinishedAt",
]);

function v4StageContextFromProtectedRaw(raw) {
  const executionEvidence = rawExecutionEvidence(raw);
  return {
    designRegistration: raw?.designRegistration,
    runnerArtifact: raw?.runnerArtifact ?? raw?.executionArtifacts?.runner ?? raw?.frozenArtifacts?.runner,
    adapterArtifact: raw?.adapterArtifact ?? raw?.executionArtifacts?.adapter ?? raw?.frozenArtifacts?.adapter,
    frameRegistration: raw?.frameRegistration,
    sampleManifest: raw?.sampleManifest,
    qwenAuthorization: raw?.qwenAuthorization ?? executionEvidence?.referenceExecutionBundle?.authorization,
    referenceLabelSeal: raw?.referenceLabelSeal ?? executionEvidence?.referenceExecutionBundle?.referenceSeal,
    deepSeekAuthorization: raw?.deepSeekAuthorization ?? executionEvidence?.deepSeekAuthorization,
    executionRegistration: raw?.executionRegistration ?? executionEvidence?.executionRegistration,
  };
}

function validateV4ProtectedRegistrationContext(raw, trustedDesignRegistration) {
  const errors = [];
  const stage = v4StageContextFromProtectedRaw(raw);
  for (const error of validateV4ReviewStageContextAgainstTrustedRegistration(stage, trustedDesignRegistration)) addError(errors, error);
  const heads = raw?.currentHeads;
  if (!isObject(heads)) return [...errors, "V4 current trusted heads must be an object"];
  for (const field of V4_TRUSTED_STAGE_HEAD_FIELDS) {
    if (!Object.hasOwn(heads, field)) addError(errors, `V4 current trusted heads missing ${field}`);
  }
  const expectedHeads = {
    activeDesignRegistrationHash: stage.designRegistration?.registrationHash,
    activeExecutionRegistrationHash: stage.executionRegistration?.executionRegistrationHash,
    frameRegistrationHash: stage.frameRegistration?.frameRegistrationHash,
    sampleManifestHash: stage.sampleManifest?.sampleManifestHash,
    referenceSealHash: stage.referenceLabelSeal?.sealHash,
    runnerHash: stage.runnerArtifact?.runnerHash,
    adapterHash: stage.adapterArtifact?.adapterHash,
    methodComponentRootSetHash: designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH,
    latestFinalEvaluationReceiptHash: raw?.finalEvaluationBundle?.finalReceipt?.receiptHash,
    reviewLedgerHeadHash: raw?.reviewLedgerHead?.reviewLedgerHeadHash,
    finalFinishedAt: raw?.finalEvaluationBundle?.finalReceipt?.finalFinishedAt,
  };
  for (const field of V4_TRUSTED_STAGE_HEAD_FIELDS) {
    if (heads[field] !== expectedHeads[field]) addError(errors, `V4 current trusted head ${field} does not equal its self-hashed artifact`);
  }

  const finalReceipt = raw?.finalEvaluationBundle?.finalReceipt;
  if (!hasValidSelfHash(finalReceipt, "receiptHash")
    || finalReceipt?.designId !== V4_DESIGN_ID
    || finalReceipt?.registrationHash !== stage.designRegistration?.registrationHash
    || finalReceipt?.executionRegistrationHash !== stage.executionRegistration?.executionRegistrationHash
    || finalReceipt?.frameRegistrationHash !== stage.frameRegistration?.frameRegistrationHash
    || finalReceipt?.sampleManifestHash !== stage.sampleManifest?.sampleManifestHash
    || finalReceipt?.referenceSealHash !== stage.referenceLabelSeal?.sealHash) {
    addError(errors, "V4 final receipt does not bind every current self-hashed registration root");
  }
  if (!hasValidSelfHash(raw?.reviewLedgerHead, "reviewLedgerHeadHash")
    || raw?.reviewLedgerHead?.latestFinalEvaluationReceiptHash !== finalReceipt?.receiptHash) {
    addError(errors, "V4 review ledger head does not bind the exact final receipt");
  }

  const executionEvidence = rawExecutionEvidence(raw);
  const qwenAttempts = executionEvidence?.referenceExecutionBundle?.attemptChain;
  const deepSeekAttempts = executionEvidence?.deepSeekAttemptChain;
  if (!Array.isArray(qwenAttempts) || !Array.isArray(deepSeekAttempts)) {
    addError(errors, "V4 review context requires explicit Qwen and DeepSeek attempt arrays");
  } else {
    const qwenStarts = qwenAttempts.map((attempt) => attempt?.startedAt).filter(validTimestamp).sort();
    const qwenFinishes = qwenAttempts.map((attempt) => attempt?.finishedAt).filter(validTimestamp).sort();
    const deepSeekStarts = deepSeekAttempts.map((attempt) => attempt?.startedAt).filter(validTimestamp).sort();
    const allFinishes = [...qwenFinishes, ...deepSeekAttempts.map((attempt) => attempt?.finishedAt).filter(validTimestamp)].sort();
    if ((qwenStarts.length > 0 && !timestampBefore(stage.qwenAuthorization?.issuedAt, qwenStarts[0]))
      || (qwenFinishes.length > 0 && !timestampBefore(qwenFinishes.at(-1), stage.referenceLabelSeal?.referenceLabelsFrozenAt))
      || (deepSeekStarts.length > 0 && !timestampBefore(stage.executionRegistration?.frozenAt, deepSeekStarts[0]))
      || (allFinishes.length > 0 && !timestampBefore(allFinishes.at(-1), finalReceipt?.finalFinishedAt))) {
      addError(errors, "V4 provider-attempt and final-receipt chronology mismatch");
    }
  }
  if (!timestampBefore(stage.executionRegistration?.frozenAt, finalReceipt?.finalFinishedAt)) {
    addError(errors, "V4 final receipt must follow execution registration");
  }
  return [...new Set(errors)];
}

/**
 * Validate every trusted head against a complete immutable artifact. A bag of
 * hash strings is intentionally insufficient: each root must be recomputable
 * from the protected artifact that it names.
 */
function validateReviewRegistrationContextV1AgainstTrustedRegistration(raw, trustedDesignRegistration) {
  const errors = [];
  try {
    if (!isObject(raw)) return ["complete protected raw review evidence must be an object"];
    if (raw.designRegistration?.designId === V4_DESIGN_ID) {
      return validateV4ProtectedRegistrationContext(raw, trustedDesignRegistration);
    }
    if (!exactKeys(raw.currentHeads, TRUSTED_CONTEXT_FIELDS)) {
      errors.push("currentHeads must contain exactly the frozen active design, execution, evidence, review-head, and final-time fields");
    }
    if (!exactKeys(raw.frozenArtifacts, Object.keys(FROZEN_ARTIFACT_BINDINGS))) {
      errors.push("frozenArtifacts must contain exactly the threshold, taxonomy, label, adjudication, severity, prompt, schema, runner, adapter, power, and supersedes artifacts");
    }
    const observedRoots = contextArtifactRoots(raw, errors);
    for (const field of TRUSTED_CONTEXT_FIELDS) {
      if (field === "finalFinishedAt") {
        if (!validTimestamp(raw.currentHeads?.[field]) || raw.currentHeads?.[field] !== observedRoots[field]) {
          errors.push("finalFinishedAt must equal the self-hashed final receipt finish time");
        }
      } else if (!isHash(raw.currentHeads?.[field]) || raw.currentHeads?.[field] !== observedRoots[field]) {
        errors.push(`${field} is not backed by the exact current self-hashed artifact`);
      }
    }

    const design = raw.designRegistration;
    const executionEvidence = rawExecutionEvidence(raw);
    const execution = raw.executionRegistration ?? executionEvidence?.executionRegistration;
    const final = raw.finalEvaluationBundle?.finalReceipt;
    if (design?.schemaVersion !== "NaturalCaPilotDesignRegistrationV4" || design?.designId !== DESIGN_ID) {
      errors.push("active design registration schema or design mismatch");
    }
    if (execution?.schemaVersion !== "ExecutionRegistrationV1" || execution?.designId !== DESIGN_ID) {
      errors.push("active execution registration schema or design mismatch");
    }
    const executionBindings = [
      ["registrationHash", "activeDesignRegistrationHash"],
      ["frameRegistrationHash", "frameRegistrationHash"],
      ["sampleManifestHash", "sampleManifestHash"],
      ["referenceSealHash", "referenceSealHash"],
      ["thresholdHash", "thresholdHash"],
      ["taxonomyHash", "taxonomyHash"],
      ["labelSchemaHash", "labelSchemaHash"],
      ["adjudicationMethodHash", "adjudicationMethodHash"],
      ["severityRuleHash", "severityRuleHash"],
      ["methodComponentRootSetHash", "methodComponentRootSetHash"],
      ["promptSetHash", "promptSetHash"],
      ["schemaSetHash", "schemaSetHash"],
      ["runnerHash", "runnerHash"],
      ["adapterHash", "adapterHash"],
      ["statisticalPowerHash", "statisticalPowerHash"],
      ["designSupersedesHash", "designSupersedesHash"],
    ];
    const designComponentFields = new Set([
      "thresholdHash", "taxonomyHash", "labelSchemaHash", "adjudicationMethodHash", "severityRuleHash",
      "promptSetHash", "schemaSetHash", "runnerHash", "adapterHash", "statisticalPowerHash", "designSupersedesHash",
    ]);
    for (const [artifactField, headField] of executionBindings.filter(([field]) => designComponentFields.has(field))) {
      if (design?.[artifactField] !== raw.currentHeads?.[headField]) {
        errors.push(`design registration ${artifactField} does not bind the current frozen head`);
      }
    }
    for (const [artifactField, headField] of executionBindings) {
      if (execution?.[artifactField] !== raw.currentHeads?.[headField]) {
        errors.push(`execution registration ${artifactField} does not bind the current frozen head`);
      }
    }
    const c0SelectionHash = artifactRoot(raw.c0RandomAudit, "auditHash");
    if (c0SelectionHash === null || execution?.c0RandomAuditSelectionHash !== c0SelectionHash) {
      errors.push("execution registration does not bind the exact self-hashed C0 random-audit selection");
    }
    if (raw.frameRegistration?.registrationHash !== raw.currentHeads?.activeDesignRegistrationHash
      || raw.sampleManifest?.registrationHash !== raw.currentHeads?.activeDesignRegistrationHash
      || raw.sampleManifest?.frameRegistrationHash !== raw.currentHeads?.frameRegistrationHash) {
      errors.push("frame or sample registration does not bind the active design and frame heads");
    }
    if (final?.registrationHash !== raw.currentHeads?.activeDesignRegistrationHash
      || final?.executionRegistrationHash !== raw.currentHeads?.activeExecutionRegistrationHash
      || final?.frameRegistrationHash !== raw.currentHeads?.frameRegistrationHash
      || final?.sampleManifestHash !== raw.currentHeads?.sampleManifestHash
      || final?.referenceSealHash !== raw.currentHeads?.referenceSealHash) {
      errors.push("final receipt does not bind every active upstream registration head");
    }
    if (raw.reviewLedgerHead?.latestFinalEvaluationReceiptHash !== raw.currentHeads?.latestFinalEvaluationReceiptHash) {
      errors.push("review ledger head does not name the current final evaluation receipt");
    }

    const providerStarts = attemptTimes(raw);
    const firstProviderStart = providerStarts.length === 0 ? null : providerStarts.sort()[0];
    for (const [artifactName, artifact] of Object.entries(raw.frozenArtifacts ?? {})) {
      if (!validTimestamp(artifact?.frozenAt)) {
        errors.push(`frozen ${artifactName} artifact requires a valid frozenAt timestamp`);
      } else {
        if (validTimestamp(design?.frozenAt) && !timestampAtOrBefore(artifact.frozenAt, design.frozenAt)) {
          errors.push(`frozen ${artifactName} component was frozen after the design registration that binds it`);
        }
        if (firstProviderStart !== null && !timestampAtOrBefore(artifact.frozenAt, firstProviderStart)) {
          errors.push(`frozen ${artifactName} artifact was frozen after the first provider attempt`);
        }
      }
    }
    if (!validTimestamp(design?.frozenAt) || !validTimestamp(execution?.frozenAt)
      || !timestampAtOrBefore(design?.frozenAt, execution?.frozenAt)) {
      errors.push("design and execution registration freeze timestamps are invalid or reversed");
    }
    const frameFrozenAt = raw.frameRegistration?.frozenAt;
    const sampleFrozenAt = raw.sampleManifest?.manifestFrozenAt;
    const c0FrozenAt = raw.c0RandomAudit?.frozenAt;
    if (!validTimestamp(frameFrozenAt) || !validTimestamp(sampleFrozenAt) || !validTimestamp(c0FrozenAt)
      || !timestampAtOrBefore(design?.frozenAt, frameFrozenAt)
      || !timestampAtOrBefore(frameFrozenAt, sampleFrozenAt)
      || !timestampAtOrBefore(sampleFrozenAt, c0FrozenAt)) {
      errors.push("design, frame, sample, and C0 freeze timestamps are invalid or reversed");
    }
    if (firstProviderStart !== null && !timestampAtOrBefore(c0FrozenAt, firstProviderStart)) {
      errors.push("C0 selection was not frozen before the first provider attempt");
    }
    const qwenAuthorizationIssuedAt = executionEvidence?.referenceExecutionBundle?.authorization?.issuedAt;
    if (validTimestamp(qwenAuthorizationIssuedAt) && !timestampAtOrBefore(c0FrozenAt, qwenAuthorizationIssuedAt)) {
      errors.push("frame, sample, and C0 selection were not frozen before Qwen authorization");
    }
    if (firstProviderStart !== null && !timestampAtOrBefore(design?.frozenAt, firstProviderStart)) {
      errors.push("design registration was not frozen before the first provider attempt");
    }
    const qwenFinished = executionEvidence?.referenceExecutionBundle?.referenceSeal?.referenceLabelsFrozenAt;
    const deepSeekStarts = (executionEvidence?.deepSeekAttemptChain ?? []).map((attempt) => attempt?.startedAt).filter(validTimestamp).sort();
    if (!validTimestamp(qwenFinished) || (deepSeekStarts.length > 0 && !timestampAtOrBefore(qwenFinished, deepSeekStarts[0]))) {
      errors.push("reference labels must be sealed before the first DeepSeek attempt");
    }
    const lastFinish = [
      ...(executionEvidence?.referenceExecutionBundle?.attemptChain ?? []),
      ...(executionEvidence?.deepSeekAttemptChain ?? []),
    ].map((attempt) => attempt?.finishedAt).filter(validTimestamp).sort().at(-1);
    if (!validTimestamp(final?.finalFinishedAt) || (lastFinish !== undefined && !timestampAtOrBefore(lastFinish, final.finalFinishedAt))) {
      errors.push("final receipt finalFinishedAt must follow every provider attempt");
    }
  } catch (error) {
    errors.push(`review registration context failed closed: ${error.message}`);
  }
  return [...new Set(errors)];
}

export function validateReviewRegistrationContextV1(raw) {
  return validateReviewRegistrationContextV1AgainstTrustedRegistration(raw, ON_DISK_DESIGN_REGISTRATION);
}

function expectedReviewedItems(evidence) {
  if (!Array.isArray(evidence?.sampleManifest?.selectedRows)) throw new TypeError("sampleManifest.selectedRows evidence must be an array");
  return evidence.sampleManifest.selectedRows.map(({ itemId, itemHash, clusterId }) => ({ itemId, itemHash, clusterId }));
}

function sourceEnumerationInvocationRoots(receipt) {
  return receipt.gradeProjectionInvocations.map((invocation) => ({
    grade: invocation.grade,
    invocationSequenceNumber: invocation.invocationSequenceNumber,
    orderedItemRootHash: invocation.orderedItemRootHash,
    sourceModuleRootHash: invocation.sourceModuleRootHash,
  }));
}

const SOURCE_ENUMERATION_RERUN_TUPLE_FIELDS = Object.freeze([
  "registrationHash",
  "sourceCommit",
  "runtimeConfigHash",
  "region",
  "curriculumProfile",
  "runtimeOrigin",
  "evidenceContractSchemaVersion",
  "evidenceContractHash",
  "extractorImplementationHash",
  "extractorRunnerCommit",
  "extractorRunnerHash",
]);
const SOURCE_ENUMERATION_RERUN_ROOT_FIELDS = Object.freeze([
  "expectedRuntimeInventoryRootHash",
  "serializedRuntimeVisibleRootHash",
  "serializationFailureInventoryRootHash",
  "sourceExclusionLedgerRootHash",
  "fullSourceEnumerationRootHash",
]);

function sourceEnumerationTuple(receipt) {
  return Object.fromEntries(SOURCE_ENUMERATION_RERUN_TUPLE_FIELDS.map((field) => [field, receipt[field]]));
}

function sourceEnumerationAggregateRoots(receipt) {
  return Object.fromEntries(SOURCE_ENUMERATION_RERUN_ROOT_FIELDS.map((field) => [field, receipt[field]]));
}

function validateIndependentRuntimeSourceEnumerationRerun(raw, independentReviewReceipt) {
  const errors = [];
  const protectedReceipt = raw?.runtimeExtractionSnapshot?.runtimeSourceEnumerationReceipt;
  const independentReceipt = raw?.independentRuntimeSourceEnumerationReceipt;
  try {
    validateRuntimeSourceEnumerationReceiptV1(protectedReceipt);
    validateRuntimeSourceEnumerationReceiptV1(independentReceipt);
  } catch (error) {
    return [`independent runtime source-enumeration rerun: ${error.message}`];
  }
  if (!exact(sourceEnumerationTuple(independentReceipt), sourceEnumerationTuple(protectedReceipt))) {
    errors.push("independent runtime source-enumeration rerun source/config/extractor tuple differs from the frozen source enumeration");
  }
  if (!exact(sourceEnumerationAggregateRoots(independentReceipt), sourceEnumerationAggregateRoots(protectedReceipt))) {
    errors.push("independent runtime source-enumeration rerun expected/runtime/serialized/failure/source-exclusion/full root set differs from the frozen source enumeration");
  }
  if (independentReceipt.sourceEnumerationReceiptHash === protectedReceipt.sourceEnumerationReceiptHash
    || independentReceipt.rawEvidenceArtifactRootHash === protectedReceipt.rawEvidenceArtifactRootHash) {
    errors.push("independent runtime source-enumeration rerun requires distinct receipt and raw-evidence roots");
  }
  const finalFinishedAt = raw?.finalEvaluationBundle?.finalReceipt?.finalFinishedAt;
  if (!validTimestamp(finalFinishedAt) || !validTimestamp(independentReceipt.enumeratedAt)
    || !validTimestamp(independentReviewReceipt?.reviewedAt)
    || Date.parse(finalFinishedAt) >= Date.parse(independentReceipt.enumeratedAt)
    || Date.parse(independentReceipt.enumeratedAt) >= Date.parse(independentReviewReceipt.reviewedAt)) {
    errors.push("independent runtime source-enumeration rerun requires final-receipt then rerun then review chronology");
  }
  if (!exact(
    sourceEnumerationInvocationRoots(independentReceipt),
    sourceEnumerationInvocationRoots(protectedReceipt),
  )) {
    errors.push("independent runtime source-enumeration rerun 13 grade invocation roots differ from the frozen source enumeration");
  }
  return errors;
}

export function calculateProtectedReviewInputRootV1(
  raw,
  trustedAuthorizationRoots = null,
  trustedLineageRuleApprovalHash = null,
) {
  if (!isObject(raw)) throw new TypeError("protected review evidence must be an object");
  const finalBundle = raw.finalEvaluationBundle ?? {};
  const protectedInput = {
    schemaVersion: "ProtectedReviewInputRootV1",
    designId: raw.designRegistration?.designId ?? DESIGN_ID,
    currentHeads: raw.currentHeads,
    designRegistration: raw.designRegistration,
    executionRegistration: raw.executionRegistration,
    frozenArtifacts: raw.frozenArtifacts,
    frameRows: raw.frameRows,
    runtimeExtractionSnapshot: raw.runtimeExtractionSnapshot ?? null,
    independentRuntimeSourceEnumerationReceipt: raw.independentRuntimeSourceEnumerationReceipt ?? null,
    cleanSourceEvidence: raw.cleanSourceEvidence ?? null,
    clusterAudit: raw.clusterAudit,
    frameRegistration: raw.frameRegistration,
    sampleManifest: raw.sampleManifest,
    c0RandomAudit: raw.c0RandomAudit,
    executionEvidence: rawExecutionEvidence(raw),
    finalEvaluationBundle: {
      finalReceipt: finalBundle.finalReceipt,
      itemResults: finalBundle.itemResults,
      counterfactualLedger: finalBundle.counterfactualLedger,
      metricInputs: finalBundle.metricInputs,
    },
    reviewLedgerHead: raw.reviewLedgerHead,
    mainScorerImplementationHash: raw.mainScorerImplementationHash,
    mainScorerDependencyHash: raw.mainScorerDependencyHash,
  };
  const protectedEvidenceRootHash = canonicalHash(protectedInput);
  if (raw.designRegistration?.designId !== V4_DESIGN_ID) return protectedEvidenceRootHash;
  return canonicalHash({
    schemaVersion: "ProtectedReviewInputRootV4",
    designId: V4_DESIGN_ID,
    protectedEvidenceRootHash,
    trustedAuthorizationRootSetHash: isObject(trustedAuthorizationRoots)
      ? canonicalHash(trustedAuthorizationRoots)
      : null,
    trustedLineageRuleApprovalHash: isHash(trustedLineageRuleApprovalHash)
      ? trustedLineageRuleApprovalHash
      : null,
  });
}

function sourceImportEdges(sourceFiles) {
  const edges = [];
  const importPattern = /(?:\bimport\s+(?:[^"']+?\s+from\s+)?|\bexport\s+[^"']+?\s+from\s+|\bimport\s*\()(["'])([^"']+)\1/gu;
  for (const source of sourceFiles) {
    let match;
    while ((match = importPattern.exec(source.content)) !== null) {
      edges.push({ from: source.path, specifier: match[2] });
    }
  }
  return edges.sort((left, right) => left.from < right.from ? -1 : left.from > right.from ? 1
    : left.specifier < right.specifier ? -1 : left.specifier > right.specifier ? 1 : 0);
}

export function validateVerifierIndependenceProofV1(proof, expected = {}) {
  const errors = [];
  try {
    if (!isObject(proof)) return ["independent verifier source-tree proof must be an object"];
    if (proof.schemaVersion !== "IndependentVerifierProofV1" || proof.designId !== DESIGN_ID) {
      errors.push("independent verifier proof schema or design mismatch");
    }
    const sources = proof.sourceFiles;
    if (!Array.isArray(sources) || sources.length === 0
      || sources.some((source) => !exactKeys(source, ["path", "content", "sha256"])
        || typeof source.path !== "string" || source.path.length === 0
        || typeof source.content !== "string" || source.sha256 !== sha256Hex(source.content))
      || new Set((sources ?? []).map((source) => source.path)).size !== sources?.length) {
      errors.push("independent verifier source files require unique paths, complete contents, and recomputed SHA-256 hashes");
    }
    const sourceRows = Array.isArray(sources)
      ? sources.map(({ path, sha256 }) => [path, sha256]).sort((left, right) => left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0)
      : [];
    if (proof.verifierSourceTreeHash !== canonicalHash(sourceRows)) errors.push("independent verifier source-tree hash mismatch");

    if (!isObject(proof.dependencyLock) || typeof proof.dependencyLock.path !== "string"
      || typeof proof.dependencyLock.content !== "string"
      || proof.dependencyLock.sha256 !== sha256Hex(proof.dependencyLock.content)
      || proof.dependencyLockHash !== canonicalHash([proof.dependencyLock.path, proof.dependencyLock.sha256])) {
      errors.push("independent verifier dependency-lock proof mismatch");
    }
    const derivedEdges = Array.isArray(sources) ? sourceImportEdges(sources) : [];
    if (!Array.isArray(proof.importGraph) || !exact(proof.importGraph, derivedEdges)
      || proof.importGraphHash !== canonicalHash(derivedEdges)) {
      errors.push("independent verifier import graph does not equal the parsed source imports");
    }
    if (!exact(proof.forbiddenScorerPatterns, FORBIDDEN_INDEPENDENT_VERIFIER_IMPORT_PATTERNS)) {
      errors.push("independent verifier forbidden-scorer pattern set mismatch");
    }
    const findings = [];
    for (const source of sources ?? []) {
      for (const pattern of FORBIDDEN_INDEPENDENT_VERIFIER_IMPORT_PATTERNS) {
        if (source.content.includes(pattern)) findings.push({ path: source.path, pattern });
      }
    }
    findings.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1
      : left.pattern < right.pattern ? -1 : left.pattern > right.pattern ? 1 : 0);
    const scan = {
      sourceTreeHash: proof.verifierSourceTreeHash,
      patterns: [...FORBIDDEN_INDEPENDENT_VERIFIER_IMPORT_PATTERNS],
      findings,
    };
    if (!Array.isArray(proof.forbiddenScorerFindings) || !exact(proof.forbiddenScorerFindings, findings)
      || findings.length !== 0 || proof.forbiddenScorerScanHash !== canonicalHash(scan)) {
      errors.push("independent verifier source or import graph contains a forbidden main-scorer dependency");
    }
    if (!isObject(proof.verificationCommand) || !Array.isArray(proof.verificationCommand.argv)
      || proof.verificationCommand.argv.length < 2 || proof.verificationCommand.argv.some((part) => typeof part !== "string" || part.length === 0)
      || !isHash(proof.verificationCommand.inputEvidenceRootHash)
      || !isHash(proof.verificationCommand.resultArtifactHash)
      || proof.verificationCommand.exitCode !== 0 || !isHash(proof.verificationCommand.stdoutHash)
      || !isHash(proof.verificationCommand.stderrHash)
      || proof.verificationCommandHash !== canonicalHash(proof.verificationCommand)) {
      errors.push("independent verifier command proof must bind an exact successful argv, input and result artifact roots, and redacted output hashes");
    }
    const commandArgv = proof.verificationCommand?.argv;
    const sealedSourcePaths = new Set((sources ?? []).map((source) => source.path));
    if (!Array.isArray(commandArgv) || !/(?:^|\/)node(?:\.exe)?$/u.test(commandArgv[0] ?? "")
      || !sealedSourcePaths.has(commandArgv[1]) || !isHash(proof.verificationCommand?.cwdHash)) {
      errors.push("independent verifier command must execute a sealed source-tree entrypoint from a hash-bound working directory");
    }
    if (!isObject(proof.runtime) || proof.runtime.engine !== "node"
      || typeof proof.runtime.version !== "string" || typeof proof.runtime.platform !== "string"
      || typeof proof.runtime.arch !== "string" || proof.runtimeHash !== canonicalHash(proof.runtime)) {
      errors.push("independent verifier runtime proof mismatch");
    }
    if (!isObject(proof.baselineProof) || proof.baselineProof.worktreeClean !== true
      || !isHash(proof.baselineProof.sourceTreeHash) || !isHash(proof.baselineProof.fixtureRootHash)
      || !/^[0-9a-f]{40,64}$/u.test(proof.baselineProof.sourceCommit ?? "")
      || proof.baselineProofHash !== canonicalHash(proof.baselineProof)) {
      errors.push("independent verifier clean-baseline proof mismatch");
    }
    if (proof.baselineProof?.sourceTreeHash !== proof.verifierSourceTreeHash) {
      errors.push("independent verifier baseline source-tree root mismatch");
    }
    for (const field of [
      "mainScorerImplementationHash",
      "mainScorerDependencyHash",
      "activeDesignRegistrationHash",
      "activeExecutionRegistrationHash",
      "latestFinalEvaluationReceiptHash",
      "trustedAuthorizationRootSetHash",
    ]) {
      if (isHash(expected[field]) && proof.baselineProof?.[field] !== expected[field]) {
        errors.push(`independent verifier baseline ${field} binding mismatch`);
      }
    }
    if (isHash(expected.inputEvidenceRootHash)
      && (proof.verificationCommand?.inputEvidenceRootHash !== expected.inputEvidenceRootHash
        || proof.baselineProof?.fixtureRootHash !== expected.inputEvidenceRootHash)) {
      errors.push("independent verifier input evidence root binding mismatch");
    }
    if (isHash(expected.resultArtifactHash)
      && proof.verificationCommand?.resultArtifactHash !== expected.resultArtifactHash) {
      errors.push("independent verifier result artifact root binding mismatch");
    }
    if (isHash(expected.mainScorerImplementationHash)
      && (proof.verifierSourceTreeHash === expected.mainScorerImplementationHash
        || proof.dependencyLockHash === expected.mainScorerDependencyHash)) {
      errors.push("independent verifier source or dependency root reuses the main scorer root");
    }
    if (!hasValidSelfHash(proof, "proofHash")) errors.push("independent verifier proof self-hash mismatch");
  } catch (error) {
    errors.push(`independent verifier proof failed closed: ${error.message}`);
  }
  return [...new Set(errors)];
}

function exactMetricOrder(metrics) {
  return Array.isArray(metrics) && metrics.length === FROZEN_METRIC_ORDER.length
    && exact(metrics.map((metric) => metric?.metric), FROZEN_METRIC_ORDER);
}

function deriveDeviationFlags(deviationEvidence, errors) {
  const fields = Object.freeze({
    materialDeviation: "materialDeviationRecords",
    postResultDesignDrift: "postResultDesignDriftRecords",
    labelLeakage: "labelLeakageRecords",
    unauthorizedProviderCall: "unauthorizedProviderCallRecords",
  });
  const flags = {};
  if (!isObject(deviationEvidence) || !hasValidSelfHash(deviationEvidence, "deviationEvidenceHash")) {
    errors.push("self-hashed deviation, drift, leakage, and authorization event evidence is required");
    return Object.fromEntries(Object.keys(fields).map((field) => [field, true]));
  }
  for (const [flag, ledger] of Object.entries(fields)) {
    if (!Array.isArray(deviationEvidence[ledger])) {
      errors.push(`deviation evidence ${ledger} must be an explicit event array`);
      flags[flag] = true;
    } else flags[flag] = deviationEvidence[ledger].length > 0;
  }
  return flags;
}

function expectedDeepSeekCallGraph(raw) {
  const executionEvidence = rawExecutionEvidence(raw);
  const isV4Review = raw?.designRegistration?.designId === V4_DESIGN_ID;
  const itemBundles = isV4Review && Array.isArray(executionEvidence?.deepSeekCompleteItemBundles)
    ? executionEvidence.deepSeekCompleteItemBundles
    : executionEvidence?.deepSeekItemBundles;
  if (!Array.isArray(itemBundles)
    || (isV4Review ? itemBundles.length < 57 || itemBundles.length > 60 : itemBundles.length !== 60)) return null;
  const graph = [];
  for (const item of itemBundles) {
    const itemHash = accountingIdentity(item)?.itemHash;
    if (!isHash(itemHash)) return null;
    graph.push({ itemHash, role: "B_PRIME_CRITIQUE" });
    graph.push({ itemHash, role: "B_PRIME_REVISION" });
    if (item?.selectedForC0 === true) {
      for (let index = 1; index <= 5; index += 1) graph.push({ itemHash, role: `C0_PRIME_ROLE_${index}` });
    }
  }
  return graph;
}

function deriveFinalSummarySourceEvidenceV4(raw, observed) {
  const selectedRows = raw?.sampleManifest?.selectedRows;
  const strata = raw?.sampleManifest?.stratumAllocations;
  const weightSummary = raw?.sampleManifest?.secondaryWeightSummary;
  const referenceSeal = rawExecutionEvidence(raw)?.referenceExecutionBundle?.referenceSeal;
  if (!Array.isArray(observed?.matchRecords) || !Array.isArray(strata)
    || !Array.isArray(selectedRows) || selectedRows.length !== 60
    || !Number.isFinite(weightSummary?.kishEffectiveSampleSize)
    || !isObject(referenceSeal?.agreementStatistics)
    || !Number.isInteger(referenceSeal?.adjudicationSuccessfulCallCount)) {
    throw new TypeError("V4 final summary protected matching/sample/reference sources are incomplete");
  }
  const clusterWeights = selectedRows.map((row) => ({
    itemId: row.itemId,
    itemHash: row.itemHash,
    clusterId: row.clusterId,
    stratum: row.stratum,
    primaryAnalysisWeight: row.primaryAnalysisWeight ?? row.analysisWeight,
    secondaryAnalysisWeight: row.secondaryAnalysisWeight,
    inclusionProbability: row.inclusionProbability,
    clusterInclusionProbability: row.clusterInclusionProbability,
    representativeSelectionProbability: row.representativeSelectionProbability,
  })).sort((left, right) => left.itemId < right.itemId ? -1 : left.itemId > right.itemId ? 1 : 0);
  if (clusterWeights.some((row) => typeof row.itemId !== "string" || !isHash(row.itemHash)
    || typeof row.clusterId !== "string" || typeof row.stratum !== "string"
    || !Number.isFinite(row.primaryAnalysisWeight) || !Number.isFinite(row.secondaryAnalysisWeight)
    || !Number.isFinite(row.inclusionProbability) || !Number.isFinite(row.clusterInclusionProbability)
    || !Number.isFinite(row.representativeSelectionProbability))) {
    throw new TypeError("V4 final summary cluster-weight projection is incomplete");
  }
  return {
    matchingMatrix: observed.matchRecords,
    strata,
    clusterWeights,
    kishEffectiveSampleSize: weightSummary.kishEffectiveSampleSize,
    agreement: referenceSeal.agreementStatistics,
    adjudicationCount: referenceSeal.adjudicationSuccessfulCallCount,
    itemCount: selectedRows.length,
  };
}

function assembleA11C0ReviewEvidenceV4(raw, executionEvidence) {
  const executionRegistration = raw?.executionRegistration ?? executionEvidence?.executionRegistration;
  return {
    registrationHash: executionRegistration?.registrationHash,
    sampleManifestHash: executionRegistration?.sampleManifestHash,
    executionRegistrationHash: executionRegistration?.executionRegistrationHash,
    sampleRows: executionEvidence?.sampleManifestRows,
    registeredRandomAuditRows: executionEvidence?.registeredRandomAuditRows,
    protectedItemBundles: executionEvidence?.c0ProtectedItemBundles,
    sealedTriggerInputs: executionEvidence?.c0TriggerInputs,
    sealedTriggerDecisions: executionEvidence?.c0TriggerDecisions,
    sealedExecutionSet: executionEvidence?.c0ExecutionSet,
    deepSeekSuccessfulCallCap: executionEvidence?.deepSeekSuccessfulCallCap,
  };
}

function validateProtectedReviewEvidence(
  raw,
  receipt,
  trustedAuthorizationRoots,
  trustedLineageRuleApprovalHash,
  trustedDesignRegistration,
) {
  const errors = [...validateReviewRegistrationContextV1AgainstTrustedRegistration(raw, trustedDesignRegistration)];
  const executionEvidence = rawExecutionEvidence(raw);
  const isV4Review = raw?.designRegistration?.designId === V4_DESIGN_ID;
  let trustedAuthorizationRootSetHash = null;
  if (isV4Review) {
    if (Object.hasOwn(raw ?? {}, "trustedLineageRuleApprovalHash")) {
      addError(errors, "protected review evidence must not supply its own trusted lineage-rule approval root");
    }
    if (!isHash(trustedLineageRuleApprovalHash)) {
      addError(errors, "A11 review requires an out-of-band trusted lineage-rule approval root");
    }
    const trustedErrors = validateOutOfBandTrustedAuthorizationRootsV4(raw, trustedAuthorizationRoots);
    for (const error of trustedErrors) addError(errors, error);
    if (trustedErrors.length === 0) trustedAuthorizationRootSetHash = canonicalHash(trustedAuthorizationRoots);
    for (const error of validateV4DeepSeekItemAccountingForReview(executionEvidence)) {
      addError(errors, `A11 V4 DeepSeek item accounting: ${error}`);
    }
  }
  let c0ReviewRecomputation = null;
  if (isV4Review) {
    if (Object.hasOwn(raw ?? {}, "c0ReviewEvidence") || Object.hasOwn(executionEvidence ?? {}, "c0ReviewEvidence")) {
      addError(errors, "A11 V4 C0 review must not accept a caller-preassembled c0ReviewEvidence substitute");
    }
    const c0Evidence = assembleA11C0ReviewEvidenceV4(raw, executionEvidence);
    for (const error of validateA11C0ReviewEvidenceV4(c0Evidence)) addError(errors, error);
    try {
      c0ReviewRecomputation = recomputeA11C0ReviewEvidenceV4(c0Evidence).result;
    } catch (error) {
      addError(errors, `A11 protected C0 recomputation root unavailable: ${error.message}`);
    }
  }
  for (const error of validateIndependentRuntimeSourceEnumerationRerun(raw, receipt)) addError(errors, error);
  try {
    for (const error of validateSampleAgainstFrame({
      frameRows: raw?.frameRows,
      runtimeExtractionSnapshot: raw?.runtimeExtractionSnapshot,
      cleanSourceEvidence: raw?.cleanSourceEvidence,
      clusterAudit: raw?.clusterAudit,
      frameRegistration: raw?.frameRegistration,
      sampleManifest: raw?.sampleManifest,
      c0RandomAudit: raw?.c0RandomAudit,
      trustedLineageRuleApprovalHash,
    })) addError(errors, `frame/sample recomputation: ${error}`);
    if (Array.isArray(raw?.frameRows) && raw.frameRegistration?.samplingFrameHash !== calculateFrameRowsRootV3(raw.frameRows)) {
      errors.push("frame physical root does not equal all protected frame rows");
    }
    if (Array.isArray(raw?.sampleManifest?.selectedRows)
      && raw.sampleManifest?.manifestTupleRootHash !== calculateManifestTupleRootV3(raw.sampleManifest.selectedRows)) {
      errors.push("sample physical tuple root does not equal the selected 60 item/cluster tuples");
    }
  } catch (error) {
    errors.push(`frame/sample independent recomputation failed closed: ${error.message}`);
  }

  if (typeof validateReferenceLabelSealExecutionBundle !== "function") {
    errors.push("REFERENCE_FULL_EXECUTION_VALIDATOR_UNAVAILABLE_IN_DESIGN_V3");
  } else {
    try {
      for (const error of validateReferenceLabelSealExecutionBundle(executionEvidence?.referenceExecutionBundle)) {
        addError(errors, `reference raw-leaf recomputation: ${error}`);
      }
    } catch (error) {
      addError(errors, `reference raw-leaf recomputation failed closed: ${error.message}`);
    }
  }

  const deepSeekValidator = designContract.validateDeepSeekExecutionBundleV1;
  if (typeof deepSeekValidator !== "function") {
    errors.push("DEEPSEEK_FULL_EXECUTION_VALIDATOR_UNAVAILABLE_IN_DESIGN_V3: expected validateDeepSeekExecutionBundleV1 to verify 60 B-prime/C0 bundles, completed-item markers, result lineage, and the global call graph");
  } else {
    try {
      for (const error of deepSeekValidator(executionEvidence)) addError(errors, `DeepSeek raw-leaf recomputation: ${error}`);
    } catch (error) {
      addError(errors, `DeepSeek raw-leaf recomputation failed closed: ${error.message}`);
    }
  }
  const deepCallGraph = expectedDeepSeekCallGraph(raw);
  if (deepCallGraph === null) {
    errors.push(isV4Review
      ? "DeepSeek execution evidence requires 57-60 manifest-bound complete item bundles plus at most three missing-receipt bundles"
      : "DeepSeek execution evidence requires exactly 60 manifest-bound full item bundles");
  } else {
    const deep = executionEvidence;
    const expected = {
      ...(deep.deepSeekAuthorizationExpected ?? {}),
      authorizationHash: deep.deepSeekAuthorization?.authorizationHash,
      requireCompleteRun: !isV4Review || (deep.deepSeekMissingReceiptItemBundles?.length ?? 0) === 0,
      requiredSuccessfulCallGraph: deepCallGraph,
    };
    try {
      for (const error of validateProviderAttemptChainV1(deep.deepSeekAttemptChain, deep.deepSeekAuthorization, expected)) {
        addError(errors, `DeepSeek global authorization/attempt chain: ${error}`);
      }
    } catch (error) {
      addError(errors, `DeepSeek global authorization/attempt chain failed closed: ${error.message}`);
    }
  }

  const finalBundle = raw?.finalEvaluationBundle;
  if (typeof validateFinalEvaluationBundle !== "function") {
    errors.push("FINAL_FULL_EXECUTION_VALIDATOR_UNAVAILABLE_IN_DESIGN_V3");
  } else {
    const completeFinalBundle = { ...(finalBundle ?? {}), executionEvidence };
    try {
      for (const error of validateFinalEvaluationBundle(completeFinalBundle)) addError(errors, `final raw-leaf recomputation: ${error}`);
    } catch (error) {
      addError(errors, `final raw-leaf recomputation failed closed: ${error.message}`);
    }
  }

  let observed = null;
  let counterfactual = null;
  let metrics = null;
  let finalSummaryRootHash = null;
  try {
    const rawDeepSeekRecomputation = designContract.recomputeDeepSeekExecutionEvidenceV1(executionEvidence);
    for (const error of rawDeepSeekRecomputation.errors) addError(errors, `A11 raw DeepSeek item-result reconstruction: ${error}`);
    if (!exact(finalBundle?.itemResults, rawDeepSeekRecomputation.itemResults)) {
      errors.push("A11 caller item results differ from item results rebuilt from raw DeepSeek leaves");
    }
    observed = deriveObservedEvaluationLedger(rawDeepSeekRecomputation.itemResults);
    counterfactual = deriveCounterfactualLedger(observed);
    metrics = recomputeMetricSet(observed, counterfactual);
    if (!exactMetricOrder(metrics)) errors.push("independent recomputation did not produce exactly 11 metrics in frozen order");
    if (!exact(finalBundle?.finalReceipt?.metricResults, metrics)) errors.push("final receipt metrics differ from raw-item recomputation");
    if (!exact(raw?.independentRecomputation?.metricResults, metrics)) errors.push("A11 independent metric results differ from raw-item recomputation");
    if (!exact(raw?.independentRecomputation?.matchingRecords, observed.matchRecords)) errors.push("A11 independent matching records differ from raw-item recomputation");
  } catch (error) {
    errors.push(`exactly 11 frozen metrics and matching cannot be independently recomputed: ${error.message}`);
  }

  if (isV4Review && observed) {
    try {
      const sourceEvidence = deriveFinalSummarySourceEvidenceV4(raw, observed);
      const summaryEvidence = {
        sourceEvidence,
        finalReceipt: finalBundle?.finalReceipt,
      };
      for (const error of validateA11FinalReceiptSummariesV4(summaryEvidence)) addError(errors, error);
      const recomputedSummary = designContract.deriveFinalReceiptSummariesV4(sourceEvidence);
      finalSummaryRootHash = recomputedSummary.finalSummaryRootHash ?? recomputedSummary.summaryRootHash;
      if (!isHash(finalSummaryRootHash)) errors.push("A11 recomputed final receipt summary root is invalid");
    } catch (error) {
      addError(errors, `A11 final receipt summary recomputation failed closed: ${error.message}`);
    }
  }

  const sourceErrors = validateVerifierIndependenceProofV1(raw?.verifierIndependenceProof, {
    mainScorerImplementationHash: raw?.mainScorerImplementationHash,
    mainScorerDependencyHash: raw?.mainScorerDependencyHash,
    activeDesignRegistrationHash: raw?.currentHeads?.activeDesignRegistrationHash,
    activeExecutionRegistrationHash: raw?.currentHeads?.activeExecutionRegistrationHash,
    latestFinalEvaluationReceiptHash: raw?.currentHeads?.latestFinalEvaluationReceiptHash,
    trustedAuthorizationRootSetHash,
    inputEvidenceRootHash: calculateProtectedReviewInputRootV1(
      raw,
      trustedAuthorizationRoots,
      trustedLineageRuleApprovalHash,
    ),
    resultArtifactHash: raw?.independentRecomputation?.recomputationHash,
  });
  for (const error of sourceErrors) addError(errors, `A11 source/lock/import independence proof: ${error}`);

  if (observed && counterfactual && metrics) {
    const deviationFlags = deriveDeviationFlags(executionEvidence?.deviationEvidence, errors);
    const referenceErrors = errors.filter((error) => error.startsWith("reference raw-leaf") || error.startsWith("REFERENCE_"));
    const deepErrors = errors.filter((error) => error.startsWith("DeepSeek") || error.startsWith("DEEPSEEK_"));
    const integrity = deriveExecutionIntegrity({
      ...observed.accounting,
      receiptChainValid: referenceErrors.length === 0 && deepErrors.length === 0,
      providerTupleValid: referenceErrors.length === 0 && deepErrors.length === 0,
      capsValid: referenceErrors.length === 0 && deepErrors.length === 0,
      terminalProviderFailure: (executionEvidence?.deviationEvidence?.terminalProviderFailureRecords ?? []).length > 0,
    });
    const decision = deriveOverallDecision({ integrity, metrics, ...deviationFlags });
    const qwenAttempts = executionEvidence?.referenceExecutionBundle?.attemptChain ?? [];
    const deepAttempts = executionEvidence?.deepSeekAttemptChain ?? [];
    const recomputation = {
      schemaVersion: "IndependentRawRecomputationV1",
      designId: DESIGN_ID,
      registrationHash: raw.currentHeads?.activeDesignRegistrationHash,
      executionRegistrationHash: raw.currentHeads?.activeExecutionRegistrationHash,
      frameHash: raw.frameRegistration?.samplingFrameHash,
      sampleHash: raw.sampleManifest?.sampleManifestHash,
      recomputedRuntimeSourceEnumerationRootHash: raw.independentRuntimeSourceEnumerationReceipt?.fullSourceEnumerationRootHash ?? null,
      independentSourceEnumerationReceiptHash: raw.independentRuntimeSourceEnumerationReceipt?.sourceEnumerationReceiptHash ?? null,
      referenceSealHash: executionEvidence?.referenceExecutionBundle?.referenceSeal?.sealHash,
      qwenAttemptChainHash: Array.isArray(qwenAttempts) ? calculateProviderAttemptChainHash(qwenAttempts) : null,
      deepSeekAttemptChainHash: Array.isArray(deepAttempts) ? calculateProviderAttemptChainHash(deepAttempts) : null,
      itemResultSetHash: observed.itemResultSetHash,
      observedLedgerHash: observed.observedLedgerHash,
      counterfactualLedgerHash: counterfactual.counterfactualLedgerHash,
      matchingHash: canonicalHash(observed.matchRecords),
      metricSetHash: canonicalHash(metrics),
      metricResults: metrics,
      matchingRecords: observed.matchRecords,
      totalAttemptCount: qwenAttempts.length + deepAttempts.length,
      qwenAttemptCount: qwenAttempts.length,
      deepSeekAttemptCount: deepAttempts.length,
      decision,
    };
    if (isV4Review) {
      recomputation.trustedAuthorizationRootSetHash = trustedAuthorizationRootSetHash;
      recomputation.c0TriggerInputRootHash = c0ReviewRecomputation?.triggerInputRootHash ?? null;
      recomputation.c0TriggerDecisionRootHash = c0ReviewRecomputation?.triggerDecisionRootHash ?? null;
      recomputation.c0ExecutionSetHash = c0ReviewRecomputation?.executionSetHash ?? null;
      recomputation.finalReceiptSummaryRootHash = finalSummaryRootHash;
    }
    recomputation.recomputationHash = calculateArtifactHash(recomputation, "recomputationHash");
    if (!exact(raw.independentRecomputation, recomputation)) errors.push("A11 independent recomputation artifact does not equal every recomputed raw leaf, aggregate, root, and decision");
    const receiptBindings = {
      recomputedFrameHash: recomputation.frameHash,
      recomputedSampleHash: recomputation.sampleHash,
      recomputedRuntimeSourceEnumerationRootHash: recomputation.recomputedRuntimeSourceEnumerationRootHash,
      independentSourceEnumerationReceiptHash: recomputation.independentSourceEnumerationReceiptHash,
      recomputedReferenceSealHash: recomputation.referenceSealHash,
      recomputedQwenAttemptChainHash: recomputation.qwenAttemptChainHash,
      recomputedDeepSeekAttemptChainHash: recomputation.deepSeekAttemptChainHash,
      recomputedItemResultSetHash: recomputation.itemResultSetHash,
      recomputedObservedLedgerHash: recomputation.observedLedgerHash,
      recomputedCounterfactualLedgerHash: recomputation.counterfactualLedgerHash,
      recomputedMatchingHash: recomputation.matchingHash,
      recomputedMetricSetHash: recomputation.metricSetHash,
      recomputedDecision: recomputation.decision,
      reviewedAttemptCount: recomputation.totalAttemptCount,
    };
    if (isV4Review) {
      receiptBindings.trustedAuthorizationRootSetHash = recomputation.trustedAuthorizationRootSetHash;
      receiptBindings.recomputedC0TriggerInputRootHash = recomputation.c0TriggerInputRootHash;
      receiptBindings.recomputedC0TriggerDecisionRootHash = recomputation.c0TriggerDecisionRootHash;
      receiptBindings.recomputedC0ExecutionSetHash = recomputation.c0ExecutionSetHash;
      receiptBindings.recomputedFinalReceiptSummaryRootHash = recomputation.finalReceiptSummaryRootHash;
    }
    for (const [field, value] of Object.entries(receiptBindings)) {
      if (receipt?.[field] !== value) errors.push(`A11 receipt ${field} does not equal independent raw recomputation`);
    }
  }
  return [...new Set(errors)];
}

function validateIndependentReviewReceiptV1AgainstTrustedRegistration(receipt, evidence, trustedDesignRegistration) {
  const errors = [];
  if (!isObject(receipt) || !isObject(evidence)) return ["independent review receipt and evidence must be objects"];
  const raw = evidence.rawReviewEvidence;
  if (receipt.schemaVersion !== "IndependentReviewReceiptV1" || receipt.designId !== DESIGN_ID) {
    errors.push("independent review schema or design mismatch");
  }
  if (receipt.reviewerLane !== "A11" || receipt.provenanceType !== "A11_INDEPENDENT_RECOMPUTATION"
    || receipt.humanReferenceClaimAllowed !== false || receipt.sourceArtifactsReadOnly !== true) {
    errors.push("A11 read-only machine-reference provenance contract mismatch");
  }
  if (receipt.mainScorerImported !== false || receipt.independenceAttestation !== "PROCESS_ATTESTATION_NOT_MACHINE_PROOF") {
    errors.push("independence process attestation mismatch");
  }
  if (!isObject(raw)) {
    if (receipt.reviewStatus === "CONCURRED") errors.push("complete protected raw review evidence is required for A11 CONCURRED");
  } else {
    const heads = raw.currentHeads;
    for (const field of TRUSTED_CONTEXT_FIELDS) {
      if (receipt[field] !== heads?.[field]) errors.push(`A11 trusted context ${field} binding mismatch`);
    }
    if (receipt.previousReceiptHash !== heads?.reviewLedgerHeadHash) {
      errors.push("A11 previous receipt does not equal the active review ledger head");
    }
    let manifestItems = [];
    try {
      manifestItems = expectedReviewedItems({ sampleManifest: raw.sampleManifest });
    } catch (error) {
      errors.push(error.message);
    }
    if (manifestItems.length !== 60 || new Set(manifestItems.map((item) => item.itemId)).size !== 60
      || new Set(manifestItems.map((item) => item.itemHash)).size !== 60
      || new Set(manifestItems.map((item) => item.clusterId)).size !== 60) {
      errors.push("sample evidence must contain exactly 60 unique manifest-bound items and clusters");
    }
    if (!Array.isArray(receipt.reviewedItems) || !exact(receipt.reviewedItems, manifestItems)
      || receipt.reviewedItemCount !== 60) {
      errors.push("reviewed item hashes do not exactly equal the 60-item manifest");
    }
    const proof = raw.verifierIndependenceProof;
    for (const [receiptField, proofField] of [
      ["verifierProofHash", "proofHash"],
      ["recomputationImplementationHash", "verifierSourceTreeHash"],
      ["recomputationDependencyHash", "dependencyLockHash"],
      ["recomputationImportGraphHash", "importGraphHash"],
      ["forbiddenScorerScanHash", "forbiddenScorerScanHash"],
      ["verificationCommandHash", "verificationCommandHash"],
      ["verificationRuntimeHash", "runtimeHash"],
      ["verificationBaselineProofHash", "baselineProofHash"],
    ]) {
      if (receipt[receiptField] !== proof?.[proofField]) errors.push(`A11 ${receiptField} binding mismatch`);
    }
    for (const error of validateVerifierIndependenceProofV1(proof, {
      mainScorerImplementationHash: raw.mainScorerImplementationHash,
      mainScorerDependencyHash: raw.mainScorerDependencyHash,
      activeDesignRegistrationHash: heads?.activeDesignRegistrationHash,
      activeExecutionRegistrationHash: heads?.activeExecutionRegistrationHash,
      latestFinalEvaluationReceiptHash: heads?.latestFinalEvaluationReceiptHash,
      trustedAuthorizationRootSetHash: raw?.designRegistration?.designId === V4_DESIGN_ID
        && isObject(evidence.trustedAuthorizationRoots)
        ? canonicalHash(evidence.trustedAuthorizationRoots)
        : undefined,
      inputEvidenceRootHash: calculateProtectedReviewInputRootV1(
        raw,
        evidence.trustedAuthorizationRoots,
        evidence.trustedLineageRuleApprovalHash,
      ),
      resultArtifactHash: receipt.reviewStatus === "CONCURRED" ? raw.independentRecomputation?.recomputationHash : undefined,
    })) addError(errors, `A11 verifier proof: ${error}`);
    if (!isHash(raw.mainScorerImplementationHash) || !isHash(raw.mainScorerDependencyHash)) {
      errors.push("main scorer implementation and dependency roots must be SHA-256 evidence roots");
    }
    if (receipt.mainScorerImplementationHash !== raw.mainScorerImplementationHash
      || receipt.mainScorerDependencyHash !== raw.mainScorerDependencyHash) errors.push("main scorer hash evidence mismatch");
    const mainRoots = new Set([raw.mainScorerImplementationHash, raw.mainScorerDependencyHash]);
    if (!isHash(receipt.recomputationImplementationHash) || !isHash(receipt.recomputationDependencyHash)
      || receipt.recomputationImplementationHash === receipt.recomputationDependencyHash
      || mainRoots.has(receipt.recomputationImplementationHash) || mainRoots.has(receipt.recomputationDependencyHash)) {
      errors.push("independent implementation and dependency hashes must be distinct from the main scorer");
    }
    if (!validTimestamp(receipt.reviewedAt) || !timestampAtOrBefore(heads?.finalFinishedAt, receipt.reviewedAt)) {
      errors.push("A11 review timestamp must follow the frozen final receipt");
    }
  }
  if (receipt.reviewStatus === "CONCURRED") {
    if (!isObject(raw)) {
      errors.push("A11 CONCURRED requires exactly 11 frozen metrics in frozen order");
    } else {
      for (const error of validateProtectedReviewEvidence(
        raw,
        receipt,
        evidence.trustedAuthorizationRoots,
        evidence.trustedLineageRuleApprovalHash,
        trustedDesignRegistration,
      )) addError(errors, error);
      if (!exactMetricOrder(raw.independentRecomputation?.metricResults)) {
        errors.push("A11 CONCURRED requires exactly 11 frozen metrics in frozen order");
      }
    }
    if (!Array.isArray(receipt.discrepancyCodes) || receipt.discrepancyCodes.length !== 0) errors.push("CONCURRED cannot contain discrepancies");
    if (receipt.unreviewableReason !== null) errors.push("CONCURRED cannot contain an unreviewable reason");
  } else if (receipt.reviewStatus === "DISCREPANCY") {
    if (!Array.isArray(receipt.discrepancyCodes) || receipt.discrepancyCodes.length === 0
      || new Set(receipt.discrepancyCodes).size !== receipt.discrepancyCodes.length) {
      errors.push("DISCREPANCY requires at least one unique discrepancy code");
    }
    if (receipt.unreviewableReason !== null) errors.push("DISCREPANCY cannot contain an unreviewable reason");
  } else if (receipt.reviewStatus === "UNREVIEWABLE") {
    if (typeof receipt.unreviewableReason !== "string" || receipt.unreviewableReason.trim().length === 0) {
      errors.push("UNREVIEWABLE requires a non-empty reason");
    }
    if (!Array.isArray(receipt.discrepancyCodes) || receipt.discrepancyCodes.length === 0
      || new Set(receipt.discrepancyCodes).size !== receipt.discrepancyCodes.length) {
      errors.push("UNREVIEWABLE requires at least one unique evidence-unavailability code");
    }
  } else {
    errors.push("independent review status is invalid");
  }
  if (!hasValidSelfHash(receipt, "receiptHash")) errors.push("independent review receipt self-hash mismatch");
  return errors;
}

export function validateIndependentReviewReceiptV1(receipt, evidence) {
  return validateIndependentReviewReceiptV1AgainstTrustedRegistration(receipt, evidence, ON_DISK_DESIGN_REGISTRATION);
}

export function validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(receipt, evidence, independentReviewReceipt = evidence?.independentReviewReceipt) {
  const errors = [];
  if (!isObject(receipt) || !isObject(evidence)) return ["claim-boundary receipt and evidence must be objects"];
  const raw = evidence.rawReviewEvidence;
  if (receipt.schemaVersion !== "ClaimBoundaryReviewReceiptV1" || receipt.designId !== DESIGN_ID) errors.push("claim-boundary schema or design mismatch");
  if (receipt.reviewerLane !== "A18" || receipt.provenanceType !== "A18_METHOD_AND_CLAIM_BOUNDARY_REVIEW"
    || receipt.reviewScope !== "TAXONOMY_ADJUDICATION_SEVERITY_AND_CLAIM_WORDING_ONLY"
    || receipt.humanGoldLabelReview !== false || receipt.sourceArtifactsReadOnly !== true) {
    errors.push("A18 method-only claim-boundary provenance mismatch");
  }
  if (!isObject(raw)) {
    errors.push("A18 requires the exact protected active-root context and final receipt");
  } else {
    const heads = raw.currentHeads;
    const final = raw.finalEvaluationBundle?.finalReceipt;
    const rootBindings = [
      ["registrationHash", "activeDesignRegistrationHash"],
      ["executionRegistrationHash", "activeExecutionRegistrationHash"],
      ["finalEvaluationReceiptHash", "latestFinalEvaluationReceiptHash"],
      ["referenceSealHash", "referenceSealHash"],
      ["frameRegistrationHash", "frameRegistrationHash"],
      ["sampleManifestHash", "sampleManifestHash"],
      ["thresholdHash", "thresholdHash"],
      ["taxonomyHash", "taxonomyHash"],
      ["labelSchemaHash", "labelSchemaHash"],
      ["adjudicationMethodHash", "adjudicationMethodHash"],
      ["severityRuleHash", "severityRuleHash"],
    ];
    for (const [receiptField, headField] of rootBindings) {
      if (receipt[receiptField] !== heads?.[headField]) errors.push(`A18 exact-root ${receiptField} binding mismatch`);
    }
    if (!hasValidSelfHash(final, "receiptHash") || final?.receiptHash !== heads?.latestFinalEvaluationReceiptHash) {
      errors.push("claim-boundary final receipt binding mismatch");
    }
    if (receipt.reviewedDecision !== final?.conclusion
      || receipt.reviewedClaimScopeCeiling !== final?.claimScopeCeiling) {
      errors.push("A18 reviewed decision or claim ceiling mismatch");
    }
    if (!hasValidSelfHash(independentReviewReceipt, "receiptHash")
      || independentReviewReceipt?.reviewStatus !== "CONCURRED"
      || receipt.independentReviewReceiptHash !== independentReviewReceipt?.receiptHash
      || receipt.previousReceiptHash !== independentReviewReceipt?.receiptHash
      || receipt.reviewLedgerHeadHash !== independentReviewReceipt?.receiptHash) {
      errors.push("A18 review head must be the exact current A11 CONCURRED receipt");
    }
    if (!validTimestamp(receipt.reviewedAt) || !timestampAtOrBefore(heads?.finalFinishedAt, receipt.reviewedAt)
      || !timestampAtOrBefore(independentReviewReceipt?.reviewedAt, receipt.reviewedAt)) {
      errors.push("A18 review timestamp must follow the final receipt and A11 review");
    }
    if (!isObject(receipt.methodReviewEvidence) || !hasValidSelfHash(receipt.methodReviewEvidence, "methodReviewEvidenceHash")
      || receipt.methodReviewEvidence.taxonomyHash !== heads?.taxonomyHash
      || receipt.methodReviewEvidence.labelSchemaHash !== heads?.labelSchemaHash
      || receipt.methodReviewEvidence.adjudicationMethodHash !== heads?.adjudicationMethodHash
      || receipt.methodReviewEvidence.severityRuleHash !== heads?.severityRuleHash
      || receipt.methodReviewEvidence.publicLimitationSetHash !== PUBLIC_LIMITATION_SET_HASH
      || receipt.methodReviewEvidence.publicClaimTemplateHash !== PUBLIC_CLAIM_TEMPLATE_HASH
      || receipt.methodReviewEvidence.finalEvaluationReceiptHash !== heads?.latestFinalEvaluationReceiptHash) {
      errors.push("A18 method-review evidence does not bind taxonomy, label, adjudication, severity, and final roots");
    }
    if (receipt.methodComponentRootSetHash !== designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH
      || heads?.methodComponentRootSetHash !== designContract.FROZEN_METHOD_COMPONENT_ROOTS_V4_HASH
      || receipt.methodReviewEvidence?.methodComponentRootSetHash !== heads?.methodComponentRootSetHash) {
      errors.push("A18 method component root set does not equal the trusted code-derived head");
    }
    if (receipt.publicLimitationSetHash !== PUBLIC_LIMITATION_SET_HASH
      || receipt.publicClaimTemplateHash !== PUBLIC_CLAIM_TEMPLATE_HASH) {
      errors.push("A18 did not review the frozen public limitation enum and claim templates");
    }
  }
  if (receipt.claimBoundaryStatus === "NO_OBJECTION") {
    if (!Array.isArray(receipt.objectionCodes) || receipt.objectionCodes.length !== 0 || receipt.objectionReason !== null) {
      errors.push("NO_OBJECTION cannot contain objection codes or reason");
    }
  } else if (receipt.claimBoundaryStatus === "OBJECTION") {
    if (!Array.isArray(receipt.objectionCodes) || receipt.objectionCodes.length === 0
      || new Set(receipt.objectionCodes).size !== receipt.objectionCodes.length
      || typeof receipt.objectionReason !== "string" || receipt.objectionReason.trim().length === 0) {
      errors.push("OBJECTION requires unique objection codes and a non-empty reason");
    }
  } else {
    errors.push("claim-boundary status is invalid");
  }
  if (!hasValidSelfHash(receipt, "receiptHash")) errors.push("claim-boundary review receipt self-hash mismatch");
  return errors;
}

const PUBLIC_REPORT_FIELDS = Object.freeze([
  "schemaVersion",
  "designId",
  "registrationHash",
  "finalEvaluationReceiptHash",
  "independentReviewReceiptHash",
  "claimBoundaryReviewReceiptHash",
  "contentClass",
  "conclusion",
  "decisionCeiling",
  "claimScopeCeiling",
  "aggregateStatistics",
  "artifactHashes",
  "limitations",
  "reportHash",
]);

const PUBLIC_ARTIFACT_HASH_FIELDS = Object.freeze(TRUSTED_CONTEXT_FIELDS.filter((field) => field !== "finalFinishedAt"));
const PUBLIC_AGGREGATE_FIELDS = Object.freeze([
  "sampledClusterCount",
  "completedItemCount",
  "missingItemCount",
  "unresolvedReferenceItemCount",
  "invalidItemCount",
  "qwenAttemptCount",
  "deepSeekAttemptCount",
  "totalAttemptCount",
  "metricResults",
  "referenceAgreement",
]);
const PUBLIC_METRIC_FIELDS = Object.freeze([
  "metric",
  "status",
  "numerator",
  "denominator",
  "pointEstimate",
  "oneSidedWilsonLcb95",
  "oneSidedWilsonUcb95",
  "twoSidedWilsonL95",
  "twoSidedWilsonU95",
  "conservativeLower",
  "conservativeUpper",
]);
const PUBLIC_AGREEMENT_FIELDS = Object.freeze([
  "rawLabelAgreement",
  "cohenKappa",
  "gwetAc1",
  "meanCodeJaccard",
  "meanFamilyJaccard",
  "severityAgreement",
  "adjudicationRate",
  "interpretation",
]);

const PRIVATE_REPORT_KEY = /^(?:questions?(?:texts?|bodies?)?|itemprompts?|prompts?|options?|rawprovideroutputs?|providerresponses?|rawlabels?|referencelabels?|sensitivelabels?|credentials?(?:values?)?|apikeys?|secrets?|sourceitemtexts?)$/iu;
const CREDENTIAL_SENTINEL = /(?:CREDENTIAL_SENTINEL|API_KEY_SENTINEL|SECRET_SENTINEL|\bsk-[A-Za-z0-9_-]{8,}|\bBearer\s+[A-Za-z0-9._~+\/-]{8,}|\bAKIA[A-Z0-9]{16}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/iu;
const PROHIBITED_STATUS = /\b(?:PASS|APPROVED|PRODUCTION_READY|LIMITED_GENERALIZATION_EVIDENCE)\b/iu;
const GENERAL_MACHINE_QA_CLAIM = /(?:(?:machine[\s_-]*qa|机器\s*qa).{0,80}(?:generally|universally|in general|production|cross[-\s]?region|普遍|一般|生产|跨地区).{0,50}(?:effective|valid|validated|successful|ready|有效|已验证|成功|就绪)|(?:proved?|demonstrat(?:e|es|ed)|证明).{0,80}(?:machine[\s_-]*qa|机器\s*qa).{0,60}(?:valid|effective|有效|成功))/iu;

function publicMetricProjection(metric) {
  return Object.fromEntries(PUBLIC_METRIC_FIELDS.map((field) => [field, Object.hasOwn(metric ?? {}, field) ? metric[field] : null]));
}

function publicAgreementProjection(agreement) {
  return Object.fromEntries(PUBLIC_AGREEMENT_FIELDS.map((field) => [field, Object.hasOwn(agreement ?? {}, field) ? agreement[field] : null]));
}

function expectedPublicAggregate(raw) {
  const final = raw?.finalEvaluationBundle?.finalReceipt;
  const executionEvidence = rawExecutionEvidence(raw);
  const qwenAttempts = executionEvidence?.referenceExecutionBundle?.attemptChain;
  const deepSeekAttempts = executionEvidence?.deepSeekAttemptChain;
  const metrics = final?.metricResults;
  if (!exactMetricOrder(metrics) || !Array.isArray(qwenAttempts) || !Array.isArray(deepSeekAttempts)) return null;
  return {
    sampledClusterCount: raw.sampleManifest?.selectedRows?.length,
    completedItemCount: final.completeReceiptItemCount,
    missingItemCount: final.missingReceiptItemCount,
    unresolvedReferenceItemCount: final.unresolvedReferenceItemCount,
    invalidItemCount: final.invalidItemCount,
    qwenAttemptCount: qwenAttempts.length,
    deepSeekAttemptCount: deepSeekAttempts.length,
    totalAttemptCount: qwenAttempts.length + deepSeekAttempts.length,
    metricResults: metrics.map(publicMetricProjection),
    referenceAgreement: publicAgreementProjection(executionEvidence?.referenceExecutionBundle?.referenceSeal?.agreementStatistics),
  };
}

function scanPublicValue(value, path, errors, seen = new Set()) {
  if (typeof value === "string") {
    if (CREDENTIAL_SENTINEL.test(value)) errors.push(`${path} contains a credential sentinel or secret-like value`);
    if (PROHIBITED_STATUS.test(value)) errors.push(`${path} contains a prohibited status or claim`);
    if (GENERAL_MACHINE_QA_CLAIM.test(value)) errors.push(`${path} contains a prohibited general-machine-QA claim`);
    return;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      errors.push(`${path} contains a non-JSON cyclic value`);
      return;
    }
    seen.add(value);
    value.forEach((entry, index) => scanPublicValue(entry, `${path}[${index}]`, errors, seen));
    seen.delete(value);
    return;
  }
  if (isObject(value)) {
    if (seen.has(value)) {
      errors.push(`${path} contains a non-JSON cyclic value`);
      return;
    }
    seen.add(value);
    for (const [key, entry] of Object.entries(value)) {
      if (PRIVATE_REPORT_KEY.test(key.replaceAll(/[-_\s]/gu, ""))) errors.push(`${path}.${key} is private item-level or provider material`);
      scanPublicValue(entry, `${path}.${key}`, errors, seen);
    }
    seen.delete(value);
  }
}

export function validatePublicAggregateReportShapeAndEvidence(report, expected) {
  const errors = [];
  if (!isObject(report) || !isObject(expected) || !isObject(expected.evidence)) return ["public report and review evidence must be objects"];
  const { evidence, independentReviewReceipt, claimBoundaryReviewReceipt } = expected;
  const raw = evidence.rawReviewEvidence;
  if (!exact(Object.keys(report).sort(), [...PUBLIC_REPORT_FIELDS].sort())) errors.push("public report top-level fields are not the frozen aggregate-only shape");
  if (report.schemaVersion !== "PublicAggregateReportV1" || report.designId !== DESIGN_ID
    || report.contentClass !== "AGGREGATE_STATISTICS_HASHES_AND_LIMITATIONS_ONLY") {
    errors.push("public report schema, design, or aggregate-only content class mismatch");
  }
  if (!isObject(raw)) errors.push("public report requires exact protected aggregate roots");
  if (report.registrationHash !== raw?.currentHeads?.activeDesignRegistrationHash
    || report.finalEvaluationReceiptHash !== raw?.currentHeads?.latestFinalEvaluationReceiptHash
    || report.independentReviewReceiptHash !== independentReviewReceipt?.receiptHash
    || report.claimBoundaryReviewReceiptHash !== claimBoundaryReviewReceipt?.receiptHash) {
    errors.push("public report review-root binding mismatch");
  }
  if (report.conclusion !== raw?.finalEvaluationBundle?.finalReceipt?.conclusion
    || report.decisionCeiling !== DECISION_CEILING
    || report.decisionCeiling !== raw?.finalEvaluationBundle?.finalReceipt?.decisionCeiling
    || report.claimScopeCeiling !== CLAIM_SCOPE_CEILING
    || report.claimScopeCeiling !== raw?.finalEvaluationBundle?.finalReceipt?.claimScopeCeiling) {
    errors.push("public report conclusion or CA60 claim ceiling mismatch");
  }
  const aggregate = expectedPublicAggregate(raw);
  if (aggregate === null || !exactKeys(report.aggregateStatistics, PUBLIC_AGGREGATE_FIELDS)
    || !exact(report.aggregateStatistics, aggregate)) errors.push("public aggregate statistics do not exactly equal the reviewed 11-metric evidence projection");
  if (!exactKeys(report.artifactHashes, PUBLIC_ARTIFACT_HASH_FIELDS)
    || PUBLIC_ARTIFACT_HASH_FIELDS.some((field) => !isHash(report.artifactHashes?.[field])
      || report.artifactHashes?.[field] !== raw?.currentHeads?.[field])) {
    errors.push("public artifact hash allowlist does not exactly equal every reviewed active head");
  }
  if (!exact(report.limitations, FROZEN_PUBLIC_LIMITATIONS)) {
    errors.push("public limitations must equal the frozen limitation enum and exact templates");
  }
  if (!Array.isArray(report.aggregateStatistics?.metricResults)
    || !exactMetricOrder(report.aggregateStatistics.metricResults)
    || report.aggregateStatistics.metricResults.some((metric) => !exactKeys(metric, PUBLIC_METRIC_FIELDS))
    || !exactKeys(report.aggregateStatistics?.referenceAgreement, PUBLIC_AGREEMENT_FIELDS)) {
    errors.push("public nested metric or agreement fields are outside the frozen aggregate allowlist");
  }
  scanPublicValue(report, "$report", errors);
  if (!hasValidSelfHash(report, "reportHash")) errors.push("public aggregate report self-hash mismatch");
  return [...new Set(errors)];
}

function validateAggregatePublicationConsistencyAgainstTrustedRegistration(
  { evidence, independentReviewReceipt, claimBoundaryReviewReceipt, report } = {},
  trustedDesignRegistration,
) {
  const errors = [];
  try {
    for (const error of validateReviewDesignRegistrationV4AgainstTrustedRegistration(
      trustedDesignRegistration,
      trustedDesignRegistration,
    )) addError(errors, error);
    if (trustedDesignRegistration?.lifecycleStatus !== "FROZEN_PRE_EXECUTION_DESIGN_REGISTRATION"
      || trustedDesignRegistration?.freezeAllowed !== true
      || !Array.isArray(trustedDesignRegistration?.blockingDecisionCodes)
      || trustedDesignRegistration.blockingDecisionCodes.length !== 0
      || !validTimestamp(trustedDesignRegistration?.frozenAt)) {
      addError(errors, "aggregate publication consistency requires the exact frozen pre-execution registration lifecycle");
    }
    if (independentReviewReceipt?.reviewStatus !== "CONCURRED") {
      addError(errors, "aggregate publication consistency requires A11 CONCURRED");
    }
    if (claimBoundaryReviewReceipt?.claimBoundaryStatus !== "NO_OBJECTION") {
      addError(errors, "aggregate publication consistency requires A18 NO_OBJECTION");
    }
    for (const error of validateIndependentReviewReceiptV1AgainstTrustedRegistration(
      independentReviewReceipt,
      evidence,
      trustedDesignRegistration,
    )) addError(errors, `aggregate publication A11 evidence: ${error}`);
    for (const error of validateClaimBoundaryReviewReceiptShapeAndEvidenceV1(
      claimBoundaryReviewReceipt,
      evidence,
      independentReviewReceipt,
    )) addError(errors, `aggregate publication A18 evidence: ${error}`);
    for (const error of validatePublicAggregateReportShapeAndEvidence(report, {
      evidence,
      independentReviewReceipt,
      claimBoundaryReviewReceipt,
    })) addError(errors, `aggregate publication report evidence: ${error}`);
  } catch (error) {
    addError(errors, `aggregate publication consistency could not be evaluated: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  return [...new Set(errors)];
}

/**
 * Validate report/receipt consistency only. A zero-error result is not
 * publication authorization because every root here is still supplied by the
 * evidence universe rather than an out-of-band protected custody registry.
 */
export function validateAggregatePublicationConsistencyV1(args = {}) {
  return validateAggregatePublicationConsistencyAgainstTrustedRegistration(
    args,
    ON_DISK_DESIGN_REGISTRATION,
  );
}

/**
 * Fail closed until evaluateAggregatePublicationAuthorizationV1 reports an
 * out-of-band protected custody registry. Consistent caller evidence alone can
 * never authorize aggregate publication.
 */
export function canExportAggregateReport() {
  return false;
}
