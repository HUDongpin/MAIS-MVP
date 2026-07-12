#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  validateToMergeHandoff: "coordination/release-intake/latest-A25-validate-to-merge-handoff.json",
  completionAudit: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  remainingCompletionAssignments: "coordination/release-intake/latest-A25-remaining-completion-blocker-assignment-packet.json",
  compactRequestBundle: "coordination/release-intake/latest-A25-next-owner-compact-request-bundle.json",
  validationHoldReleaseGate: "coordination/release-intake/latest-A25-validation-hold-release-gate.json",
  latestJson: "coordination/release-intake/latest-A25-validate-to-merge-blocker-frontier.json",
  latestMarkdown: "coordination/release-intake/latest-A25-validate-to-merge-blocker-frontier.md",
  datedJson: `coordination/release-intake/${date}-A25-validate-to-merge-blocker-frontier.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-validate-to-merge-blocker-frontier.md`
};

const checkProfiles = {
  "focus-batch-recorded": {
    owner: "A25 git hygiene and release intake",
    agentIds: ["A25"],
    blockerClass: "owner-authorization",
    nextAction: "Record the current owner-package focus batch after explicit owner approval, then rerun post-input validation.",
    targetArtifact: VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.compactRequestBundle
  },
  "canonical-authorizations-complete": {
    owner: "A25 git hygiene and release intake with routed owner sessions",
    agentIds: ["A25"],
    blockerClass: "owner-authorization-backlog",
    nextAction: "Continue shrinking pending canonical authorization rows through guarded owner-reviewed focus batches.",
    targetArtifact: VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.compactRequestBundle
  },
  "owner-inputs-ready": {
    owner: "A25 git hygiene and release intake",
    agentIds: ["A25"],
    blockerClass: "owner-input-readiness",
    nextAction: "Bring owner-input readiness to green by recording canonical authorizations and clearing any pending owner-input rows.",
    targetArtifact: "coordination/release-intake/latest-A25-owner-closure-input-readiness.json"
  },
  "validation-hold-released": {
    owner: "A25 git hygiene and release intake with owner confirmation",
    agentIds: ["A25"],
    blockerClass: "owner-confirmation-hold",
    nextAction: "Wait for explicit owner confirmation that the active compose-worktree deletion/hold is resolved before treating aggregate validation as releasable.",
    targetArtifact: "coordination/release-intake/latest-A25-owner-input-action-packet.json"
  },
  "release-source-clean": {
    owner: "A22 production reliability and release engineering with A25/A10 support",
    agentIds: ["A22", "A25", "A10"],
    blockerClass: "release-source-clean",
    nextAction: "Keep root as inventory and prepare a clean worktree, clean clone, reviewed clean slice, or owner-approved pruned staging directory before merge/release evidence.",
    targetArtifact: "coordination/release-intake/latest-A22-release-source-clean-blocker-evidence.json"
  }
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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function sourceCurrentnessFailures({ dirtyMap, handoff, completionAudit, assignments, compactBundle }) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  for (const [label, artifact] of [
    ["validate-to-merge handoff", handoff],
    ["completion audit", completionAudit],
    ["remaining completion assignments", assignments],
    ["compact request bundle", compactBundle]
  ]) {
    if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }
  if ((handoff.sourceCurrentnessFailures ?? []).length > 0) failures.push("validate-to-merge handoff has source currentness failures");
  if ((assignments.summary?.cleanupAuthorizedRows ?? 0) !== 0) failures.push("remaining completion assignments expose cleanup-authorized rows");
  if ((assignments.summary?.executableRows ?? 0) !== 0) failures.push("remaining completion assignments expose executable rows");
  return failures;
}

function focusBatchNextAction(compactBundle) {
  const request = compactBundle.batchAuthorizationRequest ?? {};
  const pendingRows = request.pendingRows ?? compactBundle.summary?.focusBatchPendingRows ?? 0;
  const approvalIds = request.approvalIds ?? [];
  if (pendingRows === 0) {
    return "No current focus-batch rows are pending; keep the canonical backlog, validation hold, and clean-source blockers routed without recording an empty batch.";
  }
  const rowLabel = pendingRows === 1 ? "1-row" : `${pendingRows}-row`;
  const ids = approvalIds.length > 0 ? ` (${approvalIds.join(", ")})` : "";
  return `Record the current ${rowLabel} owner-package focus batch${ids} only after explicit owner approval, then rerun post-input validation.`;
}

