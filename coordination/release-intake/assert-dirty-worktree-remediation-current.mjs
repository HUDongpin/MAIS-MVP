#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = git(["rev-parse", "--show-toplevel"]);
const outDir = path.join(root, "coordination", "release-intake");
const strict = process.argv.includes("--strict");
const json = process.argv.includes("--json");

const outputPath = path.join(
  outDir,
  strict
    ? "latest-A25-dirty-worktree-remediation-strict-gate.json"
    : "latest-A25-dirty-worktree-remediation-current-gate.json"
);

const currentChecks = [
  {
    name: "A25 dirty-tree map current",
    bin: "npm",
    args: ["run", "release:dirty-map", "--", "--assert-current", "--max-age-minutes", "60"]
  },
  {
    name: "A25 owner pathspecs current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-pathspecs-current.mjs"]
  },
  {
    name: "A25 unmapped runtime proposals current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-unmapped-owner-proposals-current.mjs"]
  },
  {
    name: "A25 unmapped manual proposals current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-unmapped-manual-proposals-current.mjs"]
  },
  {
    name: "A25 effective owner overlay current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-effective-owner-overlay-current.mjs"]
  },
  {
    name: "A25 effective disposition queue current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-effective-disposition-queue-current.mjs"]
  },
  {
    name: "A25 worktree lifecycle inventory current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-worktree-lifecycle.mjs"]
  },
  {
    name: "A25 physical lifecycle blocker coverage current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-physical-lifecycle-blocker-coverage-current.mjs"]
  },
  {
    name: "A25 remaining strict blocker authorization packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-remaining-strict-blocker-authorization-packet-current.mjs"]
  },
  {
    name: "A25 physical closure authorization queue current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-physical-closure-authorization-queue-current.mjs"]
  },
  {
    name: "A25 strict worktree lifecycle blocker evidence current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a25-strict-worktree-lifecycle-blocker-evidence-current.mjs"]
  },
  {
    name: "A25 dirty-worktree closure execution sequence current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-closure-execution-sequence-current.mjs"]
  },
  {
    name: "A25 Wave 01 governance readiness current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-governance-readiness-current.mjs"]
  },
  {
    name: "A25 Wave 01 type-check blocker routing current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-typecheck-blocker-routing-current.mjs"]
  },
  {
    name: "A25 Wave 01 type-check owner handoff packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-typecheck-owner-handoff-packet-current.mjs"]
  },
  {
    name: "A25 Wave 01 type-check owner assignment packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-typecheck-owner-assignment-packet-current.mjs"]
  },
  {
    name: "A25 Wave 01 package resync approval requests current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs"]
  },
  {
    name: "A25 Wave 01 package resync execution packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-package-resync-execution-packet-current.mjs"]
  },
  {
    name: "A25 Wave 01 package resync evidence pack current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-package-resync-evidence-pack-current.mjs"]
  },
  {
    name: "A25 Wave 01 package resync owner authorization template current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-package-resync-owner-authorization-template-current.mjs"]
  },
  {
    name: "A25 Wave 01 package resync owner authorizations starter current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-package-resync-owner-authorizations-starter-current.mjs"]
  },
  {
    name: "A25 Wave 01 package resync owner authorizations current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-package-resync-owner-authorizations-current.mjs"]
  },
  {
    name: "A25 Wave 01 package resync owner-review capsule current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-package-resync-owner-review-capsule-current.mjs"]
  },
  {
    name: "A25 Wave 01 A25 artifact clean owner approval capsule current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-a25-artifact-clean-owner-approval-capsule-current.mjs"]
  },
  {
    name: "A25 Wave 01 package resync owner acceptance docket current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-package-resync-owner-acceptance-docket-current.mjs"]
  },
  {
    name: "A25 Wave 02 shared contract readiness current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave02-shared-contract-readiness-current.mjs"]
  },
  {
    name: "A25 Wave 03 shell dashboard roadmap readiness current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave03-shell-dashboard-roadmap-readiness-current.mjs"]
  },
  {
    name: "A25 Wave 04 practice lesson content readiness current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave04-practice-lesson-content-readiness-current.mjs"]
  },
  {
    name: "A25 Wave 05 visualization AI runtime readiness current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave05-visualization-ai-runtime-readiness-current.mjs"]
  },
  {
    name: "A25 Wave 06 final root lifecycle readiness current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave06-final-root-lifecycle-readiness-current.mjs"]
  },
  {
    name: "A25 linked-worktree archive evidence current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-linked-worktree-archive-evidence-current.mjs"]
  },
  {
    name: "A25 lifecycle decision requests current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-lifecycle-decision-requests-current.mjs"]
  },
  {
    name: "A25 lifecycle decision ledger current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-lifecycle-decision-ledger-current.mjs"]
  },
  {
    name: "A25 owner approval matrix current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-approval-matrix-current.mjs"]
  },
  {
    name: "A25 lifecycle closure runbook current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs"]
  },
  {
    name: "A19 secret/env quarantine clean",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-secret-env-quarantine.mjs"]
  },
  {
    name: "A25 disposition evidence current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-disposition-evidence-current.mjs"]
  },
  {
    name: "A25 physical lifecycle approval requests current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs"]
  },
  {
    name: "A25 owner package approval requests current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-package-approval-requests-current.mjs"]
  },
  {
    name: "A25 dirty-worktree final-state ledger current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-final-state-ledger-current.mjs"]
  },
  {
    name: "A25 dirty-worktree final-state owner decision packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-final-state-owner-decision-packet-current.mjs"]
  },
  {
    name: "A25 dirty-worktree final-state selection draft current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-final-state-selection-draft-current.mjs"]
  },
  {
    name: "A25 dirty-worktree final-state action runbook current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-final-state-action-runbook-current.mjs"]
  },
  {
    name: "A25 dirty-worktree blocker report index current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-blocker-report-index-current.mjs"]
  },
  {
    name: "A25 owner package readiness blocker matrix current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-package-readiness-blocker-matrix-current.mjs"]
  },
  {
    name: "A25 owner package blocker routing current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-package-blocker-routing-current.mjs"]
  },
  {
    name: "A25 owner package blocker assignment packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-package-blocker-assignment-packet-current.mjs"]
  },
  {
    name: "A25 type-check critical path frontier current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-typecheck-critical-path-frontier-current.mjs"]
  },
  {
    name: "A25 root type-check status current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-root-typecheck-status-current.mjs"]
  },
  {
    name: "A25 owner package blocker report starter current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-package-blocker-report-starter-current.mjs"]
  },
  {
    name: "A25 owner package blocker report records current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-package-blocker-report-records-current.mjs"]
  },
  {
    name: "A25 owner package blocker reports current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-package-blocker-reports-current.mjs"]
  },
  {
    name: "A22 generated-artifact residual evidence current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-generated-artifact-residual-evidence-current.mjs"]
  },
  {
    name: "A22 generated-artifact residual authorization packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-generated-artifact-residual-authorization-packet-current.mjs"]
  },
  {
    name: "A22 generated-artifact residual acceptance docket current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-generated-artifact-residual-acceptance-docket-current.mjs"]
  },
  {
    name: "A22 release-source clean blocker evidence current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-release-source-clean-blocker-evidence-current.mjs"]
  },
  {
    name: "A25 next owner approval packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-approval-packet-current.mjs"]
  },
  {
    name: "A25 next owner authorizations starter current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorizations-starter-current.mjs"]
  },
  {
    name: "A25 next owner authorizations current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorizations-current.mjs"]
  },
  {
    name: "A25 ledger-to-canonical authorization bridge current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-ledger-to-canonical-authorization-bridge-current.mjs"]
  },
  {
    name: "A25 next owner authorization execution preview current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorization-execution-preview-current.mjs"]
  },
  {
    name: "A25 next owner authorized command manifest current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorized-command-manifest-current.mjs"]
  },
  {
    name: "A25 next owner execution instructions current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-execution-instructions-current.mjs"]
  },
  {
    name: "A25 next owner execution instruction request packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-execution-instruction-request-packet-current.mjs"]
  },
  {
    name: "A25 Wave 01 artifact-clean execution preflight current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-artifact-clean-execution-preflight-current.mjs"]
  },
  {
    name: "A25 Wave 01 artifact-clean execution-instruction capsule current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-artifact-clean-execution-instruction-capsule-current.mjs"]
  },
  {
    name: "A25 Wave 01 artifact-clean guarded execution plan current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-artifact-clean-guarded-execution-plan-current.mjs"]
  },
  {
    name: "A25 Wave 01 artifact-clean batch execution-instruction request current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-artifact-clean-batch-execution-instruction-request-current.mjs"]
  },
  {
    name: "A25 Wave 01 artifact-clean batch execution-instruction intake current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-artifact-clean-batch-execution-instruction-intake-current.mjs"]
  },
  {
    name: "A25 Wave 01 artifact-clean execution-instruction recording current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-artifact-clean-execution-instruction-recording-current.mjs"]
  },
  {
    name: "A25 Wave 01 artifact-clean guarded executor current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-artifact-clean-guarded-executor-current.mjs"]
  },
  {
    name: "A25 Wave 01 artifact-clean owner execution focus packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-artifact-clean-owner-execution-focus-packet-current.mjs"]
  },
  {
    name: "A25 Wave 01 artifact-clean post-clean verification plan current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-artifact-clean-post-clean-verification-plan-current.mjs"]
  },
  {
    name: "A25 next owner execution instruction acceptance docket current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-execution-instruction-acceptance-docket-current.mjs"]
  },
  {
    name: "A22 generated-artifact guarded cleanup current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-generated-artifact-guarded-cleanup-current.mjs"]
  },
  {
    name: "A25 Wave 01 artifact-clean execution-instruction readiness current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-artifact-clean-execution-instruction-readiness-current.mjs"]
  },
  {
    name: "A25 Wave 01 governance frontier readiness current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-wave01-governance-frontier-readiness-current.mjs"]
  },
  {
    name: "A25 remaining completion blocker assignment packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-remaining-completion-blocker-assignment-packet-current.mjs"]
  },
  {
    name: "A25 owner closure action queue current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-closure-action-queue-current.mjs"]
  },
  {
    name: "A25 next owner decision focus packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-decision-focus-packet-current.mjs"]
  },
  {
    name: "A25 owner closure input readiness current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-closure-input-readiness-current.mjs"]
  },
  {
    name: "A25 validation hold release confirmation scaffold current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validation-hold-release-confirmation-scaffold-current.mjs"]
  },
  {
    name: "A25 validation hold release confirmation recording current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validation-hold-release-confirmation-recording-current.mjs"]
  },
  {
    name: "A25 validation hold release gate current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validation-hold-release-gate-current.mjs"]
  },
  {
    name: "A25/A22 validate frontier owner response packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validate-frontier-owner-response-packet-current.mjs"]
  },
  {
    name: "A25/A22 validate frontier post-response execution plan current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validate-frontier-post-response-execution-plan-current.mjs"]
  },
  {
    name: "A25/A22 validate frontier owner response readiness ledger current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validate-frontier-owner-response-readiness-ledger-current.mjs"]
  },
  {
    name: "A25 pending owner blocker report bundle current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-pending-owner-blocker-report-bundle-current.mjs"]
  },
  {
    name: "A25 owner input action packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-input-action-packet-current.mjs"]
  },
  {
    name: "A25 authorization gap shrink map current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-authorization-gap-shrink-map-current.mjs"]
  },
  {
    name: "A25 next owner authorization focus batch current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorization-focus-batch-current.mjs"]
  },
  {
    name: "A25 authorization backlog queue current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-authorization-backlog-queue-current.mjs"]
  },
  {
    name: "A25 next owner authorization focus batch acceptance docket current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorization-focus-batch-acceptance-docket-current.mjs"]
  },
  {
    name: "A25 next owner authorization focus batch owner-input scaffold current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorization-focus-batch-owner-input-scaffold-current.mjs"]
  },
  {
    name: "A25 next owner authorization focus batch recording intake current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorization-focus-batch-recording-intake-current.mjs"]
  },
  {
    name: "A25 next owner authorization focus batch canonical preview current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-preview-current.mjs"]
  },
  {
    name: "A25 next owner authorization focus batch canonical recording current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorization-focus-batch-canonical-recording-current.mjs"]
  },
  {
    name: "A25 next owner authorization focus batch tail current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorization-focus-batch-tail-current.mjs"]
  },
  {
    name: "A25 next owner authorization stale apply guard current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-authorization-stale-apply-guard-current.mjs"]
  },
  {
    name: "A25 ready candidate owner-review capsule current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-ready-candidate-owner-review-capsule-current.mjs"]
  },
  {
    name: "A25 ready candidate owner acceptance docket current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-ready-candidate-owner-acceptance-docket-current.mjs"]
  },
  {
    name: "A25 A16 authorized package extraction request current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a16-authorized-package-extraction-request-current.mjs"]
  },
  {
    name: "A25 A16 execution authorization docket current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a16-execution-authorization-docket-current.mjs"]
  },
  {
    name: "A25 A16 pre-execution validation report current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a16-pre-execution-validation-report-current.mjs"]
  },
  {
    name: "A25 A16 execution-instruction input scaffold current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a16-execution-instruction-input-scaffold-current.mjs"]
  },
  {
    name: "A25 A16 execution-instruction owner input current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a16-execution-instruction-owner-input-current.mjs"]
  },
  {
    name: "A25 A16 post-extraction verification report current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a16-post-extraction-verification-report-current.mjs"]
  },
  {
    name: "A25 A16 extraction closeout docket current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a16-extraction-closeout-docket-current.mjs"]
  },
  {
    name: "A25 A16 extraction execution readiness current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a16-extraction-execution-readiness-current.mjs"]
  },
  {
    name: "A25 A16 guarded extraction execution plan current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a16-guarded-extraction-execution-plan-current.mjs"]
  },
  {
    name: "A25 A16 guarded extraction executor current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a16-guarded-extraction-executor-current.mjs"]
  },
  {
    name: "A25 authorization round validation plan current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-authorization-round-validation-plan-current.mjs"]
  },
  {
    name: "A25 owner input scaffold files current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-input-scaffold-files-current.mjs"]
  },
  {
    name: "A25 owner closure work-order bundle current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-owner-closure-work-order-bundle-current.mjs"]
  },
  {
    name: "A25 dirty-worktree closure loop state current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-closure-loop-state-current.mjs"]
  },
  {
    name: "A25 validate-to-merge handoff current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validate-to-merge-handoff-current.mjs"]
  },
  {
    name: "A25 validation hold release gate current before blocker frontier",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validation-hold-release-gate-current.mjs"]
  },
  {
    name: "A25 validate-to-merge blocker frontier current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validate-to-merge-blocker-frontier-current.mjs"]
  },
  {
    name: "A25 next owner compact request bundle current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-compact-request-bundle-current.mjs"]
  },
  {
    name: "A25 next owner compact request recorder dry-run current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-next-owner-compact-request-recorder-dry-run-current.mjs"]
  },
  {
    name: "A25 dirty-worktree final-state selection template current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-final-state-selection-template-current.mjs"]
  },
  {
    name: "A25 dirty-worktree final-state selection current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-final-state-selection-current.mjs"]
  },
  {
    name: "A25 dirty-worktree recurrence prevention current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-recurrence-prevention-current.mjs"]
  },
  {
    name: "A25 dirty-worktree remediation refresh runner current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-remediation-refresh-runner-current.mjs"]
  },
  {
    name: "A22 top clean candidate root-parity extraction instruction request current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-request-current.mjs"]
  },
  {
    name: "A22 top clean candidate root-parity extraction instruction intake current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-intake-current.mjs"]
  },
  {
    name: "A22 top clean candidate root-parity extraction instruction recording current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-instruction-recording-current.mjs"]
  },
  {
    name: "A22 top clean candidate root-parity guarded extraction current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-root-parity-guarded-extraction-current.mjs"]
  },
  {
    name: "A22 root-parity candidate mutation current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-root-parity-candidate-mutation-current.mjs"]
  },
  {
    name: "A22 top clean candidate root-parity owner action packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-packet-current.mjs"]
  },
  {
    name: "A22 top clean candidate root-parity owner action acceptance docket current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-root-parity-owner-action-acceptance-docket-current.mjs"]
  },
  {
    name: "A25/A22 validate frontier owner input request capsule current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validate-frontier-owner-input-request-capsule-current.mjs"]
  },
  {
    name: "A25/A22 validate frontier transition forecast current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validate-frontier-transition-forecast-current.mjs"]
  },
  {
    name: "A25/A22 validate frontier post-input runway current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validate-frontier-post-input-runway-current.mjs"]
  },
  {
    name: "A25 no dirty root deploy evidence current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-no-dirty-root-deploy-evidence-current.mjs"]
  },
  {
    name: "A25 dirty-worktree remediation completion audit current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-remediation-completion-audit-current.mjs"]
  },
  {
    name: "A25 current cleanup status snapshot current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a25-current-cleanup-status-snapshot-current.mjs"]
  },
  {
    name: "A25 validate-to-merge exit criteria current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs"]
  },
  {
    name: "A25 authorization transition forecast current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-authorization-transition-forecast-current.mjs"]
  },
  {
    name: "A25 seven-step closure bridge current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-seven-step-closure-bridge-current.mjs"]
  },
  {
    name: "A22 clean release source runway current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-clean-release-source-runway-current.mjs"]
  },
  {
    name: "A22 owner-remediation candidate dirty allowlist current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-owner-remediation-candidate-dirty-allowlist-current.mjs"]
  },
  {
    name: "A22 clean source candidate promotion packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-clean-source-candidate-promotion-packet-current.mjs"]
  },
  {
    name: "A22 top clean candidate focused smoke current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-focused-smoke-current.mjs"]
  },
  {
    name: "A22 top clean candidate type-check current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-typecheck-current.mjs"]
  },
  {
    name: "A22 top clean candidate type-check remediation routing current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-typecheck-remediation-routing-current.mjs"]
  },
  {
    name: "A22 typecheck remediation owner work orders current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-typecheck-remediation-owner-work-orders-current.mjs"]
  },
  {
    name: "A22 top clean candidate build snapshot current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-build-snapshot-current.mjs"]
  },
  {
    name: "A22 top clean candidate build blocker routing current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-build-blocker-routing-current.mjs"]
  },
  {
    name: "A22 fallback clean candidate validation snapshot current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-fallback-clean-candidate-validation-snapshot-current.mjs"]
  },
  {
    name: "A22 top clean candidate root-parity extraction plan current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-root-parity-extraction-plan-current.mjs"]
  },
  {
    name: "A22 root-parity selectedAction canonical preview current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-root-parity-selected-action-canonical-preview-current.mjs"]
  },
  {
    name: "A22 root-parity owner-input landing runway current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-root-parity-owner-input-landing-runway-current.mjs"]
  },
  {
    name: "A22 root-parity owner-input recording current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-root-parity-owner-input-recording-current.mjs"]
  },
  {
    name: "A22 top clean candidate review packet current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-top-clean-candidate-review-packet-current.mjs"]
  },
  {
    name: "A22 clean candidate gate coverage matrix current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-clean-candidate-gate-coverage-matrix-current.mjs"]
  },
  {
    name: "A22 clean source validation queue current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-clean-source-validation-queue-current.mjs"]
  },
  {
    name: "A22 clean source selection review current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-clean-source-selection-review-current.mjs"]
  },
  {
    name: "A22 fallback clean candidate validation sweep current",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-a22-fallback-clean-candidate-validation-sweep-current.mjs"]
  }
];

