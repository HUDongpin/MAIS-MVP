# S18 Mainland HJB P1 Upper Assessment Safe-RAG Verification

- Date: 2026-05-24
- Session ID: S18
- Scope: Owner-provided Shanghai Education Press / HuJiaoBan Grade 1 upper unit-test and midterm/final assessment archives
- Inputs inspected locally: owner-provided unit-test archive; owner-provided midterm/final archive
- Output mode: safe abstraction cards plus ignored local metadata manifest

## Summary

Implemented a metadata-only and source-distant safe-RAG intake for `MAINLAND_HJB` P1 upper assessment support.

The committed RAG layer contains eight aggregated assessment-pattern cards. It does not contain source archives, source paths, extracted document text, source item wording, answer text, worked-solution text, page images, OCR output, page locators, embeddings, or A3/A4 layout variants.

## Local Manifest Result

Command run:

```bash
npm run rag:mainland-hjb-primary-assessment-manifest -- "<unit-test-zip>" "<midterm-final-zip>" --expected-slot P1:upper
```

Local ignored output:

- `.local/rag/mainland-hjb-primary-assessments/manifest.json`
- `.local/rag/mainland-hjb-primary-assessments/qa-report.md`

Manifest totals:

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Effective files inspected | 138 |
| Uncompressed bytes | 307,052,507 |
| Expected slot coverage | P1:upper = 138 |
| Missing expected slots | 0 |
| Duplicate variant groups | 26 |
| Max duplicate variant group size | 8 |
| Legacy/reference-only local quarantine entries | 12 |
| Entries requiring S18 review before production generation | 73 |

File format counts:

| Extension | Count |
| --- | ---: |
| `.doc` | 40 |
| `.docx` | 92 |
| `.pdf` | 6 |

Source-role counts:

| Role | Count |
| --- | ---: |
| student-assessment | 75 |
| answer-or-solution | 55 |
| document | 8 |

Primary assessment-family counts:

| Family | Count |
| --- | ---: |
| unit-test | 30 |
| midterm | 36 |
| final | 72 |

Assessment signal counts:

| Signal | Count |
| --- | ---: |
| unit-test | 30 |
| midterm | 36 |
| final | 72 |
| topic-drill | 105 |
| comprehensive | 56 |

Safety sanity checks:

- Passed: all entries classified as `P1:upper`.
- Passed: all body/answer/worked-solution/OCR/page-image/source-locator/embedding persisted-content flags are false.
- Passed: local manifest entries do not store full local source paths.
- Passed: duplicate A3/A4/student/response-support variants are summarized as groups, not committed as separate RAG cards.
- Passed: 12 legacy/reference-only entries remain local-quarantined metadata and do not drive committed cards.

## Committed Safe Cards

The committed assessment-pattern layer adds eight cards:

- `hjb-primary-p1-upper-assessment-school-readiness`
- `hjb-primary-p1-upper-assessment-solid-shapes`
- `hjb-primary-p1-upper-assessment-within-10-number-sense`
- `hjb-primary-p1-upper-assessment-within-10-add-sub`
- `hjb-primary-p1-upper-assessment-within-20-number-sense`
- `hjb-primary-p1-upper-assessment-within-20-add-sub`
- `hjb-primary-p1-upper-assessment-midterm-integrated`
- `hjb-primary-p1-upper-assessment-final-oral-calculation-integrated`

These cards are safe abstractions: broad assessment family, concept coverage, competency tags, item-type patterns, misconception tags, and original MAIS generation guidance only.

## Gate Decision

Status: Accepted for MAIS safe-RAG evidence only.

Not approved for direct public question-bank launch, source assessment reconstruction, lesson publishing, adaptive recommendation launch, or AI Tutor student-facing generation without a separate S18 source-distance/content QA pass.

## Checks

- Passed: `npm run rag:mainland-hjb-primary-assessment-manifest -- --self-test`
- Passed: local manifest run against the two owner-provided archives
- Passed: `npm run test:rag` with 136/136 node tests passing after all manifest self-tests
- Passed: `npm run type-check`
- Not run: `npm run build`; this was a RAG/tooling/type/test/data-only change and the owner test plan did not require a production app build.
