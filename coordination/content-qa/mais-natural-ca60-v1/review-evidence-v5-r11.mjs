import { createPublicKey, verify } from "node:crypto";

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R11,
  validateClosedSelfHashedArtifactV5R11,
} from "./schema-contract-v5-r11.mjs";

const HASH = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const FINDING_IDS = Object.freeze([
  ...Array.from({ length: 8 }, (_, index) =>
    `A11-R8-${String(index + 1).padStart(3, "0")}`),
  "A11-R9-001",
  "A11-R10-001",
  "A11-R10-002",
]);
const PROCESS_FIELDS = Object.freeze([
  "verifierSourceTreeRoot",
  "dependencyLockRoot",
  "staticImportGraphHash",
  "forbiddenPrimaryScorerPathScanHash",
  "commandRuntimeHash",
  "baselineCommit",
  "recomputedRuntimeSourceEnumerationRootHash",
  "independentSourceEnumerationReceiptHash",
]);

function add(errors, condition, message) {
  if (!condition && !errors.includes(message)) errors.push(message);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && new Set(actual).size === actual.length
    && canonicalJsonV5R3([...actual].sort()) === canonicalJsonV5R3([...expected].sort());
}

function rootRows(rows) {
  if (!Array.isArray(rows)) return null;
  const normalized = rows.map((row) => [row?.path, row?.sha256, row?.byteLength])
    .sort((left, right) => left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0);
  if (normalized.some(([sourcePath, hash, size]) => typeof sourcePath !== "string"
    || sourcePath.length === 0 || !HASH.test(hash ?? "")
    || !Number.isSafeInteger(size) || size < 0)
    || new Set(normalized.map(([sourcePath]) => sourcePath)).size !== normalized.length) return null;
  return sha256V5R3(canonicalJsonV5R3(normalized));
}

function processEvidenceErrors(review, processArtifacts) {
  const errors = [];
  const artifacts = processArtifacts ?? {};
  const verifierRoot = rootRows(artifacts.verifierSourceManifest);
  const dependencyRoot = rootRows(artifacts.dependencyLockManifest);
  add(errors, verifierRoot !== null && review?.verifierSourceTreeRoot === verifierRoot,
    "fresh A11 process evidence verifier source tree root is absent or cannot be recomputed");
  add(errors, dependencyRoot !== null && review?.dependencyLockRoot === dependencyRoot,
    "fresh A11 process evidence dependency lock root is absent or cannot be recomputed");

  const staticGraph = artifacts.staticImportGraphReceipt;
  add(errors, validateClosedSelfHashedArtifactV5R11(staticGraph,
    "IndependentStaticImportGraphReceiptV2").length === 0
    && staticGraph.runnerVersion === "V5-R11"
    && staticGraph.verifierSourceTreeRoot === review?.verifierSourceTreeRoot
    && staticGraph.forbiddenPrimaryScorerImportCount === 0
    && review?.staticImportGraphHash === staticGraph.selfHash,
  "fresh A11 process evidence static import graph is absent, unsealed, or imports the primary scorer");

  const forbiddenScan = artifacts.forbiddenPrimaryScorerPathScanReceipt;
  add(errors, validateClosedSelfHashedArtifactV5R11(forbiddenScan,
    "ForbiddenPrimaryScorerPathScanReceiptV2").length === 0
    && forbiddenScan.runnerVersion === "V5-R11"
    && forbiddenScan.verifierSourceTreeRoot === review?.verifierSourceTreeRoot
    && forbiddenScan.forbiddenPathMatchCount === 0
    && review?.forbiddenPrimaryScorerPathScanHash === forbiddenScan.selfHash,
  "fresh A11 process evidence forbidden primary-scorer path scan is absent or nonzero");

  const runtime = artifacts.commandRuntimeReceipt;
  add(errors, validateClosedSelfHashedArtifactV5R11(runtime,
    "IndependentCommandRuntimeReceiptV2").length === 0
    && runtime.runnerVersion === "V5-R11"
    && runtime.verifierSourceTreeRoot === review?.verifierSourceTreeRoot
    && runtime.dependencyLockRoot === review?.dependencyLockRoot
    && typeof runtime.nodeVersion === "string" && runtime.nodeVersion.length > 0
    && Array.isArray(runtime.commands) && runtime.commands.length > 0
    && review?.commandRuntimeHash === runtime.selfHash,
  "fresh A11 process evidence command runtime is absent or not bound to verifier/dependencies");

  const enumeration = artifacts.independentSourceEnumerationReceipt;
  add(errors, validateClosedSelfHashedArtifactV5R11(enumeration,
    "IndependentSourceEnumerationReceiptV2").length === 0
    && enumeration.runnerVersion === "V5-R11"
    && enumeration.baselineCommit === review?.baselineCommit
    && enumeration.recomputedRuntimeSourceEnumerationRootHash
      === review?.recomputedRuntimeSourceEnumerationRootHash
    && enumeration.conclusion === "EXACT_MATCH"
    && review?.independentSourceEnumerationReceiptHash === enumeration.selfHash,
  "fresh A11 process evidence independent source enumeration is absent or did not exactly match");
  return errors;
}

