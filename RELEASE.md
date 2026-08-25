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

## TL;DR — one local plan and one production entrypoint

```bash
# 1. Offline source plan: clean-HEAD binding + pruned staging audit only; no build or network.
npm run vercel:production -- --dry-run --run-id "$(date +%Y%m%d)-<scope>"

# 2. Real deploy: use the protected "MAIS production release" GitHub Actions
# workflow twice, first in schema-preflight mode and then in deploy mode.
# Never run the non-dry production command from a workstation.
```

The real `vercel:production` wrapper (`scripts/deploy-vercel-production.mjs`) is accepted only
inside the serialized, protected-main GitHub Actions production workflow. It chains, in order:
env/runtime **preflight** → dashboard-smoke-auth precheck → **release build gate**
(`next build` in an isolated `NEXT_DIST_DIR`, verifying required route/page outputs) →
same-SHA GitHub check verification → production schema confirmation/apply → **pruned staging**
(forbidden-path audit) → immutable Vercel deployment → provider source-byte readback → explicit
promotion → post-deploy authenticated/read-only smoke gates on both live domains. The workflow's
non-cancelling concurrency group serializes schema inspection, schema mutation, deploy, promotion,
verification, and rollback. `--dry-run` is deliberately narrower: it creates and audits the
clean-HEAD-bound staging plan without running env preflight, either build gate, provider queries,
schema migration, deploy, promotion, or smoke tests. Its JSON reports those gates as
`not-run / offline-source-plan-only`; it is not a build or production go signal.

---

## Full workflow — reviewed clean slice → production

### 0. Preconditions
- You have an **owner instruction to deploy** (production is a live student-facing site; deploy is
  gated per the safety rules and per `AGENTS.md` — A22 must not publish from a dirty root without
  an explicit, recorded owner exception).
- Vercel env is configured (A19). `npm run release:env-preflight` and
  `release:runtime-preflight` should pass; redacted-name gate is A19-owned.

#### A19 production environment contract (redacted)

`release:env-preflight` inspects only environment-variable **names** and their Vercel target. It
requires every release variable to exist on the `production` target, but neither reads nor prints
secret values. A green name/target result is therefore necessary, not sufficient: A19 must also
record a value-free `configured and format-validated` / `blocked` attestation for the following
parent-console dependencies before A22 publishes:

| Variable | Redacted semantic expectation |
|---|---|
| `HK_MATH_POSTGRES_HOT_AUTH_TABLES` | Literal `true`, only after the exact production Postgres target has passed schema migration and readiness attestation. |
| `CRON_SECRET` | One trimmed 32-512 character server-only secret shared by `/api/warm`, the teacher-notice outbox worker, and webhook maintenance. The unused `TEACHER_REMINDER_CRON_SECRET` alias is not supported. |
| `TEACHER_NOTICE_HEALTH_SECRET` | Independent trimmed 32-512 character server-only bearer secret for the aggregate teacher-notice operational health endpoint; it must not equal `CRON_SECRET`. |
| `TEACHER_NOTICE_EMAIL_ENABLED` | Literal `true` only when sender, provider, webhook, monitoring, and rollback gates are ready; otherwise production notice delivery remains blocked. |
| `TEACHER_NOTICE_RESEND_API_KEY` | Dedicated teacher-notice Resend API key; never the shared password-reset key and never exposed to the browser. |
| `TEACHER_NOTICE_FROM` | Resend-verified sender identity in the strict sender format accepted by the adapter. |
| `TEACHER_NOTICE_BASE_URL` | Canonical public HTTPS origin only: no path, trailing slash, query, fragment, embedded credentials, or alternate host. |
| `TEACHER_NOTICE_ALLOWED_ORIGIN` | Exactly the same canonical HTTPS origin as `TEACHER_NOTICE_BASE_URL`. |
| `TEACHER_NOTICE_DELIVERY_TIMEOUT_MS` | Integer from 10 through 30000 milliseconds. |
| `RESEND_WEBHOOK_SECRET` | Server-only `whsec_` signing secret issued for the exact registered Resend webhook endpoint; distinct from both Resend API keys. |

The attestation may record the variable name, target, configured/missing state, validation status,
timestamp, candidate SHA, and deployment identifier. It must never record the value, a reversible
derivative, or CLI output that could contain the value. Environment placement, provider-side
webhook registration, sender verification, schema migration, and same-SHA live behavior remain
separate gates.

The GitHub copy of `TEACHER_NOTICE_HEALTH_SECRET` must exist only in the dedicated
`production-health` Environment, whose deployment-branch policy allows protected `main` only.
Do not create a repository-level duplicate. The scheduled monitor deliberately has no manual
approval wait, so branch/ref protection, exact workflow/SHA binding, a pinned action supply chain,
and the environment's branch policy are the credential-provenance boundary.

`MAIS_RELEASE_SHA` is not a long-lived project secret. The reviewed deployment wrappers derive it
from one clean Git `HEAD` and inject that exact lowercase SHA into the immutable deployment. The
teacher-notice scheduler heartbeat must match it; a missing or mismatched value keeps operational
health fail-closed. Do not hand-enter a different SHA or treat custom metadata alone as provenance.

