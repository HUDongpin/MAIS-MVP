import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(repoRoot, "scripts/rebase-promotion-baseline.mjs");
const manifest = "coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/promotion-manifest.v2.json";
const manifestValue = JSON.parse(fs.readFileSync(path.join(repoRoot, manifest), "utf8"));
const protectedFiles = [
  manifest,
  path.posix.join(path.posix.dirname(manifest), "inputs/evidence-index.v2.json"),
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

test("baseline re-affirmation exposes two committed write phases", () => {
  const result = run(["--help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--write-evidence/u);
  assert.match(result.stdout, /--write-bindings/u);
  assert.match(result.stdout, /--evidence-commit/u);
});

test("the unsafe monolithic write mode is rejected before changing evidence", () => {
  const before = digestFiles();
  const result = run(["--manifest", manifest, "--target", "HEAD", "--write"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Monolithic --write is disabled/u);
  assert.deepEqual(digestFiles(), before);
});

test("dry-run plans both phases without changing Manifest or evidence bytes", () => {
  const before = digestFiles();
  const result = run(["--manifest", manifest, "--target", "HEAD"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Evidence phase \(9 files\)/u);
  assert.match(result.stdout, /Binding phase \(2 files/u);
  assert.match(result.stdout, /DRY RUN — no files written/u);
  assert.deepEqual(digestFiles(), before);
});

test("binding mode bypasses phase-one stale Manifest hash validation", () => {
  const source = fs.readFileSync(script, "utf8");
  const bindingBranch = source.indexOf("if (options.writeBindings) {");
  const rewriteCollection = source.lastIndexOf("const evidenceRewrites = collectEvidenceRewrites(");
  assert.notEqual(bindingBranch, -1);
  assert.notEqual(rewriteCollection, -1);
  assert.ok(bindingBranch < rewriteCollection);
  assert.match(
    source.slice(bindingBranch, rewriteCollection),
    /writeBindingPhase\(options, manifestFile, manifest, targetCommit, evidenceIndex\);[\s\S]*return;/u
  );
});

test("binding mode refreshes the Manifest digest for the rewritten evidence index", () => {
  const source = fs.readFileSync(script, "utf8");
  assert.match(source, /const nextIndexBytes = Buffer\.from\(canonicalJson\(nextIndex\), "utf8"\);/u);
  assert.match(source, /nextManifest\.evidenceIndex\.rawSha256 = sha256\(nextIndexBytes\);/u);
  assert.match(source, /fs\.writeFileSync\(evidenceIndex\.absolute, nextIndexBytes\);/u);
  assert.match(source, /manifest\.targetBaselineCommit === targetCommit && !options\.writeBindings/u);
});
