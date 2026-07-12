#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFERRED_AGGREGATE_VALIDATION_COMMANDS,
  OWNER_ACTIVE_WORKTREE_HOLD,
  SAFE_POST_INPUT_VALIDATION_COMMANDS
} from "./validation-hold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const OWNER_INPUT_ACTION_PACKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  ownerClosureInputReadiness: "coordination/release-intake/latest-A25-owner-closure-input-readiness.json",
  nextOwnerAuthorizationsStarter: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  ownerPackageBlockerReportRecordsTemplate: "coordination/release-intake/latest-A25-owner-package-blocker-report-records-template.json",
  pendingOwnerBlockerReportBundle: "coordination/release-intake/latest-A25-pending-owner-blocker-report-bundle.json",
  nextOwnerDecisionFocus: "coordination/release-intake/latest-A25-next-owner-decision-focus-packet.json",
  nextOwnerAuthorizationFocusBatchAcceptanceDocket: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-acceptance-docket.json",
  nextOwnerAuthorizationFocusBatchOwnerInputScaffold: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-owner-input-scaffold.json",
  nextOwnerAuthorizationFocusBatchRecordingIntake: "coordination/release-intake/latest-A25-next-owner-authorization-focus-batch-recording-intake.json",
  latestJson: "coordination/release-intake/latest-A25-owner-input-action-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-owner-input-action-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-owner-input-action-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-owner-input-action-packet.md`
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

function readOptionalJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function ensureCurrent(label, artifact, dirtyMap) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  const failures = [];
  if (!artifact) return [`${label} is missing`];
  if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
  if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  return failures;
}

function groupByKind(authorizations) {
  const groups = new Map();
  for (const row of authorizations) {
    const kind = row.approvalKind ?? "unknown";
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(row);
  }
  return Array.from(groups.entries()).map(([approvalKind, rows]) => ({
    approvalKind,
    rows: rows.length,
    approvalIds: rows.map((row) => row.approvalId),
    owners: Array.from(new Set(rows.map((row) => row.owner).filter(Boolean))).sort(),
    sampleSubjects: rows.slice(0, 5).map((row) => row.subject ?? row.path ?? row.branch ?? row.approvalId),
    cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized === true).length,
    executableRows: rows.filter((row) => row.executableNow === true).length
  }));
}

function requiredInputFiles(readiness, starter, recordsTemplate) {
  const blocks = readiness.inputBlocks ?? [];
  const blockRows = blocks.map((block) => ({
    id: block.id,
    label: block.label,
    path: block.sourceFile,
    filePresent: block.filePresent === true,
    totalRows: count(block.totalRows),
    validRows: count(block.validRows),
    pendingRows: count(block.pendingRows),
    ready: block.ready === true,
    status: block.status ?? "unknown"
  }));

  return blockRows
    .filter((block) => block.id !== "next-owner-authorization-execution-preview")
    .map((block) => ({
      ...block,
      targetRole:
        block.path === starter.authorizationTarget
          ? "canonical authorization input"
          : block.path === recordsTemplate.targetRecordsFile
            ? "owner blocker report records input"
            : block.id === "wave01-package-resync-authorizations"
              ? "Wave 01 package-resync compatibility input"
              : "owner input",
      createOrEdit: block.filePresent ? "edit existing file" : "create from starter/template before owner approval can be validated"
    }));
}

function firstCheckCommand(row) {
  const firstCheck = row.checks?.[0];
  if (typeof firstCheck === "string") return firstCheck;
  return firstCheck?.command ?? "";
}

function pendingReportRows(bundle) {
  return (bundle.pendingReports ?? []).map((row) => ({
    reportId: row.reportId,
    assignmentId: row.assignmentId,
    agentId: row.agentId,
    owner: row.owner,
    role: row.role,
    recommendedWorktree: row.recommendedWorktree,
    packageRows: (row.packageRows ?? []).length,
    writeScopeFiles: (row.writeScope ?? []).length,
    coordinationRequiredFiles: (row.coordinationRequired ?? []).length,
    firstCheckCommand: firstCheckCommand(row),
    nextAction: row.nextAction,
    template: row.latestMarkdown,
    cleanupAuthorized: row.cleanupAuthorized === true,
    executableNow: row.executableNow === true
  }));
}

