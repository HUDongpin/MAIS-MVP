import { execFile as nodeExecFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import V5_R5_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r5/runner-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateClosedSelfHashedArtifactV5R6,
} from "./schema-contract-v5-r6.mjs";
import {
  collectGitSourceClosureV5R6,
  sourceManifestFromGitV5R6,
  sourceManifestRootV5R6,
} from "./source-closure-v5-r6.mjs";

const execFileAsync = promisify(nodeExecFile);
const HASH = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const REGISTRATION_PATH = "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r6/runner-registration.json";
const REVIEW_PATH = "coordination/reports/mais-natural-ca60-v5-r5-runner-review/independent-runner-review-receipt.json";

export const V5_R5_REGISTRATION_HASH = "6c96a27da2ce36c69d4190db3b6a2fde59c430a250c85417ef2526b25da2bbce";
export const V5_R5_REGISTRATION_COMMIT = "12d65e6d7bf3f4e7da2010b973df0d08fb3a3c4f";
export const V5_R5_SOURCE_COMMIT = "440ee182e9841676495bc884ac4bf0eda7cf3985";
export const V5_R5_A11_REVIEW_HASH = "e25f8212ae0d150d5a690f4f13942922752730d606ab85ebb730a6c780854b39";
export const V5_R5_A11_REVIEW_COMMIT = "311bc2ea99595fd6a52c52cc21bb19f83ff11f47";
export const V5_R5_A11_REVIEW_INTEGRATION_COMMIT = "727e440a0897ae7b0caa4fff18853482a5af3b39";
export const V5_R6_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH = "8f9767f1bb087656d57ab7885f621ef449eff61ea89aaead8bd34bf27f30f74f";

export const PRODUCTION_ENTRYPOINTS_V5_R6 = Object.freeze([
  `${ROOT}activation-guard-v5-r6.mjs`,
  `${ROOT}c0-terminal-v5-r6.mjs`,
  `${ROOT}execution-evidence-v5-r6.mjs`,
  `${ROOT}guarded-provider-attempt-v5-r6.mjs`,
  `${ROOT}provider-request-v5-r6.mjs`,
  `${ROOT}raw-response-custody-v5-r6.mjs`,
  `${ROOT}reference-execution-freeze-v5-r6.mjs`,
  `${ROOT}route-evidence-custody-v5-r6.mjs`,
  `${ROOT}runner-v5-r6-cli.mjs`,
  `${ROOT}runner-v5-r6-runtime.mjs`,
  `${ROOT}schema-contract-v5-r6.mjs`,
  `${ROOT}scorer-v5-r6.mjs`,
  `${ROOT}source-closure-v5-r6.mjs`,
  `${ROOT}transition-journal-v5-r6.mjs`,
  `${ROOT}workflow-index-v5-r6.mjs`,
].sort());