export function validatePublicReviewIdentityAnchorV5R11(anchor) {
  const errors = [];
  add(errors, anchor && typeof anchor === "object" && !Array.isArray(anchor)
    && validateSelfHashV5R3(anchor), "A11 public review identity anchor self-hash is invalid");
  add(errors, anchor?.keyId === "a11-v5-r11-fresh-review-ed25519-d12807d45c687eab"
    && anchor?.algorithm === "Ed25519"
    && anchor?.purpose === "V5_R11_FRESH_A11_REVIEW_ONLY",
  "A11 public review identity anchor identity or purpose is invalid");
  try {
    const key = createPublicKey(anchor?.publicKeySpkiPem ?? "");
    const der = key.export({ type: "spki", format: "der" });
    add(errors, sha256V5R3(der) === anchor?.publicKeyFingerprintSha256
      && anchor.publicKeyFingerprintSha256
        === "d12807d45c687eab83aefeb060e58c4e8add3148fe9417910becfb323378c3be",
    "A11 public review key fingerprint cannot be independently reconstructed");
  } catch {
    add(errors, false, "A11 public review key is not a valid SPKI public key");
  }
  for (const field of ["credentialReadCount", "naturalQuestionReadCount", "providerCallCount",
    "naturalQuestionEgressCount", "tokenCount", "attemptCount", "usdSpent"]) {
    add(errors, anchor?.[field] === 0, `A11 public review identity anchor ${field} must be zero`);
  }
  return Object.freeze([...new Set(errors)]);
}

export function buildIndependentRunnerReviewSignaturePayloadV5R11(input) {
  return Object.freeze({
    schemaVersion: "IndependentExecutionRunnerReviewSignaturePayloadV3",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R11",
    decision: input.decision,
    findingCount: input.findingCount,
    reviewedAt: input.reviewedAt,
    reviewedRunnerRegistrationHash: input.activeRegistration.selfHash,
    reviewedRunnerRegistrationCommit: input.registrationEvidence.registrationCommit,
    reviewedRunnerSourceCommit: input.activeRegistration.runnerSourceCommit,
    reviewedProductionSourceRootHash: input.activeRegistration.productionSourceRootHash,
    reviewedTestSourceRootHash: input.activeRegistration.testSourceRootHash,
    reviewedImportClosureRootHash: input.activeRegistration.importClosureRootHash,
    reviewedRemediatedFindingIds: [...FINDING_IDS],
    processEvidenceRootHash: input.processEvidence.processEvidenceRootHash,
    baselineCommit: input.processEvidence.baselineCommit,
    recomputedRuntimeSourceEnumerationRootHash:
      input.processEvidence.recomputedRuntimeSourceEnumerationRootHash,
    reviewerIdentityAnchorHash: input.reviewerIdentityAnchor.selfHash,
    reviewerKeyId: input.reviewerIdentityAnchor.keyId,
  });
}

