# S18 Quality And Difficulty QA - us-ca-k5-knowledge-point-practice-v1

Decision: `candidate-only-quality-qa-pass`

This review supplements the earlier deterministic two-round QA. The package still passes row inventory, answer-key, multiple-choice uniqueness, source-distance, and deterministic solvability checks. The stricter pedagogical QA verdict above controls whether the candidate can move beyond repair.

## Difficulty Split - Current Labels

| Level | Count |
| --- | ---: |
| Low | 123 |
| Medium | 246 |
| High | 123 |

## Difficulty Split By Grade - Current Labels

| Grade | Low | Medium | High |
| --- | ---: | ---: | ---: |
| K | 18 | 36 | 18 |
| P1 | 48 | 96 | 48 |
| P2 | 12 | 24 | 12 |
| P3 | 15 | 30 | 15 |
| P4 | 15 | 30 | 15 |
| P5 | 15 | 30 | 15 |

## S18 Recommended Triage

| Bucket | Count |
| --- | ---: |
| High | 123 |
| Low | 123 |
| Medium | 246 |

Rows marked `RepairBeforeUse` should be rewritten before final Low/Medium/High classification. If no rows are marked `RepairBeforeUse`, the current Low/Medium/High labels are the S18 accepted candidate labels.

## Quality Findings

| Severity | Count |
| --- | ---: |
| none | 0 |

| Check | Count |
| --- | ---: |
| none | 0 |

## Main Quality Assessment

- Math answer solvability remains strong: stored answers, independent answers, and computed answers agree for all 492 rows.
- Major repair rows: 0.
- Current difficulty labels are compared against S18 recommended triage above.
- Chinese prompt label findings: 0.
- Template diversity check: 0 repeated core-prompt groups affect 0 rows after stripping context labels and numbers.

## Release Recommendation

Keep the package candidate-only. Do not import it into live practice or attach it to live lesson `practiceQuestionIds` until S23 plans promotion, S04/S05 receive explicit live-surface ownership, and S11/S22 provide regression/release evidence.
