#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS,
  buildGeneratedArtifactResidualAuthorizationPacket,
  stableGeneratedArtifactResidualAuthorizationProjection
} from "./generate-a22-generated-artifact-residual-authorization-packet.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  authorizationPacket: "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json",
  latestJson: "coordination/release-intake/latest-A22-generated-artifact-residual-acceptance-docket.json",
  latestMarkdown: "coordination/release-intake/latest-A22-generated-artifact-residual-acceptance-docket.md",
  datedJson: `coordination/release-intake/${date}-A22-generated-artifact-residual-acceptance-docket.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-generated-artifact-residual-acceptance-docket.md`
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

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function bytesToGiB(bytes) {
  return Number((Number(bytes ?? 0) / 1024 / 1024 / 1024).toFixed(2));
}

function acceptanceChecks(packet, rows, sourceCurrentnessFailures) {
  if (rows.length === 0) {
    return [
      {
        id: "source-currentness-green",
        label: "A22 residual authorization packet is current",
        passed: sourceCurrentnessFailures.length === 0,
        evidence: `sourceCurrentnessFailures=${sourceCurrentnessFailures.length}`
      },
      {
        id: "no-residual-targets",
        label: "No generated-artifact residual targets remain",
        passed: true,
        evidence: "rows=0"
      },
      {
        id: "no-cleanup-needed",
        label: "No owner cleanup authorization text is needed after cleanup",
        passed: (packet.summary?.cleanupScriptApplyRows ?? 0) === 0,
        evidence: `cleanupScriptApplyRows=${packet.summary?.cleanupScriptApplyRows ?? 0}`
      },
      {
        id: "non-executable-boundary",
        label: "No residual cleanup row is executable or cleanup-authorized",
        passed: (packet.summary?.cleanupAuthorizedRows ?? 0) === 0 && (packet.summary?.executableRows ?? 0) === 0,
        evidence: `cleanup=${packet.summary?.cleanupAuthorizedRows ?? 0} executable=${packet.summary?.executableRows ?? 0}`
      },
      {
        id: "evidence-only-boundary",
        label: "Authorization packet boundary is evidence-only",
        passed: packet.boundary?.evidenceOnly === true
          && packet.boundary?.cleanupAuthorized === false
          && packet.boundary?.fileDeletionAuthorized === false
          && packet.boundary?.destructiveGitAuthorized === false
          && packet.boundary?.deployAuthorized === false,
        evidence: `evidenceOnly=${packet.boundary?.evidenceOnly} fileDeletion=${packet.boundary?.fileDeletionAuthorized}`
      }
    ].map((check) => ({
      ...check,
      status: check.passed ? "pass" : "fail"
    }));
  }

  const paths = rows.map((row) => row.path).sort();
  const totalBytes = rows.reduce((sum, row) => sum + Number(row.manifestBytes ?? 0), 0);
  const volatileByteRows = rows.filter((row) => row.manifestBytes === null || row.dryRunBytesVolatile === true || row.activeWriterBlocked === true);
  const cleanupScriptApplyRows = rows.filter((row) => row.selectedAction === "owner-approved-generated-artifact-cleanup-script-apply");
  const exactDirectoryRemovalRows = rows.filter((row) => row.selectedAction === "owner-approved-exact-generated-directory-removal");
  const supportedPaths = rows.filter((row) => (
    row.path === ".next"
    || row.path === ".tmp"
    || /^\.s11-parent-audit-next\d+$/.test(row.path)
    || /^tsconfig\.playwright-\d+-\d+\.tmp\.json$/.test(row.path)
  ));
  const boundedExactRemovalRows = exactDirectoryRemovalRows.filter((row) => (
    /^\.s11-parent-audit-next\d+$/.test(row.path) &&
    (
      row.exactCommand === `git clean -fdX -- ${row.path}` ||
      row.exactCommand === `git clean -fd -- ${row.path}`
    )
  ));
  const checks = [
    {
      id: "source-currentness-green",
      label: "A22 residual authorization packet is current",
      passed: sourceCurrentnessFailures.length === 0,
      evidence: `sourceCurrentnessFailures=${sourceCurrentnessFailures.length}`
    },
    {
      id: "supported-residual-targets",
      label: "Generated-artifact residual targets are limited to supported cleanup surfaces",
      passed: rows.length > 0 && supportedPaths.length === rows.length,
      evidence: `rows=${rows.length} paths=${paths.join(",")}`
    },
    {
      id: "byte-risk-visible",
      label: "Generated-artifact byte risk is visible before owner decision",
      passed: totalBytes > 0 || volatileByteRows.length > 0,
      evidence: `totalGiB=${bytesToGiB(totalBytes)} volatileRows=${volatileByteRows.length}`
    },
    {
      id: "bounded-cleanup-actions",
      label: "Rows are limited to cleanup script apply or exact evidence-protected directory removal",
      passed: cleanupScriptApplyRows.every((row) => row.exactCommand === "node scripts/cleanup-generated-artifacts.mjs --apply --scope all")
        && boundedExactRemovalRows.length === exactDirectoryRemovalRows.length
        && (packet.summary?.cleanupScriptApplyRows ?? -1) === cleanupScriptApplyRows.length
        && (packet.summary?.exactDirectoryRemovalRows ?? -1) === exactDirectoryRemovalRows.length,
      evidence: `cleanupScriptApplyRows=${packet.summary?.cleanupScriptApplyRows ?? 0} exactDirectoryRemovalRows=${packet.summary?.exactDirectoryRemovalRows ?? 0}`
    },
    {
      id: "non-executable-boundary",
      label: "No residual cleanup row is executable or cleanup-authorized",
      passed: rows.every((row) => row.cleanupAuthorized === false && row.executableNow === false)
        && (packet.summary?.cleanupAuthorizedRows ?? 0) === 0
        && (packet.summary?.executableRows ?? 0) === 0,
      evidence: `cleanup=${packet.summary?.cleanupAuthorizedRows ?? 0} executable=${packet.summary?.executableRows ?? 0}`
    },
    {
      id: "required-authorization-texts-present",
      label: "Each row has copyable owner/A22 authorization text",
      passed: rows.every((row) => row.requiredAuthorizationText?.includes(`approvalId=${row.approvalId}`)
        && row.requiredAuthorizationText?.includes(`target=${row.path}`)
        && row.requiredAuthorizationText?.includes(`command=${row.exactCommand}`)
        && row.requiredAuthorizationText?.includes("approvedBy=<owner/A22>")
        && row.requiredAuthorizationText?.includes("approvedAt=<ISO-8601>")),
      evidence: `texts=${rows.filter((row) => row.requiredAuthorizationText).length}/${rows.length}`
    },
    {
      id: "prechecks-present",
      label: "Each row requires dry-run, residual evidence, and no-staged checks first",
      passed: rows.every((row) => (row.preChecks ?? []).includes("node scripts/cleanup-generated-artifacts.mjs --dry-run")
        && (row.preChecks ?? []).includes("node coordination/release-intake/assert-a22-generated-artifact-residual-evidence-current.mjs")
        && (row.preChecks ?? []).includes("node coordination/release-intake/assert-no-staged-changes.mjs")),
      evidence: `rowsWithPrechecks=${rows.filter((row) => (row.preChecks ?? []).length >= 3).length}/${rows.length}`
    },
    {
      id: "post-approval-validation-present",
      label: "Each row names post-approval refresh/currentness checks",
      passed: rows.every((row) => (row.postApprovalChecks ?? []).some((command) => command.includes("refresh-dirty-worktree-remediation-evidence.mjs"))
        && (row.postApprovalChecks ?? []).some((command) => command.includes("assert-dirty-worktree-remediation-current.mjs"))
        && (row.postApprovalChecks ?? []).some((command) => command.includes("assert-no-staged-changes.mjs"))),
      evidence: `rowsWithPostChecks=${rows.filter((row) => (row.postApprovalChecks ?? []).length >= 6).length}/${rows.length}`
    },
    {
      id: "evidence-only-boundary",
      label: "Authorization packet boundary is evidence-only",
      passed: packet.boundary?.evidenceOnly === true
        && packet.boundary?.cleanupAuthorized === false
        && packet.boundary?.fileDeletionAuthorized === false
        && packet.boundary?.destructiveGitAuthorized === false
        && packet.boundary?.deployAuthorized === false,
      evidence: `evidenceOnly=${packet.boundary?.evidenceOnly} fileDeletion=${packet.boundary?.fileDeletionAuthorized}`
    }
  ];

  return checks.map((check) => ({
    ...check,
    status: check.passed ? "pass" : "fail"
  }));
}

