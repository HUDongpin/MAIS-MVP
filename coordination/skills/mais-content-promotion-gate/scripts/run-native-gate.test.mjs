import assert from "node:assert/strict";
import { lstat, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createPromotionTestTempDir } from "./promotion-test-temp.mjs";
import {
  NATIVE_TIMEOUT_MS,
  assertSafeReceiptRelativePath,
  assertUnchangedAuthoritativeSnapshot,
  buildDryRunSummary,
  buildNativeInvocation,
  buildSanitizedEnvironment,
  classifyNativeSpawnFailure,
  copyVerifiedReceiptToOwnedTemp,
  parseNativeArgs,
  resolveFinalizedReceiptTransport,
  summarizeNativeResult,
} from "./run-native-gate.mjs";
import { fingerprint, sha256 } from "./discover-promotion-gate.mjs";
import { fullReceiptTestSchema, makeFullReceipt } from "./promotion-receipt.test-helper.mjs";
import { buildThreePhaseWrapperFixture } from "./promotion-wrapper-integration.test-helper.mjs";

const SCRIPT = resolve(new URL("./run-native-gate.mjs", import.meta.url).pathname);
const VERIFY_TRANSPORT_ARGS = [
  "--receipt", "coordination/integration/receipt.json",
  "--storage-commit", "5".repeat(40),
  "--receipt-sha256", "6".repeat(64),
];
const EXPECTED_BINDING = Object.freeze({
  gateId: "fixture-gate",
  pilotUnitId: "fixture-unit",
  attemptId: "attempt-fixture",
  candidateDigest: "a".repeat(64),
  sourceCommit: "1".repeat(40),
  targetBaselineCommit: "2".repeat(40),
  checkerVersion: "private-checker-name",
  checkerBundleDigest: "b".repeat(64),
  checkerReleaseCommit: "3".repeat(40),
  parentPackageId: "fixture-package",
  parentPackageStatus: "candidate-only",
  executionCommit: "4".repeat(40),
  directParentManifestSha256: "c".repeat(64),
  liveAllowed: false,
});
const NATIVE_BINDING = Object.freeze({
  gateId: EXPECTED_BINDING.gateId,
  pilotUnitId: EXPECTED_BINDING.pilotUnitId,
  attemptId: EXPECTED_BINDING.attemptId,
  candidateDigest: EXPECTED_BINDING.candidateDigest,
  sourceCommit: EXPECTED_BINDING.sourceCommit,
  targetBaselineCommit: EXPECTED_BINDING.targetBaselineCommit,
  checkerVersion: EXPECTED_BINDING.checkerVersion,
  checkerBundleDigest: EXPECTED_BINDING.checkerBundleDigest,
  parentPackageId: EXPECTED_BINDING.parentPackageId,
  parentPackageStatus: EXPECTED_BINDING.parentPackageStatus,
  liveAllowed: false,
});
const CONTEXT = {
  manifestSelector: "coordination/integration/manifest.json",
  receiptSelector: "coordination/integration/receipt.json",
  nativeCli: {
    validate: { scriptName: "promotion:validate", entryPath: "coordination/integration/promotion-cli.mjs", subcommand: "validate" },
    shadow: { scriptName: "promotion:shadow", entryPath: "coordination/integration/promotion-cli.mjs", subcommand: "shadow" },
    verifyReceipt: { scriptName: "promotion:verify-receipt", entryPath: "coordination/integration/promotion-cli.mjs", subcommand: "verify-receipt" },
  },
};

function validatePass(overrides = {}) {
  const checks = [{ id: "manifest-validation-fixture", result: "pass", details: {}, digest: "d".repeat(64) }];
  return {
    schemaVersion: "promotion-validation-result.fixture",
    result: "pass",
    mode: "validate",
    manifest: { path: CONTEXT.manifestSelector, rawSha256: EXPECTED_BINDING.directParentManifestSha256 },
    executionCommit: EXPECTED_BINDING.executionCommit,
    candidateDigest: EXPECTED_BINDING.candidateDigest,
    targetBaselineCommit: EXPECTED_BINDING.targetBaselineCommit,
    checkerBundleDigest: EXPECTED_BINDING.checkerBundleDigest,
    checks,
    checkDigest: fingerprint(checks),
    parentPackageStatus: "candidate-only",
    pilotUnitStatus: "shadow_ready",
    liveAllowed: false,
    ...overrides,
  };
}

