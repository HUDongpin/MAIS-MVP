import { types as nodeUtilTypes } from "node:util";

import {
  calculateArtifactHash,
  canonicalJson,
  computeCapacityConstrainedHamilton,
  sha256Hex,
} from "../design-v2/design-contract.mjs";

// Keep the frame/sample package dependency-closed.  The method package imports
// this module's authoritative sample-manifest verifier; importing the method
// module back from here would create an ESM cycle before either contract can be
// evaluated.  This receipt-only role set is frozen and parity-tested against
// the method role set by the integration suites.
const QWEN_REFERENCE_RECEIPT_ROLE_SET_V4 = Object.freeze([
  "A_SOLVE",
  "A_LABEL",
  "B_SOLVE",
  "B_LABEL",
  "ADJUDICATOR",
]);

export const DESIGN_ID = "MAIS-NATURAL-CA60-V4";
export const RESPONSE_FORMS = Object.freeze(["multiple-choice", "fill-in", "short-answer"]);
export const DIFFICULTIES = Object.freeze(["Low", "Medium", "High"]);
export const CLOSED_EXCLUSION_CODES = Object.freeze([
  "NON_CA_TRACK",
  "RUNTIME_NOT_VISIBLE",
  "SYNTHETIC_TEST_CANDIDATE_ONLY",
  "RESTRICTED_EGRESS_CONTENT",
  "UNSTABLE_SERIALIZATION",
]);
export const LOCALIZED_TEXT_KEYS_V4 = Object.freeze(["en", "zh", "zhHans"]);
export const V4_LOCALE_POLICY = "FULL_RUNTIME_LOCALIZED_BUNDLE";
export const SAMPLE_ITEM_PSEUDONYM_FORMULA_V4 = "ca60- + FIRST_32_HEX(SHA256(JCS([pseudonymSeedRootHash,itemId,itemHash,clusterId])))";
export const STRICT_ITEM_JSON_CONTRACT_V4 = Object.freeze({
  canonicalization: "RFC8785_JCS_AFTER_VALIDATED_JSON_NORMALIZATION",
  objectUndefinedPropertyRule: "DELETE_BEFORE_HASHING",
  arrayUndefinedRule: "REJECT",
  sparseArrayRule: "REJECT",
  nonFiniteNumberRule: "REJECT",
  unsupportedTypeRule: "REJECT_BIGINT_FUNCTION_SYMBOL",
  loneSurrogateRule: "REJECT",
  cycleRule: "REJECT",
});
export const FRAME_FAILURE_CODES_V4 = Object.freeze([
  "SOURCE_IMPORT_FAILED",
  "RUNTIME_ENUMERATION_FAILED",
  "ID_COLLISION",
  "RAW_FULL_ID_MISMATCH",
  "FULL_PUBLIC_ID_MISMATCH",
  "PUBLIC_FIELD_MISMATCH",
  "SERIALIZATION_FAILED",
  "RIGHTS_UNRESOLVED",
  "PII_SCREEN_FAILED",
  "ASSET_UNRESOLVED",
  "LINEAGE_FIELD_MISSING",
  "UNSUPPORTED_RESPONSE_FORM",
]);
export const FRAME_FAILURE_CLASSES_V4 = FRAME_FAILURE_CODES_V4;
export const RIGHTS_REGISTRY_REQUIRED_SOURCES_V4 = Object.freeze([
  "california-math-common-core-skill",
  "ccss-math-textbook-app",
]);
export const RUNTIME_SOURCE_ENUMERATION_GRADES = Object.freeze([
  "K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6",
]);
export const SOURCE_ENUMERATION_EVIDENCE_BOUNDARY = "CONTRACT_BINDS_EXTERNAL_EXTRACTOR_AND_RAW_EVIDENCE_ROOT_BUT_DOES_NOT_SELF_PROVE_SOURCE_COMPLETENESS";
export const SOURCE_ENUMERATION_DUPLICATE_ID_RULE = "ANY_REPEATED_ITEM_ID_WITHIN_OR_ACROSS_13_GRADE_PROJECTIONS_BLOCKS_FREEZE_NO_COLLAPSE_NO_FIRST_WINS";
export const SOURCE_ENUMERATION_DISPOSITIONS = Object.freeze({
  RUNTIME_VISIBLE_SERIALIZED_ELIGIBLE: Object.freeze({
    runtimeVisible: true,
    serialized: true,
    eligible: true,
    exclusionCode: null,
  }),
  RUNTIME_VISIBLE_SERIALIZED_RESTRICTED: Object.freeze({
    runtimeVisible: true,
    serialized: true,
    eligible: false,
    exclusionCode: "RESTRICTED_EGRESS_CONTENT",
  }),
  RUNTIME_VISIBLE_SERIALIZATION_FAILURE: Object.freeze({
    runtimeVisible: true,
    serialized: false,
    eligible: false,
    exclusionCode: "UNSTABLE_SERIALIZATION",
  }),
  SOURCE_EXCLUDED_NON_CA_TRACK: Object.freeze({
    runtimeVisible: false,
    serialized: false,
    eligible: false,
    exclusionCode: "NON_CA_TRACK",
  }),
  SOURCE_EXCLUDED_RUNTIME_NOT_VISIBLE: Object.freeze({
    runtimeVisible: false,
    serialized: false,
    eligible: false,
    exclusionCode: "RUNTIME_NOT_VISIBLE",
  }),
  SOURCE_EXCLUDED_SYNTHETIC_TEST_CANDIDATE_ONLY: Object.freeze({
    runtimeVisible: false,
    serialized: false,
    eligible: false,
    exclusionCode: "SYNTHETIC_TEST_CANDIDATE_ONLY",
  }),
});
export const RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT = Object.freeze({
  schemaVersion: "RuntimeSourceEnumerationEvidenceContractV1",
  receiptSchemaVersion: "RuntimeSourceEnumerationReceiptV1",
  gradeProjectionInvocationSchemaVersion: "RuntimeGradeProjectionInvocationLeafV1",
  gradeProjectionInvocationCount: 13,
  gradeProjectionOrder: RUNTIME_SOURCE_ENUMERATION_GRADES,
  region: "CALIFORNIA",
  curriculumProfile: "US_CA_MATH",
  runtimeOrigin: "QUESTION_STORE_AUTHENTICATED_STUDENT_PROJECTION",
  requiredReceiptBindings: Object.freeze([
    "registrationHash",
    "sourceCommit",
    "runtimeConfigHash",
    "runtimeConfigEvidenceHash",
    "sourceParityEvidenceHash",
    "sourceModuleManifestHash",
    "evidenceContractHash",
    "extractorImplementationHash",
    "extractorRunnerCommit",
    "extractorRunnerHash",
    "rawEvidenceArtifactRootHash",
    "fullSourceEnumerationRootHash",
    "expectedRuntimeInventoryRootHash",
    "serializedRuntimeVisibleRootHash",
    "serializationFailureInventoryRootHash",
    "sourceExclusionLedgerRootHash",
    "sourceEnumerationReceiptHash",
  ]),
  requiredInvocationLeafBindings: Object.freeze([
    "grade",
    "invocationSequenceNumber",
    "projectionInputHash",
    "orderedItemRootHash",
    "sourceModuleRootHash",
    "invocationLeafHash",
  ]),
  requiredProtectedSnapshotBindings: Object.freeze([
    "runtimeSourceEnumerationReceiptHash",
    "runtimeConfigEvidenceHash",
    "sourceParityEvidenceHash",
    "sourceModuleManifestHash",
    "sourceEnumerationEvidenceContractHash",
    "fullSourceEnumerationRootHash",
    "rawEvidenceArtifactRootHash",
    "extractorImplementationHash",
    "extractorRunnerCommit",
    "extractorRunnerHash",
    "expectedInventoryRootHash",
    "serializedProjectionRootHash",
    "failureLedgerRootHash",
    "runtimeExtractionSnapshotHash",
  ]),
  sourceItemDispositionSet: Object.freeze(Object.keys(SOURCE_ENUMERATION_DISPOSITIONS)),
  closedExclusionCodes: CLOSED_EXCLUSION_CODES,
  accountingEquations: Object.freeze([
    "sourceItemCount=runtimeVisibleItemCount+sourceExclusionCount",
    "runtimeVisibleItemCount=eligibleItemCount+restrictedItemCount+serializationFailureCount",
    "sourceItemCount=eligibleItemCount+excludedItemCount",
  ]),
  duplicateIdRule: SOURCE_ENUMERATION_DUPLICATE_ID_RULE,
  chronologyRule: "sourceEnumerationReceipt.enumeratedAt<runtimeExtractionSnapshot.extractedAt<frameRegistration.frozenAt<sampleManifest.manifestFrozenAt<c0RandomAudit.frozenAt<firstQwenReferenceAttempt.startedAt",
  sourceCompletenessEvidenceBoundary: SOURCE_ENUMERATION_EVIDENCE_BOUNDARY,
  designDoesNotSelfProveSourceCompleteness: true,
  requiresIndependentExtractorExecutionAgainstFrozenSource: true,
  requiresIndependentA11ExtractorRerun: true,
  independentA11ExtractorRerunRule: "A11_MUST_RERUN_THE_FROZEN_EXTRACTOR_AGAINST_THE_EXACT_SOURCE_COMMIT_AND_RUNTIME_CONFIG_AND_COMPARE_ALL_13_INVOCATION_ROOTS",
  immutableAfterFreeze: true,
});
export const RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH = sha256Hex(
  canonicalJson(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT),
);
export const LINEAGE_KEY_FIELDS = Object.freeze({
  K5: Object.freeze(["batchId", "clusterId", "topicId", "responseForm"]),
  G6_12: Object.freeze(["batchId", "generationTemplate", "topicId", "responseForm"]),
  CCSS: Object.freeze(["batchId", "sourceLessonSlug", "topicId", "responseForm"]),
});
export const LINEAGE_RULE_PROPOSAL_V4 = Object.freeze({
  status: "OWNER_CONFIRMATION_REQUIRED_BEFORE_FRAME_FREEZE",
  K5: LINEAGE_KEY_FIELDS.K5,
  G6_12: LINEAGE_KEY_FIELDS.G6_12,
  CCSS: LINEAGE_KEY_FIELDS.CCSS,
  provenanceOnlyNeverPairwiseEdges: Object.freeze(["packageId", "batchId", "sourceIds", "sourceModule"]),
  rationale: "BROAD_LINEAGE_GROUPS_CREATED_APPROXIMATE_492_1500_810_ITEM_COMPONENTS_AND_EXCEEDED_THE_FIVE_PERCENT_BLOCKER",
  currentImplementationRequestIsNotApproval: true,
  currentImplementationRequestIsNotProviderAuthorization: true,
});
export const LINEAGE_RULE_HASH_V4 = sha256Hex(canonicalJson(LINEAGE_RULE_PROPOSAL_V4));

export function validateLineageRuleApprovalV4(approval, { trustedOwnerApprovalHash } = {}) {
  const errors = [];
  if (!approval || typeof approval !== "object" || Array.isArray(approval)) {
    return ["lineage rule owner approval is required before frame freeze"];
  }
  if (!/^[a-f0-9]{64}$/u.test(approval.lineageRuleApprovalHash ?? "")
    || !/^[a-f0-9]{64}$/u.test(trustedOwnerApprovalHash ?? "")
    || approval.lineageRuleApprovalHash !== trustedOwnerApprovalHash) {
    errors.push("lineage rule approval hash is missing or not equal to the trusted owner confirmation root");
  }
  if (approval.approvedRuleHash !== LINEAGE_RULE_HASH_V4) errors.push("lineage rule approval does not bind the exact V4 fine-grained rule");
  return errors;
}
export const STRATA = Object.freeze(RESPONSE_FORMS.flatMap((responseForm) => (
  DIFFICULTIES.map((difficulty) => `${responseForm}::${difficulty}`)
)));

export const SELECTION_DIGEST_CANONICALIZATION = "RFC8785_JCS";
export const SELECTION_DIGEST_BYTE_ENCODING = "UTF-8";
export const SAMPLE_SELECTION_DIGEST_FIELD_ORDER = Object.freeze([
  "designHash",
  "frameHash",
  "algorithmVersion",
  "stratum",
  "clusterId",
  "itemHash",
]);
export const C0_AUDIT_SELECTION_DIGEST_FIELD_ORDER = Object.freeze([
  "registrationHash",
  "sampleSelectionContentRootHash",
  "algorithmVersion",
  "stratum",
  "clusterId",
  "itemHash",
]);
export const SAMPLE_SELECTION_DIGEST_CONTRACT = Object.freeze({
  algorithmVersion: "natural-ca60-full-frame-hamilton-v3",
  canonicalization: SELECTION_DIGEST_CANONICALIZATION,
  byteEncoding: SELECTION_DIGEST_BYTE_ENCODING,
  fieldOrder: SAMPLE_SELECTION_DIGEST_FIELD_ORDER,
  formula: "SHA256(UTF8(JCS([designHash,frameHash,algorithmVersion,stratum,clusterId,itemHash])))",
  designHashSemantic: "designHash is the frozen design registrationHash",
  frameHashSemantic: "frameHash is the timestamp-excluded frameSelectionContentRootHash; it is not samplingFrameHash and not frameRegistrationHash",
});
export const C0_AUDIT_SELECTION_DIGEST_CONTRACT = Object.freeze({
  algorithmVersion: "c0-random-audit-full-sample-v3",
  canonicalization: SELECTION_DIGEST_CANONICALIZATION,
  byteEncoding: SELECTION_DIGEST_BYTE_ENCODING,
  fieldOrder: C0_AUDIT_SELECTION_DIGEST_FIELD_ORDER,
  formula: "SHA256(UTF8(JCS([registrationHash,sampleSelectionContentRootHash,algorithmVersion,stratum,clusterId,itemHash])))",
  registrationHashSemantic: "registrationHash is the frozen design registrationHash",
  sampleSelectionContentRootHashSemantic: "sampleSelectionContentRootHash excludes manifest timestamps and artifact self-hashes; it is not sampleManifestHash",
});
export const SAMPLE_ALGORITHM_VERSION = SAMPLE_SELECTION_DIGEST_CONTRACT.algorithmVersion;
export const SAMPLE_SELECTION_FORMULA = SAMPLE_SELECTION_DIGEST_CONTRACT.formula;
export const C0_AUDIT_ALGORITHM_VERSION = C0_AUDIT_SELECTION_DIGEST_CONTRACT.algorithmVersion;
export const C0_AUDIT_SELECTION_FORMULA = C0_AUDIT_SELECTION_DIGEST_CONTRACT.formula;
export const SAMPLE_SELECTION_GOLDEN_VECTOR_DESIGN_HASH_SEMANTIC = Object.freeze({
  designId: DESIGN_ID,
  kind: "NON_EXECUTION_GOLDEN_VECTOR_INPUT",
  semantic: "Actual sample selection designHash is the frozen design registrationHash",
});
export const SAMPLE_SELECTION_GOLDEN_VECTOR_DESIGN_HASH = sha256Hex(canonicalJson(SAMPLE_SELECTION_GOLDEN_VECTOR_DESIGN_HASH_SEMANTIC));
export const SAMPLE_SELECTION_GOLDEN_VECTOR = Object.freeze({
  input: Object.freeze({
    designHash: SAMPLE_SELECTION_GOLDEN_VECTOR_DESIGN_HASH,
    frameHash: "1".repeat(64),
    algorithmVersion: SAMPLE_ALGORITHM_VERSION,
    stratum: "short-answer::High",
    clusterId: "cluster|Ω",
    itemHash: "2".repeat(64),
  }),
  canonicalBytesUtf8Hex: "5b2237383065663932633265626538386333316337366535336232373533356130313761636666613136393230356565303531613639613838346130386166333365222c2231313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131222c226e61747572616c2d636136302d66756c6c2d6672616d652d68616d696c746f6e2d7633222c2273686f72742d616e737765723a3a48696768222c22636c75737465727ccea9222c2232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232225d",
  digest: "058d40d3dd784ea375698a17f780e84c7a29ad9352adda05a95be77a69c98e28",
});
export const C0_AUDIT_SELECTION_GOLDEN_VECTOR = Object.freeze({
  input: Object.freeze({
    registrationHash: "a".repeat(64),
    sampleSelectionContentRootHash: "b".repeat(64),
    algorithmVersion: C0_AUDIT_ALGORITHM_VERSION,
    stratum: "multiple-choice::Low",
    clusterId: "audit|α",
    itemHash: "c".repeat(64),
  }),
  canonicalBytesUtf8Hex: "5b2261616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161222c2262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262222c2263302d72616e646f6d2d61756469742d66756c6c2d73616d706c652d7633222c226d756c7469706c652d63686f6963653a3a4c6f77222c2261756469747cceb1222c2263636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363225d",
  digest: "c9b4f19a72f2d0a8f52f3a120df59cd212ea772999d7b06a468a65653ca05dee",
});

export const SAMPLE_ALGORITHM_DESCRIPTOR = Object.freeze({
  version: SAMPLE_ALGORITHM_VERSION,
  targetClusters: 60,
  strata: STRATA,
  minimumPerNonemptyStratum: 2,
  allocation: "CAPACITY_CONSTRAINED_ITERATIVE_HAMILTON_EXACT_INTEGER_REMAINDERS",
  clusterRepresentative: "LOWEST_MEMBER_SELECTION_DIGEST_THEN_ITEM_ID",
  clusterSelection: "LOWEST_REPRESENTATIVE_SELECTION_DIGEST_THEN_ITEM_ID",
  selectionFormula: SAMPLE_SELECTION_FORMULA,
  selectionDigestCanonicalization: SELECTION_DIGEST_CANONICALIZATION,
  selectionDigestByteEncoding: SELECTION_DIGEST_BYTE_ENCODING,
  selectionDigestFieldOrder: SAMPLE_SELECTION_DIGEST_FIELD_ORDER,
  selectionDesignHashSemantic: SAMPLE_SELECTION_DIGEST_CONTRACT.designHashSemantic,
  selectionFrameHashSemantic: SAMPLE_SELECTION_DIGEST_CONTRACT.frameHashSemantic,
  tupleRoot: "SHA256(JCS(SORTED([itemId,itemHash,clusterId])))",
  reroll: false,
  replacementAfterAnyLabelOrResult: false,
});

export const C0_AUDIT_ALGORITHM_DESCRIPTOR = Object.freeze({
  version: C0_AUDIT_ALGORITHM_VERSION,
  targetClusters: 12,
  strata: STRATA,
  minimumPerNonemptyStratum: 1,
  allocation: "CAPACITY_CONSTRAINED_ITERATIVE_HAMILTON_EXACT_INTEGER_REMAINDERS",
  clusterSelection: "LOWEST_C0_SELECTION_DIGEST_THEN_ITEM_ID",
  selectionFormula: C0_AUDIT_SELECTION_FORMULA,
  selectionDigestCanonicalization: SELECTION_DIGEST_CANONICALIZATION,
  selectionDigestByteEncoding: SELECTION_DIGEST_BYTE_ENCODING,
  selectionDigestFieldOrder: C0_AUDIT_SELECTION_DIGEST_FIELD_ORDER,
  selectionRegistrationHashSemantic: C0_AUDIT_SELECTION_DIGEST_CONTRACT.registrationHashSemantic,
  selectionSampleContentRootSemantic: C0_AUDIT_SELECTION_DIGEST_CONTRACT.sampleSelectionContentRootHashSemantic,
  reroll: false,
  replacementAfterAnyLabelOrResult: false,
});

export const SAMPLE_ALGORITHM_HASH = sha256Hex(canonicalJson(SAMPLE_ALGORITHM_DESCRIPTOR));
export const C0_AUDIT_ALGORITHM_HASH = sha256Hex(canonicalJson(C0_AUDIT_ALGORITHM_DESCRIPTOR));

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SOURCE_COMMIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const GIT_BLOB_OID_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/iu;
const RFC3339_INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/u;
const GRADES = new Set(RUNTIME_SOURCE_ENUMERATION_GRADES);

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

/**
 * Normalize only values with an unambiguous JSON meaning before applying JCS.
 * Object properties whose value is undefined follow JSON object omission and
 * are deleted; undefined/sparse array slots and every other non-JSON value are
 * rejected so they cannot silently hash as null or disappear.
 */
