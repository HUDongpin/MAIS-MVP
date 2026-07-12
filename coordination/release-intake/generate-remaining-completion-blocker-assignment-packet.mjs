#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  completionAudit: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  nextOwnerPacket: "coordination/release-intake/latest-A25-next-owner-approval-packet.json",
  ownerPackageAssignments: "coordination/release-intake/latest-A25-owner-package-blocker-assignment-packet.json",
  wave01Assignments: "coordination/release-intake/latest-A25-wave01-typecheck-owner-assignment-packet.json",
  wave01ResyncTemplate: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json",
  wave01Frontier: "coordination/release-intake/latest-A25-wave01-governance-frontier-readiness.json",
  closureSequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  physicalQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  latestJson: "coordination/release-intake/latest-A25-remaining-completion-blocker-assignment-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-remaining-completion-blocker-assignment-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-remaining-completion-blocker-assignment-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-remaining-completion-blocker-assignment-packet.md`
};

const ownerProfiles = {
  releaseSource: {
    assignmentId: "remaining-completion-release-source-clean",
    agentIds: ["A22", "A25", "A10"],
    owner: "A22 release engineering with A25/A10 release-intake support",
    objective: "Make release-source clean possible without using dirty root as a deploy source.",
    nextActions: [
      "Keep root main inventory-only until owner-package closure drains dirty entries.",
      "Use clean worktree, clean clone, reviewed clean release slice, or owner-approved pruned staging only.",
      "After package closure, rerun release-source clean and dirty-map zero gates."
    ]
  },
  lifecycle: {
    assignmentId: "remaining-completion-worktree-lifecycle",
    agentIds: ["A25", "A22"],
    owner: "A25 git hygiene with A22 release-source consumer",
    objective: "Close strict worktree lifecycle decisions only after owner-reviewed package extraction, PR/review package, archive, retirement, or blocker decisions exist.",
    nextActions: [
      "Use physical lifecycle approval rows as the source of truth.",
      "Do not remove/prune worktrees or delete branches until exact owner authorization names the approval ID and command.",
      "Rerun strict lifecycle only after every dirty or clean-diverged row has a reviewed final state."
    ]
  },
  wave01: {
    assignmentId: "remaining-completion-wave01-governance",
    agentIds: ["A25", "A10", "A22"],
    owner: "A25/A10/A22 governance and release-hygiene package",
    objective: "Make Wave 01 reviewable by resolving the current artifact-clean execution frontier, preserving the tsconfig hold, and routing remaining release-helper/type-check failures.",
    nextActions: [
      "Use the Wave01 governance frontier as the current source of truth: six A25 artifact-clean rows are owner-authorized but still need a separate execution instruction.",
      "Keep wave01-resync-01-tsconfig-json held; do not restore tsconfig.json until the owner explicitly changes that hold.",
      "Do not run restore, clean, discard, or file deletion in the package worktree until an exact owner execution instruction is recorded.",
      "Keep remaining npm audit, release-helper, and type-check failures routed as blockers, not as cleanup authorization."
    ]
  },
  ownerPackages: {
    assignmentId: "remaining-completion-owner-packages",
    agentIds: ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A11", "A12", "A13", "A15", "A18", "A20", "A21", "A23", "A24"],
    owner: "Routed owner package sessions",
    objective: "Resolve or formally block Wave 02-05 owner package readiness failures in isolated owner worktrees.",
    nextActions: [
      "Consume latest-A25-owner-package-blocker-assignment-packet.json.",
      "Fix only inside each owner allowed write scope, or write an owner-routed blocker report.",
      "Return targeted checks so A25/A22/A11 can re-evaluate readiness."
    ]
  },
  finalRelease: {
    assignmentId: "remaining-completion-final-release-source",
    agentIds: ["A22", "A25", "A11"],
    owner: "A22 release engineering with A25 release intake and A11 regression quality",
    objective: "Run final release-source and regression verification only after root and lifecycle closure are complete.",
    nextActions: [
      "Wait for root status zero, dirty-map zero, release-source clean, and strict lifecycle green.",
      "Then run A22 clean-source build gate and A11 targeted regression.",
      "Do not treat current dirty-root checks as release evidence."
    ]
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

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function ensureCurrent(label, artifact, dirtyMap) {
  if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    throw new Error(`${label} dirty-map signature is stale.`);
  }
  if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) {
    throw new Error(`${label} expanded dirty entry count is stale.`);
  }
}

function incompleteRequirements(audit) {
  return (audit.requirements ?? []).filter((row) => !row.passed);
}

function incompleteTasks(audit) {
  return (audit.planTasks ?? []).filter((row) => row.status !== "complete");
}

function relevantRows(ids, rows) {
  const wanted = new Set(ids);
  return rows.filter((row) => wanted.has(row.id));
}

