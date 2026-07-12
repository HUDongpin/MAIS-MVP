export const OWNER_ACTIVE_WORKTREE_HOLD = {
  status: "waiting-for-owner-compose-deletion-confirmation",
  activeWorktreePath: "/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628",
  reason: "Owner reported active exact deletion in this compose worktree; linked-worktree archive, Wave 06, aggregate remediation, and completion-audit refreshes should wait for owner confirmation.",
  resumeCondition: "Owner confirms exact deletion in the compose worktree is complete."
};

export const SAFE_POST_INPUT_VALIDATION_COMMANDS = [
  "node coordination/release-intake/assert-next-owner-authorizations-current.mjs",
  "node coordination/release-intake/generate-next-owner-authorization-execution-preview.mjs",
  "node coordination/release-intake/assert-next-owner-authorization-execution-preview-current.mjs",
  "node coordination/release-intake/assert-owner-package-blocker-report-records-current.mjs",
  "node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs"
];

export const DEFERRED_AGGREGATE_VALIDATION_COMMANDS = [
  "node coordination/release-intake/refresh-linked-worktree-archive-evidence.mjs",
  "node coordination/release-intake/assert-linked-worktree-archive-evidence-current.mjs",
  "node coordination/release-intake/generate-wave06-final-root-lifecycle-readiness.mjs",
  "node coordination/release-intake/assert-wave06-final-root-lifecycle-readiness-current.mjs",
  "node coordination/release-intake/refresh-dirty-worktree-remediation-evidence.mjs --reason \"owner input action packet post-input verification\"",
  "node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs",
  "node coordination/release-intake/generate-dirty-worktree-remediation-completion-audit.mjs",
  "node coordination/release-intake/assert-dirty-worktree-remediation-completion-audit-current.mjs"
];

export function validationHoldWithCommands() {
  return {
    ...OWNER_ACTIVE_WORKTREE_HOLD,
    safePostInputValidationCommands: SAFE_POST_INPUT_VALIDATION_COMMANDS,
    deferredAggregateValidationCommands: DEFERRED_AGGREGATE_VALIDATION_COMMANDS
  };
}