export function canonicalizeStrictItemJsonV4(value) {
  const active = new Set();
  const visit = (current, path) => {
    if (current === null || typeof current === "boolean") return current;
    if (typeof current === "string") {
      if (hasLoneSurrogate(current)) throw new TypeError(`${path} contains a lone surrogate`);
      return current;
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current)) throw new TypeError(`${path} must be a finite JSON number`);
      return Object.is(current, -0) ? 0 : current;
    }
    if (["bigint", "function", "symbol"].includes(typeof current)) {
      throw new TypeError(`${path} contains an unsupported non-JSON value`);
    }
    if (typeof current === "undefined") throw new TypeError(`${path} contains an unsupported non-JSON undefined value`);
    if (!current || typeof current !== "object") throw new TypeError(`${path} contains an unsupported non-JSON value`);
    if (nodeUtilTypes.isProxy(current)) throw new TypeError(`${path} contains an unsupported Proxy before JSON reflection`);
    if (active.has(current)) throw new TypeError(`${path} contains a cycle`);
    active.add(current);
    try {
      if (Array.isArray(current)) {
        const allowedArrayKeys = new Set(["length", ...Array.from({ length: current.length }, (_, index) => String(index))]);
        const extraArrayKey = Reflect.ownKeys(current).find((key) => typeof key !== "string" || !allowedArrayKeys.has(key));
        if (extraArrayKey !== undefined) throw new TypeError(`${path} contains an unsupported extra array property`);
        const normalized = [];
        for (let index = 0; index < current.length; index += 1) {
          if (!Object.hasOwn(current, index)) throw new TypeError(`${path} contains a sparse array slot`);
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (!descriptor || Object.hasOwn(descriptor, "get") || Object.hasOwn(descriptor, "set")) {
            throw new TypeError(`${path}[${index}] contains an unsupported array accessor property`);
          }
          if (typeof descriptor.value === "undefined") throw new TypeError(`${path} contains array undefined`);
          normalized.push(visit(descriptor.value, `${path}[${index}]`));
        }
        return normalized;
      }
      const prototype = Object.getPrototypeOf(current);
      if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${path} contains an unsupported non-JSON object`);
      if (Object.getOwnPropertySymbols(current).length > 0) throw new TypeError(`${path} contains an unsupported symbol key`);
      const normalized = {};
      for (const key of Object.keys(current).sort(codePointCompare)) {
        if (hasLoneSurrogate(key)) throw new TypeError(`${path} contains a lone surrogate key`);
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || Object.hasOwn(descriptor, "get") || Object.hasOwn(descriptor, "set")) {
          throw new TypeError(`${path}.${key} contains an unsupported accessor`);
        }
        if (typeof descriptor.value === "undefined") continue;
        normalized[key] = visit(descriptor.value, `${path}.${key}`);
      }
      const hiddenKey = Object.getOwnPropertyNames(current).find((key) => !Object.getOwnPropertyDescriptor(current, key)?.enumerable);
      if (hiddenKey !== undefined) throw new TypeError(`${path}.${hiddenKey} contains unsupported non-enumerable object state`);
      return normalized;
    } finally {
      active.delete(current);
    }
  };
  return visit(value, "$item");
}

export function assertFrameFailureLedgerEmptyV4(failureLedger) {
  if (!Array.isArray(failureLedger)) throw new TypeError("frame failure ledger must be an array");
  for (const [index, entry] of failureLedger.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new TypeError(`frame failure ledger entry ${index} must be an object`);
    }
    if (!FRAME_FAILURE_CODES_V4.includes(entry.code)) {
      throw new TypeError(`unknown code ${String(entry.code)} is outside the closed V4 frame failure code set`);
    }
    canonicalizeStrictItemJsonV4(entry);
  }
  if (failureLedger.length > 0) {
    throw new TypeError(`frame freeze blocked by nonempty failure ledger: ${failureLedger.map(({ code }) => code).join(", ")}`);
  }
  return true;
}

function strictItemCanonicalJson(value) {
  return canonicalJson(canonicalizeStrictItemJsonV4(value));
}

function assertLocalizedTextBundleV4(value, field) {
  assertObject(value, field);
  const keys = Object.keys(value).sort(codePointCompare);
  const allowed = new Set(LOCALIZED_TEXT_KEYS_V4);
  if (keys.some((key) => !allowed.has(key)) || typeof value.en !== "string" || value.en.trim().length === 0
    || typeof value.zh !== "string" || value.zh.trim().length === 0
    || (Object.hasOwn(value, "zhHans") && (typeof value.zhHans !== "string" || value.zhHans.trim().length === 0))) {
    throw new TypeError(`${field} must be a closed LocalizedText bundle with nonempty en/zh and optional zhHans`);
  }
  canonicalizeStrictItemJsonV4(value);
}

function localizedEnglish(value, field) {
  assertLocalizedTextBundleV4(value, field);
  return value.en;
}

function resolvedPrivateAnswerV4(item) {
  const hasAnswer = Object.hasOwn(item, "answer") && item.answer !== undefined;
  const hasStoredAnswer = Object.hasOwn(item, "storedAnswer") && item.storedAnswer !== undefined;
  if (hasAnswer && hasStoredAnswer && !canonicalEqual(item.answer, item.storedAnswer)) {
    throw new TypeError("answer and storedAnswer are ambiguous");
  }
  return hasAnswer ? item.answer : item.storedAnswer;
}

function assertProviderLocalizedRuntimeBundleV4(item) {
  if (item.localePolicy !== V4_LOCALE_POLICY) {
    throw new TypeError(`localePolicy must be ${V4_LOCALE_POLICY}`);
  }
  assertLocalizedTextBundleV4(item.topic, "topic");
  assertLocalizedTextBundleV4(item.prompt, "prompt");
  if (item.options !== null && item.options !== undefined) {
    if (!Array.isArray(item.options)) throw new TypeError("options must be an array, null, or absent");
    item.options.forEach((option, index) => assertLocalizedTextBundleV4(option, `options[${index}]`));
  }
  if (item.explanation !== null && item.explanation !== undefined) {
    assertLocalizedTextBundleV4(item.explanation, "explanation");
  }
  const answer = resolvedPrivateAnswerV4(item);
  if (answer !== null && answer !== undefined && typeof answer !== "string") {
    throw new TypeError("answer must be a string, null, or absent");
  }
  if (item.acceptedAnswers !== null && item.acceptedAnswers !== undefined
    && (!Array.isArray(item.acceptedAnswers) || item.acceptedAnswers.some((entry) => typeof entry !== "string"))) {
    throw new TypeError("acceptedAnswers must be an array of strings, null, or absent");
  }
}

function assertCurrentProviderVisualAllowlistV4(item) {
  if ((item.diagram !== null && item.diagram !== undefined)
    || (item.questionAssets !== null && item.questionAssets !== undefined
      && (!Array.isArray(item.questionAssets) || item.questionAssets.length > 0))) {
    throw new TypeError("UNAUTHORIZED_VISUAL_OR_ASSET_EGRESS: current provider allowlist excludes diagram and questionAssets content");
  }
}

function assertFrozenV4MethodProjectionLeaf(item) {
  assertCurrentProviderVisualAllowlistV4(item);
  assertProviderLocalizedRuntimeBundleV4(item);
  if (item.rubric !== "MAIS_NATURAL_CA60_QA_RUBRIC_V4") {
    throw new TypeError("method projection rubric must equal the frozen V4 rubric constant");
  }
}

function samplePseudonymSeedFieldsV4(sampleManifest) {
  return {
    designId: sampleManifest.designId,
    registrationHash: sampleManifest.registrationHash,
    frameRegistrationHash: sampleManifest.frameRegistrationHash,
    manifestFrozenAt: sampleManifest.manifestFrozenAt,
    sampleVersion: sampleManifest.sampleVersion,
    supersedesSampleManifestHash: sampleManifest.supersedesSampleManifestHash,
    algorithmVersion: sampleManifest.algorithmVersion,
    manifestTupleRootHash: sampleManifest.manifestTupleRootHash,
  };
}

export function materializeSamplePseudonymFieldsV4(sampleManifestDraftInput) {
  const sampleManifestDraft = canonicalizeStrictItemJsonV4(sampleManifestDraftInput);
  assertObject(sampleManifestDraft, "sample manifest pseudonym draft");
  if (sampleManifestDraft.designId !== DESIGN_ID
    || sampleManifestDraft.algorithmVersion !== SAMPLE_ALGORITHM_VERSION) {
    throw new TypeError("sample manifest pseudonym draft design/algorithm mismatch");
  }
  assertSha256(sampleManifestDraft.registrationHash, "sample pseudonym registrationHash");
  assertSha256(sampleManifestDraft.frameRegistrationHash, "sample pseudonym frameRegistrationHash");
  assertTimestamp(sampleManifestDraft.manifestFrozenAt, "sample pseudonym manifestFrozenAt");
  if (!Number.isSafeInteger(sampleManifestDraft.sampleVersion) || sampleManifestDraft.sampleVersion < 1) {
    throw new TypeError("sample pseudonym sampleVersion must be a positive safe integer");
  }
  if (sampleManifestDraft.supersedesSampleManifestHash !== null) {
    assertSha256(sampleManifestDraft.supersedesSampleManifestHash, "sample pseudonym supersedesSampleManifestHash");
  }
  if (!Array.isArray(sampleManifestDraft.selectedRows) || sampleManifestDraft.selectedRows.length === 0) {
    throw new TypeError("sample pseudonym materialization requires selected rows");
  }
  const manifestTupleRootHash = calculateManifestTupleRootV3(sampleManifestDraft.selectedRows);
  if (sampleManifestDraft.manifestTupleRootHash !== manifestTupleRootHash) {
    throw new TypeError("sample pseudonym materialization tuple root mismatch");
  }
  const pseudonymSeedRootHash = sha256Hex(canonicalJson(samplePseudonymSeedFieldsV4(sampleManifestDraft)));
  const itemIds = new Set();
  const pseudonyms = new Set();
  const selectedRows = sampleManifestDraft.selectedRows.map((row, index) => {
    assertObject(row, `sample pseudonym selectedRows[${index}]`);
    assertPipeSafe(row.itemId, `sample pseudonym selectedRows[${index}].itemId`);
    assertSha256(row.itemHash, `sample pseudonym selectedRows[${index}].itemHash`);
    assertPipeSafe(row.clusterId, `sample pseudonym selectedRows[${index}].clusterId`);
    if (itemIds.has(row.itemId)) throw new TypeError(`sample pseudonym materialization repeats itemId ${row.itemId}`);
    itemIds.add(row.itemId);
    const itemIdPseudonym = `ca60-${sha256Hex(canonicalJson([
      pseudonymSeedRootHash,
      row.itemId,
      row.itemHash,
      row.clusterId,
    ])).slice(0, 32)}`;
    if (pseudonyms.has(itemIdPseudonym)) throw new TypeError(`sample pseudonym materialization repeats pseudonym ${itemIdPseudonym}`);
    pseudonyms.add(itemIdPseudonym);
    return { ...row, itemIdPseudonym };
  });
  const mappingTuples = selectedRows.map((row) => [
    row.itemId,
    row.itemHash,
    row.clusterId,
    row.itemIdPseudonym,
  ]).sort((left, right) => codePointCompare(left[0], right[0]));
  return {
    ...sampleManifestDraft,
    pseudonymFormula: SAMPLE_ITEM_PSEUDONYM_FORMULA_V4,
    pseudonymSeedRootHash,
    pseudonymMappingRootHash: sha256Hex(canonicalJson(mappingTuples)),
    selectedRows,
  };
}

export function deriveSamplePseudonymMappingV4(sampleManifestInput) {
  const sampleManifest = canonicalizeStrictItemJsonV4(sampleManifestInput);
  assertObject(sampleManifest, "sampleManifest");
  if (!["SampleManifestV2", "SampleManifestV3"].includes(sampleManifest.schemaVersion)
    || sampleManifest.designId !== DESIGN_ID) {
    throw new TypeError("frozen sampleManifest artifact schema/design mismatch");
  }
  if (!artifactHashMatches(sampleManifest, "sampleManifestHash")) {
    throw new TypeError("frozen sampleManifest artifact hash mismatch");
  }
  validateSampleReplacementAuthorityChainV4(sampleManifest);
  assertSha256(sampleManifest.registrationHash, "sampleManifest.registrationHash");
  assertSha256(sampleManifest.frameRegistrationHash, "sampleManifest.frameRegistrationHash");
  assertTimestamp(sampleManifest.manifestFrozenAt, "sampleManifest.manifestFrozenAt");
  if (!Number.isSafeInteger(sampleManifest.sampleVersion) || sampleManifest.sampleVersion < 1) {
    throw new TypeError("sampleManifest.sampleVersion must be a positive safe integer");
  }
  if (sampleManifest.supersedesSampleManifestHash !== null) {
    assertSha256(sampleManifest.supersedesSampleManifestHash, "sampleManifest.supersedesSampleManifestHash");
  }
  if (sampleManifest.algorithmVersion !== SAMPLE_ALGORITHM_VERSION) {
    throw new TypeError("sampleManifest algorithmVersion mismatch");
  }
  if (!Array.isArray(sampleManifest.selectedRows) || sampleManifest.selectedRows.length === 0) {
    throw new TypeError("frozen sampleManifest requires selected rows");
  }
  const manifestTupleRootHash = calculateManifestTupleRootV3(sampleManifest.selectedRows);
  if (sampleManifest.manifestTupleRootHash !== manifestTupleRootHash) {
    throw new TypeError("frozen sampleManifest tuple root mismatch");
  }
  const pseudonymSeedRootHash = sha256Hex(canonicalJson(samplePseudonymSeedFieldsV4(sampleManifest)));
  if (sampleManifest.pseudonymSeedRootHash !== pseudonymSeedRootHash
    || sampleManifest.pseudonymFormula !== SAMPLE_ITEM_PSEUDONYM_FORMULA_V4) {
    throw new TypeError("frozen sampleManifest pseudonym seed/formula mismatch");
  }
  const itemIds = new Set();
  const pseudonyms = new Set();
  const mappings = sampleManifest.selectedRows.map((row, index) => {
    assertObject(row, `sampleManifest.selectedRows[${index}]`);
    assertPipeSafe(row.itemId, `sampleManifest.selectedRows[${index}].itemId`);
    assertSha256(row.itemHash, `sampleManifest.selectedRows[${index}].itemHash`);
    assertPipeSafe(row.clusterId, `sampleManifest.selectedRows[${index}].clusterId`);
    if (itemIds.has(row.itemId)) throw new TypeError(`frozen sampleManifest repeats itemId ${row.itemId}`);
    itemIds.add(row.itemId);
    const itemIdPseudonym = `ca60-${sha256Hex(canonicalJson([
      pseudonymSeedRootHash,
      row.itemId,
      row.itemHash,
      row.clusterId,
    ])).slice(0, 32)}`;
    if (row.itemIdPseudonym !== itemIdPseudonym) {
      throw new TypeError(`frozen sampleManifest pseudonym mapping mismatch for ${row.itemId}`);
    }
    if (pseudonyms.has(itemIdPseudonym)) throw new TypeError(`frozen sampleManifest repeats pseudonym ${itemIdPseudonym}`);
    pseudonyms.add(itemIdPseudonym);
    return { itemId: row.itemId, itemHash: row.itemHash, clusterId: row.clusterId, itemIdPseudonym };
  }).sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const pseudonymMappingRootHash = sha256Hex(canonicalJson(mappings.map((row) => [
    row.itemId,
    row.itemHash,
    row.clusterId,
    row.itemIdPseudonym,
  ])));
  if (sampleManifest.pseudonymMappingRootHash !== pseudonymMappingRootHash) {
    throw new TypeError("frozen sampleManifest pseudonym mapping root mismatch");
  }
  return {
    pseudonymSeedRootHash,
    pseudonymMappingRootHash,
    mappings,
  };
}

function validateSampleReplacementAuthorityChainV4(sampleManifest, historyDepth = 0) {
  assertObject(sampleManifest, "sample manifest replacement authority chain node");
  if (historyDepth > 60) throw new TypeError("sample replacement authority history exceeds the frozen bound");
  if (!artifactHashMatches(sampleManifest, "sampleManifestHash")) {
    throw new TypeError("sample replacement authority chain manifest hash mismatch");
  }
  if (sampleManifest.sampleVersion === 1) {
    if (sampleManifest.schemaVersion !== "SampleManifestV2"
      || sampleManifest.supersedesSampleManifestHash !== null
      || (sampleManifest.supersededSampleManifest ?? null) !== null
      || (sampleManifest.registeredPreResultExclusions?.length ?? 0) !== 0
      || (sampleManifest.replacementHistory?.length ?? 0) !== 0
      || Object.hasOwn(sampleManifest, "replacementAuthorization")) {
      throw new TypeError("initial sample manifest must not carry replacement authority or history");
    }
    return true;
  }
  if (sampleManifest.schemaVersion !== "SampleManifestV3") {
    throw new TypeError("replacement sample manifest requires the authority-bound SampleManifestV3 schema");
  }
  const previous = sampleManifest.supersededSampleManifest;
  assertObject(previous, "replacement sample superseded manifest");
  if (sampleManifest.supersedesSampleManifestHash !== previous.sampleManifestHash
    || sampleManifest.sampleVersion !== previous.sampleVersion + 1) {
    throw new TypeError("replacement sample authority chain predecessor/version mismatch");
  }
  validateSampleReplacementAuthorityChainV4(previous, historyDepth + 1);
  const previousExclusions = previous.registeredPreResultExclusions;
  const currentExclusions = sampleManifest.registeredPreResultExclusions;
  if (!Array.isArray(previousExclusions) || !Array.isArray(currentExclusions)
    || currentExclusions.length !== previousExclusions.length + 1
    || currentExclusions.length !== sampleManifest.sampleVersion - 1
    || !canonicalEqual(currentExclusions.slice(0, -1), previousExclusions)) {
    throw new TypeError("replacement exclusion history must be an exact one-entry append of the superseded sample exclusions");
  }
  const previousHistory = previous.replacementHistory;
  const currentHistory = sampleManifest.replacementHistory;
  if (!Array.isArray(previousHistory) || !Array.isArray(currentHistory)
    || currentHistory.length !== previousHistory.length + 1
    || currentHistory.length !== sampleManifest.sampleVersion - 1
    || !canonicalEqual(currentHistory.slice(0, -1), previousHistory)) {
    throw new TypeError("replacement history prefix must be the exact immutable superseded history plus one entry");
  }
  const latestExclusion = currentExclusions.at(-1);
  const latestHistory = currentHistory.at(-1);
  assertObject(latestExclusion, "replacement sample latest exclusion");
  assertObject(latestHistory, "replacement sample latest authority history entry");
  if (latestHistory.exclusionIndex !== currentExclusions.length
    || latestHistory.removedItemId !== latestExclusion.itemId
    || latestHistory.removedItemHash !== latestExclusion.itemHash
    || latestHistory.exclusionCode !== latestExclusion.exclusionCode
    || latestHistory.exclusionEvidenceHash !== latestExclusion.evidenceHash) {
    throw new TypeError("replacement latest history removal fields do not match the exact appended exclusion/version index");
  }
  if (!Array.isArray(previous.selectedRows) || !Array.isArray(sampleManifest.selectedRows)) {
    throw new TypeError("replacement authority chain requires selected row arrays at every version");
  }
  const selectedIdentityMap = (rows, label) => {
    const byId = new Map();
    for (const [index, row] of rows.entries()) {
      assertObject(row, `${label}[${index}]`);
      assertPipeSafe(row.itemId, `${label}[${index}].itemId`);
      assertSha256(row.itemHash, `${label}[${index}].itemHash`);
      assertPipeSafe(row.clusterId, `${label}[${index}].clusterId`);
      assertPipeSafe(row.stratum, `${label}[${index}].stratum`);
      if (byId.has(row.itemId)) throw new TypeError(`replacement authority chain repeats selected itemId ${row.itemId}`);
      byId.set(row.itemId, row);
    }
    return byId;
  };
  const previousSelectedById = selectedIdentityMap(previous.selectedRows, "superseded selectedRows");
  const currentSelectedById = selectedIdentityMap(sampleManifest.selectedRows, "current selectedRows");
  if (previousSelectedById.size !== currentSelectedById.size) {
    throw new TypeError("replacement authority transition must preserve the frozen sample size");
  }
  const removedRows = [...previousSelectedById.values()].filter((row) => !currentSelectedById.has(row.itemId));
  const addedRows = [...currentSelectedById.values()].filter((row) => !previousSelectedById.has(row.itemId));
  for (const [itemId, previousRow] of previousSelectedById) {
    const currentRow = currentSelectedById.get(itemId);
    if (currentRow && (currentRow.itemHash !== previousRow.itemHash
      || currentRow.clusterId !== previousRow.clusterId
      || currentRow.stratum !== previousRow.stratum)) {
      throw new TypeError(`replacement authority transition changes retained selected identity ${itemId}`);
    }
  }
  if (removedRows.length !== 1 || addedRows.length !== 1) {
    throw new TypeError("replacement authority transition must derive exactly one removed and one new selected item");
  }
  const [removedRow] = removedRows;
  const [addedRow] = addedRows;
  if (latestExclusion.itemId !== removedRow.itemId
    || latestExclusion.itemHash !== removedRow.itemHash
    || latestHistory.removedItemId !== removedRow.itemId
    || latestHistory.removedItemHash !== removedRow.itemHash
    || latestHistory.replacementItemId !== addedRow.itemId
    || latestHistory.replacementItemHash !== addedRow.itemHash
    || latestHistory.replacementClusterId !== addedRow.clusterId
    || latestHistory.replacementStratum !== addedRow.stratum) {
    throw new TypeError("replacement latest history does not match the uniquely derived selected-row transition");
  }
  const verifiedAuthorization = validateSampleReplacementAuthorizationV4(sampleManifest.replacementAuthorization, {
    previousSampleManifest: previous,
    replacementDraft: sampleManifest,
  });
  if (sampleManifest.replacementAuthorizationHash !== verifiedAuthorization.replacementAuthorizationHash) {
    throw new TypeError("replacement sample manifest authority root mismatch");
  }
  for (const field of [
    "trustedExclusionEvidenceInventoryHash",
    "beforeExecutionLedgerHash",
    "afterExecutionLedgerHash",
    "replacementReceiptHash",
    "replacementAuthorizationHash",
  ]) {
    const authorizationField = field === "replacementAuthorizationHash"
      ? verifiedAuthorization.replacementAuthorizationHash
      : verifiedAuthorization[field];
    if (latestHistory[field] !== authorizationField) {
      throw new TypeError(`replacement sample history ${field} does not match its persisted authority artifact`);
    }
  }
  const expectedAuthorityHistoryRootHash = sha256Hex(canonicalJson(sampleManifest.replacementHistory));
  if (sampleManifest.replacementAuthorityHistoryRootHash !== expectedAuthorityHistoryRootHash) {
    throw new TypeError("replacement sample authority history root mismatch");
  }
  return true;
}

/**
 * Bind a protected runtime item to its frozen sample membership and unique
 * pseudonym. This envelope is local-only metadata; it deliberately contains no
 * question or private-label payload. The method contract remains the sole
 * authority for role-specific Qwen and DeepSeek egress projections.
 */
export function buildSampleBoundProtectedItemEnvelopeV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  if (!normalizedInput || typeof normalizedInput !== "object" || Array.isArray(normalizedInput)
    || !normalizedInput.item || !normalizedInput.sampleManifest) {
    throw new TypeError("sample-bound protected item requires an item and frozen sampleManifest artifact; caller-chosen pseudonyms are forbidden");
  }
  const item = normalizedInput.item;
  const sampleManifest = normalizedInput.sampleManifest;
  assertFrozenV4MethodProjectionLeaf(item);
  const mapping = deriveSamplePseudonymMappingV4(sampleManifest);
  const itemHash = calculateItemContentHashV4(item);
  const matches = mapping.mappings.filter((row) => row.itemId === item.itemId);
  if (matches.length !== 1) throw new TypeError("protected item is not an exact member of the frozen sample manifest");
  const selected = matches[0];
  if (selected.itemHash !== itemHash || selected.clusterId !== item.homologyClusterId) {
    throw new TypeError("protected item hash/cluster membership does not match the frozen sample manifest");
  }
  if (selected.itemIdPseudonym === item.itemId) {
    throw new TypeError("frozen sample pseudonym must not expose the real runtime itemId");
  }
  return calculateArtifact({
    schemaVersion: "SampleBoundProtectedItemEnvelopeV1",
    designId: DESIGN_ID,
    projectionDisposition: "PROTECTED_LOCAL_ONLY_NOT_PROVIDER_PAYLOAD",
    itemId: item.itemId,
    itemHash,
    sourceLineageClusterId: item.clusterId ?? null,
    homologyClusterId: item.homologyClusterId,
    itemPseudonym: selected.itemIdPseudonym,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    pseudonymSeedRootHash: mapping.pseudonymSeedRootHash,
    pseudonymMappingRootHash: mapping.pseudonymMappingRootHash,
  }, "protectedEnvelopeHash");
}

export function buildScannerExecutionReceiptV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "scanner execution receipt input");
  const allowedFields = new Set([
    "itemId",
    "itemHash",
    "screeningPolicyHash",
    "scannerImplementationHash",
    "scannerRunnerHash",
    "scannerExecutionStatus",
    "piiEvidenceRootHash",
    "secretEvidenceRootHash",
    "piiFindingCount",
    "secretFindingCount",
    "executedAt",
  ]);
  const unknownFields = Object.keys(normalizedInput).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) throw new TypeError(`scanner execution receipt contains unknown fields: ${unknownFields.join(", ")}`);
  const {
    itemId,
    itemHash,
    screeningPolicyHash,
    scannerImplementationHash,
    scannerRunnerHash,
    scannerExecutionStatus,
    piiEvidenceRootHash,
    secretEvidenceRootHash,
    piiFindingCount,
    secretFindingCount,
    executedAt,
  } = normalizedInput;
  assertPipeSafe(itemId, "scannerExecutionReceipt.itemId");
  for (const [field, value] of Object.entries({
    itemHash,
    screeningPolicyHash,
    scannerImplementationHash,
    scannerRunnerHash,
    piiEvidenceRootHash,
    secretEvidenceRootHash,
  })) assertSha256(value, `scannerExecutionReceipt.${field}`);
  if (![
    "COMPLETED",
    "FAILED",
  ].includes(scannerExecutionStatus)) {
    throw new TypeError("scannerExecutionReceipt.scannerExecutionStatus must be COMPLETED or FAILED");
  }
  if (!Number.isSafeInteger(piiFindingCount) || piiFindingCount < 0
    || !Number.isSafeInteger(secretFindingCount) || secretFindingCount < 0) {
    throw new TypeError("PII and secret finding counts must be nonnegative safe integers");
  }
  assertTimestamp(executedAt, "scannerExecutionReceipt.executedAt");
  return calculateArtifact({
    schemaVersion: "ScannerExecutionReceiptV1",
    itemId,
    itemHash,
    screeningPolicyHash,
    scannerImplementationHash,
    scannerRunnerHash,
    scannerExecutionStatus,
    piiEvidenceRootHash,
    secretEvidenceRootHash,
    piiFindingCount,
    secretFindingCount,
    executedAt,
  }, "scannerExecutionReceiptHash");
}

function validateScannerExecutionReceiptV4(receipt) {
  assertObject(receipt, "scanner execution receipt");
  if (!artifactHashMatches(receipt, "scannerExecutionReceiptHash")) {
    throw new TypeError("scanner execution receipt self-hash mismatch");
  }
  const expected = buildScannerExecutionReceiptV4({
    itemId: receipt.itemId,
    itemHash: receipt.itemHash,
    screeningPolicyHash: receipt.screeningPolicyHash,
    scannerImplementationHash: receipt.scannerImplementationHash,
    scannerRunnerHash: receipt.scannerRunnerHash,
    scannerExecutionStatus: receipt.scannerExecutionStatus,
    piiEvidenceRootHash: receipt.piiEvidenceRootHash,
    secretEvidenceRootHash: receipt.secretEvidenceRootHash,
    piiFindingCount: receipt.piiFindingCount,
    secretFindingCount: receipt.secretFindingCount,
    executedAt: receipt.executedAt,
  });
  if (!canonicalEqual(receipt, expected)) throw new TypeError("scanner execution receipt closed shape mismatch");
  return expected;
}

export function buildScannerExecutionReceiptInventoryV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "scanner execution receipt inventory input");
  const allowedFields = new Set(["scannerExecutionReceipts", "recordedAt"]);
  const unknownFields = Object.keys(normalizedInput).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) throw new TypeError(`scanner execution receipt inventory contains unknown fields: ${unknownFields.join(", ")}`);
  const { scannerExecutionReceipts, recordedAt } = normalizedInput;
  if (!Array.isArray(scannerExecutionReceipts) || scannerExecutionReceipts.length === 0) {
    throw new TypeError("scanner execution receipt inventory requires a nonempty receipt array");
  }
  assertTimestamp(recordedAt, "scannerExecutionReceiptInventory.recordedAt");
  const seenItemIds = new Set();
  const entries = scannerExecutionReceipts.map((receipt) => {
    const verified = validateScannerExecutionReceiptV4(receipt);
    if (seenItemIds.has(verified.itemId)) throw new TypeError(`scanner execution receipt inventory repeats itemId ${verified.itemId}`);
    seenItemIds.add(verified.itemId);
    if (timestampMillis(verified.executedAt, "scannerExecutionReceipt.executedAt")
      > timestampMillis(recordedAt, "scannerExecutionReceiptInventory.recordedAt")) {
      throw new TypeError("scanner execution receipt inventory cannot predate a scanner execution");
    }
    return {
      itemId: verified.itemId,
      itemHash: verified.itemHash,
      scannerExecutionReceiptHash: verified.scannerExecutionReceiptHash,
    };
  }).sort((left, right) => codePointCompare(left.itemId, right.itemId));
  return calculateArtifact({
    schemaVersion: "ScannerExecutionReceiptInventoryV1",
    designId: DESIGN_ID,
    recordedAt,
    entries,
    receiptCount: entries.length,
    scannerExecutionReceiptRootHash: sha256Hex(canonicalJson(entries)),
  }, "scannerExecutionReceiptInventoryHash");
}

function validateScannerExecutionReceiptInventoryV4(inventory) {
  assertObject(inventory, "scanner execution receipt inventory");
  if (!artifactHashMatches(inventory, "scannerExecutionReceiptInventoryHash")) {
    throw new TypeError("scanner execution receipt inventory self-hash mismatch");
  }
  assertTimestamp(inventory.recordedAt, "scanner execution receipt inventory recordedAt");
  const expectedEntries = inventory.entries;
  if (!Array.isArray(expectedEntries) || expectedEntries.length === 0) {
    throw new TypeError("scanner execution receipt inventory entries must be nonempty");
  }
  const seenItemIds = new Set();
  for (const entry of expectedEntries) {
    assertObject(entry, "scanner execution receipt inventory entry");
    if (!canonicalEqual(Object.keys(entry).sort(codePointCompare), [
      "itemHash",
      "itemId",
      "scannerExecutionReceiptHash",
    ].sort(codePointCompare))) throw new TypeError("scanner execution receipt inventory entry closed shape mismatch");
    assertPipeSafe(entry.itemId, "scanner execution receipt inventory itemId");
    assertSha256(entry.itemHash, "scanner execution receipt inventory itemHash");
    assertSha256(entry.scannerExecutionReceiptHash, "scanner execution receipt inventory receipt hash");
    if (seenItemIds.has(entry.itemId)) throw new TypeError(`scanner execution receipt inventory repeats itemId ${entry.itemId}`);
    seenItemIds.add(entry.itemId);
  }
  const expected = calculateArtifact({
    schemaVersion: "ScannerExecutionReceiptInventoryV1",
    designId: DESIGN_ID,
    recordedAt: inventory.recordedAt,
    entries: [...expectedEntries].sort((left, right) => codePointCompare(left.itemId, right.itemId)),
    receiptCount: expectedEntries.length,
    scannerExecutionReceiptRootHash: sha256Hex(canonicalJson([...expectedEntries].sort((left, right) => codePointCompare(left.itemId, right.itemId)))),
  }, "scannerExecutionReceiptInventoryHash");
  if (!canonicalEqual(inventory, expected)) throw new TypeError("scanner execution receipt inventory closed shape or root mismatch");
  return expected;
}

export function buildItemEgressScreenEvidenceV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "item egress screen evidence input");
  if (!canonicalEqual(Object.keys(normalizedInput), ["scannerExecutionReceipt"])) {
    throw new TypeError("item egress screen evidence requires only the complete scannerExecutionReceipt artifact");
  }
  const scannerExecutionReceipt = validateScannerExecutionReceiptV4(normalizedInput.scannerExecutionReceipt);
  const {
    itemId,
    itemHash,
    screeningPolicyHash,
    scannerImplementationHash,
    scannerRunnerHash,
    scannerExecutionReceiptHash,
    scannerExecutionStatus,
    piiEvidenceRootHash,
    secretEvidenceRootHash,
    piiFindingCount,
    secretFindingCount,
    executedAt,
  } = scannerExecutionReceipt;
  return calculateArtifact({
    schemaVersion: "ItemEgressScreenEvidenceV2",
    itemId,
    itemHash,
    screeningPolicyHash,
    scannerImplementationHash,
    scannerRunnerHash,
    scannerExecutionReceiptHash,
    scannerExecutionReceipt,
    scannerExecutionStatus,
    piiEvidenceRootHash,
    secretEvidenceRootHash,
    piiFindingCount,
    secretFindingCount,
    screenDisposition: scannerExecutionStatus === "FAILED"
      ? "EXECUTION_FAILED"
      : piiFindingCount === 0 && secretFindingCount === 0 ? "PASSED" : "CONTENT_RESTRICTED",
    screenedAt: executedAt,
  }, "screenEvidenceHash");
}

/**
 * Decide whether a protected item may be materialized into a provider payload.
 * Visual/asset-bearing items remain part of the protected item-hash population,
 * but the current allowlist always excludes them from egress and records only a
 * content-free ledger leaf.
 */
export function buildFrameItemEgressDecisionV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "frame item egress screening input");
  const allowedFields = new Set([
    "item",
    "rightsDecisionInput",
    "rightsDecisionTable",
    "trustedOwnerApprovalRootHash",
    "screenEvidence",
    "scannerExecutionReceiptInventory",
    "trustedScannerExecutionReceiptInventoryHash",
    "trustedScreeningPolicyHash",
    "trustedScannerImplementationHash",
    "trustedScannerRunnerHash",
  ]);
  const unknownFields = Object.keys(normalizedInput).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    throw new TypeError(`frame item egress screening input contains unknown caller-certified fields: ${unknownFields.join(", ")}`);
  }
  const {
    item,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash,
    screenEvidence,
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash,
    trustedScannerImplementationHash,
    trustedScannerRunnerHash,
  } = normalizedInput;
  assertObject(item, "item");
  assertObject(rightsDecisionTable, "rightsDecisionTable");
  if (!artifactHashMatches(rightsDecisionTable, "rightsDecisionTableHash")) {
    throw new TypeError("rights decision table hash must be valid before frame egress screening");
  }
  const expectedRightsDecisionTable = buildRightsEgressDecisionTableV4(rightsDecisionInput);
  if (!canonicalEqual(rightsDecisionTable, expectedRightsDecisionTable)) {
    throw new TypeError("rights decision table mismatch after recomputation from trusted owner-bound input");
  }
  assertSha256(trustedOwnerApprovalRootHash, "out-of-band trusted owner approval root");
  if (rightsDecisionTable.ownerApprovalClaimRootHash !== trustedOwnerApprovalRootHash) {
    throw new TypeError("rights decision table is not bound to the out-of-band trusted owner approval root");
  }
  const itemHash = calculateItemContentHashV4(item);
  assertObject(screenEvidence, "screenEvidence");
  if (!artifactHashMatches(screenEvidence, "screenEvidenceHash")) {
    throw new TypeError("item PII/secret screen evidence hash mismatch");
  }
  const rebuiltScreenEvidence = buildItemEgressScreenEvidenceV4({
    scannerExecutionReceipt: screenEvidence.scannerExecutionReceipt,
  });
  if (!canonicalEqual(screenEvidence, rebuiltScreenEvidence)
    || screenEvidence.itemId !== item.itemId || screenEvidence.itemHash !== itemHash) {
    throw new TypeError("item PII/secret screen evidence does not bind the exact protected item identity");
  }
  if (screenEvidence.screeningPolicyHash !== trustedScreeningPolicyHash
    || screenEvidence.scannerImplementationHash !== trustedScannerImplementationHash
    || screenEvidence.scannerRunnerHash !== trustedScannerRunnerHash) {
    throw new TypeError("item PII/secret screen evidence is not bound to the trusted scanner roots");
  }
  const verifiedScannerInventory = validateScannerExecutionReceiptInventoryV4(scannerExecutionReceiptInventory);
  assertSha256(trustedScannerExecutionReceiptInventoryHash, "out-of-band trusted scanner execution receipt inventory hash");
  if (verifiedScannerInventory.scannerExecutionReceiptInventoryHash !== trustedScannerExecutionReceiptInventoryHash) {
    throw new TypeError("scanner execution receipt inventory does not match the out-of-band trusted scanner inventory hash");
  }
  const scannerInventoryMatches = verifiedScannerInventory.entries.filter((entry) => entry.itemId === item.itemId);
  if (scannerInventoryMatches.length !== 1
    || scannerInventoryMatches[0].itemHash !== itemHash
    || scannerInventoryMatches[0].scannerExecutionReceiptHash !== screenEvidence.scannerExecutionReceiptHash) {
    throw new TypeError("item screen evidence is not an exact member of the trusted scanner execution receipt inventory");
  }
  if (timestampMillis(screenEvidence.scannerExecutionReceipt.executedAt, "scanner execution receipt executedAt")
    > timestampMillis(verifiedScannerInventory.recordedAt, "scanner execution receipt inventory recordedAt")) {
    throw new TypeError("scanner execution receipt inventory cannot predate the exact scanner execution recordedAt chronology");
  }
  const frameFailureLedger = [];
  const restrictionReasonCodes = [];
  const preflight = buildFrameItemPreflightV4(item);
  frameFailureLedger.push(...preflight.frameFailureLedger.map((entry) => ({ ...entry, itemId: item.itemId, itemHash })));
  const screenExecutionFailed = screenEvidence.screenDisposition === "EXECUTION_FAILED";
  const screenContentRestricted = screenEvidence.screenDisposition === "CONTENT_RESTRICTED";
  if (screenExecutionFailed) {
    frameFailureLedger.push({ code: "PII_SCREEN_FAILED", itemId: item.itemId, itemHash, screenEvidenceHash: screenEvidence.screenEvidenceHash });
    restrictionReasonCodes.push("PII_OR_SECRET_SCREEN_EXECUTION_FAILED");
  } else if (screenContentRestricted) {
    restrictionReasonCodes.push("PII_OR_SECRET_CONTENT_RESTRICTED");
  }
  if (!Array.isArray(item.sourceIds) || item.sourceIds.length === 0 || !Array.isArray(rightsDecisionTable.decisions)) {
    frameFailureLedger.push({ code: "RIGHTS_UNRESOLVED", itemId: item.itemId, itemHash });
    restrictionReasonCodes.push("RIGHTS_NOT_OWNER_APPROVED");
  }
  const decisionBySource = new Map(rightsDecisionTable.decisions.map((decision) => [decision.sourceId, decision]));
  let rightsDenied = false;
  for (const sourceId of Array.isArray(item.sourceIds) ? item.sourceIds : []) {
    const decision = decisionBySource.get(sourceId);
    if (!decision || decision.failureCode === "RIGHTS_UNRESOLVED") {
      frameFailureLedger.push({ code: "RIGHTS_UNRESOLVED", itemId: item.itemId, itemHash, sourceId });
      restrictionReasonCodes.push("RIGHTS_NOT_OWNER_APPROVED");
    } else if (decision.disposition === "DENIED") {
      rightsDenied = true;
      restrictionReasonCodes.push("RIGHTS_EXPLICITLY_DENIED");
    } else if (decision.disposition !== "OWNER_APPROVED" || decision.egressEligible !== true) {
      frameFailureLedger.push({ code: "RIGHTS_UNRESOLVED", itemId: item.itemId, itemHash, sourceId });
      restrictionReasonCodes.push("RIGHTS_NOT_OWNER_APPROVED");
    }
  }
  const assetLedger = [];
  if (item.diagram !== null && item.diagram !== undefined) {
    assetLedger.push(calculateArtifact({
      schemaVersion: "FrameAssetEgressLedgerEntryV2",
      itemId: item.itemId,
      itemHash,
      assetKind: "DIAGRAM",
      assetIndex: null,
      assetContentHash: sha256Hex(strictItemCanonicalJson(item.diagram)),
      exclusionCode: "RESTRICTED_EGRESS_CONTENT",
      disposition: "UNAUTHORIZED_VISUAL_OR_ASSET_EGRESS",
    }, "entryHash"));
    restrictionReasonCodes.push("UNAUTHORIZED_VISUAL_OR_ASSET_EGRESS");
  }
  if (item.questionAssets !== null && item.questionAssets !== undefined) {
    if (Array.isArray(item.questionAssets)) {
      for (const [assetIndex, asset] of item.questionAssets.entries()) {
        assetLedger.push(calculateArtifact({
          schemaVersion: "FrameAssetEgressLedgerEntryV2",
          itemId: item.itemId,
          itemHash,
          assetKind: "QUESTION_ASSET",
          assetIndex,
          assetContentHash: sha256Hex(strictItemCanonicalJson(asset)),
          exclusionCode: "RESTRICTED_EGRESS_CONTENT",
          disposition: "UNAUTHORIZED_VISUAL_OR_ASSET_EGRESS",
        }, "entryHash"));
      }
      if (item.questionAssets.length > 0) restrictionReasonCodes.push("UNAUTHORIZED_VISUAL_OR_ASSET_EGRESS");
    } else {
      assetLedger.push(calculateArtifact({
        schemaVersion: "FrameAssetEgressLedgerEntryV2",
        itemId: item.itemId,
        itemHash,
        assetKind: "QUESTION_ASSETS_CONTAINER",
        assetIndex: null,
        assetContentHash: sha256Hex(strictItemCanonicalJson(item.questionAssets)),
        exclusionCode: "RESTRICTED_EGRESS_CONTENT",
        disposition: "ASSET_UNRESOLVED",
      }, "entryHash"));
      frameFailureLedger.push({ code: "ASSET_UNRESOLVED", itemId: item.itemId, itemHash });
      restrictionReasonCodes.push("ASSET_UNRESOLVED");
    }
  }
  const deduplicatedFailures = [...new Map(frameFailureLedger.map((entry) => [canonicalJson(entry), entry])).values()]
    .sort((left, right) => FRAME_FAILURE_CODES_V4.indexOf(left.code) - FRAME_FAILURE_CODES_V4.indexOf(right.code)
      || codePointCompare(left.itemId ?? "", right.itemId ?? "")
      || codePointCompare(left.sourceId ?? "", right.sourceId ?? "")
      || codePointCompare(canonicalJson(left), canonicalJson(right)));
  const deduplicatedRestrictions = [...new Set(restrictionReasonCodes)];
  const eligible = deduplicatedFailures.length === 0 && !screenContentRestricted && !rightsDenied && assetLedger.length === 0;
  return calculateArtifact({
      schemaVersion: "FrameItemEgressDecisionV3",
      itemId: item.itemId,
      itemHash,
      rightsDecisionTableHash: rightsDecisionTable.rightsDecisionTableHash,
      screenEvidenceHash: screenEvidence.screenEvidenceHash,
      scannerExecutionReceiptHash: screenEvidence.scannerExecutionReceiptHash,
      scannerExecutionReceiptInventoryHash: verifiedScannerInventory.scannerExecutionReceiptInventoryHash,
      eligible,
      exclusionCode: eligible ? null : "RESTRICTED_EGRESS_CONTENT",
      exclusionReasonCodes: deduplicatedRestrictions,
      assetLedger,
      frameFailureLedger: deduplicatedFailures,
      anomalyLedger: preflight.anomalyLedger,
    }, "itemEgressDecisionHash");
}

export function buildRightsEgressDecisionTableV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "rights decision input");
  const allowedInputFields = new Set(["sourceIds", "registry", "ownerApprovalClaimsBySource"]);
  const unknownInputFields = Object.keys(normalizedInput).filter((field) => !allowedInputFields.has(field));
  if (unknownInputFields.length > 0) {
    throw new TypeError(`rights decision input contains unknown or caller-asserted trust fields: ${unknownInputFields.join(", ")}`);
  }
  const { sourceIds, registry, ownerApprovalClaimsBySource } = normalizedInput;
  if (!Array.isArray(sourceIds)) throw new TypeError("rights decision sourceIds must be an array");
  assertObject(registry, "rights registry");
  assertObject(ownerApprovalClaimsBySource, "ownerApprovalClaimsBySource");
  const requestedSources = new Set(RIGHTS_REGISTRY_REQUIRED_SOURCES_V4);
  const suppliedSources = new Set();
  for (const [index, sourceId] of sourceIds.entries()) {
    assertNonEmptyString(sourceId, `sourceIds[${index}]`);
    if (suppliedSources.has(sourceId)) throw new TypeError(`rights decision sourceIds repeats ${sourceId}`);
    suppliedSources.add(sourceId);
    requestedSources.add(sourceId);
  }
  const unknownRegistrySources = Object.keys(registry).filter((sourceId) => !requestedSources.has(sourceId));
  if (unknownRegistrySources.length > 0) {
    throw new TypeError(`rights registry contains sources outside the frame coverage set: ${unknownRegistrySources.join(", ")}`);
  }
  const sourceCoverage = [...requestedSources].sort(codePointCompare);
  const unknownClaimSources = Object.keys(ownerApprovalClaimsBySource).filter((sourceId) => !requestedSources.has(sourceId));
  if (unknownClaimSources.length > 0) {
    throw new TypeError(`owner approval claims contain sources outside the frame coverage set: ${unknownClaimSources.join(", ")}`);
  }
  const decisions = sourceCoverage.map((sourceId) => {
    const entry = registry[sourceId];
    if (entry?.disposition === "DENIED") {
      return {
        sourceId,
        disposition: "DENIED",
        egressEligible: false,
        failureCode: null,
      };
    }
    const claimedApprovalHash = ownerApprovalClaimsBySource[sourceId];
    const ownerApproved = entry?.disposition === "OWNER_APPROVED"
      && entry.providerEgressAllowed === true
      && SHA256_PATTERN.test(entry.ownerApprovalHash ?? "")
      && SHA256_PATTERN.test(claimedApprovalHash ?? "")
      && entry.ownerApprovalHash === claimedApprovalHash;
    if (ownerApproved) {
      return {
        sourceId,
        disposition: "OWNER_APPROVED",
        egressEligible: true,
        failureCode: null,
        ownerApprovalHash: entry.ownerApprovalHash,
      };
    }
    return {
      sourceId,
      disposition: "OWNER_REVIEW_REQUIRED",
      egressEligible: false,
      failureCode: "RIGHTS_UNRESOLVED",
    };
  });
  const frameFailureLedger = decisions
    .filter(({ failureCode }) => failureCode !== null)
    .map(({ sourceId, failureCode }) => ({ code: failureCode, sourceId }));
  const artifact = {
    schemaVersion: "RightsEgressDecisionTableV1",
    sourceCoverage,
    sourceCoverageRootHash: sha256Hex(canonicalJson(sourceCoverage)),
    authorizationBoundary: "REQUIRES_OUT_OF_BAND_OWNER_APPROVAL_ROOT_AT_FINAL_EGRESS_VALIDATION",
    builderProvesOwnerAuthorization: false,
    ownerApprovalClaimRootHash: sha256Hex(canonicalJson(sourceCoverage.map((sourceId) => [
      sourceId,
      ownerApprovalClaimsBySource[sourceId] ?? null,
    ]))),
    decisions,
    allSourcesEgressEligible: decisions.every(({ egressEligible }) => egressEligible),
    frameFailureLedger,
  };
  artifact.rightsDecisionTableHash = calculateArtifactHash(artifact, "rightsDecisionTableHash");
  return artifact;
}

export function validateRightsRegistryV4(registry, {
  sourceIds = RIGHTS_REGISTRY_REQUIRED_SOURCES_V4,
  ownerApprovalClaimsBySource = {},
} = {}) {
  try {
    const table = buildRightsEgressDecisionTableV4({ sourceIds, registry, ownerApprovalClaimsBySource });
    return table.decisions
      .filter(({ failureCode }) => failureCode === "RIGHTS_UNRESOLVED")
      .map(({ sourceId }) => `rights registry source ${sourceId} requires owner-bound approval or an explicit DENIED disposition`);
  } catch (error) {
    return [error.message];
  }
}

export function buildSourceModuleManifestV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "transitive source module manifest input");
  const allowedInputFields = new Set([
    "repositoryIdentity",
    "sourceCommit",
    "routeExecutionTrustRootHash",
    "dependencyClosureExtractorImplementationHash",
    "dependencyClosureRunnerReceipt",
    "dependencyClosureTrustDescriptor",
    "trustedDependencyClosureRootHash",
    "files",
  ]);
  const unknownInputFields = Object.keys(normalizedInput).filter((field) => !allowedInputFields.has(field));
  if (unknownInputFields.length > 0) {
    throw new TypeError(`transitive source module manifest contains unknown fields: ${unknownInputFields.join(", ")}`);
  }
  const {
    repositoryIdentity,
    sourceCommit,
    routeExecutionTrustRootHash,
    dependencyClosureExtractorImplementationHash,
    dependencyClosureRunnerReceipt,
    dependencyClosureTrustDescriptor,
    trustedDependencyClosureRootHash,
    files,
  } = normalizedInput;
  assertNonEmptyString(repositoryIdentity, "repositoryIdentity");
  assertSourceCommit(sourceCommit);
  assertSha256(routeExecutionTrustRootHash, "routeExecutionTrustRootHash");
  assertSha256(trustedDependencyClosureRootHash, "out-of-band trusted dependency-closure root");
  assertSha256(dependencyClosureExtractorImplementationHash, "dependencyClosureExtractorImplementationHash");
  assertObject(dependencyClosureRunnerReceipt, "dependencyClosureRunnerReceipt");
  if (!artifactHashMatches(dependencyClosureRunnerReceipt, "runnerReceiptHash")) {
    throw new TypeError("dependency-closure runner receipt hash mismatch");
  }
  const expectedRunnerReceipt = calculateArtifact({
    schemaVersion: "DependencyClosureRunnerReceiptV1",
    repositoryIdentity,
    sourceCommit,
    extractorImplementationHash: dependencyClosureExtractorImplementationHash,
    runnerCommit: dependencyClosureRunnerReceipt.runnerCommit,
    runnerHash: dependencyClosureRunnerReceipt.runnerHash,
    executedAt: dependencyClosureRunnerReceipt.executedAt,
  }, "runnerReceiptHash");
  assertSourceCommit(dependencyClosureRunnerReceipt.runnerCommit);
  assertSha256(dependencyClosureRunnerReceipt.runnerHash, "dependencyClosureRunnerReceipt.runnerHash");
  assertTimestamp(dependencyClosureRunnerReceipt.executedAt, "dependencyClosureRunnerReceipt.executedAt");
  if (!canonicalEqual(dependencyClosureRunnerReceipt, expectedRunnerReceipt)) {
    throw new TypeError("dependency-closure runner receipt does not bind repository, source commit, and extractor implementation");
  }
  if (!Array.isArray(files) || files.length === 0) throw new TypeError("transitive source module manifest requires files");
  const paths = new Set();
  const normalized = files.map((file, index) => {
    assertObject(file, `files[${index}]`);
    const unknownFields = Object.keys(file).filter((field) => !["repoRelativePath", "gitBlobOid"].includes(field));
    if (unknownFields.length > 0) {
      throw new TypeError(`files[${index}] contains unknown manifest fields ${unknownFields.join(", ")}; use only repoRelativePath and gitBlobOid`);
    }
    const segments = typeof file.repoRelativePath === "string" ? file.repoRelativePath.split("/") : [];
    if (typeof file.repoRelativePath !== "string" || file.repoRelativePath.length === 0
      || file.repoRelativePath.startsWith("/") || file.repoRelativePath.includes("\\")
      || segments.some((segment) => segment === "" || segment === "." || segment === "..")
      || hasLoneSurrogate(file.repoRelativePath)) {
      throw new TypeError(`files[${index}].repoRelativePath must be a normalized relative repository path`);
    }
    if (!GIT_BLOB_OID_PATTERN.test(file.gitBlobOid ?? "")) {
      throw new TypeError(`files[${index}].gitBlobOid must be exactly 40 or 64 hexadecimal characters`);
    }
    if (paths.has(file.repoRelativePath)) throw new TypeError(`duplicate source module path ${file.repoRelativePath}`);
    paths.add(file.repoRelativePath);
    return { repoRelativePath: file.repoRelativePath, gitBlobOid: file.gitBlobOid.toLowerCase() };
  }).sort((left, right) => codePointCompare(left.repoRelativePath, right.repoRelativePath));
  const sourceModuleHash = sha256Hex(canonicalJson(normalized));
  const expectedDependencyClosureTrustDescriptor = {
    schemaVersion: "DependencyClosureTrustDescriptorV1",
    repositoryIdentity,
    sourceCommit,
    extractorImplementationHash: dependencyClosureExtractorImplementationHash,
    runnerCommit: dependencyClosureRunnerReceipt.runnerCommit,
    runnerHash: dependencyClosureRunnerReceipt.runnerHash,
    fileCount: normalized.length,
    sourceModuleHash,
  };
  const dependencyClosureTrustRootHash = sha256Hex(canonicalJson(expectedDependencyClosureTrustDescriptor));
  if (!canonicalEqual(dependencyClosureTrustDescriptor, expectedDependencyClosureTrustDescriptor)
    || dependencyClosureTrustRootHash !== trustedDependencyClosureRootHash) {
    throw new TypeError("transitive source manifest does not match the out-of-band trusted dependency-closure descriptor/root");
  }
  const artifact = {
    schemaVersion: "TransitiveSourceModuleManifestV2",
    repositoryIdentity,
    sourceCommit,
    routeExecutionTrustRootHash,
    dependencyClosureExtractorImplementationHash,
    dependencyClosureRunnerReceiptHash: dependencyClosureRunnerReceipt.runnerReceiptHash,
    dependencyClosureCompletedAt: dependencyClosureRunnerReceipt.executedAt,
    dependencyClosureTrustDescriptor: expectedDependencyClosureTrustDescriptor,
    dependencyClosureTrustRootHash,
    dependencyClosureAuthorizationBoundary: "REQUIRES_OUT_OF_BAND_TRUSTED_DEPENDENCY_CLOSURE_ROOT_AT_FRAME_FREEZE",
    files: normalized,
    fileCount: normalized.length,
    rootFormula: "SHA256(JCS(SORTED_BY_repoRelativePath([{repoRelativePath,gitBlobOid},...])))",
    sourceModuleHash,
  };
  artifact.sourceModuleManifestHash = calculateArtifactHash(artifact, "sourceModuleManifestHash");
  return artifact;
}

export function buildRuntimeConfigEvidenceV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "runtime configuration");
  const allowedFields = new Set([
    "actor",
    "curriculumProfile",
    "gradeProjectionUnion",
    "maxAnswerChoices",
    "accommodationOptionTruncation",
    "perStudentReducedChoicesApplied",
    "localePolicy",
    "activePackStateHash",
    "featureFlagStateHash",
  ]);
  const unknownFields = Object.keys(normalizedInput).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    throw new TypeError(`runtime configuration contains unknown or unfrozen fields: ${unknownFields.join(", ")}`);
  }
  const {
    actor,
    curriculumProfile,
    gradeProjectionUnion,
    maxAnswerChoices,
    accommodationOptionTruncation,
    perStudentReducedChoicesApplied,
    localePolicy,
    activePackStateHash,
    featureFlagStateHash,
  } = normalizedInput;
  if (actor !== "AUTHENTICATED_STUDENT" || curriculumProfile !== "US_CA_MATH") {
    throw new TypeError("runtime configuration must use authenticated US_CA_MATH student semantics");
  }
  if (!Array.isArray(gradeProjectionUnion)
    || canonicalJson(gradeProjectionUnion) !== canonicalJson(RUNTIME_SOURCE_ENUMERATION_GRADES)) {
    throw new TypeError("runtime configuration must bind the ordered union of all 13 K-12 grade projections");
  }
  if (maxAnswerChoices !== 0 || accommodationOptionTruncation !== false || perStudentReducedChoicesApplied !== false) {
    throw new TypeError("runtime configuration must be standard unaccommodated maxAnswerChoices=0, accommodationOptionTruncation=false, with no reduced choices");
  }
  if (localePolicy !== V4_LOCALE_POLICY) throw new TypeError(`runtime configuration localePolicy must be ${V4_LOCALE_POLICY}`);
  assertSha256(activePackStateHash, "activePackStateHash");
  assertSha256(featureFlagStateHash, "featureFlagStateHash");
  const evidence = {
    schemaVersion: "RuntimeConfigEvidenceV1",
    actor,
    curriculumProfile,
    gradeProjectionUnion: [...gradeProjectionUnion],
    maxAnswerChoices,
    accommodationOptionTruncation,
    perStudentReducedChoicesApplied,
    localePolicy,
    standardUnaccommodatedProjection: true,
    activePackStateHash,
    featureFlagStateHash,
  };
  evidence.runtimeConfigHash = calculateArtifactHash(evidence, "runtimeConfigHash");
  return evidence;
}

function scanRouteIdsBeforeProjectionV4(items, field, identityField, collisions, scanErrors) {
  if (!Array.isArray(items)) {
    scanErrors.push(`${field} must be an array`);
    return [];
  }
  const ids = [];
  const seen = new Set();
  for (const [index, item] of items.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      scanErrors.push(`${field}[${index}] must be an object`);
      continue;
    }
    if (typeof item[identityField] !== "string" || item[identityField].length === 0) {
      scanErrors.push(`${field}[${index}].${identityField} must be a non-empty string`);
      continue;
    }
    if (seen.has(item[identityField])) {
      collisions.push(`${field} repeats ${identityField} ${item[identityField]}`);
    }
    seen.add(item[identityField]);
    ids.push(item[identityField]);
  }
  return ids;
}

function normalizeResearchItemsAfterCollisionV4(items, field) {
  return items.map((item, index) => {
    assertSha256(item.itemHash, `${field}[${index}].itemHash`);
    const normalized = canonicalizeStrictItemJsonV4(item);
    if (normalized.itemHash !== calculateItemContentHashV4(normalized)) {
      throw new TypeError(`RAW_FULL_ID_MISMATCH: ${field}[${index}] itemHash does not match its complete protected content identity`);
    }
    return normalized;
  });
}

export const PUBLIC_ROUTE_REQUIRED_FIELDS_V4 = Object.freeze([
  "id",
  "curriculumTrack",
  "curriculumProfile",
  "region",
  "publisher",
  "canonicalTopicId",
  "grade",
  "topicId",
  "topic",
  "difficulty",
  "type",
  "prompt",
]);
export const PUBLIC_ROUTE_OPTIONAL_FIELDS_V4 = Object.freeze([
  "options",
  "diagram",
  "questionAssets",
]);

const FULL_RUNTIME_REQUIRED_FIELDS_V4 = Object.freeze([
  ...PUBLIC_ROUTE_REQUIRED_FIELDS_V4,
  "answer",
  "explanation",
]);
const FULL_RUNTIME_OPTIONAL_FIELDS_V4 = Object.freeze([
  ...PUBLIC_ROUTE_OPTIONAL_FIELDS_V4,
  "acceptedAnswers",
]);

function assertClosedRuntimeQuestionV4(item, field) {
  assertObject(item, field);
  const allowed = new Set([...FULL_RUNTIME_REQUIRED_FIELDS_V4, ...FULL_RUNTIME_OPTIONAL_FIELDS_V4]);
  const unknown = Object.keys(item).filter((key) => !allowed.has(key));
  const missing = FULL_RUNTIME_REQUIRED_FIELDS_V4.filter((key) => !Object.hasOwn(item, key));
  if (unknown.length > 0 || missing.length > 0) {
    throw new TypeError(`RAW_FULL_ID_MISMATCH: ${field} must have the exact runtime Question field set; missing=${missing.join(",")}; unknown=${unknown.join(",")}`);
  }
  assertPipeSafe(item.id, `${field}.id`);
  if (!RUNTIME_SOURCE_ENUMERATION_GRADES.includes(item.grade)) throw new TypeError(`RAW_FULL_ID_MISMATCH: ${field}.grade is outside the real 13-grade runtime set`);
  assertLocalizedTextBundleV4(item.topic, `${field}.topic`);
  assertLocalizedTextBundleV4(item.prompt, `${field}.prompt`);
  assertLocalizedTextBundleV4(item.explanation, `${field}.explanation`);
  if (Object.hasOwn(item, "options")) {
    if (!Array.isArray(item.options)) throw new TypeError(`RAW_FULL_ID_MISMATCH: ${field}.options must be an array when present`);
    item.options.forEach((option, index) => assertLocalizedTextBundleV4(option, `${field}.options[${index}]`));
  }
  if (typeof item.answer !== "string"
    || (Object.hasOwn(item, "acceptedAnswers")
      && (!Array.isArray(item.acceptedAnswers)
        || item.acceptedAnswers.some((answer) => typeof answer !== "string")))) {
    throw new TypeError(`RAW_FULL_ID_MISMATCH: ${field} private answer fields do not match the runtime Question shape`);
  }
}

function deriveRuntimePublicQuestionV4(fullItem) {
  return canonicalizeStrictItemJsonV4({
    id: fullItem.id,
    curriculumTrack: fullItem.curriculumTrack,
    curriculumProfile: fullItem.curriculumProfile,
    region: fullItem.region,
    publisher: fullItem.publisher,
    canonicalTopicId: fullItem.canonicalTopicId ?? fullItem.topicId,
    grade: fullItem.grade,
    topicId: fullItem.topicId,
    topic: fullItem.topic ?? { en: fullItem.topicId, zh: fullItem.topicId },
    difficulty: fullItem.difficulty,
    type: fullItem.type,
    prompt: fullItem.prompt,
    options: fullItem.options,
    diagram: fullItem.diagram,
    questionAssets: fullItem.questionAssets,
  });
}

function assertExactRouteRunnerReceiptV4(receipt, {
  schemaVersion,
  implementationHash,
  sourceCommit,
  entries,
  extraRoots,
  label,
}) {
  assertObject(receipt, label);
  if (!artifactHashMatches(receipt, "runnerReceiptHash")) throw new TypeError(`${label} self-hash mismatch`);
  assertSha256(implementationHash, `${label}.implementationHash`);
  assertSourceCommit(sourceCommit);
  assertSourceCommit(receipt.runnerCommit);
  assertSha256(receipt.runnerHash, `${label}.runnerHash`);
  assertTimestamp(receipt.executedAt, `${label}.executedAt`);
  const expected = calculateArtifact({
    schemaVersion,
    implementationHash,
    sourceCommit,
    runnerCommit: receipt.runnerCommit,
    runnerHash: receipt.runnerHash,
    executedAt: receipt.executedAt,
    entries,
    entryRootHash: sha256Hex(canonicalJson(entries)),
    ...extraRoots,
  }, "runnerReceiptHash");
  if (!canonicalEqual(receipt, expected)) throw new TypeError(`${label} does not bind the recomputed route bytes and content hashes`);
  return expected;
}

function assertRouteExecutionTrustDescriptorV4(descriptor, {
  converterRunnerReceipt,
  normalizationRunnerReceipt,
  publicProjectionRunnerReceipt,
  rawRootHash,
  convertedFullRootHash,
  normalizedFullRootHash,
  gradePublicUnionRootHash,
  gradeProjectionInvocationRootHash,
}) {
  assertObject(descriptor, "routeExecutionTrustDescriptor");
  const requiredDescriptorFields = [
    "schemaVersion",
    "repositoryIdentity",
    "sourceCommit",
    "converter",
    "normalization",
    "publicProjection",
  ];
  if (!canonicalEqual(Object.keys(descriptor).sort(codePointCompare), [...requiredDescriptorFields].sort(codePointCompare))) {
    throw new TypeError("trusted route execution descriptor must use the exact closed field set");
  }
  if (descriptor.schemaVersion !== "RouteExecutionTrustDescriptorV2") {
    throw new TypeError("trusted route execution descriptor schemaVersion mismatch");
  }
  assertNonEmptyString(descriptor.repositoryIdentity, "routeExecutionTrustDescriptor.repositoryIdentity");
  assertSourceCommit(descriptor.sourceCommit);
  const receiptBindings = [
    ["converter", converterRunnerReceipt, {
      runnerReceiptHash: converterRunnerReceipt?.runnerReceiptHash,
      rawRootHash,
      convertedFullRootHash,
    }],
    ["normalization", normalizationRunnerReceipt, {
      runnerReceiptHash: normalizationRunnerReceipt?.runnerReceiptHash,
      convertedFullRootHash,
      normalizedFullRootHash,
    }],
    ["publicProjection", publicProjectionRunnerReceipt, {
      runnerReceiptHash: publicProjectionRunnerReceipt?.runnerReceiptHash,
      convertedFullRootHash,
      gradePublicUnionRootHash,
      gradeProjectionInvocationRootHash,
    }],
  ];
  for (const [role, receipt, executionRoots] of receiptBindings) {
    assertObject(receipt, `${role} runner receipt`);
    const binding = descriptor[role];
    assertObject(binding, `routeExecutionTrustDescriptor.${role}`);
    const expectedBinding = {
      implementationHash: receipt.implementationHash,
      runnerCommit: receipt.runnerCommit,
      runnerHash: receipt.runnerHash,
      ...executionRoots,
    };
    for (const [field, value] of Object.entries(expectedBinding)) {
      if (field === "runnerCommit") assertSourceCommit(value);
      else assertSha256(value, `routeExecutionTrustDescriptor.${role}.${field}`);
    }
    if (receipt.sourceCommit !== descriptor.sourceCommit || !canonicalEqual(binding, expectedBinding)) {
      throw new TypeError(`${role} exact runner receipt and route output roots do not match the trusted route execution descriptor`);
    }
  }
  return sha256Hex(canonicalJson(descriptor));
}

export function buildThreeRouteSourceParityEvidenceV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "three-route source parity input");
  const allowedInputFields = new Set([
    "rawItems",
    "convertedFullItems",
    "normalizedFullItems",
    "gradePublicItems",
    "converterRunnerReceipt",
    "normalizationRunnerReceipt",
    "publicProjectionRunnerReceipt",
    "routeExecutionTrustDescriptor",
    "runtimeLoaderEvidence",
    "mapFirstWinsUsed",
  ]);
  const {
    rawItems,
    convertedFullItems,
    normalizedFullItems,
    gradePublicItems,
    converterRunnerReceipt,
    normalizationRunnerReceipt,
    publicProjectionRunnerReceipt,
    routeExecutionTrustDescriptor,
    runtimeLoaderEvidence,
    mapFirstWinsUsed,
  } = normalizedInput;

  // Descriptor-safe JSON normalization happens first. Every route that can be
  // safely inspected is then collision-scanned before unknown-field, grade
  // coverage, loader, hash, or public-shape validation and before any Map.
  const collisions = [];
  const scanErrors = [];
  const rawIds = scanRouteIdsBeforeProjectionV4(rawItems, "raw generated items", "id", collisions, scanErrors);
  const fullIds = scanRouteIdsBeforeProjectionV4(convertedFullItems, "converted runtime Question items", "id", collisions, scanErrors);
  const normalizedIds = scanRouteIdsBeforeProjectionV4(normalizedFullItems, "normalized research full items", "itemId", collisions, scanErrors);
  const gradeIds = [];
  const globalGradeIds = new Set();
  const suppliedGradeKeys = gradePublicItems && typeof gradePublicItems === "object" && !Array.isArray(gradePublicItems)
    ? Object.keys(gradePublicItems).sort(codePointCompare)
    : [];
  if (suppliedGradeKeys.length === 0 && (!gradePublicItems || typeof gradePublicItems !== "object" || Array.isArray(gradePublicItems))) {
    scanErrors.push("gradePublicItems must be an object");
  }
  for (const grade of suppliedGradeKeys) {
    const ids = scanRouteIdsBeforeProjectionV4(gradePublicItems[grade], `grade-public ${grade}`, "id", collisions, scanErrors);
    for (const itemId of ids) {
      if (globalGradeIds.has(itemId)) {
        collisions.push(`grade-public union repeats itemId ${itemId} across grades`);
      }
      globalGradeIds.add(itemId);
      gradeIds.push(itemId);
    }
  }
  if (collisions.length > 0) {
    throw new TypeError(`ID_COLLISION: ${collisions.join("; ")} before projection, Map, or deduplication`);
  }
  const unknownInputFields = Object.keys(normalizedInput).filter((field) => !allowedInputFields.has(field));
  if (unknownInputFields.length > 0) {
    throw new TypeError(`RUNTIME_ENUMERATION_FAILED: unknown parity/preview fields ${unknownInputFields.join(", ")}`);
  }
  if (scanErrors.length > 0) throw new TypeError(`RUNTIME_ENUMERATION_FAILED: ${scanErrors.join("; ")}`);
  const requiredGrades = [...RUNTIME_SOURCE_ENUMERATION_GRADES].sort(codePointCompare);
  if (!canonicalEqual(suppliedGradeKeys, requiredGrades)) {
    throw new TypeError("RUNTIME_ENUMERATION_FAILED: grade-public route must contain exactly 13 K-12 projections");
  }
  assertObject(runtimeLoaderEvidence, "runtimeLoaderEvidence");
  const requiredLoaderEvidence = {
    rawLoader: "DIRECT_IMPORT",
    convertedFullLoader: "DIRECT_IMPORT",
    gradePublicLoader: "DIRECT_IMPORT",
    optionalQuestionModuleUsed: false,
    apiPreviewUsed: false,
    gradeProjectionCount: 13,
    rawConversionUsed: true,
    converterImplementationHash: converterRunnerReceipt?.implementationHash,
    converterRunnerReceiptHash: converterRunnerReceipt?.runnerReceiptHash,
    normalizationImplementationHash: normalizationRunnerReceipt?.implementationHash,
    normalizationRunnerReceiptHash: normalizationRunnerReceipt?.runnerReceiptHash,
    publicProjectionImplementationHash: publicProjectionRunnerReceipt?.implementationHash,
    publicProjectionRunnerReceiptHash: publicProjectionRunnerReceipt?.runnerReceiptHash,
  };
  if (!canonicalEqual(runtimeLoaderEvidence, requiredLoaderEvidence)) {
    throw new TypeError("RUNTIME_ENUMERATION_FAILED: all three routes require direct import, a frozen raw converter and normalization/public runner receipts; optionalQuestionModule and API preview are forbidden; exactly 13 grades are required");
  }
  if (mapFirstWinsUsed !== false) throw new TypeError("ID_COLLISION: collision-first validation forbids Map first-wins");
  const sortedRawIds = [...rawIds].sort(codePointCompare);
  const sortedFullIds = [...fullIds].sort(codePointCompare);
  const sortedNormalizedIds = [...normalizedIds].sort(codePointCompare);
  const sortedGradeIds = [...gradeIds].sort(codePointCompare);
  if (!canonicalEqual(sortedRawIds, sortedFullIds) || !canonicalEqual(sortedFullIds, sortedNormalizedIds)) {
    throw new TypeError("RAW_FULL_ID_MISMATCH: raw, converted runtime Question, and normalized research full exact ID multisets differ");
  }
  if (!canonicalEqual(sortedFullIds, sortedGradeIds)) {
    throw new TypeError("FULL_PUBLIC_ID_MISMATCH: converted-full and 13-grade public exact ID multisets differ");
  }
  if (sortedRawIds.length === 0) throw new TypeError("SOURCE_IMPORT_FAILED: direct imports produced an empty runtime population");

  const raw = rawItems.map((item) => canonicalizeStrictItemJsonV4(item));
  const convertedFull = convertedFullItems.map((item, index) => {
    const normalized = canonicalizeStrictItemJsonV4(item);
    assertClosedRuntimeQuestionV4(normalized, `convertedFullItems[${index}]`);
    return normalized;
  });
  const normalizedFull = normalizeResearchItemsAfterCollisionV4(normalizedFullItems, "normalized full items");
  const gradeEntries = [];
  for (const grade of RUNTIME_SOURCE_ENUMERATION_GRADES) {
    for (const publicItem of gradePublicItems[grade]) {
      gradeEntries.push({ grade, publicItem: canonicalizeStrictItemJsonV4(publicItem) });
    }
  }
  const rawRootHash = sha256Hex(strictItemCanonicalJson(raw));
  const convertedFullRootHash = sha256Hex(strictItemCanonicalJson(convertedFull));
  const normalizedFullRootHash = sha256Hex(strictItemCanonicalJson(normalizedFull));
  const gradePublicUnionRootHash = sha256Hex(strictItemCanonicalJson(gradeEntries));
  const gradeProjectionInvocations = RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => ({
    grade,
    itemCount: gradePublicItems[grade].length,
    publicContentRootHash: sha256Hex(strictItemCanonicalJson(gradePublicItems[grade])),
  }));
  const gradeProjectionInvocationRootHash = sha256Hex(strictItemCanonicalJson(gradeProjectionInvocations));
  const rawById = new Map(raw.map((item) => [item.id, item]));
  const fullById = new Map(convertedFull.map((item) => [item.id, item]));
  const normalizedById = new Map(normalizedFull.map((item) => [item.itemId, item]));
  const converterEntries = sortedFullIds.map((itemId) => ({
    itemId,
    rawContentHash: sha256Hex(strictItemCanonicalJson(rawById.get(itemId))),
    convertedFullContentHash: sha256Hex(strictItemCanonicalJson(fullById.get(itemId))),
  }));
  assertExactRouteRunnerReceiptV4(converterRunnerReceipt, {
    schemaVersion: "RawToRuntimeQuestionConverterRunnerReceiptV1",
    implementationHash: runtimeLoaderEvidence.converterImplementationHash,
    sourceCommit: converterRunnerReceipt?.sourceCommit,
    entries: converterEntries,
    extraRoots: { rawRootHash, convertedFullRootHash },
    label: "raw-to-runtime converter receipt",
  });
  const normalizationEntries = sortedFullIds.map((itemId) => ({
    itemId,
    convertedFullContentHash: sha256Hex(strictItemCanonicalJson(fullById.get(itemId))),
    normalizedItemHash: normalizedById.get(itemId).itemHash,
  }));
  assertExactRouteRunnerReceiptV4(normalizationRunnerReceipt, {
    schemaVersion: "RuntimeQuestionToResearchLeafNormalizerRunnerReceiptV1",
    implementationHash: runtimeLoaderEvidence.normalizationImplementationHash,
    sourceCommit: converterRunnerReceipt.sourceCommit,
    entries: normalizationEntries,
    extraRoots: { convertedFullRootHash, normalizedFullRootHash },
    label: "runtime-to-research normalization receipt",
  });

  const publicById = new Map();
  const requiredPublicFields = [...PUBLIC_ROUTE_REQUIRED_FIELDS_V4].sort(codePointCompare);
  const allowedPublicFields = new Set([...PUBLIC_ROUTE_REQUIRED_FIELDS_V4, ...PUBLIC_ROUTE_OPTIONAL_FIELDS_V4]);
  for (const { grade, publicItem } of gradeEntries) {
    const actualPublicFields = Object.keys(publicItem).sort(codePointCompare);
    const missingPublicFields = requiredPublicFields.filter((field) => !Object.hasOwn(publicItem, field));
    const unknownPublicFields = actualPublicFields.filter((field) => !allowedPublicFields.has(field));
    if (missingPublicFields.length > 0 || unknownPublicFields.length > 0) {
      throw new TypeError(`PUBLIC_FIELD_MISMATCH: grade-public ${grade} must use the real closed PublicQuestion field set`);
    }
    const fullItem = fullById.get(publicItem.id);
    if (publicItem.grade !== grade) {
      throw new TypeError(`PUBLIC_FIELD_MISMATCH: grade-public ${grade} contains an item whose full public grade is ${String(publicItem.grade)}`);
    }
    if (!canonicalEqual(publicItem, deriveRuntimePublicQuestionV4(fullItem))) {
      throw new TypeError(`PUBLIC_FIELD_MISMATCH: grade-public ${grade} item ${publicItem.id} differs from the exact runtime toPublicQuestion projection`);
    }
    publicById.set(publicItem.id, { grade, publicItem });
  }
  const publicProjectionEntries = sortedFullIds.map((itemId) => ({
    itemId,
    grade: publicById.get(itemId).grade,
    convertedFullContentHash: sha256Hex(strictItemCanonicalJson(fullById.get(itemId))),
    publicContentHash: sha256Hex(strictItemCanonicalJson(publicById.get(itemId).publicItem)),
  }));
  assertExactRouteRunnerReceiptV4(publicProjectionRunnerReceipt, {
    schemaVersion: "RuntimeQuestionToPublicQuestionRunnerReceiptV1",
    implementationHash: runtimeLoaderEvidence.publicProjectionImplementationHash,
    sourceCommit: converterRunnerReceipt.sourceCommit,
    entries: publicProjectionEntries,
    extraRoots: { convertedFullRootHash, gradePublicUnionRootHash, gradeProjectionInvocationRootHash },
    label: "runtime-to-public projection receipt",
  });
  const routeExecutionTrustRootHash = assertRouteExecutionTrustDescriptorV4(routeExecutionTrustDescriptor, {
    converterRunnerReceipt,
    normalizationRunnerReceipt,
    publicProjectionRunnerReceipt,
    rawRootHash,
    convertedFullRootHash,
    normalizedFullRootHash,
    gradePublicUnionRootHash,
    gradeProjectionInvocationRootHash,
  });

  const rawIdentities = raw.map((item) => ({ itemId: item.id, rawContentHash: sha256Hex(strictItemCanonicalJson(item)) }))
    .sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const runtimeIdentities = convertedFull.map((item) => ({ itemId: item.id, convertedFullContentHash: sha256Hex(strictItemCanonicalJson(item)) }))
    .sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const fullIdentities = normalizedFull.map(({ itemId, itemHash }) => ({ itemId, itemHash }))
    .sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const gradeIdentities = gradeEntries.map(({ grade, publicItem }) => ({
    grade,
    itemId: publicItem.id,
    publicContentHash: sha256Hex(strictItemCanonicalJson(publicItem)),
  }))
    .sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const evidence = {
    schemaVersion: "ThreeRouteSourceParityEvidenceV5",
    repositoryIdentity: routeExecutionTrustDescriptor.repositoryIdentity,
    sourceCommit: routeExecutionTrustDescriptor.sourceCommit,
    routeExecutionTrustDescriptor,
    routeExecutionTrustRootHash,
    runtimeLoaderEvidence: canonicalizeStrictItemJsonV4(runtimeLoaderEvidence),
    mapFirstWinsUsed,
    collisionCheckPrecedesAnyMapOrDeduplication: true,
    rawItems: rawIdentities,
    convertedRuntimeItems: runtimeIdentities,
    convertedFullItems: fullIdentities,
    gradePublicItems: Object.fromEntries(RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => [
      grade,
      gradeIdentities.filter((entry) => entry.grade === grade).map(({ itemId, publicContentHash }) => ({ itemId, publicContentHash })),
    ])),
    rawRootHash,
    convertedFullRootHash,
    normalizedFullRootHash,
    gradePublicUnionRootHash,
    gradeProjectionInvocationRootHash,
    converterRunnerReceiptHash: converterRunnerReceipt.runnerReceiptHash,
    normalizationRunnerReceiptHash: normalizationRunnerReceipt.runnerReceiptHash,
    publicProjectionRunnerReceiptHash: publicProjectionRunnerReceipt.runnerReceiptHash,
    routeExecutionCompletedAt: [
      converterRunnerReceipt.executedAt,
      normalizationRunnerReceipt.executedAt,
      publicProjectionRunnerReceipt.executedAt,
    ].sort((left, right) => timestampMillis(left, "route runner executedAt") - timestampMillis(right, "route runner executedAt")).at(-1),
    routeParityProved: true,
  };
  evidence.parityEvidenceHash = calculateArtifactHash(evidence, "parityEvidenceHash");
  return evidence;
}

export function buildFrameFreezeEvidenceV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "complete frame freeze evidence input");
  const allowedFields = new Set([
    "frameRows",
    "runtimeConfigInput",
    "runtimeConfigEvidence",
    "sourceParityInput",
    "sourceParityEvidence",
    "sourceModuleManifestInput",
    "sourceModuleManifest",
    "trustedRouteExecutionRootHash",
    "trustedDependencyClosureRootHash",
    "rightsDecisionInput",
    "rightsDecisionTable",
    "trustedOwnerApprovalRootHash",
    "itemScreenEvidence",
    "itemEgressDecisions",
    "scannerExecutionReceiptInventory",
    "trustedScannerExecutionReceiptInventoryHash",
    "trustedScreeningPolicyHash",
    "trustedScannerImplementationHash",
    "trustedScannerRunnerHash",
  ]);
  const unknownFields = Object.keys(normalizedInput).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    throw new TypeError(`complete frame freeze evidence input contains unknown fields: ${unknownFields.join(", ")}`);
  }
  const {
    frameRows,
    runtimeConfigInput,
    runtimeConfigEvidence,
    sourceParityInput,
    sourceParityEvidence,
    sourceModuleManifestInput,
    sourceModuleManifest,
    trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash,
    itemScreenEvidence,
    itemEgressDecisions,
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash,
    trustedScannerImplementationHash,
    trustedScannerRunnerHash,
  } = normalizedInput;
  if (!Array.isArray(frameRows) || frameRows.length === 0) {
    throw new TypeError("complete frame freeze evidence requires nonempty protected frame rows");
  }
  for (const trustedHash of [
    trustedScreeningPolicyHash,
    trustedScannerImplementationHash,
    trustedScannerRunnerHash,
  ]) assertSha256(trustedHash, "trusted frame screening root");

  const expectedRuntimeConfigEvidence = buildRuntimeConfigEvidenceV4(runtimeConfigInput);
  if (!canonicalEqual(runtimeConfigEvidence, expectedRuntimeConfigEvidence)) {
    throw new TypeError("runtimeConfigEvidence mismatch after recomputation from the complete protected runtime configuration");
  }
  const expectedSourceParityEvidence = buildThreeRouteSourceParityEvidenceV4(sourceParityInput);
  if (!canonicalEqual(sourceParityEvidence, expectedSourceParityEvidence)) {
    throw new TypeError("sourceParityEvidence mismatch after three-route collision-first recomputation");
  }
  const expectedSourceModuleManifest = buildSourceModuleManifestV4(sourceModuleManifestInput);
  if (!canonicalEqual(sourceModuleManifest, expectedSourceModuleManifest)) {
    throw new TypeError("sourceModuleManifest mismatch after transitive dependency-closure recomputation");
  }
  assertSha256(trustedRouteExecutionRootHash, "out-of-band trusted route execution root");
  if (sourceParityEvidence.sourceCommit !== sourceModuleManifest.sourceCommit
    || sourceParityEvidence.repositoryIdentity !== sourceModuleManifest.repositoryIdentity
    || sourceParityEvidence.routeExecutionTrustRootHash !== trustedRouteExecutionRootHash
    || sourceModuleManifest.routeExecutionTrustRootHash !== trustedRouteExecutionRootHash) {
    throw new TypeError("SOURCE_IMPORT_FAILED: route source commit, repository identity, and trusted execution root must match the frozen transitive source manifest");
  }
  assertSha256(trustedDependencyClosureRootHash, "out-of-band trusted dependency-closure root");
  if (sourceModuleManifest.dependencyClosureTrustRootHash !== trustedDependencyClosureRootHash) {
    throw new TypeError("SOURCE_IMPORT_FAILED: transitive source manifest is not bound to the out-of-band trusted dependency-closure root");
  }
  const expectedRightsDecisionTable = buildRightsEgressDecisionTableV4(rightsDecisionInput);
  if (!canonicalEqual(rightsDecisionTable, expectedRightsDecisionTable)) {
    throw new TypeError("rightsDecisionTable mismatch after owner-bound recomputation");
  }
  assertSha256(trustedOwnerApprovalRootHash, "out-of-band trusted owner approval root");
  if (rightsDecisionTable.ownerApprovalClaimRootHash !== trustedOwnerApprovalRootHash) {
    throw new TypeError("frame freeze evidence is not bound to the out-of-band trusted owner approval root");
  }

  const rowIds = new Set();
  const rowIdentities = frameRows.map((row, index) => {
    assertObject(row, `frameRows[${index}]`);
    assertPipeSafe(row.itemId, `frameRows[${index}].itemId`);
    if (rowIds.has(row.itemId)) throw new TypeError(`ID_COLLISION: protected frame repeats itemId ${row.itemId}`);
    rowIds.add(row.itemId);
    const itemHash = calculateItemContentHashV4(row);
    if (row.itemHash !== itemHash) throw new TypeError(`SERIALIZATION_FAILED: protected frame itemHash mismatch for ${row.itemId}`);
    if (row.runtimeConfigHash !== runtimeConfigEvidence.runtimeConfigHash) {
      throw new TypeError(`runtimeConfigEvidence does not bind protected frame row ${row.itemId}`);
    }
    if (row.sourceCommit !== sourceModuleManifest.sourceCommit
      || row.sourceModuleHash !== sourceModuleManifest.sourceModuleHash) {
      throw new TypeError(`SOURCE_IMPORT_FAILED: protected frame row ${row.itemId} is not bound to the frozen transitive source manifest`);
    }
    return { itemId: row.itemId, itemHash };
  }).sort((left, right) => codePointCompare(left.itemId, right.itemId));
  if (!canonicalEqual(sourceParityEvidence.convertedFullItems, rowIdentities)) {
    throw new TypeError("RAW_FULL_ID_MISMATCH: three-route parity evidence does not enumerate the exact protected frame identities");
  }

  const exactSourceCoverage = [...new Set([
    ...RIGHTS_REGISTRY_REQUIRED_SOURCES_V4,
    ...frameRows.flatMap((row) => Array.isArray(row.sourceIds) ? row.sourceIds : []),
  ])].sort(codePointCompare);
  if (!canonicalEqual(rightsDecisionInput.sourceIds.slice().sort(codePointCompare), exactSourceCoverage)
    || !canonicalEqual(rightsDecisionTable.sourceCoverage, exactSourceCoverage)) {
    throw new TypeError("rights decision table must provide exact per-source coverage for the protected frame");
  }

  if (!Array.isArray(itemScreenEvidence) || !Array.isArray(itemEgressDecisions)) {
    throw new TypeError("complete frame freeze evidence requires item-bound PII/secret screens and egress decisions");
  }
  const verifiedScannerInventory = validateScannerExecutionReceiptInventoryV4(scannerExecutionReceiptInventory);
  assertSha256(trustedScannerExecutionReceiptInventoryHash, "out-of-band trusted scanner execution receipt inventory hash");
  if (verifiedScannerInventory.scannerExecutionReceiptInventoryHash !== trustedScannerExecutionReceiptInventoryHash) {
    throw new TypeError("complete frame freeze evidence scanner inventory does not match the out-of-band trusted receipt inventory hash");
  }
  if (verifiedScannerInventory.entries.length !== rowIdentities.length
    || rowIdentities.some(({ itemId, itemHash }) => !verifiedScannerInventory.entries.some((entry) => (
      entry.itemId === itemId && entry.itemHash === itemHash
    )))) {
    throw new TypeError("complete frame freeze evidence requires exact scanner execution receipt inventory coverage for every protected item");
  }
  const screenById = new Map();
  for (const evidence of itemScreenEvidence) {
    assertObject(evidence, "itemScreenEvidence entry");
    if (screenById.has(evidence.itemId)) throw new TypeError(`ID_COLLISION: repeated item screen evidence ${evidence.itemId}`);
    screenById.set(evidence.itemId, evidence);
  }
  const decisionById = new Map();
  for (const decision of itemEgressDecisions) {
    assertObject(decision, "itemEgressDecisions entry");
    if (decisionById.has(decision.itemId)) throw new TypeError(`ID_COLLISION: repeated item egress decision ${decision.itemId}`);
    decisionById.set(decision.itemId, decision);
  }
  if (screenById.size !== frameRows.length || decisionById.size !== frameRows.length
    || [...rowIds].some((itemId) => !screenById.has(itemId) || !decisionById.has(itemId))) {
    throw new TypeError("complete frame freeze evidence must cover every protected item exactly once");
  }

  const verifiedDecisions = [];
  for (const row of frameRows) {
    const expectedDecision = buildFrameItemEgressDecisionV4({
      item: row,
      rightsDecisionInput,
      rightsDecisionTable,
      trustedOwnerApprovalRootHash,
      screenEvidence: screenById.get(row.itemId),
      scannerExecutionReceiptInventory: verifiedScannerInventory,
      trustedScannerExecutionReceiptInventoryHash,
      trustedScreeningPolicyHash,
      trustedScannerImplementationHash,
      trustedScannerRunnerHash,
    });
    const suppliedDecision = decisionById.get(row.itemId);
    if (!canonicalEqual(suppliedDecision, expectedDecision)) {
      throw new TypeError(`item egress decision mismatch after recomputation for exact protected item ${row.itemId}`);
    }
    if (row.eligible !== expectedDecision.eligible || row.exclusionCode !== expectedDecision.exclusionCode) {
      throw new TypeError(`protected frame eligibility does not match the recomputed egress decision for ${row.itemId}`);
    }
    verifiedDecisions.push(expectedDecision);
  }
  verifiedDecisions.sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const frameFailureLedger = verifiedDecisions.flatMap((decision) => decision.frameFailureLedger)
    .sort((left, right) => FRAME_FAILURE_CODES_V4.indexOf(left.code) - FRAME_FAILURE_CODES_V4.indexOf(right.code)
      || codePointCompare(left.itemId ?? "", right.itemId ?? ""));
  const anomalyLedger = verifiedDecisions.flatMap((decision) => decision.anomalyLedger)
    .sort((left, right) => codePointCompare(left.itemId ?? "", right.itemId ?? "")
      || codePointCompare(left.code ?? "", right.code ?? ""));
  return calculateArtifact({
    schemaVersion: "FrameFreezeEvidenceV3",
    designId: DESIGN_ID,
    runtimeConfigHash: runtimeConfigEvidence.runtimeConfigHash,
    sourceParityEvidenceHash: sourceParityEvidence.parityEvidenceHash,
    sourceModuleManifestHash: sourceModuleManifest.sourceModuleManifestHash,
    sourceModuleHash: sourceModuleManifest.sourceModuleHash,
    routeExecutionCompletedAt: sourceParityEvidence.routeExecutionCompletedAt,
    dependencyClosureCompletedAt: sourceModuleManifest.dependencyClosureCompletedAt,
    scannerExecutionCompletedAt: verifiedScannerInventory.recordedAt,
    trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash,
    rightsDecisionTableHash: rightsDecisionTable.rightsDecisionTableHash,
    trustedOwnerApprovalRootHash,
    trustedScreeningPolicyHash,
    trustedScannerImplementationHash,
    trustedScannerRunnerHash,
    trustedScannerExecutionReceiptInventoryHash,
    scannerExecutionReceiptRootHash: verifiedScannerInventory.scannerExecutionReceiptRootHash,
    protectedFrameIdentityRootHash: sha256Hex(canonicalJson(rowIdentities)),
    itemScreenEvidenceRootHash: sha256Hex(canonicalJson([...screenById.values()]
      .sort((left, right) => codePointCompare(left.itemId, right.itemId))
      .map((evidence) => evidence.screenEvidenceHash))),
    itemEgressDecisionRootHash: sha256Hex(canonicalJson(verifiedDecisions.map((decision) => decision.itemEgressDecisionHash))),
    itemCount: frameRows.length,
    frameFailureLedger,
    frameFailureLedgerRootHash: sha256Hex(canonicalJson(frameFailureLedger)),
    anomalyLedger,
    anomalyLedgerRootHash: sha256Hex(canonicalJson(anomalyLedger.map((entry) => entry.anomalyHash).sort(codePointCompare))),
  }, "frameFreezeEvidenceHash");
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalEqual(left, right) {
  try {
    return canonicalJson(left) === canonicalJson(right);
  } catch {
    return false;
  }
}

function artifactHashMatches(artifact, selfHashField) {
  try {
    return artifact?.[selfHashField] === calculateArtifactHash(artifact, selfHashField);
  } catch {
    return false;
  }
}

function assertObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${field} must be an object`);
}

