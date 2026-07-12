#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"], process.cwd());
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

const paths = {
  plan: "coordination/release-intake/2026-06-30-A25-dirty-worktree-remediation-plan.md",
  dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
  unmappedRuntime: "coordination/release-intake/latest-A25-unmapped-runtime-owner-proposals.json",
  unmappedManual: "coordination/release-intake/latest-A25-unmapped-manual-owner-proposals.json",
  physicalQueue: "coordination/release-intake/latest-A25-physical-closure-authorization-queue.json",
  finalStateLedger: "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json",
  finalActionRunbook: "coordination/release-intake/latest-A25-dirty-worktree-final-state-action-runbook.json",
  wave01Frontier: "coordination/release-intake/latest-A25-wave01-governance-frontier-readiness.json",
  recurrenceGate: "coordination/release-intake/latest-A25-dirty-worktree-recurrence-prevention-current-gate.json",
  noDirtyRootDeployEvidence: "coordination/release-intake/latest-A25-no-dirty-root-deploy-evidence.json",
  noDirtyRootDeployEvidenceMd: "coordination/release-intake/latest-A25-no-dirty-root-deploy-evidence.md",
  ownerInputActionPacket: "coordination/release-intake/latest-A25-owner-input-action-packet.json",
  latestJson: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.json",
  latestMd: "coordination/release-intake/latest-A25-dirty-worktree-remediation-completion-audit.md",
  datedJson: `coordination/release-intake/${date}-A25-dirty-worktree-remediation-completion-audit.json`,
  datedMd: `coordination/release-intake/${date}-A25-dirty-worktree-remediation-completion-audit.md`
};