function verificationPass(overrides = {}) {
  return {
    schemaVersion: "promotion-receipt-verification.fixture",
    result: "pass",
    valid: true,
    manifestPath: CONTEXT.manifestSelector,
    manifestRawSha256: EXPECTED_BINDING.directParentManifestSha256,
    executionCommit: EXPECTED_BINDING.executionCommit,
    semanticReceiptDigest: "e".repeat(64),
    rawReceiptDigest: "f".repeat(64),
    liveAllowed: false,
    ...overrides,
  };
}

const EXPECTED_NATIVE_EVIDENCE = Object.freeze({
  bindingProjection: EXPECTED_BINDING,
  manifest: {
    path: CONTEXT.manifestSelector,
    rawSha256: EXPECTED_BINDING.directParentManifestSha256,
  },
  receipt: {
    manifestPath: CONTEXT.manifestSelector,
    manifestRawSha256: EXPECTED_BINDING.directParentManifestSha256,
    executionCommit: EXPECTED_BINDING.executionCommit,
    semanticReceiptDigest: "e".repeat(64),
    rawReceiptDigest: "f".repeat(64),
  },
  receiptSchema: fullReceiptTestSchema(),
});

function shadowPass(runId = "fixture-shadow") {
  return makeFullReceipt(runId, (value) => {
    value.manifest = { path: CONTEXT.manifestSelector, rawSha256: EXPECTED_BINDING.directParentManifestSha256 };
    value.binding = { ...NATIVE_BINDING };
    value.worktreeProof.executionCommit = EXPECTED_BINDING.executionCommit;
    value.worktreeProof.pre.headCommit = EXPECTED_BINDING.executionCommit;
    value.worktreeProof.post.headCommit = EXPECTED_BINDING.executionCommit;
    value.provenanceProof.candidateDigest = EXPECTED_BINDING.candidateDigest;
    value.provenanceProof.sourceCommit = EXPECTED_BINDING.sourceCommit;
    value.baselineProof.executionCommit = EXPECTED_BINDING.executionCommit;
    value.baselineProof.targetBaselineCommit = EXPECTED_BINDING.targetBaselineCommit;
    value.checkerReleaseProof.version = EXPECTED_BINDING.checkerVersion;
    value.checkerReleaseProof.bundleDigest = EXPECTED_BINDING.checkerBundleDigest;
    value.checkerReleaseProof.releaseCommit = EXPECTED_BINDING.checkerReleaseCommit;
    value.externalSideEffectProof.checkerBundleDigest = EXPECTED_BINDING.checkerBundleDigest;
    const { digest: _digest, ...externalWithoutDigest } = value.externalSideEffectProof;
    value.externalSideEffectProof.digest = fingerprint(externalWithoutDigest);
    value.manifestParentProof.manifestPath = CONTEXT.manifestSelector;
    value.manifestParentProof.manifestRawSha256 = EXPECTED_BINDING.directParentManifestSha256;
    const candidateCheck = value.checks.find((check) => check.id === "candidate-binding-v2");
    candidateCheck.details.candidateDigest = EXPECTED_BINDING.candidateDigest;
    const { digest: _checkDigest, ...candidateWithoutDigest } = candidateCheck;
    candidateCheck.digest = fingerprint(candidateWithoutDigest);
  });
}

test("Shadow requires --allow-shadow before either planning or execution", () => {
  assert.throws(
    () => parseNativeArgs(["--operation", "shadow", "--run-id", "fixture-run"]),
    (error) => error.code === "SHADOW_NOT_EXPLICITLY_ALLOWED",
  );
  const parsed = parseNativeArgs(["--operation", "shadow", "--run-id", "fixture-run", "--allow-shadow"]);
  assert.equal(parsed.execute, false);
  assert.equal(parsed.allowShadow, true);
  assert.throws(
    () => buildNativeInvocation({ ...parsed, allowShadow: false }, CONTEXT),
    (error) => error.code === "SHADOW_NOT_EXPLICITLY_ALLOWED",
  );
});

