#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  preExecutionValidationReport: "coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json",
  executionInstructionOwnerInputGate: "coordination/release-intake/latest-A25-a16-execution-instruction-owner-input-current-gate.json",
  latestJson: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
  latestMarkdown: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.md",
  datedJson: `coordination/release-intake/${date}-A25-a16-post-extraction-verification-report.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-a16-post-extraction-verification-report.md`
};

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function hktDateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function statusRows(paths) {
  const output = paths.length > 0 ? git(["status", "--short", "--", ...paths]) : "";
  return output
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2),
      path: line.slice(3)
    }));
}

function stagedRows(paths) {
  const output = paths.length > 0 ? git(["diff", "--cached", "--name-only", "--", ...paths]) : "";
  return output.split(/\r?\n/u).filter(Boolean);
}

function latestPackageCommit(paths) {
  if (paths.length === 0) return null;
  const output = git(["log", "--max-count=1", "--format=%H%n%s", "--name-only", "--", ...paths]);
  if (!output) return null;
  const lines = output.split(/\r?\n/u).filter(Boolean);
  if (lines.length < 2) return null;
  return {
    hash: lines[0],
    subject: lines[1],
    files: lines.slice(2)
  };
}

function committedFileFingerprints(commitHash, files) {
  if (!commitHash) return [];
  return files.map((filePath) => {
    const bytes = execFileSync("git", ["show", `${commitHash}:${filePath}`], {
      cwd: root,
      maxBuffer: 128 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const text = bytes.toString("utf8").replace(/\r\n/g, "\n");
    const lineCount = text.length === 0 ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
    return {
      path: filePath,
      bytes: bytes.length,
      lineCount,
      sha256: sha256(bytes)
    };
  });
}

function sameStringSet(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function checkRow(id, passed, detail, extra = {}) {
  return {
    id,
    status: passed ? "pass" : "fail",
    passed,
    detail,
    ...extra
  };
}

function buildCompletionEvidence({ packageFiles, expectedFingerprints, status, commit }) {
  if (status.length > 0 || !commit) {
    return {
      postExtractionVerified: false,
      latestPackageCommit: commit,
      committedPackageFingerprints: []
    };
  }

  const committedFingerprints = committedFileFingerprints(commit.hash, packageFiles);
  return {
    postExtractionVerified: commit.subject === "Add A16 research evidence package" &&
      sameStringSet(commit.files, packageFiles) &&
      sameJson(committedFingerprints, expectedFingerprints),
    latestPackageCommit: commit,
    committedPackageFingerprints: committedFingerprints
  };
}

export function buildA16PostExtractionVerificationReport() {
  const dirtyMap = readJson(A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.dirtyMap);
  const preExecution = readJson(A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.preExecutionValidationReport);
  const ownerInputGate = readJson(A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.executionInstructionOwnerInputGate);
  const packageFiles = preExecution.packageFiles ?? [];
  const expectedFingerprints = preExecution.packageFingerprints ?? [];
  const status = statusRows(packageFiles);
  const staged = stagedRows(packageFiles);
  const latestCommit = latestPackageCommit(packageFiles);
  const completion = buildCompletionEvidence({
    packageFiles,
    expectedFingerprints,
    status,
    commit: latestCommit
  });
  const pendingOwnerInstruction = ownerInputGate.validInstructionRows === 0 && status.length === packageFiles.length;
  const pendingExtractionExecution = ownerInputGate.validInstructionRows === 1 &&
    status.length === packageFiles.length &&
    staged.length === 0;
  const lifecycleStatus = completion.postExtractionVerified
    ? "post-extraction-verified"
    : pendingOwnerInstruction
      ? "pending-owner-execution-instruction"
      : pendingExtractionExecution
        ? "pending-extraction-execution"
        : "attention-required";
  const pendingLifecycleStatus = lifecycleStatus === "pending-owner-execution-instruction" ||
    lifecycleStatus === "pending-extraction-execution";
  const sourceArtifactsCurrent =
    preExecution.dirtyMapStatusSignature === dirtyMap.statusSignature &&
    ownerInputGate.dirtyMapStatusSignature === dirtyMap.statusSignature &&
    preExecution.expandedStatusEntries === dirtyMap.statusCounts?.expandedStatusEntries &&
    ownerInputGate.expandedStatusEntries === dirtyMap.statusCounts?.expandedStatusEntries;
  const sourceArtifactsUsableAfterExtraction = completion.postExtractionVerified &&
    preExecution.summary?.packageFingerprintRows === 6 &&
    ownerInputGate.validInstructionRows === 1;

  const checks = [
    checkRow(
      "source-dirty-map-current",
      sourceArtifactsCurrent || sourceArtifactsUsableAfterExtraction,
      sourceArtifactsCurrent
        ? "A16 source artifacts point at the current dirty-map signature."
        : "A16 source artifacts are accepted as the pre-execution snapshot after a verified extraction commit."
    ),
    checkRow(
      "source-expanded-entry-count-current",
      sourceArtifactsCurrent || sourceArtifactsUsableAfterExtraction,
      sourceArtifactsCurrent
        ? "A16 source artifacts point at the current expanded dirty entry count."
        : "A16 source expanded-entry counts are accepted as the pre-execution snapshot after a verified extraction commit."
    ),
    checkRow(
      "pre-execution-fingerprint-manifest-ready",
      preExecution.summary?.packageFingerprintRows === 6 &&
        typeof preExecution.summary?.packageFingerprintSha256 === "string" &&
        preExecution.summary.packageFingerprintSha256.length === 64,
      "A16 pre-execution validation has a six-file package fingerprint manifest."
    ),
    checkRow(
      "no-package-staged-changes",
      staged.length === 0,
      "No A16 package file is currently staged.",
      { stagedRows: staged.length }
    ),
    checkRow(
      "pending-or-verified-state-is-coherent",
      pendingLifecycleStatus || lifecycleStatus === "post-extraction-verified",
      `lifecycleStatus=${lifecycleStatus}`
    ),
    checkRow(
      "post-extraction-commit-shape",
      pendingLifecycleStatus ||
        (completion.latestPackageCommit?.subject === "Add A16 research evidence package" &&
          sameStringSet(completion.latestPackageCommit?.files ?? [], packageFiles)),
      "If extracted, the latest package commit must contain exactly the six A16 package files."
    ),
    checkRow(
      "post-extraction-fingerprint-match",
      pendingLifecycleStatus ||
        sameJson(completion.committedPackageFingerprints, expectedFingerprints),
      "If extracted, committed file fingerprints must match the approved pre-execution manifest."
    )
  ];
  const passingChecks = checks.filter((row) => row.passed).length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      preExecutionValidationReportGeneratedAt: preExecution.generatedAt,
      executionInstructionOwnerInputGate: {
        dirtyMapStatusSignature: ownerInputGate.dirtyMapStatusSignature,
        expandedStatusEntries: ownerInputGate.expandedStatusEntries,
        instructionRows: ownerInputGate.instructionRows ?? 0,
        validInstructionRows: ownerInputGate.validInstructionRows ?? 0,
        cleanupAuthorizedRows: ownerInputGate.cleanupAuthorizedRows ?? 0,
        executableRows: ownerInputGate.executableRows ?? 0
      }
    },
    candidateId: "wave-05-visualization-ai-runtime:a16-research-evidence",
    lifecycleStatus,
    packageFiles,
    expectedPackageFingerprints: expectedFingerprints,
    packageFingerprintSha256: preExecution.packageFingerprintSha256,
    packageStatusRows: status,
    stagedPackageRows: staged,
    latestPackageCommit: completion.latestPackageCommit,
    committedPackageFingerprints: completion.committedPackageFingerprints,
    postExtractionVerified: completion.postExtractionVerified,
    cleanupAuthorized: false,
    executableNow: false,
    summary: {
      packageFileRows: packageFiles.length,
      packageFingerprintRows: expectedFingerprints.length,
      packageStatusRows: status.length,
      stagedPackageRows: staged.length,
      validExecutionInstructionRows: ownerInputGate.validInstructionRows ?? 0,
      postExtractionVerified: completion.postExtractionVerified,
      checks: checks.length,
      passingChecks,
      failedChecks: checks.length - passingChecks,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    checks,
    boundary: {
      evidenceOnly: true,
      postExtractionVerificationOnly: true,
      recordsOwnerApproval: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: true
    }
  };
}

export function stableA16PostExtractionVerificationReportProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    candidateId: payload.candidateId,
    lifecycleStatus: payload.lifecycleStatus,
    packageFiles: payload.packageFiles,
    expectedPackageFingerprints: payload.expectedPackageFingerprints,
    packageFingerprintSha256: payload.packageFingerprintSha256,
    packageStatusRows: payload.packageStatusRows,
    stagedPackageRows: payload.stagedPackageRows,
    latestPackageCommit: payload.latestPackageCommit,
    committedPackageFingerprints: payload.committedPackageFingerprints,
    postExtractionVerified: payload.postExtractionVerified,
    cleanupAuthorized: payload.cleanupAuthorized,
    executableNow: payload.executableNow,
    summary: payload.summary,
    checks: payload.checks,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const fileRows = payload.expectedPackageFingerprints
    .map((row) => `| \`${cell(row.path)}\` | ${row.bytes} | ${row.lineCount} | \`${row.sha256}\` |`)
    .join("\n");
  const statusRowsText = payload.packageStatusRows.length
    ? payload.packageStatusRows.map((row) => `- ${row.status} ${row.path}`).join("\n")
    : "- no package status rows";
  const checkRows = payload.checks
    .map((row) => `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`)
    .join("\n");

  return `# A25 A16 Post-Extraction Verification Report

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Lifecycle status: \`${payload.lifecycleStatus}\`

This report is verification only. It does not authorize staging, committing, merging, cleanup, worktree removal, branch deletion, reset, clean, push, deploy, or any physical lifecycle command.

## Summary

- Package file rows: ${payload.summary.packageFileRows}
- Package fingerprint rows: ${payload.summary.packageFingerprintRows}
- Package fingerprint sha256: \`${payload.packageFingerprintSha256}\`
- Package status rows: ${payload.summary.packageStatusRows}
- Staged package rows: ${payload.summary.stagedPackageRows}
- Valid execution instruction rows: ${payload.summary.validExecutionInstructionRows}
- Post-extraction verified: ${payload.summary.postExtractionVerified ? "yes" : "no"}
- Checks passed: ${payload.summary.passingChecks}/${payload.summary.checks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Package Fingerprints

| Path | Bytes | Lines | SHA256 |
| --- | ---: | ---: | --- |
${fileRows}

## Current Package Status

${statusRowsText}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}

## Boundary

- Records owner approval: false.
- Records execution instruction: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
`;
}

function main() {
  const payload = buildA16PostExtractionVerificationReport();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.latestJson, json);
  write(A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.datedJson, json);
  write(A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.latestMarkdown, md);
  write(A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.latestJson,
    latestMarkdown: A16_POST_EXTRACTION_VERIFICATION_REPORT_PATHS.latestMarkdown,
    lifecycleStatus: payload.lifecycleStatus,
    packageFileRows: payload.summary.packageFileRows,
    packageFingerprintRows: payload.summary.packageFingerprintRows,
    packageStatusRows: payload.summary.packageStatusRows,
    stagedPackageRows: payload.summary.stagedPackageRows,
    postExtractionVerified: payload.summary.postExtractionVerified,
    passingChecks: payload.summary.passingChecks,
    checks: payload.summary.checks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
