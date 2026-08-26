import { lstat } from "node:fs/promises";
import path from "node:path";

import {
  PromotionGateError,
  assertSafeRepoRelativePath,
  fingerprint,
  parseCanonicalJsonBytes,
  readAuthoritativeFile,
  sha256,
  stableJson
} from "../promotion-gate-lib.mjs";
import {
  validateV2Manifest,
  validateV2ReceiptStructure
} from "../v2/promotion-gate-v2-lib.mjs";

export const PROMOTION_SHADOW_CLOSURE_V2_SCHEMA = "promotion-shadow-closure.v2";
export const PROMOTION_LIFECYCLE_REGISTRY_V2_SCHEMA = "promotion-lifecycle-registry.v2";
export const PROMOTION_SHADOW_CLOSURE_V2_PATH =
  "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/shadow-closure.v2.json";
export const PROMOTION_LIFECYCLE_REGISTRY_V2_PATH =
  "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/lifecycle-registry.v2.json";

const MATURITY_CLAIM = "Shadow-mature / live-unproven";
const TRUST_BOUNDARY =
  "Repository hash-bound readback record; GitHub API authenticity requires independent repository-admin readback.";
const REPOSITORY = "HUDongpin/MAIS-MVP";
const GITHUB_ACTIONS_APP_ID = 15368;
const EXPECTED_REQUIRED_CHECKS = Object.freeze([
  Object.freeze({ context: "promotion-shadow-gate", appId: GITHUB_ACTIONS_APP_ID }),
  Object.freeze({ context: "validate", appId: GITHUB_ACTIONS_APP_ID })
]);
const EXPECTED_CLOSEOUT_OWNERS = Object.freeze([
  "A04", "A05", "A10", "A11", "A18", "A21", "A22", "A23", "A24", "A25"
]);
const ARTIFACT_KEYS = Object.freeze([
  "manifest",
  "evidenceIndex",
  "receipt",
  "a11Replay",
  "a22Isolation",
  "legacyRegistry",
  "prCheck",
  "requiredChecks",
  "mainPostMerge",
  "a25Closeout"
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const DECIMAL_ID_PATTERN = /^[1-9][0-9]*$/u;

function fail(code, message) {
  throw new PromotionGateError(code, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainObject(value, code, label) {
  if (!isPlainObject(value)) fail(code, `${label} must be a plain object.`);
}

function assertExactKeys(value, keys, code, label) {
  assertPlainObject(value, code, label);
  const observed = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (stableJson(observed) !== stableJson(expected)) {
    fail(code, `${label} fields do not match the v2 contract.`);
  }
}

function assertNonEmptyString(value, code, label) {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
    fail(code, `${label} must be a non-empty canonical string.`);
  }
}

function assertSha256(value, code, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    fail(code, `${label} must be a lowercase SHA-256 digest.`);
  }
}

function assertCommit(value, code, label) {
  if (typeof value !== "string" || !COMMIT_PATTERN.test(value)) {
    fail(code, `${label} must be a lowercase 40-character Git commit.`);
  }
}

function assertIsoTimestamp(value, code, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    fail(code, `${label} must be an ISO timestamp.`);
  }
}

function assertGithubUrl(value, code, label, prefix) {
  assertNonEmptyString(value, code, label);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(code, `${label} must be a valid GitHub URL.`);
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" || !parsed.pathname.startsWith(prefix)) {
    fail(code, `${label} must use the expected GitHub HTTPS location.`);
  }
}

function assertApiUrl(value, code, label, expectedPath) {
  assertNonEmptyString(value, code, label);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(code, `${label} must be a valid GitHub API URL.`);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "api.github.com" ||
    parsed.pathname !== expectedPath
  ) {
    fail(code, `${label} must be the exact GitHub branch-protection API URL.`);
  }
}

function assertSelfDigest(value, field, code, label) {
  assertSha256(value?.[field], code, `${label}.${field}`);
  const payload = structuredClone(value);
  delete payload[field];
  if (value[field] !== fingerprint(payload)) {
    fail(code, `${label} self digest does not match its stable payload.`);
  }
}