test("verify-receipt requires explicit Shadow replay authorization before planning or execution", () => {
  assert.throws(
    () => parseNativeArgs(["--operation", "verify-receipt"]),
    (error) => error.code === "SHADOW_NOT_EXPLICITLY_ALLOWED",
  );
  assert.throws(
    () => parseNativeArgs(["--operation", "verify-receipt", "--execute"]),
    (error) => error.code === "SHADOW_NOT_EXPLICITLY_ALLOWED",
  );
  const planned = parseNativeArgs(["--operation", "verify-receipt", ...VERIFY_TRANSPORT_ARGS, "--allow-shadow"]);
  assert.equal(planned.execute, false);
  assert.equal(planned.allowShadow, true);
  const invocation = buildNativeInvocation(planned, CONTEXT);
  assert.equal(invocation.args[1], "verify-receipt");
  const replayAlias = parseNativeArgs(["--operation", "verify-receipt", ...VERIFY_TRANSPORT_ARGS, "--allow-replay-shadow"]);
  assert.equal(replayAlias.allowShadow, true);
  assert.throws(
    () => buildNativeInvocation({ ...planned, allowShadow: false }, CONTEXT),
    (error) => error.code === "SHADOW_NOT_EXPLICITLY_ALLOWED",
  );
});

test("verify-receipt requires an exact finalization commit and Git-blob digest transport", () => {
  assert.throws(
    () => parseNativeArgs(["--operation", "verify-receipt", "--receipt", "coordination/integration/receipt.json", "--allow-replay-shadow"]),
    (error) => error.code === "RECEIPT_TRANSPORT_REQUIRED",
  );
  const parsed = parseNativeArgs([
    "--operation", "verify-receipt",
    "--receipt", "coordination/integration/receipt.json",
    "--storage-commit", "5".repeat(40),
    "--receipt-sha256", "6".repeat(64),
    "--allow-replay-shadow",
  ]);
  assert.equal(parsed.storageCommit, "5".repeat(40));
  assert.equal(parsed.receiptSha256, "6".repeat(64));
});

test("verify dry-run plan explicitly discloses replay authorization and no execution", () => {
  const options = parseNativeArgs(["--operation", "verify-receipt", ...VERIFY_TRANSPORT_ARGS, "--allow-replay-shadow"]);
  const summary = buildDryRunSummary(
    options,
    {
      repository: { head: EXPECTED_BINDING.executionCommit },
      nativeArtifacts: {
        manifest: { sha256: EXPECTED_BINDING.directParentManifestSha256 },
        canonicalReceipt: { sha256: "d".repeat(64) },
      },
    },
    { bindingDigest: "e".repeat(64) },
    { scriptName: "promotion:verify-receipt", invocationSha256: "f".repeat(64) },
  );
  assert.equal(summary.result, "dry-run");
  assert.equal(summary.operation, "verify-receipt");
  assert.equal(summary.wouldExecute, false);
  assert.equal(summary.shadowReplayRequired, true);
  assert.equal(summary.shadowAuthorizationGranted, true);
  assert.equal(summary.receiptTransport.storageCommit, "5".repeat(40));
  assert.equal(summary.receiptTransport.receiptSha256, "6".repeat(64));
  assert.equal(summary.receiptTransport.ownedTempCopyOnExecute, true);
  assert.equal(summary.liveAllowed, false);
});

test("maps validate, Shadow, and verify to only their exact native operations", () => {
  const validate = buildNativeInvocation(parseNativeArgs(["--operation", "validate"]), CONTEXT);
  assert.deepEqual(validate.args, [CONTEXT.nativeCli.validate.entryPath, "validate", "--manifest", CONTEXT.manifestSelector, "--json"]);
  assert.doesNotMatch(validate.args.join(" "), /\bshadow\b/u);

  const shadow = buildNativeInvocation(parseNativeArgs(["--operation", "shadow", "--run-id", "fixture-run", "--allow-shadow"]), CONTEXT);
  assert.equal(shadow.args[1], "shadow");
  const verify = buildNativeInvocation(parseNativeArgs(["--operation", "verify-receipt", ...VERIFY_TRANSPORT_ARGS, "--allow-shadow"]), CONTEXT);
  assert.equal(verify.args[1], "verify-receipt");

  const poisoned = structuredClone(CONTEXT);
  poisoned.nativeCli.validate.subcommand = "shadow";
  assert.throws(
    () => buildNativeInvocation(parseNativeArgs(["--operation", "validate"]), poisoned),
    (error) => error.code === "NATIVE_OPERATION_MAPPING_INVALID",
  );
});

