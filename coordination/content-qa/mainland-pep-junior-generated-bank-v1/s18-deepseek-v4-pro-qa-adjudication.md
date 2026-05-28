# S18 DeepSeek V4 Pro QA Adjudication - Mainland PEP Junior Legacy V1

- Date: 2026-05-25
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: `coordination/content-qa/mainland-pep-junior-generated-bank-v1/questions.jsonl`
- Rows reviewed: 900
- Model: `deepseek-v4-pro`
- API host: `api.deepseek.com`
- Secret handling: local provider configuration was used; no key values or raw provider payloads are recorded.
- Public integration status: not promoted; `data/questions.ts` and public imports were not edited.

## QA Runs

| Gate | Result |
| --- | --- |
| DeepSeek-v4-pro full QA | 900 reviewed: 823 pass, 39 warn, 38 fail |
| DeepSeek-v4-pro issue count | 77 flagged rows |
| DeepSeek token usage | prompt 146818, completion 69923, total 216741 |
| Deterministic solvability audit | 900 pass, 0 fail, 0 inventory issues, 99 manual queue rows |
| Independent solvability audit | 900 pass, 0 fail, 0 duplicate IDs, 0 exact prompt duplicates |

## S18 Adjudication

DeepSeek found useful public-readiness signals. After spot-checking the flagged rows against the actual candidate records, S18 classifies the 77 DeepSeek flags as follows:

| Adjudicated class | Count | Promotion impact |
| --- | ---: | --- |
| Real blocking defect | 12 | Must fix or exclude before public promotion |
| Non-blocking polish | 3 | Safe after wording/format cleanup |
| Curation density risk | 52 | Math is usable, but do not promote all near-duplicate variants as-is |
| DeepSeek false positive / over-strict fail | 10 | No content fix required after human review |

## Blocking Defects

These rows should not enter public `questions` until remediated or excluded:

| Issue | Rows | Notes |
| --- | --- | --- |
| Explanation contradiction | `pep-junior-candidate-k01-sa-017` | Answer is `3`, but explanation says the result is negative. |
| Duplicate/numerically duplicate MC options | `pep-junior-candidate-k03-mc-008`, `pep-junior-candidate-k03-mc-009`, `pep-junior-candidate-k03-mc-010`, `pep-junior-candidate-k03-mc-011`, `pep-junior-candidate-k03-mc-012`, `pep-junior-candidate-k03-mc-020`, `pep-junior-candidate-k03-mc-023`, `pep-junior-candidate-k03-mc-024`, `pep-junior-candidate-k03-mc-025`, `pep-junior-candidate-k03-mc-026` | Options include the correct numeric answer twice, once with a `（少一步）` label, making single-choice behavior unfair. |
| Duplicate/numerically duplicate coordinate MC option | `pep-junior-candidate-k04-mc-007` | Options include `(3,3)` and `(3,3)（少一步）`, making the correct coordinate effectively duplicated. |

## Non-Blocking Polish

- `pep-junior-candidate-k02-mc-003`: canonical answer `8x+0` should be simplified to `8x`.
- `pep-junior-candidate-k02-mc-016`: canonical answer `4x+0` should be simplified to `4x`.
- `pep-junior-candidate-k02-mc-023`: distractor `2x+-1` should be normalized to `2x-1`.

## Curation Density Risks

DeepSeek flagged 52 mathematically correct rows as too repetitive for public-bank quality if promoted as a dense block:

- `pep-junior-s2-lower-roots-pythagorean-quadrilaterals`: `pep-junior-candidate-k08-sa-004` through `pep-junior-candidate-k08-sa-021`
- `pep-junior-s2-lower-linear-functions-data`: `pep-junior-candidate-k09-sa-012` through `pep-junior-candidate-k09-sa-027`
- `pep-junior-s3-lower-inverse-similarity-trigonometry`: `pep-junior-candidate-k11-sa-011` through `pep-junior-candidate-k11-sa-028`

These are not math errors. They are public-readiness risks because the questions are mostly single-template numeric variants. A curated promotion should either thin these runs, diversify the prompts, or mark them as parameterized practice variants rather than separate public-bank exemplars.

## False Positives / Downgraded Flags

DeepSeek marked `pep-junior-candidate-k01-sa-018` through `pep-junior-candidate-k01-sa-027` as failing for not explaining the sign. Human spot-check shows each explanation already states `结果为负数`, and the answers match the computations. S18 downgrades these 10 rows to pass.

## Promotion Recommendation

Do not promote the full legacy v1 900-question package as-is.

Recommended path:

1. Build a filtered v1 promotion candidate that excludes the 12 blocking rows.
2. Decide whether to include, thin, or rewrite the 52 repetitive public-readiness rows.
3. Normalize the 3 non-blocking notation/polish rows if they are included.
4. Re-run DeepSeek-v4-pro QA on the filtered/remediated package.
5. Coordinate any public integration with S04/S08, then run `npm run test:question-bank` and `npm run type-check`.

Strictly clean subset from this run:

- 823 rows were direct DeepSeek pass.
- 10 additional rows are human-adjudicated DeepSeek false positives.
- Therefore 833 rows are currently clean by combined DeepSeek plus S18 adjudication.
- Up to 55 more rows may be usable after curation/polish, but should not be bulk-promoted without owner approval.

## Artifacts

- DeepSeek summary: `coordination/content-qa/mainland-pep-junior-generated-bank-v1/deepseek-v4-pro-qa/deepseek-v4-pro-qa-summary.md`
- DeepSeek JSON results: `coordination/content-qa/mainland-pep-junior-generated-bank-v1/deepseek-v4-pro-qa/deepseek-v4-pro-qa-results.json`
- DeepSeek issue CSV: `coordination/content-qa/mainland-pep-junior-generated-bank-v1/deepseek-v4-pro-qa/deepseek-v4-pro-qa-issues.csv`
- Cached batch responses: `coordination/content-qa/mainland-pep-junior-generated-bank-v1/deepseek-v4-pro-qa/batches/`
