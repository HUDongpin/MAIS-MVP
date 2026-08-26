#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import DESIGN from "../../versions/design-v5/design-registration.json" with { type: "json" };
import SEQUENCING from "../../authorization-requests/2026-08-26-provider-authorization-sequencing.json" with { type: "json" };
import OWNER_DECISION from "../../owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json" with { type: "json" };
import V5_R3_REGISTRATION from "../v5-r3/runner-registration.json" with { type: "json" };
import PROVIDER_ERRATUM from "../v5-r3/provider-contract-erratum.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  V5_R3_A11_REVIEW_COMMIT,
  V5_R3_A11_REVIEW_HASH,
  validateProductionRunnerRegistrationV5R4,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-evidence-v5-r4.mjs";
import { SCORER_METHOD_KERNEL_V5_R4 } from "../../../../content-qa/mais-natural-ca60-v1/method-kernel-v5-r4.mjs";
import { assertClosedSelfHashedArtifactV5R4 } from "../../../../content-qa/mais-natural-ca60-v1/schema-contract-v5-r4.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(HERE, "../../../../..");
const execFileAsync = promisify(execFile);
const COMMIT = /^[0-9a-f]{40}$/u;

const CORE = "coordination/content-qa/mais-natural-ca60-v1/";
const RESEARCH = "coordination/research/mais-natural-ca60-v1/";
const DESIGN_V2 = `${RESEARCH}versions/design-v2/`;
const DESIGN_V4 = `${RESEARCH}versions/design-v4/`;
const DESIGN_V5 = `${RESEARCH}versions/design-v5/`;

const R4_MODULES = Object.freeze([
  "atomic-execution-ledger-v5-r4.mjs",
  "deepseek-execution-control-v5-r4.mjs",
  "execution-evidence-v5-r4.mjs",
  "execution-state-v5-r4.mjs",
  "guarded-provider-attempt-v5-r4.mjs",
  "method-kernel-v5-r4.mjs",
  "protected-storage-v5-r4.mjs",
  "provider-request-v5-r4.mjs",
  "reference-label-seal-v5-r4.mjs",
  "route-authorization-v5-r4.mjs",
  "runner-v5-r4-cli.mjs",
  "runner-v5-r4-runtime.mjs",
  "schema-contract-v5-r4.mjs",
  "scorer-v5-r4.mjs",
  "verification-publication-v5-r4.mjs",
]);

const R4_SCHEMA_NAMES = Object.freeze([
  "AggregatePublicationAuthorizationV1",
  "CanaryGateReceiptV1",
  "ClaimBoundaryReviewReceiptV2",
  "CompletedItemCommitMarkerV2",
  "CredentialReadinessReceiptV2",
  "DeepSeekC0ExecutionSetV2",
  "DeepSeekExecutionRegistrationV2",
  "ExecutionPlanReceiptV1",
  "FinalExecutionVerificationReceiptV1",
  "IndependentExecutionResultReviewReceiptV1",
  "IndependentExecutionRunnerReviewReceiptV2",
  "ItemEvaluationResultV2",
  "MachineReferenceLabelV1",
  "MachineReferenceSealV3",
  "NaturalCaAggregateScoreReceiptV2",
  "NaturalCaExecutionRunnerRegistrationV3",
  "NaturalCaRunnerCommandReceiptV3",
  "OpenAIAdjudicationTriggerReceiptV1",
  "OwnerProviderGrantV2",
  "ProtectedWorkflowIndexV1",
  "ProviderAuthorizationV4",
  "ProviderDispatchCompletionV2",
  "ProviderDispatchPermitV3",
  "ProviderDispatchReservationV2",
  "ProviderEventReceiptV4",
  "ProviderPriceSnapshotV2",
  "ProviderRequestArtifactV4",
  "ProviderRoleOutputV1",
  "ProviderRouteEvidenceLeafV1",
  "ProviderRouteProbeAttemptReceiptV1",
  "PublicAggregateReportV1",
  "RawMachineReferenceLabelV1",
  "ReferenceSealValidationReceiptV1",
  "RouteEvidenceBundleV1",
  "RouteProbeAuthorizationV1",
  "SampleExecutionInventoryV2",
]);

