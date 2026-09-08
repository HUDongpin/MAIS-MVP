#!/usr/bin/env node

import { chmod, mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  assertSafeRepoRelativePath,
  canonicalBindingProjection,
  createGitRepositoryAdapter,
  discoverNativePromotionContext,
  fingerprint,
  redactedRef,
  readJsonArtifactAtCommit,
  sha256,
  snapshotAuthoritativeState,
  stableJson,
  strictJsonParse,
  summarizeVerifiedReceipt,
} from "./discover-promotion-gate.mjs";

const COMMIT_RE = /^[a-f0-9]{40}$/u;
const SHA256_RE = /^[a-f0-9]{64}$/u;
const RUN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/u;
const OPERATIONS = new Set(["validate", "shadow", "verify-receipt"]);
const OPERATION_MAP = Object.freeze({
  validate: { contextKey: "validate", scriptName: "promotion:validate", subcommand: "validate" },
  shadow: { contextKey: "shadow", scriptName: "promotion:shadow", subcommand: "shadow" },
  "verify-receipt": { contextKey: "verifyReceipt", scriptName: "promotion:verify-receipt", subcommand: "verify-receipt" },
});
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
export const NATIVE_TIMEOUT_MS = 60_000;

function fail(code, message, internal = false) {
  throw Object.assign(new Error(message), { code, ...(internal ? { internal: true } : {}) });
}

function printHelp() {
  process.stdout.write(`Usage: node scripts/run-native-gate.mjs --operation validate|shadow|verify-receipt [options]\n\nOptions:\n  --repo ROOT                 repository root (default: current directory)\n  --expected-head SHA         fail closed unless HEAD matches exactly\n  --run-id ID                 required for Shadow; never emitted verbatim\n  --receipt FILE              repo-relative finalized Receipt path (verify only)\n  --storage-commit SHA        distinct descendant finalization commit (verify only)\n  --receipt-sha256 SHA256     authorized exact Git-blob file digest (verify only)\n  --execute                   explicit opt-in to invoke the discovered native CLI\n  --allow-shadow              authorize a Shadow-capable plan/run\n  --allow-replay-shadow       verify-only alias acknowledging native replay Shadow\n\nWithout --execute this performs operation-aware discovery and prints a redacted plan\nwith wouldExecute:false. Both Shadow and verify-receipt are Shadow-capable because\nthe native verifier replays the bound execution; either must be authorized before\ndiscovery/planning. Validate and Shadow run at the clean registered execution commit,\nwhere no future canonical Receipt is required or permitted. Verify additionally reads\nthe exact regular-file Git blob/mode from the authorized descendant storage commit,\nchecks its SHA-256, copies only those bytes to a private wrapper-owned temp file, and\nremoves that input after invocation. Every execution-checkout input and invoked CLI\nmust be repository-contained, symlink-free, tracked, and byte/mode exact. The child\ngets no NODE_OPTIONS or credential-like environment. Execution is bounded to 60s and\nrequires the immutable snapshot before and after. This wrapper never deploys, writes\nlive data, or widens native candidate semantics; Shadow owns only temporary outputs.\nValidate PASS is bounded to current Manifest validation; verify PASS is bounded to\nthe transported Receipt digests. No result authorizes live use.\n\nExit codes preserve the native contract:\n  0 pass or dry-run plan; 1 fail; 2 blocked; 3 internal error\n`);
}

