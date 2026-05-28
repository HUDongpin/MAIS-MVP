# Mainland BNU P5 Primary RAG Verification

- Date: 2026-05-26
- Session ID: S18
- Scope: BNU P5 upper/lower textbook safe RAG
- Status: Implemented as safe abstraction cards and local-only metadata tooling

## Summary

S18 safely absorbed the owner-provided Beijing Normal University Press Grade 5 upper and lower primary mathematics PDFs into MAIS as textbook-sequencing safe abstraction evidence. No source PDF, source filename, source path, extracted body text, OCR text, answer wording, worked response, page image, page locator, hash, or embedding payload was committed.

## Local Manifest Result

The ignored local manifest was generated under `.local/rag/mainland-bnu-primary-p5/`.

| Metric | Result |
| --- | ---: |
| Files inspected | 2 |
| Complete P5 upper/lower coverage | Yes |
| Known page counts | 2 |
| Upper volume page count | 124 |
| Lower volume page count | 110 |
| Text-layer missing files | 2 |
| Body text persisted | No |
| OCR text persisted | No |
| Page images persisted | No |
| Source locators persisted | No |
| Embedding payloads persisted | No |

Because both PDFs are scanned/image-based for the sampled text-layer check, any future deeper content review must remain local-private unless the owner separately approves a controlled OCR or extraction workflow.

## Committed Safe Cards

The BNU primary textbook RAG layer now includes P5 upper/lower safe cards for:

- P5 upper: decimal division, symmetry/translation, factors/multiples, polygon area, fraction meaning, composite area, probability, and integrated review/activity support.
- P5 lower: fraction addition/subtraction, cuboid/cube surface reasoning, fraction multiplication, cuboid/cube volume/capacity reasoning, fraction division, position, equation problem solving, data representation/analysis, and integrated review/activity support.

The cards contain only broad unit labels, concept IDs, competency tags, skill tags, safe summaries, misconception tags, original MAIS generation guidance, and reuse restrictions. They are not a textbook replica, question bank, lesson body, answer key, page map, or exercise-pattern reconstruction.

## Safety Review

The committed RAG data and evidence text were checked by the RAG test suite against forbidden source-artifact patterns including local user paths, download labels, source-path fields, hashes, page-count leakage, OCR/body-text markers, source locator wording, embedding payload references, answer-key wording, and source-material labels.

The local manifest safety scan confirmed persisted body text, OCR text, page images, source locators, and embedding payloads are all disabled. Local manifest metadata remains ignored and must not be copied into committed evidence packs.

## Verification

- Passed: `python3 scripts/build-mainland-bnu-primary-manifest.py --self-test`
- Passed: local metadata-only P5 manifest run against the two owner-provided PDFs
- Passed: local manifest safety scan for body text, OCR text, page images, source locators, and embedding payloads
- Passed: `npm run test:rag` with 173/173 tests passing
- Passed: `npm run type-check`
- Not passed: `npm run build` compiled successfully on the first attempt but failed during prerender module lookup for existing `/classroom/join` and `/api/teacher/dashboard` routes; a second attempt hung while existing Next dev servers were active against the same project output and was stopped without changing route code.

## Risks And Boundaries

- This work does not open BNU P5 student-facing practice, lessons, AI Tutor runtime behavior, or adaptive recommendations.
- Any future generated BNU P5 questions or lessons must be MAIS-original and pass separate S18 source-distance, mathematical correctness, and grade-fit QA before S04/S05/S07/S15 integration.
- Cloud OCR, SimpleTex, live LLM extraction, source-text vectorization, page-referenced tutoring, or original exercise recall are out of scope unless the owner authorizes a separate controlled plan.
