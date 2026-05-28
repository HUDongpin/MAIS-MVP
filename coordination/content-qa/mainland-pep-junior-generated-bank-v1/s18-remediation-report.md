# S18 Remediation Report - Mainland PEP Junior Legacy V1 Candidate

- Date: 2026-05-25
- Session ID: S18
- Scope: `coordination/content-qa/mainland-pep-junior-generated-bank-v1/questions.jsonl`
- Package size after remediation: 900 rows
- Public integration status: candidate-only; no public `data/questions.ts` or public question imports were edited.

## Owner Review Input

S18 human review categorized the previous DeepSeek QA findings as:

- 12 true blockers: must fix or exclude.
- 3 format/expression polish rows.
- 52 repetition-density rows: mathematically usable, but not suitable for uncurated bulk promotion.
- 10 DeepSeek over-strict false positives.
- 833 rows could already be treated as clean: 823 DeepSeek pass + 10 S18-reviewed pass.

## Remediation Applied

The v1 deterministic candidate generator was revised and the 900-row candidate package was regenerated.

### True Blockers

- Fixed the signed-number short-answer explanation path so zero/positive/negative labels match the computed result.
  - Representative fixed row: `pep-junior-candidate-k01-sa-017`.
- Reworked multiple-choice distractor generation so it no longer emits review-label variants such as `（少一步）` as answer-like options.
  - This resolved the k03 angle-option ambiguity/duplication blockers.
- Reworked option uniqueness normalization so coordinate options preserve signs and parentheses.
  - Representative fixed row: `pep-junior-candidate-k04-mc-007`.

### Polish Rows

- Normalized linear-expression answers and distractors to avoid public-facing `+0` and `+-` forms.
  - `pep-junior-candidate-k02-mc-003`: answer now `8x`.
  - `pep-junior-candidate-k02-mc-016`: answer now `4x`.
  - `pep-junior-candidate-k02-mc-023`: distractor now uses `2x-1`, not `2x+-1`.

### Repetition-Density Rows

- Diversified the previously dense short-answer template bands instead of bulk-copying near-identical prompts.
- Updated k08 parallelogram short answers across diagonal half, opposite side, perimeter, missing adjacent side, adjacent angle, and diagonal-bisection variants.
- Updated k09 statistics short answers across median, mean, range, mode, and missing datum variants.
- Updated k11 inverse/similarity/trigonometry short answers across inverse function, 45-degree height, 30-degree radical height, and 60-degree radical height variants.
- Exact duplicate prompt count after regeneration: 0.

### DeepSeek False Positives

The 10 previously adjudicated DeepSeek over-strict false positives remain mathematically correct:

- `pep-junior-candidate-k01-sa-018`
- `pep-junior-candidate-k01-sa-019`
- `pep-junior-candidate-k01-sa-020`
- `pep-junior-candidate-k01-sa-021`
- `pep-junior-candidate-k01-sa-022`
- `pep-junior-candidate-k01-sa-023`
- `pep-junior-candidate-k01-sa-024`
- `pep-junior-candidate-k01-sa-025`
- `pep-junior-candidate-k01-sa-026`
- `pep-junior-candidate-k01-sa-027`

DeepSeek still returned `fail` for these 10 rows in the forced rerun, but its rationales state the arithmetic answers are correct. S18 therefore keeps the prior human adjudication: these are model over-strict false positives, not current blockers.

## Verification

### Regeneration

`node coordination/content-qa/mainland-pep-junior-generated-bank-v1/generate-deterministic.mjs`

- Generated questions: 900
- Knowledge points: 11
- Type counts: 300 multiple-choice, 300 fill-in, 300 short-answer

### Local Candidate QA

`node coordination/content-qa/mainland-pep-junior-generated-bank-v1/audit-solvability.mjs`

- Total questions: 900
- Pass rows: 900
- Failing rows: 0
- Inventory issues: 0
- Manual review queue rows: 99

`node coordination/content-qa/mainland-pep-junior-generated-bank-v1/audit-independent-solvability.mjs`

- Total questions: 900
- Attempted rows: 900
- Pass rows: 900
- Failing rows: 0
- Duplicate IDs: 0
- Exact duplicate prompts: 0

Targeted remediation scan:

- Multiple-choice duplicate options after review-label stripping: 0
- Review-label options such as `少一步`, `符号错`, `倒数错`, `相反数`: 0
- k02 `+0`/`+-` polish defects: 0
- Exact duplicate prompt groups: 0

### DeepSeek-v4-pro Forced Rerun

`node coordination/content-qa/mainland-pep-junior-generated-bank-v1/deepseek-v4-pro-qa.mjs --force`

- Reviewed rows: 900
- Pass: 890
- Fail: 10
- Warn: 0
- Remaining issue set: exactly `pep-junior-candidate-k01-sa-018` through `pep-junior-candidate-k01-sa-027`
- S18 adjudication: all 10 are over-strict false positives because the arithmetic answer and sign are correct.
- Token usage: prompt 146,782; completion 69,000; total 215,782.

### Project Regression

`npm run test:question-bank`

- Passed: 42/42

Syntax checks:

- `node --check coordination/content-qa/mainland-pep-junior-generated-bank-v1/generate-deterministic.mjs` passed.
- `node --check coordination/content-qa/mainland-pep-junior-generated-bank-v1/audit-independent-solvability.mjs` passed.

## S18 Decision

The remediated legacy v1 candidate package no longer contains the 12 true blockers, the 3 identified polish defects, or the exact-prompt density issue that caused the 52-row bulk-promotion concern.

Current S18 QA interpretation:

- Deterministic/local QA: 900/900 pass.
- DeepSeek-v4-pro QA: 890 pass + 10 known false-positive fails.
- Human-adjudicated current blockers: 0 in the regenerated candidate package.

This is sufficient for a remediated candidate handoff, but it is not an automatic public-bank promotion. Any public integration should still be explicitly assigned to S04/S08/S18, re-run the QA gates immediately before integration, and preserve the existing public v2 bank until owner approval.
