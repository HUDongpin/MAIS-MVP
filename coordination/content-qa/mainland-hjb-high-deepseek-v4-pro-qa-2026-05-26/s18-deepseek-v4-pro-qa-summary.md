# S18 DeepSeek V4 Pro QA Summary - Mainland HJB High Questions

- Date: 2026-05-26
- Session ID: S18
- Scope: Current app-facing Mainland HJB high-school question packages: `hjb-v1`, `hjb-v2`, `hjb-v3-remediated`, `hjb-v4-remediated`
- Model: `deepseek-v4-pro`
- API host recorded: `api.deepseek.com`
- Secret handling: no API key or credential value is stored in this report or the generated QA artifacts.

## Requested Gates

1. Question is solvable: conditions are sufficient, no contradiction, no missing diagram/condition.
2. Answer matches the question: answer, accepted answers, choices, and explanation agree with an independent solution.

## Result

| Metric | Count |
| --- | ---: |
| Reviewed rows | 6000 |
| Pass | 5823 |
| DeepSeek needs-review flags | 177 |
| P0 | 0 |
| P1 | 165 |
| P2 | 12 |
| Unsolvable flagged | 0 |
| Answer mismatch flagged | 165 |

## By Package

| Package | Reviewed | Pass | Needs review | P1 | P2 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `hjb-v1` | 1500 | 1457 | 43 | 43 | 0 |
| `hjb-v2` | 1500 | 1433 | 67 | 55 | 12 |
| `hjb-v3-remediated` | 1500 | 1462 | 38 | 38 | 0 |
| `hjb-v4-remediated` | 1500 | 1471 | 29 | 29 | 0 |

## Issue-Code Counts

| Issue code | Count |
| --- | ---: |
| `wrong-answer` | 146 |
| `explanation-mismatch` | 46 |
| `ambiguous-prompt` | 27 |
| `multiple-correct-options` | 3 |
| `accepted-answer-gap` | 1 |

## Main Flag Clusters

| Cluster | Count | Notes |
| --- | ---: | --- |
| `AB·AC` interpretation | 83 | DeepSeek interprets `AB·AC` as vector dot product when angle is supplied; many rows answer as side-length product. These require S18 adjudication or wording normalization to `|AB|·|AC|` if length product is intended. |
| `x` range right-end constant wording | 38 | Many rows are mathematically correct but awkward/ambiguous because the prompt asks for the value of `a-b` while framing it as solving an inequality. |
| Trigonometric maximum-count rows | 42 | Rows asking how many times `y=A sin(2x+phi)` reaches maximum on `[0,2π]`; DeepSeek flagged answer/endpoint counting risks. |
| Isolated algebra/function/probability issues | 14 | Includes log identity multiple-correct risk, one accepted-answer domain gap, monotonic interval concern, and probability/statistics/cross-topic rows. |

## Interpretation

- DeepSeek did not flag any row as unsolvable.
- DeepSeek flagged 177 rows for review, mainly answer-match or ambiguity risks.
- Several DeepSeek issue explanations are self-contradictory and say the row should pass while still returning `needs-review`; therefore this file should be treated as a model-assisted triage queue, not final S18 rejection.
- The safest next step is not to edit production question data automatically. First adjudicate the 177-row issue queue, then repair confirmed failures and rerun the same QA gate.

## Artifacts

- Raw JSON: `deepseek-model-qa-results.json`
- All rows CSV: `deepseek-model-qa-results.csv`
- Issue queue CSV: `deepseek-model-qa-issues.csv`
- Model report: `deepseek-model-qa-report.md`
- Batch cache: `batches-f43584e060/`

## Checks

- `node --check coordination/content-qa/mainland-hjb-high-deepseek-v4-pro-qa-2026-05-26/deepseek-model-qa.mjs` passed.
- DeepSeek smoke batch: 10/10 pass.
- DeepSeek app-all batch cache: 300/300 cache files present.
- DeepSeek app-all final summary: 6000 reviewed, 5823 pass, 177 needs-review.
- Not run: `npm run type-check`; report-only QA artifacts and no app/source question code was modified.
