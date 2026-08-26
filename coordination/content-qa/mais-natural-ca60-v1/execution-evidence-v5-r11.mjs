import { execFile as nodeExecFile } from "node:child_process";
import { createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import V5_R10_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r10/runner-registration.json" with { type: "json" };
import R10_DISCREPANCY_REVIEW from "../../reports/mais-natural-ca60-v5-r10-runner-review/independent-runner-review-receipt.json" with { type: "json" };
import R10_REVIEWER_IDENTITY_ANCHOR from "../../reports/mais-natural-ca60-v5-r10-review-identity-a11/public-review-identity-anchor.json" with { type: "json" };
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
import {
  collectGitSourceClosureV5R6,
  sourceManifestFromGitV5R6,
  sourceManifestRootV5R6,
} from "./source-closure-v5-r6.mjs";
import {
  validateFreshRunnerReviewV5R11,
} from "./review-evidence-v5-r11.mjs";

const execFileAsync = promisify(nodeExecFile);
const HASH = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const REGISTRATION_PATH = "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r11/runner-registration.json";
const R10_DISCREPANCY_REVIEW_PATH =
  "coordination/reports/mais-natural-ca60-v5-r10-runner-review/independent-runner-review-receipt.json";
const R10_REVIEWER_IDENTITY_ANCHOR_PATH =
  "coordination/reports/mais-natural-ca60-v5-r10-review-identity-a11/public-review-identity-anchor.json";
const REVIEWER_IDENTITY_ANCHOR_PATH =
  "coordination/reports/mais-natural-ca60-v5-r11-review-identity-a11/public-review-identity-anchor.json";
const A07_CLOSEOUT_ROOT = "coordination/reports/mais-natural-ca60-v5-r11-runner-closeout-a07";
const A07_CLOSEOUT_RECEIPT_PATH = `${A07_CLOSEOUT_ROOT}/a07-runner-closeout-receipt.json`;
const A07_SESSION_LOG_PATH =
  "coordination/session-logs/2026-08-27-A07-mais-natural-ca60-v5-r11.md";
const R11_REVIEW_ROOT = "coordination/reports/mais-natural-ca60-v5-r11-runner-review";

export const V5_R10_REGISTRATION_HASH =
  "99b298b415d42756e8c3cc9b513e0b5ef6b33c8fe184ba98247fccc9eca8d9ed";
export const V5_R10_REGISTRATION_COMMIT = "f3605158d12b601a6ec6b73a39998f156c4a49f3";
export const V5_R10_SOURCE_COMMIT = "43e88fa73acb38eca7926360f37c72d9115641f3";
export const V5_R10_CLOSEOUT_COMMIT = "39f5a607dd64d71b18f1ce2cfd904a3c440977b0";
export const V5_R10_DISCREPANCY_REVIEW_HASH =
  "e8aeaf8b5d4567a5e2f936baacea0ecd64487a00ab976a9f3106e35869ef9bde";
export const V5_R10_DISCREPANCY_REVIEW_COMMIT =
  "81e5d632cd19f5f9645a9f8c49d8397f081d76b7";
export const V5_R11_REVIEWER_IDENTITY_ANCHOR_COMMIT =
  "42b81cea57029b97f9702e15d79b20860d6a246d";
export const V5_R11_REVIEWER_IDENTITY_ANCHOR_ORIGIN_COMMIT =
  "42b81cea57029b97f9702e15d79b20860d6a246d";
export const V5_R11_REVIEWER_IDENTITY_ANCHOR_HASH =
  "0339b22181cf62a5d85b6e7163622d403241b76319ba0150d198533f8003d570";
export const V5_R11_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH =
  "36233641da9de2db0dfa31fc6970db9e6b01ab11104ed8c89376925f669e0288";

export const REMEDIATED_FINDING_IDS_V5_R11 = Object.freeze([
  ...Array.from({ length: 8 }, (_, index) =>
    `A11-R8-${String(index + 1).padStart(3, "0")}`),
  "A11-R9-001",
  "A11-R10-001",
  "A11-R10-002",
]);

export const PRODUCTION_ENTRYPOINTS_V5_R11 = Object.freeze([
  `${ROOT}activation-guard-v5-r11.mjs`,
  `${ROOT}attempt-graph-v5-r11.mjs`,
  `${ROOT}attempt-recovery-v5-r11.mjs`,
  `${ROOT}execution-evidence-v5-r11.mjs`,
  `${ROOT}native-provider-adapter-v5-r11.mjs`,
  `${ROOT}review-evidence-v5-r11.mjs`,
  `${ROOT}runner-v5-r11-cli.mjs`,
  `${ROOT}runner-v5-r11-runtime.mjs`,
  `${ROOT}schema-contract-v5-r11.mjs`,
  `${ROOT}scorer-verifier-v5-r11.mjs`,
  `${ROOT}statistical-kernel-v5-r11.mjs`,
  `${ROOT}trusted-provider-evidence-v5-r11.mjs`,
  `${ROOT}workflow-index-v5-r11.mjs`,
].sort());

export const R11_REVIEW_PATHS = Object.freeze({
  receipt: `${R11_REVIEW_ROOT}/independent-runner-review-receipt.json`,
  verifierSourceManifest: `${R11_REVIEW_ROOT}/verifier-source-manifest.json`,
  dependencyLockManifest: `${R11_REVIEW_ROOT}/dependency-lock-manifest.json`,
  staticImportGraphReceipt: `${R11_REVIEW_ROOT}/independent-static-import-graph-receipt.json`,
  forbiddenPrimaryScorerPathScanReceipt:
    `${R11_REVIEW_ROOT}/forbidden-primary-scorer-path-scan-receipt.json`,
  commandRuntimeReceipt: `${R11_REVIEW_ROOT}/independent-command-runtime-receipt.json`,
  independentSourceEnumerationReceipt:
    `${R11_REVIEW_ROOT}/independent-source-enumeration-receipt.json`,
});

function add(errors, condition, message) {
  if (!condition && !errors.includes(message)) errors.push(message);
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactSet(actual, expected) {
  return Array.isArray(actual) && new Set(actual).size === actual.length
    && canonicalJsonV5R3([...actual].sort(compare))
      === canonicalJsonV5R3([...expected].sort(compare));
}

function componentHash(manifest, sourcePaths) {
  const expected = [...new Set(sourcePaths)].sort(compare);
  const selected = (manifest ?? []).filter(({ path: sourcePath }) => expected.includes(sourcePath));
  return selected.length === expected.length ? sha256V5R3(canonicalJsonV5R3(selected)) : null;
}

function sortedManifest(manifest) {
  return Array.isArray(manifest) && manifest.length > 0
    && new Set(manifest.map(({ path: sourcePath }) => sourcePath)).size === manifest.length
    && canonicalJsonV5R3(manifest.map(({ path: sourcePath }) => sourcePath))
      === canonicalJsonV5R3(manifest.map(({ path: sourcePath }) => sourcePath).sort(compare))
    && manifest.every((row) => typeof row.path === "string" && row.path.length > 0
      && !path.isAbsolute(row.path) && !path.normalize(row.path).split(path.sep).includes("..")
      && Number.isSafeInteger(row.byteLength) && row.byteLength > 0 && HASH.test(row.sha256 ?? ""));
}

export function runtimeSourceEnumerationRootV5R11(manifest) {
  if (!sortedManifest(manifest)) return null;
  return sha256V5R3(canonicalJsonV5R3(manifest.map(({ path: sourcePath, sha256, byteLength }) =>
    [sourcePath, sha256, byteLength])));
}

export function computeClosureKernelsV5R11(productionSourceManifest) {
  const schemaPaths = (productionSourceManifest ?? []).map(({ path: sourcePath }) => sourcePath)
    .filter((sourcePath) => sourcePath.startsWith(`${ROOT}schemas/`) && sourcePath.endsWith(".schema.json"));
  return Object.freeze({
    statisticsAndItemCustodyHash: componentHash(productionSourceManifest,
      [`${ROOT}statistical-kernel-v5-r11.mjs`, `${ROOT}scorer-verifier-v5-r11.mjs`]),
    attemptGraphAndRecoveryHash: componentHash(productionSourceManifest,
      [`${ROOT}attempt-graph-v5-r11.mjs`, `${ROOT}attempt-recovery-v5-r11.mjs`]),
    trustedProviderEvidenceHash: componentHash(productionSourceManifest,
      [`${ROOT}trusted-provider-evidence-v5-r11.mjs`]),
    freshReviewAndGitCustodyHash: componentHash(productionSourceManifest,
      [`${ROOT}review-evidence-v5-r11.mjs`, `${ROOT}execution-evidence-v5-r11.mjs`]),
    runtimeCliActivationHash: componentHash(productionSourceManifest,
      [`${ROOT}activation-guard-v5-r11.mjs`, `${ROOT}runner-v5-r11-runtime.mjs`,
        `${ROOT}runner-v5-r11-cli.mjs`, `${ROOT}workflow-index-v5-r11.mjs`,
        `${ROOT}native-provider-adapter-v5-r11.mjs`]),
    closedSchemaCatalogHash: componentHash(productionSourceManifest,
      [`${ROOT}schema-contract-v5-r11.mjs`, ...schemaPaths]),
    fullTransitiveSourceClosureHash: sourceManifestRootV5R6(productionSourceManifest ?? []),
  });
}

export function validateActiveRunnerRegistrationV5R11(activeRegistration) {
  const errors = [...validateClosedSelfHashedArtifactV5R11(activeRegistration,
    "NaturalCaExecutionRunnerSupersedingRegistrationV7")];
  add(errors, validateSelfHashV5R3(activeRegistration), "active V5-R11 registration self-hash is invalid");
  add(errors, activeRegistration?.supersedesRunnerRegistrationHash === V5_R10_REGISTRATION_HASH
    && activeRegistration?.supersededRunnerRegistrationCommit === V5_R10_REGISTRATION_COMMIT
    && activeRegistration?.supersededRunnerSourceCommit === V5_R10_SOURCE_COMMIT
    && activeRegistration?.supersededRunnerCloseoutCommit === V5_R10_CLOSEOUT_COMMIT,
  "V5-R11 does not supersede the exact immutable V5-R10 registration, source, and closeout");
  add(errors, activeRegistration?.discrepancyReviewDecision === "DISCREPANCY"
    && activeRegistration?.discrepancyFindingCount === 2
    && activeRegistration?.discrepancyReviewHash === V5_R10_DISCREPANCY_REVIEW_HASH
    && activeRegistration?.discrepancyReviewCommit === V5_R10_DISCREPANCY_REVIEW_COMMIT
    && activeRegistration?.previousReceiptHash === V5_R10_DISCREPANCY_REVIEW_HASH,
  "V5-R11 does not bind the exact signed V5-R10 two-finding discrepancy review");
  add(errors, activeRegistration?.ownerRunnerImplementationAuthorizationTextHash
    === V5_R11_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
  "V5-R11 owner offline implementation authorization text hash is invalid");
  const frozenFields = ["designRegistrationHash", "frameRegistrationHash", "samplingFrameHash",
    "sampleManifestHash", "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash",
    "privacyScreenHash", "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash",
    "rightsPolicyHash", "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash",
    "thresholdsDecisionAndPowerHash", "decisionCeiling", "providerContractErratumHash"];
  for (const field of frozenFields) add(errors, activeRegistration?.[field] === V5_R10_REGISTRATION[field],
    `V5-R11 frozen ${field} differs from V5-R10`);
  add(errors, activeRegistration?.reviewerIdentityAnchorPath === REVIEWER_IDENTITY_ANCHOR_PATH
    && activeRegistration?.reviewerIdentityAnchorCommit === V5_R11_REVIEWER_IDENTITY_ANCHOR_COMMIT
    && activeRegistration?.reviewerIdentityAnchorOriginCommit
      === V5_R11_REVIEWER_IDENTITY_ANCHOR_ORIGIN_COMMIT
    && activeRegistration?.reviewerIdentityAnchorHash === V5_R11_REVIEWER_IDENTITY_ANCHOR_HASH,
  "V5-R11 does not bind the exact public A11 reviewer identity anchor");
  add(errors, exactSet(activeRegistration?.remediatedFindingIds, REMEDIATED_FINDING_IDS_V5_R11),
    "V5-R11 remediation set is incomplete or changed");
  add(errors, sortedManifest(activeRegistration?.productionSourceManifest)
    && sortedManifest(activeRegistration?.testSourceManifest),
  "V5-R11 source manifests are unsafe, empty, unordered, or duplicated");
  add(errors, sourceManifestRootV5R6(activeRegistration?.productionSourceManifest ?? [])
      === activeRegistration?.productionSourceRootHash
    && sourceManifestRootV5R6(activeRegistration?.testSourceManifest ?? [])
      === activeRegistration?.testSourceRootHash,
  "V5-R11 source manifest roots do not recompute");
  add(errors, canonicalJsonV5R3(activeRegistration?.productionEntryPoints ?? [])
      === canonicalJsonV5R3(PRODUCTION_ENTRYPOINTS_V5_R11)
    && PRODUCTION_ENTRYPOINTS_V5_R11.every((entrypoint) =>
      activeRegistration.productionSourceManifest?.some(({ path: sourcePath }) => sourcePath === entrypoint)),
  "V5-R11 production entrypoint set is invalid or absent from the manifest");
  add(errors, canonicalJsonV5R3(computeClosureKernelsV5R11(
    activeRegistration?.productionSourceManifest ?? []))
      === canonicalJsonV5R3(activeRegistration?.closureKernels ?? {}),
  "V5-R11 closure kernels do not recompute");
  add(errors, runtimeSourceEnumerationRootV5R11(activeRegistration?.productionSourceManifest)
    === activeRegistration?.runtimeSourceEnumerationRootHash,
  "V5-R11 runtime source enumeration root does not recompute");
  add(errors, activeRegistration?.supersededProductionSourceRootHash
      === V5_R10_REGISTRATION.productionSourceRootHash
    && activeRegistration?.supersededTestSourceRootHash === V5_R10_REGISTRATION.testSourceRootHash
    && activeRegistration?.supersededImportClosureRootHash === V5_R10_REGISTRATION.importClosureRootHash
    && activeRegistration?.sourceClosureMode
      === "FULL_TRANSITIVE_RUNTIME_CLOSURE_GIT_OBJECT_BYTES_VERIFIED"
    && activeRegistration?.registrationPathPolicy
      === "IMMUTABLE_SINGLE_ADD_THEN_EXACT_A07_CLOSEOUT_THEN_SIGNED_A11_REVIEW_CHAIN"
    && activeRegistration?.a07CloseoutPolicy?.receiptPath === A07_CLOSEOUT_RECEIPT_PATH
    && activeRegistration?.a07CloseoutPolicy?.sessionLogPath === A07_SESSION_LOG_PATH
    && activeRegistration?.a07CloseoutPolicy?.closeoutCommitMustDirectlyParentRegistration === true
    && activeRegistration?.a07CloseoutPolicy?.freshReviewCommitMustDirectlyParentCloseout === true
    && activeRegistration?.a07CloseoutPolicy?.exactSingleAddPaths === true,
  "V5-R11 predecessor roots or immutability policies are invalid");
  add(errors, Array.isArray(activeRegistration?.trustedProviderEvidenceAnchors)
    && activeRegistration.trustedProviderEvidenceAnchors.length === 0
    && activeRegistration?.routeAuthenticityState
      === "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR",
  "V5-R11 must not invent a provider trust anchor or claim route authenticity");
  const coreGuardHash = componentHash(activeRegistration?.productionSourceManifest ?? [], [
    `${ROOT}activation-guard-v5-r11.mjs`, `${ROOT}trusted-provider-evidence-v5-r11.mjs`,
    `${ROOT}attempt-recovery-v5-r11.mjs`, `${ROOT}native-provider-adapter-v5-r11.mjs`,
  ]);
  const tuples = {
    openAI: ["OPENAI_DIRECT", "gpt-5.6-luna", "https://us.api.openai.com/v1/responses",
      "US_STORAGE_PROCESSING"],
    deepSeek: ["DEEPSEEK_DIRECT", "deepseek-v4-pro",
      "https://api.deepseek.com/chat/completions", "UNRESOLVED"],
  };
  for (const [name, [provider, model, endpoint, projectResidency]] of Object.entries(tuples)) {
    const actual = activeRegistration?.providerEntrypoints?.[name];
    add(errors, actual?.provider === provider && actual?.model === model && actual?.endpoint === endpoint
      && actual?.projectResidency === projectResidency && actual?.registeredCli === "runner-v5-r11-cli.mjs"
      && actual?.coreGuardHash === coreGuardHash && actual?.providerCallsMade === 0,
    `V5-R11 ${name} provider entrypoint is invalid`);
  }
  add(errors, Object.values(activeRegistration?.authorizationState ?? {})
    .every((value) => value === false || value === 0),
  "V5-R11 registration must retain zero authorization and zero provider activity");
  add(errors, activeRegistration?.status
      === "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R11_REVIEW_PROVIDER_EXECUTION_BLOCKED"
    && activeRegistration?.claimCeiling
      === "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED"
    && activeRegistration?.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE",
  "V5-R11 status, claim ceiling, or decision ceiling is invalid");
  return Object.freeze([...new Set(errors)]);
}

async function git(repoRoot, args, encoding = "utf8") {
  return (await execFileAsync("git", args, { cwd: repoRoot, encoding,
    maxBuffer: 64 * 1024 * 1024 })).stdout;
}

async function gitJson(repoRoot, commit, sourcePath) {
  return JSON.parse(await git(repoRoot, ["show", `${commit}:${sourcePath}`], "utf8"));
}

async function mutationCommits(repoRoot, sourcePath) {
  const output = (await git(repoRoot, ["log", "--format=%H", "--", sourcePath])).trim();
  return output.length === 0 ? [] : output.split(/\s+/u).filter(Boolean);
}

function validateBoundR10DiscrepancyReview(review, anchor) {
  const errors = [...validateClosedSelfHashedArtifactV5R11(review,
    "IndependentExecutionRunnerReviewReceiptV8")];
  add(errors, canonicalJsonV5R3(review) === canonicalJsonV5R3(R10_DISCREPANCY_REVIEW)
    && review?.selfHash === V5_R10_DISCREPANCY_REVIEW_HASH
    && review?.runnerVersion === "V5-R10"
    && review?.decision === "DISCREPANCY" && review?.findingCount === 2
    && review?.reviewedRunnerRegistrationHash === V5_R10_REGISTRATION_HASH
    && review?.reviewedRunnerRegistrationCommit === V5_R10_REGISTRATION_COMMIT
    && review?.reviewedRunnerSourceCommit === V5_R10_SOURCE_COMMIT,
  "bound V5-R10 review is not the exact two-finding discrepancy receipt");
  add(errors, validateSelfHashV5R3(anchor)
    && canonicalJsonV5R3(anchor) === canonicalJsonV5R3(R10_REVIEWER_IDENTITY_ANCHOR)
    && anchor?.selfHash === review?.reviewerIdentityAnchorHash
    && anchor?.keyId === review?.reviewerKeyId
    && anchor?.algorithm === "Ed25519"
    && anchor?.purpose === "V5_R10_FRESH_A11_REVIEW_ONLY",
  "bound V5-R10 review identity anchor is invalid");
  try {
    const payloadBytes = Buffer.from(canonicalJsonV5R3(review?.reviewSignaturePayload), "utf8");
    add(errors, sha256V5R3(canonicalJsonV5R3(review?.reviewSignaturePayload))
      === review?.reviewSignaturePayloadHash
      && verify(null, payloadBytes, createPublicKey(anchor?.publicKeySpkiPem ?? ""),
        Buffer.from(review?.reviewSignatureBase64 ?? "", "base64"))
      && review?.reviewSignatureVerified === true,
    "bound V5-R10 discrepancy review signature is invalid");
  } catch {
    add(errors, false, "bound V5-R10 discrepancy review signature cannot be verified");
  }
  for (const field of ["credentialReadCount", "naturalQuestionReadCount", "providerCallCount",
    "naturalQuestionEgressCount", "tokenCount", "attemptCount", "usdSpent"]) {
    add(errors, review?.[field] === 0, `bound V5-R10 discrepancy review ${field} must be zero`);
  }
  return Object.freeze([...new Set(errors)]);
}

export async function loadExactTrackedRunnerRegistrationV5R11({ repoRoot }) {
  if (!path.isAbsolute(repoRoot)) throw new TypeError("exact V5-R11 loader requires an absolute repository root");
  const mutations = await mutationCommits(repoRoot, REGISTRATION_PATH);
  if (mutations.length !== 1) {
    throw new Error(`V5-R11 registration path must have one immutable add commit; observed ${mutations.length}`);
  }
  const registrationCommit = mutations[0];
  const runnerSourceCommit = (await git(repoRoot, ["rev-parse", `${registrationCommit}^`])).trim();
  if (!COMMIT.test(registrationCommit) || !COMMIT.test(runnerSourceCommit)) {
    throw new Error("V5-R11 registration Git identity is invalid");
  }
  const activeRegistration = await gitJson(repoRoot, registrationCommit, REGISTRATION_PATH);
  const validationErrors = validateActiveRunnerRegistrationV5R11(activeRegistration);
  if (validationErrors.length > 0) {
    throw new Error(`V5-R11 active registration validation failed: ${validationErrors.join("; ")}`);
  }
  if (activeRegistration.runnerSourceCommit !== runnerSourceCommit) {
    throw new Error("V5-R11 registration is not the direct child of its exact runner source commit");
  }
  const predecessorReviewMutations = await mutationCommits(repoRoot, R10_DISCREPANCY_REVIEW_PATH);
  if (predecessorReviewMutations.length !== 1
    || predecessorReviewMutations[0] !== V5_R10_DISCREPANCY_REVIEW_COMMIT) {
    throw new Error("bound V5-R10 discrepancy review lacks exact immutable single-add custody");
  }
  const predecessorReviewParent = (await git(repoRoot,
    ["rev-parse", `${V5_R10_DISCREPANCY_REVIEW_COMMIT}^`])).trim();
  const predecessorCloseoutParent = (await git(repoRoot,
    ["rev-parse", `${V5_R10_CLOSEOUT_COMMIT}^`])).trim();
  const predecessorRegistrationParent = (await git(repoRoot,
    ["rev-parse", `${V5_R10_REGISTRATION_COMMIT}^`])).trim();
  if (predecessorReviewParent !== V5_R10_CLOSEOUT_COMMIT
    || predecessorCloseoutParent !== V5_R10_REGISTRATION_COMMIT
    || predecessorRegistrationParent !== V5_R10_SOURCE_COMMIT) {
    throw new Error("bound V5-R10 source-registration-closeout-review Git chain is invalid");
  }
  const predecessorReview = await gitJson(repoRoot, runnerSourceCommit, R10_DISCREPANCY_REVIEW_PATH);
  const predecessorAnchor = await gitJson(repoRoot, V5_R10_DISCREPANCY_REVIEW_COMMIT,
    R10_REVIEWER_IDENTITY_ANCHOR_PATH);
  const predecessorReviewErrors = validateBoundR10DiscrepancyReview(
    predecessorReview, predecessorAnchor);
  if (predecessorReviewErrors.length > 0) {
    throw new Error(`bound V5-R10 discrepancy review Git object is invalid: ${predecessorReviewErrors.join("; ")}`);
  }
  const anchor = await gitJson(repoRoot, V5_R11_REVIEWER_IDENTITY_ANCHOR_COMMIT,
    REVIEWER_IDENTITY_ANCHOR_PATH);
  const anchorMutations = await mutationCommits(repoRoot, REVIEWER_IDENTITY_ANCHOR_PATH);
  if (anchorMutations.length !== 1
    || anchorMutations[0] !== V5_R11_REVIEWER_IDENTITY_ANCHOR_COMMIT
    || !validateSelfHashV5R3(anchor) || anchor.selfHash !== V5_R11_REVIEWER_IDENTITY_ANCHOR_HASH) {
    throw new Error("pinned V5-R11 A11 reviewer identity anchor Git object is invalid");
  }
  const closure = await collectGitSourceClosureV5R6({ repoRoot, commit: runnerSourceCommit,
    entryPoints: activeRegistration.productionEntryPoints });
  if (canonicalJsonV5R3(closure.paths)
      !== canonicalJsonV5R3(activeRegistration.productionSourceManifest.map(({ path: sourcePath }) => sourcePath))
    || closure.importEdgeCount !== activeRegistration.productionImportEdgeCount
    || closure.importClosureRootHash !== activeRegistration.importClosureRootHash) {
    throw new Error("V5-R11 production manifest is not the complete transitive Git-object closure");
  }
  const productionManifest = await sourceManifestFromGitV5R6({ repoRoot, commit: runnerSourceCommit,
    paths: closure.paths });
  const testManifest = await sourceManifestFromGitV5R6({ repoRoot, commit: runnerSourceCommit,
    paths: activeRegistration.testSourceManifest.map(({ path: sourcePath }) => sourcePath) });
  if (canonicalJsonV5R3(productionManifest) !== canonicalJsonV5R3(activeRegistration.productionSourceManifest)
    || canonicalJsonV5R3(testManifest) !== canonicalJsonV5R3(activeRegistration.testSourceManifest)) {
    throw new Error("V5-R11 exact Git-object source manifests differ from the registration");
  }
  for (const row of activeRegistration.productionSourceManifest) {
    const current = await readFile(path.join(repoRoot, row.path));
    if (current.byteLength !== row.byteLength || sha256V5R3(current) !== row.sha256) {
      throw new Error(`current execution byte drift from V5-R11 source object: ${row.path}`);
    }
  }
  const currentRegistrationBytes = await readFile(path.join(repoRoot, REGISTRATION_PATH));
  const exactRegistrationBytes = Buffer.from(await git(repoRoot,
    ["show", `${registrationCommit}:${REGISTRATION_PATH}`], null));
  if (!currentRegistrationBytes.equals(exactRegistrationBytes)) {
    throw new Error("current V5-R11 registration bytes differ from its immutable add commit");
  }
  return assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact({
    schemaVersion: "ExactRunnerSupersedingRegistrationEvidenceV7",
    registrationCommit,
    registrationPath: REGISTRATION_PATH,
    registrationPathMutationCount: 1,
    registrationHash: activeRegistration.selfHash,
    runnerSourceCommit,
    productionSourceRootHash: activeRegistration.productionSourceRootHash,
    testSourceRootHash: activeRegistration.testSourceRootHash,
    importClosureRootHash: activeRegistration.importClosureRootHash,
    runtimeSourceEnumerationRootHash: activeRegistration.runtimeSourceEnumerationRootHash,
    supersededRunnerRegistrationHash: V5_R10_REGISTRATION_HASH,
    supersededRunnerCloseoutCommit: V5_R10_CLOSEOUT_COMMIT,
    discrepancyReviewHash: V5_R10_DISCREPANCY_REVIEW_HASH,
    discrepancyReviewCommit: V5_R10_DISCREPANCY_REVIEW_COMMIT,
    verifiedFromGitObjects: true,
    currentRuntimeBytesMatchRegisteredSource: true,
    immutableSingleAddPathVerified: true,
    activeRegistration,
  }), "ExactRunnerSupersedingRegistrationEvidenceV7");
}

export function validateExactRunnerRegistrationEvidenceV5R11(evidence) {
  const errors = [...validateClosedSelfHashedArtifactV5R11(evidence,
    "ExactRunnerSupersedingRegistrationEvidenceV7"),
  ...validateActiveRunnerRegistrationV5R11(evidence?.activeRegistration)];
  add(errors, evidence?.registrationPath === REGISTRATION_PATH
    && evidence?.registrationPathMutationCount === 1
    && evidence?.registrationHash === evidence?.activeRegistration?.selfHash
    && evidence?.runnerSourceCommit === evidence?.activeRegistration?.runnerSourceCommit
    && evidence?.productionSourceRootHash === evidence?.activeRegistration?.productionSourceRootHash
    && evidence?.testSourceRootHash === evidence?.activeRegistration?.testSourceRootHash
    && evidence?.importClosureRootHash === evidence?.activeRegistration?.importClosureRootHash
    && evidence?.runtimeSourceEnumerationRootHash
      === evidence?.activeRegistration?.runtimeSourceEnumerationRootHash
    && evidence?.supersededRunnerRegistrationHash === V5_R10_REGISTRATION_HASH
    && evidence?.supersededRunnerCloseoutCommit === V5_R10_CLOSEOUT_COMMIT
    && evidence?.discrepancyReviewHash === V5_R10_DISCREPANCY_REVIEW_HASH
    && evidence?.discrepancyReviewCommit === V5_R10_DISCREPANCY_REVIEW_COMMIT
    && evidence?.verifiedFromGitObjects === true
    && evidence?.currentRuntimeBytesMatchRegisteredSource === true
    && evidence?.immutableSingleAddPathVerified === true,
  "V5-R11 exact registration evidence bindings are invalid");
  return Object.freeze([...new Set(errors)]);
}

export async function loadExactFreshRunnerReviewV5R11({ repoRoot, registrationEvidence }) {
  const activeRegistration = registrationEvidence?.activeRegistration;
  const registrationErrors = validateExactRunnerRegistrationEvidenceV5R11(registrationEvidence);
  if (registrationErrors.length > 0) throw new Error(registrationErrors.join("; "));
  const closeoutReceiptMutations = await mutationCommits(repoRoot, A07_CLOSEOUT_RECEIPT_PATH);
  const closeoutLogMutations = await mutationCommits(repoRoot, A07_SESSION_LOG_PATH);
  if (closeoutReceiptMutations.length !== 1 || closeoutLogMutations.length !== 1
    || closeoutReceiptMutations[0] !== closeoutLogMutations[0]) {
    throw new Error("V5-R11 A07 closeout receipt and session log require one shared immutable add commit");
  }
  const closeoutCommit = closeoutReceiptMutations[0];
  const closeoutCommitParent = (await git(repoRoot, ["rev-parse", `${closeoutCommit}^`])).trim();
  if (closeoutCommitParent !== registrationEvidence.registrationCommit) {
    throw new Error("V5-R11 A07 closeout commit is not the direct child of the registration commit");
  }
  const closeoutReceipt = await gitJson(repoRoot, closeoutCommit, A07_CLOSEOUT_RECEIPT_PATH);
  const closeoutErrors = validateClosedSelfHashedArtifactV5R11(closeoutReceipt,
    "A07RunnerCloseoutReceiptV3");
  if (closeoutErrors.length > 0
    || closeoutReceipt.sourceCommit !== activeRegistration.runnerSourceCommit
    || closeoutReceipt.registrationCommit !== registrationEvidence.registrationCommit
    || closeoutReceipt.registrationHash !== activeRegistration.selfHash
    || closeoutReceipt.productionSourceRootHash !== activeRegistration.productionSourceRootHash
    || closeoutReceipt.testSourceRootHash !== activeRegistration.testSourceRootHash
    || closeoutReceipt.importClosureRootHash !== activeRegistration.importClosureRootHash
    || closeoutReceipt.postRegistrationTestFailCount !== 0
    || closeoutReceipt.postRegistrationTestSkipCount !== 0
    || closeoutReceipt.worktreeStatus !== "CLEAN_BEFORE_CLOSEOUT_COMMIT"
    || closeoutReceipt.finalState !== "REVIEWED_COMMIT"
    || closeoutReceipt.upstreamRemoteRefHash !== registrationEvidence.registrationCommit) {
    throw new Error(`V5-R11 A07 closeout receipt is invalid: ${closeoutErrors.join("; ")}`);
  }
  const closeoutLog = await git(repoRoot, ["show", `${closeoutCommit}:${A07_SESSION_LOG_PATH}`]);
  if (!closeoutLog.includes(activeRegistration.runnerSourceCommit)
    || !closeoutLog.includes(registrationEvidence.registrationCommit)
    || !closeoutLog.includes(activeRegistration.selfHash)
    || !closeoutLog.includes("REVIEWED_COMMIT")) {
    throw new Error("V5-R11 A07 closeout log omits an exact final identity or final-state enum");
  }

  const receiptMutations = await mutationCommits(repoRoot, R11_REVIEW_PATHS.receipt);
  if (receiptMutations.length !== 1) {
    throw new Error(`V5-R11 review receipt path must have one immutable add commit; observed ${receiptMutations.length}`);
  }
  const reviewCommit = receiptMutations[0];
  const reviewCommitParent = (await git(repoRoot, ["rev-parse", `${reviewCommit}^`])).trim();
  if (reviewCommitParent !== closeoutCommit) {
    throw new Error("V5-R11 review commit is not the direct child of the exact A07 closeout commit");
  }
  for (const sourcePath of Object.values(R11_REVIEW_PATHS)) {
    const mutations = await mutationCommits(repoRoot, sourcePath);
    if (mutations.length !== 1 || mutations[0] !== reviewCommit) {
      throw new Error(`V5-R11 review process artifact lacks exact single-add custody: ${sourcePath}`);
    }
  }
  const freshReview = await gitJson(repoRoot, reviewCommit, R11_REVIEW_PATHS.receipt);
  const processArtifacts = {
    verifierSourceManifest: await gitJson(repoRoot, reviewCommit, R11_REVIEW_PATHS.verifierSourceManifest),
    dependencyLockManifest: await gitJson(repoRoot, reviewCommit, R11_REVIEW_PATHS.dependencyLockManifest),
    staticImportGraphReceipt: await gitJson(repoRoot, reviewCommit, R11_REVIEW_PATHS.staticImportGraphReceipt),
    forbiddenPrimaryScorerPathScanReceipt: await gitJson(repoRoot, reviewCommit,
      R11_REVIEW_PATHS.forbiddenPrimaryScorerPathScanReceipt),
    commandRuntimeReceipt: await gitJson(repoRoot, reviewCommit, R11_REVIEW_PATHS.commandRuntimeReceipt),
    independentSourceEnumerationReceipt: await gitJson(repoRoot, reviewCommit,
      R11_REVIEW_PATHS.independentSourceEnumerationReceipt),
  };
  const reviewerIdentityAnchor = await gitJson(repoRoot, V5_R11_REVIEWER_IDENTITY_ANCHOR_COMMIT,
    REVIEWER_IDENTITY_ANCHOR_PATH);
  if (!validateSelfHashV5R3(reviewerIdentityAnchor)
    || reviewerIdentityAnchor.selfHash !== activeRegistration.reviewerIdentityAnchorHash) {
    throw new Error("V5-R11 pinned reviewer identity anchor differs from its Git object");
  }
  const reviewCustody = {
    verifiedFromGitObjects: true,
    reviewReceiptPathMutationCount: 1,
    reviewCommit,
    reviewCommitParent,
    closeoutCommit,
    closeoutCommitParent,
    reviewReceiptHash: freshReview.selfHash,
  };
  const errors = validateFreshRunnerReviewV5R11({ activeRegistration, registrationEvidence,
    freshReview, processArtifacts, reviewCustody, reviewerIdentityAnchor });
  if (errors.length > 0) throw new Error(`V5-R11 fresh review validation failed: ${errors.join("; ")}`);
  return Object.freeze({ freshReview, processArtifacts: Object.freeze(processArtifacts),
    reviewCustody: Object.freeze(reviewCustody), reviewerIdentityAnchor,
    closeoutReceipt, closeoutCommit });
}

export async function loadExactTransportActivationCustodyV5R11({ repoRoot }) {
  const registrationEvidence = await loadExactTrackedRunnerRegistrationV5R11({ repoRoot });
  const review = await loadExactFreshRunnerReviewV5R11({ repoRoot, registrationEvidence });
  return Object.freeze({
    registrationEvidence,
    activeRegistration: registrationEvidence.activeRegistration,
    freshReview: review.freshReview,
    processArtifacts: review.processArtifacts,
    reviewCustody: review.reviewCustody,
    reviewerIdentityAnchor: review.reviewerIdentityAnchor,
    closeoutReceipt: review.closeoutReceipt,
    closeoutCommit: review.closeoutCommit,
  });
}

export const EXECUTION_EVIDENCE_V5_R11_CONSTANTS = Object.freeze({
  registrationPath: REGISTRATION_PATH,
  reviewPaths: R11_REVIEW_PATHS,
  reviewerIdentityAnchorPath: REVIEWER_IDENTITY_ANCHOR_PATH,
  a07CloseoutReceiptPath: A07_CLOSEOUT_RECEIPT_PATH,
  a07SessionLogPath: A07_SESSION_LOG_PATH,
  immutablePathMutationCount: 1,
  supersededRegistrationHash: V5_R10_REGISTRATION_HASH,
  supersededRunnerCloseoutCommit: V5_R10_CLOSEOUT_COMMIT,
  discrepancyReviewHash: V5_R10_DISCREPANCY_REVIEW_HASH,
  discrepancyReviewCommit: V5_R10_DISCREPANCY_REVIEW_COMMIT,
  remediatedFindingIds: REMEDIATED_FINDING_IDS_V5_R11,
  transportLoadsExactGitCustody: true,
});
