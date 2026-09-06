# 2026-08-26 A05 Promotion Shadow Lesson v2

- Owner: A05 Lesson lead
- Branch: `codex/a05-promotion-shadow-lesson-v2-20260826`
- Worktree: `.worktrees/a05-promotion-shadow-lesson-v2-20260826`
- Target PR: compose into draft PR #162 (`https://github.com/HUDongpin/MAIS-MVP/pull/162`)
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `codex/a23-promotion-shadow-attempt-002-20260826@1c01e85123`
- Declared slice: define and approve the non-live lesson Shadow mapping for
  candidate digest `c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6`.
- Hard boundary: no import into `data/lessons.ts` or `components/lesson/`, no
  runtime registry edit, no guessed/default/localized fields, and no live action.

## Mapping decision

- The lesson maps only to a temporary `shadow-lesson-dto.v2`.
- Objective, worked example, guided practice, independent practice, and both
  remediation moves are preserved as the ordered instructional spine.
- Prerequisite check and concept explanation are preserved as compatibility
  metadata rather than dropped. Teacher-only/runtime-unsupported information is
  marked `preserved-outside-runtime`.
- The worked example binds the exact v2 practice ID and answer `12 cups`; guided
  and independent activities retain their expected answers and rubric/check.
- English-only localization remains an explicit live blocker and is not filled
  by the adapter.

## Handoff / closeout

- Machine evidence is ready for A23 manifest binding. Future live lesson
  integration remains a separate A05-owned decision and is not authorized here.
