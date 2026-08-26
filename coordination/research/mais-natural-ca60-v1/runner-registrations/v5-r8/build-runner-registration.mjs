import path from "node:path";

import V5_R7_REGISTRATION from "../v5-r7/runner-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  computeClosureKernelsV5R8,
  PRODUCTION_ENTRYPOINTS_V5_R8,
  R7_FINDING_IDS_V5_R8,
  runtimeSourceEnumerationRootV5R8,
  V5_R7_A11_REVIEW_COMMIT,
  V5_R7_A11_REVIEW_HASH,
  V5_R7_REGISTRATION_COMMIT,
  V5_R7_REGISTRATION_HASH,
  V5_R7_SOURCE_COMMIT,
  V5_R8_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
  validateActiveRunnerRegistrationV5R8,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r8.mjs";
import {
  collectGitSourceClosureV5R6,
  sourceManifestFromGitV5R6,
  sourceManifestRootV5R6,
} from "../../../../content-qa/mais-natural-ca60-v1/source-closure-v5-r6.mjs";
import {
  assertClosedSelfHashedArtifactV5R8,
} from "../../../../content-qa/mais-natural-ca60-v1/schema-contract-v5-r8.mjs";

const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const R7_REVIEWED_AT = "2026-08-26T13:23:32.000Z";
const SESSION_LOG = "coordination/session-logs/2026-08-26-A07-mais-natural-ca60-v5-r8.md";

export const TEST_ENTRYPOINTS_V5_R8 = Object.freeze([
  `${ROOT}runner-v5-r8-remediation.test.mjs`,
  `${ROOT}runner-v5-r8-schemas.test.mjs`,
  `${ROOT}runner-v5-r8-evidence.test.mjs`,
  `${ROOT}runner-v5-r8-runtime.test.mjs`,
  `${ROOT}runner-v5-r8-cli.test.mjs`,
  `${ROOT}runner-v5-r8-scorer-verifier.test.mjs`,
  "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r8/runner-registration-artifact.test.mjs",
].sort());

export const TEST_NON_IMPORT_PATHS_V5_R8 = Object.freeze([SESSION_LOG]);

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function componentHash(manifest, sourcePaths) {
  const expected = [...new Set(sourcePaths)].sort(compare);
  const selected = manifest.filter(({ path: sourcePath }) => expected.includes(sourcePath));
  requireCondition(selected.length === expected.length,
    `R8 core-guard source is absent: ${expected.filter((sourcePath) =>
      !selected.some(({ path: present }) => present === sourcePath)).join(", ")}`);
  return sha256V5R3(canonicalJsonV5R3(selected));
}

function validateManifest(manifest, label) {
  requireCondition(Array.isArray(manifest) && manifest.length > 0
    && canonicalJsonV5R3(manifest.map(({ path: sourcePath }) => sourcePath))
      === canonicalJsonV5R3(manifest.map(({ path: sourcePath }) => sourcePath).sort(compare))
    && new Set(manifest.map(({ path: sourcePath }) => sourcePath)).size === manifest.length
    && manifest.every((row) => typeof row.path === "string" && !path.isAbsolute(row.path)
      && !path.normalize(row.path).split(path.sep).includes("..")
      && Number.isSafeInteger(row.byteLength) && row.byteLength > 0
      && /^[0-9a-f]{64}$/u.test(row.sha256)),
  `R8 ${label} source manifest is unsafe, unordered, duplicated, or incomplete`);
}

export function registeredTestPathsV5R8(testClosure) {
  requireCondition(Array.isArray(testClosure?.paths) && Array.isArray(testClosure?.edges)
    && Number.isSafeInteger(testClosure.importEdgeCount) && testClosure.importEdgeCount > 0,
  "R8 test transitive closure is invalid");
  return Object.freeze([...new Set([...testClosure.paths, ...TEST_NON_IMPORT_PATHS_V5_R8])]
    .sort(compare));
}

