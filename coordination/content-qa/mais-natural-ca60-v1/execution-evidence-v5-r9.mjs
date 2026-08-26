import { execFile as nodeExecFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import V5_R8_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r8/runner-registration.json" with { type: "json" };
import R8_DISCREPANCY_REVIEW from "../../reports/mais-natural-ca60-v5-r8-runner-review-discrepancy-a11/independent-runner-review-receipt.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R9,
  validateClosedSelfHashedArtifactV5R9,
} from "./schema-contract-v5-r9.mjs";
import {
  collectGitSourceClosureV5R6,
  sourceManifestFromGitV5R6,
  sourceManifestRootV5R6,
} from "./source-closure-v5-r6.mjs";
import {
  validateFreshRunnerReviewV5R9,
} from "./review-evidence-v5-r9.mjs";

const execFileAsync = promisify(nodeExecFile);
const HASH = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const REGISTRATION_PATH = "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r9/runner-registration.json";
const R8_DISCREPANCY_REVIEW_PATH =
  "coordination/reports/mais-natural-ca60-v5-r8-runner-review-discrepancy-a11/independent-runner-review-receipt.json";
const REVIEWER_IDENTITY_ANCHOR_PATH =
  "coordination/reports/mais-natural-ca60-v5-r9-review-identity-a11/public-review-identity-anchor.json";
const A07_CLOSEOUT_ROOT = "coordination/reports/mais-natural-ca60-v5-r9-runner-closeout-a07";
const A07_CLOSEOUT_RECEIPT_PATH = `${A07_CLOSEOUT_ROOT}/a07-runner-closeout-receipt.json`;
const A07_SESSION_LOG_PATH =
  "coordination/session-logs/2026-08-26-A07-mais-natural-ca60-v5-r9.md";
const R9_REVIEW_ROOT = "coordination/reports/mais-natural-ca60-v5-r9-runner-review";

export const V5_R8_REGISTRATION_HASH = "ea5cb617a77a2521e473846c35267f419723fd9bf6c0ca8bef8cd6fc9fa46160";
export const V5_R8_REGISTRATION_COMMIT = "ab8e8e8f74fc4f9cffd4dc865b65d800783db4b8";
export const V5_R8_SOURCE_COMMIT = "94abd3f1907a43e8378c181d56d8389a1de08020";
export const V5_R8_A11_DISCREPANCY_REVIEW_HASH =
  "3cd732f003899459381a6e0fa920ab13ae9ac0dc93fbea2e723c472e71595266";
export const V5_R8_A11_DISCREPANCY_REVIEW_COMMIT =
  "4b61570127ff849da3284e0c37fb90f54928a514";
export const V5_R9_REVIEWER_IDENTITY_ANCHOR_COMMIT =
  "f4e7da34b389d4de629c7d7073a8ec827e04297c";
export const V5_R9_REVIEWER_IDENTITY_ANCHOR_ORIGIN_COMMIT =
  "f84cbba8aab457208fa3474a439f144f9dc5eb62";
export const V5_R9_REVIEWER_IDENTITY_ANCHOR_HASH =
  "d4c7e9da8732e12de84f96eb71a215607362d9f9dbb3cb5ef59a822d168750cb";
export const V5_R9_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH =
  "36233641da9de2db0dfa31fc6970db9e6b01ab11104ed8c89376925f669e0288";

export const R8_FINDING_IDS_V5_R9 = Object.freeze(Array.from({ length: 8 }, (_, index) =>
  `A11-R8-${String(index + 1).padStart(3, "0")}`));

export const PRODUCTION_ENTRYPOINTS_V5_R9 = Object.freeze([
  `${ROOT}activation-guard-v5-r9.mjs`,
  `${ROOT}attempt-graph-v5-r9.mjs`,
  `${ROOT}attempt-recovery-v5-r9.mjs`,
  `${ROOT}execution-evidence-v5-r9.mjs`,
  `${ROOT}native-provider-adapter-v5-r9.mjs`,
  `${ROOT}review-evidence-v5-r9.mjs`,
  `${ROOT}runner-v5-r9-cli.mjs`,
  `${ROOT}runner-v5-r9-runtime.mjs`,
  `${ROOT}schema-contract-v5-r9.mjs`,
  `${ROOT}scorer-verifier-v5-r9.mjs`,
  `${ROOT}statistical-kernel-v5-r9.mjs`,
  `${ROOT}trusted-provider-evidence-v5-r9.mjs`,
  `${ROOT}workflow-index-v5-r9.mjs`,
].sort());