const strictCommandChecks = [
  {
    name: "A22 release-source clean gate",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-release-source-clean.mjs"]
  },
  {
    name: "A25 strict worktree lifecycle gate",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-worktree-lifecycle.mjs", "--strict"]
  },
  {
    name: "A25 strict final-state selection gate",
    bin: process.execPath,
    args: ["coordination/release-intake/assert-dirty-worktree-final-state-selection-current.mjs", "--strict"]
  }
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function formatCommand(check) {
  const bin = check.bin === process.execPath ? "node" : check.bin;
  return [bin, ...check.args].join(" ");
}

function compactOutput(value, maxLines = 14) {
  const lines = String(value ?? "").trim().split("\n").filter(Boolean);
  if (lines.length <= maxLines) return lines.join("\n");

  const head = Math.floor(maxLines / 2);
  const tail = maxLines - head;
  return [
    ...lines.slice(0, head),
    `... ${lines.length - maxLines} lines omitted ...`,
    ...lines.slice(-tail)
  ].join("\n");
}

function runCheck(check) {
  try {
    const stdout = execFileSync(check.bin, check.args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 128 * 1024 * 1024
    });

    return {
      name: check.name,
      command: formatCommand(check),
      status: 0,
      passed: true,
      stdout: compactOutput(stdout)
    };
  } catch (error) {
    const status = typeof error?.status === "number" ? error.status : 1;
    const stdout = error?.stdout?.toString?.() ?? "";
    const stderr = error?.stderr?.toString?.() ?? "";

    return {
      name: check.name,
      command: formatCommand(check),
      status,
      passed: false,
      stdout: compactOutput(stdout),
      stderr: compactOutput(stderr, 24)
    };
  }
}

