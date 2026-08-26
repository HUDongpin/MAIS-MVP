#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ACTIVE_POINTER from "../../ACTIVE-DESIGN-REGISTRATION.json" with { type: "json" };
import SEQUENCING from "../../authorization-requests/2026-08-26-provider-authorization-sequencing.json" with { type: "json" };
import OWNER_DECISION from "../../owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json" with { type: "json" };
import DESIGN_REGISTRATION from "../../versions/design-v5/design-registration.json" with { type: "json" };
import { canonicalJson, jcsHash } from "../../versions/design-v5/design-contract.mjs";
import { DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS } from "../../../../content-qa/mais-natural-ca60-v1/deepseek-evaluation-adapter-v5-r2.mjs";
import {
  OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5,
  OPENAI_REFERENCE_V5_CONSTANTS,
} from "../../../../content-qa/mais-natural-ca60-v1/openai-reference-adapter-v5.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(HERE, "../../../../..");
const SHA1 = /^[0-9a-f]{40}$/u;

export const PRODUCTION_SOURCE_PATHS_V5_R2 = Object.freeze([
  "coordination/content-qa/mais-natural-ca60-v1/authorization-guard-v5.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/cli.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-attempt-receipt-v5-r2.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-authorization-guard-v5-r2.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-evaluation-adapter-v5-r2.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-execution-state-v5-r2.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-live-evaluation-runner-v5-r2.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-route-probe-v5-r2.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/live-provider-http-v5-r2.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/openai-live-reference-runner-v5-r2.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/openai-project-route-preflight-v5-r2.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/openai-reference-adapter-v5.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/openai-reference-state-v5-r2.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/runner-storage-v5.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/runner-storage.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/DeepSeekEvaluationRoleOutputV5R2.schema.json",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/DeepSeekRouteProbeAuthorizationV1.schema.json",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaExecutionRunnerRegistrationV1.schema.json",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaRunnerCommandReceiptV1.schema.json",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/OpenAIProjectRoutePreflightAuthorizationV1.schema.json",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/ProviderDispatchPermitV1.schema.json",
  "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r2/build-runner-registration.mjs"
]);

export const TEST_SOURCE_PATHS_V5_R2 = Object.freeze([
  "coordination/content-qa/mais-natural-ca60-v1/authorization-guard-v5.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/cli.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-attempt-receipt-v5-r2.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-authorization-guard-v5-r2.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-evaluation-adapter-v5-r2.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-execution-state-v5-r2.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-live-evaluation-runner-v5-r2.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-route-probe-v5-r2.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/deepseek-v5-r2-test-fixtures.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/live-provider-http-v5-r2.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/openai-live-reference-runner-v5-r2.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/openai-project-route-preflight-v5-r2.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/openai-reference-adapter-v5.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/openai-reference-state-v5-r2.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/runner-schemas.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/runner-v5-r2-schemas.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/runner-v5-r2-test-fixtures.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/runner-storage-v5.test.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/runner-storage.test.mjs",
  "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r2/runner-registration-builder.test.mjs"
]);

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function sourceManifest(repoRoot, paths) {
  const rows = [];
  for (const relativePath of [...paths].sort()) {
    const bytes = await readFile(path.join(repoRoot, relativePath));
    rows.push({ path: relativePath, byteLength: bytes.byteLength, sha256: sha256Bytes(bytes) });
  }
  return rows;
}

