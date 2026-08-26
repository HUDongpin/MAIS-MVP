# 2026-08-26 A11 Promotion Shadow Preflight v2

- Owner: A11 QA and release quality lead
- Branch: `codex/a11-promotion-shadow-preflight-v2-20260826`
- Worktree: `.worktrees/a11-promotion-shadow-preflight-v2-20260826`
- Target PR: draft PR #162
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: A23 composition commit `a743a49489` on top of target runtime baseline `d7ce01d9406d717451b7c43b6d7c48d70fd99ec1`
- Declared slice: independent Shadow preflight assertions, legacy de-reach regression ratchet, and machine evidence only.
- Hard boundary: no feature implementation, deployment, provider, database, production write, or live authorization.

## Result

- `npm run type-check`: pass.
- Targeted California lesson plus teacher assessment persistence tests: 65/65 pass after replacing five stale assertions that required unapproved candidate packages to remain live.
- Promotion Gate v2 pure/security tests: 18 pass, 0 fail, 1 expected skip until immutable Manifest freeze.
- Post-run independent replay remains mandatory and must reproduce the same `semanticReceiptDigest` at the exact execution commit.
