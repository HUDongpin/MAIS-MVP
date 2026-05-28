# S18 Mainland High Question QA Coverage Audit

- Date: 2026-05-22
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Scope: Mainland PEP high-school S4-S6 question-bank QA coverage inventory
- Output type: Content QA coverage report only; no question-bank, API, UI, or test-source edits

## Executive Summary

Current Mainland PEP high-school question-bank inventory is **3300 questions**:

| Batch | Count | Notes |
| --- | ---: | --- |
| `seed-v1` | 900 | Original generated Mainland PEP high-school bank |
| `rag-v2` | 900 | First RAG-informed generated batch |
| `rag-v3` | 1500 | Additive RAG-informed expansion batch |
| Total | 3300 | Current full Mainland PEP high-school bank |

Coverage conclusion uses two separate definitions of "checked":

| QA definition | Checked | Not checked | Status |
| --- | ---: | ---: | --- |
| Automated quality triage | 3300 / 3300 | 0 | Full automated coverage exists in the 2026-05-21 S18 comparison report. |
| Human / targeted content review evidence | about 207 unique questions | about 3093 | Human mathematical/content QA is not complete; the 330-question queue remains the next S18 manual-review entry point. |

Official status: **automated QA has full 3300-question coverage, but human content QA has not signed off the full bank.** The safest release wording is that the bank is fully machine-triaged and partially human-reviewed.

## Historical Report Index

| Date | Report | Scope | Coverage evidence | Key outcome |
| --- | --- | --- | --- | --- |
| 2026-05-18 | `coordination/content-qa/2026-05-18-S18-mainland-pep-safe-bank-rag-review.md` | `seed-v1` Mainland PEP high-school bank plus safe RAG cards | 900-question automated structure/safety inventory; 180-question stratified manual sample | Found a P1 conic answer-key defect in 34 known IDs and P2 follow-ups for explanation wording, retrieval tail precision, and difficulty balance. |
| 2026-05-20 | `coordination/content-qa/2026-05-20-S18-conic-answer-key-rereview.md` | Targeted rereview after S04 fixed the conic answer-key defect | 34 targeted conic IDs | All 34 known conic answer-key defects passed rereview. |
| 2026-05-21 | `coordination/content-qa/2026-05-21-S18-mainland-high-seed-v1-vs-rag-v2-quality-report.md` | Automated comparison of `seed-v1` and `rag-v2` | 1800 automated scored rows; 180-question manual sample queue | `rag-v2` scored higher than `seed-v1`; final content judgment still required human sampling. |
| 2026-05-21 | `coordination/content-qa/2026-05-21-S18-mainland-high-seed-v1-vs-rag-v2-vs-rag-v3-quality-report.md` | Automated comparison of `seed-v1`, `rag-v2`, and `rag-v3` | 3300 automated scored rows; 330-question manual sample queue | `rag-v3` scored highest; no manual/blocker rows, but 108 `rag-v3` sample-review rows remain for human inspection. |
| 2026-05-21 | `coordination/session-logs/2026-05-21-S18.md` | S18 implementation and handoff log | Confirms the QA workflow covers 3300 scored rows and 330 queued samples | Explicitly states no new manual S18 math sampling was completed in that coding pass. |

## Automated QA Coverage

The latest automated coverage source is `coordination/content-qa/2026-05-21-S18-mainland-high-seed-v1-vs-rag-v2-vs-rag-v3-quality-report.json`.

| Batch | Automated rows checked | Quality | Knowledge match | Solvability | Overall | Pass | Sample review | Manual review | Blocker review |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `seed-v1` | 900 | 79.6 | 100 | 88.5 | 89.4 | 29 | 871 | 0 | 0 |
| `rag-v2` | 900 | 86.5 | 100 | 88.5 | 91.7 | 43 | 857 | 0 | 0 |
| `rag-v3` | 1500 | 99.4 | 100 | 100 | 99.8 | 1392 | 108 | 0 | 0 |
| Total | 3300 | - | - | - | - | 1464 | 1836 | 0 | 0 |

Risk flags from the same automated report:

| Batch | Main automated risk flags |
| --- | --- |
| `seed-v1` | 830 near-duplicate template clusters; 649 exact-prompt duplicates; 516 answer-not-shown-in-explanation flags |
| `rag-v2` | 820 near-duplicate template clusters; 518 answer-not-shown-in-explanation flags; 312 exact-prompt duplicates |
| `rag-v3` | 108 near-duplicate template clusters |

Automated QA answer to the owner's count question:

| Question | Count |
| --- | ---: |
| How many current Mainland high questions have been automatically checked? | 3300 |
| How many current Mainland high questions have not been automatically checked? | 0 |

## Human And Targeted Review Coverage

Known human / targeted QA evidence from existing S18 reports:

| Review source | Reviewed count | Notes |
| --- | ---: | --- |
| 2026-05-18 stratified manual sample | 180 | Sample rule reviewed IDs `001-015` and `096-100` for each grade/type in the original 900-question `seed-v1` bank. |
| 2026-05-20 conic targeted rereview | 34 | Targeted rereview of all known affected conic short-answer IDs after the source fix. |
| Overlap between the two records | -7 | The 2026-05-18 sample included 7 of the affected conic questions later rereviewed on 2026-05-20. |
| Evidence-backed unique human / targeted review coverage | about 207 | `180 + 34 - 7 = 207`. |

Human / targeted QA answer to the owner's count question:

| Question | Count |
| --- | ---: |
| How many current Mainland high questions have evidence-backed human / targeted review records? | about 207 |
| How many current Mainland high questions do not yet have human / targeted review records? | about 3093 |

This 207-question count is the evidence-backed minimum from archived reports. If other manual reviews happened outside `coordination/content-qa/` or session logs, they should be backfilled with question IDs before the count is upgraded.

## Next Manual Review Entry Point

The current next S18 manual-review input is the 330-question `sampleReviewQueue` in the 2026-05-21 three-batch report.

Recommended priority:

1. Review the 108 `rag-v3` rows marked `sample-review`, because `rag-v3` is the newest 1500-question expansion and has not yet received separate human math sampling.
2. Review `seed-v1` and `rag-v2` rows flagged for repeated templates, exact-prompt duplicates, and answer-not-shown-in-explanation.
3. Deduplicate the 330-question queue against the 207 evidence-backed historical human / targeted review records before reporting new manual coverage.
4. For each future reviewed row, record `questionId`, batch, grade, topic, type, decision, issue category, severity, and whether it blocks student-facing release.

## Checks

Read-only verification performed during this audit:

| Check | Result |
| --- | --- |
| Parsed latest three-batch JSON report | Passed: `rows = 3300`, `sampleReviewQueue = 330`, batch counts are `900 / 900 / 1500`. |
| Source-data / app-code changes | None. |

Code checks were not run because this is a documentation-only content QA coverage report.

## Assumptions

- "Checked" is split into automated triage coverage and human / targeted content-review evidence.
- This audit covers only Mainland PEP high-school S4-S6 questions, not Hong Kong questions or other curriculum tracks.
- The 207 human / targeted coverage figure is evidence-backed from existing reports, not a claim that no other informal review occurred.
- The automated scorer is a triage tool and does not replace S18 human mathematical correctness review.
