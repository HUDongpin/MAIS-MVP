# 2026-06-26 A25 Effective Work Order - A11 QA and release quality

- Owner: A11 QA and release quality
- Priority: P2
- Reason: Regression and release-quality package.
- Entries: 62
- From P0 proposals: 1
- Dominant slice: tests/regression evidence: 62
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec`

## Required Final State

Reviewed commit, owner-approved discard, evidence archive, or blocker.

## Suggested Commands

```bash
git status --short --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec
git diff --stat --pathspec-from-file=coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec
```

## Status Buckets

- `M`: 35
- `??`: 27

## P0 Proposal Confidence

- high: 1

## Path Sample

- `M` `lib/mvpReadiness.test.ts` (from P0 proposal)
- `M` `tests/e2e/adaptive-llm-smoke.spec.ts`
- `M` `tests/e2e/adventure-island.spec.ts`
- `M` `tests/e2e/ai-tutor-deepseek.spec.ts`
- `M` `tests/e2e/ai-tutor-live-text.spec.ts`
- `M` `tests/e2e/app-shell-auth.spec.ts`
- `M` `tests/e2e/backend-api.spec.ts`
- `M` `tests/e2e/console-readonly-audit.spec.ts`
- `M` `tests/e2e/deepseek-fetch-proxy.cjs`
- `M` `tests/e2e/fishing-game.spec.ts`
- `M` `tests/e2e/fishing-master-adventure.spec.ts`
- `M` `tests/e2e/gamification.spec.ts`
- `M` `tests/e2e/helpers.ts`
- `M` `tests/e2e/home-functional.spec.ts`
- `M` `tests/e2e/isolated-app.ts`
- `M` `tests/e2e/lesson-all.spec.ts`
- `M` `tests/e2e/mainland-hjb-lesson-only.spec.ts`
- `M` `tests/e2e/mainland-hjb-roadmaps.spec.ts`
- `M` `tests/e2e/mainland-pep-primary-lessons.spec.ts`
- `M` `tests/e2e/mainland-pep-roadmaps.spec.ts`
- `M` `tests/e2e/parent-console.spec.ts`
- `M` `tests/e2e/practice-pager.spec.ts`
- `M` `tests/e2e/production-auth-storage-smoke.spec.ts`
- `M` `tests/e2e/production-game-smoke.spec.ts`
- `M` `tests/e2e/production-visualization-values.spec.ts`
- `M` `tests/e2e/student-button-dropdown-matrix.spec.ts`
- `M` `tests/e2e/student-frontend.spec.ts`
- `M` `tests/e2e/student-smoke.spec.ts`
- `M` `tests/e2e/teacher-console-button-matrix.spec.ts`
- `M` `tests/e2e/teacher-student-cross-role.spec.ts`
- `M` `tests/e2e/teacher-workspace.spec.ts`
- `M` `tests/e2e/ui-ux-regression.spec.ts`
- `M` `tests/e2e/visualization-ai-classroom.spec.ts`
- `M` `tests/e2e/visualization-overlap.spec.ts`
- `M` `tests/e2e/visualization-values.spec.ts`
- `??` `tests/e2e/auth-login-stability.spec.ts`
- `??` `tests/e2e/california-grade1-micro-lessons.spec.ts`
- `??` `tests/e2e/california-high-school-textbook-review.spec.ts`
- `??` `tests/e2e/california-high-school-textbook-student-release.spec.ts`
- `??` `tests/e2e/california-k5-textbook-lessons.spec.ts`
- `??` `tests/e2e/california-middle-school-textbook-english-only.spec.ts`
- `??` `tests/e2e/california-student-assignment-flow.spec.ts`
- `??` `tests/e2e/class-forum.spec.ts`
- `??` `tests/e2e/guest-login-prompt.spec.ts`
- `??` `tests/e2e/lesson-ai-selection.spec.ts`
- `??` `tests/e2e/login-input-width.spec.ts`
- `??` `tests/e2e/mainland-pep-high-lessons.spec.ts`
- `??` `tests/e2e/mainland-pep-junior-lessons-smoke.spec.ts`
- `??` `tests/e2e/nova-lens-api.spec.ts`
- `??` `tests/e2e/production-auth-api-preflight.spec.ts`
- `??` `tests/e2e/release-matrix-continuation.spec.ts`
- `??` `tests/e2e/reported-bug-regressions.spec.ts`
- `??` `tests/e2e/reported-bug-source-regressions.test.ts`
- `??` `tests/e2e/shirleen-navbar-three-minute-auth.spec.ts`
- `??` `tests/e2e/shirleen-visualization-auth-regression.spec.ts`
- `??` `tests/e2e/student-learning-analytics-backend.spec.ts`
- `??` `tests/e2e/teacher-operations.spec.ts`
- `??` `tests/e2e/teacher-parent-hydration.spec.ts`
- `??` `tests/e2e/teacher-parent-p1-regressions.spec.ts`
- `??` `tests/e2e/teacher-prep-toolchain.spec.ts`
- `??` `tests/e2e/teacher-review-lesson.spec.ts`
- `??` `tests/e2e/visualization-persistence.spec.ts`
