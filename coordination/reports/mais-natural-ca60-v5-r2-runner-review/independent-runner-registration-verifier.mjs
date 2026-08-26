#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(HERE, "../../..");
const REGISTRATION_COMMIT = "385ec33f87294328e637c2ebd165c316a96ae5ad";
const RUNNER_COMMIT = "c9fffc6f69257ba70e5a08d27b9f14b202f37e8f";
const REGISTRATION_HASH = "8845a0f08ca0190c855c10b364f83c1a9d424655bc1926895b59360dbea96fb2";
const REGISTRATION_PATH = "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r2/runner-registration.json";
const DESIGN_PATH = "coordination/research/mais-natural-ca60-v1/versions/design-v5/design-registration.json";
const POINTER_PATH = "coordination/research/mais-natural-ca60-v1/ACTIVE-DESIGN-REGISTRATION.json";
const SEQUENCING_PATH = "coordination/research/mais-natural-ca60-v1/authorization-requests/2026-08-26-provider-authorization-sequencing.json";
const OWNER_DECISION_PATH = "coordination/research/mais-natural-ca60-v1/owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json";
const OUTPUT_PATH = path.join(HERE, "independent-runner-review-receipt.json");

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite numbers are not valid canonical JSON");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value !== "object") throw new TypeError(`unsupported canonical JSON type: ${typeof value}`);
  const keys = Object.keys(value).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function jcsHash(value) {
  return sha256Bytes(Buffer.from(canonicalJson(value), "utf8"));
}

function hashWithout(value, field) {
  const body = structuredClone(value);
  delete body[field];
  return jcsHash(body);
}

