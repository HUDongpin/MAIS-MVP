#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS,
  buildNextOwnerExecutionInstructionRequestPacket,
  stableNextOwnerExecutionInstructionRequestPacketProjection
} from "./generate-next-owner-execution-instruction-request-packet.mjs";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-next-owner-execution-instruction-request-packet-current-gate.json");
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

function main() {
  const failures = [];
  for (const requiredPath of [
    NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.dirtyMap,
    NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.executionInstructions,
    NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.executionInstructionsGate,
    NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.latestJson,
    NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.latestMarkdown
  ]) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures });

  const dirtyMap = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.dirtyMap);
  const instructions = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.executionInstructions);
  const gate = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.executionInstructionsGate);
  const recorded = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.latestJson);
  const current = buildNextOwnerExecutionInstructionRequestPacket();
  if (!sameJson(
    stableNextOwnerExecutionInstructionRequestPacketProjection(recorded),
    stableNextOwnerExecutionInstructionRequestPacketProjection(current)
  )) {
    failures.push("next-owner execution instruction request packet is stale");
  }

  const expectedSignature = dirtyMap.statusSignature;
  const expectedEntries = dirtyMap.statusCounts?.expandedStatusEntries ?? null;
  if (recorded.dirtyMapStatusSignature !== expectedSignature) failures.push("request packet dirty-map signature is stale");
  if (recorded.expandedStatusEntries !== expectedEntries) failures.push("request packet expanded dirty entry count is stale");
  if (recorded.sourceArtifacts?.executionInstructionsGeneratedAt !== instructions.generatedAt) {
    failures.push("request packet source execution-instructions timestamp is stale");
  }

  const summary = recorded.summary ?? {};
  if ((summary.readyInstructionRequestRows ?? 0) !== (summary.effectivePendingReadyInstructionRows ?? 0)) {
    failures.push("readyInstructionRequestRows must match effectivePendingReadyInstructionRows");
  }
  if ((summary.effectiveReadyForSeparateInstructionRows ?? 0) !== (gate.effectiveReadyForSeparateInstructionRows ?? 0)) {
    failures.push("request packet effective ready rows must match execution-instructions gate");
  }
  if ((summary.effectivePendingReadyInstructionRows ?? 0) !== (gate.effectivePendingReadyInstructionRows ?? 0)) {
    failures.push("request packet effective pending rows must match execution-instructions gate");
  }
  if ((summary.supplementalA16ReadyForOwnerExecutionInstructionRows ?? 0) !== (gate.supplementalA16ReadyForOwnerExecutionInstructionRows ?? 0)) {
    failures.push("request packet supplemental A16 ready rows must match execution-instructions gate");
  }
  if ((summary.instructionRowsInFile ?? -1) !== (gate.instructionRowsInFile ?? 0)) {
    failures.push("request packet instructionRowsInFile must match execution-instructions gate");
  }
  if ((summary.validInstructionRows ?? -1) !== (gate.validInstructionRows ?? 0)) {
    failures.push("request packet validInstructionRows must match execution-instructions gate");
  }
  if ((summary.cleanupAuthorizedRows ?? -1) !== 0) failures.push("cleanupAuthorizedRows must be 0");
  if ((summary.executableRows ?? -1) !== 0) failures.push("executableRows must be 0");

  for (const row of recorded.requests ?? []) {
    if (row.status !== "waiting-for-owner-execution-instruction") failures.push(`${row.approvalId}: unexpected request status`);
    if (row.cleanupAuthorized !== false) failures.push(`${row.approvalId}: cleanupAuthorized must be false`);
    if (row.executableNow !== false) failures.push(`${row.approvalId}: executableNow must be false`);
    if (!Array.isArray(row.exactCommandSequence) || row.exactCommandSequence.length < 1) failures.push(`${row.approvalId}: exactCommandSequence is required`);
    if (!Array.isArray(row.packageFiles) || row.packageFiles.length < 1) failures.push(`${row.approvalId}: packageFiles are required`);
    if (typeof row.copyableExecutionText !== "string" || row.copyableExecutionText.length === 0) failures.push(`${row.approvalId}: copyableExecutionText is required`);
    if (!includesAll(row.copyableExecutionText, [
      "Authorize separate execution",
      `cwd=${row.cwd}`,
      "No cleanup",
      "broad staging"
    ])) {
      failures.push(`${row.approvalId}: copyableExecutionText must include execution, cwd, no-cleanup, and no-broad-staging terms`);
    }
    for (const command of row.exactCommandSequence ?? []) {
      if (!row.copyableExecutionText.includes(command) && !row.copyableExecutionText.includes(command.replaceAll("\"", "'"))) {
        failures.push(`${row.approvalId}: copyableExecutionText missing exact command ${command}`);
      }
    }
    const template = row.instructionTemplateDoNotExecute ?? {};
    if (template.cleanupAuthorized !== false) failures.push(`${row.approvalId}: template cleanupAuthorized must be false`);
    if (template.executableNow !== false) failures.push(`${row.approvalId}: template executableNow must be false`);
    if (template.approvedBy !== "") failures.push(`${row.approvalId}: template approvedBy must remain blank`);
    if (template.approvedAt !== "") failures.push(`${row.approvalId}: template approvedAt must remain blank`);
    if (template.executionText !== "") failures.push(`${row.approvalId}: template executionText must remain blank`);
  }

  const boundary = recorded.boundary ?? {};
  if (boundary.evidenceOnly !== true) failures.push("boundary.evidenceOnly must be true");
  if (boundary.requestPacketOnly !== true) failures.push("boundary.requestPacketOnly must be true");
  if (boundary.recordsExecutionInstruction !== false) failures.push("boundary.recordsExecutionInstruction must be false");
  if (boundary.stageAuthorized !== false) failures.push("boundary.stageAuthorized must be false");
  if (boundary.commitAuthorized !== false) failures.push("boundary.commitAuthorized must be false");
  if (boundary.mergeAuthorized !== false) failures.push("boundary.mergeAuthorized must be false");
  if (boundary.cleanupAuthorized !== false) failures.push("boundary.cleanupAuthorized must be false");
  if (boundary.executableNow !== false) failures.push("boundary.executableNow must be false");
  if (boundary.destructiveGitAuthorized !== false) failures.push("boundary.destructiveGitAuthorized must be false");
  if (boundary.deployAuthorized !== false) failures.push("boundary.deployAuthorized must be false");
  const hasPendingRequests = (summary.readyInstructionRequestRows ?? 0) > 0;
  if (boundary.requiresSeparateOwnerExecutionInstruction !== hasPendingRequests) {
    failures.push("boundary.requiresSeparateOwnerExecutionInstruction must match whether request rows remain");
  }

  const markdown = readText(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.latestMarkdown);
  const requiredMarkdown = [
    "A25 Next Owner Execution Instruction Request Packet",
    "request-only",
    "Records execution instruction: false",
    "Stage authorized: false",
    "Commit authorized: false",
    "Cleanup authorized: false",
    "Deploy authorized: false"
  ];
  if (hasPendingRequests) requiredMarkdown.push("Copyable owner execution text");
  for (const needle of requiredMarkdown) {
    if (!markdown.includes(needle)) failures.push(`request packet markdown missing text: ${needle}`);
  }
  if (markdown.includes("undefined")) failures.push("request packet markdown contains undefined");

  finish({
    checkedAt: new Date().toISOString(),
    root,
    dirtyMapStatusSignature: recorded.dirtyMapStatusSignature,
    expandedStatusEntries: recorded.expandedStatusEntries,
    readyInstructionRequestRows: summary.readyInstructionRequestRows ?? 0,
    effectivePendingReadyInstructionRows: summary.effectivePendingReadyInstructionRows ?? 0,
    supplementalA16ReadyForOwnerExecutionInstructionRows: summary.supplementalA16ReadyForOwnerExecutionInstructionRows ?? 0,
    instructionRowsInFile: summary.instructionRowsInFile ?? 0,
    validInstructionRows: summary.validInstructionRows ?? 0,
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
    console.log("A25 next-owner execution instruction request packet gate");
    console.log(`Ready request rows: ${payload.readyInstructionRequestRows ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 next-owner execution instruction request packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
