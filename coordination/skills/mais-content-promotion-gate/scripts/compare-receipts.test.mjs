import assert from "node:assert/strict";
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { compareReceiptValues as compareReceiptValuesWithSchema } from "./compare-receipts.mjs";
import { attachReceiptDigests, fingerprint, sha256, summarizeVerifiedReceipt } from "./discover-promotion-gate.mjs";
import { closedTestSchemaFor, fullReceiptTestSchema, makeFullReceipt, unsafeRehashReceipt } from "./promotion-receipt.test-helper.mjs";
import { buildThreePhaseWrapperFixture } from "./promotion-wrapper-integration.test-helper.mjs";
import { createPromotionTestTempDir } from "./promotion-test-temp.mjs";

const SCRIPT = resolve(new URL("./compare-receipts.mjs", import.meta.url).pathname);
const BINDING = Object.freeze({
  gateId: "fixture-gate",
  pilotUnitId: "fixture-unit",
  attemptId: "attempt-fixture",
  candidateDigest: "a".repeat(64),
  sourceCommit: "1".repeat(40),
  targetBaselineCommit: "2".repeat(40),
  checkerVersion: "promotion-checker-fixture",
  checkerBundleDigest: "b".repeat(64),
  parentPackageId: "fixture-package",
  parentPackageStatus: "candidate-only",
  liveAllowed: false,
});

const FULL_TEST_SCHEMA = fullReceiptTestSchema();

function compareReceiptValues(canonical, fresh, replay) {
  return compareReceiptValuesWithSchema(canonical, fresh, replay, {
    schemaArtifact: { schema: FULL_TEST_SCHEMA, authorityVerified: true, authority: { testOnly: true } },
  });
}

function receipt(runId, overrides = {}) {
  const value = makeFullReceipt(runId);
  delete value.semanticReceiptDigest;
  delete value.rawReceiptDigest;
  for (const [key, replacement] of Object.entries(overrides)) {
    value[key] = replacement && typeof replacement === "object" && !Array.isArray(replacement) && value[key] && typeof value[key] === "object" && !Array.isArray(value[key])
      ? { ...value[key], ...replacement }
      : replacement;
  }
  return attachReceiptDigests(value);
}

function artifact(label, value) {
  return { label, value, receiptSha256: sha256(JSON.stringify(value)) };
}

function mutateAndRehash(runId, mutate) {
  const value = structuredClone(receipt(runId));
  delete value.semanticReceiptDigest;
  delete value.rawReceiptDigest;
  mutate(value);
  return attachReceiptDigests(value);
}

test("accepts distinct raw bytes only after recomputing equal closed semantics", () => {
  const values = [receipt("canonical"), receipt("fresh-run"), receipt("replay-run")];
  const result = compareReceiptValues(...values.map((value, index) => artifact(String(index), value)));
  assert.equal(result.exitCode, 0);
  assert.equal(result.comparison.bindingsEqual, true);
  assert.equal(result.comparison.semanticDigestsEqual, true);
  assert.equal(result.comparison.semanticDigestsVerified, true);
  assert.equal(result.comparison.runIdsDistinct, true);
  assert.equal(result.comparison.rawDigestsEqual, false);
});

