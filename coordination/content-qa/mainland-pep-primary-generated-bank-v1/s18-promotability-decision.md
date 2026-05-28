# S18 Mainland PEP Primary Candidate Promotability Decision

- Generated: 2026-05-23T01:52:31.163Z
- Scope: offline candidate-only QA; this is not production app integration approval.
- Decision: ready for S18 final manual signoff, not app-promotable yet

## Audit Result

- Rows: 600/600
- Type totals: {"multiple-choice":240,"fill-in":216,"short-answer":144}
- Status counts: {"pass":147,"solver-gap":453}
- Automated blocker count: 0
- Deterministic solved rows: 147 (baseline 83)
- Solver gaps: 453 (baseline 516)

## Manual Review State

- Manual review result counts: {"approved-deterministic":147,"pending-s18-review":453}
- Solver-gap clusters: 448
- Pass-sample rows prepared: 83
- Balanced sample shortfalls: P4: only 10/15 deterministic-pass rows available for balanced pass sampling; P6: only 13/15 deterministic-pass rows available for balanced pass sampling

## Required Before App Integration

- Complete S18 manual review for every `pending-s18-review` row or add deterministic solver coverage and rerun.

## Notes

- DeepSeek was not used as the judge of its own answers.
- Deterministic approvals mean the runner independently computed the answer and matched the stored answer/explanation.
- `pending-s18-review` rows are intentionally not treated as approved.
