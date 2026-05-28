# S18 Conic Answer-Key Rereview

- Date: 2026-05-20
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: Rereview the 34 Mainland PEP conic short-answer IDs called out in the 2026-05-18 S18 QA report after the S04 source fix.
- Output type: Content QA report only; no source-data edits by S18.

## Executive Summary

Rereview result: **Pass for the P1 conic answer-key defect.**

All 34 previously affected S5/S6 conic short-answer questions now store the mathematically correct value for `p` in prompts of the form `y^2=Cx`, where `y^2=2px` implies `p=C/2`.

Production gate update: the specific P1 blocker from the 2026-05-19 president report is resolved. This rereview does not clear the separate P2 follow-ups for exp/log explanation wording, RAG retrieval tail precision, or future difficulty rebalance.

## Evidence Reviewed

- Source fix:
  - `data/mainlandPepHighQuestions.ts`
  - `lib/mainlandPepHighQuestionBank.test.ts`
- Prior finding:
  - `coordination/content-qa/2026-05-18-S18-mainland-pep-safe-bank-rag-review.md`
- Checks and extraction:
  - `npm run test:question-bank`: passed, 10/10 tests.
  - `npm run type-check`: passed.
  - Generated-data extraction from project-local compiled output confirmed all 34 IDs.

## Rereview Table

| ID | Prompt coefficient `C` | Stored answer | Expected `C/2` | Result |
| --- | ---: | ---: | ---: | --- |
| `pep-high-s5-sa-003` | 10 | 5 | 5 | Pass |
| `pep-high-s5-sa-008` | 6 | 3 | 3 | Pass |
| `pep-high-s5-sa-013` | 14 | 7 | 7 | Pass |
| `pep-high-s5-sa-018` | 10 | 5 | 5 | Pass |
| `pep-high-s5-sa-023` | 6 | 3 | 3 | Pass |
| `pep-high-s5-sa-028` | 14 | 7 | 7 | Pass |
| `pep-high-s5-sa-033` | 10 | 5 | 5 | Pass |
| `pep-high-s5-sa-038` | 6 | 3 | 3 | Pass |
| `pep-high-s5-sa-043` | 14 | 7 | 7 | Pass |
| `pep-high-s5-sa-048` | 10 | 5 | 5 | Pass |
| `pep-high-s5-sa-053` | 6 | 3 | 3 | Pass |
| `pep-high-s5-sa-058` | 14 | 7 | 7 | Pass |
| `pep-high-s5-sa-063` | 10 | 5 | 5 | Pass |
| `pep-high-s5-sa-068` | 6 | 3 | 3 | Pass |
| `pep-high-s5-sa-073` | 14 | 7 | 7 | Pass |
| `pep-high-s5-sa-078` | 10 | 5 | 5 | Pass |
| `pep-high-s5-sa-083` | 6 | 3 | 3 | Pass |
| `pep-high-s5-sa-088` | 14 | 7 | 7 | Pass |
| `pep-high-s5-sa-093` | 10 | 5 | 5 | Pass |
| `pep-high-s5-sa-098` | 6 | 3 | 3 | Pass |
| `pep-high-s6-sa-005` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-012` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-019` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-026` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-033` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-040` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-047` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-054` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-061` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-068` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-075` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-082` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-089` | 14 | 7 | 7 | Pass |
| `pep-high-s6-sa-096` | 14 | 7 | 7 | Pass |

## Spot Checks Requested By Owner

| Prompt form | Expected | Observed | Result |
| --- | ---: | ---: | --- |
| `y^2=10x` | `p=5` | 5 | Pass |
| `y^2=6x` | `p=3` | 3 | Pass |
| `y^2=14x` | `p=7` | 7 | Pass |

## Gate Decision

- The **P1 conic short-answer answer-key blocker is resolved** for the 34 known affected IDs.
- The Mainland PEP question bank may proceed past this specific production-student-release blocker after normal release checks.
- Remaining non-P1 follow-ups from the original S18 report are unchanged and should be separately assigned.

## Checks Not Run

- Browser/UI checks were not run because this was content rereview only with no frontend changes.
- `npm run audit:zh-hans:strict` was not rerun because S04 did not change Chinese prompt or explanation copy.

## Assumptions

- The formula convention remains `y^2=2px`, so `p` is half the displayed coefficient in `y^2=Cx`.
- This rereview covers only the 34 IDs listed in the original S18 P1 finding.
