# Release readiness — fresh production cut after the CA60 freeze (prepared 2026-08-27)

- Prepared by: Claude (owner-directed integration session), for owner decision
- Status of production: `www.mais.ac` / `www.mais.hk` still serve the **pre-2026-08-25**
  deployment. The owner-approved 2026-08-25 content-train run created a Vercel
  deployment but **promotion never happened** — the AI Tutor live-latency gate
  requires owner credentials the executor deliberately does not handle
  (`coordination/reports/2026-08-25-A22-owner-approved-content-train-production-deploy.md`).
- That created deployment is now **28 first-parent merges stale**. Recommendation:
  do **not** promote it; cut a fresh release from current `main`.

## What a fresh cut ships (delta since the stalled 2026-08-25 checkpoint)

Learner- and teacher-facing:
- **HK pipeline P0 fixes** (#176): grader false-rejects 13.8% → 2.9% (LaTeX
  fractions, Chinese unit tails), seeded MC shuffle (always-tap-A 60.3% → 21.6%),
  16 `hk-ease-*` topics so 701 previously invisible questions feed adaptive mastery.
- HK bespoke visualization labs revived (#179).
- Parent-console full remediation (#142) and guardian exit-race fix (#168).
- AR K-G5 CoT-leak repair (#165, landed through the attempt-007 reaffirmation).

QA and gates:
- Widened audit `LEAK_RE` (#152); deterministic CI cleanup gates (#170).
- Pending in review: honest solvability-provenance + JSON-aware zh-Hans gates
  (PR #200 — scripts/CI only, freeze-exempt).

Release engineering (the deploy path itself is substantially harder than on 08-25):
- Production schema bootstrap/preflight series (#164, #171, #173, #195),
  production certification (#177, #178), Vercel sealed mode / bypass secret /
  inspect metadata / check policy (#182–#185), deploy memory (#180), app-storage
  schema + legacy markers (#188, #191, #194, #196), build dashboard output (#163).

Everything on the 2026-08-25 train (the fifteen PRs incl. #143) remains in scope —
none of it ever reached the domains.

## Owner checklist for the fresh cut

1. **Timing decision.** Either wait for CA60 attempt-007 activation/closure, or
   deploy under a new recorded owner exception. Precedent and mechanism both
   exist and are unchanged: `MAIS_OWNER_LIFECYCLE_EXCEPTION_RECORD` pointing at
   a committed owner-approved record (the strict A25 lifecycle gate blocks every
   runtime release on this multi-lane checkout regardless of the freeze, so the
   exception is needed either way). The promotion-shadow gate constrains PR
   merges, not the deploy workflow.
2. **Write the new exception record** under `coordination/reports/` (model it on
   the 2026-08-25 record: name what is waived — the strict open-decision
   failure only — and what is explicitly not waived).
3. **Refresh the A25 dirty-tree map** inside the release worktree at cut time
   (the currency gate is not waived).
4. **Rebase or re-cut the release branch** (`release/2026-08-25-content-train`
   worktree `/Volumes/Starship/MAIS-release-checkpoint-wt` can be fast-forwarded
   to current `main`, or cut a fresh `release/2026-08-XX-…` slice). Watch the
   known trap: `M next-env.d.ts` from a prior build fails the clean gate —
   `git restore next-env.d.ts` first.
5. **Dry run**: `npm run vercel:production -- --dry-run --run-id "<date>-<scope>"`
   must exit 0 with `forbiddenPathCount: 0`.
6. **The one human-required step**: the production run needs
   `AI_TUTOR_LIVE_USERNAME` / `AI_TUTOR_LIVE_PASSWORD` (owner live-account
   credentials) or the tutor live-latency gate fails closed exactly as it did on
   08-25. Everything else is scripted. Run via the protected GitHub Actions
   production workflow (schema-preflight mode, then deploy mode), per RELEASE.md.
7. **Post-deploy**: authenticated/read-only smokes on both domains are part of
   the workflow; record the outcome in `coordination/reports/` and close the
   release worktree per lifecycle.

## Post-freeze content batch (queue for one rider, do not trickle)

When content paths unfreeze (or as one reaffirmed rider):
- The 99 zh-Hans pack findings surfaced by PR #200's JSON-aware audit
  (19 Traditional-character leaks incl. 個/於 in AR K-5 explanations and 覆 in
  PEP-High lessons; 17 `函数图像→函数图象`; 62 HK grade-name warnings — triage
  the warnings before "fixing": HK grade names may be intentional in HK-context
  strings).
- The 8 known P2 duplicate-distractor / format-equal-option items in the AR
  K-G5 bank (listed in every `audit:us-math-items` run).
- Frozen open PRs to land: #174 (CA translations, 2,382 strings + the
  first JSON-aware CA zh audit — wire `audit-ca-translations.mjs` into CI when
  it lands), #160 (K-5 data-display diagram kind), #167 (teacher search
  redirect).

## Reference

- Runbook: `RELEASE.md` (A22 executes, A25 gates, A10 owns the doc).
- Stalled-run record + exact promotion command:
  `coordination/reports/2026-08-25-A22-owner-approved-content-train-production-deploy.md`.
- Solvability truth for release notes: 1,832 / 24k+ rows independently verified
  (PR #200 baseline) — do not cite legacy "answer-key matched" reports as
  content-quality evidence.