export const PRODUCTION_SOURCE_PATHS_V5_R4 = Object.freeze([
  ...R4_MODULES.map((name) => `${CORE}${name}`),
  `${CORE}deepseek-evaluation-adapter-v5-r2.mjs`,
  `${CORE}execution-integrity-v5-r3.mjs`,
  `${CORE}openai-reference-adapter-v5.mjs`,
  `${CORE}sample-contract-v5.mjs`,
  ...R4_SCHEMA_NAMES.map((name) => `${CORE}schemas/${name}.schema.json`),
  `${DESIGN_V2}design-contract.mjs`,
  `${DESIGN_V4}design-contract.mjs`,
  `${DESIGN_V4}design-registration.json`,
  `${DESIGN_V4}sample-contract.mjs`,
  `${DESIGN_V4}schemas/ProviderAttemptReceiptV1.schema.json`,
  `${DESIGN_V4}schemas/ProviderAuthorizationV1.schema.json`,
  `${DESIGN_V5}design-contract.mjs`,
  `${DESIGN_V5}design-registration.json`,
  `${DESIGN_V5}schemas/OpenAIReferenceRoleOutputV1.schema.json`,
  `${DESIGN_V5}schemas/ProviderAttemptReceiptV2.schema.json`,
  `${DESIGN_V5}schemas/ProviderLogicalRequestV2.schema.json`,
  `${DESIGN_V5}schemas/ProviderWireEvidenceV2.schema.json`,
  `${RESEARCH}authorization-requests/2026-08-26-provider-authorization-sequencing.json`,
  `${RESEARCH}owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json`,
  `${RESEARCH}runner-registrations/v5-r3/provider-contract-erratum.json`,
  `${RESEARCH}runner-registrations/v5-r3/runner-registration.json`,
  `${RESEARCH}runner-registrations/v5-r4/build-runner-registration.mjs`,
]);

export const TEST_SOURCE_PATHS_V5_R4 = Object.freeze([
  `${CORE}runner-v5-r4-contract.test.mjs`,
  `${CORE}runner-v5-r4-state-statistics.test.mjs`,
  `${CORE}runner-v5-r4-storage-ledger.test.mjs`,
  `${CORE}runner-v5-r4-test-fixtures.mjs`,
  `${RESEARCH}runner-registrations/v5-r4/runner-registration-builder.test.mjs`,
]);

