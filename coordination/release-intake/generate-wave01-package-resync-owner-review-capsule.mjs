#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OWNER_ACTIVE_WORKTREE_HOLD,
  SAFE_POST_INPUT_VALIDATION_COMMANDS
} from "./validation-hold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  governanceReadiness: "coordination/release-intake/latest-A25-wave01-governance-readiness.json",
  approvalRequests: "coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json",
  executionPacket: "coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json",
  evidencePack: "coordination/release-intake/latest-A25-wave01-package-resync-evidence-pack.json",
  authorizationTemplate: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json",
  authorizationsStarter: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations-starter.json",
  ownerAuthorizationsGate: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations-current-gate.json",
  ownerAuthorizations: "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json",
  latestJson: "coordination/release-intake/latest-A25-wave01-package-resync-owner-review-capsule.json",
  latestMarkdown: "coordination/release-intake/latest-A25-wave01-package-resync-owner-review-capsule.md",
  datedJson: `coordination/release-intake/${date}-A25-wave01-package-resync-owner-review-capsule.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-wave01-package-resync-owner-review-capsule.md`
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
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function ensureCurrent(label, artifact, dirtyMap) {
  const failures = [];
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? 0;
  if (artifact.dirtyMapStatusSignature !== expectedSignature) failures.push(`${label} dirty-map signature is stale`);
  if (artifact.expandedStatusEntries !== expectedEntries) failures.push(`${label} expanded dirty entry count is stale`);
  if (Array.isArray(artifact.failures) && artifact.failures.length > 0) failures.push(`${label} has ${artifact.failures.length} failures`);
  return failures;
}

function authorizationRowsByApprovalId(ownerAuthorizations) {
  return new Map((ownerAuthorizations.authorizations ?? [])
    .filter((row) => row.approvalId)
    .map((row) => [row.approvalId, row]));
}

function rowIsAuthorized(row) {
  return Boolean(row?.approvedBy || row?.approvedAt || row?.approvalStatus === "approved");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function compactRows({ approvalRequests, executionPacket, evidencePack, authorizationTemplate, ownerAuthorizations }) {
  const requestById = new Map((approvalRequests.requests ?? []).map((row) => [row.approvalId, row]));
  const executionById = new Map((executionPacket.executionRows ?? []).map((row) => [row.approvalId, row]));
  const evidenceById = new Map((evidencePack.rows ?? []).map((row) => [row.approvalId, row]));
  const authorizedById = authorizationRowsByApprovalId(ownerAuthorizations);

  return (authorizationTemplate.authorizations ?? []).map((templateRow, index) => {
    const request = requestById.get(templateRow.approvalId) ?? {};
    const execution = executionById.get(templateRow.approvalId) ?? {};
    const evidence = evidenceById.get(templateRow.approvalId) ?? {};
    const ownerInput = authorizedById.get(templateRow.approvalId) ?? {};
    const source = Object.keys(ownerInput).length > 0 ? ownerInput : templateRow;
    const exactCommand = execution.exactCommand ?? templateRow.exactCommand ?? request.commandHint ?? "";
    return {
      order: index + 1,
      approvalId: templateRow.approvalId,
      owner: templateRow.owner,
      branch: templateRow.branch,
      worktreePath: templateRow.worktreePath,
      commandCwd: templateRow.commandCwd ?? execution.commandCwd,
      path: templateRow.path,
      selectedAction: templateRow.selectedAction ?? request.actionKind,
      exactCommand,
      packageOnly: templateRow.packageOnly ?? request.packageOnly ?? execution.packageOnly ?? evidence.packageOnly ?? false,
      rootPathExists: evidence.rootPathExists ?? request.rootPathExists ?? execution.rootPathExists ?? false,
      worktreePathExists: evidence.worktreePathExists ?? request.worktreePathExists ?? execution.worktreePathExists ?? false,
      approvalRequestPresent: evidence.approvalRequestPresent === true,
      executionRowPresent: evidence.executionRowPresent === true,
      worktreeStatusLines: evidence.worktreeStatusLines ?? [],
      rootStatusLines: evidence.rootStatusLines ?? [],
      rootEvidence: evidence.rootEvidence ?? null,
      worktreeEvidence: evidence.worktreeEvidence ?? null,
      worktreeDiffEvidence: evidence.worktreeDiffEvidence ?? null,
      evidenceReviewed: templateRow.evidenceReviewed ?? execution.evidence ?? request.evidence ?? [],
      requiredAuthorizationText: templateRow.requiredAuthorizationText ?? request.requiredAuthorizationText ?? execution.requiredAuthorizationText ?? "",
      authorizationTextToPaste: templateRow.authorizationTextToPaste ?? templateRow.requiredAuthorizationText ?? request.requiredAuthorizationText ?? "",
      preExecutionChecks: templateRow.preExecutionChecks ?? execution.preExecutionChecks ?? [],
      postExecutionChecks: templateRow.postExecutionChecks ?? execution.postExecutionChecks ?? request.postApprovalChecks ?? [],
      stopCondition: execution.stopCondition ?? evidence.stopCondition ?? request.approvalNeeded ?? "",
      approvalStatus: source.approvalStatus ?? "pending",
      approvedBy: source.approvedBy ?? "",
      approvedAt: source.approvedAt ?? "",
      notes: source.notes ?? "",
      authorized: rowIsAuthorized(source),
      cleanupAuthorized: source.cleanupAuthorized === true || templateRow.cleanupAuthorized === true || execution.cleanupAuthorized === true || evidence.cleanupAuthorized === true,
      executableNow: source.executableNow === true || templateRow.executableNow === true || execution.executableNow === true || evidence.executableNow === true
    };
  });
}

function textLineCount(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").split(/\r?\n/).length;
  } catch {
    return null;
  }
}