function decisionFocus(focus) {
  return {
    wave01PackageResyncApprovals: (focus.wave01PackageResyncApprovals ?? []).map((row) => ({
      approvalId: row.approvalId,
      owner: row.owner,
      subject: row.subject,
      path: row.path,
      selectedAction: row.selectedAction,
      exactCommand: row.exactCommand,
      cleanupAuthorized: row.cleanupAuthorized === true,
      executableNow: row.executableNow === true
    })),
    generatedArtifactResidualApprovals: (focus.generatedArtifactResidualApprovals ?? []).map((row) => ({
      approvalId: row.approvalId,
      owner: row.owner,
      path: row.path,
      selectedAction: row.selectedAction,
      exactCommand: row.exactCommand,
      cleanupAuthorized: row.cleanupAuthorized === true,
      executableNow: row.executableNow === true
    })),
    remainingCompletionAssignments: (focus.remainingCompletionAssignments ?? []).map((row) => ({
      assignmentId: row.assignmentId,
      agentIds: row.agentIds ?? [],
      owner: row.owner,
      objective: row.objective,
      nextActions: row.nextActions ?? [],
      blockerRows: (row.blockerRows ?? []).length,
      blockerSummaries: (row.blockerRows ?? []).map((item) => ({
        id: item.id,
        label: item.label,
        status: item.status,
        command: item.command ?? "",
        commandStatus: item.commandStatus ?? null,
        blockingReasons: item.blockingReasons ?? []
      })),
      cleanupAuthorized: row.cleanupAuthorized === true,
      executableNow: row.executableNow === true
    }))
  };
}

function criticalPathFocus(focus) {
  const criticalPath = focus.criticalPath ?? {};
  return {
    status: criticalPath.status ?? "missing",
    targetInputFiles: criticalPath.targetInputFiles ?? [],
    priorityOrder: (criticalPath.priorityOrder ?? []).map((row) => ({
      order: row.order,
      id: row.id,
      ownerAction: row.ownerAction,
      why: row.why,
      rows: count(row.rows),
      authorizableRows: count(row.authorizableRows),
      heldRows: count(row.heldRows),
      approvalIds: row.approvalIds ?? [],
      heldApprovalIds: row.heldApprovalIds ?? [],
      exactCommands: (row.exactCommands ?? []).map((commandRow) => ({
        approvalId: commandRow.approvalId,
        worktreePath: commandRow.worktreePath,
        path: commandRow.path,
        selectedAction: commandRow.selectedAction,
        exactCommand: commandRow.exactCommand,
        requiredAuthorizationText: commandRow.requiredAuthorizationText
      })),
      heldCommands: (row.heldCommands ?? []).map((commandRow) => ({
        approvalId: commandRow.approvalId,
        worktreePath: commandRow.worktreePath,
        path: commandRow.path,
        selectedAction: commandRow.selectedAction,
        exactCommand: commandRow.exactCommand,
        holdStatus: commandRow.holdStatus,
        holdReason: commandRow.holdReason
      })),
      reportIds: row.reportIds ?? [],
      assignmentIds: row.assignmentIds ?? [],
      ownerPackageRows: count(row.ownerPackageRows),
      physicalLifecycleRows: count(row.physicalLifecycleRows),
      cleanupAuthorizedRows: count(row.cleanupAuthorizedRows),
      executableRows: count(row.executableRows)
    })),
    postInputValidationCommands: criticalPath.postInputValidationCommands ?? [],
    cleanupAuthorizedRows: count(criticalPath.cleanupAuthorizedRows),
    executableRows: count(criticalPath.executableRows)
  };
}

function focusBatchAcceptance(docket) {
  const rows = docket?.acceptanceRows ?? [];
  const pendingRows = rows.filter((row) => row.accepted !== true);
  return {
    batchId: docket?.batchId ?? "",
    batchStatus: docket?.batchStatus ?? "missing",
    focusBatchRows: count(docket?.summary?.focusBatchRows, rows.length),
    acceptedRows: count(docket?.summary?.acceptedRows, rows.filter((row) => row.accepted === true).length),
    pendingRows: count(docket?.summary?.pendingRows, pendingRows.length),
    heldRows: count(docket?.summary?.heldRows, (docket?.heldRows ?? []).length),
    pendingCanonicalAuthorizationRows: count(docket?.summary?.pendingCanonicalAuthorizationRows),
    cleanupAuthorizedRows: count(docket?.summary?.cleanupAuthorizedRows),
    executableRows: count(docket?.summary?.executableRows),
    pendingApprovalIds: pendingRows.map((row) => row.approvalId),
    heldApprovalIds: (docket?.heldRows ?? []).map((row) => row.approvalId),
    heldPolicyApprovalIds: docket?.heldPolicyApprovalIds ?? docket?.focusBatchPolicy?.heldApprovalIds ?? [],
    requiredAuthorizationTexts: pendingRows.map((row) => ({
      approvalId: row.approvalId,
      owner: row.owner,
      path: row.path,
      requiredAuthorizationText: row.requiredAuthorizationText
    }))
  };
}