function assertSha256(value, field) {
  if (!SHA256_PATTERN.test(value ?? "")) throw new TypeError(`${field} must be a lowercase SHA-256 hex digest`);
}

function assertSourceCommit(value) {
  if (!SOURCE_COMMIT_PATTERN.test(value ?? "")) throw new TypeError("sourceCommit must be an exact lowercase 40- or 64-character Git object ID");
}

function assertTimestamp(value, field) {
  if (typeof value !== "string") throw new TypeError(`${field} must be a strict RFC3339 instant`);
  const match = RFC3339_INSTANT_PATTERN.exec(value);
  if (!match) throw new TypeError(`${field} must be a strict RFC3339 instant`);
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offsetHourText, offsetMinuteText] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth
    || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59
    || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${field} must be a valid strict RFC3339 instant`);
  }
}

function timestampMillis(value, field) {
  assertTimestamp(value, field);
  return Date.parse(value);
}

function assertPipeSafe(value, field) {
  if (typeof value !== "string" || value.length === 0 || value.includes("|")) throw new TypeError(`${field} must be a non-empty pipe-free string`);
}

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${field} must be a non-empty string`);
}

function stratumFor(row) {
  return `${row.responseForm}::${row.difficulty}`;
}

function sortManifestRows(rows) {
  return [...rows].sort((left, right) => (
    codePointCompare(left.stratum, right.stratum)
      || codePointCompare(left.selectionDigest, right.selectionDigest)
      || codePointCompare(left.itemId, right.itemId)
  ));
}

