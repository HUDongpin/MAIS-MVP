import {
  calculateArtifactHash,
  canonicalJson,
  computeCapacityConstrainedHamilton,
  sha256Hex,
} from "../design-v2/design-contract.mjs";
import { QWEN_ROLE_SET } from "./design-contract.mjs";

export const DESIGN_ID = "MAIS-NATURAL-CA60-V3";
export const RESPONSE_FORMS = Object.freeze(["multiple-choice", "fill-in", "short-answer"]);
export const DIFFICULTIES = Object.freeze(["Low", "Medium", "High"]);
export const CLOSED_EXCLUSION_CODES = Object.freeze([
  "NON_CA_TRACK",
  "RUNTIME_NOT_VISIBLE",
  "SYNTHETIC_TEST_CANDIDATE_ONLY",
  "RESTRICTED_EGRESS_CONTENT",
  "UNSTABLE_SERIALIZATION",
]);
export const RUNTIME_SOURCE_ENUMERATION_GRADES = Object.freeze([
  "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
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
  canonicalBytesUtf8Hex: "5b2234623263303131373031643731336664343131363264626161613435326535643865643335636533343339653533646233613730326637616239633265376238222c2231313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131222c226e61747572616c2d636136302d66756c6c2d6672616d652d68616d696c746f6e2d7633222c2273686f72742d616e737765723a3a48696768222c22636c75737465727ccea9222c2232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232225d",
  digest: "b07af0edcfcc26d1a13d0cdc84318fa8d0ee87e35a681991a9921e9f117afec2",
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
const RFC3339_INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/u;
const GRADES = new Set(RUNTIME_SOURCE_ENUMERATION_GRADES);

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
  return sha256Hex(canonicalJson({
    prompt: row.prompt,
    options: row.options,
    storedAnswer: row.storedAnswer,
    acceptedAnswers: row.acceptedAnswers,
    explanation: row.explanation,
  }));
}

export function calculateItemContentHashV3(row) {
  assertObject(row, "row");
  return sha256Hex(canonicalJson({
    region: row.region,
    curriculumProfile: row.curriculumProfile,
    grade: row.grade,
    canonicalTopic: row.canonicalTopic,
    responseForm: row.responseForm,
    difficulty: row.difficulty,
    sourceModuleHash: row.sourceModuleHash,
    prompt: row.prompt,
    options: row.options,
    storedAnswer: row.storedAnswer,
    acceptedAnswers: row.acceptedAnswers,
    explanation: row.explanation,
    lineageKind: row.lineageKind,
    batchId: row.batchId,
    clusterId: row.clusterId,
    topicId: row.topicId,
    generationTemplate: row.generationTemplate,
    sourceLessonSlug: row.sourceLessonSlug,
  }));
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

export function buildCleanSourceEvidenceV3({
  sourceCommit,
  verifiedAt,
  gitStatusPorcelain,
  sourceObjectType,
  verificationMode,
}) {
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

export function buildRuntimeSourceEnumerationReceiptV1({
  registrationHash,
  sourceCommit,
  runtimeConfigHash,
  extractorImplementationHash,
  extractorRunnerCommit,
  extractorRunnerHash,
  rawEvidenceArtifactRootHash,
  enumeratedAt,
  gradeProjectionInvocations,
}) {
  assertSha256(registrationHash, "registrationHash");
  assertSourceCommit(sourceCommit);
  assertSha256(runtimeConfigHash, "runtimeConfigHash");
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

export function buildRuntimeExtractionSnapshotV3({
  frameRows,
  expectedInventoryLeaves,
  runtimeSourceEnumerationReceipt,
  serializationFailureLedger,
  registrationHash,
  runtimeConfigHash,
  sourceCommit,
  extractedAt,
}) {
  validateFrameRows(frameRows, registrationHash, { runtimeConfigHash, sourceCommit });
  validateRuntimeSourceEnumerationReceiptV1(runtimeSourceEnumerationReceipt);
  if (runtimeSourceEnumerationReceipt.registrationHash !== registrationHash
    || runtimeSourceEnumerationReceipt.runtimeConfigHash !== runtimeConfigHash
    || runtimeSourceEnumerationReceipt.sourceCommit !== sourceCommit) {
    throw new TypeError("runtime source enumeration receipt root tuple mismatch");
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
    sourceCommit,
    extractedAt,
    runtimeSourceEnumerationReceipt,
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
  if (typeof value !== "string") throw new TypeError("prompt must be a string");
  return normalizeLatexAndUnicode(value)
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
    ? row.options.map((option) => templateText(String(option))).sort(codePointCompare)
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
    if (row.itemHash !== calculateItemContentHashV3(row)) throw new TypeError(`frameRows[${index}].itemHash mismatch`);
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
    if (typeof row.prompt !== "string" || row.prompt.trim().length === 0) {
      throw new TypeError(`frameRows[${index}].prompt must contain a mathematical prompt`);
    }
    if (typeof row.answerPresent !== "boolean" || typeof row.optionsPresent !== "boolean"
      || typeof row.explanationPresent !== "boolean") {
      throw new TypeError(`frameRows[${index}] answer/options/explanation presence flags must be boolean`);
    }
    if (!Array.isArray(row.acceptedAnswers)) throw new TypeError(`frameRows[${index}].acceptedAnswers must be an array`);
    if (row.options !== null && !Array.isArray(row.options)) throw new TypeError(`frameRows[${index}].options must be an array or null`);
    const observedAnswerPresent = row.storedAnswer !== null || row.acceptedAnswers.length > 0;
    const observedOptionsPresent = Array.isArray(row.options) && row.options.length > 0;
    const observedExplanationPresent = typeof row.explanation === "string" && row.explanation.trim().length > 0;
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
    selectedRows: sampleManifest.selectedRows,
    secondaryEstimand: sampleManifest.secondaryEstimand,
    representativeSelectionRule: sampleManifest.representativeSelectionRule,
    secondaryWeightSummary: sampleManifest.secondaryWeightSummary,
    registeredPreResultExclusions: (sampleManifest.registeredPreResultExclusions ?? []).map(({
      registeredAt: _registeredAt,
      ...exclusion
    }) => exclusion),
    replacementHistory: sampleManifest.replacementHistory ?? [],
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

export function buildClusterAuditV3({ frameRows, registrationHash, clusteringAlgorithmHash, auditedAt }) {
  validateFrameRows(frameRows, registrationHash);
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
    anomalyLedger: [],
    edgeCount: homologyGraph.edges.length,
    edges: homologyGraph.edges,
    connectedComponents: homologyGraph.components,
    clusters,
  };
  return calculateArtifact(artifact, "clusterAuditHash");
}

export function buildFrameRegistrationV3({
  frameRows,
  runtimeExtractionSnapshot,
  cleanSourceEvidence,
  clusterAudit,
  registrationHash,
  runtimeConfigHash,
  sourceCommit,
  frozenAt,
}) {
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
  const samplingFrameHash = calculateFrameRowsRootV3(frameRows);
  const frameSelectionContentRootHash = calculateFrameSelectionContentRootV3(frameRows);
  const artifact = {
    schemaVersion: "FrameRegistrationV1",
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
  };
  return calculateArtifact(artifact, "frameRegistrationHash");
}

function assertFrameRegistrationInputs(
  frameRows,
  runtimeExtractionSnapshot,
  cleanSourceEvidence,
  frameRegistration,
  clusterAudit,
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

export function materializeFrameSamplingWeightsV3(frameRows, registrationHash) {
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

export function buildPreResultReplacementV3({
  frameRows,
  runtimeExtractionSnapshot,
  cleanSourceEvidence,
  frameRegistration,
  clusterAudit,
  previousSampleManifest,
  exclusion,
  newManifestFrozenAt,
  providerAttemptReceipts,
  referenceLabels,
  evaluationResults,
}) {
  if (!Array.isArray(providerAttemptReceipts) || !Array.isArray(referenceLabels) || !Array.isArray(evaluationResults)) {
    throw new TypeError("provider attempts, reference labels, and evaluation results must be supplied as evidence arrays");
  }
  if (providerAttemptReceipts.length > 0) {
    throw new TypeError("pre-result replacement must be registered before first provider call or attempt");
  }
  if (referenceLabels.length > 0 || evaluationResults.length > 0) {
    throw new TypeError("pre-result replacement is prohibited after any label or result");
  }
  assertObject(exclusion, "exclusion");
  if (!["RESTRICTED_EGRESS_CONTENT", "UNSTABLE_SERIALIZATION"].includes(exclusion.exclusionCode)) {
    throw new TypeError("pre-result replacement is limited to registered egress or serialization exclusions");
  }
  assertTimestamp(newManifestFrozenAt, "newManifestFrozenAt");
  const registeredPreResultExclusions = [
    ...previousSampleManifest.registeredPreResultExclusions,
    structuredClone(exclusion),
  ];
  const sampleManifest = buildSampleManifestV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    manifestFrozenAt: newManifestFrozenAt,
    registeredPreResultExclusions,
    supersededSampleManifest: previousSampleManifest,
  });
  const replacement = sampleManifest.replacementHistory.at(-1);
  const replacementReceipt = calculateArtifact({
    schemaVersion: "PreResultReplacementV1",
    designId: DESIGN_ID,
    registrationHash: frameRegistration.registrationHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    previousSampleManifestHash: previousSampleManifest.sampleManifestHash,
    newSampleManifestHash: sampleManifest.sampleManifestHash,
    sampleVersion: sampleManifest.sampleVersion,
    registeredAt: exclusion.registeredAt,
    newManifestFrozenAt,
    exclusionItemId: exclusion.itemId,
    exclusionItemHash: exclusion.itemHash,
    exclusionCode: exclusion.exclusionCode,
    exclusionEvidenceHash: exclusion.evidenceHash,
    replacementItemId: replacement.replacementItemId,
    replacementItemHash: replacement.replacementItemHash,
    replacementClusterId: replacement.replacementClusterId,
    replacementStratum: replacement.replacementStratum,
    selectionRule: "EXACT_NEXT_RANK_IN_SAME_FROZEN_STRATUM",
    providerAttemptReceiptCountAtRegistration: providerAttemptReceipts.length,
    referenceLabelCountAtRegistration: referenceLabels.length,
    evaluationResultCountAtRegistration: evaluationResults.length,
    resultBlind: true,
    replacementAfterAnyLabelOrResult: false,
  }, "replacementReceiptHash");
  return { sampleManifest, replacementReceipt };
}

export function buildSampleManifestV3({
  frameRows,
  runtimeExtractionSnapshot,
  cleanSourceEvidence,
  frameRegistration,
  clusterAudit,
  manifestFrozenAt,
  registeredPreResultExclusions = [],
  supersededSampleManifest = null,
  _historyDepth = 0,
}) {
  assertFrameRegistrationInputs(
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
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
    assertPipeSafe(exclusion.itemId, `registeredPreResultExclusions[${index}].itemId`);
    assertSha256(exclusion.itemHash, `registeredPreResultExclusions[${index}].itemHash`);
    assertSha256(exclusion.evidenceHash, `registeredPreResultExclusions[${index}].evidenceHash`);
    assertTimestamp(exclusion.registeredAt, `registeredPreResultExclusions[${index}].registeredAt`);
    if (!["RESTRICTED_EGRESS_CONTENT", "UNSTABLE_SERIALIZATION"].includes(exclusion.exclusionCode)) {
      throw new TypeError("pre-result exclusion must be registered egress or serialization only");
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
    const recomputedSuperseded = buildSampleManifestV3({
      frameRows,
      runtimeExtractionSnapshot,
      cleanSourceEvidence,
      frameRegistration,
      clusterAudit,
      manifestFrozenAt: supersededSampleManifest.manifestFrozenAt,
      registeredPreResultExclusions: supersededSampleManifest.registeredPreResultExclusions,
      supersededSampleManifest: supersededSampleManifest.supersededSampleManifest,
      _historyDepth: _historyDepth + 1,
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
  const artifact = {
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
  artifact.sampleSelectionContentRootHash = calculateSampleSelectionContentRootV3(artifact);
  return calculateArtifact(artifact, "sampleManifestHash");
}

export function buildC0RandomAuditV3({
  frameRows,
  runtimeExtractionSnapshot,
  cleanSourceEvidence,
  frameRegistration,
  clusterAudit,
  sampleManifest,
  frozenAt,
  referenceAttemptReceipts,
}) {
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
  );
  const expectedSample = buildSampleManifestV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    manifestFrozenAt: sampleManifest.manifestFrozenAt,
    registeredPreResultExclusions: sampleManifest.registeredPreResultExclusions,
    supersededSampleManifest: sampleManifest.supersededSampleManifest,
  });
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
          || !QWEN_ROLE_SET.includes(receipt.role)) {
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
  const expectedSample = tryExpected(errors, "sample manifest recomputation failed", () => buildSampleManifestV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration: frameForRecompute,
    clusterAudit: auditForRecompute,
    manifestFrozenAt: sampleManifest.manifestFrozenAt,
    registeredPreResultExclusions: sampleManifest.registeredPreResultExclusions,
    supersededSampleManifest: sampleManifest.supersededSampleManifest,
  }));
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
