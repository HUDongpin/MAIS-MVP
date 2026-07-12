#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  validationQueue: "coordination/release-intake/latest-A22-clean-source-validation-queue.json",
  ownerActionPacket: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-packet.json",
  ownerActionAcceptanceDocket: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-owner-action-acceptance-docket.json",
  ownerInput: "coordination/release-intake/latest-A22-top-clean-candidate-root-parity-extraction-instruction-owner-input.json",
  latestJson: "coordination/release-intake/latest-A22-root-parity-selected-action-canonical-preview.json",
  latestMarkdown: "coordination/release-intake/latest-A22-root-parity-selected-action-canonical-preview.md",
  datedJson: `coordination/release-intake/${date}-A22-root-parity-selected-action-canonical-preview.json`,
  datedMarkdown: `coordination/release-intake/${date}-A22-root-parity-selected-action-canonical-preview.md`
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

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content);
}

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function dirtyMapEntryCount(dirtyMap) {
  return dirtyMap.statusCounts?.expandedStatusEntries ?? (dirtyMap.entries ?? []).length;
}

function dirtyMapSignature(payload) {
  return payload.statusSignature ??
    payload.dirtyMapStatusSignature ??
    payload.baseline?.dirtyMapStatusSignature ??
    payload.dirtyMap?.statusSignature ??
    null;
}

function expandedEntries(payload) {
  return payload.expandedStatusEntries ??
    payload.statusCounts?.expandedStatusEntries ??
    payload.baseline?.expandedStatusEntries ??
    payload.dirtyMapExpandedEntries ??
    payload.summary?.dirtyMapExpandedEntries ??
    payload.dirtyMap?.expandedStatusEntries ??
    null;
}

function artifactStamp(key, relativePath, payload) {
  return {
    key,
    path: relativePath,
    generatedAt: payload.generatedAt ?? payload.checkedAt ?? null,
    dirtyMapStatusSignature: dirtyMapSignature(payload),
    expandedStatusEntries: expandedEntries(payload)
  };
}

function sourceArtifacts(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([key, payload]) => [
    key,
    artifactStamp(key, A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS[key], payload)
  ]));
}

function sourceCurrentnessFailures({ dirtyMap, artifacts }) {
  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMapEntryCount(dirtyMap);
  return Object.entries(artifacts)
    .filter(([key]) => key !== "dirtyMap" && key !== "ownerInput")
    .map(([key, payload]) => artifactStamp(key, A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS[key], payload))
    .filter((stamp) => stamp.dirtyMapStatusSignature || stamp.expandedStatusEntries !== null)
    .filter((stamp) => {
      const signatureOk = !stamp.dirtyMapStatusSignature || stamp.dirtyMapStatusSignature === expectedSignature;
      const entriesOk = stamp.expandedStatusEntries === null || stamp.expandedStatusEntries === expectedEntries;
      return !signatureOk || !entriesOk;
    })
    .map((stamp) => `${stamp.key} is stale relative to latest dirty map`);
}

function ownerInputBlank(ownerInput) {
  return !String(ownerInput.ownerExecutionText ?? "").trim() &&
    !String(ownerInput.approvedBy ?? "").trim() &&
    !String(ownerInput.approvedAt ?? "").trim() &&
    !String(ownerInput.notes ?? "").trim() &&
    (ownerInput.selectedActions ?? []).every((row) => !String(row.selectedAction ?? "").trim());
}

function ownerActionRowsByUnit(ownerActionPacket) {
  return new Map((ownerActionPacket.ownerActionRows ?? []).map((row) => [row.unitId, row]));
}

function buildPreviewRows({ ownerActionPacket, ownerActionAcceptanceDocket }) {
  const actionRows = ownerActionRowsByUnit(ownerActionPacket);
  return (ownerActionAcceptanceDocket.acceptanceRows ?? []).map((row, index) => {
    const actionRow = actionRows.get(row.unitId) ?? {};
    const selectedAction = row.recommendedSelectedAction ?? actionRow.recommendedSelectedAction ?? "";
    return {
      approvalId: row.unitId,
      order: index + 1,
      unitId: row.unitId,
      primaryOwnerIds: row.primaryOwnerIds ?? actionRow.primaryOwnerIds ?? [],
      coordinationOwnerIds: row.coordinationOwnerIds ?? actionRow.coordinationOwnerIds ?? [],
      allowedActions: row.allowedActions ?? actionRow.allowedActions ?? [],
      selectedAction,
      actionMode: actionRow.actionMode ?? "",
      rootSource: row.rootSource ?? actionRow.rootSource?.path ?? "",
      rootSourceSha256: row.rootSourceSha256 ?? actionRow.rootSource?.sha256 ?? "",
      candidateTarget: row.candidateTarget ?? actionRow.candidateTargetPath ?? "",
      targetWorktree: actionRow.topCandidate?.path ?? ownerActionPacket.topCandidate?.path ?? "",
      exactOwnerExecutionText: actionRow.copyableOwnerExecutionText ?? "",
      acceptedByOwnerInput: row.acceptedByOwnerInput === true,
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      stageAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    };
  });
}