function calculateArtifact(artifact, selfHashField) {
  return { ...artifact, [selfHashField]: calculateArtifactHash(artifact, selfHashField) };
}

export function calculateExactContentHashV3(row) {
  assertObject(row, "row");
  return sha256Hex(strictItemCanonicalJson({
    prompt: row.prompt,
    options: row.options,
    storedAnswer: row.storedAnswer,
    acceptedAnswers: row.acceptedAnswers,
    explanation: row.explanation,
  }));
}

export function calculateItemContentHashV4(row) {
  const normalizedRow = canonicalizeStrictItemJsonV4(row);
  assertObject(normalizedRow, "row");
  return sha256Hex(strictItemCanonicalJson({
    itemId: normalizedRow.itemId,
    sourceCommit: normalizedRow.sourceCommit,
    sourceIds: normalizedRow.sourceIds,
    region: normalizedRow.region,
    curriculumProfile: normalizedRow.curriculumProfile,
    grade: normalizedRow.grade,
    canonicalTopic: normalizedRow.canonicalTopic,
    responseForm: normalizedRow.responseForm,
    difficulty: normalizedRow.difficulty,
    sourceModuleHash: normalizedRow.sourceModuleHash,
    prompt: normalizedRow.prompt,
    options: normalizedRow.options,
    answer: normalizedRow.answer,
    storedAnswer: normalizedRow.storedAnswer,
    acceptedAnswers: normalizedRow.acceptedAnswers,
    explanation: normalizedRow.explanation,
    diagram: normalizedRow.diagram,
    questionAssets: normalizedRow.questionAssets,
    locale: normalizedRow.locale,
    localePolicy: normalizedRow.localePolicy,
    topic: normalizedRow.topic,
    rubric: normalizedRow.rubric,
    lineageKind: normalizedRow.lineageKind,
    batchId: normalizedRow.batchId,
    clusterId: normalizedRow.clusterId,
    topicId: normalizedRow.topicId,
    generationTemplate: normalizedRow.generationTemplate,
    sourceLessonSlug: normalizedRow.sourceLessonSlug,
  }));
}

export function calculateItemContentHashV3(row) {
  return calculateItemContentHashV4(row);
}

export function calculateExactDuplicateGroupIdV3(row) {
  return `exact-${calculateExactContentHashV3(row)}`;
}

export function calculateLineageKeyHashV3(row) {
  if (row.lineageKind === null) return null;
  const fields = LINEAGE_KEY_FIELDS[row.lineageKind];
  if (!fields) throw new TypeError("lineageKind must be K5, G6_12, CCSS, or null");
  const values = fields.map((field) => {
    const value = row[field];
    assertPipeSafe(value, field);
    return value;
  });
  return sha256Hex(canonicalJson([row.lineageKind, ...values]));
}

export function buildFrameItemLineageDecisionV4(itemInput) {
  const item = canonicalizeStrictItemJsonV4(itemInput);
  assertObject(item, "item");
  const itemHash = calculateItemContentHashV4(item);
  if (item.lineageKind === null) {
    return {
      schemaVersion: "FrameItemLineageDecisionV1",
      lineageKind: null,
      compoundKeyFields: [],
      lineageKeyHash: null,
      sourceEdgeEligible: false,
      frameFailureLedger: [],
      anomalyLedger: [calculateArtifact({
        code: "LINEAGE_UNAVAILABLE_NO_SOURCE_EDGE",
        itemId: item.itemId,
        itemHash,
      }, "anomalyHash")],
    };
  }
  const fields = LINEAGE_KEY_FIELDS[item.lineageKind];
  if (!fields) {
    return {
      schemaVersion: "FrameItemLineageDecisionV1",
      lineageKind: item.lineageKind ?? null,
      compoundKeyFields: [],
      lineageKeyHash: null,
      sourceEdgeEligible: false,
      frameFailureLedger: [{
        code: "LINEAGE_FIELD_MISSING",
        itemId: item.itemId,
        itemHash,
        detail: "claimed lineageKind is not in the closed V4 lineage set",
      }],
      anomalyLedger: [],
    };
  }
  const missingFields = fields.filter((field) => typeof item[field] !== "string" || item[field].length === 0 || item[field].includes("|"));
  if (missingFields.length > 0) {
    return {
      schemaVersion: "FrameItemLineageDecisionV1",
      lineageKind: item.lineageKind,
      compoundKeyFields: fields,
      lineageKeyHash: null,
      sourceEdgeEligible: false,
      frameFailureLedger: [{
        code: "LINEAGE_FIELD_MISSING",
        itemId: item.itemId,
        itemHash,
        detail: `claimed ${item.lineageKind} lineage lacks valid compound fields: ${missingFields.join(", ")}`,
      }],
      anomalyLedger: [],
    };
  }
  return {
    schemaVersion: "FrameItemLineageDecisionV1",
    lineageKind: item.lineageKind,
    compoundKeyFields: fields,
    lineageKeyHash: calculateLineageKeyHashV3(item),
    sourceEdgeEligible: true,
    frameFailureLedger: [],
    anomalyLedger: [],
  };
}

export function buildFrameItemPreflightV4(itemInput) {
  let item;
  try {
    item = canonicalizeStrictItemJsonV4(itemInput);
    assertObject(item, "item");
  } catch (error) {
    return {
      schemaVersion: "FrameItemPreflightV1",
      frameFailureLedger: [{ code: "SERIALIZATION_FAILED", detail: error.message }],
      anomalyLedger: [],
      lineageDecision: null,
      freezeEligible: false,
    };
  }
  const frameFailureLedger = [];
  if (!RESPONSE_FORMS.includes(item.responseForm)) {
    frameFailureLedger.push({ code: "UNSUPPORTED_RESPONSE_FORM", detail: `unsupported responseForm ${String(item.responseForm)}` });
  }
  const lineageDecision = buildFrameItemLineageDecisionV4(item);
  frameFailureLedger.push(...lineageDecision.frameFailureLedger);
  return {
    schemaVersion: "FrameItemPreflightV1",
    frameFailureLedger,
    anomalyLedger: lineageDecision.anomalyLedger,
    lineageDecision,
    freezeEligible: frameFailureLedger.length === 0,
  };
}

export function calculateRuntimeProjectionHashV3(row) {
  assertObject(row, "row");
  return sha256Hex(canonicalJson({
    itemId: row.itemId,
    itemHash: row.itemHash,
    sourceCommit: row.sourceCommit,
    runtimeConfigHash: row.runtimeConfigHash,
    region: row.region,
    curriculumProfile: row.curriculumProfile,
    grade: row.grade,
    canonicalTopic: row.canonicalTopic,
    responseForm: row.responseForm,
    difficulty: row.difficulty,
    sourceModuleHash: row.sourceModuleHash,
    runtimeOrigin: row.runtimeOrigin,
    runtimeVisible: row.runtimeVisible,
    provenanceType: row.provenanceType,
  }));
}

export function buildCleanSourceEvidenceV3(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "clean source evidence input");
  const {
    sourceCommit,
    verifiedAt,
    gitStatusPorcelain,
    sourceObjectType,
    verificationMode,
  } = normalizedInput;
  assertSourceCommit(sourceCommit);
  assertTimestamp(verifiedAt, "verifiedAt");
  if (gitStatusPorcelain !== "") throw new TypeError("clean-source evidence requires empty git status porcelain");
  if (sourceObjectType !== "commit") throw new TypeError("source object must exist as a commit");
  if (verificationMode !== "READ_ONLY_GIT_STATUS_AND_CAT_FILE") {
    throw new TypeError("clean-source evidence requires the frozen read-only verification mode");
  }
  return calculateArtifact({
    schemaVersion: "CleanSourceEvidenceV1",
    designId: DESIGN_ID,
    sourceCommit,
    verifiedAt,
    verificationMode,
    gitStatusPorcelainHash: sha256Hex(gitStatusPorcelain),
    dirtyEntryCount: 0,
    sourceObjectType,
    sourceCommitExists: true,
    worktreeClean: true,
    evidenceDerivedFromReadOnlyCommands: true,
  }, "sourceEvidenceHash");
}

function validateFailureEntry(entry, index) {
  assertObject(entry, `serializationFailureLedger[${index}]`);
  assertPipeSafe(entry.itemId, `serializationFailureLedger[${index}].itemId`);
  assertSha256(entry.runtimeProjectionHash, `serializationFailureLedger[${index}].runtimeProjectionHash`);
  if (entry.exclusionCode !== "UNSTABLE_SERIALIZATION") {
    throw new TypeError(`serializationFailureLedger[${index}].exclusionCode mismatch`);
  }
  if (entry.failureClass !== "SERIALIZATION_OR_READ_CRASH") {
    throw new TypeError(`serializationFailureLedger[${index}].failureClass mismatch`);
  }
  assertSha256(entry.redactedDetailHash, `serializationFailureLedger[${index}].redactedDetailHash`);
  assertTimestamp(entry.recordedAt, `serializationFailureLedger[${index}].recordedAt`);
  if (!artifactHashMatches(entry, "entryHash")) throw new TypeError(`serializationFailureLedger[${index}].entryHash mismatch`);
}

function inventoryRoot(leaves) {
  return sha256Hex(canonicalJson([...leaves].map((leaf) => [leaf.itemId, leaf.runtimeProjectionHash])
    .sort((left, right) => codePointCompare(left[0], right[0]) || codePointCompare(left[1], right[1]))));
}

function emptyExclusionCounts() {
  return Object.fromEntries(CLOSED_EXCLUSION_CODES.map((code) => [code, 0]));
}

function normalizeSourceEnumerationItemLeaf(leaf, field) {
  assertObject(leaf, field);
  assertNonEmptyString(leaf.itemId, `${field}.itemId`);
  assertSha256(leaf.sourceItemHash, `${field}.sourceItemHash`);
  assertSha256(leaf.sourceModuleHash, `${field}.sourceModuleHash`);
  const disposition = SOURCE_ENUMERATION_DISPOSITIONS[leaf.disposition];
  if (!disposition) throw new TypeError(`${field}.disposition must be one of the frozen source-enumeration dispositions`);
  if (disposition.runtimeVisible) assertSha256(leaf.runtimeProjectionHash, `${field}.runtimeProjectionHash`);
  else if (leaf.runtimeProjectionHash !== null) throw new TypeError(`${field}.runtimeProjectionHash must be null outside the runtime-visible population`);
  if (leaf.exclusionCode !== disposition.exclusionCode) throw new TypeError(`${field}.exclusionCode does not match disposition`);
  return {
    itemId: leaf.itemId,
    sourceItemHash: leaf.sourceItemHash,
    sourceModuleHash: leaf.sourceModuleHash,
    runtimeProjectionHash: leaf.runtimeProjectionHash,
    disposition: leaf.disposition,
    runtimeVisible: disposition.runtimeVisible,
    serializationStatus: disposition.serialized ? "SERIALIZED" : disposition.runtimeVisible ? "FAILED" : "NOT_APPLICABLE",
    eligible: disposition.eligible,
    exclusionCode: disposition.exclusionCode,
  };
}

function sourceEnumerationCounts(itemLeaves) {
  const exclusionCounts = emptyExclusionCounts();
  for (const leaf of itemLeaves) if (leaf.exclusionCode !== null) exclusionCounts[leaf.exclusionCode] += 1;
  const eligibleItemCount = itemLeaves.filter((leaf) => leaf.eligible).length;
  const restrictedItemCount = exclusionCounts.RESTRICTED_EGRESS_CONTENT;
  const serializationFailureCount = exclusionCounts.UNSTABLE_SERIALIZATION;
  const sourceExclusionCount = exclusionCounts.NON_CA_TRACK
    + exclusionCounts.RUNTIME_NOT_VISIBLE
    + exclusionCounts.SYNTHETIC_TEST_CANDIDATE_ONLY;
  const runtimeVisibleItemCount = itemLeaves.filter((leaf) => leaf.runtimeVisible).length;
  return {
    sourceItemCount: itemLeaves.length,
    runtimeVisibleItemCount,
    eligibleItemCount,
    restrictedItemCount,
    serializationFailureCount,
    sourceExclusionCount,
    excludedItemCount: itemLeaves.length - eligibleItemCount,
    exclusionCounts,
  };
}

function buildGradeProjectionInvocationLeaf({
  grade,
  invocationSequenceNumber,
  itemLeaves,
  registrationHash,
  runtimeConfigHash,
  sourceCommit,
  extractorImplementationHash,
  extractorRunnerCommit,
  extractorRunnerHash,
}) {
  const orderedItemLeaves = itemLeaves.map((leaf, index) => (
    normalizeSourceEnumerationItemLeaf(leaf, `gradeProjectionInvocations[${invocationSequenceNumber - 1}].itemLeaves[${index}]`)
  )).sort((left, right) => codePointCompare(left.itemId, right.itemId)
    || codePointCompare(left.sourceItemHash, right.sourceItemHash));
  const localIds = new Set();
  for (const leaf of orderedItemLeaves) {
    if (localIds.has(leaf.itemId)) throw new TypeError(`duplicate source enumeration itemId ${leaf.itemId}`);
    localIds.add(leaf.itemId);
  }
  const sourceModuleHashes = [...new Set(orderedItemLeaves.map((leaf) => leaf.sourceModuleHash))].sort(codePointCompare);
  const counts = sourceEnumerationCounts(orderedItemLeaves);
  return calculateArtifact({
    schemaVersion: "RuntimeGradeProjectionInvocationLeafV1",
    designId: DESIGN_ID,
    registrationHash,
    sourceCommit,
    runtimeConfigHash,
    extractorImplementationHash,
    extractorRunnerCommit,
    extractorRunnerHash,
    invocationSequenceNumber,
    grade,
    region: "CALIFORNIA",
    curriculumProfile: "US_CA_MATH",
    runtimeOrigin: "QUESTION_STORE_AUTHENTICATED_STUDENT_PROJECTION",
    evidenceContractSchemaVersion: RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.schemaVersion,
    evidenceContractHash: RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
    projectionInputHash: sha256Hex(canonicalJson({
      designId: DESIGN_ID,
      registrationHash,
      sourceCommit,
      runtimeConfigHash,
      extractorImplementationHash,
      extractorRunnerCommit,
      extractorRunnerHash,
      invocationSequenceNumber,
      grade,
      region: "CALIFORNIA",
      curriculumProfile: "US_CA_MATH",
      runtimeOrigin: "QUESTION_STORE_AUTHENTICATED_STUDENT_PROJECTION",
    })),
    itemLeaves: orderedItemLeaves,
    orderedItemRootFormula: "SHA256(JCS(SORTED_FULL_SOURCE_ITEM_LEAVES_BY_ITEM_ID_THEN_SOURCE_ITEM_HASH))",
    orderedItemRootHash: sha256Hex(canonicalJson(orderedItemLeaves)),
    sourceModuleHashes,
    sourceModuleRootFormula: "SHA256(JCS(SORTED_UNIQUE_SOURCE_MODULE_HASHES))",
    sourceModuleRootHash: sha256Hex(canonicalJson(sourceModuleHashes)),
    ...counts,
    accountingEquations: [
      "sourceItemCount=runtimeVisibleItemCount+sourceExclusionCount",
      "runtimeVisibleItemCount=eligibleItemCount+restrictedItemCount+serializationFailureCount",
      "sourceItemCount=eligibleItemCount+excludedItemCount",
    ],
  }, "invocationLeafHash");
}

export function buildRuntimeSourceEnumerationReceiptV1(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "runtime source enumeration receipt input");
  const {
    registrationHash,
    sourceCommit,
    runtimeConfigHash,
    runtimeConfigEvidenceHash,
    sourceParityEvidenceHash,
    sourceModuleManifestHash,
    extractorImplementationHash,
    extractorRunnerCommit,
    extractorRunnerHash,
    rawEvidenceArtifactRootHash,
    enumeratedAt,
    gradeProjectionInvocations,
  } = normalizedInput;
  assertSha256(registrationHash, "registrationHash");
  assertSourceCommit(sourceCommit);
  assertSha256(runtimeConfigHash, "runtimeConfigHash");
  assertSha256(runtimeConfigEvidenceHash, "runtimeConfigEvidenceHash");
  if (runtimeConfigHash !== runtimeConfigEvidenceHash) {
    throw new TypeError("runtimeConfigHash must equal the recomputed runtimeConfigEvidence root");
  }
  assertSha256(sourceParityEvidenceHash, "sourceParityEvidenceHash");
  assertSha256(sourceModuleManifestHash, "sourceModuleManifestHash");
  assertSha256(extractorImplementationHash, "extractorImplementationHash");
  if (!SOURCE_COMMIT_PATTERN.test(extractorRunnerCommit ?? "")) {
    throw new TypeError("extractorRunnerCommit must be an exact lowercase 40- or 64-character Git object ID");
  }
  assertSha256(extractorRunnerHash, "extractorRunnerHash");
  assertSha256(rawEvidenceArtifactRootHash, "rawEvidenceArtifactRootHash");
  assertTimestamp(enumeratedAt, "enumeratedAt");
  if (!Array.isArray(gradeProjectionInvocations) || gradeProjectionInvocations.length !== RUNTIME_SOURCE_ENUMERATION_GRADES.length) {
    throw new TypeError("source enumeration requires exactly 13 grade projection invocations");
  }
  const suppliedByGrade = new Map();
  for (const [index, invocation] of gradeProjectionInvocations.entries()) {
    assertObject(invocation, `gradeProjectionInvocations[${index}]`);
    if (!RUNTIME_SOURCE_ENUMERATION_GRADES.includes(invocation.grade)) {
      throw new TypeError(`gradeProjectionInvocations[${index}].grade is outside K-12`);
    }
    if (suppliedByGrade.has(invocation.grade)) throw new TypeError(`duplicate grade projection invocation ${invocation.grade}`);
    if (!Array.isArray(invocation.itemLeaves)) throw new TypeError(`gradeProjectionInvocations[${index}].itemLeaves must be an array`);
    suppliedByGrade.set(invocation.grade, invocation);
  }
  const invocationLeaves = RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade, index) => {
    const supplied = suppliedByGrade.get(grade);
    if (!supplied) throw new TypeError(`missing grade projection invocation ${grade}`);
    return buildGradeProjectionInvocationLeaf({
      grade,
      invocationSequenceNumber: index + 1,
      itemLeaves: supplied.itemLeaves,
      registrationHash,
      runtimeConfigHash,
      sourceCommit,
      extractorImplementationHash,
      extractorRunnerCommit,
      extractorRunnerHash,
    });
  });
  const allItemLeaves = invocationLeaves.flatMap((invocation) => invocation.itemLeaves.map((leaf) => ({
    grade: invocation.grade,
    ...leaf,
  })));
  if (allItemLeaves.length === 0) throw new TypeError("source enumeration receipt must contain at least one source item");
  const globalIds = new Set();
  for (const leaf of allItemLeaves) {
    if (globalIds.has(leaf.itemId)) throw new TypeError(`duplicate source enumeration itemId ${leaf.itemId} across grade projections`);
    globalIds.add(leaf.itemId);
  }
  const counts = sourceEnumerationCounts(allItemLeaves);
  const expectedRuntimeInventoryLeaves = allItemLeaves.filter((leaf) => leaf.runtimeVisible).map((leaf) => ({
    itemId: leaf.itemId,
    runtimeProjectionHash: leaf.runtimeProjectionHash,
  })).sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const serializedRuntimeVisibleLeaves = allItemLeaves.filter((leaf) => leaf.runtimeVisible && leaf.serializationStatus === "SERIALIZED").map((leaf) => ({
    itemId: leaf.itemId,
    runtimeProjectionHash: leaf.runtimeProjectionHash,
    eligible: leaf.eligible,
    exclusionCode: leaf.exclusionCode,
  })).sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const serializationFailureInventoryLeaves = allItemLeaves.filter((leaf) => leaf.disposition === "RUNTIME_VISIBLE_SERIALIZATION_FAILURE").map((leaf) => ({
    itemId: leaf.itemId,
    runtimeProjectionHash: leaf.runtimeProjectionHash,
    exclusionCode: leaf.exclusionCode,
  })).sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const sourceExclusionLedger = allItemLeaves.filter((leaf) => !leaf.runtimeVisible).map((leaf) => ({
    grade: leaf.grade,
    itemId: leaf.itemId,
    sourceItemHash: leaf.sourceItemHash,
    sourceModuleHash: leaf.sourceModuleHash,
    exclusionCode: leaf.exclusionCode,
  })).sort((left, right) => codePointCompare(left.grade, right.grade) || codePointCompare(left.itemId, right.itemId));
  const fullSourceEnumerationRootHash = sha256Hex(canonicalJson(invocationLeaves.map((invocation) => [
    invocation.grade,
    invocation.invocationSequenceNumber,
    invocation.invocationLeafHash,
    invocation.orderedItemRootHash,
    invocation.sourceModuleRootHash,
  ])));
  return calculateArtifact({
    schemaVersion: "RuntimeSourceEnumerationReceiptV1",
    designId: DESIGN_ID,
    registrationHash,
    sourceCommit,
    runtimeConfigHash,
    runtimeConfigEvidenceHash,
    sourceParityEvidenceHash,
    sourceModuleManifestHash,
    region: "CALIFORNIA",
    curriculumProfile: "US_CA_MATH",
    runtimeOrigin: "QUESTION_STORE_AUTHENTICATED_STUDENT_PROJECTION",
    evidenceContractSchemaVersion: RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.schemaVersion,
    evidenceContractHash: RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
    extractorImplementationHash,
    extractorRunnerCommit,
    extractorRunnerHash,
    rawEvidenceArtifactRootHash,
    enumeratedAt,
    gradeProjectionInvocations: invocationLeaves,
    gradeProjectionInvocationCount: invocationLeaves.length,
    gradeProjectionOrder: RUNTIME_SOURCE_ENUMERATION_GRADES,
    fullSourceEnumerationRootFormula: "SHA256(JCS([[grade,invocationSequenceNumber,invocationLeafHash,orderedItemRootHash,sourceModuleRootHash],...]))",
    fullSourceEnumerationRootHash,
    expectedRuntimeInventoryLeaves,
    expectedRuntimeInventoryRootHash: inventoryRoot(expectedRuntimeInventoryLeaves),
    serializedRuntimeVisibleLeaves,
    serializedRuntimeVisibleRootHash: sha256Hex(canonicalJson(serializedRuntimeVisibleLeaves)),
    serializationFailureInventoryLeaves,
    serializationFailureInventoryRootHash: sha256Hex(canonicalJson(serializationFailureInventoryLeaves)),
    sourceExclusionLedger,
    sourceExclusionLedgerRootHash: sha256Hex(canonicalJson(sourceExclusionLedger)),
    ...counts,
    accountingEquations: [
      "sourceItemCount=runtimeVisibleItemCount+sourceExclusionCount",
      "runtimeVisibleItemCount=eligibleItemCount+restrictedItemCount+serializationFailureCount",
      "sourceItemCount=eligibleItemCount+excludedItemCount",
    ],
    duplicateIdRule: SOURCE_ENUMERATION_DUPLICATE_ID_RULE,
    sourceCompletenessEvidenceBoundary: SOURCE_ENUMERATION_EVIDENCE_BOUNDARY,
    sourceCompletenessProvedByDesign: false,
    requiresIndependentExtractorExecutionAgainstFrozenSource: true,
    immutableAfterFreeze: true,
  }, "sourceEnumerationReceiptHash");
}

export function validateRuntimeSourceEnumerationReceiptV1(receipt) {
  assertObject(receipt, "runtimeSourceEnumerationReceipt");
  const expected = buildRuntimeSourceEnumerationReceiptV1({
    registrationHash: receipt.registrationHash,
    sourceCommit: receipt.sourceCommit,
    runtimeConfigHash: receipt.runtimeConfigHash,
    runtimeConfigEvidenceHash: receipt.runtimeConfigEvidenceHash,
    sourceParityEvidenceHash: receipt.sourceParityEvidenceHash,
    sourceModuleManifestHash: receipt.sourceModuleManifestHash,
    extractorImplementationHash: receipt.extractorImplementationHash,
    extractorRunnerCommit: receipt.extractorRunnerCommit,
    extractorRunnerHash: receipt.extractorRunnerHash,
    rawEvidenceArtifactRootHash: receipt.rawEvidenceArtifactRootHash,
    enumeratedAt: receipt.enumeratedAt,
    gradeProjectionInvocations: receipt.gradeProjectionInvocations,
  });
  if (!canonicalEqual(receipt, expected)) throw new TypeError("runtime source enumeration receipt or bound roots mismatch");
  return true;
}

