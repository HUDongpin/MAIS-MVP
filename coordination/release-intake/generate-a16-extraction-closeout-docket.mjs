#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  preExecutionReport: "coordination/release-intake/latest-A25-a16-pre-execution-validation-report.json",
  postExtractionReport: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
  executionInstructionAcceptanceDocket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-acceptance-docket.json",
  latestJson: "coordination/release-intake/latest-A25-a16-extraction-closeout-docket.json",
  latestMarkdown: "coordination/release-intake/latest-A25-a16-extraction-closeout-docket.md",
  datedJson: `coordination/release-intake/${date}-A25-a16-extraction-closeout-docket.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-a16-extraction-closeout-docket.md`
};

const POST_EXECUTION_COMMANDS = [
  "node coordination/release-intake/assert-no-staged-changes.mjs --json",
  "npm run release:dirty-map -- --reason \"A25 post-A16 package extraction commit\"",
  "node coordination/release-intake/generate-a16-post-extraction-verification-report.mjs",
  "node coordination/release-intake/assert-a16-post-extraction-verification-report-current.mjs --json",
  "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"
];

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

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function sourceCurrentnessFailures({ dirtyMap, preExecution, postExtraction, acceptanceDocket }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  const postExtractionVerified = postExtraction.lifecycleStatus === "post-extraction-verified" &&
    postExtraction.postExtractionVerified === true;
  const requiredCurrentSources = [
    ["A16 post-extraction verification report", postExtraction]
  ];
  const preExtractionSnapshotSources = [
    ["A16 pre-execution validation report", preExecution],
    ["next-owner execution-instruction acceptance docket", acceptanceDocket]
  ];
  for (const [label, payload] of requiredCurrentSources) {
    if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  if (!postExtractionVerified) {
    for (const [label, payload] of preExtractionSnapshotSources) {
      if (payload.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
      if (payload.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
    }
  }
  if (preExecution.summary?.preExecutionValidationReady !== true) failures.push("A16 pre-execution validation is not ready");
  if ((postExtraction.summary?.failedChecks ?? -1) !== 0) failures.push("A16 post-extraction verification has failed checks");
  if ((acceptanceDocket.summary?.failedAcceptanceChecks ?? -1) !== 0) {
    failures.push("execution-instruction acceptance docket has failed checks");
  }
  return failures;
}

function statusProfile(postExtraction) {
  const packageFiles = postExtraction.packageFiles ?? [];
  const packageStatusRows = postExtraction.packageStatusRows ?? [];
  const statusByPath = new Map(packageStatusRows.map((row) => [row.path, row.status]));
  return packageFiles.map((filePath) => ({
    path: filePath,
    currentStatus: statusByPath.get(filePath) ?? "clean-or-committed",
    expectedPendingStatus: "??",
    expectedVerifiedStatus: "clean-or-committed"
  }));
}

function buildShrinkExpectation({ dirtyMap, postExtraction }) {
  const packageFiles = postExtraction.packageFiles ?? [];
  const packageStatusRows = postExtraction.packageStatusRows ?? [];
  const currentPackageDirtyRows = packageStatusRows.length;
  const verified = postExtraction.postExtractionVerified === true;
  return {
    currentExpandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    packageFileRows: packageFiles.length,
    currentPackageDirtyRows,
    expectedPackageDirtyRowsAfterExtraction: 0,
    expectedPackageDirtyRowReduction: verified ? 0 : currentPackageDirtyRows,
    expectedPackageFilesToLeaveDirtyMap: verified ? [] : packageFiles,
    note: "Total dirty-map entries can move when A25 evidence is regenerated; the invariant is that the six A16 package files leave packageStatusRows after the package extraction commit."
  };
}

function acceptanceChecks({ sourceFailures, postExtraction, acceptanceDocket, shrink }) {
  const packageFiles = postExtraction.packageFiles ?? [];
  const packageStatusRows = postExtraction.packageStatusRows ?? [];
  const pending = postExtraction.lifecycleStatus === "pending-owner-execution-instruction" ||
    postExtraction.lifecycleStatus === "pending-extraction-execution";
  const verified = postExtraction.lifecycleStatus === "post-extraction-verified" && postExtraction.postExtractionVerified === true;
  const a16AcceptanceRows = (acceptanceDocket.acceptanceRows ?? []).filter((row) =>
    row.rowKind === "a16-authorized-extraction" ||
    row.sourceKind === "a16-authorized-extraction" ||
    (row.candidateId ?? "").includes("a16")
  );
  const a16OwnerInstructionConsumed = (acceptanceDocket.summary?.ownerInputValidInstructionRows ?? 0) === 1;
  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `source currentness failures=${sourceFailures.length}`
    },
    {
      id: "coherent-pending-or-verified-state",
      status: pending || verified ? "pass" : "fail",
      detail: `lifecycleStatus=${postExtraction.lifecycleStatus}`
    },
    {
      id: "six-package-files",
      status: packageFiles.length === 6 && packageFiles.every((filePath) => filePath.startsWith("coordination/research/")) ? "pass" : "fail",
      detail: `package files=${packageFiles.length}`
    },
    {
      id: "package-dirty-row-shrink-profile",
      status: (pending && packageStatusRows.length === 6 && shrink.expectedPackageDirtyRowsAfterExtraction === 0) ||
        (verified && packageStatusRows.length === 0)
        ? "pass"
        : "fail",
      detail: `current package dirty rows=${packageStatusRows.length}; expected after extraction=0`
    },
    {
      id: "no-staged-package-rows",
      status: (postExtraction.summary?.stagedPackageRows ?? -1) === 0 ? "pass" : "fail",
      detail: `staged package rows=${postExtraction.summary?.stagedPackageRows ?? 0}`
    },
    {
      id: "pre-execution-acceptance-ready",
      status: acceptanceDocket.summary?.preExecutionValidationReady === true &&
        (
          (a16AcceptanceRows.length === 1 &&
            acceptanceDocket.summary?.instructionRowsInFile === 0 &&
            acceptanceDocket.summary?.ownerInputValidInstructionRows === 0) ||
          (a16AcceptanceRows.length === 0 && a16OwnerInstructionConsumed) ||
          verified
        )
        ? "pass"
        : "fail",
      detail: `A16 acceptance rows=${a16AcceptanceRows.length}; specialized owner input consumed=${a16OwnerInstructionConsumed ? "yes" : "no"}; verified=${verified ? "yes" : "no"}.`
    },
    {
      id: "post-execution-command-chain-present",
      status: POST_EXECUTION_COMMANDS.length === 5 &&
        POST_EXECUTION_COMMANDS[0].includes("assert-no-staged-changes") &&
        POST_EXECUTION_COMMANDS[1].includes("release:dirty-map") &&
        POST_EXECUTION_COMMANDS[3].includes("assert-a16-post-extraction-verification-report-current") &&
        POST_EXECUTION_COMMANDS[4].includes("assert-dirty-worktree-remediation-current")
        ? "pass"
        : "fail",
      detail: `post-execution commands=${POST_EXECUTION_COMMANDS.length}`
    },
    {
      id: "non-executable-boundary",
      status: acceptanceDocket.summary?.cleanupAuthorizedRows === 0 &&
        acceptanceDocket.summary?.executableRows === 0 &&
        postExtraction.summary?.cleanupAuthorizedRows === 0 &&
        postExtraction.summary?.executableRows === 0
        ? "pass"
        : "fail",
      detail: "Closeout docket is verification-only and does not authorize execution or cleanup."
    }
  ];
}

export function buildA16ExtractionCloseoutDocket() {
  const dirtyMap = readJson(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.dirtyMap);
  const preExecution = readJson(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.preExecutionReport);
  const postExtraction = readJson(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.postExtractionReport);
  const acceptanceDocket = readJson(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.executionInstructionAcceptanceDocket);
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap, preExecution, postExtraction, acceptanceDocket });
  const shrink = buildShrinkExpectation({ dirtyMap, postExtraction });
  const checks = acceptanceChecks({ sourceFailures, postExtraction, acceptanceDocket, shrink });
  const failedChecks = checks.filter((row) => row.status !== "pass");

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    docketKind: "a16-extraction-closeout",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      preExecutionValidationReportGeneratedAt: preExecution.generatedAt,
      postExtractionVerificationReportGeneratedAt: postExtraction.generatedAt,
      executionInstructionAcceptanceDocketGeneratedAt: acceptanceDocket.generatedAt
    },
    sourceCurrentnessFailures: sourceFailures,
    candidateId: postExtraction.candidateId,
    lifecycleStatus: postExtraction.lifecycleStatus,
    postExtractionVerified: postExtraction.postExtractionVerified === true,
    packageFiles: postExtraction.packageFiles ?? [],
    packageStatusProfile: statusProfile(postExtraction),
    shrinkExpectation: shrink,
    requiredPostExecutionCommands: POST_EXECUTION_COMMANDS,
    acceptanceChecks: checks,
    summary: {
      packageFileRows: (postExtraction.packageFiles ?? []).length,
      currentPackageDirtyRows: (postExtraction.packageStatusRows ?? []).length,
      expectedPackageDirtyRowsAfterExtraction: shrink.expectedPackageDirtyRowsAfterExtraction,
      expectedPackageDirtyRowReduction: shrink.expectedPackageDirtyRowReduction,
      postExtractionVerified: postExtraction.postExtractionVerified === true,
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.length - failedChecks.length,
      failedAcceptanceChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceFailures.length,
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    boundary: {
      evidenceOnly: true,
      closeoutDocketOnly: true,
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

export function stableA16ExtractionCloseoutDocketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    docketKind: payload.docketKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    candidateId: payload.candidateId,
    lifecycleStatus: payload.lifecycleStatus,
    postExtractionVerified: payload.postExtractionVerified,
    packageFiles: payload.packageFiles,
    packageStatusProfile: payload.packageStatusProfile,
    shrinkExpectation: payload.shrinkExpectation,
    requiredPostExecutionCommands: payload.requiredPostExecutionCommands,
    acceptanceChecks: payload.acceptanceChecks,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const statusRows = payload.packageStatusProfile.map((row) => (
    `| \`${cell(row.path)}\` | \`${cell(row.currentStatus)}\` | \`${cell(row.expectedVerifiedStatus)}\` |`
  )).join("\n");
  const checks = payload.acceptanceChecks.map((row) => `| \`${cell(row.id)}\` | ${row.status} | ${cell(row.detail)} |`).join("\n");
  return `# A25 A16 Extraction Closeout Docket

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This docket is verification-only. It describes the expected dirty-map shrink for the A16 research evidence package after a separately authorized extraction commit. It does not authorize staging, committing, merging, cleanup, worktree removal, branch deletion, reset, clean, push, deploy, or Vercel release.

## Summary

- Lifecycle status: ${payload.lifecycleStatus}
- Post-extraction verified: ${payload.postExtractionVerified ? "yes" : "no"}
- Package files: ${payload.summary.packageFileRows}
- Current package dirty rows: ${payload.summary.currentPackageDirtyRows}
- Expected package dirty rows after extraction: ${payload.summary.expectedPackageDirtyRowsAfterExtraction}
- Expected package dirty row reduction: ${payload.summary.expectedPackageDirtyRowReduction}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Package Shrink Profile

| Path | Current status | Expected verified status |
| --- | --- | --- |
${statusRows}

## Required Post-Execution Commands

${payload.requiredPostExecutionCommands.map((command) => `- \`${command}\``).join("\n")}

## Acceptance Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

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
  const payload = buildA16ExtractionCloseoutDocket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.latestJson, json);
  write(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.datedJson, json);
  write(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.latestMarkdown, md);
  write(A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.latestJson,
    latestMarkdown: A16_EXTRACTION_CLOSEOUT_DOCKET_PATHS.latestMarkdown,
    lifecycleStatus: payload.lifecycleStatus,
    packageFileRows: payload.summary.packageFileRows,
    currentPackageDirtyRows: payload.summary.currentPackageDirtyRows,
    expectedPackageDirtyRowsAfterExtraction: payload.summary.expectedPackageDirtyRowsAfterExtraction,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    acceptanceChecks: payload.summary.acceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
