#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-remaining-completion-blocker-assignment-packet-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  completionAudit: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  packet: "coordination/release-intake/latest-A25-remaining-completion-blocker-assignment-packet.json",
  markdown: "coordination/release-intake/latest-A25-remaining-completion-blocker-assignment-packet.md",
  nextOwnerPacket: "coordination/release-intake/latest-A25-next-owner-approval-packet.json",
  ownerPackageAssignments: "coordination/release-intake/latest-A25-owner-package-blocker-assignment-packet.json",
  wave01Frontier: "coordination/release-intake/latest-A25-wave01-governance-frontier-readiness.json",
  closureSequence: "coordination/release-intake/latest-A25-dirty-worktree-closure-execution-sequence.json",
  physicalQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json"
};

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

function incompleteRequirements(audit) {
  return (audit.requirements ?? []).filter((row) => !row.passed);
}

function incompleteTasks(audit) {
  return (audit.planTasks ?? []).filter((row) => row.status !== "complete");
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 remaining completion blocker assignment packet gate");
    console.log(`Assignments: ${payload.assignments ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 remaining completion blocker assignment packet gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, assignments: 0 });

  const dirtyMap = readJson(paths.dirtyMap);
  const audit = readJson(paths.completionAudit);
  const packet = readJson(paths.packet);
  const nextOwnerPacket = readJson(paths.nextOwnerPacket);
  const ownerPackageAssignments = readJson(paths.ownerPackageAssignments);
  const wave01Frontier = readJson(paths.wave01Frontier);
  const closureSequence = readJson(paths.closureSequence);
  const physicalQueue = readJson(paths.physicalQueue);

  const currentArtifacts = [
    ["completion audit", audit],
    ["next owner packet", nextOwnerPacket],
    ["owner package assignments", ownerPackageAssignments],
    ["Wave01 governance frontier", wave01Frontier],
    ["closure sequence", closureSequence],
    ["physical queue", physicalQueue]
  ];
  for (const [label, artifact] of currentArtifacts) {
    if (artifact.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push(`${label} dirty-map signature is stale`);
    if (artifact.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push(`${label} expanded dirty entry count is stale`);
  }

  if (packet.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("packet dirty-map signature is stale");
  if (packet.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("packet expanded dirty entry count is stale");
  if (packet.completionAuditGeneratedAt !== audit.generatedAt) failures.push("packet completion audit timestamp is stale");
  if (JSON.stringify(packet.completionAuditSummary ?? null) !== JSON.stringify(audit.summary ?? null)) failures.push("packet completion audit summary is stale");
  if (packet.summary?.incompleteRequirements !== incompleteRequirements(audit).length) failures.push("packet incomplete requirement count is stale");
  if (packet.summary?.incompletePlanTasks !== incompleteTasks(audit).length) failures.push("packet incomplete plan task count is stale");
  if (packet.summary?.cleanupAuthorizedRows !== 0) failures.push("packet cleanupAuthorizedRows must be 0");
  if (packet.summary?.executableRows !== 0) failures.push("packet executableRows must be 0");
  if ((packet.assignments ?? []).some((row) => row.cleanupAuthorized || row.executableNow)) failures.push("packet contains executable or cleanup-authorized assignment");

  const assignmentIds = new Set((packet.assignments ?? []).map((row) => row.assignmentId));
  for (const requiredId of [
    "remaining-completion-release-source-clean",
    "remaining-completion-worktree-lifecycle",
    "remaining-completion-wave01-governance",
    "remaining-completion-owner-packages",
    "remaining-completion-final-release-source"
  ]) {
    if (!assignmentIds.has(requiredId)) failures.push(`missing assignment: ${requiredId}`);
  }

  const wave01Assignment = (packet.assignments ?? []).find((row) => row.assignmentId === "remaining-completion-wave01-governance");
  if (!wave01Assignment) {
    failures.push("missing Wave01 governance assignment");
  } else {
    if (!(wave01Assignment.evidence ?? []).includes(paths.wave01Frontier)) failures.push("Wave01 assignment missing governance frontier evidence");
    if (wave01Assignment.wave01FrontierGeneratedAt !== wave01Frontier.generatedAt) failures.push("Wave01 assignment frontier timestamp is stale");
    if (wave01Assignment.wave01FrontierStatus !== wave01Frontier.frontierStatus) failures.push("Wave01 assignment frontier status is stale");
    if (wave01Assignment.wave01ArtifactCleanAuthorizedRows !== wave01Frontier.summary.cleanApprovalRows) failures.push("Wave01 assignment artifact-clean authorized row count is stale");
    if (wave01Assignment.wave01ArtifactCleanTargetDirtyRows !== wave01Frontier.summary.targetDirtyRows) failures.push("Wave01 assignment target dirty row count is stale");
    if (wave01Assignment.wave01HeldRows !== wave01Frontier.summary.heldRows) failures.push("Wave01 assignment held row count is stale");
    if (wave01Assignment.wave01ValidExecutionInstructionRows !== wave01Frontier.summary.validInstructionRows) failures.push("Wave01 assignment valid execution-instruction row count is stale");
    if (wave01Assignment.wave01CleanupAuthorizedRows !== 0) failures.push("Wave01 assignment cleanupAuthorizedRows must be 0");
    if (wave01Assignment.wave01ExecutableRows !== 0) failures.push("Wave01 assignment executableRows must be 0");
  }

  const markdown = readText(paths.markdown);
  if (markdown.includes("undefined")) failures.push("packet markdown contains undefined");
  if (!markdown.includes("This is assignment evidence only.")) failures.push("packet markdown missing non-authorization boundary");
  if (!markdown.includes("Completion audit:")) failures.push("packet markdown missing completion audit summary");
  if (!markdown.includes("latest-A25-wave01-governance-frontier-readiness.json")) failures.push("packet markdown missing Wave01 frontier evidence");
  if (markdown.includes("7 uncovered package-worktree rows")) failures.push("packet markdown has stale Wave01 uncovered-row instruction");
  if (markdown.includes("7 package-only dirty entries need owner-approved package resync authorization")) failures.push("packet markdown has stale Wave01 authorization blocker");
  if (!markdown.includes("six A25 artifact-clean rows are owner-authorized but still need a separate execution instruction")) failures.push("packet markdown missing current Wave01 artifact-clean frontier action");
  if (!markdown.includes("Keep wave01-resync-01-tsconfig-json held")) failures.push("packet markdown missing tsconfig hold action");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    assignments: packet.summary?.assignments ?? null,
    incompleteRequirements: packet.summary?.incompleteRequirements ?? null,
    incompletePlanTasks: packet.summary?.incompletePlanTasks ?? null,
    cleanupAuthorizedRows: packet.summary?.cleanupAuthorizedRows ?? null,
    executableRows: packet.summary?.executableRows ?? null,
    failures
  });
}

main();