export function buildRuntimeExtractionSnapshotV3(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "runtime extraction snapshot input");
  const {
    frameRows,
    expectedInventoryLeaves,
    runtimeSourceEnumerationReceipt,
    serializationFailureLedger,
    registrationHash,
    runtimeConfigHash,
    sourceCommit,
    extractedAt,
    trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash,
    frameFreezeEvidenceInput,
    frameFreezeEvidence,
  } = normalizedInput;
  if (!frameFreezeEvidenceInput || !frameFreezeEvidence) {
    throw new TypeError("runtime extraction snapshot requires complete protected frameFreezeEvidence input and artifact");
  }
  const expectedFrameFreezeEvidence = buildFrameFreezeEvidenceV4({
    ...frameFreezeEvidenceInput,
    frameRows,
  });
  if (!canonicalEqual(frameFreezeEvidence, expectedFrameFreezeEvidence)) {
    throw new TypeError("runtime extraction snapshot frameFreezeEvidence mismatch after recomputation");
  }
  assertSha256(trustedRouteExecutionRootHash, "runtime snapshot out-of-band trusted route execution root");
  if (frameFreezeEvidence.trustedRouteExecutionRootHash !== trustedRouteExecutionRootHash) {
    throw new TypeError("runtime snapshot frame parity evidence is not bound to the out-of-band trusted route execution root");
  }
  assertSha256(trustedDependencyClosureRootHash, "runtime snapshot out-of-band trusted dependency-closure root");
  if (frameFreezeEvidence.trustedDependencyClosureRootHash !== trustedDependencyClosureRootHash) {
    throw new TypeError("runtime snapshot source manifest is not bound to the out-of-band trusted dependency-closure root");
  }
  assertSha256(trustedOwnerApprovalRootHash, "runtime snapshot out-of-band trusted owner approval root");
  if (frameFreezeEvidence.trustedOwnerApprovalRootHash !== trustedOwnerApprovalRootHash) {
    throw new TypeError("runtime snapshot frame rights evidence is not bound to the out-of-band owner approval root");
  }
  validateFrameRows(frameRows, registrationHash, { runtimeConfigHash, sourceCommit });
  validateRuntimeSourceEnumerationReceiptV1(runtimeSourceEnumerationReceipt);
  if (runtimeSourceEnumerationReceipt.registrationHash !== registrationHash
    || runtimeSourceEnumerationReceipt.runtimeConfigHash !== runtimeConfigHash
    || runtimeSourceEnumerationReceipt.sourceCommit !== sourceCommit) {
    throw new TypeError("runtime source enumeration receipt root tuple mismatch");
  }
  if (runtimeSourceEnumerationReceipt.runtimeConfigEvidenceHash !== frameFreezeEvidence.runtimeConfigHash
    || runtimeSourceEnumerationReceipt.sourceParityEvidenceHash !== frameFreezeEvidence.sourceParityEvidenceHash
    || runtimeSourceEnumerationReceipt.sourceModuleManifestHash !== frameFreezeEvidence.sourceModuleManifestHash) {
    throw new TypeError("runtime source enumeration receipt does not bind the complete frame evidence roots");
  }
  if (!Array.isArray(expectedInventoryLeaves) || expectedInventoryLeaves.length === 0) {
    throw new TypeError("caller materialization of expected runtime inventory leaves is required for receipt comparison");
  }
  if (!Array.isArray(serializationFailureLedger)) throw new TypeError("serialization failure ledger must be an array");
  assertTimestamp(extractedAt, "extractedAt");
  const expectedIds = new Set();
  for (const [index, leaf] of expectedInventoryLeaves.entries()) {
    assertObject(leaf, `expectedInventoryLeaves[${index}]`);
    assertPipeSafe(leaf.itemId, `expectedInventoryLeaves[${index}].itemId`);
    assertSha256(leaf.runtimeProjectionHash, `expectedInventoryLeaves[${index}].runtimeProjectionHash`);
    if (expectedIds.has(leaf.itemId)) throw new TypeError(`duplicate expected inventory itemId ${leaf.itemId}`);
    expectedIds.add(leaf.itemId);
  }
  const orderedInventory = [...expectedInventoryLeaves].sort((left, right) => codePointCompare(left.itemId, right.itemId));
  if (!canonicalEqual(orderedInventory, runtimeSourceEnumerationReceipt.expectedRuntimeInventoryLeaves)) {
    throw new TypeError("caller expected inventory does not exactly match the immutable source-enumeration receipt");
  }
  if (runtimeSourceEnumerationReceipt.expectedRuntimeInventoryRootHash !== inventoryRoot(orderedInventory)) {
    throw new TypeError("source-enumeration receipt expected inventory root mismatch");
  }
  const receiptSerializedById = new Map(runtimeSourceEnumerationReceipt.serializedRuntimeVisibleLeaves
    .map((leaf) => [leaf.itemId, leaf]));
  const receiptFailureById = new Map(runtimeSourceEnumerationReceipt.serializationFailureInventoryLeaves
    .map((leaf) => [leaf.itemId, leaf]));
  const serializedIds = new Set();
  for (const row of frameRows) {
    if (serializedIds.has(row.itemId)) throw new TypeError(`duplicate serialized itemId ${row.itemId}`);
    serializedIds.add(row.itemId);
    const expected = expectedInventoryLeaves.find((leaf) => leaf.itemId === row.itemId);
    if (!expected || expected.runtimeProjectionHash !== calculateRuntimeProjectionHashV3(row)) {
      throw new TypeError(`serialized row ${row.itemId} does not match the expected runtime inventory`);
    }
    const receiptLeaf = receiptSerializedById.get(row.itemId);
    if (!receiptLeaf
      || receiptLeaf.runtimeProjectionHash !== expected.runtimeProjectionHash
      || receiptLeaf.eligible !== row.eligible
      || receiptLeaf.exclusionCode !== row.exclusionCode) {
      throw new TypeError(`serialized row ${row.itemId} does not match the source-enumeration disposition`);
    }
  }
  const failureIds = new Set();
  for (const [index, entry] of serializationFailureLedger.entries()) {
    validateFailureEntry(entry, index);
    if (failureIds.has(entry.itemId) || serializedIds.has(entry.itemId)) {
      throw new TypeError(`runtime item ${entry.itemId} appears more than once in completeness evidence`);
    }
    failureIds.add(entry.itemId);
    const expected = expectedInventoryLeaves.find((leaf) => leaf.itemId === entry.itemId);
    if (!expected || expected.runtimeProjectionHash !== entry.runtimeProjectionHash) {
      throw new TypeError(`serialization failure ${entry.itemId} does not match expected runtime inventory`);
    }
    const receiptLeaf = receiptFailureById.get(entry.itemId);
    if (!receiptLeaf || receiptLeaf.runtimeProjectionHash !== entry.runtimeProjectionHash) {
      throw new TypeError(`serialization failure ${entry.itemId} does not match the source-enumeration failure set`);
    }
  }
  const observedIds = new Set([...serializedIds, ...failureIds]);
  if (observedIds.size !== expectedIds.size || [...expectedIds].some((itemId) => !observedIds.has(itemId))) {
    throw new TypeError("runtime extraction completeness equation failed: deletion or unledgered item");
  }
  if (serializedIds.size !== receiptSerializedById.size
    || [...receiptSerializedById.keys()].some((itemId) => !serializedIds.has(itemId))) {
    throw new TypeError("serialized frame set does not exactly match the source-enumeration receipt");
  }
  if (failureIds.size !== receiptFailureById.size
    || [...receiptFailureById.keys()].some((itemId) => !failureIds.has(itemId))) {
    throw new TypeError("serialization failure ledger does not exactly match the source-enumeration receipt");
  }
  if (timestampMillis(runtimeSourceEnumerationReceipt.enumeratedAt, "runtimeSourceEnumerationReceipt.enumeratedAt")
    >= timestampMillis(extractedAt, "extractedAt")) {
    throw new TypeError("source enumeration receipt must precede the runtime extraction snapshot");
  }
  const orderedFailures = [...serializationFailureLedger].sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const serializedLeaves = frameRows.map((row) => ({
    itemId: row.itemId,
    runtimeProjectionHash: calculateRuntimeProjectionHashV3(row),
  })).sort((left, right) => codePointCompare(left.itemId, right.itemId));
  return calculateArtifact({
    schemaVersion: "RuntimeExtractionSnapshotV1",
    designId: DESIGN_ID,
    registrationHash,
    region: "CALIFORNIA",
    curriculumProfile: "US_CA_MATH",
    runtimeOrigin: "QUESTION_STORE_AUTHENTICATED_STUDENT_PROJECTION",
    runtimeVisibleOnly: true,
    responseForms: RESPONSE_FORMS,
    difficulties: DIFFICULTIES,
    closedExclusionCodes: CLOSED_EXCLUSION_CODES,
    egressPopulationClaim: "EGRESS_ELIGIBLE_SUBPOPULATION_ONLY",
    runtimeConfigHash,
    runtimeConfigEvidenceHash: runtimeSourceEnumerationReceipt.runtimeConfigEvidenceHash,
    sourceParityEvidenceHash: runtimeSourceEnumerationReceipt.sourceParityEvidenceHash,
    sourceModuleManifestHash: runtimeSourceEnumerationReceipt.sourceModuleManifestHash,
    sourceModuleHash: frameFreezeEvidence.sourceModuleHash,
    trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash,
    sourceCommit,
    extractedAt,
    runtimeSourceEnumerationReceipt,
    frameFreezeEvidenceInput,
    frameFreezeEvidence,
    frameFreezeEvidenceHash: frameFreezeEvidence.frameFreezeEvidenceHash,
    runtimeSourceEnumerationReceiptHash: runtimeSourceEnumerationReceipt.sourceEnumerationReceiptHash,
    sourceEnumerationEvidenceContractHash: runtimeSourceEnumerationReceipt.evidenceContractHash,
    fullSourceEnumerationRootHash: runtimeSourceEnumerationReceipt.fullSourceEnumerationRootHash,
    rawEvidenceArtifactRootHash: runtimeSourceEnumerationReceipt.rawEvidenceArtifactRootHash,
    extractorImplementationHash: runtimeSourceEnumerationReceipt.extractorImplementationHash,
    extractorRunnerCommit: runtimeSourceEnumerationReceipt.extractorRunnerCommit,
    extractorRunnerHash: runtimeSourceEnumerationReceipt.extractorRunnerHash,
    sourceItemCount: runtimeSourceEnumerationReceipt.sourceItemCount,
    runtimeVisibleItemCount: runtimeSourceEnumerationReceipt.runtimeVisibleItemCount,
    eligibleItemCount: runtimeSourceEnumerationReceipt.eligibleItemCount,
    restrictedItemCount: runtimeSourceEnumerationReceipt.restrictedItemCount,
    sourceExclusionCount: runtimeSourceEnumerationReceipt.sourceExclusionCount,
    exclusionCounts: runtimeSourceEnumerationReceipt.exclusionCounts,
    sourceCompletenessEvidenceBoundary: SOURCE_ENUMERATION_EVIDENCE_BOUNDARY,
    sourceCompletenessProvedByDesign: false,
    expectedInventoryLeaves: orderedInventory,
    expectedRuntimeInventoryCount: orderedInventory.length,
    expectedInventoryRootHash: inventoryRoot(orderedInventory),
    serializedProjectionLeaves: serializedLeaves,
    serializedFrameRowCount: serializedLeaves.length,
    serializedProjectionRootHash: inventoryRoot(serializedLeaves),
    serializationFailureLedger: orderedFailures,
    serializationFailureCount: orderedFailures.length,
    failureLedgerRootHash: sha256Hex(canonicalJson(orderedFailures.map((entry) => [entry.itemId, entry.entryHash]))),
    completenessEquation: "sourceReceiptExpectedRuntimeInventoryCount=serializedFrameRowCount+serializationFailureCount",
    completenessProved: orderedInventory.length === serializedLeaves.length + orderedFailures.length,
  }, "runtimeExtractionSnapshotHash");
}

function validateRuntimeSnapshotAgainstRows(frameRows, snapshot) {
  assertObject(snapshot, "runtimeExtractionSnapshot");
  const expected = buildRuntimeExtractionSnapshotV3({
    frameRows,
    expectedInventoryLeaves: snapshot.expectedInventoryLeaves,
    runtimeSourceEnumerationReceipt: snapshot.runtimeSourceEnumerationReceipt,
    serializationFailureLedger: snapshot.serializationFailureLedger,
    registrationHash: snapshot.registrationHash,
    runtimeConfigHash: snapshot.runtimeConfigHash,
    sourceCommit: snapshot.sourceCommit,
    extractedAt: snapshot.extractedAt,
    trustedRouteExecutionRootHash: snapshot.trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash: snapshot.trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash: snapshot.trustedOwnerApprovalRootHash,
    frameFreezeEvidenceInput: snapshot.frameFreezeEvidenceInput,
    frameFreezeEvidence: snapshot.frameFreezeEvidence,
  });
  if (!canonicalEqual(snapshot, expected)) throw new TypeError("runtime extraction inventory/completeness evidence mismatch");
}

function validateCleanSourceEvidence(evidence, sourceCommit) {
  assertObject(evidence, "cleanSourceEvidence");
  const expected = buildCleanSourceEvidenceV3({
    sourceCommit,
    verifiedAt: evidence.verifiedAt,
    gitStatusPorcelain: "",
    sourceObjectType: evidence.sourceObjectType,
    verificationMode: evidence.verificationMode,
  });
  if (!canonicalEqual(evidence, expected)) throw new TypeError("clean source/existence evidence mismatch");
}

function normalizeLatexAndUnicode(value) {
  return value.normalize("NFKC")
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/gu, "$1 / $2")
    .replace(/\\(?:left|right)/gu, "")
    .replace(/\\(?:times|cdot)/gu, "*")
    .replace(/\\div/gu, "/")
    .replace(/\\leq?/gu, "<=")
    .replace(/\\geq?/gu, ">=")
    .replace(/\\neq/gu, "!=")
    .replace(/[×·]/gu, "*")
    .replace(/÷/gu, "/")
    .replace(/≤/gu, "<=")
    .replace(/≥/gu, ">=")
    .replace(/≠/gu, "!=")
    .replace(/[−–—]/gu, "-")
    .replace(/[$]/gu, "")
    .toLowerCase();
}

