#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  packageExtractionRequest: "coordination/release-intake/latest-A25-a16-authorized-package-extraction-request.json",
  executionAuthorizationDocket: "coordination/release-intake/latest-A25-a16-execution-authorization-docket.json",
  ownerPathspec: "coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
  latestJson: "coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json",
  latestMarkdown: "coordination/release-intake/latest-A25-a16-pre-execution-validation-report.md",
  datedJson: `coordination/release-intake/${date}-A25-a16-pre-execution-validation-report.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-a16-pre-execution-validation-report.md`
};

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
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

function readLines(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function runNode(script, args = []) {
  const command = [script, ...args];
  const result = spawnSync(process.execPath, command, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });

  return {
    command: `node ${command.join(" ")}`,
    statusCode: result.status ?? 1,
    passed: result.status === 0,
    stdoutSummary: summarize(result.stdout),
    stderrSummary: summarize(result.stderr)
  };
}

function summarize(text) {
  return String(text ?? "")
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .slice(0, 12);
}

function sameStringSet(left, right) {
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return JSON.stringify(leftSorted) === JSON.stringify(rightSorted);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function packageFileFingerprint(relativePath) {
  const absolutePath = absolute(relativePath);
  const bytes = fs.readFileSync(absolutePath);
  const text = bytes.toString("utf8").replace(/\r\n/g, "\n");
  const lines = text.length === 0 ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  return {
    path: relativePath,
    bytes: bytes.length,
    lineCount: lines,
    sha256: sha256(bytes)
  };
}

function packageFingerprintManifest(packageFiles) {
  const files = packageFiles.map(packageFileFingerprint);
  return {
    files,
    sha256: sha256(JSON.stringify(files))
  };
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

function buildCommandChecks() {
  const checks = [
    runNode("coordination/release-intake/review-owner-pathspec.mjs", [
      A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.ownerPathspec,
      "--status"
    ]),
    runNode("coordination/release-intake/review-owner-pathspec.mjs", [
      A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.ownerPathspec,
      "--diffstat"
    ]),
    runNode("coordination/release-intake/assert-next-owner-authorizations-current.mjs", ["--json"]),
    runNode("coordination/release-intake/assert-a16-authorized-package-extraction-request-current.mjs", ["--json"]),
    runNode("coordination/release-intake/assert-a16-execution-authorization-docket-current.mjs", ["--json"]),
    runNode("coordination/release-intake/assert-no-staged-changes.mjs", ["--json"])
  ];

  return checks.map((row) => ({
    id: row.command
      .replace(/^node coordination\/release-intake\//u, "")
      .replaceAll(" ", "-")
      .replaceAll("/", "-"),
    ...row
  }));
}

export function buildA16PreExecutionValidationReport() {
  const dirtyMap = readJson(A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.dirtyMap);
  const authorizations = readJson(A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.ownerAuthorizations);
  const request = readJson(A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.packageExtractionRequest);
  const docket = readJson(A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.executionAuthorizationDocket);
  const pathspecRows = readLines(A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.ownerPathspec);
  const authorizationRows = docket.authorizationRows ?? [];
  const executionRow = authorizationRows[0] ?? {};
  const packageFiles = executionRow.packageFiles ?? [];
  const exactCommandSequence = executionRow.exactCommandSequence ?? [];
  const packageFingerprints = packageFingerprintManifest(packageFiles);
  const commandChecks = buildCommandChecks();

  const structuralChecks = [
    checkRow(
      "dirty-map-signature-aligned",
      request.dirtyMapStatusSignature === dirtyMap.statusSignature &&
        docket.dirtyMapStatusSignature === dirtyMap.statusSignature &&
        authorizations.dirtyMapStatusSignature === dirtyMap.statusSignature,
      "A16 request, docket, and canonical authorization file point at the current dirty-map signature."
    ),
    checkRow(
      "expanded-entry-count-aligned",
      request.expandedStatusEntries === dirtyMap.statusCounts?.expandedStatusEntries &&
        docket.expandedStatusEntries === dirtyMap.statusCounts?.expandedStatusEntries &&
        authorizations.expandedStatusEntries === dirtyMap.statusCounts?.expandedStatusEntries,
      "A16 request, docket, and canonical authorization file point at the current expanded dirty entry count."
    ),
    checkRow(
      "pathspec-matches-docket-package-files",
      sameStringSet(pathspecRows, packageFiles),
      "The owner pathspec exactly matches the six A16 package files from the execution authorization docket.",
      { pathspecRows: pathspecRows.length, packageFileRows: packageFiles.length }
    ),
    checkRow(
      "exact-command-sequence-present",
      exactCommandSequence.length === 2 &&
        exactCommandSequence[0] === `git add --pathspec-from-file=${A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.ownerPathspec}` &&
        exactCommandSequence[1] === "git commit -m \"Add A16 research evidence package\"",
      "The A16 docket still names the two expected exact Git commands for a future separate owner execution instruction.",
      { exactCommandRows: exactCommandSequence.length }
    ),
    checkRow(
      "package-fingerprint-manifest-present",
      packageFingerprints.files.length === 6 &&
        packageFingerprints.files.every((row) => row.path.startsWith("coordination/research/") && row.sha256.length === 64),
      "The A16 package file contents are fingerprinted before any future execution instruction can be accepted.",
      {
        packageFingerprintRows: packageFingerprints.files.length,
        packageFingerprintSha256: packageFingerprints.sha256
      }
    ),
    checkRow(
      "docket-remains-non-executable",
      (docket.summary?.cleanupAuthorizedRows ?? 0) === 0 &&
        (docket.summary?.executableRows ?? 0) === 0 &&
        executionRow.cleanupAuthorized === false &&
        executionRow.executableNow === false,
      "The A16 docket remains non-executable and cleanup is not authorized."
    ),
    checkRow(
      "canonical-authorizations-remain-non-executable",
      authorizations.cleanupAuthorized === false &&
        authorizations.executableNow === false &&
        (authorizations.authorizations ?? []).every((row) => row.cleanupAuthorized === false && row.executableNow === false),
      "The canonical owner authorization input still records approval only and does not authorize execution or cleanup."
    )
  ];

  const allChecks = [
    ...structuralChecks,
    ...commandChecks.map((row) => checkRow(row.id, row.passed, row.command, row))
  ];
  const passingChecks = allChecks.filter((row) => row.passed).length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceOwnerAuthorizationsGeneratedAt: authorizations.generatedAt,
    sourcePackageExtractionRequestGeneratedAt: request.generatedAt,
    sourceExecutionAuthorizationDocketGeneratedAt: docket.generatedAt,
    ownerPathspec: A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.ownerPathspec,
    candidateId: "wave-05-visualization-ai-runtime:a16-research-evidence",
    approvalIds: executionRow.sourceApprovalIds ?? [],
    exactCommandSequence,
    packageFiles,
    packageFingerprints: packageFingerprints.files,
    packageFingerprintSha256: packageFingerprints.sha256,
    cleanupAuthorized: false,
    executableNow: false,
    boundary: {
      evidenceOnly: true,
      preExecutionValidationOnly: true,
      recordsOwnerApproval: false,
      writesExecutionInstructions: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: true
    },
    summary: {
      packageFileRows: packageFiles.length,
      packageFingerprintRows: packageFingerprints.files.length,
      packageFingerprintSha256: packageFingerprints.sha256,
      pathspecRows: pathspecRows.length,
      exactCommandRows: exactCommandSequence.length,
      commandCheckRows: commandChecks.length,
      passingChecks,
      totalChecks: allChecks.length,
      preExecutionValidationReady: passingChecks === allChecks.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    checks: allChecks,
    notAuthorizedByThisReport: [
      "git add",
      "git commit",
      "git reset",
      "git restore",
      "git clean",
      "git push",
      "worktree removal",
      "branch deletion",
      "deploy",
      "cleanup apply"
    ]
  };
}

export function stableA16PreExecutionValidationReportProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceOwnerAuthorizationsGeneratedAt: payload.sourceOwnerAuthorizationsGeneratedAt,
    sourcePackageExtractionRequestGeneratedAt: payload.sourcePackageExtractionRequestGeneratedAt,
    sourceExecutionAuthorizationDocketGeneratedAt: payload.sourceExecutionAuthorizationDocketGeneratedAt,
    ownerPathspec: payload.ownerPathspec,
    candidateId: payload.candidateId,
    approvalIds: payload.approvalIds,
    exactCommandSequence: payload.exactCommandSequence,
    packageFiles: payload.packageFiles,
    packageFingerprints: payload.packageFingerprints,
    packageFingerprintSha256: payload.packageFingerprintSha256,
    cleanupAuthorized: payload.cleanupAuthorized,
    executableNow: payload.executableNow,
    boundary: payload.boundary,
    summary: payload.summary,
    checks: payload.checks.map((row) => ({
      id: row.id,
      status: row.status,
      passed: row.passed,
      detail: row.detail,
      command: row.command,
      statusCode: row.statusCode
    })),
    notAuthorizedByThisReport: payload.notAuthorizedByThisReport
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const checkRows = payload.checks.map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n");
  const fileRows = payload.packageFiles.map((file) => `- \`${file}\``).join("\n");
  const fingerprintRows = payload.packageFingerprints.map((row) => (
    `| \`${cell(row.path)}\` | ${row.bytes} | ${row.lineCount} | \`${row.sha256}\` |`
  )).join("\n");
  const commandRows = payload.exactCommandSequence.map((command) => `- \`${command}\``).join("\n");

  return `# A25 A16 Pre-Execution Validation Report

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Candidate: \`${payload.candidateId}\`

This report is pre-execution validation only. It does not authorize staging, committing, merging, cleanup, worktree removal, branch deletion, reset, clean, push, deploy, or any physical lifecycle command. A separate owner execution instruction is still required before the exact command sequence can run.

## Summary

- Package file rows: ${payload.summary.packageFileRows}
- Package fingerprint rows: ${payload.summary.packageFingerprintRows}
- Package fingerprint sha256: \`${payload.summary.packageFingerprintSha256}\`
- Pathspec rows: ${payload.summary.pathspecRows}
- Exact command rows: ${payload.summary.exactCommandRows}
- Checks passed: ${payload.summary.passingChecks}/${payload.summary.totalChecks}
- Pre-execution validation ready: ${payload.summary.preExecutionValidationReady ? "yes" : "no"}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Package Files

${fileRows}

## Package Fingerprints

| Path | Bytes | Lines | SHA256 |
| --- | ---: | ---: | --- |
${fingerprintRows}

## Future Exact Command Sequence

${commandRows}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checkRows}

## Boundary

- Records owner approval: false.
- Writes execution instructions: false.
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
  const payload = buildA16PreExecutionValidationReport();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.latestJson, json);
  write(A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.datedJson, json);
  write(A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.latestMarkdown, md);
  write(A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.latestJson,
    latestMarkdown: A16_PRE_EXECUTION_VALIDATION_REPORT_PATHS.latestMarkdown,
    packageFileRows: payload.summary.packageFileRows,
    packageFingerprintRows: payload.summary.packageFingerprintRows,
    packageFingerprintSha256: payload.summary.packageFingerprintSha256,
    exactCommandRows: payload.summary.exactCommandRows,
    passingChecks: payload.summary.passingChecks,
    totalChecks: payload.summary.totalChecks,
    preExecutionValidationReady: payload.summary.preExecutionValidationReady,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
