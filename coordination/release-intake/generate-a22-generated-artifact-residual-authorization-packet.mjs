#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  residualEvidence: "coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json",
  latestJson: "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.md",
  datedJson: `coordination/release-intake/${date}-A22-generated-artifact-residual-authorization-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-generated-artifact-residual-authorization-packet.md`
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

function cleanupAction(row) {
  if (!isCleanupScriptApplySkipTarget(row)) {
    return {
      selectedAction: "owner-approved-generated-artifact-cleanup-script-apply",
      exactCommand: "node scripts/cleanup-generated-artifacts.mjs --apply --scope all",
      commandCwd: root,
      note: "The cleanup script reported this target in dry-run and removes generated targets it is allowed to remove; .tmp is recreated as an empty scratch directory after apply."
    };
  }

  const ignored = isGitIgnored(row.path);
  const exactCommand = ignored ? `git clean -fdX -- ${row.path}` : `git clean -fd -- ${row.path}`;
  return {
    selectedAction: "owner-approved-exact-generated-directory-removal",
    exactCommand,
    commandCwd: root,
    note: ignored
      ? "The cleanup script intentionally skips this anomalous dataless .s11 directory. It is ignored by Git, so exact owner/A22 authorization must use git clean -fdX for this named path before any separate removal."
      : "The cleanup script intentionally skips this anomalous dataless .s11 directory; exact owner/A22 authorization is required before any separate removal."
  };
}

function isCleanupScriptApplySkipTarget(row) {
  return row.targetType === "directory" && /^\.s11-parent-audit-next\d+$/.test(row.path);
}

function isGitIgnored(relativePath) {
  try {
    execFileSync("git", ["check-ignore", "--quiet", "--", relativePath], {
      cwd: root,
      stdio: "ignore"
    });
    return true;
  } catch (error) {
    if (error?.status === 1) return false;
    throw error;
  }
}

