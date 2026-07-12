#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionPreview: "coordination/release-intake/latest-A25-next-owner-authorization-execution-preview.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-authorized-command-manifest.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-authorized-command-manifest.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-authorized-command-manifest.md`
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

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function buildCandidate(row) {
  const hasExactCommand = typeof row.commandPreview === "string" && row.commandPreview.trim().length > 0;
  const preAuthorizationReady = row.preAuthorizationCheck?.overallReady === true;
  const readyForSeparateInstruction = row.authorizationRecorded === true && preAuthorizationReady && hasExactCommand;
  const packageFiles = Array.isArray(row.packageFiles) && row.packageFiles.length > 0
    ? row.packageFiles
    : row.path
      ? [row.path]
      : [];
  const blockers = [];
  if (row.authorizationRecorded !== true) blockers.push("authorization row is not recorded and valid");
  if (!preAuthorizationReady) blockers.push("pre-authorization evidence or target check is not ready");
  if (!hasExactCommand) blockers.push("no exact command is available; use work-order/manual package review");
  blockers.push("separate owner execution instruction is still required");

  return {
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    subject: row.subject,
    path: row.path,
    selectedAction: row.selectedAction,
    selectedFinalState: row.selectedFinalState,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    command: hasExactCommand ? row.commandPreview : "",
    packageFiles,
    cwd: row.commandPreviewCwd,
    worktreePath: row.worktreePath,
    branch: row.branch,
    preAuthorizationStatus: row.preAuthorizationCheck?.status ?? "missing",
    commandTargetStatus: row.preAuthorizationCheck?.command?.status ?? "missing",
    postApprovalChecks: row.postApprovalChecks ?? [],
    readyForSeparateInstruction,
    requiresSeparateExecutionInstruction: true,
    separateExecutionInstructionText: row.separateExecutionInstructionText || `A separate owner instruction must explicitly say to execute approvalId=${row.approvalId}.`,
    blockers,
    cleanupAuthorized: false,
    executableNow: false
  };
}

export function buildNextOwnerAuthorizedCommandManifest() {
  const dirtyMap = readJson(NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.dirtyMap);
  const executionPreview = readJson(NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.executionPreview);
  const previewSummary = executionPreview.summary ?? {};
  const previewRows = executionPreview.rows ?? [];
  const candidates = previewRows
    .filter((row) => row.authorizationRecorded === true)
    .map(buildCandidate);
  const readyCandidates = candidates.filter((row) => row.readyForSeparateInstruction);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceExecutionPreviewGeneratedAt: executionPreview.generatedAt,
    sourceAuthorizationFile: executionPreview.authorizationFile,
    cleanupAuthorized: false,
    executableNow: false,
    boundary: {
      evidenceOnly: true,
      manifestOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateExecutionInstruction: true
    },
    summary: {
      starterRows: count(previewSummary.starterRows),
      validAuthorizationRows: count(previewSummary.validAuthorizationRows),
      pendingAuthorizationRows: count(previewSummary.pendingAuthorizationRows),
      invalidAuthorizationRows: count(previewSummary.invalidAuthorizationRows),
      commandPreviewRows: count(previewSummary.commandPreviewRows),
      authorizedCandidateRows: candidates.length,
      readyForSeparateInstructionRows: readyCandidates.length,
      blockedCandidateRows: candidates.length - readyCandidates.length,
      preAuthorizationReadyRows: count(previewSummary.preAuthorizationReadyRows),
      preAuthorizationAttentionRows: count(previewSummary.preAuthorizationAttentionRows),
      cleanupAuthorizedRows: 0,
      executableRows: 0
    },
    candidates
  };
}

export function stableNextOwnerAuthorizedCommandManifestProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceExecutionPreviewGeneratedAt: payload.sourceExecutionPreviewGeneratedAt,
    sourceAuthorizationFile: payload.sourceAuthorizationFile,
    cleanupAuthorized: payload.cleanupAuthorized,
    executableNow: payload.executableNow,
    boundary: payload.boundary,
    summary: payload.summary,
    candidates: payload.candidates
  };
}

function markdown(payload) {
  const rows = payload.candidates.map((row) => (
    `| \`${cell(row.approvalId)}\` | ${cell(row.owner)} | ${cell(row.readyForSeparateInstruction ? "ready-for-separate-instruction" : "blocked")} | \`${cell(row.command || "none")}\` | \`${cell(row.cwd)}\` | ${cell(row.blockers.join("; "))} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a | n/a |";

  return `# A25 Next Owner Authorized Command Manifest

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Source execution preview: \`${NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.executionPreview}\`

This is a manifest-only safety bridge from validation into owner-approved execution review. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup. A separate owner instruction must name the exact approval ID and exact command before anything can execute.

## Summary

- Starter rows: ${payload.summary.starterRows}
- Valid authorization rows: ${payload.summary.validAuthorizationRows}
- Pending authorization rows: ${payload.summary.pendingAuthorizationRows}
- Invalid authorization rows: ${payload.summary.invalidAuthorizationRows}
- Command preview rows: ${payload.summary.commandPreviewRows}
- Authorized candidate rows: ${payload.summary.authorizedCandidateRows}
- Ready for separate instruction rows: ${payload.summary.readyForSeparateInstructionRows}
- Blocked candidate rows: ${payload.summary.blockedCandidateRows}
- Pre-authorization ready rows: ${payload.summary.preAuthorizationReadyRows}
- Pre-authorization attention rows: ${payload.summary.preAuthorizationAttentionRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Candidates

| Approval ID | Owner | Status | Command | CWD | Blockers |
| --- | --- | --- | --- | --- | --- |
${rows}

## Boundary

This manifest is non-executable. It exists so A25/A22 can review exact commands after owner authorization and before any separate execution instruction is accepted.
`;
}

function main() {
  const payload = buildNextOwnerAuthorizedCommandManifest();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.latestJson, json);
  write(NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.datedJson, json);
  write(NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.latestMarkdown, md);
  write(NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.latestJson,
    latestMarkdown: NEXT_OWNER_AUTHORIZED_COMMAND_MANIFEST_PATHS.latestMarkdown,
    validAuthorizationRows: payload.summary.validAuthorizationRows,
    authorizedCandidateRows: payload.summary.authorizedCandidateRows,
    readyForSeparateInstructionRows: payload.summary.readyForSeparateInstructionRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
