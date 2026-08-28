# A22 production Vercel CLI bootstrap

- Lane: `A22` production reliability and release engineering
- Owner authorization: continue the parent-console production certification plan, including the protected production schema/deploy workflow
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a22-production-certification-final-20260826`
- Branch: `codex/a22-production-certification-final-20260826`
- Baseline: protected `origin/main` at `38a700190b0fc7a89a0c444fa23395874d26d831`
- Target PR: pending
- Session creation date: 2026-08-26
- Expected closeout date: 2026-08-27

## Failure boundary

Protected production run `32986423452` reached the deploy job but failed inside the staged-publish environment preflight. The guarded wrapper stopped before the production schema apply, Vercel deployment, alias promotion, or release-artifact upload.

The run identified its hosted image as `ubuntu-24.04`. GitHub's official runner-image notes record that Vercel CLI was removed from Ubuntu 24.04, while the repository intentionally does not vendor `vercel` in `package.json` or `package-lock.json`. The release guard and deploy wrapper both invoke the `vercel` executable, so relying on an image-provided CLI is no longer valid.

Reference: <https://github.com/actions/runner-images/issues/9848>

## Slice

- Add a deploy-only workflow step that installs exact Vercel CLI `54.9.0` with npm lifecycle scripts disabled.
- Assert the installed CLI reports the exact pinned version before loading the masked schema confirmation.
- Keep the schema-preflight job independent of Vercel CLI and keep the CLI absent from application dependencies.
- Preserve the protected-main SHA/tree binding, schema confirmation masking, writer lock, 8 GB workflow disk floor, and existing child-environment allowlists.

## Verification

- Red test: `node --test scripts/production-deploy-workflow.test.mjs` failed only because `Install pinned Vercel CLI` was absent.
- Green tests: `node --test scripts/production-deploy-workflow.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-env-guard.test.mjs` — 25 passed, 0 failed.
- npm registry metadata confirmed exact package `vercel@54.9.0`; no package or lockfile change was made.

## Handoff

Run type-check and release-governance gates, commit only the workflow, focused test, and this log, push the session branch, open a focused PR, and re-run the full protected-main gates after merge. Do not reuse the old schema confirmation after the candidate SHA changes; generate a fresh read-only production preflight for the merged SHA.
