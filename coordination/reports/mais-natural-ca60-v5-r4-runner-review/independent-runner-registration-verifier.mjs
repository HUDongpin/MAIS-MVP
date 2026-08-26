#!/usr/bin/env node

/**
 * A11 independent Git-object verifier for MAIS-NATURAL-CA60-V5-R4.
 *
 * This verifier uses Node built-ins only. It deliberately does not import the
 * A07 registration builder, canonicalizer, authorization guard, runner,
 * scorer, or decision engine. It never reads environment variables,
 * credentials, protected natural-item artifacts, or the network.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");

const REGISTRATION_COMMIT = "6ded6504318c044ddec4b262bb053143a2aec802";
const RUNNER_COMMIT = "63fc224c0b67d6b26e5713938f33ccda6fe998b1";
const EXPECTED_REGISTRATION_HASH = "2dd4b0e17d577f085aee33f9ada3a2de0f7db79b02b32524e9d6a05858a61dc6";
const EXPECTED_PRODUCTION_ROOT = "23c631f7ebd1364bc3caec2f324f69fbf32bf8cd4e6ca31216c01661559a8565";
const EXPECTED_TEST_ROOT = "3d84e6b961db20a216791a12c2c13323addc68e2d0a9dd5527f627599aab9233";
const PRIOR_REGISTRATION_HASH = "1dd8514b93638db806942bb85b04d975f17ce0f3b19fb77bc88ca81101ac0911";
const PRIOR_REVIEW_COMMIT = "1bada03e41f140233fd49c2f7ebdbabf77c1dce0";
const PRIOR_REVIEW_HASH = "2b8307b6547762499795952a2d4251cca033d70c6868586eb41bbc1409859faa";

const CORE = "coordination/content-qa/mais-natural-ca60-v1/";
const RESEARCH = "coordination/research/mais-natural-ca60-v1/";
const REGISTRATION_PATH = `${RESEARCH}runner-registrations/v5-r4/runner-registration.json`;
const DESIGN_PATH = `${RESEARCH}versions/design-v5/design-registration.json`;
const POINTER_PATH = `${RESEARCH}ACTIVE-DESIGN-REGISTRATION.json`;
const SEQUENCING_PATH = `${RESEARCH}authorization-requests/2026-08-26-provider-authorization-sequencing.json`;
const OWNER_DECISION_PATH = `${RESEARCH}owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json`;
const PRIOR_REGISTRATION_PATH = `${RESEARCH}runner-registrations/v5-r3/runner-registration.json`;
const PRIOR_REVIEW_PATH = "coordination/reports/mais-natural-ca60-v5-r3-runner-review/independent-runner-review-receipt.json";
const REVIEW_RECEIPT_PATH = path.join(HERE, "independent-runner-review-receipt.json");

const PRODUCTION_PATHS = Object.freeze(`
coordination/content-qa/mais-natural-ca60-v1/atomic-execution-ledger-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/deepseek-evaluation-adapter-v5-r2.mjs
coordination/content-qa/mais-natural-ca60-v1/deepseek-execution-control-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/execution-evidence-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/execution-integrity-v5-r3.mjs
coordination/content-qa/mais-natural-ca60-v1/execution-state-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/guarded-provider-attempt-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/method-kernel-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/openai-reference-adapter-v5.mjs
coordination/content-qa/mais-natural-ca60-v1/protected-storage-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/provider-request-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/reference-label-seal-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/route-authorization-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/runner-v5-r4-cli.mjs
coordination/content-qa/mais-natural-ca60-v1/runner-v5-r4-runtime.mjs
coordination/content-qa/mais-natural-ca60-v1/sample-contract-v5.mjs
coordination/content-qa/mais-natural-ca60-v1/schema-contract-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/schemas/AggregatePublicationAuthorizationV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/CanaryGateReceiptV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ClaimBoundaryReviewReceiptV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/CompletedItemCommitMarkerV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/CredentialReadinessReceiptV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/DeepSeekC0ExecutionSetV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/DeepSeekExecutionRegistrationV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ExecutionPlanReceiptV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/FinalExecutionVerificationReceiptV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/IndependentExecutionResultReviewReceiptV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/IndependentExecutionRunnerReviewReceiptV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ItemEvaluationResultV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/MachineReferenceLabelV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/MachineReferenceSealV3.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaAggregateScoreReceiptV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaExecutionRunnerRegistrationV3.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaRunnerCommandReceiptV3.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/OpenAIAdjudicationTriggerReceiptV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/OwnerProviderGrantV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ProtectedWorkflowIndexV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ProviderAuthorizationV4.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ProviderDispatchCompletionV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ProviderDispatchPermitV3.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ProviderDispatchReservationV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ProviderEventReceiptV4.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ProviderPriceSnapshotV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ProviderRequestArtifactV4.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ProviderRoleOutputV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ProviderRouteEvidenceLeafV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ProviderRouteProbeAttemptReceiptV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/PublicAggregateReportV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/RawMachineReferenceLabelV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/ReferenceSealValidationReceiptV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/RouteEvidenceBundleV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/RouteProbeAuthorizationV1.schema.json
coordination/content-qa/mais-natural-ca60-v1/schemas/SampleExecutionInventoryV2.schema.json
coordination/content-qa/mais-natural-ca60-v1/scorer-v5-r4.mjs
coordination/content-qa/mais-natural-ca60-v1/verification-publication-v5-r4.mjs
coordination/research/mais-natural-ca60-v1/authorization-requests/2026-08-26-provider-authorization-sequencing.json
coordination/research/mais-natural-ca60-v1/owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json
coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r3/provider-contract-erratum.json
coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r3/runner-registration.json
coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r4/build-runner-registration.mjs
coordination/research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs
coordination/research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs
coordination/research/mais-natural-ca60-v1/versions/design-v4/design-registration.json
coordination/research/mais-natural-ca60-v1/versions/design-v4/sample-contract.mjs
coordination/research/mais-natural-ca60-v1/versions/design-v4/schemas/ProviderAttemptReceiptV1.schema.json
coordination/research/mais-natural-ca60-v1/versions/design-v4/schemas/ProviderAuthorizationV1.schema.json
coordination/research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs
coordination/research/mais-natural-ca60-v1/versions/design-v5/design-registration.json
coordination/research/mais-natural-ca60-v1/versions/design-v5/schemas/OpenAIReferenceRoleOutputV1.schema.json
coordination/research/mais-natural-ca60-v1/versions/design-v5/schemas/ProviderAttemptReceiptV2.schema.json
coordination/research/mais-natural-ca60-v1/versions/design-v5/schemas/ProviderLogicalRequestV2.schema.json
coordination/research/mais-natural-ca60-v1/versions/design-v5/schemas/ProviderWireEvidenceV2.schema.json
`.trim().split("\n").sort());

const TEST_PATHS = Object.freeze([
  `${CORE}runner-v5-r4-contract.test.mjs`,
  `${CORE}runner-v5-r4-state-statistics.test.mjs`,
  `${CORE}runner-v5-r4-storage-ledger.test.mjs`,
  `${CORE}runner-v5-r4-test-fixtures.mjs`,
  `${RESEARCH}runner-registrations/v5-r4/runner-registration-builder.test.mjs`,
].sort());

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite JSON number");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (!value || typeof value !== "object") throw new TypeError(`unsupported JSON value ${typeof value}`);
  const keys = Object.keys(value).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function jcsHash(value) { return sha256(Buffer.from(canonical(value), "utf8")); }
function hashWithout(value, field) {
  const clone = structuredClone(value);
  delete clone[field];
  return jcsHash(clone);
}
function gitBytes(commit, relativePath) {
  if (relativePath.startsWith("/") || relativePath.split("/").includes("..") || relativePath.includes("\0")) throw new TypeError(`unsafe Git path ${relativePath}`);
  return execFileSync("git", ["show", `${commit}:${relativePath}`], { cwd: REPO_ROOT, encoding: null, maxBuffer: 64 * 1024 * 1024 });
}
function gitJson(commit, relativePath) { return JSON.parse(gitBytes(commit, relativePath).toString("utf8")); }
function manifest(commit, paths) {
  return [...paths].sort().map((relativePath) => {
    const bytes = gitBytes(commit, relativePath);
    return { path: relativePath, byteLength: bytes.byteLength, sha256: sha256(bytes) };
  });
}
function componentHash(sourceManifest, paths) {
  const wanted = new Set(paths);
  const selected = sourceManifest.filter(({ path: sourcePath }) => wanted.has(sourcePath));
  if (selected.length !== wanted.size) throw new Error(`component source set incomplete: ${paths.join(", ")}`);
  return jcsHash(selected);
}
function check(checks, id, condition, details) { checks.push({ id, status: condition ? "VERIFIED" : "MISMATCH", details }); }
function exactPaths(rows, expected) { return canonical(rows.map(({ path: sourcePath }) => sourcePath).sort()) === canonical([...expected].sort()); }

function run() {
  const checks = [];
  const registration = gitJson(REGISTRATION_COMMIT, REGISTRATION_PATH);
  const design = gitJson(RUNNER_COMMIT, DESIGN_PATH);
  const pointer = gitJson(RUNNER_COMMIT, POINTER_PATH);
  const sequencing = gitJson(RUNNER_COMMIT, SEQUENCING_PATH);
  const ownerDecision = gitJson(RUNNER_COMMIT, OWNER_DECISION_PATH);
  const priorRegistration = gitJson(RUNNER_COMMIT, PRIOR_REGISTRATION_PATH);
  const priorReview = gitJson(PRIOR_REVIEW_COMMIT, PRIOR_REVIEW_PATH);
  const reviewReceipt = JSON.parse(readFileSync(REVIEW_RECEIPT_PATH, "utf8"));
  const parent = execFileSync("git", ["rev-parse", `${REGISTRATION_COMMIT}^`], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
  const production = manifest(RUNNER_COMMIT, PRODUCTION_PATHS);
  const tests = manifest(RUNNER_COMMIT, TEST_PATHS);
  const productionRoot = jcsHash(production);
  const testRoot = jcsHash(tests);

  check(checks, "EXACT_REGISTRATION_COMMIT_PARENT", parent === RUNNER_COMMIT, { parent, expected: RUNNER_COMMIT });
  check(checks, "REGISTRATION_SELF_HASH", hashWithout(registration, "selfHash") === registration.selfHash && registration.selfHash === EXPECTED_REGISTRATION_HASH, registration.selfHash);
  check(checks, "PRODUCTION_PATH_SET", PRODUCTION_PATHS.length === 72 && exactPaths(registration.productionSourceManifest, PRODUCTION_PATHS), PRODUCTION_PATHS.length);
  check(checks, "PRODUCTION_GIT_OBJECT_MANIFEST", canonical(registration.productionSourceManifest) === canonical(production), productionRoot);
  check(checks, "PRODUCTION_ROOT", productionRoot === registration.productionSourceRootHash && productionRoot === EXPECTED_PRODUCTION_ROOT, productionRoot);
  check(checks, "TEST_PATH_SET", TEST_PATHS.length === 5 && exactPaths(registration.testSourceManifest, TEST_PATHS), TEST_PATHS.length);
  check(checks, "TEST_GIT_OBJECT_MANIFEST", canonical(registration.testSourceManifest) === canonical(tests), testRoot);
  check(checks, "TEST_ROOT", testRoot === registration.testSourceRootHash && testRoot === EXPECTED_TEST_ROOT, testRoot);

  check(checks, "DESIGN_REGISTRATION_HASH", hashWithout(design, "registrationHash") === design.registrationHash && registration.designRegistrationHash === design.registrationHash, design.registrationHash);
  const sectionChecks = Object.entries(design.frozenContractHashes).map(([name, expected]) => ({ name, expected, actual: jcsHash(design[name]) }));
  check(checks, "FROZEN_DESIGN_SECTION_HASHES", sectionChecks.every(({ expected, actual }) => expected === actual), sectionChecks);
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
    c0RandomAuditHash: frame.c0RandomAuditHash,
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
  check(checks, "V5_R3_SUPERSEDES_HASH", hashWithout(priorRegistration, "selfHash") === priorRegistration.selfHash
    && priorRegistration.selfHash === PRIOR_REGISTRATION_HASH && registration.supersedesRunnerRegistrationHash === priorRegistration.selfHash, priorRegistration.selfHash);
  check(checks, "V5_R3_DISCREPANCY_BINDING", hashWithout(priorReview, "selfHash") === priorReview.selfHash
    && priorReview.selfHash === PRIOR_REVIEW_HASH && registration.discrepancyReviewHash === priorReview.selfHash
    && registration.previousReceiptHash === priorReview.selfHash && registration.discrepancyReviewCommit === PRIOR_REVIEW_COMMIT, priorReview.selfHash);

  const expectedComponents = {
    openAIAdapter: componentHash(production, [`${CORE}openai-reference-adapter-v5.mjs`]),
    deepSeekAdapter: componentHash(production, [`${CORE}deepseek-evaluation-adapter-v5-r2.mjs`]),
    requestConstructionHash: componentHash(production, [`${CORE}provider-request-v5-r4.mjs`]),
    authorizationGuardHash: componentHash(production, [`${CORE}route-authorization-v5-r4.mjs`, `${CORE}schema-contract-v5-r4.mjs`]),
    transportHash: componentHash(production, [`${CORE}guarded-provider-attempt-v5-r4.mjs`]),
    atomicLedgerHash: componentHash(production, [`${CORE}atomic-execution-ledger-v5-r4.mjs`, `${CORE}protected-storage-v5-r4.mjs`]),
    routeEvidenceValidatorHash: componentHash(production, [`${CORE}route-authorization-v5-r4.mjs`]),
    resumeAndCanaryHash: componentHash(production, [`${CORE}deepseek-execution-control-v5-r4.mjs`, `${CORE}execution-state-v5-r4.mjs`]),
    runnerHash: componentHash(production, [`${CORE}execution-evidence-v5-r4.mjs`, `${CORE}reference-label-seal-v5-r4.mjs`, `${CORE}runner-v5-r4-cli.mjs`, `${CORE}runner-v5-r4-runtime.mjs`, `${CORE}verification-publication-v5-r4.mjs`]),
    scorerHash: componentHash(production, [`${CORE}scorer-v5-r4.mjs`]),
  };
  const openAI = registration.providerImplementations.openAI;
  const deepSeek = registration.providerImplementations.deepSeek;
  const commonComponentFields = ["requestConstructionHash", "authorizationGuardHash", "transportHash", "atomicLedgerHash", "routeEvidenceValidatorHash", "resumeAndCanaryHash", "runnerHash", "scorerHash"];
  check(checks, "PROVIDER_COMPONENT_HASHES", openAI.adapterHash === expectedComponents.openAIAdapter
    && deepSeek.adapterHash === expectedComponents.deepSeekAdapter
    && commonComponentFields.every((field) => openAI[field] === expectedComponents[field] && deepSeek[field] === expectedComponents[field]), expectedComponents);
  check(checks, "METHOD_KERNEL_COMPONENT_BINDINGS", registration.methodKernel.providerRequestConstructionHash === expectedComponents.requestConstructionHash
    && registration.methodKernel.protectedStorageHash === componentHash(production, [`${CORE}protected-storage-v5-r4.mjs`])
    && /^[0-9a-f]{64}$/u.test(registration.methodKernel.c0TriggerEngineHash), registration.methodKernel);
  check(checks, "EXACT_PROVIDER_TUPLES", openAI.provider === "OPENAI_DIRECT" && openAI.model === "gpt-5.6-luna"
    && openAI.endpoint === "https://us.api.openai.com/v1/responses" && openAI.projectResidency === "US_STORAGE_PROCESSING"
    && deepSeek.provider === "DEEPSEEK_DIRECT" && deepSeek.model === "deepseek-v4-pro"
    && deepSeek.endpoint === "https://api.deepseek.com/chat/completions" && deepSeek.projectResidency === "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE",
  { openAI: { provider: openAI.provider, model: openAI.model, endpoint: openAI.endpoint, projectResidency: openAI.projectResidency }, deepSeek: { provider: deepSeek.provider, model: deepSeek.model, endpoint: deepSeek.endpoint, projectResidency: deepSeek.projectResidency } });
  const authority = registration.authorizationState;
  check(checks, "ZERO_AUTHORITY_STATE", Object.entries(authority).every(([key, value]) => key.endsWith("Authorized") || key.endsWith("Created") ? value === false : value === 0)
    && openAI.providerCallsMade === 0 && deepSeek.providerCallsMade === 0, authority);
  check(checks, "A11_REVIEW_RECEIPT_SELF_HASH", hashWithout(reviewReceipt, "selfHash") === reviewReceipt.selfHash, reviewReceipt.selfHash);
  check(checks, "A11_REVIEW_RECEIPT_BINDINGS", reviewReceipt.schemaVersion === "IndependentExecutionRunnerReviewReceiptV2"
    && reviewReceipt.designId === "MAIS-NATURAL-CA60-V5" && reviewReceipt.runnerVersion === "V5-R4"
    && reviewReceipt.reviewerLane === "A11" && reviewReceipt.decision === "DISCREPANCY" && reviewReceipt.findingCount === 11
    && reviewReceipt.reviewedRunnerRegistrationHash === registration.selfHash && reviewReceipt.reviewedRunnerSourceCommit === RUNNER_COMMIT
    && reviewReceipt.reviewedProductionSourceRootHash === productionRoot && reviewReceipt.reviewedTestSourceRootHash === testRoot
    && Date.parse(reviewReceipt.reviewedAt) > Date.parse(registration.registeredAt), reviewReceipt);

  const mismatches = checks.filter(({ status }) => status !== "VERIFIED");
  return {
    schemaVersion: "A11IndependentRunnerRegistrationVerificationV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R4",
    decision: mismatches.length === 0 ? "DISCREPANCY" : "UNREVIEWABLE",
    checkCount: checks.length,
    verifiedCheckCount: checks.length - mismatches.length,
    mismatchCount: mismatches.length,
    findingCount: 11,
    registrationCommit: REGISTRATION_COMMIT,
    runnerSourceCommit: RUNNER_COMMIT,
    registrationHash: registration.selfHash,
    productionSourceRootHash: productionRoot,
    testSourceRootHash: testRoot,
    reviewReceiptHash: reviewReceipt.selfHash,
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

process.stdout.write(`${JSON.stringify(run(), null, 2)}\n`);