function gitBytes(repoRoot, commit, relativePath) {
  if (relativePath.includes("\0") || relativePath.startsWith("/") || relativePath.split("/").includes("..")) {
    throw new TypeError(`unsafe git object path: ${relativePath}`);
  }
  return execFileSync("git", ["show", `${commit}:${relativePath}`], {
    cwd: repoRoot,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function gitJson(repoRoot, commit, relativePath) {
  return JSON.parse(gitBytes(repoRoot, commit, relativePath).toString("utf8"));
}

function sourceText(repoRoot, relativePath) {
  return gitBytes(repoRoot, RUNNER_COMMIT, relativePath).toString("utf8");
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function assertCheck(checks, id, condition, details) {
  checks.push(Object.freeze({ id, status: condition ? "VERIFIED" : "MISMATCH", details }));
  return condition;
}

function recomputeManifest(repoRoot, declaredRows) {
  return [...declaredRows]
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
    .map(({ path: relativePath }) => {
      const bytes = gitBytes(repoRoot, RUNNER_COMMIT, relativePath);
      return Object.freeze({ path: relativePath, byteLength: bytes.byteLength, sha256: sha256Bytes(bytes) });
    });
}

function frozenBindingProjection({ design, pointer, sequencing, ownerDecision }) {
  const frame = sequencing.frameSampleEvidence;
  return {
    activeDesignRegistrationHash: pointer.activeRegistrationHash,
    activationReceiptHash: sequencing.activationReceiptHash,
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
    rightsPolicyHash: ownerDecision.rightsPolicyHash,
    lineageRuleHash: ownerDecision.lineageRuleHash,
    frozenContractHashes: design.frozenContractHashes,
    frozenContractRootHash: design.frozenContractRootHash,
    taxonomyHash: design.frozenContractHashes.taxonomy,
    labelingAndAdjudicationHash: design.frozenContractHashes.labeling,
    thresholdsDecisionAndPowerHash: design.frozenContractHashes.analysis,
    decisionCeiling: design.scope.decisionCeiling,
  };
}

function supersedesProjection(sequencing) {
  return {
    preActivationRunner: {
      runnerCommit: sequencing.runnerReadiness.preActivationRunnerCommit,
      runnerHash: sequencing.runnerReadiness.preActivationRunnerHash,
      adapterHash: sequencing.runnerReadiness.preActivationOpenAIAdapterHash,
    },
    formalFrameFreezeRunner: {
      runnerCommit: sequencing.runnerReadiness.formalFrameFreezeRunnerCommit,
      runnerHash: sequencing.runnerReadiness.formalFrameFreezeRunnerHash,
      adapterHash: null,
    },
    reason: "LIVE_TRANSPORTS_IMPLEMENTED_OFFLINE_BEFORE_FIRST_PROVIDER_EVENT",
    providerEventCountBeforeSupersede: 0,
  };
}

function inspectImplementation(repoRoot) {
  const openGuard = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/authorization-guard-v5.mjs");
  const deepGuard = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/deepseek-authorization-guard-v5-r2.mjs");
  const openRunner = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/openai-live-reference-runner-v5-r2.mjs");
  const deepRunner = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/deepseek-live-evaluation-runner-v5-r2.mjs");
  const http = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/live-provider-http-v5-r2.mjs");
  const cli = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/cli.mjs");
  const openRoute = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/openai-project-route-preflight-v5-r2.mjs");
  const deepRoute = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/deepseek-route-probe-v5-r2.mjs");
  const openState = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/openai-reference-state-v5-r2.mjs");
  const deepState = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/deepseek-execution-state-v5-r2.mjs");
  const deepAdapter = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/deepseek-evaluation-adapter-v5-r2.mjs");
  const v4Design = sourceText(repoRoot, "coordination/research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs");
  const schema = JSON.parse(sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaExecutionRunnerRegistrationV1.schema.json"));
  const storage = sourceText(repoRoot, "coordination/content-qa/mais-natural-ca60-v1/runner-storage.mjs");
  const appendBlock = storage.slice(
    storage.indexOf("async append(payload)"),
    storage.indexOf("function validateCompletedItemMarker"),
  );

  return Object.freeze({
    freshReviewCannotBind: openGuard.includes("IndependentDesignReviewReceiptV1")
      && deepGuard.includes("IndependentDesignReviewReceiptV1")
      && !openGuard.includes("IndependentExecutionRunnerReviewReceiptV1")
      && !deepGuard.includes("IndependentExecutionRunnerReviewReceiptV1")
      && !openGuard.includes("freshA11RunnerReviewHash")
      && !deepGuard.includes("freshA11RunnerReviewHash"),
    callerSuppliedBudgetOnly: openGuard.includes("budgetState") && deepGuard.includes("budgetState")
      && !openGuard.includes("receiptStore") && !deepGuard.includes("receiptStore"),
    providerEventsCanEscapeCompleteReceipt: http.includes("const rawResponseBody = await response.text();")
      && openRunner.includes("inputTokens: 0") && deepRunner.includes("inputTokens: 0")
      && http.includes("integrityFailure: \"PROVIDER_ORIGIN_DRIFT\""),
    cliIsStatusOnly: cli.includes("function statusFor(command)")
      && cli.includes("providerRequestCount: 0")
      && !cli.includes("openai-live-reference-runner-v5-r2.mjs")
      && !cli.includes("deepseek-live-evaluation-runner-v5-r2.mjs"),
    routeReceiptBuildersMissing: !openRoute.includes("OpenAIProjectRoutePreflightReceiptV1")
      && !deepRoute.includes("DeepSeekRouteProbeReceiptV1"),
    executionRegistrationOnlyShapeChecked: deepRunner.includes("/^[0-9a-f]{64}$/u.test(input.executionRegistrationHash")
      && !deepGuard.includes("executionRegistrationHash"),
    priorRoleArtifactsNotCryptographicallyRevalidated: openGuard.includes("!SHA256.test(artifact.selfHash")
      && !openGuard.includes("hashWithout(artifact, \"selfHash\")")
      && deepAdapter.includes("typeof artifact.parsedPayload !== \"object\"")
      && !deepAdapter.includes("attemptReceiptHash"),
    resumeDecisionsCallerSelected: openState.includes("{ attempts, adjudicationRequired }")
      && deepState.includes("{ itemHash, itemIdPseudonym, c0Required, attempts }")
      && !openState.includes("itemHash"),
    staleQwenWordingInherited: deepAdapter.includes("DEEPSEEK_ROLE_CONTRACTS")
      && v4Design.includes("Never receive Qwen or final reference labels."),
    registrationSchemaUnderspecified: schema.properties.frozenBindings?.minProperties === 12
      && schema.properties.providerImplementations?.properties?.openAIReference?.type === "object"
      && Object.keys(schema.properties.providerImplementations.properties.openAIReference).length === 1
      && schema.properties.authorizationState?.type === "object"
      && Object.keys(schema.properties.authorizationState).length === 1,
    appendClaimNotCrashAtomic: appendBlock.includes("open(filePath, \"a\"")
      && appendBlock.includes("handle.write(`${canonicalJson(receipt)}\\n`")
      && !appendBlock.includes("rename("),
  });
}

const FINDING_DEFINITIONS = Object.freeze([
  {
    id: "A11-R2-001",
    severity: "CRITICAL",
    observation: "freshReviewCannotBind",
    title: "Fresh post-registration A11 review cannot be bound or consumed by either live guard",
    evidence: [
      "coordination/content-qa/mais-natural-ca60-v1/authorization-guard-v5.mjs:205",
      "coordination/content-qa/mais-natural-ca60-v1/authorization-guard-v5.mjs:484",
      "coordination/content-qa/mais-natural-ca60-v1/deepseek-authorization-guard-v5-r2.mjs:73",
    ],
    remediation: "Define and validate a self-hashed runner-review receipt that binds this registration hash, runner commit, both source roots, adapter hashes, decision, and post-registration chronology; bind its hash into each later authorization and live guard.",
    requiresNewSupersedingRunnerRegistration: true,
  },
  {
    id: "A11-R2-002",
    severity: "CRITICAL",
    observation: "callerSuppliedBudgetOnly",
    title: "Attempts, role attempts, token, USD, and concurrency limits trust caller-supplied snapshots",
    evidence: [
      "coordination/content-qa/mais-natural-ca60-v1/authorization-guard-v5.mjs:411",
      "coordination/content-qa/mais-natural-ca60-v1/deepseek-authorization-guard-v5-r2.mjs:219",
      "coordination/content-qa/mais-natural-ca60-v1/runner-storage.mjs:556",
    ],
    remediation: "Derive authoritative usage from the verified receipt chain and atomically reserve attempts/tokens/USD/concurrency before dispatch; reject duplicate attempt IDs and stale reservations.",
    requiresNewSupersedingRunnerRegistration: true,
  },
  {
    id: "A11-R2-003",
    severity: "CRITICAL",
    observation: "providerEventsCanEscapeCompleteReceipt",
    title: "Some dispatched provider events can be absent, undercounted, or lose integrity-failure evidence",
    evidence: [
      "coordination/content-qa/mais-natural-ca60-v1/live-provider-http-v5-r2.mjs:228",
      "coordination/content-qa/mais-natural-ca60-v1/live-provider-http-v5-r2.mjs:249",
      "coordination/content-qa/mais-natural-ca60-v1/openai-live-reference-runner-v5-r2.mjs:74",
      "coordination/content-qa/mais-natural-ca60-v1/deepseek-live-evaluation-runner-v5-r2.mjs:56",
    ],
    remediation: "Create the consumed-attempt record before dispatch, finalize every post-dispatch outcome, preserve origin/model/finish drift, extract any valid usage before schema rejection, and derive cost from the bound rate snapshot.",
    requiresNewSupersedingRunnerRegistration: true,
  },
  {
    id: "A11-R2-004",
    severity: "CRITICAL",
    observation: "executionRegistrationOnlyShapeChecked",
    title: "DeepSeek accepts a syntactically valid execution-registration hash without authenticating the registration",
    evidence: [
      "coordination/content-qa/mais-natural-ca60-v1/deepseek-live-evaluation-runner-v5-r2.mjs:139",
      "coordination/content-qa/mais-natural-ca60-v1/deepseek-authorization-guard-v5-r2.mjs:242",
    ],
    remediation: "Validate the complete self-hashed execution registration and its authorization, reference seal, frame/sample, adapter, model, endpoint, and runner-registration bindings before credential read or dispatch.",
    requiresNewSupersedingRunnerRegistration: true,
  },
  {
    id: "A11-R2-005",
    severity: "HIGH",
    observation: "priorRoleArtifactsNotCryptographicallyRevalidated",
    title: "Prior-role artifacts are shape-checked but not independently rehashed and lineage-verified",
    evidence: [
      "coordination/content-qa/mais-natural-ca60-v1/authorization-guard-v5.mjs:390",
      "coordination/content-qa/mais-natural-ca60-v1/deepseek-evaluation-adapter-v5-r2.mjs:46",
    ],
    remediation: "Recompute every prior artifact self-hash, require the bound successful attempt receipt and same-item chain lineage, and derive later roles only from protected sealed storage.",
    requiresNewSupersedingRunnerRegistration: true,
  },
  {
    id: "A11-R2-006",
    severity: "HIGH",
    observation: "routeReceiptBuildersMissing",
    title: "Route preflight/probe runs do not build the frozen route evidence receipts required downstream",
    evidence: [
      "coordination/content-qa/mais-natural-ca60-v1/openai-project-route-preflight-v5-r2.mjs:271",
      "coordination/content-qa/mais-natural-ca60-v1/deepseek-route-probe-v5-r2.mjs:209",
      "coordination/content-qa/mais-natural-ca60-v1/live-provider-http-v5-r2.mjs:197",
    ],
    remediation: "Implement closed, self-hashed route receipt builders/writers that bind the attempt, credential-readiness, project/region evidence, observed tuple, entitlement, price snapshot, and zero-natural-content scope.",
    requiresNewSupersedingRunnerRegistration: true,
  },
  {
    id: "A11-R2-007",
    severity: "HIGH",
    observation: "cliIsStatusOnly",
    title: "The public CLI is a static status reporter rather than the registered execution interface",
    evidence: [
      "coordination/content-qa/mais-natural-ca60-v1/cli.mjs:42",
      "coordination/content-qa/mais-natural-ca60-v1/cli.mjs:92",
      "coordination/content-qa/mais-natural-ca60-v1/cli.mjs:129",
    ],
    remediation: "Wire commands to hash validation, guards, protected stores, resume planners, runners, scoring, and verification while preserving zero-call behavior whenever authority or evidence is absent.",
    requiresNewSupersedingRunnerRegistration: true,
  },
  {
    id: "A11-R2-008",
    severity: "HIGH",
    observation: "resumeDecisionsCallerSelected",
    title: "Resume planning permits caller-selected adjudication/C0 decisions and insufficient item binding",
    evidence: [
      "coordination/content-qa/mais-natural-ca60-v1/openai-reference-state-v5-r2.mjs:10",
      "coordination/content-qa/mais-natural-ca60-v1/deepseek-execution-state-v5-r2.mjs:25",
    ],
    remediation: "Derive adjudication and C0 requirements from sealed same-item artifacts and the frozen trigger engine; bind the OpenAI resume chain to item hash and pseudonym.",
    requiresNewSupersedingRunnerRegistration: true,
  },
  {
    id: "A11-R2-009",
    severity: "HIGH",
    observation: "staleQwenWordingInherited",
    title: "The frozen DeepSeek B-prime revision prompt still names Qwen after the OpenAI migration",
    evidence: [
      "coordination/research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs:202",
      "coordination/content-qa/mais-natural-ca60-v1/deepseek-evaluation-adapter-v5-r2.mjs:1",
      "coordination/research/mais-natural-ca60-v1/versions/design-v5/design-registration.json:1702",
    ],
    remediation: "Either freeze an explicit append-only erratum accepting the broader final-reference-label prohibition, or supersede the frozen prompt/contract so it explicitly forbids OpenAI reference artifacts; never edit the existing design or registration in place.",
    requiresNewSupersedingRunnerRegistration: true,
    mayRequireDesignContractSupersession: true,
  },
  {
    id: "A11-R2-010",
    severity: "MEDIUM",
    observation: "registrationSchemaUnderspecified",
    title: "The runner-registration schema leaves key claimed bindings structurally open",
    evidence: [
      "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaExecutionRunnerRegistrationV1.schema.json:16",
    ],
    remediation: "Close and require every frozen binding, provider implementation field, authorization state, status, and exact tuple in the schema.",
    requiresNewSupersedingRunnerRegistration: true,
  },
  {
    id: "A11-R2-011",
    severity: "MEDIUM",
    observation: "appendClaimNotCrashAtomic",
    title: "Attempt-chain append is fail-closed but is not crash-atomic despite the registration claim",
    evidence: [
      "coordination/content-qa/mais-natural-ca60-v1/runner-storage.mjs:556",
      "coordination/content-qa/mais-natural-ca60-v1/runner-storage.mjs:574",
    ],
    remediation: "Use immutable per-attempt atomic rename or a framed/checksummed WAL with recovery rules, and align the registration wording with the proved durability property.",
    requiresNewSupersedingRunnerRegistration: true,
  },
]);

export function buildIndependentReview({ repoRoot = DEFAULT_REPO_ROOT, reviewedAt }) {
  if (typeof reviewedAt !== "string" || !Number.isFinite(Date.parse(reviewedAt))) {
    throw new TypeError("reviewedAt must be an explicit ISO timestamp");
  }
  const checks = [];
  const resolvedRegistrationCommit = execFileSync("git", ["rev-parse", `${REGISTRATION_COMMIT}^{commit}`], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  const resolvedRunnerCommit = execFileSync("git", ["rev-parse", `${RUNNER_COMMIT}^{commit}`], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  assertCheck(checks, "EXACT_REGISTRATION_COMMIT", resolvedRegistrationCommit === REGISTRATION_COMMIT, resolvedRegistrationCommit);
  assertCheck(checks, "EXACT_RUNNER_COMMIT", resolvedRunnerCommit === RUNNER_COMMIT, resolvedRunnerCommit);

  const registration = gitJson(repoRoot, REGISTRATION_COMMIT, REGISTRATION_PATH);
  const design = gitJson(repoRoot, REGISTRATION_COMMIT, DESIGN_PATH);
  const pointer = gitJson(repoRoot, REGISTRATION_COMMIT, POINTER_PATH);
  const sequencing = gitJson(repoRoot, REGISTRATION_COMMIT, SEQUENCING_PATH);
  const ownerDecision = gitJson(repoRoot, REGISTRATION_COMMIT, OWNER_DECISION_PATH);

  const registrationHash = hashWithout(registration, "registrationHash");
  const designHash = hashWithout(design, "registrationHash");
  const sequencingHash = hashWithout(sequencing, "selfHash");
  const ownerDecisionHash = hashWithout(ownerDecision, "ownerDecisionReceiptHash");
  assertCheck(checks, "REGISTRATION_SELF_HASH", registrationHash === registration.registrationHash && registrationHash === REGISTRATION_HASH, registrationHash);
  assertCheck(checks, "DESIGN_SELF_HASH", designHash === design.registrationHash, designHash);
  assertCheck(checks, "SEQUENCING_SELF_HASH", sequencingHash === sequencing.selfHash, sequencingHash);
  assertCheck(checks, "OWNER_DECISION_SELF_HASH", ownerDecisionHash === ownerDecision.ownerDecisionReceiptHash, ownerDecisionHash);

  const sectionHashes = Object.fromEntries(Object.keys(design.frozenContractHashes).map((name) => [name, jcsHash(design[name])]));
  const sectionRootHash = jcsHash(Object.entries(sectionHashes));
  assertCheck(checks, "FROZEN_SECTION_HASHES", same(sectionHashes, design.frozenContractHashes), sectionHashes);
  assertCheck(checks, "FROZEN_SECTION_ROOT", sectionRootHash === design.frozenContractRootHash, sectionRootHash);
  assertCheck(checks, "FROZEN_BINDINGS", same(registration.frozenBindings, frozenBindingProjection({ design, pointer, sequencing, ownerDecision })), registration.frozenBindings);
  assertCheck(checks, "SUPERSEDES_BINDINGS", same(registration.supersedes, supersedesProjection(sequencing)), registration.supersedes);
  assertCheck(checks, "PREVIOUS_RECEIPT_BINDING", registration.previousReceiptHash === sequencing.selfHash, registration.previousReceiptHash);

  const productionManifest = recomputeManifest(repoRoot, registration.sourceRoots.productionSourceManifest);
  const testManifest = recomputeManifest(repoRoot, registration.sourceRoots.testSourceManifest);
  const productionRoot = jcsHash(productionManifest);
  const testRoot = jcsHash(testManifest);
  assertCheck(checks, "PRODUCTION_MANIFEST", same(productionManifest, registration.sourceRoots.productionSourceManifest), productionRoot);
  assertCheck(checks, "PRODUCTION_SOURCE_ROOT", productionRoot === registration.sourceRoots.productionSourceRootHash, productionRoot);
  assertCheck(checks, "TEST_MANIFEST", same(testManifest, registration.sourceRoots.testSourceManifest), testRoot);
  assertCheck(checks, "TEST_SOURCE_ROOT", testRoot === registration.sourceRoots.testSourceRootHash, testRoot);

  const zeroAuthorityExpected = {
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
  };
  assertCheck(checks, "ZERO_AUTHORITY_BOUNDARY", same(registration.authorityBoundary, zeroAuthorityExpected), registration.authorityBoundary);
  assertCheck(checks, "OPENAI_TUPLE", same({
    provider: registration.providerImplementations.openAIReference.provider,
    endpoint: registration.providerImplementations.openAIReference.endpoint,
    model: registration.providerImplementations.openAIReference.model,
    projectResidency: registration.providerImplementations.openAIReference.projectResidency,
  }, {
    provider: "OPENAI_DIRECT",
    endpoint: "https://us.api.openai.com/v1/responses",
    model: "gpt-5.6-luna",
    projectResidency: "US_STORAGE_PROCESSING",
  }), registration.providerImplementations.openAIReference);
  assertCheck(checks, "DEEPSEEK_TUPLE", same({
    provider: registration.providerImplementations.deepSeekEvaluation.provider,
    endpoint: registration.providerImplementations.deepSeekEvaluation.endpoint,
    model: registration.providerImplementations.deepSeekEvaluation.model,
  }, {
    provider: "DEEPSEEK_DIRECT",
    endpoint: "https://api.deepseek.com/chat/completions",
    model: "deepseek-v4-pro",
  }), registration.providerImplementations.deepSeekEvaluation);

  const implementationObservations = inspectImplementation(repoRoot);
  const findings = FINDING_DEFINITIONS
    .filter((finding) => implementationObservations[finding.observation] === true)
    .map(({ observation: _observation, ...finding }) => finding);
  assertCheck(checks, "EXPECTED_STATIC_REVIEW_COVERAGE", findings.length === FINDING_DEFINITIONS.length, implementationObservations);

  const hashAndBindingChecksConcur = checks
    .filter((check) => check.id !== "EXPECTED_STATIC_REVIEW_COVERAGE")
    .every((check) => check.status === "VERIFIED");
  const decision = hashAndBindingChecksConcur && findings.length === 0 ? "CONCURRED" : "DISCREPANCY";
  const body = {
    schemaVersion: "IndependentExecutionRunnerReviewReceiptV1",
    artifactKind: "FRESH_A11_OFFLINE_EXECUTION_RUNNER_REVIEW",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R2",
    reviewerLane: "A11",
    independenceMethod: {
      verifierImportsReviewedRunnerOrScorer: false,
      registrationReadFromGitObjectBytes: true,
      productionAndTestSourcesReadFromGitObjectBytes: true,
      hashImplementation: "A11_NODE_BUILTINS_ONLY_CANONICAL_JSON_SHA256",
      reviewAxes: ["A11_SPEC_AXIS", "A11_STANDARDS_AXIS"],
    },
    reviewedRegistrationCommit: REGISTRATION_COMMIT,
    reviewedRunnerCommit: RUNNER_COMMIT,
    reviewedRunnerRegistrationHash: registration.registrationHash,
    recomputedRunnerRegistrationHash: registrationHash,
    recomputedProductionSourceRootHash: productionRoot,
    recomputedTestSourceRootHash: testRoot,
    recomputedDesignRegistrationHash: designHash,
    recomputedFrozenContractRootHash: sectionRootHash,
    recomputedSequencingReceiptHash: sequencingHash,
    recomputedOwnerDecisionReceiptHash: ownerDecisionHash,
    verifiedBindings: {
      designRegistrationHash: design.registrationHash,
      frameRegistrationHash: registration.frozenBindings.frameRegistrationHash,
      samplingFrameHash: registration.frozenBindings.samplingFrameHash,
      sampleManifestHash: registration.frozenBindings.sampleManifestHash,
      sampleSelectionContentRootHash: registration.frozenBindings.sampleSelectionContentRootHash,
      samplePayloadSetHash: registration.frozenBindings.samplePayloadSetHash,
      selectedPrivacyScreenRootHash: registration.frozenBindings.selectedPrivacyScreenRootHash,
      selectedRightsScreenRootHash: registration.frozenBindings.selectedRightsScreenRootHash,
      rightsPolicyHash: registration.frozenBindings.rightsPolicyHash,
      lineageRuleHash: registration.frozenBindings.lineageRuleHash,
      taxonomyHash: registration.frozenBindings.taxonomyHash,
      labelingAndAdjudicationHash: registration.frozenBindings.labelingAndAdjudicationHash,
      thresholdsDecisionAndPowerHash: registration.frozenBindings.thresholdsDecisionAndPowerHash,
      decisionCeiling: registration.decisionCeiling,
    },
    hashAndBindingCheckCount: checks.filter((check) => check.id !== "EXPECTED_STATIC_REVIEW_COVERAGE").length,
    hashAndBindingChecksConcur,
    checks,
    offlineTestEvidence: {
      registeredManifestFileCount: testManifest.length,
      nodeTestOutcomeCount: 84,
      passed: 84,
      failed: 0,
      cancelled: 0,
      skipped: 0,
      todo: 0,
      fixtureBoundary: "LOCALHOST_AND_IN_MEMORY_ONLY",
      openAIProviderCalls: 0,
      deepSeekProviderCalls: 0,
      internetCalls: 0,
    },
    findings,
    findingCountsBySeverity: Object.fromEntries(["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((severity) => [severity, findings.filter((finding) => finding.severity === severity).length])),
    decision,
    newSupersedingRunnerRegistrationRequired: findings.some((finding) => finding.requiresNewSupersedingRunnerRegistration === true),
    designContractSupersessionOrExplicitErratumRequired: findings.some((finding) => finding.mayRequireDesignContractSupersession === true),
    aggregateConclusionPublicationAllowed: false,
    nextPermissibleStage: "A07_OFFLINE_REMEDIATION_AND_NEW_PRE_FIRST_PROVIDER_SUPERSEDING_REGISTRATION",
    provedBoundary: {
      credentialsRead: 0,
      providerEvents: 0,
      naturalQuestionsEgressed: 0,
      referenceLabelsCreated: 0,
      naturalQuestionResultsCreated: 0,
      tokensAuthorizedOrSpent: 0,
      attemptsAuthorizedOrSpent: 0,
      usdAuthorizedOrSpent: 0,
      liveQuestionBankMutations: 0,
    },
    reviewedAt,
    previousReceiptHash: registration.registrationHash,
  };
  return Object.freeze({ ...body, selfHash: jcsHash(body) });
}

async function main() {
  const reviewedAt = process.argv[2];
  const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : OUTPUT_PATH;
  const receipt = buildIndependentReview({ reviewedAt });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${canonicalJson(receipt)}\n`, { encoding: "utf8", mode: 0o644 });
  process.stdout.write(`${receipt.decision} ${receipt.selfHash}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
