# Mainland PEP Primary Generated Bank V2 QA Report

- Date: 2026-05-23
- Session ID: S18
- Candidate package status: candidate-complete
- App promotion status: not app-promotable; pending S18 rows require manual pass or future deterministic proof.
- Scope: offline LLM+RAG v2 candidate package only. No Practice Arena, production question data, UI, or API integration.

## Automated Gates

- Completeness: 1200/1200
- Duplicate IDs: none
- Inventory/quota issues: 0
- Schema rows without blocker issues: 1200/1200
- Deterministic approved rows: 173
- Pending S18 review rows: 1027
- Rewrite/blocker rows: 0
- Manual blind review queue: 180/180

## Status Counts

{
  "solver-gap": 1027,
  "pass": 173
}

## Manual Review

- `manual-review-queue.csv` contains 30 sampled rows per grade, balanced across semester/type/difficulty where available and risk-weighted toward solver gaps/blockers/high-difficulty rows.
- `manual-review-results.csv` is a pending review template for those 180 sampled rows.

## Release Rule

- Allowed package decisions are `candidate-complete`, `needs-rewrite`, or `ready-for-curated-promotion`.
- This run cannot be marked full app-promotable unless all pending rows are manually passed or independently solved in a rerun.
