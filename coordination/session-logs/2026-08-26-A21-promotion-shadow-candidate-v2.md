# 2026-08-26 A21 Promotion Shadow Candidate v2

- Owner: A21 Content pipeline and RAG operations lead
- Branch: `codex/a21-promotion-shadow-candidate-v2-20260826`
- Worktree: `.worktrees/a21-promotion-shadow-candidate-v2-20260826`
- Target PR: compose into draft PR #162 (`https://github.com/HUDongpin/MAIS-MVP/pull/162`)
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `codex/a23-promotion-shadow-attempt-002-20260826@d7ce01d940`
  (`origin/main@7f7c4859877c9808fb4bdf98287bb5645b6e751b` plus reviewed
  Promotion Gate and runtime de-reach slices)
- Declared slice: create a new immutable Grade 6 ratios candidate package with
  versioned paths and record IDs for Promotion Gate v2 attempt-002.
- Hard boundary: no edit to the parent candidate, no edit to attempt-001, no
  live registry import, no Preview/deploy/provider/database/credential action,
  and `liveAllowed` remains false.

## Candidate source decision

- The v2 package is a new three-record vertical slice, not an in-place rewrite
  of `us-ca-math-rag-v2-candidate`.
- It retains the original mathematical context and explicit provenance while
  correcting the lesson grammar, making the `20 ÷ 5 = 4` then `3 × 4 = 12`
  reasoning explicit, replacing internal misconception labels with student-safe
  feedback, and adding checkable guided/independent-practice expectations.
- The package remains English-only and candidate-only. Missing `zh` and
  `zhHans` localization is declared as a future live blocker; no adapter may
  invent those fields.

## Handoff / closeout

- All four JSON documents parse successfully and the package-to-record IDs,
  package bindings, standards, answer forms, numeric oracle, explicit reasoning,
  lesson/practice link, misconception remediation, and negative live
  authorization were checked as one closed source set.
- Pre-commit raw SHA-256 values:
  - `candidate-package.v2.json`: `9528889b7fe9a052f136014daba95816d215db445a5575ee0f3ead5f0a009d4e`
  - `safe-card.v2.json`: `68668bb8e1f962cc3e1b6923c8121ca113951daba9f764bedf42a89ef5dde756`
  - `practice-item.v2.json`: `a843d883aa2f55c8f11f60e6941b81aa572ebe1bede85467d9d0f791047e4b86`
  - `lesson.v2.json`: `e23e6d67378ec9b3e3016616fb7dffda8d78aa6a8bbaa4b523d3dcbcece39913`
- The A23 v2 manifest will compute and freeze the aggregate semantic candidate
  digest from the three record identities after this source commit exists.
