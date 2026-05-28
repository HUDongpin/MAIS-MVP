# Mainland BNU S1 Junior RAG Verification

- Date: 2026-05-26
- Session ID: S18
- Scope: BNU S1 upper/lower junior-secondary textbook safe RAG
- Status: Implemented as safe abstraction cards and local-only metadata tooling

## Summary

S18 safely absorbed the owner-provided Beijing Normal University Press Grade 7 upper/lower mathematics PDFs into MAIS as S1 junior-secondary textbook-sequencing safe abstraction evidence. No source PDF, source filename, source path, extracted body text, OCR text, answer wording, worked response, page image, page locator, hash, or embedding payload was committed.

The current worktree already contained BNU junior S2/S3 safe cards. This task added the requested S1 upper/lower layer and preserved the existing S2/S3 coverage.

## Local Manifest Result

The ignored local manifest was generated under `.local/rag/mainland-bnu-junior/`.

| Metric | Result |
| --- | ---: |
| Files inspected | 2 |
| Complete S1 upper/lower coverage | Yes |
| Known page totals | 2 |
| Upper volume pages | 207 |
| Lower volume pages | 180 |
| Text-layer missing files | 2 |
| Source filenames persisted | No |
| Source paths persisted | No |
| Hashes persisted | No |
| Body text persisted | No |
| OCR text persisted | No |
| Page images persisted | No |
| Source locators persisted | No |
| Embedding payloads persisted | No |

Because both PDFs are scanned/image-based for the sampled text-layer check, any deeper content review must remain local-private unless the owner separately approves a controlled OCR or extraction workflow.

## Committed Safe Cards

The BNU junior textbook RAG layer now includes S1 safe cards for:

- S1 upper: spatial figures, rational numbers, algebraic expressions, plane figures, one-variable linear equations, and data collection/organization.
- S1 lower: polynomial multiplication/division, intersecting and parallel lines, triangles, variable relationships, axis symmetry, and introductory probability.

The cards contain only broad unit labels, concept IDs, competency tags, skill tags, safe summaries, misconception tags, original MAIS generation guidance, and reuse restrictions. They are not a textbook replica, question bank, lesson body, answer key, page map, or exercise-pattern reconstruction.

## Safety Review

The committed RAG data and evidence text were checked against forbidden source-artifact patterns including local user paths, download/source labels, source-path fields, hashes, page-count leakage, OCR/body-text markers, source locator wording, embedding payload references, answer-key wording, and source-material labels.

The local manifest safety scan confirmed source filenames, source paths, hashes, body text, OCR text, page images, source locators, and embedding payloads are all absent from persisted entries. Local manifest metadata remains ignored and must not be copied into committed evidence packs.

## Verification

- Passed: `python3 scripts/build-mainland-bnu-junior-manifest.py --self-test`
- Passed: local metadata-only S1 manifest run against the two owner-provided PDFs
- Passed: local manifest safety scan for source filenames, source paths, hashes, body text, OCR text, page images, source locators, and embedding payloads
- Passed: committed BNU junior RAG data/helper source-artifact scan
- Passed: `npm run test:rag` with 195/195 tests passing
- Passed: `npm run type-check`
- Passed: `npm run build`

## Risks And Boundaries

- This work does not open BNU S1 student-facing practice, lessons, AI Tutor runtime behavior, or adaptive recommendations.
- Any future generated BNU S1 questions or lessons must be MAIS-original and pass separate S18 source-distance, mathematical correctness, and grade-fit QA before S04/S05/S07/S15 integration.
- Cloud OCR, SimpleTex, live LLM extraction, source-text vectorization, page-referenced tutoring, or original exercise recall are out of scope unless the owner authorizes a separate controlled plan.