function focusBatchOwnerInputVisibility(scaffold) {
  const rows = scaffold?.ownerInputRows ?? [];
  return {
    batchId: scaffold?.batchId ?? "",
    batchStatus: scaffold?.batchStatus ?? "missing",
    canonicalTarget: scaffold?.canonicalTarget ?? "",
    focusBatchRows: count(scaffold?.summary?.focusBatchRows, rows.length),
    acceptedRows: count(scaffold?.summary?.acceptedRows, rows.filter((row) => row.accepted === true).length),
    pendingRows: count(scaffold?.summary?.pendingRows, rows.filter((row) => row.accepted !== true).length),
    heldRows: count(scaffold?.summary?.heldRows, (scaffold?.heldRows ?? []).length),
    heldPolicyApprovalIds: scaffold?.heldPolicyApprovalIds ?? [],
    canonicalDraftVisibleRows: count(scaffold?.summary?.canonicalDraftVisibleRows, rows.filter((row) => row.canonicalDraftRowPresent).length),
    canonicalAuthorizationVisibleRows: count(scaffold?.summary?.canonicalAuthorizationVisibleRows, rows.filter((row) => row.canonicalRowPresent).length),
    ownerInputVisibleRows: count(scaffold?.summary?.ownerInputVisibleRows, rows.filter((row) => row.canonicalDraftRowPresent || row.canonicalRowPresent).length),
    cleanupAuthorizedRows: count(scaffold?.summary?.cleanupAuthorizedRows),
    executableRows: count(scaffold?.summary?.executableRows),
    sourceCurrentnessFailures: count(scaffold?.summary?.sourceCurrentnessFailures),
    visibilityRows: rows.map((row) => ({
      approvalId: row.approvalId,
      owner: row.owner,
      path: row.path,
      accepted: row.accepted === true,
      canonicalDraftRowPresent: row.canonicalDraftRowPresent === true,
      canonicalRowPresent: row.canonicalRowPresent === true,
      canonicalDraftIndex: count(row.canonicalDraftIndex, -1),
      canonicalAuthorizationIndex: count(row.canonicalAuthorizationIndex, -1),
      nextOwnerInputAction: row.nextOwnerInputAction ?? "",
      requiredAuthorizationText: row.requiredAuthorizationText ?? "",
      recommendedAuthorizationText: row.recommendedAuthorizationText ?? row.requiredAuthorizationText ?? "",
      ledgerSelectedFinalState: row.ledgerSelectedFinalState ?? "",
      ledgerDecisionStatus: row.ledgerDecisionStatus ?? "",
      cleanupAuthorized: row.cleanupAuthorized === true,
      executableNow: row.executableNow === true
    }))
  };
}

function focusBatchRecordingIntake(intake) {
  const rows = intake?.focusBatchRows ?? [];
  const checks = intake?.checks ?? [];
  return {
    batchId: intake?.batchId ?? "",
    intakeStatus: intake?.intakeStatus ?? "missing",
    canonicalTarget: intake?.canonicalTarget ?? "",
    focusBatchRows: count(intake?.summary?.focusBatchRows, rows.length),
    acceptedRows: count(intake?.summary?.acceptedRows, rows.filter((row) => row.accepted === true).length),
    pendingRows: count(intake?.summary?.pendingRows, rows.filter((row) => row.accepted !== true).length),
    heldRows: count(intake?.summary?.heldRows, (intake?.heldRows ?? []).length),
    canonicalDraftVisibleRows: count(intake?.summary?.canonicalDraftVisibleRows),
    canonicalAuthorizationVisibleRows: count(intake?.summary?.canonicalAuthorizationVisibleRows),
    ownerInputVisibleRows: count(intake?.summary?.ownerInputVisibleRows),
    canonicalAuthorizationsGateAuthorizedRows: count(intake?.summary?.canonicalAuthorizationsGateAuthorizedRows),
    canonicalAuthorizationsGatePendingRows: count(intake?.summary?.canonicalAuthorizationsGatePendingRows),
    postInputValidationCommands: intake?.postInputValidationCommands ?? [],
    deferredAggregateValidationCommands: intake?.deferredAggregateValidationCommands ?? [],
    postInputValidationCommandRows: count(
      intake?.summary?.postInputValidationCommands,
      (intake?.postInputValidationCommands ?? []).length
    ),
    deferredAggregateValidationCommandRows: count(
      intake?.summary?.deferredAggregateValidationCommands,
      (intake?.deferredAggregateValidationCommands ?? []).length
    ),
    cleanupAuthorizedRows: count(intake?.summary?.cleanupAuthorizedRows),
    executableRows: count(intake?.summary?.executableRows),
    sourceCurrentnessFailures: count(intake?.summary?.sourceCurrentnessFailures, (intake?.sourceCurrentnessFailures ?? []).length),
    failedChecks: checks.filter((row) => row.status !== "pass").length,
    checks: checks.map((row) => ({
      id: row.id,
      status: row.status,
      detail: row.detail
    })),
    rows: rows.map((row) => ({
      approvalId: row.approvalId,
      owner: row.owner,
      path: row.path,
      accepted: row.accepted === true,
      canonicalDraftRowPresent: row.canonicalDraftRowPresent === true,
      canonicalRowPresent: row.canonicalRowPresent === true,
      rowStatus: row.rowStatus ?? "unknown",
      recommendedAuthorizationText: row.recommendedAuthorizationText ?? row.requiredAuthorizationText ?? "",
      ledgerSelectedFinalState: row.ledgerSelectedFinalState ?? "",
      ledgerDecisionStatus: row.ledgerDecisionStatus ?? "",
      cleanupAuthorized: row.cleanupAuthorized === true,
      executableNow: row.executableNow === true
    }))
  };
}

