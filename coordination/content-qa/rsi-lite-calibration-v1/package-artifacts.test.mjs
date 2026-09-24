import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildCalibrationDesign } from "./calibration-design.mjs";
import { loadOrCreateSeed, writeCalibrationArtifacts } from "./package-artifacts.mjs";

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mais-rsi-lite-artifacts-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("creates and reuses a restricted randomization seed without printing it", async (t) => {
  const directory = await temporaryDirectory(t);
  const seedPath = path.join(directory, "sealed", "randomization-seed.txt");

  const first = await loadOrCreateSeed(seedPath);
  const second = await loadOrCreateSeed(seedPath);
  const fileMode = (await stat(seedPath)).mode & 0o777;

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(second, first);
  assert.equal(fileMode, 0o600);
});

test("writes redacted public evidence and forty-eight restricted sealed packages", async (t) => {
  const directory = await temporaryDirectory(t);
  const publicDirectory = path.join(directory, "public");
  const sealedDirectory = path.join(directory, "sealed");
  const seed = "artifact-test-seed-not-for-formal-randomization";
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });

  const receipt = await writeCalibrationArtifacts({ design, publicDirectory, sealedDirectory });

  assert.equal(receipt.status, "candidate-only");
  assert.equal(receipt.formalExecutionAuthorized, false);
  assert.equal(receipt.counts.packages, 48);
  assert.equal(receipt.counts.questions, 4_800);
  assert.equal(receipt.counts.lessons, 96);
  assert.equal(receipt.counts.browserRoutes, 0);
  assert.equal(receipt.counts.latentDefects, 54);
  assert.equal(receipt.counts.defectInstances, 216);
  assert.equal(receipt.sealedPackageFiles.length, 48);
  assert.equal(receipt.candidateSetSha256, design.candidateSetSha256);

  const publicManifest = await readFile(path.join(publicDirectory, "public-manifest.json"), "utf8");
  const publicReceipt = await readFile(path.join(publicDirectory, "f1-generation-receipt.json"), "utf8");
  const sealedManifest = await readFile(path.join(sealedDirectory, "sealed-manifest.json"), "utf8");
  const goldLedger = await readFile(path.join(sealedDirectory, "gold-ledger.json"), "utf8");
  const publicCommit = JSON.parse(await readFile(path.join(publicDirectory, "f1-artifact-commit.json"), "utf8"));
  const sealedCommit = JSON.parse(await readFile(path.join(sealedDirectory, "artifact-commit-manifest.json"), "utf8"));

  for (const forbidden of [seed, "latentBundleId", '"arm"', "defect-bearing"]) {
    assert.equal(publicManifest.includes(forbidden), false, forbidden);
    assert.equal(publicReceipt.includes(forbidden), false, forbidden);
  }
  assert.ok(sealedManifest.includes("latentBundleId"));
  assert.ok(goldLedger.includes("latentDefects"));
  assert.equal(publicCommit.status, "committed-candidate-snapshot");
  assert.equal(publicCommit.candidateSetSha256, design.candidateSetSha256);
  assert.equal(sealedCommit.status, "committed-candidate-snapshot");
  assert.equal(sealedCommit.files.length, 50);
  assert.equal(sealedCommit.candidateSetSha256, design.candidateSetSha256);

  const firstPackagePath = path.join(sealedDirectory, "packages", receipt.sealedPackageFiles[0]);
  assert.equal((await stat(firstPackagePath)).mode & 0o777, 0o600);
});

test("publishes the commit marker last so an interrupted write is never a committed snapshot", async (t) => {
  const directory = await temporaryDirectory(t);
  const design = buildCalibrationDesign({
    seed: "interrupted-artifact-test-seed-not-formal",
    itemsPerPackage: 100
  });
  const publicDirectory = path.join(directory, "public");
  const sealedDirectory = path.join(directory, "sealed");

  await assert.rejects(
    writeCalibrationArtifacts({
      design,
      publicDirectory,
      sealedDirectory,
      beforeCommit: async () => {
        throw new Error("simulated pre-commit interruption");
      }
    }),
    /simulated pre-commit interruption/
  );

  await assert.rejects(access(path.join(publicDirectory, "f1-artifact-commit.json")), { code: "ENOENT" });
});

test("refuses to write a structurally invalid design", async (t) => {
  const directory = await temporaryDirectory(t);
  const design = buildCalibrationDesign({
    seed: "invalid-design-test-seed-not-for-formal-use",
    itemsPerPackage: 100
  });
  design.packages.pop();

  await assert.rejects(
    writeCalibrationArtifacts({
      design,
      publicDirectory: path.join(directory, "public"),
      sealedDirectory: path.join(directory, "sealed")
    }),
    /Calibration design audit failed/
  );
});
