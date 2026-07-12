#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTHORIZATION_GAP_SHRINK_MAP_PATHS,
  buildAuthorizationGapShrinkMap,
  stableAuthorizationGapShrinkMapProjection
} from "./generate-authorization-gap-shrink-map.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  authorizationGapShrinkMap: "coordination/release-intake/latest-A25-authorization-gap-shrink-map.json",
  latestJson: "coordination/release-intake/latest-A25-authorization-round-validation-plan.json",
  latestMarkdown: "coordination/release-intake/latest-A25-authorization-round-validation-plan.md",
  datedJson: `coordination/release-intake/${date}-A25-authorization-round-validation-plan.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-authorization-round-validation-plan.md`
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

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function count(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function compactRound(round) {
  const rows = round.rows ?? [];
  return {
    order: round.order,
    id: round.id,
    label: round.label,
    ownerAction: round.ownerAction,
    why: round.why,
    rowCount: count(round.rowCount, rows.length),
    pendingRows: count(round.pendingRows),
    authorizedRows: count(round.authorizedRows),
    readyForOwnerReview: round.readyForOwnerReview === true,
    approvalIds: round.approvalIds ?? [],
    consumedApprovalIds: round.consumedApprovalIds ?? [],
    owners: round.owners ?? [],
    evidenceReviewedCount: (round.evidenceReviewed ?? []).length,
    postApprovalChecks: round.postApprovalChecks ?? [],
    postApprovalCheckCount: (round.postApprovalChecks ?? []).length,
    exactCommandRows: rows.filter((row) => row.exactCommand).length,
    cleanupAuthorizedRows: count(round.cleanupAuthorizedRows),
    executableRows: count(round.executableRows),
    firstAuthorizationText: round.firstAuthorizationText ?? "",
    rows: rows.map((row) => ({
      approvalId: row.approvalId,
      approvalKind: row.approvalKind,
      owner: row.owner,
      subject: row.subject,
      path: row.path,
      branch: row.branch,
      worktreePath: row.worktreePath,
      selectedAction: row.selectedAction,
      hasExactCommand: Boolean(row.exactCommand),
      evidenceReviewedCount: (row.evidenceReviewed ?? []).length,
      postApprovalCheckCount: (row.postApprovalChecks ?? []).length,
      authorized: row.authorized === true,
      cleanupAuthorized: row.cleanupAuthorized === true,
      executableNow: row.executableNow === true
    }))
  };
}

function validationPhases(shrinkMap) {
  return [
    {
      order: 1,
      id: "record-owner-inputs",
      label: "Record owner inputs",
      status: shrinkMap.summary.ownerInputsReady ? "complete" : "pending-owner-input",
      purpose: "Owner records exact approval rows in the named input files. This phase still does not execute commands.",
      targetInputFiles: shrinkMap.targetInputFiles ?? [],
      requiredInputs: shrinkMap.requiredInputs ?? [],
      commandCount: 0,
      commands: []
    },
    {
      order: 2,
      id: "safe-post-input-validation",
      label: "Safe post-input validation",
      status: "ready-after-owner-input",
      purpose: "Validate the owner input files and rebuild the non-executable authorization preview.",
      commandCount: (shrinkMap.safePostInputValidationCommands ?? []).length,
      commands: shrinkMap.safePostInputValidationCommands ?? []
    },
    {
      order: 3,
      id: "separate-execution-instructions",
      label: "Separate execution instructions",
      status: "blocked-until-valid-authorized-command-manifest",
      purpose: "Only after valid owner authorizations exist, the owner must issue a separate instruction naming exact approval IDs and exact commands.",
      commandCount: 3,
      commands: [
        "node coordination/release-intake/generate-next-owner-authorized-command-manifest.mjs",
        "node coordination/release-intake/assert-next-owner-authorized-command-manifest-current.mjs",
        "node coordination/release-intake/assert-next-owner-execution-instructions-current.mjs"
      ]
    },
    {
      order: 4,
      id: "deferred-aggregate-validation",
      label: "Deferred aggregate validation",
      status: `held:${shrinkMap.validationHold?.status ?? "unknown"}`,
      purpose: "Run only after the owner resolves the active compose-worktree validation hold.",
      validationHold: shrinkMap.validationHold,
      commandCount: (shrinkMap.deferredAggregateValidationCommands ?? []).length,
      commands: shrinkMap.deferredAggregateValidationCommands ?? []
    }
  ];
}

export function buildAuthorizationRoundValidationPlan() {
  const dirtyMap = readJson(AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.dirtyMap);
  const recordedShrinkMap = readJson(AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.authorizationGapShrinkMap);
  const currentShrinkMap = buildAuthorizationGapShrinkMap();
  const sourceCurrentnessFailures = [];

  if (!sameJson(
    stableAuthorizationGapShrinkMapProjection(recordedShrinkMap),
    stableAuthorizationGapShrinkMapProjection(currentShrinkMap)
  )) {
    sourceCurrentnessFailures.push("authorization gap shrink map is stale");
  }
  if ((recordedShrinkMap.sourceCurrentnessFailures ?? []).length > 0) {
    sourceCurrentnessFailures.push("authorization gap shrink map has source currentness failures");
  }
  if (recordedShrinkMap.dirtyMapStatusSignature !== dirtyMap.statusSignature) {
    sourceCurrentnessFailures.push("authorization gap shrink map dirty-map signature is stale");
  }
  if (recordedShrinkMap.expandedStatusEntries !== dirtyMap.statusCounts?.expandedStatusEntries) {
    sourceCurrentnessFailures.push("authorization gap shrink map expanded entry count is stale");
  }

  const rounds = (recordedShrinkMap.rounds ?? []).map(compactRound);
  const validation = validationPhases(recordedShrinkMap);
  const uniquePostApprovalChecks = unique(rounds.flatMap((round) => round.postApprovalChecks));
  const cleanupAuthorizedRows = rounds.reduce((sum, round) => sum + round.cleanupAuthorizedRows, 0);
  const executableRows = rounds.reduce((sum, round) => sum + round.executableRows, 0);
  const roundRows = rounds.reduce((sum, round) => sum + round.rowCount, 0);
  const roundPendingRows = rounds.reduce((sum, round) => sum + round.pendingRows, 0);
  const roundAuthorizedRows = rounds.reduce((sum, round) => sum + round.authorizedRows, 0);
  const exactCommandRows = rounds.reduce((sum, round) => sum + round.exactCommandRows, 0);

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? 0,
    sourceArtifacts: {
      authorizationGapShrinkMapGeneratedAt: recordedShrinkMap.generatedAt,
      authorizationGapShrinkMapPath: AUTHORIZATION_GAP_SHRINK_MAP_PATHS.latestJson
    },
    sourceCurrentnessFailures,
    rounds,
    validationPhases: validation,
    validationHold: recordedShrinkMap.validationHold,
    safePostInputValidationCommands: recordedShrinkMap.safePostInputValidationCommands ?? [],
    deferredAggregateValidationCommands: recordedShrinkMap.deferredAggregateValidationCommands ?? [],
    uniquePostApprovalChecks,
    targetInputFiles: recordedShrinkMap.targetInputFiles ?? [],
    requiredInputs: recordedShrinkMap.requiredInputs ?? [],
    summary: {
      authorizationRounds: rounds.length,
      roundRows,
      roundPendingRows,
      roundAuthorizedRows,
      readyForOwnerReviewRounds: rounds.filter((round) => round.readyForOwnerReview).length,
      readyCandidateApprovalRows: recordedShrinkMap.summary?.readyCandidateApprovalRows ?? 0,
      readyCandidateConsumedApprovalRows: recordedShrinkMap.summary?.readyCandidateConsumedApprovalRows ?? 0,
      safePostInputValidationCommands: (recordedShrinkMap.safePostInputValidationCommands ?? []).length,
      deferredAggregateValidationCommands: (recordedShrinkMap.deferredAggregateValidationCommands ?? []).length,
      validationPhases: validation.length,
      uniquePostApprovalChecks: uniquePostApprovalChecks.length,
      exactCommandRows,
      targetInputFiles: (recordedShrinkMap.targetInputFiles ?? []).length,
      requiredInputs: (recordedShrinkMap.requiredInputs ?? []).length,
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

export function stableAuthorizationRoundValidationPlanProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: payload.sourceArtifacts,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    rounds: payload.rounds,
    validationPhases: payload.validationPhases,
    validationHold: payload.validationHold,
    safePostInputValidationCommands: payload.safePostInputValidationCommands,
    deferredAggregateValidationCommands: payload.deferredAggregateValidationCommands,
    uniquePostApprovalChecks: payload.uniquePostApprovalChecks,
    targetInputFiles: payload.targetInputFiles,
    requiredInputs: payload.requiredInputs,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function bullet(items) {
  const rows = (items ?? []).filter(Boolean);
  return rows.length > 0 ? rows.map((item) => `- \`${item}\``).join("\n") : "- none";
}

function markdown(payload) {
  const roundRows = payload.rounds.map((round) => (
    `| ${round.order} | ${cell(round.label)} | \`${cell(round.id)}\` | ${round.rowCount} | ${round.pendingRows} | ${round.authorizedRows} | ${round.exactCommandRows} | ${round.postApprovalCheckCount} | ${round.readyForOwnerReview ? "yes" : "no"} |`
  )).join("\n");
  const phaseRows = payload.validationPhases.map((phase) => (
    `| ${phase.order} | ${cell(phase.label)} | \`${cell(phase.id)}\` | ${cell(phase.status)} | ${phase.commandCount} |`
  )).join("\n");
  const roundDetails = payload.rounds.map((round) => `### ${round.order}. ${round.label}

- ID: \`${round.id}\`
- Owner action: ${round.ownerAction}
- Rows: ${round.rowCount}; pending: ${round.pendingRows}; authorized: ${round.authorizedRows}
- Exact-command rows: ${round.exactCommandRows}
- Post-approval checks:
${bullet(round.postApprovalChecks)}
- First authorization text:

\`\`\`text
${round.firstAuthorizationText || "(none)"}
\`\`\`
`).join("\n");
  const phaseDetails = payload.validationPhases.map((phase) => `### ${phase.order}. ${phase.label}

- ID: \`${phase.id}\`
- Status: ${phase.status}
- Purpose: ${phase.purpose}
- Commands:
${bullet(phase.commands)}
`).join("\n");

  return `# A25 Authorization Round Validation Plan

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This plan is evidence-only. It describes how to validate owner authorization rounds after owner input is recorded, but it does not create the authorization file, record owner approval, authorize merge, authorize cleanup, run cleanup, stage, commit, discard, tag, push, prune, deploy, remove worktrees, or delete files.

## Summary

- Authorization rounds: ${payload.summary.authorizationRounds}
- Round rows: ${payload.summary.roundRows}
- Round pending rows: ${payload.summary.roundPendingRows}
- Round authorized rows: ${payload.summary.roundAuthorizedRows}
- Ready-for-owner-review rounds: ${payload.summary.readyForOwnerReviewRounds}
- Safe post-input validation commands: ${payload.summary.safePostInputValidationCommands}
- Deferred aggregate validation commands: ${payload.summary.deferredAggregateValidationCommands}
- Validation phases: ${payload.summary.validationPhases}
- Unique post-approval checks: ${payload.summary.uniquePostApprovalChecks}
- Exact-command rows: ${payload.summary.exactCommandRows}
- Target input files: ${payload.summary.targetInputFiles}
- Required inputs: ${payload.summary.requiredInputs}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}
- Source currentness failures: ${payload.summary.sourceCurrentnessFailures}

## Round Validation Matrix

| Order | Round | ID | Rows | Pending | Authorized | Exact-command rows | Post-approval checks | Ready review |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
${roundRows}

${roundDetails}

## Validation Phases

| Order | Phase | ID | Status | Commands |
| ---: | --- | --- | --- | ---: |
${phaseRows}

${phaseDetails}

## Validation Hold

- Status: ${payload.validationHold?.status ?? "unknown"}
- Active worktree: \`${payload.validationHold?.activeWorktreePath ?? ""}\`
- Reason: ${payload.validationHold?.reason ?? ""}
- Resume condition: ${payload.validationHold?.resumeCondition ?? ""}

## Boundary

Every row remains non-executable. Owner approval must be recorded in the named input files and a separate owner instruction must name exact approval IDs and exact commands before any merge, cleanup, or physical lifecycle action can run.
`;
}

function main() {
  const payload = buildAuthorizationRoundValidationPlan();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  write(AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.latestJson, json);
  write(AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.datedJson, json);
  write(AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.latestMarkdown, markdown(payload));
  write(AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.datedMarkdown, markdown(payload));

  console.log(JSON.stringify({
    latestJson: AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.latestJson,
    latestMarkdown: AUTHORIZATION_ROUND_VALIDATION_PLAN_PATHS.latestMarkdown,
    authorizationRounds: payload.summary.authorizationRounds,
    roundRows: payload.summary.roundRows,
    readyForOwnerReviewRounds: payload.summary.readyForOwnerReviewRounds,
    safePostInputValidationCommands: payload.summary.safePostInputValidationCommands,
    deferredAggregateValidationCommands: payload.summary.deferredAggregateValidationCommands,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