function assignment(profile, rows, evidence, extra = {}) {
  return {
    ...profile,
    blockerRows: rows.map((row) => ({
      id: row.id,
      label: row.label,
      status: row.status,
      blockingReasons: row.blockingReasons ?? [],
      command: row.command?.command ?? null,
      commandStatus: row.command?.status ?? null
    })),
    evidence,
    acceptanceCriteria: [
      "The blocker is resolved only by current source evidence, not by intent.",
      "All owner work happens in isolated owner worktrees or clean release slices.",
      "No dirty-root deploy, broad staging, restore, reset, clean, delete, branch deletion, worktree removal, or prune operation is authorized by this packet.",
      "A25 reruns the refresh runner, aggregate currentness gate, and no-staged gate after the owner package changes state."
    ],
    cleanupAuthorized: false,
    executableNow: false,
    ...extra
  };
}

function buildAssignments(audit, artifacts) {
  const reqs = incompleteRequirements(audit);
  const tasks = incompleteTasks(audit);
  const rows = [...reqs, ...tasks];
  const assignments = [];

  assignments.push(assignment(
    ownerProfiles.releaseSource,
    relevantRows(["root-status-clean", "dirty-map-current-and-zero", "release-source-clean", "task-7-root-disposition"], rows),
    [
      paths.completionAudit,
      paths.physicalQueue,
      paths.closureSequence,
      paths.nextOwnerPacket
    ],
    {
      rootStatusEntries: audit.rootStatusEntries,
      expandedStatusEntries: audit.expandedStatusEntries,
      ownerPackageApprovals: artifacts.physicalQueue.summary.ownerPackageApprovals,
      cleanupAuthorizedRows: artifacts.physicalQueue.summary.cleanupAuthorizedRows,
      executableRows: artifacts.physicalQueue.summary.executableRows
    }
  ));

  assignments.push(assignment(
    ownerProfiles.lifecycle,
    relevantRows(["strict-worktree-lifecycle", "task-8-linked-worktrees"], rows),
    [
      paths.completionAudit,
      paths.physicalQueue,
      paths.closureSequence
    ],
    {
      physicalLifecycleApprovals: artifacts.physicalQueue.summary.physicalLifecycleApprovals,
      dirtyLinkedApprovals: artifacts.physicalQueue.summary.dirtyLinkedApprovals,
      cleanDivergedApprovals: artifacts.physicalQueue.summary.cleanDivergedApprovals
    }
  ));

  assignments.push(assignment(
    ownerProfiles.wave01,
    relevantRows(["task-3-wave01"], rows),
    [
      paths.wave01Assignments,
      paths.wave01ResyncTemplate,
      paths.wave01Frontier,
      "coordination/release-intake/latest-A25-wave01-governance-readiness.json"
    ],
    {
      wave01Assignments: artifacts.wave01Assignments.summary?.assignments ?? artifacts.wave01Assignments.assignments?.length ?? 0,
      wave01ResyncTemplateRows: artifacts.wave01ResyncTemplate.summary?.templateRows ?? artifacts.wave01ResyncTemplate.templateRows?.length ?? 0,
      wave01FrontierGeneratedAt: artifacts.wave01Frontier.generatedAt,
      wave01FrontierStatus: artifacts.wave01Frontier.frontierStatus,
      wave01ArtifactCleanAuthorizedRows: artifacts.wave01Frontier.summary.cleanApprovalRows,
      wave01ArtifactCleanTargetDirtyRows: artifacts.wave01Frontier.summary.targetDirtyRows,
      wave01HeldRows: artifacts.wave01Frontier.summary.heldRows,
      wave01ValidExecutionInstructionRows: artifacts.wave01Frontier.summary.validInstructionRows,
      wave01CleanupAuthorizedRows: artifacts.wave01Frontier.summary.cleanupAuthorizedRows,
      wave01ExecutableRows: artifacts.wave01Frontier.summary.executableRows
    }
  ));

  assignments.push(assignment(
    ownerProfiles.ownerPackages,
    relevantRows(["task-4-wave02", "task-5-waves03-05", "task-6-content-qa"], rows),
    [
      paths.ownerPackageAssignments,
      "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.json",
      "coordination/release-intake/latest-A25-owner-package-blocker-routing.json"
    ],
    {
      routedAssignments: artifacts.ownerPackageAssignments.summary.assignments,
      readScopeFileLinks: artifacts.ownerPackageAssignments.summary.readScopeFileLinks,
      writeScopeFiles: artifacts.ownerPackageAssignments.summary.writeScopeFiles,
      coordinationRequiredFiles: artifacts.ownerPackageAssignments.summary.coordinationRequiredFiles
    }
  ));

  assignments.push(assignment(
    ownerProfiles.finalRelease,
    relevantRows(["task-9-final-release-source"], rows),
    [
      paths.completionAudit,
      paths.closureSequence,
      paths.physicalQueue
    ],
    {
      prerequisite: "root-status-clean, dirty-map-current-and-zero, release-source-clean, and strict-worktree-lifecycle must all be complete first"
    }
  ));

  return assignments.filter((item) => item.blockerRows.length > 0);
}

