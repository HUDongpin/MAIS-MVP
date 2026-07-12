# S22 California K-5 Textbook Release Blocker - 2026-06-19

## Scope

- Session: S22 production reliability and release engineering.
- Package: `coordination/content-qa/us-ca-math-k-g5-textbooks-v1/`.
- Live source: `data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json`.
- Release target: `www.mais.hk` through Vercel.

## Resolution

Resolved on 2026-06-19 by publishing a clean release slice instead of deploying from the dirty root.

- Clean slice source: previous production staging baseline `.tmp/vercel-staging/20260619T043704Z` plus the California K-5 runtime overlay.
- Clean slice path: `.tmp/vercel-staging/ca-k5-clean-slice-20260619`.
- Clean slice source file count after removing local build output: 3016.
- Clean slice local `npm run build`: passed, 141 pages.
- Production deployment: `dpl_CV3Zi56yrp6MCazMSVboM5NeTckh`.
- Production URL: `https://mais-de7ro799r-peter-dongpin-hu-s-projects.vercel.app`.
- Aliases verified by `vercel inspect`: `https://www.mais.hk`, `https://mais.hk`, and Vercel project aliases.
- Production S11 route regression: passed, 1/1.

## Green Gates

- S18 sampling: approved for integration review after S21 repaired grade-fit issues.
- S05 live integration: 29 California K-5 textbook lesson seeds integrated.
- S11 route regression: representative K lesson API/student route passed.
- `npm run type-check`: passed.
- `npm run test:question-bank`: passed, 75/75.
- `npm run build`: passed.
- Vercel production dry-run with pruned staging and explicit dirty-root override: passed.
  - Staging file count: 3020.
  - Staging bytes: 700653842.
  - Forbidden path count: 0.

## Blocker

Production publication was originally blocked by S22/S25 dirty-root release policy.

The non-override production publish guard fails because the current repository has a broad unrelated dirty tree:

- Status entries: 1732.
- Tracked modified entries: 297.
- Tracked deleted entries: 48.
- Untracked status entries: 1387.
- Untracked files: 2733.

This was a release hygiene blocker, not a California content QA blocker. Deploying from this root would have published the current broad deployable workspace, not just the California K-5 slice.

## Mainland PEP PNG Decision

The three previous `npm run test:question-bank` failures were unrelated Mainland PEP PNG checks. The project no longer has those PNG assets, and `lib/mainlandPepQuestionAssets.ts` intentionally exposes an empty approval list.

Decision: do not fabricate or restore placeholder PNGs. Tests now require filesystem PNG existence only when a question has an approved asset manifest entry. Questions without approved assets remain text-only.

## Release Recommendation

Completed: a clean reviewed release slice was prepared and published. Do not reuse the dirty-root override for follow-up deployments unless the owner explicitly approves that risk.