function validateArtifactReference(reference, artifact, code, label) {
  assertExactKeys(reference, ["path", "rawSha256"], code, `${label} reference`);
  try {
    assertSafeRepoRelativePath(reference.path);
  } catch {
    fail(code, `${label} reference path is unsafe.`);
  }
  assertSha256(reference.rawSha256, code, `${label} reference.rawSha256`);
  assertPlainObject(artifact, code, `${label} artifact`);
  if (
    artifact.path !== reference.path ||
    !Buffer.isBuffer(artifact.bytes) ||
    !isPlainObject(artifact.value) ||
    sha256(artifact.bytes) !== reference.rawSha256
  ) {
    fail(code, `${label} artifact does not match its path and raw-byte reference.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(artifact.bytes.toString("utf8"));
  } catch {
    fail(code, `${label} artifact bytes are not JSON.`);
  }
  if (stableJson(parsed) !== stableJson(artifact.value)) {
    fail(code, `${label} raw bytes do not encode the supplied semantic value.`);
  }
  return artifact.value;
}

function validateAllArtifacts(closure, artifacts) {
  assertExactKeys(closure.artifacts, ARTIFACT_KEYS, "V2_FINALIZATION_ARTIFACT_INVALID", "closure artifacts");
  assertExactKeys(artifacts, ARTIFACT_KEYS, "V2_FINALIZATION_ARTIFACT_INVALID", "closure artifact context");
  const foldedPaths = closure.artifacts
    ? Object.values(closure.artifacts).map(({ path: artifactPath }) =>
        typeof artifactPath === "string" ? artifactPath.toLocaleLowerCase("en-US") : artifactPath
      )
    : [];
  if (foldedPaths.length !== new Set(foldedPaths).size) {
    fail(
      "V2_FINALIZATION_EVIDENCE_REUSE",
      "Independent finalization roles must use distinct evidence artifact paths."
    );
  }
  return Object.fromEntries(ARTIFACT_KEYS.map((key) => [
    key,
    validateArtifactReference(
      closure.artifacts[key],
      artifacts[key],
      "V2_FINALIZATION_ARTIFACT_INVALID",
      key
    )
  ]));
}

function validateManifestAndReceipt(closure, values) {
  const manifest = validateV2Manifest(values.manifest);
  const receipt = validateV2ReceiptStructure(values.receipt);
  if (
    values.evidenceIndex.schemaVersion !== "promotion-evidence-index.v2" ||
    closure.artifacts.evidenceIndex.path !== manifest.evidenceIndex.path ||
    closure.artifacts.evidenceIndex.rawSha256 !== manifest.evidenceIndex.rawSha256
  ) {
    fail("V2_FINALIZATION_MANIFEST_MISMATCH", "Evidence index no longer matches the frozen Manifest.");
  }
  if (
    receipt.result !== "pass" ||
    receipt.manifest.path !== closure.artifacts.manifest.path ||
    receipt.manifest.rawSha256 !== closure.artifacts.manifest.rawSha256 ||
    receipt.binding.gateId !== manifest.gateId ||
    receipt.binding.pilotUnitId !== manifest.pilotUnitId ||
    receipt.binding.attemptId !== manifest.attemptId ||
    receipt.binding.parentPackageId !== manifest.parentPackage.id ||
    receipt.binding.candidateDigest !== manifest.candidateDigest ||
    receipt.binding.sourceCommit !== manifest.sourceCommit ||
    receipt.binding.targetBaselineCommit !== manifest.targetBaselineCommit ||
    receipt.binding.checkerVersion !== manifest.checkerVersion ||
    receipt.binding.checkerBundleDigest !== manifest.checkerRelease.bundleDigest ||
    receipt.binding.parentPackageStatus !== "candidate-only" ||
    receipt.binding.liveAllowed !== false ||
    receipt.lifecycle.recommendedState !== "shadow_passed" ||
    receipt.lifecycle.liveAllowed !== false
  ) {
    fail("V2_FINALIZATION_RECEIPT_MISMATCH", "Canonical Receipt is stale or not a passing non-live attempt-007 Receipt.");
  }
  return { manifest, receipt };
}

function validateClosureBinding(closure, manifest, receipt, prCheck, mainPostMerge) {
  assertExactKeys(closure.binding, [
    "gateId",
    "pilotUnitId",
    "attemptId",
    "parentPackageId",
    "candidateDigest",
    "sourceCommit",
    "targetBaselineCommit",
    "checkerVersion",
    "checkerBundleDigest",
    "executionCommit",
    "compositionHeadCommit",
    "mergeCommit"
  ], "V2_FINALIZATION_BINDING_INVALID", "closure binding");
  const expected = {
    gateId: manifest.gateId,
    pilotUnitId: manifest.pilotUnitId,
    attemptId: manifest.attemptId,
    parentPackageId: manifest.parentPackage.id,
    candidateDigest: manifest.candidateDigest,
    sourceCommit: manifest.sourceCommit,
    targetBaselineCommit: manifest.targetBaselineCommit,
    checkerVersion: manifest.checkerVersion,
    checkerBundleDigest: manifest.checkerRelease.bundleDigest,
    executionCommit: receipt.worktreeProof.executionCommit,
    compositionHeadCommit: prCheck.headCommit,
    mergeCommit: mainPostMerge.mergeCommit
  };
  for (const field of [
    "candidateDigest", "checkerBundleDigest"
  ]) assertSha256(closure.binding[field], "V2_FINALIZATION_BINDING_INVALID", `closure binding.${field}`);
  for (const field of [
    "sourceCommit", "targetBaselineCommit", "executionCommit", "compositionHeadCommit", "mergeCommit"
  ]) assertCommit(closure.binding[field], "V2_FINALIZATION_BINDING_INVALID", `closure binding.${field}`);
  if (stableJson(closure.binding) !== stableJson(expected)) {
    fail("V2_FINALIZATION_BINDING_INVALID", "Closure identity does not bind the exact Manifest, Receipt, PR head, and main merge.");
  }
}

function validateA11Replay(a11, manifest, receipt, closure) {
  assertExactKeys(a11, [
    "schemaVersion", "role", "result", "producedAt", "executionCommit", "manifest", "binding",
    "canonicalReceipt", "independentReplay", "canonicalVerification", "parentPackageStatus",
    "pilotUnitStatus", "liveAllowed", "maturityClaim"
  ], "V2_FINALIZATION_A11_REPLAY_INVALID", "A11 independent replay");
  if (
    a11.schemaVersion !== "promotion-a11-independent-replay.v2" ||
    a11.role !== "A11" ||
    a11.result !== "pass" ||
    a11.executionCommit !== receipt.worktreeProof.executionCommit ||
    stableJson(a11.manifest) !== stableJson(receipt.manifest) ||
    a11.binding.candidateDigest !== manifest.candidateDigest ||
    a11.binding.sourceCommit !== manifest.sourceCommit ||
    a11.binding.targetBaselineCommit !== manifest.targetBaselineCommit ||
    a11.binding.checkerVersion !== manifest.checkerVersion ||
    a11.binding.checkerBundleDigest !== manifest.checkerRelease.bundleDigest ||
    a11.canonicalReceipt.path !== closure.artifacts.receipt.path ||
    a11.canonicalReceipt.fileRawSha256 !== closure.artifacts.receipt.rawSha256 ||
    a11.canonicalReceipt.runId !== receipt.run.runId ||
    a11.canonicalReceipt.rawReceiptDigest !== receipt.rawReceiptDigest ||
    a11.canonicalReceipt.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    a11.independentReplay.result !== "pass" ||
    a11.independentReplay.runId === receipt.run.runId ||
    a11.independentReplay.rawReceiptDigest === receipt.rawReceiptDigest ||
    a11.independentReplay.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    a11.independentReplay.semanticDigestMatchesCanonical !== true ||
    a11.independentReplay.rawDigestDiffersFromCanonical !== true ||
    a11.independentReplay.detachedExactExecutionCommit !== true ||
    a11.independentReplay.cleanBeforeAndAfter !== true ||
    a11.independentReplay.allHardGatesPass !== true ||
    a11.independentReplay.candidateSourceByteIdentical !== true ||
    a11.independentReplay.forbiddenChangedPathCount !== 0 ||
    a11.independentReplay.rollbackExactPreimage !== true ||
    a11.independentReplay.externalSideEffectCount !== 0 ||
    a11.canonicalVerification.result !== "pass" ||
    a11.canonicalVerification.valid !== true ||
    a11.canonicalVerification.semanticReplayMatches !== true ||
    a11.canonicalVerification.executionCommitMatches !== true ||
    a11.parentPackageStatus !== "candidate-only" ||
    a11.pilotUnitStatus !== "shadow_passed" ||
    a11.liveAllowed !== false
  ) {
    fail("V2_FINALIZATION_A11_REPLAY_INVALID", "A11 independent replay is stale, reused, or incomplete.");
  }
}

function validateA22Isolation(a22, manifest, receipt, closure) {
  assertExactKeys(a22, [
    "schemaVersion", "role", "result", "producedAt", "executionCommit", "manifest", "receipt",
    "cleanSourceProof", "outputIsolationProof", "preflightBuildProof", "externalSideEffects",
    "parentPackageStatus", "pilotUnitStatus", "liveAllowed", "maturityClaim"
  ], "V2_FINALIZATION_A22_ISOLATION_INVALID", "A22 shadow isolation");
  const sideEffects = a22.externalSideEffects;
  if (
    a22.schemaVersion !== "promotion-a22-shadow-isolation.v2" ||
    a22.role !== "A22" ||
    a22.result !== "pass" ||
    a22.executionCommit !== receipt.worktreeProof.executionCommit ||
    stableJson(a22.manifest) !== stableJson(receipt.manifest) ||
    a22.receipt.path !== closure.artifacts.receipt.path ||
    a22.receipt.fileRawSha256 !== closure.artifacts.receipt.rawSha256 ||
    a22.receipt.rawReceiptDigest !== receipt.rawReceiptDigest ||
    a22.receipt.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    a22.cleanSourceProof.worktreeClean !== true ||
    a22.cleanSourceProof.exactExecutionCommit !== true ||
    a22.cleanSourceProof.candidateSnapshotMatchesReceipt !== true ||
    a22.cleanSourceProof.forbiddenSnapshotMatchesReceipt !== true ||
    a22.cleanSourceProof.candidateSourceByteIdentical !== true ||
    a22.cleanSourceProof.forbiddenChangedPathCount !== 0 ||
    a22.outputIsolationProof.exactPreimageRestored !== true ||
    a22.outputIsolationProof.preimage !== "absent" ||
    a22.outputIsolationProof.postimage !== "absent" ||
    a22.preflightBuildProof.typeCheckPassed !== true ||
    a22.preflightBuildProof.productionBuildPassed !== true ||
    a22.preflightBuildProof.nextEnvPreimageRestored !== true ||
    a22.preflightBuildProof.deploymentPerformed !== false ||
    !isPlainObject(sideEffects) ||
    Object.values(sideEffects).some((value) => value !== 0) ||
    a22.parentPackageStatus !== "candidate-only" ||
    a22.pilotUnitStatus !== "shadow_passed" ||
    a22.liveAllowed !== false ||
    manifest.authorizations.liveAllowed !== false
  ) {
    fail("V2_FINALIZATION_A22_ISOLATION_INVALID", "A22 isolation, build, rollback, or zero-side-effect proof is incomplete.");
  }
}

function validateLegacyDisposition(closure, legacy, manifest, receipt) {
  assertExactKeys(closure.legacyDisposition, [
    "packageId", "deadline", "terminalDecision", "activeExceptionCount",
    "unresolvedConflictCount", "runtimeGraphBlindSpotCount"
  ], "V2_FINALIZATION_LEGACY_INVALID", "closure legacy disposition");
  const known = Array.isArray(legacy.resolutions)
    ? legacy.resolutions.find(({ historicalClass }) => historicalClass === "known")
    : null;
  const runtime = receipt.runtimeAndLegacyProof;
  const reachability = receipt.liveReachabilityProof;
  if (
    legacy.schemaVersion !== "promotion-legacy-resolution-registry.v2" ||
    legacy.targetBaselineCommit !== manifest.targetBaselineCommit ||
    manifest.legacyResolution.registryPath !== closure.artifacts.legacyRegistry.path ||
    manifest.legacyResolution.rawSha256 !== closure.artifacts.legacyRegistry.rawSha256 ||
    legacy.ratchet?.originalPackageId !== "us-ca-k5-knowledge-point-practice-v1" ||
    legacy.ratchet?.expiresAt !== "2026-09-24T00:00:00Z" ||
    legacy.ratchet?.terminalDecision !== "remove-live" ||
    !Array.isArray(legacy.ratchet?.activeExceptions) ||
    legacy.ratchet.activeExceptions.length !== 0 ||
    Number.isNaN(Date.parse(legacy.ratchet.closedAt)) ||
    Date.parse(legacy.ratchet.closedAt) > Date.parse(legacy.ratchet.expiresAt) ||
    legacy.resolutions.length !== 18 ||
    known?.decision !== "de-reached" ||
    known?.candidate?.packageId !== "us-ca-k5-knowledge-point-practice-v1" ||
    known?.candidate?.idCount !== 492 ||
    known?.liveProjection !== null ||
    known?.enforcement?.candidateMustBeUnreachable !== true ||
    known?.enforcement?.liveAllowed !== false ||
    runtime?.resolutionCount !== 18 ||
    runtime?.dereachedCount !== 15 ||
    runtime?.selectedIdentityHits !== 0 ||
    runtime?.liveAllowed !== false ||
    reachability?.selectedCandidateHitCount !== 0 ||
    reachability?.unresolvedDynamicImportCount !== 0 ||
    reachability?.unknownLiveRegistryCount !== 0 ||
    reachability?.scanBlindSpotCount !== 0 ||
    reachability?.liveAllowed !== false ||
    closure.legacyDisposition.packageId !== legacy.ratchet.originalPackageId ||
    closure.legacyDisposition.deadline !== legacy.ratchet.expiresAt ||
    closure.legacyDisposition.terminalDecision !== legacy.ratchet.terminalDecision ||
    closure.legacyDisposition.activeExceptionCount !== 0 ||
    closure.legacyDisposition.unresolvedConflictCount !== 0 ||
    closure.legacyDisposition.runtimeGraphBlindSpotCount !== 0
  ) {
    fail("V2_FINALIZATION_LEGACY_INVALID", "Legacy conflict disposal or runtime graph proof is incomplete or stale.");
  }
}

function validatePrCheck(prCheck, manifest, receipt, closure) {
  assertExactKeys(prCheck, [
    "schemaVersion", "role", "result", "repository", "pullRequestNumber", "headCommit",
    "workflowName", "checkName", "event", "runId", "runAttempt", "jobId", "conclusion",
    "manifestRawSha256", "candidateDigest", "semanticReceiptDigest", "liveAllowed",
    "observedAt", "url", "trustBoundary"
  ], "V2_FINALIZATION_PR_CHECK_INVALID", "PR check proof");
  assertCommit(prCheck.headCommit, "V2_FINALIZATION_PR_CHECK_INVALID", "PR check headCommit");
  assertIsoTimestamp(prCheck.observedAt, "V2_FINALIZATION_PR_CHECK_INVALID", "PR check observedAt");
  assertGithubUrl(
    prCheck.url,
    "V2_FINALIZATION_PR_CHECK_INVALID",
    "PR check URL",
    `/${REPOSITORY}/actions/runs/${prCheck.runId}`
  );
  if (
    prCheck.schemaVersion !== "promotion-pr-check-proof.v2" ||
    prCheck.role !== "A11" ||
    prCheck.result !== "pass" ||
    prCheck.repository !== REPOSITORY ||
    !Number.isSafeInteger(prCheck.pullRequestNumber) ||
    prCheck.pullRequestNumber <= 0 ||
    prCheck.workflowName !== "promotion-shadow-gate" ||
    prCheck.checkName !== "promotion-shadow-gate" ||
    prCheck.event !== "pull_request" ||
    !DECIMAL_ID_PATTERN.test(prCheck.runId) ||
    !Number.isSafeInteger(prCheck.runAttempt) ||
    prCheck.runAttempt <= 0 ||
    !DECIMAL_ID_PATTERN.test(prCheck.jobId) ||
    prCheck.conclusion !== "success" ||
    prCheck.manifestRawSha256 !== closure.artifacts.manifest.rawSha256 ||
    prCheck.candidateDigest !== manifest.candidateDigest ||
    prCheck.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    prCheck.liveAllowed !== false ||
    prCheck.trustBoundary !== TRUST_BOUNDARY ||
    prCheck.headCommit !== closure.binding.compositionHeadCommit
  ) {
    fail("V2_FINALIZATION_PR_CHECK_INVALID", "PR required-check proof is not an exact successful non-live readback.");
  }
}

function validateRequiredChecks(requiredChecks) {
  assertExactKeys(requiredChecks, [
    "schemaVersion", "role", "result", "repository", "branch", "checks", "strict",
    "enforceAdmins", "required", "observedAt", "apiUrl", "trustBoundary"
  ], "V2_FINALIZATION_REQUIRED_CHECK_INVALID", "required-check proof");
  assertIsoTimestamp(
    requiredChecks.observedAt,
    "V2_FINALIZATION_REQUIRED_CHECK_INVALID",
    "required-check observedAt"
  );
  assertApiUrl(
    requiredChecks.apiUrl,
    "V2_FINALIZATION_REQUIRED_CHECK_INVALID",
    "required-check API URL",
    `/repos/${REPOSITORY}/branches/main/protection`
  );
  if (
    requiredChecks.schemaVersion !== "promotion-required-check-proof.v2" ||
    requiredChecks.role !== "A22" ||
    requiredChecks.result !== "pass" ||
    requiredChecks.repository !== REPOSITORY ||
    requiredChecks.branch !== "main" ||
    stableJson(requiredChecks.checks) !== stableJson(EXPECTED_REQUIRED_CHECKS) ||
    requiredChecks.strict !== false ||
    requiredChecks.enforceAdmins !== true ||
    requiredChecks.required !== true ||
    requiredChecks.trustBoundary !== TRUST_BOUNDARY
  ) {
    fail("V2_FINALIZATION_REQUIRED_CHECK_INVALID", "Branch protection does not require the exact GitHub Actions checks.");
  }
}

function validateMainPostMerge(mainProof, manifest, receipt, closure) {
  assertExactKeys(mainProof, [
    "schemaVersion", "role", "result", "repository", "branch", "event", "mergeCommit",
    "workflowName", "checkName", "runId", "runAttempt", "jobId", "conclusion",
    "manifestRawSha256", "candidateDigest", "semanticReceiptDigest", "requiredCheckObserved",
    "liveAllowed", "observedAt", "url", "trustBoundary"
  ], "V2_FINALIZATION_MAIN_PROOF_INVALID", "main post-merge proof");
  assertCommit(mainProof.mergeCommit, "V2_FINALIZATION_MAIN_PROOF_INVALID", "main proof mergeCommit");
  assertIsoTimestamp(mainProof.observedAt, "V2_FINALIZATION_MAIN_PROOF_INVALID", "main proof observedAt");
  assertGithubUrl(
    mainProof.url,
    "V2_FINALIZATION_MAIN_PROOF_INVALID",
    "main proof URL",
    `/${REPOSITORY}/actions/runs/${mainProof.runId}`
  );
  if (
    mainProof.schemaVersion !== "promotion-main-postmerge-proof.v2" ||
    mainProof.role !== "A22" ||
    mainProof.result !== "pass" ||
    mainProof.repository !== REPOSITORY ||
    mainProof.branch !== "main" ||
    mainProof.event !== "push" ||
    mainProof.workflowName !== "promotion-shadow-gate" ||
    mainProof.checkName !== "promotion-shadow-gate" ||
    !DECIMAL_ID_PATTERN.test(mainProof.runId) ||
    !Number.isSafeInteger(mainProof.runAttempt) ||
    mainProof.runAttempt <= 0 ||
    !DECIMAL_ID_PATTERN.test(mainProof.jobId) ||
    mainProof.conclusion !== "success" ||
    mainProof.manifestRawSha256 !== closure.artifacts.manifest.rawSha256 ||
    mainProof.candidateDigest !== manifest.candidateDigest ||
    mainProof.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    mainProof.requiredCheckObserved !== true ||
    mainProof.liveAllowed !== false ||
    mainProof.trustBoundary !== TRUST_BOUNDARY ||
    mainProof.mergeCommit !== closure.binding.mergeCommit
  ) {
    fail("V2_FINALIZATION_MAIN_PROOF_INVALID", "Main post-merge proof is not an exact successful required-check push readback.");
  }
}

function validateA25Closeout(a25, prCheck, mainProof) {
  assertExactKeys(a25, [
    "schemaVersion", "role", "result", "repository", "pullRequestNumber", "reviewedHeadCommit",
    "mergeCommit", "finalDisposition", "ownerPackageFinalStates", "authorizationReference",
    "liveAllowed", "observedAt", "trustBoundary"
  ], "V2_FINALIZATION_A25_CLOSEOUT_INVALID", "A25 closeout");
  assertCommit(a25.reviewedHeadCommit, "V2_FINALIZATION_A25_CLOSEOUT_INVALID", "A25 reviewedHeadCommit");
  assertCommit(a25.mergeCommit, "V2_FINALIZATION_A25_CLOSEOUT_INVALID", "A25 mergeCommit");
  assertIsoTimestamp(a25.observedAt, "V2_FINALIZATION_A25_CLOSEOUT_INVALID", "A25 observedAt");
  assertGithubUrl(
    a25.authorizationReference,
    "V2_FINALIZATION_A25_CLOSEOUT_INVALID",
    "A25 authorization reference",
    `/${REPOSITORY}/pull/${prCheck.pullRequestNumber}`
  );
  const expectedStates = EXPECTED_CLOSEOUT_OWNERS.map((owner) => ({ owner, finalState: "reviewed commit" }));
  if (
    a25.schemaVersion !== "promotion-review-package-closeout.v2" ||
    a25.role !== "A25" ||
    a25.result !== "pass" ||
    a25.repository !== REPOSITORY ||
    a25.pullRequestNumber !== prCheck.pullRequestNumber ||
    a25.reviewedHeadCommit !== prCheck.headCommit ||
    a25.mergeCommit !== mainProof.mergeCommit ||
    a25.finalDisposition !== "reviewed commit" ||
    stableJson(a25.ownerPackageFinalStates) !== stableJson(expectedStates) ||
    a25.liveAllowed !== false ||
    a25.trustBoundary !== TRUST_BOUNDARY
  ) {
    fail("V2_FINALIZATION_A25_CLOSEOUT_INVALID", "A25 did not assign one reviewed-commit disposition to every owner package.");
  }
}

function validateEvidenceSequence(prCheck, requiredChecks, mainProof, a25Closeout) {
  const sequence = [
    Date.parse(prCheck.observedAt),
    Date.parse(requiredChecks.observedAt),
    Date.parse(mainProof.observedAt),
    Date.parse(a25Closeout.observedAt)
  ];
  if (sequence.some((value) => Number.isNaN(value)) || sequence.some((value, index) => index > 0 && value < sequence[index - 1])) {
    fail("V2_FINALIZATION_SEQUENCE_INVALID", "External readbacks are not ordered PR check, required protection, main push, then A25 closeout.");
  }
}

function validateClosureOutcome(closure) {
  assertExactKeys(closure.receiptDigests, [
    "rawReceiptDigest", "semanticReceiptDigest", "independentRawReceiptDigest"
  ], "V2_FINALIZATION_RECEIPT_MISMATCH", "closure receipt digests");
  for (const [field, value] of Object.entries(closure.receiptDigests)) {
    assertSha256(value, "V2_FINALIZATION_RECEIPT_MISMATCH", `closure receiptDigests.${field}`);
  }
  assertExactKeys(closure.stateTransition, [
    "fromState", "toState", "parentPackageStatus", "pilotUnitStatus", "liveAllowed",
    "liveEvidence", "maturityClaim"
  ], "V2_FINALIZATION_STATE_INVALID", "closure state transition");
  if (
    stableJson(closure.stateTransition) !== stableJson({
      fromState: "shadow_ready",
      toState: "shadow_passed",
      parentPackageStatus: "candidate-only",
      pilotUnitStatus: "shadow_passed",
      liveAllowed: false,
      liveEvidence: "none",
      maturityClaim: MATURITY_CLAIM
    }) ||
    !Array.isArray(closure.unmetShadowConditions) ||
    closure.unmetShadowConditions.length !== 0 ||
    stableJson(closure.liveBlockers) !== stableJson([
      "missing-zh-localization",
      "missing-zhHans-localization",
      "live-integration-and-release-unproven"
    ]) ||
    closure.trustBoundary !== TRUST_BOUNDARY
  ) {
    fail("V2_FINALIZATION_STATE_INVALID", "Closure may mature only the non-live Shadow state with no unmet Shadow condition.");
  }
}

export function validateV2ShadowClosure(closure, artifacts) {
  assertExactKeys(closure, [
    "schemaVersion", "binding", "artifacts", "receiptDigests", "legacyDisposition",
    "stateTransition", "unmetShadowConditions", "liveBlockers", "trustBoundary", "closureDigest"
  ], "V2_FINALIZATION_CLOSURE_INVALID", "Promotion Shadow closure");
  if (closure.schemaVersion !== PROMOTION_SHADOW_CLOSURE_V2_SCHEMA) {
    fail("V2_FINALIZATION_CLOSURE_INVALID", "Unsupported Promotion Shadow closure schema.");
  }
  assertSelfDigest(
    closure,
    "closureDigest",
    "V2_FINALIZATION_CLOSURE_DIGEST_INVALID",
    "Promotion Shadow closure"
  );
  const values = validateAllArtifacts(closure, artifacts);
  const { manifest, receipt } = validateManifestAndReceipt(closure, values);
  validateClosureOutcome(closure);
  validatePrCheck(values.prCheck, manifest, receipt, closure);
  validateRequiredChecks(values.requiredChecks);
  validateMainPostMerge(values.mainPostMerge, manifest, receipt, closure);
  validateClosureBinding(closure, manifest, receipt, values.prCheck, values.mainPostMerge);
  if (
    closure.receiptDigests.rawReceiptDigest !== receipt.rawReceiptDigest ||
    closure.receiptDigests.semanticReceiptDigest !== receipt.semanticReceiptDigest ||
    closure.receiptDigests.independentRawReceiptDigest !== values.a11Replay.independentReplay?.rawReceiptDigest ||
    closure.receiptDigests.independentRawReceiptDigest === receipt.rawReceiptDigest
  ) {
    fail("V2_FINALIZATION_RECEIPT_MISMATCH", "Closure Receipt digest set does not prove one distinct semantic replay.");
  }
  validateA11Replay(values.a11Replay, manifest, receipt, closure);
  validateA22Isolation(values.a22Isolation, manifest, receipt, closure);
  validateLegacyDisposition(closure, values.legacyRegistry, manifest, receipt);
  validateA25Closeout(values.a25Closeout, values.prCheck, values.mainPostMerge);
  validateEvidenceSequence(values.prCheck, values.requiredChecks, values.mainPostMerge, values.a25Closeout);
  return {
    result: "pass",
    state: "shadow_passed",
    closureDigest: closure.closureDigest,
    semanticReceiptDigest: receipt.semanticReceiptDigest,
    liveAllowed: false
  };
}

function validateLifecycleEvent(event, index, previousDigest) {
  assertExactKeys(event, [
    "sequence", "eventId", "fromState", "toState", "evidence", "previousEventDigest", "eventDigest"
  ], "V2_FINALIZATION_REGISTRY_EVENT_INVALID", `lifecycle event ${index + 1}`);
  if (
    event.sequence !== index + 1 ||
    typeof event.eventId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(event.eventId) ||
    event.previousEventDigest !== previousDigest
  ) {
    fail("V2_FINALIZATION_REGISTRY_EVENT_INVALID", "Lifecycle event sequence or previous digest is invalid.");
  }
  assertSelfDigest(
    event,
    "eventDigest",
    "V2_FINALIZATION_REGISTRY_EVENT_INVALID",
    `lifecycle event ${index + 1}`
  );
}

export function validateV2LifecycleRegistry(registry, context = {}) {
  assertExactKeys(registry, [
    "schemaVersion", "pilotUnitId", "attemptId", "parentPackageStatus", "pilotUnitStatus",
    "liveAllowed", "liveEvidence", "maturityClaim", "events", "registryDigest"
  ], "V2_FINALIZATION_REGISTRY_INVALID", "Promotion lifecycle registry");
  if (registry.schemaVersion !== PROMOTION_LIFECYCLE_REGISTRY_V2_SCHEMA) {
    fail("V2_FINALIZATION_REGISTRY_INVALID", "Unsupported Promotion lifecycle registry schema.");
  }
  assertSelfDigest(
    registry,
    "registryDigest",
    "V2_FINALIZATION_REGISTRY_DIGEST_INVALID",
    "Promotion lifecycle registry"
  );
  if (registry.liveAllowed !== false || registry.liveEvidence !== "none") {
    fail("V2_FINALIZATION_LIVE_FORBIDDEN", "Final Shadow registry may never authorize live behavior or evidence.");
  }
  if (!Array.isArray(registry.events) || registry.events.length !== 3) {
    fail("V2_FINALIZATION_REGISTRY_TRANSITION_INVALID", "Lifecycle registry must contain exactly three ordered state events.");
  }
  const { manifest: manifestArtifact, evidenceIndex: indexArtifact, closure, closurePath, closureArtifacts } = context;
  assertPlainObject(manifestArtifact, "V2_FINALIZATION_REGISTRY_INVALID", "registry Manifest context");
  assertPlainObject(indexArtifact, "V2_FINALIZATION_REGISTRY_INVALID", "registry evidence-index context");
  const manifest = validateV2Manifest(manifestArtifact.value);
  validateV2ShadowClosure(closure, closureArtifacts);
  if (
    registry.pilotUnitId !== manifest.pilotUnitId ||
    registry.attemptId !== manifest.attemptId ||
    registry.parentPackageStatus !== "candidate-only" ||
    registry.pilotUnitStatus !== "shadow_passed" ||
    registry.maturityClaim !== MATURITY_CLAIM
  ) {
    fail("V2_FINALIZATION_REGISTRY_INVALID", "Lifecycle registry does not bind the exact mature non-live Shadow unit.");
  }
  let previousDigest = null;
  registry.events.forEach((event, index) => {
    validateLifecycleEvent(event, index, previousDigest);
    previousDigest = event.eventDigest;
  });
  const [genesis, ready, passed] = registry.events;
  const expectedManifestRef = { path: manifestArtifact.path, rawSha256: sha256(manifestArtifact.bytes) };
  const expectedIndexRef = { path: indexArtifact.path, rawSha256: sha256(indexArtifact.bytes) };
  if (
    genesis.eventId !== `${manifest.attemptId}-candidate-hold` ||
    genesis.fromState !== null ||
    genesis.toState !== "candidate_hold" ||
    genesis.evidence !== null ||
    ready.eventId !== `${manifest.attemptId}-shadow-ready` ||
    ready.fromState !== "candidate_hold" ||
    ready.toState !== "shadow_ready" ||
    stableJson(ready.evidence) !== stableJson({
      manifest: expectedManifestRef,
      evidenceIndex: expectedIndexRef
    }) ||
    passed.eventId !== `${manifest.attemptId}-shadow-passed` ||
    passed.fromState !== "shadow_ready" ||
    passed.toState !== "shadow_passed" ||
    stableJson(passed.evidence) !== stableJson({
      closure: { path: closurePath, digest: closure.closureDigest }
    })
  ) {
    fail("V2_FINALIZATION_REGISTRY_TRANSITION_INVALID", "Lifecycle registry skips or misbinds a required state transition.");
  }
  try {
    assertSafeRepoRelativePath(closurePath);
  } catch {
    fail("V2_FINALIZATION_REGISTRY_TRANSITION_INVALID", "Lifecycle closure path is unsafe.");
  }
  return {
    result: "pass",
    state: "shadow_passed",
    registryDigest: registry.registryDigest,
    liveAllowed: false
  };
}

async function repositoryPathExists(repoRoot, relativePath) {
  const absolutePath = path.resolve(repoRoot, ...relativePath.split("/"));
  try {
    await lstat(absolutePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    fail("V2_FINALIZATION_REPOSITORY_READ_INVALID", "Finalization artifact existence could not be read safely.");
  }
}

async function readRepositoryArtifact(repoRoot, relativePath, label) {
  let loaded;
  try {
    loaded = await readAuthoritativeFile(repoRoot, relativePath);
  } catch {
    fail("V2_FINALIZATION_REPOSITORY_READ_INVALID", `${label} is not one authoritative regular repository file.`);
  }
  let value;
  try {
    value = parseCanonicalJsonBytes(
      loaded.bytes,
      "V2_FINALIZATION_REPOSITORY_READ_INVALID",
      label
    );
  } catch (error) {
    if (error instanceof PromotionGateError) throw error;
    fail("V2_FINALIZATION_REPOSITORY_READ_INVALID", `${label} is not canonical UTF-8 JSON.`);
  }
  if (!isPlainObject(value)) {
    fail("V2_FINALIZATION_REPOSITORY_READ_INVALID", `${label} must contain one JSON object.`);
  }
  return { path: relativePath, bytes: loaded.bytes, value };
}

export async function verifyRepositoryV2Finalization(repoRoot) {
  assertNonEmptyString(
    repoRoot,
    "V2_FINALIZATION_REPOSITORY_READ_INVALID",
    "Finalization repository root"
  );
  if (!path.isAbsolute(repoRoot)) {
    fail("V2_FINALIZATION_REPOSITORY_READ_INVALID", "Finalization repository root must be absolute.");
  }
  const [closurePresent, registryPresent] = await Promise.all([
    repositoryPathExists(repoRoot, PROMOTION_SHADOW_CLOSURE_V2_PATH),
    repositoryPathExists(repoRoot, PROMOTION_LIFECYCLE_REGISTRY_V2_PATH)
  ]);
  if (!closurePresent && !registryPresent) {
    return {
      result: "pending",
      state: "shadow_ready",
      closurePresent: false,
      registryPresent: false,
      liveAllowed: false
    };
  }
  if (closurePresent !== registryPresent) {
    fail(
      "V2_FINALIZATION_PARTIAL",
      "Promotion finalization must add closure and lifecycle registry together or neither."
    );
  }
  const [closureArtifact, registryArtifact] = await Promise.all([
    readRepositoryArtifact(repoRoot, PROMOTION_SHADOW_CLOSURE_V2_PATH, "Promotion Shadow closure"),
    readRepositoryArtifact(repoRoot, PROMOTION_LIFECYCLE_REGISTRY_V2_PATH, "Promotion lifecycle registry")
  ]);
  assertExactKeys(
    closureArtifact.value.artifacts,
    ARTIFACT_KEYS,
    "V2_FINALIZATION_CLOSURE_INVALID",
    "Promotion Shadow closure artifacts"
  );
  const artifactEntries = await Promise.all(ARTIFACT_KEYS.map(async (key) => {
    const reference = closureArtifact.value.artifacts[key];
    assertExactKeys(
      reference,
      ["path", "rawSha256"],
      "V2_FINALIZATION_ARTIFACT_INVALID",
      `Promotion Shadow closure ${key} reference`
    );
    try {
      assertSafeRepoRelativePath(reference.path);
    } catch {
      fail("V2_FINALIZATION_ARTIFACT_INVALID", `Promotion Shadow closure ${key} path is unsafe.`);
    }
    return [key, await readRepositoryArtifact(repoRoot, reference.path, `Promotion finalization ${key}`)];
  }));
  const artifacts = Object.fromEntries(artifactEntries);
  const closureResult = validateV2ShadowClosure(closureArtifact.value, artifacts);
  const registryResult = validateV2LifecycleRegistry(registryArtifact.value, {
    manifest: artifacts.manifest,
    evidenceIndex: artifacts.evidenceIndex,
    closure: closureArtifact.value,
    closurePath: PROMOTION_SHADOW_CLOSURE_V2_PATH,
    closureArtifacts: artifacts
  });
  return {
    result: "pass",
    state: "shadow_passed",
    closureDigest: closureResult.closureDigest,
    registryDigest: registryResult.registryDigest,
    semanticReceiptDigest: closureResult.semanticReceiptDigest,
    liveAllowed: false
  };
}
