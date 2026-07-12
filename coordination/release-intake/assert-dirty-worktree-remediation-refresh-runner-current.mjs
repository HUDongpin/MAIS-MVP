#!/usr/bin/env node
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const outputPath = path.join(outDir, "latest-A25-dirty-worktree-remediation-refresh-runner-current-gate.json");
const json = process.argv.includes("--json");

const runnerPath = "coordination/release-intake/refresh-dirty-worktree-remediation-evidence.mjs";
const aggregateGatePath = "coordination/release-intake/assert-dirty-worktree-remediation-current.mjs";

const requiredCommands = [
  "node coordination/release-intake/assert-dirty-worktree-remediation-refresh-runner-current.mjs",
  "npm run release:dirty-map -- --reason",
  "node coordination/release-intake/worktree-hygiene-dashboard.mjs",
  "node coordination/release-intake/generate-effective-owner-overlay.mjs",
  "node coordination/release-intake/generate-effective-disposition-queue.mjs",
  "node coordination/release-intake/generate-lifecycle-decision-ledger.mjs",
  "node coordination/release-intake/generate-lifecycle-decision-requests.mjs",
  "node coordination/release-intake/generate-lifecycle-closure-runbook.mjs",
  "node coordination/release-intake/generate-owner-approval-matrix.mjs",
  "node coordination/release-intake/generate-physical-lifecycle-approval-requests.mjs",
  "node coordination/release-intake/generate-owner-package-approval-requests.mjs",
  "node coordination/release-intake/generate-dirty-worktree-final-state-selection-template.mjs",
  "node coordination/release-intake/generate-dirty-worktree-final-state-owner-approved-selection.mjs",
  "node coordination/release-intake/refresh-linked-worktree-archive-evidence.mjs",
  "node coordination/release-intake/assert-physical-lifecycle-blocker-coverage-current.mjs",
  "node coordination/release-intake/generate-remaining-strict-blocker-authorization-packet.mjs",
  "node coordination/release-intake/generate-physical-closure-authorization-queue.mjs",
  "node coordination/release-intake/generate-a25-strict-worktree-lifecycle-blocker-evidence.mjs",
  "node coordination/release-intake/assert-a25-strict-worktree-lifecycle-blocker-evidence-current.mjs",
  "node coordination/release-intake/generate-dirty-worktree-closure-execution-sequence.mjs",
  "node coordination/release-intake/generate-wave01-governance-readiness.mjs",
  "node coordination/release-intake/generate-wave01-typecheck-blocker-routing.mjs",
  "node coordination/release-intake/assert-wave01-typecheck-blocker-routing-current.mjs",
  "node coordination/release-intake/generate-wave01-typecheck-owner-handoff-packet.mjs",
  "node coordination/release-intake/assert-wave01-typecheck-owner-handoff-packet-current.mjs",
  "node coordination/release-intake/generate-wave01-typecheck-owner-assignment-packet.mjs",
  "node coordination/release-intake/assert-wave01-typecheck-owner-assignment-packet-current.mjs",
  "node coordination/release-intake/generate-wave01-package-resync-execution-packet.mjs",
  "node coordination/release-intake/assert-wave01-package-resync-execution-packet-current.mjs",
  "node coordination/release-intake/generate-wave01-package-resync-evidence-pack.mjs",
  "node coordination/release-intake/assert-wave01-package-resync-evidence-pack-current.mjs",
  "node coordination/release-intake/generate-wave01-package-resync-owner-authorization-template.mjs",
  "node coordination/release-intake/assert-wave01-package-resync-owner-authorization-template-current.mjs",
  "node coordination/release-intake/generate-wave01-package-resync-owner-authorizations-starter.mjs",
  "node coordination/release-intake/assert-wave01-package-resync-owner-authorizations-starter-current.mjs",
  "node coordination/release-intake/generate-owner-input-scaffold-files.mjs --apply --scope",
  "node coordination/release-intake/assert-wave01-package-resync-owner-authorizations-current.mjs",
  "node coordination/release-intake/generate-wave01-package-resync-owner-review-capsule.mjs",
  "node coordination/release-intake/assert-wave01-package-resync-owner-review-capsule-current.mjs",
  "node coordination/release-intake/generate-wave01-a25-artifact-clean-owner-approval-capsule.mjs",
  "node coordination/release-intake/assert-wave01-a25-artifact-clean-owner-approval-capsule-current.mjs",
  "node coordination/release-intake/generate-wave01-package-resync-owner-acceptance-docket.mjs",
  "node coordination/release-intake/assert-wave01-package-resync-owner-acceptance-docket-current.mjs",
  "node coordination/release-intake/generate-wave05-visualization-ai-runtime-readiness.mjs",
  "node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs",
  "node coordination/release-intake/generate-owner-package-blocker-routing.mjs",
  "node coordination/release-intake/generate-owner-package-blocker-assignment-packet.mjs",
  "node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs",
  "node coordination/release-intake/generate-typecheck-critical-path-frontier.mjs",
  "node coordination/release-intake/assert-typecheck-critical-path-frontier-current.mjs",
  "node coordination/release-intake/generate-root-typecheck-status.mjs",
  "node coordination/release-intake/assert-root-typecheck-status-current.mjs",
  "node coordination/release-intake/generate-owner-package-blocker-report-starter.mjs",
  "node coordination/release-intake/assert-owner-package-blocker-report-starter-current.mjs",
  "node coordination/release-intake/generate-owner-package-blocker-report-records-template.mjs",
  "node coordination/release-intake/assert-owner-package-blocker-report-records-current.mjs",
  "node coordination/release-intake/generate-owner-package-blocker-reports.mjs",
  "node coordination/release-intake/assert-owner-package-blocker-reports-current.mjs",
  "node coordination/release-intake/generate-a22-generated-artifact-residual-evidence.mjs",
  "node coordination/release-intake/assert-a22-generated-artifact-residual-evidence-current.mjs",
  "node coordination/release-intake/generate-a22-generated-artifact-residual-authorization-packet.mjs",
  "node coordination/release-intake/assert-a22-generated-artifact-residual-authorization-packet-current.mjs",
  "node coordination/release-intake/generate-a22-generated-artifact-residual-acceptance-docket.mjs",
  "node coordination/release-intake/assert-a22-generated-artifact-residual-acceptance-docket-current.mjs",
  "node coordination/release-intake/generate-a22-release-source-clean-blocker-evidence.mjs",
  "node coordination/release-intake/assert-a22-release-source-clean-blocker-evidence-current.mjs",
  "node coordination/release-intake/generate-no-dirty-root-deploy-evidence.mjs",
  "node coordination/release-intake/generate-dirty-worktree-remediation-completion-audit.mjs",
  "node coordination/release-intake/generate-next-owner-approval-packet.mjs",
  "node coordination/release-intake/assert-next-owner-approval-packet-current.mjs",
  "node coordination/release-intake/generate-next-owner-authorizations-starter.mjs",
  "node coordination/release-intake/assert-next-owner-authorizations-starter-current.mjs",
  "node coordination/release-intake/assert-owner-input-scaffold-files-current.mjs",
  "node coordination/release-intake/assert-next-owner-authorizations-current.mjs",
  "node coordination/release-intake/generate-ledger-to-canonical-authorization-bridge.mjs",
  "node coordination/release-intake/assert-ledger-to-canonical-authorization-bridge-current.mjs",
  "node coordination/release-intake/generate-next-owner-authorization-execution-preview.mjs",
  "node coordination/release-intake/assert-next-owner-authorization-execution-preview-current.mjs",
  "node coordination/release-intake/generate-next-owner-authorized-command-manifest.mjs",
  "node coordination/release-intake/assert-next-owner-authorized-command-manifest-current.mjs",
  "node coordination/release-intake/generate-a16-authorized-package-extraction-request.mjs",
  "node coordination/release-intake/assert-a16-authorized-package-extraction-request-current.mjs",
  "node coordination/release-intake/generate-a16-execution-authorization-docket.mjs",
  "node coordination/release-intake/assert-a16-execution-authorization-docket-current.mjs",
  "node coordination/release-intake/generate-a16-pre-execution-validation-report.mjs",
  "node coordination/release-intake/assert-a16-pre-execution-validation-report-current.mjs",
  "node coordination/release-intake/generate-a16-execution-instruction-input-scaffold.mjs",
  "node coordination/release-intake/assert-a16-execution-instruction-input-scaffold-current.mjs",
  "node coordination/release-intake/generate-a16-execution-instruction-owner-input-template.mjs",
  "node coordination/release-intake/assert-a16-execution-instruction-owner-input-current.mjs",
  "node coordination/release-intake/generate-a16-post-extraction-verification-report.mjs",
  "node coordination/release-intake/assert-a16-post-extraction-verification-report-current.mjs",
  "node coordination/release-intake/generate-next-owner-execution-instruction-scaffold.mjs",
  "node coordination/release-intake/assert-next-owner-execution-instructions-current.mjs",
  "node coordination/release-intake/generate-next-owner-execution-instruction-request-packet.mjs",
  "node coordination/release-intake/assert-next-owner-execution-instruction-request-packet-current.mjs",
  "node coordination/release-intake/generate-wave01-artifact-clean-execution-preflight.mjs",
  "node coordination/release-intake/assert-wave01-artifact-clean-execution-preflight-current.mjs",
  "node coordination/release-intake/generate-wave01-artifact-clean-execution-instruction-capsule.mjs",
  "node coordination/release-intake/assert-wave01-artifact-clean-execution-instruction-capsule-current.mjs",
  "node coordination/release-intake/generate-wave01-artifact-clean-guarded-execution-plan.mjs",
  "node coordination/release-intake/assert-wave01-artifact-clean-guarded-execution-plan-current.mjs",
  "node coordination/release-intake/generate-wave01-artifact-clean-batch-execution-instruction-request.mjs",
  "node coordination/release-intake/assert-wave01-artifact-clean-batch-execution-instruction-request-current.mjs",
  "node coordination/release-intake/generate-wave01-artifact-clean-batch-execution-instruction-intake.mjs",
  "node coordination/release-intake/assert-wave01-artifact-clean-batch-execution-instruction-intake-current.mjs",
  "node coordination/release-intake/run-wave01-artifact-clean-execution-instruction-recording.mjs",
  "node coordination/release-intake/assert-wave01-artifact-clean-execution-instruction-recording-current.mjs",
  "node coordination/release-intake/run-wave01-artifact-clean-guarded-execution.mjs",
  "node coordination/release-intake/assert-wave01-artifact-clean-guarded-executor-current.mjs",
  "node coordination/release-intake/generate-wave01-artifact-clean-owner-execution-focus-packet.mjs",
  "node coordination/release-intake/assert-wave01-artifact-clean-owner-execution-focus-packet-current.mjs",
  "node coordination/release-intake/generate-wave01-artifact-clean-post-clean-verification-plan.mjs",
  "node coordination/release-intake/assert-wave01-artifact-clean-post-clean-verification-plan-current.mjs",
  "node coordination/release-intake/generate-next-owner-execution-instruction-acceptance-docket.mjs",
  "node coordination/release-intake/assert-next-owner-execution-instruction-acceptance-docket-current.mjs",
  "node coordination/release-intake/generate-a22-generated-artifact-guarded-cleanup-plan.mjs",
  "node coordination/release-intake/run-a22-generated-artifact-guarded-cleanup.mjs --json",
  "node coordination/release-intake/assert-a22-generated-artifact-guarded-cleanup-current.mjs",
  "node coordination/release-intake/generate-wave01-artifact-clean-execution-instruction-readiness.mjs",
  "node coordination/release-intake/assert-wave01-artifact-clean-execution-instruction-readiness-current.mjs",
  "node coordination/release-intake/generate-wave01-governance-frontier-readiness.mjs",
  "node coordination/release-intake/assert-wave01-governance-frontier-readiness-current.mjs",
  "node coordination/release-intake/generate-a16-extraction-closeout-docket.mjs",
  "node coordination/release-intake/assert-a16-extraction-closeout-docket-current.mjs",
  "node coordination/release-intake/generate-a16-extraction-execution-readiness.mjs",
  "node coordination/release-intake/assert-a16-extraction-execution-readiness-current.mjs",
  "node coordination/release-intake/generate-a16-guarded-extraction-execution-plan.mjs",
  "node coordination/release-intake/assert-a16-guarded-extraction-execution-plan-current.mjs",
  "node coordination/release-intake/run-a16-guarded-extraction.mjs --dry-run",
  "node coordination/release-intake/assert-a16-guarded-extraction-executor-current.mjs",
  "node coordination/release-intake/generate-remaining-completion-blocker-assignment-packet.mjs",
  "node coordination/release-intake/assert-remaining-completion-blocker-assignment-packet-current.mjs",
  "node coordination/release-intake/generate-owner-closure-action-queue.mjs",
  "node coordination/release-intake/assert-owner-closure-action-queue-current.mjs",
  "node coordination/release-intake/generate-next-owner-decision-focus-packet.mjs",
  "node coordination/release-intake/assert-next-owner-decision-focus-packet-current.mjs",
  "node coordination/release-intake/generate-owner-closure-input-readiness.mjs",
  "node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs",
  "node coordination/release-intake/generate-validation-hold-release-confirmation-scaffold.mjs",
  "node coordination/release-intake/assert-validation-hold-release-confirmation-scaffold-current.mjs",
  "node coordination/release-intake/run-validation-hold-release-confirmation-recording.mjs",
  "node coordination/release-intake/assert-validation-hold-release-confirmation-recording-current.mjs",
  "node coordination/release-intake/generate-validation-hold-release-gate.mjs",
  "node coordination/release-intake/assert-validation-hold-release-gate-current.mjs",
  "node coordination/release-intake/generate-validate-frontier-owner-response-packet.mjs",
  "node coordination/release-intake/assert-validate-frontier-owner-response-packet-current.mjs",
  "node coordination/release-intake/generate-validate-frontier-post-response-execution-plan.mjs",
  "node coordination/release-intake/assert-validate-frontier-post-response-execution-plan-current.mjs",
  "node coordination/release-intake/generate-validate-frontier-owner-response-readiness-ledger.mjs",
  "node coordination/release-intake/assert-validate-frontier-owner-response-readiness-ledger-current.mjs",
  "node coordination/release-intake/generate-pending-owner-blocker-report-bundle.mjs",
  "node coordination/release-intake/assert-pending-owner-blocker-report-bundle-current.mjs",
  "node coordination/release-intake/generate-owner-input-action-packet.mjs",
  "node coordination/release-intake/generate-authorization-gap-shrink-map.mjs",
  "node coordination/release-intake/assert-authorization-gap-shrink-map-current.mjs",
  "node coordination/release-intake/generate-next-owner-authorization-focus-batch.mjs",
  "node coordination/release-intake/assert-next-owner-authorization-focus-batch-current.mjs",
  "node coordination/release-intake/generate-authorization-backlog-queue.mjs",
  "node coordination/release-intake/assert-authorization-backlog-queue-current.mjs",
  "node coordination/release-intake/generate-next-owner-authorization-focus-batch-acceptance-docket.mjs",
  "node coordination/release-intake/assert-next-owner-authorization-focus-batch-acceptance-docket-current.mjs",
  "node coordination/release-intake/generate-next-owner-authorization-focus-batch-owner-input-scaffold.mjs",
  "node coordination/release-intake/assert-next-owner-authorization-focus-batch-owner-input-scaffold-current.mjs",
  "node coordination/release-intake/generate-next-owner-authorization-focus-batch-recording-intake.mjs",
  "node coordination/release-intake/assert-next-owner-authorization-focus-batch-recording-intake-current.mjs",
  "node coordination/release-intake/generate-next-owner-authorization-focus-batch-canonical-preview.mjs",
  "node coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-preview-current.mjs",
  "node coordination/release-intake/run-next-owner-authorization-focus-batch-canonical-recording.mjs",
  "node coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-recording-current.mjs",
  "node coordination/release-intake/assert-next-owner-authorization-focus-batch-tail-current.mjs",
  "node coordination/release-intake/assert-next-owner-authorization-stale-apply-guard-current.mjs",
  "node coordination/release-intake/assert-owner-input-action-packet-current.mjs",
  "node coordination/release-intake/generate-ready-candidate-owner-review-capsule.mjs",
  "node coordination/release-intake/assert-ready-candidate-owner-review-capsule-current.mjs",
  "node coordination/release-intake/generate-ready-candidate-owner-acceptance-docket.mjs",
  "node coordination/release-intake/assert-ready-candidate-owner-acceptance-docket-current.mjs",
  "node coordination/release-intake/generate-authorization-round-validation-plan.mjs",
  "node coordination/release-intake/assert-authorization-round-validation-plan-current.mjs",
  "node coordination/release-intake/generate-owner-closure-work-order-bundle.mjs",
  "node coordination/release-intake/assert-owner-closure-work-order-bundle-current.mjs",
  "node coordination/release-intake/generate-dirty-worktree-closure-loop-state.mjs",
  "node coordination/release-intake/assert-dirty-worktree-closure-loop-state-current.mjs",
  "node coordination/release-intake/generate-validate-to-merge-handoff.mjs",
  "node coordination/release-intake/assert-validate-to-merge-handoff-current.mjs",
  "node coordination/release-intake/generate-next-owner-compact-request-bundle.mjs",
  "node coordination/release-intake/assert-next-owner-compact-request-bundle-current.mjs",
  "node coordination/release-intake/assert-next-owner-compact-request-recorder-dry-run-current.mjs",
  "node coordination/release-intake/generate-validate-to-merge-blocker-frontier.mjs",
  "node coordination/release-intake/assert-validate-to-merge-blocker-frontier-current.mjs",
  "node coordination/release-intake/generate-validate-to-merge-exit-criteria.mjs",
  "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
  "node coordination/release-intake/generate-authorization-transition-forecast.mjs",
  "node coordination/release-intake/assert-authorization-transition-forecast-current.mjs",
  "node coordination/release-intake/generate-a25-current-cleanup-status-snapshot.mjs",
  "node coordination/release-intake/assert-a25-current-cleanup-status-snapshot-current.mjs",
  "node coordination/release-intake/generate-seven-step-closure-bridge.mjs",
  "node coordination/release-intake/assert-seven-step-closure-bridge-current.mjs",
  "node coordination/release-intake/generate-a22-clean-release-source-runway.mjs",
  "node coordination/release-intake/assert-a22-clean-release-source-runway-current.mjs",
  "node coordination/release-intake/generate-a22-owner-remediation-candidate-dirty-allowlist.mjs",
  "node coordination/release-intake/assert-a22-owner-remediation-candidate-dirty-allowlist-current.mjs",
  "node coordination/release-intake/generate-a22-clean-source-candidate-promotion-packet.mjs",
  "node coordination/release-intake/assert-a22-clean-source-candidate-promotion-packet-current.mjs",
  "node coordination/release-intake/generate-a22-top-clean-candidate-focused-smoke.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-focused-smoke-current.mjs",
  "node coordination/release-intake/generate-a22-top-clean-candidate-typecheck.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-current.mjs",
  "node coordination/release-intake/generate-a22-top-clean-candidate-typecheck-remediation-routing.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-remediation-routing-current.mjs",
  "node coordination/release-intake/generate-a22-typecheck-remediation-owner-work-orders.mjs",
  "node coordination/release-intake/assert-a22-typecheck-remediation-owner-work-orders-current.mjs",
  "node coordination/release-intake/generate-a22-top-clean-candidate-build-snapshot.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-build-snapshot-current.mjs",
  "node coordination/release-intake/generate-a22-top-clean-candidate-build-blocker-routing.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs",
  "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-plan.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs",
  "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-request.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-request-current.mjs",
  "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs",
  "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs",
  "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs",
  "node coordination/release-intake/run-a22-root-parity-candidate-mutation.mjs",
  "node coordination/release-intake/assert-a22-root-parity-candidate-mutation-current.mjs",
  "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-owner-action-packet.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-packet-current.mjs",
  "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs",
  "node coordination/release-intake/run-a22-root-parity-owner-input-recording.mjs",
  "node coordination/release-intake/assert-a22-root-parity-owner-input-recording-current.mjs",
  "node coordination/release-intake/generate-validate-frontier-owner-input-request-capsule.mjs",
  "node coordination/release-intake/assert-validate-frontier-owner-input-request-capsule-current.mjs",
  "node coordination/release-intake/generate-validate-frontier-transition-forecast.mjs",
  "node coordination/release-intake/assert-validate-frontier-transition-forecast-current.mjs",
  "node coordination/release-intake/generate-validate-frontier-post-input-runway.mjs",
  "node coordination/release-intake/assert-validate-frontier-post-input-runway-current.mjs",
  "node coordination/release-intake/generate-a22-top-clean-candidate-review-packet.mjs",
  "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs",
  "node coordination/release-intake/assert-no-staged-changes.mjs"
];