function fileImpact(row) {
  const absolutePath = path.join(row.worktreePath, row.path);
  const exists = fs.existsSync(absolutePath);
  const stat = exists ? fs.statSync(absolutePath) : null;
  const base = {
    approvalId: row.approvalId,
    path: row.path,
    selectedAction: row.selectedAction,
    worktreePath: row.worktreePath,
    exists,
    bytes: stat?.size ?? 0,
    lineCount: exists ? textLineCount(absolutePath) : null
  };
  if (row.selectedAction !== "owner-approved-package-restore") return base;
  const diffStat = git(["diff", "--stat", "--", row.path], row.worktreePath);
  const diffPreview = git(["diff", "--", row.path], row.worktreePath)
    .split("\n")
    .slice(0, 80);
  return {
    ...base,
    diffStat,
    diffPreview
  };
}

function resyncImpact(rows) {
  const impacts = rows.map(fileImpact);
  const restoreRows = impacts.filter((row) => row.selectedAction === "owner-approved-package-restore");
  const cleanRows = impacts.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean");
  return {
    restoreRows,
    cleanRows,
    totalCleanFileBytes: cleanRows.reduce((sum, row) => sum + row.bytes, 0),
    cleanFileCount: cleanRows.length,
    restoreFileCount: restoreRows.length,
    note: "Evidence only: this summarizes what the exact Wave01 commands would restore or remove if the owner later approves them."
  };
}

function partialApprovalRecommendation(rows, impact) {
  if (rows.length === 0) {
    return {
      strategy: "no-package-resync-rows-currently-required",
      cleanReadyRows: [],
      heldRows: [],
      ownerDecisionText: "No Wave01 package-resync owner decision is currently required because the current governance readiness packet has 0 package-resync recommendation rows.",
      boundary: "This recommendation is evidence-only and does not authorize git clean, git restore, cleanup, merge, push, deploy, branch deletion, or worktree removal."
    };
  }

  const impactByApprovalId = new Map([
    ...impact.restoreRows,
    ...impact.cleanRows
  ].map((row) => [row.approvalId, row]));
  const cleanReadyRows = rows
    .filter((row) => row.selectedAction === "owner-approved-package-untracked-clean")
    .map((row) => ({
      approvalId: row.approvalId,
      owner: row.owner,
      path: row.path,
      exactCommand: row.exactCommand,
      bytes: impactByApprovalId.get(row.approvalId)?.bytes ?? 0,
      authorizationTextToPaste: row.authorizationTextToPaste,
      recommendation: "can-approve-as-a25-artifact-clean"
    }));
  const heldRows = rows
    .filter((row) => row.selectedAction === "owner-approved-package-restore")
    .map((row) => ({
      approvalId: row.approvalId,
      owner: row.owner,
      path: row.path,
      exactCommand: row.exactCommand,
      diffStat: impactByApprovalId.get(row.approvalId)?.diffStat ?? "",
      recommendation: "hold-for-a10-a22-release-hygiene-decision",
      reason: "The tsconfig change adds release/build artifact excludes and may be useful; do not restore it without A10/A22 review."
    }));
  return {
    strategy: "approve-a25-clean-rows-hold-tsconfig-restore",
    cleanReadyRows,
    heldRows,
    ownerDecisionText: "Approve only the six Wave01 A25 dirty-map artifact clean rows; hold wave01-resync-01-tsconfig-json for A10/A22 release-hygiene review.",
    boundary: "This recommendation is evidence-only and does not authorize git clean, git restore, cleanup, merge, push, deploy, branch deletion, or worktree removal."
  };
}

