#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

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
  latestJson: "coordination/release-intake/latest-A25-next-owner-decision-focus-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-decision-focus-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-decision-focus-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-decision-focus-packet.md`
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

function cleanList(values) {
  return (values ?? []).filter(Boolean);
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

function decisionSections(artifacts) {
  const recordedReportIds = new Set((artifacts.blockerReports.reports ?? []).map((row) => row.reportId));
  const consumedReadyCandidateIdSet = consumedReadyCandidateIds(artifacts);
  const readyOwnerPackageMergeCandidates = (artifacts.ownerPackageReadinessMatrix.rows ?? [])
    .filter((row) => row.readyForReviewedCommit === true && row.readiness === "ready")
    .filter((row) => !consumedReadyCandidateIdSet.has(row.matrixId))
    .map(compactReadyMergeCandidate);
  const wave01PackageResyncApprovals = (artifacts.nextOwnerAuthorizationsStarter.authorizations ?? [])
    .filter((row) => row.approvalKind === "wave01-package-resync")
    .map(compactWave01Authorization);
  const pendingOwnerBlockerReports = (artifacts.blockerReportStarter.reports ?? [])
    .filter((row) => !recordedReportIds.has(row.reportId))
    .map(compactPendingReport);
  const remainingCompletionAssignments = (artifacts.remainingCompletionAssignments.assignments ?? [])
    .map(compactRemainingAssignment);
  const generatedArtifactResidualApprovals = (artifacts.a22GeneratedArtifactResidualAuthorizations.rows ?? [])
    .map(compactGeneratedArtifactAuthorization);

  return {
    readyOwnerPackageMergeCandidates,
    wave01PackageResyncApprovals,
    generatedArtifactResidualApprovals,
    pendingOwnerBlockerReports,
    remainingCompletionAssignments,
    consumedReadyOwnerPackageMergeCandidateIds: Array.from(consumedReadyCandidateIdSet).sort()
  };
}

function summarize(sections, ownerClosureActionQueue) {
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

function criticalPath(sections, artifacts) {
  const authorizations = artifacts.nextOwnerAuthorizationsStarter.authorizations ?? [];
  const groups = authorizationGroups(authorizations);
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

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function list(values) {
  const items = cleanList(values);
  return items.length ? items.map((item) => `  - ${item}`).join("\n") : "  - none";
}

function evidenceSummary(evidence) {
  if (!evidence) return ["none"];
  return [
    `status: ${evidence.status?.lineCount ?? 0} lines (${evidence.status?.path ?? "missing"})`,
    `diffstat: ${evidence.diffstat?.lineCount ?? 0} lines (${evidence.diffstat?.path ?? "missing"})`,
    `patch: ${evidence.patch?.lineCount ?? 0} lines (${evidence.patch?.path ?? "missing"})`,
    `untracked: ${evidence.untracked?.lineCount ?? 0} lines (${evidence.untracked?.path ?? "missing"})`,
    `dirty-diverged ahead-log: ${evidence.dirtyDivergedAheadLog?.lineCount ?? 0} lines (${evidence.dirtyDivergedAheadLog?.path ?? "missing"})`,
    `dirty-diverged diffstat: ${evidence.dirtyDivergedDiffstat?.lineCount ?? 0} lines (${evidence.dirtyDivergedDiffstat?.path ?? "missing"})`,
    `dirty-diverged patch: ${evidence.dirtyDivergedPatch?.lineCount ?? 0} lines (${evidence.dirtyDivergedPatch?.path ?? "missing"})`
  ];
}

function sampleBlock(title, snippet) {
  const sample = snippet?.sampleLines ?? [];
  return `- ${title} sample:
${list(sample)}`;
}

function markdown(payload) {
  const criticalPathRows = payload.criticalPath.priorityOrder.map((row) => (
    `| ${row.order} | ${cell(row.id)} | ${cell(row.ownerAction)} | ${row.rows} | no |`
  )).join("\n");

  const criticalTargets = payload.criticalPath.targetInputFiles.map((target) => `- \`${target}\``).join("\n");
  const criticalValidation = payload.criticalPath.postInputValidationCommands.map((command) => `- \`${command}\``).join("\n");
  const decisionOrder = [
    ...(payload.summary.readyOwnerPackageMergeCandidates > 0
      ? ["Review the ready owner-package merge candidate as the first candidate packet after explicit owner authorization."]
      : []),
    payload.summary.wave01PackageResyncApprovals > 0
      ? "Keep held Wave 01 package resync rows out of approval text until the owner explicitly changes the hold."
      : "No current Wave 01 package-resync approvals are required.",
    "Review the A22 generated-artifact residual approvals against the current dry-run before any physical cleanup.",
    "Ask each pending package owner to record a blocker report or narrow owner-scoped fix plan.",
    "Use the remaining completion assignments as the final release-source and lifecycle closeout checklist."
  ].map((item, index) => `${index + 1}. ${item}`).join("\n");
  const wave01AuthorizationText = payload.criticalPath.priorityOrder
    .find((row) => row.id === "wave01-package-resync-approvals")
    ?.exactCommands
    ?.map((row) => `- ${row.requiredAuthorizationText}`)
    .join("\n") || "- none";
  const wave01HeldRows = payload.criticalPath.priorityOrder
    .find((row) => row.id === "wave01-package-resync-approvals")
    ?.heldCommands
    ?.map((row) => `- \`${row.approvalId}\`: ${row.holdReason}`)
    .join("\n") || "- none";

  const wave01Rows = payload.wave01PackageResyncApprovals.map((row) => (
    `| ${cell(row.approvalId)} | ${cell(row.owner)} | ${cell(row.path)} | ${cell(row.selectedAction)} | ${cell(row.holdStatus)} | ${row.authorizableNow ? "yes" : "no"} | no |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a | no | no |";

  const readyCandidateRows = payload.readyOwnerPackageMergeCandidates.map((row) => (
    `| ${cell(row.packageId)} | ${cell(row.packageName)} | ${cell(row.owners.join(", "))} | ${row.statusEntries} | ${row.uncoveredEntries} | no |`
  )).join("\n") || "| none | n/a | n/a | 0 | 0 | no |";
  const consumedReadyCandidateRows = (payload.consumedReadyOwnerPackageMergeCandidateIds ?? [])
    .map((id) => `- \`${id}\` post-extraction verified; no longer waiting in the ready-candidate queue.`)
    .join("\n") || "- none";

  const reportRows = payload.pendingOwnerBlockerReports.map((row) => (
    `| ${cell(row.agentId)} | ${cell(row.reportId)} | ${cell(row.owner)} | ${row.packageRows.length} | no |`
  )).join("\n") || "| none | n/a | n/a | 0 | no |";

  const remainingRows = payload.remainingCompletionAssignments.map((row) => (
    `| ${cell(row.assignmentId)} | ${cell(row.agentIds.join(", "))} | ${cell(row.owner)} | ${row.blockerRows.length} | no |`
  )).join("\n") || "| none | n/a | n/a | 0 | no |";

  const generatedRows = payload.generatedArtifactResidualApprovals.map((row) => (
    `| ${cell(row.approvalId)} | ${cell(row.owner)} | ${cell(row.path)} | ${cell(row.selectedAction)} | ${cell(row.exactCommand)} | no |`
  )).join("\n") || "| none | n/a | n/a | n/a | n/a | no |";

  const wave01Details = payload.wave01PackageResyncApprovals.map((row) => `### ${row.approvalId}

- Owner: ${row.owner}
- Worktree: \`${row.worktreePath}\`
- Exact command status: ${row.holdStatus === "held-not-authorizable" ? "held; not authorizable" : "waiting for owner authorization"}
- Exact command: \`${row.exactCommand}\`
- Hold status: ${row.holdStatus}
- Hold reason: ${row.holdReason || "none"}
- Authorization text:
${row.authorizableNow ? list([row.requiredAuthorizationText]) : list(["suppressed while held"])}
- Evidence:
${list(row.evidence)}
- Post-approval checks:
${list(row.postApprovalChecks)}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
`).join("\n");

  const readyCandidateDetails = payload.readyOwnerPackageMergeCandidates.map((row) => `### ${row.packageId}

- Owners: ${row.owners.join(", ") || "none"}
- Worktree: \`${row.worktree?.path ?? ""}\`
- Branch: \`${row.worktree?.branch ?? ""}\`
- Status entries: ${row.statusEntries}
- Uncovered entries: ${row.uncoveredEntries}
- Failed checks: ${row.failedChecks}
- Type-check error lines: ${row.typeCheckErrorLines}
- Review evidence archive prefix: \`${row.reviewEvidence?.archivePrefix ?? ""}\`
- Review evidence requires human review before merge: ${row.reviewEvidence?.requiresHumanReviewBeforeMerge ?? true}
- Recommended review order:
${list(row.reviewEvidence?.recommendedReviewOrder)}
- Archive evidence summary:
${list(evidenceSummary(row.reviewEvidence))}
${sampleBlock("Status", row.reviewEvidence?.status)}
${sampleBlock("Diffstat", row.reviewEvidence?.diffstat)}
${sampleBlock("Untracked", row.reviewEvidence?.untracked)}
${sampleBlock("Dirty-diverged ahead-log", row.reviewEvidence?.dirtyDivergedAheadLog)}
- Owner merge decision checklist ready: ${row.decisionChecklist?.readyForOwnerReview ?? false}
- Owner merge decision checklist purpose: ${row.decisionChecklist?.purpose ?? ""}
- Required review inputs:
${list((row.decisionChecklist?.requiredReviewInputs ?? []).map((item) => `${item.exists ? "present" : "missing"}: ${item.path} - ${item.description}`))}
- Review questions:
${list(row.decisionChecklist?.reviewQuestions)}
- Allowed final-state decisions:
${list((row.decisionChecklist?.allowedFinalStateDecisions ?? []).map((item) => `${item.decisionKind} ${item.approvalId}: ${(item.allowedFinalStates ?? []).join(", ")}`))}
- Required authorization text:
${list(row.requiredAuthorizationTexts)}
- Post-approval checks:
${list(row.postApprovalChecks)}
- Recommended owner action: ${row.recommendedOwnerAction}
- Merge authorized: ${row.mergeAuthorized}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
`).join("\n");

  const reportDetails = payload.pendingOwnerBlockerReports.map((row) => `### ${row.reportId}

- Owner: ${row.owner}
- Recommended worktree: \`${row.recommendedWorktree}\`
- Objective: ${row.objective}
- Package blockers:
${list(row.packageRows.map((item) => `${item.packageName}: ${(item.blockingReasons ?? []).join("; ")}`))}
- Checks:
${list(row.checks)}
- Stop conditions:
${list(row.stopConditions)}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
`).join("\n");

  const generatedDetails = payload.generatedArtifactResidualApprovals.map((row) => `### ${row.approvalId}

- Owner: ${row.owner}
- Supporting owner: ${row.supportingOwner}
- Target: \`${row.path}\`
- Target type: ${row.targetType}
- Exact command waiting for owner/A22 authorization: \`${row.exactCommand}\`
- Command cwd: \`${row.commandCwd}\`
- Manifest SHA-256: \`${row.manifestSha256}\`
- Manifest bytes: ${row.manifestBytes}
- Dry-run bytes: ${row.dryRunBytes}
- Required authorization text:
${list([row.requiredAuthorizationText])}
- Evidence:
${list(row.evidence)}
- Pre-checks:
${list(row.preChecks)}
- Post-approval checks:
${list(row.postApprovalChecks)}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
`).join("\n");

  const remainingDetails = payload.remainingCompletionAssignments.map((row) => `### ${row.assignmentId}

- Owner: ${row.owner}
- Agent IDs: ${row.agentIds.join(", ") || "none"}
- Objective: ${row.objective}
- Next actions:
${list(row.nextActions)}
- Blockers:
${list(row.blockerRows.map((item) => `${item.label}: ${item.status}`))}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
`).join("\n");

  return `# A25 Next Owner Decision Focus Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This focus packet is coordination evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Source owner-closure pending items: ${payload.summary.sourceOwnerClosurePendingItems}
- Ready owner-package merge candidates: ${payload.summary.readyOwnerPackageMergeCandidates}
- Consumed ready owner-package merge candidates: ${payload.summary.consumedReadyOwnerPackageMergeCandidates}
- Wave 01 package resync approvals: ${payload.summary.wave01PackageResyncApprovals}
- A22 generated-artifact residual approvals: ${payload.summary.generatedArtifactResidualApprovals}
- Pending owner blocker reports: ${payload.summary.pendingOwnerBlockerReports}
- Remaining completion assignments: ${payload.summary.remainingCompletionAssignments}
- Total decision rows in this focus packet: ${payload.summary.totalDecisionRows}
- Total focus rows in this focus packet: ${payload.summary.totalFocusRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Decision Order

${decisionOrder}

## Critical Path Owner Response

Target input files:

${criticalTargets}

| Order | ID | Owner action | Rows | Executable |
| ---: | --- | --- | ---: | --- |
${criticalPathRows}

Wave 01 exact authorization text options:

${wave01AuthorizationText}

Wave 01 held rows:

${wave01HeldRows}

Post-input validation commands:

${criticalValidation}

## Ready Owner-Package Merge Candidates

| Package ID | Package | Owners | Status entries | Uncovered entries | Executable |
| --- | --- | --- | ---: | ---: | --- |
${readyCandidateRows}

${readyCandidateDetails}

Consumed ready-candidate IDs:

${consumedReadyCandidateRows}

## Wave 01 Package Resync Approvals

| Approval ID | Owner | Path | Action | Hold status | Authorizable now | Executable |
| --- | --- | --- | --- | --- | --- | --- |
${wave01Rows}

${wave01Details}

## A22 Generated-Artifact Residual Approvals

| Approval ID | Owner | Target | Action | Exact command | Executable |
| --- | --- | --- | --- | --- | --- |
${generatedRows}

${generatedDetails}

## Pending Owner Blocker Reports

| Agent | Report ID | Owner | Package blockers | Executable |
| --- | --- | --- | --- | --- |
${reportRows}

${reportDetails}

## Remaining Completion Assignments

| Assignment ID | Agents | Owner | Blockers | Executable |
| --- | --- | --- | --- | --- |
${remainingRows}

${remainingDetails}`;
}

function main() {
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

  for (const [label, artifact] of Object.entries(artifacts)) ensureCurrent(label, artifact, dirtyMap);

  const sections = decisionSections(artifacts);
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    sourceArtifacts: {
      blockerReportStarterGeneratedAt: artifacts.blockerReportStarter.generatedAt,
      blockerReportsGeneratedAt: artifacts.blockerReports.generatedAt,
      nextOwnerAuthorizationsStarterGeneratedAt: artifacts.nextOwnerAuthorizationsStarter.generatedAt,
      a16PostExtractionVerificationReportGeneratedAt: artifacts.a16PostExtractionVerificationReport.generatedAt,
      a22GeneratedArtifactResidualAuthorizationsGeneratedAt: artifacts.a22GeneratedArtifactResidualAuthorizations.generatedAt,
      remainingCompletionAssignmentsGeneratedAt: artifacts.remainingCompletionAssignments.generatedAt,
      ownerClosureActionQueueGeneratedAt: artifacts.ownerClosureActionQueue.generatedAt
    },
    note: "Coordination evidence only. These rows narrow the next owner decisions but do not authorize physical cleanup or execution.",
    summary: summarize(sections, artifacts.ownerClosureActionQueue),
    criticalPath: criticalPath(sections, artifacts),
    ...sections
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
    totalDecisionRows: payload.summary.totalDecisionRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

main();
