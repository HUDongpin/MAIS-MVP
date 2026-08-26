#!/usr/bin/env node

/**
 * Fresh A11 Git-object verifier for MAIS-NATURAL-CA60-V5-R11.
 *
 * This verifier intentionally uses only Node built-ins and immutable Git
 * objects. It does not import the A07 registration builder, runner, scorer,
 * statistical kernel, decision engine, activation guard, provider adapter,
 * or any A21 implementation.
 */

import { execFileSync } from "node:child_process";
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");

const CLOSEOUT_COMMIT = "e46d2bb8cf62c23f62816634b0dca778a368e35a";
const REG_COMMIT = "7916b771ab29c8ccb13013d52041c3675c8cf7e4";
const SOURCE_COMMIT = "2eb803261e97a2add469182d193533f4751fbfa5";
const REG_HASH = "8ad0c241b7da6c738740e4de074a92805ac45823f63139b23ef327181874817c";
const PROD_ROOT = "52400f9d4979ac88856c25ea7965de19afa25bfa36da53aab3937445d5851f31";
const TEST_ROOT = "eb4b2b89b98968d94d8bdbac876086f85485ff26ad3cef46afd1a90c8a722a3b";
const CLOSURE_ROOT = "17f1764b6301935a1bb86e2622329f626a359c5afa836e035095fd2309d9221e";
const ENUMERATION_ROOT = "43dd97b822ea191cb314f7b50e60d39df5316e2682dd546ac8697228aa4997f6";
const EDGE_COUNT = 509;
const CLOSEOUT_HASH = "92bde7669e099399a3f483311555b5a568cce547cbb8cb6809f50fb8dbfa8814";

const R10_REG_COMMIT = "f3605158d12b601a6ec6b73a39998f156c4a49f3";
const R10_SOURCE_COMMIT = "43e88fa73acb38eca7926360f37c72d9115641f3";
const R10_CLOSEOUT_COMMIT = "39f5a607dd64d71b18f1ce2cfd904a3c440977b0";
const R10_REG_HASH = "99b298b415d42756e8c3cc9b513e0b5ef6b33c8fe184ba98247fccc9eca8d9ed";
const R10_REVIEW_COMMIT = "81e5d632cd19f5f9645a9f8c49d8397f081d76b7";
const R10_REVIEW_HASH = "e8aeaf8b5d4567a5e2f936baacea0ecd64487a00ab976a9f3106e35869ef9bde";
const R10_ANCHOR_COMMIT = "a4bd0315154a0b1bb17cf9e628c300282e76095a";
const R10_ANCHOR_ORIGIN_COMMIT = "d9ab746bf3b4242a3439ea794ca1aab8a633e7b0";
const R10_ANCHOR_HASH = "9498b860cd9573aaa7e0af4120d01f1d3a41f36afc0931fe9c1a915cf9dff341";
const R10_ANCHOR_FINGERPRINT =
  "467104eabb03ab67d2dfe76998791b6eabc10d0b73ec7a5626cd141eb672520b";

const R11_ANCHOR_COMMIT = "42b81cea57029b97f9702e15d79b20860d6a246d";
const R11_ANCHOR_HASH = "0339b22181cf62a5d85b6e7163622d403241b76319ba0150d198533f8003d570";
const R11_ANCHOR_FINGERPRINT =
  "d12807d45c687eab83aefeb060e58c4e8add3148fe9417910becfb323378c3be";
const OWNER_AUTHORIZATION_TEXT_HASH =
  "36233641da9de2db0dfa31fc6970db9e6b01ab11104ed8c89376925f669e0288";

const ROOT = "coordination/content-qa/mais-natural-ca60-v1/";
const RESEARCH = "coordination/research/mais-natural-ca60-v1/";
const REG_PATH = `${RESEARCH}runner-registrations/v5-r11/runner-registration.json`;
const R10_REG_PATH = `${RESEARCH}runner-registrations/v5-r10/runner-registration.json`;
const R10_REVIEW_PATH =
  "coordination/reports/mais-natural-ca60-v5-r10-runner-review/independent-runner-review-receipt.json";
const R10_ANCHOR_PATH =
  "coordination/reports/mais-natural-ca60-v5-r10-review-identity-a11/public-review-identity-anchor.json";
const R11_ANCHOR_PATH =
  "coordination/reports/mais-natural-ca60-v5-r11-review-identity-a11/public-review-identity-anchor.json";
