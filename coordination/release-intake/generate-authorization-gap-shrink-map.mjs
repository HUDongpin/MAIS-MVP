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

export const AUTHORIZATION_GAP_SHRINK_MAP_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  nextOwnerAuthorizationsGate: "coordination/release-intake/latest-A25-next-owner-authorizations-current-gate.json",
  nextOwnerAuthorizations: "coordination/release-intake/latest-A25-next-owner-authorizations.json",
  nextOwnerAuthorizationsStarter: "coordination/release-intake/latest-A25-next-owner-authorizations-starter.json",
  ownerClosureInputReadiness: "coordination/release-intake/latest-A25-owner-closure-input-readiness.json",
  ownerInputActionPacket: "coordination/release-intake/latest-A25-owner-input-action-packet.json",
  nextOwnerDecisionFocus: "coordination/release-intake/latest-A25-next-owner-decision-focus-packet.json",
  a16PostExtractionVerification: "coordination/release-intake/latest-A25-a16-post-extraction-verification-report.json",
  latestJson: "coordination/release-intake/latest-A25-authorization-gap-shrink-map.json",
  latestMarkdown: "coordination/release-intake/latest-A25-authorization-gap-shrink-map.md",
  datedJson: `coordination/release-intake/${date}-A25-authorization-gap-shrink-map.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-authorization-gap-shrink-map.md`
};