export function parseNativeArgs(argv) {
  const options = { repo: process.cwd(), execute: false, allowShadow: false, replayShadowAuthorization: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (["--repo", "--operation", "--expected-head", "--receipt", "--run-id", "--storage-commit", "--receipt-sha256"].includes(arg)) {
      const value = argv[++index];
      if (typeof value !== "string" || value.length === 0) fail("USAGE_INVALID", `${arg} requires a value`);
      const key = { "--repo": "repo", "--operation": "operation", "--expected-head": "expectedHead", "--receipt": "receipt", "--run-id": "runId", "--storage-commit": "storageCommit", "--receipt-sha256": "receiptSha256" }[arg];
      options[key] = value;
    } else if (arg === "--execute") {
      options.execute = true;
    } else if (arg === "--allow-shadow") {
      if (options.replayShadowAuthorization) fail("USAGE_INVALID", "choose one Shadow authorization flag");
      options.allowShadow = true;
    } else if (arg === "--allow-replay-shadow") {
      if (options.allowShadow) fail("USAGE_INVALID", "choose one Shadow authorization flag");
      options.allowShadow = true;
      options.replayShadowAuthorization = true;
    } else {
      fail("USAGE_INVALID", "unsupported argument");
    }
  }
  if (!OPERATIONS.has(options.operation)) fail("OPERATION_FORBIDDEN", "operation is missing or forbidden");
  if (options.expectedHead && !COMMIT_RE.test(options.expectedHead)) fail("USAGE_INVALID", "expected HEAD is malformed");
  const shadowCapable = options.operation === "shadow" || options.operation === "verify-receipt";
  if (options.replayShadowAuthorization && options.operation !== "verify-receipt") fail("USAGE_INVALID", "replay-only Shadow authorization used for another operation");
  if (options.operation === "shadow") {
    if (!RUN_ID_RE.test(options.runId ?? "")) fail("RUN_ID_INVALID", "Shadow requires a bounded logical run ID");
  } else if (options.runId) {
    fail("USAGE_INVALID", "Shadow-only option used for another operation");
  }
  if (shadowCapable && options.allowShadow !== true) fail("SHADOW_NOT_EXPLICITLY_ALLOWED", "Shadow-capable operation requires --allow-shadow or --allow-replay-shadow before discovery or invocation");
  if (!shadowCapable && options.allowShadow) fail("USAGE_INVALID", "Shadow-only authorization used for a non-Shadow operation");
  if (options.operation !== "verify-receipt" && options.receipt) fail("USAGE_INVALID", "Receipt override is verify-only");
  if (options.receipt) assertSafeReceiptRelativePath(options.receipt);
  if (options.operation === "verify-receipt") {
    if (!options.receipt || !COMMIT_RE.test(options.storageCommit ?? "") || !SHA256_RE.test(options.receiptSha256 ?? "")) fail("RECEIPT_TRANSPORT_REQUIRED", "verify-receipt requires a repo-relative Receipt path, finalization commit, and exact file digest");
  } else if (options.storageCommit || options.receiptSha256) {
    fail("USAGE_INVALID", "Receipt transport options are verify-only");
  }
  return options;
}

export function assertSafeReceiptRelativePath(pathValue) {
  try {
    assertSafeRepoRelativePath(pathValue, "Receipt path");
  } catch {
    fail("RECEIPT_PATH_UNSAFE", "Receipt path must be a canonical repository-relative path");
  }
}

export async function resolveFinalizedReceiptTransport(repoRoot, options, repositoryAdapter = createGitRepositoryAdapter(repoRoot)) {
  assertSafeReceiptRelativePath(options.receipt);
  if (!COMMIT_RE.test(options.storageCommit ?? "") || !SHA256_RE.test(options.receiptSha256 ?? "")) fail("RECEIPT_TRANSPORT_REQUIRED", "finalized Receipt transport binding is incomplete");
  const executionCommit = await repositoryAdapter.head();
  if (!COMMIT_RE.test(executionCommit ?? "") || executionCommit === options.storageCommit || !await repositoryAdapter.commitExists(options.storageCommit) || !await repositoryAdapter.isAncestor(executionCommit, options.storageCommit)) {
    fail("RECEIPT_STORAGE_COMMIT_INVALID", "Receipt storage commit must be a distinct descendant of the registered execution checkout");
  }
  if (await repositoryAdapter.treeEntry(executionCommit, options.receipt) !== null) {
    fail("RECEIPT_PREBOUND_AT_EXECUTION", "finalized Receipt must not exist at the registered execution commit");
  }
  const artifact = await readJsonArtifactAtCommit(repoRoot, options.storageCommit, options.receipt, "finalized Receipt", repositoryAdapter);
  if (artifact.sha256 !== options.receiptSha256) fail("RECEIPT_STORAGE_DIGEST_MISMATCH", "finalized Receipt Git blob differs from the authorized file digest");
  return artifact;
}