const CLOSEOUT_RECEIPT_PATH =
  "coordination/reports/mais-natural-ca60-v5-r11-runner-closeout-a07/a07-runner-closeout-receipt.json";
const CLOSEOUT_LOG_PATH = "coordination/session-logs/2026-08-27-A07-mais-natural-ca60-v5-r11.md";

const TEST_ENTRYPOINTS = Object.freeze([
  `${ROOT}runner-v5-r7-attempt-transaction.test.mjs`,
  `${ROOT}runner-v5-r7-c0-state.test.mjs`,
  `${ROOT}runner-v5-r7-canary-integration.test.mjs`,
  `${ROOT}runner-v5-r7-guarded-attempt.test.mjs`,
  `${ROOT}runner-v5-r7-journal.test.mjs`,
  `${ROOT}runner-v5-r7-native-provider.test.mjs`,
  `${ROOT}runner-v5-r7-scorer-verifier.test.mjs`,
  `${ROOT}runner-v5-r7-semantic-dispatch.test.mjs`,
  `${ROOT}runner-v5-r11-cli.test.mjs`,
  `${ROOT}runner-v5-r11-native-reference-workflow.test.mjs`,
  `${ROOT}runner-v5-r11-public-cli-workflow.test.mjs`,
  `${ROOT}runner-v5-r11-recovery.test.mjs`,
  `${ROOT}runner-v5-r11-remediation.test.mjs`,
  `${RESEARCH}runner-registrations/v5-r11/runner-registration-artifact.test.mjs`,
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
  "A11-R9-001", "A11-R10-001", "A11-R10-002",
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

function hashWithout(value, field = "selfHash") {
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

function parent(commit) {
  return git(["rev-parse", `${commit}^`], "utf8").trim();
}

function check(checks, id, condition, detail) {
  checks.push({ id, status: condition ? "VERIFIED" : "MISMATCH", detail });
}

function exactSet(actual, expected) {
  return Array.isArray(actual) && new Set(actual).size === actual.length
    && canonical([...actual].sort(compare)) === canonical([...expected].sort(compare));
}

function componentHash(sourceManifest, sourcePaths) {
  const expected = [...new Set(sourcePaths)].sort(compare);
  const selected = sourceManifest.filter(({ path: sourcePath }) => expected.includes(sourcePath));
  return selected.length === expected.length ? jcsHash(selected) : null;
}

function closureKernels(sourceManifest) {
  const schemaPaths = sourceManifest.map(({ path: sourcePath }) => sourcePath)
    .filter((sourcePath) => sourcePath.startsWith(`${ROOT}schemas/`)
      && sourcePath.endsWith(".schema.json"));
  return {
    statisticsAndItemCustodyHash: componentHash(sourceManifest,
      [`${ROOT}statistical-kernel-v5-r11.mjs`, `${ROOT}scorer-verifier-v5-r11.mjs`]),
    attemptGraphAndRecoveryHash: componentHash(sourceManifest,
      [`${ROOT}attempt-graph-v5-r11.mjs`, `${ROOT}attempt-recovery-v5-r11.mjs`]),
    trustedProviderEvidenceHash: componentHash(sourceManifest,
      [`${ROOT}trusted-provider-evidence-v5-r11.mjs`]),
    freshReviewAndGitCustodyHash: componentHash(sourceManifest,
      [`${ROOT}review-evidence-v5-r11.mjs`, `${ROOT}execution-evidence-v5-r11.mjs`]),
    runtimeCliActivationHash: componentHash(sourceManifest,
      [`${ROOT}activation-guard-v5-r11.mjs`, `${ROOT}runner-v5-r11-runtime.mjs`,
        `${ROOT}runner-v5-r11-cli.mjs`, `${ROOT}workflow-index-v5-r11.mjs`,
        `${ROOT}native-provider-adapter-v5-r11.mjs`]),
    closedSchemaCatalogHash: componentHash(sourceManifest,
      [`${ROOT}schema-contract-v5-r11.mjs`, ...schemaPaths]),
    fullTransitiveSourceClosureHash: jcsHash(sourceManifest),
  };
}

function run() {
  const checks = [];
  const registration = gitJson(REG_COMMIT, REG_PATH);
  const r10Registration = gitJson(R10_REG_COMMIT, R10_REG_PATH);
  const r10Review = gitJson(R10_REVIEW_COMMIT, R10_REVIEW_PATH);
  const r10Anchor = gitJson(R10_ANCHOR_COMMIT, R10_ANCHOR_PATH);
  const r11Anchor = gitJson(R11_ANCHOR_COMMIT, R11_ANCHOR_PATH);
  const closeoutReceipt = gitJson(CLOSEOUT_COMMIT, CLOSEOUT_RECEIPT_PATH);
  const closeoutLog = gitBytes(CLOSEOUT_COMMIT, CLOSEOUT_LOG_PATH).toString("utf8");

  check(checks, "REGISTRATION_IMMUTABLE_SINGLE_ADD",
    mutations(REG_PATH).length === 1 && mutations(REG_PATH)[0] === REG_COMMIT
      && canonical(changedPaths(REG_COMMIT)) === canonical([`A\t${REG_PATH}`]),
    { mutations: mutations(REG_PATH), changedPaths: changedPaths(REG_COMMIT) });
  check(checks, "EXACT_DIRECT_PARENT_CHAIN",
    parent(REG_COMMIT) === SOURCE_COMMIT && parent(CLOSEOUT_COMMIT) === REG_COMMIT,
    { sourceCommit: SOURCE_COMMIT, registrationParent: parent(REG_COMMIT),
      registrationCommit: REG_COMMIT, closeoutParent: parent(CLOSEOUT_COMMIT) });
  check(checks, "REGISTRATION_SELF_HASH",
    registration.selfHash === REG_HASH && hashWithout(registration) === REG_HASH,
    { expected: REG_HASH, stored: registration.selfHash, recomputed: hashWithout(registration) });

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
  check(checks, "PRODUCTION_GIT_OBJECT_MANIFEST_ROOT_AND_KERNELS",
    canonical(productionManifest) === canonical(registration.productionSourceManifest)
      && productionRoot === PROD_ROOT && registration.productionSourceRootHash === PROD_ROOT
      && canonical(closureKernels(productionManifest)) === canonical(registration.closureKernels),
    { rowCount: productionManifest.length, expectedRoot: PROD_ROOT, recomputedRoot: productionRoot,
      recomputedClosureKernels: closureKernels(productionManifest) });
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
    canonical(registration[field]) !== canonical(r10Registration[field]));
  check(checks, "EXACT_R10_SUPERSESSION_AND_FROZEN_BINDINGS",
    hashWithout(r10Registration) === R10_REG_HASH
      && registration.supersedesRunnerRegistrationHash === R10_REG_HASH
      && registration.supersededRunnerRegistrationCommit === R10_REG_COMMIT
      && registration.supersededRunnerSourceCommit === R10_SOURCE_COMMIT
      && registration.supersededRunnerCloseoutCommit === R10_CLOSEOUT_COMMIT
      && registration.discrepancyReviewHash === R10_REVIEW_HASH
      && registration.discrepancyReviewCommit === R10_REVIEW_COMMIT
      && registration.previousReceiptHash === R10_REVIEW_HASH
      && registration.ownerRunnerImplementationAuthorizationTextHash === OWNER_AUTHORIZATION_TEXT_HASH
      && frozenDrift.length === 0,
    { supersededRegistrationHash: registration.supersedesRunnerRegistrationHash,
      discrepancyReviewHash: registration.discrepancyReviewHash, frozenDrift });

  const r10PayloadBytes = Buffer.from(canonical(r10Review.reviewSignaturePayload), "utf8");
  const r10AnchorDer = createPublicKey(r10Anchor.publicKeySpkiPem)
    .export({ type: "spki", format: "der" });
  const r10SignatureValid = verify(null, r10PayloadBytes, createPublicKey(r10Anchor.publicKeySpkiPem),
    Buffer.from(r10Review.reviewSignatureBase64, "base64"));
  check(checks, "SIGNED_R10_DISCREPANCY_PREDECESSOR_CHAIN",
    mutations(R10_REVIEW_PATH).length === 1 && mutations(R10_REVIEW_PATH)[0] === R10_REVIEW_COMMIT
      && parent(R10_REG_COMMIT) === R10_SOURCE_COMMIT
      && parent(R10_CLOSEOUT_COMMIT) === R10_REG_COMMIT
      && parent(R10_REVIEW_COMMIT) === R10_CLOSEOUT_COMMIT
      && r10Review.selfHash === R10_REVIEW_HASH && hashWithout(r10Review) === R10_REVIEW_HASH
      && r10Review.decision === "DISCREPANCY" && r10Review.findingCount === 2
      && r10Review.reviewedRunnerRegistrationHash === R10_REG_HASH
      && r10Review.reviewedRunnerRegistrationCommit === R10_REG_COMMIT
      && r10Review.reviewedRunnerSourceCommit === R10_SOURCE_COMMIT
      && r10Review.reviewSignaturePayloadHash === jcsHash(r10Review.reviewSignaturePayload)
      && r10SignatureValid && r10Review.reviewSignatureVerified === true
      && hashWithout(r10Anchor) === R10_ANCHOR_HASH && r10Anchor.selfHash === R10_ANCHOR_HASH
      && sha256(r10AnchorDer) === R10_ANCHOR_FINGERPRINT
      && canonical(mutations(R10_ANCHOR_PATH).sort(compare))
        === canonical([R10_ANCHOR_COMMIT, R10_ANCHOR_ORIGIN_COMMIT].sort(compare)),
    { predecessorReviewMutations: mutations(R10_REVIEW_PATH),
      predecessorChain: [R10_SOURCE_COMMIT, R10_REG_COMMIT, R10_CLOSEOUT_COMMIT, R10_REVIEW_COMMIT],
      reviewSelfHash: r10Review.selfHash, signaturePayloadHash: r10Review.reviewSignaturePayloadHash,
      signatureVerified: r10SignatureValid, anchorFingerprint: sha256(r10AnchorDer) });

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

  const r11AnchorDer = createPublicKey(r11Anchor.publicKeySpkiPem)
    .export({ type: "spki", format: "der" });
  check(checks, "PINNED_R11_A11_REVIEWER_IDENTITY",
    canonical(mutations(R11_ANCHOR_PATH)) === canonical([R11_ANCHOR_COMMIT])
      && hashWithout(r11Anchor) === R11_ANCHOR_HASH && r11Anchor.selfHash === R11_ANCHOR_HASH
      && sha256(r11AnchorDer) === R11_ANCHOR_FINGERPRINT
      && r11Anchor.purpose === "V5_R11_FRESH_A11_REVIEW_ONLY"
      && registration.reviewerIdentityAnchorCommit === R11_ANCHOR_COMMIT
      && registration.reviewerIdentityAnchorOriginCommit === R11_ANCHOR_COMMIT
      && registration.reviewerIdentityAnchorHash === R11_ANCHOR_HASH
      && registration.reviewerKeyId === r11Anchor.keyId,
    { mutations: mutations(R11_ANCHOR_PATH), anchorHash: r11Anchor.selfHash,
      keyId: r11Anchor.keyId, publicKeyFingerprintSha256: sha256(r11AnchorDer) });

  const closeoutMutations = [mutations(CLOSEOUT_RECEIPT_PATH), mutations(CLOSEOUT_LOG_PATH)];
  check(checks, "EXACT_A07_POST_REGISTRATION_CLOSEOUT",
    closeoutMutations.every((commits) => commits.length === 1 && commits[0] === CLOSEOUT_COMMIT)
      && canonical(changedPaths(CLOSEOUT_COMMIT).sort(compare))
        === canonical([`A\t${CLOSEOUT_RECEIPT_PATH}`, `A\t${CLOSEOUT_LOG_PATH}`].sort(compare))
      && hashWithout(closeoutReceipt) === CLOSEOUT_HASH && closeoutReceipt.selfHash === CLOSEOUT_HASH
      && closeoutReceipt.sourceCommit === SOURCE_COMMIT
      && closeoutReceipt.registrationCommit === REG_COMMIT
      && closeoutReceipt.registrationHash === REG_HASH
      && closeoutReceipt.productionSourceRootHash === PROD_ROOT
      && closeoutReceipt.testSourceRootHash === TEST_ROOT
      && closeoutReceipt.importClosureRootHash === CLOSURE_ROOT
      && closeoutReceipt.postRegistrationTestPassCount === 52
      && closeoutReceipt.postRegistrationTestFailCount === 0
      && closeoutReceipt.postRegistrationTestSkipCount === 0
      && closeoutReceipt.finalState === "REVIEWED_COMMIT"
      && closeoutReceipt.upstreamRemoteRefHash === REG_COMMIT
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
    `${ROOT}raw-authoritative-reference-v5-r11.mjs`).toString("utf8");
  const runtimeSource = gitBytes(SOURCE_COMMIT,
    `${ROOT}runner-v5-r11-runtime.mjs`).toString("utf8");
  const nativeTestSource = gitBytes(SOURCE_COMMIT,
    `${ROOT}runner-v5-r11-native-reference-workflow.test.mjs`).toString("utf8");
  const sealSchema = gitJson(SOURCE_COMMIT, `${ROOT}schemas/MachineReferenceSealV7.schema.json`);
  const validationSchema = gitJson(SOURCE_COMMIT,
    `${ROOT}schemas/ReferenceSealValidationReceiptV5.schema.json`);
  const emittedSealStatus = rawReferenceSource.match(/sealReconstructionStatus:\s*"([^"]+)"/u)?.[1];
  const emittedValidationStatus = rawReferenceSource.match(/validationStatus:\s*"([^"]+)"/u)?.[1];
  check(checks, "NATIVE_REFERENCE_SEAL_CLOSED_SCHEMA_AND_RUNTIME_REACHABILITY",
    emittedSealStatus === sealSchema.properties.sealReconstructionStatus.const
      && emittedValidationStatus === validationSchema.properties.validationStatus.const
      && rawReferenceSource.includes("assertClosedSelfHashedAgainstV5R5(seal, SEAL_SCHEMA")
      && rawReferenceSource.includes("assertClosedSelfHashedAgainstV5R5(receipt, VALIDATION_SCHEMA")
      && runtimeSource.includes("buildRawAuthoritativeMachineReferenceSealV5R11")
      && runtimeSource.includes("buildRawAuthoritativeReferenceValidationV5R11")
      && runtimeSource.includes("buildNativeDeepSeekExecutionRegistrationV5R11")
      && nativeTestSource.includes("buildCompleteRawReferenceFixture()")
      && nativeTestSource.includes("assert.equal(context.graph.receipt.successfulAttemptCount, 240)")
      && nativeTestSource.includes("MachineReferenceSealV7")
      && nativeTestSource.includes("ReferenceSealValidationReceiptV5")
      && nativeTestSource.includes("DeepSeekExecutionRegistrationV4"),
    { emittedSealStatus, closedSchemaSealStatus: sealSchema.properties.sealReconstructionStatus.const,
      emittedValidationStatus,
      closedSchemaValidationStatus: validationSchema.properties.validationStatus.const });

  const processSchemaNames = ["IndependentStaticImportGraphReceiptV2",
    "ForbiddenPrimaryScorerPathScanReceiptV2", "IndependentCommandRuntimeReceiptV2",
    "IndependentSourceEnumerationReceiptV2"];
  const processRunnerVersions = Object.fromEntries(processSchemaNames.map((name) => [name,
    gitJson(SOURCE_COMMIT, `${ROOT}schemas/${name}.schema.json`).properties.runnerVersion.const]));
  const reviewSchema = gitJson(SOURCE_COMMIT,
    `${ROOT}schemas/IndependentExecutionRunnerReviewReceiptV9.schema.json`);
  check(checks, "R11_PROCESS_EVIDENCE_AND_SIGNATURE_SCHEMA_VERSION",
    Object.values(processRunnerVersions).every((value) => value === "V5-R11")
      && reviewSchema.properties.runnerVersion.const === "V5-R11"
      && reviewSchema.properties.schemaVersion.const === "IndependentExecutionRunnerReviewReceiptV9"
      && reviewSchema.$defs.signaturePayload.properties.schemaVersion.const
        === "IndependentExecutionRunnerReviewSignaturePayloadV3"
      && reviewSchema.properties.reviewedRemediatedFindingIds.minItems === 11
      && reviewSchema.properties.reviewedRemediatedFindingIds.maxItems === 11,
    { reviewedRunnerVersion: registration.runnerVersion, processRunnerVersions,
      receiptSchemaVersion: reviewSchema.properties.schemaVersion.const,
      signaturePayloadVersion: reviewSchema.$defs.signaturePayload.properties.schemaVersion.const });

  const mismatches = checks.filter(({ status }) => status !== "VERIFIED");
  const output = {
    schemaVersion: "A11IndependentRunnerRegistrationVerificationV11",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R11",
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
      : "GIT_OBJECT_ROOTS_OR_RUNTIME_CONTRACT_ACTIONABLE_DISCREPANCY",
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
  process.exitCode = mismatches.length === 0 ? 0 : 1;
}

run();
