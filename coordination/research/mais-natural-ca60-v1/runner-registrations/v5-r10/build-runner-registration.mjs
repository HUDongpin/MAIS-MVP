import path from "node:path";

import REVIEWER_IDENTITY_ANCHOR from "../../../../reports/mais-natural-ca60-v5-r10-review-identity-a11/public-review-identity-anchor.json" with { type: "json" };
import R9_PRE_EXECUTION_FAILURE from "../../../../reports/mais-natural-ca60-v5-r9-pre-execution-failure-a07/r9-pre-execution-failure-receipt.json" with { type: "json" };
import V5_R9_REGISTRATION from "../v5-r9/runner-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  computeClosureKernelsV5R10,
  PRODUCTION_ENTRYPOINTS_V5_R10,
  REMEDIATED_FINDING_IDS_V5_R10,
  runtimeSourceEnumerationRootV5R10,
  V5_R9_PRE_EXECUTION_FAILURE_HASH,
  V5_R9_REGISTRATION_COMMIT,
  V5_R9_REGISTRATION_HASH,
  V5_R9_SOURCE_COMMIT,
  V5_R10_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
  V5_R10_REVIEWER_IDENTITY_ANCHOR_COMMIT,
  V5_R10_REVIEWER_IDENTITY_ANCHOR_HASH,
  V5_R10_REVIEWER_IDENTITY_ANCHOR_ORIGIN_COMMIT,
  validateActiveRunnerRegistrationV5R10,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r10.mjs";
import {
  validatePublicReviewIdentityAnchorV5R10,
} from "../../../../content-qa/mais-natural-ca60-v1/review-evidence-v5-r10.mjs";
import {
  collectGitSourceClosureV5R6,
  sourceManifestFromGitV5R6,
  sourceManifestRootV5R6,
} from "../../../../content-qa/mais-natural-ca60-v1/source-closure-v5-r6.mjs";
import {
  assertClosedSelfHashedArtifactV5R10,
} from "../../../../content-qa/mais-natural-ca60-v1/schema-contract-v5-r10.mjs";

const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const R9_FAILURE_OBSERVED_AT = "2026-08-26T17:18:05.000Z";
const R9_PRE_EXECUTION_FAILURE_PATH =
  "coordination/reports/mais-natural-ca60-v5-r9-pre-execution-failure-a07/r9-pre-execution-failure-receipt.json";
const REVIEWER_IDENTITY_ANCHOR_PATH =
  "coordination/reports/mais-natural-ca60-v5-r10-review-identity-a11/public-review-identity-anchor.json";
const A07_CLOSEOUT_RECEIPT_PATH =
  "coordination/reports/mais-natural-ca60-v5-r10-runner-closeout-a07/a07-runner-closeout-receipt.json";
const A07_SESSION_LOG_PATH =
  "coordination/session-logs/2026-08-27-A07-mais-natural-ca60-v5-r10.md";