function commandShape(row) {
  if (row.selectedAction === "owner-approved-package-restore") {
    return row.path === "tsconfig.json" && row.exactCommand === "git restore --source=HEAD -- tsconfig.json";
  }
  if (row.selectedAction === "owner-approved-package-untracked-clean") {
    return row.path?.startsWith("coordination/release-intake/2026-06-30-A25-dirty-tree-map-")
      && /^git clean -f -- coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.exactCommand);
  }
  return false;
}

function buildAcceptanceChecks(rows, artifacts, sourceCurrentnessFailures, impact) {
  const approvalIds = rows.map((row) => row.approvalId);
  const expectedWorktree = "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance";
  const requestRows = artifacts.approvalRequests.requests ?? [];
  const noCurrentPackageResyncRows = rows.length === 0 && requestRows.length === 0;
  const checks = [
    {
      id: "source-currentness-green",
      label: "Source artifacts are current against the dirty map",
      passed: sourceCurrentnessFailures.length === 0,
      evidence: `sourceCurrentnessFailures=${sourceCurrentnessFailures.length}`
    },
    {
      id: "seven-resync-rows",
      label: "Wave01 package-resync rows reflect the current remaining scope",
      passed: rows.length === requestRows.length,
      evidence: `rows=${rows.length} requests=${requestRows.length}`
    },
    {
      id: "all-package-only",
      label: "Every row is package-worktree-only, not a root cleanup instruction",
      passed: noCurrentPackageResyncRows || rows.every((row) => row.packageOnly === true),
      evidence: `packageOnly=${rows.filter((row) => row.packageOnly).length}/${rows.length}`
    },
    {
      id: "non-executable",
      label: "No row is executable or cleanup-authorized",
      passed: rows.every((row) => row.executableNow === false && row.cleanupAuthorized === false),
      evidence: `executable=${rows.filter((row) => row.executableNow).length} cleanup=${rows.filter((row) => row.cleanupAuthorized).length}`
    },
    {
      id: "authorization-input-safe-state",
      label: "Wave01 owner authorization input covers all current rows and remains non-executable",
      passed: count(artifacts.ownerAuthorizationsGate.pendingRows) + count(artifacts.ownerAuthorizationsGate.authorizedRows) === rows.length
        && count(artifacts.ownerAuthorizationsGate.executableRows) === 0
        && count(artifacts.ownerAuthorizationsGate.cleanupAuthorizedRows) === 0,
      evidence: `pending=${count(artifacts.ownerAuthorizationsGate.pendingRows)} authorized=${count(artifacts.ownerAuthorizationsGate.authorizedRows)} executable=${count(artifacts.ownerAuthorizationsGate.executableRows)}`
    },
    {
      id: "approval-ids-match",
      label: "Approval IDs match across request, execution, evidence, template, and starter artifacts",
      passed: [
        artifacts.approvalRequests.requests ?? [],
        artifacts.executionPacket.executionRows ?? [],
        artifacts.evidencePack.rows ?? [],
        artifacts.authorizationTemplate.authorizations ?? [],
        artifacts.authorizationsStarter.authorizations ?? []
      ].every((sourceRows) => JSON.stringify(sourceRows.map((row) => row.approvalId)) === JSON.stringify(approvalIds)),
      evidence: `approvalIds=${approvalIds.length}`
    },
    {
      id: "worktree-evidence-present",
      label: "Every row still has worktree-side evidence present",
      passed: noCurrentPackageResyncRows || rows.every((row) => row.worktreePathExists === true && row.worktreePath === expectedWorktree),
      evidence: `worktreePresent=${rows.filter((row) => row.worktreePathExists).length}/${rows.length}`
    },
    {
      id: "command-shapes-allowlisted",
      label: "Exact commands are limited to the held tsconfig restore and A25 dirty-map artifact cleans",
      passed: noCurrentPackageResyncRows || rows.every(commandShape)
        && rows.filter((row) => row.selectedAction === "owner-approved-package-restore").length <= 1
        && rows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean").length <= 6,
      evidence: `restore=${rows.filter((row) => row.selectedAction === "owner-approved-package-restore").length} clean=${rows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean").length}`
    },
    {
      id: "impact-digest-present",
      label: "Owner review includes concrete restore/clean impact evidence",
      passed: noCurrentPackageResyncRows
        ? impact.restoreRows.length === 0 && impact.cleanRows.length === 0 && impact.totalCleanFileBytes === 0
        : impact.restoreRows.length === 1 &&
        impact.restoreRows[0]?.path === "tsconfig.json" &&
        typeof impact.restoreRows[0]?.diffStat === "string" &&
        impact.restoreRows[0].diffStat.includes("tsconfig.json") &&
        impact.cleanRows.length === rows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean").length &&
        (impact.cleanRows.length === 0 || impact.totalCleanFileBytes > 0),
      evidence: `restore=${impact.restoreRows.length} clean=${impact.cleanRows.length} cleanBytes=${impact.totalCleanFileBytes}`
    },
    {
      id: "required-authorization-texts-present",
      label: "Every row has copyable exact authorization text with approvalId and command",
      passed: rows.every((row) => row.authorizationTextToPaste?.includes(`approvalId=${row.approvalId}`) && row.authorizationTextToPaste?.includes(`command=${row.exactCommand}`)),
      evidence: `texts=${rows.filter((row) => row.authorizationTextToPaste).length}/${rows.length}`
    },
    {
      id: "pre-post-checks-present",
      label: "Every row names pre-execution and post-execution checks",
      passed: rows.every((row) => row.preExecutionChecks.length >= 4 && row.postExecutionChecks.length >= 8),
      evidence: `rowsWithChecks=${rows.filter((row) => row.preExecutionChecks.length >= 4 && row.postExecutionChecks.length >= 8).length}/${rows.length}`
    },
    {
      id: "governance-readiness-still-blocked",
      label: "Wave01 governance remains blocked and therefore must not be auto-merged",
      passed: artifacts.governanceReadiness.commitReady === false
        && (artifacts.governanceReadiness.packageResyncRecommendations ?? []).length === rows.length,
      evidence: `commitReady=${artifacts.governanceReadiness.commitReady} packageResync=${(artifacts.governanceReadiness.packageResyncRecommendations ?? []).length}`
    },
    {
      id: "review-input-files-present",
      label: "All named review input artifacts exist",
      passed: reviewInputs().every((row) => row.exists),
      evidence: `present=${reviewInputs().filter((row) => row.exists).length}/${reviewInputs().length}`
    }
  ];

  return checks.map((check) => ({
    ...check,
    status: check.passed ? "pass" : "fail"
  }));
}