function summarizeCurrentArtifacts() {
  const summary = {};

  if (exists("coordination/release-intake/latest-A25-dirty-tree-map.json")) {
    const dirtyMap = readJson("coordination/release-intake/latest-A25-dirty-tree-map.json");
    summary.dirtyMap = {
      generatedAt: dirtyMap.generatedAt,
      statusSignature: dirtyMap.statusSignature,
      expandedStatusEntries: dirtyMap.statusCounts?.expandedStatusEntries
    };
  }

  if (exists("coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json")) {
    const ledger = readJson("coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json");
    summary.finalStateLedger = {
      entries: ledger.entries?.length ?? 0,
      pending: ledger.summary?.pending ?? 0,
      approved: ledger.summary?.approved ?? 0,
      invalid: ledger.summary?.invalid ?? 0
    };
  }

  if (exists("coordination/release-intake/latest-A25-worktree-lifecycle-gate.json")) {
    const lifecycle = readJson("coordination/release-intake/latest-A25-worktree-lifecycle-gate.json");
    summary.worktreeLifecycle = {
      strict: lifecycle.strict,
      worktreeCount: lifecycle.worktreeCount,
      dirtyCount: lifecycle.dirtyCount,
      divergedCleanCount: lifecycle.divergedCleanCount,
      openDecisions: lifecycle.openDecisions?.length ?? 0
    };
  }

  return summary;
}

