# MAIS Release Runbook

> One documented path from a reviewed change to `www.mais.ac` / `www.mais.hk`.
> Owners: **A22** (release engineering) executes; **A25** (git hygiene) gates; **A10** owns this doc.
> This runbook describes the **existing, proven** tooling — it adds no new scripts.

---

## The one rule

**Never deploy the dirty root.** The repository root is a permanently dirty, multi-owner
integration inventory (see `coordination/release-intake/latest-A25-dirty-tree-map.md`) and is
actively edited by parallel sessions. Every production release ships from a **reviewed clean
slice** built into a **pruned staging package**, never from `vercel deploy .` at the root.

`scripts/prepare-vercel-staging.mjs` enforces this: it copies only the runtime trees
(`app/ components/ data/ lib/ types/` + approved `public/` assets and required root config) and
**hard-excludes** `.git .local .tmp .vercel coordination node_modules private Users`, `.env*`,
`All API Keys.docx`, and other secrets/backlogs. A release with any forbidden path in the upload
tree is a **NO-GO**.

---

## TL;DR — the one command

```bash
# 1. Dry run: preflight + build gate + pruned staging, NO deploy. Always run this first.
npm run vercel:production -- --dry-run --run-id "$(date +%Y%m%d)-<scope>"

# 2. Real deploy (only after a green dry run AND explicit owner go):
npm run vercel:production -- --run-id "$(date +%Y%m%d)-<scope>"
```

`vercel:production` (`scripts/deploy-vercel-production.mjs`) already chains, in order:
env/runtime **preflight** → dashboard-smoke-auth precheck → **release build gate**
(`next build` in an isolated `NEXT_DIST_DIR`, verifying required route/page outputs) →
**pruned staging** (forbidden-path audit) → `vercel deploy` → post-deploy **latency / UI smoke
gates** on the live domains. The dry run performs everything except the deploy and smokes.

---

## Full workflow — reviewed clean slice → production

### 0. Preconditions
- You have an **owner instruction to deploy** (production is a live student-facing site; deploy is
  gated per the safety rules and per `AGENTS.md` — A22 must not publish from a dirty root without
  an explicit, recorded owner exception).
- Vercel env is configured (A19). `npm run release:env-preflight` and
  `release:runtime-preflight` should pass; redacted-name gate is A19-owned.

### 1. Refresh the dirty-tree map (A25 gate)
```bash
npm run release:dirty-map -- --reason "<why you are releasing>"
```
Runtime release stays **blocked** until this map is current at preflight time. It classifies every
dirty entry by owner/slice so you know what is and is not part of your release.

### 2. Cut a clean slice on its own branch (do not deploy the root)
Branch off the current HEAD and stage **only** your change with **explicit paths** — never
`git add .` (parallel sessions are writing to the tree; a blanket add sweeps unrelated work):
```bash
git checkout -b release/$(date +%Y-%m-%d)-<scope>
git add <exact files for this slice>     # explicit paths only
git commit -m "<type(scope): summary>"    # one reviewable slice per concern
```
Keep unrelated dirty files out of the commit. One slice = one concern (e.g. a content fix and an
unrelated CI fix are two commits / two review units).

### 3. Verify the slice (regression gates)
Run the gates relevant to your slice. For a **content / data** slice, the minimum battery is:
```bash
npm run type-check                              # exit 0
npm run test:mvp                                # MVP readiness contract
npm run test:question-bank                      # incl. fullQuestionBankSolvability
npx tsx --test data/usCaliforniaLessons.test.ts lib/californiaGradeAware.test.ts   # if California content
```
For a **full** pre-release sweep: `npm run check` (type-check → zh-hans strict → analytics →
rag → question-bank → mvp → build). Route red gates to the owning agent per the `AGENTS.md`
student red-gate map (A01 shell/auth, A02 dashboard, A03 roadmap, A04 practice, A05 lessons,
A06 viz, A09 copy/a11y, A15 adaptive).

### 4. Dry-run the release (build gate + staging audit)
```bash
npm run vercel:production -- --dry-run --json --run-id "$(date +%Y%m%d)-<scope>"
```
Confirm in the JSON: `forbiddenPathCount: 0`, a sane `stagingFileCount`, and
`localBuildGate` passed. If forbidden paths appear, fix the exclusion — **do not** hand-delete
from the staging tree.

### 5. Deploy (explicit owner go required)
```bash
npm run vercel:production -- --run-id "$(date +%Y%m%d)-<scope>"
```
The script promotes only after the post-deploy latency/UI smoke gates pass. Record a release
report under `coordination/reports/` (source branch+HEAD, A25 map signature/time, staging file
count + bytes, forbidden-path count, gate results) — matching
`coordination/reports/2026-07-13-A22-owner-approved-dirty-root-production-deploy.md`.

### 6. Rollback
Rollback is a Vercel **promotion swap back to the previous production deployment** (the prior
alias target) — no code revert needed. For a slice-level undo, drop the slice commit(s) from the
release branch and re-run the dry run. Keep the pre-deploy staging manifest so rollback is exactly
"remove these files / re-point the alias."

---

## Classroom-concurrency load smoke (staging gate)

The latency smokes above measure **one** student on an idle site. `smoke:classroom-load`
measures the case that actually breaks a school day: a whole class submitting at once.
It logs N students in concurrently, then for M rounds has every student POST a practice
attempt, POST lesson progress, and GET the dashboard **simultaneously**, reporting
per-endpoint p50/p95/max and error rate.

