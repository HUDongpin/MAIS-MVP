import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { buildCalibrationDesign } from "./calibration-design.mjs";
import { writeCalibrationArtifacts } from "./package-artifacts.mjs";
import { buildSacrificialBundle, canonicalSha256, runAllSacrificialArms, writeSacrificialArtifacts } from "./sacrificial-runner.mjs";
import { verifyF0F2Artifacts, writeF0F2VerificationReceipt } from "./verify-f0-f2.mjs";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("./verify-f0-f2-local.mjs", import.meta.url));
const ISOLATION_ROLE_IDS = [
  "answer-blind-solver",
  "tool-verifier",
  "adversarial-grader",
  "bilingual-curriculum-critic",
  "evidence-verifier"
];

async function buildFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "mais-rsi-lite-verify-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const publicDirectory = path.join(root, "public");
  const sealedDirectory = path.join(root, "sealed");
  const protocolPath = path.join(root, "protocol.md");
  const armContractsPath = path.join(root, "arm-contracts.md");
  const seed = "ab".repeat(32);

  await mkdir(sealedDirectory, { recursive: true, mode: 0o700 });
  await writeFile(protocolPath, "Protocol 1.1.1-f2-r. Formal 48-run status: NOT AUTHORIZED. candidate-only. content-surfaces-only.\n");
  await writeFile(armContractsPath, "A B C0 C. formal execution disabled. one writer.\n");
  await writeFile(path.join(sealedDirectory, "randomization-seed.txt"), `${seed}\n`, { mode: 0o600 });
  await chmod(path.join(sealedDirectory, "randomization-seed.txt"), 0o600);

  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });
  await writeCalibrationArtifacts({ design, publicDirectory, sealedDirectory });
  const bundle = buildSacrificialBundle();
  await writeSacrificialArtifacts({ directory: publicDirectory, bundle, receipts: await runAllSacrificialArms(bundle) });
  const isolationBody = {
    protocolId: design.publicManifest.protocolId,
    protocolVersion: design.publicManifest.protocolVersion,
    sourceBaseline: design.publicManifest.sourceBaseline,
    candidateSetSha256: design.candidateSetSha256,
    status: "isolation-probe-pass",
    enforcementMode: "macos-seatbelt-deny-default",
    sameUidAdversaryModel: true,
    cleanEnvironmentAllowlist: ["LANG", "LC_ALL", "MAIS_ROLE_ID", "NO_PROXY", "TMPDIR"],
    runtimeInventory: ["isolation-probe-worker.mjs"],
    browserEstimandExcluded: true,
    liveProviderAuthorized: false,
    formalExecutionAuthorized: false,
    productionAuthorized: false,
    roles: ISOLATION_ROLE_IDS.map((roleId, index) => ({
      roleId,
      inputReadAllowed: true,
      ownOutboxWriteAllowed: true,
      protectedCanaryReadDenied: true,
      protectedCanaryMetadataDenied: true,
      protectedSymlinkEscapeDenied: true,
      inputWriteDenied: true,
      inputChmodDenied: true,
      siblingOutboxWriteDenied: true,
      siblingSymlinkWriteDenied: true,
      repositoryReadDenied: true,
      networkDenied: true,
      credentialEnvironmentAbsent: true,
      childProcessSpawnDenied: true,
      inputSha256Before: String(index + 1).repeat(64),
      inputSha256After: String(index + 1).repeat(64),
      exitCode: 0,
      profileSha256: String(index + 5).repeat(64)
    })),
    interpretation: "Synthetic verifier fixture for the isolation receipt schema only."
  };
  await writeFile(
    path.join(publicDirectory, "f2-r-isolation-receipt-candidate.json"),
    `${JSON.stringify({ ...isolationBody, receiptSha256: canonicalSha256(JSON.stringify(isolationBody)) }, null, 2)}\n`
  );

  return { root, publicDirectory, sealedDirectory, protocolPath, armContractsPath, seed };
}

test("verifies the complete local F0-F2 evidence without granting independent gates", async (t) => {
  const fixture = await buildFixture(t);
  const result = await verifyF0F2Artifacts(fixture);

  assert.deepEqual(result.findings, []);
  assert.equal(result.safeSummary.status, "local-f0-f2-evidence-valid");
  assert.equal(result.safeSummary.counts.packages, 48);
  assert.equal(result.safeSummary.counts.questions, 4_800);
  assert.equal(result.safeSummary.counts.lessons, 96);
  assert.equal(result.safeSummary.counts.browserRoutes, 0);
  assert.equal(result.safeSummary.counts.latentDefects, 54);
  assert.equal(result.safeSummary.counts.sacrificialReceipts, 4);
  assert.match(result.safeSummary.candidateSetSha256, /^[a-f0-9]{64}$/);
  assert.equal(result.safeSummary.formalExecutionAuthorized, false);
  assert.equal(result.safeSummary.liveProviderCalibrated, false);
  assert.equal(result.safeSummary.isolationCandidateVerified, true);
  assert.deepEqual(result.safeSummary.independentGates, {
    A18: false,
    A11: false,
    A22: false,
    A25: false,
    ownerBudget: false
  });
});

