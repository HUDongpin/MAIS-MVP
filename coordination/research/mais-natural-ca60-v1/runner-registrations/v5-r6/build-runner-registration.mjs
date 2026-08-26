import path from "node:path";

import V5_R5_REGISTRATION from "../v5-r5/runner-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  computeClosureKernelsV5R6,
  PRODUCTION_ENTRYPOINTS_V5_R6,
  V5_R5_A11_REVIEW_COMMIT,
  V5_R5_A11_REVIEW_HASH,
  V5_R5_A11_REVIEW_INTEGRATION_COMMIT,
  V5_R5_REGISTRATION_COMMIT,
  V5_R5_REGISTRATION_HASH,
  V5_R5_SOURCE_COMMIT,
  V5_R6_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
  validateActiveRunnerRegistrationV5R6,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r6.mjs";
import {
  collectGitSourceClosureV5R6,
  sourceManifestFromGitV5R6,
  sourceManifestRootV5R6,
} from "../../../../content-qa/mais-natural-ca60-v1/source-closure-v5-r6.mjs";
import {
  assertClosedSelfHashedArtifactV5R6,
} from "../../../../content-qa/mais-natural-ca60-v1/schema-contract-v5-r6.mjs";

const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const REVIEWED_AT = "2026-08-26T08:02:11.000Z";

export const TEST_PATHS_V5_R6 = Object.freeze([
  `${ROOT}runner-v5-r6-cli.test.mjs`,
  `${ROOT}runner-v5-r6-contracts.test.mjs`,
  `${ROOT}runner-v5-r6-offline.test.mjs`,
  `${ROOT}runner-v5-r6-remediation.test.mjs`,
  `${ROOT}runner-v5-r6-source-closure.test.mjs`,
  `${ROOT}runner-v5-r6-test-fixtures.mjs`,
  "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r6/build-runner-registration.mjs",
  "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r6/runner-registration-artifact.test.mjs",
].sort());

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
    `component source is absent: ${expected.filter((sourcePath) => !selected.some(({ path: present }) => present === sourcePath)).join(", ")}`);
  return sha256V5R3(canonicalJsonV5R3(selected));
}

function validateManifest(manifest, label) {
  requireCondition(Array.isArray(manifest) && manifest.length > 0
    && canonicalJsonV5R3(manifest.map(({ path: sourcePath }) => sourcePath))
      === canonicalJsonV5R3(manifest.map(({ path: sourcePath }) => sourcePath).sort(compare))
    && new Set(manifest.map(({ path: sourcePath }) => sourcePath)).size === manifest.length
    && manifest.every((row) => typeof row.path === "string" && !path.isAbsolute(row.path)
      && !path.normalize(row.path).split(path.sep).includes("..") && Number.isSafeInteger(row.byteLength)
      && row.byteLength > 0 && /^[0-9a-f]{64}$/u.test(row.sha256)),
  `${label} source manifest is unsafe, unordered, duplicated, or incomplete`);
}