export async function copyVerifiedReceiptToOwnedTemp(artifact) {
  if (!Buffer.isBuffer(artifact?.bytes) || artifact.bytes.length > MAX_OUTPUT_BYTES || sha256(artifact.bytes) !== artifact.sha256) fail("RECEIPT_TRANSPORT_BYTES_INVALID", "verified Receipt transport bytes are malformed");
  const root = await mkdtemp(join(tmpdir(), "promotion-receipt-transport-"));
  const path = join(root, "receipt.json");
  try {
    await writeFile(path, artifact.bytes, { flag: "wx", mode: 0o600 });
    await chmod(path, 0o600);
  } catch (error) {
    try { await rmdir(root); } catch {}
    throw error;
  }
  let cleaned = false;
  return {
    root,
    path,
    async cleanup() {
      if (cleaned) return;
      cleaned = true;
      await unlink(path);
      await rmdir(root);
    },
  };
}

function expectedExitForResult(result) {
  return { pass: 0, fail: 1, blocked: 2, internal: 3 }[result];
}

function assertOperationOutputShape(operation, payload) {
  if (operation === "validate" && (payload?.mode !== "validate" || !/^promotion-validation-result\./u.test(payload?.schemaVersion ?? ""))) fail("NATIVE_OPERATION_OUTPUT_MISMATCH", "validate did not return a validate result");
  if (operation === "shadow" && payload?.mode !== "shadow") fail("NATIVE_OPERATION_OUTPUT_MISMATCH", "shadow did not return a Shadow Receipt");
  if (operation === "verify-receipt" && (payload?.valid !== true || !/^promotion-receipt-verification\./u.test(payload?.schemaVersion ?? ""))) {
    fail("NATIVE_OPERATION_OUTPUT_MISMATCH", "verify-receipt did not return an exact Receipt verification");
  }
}

function expectedEvidenceContext(expected) {
  if (expected?.bindingProjection) return { ...expected, bindingProjection: canonicalBindingProjection(expected.bindingProjection) };
  return { bindingProjection: canonicalBindingProjection(expected) };
}

function summarizeValidatePass(payload, expected) {
  const expectedKeys = ["candidateDigest", "checkDigest", "checkerBundleDigest", "checks", "executionCommit", "liveAllowed", "manifest", "mode", "parentPackageStatus", "pilotUnitStatus", "result", "schemaVersion", "targetBaselineCommit"];
  if (!payload || stableJson(Object.keys(payload).sort()) !== stableJson(expectedKeys) || !Array.isArray(payload.checks) || payload.checks.length === 0 || fingerprint(payload.checks) !== payload.checkDigest) fail("NATIVE_VALIDATE_EVIDENCE_MALFORMED", "native validate PASS has a malformed exported evidence shape");
  const binding = expected.bindingProjection;
  const manifest = expected.manifest;
  if (!manifest || payload.manifest?.path !== manifest.path || payload.manifest?.rawSha256 !== manifest.rawSha256 || payload.executionCommit !== binding.executionCommit || payload.candidateDigest !== binding.candidateDigest || payload.targetBaselineCommit !== binding.targetBaselineCommit || payload.checkerBundleDigest !== binding.checkerBundleDigest || payload.parentPackageStatus !== binding.parentPackageStatus || payload.pilotUnitStatus !== "shadow_ready") fail("NATIVE_VALIDATE_EVIDENCE_MISMATCH", "native validate PASS differs from the selected Manifest evidence");
  return {
    currentness: "current-manifest-only",
    evidenceLayer: "manifest-validation",
    shadowAuthority: false,
    lifecycleAuthority: "none",
    manifestSha256: payload.manifest.rawSha256,
    executionCommit: payload.executionCommit,
    candidateDigest: payload.candidateDigest,
    targetBaselineCommit: payload.targetBaselineCommit,
    checkerBundleDigest: payload.checkerBundleDigest,
    checkDigest: payload.checkDigest,
    parentPackageStatus: payload.parentPackageStatus,
    pilotUnitStatus: payload.pilotUnitStatus,
  };
}

