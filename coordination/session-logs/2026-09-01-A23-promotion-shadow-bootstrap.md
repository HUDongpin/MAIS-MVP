# A23 Promotion Shadow bootstrap session

## Assignment and authority

- Lane: A23 integration/promotion, coordinated with A10 workflow governance.
- Baseline branch: `a23/semantic-rescope-on-pr220-composition-20260831`.
- Registered execution commit: `3ccdb882d705516bfdf18cd8925c3b75a6550b8e`.
- Evidence parent: `6a9a5000c40ada2c159f6569d4342f38d7174398`.
- Authorized action: repair the automatic `promotion-shadow-gate` bootstrap ordering on the isolated semantic-rescope branch, then obtain independent A11/A22/A25 review before any ordinary non-force push or PR #220 fast-forward.
- Explicit exclusions: no `workflow_dispatch`, manual Shadow, branch-protection mutation, main merge, deploy, provider write, or live write.

## Reviewable slice

- `.github/workflows/promotion-shadow.yml`
- `scripts/promotion-shadow-workflow-v2.test.mjs`
- `scripts/release-governance.test.mjs`
- `docs/superpowers/plans/2026-09-01-promotion-shadow-bootstrap.md`
- this session log

The frozen semantic authority module and CLI were not modified. Their required raw SHA-256 values remain:

```text
0b73e3c50b9065f1323e5953626901b00c9c928e0678e1d5eec22b8ce29d8c2c  scripts/promotion-required-check-semantic-rescope.mjs
9f3c56f59f29858485bf85751b857ce26188439648c2a6a8ef9fde91c3c23e8b  scripts/promotion-required-check-semantic-rescope-cli.mjs
```

## Implementation result

The existing inline resolver now permits a bootstrap run while the active canonical Receipt is absent, without creating placeholder Receipt bytes. It derives the registered execution from the exact Manifest and reaffirmation history, uses one bounded NUL-safe Git history read, binds current bytes to Git blob identities, and fails closed on history or path ambiguity.

When a canonical Receipt is present, its single add commit must be a strict descendant of the registered execution binding. A real merge-DAG regression proves that a Receipt created on an evidence sibling branch and later merged beside the binding is rejected. Manifest, descriptor, and Receipt inputs are bounded to 32 MiB before and after reads; `GITHUB_WORKSPACE` must resolve to the exact checkout; the canonical copy remains exclusive-create, regular, single-link, and mode `0600`.

## TDD and independent review evidence

- Pre-change ASCII baseline at `3ccdb882...`: repository Promotion suite `76/76` passed.
- Initial bootstrap RED: the old resolver rejected the absent Receipt before execution resolution.
- Ordering RED: the old resolver incorrectly accepted the sibling-branch Receipt merge fixture.
- Current workflow resolver suite: `9 passed, 0 failed`.
- Current release-governance suite: `85 passed, 0 failed, 11 pre-existing skipped`.
- Installed Promotion workflow parser: PASS.
- `git diff --check`: PASS.
- First independent specification review: REQUEST CHANGES for missing strict Receipt descendant proof.
- First independent code-quality review: REQUEST CHANGES for input bounds, exact-workspace binding, and missing adversarial fixtures.
- Second independent specification review after repair: PASS.
- Second independent code-quality review after repair: PASS.

## Current lifecycle boundary

The active canonical Receipt is still absent. No Shadow, workflow dispatch, push, PR update, merge, deploy, or live operation was performed during local implementation and review. The next permitted step is to form an exact repair commit, run the complete Promotion suite from an ASCII-path clone of that commit, and obtain independent A11/A22/A25 exact-HEAD reviews. Only after those gates pass may the authorized ordinary non-force push and PR #220 fast-forward occur.
