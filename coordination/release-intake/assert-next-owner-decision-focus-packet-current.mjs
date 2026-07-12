#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-decision-focus-packet-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  blockerReportStarter: "coordination/release-intake/latest-A25-owner-package-blocker-report-starter.json",
  blockerReports: "coordination/release-intake/latest-A25-owner-package-blocker-reports.json",
  nextOwnerAuthorizationsStarter: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  ownerPackageReadinessMatrix: "coordination/release-intake/latest-A25-owner-package-readiness-blocker-matrix.json",
  a16PostExtractionVerificationReport: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
  a22GeneratedArtifactResidualAuthorizations: "coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json",
  remainingCompletionAssignments: "coordination/release-intake/latest-A25-remaining-completion-blocker-assignment-packet.json",
  ownerClosureActionQueue: "coordination/release-intake/latest-A25-owner-closure-action-queue.json",
  focusPacket: "coordination/release-intake/latest-A25-next-owner-decision-focus-packet.json",
  focusPacketMarkdown: "coordination/release-intake/latest-A25-next-owner-decision-focus-packet.md"
};

const HELD_WAVE01_RESYNC_APPROVAL_IDS = new Set(["wave01-resync-01-tsconfig-json"]);

function git(args, cwd = process.cwd()) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function archivePrefixForReadyRow(row) {
  const branch = row.worktree?.branch;
  if (!branch) return null;
  return `coordination/release-intake/archive/${branch.replaceAll("/", "-")}`;
}

function readArchiveSnippet(relativePath, maxSampleLines) {
  if (!relativePath) {
    return {
      path: null,
      exists: false,
      lineCount: 0,
      sampleLines: []
    };
  }

  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      path: relativePath,
      exists: false,
      lineCount: 0,
      sampleLines: []
    };
  }

  const text = fs.readFileSync(absolutePath, "utf8").replace(/\r\n/g, "\n");
  const lines = text.length ? text.split("\n") : [];
  if (lines.at(-1) === "") lines.pop();
  return {
    path: relativePath,
    exists: true,
    lineCount: lines.length,
    sampleLines: lines.slice(0, maxSampleLines)
  };
}

function buildReadyMergeReviewEvidence(row) {
  const archivePrefix = archivePrefixForReadyRow(row);
  const files = archivePrefix ? {
    linkedWorktreeManifest: "coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md",
    dirtyDivergedManifest: "coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md",
    status: `${archivePrefix}.status.txt`,
    diffstat: `${archivePrefix}.diffstat.txt`,
    patch: `${archivePrefix}.patch`,
    untracked: `${archivePrefix}.untracked.txt`,
    dirtyDivergedAheadLog: `${archivePrefix}.dirty-diverged.ahead-log.txt`,
    dirtyDivergedDiffstat: `${archivePrefix}.dirty-diverged.diffstat.txt`,
    dirtyDivergedPatch: `${archivePrefix}.dirty-diverged.patch`
  } : {};

  return {
    archivePrefix,
    requiresHumanReviewBeforeMerge: true,
    recommendedReviewOrder: [
      "status",
      "diffstat",
      "patch",
      "untracked",
      "dirty-diverged ahead-log",
      "dirty-diverged diffstat",
      "dirty-diverged patch"
    ],
    linkedWorktreeManifest: readArchiveSnippet(files.linkedWorktreeManifest, 5),
    dirtyDivergedManifest: readArchiveSnippet(files.dirtyDivergedManifest, 5),
    status: readArchiveSnippet(files.status, 8),
    diffstat: readArchiveSnippet(files.diffstat, 8),
    patch: readArchiveSnippet(files.patch, 8),
    untracked: readArchiveSnippet(files.untracked, 8),
    dirtyDivergedAheadLog: readArchiveSnippet(files.dirtyDivergedAheadLog, 8),
    dirtyDivergedDiffstat: readArchiveSnippet(files.dirtyDivergedDiffstat, 8),
    dirtyDivergedPatch: readArchiveSnippet(files.dirtyDivergedPatch, 8),
    mergeGate: "Owner must review the archived status, diffstat, patch, untracked, and dirty-diverged evidence before recording owner-package and physical-lifecycle authorization."
  };
}

