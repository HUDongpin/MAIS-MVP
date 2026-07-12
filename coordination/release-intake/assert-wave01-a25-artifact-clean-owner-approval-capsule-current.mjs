#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS,
  buildWave01A25ArtifactCleanOwnerApprovalCapsule,
  stableWave01A25ArtifactCleanOwnerApprovalCapsuleProjection
} from "./generate-wave01-a25-artifact-clean-owner-approval-capsule.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-wave01-a25-artifact-clean-owner-approval-capsule-current-gate.json");
const json = process.argv.includes("--json");

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

function commandAllowed(row) {
  return row.path?.startsWith("coordination/release-intake/2026-06-30-A25-dirty-tree-map-")
    && /^git clean -f -- coordination\/release-intake\/2026-06-30-A25-dirty-tree-map-20260630T\d{6}Z\.(json|md)$/.test(row.exactCommand ?? "");
}

function main() {
  const failures = [];
  for (const requiredPath of [
    WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.latestJson,
    WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.latestJson);
  const current = buildWave01A25ArtifactCleanOwnerApprovalCapsule();
  if (!sameJson(
    stableWave01A25ArtifactCleanOwnerApprovalCapsuleProjection(recorded),
    stableWave01A25ArtifactCleanOwnerApprovalCapsuleProjection(current)
  )) {
    failures.push("A25 Wave01 A25 artifact clean owner approval capsule is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const scope = recorded.approvalScope ?? {};
  const cleanRows = recorded.cleanApprovalRows ?? [];
  const heldRows = recorded.heldRows ?? [];
  const checks = recorded.acceptanceChecks ?? [];
  const texts = recorded.copyableCleanAuthorizationTexts ?? [];
  const totalCleanFileBytes = cleanRows.reduce((sum, row) => sum + (row.bytes ?? 0), 0);
  const noCurrentArtifactCleanScope = cleanRows.length === 0 && heldRows.length === 0;

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.createsAuthorizationFile !== false) failures.push("boundary.createsAuthorizationFile must be false");
  if (boundary.cleanAuthorized !== false) failures.push("boundary.cleanAuthorized must be false");
  if (boundary.restoreAuthorized !== false) failures.push("boundary.restoreAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.heldTsconfigRestore !== !noCurrentArtifactCleanScope) {
    failures.push(`boundary.heldTsconfigRestore must be ${!noCurrentArtifactCleanScope}`);
  }

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (summary.readyForOwnerDecision !== !noCurrentArtifactCleanScope) {
    failures.push(`summary.readyForOwnerDecision must be ${!noCurrentArtifactCleanScope}`);
  }
  if ((summary.cleanApprovalRows ?? 0) !== cleanRows.length) failures.push("summary.cleanApprovalRows must match clean rows length");
  if ((summary.heldRows ?? 0) !== (noCurrentArtifactCleanScope ? 0 : 1)) {
    failures.push(`summary.heldRows must be ${noCurrentArtifactCleanScope ? 0 : 1}`);
  }
  if ((summary.totalCleanFileBytes ?? 0) !== totalCleanFileBytes) failures.push("summary.totalCleanFileBytes must equal clean row byte sum");
  if (cleanRows.length > 0 && (summary.totalCleanFileBytes ?? 0) <= 0) failures.push("summary.totalCleanFileBytes must be positive when clean rows remain");
  if (cleanRows.length === 0 && (summary.totalCleanFileBytes ?? 0) !== 0) failures.push("summary.totalCleanFileBytes must be 0 when no clean rows remain");
  if ((summary.copyableCleanAuthorizationTexts ?? 0) !== texts.length) failures.push("summary.copyableCleanAuthorizationTexts must match text row count");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("summary.cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("summary.executableRows must be 0");
  if ((summary.failedAcceptanceChecks ?? 0) !== 0) failures.push("summary.failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all acceptance checks must pass");

  if (scope.id !== "wave01-a25-artifact-clean-only") failures.push("approval scope id mismatch");
  if (scope.owner !== "A25 git hygiene and release intake") failures.push("approval scope owner must be A25");
  if (![
    "approve-a25-artifact-clean-rows-hold-tsconfig",
    "post-clean-verified-hold-tsconfig",
    "no-a25-artifact-clean-rows-currently-required"
  ].includes(scope.strategy)) failures.push("approval scope strategy mismatch");
  if (scope.worktreePath !== "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance") {
    failures.push("approval scope worktree must be A25-dirty-closure-governance");
  }
  if (scope.targetAuthorizationFile !== "coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json") {
    failures.push("target authorization file must remain the Wave01 owner authorization input");
  }

  if (noCurrentArtifactCleanScope && scope.strategy !== "no-a25-artifact-clean-rows-currently-required") {
    failures.push("closed artifact-clean scope must use the no-current-rows strategy");
  }
  if (!noCurrentArtifactCleanScope && (scope.strategy === "post-clean-verified-hold-tsconfig") !== (cleanRows.length === 0)) {
    failures.push("post-clean strategy must match zero remaining clean rows");
  }
  if (heldRows.length !== (noCurrentArtifactCleanScope ? 0 : 1)) {
    failures.push(`heldRows length must be ${noCurrentArtifactCleanScope ? 0 : 1}`);
  }
  if (!noCurrentArtifactCleanScope && heldRows[0]?.approvalId !== "wave01-resync-01-tsconfig-json") failures.push("held row must be wave01-resync-01-tsconfig-json");
  if (!noCurrentArtifactCleanScope && heldRows[0]?.exactCommand !== "git restore --source=HEAD -- tsconfig.json") failures.push("held tsconfig command mismatch");
  if (!noCurrentArtifactCleanScope && ((scope.heldApprovalIds ?? []).length !== 1 || scope.heldApprovalIds?.[0] !== "wave01-resync-01-tsconfig-json")) {
    failures.push("scope heldApprovalIds must contain only wave01-resync-01-tsconfig-json");
  }
  if (noCurrentArtifactCleanScope && (scope.heldApprovalIds ?? []).length !== 0) failures.push("closed artifact-clean scope must have 0 heldApprovalIds");
  if ((scope.cleanApprovalIds ?? []).length !== cleanRows.length) failures.push("scope cleanApprovalIds must match clean rows length");

  for (const row of cleanRows) {
    if (row.approvalId === "wave01-resync-01-tsconfig-json") failures.push("tsconfig approval id must not be in clean rows");
    if (row.path === "tsconfig.json") failures.push("tsconfig path must not be in clean rows");
    if (!commandAllowed(row)) failures.push(`clean command is not allowlisted: ${row.approvalId}`);
    if ((row.bytes ?? 0) <= 0) failures.push(`clean row ${row.approvalId} bytes must be positive`);
    if (row.cleanupAuthorized !== false) failures.push(`clean row ${row.approvalId} cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`clean row ${row.approvalId} executableNow must be false`);
    if (!row.authorizationTextToPaste?.includes(`approvalId=${row.approvalId}`)) {
      failures.push(`clean row ${row.approvalId} authorization text missing approvalId`);
    }
    if (!row.authorizationTextToPaste?.includes(`command=${row.exactCommand}`)) {
      failures.push(`clean row ${row.approvalId} authorization text missing command`);
    }
  }

  if (texts.length !== cleanRows.length) failures.push("copyableCleanAuthorizationTexts length must match clean rows length");
  for (const row of texts) {
    if (row.approvalId === "wave01-resync-01-tsconfig-json") failures.push("tsconfig approval text must not be in clean authorization texts");
    if (!cleanRows.some((cleanRow) => cleanRow.approvalId === row.approvalId)) {
      failures.push(`copyable text has unknown clean approval id: ${row.approvalId}`);
    }
    if (!row.text?.includes(`approvalId=${row.approvalId}`)) failures.push(`copyable text missing approvalId: ${row.approvalId}`);
    if (!row.text?.includes(`command=${row.exactCommand}`)) failures.push(`copyable text missing command: ${row.approvalId}`);
  }

  const failedCheckIds = checks.filter((row) => row.status !== "pass").map((row) => row.id);
  if (failedCheckIds.length > 0) failures.push(`acceptance checks failed: ${failedCheckIds.join(", ")}`);

  const markdown = readText(WAVE01_A25_ARTIFACT_CLEAN_OWNER_APPROVAL_CAPSULE_PATHS.latestMarkdown);
  const requiredMarkdownNeedles = [
    "A25 Wave01 A25 Artifact Clean Owner Approval Capsule",
    "does not authorize git clean",
    `Held rows: ${noCurrentArtifactCleanScope ? 0 : 1}`,
    "Clean Approval Rows",
    "Held Rows",
    "Copyable Clean Authorization Texts"
  ];
  if (noCurrentArtifactCleanScope) {
    requiredMarkdownNeedles.push("No Wave01 A25 artifact-clean owner decision is currently required");
  } else {
    requiredMarkdownNeedles.push("wave01-resync-01-tsconfig-json");
  }
  for (const needle of requiredMarkdownNeedles) {
    if (!markdown.includes(needle)) failures.push(`capsule markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("capsule markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    cleanApprovalRows: summary.cleanApprovalRows ?? 0,
    heldRows: summary.heldRows ?? 0,
    totalCleanFileBytes: summary.totalCleanFileBytes ?? 0,
    passingAcceptanceChecks: summary.passingAcceptanceChecks ?? 0,
    acceptanceChecks: summary.acceptanceChecks ?? 0,
    cleanupAuthorizedRows: summary.cleanupAuthorizedRows ?? 0,
    executableRows: summary.executableRows ?? 0,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 Wave01 A25 artifact-clean owner approval capsule gate");
    console.log(`Clean approval rows: ${payload.cleanApprovalRows ?? 0}`);
    console.log(`Held rows: ${payload.heldRows ?? 0}`);
    console.log(`Acceptance checks: ${payload.passingAcceptanceChecks ?? 0}/${payload.acceptanceChecks ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 Wave01 A25 artifact-clean owner approval capsule gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