function validationHoldNextAction(validationHoldReleaseGate) {
  if (!validationHoldReleaseGate) {
    return "Generate the A25 validation-hold release gate, then keep the hold blocked unless that gate is released.";
  }
  const status = validationHoldReleaseGate.gateStatus ?? "missing";
  const activePath = validationHoldReleaseGate.gitWorktreeLedger?.activeWorktreePath ?? "the owner-active compose worktree";
  const activeFilesystem = validationHoldReleaseGate.gitWorktreeLedger?.activeWorktreeFilesystem ?? {};
  if (status === "blocked-worktree-still-registered") {
    if (activeFilesystem.existsOnDisk === true) {
      return `Owner confirmation is recorded, but ${activePath} still exists on disk and Git worktree ledger still registers it with ${activeFilesystem.statusEntryCount ?? 0} status entries; keep validation hold blocked until a separately authorized lifecycle action resolves that worktree and rerun the release gate.`;
    }
    return `Owner confirmation is recorded, but Git worktree ledger still registers ${activePath}; keep validation hold blocked until the ledger no longer lists that path and rerun the release gate.`;
  }
  if (status === "released") {
    return "Validation-hold release gate is released; rerun validate-to-merge handoff and keep merge blocked until every other merge check is green and the owner gives a separate exact merge instruction.";
  }
  if (status === "blocked-recording-not-current") {
    return "Refresh the validation-hold confirmation recording dry-run/current gate, then rerun the release gate before treating the hold as releasable.";
  }
  if (status === "blocked-missing-owner-confirmation-record" || status === "blocked-owner-confirmation-record-invalid") {
    return "Keep validation hold blocked until the exact owner confirmation record is present, valid, and separately checked by the release gate.";
  }
  if (status === "blocked-source-stale") {
    return "Refresh stale validation-hold release-gate sources, then rerun the release gate before treating the hold as releasable.";
  }
  return `Keep validation hold blocked; release gate status is ${status}.`;
}