function reviewInput(id, relativePath, description) {
  return {
    id,
    path: relativePath,
    exists: relativePath ? fs.existsSync(path.join(root, relativePath)) : false,
    description
  };
}

function buildReadyMergeDecisionChecklist(row, reviewEvidence) {
  const ownerApprovalId = row.approvalIds?.[0] ?? null;
  const physicalLifecycleApprovalId = row.physicalLifecycleApprovalIds?.[0] ?? null;
  const ownerPathspecPath = row.pathspecFiles?.[0] ?? null;
  const ownerWorkOrderPath = ownerApprovalId
    ? `coordination/release-intake/latest-A25-effective-work-order-${ownerApprovalId}.md`
    : null;
  const archiveInputs = [
    reviewEvidence.status,
    reviewEvidence.diffstat,
    reviewEvidence.patch,
    reviewEvidence.untracked,
    reviewEvidence.dirtyDivergedAheadLog,
    reviewEvidence.dirtyDivergedDiffstat,
    reviewEvidence.dirtyDivergedPatch
  ].filter((item) => item?.path);

  const requiredReviewInputs = [
    reviewInput("owner-pathspec", ownerPathspecPath, "Defines the owner-bounded file scope for the ready package."),
    reviewInput("owner-work-order", ownerWorkOrderPath, "Defines the owner work-order and package review context."),
    ...archiveInputs.map((item) => reviewInput(
      item.path.split("/").at(-1),
      item.path,
      "Archived worktree evidence that must be reviewed before authorization."
    ))
  ];

  const readyForOwnerReview = row.uncoveredEntries === 0
    && row.failedChecks === 0
    && row.typeCheckErrorLines === 0
    && requiredReviewInputs.every((item) => item.exists);

  return {
    purpose: "Convert this validated ready package into an explicit owner decision. This checklist does not authorize merge, cleanup, or execution.",
    readyForOwnerReview,
    requiredReviewInputs,
    reviewQuestions: [
      "Do all status/untracked paths belong to the listed A16 research evidence owner scope?",
      "Does the archived diffstat/patch confirm there is no tracked code change hidden in the candidate?",
      "Is the intended final state an owner-approved reviewed commit, evidence archive, exact-path discard, or blocker?",
      "Are both owner-package and physical-lifecycle approval IDs covered by the decision text?",
      "Are the listed post-approval validation commands acceptable before any merge/cleanup action?"
    ],
    allowedFinalStateDecisions: [
      {
        approvalId: ownerApprovalId,
        decisionKind: "owner-package",
        allowedFinalStates: ["reviewed commit", "owner-approved exact-path discard", "evidence archive", "blocker"],
        mustNameEvidenceReviewed: true
      },
      {
        approvalId: physicalLifecycleApprovalId,
        decisionKind: "physical-lifecycle",
        allowedFinalStates: ["one allowed final state in the physical lifecycle request"],
        mustNameEvidenceReviewed: true
      }
    ],
    postApprovalValidationCommands: row.postApprovalChecks ?? [],
    mustRemainFalseUntilSeparateAuthorization: {
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false
    }
  };
}

function compactPackageRow(row) {
  return {
    matrixId: row.matrixId,
    packageName: row.packageName,
    packageOwnerIds: row.packageOwnerIds ?? [],
    blockingReasons: row.blockingReasons ?? [],
    failedCheckNames: row.failedCheckNames ?? []
  };
}