export function buildIndependentRunnerReviewReceiptV5R11(input) {
  const process = input.processEvidence;
  if (!process || typeof process !== "object") throw new TypeError("R11 A11 process evidence is required");
  const anchorErrors = validatePublicReviewIdentityAnchorV5R11(input.reviewerIdentityAnchor);
  if (anchorErrors.length > 0) throw new TypeError(anchorErrors.join("; "));
  const payload = buildIndependentRunnerReviewSignaturePayloadV5R11(input);
  const signatureBytes = Buffer.from(input.reviewSignatureBase64 ?? "", "base64");
  const publicKey = createPublicKey(input.reviewerIdentityAnchor.publicKeySpkiPem);
  if (!verify(null, Buffer.from(canonicalJsonV5R3(payload), "utf8"), publicKey, signatureBytes)) {
    throw new TypeError("R11 A11 review signature is invalid for the pinned reviewer identity");
  }
  const body = {
    schemaVersion: "IndependentExecutionRunnerReviewReceiptV9",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R11",
    reviewedAt: input.reviewedAt,
    decision: input.decision,
    reviewerLane: "A11",
    independentImplementation: true,
    findingCount: input.findingCount,
    reviewedRunnerRegistrationHash: input.activeRegistration.selfHash,
    reviewedRunnerRegistrationCommit: input.registrationEvidence.registrationCommit,
    reviewedRunnerSourceCommit: input.activeRegistration.runnerSourceCommit,
    reviewedProductionSourceRootHash: input.activeRegistration.productionSourceRootHash,
    reviewedTestSourceRootHash: input.activeRegistration.testSourceRootHash,
    reviewedImportClosureRootHash: input.activeRegistration.importClosureRootHash,
    reviewedRemediatedFindingIds: [...FINDING_IDS],
    verifierSourceTreeRoot: process.verifierSourceTreeRoot,
    dependencyLockRoot: process.dependencyLockRoot,
    staticImportGraphHash: process.staticImportGraphHash,
    forbiddenPrimaryScorerPathScanHash: process.forbiddenPrimaryScorerPathScanHash,
    commandRuntimeHash: process.commandRuntimeHash,
    baselineCommit: process.baselineCommit,
    recomputedRuntimeSourceEnumerationRootHash: process.recomputedRuntimeSourceEnumerationRootHash,
    independentSourceEnumerationReceiptHash: process.independentSourceEnumerationReceiptHash,
    processEvidenceRootHash: process.processEvidenceRootHash,
    reviewerIdentityAnchorHash: input.reviewerIdentityAnchor.selfHash,
    reviewerKeyId: input.reviewerIdentityAnchor.keyId,
    reviewSignaturePayload: payload,
    reviewSignaturePayloadHash: sha256V5R3(canonicalJsonV5R3(payload)),
    reviewSignatureBase64: input.reviewSignatureBase64,
    reviewSignatureVerified: true,
    reviewCustodyPolicy:
      "PINNED_A11_ED25519_SIGNATURE_PLUS_GIT_OBJECT_SINGLE_ADD_WITH_EXACT_CLOSEOUT_PARENT_AND_RECOMPUTED_PROCESS_EVIDENCE",
    credentialReadCount: 0,
    naturalQuestionReadCount: 0,
    providerCallCount: 0,
    naturalQuestionEgressCount: 0,
    tokenCount: 0,
    attemptCount: 0,
    usdSpent: 0,
  };
  return assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact(body),
    "IndependentExecutionRunnerReviewReceiptV9");
}

