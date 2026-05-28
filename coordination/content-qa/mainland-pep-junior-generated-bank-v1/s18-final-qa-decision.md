# S18 Mainland PEP Junior 900-Question Candidate Final QA Decision

- Date: 2026-05-23
- Session ID: S18
- Scope: `coordination/content-qa/mainland-pep-junior-generated-bank-v1/questions.jsonl`
- Release stance: Candidate-only; do not promote the full 900-question bank to Practice Arena in this task.
- Final decision: remediated-candidate-ready-for-promotion-evaluation

## 2026-05-25 DeepSeek QA Remediation Addendum

This 2026-05-23 decision remains a historical QA record. The latest DeepSeek-v4-pro follow-up and remediation status is documented in `s18-remediation-report.md`.

Current 2026-05-25 status:

- The 900-row candidate package was regenerated after S18 human review categorized 12 true blockers, 3 polish rows, 52 repetition-density rows, and 10 DeepSeek over-strict false positives.
- Local deterministic and independent candidate QA now pass 900/900 rows, with 0 inventory issues, 0 duplicate IDs, and 0 exact duplicate prompts.
- A forced DeepSeek-v4-pro rerun reviewed all 900 rows: 890 pass, 10 fail, 0 warn.
- The remaining 10 DeepSeek fails are exactly `pep-junior-candidate-k01-sa-018` through `pep-junior-candidate-k01-sa-027`; S18 adjudicates them as over-strict false positives because the arithmetic answer and sign are correct.
- `npm run test:question-bank` passed 42/42 after the remediation.
- Public integration remains out of scope until separately approved for S04/S08/S18.

## Automated QA Result

- Total candidate rows: 900 / 900
- Grade distribution: S1 409, S2 327, S3 164
- Type distribution: multiple-choice 300, fill-in 300, short-answer 300
- Knowledge-point/type coverage: 33 cells, each with 27 or 28 rows
- Main audit: 900 pass, 0 fail, 0 inventory issues
- Independent solvability audit: 900 pass, 0 fail, 0 duplicate IDs, 0 exact prompt duplicates
- Manual review queue: 99 rows

## Remediation Result

| Remediation Area | Result |
| --- | --- |
| Invalid SSS triangle rows | Fixed at generator level; all SSS triangle side triples now satisfy triangle inequality. |
| Rational-expression domain answers | Fixed at generator level; canonical answers now include the simplified value and excluded value. |
| Public starter synchronization | 99 starter rows refreshed from the regenerated candidate rows while preserving starter release metadata. |
| QA gates | Main and independent audits now fail invalid SSS side lengths and missing canonical domain restrictions. |

## S18 Manual Sample Result

| Decision | Count |
| --- | ---: |
| approved | 99 |
| rewrite | 0 |
| block | 0 |

## Previously Flagged Rows

| Question ID | Previous Issue | Current Result |
| --- | --- | --- |
| `pep-junior-candidate-k06-sa-027` | Invalid triangle side lengths 6, 18, 29 | Regenerated as valid SSS triangle side lengths 14, 17, 20. |
| `pep-junior-candidate-k07-sa-001` | Answer omitted `x≠-5` | Canonical answer is now `3，x≠-5`. |
| `pep-junior-candidate-k07-sa-015` | Answer omitted `x≠-5` | Canonical answer is now `9，x≠-5`. |
| `pep-junior-candidate-k07-sa-028` | Answer omitted `x≠-2` | Canonical answer is now `6，x≠-2`. |

## Integration Boundary

- `data/questions.ts` still imports only `mainlandPepJuniorStarterQuestions`.
- The full `questions.jsonl` candidate bank is not imported into public Practice Arena data.
- The current 99-question starter set has been synchronized and can remain public.
- Promoting any additional junior questions still requires a separate owner-approved S04/S08/S18 rollout task.

## Checks Run

- `node --check coordination/content-qa/mainland-pep-junior-generated-bank-v1/generate-deterministic.mjs`
- `node --check coordination/content-qa/mainland-pep-junior-generated-bank-v1/audit-solvability.mjs`
- `node --check coordination/content-qa/mainland-pep-junior-generated-bank-v1/audit-independent-solvability.mjs`
- `node coordination/content-qa/mainland-pep-junior-generated-bank-v1/generate-deterministic.mjs`
- `node coordination/content-qa/mainland-pep-junior-generated-bank-v1/audit-solvability.mjs`
- `node coordination/content-qa/mainland-pep-junior-generated-bank-v1/audit-independent-solvability.mjs`
- Read-only inventory and special scan confirmed 900 total rows, S1/S2/S3 409/327/164, 300 rows per type, 33 cells with 27/28 rows, 0 invalid triangles, 0 missing domain restrictions, and 0 stale starter rows.
- `npm run test:rag` passed 74/74.
- `npm run test:question-bank` passed 37/37.
- `npm run type-check` passed.

## Required Before Full Promotion

1. Open a separate owner-approved promotion task covering S04/S08/S18 responsibilities.
2. Decide whether to promote all 900 rows or a smaller curated expansion beyond the current 99 starter rows.
3. Re-run the same main audit, independent audit, RAG, question-bank, and type-check gates immediately before promotion.