function compactReadyMergeCandidate(row) {
  const reviewEvidence = buildReadyMergeReviewEvidence(row);
  return {
    candidateId: row.matrixId,
    waveId: row.waveId,
    packageId: row.packageId,
    packageName: row.packageName,
    owners: row.owners ?? [],
    approvalIds: row.approvalIds ?? [],
    physicalLifecycleApprovalIds: row.physicalLifecycleApprovalIds ?? [],
    worktree: row.worktree ?? null,
    statusEntries: row.statusEntries ?? 0,
    coveredEntries: row.coveredEntries ?? 0,
    uncoveredEntries: row.uncoveredEntries ?? 0,
    checkCount: row.checkCount ?? 0,
    failedChecks: row.failedChecks ?? 0,
    skippedChecks: row.skippedChecks ?? 0,
    typeCheckErrorLines: row.typeCheckErrorLines ?? 0,
    pathspecFiles: row.pathspecFiles ?? [],
    pathspecChecksum: row.pathspecChecksum ?? null,
    reviewEvidence,
    decisionChecklist: buildReadyMergeDecisionChecklist(row, reviewEvidence),
    requiredAuthorizationTexts: row.requiredAuthorizationTexts ?? [],
    postApprovalChecks: row.postApprovalChecks ?? [],
    recommendedOwnerAction: "Review this ready owner package as the first merge-candidate after Wave 01/package authorization decisions.",
    mergeAuthorized: false,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function compactWave01Authorization(row) {
  const held = HELD_WAVE01_RESYNC_APPROVAL_IDS.has(row.approvalId);
  return {
    approvalId: row.approvalId,
    owner: row.owner,
    subject: row.subject,
    path: row.path,
    branch: row.branch,
    worktreePath: row.worktreePath,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    requiredAuthorizationText: held ? "" : row.requiredAuthorizationText,
    sourceRequiredAuthorizationTextPresent: Boolean(row.requiredAuthorizationText),
    holdStatus: held ? "held-not-authorizable" : "active-authorizable",
    holdReason: held
      ? "Owner explicitly kept wave01-resync-01-tsconfig-json on hold; do not restore tsconfig.json until the owner changes that hold."
      : "",
    authorizableNow: !held,
    evidence: row.evidence ?? [],
    postApprovalChecks: row.postApprovalChecks ?? [],
    cleanupAuthorized: false,
    executableNow: false
  };
}

function compactGeneratedArtifactAuthorization(row) {
  return {
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    supportingOwner: row.supportingOwner,
    path: row.path,
    targetType: row.targetType,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    commandCwd: row.commandCwd,
    requiredAuthorizationText: row.requiredAuthorizationText,
    evidence: row.evidence ?? [],
    preChecks: row.preChecks ?? [],
    postApprovalChecks: row.postApprovalChecks ?? [],
    manifestSha256: row.manifestSha256,
    manifestBytes: row.manifestBytes,
    dryRunBytes: row.dryRunBytes,
    cleanupAuthorized: false,
    executableNow: false
  };
}

function compactPendingReport(row) {
  return {
    reportId: row.reportId,
    assignmentId: row.assignmentId,
    agentId: row.agentId,
    owner: row.owner,
    objective: row.objective,
    recommendedWorktree: row.recommendedWorktree,
    packageRows: (row.packageRows ?? []).map(compactPackageRow),
    writeScope: row.writeScope ?? [],
    coordinationRequired: row.coordinationRequired ?? [],
    checks: row.checks ?? [],
    stopConditions: row.stopConditions ?? [],
    cleanupAuthorized: false,
    executableNow: false
  };
}

function compactRemainingAssignment(row) {
  return {
    assignmentId: row.assignmentId,
    agentIds: row.agentIds ?? [],
    owner: row.owner,
    objective: row.objective,
    nextActions: row.nextActions ?? [],
    blockerRows: (row.blockerRows ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status,
      blockingReasons: item.blockingReasons ?? [],
      command: item.command ?? "",
      commandStatus: item.commandStatus ?? null
    })),
    cleanupAuthorized: false,
    executableNow: false
  };
}

function consumedReadyCandidateIds(artifacts) {
  const report = artifacts.a16PostExtractionVerificationReport;
  if (
    report?.candidateId &&
    report.lifecycleStatus === "post-extraction-verified" &&
    report.postExtractionVerified === true &&
    (report.summary?.failedChecks ?? 0) === 0
  ) {
    return new Set([report.candidateId]);
  }

  return new Set();
}

