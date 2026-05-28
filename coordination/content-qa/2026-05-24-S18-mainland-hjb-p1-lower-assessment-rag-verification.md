# S18 Mainland HJB P1 Lower Assessment Safe-RAG Verification

- Date: 2026-05-24
- Session ID: S18
- Scope: Owner-provided Shanghai Education Press / HJB Grade 1 lower unit-test and midterm/final assessment archives
- Output mode: safe abstraction cards plus ignored local metadata manifest

## Summary

Implemented a metadata-only and source-distant safe-RAG intake for `MAINLAND_HJB` P1 lower assessment support.

The committed RAG layer contains seven aggregated assessment-pattern cards. It does not contain source archives, source paths, source member names, source file names, extracted document text, OCR text, source item wording, answer text, worked-solution text, page images, page locators, tables, figures, or embedding payloads.

## Local Manifest Result

Command run:

```bash
npm run rag:mainland-hjb-primary-assessment-manifest -- --out-dir .local/rag/mainland-hjb-primary-p1-lower-assessments --expected-slot P1:lower "<unit-test-zip>" "<midterm-final-zip>"
```

Local ignored output:

- `.local/rag/mainland-hjb-primary-p1-lower-assessments/manifest.json`
- `.local/rag/mainland-hjb-primary-p1-lower-assessments/qa-report.md`

Manifest totals:

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Metadata entries | 73 |
| Expected slot coverage | `P1:lower = 73` |
| Missing expected slots | 0 |
| Legacy/reference-only local entries | 25 |
| Entries requiring S18 review before stronger production claims | 43 |

File format counts:

| Extension | Count |
| --- | ---: |
| `.docx` | 32 |
| `.doc` | 41 |

Primary assessment-family counts:

| Family | Count |
| --- | ---: |
| unit-test | 35 |
| midterm | 28 |
| final | 10 |

Assessment signal counts:

| Signal | Count |
| --- | ---: |
| unit-test | 51 |
| midterm | 28 |
| final | 10 |
| topic-drill | 41 |
| comprehensive | 65 |

Coarse document-role counts:

| Role | Count |
| --- | ---: |
| student-assessment | 32 |
| answer-or-solution | 40 |
| document | 1 |

## Safety Sanity Checks

- Passed: all entries classify to `P1:lower`.
- Passed: output remains under ignored `.local/`.
- Passed: manifest entries store hashes, sizes, extension, decoding status, coarse family/unit classification, role, legacy-review flags, and duplicate grouping only.
- Passed: strict field scan found no source-path, source/member/file-name, body-text, OCR, page-image, page-locator, embedding, extracted-text, answer-text, or worked-solution-text fields.
- Passed: no source ZIPs, source documents, source content, extracted text, or embeddings were committed.
- Passed: legacy/reference entries are local metadata only and do not drive a separate production claim.

## Committed Safe Cards

The committed assessment-pattern layer adds seven P1 lower cards:

- `hjb-primary-p1-lower-assessment-within-20-regrouping`
- `hjb-primary-p1-lower-assessment-within-100-number-sense`
- `hjb-primary-p1-lower-assessment-time-introduction`
- `hjb-primary-p1-lower-assessment-within-100-add-sub`
- `hjb-primary-p1-lower-assessment-length-measurement`
- `hjb-primary-p1-lower-assessment-midterm-1-to-4-integrated`
- `hjb-primary-p1-lower-assessment-final-integrated`

These cards contain broad unit titles, concept IDs, competency tags, skill and item-type tags, misconception tags, pattern summaries, original generation guidance, and reuse restrictions only.

## Retrieval Verification

- P1 lower unit queries retrieve the corresponding lower assessment card.
- `assessmentFamily: "midterm"` retrieves the 1-4 unit midterm integrated card.
- `assessmentFamily: "final"` and concept-only final-review queries retrieve the final integrated card.
- `tutor-explain` does not pull the assessment-pattern layer.
- Assessment-like intents pull the assessment-pattern layer.
- HJB P1 lower assessment cards do not pollute PEP primary retrieval.
- A narrow retrieval score adjustment keeps broad midterm/final cards from outranking specific unit cards when the query does not explicitly ask for midterm/final material.

## Gate Decision

Status: Accepted for MAIS safe-RAG evidence only.

Not approved for direct public question-bank launch, source assessment reconstruction, source answer-key reuse, adaptive recommendation launch, or AI Tutor student-facing generation without a separate S18 source-distance/content QA pass on generated outputs.

## Checks

- Passed: `python3 scripts/build-mainland-hjb-primary-assessment-manifest.py --self-test`
- Passed: local manifest run against the two owner-provided archives
- Passed: strict manifest field scan for forbidden payload/path/name fields
- Passed: `npm run test:rag` with 140/140 node tests passing after all manifest self-tests
- Passed: `npm run type-check`
- Passed: `npm run build`

## Residual Risks

- `.doc` entries and legacy/reference-only entries need S18 version review before stronger production claims.
- The final integrated card is intentionally broad; it must not be interpreted as source-paper sequence, weighting, wording, layout, or answer-support evidence.
