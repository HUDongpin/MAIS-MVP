import { execFile as nodeExecFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import V5_R7_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r7/runner-registration.json" with { type: "json" };
import R7_REVIEW from "../../reports/mais-natural-ca60-v5-r7-runner-review/independent-runner-review-receipt.json" with { type: "json" };
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
import {
  collectGitSourceClosureV5R6,
  sourceManifestFromGitV5R6,
  sourceManifestRootV5R6,
} from "./source-closure-v5-r6.mjs";
import {
  validateFreshRunnerReviewV5R8,
} from "./review-evidence-v5-r8.mjs";

const execFileAsync = promisify(nodeExecFile);
const HASH = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const REGISTRATION_PATH = "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r8/runner-registration.json";
const R7_REVIEW_PATH = "coordination/reports/mais-natural-ca60-v5-r7-runner-review/independent-runner-review-receipt.json";
const R8_REVIEW_ROOT = "coordination/reports/mais-natural-ca60-v5-r8-runner-review";

export const V5_R7_REGISTRATION_HASH = "97b65940b0573064b4d1206e1f80dfb555c1a41e6c782e7439f9ec53df66b003";
export const V5_R7_REGISTRATION_COMMIT = "aa07d9b72cf06fbcf100ed0f6bf358fedd94222d";
export const V5_R7_SOURCE_COMMIT = "237413734a41431e51c8a29ecef6628b67bbafb1";
export const V5_R7_A11_REVIEW_HASH = "20d261e83982b29323383eec56c1df99e4f6b45fa7051482a47860e8bcaadd91";
export const V5_R7_A11_REVIEW_COMMIT = "ef6bb7da5151ec114882b9c349559afaaa145859";
export const V5_R8_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH =
  "36233641da9de2db0dfa31fc6970db9e6b01ab11104ed8c89376925f669e0288";

export const R7_FINDING_IDS_V5_R8 = Object.freeze(Array.from({ length: 8 }, (_, index) =>
  `A11-R7-${String(index + 1).padStart(3, "0")}`));

export const PRODUCTION_ENTRYPOINTS_V5_R8 = Object.freeze([
  `${ROOT}activation-guard-v5-r8.mjs`,
  `${ROOT}attempt-graph-v5-r8.mjs`,
  `${ROOT}attempt-recovery-v5-r8.mjs`,
  `${ROOT}execution-evidence-v5-r8.mjs`,
  `${ROOT}native-provider-adapter-v5-r8.mjs`,
  `${ROOT}review-evidence-v5-r8.mjs`,
  `${ROOT}runner-v5-r8-cli.mjs`,
  `${ROOT}runner-v5-r8-runtime.mjs`,
  `${ROOT}schema-contract-v5-r8.mjs`,
  `${ROOT}scorer-verifier-v5-r8.mjs`,
  `${ROOT}statistical-kernel-v5-r8.mjs`,
  `${ROOT}trusted-provider-evidence-v5-r8.mjs`,
  `${ROOT}workflow-index-v5-r8.mjs`,
].sort());

export const R8_REVIEW_PATHS = Object.freeze({
  receipt: `${R8_REVIEW_ROOT}/independent-runner-review-receipt.json`,
  verifierSourceManifest: `${R8_REVIEW_ROOT}/verifier-source-manifest.json`,
  dependencyLockManifest: `${R8_REVIEW_ROOT}/dependency-lock-manifest.json`,
  staticImportGraphReceipt: `${R8_REVIEW_ROOT}/independent-static-import-graph-receipt.json`,
  forbiddenPrimaryScorerPathScanReceipt:
    `${R8_REVIEW_ROOT}/forbidden-primary-scorer-path-scan-receipt.json`,
  commandRuntimeReceipt: `${R8_REVIEW_ROOT}/independent-command-runtime-receipt.json`,
  independentSourceEnumerationReceipt:
    `${R8_REVIEW_ROOT}/independent-source-enumeration-receipt.json`,
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

export function runtimeSourceEnumerationRootV5R8(manifest) {
  if (!sortedManifest(manifest)) return null;
  return sha256V5R3(canonicalJsonV5R3(manifest.map(({ path: sourcePath, sha256, byteLength }) =>
    [sourcePath, sha256, byteLength])));
}

export function computeClosureKernelsV5R8(productionSourceManifest) {
  const schemaPaths = (productionSourceManifest ?? []).map(({ path: sourcePath }) => sourcePath)
    .filter((sourcePath) => sourcePath.startsWith(`${ROOT}schemas/`) && sourcePath.endsWith(".schema.json"));
  return Object.freeze({
    statisticsAndItemCustodyHash: componentHash(productionSourceManifest,
      [`${ROOT}statistical-kernel-v5-r8.mjs`, `${ROOT}scorer-verifier-v5-r8.mjs`]),
    attemptGraphAndRecoveryHash: componentHash(productionSourceManifest,
      [`${ROOT}attempt-graph-v5-r8.mjs`, `${ROOT}attempt-recovery-v5-r8.mjs`]),
    trustedProviderEvidenceHash: componentHash(productionSourceManifest,
      [`${ROOT}trusted-provider-evidence-v5-r8.mjs`]),
    freshReviewAndGitCustodyHash: componentHash(productionSourceManifest,
      [`${ROOT}review-evidence-v5-r8.mjs`, `${ROOT}execution-evidence-v5-r8.mjs`]),
    runtimeCliActivationHash: componentHash(productionSourceManifest,
      [`${ROOT}activation-guard-v5-r8.mjs`, `${ROOT}runner-v5-r8-runtime.mjs`,
        `${ROOT}runner-v5-r8-cli.mjs`, `${ROOT}workflow-index-v5-r8.mjs`,
        `${ROOT}native-provider-adapter-v5-r8.mjs`]),
    closedSchemaCatalogHash: componentHash(productionSourceManifest,
      [`${ROOT}schema-contract-v5-r8.mjs`, ...schemaPaths]),
    fullTransitiveSourceClosureHash: sourceManifestRootV5R6(productionSourceManifest ?? []),
  });
}

export function validateActiveRunnerRegistrationV5R8(activeRegistration) {
  const errors = [...validateClosedSelfHashedArtifactV5R8(activeRegistration,
    "NaturalCaExecutionRunnerSupersedingRegistrationV4")];
  add(errors, validateSelfHashV5R3(activeRegistration), "active V5-R8 registration self-hash is invalid");
  add(errors, activeRegistration?.supersedesRunnerRegistrationHash === V5_R7_REGISTRATION_HASH
    && activeRegistration?.supersededRunnerRegistrationCommit === V5_R7_REGISTRATION_COMMIT
    && activeRegistration?.supersededRunnerSourceCommit === V5_R7_SOURCE_COMMIT,
  "V5-R8 does not supersede the exact immutable V5-R7 registration and source");
  add(errors, activeRegistration?.discrepancyReviewHash === V5_R7_A11_REVIEW_HASH
    && activeRegistration?.discrepancyReviewCommit === V5_R7_A11_REVIEW_COMMIT
    && activeRegistration?.previousReceiptHash === V5_R7_A11_REVIEW_HASH,
  "V5-R8 does not bind the exact V5-R7 A11 discrepancy review");
  add(errors, activeRegistration?.ownerRunnerImplementationAuthorizationTextHash
    === V5_R8_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
  "V5-R8 owner offline implementation authorization text hash is invalid");
  const frozenFields = ["designRegistrationHash", "frameRegistrationHash", "samplingFrameHash",
    "sampleManifestHash", "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash",
    "privacyScreenHash", "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash",
    "rightsPolicyHash", "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash",
    "thresholdsDecisionAndPowerHash", "decisionCeiling", "providerContractErratumHash"];
  for (const field of frozenFields) add(errors, activeRegistration?.[field] === V5_R7_REGISTRATION[field],
    `V5-R8 frozen ${field} differs from V5-R7`);
  add(errors, exactSet(activeRegistration?.remediatedFindingIds, R7_FINDING_IDS_V5_R8),
    "V5-R8 remediation set is incomplete or changed");
  add(errors, sortedManifest(activeRegistration?.productionSourceManifest)
    && sortedManifest(activeRegistration?.testSourceManifest),
  "V5-R8 source manifests are unsafe, empty, unordered, or duplicated");
  add(errors, sourceManifestRootV5R6(activeRegistration?.productionSourceManifest ?? [])
      === activeRegistration?.productionSourceRootHash
    && sourceManifestRootV5R6(activeRegistration?.testSourceManifest ?? [])
      === activeRegistration?.testSourceRootHash,
  "V5-R8 source manifest roots do not recompute");
  add(errors, canonicalJsonV5R3(activeRegistration?.productionEntryPoints ?? [])
      === canonicalJsonV5R3(PRODUCTION_ENTRYPOINTS_V5_R8)
    && PRODUCTION_ENTRYPOINTS_V5_R8.every((entrypoint) =>
      activeRegistration.productionSourceManifest?.some(({ path: sourcePath }) => sourcePath === entrypoint)),
  "V5-R8 production entrypoint set is invalid or absent from the manifest");
  add(errors, canonicalJsonV5R3(computeClosureKernelsV5R8(
    activeRegistration?.productionSourceManifest ?? []))
      === canonicalJsonV5R3(activeRegistration?.closureKernels ?? {}),
  "V5-R8 closure kernels do not recompute");
  add(errors, runtimeSourceEnumerationRootV5R8(activeRegistration?.productionSourceManifest)
    === activeRegistration?.runtimeSourceEnumerationRootHash,
  "V5-R8 runtime source enumeration root does not recompute");
  add(errors, activeRegistration?.supersededProductionSourceRootHash
      === V5_R7_REGISTRATION.productionSourceRootHash
    && activeRegistration?.supersededTestSourceRootHash === V5_R7_REGISTRATION.testSourceRootHash
    && activeRegistration?.supersededImportClosureRootHash === V5_R7_REGISTRATION.importClosureRootHash
    && activeRegistration?.sourceClosureMode
      === "FULL_TRANSITIVE_RUNTIME_CLOSURE_GIT_OBJECT_BYTES_VERIFIED"
    && activeRegistration?.registrationPathPolicy === "IMMUTABLE_SINGLE_ADD_COMMIT_NO_LATER_TOUCH",
  "V5-R8 predecessor roots or immutability policies are invalid");
  add(errors, Array.isArray(activeRegistration?.trustedProviderEvidenceAnchors)
    && activeRegistration.trustedProviderEvidenceAnchors.length === 0
    && activeRegistration?.routeAuthenticityState
      === "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR",
  "V5-R8 must not invent a provider trust anchor or claim route authenticity");
  const coreGuardHash = componentHash(activeRegistration?.productionSourceManifest ?? [], [
    `${ROOT}activation-guard-v5-r8.mjs`, `${ROOT}trusted-provider-evidence-v5-r8.mjs`,
    `${ROOT}attempt-recovery-v5-r8.mjs`, `${ROOT}native-provider-adapter-v5-r8.mjs`,
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
      && actual?.projectResidency === projectResidency && actual?.registeredCli === "runner-v5-r8-cli.mjs"
      && actual?.coreGuardHash === coreGuardHash && actual?.providerCallsMade === 0,
    `V5-R8 ${name} provider entrypoint is invalid`);
  }
  add(errors, Object.values(activeRegistration?.authorizationState ?? {})
    .every((value) => value === false || value === 0),
  "V5-R8 registration must retain zero authorization and zero provider activity");
  add(errors, activeRegistration?.status
      === "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R8_REVIEW_PROVIDER_EXECUTION_BLOCKED"
    && activeRegistration?.claimCeiling
      === "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED"
    && activeRegistration?.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE",
  "V5-R8 status, claim ceiling, or decision ceiling is invalid");
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

export async function loadExactTrackedRunnerRegistrationV5R8({ repoRoot }) {
  if (!path.isAbsolute(repoRoot)) throw new TypeError("exact V5-R8 loader requires an absolute repository root");
  const mutations = await mutationCommits(repoRoot, REGISTRATION_PATH);
  if (mutations.length !== 1) {
    throw new Error(`V5-R8 registration path must have one immutable add commit; observed ${mutations.length}`);
  }
  const registrationCommit = mutations[0];
  const runnerSourceCommit = (await git(repoRoot, ["rev-parse", `${registrationCommit}^`])).trim();
  if (!COMMIT.test(registrationCommit) || !COMMIT.test(runnerSourceCommit)) {
    throw new Error("V5-R8 registration Git identity is invalid");
  }
  const activeRegistration = await gitJson(repoRoot, registrationCommit, REGISTRATION_PATH);
  const validationErrors = validateActiveRunnerRegistrationV5R8(activeRegistration);
  if (validationErrors.length > 0) {
    throw new Error(`V5-R8 active registration validation failed: ${validationErrors.join("; ")}`);
  }
  if (activeRegistration.runnerSourceCommit !== runnerSourceCommit) {
    throw new Error("V5-R8 registration is not the direct child of its exact runner source commit");
  }
  const review = await gitJson(repoRoot, V5_R7_A11_REVIEW_COMMIT, R7_REVIEW_PATH);
  if (!validateSelfHashV5R3(review) || review.selfHash !== V5_R7_A11_REVIEW_HASH
    || review.decision !== "DISCREPANCY" || review.findingCount !== 8
    || canonicalJsonV5R3(review) !== canonicalJsonV5R3(R7_REVIEW)) {
    throw new Error("bound V5-R7 A11 discrepancy receipt Git object is invalid");
  }
  const closure = await collectGitSourceClosureV5R6({ repoRoot, commit: runnerSourceCommit,
    entryPoints: activeRegistration.productionEntryPoints });
  if (canonicalJsonV5R3(closure.paths)
      !== canonicalJsonV5R3(activeRegistration.productionSourceManifest.map(({ path: sourcePath }) => sourcePath))
    || closure.importEdgeCount !== activeRegistration.productionImportEdgeCount
    || closure.importClosureRootHash !== activeRegistration.importClosureRootHash) {
    throw new Error("V5-R8 production manifest is not the complete transitive Git-object closure");
  }
  const productionManifest = await sourceManifestFromGitV5R6({ repoRoot, commit: runnerSourceCommit,
    paths: closure.paths });
  const testManifest = await sourceManifestFromGitV5R6({ repoRoot, commit: runnerSourceCommit,
    paths: activeRegistration.testSourceManifest.map(({ path: sourcePath }) => sourcePath) });
  if (canonicalJsonV5R3(productionManifest) !== canonicalJsonV5R3(activeRegistration.productionSourceManifest)
    || canonicalJsonV5R3(testManifest) !== canonicalJsonV5R3(activeRegistration.testSourceManifest)) {
    throw new Error("V5-R8 exact Git-object source manifests differ from the registration");
  }
  for (const row of activeRegistration.productionSourceManifest) {
    const current = await readFile(path.join(repoRoot, row.path));
    if (current.byteLength !== row.byteLength || sha256V5R3(current) !== row.sha256) {
      throw new Error(`current execution byte drift from V5-R8 source object: ${row.path}`);
    }
  }
  const currentRegistrationBytes = await readFile(path.join(repoRoot, REGISTRATION_PATH));
  const exactRegistrationBytes = Buffer.from(await git(repoRoot,
    ["show", `${registrationCommit}:${REGISTRATION_PATH}`], null));
  if (!currentRegistrationBytes.equals(exactRegistrationBytes)) {
    throw new Error("current V5-R8 registration bytes differ from its immutable add commit");
  }
  return assertClosedSelfHashedArtifactV5R8(sealV5R3Artifact({
    schemaVersion: "ExactRunnerSupersedingRegistrationEvidenceV4",
    registrationCommit,
    registrationPath: REGISTRATION_PATH,
    registrationPathMutationCount: 1,
    registrationHash: activeRegistration.selfHash,
    runnerSourceCommit,
    productionSourceRootHash: activeRegistration.productionSourceRootHash,
    testSourceRootHash: activeRegistration.testSourceRootHash,
    importClosureRootHash: activeRegistration.importClosureRootHash,
    runtimeSourceEnumerationRootHash: activeRegistration.runtimeSourceEnumerationRootHash,
    supersededRunnerRegistrationHash: V5_R7_REGISTRATION_HASH,
    discrepancyReviewHash: V5_R7_A11_REVIEW_HASH,
    discrepancyReviewCommit: V5_R7_A11_REVIEW_COMMIT,
    verifiedFromGitObjects: true,
    currentRuntimeBytesMatchRegisteredSource: true,
    immutableSingleAddPathVerified: true,
    activeRegistration,
  }), "ExactRunnerSupersedingRegistrationEvidenceV4");
}

export function validateExactRunnerRegistrationEvidenceV5R8(evidence) {
  const errors = [...validateClosedSelfHashedArtifactV5R8(evidence,
    "ExactRunnerSupersedingRegistrationEvidenceV4"),
  ...validateActiveRunnerRegistrationV5R8(evidence?.activeRegistration)];
  add(errors, evidence?.registrationPath === REGISTRATION_PATH
    && evidence?.registrationPathMutationCount === 1
    && evidence?.registrationHash === evidence?.activeRegistration?.selfHash
    && evidence?.runnerSourceCommit === evidence?.activeRegistration?.runnerSourceCommit
    && evidence?.productionSourceRootHash === evidence?.activeRegistration?.productionSourceRootHash
    && evidence?.testSourceRootHash === evidence?.activeRegistration?.testSourceRootHash
    && evidence?.importClosureRootHash === evidence?.activeRegistration?.importClosureRootHash
    && evidence?.runtimeSourceEnumerationRootHash
      === evidence?.activeRegistration?.runtimeSourceEnumerationRootHash
    && evidence?.supersededRunnerRegistrationHash === V5_R7_REGISTRATION_HASH
    && evidence?.discrepancyReviewHash === V5_R7_A11_REVIEW_HASH
    && evidence?.discrepancyReviewCommit === V5_R7_A11_REVIEW_COMMIT
    && evidence?.verifiedFromGitObjects === true
    && evidence?.currentRuntimeBytesMatchRegisteredSource === true
    && evidence?.immutableSingleAddPathVerified === true,
  "V5-R8 exact registration evidence bindings are invalid");
  return Object.freeze([...new Set(errors)]);
}

export async function loadExactFreshRunnerReviewV5R8({ repoRoot, registrationEvidence }) {
  const activeRegistration = registrationEvidence?.activeRegistration;
  const registrationErrors = validateExactRunnerRegistrationEvidenceV5R8(registrationEvidence);
  if (registrationErrors.length > 0) throw new Error(registrationErrors.join("; "));
  const receiptMutations = await mutationCommits(repoRoot, R8_REVIEW_PATHS.receipt);
  if (receiptMutations.length !== 1) {
    throw new Error(`V5-R8 review receipt path must have one immutable add commit; observed ${receiptMutations.length}`);
  }
  const reviewCommit = receiptMutations[0];
  const reviewCommitParent = (await git(repoRoot, ["rev-parse", `${reviewCommit}^`])).trim();
  if (reviewCommitParent !== registrationEvidence.registrationCommit) {
    throw new Error("V5-R8 review commit is not the direct child of the exact registration commit");
  }
  for (const sourcePath of Object.values(R8_REVIEW_PATHS)) {
    const mutations = await mutationCommits(repoRoot, sourcePath);
    if (mutations.length !== 1 || mutations[0] !== reviewCommit) {
      throw new Error(`V5-R8 review process artifact lacks exact single-add custody: ${sourcePath}`);
    }
  }
  const freshReview = await gitJson(repoRoot, reviewCommit, R8_REVIEW_PATHS.receipt);
  const processArtifacts = {
    verifierSourceManifest: await gitJson(repoRoot, reviewCommit, R8_REVIEW_PATHS.verifierSourceManifest),
    dependencyLockManifest: await gitJson(repoRoot, reviewCommit, R8_REVIEW_PATHS.dependencyLockManifest),
    staticImportGraphReceipt: await gitJson(repoRoot, reviewCommit, R8_REVIEW_PATHS.staticImportGraphReceipt),
    forbiddenPrimaryScorerPathScanReceipt: await gitJson(repoRoot, reviewCommit,
      R8_REVIEW_PATHS.forbiddenPrimaryScorerPathScanReceipt),
    commandRuntimeReceipt: await gitJson(repoRoot, reviewCommit, R8_REVIEW_PATHS.commandRuntimeReceipt),
    independentSourceEnumerationReceipt: await gitJson(repoRoot, reviewCommit,
      R8_REVIEW_PATHS.independentSourceEnumerationReceipt),
  };
  const reviewCustody = {
    verifiedFromGitObjects: true,
    reviewReceiptPathMutationCount: 1,
    reviewCommit,
    reviewCommitParent,
    reviewReceiptHash: freshReview.selfHash,
  };
  const errors = validateFreshRunnerReviewV5R8({ activeRegistration, registrationEvidence,
    freshReview, processArtifacts, reviewCustody });
  if (errors.length > 0) throw new Error(`V5-R8 fresh review validation failed: ${errors.join("; ")}`);
  return Object.freeze({ freshReview, processArtifacts: Object.freeze(processArtifacts),
    reviewCustody: Object.freeze(reviewCustody) });
}

export const EXECUTION_EVIDENCE_V5_R8_CONSTANTS = Object.freeze({
  registrationPath: REGISTRATION_PATH,
  reviewPaths: R8_REVIEW_PATHS,
  immutablePathMutationCount: 1,
  supersededRegistrationHash: V5_R7_REGISTRATION_HASH,
  discrepancyReviewHash: V5_R7_A11_REVIEW_HASH,
  remediatedFindingIds: R7_FINDING_IDS_V5_R8,
});
