#!/usr/bin/env node

/**
 * Independent A11 Git-object verifier for MAIS-NATURAL-CA60-V5-R6.
 *
 * This verifier intentionally uses Node built-ins and immutable Git objects
 * only. It does not import the A07 registration builder, source-closure code,
 * runner, authorization guard, scorer, or decision engine. It never reads
 * environment variables, credentials, protected natural-item artifacts, or
 * the network.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");

const REGISTRATION_COMMIT = "bd96d0bab3c26364c0cf1655be684cac23c991a8";
const RUNNER_SOURCE_COMMIT = "1cd532728567e346bb2ee07c3af700a9c8ac8d85";
const REGISTRATION_HASH = "2e178ea6680974d358830a2b3f71e0ccbaa7827793b972bb2ae10fd2aaed994f";
const PRODUCTION_ROOT = "4290a0ada241bef51af7682ddd2772d7643e5d59dc179f3f52bd0c9e3586363e";
const TEST_ROOT = "3975d9da7d61ef54f21e1e36fa82c31e86fa78b9f05dd0e1f1c091e72d45ac75";
const IMPORT_CLOSURE_ROOT = "affe8c375ccf44a8fbf1a6aef820ef771a8c19887c9158c8520e1c53ee606518";
const IMPORT_EDGE_COUNT = 308;

const PRIOR_REGISTRATION_COMMIT = "12d65e6d7bf3f4e7da2010b973df0d08fb3a3c4f";
const PRIOR_SOURCE_COMMIT = "440ee182e9841676495bc884ac4bf0eda7cf3985";
const PRIOR_REGISTRATION_HASH = "6c96a27da2ce36c69d4190db3b6a2fde59c430a250c85417ef2526b25da2bbce";
const PRIOR_REVIEW_COMMIT = "311bc2ea99595fd6a52c52cc21bb19f83ff11f47";
const PRIOR_REVIEW_INTEGRATION_COMMIT = "727e440a0897ae7b0caa4fff18853482a5af3b39";
const PRIOR_REVIEW_HASH = "e25f8212ae0d150d5a690f4f13942922752730d606ab85ebb730a6c780854b39";
const OWNER_AUTHORIZATION_TEXT_HASH = "8f9767f1bb087656d57ab7885f621ef449eff61ea89aaead8bd34bf27f30f74f";

const RESEARCH = "coordination/research/mais-natural-ca60-v1/";
const CORE = "coordination/content-qa/mais-natural-ca60-v1/";
const REGISTRATION_PATH = `${RESEARCH}runner-registrations/v5-r6/runner-registration.json`;
const PRIOR_REGISTRATION_PATH = `${RESEARCH}runner-registrations/v5-r5/runner-registration.json`;
const PRIOR_REVIEW_PATH = "coordination/reports/mais-natural-ca60-v5-r5-runner-review/independent-runner-review-receipt.json";
const DESIGN_PATH = `${RESEARCH}versions/design-v5/design-registration.json`;
const DESIGN_POINTER_PATH = `${RESEARCH}ACTIVE-DESIGN-REGISTRATION.json`;

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite JSON number");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (!value || typeof value !== "object") throw new TypeError(`unsupported JSON value: ${typeof value}`);
  const keys = Object.keys(value).sort(compare);
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

function safeGitPath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || path.isAbsolute(relativePath)
    || relativePath.includes("\0") || path.posix.normalize(relativePath).split("/").includes("..")) {
    throw new TypeError(`unsafe Git path: ${relativePath}`);
  }
}

function git(args, encoding = null) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding,
    maxBuffer: 128 * 1024 * 1024,
  });
}

function gitBytes(commit, relativePath) {
  safeGitPath(relativePath);
  return Buffer.from(git(["show", `${commit}:${relativePath}`], null));
}

function gitJson(commit, relativePath) {
  return JSON.parse(gitBytes(commit, relativePath).toString("utf8"));
}

function gitExists(commit, relativePath) {
  try {
    gitBytes(commit, relativePath);
    return true;
  } catch {
    return false;
  }
}

function manifestFromGit(commit, paths) {
  return [...paths].sort(compare).map((relativePath) => {
    const bytes = gitBytes(commit, relativePath);
    return { path: relativePath, byteLength: bytes.byteLength, sha256: sha256(bytes) };
  });
}

function importSpecifiers(text) {
  const values = new Set();
  for (const pattern of [
    /\bfrom\s*["']([^"']+)["']/gu,
    /\bimport\s*["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ]) {
    for (const match of text.matchAll(pattern)) values.add(match[1]);
  }
  return [...values].sort(compare);
}

function resolveImport(commit, importer, specifier) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  if (base.startsWith("/") || base.split("/").includes("..")) {
    throw new TypeError(`unsafe import ${specifier} from ${importer}`);
  }
  if (gitExists(commit, base)) return base;
  const candidates = [
    `${base}.mjs`,
    `${base}.js`,
    `${base}.cjs`,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.json`,
    `${base}/index.mjs`,
    `${base}/index.js`,
    `${base}/index.ts`,
  ];
  const matches = candidates.filter((candidate) => gitExists(commit, candidate));
  if (matches.length !== 1) {
    throw new TypeError(`relative import ${specifier} from ${importer} resolved to ${matches.length} paths`);
  }
  return matches[0];
}

function collectClosure(commit, entryPoints) {
  const queue = [...new Set(entryPoints)].sort(compare);
  const visited = new Set();
  const edges = [];
  const nonLiteralDynamicImportSites = [];
  const commonJsRequireSites = [];
  while (queue.length > 0) {
    const sourcePath = queue.shift();
    if (visited.has(sourcePath)) continue;
    if (!gitExists(commit, sourcePath)) throw new TypeError(`closure path absent: ${sourcePath}`);
    visited.add(sourcePath);
    if (!/\.(?:c?js|mjs|ts|tsx)$/u.test(sourcePath)) continue;
    const text = gitBytes(commit, sourcePath).toString("utf8");
    const literalDynamicCount = [...text.matchAll(/\bimport\s*\(\s*["'][^"']+["']\s*\)/gu)].length;
    const allDynamicCount = [...text.matchAll(/\bimport\s*\(/gu)].length;
    if (allDynamicCount !== literalDynamicCount) nonLiteralDynamicImportSites.push(sourcePath);
    if (/\brequire\s*\(/u.test(text)) commonJsRequireSites.push(sourcePath);
    for (const specifier of importSpecifiers(text)) {
      if (!specifier.startsWith(".")) continue;
      const resolved = resolveImport(commit, sourcePath, specifier);
      edges.push({ importer: sourcePath, specifier, resolved });
      if (!visited.has(resolved)) queue.push(resolved);
    }
    queue.sort(compare);
  }
  const paths = [...visited].sort(compare);
  const sortedEdges = edges.sort((left, right) => compare(canonical(left), canonical(right)));
  return {
    paths,
    edges: sortedEdges,
    importEdgeCount: sortedEdges.length,
    importClosureRootHash: jcsHash({ paths, edges: sortedEdges }),
    nonLiteralDynamicImportSites: [...new Set(nonLiteralDynamicImportSites)].sort(compare),
    commonJsRequireSites: [...new Set(commonJsRequireSites)].sort(compare),
  };
}

function componentHash(manifest, paths) {
  const expected = [...new Set(paths)].sort(compare);
  const selected = manifest.filter(({ path: sourcePath }) => expected.includes(sourcePath));
  return selected.length === expected.length ? jcsHash(selected) : null;
}

function check(checks, id, condition, details) {
  checks.push({ id, status: condition ? "VERIFIED" : "MISMATCH", details });
}

function run() {
  const checks = [];
  const registration = gitJson(REGISTRATION_COMMIT, REGISTRATION_PATH);
  const priorRegistration = gitJson(PRIOR_REGISTRATION_COMMIT, PRIOR_REGISTRATION_PATH);
  const priorReview = gitJson(PRIOR_REVIEW_COMMIT, PRIOR_REVIEW_PATH);
  const integratedPriorReview = gitJson(PRIOR_REVIEW_INTEGRATION_COMMIT, PRIOR_REVIEW_PATH);
  const design = gitJson(RUNNER_SOURCE_COMMIT, DESIGN_PATH);
  const designPointer = gitJson(RUNNER_SOURCE_COMMIT, DESIGN_POINTER_PATH);

  const parent = git(["rev-parse", `${REGISTRATION_COMMIT}^`], "utf8").trim();
  const registrationMutationCommits = git(["log", "--all", "--format=%H", "--", REGISTRATION_PATH], "utf8")
    .trim().split(/\s+/u).filter(Boolean);
  const registrationDiff = git(["diff-tree", "--root", "--no-commit-id", "--name-status", "-r", REGISTRATION_COMMIT], "utf8")
    .trim().split(/\n/u).filter(Boolean);

  const closure = collectClosure(RUNNER_SOURCE_COMMIT, registration.productionEntryPoints);
  const production = manifestFromGit(RUNNER_SOURCE_COMMIT, closure.paths);
  const tests = manifestFromGit(RUNNER_SOURCE_COMMIT,
    registration.testSourceManifest.map(({ path: sourcePath }) => sourcePath));
  const currentProductionDrift = production.filter((row) => {
    const bytes = readFileSync(path.join(REPO_ROOT, row.path));
    return bytes.byteLength !== row.byteLength || sha256(bytes) !== row.sha256;
  }).map(({ path: sourcePath }) => sourcePath);

  check(checks, "IMMUTABLE_SINGLE_ADD_REGISTRATION_PATH",
    registrationMutationCommits.length === 1 && registrationMutationCommits[0] === REGISTRATION_COMMIT
      && registrationDiff.length === 1 && registrationDiff[0] === `A\t${REGISTRATION_PATH}`,
    { registrationMutationCommits, registrationDiff });
  check(checks, "EXACT_DIRECT_PARENT", parent === RUNNER_SOURCE_COMMIT,
    { expected: RUNNER_SOURCE_COMMIT, actual: parent });
  check(checks, "REGISTRATION_SELF_HASH",
    hashWithout(registration, "selfHash") === REGISTRATION_HASH && registration.selfHash === REGISTRATION_HASH,
    { expected: REGISTRATION_HASH, actual: registration.selfHash, recomputed: hashWithout(registration, "selfHash") });
  check(checks, "FULL_TRANSITIVE_IMPORT_CLOSURE",
    canonical(closure.paths) === canonical(registration.productionSourceManifest.map(({ path: sourcePath }) => sourcePath))
      && closure.importEdgeCount === IMPORT_EDGE_COUNT
      && closure.importClosureRootHash === IMPORT_CLOSURE_ROOT
      && closure.nonLiteralDynamicImportSites.length === 0 && closure.commonJsRequireSites.length === 0,
    { pathCount: closure.paths.length, importEdgeCount: closure.importEdgeCount,
      importClosureRootHash: closure.importClosureRootHash,
      nonLiteralDynamicImportSites: closure.nonLiteralDynamicImportSites,
      commonJsRequireSites: closure.commonJsRequireSites });
  check(checks, "PRODUCTION_GIT_OBJECT_MANIFEST",
    canonical(production) === canonical(registration.productionSourceManifest), { rowCount: production.length });
  check(checks, "PRODUCTION_SOURCE_ROOT",
    jcsHash(production) === PRODUCTION_ROOT && registration.productionSourceRootHash === PRODUCTION_ROOT,
    { expected: PRODUCTION_ROOT, recomputed: jcsHash(production) });
  check(checks, "TEST_GIT_OBJECT_MANIFEST",
    canonical(tests) === canonical(registration.testSourceManifest), { rowCount: tests.length });
  check(checks, "TEST_SOURCE_ROOT",
    jcsHash(tests) === TEST_ROOT && registration.testSourceRootHash === TEST_ROOT,
    { expected: TEST_ROOT, recomputed: jcsHash(tests) });
  check(checks, "CURRENT_PRODUCTION_BYTES_MATCH_REVIEWED_SOURCE",
    currentProductionDrift.length === 0, { driftPaths: currentProductionDrift });

  check(checks, "EXACT_V5_R5_SUPERSESSION",
    hashWithout(priorRegistration, "selfHash") === PRIOR_REGISTRATION_HASH
      && priorRegistration.selfHash === PRIOR_REGISTRATION_HASH
      && registration.supersedesRunnerRegistrationHash === PRIOR_REGISTRATION_HASH
      && registration.supersededRunnerRegistrationCommit === PRIOR_REGISTRATION_COMMIT
      && registration.supersededRunnerSourceCommit === PRIOR_SOURCE_COMMIT,
    { priorRegistrationHash: priorRegistration.selfHash });
  check(checks, "BOUND_V5_R5_DISCREPANCY_REVIEW",
    hashWithout(priorReview, "selfHash") === PRIOR_REVIEW_HASH
      && priorReview.selfHash === PRIOR_REVIEW_HASH && priorReview.decision === "DISCREPANCY"
      && canonical(priorReview) === canonical(integratedPriorReview)
      && registration.discrepancyReviewHash === PRIOR_REVIEW_HASH
      && registration.previousReceiptHash === PRIOR_REVIEW_HASH
      && registration.discrepancyReviewCommit === PRIOR_REVIEW_COMMIT
      && registration.integratedDiscrepancyReviewCommit === PRIOR_REVIEW_INTEGRATION_COMMIT,
    { priorReviewHash: priorReview.selfHash, priorReviewDecision: priorReview.decision });
  check(checks, "OWNER_OFFLINE_IMPLEMENTATION_AUTHORIZATION",
    registration.ownerRunnerImplementationAuthorizationTextHash === OWNER_AUTHORIZATION_TEXT_HASH,
    registration.ownerRunnerImplementationAuthorizationTextHash);

  check(checks, "DESIGN_SELF_HASH_AND_POINTER",
    hashWithout(design, "registrationHash") === design.registrationHash
      && registration.designRegistrationHash === design.registrationHash
      && designPointer.activeRegistrationHash === design.registrationHash
      && designPointer.activeDesignId === "MAIS-NATURAL-CA60-V5",
    { designRegistrationHash: design.registrationHash, pointer: designPointer.activeRegistrationHash });
  const designSections = Object.entries(design.frozenContractHashes).map(([name, expected]) => ({
    name,
    expected,
    actual: jcsHash(design[name]),
  }));
  check(checks, "FROZEN_DESIGN_SECTION_HASHES",
    designSections.every(({ expected, actual }) => expected === actual), designSections);
  check(checks, "FROZEN_DESIGN_ROOT",
    jcsHash(Object.entries(design.frozenContractHashes)) === design.frozenContractRootHash,
    { expected: design.frozenContractRootHash,
      actual: jcsHash(Object.entries(design.frozenContractHashes)) });

  const frozenFields = [
    "designRegistrationHash", "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash",
    "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash", "privacyScreenHash",
    "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash", "rightsPolicyHash",
    "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash", "thresholdsDecisionAndPowerHash",
    "decisionCeiling", "providerContractErratumHash",
  ];
  const frozenBindingComparison = frozenFields.map((field) => ({
    field,
    prior: priorRegistration[field],
    current: registration[field],
  }));
  check(checks, "FROZEN_FRAME_SAMPLE_RIGHTS_PRIVACY_TAXONOMY_THRESHOLD_BINDINGS",
    frozenBindingComparison.every(({ prior, current }) => prior === current), frozenBindingComparison);

  const schemaPaths = production.map(({ path: sourcePath }) => sourcePath)
    .filter((sourcePath) => sourcePath.startsWith(`${CORE}schemas/`) && sourcePath.endsWith(".schema.json"));
  const expectedKernels = {
    resolvedDeepSeekRequestHash: componentHash(production,
      [`${CORE}provider-request-v5-r6.mjs`, `${CORE}activation-guard-v5-r6.mjs`]),
    terminalC0AndScoreHash: componentHash(production,
      [`${CORE}c0-terminal-v5-r6.mjs`, `${CORE}scorer-v5-r6.mjs`]),
    routeEvidenceCustodyHash: componentHash(production, [`${CORE}route-evidence-custody-v5-r6.mjs`]),
    versionedReviewMigrationHash: componentHash(production, [`${CORE}workflow-index-v5-r6.mjs`]),
    exactRegistrationLoaderHash: componentHash(production, [`${CORE}execution-evidence-v5-r6.mjs`]),
    fullTransitiveSourceClosureHash: componentHash(production, [`${CORE}source-closure-v5-r6.mjs`, ...schemaPaths]),
    rawResponseCustodyHash: componentHash(production,
      [`${CORE}raw-response-custody-v5-r6.mjs`, `${CORE}guarded-provider-attempt-v5-r6.mjs`]),
    transitionJournalHash: componentHash(production,
      [`${CORE}transition-journal-v5-r6.mjs`, `${CORE}runner-v5-r6-runtime.mjs`, `${CORE}runner-v5-r6-cli.mjs`]),
    completeAttemptGraphIntegrityHash: componentHash(production, [`${CORE}scorer-v5-r6.mjs`]),
    runtimeCliHash: componentHash(production,
      [`${CORE}runner-v5-r6-runtime.mjs`, `${CORE}runner-v5-r6-cli.mjs`]),
  };
  check(checks, "CLOSURE_KERNEL_HASHES",
    canonical(expectedKernels) === canonical(registration.closureKernels), expectedKernels);

  const guardHash = componentHash(production, [
    `${CORE}activation-guard-v5-r6.mjs`,
    `${CORE}guarded-provider-attempt-v5-r6.mjs`,
    `${CORE}provider-request-v5-r6.mjs`,
  ]);
  const openAI = registration.providerEntrypoints.openAI;
  const deepSeek = registration.providerEntrypoints.deepSeek;
  check(checks, "EXACT_PROVIDER_ENTRYPOINT_TUPLES",
    openAI.provider === "OPENAI_DIRECT" && openAI.model === "gpt-5.6-luna"
      && openAI.endpoint === "https://us.api.openai.com/v1/responses"
      && openAI.projectResidency === "US_STORAGE_PROCESSING" && openAI.coreGuardHash === guardHash
      && deepSeek.provider === "DEEPSEEK_DIRECT" && deepSeek.model === "deepseek-v4-pro"
      && deepSeek.endpoint === "https://api.deepseek.com/chat/completions"
      && deepSeek.projectResidency === "UNRESOLVED" && deepSeek.coreGuardHash === guardHash,
    { openAI, deepSeek, recomputedCoreGuardHash: guardHash });
  const zeroAuthority = Object.entries(registration.authorizationState).every(([key, value]) =>
    key.endsWith("Authorized") || key.endsWith("Created") ? value === false : value === 0);
  check(checks, "ZERO_AUTHORITY_AND_ACTIVITY",
    zeroAuthority && openAI.providerCallsMade === 0 && deepSeek.providerCallsMade === 0,
    registration.authorizationState);
  check(checks, "CLAIM_AND_DECISION_CEILINGS",
    registration.status === "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R6_REVIEW_PROVIDER_EXECUTION_BLOCKED"
      && registration.claimCeiling === "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED"
      && registration.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE",
    { status: registration.status, claimCeiling: registration.claimCeiling,
      decisionCeiling: registration.decisionCeiling });

  const mismatches = checks.filter(({ status }) => status !== "VERIFIED");
  return {
    schemaVersion: "A11IndependentRunnerRegistrationVerificationV3",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R6",
    decision: mismatches.length === 0 ? "VERIFIED_EXACT_OFFLINE_ARTIFACTS" : "UNREVIEWABLE",
    checkCount: checks.length,
    verifiedCheckCount: checks.length - mismatches.length,
    mismatchCount: mismatches.length,
    registrationCommit: REGISTRATION_COMMIT,
    runnerSourceCommit: RUNNER_SOURCE_COMMIT,
    registrationHash: registration.selfHash,
    productionSourceRootHash: jcsHash(production),
    testSourceRootHash: jcsHash(tests),
    importClosureRootHash: closure.importClosureRootHash,
    productionSourcePathCount: production.length,
    testSourcePathCount: tests.length,
    importEdgeCount: closure.importEdgeCount,
    checks,
    provedBoundary: {
      credentialFilesOrValuesRead: 0,
      environmentSecretValuesRead: 0,
      providerCalls: 0,
      networkRequests: 0,
      protectedNaturalQuestionBodiesRead: 0,
      protectedLocalArtifactsRead: 0,
      naturalQuestionsEgressed: 0,
      tokensAuthorizedOrSpent: 0,
      attemptsAuthorizedOrSpent: 0,
      usdAuthorizedOrSpent: 0,
    },
  };
}

process.stdout.write(`${JSON.stringify(run(), null, 2)}\n`);