export function buildOwnerInputActionPacket() {
  const dirtyMap = readJson(OWNER_INPUT_ACTION_PACKET_PATHS.dirtyMap);
  const readiness = readJson(OWNER_INPUT_ACTION_PACKET_PATHS.ownerClosureInputReadiness);
  const starter = readJson(OWNER_INPUT_ACTION_PACKET_PATHS.nextOwnerAuthorizationsStarter);
  const recordsTemplate = readJson(OWNER_INPUT_ACTION_PACKET_PATHS.ownerPackageBlockerReportRecordsTemplate);
  const pendingBundle = readJson(OWNER_INPUT_ACTION_PACKET_PATHS.pendingOwnerBlockerReportBundle);
  const focus = readJson(OWNER_INPUT_ACTION_PACKET_PATHS.nextOwnerDecisionFocus);
  const focusBatchAcceptanceDocket = readOptionalJson(OWNER_INPUT_ACTION_PACKET_PATHS.nextOwnerAuthorizationFocusBatchAcceptanceDocket);
  const focusBatchOwnerInputScaffold = readOptionalJson(OWNER_INPUT_ACTION_PACKET_PATHS.nextOwnerAuthorizationFocusBatchOwnerInputScaffold);
  const focusBatchRecordingIntakeArtifact = readOptionalJson(OWNER_INPUT_ACTION_PACKET_PATHS.nextOwnerAuthorizationFocusBatchRecordingIntake);

  const sourceCurrentnessFailures = [
    ...ensureCurrent("owner closure input readiness", readiness, dirtyMap),
    ...ensureCurrent("next owner authorizations starter", starter, dirtyMap),
    ...ensureCurrent("owner package blocker report records template", recordsTemplate, dirtyMap),
    ...ensureCurrent("pending owner blocker report bundle", pendingBundle, dirtyMap),
    ...ensureCurrent("next owner decision focus packet", focus, dirtyMap),
    ...ensureCurrent("next owner authorization focus batch acceptance docket", focusBatchAcceptanceDocket, dirtyMap),
    ...ensureCurrent("next owner authorization focus batch owner-input scaffold", focusBatchOwnerInputScaffold, dirtyMap),
    ...ensureCurrent("next owner authorization focus batch recording intake", focusBatchRecordingIntakeArtifact, dirtyMap),
    ...((focusBatchRecordingIntakeArtifact?.sourceCurrentnessFailures ?? []).length > 0
      ? ["next owner authorization focus batch recording intake has source currentness failures"]
      : [])
  ];

  const authorizations = starter.authorizations ?? [];
  const pendingReports = pendingReportRows(pendingBundle);
  const focusRows = decisionFocus(focus);
  const criticalPath = criticalPathFocus(focus);
  const nextOwnerAuthorizationFocusBatch = focusBatchAcceptance(focusBatchAcceptanceDocket);
  const nextOwnerAuthorizationFocusBatchOwnerInput = focusBatchOwnerInputVisibility(focusBatchOwnerInputScaffold);
  const nextOwnerAuthorizationFocusBatchRecordingIntake = focusBatchRecordingIntake(focusBatchRecordingIntakeArtifact);
  const requiredInputs = requiredInputFiles(readiness, starter, recordsTemplate);
  const cleanupAuthorizedRows =
    count(readiness.summary?.cleanupAuthorizedRows) +
    authorizations.filter((row) => row.cleanupAuthorized === true).length +
    pendingReports.filter((row) => row.cleanupAuthorized === true).length +
    nextOwnerAuthorizationFocusBatch.cleanupAuthorizedRows +
    nextOwnerAuthorizationFocusBatchOwnerInput.cleanupAuthorizedRows +
    nextOwnerAuthorizationFocusBatchRecordingIntake.cleanupAuthorizedRows;
  const executableRows =
    count(readiness.summary?.executableRows) +
    authorizations.filter((row) => row.executableNow === true).length +
    pendingReports.filter((row) => row.executableNow === true).length +
    nextOwnerAuthorizationFocusBatch.executableRows +
    nextOwnerAuthorizationFocusBatchOwnerInput.executableRows +
    nextOwnerAuthorizationFocusBatchRecordingIntake.executableRows;

  const summary = {
    ownerInputsReady: readiness.summary?.ownerInputsReady === true,
    requiredInputFiles: requiredInputs.length,
    missingInputFiles: requiredInputs.filter((row) => !row.filePresent).length,
    pendingCanonicalAuthorizationRows: count(readiness.summary?.pendingCanonicalAuthorizationRows),
    pendingWave01AuthorizationRows: count(readiness.summary?.pendingWave01AuthorizationRows),
    pendingOwnerBlockerReportRecords: count(readiness.summary?.pendingOwnerBlockerReportRecords),
    authorizationStarterRows: count(starter.summary?.starterRows, authorizations.length),
    pendingOwnerBlockerReports: pendingReports.length,
    nextOwnerDecisionRows: count(focus.summary?.totalDecisionRows),
    criticalPathPriorityRows: criticalPath.priorityOrder.length,
    nextOwnerAuthorizationFocusBatchRows: nextOwnerAuthorizationFocusBatch.focusBatchRows,
    nextOwnerAuthorizationFocusBatchAcceptedRows: nextOwnerAuthorizationFocusBatch.acceptedRows,
    nextOwnerAuthorizationFocusBatchPendingRows: nextOwnerAuthorizationFocusBatch.pendingRows,
    nextOwnerAuthorizationFocusBatchHeldRows: nextOwnerAuthorizationFocusBatch.heldRows,
    nextOwnerAuthorizationFocusBatchStatus: nextOwnerAuthorizationFocusBatch.batchStatus,
    nextOwnerAuthorizationFocusBatchOwnerInputVisibleRows: nextOwnerAuthorizationFocusBatchOwnerInput.ownerInputVisibleRows,
    nextOwnerAuthorizationFocusBatchCanonicalDraftVisibleRows: nextOwnerAuthorizationFocusBatchOwnerInput.canonicalDraftVisibleRows,
    nextOwnerAuthorizationFocusBatchCanonicalAuthorizationVisibleRows: nextOwnerAuthorizationFocusBatchOwnerInput.canonicalAuthorizationVisibleRows,
    nextOwnerAuthorizationFocusBatchRecordingIntakeStatus: nextOwnerAuthorizationFocusBatchRecordingIntake.intakeStatus,
    nextOwnerAuthorizationFocusBatchRecordingIntakeAcceptedRows: nextOwnerAuthorizationFocusBatchRecordingIntake.acceptedRows,
    nextOwnerAuthorizationFocusBatchRecordingIntakePendingRows: nextOwnerAuthorizationFocusBatchRecordingIntake.pendingRows,
    nextOwnerAuthorizationFocusBatchRecordingIntakeOwnerInputVisibleRows: nextOwnerAuthorizationFocusBatchRecordingIntake.ownerInputVisibleRows,
    nextOwnerAuthorizationFocusBatchRecordingIntakeFailedChecks: nextOwnerAuthorizationFocusBatchRecordingIntake.failedChecks,
    nextOwnerAuthorizationFocusBatchRecordingIntakePostInputValidationCommands:
      nextOwnerAuthorizationFocusBatchRecordingIntake.postInputValidationCommandRows,
    nextOwnerAuthorizationFocusBatchRecordingIntakeDeferredAggregateValidationCommands:
      nextOwnerAuthorizationFocusBatchRecordingIntake.deferredAggregateValidationCommandRows,
    ownerClosurePendingItems: count(readiness.summary?.ownerClosurePendingItems),
    cleanupAuthorizedRows,
    executableRows,
    sourceCurrentnessFailures: sourceCurrentnessFailures.length
  };

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      ownerClosureInputReadinessGeneratedAt: readiness.generatedAt,
      nextOwnerAuthorizationsStarterGeneratedAt: starter.generatedAt,
      ownerPackageBlockerReportRecordsTemplateGeneratedAt: recordsTemplate.generatedAt,
      pendingOwnerBlockerReportBundleGeneratedAt: pendingBundle.generatedAt,
      nextOwnerDecisionFocusGeneratedAt: focus.generatedAt,
      nextOwnerAuthorizationFocusBatchAcceptanceDocketGeneratedAt: focusBatchAcceptanceDocket?.generatedAt ?? "",
      nextOwnerAuthorizationFocusBatchOwnerInputScaffoldGeneratedAt: focusBatchOwnerInputScaffold?.generatedAt ?? "",
      nextOwnerAuthorizationFocusBatchRecordingIntakeGeneratedAt: focusBatchRecordingIntakeArtifact?.generatedAt ?? ""
    },
    requiredInputs,
    criticalPath,
    authorizationGroups: groupByKind(authorizations),
    pendingOwnerBlockerReports: pendingReports,
    decisionFocus: focusRows,
    nextOwnerAuthorizationFocusBatch,
    nextOwnerAuthorizationFocusBatchOwnerInput,
    nextOwnerAuthorizationFocusBatchRecordingIntake,
    validationHold: OWNER_ACTIVE_WORKTREE_HOLD,
    nextValidationCommands: SAFE_POST_INPUT_VALIDATION_COMMANDS,
    deferredValidationCommands: DEFERRED_AGGREGATE_VALIDATION_COMMANDS,
    summary,
    sourceCurrentnessFailures,
    boundary: {
      evidenceOnly: true,
      createsAuthorizationFile: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      contentCaptured: false
    }
  };
}

export function stableOwnerInputActionPacketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    requiredInputs: payload.requiredInputs,
    criticalPath: payload.criticalPath,
    authorizationGroups: payload.authorizationGroups,
    pendingOwnerBlockerReports: payload.pendingOwnerBlockerReports,
    decisionFocus: payload.decisionFocus,
    nextOwnerAuthorizationFocusBatch: payload.nextOwnerAuthorizationFocusBatch,
    nextOwnerAuthorizationFocusBatchOwnerInput: payload.nextOwnerAuthorizationFocusBatchOwnerInput,
    nextOwnerAuthorizationFocusBatchRecordingIntake: payload.nextOwnerAuthorizationFocusBatchRecordingIntake,
    validationHold: payload.validationHold,
    nextValidationCommands: payload.nextValidationCommands,
    deferredValidationCommands: payload.deferredValidationCommands,
    summary: payload.summary,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
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
  const criticalTargetRows = payload.criticalPath.targetInputFiles.map((target) => `- \`${target}\``).join("\n");
  const criticalRows = payload.criticalPath.priorityOrder.map((row) => (
    `| ${row.order} | ${cell(row.id)} | ${cell(row.ownerAction)} | ${row.rows} | ${row.executableRows} |`
  )).join("\n");
  const wave01AuthorizationRows = payload.criticalPath.priorityOrder
    .find((row) => row.id === "wave01-package-resync-approvals")
    ?.exactCommands
    ?.map((row) => `- ${row.requiredAuthorizationText}`)
    .join("\n") || "- none";
  const wave01HeldRows = payload.criticalPath.priorityOrder
    .find((row) => row.id === "wave01-package-resync-approvals")
    ?.heldCommands
    ?.map((row) => `- \`${row.approvalId}\`: ${row.holdReason}`)
    .join("\n") || "- none";
  const inputRows = payload.requiredInputs.map((row) => (
    `| ${cell(row.label)} | \`${cell(row.path)}\` | ${row.filePresent ? "yes" : "no"} | ${row.totalRows} | ${row.pendingRows} | ${cell(row.targetRole)} |`
  )).join("\n");

  const groupRows = payload.authorizationGroups.map((row) => (
    `| ${cell(row.approvalKind)} | ${row.rows} | ${row.executableRows} | ${cell(row.approvalIds.join(", "))} |`
  )).join("\n");

  const reportRows = payload.pendingOwnerBlockerReports.map((row) => (
    `| ${cell(row.agentId)} | ${cell(row.reportId)} | ${cell(row.owner)} | ${row.packageRows} | \`${cell(row.recommendedWorktree)}\` | \`${cell(row.firstCheckCommand)}\` | ${cell(row.nextAction)} | \`${cell(row.template)}\` |`
  )).join("\n");

  const remainingRows = payload.decisionFocus.remainingCompletionAssignments.map((row) => (
    `| ${cell(row.assignmentId)} | ${cell(row.agentIds.join(", "))} | ${cell(row.owner)} | ${row.blockerRows} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n") || "| none | n/a | n/a | 0 | no |";
  const remainingDetails = payload.decisionFocus.remainingCompletionAssignments.map((row) => `### ${row.assignmentId}

- Owner: ${row.owner}
- Agent IDs: ${row.agentIds.join(", ") || "none"}
- Objective: ${row.objective}
- Next actions:
${list(row.nextActions)}
- Blockers:
${list((row.blockerSummaries ?? []).map((item) => `${item.label}: ${item.status}${item.command ? `; command: ${item.command}` : ""}`))}
- Cleanup authorized: ${row.cleanupAuthorized}
- Executable now: ${row.executableNow}
`).join("\n") || "none";

  const focusBatchRows = payload.nextOwnerAuthorizationFocusBatch.requiredAuthorizationTexts.map((row) => (
    `| \`${cell(row.approvalId)}\` | ${cell(row.owner)} | \`${cell(row.path)}\` |`
  )).join("\n") || "| none | n/a | n/a |";
  const focusBatchAuthorizationTexts = payload.nextOwnerAuthorizationFocusBatch.requiredAuthorizationTexts.map((row) => (
    `- ${row.requiredAuthorizationText}`
  )).join("\n") || "- none";
  const focusBatchRecommendedAuthorizationTexts = payload.nextOwnerAuthorizationFocusBatchOwnerInput.visibilityRows.map((row) => (
    `- ${row.recommendedAuthorizationText}`
  )).join("\n") || "- none";
  const focusBatchHeldRows = payload.nextOwnerAuthorizationFocusBatch.heldPolicyApprovalIds.map((approvalId) => (
    `- \`${approvalId}\``
  )).join("\n") || "- none";
  const focusBatchVisibilityRows = payload.nextOwnerAuthorizationFocusBatchOwnerInput.visibilityRows.map((row) => (
    `| \`${cell(row.approvalId)}\` | ${cell(row.owner)} | ${row.canonicalDraftRowPresent ? "yes" : "no"} | ${row.canonicalRowPresent ? "yes" : "no"} | ${row.accepted ? "yes" : "no"} | ${cell(row.nextOwnerInputAction)} |`
  )).join("\n") || "| none | n/a | no | no | no | n/a |";
  const recordingRows = payload.nextOwnerAuthorizationFocusBatchRecordingIntake.rows.map((row) => (
    `| \`${cell(row.approvalId)}\` | ${cell(row.owner)} | ${row.accepted ? "yes" : "no"} | ${row.canonicalDraftRowPresent ? "yes" : "no"} | ${row.canonicalRowPresent ? "yes" : "no"} | ${cell(row.rowStatus)} |`
  )).join("\n") || "| none | n/a | no | no | no | n/a |";
  const recordingCheckRows = payload.nextOwnerAuthorizationFocusBatchRecordingIntake.checks.map((row) => (
    `| ${cell(row.id)} | ${cell(row.status)} | ${cell(row.detail)} |`
  )).join("\n") || "| none | n/a | n/a |";
  const commandRows = payload.nextValidationCommands.map((command) => `- \`${command}\``).join("\n");
  const deferredCommandRows = payload.deferredValidationCommands.map((command) => `- \`${command}\``).join("\n");

  return `# A25 Owner Input Action Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This packet is a current owner-input index only. It does not create the authorization file, does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Owner inputs ready: ${payload.summary.ownerInputsReady ? "yes" : "no"}
- Required input files: ${payload.summary.requiredInputFiles}
- Missing input files: ${payload.summary.missingInputFiles}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Pending Wave 01 authorization rows: ${payload.summary.pendingWave01AuthorizationRows}
- Pending owner blocker report records: ${payload.summary.pendingOwnerBlockerReportRecords}
- Authorization starter rows: ${payload.summary.authorizationStarterRows}
- Pending owner blocker reports: ${payload.summary.pendingOwnerBlockerReports}
- Next owner decision rows: ${payload.summary.nextOwnerDecisionRows}
- Critical path priority rows: ${payload.summary.criticalPathPriorityRows}
- Next owner authorization focus batch status: \`${payload.summary.nextOwnerAuthorizationFocusBatchStatus}\`
- Next owner authorization focus batch rows: ${payload.summary.nextOwnerAuthorizationFocusBatchRows}
- Next owner authorization focus batch accepted rows: ${payload.summary.nextOwnerAuthorizationFocusBatchAcceptedRows}
- Next owner authorization focus batch pending rows: ${payload.summary.nextOwnerAuthorizationFocusBatchPendingRows}
- Next owner authorization focus batch held rows: ${payload.summary.nextOwnerAuthorizationFocusBatchHeldRows}
- Next owner authorization focus batch owner-input visible rows: ${payload.summary.nextOwnerAuthorizationFocusBatchOwnerInputVisibleRows}
- Next owner authorization focus batch canonical draft visible rows: ${payload.summary.nextOwnerAuthorizationFocusBatchCanonicalDraftVisibleRows}
- Next owner authorization focus batch canonical authorization visible rows: ${payload.summary.nextOwnerAuthorizationFocusBatchCanonicalAuthorizationVisibleRows}
- Next owner authorization focus batch recording intake status: \`${payload.summary.nextOwnerAuthorizationFocusBatchRecordingIntakeStatus}\`
- Next owner authorization focus batch recording intake accepted rows: ${payload.summary.nextOwnerAuthorizationFocusBatchRecordingIntakeAcceptedRows}
- Next owner authorization focus batch recording intake pending rows: ${payload.summary.nextOwnerAuthorizationFocusBatchRecordingIntakePendingRows}
- Next owner authorization focus batch recording intake owner-input visible rows: ${payload.summary.nextOwnerAuthorizationFocusBatchRecordingIntakeOwnerInputVisibleRows}
- Next owner authorization focus batch recording intake failed checks: ${payload.summary.nextOwnerAuthorizationFocusBatchRecordingIntakeFailedChecks}
- Next owner authorization focus batch recording intake post-input validation commands: ${payload.summary.nextOwnerAuthorizationFocusBatchRecordingIntakePostInputValidationCommands}
- Next owner authorization focus batch recording intake deferred aggregate validation commands: ${payload.summary.nextOwnerAuthorizationFocusBatchRecordingIntakeDeferredAggregateValidationCommands}
- Owner closure pending items: ${payload.summary.ownerClosurePendingItems}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## Critical Path Owner Response

Status: ${payload.criticalPath.status}

Target input files:

${criticalTargetRows}

| Order | ID | Owner action | Rows | Executable rows |
| ---: | --- | --- | ---: | ---: |
${criticalRows}

Wave 01 exact authorization text options:

${wave01AuthorizationRows}

Wave 01 held rows:

${wave01HeldRows}

Hold policy reason: Owner explicitly kept wave01-resync-01-tsconfig-json on hold. The policy remains active even when no current Wave 01 package-resync row is pending.

## Required Inputs

| Input | Target/source file | Present | Total rows | Pending rows | Role |
| --- | --- | --- | ---: | ---: | --- |
${inputRows}

## Authorization Groups

| Kind | Rows | Executable rows | Approval IDs |
| --- | ---: | ---: | --- |
${groupRows}

## Pending Owner Blocker Reports

| Agent | Report ID | Owner | Package rows | Recommended worktree | First check command | Next action | Template |
| --- | --- | --- | ---: | --- | --- | --- | --- |
${reportRows}

## Remaining Completion Assignments

| Assignment | Agent IDs | Owner | Blocker rows | Executable |
| --- | --- | --- | ---: | --- |
${remainingRows}

${remainingDetails}

## Next Owner Authorization Focus Batch

Batch ID: \`${payload.nextOwnerAuthorizationFocusBatch.batchId}\`

Batch status: \`${payload.nextOwnerAuthorizationFocusBatch.batchStatus}\`

Pending approval IDs: ${payload.nextOwnerAuthorizationFocusBatch.pendingApprovalIds.join(", ") || "none"}

Held policy approval IDs:

${focusBatchHeldRows}

| Approval ID | Owner | Path |
| --- | --- | --- |
${focusBatchRows}

Exact authorization text rows:

${focusBatchAuthorizationTexts}

Ledger-backed recommended authorization text rows:

${focusBatchRecommendedAuthorizationTexts}

Canonical owner-input visibility:

Canonical target: \`${payload.nextOwnerAuthorizationFocusBatchOwnerInput.canonicalTarget}\`

Owner-input visible rows: ${payload.nextOwnerAuthorizationFocusBatchOwnerInput.ownerInputVisibleRows}/${payload.nextOwnerAuthorizationFocusBatchOwnerInput.focusBatchRows}

| Approval ID | Owner | Draft visible | Canonical accepted row | Accepted | Next owner-input action |
| --- | --- | --- | --- | --- | --- |
${focusBatchVisibilityRows}

Recording intake checkpoint:

Focus batch recording intake status: \`${payload.nextOwnerAuthorizationFocusBatchRecordingIntake.intakeStatus}\`

Post-input validation command rows: ${payload.nextOwnerAuthorizationFocusBatchRecordingIntake.postInputValidationCommandRows}

Deferred aggregate validation command rows: ${payload.nextOwnerAuthorizationFocusBatchRecordingIntake.deferredAggregateValidationCommandRows}

| Approval ID | Owner | Accepted | Draft visible | Canonical accepted row | Row status |
| --- | --- | --- | --- | --- | --- |
${recordingRows}

| Recording check | Status | Detail |
| --- | --- | --- |
${recordingCheckRows}

## Post-Input Validation Commands

${commandRows}

## Deferred Aggregate Validation Commands

Status: ${payload.validationHold.status}

Active owner worktree: \`${payload.validationHold.activeWorktreePath}\`

Reason: ${payload.validationHold.reason}

Resume condition: ${payload.validationHold.resumeCondition}

${deferredCommandRows}

## Boundary

Every row remains non-executable. The owner must fill the named input files before validators can convert this into reviewed evidence. A separate owner instruction naming exact approval IDs and exact commands is still required before any physical cleanup can run.
`;
}