async function gitObjectReader(repoRoot, commit, relativePath) {
  const { stdout } = await execFileAsync("git", ["show", `${commit}:${relativePath}`], {
    cwd: repoRoot,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  return Buffer.from(stdout);
}

async function sourceManifest({ repoRoot, commit, paths, readSource }) {
  const rows = [];
  for (const relativePath of [...paths].sort()) {
    const bytes = Buffer.from(await readSource(repoRoot, commit, relativePath));
    if (bytes.byteLength === 0) throw new TypeError(`${relativePath} is empty`);
    rows.push(Object.freeze({ path: relativePath, byteLength: bytes.byteLength, sha256: sha256V5R3(bytes) }));
  }
  if (new Set(rows.map(({ path: relativePath }) => relativePath)).size !== rows.length) throw new TypeError("registered source paths are not unique");
  return Object.freeze(rows);
}

function componentHash(manifest, paths) {
  const expected = [...new Set(paths)].sort();
  const selected = manifest.filter(({ path: sourcePath }) => expected.includes(sourcePath));
  if (selected.length !== expected.length) throw new TypeError(`component source is absent: ${expected.join(", ")}`);
  return sha256V5R3(canonicalJsonV5R3(selected));
}

export async function buildNaturalCaExecutionRunnerRegistrationV5R4({
  repoRoot = DEFAULT_REPO_ROOT,
  runnerCommit,
  registeredAt,
  readSource = gitObjectReader,
} = {}) {
  if (!COMMIT.test(runnerCommit ?? "")) throw new TypeError("runnerCommit must be an exact Git SHA-1 object ID");
  if (typeof registeredAt !== "string" || !Number.isFinite(Date.parse(registeredAt)) || new Date(registeredAt).toISOString() !== registeredAt) {
    throw new TypeError("registeredAt must be an explicit canonical ISO-8601 UTC timestamp");
  }
  if (!validateSelfHashV5R3(V5_R3_REGISTRATION) || !validateSelfHashV5R3(PROVIDER_ERRATUM)
    || PROVIDER_ERRATUM.selfHash !== V5_R3_REGISTRATION.providerContractErratumHash) {
    throw new TypeError("V5-R3 registration or provider contract erratum is invalid");
  }
  if (OWNER_DECISION.ownerDecisionRequestHash !== "2d0e8c24f270aa39292fea1ef8d1d11c4e9bd5d9ecd1bdf5a5bbf5119b964f78"
    || OWNER_DECISION.ownerDecisionReceiptHash !== "855af9696548359bc7364a987aa0dc3a3f9cd5883f87911edd8067bc78ac3ad0") {
    throw new TypeError("owner frame/rights/lineage decision is not the exact approved receipt");
  }
  const productionSourceManifest = await sourceManifest({ repoRoot, commit: runnerCommit, paths: PRODUCTION_SOURCE_PATHS_V5_R4, readSource });
  const testSourceManifest = await sourceManifest({ repoRoot, commit: runnerCommit, paths: TEST_SOURCE_PATHS_V5_R4, readSource });
  const frame = SEQUENCING.frameSampleEvidence;
  const component = (...relativePaths) => componentHash(productionSourceManifest, relativePaths);
  const requestConstructionHash = component(`${CORE}provider-request-v5-r4.mjs`);
  const authorizationGuardHash = component(`${CORE}route-authorization-v5-r4.mjs`, `${CORE}schema-contract-v5-r4.mjs`);
  const transportHash = component(`${CORE}guarded-provider-attempt-v5-r4.mjs`);
  const atomicLedgerHash = component(`${CORE}atomic-execution-ledger-v5-r4.mjs`, `${CORE}protected-storage-v5-r4.mjs`);
  const routeEvidenceValidatorHash = component(`${CORE}route-authorization-v5-r4.mjs`);
  const resumeAndCanaryHash = component(`${CORE}deepseek-execution-control-v5-r4.mjs`, `${CORE}execution-state-v5-r4.mjs`);
  const runnerHash = component(
    `${CORE}execution-evidence-v5-r4.mjs`,
    `${CORE}reference-label-seal-v5-r4.mjs`,
    `${CORE}runner-v5-r4-cli.mjs`,
    `${CORE}runner-v5-r4-runtime.mjs`,
    `${CORE}verification-publication-v5-r4.mjs`,
  );
  const scorerHash = component(`${CORE}scorer-v5-r4.mjs`);
  const registration = sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerRegistrationV3",
    runnerVersion: "V5-R4",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt,
    supersedesRunnerRegistrationHash: V5_R3_REGISTRATION.selfHash,
    discrepancyReviewHash: V5_R3_A11_REVIEW_HASH,
    discrepancyReviewCommit: V5_R3_A11_REVIEW_COMMIT,
    previousReceiptHash: V5_R3_A11_REVIEW_HASH,
    designRegistrationHash: DESIGN.registrationHash,
    frameRegistrationHash: frame.frameRegistrationHash,
    samplingFrameHash: frame.samplingFrameHash,
    sampleManifestHash: frame.sampleManifestHash,
    samplePayloadSetHash: frame.samplePayloadSetHash,
    sampleSelectionContentRootHash: frame.sampleSelectionContentRootHash,
    c0RandomAuditHash: frame.c0RandomAuditHash,
    privacyScreenHash: frame.selectedPrivacyScreenRootHash,
    rightsScreenHash: frame.selectedRightsScreenRootHash,
    ownerDecisionRequestHash: OWNER_DECISION.ownerDecisionRequestHash,
    ownerDecisionReceiptHash: OWNER_DECISION.ownerDecisionReceiptHash,
    rightsPolicyHash: OWNER_DECISION.rightsPolicyHash,
    lineageRuleHash: OWNER_DECISION.lineageRuleHash,
    taxonomyHash: DESIGN.frozenContractHashes.taxonomy,
    labelingAndAdjudicationHash: DESIGN.frozenContractHashes.labeling,
    thresholdsDecisionAndPowerHash: DESIGN.frozenContractHashes.analysis,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    providerContractErratumHash: PROVIDER_ERRATUM.selfHash,
    runnerSourceCommit: runnerCommit,
    productionSourceManifest,
    productionSourceRootHash: sha256V5R3(canonicalJsonV5R3(productionSourceManifest)),
    testSourceManifest,
    testSourceRootHash: sha256V5R3(canonicalJsonV5R3(testSourceManifest)),
    methodKernel: {
      inheritedStatisticalMethodHash: SCORER_METHOD_KERNEL_V5_R4.inheritedStatisticalMethodHash,
      bootstrapGoldenVectorHash: SCORER_METHOD_KERNEL_V5_R4.bootstrapGoldenVectorHash,
      missingDataMethodHash: SCORER_METHOD_KERNEL_V5_R4.missingDataMethodHash,
      c0TriggerEngineHash: SCORER_METHOD_KERNEL_V5_R4.c0TriggerEngineHash,
      providerRequestConstructionHash: requestConstructionHash,
      protectedStorageHash: component(`${CORE}protected-storage-v5-r4.mjs`),
    },
    providerImplementations: {
      openAI: {
        provider: "OPENAI_DIRECT",
        model: "gpt-5.6-luna",
        endpoint: "https://us.api.openai.com/v1/responses",
        projectResidency: "US_STORAGE_PROCESSING",
        adapterHash: component(`${CORE}openai-reference-adapter-v5.mjs`),
        requestConstructionHash,
        authorizationGuardHash,
        transportHash,
        atomicLedgerHash,
        routeEvidenceValidatorHash,
        resumeAndCanaryHash,
        runnerHash,
        scorerHash,
        providerCallsMade: 0,
      },
      deepSeek: {
        provider: "DEEPSEEK_DIRECT",
        model: "deepseek-v4-pro",
        endpoint: "https://api.deepseek.com/chat/completions",
        projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
        adapterHash: component(`${CORE}deepseek-evaluation-adapter-v5-r2.mjs`),
        requestConstructionHash,
        authorizationGuardHash,
        transportHash,
        atomicLedgerHash,
        routeEvidenceValidatorHash,
        resumeAndCanaryHash,
        runnerHash,
        scorerHash,
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
    status: "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R4_REVIEW_PROVIDER_EXECUTION_BLOCKED",
    claimCeiling: "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
  });
  assertClosedSelfHashedArtifactV5R4(registration, "NaturalCaExecutionRunnerRegistrationV3");
  const semanticErrors = validateProductionRunnerRegistrationV5R4(registration);
  if (semanticErrors.length > 0) throw new TypeError(semanticErrors.join("; "));
  return registration;
}

async function main() {
  const registration = await buildNaturalCaExecutionRunnerRegistrationV5R4({
    runnerCommit: process.argv[2],
    registeredAt: process.argv[3],
  });
  process.stdout.write(`${canonicalJsonV5R3(registration)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "V5-R4 runner registration build failed"}\n`);
    process.exitCode = 1;
  });
}

export async function workingTreeSourceReader(repoRoot, _commit, relativePath) {
  return readFile(path.join(repoRoot, relativePath));
}
