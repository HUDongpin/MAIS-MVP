// Test-only builder for an isolated, synthetic, offline Git repository.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { attachReceiptDigests, fingerprint, sha256 } from "./discover-promotion-gate.mjs";
import { closedTestSchemaFor } from "./promotion-receipt.test-helper.mjs";
import { createPromotionTestTempDir } from "./promotion-test-temp.mjs";

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" },
  });
  if (result.status !== 0) throw new Error(`synthetic Git fixture failed: ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

async function writeBytes(root, path, bytes) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), bytes);
  return { path, bytes, rawSha256: sha256(bytes) };
}

async function writeJson(root, path, value) {
  return writeBytes(root, path, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8"));
}

function simpleSchema(schemaVersion) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    required: ["schemaVersion"],
    properties: { schemaVersion: { const: schemaVersion } },
    additionalProperties: true,
  };
}

function nativeCliSource() {
  return `#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stableJson = (value) => Array.isArray(value)
  ? "[" + value.map(stableJson).join(",") + "]"
  : value && typeof value === "object"
    ? "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stableJson(value[key])).join(",") + "}"
    : JSON.stringify(value);
const fingerprint = (value) => sha256(stableJson(value));
const head = () => execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

function semanticProjection(receipt) {
  const body = structuredClone(receipt);
  delete body.semanticReceiptDigest;
  delete body.rawReceiptDigest;
  const external = body.externalSideEffectProof;
  const { digest: _digest, tempEnvironment, ...stableExternal } = external;
  const normalizedExternal = {
    ...stableExternal,
    tempEnvironment: {
      observed: Array.isArray(tempEnvironment) && tempEnvironment.length > 0,
      allOutsideRepository: Array.isArray(tempEnvironment) && tempEnvironment.length > 0 && tempEnvironment.every((entry) => entry?.outsideRepository === true),
    },
  };
  normalizedExternal.digest = fingerprint(normalizedExternal);
  return {
    ...body,
    run: { ...body.run, runId: null, producedAt: null, ciMetadata: null },
    externalSideEffectProof: normalizedExternal,
  };
}

function attachDigests(body) {
  const semanticReceiptDigest = fingerprint(semanticProjection(body));
  const rawReceiptDigest = fingerprint({ ...body, semanticReceiptDigest });
  return { ...body, semanticReceiptDigest, rawReceiptDigest };
}

function parseArgs(argv) {
  const command = argv[0];
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--json") continue;
    options[key.slice(2)] = argv[++index];
  }
  return { command, options };
}