function add(errors, condition, message) {
  if (!condition && !errors.includes(message)) errors.push(message);
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function componentHash(manifest, paths) {
  const expected = [...new Set(paths)].sort(compare);
  const selected = (manifest ?? []).filter(({ path: sourcePath }) => expected.includes(sourcePath));
  return selected.length === expected.length ? sha256V5R3(canonicalJsonV5R3(selected)) : null;
}

export function computeClosureKernelsV5R6(productionSourceManifest) {
  const schemas = productionSourceManifest.map(({ path: sourcePath }) => sourcePath)
    .filter((sourcePath) => sourcePath.startsWith(`${ROOT}schemas/`) && sourcePath.endsWith(".schema.json"));
  return Object.freeze({
    resolvedDeepSeekRequestHash: componentHash(productionSourceManifest, [`${ROOT}provider-request-v5-r6.mjs`, `${ROOT}activation-guard-v5-r6.mjs`]),
    terminalC0AndScoreHash: componentHash(productionSourceManifest, [`${ROOT}c0-terminal-v5-r6.mjs`, `${ROOT}scorer-v5-r6.mjs`]),
    routeEvidenceCustodyHash: componentHash(productionSourceManifest, [`${ROOT}route-evidence-custody-v5-r6.mjs`]),
    versionedReviewMigrationHash: componentHash(productionSourceManifest, [`${ROOT}workflow-index-v5-r6.mjs`]),
    exactRegistrationLoaderHash: componentHash(productionSourceManifest, [`${ROOT}execution-evidence-v5-r6.mjs`]),
    fullTransitiveSourceClosureHash: componentHash(productionSourceManifest, [`${ROOT}source-closure-v5-r6.mjs`, ...schemas]),
    rawResponseCustodyHash: componentHash(productionSourceManifest, [`${ROOT}raw-response-custody-v5-r6.mjs`, `${ROOT}guarded-provider-attempt-v5-r6.mjs`]),
    transitionJournalHash: componentHash(productionSourceManifest, [`${ROOT}transition-journal-v5-r6.mjs`, `${ROOT}runner-v5-r6-runtime.mjs`, `${ROOT}runner-v5-r6-cli.mjs`]),
    completeAttemptGraphIntegrityHash: componentHash(productionSourceManifest, [`${ROOT}scorer-v5-r6.mjs`]),
    runtimeCliHash: componentHash(productionSourceManifest, [`${ROOT}runner-v5-r6-runtime.mjs`, `${ROOT}runner-v5-r6-cli.mjs`]),
  });
}

function sortedUniqueManifest(manifest) {
  return Array.isArray(manifest) && manifest.length > 0
    && new Set(manifest.map(({ path: sourcePath }) => sourcePath)).size === manifest.length
    && canonicalJsonV5R3(manifest.map(({ path: sourcePath }) => sourcePath))
      === canonicalJsonV5R3(manifest.map(({ path: sourcePath }) => sourcePath).sort(compare))
    && manifest.every((row) => typeof row.path === "string" && !path.isAbsolute(row.path)
      && !path.normalize(row.path).split(path.sep).includes("..") && Number.isSafeInteger(row.byteLength)
      && row.byteLength > 0 && HASH.test(row.sha256 ?? ""));
}

export function validateActiveRunnerRegistrationV5R6(activeRegistration) {
  const errors = [...validateClosedSelfHashedArtifactV5R6(activeRegistration,
    "NaturalCaExecutionRunnerSupersedingRegistrationV2")];
  add(errors, validateSelfHashV5R3(activeRegistration), "active V5-R6 registration self-hash is invalid");
  add(errors, activeRegistration?.supersedesRunnerRegistrationHash === V5_R5_REGISTRATION_HASH
    && activeRegistration?.supersededRunnerRegistrationCommit === V5_R5_REGISTRATION_COMMIT
    && activeRegistration?.supersededRunnerSourceCommit === V5_R5_SOURCE_COMMIT,
  "V5-R6 does not supersede the exact immutable V5-R5 registration/source");
  add(errors, activeRegistration?.discrepancyReviewHash === V5_R5_A11_REVIEW_HASH
    && activeRegistration?.discrepancyReviewCommit === V5_R5_A11_REVIEW_COMMIT
    && activeRegistration?.integratedDiscrepancyReviewCommit === V5_R5_A11_REVIEW_INTEGRATION_COMMIT
    && activeRegistration?.previousReceiptHash === V5_R5_A11_REVIEW_HASH,
  "V5-R6 does not bind the exact fresh V5-R5 A11 discrepancy receipt and commits");
  add(errors, activeRegistration?.ownerRunnerImplementationAuthorizationTextHash
    === V5_R6_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
  "V5-R6 owner offline implementation authorization text hash is invalid");
  const frozenFields = ["designRegistrationHash", "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash",
    "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash", "privacyScreenHash", "rightsScreenHash",
    "ownerDecisionRequestHash", "ownerDecisionReceiptHash", "rightsPolicyHash", "lineageRuleHash", "taxonomyHash",
    "labelingAndAdjudicationHash", "thresholdsDecisionAndPowerHash", "decisionCeiling", "providerContractErratumHash"];
  for (const field of frozenFields) add(errors, activeRegistration?.[field] === V5_R5_REGISTRATION[field],
    `V5-R6 frozen ${field} differs from V5-R5`);
  add(errors, sortedUniqueManifest(activeRegistration?.productionSourceManifest)
    && sortedUniqueManifest(activeRegistration?.testSourceManifest), "V5-R6 source manifests are unsafe, empty, unordered, or duplicated");
  add(errors, sourceManifestRootV5R6(activeRegistration?.productionSourceManifest ?? []) === activeRegistration?.productionSourceRootHash
    && sourceManifestRootV5R6(activeRegistration?.testSourceManifest ?? []) === activeRegistration?.testSourceRootHash,
  "V5-R6 source manifest roots do not recompute");
  add(errors, canonicalJsonV5R3(activeRegistration?.productionEntryPoints ?? [])
    === canonicalJsonV5R3(PRODUCTION_ENTRYPOINTS_V5_R6), "V5-R6 production entrypoint set is invalid");
  add(errors, activeRegistration?.productionEntryPoints?.every((entrypoint) =>
    activeRegistration.productionSourceManifest.some(({ path: sourcePath }) => sourcePath === entrypoint)),
  "V5-R6 production manifest omits a registered entrypoint");
  add(errors, canonicalJsonV5R3(computeClosureKernelsV5R6(activeRegistration?.productionSourceManifest ?? []))
    === canonicalJsonV5R3(activeRegistration?.closureKernels ?? {}),
  "V5-R6 remediation closure kernels do not recompute from the production manifest");
  add(errors, activeRegistration?.supersededProductionSourceRootHash === V5_R5_REGISTRATION.productionSourceRootHash
    && activeRegistration?.supersededTestSourceRootHash === V5_R5_REGISTRATION.testSourceRootHash
    && activeRegistration?.sourceClosureMode === "FULL_TRANSITIVE_RUNTIME_CLOSURE_CURRENT_BYTES_VERIFIED"
    && activeRegistration?.registrationPathPolicy === "IMMUTABLE_SINGLE_ADD_COMMIT_NO_LATER_TOUCH",
  "V5-R6 superseded roots or source/path immutability policies are invalid");
  const coreGuardHash = componentHash(activeRegistration?.productionSourceManifest ?? [], [
    `${ROOT}activation-guard-v5-r6.mjs`, `${ROOT}guarded-provider-attempt-v5-r6.mjs`, `${ROOT}provider-request-v5-r6.mjs`,
  ]);
  const expectedEntrypoints = {
    openAI: { provider: "OPENAI_DIRECT", model: "gpt-5.6-luna", endpoint: "https://us.api.openai.com/v1/responses",
      projectResidency: "US_STORAGE_PROCESSING" },
    deepSeek: { provider: "DEEPSEEK_DIRECT", model: "deepseek-v4-pro", endpoint: "https://api.deepseek.com/chat/completions",
      projectResidency: "UNRESOLVED" },
  };
  for (const [name, expected] of Object.entries(expectedEntrypoints)) {
    const actual = activeRegistration?.providerEntrypoints?.[name];
    add(errors, actual?.provider === expected.provider && actual?.model === expected.model
      && actual?.endpoint === expected.endpoint && actual?.projectResidency === expected.projectResidency
      && actual?.registeredCli === "runner-v5-r6-cli.mjs" && actual?.coreGuardHash === coreGuardHash
      && actual?.providerCallsMade === 0, `V5-R6 ${name} provider entrypoint is invalid`);
  }
  add(errors, Object.values(activeRegistration?.authorizationState ?? {}).every((value) => value === false || value === 0),
    "V5-R6 registration must retain zero authorization and zero provider activity");
  add(errors, activeRegistration?.status === "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R6_REVIEW_PROVIDER_EXECUTION_BLOCKED"
    && activeRegistration?.claimCeiling === "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED"
    && activeRegistration?.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE",
  "V5-R6 status, claim ceiling, or decision ceiling is invalid");
  return Object.freeze([...new Set(errors)]);
}

async function git(repoRoot, args, encoding = "utf8") {
  return (await execFileAsync("git", args, { cwd: repoRoot, encoding, maxBuffer: 64 * 1024 * 1024 })).stdout;
}

async function gitJson(repoRoot, commit, sourcePath) {
  return JSON.parse(await git(repoRoot, ["show", `${commit}:${sourcePath}`], "utf8"));
}

function rowsEqual(left, right) {
  return canonicalJsonV5R3(left) === canonicalJsonV5R3(right);
}

export async function loadExactTrackedRunnerRegistrationV5R6({ repoRoot }) {
  if (!path.isAbsolute(repoRoot)) throw new TypeError("exact V5-R6 loader requires an absolute repository root");
  const mutationCommits = (await git(repoRoot, ["log", "--format=%H", "--", REGISTRATION_PATH]))
    .trim().split(/\s+/u).filter(Boolean);
  if (mutationCommits.length !== 1) {
    throw new Error(`V5-R6 registration path must have exactly one immutable add commit; observed ${mutationCommits.length}`);
  }
  const registrationCommit = mutationCommits[0];
  const runnerSourceCommit = (await git(repoRoot, ["rev-parse", `${registrationCommit}^`])).trim();
  if (!COMMIT.test(registrationCommit) || !COMMIT.test(runnerSourceCommit)) throw new Error("V5-R6 registration Git identity is invalid");
  const activeRegistration = await gitJson(repoRoot, registrationCommit, REGISTRATION_PATH);
  const validationErrors = validateActiveRunnerRegistrationV5R6(activeRegistration);
  if (validationErrors.length > 0) throw new Error(`V5-R6 active registration validation failed: ${validationErrors.join("; ")}`);
  if (activeRegistration.runnerSourceCommit !== runnerSourceCommit) {
    throw new Error("V5-R6 registration is not the direct child of its exact runner source commit");
  }
  const review = await gitJson(repoRoot, V5_R5_A11_REVIEW_COMMIT, REVIEW_PATH);
  if (!validateSelfHashV5R3(review) || review.selfHash !== V5_R5_A11_REVIEW_HASH || review.decision !== "DISCREPANCY") {
    throw new Error("bound V5-R5 A11 discrepancy receipt Git object is invalid");
  }
  const closure = await collectGitSourceClosureV5R6({ repoRoot, commit: runnerSourceCommit,
    entryPoints: activeRegistration.productionEntryPoints });
  if (canonicalJsonV5R3(closure.paths) !== canonicalJsonV5R3(activeRegistration.productionSourceManifest.map(({ path: sourcePath }) => sourcePath))
    || closure.importEdgeCount !== activeRegistration.productionImportEdgeCount
    || closure.importClosureRootHash !== activeRegistration.importClosureRootHash) {
    throw new Error("V5-R6 registration production manifest is not the complete transitive import closure");
  }
  const productionManifest = await sourceManifestFromGitV5R6({ repoRoot, commit: runnerSourceCommit, paths: closure.paths });
  const testManifest = await sourceManifestFromGitV5R6({ repoRoot, commit: runnerSourceCommit,
    paths: activeRegistration.testSourceManifest.map(({ path: sourcePath }) => sourcePath) });
  if (!rowsEqual(productionManifest, activeRegistration.productionSourceManifest)
    || !rowsEqual(testManifest, activeRegistration.testSourceManifest)) {
    throw new Error("V5-R6 exact Git-object source manifests differ from the registration");
  }
  for (const row of activeRegistration.productionSourceManifest) {
    const current = await readFile(path.join(repoRoot, row.path));
    if (current.byteLength !== row.byteLength || sha256V5R3(current) !== row.sha256) {
      throw new Error(`current execution byte drift from V5-R6 source object: ${row.path}`);
    }
  }
  const currentRegistrationBytes = await readFile(path.join(repoRoot, REGISTRATION_PATH));
  const exactRegistrationBytes = Buffer.from(await git(repoRoot, ["show", `${registrationCommit}:${REGISTRATION_PATH}`], null));
  if (!currentRegistrationBytes.equals(exactRegistrationBytes)) throw new Error("current V5-R6 registration bytes differ from its immutable add commit");
  const evidence = sealV5R3Artifact({
    schemaVersion: "ExactRunnerSupersedingRegistrationEvidenceV2",
    registrationCommit,
    registrationPath: REGISTRATION_PATH,
    registrationPathMutationCount: 1,
    registrationHash: activeRegistration.selfHash,
    runnerSourceCommit,
    productionSourceRootHash: activeRegistration.productionSourceRootHash,
    testSourceRootHash: activeRegistration.testSourceRootHash,
    importClosureRootHash: activeRegistration.importClosureRootHash,
    supersededRunnerRegistrationHash: V5_R5_REGISTRATION_HASH,
    discrepancyReviewHash: V5_R5_A11_REVIEW_HASH,
    verifiedFromGitObjects: true,
    currentRuntimeBytesMatchRegisteredSource: true,
    immutableSingleAddPathVerified: true,
    activeRegistration,
  });
  const evidenceErrors = validateClosedSelfHashedArtifactV5R6(evidence,
    "ExactRunnerSupersedingRegistrationEvidenceV2");
  if (evidenceErrors.length > 0) throw new Error(`V5-R6 exact registration evidence failed: ${evidenceErrors.join("; ")}`);
  return evidence;
}

export function validateExactRunnerRegistrationEvidenceV5R6(evidence) {
  const errors = [...validateClosedSelfHashedArtifactV5R6(evidence,
    "ExactRunnerSupersedingRegistrationEvidenceV2")];
  errors.push(...validateActiveRunnerRegistrationV5R6(evidence?.activeRegistration));
  add(errors, evidence?.registrationPath === REGISTRATION_PATH && evidence?.registrationPathMutationCount === 1
    && evidence?.registrationHash === evidence?.activeRegistration?.selfHash
    && evidence?.runnerSourceCommit === evidence?.activeRegistration?.runnerSourceCommit
    && evidence?.productionSourceRootHash === evidence?.activeRegistration?.productionSourceRootHash
    && evidence?.testSourceRootHash === evidence?.activeRegistration?.testSourceRootHash
    && evidence?.importClosureRootHash === evidence?.activeRegistration?.importClosureRootHash
    && evidence?.supersededRunnerRegistrationHash === V5_R5_REGISTRATION_HASH
    && evidence?.discrepancyReviewHash === V5_R5_A11_REVIEW_HASH
    && evidence?.verifiedFromGitObjects === true && evidence?.currentRuntimeBytesMatchRegisteredSource === true
    && evidence?.immutableSingleAddPathVerified === true,
  "V5-R6 exact registration evidence bindings are invalid");
  return Object.freeze([...new Set(errors)]);
}

export function validateFreshRunnerReviewV5R6({ activeRegistration, registrationEvidence, freshReview }) {
  const errors = [...validateClosedSelfHashedArtifactV5R6(freshReview,
    "IndependentExecutionRunnerReviewReceiptV4")];
  add(errors, freshReview?.decision === "CONCURRED" && freshReview?.findingCount === 0,
    "fresh A11 V5-R6 review must be CONCURRED with zero findings");
  add(errors, freshReview?.reviewedRunnerRegistrationHash === activeRegistration?.selfHash
    && freshReview?.reviewedRunnerRegistrationCommit === registrationEvidence?.registrationCommit
    && freshReview?.reviewedRunnerSourceCommit === activeRegistration?.runnerSourceCommit
    && freshReview?.reviewedProductionSourceRootHash === activeRegistration?.productionSourceRootHash
    && freshReview?.reviewedTestSourceRootHash === activeRegistration?.testSourceRootHash
    && freshReview?.reviewedImportClosureRootHash === activeRegistration?.importClosureRootHash,
  "fresh A11 V5-R6 review does not bind the exact registration commit, source, and full closure roots");
  add(errors, Date.parse(freshReview?.reviewedAt ?? "") > Date.parse(activeRegistration?.registeredAt ?? ""),
    "fresh A11 V5-R6 review must strictly postdate the registration");
  return Object.freeze([...new Set(errors)]);
}

export const EXECUTION_EVIDENCE_V5_R6_CONSTANTS = Object.freeze({
  registrationPath: REGISTRATION_PATH,
  immutablePathMutationCount: 1,
  supersededRegistrationHash: V5_R5_REGISTRATION_HASH,
  discrepancyReviewHash: V5_R5_A11_REVIEW_HASH,
});