export function validateFreshRunnerReviewV5R11({ activeRegistration, registrationEvidence,
  freshReview, processArtifacts, reviewCustody, reviewerIdentityAnchor }) {
  const errors = [...validatePublicReviewIdentityAnchorV5R11(reviewerIdentityAnchor)];
  const schemaErrors = validateClosedSelfHashedArtifactV5R11(freshReview,
    "IndependentExecutionRunnerReviewReceiptV9");
  add(errors, schemaErrors.length === 0,
    `fresh A11 review fails its closed R11 schema or self-hash: ${schemaErrors.join("; ")}`);
  add(errors, freshReview?.decision === "CONCURRED" && freshReview?.findingCount === 0,
    "fresh A11 V5-R11 review must be CONCURRED with zero findings");
  add(errors, activeRegistration?.reviewerIdentityAnchorHash === reviewerIdentityAnchor?.selfHash
    && activeRegistration?.reviewerKeyId === reviewerIdentityAnchor?.keyId
    && activeRegistration?.reviewerPublicKeyFingerprintSha256
      === reviewerIdentityAnchor?.publicKeyFingerprintSha256,
  "registration does not pin the supplied A11 reviewer identity anchor");
  add(errors, freshReview?.reviewerLane === "A11" && freshReview?.independentImplementation === true,
    "fresh A11 V5-R11 review identity or independence declaration is invalid");
  add(errors, freshReview?.reviewedRunnerRegistrationHash === activeRegistration?.selfHash
    && freshReview?.reviewedRunnerRegistrationCommit === registrationEvidence?.registrationCommit
    && freshReview?.reviewedRunnerSourceCommit === activeRegistration?.runnerSourceCommit
    && freshReview?.reviewedProductionSourceRootHash === activeRegistration?.productionSourceRootHash
    && freshReview?.reviewedTestSourceRootHash === activeRegistration?.testSourceRootHash
    && freshReview?.reviewedImportClosureRootHash === activeRegistration?.importClosureRootHash,
  "fresh A11 V5-R11 review does not bind the exact immutable registration and roots");
  add(errors, freshReview?.baselineCommit === registrationEvidence?.registrationCommit
    && freshReview?.recomputedRuntimeSourceEnumerationRootHash
      === activeRegistration?.runtimeSourceEnumerationRootHash,
  "fresh A11 process baseline or independently enumerated runtime root differs from registration custody");
  add(errors, exactArray(freshReview?.reviewedRemediatedFindingIds, FINDING_IDS),
    "fresh A11 V5-R11 review does not cover all eight R8 discrepancies, the R9 phase defect, and both R10 discrepancies exactly once");
  const expectedProcessRoot = PROCESS_FIELDS.every((field) => typeof freshReview?.[field] === "string")
    ? sha256V5R3(canonicalJsonV5R3(PROCESS_FIELDS.map((field) => [field, freshReview[field]]))) : null;
  add(errors, freshReview?.processEvidenceRootHash === expectedProcessRoot,
    "fresh A11 process evidence root is invalid");
  errors.push(...processEvidenceErrors(freshReview, processArtifacts));
  try {
    const expectedPayload = buildIndependentRunnerReviewSignaturePayloadV5R11({
      decision: freshReview?.decision,
      findingCount: freshReview?.findingCount,
      reviewedAt: freshReview?.reviewedAt,
      activeRegistration,
      registrationEvidence,
      reviewerIdentityAnchor,
      processEvidence: { ...Object.fromEntries(PROCESS_FIELDS.map((field) => [field, freshReview?.[field]])),
        processEvidenceRootHash: freshReview?.processEvidenceRootHash },
    });
    add(errors, canonicalJsonV5R3(expectedPayload) === canonicalJsonV5R3(freshReview?.reviewSignaturePayload)
      && sha256V5R3(canonicalJsonV5R3(expectedPayload)) === freshReview?.reviewSignaturePayloadHash,
    "fresh A11 review signature payload differs from exact registration/process custody");
    const verified = verify(null, Buffer.from(canonicalJsonV5R3(expectedPayload), "utf8"),
      createPublicKey(reviewerIdentityAnchor.publicKeySpkiPem),
      Buffer.from(freshReview?.reviewSignatureBase64 ?? "", "base64"));
    add(errors, verified && freshReview?.reviewSignatureVerified === true,
      "fresh A11 review signature does not verify against the pinned identity");
  } catch {
    add(errors, false, "fresh A11 review signature cannot be independently verified");
  }
  add(errors, reviewCustody?.verifiedFromGitObjects === true
    && reviewCustody?.reviewReceiptPathMutationCount === 1
    && reviewCustody?.reviewCommitParent === reviewCustody?.closeoutCommit
    && reviewCustody?.closeoutCommitParent === registrationEvidence?.registrationCommit
    && reviewCustody?.reviewReceiptHash === freshReview?.selfHash
    && COMMIT.test(reviewCustody?.reviewCommit ?? "")
    && COMMIT.test(reviewCustody?.closeoutCommit ?? ""),
  "fresh A11 review lacks exact signed Git custody after the exact A07 closeout commit");
  add(errors, Number.isFinite(Date.parse(freshReview?.reviewedAt ?? ""))
    && Number.isFinite(Date.parse(activeRegistration?.registeredAt ?? ""))
    && Date.parse(freshReview.reviewedAt) > Date.parse(activeRegistration.registeredAt),
  "fresh A11 V5-R11 review must strictly postdate registration");
  for (const field of ["credentialReadCount", "naturalQuestionReadCount", "providerCallCount",
    "naturalQuestionEgressCount", "tokenCount", "attemptCount", "usdSpent"]) {
    add(errors, freshReview?.[field] === 0, `fresh A11 review ${field} must remain zero`);
  }
  return Object.freeze([...new Set(errors)]);
}

export const REVIEW_EVIDENCE_V5_R11_CONSTANTS = Object.freeze({
  requiredProcessEvidenceFields: PROCESS_FIELDS,
  remediatedFindingIds: FINDING_IDS,
  reviewerSignatureAlgorithm: "Ed25519",
  callerSelfHashAloneAccepted: false,
  callerRoleStringAloneAccepted: false,
  gitObjectCustodyRequired: true,
  pinnedReviewerIdentityRequired: true,
});
