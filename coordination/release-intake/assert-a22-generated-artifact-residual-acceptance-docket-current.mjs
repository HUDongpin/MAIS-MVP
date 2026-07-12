#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS,
  buildGeneratedArtifactResidualAcceptanceDocket,
  stableGeneratedArtifactResidualAcceptanceDocketProjection
} from "./generate-a22-generated-artifact-residual-acceptance-docket.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A22-generated-artifact-residual-acceptance-docket-current-gate.json");
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

function main() {
  const failures = [];
  for (const requiredPath of [
    GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.latestJson,
    GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.latestJson);
  const current = buildGeneratedArtifactResidualAcceptanceDocket();
  if (!sameJson(
    stableGeneratedArtifactResidualAcceptanceDocketProjection(recorded),
    stableGeneratedArtifactResidualAcceptanceDocketProjection(current)
  )) {
    failures.push("A22 generated-artifact residual acceptance docket is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const decision = recorded.ownerDecisionDocket ?? {};
  const checks = recorded.acceptanceChecks ?? [];
  const digest = recorded.residualDigest ?? [];
  const postClean = decision.status === "post-clean-no-residual-targets" &&
    (summary.residualTargets ?? -1) === 0 &&
    (summary.postCleanNoResidualTargets === true);
  const preClean = decision.status === "ready-for-owner-decision" &&
    (summary.residualTargets ?? 0) > 0;

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.createsAuthorizationFile !== false) failures.push("boundary.createsAuthorizationFile must be false");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.fileDeletionAuthorized !== false) failures.push("boundary.fileDeletionAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (!preClean && !postClean) failures.push("decision status must be ready-for-owner-decision or post-clean-no-residual-targets");
  if (preClean && (summary.totalBytes ?? 0) <= 0 && (summary.activeWriterBlockedRows ?? 0) <= 0) {
    failures.push("summary must show positive residual size or active-writer blocked volatile rows");
  }
  if (preClean && (summary.cleanupScriptApplyRows ?? 0) < 0) failures.push("cleanupScriptApplyRows must be non-negative");
  if (postClean && (summary.cleanupScriptApplyRows ?? 0) !== 0) failures.push("post-clean cleanupScriptApplyRows must be 0");
  if ((summary.exactDirectoryRemovalRows ?? 0) < 0) failures.push("exactDirectoryRemovalRows must be non-negative");
  if (preClean && (summary.copyableAuthorizationTexts ?? 0) !== (summary.residualTargets ?? -1)) {
    failures.push("copyableAuthorizationTexts must match residualTargets");
  }
  if (postClean && (summary.copyableAuthorizationTexts ?? 0) !== 0) failures.push("post-clean copyableAuthorizationTexts must be 0");
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");
  if (preClean && (summary.acceptanceChecks ?? 0) < 9) failures.push("acceptanceChecks must be at least 9");
  if (postClean && (summary.acceptanceChecks ?? 0) < 5) failures.push("post-clean acceptanceChecks must be at least 5");
  if ((summary.failedAcceptanceChecks ?? 0) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all acceptance checks must pass");

  if (preClean) {
    const requiredIds = decision.requiredApprovalIds ?? [];
    if (requiredIds.length !== (summary.residualTargets ?? -1)) failures.push("requiredApprovalIds must match residualTargets");
    for (const requiredId of requiredIds) {
      if (!(decision.requiredApprovalIds ?? []).includes(requiredId)) failures.push(`missing required approval ID ${requiredId}`);
      if (!(decision.copyableAuthorizationTexts ?? []).some((row) => row.approvalId === requiredId && row.text?.includes(`approvalId=${requiredId}`))) {
        failures.push(`missing copyable authorization text for ${requiredId}`);
      }
      if (!digest.some((row) => row.approvalId === requiredId && row.cleanupAuthorized === false && row.executableNow === false)) {
        failures.push(`missing non-executable digest row for ${requiredId}`);
      }
    }
  } else if (postClean && digest.length !== 0) {
    failures.push("post-clean digest must be empty");
  }

  const failedCheckIds = checks.filter((row) => row.status !== "pass").map((row) => row.id);
  if (failedCheckIds.length > 0) failures.push(`acceptance checks failed: ${failedCheckIds.join(", ")}`);

  const markdown = readText(GENERATED_ARTIFACT_RESIDUAL_ACCEPTANCE_DOCKET_PATHS.latestMarkdown);
  for (const needle of [
    "A22 Generated Artifact Residual Acceptance Docket",
    "does not create the authorization file",
    decision.status,
    `Residual targets: ${summary.residualTargets ?? 0}`,
    `Acceptance checks: ${summary.passingAcceptanceChecks ?? 0}/${summary.acceptanceChecks ?? 0}`,
    "Cleanup-authorized rows: 0",
    "Executable rows: 0",
    "Every row remains non-executable",
    "does not authorize cleanup apply"
  ]) {
    if (!markdown.includes(needle)) failures.push(`acceptance docket markdown missing text: ${needle}`);
  }
  if (preClean) {
    for (const requiredId of decision.requiredApprovalIds ?? []) {
      const needle = `approvalId=${requiredId}`;
      if (!markdown.includes(needle)) failures.push(`acceptance docket markdown missing text: ${needle}`);
    }
  }
  if (markdown.includes("undefined")) failures.push("acceptance docket markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    decisionStatus: decision.status,
    residualTargets: summary.residualTargets ?? 0,
    totalBytes: summary.totalBytes ?? 0,
    totalGiB: summary.totalGiB ?? 0,
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
    console.log("A22 generated-artifact residual acceptance docket gate");
    console.log(`Decision status: ${payload.decisionStatus ?? ""}`);
    console.log(`Residual targets: ${payload.residualTargets ?? 0}`);
    console.log(`Acceptance checks: ${payload.passingAcceptanceChecks ?? 0}/${payload.acceptanceChecks ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A22 generated-artifact residual acceptance docket gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
