# Mainland HJB P2 Lower Paper Safe-RAG Verification

- Date: 2026-05-24
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Artifact status: Accepted for MAIS safe-RAG evidence use only

## Scope

This review covers two owner-provided local Shanghai Education Press / HuJiaoBan Grade 2 lower primary mathematics assessment archives. The implementation absorbs only metadata-derived, aggregated assessment-pattern cards into the `MAINLAND_HJB` primary RAG layer.

No raw assessment item, support wording, document body text, machine-extracted text, page image, page locator, source member path, archive filename, or embedding payload is committed.

## Local Manifest Result

The new metadata-only paper manifest wrote ignored local outputs under `.local/rag/mainland-hjb-primary-p2-lower-papers/`.

Manifest totals:

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Files manifested | 82 |
| Aligned P2 lower files | 78 |
| Quarantined files | 4 |
| Total manifested bytes | 84,097,595 |
| Target signals complete | true |
| Manual-review queue | 4 |

Aggregate source-role counts:

| Role | Count |
| --- | ---: |
| student-assessment | 64 |
| answer-or-solution-support | 18 |

Aggregate assessment-family counts:

| Family | Count |
| --- | ---: |
| unit-test | 76 |
| comprehensive | 36 |
| midterm | 31 |
| final | 29 |
| topic-drill | 18 |

Target signal coverage:

| Signal | Count |
| --- | ---: |
| 表内除法 | 7 |
| 时间 | 13 |
| 万以内数 | 13 |
| 两三位数加减 | 7 |
| 专项诊断 | 9 |
| 数学广场与整理复习 | 16 |
| 期中综合 | 31 |
| 期末综合 | 29 |

## Committed Safe Cards

The committed RAG layer adds eight P2 lower assessment-pattern cards:

- `hjb-primary-p2-lower-assessment-division-facts`
- `hjb-primary-p2-lower-assessment-time`
- `hjb-primary-p2-lower-assessment-within-10000-number-sense`
- `hjb-primary-p2-lower-assessment-two-three-digit-add-sub`
- `hjb-primary-p2-lower-assessment-oral-fill-application-diagnostics`
- `hjb-primary-p2-lower-assessment-math-square-review`
- `hjb-primary-p2-lower-assessment-midterm-integrated`
- `hjb-primary-p2-lower-assessment-final-integrated`

These cards store only broad assessment families, concept coverage, competency tags, item-type patterns, misconception tags, and original MAIS generation guidance.

## Gate Decision

Accepted for safe RAG evidence only.

Permitted use:

- AI Tutor and future content-generation tooling may use these cards as source-distant guidance for original MAIS explanations, diagnostics, assessment planning, and draft generation.

Not approved in this pass:

- Direct public question-bank launch.
- Reconstruction of source assessments or support materials.
- Raw document retrieval, page-level retrieval, or source-member lookup.
- Student-facing generated questions without a separate S18 source-distance and math-quality review.

## Checks

- Passed: `python3 scripts/build-mainland-hjb-primary-paper-manifest.py --self-test`
- Passed: local metadata-only manifest run for the two owner-provided archives
- Passed: manifest safety scan for source path/name and source wording sentinels
- Passed: `npm run test:rag` with 136/136 tests
- Passed: `npm run type-check`
- Passed: `npm run build`