function main() {
  const payload = buildOwnerInputActionPacket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(OWNER_INPUT_ACTION_PACKET_PATHS.latestJson, json);
  write(OWNER_INPUT_ACTION_PACKET_PATHS.datedJson, json);
  write(OWNER_INPUT_ACTION_PACKET_PATHS.latestMarkdown, md);
  write(OWNER_INPUT_ACTION_PACKET_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: OWNER_INPUT_ACTION_PACKET_PATHS.latestJson,
    latestMarkdown: OWNER_INPUT_ACTION_PACKET_PATHS.latestMarkdown,
    ownerInputsReady: payload.summary.ownerInputsReady,
    missingInputFiles: payload.summary.missingInputFiles,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    pendingOwnerBlockerReportRecords: payload.summary.pendingOwnerBlockerReportRecords,
    nextOwnerAuthorizationFocusBatchStatus: payload.summary.nextOwnerAuthorizationFocusBatchStatus,
    nextOwnerAuthorizationFocusBatchRows: payload.summary.nextOwnerAuthorizationFocusBatchRows,
    nextOwnerAuthorizationFocusBatchPendingRows: payload.summary.nextOwnerAuthorizationFocusBatchPendingRows,
    nextOwnerAuthorizationFocusBatchOwnerInputVisibleRows: payload.summary.nextOwnerAuthorizationFocusBatchOwnerInputVisibleRows,
    nextOwnerAuthorizationFocusBatchRecordingIntakeStatus: payload.summary.nextOwnerAuthorizationFocusBatchRecordingIntakeStatus,
    nextOwnerAuthorizationFocusBatchRecordingIntakePendingRows:
      payload.summary.nextOwnerAuthorizationFocusBatchRecordingIntakePendingRows,
    nextOwnerAuthorizationFocusBatchRecordingIntakeFailedChecks:
      payload.summary.nextOwnerAuthorizationFocusBatchRecordingIntakeFailedChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