export function normalizePromptForNearV3(value) {
  const prompt = typeof value === "string" ? value : localizedEnglish(value, "prompt");
  return normalizeLatexAndUnicode(prompt)
    .replace(/[，。；：！？,.!?;:"'“”‘’（）()\[\]{}]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function templateText(value) {
  return normalizePromptForNearV3(value)
    .replace(/(?<![\p{L}\p{N}])[-+]?\d+\s*\/\s*\d+(?![\p{L}\p{N}])/gu, " <fraction> ")
    .replace(/(?<![\p{L}\p{N}])[-+]?\d+\.\d+%(?![\p{L}\p{N}])/gu, " <decimal-percent> ")
    .replace(/(?<![\p{L}\p{N}])[-+]?\d+%(?![\p{L}\p{N}])/gu, " <integer-percent> ")
    .replace(/(?<![\p{L}\p{N}])[-+]?\d+\.\d+(?![\p{L}\p{N}])/gu, " <decimal> ")
    .replace(/(?<![\p{L}\p{N}])[-+]?\d+(?![\p{L}\p{N}])/gu, " <integer> ")
    .replace(/\b[a-z]\b/gu, " <variable> ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function calculateNormalizedPromptHashV3(row) {
  return sha256Hex(normalizePromptForNearV3(row.prompt));
}

export function calculateTemplateSkeletonHashV3(row) {
  const options = Array.isArray(row.options)
    ? row.options.map((option, index) => templateText(
      typeof option === "string" ? option : localizedEnglish(option, `options[${index}]`),
    )).sort(codePointCompare)
    : null;
  return sha256Hex(canonicalJson({
    canonicalTopic: row.canonicalTopic,
    responseForm: row.responseForm,
    prompt: templateText(row.prompt),
    options,
  }));
}

function characterTrigrams(value) {
  const characters = [...value];
  if (characters.length < 3) return new Set([value]);
  const grams = new Set();
  for (let index = 0; index <= characters.length - 3; index += 1) {
    grams.add(characters.slice(index, index + 3).join(""));
  }
  return grams;
}

export function trigramJaccardV3(left, right) {
  const leftGrams = characterTrigrams(left);
  const rightGrams = characterTrigrams(right);
  let intersection = 0;
  for (const gram of leftGrams) if (rightGrams.has(gram)) intersection += 1;
  const union = leftGrams.size + rightGrams.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

export function normalizedEditSimilarityV3(left, right) {
  const leftCharacters = [...left];
  const rightCharacters = [...right];
  if (leftCharacters.length === 0 && rightCharacters.length === 0) return 1;
  let previous = Array.from({ length: rightCharacters.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= leftCharacters.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= rightCharacters.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (leftCharacters[leftIndex - 1] === rightCharacters[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return 1 - (previous[rightCharacters.length] / Math.max(leftCharacters.length, rightCharacters.length));
}

function validateFrameRows(frameRows, registrationHash, {
  runtimeConfigHash = null,
  sourceCommit = null,
} = {}) {
  if (!Array.isArray(frameRows) || frameRows.length === 0) throw new TypeError("full protected frame rows are required");
  assertSha256(registrationHash, "registrationHash");
  if (runtimeConfigHash !== null) assertSha256(runtimeConfigHash, "runtimeConfigHash");
  if (sourceCommit !== null) assertSourceCommit(sourceCommit);

  const itemIds = new Set();
  for (const [index, row] of frameRows.entries()) {
    assertObject(row, `frameRows[${index}]`);
    if (row.schemaVersion !== "SamplingFrameRowV2") throw new TypeError(`frameRows[${index}] schemaVersion mismatch`);
    if (row.designId !== DESIGN_ID) throw new TypeError(`frameRows[${index}] designId mismatch`);
    if (row.registrationHash !== registrationHash) throw new TypeError(`frameRows[${index}] registrationHash mismatch`);
    assertTimestamp(row.frameFrozenAt, `frameRows[${index}].frameFrozenAt`);
    assertPipeSafe(row.itemId, `frameRows[${index}].itemId`);
    assertPipeSafe(row.canonicalTopic, `frameRows[${index}].canonicalTopic`);
    assertSha256(row.itemHash, `frameRows[${index}].itemHash`);
    if (row.itemHash !== calculateItemContentHashV4(row)) throw new TypeError(`frameRows[${index}].itemHash mismatch`);
    assertSha256(row.runtimeConfigHash, `frameRows[${index}].runtimeConfigHash`);
    assertSourceCommit(row.sourceCommit);
    if (row.region !== "CALIFORNIA") throw new TypeError(`frameRows[${index}].region must be CALIFORNIA`);
    if (row.curriculumProfile !== "US_CA_MATH") throw new TypeError(`frameRows[${index}].curriculumProfile must be US_CA_MATH`);
    if (row.runtimeOrigin !== "QUESTION_STORE_AUTHENTICATED_STUDENT_PROJECTION") {
      throw new TypeError(`frameRows[${index}].runtimeOrigin mismatch`);
    }
    if (row.runtimeVisible !== true) throw new TypeError(`frameRows[${index}].runtimeVisible must be true`);
    if (!GRADES.has(row.grade)) throw new TypeError(`frameRows[${index}].grade mismatch`);
    assertSha256(row.sourceModuleHash, `frameRows[${index}].sourceModuleHash`);
    if (row.provenanceType !== "RUNTIME_NATURAL_ITEM") throw new TypeError(`frameRows[${index}].provenanceType mismatch`);
    if (row.serializationStatus !== "SERIALIZED") throw new TypeError(`frameRows[${index}].serializationStatus mismatch`);
    try {
      assertProviderLocalizedRuntimeBundleV4(row);
    } catch (error) {
      throw new TypeError(`frameRows[${index}] must contain the complete protected LocalizedText runtime bundle: ${error.message}`);
    }
    if (Object.hasOwn(row, "locale") || row.rubric !== "MAIS_NATURAL_CA60_QA_RUBRIC_V4") {
      throw new TypeError(`frameRows[${index}] must use FULL_RUNTIME_LOCALIZED_BUNDLE and the frozen V4 rubric without an en-US shortcut`);
    }
    if (typeof row.answerPresent !== "boolean" || typeof row.optionsPresent !== "boolean"
      || typeof row.explanationPresent !== "boolean") {
      throw new TypeError(`frameRows[${index}] answer/options/explanation presence flags must be boolean`);
    }
    if (!Array.isArray(row.acceptedAnswers)) throw new TypeError(`frameRows[${index}].acceptedAnswers must be an array`);
    if (row.options !== null && !Array.isArray(row.options)) throw new TypeError(`frameRows[${index}].options must be an array or null`);
    const observedAnswerPresent = resolvedPrivateAnswerV4(row) !== null || row.acceptedAnswers.length > 0;
    const observedOptionsPresent = Array.isArray(row.options) && row.options.length > 0;
    const observedExplanationPresent = row.explanation !== null && row.explanation !== undefined;
    if (row.answerPresent !== observedAnswerPresent) throw new TypeError(`frameRows[${index}].answerPresent mismatch`);
    if (row.optionsPresent !== observedOptionsPresent) throw new TypeError(`frameRows[${index}].optionsPresent mismatch`);
    if (row.explanationPresent !== observedExplanationPresent) throw new TypeError(`frameRows[${index}].explanationPresent mismatch`);
    assertPipeSafe(row.homologyClusterId, `frameRows[${index}].homologyClusterId`);
    if (row.exactDuplicateGroupId !== calculateExactDuplicateGroupIdV3(row)) {
      throw new TypeError(`frameRows[${index}].exactDuplicateGroupId mismatch`);
    }
    if (row.normalizedPromptHash !== calculateNormalizedPromptHashV3(row)) {
      throw new TypeError(`frameRows[${index}].normalizedPromptHash mismatch`);
    }
    if (row.templateSkeletonHash !== calculateTemplateSkeletonHashV3(row)) {
      throw new TypeError(`frameRows[${index}].templateSkeletonHash mismatch`);
    }
    const expectedLineageKeyHash = calculateLineageKeyHashV3(row);
    if (row.lineageKeyHash !== expectedLineageKeyHash) throw new TypeError(`frameRows[${index}].lineageKeyHash mismatch`);
    if (!RESPONSE_FORMS.includes(row.responseForm) || !DIFFICULTIES.includes(row.difficulty)) {
      throw new TypeError(`frameRows[${index}] has an unfrozen stratum value`);
    }
    if (typeof row.eligible !== "boolean") throw new TypeError(`frameRows[${index}].eligible must be boolean`);
    if (row.eligible && row.exclusionCode !== null) throw new TypeError(`frameRows[${index}] eligible row must have null exclusionCode`);
    if (!row.eligible && !CLOSED_EXCLUSION_CODES.includes(row.exclusionCode)) {
      throw new TypeError(`frameRows[${index}] excluded row must have a frozen exclusionCode`);
    }
    if (row.eligible && row.egressEligibility !== "ELIGIBLE") throw new TypeError(`frameRows[${index}].egressEligibility mismatch`);
    if (!row.eligible && row.egressEligibility !== "INELIGIBLE_CLOSED_EXCLUSION") {
      throw new TypeError(`frameRows[${index}].egressEligibility mismatch`);
    }
    assertObject(row.egressRights, `frameRows[${index}].egressRights`);
    for (const field of ["piiScreenPassed", "secretsScreenPassed", "copyrightExternalizationAuthorized", "providerEgressAllowed"]) {
      if (typeof row.egressRights[field] !== "boolean") throw new TypeError(`frameRows[${index}].egressRights.${field} must be boolean`);
    }
    if (row.eligible && Object.values(row.egressRights).some((value) => value !== true)) {
      throw new TypeError(`frameRows[${index}] eligible row requires complete egress rights`);
    }
    const hasStudentVisibleAsset = (row.diagram !== null && row.diagram !== undefined)
      || (row.questionAssets !== null && row.questionAssets !== undefined
        && (!Array.isArray(row.questionAssets) || row.questionAssets.length > 0));
    if (hasStudentVisibleAsset && row.eligible) {
      throw new TypeError(`frameRows[${index}] visual/asset content is not authorized for provider egress and must be a restricted exclusion`);
    }
    for (const field of ["inclusionProbability", "analysisWeight"]) {
      if (!Number.isFinite(row[field]) || row[field] < 0) throw new TypeError(`frameRows[${index}].${field} must be finite and nonnegative`);
    }
    if (typeof row.clusterRepresentative !== "boolean") throw new TypeError(`frameRows[${index}].clusterRepresentative must be boolean`);
    if (row.assignedClusterStratum !== null && !STRATA.includes(row.assignedClusterStratum)) {
      throw new TypeError(`frameRows[${index}].assignedClusterStratum mismatch`);
    }
    for (const field of ["clusterInclusionProbability", "representativeSelectionProbability"]) {
      if (!Number.isFinite(row[field]) || row[field] < 0 || row[field] > 1) {
        throw new TypeError(`frameRows[${index}].${field} must be a probability`);
      }
    }
    if (typeof row.analysisWeightPurpose !== "string" || row.analysisWeightPurpose.length === 0) {
      throw new TypeError(`frameRows[${index}].analysisWeightPurpose is required`);
    }
    if (runtimeConfigHash !== null && row.runtimeConfigHash !== runtimeConfigHash) throw new TypeError(`frameRows[${index}] runtimeConfigHash mismatch`);
    if (sourceCommit !== null && row.sourceCommit !== sourceCommit) throw new TypeError(`frameRows[${index}] sourceCommit mismatch`);
    if (itemIds.has(row.itemId)) throw new TypeError(`duplicate frame itemId ${row.itemId}`);
    itemIds.add(row.itemId);
    if (row.rowHash !== calculateArtifactHash(row, "rowHash")) throw new TypeError(`frameRows[${index}] rowHash mismatch`);
  }
}

function computeHomologyGraph(frameRows) {
  const parent = frameRows.map((_, index) => index);
  const find = (value) => {
    let cursor = value;
    while (parent[cursor] !== cursor) cursor = parent[cursor];
    while (parent[value] !== value) {
      const next = parent[value];
      parent[value] = cursor;
      value = next;
    }
    return cursor;
  };
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[Math.max(leftRoot, rightRoot)] = Math.min(leftRoot, rightRoot);
  };
  const firstByExactHash = new Map();
  const firstByTemplateHash = new Map();
  const firstByLineageHash = new Map();
  const edges = [];
  for (const [index, row] of frameRows.entries()) {
    const exactHash = calculateExactContentHashV3(row);
    const first = firstByExactHash.get(exactHash);
    if (first === undefined) firstByExactHash.set(exactHash, index);
    else {
      union(first, index);
      edges.push({
        edgeType: "EXACT",
        leftItemId: frameRows[first].itemId,
        rightItemId: row.itemId,
        evidenceHash: exactHash,
      });
    }
    const templateHash = calculateTemplateSkeletonHashV3(row);
    const firstTemplate = firstByTemplateHash.get(templateHash);
    if (firstTemplate === undefined) firstByTemplateHash.set(templateHash, index);
    else {
      union(firstTemplate, index);
      edges.push({
        edgeType: "TEMPLATE",
        leftItemId: frameRows[firstTemplate].itemId,
        rightItemId: row.itemId,
        evidenceHash: templateHash,
      });
    }
    const lineageHash = calculateLineageKeyHashV3(row);
    if (lineageHash !== null) {
      const firstLineage = firstByLineageHash.get(lineageHash);
      if (firstLineage === undefined) firstByLineageHash.set(lineageHash, index);
      else {
        union(firstLineage, index);
        edges.push({
          edgeType: "SOURCE",
          leftItemId: frameRows[firstLineage].itemId,
          rightItemId: row.itemId,
          evidenceHash: lineageHash,
        });
      }
    }
  }
  const nearBuckets = new Map();
  for (const [index, row] of frameRows.entries()) {
    const key = canonicalJson([row.responseForm, row.canonicalTopic]);
    const bucket = nearBuckets.get(key) ?? [];
    bucket.push({ index, normalized: normalizePromptForNearV3(row.prompt) });
    nearBuckets.set(key, bucket);
  }
  for (const bucket of nearBuckets.values()) {
    for (let leftPosition = 0; leftPosition < bucket.length; leftPosition += 1) {
      for (let rightPosition = leftPosition + 1; rightPosition < bucket.length; rightPosition += 1) {
        const left = bucket[leftPosition];
        const right = bucket[rightPosition];
        const trigramJaccard = trigramJaccardV3(left.normalized, right.normalized);
        if (trigramJaccard < 0.9) continue;
        const normalizedEditSimilarity = normalizedEditSimilarityV3(left.normalized, right.normalized);
        if (normalizedEditSimilarity < 0.92) continue;
        union(left.index, right.index);
        edges.push({
          edgeType: "NEAR",
          leftItemId: frameRows[left.index].itemId,
          rightItemId: frameRows[right.index].itemId,
          trigramJaccard,
          normalizedEditSimilarity,
          evidenceHash: sha256Hex(canonicalJson({
            leftNormalizedPromptHash: frameRows[left.index].normalizedPromptHash,
            rightNormalizedPromptHash: frameRows[right.index].normalizedPromptHash,
            trigramJaccard,
            normalizedEditSimilarity,
          })),
        });
      }
    }
  }
  const membersByRoot = new Map();
  for (const [index, row] of frameRows.entries()) {
    const root = find(index);
    const members = membersByRoot.get(root) ?? [];
    members.push(row);
    membersByRoot.set(root, members);
  }
  const clusterToRoot = new Map();
  const eligibleFrameCount = frameRows.filter((row) => row.eligible).length;
  for (const [root, members] of membersByRoot.entries()) {
    const assigned = new Set(members.map((row) => row.homologyClusterId));
    if (assigned.size !== 1) {
      throw new TypeError("exact/template/near/source connected component is assigned to different homology clusters");
    }
    const [clusterId] = assigned;
    const priorRoot = clusterToRoot.get(clusterId);
    if (priorRoot !== undefined && priorRoot !== root) {
      throw new TypeError(`homology cluster ${clusterId} spans disconnected components`);
    }
    clusterToRoot.set(clusterId, root);
    const eligibleMembers = members.filter((row) => row.eligible);
    const eligibleShare = eligibleFrameCount === 0 ? 0 : eligibleMembers.length / eligibleFrameCount;
    if (eligibleShare > 0.05) {
      throw new TypeError(`oversized homology component ${clusterId} has >5% of the eligible frame`);
    }
    const canonicalTopics = new Set(eligibleMembers.map((row) => row.canonicalTopic));
    if (canonicalTopics.size > 2) {
      throw new TypeError(`homology component ${clusterId} bridge spans more than two canonical topics`);
    }
  }
  return {
    edges: edges.sort((left, right) => codePointCompare(left.leftItemId, right.leftItemId)
      || codePointCompare(left.rightItemId, right.rightItemId)
      || codePointCompare(left.edgeType, right.edgeType)),
    components: [...membersByRoot.values()].map((members) => ({
      clusterId: members[0].homologyClusterId,
      itemIds: members.map((row) => row.itemId).sort(codePointCompare),
      eligibleItemCount: members.filter((row) => row.eligible).length,
      eligibleFrameShare: eligibleFrameCount === 0 ? 0 : members.filter((row) => row.eligible).length / eligibleFrameCount,
      canonicalTopics: [...new Set(members.filter((row) => row.eligible).map((row) => row.canonicalTopic))].sort(codePointCompare),
    })).sort((left, right) => codePointCompare(left.clusterId, right.clusterId)),
  };
}

function frameTuples(frameRows) {
  return frameRows.map((row) => [
    row.itemId,
    row.itemHash,
    row.homologyClusterId,
    row.rowHash,
    row.eligible,
  ]).sort((left, right) => (
    codePointCompare(left[0], right[0])
      || codePointCompare(left[1], right[1])
      || codePointCompare(left[2], right[2])
      || codePointCompare(left[3], right[3])
      || Number(left[4]) - Number(right[4])
  ));
}

/** Physical root of the complete protected frame, including excluded rows. */
export function calculateFrameRowsRootV3(frameRows) {
  if (!Array.isArray(frameRows)) throw new TypeError("frameRows must be an array");
  return sha256Hex(canonicalJson(frameTuples(frameRows)));
}

/** Stable selection root: timestamps, self-hashes, and derived sampling weights are deliberately excluded. */
export function calculateFrameSelectionContentRootV3(frameRows) {
  if (!Array.isArray(frameRows)) throw new TypeError("frameRows must be an array");
  const leaves = frameRows.map((row, index) => {
    assertObject(row, `frameRows[${index}]`);
    const {
      frameFrozenAt: _frameFrozenAt,
      rowHash: _rowHash,
      inclusionProbability: _inclusionProbability,
      analysisWeight: _analysisWeight,
      clusterInclusionProbability: _clusterInclusionProbability,
      representativeSelectionProbability: _representativeSelectionProbability,
      clusterRepresentative: _clusterRepresentative,
      assignedClusterStratum: _assignedClusterStratum,
      analysisWeightPurpose: _analysisWeightPurpose,
      ...selectionContent
    } = row;
    return selectionContent;
  }).sort((left, right) => codePointCompare(left.itemId, right.itemId));
  return sha256Hex(canonicalJson(leaves));
}

/** Physical root of the 60 selected item/cluster tuples; never a self-hash. */
export function calculateManifestTupleRootV3(selectedRows) {
  if (!Array.isArray(selectedRows)) throw new TypeError("selectedRows must be an array");
  const tuples = selectedRows.map((row, index) => {
    assertObject(row, `selectedRows[${index}]`);
    assertPipeSafe(row.itemId, `selectedRows[${index}].itemId`);
    assertSha256(row.itemHash, `selectedRows[${index}].itemHash`);
    assertPipeSafe(row.clusterId, `selectedRows[${index}].clusterId`);
    return [row.itemId, row.itemHash, row.clusterId];
  }).sort((left, right) => (
    codePointCompare(left[0], right[0])
      || codePointCompare(left[1], right[1])
      || codePointCompare(left[2], right[2])
  ));
  return sha256Hex(canonicalJson(tuples));
}

export function sampleSelectionDigestPreimageV3({ designHash, frameHash, algorithmVersion, stratum, clusterId, itemHash }) {
  assertSha256(designHash, "designHash");
  assertSha256(frameHash, "frameHash");
  assertSha256(itemHash, "itemHash");
  if (algorithmVersion !== SAMPLE_ALGORITHM_VERSION) throw new TypeError("algorithmVersion must equal the frozen sample algorithm version");
  if (!STRATA.includes(stratum)) throw new TypeError("stratum must be one of the frozen nine cells");
  assertNonEmptyString(clusterId, "clusterId");
  return [designHash, frameHash, algorithmVersion, stratum, clusterId, itemHash];
}

export function selectionDigestV3(input) {
  return sha256Hex(canonicalJson(sampleSelectionDigestPreimageV3(input)));
}

export function calculateSampleSelectionContentRootV3(sampleManifest) {
  assertObject(sampleManifest, "sampleManifest");
  return sha256Hex(canonicalJson({
    designId: sampleManifest.designId,
    registrationHash: sampleManifest.registrationHash,
    frameSelectionContentRootHash: sampleManifest.frameSelectionContentRootHash,
    clusterAuditSelectionContentHash: sampleManifest.clusterAuditSelectionContentHash,
    algorithmVersion: sampleManifest.algorithmVersion,
    algorithmHash: sampleManifest.algorithmHash,
    selectionFormula: sampleManifest.selectionFormula,
    allocationMethod: sampleManifest.allocationMethod,
    stratumAllocations: sampleManifest.stratumAllocations,
    hamiltonAudit: sampleManifest.hamiltonAudit,
    selectedRows: sampleManifest.selectedRows.map(({ itemIdPseudonym: _itemIdPseudonym, ...selectionRow }) => selectionRow),
    secondaryEstimand: sampleManifest.secondaryEstimand,
    representativeSelectionRule: sampleManifest.representativeSelectionRule,
    secondaryWeightSummary: sampleManifest.secondaryWeightSummary,
    registeredPreResultExclusions: (sampleManifest.registeredPreResultExclusions ?? []).map(({
      registeredAt: _registeredAt,
      ...exclusion
    }) => exclusion),
    replacementHistory: (sampleManifest.replacementHistory ?? []).map((entry) => ({
      exclusionIndex: entry.exclusionIndex,
      removedItemId: entry.removedItemId,
      removedItemHash: entry.removedItemHash,
      exclusionCode: entry.exclusionCode,
      exclusionEvidenceHash: entry.exclusionEvidenceHash,
      replacementItemId: entry.replacementItemId,
      replacementItemHash: entry.replacementItemHash,
      replacementClusterId: entry.replacementClusterId,
      replacementStratum: entry.replacementStratum,
    })),
  }));
}

export function c0AuditSelectionDigestPreimageV3({
  registrationHash,
  sampleSelectionContentRootHash,
  algorithmVersion,
  stratum,
  clusterId,
  itemHash,
}) {
  assertSha256(registrationHash, "registrationHash");
  assertSha256(sampleSelectionContentRootHash, "sampleSelectionContentRootHash");
  assertSha256(itemHash, "itemHash");
  if (algorithmVersion !== C0_AUDIT_ALGORITHM_VERSION) throw new TypeError("algorithmVersion must equal the frozen C0 audit algorithm version");
  if (!STRATA.includes(stratum)) throw new TypeError("stratum must be one of the frozen nine cells");
  assertNonEmptyString(clusterId, "clusterId");
  return [registrationHash, sampleSelectionContentRootHash, algorithmVersion, stratum, clusterId, itemHash];
}

export function c0SelectionDigestV3(input) {
  return sha256Hex(canonicalJson(c0AuditSelectionDigestPreimageV3(input)));
}

function deriveClusters(frameRows, registrationHash, samplingFrameHash) {
  const grouped = new Map();
  for (const row of frameRows) {
    if (!row.eligible) continue;
    const members = grouped.get(row.homologyClusterId) ?? [];
    members.push(row);
    grouped.set(row.homologyClusterId, members);
  }

  return [...grouped.entries()].map(([clusterId, members]) => {
    const ranked = members.map((row) => {
      const assignedStratum = stratumFor(row);
      return {
        row,
        assignedStratum,
        selectionDigest: selectionDigestV3({
          designHash: registrationHash,
          frameHash: samplingFrameHash,
          algorithmVersion: SAMPLE_ALGORITHM_VERSION,
          stratum: assignedStratum,
          clusterId,
          itemHash: row.itemHash,
        }),
      };
    }).sort((left, right) => (
      codePointCompare(left.selectionDigest, right.selectionDigest)
        || codePointCompare(left.row.itemId, right.row.itemId)
    ));
    const representative = ranked[0];
    return {
      clusterId,
      assignedStratum: representative.assignedStratum,
      representativeItemId: representative.row.itemId,
      representativeItemHash: representative.row.itemHash,
      representativeSelectionDigest: representative.selectionDigest,
      members: [...members].sort((left, right) => codePointCompare(left.itemId, right.itemId)).map((row) => ({
        itemId: row.itemId,
        itemHash: row.itemHash,
        rowHash: row.rowHash,
        responseForm: row.responseForm,
        difficulty: row.difficulty,
      })),
    };
  }).sort((left, right) => codePointCompare(left.clusterId, right.clusterId));
}

export function buildClusterAuditV3(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "cluster audit input");
  const { frameRows, registrationHash, clusteringAlgorithmHash, auditedAt } = normalizedInput;
  validateFrameRows(frameRows, registrationHash);
  const itemPreflights = frameRows.map((row) => buildFrameItemPreflightV4(row));
  const itemPreflightFailures = itemPreflights.flatMap(({ frameFailureLedger }) => frameFailureLedger);
  assertFrameFailureLedgerEmptyV4(itemPreflightFailures);
  const anomalyLedger = itemPreflights.flatMap(({ anomalyLedger }) => anomalyLedger)
    .sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const anomalyLedgerRootHash = sha256Hex(canonicalJson(anomalyLedger.map(({ anomalyHash }) => anomalyHash).sort(codePointCompare)));
  assertSha256(clusteringAlgorithmHash, "clusteringAlgorithmHash");
  assertTimestamp(auditedAt, "auditedAt");
  const samplingFrameHash = calculateFrameRowsRootV3(frameRows);
  const frameSelectionContentRootHash = calculateFrameSelectionContentRootV3(frameRows);
  const homologyGraph = computeHomologyGraph(frameRows);
  const clusters = deriveClusters(frameRows, registrationHash, frameSelectionContentRootHash);
  validateDerivedFrameWeights(frameRows, registrationHash);
  const eligibleComponents = homologyGraph.components.filter((component) => component.eligibleItemCount > 0);
  const componentSizeCounts = new Map();
  for (const component of eligibleComponents) {
    componentSizeCounts.set(component.eligibleItemCount, (componentSizeCounts.get(component.eligibleItemCount) ?? 0) + 1);
  }
  const componentSizeDistribution = [...componentSizeCounts.entries()]
    .map(([eligibleItemCount, componentCount]) => ({ eligibleItemCount, componentCount }))
    .sort((left, right) => left.eligibleItemCount - right.eligibleItemCount);
  const largest20Components = [...eligibleComponents].sort((left, right) => (
    right.eligibleItemCount - left.eligibleItemCount || codePointCompare(left.clusterId, right.clusterId)
  )).slice(0, 20);
  const singletonCount = eligibleComponents.filter((component) => component.eligibleItemCount === 1).length;
  const crossCellComponentCount = eligibleComponents.filter((component) => component.canonicalTopics.length > 1).length;
  const clusterAuditSelectionContentHash = sha256Hex(canonicalJson({
    registrationHash,
    frameSelectionContentRootHash,
    clusteringAlgorithmHash,
    edges: homologyGraph.edges,
    connectedComponents: homologyGraph.components,
    anomalyLedgerRootHash,
    clusters: clusters.map((cluster) => ({
      ...cluster,
      members: cluster.members.map(({ rowHash: _rowHash, ...member }) => member),
    })),
  }));
  const artifact = {
    schemaVersion: "ClusterAuditV1",
    designId: DESIGN_ID,
    registrationHash,
    samplingFrameHash,
    frameSelectionContentRootHash,
    clusterAuditSelectionContentHash,
    clusteringAlgorithmHash,
    sampleAlgorithmVersion: SAMPLE_ALGORITHM_VERSION,
    sampleAlgorithmHash: SAMPLE_ALGORITHM_HASH,
    representativeSelectionFormula: SAMPLE_SELECTION_FORMULA,
    selectionDigestCanonicalization: SELECTION_DIGEST_CANONICALIZATION,
    selectionDigestByteEncoding: SELECTION_DIGEST_BYTE_ENCODING,
    selectionDigestFieldOrder: SAMPLE_SELECTION_DIGEST_FIELD_ORDER,
    selectionDesignHashSemantic: SAMPLE_SELECTION_DIGEST_CONTRACT.designHashSemantic,
    selectionFrameHashSemantic: SAMPLE_SELECTION_DIGEST_CONTRACT.frameHashSemantic,
    selectionGoldenVectorDigest: SAMPLE_SELECTION_GOLDEN_VECTOR.digest,
    auditedAt,
    frameRowCount: frameRows.length,
    eligibleRowCount: frameRows.filter((row) => row.eligible).length,
    eligibleClusterCount: clusters.length,
    singletonCount,
    singletonRate: eligibleComponents.length === 0 ? 0 : singletonCount / eligibleComponents.length,
    largest20Components,
    componentSizeDistribution,
    crossCellComponentCount,
    anomalyLedger,
    anomalyLedgerCount: anomalyLedger.length,
    anomalyLedgerRootHash,
    edgeCount: homologyGraph.edges.length,
    edges: homologyGraph.edges,
    connectedComponents: homologyGraph.components,
    clusters,
  };
  return calculateArtifact(artifact, "clusterAuditHash");
}

export function buildFrameRegistrationV3(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "frame registration input");
  const {
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    clusterAudit,
    registrationHash,
    runtimeConfigHash,
    sourceCommit,
    frozenAt,
    lineageRuleApprovalHash,
    trustedLineageRuleApprovalHash,
    trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash,
    frameFreezeEvidenceInput: explicitFrameFreezeEvidenceInput,
    frameFreezeEvidence: explicitFrameFreezeEvidence,
  } = normalizedInput;
  const frameFreezeEvidenceInput = explicitFrameFreezeEvidenceInput
    ?? runtimeExtractionSnapshot?.frameFreezeEvidenceInput;
  const frameFreezeEvidence = explicitFrameFreezeEvidence
    ?? runtimeExtractionSnapshot?.frameFreezeEvidence;
  if (!frameFreezeEvidenceInput || !frameFreezeEvidence) {
    throw new TypeError("complete frame freeze evidence with runtimeConfigEvidence, sourceParityEvidence, source manifest, rights, screen, and asset decisions is required; caller frameFailureLedger defaults are forbidden");
  }
  const expectedFrameFreezeEvidence = buildFrameFreezeEvidenceV4({
    ...frameFreezeEvidenceInput,
    frameRows,
  });
  if (!canonicalEqual(frameFreezeEvidence, expectedFrameFreezeEvidence)) {
    throw new TypeError("frameFreezeEvidence mismatch after complete protected evidence recomputation");
  }
  assertSha256(trustedRouteExecutionRootHash, "frame registration out-of-band trusted route execution root");
  if (frameFreezeEvidence.trustedRouteExecutionRootHash !== trustedRouteExecutionRootHash
    || runtimeExtractionSnapshot?.trustedRouteExecutionRootHash !== trustedRouteExecutionRootHash) {
    throw new TypeError("frame registration source parity evidence is not bound to the independent out-of-band route execution root");
  }
  assertSha256(trustedDependencyClosureRootHash, "frame registration out-of-band trusted dependency-closure root");
  if (frameFreezeEvidence.trustedDependencyClosureRootHash !== trustedDependencyClosureRootHash
    || runtimeExtractionSnapshot?.trustedDependencyClosureRootHash !== trustedDependencyClosureRootHash) {
    throw new TypeError("frame registration transitive manifest is not bound to the independent out-of-band dependency-closure root");
  }
  assertSha256(trustedOwnerApprovalRootHash, "frame registration out-of-band trusted owner approval root");
  if (frameFreezeEvidence.trustedOwnerApprovalRootHash !== trustedOwnerApprovalRootHash
    || runtimeExtractionSnapshot?.trustedOwnerApprovalRootHash !== trustedOwnerApprovalRootHash) {
    throw new TypeError("frame registration rights evidence is not bound to the independent out-of-band owner approval root");
  }
  assertFrameFailureLedgerEmptyV4(expectedFrameFreezeEvidence.frameFailureLedger);
  if (Object.hasOwn(normalizedInput, "frameFailureLedger")) {
    throw new TypeError("caller-supplied frameFailureLedger is forbidden; frame failures are derived internally from protected evidence");
  }
  const lineageApprovalErrors = validateLineageRuleApprovalV4({
    lineageRuleApprovalHash,
    approvedRuleHash: LINEAGE_RULE_HASH_V4,
  }, { trustedOwnerApprovalHash: trustedLineageRuleApprovalHash });
  if (lineageApprovalErrors.length > 0) throw new TypeError(lineageApprovalErrors.join("; "));
  validateFrameRows(frameRows, registrationHash, { runtimeConfigHash, sourceCommit });
  validateRuntimeSnapshotAgainstRows(frameRows, runtimeExtractionSnapshot);
  validateCleanSourceEvidence(cleanSourceEvidence, sourceCommit);
  if (runtimeExtractionSnapshot.registrationHash !== registrationHash
    || runtimeExtractionSnapshot.runtimeConfigHash !== runtimeConfigHash
    || runtimeExtractionSnapshot.sourceCommit !== sourceCommit) {
    throw new TypeError("runtime extraction snapshot root tuple mismatch");
  }
  if (runtimeExtractionSnapshot.serializationFailureCount !== 0) {
    throw new TypeError("unresolved runtime-visible serialization failure ledger blocks frame freeze");
  }
  assertObject(clusterAudit, "clusterAudit");
  assertTimestamp(frozenAt, "frozenAt");
  const frameFrozenMs = timestampMillis(frozenAt, "frozenAt");
  for (const [completedAt, label] of [
    [expectedFrameFreezeEvidence.routeExecutionCompletedAt, "route execution completion"],
    [expectedFrameFreezeEvidence.dependencyClosureCompletedAt, "dependency-closure completion"],
    [expectedFrameFreezeEvidence.scannerExecutionCompletedAt, "scanner execution completion"],
  ]) {
    assertTimestamp(completedAt, `${label} time`);
    if (timestampMillis(completedAt, `${label} time`) >= frameFrozenMs) {
      throw new TypeError(`${label} must strictly precede frame freeze`);
    }
  }
  if (timestampMillis(runtimeExtractionSnapshot.extractedAt, "runtimeExtractionSnapshot.extractedAt") >= frameFrozenMs
    || timestampMillis(cleanSourceEvidence.verifiedAt, "cleanSourceEvidence.verifiedAt") >= frameFrozenMs
    || timestampMillis(clusterAudit.auditedAt, "clusterAudit.auditedAt") >= frameFrozenMs) {
    throw new TypeError("runtime extraction, source evidence, and cluster audit must precede frame freeze");
  }
  const expectedAudit = buildClusterAuditV3({
    frameRows,
    registrationHash,
    clusteringAlgorithmHash: clusterAudit.clusteringAlgorithmHash,
    auditedAt: clusterAudit.auditedAt,
  });
  if (!canonicalEqual(clusterAudit, expectedAudit)) throw new TypeError("cluster audit does not match the full protected frame");
  if (clusterAudit.anomalyLedgerRootHash !== expectedFrameFreezeEvidence.anomalyLedgerRootHash) {
    throw new TypeError("cluster/frame anomaly ledger root mismatch");
  }
  const samplingFrameHash = calculateFrameRowsRootV3(frameRows);
  const frameSelectionContentRootHash = calculateFrameSelectionContentRootV3(frameRows);
  const artifact = {
    schemaVersion: "FrameRegistrationV2",
    designId: DESIGN_ID,
    registrationHash,
    region: "CALIFORNIA",
    curriculumProfile: "US_CA_MATH",
    runtimeOrigin: "QUESTION_STORE_AUTHENTICATED_STUDENT_PROJECTION",
    runtimeVisibleOnly: true,
    responseForms: RESPONSE_FORMS,
    difficulties: DIFFICULTIES,
    closedExclusionCodes: CLOSED_EXCLUSION_CODES,
    egressPopulationClaim: "EGRESS_ELIGIBLE_SUBPOPULATION_ONLY",
    runtimeConfigHash,
    runtimeConfigEvidenceHash: expectedFrameFreezeEvidence.runtimeConfigHash,
    sourceParityEvidenceHash: expectedFrameFreezeEvidence.sourceParityEvidenceHash,
    sourceModuleManifestHash: expectedFrameFreezeEvidence.sourceModuleManifestHash,
    sourceModuleHash: expectedFrameFreezeEvidence.sourceModuleHash,
    routeExecutionCompletedAt: expectedFrameFreezeEvidence.routeExecutionCompletedAt,
    dependencyClosureCompletedAt: expectedFrameFreezeEvidence.dependencyClosureCompletedAt,
    scannerExecutionCompletedAt: expectedFrameFreezeEvidence.scannerExecutionCompletedAt,
    trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash,
    rightsDecisionTableHash: expectedFrameFreezeEvidence.rightsDecisionTableHash,
    trustedOwnerApprovalRootHash,
    frameFreezeEvidenceHash: expectedFrameFreezeEvidence.frameFreezeEvidenceHash,
    frameFailureLedgerRootHash: expectedFrameFreezeEvidence.frameFailureLedgerRootHash,
    frameAnomalyLedgerRootHash: expectedFrameFreezeEvidence.anomalyLedgerRootHash,
    sourceCommit,
    frozenAt,
    freezeSequence: 1,
    predecessorArtifactHash: clusterAudit.clusterAuditHash,
    samplingFrameHash,
    frameSelectionContentRootHash,
    frameTupleRootFormula: "SHA256(JCS(SORTED([itemId,itemHash,homologyClusterId,rowHash,eligible])))",
    frameRowCount: frameRows.length,
    eligibleRowCount: frameRows.filter((row) => row.eligible).length,
    excludedRowCount: frameRows.filter((row) => !row.eligible).length,
    eligibleClusterCount: clusterAudit.clusters.length,
    clusterAuditHash: clusterAudit.clusterAuditHash,
    clusterAuditSelectionContentHash: clusterAudit.clusterAuditSelectionContentHash,
    runtimeExtractionSnapshotHash: runtimeExtractionSnapshot.runtimeExtractionSnapshotHash,
    sourceEnumerationReceiptHash: runtimeExtractionSnapshot.runtimeSourceEnumerationReceiptHash,
    sourceEnumerationEvidenceContractHash: runtimeExtractionSnapshot.sourceEnumerationEvidenceContractHash,
    fullSourceEnumerationRootHash: runtimeExtractionSnapshot.fullSourceEnumerationRootHash,
    rawEvidenceArtifactRootHash: runtimeExtractionSnapshot.rawEvidenceArtifactRootHash,
    extractorImplementationHash: runtimeExtractionSnapshot.extractorImplementationHash,
    extractorRunnerCommit: runtimeExtractionSnapshot.extractorRunnerCommit,
    extractorRunnerHash: runtimeExtractionSnapshot.extractorRunnerHash,
    sourceEnumeratedAt: runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt.enumeratedAt,
    runtimeExtractedAt: runtimeExtractionSnapshot.extractedAt,
    sourceItemCount: runtimeExtractionSnapshot.sourceItemCount,
    runtimeVisibleItemCount: runtimeExtractionSnapshot.runtimeVisibleItemCount,
    eligibleRuntimeItemCount: runtimeExtractionSnapshot.eligibleItemCount,
    restrictedRuntimeItemCount: runtimeExtractionSnapshot.restrictedItemCount,
    sourceExclusionCount: runtimeExtractionSnapshot.sourceExclusionCount,
    exclusionCounts: runtimeExtractionSnapshot.exclusionCounts,
    gradeProjectionSummary: runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt.gradeProjectionInvocations.map((invocation) => ({
      grade: invocation.grade,
      invocationSequenceNumber: invocation.invocationSequenceNumber,
      sourceItemCount: invocation.sourceItemCount,
      runtimeVisibleItemCount: invocation.runtimeVisibleItemCount,
      eligibleItemCount: invocation.eligibleItemCount,
      restrictedItemCount: invocation.restrictedItemCount,
      serializationFailureCount: invocation.serializationFailureCount,
      sourceExclusionCount: invocation.sourceExclusionCount,
      exclusionCounts: invocation.exclusionCounts,
      orderedItemRootHash: invocation.orderedItemRootHash,
      sourceModuleRootHash: invocation.sourceModuleRootHash,
      invocationLeafHash: invocation.invocationLeafHash,
    })),
    sourceExclusionLedgerRootHash: runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt.sourceExclusionLedgerRootHash,
    expectedRuntimeInventoryCount: runtimeExtractionSnapshot.expectedRuntimeInventoryCount,
    expectedInventoryRootHash: runtimeExtractionSnapshot.expectedInventoryRootHash,
    serializationFailureCount: 0,
    failureLedgerRootHash: runtimeExtractionSnapshot.failureLedgerRootHash,
    cleanSourceEvidenceHash: cleanSourceEvidence.sourceEvidenceHash,
    cleanSourceVerifiedAt: cleanSourceEvidence.verifiedAt,
    lineageRuleHash: LINEAGE_RULE_HASH_V4,
    lineageRuleApprovalHash,
  };
  return calculateArtifact(artifact, "frameRegistrationHash");
}

function assertFrameRegistrationInputs(
  frameRows,
  runtimeExtractionSnapshot,
  cleanSourceEvidence,
  frameRegistration,
  clusterAudit,
  trustedLineageRuleApprovalHash,
) {
  assertObject(frameRegistration, "frameRegistration");
  assertObject(clusterAudit, "clusterAudit");
  assertObject(runtimeExtractionSnapshot, "protected runtimeExtractionSnapshot");
  assertObject(cleanSourceEvidence, "protected cleanSourceEvidence");
  if (runtimeExtractionSnapshot.runtimeExtractionSnapshotHash !== frameRegistration.runtimeExtractionSnapshotHash) {
    throw new TypeError("protected runtime extraction snapshot hash does not match public frame registration root");
  }
  if (cleanSourceEvidence.sourceEvidenceHash !== frameRegistration.cleanSourceEvidenceHash) {
    throw new TypeError("protected clean source evidence hash does not match public frame registration root");
  }
  const expectedFrame = buildFrameRegistrationV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    clusterAudit,
    registrationHash: frameRegistration.registrationHash,
    runtimeConfigHash: frameRegistration.runtimeConfigHash,
    sourceCommit: frameRegistration.sourceCommit,
    frozenAt: frameRegistration.frozenAt,
    lineageRuleApprovalHash: frameRegistration.lineageRuleApprovalHash,
    trustedLineageRuleApprovalHash,
    trustedRouteExecutionRootHash: frameRegistration.trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash: frameRegistration.trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash: frameRegistration.trustedOwnerApprovalRootHash,
  });
  if (!canonicalEqual(frameRegistration, expectedFrame)) throw new TypeError("frame registration does not match the full protected frame");
}

function representativeRows(frameRows, clusterAudit) {
  const rowById = new Map(frameRows.map((row) => [row.itemId, row]));
  return clusterAudit.clusters.map((cluster) => {
    const row = rowById.get(cluster.representativeItemId);
    if (!row || !row.eligible || row.homologyClusterId !== cluster.clusterId) {
      throw new TypeError(`cluster ${cluster.clusterId} has no eligible representative in the full frame`);
    }
    return { cluster, row };
  });
}

function allocationRows(capacities, target, basePerNonempty) {
  return computeCapacityConstrainedHamilton(capacities, target, basePerNonempty);
}

function deriveFrameWeightPlan(frameRows, registrationHash, clusters = null) {
  const derivedClusters = clusters ?? deriveClusters(
    frameRows,
    registrationHash,
    calculateFrameSelectionContentRootV3(frameRows),
  );
  const byStratum = new Map(STRATA.map((stratum) => [stratum, []]));
  for (const cluster of derivedClusters) byStratum.get(cluster.assignedStratum).push(cluster);
  const capacities = STRATA.map((stratum) => byStratum.get(stratum).length);
  const hamilton = allocationRows(capacities, 60, 2);
  const allocationByStratum = new Map(STRATA.map((stratum, index) => [stratum, hamilton.finalAllocation[index]]));
  const capacityByStratum = new Map(STRATA.map((stratum, index) => [stratum, capacities[index]]));
  const plan = new Map();
  for (const cluster of derivedClusters) {
    const clusterInclusionProbability = allocationByStratum.get(cluster.assignedStratum)
      / capacityByStratum.get(cluster.assignedStratum);
    for (const member of cluster.members) {
      const clusterRepresentative = member.itemId === cluster.representativeItemId;
      const representativeSelectionProbability = clusterRepresentative ? 1 : 0;
      const inclusionProbability = clusterInclusionProbability * representativeSelectionProbability;
      plan.set(member.itemId, {
        assignedClusterStratum: cluster.assignedStratum,
        clusterRepresentative,
        clusterInclusionProbability,
        representativeSelectionProbability,
        inclusionProbability,
        analysisWeight: clusterRepresentative ? 1 / clusterInclusionProbability : 0,
        analysisWeightPurpose: clusterRepresentative
          ? "SECONDARY_CLUSTER_REPRESENTATIVE_INVENTORY_IPW"
          : "OUTSIDE_SECONDARY_ESTIMAND_NONREPRESENTATIVE",
      });
    }
  }
  return { plan, hamilton, capacities };
}

export function materializeFrameSamplingWeightsV3(frameRowsInput, registrationHashInput) {
  const frameRows = canonicalizeStrictItemJsonV4(frameRowsInput);
  const registrationHash = canonicalizeStrictItemJsonV4(registrationHashInput);
  validateFrameRows(frameRows, registrationHash);
  computeHomologyGraph(frameRows);
  const clusters = deriveClusters(frameRows, registrationHash, calculateFrameSelectionContentRootV3(frameRows));
  const { plan } = deriveFrameWeightPlan(frameRows, registrationHash, clusters);
  return frameRows.map((row) => {
    const clone = structuredClone(row);
    const expected = row.eligible ? plan.get(row.itemId) : {
      assignedClusterStratum: null,
      clusterRepresentative: false,
      clusterInclusionProbability: 0,
      representativeSelectionProbability: 0,
      inclusionProbability: 0,
      analysisWeight: 0,
      analysisWeightPurpose: "EXCLUDED_FROM_ALL_ESTIMANDS",
    };
    Object.assign(clone, expected);
    clone.rowHash = calculateArtifactHash(clone, "rowHash");
    return clone;
  });
}

function validateDerivedFrameWeights(frameRows, registrationHash) {
  const expectedRows = materializeFrameSamplingWeightsV3(frameRows, registrationHash);
  for (const [index, row] of frameRows.entries()) {
    for (const field of [
      "assignedClusterStratum",
      "clusterRepresentative",
      "clusterInclusionProbability",
      "representativeSelectionProbability",
      "inclusionProbability",
      "analysisWeight",
      "analysisWeightPurpose",
    ]) {
      if (row[field] !== expectedRows[index][field]) {
        throw new TypeError(`frameRows[${index}] secondary weighting ${field} mismatch`);
      }
    }
  }
}

export function calculateKishEffectiveSampleSizeV3(weights) {
  if (!Array.isArray(weights) || weights.length === 0
    || weights.some((weight) => !Number.isFinite(weight) || weight <= 0)) {
    throw new TypeError("Kish weights must be a nonempty array of finite positive numbers");
  }
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const sumSquares = weights.reduce((total, weight) => total + (weight ** 2), 0);
  return (sum ** 2) / sumSquares;
}

const EXECUTION_LEDGER_EVENT_TYPES_V4 = Object.freeze([
  "PROVIDER_ATTEMPT",
  "REFERENCE_LABEL_RECORDED",
  "EVALUATION_RESULT_RECORDED",
  "PRE_RESULT_REPLACEMENT_REGISTERED",
]);

export function buildSampleExecutionLedgerV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "sample execution ledger input");
  const allowedFields = new Set([
    "sampleManifestHash",
    "previousExecutionLedgerHash",
    "recorderImplementationHash",
    "recorderRunnerReceiptHash",
    "recordedAt",
    "entries",
  ]);
  const unknownFields = Object.keys(normalizedInput).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) throw new TypeError(`sample execution ledger contains unknown fields: ${unknownFields.join(", ")}`);
  const {
    sampleManifestHash,
    previousExecutionLedgerHash,
    recorderImplementationHash,
    recorderRunnerReceiptHash,
    recordedAt,
    entries,
  } = normalizedInput;
  assertSha256(sampleManifestHash, "sampleExecutionLedger.sampleManifestHash");
  if (previousExecutionLedgerHash !== null) assertSha256(previousExecutionLedgerHash, "sampleExecutionLedger.previousExecutionLedgerHash");
  assertSha256(recorderImplementationHash, "sampleExecutionLedger.recorderImplementationHash");
  assertSha256(recorderRunnerReceiptHash, "sampleExecutionLedger.recorderRunnerReceiptHash");
  assertTimestamp(recordedAt, "sampleExecutionLedger.recordedAt");
  if (!Array.isArray(entries)) throw new TypeError("sample execution ledger entries must be an array");
  const normalizedEntries = entries.map((entry, index) => {
    assertObject(entry, `sampleExecutionLedger.entries[${index}]`);
    const expectedSequenceNumber = index + 1;
    if (entry.sequenceNumber !== expectedSequenceNumber) {
      throw new TypeError("sample execution ledger sequence must be contiguous and append-only");
    }
    if (!EXECUTION_LEDGER_EVENT_TYPES_V4.includes(entry.eventType)) {
      throw new TypeError(`sample execution ledger eventType ${String(entry.eventType)} is outside the closed set`);
    }
    if (entry.itemId !== null) assertPipeSafe(entry.itemId, `sampleExecutionLedger.entries[${index}].itemId`);
    if (entry.itemHash !== null) assertSha256(entry.itemHash, `sampleExecutionLedger.entries[${index}].itemHash`);
    assertSha256(entry.eventArtifactHash, `sampleExecutionLedger.entries[${index}].eventArtifactHash`);
    assertTimestamp(entry.occurredAt, `sampleExecutionLedger.entries[${index}].occurredAt`);
    if (index > 0 && timestampMillis(entry.occurredAt, `sampleExecutionLedger.entries[${index}].occurredAt`)
      < timestampMillis(entries[index - 1].occurredAt, `sampleExecutionLedger.entries[${index - 1}].occurredAt`)) {
      throw new TypeError("sample execution ledger occurredAt chronology must be monotonic and nondecreasing");
    }
    if (timestampMillis(entry.occurredAt, `sampleExecutionLedger.entries[${index}].occurredAt`)
      > timestampMillis(recordedAt, "sampleExecutionLedger.recordedAt")) {
      throw new TypeError("sample execution ledger cannot record a future event");
    }
    const expectedEntry = calculateArtifact({
      schemaVersion: "SampleExecutionLedgerEntryV1",
      sequenceNumber: expectedSequenceNumber,
      eventType: entry.eventType,
      itemId: entry.itemId,
      itemHash: entry.itemHash,
      eventArtifactHash: entry.eventArtifactHash,
      occurredAt: entry.occurredAt,
    }, "entryHash");
    if (!canonicalEqual(entry, expectedEntry)) {
      throw new TypeError(`sample execution ledger entry ${expectedSequenceNumber} self-hash or closed shape mismatch`);
    }
    return expectedEntry;
  });
  return calculateArtifact({
    schemaVersion: "SampleExecutionLedgerV1",
    designId: DESIGN_ID,
    sampleManifestHash,
    previousExecutionLedgerHash,
    recorderImplementationHash,
    recorderRunnerReceiptHash,
    recordedAt,
    entries: normalizedEntries,
    entryCount: normalizedEntries.length,
    entryRootHash: sha256Hex(canonicalJson(normalizedEntries.map((entry) => entry.entryHash))),
    appendOnly: true,
  }, "executionLedgerHash");
}

export function buildPreResultExclusionRunnerReceiptV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "pre-result exclusion runner receipt input");
  const allowedFields = new Set([
    "itemId",
    "itemHash",
    "exclusionCode",
    "reasonCode",
    "registeredAt",
    "exclusionSourceArtifactHash",
    "issuerImplementationHash",
    "runnerCommit",
    "runnerHash",
    "executedAt",
  ]);
  const unknownFields = Object.keys(normalizedInput).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) throw new TypeError(`pre-result exclusion runner receipt contains unknown fields: ${unknownFields.join(", ")}`);
  const {
    itemId,
    itemHash,
    exclusionCode,
    reasonCode,
    registeredAt,
    exclusionSourceArtifactHash,
    issuerImplementationHash,
    runnerCommit,
    runnerHash,
    executedAt,
  } = normalizedInput;
  if (!["RESTRICTED_EGRESS_CONTENT", "UNSTABLE_SERIALIZATION"].includes(exclusionCode)) {
    throw new TypeError("pre-result exclusion runner receipt is limited to egress or serialization exclusions");
  }
  assertPipeSafe(itemId, "pre-result exclusion runner itemId");
  assertSha256(itemHash, "pre-result exclusion runner itemHash");
  assertPipeSafe(reasonCode, "pre-result exclusion reasonCode");
  assertTimestamp(registeredAt, "pre-result exclusion registeredAt");
  assertSha256(exclusionSourceArtifactHash, "pre-result exclusion source artifact hash");
  assertSha256(issuerImplementationHash, "pre-result exclusion issuer implementation hash");
  assertSourceCommit(runnerCommit);
  assertSha256(runnerHash, "pre-result exclusion runner hash");
  assertTimestamp(executedAt, "pre-result exclusion runner executedAt");
  if (timestampMillis(registeredAt, "pre-result exclusion registeredAt")
    > timestampMillis(executedAt, "pre-result exclusion runner executedAt")) {
    throw new TypeError("pre-result exclusion runner cannot execute before exclusion registration");
  }
  return calculateArtifact({
    schemaVersion: "PreResultExclusionRunnerReceiptV1",
    designId: DESIGN_ID,
    itemId,
    itemHash,
    exclusionCode,
    reasonCode,
    registeredAt,
    exclusionSourceArtifactHash,
    issuerImplementationHash,
    runnerCommit,
    runnerHash,
    executedAt,
  }, "exclusionRunnerReceiptHash");
}

function validatePreResultExclusionRunnerReceiptV4(receipt) {
  assertObject(receipt, "pre-result exclusion runner receipt");
  if (!artifactHashMatches(receipt, "exclusionRunnerReceiptHash")) {
    throw new TypeError("pre-result exclusion runner receipt self-hash mismatch");
  }
  const expected = buildPreResultExclusionRunnerReceiptV4({
    itemId: receipt.itemId,
    itemHash: receipt.itemHash,
    exclusionCode: receipt.exclusionCode,
    reasonCode: receipt.reasonCode,
    registeredAt: receipt.registeredAt,
    exclusionSourceArtifactHash: receipt.exclusionSourceArtifactHash,
    issuerImplementationHash: receipt.issuerImplementationHash,
    runnerCommit: receipt.runnerCommit,
    runnerHash: receipt.runnerHash,
    executedAt: receipt.executedAt,
  });
  if (!canonicalEqual(receipt, expected)) throw new TypeError("pre-result exclusion runner receipt closed shape mismatch");
  return expected;
}

export function buildPreResultExclusionEvidenceV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "pre-result exclusion evidence input");
  const allowedFields = new Set([
    "exclusionSourceArtifact",
    "egressDecisionInput",
    "exclusionCode",
    "reasonCode",
    "registeredAt",
    "exclusionRunnerReceipt",
  ]);
  const unknownFields = Object.keys(normalizedInput).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) throw new TypeError(`pre-result exclusion evidence contains unknown fields: ${unknownFields.join(", ")}`);
  const {
    exclusionSourceArtifact,
    egressDecisionInput = null,
    exclusionCode,
    reasonCode,
    registeredAt,
    exclusionRunnerReceipt,
  } = normalizedInput;
  if (!["RESTRICTED_EGRESS_CONTENT", "UNSTABLE_SERIALIZATION"].includes(exclusionCode)) {
    throw new TypeError("pre-result exclusion evidence is limited to egress or serialization exclusions");
  }
  assertPipeSafe(reasonCode, "pre-result exclusion reasonCode");
  assertTimestamp(registeredAt, "pre-result exclusion registeredAt");
  assertObject(exclusionSourceArtifact, "immutable exclusion source artifact");
  let sourceArtifactHash;
  if (exclusionCode === "RESTRICTED_EGRESS_CONTENT") {
    assertObject(egressDecisionInput, "complete frame item egress decision input");
    const recomputedEgressDecision = buildFrameItemEgressDecisionV4(egressDecisionInput);
    if (!canonicalEqual(exclusionSourceArtifact, recomputedEgressDecision)
      || exclusionSourceArtifact.schemaVersion !== "FrameItemEgressDecisionV3"
      || !artifactHashMatches(exclusionSourceArtifact, "itemEgressDecisionHash")
      || exclusionSourceArtifact.eligible !== false
      || exclusionSourceArtifact.exclusionCode !== exclusionCode
      || !Array.isArray(exclusionSourceArtifact.exclusionReasonCodes)
      || !exclusionSourceArtifact.exclusionReasonCodes.includes(reasonCode)) {
      throw new TypeError("immutable egress exclusion artifact does not bind the exact item, reason, and closed disposition");
    }
    sourceArtifactHash = exclusionSourceArtifact.itemEgressDecisionHash;
  } else {
    if (egressDecisionInput !== null) {
      throw new TypeError("serialization exclusion evidence must not carry an egress decision input");
    }
    if (exclusionSourceArtifact.schemaVersion !== "RuntimeSerializationFailureEvidenceV1"
      || !artifactHashMatches(exclusionSourceArtifact, "serializationFailureEvidenceHash")
      || exclusionSourceArtifact.exclusionCode !== exclusionCode
      || exclusionSourceArtifact.reasonCode !== reasonCode) {
      throw new TypeError("immutable serialization exclusion artifact does not bind the exact item, reason, and closed disposition");
    }
    sourceArtifactHash = exclusionSourceArtifact.serializationFailureEvidenceHash;
  }
  assertPipeSafe(exclusionSourceArtifact.itemId, "immutable exclusion itemId");
  assertSha256(exclusionSourceArtifact.itemHash, "immutable exclusion itemHash");
  const verifiedRunnerReceipt = validatePreResultExclusionRunnerReceiptV4(exclusionRunnerReceipt);
  if (verifiedRunnerReceipt.itemId !== exclusionSourceArtifact.itemId
    || verifiedRunnerReceipt.itemHash !== exclusionSourceArtifact.itemHash
    || verifiedRunnerReceipt.exclusionCode !== exclusionCode
    || verifiedRunnerReceipt.reasonCode !== reasonCode
    || verifiedRunnerReceipt.registeredAt !== registeredAt
    || verifiedRunnerReceipt.exclusionSourceArtifactHash !== sourceArtifactHash) {
    throw new TypeError("pre-result exclusion runner receipt does not bind the exact exclusion source, item, reason, and registration time");
  }
  return calculateArtifact({
    schemaVersion: "PreResultExclusionEvidenceV2",
    designId: DESIGN_ID,
    itemId: exclusionSourceArtifact.itemId,
    itemHash: exclusionSourceArtifact.itemHash,
    exclusionCode,
    reasonCode,
    registeredAt,
    exclusionSourceArtifact,
    egressDecisionInput,
    sourceArtifactHash,
    exclusionRunnerReceipt: verifiedRunnerReceipt,
    exclusionRunnerReceiptHash: verifiedRunnerReceipt.exclusionRunnerReceiptHash,
  }, "exclusionEvidenceHash");
}

