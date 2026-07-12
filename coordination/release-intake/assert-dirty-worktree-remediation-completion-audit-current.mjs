#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const outputPath = path.join(root, "coordination", "release-intake", "latest-A25-dirty-worktree-remediation-completion-audit-current-gate.json");
const json = process.argv.includes("--json");

const paths = {
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  audit: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  auditMd: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.md",
  noDirtyRootDeployEvidence: "coordination/release-intake/latest-A25-no-dirty-root-deploy-evidence.json",
  noDirtyRootDeployEvidenceMd: "coordination/release-intake/latest-A25-no-dirty-root-deploy-evidence.md",
  physicalQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  finalStateLedger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  ownerInputActionPacket: "coordination/release-intake/latest-A25-owner-input-action-packet.json"
};

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
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

function runStatus(command) {
  try {
    execFileSync(command[0], command.slice(1), { cwd: root, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, passed: true };
  } catch (error) {
    return { status: typeof error?.status === "number" ? error.status : 1, passed: false };
  }
}

function validationHoldActive(validationHold) {
  return validationHold?.status === "waiting-for-owner-compose-deletion-confirmation";
}

function main() {
  const failures = [];
  for (const requiredPath of Object.values(paths)) {
    if (!exists(requiredPath)) failures.push(`missing required file: ${requiredPath}`);
  }
  if (failures.length > 0) return finish({ failures, complete: false });

  const dirtyMap = readJson(paths.dirtyMap);
  const audit = readJson(paths.audit);
  const physicalQueue = readJson(paths.physicalQueue);
  const finalStateLedger = readJson(paths.finalStateLedger);
  const noDirtyRootDeployEvidence = readJson(paths.noDirtyRootDeployEvidence);
  const ownerInputActionPacket = readJson(paths.ownerInputActionPacket);

  const rootStatusEntries = git(["status", "--short"], root).split("\n").filter(Boolean).length;
  if (audit.dirtyMapStatusSignature !== dirtyMap.statusSignature) failures.push("audit dirty-map signature is stale");
  if (audit.expandedStatusEntries !== dirtyMap.statusCounts.expandedStatusEntries) failures.push("audit expanded dirty entry count is stale");
  if (audit.rootStatusEntries !== rootStatusEntries) failures.push("audit root status entry count is stale");
  if (JSON.stringify(audit.physicalQueue?.summary ?? null) !== JSON.stringify(physicalQueue.summary ?? null)) failures.push("audit physical queue summary is stale");
  const ledgerSummary = finalStateLedger.summary ?? {
    entries: finalStateLedger.entries,
    pending: finalStateLedger.pending,
    approved: finalStateLedger.approved,
    invalid: finalStateLedger.invalid
  };
  if (JSON.stringify(audit.finalStateLedger?.summary ?? null) !== JSON.stringify(ledgerSummary)) failures.push("audit final-state ledger summary is stale");
  if (JSON.stringify(audit.validationHold ?? null) !== JSON.stringify({
    status: ownerInputActionPacket.validationHold?.status ?? "missing",
    activeWorktreePath: ownerInputActionPacket.validationHold?.activeWorktreePath ?? "",
    reason: ownerInputActionPacket.validationHold?.reason ?? "",
    resumeCondition: ownerInputActionPacket.validationHold?.resumeCondition ?? "",
    safePostInputValidationCommands: ownerInputActionPacket.nextValidationCommands ?? [],
    deferredAggregateValidationCommands: ownerInputActionPacket.deferredValidationCommands ?? []
  })) {
    failures.push("audit validation hold is stale");
  }
  if (validationHoldActive(audit.validationHold)) {
    if ((audit.validationHold?.safePostInputValidationCommands ?? []).length !== 5) failures.push("audit validation hold safe command count is stale");
    if ((audit.validationHold?.deferredAggregateValidationCommands ?? []).length !== 8) failures.push("audit validation hold deferred command count is stale");
  }

  const requirementCommands = new Map([
    ["dirty-map-current-and-zero", ["npm", "run", "release:dirty-map", "--", "--assert-current", "--max-age-minutes", "60"]],
    ["release-source-clean", ["node", "coordination/release-intake/assert-release-source-clean.mjs"]],
    ["strict-worktree-lifecycle", ["node", "coordination/release-intake/assert-worktree-lifecycle.mjs", "--strict"]],
    ["owner-pathspecs-current", ["node", "coordination/release-intake/assert-owner-pathspecs-current.mjs"]],
    ["effective-owner-overlay-current", ["node", "coordination/release-intake/assert-effective-owner-overlay-current.mjs"]],
    ["unmapped-runtime-zero", ["node", "coordination/release-intake/assert-unmapped-owner-proposals-current.mjs"]],
    ["unmapped-manual-zero", ["node", "coordination/release-intake/assert-unmapped-manual-proposals-current.mjs"]],
    ["lifecycle-decision-requests-current", ["node", "coordination/release-intake/assert-lifecycle-decision-requests-current.mjs"]],
    ["owner-approval-matrix-current", ["node", "coordination/release-intake/assert-owner-approval-matrix-current.mjs"]],
    ["lifecycle-closure-runbook-current", ["node", "coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs"]],
    ["final-state-recorded", ["node", "coordination/release-intake/assert-dirty-worktree-final-state-ledger-current.mjs"]],
    ["no-dirty-root-deploy-evidence", ["node", "coordination/release-intake/assert-no-dirty-root-deploy-evidence-current.mjs"]]
  ]);
  const requirementsById = new Map((audit.requirements ?? []).map((row) => [row.id, row]));
  for (const [id, command] of requirementCommands) {
    const row = requirementsById.get(id);
    if (!row) {
      failures.push(`missing requirement row: ${id}`);
      continue;
    }
    if (id === "strict-worktree-lifecycle" && validationHoldActive(audit.validationHold)) {
      if (row.command?.deferred !== true) failures.push("strict-worktree-lifecycle: command must be deferred while validation hold is active");
      if (row.command?.status !== null) failures.push("strict-worktree-lifecycle: deferred command status must be null");
      if (row.command?.passed !== false) failures.push("strict-worktree-lifecycle: deferred command passed flag must be false");
      if (row.passed !== false || row.status !== "incomplete") failures.push("strict-worktree-lifecycle: deferred row must remain incomplete");
      continue;
    }
    const expected = runStatus(command);
    if (row.command?.status !== expected.status) failures.push(`${id}: command status is stale`);
    if (row.command?.passed !== expected.passed) failures.push(`${id}: command passed flag is stale`);
  }

  const rootCleanRow = requirementsById.get("root-status-clean");
  if (!rootCleanRow) failures.push("missing requirement row: root-status-clean");
  else if (rootCleanRow.passed !== (rootStatusEntries === 0)) failures.push("root-status-clean: passed flag is stale");
  const noDeployRow = requirementsById.get("no-dirty-root-deploy-evidence");
  if (!noDeployRow) failures.push("missing requirement row: no-dirty-root-deploy-evidence");
  else {
    const expectedNoDeployPassed = noDirtyRootDeployEvidence.passed === true && noDeployRow.command?.passed === true;
    if (noDeployRow.passed !== expectedNoDeployPassed) failures.push("no-dirty-root-deploy-evidence: passed flag is stale");
    if (noDeployRow.status !== (expectedNoDeployPassed ? "complete" : "incomplete")) {
      failures.push("no-dirty-root-deploy-evidence: status is stale");
    }
    if (!(noDeployRow.evidence ?? []).includes(paths.noDirtyRootDeployEvidence)) {
      failures.push("no-dirty-root-deploy-evidence: missing JSON evidence path");
    }
  }

  const expectedComplete = (audit.requirements ?? []).every((item) => item.passed) && (audit.planTasks ?? []).every((item) => item.status === "complete");
  if (audit.complete !== expectedComplete) failures.push("audit complete flag is stale");
  const expectedRequirementComplete = (audit.requirements ?? []).filter((item) => item.passed).length;
  if (audit.summary?.completedRequirements !== expectedRequirementComplete) failures.push("audit completed requirement count is stale");
  const expectedTaskComplete = (audit.planTasks ?? []).filter((item) => item.status === "complete").length;
  if (audit.summary?.completedPlanTasks !== expectedTaskComplete) failures.push("audit completed plan task count is stale");

  const markdown = readText(paths.auditMd);
  if (markdown.includes("undefined")) failures.push("audit markdown contains undefined");
  if (!markdown.includes("audit evidence only")) failures.push("audit markdown missing non-authorization boundary");
  if (!markdown.includes("Validation Hold")) failures.push("audit markdown missing validation hold section");
  if (!markdown.includes("waiting-for-owner-compose-deletion-confirmation")) failures.push("audit markdown missing validation hold status");

  finish({
    checkedAt: new Date().toISOString(),
    dirtyMapStatusSignature: dirtyMap.statusSignature,
    expandedStatusEntries: dirtyMap.statusCounts.expandedStatusEntries,
    complete: audit.complete,
    completedRequirements: audit.summary?.completedRequirements ?? null,
    totalRequirements: audit.summary?.totalRequirements ?? null,
    completedPlanTasks: audit.summary?.completedPlanTasks ?? null,
    totalPlanTasks: audit.summary?.totalPlanTasks ?? null,
    validationHoldStatus: audit.validationHold?.status ?? null,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 dirty-worktree remediation completion-audit currentness gate");
    console.log(`Complete: ${payload.complete ? "yes" : "no"}`);
    console.log(`Failures: ${payload.failures.length}`);
  }
  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree remediation completion-audit currentness gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
