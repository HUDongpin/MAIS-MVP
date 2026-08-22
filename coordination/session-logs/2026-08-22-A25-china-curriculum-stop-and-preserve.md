# A25 China curriculum stop-and-preserve handoff

Date: 2026-08-22 (Asia/Hong_Kong)

Branch: `codex/a18-china-all-math-qa`

Purpose: stop the open-ended China mathematics curriculum QA sessions and preserve their current work as reviewable local checkpoints. These commits are archival/recovery checkpoints, not an A18 approval, A11 regression approval, A22 release decision, merge candidate, deployment, or live-production proof.

## Local checkpoint commits

- `31a9b660d5` `chore(checkpoint): preserve China curriculum evidence and generated packs`
  - 124 evidence, review, generator, generated-question-bank, and generated-lesson files.
  - The two dated full-bank CSV archives intentionally retain the original two-space line endings inside a multiline vertical-arithmetic field. `git diff --check` therefore reports twelve trailing-whitespace findings in those immutable evidence rows only.
- `951cc9ef52` `feat(curriculum): preserve China lesson and question checkpoint`
  - 90 China lesson, question, localization, unit-contract, review-tool, and focused validation files.
  - `git diff --check` passed before commit.
- `8683aa3cb1` `chore(checkpoint): quarantine shared China dependencies`
  - 17 shared answer matching, feedback, persistence, schema, Playwright, and backend-test dependencies.
  - This commit is intentionally isolated because its files require A08/A11/A12/A22 review before promotion.

## Evidence boundary at stop

- Earlier task records contain substantial deterministic, focused browser, scoring, persistence, and question-bank evidence, but the last BNU Junior focused/full-bank invocation was interrupted before a terminal result.
- The remaining English lesson discovery, both Chinese locale campaigns, the frozen 1,152-page provider campaign, and the final 2,304-state browser matrix were not completed.
- A fresh whole-worktree validation is recorded separately after these checkpoint commits. Any red or resource-limited check remains a blocker rather than being relabeled as success.
- No commit in this branch is represented as current-main integration proof because the worktree started from an older baseline.

## Deliberately uncommitted exclusions

- `next-env.d.ts`: generated path noise.
- `tests/e2e/california-student-assignment-flow.spec.ts`: California-only work.
- `lib/hongKongLessonPageContent.test.ts`: Hong Kong-only work.
- `app/practice/page.tsx`: broad live Practice Arena surface outside the stop-and-preserve content slice.
- `components/visualizations/CalculusStatsLab.tsx` and `components/visualizations/CalculusStatsLab.test.ts`: visualization-owned work.
- `data/visualizationLabs.ts`: shared visualization catalog, to be dispositioned with the China visualization worktree.

## Push and release boundary

The branch is committed locally but is not pushed in this handoff. The evidence/generated-pack commit contains a large volume of generated questions, historical QA snapshots, and potentially source-derived materials. External publication to the GitHub repository requires the owner's explicit informed authorization for that payload or a later sanitized extraction that excludes it.

## Fresh finite validation after checkpointing

- `npm run type-check`: PASS, exit 0.
- `./node_modules/.bin/tsx --test lib/mainlandBnuJuniorQuestionBank.test.ts`: PASS, 52/52, including the 17,700-row Mainland runtime exposure check and the final parallel-line English proof contract.
- No open-ended provider, 384-page discovery, 1,152-page provider, or 2,304-state browser campaign was restarted.
