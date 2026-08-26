#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import DESIGN from "../../versions/design-v5/design-registration.json" with { type: "json" };
import SEQUENCING from "../../authorization-requests/2026-08-26-provider-authorization-sequencing.json" with { type: "json" };
import OWNER_DECISION from "../../owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json" with { type: "json" };
import V5_R2_REGISTRATION from "../v5-r2/runner-registration.json" with { type: "json" };
import PROVIDER_ERRATUM from "./provider-contract-erratum.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "../../../../content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs";
import {
  V5_R2_A11_DISCREPANCY_COMMIT,
  V5_R2_A11_DISCREPANCY_RECEIPT_HASH,
} from "./build-provider-contract-erratum.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(HERE, "../../../../..");
const execFileAsync = promisify(execFile);
const COMMIT = /^[0-9a-f]{40}$/u;

const CORE = "coordination/content-qa/mais-natural-ca60-v1/";
const RESEARCH = "coordination/research/mais-natural-ca60-v1/";

export const PRODUCTION_SOURCE_PATHS_V5_R3 = Object.freeze([
  `${CORE}atomic-execution-ledger-v5-r3.mjs`,
  `${CORE}authorization-guard-v5-r3.mjs`,
  `${CORE}deepseek-evaluation-adapter-v5-r2.mjs`,
  `${CORE}deepseek-live-evaluation-runner-v5-r3.mjs`,
  `${CORE}execution-integrity-v5-r3.mjs`,
  `${CORE}guarded-provider-attempt-v5-r3.mjs`,
  `${CORE}live-provider-http-v5-r3.mjs`,
  `${CORE}openai-live-reference-runner-v5-r3.mjs`,
  `${CORE}openai-reference-adapter-v5.mjs`,
  `${CORE}provider-request-adapters-v5-r3.mjs`,
  `${CORE}reference-label-seal-v5-r3.mjs`,
  `${CORE}resume-state-v5-r3.mjs`,
  `${CORE}route-receipt-store-v5-r3.mjs`,
  `${CORE}runner-v5-r3-cli.mjs`,
  `${CORE}runner-v5-r3-runtime.mjs`,
  `${CORE}scorer-v5-r3.mjs`,
  ...[
    "CredentialReadinessReceiptV1", "DeepSeekC0TriggerReceiptV1", "DeepSeekDirectRouteProbeReceiptV1",
    "DeepSeekExecutionRegistrationV1", "IndependentExecutionRunnerReviewReceiptV2", "MachineReferenceLabelV1",
    "MachineReferenceSealV2", "NaturalCaAggregateScoreReceiptV1", "NaturalCaExecutionRunnerRegistrationV2",
    "NaturalCaProviderContractErratumV1", "NaturalCaRunnerCommandReceiptV2", "NaturalCaScoringInputV1",
    "OpenAIAdjudicationTriggerReceiptV1", "OpenAIProjectRoutePreflightReceiptV2", "OwnerProviderGrantV1",
    "ProviderAuthorizationV3", "ProviderDispatchCompletionV1", "ProviderDispatchPermitV2",
    "ProviderDispatchReservationV1", "ProviderEventReceiptV3", "ProviderPriceSnapshotV1",
    "RawMachineReferenceLabelV1", "SampleExecutionInventoryV1",
  ].map((name) => `${CORE}schemas/${name}.schema.json`),
  `${RESEARCH}runner-registrations/v5-r3/build-provider-contract-erratum.mjs`,
  `${RESEARCH}runner-registrations/v5-r3/build-runner-registration.mjs`,
  `${RESEARCH}runner-registrations/v5-r3/provider-contract-erratum.json`,
]);

export const TEST_SOURCE_PATHS_V5_R3 = Object.freeze([
  `${CORE}execution-integrity-v5-r3.test.mjs`,
  `${CORE}guarded-provider-attempt-v5-r3.test.mjs`,
  `${CORE}live-provider-http-v5-r3.test.mjs`,
  `${CORE}provider-request-adapters-v5-r3.test.mjs`,
  `${CORE}provider-runner-wrappers-v5-r3.test.mjs`,
  `${CORE}reference-label-seal-v5-r3.test.mjs`,
  `${CORE}resume-state-v5-r3.test.mjs`,
  `${CORE}route-receipt-store-v5-r3.test.mjs`,
  `${CORE}runner-v5-r3-cli.test.mjs`,
  `${CORE}runner-v5-r3-runtime.test.mjs`,
  `${CORE}runner-v5-r3-schemas.test.mjs`,
  `${CORE}scorer-v5-r3.test.mjs`,
  `${RESEARCH}runner-registrations/v5-r3/provider-contract-erratum.test.mjs`,
  `${RESEARCH}runner-registrations/v5-r3/runner-registration-builder.test.mjs`,
]);