export function buildRunnerSupersedingRegistrationV5R6({
  runnerSourceCommit,
  productionClosure,
  productionSourceManifest,
  testSourceManifest,
  registeredAt,
}) {
  requireCondition(/^[0-9a-f]{40}$/u.test(runnerSourceCommit), "R6 runner source commit is invalid");
  requireCondition(new Date(registeredAt).toISOString() === registeredAt
    && Date.parse(registeredAt) > Date.parse(REVIEWED_AT),
  "R6 runner registration must strictly postdate the bound V5-R5 A11 discrepancy review");
  validateManifest(productionSourceManifest, "production");
  validateManifest(testSourceManifest, "test");
  requireCondition(Array.isArray(productionClosure?.paths) && Array.isArray(productionClosure?.edges)
    && Number.isSafeInteger(productionClosure.importEdgeCount) && productionClosure.importEdgeCount > 0
    && /^[0-9a-f]{64}$/u.test(productionClosure.importClosureRootHash ?? ""),
  "R6 production transitive closure is invalid");
  requireCondition(canonicalJsonV5R3(productionClosure.paths)
    === canonicalJsonV5R3(productionSourceManifest.map(({ path: sourcePath }) => sourcePath)),
  "R6 production manifest is not the complete transitive import closure");
  requireCondition(canonicalJsonV5R3(PRODUCTION_ENTRYPOINTS_V5_R6)
    === canonicalJsonV5R3([...PRODUCTION_ENTRYPOINTS_V5_R6].sort(compare))
    && PRODUCTION_ENTRYPOINTS_V5_R6.every((entrypoint) => productionClosure.paths.includes(entrypoint)),
  "R6 registered production entrypoints are absent from the closure");
  requireCondition(canonicalJsonV5R3(TEST_PATHS_V5_R6)
    === canonicalJsonV5R3(testSourceManifest.map(({ path: sourcePath }) => sourcePath)),
  "R6 test manifest differs from the exact registered test surface");
  const closureKernels = computeClosureKernelsV5R6(productionSourceManifest);
  requireCondition(Object.values(closureKernels).every((value) => /^[0-9a-f]{64}$/u.test(value ?? "")),
    "R6 closure-kernel component source is missing");
  const coreGuardHash = componentHash(productionSourceManifest, [
    `${ROOT}activation-guard-v5-r6.mjs`,
    `${ROOT}guarded-provider-attempt-v5-r6.mjs`,
    `${ROOT}provider-request-v5-r6.mjs`,
  ]);
  const frozen = Object.fromEntries([
    "designRegistrationHash", "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash",
    "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash", "privacyScreenHash",
    "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash", "rightsPolicyHash",
    "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash", "thresholdsDecisionAndPowerHash",
    "decisionCeiling", "providerContractErratumHash",
  ].map((field) => [field, V5_R5_REGISTRATION[field]]));
  const registration = sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerSupersedingRegistrationV2",
    runnerVersion: "V5-R6",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt,
    supersedesRunnerRegistrationHash: V5_R5_REGISTRATION_HASH,
    supersededRunnerRegistrationCommit: V5_R5_REGISTRATION_COMMIT,
    supersededRunnerSourceCommit: V5_R5_SOURCE_COMMIT,
    discrepancyReviewHash: V5_R5_A11_REVIEW_HASH,
    discrepancyReviewCommit: V5_R5_A11_REVIEW_COMMIT,
    integratedDiscrepancyReviewCommit: V5_R5_A11_REVIEW_INTEGRATION_COMMIT,
    previousReceiptHash: V5_R5_A11_REVIEW_HASH,
    ownerRunnerImplementationAuthorizationTextHash:
      V5_R6_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
    ...frozen,
    runnerSourceCommit,
    productionEntryPoints: [...PRODUCTION_ENTRYPOINTS_V5_R6],
    productionSourceManifest,
    productionSourceRootHash: sourceManifestRootV5R6(productionSourceManifest),
    productionImportEdgeCount: productionClosure.importEdgeCount,
    importClosureRootHash: productionClosure.importClosureRootHash,
    testSourceManifest,
    testSourceRootHash: sourceManifestRootV5R6(testSourceManifest),
    supersededProductionSourceRootHash: V5_R5_REGISTRATION.productionSourceRootHash,
    supersededTestSourceRootHash: V5_R5_REGISTRATION.testSourceRootHash,
    sourceClosureMode: "FULL_TRANSITIVE_RUNTIME_CLOSURE_CURRENT_BYTES_VERIFIED",
    registrationPathPolicy: "IMMUTABLE_SINGLE_ADD_COMMIT_NO_LATER_TOUCH",
    closureKernels,
    providerEntrypoints: {
      openAI: {
        provider: "OPENAI_DIRECT",
        model: "gpt-5.6-luna",
        endpoint: "https://us.api.openai.com/v1/responses",
        projectResidency: "US_STORAGE_PROCESSING",
        registeredCli: "runner-v5-r6-cli.mjs",
        coreGuardHash,
        providerCallsMade: 0,
      },
      deepSeek: {
        provider: "DEEPSEEK_DIRECT",
        model: "deepseek-v4-pro",
        endpoint: "https://api.deepseek.com/chat/completions",
        projectResidency: "UNRESOLVED",
        registeredCli: "runner-v5-r6-cli.mjs",
        coreGuardHash,
        providerCallsMade: 0,
      },
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
    status: "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R6_REVIEW_PROVIDER_EXECUTION_BLOCKED",
    claimCeiling: "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
  });
  assertClosedSelfHashedArtifactV5R6(registration,
    "NaturalCaExecutionRunnerSupersedingRegistrationV2");
  const errors = validateActiveRunnerRegistrationV5R6(registration);
  requireCondition(errors.length === 0, errors.join("; "));
  return registration;
}

export async function buildRunnerSupersedingRegistrationFromGitV5R6({
  repoRoot,
  runnerSourceCommit,
  registeredAt,
}) {
  const productionClosure = await collectGitSourceClosureV5R6({
    repoRoot,
    commit: runnerSourceCommit,
    entryPoints: PRODUCTION_ENTRYPOINTS_V5_R6,
  });
  const productionSourceManifest = await sourceManifestFromGitV5R6({
    repoRoot,
    commit: runnerSourceCommit,
    paths: productionClosure.paths,
  });
  const testSourceManifest = await sourceManifestFromGitV5R6({
    repoRoot,
    commit: runnerSourceCommit,
    paths: TEST_PATHS_V5_R6,
  });
  return buildRunnerSupersedingRegistrationV5R6({
    runnerSourceCommit,
    productionClosure,
    productionSourceManifest,
    testSourceManifest,
    registeredAt,
  });
}
