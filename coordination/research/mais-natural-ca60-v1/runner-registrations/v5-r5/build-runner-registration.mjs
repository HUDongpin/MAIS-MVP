import { execFile as nodeExecFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import V5_R4_REGISTRATION from "../v5-r4/runner-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
} from "../../../../content-qa/mais-natural-ca60-v1/schema-contract-v5-r5.mjs";
import {
  V5_R4_A11_REVIEW_COMMIT,
  V5_R4_A11_REVIEW_HASH,
  V5_R4_REGISTRATION_COMMIT,
  V5_R4_REGISTRATION_HASH,
  V5_R4_SOURCE_COMMIT,
  validateActiveRunnerRegistrationV5R5,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r5.mjs";

const execFileAsync = promisify(nodeExecFile);
const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const REVIEWED_AT = "2026-08-26T05:38:06.000Z";
export const OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH_V5_R5 = "8f9767f1bb087656d57ab7885f621ef449eff61ea89aaead8bd34bf27f30f74f";

const MODULES = Object.freeze([
  "activation-guard-v5-r5.mjs",
  "atomic-execution-ledger-v5-r5.mjs",
  "c0-trigger-v5-r5.mjs",
  "deepseek-execution-registration-v5-r5.mjs",
  "execution-evidence-v5-r5.mjs",
  "guarded-provider-attempt-v5-r5.mjs",
  "recovery-v5-r5.mjs",
  "reference-agreement-v5-r5.mjs",
  "reference-label-seal-v5-r5.mjs",
  "route-authorization-v5-r5.mjs",
  "runner-v5-r5-cli.mjs",
  "runner-v5-r5-runtime.mjs",
  "schema-contract-v5-r5.mjs",
  "scorer-v5-r5.mjs",
  "state-bound-dispatch-v5-r5.mjs",
  "verification-publication-v5-r5.mjs",
  "workflow-index-v5-r5.mjs",
]);

const SCHEMAS = Object.freeze([
  "AuthenticatedRouteEvidenceReceiptV1.schema.json",
  "AuthenticatedRouteEvidenceSourceV1.schema.json",
  "CanaryGateReceiptV2.schema.json",
  "DeepSeekC0ExecutionSetV3.schema.json",
  "DeepSeekC0PredicateReceiptV1.schema.json",
  "DeepSeekExecutionRegistrationV3.schema.json",
  "ExactRunnerSupersedingRegistrationEvidenceV1.schema.json",
  "ExecutionIntegrityEvidenceV1.schema.json",
  "ExecutionLedgerLockV1.schema.json",
  "FinalExecutionVerificationReceiptV2.schema.json",
  "IndependentExecutionRunnerReviewReceiptV3.schema.json",
  "InterruptedAttemptRecoveryReceiptV1.schema.json",
  "LedgerRecoveryAuthorizationV1.schema.json",
  "MachineReferenceSealV4.schema.json",
  "NaturalCaAggregateScoreReceiptV3.schema.json",
  "NaturalCaExecutionRunnerSupersedingRegistrationV1.schema.json",
  "NaturalCaRunnerCommandReceiptV4.schema.json",
  "OwnerRunnerActivationGrantV1.schema.json",
  "ProtectedWorkflowIndexV2.schema.json",
  "ProviderCostPreviewReceiptV1.schema.json",
  "ReferenceSealValidationReceiptV2.schema.json",
  "StaleLedgerLockRecoveryReceiptV1.schema.json",
  "StateBoundDispatchAuditReceiptV1.schema.json",
  "WorkflowCommandTransitionReceiptV1.schema.json",
]);

export const PRODUCTION_PATHS_V5_R5 = Object.freeze([
  ...MODULES.map((name) => `${ROOT}${name}`),
  ...SCHEMAS.map((name) => `${ROOT}schemas/${name}`),
].sort());

export const TEST_PATHS_V5_R5 = Object.freeze([
  `${ROOT}runner-v5-r5-closure.test.mjs`,
  `${ROOT}runner-v5-r5-offline.test.mjs`,
  `${ROOT}runner-v5-r5-schemas.test.mjs`,
  `${ROOT}runner-v5-r5-test-fixtures.mjs`,
  "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r5/build-runner-registration.mjs",
  "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r5/runner-registration-artifact.test.mjs",
].sort());

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function compare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function sourceRoot(manifest) { return sha256V5R3(canonicalJsonV5R3(manifest)); }
function componentHash(manifest, paths) {
  const expected = [...new Set(paths)].sort(compare);
  const selected = manifest.filter(({ path: sourcePath }) => expected.includes(sourcePath));
  requireCondition(selected.length === expected.length, `component manifest is missing: ${expected.filter((sourcePath) => !selected.some(({ path: present }) => present === sourcePath)).join(", ")}`);
  return sha256V5R3(canonicalJsonV5R3(selected));
}

export function computeRegisteredClosureKernelsV5R5(productionSourceManifest) {
  const schemas = productionSourceManifest.map(({ path: sourcePath }) => sourcePath)
    .filter((sourcePath) => sourcePath.startsWith(`${ROOT}schemas/`) && /V\d+\.schema\.json$/u.test(sourcePath));
  return Object.freeze({
    stateBoundDispatchHash: componentHash(productionSourceManifest, [`${ROOT}state-bound-dispatch-v5-r5.mjs`, `${ROOT}activation-guard-v5-r5.mjs`]),
    authenticatedRouteEvidenceHash: componentHash(productionSourceManifest, [`${ROOT}route-authorization-v5-r5.mjs`]),
    inventoryReconstructionHash: componentHash(productionSourceManifest, [`${ROOT}execution-evidence-v5-r5.mjs`]),
    costPreviewHash: componentHash(productionSourceManifest, [`${ROOT}route-authorization-v5-r5.mjs`]),
    executionIntegrityHash: componentHash(productionSourceManifest, [`${ROOT}scorer-v5-r5.mjs`]),
    recoveryHash: componentHash(productionSourceManifest, [`${ROOT}recovery-v5-r5.mjs`]),
    workflowIndexHash: componentHash(productionSourceManifest, [`${ROOT}workflow-index-v5-r5.mjs`]),
    schemaValidatorHash: componentHash(productionSourceManifest, [`${ROOT}schema-contract-v5-r5.mjs`, ...schemas]),
    referenceAgreementHash: componentHash(productionSourceManifest, [`${ROOT}reference-agreement-v5-r5.mjs`, `${ROOT}reference-label-seal-v5-r5.mjs`]),
    c0TriggerHash: componentHash(productionSourceManifest, [`${ROOT}c0-trigger-v5-r5.mjs`]),
    guardedTransportHash: componentHash(productionSourceManifest, [`${ROOT}guarded-provider-attempt-v5-r5.mjs`]),
    atomicLedgerHash: componentHash(productionSourceManifest, [`${ROOT}atomic-execution-ledger-v5-r5.mjs`, `${ROOT}recovery-v5-r5.mjs`]),
    nativeScoringAndVerificationHash: componentHash(productionSourceManifest, [`${ROOT}scorer-v5-r5.mjs`, `${ROOT}verification-publication-v5-r5.mjs`]),
    runtimeCliHash: componentHash(productionSourceManifest, [`${ROOT}runner-v5-r5-runtime.mjs`, `${ROOT}runner-v5-r5-cli.mjs`]),
  });
}

export function buildRunnerSupersedingRegistrationV5R5({ runnerSourceCommit, productionSourceManifest,
  testSourceManifest, registeredAt }) {
  requireCondition(/^[0-9a-f]{40}$/u.test(runnerSourceCommit), "runner source commit is invalid");
  requireCondition(new Date(registeredAt).toISOString() === registeredAt && Date.parse(registeredAt) > Date.parse(REVIEWED_AT),
    "runner registration must strictly postdate the bound V5-R4 A11 discrepancy review");
  for (const [label, manifest] of [["production", productionSourceManifest], ["test", testSourceManifest]]) {
    requireCondition(Array.isArray(manifest) && manifest.length > 0
      && canonicalJsonV5R3(manifest.map(({ path: sourcePath }) => sourcePath)) === canonicalJsonV5R3(manifest.map(({ path: sourcePath }) => sourcePath).sort(compare))
      && new Set(manifest.map(({ path: sourcePath }) => sourcePath)).size === manifest.length
      && manifest.every((row) => typeof row.path === "string" && !path.isAbsolute(row.path)
        && !path.normalize(row.path).split(path.sep).includes("..") && Number.isSafeInteger(row.byteLength)
        && row.byteLength > 0 && /^[0-9a-f]{64}$/u.test(row.sha256)), `${label} source manifest is unsafe, unordered, or incomplete`);
  }
  requireCondition(canonicalJsonV5R3(productionSourceManifest.map(({ path: sourcePath }) => sourcePath))
    === canonicalJsonV5R3(PRODUCTION_PATHS_V5_R5), "production source manifest pathset differs from the registered R5 runtime surface");
  requireCondition(canonicalJsonV5R3(testSourceManifest.map(({ path: sourcePath }) => sourcePath))
    === canonicalJsonV5R3(TEST_PATHS_V5_R5), "test source manifest pathset differs from the registered R5 test surface");
  const closureKernels = computeRegisteredClosureKernelsV5R5(productionSourceManifest);
  const coreGuardHash = componentHash(productionSourceManifest, [
    `${ROOT}activation-guard-v5-r5.mjs`, `${ROOT}state-bound-dispatch-v5-r5.mjs`, `${ROOT}guarded-provider-attempt-v5-r5.mjs`,
  ]);
  const frozen = Object.fromEntries(["designRegistrationHash", "frameRegistrationHash", "samplingFrameHash",
    "sampleManifestHash", "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash",
    "privacyScreenHash", "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash", "rightsPolicyHash",
    "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash", "thresholdsDecisionAndPowerHash", "decisionCeiling",
    "providerContractErratumHash"].map((field) => [field, V5_R4_REGISTRATION[field]]));
  const registration = sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerSupersedingRegistrationV1",
    runnerVersion: "V5-R5",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt,
    supersedesRunnerRegistrationHash: V5_R4_REGISTRATION_HASH,
    supersededRunnerRegistrationCommit: V5_R4_REGISTRATION_COMMIT,
    compatibilityBaseSourceCommit: V5_R4_SOURCE_COMMIT,
    discrepancyReviewHash: V5_R4_A11_REVIEW_HASH,
    discrepancyReviewCommit: V5_R4_A11_REVIEW_COMMIT,
    previousReceiptHash: V5_R4_A11_REVIEW_HASH,
    ownerRunnerImplementationAuthorizationTextHash: OWNER_RUNNER_IMPLEMENTATION_AUTHORIZATION_TEXT_HASH_V5_R5,
    ...frozen,
    runnerSourceCommit,
    productionSourceManifest,
    productionSourceRootHash: sourceRoot(productionSourceManifest),
    testSourceManifest,
    testSourceRootHash: sourceRoot(testSourceManifest),
    compatibilityBaseProductionSourceRootHash: V5_R4_REGISTRATION.productionSourceRootHash,
    compatibilityBaseTestSourceRootHash: V5_R4_REGISTRATION.testSourceRootHash,
    closureKernels,
    providerEntrypoints: {
      openAI: { provider: "OPENAI_DIRECT", model: "gpt-5.6-luna", endpoint: "https://us.api.openai.com/v1/responses",
        projectResidency: "US_STORAGE_PROCESSING",
        registeredCli: "runner-v5-r5-cli.mjs", coreGuardHash, providerCallsMade: 0 },
      deepSeek: { provider: "DEEPSEEK_DIRECT", model: "deepseek-v4-pro", endpoint: "https://api.deepseek.com/chat/completions",
        projectResidency: "UNRESOLVED",
        registeredCli: "runner-v5-r5-cli.mjs", coreGuardHash, providerCallsMade: 0 },
    },
    authorizationState: { credentialReadAuthorized: false, providerExecutionAuthorized: false,
      naturalQuestionEgressAuthorized: false, tokenAuthorizationCreated: false, attemptAuthorizationCreated: false,
      usdAuthorizationCreated: false, credentialReadCount: 0, providerEventCount: 0, naturalQuestionEgressCount: 0,
      tokenCount: 0, attemptCount: 0, usdSpent: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0 },
    status: "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R5_REVIEW_PROVIDER_EXECUTION_BLOCKED",
    claimCeiling: "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
  });
  assertClosedSelfHashedArtifactV5R5(registration, "NaturalCaExecutionRunnerSupersedingRegistrationV1");
  const errors = validateActiveRunnerRegistrationV5R5({ activeRegistration: registration,
    baseRegistration: V5_R4_REGISTRATION });
  requireCondition(errors.length === 0, errors.join("; "));
  return registration;
}

export async function sourceManifestFromGitV5R5({ repoRoot, commit, paths,
  gitReader = async (root, revision, sourcePath) => (await execFileAsync("git", ["show", `${revision}:${sourcePath}`],
    { cwd: root, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 })).stdout }) {
  requireCondition(path.isAbsolute(repoRoot) && /^[0-9a-f]{40}$/u.test(commit), "exact Git source manifest inputs are invalid");
  const rows = [];
  for (const sourcePath of [...paths].sort(compare)) {
    const bytes = Buffer.from(await gitReader(repoRoot, commit, sourcePath));
    rows.push({ path: sourcePath, byteLength: bytes.byteLength, sha256: sha256V5R3(bytes) });
  }
  return Object.freeze(rows);
}
