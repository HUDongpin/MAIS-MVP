# S18 Mainland PEP High DeepSeek-pro-v4 Quality Check

- Date: 2026-05-26
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Requested check: Use DeepSeek-pro-v4 to verify 人教版高中题目质量: (1) questions are solvable; (2) stored answers match the questions.
- Live DeepSeek-pro-v4 status: Completed with owner-provided transient API key.
- Source edits: None.

## Executive Summary

DeepSeek-pro-v4 reviewed all 4800 current app-integrated Mainland PEP high-school questions from `data/mainlandPepHighQuestions.ts`.

For the two requested hard gates:

| Gate | DeepSeek result |
| --- | ---: |
| Solvable / 题目可解 | 4800/4800 pass |
| Answer matches question / 答案和题目匹配 | 4800/4800 pass |
| Unsolvable flagged | 0 |
| Answer mismatch flagged | 0 |

Additional explanation-quality signal:

| Signal | Count |
| --- | ---: |
| Overall pass rows | 4760 |
| Needs review rows | 40 |
| P0 rows | 0 |
| P1 rows | 0 |
| P2 rows | 40 |
| Local model-contradiction corrections | 89 |

The 40 `needs-review` rows are not solvability or answer-key blockers. They are all P2 `explanation-mismatch` rows in S5 `rag-v2`, topic `pep-high-s5-lines-circles`, where DeepSeek judged the stored answer correct but the explanation text mentions unrelated slope reasoning for circle-equation/radius questions.

## DeepSeek Run Details

| Field | Value |
| --- | --- |
| Model | `deepseek-v4-pro` |
| API host | `api.deepseek.com` |
| Scope | all 4800 current Mainland PEP high-school rows |
| Batch size | 20 |
| Batches | 240/240 completed |
| Cache run id | `full-20260526-v1` |
| Result path | `coordination/content-qa/mainland-pep-high-deepseek-pro-v4-qa-2026-05-26/` |

Primary artifacts:

- `deepseek-model-qa-report.md`
- `deepseek-model-qa-results.json`
- `deepseek-model-qa-results.csv`
- `deepseek-model-qa-issues.csv`

## Findings

| Category | Count | Notes |
| --- | ---: | --- |
| `unsolvable` | 0 | No row was judged impossible, contradictory, or missing necessary conditions. |
| `wrong-answer` after consistency validation | 0 | No final row has an answer-key mismatch. |
| `explanation-mismatch` | 40 | S5 `rag-v2` line/circle fill-in and short-answer rows 021-040. Answers match; explanation references slope logic that is not relevant to the circle-radius/equation task. |

Affected ID pattern:

- `pep-high-s5-rag2-fi-021` through `pep-high-s5-rag2-fi-040`
- `pep-high-s5-rag2-sa-021` through `pep-high-s5-rag2-sa-040`

## Validation And Secret Hygiene

- `node --check coordination/content-qa/mainland-pep-high-deepseek-pro-v4-qa-2026-05-26/deepseek-model-qa.mjs`: passed.
- Results CSV row count: 4800 data rows plus header.
- Issues CSV row count: 40 data rows plus header.
- Batch cache count for the full run: 240 JSON batch files.
- Secret scan: no `sk-...` key pattern found in generated QA artifacts or S18 logs checked after the run.
- The key was used only as a transient runtime credential and was not stored in files.

## Interpretation

The current online 人教版高中题库 passes the user's two requested DeepSeek-pro-v4 hard gates: every question is solvable and every answer matches the question.

Recommended follow-up is narrow: have S18/S04 review and, if approved, repair the 40 S5 `rag-v2` explanation texts. No source question-bank edit was made in this pass.