async function buildReceipt(manifestPath, runId) {
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const executionCommit = head();
  const externalWithoutDigest = {
    schemaVersion: "promotion-external-side-effect-proof.generic-v1",
    policy: "read-only-git-local-temp-only.generic-v1",
    checkerBundleDigest: manifest.checkerRelease.bundleDigest,
    registeredOperations: ["read-authoritative-repository-file", "read-only-git-probe", "create-new-os-temp-root", "write-shadow-json-exclusively", "remove-owned-os-temp-root"],
    sourceBindings: [],
    sourceBindingsDigest: fingerprint([]),
    tempEnvironment: [{ name: "synthetic-" + runId, canonicalPathDigest: sha256(runId), outsideRepository: true }],
    networkRequestCount: 0,
    providerCallCount: 0,
    databaseWriteCount: 0,
    deploymentCommandCount: 0,
    productionWriteCount: 0,
    liveRegistryWriteCount: 0,
  };
  const externalSideEffectProof = { ...externalWithoutDigest, digest: fingerprint(externalWithoutDigest) };
  const checkWithoutDigest = { id: "generic-policy-v1", result: "pass", details: { candidateDigest: manifest.candidateDigest } };
  const statusDigest = sha256("");
  const body = {
    schemaVersion: "promotion-receipt.generic-v1",
    manifest: { path: manifestPath, rawSha256: sha256(manifestBytes) },
    run: { runId, producedAt: "2026-08-27T01:02:03.004Z", ciMetadata: null },
    mode: "shadow",
    result: "pass",
    exitReasons: [],
    binding: {
      gateId: manifest.gateId,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      candidateDigest: manifest.candidateDigest,
      sourceCommit: manifest.sourceCommit,
      targetBaselineCommit: manifest.targetBaselineCommit,
      checkerVersion: manifest.checkerVersion,
      checkerBundleDigest: manifest.checkerRelease.bundleDigest,
      parentPackageId: manifest.parentPackage.id,
      parentPackageStatus: "candidate-only",
      liveAllowed: false,
    },
    worktreeProof: {
      cleanBeforeAndAfter: true,
      executionCommit,
      pre: { clean: true, headCommit: executionCommit, schemaVersion: "promotion-worktree-state.generic-v1", statusDigest },
      post: { clean: true, headCommit: executionCommit, schemaVersion: "promotion-worktree-state.generic-v1", statusDigest },
      unchangedHead: true,
    },
    provenanceProof: { candidateDigest: manifest.candidateDigest, sourceCommit: manifest.sourceCommit, sourceCommitIsAncestor: true },
    baselineProof: { executionCommit, targetBaselineCommit: manifest.targetBaselineCommit },
    checkerReleaseProof: {
      version: manifest.checkerVersion,
      bundleDigest: manifest.checkerRelease.bundleDigest,
      bundlePathsDigest: manifest.checkerRelease.bundlePathsDigest,
      ledgerRawSha256: manifest.checkerRelease.ledgerRawSha256,
      releaseCommit: manifest.checkerRelease.releaseCommit,
    },
    externalSideEffectProof,
    checks: [{ ...checkWithoutDigest, digest: fingerprint(checkWithoutDigest) }],
    lifecycle: {
      priorState: "candidate_hold",
      currentState: "shadow_ready",
      recommendedState: "shadow_passed",
      parentPackageStatus: "candidate-only",
      maturityClaim: "shadow-only",
      liveAllowed: false,
    },
    unmetConditions: [{ code: "LIVE_UNPROVEN", owner: "fixture-owner", scope: "live" }],
    genericPolicyProof: {
      policyDigest: sha256("generic-policy"),
      manifestPath,
      manifestRawSha256: sha256(manifestBytes),
      liveAllowed: false,
    },
  };
  return attachDigests(body);
}