export async function buildNaturalCaExecutionRunnerRegistrationV5R2({
  repoRoot = DEFAULT_REPO_ROOT,
  runnerCommit,
  createdAt,
} = {}) {
  if (!SHA1.test(runnerCommit ?? "")) throw new TypeError("runnerCommit must be an exact Git SHA-1 object ID");
  if (typeof createdAt !== "string" || !Number.isFinite(Date.parse(createdAt))) throw new TypeError("createdAt must be an explicit ISO timestamp");
  const productionSourceManifest = await sourceManifest(repoRoot, PRODUCTION_SOURCE_PATHS_V5_R2);
  const testSourceManifest = await sourceManifest(repoRoot, TEST_SOURCE_PATHS_V5_R2);
  const frame = SEQUENCING.frameSampleEvidence;
  const body = {
    schemaVersion: "NaturalCaExecutionRunnerRegistrationV1",
    artifactKind: "PRE_FIRST_PROVIDER_SUPERSEDING_EXECUTION_RUNNER_REGISTRATION",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R2",
    status: "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_REVIEW_PROVIDER_EXECUTION_BLOCKED",
    designRegistrationHash: DESIGN_REGISTRATION.registrationHash,
    supersedes: {
      preActivationRunner: {
        runnerCommit: SEQUENCING.runnerReadiness.preActivationRunnerCommit,
        runnerHash: SEQUENCING.runnerReadiness.preActivationRunnerHash,
        adapterHash: SEQUENCING.runnerReadiness.preActivationOpenAIAdapterHash,
      },
      formalFrameFreezeRunner: {
        runnerCommit: SEQUENCING.runnerReadiness.formalFrameFreezeRunnerCommit,
        runnerHash: SEQUENCING.runnerReadiness.formalFrameFreezeRunnerHash,
        adapterHash: null,
      },
      reason: "LIVE_TRANSPORTS_IMPLEMENTED_OFFLINE_BEFORE_FIRST_PROVIDER_EVENT",
      providerEventCountBeforeSupersede: 0,
    },
    frozenBindings: {
      activeDesignRegistrationHash: ACTIVE_POINTER.activeRegistrationHash,
      activationReceiptHash: SEQUENCING.activationReceiptHash,
      frameRegistrationHash: frame.frameRegistrationHash,
      samplingFrameHash: frame.samplingFrameHash,
      sampleManifestHash: frame.sampleManifestHash,
      sampleSelectionContentRootHash: frame.sampleSelectionContentRootHash,
      samplePayloadSetHash: frame.samplePayloadSetHash,
      selectedPrivacyScreenRootHash: frame.selectedPrivacyScreenRootHash,
      selectedRightsScreenRootHash: frame.selectedRightsScreenRootHash,
      c0RandomAuditHash: frame.c0RandomAuditHash,
      formalFreezeReceiptHash: frame.formalFreezeReceiptHash,
      priorA11FrameSampleReviewHash: frame.a11IndependentReviewHash,
      a18ClaimBoundaryReviewHash: frame.a18ClaimBoundaryReviewHash,
      rightsPolicyHash: OWNER_DECISION.rightsPolicyHash,
      lineageRuleHash: OWNER_DECISION.lineageRuleHash,
      frozenContractHashes: structuredClone(DESIGN_REGISTRATION.frozenContractHashes),
      frozenContractRootHash: DESIGN_REGISTRATION.frozenContractRootHash,
      taxonomyHash: DESIGN_REGISTRATION.frozenContractHashes.taxonomy,
      labelingAndAdjudicationHash: DESIGN_REGISTRATION.frozenContractHashes.labeling,
      thresholdsDecisionAndPowerHash: DESIGN_REGISTRATION.frozenContractHashes.analysis,
      decisionCeiling: DESIGN_REGISTRATION.scope.decisionCeiling,
    },
    sourceRoots: {
      runnerCommit,
      productionSourceManifest,
      productionSourceRootHash: jcsHash(productionSourceManifest),
      testSourceManifest,
      testSourceRootHash: jcsHash(testSourceManifest),
    },
    providerImplementations: {
      openAIReference: {
        provider: OPENAI_REFERENCE_V5_CONSTANTS.provider,
        endpoint: OPENAI_REFERENCE_V5_CONSTANTS.endpoint,
        model: OPENAI_REFERENCE_V5_CONSTANTS.model,
        projectResidency: OPENAI_REFERENCE_V5_CONSTANTS.projectResidency,
        apiSurface: "RESPONSES_API_V1",
        adapterHash: OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5,
        roles: [...OPENAI_REFERENCE_V5_CONSTANTS.roles],
        staticRoutePreflightImplemented: true,
        authorizationGuardImplemented: true,
        appendOnlyReceiptImplemented: true,
        resumeImplemented: true,
        providerCallsMade: 0,
      },
      deepSeekEvaluation: {
        provider: DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS.provider,
        endpoint: DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS.endpoint,
        model: DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS.model,
        projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
        apiSurface: "CHAT_COMPLETIONS_OPENAI_COMPATIBLE",
        adapterHash: DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS.adapterTransformHash,
        roles: [...DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS.roles],
        referenceInputCount: 0,
        staticRouteProbeImplemented: true,
        authorizationGuardImplemented: true,
        appendOnlyReceiptImplemented: true,
        resumeImplemented: true,
        providerCallsMade: 0,
      },
    },
    authorizationState: {
      freshA11RunnerReviewHash: null,
      openAIProjectRoutePreflightAuthorizationHash: null,
      openAIProjectRoutePreflightReceiptHash: null,
      openAIReferenceAuthorizationHash: null,
      referenceSealHash: null,
      referenceAttemptChainHash: null,
      deepSeekRouteProbeAuthorizationHash: null,
      deepSeekRouteProbeReceiptHash: null,
      deepSeekEvaluationAuthorizationHash: null,
      finalExecutionRegistrationHash: null,
      nextPermissibleStage: "FRESH_A11_OFFLINE_RUNNER_REVIEW",
    },
    authorityBoundary: {
      providerExecutionAuthorized: false,
      credentialReadAuthorized: false,
      naturalQuestionEgressAuthorized: false,
      tokenAuthorizationCreated: false,
      attemptAuthorizationCreated: false,
      usdAuthorizationCreated: false,
      providerEventCount: 0,
      credentialReadCount: 0,
      naturalQuestionEgressCount: 0,
      referenceLabelCount: 0,
      naturalQuestionResultCount: 0,
    },
    claimCeiling: "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    createdAt,
    previousReceiptHash: SEQUENCING.selfHash,
  };
  return Object.freeze({ ...body, registrationHash: jcsHash(body) });
}

async function main() {
  const runnerCommit = process.argv[2];
  const createdAt = process.argv[3];
  const outputPath = process.argv[4] ? path.resolve(process.argv[4]) : path.join(HERE, "runner-registration.json");
  const registration = await buildNaturalCaExecutionRunnerRegistrationV5R2({ runnerCommit, createdAt });
  await writeFile(outputPath, `${canonicalJson(registration)}\n`, { encoding: "utf8", mode: 0o644 });
  process.stdout.write(`${registration.registrationHash}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "runner registration build failed"}\n`);
    process.exitCode = 1;
  });
}
