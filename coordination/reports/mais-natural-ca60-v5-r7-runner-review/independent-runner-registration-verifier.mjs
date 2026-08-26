#!/usr/bin/env node

/**
 * Independent A11 Git-object verifier for MAIS-NATURAL-CA60-V5-R7.
 *
 * Uses Node built-ins and immutable Git objects only. It deliberately does
 * not import the A07 registration builder, source-closure implementation,
 * runner, authorization guard, scorer, or decision engine.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const REG_COMMIT = "aa07d9b72cf06fbcf100ed0f6bf358fedd94222d";
const SOURCE_COMMIT = "237413734a41431e51c8a29ecef6628b67bbafb1";
const REG_HASH = "97b65940b0573064b4d1206e1f80dfb555c1a41e6c782e7439f9ec53df66b003";
const PROD_ROOT = "7657d0f6682da71d7935405dfb3dd5c899b2f96735042f9639431dc3900b1bf7";
const TEST_ROOT = "f5f3f9b88c4851d2adbb5f8792aaf7646d091b30db3697eb6f1e93be81b37c00";
const CLOSURE_ROOT = "d68081aabcb3b6a738117970607f9d9edf240ef3dd04fdbdfabd73b29a2b4866";
const EDGE_COUNT = 404;

const PRIOR_REG_COMMIT = "bd96d0bab3c26364c0cf1655be684cac23c991a8";
const PRIOR_SOURCE_COMMIT = "1cd532728567e346bb2ee07c3af700a9c8ac8d85";
const PRIOR_REG_HASH = "2e178ea6680974d358830a2b3f71e0ccbaa7827793b972bb2ae10fd2aaed994f";
const PRIOR_REVIEW_ORIGINAL_COMMIT = "5070a135ab4f02fb9d2fb33662c08abca46fca05";
const PRIOR_REVIEW_INTEGRATION_COMMIT = "881b2bf8c05d63634eac68786753dca1e0b21b79";
const PRIOR_REVIEW_HASH = "e86623510105b80736298206b26e94ddd5b7b727861d0212fd52cfde4592cf33";
const OWNER_AUTH_HASH = "8f9767f1bb087656d57ab7885f621ef449eff61ea89aaead8bd34bf27f30f74f";

const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const RESEARCH = "coordination/research/mais-natural-ca60-v1/";
const REG_PATH = `${RESEARCH}runner-registrations/v5-r7/runner-registration.json`;
const PRIOR_REG_PATH = `${RESEARCH}runner-registrations/v5-r6/runner-registration.json`;
const PRIOR_REVIEW_PATH = "coordination/reports/mais-natural-ca60-v5-r6-runner-review/independent-runner-review-receipt.json";
const DESIGN_PATH = `${RESEARCH}versions/design-v5/design-registration.json`;
const DESIGN_POINTER_PATH = `${RESEARCH}ACTIVE-DESIGN-REGISTRATION.json`;
const A07_LOG = "coordination/session-logs/2026-08-26-A07-mais-natural-ca60-v5-r7.md";

function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite JSON number");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (!value || typeof value !== "object") throw new TypeError(`unsupported JSON value ${typeof value}`);
  const keys = Object.keys(value).sort(cmp);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function jcsHash(value) { return sha256(Buffer.from(canonical(value), "utf8")); }
function hashWithout(value, field) {
  const clone = structuredClone(value);
  delete clone[field];
  return jcsHash(clone);
}

function safePath(p) {
  if (typeof p !== "string" || !p || path.isAbsolute(p) || p.includes("\0")
      || path.posix.normalize(p).split("/").includes("..")) throw new TypeError(`unsafe path ${p}`);
}

function git(args, encoding = null) {
  return execFileSync("git", args, {
    cwd: REPO,
    encoding,
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
function gitBytes(commit, p) { safePath(p); return Buffer.from(git(["show", `${commit}:${p}`])); }
function gitJson(commit, p) { return JSON.parse(gitBytes(commit, p).toString("utf8")); }
function gitExists(commit, p) { try { gitBytes(commit, p); return true; } catch { return false; } }

function manifest(commit, paths) {
  return [...new Set(paths)].sort(cmp).map((p) => {
    const bytes = gitBytes(commit, p);
    return { path: p, byteLength: bytes.byteLength, sha256: sha256(bytes) };
  });
}

function imports(text) {
  const result = new Set();
  for (const pattern of [
    /\bfrom\s*["']([^"']+)["']/gu,
    /\bimport\s*["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ]) for (const match of text.matchAll(pattern)) result.add(match[1]);
  return [...result].sort(cmp);
}

function resolveImport(commit, importer, specifier) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  if (base.startsWith("/") || base.split("/").includes("..")) throw new TypeError(`unsafe import ${specifier}`);
  const candidates = [base, `${base}.mjs`, `${base}.js`, `${base}.cjs`, `${base}.ts`, `${base}.tsx`,
    `${base}.json`, `${base}/index.mjs`, `${base}/index.js`, `${base}/index.ts`];
  const matches = candidates.filter((p) => gitExists(commit, p));
  if (matches.length !== 1) throw new TypeError(`${importer} -> ${specifier} resolved ${matches.length} ways`);
  return matches[0];
}

function collectClosure(commit, entryPoints) {
  const queue = [...new Set(entryPoints)].sort(cmp);
  const visited = new Set();
  const edges = [];
  const nonLiteralDynamicImports = [];
  const commonJsRequires = [];
  while (queue.length) {
    const source = queue.shift();
    if (visited.has(source)) continue;
    if (!gitExists(commit, source)) throw new TypeError(`missing closure path ${source}`);
    visited.add(source);
    if (!/\.(?:c?js|mjs|ts|tsx)$/u.test(source)) continue;
    const text = gitBytes(commit, source).toString("utf8");
    const literalDynamic = [...text.matchAll(/\bimport\s*\(\s*["'][^"']+["']\s*\)/gu)].length;
    if ([...text.matchAll(/\bimport\s*\(/gu)].length !== literalDynamic) nonLiteralDynamicImports.push(source);
    if (/\brequire\s*\(/u.test(text)) commonJsRequires.push(source);
    for (const specifier of imports(text)) {
      if (!specifier.startsWith(".")) continue;
      const resolved = resolveImport(commit, source, specifier);
      edges.push({ importer: source, specifier, resolved });
      if (!visited.has(resolved)) queue.push(resolved);
    }
    queue.sort(cmp);
  }
  const paths = [...visited].sort(cmp);
  edges.sort((a, b) => cmp(canonical(a), canonical(b)));
  return {
    paths,
    edges,
    importEdgeCount: edges.length,
    importClosureRootHash: jcsHash({ paths, edges }),
    nonLiteralDynamicImports: [...new Set(nonLiteralDynamicImports)].sort(cmp),
    commonJsRequires: [...new Set(commonJsRequires)].sort(cmp),
  };
}

function componentHash(sourceManifest, paths) {
  const expected = [...new Set(paths)].sort(cmp);
  const selected = sourceManifest.filter((row) => expected.includes(row.path));
  return selected.length === expected.length ? jcsHash(selected) : null;
}

function expectedKernels(sourceManifest) {
  const schemas = sourceManifest.map((row) => row.path)
    .filter((p) => p.startsWith(`${ROOT}schemas/`) && p.endsWith(".schema.json"));
  return {
    routeEvidenceAndCostHash: componentHash(sourceManifest, [`${ROOT}evidence-attestation-v5-r7.mjs`]),
    normalCanaryC0Hash: componentHash(sourceManifest, [`${ROOT}c0-state-v5-r7.mjs`, `${ROOT}semantic-dispatch-v5-r7.mjs`]),
    rawAuthoritativeReferenceHash: componentHash(sourceManifest, [`${ROOT}raw-authoritative-reference-v5-r7.mjs`]),
    atomicAttemptCustodyHash: componentHash(sourceManifest, [`${ROOT}attempt-transaction-v5-r7.mjs`]),
    attemptGraphHash: componentHash(sourceManifest, [`${ROOT}attempt-graph-v5-r7.mjs`]),
    completeScorerVerifierHash: componentHash(sourceManifest, [`${ROOT}scorer-verifier-v5-r7.mjs`]),
    freshReviewAdoptionHash: componentHash(sourceManifest, [`${ROOT}workflow-index-v5-r7.mjs`]),
    activityJournalHash: componentHash(sourceManifest, [`${ROOT}transition-journal-v5-r7.mjs`]),
    runtimeCliHash: componentHash(sourceManifest, [`${ROOT}runner-v5-r7-runtime.mjs`, `${ROOT}runner-v5-r7-cli.mjs`]),
    exactRegistrationLoaderHash: componentHash(sourceManifest, [`${ROOT}execution-evidence-v5-r7.mjs`]),
    fullTransitiveSourceClosureHash: componentHash(sourceManifest, [`${ROOT}source-closure-v5-r6.mjs`, ...schemas]),
  };
}

function check(list, id, condition, detail) {
  list.push({ id, status: condition ? "VERIFIED" : "MISMATCH", detail });
}

function run() {
  const checks = [];
  const registration = gitJson(REG_COMMIT, REG_PATH);
  const priorRegistration = gitJson(PRIOR_REG_COMMIT, PRIOR_REG_PATH);
  const priorReview = gitJson(PRIOR_REVIEW_ORIGINAL_COMMIT, PRIOR_REVIEW_PATH);
  const integratedReview = gitJson(PRIOR_REVIEW_INTEGRATION_COMMIT, PRIOR_REVIEW_PATH);
  const design = gitJson(SOURCE_COMMIT, DESIGN_PATH);
  const pointer = gitJson(SOURCE_COMMIT, DESIGN_POINTER_PATH);

  const parent = git(["rev-parse", `${REG_COMMIT}^`], "utf8").trim();
  const sourceParent = git(["rev-parse", `${SOURCE_COMMIT}^`], "utf8").trim();
  const mutations = git(["log", "--all", "--format=%H", "--", REG_PATH], "utf8").trim().split(/\s+/u).filter(Boolean);
  const added = git(["diff-tree", "--root", "--no-commit-id", "--name-status", "-r", REG_COMMIT], "utf8")
    .trim().split("\n").filter(Boolean);
  check(checks, "IMMUTABLE_SINGLE_ADD_REGISTRATION_PATH",
    mutations.length === 1 && mutations[0] === REG_COMMIT && added.length === 1 && added[0] === `A\t${REG_PATH}`,
    { mutations, added });
  check(checks, "EXACT_DIRECT_PARENT", parent === SOURCE_COMMIT, { expected: SOURCE_COMMIT, actual: parent });
  check(checks, "SOURCE_LINEAGE", sourceParent === PRIOR_REVIEW_INTEGRATION_COMMIT,
    { expected: PRIOR_REVIEW_INTEGRATION_COMMIT, actual: sourceParent });
  const recomputedSelfHash = hashWithout(registration, "selfHash");
  check(checks, "REGISTRATION_SELF_HASH", recomputedSelfHash === REG_HASH && registration.selfHash === REG_HASH,
    { expected: REG_HASH, actual: registration.selfHash, recomputed: recomputedSelfHash });

  const closure = collectClosure(SOURCE_COMMIT, registration.productionEntryPoints);
  const production = manifest(SOURCE_COMMIT, closure.paths);
  const tests = manifest(SOURCE_COMMIT, registration.testSourceManifest.map((row) => row.path));
  check(checks, "FULL_TRANSITIVE_IMPORT_CLOSURE",
    canonical(closure.paths) === canonical(registration.productionSourceManifest.map((row) => row.path))
      && closure.importEdgeCount === EDGE_COUNT && registration.productionImportEdgeCount === EDGE_COUNT
      && closure.importClosureRootHash === CLOSURE_ROOT && registration.importClosureRootHash === CLOSURE_ROOT
      && closure.nonLiteralDynamicImports.length === 0 && closure.commonJsRequires.length === 0,
    { pathCount: closure.paths.length, importEdgeCount: closure.importEdgeCount,
      root: closure.importClosureRootHash, nonLiteralDynamicImports: closure.nonLiteralDynamicImports,
      commonJsRequires: closure.commonJsRequires });
  check(checks, "PRODUCTION_GIT_OBJECT_MANIFEST",
    canonical(production) === canonical(registration.productionSourceManifest), { rowCount: production.length });
  check(checks, "PRODUCTION_SOURCE_ROOT", jcsHash(production) === PROD_ROOT
      && registration.productionSourceRootHash === PROD_ROOT,
    { expected: PROD_ROOT, recomputed: jcsHash(production) });
  check(checks, "TEST_GIT_OBJECT_MANIFEST", canonical(tests) === canonical(registration.testSourceManifest),
    { rowCount: tests.length });
  check(checks, "TEST_SOURCE_ROOT", jcsHash(tests) === TEST_ROOT && registration.testSourceRootHash === TEST_ROOT,
    { expected: TEST_ROOT, recomputed: jcsHash(tests) });
  const productionDrift = production.filter((row) => {
    const bytes = readFileSync(path.join(REPO, row.path));
    return bytes.byteLength !== row.byteLength || sha256(bytes) !== row.sha256;
  }).map((row) => row.path);
  const testDrift = tests.filter((row) => {
    const bytes = readFileSync(path.join(REPO, row.path));
    return bytes.byteLength !== row.byteLength || sha256(bytes) !== row.sha256;
  }).map((row) => row.path);
  check(checks, "CURRENT_REGISTERED_BYTES_MATCH", productionDrift.length === 0 && testDrift.length === 0,
    { productionDrift, testDrift });

  check(checks, "EXACT_V5_R6_SUPERSESSION",
    hashWithout(priorRegistration, "selfHash") === PRIOR_REG_HASH
      && priorRegistration.selfHash === PRIOR_REG_HASH
      && registration.supersedesRunnerRegistrationHash === PRIOR_REG_HASH
      && registration.supersededRunnerRegistrationCommit === PRIOR_REG_COMMIT
      && registration.supersededRunnerSourceCommit === PRIOR_SOURCE_COMMIT
      && registration.supersededProductionSourceRootHash === priorRegistration.productionSourceRootHash
      && registration.supersededTestSourceRootHash === priorRegistration.testSourceRootHash
      && registration.supersededImportClosureRootHash === priorRegistration.importClosureRootHash,
    { priorRegistrationHash: priorRegistration.selfHash });
  check(checks, "BOUND_V5_R6_DISCREPANCY_REVIEW",
    hashWithout(priorReview, "selfHash") === PRIOR_REVIEW_HASH && priorReview.decision === "DISCREPANCY"
      && canonical(priorReview) === canonical(integratedReview)
      && registration.discrepancyReviewHash === PRIOR_REVIEW_HASH
      && registration.discrepancyReviewOriginalCommit === PRIOR_REVIEW_ORIGINAL_COMMIT
      && registration.integratedDiscrepancyReviewCommit === PRIOR_REVIEW_INTEGRATION_COMMIT
      && registration.previousReceiptHash === PRIOR_REVIEW_HASH,
    { priorReviewDecision: priorReview.decision, priorReviewHash: priorReview.selfHash });
  check(checks, "OWNER_OFFLINE_IMPLEMENTATION_AUTHORIZATION",
    registration.ownerRunnerImplementationAuthorizationTextHash === OWNER_AUTH_HASH,
    registration.ownerRunnerImplementationAuthorizationTextHash);

  check(checks, "DESIGN_SELF_HASH_AND_POINTER",
    hashWithout(design, "registrationHash") === design.registrationHash
      && registration.designRegistrationHash === design.registrationHash
      && pointer.activeRegistrationHash === design.registrationHash
      && pointer.activeDesignId === "MAIS-NATURAL-CA60-V5",
    { design: design.registrationHash, pointer: pointer.activeRegistrationHash });
  const sections = Object.entries(design.frozenContractHashes).map(([name, expected]) =>
    ({ name, expected, actual: jcsHash(design[name]) }));
  check(checks, "FROZEN_DESIGN_SECTION_HASHES", sections.every((row) => row.expected === row.actual), sections);
  check(checks, "FROZEN_DESIGN_ROOT",
    jcsHash(Object.entries(design.frozenContractHashes)) === design.frozenContractRootHash,
    { expected: design.frozenContractRootHash, actual: jcsHash(Object.entries(design.frozenContractHashes)) });
  const frozen = ["designRegistrationHash", "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash",
    "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash", "privacyScreenHash",
    "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash", "rightsPolicyHash",
    "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash", "thresholdsDecisionAndPowerHash",
    "decisionCeiling", "providerContractErratumHash"];
  const frozenRows = frozen.map((field) => ({ field, prior: priorRegistration[field], current: registration[field] }));
  check(checks, "FROZEN_BINDINGS_UNCHANGED", frozenRows.every((row) => row.prior === row.current), frozenRows);

  const kernels = expectedKernels(production);
  check(checks, "CLOSURE_KERNEL_HASHES", canonical(kernels) === canonical(registration.closureKernels), kernels);
  const coreGuard = componentHash(production, [`${ROOT}activation-guard-v5-r7.mjs`,
    `${ROOT}semantic-dispatch-v5-r7.mjs`, `${ROOT}attempt-transaction-v5-r7.mjs`]);
  const openAI = registration.providerEntrypoints.openAI;
  const deepSeek = registration.providerEntrypoints.deepSeek;
  check(checks, "EXACT_PROVIDER_TUPLES",
    openAI.provider === "OPENAI_DIRECT" && openAI.model === "gpt-5.6-luna"
      && openAI.endpoint === "https://us.api.openai.com/v1/responses"
      && openAI.projectResidency === "US_STORAGE_PROCESSING" && openAI.coreGuardHash === coreGuard
      && deepSeek.provider === "DEEPSEEK_DIRECT" && deepSeek.model === "deepseek-v4-pro"
      && deepSeek.endpoint === "https://api.deepseek.com/chat/completions"
      && deepSeek.projectResidency === "UNRESOLVED" && deepSeek.coreGuardHash === coreGuard,
    { openAI, deepSeek, recomputedCoreGuardHash: coreGuard });
  const zero = Object.values(registration.authorizationState).every((value) => value === false || value === 0);
  check(checks, "ZERO_AUTHORITY_ACTIVITY", zero && openAI.providerCallsMade === 0 && deepSeek.providerCallsMade === 0,
    registration.authorizationState);
  check(checks, "CLAIM_DECISION_CEILINGS",
    registration.status === "OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R7_REVIEW_PROVIDER_EXECUTION_BLOCKED"
      && registration.claimCeiling === "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED"
      && registration.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE",
    { status: registration.status, claimCeiling: registration.claimCeiling, decisionCeiling: registration.decisionCeiling });
  const expectedIds = Array.from({ length: 11 }, (_, i) => `A11-R6-${String(i + 1).padStart(3, "0")}`);
  check(checks, "DECLARED_R6_REMEDIATION_SET", canonical([...registration.remediatedFindingIds].sort(cmp))
      === canonical(expectedIds), registration.remediatedFindingIds);
  check(checks, "SESSION_LOG_INCLUDED", registration.testSourceManifest.some((row) => row.path === A07_LOG)
      && gitExists(SOURCE_COMMIT, A07_LOG), A07_LOG);

  const mismatches = checks.filter((row) => row.status !== "VERIFIED");
  return {
    schemaVersion: "A11IndependentRunnerRegistrationVerificationV5",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R7",
    decision: mismatches.length ? "UNREVIEWABLE" : "VERIFIED_EXACT_OFFLINE_ARTIFACTS",
    checkCount: checks.length,
    verifiedCheckCount: checks.length - mismatches.length,
    mismatchCount: mismatches.length,
    registrationCommit: REG_COMMIT,
    runnerSourceCommit: SOURCE_COMMIT,
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
