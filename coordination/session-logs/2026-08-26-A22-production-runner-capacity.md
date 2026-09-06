# A22 production runner capacity and confirmation masking

- Lane: A22 production reliability and release engineering, with focused workflow contract coverage.
- Branch: `codex/a22-production-certification-main-20260826`.
- Baseline: protected `main` at `3d8cf590a74206da0bc2f8dc6704c06140df60ac`.
- Target PR: pending.
- Created: 2026-08-26.
- Expected closeout: 2026-08-26 after merge, exact-main CI, and production release retry.

## Failure evidence

- Production release run `32977348792` stopped in the staged-publish preflight before schema apply or Vercel deployment.
- The wrapper exited almost immediately after entering the preflight, before a provider inventory request could complete.
- The release guard retained a 20 GB local default, while GitHub documents 14 GB storage for the standard `ubuntu-latest` hosted runner: <https://docs.github.com/en/actions/reference/runners/github-hosted-runners>.
- The same preflight passed in a clean local worktree with the approved project identity and redacted provider credential path.

## Slice

- Pass an explicit 8 GB minimum only from the serialized protected-main production workflow into the release preflight child. The 20 GB default remains unchanged for local and other release paths.
- Load the schema confirmation from the workflow event file, register it with the Actions mask command, and export it through `GITHUB_ENV` before the deploy step. The confirmation is no longer mapped directly into the deploy step environment metadata.
- Keep the confirmation out of source, test output, session evidence, and committed artifacts.

## Verification

- RED: focused workflow/environment tests failed on missing runner-threshold passthrough and missing masked-confirmation step.
- GREEN: `node --test scripts/deploy-vercel-production.test.mjs scripts/production-deploy-workflow.test.mjs scripts/release-env-guard.test.mjs` — 25 passed, 0 failed.
- `npm run type-check` — passed.
- `npm run test:release-governance` — 91 passed, 11 explicit skips, 0 failed.
- `git diff --check` — passed.

## Handoff

Merge only this five-path A22 slice after PR CI is green. Re-run schema preflight for the new protected-main SHA, bind a fresh confirmation in memory, then retry the serialized production workflow. Do not reuse the prior SHA, build artifact, or confirmation.