async function gitObjectReader(repoRoot, commit, relativePath) {
  const { stdout } = await execFileAsync("git", ["show", `${commit}:${relativePath}`], {
    cwd: repoRoot,
    encoding: "buffer",
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout;
}

async function sourceManifest({ repoRoot, commit, paths, readSource }) {
  const rows = [];
  for (const relativePath of [...paths].sort()) {
    const bytes = Buffer.from(await readSource(repoRoot, commit, relativePath));
    if (bytes.byteLength === 0) throw new TypeError(`${relativePath} is empty`);
    rows.push(Object.freeze({ path: relativePath, byteLength: bytes.byteLength, sha256: sha256V5R3(bytes) }));
  }
  return Object.freeze(rows);
}

function componentHash(manifest, paths) {
  const selected = manifest.filter(({ path: sourcePath }) => paths.includes(sourcePath));
  if (selected.length !== paths.length) throw new TypeError(`component source is absent: ${paths.join(", ")}`);
  return sha256V5R3(canonicalJsonV5R3(selected));
}

export async function buildNaturalCaExecutionRunnerRegistrationV5R3({
  repoRoot = DEFAULT_REPO_ROOT,
  runnerCommit,
  registeredAt,
  readSource = gitObjectReader,
} = {}) {
  if (!COMMIT.test(runnerCommit ?? "")) throw new TypeError("runnerCommit must be an exact Git SHA-1 object ID");
  if (typeof registeredAt !== "string" || !Number.isFinite(Date.parse(registeredAt))) throw new TypeError("registeredAt must be an explicit ISO timestamp");
  if (!validateSelfHashV5R3(PROVIDER_ERRATUM) || PROVIDER_ERRATUM.supersedesRunnerRegistrationHash !== V5_R2_REGISTRATION.registrationHash) {
    throw new TypeError("provider contract erratum is invalid");
  }
  const productionSourceManifest = await sourceManifest({ repoRoot, commit: runnerCommit, paths: PRODUCTION_SOURCE_PATHS_V5_R3, readSource });
  const testSourceManifest = await sourceManifest({ repoRoot, commit: runnerCommit, paths: TEST_SOURCE_PATHS_V5_R3, readSource });
  const frame = SEQUENCING.frameSampleEvidence;
  const component = (...relativePaths) => componentHash(productionSourceManifest, relativePaths);
  return sealV5R3Artifact({
    schemaVersion: "NaturalCaExecutionRunnerRegistrationV2",
    runnerVersion: "V5-R3",
    designId: "MAIS-NATURAL-CA60-V5",
    registeredAt,
    supersedesRunnerRegistrationHash: V5_R2_REGISTRATION.registrationHash,
    discrepancyReviewHash: V5_R2_A11_DISCREPANCY_RECEIPT_HASH,
    discrepancyReviewCommit: V5_R2_A11_DISCREPANCY_COMMIT,
    previousReceiptHash: PROVIDER_ERRATUM.selfHash,
    designRegistrationHash: DESIGN.registrationHash,
    frameRegistrationHash: frame.frameRegistrationHash,
    samplingFrameHash: frame.samplingFrameHash,
    sampleManifestHash: frame.sampleManifestHash,
    samplePayloadSetHash: frame.samplePayloadSetHash,
    sampleSelectionContentRootHash: frame.sampleSelectionContentRootHash,
    privacyScreenHash: frame.selectedPrivacyScreenRootHash,
    rightsScreenHash: frame.selectedRightsScreenRootHash,
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
    providerImplementations: {
      openAI: {
        provider: "OPENAI_DIRECT",
        model: "gpt-5.6-luna",
        endpoint: "https://us.api.openai.com/v1/responses",
        projectResidency: "US_STORAGE_PROCESSING",
        adapterHash: component(`${CORE}openai-reference-adapter-v5.mjs`, `${CORE}provider-request-adapters-v5-r3.mjs`),
        authorizationGuardHash: component(`${CORE}authorization-guard-v5-r3.mjs`),
        transportHash: component(`${CORE}live-provider-http-v5-r3.mjs`),
        atomicLedgerHash: component(`${CORE}atomic-execution-ledger-v5-r3.mjs`),
        routeReceiptBuilderHash: component(`${CORE}execution-integrity-v5-r3.mjs`, `${CORE}route-receipt-store-v5-r3.mjs`),
        resumeHash: component(`${CORE}resume-state-v5-r3.mjs`),
        runnerHash: component(`${CORE}openai-live-reference-runner-v5-r3.mjs`, `${CORE}guarded-provider-attempt-v5-r3.mjs`, `${CORE}reference-label-seal-v5-r3.mjs`),
        cliHash: component(`${CORE}runner-v5-r3-cli.mjs`, `${CORE}runner-v5-r3-runtime.mjs`),
        providerCallsMade: 0,
      },
      deepSeek: {
        provider: "DEEPSEEK_DIRECT",
        model: "deepseek-v4-pro",
        endpoint: "https://api.deepseek.com/chat/completions",
        projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
        adapterHash: component(`${CORE}deepseek-evaluation-adapter-v5-r2.mjs`, `${CORE}provider-request-adapters-v5-r3.mjs`),
        authorizationGuardHash: component(`${CORE}authorization-guard-v5-r3.mjs`),
        transportHash: component(`${CORE}live-provider-http-v5-r3.mjs`),
        atomicLedgerHash: component(`${CORE}atomic-execution-ledger-v5-r3.mjs`),
        routeReceiptBuilderHash: component(`${CORE}execution-integrity-v5-r3.mjs`, `${CORE}route-receipt-store-v5-r3.mjs`),
        resumeHash: component(`${CORE}resume-state-v5-r3.mjs`),
        runnerHash: component(`${CORE}deepseek-live-evaluation-runner-v5-r3.mjs`, `${CORE}guarded-provider-attempt-v5-r3.mjs`, `${CORE}scorer-v5-r3.mjs`),
        executionRegistrationValidatorHash: component(`${CORE}execution-integrity-v5-r3.mjs`),
        referenceInputCount: 0,
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
    status: "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R3_REVIEW_PROVIDER_EXECUTION_BLOCKED",
    claimCeiling: "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
  });
}

async function main() {
  const registration = await buildNaturalCaExecutionRunnerRegistrationV5R3({
    runnerCommit: process.argv[2],
    registeredAt: process.argv[3],
  });
  process.stdout.write(`${canonicalJsonV5R3(registration)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "V5-R3 runner registration build failed"}\n`);
    process.exitCode = 1;
  });
}

export async function workingTreeSourceReader(repoRoot, _commit, relativePath) {
  return readFile(path.join(repoRoot, relativePath));
}
