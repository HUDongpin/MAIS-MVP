#!/usr/bin/env node

/**
 * Independent A11 Git-object verifier for MAIS-NATURAL-CA60-V5-R5.
 *
 * Boundary: Node built-ins and immutable Git objects only. This file does not
 * import the A07 registration builder, runner, authorization guard, scorer, or
 * decision engine. It never reads environment variables, credentials,
 * protected natural-item artifacts, or the network.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");

const REGISTRATION_COMMIT = "12d65e6d7bf3f4e7da2010b973df0d08fb3a3c4f";
const RUNNER_SOURCE_COMMIT = "440ee182e9841676495bc884ac4bf0eda7cf3985";
const REGISTRATION_HASH = "6c96a27da2ce36c69d4190db3b6a2fde59c430a250c85417ef2526b25da2bbce";
const PRODUCTION_ROOT = "ffe4c963bf30a7259dd6804d8ee5327e57e6f6a1d479ab0c83642f4141113ec5";
const TEST_ROOT = "a40436909a6779154f020f828a45ecfb0d9bd86e02bcee6f8ddffecd89268a72";
const BASE_REGISTRATION_COMMIT = "6ded6504318c044ddec4b262bb053143a2aec802";
const BASE_SOURCE_COMMIT = "63fc224c0b67d6b26e5713938f33ccda6fe998b1";
const BASE_REGISTRATION_HASH = "2dd4b0e17d577f085aee33f9ada3a2de0f7db79b02b32524e9d6a05858a61dc6";
const BASE_REVIEW_COMMIT = "2bfd5ba703ecf1509a3ac47430fe6f06b80077f7";
const BASE_REVIEW_HASH = "32a59ad2dd12a80cf772acb1be1110683f5b56d718c66681426eef0c739e6abc";
const OWNER_AUTHORIZATION_TEXT_HASH = "8f9767f1bb087656d57ab7885f621ef449eff61ea89aaead8bd34bf27f30f74f";

const RESEARCH = "coordination/research/mais-natural-ca60-v1/";
const CORE = "coordination/content-qa/mais-natural-ca60-v1/";
const REGISTRATION_PATH = `${RESEARCH}runner-registrations/v5-r5/runner-registration.json`;
const BASE_REGISTRATION_PATH = `${RESEARCH}runner-registrations/v5-r4/runner-registration.json`;
const BASE_REVIEW_PATH = "coordination/reports/mais-natural-ca60-v5-r4-runner-review/independent-runner-review-receipt.json";
const DESIGN_PATH = `${RESEARCH}versions/design-v5/design-registration.json`;
const DESIGN_POINTER_PATH = `${RESEARCH}ACTIVE-DESIGN-REGISTRATION.json`;
const SEQUENCING_PATH = `${RESEARCH}authorization-requests/2026-08-26-provider-authorization-sequencing.json`;
const OWNER_DECISION_PATH = `${RESEARCH}owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json`;

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite JSON number");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (!value || typeof value !== "object") throw new TypeError(`unsupported JSON value: ${typeof value}`);
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
function safeGitPath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || path.isAbsolute(relativePath)
    || relativePath.includes("\0") || path.normalize(relativePath).split(path.sep).includes("..")) {
    throw new TypeError(`unsafe Git path: ${relativePath}`);
  }
}
function gitBytes(commit, relativePath) {
  safeGitPath(relativePath);
  return execFileSync("git", ["show", `${commit}:${relativePath}`], {
    cwd: REPO_ROOT,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
}
function gitJson(commit, relativePath) { return JSON.parse(gitBytes(commit, relativePath).toString("utf8")); }
function gitExists(commit, relativePath) {
  try { gitBytes(commit, relativePath); return true; } catch { return false; }
}
function manifestFromGit(commit, rows) {
  return rows.map(({ path: relativePath }) => {
    const bytes = gitBytes(commit, relativePath);
    return { path: relativePath, byteLength: bytes.byteLength, sha256: sha256(bytes) };
  });
}
function componentHash(manifest, paths) {
  const wanted = [...new Set(paths)].sort();
  const selected = manifest.filter(({ path: relativePath }) => wanted.includes(relativePath));
  return selected.length === wanted.length ? jcsHash(selected) : null;
}
function check(checks, id, condition, details) {
  checks.push({ id, status: condition ? "VERIFIED" : "MISMATCH", details });
}

function importSpecifiers(text) {
  const specs = new Set();
  for (const pattern of [
    /\bfrom\s*["']([^"']+)["']/gu,
    /\bimport\s*["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ]) {
    for (const match of text.matchAll(pattern)) specs.add(match[1]);
  }
  return [...specs];
}

function resolveRelativeImport(commit, importer, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  if (base.split("/").includes("..") || base.startsWith("/")) throw new TypeError(`unsafe import from ${importer}`);
  for (const candidate of [base, `${base}.mjs`, `${base}.js`, `${base}.json`, `${base}/index.mjs`, `${base}/index.js`]) {
    if (gitExists(commit, candidate)) return candidate;
  }
  return `UNRESOLVED:${base}`;
}

function computeImportClosure({ registration, baseRegistration }) {
  const r5Rows = new Map(registration.productionSourceManifest.map((row) => [row.path, row]));
  const baseRows = new Map(baseRegistration.productionSourceManifest.map((row) => [row.path, row]));
  const explicitArtifacts = new Set([BASE_REGISTRATION_PATH]);
  const queue = [...r5Rows.keys()].filter((relativePath) => /\.(?:mjs|js)$/u.test(relativePath));
  const visited = new Set();
  const edges = [];
  const missing = [];
  const compatibilityCovered = new Set();
  const compatibilityDrift = [];
  while (queue.length > 0) {
    const importer = queue.shift();
    if (visited.has(importer)) continue;
    visited.add(importer);
    const text = gitBytes(RUNNER_SOURCE_COMMIT, importer).toString("utf8");
    for (const specifier of importSpecifiers(text)) {
      if (!specifier.startsWith(".")) continue;
      const resolved = resolveRelativeImport(RUNNER_SOURCE_COMMIT, importer, specifier);
      edges.push({ importer, specifier, resolved });
      if (resolved.startsWith("UNRESOLVED:")) {
        missing.push({ importer, specifier, reason: "UNRESOLVED_IMPORT" });
        continue;
      }
      if (r5Rows.has(resolved)) {
        if (/\.(?:mjs|js)$/u.test(resolved)) queue.push(resolved);
        continue;
      }
      if (baseRows.has(resolved)) {
        compatibilityCovered.add(resolved);
        const row = baseRows.get(resolved);
        const current = gitBytes(RUNNER_SOURCE_COMMIT, resolved);
        if (current.byteLength !== row.byteLength || sha256(current) !== row.sha256) {
          compatibilityDrift.push(resolved);
        }
        if (/\.(?:mjs|js)$/u.test(resolved)) queue.push(resolved);
        continue;
      }
      if (explicitArtifacts.has(resolved)) continue;
      missing.push({ importer, specifier, resolved, reason: "NOT_IN_R5_OR_COMPATIBILITY_MANIFEST" });
    }
  }
  return {
    visitedModuleCount: visited.size,
    relativeImportEdgeCount: edges.length,
    compatibilityCoveredPaths: [...compatibilityCovered].sort(),
    compatibilityDrift: [...new Set(compatibilityDrift)].sort(),
    missing,
  };
}

function run() {
  const checks = [];
  const registration = gitJson(REGISTRATION_COMMIT, REGISTRATION_PATH);
  const baseRegistration = gitJson(BASE_REGISTRATION_COMMIT, BASE_REGISTRATION_PATH);
  const baseReview = gitJson(BASE_REVIEW_COMMIT, BASE_REVIEW_PATH);
  const design = gitJson(RUNNER_SOURCE_COMMIT, DESIGN_PATH);
  const pointer = gitJson(RUNNER_SOURCE_COMMIT, DESIGN_POINTER_PATH);
  const sequencing = gitJson(RUNNER_SOURCE_COMMIT, SEQUENCING_PATH);
  const ownerDecision = gitJson(RUNNER_SOURCE_COMMIT, OWNER_DECISION_PATH);
  const parent = execFileSync("git", ["rev-parse", `${REGISTRATION_COMMIT}^`], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();

  const production = manifestFromGit(RUNNER_SOURCE_COMMIT, registration.productionSourceManifest);
  const tests = manifestFromGit(RUNNER_SOURCE_COMMIT, registration.testSourceManifest);
  const baseProduction = manifestFromGit(BASE_SOURCE_COMMIT, baseRegistration.productionSourceManifest);
  const baseTests = manifestFromGit(BASE_SOURCE_COMMIT, baseRegistration.testSourceManifest);
  const importClosure = computeImportClosure({ registration, baseRegistration });

  check(checks, "EXACT_REGISTRATION_COMMIT_PARENT", parent === RUNNER_SOURCE_COMMIT,
    { actual: parent, expected: RUNNER_SOURCE_COMMIT });
  check(checks, "REGISTRATION_SELF_HASH",
    hashWithout(registration, "selfHash") === registration.selfHash && registration.selfHash === REGISTRATION_HASH,
    registration.selfHash);
  check(checks, "R5_PRODUCTION_GIT_OBJECT_MANIFEST", canonical(production) === canonical(registration.productionSourceManifest),
    { count: production.length });
  check(checks, "R5_PRODUCTION_ROOT", jcsHash(production) === registration.productionSourceRootHash
    && registration.productionSourceRootHash === PRODUCTION_ROOT, jcsHash(production));
  check(checks, "R5_TEST_GIT_OBJECT_MANIFEST", canonical(tests) === canonical(registration.testSourceManifest),
    { count: tests.length });
  check(checks, "R5_TEST_ROOT", jcsHash(tests) === registration.testSourceRootHash
    && registration.testSourceRootHash === TEST_ROOT, jcsHash(tests));

  check(checks, "BASE_REGISTRATION_SELF_HASH", hashWithout(baseRegistration, "selfHash") === baseRegistration.selfHash
    && baseRegistration.selfHash === BASE_REGISTRATION_HASH, baseRegistration.selfHash);
  check(checks, "BASE_PRODUCTION_GIT_OBJECT_MANIFEST", canonical(baseProduction) === canonical(baseRegistration.productionSourceManifest),
    { count: baseProduction.length, root: jcsHash(baseProduction) });
  check(checks, "BASE_TEST_GIT_OBJECT_MANIFEST", canonical(baseTests) === canonical(baseRegistration.testSourceManifest),
    { count: baseTests.length, root: jcsHash(baseTests) });
  check(checks, "BASE_ROOT_BINDINGS", registration.compatibilityBaseProductionSourceRootHash === jcsHash(baseProduction)
    && registration.compatibilityBaseTestSourceRootHash === jcsHash(baseTests)
    && registration.compatibilityBaseSourceCommit === BASE_SOURCE_COMMIT,
  { productionRoot: jcsHash(baseProduction), testRoot: jcsHash(baseTests) });
  check(checks, "IMPORT_CLOSURE_CURRENT_BYTES_MATCH_COMPATIBILITY_ROOT",
    importClosure.missing.length === 0 && importClosure.compatibilityDrift.length === 0, importClosure);

  check(checks, "DESIGN_SELF_HASH", hashWithout(design, "registrationHash") === design.registrationHash
    && registration.designRegistrationHash === design.registrationHash, design.registrationHash);
  const designSections = Object.entries(design.frozenContractHashes).map(([name, expected]) => ({
    name,
    expected,
    actual: jcsHash(design[name]),
  }));
  check(checks, "FROZEN_DESIGN_SECTION_HASHES", designSections.every(({ expected, actual }) => expected === actual), designSections);
  check(checks, "FROZEN_DESIGN_ROOT", jcsHash(Object.entries(design.frozenContractHashes)) === design.frozenContractRootHash,
    design.frozenContractRootHash);
  check(checks, "ACTIVE_DESIGN_POINTER", pointer.activeRegistrationHash === design.registrationHash
    && pointer.activeDesignId === "MAIS-NATURAL-CA60-V5", pointer.activeRegistrationHash);
  check(checks, "SEQUENCING_SELF_HASH", hashWithout(sequencing, "selfHash") === sequencing.selfHash
    && sequencing.registrationHash === design.registrationHash, sequencing.selfHash);
  check(checks, "OWNER_DECISION_SELF_HASH", hashWithout(ownerDecision, "ownerDecisionReceiptHash") === ownerDecision.ownerDecisionReceiptHash,
    ownerDecision.ownerDecisionReceiptHash);

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
    ownerDecisionRequestHash: ownerDecision.ownerDecisionRequestHash,
    ownerDecisionReceiptHash: ownerDecision.ownerDecisionReceiptHash,
    rightsPolicyHash: ownerDecision.rightsPolicyHash,
    lineageRuleHash: ownerDecision.lineageRuleHash,
    taxonomyHash: design.frozenContractHashes.taxonomy,
    labelingAndAdjudicationHash: design.frozenContractHashes.labeling,
    thresholdsDecisionAndPowerHash: design.frozenContractHashes.analysis,
    decisionCeiling: design.scope.decisionCeiling,
  };
  check(checks, "FROZEN_FRAME_SAMPLE_RIGHTS_PRIVACY_METHOD_BINDINGS",
    Object.entries(frozenBindings).every(([key, value]) => registration[key] === value), frozenBindings);

  check(checks, "SUPERSEDES_EXACT_R4_REGISTRATION", registration.supersedesRunnerRegistrationHash === baseRegistration.selfHash
    && registration.supersededRunnerRegistrationCommit === BASE_REGISTRATION_COMMIT, baseRegistration.selfHash);
  check(checks, "BOUND_R4_DISCREPANCY_REVIEW", hashWithout(baseReview, "selfHash") === baseReview.selfHash
    && baseReview.selfHash === BASE_REVIEW_HASH && registration.discrepancyReviewHash === baseReview.selfHash
    && registration.previousReceiptHash === baseReview.selfHash && registration.discrepancyReviewCommit === BASE_REVIEW_COMMIT,
  baseReview.selfHash);
  check(checks, "OWNER_OFFLINE_IMPLEMENTATION_AUTHORIZATION",
    registration.ownerRunnerImplementationAuthorizationTextHash === OWNER_AUTHORIZATION_TEXT_HASH,
  registration.ownerRunnerImplementationAuthorizationTextHash);

  const schemaPaths = registration.productionSourceManifest.map(({ path: relativePath }) => relativePath)
    .filter((relativePath) => relativePath.startsWith(`${CORE}schemas/`) && /V\d+\.schema\.json$/u.test(relativePath));
  const expectedComponents = {
    stateBoundDispatchHash: componentHash(production, [`${CORE}state-bound-dispatch-v5-r5.mjs`, `${CORE}activation-guard-v5-r5.mjs`]),
    authenticatedRouteEvidenceHash: componentHash(production, [`${CORE}route-authorization-v5-r5.mjs`]),
    inventoryReconstructionHash: componentHash(production, [`${CORE}execution-evidence-v5-r5.mjs`]),
    costPreviewHash: componentHash(production, [`${CORE}route-authorization-v5-r5.mjs`]),
    executionIntegrityHash: componentHash(production, [`${CORE}scorer-v5-r5.mjs`]),
    recoveryHash: componentHash(production, [`${CORE}recovery-v5-r5.mjs`]),
    workflowIndexHash: componentHash(production, [`${CORE}workflow-index-v5-r5.mjs`]),
    schemaValidatorHash: componentHash(production, [`${CORE}schema-contract-v5-r5.mjs`, ...schemaPaths]),
    referenceAgreementHash: componentHash(production, [`${CORE}reference-agreement-v5-r5.mjs`, `${CORE}reference-label-seal-v5-r5.mjs`]),
    c0TriggerHash: componentHash(production, [`${CORE}c0-trigger-v5-r5.mjs`]),
    guardedTransportHash: componentHash(production, [`${CORE}guarded-provider-attempt-v5-r5.mjs`]),
    atomicLedgerHash: componentHash(production, [`${CORE}atomic-execution-ledger-v5-r5.mjs`, `${CORE}recovery-v5-r5.mjs`]),
    nativeScoringAndVerificationHash: componentHash(production, [`${CORE}scorer-v5-r5.mjs`, `${CORE}verification-publication-v5-r5.mjs`]),
    runtimeCliHash: componentHash(production, [`${CORE}runner-v5-r5-runtime.mjs`, `${CORE}runner-v5-r5-cli.mjs`]),
  };
  check(checks, "CLOSURE_KERNEL_HASHES", Object.entries(expectedComponents)
    .every(([field, value]) => value !== null && registration.closureKernels[field] === value), expectedComponents);
  const coreGuardHash = componentHash(production, [
    `${CORE}activation-guard-v5-r5.mjs`,
    `${CORE}state-bound-dispatch-v5-r5.mjs`,
    `${CORE}guarded-provider-attempt-v5-r5.mjs`,
  ]);
  const openAI = registration.providerEntrypoints.openAI;
  const deepSeek = registration.providerEntrypoints.deepSeek;
  check(checks, "EXACT_PROVIDER_ENTRYPOINT_TUPLES",
    openAI.provider === "OPENAI_DIRECT" && openAI.model === "gpt-5.6-luna"
      && openAI.endpoint === "https://us.api.openai.com/v1/responses"
      && openAI.projectResidency === "US_STORAGE_PROCESSING" && openAI.coreGuardHash === coreGuardHash
      && deepSeek.provider === "DEEPSEEK_DIRECT" && deepSeek.model === "deepseek-v4-pro"
      && deepSeek.endpoint === "https://api.deepseek.com/chat/completions"
      && deepSeek.projectResidency === "UNRESOLVED" && deepSeek.coreGuardHash === coreGuardHash,
  { openAI, deepSeek });
  const authority = registration.authorizationState;
  const zeroAuthority = Object.entries(authority).every(([key, value]) =>
    key.endsWith("Authorized") || key.endsWith("Created") ? value === false : value === 0);
  check(checks, "ZERO_AUTHORITY_AND_ACTIVITY", zeroAuthority
    && openAI.providerCallsMade === 0 && deepSeek.providerCallsMade === 0, authority);
  check(checks, "CLAIM_AND_DECISION_CEILINGS", registration.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE"
    && registration.status === "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R5_REVIEW_PROVIDER_EXECUTION_BLOCKED"
    && registration.claimCeiling === "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
  { decisionCeiling: registration.decisionCeiling, status: registration.status, claimCeiling: registration.claimCeiling });

  const mismatches = checks.filter(({ status }) => status !== "VERIFIED");
  return {
    schemaVersion: "A11IndependentRunnerRegistrationVerificationV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R5",
    decision: mismatches.length === 0 ? "VERIFIED_EXACT_OFFLINE_ARTIFACTS" : "UNREVIEWABLE",
    checkCount: checks.length,
    verifiedCheckCount: checks.length - mismatches.length,
    mismatchCount: mismatches.length,
    registrationCommit: REGISTRATION_COMMIT,
    runnerSourceCommit: RUNNER_SOURCE_COMMIT,
    registrationHash: registration.selfHash,
    productionSourceRootHash: jcsHash(production),
    testSourceRootHash: jcsHash(tests),
    compatibilityProductionSourceRootHash: jcsHash(baseProduction),
    compatibilityTestSourceRootHash: jcsHash(baseTests),
    importClosure,
    checks,
    provedBoundary: {
      credentialFilesOrValuesRead: 0,
      environmentSecretValuesRead: 0,
      providerCalls: 0,
      networkRequests: 0,
      protectedNaturalQuestionBodiesRead: 0,
      naturalQuestionsEgressed: 0,
      tokensAuthorizedOrSpent: 0,
      attemptsAuthorizedOrSpent: 0,
      usdAuthorizedOrSpent: 0,
    },
  };
}

process.stdout.write(`${JSON.stringify(run(), null, 2)}\n`);
