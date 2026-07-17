# Mainland PEP Primary Generated Bank V2 QA Report

- Date: 2026-06-02
- Session ID: S18
- Candidate package status: ready-for-curated-promotion
- App promotion status: S18 content QA block cleared; not yet integrated into app. S04/S11 integration and regression checks still required.
- Scope: offline LLM+RAG v2 candidate package only. No Practice Arena, production question data, UI, or API integration.

## Automated And S18 Gates

- Completeness: 1200/1200
- Duplicate IDs: none
- Inventory/quota issues: 0
- Schema rows without blocker issues: 1200/1200
- Deterministic approved rows: 173
- S18 final accepted solver-gap rows: 1027
- Pending S18 review rows: 0
- Rewrite/blocker rows after final review: 0
- Manual blind review sample accepted: 180/180
- Full final review rows: 1200/1200

## Final Status Counts

{
  "deterministicPass": 173,
  "acceptedS18ManualSample": 180,
  "acceptedS18CleanRowAdjudication": 847,
  "needsRepair": 0,
  "pendingS18Review": 0
}

## Manual Review

- `manual-review-results.csv` now records 180/180 accepted S18 sample rows.
- `s18-final-review-results.csv` records all 1200 row-level final decisions.
- `s18-final-review-report.md` records the final review method and release interpretation.

## Release Rule Result

- Allowed package decisions are `candidate-complete`, `needs-rewrite`, or `ready-for-curated-promotion`.
- This package is now `ready-for-curated-promotion` because all previous pending rows have either deterministic pass evidence or S18 final review acceptance.
- This is not a direct app integration. Product connection requires a separate S04/S11 task and checks.