function reviewInputs() {
  return [
    ["dirty-map", WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.dirtyMap, "Current dirty-tree inventory."],
    ["governance-readiness-json", WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.governanceReadiness, "Wave01 readiness and package-only resync recommendation source."],
    ["governance-readiness-md", "coordination/release-intake/latest-A25-wave01-governance-readiness.md", "Human-readable Wave01 readiness packet."],
    ["approval-requests", WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.approvalRequests, "Exact approval request rows."],
    ["execution-packet", WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.executionPacket, "Exact command packet, still non-executable."],
    ["evidence-pack", WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.evidencePack, "Root/worktree evidence digest for each row."],
    ["authorization-template", WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.authorizationTemplate, "Owner authorization text template."],
    ["authorizations-starter", WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.authorizationsStarter, "Blank owner authorization starter."],
    ["authorizations-input", WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.ownerAuthorizations, "Owner input file for Wave01 approvals."]
  ].map(([id, relativePath, description]) => ({
    id,
    path: relativePath,
    exists: exists(relativePath),
    description
  }));
}

function copyableAuthorizationTexts(rows) {
  return rows.map((row) => ({
    order: row.order,
    approvalId: row.approvalId,
    selectedAction: row.selectedAction,
    path: row.path,
    exactCommand: row.exactCommand,
    text: row.authorizationTextToPaste
  }));
}

