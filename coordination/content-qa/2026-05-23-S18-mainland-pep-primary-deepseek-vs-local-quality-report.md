# S18 Mainland PEP Primary Question QA: DeepSeek 600 vs Local 1200

- Date: 2026-05-23
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: Compare Mainland PEP primary generated question banks using committed/generated question content only.
- Verdict: Complete input audit generated; use manual review before final rollout.

## Executive Summary

- DeepSeek input is complete: 600/600 questions and 60/60 batch files are present.
- Local input is complete: 1200/1200 deterministic questions are present.
- Because the DeepSeek bank is not frozen at 600 questions, this report is a staged quality audit, not a final supplier-quality verdict.
- Current main-bank recommendation: use the local 1200-question bank as the complete baseline after same-ID local RAG replacement of the 166 manually rejected sample rows. Treat DeepSeek rows as supplemental candidates after manual blind review, limited to covered grades/semesters.
- Manual blind-review queue generated: 480 rows. The CSV intentionally omits source labels.

## Inventory Gate

| Bank | Actual questions | Expected questions | Actual files | Expected files | Gate |
| --- | --- | --- | --- | --- | --- |
| DeepSeek | 600 | 600 | 60 | 60 | Complete |
| Local | 1200 | 1200 | n/a | n/a | Complete |

Missing DeepSeek batch files: None

## Automated Score Summary

| Batch | Count | Overall | Math | Curriculum | Schema | Explanation | Language | Diversity | Source safety | Direct launch | Rewrite | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| deepseek-600 | 600 | 94.2 | 82.1 | 100 | 100 | 95.5 | 93.8 | 99.1 | 100 | 0 (0%) | 0 (0%) | 0 |
| local-1200 | 1200 | 96.3 | 100 | 100 | 100 | 96.6 | 90.9 | 77.4 | 100 | 1200 (100%) | 0 (0%) | 0 |

## Key Risks

- DeepSeek: manual-math-review-required 600, exact-prompt-duplicate 15, duplicate-options 1
- Local: near-duplicate-template-cluster 979, exact-prompt-duplicate 2

## Lowest-Scoring Rows For Triage

| Batch | Question ID | Grade | Semester | Type | Difficulty | Overall | Recommendation | Top flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| deepseek-600 | pep-primary-p1-lower-020 | P1 | lower | fill-in | Foundation | 87.5 | sample-review | manual-math-review-required |
| deepseek-600 | pep-primary-p1-lower-023 | P1 | lower | fill-in | Core | 87.5 | sample-review | manual-math-review-required |
| deepseek-600 | pep-primary-p1-lower-047 | P1 | lower | multiple-choice | Foundation | 87.5 | sample-review | manual-math-review-required |
| deepseek-600 | pep-primary-p1-upper-008 | P1 | upper | fill-in | Foundation | 87.5 | sample-review | manual-math-review-required |
| deepseek-600 | pep-primary-p3-lower-016 | P3 | lower | multiple-choice | Core | 87.5 | sample-review | manual-math-review-required |
| deepseek-600 | pep-primary-p4-upper-002 | P4 | upper | fill-in | Foundation | 87.5 | sample-review | manual-math-review-required |
| deepseek-600 | pep-primary-p4-upper-042 | P4 | upper | fill-in | Foundation | 87.5 | sample-review | manual-math-review-required |
| deepseek-600 | pep-primary-p5-lower-027 | P5 | lower | short-answer | Foundation | 87.5 | sample-review | manual-math-review-required |
| deepseek-600 | pep-primary-p5-upper-010 | P5 | upper | multiple-choice | Foundation | 88 | sample-review | exact-prompt-duplicate; manual-math-review-required |
| deepseek-600 | pep-primary-p5-upper-037 | P5 | upper | multiple-choice | Core | 88 | sample-review | exact-prompt-duplicate; manual-math-review-required |
| local-1200 | pep-primary-p1-l-fi-110 | P1 | lower | fill-in | Foundation | 93.5 | pass | near-duplicate-template-cluster |
| local-1200 | pep-primary-p1-l-fi-111 | P1 | lower | fill-in | Foundation | 93.5 | pass | near-duplicate-template-cluster |
| local-1200 | pep-primary-p1-l-fi-112 | P1 | lower | fill-in | Foundation | 93.5 | pass | near-duplicate-template-cluster |
| local-1200 | pep-primary-p1-l-fi-113 | P1 | lower | fill-in | Foundation | 93.5 | pass | near-duplicate-template-cluster |
| local-1200 | pep-primary-p1-l-fi-114 | P1 | lower | fill-in | Foundation | 93.5 | pass | near-duplicate-template-cluster |
| local-1200 | pep-primary-p1-l-fi-115 | P1 | lower | fill-in | Foundation | 93.5 | pass | near-duplicate-template-cluster |
| local-1200 | pep-primary-p1-l-fi-116 | P1 | lower | fill-in | Foundation | 93.5 | pass | near-duplicate-template-cluster |
| local-1200 | pep-primary-p1-l-fi-117 | P1 | lower | fill-in | Foundation | 93.5 | pass | near-duplicate-template-cluster |
| local-1200 | pep-primary-p1-l-fi-118 | P1 | lower | fill-in | Foundation | 93.5 | pass | near-duplicate-template-cluster |
| local-1200 | pep-primary-p1-l-fi-119 | P1 | lower | fill-in | Foundation | 93.5 | pass | near-duplicate-template-cluster |

## Decision

- Main production baseline: local-1200, because it is complete and has deterministic answer-key verification.
- Supplemental candidate pool: DeepSeek covered rows only, pending manual blind review and completion of the missing 0 questions.
- Must remove or rewrite: any row marked blocker-review in the row-level CSV/JSON.
- Do not claim a complete DeepSeek-vs-local outcome until the missing DeepSeek files are present and the manual blind-review queue is scored.

## Generated Artifacts

- Row-level CSV: `coordination/content-qa/2026-05-23-S18-mainland-pep-primary-deepseek-vs-local-quality-report.csv`
- Machine JSON: `coordination/content-qa/2026-05-23-S18-mainland-pep-primary-deepseek-vs-local-quality-report.json`
- Blind manual-review queue: `coordination/content-qa/2026-05-23-S18-mainland-pep-primary-deepseek-vs-local-quality-report.manual-review-queue.csv`

## Assumptions

- No live LLM, OCR, textbook corpus, exam-paper source text, source images, or external solver was used.
- Local deterministic math status uses the existing independent Mainland PEP primary answer function.
- DeepSeek math correctness is structurally triaged but still requires manual review because no dedicated deterministic solver exists for its free-form stems.
- Scores are triage scores for prioritizing review, not a substitute for S18 human sign-off.