function summarizeVerifyPass(payload, expected) {
  const expectedKeys = ["executionCommit", "liveAllowed", "manifestPath", "manifestRawSha256", "rawReceiptDigest", "result", "schemaVersion", "semanticReceiptDigest", "valid"];
  if (!payload || stableJson(Object.keys(payload).sort()) !== stableJson(expectedKeys) || ![payload.manifestRawSha256, payload.semanticReceiptDigest, payload.rawReceiptDigest].every((value) => /^[a-f0-9]{64}$/u.test(value ?? "")) || !/^[a-f0-9]{40}$/u.test(payload.executionCommit ?? "")) fail("NATIVE_VERIFY_EVIDENCE_MALFORMED", "native verify PASS has a malformed exported evidence shape");
  const receipt = expected.receipt;
  if (!receipt || payload.manifestPath !== receipt.manifestPath || payload.manifestRawSha256 !== receipt.manifestRawSha256 || payload.executionCommit !== receipt.executionCommit || payload.semanticReceiptDigest !== receipt.semanticReceiptDigest || payload.rawReceiptDigest !== receipt.rawReceiptDigest) fail("NATIVE_VERIFY_EVIDENCE_MISMATCH", "native verify PASS differs from the named Receipt digest evidence");
  return {
    currentness: "current-receipt-only",
    evidenceLayer: "receipt-digest-verification",
    shadowAuthority: false,
    lifecycleAuthority: "none",
    manifestSha256: payload.manifestRawSha256,
    executionCommit: payload.executionCommit,
    semanticReceiptDigest: payload.semanticReceiptDigest,
    rawReceiptDigest: payload.rawReceiptDigest,
    receiptDigestVerified: true,
  };
}