function approvalId(row) {
  return `a22-generated-residual-${row.path.replace(/^\./, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;
}

function authorizationText(packet) {
  return [
    `Authorize approvalId=${packet.approvalId}`,
    `target=${packet.path}`,
    `selectedAction=${packet.selectedAction}`,
    `command=${packet.exactCommand}`,
    `evidenceReviewed=${GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.residualEvidence}, ${GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.latestJson}`,
    "approvedBy=<owner/A22>",
    "approvedAt=<ISO-8601>",
    "notes=<scope, evidence reviewed, accepted risk>"
  ].join("; ");
}

function authorizationRow(row, dirtyMap, index) {
  const action = cleanupAction(row);
  const packet = {
    approvalId: approvalId(row),
    approvalKind: "a22-generated-artifact-residual-cleanup",
    owner: "A22 production reliability and release engineering",
    supportingOwner: "A25 git hygiene and release intake",
    priority: index + 1,
    path: row.path,
    targetType: row.targetType,
    manifestType: row.manifestType,
    manifestBytes: row.manifestBytes,
    directoryCount: row.directoryCount,
    fileCount: row.fileCount,
    manifestSha256: row.manifestSha256,
    dryRunBytes: row.dryRunBytes,
    dryRunBytesVolatile: row.dryRunBytesVolatile === true,
    activeWriterBlocked: row.activeWriterBlocked === true,
    activeWriterProbeAvailable: row.activeWriterProbeAvailable !== false,
    activeWriterCount: row.activeWriterCount ?? 0,
    activeWriterPaths: row.activeWriterPaths ?? [],
    residualSkipReason: row.skipReason,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    selectedAction: action.selectedAction,
    exactCommand: action.exactCommand,
    commandCwd: action.commandCwd,
    actionNote: action.note,
    evidence: [
      GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.residualEvidence,
      GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.dirtyMap
    ],
    preChecks: [
      "node scripts/cleanup-generated-artifacts.mjs --dry-run",
      "node coordination/release-intake/assert-a22-generated-artifact-residual-evidence-current.mjs",
      "node coordination/release-intake/assert-no-staged-changes.mjs"
    ],
    postApprovalChecks: [
      "node coordination/release-intake/generate-a22-generated-artifact-residual-evidence.mjs",
      "node coordination/release-intake/assert-a22-generated-artifact-residual-evidence-current.mjs",
      "npm run release:dirty-map -- --reason \"A22 residual generated-artifact cleanup authorization post-check\" --no-report",
      "node coordination/release-intake/refresh-dirty-worktree-remediation-evidence.mjs --reason \"A22 residual generated-artifact cleanup authorization post-check\"",
      "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs",
      "node coordination/release-intake/assert-no-staged-changes.mjs"
    ],
    cleanupAuthorized: false,
    executableNow: false
  };

  return {
    ...packet,
    requiredAuthorizationText: authorizationText(packet)
  };
}

export function buildGeneratedArtifactResidualAuthorizationPacket() {
  const dirtyMap = readJson(GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.dirtyMap);
  const residualEvidence = readJson(GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.residualEvidence);
  const rows = (residualEvidence.rows ?? []).map((row, index) => authorizationRow(row, dirtyMap, index));
  const summary = {
    residualTargets: rows.length,
    zeroByteTargets: rows.filter((row) => row.manifestBytes === 0).length,
    volatileByteRows: rows.filter((row) => row.manifestBytes === null || row.dryRunBytesVolatile === true).length,
    activeWriterBlockedRows: rows.filter((row) => row.activeWriterBlocked === true).length,
    cleanupScriptApplyRows: rows.filter((row) => row.selectedAction === "owner-approved-generated-artifact-cleanup-script-apply").length,
    exactDirectoryRemovalRows: rows.filter((row) => row.selectedAction === "owner-approved-exact-generated-directory-removal").length,
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
    executableRows: rows.filter((row) => row.executableNow).length
  };

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceResidualEvidence: {
      generatedAt: residualEvidence.generatedAt,
      summary: residualEvidence.summary ?? {}
    },
    summary,
    rows,
    boundary: {
      evidenceOnly: true,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      fileDeletionAuthorized: false,
      deployAuthorized: false,
      contentCaptured: false
    }
  };
}

export function stableGeneratedArtifactResidualAuthorizationProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceResidualEvidence: payload.sourceResidualEvidence,
    summary: payload.summary,
    rows: payload.rows,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function list(values) {
  return values.length ? values.map((value) => `  - ${value}`).join("\n") : "  - none";
}

function markdown(payload) {
  const rows = payload.rows.map((row) => (
    `| ${cell(row.approvalId)} | \`${cell(row.path)}\` | ${cell(row.selectedAction)} | ${row.manifestBytes} | no |`
  )).join("\n") || "| none | n/a | n/a | 0 | no |";

  const details = payload.rows.map((row) => `### ${row.approvalId}

- Owner: ${row.owner}
- Target: \`${row.path}\`
- Exact command awaiting owner/A22 authorization: \`${row.exactCommand}\`
- Command cwd: \`${row.commandCwd}\`
- Current manifest SHA-256: \`${row.manifestSha256 ?? "n/a"}\`
- Manifest bytes: ${row.manifestBytes}
- Cleanup authorized: ${row.cleanupAuthorized ? "yes" : "no"}
- Executable now: ${row.executableNow ? "yes" : "no"}
- Required authorization text:
${list([row.requiredAuthorizationText])}
- Pre-checks:
${list(row.preChecks)}
- Post-approval checks:
${list(row.postApprovalChecks)}
`).join("\n");

  return `# A22 Generated Artifact Residual Authorization Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

This is an A25 release-intake authorization packet for A22-owned generated-artifact residual cleanup. It is not owner approval and it does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Residual targets: ${payload.summary.residualTargets}
- Zero-byte targets: ${payload.summary.zeroByteTargets}
- Volatile-byte rows: ${payload.summary.volatileByteRows}
- Active-writer blocked rows: ${payload.summary.activeWriterBlockedRows}
- Cleanup-script apply rows: ${payload.summary.cleanupScriptApplyRows}
- Exact directory-removal rows: ${payload.summary.exactDirectoryRemovalRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Authorization Rows

| Approval ID | Path | Selected action | Bytes | Executable |
| --- | --- | --- | ---: | --- |
${rows}

${details}

## Boundary

Every row remains non-executable until a separate owner/A22 instruction names the approval ID, target, exact command, approver, approval time, and accepted risk. This packet only makes the residual cleanup decision auditable.
`;
}

function main() {
  const payload = buildGeneratedArtifactResidualAuthorizationPacket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  for (const target of [GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.latestJson, GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.datedJson]) {
    write(target, json);
  }
  for (const target of [GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.latestMarkdown, GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.datedMarkdown]) {
    write(target, md);
  }

  console.log(JSON.stringify({
    latestJson: GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.latestJson,
    latestMarkdown: GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.latestMarkdown,
    residualTargets: payload.summary.residualTargets,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
