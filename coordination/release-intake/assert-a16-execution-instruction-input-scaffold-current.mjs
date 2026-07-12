#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS,
  buildA16ExecutionInstructionInputScaffold,
  stableA16ExecutionInstructionInputScaffoldProjection
} from "./generate-a16-execution-instruction-input-scaffold.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-a16-execution-instruction-input-scaffold-current-gate.json");
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
    A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.latestJson,
    A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.latestMarkdown,
    A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.ownerAuthorizations,
    A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.executionAuthorizationDocket,
    A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.preExecutionValidationReport
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const recorded = readJson(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.latestJson);
  const current = buildA16ExecutionInstructionInputScaffold();
  if (!sameJson(
    stableA16ExecutionInstructionInputScaffoldProjection(recorded),
    stableA16ExecutionInstructionInputScaffoldProjection(current)
  )) {
    failures.push("A16 execution-instruction input scaffold is stale");
  }

  const summary = recorded.summary ?? {};
  const boundary = recorded.boundary ?? {};
  const drafts = recorded.draftInstructionsDoNotExecute ?? [];
  const draft = drafts[0] ?? {};
  const instructions = recorded.instructions ?? [];
  const commands = draft.exactCommandSequence ?? [];
  const packageFiles = draft.packageFiles ?? [];
  const packageFingerprints = draft.packageFingerprints ?? [];
  const checks = recorded.acceptanceChecks ?? [];

  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("sourceCurrentnessFailures must be empty");
  if ((summary.sourceCurrentnessFailures ?? -1) !== 0) failures.push("summary.sourceCurrentnessFailures must be 0");
	  if ((summary.draftInstructionRows ?? 0) !== 1) failures.push("draftInstructionRows must be 1");
	  if ((summary.instructionRowsInFile ?? -1) !== 0) failures.push("instructionRowsInFile must be 0 until the owner gives a separate execution instruction");
	  if ((summary.validInstructionRows ?? -1) !== 0) failures.push("validInstructionRows must be 0");
	  const postExtractionVerified = summary.postExtractionVerified === true;
	  const expectedReadyForSeparateInstructionRows = postExtractionVerified ? 0 : 1;
	  if ((summary.readyForSeparateInstructionRows ?? 0) !== expectedReadyForSeparateInstructionRows) {
	    failures.push(`readyForSeparateInstructionRows must be ${expectedReadyForSeparateInstructionRows}`);
	  }
  if ((summary.packageFileRows ?? 0) !== 6) failures.push("packageFileRows must be 6");
  if ((summary.packageFingerprintRows ?? 0) !== 6) failures.push("packageFingerprintRows must be 6");
  if (typeof summary.packageFingerprintSha256 !== "string" || summary.packageFingerprintSha256.length !== 64) {
    failures.push("packageFingerprintSha256 must be a sha256 hex string");
  }
  if ((summary.exactCommandRows ?? 0) !== 2) failures.push("exactCommandRows must be 2");
  if ((summary.failedAcceptanceChecks ?? -1) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all acceptance checks must pass");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  if (instructions.length !== 0) failures.push("instructions array must remain empty until the owner provides a separate execution instruction");
  if (drafts.length !== 1) failures.push("draftInstructionsDoNotExecute must contain one row");
  if (draft.instructionId !== "a16-root-pathspec-commit-execution-execution-instruction") failures.push("draft instructionId mismatch");
  if (draft.approvalId !== "a16-root-pathspec-commit-execution") failures.push("draft approvalId mismatch");
  if (draft.status !== "draft-owner-execution-instruction-input") failures.push("draft status mismatch");
  if (draft.targetCwd !== root) failures.push("draft targetCwd must be repo root");
  if ((draft.sourceApprovalIds ?? []).join(",") !== "a16-research-and-learning-science,codex-a16-research-evidence-closure") {
    failures.push("draft sourceApprovalIds mismatch");
  }
  if (commands[0] !== "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec") {
    failures.push("first exact command must be pathspec-only git add");
  }
  if (commands[1] !== "git commit -m \"Add A16 research evidence package\"") {
    failures.push("second exact command must be the A16 package commit");
  }
  if (JSON.stringify(draft.commandSequence ?? []) !== JSON.stringify(commands)) {
    failures.push("draft commandSequence must mirror exactCommandSequence");
  }
  if (draft.destructiveGitAuthorized !== false) failures.push("draft destructiveGitAuthorized must be false");
  if (draft.deployAuthorized !== false) failures.push("draft deployAuthorized must be false");
  if (packageFiles.length !== 6) failures.push("packageFiles must contain 6 rows");
  for (const filePath of packageFiles) {
    if (!filePath.startsWith("coordination/research/")) failures.push(`package file outside coordination/research: ${filePath}`);
  }
  if (packageFingerprints.length !== 6) failures.push("packageFingerprints must contain 6 rows");
  for (const row of packageFingerprints) {
    if (!row.path?.startsWith("coordination/research/")) failures.push(`${row.path ?? "missing path"}: fingerprint path must stay under coordination/research/`);
    if (typeof row.sha256 !== "string" || row.sha256.length !== 64) failures.push(`${row.path ?? "missing path"}: fingerprint sha256 must be a sha256 hex string`);
  }
  if (draft.packageFingerprintSha256 !== summary.packageFingerprintSha256) {
    failures.push("draft packageFingerprintSha256 must match summary");
  }
  if (draft.packageFingerprintSource !== A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.preExecutionValidationReport) {
    failures.push("draft packageFingerprintSource mismatch");
  }
  if (typeof draft.requiredExecutionText !== "string" || !draft.requiredExecutionText.includes("Authorize separate execution")) {
    failures.push("requiredExecutionText missing execution authorization phrase");
  }
  if (!draft.requiredExecutionText?.includes("No cleanup")) failures.push("requiredExecutionText must exclude cleanup");
  if (!draft.requiredExecutionText?.includes("broad staging")) failures.push("requiredExecutionText must exclude broad staging");
  if (draft.approvedBy !== "") failures.push("draft approvedBy must be empty");
  if (draft.approvedAt !== "") failures.push("draft approvedAt must be empty");
  if (draft.executionText !== "") failures.push("draft executionText must be empty");
  if (draft.cleanupAuthorized !== false) failures.push("draft cleanupAuthorized must be false");
  if (draft.executableNow !== false) failures.push("draft executableNow must be false");

  for (const check of checks) {
    if (check.status !== "pass") failures.push(`acceptance check failed: ${check.id}`);
  }

  if (recorded.cleanupAuthorized !== false) failures.push("scaffold cleanupAuthorized must be false");
  if (recorded.executableNow !== false) failures.push("scaffold executableNow must be false");
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.scaffoldOnly !== true) failures.push("boundary.scaffoldOnly must be true");
  if (boundary.recordsOwnerApproval !== false) failures.push("boundary.recordsOwnerApproval must be false");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresSeparateOwnerExecutionInstruction !== true) failures.push("boundary.requiresSeparateOwnerExecutionInstruction must be true");

  const markdown = readText(A16_EXECUTION_INSTRUCTION_INPUT_SCAFFOLD_PATHS.latestMarkdown);
  for (const needle of [
    "A25 A16 Execution Instruction Input Scaffold",
    "does not record execution approval",
    "Authorize separate execution",
	    "Stage authorized: false",
	    `Post-extraction verified: ${postExtractionVerified ? "yes" : "no"}`,
	    "Commit authorized: false",
    "Cleanup authorized: false",
    "Executable now: false",
    "A separate owner execution instruction is still required"
  ]) {
    if (!markdown.includes(needle)) failures.push(`markdown missing required text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    draftInstructionRows: summary.draftInstructionRows ?? 0,
    instructionRowsInFile: summary.instructionRowsInFile ?? 0,
    readyForSeparateInstructionRows: summary.readyForSeparateInstructionRows ?? 0,
    packageFileRows: summary.packageFileRows ?? 0,
    packageFingerprintRows: summary.packageFingerprintRows ?? 0,
    packageFingerprintSha256: summary.packageFingerprintSha256 ?? null,
    exactCommandRows: summary.exactCommandRows ?? 0,
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
    console.log("A25 A16 execution-instruction input scaffold gate");
    console.log(`Draft instruction rows: ${payload.draftInstructionRows ?? 0}`);
    console.log(`Ready for separate instruction rows: ${payload.readyForSeparateInstructionRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 A16 execution-instruction input scaffold gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