function summarizeNativeErrorPayload(payload) {
  if (!/^promotion-gate-error\.[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(payload?.schemaVersion ?? "")) return null;
  const expectedKeys = payload.details === undefined
    ? ["code", "message", "result", "schemaVersion"]
    : ["code", "details", "message", "result", "schemaVersion"];
  if (
    stableJson(Object.keys(payload).sort()) !== stableJson(expectedKeys) ||
    !/^[A-Z][A-Z0-9_]{1,127}$/u.test(payload.code ?? "") ||
    typeof payload.message !== "string" ||
    payload.message.length === 0 ||
    payload.message.length > 2_000 ||
    (payload.details !== undefined && (payload.details === null || typeof payload.details !== "object" || Array.isArray(payload.details)))
  ) {
    fail("NATIVE_ERROR_OUTPUT_MALFORMED", "native error output does not match the closed Promotion error shape");
  }
  return { code: payload.code };
}

export function summarizeNativeResult(operation, payload, stdout, expectedEvidence) {
  const result = payload?.result;
  if (!["pass", "fail", "blocked", "internal"].includes(result)) fail("NATIVE_OUTPUT_MALFORMED", "native result is malformed");
  const explicitlyNonLive = operation === "shadow"
    ? payload?.binding?.liveAllowed === false && payload?.lifecycle?.liveAllowed === false
    : payload?.liveAllowed === false;
  const anyLiveAuthorization = payload?.liveAllowed === true || payload?.binding?.liveAllowed === true || payload?.lifecycle?.liveAllowed === true;
  if (anyLiveAuthorization || (result === "pass" && !explicitlyNonLive)) fail("LIVE_BOUNDARY_INVALID", "native PASS does not explicitly assert liveAllowed:false");

  const summary = {
    operation,
    result,
    nativeOutputSha256: sha256(stdout),
    authoritativeReceipt: false,
    liveAllowed: false,
    currentness: "stale",
  };
  const nativeError = summarizeNativeErrorPayload(payload);
  const reasonCodes = Array.isArray(payload.exitReasons)
    ? payload.exitReasons.map((entry) => typeof entry === "string" ? entry : entry?.code).filter((entry) => typeof entry === "string")
    : [];
  if ([nativeError?.code, ...reasonCodes].some((code) => /(?:^|_)TARGET_BASELINE_DRIFT$/u.test(code ?? ""))) {
    summary.currentness = "historical-only";
    summary.issueCodes = ["TARGET_BASELINE_DRIFT"];
  }
  if (result !== "pass") return summary;

  assertOperationOutputShape(operation, payload);
  const expected = expectedEvidenceContext(expectedEvidence);
  if (operation === "validate") return { ...summary, ...summarizeValidatePass(payload, expected) };
  if (operation === "verify-receipt") return { ...summary, ...summarizeVerifyPass(payload, expected) };
  let observedProjection;
  let receiptSummary = null;
  if (operation === "shadow") {
    receiptSummary = summarizeVerifiedReceipt({ label: "native Shadow Receipt", value: payload, receiptSha256: sha256(stdout) }, { schema: expected.receiptSchema });
    observedProjection = receiptSummary.bindingProjection;
  }
  const expectedProjection = expected.bindingProjection;
  if (stableJson(observedProjection) !== stableJson(expectedProjection)) fail("NATIVE_BINDING_MISMATCH", "native PASS does not bind exact discovered inputs");

  summary.currentness = "current";
  summary.bindingDigest = fingerprint(observedProjection);
  summary.candidateDigest = observedProjection.candidateDigest;
  summary.sourceCommit = observedProjection.sourceCommit;
  summary.targetBaselineCommit = observedProjection.targetBaselineCommit;
  summary.checkerVersionSha256 = sha256(observedProjection.checkerVersion);
  summary.checkerBundleDigest = observedProjection.checkerBundleDigest;
  summary.checkerReleaseCommit = observedProjection.checkerReleaseCommit;
  summary.executionCommit = observedProjection.executionCommit;
  summary.directParentManifestSha256 = observedProjection.directParentManifestSha256;
  if (receiptSummary) {
    summary.semanticReceiptDigest = receiptSummary.digest.semanticDigest;
    summary.rawReceiptDigest = receiptSummary.digest.rawDigest;
    summary.semanticDigestVerified = true;
  }
  return summary;
}

export function buildNativeInvocation(options, context) {
  const expected = OPERATION_MAP[options.operation];
  if (!expected) fail("OPERATION_FORBIDDEN", "operation is forbidden");
  if (["shadow", "verify-receipt"].includes(options.operation) && options.allowShadow !== true) fail("SHADOW_NOT_EXPLICITLY_ALLOWED", "Shadow-capable invocation requires explicit Shadow authorization");
  const nativeOperation = context?.nativeCli?.[expected.contextKey];
  if (
    !nativeOperation ||
    nativeOperation.scriptName !== expected.scriptName ||
    nativeOperation.subcommand !== expected.subcommand ||
    typeof nativeOperation.entryPath !== "string"
  ) {
    fail("NATIVE_OPERATION_MAPPING_INVALID", "discovered native operation does not exactly match the requested operation");
  }
  assertSafeRepoRelativePath(nativeOperation.entryPath, "native CLI entry");
  const args = [nativeOperation.entryPath, expected.subcommand];
  if (options.operation === "validate") {
    args.push("--manifest", context.manifestSelector, "--json");
  } else if (options.operation === "shadow") {
    args.push("--manifest", context.manifestSelector, "--run-id", options.runId, "--json");
  } else {
    const receipt = options.receiptInvocationPath ?? options.receipt ?? context.receiptSelector;
    if (options.receiptInvocationPath) {
      if (!isAbsolute(receipt) || context.verifiedReceiptCopyPath !== receipt) fail("RECEIPT_TRANSPORT_PATH_INVALID", "verify invocation path is not the internally owned verified copy");
    } else {
      assertSafeReceiptRelativePath(receipt);
    }
    args.push("--receipt", receipt, "--json");
  }
  return {
    command: process.execPath,
    args,
    scriptName: nativeOperation.scriptName,
    invocationSha256: sha256([process.execPath, ...args].join("\0")),
  };
}

export function buildSanitizedEnvironment(sourceEnvironment = process.env) {
  const allowed = ["PATH", "TMPDIR", "LANG", "LC_ALL", "CI"];
  const environment = {};
  for (const key of allowed) if (typeof sourceEnvironment[key] === "string") environment[key] = sourceEnvironment[key];
  environment.NEXT_TELEMETRY_DISABLED = "1";
  environment.NO_COLOR = "1";
  return environment;
}

export function classifyNativeSpawnFailure(nativeResult) {
  if (nativeResult?.error?.code === "ETIMEDOUT") return { code: "NATIVE_TIMEOUT", exitCode: 3 };
  if (nativeResult?.error) return { code: "NATIVE_SPAWN_FAILED", exitCode: 3 };
  if (nativeResult?.signal) return { code: "NATIVE_TERMINATED", exitCode: 3 };
  return null;
}

export function assertUnchangedAuthoritativeSnapshot(before, after) {
  const fields = ["head", "clean", "statusSha256", "authoritativeDigest", "registeredDigest"];
  if (fields.some((field) => before?.[field] !== after?.[field])) {
    fail("REPOSITORY_MUTATED_DURING_NATIVE_RUN", "authoritative repository snapshot changed during native execution");
  }
}

export function buildDryRunSummary(options, envelope, context, invocation) {
  return {
    tool: "run-native-promotion-gate",
    result: "dry-run",
    authoritative: false,
    operation: options.operation,
    repositoryHead: envelope.repository.head,
    manifestSha256: envelope.nativeArtifacts.manifest.sha256,
    canonicalReceiptSha256: envelope.nativeArtifacts.canonicalReceipt?.sha256 ?? null,
    nativeScriptRef: redactedRef(invocation.scriptName),
    invocationSha256: invocation.invocationSha256,
    bindingDigest: context.bindingDigest,
    wouldExecute: false,
    shadowReplayRequired: options.operation === "verify-receipt",
    shadowAuthorizationGranted: options.allowShadow === true,
    receiptTransport: options.operation === "verify-receipt" ? {
      storageCommit: options.storageCommit,
      receiptSha256: options.receiptSha256,
      gitMode: context.canonicalReceiptEvidence?.gitMode ?? null,
      gitObjectIdSha256: context.canonicalReceiptEvidence?.gitObjectId ? sha256(context.canonicalReceiptEvidence.gitObjectId) : null,
      ownedTempCopyOnExecute: true,
    } : null,
    liveAllowed: false,
  };
}

async function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseNativeArgs(argv);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ tool: "run-native-promotion-gate", result: "blocked", issues: [{ code: error.code ?? "USAGE_INVALID" }] })}\n`);
    return 2;
  }
  if (options.help) {
    printHelp();
    return 0;
  }
  try {
    const repositoryAdapter = createGitRepositoryAdapter(options.repo);
    const receiptArtifact = options.operation === "verify-receipt"
      ? await resolveFinalizedReceiptTransport(options.repo, options, repositoryAdapter)
      : null;
    const { envelope, context } = await discoverNativePromotionContext(options.repo, {
      expectedHead: options.expectedHead,
      operation: options.operation,
      repositoryAdapter,
      ...(receiptArtifact ? { receiptArtifact, storageCommit: options.storageCommit } : {}),
    });
    if (context.nativeExecutionBlockers.length > 0) {
      process.stdout.write(`${JSON.stringify({
        tool: "run-native-promotion-gate",
        result: "blocked",
        repositoryHead: envelope.repository.head,
        issues: context.nativeExecutionBlockers.map((code) => ({ code })),
        liveAllowed: false,
      })}\n`);
      return 2;
    }
    if (options.operation === "verify-receipt") options.receiptEvidence = context.canonicalReceiptEvidence;
    const invocation = buildNativeInvocation(options, context);
    if (!options.execute) {
      process.stdout.write(`${JSON.stringify(buildDryRunSummary(options, envelope, context, invocation))}\n`);
      return 0;
    }

    const before = await snapshotAuthoritativeState(context);
    if (!before.clean || before.head !== envelope.repository.head) {
      process.stdout.write(`${JSON.stringify({ tool: "run-native-promotion-gate", result: "blocked", issues: [{ code: "NATIVE_EXECUTION_REQUIRES_CLEAN_CURRENT_SNAPSHOT" }] })}\n`);
      return 2;
    }
    let native;
    let copiedReceipt = null;
    try {
      if (receiptArtifact) {
        copiedReceipt = await copyVerifiedReceiptToOwnedTemp(receiptArtifact);
        options.receiptInvocationPath = copiedReceipt.path;
        context.verifiedReceiptCopyPath = copiedReceipt.path;
      }
      const executionInvocation = buildNativeInvocation(options, context);
      native = spawnSync(executionInvocation.command, executionInvocation.args, {
        cwd: context.repoRoot,
        encoding: "utf8",
        maxBuffer: MAX_OUTPUT_BYTES,
        timeout: NATIVE_TIMEOUT_MS,
        killSignal: "SIGTERM",
        env: buildSanitizedEnvironment(),
      });
    } finally {
      await copiedReceipt?.cleanup();
    }
    const after = await snapshotAuthoritativeState(context);
    assertUnchangedAuthoritativeSnapshot(before, after);

    const spawnFailure = classifyNativeSpawnFailure(native);
    if (spawnFailure) {
      process.stdout.write(`${JSON.stringify({ tool: "run-native-promotion-gate", result: "internal-error", issues: [{ code: spawnFailure.code }] })}\n`);
      return spawnFailure.exitCode;
    }
    if (![0, 1, 2, 3].includes(native.status)) {
      process.stdout.write(`${JSON.stringify({ tool: "run-native-promotion-gate", result: "internal-error", issues: [{ code: "NATIVE_EXIT_INVALID" }] })}\n`);
      return 3;
    }
    let payload;
    try {
      payload = strictJsonParse(native.stdout, "native Promotion output");
    } catch {
      process.stdout.write(`${JSON.stringify({ tool: "run-native-promotion-gate", result: "blocked", issues: [{ code: "NATIVE_OUTPUT_MALFORMED" }] })}\n`);
      return 2;
    }
    const expectedExit = expectedExitForResult(payload.result);
    if (expectedExit !== native.status) {
      process.stdout.write(`${JSON.stringify({ tool: "run-native-promotion-gate", result: "blocked", issues: [{ code: "NATIVE_EXIT_RESULT_MISMATCH" }] })}\n`);
      return 2;
    }
    const summary = summarizeNativeResult(options.operation, payload, native.stdout, {
      bindingProjection: context.bindingProjection,
      manifest: context.manifestEvidence,
      receipt: options.receiptEvidence ?? context.canonicalReceiptEvidence,
      receiptSchema: context.receiptSchema,
    });
    process.stdout.write(`${JSON.stringify({
      tool: "run-native-promotion-gate",
      contract: "EvidenceEnvelopeV1+Promotion-v1",
      authoritative: false,
      summary,
      redaction: {
        protectedContentIncluded: false,
        credentialsIncluded: false,
        rawProviderResponsesIncluded: false,
      },
    })}\n`);
    return native.status;
  } catch (error) {
    const internal = error?.internal === true || error?.code === "GIT_READ_FAILED";
    process.stdout.write(`${JSON.stringify({
      tool: "run-native-promotion-gate",
      result: internal ? "internal-error" : "blocked",
      issues: [{ code: error?.code ?? "UNEXPECTED_INTERNAL_FAILURE" }],
    })}\n`);
    return internal ? 3 : 2;
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().then((code) => { process.exitCode = code; });
}