function selectedActionMap(rows) {
  return Object.fromEntries(rows.map((row) => [row.unitId, row.selectedAction]));
}

function copyableOwnerReplyText({ rows, topCandidate }) {
  const approvalIds = rows.map((row) => row.approvalId).join(",");
  const selectedActions = rows.map((row) => `${row.unitId}:${row.selectedAction}`).join(",");
  return [
    `Authorize current 4 A22 root-parity selectedAction canonical preview: approvalIds=${approvalIds};`,
    `selectedActions=${selectedActions};`,
    `topCandidate=${topCandidate.branch ?? ""};`,
    `targetWorktree=${topCandidate.path ?? ""};`,
    "use exactOwnerExecutionTextLines from latest-A22-root-parity-selected-action-canonical-preview.json;",
    "No cleanup; No deploy; No merge; No broad staging; No destructive git; No physical lifecycle cleanup."
  ].join(" ");
}

function copyableOwnerReplyTextZh({ rows, topCandidate }) {
  const approvalIds = rows.map((row) => row.approvalId).join(",");
  const selectedActions = rows.map((row) => `${row.unitId}:${row.selectedAction}`).join(",");
  return [
    `我授权当前 4 条 A22 root-parity selectedAction canonical preview：approvalIds=${approvalIds}；`,
    `selectedActions=${selectedActions}；`,
    `topCandidate=${topCandidate.branch ?? ""}；`,
    `targetWorktree=${topCandidate.path ?? ""}；`,
    "使用 latest-A22-root-parity-selected-action-canonical-preview.json 里的 exactOwnerExecutionTextLines；",
    "不授权 cleanup；不授权 deploy；不授权 merge；不授权 broad staging；不授权 destructive git；不授权 physical lifecycle cleanup。"
  ].join("");
}