function evaluateFinalStateClosure() {
  const ledgerPath = "coordination/release-intake/latest-A25-dirty-worktree-final-state-ledger.json";
  if (!exists(ledgerPath)) {
    return {
      name: "A25 final-state ledger closure",
      command: "read latest-A25-dirty-worktree-final-state-ledger.json",
      passed: false,
      failures: [`missing required file: ${ledgerPath}`],
      pending: 0,
      invalid: 0,
      pendingSample: [],
      invalidSample: []
    };
  }

  const ledger = readJson(ledgerPath);
  const entries = ledger.entries ?? [];
  const pendingEntries = entries.filter((entry) => entry.decisionStatus === "pending-owner-approval");
  const invalidEntries = entries.filter((entry) => entry.decisionStatus === "invalid-owner-selection");
  const failures = [];

  if (pendingEntries.length > 0) failures.push(`pending final-state decisions: ${pendingEntries.length}`);
  if (invalidEntries.length > 0) failures.push(`invalid final-state selections: ${invalidEntries.length}`);

  return {
    name: "A25 final-state ledger closure",
    command: "read latest-A25-dirty-worktree-final-state-ledger.json",
    passed: failures.length === 0,
    failures,
    pending: pendingEntries.length,
    invalid: invalidEntries.length,
    pendingSample: pendingEntries.slice(0, 20).map((entry) => entry.ledgerId),
    invalidSample: invalidEntries.slice(0, 20).map((entry) => entry.ledgerId)
  };
}