function rowDigest(rows) {
  return rows.map((row) => ({
    approvalId: row.approvalId,
    path: row.path,
    owner: row.owner,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    commandCwd: row.commandCwd,
    manifestBytes: row.manifestBytes,
    manifestGiB: bytesToGiB(row.manifestBytes),
    dryRunBytesVolatile: row.dryRunBytesVolatile === true,
    activeWriterBlocked: row.activeWriterBlocked === true,
    activeWriterCount: row.activeWriterCount ?? 0,
    activeWriterPaths: row.activeWriterPaths ?? [],
    directoryCount: row.directoryCount,
    fileCount: row.fileCount,
    manifestSha256: row.manifestSha256,
    cleanupAuthorized: row.cleanupAuthorized,
    executableNow: row.executableNow,
    residualSkipReason: row.residualSkipReason
  }));
}

export function buildGeneratedArtifactResidualAcceptanceDocket() {
  const dirtyMap = readJson(GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.dirtyMap);
  const recordedPacket = readJson(GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.authorizationPacket);
  const currentPacket = buildGeneratedArtifactResidualAuthorizationPacket();
  const sourceCurrentnessFailures = [];

  if (!sameJson(
    stableGeneratedArtifactResidualAuthorizationProjection(recordedPacket),
    stableGeneratedArtifactResidualAuthorizationProjection(currentPacket)
  )) {
    sourceCurrentnessFailures.push("A22 generated-artifact residual authorization packet is stale");
  }
  if (recordedPacket.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    sourceCurrentnessFailures.push("A22 generated-artifact residual authorization packet dirty-map signature is stale");
  }
  if (recordedPacket.expandedStatusEntries !== dirtyMap.statusCounts?.expandedStatusEntries) {
    sourceCurrentnessFailures.push("A22 generated-artifact residual authorization packet expanded entry count is stale");
  }

  const rows = recordedPacket.rows ?? [];
  const checks = acceptanceChecks(recordedPacket, rows, sourceCurrentnessFailures);
  const failedChecks = checks.filter((row) => !row.passed);
  const totalBytes = rows.reduce((sum, row) => sum + Number(row.manifestBytes ?? 0), 0);
  const volatileByteRows = rows.filter((row) => row.manifestBytes === null || row.dryRunBytesVolatile === true || row.activeWriterBlocked === true);
  const postCleanNoResidualTargets = rows.length === 0 && failedChecks.length === 0 && sourceCurrentnessFailures.length === 0;
  const readyForOwnerDecision = rows.length > 0 && failedChecks.length === 0 && sourceCurrentnessFailures.length === 0;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      authorizationPacketGeneratedAt: recordedPacket.generatedAt,
      authorizationPacketPath: GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.latestJson,
      residualEvidenceGeneratedAt: recordedPacket.sourceResidualEvidence?.generatedAt ?? "",
      residualEvidencePath: GENERATED_ARTIFACT_RESIDUAL_AUTHORIZATION_PATHS.residualEvidence
    },
    sourceCurrentnessFailures,
    residualDigest: rowDigest(rows),
    acceptanceChecks: checks,
    ownerDecisionDocket: {
      status: postCleanNoResidualTargets
        ? "post-clean-no-residual-targets"
        : readyForOwnerDecision
          ? "ready-for-owner-decision"
          : "not-ready-for-owner-decision",
      ownerDecisionRequired: !postCleanNoResidualTargets,
      owner: "A22 production reliability and release engineering",
      targetAuthorizationFile: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
      requiredApprovalIds: rows.map((row) => row.approvalId),
      copyableAuthorizationTexts: rows.map((row) => ({
        approvalId: row.approvalId,
        path: row.path,
        exactCommand: row.exactCommand,
        text: row.requiredAuthorizationText
      })),
      caution: "This docket is for owner review only. It does not authorize cleanup apply, file deletion, destructive Git, deploy, or execution instructions.",
      postDecisionValidationCommands: [
        "node coordination/release-intake/assert-a22-generated-artifact-residual-acceptance-docket-current.mjs",
        "node coordination/release-intake/assert-next-owner-authorizations-current.mjs",
        "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs",
        "node coordination/release-intake/assert-no-staged-changes.mjs --json"
      ]
    },
    summary: {
      readyForOwnerDecision,
      postCleanNoResidualTargets,
      residualTargets: rows.length,
      totalBytes,
      totalGiB: bytesToGiB(totalBytes),
      volatileByteRows: volatileByteRows.length,
      activeWriterBlockedRows: rows.filter((row) => row.activeWriterBlocked === true).length,
      tmpGiB: bytesToGiB(rows.find((row) => row.path === ".tmp")?.manifestBytes ?? 0),
      nextGiB: bytesToGiB(rows.find((row) => row.path === ".next")?.manifestBytes ?? 0),
      cleanupScriptApplyRows: recordedPacket.summary?.cleanupScriptApplyRows ?? 0,
      exactDirectoryRemovalRows: recordedPacket.summary?.exactDirectoryRemovalRows ?? 0,
      cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
      executableRows: rows.filter((row) => row.executableNow).length,
      copyableAuthorizationTexts: rows.filter((row) => row.requiredAuthorizationText).length,
      acceptanceChecks: checks.length,
      passingAcceptanceChecks: checks.filter((row) => row.passed).length,
      failedAcceptanceChecks: failedChecks.length,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length
    },
    boundary: {
      evidenceOnly: true,
      createsAuthorizationFile: false,
      recordsOwnerApproval: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      fileDeletionAuthorized: false,
      deployAuthorized: false
    }
  };
}

