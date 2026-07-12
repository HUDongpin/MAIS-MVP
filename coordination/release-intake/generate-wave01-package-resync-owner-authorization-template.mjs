#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionPacket: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-package-resync-owner-authorization-template.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-package-resync-owner-authorization-template.md`,
  authorizationTarget: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json"
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

function makeTemplateRow(row) {
  return {
    approvalId: row.approvalId,
    owner: row.owner,
    worktreePath: row.worktreePath,
    branch: row.branch,
    path: row.path,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    commandCwd: row.commandCwd,
    approvalStatus: "pending",
    approvedBy: "",
    approvedAt: "",
    evidenceReviewed: row.evidence,
    notes: "",
    requiredAuthorizationText: row.requiredAuthorizationText,
    authorizationTextToPaste: row.requiredAuthorizationText,
    preExecutionChecks: row.preExecutionChecks,
    postExecutionChecks: row.postExecutionChecks,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function markdown(payload) {
  const rows = payload.authorizations.map((row) => (
    `| \`${row.approvalId}\` | ${row.owner} | \`${row.path}\` | ${row.selectedAction} | ${row.approvalStatus} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a | n/a |";

  const details = payload.authorizations.map((row) => `### ${row.approvalId}

- Owner: ${row.owner}
- Worktree: \`${row.worktreePath}\`
- Branch: \`${row.branch}\`
- Path: \`${row.path}\`
- Selected action: ${row.selectedAction}
- Exact command, if later authorized: \`${row.exactCommand}\`
- Approval status: ${row.approvalStatus}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
- Authorization text to paste after owner review:

\`\`\`text
${row.authorizationTextToPaste}
\`\`\`
`).join("\n");

  return `# A25 Wave 01 Package Resync Owner Authorization Template

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Execution packet generated: ${payload.executionPacketGeneratedAt}

This is a template, not authorization. To authorize any row, the owner must create or update \`${paths.authorizationTarget}\` with the exact approval ID, selected action, exact command, approvedBy, approvedAt, evidence reviewed, and notes. This template does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Template rows: ${payload.summary.templateRows}
- Pending rows: ${payload.summary.pendingRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Template Rows

| Approval ID | Owner | Path | Selected action | Status | Executable now |
| --- | --- | --- | --- | --- | --- |
${rows}

## Authorization Details

${details || "No Wave 01 package resync authorization rows are currently required."}

## Authorization text to paste

No Wave 01 package resync authorization text is currently required because there are 0 template rows.
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const executionPacket = readJson(paths.executionPacket);
  if (executionPacket.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Wave 01 execution packet is stale relative to the latest dirty map.");
  }
  if (executionPacket.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("Wave 01 execution packet dirty entry count is stale.");
  }

  const authorizations = (executionPacket.executionRows ?? []).map(makeTemplateRow);
  const summary = {
    templateRows: authorizations.length,
    pendingRows: authorizations.filter((row) => row.approvalStatus === "pending").length,
    cleanupAuthorizedRows: authorizations.filter((row) => row.cleanupAuthorized).length,
    executableRows: authorizations.filter((row) => row.executableNow).length
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    executionPacketGeneratedAt: executionPacket.generatedAt,
    authorizationTarget: paths.authorizationTarget,
    cleanupAuthorized: false,
    executableNow: false,
    summary,
    authorizations
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
    templateRows: summary.templateRows,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