const requirementChecks = [
  {
    id: "root-status-clean",
    label: "Root git status is clean",
    command: ["git", "status", "--short"],
    evaluate: ({ rootStatusEntries }) => rootStatusEntries === 0,
    evidence: ["git status --short"]
  },
  {
    id: "dirty-map-current-and-zero",
    label: "Dirty map is current and reports zero expanded entries",
    command: ["npm", "run", "release:dirty-map", "--", "--assert-current", "--max-age-minutes", "60"],
    evaluate: ({ command, dirtyMap }) => command.passed && dirtyMap.statusCounts.expandedStatusEntries === 0,
    evidence: ["npm run release:dirty-map -- --assert-current --max-age-minutes 60", paths.dirtyMap]
  },
  {
    id: "release-source-clean",
    label: "A22 release-source clean gate passes",
    command: ["node", "coordination/release-intake/assert-release-source-clean.mjs"],
    evaluate: ({ command }) => command.passed,
    evidence: ["node coordination/release-intake/assert-release-source-clean.mjs"]
  },
  {
    id: "strict-worktree-lifecycle",
    label: "A25 strict worktree lifecycle gate passes",
    command: ["node", "coordination/release-intake/assert-worktree-lifecycle.mjs", "--strict"],
    deferWhenValidationHoldActive: true,
    evaluate: ({ command }) => command.passed,
    evidence: ["node coordination/release-intake/assert-worktree-lifecycle.mjs --strict"]
  },
  {
    id: "owner-pathspecs-current",
    label: "A25 owner pathspecs are current",
    command: ["node", "coordination/release-intake/assert-owner-pathspecs-current.mjs"],
    evaluate: ({ command }) => command.passed,
    evidence: ["node coordination/release-intake/assert-owner-pathspecs-current.mjs"]
  },
  {
    id: "effective-owner-overlay-current",
    label: "A25 effective owner overlay is current",
    command: ["node", "coordination/release-intake/assert-effective-owner-overlay-current.mjs"],
    evaluate: ({ command }) => command.passed,
    evidence: ["node coordination/release-intake/assert-effective-owner-overlay-current.mjs"]
  },
  {
    id: "unmapped-runtime-zero",
    label: "A25 unmapped runtime proposals are current with zero unmapped runtime paths",
    command: ["node", "coordination/release-intake/assert-unmapped-owner-proposals-current.mjs"],
    evaluate: ({ command, unmappedRuntime }) => command.passed && (unmappedRuntime.sourceCount ?? 0) === 0,
    evidence: ["node coordination/release-intake/assert-unmapped-owner-proposals-current.mjs", paths.unmappedRuntime]
  },
  {
    id: "unmapped-manual-zero",
    label: "A25 unmapped manual proposals are current with zero unmapped manual paths",
    command: ["node", "coordination/release-intake/assert-unmapped-manual-proposals-current.mjs"],
    evaluate: ({ command, unmappedManual }) => command.passed && (unmappedManual.sourceCount ?? 0) === 0,
    evidence: ["node coordination/release-intake/assert-unmapped-manual-proposals-current.mjs", paths.unmappedManual]
  },
  {
    id: "lifecycle-decision-requests-current",
    label: "A25 lifecycle decision requests are current",
    command: ["node", "coordination/release-intake/assert-lifecycle-decision-requests-current.mjs"],
    evaluate: ({ command }) => command.passed,
    evidence: ["node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs"]
  },
  {
    id: "owner-approval-matrix-current",
    label: "A25 owner approval matrix is current",
    command: ["node", "coordination/release-intake/assert-owner-approval-matrix-current.mjs"],
    evaluate: ({ command }) => command.passed,
    evidence: ["node coordination/release-intake/assert-owner-approval-matrix-current.mjs"]
  },
  {
    id: "lifecycle-closure-runbook-current",
    label: "A25 lifecycle closure runbook is current",
    command: ["node", "coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs"],
    evaluate: ({ command }) => command.passed,
    evidence: ["node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs"]
  },
  {
    id: "final-state-recorded",
    label: "Every dirty package/lifecycle row has a recorded final state",
    command: ["node", "coordination/release-intake/assert-dirty-worktree-final-state-ledger-current.mjs"],
    evaluate: ({ command, finalStateLedger }) => command.passed && (finalStateLedger.summary?.pending ?? finalStateLedger.pending ?? 0) === 0 && (finalStateLedger.summary?.invalid ?? finalStateLedger.invalid ?? 0) === 0,
    evidence: ["node coordination/release-intake/assert-dirty-worktree-final-state-ledger-current.mjs", paths.finalStateLedger]
  },
  {
    id: "no-dirty-root-deploy-evidence",
    label: "No preview or production deploy used the dirty root",
    command: ["node", "coordination/release-intake/assert-no-dirty-root-deploy-evidence-current.mjs"],
    evaluate: ({ command, noDirtyRootDeployEvidence }) => command.passed && noDirtyRootDeployEvidence.passed === true,
    evidence: [
      "node coordination/release-intake/assert-no-dirty-root-deploy-evidence-current.mjs",
      paths.noDirtyRootDeployEvidence,
      paths.noDirtyRootDeployEvidenceMd
    ]
  }
];

const planTasks = [
  { id: "task-1-governance", label: "Task 1 governance artifacts", source: "requirements", required: [
    "owner-pathspecs-current",
    "effective-owner-overlay-current",
    "lifecycle-decision-requests-current",
    "owner-approval-matrix-current",
    "lifecycle-closure-runbook-current"
  ] },
  { id: "task-2-unmapped", label: "Task 2 unmapped ownership", source: "requirements", required: ["unmapped-runtime-zero", "unmapped-manual-zero"] },
  { id: "task-3-wave01", label: "Task 3 governance/release-hygiene package closure", source: "wave-frontier", wavePath: "coordination/release-intake/latest-A25-wave01-governance-readiness.json", frontierPath: paths.wave01Frontier },
  { id: "task-4-wave02", label: "Task 4 shared contract/backend package closure", source: "wave", wavePath: "coordination/release-intake/latest-A25-wave02-shared-contract-readiness.json" },
  { id: "task-5-waves03-05", label: "Task 5 runtime owner package closure", source: "waves", wavePaths: [
    "coordination/release-intake/latest-A25-wave03-shell-dashboard-roadmap-readiness.json",
    "coordination/release-intake/latest-A25-wave04-practice-lesson-content-readiness.json",
    "coordination/release-intake/latest-A25-wave05-visualization-ai-runtime-readiness.json"
  ] },
  { id: "task-6-content-qa", label: "Task 6 content/RAG/QA evidence closure", source: "waves", wavePaths: [
    "coordination/release-intake/latest-A25-wave04-practice-lesson-content-readiness.json",
    "coordination/release-intake/latest-A25-wave05-visualization-ai-runtime-readiness.json"
  ] },
  { id: "task-7-root-disposition", label: "Task 7 root dispositions", source: "action-runbook" },
  { id: "task-8-linked-worktrees", label: "Task 8 linked worktree lifecycle closure", source: "requirement", required: ["strict-worktree-lifecycle"] },
  { id: "task-9-final-release-source", label: "Task 9 final release-source verification", source: "requirements", required: ["root-status-clean", "dirty-map-current-and-zero", "release-source-clean", "strict-worktree-lifecycle"] },
  { id: "task-10-recurrence", label: "Task 10 recurrence prevention", source: "recurrence-gate" }
];

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function compact(value, maxLines = 18) {
  const lines = String(value ?? "").trim().split("\n").filter(Boolean);
  if (lines.length <= maxLines) return lines;
  const head = Math.floor(maxLines / 2);
  return [...lines.slice(0, head), `... ${lines.length - maxLines} lines omitted ...`, ...lines.slice(-(maxLines - head))];
}