test("external-side-effects safe role suffixes and temp paths preserve semantic identity", () => {
  const withRole = (runId, id) => {
    const value = structuredClone(receipt(runId));
    const check = value.checks.find((entry) => entry.id === "external-side-effects-v2");
    check.id = id;
    check.details = { ...check.details };
    const { digest: _oldDigest, ...checkBody } = check;
    check.digest = fingerprint(checkBody);
    return unsafeRehashReceipt(value);
  };
  const canonicalV2 = withRole("canonical-v2", "external-side-effects-v2");
  const freshV3 = withRole("fresh-v3", "external-side-effects-v3");
  const replayV3 = withRole("replay-v3", "external-side-effects-v3");
  assert.notEqual(canonicalV2.semanticReceiptDigest, freshV3.semanticReceiptDigest);
  const result = compareReceiptValues(artifact("canonical", canonicalV2), artifact("fresh", freshV3), artifact("replay", replayV3));
  assert.equal(result.exitCode, 0);
  assert.equal(result.comparison.semanticDigestsEqual, true);
  assert.throws(
    () => compareReceiptValues(
      artifact("canonical", withRole("canonical-arbitrary", "external-side-effects-v2")),
      artifact("fresh", withRole("fresh-arbitrary", "external-side-effects-admin")),
      artifact("replay", withRole("replay-arbitrary", "external-side-effects-admin")),
    ),
    (error) => error.code === "RECEIPT_CHECK_ID_INVALID",
  );
});

test("fails semantic comparison when lifecycle or findings change under the same bindings", () => {
  const changed = receipt("replay-run", {
    unmetConditions: [{ code: "ADDITIONAL_SHADOW_FINDING", owner: "fixture-owner", scope: "shadow" }],
  });
  const result = compareReceiptValues(artifact("canonical", receipt("canonical")), artifact("fresh", receipt("fresh-run")), artifact("replay", changed));
  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.issues, [{ code: "SEMANTIC_RECEIPT_MISMATCH" }]);
  assert.equal(result.comparison.comparisonStatus, "fail");
  assert.equal(result.comparison.comparisonDigest.length, 64);
  for (const label of ["canonical", "fresh", "replay"]) {
    assert.equal(result.comparison[label].receiptSha256.length, 64);
    assert.equal(result.comparison[label].rawDigest.length, 64);
    assert.equal(result.comparison[label].semanticDigest.length, 64);
  }
  assert.equal(JSON.stringify(result).includes("fixture-owner"), false);
  assert.equal(JSON.stringify(result).includes("replay-run"), false);
});

test("fails exact binding comparison when checker release changes", () => {
  const changed = receipt("replay-run", { checkerReleaseProof: { releaseCommit: "5".repeat(40) } });
  const result = compareReceiptValues(artifact("canonical", receipt("canonical")), artifact("fresh", receipt("fresh-run")), artifact("replay", changed));
  assert.equal(result.exitCode, 1);
  assert.ok(result.issues.some(({ code }) => code === "RECEIPT_BINDING_MISMATCH"));
});

test("rejects a reused run identity even if all semantic digests agree", () => {
  const result = compareReceiptValues(
    artifact("canonical", receipt("canonical")),
    artifact("fresh", receipt("same-run")),
    artifact("replay", receipt("same-run")),
  );
  assert.equal(result.exitCode, 1);
  assert.ok(result.issues.some(({ code }) => code === "RUN_ID_NOT_DISTINCT"));
});

test("does not trust a self-declared semantic digest", () => {
  const tampered = { ...receipt("replay-run"), semanticReceiptDigest: "f".repeat(64) };
  assert.throws(
    () => compareReceiptValues(artifact("canonical", receipt("canonical")), artifact("fresh", receipt("fresh-run")), artifact("replay", tampered)),
    (error) => error.code === "RECEIPT_DIGEST_MISMATCH",
  );
});

test("closed projection rejects an unrecognized semantic payload field", () => {
  const tampered = { ...receipt("replay-run"), hiddenApproval: true };
  assert.throws(
    () => compareReceiptValues(artifact("canonical", receipt("canonical")), artifact("fresh", receipt("fresh-run")), artifact("replay", tampered)),
    (error) => error.code === "SCHEMA_VALIDATION_FAILED",
  );
});