function buildChecks({ sourceFailures, validationQueue, ownerActionPacket, ownerActionAcceptanceDocket, ownerInput, rows }) {
  const safeRows = rows.every((row) =>
    row.cleanupAuthorized === false &&
    row.executableNow === false &&
    row.deployAuthorized === false &&
    row.mergeAuthorized === false &&
    row.stageAuthorized === false &&
    row.destructiveGitAuthorized === false &&
    row.physicalLifecycleCleanupAuthorized === false
  );
  const exactTextRows = rows.every((row) =>
    row.exactOwnerExecutionText.includes(`unitId=${row.unitId}`) &&
    row.exactOwnerExecutionText.includes(`selectedAction=${row.selectedAction}`) &&
    row.exactOwnerExecutionText.includes(`rootSource=${row.rootSource}`) &&
    row.exactOwnerExecutionText.includes(`candidateTarget=${row.candidateTarget}`) &&
    row.exactOwnerExecutionText.includes("No cleanup") &&
    row.exactOwnerExecutionText.includes("No deploy") &&
    row.exactOwnerExecutionText.includes("No merge")
  );
  const selectedActionsAllowed = rows.every((row) => (row.allowedActions ?? []).includes(row.selectedAction));
  const topQueueWaiting = validationQueue.queueStatus === "waiting-top-candidate-root-parity-owner-input" &&
    validationQueue.summary?.topCandidateQueueActionStatus === "needs-root-parity-owner-input-before-rerun";
  const topQueueWaitingCandidateMutation = validationQueue.queueStatus === "waiting-top-candidate-candidate-mutation-owner-input" &&
    validationQueue.summary?.topCandidateQueueActionStatus === "needs-candidate-mutation-owner-input-before-rerun";
  const topQueueWaitingTypecheckRemediation = [
    "waiting-top-candidate-typecheck-build-remediation",
    "fallback-candidate-green-await-clean-source-selection-review"
  ].includes(validationQueue.queueStatus) &&
    validationQueue.summary?.topCandidateQueueActionStatus === "needs-typecheck-remediation-and-fresh-build-observation";
  const ownerPacketWaiting = ownerActionPacket.focusStatus === "waiting-for-owner-action" &&
    count(ownerActionPacket.summary?.focusRows) === 4 &&
    count(ownerActionPacket.summary?.recommendedActionRows) === 4;
  const ownerPacketAccepted = ownerActionPacket.focusStatus === "ready-for-guarded-extraction" &&
    count(ownerActionPacket.summary?.focusRows) === 4;
  const ownerPacketPostExtractionVerified = ownerActionPacket.focusStatus === "post-extraction-verified" &&
    count(ownerActionPacket.summary?.focusRows) === 4;
  const acceptanceWaiting = ownerActionAcceptanceDocket.acceptanceStatus === "waiting-for-owner-action" &&
    count(ownerActionAcceptanceDocket.summary?.acceptanceRows) === 4 &&
    count(ownerActionAcceptanceDocket.summary?.acceptedRows) === 0;
  const acceptanceAccepted = ownerActionAcceptanceDocket.acceptanceStatus === "ready-for-guarded-extraction" &&
    count(ownerActionAcceptanceDocket.summary?.acceptanceRows) === 4 &&
    count(ownerActionAcceptanceDocket.summary?.acceptedRows) === 4;
  const acceptancePostExtractionVerified = ownerActionAcceptanceDocket.acceptanceStatus === "post-extraction-verified" &&
    count(ownerActionAcceptanceDocket.summary?.acceptanceRows) === 4 &&
    count(ownerActionAcceptanceDocket.summary?.acceptedRows) === 4;
  const selectedActionInputAccepted = rows.length === 4 &&
    rows.every((row) => row.acceptedByOwnerInput === true) &&
    !ownerInputBlank(ownerInput);

  return [
    {
      id: "source-current",
      status: sourceFailures.length === 0 ? "pass" : "fail",
      detail: `sourceCurrentnessFailures=${sourceFailures.length}`
    },
    {
      id: "top-validation-queue-waits-owner-input",
      status: topQueueWaiting || topQueueWaitingCandidateMutation || topQueueWaitingTypecheckRemediation ? "pass" : "fail",
      detail: `queueStatus=${validationQueue.queueStatus ?? "unknown"}; topAction=${validationQueue.summary?.topCandidateQueueActionStatus ?? "unknown"}`
    },
    {
      id: "owner-action-packet-waiting",
      status: ownerPacketWaiting || ownerPacketAccepted || ownerPacketPostExtractionVerified ? "pass" : "fail",
      detail: `focusStatus=${ownerActionPacket.focusStatus ?? "unknown"}; focusRows=${ownerActionPacket.summary?.focusRows ?? 0}`
    },
    {
      id: "acceptance-docket-waiting",
      status: acceptanceWaiting || acceptanceAccepted || acceptancePostExtractionVerified ? "pass" : "fail",
      detail: `acceptanceStatus=${ownerActionAcceptanceDocket.acceptanceStatus ?? "unknown"}; acceptedRows=${ownerActionAcceptanceDocket.summary?.acceptedRows ?? 0}`
    },
    {
      id: "owner-input-still-blank",
      status: ownerInputBlank(ownerInput) || selectedActionInputAccepted ? "pass" : "fail",
      detail: selectedActionInputAccepted ? "owner input already records the approved selectedAction rows" : "owner input file must remain blank before explicit owner approval"
    },
    {
      id: "preview-rows-complete",
      status: rows.length === 4 && selectedActionsAllowed && exactTextRows ? "pass" : "fail",
      detail: `rows=${rows.length}; selectedActionsAllowed=${selectedActionsAllowed}; exactTextRows=${exactTextRows}`
    },
    {
      id: "preview-non-executable",
      status: safeRows ? "pass" : "fail",
      detail: "preview rows must not authorize cleanup, execution, merge, deploy, destructive git, or physical lifecycle cleanup"
    }
  ];
}

export function stableA22RootParitySelectedActionCanonicalPreviewProjection(payload) {
  return {
    previewKind: payload.previewKind,
    previewStatus: payload.previewStatus,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    topCandidate: payload.topCandidate,
    summary: payload.summary,
    batchAuthorizationRequest: payload.batchAuthorizationRequest,
    previewRows: payload.previewRows,
    sourceCurrentnessFailures: payload.sourceCurrentnessFailures,
    checks: payload.checks,
    boundary: payload.boundary
  };
}

