# A10 follow-up — Promotion Shadow full-history checkout

## Session custody

- Owner / lane: `A10` tooling, docs, and CI coordination.
- Branch: `codex/a10-promotion-shadow-fetch-depth-20260825`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a10-promotion-shadow-fetch-depth-20260825`.
- Exact baseline: `d29f3f32012113535fdfa54d05fdb14a6cfe39f8` (`fix(ci): archive receipt verification envelopes`).
- Parent A10 branch/worktree remained read-only and clean during this follow-up.
- Target PR: `pending` (A23 clean composition PR).
- Creation date: `2026-08-25` Asia/Hong_Kong.
- Expected closeout date: `2026-08-25` Asia/Hong_Kong.
- Declared write scope:
  - `.github/workflows/promotion-shadow.yml`
  - `coordination/session-logs/2026-08-25-A10-promotion-shadow-fetch-depth-follow-up.md`

## Problem and evidence boundary

The Promotion Gate validates commit-bound evidence: candidate source SHA, target baseline SHA, ancestry, and the blobs associated with those commits. On a Pull Request, GitHub supplies a synthetic merge checkout. The default shallow `actions/checkout@v4` history may omit the bound source/baseline ancestors or objects, causing otherwise valid ancestry/blob proof to fail closed as `blocked`.

This follow-up does not override the PR checkout ref. It retains the GitHub-selected synthetic merge and fetches full history so the gate can resolve commit-bound proofs. It also leaves checkout credential persistence at the action's existing default; no `persist-credentials` field is introduced.

Exact workflow change:

```yaml
- name: Check out repository
  uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

No workflow trigger, permission, environment variable, job name, Node version, npm command, assertion, artifact, deployment behavior, or live behavior changed.

## RED evidence

Before the edit, the pinned `yaml@2.9.0` parser resolved the checkout step but the focused assertion failed with:

`Error: checkout fetch-depth must be numeric 0`

The same assertion separately forbids a checkout `ref` override and a `persist-credentials` override.

## Verification plan and claim boundary

- Parse the edited workflow with pinned `yaml@2.9.0`.
- Require exactly one `actions/checkout@v4` step with numeric `with.fetch-depth === 0`.
- Require checkout to have no `ref` and no `persist-credentials` key.
- Preserve workflow name, all three triggers, main-only push, job name, 14 total steps, and 11 shell `run` blocks.
- Parse every shell block with `bash -n`.
- Run the focused Promotion Shadow governance tests and the full release-governance suite.
- Run type-check and the release package gate.
- Confirm the baseline-to-HEAD delta contains exactly the workflow and this log.

Passing local YAML, shell, governance, type, and package checks will prove only the branch-level configuration contract. It will not prove GitHub's synthetic merge checkout, a real `promotion-shadow-gate` run, required-check enforcement, branch protection, deployment, or live behavior. Those require the later composition PR and GitHub run evidence.

## GREEN evidence

- Exact parsed-workflow assertion: `pass`.
  - Workflow name remained `promotion-shadow-gate`.
  - Triggers remained `pull_request`, `push`, and `workflow_dispatch`; the push branch remained exactly `main`.
  - Job name, 14-step count, and 11 shell `run` blocks remained unchanged.
  - Exactly one `actions/checkout@v4` step was present.
  - Checkout `with.fetch-depth` parsed as numeric `0`.
  - Checkout contained neither a `ref` key nor a `persist-credentials` key.
  - All 11 shell blocks passed `bash -n` syntax validation.
- Focused governance test: `node --test --test-concurrency=1 --test-name-pattern='Promotion Shadow' scripts/release-governance.test.mjs` passed `4/4`.
- Full governance test: `node --test --test-concurrency=1 --test-reporter=dot scripts/release-governance.test.mjs` exited `0` with `88/88` tests passing.
- Type check: `npm run type-check` exited `0`.
- Release package gate: `node scripts/release-package-gate.mjs --json` returned `valid: true`, with 8 release packages, 37 owner packages, and 25 resolutions. The changed workflow resolved exactly to A10 (`rawMatchCount: 1`, `topCandidateCount: 1`).

These are local branch checks against the edited source. No GitHub Actions run, PR synthetic-merge execution, or branch-protection inspection was performed in this session.

## No-live/deploy boundary

- No Promotion Gate execution, candidate mutation, Manifest/Receipt edit, Preview, provider call, database operation, Vercel command, deployment, branch-protection mutation, production write, or live readback occurred.
- The authorized branch push is source-control lifecycle transport only; it is not product release or live evidence.

## Closeout checklist

- [x] Exact baseline and initial clean worktree recorded.
- [x] Original A10 worktree preserved read-only.
- [x] RED assertion reproduced the missing full-history configuration.
- [x] Exact checkout delta preserves PR ref and credential semantics.
- [x] GREEN YAML, shell, focused/full governance, type-check, and package-gate checks passed locally.
- [ ] Record GREEN tests, exact commit, upstream, and final clean status in the parent handoff.