export function stableGeneratedArtifactResidualAcceptanceDocketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    residualDigest: payload.residualDigest,
    acceptanceChecks: payload.acceptanceChecks,
    ownerDecisionDocket: payload.ownerDecisionDocket,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const digestRows = payload.residualDigest.map((row, index) => (
    `| ${index + 1} | \`${cell(row.approvalId)}\` | \`${cell(row.path)}\` | ${row.manifestGiB} | ${row.directoryCount} | ${row.fileCount} | \`${cell(row.manifestSha256)}\` | ${row.cleanupAuthorized ? "yes" : "no"} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n");
  const checkRows = payload.acceptanceChecks.map((row, index) => (
    `| ${index + 1} | \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.label)} | ${cell(row.evidence)} |`
  )).join("\n");
  const authTexts = payload.ownerDecisionDocket.copyableAuthorizationTexts.map((row, index) => `### ${index + 1}. \`${row.approvalId}\`

\`\`\`text
${row.text}
\`\`\`
`).join("\n");
  const validationCommands = payload.ownerDecisionDocket.postDecisionValidationCommands.map((command) => `- \`${command}\``).join("\n");

  return `# A22 Generated Artifact Residual Acceptance Docket

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This docket is evidence-only. It summarizes the A22-owned generated-artifact residual cleanup decision surface for human review, but it does not create the authorization file, record owner approval, authorize cleanup, execute cleanup, delete files, run destructive Git, stage, commit, merge, push, deploy, remove worktrees, or modify generated artifacts.

## Summary

- Status: ${payload.ownerDecisionDocket.status}
- Residual targets: ${payload.summary.residualTargets}
- Total size: ${payload.summary.totalGiB} GiB
- Volatile-byte rows: ${payload.summary.volatileByteRows}
- Active-writer blocked rows: ${payload.summary.activeWriterBlockedRows}
- \`.tmp\` size: ${payload.summary.tmpGiB} GiB
- \`.next\` size: ${payload.summary.nextGiB} GiB
- Cleanup-script apply rows: ${payload.summary.cleanupScriptApplyRows}
- Exact directory-removal rows: ${payload.summary.exactDirectoryRemovalRows}
- Copyable authorization texts: ${payload.summary.copyableAuthorizationTexts}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Residual Digest

| # | Approval ID | Path | GiB | Directories | Files | Manifest SHA-256 | Cleanup authorized | Executable |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
${digestRows}

## Acceptance Checks

| # | Check | Status | Meaning | Evidence |
| ---: | --- | --- | --- | --- |
${checkRows}

## Owner Decision Docket

Target authorization file: \`${payload.ownerDecisionDocket.targetAuthorizationFile}\`

Owner: ${payload.ownerDecisionDocket.owner}

Caution: ${payload.ownerDecisionDocket.caution}

## Copyable Authorization Texts

These texts are review templates only. They become active only after the owner records approval in the canonical owner-authorization input and validators accept them. They still do not run cleanup by themselves.

${authTexts}

## Post-Decision Validation Commands

${validationCommands}

## Boundary

Every row remains non-executable. This acceptance docket does not create the authorization file and does not authorize cleanup apply, file deletion, destructive Git, merge, push, deploy, or worktree removal.
`;
}

function main() {
  const payload = buildGeneratedArtifactResidualAcceptanceDocket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.latestJson, json);
  write(GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.datedJson, json);
  write(GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.latestMarkdown, md);
  write(GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.latestJson,
    latestMarkdown: GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.latestMarkdown,
    status: payload.ownerDecisionDocket.status,
    residualTargets: payload.summary.residualTargets,
    totalGiB: payload.summary.totalGiB,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    acceptanceChecks: payload.summary.acceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