test("closed standalone grammar rejects consistently rehashed production, deploy, approval, and live claims", () => {
  const cases = [
    ["production-deploy", (value) => { value.lifecycle.recommendedState = "production-deploy"; }],
    ["approved-for-production", (value) => { value.lifecycle.maturityClaim = "approved-for-production"; }],
    ["deploy-live", (value) => {
      const body = { id: "deploy-live", result: "pass", details: {} };
      value.checks = [{ ...body, digest: fingerprint(body) }];
    }],
    ["production-ready", (value) => { value.lifecycle.maturityClaim = "production-ready"; }],
    ["approved-live-claim", (value) => { value.unmetConditions = [{ approval: "approved", live: true }]; }],
  ];
  for (const [forbiddenValue, mutate] of cases) {
    assert.throws(
      () => {
        const values = ["canonical", "fresh-run", "replay-run"].map((runId) => mutateAndRehash(runId, mutate));
        return compareReceiptValues(...values.map((value, index) => artifact(String(index), value)));
      },
      (error) => error.code === "RECEIPT_PRODUCTION_CLAIM_FORBIDDEN" && !error.message.includes(forbiddenValue),
      forbiddenValue,
    );
  }
});

test("closed standalone grammar rejects rehashed nested side effects and positive authority aliases", () => {
  const cases = [
    ["deployment-performed", (value) => { value.rollbackProof.deploymentPerformed = true; }],
    ["production-write", (value) => { value.externalSideEffectProof.productionWriteCount = 1; }],
    ["approved-for-production", (value) => { value.provenanceProof.approvedForProduction = true; }],
    ["production-rollback", (value) => { value.rollbackProof.productionRollbackVerified = true; }],
    ["release-authorization", (value) => { value.evidenceProof.releaseAuthorization = "granted"; }],
  ];
  for (const [label, mutate] of cases) {
    assert.throws(
      () => {
        const values = ["canonical", "fresh-run", "replay-run"].map((runId) => mutateAndRehash(runId, mutate));
        return compareReceiptValues(...values.map((value, index) => artifact(String(index), value)));
      },
      (error) => ["RECEIPT_PRODUCTION_CLAIM_FORBIDDEN", "RECEIPT_PROOF_GRAMMAR_INVALID"].includes(error.code),
      label,
    );
  }
});

test("recursive side-effect policy rejects counters split across nested aliases", () => {
  const value = makeFullReceipt("nested-side-effect");
  value.externalSideEffectProof.network = { requests: 1 };
  const { digest: _digest, ...externalWithoutDigest } = value.externalSideEffectProof;
  value.externalSideEffectProof.digest = fingerprint(externalWithoutDigest);
  const rehashed = unsafeRehashReceipt(value);
  const schema = fullReceiptTestSchema();
  schema.properties.externalSideEffectProof.properties.network = closedTestSchemaFor(rehashed.externalSideEffectProof.network);
  assert.throws(
    () => summarizeVerifiedReceipt({ label: "nested side-effect Receipt", value: rehashed, receiptSha256: sha256(JSON.stringify(rehashed)) }, { schema }),
    (error) => error.code === "RECEIPT_SIDE_EFFECT_FORBIDDEN",
  );
});

test("recursive authority policy rejects positive status split below production aliases", () => {
  const value = makeFullReceipt("nested-authority");
  value.evidenceProof.production = { status: "ready" };
  const rehashed = unsafeRehashReceipt(value);
  const schema = fullReceiptTestSchema();
  schema.properties.evidenceProof.properties.production = closedTestSchemaFor(rehashed.evidenceProof.production);
  assert.throws(
    () => summarizeVerifiedReceipt({ label: "nested authority Receipt", value: rehashed, receiptSha256: sha256(JSON.stringify(rehashed)) }, { schema }),
    (error) => error.code === "RECEIPT_PRODUCTION_CLAIM_FORBIDDEN",
  );
});