function expectedSections(artifacts) {
  const recordedReportIds = new Set((artifacts.blockerReports.reports ?? []).map((row) => row.reportId));
  const consumedReadyCandidateIdSet = consumedReadyCandidateIds(artifacts);
  return {
    readyOwnerPackageMergeCandidates: (artifacts.ownerPackageReadinessMatrix.rows ?? [])
      .filter((row) => row.readyForReviewedCommit === true && row.readiness === "ready")
      .filter((row) => !consumedReadyCandidateIdSet.has(row.matrixId))
      .map(compactReadyMergeCandidate),
    wave01PackageResyncApprovals: (artifacts.nextOwnerAuthorizationsStarter.authorizations ?? [])
      .filter((row) => row.approvalKind === "wave01-package-resync")
      .map(compactWave01Authorization),
    generatedArtifactResidualApprovals: (artifacts.a22GeneratedArtifactResidualAuthorizations.rows ?? [])
      .map(compactGeneratedArtifactAuthorization),
    pendingOwnerBlockerReports: (artifacts.blockerReportStarter.reports ?? [])
      .filter((row) => !recordedReportIds.has(row.reportId))
      .map(compactPendingReport),
    remainingCompletionAssignments: (artifacts.remainingCompletionAssignments.assignments ?? [])
      .map(compactRemainingAssignment),
    consumedReadyOwnerPackageMergeCandidateIds: Array.from(consumedReadyCandidateIdSet).sort()
  };
}

function expectedSummary(sections, ownerClosureActionQueue) {
  const readyOwnerPackageMergeCandidates = sections.readyOwnerPackageMergeCandidates.length;
  const wave01PackageResyncApprovals = sections.wave01PackageResyncApprovals.length;
  const generatedArtifactResidualApprovals = sections.generatedArtifactResidualApprovals.length;
  const pendingOwnerBlockerReports = sections.pendingOwnerBlockerReports.length;
  const remainingCompletionAssignments = sections.remainingCompletionAssignments.length;
  const totalDecisionRows = wave01PackageResyncApprovals + generatedArtifactResidualApprovals + pendingOwnerBlockerReports + remainingCompletionAssignments;
  return {
    sourceOwnerClosurePendingItems: ownerClosureActionQueue.summary?.pendingItems ?? 0,
    readyOwnerPackageMergeCandidates,
    consumedReadyOwnerPackageMergeCandidates: sections.consumedReadyOwnerPackageMergeCandidateIds.length,
    wave01PackageResyncApprovals,
    generatedArtifactResidualApprovals,
    pendingOwnerBlockerReports,
    remainingCompletionAssignments,
    totalDecisionRows,
    totalFocusRows: totalDecisionRows + readyOwnerPackageMergeCandidates,
    cleanupAuthorizedRows: 0,
    executableRows: 0
  };
}

function authorizationGroups(authorizations) {
  const groups = new Map();
  for (const row of authorizations ?? []) {
    const kind = row.approvalKind ?? "unknown";
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(row);
  }

  return Array.from(groups.entries()).map(([approvalKind, rows]) => ({
    approvalKind,
    rows: rows.length,
    approvalIds: rows.map((row) => row.approvalId),
    owners: Array.from(new Set(rows.map((row) => row.owner).filter(Boolean))).sort(),
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized === true).length,
    executableRows: rows.filter((row) => row.executableNow === true).length
  }));
}

