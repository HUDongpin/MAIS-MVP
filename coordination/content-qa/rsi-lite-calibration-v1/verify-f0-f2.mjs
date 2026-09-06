import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildCalibrationDesign,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  SOURCE_BASELINE
} from "./calibration-design.mjs";
import {
  canonicalSha256,
  SACRIFICIAL_FIXTURE_SHA256,
  validateSacrificialReceipt
} from "./sacrificial-runner.mjs";
import { validateIsolationReceipt } from "./isolation-harness.mjs";

const ARMS = Object.freeze(["A", "B", "C0", "C"]);
const ISOLATION_ROLE_IDS = Object.freeze([
  "answer-blind-solver",
  "tool-verifier",
  "adversarial-grader",
  "bilingual-curriculum-critic",
  "evidence-verifier"
]);

async function readTextSafe(filePath, findings, code) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    findings.push({ code, detail: `Required artifact ${path.basename(filePath)} is absent or unreadable.` });
    return null;
  }
}

async function readJsonSafe(filePath, findings, code) {
  const text = await readTextSafe(filePath, findings, code);
  if (text === null) return { value: null, text: null };
  try {
    return { value: JSON.parse(text), text };
  } catch {
    findings.push({ code, detail: `Required artifact ${path.basename(filePath)} is not valid JSON.` });
    return { value: null, text };
  }
}

function exactObject(left, right) {
  return canonicalSha256(left) === canonicalSha256(right);
}

function safeRelativePath(value) {
  return typeof value === "string"
    && value.length > 0
    && !path.isAbsolute(value)
    && !value.split(/[\\/]/).includes("..")
    && path.normalize(value) === value;
}

async function verifyCommittedFiles({ root, rows, expectedPaths, findings, code }) {
  if (!Array.isArray(rows)) {
    findings.push({ code, detail: "Snapshot commit file list is absent." });
    return;
  }
  const observedPaths = rows.map((row) => row?.path);
  if (
    observedPaths.some((value) => !safeRelativePath(value))
    || new Set(observedPaths).size !== observedPaths.length
    || JSON.stringify([...observedPaths].sort()) !== JSON.stringify([...expectedPaths].sort())
  ) {
    findings.push({ code, detail: "Snapshot commit file topology is incomplete, duplicated, or unsafe." });
    return;
  }
  for (const row of rows) {
    const text = await readTextSafe(path.join(root, row.path), findings, code);
    if (text !== null && canonicalSha256(text) !== row.sha256) {
      findings.push({ code, detail: `Committed file hash mismatch for ${row.path}.` });
    }
  }
}

function allSame(values, expected) {
  return values.every((value) => value === expected);
}

function buildSafeSummary({ findings, protocolText, armContractsText, seedCommitment, candidateSetSha256, isolationCandidateVerified, counts }) {
  return {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    status: findings.length === 0 ? "local-f0-f2-evidence-valid" : "local-f0-f2-evidence-invalid",
    formalExecutionAuthorized: false,
    productionAuthorized: false,
    liveProviderCalibrated: false,
    browserEstimandIncluded: false,
    isolationCandidateVerified,
    protocolSha256: protocolText === null ? null : canonicalSha256(protocolText),
    armContractsSha256: armContractsText === null ? null : canonicalSha256(armContractsText),
    seedCommitment,
    candidateSetSha256,
    counts,
    independentGates: {
      A18: false,
      A11: false,
      A22: false,
      A25: false,
      ownerBudget: false
    },
    checksNotRun: [
      "formal-48-run",
      "live-provider-calibration",
      "independent-A18-review",
      "independent-A11-review",
      "independent-A22-review",
      "independent-A25-review",
      "owner-budget-signature",
      "production-or-deployment"
    ]
  };
}

