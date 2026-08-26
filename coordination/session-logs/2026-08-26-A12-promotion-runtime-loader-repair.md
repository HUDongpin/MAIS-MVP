# 2026-08-26 A12 Promotion Runtime Loader Repair

- Owner: A12 Backend/API platform lead
- Branch: `codex/a12-promotion-runtime-loader-repair-20260826`
- Worktree: `.worktrees/a12-promotion-runtime-loader-repair-20260826`
- Target PR: compose into draft PR #162 (`https://github.com/HUDongpin/MAIS-MVP/pull/162`)
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `codex/a23-promotion-shadow-attempt-002-20260826@79396bb941758e28b5196eddce2be9ef75d3d671` (`origin/main@7f7c4859877c9808fb4bdf98287bb5645b6e751b` plus Promotion Gate and A04/A05/A03 remediation slices)
- Declared slice: remove backend dynamic-loader reachability for candidate-only BNU primary, HJB primary/high, and Florida question packages; replace the seeded California demo assessment's candidate question IDs with exact IDs from the retained hand-checked CCSS live practice package.
- Hard boundary: no candidate rewrite, live promotion, Preview, deploy, provider, database, credential, production write, or `liveAllowed=true` action is authorized.
- Preserve-first intake: A25 refresh `promotion-attempt-002-intake-20260826-b` completed before the parent A23 composition; the dirty shared root is not an implementation or evidence source.

## Initial state

- Static aggregates and lesson/roadmap paths have been de-reached by owner slices, but `lib/server/questionStore.ts` still contains literal dynamic imports for the removed packages, and the teacher-operations seed still names four IDs from the 492-question candidate-only package.

## Handoff / closeout

- Removed backend dynamic-loader reachability for the candidate-only BNU primary,
  HJB primary/high, and Florida question packages. The retained BNU junior/high,
  HJB junior, Arkansas K-5, California, and CCSS paths are unchanged by this
  slice.
- Replaced the seeded California Grade 1 assessment's four 492-package IDs with
  four exact IDs from the retained `ccss-textbook-practice-v1` live aggregate.
- Verification on this clean worktree:
  - `npm run type-check` — pass.
  - `npx tsx --tsconfig tsconfig.json --test lib/server/userStoreTeacherOpsAssessmentPersistence.test.ts`
    — 53/53 pass.
  - Direct aggregate lookup — each replacement ID occurs exactly once in
    `data/questions.ts` (16,499 total live questions at this slice).
  - Static forbidden-string scan — no removed package loader or old 492 seed ID
    remains in the three changed runtime/test files.
  - `git diff --check` — pass.
- Candidate source files, immutable Promotion Gate attempt-001 artifacts, live
  authorization, deployment surfaces, credentials, and production state were not
  changed.
- Follow-up graph audit found that `lib/server/userStore.ts` still reached the
  HJB high v2 candidate JSON solely through a display-translation import. Moved
  that byte-independent translation table to `lib/hjbHighDisplayText.ts`, kept
  the existing HJB topic exports source-compatible, and made `userStore` import
  the pure helper directly. This preserves the exact translations while removing
  the candidate package from the runtime import chain.
- Follow-up verification: type-check passed; direct translation parity for known
  chapter, volume, and combined display text passed; diff check passed. The
  canonical Promotion Gate graph is re-audited in the parent A23 composition
  after this commit is merged.
