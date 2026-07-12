#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  wave01: "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-package-resync-approval-requests.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-package-resync-approval-requests.md`
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

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function approvalText(request) {
  return [
    `Authorize approvalId=${request.approvalId}`,
    `worktree=${request.worktreePath}`,
    `path=${request.path}`,
    `selectedAction=${request.actionKind}`,
    `command=${request.commandHint}`,
    "approvedBy=<owner>",
    "approvedAt=<ISO-8601>",
    "notes=<scope, evidence reviewed, accepted risk>"
  ].join("; ");
}

function makeRequest(recommendation, index, wave01) {
  const request = {
    approvalId: `wave01-resync-${String(index + 1).padStart(2, "0")}-${slug(recommendation.path)}`,
    owner: recommendation.path === "tsconfig.json"
      ? "A10 tooling, docs, and report"
      : "A25 git hygiene and release intake",
    path: recommendation.path,
    worktreePath: wave01.worktree.path,
    branch: wave01.worktree.branch,
    actionKind: recommendation.actionKind,
    commandHint: recommendation.commandHint,
    packageOnly: recommendation.packageOnly,
    rootPathExists: recommendation.rootPathExists,
    worktreePathExists: recommendation.worktreePathExists,
    approvalNeeded: recommendation.approvalNeeded,
    evidence: [
      paths.wave01,
      "coordination/release-intake/latest-A25-wave01-governance-readiness.md"
    ],
    executableNow: false,
    cleanupAuthorized: false
  };
  return {
    ...request,
    requiredAuthorizationText: approvalText(request),
    postApprovalChecks: [
      "node coordination/release-intake/generate-wave01-governance-readiness.mjs",
      "node coordination/release-intake/assert-wave01-governance-readiness-current.mjs",
      "node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs",
      "node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs",
      "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"
    ]
  };
}

function markdown(payload) {
  const requestRows = payload.requests.map((request) => {
    return `| \`${request.approvalId}\` | ${request.owner} | \`${request.path}\` | ${request.actionKind} | \`${request.commandHint}\` |`;
  }).join("\n") || "| none | n/a | n/a | n/a | n/a |";

  const detailSections = payload.requests.map((request) => {
    return `### ${request.approvalId}

- Owner: ${request.owner}
- Worktree: \`${request.worktreePath}\`
- Branch: \`${request.branch}\`
- Path: \`${request.path}\`
- Action kind: ${request.actionKind}
- Cleanup authorized: ${request.cleanupAuthorized}
- Executable now: ${request.executableNow}
- Authorization text:

\`\`\`text
${request.requiredAuthorizationText}
\`\`\`

- Post-approval checks:
${request.postApprovalChecks.map((check) => `  - \`${check}\``).join("\n")}
`;
  }).join("\n");

  return `# A25 Wave 01 Package Resync Approval Requests

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Wave 01 worktree: \`${payload.worktreePath}\`

This is an approval-request artifact, not authorization. It does not approve staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, file restore, file deletion, or any other physical cleanup. Every row remains non-executable until the owner explicitly authorizes the exact approval ID and command.

## Summary

- Requests: ${payload.summary.requests}
- Package-only requests: ${payload.summary.packageOnly}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Requests

| Approval ID | Owner | Path | Action kind | Command hint |
| --- | --- | --- | --- | --- |
${requestRows}

## Approval Details

${detailSections || "No package resync requests are currently required."}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const wave01 = readJson(paths.wave01);
  if (wave01.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error("Wave 01 readiness is stale relative to the latest dirty map.");
  }

  const requests = (wave01.packageResyncRecommendations ?? [])
    .map((recommendation, index) => makeRequest(recommendation, index, wave01));
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    wave01GeneratedAt: wave01.generatedAt,
    wave01StatusSignature: wave01.worktree?.statusSignature ?? null,
    worktreePath: wave01.worktree.path,
    branch: wave01.worktree.branch,
    cleanupAuthorized: false,
    executableNow: false,
    summary: {
      requests: requests.length,
      packageOnly: requests.filter((request) => request.packageOnly).length,
      cleanupAuthorizedRows: requests.filter((request) => request.cleanupAuthorized).length,
      executableRows: requests.filter((request) => request.executableNow).length
    },
    requests
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  write(paths.latestMarkdown, markdown(payload));
  write(paths.datedMarkdown, markdown(payload));

  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMarkdown,
    datedJson: paths.datedJson,
    datedMarkdown: paths.datedMarkdown,
    requests: payload.summary.requests,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

main();