const ROUND_META = {
  readyCandidateOwnerReview: {
    id: "ready-candidate-owner-review",
    label: "Ready candidate owner review",
    ownerAction: "Review and decide the first ready owner-package candidate before any merge or cleanup.",
    why: "This is the only package currently marked ready, so it is the smallest owner-reviewable merge decision surface."
  },
  wave01PackageResync: {
    id: "wave01-package-resync-authorizations",
    label: "Wave 01 package resync authorizations",
    ownerAction: "Approve, reject, or defer the seven exact Wave 01 package-resync rows.",
    why: "These rows unblock the governance/package baseline before broader owner package closure can advance."
  },
  ownerPackage: {
    id: "remaining-owner-package-final-states",
    label: "Remaining owner-package final states",
    ownerAction: "Select reviewed final states for owner-package rows after package evidence is reviewed.",
    why: "Owner packages are the review and rollback boundary for extracting the dirty-root inventory."
  },
  physicalLifecycle: {
    id: "remaining-physical-lifecycle-final-states",
    label: "Remaining physical-lifecycle final states",
    ownerAction: "Select final states for linked worktrees and root lifecycle rows after package review.",
    why: "Strict lifecycle cannot pass until each dirty or diverged worktree has a reviewed final state."
  },
  generatedArtifactResidual: {
    id: "a22-generated-artifact-residual-cleanup-authorizations",
    label: "A22 generated-artifact residual cleanup authorizations",
    ownerAction: "Review A22 residual generated-artifact evidence before any cleanup apply can be separately authorized.",
    why: "Generated artifacts must be confirmed as disposable before physical cleanup is allowed."
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

function readOptionalJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function count(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
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

function ensureCanonicalAuthorizationsCurrent(artifact, dirtyMap, starter) {
  const failures = ensureCurrent("next owner authorizations canonical input", artifact, dirtyMap);
  if (artifact.sourceStarterGeneratedAt !== starter.generatedAt) {
    failures.push("next owner authorizations canonical input starter source is stale");
  }
  if (artifact.cleanupAuthorized === true) {
    failures.push("next owner authorizations canonical input must not authorize cleanup globally");
  }
  if (artifact.executableNow === true) {
    failures.push("next owner authorizations canonical input must not authorize execution globally");
  }
  return failures;
}

function rowIsAuthorized(row) {
  return Boolean(row.approvedBy || row.approvedAt || row.selectedFinalState || row.cleanupAuthorized === true || row.executableNow === true);
}

function authorizationRowsByApprovalId(canonicalAuthorizations) {
  return new Map((canonicalAuthorizations.authorizations ?? [])
    .filter((row) => row.approvalId)
    .map((row) => [row.approvalId, row]));
}

function compactRows(rows, authorizedByApprovalId) {
  return rows.map((row) => {
    const authorization = authorizedByApprovalId.get(row.approvalId);
    const source = authorization ?? row;
    return ({
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    subject: row.subject,
    path: row.path,
    branch: row.branch,
    worktreePath: row.worktreePath,
    selectedAction: row.selectedAction,
    exactCommand: row.exactCommand,
    approvalFingerprint: row.approvalFingerprint,
    selectedFinalState: source.selectedFinalState ?? "",
    approvedBy: source.approvedBy ?? "",
    approvedAt: source.approvedAt ?? "",
    evidenceReviewed: source.evidenceReviewed ?? row.evidenceReviewed ?? [],
    authorizationText: source.authorizationText ?? row.authorizationText,
    notes: source.notes ?? "",
    postApprovalChecks: source.postApprovalChecks ?? row.postApprovalChecks ?? [],
    authorized: rowIsAuthorized(source),
    cleanupAuthorized: source.cleanupAuthorized === true,
    executableNow: source.executableNow === true
  });
  });
}

function groupRows(rows, approvalKind) {
  return rows.filter((row) => row.approvalKind === approvalKind);
}

function readyCandidateFromFocus(focus) {
  const direct = focus.readyOwnerPackageMergeCandidates?.[0];
  if (direct) return direct;
  return (focus.criticalPath?.priorityOrder ?? [])
    .find((row) => row.id === "ready-owner-package-merge-candidates")
    ?.candidates?.[0] ?? null;
}

function consumedA16OwnerPackageApprovalIds(a16PostExtraction, starterApprovalIds) {
  const verified = a16PostExtraction?.postExtractionVerified === true
    && a16PostExtraction?.lifecycleStatus === "post-extraction-verified";
  const ownerPackageApprovalId = "a16-research-and-learning-science";
  if (verified && !starterApprovalIds.has(ownerPackageApprovalId)) {
    return [ownerPackageApprovalId];
  }
  return [];
}

function buildRound(meta, rows, extra = {}, authorizedByApprovalId = new Map()) {
  const compact = compactRows(rows, authorizedByApprovalId);
  return {
    order: extra.order,
    id: meta.id,
    label: meta.label,
    ownerAction: meta.ownerAction,
    why: meta.why,
    rowCount: compact.length,
    pendingRows: compact.filter((row) => !row.authorized).length,
    authorizedRows: compact.filter((row) => row.authorized).length,
    approvalIds: compact.map((row) => row.approvalId),
    owners: Array.from(new Set(compact.map((row) => row.owner).filter(Boolean))).sort(),
    sampleSubjects: compact.slice(0, 6).map((row) => row.subject ?? row.path ?? row.branch ?? row.approvalId),
    evidenceReviewed: Array.from(new Set(compact.flatMap((row) => row.evidenceReviewed).filter(Boolean))).sort(),
    firstAuthorizationText: compact[0]?.authorizationText ?? "",
    postApprovalChecks: Array.from(new Set(compact.flatMap((row) => row.postApprovalChecks).filter(Boolean))),
    cleanupAuthorizedRows: compact.filter((row) => row.cleanupAuthorized).length,
    executableRows: compact.filter((row) => row.executableNow).length,
    rows: compact,
    ...extra
  };
}

function targetInputFiles(actionPacket) {
  return actionPacket.criticalPath?.targetInputFiles ?? [];
}

function requiredInputs(actionPacket) {
  return (actionPacket.requiredInputs ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    path: row.path,
    present: row.filePresent === true,
    totalRows: count(row.totalRows),
    pendingRows: count(row.pendingRows),
    targetRole: row.targetRole,
    status: row.status
  }));
}

function a16PostExtractionState(report) {
  return {
    reportPath: AUTHORIZATION_GAP_SHRINK_MAP_PATHS.a16PostExtractionVerification,
    reportPresent: Boolean(report),
    verified: report?.postExtractionVerified === true,
    lifecycleStatus: report?.lifecycleStatus ?? "",
    packageStatusRows: count(report?.summary?.packageStatusRows),
    stagedPackageRows: count(report?.summary?.stagedPackageRows),
    latestPackageCommit: {
      hash: report?.latestPackageCommit?.hash ?? "",
      subject: report?.latestPackageCommit?.subject ?? "",
      fileCount: (report?.latestPackageCommit?.files ?? []).length
    }
  };
}

export function buildAuthorizationGapShrinkMap() {
  const dirtyMap = readJson(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.dirtyMap);
  const authorizationsGate = readJson(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.nextOwnerAuthorizationsGate);
  const canonicalAuthorizations = readJson(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.nextOwnerAuthorizations);
  const starter = readJson(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.nextOwnerAuthorizationsStarter);
  const readiness = readJson(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.ownerClosureInputReadiness);
  const actionPacket = readJson(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.ownerInputActionPacket);
  const focus = readJson(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.nextOwnerDecisionFocus);
  const a16PostExtraction = readOptionalJson(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.a16PostExtractionVerification);

  const sourceCurrentnessFailures = [
    ...ensureCurrent("next owner authorizations gate", authorizationsGate, dirtyMap),
    ...ensureCanonicalAuthorizationsCurrent(canonicalAuthorizations, dirtyMap, starter),
    ...ensureCurrent("next owner authorizations starter", starter, dirtyMap),
    ...ensureCurrent("owner closure input readiness", readiness, dirtyMap),
    ...ensureCurrent("owner input action packet", actionPacket, dirtyMap),
    ...ensureCurrent("next owner decision focus packet", focus, dirtyMap)
  ];

  const starterRows = starter.authorizations ?? [];
  const authorizedByApprovalId = authorizationRowsByApprovalId(canonicalAuthorizations);
  const readyCandidate = readyCandidateFromFocus(focus);
  const readyApprovalIds = new Set([
    ...(readyCandidate?.approvalIds ?? []),
    ...(readyCandidate?.physicalLifecycleApprovalIds ?? [])
  ]);
  const readyRows = starterRows.filter((row) => readyApprovalIds.has(row.approvalId));
  const readyCandidateOwnerApprovalIds = readyCandidate?.approvalIds ?? [];
  const starterApprovalIds = new Set(starterRows.map((row) => row.approvalId).filter(Boolean));
  const a16PostExtractionVerified = a16PostExtraction?.postExtractionVerified === true
    && a16PostExtraction?.lifecycleStatus === "post-extraction-verified";
  const consumedReadyApprovalIds = Array.from(new Set([
    ...readyCandidateOwnerApprovalIds
      .filter((approvalId) => approvalId === "a16-research-and-learning-science")
      .filter((approvalId) => !starterApprovalIds.has(approvalId))
      .filter(() => a16PostExtractionVerified),
    ...consumedA16OwnerPackageApprovalIds(a16PostExtraction, starterApprovalIds)
  ])).sort();
  const wave01Rows = groupRows(starterRows, "wave01-package-resync");
  const ownerPackageRows = groupRows(starterRows, "owner-package").filter((row) => !readyApprovalIds.has(row.approvalId));
  const physicalRows = groupRows(starterRows, "physical-lifecycle").filter((row) => !readyApprovalIds.has(row.approvalId));
  const generatedArtifactRows = groupRows(starterRows, "a22-generated-artifact-residual-cleanup");
  const activeReadyCandidateRows = readyRows.length;

  const rounds = [
    buildRound(ROUND_META.readyCandidateOwnerReview, readyRows, {
      order: 1,
      ownerAction: activeReadyCandidateRows > 0
        ? ROUND_META.readyCandidateOwnerReview.ownerAction
        : "The previous ready candidate has been post-extraction verified; proceed to Wave 01 package-resync authorization review.",
      why: activeReadyCandidateRows > 0
        ? ROUND_META.readyCandidateOwnerReview.why
        : "A16 owner-package approval was consumed by the committed package extraction, while the physical lifecycle final-state row remains tracked separately.",
      candidateId: readyCandidate?.candidateId ?? a16PostExtraction?.candidateId ?? "",
      packageId: readyCandidate?.packageId ?? a16PostExtraction?.candidateId?.split(":").at(-1) ?? "",
      requiredReviewInputs: readyCandidate?.decisionChecklist?.requiredReviewInputs ?? [],
      missingReviewInputs: (readyCandidate?.decisionChecklist?.requiredReviewInputs ?? []).filter((row) => row.exists !== true),
      readyForOwnerReview: readyCandidate?.decisionChecklist?.readyForOwnerReview === true,
      consumedApprovalIds: consumedReadyApprovalIds,
      postExtractionState: a16PostExtractionState(a16PostExtraction)
    }, authorizedByApprovalId),
    buildRound(ROUND_META.wave01PackageResync, wave01Rows, { order: 2 }, authorizedByApprovalId),
    buildRound(ROUND_META.ownerPackage, ownerPackageRows, { order: 3 }, authorizedByApprovalId),
    buildRound(ROUND_META.physicalLifecycle, physicalRows, { order: 4 }, authorizedByApprovalId),
    buildRound(ROUND_META.generatedArtifactResidual, generatedArtifactRows, { order: 5 }, authorizedByApprovalId)
  ];

  const roundRows = rounds.reduce((sum, row) => sum + row.rowCount, 0);
  const roundPendingRows = rounds.reduce((sum, row) => sum + row.pendingRows, 0);
  const roundAuthorizedRows = rounds.reduce((sum, row) => sum + row.authorizedRows, 0);
  const cleanupAuthorizedRows = rounds.reduce((sum, row) => sum + row.cleanupAuthorizedRows, 0);
  const executableRows = rounds.reduce((sum, row) => sum + row.executableRows, 0);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      nextOwnerAuthorizationsGateCheckedAt: authorizationsGate.checkedAt,
      nextOwnerAuthorizationsGeneratedAt: canonicalAuthorizations.generatedAt,
      nextOwnerAuthorizationsStarterGeneratedAt: starter.generatedAt,
      ownerClosureInputReadinessGeneratedAt: readiness.generatedAt,
      ownerInputActionPacketGeneratedAt: actionPacket.generatedAt,
      nextOwnerDecisionFocusGeneratedAt: focus.generatedAt
    },
    sourceCurrentnessFailures,
    targetInputFiles: targetInputFiles(actionPacket),
    requiredInputs: requiredInputs(actionPacket),
    readiness: {
      ownerInputsReady: readiness.summary?.ownerInputsReady === true,
      pendingCanonicalAuthorizationRows: count(readiness.summary?.pendingCanonicalAuthorizationRows),
      pendingWave01AuthorizationRows: count(readiness.summary?.pendingWave01AuthorizationRows),
      pendingOwnerBlockerReportRecords: count(readiness.summary?.pendingOwnerBlockerReportRecords),
      commandPreviewRows: count(readiness.summary?.commandPreviewRows)
    },
    rounds,
    validationHold: OWNER_ACTIVE_WORKTREE_HOLD,
    safePostInputValidationCommands: SAFE_POST_INPUT_VALIDATION_COMMANDS,
    deferredAggregateValidationCommands: DEFERRED_AGGREGATE_VALIDATION_COMMANDS,
    summary: {
      ownerInputsReady: readiness.summary?.ownerInputsReady === true,
      authorizationStarterRows: count(starter.summary?.starterRows, starterRows.length),
      canonicalAuthorizationRowsInFile: count(authorizationsGate.authorizationRowsInFile),
      authorizedCanonicalRows: count(authorizationsGate.authorizedRows),
      pendingCanonicalAuthorizationRows: count(authorizationsGate.pendingRows),
      authorizationRounds: rounds.length,
      roundRows,
      roundPendingRows,
      roundAuthorizedRows,
      readyCandidateApprovalRows: readyRows.length,
      readyCandidateConsumedApprovalRows: consumedReadyApprovalIds.length,
      readyCandidateMissingReviewInputs: rounds[0]?.missingReviewInputs?.length ?? 0,
      targetInputFiles: targetInputFiles(actionPacket).length,
      requiredInputs: requiredInputs(actionPacket).length,
      cleanupAuthorizedRows,
      executableRows,
      sourceCurrentnessFailures: sourceCurrentnessFailures.length
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

export function stableAuthorizationGapShrinkMapProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    targetInputFiles: payload.targetInputFiles,
    requiredInputs: payload.requiredInputs,
    readiness: payload.readiness,
    rounds: payload.rounds,
    validationHold: payload.validationHold,
    safePostInputValidationCommands: payload.safePostInputValidationCommands,
    deferredAggregateValidationCommands: payload.deferredAggregateValidationCommands,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function bullet(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- ${item}`).join("\n") : "- none";
}

function markdown(payload) {
  const inputRows = payload.requiredInputs.map((row) => (
    `| ${cell(row.label)} | \`${cell(row.path)}\` | ${row.present ? "yes" : "no"} | ${row.totalRows} | ${row.pendingRows} | ${cell(row.targetRole)} |`
  )).join("\n");
  const roundRows = payload.rounds.map((row) => (
    `| ${row.order} | ${cell(row.label)} | ${row.rowCount} | ${row.pendingRows} | ${row.authorizedRows} | ${row.executableRows} |`
  )).join("\n");
  const roundDetails = payload.rounds.map((row) => `### ${row.order}. ${row.label}

- ID: \`${row.id}\`
- Owner action: ${row.ownerAction}
- Why: ${row.why}
- Approval IDs:
${bullet(row.approvalIds.map((id) => `\`${id}\``))}
- Evidence to review:
${bullet(row.evidenceReviewed.map((item) => `\`${item}\``))}
- First authorization text:

