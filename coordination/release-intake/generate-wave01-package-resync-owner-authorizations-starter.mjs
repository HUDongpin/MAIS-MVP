#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionPacket: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  template: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json",
  target: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations-starter.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations-starter.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-package-resync-owner-authorizations-starter.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-package-resync-owner-authorizations-starter.md`
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

function approvalFingerprint(row, dirtyMap, executionPacket) {
  const fingerprintPayload = {
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceExecutionPacketGeneratedAt: executionPacket.generatedAt,
    approvalId: row.approvalId,
    owner: row.owner,
    worktreePath: row.worktreePath,
    branch: row.branch,
    path: row.path,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    commandCwd: row.commandCwd
  };
  return crypto.createHash("sha256").update(JSON.stringify(fingerprintPayload)).digest("hex");
}

function makeStarterRow(row, dirtyMap, executionPacket) {
  return {
    approvalId: row.approvalId,
    approvalFingerprint: approvalFingerprint(row, dirtyMap, executionPacket),
    owner: row.owner,
    worktreePath: row.worktreePath,
    branch: row.branch,
    path: row.path,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    commandCwd: row.commandCwd,
    approvedBy: "",
    approvedAt: "",
    evidenceReviewed: [
      paths.template,
      paths.executionPacket,
      "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template-current-gate.json",
      "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet-current-gate.json"
    ],
    notes: "",
    authorizationText: row.authorizationTextToPaste,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function markdown(payload) {
  const rows = payload.authorizations.map((row) => (
    `| \`${row.approvalId}\` | ${row.owner} | \`${row.path}\` | ${row.selectedAction} | ${row.approvedBy ? "filled" : "blank"} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a | n/a |";

  const details = payload.authorizations.map((row) => `### ${row.approvalId}

- Owner: ${row.owner}
- Worktree: \`${row.worktreePath}\`
- Branch: \`${row.branch}\`
- Path: \`${row.path}\`
- Selected action: ${row.selectedAction}
- Exact command: \`${row.exactCommand}\`
- Approval fingerprint: \`${row.approvalFingerprint}\`
- Approved by: ${row.approvedBy || "(blank)"}
- Approved at: ${row.approvedAt || "(blank)"}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
- Required evidence reviewed:
${row.evidenceReviewed.map((evidence) => `  - \`${evidence}\``).join("\n")}
- Authorization text:

\`\`\`text
${row.authorizationText}
\`\`\`
`).join("\n");

  return `# A25 Wave 01 Package Resync Owner Authorizations Starter

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Source template generated: ${payload.sourceTemplateGeneratedAt}

Target authorization file: \`${paths.target}\`

This is a starter artifact only, not authorization. It does not create or update the target authorization file. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Starter rows: ${payload.summary.starterRows}
- Blank approval rows: ${payload.summary.blankApprovalRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Starter Rows

| Approval ID | Owner | Path | Selected action | Approval fields | Executable now |
| --- | --- | --- | --- | --- | --- |
${rows}

## Starter Details

${details || "No Wave 01 package resync owner-authorization starter rows are currently required."}

## Approval fingerprint

No Wave 01 package resync approval fingerprint is currently required because there are 0 starter rows.
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const executionPacket = readJson(paths.executionPacket);
  const template = readJson(paths.template);

  if (template.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Wave 01 owner authorization template is stale relative to the latest dirty map.");
  }
  if (template.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error("Wave 01 owner authorization template dirty entry count is stale.");
  }
  if (template.executionPacketGeneratedAt !== executionPacket.generatedAt) {
    throw new Error("Wave 01 owner authorization template is stale relative to the execution packet.");
  }

  const authorizations = (template.authorizations ?? []).map((row) => makeStarterRow(row, dirtyMap, executionPacket));
  const summary = {
    starterRows: authorizations.length,
    blankApprovalRows: authorizations.filter((row) => !row.approvedBy && !row.approvedAt && !row.notes).length,
    cleanupAuthorizedRows: authorizations.filter((row) => row.cleanupAuthorized).length,
    executableRows: authorizations.filter((row) => row.executableNow).length
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceTemplateGeneratedAt: template.generatedAt,
    sourceExecutionPacketGeneratedAt: executionPacket.generatedAt,
    authorizationTarget: paths.target,
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
    starterRows: summary.starterRows,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows
  }, null, 2));
}

main();