function validatePreResultExclusionEvidenceV4(evidence) {
  assertObject(evidence, "immutable pre-result exclusion evidence");
  if (!artifactHashMatches(evidence, "exclusionEvidenceHash")) {
    throw new TypeError("immutable pre-result exclusion evidence hash mismatch");
  }
  const expected = buildPreResultExclusionEvidenceV4({
    exclusionSourceArtifact: evidence.exclusionSourceArtifact,
    egressDecisionInput: evidence.egressDecisionInput,
    exclusionCode: evidence.exclusionCode,
    reasonCode: evidence.reasonCode,
    registeredAt: evidence.registeredAt,
    exclusionRunnerReceipt: evidence.exclusionRunnerReceipt,
  });
  if (!canonicalEqual(evidence, expected)) throw new TypeError("immutable pre-result exclusion evidence closed shape mismatch");
  return expected;
}

export function buildPreResultExclusionEvidenceInventoryV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "pre-result exclusion evidence inventory input");
  if (!canonicalEqual(Object.keys(normalizedInput).sort(codePointCompare), [
    "exclusionEvidences",
    "recordedAt",
  ].sort(codePointCompare))) {
    throw new TypeError("pre-result exclusion evidence inventory requires the exact closed input field set");
  }
  const { exclusionEvidences, recordedAt } = normalizedInput;
  if (!Array.isArray(exclusionEvidences) || exclusionEvidences.length === 0) {
    throw new TypeError("pre-result exclusion evidence inventory requires a nonempty evidence array");
  }
  assertTimestamp(recordedAt, "pre-result exclusion evidence inventory recordedAt");
  const seenEvidenceHashes = new Set();
  const entries = exclusionEvidences.map((evidence) => {
    const verified = validatePreResultExclusionEvidenceV4(evidence);
    if (seenEvidenceHashes.has(verified.exclusionEvidenceHash)) {
      throw new TypeError(`pre-result exclusion evidence inventory repeats evidence ${verified.exclusionEvidenceHash}`);
    }
    seenEvidenceHashes.add(verified.exclusionEvidenceHash);
    if (timestampMillis(verified.exclusionRunnerReceipt.executedAt, "pre-result exclusion runner executedAt")
      > timestampMillis(recordedAt, "pre-result exclusion evidence inventory recordedAt")) {
      throw new TypeError("pre-result exclusion evidence inventory cannot predate its runner receipt");
    }
    return {
      itemId: verified.itemId,
      itemHash: verified.itemHash,
      exclusionCode: verified.exclusionCode,
      reasonCode: verified.reasonCode,
      sourceArtifactHash: verified.sourceArtifactHash,
      exclusionRunnerReceiptHash: verified.exclusionRunnerReceiptHash,
      exclusionEvidenceHash: verified.exclusionEvidenceHash,
    };
  }).sort((left, right) => codePointCompare(left.itemId, right.itemId)
    || codePointCompare(left.exclusionEvidenceHash, right.exclusionEvidenceHash));
  return calculateArtifact({
    schemaVersion: "PreResultExclusionEvidenceInventoryV1",
    designId: DESIGN_ID,
    recordedAt,
    entries,
    evidenceCount: entries.length,
    exclusionEvidenceRootHash: sha256Hex(canonicalJson(entries)),
  }, "exclusionEvidenceInventoryHash");
}

function validatePreResultExclusionEvidenceInventoryV4(inventory) {
  assertObject(inventory, "pre-result exclusion evidence inventory");
  if (!artifactHashMatches(inventory, "exclusionEvidenceInventoryHash")) {
    throw new TypeError("pre-result exclusion evidence inventory self-hash mismatch");
  }
  if (!Array.isArray(inventory.entries) || inventory.entries.length === 0) {
    throw new TypeError("pre-result exclusion evidence inventory entries must be nonempty");
  }
  assertTimestamp(inventory.recordedAt, "pre-result exclusion evidence inventory recordedAt");
  const requiredEntryFields = [
    "exclusionCode",
    "exclusionEvidenceHash",
    "exclusionRunnerReceiptHash",
    "itemHash",
    "itemId",
    "reasonCode",
    "sourceArtifactHash",
  ].sort(codePointCompare);
  const seenEvidenceHashes = new Set();
  for (const entry of inventory.entries) {
    assertObject(entry, "pre-result exclusion evidence inventory entry");
    if (!canonicalEqual(Object.keys(entry).sort(codePointCompare), requiredEntryFields)) {
      throw new TypeError("pre-result exclusion evidence inventory entry must use the exact closed field set; caller-certified fields are forbidden");
    }
    assertPipeSafe(entry.itemId, "pre-result exclusion evidence inventory itemId");
    assertSha256(entry.itemHash, "pre-result exclusion evidence inventory itemHash");
    if (!["RESTRICTED_EGRESS_CONTENT", "UNSTABLE_SERIALIZATION"].includes(entry.exclusionCode)) {
      throw new TypeError("pre-result exclusion evidence inventory entry exclusionCode is outside the closed set");
    }
    assertPipeSafe(entry.reasonCode, "pre-result exclusion evidence inventory reasonCode");
    assertSha256(entry.sourceArtifactHash, "pre-result exclusion evidence inventory source artifact hash");
    assertSha256(entry.exclusionRunnerReceiptHash, "pre-result exclusion evidence inventory runner receipt hash");
    assertSha256(entry.exclusionEvidenceHash, "pre-result exclusion evidence inventory evidence hash");
    if (seenEvidenceHashes.has(entry.exclusionEvidenceHash)) {
      throw new TypeError(`pre-result exclusion evidence inventory repeats evidence ${entry.exclusionEvidenceHash}`);
    }
    seenEvidenceHashes.add(entry.exclusionEvidenceHash);
  }
  const expected = calculateArtifact({
    schemaVersion: "PreResultExclusionEvidenceInventoryV1",
    designId: DESIGN_ID,
    recordedAt: inventory.recordedAt,
    entries: [...inventory.entries].sort((left, right) => codePointCompare(left.itemId, right.itemId)
      || codePointCompare(left.exclusionEvidenceHash, right.exclusionEvidenceHash)),
    evidenceCount: inventory.entries.length,
    exclusionEvidenceRootHash: sha256Hex(canonicalJson([...inventory.entries].sort((left, right) => codePointCompare(left.itemId, right.itemId)
      || codePointCompare(left.exclusionEvidenceHash, right.exclusionEvidenceHash)))),
  }, "exclusionEvidenceInventoryHash");
  if (!canonicalEqual(inventory, expected)) throw new TypeError("pre-result exclusion evidence inventory closed shape or root mismatch");
  return expected;
}

function validateSampleExecutionLedgerV4(ledger) {
  assertObject(ledger, "append-only sample execution ledger");
  if (!artifactHashMatches(ledger, "executionLedgerHash")) throw new TypeError("append-only sample execution ledger hash mismatch");
  const expected = buildSampleExecutionLedgerV4({
    sampleManifestHash: ledger.sampleManifestHash,
    previousExecutionLedgerHash: ledger.previousExecutionLedgerHash,
    recorderImplementationHash: ledger.recorderImplementationHash,
    recorderRunnerReceiptHash: ledger.recorderRunnerReceiptHash,
    recordedAt: ledger.recordedAt,
    entries: ledger.entries,
  });
  if (!canonicalEqual(ledger, expected)) throw new TypeError("append-only sample execution ledger closed shape mismatch");
  return expected;
}

function buildReplacementExecutionLedgerV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "replacement execution ledger input");
  const requiredFields = [
    "sampleSelectionContentRootHash",
    "sampleVersion",
    "previousSampleManifestHash",
    "previousExecutionLedgerHash",
    "recorderImplementationHash",
    "recorderRunnerReceiptHash",
    "recordedAt",
    "entries",
  ].sort(codePointCompare);
  if (!canonicalEqual(Object.keys(normalizedInput).sort(codePointCompare), requiredFields)) {
    throw new TypeError("replacement execution ledger requires the exact closed authority field set");
  }
  const {
    sampleSelectionContentRootHash,
    sampleVersion,
    previousSampleManifestHash,
    previousExecutionLedgerHash,
    recorderImplementationHash,
    recorderRunnerReceiptHash,
    recordedAt,
    entries,
  } = normalizedInput;
  assertSha256(sampleSelectionContentRootHash, "replacement execution ledger sample selection content root");
  if (!Number.isSafeInteger(sampleVersion) || sampleVersion < 2) {
    throw new TypeError("replacement execution ledger sampleVersion must be an integer of at least two");
  }
  assertSha256(previousSampleManifestHash, "replacement execution ledger previous sample manifest hash");
  assertSha256(previousExecutionLedgerHash, "replacement execution ledger previous execution ledger hash");
  const normalizedEntries = buildSampleExecutionLedgerV4({
    sampleManifestHash: sampleSelectionContentRootHash,
    previousExecutionLedgerHash,
    recorderImplementationHash,
    recorderRunnerReceiptHash,
    recordedAt,
    entries,
  }).entries;
  return calculateArtifact({
    schemaVersion: "SampleExecutionLedgerV2",
    designId: DESIGN_ID,
    sampleBindingKind: "SAMPLE_SELECTION_CONTENT_ROOT",
    sampleSelectionContentRootHash,
    sampleVersion,
    previousSampleManifestHash,
    previousExecutionLedgerHash,
    recorderImplementationHash,
    recorderRunnerReceiptHash,
    recordedAt,
    entries: normalizedEntries,
    entryCount: normalizedEntries.length,
    entryRootHash: sha256Hex(canonicalJson(normalizedEntries.map((entry) => entry.entryHash))),
    appendOnly: true,
  }, "executionLedgerHash");
}

function validateReplacementExecutionLedgerV4(ledger) {
  assertObject(ledger, "replacement execution ledger");
  if (!artifactHashMatches(ledger, "executionLedgerHash")) {
    throw new TypeError("replacement execution ledger hash mismatch");
  }
  const expected = buildReplacementExecutionLedgerV4({
    sampleSelectionContentRootHash: ledger.sampleSelectionContentRootHash,
    sampleVersion: ledger.sampleVersion,
    previousSampleManifestHash: ledger.previousSampleManifestHash,
    previousExecutionLedgerHash: ledger.previousExecutionLedgerHash,
    recorderImplementationHash: ledger.recorderImplementationHash,
    recorderRunnerReceiptHash: ledger.recorderRunnerReceiptHash,
    recordedAt: ledger.recordedAt,
    entries: ledger.entries,
  });
  if (!canonicalEqual(ledger, expected)) {
    throw new TypeError("replacement execution ledger closed shape mismatch");
  }
  return expected;
}

function buildReplacementReceiptV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "replacement receipt input");
  const requiredFields = [
    "registrationHash",
    "frameRegistrationHash",
    "previousSampleManifestHash",
    "newSampleSelectionContentRootHash",
    "sampleVersion",
    "registeredAt",
    "newManifestFrozenAt",
    "exclusionItemId",
    "exclusionItemHash",
    "exclusionCode",
    "exclusionEvidenceHash",
    "trustedExclusionEvidenceInventoryHash",
    "beforeExecutionLedgerHash",
    "afterExecutionLedgerHash",
    "replacementItemId",
    "replacementItemHash",
    "replacementClusterId",
    "replacementStratum",
  ].sort(codePointCompare);
  if (!canonicalEqual(Object.keys(normalizedInput).sort(codePointCompare), requiredFields)) {
    throw new TypeError("replacement receipt requires the exact closed authority field set");
  }
  const {
    registrationHash,
    frameRegistrationHash,
    previousSampleManifestHash,
    newSampleSelectionContentRootHash,
    sampleVersion,
    registeredAt,
    newManifestFrozenAt,
    exclusionItemId,
    exclusionItemHash,
    exclusionCode,
    exclusionEvidenceHash,
    trustedExclusionEvidenceInventoryHash,
    beforeExecutionLedgerHash,
    afterExecutionLedgerHash,
    replacementItemId,
    replacementItemHash,
    replacementClusterId,
    replacementStratum,
  } = normalizedInput;
  for (const [value, label] of [
    [registrationHash, "replacement receipt registrationHash"],
    [frameRegistrationHash, "replacement receipt frameRegistrationHash"],
    [previousSampleManifestHash, "replacement receipt previousSampleManifestHash"],
    [newSampleSelectionContentRootHash, "replacement receipt sample selection content root"],
    [exclusionItemHash, "replacement receipt exclusion itemHash"],
    [exclusionEvidenceHash, "replacement receipt exclusion evidence hash"],
    [trustedExclusionEvidenceInventoryHash, "replacement receipt trusted exclusion inventory hash"],
    [beforeExecutionLedgerHash, "replacement receipt before ledger hash"],
    [afterExecutionLedgerHash, "replacement receipt after ledger hash"],
    [replacementItemHash, "replacement receipt replacement itemHash"],
  ]) assertSha256(value, label);
  for (const [value, label] of [
    [exclusionItemId, "replacement receipt exclusion itemId"],
    [replacementItemId, "replacement receipt replacement itemId"],
    [replacementClusterId, "replacement receipt replacement clusterId"],
    [replacementStratum, "replacement receipt replacement stratum"],
  ]) assertPipeSafe(value, label);
  if (!Number.isSafeInteger(sampleVersion) || sampleVersion < 2) {
    throw new TypeError("replacement receipt sampleVersion must be an integer of at least two");
  }
  if (!CLOSED_EXCLUSION_CODES.includes(exclusionCode)) {
    throw new TypeError("replacement receipt exclusionCode is outside the frozen closed set");
  }
  assertTimestamp(registeredAt, "replacement receipt registeredAt");
  assertTimestamp(newManifestFrozenAt, "replacement receipt newManifestFrozenAt");
  return calculateArtifact({
    schemaVersion: "PreResultReplacementV2",
    designId: DESIGN_ID,
    registrationHash,
    frameRegistrationHash,
    previousSampleManifestHash,
    newSampleSelectionContentRootHash,
    sampleVersion,
    registeredAt,
    newManifestFrozenAt,
    exclusionItemId,
    exclusionItemHash,
    exclusionCode,
    exclusionEvidenceHash,
    trustedExclusionEvidenceInventoryHash,
    beforeExecutionLedgerHash,
    afterExecutionLedgerHash,
    replacementItemId,
    replacementItemHash,
    replacementClusterId,
    replacementStratum,
    selectionRule: "EXACT_NEXT_RANK_IN_SAME_FROZEN_STRATUM",
    providerAttemptReceiptCountAtRegistration: 0,
    referenceLabelCountAtRegistration: 0,
    evaluationResultCountAtRegistration: 0,
    resultBlind: true,
    replacementAfterAnyLabelOrResult: false,
  }, "replacementReceiptHash");
}

function buildSampleReplacementAuthorizationV4(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "sample replacement authorization input");
  const {
    previousSampleManifest,
    replacementDraft,
    exclusionEvidenceInventory,
    trustedExclusionEvidenceInventoryHash,
    beforeExecutionLedger,
    afterExecutionLedger,
    trustedExecutionLedgerRecorderImplementationHash,
    trustedExecutionLedgerRunnerReceiptHash,
    replacementReceipt,
  } = normalizedInput;
  assertObject(previousSampleManifest, "replacement authorization previous sample manifest");
  assertObject(replacementDraft, "replacement authorization sample draft");
  if (!artifactHashMatches(previousSampleManifest, "sampleManifestHash")) {
    throw new TypeError("replacement authorization previous sample manifest hash mismatch");
  }
  if (replacementDraft.supersedesSampleManifestHash !== previousSampleManifest.sampleManifestHash
    || replacementDraft.sampleVersion !== previousSampleManifest.sampleVersion + 1) {
    throw new TypeError("replacement authorization sample version/predecessor mismatch");
  }
  const exclusion = replacementDraft.registeredPreResultExclusions?.at(-1);
  const replacement = replacementDraft.replacementHistory?.at(-1);
  assertObject(exclusion, "replacement authorization latest exclusion");
  assertObject(replacement, "replacement authorization latest replacement history entry");
  const verifiedExclusion = validatePreResultExclusionEvidenceV4(exclusion.exclusionEvidence);
  if (verifiedExclusion.exclusionEvidenceHash !== exclusion.evidenceHash
    || verifiedExclusion.itemId !== exclusion.itemId
    || verifiedExclusion.itemHash !== exclusion.itemHash
    || verifiedExclusion.registeredAt !== exclusion.registeredAt) {
    throw new TypeError("replacement authorization exclusion evidence identity mismatch");
  }
  const verifiedInventory = validatePreResultExclusionEvidenceInventoryV4(exclusionEvidenceInventory);
  assertSha256(trustedExclusionEvidenceInventoryHash, "replacement authorization out-of-band trusted exclusion inventory hash");
  if (verifiedInventory.exclusionEvidenceInventoryHash !== trustedExclusionEvidenceInventoryHash) {
    throw new TypeError("replacement authorization exclusion inventory does not match the persisted out-of-band trusted root");
  }
  const inventoryMatches = verifiedInventory.entries.filter((entry) => (
    entry.exclusionEvidenceHash === verifiedExclusion.exclusionEvidenceHash
      && entry.itemId === verifiedExclusion.itemId
      && entry.itemHash === verifiedExclusion.itemHash
      && entry.exclusionRunnerReceiptHash === verifiedExclusion.exclusionRunnerReceiptHash
      && entry.sourceArtifactHash === verifiedExclusion.sourceArtifactHash
  ));
  if (inventoryMatches.length !== 1) {
    throw new TypeError("replacement authorization exclusion evidence is not an exact trusted inventory member");
  }
  const verifiedBeforeLedger = validateSampleExecutionLedgerV4(beforeExecutionLedger);
  const verifiedAfterLedger = validateReplacementExecutionLedgerV4(afterExecutionLedger);
  assertSha256(trustedExecutionLedgerRecorderImplementationHash, "replacement authorization trusted ledger recorder implementation hash");
  assertSha256(trustedExecutionLedgerRunnerReceiptHash, "replacement authorization trusted ledger runner receipt hash");
  if (verifiedBeforeLedger.recorderImplementationHash !== trustedExecutionLedgerRecorderImplementationHash
    || verifiedBeforeLedger.recorderRunnerReceiptHash !== trustedExecutionLedgerRunnerReceiptHash
    || verifiedAfterLedger.recorderImplementationHash !== trustedExecutionLedgerRecorderImplementationHash
    || verifiedAfterLedger.recorderRunnerReceiptHash !== trustedExecutionLedgerRunnerReceiptHash) {
    throw new TypeError("replacement authorization ledgers are not bound to the persisted trusted recorder roots");
  }
  if (previousSampleManifest.sampleVersion === 1) {
    if (verifiedBeforeLedger.previousExecutionLedgerHash !== null || verifiedBeforeLedger.entries.length !== 0) {
      throw new TypeError("initial sample replacement requires an empty execution ledger with no append-only predecessor");
    }
  } else {
    const previousAfterLedger = validateReplacementExecutionLedgerV4(
      previousSampleManifest.replacementAuthorization?.afterExecutionLedger,
    );
    if (verifiedBeforeLedger.previousExecutionLedgerHash !== previousAfterLedger.executionLedgerHash
      || !canonicalEqual(verifiedBeforeLedger.entries, previousAfterLedger.entries)) {
      throw new TypeError("replacement execution ledger must exactly continue the superseded sample replacement history and append-only predecessor");
    }
  }
  if (verifiedBeforeLedger.sampleManifestHash !== previousSampleManifest.sampleManifestHash
    || verifiedAfterLedger.previousSampleManifestHash !== previousSampleManifest.sampleManifestHash
    || verifiedAfterLedger.previousExecutionLedgerHash !== verifiedBeforeLedger.executionLedgerHash
    || verifiedAfterLedger.sampleSelectionContentRootHash !== replacementDraft.sampleSelectionContentRootHash
    || verifiedAfterLedger.sampleVersion !== replacementDraft.sampleVersion) {
    throw new TypeError("replacement authorization ledger transition does not bind the exact before/new sample roots");
  }
  const forbiddenExecutionEvent = verifiedBeforeLedger.entries.find((entry) => [
    "PROVIDER_ATTEMPT",
    "REFERENCE_LABEL_RECORDED",
    "EVALUATION_RESULT_RECORDED",
  ].includes(entry.eventType));
  if (forbiddenExecutionEvent) {
    throw new TypeError("replacement authorization is prohibited after any provider attempt, label, or result");
  }
  const expectedReplacementEntry = calculateArtifact({
    schemaVersion: "SampleExecutionLedgerEntryV1",
    sequenceNumber: verifiedBeforeLedger.entries.length + 1,
    eventType: "PRE_RESULT_REPLACEMENT_REGISTERED",
    itemId: exclusion.itemId,
    itemHash: exclusion.itemHash,
    eventArtifactHash: verifiedExclusion.exclusionEvidenceHash,
    occurredAt: exclusion.registeredAt,
  }, "entryHash");
  if (verifiedAfterLedger.entries.length !== verifiedBeforeLedger.entries.length + 1
    || !canonicalEqual(verifiedAfterLedger.entries.slice(0, -1), verifiedBeforeLedger.entries)
    || !canonicalEqual(verifiedAfterLedger.entries.at(-1), expectedReplacementEntry)) {
    throw new TypeError("replacement authorization after-ledger is not the exact append-only replacement transition");
  }
  const registeredMs = timestampMillis(exclusion.registeredAt, "replacement authorization registeredAt");
  const executedMs = timestampMillis(verifiedExclusion.exclusionRunnerReceipt.executedAt, "replacement authorization runner executedAt");
  const inventoryMs = timestampMillis(verifiedInventory.recordedAt, "replacement authorization inventory recordedAt");
  const previousFrozenMs = timestampMillis(previousSampleManifest.manifestFrozenAt, "replacement authorization previous manifestFrozenAt");
  const newFrozenMs = timestampMillis(replacementDraft.manifestFrozenAt, "replacement authorization new manifestFrozenAt");
  const beforeLedgerMs = timestampMillis(verifiedBeforeLedger.recordedAt, "replacement authorization before ledger recordedAt");
  const afterLedgerMs = timestampMillis(verifiedAfterLedger.recordedAt, "replacement authorization after ledger recordedAt");
  if (!(previousFrozenMs < registeredMs
    && registeredMs <= executedMs
    && executedMs <= inventoryMs
    && inventoryMs < newFrozenMs)) {
    throw new TypeError("replacement authorization chronology requires previous freeze < registration <= runner <= inventory < new freeze");
  }
  if (!(previousFrozenMs <= beforeLedgerMs && beforeLedgerMs < newFrozenMs && afterLedgerMs === newFrozenMs)) {
    throw new TypeError("replacement authorization ledger chronology must precede and terminate at the new manifest freeze");
  }
  const expectedReceipt = buildReplacementReceiptV4({
    registrationHash: replacementDraft.registrationHash,
    frameRegistrationHash: replacementDraft.frameRegistrationHash,
    previousSampleManifestHash: previousSampleManifest.sampleManifestHash,
    newSampleSelectionContentRootHash: replacementDraft.sampleSelectionContentRootHash,
    sampleVersion: replacementDraft.sampleVersion,
    registeredAt: exclusion.registeredAt,
    newManifestFrozenAt: replacementDraft.manifestFrozenAt,
    exclusionItemId: exclusion.itemId,
    exclusionItemHash: exclusion.itemHash,
    exclusionCode: exclusion.exclusionCode,
    exclusionEvidenceHash: exclusion.evidenceHash,
    trustedExclusionEvidenceInventoryHash,
    beforeExecutionLedgerHash: verifiedBeforeLedger.executionLedgerHash,
    afterExecutionLedgerHash: verifiedAfterLedger.executionLedgerHash,
    replacementItemId: replacement.replacementItemId,
    replacementItemHash: replacement.replacementItemHash,
    replacementClusterId: replacement.replacementClusterId,
    replacementStratum: replacement.replacementStratum,
  });
  if (!canonicalEqual(replacementReceipt, expectedReceipt)) {
    throw new TypeError("replacement authorization receipt does not bind the exact authority and selection roots");
  }
  return calculateArtifact({
    schemaVersion: "SampleReplacementAuthorizationV1",
    designId: DESIGN_ID,
    registrationHash: replacementDraft.registrationHash,
    frameRegistrationHash: replacementDraft.frameRegistrationHash,
    previousSampleManifestHash: previousSampleManifest.sampleManifestHash,
    newSampleVersion: replacementDraft.sampleVersion,
    newSampleSelectionContentRootHash: replacementDraft.sampleSelectionContentRootHash,
    newManifestFrozenAt: replacementDraft.manifestFrozenAt,
    exclusionEvidenceHash: verifiedExclusion.exclusionEvidenceHash,
    exclusionEvidenceInventoryHash: verifiedInventory.exclusionEvidenceInventoryHash,
    trustedExclusionEvidenceInventoryHash,
    exclusionEvidenceInventoryRecordedAt: verifiedInventory.recordedAt,
    beforeExecutionLedgerHash: verifiedBeforeLedger.executionLedgerHash,
    beforeExecutionLedgerRecordedAt: verifiedBeforeLedger.recordedAt,
    afterExecutionLedgerHash: verifiedAfterLedger.executionLedgerHash,
    afterExecutionLedgerRecordedAt: verifiedAfterLedger.recordedAt,
    trustedExecutionLedgerRecorderImplementationHash,
    trustedExecutionLedgerRunnerReceiptHash,
    replacementReceiptHash: expectedReceipt.replacementReceiptHash,
    exclusionEvidenceInventory: verifiedInventory,
    beforeExecutionLedger: verifiedBeforeLedger,
    afterExecutionLedger: verifiedAfterLedger,
    replacementReceipt: expectedReceipt,
  }, "replacementAuthorizationHash");
}

function validateSampleReplacementAuthorizationV4(authorization, context) {
  assertObject(authorization, "sample replacement authorization");
  if (!artifactHashMatches(authorization, "replacementAuthorizationHash")) {
    throw new TypeError("sample replacement authorization self-hash mismatch");
  }
  const expected = buildSampleReplacementAuthorizationV4({
    previousSampleManifest: context.previousSampleManifest,
    replacementDraft: context.replacementDraft,
    exclusionEvidenceInventory: authorization.exclusionEvidenceInventory,
    trustedExclusionEvidenceInventoryHash: authorization.trustedExclusionEvidenceInventoryHash,
    beforeExecutionLedger: authorization.beforeExecutionLedger,
    afterExecutionLedger: authorization.afterExecutionLedger,
    trustedExecutionLedgerRecorderImplementationHash: authorization.trustedExecutionLedgerRecorderImplementationHash,
    trustedExecutionLedgerRunnerReceiptHash: authorization.trustedExecutionLedgerRunnerReceiptHash,
    replacementReceipt: authorization.replacementReceipt,
  });
  if (!canonicalEqual(authorization, expected)) {
    throw new TypeError("sample replacement authorization closed shape mismatch");
  }
  return expected;
}

export function buildPreResultReplacementV3(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "pre-result replacement input");
  for (const forbidden of ["providerAttemptReceipts", "referenceLabels", "evaluationResults", "exclusion"]) {
    if (Object.hasOwn(normalizedInput, forbidden)) {
      throw new TypeError("caller empty arrays and arbitrary hashes are forbidden; replacement requires immutable exclusion evidence and an append-only execution ledger");
    }
  }
  const allowedFields = new Set([
    "frameRows",
    "runtimeExtractionSnapshot",
    "cleanSourceEvidence",
    "frameRegistration",
    "clusterAudit",
    "previousSampleManifest",
    "exclusionEvidence",
    "exclusionEvidenceInventory",
    "trustedExclusionEvidenceInventoryHash",
    "newManifestFrozenAt",
    "beforeExecutionLedger",
    "trustedBeforeExecutionLedgerHash",
    "trustedExecutionLedgerRecorderImplementationHash",
    "trustedExecutionLedgerRunnerReceiptHash",
    "trustedLineageRuleApprovalHash",
  ]);
  const unknownFields = Object.keys(normalizedInput).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    throw new TypeError(`pre-result replacement input contains unknown fields: ${unknownFields.join(", ")}`);
  }
  const {
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    previousSampleManifest,
    exclusionEvidence,
    exclusionEvidenceInventory,
    trustedExclusionEvidenceInventoryHash,
    newManifestFrozenAt,
    beforeExecutionLedger,
    trustedBeforeExecutionLedgerHash,
    trustedExecutionLedgerRecorderImplementationHash,
    trustedExecutionLedgerRunnerReceiptHash,
    trustedLineageRuleApprovalHash,
  } = normalizedInput;
  const verifiedExclusion = validatePreResultExclusionEvidenceV4(exclusionEvidence);
  const verifiedExclusionInventory = validatePreResultExclusionEvidenceInventoryV4(exclusionEvidenceInventory);
  assertSha256(trustedExclusionEvidenceInventoryHash, "out-of-band trusted exclusion evidence inventory hash");
  if (verifiedExclusionInventory.exclusionEvidenceInventoryHash !== trustedExclusionEvidenceInventoryHash) {
    throw new TypeError("pre-result exclusion evidence inventory does not match the out-of-band trusted exclusion inventory hash");
  }
  const exclusionInventoryMatches = verifiedExclusionInventory.entries.filter((entry) => (
    entry.exclusionEvidenceHash === verifiedExclusion.exclusionEvidenceHash
  ));
  if (exclusionInventoryMatches.length !== 1
    || exclusionInventoryMatches[0].itemId !== verifiedExclusion.itemId
    || exclusionInventoryMatches[0].itemHash !== verifiedExclusion.itemHash
    || exclusionInventoryMatches[0].exclusionRunnerReceiptHash !== verifiedExclusion.exclusionRunnerReceiptHash
    || exclusionInventoryMatches[0].sourceArtifactHash !== verifiedExclusion.sourceArtifactHash) {
    throw new TypeError("pre-result exclusion evidence is not an exact member of the trusted exclusion evidence inventory");
  }
  const verifiedBeforeLedger = validateSampleExecutionLedgerV4(beforeExecutionLedger);
  if (verifiedBeforeLedger.executionLedgerHash !== trustedBeforeExecutionLedgerHash
    || verifiedBeforeLedger.recorderImplementationHash !== trustedExecutionLedgerRecorderImplementationHash
    || verifiedBeforeLedger.recorderRunnerReceiptHash !== trustedExecutionLedgerRunnerReceiptHash) {
    throw new TypeError("append-only execution ledger is not bound to the trusted ledger/recorder roots");
  }
  if (verifiedBeforeLedger.sampleManifestHash !== previousSampleManifest?.sampleManifestHash) {
    throw new TypeError("append-only execution ledger does not bind the superseded sample manifest");
  }
  const forbiddenExecutionEvent = verifiedBeforeLedger.entries.find((entry) => [
    "PROVIDER_ATTEMPT",
    "REFERENCE_LABEL_RECORDED",
    "EVALUATION_RESULT_RECORDED",
  ].includes(entry.eventType));
  if (forbiddenExecutionEvent) {
    throw new TypeError("pre-result replacement is prohibited after any provider attempt, label, or result in the append-only ledger");
  }
  assertTimestamp(newManifestFrozenAt, "newManifestFrozenAt");
  const exclusion = {
    itemId: verifiedExclusion.itemId,
    itemHash: verifiedExclusion.itemHash,
    exclusionCode: verifiedExclusion.exclusionCode,
    evidenceHash: verifiedExclusion.exclusionEvidenceHash,
    registeredAt: verifiedExclusion.registeredAt,
    exclusionEvidence: verifiedExclusion,
  };
  const registeredPreResultExclusions = [
    ...previousSampleManifest.registeredPreResultExclusions,
    exclusion,
  ];
  const replacementDraft = buildSampleManifestInternalV4({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    manifestFrozenAt: newManifestFrozenAt,
    registeredPreResultExclusions,
    supersededSampleManifest: previousSampleManifest,
    trustedLineageRuleApprovalHash,
  }, {
    allowUnsealedReplacementDraft: true,
  });
  const replacement = replacementDraft.replacementHistory.at(-1);
  const replacementEntry = calculateArtifact({
    schemaVersion: "SampleExecutionLedgerEntryV1",
    sequenceNumber: verifiedBeforeLedger.entries.length + 1,
    eventType: "PRE_RESULT_REPLACEMENT_REGISTERED",
    itemId: exclusion.itemId,
    itemHash: exclusion.itemHash,
    eventArtifactHash: verifiedExclusion.exclusionEvidenceHash,
    occurredAt: exclusion.registeredAt,
  }, "entryHash");
  const afterExecutionLedger = buildReplacementExecutionLedgerV4({
    sampleSelectionContentRootHash: replacementDraft.sampleSelectionContentRootHash,
    sampleVersion: replacementDraft.sampleVersion,
    previousSampleManifestHash: previousSampleManifest.sampleManifestHash,
    previousExecutionLedgerHash: verifiedBeforeLedger.executionLedgerHash,
    recorderImplementationHash: verifiedBeforeLedger.recorderImplementationHash,
    recorderRunnerReceiptHash: verifiedBeforeLedger.recorderRunnerReceiptHash,
    recordedAt: newManifestFrozenAt,
    entries: [...verifiedBeforeLedger.entries, replacementEntry],
  });
  const replacementReceipt = buildReplacementReceiptV4({
    registrationHash: frameRegistration.registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    previousSampleManifestHash: previousSampleManifest.sampleManifestHash,
    newSampleSelectionContentRootHash: replacementDraft.sampleSelectionContentRootHash,
    sampleVersion: replacementDraft.sampleVersion,
    registeredAt: exclusion.registeredAt,
    newManifestFrozenAt,
    exclusionItemId: exclusion.itemId,
    exclusionItemHash: exclusion.itemHash,
    exclusionCode: exclusion.exclusionCode,
    exclusionEvidenceHash: exclusion.evidenceHash,
    trustedExclusionEvidenceInventoryHash,
    beforeExecutionLedgerHash: verifiedBeforeLedger.executionLedgerHash,
    afterExecutionLedgerHash: afterExecutionLedger.executionLedgerHash,
    replacementItemId: replacement.replacementItemId,
    replacementItemHash: replacement.replacementItemHash,
    replacementClusterId: replacement.replacementClusterId,
    replacementStratum: replacement.replacementStratum,
  });
  const replacementAuthorization = buildSampleReplacementAuthorizationV4({
    previousSampleManifest,
    replacementDraft,
    exclusionEvidenceInventory: verifiedExclusionInventory,
    trustedExclusionEvidenceInventoryHash,
    beforeExecutionLedger: verifiedBeforeLedger,
    afterExecutionLedger,
    trustedExecutionLedgerRecorderImplementationHash,
    trustedExecutionLedgerRunnerReceiptHash,
    replacementReceipt,
  });
  const sampleManifest = buildSampleManifestInternalV4({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    manifestFrozenAt: newManifestFrozenAt,
    registeredPreResultExclusions,
    supersededSampleManifest: previousSampleManifest,
    trustedLineageRuleApprovalHash,
  }, { replacementAuthorization });
  return { sampleManifest, replacementReceipt, beforeExecutionLedger: verifiedBeforeLedger, afterExecutionLedger };
}