export function buildRunnerSupersedingRegistrationV5R8({
  runnerSourceCommit,
  productionClosure,
  testClosure,
  productionSourceManifest,
  testSourceManifest,
  registeredAt,
}) {
  requireCondition(/^[0-9a-f]{40}$/u.test(runnerSourceCommit),
    "R8 runner source commit is invalid");
  requireCondition(new Date(registeredAt).toISOString() === registeredAt
    && Date.parse(registeredAt) > Date.parse(R7_REVIEWED_AT),
  "R8 runner registration must strictly postdate the bound V5-R7 A11 discrepancy review");
  validateManifest(productionSourceManifest, "production");
  validateManifest(testSourceManifest, "test");
  requireCondition(Array.isArray(productionClosure?.paths) && Array.isArray(productionClosure?.edges)
    && Number.isSafeInteger(productionClosure.importEdgeCount) && productionClosure.importEdgeCount > 0
    && /^[0-9a-f]{64}$/u.test(productionClosure.importClosureRootHash ?? ""),
  "R8 production transitive closure is invalid");
  requireCondition(canonicalJsonV5R3(productionClosure.paths)
    === canonicalJsonV5R3(productionSourceManifest.map(({ path: sourcePath }) => sourcePath)),
  "R8 production manifest is not the complete transitive import closure");
  requireCondition(PRODUCTION_ENTRYPOINTS_V5_R8.every((entrypoint) =>
    productionClosure.paths.includes(entrypoint)),
  "R8 production entrypoints are absent from the closure");
  requireCondition(TEST_ENTRYPOINTS_V5_R8.every((entrypoint) => testClosure.paths.includes(entrypoint))
    && canonicalJsonV5R3(registeredTestPathsV5R8(testClosure))
      === canonicalJsonV5R3(testSourceManifest.map(({ path: sourcePath }) => sourcePath)),
  "R8 test manifest differs from the registered test closure and session handoff");
  const closureKernels = computeClosureKernelsV5R8(productionSourceManifest);
  requireCondition(Object.values(closureKernels).every((value) => /^[0-9a-f]{64}$/u.test(value ?? "")),
    "R8 closure-kernel component source is missing");
  const coreGuardHash = componentHash(productionSourceManifest, [
    `${ROOT}activation-guard-v5-r8.mjs`, `${ROOT}trusted-provider-evidence-v5-r8.mjs`,
    `${ROOT}attempt-recovery-v5-r8.mjs`, `${ROOT}native-provider-adapter-v5-r8.mjs`,
  ]);
  const frozen = Object.fromEntries([
    "designRegistrationHash", "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash",
    "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash", "privacyScreenHash",
    "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash", "rightsPolicyHash",
    "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash", "thresholdsDecisionAndPowerHash",
    "decisionCeiling", "providerContractErratumHash",
  ].map((field) => [field, V5_R7_REGISTRATION[field]]));
  const registration = sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerSupersedingRegistrationV4",
    runnerVersion: "V5-R8",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt,
    supersedesRunnerRegistrationHash: V5_R7_REGISTRATION_HASH,
    supersededRunnerRegistrationCommit: V5_R7_REGISTRATION_COMMIT,
    supersededRunnerSourceCommit: V5_R7_SOURCE_COMMIT,
    discrepancyReviewHash: V5_R7_A11_REVIEW_HASH,
    discrepancyReviewCommit: V5_R7_A11_REVIEW_COMMIT,
    previousReceiptHash: V5_R7_A11_REVIEW_HASH,
    ownerRunnerImplementationAuthorizationTextHash:
      V5_R8_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
    ...frozen,
    runnerSourceCommit,
    productionEntryPoints: [...PRODUCTION_ENTRYPOINTS_V5_R8],
    productionSourceManifest,
    productionSourceRootHash: sourceManifestRootV5R6(productionSourceManifest),
    productionImportEdgeCount: productionClosure.importEdgeCount,
    importClosureRootHash: productionClosure.importClosureRootHash,
    testSourceManifest,
    testSourceRootHash: sourceManifestRootV5R6(testSourceManifest),
    supersededProductionSourceRootHash: V5_R7_REGISTRATION.productionSourceRootHash,
    supersededTestSourceRootHash: V5_R7_REGISTRATION.testSourceRootHash,
    supersededImportClosureRootHash: V5_R7_REGISTRATION.importClosureRootHash,
    sourceClosureMode: "FULL_TRANSITIVE_RUNTIME_CLOSURE_GIT_OBJECT_BYTES_VERIFIED",
    registrationPathPolicy: "IMMUTABLE_SINGLE_ADD_COMMIT_NO_LATER_TOUCH",
    remediatedFindingIds: [...R7_FINDING_IDS_V5_R8],
    closureKernels,
    runtimeSourceEnumerationRootHash: runtimeSourceEnumerationRootV5R8(productionSourceManifest),
    trustedProviderEvidenceAnchors: [],
    routeAuthenticityState: "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR",
    providerEntrypoints: {
      openAI: { provider: "OPENAI_DIRECT", model: "gpt-5.6-luna",
        endpoint: "https://us.api.openai.com/v1/responses",
        projectResidency: "US_STORAGE_PROCESSING", registeredCli: "runner-v5-r8-cli.mjs",
        coreGuardHash, providerCallsMade: 0 },
      deepSeek: { provider: "DEEPSEEK_DIRECT", model: "deepseek-v4-pro",
        endpoint: "https://api.deepseek.com/chat/completions", projectResidency: "UNRESOLVED",
        registeredCli: "runner-v5-r8-cli.mjs", coreGuardHash, providerCallsMade: 0 },
    },
    authorizationState: {
      credentialReadAuthorized: false,
      providerExecutionAuthorized: false,
      naturalQuestionEgressAuthorized: false,
      tokenAuthorizationCreated: false,
      attemptAuthorizationCreated: false,
      usdAuthorizationCreated: false,
      credentialReadCount: 0,
      providerEventCount: 0,
      naturalQuestionEgressCount: 0,
      tokenCount: 0,
      attemptCount: 0,
      usdSpent: 0,
      referenceLabelCount: 0,
      naturalQuestionResultCount: 0,
    },
    status: "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R8_REVIEW_PROVIDER_EXECUTION_BLOCKED",
    claimCeiling: "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
  });
  assertClosedSelfHashedArtifactV5R8(registration,
    "NaturalCaExecutionRunnerSupersedingRegistrationV4");
  const errors = validateActiveRunnerRegistrationV5R8(registration);
  requireCondition(errors.length === 0, errors.join("; "));
  return registration;
}

export async function buildRunnerSupersedingRegistrationFromGitV5R8({
  repoRoot,
  runnerSourceCommit,
  registeredAt,
}) {
  const productionClosure = await collectGitSourceClosureV5R6({
    repoRoot, commit: runnerSourceCommit, entryPoints: PRODUCTION_ENTRYPOINTS_V5_R8,
  });
  const testClosure = await collectGitSourceClosureV5R6({
    repoRoot, commit: runnerSourceCommit, entryPoints: TEST_ENTRYPOINTS_V5_R8,
  });
  const productionSourceManifest = await sourceManifestFromGitV5R6({
    repoRoot, commit: runnerSourceCommit, paths: productionClosure.paths,
  });
  const testSourceManifest = await sourceManifestFromGitV5R6({
    repoRoot, commit: runnerSourceCommit, paths: registeredTestPathsV5R8(testClosure),
  });
  return buildRunnerSupersedingRegistrationV5R8({ runnerSourceCommit, productionClosure,
    testClosure, productionSourceManifest, testSourceManifest, registeredAt });
}