export const R9_REVIEW_PATHS = Object.freeze({
  receipt: `${R9_REVIEW_ROOT}/independent-runner-review-receipt.json`,
  verifierSourceManifest: `${R9_REVIEW_ROOT}/verifier-source-manifest.json`,
  dependencyLockManifest: `${R9_REVIEW_ROOT}/dependency-lock-manifest.json`,
  staticImportGraphReceipt: `${R9_REVIEW_ROOT}/independent-static-import-graph-receipt.json`,
  forbiddenPrimaryScorerPathScanReceipt:
    `${R9_REVIEW_ROOT}/forbidden-primary-scorer-path-scan-receipt.json`,
  commandRuntimeReceipt: `${R9_REVIEW_ROOT}/independent-command-runtime-receipt.json`,
  independentSourceEnumerationReceipt:
    `${R9_REVIEW_ROOT}/independent-source-enumeration-receipt.json`,
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

export function runtimeSourceEnumerationRootV5R9(manifest) {
  if (!sortedManifest(manifest)) return null;
  return sha256V5R3(canonicalJsonV5R3(manifest.map(({ path: sourcePath, sha256, byteLength }) =>
    [sourcePath, sha256, byteLength])));
}

export function computeClosureKernelsV5R9(productionSourceManifest) {
  const schemaPaths = (productionSourceManifest ?? []).map(({ path: sourcePath }) => sourcePath)
    .filter((sourcePath) => sourcePath.startsWith(`${ROOT}schemas/`) && sourcePath.endsWith(".schema.json"));
  return Object.freeze({
    statisticsAndItemCustodyHash: componentHash(productionSourceManifest,
      [`${ROOT}statistical-kernel-v5-r9.mjs`, `${ROOT}scorer-verifier-v5-r9.mjs`]),
    attemptGraphAndRecoveryHash: componentHash(productionSourceManifest,
      [`${ROOT}attempt-graph-v5-r9.mjs`, `${ROOT}attempt-recovery-v5-r9.mjs`]),
    trustedProviderEvidenceHash: componentHash(productionSourceManifest,
      [`${ROOT}trusted-provider-evidence-v5-r9.mjs`]),
    freshReviewAndGitCustodyHash: componentHash(productionSourceManifest,
      [`${ROOT}review-evidence-v5-r9.mjs`, `${ROOT}execution-evidence-v5-r9.mjs`]),
    runtimeCliActivationHash: componentHash(productionSourceManifest,
      [`${ROOT}activation-guard-v5-r9.mjs`, `${ROOT}runner-v5-r9-runtime.mjs`,
        `${ROOT}runner-v5-r9-cli.mjs`, `${ROOT}workflow-index-v5-r9.mjs`,
        `${ROOT}native-provider-adapter-v5-r9.mjs`]),
    closedSchemaCatalogHash: componentHash(productionSourceManifest,
      [`${ROOT}schema-contract-v5-r9.mjs`, ...schemaPaths]),
    fullTransitiveSourceClosureHash: sourceManifestRootV5R6(productionSourceManifest ?? []),
  });
}

export function validateActiveRunnerRegistrationV5R9(activeRegistration) {
  const errors = [...validateClosedSelfHashedArtifactV5R9(activeRegistration,
    "NaturalCaExecutionRunnerSupersedingRegistrationV5")];
  add(errors, validateSelfHashV5R3(activeRegistration), "active V5-R9 registration self-hash is invalid");
  add(errors, activeRegistration?.supersedesRunnerRegistrationHash === V5_R8_REGISTRATION_HASH
    && activeRegistration?.supersededRunnerRegistrationCommit === V5_R8_REGISTRATION_COMMIT
    && activeRegistration?.supersededRunnerSourceCommit === V5_R8_SOURCE_COMMIT,
  "V5-R9 does not supersede the exact immutable V5-R8 registration and source");
  add(errors, activeRegistration?.discrepancyReviewHash === V5_R8_A11_DISCREPANCY_REVIEW_HASH
    && activeRegistration?.discrepancyReviewCommit === V5_R8_A11_DISCREPANCY_REVIEW_COMMIT
    && activeRegistration?.previousReceiptHash === V5_R8_A11_DISCREPANCY_REVIEW_HASH,
  "V5-R9 does not bind the exact V5-R8 A11 discrepancy review");
  add(errors, activeRegistration?.ownerRunnerImplementationAuthorizationTextHash
    === V5_R9_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
  "V5-R9 owner offline implementation authorization text hash is invalid");
  const frozenFields = ["designRegistrationHash", "frameRegistrationHash", "samplingFrameHash",
    "sampleManifestHash", "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash",
    "privacyScreenHash", "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash",
    "rightsPolicyHash", "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash",
    "thresholdsDecisionAndPowerHash", "decisionCeiling", "providerContractErratumHash"];
  for (const field of frozenFields) add(errors, activeRegistration?.[field] === V5_R8_REGISTRATION[field],
    `V5-R9 frozen ${field} differs from V5-R8`);
  add(errors, activeRegistration?.reviewerIdentityAnchorPath === REVIEWER_IDENTITY_ANCHOR_PATH
    && activeRegistration?.reviewerIdentityAnchorCommit === V5_R9_REVIEWER_IDENTITY_ANCHOR_COMMIT
    && activeRegistration?.reviewerIdentityAnchorOriginCommit
      === V5_R9_REVIEWER_IDENTITY_ANCHOR_ORIGIN_COMMIT
    && activeRegistration?.reviewerIdentityAnchorHash === V5_R9_REVIEWER_IDENTITY_ANCHOR_HASH,
  "V5-R9 does not bind the exact public A11 reviewer identity anchor");
  add(errors, exactSet(activeRegistration?.remediatedFindingIds, R8_FINDING_IDS_V5_R9),
    "V5-R9 remediation set is incomplete or changed");
  add(errors, sortedManifest(activeRegistration?.productionSourceManifest)
    && sortedManifest(activeRegistration?.testSourceManifest),
  "V5-R9 source manifests are unsafe, empty, unordered, or duplicated");
  add(errors, sourceManifestRootV5R6(activeRegistration?.productionSourceManifest ?? [])
      === activeRegistration?.productionSourceRootHash
    && sourceManifestRootV5R6(activeRegistration?.testSourceManifest ?? [])
      === activeRegistration?.testSourceRootHash,
  "V5-R9 source manifest roots do not recompute");
  add(errors, canonicalJsonV5R3(activeRegistration?.productionEntryPoints ?? [])
      === canonicalJsonV5R3(PRODUCTION_ENTRYPOINTS_V5_R9)
    && PRODUCTION_ENTRYPOINTS_V5_R9.every((entrypoint) =>
      activeRegistration.productionSourceManifest?.some(({ path: sourcePath }) => sourcePath === entrypoint)),
  "V5-R9 production entrypoint set is invalid or absent from the manifest");
  add(errors, canonicalJsonV5R3(computeClosureKernelsV5R9(
    activeRegistration?.productionSourceManifest ?? []))
      === canonicalJsonV5R3(activeRegistration?.closureKernels ?? {}),
  "V5-R9 closure kernels do not recompute");
  add(errors, runtimeSourceEnumerationRootV5R9(activeRegistration?.productionSourceManifest)
    === activeRegistration?.runtimeSourceEnumerationRootHash,
  "V5-R9 runtime source enumeration root does not recompute");
  add(errors, activeRegistration?.supersededProductionSourceRootHash
      === V5_R8_REGISTRATION.productionSourceRootHash
    && activeRegistration?.supersededTestSourceRootHash === V5_R8_REGISTRATION.testSourceRootHash
    && activeRegistration?.supersededImportClosureRootHash === V5_R8_REGISTRATION.importClosureRootHash
    && activeRegistration?.sourceClosureMode
      === "FULL_TRANSITIVE_RUNTIME_CLOSURE_GIT_OBJECT_BYTES_VERIFIED"
    && activeRegistration?.registrationPathPolicy
      === "IMMUTABLE_SINGLE_ADD_THEN_EXACT_A07_CLOSEOUT_THEN_SIGNED_A11_REVIEW_CHAIN"
    && activeRegistration?.a07CloseoutPolicy?.receiptPath === A07_CLOSEOUT_RECEIPT_PATH
    && activeRegistration?.a07CloseoutPolicy?.sessionLogPath === A07_SESSION_LOG_PATH
    && activeRegistration?.a07CloseoutPolicy?.closeoutCommitMustDirectlyParentRegistration === true
    && activeRegistration?.a07CloseoutPolicy?.freshReviewCommitMustDirectlyParentCloseout === true
    && activeRegistration?.a07CloseoutPolicy?.exactSingleAddPaths === true,
  "V5-R9 predecessor roots or immutability policies are invalid");
  add(errors, Array.isArray(activeRegistration?.trustedProviderEvidenceAnchors)
    && activeRegistration.trustedProviderEvidenceAnchors.length === 0
    && activeRegistration?.routeAuthenticityState
      === "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR",
  "V5-R9 must not invent a provider trust anchor or claim route authenticity");
  const coreGuardHash = componentHash(activeRegistration?.productionSourceManifest ?? [], [
    `${ROOT}activation-guard-v5-r9.mjs`, `${ROOT}trusted-provider-evidence-v5-r9.mjs`,
    `${ROOT}attempt-recovery-v5-r9.mjs`, `${ROOT}native-provider-adapter-v5-r9.mjs`,
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
      && actual?.projectResidency === projectResidency && actual?.registeredCli === "runner-v5-r9-cli.mjs"
      && actual?.coreGuardHash === coreGuardHash && actual?.providerCallsMade === 0,
    `V5-R9 ${name} provider entrypoint is invalid`);
  }
  add(errors, Object.values(activeRegistration?.authorizationState ?? {})
    .every((value) => value === false || value === 0),
  "V5-R9 registration must retain zero authorization and zero provider activity");
  add(errors, activeRegistration?.status
      === "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R9_REVIEW_PROVIDER_EXECUTION_BLOCKED"
    && activeRegistration?.claimCeiling
      === "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED"
    && activeRegistration?.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE",
  "V5-R9 status, claim ceiling, or decision ceiling is invalid");
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

export async function loadExactTrackedRunnerRegistrationV5R9({ repoRoot }) {
  if (!path.isAbsolute(repoRoot)) throw new TypeError("exact V5-R9 loader requires an absolute repository root");
  const mutations = await mutationCommits(repoRoot, REGISTRATION_PATH);
  if (mutations.length !== 1) {
    throw new Error(`V5-R9 registration path must have one immutable add commit; observed ${mutations.length}`);
  }
  const registrationCommit = mutations[0];
  const runnerSourceCommit = (await git(repoRoot, ["rev-parse", `${registrationCommit}^`])).trim();
  if (!COMMIT.test(registrationCommit) || !COMMIT.test(runnerSourceCommit)) {
    throw new Error("V5-R9 registration Git identity is invalid");
  }
  const activeRegistration = await gitJson(repoRoot, registrationCommit, REGISTRATION_PATH);
  const validationErrors = validateActiveRunnerRegistrationV5R9(activeRegistration);
  if (validationErrors.length > 0) {
    throw new Error(`V5-R9 active registration validation failed: ${validationErrors.join("; ")}`);
  }
  if (activeRegistration.runnerSourceCommit !== runnerSourceCommit) {
    throw new Error("V5-R9 registration is not the direct child of its exact runner source commit");
  }
  const review = await gitJson(repoRoot, V5_R8_A11_DISCREPANCY_REVIEW_COMMIT,
    R8_DISCREPANCY_REVIEW_PATH);
  if (!validateSelfHashV5R3(review) || review.selfHash !== V5_R8_A11_DISCREPANCY_REVIEW_HASH
    || review.decision !== "DISCREPANCY" || review.findingCount !== 8
    || canonicalJsonV5R3(review) !== canonicalJsonV5R3(R8_DISCREPANCY_REVIEW)) {
    throw new Error("bound V5-R8 A11 discrepancy receipt Git object is invalid");
  }
  const anchor = await gitJson(repoRoot, V5_R9_REVIEWER_IDENTITY_ANCHOR_COMMIT,
    REVIEWER_IDENTITY_ANCHOR_PATH);
  const anchorMutations = await mutationCommits(repoRoot, REVIEWER_IDENTITY_ANCHOR_PATH);
  if (anchorMutations.length !== 1
    || anchorMutations[0] !== V5_R9_REVIEWER_IDENTITY_ANCHOR_COMMIT
    || !validateSelfHashV5R3(anchor) || anchor.selfHash !== V5_R9_REVIEWER_IDENTITY_ANCHOR_HASH) {
    throw new Error("pinned V5-R9 A11 reviewer identity anchor Git object is invalid");
  }
  const closure = await collectGitSourceClosureV5R6({ repoRoot, commit: runnerSourceCommit,
    entryPoints: activeRegistration.productionEntryPoints });
  if (canonicalJsonV5R3(closure.paths)
      !== canonicalJsonV5R3(activeRegistration.productionSourceManifest.map(({ path: sourcePath }) => sourcePath))
    || closure.importEdgeCount !== activeRegistration.productionImportEdgeCount
    || closure.importClosureRootHash !== activeRegistration.importClosureRootHash) {
    throw new Error("V5-R9 production manifest is not the complete transitive Git-object closure");
  }
  const productionManifest = await sourceManifestFromGitV5R6({ repoRoot, commit: runnerSourceCommit,
    paths: closure.paths });
  const testManifest = await sourceManifestFromGitV5R6({ repoRoot, commit: runnerSourceCommit,
    paths: activeRegistration.testSourceManifest.map(({ path: sourcePath }) => sourcePath) });
  if (canonicalJsonV5R3(productionManifest) !== canonicalJsonV5R3(activeRegistration.productionSourceManifest)
    || canonicalJsonV5R3(testManifest) !== canonicalJsonV5R3(activeRegistration.testSourceManifest)) {
    throw new Error("V5-R9 exact Git-object source manifests differ from the registration");
  }
  for (const row of activeRegistration.productionSourceManifest) {
    const current = await readFile(path.join(repoRoot, row.path));
    if (current.byteLength !== row.byteLength || sha256V5R3(current) !== row.sha256) {
      throw new Error(`current execution byte drift from V5-R9 source object: ${row.path}`);
    }
  }
  const currentRegistrationBytes = await readFile(path.join(repoRoot, REGISTRATION_PATH));
  const exactRegistrationBytes = Buffer.from(await git(repoRoot,
    ["show", `${registrationCommit}:${REGISTRATION_PATH}`], null));
  if (!currentRegistrationBytes.equals(exactRegistrationBytes)) {
    throw new Error("current V5-R9 registration bytes differ from its immutable add commit");
  }
  return assertClosedSelfHashedArtifactV5R9(sealV5R3Artifact({
    schemaVersion: "ExactRunnerSupersedingRegistrationEvidenceV5",
    registrationCommit,
    registrationPath: REGISTRATION_PATH,
    registrationPathMutationCount: 1,
    registrationHash: activeRegistration.selfHash,
    runnerSourceCommit,
    productionSourceRootHash: activeRegistration.productionSourceRootHash,
    testSourceRootHash: activeRegistration.testSourceRootHash,
    importClosureRootHash: activeRegistration.importClosureRootHash,
    runtimeSourceEnumerationRootHash: activeRegistration.runtimeSourceEnumerationRootHash,
    supersededRunnerRegistrationHash: V5_R8_REGISTRATION_HASH,
    discrepancyReviewHash: V5_R8_A11_DISCREPANCY_REVIEW_HASH,
    discrepancyReviewCommit: V5_R8_A11_DISCREPANCY_REVIEW_COMMIT,
    verifiedFromGitObjects: true,
    currentRuntimeBytesMatchRegisteredSource: true,
    immutableSingleAddPathVerified: true,
    activeRegistration,
  }), "ExactRunnerSupersedingRegistrationEvidenceV5");
}

export function validateExactRunnerRegistrationEvidenceV5R9(evidence) {
  const errors = [...validateClosedSelfHashedArtifactV5R9(evidence,
    "ExactRunnerSupersedingRegistrationEvidenceV5"),
  ...validateActiveRunnerRegistrationV5R9(evidence?.activeRegistration)];
  add(errors, evidence?.registrationPath === REGISTRATION_PATH
    && evidence?.registrationPathMutationCount === 1
    && evidence?.registrationHash === evidence?.activeRegistration?.selfHash
    && evidence?.runnerSourceCommit === evidence?.activeRegistration?.runnerSourceCommit
    && evidence?.productionSourceRootHash === evidence?.activeRegistration?.productionSourceRootHash
    && evidence?.testSourceRootHash === evidence?.activeRegistration?.testSourceRootHash
    && evidence?.importClosureRootHash === evidence?.activeRegistration?.importClosureRootHash
    && evidence?.runtimeSourceEnumerationRootHash
      === evidence?.activeRegistration?.runtimeSourceEnumerationRootHash
    && evidence?.supersededRunnerRegistrationHash === V5_R8_REGISTRATION_HASH
    && evidence?.discrepancyReviewHash === V5_R8_A11_DISCREPANCY_REVIEW_HASH
    && evidence?.discrepancyReviewCommit === V5_R8_A11_DISCREPANCY_REVIEW_COMMIT
    && evidence?.verifiedFromGitObjects === true
    && evidence?.currentRuntimeBytesMatchRegisteredSource === true
    && evidence?.immutableSingleAddPathVerified === true,
  "V5-R9 exact registration evidence bindings are invalid");
  return Object.freeze([...new Set(errors)]);
}

export async function loadExactFreshRunnerReviewV5R9({ repoRoot, registrationEvidence }) {
  const activeRegistration = registrationEvidence?.activeRegistration;
  const registrationErrors = validateExactRunnerRegistrationEvidenceV5R9(registrationEvidence);
  if (registrationErrors.length > 0) throw new Error(registrationErrors.join("; "));
  const closeoutReceiptMutations = await mutationCommits(repoRoot, A07_CLOSEOUT_RECEIPT_PATH);
  const closeoutLogMutations = await mutationCommits(repoRoot, A07_SESSION_LOG_PATH);
  if (closeoutReceiptMutations.length !== 1 || closeoutLogMutations.length !== 1
    || closeoutReceiptMutations[0] !== closeoutLogMutations[0]) {
    throw new Error("V5-R9 A07 closeout receipt and session log require one shared immutable add commit");
  }
  const closeoutCommit = closeoutReceiptMutations[0];
  const closeoutCommitParent = (await git(repoRoot, ["rev-parse", `${closeoutCommit}^`])).trim();
  if (closeoutCommitParent !== registrationEvidence.registrationCommit) {
    throw new Error("V5-R9 A07 closeout commit is not the direct child of the registration commit");
  }
  const closeoutReceipt = await gitJson(repoRoot, closeoutCommit, A07_CLOSEOUT_RECEIPT_PATH);
  const closeoutErrors = validateClosedSelfHashedArtifactV5R9(closeoutReceipt,
    "A07RunnerCloseoutReceiptV1");
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
    throw new Error(`V5-R9 A07 closeout receipt is invalid: ${closeoutErrors.join("; ")}`);
  }
  const closeoutLog = await git(repoRoot, ["show", `${closeoutCommit}:${A07_SESSION_LOG_PATH}`]);
  if (!closeoutLog.includes(activeRegistration.runnerSourceCommit)
    || !closeoutLog.includes(registrationEvidence.registrationCommit)
    || !closeoutLog.includes(activeRegistration.selfHash)
    || !closeoutLog.includes("REVIEWED_COMMIT")) {
    throw new Error("V5-R9 A07 closeout log omits an exact final identity or final-state enum");
  }

  const receiptMutations = await mutationCommits(repoRoot, R9_REVIEW_PATHS.receipt);
  if (receiptMutations.length !== 1) {
    throw new Error(`V5-R9 review receipt path must have one immutable add commit; observed ${receiptMutations.length}`);
  }
  const reviewCommit = receiptMutations[0];
  const reviewCommitParent = (await git(repoRoot, ["rev-parse", `${reviewCommit}^`])).trim();
  if (reviewCommitParent !== closeoutCommit) {
    throw new Error("V5-R9 review commit is not the direct child of the exact A07 closeout commit");
  }
  for (const sourcePath of Object.values(R9_REVIEW_PATHS)) {
    const mutations = await mutationCommits(repoRoot, sourcePath);
    if (mutations.length !== 1 || mutations[0] !== reviewCommit) {
      throw new Error(`V5-R9 review process artifact lacks exact single-add custody: ${sourcePath}`);
    }
  }
  const freshReview = await gitJson(repoRoot, reviewCommit, R9_REVIEW_PATHS.receipt);
  const processArtifacts = {
    verifierSourceManifest: await gitJson(repoRoot, reviewCommit, R9_REVIEW_PATHS.verifierSourceManifest),
    dependencyLockManifest: await gitJson(repoRoot, reviewCommit, R9_REVIEW_PATHS.dependencyLockManifest),
    staticImportGraphReceipt: await gitJson(repoRoot, reviewCommit, R9_REVIEW_PATHS.staticImportGraphReceipt),
    forbiddenPrimaryScorerPathScanReceipt: await gitJson(repoRoot, reviewCommit,
      R9_REVIEW_PATHS.forbiddenPrimaryScorerPathScanReceipt),
    commandRuntimeReceipt: await gitJson(repoRoot, reviewCommit, R9_REVIEW_PATHS.commandRuntimeReceipt),
    independentSourceEnumerationReceipt: await gitJson(repoRoot, reviewCommit,
      R9_REVIEW_PATHS.independentSourceEnumerationReceipt),
  };
  const reviewerIdentityAnchor = await gitJson(repoRoot, V5_R9_REVIEWER_IDENTITY_ANCHOR_COMMIT,
    REVIEWER_IDENTITY_ANCHOR_PATH);
  if (!validateSelfHashV5R3(reviewerIdentityAnchor)
    || reviewerIdentityAnchor.selfHash !== activeRegistration.reviewerIdentityAnchorHash) {
    throw new Error("V5-R9 pinned reviewer identity anchor differs from its Git object");
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
  const errors = validateFreshRunnerReviewV5R9({ activeRegistration, registrationEvidence,
    freshReview, processArtifacts, reviewCustody, reviewerIdentityAnchor });
  if (errors.length > 0) throw new Error(`V5-R9 fresh review validation failed: ${errors.join("; ")}`);
  return Object.freeze({ freshReview, processArtifacts: Object.freeze(processArtifacts),
    reviewCustody: Object.freeze(reviewCustody), reviewerIdentityAnchor,
    closeoutReceipt, closeoutCommit });
}

export async function loadExactTransportActivationCustodyV5R9({ repoRoot }) {
  const registrationEvidence = await loadExactTrackedRunnerRegistrationV5R9({ repoRoot });
  const review = await loadExactFreshRunnerReviewV5R9({ repoRoot, registrationEvidence });
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

export const EXECUTION_EVIDENCE_V5_R9_CONSTANTS = Object.freeze({
  registrationPath: REGISTRATION_PATH,
  reviewPaths: R9_REVIEW_PATHS,
  reviewerIdentityAnchorPath: REVIEWER_IDENTITY_ANCHOR_PATH,
  a07CloseoutReceiptPath: A07_CLOSEOUT_RECEIPT_PATH,
  a07SessionLogPath: A07_SESSION_LOG_PATH,
  immutablePathMutationCount: 1,
  supersededRegistrationHash: V5_R8_REGISTRATION_HASH,
  discrepancyReviewHash: V5_R8_A11_DISCREPANCY_REVIEW_HASH,
  remediatedFindingIds: R8_FINDING_IDS_V5_R9,
  transportLoadsExactGitCustody: true,
});