export const TEST_ENTRYPOINTS_V5_R10 = Object.freeze([
  `${ROOT}runner-v5-r7-attempt-transaction.test.mjs`,
  `${ROOT}runner-v5-r7-c0-state.test.mjs`,
  `${ROOT}runner-v5-r7-canary-integration.test.mjs`,
  `${ROOT}runner-v5-r7-guarded-attempt.test.mjs`,
  `${ROOT}runner-v5-r7-journal.test.mjs`,
  `${ROOT}runner-v5-r7-native-provider.test.mjs`,
  `${ROOT}runner-v5-r7-raw-reference.test.mjs`,
  `${ROOT}runner-v5-r7-scorer-verifier.test.mjs`,
  `${ROOT}runner-v5-r7-semantic-dispatch.test.mjs`,
  `${ROOT}runner-v5-r10-cli.test.mjs`,
  `${ROOT}runner-v5-r10-public-cli-workflow.test.mjs`,
  `${ROOT}runner-v5-r10-recovery.test.mjs`,
  `${ROOT}runner-v5-r10-remediation.test.mjs`,
  "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r10/runner-registration-artifact.test.mjs",
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
    `R10 core-guard source is absent: ${expected.filter((sourcePath) =>
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
  `R10 ${label} source manifest is unsafe, unordered, duplicated, or incomplete`);
}

export function registeredTestPathsV5R10(testClosure) {
  requireCondition(Array.isArray(testClosure?.paths) && Array.isArray(testClosure?.edges)
    && Number.isSafeInteger(testClosure.importEdgeCount) && testClosure.importEdgeCount > 0,
  "R10 test transitive closure is invalid");
  return Object.freeze([...new Set(testClosure.paths)].sort(compare));
}

export function buildRunnerSupersedingRegistrationV5R10({
  runnerSourceCommit,
  productionClosure,
  testClosure,
  productionSourceManifest,
  testSourceManifest,
  registeredAt,
}) {
  requireCondition(/^[0-9a-f]{40}$/u.test(runnerSourceCommit),
    "R10 runner source commit is invalid");
  requireCondition(new Date(registeredAt).toISOString() === registeredAt
    && Date.parse(registeredAt) > Date.parse(R9_FAILURE_OBSERVED_AT),
  "R10 runner registration must strictly postdate the bound V5-R9 pre-execution failure");
  requireCondition(validatePublicReviewIdentityAnchorV5R10(REVIEWER_IDENTITY_ANCHOR).length === 0
    && REVIEWER_IDENTITY_ANCHOR.selfHash === V5_R10_REVIEWER_IDENTITY_ANCHOR_HASH,
  "R10 public A11 reviewer identity anchor is invalid or differs from its frozen hash");
  requireCondition(R9_PRE_EXECUTION_FAILURE.selfHash === V5_R9_PRE_EXECUTION_FAILURE_HASH
    && R9_PRE_EXECUTION_FAILURE.disposition === "SUPERSEDED_NOT_EXECUTED",
  "R10 predecessor failure receipt is absent, changed, or not superseded-not-executed");
  validateManifest(productionSourceManifest, "production");
  validateManifest(testSourceManifest, "test");
  requireCondition(Array.isArray(productionClosure?.paths) && Array.isArray(productionClosure?.edges)
    && Number.isSafeInteger(productionClosure.importEdgeCount) && productionClosure.importEdgeCount > 0
    && /^[0-9a-f]{64}$/u.test(productionClosure.importClosureRootHash ?? ""),
  "R10 production transitive closure is invalid");
  requireCondition(canonicalJsonV5R3(productionClosure.paths)
    === canonicalJsonV5R3(productionSourceManifest.map(({ path: sourcePath }) => sourcePath)),
  "R10 production manifest is not the complete transitive import closure");
  requireCondition(PRODUCTION_ENTRYPOINTS_V5_R10.every((entrypoint) =>
    productionClosure.paths.includes(entrypoint)),
  "R10 production entrypoints are absent from the closure");
  requireCondition(TEST_ENTRYPOINTS_V5_R10.every((entrypoint) => testClosure.paths.includes(entrypoint))
    && canonicalJsonV5R3(registeredTestPathsV5R10(testClosure))
      === canonicalJsonV5R3(testSourceManifest.map(({ path: sourcePath }) => sourcePath)),
  "R10 test manifest differs from the complete registered test closure");
  const closureKernels = computeClosureKernelsV5R10(productionSourceManifest);
  requireCondition(Object.values(closureKernels)
    .every((value) => /^[0-9a-f]{64}$/u.test(value ?? "")),
  "R10 closure-kernel component source is missing");
  const coreGuardHash = componentHash(productionSourceManifest, [
    `${ROOT}activation-guard-v5-r10.mjs`,
    `${ROOT}trusted-provider-evidence-v5-r10.mjs`,
    `${ROOT}attempt-recovery-v5-r10.mjs`,
    `${ROOT}native-provider-adapter-v5-r10.mjs`,
  ]);
  const frozen = Object.fromEntries([
    "designRegistrationHash", "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash",
    "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash",
    "privacyScreenHash", "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash",
    "rightsPolicyHash", "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash",
    "thresholdsDecisionAndPowerHash", "decisionCeiling", "providerContractErratumHash",
  ].map((field) => [field, V5_R9_REGISTRATION[field]]));
  const registration = sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerSupersedingRegistrationV6",
    runnerVersion: "V5-R10",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt,
    supersedesRunnerRegistrationHash: V5_R9_REGISTRATION_HASH,
    supersededRunnerRegistrationCommit: V5_R9_REGISTRATION_COMMIT,
    supersededRunnerSourceCommit: V5_R9_SOURCE_COMMIT,
    discrepancyReviewHash: V5_R9_REGISTRATION.discrepancyReviewHash,
    discrepancyReviewCommit: V5_R9_REGISTRATION.discrepancyReviewCommit,
    preExecutionFailureReceiptPath: R9_PRE_EXECUTION_FAILURE_PATH,
    preExecutionFailureReceiptHash: V5_R9_PRE_EXECUTION_FAILURE_HASH,
    preExecutionFailureCommit: runnerSourceCommit,
    preExecutionFailureDisposition: "SUPERSEDED_NOT_EXECUTED",
    previousReceiptHash: V5_R9_PRE_EXECUTION_FAILURE_HASH,
    ownerRunnerImplementationAuthorizationTextHash:
      V5_R10_OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH,
    reviewerIdentityAnchorPath: REVIEWER_IDENTITY_ANCHOR_PATH,
    reviewerIdentityAnchorCommit: V5_R10_REVIEWER_IDENTITY_ANCHOR_COMMIT,
    reviewerIdentityAnchorOriginCommit: V5_R10_REVIEWER_IDENTITY_ANCHOR_ORIGIN_COMMIT,
    reviewerIdentityAnchorHash: REVIEWER_IDENTITY_ANCHOR.selfHash,
    reviewerKeyId: REVIEWER_IDENTITY_ANCHOR.keyId,
    reviewerPublicKeyFingerprintSha256: REVIEWER_IDENTITY_ANCHOR.publicKeyFingerprintSha256,
    ...frozen,
    runnerSourceCommit,
    productionEntryPoints: [...PRODUCTION_ENTRYPOINTS_V5_R10],
    productionSourceManifest,
    productionSourceRootHash: sourceManifestRootV5R6(productionSourceManifest),
    productionImportEdgeCount: productionClosure.importEdgeCount,
    importClosureRootHash: productionClosure.importClosureRootHash,
    testSourceManifest,
    testSourceRootHash: sourceManifestRootV5R6(testSourceManifest),
    supersededProductionSourceRootHash: V5_R9_REGISTRATION.productionSourceRootHash,
    supersededTestSourceRootHash: V5_R9_REGISTRATION.testSourceRootHash,
    supersededImportClosureRootHash: V5_R9_REGISTRATION.importClosureRootHash,
    sourceClosureMode: "FULL_TRANSITIVE_RUNTIME_CLOSURE_GIT_OBJECT_BYTES_VERIFIED",
    registrationPathPolicy:
      "IMMUTABLE_SINGLE_ADD_THEN_EXACT_A07_CLOSEOUT_THEN_SIGNED_A11_REVIEW_CHAIN",
    a07CloseoutPolicy: {
      receiptPath: A07_CLOSEOUT_RECEIPT_PATH,
      sessionLogPath: A07_SESSION_LOG_PATH,
      closeoutCommitMustDirectlyParentRegistration: true,
      freshReviewCommitMustDirectlyParentCloseout: true,
      exactSingleAddPaths: true,
    },
    remediatedFindingIds: [...REMEDIATED_FINDING_IDS_V5_R10],
    closureKernels,
    runtimeSourceEnumerationRootHash: runtimeSourceEnumerationRootV5R10(productionSourceManifest),
    trustedProviderEvidenceAnchors: [],
    routeAuthenticityState: "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR",
    providerEntrypoints: {
      openAI: {
        provider: "OPENAI_DIRECT",
        model: "gpt-5.6-luna",
        endpoint: "https://us.api.openai.com/v1/responses",
        projectResidency: "US_STORAGE_PROCESSING",
        registeredCli: "runner-v5-r10-cli.mjs",
        coreGuardHash,
        providerCallsMade: 0,
      },
      deepSeek: {
        provider: "DEEPSEEK_DIRECT",
        model: "deepseek-v4-pro",
        endpoint: "https://api.deepseek.com/chat/completions",
        projectResidency: "UNRESOLVED",
        registeredCli: "runner-v5-r10-cli.mjs",
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
    status: "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R10_REVIEW_PROVIDER_EXECUTION_BLOCKED",
    claimCeiling: "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
  });
  assertClosedSelfHashedArtifactV5R10(registration,
    "NaturalCaExecutionRunnerSupersedingRegistrationV6");
  const errors = validateActiveRunnerRegistrationV5R10(registration);
  requireCondition(errors.length === 0, errors.join("; "));
  return registration;
}

export async function buildRunnerSupersedingRegistrationFromGitV5R10({
  repoRoot,
  runnerSourceCommit,
  registeredAt,
}) {
  const productionClosure = await collectGitSourceClosureV5R6({
    repoRoot,
    commit: runnerSourceCommit,
    entryPoints: PRODUCTION_ENTRYPOINTS_V5_R10,
  });
  const testClosure = await collectGitSourceClosureV5R6({
    repoRoot,
    commit: runnerSourceCommit,
    entryPoints: TEST_ENTRYPOINTS_V5_R10,
  });
  const productionSourceManifest = await sourceManifestFromGitV5R6({
    repoRoot,
    commit: runnerSourceCommit,
    paths: productionClosure.paths,
  });
  const testSourceManifest = await sourceManifestFromGitV5R6({
    repoRoot,
    commit: runnerSourceCommit,
    paths: registeredTestPathsV5R10(testClosure),
  });
  return buildRunnerSupersedingRegistrationV5R10({
    runnerSourceCommit,
    productionClosure,
    testClosure,
    productionSourceManifest,
    testSourceManifest,
    registeredAt,
  });
}
