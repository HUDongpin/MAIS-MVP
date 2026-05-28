# Mainland PEP S3 Paper-Pattern Safe-RAG Verification

- Date: 2026-05-23
- Session ID: S18
- Scope: Safe absorption of local `9上初中数学试卷.zip` and `9下初中数学试卷.zip` as aggregated S3 upper/lower paper-pattern RAG guidance.
- Verdict: Implemented as safe abstraction plus local metadata manifest. No source document body text, answer wording, worked-response wording, tables, figures, OCR output, page images, embeddings, source entry paths, or source item wording were committed.

## Executive Summary

- Generated an ignored local metadata-only manifest under `.local/rag/mainland-pep-junior-s3-papers/`.
- Strengthened the junior paper manifest script to recognize S3 chapter signals.
- Added 12 committed S3 paper-pattern safe cards: 6 for S3 upper and 6 for S3 lower.
- Extended deterministic junior paper-pattern retrieval tests and unified MAINLAND_PEP evidence-pack checks so S3 now surfaces `juniorPaperPatternCards`.
- Preserved separation from P1-P6, S1-S2, S4-S6, AI Tutor provider behavior, backend/API code, and app UI.

## Local Manifest Result

The local manifest is not a committed source artifact.

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Files manifested | 864 |
| Total uncompressed bytes | 647,639,393 |
| Expected S3 upper coverage | 639 |
| Expected S3 lower coverage | 223 |
| Expected slots complete | true |
| Ignored visible files | 0 |
| Files with answer label | 593 |
| Files with solution label | 295 |

Extension counts: `.doc` 440, `.docx` 417, `.pdf` 7.

Source role counts: `answer` 460, `solution` 181, `answer-solution` 114, `paper` 109.

Unit-signal counts after S3 script expansion: `unknown` 292, `二次函数` 148, `一元二次方程` 120, `圆` 109, `旋转` 70, `相似` 54, `概率初步` 45, `反比例函数` 37, `三角形` 36, `锐角三角函数` 36, `投影与视图` 31, plus smaller cross-scope signals.

The manifest also reported 2 S2 upper entries inside the S3 upper archive. These were not committed into public RAG data; they should be treated as either package noise or filename-classification noise during any future manual source audit.

## Implementation Notes

- Public safe-card data is in `data/rag/mainlandPepJuniorPaperPatterns.ts`.
- Retrieval logic was already generalized for S1-S3 in `lib/rag/mainlandPepJuniorPaperPatterns.ts`; no new retrieval architecture was needed.
- Unified MAINLAND_PEP evidence-pack wiring in `lib/rag/mainlandPep.ts` already allowed S3 junior paper-pattern queries, so this implementation only needed data and test expansion.
- The manifest script remains metadata-only and now recognizes S3 chapter/unit signals.
- `package.json` already had `rag:mainland-pep-junior-paper-manifest` and `test:rag` coverage, so no package-script change was required.

## S3 Safe Cards Added

S3 upper:

- `pep-junior-s3-upper-paper-quadratic-equations`
- `pep-junior-s3-upper-paper-quadratic-functions`
- `pep-junior-s3-upper-paper-rotation-transformations`
- `pep-junior-s3-upper-paper-circle-geometry`
- `pep-junior-s3-upper-paper-probability-introduction`
- `pep-junior-s3-upper-paper-integrated-review`

S3 lower:

- `pep-junior-s3-lower-paper-inverse-functions`
- `pep-junior-s3-lower-paper-similarity`
- `pep-junior-s3-lower-paper-right-triangle-trigonometry`
- `pep-junior-s3-lower-paper-projection-views`
- `pep-junior-s3-lower-paper-function-geometry-integrated`
- `pep-junior-s3-lower-paper-graduation-review`

## Safety Boundary

Committed cards store only abstract metadata and guidance: grade, semester, unit titles, concept tags, competency tags, skill tags, item-type tags, difficulty band, pattern summaries, strategy tags, misconception tags, generation guidance, and reuse restrictions.

Committed cards do not store source papers, document body text, answer text, worked responses, scoring language, tables, figures, OCR output, page images, embeddings, page locators, source archive entry paths, or recognizable paper layouts.

Future student-facing questions, tutor explanations, diagnostics, or teacher assessments generated from these cards still require S18 review for:

- mathematical correctness
- Mainland PEP S3 grade/semester fit
- Simplified Chinese mathematics terminology
- source distance and originality
- appropriate difficulty and cognitive demand

## Checks

- Passed: `python3 scripts/build-mainland-pep-junior-paper-manifest.py --self-test`
- Passed: `npm run rag:mainland-pep-junior-paper-manifest -- --expected-slot S3:upper --expected-slot S3:lower --out-dir .local/rag/mainland-pep-junior-s3-papers <9上 zip> <9下 zip>`
- Passed: `npm run test:rag`
  - Result: 74/74 RAG tests passed, including the new S3 junior paper-pattern retrieval, semester separation, unified helper parity, evidence-pack layering, and source-artifact safety checks.
- Passed: `NODE_OPTIONS=--max-old-space-size=6144 npm run type-check`

## Remaining Risk

- The local archive contains many answer/solution-labeled files. This is safe at the current abstraction layer, but future generation must not reuse answer or solution wording.
- The 9上 archive has 2 files classified as S2 upper by metadata heuristics. Future manual source QA should confirm whether these are true cross-grade files or filename-classification noise.
- A large share of entries still has `unknown` unit signals because metadata-only filename analysis is intentionally conservative and does not inspect document body text.
- This implementation is RAG-safe support data only; it is not a student-facing question bank.