const { command, options } = parseArgs(process.argv.slice(2));
try {
  if (command === "validate") {
    const bytes = await readFile(options.manifest);
    const manifest = JSON.parse(bytes.toString("utf8"));
    const checks = [{ id: "manifest-validation-generic-v1", result: "pass", details: {} }];
    process.stdout.write(JSON.stringify({
      schemaVersion: "promotion-validation-result.generic-v1",
      result: "pass",
      mode: "validate",
      manifest: { path: options.manifest, rawSha256: sha256(bytes) },
      executionCommit: head(),
      candidateDigest: manifest.candidateDigest,
      targetBaselineCommit: manifest.targetBaselineCommit,
      checkerBundleDigest: manifest.checkerRelease.bundleDigest,
      checks,
      checkDigest: fingerprint(checks),
      parentPackageStatus: "candidate-only",
      pilotUnitStatus: "shadow_ready",
      liveAllowed: false,
    }) + "\\n");
  } else if (command === "shadow") {
    process.stdout.write(JSON.stringify(await buildReceipt(options.manifest, options["run-id"])) + "\\n");
  } else if (command === "verify-receipt") {
    const receipt = JSON.parse((await readFile(options.receipt)).toString("utf8"));
    const semanticReceiptDigest = fingerprint(semanticProjection(receipt));
    const { rawReceiptDigest: _raw, ...withoutRaw } = receipt;
    const rawReceiptDigest = fingerprint(withoutRaw);
    const valid = semanticReceiptDigest === receipt.semanticReceiptDigest && rawReceiptDigest === receipt.rawReceiptDigest && receipt.worktreeProof.executionCommit === head();
    process.stdout.write(JSON.stringify({
      schemaVersion: "promotion-receipt-verification.generic-v1",
      result: valid ? "pass" : "fail",
      valid,
      manifestPath: receipt.manifest.path,
      manifestRawSha256: receipt.manifest.rawSha256,
      executionCommit: receipt.worktreeProof.executionCommit,
      semanticReceiptDigest: receipt.semanticReceiptDigest,
      rawReceiptDigest: receipt.rawReceiptDigest,
      liveAllowed: false,
    }) + "\\n");
    if (!valid) process.exitCode = 1;
  } else {
    process.stdout.write(JSON.stringify({ schemaVersion: "promotion-gate-error.generic-v1", result: "blocked", code: "GENERIC_USAGE", message: "unsupported" }) + "\\n");
    process.exitCode = 2;
  }
} catch {
  process.stdout.write(JSON.stringify({ schemaVersion: "promotion-gate-error.generic-v1", result: "internal", code: "GENERIC_INTERNAL", message: "internal" }) + "\\n");
  process.exitCode = 3;
}
`;
}

function genericReceiptBody({ manifestPath, manifestRawSha256, manifest, executionCommit, runId }) {
  const externalWithoutDigest = {
    schemaVersion: "promotion-external-side-effect-proof.generic-v1",
    policy: "read-only-git-local-temp-only.generic-v1",
    checkerBundleDigest: manifest.checkerRelease.bundleDigest,
    registeredOperations: ["read-authoritative-repository-file", "read-only-git-probe", "create-new-os-temp-root", "write-shadow-json-exclusively", "remove-owned-os-temp-root"],
    sourceBindings: [],
    sourceBindingsDigest: fingerprint([]),
    tempEnvironment: [{ name: `synthetic-${runId}`, canonicalPathDigest: sha256(runId), outsideRepository: true }],
    networkRequestCount: 0,
    providerCallCount: 0,
    databaseWriteCount: 0,
    deploymentCommandCount: 0,
    productionWriteCount: 0,
    liveRegistryWriteCount: 0,
  };
  const check = { id: "generic-policy-v1", result: "pass", details: { candidateDigest: manifest.candidateDigest } };
  const statusDigest = sha256("");
  return {
    schemaVersion: "promotion-receipt.generic-v1",
    manifest: { path: manifestPath, rawSha256: manifestRawSha256 },
    run: { runId, producedAt: "2026-08-27T01:02:03.004Z", ciMetadata: null },
    mode: "shadow",
    result: "pass",
    exitReasons: [],
    binding: {
      gateId: manifest.gateId,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      candidateDigest: manifest.candidateDigest,
      sourceCommit: manifest.sourceCommit,
      targetBaselineCommit: manifest.targetBaselineCommit,
      checkerVersion: manifest.checkerVersion,
      checkerBundleDigest: manifest.checkerRelease.bundleDigest,
      parentPackageId: manifest.parentPackage.id,
      parentPackageStatus: "candidate-only",
      liveAllowed: false,
    },
    worktreeProof: {
      cleanBeforeAndAfter: true,
      executionCommit,
      pre: { clean: true, headCommit: executionCommit, schemaVersion: "promotion-worktree-state.generic-v1", statusDigest },
      post: { clean: true, headCommit: executionCommit, schemaVersion: "promotion-worktree-state.generic-v1", statusDigest },
      unchangedHead: true,
    },
    provenanceProof: { candidateDigest: manifest.candidateDigest, sourceCommit: manifest.sourceCommit, sourceCommitIsAncestor: true },
    baselineProof: { executionCommit, targetBaselineCommit: manifest.targetBaselineCommit },
    checkerReleaseProof: {
      version: manifest.checkerVersion,
      bundleDigest: manifest.checkerRelease.bundleDigest,
      bundlePathsDigest: manifest.checkerRelease.bundlePathsDigest,
      ledgerRawSha256: manifest.checkerRelease.ledgerRawSha256,
      releaseCommit: manifest.checkerRelease.releaseCommit,
    },
    externalSideEffectProof: { ...externalWithoutDigest, digest: fingerprint(externalWithoutDigest) },
    checks: [{ ...check, digest: fingerprint(check) }],
    lifecycle: {
      priorState: "candidate_hold",
      currentState: "shadow_ready",
      recommendedState: "shadow_passed",
      parentPackageStatus: "candidate-only",
      maturityClaim: "shadow-only",
      liveAllowed: false,
    },
    unmetConditions: [{ code: "LIVE_UNPROVEN", owner: "fixture-owner", scope: "live" }],
    genericPolicyProof: { policyDigest: sha256("generic-policy"), manifestPath, manifestRawSha256, liveAllowed: false },
  };
}

function manifestValue({ attemptId, targetBaselineCommit, sourceCommit, checker, candidateArtifact, evidenceIndex, ownerEvidence }) {
  return {
    schemaVersion: "promotion-manifest.generic-v1",
    gateId: "generic-shadow-gate",
    pilotUnitId: "generic-unit",
    attemptId,
    candidateDigest: "b".repeat(64),
    sourceCommit,
    targetBaselineCommit,
    checkerVersion: checker.version,
    checkerRelease: checker,
    parentPackage: { id: "generic-package", status: "candidate-only" },
    authorizations: { liveAllowed: false },
    candidateArtifacts: [{ path: candidateArtifact.path, rawFileSha256: candidateArtifact.rawSha256 }],
    evidenceIndex: { path: evidenceIndex.path, rawSha256: evidenceIndex.rawSha256 },
    evidenceBindings: [{ role: "A18", evidencePath: ownerEvidence.path, rawSha256: ownerEvidence.rawSha256, expectedResult: "pass" }],
    knownBlockers: [{ scope: "live", code: "LIVE_UNPROVEN" }],
  };
}

function workflowSource(manifestPath, receiptPath, descriptorPath, cliPath) {
  return `name: Generic Promotion fixture