export function buildA22RootParitySelectedActionCanonicalPreview() {
  const artifacts = {
    dirtyMap: readJson(A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.dirtyMap),
    validationQueue: readJson(A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.validationQueue),
    ownerActionPacket: readJson(A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.ownerActionPacket),
    ownerActionAcceptanceDocket: readJson(A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.ownerActionAcceptanceDocket),
    ownerInput: readJson(A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.ownerInput)
  };
  const sourceFailures = sourceCurrentnessFailures({ dirtyMap: artifacts.dirtyMap, artifacts });
  const rows = buildPreviewRows(artifacts);
  const topCandidate = artifacts.validationQueue.topCandidate ?? artifacts.ownerActionPacket.topCandidate ?? {};
  const checks = buildChecks({
    sourceFailures,
    validationQueue: artifacts.validationQueue,
    ownerActionPacket: artifacts.ownerActionPacket,
    ownerActionAcceptanceDocket: artifacts.ownerActionAcceptanceDocket,
    ownerInput: artifacts.ownerInput,
    rows
  });
  const failedChecks = checks.filter((row) => row.status === "fail").length;
  const exactOwnerExecutionTextLines = rows.map((row) => row.exactOwnerExecutionText);
  const acceptedRows = rows.filter((row) => row.acceptedByOwnerInput === true).length;
  const pendingRows = rows.length - acceptedRows;
  const topCandidateQueueActionStatus = artifacts.validationQueue.summary?.topCandidateQueueActionStatus ?? "";
  const previewStatus = failedChecks === 0
    ? acceptedRows === rows.length && rows.length === 4
      ? topCandidateQueueActionStatus === "needs-typecheck-remediation-and-fresh-build-observation"
        ? "owner-approved-post-extraction-verified-check-remediation"
        : "owner-approved-waiting-candidate-mutation"
      : "ready-for-owner-review"
    : "not-ready-check-failures";

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    previewKind: "a22-root-parity-selected-action-canonical-preview",
    previewStatus,
    dirtyMapStatusSignature: artifacts.dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMapEntryCount(artifacts.dirtyMap),
    sourceArtifacts: sourceArtifacts(artifacts),
    sourceCurrentnessFailures: sourceFailures,
    topCandidate: {
      branch: topCandidate.branch ?? "",
      path: topCandidate.path ?? "",
      head: topCandidate.head ?? "",
      gateCoverageStatus: artifacts.validationQueue.summary?.topCandidateGateStatus ?? "",
      queueActionStatus: topCandidateQueueActionStatus,
      releaseSourceSelected: false,
      promotionEligibleNow: false
    },
    summary: {
      previewRows: rows.length,
      pendingRows,
      acceptedRows,
      ownerInputBlank: ownerInputBlank(artifacts.ownerInput),
      ownerActionRowsRequired: count(artifacts.validationQueue.summary?.ownerActionRowsRequired),
      ownerActionRowsAccepted: count(artifacts.validationQueue.summary?.ownerActionRowsAccepted),
      topCandidateQueueActionStatus,
      typeCheckPassed: artifacts.validationQueue.summary?.typeCheckPassed === true,
      typeCheckErrorLines: count(artifacts.validationQueue.summary?.typeCheckErrorLines),
      buildPassed: artifacts.validationQueue.summary?.buildPassed === true,
      buildFailureCategory: artifacts.validationQueue.summary?.buildFailureCategory ?? "",
      buildBlockersRouted: artifacts.validationQueue.summary?.buildBlockersRouted === true,
      releaseSourceSelected: false,
      promotionEligibleNow: false,
      cleanupAuthorizedRows: 0,
      executableRows: 0,
      sourceCurrentnessFailures: sourceFailures.length,
      failedChecks
    },
    batchAuthorizationRequest: {
      requestKind: "a22-root-parity-selected-action-owner-approval",
      approvalIds: rows.map((row) => row.approvalId),
      selectedActions: selectedActionMap(rows),
      topCandidateBranch: topCandidate.branch ?? "",
      targetWorktree: topCandidate.path ?? "",
      exactOwnerExecutionTextLines,
      copyableOwnerReplyText: copyableOwnerReplyText({ rows, topCandidate }),
      copyableOwnerReplyTextZh: copyableOwnerReplyTextZh({ rows, topCandidate }),
      cleanupAuthorized: false,
      executableNow: false,
      deployAuthorized: false,
      mergeAuthorized: false,
      stageAuthorized: false,
      destructiveGitAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    },
    previewRows: rows,
    checks,
    boundary: {
      evidenceOnly: true,
      previewOnly: true,
      recordsOwnerInput: false,
      recordsOwnerApproval: false,
      recordsExtractionInstruction: false,
      modifiesCandidate: false,
      copiesRootFiles: false,
      runsTypeCheck: false,
      runsBuild: false,
      runsRegression: false,
      selectsReleaseSource: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      physicalLifecycleCleanupAuthorized: false
    }
  };
}

