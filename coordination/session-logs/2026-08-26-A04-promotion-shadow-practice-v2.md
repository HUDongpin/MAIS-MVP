# 2026-08-26 A04 Promotion Shadow Practice v2

- Owner: A04 Practice lead
- Branch: `codex/a04-promotion-shadow-practice-v2-20260826`
- Worktree: `.worktrees/a04-promotion-shadow-practice-v2-20260826`
- Target PR: compose into draft PR #162 (`https://github.com/HUDongpin/MAIS-MVP/pull/162`)
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `codex/a23-promotion-shadow-attempt-002-20260826@cbfb2dce39`
- Declared slice: define and approve the non-live practice Shadow mapping for
  candidate digest `c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6`.
- Hard boundary: no import into `data/questions.ts`, no runtime registry edit, no
  guessed/default fields, and no live authorization.

## Mapping decision

- The practice record maps only to a temporary `shadow-practice-dto.v2`.
- Answer acceptance is exact after trim and is limited to `12` and `12 cups`.
- The numeric oracle is 12; ratio order and the two explicit scale operations
  are mandatory.
- `cluster-safe-card-v2` maps explicitly to the runtime-compatible `standards`
  category. Fine-grained canonical/MAIS IDs, `domainIds`, and `clusterId` remain
  in compatibility metadata when the runtime has no lossless field.
- Missing locales are reported as `preserved-outside-runtime`; no default grade,
  standard, answer, card kind, or ID is allowed.

## Handoff / closeout

- Machine evidence is ready for A23 manifest binding. Future live integration
  remains a separate A04-owned decision and is not authorized here.
