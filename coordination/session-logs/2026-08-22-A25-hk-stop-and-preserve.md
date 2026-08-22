# A25 Hong Kong mathematics stop-and-preserve handoff — 2026-08-22

## Owner instruction

The owner requested that the long-running California, Hong Kong, and China mathematics loops stop because continued looping was inefficient. The recoverable Hong Kong results were to be committed locally and pushed to GitHub for preservation.

## Preservation branch

- Worktree: `/Volumes/Starship/MAIS-hk-ease-v2-qa-wt`
- Branch: `codex/a18-hk-ease-v2-qa`
- Original base: `3f8f12c4d3fd2efe938d1b07cab6289315f108dd`
- Live `origin/main` at closeout: `dc732c7dcb6d3126415d80b5fbfd80f2febe0e7f`
- Purpose: checkpoint preservation only; not a merge, release, deployment, or production approval.

## Local checkpoint commits

- `935ade6663` — HK authoritative QA evidence, generated EASE package, historical snapshots, and HK-specific contracts.
- `cdd62cb261` — HK lesson, question, RAG, grading, response, and lesson regression checkpoint.
- `ed70f936bf` — HK Visualization runtime, semantic models, routing, and visualization-session contracts.
- `c5709795bc` — HK Visualization E2E, source-freeze, process, and staging harness.
- `17853e46cb` — shared adaptive/provider/persistence/type dependencies isolated in a quarantine checkpoint.

## Fresh closeout validation

- `npm run type-check`: PASS.
- `node --test --test-concurrency=1 coordination/content-qa/hk-question-bank-evidence-runner.test.mjs`: 22/22 PASS when rerun with permission to write its worktree-local `.tmp` fixtures.
- `git diff --check`: PASS for the committed source slices, except one intentionally immutable evidence blob retains its original final blank line.
- `npm run test:visualizations`: not accepted in this closeout run because TypeScript compilation exceeded the default Node heap and terminated with an out-of-memory error. Earlier thread evidence reported 1,144/1,144, but that older result is not promoted to a fresh closeout pass.

## Intentionally excluded

- `.tmp/**`, Playwright traces, browser profiles, databases, caches, build outputs, and generated local runtime receipts.
- Four Mainland-only visualization files under `components/visualizations/mainland/`.
- Six Mainland/full-bank reports dated 2026-08-11 under `coordination/content-qa/`.
- The separate HK content and HK visualization worktrees remain available for forensic comparison because they contain divergent historical bytes; they were not overwritten, cleaned, or removed.

## Remaining evidence boundary

The branch preserves valuable partial work but is not current-main integrated. It began 45 commits behind live `origin/main` and still requires owner-by-owner conflict reconciliation before cherry-pick or merge. Browser/canonical gates, full A18/A11/A22 approval, candidate-to-live promotion, deployment, and live-production proof remain incomplete.
