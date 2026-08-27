import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildReaffirmedEvidence,
  buildReaffirmedLegacyRegistry
} from "./rebase-promotion-baseline.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(repoRoot, "scripts/rebase-promotion-baseline.mjs");
const manifest = "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/promotion-manifest.v2.json";
const revisionRoot = "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/test-dry-run";
const manifestValue = JSON.parse(fs.readFileSync(path.join(repoRoot, manifest), "utf8"));
const protectedFiles = [
  manifest,
  manifestValue.evidenceIndex.path,
  manifestValue.legacyResolution.registryPath,
  ...manifestValue.evidenceBindings.map((binding) => binding.evidencePath)
];

function digestFiles() {
  return protectedFiles.map((file) => ({
    file,
    digest: crypto.createHash("sha256").update(fs.readFileSync(path.join(repoRoot, file))).digest("hex")
  }));
}

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
}

test("baseline re-affirmation exposes an append-only revision and two committed phases", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--revision-root/u);
  assert.match(result.stdout, /--write-evidence/u);
  assert.match(result.stdout, /--write-bindings/u);
  assert.match(result.stdout, /--evidence-commit/u);
});

test("the unsafe monolithic write mode is rejected before changing historical artifacts", () => {
  const before = digestFiles();
  const result = run([
    "--manifest", manifest,
    "--target", "HEAD",
    "--revision-root", revisionRoot,
    "--write"
  ]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Monolithic --write is disabled/u);
  assert.deepEqual(digestFiles(), before);
});

test("dry-run plans ten evidence files and two bindings without mutating history", () => {
  const before = digestFiles();
  const result = run([
    "--manifest", manifest,
    "--target", "HEAD",
    "--revision-root", revisionRoot
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Evidence phase \(10 new files\)/u);
  assert.match(result.stdout, /Binding phase \(2 new files/u);
  assert.match(result.stdout, /DRY RUN — no files written/u);
  assert.equal(fs.existsSync(path.join(repoRoot, revisionRoot)), false);
  assert.deepEqual(digestFiles(), before);
});

test("legacy registry re-affirmation updates only the top-level baseline identity", () => {
  const source = {
    targetBaselineCommit: "1".repeat(40),
    resolutions: [{ resolutionCommits: ["1".repeat(40)] }]
  };
  const next = buildReaffirmedLegacyRegistry(source, "2".repeat(40));
  assert.equal(next.targetBaselineCommit, "2".repeat(40));
  assert.deepEqual(next.resolutions[0].resolutionCommits, ["1".repeat(40)]);
  assert.equal(source.targetBaselineCommit, "1".repeat(40));
});

test("evidence re-affirmation preserves historical commits and records the exact current delta", () => {
  const source = {
    evidenceId: "a23-source",
    role: "A23",
    producedAt: "2026-08-26T00:00:00.000Z",
    targetBaselineCommit: "1".repeat(40),
    semanticPayload: {
      reviewedCompositionCommit: "1".repeat(40),
      targetBaselineCommit: "1".repeat(40),
      legacyResolutionRegistryPath: "old-registry.json",
      legacyResolutionRegistryRawSha256: "a".repeat(64),
      historicalFailure: { liveContractRepairCommit: "1".repeat(40) }
    }
  };
  const next = buildReaffirmedEvidence(source, {
    revisionId: "auth-private-no-store-20260827",
    producedAt: "2026-08-27T00:00:00.000Z",
    targetCommit: "2".repeat(40),
    legacyRegistryPath: "revision/registry.json",
    legacyRegistryRawSha256: "b".repeat(64),
    justificationPath: "justification.md",
    protectedDiff: {
      changedPaths: ["lib/server/authRouteGuards.test.ts", "lib/server/authRouteGuards.ts"],
      testOnlyPaths: ["lib/server/authRouteGuards.test.ts"],
      runtimePaths: ["lib/server/authRouteGuards.ts"]
    },
    sourceEvidencePath: "source.json",
    sourceEvidenceRawSha256: "c".repeat(64)
  });
  assert.equal(next.targetBaselineCommit, "2".repeat(40));
  assert.equal(next.semanticPayload.targetBaselineCommit, "2".repeat(40));
  assert.equal(next.semanticPayload.reviewedCompositionCommit, "1".repeat(40));
  assert.equal(next.semanticPayload.historicalFailure.liveContractRepairCommit, "1".repeat(40));
  assert.equal(next.semanticPayload.legacyResolutionRegistryPath, "revision/registry.json");
  assert.equal(next.semanticPayload.legacyResolutionRegistryRawSha256, "b".repeat(64));
  assert.deepEqual(next.semanticPayload.baselineReaffirmation.runtimeChangedPaths, ["lib/server/authRouteGuards.ts"]);
  assert.equal(source.semanticPayload.targetBaselineCommit, "1".repeat(40));
});