function runCommand(command) {
  if (!command) return null;
  try {
    const stdout = execFileSync(command[0], command.slice(1), {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { command: command.join(" "), status: 0, passed: true, stdout: compact(stdout), stderr: [] };
  } catch (error) {
    return {
      command: command.join(" "),
      status: typeof error?.status === "number" ? error.status : 1,
      passed: false,
      stdout: compact(error?.stdout?.toString?.() ?? ""),
      stderr: compact(error?.stderr?.toString?.() ?? "", 30)
    };
  }
}

function validationHoldActive(validationHold) {
  return validationHold?.status === "waiting-for-owner-compose-deletion-confirmation";
}

function readContext() {
  const rootStatus = runCommand(["git", "status", "--short"]);
  const rootStatusEntries = execFileSync("git", ["status", "--short"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).split("\n").filter(Boolean).length;
  return {
    dirtyMap: readJson(paths.dirtyMap),
    unmappedRuntime: readJson(paths.unmappedRuntime),
    unmappedManual: readJson(paths.unmappedManual),
    physicalQueue: readJson(paths.physicalQueue),
    finalStateLedger: readJson(paths.finalStateLedger),
    finalActionRunbook: readJson(paths.finalActionRunbook),
    recurrenceGate: readJson(paths.recurrenceGate),
    noDirtyRootDeployEvidence: readJson(paths.noDirtyRootDeployEvidence),
    ownerInputActionPacket: readJson(paths.ownerInputActionPacket),
    rootStatus,
    rootStatusEntries
  };
}

function evaluateRequirements(context) {
  return requirementChecks.map((item) => {
    if (item.deferWhenValidationHoldActive && validationHoldActive(context.ownerInputActionPacket.validationHold)) {
      return {
        id: item.id,
        label: item.label,
        status: "incomplete",
        passed: false,
        command: {
          command: item.command.join(" "),
          status: null,
          passed: false,
          deferred: true,
          deferredReason: context.ownerInputActionPacket.validationHold.reason
        },
        evidence: item.evidence
      };
    }
    const command = runCommand(item.command);
    const passed = Boolean(item.evaluate({ ...context, command }));
    return {
      id: item.id,
      label: item.label,
      status: item.statusOverride ?? (passed ? "complete" : "incomplete"),
      passed,
      command,
      evidence: item.evidence
    };
  });
}

function waveTask(task) {
  const waves = (task.wavePaths ?? [task.wavePath]).map(readJson);
  const ready = waves.every((wave) => wave.commitReady === true || wave.finalClosureReady === true);
  return {
    id: task.id,
    label: task.label,
    status: ready ? "complete" : "incomplete",
    evidence: task.wavePaths ?? [task.wavePath],
    blockingReasons: waves.flatMap((wave) => wave.blockingReasons ?? [])
  };
}

function waveFrontierTask(task) {
  const wave = readJson(task.wavePath);
  const frontier = fs.existsSync(path.join(root, task.frontierPath)) ? readJson(task.frontierPath) : null;
  if (frontier && frontier.dirtyMapStatusSignature === wave.dirtyMapStatusSignature && frontier.expandedStatusEntries === wave.expandedStatusEntries) {
    return {
      id: task.id,
      label: task.label,
      status: frontier.commitReady === true ? "complete" : "incomplete",
      evidence: [task.wavePath, task.frontierPath],
      blockingReasons: frontier.normalizedBlockingReasons ?? []
    };
  }
  return {
    id: task.id,
    label: task.label,
    status: wave.commitReady === true ? "complete" : "incomplete",
    evidence: [task.wavePath],
    blockingReasons: wave.blockingReasons ?? []
  };
}

function evaluateTask(task, requirementsById, context, aggregateCurrent) {
  if (task.source === "wave-frontier") return waveFrontierTask(task);
  if (task.source === "wave" || task.source === "waves") return waveTask(task);
  if (task.source === "requirements" || task.source === "requirement") {
    const required = task.required.map((id) => requirementsById.get(id));
    return {
      id: task.id,
      label: task.label,
      status: required.every((item) => item?.passed) ? "complete" : "incomplete",
      evidence: required.flatMap((item) => item?.evidence ?? []),
      blockingReasons: required.filter((item) => !item?.passed).map((item) => item?.label)
    };
  }
  if (task.source === "aggregate-currentness") {
    return {
      id: task.id,
      label: task.label,
      status: aggregateCurrent.passed ? "complete" : "incomplete",
      evidence: ["node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs"],
      blockingReasons: aggregateCurrent.passed ? [] : ["A25 aggregate currentness failed"]
    };
  }
  if (task.source === "action-runbook") {
    const executable = context.finalActionRunbook.summary?.executableNow ?? 0;
    const total = context.finalActionRunbook.summary?.total ?? 0;
    return {
      id: task.id,
      label: task.label,
      status: executable === 0 && total > 0 ? "blocked" : "incomplete",
      evidence: [paths.finalActionRunbook],
      blockingReasons: ["Root dispositions are represented as blocker rows; no cleanup-authorized or executable root action exists."]
    };
  }
  if (task.source === "recurrence-gate") {
    const passed = context.recurrenceGate.result === "pass";
    return {
      id: task.id,
      label: task.label,
      status: passed ? "complete" : "incomplete",
      evidence: [paths.recurrenceGate],
      blockingReasons: passed ? [] : context.recurrenceGate.failures ?? ["recurrence gate failed"]
    };
  }
  return { id: task.id, label: task.label, status: "unknown", evidence: [], blockingReasons: ["unknown task source"] };
}

function markdown(payload) {
  const reqRows = payload.requirements.map((row) => `| ${row.id} | ${row.status} | ${row.command?.status ?? "n/a"} | ${row.label} |`).join("\n");
  const taskRows = payload.planTasks.map((row) => `| ${row.id} | ${row.status} | ${row.label} | ${row.blockingReasons.slice(0, 3).join("; ") || "none"} |`).join("\n");
  const safeValidationCommands = payload.validationHold.safePostInputValidationCommands.map((command) => `- \`${command}\``).join("\n") || "- none";
  const deferredValidationCommands = payload.validationHold.deferredAggregateValidationCommands.map((command) => `- \`${command}\``).join("\n") || "- none";
  return `# A25 Dirty-Worktree Remediation Completion Audit

Generated: ${payload.generatedAt}

Plan: \`${paths.plan}\`

Dirty map signature: \`${payload.dirtyMapStatusSignature}\`

Expanded dirty entries: ${payload.expandedStatusEntries}

This is audit evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup.

## Result

- Complete: ${payload.complete ? "yes" : "no"}
- Requirements complete: ${payload.summary.completedRequirements}/${payload.summary.totalRequirements}
- Plan tasks complete: ${payload.summary.completedPlanTasks}/${payload.summary.totalPlanTasks}
- Root status entries: ${payload.rootStatusEntries}
- Owner package approvals: ${payload.physicalQueue.summary.ownerPackageApprovals}
- Physical lifecycle approvals: ${payload.physicalQueue.summary.physicalLifecycleApprovals}
- Validation hold: ${payload.validationHold.status}
- Executable rows: ${payload.physicalQueue.summary.executableRows}
- Cleanup-authorized rows: ${payload.physicalQueue.summary.cleanupAuthorizedRows}

## Validation Hold

- Status: ${payload.validationHold.status}
- Active owner worktree: \`${payload.validationHold.activeWorktreePath}\`
- Reason: ${payload.validationHold.reason}
- Resume condition: ${payload.validationHold.resumeCondition}

Safe post-input validation commands:

${safeValidationCommands}

Deferred aggregate validation commands:

${deferredValidationCommands}

## Completion Requirements

| Requirement | Status | Command status | Evidence |
| --- | --- | ---: | --- |
${reqRows}

## Plan Tasks

| Task | Status | Scope | Blocking reasons |
| --- | --- | --- | --- |
${taskRows}
`;
}

function main() {
  const context = readContext();
  const requirements = evaluateRequirements(context);
  const requirementsById = new Map(requirements.map((item) => [item.id, item]));
  const planTaskRows = planTasks.map((task) => evaluateTask(task, requirementsById, context, { passed: null, status: null, command: "not evaluated to avoid self-reference" }));
  const complete = requirements.every((item) => item.passed) && planTaskRows.every((item) => item.status === "complete");
  const validationHold = {
    status: context.ownerInputActionPacket.validationHold?.status ?? "missing",
    activeWorktreePath: context.ownerInputActionPacket.validationHold?.activeWorktreePath ?? "",
    reason: context.ownerInputActionPacket.validationHold?.reason ?? "",
    resumeCondition: context.ownerInputActionPacket.validationHold?.resumeCondition ?? "",
    safePostInputValidationCommands: context.ownerInputActionPacket.nextValidationCommands ?? [],
    deferredAggregateValidationCommands: context.ownerInputActionPacket.deferredValidationCommands ?? []
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    dirtyMapStatusSignature: context.dirtyMap.statusSignature,
    expandedStatusEntries: context.dirtyMap.statusCounts.expandedStatusEntries,
    rootStatusEntries: context.rootStatusEntries,
    complete,
    summary: {
      totalRequirements: requirements.length,
      completedRequirements: requirements.filter((item) => item.passed).length,
      incompleteRequirements: requirements.filter((item) => !item.passed).length,
      totalPlanTasks: planTaskRows.length,
      completedPlanTasks: planTaskRows.filter((item) => item.status === "complete").length,
      incompletePlanTasks: planTaskRows.filter((item) => item.status !== "complete").length
    },
    physicalQueue: {
      summary: context.physicalQueue.summary,
      cleanupAuthorized: context.physicalQueue.cleanupAuthorized
    },
    finalStateLedger: {
      summary: context.finalStateLedger.summary ?? {
        entries: context.finalStateLedger.entries,
        pending: context.finalStateLedger.pending,
        approved: context.finalStateLedger.approved,
        invalid: context.finalStateLedger.invalid
      }
    },
    aggregateCurrentness: {
      passed: null,
      status: null,
      command: "not evaluated inside completion audit generator to avoid self-reference"
    },
    validationHold,
    requirements,
    planTasks: planTaskRows
  };

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  write(paths.latestJson, json);
  write(paths.datedJson, json);
  const md = markdown(payload);
  write(paths.latestMd, md);
  write(paths.datedMd, md);
  console.log(JSON.stringify({
    latestJson: paths.latestJson,
    latestMarkdown: paths.latestMd,
    complete: payload.complete,
    completedRequirements: payload.summary.completedRequirements,
    totalRequirements: payload.summary.totalRequirements,
    completedPlanTasks: payload.summary.completedPlanTasks,
    totalPlanTasks: payload.summary.totalPlanTasks,
    expandedStatusEntries: payload.expandedStatusEntries,
    rootStatusEntries: payload.rootStatusEntries,
    validationHoldStatus: payload.validationHold.status
  }, null, 2));
}

main();
