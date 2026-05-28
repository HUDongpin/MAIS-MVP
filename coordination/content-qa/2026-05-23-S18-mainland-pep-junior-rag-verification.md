# Mainland PEP Junior Safe-RAG Verification

- Date: 2026-05-23
- Session ID: S18
- Scope: People's Education Press junior-secondary mathematics S1-S3 upper/lower textbook safe RAG ingestion, local metadata manifest, unified `MAINLAND_PEP` retrieval, and RAG gate coverage.
- Verdict: PASS for safe-abstraction RAG implementation. Student-facing content generation still requires S18 manual sampling before broad promotion.

## Executive Summary

- Implemented a metadata-only local manifest script for six owner-provided junior PEP math PDFs.
- Added committed S1-S3 junior-secondary safe-abstraction RAG cards in `data/rag/mainlandPepJunior.ts`.
- Extended unified Mainland PEP retrieval so P1-P6, S1-S3, and S4-S6 remain stage-separated.
- Expanded `npm run test:rag` so S1/S2/S3 junior queries and safety scans are covered by the RAG gate.

## Local Manifest Result

The local ignored manifest was generated under `.local/rag/mainland-pep-junior/` and is not a committed source artifact.

| Slot | File | Status |
| --- | --- | --- |
| S1 upper | 人教版七年级上册电子课本.pdf | metadata captured |
| S1 lower | 人教版七年级下册电子课本.pdf | metadata captured |
| S2 upper | 人教版八年级上册电子课本.pdf | metadata captured; coarse page-count marker missing |
| S2 lower | 人教版八年级下册电子课本.pdf | metadata captured |
| S3 upper | 人教版九年级上册电子课本.pdf | metadata captured |
| S3 lower | 人教版九年级下册电子课本.pdf | metadata captured |

- Coverage: complete S1-S3 upper/lower, 6/6 observed, no missing slots, no duplicates.
- Total local source bytes: 217,439,333.
- Safety flags: `bodyTextPersisted=false`, `ocrTextPersisted=false`, `pageImagesPersisted=false`, `sourceLocatorsPersisted=false` for every entry.

## Safety Boundary

No PDF textbooks, OCR dumps, body text, exercises, worked examples, answer text, tables, illustrations, page images, page-level notes, source locators, or embeddings were committed.

The committed layer stores only abstract curriculum cards: grade, semester, unit-title cluster, concept IDs, competency tags, skill tags, misconception tags, safe summaries, generation guidance, and reuse restrictions.

Future student-visible explanations, lessons, diagnostics, or questions must be MAIS-authored and reviewed separately for mathematical correctness, grade fit, Simplified Chinese terminology, and source distance.

## Retrieval Coverage

Representative queries covered by the RAG tests:

| Query | Expected stage |
| --- | --- |
| S1 `有理数` | junior-secondary |
| S1 `一元一次方程` | junior-secondary |
| S2 `三角形` | junior-secondary |
| S2 `一次函数` | junior-secondary |
| S3 `二次函数` | junior-secondary |
| S3 `圆` | junior-secondary |

The same tests confirm S1-S3 queries do not return primary cards or S4-S6 high-school compatibility cards.

## Checks

- Passed: `npm run test:rag`
  - Included the new junior manifest self-test.
  - Included TypeScript RAG compile.
  - Node RAG tests passed: 64/64.
- Passed: `npm run type-check`
- Passed: `npm run rag:mainland-pep-junior-manifest -- <six local PDF paths>`
  - Generated ignored local metadata only under `.local/rag/mainland-pep-junior/`.

## Remaining Risk

The safe cards are broad S18 curriculum abstractions. Before using them to launch junior-secondary generated lessons or question banks, S18 should manually sample generated outputs for source distance, mathematical correctness, terminology, and age-level appropriateness.
