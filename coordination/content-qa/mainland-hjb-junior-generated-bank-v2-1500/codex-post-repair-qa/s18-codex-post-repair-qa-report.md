# S18 Codex-Only Post-Repair QA - Mainland HJB Junior V2

- Date: 2026-05-25
- Session ID: S18
- Candidate package: `mainland-hjb-junior-generated-bank-v2-1500`
- QA mode: Codex-only post-repair review; DeepSeek fresh QA was stopped and is not used for this gate.
- Decision: production-integration-approved

## Gate Summary

| Gate | Result |
| --- | ---: |
| Total rows | 1500 |
| S1 / S2 / S3 rows | 500 / 500 / 500 |
| Repair targets completed | 201 / 201 |
| Repair cache files | 41 |
| Duplicate ID groups | 0 |
| Duplicate prompt groups | 0 |
| Structural/source/content-residue issue rows | 0 |
| Numeric answer/explanation echo misses | 0 |
| Deterministic solvability audit approved | yes |
| Manual review queue rows | 150 |
| Codex targeted corrections applied | 25 |
| Blocking rows after Codex review | 0 |

## Type Counts

| Type | Count |
| --- | ---: |
| fill-in | 525 |
| multiple-choice | 600 |
| short-answer | 375 |

## Codex Correction Themes

| Issue type | Count |
| --- | ---: |
| answer-mismatch | 12 |
| area-error | 1 |
| duplicate-and-inconsistent-item | 1 |
| explanation-polish | 2 |
| generator-rationale-residue | 2 |
| invalid-chord-condition | 1 |
| invalid-condition | 1 |
| invalid-radicand-condition | 1 |
| multiple-correct-options | 3 |
| ordering-error | 1 |

## Blocking Rows

- None

## Interpretation

- Candidate QA is green and owner-authorized for publisher-scoped production integration.
- Public integration is approved for `MAINLAND_HJB` S1-S3 Lesson checkpoints, Practice Arena, and question APIs; HK, PEP, and US tracks must remain isolated.
- `mathQaStatus`, `terminologyQaStatus`, and `manualQaStatus` are promoted by the deterministic audit to `pass` / `approved` for production metadata.