function buildSampleManifestInternalV4(input, {
  replacementAuthorization = null,
  allowUnsealedReplacementDraft = false,
} = {}) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "sample manifest input");
  const {
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    manifestFrozenAt,
    registeredPreResultExclusions = [],
    supersededSampleManifest = null,
    _historyDepth = 0,
    trustedLineageRuleApprovalHash,
  } = normalizedInput;
  assertFrameRegistrationInputs(
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    trustedLineageRuleApprovalHash,
  );
  assertTimestamp(manifestFrozenAt, "manifestFrozenAt");
  if (_historyDepth > 60) throw new TypeError("sample supersedes history exceeds the frozen bound");
  if (timestampMillis(frameRegistration.frozenAt, "frameRegistration.frozenAt") >= timestampMillis(manifestFrozenAt, "manifestFrozenAt")) {
    throw new TypeError("frame registration must be frozen before sample manifest");
  }
  if (!Array.isArray(registeredPreResultExclusions)) throw new TypeError("registered pre-result exclusions must be an array");
  const exclusionIds = new Set();
  for (const [index, exclusion] of registeredPreResultExclusions.entries()) {
    assertObject(exclusion, `registeredPreResultExclusions[${index}]`);
    const exclusionFields = Object.keys(exclusion).sort(codePointCompare);
    const requiredExclusionFields = [
      "evidenceHash",
      "exclusionCode",
      "exclusionEvidence",
      "itemHash",
      "itemId",
      "registeredAt",
    ].sort(codePointCompare);
    if (!canonicalEqual(exclusionFields, requiredExclusionFields)) {
      throw new TypeError(`registeredPreResultExclusions[${index}] must contain the exact immutable evidence-bound field set`);
    }
    assertPipeSafe(exclusion.itemId, `registeredPreResultExclusions[${index}].itemId`);
    assertSha256(exclusion.itemHash, `registeredPreResultExclusions[${index}].itemHash`);
    assertSha256(exclusion.evidenceHash, `registeredPreResultExclusions[${index}].evidenceHash`);
    assertTimestamp(exclusion.registeredAt, `registeredPreResultExclusions[${index}].registeredAt`);
    if (!["RESTRICTED_EGRESS_CONTENT", "UNSTABLE_SERIALIZATION"].includes(exclusion.exclusionCode)) {
      throw new TypeError("pre-result exclusion must be registered egress or serialization only");
    }
    const verifiedExclusionEvidence = validatePreResultExclusionEvidenceV4(exclusion.exclusionEvidence);
    if (verifiedExclusionEvidence.exclusionEvidenceHash !== exclusion.evidenceHash
      || verifiedExclusionEvidence.itemId !== exclusion.itemId
      || verifiedExclusionEvidence.itemHash !== exclusion.itemHash
      || verifiedExclusionEvidence.exclusionCode !== exclusion.exclusionCode
      || verifiedExclusionEvidence.registeredAt !== exclusion.registeredAt) {
      throw new TypeError(`registeredPreResultExclusions[${index}] immutable evidence identity/reason/time mismatch`);
    }
    if (timestampMillis(exclusion.registeredAt, `registeredPreResultExclusions[${index}].registeredAt`)
      >= timestampMillis(manifestFrozenAt, "manifestFrozenAt")) {
      throw new TypeError("pre-result exclusion must be registered before the new sample version freezes");
    }
    if (exclusionIds.has(exclusion.itemId)) throw new TypeError(`duplicate registered pre-result exclusion ${exclusion.itemId}`);
    exclusionIds.add(exclusion.itemId);
    const row = frameRows.find((candidate) => candidate.itemId === exclusion.itemId);
    if (!row || row.itemHash !== exclusion.itemHash || !row.eligible) {
      throw new TypeError(`registered pre-result exclusion ${exclusion.itemId} is not an exact eligible frame leaf`);
    }
  }
  if (supersededSampleManifest === null) {
    if (registeredPreResultExclusions.length !== 0) throw new TypeError("initial sample cannot contain pre-result replacements");
  } else {
    assertObject(supersededSampleManifest, "supersededSampleManifest");
    const recomputedSuperseded = buildSampleManifestInternalV4({
      frameRows,
      runtimeExtractionSnapshot,
      cleanSourceEvidence,
      frameRegistration,
      clusterAudit,
      manifestFrozenAt: supersededSampleManifest.manifestFrozenAt,
      registeredPreResultExclusions: supersededSampleManifest.registeredPreResultExclusions,
      supersededSampleManifest: supersededSampleManifest.supersededSampleManifest,
      _historyDepth: _historyDepth + 1,
      trustedLineageRuleApprovalHash,
    }, {
      replacementAuthorization: supersededSampleManifest.replacementAuthorization ?? null,
    });
    if (!canonicalEqual(supersededSampleManifest, recomputedSuperseded)) {
      throw new TypeError("superseded sample manifest does not match full-frame recomputation");
    }
    const priorExclusions = supersededSampleManifest.registeredPreResultExclusions;
    if (registeredPreResultExclusions.length !== priorExclusions.length + 1
      || !canonicalEqual(registeredPreResultExclusions.slice(0, -1), priorExclusions)) {
      throw new TypeError("new sample version must append exactly one registered exclusion");
    }
    const newlyExcluded = registeredPreResultExclusions.at(-1);
    if (timestampMillis(newlyExcluded.registeredAt, "newlyExcluded.registeredAt")
      <= timestampMillis(supersededSampleManifest.manifestFrozenAt, "supersededSampleManifest.manifestFrozenAt")) {
      throw new TypeError("replacement registration chronology requires the exclusion after the superseded sample freezes");
    }
    if (!supersededSampleManifest.selectedRows.some((row) => row.itemId === newlyExcluded.itemId && row.itemHash === newlyExcluded.itemHash)) {
      throw new TypeError("replacement exclusion must target an item selected in the superseded sample");
    }
    if (timestampMillis(supersededSampleManifest.manifestFrozenAt, "supersededSampleManifest.manifestFrozenAt")
      >= timestampMillis(manifestFrozenAt, "manifestFrozenAt")) {
      throw new TypeError("new sample version must freeze after the superseded sample");
    }
  }

  const representatives = representativeRows(frameRows, clusterAudit);
  const byStratum = new Map(STRATA.map((stratum) => [stratum, []]));
  for (const representative of representatives) byStratum.get(representative.cluster.assignedStratum).push(representative);
  const capacities = STRATA.map((stratum) => byStratum.get(stratum).length);
  const hamilton = allocationRows(capacities, 60, 2);
  const selectedRows = [];
  const stratumAllocations = [];

  for (const [index, stratum] of STRATA.entries()) {
    const ranked = [...byStratum.get(stratum)].sort((left, right) => (
      codePointCompare(left.cluster.representativeSelectionDigest, right.cluster.representativeSelectionDigest)
        || codePointCompare(left.row.itemId, right.row.itemId)
    ));
    const executionRanked = ranked.filter(({ row }) => !exclusionIds.has(row.itemId));
    const finalAllocation = hamilton.finalAllocation[index];
    if (executionRanked.length < finalAllocation) throw new TypeError(`registered exclusions exhaust stratum ${stratum}`);
    const [responseForm, difficulty] = stratum.split("::");
    stratumAllocations.push({
      stratum,
      responseForm,
      difficulty,
      eligibleClusterCount: capacities[index],
      executionEligibleClusterCount: executionRanked.length,
      baseMinimumAllocation: hamilton.baseAllocation[index],
      finalAllocation,
    });
    for (const { cluster, row } of executionRanked.slice(0, finalAllocation)) {
      selectedRows.push({
        clusterId: cluster.clusterId,
        itemId: row.itemId,
        itemHash: row.itemHash,
        stratum,
        responseForm: row.responseForm,
        difficulty: row.difficulty,
        selectionDigest: cluster.representativeSelectionDigest,
        clusterInclusionProbability: row.clusterInclusionProbability,
        representativeSelectionProbability: row.representativeSelectionProbability,
        itemInclusionProbability: row.inclusionProbability,
        inclusionProbability: row.inclusionProbability,
        analysisWeight: 1,
        secondaryAnalysisWeight: row.analysisWeight,
      });
    }
  }

  const orderedRows = sortManifestRows(selectedRows);
  const secondaryWeights = orderedRows.map((row) => row.secondaryAnalysisWeight);
  const secondaryWeightSum = secondaryWeights.reduce((sum, weight) => sum + weight, 0);
  const secondaryWeightSumSquares = secondaryWeights.reduce((sum, weight) => sum + (weight ** 2), 0);
  const priorSelectedIds = new Set(supersededSampleManifest?.selectedRows.map((row) => row.itemId) ?? []);
  const currentSelectedIds = new Set(orderedRows.map((row) => row.itemId));
  const newlyExcluded = registeredPreResultExclusions.at(-1) ?? null;
  const newlySelected = supersededSampleManifest === null
    ? null
    : orderedRows.find((row) => !priorSelectedIds.has(row.itemId));
  const replacementHistory = supersededSampleManifest === null ? [] : [
    ...supersededSampleManifest.replacementHistory,
    {
      exclusionIndex: registeredPreResultExclusions.length,
      removedItemId: newlyExcluded.itemId,
      removedItemHash: newlyExcluded.itemHash,
      exclusionCode: newlyExcluded.exclusionCode,
      exclusionEvidenceHash: newlyExcluded.evidenceHash,
      replacementItemId: newlySelected?.itemId ?? null,
      replacementItemHash: newlySelected?.itemHash ?? null,
      replacementClusterId: newlySelected?.clusterId ?? null,
      replacementStratum: newlySelected?.stratum ?? null,
    },
  ];
  if (supersededSampleManifest !== null
    && ([...priorSelectedIds].filter((itemId) => !currentSelectedIds.has(itemId)).length !== 1 || newlySelected === undefined)) {
    throw new TypeError("pre-result replacement must remove one selected item and take the exact next rank");
  }
  let artifact = {
    schemaVersion: "SampleManifestV2",
    designId: DESIGN_ID,
    registrationHash: frameRegistration.registrationHash,
    designHash: frameRegistration.registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    samplingFrameHash: frameRegistration.samplingFrameHash,
    frameSelectionContentRootHash: frameRegistration.frameSelectionContentRootHash,
    frameHash: frameRegistration.frameSelectionContentRootHash,
    sourceEnumerationReceiptHash: frameRegistration.sourceEnumerationReceiptHash,
    sourceEnumerationEvidenceContractHash: frameRegistration.sourceEnumerationEvidenceContractHash,
    fullSourceEnumerationRootHash: frameRegistration.fullSourceEnumerationRootHash,
    rawEvidenceArtifactRootHash: frameRegistration.rawEvidenceArtifactRootHash,
    extractorImplementationHash: frameRegistration.extractorImplementationHash,
    extractorRunnerCommit: frameRegistration.extractorRunnerCommit,
    extractorRunnerHash: frameRegistration.extractorRunnerHash,
    clusterAuditHash: clusterAudit.clusterAuditHash,
    clusterAuditSelectionContentHash: clusterAudit.clusterAuditSelectionContentHash,
    manifestFrozenAt,
    freezeSequence: 2,
    predecessorArtifactHash: frameRegistration.frameRegistrationHash,
    sampleVersion: supersededSampleManifest === null ? 1 : supersededSampleManifest.sampleVersion + 1,
    supersedesSampleManifestHash: supersededSampleManifest?.sampleManifestHash ?? null,
    supersededSampleManifest,
    registeredPreResultExclusions,
    replacementHistory,
    algorithmVersion: SAMPLE_ALGORITHM_VERSION,
    algorithmHash: SAMPLE_ALGORITHM_HASH,
    selectionFormula: SAMPLE_SELECTION_FORMULA,
    selectionDigestCanonicalization: SELECTION_DIGEST_CANONICALIZATION,
    selectionDigestByteEncoding: SELECTION_DIGEST_BYTE_ENCODING,
    selectionDigestFieldOrder: SAMPLE_SELECTION_DIGEST_FIELD_ORDER,
    selectionDesignHashSemantic: SAMPLE_SELECTION_DIGEST_CONTRACT.designHashSemantic,
    selectionFrameHashSemantic: SAMPLE_SELECTION_DIGEST_CONTRACT.frameHashSemantic,
    selectionGoldenVectorDigest: SAMPLE_SELECTION_GOLDEN_VECTOR.digest,
    allocationMethod: "CAPACITY_AWARE_ITERATIVE_HAMILTON_MINIMUM_TWO",
    clusterOwnershipRule: "LOWEST_MEMBER_SELECTION_DIGEST_THEN_ITEM_ID",
    selectedClusterRule: "LOWEST_REPRESENTATIVE_SELECTION_DIGEST_THEN_ITEM_ID",
    stratumAllocations,
    hamiltonAudit: hamilton.rounds,
    totalEligibleClusterCount: representatives.length,
    clusterCount: orderedRows.length,
    selectedRows: orderedRows,
    manifestTupleRootOrder: "SORTED_ITEM_ID_PLUS_ITEM_HASH_PLUS_CLUSTER_ID",
    manifestTupleRootFormula: "SHA256(JCS(SORTED([itemId,itemHash,clusterId])))",
    manifestTupleRootHash: calculateManifestTupleRootV3(orderedRows),
    primaryAnalysisWeight: 1,
    secondaryWeightMethod: "INVERSE_INCLUSION_PROBABILITY_DESCRIPTIVE_WITH_KISH_EFFECTIVE_N",
    secondaryEstimand: "FROZEN_ELIGIBLE_HOMOLOGY_CLUSTER_REPRESENTATIVE_INVENTORY",
    representativeSelectionRule: "DETERMINISTIC_LOWEST_MEMBER_SELECTION_DIGEST_THEN_ITEM_ID",
    secondaryWeightSummary: {
      itemCount: orderedRows.length,
      sumWeights: secondaryWeightSum,
      sumSquaredWeights: secondaryWeightSumSquares,
      kishEffectiveSampleSize: calculateKishEffectiveSampleSizeV3(secondaryWeights),
    },
    resultBlind: true,
    rerollAfterAnyLabelOrResult: false,
    replacementAfterAnyLabelOrResult: false,
  };
  artifact = materializeSamplePseudonymFieldsV4(artifact);
  artifact.sampleSelectionContentRootHash = calculateSampleSelectionContentRootV3(artifact);
  if (supersededSampleManifest === null) {
    if (replacementAuthorization !== null) {
      throw new TypeError("initial sample manifest cannot carry replacement authority");
    }
  } else if (replacementAuthorization === null) {
    if (!allowUnsealedReplacementDraft) {
      throw new TypeError("replacement sample manifest requires a self-contained replacement authorization artifact");
    }
  } else {
    const verifiedAuthorization = validateSampleReplacementAuthorizationV4(replacementAuthorization, {
      previousSampleManifest: supersededSampleManifest,
      replacementDraft: artifact,
    });
    const latestHistory = artifact.replacementHistory.at(-1);
    artifact.replacementHistory = [
      ...artifact.replacementHistory.slice(0, -1),
      {
        ...latestHistory,
        trustedExclusionEvidenceInventoryHash: verifiedAuthorization.trustedExclusionEvidenceInventoryHash,
        beforeExecutionLedgerHash: verifiedAuthorization.beforeExecutionLedgerHash,
        afterExecutionLedgerHash: verifiedAuthorization.afterExecutionLedgerHash,
        replacementReceiptHash: verifiedAuthorization.replacementReceiptHash,
        replacementAuthorizationHash: verifiedAuthorization.replacementAuthorizationHash,
      },
    ];
    artifact.schemaVersion = "SampleManifestV3";
    artifact.replacementAuthorization = verifiedAuthorization;
    artifact.replacementAuthorizationHash = verifiedAuthorization.replacementAuthorizationHash;
    artifact.replacementAuthorityHistoryRootHash = sha256Hex(canonicalJson(artifact.replacementHistory));
    if (artifact.sampleSelectionContentRootHash !== calculateSampleSelectionContentRootV3(artifact)) {
      throw new TypeError("replacement authority fields must not alter the frozen sample selection content root");
    }
  }
  return calculateArtifact(artifact, "sampleManifestHash");
}

/**
 * Build the first immutable sample version. Replacement versions are authority
 * transitions, not ordinary sample construction, and can only be produced by
 * buildPreResultReplacementV3 after it verifies the exact out-of-band
 * exclusion inventory and the append-only pre-result execution ledger.
 */
export function buildSampleManifestV3(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "initial sample manifest input");
  const allowedFields = new Set([
    "frameRows",
    "runtimeExtractionSnapshot",
    "cleanSourceEvidence",
    "frameRegistration",
    "clusterAudit",
    "manifestFrozenAt",
    "registeredPreResultExclusions",
    "supersededSampleManifest",
    "trustedLineageRuleApprovalHash",
  ]);
  const unknownFields = Object.keys(normalizedInput).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    throw new TypeError(`initial sample manifest input contains unknown fields: ${unknownFields.join(", ")}`);
  }
  if ((Object.hasOwn(normalizedInput, "registeredPreResultExclusions")
      && (!Array.isArray(normalizedInput.registeredPreResultExclusions)
        || normalizedInput.registeredPreResultExclusions.length !== 0))
    || (Object.hasOwn(normalizedInput, "supersededSampleManifest")
      && normalizedInput.supersededSampleManifest !== null)
    || Object.hasOwn(normalizedInput, "_historyDepth")) {
    throw new TypeError("buildSampleManifestV3 is initial sample only; replacement authority must use the unique pre-result replacement builder");
  }
  return buildSampleManifestInternalV4({
    ...normalizedInput,
    registeredPreResultExclusions: [],
    supersededSampleManifest: null,
  });
}

export function buildC0RandomAuditV3(input) {
  const normalizedInput = canonicalizeStrictItemJsonV4(input);
  assertObject(normalizedInput, "C0 random audit input");
  const {
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    sampleManifest,
    frozenAt,
    referenceAttemptReceipts,
    trustedLineageRuleApprovalHash,
  } = normalizedInput;
  assertObject(sampleManifest, "sampleManifest");
  assertTimestamp(frozenAt, "frozenAt");
  if (!Array.isArray(referenceAttemptReceipts)) throw new TypeError("reference attempt receipts must be supplied as evidence");
  if (referenceAttemptReceipts.length !== 0) {
    throw new TypeError("C0 freeze must occur before the first Qwen/reference provider attempt receipt");
  }
  if (timestampMillis(sampleManifest.manifestFrozenAt, "sampleManifest.manifestFrozenAt") >= timestampMillis(frozenAt, "frozenAt")) {
    throw new TypeError("sample manifest must be frozen before C0 selection");
  }
  assertFrameRegistrationInputs(
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    trustedLineageRuleApprovalHash,
  );
  const expectedSample = buildSampleManifestInternalV4({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    manifestFrozenAt: sampleManifest.manifestFrozenAt,
    registeredPreResultExclusions: sampleManifest.registeredPreResultExclusions,
    supersededSampleManifest: sampleManifest.supersededSampleManifest,
    trustedLineageRuleApprovalHash,
  }, { replacementAuthorization: sampleManifest.replacementAuthorization ?? null });
  if (!canonicalEqual(sampleManifest, expectedSample)) {
    throw new TypeError("C0 construction rejected an invalid upstream sample after full-frame recomputation");
  }
  if (!artifactHashMatches(sampleManifest, "sampleManifestHash")) {
    throw new TypeError("sampleManifestHash mismatch");
  }
  if (!Array.isArray(sampleManifest.selectedRows) || sampleManifest.selectedRows.length !== 60) {
    throw new TypeError("C0 random audit requires a complete 60-row sample manifest");
  }
  const byStratum = new Map(STRATA.map((stratum) => [stratum, []]));
  for (const [index, row] of sampleManifest.selectedRows.entries()) {
    assertObject(row, `sampleManifest.selectedRows[${index}]`);
    if (!STRATA.includes(row.stratum)) throw new TypeError(`sampleManifest.selectedRows[${index}] stratum mismatch`);
    byStratum.get(row.stratum).push(row);
  }
  const capacities = STRATA.map((stratum) => byStratum.get(stratum).length);
  const hamilton = allocationRows(capacities, 12, 1);
  if (sampleManifest.sampleSelectionContentRootHash !== calculateSampleSelectionContentRootV3(sampleManifest)) {
    throw new TypeError("sample selection content root mismatch");
  }
  const selectedRows = [];
  const stratumAllocations = [];
  for (const [index, stratum] of STRATA.entries()) {
    const ranked = byStratum.get(stratum).map((row) => ({
      row,
      selectionDigest: c0SelectionDigestV3({
        registrationHash: sampleManifest.registrationHash,
        sampleSelectionContentRootHash: sampleManifest.sampleSelectionContentRootHash,
        algorithmVersion: C0_AUDIT_ALGORITHM_VERSION,
        stratum,
        clusterId: row.clusterId,
        itemHash: row.itemHash,
      }),
    })).sort((left, right) => (
      codePointCompare(left.selectionDigest, right.selectionDigest)
        || codePointCompare(left.row.itemId, right.row.itemId)
    ));
    stratumAllocations.push({
      stratum,
      sampleClusterCount: capacities[index],
      baseMinimumAllocation: hamilton.baseAllocation[index],
      finalAllocation: hamilton.finalAllocation[index],
    });
    for (const entry of ranked.slice(0, hamilton.finalAllocation[index])) {
      selectedRows.push({
        clusterId: entry.row.clusterId,
        itemId: entry.row.itemId,
        itemHash: entry.row.itemHash,
        stratum,
        selectionDigest: entry.selectionDigest,
      });
    }
  }
  const orderedRows = sortManifestRows(selectedRows);
  const artifact = {
    schemaVersion: "C0RandomAuditSelectionV1",
    designId: DESIGN_ID,
    registrationHash: sampleManifest.registrationHash,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    sampleSelectionContentRootHash: sampleManifest.sampleSelectionContentRootHash,
    sourceEnumerationReceiptHash: sampleManifest.sourceEnumerationReceiptHash,
    sourceEnumerationEvidenceContractHash: sampleManifest.sourceEnumerationEvidenceContractHash,
    fullSourceEnumerationRootHash: sampleManifest.fullSourceEnumerationRootHash,
    rawEvidenceArtifactRootHash: sampleManifest.rawEvidenceArtifactRootHash,
    extractorImplementationHash: sampleManifest.extractorImplementationHash,
    extractorRunnerCommit: sampleManifest.extractorRunnerCommit,
    extractorRunnerHash: sampleManifest.extractorRunnerHash,
    frozenAt,
    freezeSequence: 3,
    predecessorArtifactHash: sampleManifest.sampleManifestHash,
    algorithmVersion: C0_AUDIT_ALGORITHM_VERSION,
    algorithmHash: C0_AUDIT_ALGORITHM_HASH,
    selectionFormula: C0_AUDIT_SELECTION_FORMULA,
    selectionDigestCanonicalization: SELECTION_DIGEST_CANONICALIZATION,
    selectionDigestByteEncoding: SELECTION_DIGEST_BYTE_ENCODING,
    selectionDigestFieldOrder: C0_AUDIT_SELECTION_DIGEST_FIELD_ORDER,
    selectionRegistrationHashSemantic: C0_AUDIT_SELECTION_DIGEST_CONTRACT.registrationHashSemantic,
    selectionSampleContentRootSemantic: C0_AUDIT_SELECTION_DIGEST_CONTRACT.sampleSelectionContentRootHashSemantic,
    selectionGoldenVectorDigest: C0_AUDIT_SELECTION_GOLDEN_VECTOR.digest,
    allocationMethod: "CAPACITY_AWARE_ITERATIVE_HAMILTON_MINIMUM_ONE",
    targetItemCount: 12,
    stratumAllocations,
    hamiltonAudit: hamilton.rounds,
    selectedRows: orderedRows,
    selectedTupleRootHash: calculateManifestTupleRootV3(orderedRows),
    noReroll: true,
    replacementAfterAnyLabelOrResult: false,
  };
  return calculateArtifact(artifact, "auditHash");
}

function addError(errors, message) {
  if (!errors.includes(message)) errors.push(message);
}

export function validateFreezeTimingV3({
  frameRegistration,
  sampleManifest,
  c0RandomAudit,
  referenceAttemptReceipts,
}) {
  const errors = [];
  if (!artifactHashMatches(frameRegistration, "frameRegistrationHash")) addError(errors, "frame registration self-hash mismatch in freeze chain");
  if (!artifactHashMatches(sampleManifest, "sampleManifestHash")) addError(errors, "sample manifest self-hash mismatch in freeze chain");
  if (!artifactHashMatches(c0RandomAudit, "auditHash")) addError(errors, "C0 audit self-hash mismatch in freeze chain");
  if (frameRegistration?.freezeSequence !== 1
    || sampleManifest?.freezeSequence !== 2
    || c0RandomAudit?.freezeSequence !== 3) {
    addError(errors, "frame-to-sample-to-C0 freeze sequence mismatch");
  }
  if (frameRegistration?.predecessorArtifactHash !== frameRegistration?.clusterAuditHash
    || sampleManifest?.predecessorArtifactHash !== frameRegistration?.frameRegistrationHash
    || c0RandomAudit?.predecessorArtifactHash !== sampleManifest?.sampleManifestHash) {
    addError(errors, "frame-to-sample-to-C0 predecessor hash mismatch");
  }
  try {
    const frameMs = timestampMillis(frameRegistration?.frozenAt, "frameRegistration.frozenAt");
    const sampleMs = timestampMillis(sampleManifest?.manifestFrozenAt, "sampleManifest.manifestFrozenAt");
    const c0Ms = timestampMillis(c0RandomAudit?.frozenAt, "c0RandomAudit.frozenAt");
    if (!(frameMs < sampleMs && sampleMs < c0Ms)) {
      addError(errors, "frame-to-sample-to-C0 timestamps are not strictly increasing");
    }
    if (!Array.isArray(referenceAttemptReceipts)) {
      addError(errors, "reference attempt receipt evidence must be an array");
    } else if (referenceAttemptReceipts.length > 0) {
      const parsed = referenceAttemptReceipts.map((receipt, index) => {
        assertObject(receipt, `referenceAttemptReceipts[${index}]`);
        const startedAtMs = timestampMillis(receipt.startedAt, `referenceAttemptReceipts[${index}].startedAt`);
        if (receipt.schemaVersion !== "ProviderAttemptReceiptV1"
          || receipt.designId !== DESIGN_ID
          || receipt.requestedProvider !== "ALIBABA_CLOUD_MODEL_STUDIO"
          || !QWEN_REFERENCE_RECEIPT_ROLE_SET_V4.includes(receipt.role)) {
          addError(errors, `reference attempt receipt ${index} is not an exact Qwen reference provider/role receipt`);
        }
        if (receipt.registrationHash !== frameRegistration.registrationHash
          || receipt.frameRegistrationHash !== frameRegistration.frameRegistrationHash
          || receipt.sampleManifestHash !== sampleManifest.sampleManifestHash
          || (Object.hasOwn(receipt, "c0AuditHash") && receipt.c0AuditHash !== c0RandomAudit.auditHash)) {
          addError(errors, `reference attempt receipt ${index} freeze-root tuple mismatch`);
        }
        return startedAtMs;
      });
      if (Math.min(...parsed) <= c0Ms) {
        addError(errors, "C0 must be frozen before first Qwen/reference attempt receipt");
      }
    }
  } catch (error) {
    addError(errors, `freeze timing evidence invalid: ${error.message}`);
  }
  return errors;
}

function tryExpected(errors, label, builder) {
  try {
    return builder();
  } catch (error) {
    addError(errors, `${label}: ${error.message}`);
    return null;
  }
}

/**
 * Recompute the frame, cluster audit, 60-item sample, and 12-item C0 audit from
 * protected rows. No caller-provided count, ranking, or self-hash is trusted.
 */
export function validateSampleAgainstFrame({
  frameRows,
  runtimeExtractionSnapshot,
  cleanSourceEvidence,
  clusterAudit,
  frameRegistration,
  sampleManifest,
  c0RandomAudit,
  referenceAttemptReceipts = [],
  trustedLineageRuleApprovalHash,
}) {
  const errors = [];
  if (!sampleManifest || typeof sampleManifest !== "object") return ["sample manifest must be an object"];
  if (!runtimeExtractionSnapshot || typeof runtimeExtractionSnapshot !== "object") {
    return ["protected runtime extraction snapshot is required"];
  }
  if (!cleanSourceEvidence || typeof cleanSourceEvidence !== "object") {
    return ["protected clean source evidence is required"];
  }
  if (!clusterAudit || typeof clusterAudit !== "object") return ["cluster audit must be an object"];
  if (!frameRegistration || typeof frameRegistration !== "object") return ["frame registration must be an object"];
  if (!c0RandomAudit || typeof c0RandomAudit !== "object") return ["C0 random audit must be an object"];
  for (const error of validateLineageRuleApprovalV4({
    lineageRuleApprovalHash: frameRegistration.lineageRuleApprovalHash,
    approvedRuleHash: frameRegistration.lineageRuleHash,
  }, { trustedOwnerApprovalHash: trustedLineageRuleApprovalHash })) addError(errors, error);
  if (runtimeExtractionSnapshot.runtimeExtractionSnapshotHash !== frameRegistration.runtimeExtractionSnapshotHash) {
    addError(errors, "protected runtime extraction snapshot hash does not match public frame registration root");
  }
  if (cleanSourceEvidence.sourceEvidenceHash !== frameRegistration.cleanSourceEvidenceHash) {
    addError(errors, "protected clean source evidence hash does not match public frame registration root");
  }

  const expectedAudit = tryExpected(errors, "cluster audit recomputation failed", () => buildClusterAuditV3({
    frameRows,
    registrationHash: frameRegistration.registrationHash,
    clusteringAlgorithmHash: clusterAudit.clusteringAlgorithmHash,
    auditedAt: clusterAudit.auditedAt,
  }));
  if (expectedAudit && !canonicalEqual(clusterAudit, expectedAudit)) addError(errors, "cluster audit does not exactly cover the full eligible frame membership and representatives");

  const auditForRecompute = expectedAudit ?? clusterAudit;
  const expectedFrame = tryExpected(errors, "frame registration recomputation failed", () => buildFrameRegistrationV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    clusterAudit: auditForRecompute,
    registrationHash: frameRegistration.registrationHash,
    runtimeConfigHash: frameRegistration.runtimeConfigHash,
    sourceCommit: frameRegistration.sourceCommit,
    frozenAt: frameRegistration.frozenAt,
    lineageRuleApprovalHash: frameRegistration.lineageRuleApprovalHash,
    trustedLineageRuleApprovalHash,
    trustedRouteExecutionRootHash: frameRegistration.trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash: frameRegistration.trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash: frameRegistration.trustedOwnerApprovalRootHash,
  }));
  if (expectedFrame && !canonicalEqual(frameRegistration, expectedFrame)) addError(errors, "frame registration does not match recomputed counts, physical row root, or cluster-audit binding");

  if (sampleManifest.rerollAfterAnyLabelOrResult !== false) addError(errors, "sample manifest forbids reroll after any label or result");
  if (sampleManifest.replacementAfterAnyLabelOrResult !== false) addError(errors, "sample manifest forbids result-dependent replacement");
  let observedTupleRoot = null;
  try {
    observedTupleRoot = calculateManifestTupleRootV3(sampleManifest.selectedRows);
  } catch (error) {
    addError(errors, `sample manifest tuple root cannot be recomputed: ${error.message}`);
  }
  if (observedTupleRoot !== null && sampleManifest.manifestTupleRootHash !== observedTupleRoot) {
    addError(errors, "sample manifest physical tuple root mismatch");
  }
  if (!artifactHashMatches(sampleManifest, "sampleManifestHash")) {
    addError(errors, "sample manifest self-hash mismatch");
  }

  const frameForRecompute = expectedFrame ?? frameRegistration;
  const expectedSample = tryExpected(errors, "sample manifest recomputation failed", () => buildSampleManifestInternalV4({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration: frameForRecompute,
    clusterAudit: auditForRecompute,
    manifestFrozenAt: sampleManifest.manifestFrozenAt,
    registeredPreResultExclusions: sampleManifest.registeredPreResultExclusions,
    supersededSampleManifest: sampleManifest.supersededSampleManifest,
    trustedLineageRuleApprovalHash,
  }, { replacementAuthorization: sampleManifest.replacementAuthorization ?? null }));
  if (expectedSample) {
    if (!canonicalEqual(sampleManifest.selectedRows, expectedSample.selectedRows)) {
      addError(errors, "sample manifest selectedRows are not the frozen top-ranked cluster representatives from the full frame");
    }
    if (sampleManifest.manifestTupleRootHash !== expectedSample.manifestTupleRootHash) {
      addError(errors, "sample manifest physical tuple root differs from the recomputed top-ranked sample");
    }
    if (!canonicalEqual(sampleManifest.stratumAllocations, expectedSample.stratumAllocations)
      || !canonicalEqual(sampleManifest.hamiltonAudit, expectedSample.hamiltonAudit)) {
      addError(errors, "sample manifest nine-cell capacity-aware Hamilton allocation mismatch");
    }
    if (!canonicalEqual(sampleManifest, expectedSample)) addError(errors, "sample manifest differs from full-frame recomputation");
  }

  const expectedC0 = expectedSample ? tryExpected(errors, "C0 random audit recomputation failed", () => buildC0RandomAuditV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration: frameForRecompute,
    clusterAudit: auditForRecompute,
    sampleManifest: expectedSample,
    frozenAt: c0RandomAudit.frozenAt,
    referenceAttemptReceipts: [],
    trustedLineageRuleApprovalHash,
  })) : null;
  if (!artifactHashMatches(c0RandomAudit, "auditHash")) addError(errors, "C0 random audit self-hash mismatch");
  if (c0RandomAudit.noReroll !== true) addError(errors, "C0 random audit must set noReroll=true");
  if (c0RandomAudit.replacementAfterAnyLabelOrResult !== false) addError(errors, "C0 random audit forbids result-dependent replacement");
  if (expectedC0 && !canonicalEqual(c0RandomAudit, expectedC0)) {
    addError(errors, "C0 random audit does not match the exact 12-item full-sample ranking and Hamilton allocation");
  }
  for (const error of validateFreezeTimingV3({
    frameRegistration,
    sampleManifest,
    c0RandomAudit,
    referenceAttemptReceipts,
  })) addError(errors, error);
  return errors;
}