test("full v2 grammar rejects consistently rehashed ci authority and duplicated binding drift", () => {
  const cases = [
    ["ci authority and side effects", (value) => {
      value.run.ciMetadata = {
        approvedForProduction: true,
        deploymentPerformed: true,
        liveStatus: "approved",
        productionWriteCount: 4,
        providerCallCount: 7,
      };
    }],
    ["candidate provenance drift", (value) => { value.provenanceProof.candidateDigest = "d".repeat(64); }],
    ["source provenance drift", (value) => { value.provenanceProof.sourceCommit = "5".repeat(40); }],
    ["baseline drift", (value) => { value.baselineProof.targetBaselineCommit = "6".repeat(40); }],
    ["execution drift", (value) => { value.baselineProof.executionCommit = "7".repeat(40); }],
    ["checker version drift", (value) => { value.checkerReleaseProof.version = "promotion-checker-drift"; }],
    ["checker bundle drift", (value) => { value.checkerReleaseProof.bundleDigest = "e".repeat(64); }],
    ["Manifest parent drift", (value) => { value.manifest.rawSha256 = "f".repeat(64); }],
    ["parent status drift", (value) => { value.lifecycle.parentPackageStatus = "approved"; }],
  ];
  for (const [label, mutate] of cases) {
    const values = ["canonical-full", "fresh-full", "replay-full"].map((runId) => {
      const value = makeFullReceipt(runId);
      mutate(value);
      return unsafeRehashReceipt(value);
    });
    assert.throws(
      () => compareReceiptValues(...values.map((value, index) => artifact(String(index), value))),
      (error) => ["RECEIPT_PRODUCTION_CLAIM_FORBIDDEN", "RECEIPT_PROOF_GRAMMAR_INVALID", "RECEIPT_CROSS_BINDING_INVALID", "RECEIPT_PARENT_STATUS_INVALID"].includes(error.code),
      label,
    );
  }
});

test("repository-native schema can admit a semantically unrelated gate without CA-ratios proof fields", () => {
  const source = makeFullReceipt("generic-native");
  for (const key of [
    "contentProof",
    "candidateSourceProof",
    "shadowOutputProof",
    "compatibilityReportDigest",
    "runtimeAndLegacyProof",
    "liveReachabilityProof",
    "forbiddenPathDiff",
    "rollbackProof",
  ]) delete source[key];
  source.genericPolicyProof = {
    schemaVersion: "promotion-generic-policy-proof.v1",
    policyDigest: "9".repeat(64),
    liveAllowed: false,
  };
  const check = { id: "generic-policy-v1", result: "pass", details: { policyDigest: "9".repeat(64) } };
  source.checks = [{ ...check, digest: fingerprint(check) }];
  const receipt = unsafeRehashReceipt(source);
  const rootKeys = Object.keys(receipt);
  const schema = {
    type: "object",
    required: rootKeys,
    properties: Object.fromEntries(rootKeys.map((key) => [key, {}])),
    additionalProperties: false,
  };
  assert.doesNotThrow(() => summarizeVerifiedReceipt({ label: "generic native Receipt", value: receipt, receiptSha256: sha256(JSON.stringify(receipt)) }, { schema }));
});

test("closed standalone grammar rejects noncanonical timestamps, incomplete bindings, and invalid Shadow lifecycle", () => {
  const invalidCases = [
    ["RECEIPT_TIMESTAMP_INVALID", (value) => { value.run.producedAt = "August 27, 2026"; }],
    ["BINDING_MALFORMED", (value) => { delete value.binding.sourceCommit; }],
    ["RECEIPT_LIFECYCLE_INVALID", (value) => { value.lifecycle.currentState = "production"; }],
    ["RECEIPT_PARENT_STATUS_INVALID", (value) => { value.binding.parentPackageStatus = "approved"; }],
  ];
  for (const [code, mutate] of invalidCases) {
    assert.throws(
      () => {
        const values = ["canonical", "fresh-run", "replay-run"].map((runId) => mutateAndRehash(runId, mutate));
        return compareReceiptValues(...values.map((value, index) => artifact(String(index), value)));
      },
      (error) => error.code === code,
      code,
    );
  }
});