function finish(payload) {
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 dirty-worktree remediation aggregate gate");
    console.log(`Strict: ${payload.strict ? "yes" : "no"}`);
    console.log(`Currentness checks: ${payload.summary.currentPassed}/${payload.summary.currentTotal}`);
    if (payload.strict) {
      console.log(`Strict closure checks: ${payload.summary.strictPassed}/${payload.summary.strictTotal}`);
      console.log(`Pending final-state decisions: ${payload.artifacts.finalStateLedger?.pending ?? "unknown"}`);
    }
    console.log(`Failures: ${payload.failures.length}`);
  }

  if (payload.failures.length > 0) {
    console.error("A25 dirty-worktree remediation aggregate gate failed.");
    for (const failure of payload.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
}

function main() {
  const currentResults = currentChecks.map(runCheck);
  const strictResults = strict ? strictCommandChecks.map(runCheck) : [];
  const finalStateClosure = strict ? evaluateFinalStateClosure() : null;
  const artifacts = summarizeCurrentArtifacts();

  const failures = [
    ...currentResults.filter((result) => !result.passed).map((result) => `${result.name} failed`),
    ...strictResults.filter((result) => !result.passed).map((result) => `${result.name} failed`)
  ];

  if (finalStateClosure && !finalStateClosure.passed) {
    failures.push(...finalStateClosure.failures.map((failure) => `${finalStateClosure.name}: ${failure}`));
  }

  finish({
    checkedAt: new Date().toISOString(),
    root,
    strict,
    result: failures.length === 0 ? "pass" : "fail",
    summary: {
      currentTotal: currentResults.length,
      currentPassed: currentResults.filter((result) => result.passed).length,
      strictTotal: strictResults.length + (finalStateClosure ? 1 : 0),
      strictPassed: strictResults.filter((result) => result.passed).length + (finalStateClosure?.passed ? 1 : 0)
    },
    artifacts,
    failures,
    currentChecks: currentResults,
    strictChecks: strict ? [...strictResults, finalStateClosure] : []
  });
}

main();