function summarize(assignments, audit) {
  return {
    assignments: assignments.length,
    incompleteRequirements: incompleteRequirements(audit).length,
    incompletePlanTasks: incompleteTasks(audit).length,
    cleanupAuthorizedRows: 0,
    executableRows: 0,
    agentIds: [...new Set(assignments.flatMap((item) => item.agentIds))].sort()
  };
}

function markdown(payload) {
  const rows = payload.assignments.map((item) => (
    `| \`${item.assignmentId}\` | ${item.owner} | ${item.blockerRows.length} | ${item.cleanupAuthorized ? "yes" : "no"} | ${item.executableNow ? "yes" : "no"} |`
  )).join("\n");

  const sections = payload.assignments.map((item) => {
    const blockerRows = item.blockerRows.map((row) => (
      `| \`${row.id}\` | ${row.status} | ${row.label} | ${(row.blockingReasons ?? []).slice(0, 5).join("; ") || row.command || "see audit"} |`
    )).join("\n");
    const evidence = item.evidence.map((entry) => `- \`${entry}\``).join("\n");
    const nextActions = item.nextActions.map((entry) => `- ${entry}`).join("\n");
    const criteria = item.acceptanceCriteria.map((entry) => `- ${entry}`).join("\n");
    return `## ${item.assignmentId}

- Owner: ${item.owner}
- Agent IDs: ${item.agentIds.join(", ")}
- Objective: ${item.objective}
- Cleanup authorized: ${item.cleanupAuthorized ? "yes" : "no"}
- Executable now: ${item.executableNow ? "yes" : "no"}

### Blocker Rows

| ID | Status | Label | Blocking reason |
| --- | --- | --- | --- |
${blockerRows}

### Evidence

${evidence}

### Next Actions

${nextActions}

### Acceptance Criteria

${criteria}
`;
  }).join("\n");

  return `# A25 Remaining Completion Blocker Assignment Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

Completion audit: ${payload.completionAuditSummary.completedRequirements}/${payload.completionAuditSummary.totalRequirements} requirements, ${payload.completionAuditSummary.completedPlanTasks}/${payload.completionAuditSummary.totalPlanTasks} plan tasks complete.

This is assignment evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, file deletion, or worktree removal.

## Summary

- Assignments: ${payload.summary.assignments}
- Incomplete requirements: ${payload.summary.incompleteRequirements}
- Incomplete plan tasks: ${payload.summary.incompletePlanTasks}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Agent IDs: ${payload.summary.agentIds.join(", ")}

| Assignment | Owner | Rows | Cleanup authorized | Executable now |
| --- | --- | ---: | --- | --- |
${rows}

${sections}
`;
}

function main() {
  const dirtyMap = readJson(paths.dirtyMap);
  const completionAudit = readJson(paths.completionAudit);
  const artifacts = {
    nextOwnerPacket: readJson(paths.nextOwnerPacket),
    ownerPackageAssignments: readJson(paths.ownerPackageAssignments),
    wave01Assignments: readJson(paths.wave01Assignments),
    wave01ResyncTemplate: readJson(paths.wave01ResyncTemplate),
    wave01Frontier: readJson(paths.wave01Frontier),
    closureSequence: readJson(paths.closureSequence),
    physicalQueue: readJson(paths.physicalQueue)
  };

  ensureCurrent("completion audit", completionAudit, dirtyMap);
  ensureCurrent("next owner packet", artifacts.nextOwnerPacket, dirtyMap);
  ensureCurrent("owner package assignments", artifacts.ownerPackageAssignments, dirtyMap);
  ensureCurrent("Wave01 governance frontier", artifacts.wave01Frontier, dirtyMap);
  ensureCurrent("closure sequence", artifacts.closureSequence, dirtyMap);
  ensureCurrent("physical queue", artifacts.physicalQueue, dirtyMap);

  const assignments = buildAssignments(completionAudit, artifacts);
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    completionAuditGeneratedAt: completionAudit.generatedAt,
    completionAuditSummary: completionAudit.summary,
    sourceArtifacts: paths,
    note: "Assignment evidence only. A separate explicit owner instruction is required for any Git or physical cleanup operation.",
    summary: summarize(assignments, completionAudit),
    assignments
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
    assignments: payload.summary.assignments,
    incompleteRequirements: payload.summary.incompleteRequirements,
    incompletePlanTasks: payload.summary.incompletePlanTasks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows,
    expandedStatusEntries: payload.expandedStatusEntries
  }, null, 2));
}

main();