test("verify invocation accepts only the internally owned verified temp copy", () => {
  const options = parseNativeArgs(["--operation", "verify-receipt", ...VERIFY_TRANSPORT_ARGS, "--allow-shadow"]);
  options.receiptInvocationPath = "/private/tmp/promotion-receipt-transport-owned/receipt.json";
  const context = { ...CONTEXT, verifiedReceiptCopyPath: options.receiptInvocationPath };
  const invocation = buildNativeInvocation(options, context);
  assert.deepEqual(invocation.args.slice(-3), ["--receipt", options.receiptInvocationPath, "--json"]);
  assert.throws(
    () => buildNativeInvocation(options, { ...context, verifiedReceiptCopyPath: "/private/tmp/other/receipt.json" }),
    (error) => error.code === "RECEIPT_TRANSPORT_PATH_INVALID",
  );
});

test("rejects live or deploy operation names before repository access", () => {
  assert.throws(() => parseNativeArgs(["--operation", "live"]), (error) => error.code === "OPERATION_FORBIDDEN");
  const result = spawnSync(process.execPath, [SCRIPT, "--operation", "deploy"], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stdout, /OPERATION_FORBIDDEN/u);
});

test("sanitized child environment excludes NODE_OPTIONS and credential-like variables", () => {
  const environment = buildSanitizedEnvironment({
    PATH: "/safe/bin",
    TMPDIR: "/safe/tmp",
    LANG: "C.UTF-8",
    CI: "true",
    NODE_OPTIONS: "--require=/tmp/injected.cjs",
    OPENAI_API_KEY: "fixture-key-not-real",
    ACCESS_TOKEN: "fixture-token-not-real",
    CLIENT_SECRET: "fixture-secret-not-real",
    DB_CREDENTIAL: "fixture-credential-not-real",
  });
  assert.deepEqual(environment, {
    PATH: "/safe/bin",
    TMPDIR: "/safe/tmp",
    LANG: "C.UTF-8",
    CI: "true",
    NEXT_TELEMETRY_DISABLED: "1",
    NO_COLOR: "1",
  });
  assert.equal(Object.keys(environment).some((key) => /NODE_OPTIONS|KEY|TOKEN|SECRET|CREDENTIAL/iu.test(key)), false);
});

test("Receipt override rejects absolute and traversal paths before discovery", () => {
  assert.throws(() => parseNativeArgs(["--operation", "verify-receipt", "--allow-shadow", "--receipt", "/tmp/receipt.json"]), (error) => error.code === "RECEIPT_PATH_UNSAFE");
  assert.throws(() => assertSafeReceiptRelativePath("../receipt.json"), (error) => error.code === "RECEIPT_PATH_UNSAFE");
});