function compactFailedMergeCheck(check, index, handoff, compactBundle, validationHoldReleaseGate) {
  const profile = checkProfiles[check.id] ?? {
    owner: "A25/A22 routed release owner",
    agentIds: ["A25", "A22"],
    blockerClass: "merge-readiness",
    nextAction: "Resolve this failed merge readiness check using its evidence links, then rerun validate-to-merge handoff.",
    targetArtifact: VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.validateToMergeHandoff
  };
  const batchRequest = compactBundle.batchAuthorizationRequest ?? {};
  const batchText = check.id === "focus-batch-recorded" ? batchRequest.copyableApprovalText ?? "" : "";
  const batchReplyTextZh = check.id === "focus-batch-recorded" ? batchRequest.copyableOwnerReplyTextZh ?? "" : "";
  const nextAction = check.id === "focus-batch-recorded"
    ? focusBatchNextAction(compactBundle)
    : check.id === "validation-hold-released"
      ? validationHoldNextAction(validationHoldReleaseGate)
      : profile.nextAction;
  const evidence = [
    ...(check.evidence ?? [profile.targetArtifact]),
    ...(check.id === "validation-hold-released" ? [VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.validationHoldReleaseGate] : [])
  ];
  return {
    rank: index + 1,
    checkId: check.id,
    label: check.label,
    blocker: check.blocker,
    owner: profile.owner,
    agentIds: profile.agentIds,
    blockerClass: profile.blockerClass,
    nextAction,
    evidence,
    targetArtifact: profile.targetArtifact,
    copyableOwnerText: batchText,
    copyableOwnerReplyTextZh: batchReplyTextZh,
    validationHoldReleaseGateStatus: check.id === "validation-hold-released" ? validationHoldReleaseGate?.gateStatus ?? "missing" : "",
    validationHoldWorktreeStillRegistered: check.id === "validation-hold-released" ? validationHoldReleaseGate?.summary?.worktreeStillRegistered === true : false,
    validationHoldWorktreePathExists: check.id === "validation-hold-released" ? validationHoldReleaseGate?.summary?.activeWorktreePathExists === true : false,
    validationHoldWorktreeDirtyStatusEntries: check.id === "validation-hold-released" ? validationHoldReleaseGate?.summary?.activeWorktreeDirtyStatusEntries ?? 0 : 0,
    requiresOwnerInput: ["owner-authorization", "owner-authorization-backlog", "owner-input-readiness", "owner-confirmation-hold"].includes(profile.blockerClass),
    requiresCleanReleaseSource: profile.blockerClass === "release-source-clean",
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function incompleteRows(audit) {
  return [
    ...(audit.requirements ?? []).filter((row) => row.status !== "complete"),
    ...(audit.planTasks ?? []).filter((row) => row.status !== "complete")
  ].map((row) => ({
    id: row.id,
    label: row.label,
    status: row.status,
    blockingReasons: row.blockingReasons ?? [],
    evidence: row.evidence ?? []
  }));
}

export function buildValidateToMergeBlockerFrontier() {
  const dirtyMap = readJson(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.dirtyMap);
  const handoff = readJson(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.validateToMergeHandoff);
  const completionAudit = readJson(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.completionAudit);
  const assignments = readJson(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.remainingCompletionAssignments);
  const compactBundle = readJson(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.compactRequestBundle);
  const validationHoldReleaseGate = exists(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.validationHoldReleaseGate)
    ? readJson(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.validationHoldReleaseGate)
    : null;
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap, handoff, completionAudit, assignments, compactBundle });
  const failedMergeChecks = (handoff.mergeChecks ?? []).filter((row) => row.passed !== true);
  const frontierRows = failedMergeChecks.map((row, index) => compactFailedMergeCheck(row, index, handoff, compactBundle, validationHoldReleaseGate));
  const completionRows = incompleteRows(completionAudit);
  const cleanupAuthorizedRows =
    (handoff.summary?.cleanupAuthorizedRows ?? 0) +
    (compactBundle.summary?.cleanupAuthorizedRows ?? 0) +
    (assignments.summary?.cleanupAuthorizedRows ?? 0);
  const executableRows =
    (handoff.summary?.executableRows ?? 0) +
    (compactBundle.summary?.executableRows ?? 0) +
    (assignments.summary?.executableRows ?? 0);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(dirtyMap),
    sourceArtifacts: {
      validateToMergeHandoffGeneratedAt: handoff.generatedAt,
      completionAuditGeneratedAt: completionAudit.generatedAt,
      remainingCompletionAssignmentsGeneratedAt: assignments.generatedAt,
      compactRequestBundleGeneratedAt: compactBundle.generatedAt,
      validationHoldReleaseGateGeneratedAt: validationHoldReleaseGate?.generatedAt ?? null
    },
    handoffStatus: handoff.handoffStatus,
    readyForMerge: handoff.readyForMerge === true,
    sourceCurrentnessFailures: sourceFailures,
    frontierRows,
    completionRows,
    summary: {
      handoffStatus: handoff.handoffStatus,
      readyForMerge: handoff.readyForMerge === true,
      failedMergeChecks: failedMergeChecks.length,
      frontierRows: frontierRows.length,
      ownerInputFrontierRows: frontierRows.filter((row) => row.requiresOwnerInput).length,
      cleanSourceFrontierRows: frontierRows.filter((row) => row.requiresCleanReleaseSource).length,
      pendingCanonicalAuthorizationRows: handoff.summary?.pendingCanonicalAuthorizationRows ?? 0,
      focusBatchPendingRows: handoff.summary?.focusBatchPendingRows ?? 0,
      validationHoldStatus: handoff.summary?.validationHoldStatus ?? "missing",
      validationHoldReleaseGateStatus: validationHoldReleaseGate?.gateStatus ?? "missing",
      validationHoldWorktreeStillRegistered: validationHoldReleaseGate?.summary?.worktreeStillRegistered === true,
      validationHoldWorktreePathExists: validationHoldReleaseGate?.summary?.activeWorktreePathExists === true,
      validationHoldWorktreeDirtyStatusEntries: validationHoldReleaseGate?.summary?.activeWorktreeDirtyStatusEntries ?? 0,
      releaseSourceClean: handoff.summary?.releaseSourceClean === true,
      strictLifecycleClean: handoff.summary?.strictLifecycleClean === true,
      incompleteRequirements: (completionAudit.summary?.incompleteRequirements ?? completionRows.filter((row) => !row.id?.startsWith("task-")).length),
      incompletePlanTasks: (completionAudit.summary?.incompletePlanTasks ?? completionRows.filter((row) => row.id?.startsWith("task-")).length),
      cleanupAuthorizedRows,
      executableRows,
      sourceCurrentnessFailures: sourceFailures.length
    },
    boundary: {
      evidenceOnly: true,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      dirtyRootDeployAuthorized: false,
      physicalCleanupAuthorized: false
    }
  };
}

export function stableValidateToMergeBlockerFrontierProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    handoffStatus: payload.handoffStatus,
    readyForMerge: payload.readyForMerge,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    frontierRows: payload.frontierRows,
    completionRows: payload.completionRows,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function list(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const frontierTable = payload.frontierRows.map((row) => (
    `| ${row.rank} | \`${cell(row.checkId)}\` | ${cell(row.owner)} | ${cell(row.blockerClass)} | ${cell(row.blocker)} |`
  )).join("\n") || "| 0 | none | none | none | none |";
  const sections = payload.frontierRows.map((row) => `## ${row.rank}. ${row.checkId}

- Owner: ${row.owner}
- Agent IDs: ${row.agentIds.join(", ")}
- Blocker class: ${row.blockerClass}
- Next action: ${row.nextAction}
- Requires owner input: ${row.requiresOwnerInput ? "yes" : "no"}
- Requires clean release source: ${row.requiresCleanReleaseSource ? "yes" : "no"}
- Merge authorized: ${row.mergeAuthorized}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}

Evidence:
${list(row.evidence.map((item) => `\`${item}\``))}

${row.copyableOwnerText ? `Copyable owner text:\n\n\`\`\`text\n${row.copyableOwnerText}\n\`\`\`\n` : ""}
${row.copyableOwnerReplyTextZh ? `Copyable owner reply text (Chinese):\n\n\`\`\`text\n${row.copyableOwnerReplyTextZh}\n\`\`\`\n` : ""}
`).join("\n");
  const completionTable = payload.completionRows.slice(0, 20).map((row) => (
    `| \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.label)} | ${cell((row.blockingReasons ?? [])[0] ?? "")} |`
  )).join("\n") || "| none | none | none | none |";

  return `# A25 Validate-To-Merge Blocker Frontier

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This frontier is evidence-only. It condenses the failed validate-to-merge checks into the smallest current blocker queue. It does not authorize staging, committing, merging, cleaning, restoring, resetting, deleting files, deleting branches, removing worktrees, pushing, deploying, dirty-root deploy, or physical cleanup.

## Summary

- Handoff status: \`${payload.summary.handoffStatus}\`
- Ready for merge: ${payload.summary.readyForMerge ? "yes" : "no"}
- Failed merge checks: ${payload.summary.failedMergeChecks}
- Frontier rows: ${payload.summary.frontierRows}
- Owner-input frontier rows: ${payload.summary.ownerInputFrontierRows}
- Clean-source frontier rows: ${payload.summary.cleanSourceFrontierRows}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Focus-batch pending rows: ${payload.summary.focusBatchPendingRows}
- Validation hold: ${payload.summary.validationHoldStatus}
- Validation hold release gate: ${payload.summary.validationHoldReleaseGateStatus}
- Validation hold worktree still registered: ${payload.summary.validationHoldWorktreeStillRegistered ? "yes" : "no"}
- Validation hold worktree path exists: ${payload.summary.validationHoldWorktreePathExists ? "yes" : "no"}
- Validation hold worktree dirty status entries: ${payload.summary.validationHoldWorktreeDirtyStatusEntries}
- A22 release source clean: ${payload.summary.releaseSourceClean ? "yes" : "no"}
- A25 strict lifecycle clean: ${payload.summary.strictLifecycleClean ? "yes" : "no"}
- Incomplete requirements: ${payload.summary.incompleteRequirements}
- Incomplete plan tasks: ${payload.summary.incompletePlanTasks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## Frontier Rows

| Rank | Check | Owner | Class | Blocker |
| ---: | --- | --- | --- | --- |
${frontierTable}

${sections}

## Completion Audit Rows

| ID | Status | Label | First blocking reason |
| --- | --- | --- | --- |
${completionTable}

## Boundary

Merge remains blocked until this frontier has zero failed merge-check rows and a separate exact owner merge instruction exists. Cleanup remains blocked until merge verification and separate exact cleanup instructions exist.
`;
}

function main() {
  const payload = buildValidateToMergeBlockerFrontier();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.latestJson, json);
  write(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.datedJson, json);
  write(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.latestMarkdown, md);
  write(VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.latestJson,
    latestMarkdown: VALIDATE_TO_MERGE_BLOCKER_FRONTIER_PATHS.latestMarkdown,
    handoffStatus: payload.handoffStatus,
    readyForMerge: payload.readyForMerge,
    failedMergeChecks: payload.summary.failedMergeChecks,
    frontierRows: payload.summary.frontierRows,
    ownerInputFrontierRows: payload.summary.ownerInputFrontierRows,
    cleanSourceFrontierRows: payload.summary.cleanSourceFrontierRows,
    validationHoldWorktreePathExists: payload.summary.validationHoldWorktreePathExists,
    validationHoldWorktreeDirtyStatusEntries: payload.summary.validationHoldWorktreeDirtyStatusEntries,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