jobs:
  promotion:
    runs-on: ubuntu-latest
    env:
      PROMOTION_MANIFEST: ${manifestPath}
      PROMOTION_CANONICAL_RECEIPT: ${receiptPath}
      PROMOTION_REAFFIRMATION: ${descriptorPath}
      PROMOTION_RUN_ID: fresh-wrapper-run
      PROMOTION_REPLAY_RUN_ID: replay-wrapper-run
    steps:
      - name: Validate
        run: npm run promotion:validate -- --manifest "$PROMOTION_MANIFEST"
      - name: Fresh
        run: npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_RUN_ID"
      - name: Replay
        run: npm run promotion:shadow -- --manifest "$PROMOTION_MANIFEST" --run-id "$PROMOTION_REPLAY_RUN_ID"
      - name: Verify
        run: |
          npm run promotion:verify-receipt -- --receipt "$PROMOTION_CANONICAL_RECEIPT"
          npm run promotion:verify-receipt -- --receipt "$PROMOTION_FRESH_RECEIPT"
          npm run promotion:verify-receipt -- --receipt "$PROMOTION_REPLAY_RECEIPT"
      - name: Compare
        run: node ${cliPath} compare-receipts --manifest "$PROMOTION_MANIFEST" --canonical "$PROMOTION_CANONICAL_RECEIPT" --fresh "$PROMOTION_FRESH_RECEIPT" --replay "$PROMOTION_REPLAY_RECEIPT" --fail-on-mismatch
