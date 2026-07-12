#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  nextOwnerPacket: "coordination/release-intake/latest-A25-next-owner-approval-packet.json",
  starter: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  authorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-authorization-execution-preview.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-authorization-execution-preview.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-authorization-execution-preview.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-authorization-execution-preview.md`
};

const exactKeys = [
  "approvalKind",
  "approvalId",
  "approvalFingerprint",
  "owner",
  "ownerHints",
  "subject",
  "path",
  "branch",
  "worktreePath",
  "selectedAction",
  "exactCommand",
  "pathspec",
  "workOrder",
  "evidence",
  "requiredAuthorizationText",
  "postApprovalChecks"
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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoDate(value) {
  return nonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function includesAll(values, requiredValues) {
  return Array.isArray(values) && requiredValues.every((value) => values.includes(value));
}

function isGeneratedArtifactCleanupRow(row) {
  return row?.approvalKind === "a22-generated-artifact-residual-cleanup";
}

function requiredEvidenceForRow(row) {
  if (isGeneratedArtifactCleanupRow(row)) {
    return [
      "coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json",
      "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json"
    ];
  }
  return [
    NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.nextOwnerPacket,
    NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.starter
  ];
}

function gitMaybe(args, cwd = process.cwd()) {
  try {
    return {
      ok: true,
      stdout: execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        maxBuffer: 128 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"]
      }).trim(),
      stderr: ""
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.toString?.().trim?.() ?? "",
      stderr: error.stderr?.toString?.().trim?.() ?? error.message
    };
  }
}

function existingRelativeFiles(relativePaths) {
  return relativePaths.map((relativePath) => ({
    path: relativePath,
    exists: fs.existsSync(path.join(root, relativePath))
  }));
}

function worktreeCheck(worktreePath) {
  if (!nonEmptyString(worktreePath)) {
    return {
      required: false,
      path: "",
      exists: false,
      isGitWorktree: false,
      branch: "",
      head: "",
      status: "not-required"
    };
  }

  const existsOnDisk = fs.existsSync(worktreePath);
  const inside = existsOnDisk ? gitMaybe(["rev-parse", "--is-inside-work-tree"], worktreePath) : { ok: false, stdout: "" };
  const branch = existsOnDisk ? gitMaybe(["branch", "--show-current"], worktreePath) : { ok: false, stdout: "" };
  const head = existsOnDisk ? gitMaybe(["rev-parse", "--short", "HEAD"], worktreePath) : { ok: false, stdout: "" };
  const isGitWorktree = inside.ok && inside.stdout === "true";

  return {
    required: true,
    path: worktreePath,
    exists: existsOnDisk,
    isGitWorktree,
    branch: branch.ok ? branch.stdout : "",
    head: head.ok ? head.stdout : "",
    status: existsOnDisk && isGitWorktree ? "present" : "missing-or-invalid"
  };
}

function rowCwd(starterRow) {
  return nonEmptyString(starterRow.worktreePath) ? starterRow.worktreePath : root;
}

function targetPathCheck(starterRow, cwd, gitWorktreeReady) {
  const targetPath = starterRow.path ?? "";
  if (!nonEmptyString(targetPath)) {
    return {
      required: false,
      path: "",
      absolutePath: "",
      exists: false,
      gitStatus: "",
      status: "not-required"
    };
  }

  const absolutePath = path.isAbsolute(targetPath) ? targetPath : path.join(cwd, targetPath);
  const existsOnDisk = fs.existsSync(absolutePath);
  const canStatus = gitWorktreeReady && !path.isAbsolute(targetPath);
  const gitStatus = canStatus ? gitMaybe(["status", "--porcelain", "--", targetPath], cwd) : { ok: false, stdout: "" };

  return {
    required: true,
    path: targetPath,
    absolutePath,
    exists: existsOnDisk,
    gitStatus: gitStatus.ok ? gitStatus.stdout : "",
    status: existsOnDisk ? "present" : "missing"
  };
}

function cleanCommandPath(command) {
  return command
    .replace(/^git clean -fdX -- /, "")
    .replace(/^git clean -fd -- /, "")
    .replace(/^git clean -f -- /, "")
    .trim();
}

function restoreCommandPath(command) {
  return command.replace(/^git restore --source=HEAD -- /, "").trim();
}

function statusMentionsPath(gitStatus, targetPath) {
  return String(gitStatus ?? "")
    .split("\n")
    .some((line) => line.endsWith(targetPath) || line.includes(` ${targetPath}`));
}

function gitIgnoredPath(cwd, targetPath) {
  try {
    execFileSync("git", ["check-ignore", "--quiet", "--", targetPath], {
      cwd,
      stdio: "ignore"
    });
    return true;
  } catch (error) {
    if (error?.status === 1) return false;
    throw error;
  }
}

function commandTargetCheck(starterRow, cwd, targetCheck) {
  const exactCommand = starterRow.exactCommand ?? "";
  if (!nonEmptyString(exactCommand)) {
    return {
      required: false,
      commandKind: "none",
      commandMatchesPath: true,
      targetReady: true,
      scriptExists: false,
      status: "not-required"
    };
  }

  if (exactCommand.startsWith("git restore --source=HEAD -- ")) {
    const commandPath = restoreCommandPath(exactCommand);
    const commandMatchesPath = commandPath === starterRow.path;
    const targetReady = commandMatchesPath && statusMentionsPath(targetCheck.gitStatus, commandPath);
    return {
      required: true,
      commandKind: "git-restore",
      commandPath,
      commandMatchesPath,
      targetReady,
      scriptExists: false,
      status: targetReady ? "target-ready" : "target-not-ready"
    };
  }

  if (
    exactCommand.startsWith("git clean -fdX -- ") ||
    exactCommand.startsWith("git clean -fd -- ") ||
    exactCommand.startsWith("git clean -f -- ")
  ) {
    const commandPath = cleanCommandPath(exactCommand);
    const commandMatchesPath = commandPath === starterRow.path;
    const ignoredOnly = exactCommand.startsWith("git clean -fdX -- ");
    const targetReady = commandMatchesPath && targetCheck.exists && (
      ignoredOnly
        ? gitIgnoredPath(cwd, commandPath)
        : targetCheck.gitStatus.startsWith("?? ")
    );
    return {
      required: true,
      commandKind: ignoredOnly ? "git-clean-ignored" : "git-clean",
      commandPath,
      commandMatchesPath,
      targetReady,
      scriptExists: false,
      status: targetReady ? "target-ready" : "target-not-ready"
    };
  }

  if (exactCommand === "node scripts/cleanup-generated-artifacts.mjs --apply --scope all") {
    const scriptPath = path.join(cwd, "scripts", "cleanup-generated-artifacts.mjs");
    const scriptExists = fs.existsSync(scriptPath);
    const targetReady = scriptExists && targetCheck.exists;
    return {
      required: true,
      commandKind: "generated-artifact-cleanup-script",
      commandPath: "scripts/cleanup-generated-artifacts.mjs",
      commandMatchesPath: true,
      targetReady,
      scriptExists,
      status: targetReady ? "target-ready" : "target-not-ready"
    };
  }

  return {
    required: true,
    commandKind: "unknown",
    commandMatchesPath: false,
    targetReady: false,
    scriptExists: false,
    status: "unknown-command"
  };
}

function preAuthorizationCheck(starterRow) {
  const cwd = rowCwd(starterRow);
  const worktree = worktreeCheck(starterRow.worktreePath);
  const gitWorktreeReady = !worktree.required || (worktree.exists && worktree.isGitWorktree);
  const target = targetPathCheck(starterRow, cwd, gitWorktreeReady);
  const evidencePaths = Array.from(new Set([
    NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.nextOwnerPacket,
    NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.starter,
    ...(starterRow.evidence ?? []),
    starterRow.pathspec,
    starterRow.workOrder
  ].filter(nonEmptyString)));
  const evidence = existingRelativeFiles(evidencePaths);
  const pathspec = starterRow.pathspec
    ? {
        path: starterRow.pathspec,
        exists: fs.existsSync(path.join(root, starterRow.pathspec))
      }
    : { path: "", exists: false };
  const workOrder = starterRow.workOrder
    ? {
        path: starterRow.workOrder,
        exists: fs.existsSync(path.join(root, starterRow.workOrder))
      }
    : { path: "", exists: false };
  const command = commandTargetCheck(starterRow, cwd, target);

  const missingEvidence = evidence.filter((row) => !row.exists).map((row) => row.path);
  const overallReady =
    missingEvidence.length === 0 &&
    gitWorktreeReady &&
    (!target.required || target.exists) &&
    (!starterRow.pathspec || pathspec.exists) &&
    (!starterRow.workOrder || workOrder.exists) &&
    (!command.required || command.targetReady);

  return {
    status: overallReady ? "preauthorization-evidence-ready" : "attention-required",
    overallReady,
    cwd,
    evidence,
    missingEvidence,
    worktree,
    target,
    pathspec,
    workOrder,
    command
  };
}

function validateAuthorizationPayload(payload, dirtyMap, nextOwnerPacket, starter) {
  const failures = [];
  if (!Array.isArray(payload.authorizations)) failures.push("authorizations file must contain an authorizations array");
  if (payload.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("authorizations file dirty-map signature is stale or missing");
  if (payload.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("authorizations file expanded dirty entry count is stale or missing");
  if (payload.sourceNextOwnerPacketGeneratedAt !== nextOwnerPacket.generatedAt) failures.push("authorizations file source next-owner packet timestamp is stale or missing");
  if (payload.sourceStarterGeneratedAt !== starter.generatedAt) failures.push("authorizations file source starter timestamp is stale or missing");
  if (payload.cleanupAuthorized === true) failures.push("authorizations file cleanupAuthorized must not be true for preview generation");
  if (payload.executableNow === true) failures.push("authorizations file executableNow must not be true for preview generation");
  return failures;
}

function validateAuthorizationRow(row, starterRow) {
  const failures = [];
  for (const key of exactKeys) {
    if (!sameJson(row[key], starterRow[key])) failures.push(`${key} must exactly match the starter`);
  }
  if (!isGeneratedArtifactCleanupRow(starterRow) && !nonEmptyString(row.selectedFinalState)) {
    failures.push("selectedFinalState is required");
  }
  if (isGeneratedArtifactCleanupRow(starterRow) && row.selectedAction !== starterRow.selectedAction) {
    failures.push("selectedAction must match the cleanup starter row");
  }
  if (isGeneratedArtifactCleanupRow(starterRow) && row.exactCommand !== starterRow.exactCommand) {
    failures.push("exactCommand must match the cleanup starter row");
  }
  if (!nonEmptyString(row.approvedBy)) failures.push("approvedBy is required");
  if (!validIsoDate(row.approvedAt)) failures.push("approvedAt must be an ISO-compatible date");
  if (!Array.isArray(row.evidenceReviewed) || row.evidenceReviewed.length === 0) failures.push("evidenceReviewed must be a non-empty array");
  const requiredEvidence = requiredEvidenceForRow(starterRow);
  if (!includesAll(row.evidenceReviewed, requiredEvidence)) {
    failures.push(`evidenceReviewed must include ${requiredEvidence.join(" and ")}`);
  }
  if (!nonEmptyString(row.notes)) failures.push("notes are required");
  if (nonEmptyString(row.authorizationText) && !row.authorizationText.includes(`approvalId=${row.approvalId}`)) {
    failures.push("authorizationText missing approvalId");
  }
  if (isGeneratedArtifactCleanupRow(starterRow) && nonEmptyString(row.authorizationText) && !row.authorizationText.includes(`selectedAction=${starterRow.selectedAction}`)) {
    failures.push("authorizationText missing selectedAction");
  }
  if (starterRow.exactCommand && nonEmptyString(row.authorizationText) && !row.authorizationText.includes(`command=${starterRow.exactCommand}`)) {
    failures.push("authorizationText missing exact command");
  }
  if (row.cleanupAuthorized === true) failures.push("cleanupAuthorized must not be true in the preview source");
  if (row.executableNow === true) failures.push("executableNow must not be true in the preview source");
  return failures;
}

function previewRow(starterRow, authorizationRow, rowFailures, duplicate) {
  const authorizationRecorded = Boolean(authorizationRow) && rowFailures.length === 0 && !duplicate;
  const exactCommand = starterRow.exactCommand ?? "";
  const preAuthorization = preAuthorizationCheck(starterRow);
  return {
    approvalId: starterRow.approvalId,
    approvalKind: starterRow.approvalKind,
    owner: starterRow.owner,
    ownerHints: starterRow.ownerHints ?? [],
    subject: starterRow.subject,
    path: starterRow.path,
    branch: starterRow.branch,
    worktreePath: starterRow.worktreePath,
    selectedAction: starterRow.selectedAction,
    exactCommand,
    pathspec: starterRow.pathspec,
    workOrder: starterRow.workOrder,
    authorizationRecorded,
    authorizationStatus: authorizationRecorded ? "valid-recorded-authorization" : (authorizationRow ? "invalid-authorization-record" : "pending-authorization"),
    validationFailures: duplicate ? ["duplicate approvalId in authorizations file"] : rowFailures,
    selectedFinalState: authorizationRow?.selectedFinalState ?? "",
    approvedBy: authorizationRow?.approvedBy ?? "",
    approvedAt: authorizationRow?.approvedAt ?? "",
    notes: authorizationRow?.notes ?? "",
    evidenceReviewed: authorizationRow?.evidenceReviewed ?? [],
    commandPreviewAvailable: authorizationRecorded && nonEmptyString(exactCommand),
    commandPreview: authorizationRecorded && nonEmptyString(exactCommand) ? exactCommand : "",
    commandPreviewCwd: starterRow.worktreePath || root,
    requiresSeparateExecutionInstruction: authorizationRecorded,
    separateExecutionInstructionText: authorizationRecorded
      ? `A separate owner instruction must explicitly say to execute approvalId=${starterRow.approvalId} command=${exactCommand || "<owner-package or lifecycle command from work order>"} after this preview is reviewed.`
      : "",
    preAuthorizationCheck: preAuthorization,
    postApprovalChecks: starterRow.postApprovalChecks ?? [],
    cleanupAuthorized: false,
    executableNow: false
  };
}

export function buildNextOwnerAuthorizationExecutionPreview() {
  const dirtyMap = readJson(NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.dirtyMap);
  const nextOwnerPacket = readJson(NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.nextOwnerPacket);
  const starter = readJson(NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.starter);
  const starterRows = starter.authorizations ?? [];
  const starterById = new Map(starterRows.map((row) => [row.approvalId, row]));
  const authorizationFilePresent = exists(NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.authorizations);

  const payloadFailures = [];
  const authorizationRows = [];
  if (starter.dirtyMapStatusSignature !== dirtyMap.statusSignature) payloadFailures.push("starter dirty-map signature is stale");
  if (starter.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) payloadFailures.push("starter expanded dirty entry count is stale");
  if (starter.sourceNextOwnerPacketGeneratedAt !== nextOwnerPacket.generatedAt) payloadFailures.push("starter source next-owner packet timestamp is stale");

  if (authorizationFilePresent) {
    const authorizations = readJson(NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.authorizations);
    payloadFailures.push(...validateAuthorizationPayload(authorizations, dirtyMap, nextOwnerPacket, starter));
    if (Array.isArray(authorizations.authorizations)) authorizationRows.push(...authorizations.authorizations);
  }

  const authorizationRowsById = new Map();
  const duplicateIds = new Set();
  for (const row of authorizationRows) {
    if (!nonEmptyString(row.approvalId)) continue;
    if (authorizationRowsById.has(row.approvalId)) duplicateIds.add(row.approvalId);
    else authorizationRowsById.set(row.approvalId, row);
  }

  const rows = starterRows.map((starterRow) => {
    const authorizationRow = authorizationRowsById.get(starterRow.approvalId);
    const rowFailures = authorizationRow ? validateAuthorizationRow(authorizationRow, starterRow) : [];
    return previewRow(starterRow, authorizationRow, rowFailures, duplicateIds.has(starterRow.approvalId));
  });

  const unknownAuthorizationIds = authorizationRows
    .map((row) => row.approvalId)
    .filter((approvalId) => nonEmptyString(approvalId) && !starterById.has(approvalId));
  const authorizationRowsMissingId = authorizationRows.filter((row) => !nonEmptyString(row.approvalId)).length;
  const invalidAuthorizationRows = rows.filter((row) => row.authorizationStatus === "invalid-authorization-record").length + unknownAuthorizationIds.length + authorizationRowsMissingId;
  const preAuthorizationReadyRows = rows.filter((row) => row.preAuthorizationCheck?.overallReady === true).length;
  const worktreeCheckRows = rows.filter((row) => row.preAuthorizationCheck?.worktree?.required === true).length;
  const targetPathCheckRows = rows.filter((row) => row.preAuthorizationCheck?.target?.required === true).length;
  const exactCommandRows = rows.filter((row) => row.preAuthorizationCheck?.command?.required === true).length;
  const summary = {
    starterRows: starterRows.length,
    authorizationFilePresent,
    authorizationRowsInFile: authorizationRows.length,
    validAuthorizationRows: rows.filter((row) => row.authorizationRecorded).length,
    invalidAuthorizationRows,
    pendingAuthorizationRows: rows.filter((row) => row.authorizationStatus === "pending-authorization").length,
    unknownAuthorizationRows: unknownAuthorizationIds.length,
    authorizationRowsMissingId,
    commandPreviewRows: rows.filter((row) => row.commandPreviewAvailable).length,
    separateExecutionInstructionRequiredRows: rows.filter((row) => row.requiresSeparateExecutionInstruction).length,
    preAuthorizationReadyRows,
    preAuthorizationAttentionRows: rows.length - preAuthorizationReadyRows,
    evidenceCompleteRows: rows.filter((row) => (row.preAuthorizationCheck?.missingEvidence ?? []).length === 0).length,
    worktreeCheckRows,
    worktreePresentRows: rows.filter((row) => row.preAuthorizationCheck?.worktree?.required === true && row.preAuthorizationCheck.worktree.status === "present").length,
    targetPathCheckRows,
    targetPathPresentRows: rows.filter((row) => row.preAuthorizationCheck?.target?.required === true && row.preAuthorizationCheck.target.status === "present").length,
    exactCommandRows,
    exactCommandTargetReadyRows: rows.filter((row) => row.preAuthorizationCheck?.command?.required === true && row.preAuthorizationCheck.command.targetReady === true).length,
    pathspecRows: rows.filter((row) => nonEmptyString(row.pathspec)).length,
    pathspecPresentRows: rows.filter((row) => nonEmptyString(row.pathspec) && row.preAuthorizationCheck?.pathspec?.exists === true).length,
    workOrderRows: rows.filter((row) => nonEmptyString(row.workOrder)).length,
    workOrderPresentRows: rows.filter((row) => nonEmptyString(row.workOrder) && row.preAuthorizationCheck?.workOrder?.exists === true).length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
    executableRows: rows.filter((row) => row.executableNow).length
  };

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceNextOwnerPacketGeneratedAt: nextOwnerPacket.generatedAt,
    sourceStarterGeneratedAt: starter.generatedAt,
    authorizationFile: NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.authorizations,
    authorizationFilePresent,
    cleanupAuthorized: false,
    executableNow: false,
    boundary: {
      evidenceOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateExecutionInstruction: true
    },
    payloadFailures,
    unknownAuthorizationIds,
    summary,
    rows
  };
}

export function stableNextOwnerAuthorizationExecutionPreviewProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceNextOwnerPacketGeneratedAt: payload.sourceNextOwnerPacketGeneratedAt,
    sourceStarterGeneratedAt: payload.sourceStarterGeneratedAt,
    authorizationFile: payload.authorizationFile,
    authorizationFilePresent: payload.authorizationFilePresent,
    cleanupAuthorized: payload.cleanupAuthorized,
    executableNow: payload.executableNow,
    boundary: payload.boundary,
    payloadFailures: payload.payloadFailures,
    unknownAuthorizationIds: payload.unknownAuthorizationIds,
    summary: payload.summary,
    rows: payload.rows
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const rows = payload.rows.map((row) => (
    `| \`${cell(row.approvalId)}\` | ${cell(row.approvalKind)} | ${cell(row.owner)} | ${cell(row.authorizationStatus)} | ${cell(row.preAuthorizationCheck?.status ?? "missing")} | ${row.commandPreviewAvailable ? `\`${cell(row.commandPreview)}\`` : "none"} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a | no |";

  const commandRows = payload.rows
    .filter((row) => row.authorizationRecorded)
    .map((row) => `### ${row.approvalId}

- Owner: ${row.owner}
- Status: ${row.authorizationStatus}
- Selected final state: ${row.selectedFinalState}
- Command preview: \`${row.commandPreview || "none"}\`
- Command cwd: \`${row.commandPreviewCwd}\`
- Separate execution instruction required: ${row.requiresSeparateExecutionInstruction}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
- Post-approval checks:
${(row.postApprovalChecks ?? []).map((item) => `  - \`${item}\``).join("\n") || "  - none"}
`).join("\n");

  return `# A25 Next Owner Authorization Execution Preview

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Authorization file: \`${payload.authorizationFile}\`

Authorization file present: ${payload.authorizationFilePresent ? "yes" : "no"}

This is an evidence-only preview. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup. A separate owner instruction must name the exact approval ID and exact command before anything can execute.

## Summary

- Starter rows: ${payload.summary.starterRows}
- Authorization rows in file: ${payload.summary.authorizationRowsInFile}
- Valid authorization rows: ${payload.summary.validAuthorizationRows}
- Pending authorization rows: ${payload.summary.pendingAuthorizationRows}
- Invalid authorization rows: ${payload.summary.invalidAuthorizationRows}
- Pre-authorization ready rows: ${payload.summary.preAuthorizationReadyRows}
- Pre-authorization attention rows: ${payload.summary.preAuthorizationAttentionRows}
- Evidence-complete rows: ${payload.summary.evidenceCompleteRows}
- Worktree checks passed: ${payload.summary.worktreePresentRows}/${payload.summary.worktreeCheckRows}
- Target path checks passed: ${payload.summary.targetPathPresentRows}/${payload.summary.targetPathCheckRows}
- Exact command target checks passed: ${payload.summary.exactCommandTargetReadyRows}/${payload.summary.exactCommandRows}
- Pathspec files present: ${payload.summary.pathspecPresentRows}/${payload.summary.pathspecRows}
- Work-order files present: ${payload.summary.workOrderPresentRows}/${payload.summary.workOrderRows}
- Command preview rows: ${payload.summary.commandPreviewRows}
- Separate execution instruction required rows: ${payload.summary.separateExecutionInstructionRequiredRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Pre-Authorization Checks

These checks verify that evidence files, worktrees, pathspecs, work orders, target paths, and exact-command targets still point to current local facts. They do not make any row executable.

## Rows

| Approval ID | Kind | Owner | Authorization status | Pre-auth check | Command preview | Executable now |
| --- | --- | --- | --- | --- | --- | --- |
${rows}

## Recorded Authorization Details

${commandRows || "No valid owner authorization rows are currently recorded."}
`;
}

function main() {
  const payload = buildNextOwnerAuthorizationExecutionPreview();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.latestJson, json);
  write(NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.datedJson, json);
  write(NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.latestMarkdown, md);
  write(NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.latestJson,
    latestMarkdown: NEXT_OWNER_AUTHORIZATION_EXECUTION_PREVIEW_PATHS.latestMarkdown,
    starterRows: payload.summary.starterRows,
    authorizationFilePresent: payload.summary.authorizationFilePresent,
    validAuthorizationRows: payload.summary.validAuthorizationRows,
    preAuthorizationReadyRows: payload.summary.preAuthorizationReadyRows,
    preAuthorizationAttentionRows: payload.summary.preAuthorizationAttentionRows,
    commandPreviewRows: payload.summary.commandPreviewRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
