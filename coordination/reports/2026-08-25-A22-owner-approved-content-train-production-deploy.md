# A22 release record — owner-approved 2026-08-25 content-train production deploy

- Date: 2026-08-25 (record opened `2026-08-25T13:02Z`)
- Run id: `20260825-content-train`
- Source branch: `release/2026-08-25-content-train` (pushed to origin)
- Source HEAD at deploy: merge of `origin/main` `7f7c485987` (PR #143 merge) into the release branch
- Executor: Claude (owner-directed session), A22 role
- Owner instruction: explicit, given 2026-08-25 in the owner's session — "merge #143, and the deploy go/no-go with a recorded exception" — following the sequence acceptance "do them" covering release-checkpoint execution.

## What ships

Everything merged to `main` on 2026-08-25 (fifteen PRs): the CA/AR question-bank
repair train (#145–#151), the CA audit-gate toolkit (#153), the two-door and
15-bug practice/lesson fixes (#155–#157), the China-QA salvage (#158), the
grading-leniency + K-5 answer/ledger repairs (#159), and the CA
Codex-visualization-labs → Claude signature-bench replacement, phases 1/2a/4
(#143).

## Owner exception (why and what exactly is waived)

The A25 strict worktree lifecycle gate (`coordination/release-intake/
assert-worktree-lifecycle.mjs --strict`, shipped 2026-07-11, commit
`3ac3758bac`) fails whenever ANY registered worktree is dirty or diverged from
`origin/main`. On this checkout — a permanent multi-lane integration inventory
with ~56 registered worktrees across parallel owner sessions — that blocks
every runtime release path (production AND preview) unconditionally; it counts
even the release branch itself as an open decision. The runbook's own
precedent is the 2026-07-13 owner-approved deploy, two days after the gate
landed.

**Waived (this release only):** the strict open-decision failure of the
worktree lifecycle gate. Mechanism: `MAIS_WORKTREE_LIFECYCLE_GATE` pointed at
`scripts/assert-worktree-lifecycle-owner-exception.mjs` (committed on the
release branch), which runs the REAL gate non-strict so its inventory is still
computed and printed.

**Explicitly NOT waived:** the A25 dirty-tree-map currency gate (map refreshed
`20260825T130230Z` inside the release worktree, 0 dirty entries, committed on
this branch), the A22 release-source clean gate (the release worktree is a
clean slice at current `main`), the pruned-staging forbidden-path audit, the
env/runtime preflights, the local build gate, and the post-deploy latency/UI
smokes.

## Slice verification (release tree, exit codes checked directly)

- `npm run type-check` — exit 0
- `npm run test:mvp` — 32/32
- `npm run test:question-bank` — 98/98 (incl. fullQuestionBankSolvability)
- California battery: `data/usCaliforniaLessons.test.ts` + `lib/californiaGradeAware.test.ts` — 15/17; **both failures bisect-proven pre-existing** on pre-train main `b6c7c347a4` (stale assertions owned by the A01/A05 lanes; not introduced by this release)
- All fifteen shipped PRs merged with green CI (`validate`, `snapshot`, `postgres-integration`, `visualization-browser`, `teacher-parent-e2e` as applicable).

## Dry run and deploy

- Dry run (`--dry-run --json`, run id `20260825-content-train`): **exit 0** —
  `forbiddenPathCount: 0`, `stagingFileCount: 3243`, local build gate passed,
  release-source clean gate passed, lifecycle gate passed non-strict under the
  recorded exception (waiver printed with this record's path).
- Guard change enabling the exception: `scripts/release-env-guard.mjs` gained
  `MAIS_OWNER_LIFECYCLE_EXCEPTION_RECORD` (must name an owner-approved record
  committed under `coordination/reports/`; the gate then runs non-strict with
  its inventory still printed). `release-env-guard.test.mjs` 3/3. The
  test-only gate-override hardening and all other preflights are unchanged.
- Production run: preflight passed → build gate passed → pruned staging
  audited → **deployment created** (`--skip-domain`, fail-closed):
  `https://mais-mvp-peter-dongpin-hu-s-projects.vercel.app` → dashboard smoke
  passed with `DASHBOARD_SMOKE_USE_DEMO_LOGIN=1` → **AI Tutor live latency
  gate NOT passed: production (correctly) has no `HK_MATH_ENABLE_DEMO_USER`,
  so the demo-login probe gets HTTP 401. The gate requires owner-supplied
  `AI_TUTOR_LIVE_USERNAME`/`AI_TUTOR_LIVE_PASSWORD`.**
- **Domain state: unchanged.** `www.mais.ac` / `www.mais.hk` remain on the
  previous production deployment. No promotion occurred.

## Remaining step (owner-run)

Promotion completes by re-running the deploy with the owner's live-account
credentials in the environment (the executor deliberately does not handle
credentials):

```sh
cd /Volumes/Starship/MAIS-release-checkpoint-wt
MAIS_OWNER_LIFECYCLE_EXCEPTION_RECORD=coordination/reports/2026-08-25-A22-owner-approved-content-train-production-deploy.md \
MAIS_RELEASE_SOURCE_KIND=pruned-staging MAIS_OWNER_APPROVED_PRUNED_STAGING=1 \
DASHBOARD_SMOKE_USE_DEMO_LOGIN=1 \
AI_TUTOR_LIVE_USERNAME='<owner account>' AI_TUTOR_LIVE_PASSWORD='<owner password>' \
npm run vercel:production -- --run-id "20260825-content-train"
```

(If the tree shows `M next-env.d.ts` from a prior build, `git restore
next-env.d.ts` first — the clean gate counts it.)