export function buildWave01PackageResyncOwnerReviewCapsule() {
  const dirtyMap = readJson(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.dirtyMap);
  const governanceReadiness = readJson(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.governanceReadiness);
  const approvalRequests = readJson(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.approvalRequests);
  const executionPacket = readJson(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.executionPacket);
  const evidencePack = readJson(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.evidencePack);
  const authorizationTemplate = readJson(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.authorizationTemplate);
  const authorizationsStarter = readJson(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.authorizationsStarter);
  const ownerAuthorizationsGate = readJson(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.ownerAuthorizationsGate);
  const ownerAuthorizations = readJson(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.ownerAuthorizations);

  const artifacts = {
    governanceReadiness,
    approvalRequests,
    executionPacket,
    evidencePack,
    authorizationTemplate,
    authorizationsStarter,
    ownerAuthorizationsGate,
    ownerAuthorizations
  };
  const sourceCurrentnessFailures = [
    ...ensureCurrent("Wave01 governance readiness", governanceReadiness, dirtyMap),
    ...ensureCurrent("Wave01 approval requests", approvalRequests, dirtyMap),
    ...ensureCurrent("Wave01 execution packet", executionPacket, dirtyMap),
    ...ensureCurrent("Wave01 evidence pack", evidencePack, dirtyMap),
    ...ensureCurrent("Wave01 authorization template", authorizationTemplate, dirtyMap),
    ...ensureCurrent("Wave01 authorizations starter", authorizationsStarter, dirtyMap),
    ...ensureCurrent("Wave01 owner authorizations gate", ownerAuthorizationsGate, dirtyMap),
    ...ensureCurrent("Wave01 owner authorizations input", ownerAuthorizations, dirtyMap)
  ];

  const rows = compactRows(artifacts);
  const impact = resyncImpact(rows);
  const partialRecommendation = partialApprovalRecommendation(rows, impact);
  const acceptanceChecks = buildAcceptanceChecks(rows, artifacts, sourceCurrentnessFailures, impact);
  const failedAcceptanceChecks = acceptanceChecks.filter((row) => !row.passed);
  const allValidationCommands = unique([
    ...rows.flatMap((row) => row.preExecutionChecks),
    ...rows.flatMap((row) => row.postExecutionChecks),
    ...SAFE_POST_INPUT_VALIDATION_COMMANDS
  ]);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      governanceReadinessGeneratedAt: governanceReadiness.generatedAt,
      approvalRequestsGeneratedAt: approvalRequests.generatedAt,
      executionPacketGeneratedAt: executionPacket.generatedAt,
      evidencePackGeneratedAt: evidencePack.generatedAt,
      authorizationTemplateGeneratedAt: authorizationTemplate.generatedAt,
      authorizationsStarterGeneratedAt: authorizationsStarter.generatedAt,
      ownerAuthorizationsGateCheckedAt: ownerAuthorizationsGate.checkedAt,
      ownerAuthorizationsGeneratedAt: ownerAuthorizations.generatedAt
    },
    sourceCurrentnessFailures,
    reviewRound: {
      id: "wave01-package-resync-authorizations",
      label: "Wave 01 package resync authorizations",
      ownerAction: "Review, approve, reject, or defer the seven exact Wave01 package-worktree resync rows.",
      why: "These rows unblock the governance/package baseline without treating dirty root as a deploy source.",
      worktreePath: governanceReadiness.worktree?.path ?? "",
      branch: governanceReadiness.worktree?.branch ?? "",
      commitReady: governanceReadiness.commitReady === true,
      blockingReasons: governanceReadiness.blockingReasons ?? []
    },
    reviewInputs: reviewInputs(),
    approvalRows: rows,
    resyncImpact: impact,
    partialApprovalRecommendation: partialRecommendation,
    acceptanceChecks,
    copyableAuthorizationTexts: copyableAuthorizationTexts(rows),
    validationCommands: allValidationCommands,
    validationHold: OWNER_ACTIVE_WORKTREE_HOLD,
    summary: {
      readyForOwnerDecision: rows.length > 0 && failedAcceptanceChecks.length === 0 && sourceCurrentnessFailures.length === 0,
      rowCount: rows.length,
      pendingRows: rows.filter((row) => !row.authorized).length,
      authorizedRows: rows.filter((row) => row.authorized).length,
      packageOnlyRows: rows.filter((row) => row.packageOnly).length,
      worktreePresentRows: rows.filter((row) => row.worktreePathExists).length,
      rootMissingRows: rows.filter((row) => !row.rootPathExists).length,
      restoreRows: rows.filter((row) => row.selectedAction === "owner-approved-package-restore").length,
      cleanRows: rows.filter((row) => row.selectedAction === "owner-approved-package-untracked-clean").length,
      cleanReadyRows: partialRecommendation.cleanReadyRows.length,
      heldRows: partialRecommendation.heldRows.length,
      totalCleanFileBytes: impact.totalCleanFileBytes,
      copyableAuthorizationTexts: rows.filter((row) => row.authorizationTextToPaste).length,
      acceptanceChecks: acceptanceChecks.length,
      passingAcceptanceChecks: acceptanceChecks.filter((row) => row.passed).length,
      failedAcceptanceChecks: failedAcceptanceChecks.length,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length,
      pendingAuthorizationInputRows: count(ownerAuthorizationsGate.pendingRows),
      cleanupAuthorizedRows: rows.filter((row) => row.cleanupAuthorized).length,
      executableRows: rows.filter((row) => row.executableNow).length
    },
    boundary: {
      evidenceOnly: true,
      createsAuthorizationFile: false,
      recordsOwnerApproval: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false
    }
  };
}

