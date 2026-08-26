#!/usr/bin/env node

/**
 * Fresh A11 Git-object verifier for MAIS-NATURAL-CA60-V5-R10.
 *
 * This verifier intentionally uses only Node built-ins and immutable Git
 * objects. It does not import the A07 registration builder, runner, scorer,
 * statistical kernel, decision engine, activation guard, or provider adapter.
 */

import { execFileSync } from "node:child_process";
import { createHash, createPublicKey } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");

const CLOSEOUT_COMMIT = "39f5a607dd64d71b18f1ce2cfd904a3c440977b0";
const REG_COMMIT = "f3605158d12b601a6ec6b73a39998f156c4a49f3";
const SOURCE_COMMIT = "43e88fa73acb38eca7926360f37c72d9115641f3";
const REG_HASH = "99b298b415d42756e8c3cc9b513e0b5ef6b33c8fe184ba98247fccc9eca8d9ed";
const PROD_ROOT = "7b32c219d780de58609f8d9d37867a6b85ca654c47065691bae2513b49bb12aa";
const TEST_ROOT = "28598960ffb4172f46a5b64a457a9b907645acbfd50d3b0a1c85e898c22a25e3";
const CLOSURE_ROOT = "dff99b2a49e03f0b09c189778014604fe86e0f6d05c12d06e5543f4fac7a814f";
const ENUMERATION_ROOT = "f493ecb64f32d67c6a88cc7a8d9e9d3f0105254019d14612de86858d5beb3c7f";
const EDGE_COUNT = 495;

const R9_REG_COMMIT = "690ed6a07c8599c691f9fbbc962dd43f192042cb";
const R9_SOURCE_COMMIT = "39bad6c07135bd834f4fc1f673ebae1f8252c0da";
const R9_REG_HASH = "96f4107ccf393c4b287c9245f1679962ed5e5984ef476a9267a43b98629615f7";
const R9_FAILURE_HASH = "22f4be7048d99f847846325ff9aa333539137441c3de71358742da9e2e6b3dfc";

const ANCHOR_COMMIT = "a4bd0315154a0b1bb17cf9e628c300282e76095a";
const ANCHOR_ORIGIN_COMMIT = "d9ab746bf3b4242a3439ea794ca1aab8a633e7b0";
const ANCHOR_HASH = "9498b860cd9573aaa7e0af4120d01f1d3a41f36afc0931fe9c1a915cf9dff341";
const ANCHOR_FINGERPRINT = "467104eabb03ab67d2dfe76998791b6eabc10d0b73ec7a5626cd141eb672520b";

const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const RESEARCH = "coordination/research/mais-natural-ca60-v1/";
const REG_PATH = `${RESEARCH}runner-registrations/v5-r10/runner-registration.json`;
const R9_REG_PATH = `${RESEARCH}runner-registrations/v5-r9/runner-registration.json`;
const R9_FAILURE_PATH =
  "coordination/reports/mais-natural-ca60-v5-r9-pre-execution-failure-a07/r9-pre-execution-failure-receipt.json";
const ANCHOR_PATH =
  "coordination/reports/mais-natural-ca60-v5-r10-review-identity-a11/public-review-identity-anchor.json";
const CLOSEOUT_RECEIPT_PATH =
  "coordination/reports/mais-natural-ca60-v5-r10-runner-closeout-a07/a07-runner-closeout-receipt.json";
const CLOSEOUT_LOG_PATH = "coordination/session-logs/2026-08-27-A07-mais-natural-ca60-v5-r10.md";

const TEST_ENTRYPOINTS = Object.freeze([
  `${ROOT}runner-v5-r7-attempt-transaction.test.mjs`,
  `${ROOT}runner-v5-r7-c0-state.test.mjs`,
  `${ROOT}runner-v5-r7-canary-integration.test.mjs`,
  `${ROOT}runner-v5-r7-guarded-attempt.test.mjs`,
  `${ROOT}runner-v5-r7-journal.test.mjs`,
  `${ROOT}runner-v5-r7-native-provider.test.mjs`,
  `${ROOT}runner-v5-r7-raw-reference.test.mjs`,
  `${ROOT}runner-v5-r7-scorer-verifier.test.mjs`,
  `${ROOT}runner-v5-r7-semantic-dispatch.test.mjs`,
  `${ROOT}runner-v5-r10-cli.test.mjs`,
  `${ROOT}runner-v5-r10-public-cli-workflow.test.mjs`,
  `${ROOT}runner-v5-r10-recovery.test.mjs`,
  `${ROOT}runner-v5-r10-remediation.test.mjs`,
  `${RESEARCH}runner-registrations/v5-r10/runner-registration-artifact.test.mjs`,
].sort(compare));