test("returns blocked when a valid native Receipt reports blocked", () => {
  const blocked = receipt("fresh-run", { result: "blocked", exitReasons: [{ code: "FIXTURE_BLOCKED", owner: "fixture-owner", scope: "shadow" }] });
  const result = compareReceiptValues(artifact("canonical", receipt("canonical")), artifact("fresh", blocked), artifact("replay", receipt("replay-run")));
  assert.equal(result.exitCode, 2);
  assert.equal(result.result, "blocked");
});

test("rejects malformed native Receipt digests", () => {
  const malformed = { ...receipt("replay-run"), rawReceiptDigest: "bad" };
  assert.throws(
    () => compareReceiptValues(artifact("canonical", receipt("canonical")), artifact("fresh", receipt("fresh-run")), artifact("replay", malformed)),
    (error) => error.code === "RECEIPT_DIGEST_INVALID",
  );
});

test("public CLI rejects a caller-selected schema even when it relaxes numericOracle", async (t) => {
  const root = await createPromotionTestTempDir(t, "promotion-receipt-cli-pass-");
  const schemaPath = join(root, "schema.json");
  const paths = [join(root, "canonical.json"), join(root, "fresh.json"), join(root, "replay.json")];
  const values = [
    mutateAndRehash("canonical-cli", (value) => { value.contentProof.numericOracle = "reviewer-relaxed"; }),
    mutateAndRehash("fresh-cli", (value) => { value.contentProof.numericOracle = "reviewer-relaxed"; }),
    mutateAndRehash("replay-cli", (value) => { value.contentProof.numericOracle = "reviewer-relaxed"; }),
  ];
  const relaxed = closedTestSchemaFor(values[0]);
  await writeFile(schemaPath, `${JSON.stringify(relaxed)}\n`, "utf8");
  await Promise.all(values.map((value, index) => writeFile(paths[index], `${JSON.stringify(value)}\n`, "utf8")));
  const result = spawnSync(process.execPath, [SCRIPT, "--schema", schemaPath, "--canonical", paths[0], "--fresh", paths[1], "--replay", paths[2]], { encoding: "utf8" });
  assert.equal(result.status, 2, result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.result, "blocked");
  assert.deepEqual(payload.issues, [{ code: "USAGE_INVALID" }]);
  assert.equal(JSON.stringify(payload).includes(root), false);
});