export async function verifyF0F2Artifacts({ protocolPath, armContractsPath, publicDirectory, sealedDirectory }) {
  const findings = [];
  const push = (code, detail) => findings.push({ code, detail });
  const packageDirectory = path.join(sealedDirectory, "packages");

  const protocolText = await readTextSafe(protocolPath, findings, "protocol-boundary");
  const armContractsText = await readTextSafe(armContractsPath, findings, "arm-contract");
  const { value: publicManifest } = await readJsonSafe(path.join(publicDirectory, "public-manifest.json"), findings, "f1-snapshot-incomplete");
  const { value: f1Receipt } = await readJsonSafe(path.join(publicDirectory, "f1-generation-receipt.json"), findings, "f1-snapshot-incomplete");
  const { value: publicCommit } = await readJsonSafe(path.join(publicDirectory, "f1-artifact-commit.json"), findings, "f1-snapshot-incomplete");
  const { value: sealedManifest } = await readJsonSafe(path.join(sealedDirectory, "sealed-manifest.json"), findings, "f1-snapshot-incomplete");
  const { value: goldLedger } = await readJsonSafe(path.join(sealedDirectory, "gold-ledger.json"), findings, "f1-snapshot-incomplete");
  const { value: sealedCommit, text: sealedCommitText } = await readJsonSafe(path.join(sealedDirectory, "artifact-commit-manifest.json"), findings, "f1-snapshot-incomplete");
  const seedText = await readTextSafe(path.join(sealedDirectory, "randomization-seed.txt"), findings, "sealed-seed");
  const seed = seedText?.trim() ?? null;
  const { value: sacrificialBundle } = await readJsonSafe(path.join(publicDirectory, "sacrificial-bundle.json"), findings, "f2-snapshot-incomplete");
  const { value: f2Summary } = await readJsonSafe(path.join(publicDirectory, "f2-sacrificial-summary.json"), findings, "f2-snapshot-incomplete");
  const { value: f2Commit } = await readJsonSafe(path.join(publicDirectory, "f2-snapshot-commit-manifest.json"), findings, "f2-snapshot-incomplete");
  const { value: isolationReceipt } = await readJsonSafe(path.join(publicDirectory, "f2-r-isolation-receipt-candidate.json"), findings, "a22-isolation-candidate");

  if (
    protocolText !== null
    && (!protocolText.includes(PROTOCOL_VERSION)
      || !protocolText.includes("NOT AUTHORIZED")
      || !protocolText.includes("candidate-only")
      || !protocolText.includes("content-surfaces-only"))
  ) push("protocol-boundary", "Protocol version, content-only estimand, or authorization boundary is missing.");

  if (armContractsText !== null) {
    for (const token of ["A", "B", "C0", "C", "formal execution", "one writer"]) {
      if (!armContractsText.toLowerCase().includes(token.toLowerCase())) push("arm-contract", `Missing arm-contract token: ${token}`);
    }
  }

  const seedCommitment = seed ? canonicalSha256(seed) : null;
  if (!seed || !/^[a-f0-9]{64}$/.test(seed)) push("sealed-seed", "The restricted seed must be exactly 64 lowercase hexadecimal characters.");
  const protocolObjects = [publicManifest, f1Receipt, publicCommit, sealedManifest, goldLedger, sealedCommit, sacrificialBundle, f2Summary, f2Commit, isolationReceipt].filter(Boolean);
  if (!allSame(protocolObjects.map((row) => row.protocolId), PROTOCOL_ID)) push("protocol-identity", "An artifact protocol ID drifted.");
  if (!allSame(protocolObjects.map((row) => row.protocolVersion), PROTOCOL_VERSION)) push("protocol-version", "An artifact protocol version drifted.");
  if (!allSame(protocolObjects.map((row) => row.sourceBaseline), SOURCE_BASELINE)) push("source-baseline", "An artifact source baseline drifted.");

  const commitmentObjects = [publicManifest, f1Receipt, publicCommit, sealedManifest, goldLedger, sealedCommit].filter(Boolean);
  if (seedCommitment && !allSame(commitmentObjects.map((row) => row.seedCommitment), seedCommitment)) {
    push("seed-commitment", "One or more F1 artifacts do not match the restricted seed commitment.");
  }

  let expectedDesign = null;
  if (seed && sealedManifest && Number.isInteger(sealedManifest.itemsPerPackage)) {
    try {
      expectedDesign = buildCalibrationDesign({ seed, itemsPerPackage: sealedManifest.itemsPerPackage });
    } catch {
      push("candidate-semantic-drift", "The sealed seed and design parameters cannot regenerate the frozen candidate set.");
    }
  }

  if (expectedDesign && (
    !exactObject(publicManifest, expectedDesign.publicManifest)
    || !exactObject(sealedManifest, expectedDesign.sealedManifest)
    || !exactObject(goldLedger, expectedDesign.goldLedger)
  )) push("candidate-semantic-drift", "Manifest or gold semantics differ from deterministic regeneration at the frozen baseline.");

  let packageFiles = [];
  try {
    packageFiles = (await readdir(packageDirectory)).filter((file) => file.endsWith(".json")).sort();
  } catch {
    push("sealed-package-count", "The sealed package directory is absent or unreadable.");
  }
  const expectedPackageFiles = expectedDesign
    ? expectedDesign.packages.map((row) => `${row.packageId}.json`).sort()
    : [];
  if (packageFiles.length !== 48 || (expectedDesign && JSON.stringify(packageFiles) !== JSON.stringify(expectedPackageFiles))) {
    push("sealed-package-count", `Expected the exact 48 regenerated package files; found ${packageFiles.length}.`);
  }
  const expectedPackagesByFile = new Map((expectedDesign?.packages ?? []).map((row) => [`${row.packageId}.json`, row.content]));
  for (const file of packageFiles) {
    const filePath = path.join(packageDirectory, file);
    const { value: content } = await readJsonSafe(filePath, findings, "sealed-package-json");
    if (content && expectedPackagesByFile.has(file) && !exactObject(content, expectedPackagesByFile.get(file))) {
      push("candidate-semantic-drift", `${file} differs from deterministic regeneration at the frozen seed and baseline.`);
    }
    try {
      if (((await stat(filePath)).mode & 0o077) !== 0) push("sealed-permissions", `${file} exposes group or other permissions.`);
    } catch {
      push("sealed-permissions", `${file} permissions could not be verified.`);
    }
  }

  const candidateSetSha256 = expectedDesign?.candidateSetSha256 ?? publicManifest?.candidateSetSha256 ?? null;
  const candidateCommitmentObjects = [publicManifest, f1Receipt, publicCommit, sealedManifest, goldLedger, sealedCommit].filter(Boolean);
  if (candidateSetSha256 && !allSame(candidateCommitmentObjects.map((row) => row.candidateSetSha256), candidateSetSha256)) {
    push("candidate-set-commitment", "Candidate-set commitments are absent, inconsistent, or not seed-derived.");
  }
  const isolationFindings = isolationReceipt
    ? validateIsolationReceipt(isolationReceipt, { expectedRoleIds: ISOLATION_ROLE_IDS, candidateSetSha256 })
    : [{ code: "receipt-missing", detail: "Isolation receipt is absent." }];
  for (const finding of isolationFindings) push(`a22-isolation-${finding.code}`, finding.detail);
  const isolationCandidateVerified = Boolean(isolationReceipt) && isolationFindings.length === 0;

  if (publicManifest && f1Receipt) {
    const publicF1Text = `${JSON.stringify(publicManifest)}\n${JSON.stringify(f1Receipt)}`;
    for (const forbidden of [seed, "latentBundleId", '"arm"', "defect-bearing"]) {
      if (forbidden && publicF1Text.includes(forbidden)) push("public-secret-leak", `Public F1 evidence contains forbidden token ${forbidden === seed ? "<seed>" : forbidden}.`);
    }
    if (
      publicManifest.executionStatus !== "not-authorized"
      || publicManifest.estimandScope !== "content-surfaces-only"
      || publicManifest.counts?.browserRoutes !== 0
      || f1Receipt.formalExecutionAuthorized !== false
    ) push("formal-execution-boundary", "F1 evidence must remain content-only and fail closed on formal execution.");
    if (f1Receipt.productionAuthorized !== false) push("production-boundary", "F1 receipt must keep production disabled.");
  }

  const expectedSealedCommitPaths = [
    "gold-ledger.json",
    "sealed-manifest.json",
    ...packageFiles.map((file) => path.posix.join("packages", file))
  ];
  if (sealedCommit) {
    if (
      sealedCommit.status !== "committed-candidate-snapshot"
      || sealedCommit.formalExecutionAuthorized !== false
      || sealedCommit.candidateSetSha256 !== candidateSetSha256
    ) push("f1-snapshot-incomplete", "The sealed F1 commit marker has an invalid status or boundary.");
    await verifyCommittedFiles({ root: sealedDirectory, rows: sealedCommit.files, expectedPaths: expectedSealedCommitPaths, findings, code: "f1-snapshot-incomplete" });
  }
  if (publicCommit) {
    if (
      publicCommit.status !== "committed-candidate-snapshot"
      || publicCommit.formalExecutionAuthorized !== false
      || publicCommit.candidateSetSha256 !== candidateSetSha256
      || (sealedCommitText !== null && publicCommit.sealedCommitManifestSha256 !== canonicalSha256(sealedCommitText))
    ) push("f1-snapshot-incomplete", "The public F1 commit marker does not bind the sealed candidate snapshot.");
    await verifyCommittedFiles({
      root: publicDirectory,
      rows: publicCommit.files,
      expectedPaths: ["f1-generation-receipt.json", "public-manifest.json", "seed-commitment.txt"],
      findings,
      code: "f1-snapshot-incomplete"
    });
  }

  for (const sealedFile of ["randomization-seed.txt", "sealed-manifest.json", "gold-ledger.json", "artifact-commit-manifest.json"]) {
    try {
      if (((await stat(path.join(sealedDirectory, sealedFile))).mode & 0o077) !== 0) push("sealed-permissions", `${sealedFile} exposes group or other permissions.`);
    } catch {
      push("sealed-permissions", `${sealedFile} permissions could not be verified.`);
    }
  }

  const receipts = [];
  if (sacrificialBundle) {
    for (const arm of ARMS) {
      const { value: receipt } = await readJsonSafe(path.join(publicDirectory, "sacrificial-receipts", `${arm}.json`), findings, "f2-snapshot-incomplete");
      if (!receipt) continue;
      receipts.push(receipt);
      for (const finding of validateSacrificialReceipt(receipt, sacrificialBundle)) {
        push(`sacrificial-${finding.code}`, `${arm}: ${finding.detail}`);
      }
    }
  }
  if (sacrificialBundle && canonicalSha256(sacrificialBundle) !== SACRIFICIAL_FIXTURE_SHA256) push("sacrificial-fixture", "The sacrificial bundle is not the pinned public fixture.");
  if (
    !f2Summary
    || f2Summary.receiptCount !== 4
    || receipts.length !== 4
    || f2Summary.estimandScope !== "content-surfaces-only"
    || f2Summary.formalExecutionAuthorized !== false
    || f2Summary.productionAuthorized !== false
    || f2Summary.liveProviderCalibrated !== false
  ) push("f2-summary-boundary", "F2 summary topology or authorization boundary is invalid.");
  if (receipts.some((row) => row.resourceUsage.providerCalls !== 0 || row.resourceUsage.apiCost !== 0)) {
    push("provider-spend", "Offline sacrificial receipts must record zero provider calls and API cost.");
  }

  if (f2Commit) {
    const { manifestSha256, ...manifestBody } = f2Commit;
    if (
      manifestSha256 !== canonicalSha256(manifestBody)
      || f2Commit.complete !== true
      || f2Commit.fixtureSha256 !== SACRIFICIAL_FIXTURE_SHA256
      || f2Commit.formalExecutionAuthorized !== false
      || f2Commit.productionAuthorized !== false
    ) push("f2-snapshot-incomplete", "F2 snapshot commit marker or fail-closed boundary is invalid.");
    await verifyCommittedFiles({
      root: publicDirectory,
      rows: f2Commit.files,
      expectedPaths: [
        "f2-sacrificial-summary.json",
        "sacrificial-bundle.json",
        ...ARMS.map((arm) => `sacrificial-receipts/${arm}.json`)
      ],
      findings,
      code: "f2-snapshot-incomplete"
    });
  }

  const counts = {
    independentClusters: expectedDesign?.sealedManifest.latentBundles.length ?? 0,
    packages: packageFiles.length,
    questions: expectedDesign?.publicManifest.counts.questions ?? 0,
    lessons: expectedDesign?.publicManifest.counts.lessons ?? 0,
    browserRoutes: expectedDesign?.publicManifest.counts.browserRoutes ?? 0,
    latentDefects: expectedDesign?.goldLedger.latentDefects.length ?? 0,
    defectInstances: expectedDesign?.goldLedger.instances.length ?? 0,
    sacrificialReceipts: receipts.length
  };
  const safeSummary = buildSafeSummary({
    findings,
    protocolText,
    armContractsText,
    seedCommitment,
    candidateSetSha256,
    isolationCandidateVerified,
    counts
  });
  return { findings, safeSummary };
}

export async function writeF0F2VerificationReceipt(receiptPath, result) {
  const receipt = {
    ...result.safeSummary,
    findingCount: result.findings.length,
    findings: result.findings,
    interpretation: "Local F2-R machine verification only. Independent A18/A11/A22/A25 receipts remain false, owner budget remains unsigned, and formal execution remains unauthorized."
  };
  await mkdir(path.dirname(receiptPath), { recursive: true });
  const temporaryPath = path.join(path.dirname(receiptPath), `.${path.basename(receiptPath)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o644, flag: "wx" });
    await chmod(temporaryPath, 0o644);
    await rename(temporaryPath, receiptPath);
    await chmod(receiptPath, 0o644);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
  return receipt;
}
