#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS,
  buildReadyCandidateOwnerAcceptanceDocket,
  stableReadyCandidateOwnerAcceptanceDocketProjection
} from "./generate-ready-candidate-owner-acceptance-docket.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-ready-candidate-owner-acceptance-docket-current-gate.json");
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
    READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.latestJson,
    READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }

  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.latestJson);
  const current = buildReadyCandidateOwnerAcceptanceDocket();
  if (!sameJson(
    stableReadyCandidateOwnerAcceptanceDocketProjection(recorded),
    stableReadyCandidateOwnerAcceptanceDocketProjection(current)
  )) {
    failures.push("A25 ready candidate owner acceptance docket is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const decision = recorded.ownerDecisionDocket ?? {};
  const checks = recorded.acceptanceChecks ?? [];
  const inventory = recorded.evidenceDigest?.fileInventory ?? [];

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.createsAuthorizationFile !== false) failures.push("boundary.createsAuthorizationFile must be false");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures list must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
  if (summary.candidateId !== "wave-05-visualization-ai-runtime:a16-research-evidence") {
    failures.push("candidateId must be the A16 ready candidate");
  }
  const a16OwnerPackageConsumed = decision.consumedApprovalIds?.includes("a16-research-and-learning-science") === true
    && decision.postExtractionState?.verified === true
    && decision.postExtractionState?.lifecycleStatus === "post-extraction-verified"
    && (decision.postExtractionState?.packageStatusRows ?? 1) === 0
    && (decision.postExtractionState?.stagedPackageRows ?? 1) === 0
    && decision.postExtractionState?.latestPackageCommit?.hash;
  const consumedNoActiveCandidate = a16OwnerPackageConsumed
    && decision.status === "post-extraction-consumed"
    && summary.postExtractionConsumed === true
    && summary.ownerDecisionRequired === false
    && summary.readyForOwnerDecision === false
    && (summary.approvalRows ?? 0) === 0;

  if (consumedNoActiveCandidate) {
    if ((summary.fileInventoryRows ?? 0) !== 0) failures.push("consumed docket fileInventoryRows must be 0");
    if ((summary.rootFilesPresent ?? 0) !== 0) failures.push("consumed docket rootFilesPresent must be 0");
    if ((summary.rootFilesMissing ?? 0) !== 0) failures.push("consumed docket rootFilesMissing must be 0");
    if ((summary.statusRows ?? 0) !== 0) failures.push("consumed docket statusRows must be 0");
    if ((summary.untrackedRows ?? 0) !== 0) failures.push("consumed docket untrackedRows must be 0");
    if ((summary.ownerScopeRows ?? 0) !== 0) failures.push("consumed docket ownerScopeRows must be 0");
  } else {
    if (decision.status !== "ready-for-owner-decision") failures.push("decision status must be ready-for-owner-decision");
    if (summary.readyForOwnerDecision !== true) failures.push("summary.readyForOwnerDecision must be true");
    if ((summary.fileInventoryRows ?? 0) !== 6) failures.push("fileInventoryRows must be 6");
    if ((summary.rootFilesPresent ?? 0) !== 6) failures.push("rootFilesPresent must be 6");
    if ((summary.rootFilesMissing ?? 0) !== 0) failures.push("rootFilesMissing must be 0");
    if ((summary.statusRows ?? 0) !== 6) failures.push("statusRows must be 6");
    if ((summary.untrackedRows ?? 0) !== 6) failures.push("untrackedRows must be 6");
    if ((summary.ownerScopeRows ?? 0) !== 6) failures.push("ownerScopeRows must be 6");
  }
  if (summary.trackedDiffPresent !== false) failures.push("trackedDiffPresent must be false");
  if (summary.aheadCommitsPresent !== false) failures.push("aheadCommitsPresent must be false");
  if (summary.dirtyDivergedDiffPresent !== false) failures.push("dirtyDivergedDiffPresent must be false");
  if ((summary.acceptanceChecks ?? 0) < (consumedNoActiveCandidate ? 6 : 12)) {
    failures.push(`acceptanceChecks must be at least ${consumedNoActiveCandidate ? 6 : 12}`);
  }
  if ((summary.failedAcceptanceChecks ?? 0) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) {
    failures.push("all acceptance checks must pass");
  }
  const expectedActiveApprovalRows = consumedNoActiveCandidate ? 0 : a16OwnerPackageConsumed ? 1 : 2;
  if ((summary.approvalRows ?? 0) !== expectedActiveApprovalRows) {
    failures.push(`approvalRows must be ${expectedActiveApprovalRows}`);
  }
  if ((summary.consumedApprovalRows ?? 0) !== (a16OwnerPackageConsumed ? 1 : 0)) {
    failures.push(`consumedApprovalRows must be ${a16OwnerPackageConsumed ? 1 : 0}`);
  }
  if ((summary.cleanupAuthorizedRows ?? 0) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? 0) !== 0) failures.push("executableRows must be 0");

  const activeRequiredIds = consumedNoActiveCandidate
    ? []
    : a16OwnerPackageConsumed
      ? ["codex-a16-research-evidence-closure"]
      : ["a16-research-and-learning-science", "codex-a16-research-evidence-closure"];
  for (const requiredId of activeRequiredIds) {
    if (!(decision.requiredApprovalIds ?? []).includes(requiredId)) failures.push(`missing required approval ID ${requiredId}`);
    if (!(decision.copyableAuthorizationTexts ?? []).some((row) => row.approvalId === requiredId && row.text?.includes(`approvalId=${requiredId}`))) {
      failures.push(`missing copyable authorization text for ${requiredId}`);
    }
  }
  if (a16OwnerPackageConsumed && (decision.requiredApprovalIds ?? []).includes("a16-research-and-learning-science")) {
    failures.push("consumed owner-package approval ID must not remain required as an active approval");
  }

  const failedCheckIds = checks.filter((row) => row.status !== "pass").map((row) => row.id);
  if (failedCheckIds.length > 0) failures.push(`acceptance checks failed: ${failedCheckIds.join(", ")}`);
  const missingFiles = inventory.filter((row) => row.exists !== true).map((row) => row.path);
  if (missingFiles.length > 0) failures.push(`docket inventory has missing files: ${missingFiles.join(", ")}`);
  if (!consumedNoActiveCandidate && !inventory.every((row) => row.ownerScope === true && row.path?.startsWith("coordination/research/"))) {
    failures.push("all docket inventory rows must stay inside coordination/research/");
  }

  const markdown = readText(READY_CANDIDATE_OWNER_ACCEPTANCE_DOCKET_PATHS.latestMarkdown);
  const requiredMarkdownNeedles = [
    "A25 Ready Candidate Owner Acceptance Docket",
    "does not create the authorization file",
    consumedNoActiveCandidate ? "post-extraction-consumed" : "ready-for-owner-decision",
    `Acceptance checks: ${summary.acceptanceChecks}/${summary.acceptanceChecks}`,
    "Tracked diff present: no",
    "Ahead commits present: no",
    "Dirty-diverged diff present: no",
    "Consumed approval IDs",
    "Every row remains non-executable"
  ];
  if (consumedNoActiveCandidate) {
    requiredMarkdownNeedles.push("Post-extraction verified: yes");
  } else {
    requiredMarkdownNeedles.push("approvalId=codex-a16-research-evidence-closure");
    if (!a16OwnerPackageConsumed) {
      requiredMarkdownNeedles.push("approvalId=a16-research-and-learning-science");
    }
  }
  for (const needle of requiredMarkdownNeedles) {
    if (!markdown.includes(needle)) failures.push(`acceptance docket markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("acceptance docket markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    candidateId: summary.candidateId,
    decisionStatus: decision.status,
    fileInventoryRows: summary.fileInventoryRows ?? 0,
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
    console.log("A25 ready candidate owner acceptance docket gate");
    console.log(`Candidate: ${payload.candidateId ?? ""}`);
    console.log(`Decision status: ${payload.decisionStatus ?? ""}`);
    console.log(`Acceptance checks: ${payload.passingAcceptanceChecks ?? 0}/${payload.acceptanceChecks ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 ready candidate owner acceptance docket gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