const forbiddenCommandPatterns = [
  /\bgit add\b/,
  /\bgit commit\b/,
  /\bgit restore\b/,
  /\bgit clean\b/,
  /\bgit reset\b/,
  /\bgit push\b/,
  /\bgit tag\b/,
  /\bgit branch\b/,
  /\bgit worktree remove\b/,
  /\bgit worktree prune\b/,
  /\bvercel deploy\b/,
  /\bvercel --prod\b/,
  /assert-dirty-worktree-remediation-current\.mjs/
];

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

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function commandPlan() {
  const result = spawnSync(process.execPath, [runnerPath, "--list", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    return {
      ok: false,
      status: result.status,
      stderr: result.stderr,
      payload: null
    };
  }
  return {
    ok: true,
    status: 0,
    stderr: "",
    payload: JSON.parse(result.stdout)
  };
}

function includesCommand(commands, needle) {
  return commands.some((command) => command.includes(needle));
}

function commandIndex(commands, needle) {
  return commands.findIndex((command) => command.includes(needle));
}

function commandLastIndex(commands, needle) {
  for (let index = commands.length - 1; index >= 0; index -= 1) {
    if (commands[index].includes(needle)) return index;
  }
  return -1;
}

function requireCommandOrder(failures, commands, before, after, label) {
  const beforeIndex = commandIndex(commands, before);
  const afterIndex = commandIndex(commands, after);
  if (beforeIndex === -1 || afterIndex === -1) {
    failures.push(`runner order check missing command for ${label}`);
    return;
  }
  if (beforeIndex >= afterIndex) {
    failures.push(`runner order invalid for ${label}: ${before} must run before ${after}`);
  }
}

function requireCommandBeforeLast(failures, commands, before, after, label) {
  const beforeIndex = commandIndex(commands, before);
  const afterIndex = commandLastIndex(commands, after);
  if (beforeIndex === -1 || afterIndex === -1) {
    failures.push(`runner order check missing command for ${label}`);
    return;
  }
  if (beforeIndex >= afterIndex) {
    failures.push(`runner order invalid for ${label}: ${before} must run before a later ${after}`);
  }
}

function requireLastCommandOrder(failures, commands, before, after, label) {
  const beforeIndex = commandLastIndex(commands, before);
  const afterIndex = commandLastIndex(commands, after);
  if (beforeIndex === -1 || afterIndex === -1) {
    failures.push(`runner order check missing command for ${label}`);
    return;
  }
  if (beforeIndex >= afterIndex) {
    failures.push(`runner order invalid for ${label}: last ${before} must run before last ${after}`);
  }
}

function commandIndexAfter(commands, marker, needle) {
  const markerIndex = commandIndex(commands, marker);
  if (markerIndex === -1) return -1;
  for (let index = markerIndex + 1; index < commands.length; index += 1) {
    if (commands[index].includes(needle)) return index;
  }
  return -1;
}

function requireCommandAfterMarkerOrder(failures, commands, marker, before, after, label) {
  const markerIndex = commandIndex(commands, marker);
  const beforeIndex = commandIndexAfter(commands, marker, before);
  const afterIndex = commandIndexAfter(commands, marker, after);
  if (markerIndex === -1 || beforeIndex === -1 || afterIndex === -1) {
    failures.push(`runner order check missing command for ${label}`);
    return;
  }
  if (beforeIndex >= afterIndex) {
    failures.push(`runner order invalid for ${label}: ${before} must run after ${marker} and before ${after}`);
  }
}

function main() {
  const failures = [];
  if (!exists(runnerPath)) failures.push(`missing runner: ${runnerPath}`);
  if (!exists(aggregateGatePath)) failures.push(`missing aggregate gate: ${aggregateGatePath}`);
  if (failures.length > 0) return finish({ failures, stepCount: 0 });

  const runnerSource = readText(runnerPath);
  const aggregateSource = readText(aggregateGatePath);
  const listed = commandPlan();
  if (!listed.ok) {
    failures.push(`runner --list failed with status ${listed.status}`);
    if (listed.stderr) failures.push(listed.stderr.trim());
    return finish({ failures, stepCount: 0 });
  }

  const steps = listed.payload.steps ?? [];
  const commands = steps.map((step) => step.command);
  for (const required of requiredCommands) {
    if (!includesCommand(commands, required)) failures.push(`runner missing command: ${required}`);
  }

  const forbiddenMatches = commands.flatMap((command) => (
    forbiddenCommandPatterns
      .filter((pattern) => pattern.test(command))
      .map((pattern) => ({ command, pattern: pattern.toString() }))
  ));
  if (forbiddenMatches.length > 0) {
    for (const match of forbiddenMatches) failures.push(`runner has forbidden command ${match.pattern}: ${match.command}`);
  }

  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs",
    "node coordination/release-intake/generate-typecheck-critical-path-frontier.mjs",
    "owner package blocker assignment current gate before type-check critical path frontier"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-typecheck-critical-path-frontier.mjs",
    "node coordination/release-intake/assert-typecheck-critical-path-frontier-current.mjs",
    "type-check critical path frontier before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-typecheck-critical-path-frontier-current.mjs",
    "node coordination/release-intake/generate-owner-package-blocker-report-starter.mjs",
    "type-check critical path frontier current gate before owner package blocker report starter"
  );
  requireLastCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs",
    "node coordination/release-intake/generate-typecheck-critical-path-frontier.mjs",
    "final owner package blocker assignment current gate before final type-check critical path frontier"
  );
  requireLastCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-typecheck-critical-path-frontier.mjs",
    "node coordination/release-intake/assert-typecheck-critical-path-frontier-current.mjs",
    "final type-check critical path frontier before its final current gate"
  );
  requireLastCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-typecheck-critical-path-frontier-current.mjs",
    "node coordination/release-intake/generate-root-typecheck-status.mjs",
    "final type-check critical path frontier current gate before root type-check status"
  );
  requireLastCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-root-typecheck-status.mjs",
    "node coordination/release-intake/assert-root-typecheck-status-current.mjs",
    "final root type-check status before its current gate"
  );
  requireLastCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-root-typecheck-status-current.mjs",
    "node coordination/release-intake/generate-a25-current-cleanup-status-snapshot.mjs",
    "final root type-check status current gate before current cleanup status snapshot"
  );
  requireCommandAfterMarkerOrder(
    failures,
    commands,
    "A22 release-source settle",
    "node coordination/release-intake/generate-owner-package-approval-requests.mjs",
    "node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs",
    "A22 release-source settle refreshes owner package approvals before readiness matrix"
  );
  requireCommandAfterMarkerOrder(
    failures,
    commands,
    "A22 release-source settle",
    "node coordination/release-intake/generate-physical-closure-authorization-queue.mjs",
    "node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs",
    "A22 release-source settle refreshes physical closure queue before readiness matrix"
  );
  requireCommandAfterMarkerOrder(
    failures,
    commands,
    "A22 release-source settle",
    "node coordination/release-intake/generate-wave06-final-root-lifecycle-readiness.mjs",
    "node coordination/release-intake/generate-owner-package-readiness-blocker-matrix.mjs",
    "A22 release-source settle refreshes wave readiness before readiness matrix"
  );

  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a16-post-extraction-verification-report-current.mjs",
    "node coordination/release-intake/generate-next-owner-execution-instruction-scaffold.mjs",
    "A16 post-extraction before generic execution-instruction scaffold"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a16-post-extraction-verification-report-current.mjs",
    "node coordination/release-intake/generate-next-owner-decision-focus-packet.mjs",
    "A16 post-extraction before next-owner decision focus packet"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-next-owner-execution-instruction-scaffold.mjs",
    "node coordination/release-intake/assert-next-owner-execution-instructions-current.mjs",
    "execution-instruction scaffold before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-execution-instructions-current.mjs",
    "node coordination/release-intake/generate-next-owner-execution-instruction-request-packet.mjs",
    "execution-instructions current gate before request packet"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-execution-instruction-request-packet-current.mjs",
    "node coordination/release-intake/generate-next-owner-execution-instruction-acceptance-docket.mjs",
    "execution-instruction request packet before acceptance docket"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-wave01-artifact-clean-batch-execution-instruction-request-current.mjs",
    "node coordination/release-intake/generate-wave01-artifact-clean-batch-execution-instruction-intake.mjs",
    "Wave01 artifact-clean batch request before intake"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-wave01-artifact-clean-batch-execution-instruction-intake-current.mjs",
    "node coordination/release-intake/run-wave01-artifact-clean-execution-instruction-recording.mjs",
    "Wave01 artifact-clean intake before execution-instruction recording dry run"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-wave01-artifact-clean-execution-instruction-recording-current.mjs",
    "node coordination/release-intake/run-wave01-artifact-clean-guarded-execution.mjs",
    "Wave01 artifact-clean execution-instruction recording before guarded executor"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-wave01-artifact-clean-guarded-executor-current.mjs",
    "node coordination/release-intake/generate-wave01-artifact-clean-owner-execution-focus-packet.mjs",
    "Wave01 artifact-clean guarded executor before owner execution focus packet"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-wave01-artifact-clean-owner-execution-focus-packet-current.mjs",
    "node coordination/release-intake/generate-wave01-artifact-clean-post-clean-verification-plan.mjs",
    "Wave01 artifact-clean owner execution focus packet before post-clean verification plan"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-wave01-artifact-clean-post-clean-verification-plan-current.mjs",
    "node coordination/release-intake/generate-next-owner-execution-instruction-acceptance-docket.mjs",
    "Wave01 artifact-clean post-clean verification plan before execution-instruction acceptance docket"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-execution-instruction-acceptance-docket-current.mjs",
    "node coordination/release-intake/generate-a22-generated-artifact-guarded-cleanup-plan.mjs",
    "execution-instruction acceptance docket before A22 guarded cleanup plan"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-generated-artifact-guarded-cleanup-plan.mjs",
    "node coordination/release-intake/run-a22-generated-artifact-guarded-cleanup.mjs --json",
    "A22 guarded cleanup plan before guarded cleanup dry run"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/run-a22-generated-artifact-guarded-cleanup.mjs --json",
    "node coordination/release-intake/assert-a22-generated-artifact-guarded-cleanup-current.mjs",
    "A22 guarded cleanup dry run before guarded cleanup current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-generated-artifact-guarded-cleanup-current.mjs",
    "node coordination/release-intake/generate-wave01-artifact-clean-execution-instruction-readiness.mjs",
    "A22 guarded cleanup current gate before Wave01 execution-instruction readiness"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-wave01-artifact-clean-execution-instruction-readiness-current.mjs",
    "node coordination/release-intake/generate-wave01-governance-frontier-readiness.mjs",
    "Wave01 execution-instruction readiness before Wave01 governance frontier readiness"
  );
  requireCommandBeforeLast(
    failures,
    commands,
    "node coordination/release-intake/assert-wave01-governance-frontier-readiness-current.mjs",
    "node coordination/release-intake/generate-dirty-worktree-remediation-completion-audit.mjs",
    "Wave01 governance frontier readiness before final completion audit refresh"
  );
  requireCommandBeforeLast(
    failures,
    commands,
    "node coordination/release-intake/generate-dirty-worktree-remediation-completion-audit.mjs",
    "node coordination/release-intake/generate-remaining-completion-blocker-assignment-packet.mjs",
    "final completion audit refresh before final remaining blocker assignment packet"
  );
  requireCommandBeforeLast(
    failures,
    commands,
    "node coordination/release-intake/assert-remaining-completion-blocker-assignment-packet-current.mjs",
    "node coordination/release-intake/generate-owner-closure-action-queue.mjs",
    "final remaining blocker assignment packet before final owner closure action queue"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-wave01-governance-frontier-readiness-current.mjs",
    "node coordination/release-intake/generate-a16-extraction-closeout-docket.mjs",
    "Wave01 governance frontier readiness before A16 extraction closeout docket"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a16-extraction-closeout-docket-current.mjs",
    "node coordination/release-intake/generate-a16-extraction-execution-readiness.mjs",
    "A16 extraction closeout before A16 extraction execution readiness"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a16-extraction-execution-readiness-current.mjs",
    "node coordination/release-intake/generate-a16-guarded-extraction-execution-plan.mjs",
    "A16 extraction execution readiness before guarded extraction execution plan"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a16-guarded-extraction-execution-plan-current.mjs",
    "node coordination/release-intake/run-a16-guarded-extraction.mjs --dry-run",
    "A16 guarded extraction execution plan before guarded extraction executor dry run"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a16-guarded-extraction-executor-current.mjs",
    "node coordination/release-intake/generate-authorization-round-validation-plan.mjs",
    "A16 guarded extraction executor before downstream validation plan"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-wave01-package-resync-owner-review-capsule-current.mjs",
    "node coordination/release-intake/generate-wave01-a25-artifact-clean-owner-approval-capsule.mjs",
    "Wave01 package-resync owner-review capsule before A25 artifact clean approval capsule"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-wave01-a25-artifact-clean-owner-approval-capsule-current.mjs",
    "node coordination/release-intake/generate-wave01-package-resync-owner-acceptance-docket.mjs",
    "Wave01 A25 artifact clean approval capsule before package-resync acceptance docket"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-authorizations-current.mjs",
    "node coordination/release-intake/generate-ledger-to-canonical-authorization-bridge.mjs",
    "canonical authorizations current before ledger-to-canonical bridge"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-ledger-to-canonical-authorization-bridge-current.mjs",
    "node coordination/release-intake/generate-next-owner-authorization-execution-preview.mjs",
    "ledger-to-canonical bridge before authorization execution preview"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-owner-input-action-packet.mjs",
    "node coordination/release-intake/generate-authorization-gap-shrink-map.mjs",
    "owner input action packet bootstrap before authorization gap shrink map"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-authorization-gap-shrink-map-current.mjs",
    "node coordination/release-intake/generate-next-owner-authorization-focus-batch.mjs",
    "authorization gap shrink map before next-owner authorization focus batch"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-current.mjs",
    "node coordination/release-intake/generate-authorization-backlog-queue.mjs",
    "next-owner authorization focus batch before authorization backlog queue"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-authorization-backlog-queue-current.mjs",
    "node coordination/release-intake/generate-next-owner-authorization-focus-batch-acceptance-docket.mjs",
    "authorization backlog queue current gate before acceptance docket"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-acceptance-docket-current.mjs",
    "node coordination/release-intake/generate-next-owner-authorization-focus-batch-owner-input-scaffold.mjs",
    "focus batch acceptance docket before owner-input scaffold"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-next-owner-authorization-focus-batch-owner-input-scaffold.mjs",
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-owner-input-scaffold-current.mjs",
    "focus batch owner-input scaffold before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-owner-input-scaffold-current.mjs",
    "node coordination/release-intake/generate-next-owner-authorization-focus-batch-recording-intake.mjs",
    "focus batch owner-input scaffold current gate before recording intake"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-next-owner-authorization-focus-batch-recording-intake.mjs",
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-recording-intake-current.mjs",
    "focus batch recording intake before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-recording-intake-current.mjs",
    "node coordination/release-intake/generate-next-owner-authorization-focus-batch-canonical-preview.mjs",
    "focus batch recording intake current gate before canonical preview"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-next-owner-authorization-focus-batch-canonical-preview.mjs",
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-preview-current.mjs",
    "focus batch canonical preview before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-preview-current.mjs",
    "node coordination/release-intake/run-next-owner-authorization-focus-batch-canonical-recording.mjs",
    "focus batch canonical preview current gate before canonical recording dry run"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/run-next-owner-authorization-focus-batch-canonical-recording.mjs",
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-recording-current.mjs",
    "focus batch canonical recording dry run before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-recording-current.mjs",
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-tail-current.mjs",
    "focus batch canonical recording current gate before tail-batch guard"
  );
  requireCommandBeforeLast(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-authorization-focus-batch-tail-current.mjs",
    "node coordination/release-intake/assert-next-owner-authorization-stale-apply-guard-current.mjs",
    "tail-batch guard before stale apply guard"
  );
  requireCommandBeforeLast(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-authorization-stale-apply-guard-current.mjs",
    "node coordination/release-intake/generate-owner-input-action-packet.mjs",
    "stale apply guard before final owner input action packet"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-authorization-stale-apply-guard-current.mjs",
    "node coordination/release-intake/assert-owner-input-action-packet-current.mjs",
    "stale apply guard before final owner input action packet gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-authorization-stale-apply-guard-current.mjs",
    "node coordination/release-intake/generate-owner-closure-work-order-bundle.mjs",
    "stale apply guard before owner closure work-order bundle"
  );
  requireLastCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-owner-closure-work-order-bundle-current.mjs",
    "node coordination/release-intake/generate-a25-strict-worktree-lifecycle-blocker-evidence.mjs",
    "owner closure work-order bundle before final strict lifecycle evidence refresh"
  );
  requireLastCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a25-strict-worktree-lifecycle-blocker-evidence.mjs",
    "node coordination/release-intake/assert-a25-strict-worktree-lifecycle-blocker-evidence-current.mjs",
    "final strict lifecycle evidence refresh before its current gate"
  );
  requireLastCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a25-strict-worktree-lifecycle-blocker-evidence-current.mjs",
    "node coordination/release-intake/generate-dirty-worktree-closure-loop-state.mjs",
    "final strict lifecycle evidence gate before closure loop state"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-dirty-worktree-closure-loop-state-current.mjs",
    "node coordination/release-intake/generate-validate-to-merge-handoff.mjs",
    "closure loop state before validate-to-merge handoff"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-validate-to-merge-handoff.mjs",
    "node coordination/release-intake/assert-validate-to-merge-handoff-current.mjs",
    "validate-to-merge handoff before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validate-to-merge-handoff-current.mjs",
    "node coordination/release-intake/generate-next-owner-compact-request-bundle.mjs",
    "validate-to-merge handoff current gate before compact owner request bundle"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-next-owner-compact-request-bundle.mjs",
    "node coordination/release-intake/assert-next-owner-compact-request-bundle-current.mjs",
    "compact owner request bundle before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validation-hold-release-confirmation-recording-current.mjs",
    "node coordination/release-intake/generate-validation-hold-release-gate.mjs",
    "validation-hold confirmation recording current gate before release gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-validation-hold-release-gate.mjs",
    "node coordination/release-intake/assert-validation-hold-release-gate-current.mjs",
    "validation-hold release gate before its current gate"
  );
  requireLastCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validation-hold-release-gate-current.mjs",
    "node coordination/release-intake/generate-validate-to-merge-blocker-frontier.mjs",
    "final validation-hold release gate before final blocker frontier"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-next-owner-compact-request-bundle-current.mjs",
    "node coordination/release-intake/generate-validate-to-merge-blocker-frontier.mjs",
    "compact owner request bundle current gate before blocker frontier"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-validate-to-merge-blocker-frontier.mjs",
    "node coordination/release-intake/assert-validate-to-merge-blocker-frontier-current.mjs",
    "validate-to-merge blocker frontier before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validate-to-merge-blocker-frontier-current.mjs",
    "node coordination/release-intake/generate-a25-current-cleanup-status-snapshot.mjs",
    "validate-to-merge blocker frontier current gate before cleanup status snapshot"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a25-current-cleanup-status-snapshot-current.mjs",
    "node coordination/release-intake/generate-validate-to-merge-exit-criteria.mjs",
    "current cleanup status snapshot before validate-to-merge exit criteria"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-validate-to-merge-exit-criteria.mjs",
    "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
    "validate-to-merge exit criteria before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs",
    "node coordination/release-intake/generate-authorization-transition-forecast.mjs",
    "validate-to-merge exit criteria current gate before authorization transition forecast"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-authorization-transition-forecast.mjs",
    "node coordination/release-intake/assert-authorization-transition-forecast-current.mjs",
    "authorization transition forecast before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-authorization-transition-forecast-current.mjs",
    "node coordination/release-intake/generate-seven-step-closure-bridge.mjs",
    "authorization transition forecast current gate before seven-step closure bridge"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-seven-step-closure-bridge.mjs",
    "node coordination/release-intake/assert-seven-step-closure-bridge-current.mjs",
    "seven-step closure bridge before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-seven-step-closure-bridge-current.mjs",
    "node coordination/release-intake/generate-a22-clean-release-source-runway.mjs",
    "seven-step closure bridge current gate before clean release source runway"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-clean-release-source-runway.mjs",
    "node coordination/release-intake/assert-a22-clean-release-source-runway-current.mjs",
    "clean release source runway before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-clean-release-source-runway-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-focused-smoke.mjs",
    "clean release source runway current gate before top clean candidate focused smoke"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-top-clean-candidate-focused-smoke.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-focused-smoke-current.mjs",
    "top clean candidate focused smoke before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-focused-smoke-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-typecheck.mjs",
    "top clean candidate focused smoke current gate before top clean candidate type-check"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-top-clean-candidate-typecheck.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-current.mjs",
    "top clean candidate type-check before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-build-snapshot.mjs",
    "top clean candidate type-check current gate before build snapshot"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-top-clean-candidate-build-snapshot.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-build-snapshot-current.mjs",
    "top clean candidate build snapshot before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-build-snapshot-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-build-blocker-routing.mjs",
    "top clean candidate build snapshot current gate before build blocker routing"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-top-clean-candidate-build-blocker-routing.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs",
    "top clean candidate build blocker routing before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-plan.mjs",
    "top clean candidate build blocker routing current gate before root-parity extraction plan"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-plan.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs",
    "top clean candidate root-parity extraction plan before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-request.mjs",
    "top clean candidate root-parity extraction plan current gate before instruction request"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-request.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-request-current.mjs",
    "top clean candidate root-parity extraction instruction request before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-request-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs",
    "top clean candidate root-parity extraction instruction request current gate before instruction intake"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-extraction-instruction-intake.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs",
    "top clean candidate root-parity extraction instruction intake before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
    "top clean candidate root-parity extraction instruction intake current gate before instruction recording dry-run"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-extraction-instruction-recording.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs",
    "top clean candidate root-parity extraction instruction recording dry-run before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs",
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
    "top clean candidate root-parity extraction instruction recording current gate before guarded extraction dry-run"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/run-a22-top-clean-candidate-root-parity-guarded-extraction.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs",
    "top clean candidate root-parity guarded extraction dry-run before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs",
    "node coordination/release-intake/run-a22-root-parity-candidate-mutation.mjs",
    "top clean candidate root-parity guarded extraction current gate before candidate mutation dry-run"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/run-a22-root-parity-candidate-mutation.mjs",
    "node coordination/release-intake/assert-a22-root-parity-candidate-mutation-current.mjs",
    "A22 root-parity candidate mutation dry-run before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-root-parity-candidate-mutation-current.mjs",
    "node coordination/release-intake/generate-a22-owner-remediation-candidate-dirty-allowlist.mjs",
    "A22 root-parity candidate mutation current gate before owner-remediation dirty allowlist"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-owner-remediation-candidate-dirty-allowlist.mjs",
    "node coordination/release-intake/assert-a22-owner-remediation-candidate-dirty-allowlist-current.mjs",
    "owner-remediation dirty allowlist before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-owner-remediation-candidate-dirty-allowlist-current.mjs",
    "node coordination/release-intake/generate-a22-clean-source-candidate-promotion-packet.mjs",
    "owner-remediation dirty allowlist current gate before candidate promotion packet"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-clean-source-candidate-promotion-packet.mjs",
    "node coordination/release-intake/assert-a22-clean-source-candidate-promotion-packet-current.mjs",
    "candidate promotion packet before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-clean-source-candidate-promotion-packet-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-owner-action-packet.mjs",
    "candidate promotion packet current gate before owner action packet"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-owner-action-packet.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-packet-current.mjs",
    "top clean candidate root-parity owner action packet before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-packet-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket.mjs",
    "top clean candidate root-parity owner action packet current gate before owner action acceptance docket"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs",
    "top clean candidate root-parity owner action acceptance docket before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-review-packet.mjs",
    "top clean candidate root-parity owner action acceptance docket current gate before top clean candidate review packet"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-top-clean-candidate-review-packet.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs",
    "top clean candidate review packet before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs",
    "node coordination/release-intake/generate-a22-clean-candidate-gate-coverage-matrix.mjs",
    "top clean candidate review packet current gate before clean candidate gate coverage matrix"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-clean-candidate-gate-coverage-matrix.mjs",
    "node coordination/release-intake/assert-a22-clean-candidate-gate-coverage-matrix-current.mjs",
    "clean candidate gate coverage matrix before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-clean-candidate-gate-coverage-matrix-current.mjs",
    "node coordination/release-intake/generate-a22-fallback-clean-candidate-validation-snapshot.mjs --candidate-branch=codex/s22-release-hygiene-2026-06-15",
    "clean candidate gate coverage matrix current gate before fallback clean candidate validation snapshot"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-fallback-clean-candidate-validation-snapshot.mjs --candidate-branch=codex/s22-release-hygiene-2026-06-15",
    "node coordination/release-intake/assert-a22-fallback-clean-candidate-validation-snapshot-current.mjs",
    "fallback clean candidate validation snapshot before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-fallback-clean-candidate-validation-snapshot-current.mjs",
    "node coordination/release-intake/generate-a22-clean-source-validation-queue.mjs",
    "fallback clean candidate validation snapshot current gate before clean source validation queue"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-clean-source-validation-queue.mjs",
    "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs",
    "clean source validation queue before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs",
    "node coordination/release-intake/generate-a22-clean-source-selection-review.mjs",
    "clean source validation queue current gate before clean source selection review"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-clean-source-selection-review.mjs",
    "node coordination/release-intake/assert-a22-clean-source-selection-review-current.mjs",
    "clean source selection review before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-clean-source-selection-review-current.mjs",
    "node coordination/release-intake/generate-a22-top-clean-candidate-typecheck-remediation-routing.mjs",
    "clean source selection review current gate before type-check remediation routing"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-top-clean-candidate-typecheck-remediation-routing.mjs",
    "node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-remediation-routing-current.mjs",
    "type-check remediation routing before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-top-clean-candidate-typecheck-remediation-routing-current.mjs",
    "node coordination/release-intake/generate-a22-typecheck-remediation-owner-work-orders.mjs",
    "type-check remediation routing current gate before owner work orders"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-typecheck-remediation-owner-work-orders.mjs",
    "node coordination/release-intake/assert-a22-typecheck-remediation-owner-work-orders-current.mjs",
    "type-check remediation owner work orders before their current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-typecheck-remediation-owner-work-orders-current.mjs",
    "node coordination/release-intake/generate-a22-root-parity-selected-action-canonical-preview.mjs",
    "type-check remediation owner work orders current gate before selectedAction canonical preview"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-root-parity-selected-action-canonical-preview.mjs",
    "node coordination/release-intake/assert-a22-root-parity-selected-action-canonical-preview-current.mjs",
    "selectedAction canonical preview before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-root-parity-selected-action-canonical-preview-current.mjs",
    "node coordination/release-intake/generate-a22-root-parity-owner-input-landing-runway.mjs",
    "selectedAction canonical preview current gate before owner-input landing runway"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-a22-root-parity-owner-input-landing-runway.mjs",
    "node coordination/release-intake/assert-a22-root-parity-owner-input-landing-runway-current.mjs",
    "owner-input landing runway before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-root-parity-owner-input-landing-runway-current.mjs",
    "node coordination/release-intake/run-a22-root-parity-owner-input-recording.mjs",
    "owner-input landing runway current gate before owner-input recording dry-run"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/run-a22-root-parity-owner-input-recording.mjs",
    "node coordination/release-intake/assert-a22-root-parity-owner-input-recording-current.mjs",
    "owner-input recording dry-run before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-a22-root-parity-owner-input-recording-current.mjs",
    "node coordination/release-intake/generate-validate-frontier-owner-input-request-capsule.mjs",
    "owner-input recording current gate before validate frontier owner input request capsule"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-validate-frontier-owner-input-request-capsule.mjs",
    "node coordination/release-intake/assert-validate-frontier-owner-input-request-capsule-current.mjs",
    "validate frontier owner input request capsule before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validate-frontier-owner-input-request-capsule-current.mjs",
    "node coordination/release-intake/generate-validate-frontier-transition-forecast.mjs",
    "validate frontier owner input request capsule current gate before transition forecast"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-validate-frontier-transition-forecast.mjs",
    "node coordination/release-intake/assert-validate-frontier-transition-forecast-current.mjs",
    "validate frontier transition forecast before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validate-frontier-transition-forecast-current.mjs",
    "node coordination/release-intake/generate-validate-frontier-post-input-runway.mjs",
    "validate frontier transition forecast current gate before post-input runway"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-validate-frontier-post-input-runway.mjs",
    "node coordination/release-intake/assert-validate-frontier-post-input-runway-current.mjs",
    "validate frontier post-input runway before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validate-frontier-post-input-runway-current.mjs",
    "node coordination/release-intake/generate-validation-hold-release-confirmation-scaffold.mjs",
    "validate frontier post-input runway current gate before validation-hold scaffold"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-validation-hold-release-confirmation-scaffold.mjs",
    "node coordination/release-intake/assert-validation-hold-release-confirmation-scaffold-current.mjs",
    "validation-hold scaffold before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validation-hold-release-confirmation-scaffold-current.mjs",
    "node coordination/release-intake/run-validation-hold-release-confirmation-recording.mjs",
    "validation-hold scaffold current gate before confirmation recording dry-run"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/run-validation-hold-release-confirmation-recording.mjs",
    "node coordination/release-intake/assert-validation-hold-release-confirmation-recording-current.mjs",
    "validation-hold confirmation recording dry-run before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validation-hold-release-confirmation-recording-current.mjs",
    "node coordination/release-intake/generate-validate-frontier-owner-response-packet.mjs",
    "validation-hold confirmation recording current gate before validate-frontier owner response packet"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-validate-frontier-owner-response-packet.mjs",
    "node coordination/release-intake/assert-validate-frontier-owner-response-packet-current.mjs",
    "validate-frontier owner response packet before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validate-frontier-owner-response-packet-current.mjs",
    "node coordination/release-intake/generate-validate-frontier-post-response-execution-plan.mjs",
    "validate-frontier owner response packet current gate before post-response execution plan"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-validate-frontier-post-response-execution-plan.mjs",
    "node coordination/release-intake/assert-validate-frontier-post-response-execution-plan-current.mjs",
    "validate-frontier post-response execution plan before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validate-frontier-post-response-execution-plan-current.mjs",
    "node coordination/release-intake/generate-validate-frontier-owner-response-readiness-ledger.mjs",
    "validate-frontier post-response execution plan current gate before owner response readiness ledger"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/generate-validate-frontier-owner-response-readiness-ledger.mjs",
    "node coordination/release-intake/assert-validate-frontier-owner-response-readiness-ledger-current.mjs",
    "validate-frontier owner response readiness ledger before its current gate"
  );
  requireCommandOrder(
    failures,
    commands,
    "node coordination/release-intake/assert-validate-frontier-owner-response-readiness-ledger-current.mjs",
    "node coordination/release-intake/assert-no-staged-changes.mjs",
    "validate-frontier owner response readiness ledger current gate before no-staged gate"
  );

  if (!runnerSource.includes("This runner refreshes A25 evidence only.")) {
    failures.push("runner missing explicit non-destructive boundary");
  }
  if (!runnerSource.includes("or run aggregate gates")) {
    failures.push("runner boundary does not exclude aggregate gates");
  }
  if (!aggregateSource.includes("assert-dirty-worktree-remediation-refresh-runner-current.mjs")) {
    failures.push("aggregate gate does not include refresh-runner currentness check");
  }
  if (!aggregateSource.includes("assert-next-owner-authorization-focus-batch-tail-current.mjs")) {
    failures.push("aggregate gate does not include next-owner authorization focus-batch tail currentness check");
  }
  if (!aggregateSource.includes("assert-next-owner-authorization-stale-apply-guard-current.mjs")) {
    failures.push("aggregate gate does not include next-owner authorization stale apply guard currentness check");
  }
  if (!aggregateSource.includes("assert-seven-step-closure-bridge-current.mjs")) {
    failures.push("aggregate gate does not include seven-step closure bridge currentness check");
  }
  if (!aggregateSource.includes("assert-owner-input-scaffold-files-current.mjs")) {
    failures.push("aggregate gate does not include owner-input scaffold files currentness check");
  }
  if (!aggregateSource.includes("assert-authorization-gap-shrink-map-current.mjs")) {
    failures.push("aggregate gate does not include authorization gap shrink-map currentness check");
  }
  if (!aggregateSource.includes("assert-next-owner-authorization-focus-batch-current.mjs")) {
    failures.push("aggregate gate does not include next-owner authorization focus batch currentness check");
  }
  if (!aggregateSource.includes("assert-authorization-backlog-queue-current.mjs")) {
    failures.push("aggregate gate does not include authorization backlog queue currentness check");
  }
  if (!aggregateSource.includes("assert-next-owner-authorization-focus-batch-acceptance-docket-current.mjs")) {
    failures.push("aggregate gate does not include next-owner authorization focus batch acceptance docket currentness check");
  }
  if (!aggregateSource.includes("assert-next-owner-authorization-focus-batch-owner-input-scaffold-current.mjs")) {
    failures.push("aggregate gate does not include next-owner authorization focus batch owner-input scaffold currentness check");
  }
  if (!aggregateSource.includes("assert-next-owner-authorization-focus-batch-recording-intake-current.mjs")) {
    failures.push("aggregate gate does not include next-owner authorization focus batch recording intake currentness check");
  }
  if (!aggregateSource.includes("assert-next-owner-authorization-focus-batch-canonical-preview-current.mjs")) {
    failures.push("aggregate gate does not include next-owner authorization focus batch canonical preview currentness check");
  }
  if (!aggregateSource.includes("assert-next-owner-authorization-focus-batch-canonical-recording-current.mjs")) {
    failures.push("aggregate gate does not include next-owner authorization focus batch canonical recording currentness check");
  }
  if (!aggregateSource.includes("assert-ready-candidate-owner-review-capsule-current.mjs")) {
    failures.push("aggregate gate does not include ready-candidate owner-review capsule currentness check");
  }
  if (!aggregateSource.includes("assert-wave01-package-resync-owner-review-capsule-current.mjs")) {
    failures.push("aggregate gate does not include Wave01 package-resync owner-review capsule currentness check");
  }
  if (!aggregateSource.includes("assert-wave01-a25-artifact-clean-owner-approval-capsule-current.mjs")) {
    failures.push("aggregate gate does not include Wave01 A25 artifact clean owner approval capsule currentness check");
  }
  if (!aggregateSource.includes("assert-wave01-package-resync-owner-acceptance-docket-current.mjs")) {
    failures.push("aggregate gate does not include Wave01 package-resync owner acceptance docket currentness check");
  }
  if (!aggregateSource.includes("assert-ready-candidate-owner-acceptance-docket-current.mjs")) {
    failures.push("aggregate gate does not include ready-candidate owner acceptance docket currentness check");
  }
  if (!aggregateSource.includes("assert-a16-authorized-package-extraction-request-current.mjs")) {
    failures.push("aggregate gate does not include A16 authorized package extraction request currentness check");
  }
  if (!aggregateSource.includes("assert-a16-execution-authorization-docket-current.mjs")) {
    failures.push("aggregate gate does not include A16 execution authorization docket currentness check");
  }
  if (!aggregateSource.includes("assert-a16-pre-execution-validation-report-current.mjs")) {
    failures.push("aggregate gate does not include A16 pre-execution validation report currentness check");
  }
  if (!aggregateSource.includes("assert-a16-execution-instruction-input-scaffold-current.mjs")) {
    failures.push("aggregate gate does not include A16 execution-instruction input scaffold currentness check");
  }
  if (!aggregateSource.includes("assert-a16-execution-instruction-owner-input-current.mjs")) {
    failures.push("aggregate gate does not include A16 execution-instruction owner input currentness check");
  }
  if (!aggregateSource.includes("assert-a16-post-extraction-verification-report-current.mjs")) {
    failures.push("aggregate gate does not include A16 post-extraction verification report currentness check");
  }
  if (!aggregateSource.includes("assert-a16-extraction-closeout-docket-current.mjs")) {
    failures.push("aggregate gate does not include A16 extraction closeout docket currentness check");
  }
  if (!aggregateSource.includes("assert-a16-extraction-execution-readiness-current.mjs")) {
    failures.push("aggregate gate does not include A16 extraction execution readiness currentness check");
  }
  if (!aggregateSource.includes("assert-a16-guarded-extraction-execution-plan-current.mjs")) {
    failures.push("aggregate gate does not include A16 guarded extraction execution plan currentness check");
  }
  if (!aggregateSource.includes("assert-a16-guarded-extraction-executor-current.mjs")) {
    failures.push("aggregate gate does not include A16 guarded extraction executor currentness check");
  }
  if (!aggregateSource.includes("assert-next-owner-execution-instruction-request-packet-current.mjs")) {
    failures.push("aggregate gate does not include next-owner execution instruction request packet currentness check");
  }
  if (!aggregateSource.includes("assert-next-owner-execution-instruction-acceptance-docket-current.mjs")) {
    failures.push("aggregate gate does not include next-owner execution instruction acceptance docket currentness check");
  }
  if (!aggregateSource.includes("assert-a22-generated-artifact-guarded-cleanup-current.mjs")) {
    failures.push("aggregate gate does not include A22 generated-artifact guarded cleanup currentness check");
  }
  if (!aggregateSource.includes("assert-wave01-artifact-clean-execution-instruction-readiness-current.mjs")) {
    failures.push("aggregate gate does not include Wave01 artifact clean execution-instruction readiness currentness check");
  }
  if (!aggregateSource.includes("assert-wave01-governance-frontier-readiness-current.mjs")) {
    failures.push("aggregate gate does not include Wave01 governance frontier readiness currentness check");
  }
  if (!aggregateSource.includes("assert-wave01-artifact-clean-batch-execution-instruction-intake-current.mjs")) {
    failures.push("aggregate gate does not include Wave01 artifact clean batch execution-instruction intake currentness check");
  }
  if (!aggregateSource.includes("assert-wave01-artifact-clean-execution-instruction-recording-current.mjs")) {
    failures.push("aggregate gate does not include Wave01 artifact clean execution-instruction recording currentness check");
  }
  if (!aggregateSource.includes("assert-wave01-artifact-clean-owner-execution-focus-packet-current.mjs")) {
    failures.push("aggregate gate does not include Wave01 artifact clean owner execution focus packet currentness check");
  }
  if (!aggregateSource.includes("assert-wave01-artifact-clean-post-clean-verification-plan-current.mjs")) {
    failures.push("aggregate gate does not include Wave01 artifact clean post-clean verification plan currentness check");
  }
  if (!aggregateSource.includes("assert-a22-generated-artifact-residual-acceptance-docket-current.mjs")) {
    failures.push("aggregate gate does not include A22 generated-artifact residual acceptance docket currentness check");
  }
  if (!aggregateSource.includes("assert-authorization-round-validation-plan-current.mjs")) {
    failures.push("aggregate gate does not include authorization round validation plan currentness check");
  }
  if (!aggregateSource.includes("assert-validate-to-merge-handoff-current.mjs")) {
    failures.push("aggregate gate does not include validate-to-merge handoff currentness check");
  }
  if (!aggregateSource.includes("assert-validate-to-merge-blocker-frontier-current.mjs")) {
    failures.push("aggregate gate does not include validate-to-merge blocker frontier currentness check");
  }
  if (!aggregateSource.includes("assert-validate-to-merge-exit-criteria-current.mjs")) {
    failures.push("aggregate gate does not include validate-to-merge exit criteria currentness check");
  }
  if (!aggregateSource.includes("assert-authorization-transition-forecast-current.mjs")) {
    failures.push("aggregate gate does not include authorization transition forecast currentness check");
  }
  if (!aggregateSource.includes("assert-a22-clean-release-source-runway-current.mjs")) {
    failures.push("aggregate gate does not include A22 clean release source runway currentness check");
  }
  if (!aggregateSource.includes("assert-a22-owner-remediation-candidate-dirty-allowlist-current.mjs")) {
    failures.push("aggregate gate does not include A22 owner-remediation candidate dirty allowlist currentness check");
  }
  if (!aggregateSource.includes("assert-a22-top-clean-candidate-typecheck-remediation-routing-current.mjs")) {
    failures.push("aggregate gate does not include A22 top clean candidate type-check remediation routing currentness check");
  }
  if (!aggregateSource.includes("assert-a22-typecheck-remediation-owner-work-orders-current.mjs")) {
    failures.push("aggregate gate does not include A22 typecheck remediation owner work orders currentness check");
  }
  if (!aggregateSource.includes("assert-a22-top-clean-candidate-build-snapshot-current.mjs")) {
    failures.push("aggregate gate does not include A22 top clean candidate build snapshot currentness check");
  }
  if (!aggregateSource.includes("assert-a22-top-clean-candidate-build-blocker-routing-current.mjs")) {
    failures.push("aggregate gate does not include A22 top clean candidate build blocker routing currentness check");
  }
  if (!aggregateSource.includes("assert-a22-fallback-clean-candidate-validation-snapshot-current.mjs")) {
    failures.push("aggregate gate does not include A22 fallback clean candidate validation snapshot currentness check");
  }
  if (!aggregateSource.includes("assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs")) {
    failures.push("aggregate gate does not include A22 top clean candidate root-parity extraction plan currentness check");
  }
  if (!aggregateSource.includes("assert-a22-top-clean-candidate-root-parity-extraction-instruction-request-current.mjs")) {
    failures.push("aggregate gate does not include A22 top clean candidate root-parity extraction instruction request currentness check");
  }
  if (!aggregateSource.includes("assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs")) {
    failures.push("aggregate gate does not include A22 top clean candidate root-parity extraction instruction intake currentness check");
  }
  if (!aggregateSource.includes("assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs")) {
    failures.push("aggregate gate does not include A22 top clean candidate root-parity extraction instruction recording currentness check");
  }
  if (!aggregateSource.includes("assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs")) {
    failures.push("aggregate gate does not include A22 top clean candidate root-parity guarded extraction currentness check");
  }
  if (!aggregateSource.includes("assert-a22-root-parity-candidate-mutation-current.mjs")) {
    failures.push("aggregate gate does not include A22 root-parity candidate mutation currentness check");
  }
  if (!aggregateSource.includes("assert-a22-top-clean-candidate-root-parity-owner-action-packet-current.mjs")) {
    failures.push("aggregate gate does not include A22 top clean candidate root-parity owner action packet currentness check");
  }
  if (!aggregateSource.includes("assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs")) {
    failures.push("aggregate gate does not include A22 top clean candidate root-parity owner action acceptance docket currentness check");
  }
  if (!aggregateSource.includes("assert-a22-root-parity-selected-action-canonical-preview-current.mjs")) {
    failures.push("aggregate gate does not include A22 root-parity selectedAction canonical preview currentness check");
  }
  if (!aggregateSource.includes("assert-a22-root-parity-owner-input-landing-runway-current.mjs")) {
    failures.push("aggregate gate does not include A22 root-parity owner-input landing runway currentness check");
  }
  if (!aggregateSource.includes("assert-a22-root-parity-owner-input-recording-current.mjs")) {
    failures.push("aggregate gate does not include A22 root-parity owner-input recording currentness check");
  }
  if (!aggregateSource.includes("assert-validate-frontier-owner-input-request-capsule-current.mjs")) {
    failures.push("aggregate gate does not include validate frontier owner input request capsule currentness check");
  }
  if (!aggregateSource.includes("assert-validate-frontier-transition-forecast-current.mjs")) {
    failures.push("aggregate gate does not include validate frontier transition forecast currentness check");
  }
  if (!aggregateSource.includes("assert-validate-frontier-post-input-runway-current.mjs")) {
    failures.push("aggregate gate does not include validate frontier post-input runway currentness check");
  }
  if (!aggregateSource.includes("assert-validation-hold-release-confirmation-recording-current.mjs")) {
    failures.push("aggregate gate does not include validation-hold release confirmation recording currentness check");
  }
  if (!aggregateSource.includes("assert-validation-hold-release-gate-current.mjs")) {
    failures.push("aggregate gate does not include validation-hold release gate currentness check");
  }
  if (!aggregateSource.includes("assert-validate-frontier-owner-response-packet-current.mjs")) {
    failures.push("aggregate gate does not include validate-frontier owner response packet currentness check");
  }
  if (!aggregateSource.includes("assert-validate-frontier-post-response-execution-plan-current.mjs")) {
    failures.push("aggregate gate does not include validate-frontier post-response execution plan currentness check");
  }
  if (!aggregateSource.includes("assert-validate-frontier-owner-response-readiness-ledger-current.mjs")) {
    failures.push("aggregate gate does not include validate-frontier owner response readiness ledger currentness check");
  }
  if (!aggregateSource.includes("assert-a22-top-clean-candidate-review-packet-current.mjs")) {
    failures.push("aggregate gate does not include A22 top clean candidate review packet currentness check");
  }
  if (!aggregateSource.includes("assert-a22-clean-candidate-gate-coverage-matrix-current.mjs")) {
    failures.push("aggregate gate does not include A22 clean candidate gate coverage matrix currentness check");
  }
  if (!aggregateSource.includes("assert-a22-clean-source-validation-queue-current.mjs")) {
    failures.push("aggregate gate does not include A22 clean source validation queue currentness check");
  }
  if (!aggregateSource.includes("assert-a22-clean-source-selection-review-current.mjs")) {
    failures.push("aggregate gate does not include A22 clean source selection review currentness check");
  }
  if (!aggregateSource.includes("assert-typecheck-critical-path-frontier-current.mjs")) {
    failures.push("aggregate gate does not include type-check critical path frontier currentness check");
  }
  if (!aggregateSource.includes("assert-root-typecheck-status-current.mjs")) {
    failures.push("aggregate gate does not include root type-check status currentness check");
  }
  if (!aggregateSource.includes("assert-next-owner-compact-request-bundle-current.mjs")) {
    failures.push("aggregate gate does not include next-owner compact request bundle currentness check");
  }

  finish({
    checkedAt: new Date().toISOString(),
    root,
    stepCount: steps.length,
    requiredCommandCount: requiredCommands.length,
    forbiddenMatches,
    failures
  });
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 dirty-worktree remediation refresh-runner gate");
    console.log(`Steps: ${payload.stepCount ?? 0}`);
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree remediation refresh-runner gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

main();
