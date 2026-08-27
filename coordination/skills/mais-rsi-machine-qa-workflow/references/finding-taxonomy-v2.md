# Finding Taxonomy v2

Status: **normative**. Findings outside this closed list are schema failures until the taxonomy is deliberately versioned.

## Closed Codes

| Code | Family | Default severity | Meaning |
| --- | --- | --- | --- |
| `ANSWER_INDEPENDENT_MISMATCH` | F1 | P0 | Independently solved answer conflicts with the accepted answer. |
| `UNSOLVABLE_OR_UNIT_DOMAIN_BOUNDARY` | F1 | P0 | The prompt is unsolvable or violates a unit/domain boundary. |
| `EQUIVALENT_OR_MULTIPLE_CORRECT_OPTIONS` | F2 | P1 | Equivalent or multiple options are correct. |
| `MISSING_OPTIONS` | F2 | P1 | A multiple-choice item has absent or empty options. |
| `EXPLANATION_STEP_MISMATCH` | F3 | P1 | An explanation step conflicts with the valid solution. |
| `ACCEPTED_ANSWER_FALSE_REJECT` | F4 | P0 | A valid response is rejected. |
| `NEAR_ANSWER_FALSE_ACCEPT` | F4 | P0 | An invalid near answer is accepted. |
| `EVIDENCE_LABEL_MISMATCH` | F5 | P1 | Evidence, diagram, or label conflicts with the answer-critical claim. |
| `LANGUAGE_SEMANTIC_MISMATCH` | F6 | P1 | Language variants are not semantically equivalent. |
| `CURRICULUM_GRADE_PUBLISHER_MISMATCH` | F7 | P1 | Curriculum, grade, region, or publisher alignment is inconsistent. |
| `TEMPLATE_IDENTITY_LEAKAGE` | F8 | P0 | Template or concealed identity leaked into reviewable content. |
| `ORACLE_PROVENANCE_CONTAMINATION` | F9 | P0 | Gold/oracle/provenance information contaminated the review surface. |
| `DUPLICATE_TRI_LOCALE_PROMPT` | NATURAL | P2 | Duplicate prompt appears across the registered locale grouping. |
| `LESSON_QUESTION_MISSING` | NATURAL | P0 | A lesson question is absent from the required structure. |
| `LESSON_ANSWER_MISMATCH` | NATURAL | P1 | Lesson answer conflicts with its question. |
| `LESSON_EXPLANATION_MISMATCH` | NATURAL | P2 | Lesson explanation conflicts with its answer or question. |

`MISSING_OPTIONS` applies only to a multiple-choice item whose options are absent or empty. It is invalid for fill-in or short-answer formats and invalid for multiple-choice items with nonempty options.

## Role Allowlists

### Deterministic baseline

May emit:

- `ANSWER_INDEPENDENT_MISMATCH`
- `EQUIVALENT_OR_MULTIPLE_CORRECT_OPTIONS`
- `MISSING_OPTIONS`
- `ACCEPTED_ANSWER_FALSE_REJECT`
- `EVIDENCE_LABEL_MISMATCH`
- `TEMPLATE_IDENTITY_LEAKAGE`
- `ORACLE_PROVENANCE_CONTAMINATION`
- `DUPLICATE_TRI_LOCALE_PROMPT`
- `LESSON_QUESTION_MISSING`
- `LESSON_ANSWER_MISMATCH`
- `LESSON_EXPLANATION_MISMATCH`

### `answer-blind-solver`

May emit F1 and F2 codes only.

### `tool-verifier`

May emit F1, F2, F4, and F9 codes only.

### `adversarial-grader`

May emit F2, F3, and F4 codes only.

### `bilingual-curriculum-critic`

May emit only `LANGUAGE_SEMANTIC_MISMATCH` and `CURRICULUM_GRADE_PUBLISHER_MISMATCH`.

### `evidence-verifier`

May emit F5, F8, F9, and lesson-integrity codes.

### B-prime critique and revision

May use the full closed taxonomy. The revision must preserve or explicitly resolve critique disagreements; it cannot silently introduce an unknown code.

## Structural Rules

- Families and severities must match the table unless a versioned policy explicitly records an override.
- Every finding binds one projected `surface-<16 lowercase hex>` identity and one `finding-<16 lowercase hex>` identity; arbitrary slugs are not accepted.
- `inspectionComplete: true` requires every expected surface exactly once in `inspectedSurfaceIds`.
- Duplicated, missing, or unknown surfaces invalidate the role result.
- Unknown roles or codes invalidate the result; they are not mapped heuristically.
- Details must remain bounded and redacted. Do not reproduce full question, answer, gold, or provider-reasoning text.