\`\`\`text
${row.firstAuthorizationText || "(none)"}
\`\`\`
- Cleanup authorized rows: ${row.cleanupAuthorizedRows}
- Executable rows: ${row.executableRows}
`).join("\n");
  const commandRows = payload.safePostInputValidationCommands.map((command) => `- \`${command}\``).join("\n");
  const deferredRows = payload.deferredAggregateValidationCommands.map((command) => `- \`${command}\``).join("\n");

  return `# A25 Authorization Gap Shrink Map

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This map is evidence-only. It shrinks the owner authorization gap into review rounds, but it does not create the authorization file, record owner approval, authorize merge, authorize cleanup, make commands executable, stage, commit, discard, tag, push, prune, deploy, remove worktrees, delete files, run cleanup apply, or perform any physical cleanup.

## Summary

- Owner inputs ready: ${payload.summary.ownerInputsReady ? "yes" : "no"}
- Authorization starter rows: ${payload.summary.authorizationStarterRows}
- Canonical authorization rows in file: ${payload.summary.canonicalAuthorizationRowsInFile}
- Authorized canonical rows: ${payload.summary.authorizedCanonicalRows}
- Pending canonical authorization rows: ${payload.summary.pendingCanonicalAuthorizationRows}
- Authorization rounds: ${payload.summary.authorizationRounds}
- Round rows: ${payload.summary.roundRows}
- Round pending rows: ${payload.summary.roundPendingRows}
- Round authorized rows: ${payload.summary.roundAuthorizedRows}
- Ready candidate approval rows: ${payload.summary.readyCandidateApprovalRows}
- Ready candidate consumed approval rows: ${payload.summary.readyCandidateConsumedApprovalRows}
- Ready candidate missing review inputs: ${payload.summary.readyCandidateMissingReviewInputs}
- Target input files: ${payload.summary.targetInputFiles}
- Required inputs: ${payload.summary.requiredInputs}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## First Reviewable Candidate

- Candidate ID: \`${payload.rounds[0]?.candidateId ?? ""}\`
- Package ID: \`${payload.rounds[0]?.packageId ?? ""}\`
- Ready for owner review: ${payload.rounds[0]?.readyForOwnerReview ? "yes" : "no"}
- Missing review inputs: ${payload.rounds[0]?.missingReviewInputs?.length ?? 0}
- Consumed approval IDs:
${bullet((payload.rounds[0]?.consumedApprovalIds ?? []).map((id) => `\`${id}\``))}
- Post-extraction verified: ${payload.rounds[0]?.postExtractionState?.verified ? "yes" : "no"}
- Post-extraction commit: \`${payload.rounds[0]?.postExtractionState?.latestPackageCommit?.hash ?? ""}\`

## Required Inputs

| Input | Target/source file | Present | Total rows | Pending rows | Role |
| --- | --- | --- | ---: | ---: | --- |
${inputRows}

## Round Plan

| Order | Round | Rows | Pending | Authorized | Executable |
| ---: | --- | ---: | ---: | ---: | ---: |
${roundRows}

${roundDetails}

## Post-Input Validation Commands

${commandRows}

## Deferred Aggregate Validation Commands

Status: ${payload.validationHold.status}

Active owner worktree: \`${payload.validationHold.activeWorktreePath}\`

Reason: ${payload.validationHold.reason}

Resume condition: ${payload.validationHold.resumeCondition}

${deferredRows}

## Boundary

Every row remains non-executable. Owner approval must be recorded in the named input files and a separate owner instruction must name exact approval IDs and exact commands before any merge, cleanup, or physical lifecycle action can run.
`;
}

function main() {
  const payload = buildAuthorizationGapShrinkMap();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.latestJson, json);
  write(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.datedJson, json);
  write(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.latestMarkdown, md);
  write(AUTHORIZATION_GAP_SHRINK_MAP_PATHS.datedMarkdown, md);

  console.log(JSON.stringify({
    latestJson: AUTHORIZATION_GAP_SHRINK_MAP_PATHS.latestJson,
    latestMarkdown: AUTHORIZATION_GAP_SHRINK_MAP_PATHS.latestMarkdown,
    authorizationRounds: payload.summary.authorizationRounds,
    roundRows: payload.summary.roundRows,
    pendingCanonicalAuthorizationRows: payload.summary.pendingCanonicalAuthorizationRows,
    readyCandidateApprovalRows: payload.summary.readyCandidateApprovalRows,
    readyCandidateConsumedApprovalRows: payload.summary.readyCandidateConsumedApprovalRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
