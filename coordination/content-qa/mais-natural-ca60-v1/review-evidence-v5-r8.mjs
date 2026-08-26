import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R8,
  validateClosedSelfHashedArtifactV5R8,
} from "./schema-contract-v5-r8.mjs";

const HASH = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const FINDING_IDS = Object.freeze(Array.from({ length: 8 }, (_, index) =>
  `A11-R7-${String(index + 1).padStart(3, "0")}`));
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
  if (normalized.some(([path, hash, size]) => typeof path !== "string" || path.length === 0
    || !HASH.test(hash ?? "") || !Number.isSafeInteger(size) || size < 0)
    || new Set(normalized.map(([path]) => path)).size !== normalized.length) return null;
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
  add(errors, validateClosedSelfHashedArtifactV5R8(staticGraph,
    "IndependentStaticImportGraphReceiptV1").length === 0
    && staticGraph.verifierSourceTreeRoot === review?.verifierSourceTreeRoot
    && staticGraph.forbiddenPrimaryScorerImportCount === 0
    && review?.staticImportGraphHash === staticGraph.selfHash,
  "fresh A11 process evidence static import graph is absent, unsealed, or imports the primary scorer");

  const forbiddenScan = artifacts.forbiddenPrimaryScorerPathScanReceipt;
  add(errors, validateClosedSelfHashedArtifactV5R8(forbiddenScan,
    "ForbiddenPrimaryScorerPathScanReceiptV1").length === 0
    && forbiddenScan.verifierSourceTreeRoot === review?.verifierSourceTreeRoot
    && forbiddenScan.forbiddenPathMatchCount === 0
    && review?.forbiddenPrimaryScorerPathScanHash === forbiddenScan.selfHash,
  "fresh A11 process evidence forbidden primary-scorer path scan is absent or nonzero");

  const runtime = artifacts.commandRuntimeReceipt;
  add(errors, validateClosedSelfHashedArtifactV5R8(runtime,
    "IndependentCommandRuntimeReceiptV1").length === 0
    && runtime.verifierSourceTreeRoot === review?.verifierSourceTreeRoot
    && runtime.dependencyLockRoot === review?.dependencyLockRoot
    && typeof runtime.nodeVersion === "string" && runtime.nodeVersion.length > 0
    && Array.isArray(runtime.commands) && runtime.commands.length > 0
    && review?.commandRuntimeHash === runtime.selfHash,
  "fresh A11 process evidence command runtime is absent or not bound to verifier/dependencies");

  const enumeration = artifacts.independentSourceEnumerationReceipt;
  add(errors, validateClosedSelfHashedArtifactV5R8(enumeration,
    "IndependentSourceEnumerationReceiptV1").length === 0
    && enumeration.baselineCommit === review?.baselineCommit
    && enumeration.recomputedRuntimeSourceEnumerationRootHash
      === review?.recomputedRuntimeSourceEnumerationRootHash
    && enumeration.conclusion === "EXACT_MATCH"
    && review?.independentSourceEnumerationReceiptHash === enumeration.selfHash,
  "fresh A11 process evidence independent source enumeration is absent or did not exactly match");
  return errors;
}

export function buildIndependentRunnerReviewReceiptV5R8(input) {
  const process = input.processEvidence;
  if (!process || typeof process !== "object") throw new TypeError("R8 A11 process evidence is required");
  const body = {
    schemaVersion: "IndependentExecutionRunnerReviewReceiptV6",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R8",
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
    processEvidenceRootHash: sha256V5R3(canonicalJsonV5R3(PROCESS_FIELDS
      .map((field) => [field, process[field]]))),
    reviewCustodyPolicy: "GIT_OBJECT_SINGLE_ADD_WITH_EXACT_REGISTRATION_PARENT_AND_RECOMPUTED_PROCESS_EVIDENCE",
    credentialReadCount: 0,
    naturalQuestionReadCount: 0,
    providerCallCount: 0,
    naturalQuestionEgressCount: 0,
    tokenCount: 0,
    attemptCount: 0,
    usdSpent: 0,
  };
  return assertClosedSelfHashedArtifactV5R8(sealV5R3Artifact(body),
    "IndependentExecutionRunnerReviewReceiptV6");
}

