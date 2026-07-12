# 2026-07-01 A20/A04/A12/A22 Adventure Island Vercel Timeout

- Agent IDs: A20 Adventure Island game route target, A04 Practice Arena caller, A12 API/persistence stability, A22 Vercel timeout evidence.
- Objective: Fix the Vercel anomaly where `/api/gamification/adventure-island` received a single-user burst from `/practice` and timed out at the 300-second Vercel limit.
- Initial evidence: Vercel screenshots report 52.3% error rate, 357 failed requests, mostly 504 timeout, no external API calls, and `node:sqlite` runtime warnings. The failure boundary is internal app code, not provider transport.
- Root-cause hypothesis before patch: the Practice Arena game-unlock effect can refetch the Adventure Island eligibility route repeatedly because completed-round payload derivation depends on `rememberedGameRoundPayload` and the effect writes that remembered payload with a fresh object.
- Planned files: `app/practice/page.tsx`, `app/practice/practiceArenaPageRegressions.test.ts`, this session log.
- Scope note: repository root is already very dirty. This session will not revert, stage, branch, deploy, or touch unrelated A01-A25 surfaces.
- Red step: add a focused source regression that requires stable completed-round payload derivation and equality-guarded remembered payload writes before patching implementation.
- Red check: `node --test app/practice/practiceArenaPageRegressions.test.ts` failed before the implementation patch because `activeSummaryGameRoundPayload` and `samePracticeGameRoundPayload` were absent.
- Fix: split completed-summary payload derivation into a stable `activeSummaryGameRoundPayload` memo, keep remembered payload fallback only for non-complete summaries, and guard `setRememberedGameRoundPayload` with `samePracticeGameRoundPayload`.
- Passing check: `node --test app/practice/practiceArenaPageRegressions.test.ts` passed 5/5 after the patch.
- Passing check: `git diff --check -- app/practice/page.tsx app/practice/practiceArenaPageRegressions.test.ts coordination/session-logs/2026-07-01-A20-adventure-island-vercel-timeout.md` produced no output.
- Passing check: `npx playwright test tests/e2e/adventure-island.spec.ts --project=desktop-chrome --reporter=list -g "starts from the personalized 100% summary Adventure Island CTA"` passed 1/1 in 1.5 minutes.
- Broader check: `npm run type-check` remains red on unrelated A06 Manim/tmp validator files; no `app/practice` or Adventure Island type errors appeared in the reported output.
- Residual risk: this root still contains many unrelated dirty files, so A22 production release should use a clean reviewed slice rather than this dirty root.
