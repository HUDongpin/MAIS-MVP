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

## Preview deploys (no production domains)

```bash
npm run vercel:preview -- --run-id "$(date +%Y%m%d)-<scope>"    # or --dry-run
```
Same staging discipline, deploys to a preview URL only. Use for stakeholder review before a
production promotion.

---

## Auth-facing environment (Phase 0 hardening)

These four control who can authenticate. All are opt-in; leaving them unset is the safe posture.

| Variable | Effect when unset | Set it when |
|---|---|---|
| `TEACHER_INVITE_CODES` | **Teacher self-registration is refused outright** (403). Student and parent signup are unaffected. | A school should be able to self-serve teacher accounts. Comma- or newline-separated; rotate by editing the list — no deploy-time state to migrate. |
| `HK_MATH_ENABLE_DEMO_USER` | Seeded example accounts are provisioned in local development and **not** in a production build (`NODE_ENV=production` or `VERCEL_ENV=production`). | The deployment is an explicit demo. `"false"` disables them everywhere. |
| `HK_MATH_DEMO_PASSWORD` | Seeded accounts use the published `12345` when demo access is on, and an unguessable deployment-stable value when it is off. | You want demo accounts reachable but not with the published password. Authoritative when set. |
| `HK_MATH_ENABLE_INTERNAL_FAST_LOGIN` | The internal California fast-login path is inert — it neither authenticates its seed list nor grants the teacher console from a session subject. | You are reproducing something that needs those specific seeds. Off by default even locally. |

Two consequences worth planning for:

- **The deploy that ships session revocation signs everyone out once.** Session tokens are now
  bound to the account's password material, and tokens minted before that have nothing to bind to,
  so they are refused rather than grandfathered in. Every active session ends at cutover and users
  log in again. This is the point of the change: those are exactly the tokens a password reset
  could not previously revoke.
- **Seed rows an earlier demo-enabled deploy wrote keep their accounts but lose their password.**
  Switching `HK_MATH_ENABLE_DEMO_USER` off no longer just stops seeding; it rewrites the credential
  on any surviving seed row to the locked value, so flipping the flag actually closes the door
  instead of only appearing to. The rows stay so classes and submissions that reference them
  remain intact.

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
