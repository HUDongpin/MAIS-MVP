import { createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  auditCalibrationDesign,
  serializeCalibrationArtifact
} from "./calibration-design.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function writeAtomic(filePath, value, mode) {
  await mkdir(path.dirname(filePath), { recursive: true, mode: mode === 0o600 ? 0o700 : 0o755 });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${randomBytes(8).toString("hex")}`;
  try {
    await writeFile(temporaryPath, value, { encoding: "utf8", mode, flag: "wx" });
    await chmod(temporaryPath, mode);
    await rename(temporaryPath, filePath);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}

async function writeJson(filePath, value, mode) {
  const serialized = serializeCalibrationArtifact(value);
  await writeAtomic(filePath, serialized, mode);
  return { path: filePath, sha256: sha256(serialized) };
}

export async function loadOrCreateSeed(seedPath) {
  await mkdir(path.dirname(seedPath), { recursive: true, mode: 0o700 });

  try {
    const existing = (await readFile(seedPath, "utf8")).trim();
    if (!/^[a-f0-9]{64}$/.test(existing)) throw new Error("Existing randomization seed has an invalid shape.");
    await chmod(seedPath, 0o600);
    return existing;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const seed = randomBytes(32).toString("hex");
  try {
    await writeFile(seedPath, `${seed}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await chmod(seedPath, 0o600);
    return seed;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = (await readFile(seedPath, "utf8")).trim();
    if (!/^[a-f0-9]{64}$/.test(existing)) throw new Error("Concurrent randomization seed has an invalid shape.");
    await chmod(seedPath, 0o600);
    return existing;
  }
}

export async function writeCalibrationArtifacts({ design, publicDirectory, sealedDirectory, beforeCommit }) {
  const findings = auditCalibrationDesign(design);
  if (findings.length > 0) {
    throw new Error(`Calibration design audit failed: ${findings.map((row) => row.code).join(", ")}`);
  }

  const packageDirectory = path.join(sealedDirectory, "packages");
  await mkdir(publicDirectory, { recursive: true });
  await mkdir(packageDirectory, { recursive: true, mode: 0o700 });

  const sealedPackageFiles = [];
  const sealedFileCommitments = [];
  for (const row of [...design.packages].sort((left, right) => left.packageId.localeCompare(right.packageId))) {
    const fileName = `${row.packageId}.json`;
    const written = await writeJson(path.join(packageDirectory, fileName), row.content, 0o600);
    sealedFileCommitments.push({ path: path.posix.join("packages", fileName), sha256: written.sha256 });
    sealedPackageFiles.push(fileName);
  }

  for (const [fileName, value] of [
    ["sealed-manifest.json", design.sealedManifest],
    ["gold-ledger.json", design.goldLedger]
  ]) {
    const written = await writeJson(path.join(sealedDirectory, fileName), value, 0o600);
    sealedFileCommitments.push({ path: fileName, sha256: written.sha256 });
  }

  const sealedCommit = {
    protocolId: design.publicManifest.protocolId,
    protocolVersion: design.publicManifest.protocolVersion,
    sourceBaseline: design.publicManifest.sourceBaseline,
    status: "committed-candidate-snapshot",
    formalExecutionAuthorized: false,
    candidateSetSha256: design.candidateSetSha256,
    seedCommitment: design.seedCommitment,
    files: sealedFileCommitments.sort((left, right) => left.path.localeCompare(right.path))
  };
  const sealedCommitWritten = await writeJson(
    path.join(sealedDirectory, "artifact-commit-manifest.json"),
    sealedCommit,
    0o600
  );

  const receipt = {
    protocolId: design.publicManifest.protocolId,
    protocolVersion: design.publicManifest.protocolVersion,
    sourceBaseline: design.publicManifest.sourceBaseline,
    status: "candidate-only",
    formalExecutionAuthorized: false,
    productionAuthorized: false,
    seedCommitment: design.seedCommitment,
    candidateSetSha256: design.candidateSetSha256,
    counts: {
      independentClusters: design.sealedManifest.latentBundles.length,
      packages: design.packages.length,
      questions: design.packages.reduce((sum, row) => sum + row.content.questions.length, 0),
      lessons: design.packages.reduce((sum, row) => sum + row.content.lessons.length, 0),
      browserRoutes: design.packages.reduce((sum, row) => sum + row.content.browserRoutes.length, 0),
      latentDefects: design.goldLedger.latentDefects.length,
      defectInstances: design.goldLedger.instances.length
    },
    sealedPackageFiles,
    checks: [
      "structural-design-audit-pass",
      "public-secret-field-separation-pass",
      "seed-commitment-recorded",
      "candidate-set-commitment-recorded",
      "sealed-files-mode-0600",
      "atomic-file-publication-pass",
      "commit-marker-last",
      "formal-run-disabled"
    ],
    remainingIndependentGates: ["A18-bundle-readiness", "A11-runner-receipt", "A22-isolation", "A25-preflight", "owner-budget-signature"]
  };

  const publicFileCommitments = [];
  for (const [fileName, value] of [
    ["public-manifest.json", design.publicManifest],
    ["f1-generation-receipt.json", receipt]
  ]) {
    const written = await writeJson(path.join(publicDirectory, fileName), value, 0o644);
    publicFileCommitments.push({ path: fileName, sha256: written.sha256 });
  }
  const commitmentText = `${design.seedCommitment}\n`;
  await writeAtomic(path.join(publicDirectory, "seed-commitment.txt"), commitmentText, 0o644);
  publicFileCommitments.push({ path: "seed-commitment.txt", sha256: sha256(commitmentText) });

  if (beforeCommit) await beforeCommit();

  await writeJson(
    path.join(publicDirectory, "f1-artifact-commit.json"),
    {
      protocolId: design.publicManifest.protocolId,
      protocolVersion: design.publicManifest.protocolVersion,
      sourceBaseline: design.publicManifest.sourceBaseline,
      status: "committed-candidate-snapshot",
      formalExecutionAuthorized: false,
      candidateSetSha256: design.candidateSetSha256,
      seedCommitment: design.seedCommitment,
      files: publicFileCommitments.sort((left, right) => left.path.localeCompare(right.path)),
      sealedCommitManifestSha256: sealedCommitWritten.sha256
    },
    0o644
  );

  return receipt;
}
