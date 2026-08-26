#!/usr/bin/env node

/**
 * Deterministic A11 V5-R11 review-evidence bundle builder.
 *
 * The builder writes nothing. It runs the two independent A11 commands,
 * verifies the pinned public identity against the private signing key supplied
 * through a process-local path, signs the closed public payload, and emits only
 * public artifacts to stdout. The private key bytes and path are never emitted.
 */

import { spawnSync } from "node:child_process";
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const REPORT_ROOT = "coordination/reports/mais-natural-ca60-v5-r11-runner-review";
const REGISTRATION_PATH =
  "coordination/research/mais-natural-ca60-v1/runner-registrations/v5-r11/runner-registration.json";
const ANCHOR_PATH =
  "coordination/reports/mais-natural-ca60-v5-r11-review-identity-a11/public-review-identity-anchor.json";
const SOURCE_COMMIT = "2eb803261e97a2add469182d193533f4751fbfa5";
const REGISTRATION_COMMIT = "7916b771ab29c8ccb13013d52041c3675c8cf7e4";
const RUNTIME_ENUMERATION_ROOT =
  "43dd97b822ea191cb314f7b50e60d39df5316e2682dd546ac8697228aa4997f6";
const REMEDIATED = Object.freeze([
  ...Array.from({ length: 8 }, (_, index) => `A11-R8-${String(index + 1).padStart(3, "0")}`),
  "A11-R9-001", "A11-R10-001", "A11-R10-002",
]);
const PROCESS_FIELDS = Object.freeze([
  "verifierSourceTreeRoot",
  "dependencyLockRoot",
  "staticImportGraphHash",
  "forbiddenPrimaryScorerPathScanHash",
  "commandRuntimeHash",
  "baselineCommit",
  "recomputedRuntimeSourceEnumerationRootHash",
  "independentSourceEnumerationReceiptHash",
]);
const VERIFIER_PATHS = Object.freeze([
  `${REPORT_ROOT}/independent-runner-registration-verifier.mjs`,
  `${REPORT_ROOT}/a11-adversarial-boundary.test.mjs`,
  `${REPORT_ROOT}/build-independent-review-evidence.mjs`,
]);
const FORBIDDEN_IMPORT_PATTERNS = Object.freeze([
  "decision-evidence-v5-r11.mjs",
  "decision-engine",
  "scorer-verifier-v5-r11.mjs",
  "statistical-kernel-v5-r11.mjs",
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

function seal(body) {
  return Object.freeze({ ...body, selfHash: jcsHash(body) });
}

function bytes(sourcePath) {
  return readFileSync(path.join(REPO, sourcePath));
}

function row(sourcePath) {
  const value = bytes(sourcePath);
  return Object.freeze({ path: sourcePath, sha256: sha256(value), byteLength: value.byteLength });
}

function rowsRoot(rows) {
  return jcsHash(rows.map(({ path: sourcePath, sha256: digest, byteLength }) =>
    [sourcePath, digest, byteLength]).sort((left, right) => compare(left[0], right[0])));
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

function run(argv) {
  const childEnv = Object.fromEntries(["PATH", "TMPDIR", "LANG", "LC_ALL"]
    .map((name) => [name, process.env[name]])
    .filter(([, value]) => typeof value === "string"));
  const result = spawnSync(argv[0] === "node" ? process.execPath : argv[0], argv.slice(1), {
    cwd: REPO,
    encoding: null,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return Object.freeze({
    argv,
    exitCode: result.status,
    stdoutHash: sha256(result.stdout ?? Buffer.alloc(0)),
    stderrHash: sha256(result.stderr ?? Buffer.alloc(0)),
    stdout: result.stdout ?? Buffer.alloc(0),
  });
}

function publicCommand(command) {
  const { stdout: _stdout, ...receipt } = command;
  return receipt;
}

function main() {
  const reviewedAt = process.env.A11_REVIEWED_AT;
  if (!reviewedAt || new Date(reviewedAt).toISOString() !== reviewedAt) {
    throw new TypeError("A11_REVIEWED_AT must be one canonical ISO timestamp");
  }
  const privateKeyPath = process.env.A11_REVIEW_PRIVATE_KEY_PATH;
  if (!privateKeyPath || !path.isAbsolute(privateKeyPath)) {
    throw new TypeError("protected A11 signing-key path is absent");
  }
  if ((statSync(privateKeyPath).mode & 0o777) !== 0o600) {
    throw new TypeError("protected A11 signing key is not mode 0600");
  }

  const registration = JSON.parse(bytes(REGISTRATION_PATH).toString("utf8"));
  const anchor = JSON.parse(bytes(ANCHOR_PATH).toString("utf8"));
  const verifierManifest = VERIFIER_PATHS.map(row).sort((left, right) => compare(left.path, right.path));
  const dependencyManifest = [row("package-lock.json")];
  const verifierSourceTreeRoot = rowsRoot(verifierManifest);
  const dependencyLockRoot = rowsRoot(dependencyManifest);

  const importEdges = VERIFIER_PATHS.flatMap((sourcePath) =>
    literalImports(bytes(sourcePath).toString("utf8")).map((specifier) => [sourcePath, specifier]))
    .sort((left, right) => compare(canonical(left), canonical(right)));
  const forbiddenMatches = importEdges.filter(([, specifier]) =>
    FORBIDDEN_IMPORT_PATTERNS.some((pattern) => specifier.includes(pattern)));
  if (forbiddenMatches.length !== 0) throw new TypeError("independent sources import a forbidden primary path");

  const verifierCommand = run(["node", `${REPORT_ROOT}/independent-runner-registration-verifier.mjs`]);
  const verifierResult = JSON.parse(verifierCommand.stdout.toString("utf8"));
  if (verifierCommand.exitCode !== 0 || verifierResult.mismatchCount !== 0
    || verifierResult.verifiedCheckCount !== 16
    || verifierResult.runtimeSourceEnumerationRootHash !== RUNTIME_ENUMERATION_ROOT) {
    throw new TypeError("independent Git-object verifier did not exactly concur");
  }
  const adversarialCommand = run(["node", "--test", "--test-concurrency=1",
    `${REPORT_ROOT}/a11-adversarial-boundary.test.mjs`]);
  if (adversarialCommand.exitCode !== 0) throw new TypeError("independent adversarial suite failed");

  const staticGraph = seal({
    schemaVersion: "IndependentStaticImportGraphReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R11",
    verifierSourceTreeRoot,
    importEdges,
    importEdgeCount: importEdges.length,
    forbiddenPrimaryScorerImportCount: 0,
    derivedAt: reviewedAt,
  });
  const forbiddenScan = seal({
    schemaVersion: "ForbiddenPrimaryScorerPathScanReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R11",
    verifierSourceTreeRoot,
    forbiddenPathPatterns: [...FORBIDDEN_IMPORT_PATTERNS],
    scannedPathCount: VERIFIER_PATHS.length,
    forbiddenPathMatchCount: 0,
    matchedPaths: [],
    derivedAt: reviewedAt,
  });
  const commandRuntime = seal({
    schemaVersion: "IndependentCommandRuntimeReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R11",
    verifierSourceTreeRoot,
    dependencyLockRoot,
    nodeVersion: process.version,
    platform: process.platform,
    commands: [publicCommand(verifierCommand), publicCommand(adversarialCommand)],
    allCommandsExitedZero: true,
    derivedAt: reviewedAt,
  });
  const enumeration = seal({
    schemaVersion: "IndependentSourceEnumerationReceiptV2",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R11",
    baselineCommit: REGISTRATION_COMMIT,
    registeredRuntimeSourceEnumerationRootHash: registration.runtimeSourceEnumerationRootHash,
    recomputedRuntimeSourceEnumerationRootHash: verifierResult.runtimeSourceEnumerationRootHash,
    enumeratedPathCount: verifierResult.productionPathCount,
    conclusion: "EXACT_MATCH",
    derivedAt: reviewedAt,
  });
  const processEvidence = {
    verifierSourceTreeRoot,
    dependencyLockRoot,
    staticImportGraphHash: staticGraph.selfHash,
    forbiddenPrimaryScorerPathScanHash: forbiddenScan.selfHash,
    commandRuntimeHash: commandRuntime.selfHash,
    baselineCommit: REGISTRATION_COMMIT,
    recomputedRuntimeSourceEnumerationRootHash: verifierResult.runtimeSourceEnumerationRootHash,
    independentSourceEnumerationReceiptHash: enumeration.selfHash,
  };
  const processEvidenceRootHash = jcsHash(PROCESS_FIELDS
    .map((field) => [field, processEvidence[field]]));
  const signaturePayload = Object.freeze({
    schemaVersion: "IndependentExecutionRunnerReviewSignaturePayloadV3",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R11",
    decision: "CONCURRED",
    findingCount: 0,
    reviewedAt,
    reviewedRunnerRegistrationHash: registration.selfHash,
    reviewedRunnerRegistrationCommit: REGISTRATION_COMMIT,
    reviewedRunnerSourceCommit: SOURCE_COMMIT,
    reviewedProductionSourceRootHash: registration.productionSourceRootHash,
    reviewedTestSourceRootHash: registration.testSourceRootHash,
    reviewedImportClosureRootHash: registration.importClosureRootHash,
    reviewedRemediatedFindingIds: [...REMEDIATED],
    processEvidenceRootHash,
    baselineCommit: REGISTRATION_COMMIT,
    recomputedRuntimeSourceEnumerationRootHash: verifierResult.runtimeSourceEnumerationRootHash,
    reviewerIdentityAnchorHash: anchor.selfHash,
    reviewerKeyId: anchor.keyId,
  });

  const privateBytes = Buffer.from(readFileSync(privateKeyPath));
  let privateKey;
  try {
    try {
      privateKey = createPrivateKey({ key: privateBytes, format: "der", type: "pkcs8" });
    } catch {
      privateKey = createPrivateKey(privateBytes);
    }
  } finally {
    privateBytes.fill(0);
  }
  const publicFromPrivate = createPublicKey(privateKey).export({ format: "der", type: "spki" });
  if (sha256(publicFromPrivate) !== anchor.publicKeyFingerprintSha256) {
    throw new TypeError("protected signing key does not match the pinned R11 public identity");
  }
  const payloadBytes = Buffer.from(canonical(signaturePayload), "utf8");
  const signature = sign(null, payloadBytes, privateKey);
  const anchorPublicKey = createPublicKey(anchor.publicKeySpkiPem);
  if (!verify(null, payloadBytes, anchorPublicKey, signature)) {
    throw new TypeError("fresh A11 review signature did not verify");
  }
  const receipt = seal({
    schemaVersion: "IndependentExecutionRunnerReviewReceiptV9",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R11",
    reviewedAt,
    decision: "CONCURRED",
    reviewerLane: "A11",
    independentImplementation: true,
    findingCount: 0,
    reviewedRunnerRegistrationHash: registration.selfHash,
    reviewedRunnerRegistrationCommit: REGISTRATION_COMMIT,
    reviewedRunnerSourceCommit: SOURCE_COMMIT,
    reviewedProductionSourceRootHash: registration.productionSourceRootHash,
    reviewedTestSourceRootHash: registration.testSourceRootHash,
    reviewedImportClosureRootHash: registration.importClosureRootHash,
    reviewedRemediatedFindingIds: [...REMEDIATED],
    ...processEvidence,
    processEvidenceRootHash,
    reviewerIdentityAnchorHash: anchor.selfHash,
    reviewerKeyId: anchor.keyId,
    reviewSignaturePayload: signaturePayload,
    reviewSignaturePayloadHash: sha256(payloadBytes),
    reviewSignatureBase64: signature.toString("base64"),
    reviewSignatureVerified: true,
    reviewCustodyPolicy:
      "PINNED_A11_ED25519_SIGNATURE_PLUS_GIT_OBJECT_SINGLE_ADD_WITH_EXACT_CLOSEOUT_PARENT_AND_RECOMPUTED_PROCESS_EVIDENCE",
    credentialReadCount: 0,
    naturalQuestionReadCount: 0,
    providerCallCount: 0,
    naturalQuestionEgressCount: 0,
    tokenCount: 0,
    attemptCount: 0,
    usdSpent: 0,
  });
  const findingLedger = seal({
    schemaVersion: "A11IndependentRunnerFindingLedgerV3",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerVersion: "V5-R11",
    reviewDecision: "CONCURRED",
    reviewedRunnerRegistrationHash: registration.selfHash,
    reviewReceiptHash: receipt.selfHash,
    findings: [],
    severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
    findingCount: 0,
    requiresSupersedingRegistration: false,
    derivedAt: reviewedAt,
  });

  const bundle = {
    "verifier-source-manifest.json": verifierManifest,
    "dependency-lock-manifest.json": dependencyManifest,
    "independent-static-import-graph-receipt.json": staticGraph,
    "forbidden-primary-scorer-path-scan-receipt.json": forbiddenScan,
    "independent-command-runtime-receipt.json": commandRuntime,
    "independent-source-enumeration-receipt.json": enumeration,
    "independent-runner-review-receipt.json": receipt,
    "independent-finding-ledger.json": findingLedger,
  };
  process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
}

main();