function expectedCriticalPath(sections, artifacts) {
  const groups = authorizationGroups(artifacts.nextOwnerAuthorizationsStarter.authorizations ?? []);
  const groupCount = (kind) => groups.find((row) => row.approvalKind === kind)?.rows ?? 0;
  const ownerPackageRows = groupCount("owner-package");
  const physicalLifecycleRows = groupCount("physical-lifecycle");
  const readyOwnerPackageMergeCandidateRows = sections.readyOwnerPackageMergeCandidates.length;
  const authorizableWave01Rows = sections.wave01PackageResyncApprovals.filter((row) => row.authorizableNow === true);
  const heldWave01Rows = sections.wave01PackageResyncApprovals.filter((row) => row.holdStatus === "held-not-authorizable");

  return {
    status: "waiting-for-owner-input",
    targetInputFiles: [
      "coordination/release-intake/latest-A25-next-owner-authorizations.json",
      "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json",
      "coordination/release-intake/latest-A25-owner-package-blocker-report-records.json"
    ],
    priorityOrder: [
      {
        order: 1,
        id: "ready-owner-package-merge-candidates",
        ownerAction: readyOwnerPackageMergeCandidateRows > 0
          ? "Review the currently ready owner package as the first merge-candidate packet after owner authorization is recorded."
          : "No ready owner-package merge candidate is waiting; proceed to Wave 01 package-resync approvals.",
        why: readyOwnerPackageMergeCandidateRows > 0
          ? "A ready package has full pathspec coverage and no package-level failed checks, so it can become the first reviewed merge candidate once owner authorization is explicit."
          : "The previous ready candidate has been post-extraction verified and should not keep occupying the next owner-decision slot.",
        rows: readyOwnerPackageMergeCandidateRows,
        candidates: sections.readyOwnerPackageMergeCandidates.map((row) => ({
          candidateId: row.candidateId,
          packageId: row.packageId,
          packageName: row.packageName,
          owners: row.owners,
          approvalIds: row.approvalIds,
          physicalLifecycleApprovalIds: row.physicalLifecycleApprovalIds,
          worktree: row.worktree,
          statusEntries: row.statusEntries,
          uncoveredEntries: row.uncoveredEntries,
          reviewEvidence: row.reviewEvidence,
          decisionChecklist: row.decisionChecklist,
          requiredAuthorizationTexts: row.requiredAuthorizationTexts
        })),
        cleanupAuthorizedRows: 0,
        executableRows: 0
      },
      {
        order: 2,
        id: "wave01-package-resync-approvals",
        ownerAction: authorizableWave01Rows.length > 0
          ? "Review the active Wave 01 package-resync rows; keep held rows out of authorization text."
          : heldWave01Rows.length > 0
            ? "Keep the held Wave 01 package-resync row on hold; do not approve or execute it unless the owner explicitly changes that hold."
            : "No current Wave 01 package-resync approvals are required.",
        why: authorizableWave01Rows.length > 0
          ? "Only non-held rows can be considered for owner approval; held rows remain blockers until the hold changes."
          : heldWave01Rows.length > 0
            ? "The owner explicitly held wave01-resync-01-tsconfig-json, so it cannot be treated as the next approval request."
            : "The current Wave 01 package-resync and artifact-clean packets have 0 approval rows and are post-clean/closed.",
        rows: sections.wave01PackageResyncApprovals.length,
        authorizableRows: authorizableWave01Rows.length,
        heldRows: heldWave01Rows.length,
        approvalIds: authorizableWave01Rows.map((row) => row.approvalId),
        heldApprovalIds: heldWave01Rows.map((row) => row.approvalId),
        exactCommands: authorizableWave01Rows.map((row) => ({
          approvalId: row.approvalId,
          worktreePath: row.worktreePath,
          path: row.path,
          selectedAction: row.selectedAction,
          exactCommand: row.exactCommand,
          requiredAuthorizationText: row.requiredAuthorizationText
        })),
        heldCommands: heldWave01Rows.map((row) => ({
          approvalId: row.approvalId,
          worktreePath: row.worktreePath,
          path: row.path,
          selectedAction: row.selectedAction,
          exactCommand: row.exactCommand,
          holdStatus: row.holdStatus,
          holdReason: row.holdReason
        })),
        cleanupAuthorizedRows: 0,
        executableRows: 0
      },
      {
        order: 3,
        id: "owner-package-blocker-report-records",
        ownerAction: "Ask each routed owner to either resolve blockers in its recommended worktree or record a concrete blocker report.",
        why: "Completion cannot advance while owner package checks remain red without scoped fixes or recorded blockers.",
        rows: sections.pendingOwnerBlockerReports.length,
        reportIds: sections.pendingOwnerBlockerReports.map((row) => row.reportId),
        agents: sections.pendingOwnerBlockerReports.map((row) => row.agentId),
        reports: sections.pendingOwnerBlockerReports.map((row) => ({
          reportId: row.reportId,
          agentId: row.agentId,
          owner: row.owner,
          recommendedWorktree: row.recommendedWorktree,
          packageRows: row.packageRows.length,
          firstCheck: row.checks?.[0] ?? ""
        })),
        cleanupAuthorizedRows: 0,
        executableRows: 0
      },
      {
        order: 4,
        id: "canonical-final-state-decisions",
        ownerAction: "Select final states for the remaining owner-package and physical-lifecycle rows only after package evidence is reviewed.",
        why: "Strict lifecycle and dirty-map zero require reviewed final states for owner packages and linked worktrees.",
        rows: ownerPackageRows + physicalLifecycleRows,
        ownerPackageRows,
        physicalLifecycleRows,
        authorizationGroups: groups.filter((row) => row.approvalKind === "owner-package" || row.approvalKind === "physical-lifecycle"),
        cleanupAuthorizedRows: 0,
        executableRows: 0
      },
      {
        order: 5,
        id: "final-clean-source-verification",
        ownerAction: "Run final A22/A25/A11 release-source checks only after root status, dirty-map zero, and strict lifecycle are green.",
        why: "Dirty-root evidence cannot prove release readiness.",
        rows: sections.remainingCompletionAssignments.length,
        assignmentIds: sections.remainingCompletionAssignments.map((row) => row.assignmentId),
        cleanupAuthorizedRows: 0,
        executableRows: 0
      }
    ],
    postInputValidationCommands: [
      "node coordination/release-intake/assert-next-owner-authorizations-current.mjs",
      "node coordination/release-intake/generate-next-owner-authorization-execution-preview.mjs",
      "node coordination/release-intake/assert-next-owner-authorization-execution-preview-current.mjs",
      "node coordination/release-intake/assert-owner-package-blocker-report-records-current.mjs",
      "node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs",
      "node coordination/release-intake/refresh-dirty-worktree-remediation-evidence.mjs --reason \"owner critical path input verification\""
    ],
    cleanupAuthorizedRows: 0,
    executableRows: 0
  };
}