test("finalized Receipt transport binds descendant commit, regular Git blob, path, mode, object, and SHA", async (t) => {
  const root = await createPromotionTestTempDir(t, "promotion-finalized-receipt-");
  const value = shadowPass("transported-receipt");
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  const executionCommit = "4".repeat(40);
  const storageCommit = "5".repeat(40);
  const receiptPath = "coordination/integration/receipt.json";
  const adapter = {
    async head() { return executionCommit; },
    async commitExists(commit) { return [executionCommit, storageCommit].includes(commit); },
    async isAncestor(ancestor, descendant) { return ancestor === executionCommit && descendant === storageCommit; },
    async treeEntry(commit, pathValue) {
      return commit === storageCommit && pathValue === receiptPath
        ? { mode: "100644", type: "blob", objectId: "7".repeat(40), path: pathValue }
        : null;
    },
    async blob(commit, pathValue) { return commit === storageCommit && pathValue === receiptPath ? bytes : null; },
  };
  const artifact = await resolveFinalizedReceiptTransport(root, {
    receipt: receiptPath,
    storageCommit,
    receiptSha256: sha256(bytes),
  }, adapter);
  assert.equal(artifact.sha256, sha256(bytes));
  assert.equal(artifact.gitMode, "100644");
  assert.equal(artifact.gitObjectId, "7".repeat(40));
  assert.equal(artifact.storageCommit, storageCommit);
  await assert.rejects(
    resolveFinalizedReceiptTransport(root, { receipt: receiptPath, storageCommit, receiptSha256: "8".repeat(64) }, adapter),
    (error) => error.code === "RECEIPT_STORAGE_DIGEST_MISMATCH",
  );
  await assert.rejects(
    resolveFinalizedReceiptTransport(root, { receipt: receiptPath, storageCommit: executionCommit, receiptSha256: sha256(bytes) }, adapter),
    (error) => error.code === "RECEIPT_STORAGE_COMMIT_INVALID",
  );
  const preboundAtExecution = {
    ...adapter,
    async treeEntry(commit, pathValue) {
      if (pathValue !== receiptPath) return null;
      if ([executionCommit, storageCommit].includes(commit)) return { mode: "100644", type: "blob", objectId: "7".repeat(40), path: pathValue };
      return null;
    },
  };
  await assert.rejects(
    resolveFinalizedReceiptTransport(root, { receipt: receiptPath, storageCommit, receiptSha256: sha256(bytes) }, preboundAtExecution),
    (error) => error.code === "RECEIPT_PREBOUND_AT_EXECUTION",
  );
  const invalidMode = {
    ...adapter,
    async treeEntry(commit, pathValue) {
      const entry = await adapter.treeEntry(commit, pathValue);
      return entry ? { ...entry, mode: "120000" } : null;
    },
  };
  await assert.rejects(
    resolveFinalizedReceiptTransport(root, { receipt: receiptPath, storageCommit, receiptSha256: sha256(bytes) }, invalidMode),
    (error) => error.code === "ARTIFACT_GIT_BLOB_INVALID",
  );
  const invalidObject = {
    ...adapter,
    async treeEntry(commit, pathValue) {
      const entry = await adapter.treeEntry(commit, pathValue);
      return entry ? { ...entry, objectId: "not-a-git-object" } : null;
    },
  };
  await assert.rejects(
    resolveFinalizedReceiptTransport(root, { receipt: receiptPath, storageCommit, receiptSha256: sha256(bytes) }, invalidObject),
    (error) => error.code === "ARTIFACT_GIT_BLOB_INVALID",
  );
  const mismatchedPath = {
    ...adapter,
    async treeEntry(commit, pathValue) {
      const entry = await adapter.treeEntry(commit, pathValue);
      return entry ? { ...entry, path: "coordination/integration/other.json" } : null;
    },
  };
  await assert.rejects(
    resolveFinalizedReceiptTransport(root, { receipt: receiptPath, storageCommit, receiptSha256: sha256(bytes) }, mismatchedPath),
    (error) => error.code === "ARTIFACT_GIT_BLOB_INVALID",
  );
});

test("verified Receipt bytes are copied only to a private owned temp file and are cleanable", async (t) => {
  const bytes = Buffer.from("{\"fixture\":true}\n", "utf8");
  const copied = await copyVerifiedReceiptToOwnedTemp({ bytes, sha256: sha256(bytes) });
  t.after(copied.cleanup);
  assert.equal((await readFile(copied.path)).equals(bytes), true);
  assert.equal((await lstat(copied.path)).mode & 0o077, 0);
  assert.match(copied.path, /promotion-receipt-transport-/u);
  await copied.cleanup();
  await assert.rejects(lstat(copied.root), (error) => error.code === "ENOENT");
});

test("native execution has bounded timeout classification", () => {
  assert.equal(NATIVE_TIMEOUT_MS, 60_000);
  const timeout = new Error("synthetic timeout");
  timeout.code = "ETIMEDOUT";
  assert.deepEqual(classifyNativeSpawnFailure({ status: null, signal: "SIGTERM", error: timeout }), { code: "NATIVE_TIMEOUT", exitCode: 3 });
  assert.deepEqual(classifyNativeSpawnFailure({ status: null, signal: "SIGTERM" }), { code: "NATIVE_TERMINATED", exitCode: 3 });
});