const FROZEN_FIELDS = Object.freeze([
  "designRegistrationHash", "frameRegistrationHash", "samplingFrameHash", "sampleManifestHash",
  "samplePayloadSetHash", "sampleSelectionContentRootHash", "c0RandomAuditHash", "privacyScreenHash",
  "rightsScreenHash", "ownerDecisionRequestHash", "ownerDecisionReceiptHash", "rightsPolicyHash",
  "lineageRuleHash", "taxonomyHash", "labelingAndAdjudicationHash", "thresholdsDecisionAndPowerHash",
  "decisionCeiling", "providerContractErratumHash",
]);

const REMEDIATED = Object.freeze([
  ...Array.from({ length: 8 }, (_, index) => `A11-R8-${String(index + 1).padStart(3, "0")}`),
  "A11-R9-001",
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
    maxBuffer: 256 * 1024 * 1024,
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

function resolveRelativeImport(commit, importer, specifier) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  if (base.startsWith("/") || base.split("/").includes("..")) {
    throw new TypeError(`unsafe relative import ${importer} -> ${specifier}`);
  }
  for (const candidate of [base, `${base}.mjs`, `${base}.js`, `${base}.json`,
    `${base}/index.mjs`, `${base}/index.js`]) {
    if (gitExists(commit, candidate)) return candidate;
  }
  throw new TypeError(`unresolved relative import ${importer} -> ${specifier}`);
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
      const resolved = resolveRelativeImport(commit, sourcePath, specifier);
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

function mutations(sourcePath) {
  const output = git(["log", "--all", "--format=%H", "--", sourcePath], "utf8").trim();
  return output ? output.split(/\s+/u).filter(Boolean) : [];
}

function changedPaths(commit) {
  const output = git(["diff-tree", "--root", "--no-commit-id", "--name-status", "-r", commit],
    "utf8").trim();
  return output ? output.split("\n").filter(Boolean) : [];
}

function check(checks, id, condition, detail) {
  checks.push({ id, status: condition ? "VERIFIED" : "MISMATCH", detail });
}

function exactSet(actual, expected) {
  return Array.isArray(actual) && new Set(actual).size === actual.length
    && canonical([...actual].sort(compare)) === canonical([...expected].sort(compare));
}

function run() {
  const checks = [];
  const registration = gitJson(REG_COMMIT, REG_PATH);
  const r9Registration = gitJson(R9_REG_COMMIT, R9_REG_PATH);
  const r9Failure = gitJson(SOURCE_COMMIT, R9_FAILURE_PATH);
  const closeoutReceipt = gitJson(CLOSEOUT_COMMIT, CLOSEOUT_RECEIPT_PATH);
  const closeoutLog = gitBytes(CLOSEOUT_COMMIT, CLOSEOUT_LOG_PATH).toString("utf8");
  const anchor = gitJson(ANCHOR_COMMIT, ANCHOR_PATH);

  const registrationParent = git(["rev-parse", `${REG_COMMIT}^`], "utf8").trim();
  const closeoutParent = git(["rev-parse", `${CLOSEOUT_COMMIT}^`], "utf8").trim();
  check(checks, "REGISTRATION_IMMUTABLE_SINGLE_ADD",
    mutations(REG_PATH).length === 1 && mutations(REG_PATH)[0] === REG_COMMIT
      && canonical(changedPaths(REG_COMMIT)) === canonical([`A\t${REG_PATH}`]),
    { mutations: mutations(REG_PATH), changedPaths: changedPaths(REG_COMMIT) });
  check(checks, "EXACT_DIRECT_PARENT_CHAIN",
    registrationParent === SOURCE_COMMIT && closeoutParent === REG_COMMIT,
    { sourceCommit: SOURCE_COMMIT, registrationParent, registrationCommit: REG_COMMIT, closeoutParent });
  check(checks, "REGISTRATION_SELF_HASH",
    registration.selfHash === REG_HASH && hashWithout(registration, "selfHash") === REG_HASH,
    { expected: REG_HASH, stored: registration.selfHash,
      recomputed: hashWithout(registration, "selfHash") });

  const productionClosure = collectClosure(SOURCE_COMMIT, registration.productionEntryPoints);
  const productionManifest = manifest(SOURCE_COMMIT, productionClosure.paths);
  const testClosure = collectClosure(SOURCE_COMMIT, TEST_ENTRYPOINTS);
  const testManifest = manifest(SOURCE_COMMIT, testClosure.paths);
  const productionRoot = jcsHash(productionManifest);
  const testRoot = jcsHash(testManifest);
  const enumerationRoot = jcsHash(productionManifest.map(({ path: sourcePath, sha256: digest,
    byteLength }) => [sourcePath, digest, byteLength]));

  check(checks, "FULL_TRANSITIVE_PRODUCTION_CLOSURE",
    canonical(productionClosure.paths)
        === canonical(registration.productionSourceManifest.map(({ path: sourcePath }) => sourcePath))
      && productionClosure.importEdgeCount === EDGE_COUNT
      && productionClosure.importClosureRootHash === CLOSURE_ROOT
      && productionClosure.nonLiteralDynamicImports.length === 0
      && productionClosure.commonJsRequires.length === 0,
    { pathCount: productionClosure.paths.length, importEdgeCount: productionClosure.importEdgeCount,
      importClosureRootHash: productionClosure.importClosureRootHash,
      nonLiteralDynamicImports: productionClosure.nonLiteralDynamicImports,
      commonJsRequires: productionClosure.commonJsRequires });
  check(checks, "PRODUCTION_GIT_OBJECT_MANIFEST_AND_ROOT",
    canonical(productionManifest) === canonical(registration.productionSourceManifest)
      && productionRoot === PROD_ROOT && registration.productionSourceRootHash === PROD_ROOT,
    { rowCount: productionManifest.length, expectedRoot: PROD_ROOT, recomputedRoot: productionRoot });
  check(checks, "REGISTERED_TEST_GIT_OBJECT_CLOSURE_AND_ROOT",
    canonical(testClosure.paths)
        === canonical(registration.testSourceManifest.map(({ path: sourcePath }) => sourcePath))
      && canonical(testManifest) === canonical(registration.testSourceManifest)
      && testRoot === TEST_ROOT && registration.testSourceRootHash === TEST_ROOT,
    { rowCount: testManifest.length, importEdgeCount: testClosure.importEdgeCount,
      expectedRoot: TEST_ROOT, recomputedRoot: testRoot });
  check(checks, "RUNTIME_SOURCE_ENUMERATION_ROOT",
    enumerationRoot === ENUMERATION_ROOT
      && registration.runtimeSourceEnumerationRootHash === ENUMERATION_ROOT,
    { expected: ENUMERATION_ROOT, recomputed: enumerationRoot });

  const productionDrift = productionManifest.filter((row) => {
    const bytes = readFileSync(path.join(REPO, row.path));
    return bytes.byteLength !== row.byteLength || sha256(bytes) !== row.sha256;
  }).map(({ path: sourcePath }) => sourcePath);
  const testDrift = testManifest.filter((row) => {
    const bytes = readFileSync(path.join(REPO, row.path));
    return bytes.byteLength !== row.byteLength || sha256(bytes) !== row.sha256;
  }).map(({ path: sourcePath }) => sourcePath);
  check(checks, "CURRENT_REGISTERED_BYTES_MATCH_GIT_OBJECTS",
    productionDrift.length === 0 && testDrift.length === 0,
    { productionDrift, testDrift });

  const frozenDrift = FROZEN_FIELDS.filter((field) =>
    canonical(registration[field]) !== canonical(r9Registration[field]));
  check(checks, "EXACT_R9_SUPERSESSION_AND_FROZEN_BINDINGS",
    hashWithout(r9Registration, "selfHash") === R9_REG_HASH
      && registration.supersedesRunnerRegistrationHash === R9_REG_HASH
      && registration.supersededRunnerRegistrationCommit === R9_REG_COMMIT
      && registration.supersededRunnerSourceCommit === R9_SOURCE_COMMIT
      && r9Failure.selfHash === R9_FAILURE_HASH
      && hashWithout(r9Failure, "selfHash") === R9_FAILURE_HASH
      && r9Failure.disposition === "SUPERSEDED_NOT_EXECUTED"
      && registration.preExecutionFailureReceiptHash === R9_FAILURE_HASH
      && registration.previousReceiptHash === R9_FAILURE_HASH
      && frozenDrift.length === 0,
    { supersededRegistrationHash: registration.supersedesRunnerRegistrationHash,
      failureHash: r9Failure.selfHash, frozenDrift });

  const openAI = registration.providerEntrypoints.openAI;
  const deepSeek = registration.providerEntrypoints.deepSeek;
  check(checks, "EXACT_PROVIDER_TUPLES_ZERO_AUTHORITY_AND_CEILINGS",
    canonical([openAI.provider, openAI.model, openAI.endpoint, openAI.projectResidency])
        === canonical(["OPENAI_DIRECT", "gpt-5.6-luna",
          "https://us.api.openai.com/v1/responses", "US_STORAGE_PROCESSING"])
      && canonical([deepSeek.provider, deepSeek.model, deepSeek.endpoint, deepSeek.projectResidency])
        === canonical(["DEEPSEEK_DIRECT", "deepseek-v4-pro",
          "https://api.deepseek.com/chat/completions", "UNRESOLVED"])
      && Object.values(registration.authorizationState).every((value) => value === 0 || value === false)
      && registration.trustedProviderEvidenceAnchors.length === 0
      && registration.routeAuthenticityState === "ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR"
      && registration.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE"
      && registration.claimCeiling === "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
    { openAI, deepSeek, authorizationState: registration.authorizationState,
      routeAuthenticityState: registration.routeAuthenticityState,
      decisionCeiling: registration.decisionCeiling, claimCeiling: registration.claimCeiling });

  const anchorDer = createPublicKey(anchor.publicKeySpkiPem).export({ type: "spki", format: "der" });
  const anchorMutationSet = mutations(ANCHOR_PATH).sort(compare);
  check(checks, "PINNED_A11_REVIEWER_IDENTITY",
    canonical(anchorMutationSet) === canonical([ANCHOR_COMMIT, ANCHOR_ORIGIN_COMMIT].sort(compare))
      && gitBytes(ANCHOR_COMMIT, ANCHOR_PATH).equals(gitBytes(ANCHOR_ORIGIN_COMMIT, ANCHOR_PATH))
      && hashWithout(anchor, "selfHash") === ANCHOR_HASH && anchor.selfHash === ANCHOR_HASH
      && sha256(anchorDer) === ANCHOR_FINGERPRINT
      && registration.reviewerIdentityAnchorHash === ANCHOR_HASH
      && registration.reviewerKeyId === anchor.keyId
      && registration.reviewerIdentityAnchorOriginCommit === ANCHOR_ORIGIN_COMMIT,
    { anchorCommit: ANCHOR_COMMIT, anchorOriginCommit: ANCHOR_ORIGIN_COMMIT,
      mutations: anchorMutationSet, anchorHash: anchor.selfHash,
      keyId: anchor.keyId, publicKeyFingerprintSha256: sha256(anchorDer) });

  const closeoutMutations = [mutations(CLOSEOUT_RECEIPT_PATH), mutations(CLOSEOUT_LOG_PATH)];
  check(checks, "EXACT_A07_POST_REGISTRATION_CLOSEOUT",
    closeoutMutations.every((commits) => commits.length === 1 && commits[0] === CLOSEOUT_COMMIT)
      && canonical(changedPaths(CLOSEOUT_COMMIT).sort(compare))
        === canonical([`A\t${CLOSEOUT_RECEIPT_PATH}`, `A\t${CLOSEOUT_LOG_PATH}`].sort(compare))
      && hashWithout(closeoutReceipt, "selfHash") === closeoutReceipt.selfHash
      && closeoutReceipt.sourceCommit === SOURCE_COMMIT
      && closeoutReceipt.registrationCommit === REG_COMMIT
      && closeoutReceipt.registrationHash === REG_HASH
      && closeoutReceipt.postRegistrationTestPassCount === 52
      && closeoutReceipt.postRegistrationTestFailCount === 0
      && closeoutReceipt.postRegistrationTestSkipCount === 0
      && closeoutReceipt.finalState === "REVIEWED_COMMIT"
      && closeoutLog.includes(SOURCE_COMMIT) && closeoutLog.includes(REG_COMMIT)
      && closeoutLog.includes(REG_HASH) && closeoutLog.includes("REVIEWED_COMMIT"),
    { closeoutCommit: CLOSEOUT_COMMIT, changedPaths: changedPaths(CLOSEOUT_COMMIT),
      closeoutSelfHash: closeoutReceipt.selfHash, testCounts: {
        pass: closeoutReceipt.postRegistrationTestPassCount,
        fail: closeoutReceipt.postRegistrationTestFailCount,
        skip: closeoutReceipt.postRegistrationTestSkipCount,
      } });

  check(checks, "EXACT_REMEDIATION_SET",
    exactSet(registration.remediatedFindingIds, REMEDIATED),
    { expected: REMEDIATED, actual: registration.remediatedFindingIds });

  const rawReferenceSource = gitBytes(SOURCE_COMMIT,
    `${ROOT}raw-authoritative-reference-v5-r10.mjs`).toString("utf8");
  const sealSchema = gitJson(SOURCE_COMMIT, `${ROOT}schemas/MachineReferenceSealV6.schema.json`);
  const validationSchema = gitJson(SOURCE_COMMIT,
    `${ROOT}schemas/ReferenceSealValidationReceiptV4.schema.json`);
  const emittedSealStatus = rawReferenceSource.match(/sealReconstructionStatus:\s*"([^"]+)"/u)?.[1];
  const emittedValidationStatus = rawReferenceSource.match(/validationStatus:\s*"([^"]+)"/u)?.[1];
  check(checks, "NATIVE_REFERENCE_SEAL_CLOSED_SCHEMA_REACHABILITY",
    emittedSealStatus === sealSchema.properties.sealReconstructionStatus.const
      && emittedValidationStatus === validationSchema.properties.validationStatus.const,
    { emittedSealStatus, closedSchemaSealStatus: sealSchema.properties.sealReconstructionStatus.const,
      emittedValidationStatus,
      closedSchemaValidationStatus: validationSchema.properties.validationStatus.const });

  const processSchemaNames = ["IndependentStaticImportGraphReceiptV1",
    "ForbiddenPrimaryScorerPathScanReceiptV1", "IndependentCommandRuntimeReceiptV1",
    "IndependentSourceEnumerationReceiptV1"];
  const processRunnerVersions = Object.fromEntries(processSchemaNames.map((name) => [name,
    gitJson(SOURCE_COMMIT, `${ROOT}schemas/${name}.schema.json`).properties.runnerVersion.const]));
  check(checks, "R10_PROCESS_EVIDENCE_SCHEMA_VERSION",
    Object.values(processRunnerVersions).every((value) => value === "V5-R10"),
    { reviewedRunnerVersion: registration.runnerVersion, processRunnerVersions });

  const mismatches = checks.filter(({ status }) => status !== "VERIFIED");
  const output = {
    schemaVersion: "A11IndependentRunnerRegistrationVerificationV10",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R10",
    reviewedCloseoutCommit: CLOSEOUT_COMMIT,
    reviewedRegistrationCommit: REG_COMMIT,
    reviewedSourceCommit: SOURCE_COMMIT,
    registrationHash: REG_HASH,
    productionSourceRootHash: productionRoot,
    testSourceRootHash: testRoot,
    importClosureRootHash: productionClosure.importClosureRootHash,
    runtimeSourceEnumerationRootHash: enumerationRoot,
    productionPathCount: productionManifest.length,
    testPathCount: testManifest.length,
    importEdgeCount: productionClosure.importEdgeCount,
    checks,
    verifiedCheckCount: checks.length - mismatches.length,
    mismatchCount: mismatches.length,
    conclusion: mismatches.length === 0 ? "EXACT_MATCH_NO_STATIC_DISCREPANCY"
      : "GIT_OBJECT_ROOTS_AUTHENTIC_ACTIONABLE_DISCREPANCY",
    zeroActivityBoundary: {
      credentialReadCount: 0,
      naturalQuestionReadCount: 0,
      providerCallCount: 0,
      httpRequestCount: 0,
      naturalQuestionEgressCount: 0,
      tokenCount: 0,
      attemptCount: 0,
      usdSpent: 0,
    },
  };
  process.stdout.write(`${canonical(output)}\n`);
  process.exitCode = mismatches.length === 2 ? 0 : 1;
}

run();