`;
}

export async function buildThreePhaseWrapperFixture(t) {
  const root = await createPromotionTestTempDir(t, "promotion-wrapper-three-phase-");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Promotion Synthetic Fixture"]);
  git(root, ["config", "user.email", "promotion-fixture@example.invalid"]);

  const cliPath = "coordination/integration/generic-promotion-cli.mjs";
  const manifestSchemaPath = "coordination/integration/schemas/promotion-manifest.generic-v1.schema.json";
  const receiptSchemaPath = "coordination/integration/schemas/promotion-receipt.generic-v1.schema.json";
  const ownerSchemaPath = "coordination/integration/schemas/promotion-owner-evidence.generic-v1.schema.json";
  const candidatePath = "coordination/integration/pilots/generic-unit/candidate.json";
  const baseRoot = "coordination/integration/pilots/generic-unit/attempt-base";
  const revisionRoot = `${baseRoot}/reaffirmations/revision-one`;
  const activeManifestPath = `${revisionRoot}/promotion-manifest.json`;
  const activeReceiptPath = `${revisionRoot}/shadow-receipt.json`;
  const descriptorPath = `${revisionRoot}/reaffirmation.json`;
  const ledgerPath = "coordination/integration/checker-releases.generic-v1.json";

  const sampleManifest = {
    gateId: "generic-shadow-gate",
    pilotUnitId: "generic-unit",
    attemptId: "attempt-sample",
    candidateDigest: "b".repeat(64),
    sourceCommit: "1".repeat(40),
    targetBaselineCommit: "2".repeat(40),
    checkerVersion: "generic-checker-v1",
    checkerRelease: {
      bundleDigest: "c".repeat(64),
      bundlePathsDigest: "d".repeat(64),
      ledgerRawSha256: "e".repeat(64),
      releaseCommit: "3".repeat(40),
    },
    parentPackage: { id: "generic-package" },
  };
  const sampleBody = genericReceiptBody({
    manifestPath: activeManifestPath,
    manifestRawSha256: "f".repeat(64),
    manifest: sampleManifest,
    executionCommit: "4".repeat(40),
    runId: "schema-sample",
  });
  const receiptSchema = closedTestSchemaFor(attachReceiptDigests(sampleBody));
  receiptSchema.properties.schemaVersion = { const: "promotion-receipt.generic-v1" };
  receiptSchema.properties.mode = { const: "shadow" };

  const cli = await writeBytes(root, cliPath, Buffer.from(nativeCliSource(), "utf8"));
  const manifestSchema = await writeJson(root, manifestSchemaPath, simpleSchema("promotion-manifest.generic-v1"));
  const receiptSchemaArtifact = await writeJson(root, receiptSchemaPath, receiptSchema);
  const ownerSchema = await writeJson(root, ownerSchemaPath, simpleSchema("promotion-owner-evidence.generic-v1"));
  const candidateArtifact = await writeJson(root, candidatePath, { kind: "generic-candidate", value: 1 });
  await writeJson(root, "package.json", {
    scripts: {
      "promotion:validate": `node ${cliPath} validate`,
      "promotion:shadow": `node ${cliPath} shadow`,
      "promotion:verify-receipt": `node ${cliPath} verify-receipt`,
    },
  });
  await writeBytes(root, ".github/workflows/promotion.yml", Buffer.from(workflowSource(activeManifestPath, activeReceiptPath, descriptorPath, cliPath), "utf8"));
  git(root, ["add", cliPath, manifestSchemaPath, receiptSchemaPath, ownerSchemaPath, candidatePath, "package.json", ".github/workflows/promotion.yml"]);
  git(root, ["commit", "-q", "-m", "checker-release"]);
  const releaseCommit = git(root, ["rev-parse", "HEAD"]);

  const bundleArtifacts = [cli, manifestSchema, receiptSchemaArtifact, ownerSchema];
  const bundleBindings = bundleArtifacts.map((artifact) => ({ path: artifact.path, rawSha256: artifact.rawSha256 }));
  const bundlePaths = bundleArtifacts.map((artifact) => artifact.path);
  const bundleDigest = fingerprint(bundleBindings);
  const bundlePathsDigest = fingerprint(bundlePaths);
  const checkerVersion = "generic-checker-v1";
  const ledgerArtifact = await writeJson(root, ledgerPath, {
    schemaVersion: "checker-releases.generic-v1",
    entries: [{
      version: checkerVersion,
      bundleAlgorithm: "sha256-stable-json-path-raw-v2",
      bundlePaths,
      bundleDigest,
      releaseCommit,
    }],
  });
  git(root, ["add", ledgerPath]);
  git(root, ["commit", "-q", "-m", "checker-ledger"]);
  const oldBaseline = git(root, ["rev-parse", "HEAD"]);
  const checker = {
    ledgerPath,
    ledgerRawSha256: ledgerArtifact.rawSha256,
    version: checkerVersion,
    bundleAlgorithm: "sha256-stable-json-path-raw-v2",
    bundleDigest,
    bundlePathsDigest,
    releaseCommit,
  };

  const baseEvidenceIndex = await writeJson(root, `${baseRoot}/evidence-index.json`, { schemaVersion: "evidence-index.generic-v1", entries: ["A18"] });
  const baseOwner = await writeJson(root, `${baseRoot}/owner-evidence.json`, {
    schemaVersion: "promotion-owner-evidence.generic-v1",
    role: "A18",
    result: "pass",
    candidateDigest: "b".repeat(64),
    sourceCommit: releaseCommit,
    targetBaselineCommit: oldBaseline,
    checkerVersion,
  });
  const baseManifestValue = manifestValue({
    attemptId: "attempt-base",
    targetBaselineCommit: oldBaseline,
    sourceCommit: releaseCommit,
    checker,
    candidateArtifact,
    evidenceIndex: baseEvidenceIndex,
    ownerEvidence: baseOwner,
  });
  const baseManifest = await writeJson(root, `${baseRoot}/promotion-manifest.json`, baseManifestValue);
  const baseReceiptValue = attachReceiptDigests(genericReceiptBody({
    manifestPath: baseManifest.path,
    manifestRawSha256: baseManifest.rawSha256,
    manifest: baseManifestValue,
    executionCommit: oldBaseline,
    runId: "base-canonical",
  }));
  const baseReceipt = await writeJson(root, `${baseRoot}/shadow-receipt.json`, baseReceiptValue);
  const baseClosure = await writeJson(root, `${baseRoot}/shadow-closure.json`, { schemaVersion: "promotion-shadow-closure.generic-v1", state: "historical-only", liveAllowed: false });
  const baseRegistry = await writeJson(root, `${baseRoot}/lifecycle-registry.json`, { schemaVersion: "promotion-lifecycle-registry.generic-v1", state: "historical-only", liveAllowed: false });
  git(root, ["add", baseRoot]);
  git(root, ["commit", "-q", "-m", "base-attempt-artifacts"]);

  await writeBytes(root, "docs/unrelated-baseline-note.md", Buffer.from("synthetic baseline-only change\n", "utf8"));
  git(root, ["add", "docs/unrelated-baseline-note.md"]);
  git(root, ["commit", "-q", "-m", "baseline-only-change"]);
  const newBaseline = git(root, ["rev-parse", "HEAD"]);
  const changedPaths = git(root, ["diff", "--name-only", oldBaseline, newBaseline, "--"]).split("\n").filter(Boolean).sort();
  const changedPathsDigest = fingerprint(changedPaths);

  const reviewArtifacts = [];
  for (const role of ["A11", "A22", "A25"]) {
    reviewArtifacts.push(await writeJson(root, `${revisionRoot}/baseline-review-${role.toLowerCase()}.json`, {
      role,
      result: "pass",
      liveAllowed: false,
      fromCommit: oldBaseline,
      toCommit: newBaseline,
      changedPathsDigest,
      unrelatedToCandidate: true,
      candidatePathsChanged: false,
      checkerPathsChanged: false,
      candidateDigest: "b".repeat(64),
      sourceCommit: releaseCommit,
      checkerVersion,
      checkerBundleDigest: bundleDigest,
      checkerReleaseCommit: releaseCommit,
    }));
  }
  const activeEvidenceIndex = await writeJson(root, `${revisionRoot}/evidence-index.json`, { schemaVersion: "evidence-index.generic-v1", entries: ["A18"] });
  const activeOwner = await writeJson(root, `${revisionRoot}/owner-evidence.json`, {
    schemaVersion: "promotion-owner-evidence.generic-v1",
    role: "A18",
    result: "pass",
    candidateDigest: "b".repeat(64),
    sourceCommit: releaseCommit,
    targetBaselineCommit: newBaseline,
    checkerVersion,
  });
  git(root, ["add", revisionRoot]);
  git(root, ["commit", "-q", "-m", "independent-baseline-reviews"]);
  const evidenceCommit = git(root, ["rev-parse", "HEAD"]);

  const activeManifestValue = manifestValue({
    attemptId: "attempt-base",
    targetBaselineCommit: newBaseline,
    sourceCommit: releaseCommit,
    checker,
    candidateArtifact,
    evidenceIndex: activeEvidenceIndex,
    ownerEvidence: activeOwner,
  });
  const activeManifest = await writeJson(root, activeManifestPath, activeManifestValue);
  const descriptor = {
    schemaVersion: "promotion-reaffirmation.v1",
    relation: "append-only-reaffirmation",
    bases: [{
      manifest: { path: baseManifest.path, rawSha256: baseManifest.rawSha256 },
      receipt: { path: baseReceipt.path, rawSha256: baseReceipt.rawSha256 },
      closure: { path: baseClosure.path, rawSha256: baseClosure.rawSha256 },
      registry: { path: baseRegistry.path, rawSha256: baseRegistry.rawSha256 },
    }],
    revision: { manifest: { path: activeManifest.path, rawSha256: activeManifest.rawSha256 } },
    unchangedBindings: {
      candidateDigest: "b".repeat(64),
      sourceCommit: releaseCommit,
      checkerVersion,
      checkerBundleDigest: bundleDigest,
      checkerReleaseCommit: releaseCommit,
    },
    baselineDelta: {
      fromCommit: oldBaseline,
      toCommit: newBaseline,
      unrelatedToCandidate: true,
      candidatePathsChanged: false,
      checkerPathsChanged: false,
      changedPathsDigest,
      reviewEvidence: reviewArtifacts.map((artifact, index) => ({ role: ["A11", "A22", "A25"][index], path: artifact.path, rawSha256: artifact.rawSha256 })),
    },
    ordering: { evidenceCommit },
  };
  await writeJson(root, descriptorPath, descriptor);
  git(root, ["add", activeManifestPath, descriptorPath]);
  git(root, ["commit", "-q", "-m", "registered-execution"]);
  const executionCommit = git(root, ["rev-parse", "HEAD"]);

  const nativeShadow = spawnSync(process.execPath, [cliPath, "shadow", "--manifest", activeManifestPath, "--run-id", "canonical-wrapper", "--json"], { cwd: root, encoding: "utf8" });
  if (nativeShadow.status !== 0) throw new Error(`synthetic native Shadow failed: ${nativeShadow.stdout} ${nativeShadow.stderr}`);
  const receiptArtifact = await writeBytes(root, activeReceiptPath, Buffer.from(nativeShadow.stdout, "utf8"));
  git(root, ["add", activeReceiptPath]);
  git(root, ["commit", "-q", "-m", "independent-receipt-finalization"]);
  const storageCommit = git(root, ["rev-parse", "HEAD"]);
  git(root, ["checkout", "-q", executionCommit]);
  if (git(root, ["status", "--porcelain=v1", "--untracked-files=all"]) !== "") throw new Error("synthetic execution checkout is not clean");

  return {
    root,
    executionCommit,
    storageCommit,
    receiptPath: activeReceiptPath,
    receiptSha256: receiptArtifact.rawSha256,
  };
}