The scheduler-heartbeat schema is v2. Its additive `last_failed_at` aggregate survives a later
`started` or `succeeded` singleton update, so a delayed monitor still reports
`scheduler-heartbeat-failed` for the defined 15-minute recent-failure window; recovery occurs only
after that window. The health DTO exposes only the failure age, never a run ID or release SHA.
Production schema preflight distinguishes exact `empty`, `v1`, `exact`, and rejected `partial`
states; the only heartbeat mutations are a fresh `heartbeat-install-v2` or exact
`heartbeat-v1-to-v2`, both followed by full catalog attestation.

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

### 4. Generate the offline source plan (staging audit only)
```bash
npm run vercel:production -- --dry-run --json --run-id "$(date +%Y%m%d)-<scope>"
```
Confirm in the JSON: `dryRunScope: "offline-source-plan-only"`,
`forbiddenPathCount: 0`, a sane `stagingFileCount`, and both build-evidence objects explicitly
marked `not-run`. If forbidden paths appear, fix the exclusion — **do not** hand-delete from the
staging tree. This command does not replace `npm run release:preflight`,
`npm run release:build-gate`, same-SHA GitHub CI, or the gates in the real deployment command.

### 5. Preflight and deploy through the protected workflow (explicit owner go required)

The candidate must already be the current commit of protected `main`, with all required checks
successful for that exact SHA. In GitHub Actions, manually run **MAIS production release** with:

1. `mode=schema-preflight` and the exact 40-character `candidate_sha`. The job performs a
   read-only production Postgres attestation and emits a redacted confirmation bound to the SHA,
   tree, production target fingerprint, schema plan, and preflight digest.
2. Review that safe JSON and obtain the explicit production-environment approval. Then run the
   same workflow with `mode=deploy`, the same `candidate_sha`, and the exact confirmation. Any
   repository, ref, SHA/tree, schema, database target, alias target, check run, or source-byte
   drift fails closed.

The command below is shown only to identify the wrapper invoked by the workflow; a local real run
is rejected by its GitHub Actions execution-context gate:

```bash
npm run vercel:production -- --run-id "$(date +%Y%m%d)-<scope>"
```

The workflow promotes only after the candidate deployment, provider readback, schema
reattestation, GitHub checks, and pre-promotion read-only smoke pass. After all slow gates finish,
it rereads both production aliases at the command boundary and requires them to remain bound to
the originally captured deployment before invoking `vercel promote`. It then rechecks both aliases
and both production domains; a failed post-promotion gate restores the previous alias deployment.
Retain the GitHub run ID, candidate/tree SHA, Vercel deployment ID, safe schema evidence, staging
counts, provider readback result, smoke results, and rollback result as the release record. Never
copy credentials, decrypted environment values, or raw provider errors into that record.
The wrapper persists this safe record before reporting success, and a write failure is inside the
post-promotion rollback boundary. The workflow then uploads only
`.tmp/vercel-production-evidence/run-*.json` as a pinned, 90-day private-repository artifact. An
artifact-service failure occurs after the already verified promotion and does not itself reverse a
healthy live candidate; treat that distinct red step as an evidence-retention incident and preserve
the still-running job logs before rerunning any deployment.

The staging package's owner-read-only mode plus pre/post byte, mode, inode, and Git verification is
a best-effort operational TOCTOU barrier, not a cryptographic sandbox. A hostile process running
under the same Unix UID could change permissions or replace files and is outside this seal's threat
model. Production integrity therefore also depends on the isolated GitHub-hosted runner, the
single-writer workflow, immutable candidate/tree binding, and exhaustive provider source-byte
readback before promotion. Vercel does not expose a compare-and-swap primitive for alias
promotion, so the final alias reread narrows but cannot eliminate the command-boundary race. A
concurrent dashboard or CLI promotion outside this workflow is therefore outside the workflow
concurrency lock and is prohibited during a release window.

### 6. Rollback
Rollback is a Vercel **promotion swap back to the previous production deployment** (the prior
alias target) — no code revert needed. For a slice-level undo, drop the slice commit(s) from the
release branch and re-run the dry run. Keep the pre-deploy staging manifest so rollback is exactly
"remove these files / re-point the alias." The teacher-notice schema migration is additive and is
not rolled back by an alias swap; the prior deployment must be proven compatible with the additive
tables/indexes before production apply, and any future destructive migration requires a separate
database rollback plan and approval.

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
| `npm run vercel:production -- --dry-run` | Offline clean-HEAD source/staging plan only; no build, provider query, migration, deploy, promotion, or smoke. |
| `npm run vercel:production` | Workflow-only full production path: preflight → build gates → exact-SHA/provider/schema gates → staging deploy → promotion → smokes; local real runs fail closed. |
| `npm run check` | Full local sweep: type-check, zh-hans strict, analytics, rag, question-bank, mvp, build. |
| `npm run clean:generated` | Dry-run generated-artifact cleanup (never `git clean -fdx`). |

---

## Do-not list

- ❌ `vercel deploy .` from the root, or any deploy from an unpruned tree.
- ❌ Running the real `npm run vercel:production` path from a workstation or a different workflow.
- ❌ `git add .` / `git add -A` when slicing (parallel sessions are writing).
- ❌ Hand-editing the staging tree to remove forbidden paths — fix the exclusion instead.
- ❌ Committing `.env*`, `All API Keys.docx`, `coordination/` logs, or `*.test.ts` into a
  production slice.
- ❌ `git clean -fdx` for release hygiene — use `npm run clean:generated` (dry-run first).
