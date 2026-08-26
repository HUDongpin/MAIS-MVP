#!/usr/bin/env node

/**
 * Independent A11 Git-object verifier for MAIS-NATURAL-CA60-V5-R8.
 *
 * This verifier uses only Node built-ins and immutable Git objects. It does
 * not import the A07 registration builder, activation guard, runner, scorer,
 * statistical kernel, or decision engine.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");

const REG_COMMIT = "ab8e8e8f74fc4f9cffd4dc865b65d800783db4b8";
const SOURCE_COMMIT = "94abd3f1907a43e8378c181d56d8389a1de08020";
const SOURCE_PARENT = "ef6bb7da5151ec114882b9c349559afaaa145859";
const REG_HASH = "ea5cb617a77a2521e473846c35267f419723fd9bf6c0ca8bef8cd6fc9fa46160";
const PROD_ROOT = "121fd08aaf4ba08ffc9fb91f5f992116aaaffc926960bcb9082a9c2e486131d9";
const TEST_ROOT = "a2673d551d3bbde11389f9d870e7d081bb80a95e75196af90780c5d21c642b54";
const CLOSURE_ROOT = "8e048d2d6f7f60e17adea7c6076dc050df6192c65dd6273edc9d45d602cc6a91";
const ENUMERATION_ROOT = "6a27196d501cc26661b57698ce80ca14a3c5eb49cde6a53e23648a23d8414e56";
const EDGE_COUNT = 411;

const PRIOR_REG_COMMIT = "aa07d9b72cf06fbcf100ed0f6bf358fedd94222d";
const PRIOR_SOURCE_COMMIT = "237413734a41431e51c8a29ecef6628b67bbafb1";
const PRIOR_REG_HASH = "97b65940b0573064b4d1206e1f80dfb555c1a41e6c782e7439f9ec53df66b003";
const PRIOR_REVIEW_COMMIT = "ef6bb7da5151ec114882b9c349559afaaa145859";
const PRIOR_REVIEW_HASH = "20d261e83982b29323383eec56c1df99e4f6b45fa7051482a47860e8bcaadd91";

const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const RESEARCH = "coordination/research/mais-natural-ca60-v1/";
const REG_PATH = `${RESEARCH}runner-registrations/v5-r8/runner-registration.json`;
const PRIOR_REG_PATH = `${RESEARCH}runner-registrations/v5-r7/runner-registration.json`;
const PRIOR_REVIEW_PATH =
  "coordination/reports/mais-natural-ca60-v5-r7-runner-review/independent-runner-review-receipt.json";
const A07_LOG = "coordination/session-logs/2026-08-26-A07-mais-natural-ca60-v5-r8.md";

const TEST_ENTRYPOINTS = Object.freeze([
  `${ROOT}runner-v5-r8-remediation.test.mjs`,
  `${ROOT}runner-v5-r8-schemas.test.mjs`,
  `${ROOT}runner-v5-r8-evidence.test.mjs`,
  `${ROOT}runner-v5-r8-runtime.test.mjs`,
  `${ROOT}runner-v5-r8-cli.test.mjs`,
  `${ROOT}runner-v5-r8-scorer-verifier.test.mjs`,
  `${RESEARCH}runner-registrations/v5-r8/runner-registration-artifact.test.mjs`,
].sort(compare));

const FROZEN_FIELDS = Object.freeze([
  "designRegistrationHash", "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash",
  "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash", "privacyScreenHash",
  "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash", "rightsPolicyHash",
  "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash", "thresholdsDecisionAndPowerHash",
  "decisionCeiling", "providerContractErratumHash",
]);

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonical(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite JSON number");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (!value || typeof value !== "object") throw new TypeError(`unsupported JSON ${typeof value}`);
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

function safePath(sourcePath) {
  if (typeof sourcePath !== "string" || !sourcePath || path.isAbsolute(sourcePath)
    || sourcePath.includes("\0") || path.posix.normalize(sourcePath).split("/").includes("..")) {
    throw new TypeError(`unsafe Git path: ${sourcePath}`);
  }
}

function git(args, encoding = null) {
  return execFileSync("git", args, {
    cwd: REPO,
    encoding,
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitBytes(commit, sourcePath) {
  safePath(sourcePath);
  return Buffer.from(git(["show", `${commit}:${sourcePath}`]));
}

function gitJson(commit, sourcePath) {
  return JSON.parse(gitBytes(commit, sourcePath).toString("utf8"));
}

function gitExists(commit, sourcePath) {
  try {
    gitBytes(commit, sourcePath);
    return true;
  } catch {
    return false;
  }
}

function manifest(commit, sourcePaths) {
  return [...new Set(sourcePaths)].sort(compare).map((sourcePath) => {
    const bytes = gitBytes(commit, sourcePath);
    return { path: sourcePath, byteLength: bytes.byteLength, sha256: sha256(bytes) };
  });
}

function literalImports(text) {
  const found = new Set();
  for (const pattern of [
    /\bfrom\s*["']([^"']+)["']/gu,
    /\bimport\s*["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ]) {
    for (const match of text.matchAll(pattern)) found.add(match[1]);
  }
  return [...found].sort(compare);
}

function resolveImport(commit, importer, specifier) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  if (base.startsWith("/") || base.split("/").includes("..")) {
    throw new TypeError(`unsafe import ${importer} -> ${specifier}`);
  }
  const candidates = [base, `${base}.mjs`, `${base}.js`, `${base}.cjs`, `${base}.ts`,
    `${base}.tsx`, `${base}.json`, `${base}/index.mjs`, `${base}/index.js`, `${base}/index.ts`];
  const matches = candidates.filter((candidate) => gitExists(commit, candidate));
  if (matches.length !== 1) {
    throw new TypeError(`${importer} -> ${specifier} resolved ${matches.length} ways`);
  }
  return matches[0];
}

function collectClosure(commit, entryPoints) {
  const queue = [...new Set(entryPoints)].sort(compare);
  const visited = new Set();
  const edges = [];
  const nonLiteralDynamicImports = [];
  const commonJsRequires = [];
  while (queue.length > 0) {
    const sourcePath = queue.shift();
    if (visited.has(sourcePath)) continue;
    if (!gitExists(commit, sourcePath)) throw new TypeError(`missing closure path: ${sourcePath}`);
    visited.add(sourcePath);
    if (!/\.(?:c?js|mjs|ts|tsx)$/u.test(sourcePath)) continue;
    const text = gitBytes(commit, sourcePath).toString("utf8");
    const literalDynamicCount = [...text.matchAll(/\bimport\s*\(\s*["'][^"']+["']\s*\)/gu)].length;
    if ([...text.matchAll(/\bimport\s*\(/gu)].length !== literalDynamicCount) {
      nonLiteralDynamicImports.push(sourcePath);
    }
    if (/\brequire\s*\(/u.test(text)) commonJsRequires.push(sourcePath);
    for (const specifier of literalImports(text)) {
      if (!specifier.startsWith(".")) continue;
      const resolved = resolveImport(commit, sourcePath, specifier);
      edges.push({ importer: sourcePath, specifier, resolved });
      if (!visited.has(resolved)) queue.push(resolved);
    }
    queue.sort(compare);
  }
  const paths = [...visited].sort(compare);
  edges.sort((left, right) => compare(canonical(left), canonical(right)));
  return {
    paths,
    edges,
    importEdgeCount: edges.length,
    importClosureRootHash: jcsHash({ paths, edges }),
    nonLiteralDynamicImports: [...new Set(nonLiteralDynamicImports)].sort(compare),
    commonJsRequires: [...new Set(commonJsRequires)].sort(compare),
  };
}

function check(checks, id, condition, detail) {
  checks.push({ id, status: condition ? "VERIFIED" : "MISMATCH", detail });
}

function run() {
  const checks = [];
  const registration = gitJson(REG_COMMIT, REG_PATH);
  const priorRegistration = gitJson(PRIOR_REG_COMMIT, PRIOR_REG_PATH);
  const priorReview = gitJson(PRIOR_REVIEW_COMMIT, PRIOR_REVIEW_PATH);

  const registrationParent = git(["rev-parse", `${REG_COMMIT}^`], "utf8").trim();
  const sourceParent = git(["rev-parse", `${SOURCE_COMMIT}^`], "utf8").trim();
  const mutations = git(["log", "--all", "--format=%H", "--", REG_PATH], "utf8")
    .trim().split(/\s+/u).filter(Boolean);
  const added = git(["diff-tree", "--root", "--no-commit-id", "--name-status", "-r", REG_COMMIT],
    "utf8").trim().split("\n").filter(Boolean);
  check(checks, "IMMUTABLE_SINGLE_ADD_REGISTRATION_PATH",
    mutations.length === 1 && mutations[0] === REG_COMMIT
      && added.length === 1 && added[0] === `A\t${REG_PATH}`,
    { mutations, added });
  check(checks, "EXACT_DIRECT_PARENT", registrationParent === SOURCE_COMMIT,
    { expected: SOURCE_COMMIT, actual: registrationParent });
  check(checks, "SOURCE_PARENT_IS_BOUND_R7_REVIEW", sourceParent === SOURCE_PARENT,
    { expected: SOURCE_PARENT, actual: sourceParent });

  const recomputedSelfHash = hashWithout(registration, "selfHash");
  check(checks, "REGISTRATION_SELF_HASH",
    registration.selfHash === REG_HASH && recomputedSelfHash === REG_HASH,
    { expected: REG_HASH, stored: registration.selfHash, recomputed: recomputedSelfHash });

  const productionClosure = collectClosure(SOURCE_COMMIT, registration.productionEntryPoints);
  const productionManifest = manifest(SOURCE_COMMIT, productionClosure.paths);
  const testClosure = collectClosure(SOURCE_COMMIT, TEST_ENTRYPOINTS);
  const testPaths = [...new Set([...testClosure.paths, A07_LOG])].sort(compare);
  const testManifest = manifest(SOURCE_COMMIT, testPaths);
  const productionRoot = jcsHash(productionManifest);
  const testRoot = jcsHash(testManifest);
  const enumerationRoot = jcsHash(productionManifest.map(({ path: sourcePath, sha256: digest,
    byteLength }) => [sourcePath, digest, byteLength]));

  check(checks, "FULL_TRANSITIVE_PRODUCTION_CLOSURE",
    canonical(productionClosure.paths) === canonical(registration.productionSourceManifest.map((row) => row.path))
      && productionClosure.importEdgeCount === EDGE_COUNT
      && productionClosure.importClosureRootHash === CLOSURE_ROOT
      && productionClosure.nonLiteralDynamicImports.length === 0
      && productionClosure.commonJsRequires.length === 0,
    { pathCount: productionClosure.paths.length, importEdgeCount: productionClosure.importEdgeCount,
      importClosureRootHash: productionClosure.importClosureRootHash,
      nonLiteralDynamicImports: productionClosure.nonLiteralDynamicImports,
      commonJsRequires: productionClosure.commonJsRequires });
  check(checks, "PRODUCTION_GIT_OBJECT_MANIFEST",
    canonical(productionManifest) === canonical(registration.productionSourceManifest),
    { rowCount: productionManifest.length });
  check(checks, "PRODUCTION_SOURCE_ROOT",
    productionRoot === PROD_ROOT && registration.productionSourceRootHash === PROD_ROOT,
    { expected: PROD_ROOT, recomputed: productionRoot });
  check(checks, "REGISTERED_TEST_CLOSURE",
    canonical(testManifest) === canonical(registration.testSourceManifest),
    { closurePathCount: testClosure.paths.length, manifestRowCount: testManifest.length });
  check(checks, "TEST_SOURCE_ROOT",
    testRoot === TEST_ROOT && registration.testSourceRootHash === TEST_ROOT,
    { expected: TEST_ROOT, recomputed: testRoot });
  check(checks, "RUNTIME_SOURCE_ENUMERATION_ROOT",
    enumerationRoot === ENUMERATION_ROOT
      && registration.runtimeSourceEnumerationRootHash === ENUMERATION_ROOT,
    { expected: ENUMERATION_ROOT, recomputed: enumerationRoot });

  const productionDrift = productionManifest.filter((row) => {
    const bytes = readFileSync(path.join(REPO, row.path));
    return bytes.byteLength !== row.byteLength || sha256(bytes) !== row.sha256;
  }).map((row) => row.path);
  const testDrift = testManifest.filter((row) => {
    const bytes = readFileSync(path.join(REPO, row.path));
    return bytes.byteLength !== row.byteLength || sha256(bytes) !== row.sha256;
  }).map((row) => row.path);
  check(checks, "CURRENT_REGISTERED_BYTES_MATCH_GIT_OBJECTS",
    productionDrift.length === 0 && testDrift.length === 0,
    { productionDrift, testDrift });

  check(checks, "EXACT_R7_SUPERSESSION",
    hashWithout(priorRegistration, "selfHash") === PRIOR_REG_HASH
      && priorRegistration.selfHash === PRIOR_REG_HASH
      && registration.supersedesRunnerRegistrationHash === PRIOR_REG_HASH
      && registration.supersededRunnerRegistrationCommit === PRIOR_REG_COMMIT
      && registration.supersededRunnerSourceCommit === PRIOR_SOURCE_COMMIT
      && registration.supersededProductionSourceRootHash === priorRegistration.productionSourceRootHash
      && registration.supersededTestSourceRootHash === priorRegistration.testSourceRootHash
      && registration.supersededImportClosureRootHash === priorRegistration.importClosureRootHash,
    { priorRegistrationHash: priorRegistration.selfHash });
  check(checks, "BOUND_R7_DISCREPANCY_REVIEW",
    hashWithout(priorReview, "selfHash") === PRIOR_REVIEW_HASH
      && priorReview.selfHash === PRIOR_REVIEW_HASH && priorReview.decision === "DISCREPANCY"
      && priorReview.findingCount === 8
      && registration.discrepancyReviewHash === PRIOR_REVIEW_HASH
      && registration.discrepancyReviewCommit === PRIOR_REVIEW_COMMIT
      && registration.previousReceiptHash === PRIOR_REVIEW_HASH,
    { priorReviewHash: priorReview.selfHash, priorReviewDecision: priorReview.decision });

  const frozenDrift = FROZEN_FIELDS.filter((field) =>
    canonical(registration[field]) !== canonical(priorRegistration[field]));
  check(checks, "FROZEN_R7_DESIGN_FRAME_SAMPLE_METHOD_BINDINGS_UNCHANGED",
    frozenDrift.length === 0, { checkedFields: FROZEN_FIELDS, frozenDrift });
  check(checks, "EXACT_PROVIDER_TUPLES",
    canonical(registration.providerEntrypoints.openAI) === canonical({
      provider: "OPENAI_DIRECT", model: "gpt-5.6-luna",
      endpoint: "https://us.api.openai.com/v1/responses",
      projectResidency: "US_STORAGE_PROCESSING", registeredCli: "runner-v5-r8-cli.mjs",
      coreGuardHash: registration.providerEntrypoints.openAI.coreGuardHash, providerCallsMade: 0,
    })
      && registration.providerEntrypoints.deepSeek.provider === "DEEPSEEK_DIRECT"
      && registration.providerEntrypoints.deepSeek.model === "deepseek-v4-pro"
      && registration.providerEntrypoints.deepSeek.endpoint
        === "https://api.deepseek.com/chat/completions"
      && registration.providerEntrypoints.deepSeek.projectResidency === "UNRESOLVED",
    registration.providerEntrypoints);
  check(checks, "ZERO_AUTHORITY_AND_ACTIVITY",
    Object.entries(registration.authorizationState).every(([field, value]) =>
      typeof value === "boolean" ? value === false : value === 0)
      && registration.trustedProviderEvidenceAnchors.length === 0
      && registration.routeAuthenticityState === "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR",
    { authorizationState: registration.authorizationState,
      trustedProviderEvidenceAnchorCount: registration.trustedProviderEvidenceAnchors.length,
      routeAuthenticityState: registration.routeAuthenticityState });
  check(checks, "CLAIM_AND_DECISION_CEILINGS",
    registration.claimCeiling === "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED"
      && registration.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE",
    { claimCeiling: registration.claimCeiling, decisionCeiling: registration.decisionCeiling });

  const mismatches = checks.filter(({ status }) => status !== "VERIFIED");
  return {
    schemaVersion: "A11IndependentGitObjectVerificationReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R8",
    registrationCommit: REG_COMMIT,
    sourceCommit: SOURCE_COMMIT,
    checkCount: checks.length,
    verifiedCount: checks.length - mismatches.length,
    mismatchCount: mismatches.length,
    checks,
    recomputed: {
      registrationSelfHash: recomputedSelfHash,
      productionSourceRootHash: productionRoot,
      testSourceRootHash: testRoot,
      importClosureRootHash: productionClosure.importClosureRootHash,
      runtimeSourceEnumerationRootHash: enumerationRoot,
      productionPathCount: productionManifest.length,
      testPathCount: testManifest.length,
      productionImportEdgeCount: productionClosure.importEdgeCount,
    },
    boundary: {
      credentialReadCount: 0,
      naturalQuestionReadCount: 0,
      providerCallCount: 0,
      naturalQuestionEgressCount: 0,
      tokenCount: 0,
      attemptCount: 0,
      usdSpent: 0,
    },
  };
}

try {
  const result = run();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.mismatchCount === 0 ? 0 : 1;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 2;
}