export function validateFreshRunnerReviewV5R8({ activeRegistration, registrationEvidence,
  freshReview, processArtifacts, reviewCustody }) {
  const errors = [];
  const schemaErrors = validateClosedSelfHashedArtifactV5R8(freshReview,
    "IndependentExecutionRunnerReviewReceiptV6");
  add(errors, schemaErrors.length === 0,
    `fresh A11 review fails its closed R8 schema or self-hash: ${schemaErrors.join("; ")}`);
  add(errors, freshReview?.decision === "CONCURRED" && freshReview?.findingCount === 0,
    "fresh A11 V5-R8 review must be CONCURRED with zero findings");
  add(errors, freshReview?.reviewerLane === "A11" && freshReview?.independentImplementation === true,
    "fresh A11 V5-R8 review identity or independence declaration is invalid");
  add(errors, freshReview?.reviewedRunnerRegistrationHash === activeRegistration?.selfHash
    && freshReview?.reviewedRunnerRegistrationCommit === registrationEvidence?.registrationCommit
    && freshReview?.reviewedRunnerSourceCommit === activeRegistration?.runnerSourceCommit
    && freshReview?.reviewedProductionSourceRootHash === activeRegistration?.productionSourceRootHash
    && freshReview?.reviewedTestSourceRootHash === activeRegistration?.testSourceRootHash
    && freshReview?.reviewedImportClosureRootHash === activeRegistration?.importClosureRootHash,
  "fresh A11 V5-R8 review does not bind the exact immutable registration and roots");
  add(errors, freshReview?.baselineCommit === registrationEvidence?.registrationCommit
    && freshReview?.recomputedRuntimeSourceEnumerationRootHash
      === activeRegistration?.runtimeSourceEnumerationRootHash,
  "fresh A11 process baseline or independently enumerated runtime root differs from registration custody");
  add(errors, exactArray(freshReview?.reviewedRemediatedFindingIds, FINDING_IDS),
    "fresh A11 V5-R8 review does not cover all eight R7 discrepancies exactly once");
  add(errors, PROCESS_FIELDS.slice(0, 5).every((field) => HASH.test(freshReview?.[field] ?? ""))
    && COMMIT.test(freshReview?.baselineCommit ?? "")
    && PROCESS_FIELDS.slice(6).every((field) => HASH.test(freshReview?.[field] ?? "")),
  "fresh A11 review omits mandatory frozen process evidence fields");
  const expectedProcessRoot = PROCESS_FIELDS.every((field) => typeof freshReview?.[field] === "string")
    ? sha256V5R3(canonicalJsonV5R3(PROCESS_FIELDS.map((field) => [field, freshReview[field]]))) : null;
  add(errors, freshReview?.processEvidenceRootHash === expectedProcessRoot,
    "fresh A11 process evidence root is invalid");
  errors.push(...processEvidenceErrors(freshReview, processArtifacts));
  add(errors, freshReview?.reviewCustodyPolicy
    === "GIT_OBJECT_SINGLE_ADD_WITH_EXACT_REGISTRATION_PARENT_AND_RECOMPUTED_PROCESS_EVIDENCE",
  "fresh A11 review custody policy is invalid");
  add(errors, reviewCustody?.verifiedFromGitObjects === true
    && reviewCustody?.reviewReceiptPathMutationCount === 1
    && reviewCustody?.reviewCommitParent === registrationEvidence?.registrationCommit
    && reviewCustody?.reviewReceiptHash === freshReview?.selfHash
    && COMMIT.test(reviewCustody?.reviewCommit ?? ""),
  "fresh A11 review was not loaded from an exact single-add Git object with the registration commit as parent");
  add(errors, Number.isFinite(Date.parse(freshReview?.reviewedAt ?? ""))
    && Number.isFinite(Date.parse(activeRegistration?.registeredAt ?? ""))
    && Date.parse(freshReview.reviewedAt) > Date.parse(activeRegistration.registeredAt),
  "fresh A11 V5-R8 review must strictly postdate registration");
  for (const field of ["credentialReadCount", "naturalQuestionReadCount", "providerCallCount",
    "naturalQuestionEgressCount", "tokenCount", "attemptCount", "usdSpent"]) {
    add(errors, freshReview?.[field] === 0, `fresh A11 review ${field} must remain zero`);
  }
  return Object.freeze([...new Set(errors)]);
}

export const REVIEW_EVIDENCE_V5_R8_CONSTANTS = Object.freeze({
  requiredProcessEvidenceFields: PROCESS_FIELDS,
  remediatedFindingIds: FINDING_IDS,
  callerSelfHashAloneAccepted: false,
  gitObjectCustodyRequired: true,
});
