# S22/S19 Release Hygiene Handoff - Dirty Worktree Direct Deploy Block

## Session

- Date: 2026-06-07 HKT
- Primary session: S22
- Related owner: S19 for Vercel/API environment parity before publish
- Objective: record why the current main worktree must not be deployed directly, identify the S22/S19 gates needed before any publish, and preserve dry-run evidence without mutating Git or deployment state.

## Executive Decision

Do not run a direct Vercel deploy from `/Users/dongpinhu/Desktop/MAIS-MVP`.

The workspace is a mixed backlog from many sessions. A root deploy from this dirty tree risks uploading unrelated feature work, generated content, local audit outputs, candidate assets, release scripts that are not yet a reviewed baseline, and environment-dependent behavior that S19 has not finished approving for production.

Use only a clean reviewed release worktree/branch or the S22 pruned staging path after the gates below pass.

## Current Evidence

Observed at 2026-06-07 00:38 HKT:

- `git status --porcelain=v1 | wc -l`: 3320 status entries.
- Status code summary: 243 tracked modified, 4 tracked deleted, 3073 untracked status lines.
- `git diff --name-only | wc -l`: 247 tracked changed/deleted paths.
- `git ls-files --others --exclude-standard | wc -l`: 33261 untracked files.
- `git diff --shortstat`: 247 files changed, 31979 insertions, 10908 deletions.

Largest tracked dirty buckets by top-level path:

- `app`: 59
- `lib`: 46
- `components`: 41
- `coordination`: 39
- `tests`: 30
- `data`: 18

Largest untracked buckets by top-level path:

- `coordination`: 17267
- `public`: 14452
- `.next-s13-build-debug`: 796
- `app`: 103
- `.s11-parent-audit-next4`: 97
- `lib`: 35
- `data`: 30
- `components`: 25
- `.next-register-slider`: 20
- `tests`: 17
- `scripts`: 13

Large local-only/untracked roots confirmed by `du -sh`:

- `MAIS-MVP-california-practice-beta-clean`: 5.1G
- `.next-s13-build-debug`: 14M
- `.s11-parent-audit-next4`: 472K
- `.s11-parent-audit-next3`: 140K
- `.next-register-slider`: 80K

## Dry-Run Guard Evidence

No deploy was performed.

- `npm run release:preflight -- --json`: passed.
  - Free disk: 35796496384 bytes, above 20GB minimum.
  - E2E root: `.tmp/e2e-run-release-preflight`
  - Next dist: `.tmp/e2e-run-release-preflight/next-dist`
  - Staging root: `.tmp/vercel-staging`
- `npm run vercel:stage -- --dry-run --run-id s22-s19-20260607-handoff --json`: passed.
  - Dry-run staging dir: `.tmp/vercel-staging/s22-s19-20260607-handoff`
  - File count: 2134
  - Total size: 481812690 bytes
  - Forbidden path count: 0
  - Exclusion policy active for `data/ease`, `public/question-illustrations`, and local secrets/generated outputs.

Interpretation: the S22 staging guard currently provides a safer path than a root deploy, but the guard files themselves are still part of the dirty workspace and need review/commit slicing before they are treated as an approved release baseline.

## Direct Root Deploy Guard Added

S22 added an explicit direct/root deploy preflight mode to `scripts/release-env-guard.mjs` and exposed it through `npm run release:root-deploy-preflight`.

Behavior:

- `npm run release:root-deploy-preflight` fails when the root worktree has tracked or untracked changes.
- The existing `npm run release:preflight`, `npm run test:e2e`, and `npm run vercel:stage` paths are not blocked merely because the main worktree is dirty; S22 still needs those for pruned staging and isolated QA.
- An emergency override exists through `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1`, but the command output makes the dirty override explicit and should be used only with owner approval.

Checks after adding the guard:

- `node --check scripts/release-env-guard.mjs`: passed.
- `npm run release:preflight -- --json`: passed.
- `npm run release:root-deploy-preflight`: failed as expected in the current dirty tree.
  - Status entries: 3323
  - Tracked modified: 243
  - Tracked deleted: 4
  - Untracked status entries: 3076
  - Untracked files: 33264
- `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 npm run release:root-deploy-preflight -- --json`: passed only with explicit dirty override.
- `npm run vercel:stage -- --dry-run --run-id s22-root-deploy-guard-20260607 --json`: passed.
  - File count: 2134
  - Total size: 481812777 bytes
  - Forbidden path count: 0

## S19 Environment Guard Added

S22/S19 also added an executable, non-secret Vercel environment readiness check:

```bash
npm run release:env-preflight
```

This mode runs `vercel env ls --scope peter-dongpin-hu-s-projects --format json`, inspects only variable names and target environments, and does not pull or print values.

Current result:

- `node --check scripts/release-env-guard.mjs`: passed.
- `npm run release:env-preflight`: failed as expected because Vercel Production is missing:
  - `RESEND_API_KEY`
  - `PASSWORD_RESET_FROM`
  - `PASSWORD_RESET_BASE_URL`
  - `HK_MATH_EXPOSE_LOCAL_RESET_LINKS`
- `npm run vercel:stage -- --dry-run --run-id s19-env-guard-20260607 --json`: passed with 2134 files, 481812848 bytes, 0 forbidden paths.

Detailed env audit: `coordination/reports/2026-06-07-S22-S19-vercel-env-preflight-audit.md`.

## Combined Publish Preflight Added

S22 added a combined non-deploy production publish gate:

```bash
npm run release:publish-preflight
```

It checks:

- release disk and generated-output safety;
- Playwright release isolation;
- Vercel staging root safety;
- dirty root deploy readiness;
- S19 Vercel Production env readiness.

Current result:

- `npm run release:publish-preflight`: failed as expected and reported both release blockers:
  - dirty root deploy blocked with 3324 status entries and 33265 untracked files;
  - Vercel Production missing `RESEND_API_KEY`, `PASSWORD_RESET_FROM`, `PASSWORD_RESET_BASE_URL`, and `HK_MATH_EXPOSE_LOCAL_RESET_LINKS`.
- `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 npm run release:publish-preflight`: still failed on the S19 Vercel env blocker.
- `npm run vercel:stage -- --dry-run --run-id publish-preflight-20260607 --json`: passed with 2134 files, 481812926 bytes, 0 forbidden paths.

## Controlled Production Wrapper Added

S22 added a guarded production deployment wrapper:

```bash
npm run vercel:production
```

The wrapper runs `node scripts/release-env-guard.mjs publish` before preparing staging or calling Vercel. It therefore cannot deploy from the current dirty/S19-incomplete state.

Current result:

- `node --check scripts/deploy-vercel-production.mjs`: passed.
- `npm run vercel:production -- --dry-run --run-id prod-wrapper-clean-output-20260607 --json`: failed at publish preflight before production staging/deploy, reporting both blockers:
  - dirty root deploy blocked with 3325 status entries and 33266 untracked files;
  - Vercel Production missing `RESEND_API_KEY`, `PASSWORD_RESET_FROM`, `PASSWORD_RESET_BASE_URL`, and `HK_MATH_EXPOSE_LOCAL_RESET_LINKS`.
- `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 npm run vercel:production -- --dry-run --run-id prod-wrapper-clean-output-override-20260607 --json`: still failed at the S19 Vercel env blocker.
- `npm run vercel:stage -- --dry-run --run-id production-wrapper-control-20260607 --json`: passed with 2134 files, 481812872 bytes, 0 forbidden paths.

No Production deploy was attempted or created.

## Release Hygiene Gates Before Publish

S22 gates:

- Keep a deployment freeze on direct root deploys from `/Users/dongpinhu/Desktop/MAIS-MVP`.
- Run `npm run release:publish-preflight`; it must pass before production publish.
- Use `npm run vercel:production` for any owner-approved production deploy from this tooling; it runs the publish preflight before staging/deploy.
- Run `npm run release:root-deploy-preflight` before any owner-approved direct root deploy attempt; in the current dirty tree it must fail and redirect the release through a clean worktree or pruned staging path.
- Review and approve the release-hygiene slice before relying on it as baseline:
  - `.vercelignore`
  - `package.json`
  - `package-lock.json` if script metadata requires it
  - `playwright.config.ts`
  - `next.config.ts`
  - `scripts/release-env-guard.mjs`
  - `scripts/prepare-vercel-staging.mjs`
  - `scripts/deploy-vercel-preview.mjs`
  - `scripts/cleanup-generated-artifacts.mjs` if cleanup policy is accepted
- Re-run:
  - `npm run release:preflight -- --json`
  - `npm run vercel:stage -- --dry-run --run-id <release-id> --json`
  - `npm run type-check`
  - `npm run build`
  - release-specific Playwright or smoke tests selected by S11/S22
- Confirm the deploy input excludes:
  - `.env*`, `All API Keys.docx`, `.vercel/`
  - `.next*`, `.s11*`, `.tmp/`, Playwright reports
  - broad `coordination/`
  - broad `tests/`
  - raw/private corpora
  - inactive `public/question-illustrations/` unless a specific asset policy is approved
  - the nested clean worktree `MAIS-MVP-california-practice-beta-clean`
- Deploy only from a reviewed clean worktree/branch or the S22 pruned staging directory.
- After deploy, verify Vercel deployment id, target, aliases, and a live HTTP smoke.

S19 gates:

- Complete redacted production/preview environment parity checks before publish.
- Run `npm run release:env-preflight`; it must pass before production publish.
- From the 2026-06-07 S19 log, password-reset Resend production delivery is not complete yet:
  - `RESEND_API_KEY` still needs a fresh/rotated value through a secure path.
  - `PASSWORD_RESET_FROM`, `PASSWORD_RESET_BASE_URL`, and `HK_MATH_EXPOSE_LOCAL_RESET_LINKS=false` need final Vercel environment confirmation.
- Do not print, log, stage, or screenshot any secret values.
- Coordinate any provider behavior changes with S07/S12/S15 as applicable.

S25/S10 coordination gates:

- No blanket `git add .`.
- Preserve owner/session changes.
- Split the dirty tree into reviewable owner-mapped release slices.
- Treat content QA, generated-content, and public illustration assets as separate S18/S21/S24/S23 intake decisions.

## Stop Conditions

Stop before publish if any of the following remain true:

- The deploy command would read from the dirty project root.
- A production deploy path bypasses `npm run release:publish-preflight` or `npm run vercel:production`.
- The deploy input includes unreviewed generated content, public illustration bulk assets, raw/private corpora, local runtime outputs, or nested worktrees.
- `npm run release:publish-preflight` fails.
- S19 has not confirmed production/preview env parity for the release target.
- `npm run release:env-preflight` fails.
- The selected release slice has not passed build/type-check and the agreed S11/S22 smoke coverage.
- The release requires broad feature/API behavior changes outside S22/S19 ownership.

## Handoff

Current state is safe for continued S22/S19 hygiene work, not for direct production publish. The recommended next action is to use the existing clean California release worktree/branch if that is still the intended production snapshot, or create a fresh clean release branch from explicitly approved slices and run the gates above.