export function stableWave01PackageResyncOwnerReviewCapsuleProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    reviewRound: payload.reviewRound,
    reviewInputs: payload.reviewInputs,
    approvalRows: payload.approvalRows,
    resyncImpact: payload.resyncImpact,
    partialApprovalRecommendation: payload.partialApprovalRecommendation,
    acceptanceChecks: payload.acceptanceChecks,
    copyableAuthorizationTexts: payload.copyableAuthorizationTexts,
    validationCommands: payload.validationCommands,
    validationHold: payload.validationHold,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function markdown(payload) {
  const inputRows = payload.reviewInputs.map((row) => (
    `| ${cell(row.id)} | \`${cell(row.path)}\` | ${row.exists ? "yes" : "no"} | ${cell(row.description)} |`
  )).join("\n");
  const approvalRows = payload.approvalRows.map((row) => (
    `| ${row.order} | \`${cell(row.approvalId)}\` | ${cell(row.owner)} | \`${cell(row.path)}\` | ${cell(row.selectedAction)} | ${row.authorized ? "yes" : "no"} | ${row.executableNow ? "yes" : "no"} |`
  )).join("\n");
  const checkRows = payload.acceptanceChecks.map((row, index) => (
    `| ${index + 1} | \`${cell(row.id)}\` | ${cell(row.status)} | ${cell(row.label)} | ${cell(row.evidence)} |`
  )).join("\n");
  const authTexts = payload.copyableAuthorizationTexts.map((row) => `### ${row.order}. \`${row.approvalId}\`

\`\`\`text
${row.text}
\`\`\`
`).join("\n");
  const commandRows = payload.validationCommands.map((command) => `- \`${command}\``).join("\n");
  const restoreImpactRows = payload.resyncImpact.restoreRows.map((row) => `### Restore Impact: \`${row.path}\`

- Diffstat: \`${cell(row.diffStat || "none")}\`
- Current worktree bytes: ${row.bytes}
- Current worktree line count: ${row.lineCount ?? "n/a"}

\`\`\`diff
${row.diffPreview.join("\n")}
\`\`\`
`).join("\n");
  const cleanImpactRows = payload.resyncImpact.cleanRows.map((row) => (
    `| \`${cell(row.path)}\` | ${row.bytes} | ${row.lineCount ?? "n/a"} | ${row.exists ? "yes" : "no"} |`
  )).join("\n");
  const cleanReadyRows = payload.partialApprovalRecommendation.cleanReadyRows.map((row) => (
    `| \`${cell(row.approvalId)}\` | \`${cell(row.path)}\` | ${row.bytes} | \`${cell(row.exactCommand)}\` |`
  )).join("\n");
  const heldRows = payload.partialApprovalRecommendation.heldRows.map((row) => (
    `| \`${cell(row.approvalId)}\` | \`${cell(row.path)}\` | \`${cell(row.diffStat)}\` | ${cell(row.reason)} |`
  )).join("\n");

  return `# A25 Wave01 Package Resync Owner Review Capsule

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This capsule is evidence-only. It packages the seven Wave01 package-worktree resync requests for owner review, but it does not create authorization files, record approval, authorize merge, authorize cleanup, execute restore, execute clean, stage, commit, discard, tag, push, prune, deploy, remove worktrees, or delete files.

## Summary

- Review round: \`${payload.reviewRound.id}\`
- Ready for owner decision: ${payload.summary.readyForOwnerDecision ? "yes" : "no"}
- Rows: ${payload.summary.rowCount}
- Pending rows: ${payload.summary.pendingRows}
- Authorized rows: ${payload.summary.authorizedRows}
- Package-only rows: ${payload.summary.packageOnlyRows}
- Worktree-present rows: ${payload.summary.worktreePresentRows}
- Restore rows: ${payload.summary.restoreRows}
- Clean rows: ${payload.summary.cleanRows}
- Clean-ready rows: ${payload.summary.cleanReadyRows}
- Held rows: ${payload.summary.heldRows}
- Clean file bytes: ${payload.summary.totalCleanFileBytes}
- Copyable authorization texts: ${payload.summary.copyableAuthorizationTexts}
- Acceptance checks: ${payload.summary.passingAcceptanceChecks}/${payload.summary.acceptanceChecks}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Review Inputs

| ID | Path | Exists | Description |
| --- | --- | --- | --- |
${inputRows}

## Approval Rows

| Order | Approval ID | Owner | Path | Action | Authorized | Executable |
| ---: | --- | --- | --- | --- | --- | --- |
${approvalRows}

## Impact Digest

This section summarizes the exact file impact if the owner later approves the Wave01 commands. It is not an execution instruction.

${restoreImpactRows}

### Clean Impact

| Path | Bytes | Lines | Exists in worktree |
| --- | ---: | ---: | --- |
${cleanImpactRows}

## Partial Approval Recommendation

Strategy: \`${payload.partialApprovalRecommendation.strategy}\`

Owner decision text: ${payload.partialApprovalRecommendation.ownerDecisionText}

Boundary: ${payload.partialApprovalRecommendation.boundary}

### Clean-Ready Rows

| Approval ID | Path | Bytes | Exact command |
| --- | --- | ---: | --- |
${cleanReadyRows}

### Held Rows

| Approval ID | Path | Diffstat | Hold reason |
| --- | --- | --- | --- |
${heldRows}

## Acceptance Checks

| # | Check | Status | Meaning | Evidence |
| ---: | --- | --- | --- | --- |
${checkRows}

## Copyable Authorization Texts

These texts are review templates only. They become active only after the owner records approval in the Wave01 owner-authorization input and the validators accept it.

Target authorization file: \`${WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.ownerAuthorizations}\`

${authTexts}

## Validation Commands

${commandRows}

## Validation Hold

- Status: ${payload.validationHold.status}
- Active worktree: \`${payload.validationHold.activeWorktreePath}\`
- Reason: ${payload.validationHold.reason}
- Resume condition: ${payload.validationHold.resumeCondition}

## Boundary

Every row remains non-executable. A separate owner instruction naming exact approval IDs and exact commands is still required before any restore, clean, merge, cleanup, or physical lifecycle action can run.
`;
}

function main() {
  const payload = buildWave01PackageResyncOwnerReviewCapsule();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.latestJson, json);
  write(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.datedJson, json);
  write(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.latestMarkdown, md);
  write(WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.latestJson,
    latestMarkdown: WAVE01_PACKAGE_RESYNC_OWNER_REVIEW_CAPSULE_PATHS.latestMarkdown,
    rowCount: payload.summary.rowCount,
    readyForOwnerDecision: payload.summary.readyForOwnerDecision,
    pendingRows: payload.summary.pendingRows,
    passingAcceptanceChecks: payload.summary.passingAcceptanceChecks,
    acceptanceChecks: payload.summary.acceptanceChecks,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