### When it runs

**On staging, before any production promotion that touches the student write path** —
`/api/attempts`, `/api/lesson-progress`, `/api/dashboard`, the user store, session/auth,
or the storage provider. It is **not** part of `vercel:production` and **not** part of
`certify:production`: it writes real attempts and lesson progress, so it must never be
aimed at a production domain. Run it against the preview/staging deployment from step 4,
before the step 5 promotion.

```bash
# Against the staging/preview deployment (never a production domain):
DASHBOARD_SMOKE_USE_DEMO_LOGIN=1 \
  npm run smoke:classroom-load -- \
  --base-url "https://<preview-deployment>.vercel.app" \
  --students 15 --rounds 3 --json
```

There is **no default `--base-url`** and production hosts are refused outright — this smoke
writes, so it must be aimed on purpose. `CLASSROOM_LOAD_ALLOW_PRODUCTION=1` overrides the
refusal and needs the same owner approval as any other gate override.

For a protected preview, export `VERCEL_AUTOMATION_BYPASS_SECRET` (or
`CLASSROOM_LOAD_VERCEL_PROTECTION_BYPASS_SECRET`) so the smoke can reach the deployment.
Local verification against `npm run dev:isolated` uses the same command with
`--base-url http://127.0.0.1:<port>`.

**Login rate limit.** `/api/auth/login` allows 12 logins **per username per 15 minutes**
(`authRateLimitRules.loginIdentifier`). The smoke logs in once per *distinct identity* and
shares that session across the seats assigned to it, so a 15-seat run costs 2 logins rather
than 15 — but back-to-back reruns still accumulate. If a run aborts with the rate-limit
error, either wait out the window or set `HK_MATH_E2E_LOGIN_IDENTIFIER_MAX` on the target
deployment (it can only raise the limit, never lower it).

### What a failure blocks

A non-zero exit **blocks the production promotion** (step 5). The smoke fails when either:

- **any request errors** — a fast 500 or a 401 is a failure regardless of latency; or
- **write p95 exceeds the budget** — default **2,000 ms** for `/api/attempts` and
  `/api/lesson-progress` (`CLASSROOM_LOAD_WRITE_P95_MS`). The dashboard read carries a
  separate 3,000 ms budget (`CLASSROOM_LOAD_READ_P95_MS`).

Treat a write-p95 breach as a **capacity regression, not a flaky smoke**: it means the
class-sized write path is queueing, which on production shows up as students losing
answers at the start of a period. Re-running until it passes is not a remediation. Raising
`CLASSROOM_LOAD_WRITE_P95_MS` to get a green run requires the same owner sign-off as any
other gate override, recorded in the release report.

### Reading the report

`distinctIdentities` and `login.count` in the JSON report are deliberate and worth reading.
The internal fast-login roster (`lib/server/internalCaliforniaFastLogin.ts`) ships a fixed
set of demo students — two for `US_CA_MATH` — so a 15-seat run drives 15 **concurrent
request streams** across those two identities (2 logins, 2 user rows). That loads request
concurrency and same-row write contention; it does **not** fan out across 15 distinct user
rows, so it will not surface a per-row or per-account scaling problem. Pass
`--username`/`--password` to point the whole class at one specific account, or read
`distinctIdentities` to know which shape you measured. Full results land in
`.tmp/classroom-load-smoke/last-run.json`.

---

## Preview deploys (no production domains)

```bash
npm run vercel:preview -- --run-id "$(date +%Y%m%d)-<scope>"    # or --dry-run
```
Same staging discipline, deploys to a preview URL only. Use for stakeholder review before a
production promotion.

---

## Command reference

| Command | What it does |
|---|---|
| `npm run release:dirty-map -- --reason "…"` | A25 dirty-tree map; **gate** — must be current before release. |
| `npm run release:preflight` / `:env-preflight` / `:runtime-preflight` | Env + runtime release guards (A19/A22). |
| `npm run release:build-gate` | Isolated `next build` + required-output verification. |
| `npm run vercel:stage` | Staging guard + build the pruned staging package (no deploy). |
| `npm run vercel:preview [-- --dry-run]` | Deploy the pruned slice to a preview URL. |
| `npm run vercel:production [-- --dry-run]` | Full production path: preflight → build gate → staging → deploy → smokes. |
| `npm run smoke:classroom-load -- --base-url <staging>` | Classroom-concurrency load smoke; **gate** — run on staging before promoting a student-write-path change. Never aim at production. |
| `npm run check` | Full local sweep: type-check, zh-hans strict, analytics, rag, question-bank, mvp, build. |
| `npm run clean:generated` | Dry-run generated-artifact cleanup (never `git clean -fdx`). |

---

## Do-not list

- ❌ `vercel deploy .` from the root, or any deploy from an unpruned tree.
- ❌ `git add .` / `git add -A` when slicing (parallel sessions are writing).
- ❌ Hand-editing the staging tree to remove forbidden paths — fix the exclusion instead.
- ❌ Committing `.env*`, `All API Keys.docx`, `coordination/` logs, or `*.test.ts` into a
  production slice.
- ❌ `git clean -fdx` for release hygiene — use `npm run clean:generated` (dry-run first).