test("rejects a semantically changed package even when all candidate and snapshot hashes are re-signed", async (t) => {
  const fixture = await buildFixture(t);
  const publicManifestPath = path.join(fixture.publicDirectory, "public-manifest.json");
  const f1ReceiptPath = path.join(fixture.publicDirectory, "f1-generation-receipt.json");
  const sealedManifestPath = path.join(fixture.sealedDirectory, "sealed-manifest.json");
  const goldLedgerPath = path.join(fixture.sealedDirectory, "gold-ledger.json");
  const sealedCommitPath = path.join(fixture.sealedDirectory, "artifact-commit-manifest.json");
  const publicCommitPath = path.join(fixture.publicDirectory, "f1-artifact-commit.json");
  const publicManifest = JSON.parse(await readFile(publicManifestPath, "utf8"));
  const firstRow = publicManifest.packages[0];
  const packagePath = path.join(fixture.sealedDirectory, "packages", `${firstRow.packageId}.json`);
  const candidate = JSON.parse(await readFile(packagePath, "utf8"));
  candidate.questions[0].answer = "999";
  const packageText = `${JSON.stringify(candidate, null, 2)}\n`;
  await writeFile(packagePath, packageText);
  firstRow.contentSha256 = canonicalSha256(candidate);
  const candidateSetRows = publicManifest.packages
    .map(({ packageId, contentSha256 }) => ({ packageId, contentSha256 }))
    .sort((left, right) => left.packageId.localeCompare(right.packageId));
  const candidateSetSha256 = canonicalSha256(candidateSetRows);
  publicManifest.candidateSetSha256 = candidateSetSha256;

  const f1Receipt = JSON.parse(await readFile(f1ReceiptPath, "utf8"));
  const sealedManifest = JSON.parse(await readFile(sealedManifestPath, "utf8"));
  const goldLedger = JSON.parse(await readFile(goldLedgerPath, "utf8"));
  for (const row of [f1Receipt, sealedManifest, goldLedger]) row.candidateSetSha256 = candidateSetSha256;
  for (const [filePath, value] of [
    [publicManifestPath, publicManifest],
    [f1ReceiptPath, f1Receipt],
    [sealedManifestPath, sealedManifest],
    [goldLedgerPath, goldLedger]
  ]) await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);

  const sealedCommit = JSON.parse(await readFile(sealedCommitPath, "utf8"));
  sealedCommit.candidateSetSha256 = candidateSetSha256;
  for (const row of sealedCommit.files) {
    row.sha256 = canonicalSha256(await readFile(path.join(fixture.sealedDirectory, row.path), "utf8"));
  }
  await writeFile(sealedCommitPath, `${JSON.stringify(sealedCommit, null, 2)}\n`);

  const publicCommit = JSON.parse(await readFile(publicCommitPath, "utf8"));
  publicCommit.candidateSetSha256 = candidateSetSha256;
  publicCommit.sealedCommitManifestSha256 = canonicalSha256(await readFile(sealedCommitPath, "utf8"));
  for (const row of publicCommit.files) {
    row.sha256 = canonicalSha256(await readFile(path.join(fixture.publicDirectory, row.path), "utf8"));
  }
  await writeFile(publicCommitPath, `${JSON.stringify(publicCommit, null, 2)}\n`);

  const result = await verifyF0F2Artifacts(fixture);
  assert.ok(result.findings.some((row) => row.code === "candidate-semantic-drift"));
});

test("fails closed when an F1 or F2 snapshot commit marker is absent", async (t) => {
  const fixture = await buildFixture(t);
  await rm(path.join(fixture.publicDirectory, "f1-artifact-commit.json"));
  await rm(path.join(fixture.publicDirectory, "f2-snapshot-commit-manifest.json"));

  const result = await verifyF0F2Artifacts(fixture);
  assert.ok(result.findings.some((row) => row.code === "f1-snapshot-incomplete"));
  assert.ok(result.findings.some((row) => row.code === "f2-snapshot-incomplete"));
});

test("fails closed if a public manifest authorizes execution", async (t) => {
  const fixture = await buildFixture(t);
  const manifestPath = path.join(fixture.publicDirectory, "public-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.executionStatus = "authorized";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = await verifyF0F2Artifacts(fixture);
  assert.ok(result.findings.some((row) => row.code === "formal-execution-boundary"));
});

test("writes a redacted verification receipt that excludes the seed", async (t) => {
  const fixture = await buildFixture(t);
  const result = await verifyF0F2Artifacts(fixture);
  const receiptPath = path.join(fixture.publicDirectory, "verification.json");

  await writeF0F2VerificationReceipt(receiptPath, result);
  const receiptText = await readFile(receiptPath, "utf8");
  assert.equal(receiptText.includes(fixture.seed), false);
  assert.match(receiptText, /local-f0-f2-evidence-valid/);
  assert.match(receiptText, /independentGates/);
});

test("verification CLI writes a valid redacted receipt and never prints the seed", async (t) => {
  const fixture = await buildFixture(t);
  const receiptPath = path.join(fixture.publicDirectory, "cli-verification.json");
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    cliPath,
    "--protocol", fixture.protocolPath,
    "--arm-contracts", fixture.armContractsPath,
    "--public-dir", fixture.publicDirectory,
    "--sealed-dir", fixture.sealedDirectory,
    "--receipt", receiptPath
  ]);

  assert.equal(stderr, "");
  assert.match(stdout, /local-f0-f2-evidence-valid/);
  assert.equal(stdout.includes(fixture.seed), false);
  assert.match(await readFile(receiptPath, "utf8"), /"findingCount": 0/);
});
