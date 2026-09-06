import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { buildCalibrationDesign } from "./calibration-design.mjs";
import { writeCalibrationArtifacts } from "./package-artifacts.mjs";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(scriptDirectory, "generate-a18-blind-review-materials.mjs");

test("CLI writes synthetic A18 human-review packets using only explicitly supplied inputs", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-a18-cli-test-"));
  try {
    const seed = "a18-cli-offline-fixture-not-for-formal-randomization";
    const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });
    const publicDirectory = path.join(temporaryRoot, "candidate-public");
    const sealedDirectory = path.join(temporaryRoot, "candidate-sealed");
    await writeCalibrationArtifacts({ design, publicDirectory, sealedDirectory });
    const publicRegistrationPath = path.join(temporaryRoot, "public", "registration.json");
    const restrictedRoot = path.join(temporaryRoot, "restricted");
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      cliPath,
      "--sealed-root", sealedDirectory,
      "--public-manifest", path.join(publicDirectory, "public-manifest.json"),
      "--public-registration", publicRegistrationPath,
      "--restricted-root", restrictedRoot
    ]);
    assert.equal(stderr, "");
    assert.match(stdout, /432 review surfaces/);
    assert.match(stdout, /formal execution remains unauthorized/);
    const registration = JSON.parse(await readFile(publicRegistrationPath, "utf8"));
    assert.equal(registration.candidateSetSha256, design.candidateSetSha256);
    assert.equal(registration.counts.targetQuestionInstances, 216);
    assert.equal(registration.counts.cleanQuestionInstances, 120);
    assert.equal(registration.counts.lessons, 96);
    assert.equal(registration.reviewerBoundary.modelOnlyApprovalForbidden, true);
    assert.equal(`${stdout}${stderr}`.includes(seed), false);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("CLI rejects formal, live-provider, production, and deploy requests before writing", async () => {
  for (const flag of ["--formal-run", "--live-provider", "--production", "--deploy"]) {
    await assert.rejects(
      execFileAsync(process.execPath, [cliPath, flag]),
      (error) => error.code === 2 && /not authorized/.test(error.stderr)
    );
  }
});
