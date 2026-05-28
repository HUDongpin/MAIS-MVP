# S18 QA Plan: Mainland PEP High RAG-v4 Public Question Quality

- Date: 2026-05-23
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: 1500 high-school `rag-v4` questions exported as `mainlandPepHighRagV4Questions` and included in public `mainlandPepHighQuestions`
- Status: Public-integrated after S18 approval and S04/S08 aggregation work
- Public rollout stance: allowed to remain enabled while the gates below stay green

## QA Objective

Validate that the 1500 public-integrated `rag-v4` questions remain safe, mathematically correct, curriculum-aligned, sufficiently varied, bilingual-ready, and suitable for the student-facing Mainland PEP high-school question bank.

## Current Evidence Baseline

| Evidence | Expected result |
| --- | --- |
| `coordination/content-qa/2026-05-23-S18-mainland-high-rag-v4-public-solvability-audit.{md,json,csv}` | 1500/1500 pass; public integration true; public rag-v4 count 1500 |
| `coordination/content-qa/2026-05-23-S18-mainland-high-seed-v1-vs-rag-v2-vs-rag-v3-vs-rag-v4-public-quality-report.{md,json,csv}` | rag-v4 pass 1500; blocker/manual review 0 |
| `coordination/content-qa/2026-05-23-S18-mainland-high-rag-v4-manual-review-results.csv` | Expanded manual sample remains student-ready |
| `coordination/content-qa/2026-05-23-S18-mainland-high-rag-v4-final-qa-decision.md` | Final decision remains `approve-for-promotion` |

## Public Inventory

| Metric | Expected / observed |
| --- | ---: |
| RAG-v4 public questions | 1500 |
| S4 rows | 500 |
| S5 rows | 500 |
| S6 rows | 500 |
| Multiple choice | 510 |
| Fill-in | 495 |
| Short answer | 495 |
| Public Mainland PEP high-school total | 4800 |
| Public full-bank total | 7485 |

## Automated Gates

Run these after any future Mainland PEP high-school question-bank edit:

| Gate | Command | Required result |
| --- | --- | --- |
| Public rag-v4 solvability and answer-key audit | `npm run qa:mainland-high-rag-v4-public` | 1500 total, 1500 pass, 0 failures, 0 duplicate IDs, 0 duplicate exact prompts, public-integrated true |
| Automated quality comparison | `npm run qa:mainland-high-compare` | No `blocker-review` or `manual-review` rows for `rag-v4`; risk counts exported |
| Question-bank regression | `npm run test:question-bank` | Passes; public high-school counts and curriculum isolation remain green |
| TypeScript validation | `npm run type-check` | Passes if production TypeScript files are touched |
| Full-bank public boundary check | `npm run qa:full-question-bank` | Public total 7485; Mainland PEP high-school count 4800; failures 0 |

## Manual Review Contract

Maintain the 240+ row sample floor when substantial content changes occur. Coverage must include S4/S5/S6, multiple-choice/fill-in/short-answer, every topic, and priority topics including derivatives, conics, trigonometry, space vectors, probability/statistics, and sequences.

Each reviewed row still checks mathematical correctness, answer uniqueness, distractor quality, grade/topic/difficulty fit, bilingual equivalence, explanation quality, source distance, and template variety.

## Promotion Maintenance Thresholds

Public integration remains acceptable only if all of these are true:

| Gate | Required threshold |
| --- | --- |
| Automated solvability | 1500/1500 pass |
| Automated blocker/manual rows | 0 `blocker-review`; 0 `manual-review` |
| Manual rejects | 0 unresolved `reject` rows |
| Wrong-answer or ambiguous-answer rate in sample | 0 unresolved |
| Source-distance issues | 0 unresolved |
| Template-overlap rows | Below 20% of manually reviewed rows |
| Regression checks | Required commands pass or document a clear environment blocker |

## Stop Conditions

Stop and write a blocker report if a source-copying pattern, systematic wrong answer, systematic ambiguity, public-count regression, or full-bank regression appears. Do not fix broad content defects by hand-patching scattered rows; remediate generator/templates and rerun the full gate set.