function markdown(payload) {
  const rows = payload.previewRows.map((row) =>
    `| ${row.order} | \`${row.approvalId}\` | ${row.primaryOwnerIds.join(",")} | \`${row.selectedAction}\` | \`${row.rootSource}\` | \`${row.candidateTarget}\` |`
  ).join("\n");
  const checks = payload.checks.map((row) => `| \`${row.id}\` | ${row.status} | ${row.detail} |`).join("\n");
  const exactLines = payload.batchAuthorizationRequest.exactOwnerExecutionTextLines
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");

  return `# A22 Root-Parity SelectedAction Canonical Preview

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This preview is evidence-only. It prepares the 4 A22 root-parity selectedAction rows for owner review. It does not record owner input, record extraction instructions, copy root files, mutate the candidate worktree, select a release source, run type-check/build/regression, stage, commit, merge, deploy, clean, delete, reset, prune, or authorize physical lifecycle cleanup.

## Summary

- Preview status: \`${payload.previewStatus}\`
- Top candidate: \`${payload.topCandidate.branch}\`
- Target worktree: \`${payload.topCandidate.path}\`
- Top candidate queue action: \`${payload.summary.topCandidateQueueActionStatus}\`
- Preview rows: ${payload.summary.previewRows}
- Accepted rows: ${payload.summary.acceptedRows}
- Pending rows: ${payload.summary.pendingRows}
- Owner input blank: ${payload.summary.ownerInputBlank ? "yes" : "no"}
- Type-check passed: ${payload.summary.typeCheckPassed ? "yes" : "no"}
- Type-check error lines: ${payload.summary.typeCheckErrorLines}
- Build passed: ${payload.summary.buildPassed ? "yes" : "no"}
- Build failure category: \`${payload.summary.buildFailureCategory}\`
- Build blockers routed: ${payload.summary.buildBlockersRouted ? "yes" : "no"}
- Release source selected: no
- Cleanup-authorized rows: 0
- Executable rows: 0

## Copyable Owner Reply

${payload.batchAuthorizationRequest.copyableOwnerReplyTextZh}

## Preview Rows

| Order | Approval ID | Primary owners | Selected action | Root source | Candidate target |
| ---: | --- | --- | --- | --- | --- |
${rows}

## Exact Owner Execution Text Lines

${exactLines}

## Checks

| Check | Status | Detail |
| --- | --- | --- |
${checks}

## Boundary

- Evidence only: true
- Preview only: true
- Records owner input: false
- Records extraction instruction: false
- Modifies candidate: false
- Copies root files: false
- Runs type-check: false
- Runs build: false
- Runs regression: false
- Selects release source: false
- Stage authorized: false
- Commit authorized: false
- Merge authorized: false
- Cleanup authorized: false
- Executable now: false
- Deploy authorized: false
- Destructive Git authorized: false
- Physical lifecycle cleanup authorized: false
`;
}

export function writeA22RootParitySelectedActionCanonicalPreview() {
  const payload = buildA22RootParitySelectedActionCanonicalPreview();
  write(A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.latestJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.latestMarkdown, markdown(payload));
  write(A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.datedJson, `${JSON.stringify(payload, null, 2)}\n`);
  write(A22_ROOT_PARITY_SELECTED_ACTION_CANONICAL_PREVIEW_PATHS.datedMarkdown, markdown(payload));
  return payload;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const payload = writeA22RootParitySelectedActionCanonicalPreview();
  console.log("A22 root-parity selectedAction canonical preview generated");
  console.log(`Preview status: ${payload.previewStatus}`);
  console.log(`Top candidate: ${payload.topCandidate.branch}`);
  console.log(`Preview rows: ${payload.summary.previewRows}`);
  console.log(`Pending rows: ${payload.summary.pendingRows}`);
}
