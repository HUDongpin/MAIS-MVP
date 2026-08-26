#!/usr/bin/env node

/**
 * A11 independent verifier for MAIS-NATURAL-CA60-V5-R3.
 *
 * Independence boundary:
 * - uses Node built-ins only;
 * - reads the reviewed registration and bound sources from Git object bytes;
 * - does not import the A07 registration builder, runner, authorization guard,
 *   scorer, decision engine, canonicalizer, or hashing implementation;
 * - performs no network, provider, environment, credential, or natural-item read.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");

const REGISTRATION_COMMIT = "379f9e804011983630a3bca5630156046667686d";
const RUNNER_COMMIT = "5e7aac8d5bc15f73e1eba29a40b2c6e9d3baa141";
const EXPECTED_REGISTRATION_HASH = "1dd8514b93638db806942bb85b04d975f17ce0f3b19fb77bc88ca81101ac0911";
const EXPECTED_PRODUCTION_ROOT = "2c7e3fb49dd8e66e2ac6298100816903954c4d9f43448cb09e3c8a788ee4ab52";
const EXPECTED_TEST_ROOT = "19de508acd5af7d9a9ac4640dc43c36c23ccf7a0fa0f10a8dba51c92b8aa9dac";
const V5_R2_REGISTRATION_HASH = "8845a0f08ca0190c855c10b364f83c1a9d424655bc1926895b59360dbea96fb2";
const V5_R2_DISCREPANCY_COMMIT = "916d2430ba7b7b057aea018c68acdf0a9a14b13c";
const V5_R2_DISCREPANCY_HASH = "82d5e8edca9896f35f5c2271d84e62344a2eeb9b45ba0fa0e86c7fec354be4dd";
const PROVIDER_ERRATUM_HASH = "f9fad74c0250b4e3e816ba755aca44070d87d23dce03b98bd7b6a60ad5492f1d";

const CORE = "coordination/content-qa/mais-natural-ca60-v1/";
const RESEARCH = "coordination/research/mais-natural-ca60-v1/";
const REGISTRATION_PATH = `${RESEARCH}runner-registrations/v5-r3/runner-registration.json`;
const DESIGN_PATH = `${RESEARCH}versions/design-v5/design-registration.json`;
const POINTER_PATH = `${RESEARCH}ACTIVE-DESIGN-REGISTRATION.json`;
const SEQUENCING_PATH = `${RESEARCH}authorization-requests/2026-08-26-provider-authorization-sequencing.json`;
const OWNER_DECISION_PATH = `${RESEARCH}owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json`;
const V5_R2_REGISTRATION_PATH = `${RESEARCH}runner-registrations/v5-r2/runner-registration.json`;
const PROVIDER_ERRATUM_PATH = `${RESEARCH}runner-registrations/v5-r3/provider-contract-erratum.json`;
const V5_R2_REVIEW_PATH = "coordination/reports/mais-natural-ca60-v5-r2-runner-review/independent-runner-review-receipt.json";
const REVIEW_RECEIPT_PATH = path.join(HERE, "independent-runner-review-receipt.json");

const PRODUCTION_PATHS = Object.freeze([
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
].sort());

const TEST_PATHS = Object.freeze([
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
].sort());

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite JSON number");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value !== "object") throw new TypeError(`unsupported JSON type ${typeof value}`);
  const keys = Object.keys(value).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function jcsHash(value) {
  return sha256(Buffer.from(canonical(value), "utf8"));
}

function hashWithout(value, field) {
  const clone = structuredClone(value);
  delete clone[field];
  return jcsHash(clone);
}

function gitBytes(commit, relativePath) {
  if (relativePath.startsWith("/") || relativePath.split("/").includes("..") || relativePath.includes("\0")) {
    throw new TypeError(`unsafe Git path ${relativePath}`);
  }
  return execFileSync("git", ["show", `${commit}:${relativePath}`], {
    cwd: REPO_ROOT,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function gitJson(commit, relativePath) {
  return JSON.parse(gitBytes(commit, relativePath).toString("utf8"));
}

function manifest(commit, paths) {
  return [...paths].sort().map((relativePath) => {
    const bytes = gitBytes(commit, relativePath);
    return { path: relativePath, byteLength: bytes.byteLength, sha256: sha256(bytes) };
  });
}

function componentHash(sourceManifest, paths) {
  const wanted = new Set(paths);
  const selected = sourceManifest.filter((row) => wanted.has(row.path));
  if (selected.length !== paths.length) throw new Error(`component manifest incomplete: ${paths.join(", ")}`);
  return jcsHash(selected);
}

function check(checks, id, condition, details) {
  checks.push({ id, status: condition ? "VERIFIED" : "MISMATCH", details });
}

function exactPaths(rows, paths) {
  return canonical(rows.map((row) => row.path).sort()) === canonical([...paths].sort());
}

function independentReview() {
  const checks = [];
  const registration = gitJson(REGISTRATION_COMMIT, REGISTRATION_PATH);
  const design = gitJson(RUNNER_COMMIT, DESIGN_PATH);
  const pointer = gitJson(RUNNER_COMMIT, POINTER_PATH);
  const sequencing = gitJson(RUNNER_COMMIT, SEQUENCING_PATH);
  const ownerDecision = gitJson(RUNNER_COMMIT, OWNER_DECISION_PATH);
  const priorRegistration = gitJson(RUNNER_COMMIT, V5_R2_REGISTRATION_PATH);
  const erratum = gitJson(RUNNER_COMMIT, PROVIDER_ERRATUM_PATH);
  const priorReview = gitJson(V5_R2_DISCREPANCY_COMMIT, V5_R2_REVIEW_PATH);
  const parent = execFileSync("git", ["rev-parse", `${REGISTRATION_COMMIT}^`], { cwd: REPO_ROOT, encoding: "utf8" }).trim();

  const production = manifest(RUNNER_COMMIT, PRODUCTION_PATHS);
  const tests = manifest(RUNNER_COMMIT, TEST_PATHS);
  const productionRoot = jcsHash(production);
  const testRoot = jcsHash(tests);

  check(checks, "EXACT_REGISTRATION_COMMIT_PARENT", parent === RUNNER_COMMIT, { registrationCommit: REGISTRATION_COMMIT, runnerCommit: RUNNER_COMMIT });
  check(checks, "REGISTRATION_SELF_HASH", hashWithout(registration, "selfHash") === registration.selfHash && registration.selfHash === EXPECTED_REGISTRATION_HASH, registration.selfHash);
  check(checks, "PRODUCTION_PATH_SET", PRODUCTION_PATHS.length === 42 && exactPaths(registration.productionSourceManifest, PRODUCTION_PATHS), PRODUCTION_PATHS.length);
  check(checks, "PRODUCTION_GIT_OBJECT_MANIFEST", canonical(registration.productionSourceManifest) === canonical(production), productionRoot);
  check(checks, "PRODUCTION_ROOT", productionRoot === registration.productionSourceRootHash && productionRoot === EXPECTED_PRODUCTION_ROOT, productionRoot);
  check(checks, "TEST_PATH_SET", TEST_PATHS.length === 14 && exactPaths(registration.testSourceManifest, TEST_PATHS), TEST_PATHS.length);
  check(checks, "TEST_GIT_OBJECT_MANIFEST", canonical(registration.testSourceManifest) === canonical(tests), testRoot);
  check(checks, "TEST_ROOT", testRoot === registration.testSourceRootHash && testRoot === EXPECTED_TEST_ROOT, testRoot);

  check(checks, "DESIGN_REGISTRATION_HASH", hashWithout(design, "registrationHash") === design.registrationHash && registration.designRegistrationHash === design.registrationHash, design.registrationHash);
  const sectionChecks = Object.entries(design.frozenContractHashes).map(([name, expected]) => ({ name, actual: jcsHash(design[name]), expected }));
  check(checks, "FROZEN_DESIGN_SECTION_HASHES", sectionChecks.every(({ actual, expected }) => actual === expected), sectionChecks);
  check(checks, "FROZEN_DESIGN_ROOT", jcsHash(Object.entries(design.frozenContractHashes)) === design.frozenContractRootHash, design.frozenContractRootHash);
  check(checks, "ACTIVE_DESIGN_POINTER", pointer.activeRegistrationHash === design.registrationHash && pointer.activeDesignId === "MAIS-NATURAL-CA60-V5", pointer.activeRegistrationHash);
  check(checks, "SEQUENCING_SELF_HASH", hashWithout(sequencing, "selfHash") === sequencing.selfHash && sequencing.registrationHash === design.registrationHash, sequencing.selfHash);
  check(checks, "OWNER_DECISION_HASH", hashWithout(ownerDecision, "ownerDecisionReceiptHash") === ownerDecision.ownerDecisionReceiptHash, ownerDecision.ownerDecisionReceiptHash);

  const frame = sequencing.frameSampleEvidence;
  const frozenBindings = {
    frameRegistrationHash: frame.frameRegistrationHash,
    samplingFrameHash: frame.samplingFrameHash,
    sampleManifestHash: frame.sampleManifestHash,
    samplePayloadSetHash: frame.samplePayloadSetHash,
    sampleSelectionContentRootHash: frame.sampleSelectionContentRootHash,
    privacyScreenHash: frame.selectedPrivacyScreenRootHash,
    rightsScreenHash: frame.selectedRightsScreenRootHash,
    rightsPolicyHash: ownerDecision.rightsPolicyHash,
    lineageRuleHash: ownerDecision.lineageRuleHash,
    taxonomyHash: design.frozenContractHashes.taxonomy,
    labelingAndAdjudicationHash: design.frozenContractHashes.labeling,
    thresholdsDecisionAndPowerHash: design.frozenContractHashes.analysis,
    decisionCeiling: design.scope.decisionCeiling,
  };
  check(checks, "FROZEN_FRAME_SAMPLE_RIGHTS_METHOD_BINDINGS", Object.entries(frozenBindings).every(([key, value]) => registration[key] === value), frozenBindings);

  check(checks, "V5_R2_SUPERSEDES_HASH", hashWithout(priorRegistration, "registrationHash") === priorRegistration.registrationHash
    && registration.supersedesRunnerRegistrationHash === priorRegistration.registrationHash
    && priorRegistration.registrationHash === V5_R2_REGISTRATION_HASH, priorRegistration.registrationHash);
  check(checks, "V5_R2_DISCREPANCY_BINDING", hashWithout(priorReview, "selfHash") === priorReview.selfHash
    && priorReview.selfHash === V5_R2_DISCREPANCY_HASH
    && registration.discrepancyReviewHash === priorReview.selfHash
    && registration.discrepancyReviewCommit === V5_R2_DISCREPANCY_COMMIT, priorReview.selfHash);
  check(checks, "PROVIDER_ERRATUM_CHAIN", hashWithout(erratum, "selfHash") === erratum.selfHash
    && erratum.selfHash === PROVIDER_ERRATUM_HASH
    && registration.providerContractErratumHash === erratum.selfHash
    && registration.previousReceiptHash === erratum.selfHash
    && erratum.previousReceiptHash === priorReview.selfHash, erratum.selfHash);

  const openAI = registration.providerImplementations.openAI;
  const deepSeek = registration.providerImplementations.deepSeek;
  const expectedComponents = {
    openAIAdapter: componentHash(production, [`${CORE}openai-reference-adapter-v5.mjs`, `${CORE}provider-request-adapters-v5-r3.mjs`]),
    deepSeekAdapter: componentHash(production, [`${CORE}deepseek-evaluation-adapter-v5-r2.mjs`, `${CORE}provider-request-adapters-v5-r3.mjs`]),
    authorizationGuard: componentHash(production, [`${CORE}authorization-guard-v5-r3.mjs`]),
    transport: componentHash(production, [`${CORE}live-provider-http-v5-r3.mjs`]),
    ledger: componentHash(production, [`${CORE}atomic-execution-ledger-v5-r3.mjs`]),
    route: componentHash(production, [`${CORE}execution-integrity-v5-r3.mjs`, `${CORE}route-receipt-store-v5-r3.mjs`]),
    resume: componentHash(production, [`${CORE}resume-state-v5-r3.mjs`]),
    openAIRunner: componentHash(production, [`${CORE}openai-live-reference-runner-v5-r3.mjs`, `${CORE}guarded-provider-attempt-v5-r3.mjs`, `${CORE}reference-label-seal-v5-r3.mjs`]),
    deepSeekRunner: componentHash(production, [`${CORE}deepseek-live-evaluation-runner-v5-r3.mjs`, `${CORE}guarded-provider-attempt-v5-r3.mjs`, `${CORE}scorer-v5-r3.mjs`]),
    cli: componentHash(production, [`${CORE}runner-v5-r3-cli.mjs`, `${CORE}runner-v5-r3-runtime.mjs`]),
  };
  check(checks, "PROVIDER_COMPONENT_HASHES", openAI.adapterHash === expectedComponents.openAIAdapter
    && deepSeek.adapterHash === expectedComponents.deepSeekAdapter
    && openAI.authorizationGuardHash === expectedComponents.authorizationGuard
    && deepSeek.authorizationGuardHash === expectedComponents.authorizationGuard
    && openAI.transportHash === expectedComponents.transport && deepSeek.transportHash === expectedComponents.transport
    && openAI.atomicLedgerHash === expectedComponents.ledger && deepSeek.atomicLedgerHash === expectedComponents.ledger
    && openAI.routeReceiptBuilderHash === expectedComponents.route && deepSeek.routeReceiptBuilderHash === expectedComponents.route
    && openAI.resumeHash === expectedComponents.resume && deepSeek.resumeHash === expectedComponents.resume
    && openAI.runnerHash === expectedComponents.openAIRunner && deepSeek.runnerHash === expectedComponents.deepSeekRunner
    && openAI.cliHash === expectedComponents.cli && deepSeek.executionRegistrationValidatorHash === componentHash(production, [`${CORE}execution-integrity-v5-r3.mjs`]), expectedComponents);
  check(checks, "EXACT_PROVIDER_TUPLES", openAI.provider === "OPENAI_DIRECT" && openAI.model === "gpt-5.6-luna"
    && openAI.endpoint === "https://us.api.openai.com/v1/responses" && openAI.projectResidency === "US_STORAGE_PROCESSING"
    && deepSeek.provider === "DEEPSEEK_DIRECT" && deepSeek.model === "deepseek-v4-pro"
    && deepSeek.endpoint === "https://api.deepseek.com/chat/completions" && deepSeek.referenceInputCount === 0,
  { openAI: { provider: openAI.provider, model: openAI.model, endpoint: openAI.endpoint, projectResidency: openAI.projectResidency }, deepSeek: { provider: deepSeek.provider, model: deepSeek.model, endpoint: deepSeek.endpoint, referenceInputCount: deepSeek.referenceInputCount } });
  check(checks, "ZERO_AUTHORITY_STATE", Object.entries(registration.authorizationState).every(([key, value]) => key.endsWith("Authorized") || key.endsWith("Created") ? value === false : value === 0)
    && openAI.providerCallsMade === 0 && deepSeek.providerCallsMade === 0, registration.authorizationState);

  const receipt = JSON.parse(readFileSync(REVIEW_RECEIPT_PATH, "utf8"));
  check(checks, "A11_REVIEW_RECEIPT_SELF_HASH", hashWithout(receipt, "selfHash") === receipt.selfHash, receipt.selfHash);
  check(checks, "A11_REVIEW_RECEIPT_BINDINGS", receipt.schemaVersion === "IndependentExecutionRunnerReviewReceiptV2"
    && receipt.designId === "MAIS-NATURAL-CA60-V5" && receipt.runnerVersion === "V5-R3"
    && receipt.reviewerLane === "A11" && receipt.decision === "DISCREPANCY" && receipt.findingCount === 13
    && receipt.reviewedRunnerRegistrationHash === registration.selfHash
    && receipt.reviewedRunnerSourceCommit === RUNNER_COMMIT
    && receipt.reviewedProductionSourceRootHash === productionRoot
    && receipt.reviewedTestSourceRootHash === testRoot
    && Date.parse(receipt.reviewedAt) > Date.parse(registration.registeredAt), receipt);

  const mismatches = checks.filter(({ status }) => status !== "VERIFIED");
  return {
    schemaVersion: "A11IndependentRunnerRegistrationVerificationV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R3",
    decision: mismatches.length === 0 ? "DISCREPANCY" : "UNREVIEWABLE",
    checkCount: checks.length,
    verifiedCheckCount: checks.length - mismatches.length,
    mismatchCount: mismatches.length,
    findingCount: 13,
    registrationCommit: REGISTRATION_COMMIT,
    runnerSourceCommit: RUNNER_COMMIT,
    registrationHash: registration.selfHash,
    productionSourceRootHash: productionRoot,
    testSourceRootHash: testRoot,
    reviewReceiptHash: receipt.selfHash,
    checks,
    provedBoundary: {
      credentialsRead: 0,
      providerCalls: 0,
      naturalQuestionsReadOrEgressed: 0,
      tokensAuthorizedOrSpent: 0,
      attemptsAuthorizedOrSpent: 0,
      usdAuthorizedOrSpent: 0,
    },
  };
}

const evidence = independentReview();
process.stdout.write(`${canonical(evidence)}\n`);
if (evidence.mismatchCount !== 0) process.exitCode = 1;
