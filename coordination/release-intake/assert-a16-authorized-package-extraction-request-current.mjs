#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS,
  buildA16AuthorizedPackageExtractionRequest,
  stableA16AuthorizedPackageExtractionRequestProjection
} from "./generate-a16-authorized-package-extraction-request.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-a16-authorized-package-extraction-request-current-gate.json");
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
    A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.latestJson,
    A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.latestMarkdown,
    A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.authorizedCommandManifest,
    A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.executionPreview,
    A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.readyCandidateAcceptanceDocket,
    A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.ownerPathspec,
    A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.ownerWorkOrder
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.latestJson);
  const current = buildA16AuthorizedPackageExtractionRequest();
  if (!sameJson(
    stableA16AuthorizedPackageExtractionRequestProjection(recorded),
    stableA16AuthorizedPackageExtractionRequestProjection(current)
  )) {
    failures.push("A16 authorized package extraction request is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const candidate = recorded.candidate ?? {};
  const instructions = recorded.proposedSeparateOwnerInstructions ?? [];
  const commandRows = instructions.flatMap((row) => row.commandSequence ?? []);
  const checks = recorded.acceptanceChecks ?? [];

  if (recorded.dirtyMapStatusSignature !== current.dirtyMapStatusSignature) failures.push("dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== current.expandedStatusEntries) failures.push("expanded dirty entry count is stale");
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if ((summary.sourceCurrentnessFailures ?? 0) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");

  if (candidate.candidateId !== "wave-05-visualization-ai-runtime:a16-research-evidence") {
    failures.push("candidateId must be the A16 ready candidate");
  }
  if (candidate.ownerApprovalId !== "a16-research-and-learning-science") failures.push("owner approval ID mismatch");
	  if (candidate.lifecycleApprovalId !== "codex-a16-research-evidence-closure") failures.push("lifecycle approval ID mismatch");
	  if ((summary.approvedRows ?? 0) !== 2) failures.push("approvedRows must be 2");
	  if ((summary.packageFileRows ?? 0) !== 6) failures.push("packageFileRows must be 6");
	  const postExtractionVerified = summary.postExtractionVerified === true
	    && candidate.postExtractionVerified === true
	    && (candidate.latestPackageCommit?.files ?? []).length === 6;
	  if (postExtractionVerified) {
	    if ((summary.statusRows ?? -1) !== 0) failures.push("statusRows must be 0 after verified package extraction");
	    if ((summary.committedResearchRows ?? 0) !== 6) failures.push("committedResearchRows must be 6 after verified package extraction");
	  } else {
	    if ((summary.statusRows ?? 0) !== 6) failures.push("statusRows must be 6");
	    if ((summary.untrackedResearchRows ?? 0) !== 6) failures.push("untrackedResearchRows must be 6");
	  }
  if ((summary.proposedInstructionRows ?? 0) !== 2) failures.push("proposedInstructionRows must be 2");
  if ((summary.proposedCommandRows ?? 0) !== 2) failures.push("proposedCommandRows must be 2");
  if ((summary.readyForSeparateInstructionRows ?? -1) !== 0) failures.push("readyForSeparateInstructionRows must remain 0");
  if ((summary.validExecutionInstructionRows ?? -1) !== 0) failures.push("validExecutionInstructionRows must remain 0");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must remain 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must remain 0");
  if ((summary.failedAcceptanceChecks ?? -1) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all acceptance checks must pass");

  if (!Array.isArray(candidate.packageFiles) || candidate.packageFiles.length !== 6) failures.push("candidate.packageFiles must contain 6 rows");
  for (const filePath of candidate.packageFiles ?? []) {
    if (!filePath.startsWith("coordination/research/")) failures.push(`package file outside coordination/research: ${filePath}`);
  }
	  for (const row of candidate.statusRows ?? []) {
	    if (row.status !== "??") failures.push(`${row.path}: status must be untracked`);
	    if (!row.path?.startsWith("coordination/research/")) failures.push(`${row.path}: status row outside coordination/research`);
	  }
	  if (postExtractionVerified) {
	    for (const filePath of candidate.latestPackageCommit?.files ?? []) {
	      if (!filePath.startsWith("coordination/research/")) failures.push(`committed package file outside coordination/research: ${filePath}`);
	    }
	  }

  const packageInstruction = instructions.find((row) => row.id === "a16-root-pathspec-commit-request");
  const lifecycleInstruction = instructions.find((row) => row.id === "a16-physical-lifecycle-hold-request");
  if (!packageInstruction) failures.push("missing package extraction instruction request");
  if (!lifecycleInstruction) failures.push("missing lifecycle hold instruction request");
  if (packageInstruction?.proposedOnly !== true) failures.push("package instruction must be proposedOnly");
  if (lifecycleInstruction?.proposedOnly !== true) failures.push("lifecycle instruction must be proposedOnly");
  if (!commandRows.some((row) => row.command === `git add --pathspec-from-file=${A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.ownerPathspec}`)) {
    failures.push("missing exact pathspec-only git add proposal");
  }
  if (!commandRows.some((row) => row.command === "git commit -m \"Add A16 research evidence package\"")) {
    failures.push("missing exact A16 commit proposal");
  }
  if ((lifecycleInstruction?.commandSequence ?? []).length !== 0) failures.push("lifecycle hold must not propose a command");

  for (const row of checks) {
    if (row.status !== "pass") failures.push(`acceptance check failed: ${row.id}`);
  }

  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.requestOnly !== true) failures.push("boundary.requestOnly must be true");
  if (boundary.proposedOnly !== true) failures.push("boundary.proposedOnly must be true");
  if (boundary.writesExecutionInstructions !== false) failures.push("boundary.writesExecutionInstructions must be false");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.stagingAuthorized !== false) failures.push("boundary.stagingAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresSeparateOwnerExecutionInstruction !== true) failures.push("boundary.requiresSeparateOwnerExecutionInstruction must be true");

  const markdown = readText(A16_AUTHORIZED_PACKAGE_EXTRACTION_REQUEST_PATHS.latestMarkdown);
  for (const needle of [
    "A25 A16 Authorized Package Extraction Request",
    "does not write execution instructions",
    "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
	    "git commit -m \"Add A16 research evidence package\"",
	    "No command is proposed for this lifecycle hold",
	    "Post-extraction verified: yes",
	    "Cleanup authorized: false",
    "Executable now: false",
    "A separate owner instruction"
  ]) {
    if (!markdown.includes(needle)) failures.push(`markdown missing required text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    approvedRows: summary.approvedRows ?? 0,
    packageFileRows: summary.packageFileRows ?? 0,
    proposedInstructionRows: summary.proposedInstructionRows ?? 0,
    proposedCommandRows: summary.proposedCommandRows ?? 0,
    readyForSeparateInstructionRows: summary.readyForSeparateInstructionRows ?? 0,
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
    console.log("A25 A16 authorized package extraction request gate");
    console.log(`Approved rows: ${payload.approvedRows ?? 0}`);
    console.log(`Package files: ${payload.packageFileRows ?? 0}`);
    console.log(`Proposed command rows: ${payload.proposedCommandRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 A16 authorized package extraction request gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
