#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = git(["rev-parse", "--show-toplevel"]);
const date = hktDateStamp();

export const NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  executionInstructions: "coordination/release-intake/latest-A25-next-owner-execution-instructions.json",
  executionInstructionsGate: "coordination/release-intake/latest-A25-next-owner-execution-instructions-current-gate.json",
  latestJson: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.json",
  latestMarkdown: "coordination/release-intake/latest-A25-next-owner-execution-instruction-request-packet.md",
  datedJson: `coordination/release-intake/${date}-A25-next-owner-execution-instruction-request-packet.json`,
  datedMarkdown: `coordination/release-intake/${date}-A25-next-owner-execution-instruction-request-packet.md`
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

function count(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function unique(values) {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function readyDraftRows(instructions) {
  return (instructions.draftInstructionsDoNotExecute ?? []).filter((row) => row.readyForSeparateInstruction === true);
}

function exactCommandSequenceFor(row) {
  if (Array.isArray(row.exactCommandSequence) && row.exactCommandSequence.length > 0) {
    return row.exactCommandSequence;
  }
  return row.command ? [row.command] : [];
}

function packageFilesFor(row) {
  if (Array.isArray(row.packageFiles) && row.packageFiles.length > 0) {
    return row.packageFiles;
  }
  return row.path ? [row.path] : [];
}

function copyableExecutionTextFor(row, exactCommandSequence) {
  if (typeof row.requiredExecutionText === "string" && row.requiredExecutionText.includes("Authorize separate execution")) {
    return row.requiredExecutionText;
  }
  const commands = exactCommandSequence.join(" && ");
  return [
    `Authorize separate execution approvalId=${row.approvalId};`,
    `cwd=${row.cwd};`,
    `command=${commands};`,
    "No cleanup beyond the exact listed command sequence;",
    "no broad staging, commit, merge, push, reset, branch deletion, worktree removal, deploy, or unrelated file operation is authorized;",
    "approvedBy=<owner>;",
    "approvedAt=<ISO-8601>;",
    "notes=<scope, evidence reviewed, accepted risk>"
  ].join(" ");
}

function requestRow(row) {
  const exactCommandSequence = exactCommandSequenceFor(row);
  const packageFiles = packageFilesFor(row);
  const copyableExecutionText = copyableExecutionTextFor(row, exactCommandSequence);
  const instructionTemplate = {
    instructionId: row.instructionId ?? `${row.approvalId}-execution-instruction`,
    approvalId: row.approvalId,
    approvalKind: row.approvalKind,
    owner: row.owner,
    sourceKind: row.sourceKind ?? "generic-manifest",
    candidateId: row.candidateId,
    sourceApprovalIds: row.sourceApprovalIds ?? [],
    cwd: row.cwd,
    targetCwd: row.cwd,
    command: row.command ?? "",
    exactCommandSequence,
    packageFiles,
    packageFingerprints: row.packageFingerprints ?? [],
    packageFingerprintSha256: row.packageFingerprintSha256 ?? "",
    packageFingerprintSource: row.packageFingerprintSource ?? "",
    evidenceReviewed: unique(row.evidenceReviewed ?? []),
    requiredPreExecutionChecks: row.requiredPreExecutionChecks ?? [],
    requiredPostExecutionChecks: row.requiredPostExecutionChecks ?? [],
    approvedBy: "",
    approvedAt: "",
    notes: "",
    executionText: "",
    cleanupAuthorized: false,
    executableNow: false
  };
  return {
    requestId: `owner-execution-instruction:${row.approvalId}`,
    status: "waiting-for-owner-execution-instruction",
    approvalId: row.approvalId,
    owner: row.owner,
    sourceKind: row.sourceKind ?? "generic-manifest",
    candidateId: row.candidateId ?? "",
    cwd: row.cwd,
    exactCommandSequence,
    packageFiles,
    packageFingerprintSha256: row.packageFingerprintSha256 ?? "",
    copyableExecutionText,
    targetInputFile: NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.executionInstructions,
    instructionTemplateDoNotExecute: instructionTemplate,
    evidenceReviewed: instructionTemplate.evidenceReviewed,
    requiredPreExecutionChecks: instructionTemplate.requiredPreExecutionChecks,
    requiredPostExecutionChecks: instructionTemplate.requiredPostExecutionChecks,
    cleanupAuthorized: false,
    executableNow: false
  };
}

export function buildNextOwnerExecutionInstructionRequestPacket() {
  const dirtyMap = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.dirtyMap);
  const instructions = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.executionInstructions);
  const gate = readJson(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.executionInstructionsGate);
  const requests = readyDraftRows(instructions).map(requestRow);
  const cleanupAuthorizedRows = requests.filter((row) => row.cleanupAuthorized === true).length;
  const executableRows = requests.filter((row) => row.executableNow === true).length;

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: root,
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries ?? null,
    sourceArtifacts: {
      executionInstructionsGeneratedAt: instructions.generatedAt,
      executionInstructionsGateCheckedAt: gate.checkedAt,
      executionInstructionsGatePath: NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.executionInstructionsGate
    },
    targetInputFile: NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.executionInstructions,
    requests,
    summary: {
      readyInstructionRequestRows: requests.length,
      effectiveReadyForSeparateInstructionRows: count(gate.effectiveReadyForSeparateInstructionRows),
      effectivePendingReadyInstructionRows: count(gate.effectivePendingReadyInstructionRows),
      manifestReadyForSeparateInstructionRows: count(gate.readyForSeparateInstructionRows),
      supplementalA16ReadyForOwnerExecutionInstructionRows: count(gate.supplementalA16ReadyForOwnerExecutionInstructionRows),
      instructionRowsInFile: count(gate.instructionRowsInFile),
      validInstructionRows: count(gate.validInstructionRows),
      invalidInstructionRows: count(gate.invalidInstructionRows),
      cleanupAuthorizedRows,
      executableRows
    },
    boundary: {
      evidenceOnly: true,
      requestPacketOnly: true,
      recordsExecutionInstruction: false,
      stageAuthorized: false,
      commitAuthorized: false,
      mergeAuthorized: false,
      cleanupAuthorized: false,
      executableNow: false,
      destructiveGitAuthorized: false,
      deployAuthorized: false,
      requiresSeparateOwnerExecutionInstruction: requests.length > 0
    }
  };
}