test("public CLI discovers and reports the exact tracked checker-release schema authority", async (t) => {
  const fixture = await buildThreePhaseWrapperFixture(t);
  const checkout = spawnSync("git", ["checkout", "-q", fixture.storageCommit], { cwd: fixture.root, encoding: "utf8" });
  assert.equal(checkout.status, 0, checkout.stderr);
  const canonicalPath = join(fixture.root, fixture.receiptPath);
  const canonical = JSON.parse(await readFile(canonicalPath, "utf8"));
  const outputRoot = await createPromotionTestTempDir(t, "promotion-trusted-schema-cli-");
  const freshPath = join(outputRoot, "fresh.json");
  const replayPath = join(outputRoot, "replay.json");
  const withRunId = (runId) => unsafeRehashReceipt({ ...structuredClone(canonical), run: { ...canonical.run, runId } });
  await writeFile(freshPath, `${JSON.stringify(withRunId("trusted-fresh"))}\n`, "utf8");
  await writeFile(replayPath, `${JSON.stringify(withRunId("trusted-replay"))}\n`, "utf8");
  const result = spawnSync(process.execPath, [SCRIPT,
    "--repo", fixture.root,
    "--manifest", canonical.manifest.path,
    "--canonical", canonicalPath,
    "--fresh", freshPath,
    "--replay", replayPath,
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout || result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.result, "pass");
  assert.equal(payload.schemaAuthority.repositoryHead, fixture.storageCommit);
  assert.equal(payload.schemaAuthority.checker.releaseCommit.length, 40);
  assert.equal(payload.schemaAuthority.checker.bundleDigest.length, 64);
  assert.equal(payload.schemaAuthority.checker.releaseCommitAncestorOfHead, true);
  for (const key of ["manifest", "ledger", "schema", "canonicalReceipt"]) {
    assert.equal(payload.schemaAuthority[key].rawSha256.length, 64);
    assert.match(payload.schemaAuthority[key].gitMode, /^100(?:644|755)$/u);
    assert.match(payload.schemaAuthority[key].gitObject, /^[a-f0-9]{40,64}$/u);
  }
  assert.equal(payload.schemaAuthority.canonicalReceipt.rawSha256, fixture.receiptSha256);
  assert.equal(payload.schemaAuthority.canonicalReceipt.rawDigest, canonical.rawReceiptDigest);
  assert.equal(payload.schemaAuthority.comparator.kind, "external-release-bound");
  assert.equal(payload.schemaAuthority.comparator.workflowSha256.length, 64);
  assert.equal(payload.schemaAuthority.comparator.programSha256, null);
  assert.equal(payload.schemaAuthority.comparator.entrySha256.length, 64);
  assert.equal(payload.schemaAuthority.executionCommit, fixture.executionCommit);
  assert.equal(payload.schemaAuthority.manifestBindingDigest.length, 64);
  const forbiddenValues = new Set([
    canonical.manifest.path,
    fixture.receiptPath,
    ...Object.values(payload.schemaAuthority).filter((value) => typeof value === "string" && value.includes("/")),
  ]);
  const assertRecursivelyRedacted = (value) => {
    if (Array.isArray(value)) return value.forEach(assertRecursivelyRedacted);
    if (!value || typeof value !== "object") {
      if (typeof value === "string") {
        assert.equal(value.includes("/"), false);
        assert.equal(forbiddenValues.has(value), false);
      }
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      assert.doesNotMatch(key, /path/iu);
      assertRecursivelyRedacted(child);
    }
  };
  assertRecursivelyRedacted(payload.schemaAuthority);
});

test("public CLI rejects duplicate keys in canonical, fresh, and replay Receipt inputs", async (t) => {
  const fixture = await buildThreePhaseWrapperFixture(t);
  assert.equal(spawnSync("git", ["checkout", "-q", fixture.storageCommit], { cwd: fixture.root, encoding: "utf8" }).status, 0);
  const canonicalPath = join(fixture.root, fixture.receiptPath);
  const canonical = JSON.parse(await readFile(canonicalPath, "utf8"));
  const outputRoot = await createPromotionTestTempDir(t, "promotion-duplicate-receipt-cli-");
  const freshPath = join(outputRoot, "fresh.json");
  const replayPath = join(outputRoot, "replay.json");
  const fresh = unsafeRehashReceipt({ ...structuredClone(canonical), run: { ...canonical.run, runId: "duplicate-fresh" } });
  const replay = unsafeRehashReceipt({ ...structuredClone(canonical), run: { ...canonical.run, runId: "duplicate-replay" } });
  const run = () => spawnSync(process.execPath, [SCRIPT,
    "--repo", fixture.root,
    "--manifest", canonical.manifest.path,
    "--canonical", canonicalPath,
    "--fresh", freshPath,
    "--replay", replayPath,
  ], { encoding: "utf8" });
  const duplicate = (value, needle) => JSON.stringify(value).replace(needle, `${needle},${needle}`);
  await writeFile(freshPath, duplicate(fresh, '"liveAllowed":false'), "utf8");
  await writeFile(replayPath, JSON.stringify(replay), "utf8");
  let result = run();
  assert.equal(result.status, 2, result.stdout);
  assert.ok(JSON.parse(result.stdout).issues.some(({ code }) => code === "JSON_DUPLICATE_KEY"));
  await writeFile(freshPath, JSON.stringify(fresh), "utf8");
  await writeFile(replayPath, duplicate(replay, `"semanticReceiptDigest":"${replay.semanticReceiptDigest}"`), "utf8");
  result = run();
  assert.equal(result.status, 2, result.stdout);
  assert.ok(JSON.parse(result.stdout).issues.some(({ code }) => code === "JSON_DUPLICATE_KEY"));
  await writeFile(replayPath, JSON.stringify(replay), "utf8");
  await writeFile(canonicalPath, duplicate(canonical, '"liveAllowed":false'), "utf8");
  assert.equal(spawnSync("git", ["add", fixture.receiptPath], { cwd: fixture.root, encoding: "utf8" }).status, 0);
  assert.equal(spawnSync("git", ["commit", "-q", "-m", "duplicate-canonical-receipt-fixture"], { cwd: fixture.root, encoding: "utf8" }).status, 0);
  result = run();
  assert.equal(result.status, 2, result.stdout);
  assert.ok(JSON.parse(result.stdout).issues.some(({ code }) => code === "JSON_DUPLICATE_KEY"));
});

test("public CLI rejects three consistently rehashed Receipts bound to the wrong Manifest candidate", async (t) => {
  const fixture = await buildThreePhaseWrapperFixture(t);
  const checkout = spawnSync("git", ["checkout", "-q", fixture.storageCommit], { cwd: fixture.root, encoding: "utf8" });
  assert.equal(checkout.status, 0, checkout.stderr);
  const canonicalPath = join(fixture.root, fixture.receiptPath);
  const canonical = JSON.parse(await readFile(canonicalPath, "utf8"));
  const wrongCandidate = "d".repeat(64);
  canonical.binding.candidateDigest = wrongCandidate;
  canonical.provenanceProof.candidateDigest = wrongCandidate;
  canonical.checks[0].details.candidateDigest = wrongCandidate;
  const { digest: _oldCheckDigest, ...checkBody } = canonical.checks[0];
  canonical.checks[0].digest = fingerprint(checkBody);
  const wrongCanonical = unsafeRehashReceipt(canonical);
  await writeFile(canonicalPath, `${JSON.stringify(wrongCanonical)}\n`, "utf8");
  assert.equal(spawnSync("git", ["add", fixture.receiptPath], { cwd: fixture.root, encoding: "utf8" }).status, 0);
  assert.equal(spawnSync("git", ["commit", "-q", "-m", "adversarial-wrong-candidate-receipt"], { cwd: fixture.root, encoding: "utf8" }).status, 0);

  const outputRoot = await createPromotionTestTempDir(t, "promotion-wrong-binding-cli-");
  const freshPath = join(outputRoot, "fresh.json");
  const replayPath = join(outputRoot, "replay.json");
  const withRunId = (runId) => unsafeRehashReceipt({ ...structuredClone(wrongCanonical), run: { ...wrongCanonical.run, runId } });
  await writeFile(freshPath, `${JSON.stringify(withRunId("wrong-fresh"))}\n`, "utf8");
  await writeFile(replayPath, `${JSON.stringify(withRunId("wrong-replay"))}\n`, "utf8");
  const result = spawnSync(process.execPath, [SCRIPT,
    "--repo", fixture.root,
    "--manifest", wrongCanonical.manifest.path,
    "--canonical", canonicalPath,
    "--fresh", freshPath,
    "--replay", replayPath,
  ], { encoding: "utf8" });
  assert.equal(result.status, 2, result.stdout || result.stderr);
  assert.ok(JSON.parse(result.stdout).issues.some(({ code }) => code === "BINDING_MISMATCH"));
});

test("pure comparator refuses an unverified schema value", () => {
  assert.throws(
    () => compareReceiptValuesWithSchema(artifact("canonical", receipt("canonical")), artifact("fresh", receipt("fresh")), artifact("replay", receipt("replay")), { schema: FULL_TEST_SCHEMA }),
    (error) => error.code === "RECEIPT_SCHEMA_AUTHORITY_REQUIRED",
  );
});

test("CLI default invocation requires trusted repository discovery inputs", () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stdout, /USAGE_INVALID/u);
});
