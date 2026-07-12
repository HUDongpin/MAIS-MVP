#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  approvalRequests: "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json",
  currentPlan: "coordination/release-intake/2026-07-01-A25-dirty-worktree-current-cleanup-plan.md",
  latestJson: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-package-resync-execution-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-package-resync-execution-packet.md`
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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function makeExecutionRow(request, index) {
  const preExecutionChecks = [
    "node coordination/release-intake/assert-wave01-governance-readiness-current.mjs",
    "node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs",
    "node coordination/release-intake/assert-no-staged-changes.mjs --json",
    `git -C ${request.worktreePath} status --short -- ${request.path}`
  ];
  const postExecutionChecks = [
    `npm run release:dirty-map -- --reason "A25 Wave 01 resync execution ${request.approvalId}"`,
    "node coordination/release-intake/generate-wave01-governance-readiness.mjs",
    "node coordination/release-intake/assert-wave01-governance-readiness-current.mjs",
    "node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs",
    "node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs",
    "node coordination/release-intake/generate-wave01-package-resync-execution-packet.mjs",
    "node coordination/release-intake/assert-wave01-package-resync-execution-packet-current.mjs",
    "node coordination/release-intake/assert-no-staged-changes.mjs --json"
  ];

  return {
    executionIndex: index + 1,
    approvalId: request.approvalId,
    owner: request.owner,
    path: request.path,
    worktreePath: request.worktreePath,
    branch: request.branch,
    selectedAction: request.actionKind,
    exactCommand: request.commandHint,
    commandCwd: request.worktreePath,
    packageOnly: request.packageOnly,
    rootPathExists: request.rootPathExists,
    worktreePathExists: request.worktreePathExists,
    requiresExactOwnerAuthorization: true,
    ownerAuthorizationPresent: false,
    cleanupAuthorized: false,
    executableNow: false,
    requiredAuthorizationText: request.requiredAuthorizationText,
    preExecutionChecks,
    postExecutionChecks,
    evidence: [
      paths.currentPlan,
      paths.approvalRequests,
      "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
      "coordination/release-intake/latest-A25-wave01-governance-readiness.md"
    ],
    stopCondition: "Do not execute this row unless the owner authorizes this exact approvalId, selectedAction, exactCommand, worktreePath, path, approvedBy, and approvedAt."
  };
}

function markdown(payload) {
  const rows = payload.executionRows.map((row) => (
    `| ${row.executionIndex} | \`${row.approvalId}\` | ${row.owner} | \`${row.path}\` | ${row.selectedAction} | \`${row.exactCommand}\` | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a | n/a | n/a |";

  const details = payload.executionRows.map((row) => `### ${row.executionIndex}. ${row.approvalId}

- Owner: ${row.owner}
- Worktree: \`${row.worktreePath}\`
- Branch: \`${row.branch}\`
- Path: \`${row.path}\`
- Selected action: ${row.selectedAction}
- Exact command, if later authorized: \`${row.exactCommand}\`
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
- Required authorization:

\`\`\`text
${row.requiredAuthorizationText}
\`\`\`

- Pre-execution checks:
${row.preExecutionChecks.map((check) => `  - \`${check}\``).join("\n")}
- Post-execution checks:
${row.postExecutionChecks.map((check) => `  - \`${check}\``).join("\n")}
- Stop condition: ${row.stopCondition}
`).join("\n");

  return `# A25 Wave 01 Package Resync Execution Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Source approval requests: \`${paths.approvalRequests}\`

This is an execution-readiness packet, not authorization. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any other physical cleanup. Every row remains non-executable until the owner explicitly authorizes the exact approval ID, selected action, and command.

## Summary

- Execution rows: ${payload.summary.executionRows}
- Rows requiring exact owner authorization: ${payload.summary.requiresAuthorizationRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Execution Rows

| # | Approval ID | Owner | Path | Selected action | Exact command | Executable now |
| ---: | --- | --- | --- | --- | --- | --- |
${rows}

## Execution Details

${details || "No Wave 01 package resync execution rows are currently required."}

## Pre-execution checks

No Wave 01 package resync pre-execution checks are currently required because there are 0 execution rows.

## Post-execution checks

No Wave 01 package resync post-execution checks are currently required because there are 0 execution rows.
`;
}

function main() {
  if (!exists(paths.currentPlan)) {
    throw new Error(`Missing current cleanup plan: ${paths.currentPlan}`);
  }
  const dirtyMap = readJson(paths.dirtyMap);
  const approvalRequests = readJson(paths.approvalRequests);
  if (approvalRequests.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Wave 01 approval requests are stale relative to the latest dirty map.");
  }
  if (approvalRequests.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("Wave 01 approval request dirty entry count is stale.");
  }

  const executionRows = (approvalRequests.requests ?? []).map(makeExecutionRow);
  const summary = {
    executionRows: executionRows.length,
    requiresAuthorizationRows: executionRows.filter((row) => row.requiresExactOwnerAuthorization).length,
    cleanupAuthorizedRows: executionRows.filter((row) => row.cleanupAuthorized).length,
    executableRows: executionRows.filter((row) => row.executableNow).length
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    approvalRequestsGeneratedAt: approvalRequests.generatedAt,
    cleanupAuthorized: false,
    executableNow: false,
    summary,
    executionRows
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, md);
  write(paths.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    executionRows: summary.executionRows,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
