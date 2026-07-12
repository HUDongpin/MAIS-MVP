#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  requestPacket: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json",
  requestPacketGate: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet-current-gate.json",
  executionInstructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-preflight.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-artifact-clean-execution-preflight.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-artifact-clean-execution-preflight.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-artifact-clean-execution-preflight.md`
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

function wave01ArtifactCleanRequests(requestPacket) {
  return (requestPacket.requests ?? []).filter((row) =>
    row.approvalId?.startsWith("wave01-resync-") &&
    row.approvalId !== "wave01-resync-01-tsconfig-json" &&
    row.exactCommandSequence?.some((command) => command.startsWith("git clean -f -- "))
  );
}

function wave01ArtifactCleanConsumedInstructions(executionInstructions) {
  return (executionInstructions.consumedInstructionsDoNotExecute ?? []).filter((row) =>
    row.consumedStatus === "post-clean-verified" &&
    row.approvalId?.startsWith("wave01-resync-") &&
    row.approvalId !== "wave01-resync-01-tsconfig-json" &&
    row.command?.startsWith("git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-")
  );
}

function dryRunRemovals(output) {
  if (!output) return [];
  return output.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.replace(/^Would remove /, ""))
    .filter(Boolean);
}

function check(id, passed, detail) {
  return { id, status: passed ? "pass" : "fail", detail };
}

function preflightRow(row) {
  const command = row.exactCommandSequence?.[0] ?? "";
  const packageFile = row.packageFiles?.[0] ?? "";
  const cwd = row.cwd ?? "";
  const cwdExists = fs.existsSync(cwd);
  const fileAbsolutePath = cwdExists && packageFile ? path.join(cwd, packageFile) : "";
  const fileExists = fileAbsolutePath ? fs.existsSync(fileAbsolutePath) : false;
  const gitTopLevel = cwdExists ? runGit(cwd, ["rev-parse", "--show-toplevel"]) : { status: 1, stdout: "", stderr: "cwd missing" };
  const status = cwdExists && packageFile ? runGit(cwd, ["status", "--short", "--", packageFile]) : { status: 1, stdout: "", stderr: "missing cwd or file" };
  const dryRun = cwdExists && packageFile ? runGit(cwd, ["clean", "-n", "--", packageFile]) : { status: 1, stdout: "", stderr: "missing cwd or file" };
  const removals = dryRunRemovals(dryRun.stdout);
  const expectedStatus = `?? ${packageFile}`;
  const checks = [
    check("request-waits-for-owner-execution-instruction", row.status === "waiting-for-owner-execution-instruction", `status=${row.status ?? "missing"}`),
    check("single-exact-git-clean-command", row.exactCommandSequence?.length === 1 && command === `git clean -f -- ${packageFile}`, command || "missing command"),
    check("single-package-file", row.packageFiles?.length === 1 && packageFile.startsWith("coordination/release-intake/"), packageFile || "missing file"),
    check("target-worktree-exists", cwdExists && gitTopLevel.status === 0, cwd),
    check("target-file-exists", fileExists, packageFile),
    check("target-file-is-untracked", status.status === 0 && status.stdout === expectedStatus, status.stdout || status.stderr || "empty status"),
    check("dry-run-would-remove-only-target", dryRun.status === 0 && removals.length === 1 && removals[0] === packageFile, dryRun.stdout || dryRun.stderr || "empty dry-run"),
    check("owner-text-requires-separate-execution", row.copyableExecutionText?.includes("Authorize separate execution") === true, "copyableExecutionText separate-execution term"),
    check("owner-text-excludes-broad-actions", row.copyableExecutionText?.includes("No cleanup") === true && row.copyableExecutionText?.includes("broad staging") === true && row.copyableExecutionText?.includes("deploy") === true, "copyableExecutionText excludes broad cleanup/staging/deploy"),
    check("non-executable-boundary", row.cleanupAuthorized === false && row.executableNow === false, `cleanup=${row.cleanupAuthorized}; executable=${row.executableNow}`)
  ];
  const failedChecks = checks.filter((item) => item.status !== "pass");
  return {
    approvalId: row.approvalId,
    owner: row.owner,
    cwd,
    gitTopLevel: gitTopLevel.stdout,
    packageFile,
    command,
    statusShort: status.stdout,
    dryRunCommand: `git clean -n -- ${packageFile}`,
    dryRunOutput: dryRun.stdout,
    dryRunRemovals: removals,
    wouldRemoveOnlyTarget: removals.length === 1 && removals[0] === packageFile,
    checks,
    passingChecks: checks.length - failedChecks.length,
    failedChecks: failedChecks.length,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function postCleanPreflightRow(row) {
  const command = row.command ?? "";
  const packageFile = row.packageFiles?.[0] ?? row.path ?? "";
  const cwd = row.cwd ?? "";
  const cwdExists = fs.existsSync(cwd);
  const gitTopLevel = cwdExists ? runGit(cwd, ["rev-parse", "--show-toplevel"]) : { status: 1, stdout: "", stderr: "cwd missing" };
  const status = cwdExists && packageFile ? runGit(cwd, ["status", "--short", "--", packageFile]) : { status: 1, stdout: "", stderr: "missing cwd or file" };
  const dryRun = cwdExists && packageFile ? runGit(cwd, ["clean", "-n", "--", packageFile]) : { status: 1, stdout: "", stderr: "missing cwd or file" };
  const removals = dryRunRemovals(dryRun.stdout);
  const checks = [
    check("consumed-post-clean-instruction", row.consumedStatus === "post-clean-verified", `consumedStatus=${row.consumedStatus ?? "missing"}`),
    check("single-exact-git-clean-command", command === `git clean -f -- ${packageFile}`, command || "missing command"),
    check("single-package-file", packageFile.startsWith("coordination/release-intake/"), packageFile || "missing file"),
    check("target-worktree-exists", cwdExists && gitTopLevel.status === 0, cwd),
    check("target-is-already-clean", status.status === 0 && status.stdout === "", status.stdout || status.stderr || "empty status"),
    check("dry-run-has-no-removals", dryRun.status === 0 && removals.length === 0, dryRun.stdout || dryRun.stderr || "empty dry-run"),
    check("owner-text-retains-exclusions", row.executionText?.includes("No cleanup") === true && row.executionText?.includes("broad staging") === true && row.executionText?.includes("deploy") === true, "executionText excludes broad cleanup/staging/deploy"),
    check("non-executable-boundary", row.cleanupAuthorized === false && row.executableNow === false, `cleanup=${row.cleanupAuthorized}; executable=${row.executableNow}`)
  ];
  const failedChecks = checks.filter((item) => item.status !== "pass");
  return {
    approvalId: row.approvalId,
    owner: row.owner,
    cwd,
    gitTopLevel: gitTopLevel.stdout,
    packageFile,
    command,
    statusShort: status.stdout,
    dryRunCommand: `git clean -n -- ${packageFile}`,
    dryRunOutput: dryRun.stdout,
    dryRunRemovals: removals,
    wouldRemoveOnlyTarget: false,
    targetAlreadyClean: status.status === 0 && status.stdout === "" && removals.length === 0,
    copyableExecutionInstructionText: row.executionText ?? row.requiredExecutionText ?? "",
    checks,
    passingChecks: checks.length - failedChecks.length,
    failedChecks: failedChecks.length,
    cleanupAuthorized: false,
    executableNow: false
  };
}

export function buildWave01ArtifactCleanExecutionPreflight() {
  const dirtyMap = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.dirtyMap);
  const requestPacket = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.requestPacket);
  const requestPacketGate = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.requestPacketGate);
  const executionInstructions = readJson(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.executionInstructions);
  const requests = wave01ArtifactCleanRequests(requestPacket);
  const consumedInstructions = wave01ArtifactCleanConsumedInstructions(executionInstructions);
  const postCleanMode = requests.length === 0 && consumedInstructions.length === 6;
  const rows = postCleanMode ? consumedInstructions.map(postCleanPreflightRow) : requests.map(preflightRow);
  const failedRows = rows.filter((row) => row.failedChecks > 0);
  const sourceCurrentnessFailures = [];
  if (requestPacket.dirtyMapStatusSignature !== dirtyMap.statusSignature) sourceCurrentnessFailures.push("request packet dirty-map signature is stale");
  if (requestPacket.expandedStatusEntries !== (dirtyMap.statusCounts?.expandedStatusEntries ?? null)) sourceCurrentnessFailures.push("request packet expanded dirty entry count is stale");
  if ((requestPacketGate.failures ?? []).length !== 0) sourceCurrentnessFailures.push("request packet gate has failures");
  if (requestPacketGate.dirtyMapStatusSignature !== dirtyMap.statusSignature) sourceCurrentnessFailures.push("request packet gate dirty-map signature is stale");
  if (executionInstructions.dirtyMapStatusSignature !== dirtyMap.statusSignature) sourceCurrentnessFailures.push("execution instructions dirty-map signature is stale");
  const cleanupAuthorizedRows = rows.filter((row) => row.cleanupAuthorized === true).length;
  const executableRows = rows.filter((row) => row.executableNow === true).length;
  const targetAlreadyCleanRows = rows.filter((row) => row.targetAlreadyClean === true).length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    evidenceKind: "wave01-artifact-clean-execution-preflight",
    preflightStatus: postCleanMode ? "post-clean-verified" : "waiting-for-owner-execution-instruction",
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      requestPacketGeneratedAt: requestPacket.generatedAt,
      requestPacketGateCheckedAt: requestPacketGate.checkedAt,
      requestPacketGatePath: WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.requestPacketGate,
      executionInstructionsGeneratedAt: executionInstructions.generatedAt
    },
    rows,
    sourceCurrentnessFailures,
    summary: {
      requestRows: requests.length,
      consumedInstructionRows: consumedInstructions.length,
      preflightRows: rows.length,
      passingRows: rows.length - failedRows.length,
      failedRows: failedRows.length,
      totalRowChecks: rows.reduce((total, row) => total + row.checks.length, 0),
      passingRowChecks: rows.reduce((total, row) => total + row.passingChecks, 0),
      dryRunWouldRemoveRows: rows.filter((row) => row.wouldRemoveOnlyTarget).length,
      targetAlreadyCleanRows,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length,
      cleanupAuthorizedRows,
      executableRows,
      preflightStatus: postCleanMode ? "post-clean-verified" : "waiting-for-owner-execution-instruction"
    },
    boundary: {
      evidenceOnly: true,
      dryRunOnly: true,
      runsGitCleanDryRun: true,
      runsGitCleanForce: false,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: rows.length > 0 && !postCleanMode
    }
  };
}

export function stableWave01ArtifactCleanExecutionPreflightProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    evidenceKind: payload.evidenceKind,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: {
      requestPacketGeneratedAt: payload.sourceArtifacts?.requestPacketGeneratedAt,
      requestPacketGatePath: payload.sourceArtifacts?.requestPacketGatePath
    },
    rows: payload.rows,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const rows = payload.rows.map((row) =>
    `| \`${cell(row.approvalId)}\` | \`${cell(row.packageFile)}\` | \`${cell(row.statusShort || "n/a")}\` | ${row.wouldRemoveOnlyTarget ? "yes" : "no"} | ${row.passingChecks}/${row.checks.length} |`
  ).join("\n") || "| none | n/a | n/a | no | 0/0 |";
  const details = payload.rows.map((row) => `## ${row.approvalId}

CWD: \`${row.cwd}\`

Command needing separate owner execution instruction:

\`\`\`text
${row.command}
\`\`\`

Dry-run command executed by this preflight:

\`\`\`text
${row.dryRunCommand}
\`\`\`

Dry-run output:

\`\`\`text
${row.dryRunOutput}
\`\`\`

Checks:

${row.checks.map((item) => `- ${item.status === "pass" ? "PASS" : "FAIL"} ${item.id}: ${item.detail}`).join("\n")}
`).join("\n");

  return `# A25 Wave01 Artifact-Clean Execution Preflight

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This is a dry-run-only preflight. It runs \`git clean -n\` for the six Wave01 A25 artifact-clean requests and does not execute \`git clean -f\`. It does not record an execution instruction and does not authorize staging, committing, merging, cleanup, worktree removal, branch deletion, reset, push, deploy, or any unrelated file operation.

## Summary

- Request rows: ${payload.summary.requestRows}
- Preflight rows: ${payload.summary.preflightRows}
- Passing rows: ${payload.summary.passingRows}/${payload.summary.preflightRows}
- Dry-run would-remove-only-target rows: ${payload.summary.dryRunWouldRemoveRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}
- Cleanup authorized: false
- Executable now: false
- Requires separate owner execution instruction: ${payload.boundary.requiresSeparateOwnerExecutionInstruction ? "true" : "false"}

## Rows

| Approval ID | Package file | Status | Dry-run only target | Checks |
| --- | --- | --- | --- | --- |
${rows}

${details}

## Boundary

- Evidence only: true
- Dry-run only: true
- Runs git clean -n: true
- Runs git clean -f: false
- Records execution instruction: false
- Cleanup authorized: false
- Executable now: false
- Deploy authorized: false
`;
}

export function writeWave01ArtifactCleanExecutionPreflight() {
  const payload = buildWave01ArtifactCleanExecutionPreflight();
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.latestMarkdown, markdown(payload));
  write(WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.datedMarkdown, markdown(payload));
  return payload;
}

function main() {
  const payload = writeWave01ArtifactCleanExecutionPreflight();
  console.log(JSON.stringify({
    latestJson: WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.latestJson,
    latestMarkdown: WAVE01_ARTIFACT_CLEAN_EXECUTION_PREFLIGHT_PATHS.latestMarkdown,
    preflightRows: payload.summary.preflightRows,
    passingRows: payload.summary.passingRows,
    failedRows: payload.summary.failedRows,
    dryRunWouldRemoveRows: payload.summary.dryRunWouldRemoveRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
