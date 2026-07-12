#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS,
  buildNextOwnerExecutionInstructionAcceptanceDocket,
  stableNextOwnerExecutionInstructionAcceptanceDocketProjection
} from "./generate-next-owner-execution-instruction-acceptance-docket.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-execution-instruction-acceptance-docket-current-gate.json");
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

function includesAll(value, needles) {
  return typeof value === "string" && needles.every((needle) => value.includes(needle));
}

function rowKind(row) {
  if ((row.approvalKind ?? "") === "wave01-package-resync" || (row.approvalId ?? "").startsWith("wave01-resync-")) {
    return "wave01-package-resync";
  }
  if ((row.rowKind ?? "") === "a16-authorized-extraction" || (row.sourceKind ?? "") === "a16-authorized-extraction" || (row.candidateId ?? "").includes("a16")) {
    return "a16-authorized-extraction";
  }
  return row.rowKind ?? row.sourceKind ?? "generic-manifest";
}

function main() {
  const failures = [];
  for (const requiredPath of [
    NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.dirtyMap,
    NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.executionInstructions,
    NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.executionInstructionsGate,
    NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.requestPacket,
    NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.requestPacketGate,
    NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16OwnerInput,
    NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16OwnerInputGate,
    NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16PreExecutionReport,
    NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.latestJson,
    NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.dirtyMap);
  const requestPacket = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.requestPacket);
  const ownerInputGate = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16OwnerInputGate);
  const preExecution = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16PreExecutionReport);
  const recorded = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.latestJson);
  const current = buildNextOwnerExecutionInstructionAcceptanceDocket();

  if (!sameJson(
    stableNextOwnerExecutionInstructionAcceptanceDocketProjection(recorded),
    stableNextOwnerExecutionInstructionAcceptanceDocketProjection(current)
  )) {
    failures.push("next-owner execution instruction acceptance docket is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("acceptance docket dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("acceptance docket expanded dirty entry count is stale");
  if (recorded.sourceArtifacts?.requestPacketGeneratedAt !== requestPacket.generatedAt) {
    failures.push("acceptance docket source request packet timestamp is stale");
  }
  if (recorded.sourceArtifacts?.a16PreExecutionReportGeneratedAt !== preExecution.generatedAt) {
    failures.push("acceptance docket source pre-execution report timestamp is stale");
  }

  const summary = recorded.summary ?? {};
  if ((recorded.sourceCurrentnessFailures ?? []).length !== 0) failures.push("acceptance docket has source currentness failures");
  const waitingForOwnerInstruction = (summary.readyInstructionRequestRows ?? 0) > 0 &&
    (summary.readyInstructionRequestRows ?? 0) === (summary.effectivePendingReadyInstructionRows ?? 0) &&
    (summary.acceptanceRows ?? 0) === (summary.readyInstructionRequestRows ?? 0);
  const ownerInstructionConsumed = (summary.readyInstructionRequestRows ?? 0) === 0 &&
    (summary.effectivePendingReadyInstructionRows ?? 0) === 0 &&
    (summary.ownerInputInstructionRows ?? 0) === 1 &&
    (summary.ownerInputValidInstructionRows ?? 0) === 1;
  const genericOwnerInstructionRecorded = (summary.readyInstructionRequestRows ?? 0) === 0 &&
    (summary.effectivePendingReadyInstructionRows ?? 0) === 0 &&
    (summary.instructionRowsInFile ?? 0) > 0 &&
    (summary.validInstructionRows ?? 0) === (summary.instructionRowsInFile ?? 0);
  if (!waitingForOwnerInstruction && !ownerInstructionConsumed && !genericOwnerInstructionRecorded) {
    failures.push("acceptance docket must be waiting for owner instruction, consumed by the specialized A16 owner input, or consumed by valid generic owner instructions");
  }
  if (waitingForOwnerInstruction && (summary.acceptanceRows ?? 0) !== (summary.readyInstructionRequestRows ?? 0)) {
    failures.push("acceptanceRows must match readyInstructionRequestRows while waiting for separate execution instructions");
  }
  if ((ownerInstructionConsumed || genericOwnerInstructionRecorded) && (summary.acceptanceRows ?? 0) !== 0) {
    failures.push("acceptanceRows must be 0 after owner execution instructions consume the request");
  }
  if (waitingForOwnerInstruction && (summary.instructionRowsInFile ?? -1) !== 0) failures.push("instructionRowsInFile must remain 0 while waiting");
  if (waitingForOwnerInstruction && (summary.validInstructionRows ?? -1) !== 0) failures.push("validInstructionRows must remain 0 while waiting");
  if (summary.preExecutionValidationReady !== true) failures.push("preExecutionValidationReady must be true");
  if ((summary.passingAcceptanceChecks ?? 0) !== (summary.acceptanceChecks ?? -1)) failures.push("all acceptance checks must pass");
  if ((summary.failedAcceptanceChecks ?? -1) !== 0) failures.push("failedAcceptanceChecks must be 0");
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  for (const check of recorded.acceptanceChecks ?? []) {
    if (check.status !== "pass") failures.push(`acceptance check failed: ${check.id}`);
  }

  for (const row of recorded.acceptanceRows ?? []) {
    const kind = rowKind(row);
    if (row.status !== "waiting-for-owner-execution-instruction") failures.push(`${row.approvalId}: status must remain waiting-for-owner-execution-instruction`);
    if (row.targetInputFile !== NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.executionInstructions) {
      failures.push(`${row.approvalId}: targetInputFile mismatch`);
    }
    if (kind === "a16-authorized-extraction" && row.expectedInstructionId !== "a16-root-pathspec-commit-execution-execution-instruction") {
      failures.push(`${row.approvalId}: expectedInstructionId mismatch`);
    }
    if (!Array.isArray(row.exactCommandSequence) || row.exactCommandSequence.length < 1) {
      failures.push(`${row.approvalId}: exactCommandSequence must contain at least 1 command`);
    }
    if (kind === "a16-authorized-extraction" && row.exactCommandSequence?.[0] !== "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec") {
      failures.push(`${row.approvalId}: first exact command mismatch`);
    }
    if (kind === "a16-authorized-extraction" && row.exactCommandSequence?.[1] !== "git commit -m \"Add A16 research evidence package\"") {
      failures.push(`${row.approvalId}: second exact command mismatch`);
    }
    if (!Array.isArray(row.packageFiles) || row.packageFiles.length < 1) failures.push(`${row.approvalId}: packageFiles must contain at least 1 row`);
    if (kind === "a16-authorized-extraction" && row.packageFiles.length !== 6) failures.push(`${row.approvalId}: A16 packageFiles must contain 6 rows`);
    if (kind === "a16-authorized-extraction" && !row.packageFiles?.every((filePath) => filePath.startsWith("coordination/research/"))) {
      failures.push(`${row.approvalId}: packageFiles must stay under coordination/research/`);
    }
    if (kind === "a16-authorized-extraction" && (typeof row.packageFingerprintSha256 !== "string" || row.packageFingerprintSha256.length !== 64)) {
      failures.push(`${row.approvalId}: packageFingerprintSha256 must be a sha256 hex string`);
    }
    const requiredExecutionTerms = [
      "Authorize separate execution",
      "No cleanup",
      "broad staging"
    ];
    if (kind === "a16-authorized-extraction") {
      requiredExecutionTerms.push(
        "approvalIds=a16-research-and-learning-science,codex-a16-research-evidence-closure",
        "git add --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec",
        "Add A16 research evidence package"
      );
    }
    if (!includesAll(row.expectedExecutionText, requiredExecutionTerms)) {
      failures.push(`${row.approvalId}: expectedExecutionText is missing required authorization terms`);
    }
    for (const command of row.exactCommandSequence ?? []) {
      if (!row.expectedExecutionText.includes(command) && !row.expectedExecutionText.includes(command.replaceAll("\"", "'"))) {
        failures.push(`${row.approvalId}: expectedExecutionText missing exact command ${command}`);
      }
    }
    if (!Array.isArray(row.requiredEvidenceReviewed) || ![
      NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.requestPacket,
      NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16OwnerInput,
      NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.a16PreExecutionReport
    ].every((item) => row.requiredEvidenceReviewed.includes(item))) {
      failures.push(`${row.approvalId}: requiredEvidenceReviewed missing required evidence`);
    }
    if (kind === "a16-authorized-extraction" && (!Array.isArray(row.requiredPreExecutionChecks) || row.requiredPreExecutionChecks.length < 1)) {
      failures.push(`${row.approvalId}: requiredPreExecutionChecks are required`);
    }
    if (kind === "a16-authorized-extraction" && (!Array.isArray(row.requiredPostExecutionChecks) || row.requiredPostExecutionChecks.length < 1)) {
      failures.push(`${row.approvalId}: requiredPostExecutionChecks are required`);
    }
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.approvalId}: executableNow must be false`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.acceptanceDocketOnly !== true) failures.push("boundary.acceptanceDocketOnly must be true");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  if (boundary.requiresSeparateOwnerExecutionInstruction !== waitingForOwnerInstruction) {
    failures.push("boundary.requiresSeparateOwnerExecutionInstruction must match whether the acceptance docket is still waiting");
  }

  const markdown = readText(NEXT_OWNER_EXECUTION_INSTRUCTION_ACCEPTANCE_DOCKET_PATHS.latestMarkdown);
  const requiredMarkdown = [
    "A25 Next Owner Execution Instruction Acceptance Docket",
    "does not record an execution instruction",
    "Records execution instruction: false",
    "Stage authorized: false",
    "Commit authorized: false",
    "Cleanup authorized: false",
    "Deploy authorized: false"
  ];
  if (waitingForOwnerInstruction) requiredMarkdown.push("Acceptance criteria");
  for (const needle of requiredMarkdown) {
    if (!markdown.includes(needle)) failures.push(`acceptance docket markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("acceptance docket markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    acceptanceRows: summary.acceptanceRows ?? 0,
    readyInstructionRequestRows: summary.readyInstructionRequestRows ?? 0,
    instructionRowsInFile: summary.instructionRowsInFile ?? 0,
    validInstructionRows: summary.validInstructionRows ?? 0,
    ownerInputInstructionRows: summary.ownerInputInstructionRows ?? 0,
    preExecutionValidationReady: summary.preExecutionValidationReady === true,
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
    console.log("A25 next-owner execution instruction acceptance docket gate");
    console.log(`Acceptance rows: ${payload.acceptanceRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 next-owner execution instruction acceptance docket gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