function expectedSourceArtifacts(artifacts) {
  return {
    blockerReportStarterGeneratedAt: artifacts.blockerReportStarter.generatedAt,
    blockerReportsGeneratedAt: artifacts.blockerReports.generatedAt,
    nextOwnerAuthorizationsStarterGeneratedAt: artifacts.nextOwnerAuthorizationsStarter.generatedAt,
    a16PostExtractionVerificationReportGeneratedAt: artifacts.a16PostExtractionVerificationReport.generatedAt,
    a22GeneratedArtifactResidualAuthorizationsGeneratedAt: artifacts.a22GeneratedArtifactResidualAuthorizations.generatedAt,
    remainingCompletionAssignmentsGeneratedAt: artifacts.remainingCompletionAssignments.generatedAt,
    ownerClosureActionQueueGeneratedAt: artifacts.ownerClosureActionQueue.generatedAt
  };
}

function hasExecutableRows(focusPacket) {
  const rows = [
    ...(focusPacket.readyOwnerPackageMergeCandidates ?? []),
    ...(focusPacket.wave01PackageResyncApprovals ?? []),
    ...(focusPacket.generatedArtifactResidualApprovals ?? []),
    ...(focusPacket.pendingOwnerBlockerReports ?? []),
    ...(focusPacket.remainingCompletionAssignments ?? [])
  ];
  return rows.some((row) => row.cleanupAuthorized || row.executableNow);
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 next owner decision focus packet gate");
    console.log(`Decision rows: ${payload.totalDecisionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 next owner decision focus packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, totalDecisionRows: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const artifacts = {
    blockerReportStarter: readJson(paths.blockerReportStarter),
    blockerReports: readJson(paths.blockerReports),
    nextOwnerAuthorizationsStarter: readJson(paths.nextOwnerAuthorizationsStarter),
    ownerPackageReadinessMatrix: readJson(paths.ownerPackageReadinessMatrix),
    a16PostExtractionVerificationReport: readJson(paths.a16PostExtractionVerificationReport),
    a22GeneratedArtifactResidualAuthorizations: readJson(paths.a22GeneratedArtifactResidualAuthorizations),
    remainingCompletionAssignments: readJson(paths.remainingCompletionAssignments),
    ownerClosureActionQueue: readJson(paths.ownerClosureActionQueue)
  };
  const focusPacket = readJson(paths.focusPacket);

  for (const [label, artifact] of Object.entries(artifacts)) {
    if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }

  const sections = expectedSections(artifacts);
  const summary = expectedSummary(sections, artifacts.ownerClosureActionQueue);

  if (focusPacket.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("focus packet dirty-map signature is stale");
  if (focusPacket.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("focus packet expanded dirty entry count is stale");
  if (!sameJson(focusPacket.sourceArtifacts, expectedSourceArtifacts(artifacts))) failures.push("focus packet source artifacts are stale");
  if (!sameJson(focusPacket.summary, summary)) failures.push("focus packet summary is stale");
  if (!sameJson(focusPacket.criticalPath, expectedCriticalPath(sections, artifacts))) failures.push("focus packet critical path is stale");
  if (!sameJson(focusPacket.readyOwnerPackageMergeCandidates, sections.readyOwnerPackageMergeCandidates)) failures.push("focus packet ready owner-package merge candidates are stale");
  if (!sameJson(focusPacket.consumedReadyOwnerPackageMergeCandidateIds, sections.consumedReadyOwnerPackageMergeCandidateIds)) failures.push("focus packet consumed ready owner-package merge candidates are stale");
  if (!sameJson(focusPacket.wave01PackageResyncApprovals, sections.wave01PackageResyncApprovals)) failures.push("focus packet Wave 01 approval rows are stale");
  if (!sameJson(focusPacket.generatedArtifactResidualApprovals, sections.generatedArtifactResidualApprovals)) failures.push("focus packet A22 generated-artifact residual rows are stale");
  if (!sameJson(focusPacket.pendingOwnerBlockerReports, sections.pendingOwnerBlockerReports)) failures.push("focus packet pending owner blocker rows are stale");
  if (!sameJson(focusPacket.remainingCompletionAssignments, sections.remainingCompletionAssignments)) failures.push("focus packet remaining completion rows are stale");
  if (hasExecutableRows(focusPacket)) failures.push("focus packet contains executable or cleanup-authorized row");
  const wave01Priority = (focusPacket.criticalPath?.priorityOrder ?? []).find((row) => row.id === "wave01-package-resync-approvals") ?? {};
  const noCurrentWave01Rows = summary.wave01PackageResyncApprovals === 0;
  if (!noCurrentWave01Rows && (wave01Priority.heldApprovalIds ?? []).includes("wave01-resync-01-tsconfig-json") !== true) {
    failures.push("focus packet must keep wave01-resync-01-tsconfig-json in heldApprovalIds");
  }
  if (noCurrentWave01Rows && (wave01Priority.heldApprovalIds ?? []).length !== 0) {
    failures.push("focus packet must not keep stale Wave01 heldApprovalIds when no Wave01 rows remain");
  }
  if ((wave01Priority.approvalIds ?? []).includes("wave01-resync-01-tsconfig-json")) {
    failures.push("held wave01-resync-01-tsconfig-json must not be in approvalIds");
  }
  if ((wave01Priority.exactCommands ?? []).some((row) => row.approvalId === "wave01-resync-01-tsconfig-json")) {
    failures.push("held wave01-resync-01-tsconfig-json must not be in exactCommands");
  }
  if ((focusPacket.wave01PackageResyncApprovals ?? []).some((row) => row.approvalId === "wave01-resync-01-tsconfig-json" && row.requiredAuthorizationText)) {
    failures.push("held wave01-resync-01-tsconfig-json must suppress requiredAuthorizationText");
  }
  for (const candidate of focusPacket.readyOwnerPackageMergeCandidates ?? []) {
    if (candidate.reviewEvidence?.requiresHumanReviewBeforeMerge !== true) failures.push(`ready merge candidate missing human review gate: ${candidate.candidateId}`);
    if (!candidate.reviewEvidence?.status?.exists) failures.push(`ready merge candidate missing status archive evidence: ${candidate.candidateId}`);
    if (!candidate.reviewEvidence?.untracked?.exists) failures.push(`ready merge candidate missing untracked archive evidence: ${candidate.candidateId}`);
    if (!candidate.reviewEvidence?.dirtyDivergedAheadLog?.exists) failures.push(`ready merge candidate missing dirty-diverged ahead-log evidence: ${candidate.candidateId}`);
    if (candidate.decisionChecklist?.readyForOwnerReview !== true) failures.push(`ready merge candidate missing owner-review checklist readiness: ${candidate.candidateId}`);
    if ((candidate.decisionChecklist?.allowedFinalStateDecisions ?? []).length < 2) failures.push(`ready merge candidate missing owner-package/physical-lifecycle final-state decision rows: ${candidate.candidateId}`);
    if ((candidate.decisionChecklist?.requiredReviewInputs ?? []).some((item) => item.exists !== true)) failures.push(`ready merge candidate has missing required review input: ${candidate.candidateId}`);
    if (candidate.decisionChecklist?.mustRemainFalseUntilSeparateAuthorization?.mergeAuthorized !== false) failures.push(`ready merge candidate checklist incorrectly authorizes merge: ${candidate.candidateId}`);
  }

  const markdown = readText(paths.focusPacketMarkdown);
  if (markdown.includes("undefined")) failures.push("focus packet markdown contains undefined");
  if (!markdown.includes("This focus packet is coordination evidence only.")) failures.push("focus packet markdown missing non-authorization boundary");
  if (!markdown.includes("## Decision Order")) failures.push("focus packet markdown missing decision order");
  if (!markdown.includes("## Critical Path Owner Response")) failures.push("focus packet markdown missing critical path owner response");
  if (!markdown.includes("## Ready Owner-Package Merge Candidates")) failures.push("focus packet markdown missing ready owner-package merge candidates section");
  if (summary.readyOwnerPackageMergeCandidates > 0 && !markdown.includes("Review evidence archive prefix")) failures.push("focus packet markdown missing ready-candidate review evidence");
  if (summary.readyOwnerPackageMergeCandidates > 0 && !markdown.includes("Owner merge decision checklist ready")) failures.push("focus packet markdown missing owner merge decision checklist");
  if (summary.consumedReadyOwnerPackageMergeCandidates > 0 && !markdown.includes("Consumed ready-candidate IDs:")) failures.push("focus packet markdown missing consumed ready-candidate IDs");
  if (!markdown.includes("## Wave 01 Package Resync Approvals")) failures.push("focus packet markdown missing Wave 01 approval section");
  if (!markdown.includes("Wave 01 held rows:")) failures.push("focus packet markdown missing Wave 01 held rows");
  if (noCurrentWave01Rows) {
    if (!markdown.includes("No current Wave 01 package-resync approvals are required")) {
      failures.push("focus packet markdown missing no-current Wave01 package-resync text");
    }
  } else if (!markdown.includes("suppressed while held")) {
    failures.push("focus packet markdown must state held authorization text is suppressed");
  }
  if (markdown.includes("Authorize approvalId=wave01-resync-01-tsconfig-json")) {
    failures.push("focus packet markdown must not expose held wave01 authorization text");
  }
  if (!markdown.includes("## A22 Generated-Artifact Residual Approvals")) failures.push("focus packet markdown missing A22 generated-artifact residual section");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceOwnerClosurePendingItems: summary.sourceOwnerClosurePendingItems,
    readyOwnerPackageMergeCandidates: summary.readyOwnerPackageMergeCandidates,
    consumedReadyOwnerPackageMergeCandidates: summary.consumedReadyOwnerPackageMergeCandidates,
    wave01PackageResyncApprovals: summary.wave01PackageResyncApprovals,
    generatedArtifactResidualApprovals: summary.generatedArtifactResidualApprovals,
    pendingOwnerBlockerReports: summary.pendingOwnerBlockerReports,
    remainingCompletionAssignments: summary.remainingCompletionAssignments,
    totalDecisionRows: summary.totalDecisionRows,
    totalFocusRows: summary.totalFocusRows,
    readyCandidateReviewEvidenceRows: (focusPacket.readyOwnerPackageMergeCandidates ?? []).filter((row) => row.reviewEvidence?.requiresHumanReviewBeforeMerge === true).length,
    readyCandidateDecisionChecklistRows: (focusPacket.readyOwnerPackageMergeCandidates ?? []).filter((row) => row.decisionChecklist?.readyForOwnerReview === true).length,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows,
    executableRows: summary.executableRows,
    failures
  });
}

main();