test("native validate PASS proves only the exact current Manifest fields actually exported by the native CLI", () => {
  const payload = validatePass();
  const summary = summarizeNativeResult("validate", payload, JSON.stringify(payload), EXPECTED_NATIVE_EVIDENCE);
  assert.equal(summary.currentness, "current-manifest-only");
  assert.equal(summary.evidenceLayer, "manifest-validation");
  assert.equal(summary.shadowAuthority, false);
  assert.equal(summary.lifecycleAuthority, "none");
  assert.equal(summary.candidateDigest, EXPECTED_BINDING.candidateDigest);
  assert.equal(Object.hasOwn(summary, "sourceCommit"), false);
  assert.equal(Object.hasOwn(summary, "checkerReleaseCommit"), false);
  assert.equal(Object.hasOwn(summary, "directParentManifestSha256"), false);
  assert.equal(JSON.stringify(summary).includes("private-checker-name"), false);
  assert.throws(
    () => summarizeNativeResult("validate", { ...payload, targetBaselineCommit: "9".repeat(40) }, "{}", EXPECTED_NATIVE_EVIDENCE),
    (error) => error.code === "NATIVE_VALIDATE_EVIDENCE_MISMATCH",
  );
  assert.throws(
    () => summarizeNativeResult("validate", { ...payload, checkDigest: "0".repeat(64) }, "{}", EXPECTED_NATIVE_EVIDENCE),
    (error) => error.code === "NATIVE_VALIDATE_EVIDENCE_MALFORMED",
  );
});

test("native verify PASS proves only the named Receipt digest fields actually exported by the native CLI", () => {
  const payload = verificationPass();
  const summary = summarizeNativeResult("verify-receipt", payload, JSON.stringify(payload), EXPECTED_NATIVE_EVIDENCE);
  assert.equal(summary.currentness, "current-receipt-only");
  assert.equal(summary.evidenceLayer, "receipt-digest-verification");
  assert.equal(summary.shadowAuthority, false);
  assert.equal(summary.lifecycleAuthority, "none");
  assert.equal(summary.semanticReceiptDigest, payload.semanticReceiptDigest);
  assert.equal(Object.hasOwn(summary, "candidateDigest"), false);
  assert.equal(Object.hasOwn(summary, "targetBaselineCommit"), false);
  assert.throws(
    () => summarizeNativeResult("verify-receipt", { ...payload, rawReceiptDigest: "0".repeat(64) }, "{}", EXPECTED_NATIVE_EVIDENCE),
    (error) => error.code === "NATIVE_VERIFY_EVIDENCE_MISMATCH",
  );
});

test("Shadow PASS recomputes the native Receipt instead of trusting declared digests", () => {
  const payload = shadowPass();
  const summary = summarizeNativeResult("shadow", payload, JSON.stringify(payload), EXPECTED_NATIVE_EVIDENCE);
  assert.equal(summary.currentness, "current");
  assert.equal(summary.semanticDigestVerified, true);
  assert.throws(
    () => summarizeNativeResult("shadow", { ...payload, semanticReceiptDigest: "0".repeat(64) }, "{}", EXPECTED_NATIVE_EVIDENCE),
    (error) => error.code === "RECEIPT_DIGEST_MISMATCH",
  );
});

test("classifies protected runtime drift as historical-only", () => {
  const payload = { result: "fail", liveAllowed: false, exitReasons: [{ code: "V17_TARGET_BASELINE_DRIFT" }] };
  const summary = summarizeNativeResult("validate", payload, JSON.stringify(payload), EXPECTED_NATIVE_EVIDENCE);
  assert.equal(summary.currentness, "historical-only");
  assert.deepEqual(summary.issueCodes, ["TARGET_BASELINE_DRIFT"]);
});