export function stableNextOwnerExecutionInstructionRequestPacketProjection(payload) {
  return {
    repoRoot: payload.repoRoot,
    dirtyMapStatusSignature: payload.dirtyMapStatusSignature,
    expandedStatusEntries: payload.expandedStatusEntries,
    sourceArtifacts: {
      executionInstructionsGeneratedAt: payload.sourceArtifacts?.executionInstructionsGeneratedAt,
      executionInstructionsGatePath: payload.sourceArtifacts?.executionInstructionsGatePath
    },
    targetInputFile: payload.targetInputFile,
    requests: payload.requests,
    summary: payload.summary,
    boundary: payload.boundary
  };
}

function cell(value) {
  return String(value ?? "").replaceAll("\n", " ").replaceAll("|", "\\|");
}

function fenced(value) {
  return `\`\`\`text\n${value ?? ""}\n\`\`\``;
}

function markdown(payload) {
  const rows = payload.requests.map((row) => (
    `| \`${cell(row.approvalId)}\` | ${cell(row.owner)} | ${cell(row.sourceKind)} | ${row.exactCommandSequence.length} | ${row.packageFiles.length} | \`${cell(row.packageFingerprintSha256 || "n/a")}\` |`
  )).join("\n") || "| none | n/a | n/a | 0 | 0 | n/a |";
  const requestDetails = payload.requests.map((row) => `## Request: ${row.approvalId}

Status: ${row.status}

Target input file: \`${row.targetInputFile}\`

Copyable owner execution text:

${fenced(row.copyableExecutionText)}

Exact command sequence:

${row.exactCommandSequence.map((command, index) => `${index + 1}. \`${command}\``).join("\n") || "- none"}

Package files:

${row.packageFiles.map((filePath) => `- \`${filePath}\``).join("\n") || "- none"}

Required pre-execution checks:

${row.requiredPreExecutionChecks.map((command) => `- \`${command}\``).join("\n") || "- none"}

Required post-execution checks:

${row.requiredPostExecutionChecks.map((command) => `- \`${command}\``).join("\n") || "- none"}
`).join("\n");

  return `# A25 Next Owner Execution Instruction Request Packet

Generated: ${payload.generatedAt}

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This packet is request-only. It does not record an execution instruction and does not authorize staging, committing, merging, cleanup, worktree removal, branch deletion, reset, clean, push, deploy, or any physical lifecycle command.

## Summary

- Ready instruction request rows: ${payload.summary.readyInstructionRequestRows}
- Effective ready for separate instruction rows: ${payload.summary.effectiveReadyForSeparateInstructionRows}
- Effective pending ready instruction rows: ${payload.summary.effectivePendingReadyInstructionRows}
- Manifest ready rows: ${payload.summary.manifestReadyForSeparateInstructionRows}
- Supplemental A16 ready rows: ${payload.summary.supplementalA16ReadyForOwnerExecutionInstructionRows}
- Instruction rows in file: ${payload.summary.instructionRowsInFile}
- Valid instruction rows: ${payload.summary.validInstructionRows}
- Cleanup-authorized rows: ${payload.summary.cleanupAuthorizedRows}
- Executable rows: ${payload.summary.executableRows}

## Request Rows

| Approval ID | Owner | Source kind | Commands | Package files | Package fingerprint SHA256 |
| --- | --- | --- | ---: | ---: | --- |
${rows}

${requestDetails}

## Boundary

- Records execution instruction: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
`;
}

function main() {
  const payload = buildNextOwnerExecutionInstructionRequestPacket();
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const md = markdown(payload);
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.latestJson, json);
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.datedJson, json);
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.latestMarkdown, md);
  write(NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.datedMarkdown, md);
  console.log(JSON.stringify({
    latestJson: NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.latestJson,
    latestMarkdown: NEXT_OWNER_EXECUTION_INSTRUCTION_REQUEST_PACKET_PATHS.latestMarkdown,
    readyInstructionRequestRows: payload.summary.readyInstructionRequestRows,
    effectivePendingReadyInstructionRows: payload.summary.effectivePendingReadyInstructionRows,
    supplementalA16ReadyForOwnerExecutionInstructionRows: payload.summary.supplementalA16ReadyForOwnerExecutionInstructionRows,
    cleanupAuthorizedRows: payload.summary.cleanupAuthorizedRows,
    executableRows: payload.summary.executableRows
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