test("classifies the exact native Promotion error payload for target-baseline drift without echoing details", () => {
  const payload = {
    schemaVersion: "promotion-gate-error.v2",
    result: "blocked",
    code: "V2_TARGET_BASELINE_DRIFT",
    message: "SENSITIVE_NATIVE_MESSAGE_NOT_FOR_HANDOFF",
    details: {
      changedPathCount: 1,
      changedPathsDigest: "d".repeat(64),
      sensitivePath: "SENSITIVE_NATIVE_PATH_NOT_FOR_HANDOFF",
    },
  };
  const summary = summarizeNativeResult("validate", payload, JSON.stringify(payload), EXPECTED_NATIVE_EVIDENCE);
  assert.equal(summary.currentness, "historical-only");
  assert.deepEqual(summary.issueCodes, ["TARGET_BASELINE_DRIFT"]);
  assert.doesNotMatch(JSON.stringify(summary), /SENSITIVE_NATIVE_(?:MESSAGE|PATH)_NOT_FOR_HANDOFF/u);
});

test("preserves a native fail result when an error payload has no positive live authorization", () => {
  const summary = summarizeNativeResult("validate", { result: "fail", code: "FIXTURE_FAIL" }, "{}", EXPECTED_NATIVE_EVIDENCE);
  assert.equal(summary.result, "fail");
  assert.equal(summary.currentness, "stale");
  assert.equal(summary.liveAllowed, false);
});

test("mutation guard compares HEAD, status, every authoritative record, and registered digests", () => {
  const snapshot = {
    head: "f".repeat(40),
    clean: true,
    statusSha256: sha256(""),
    authoritativeDigest: sha256("authoritative"),
    registeredDigest: sha256("registered"),
  };
  assert.doesNotThrow(() => assertUnchangedAuthoritativeSnapshot(snapshot, { ...snapshot }));
  for (const field of Object.keys(snapshot)) {
    assert.throws(
      () => assertUnchangedAuthoritativeSnapshot(snapshot, { ...snapshot, [field]: field === "clean" ? false : "changed" }),
      (error) => error.code === "REPOSITORY_MUTATED_DURING_NATIVE_RUN",
      field,
    );
  }
});

test("actual wrapper executes validate, fresh Shadow, distinct replay, and transported verify across three immutable phases", async (t) => {
  const fixture = await buildThreePhaseWrapperFixture(t);
  const common = ["--repo", fixture.root, "--expected-head", fixture.executionCommit, "--execute"];
  const validate = spawnSync(process.execPath, [SCRIPT, "--operation", "validate", ...common], { encoding: "utf8" });
  assert.equal(validate.status, 0, validate.stdout || validate.stderr);
  const fresh = spawnSync(process.execPath, [SCRIPT, "--operation", "shadow", "--run-id", "fresh-wrapper", "--allow-shadow", ...common], { encoding: "utf8" });
  assert.equal(fresh.status, 0, fresh.stdout || fresh.stderr);
  const replay = spawnSync(process.execPath, [SCRIPT, "--operation", "shadow", "--run-id", "replay-wrapper", "--allow-shadow", ...common], { encoding: "utf8" });
  assert.equal(replay.status, 0, replay.stdout || replay.stderr);
  const verify = spawnSync(process.execPath, [
    SCRIPT,
    "--operation", "verify-receipt",
    "--receipt", fixture.receiptPath,
    "--storage-commit", fixture.storageCommit,
    "--receipt-sha256", fixture.receiptSha256,
    "--allow-replay-shadow",
    ...common,
  ], { encoding: "utf8" });
  assert.equal(verify.status, 0, verify.stdout || verify.stderr);
  const freshSummary = JSON.parse(fresh.stdout).summary;
  const replaySummary = JSON.parse(replay.stdout).summary;
  const verifySummary = JSON.parse(verify.stdout).summary;
  assert.equal(freshSummary.semanticReceiptDigest, replaySummary.semanticReceiptDigest);
  assert.notEqual(freshSummary.rawReceiptDigest, replaySummary.rawReceiptDigest);
  assert.equal(verifySummary.receiptDigestVerified, true);
  assert.equal(verifySummary.executionCommit, fixture.executionCommit);
  assert.equal(freshSummary.liveAllowed, false);
  assert.equal(verifySummary.liveAllowed, false);
});
