# Mainland BNU P4 Primary RAG Verification

- Date: 2026-05-26
- Session ID: S18
- Scope: BNU P4 upper/lower textbook safe RAG
- Status: Implemented as safe abstraction cards and local-only metadata tooling

## Summary

S18 safely absorbed the owner-provided Beijing Normal University Press Grade 4 upper and lower primary mathematics PDFs into MAIS as textbook-sequencing safe abstraction evidence. No source PDF, source filename, source path, extracted body text, OCR text, answer wording, worked response, page image, page locator, hash, or embedding payload was committed.

## Local Manifest Result

The ignored local manifest was generated under `.local/rag/mainland-bnu-primary-p4/`.

| Metric | Result |
| --- | ---: |
| Files inspected | 2 |
| Complete P4 upper/lower coverage | Yes |
| Known page counts | 2 |
| Text-layer missing files | 2 |
| Missing slots | 0 |
| Duplicate slots | 0 |
| Unknown slots | 0 |
| Forbidden source/payload fields present | 0 |
| Source names or paths present | No |

Because both PDFs are scanned/image-based for the sampled text-layer check, any future deeper content review must remain local-private unless the owner separately approves a controlled OCR or extraction workflow.

## Committed Safe Cards

The BNU primary textbook RAG layer now includes P4 upper/lower safe cards for:

- P4 upper: large numbers, lines and angles, multi-digit multiplication, operation laws, direction and position, division with two-digit divisors, negative numbers, probability, and integrated review/activity support.
- P4 lower: decimal meaning and addition/subtraction, triangles and quadrilaterals, decimal multiplication, object views, equation introduction, data representation/analysis, and integrated review/activity support.

The cards contain only broad unit labels, concept IDs, competency tags, skill tags, safe summaries, misconception tags, original MAIS generation guidance, and reuse restrictions. They are not a textbook replica, question bank, lesson body, answer key, page map, or exercise-pattern reconstruction.

## Safety Review

The committed RAG data and evidence text were checked by the RAG test suite against forbidden source-artifact patterns including local user paths, download labels, source-path fields, source filenames, hashes, page-count leakage, OCR/body-text markers, source locator wording, embedding payload references, answer-key wording, and source-material labels.

The local manifest safety scan confirmed persisted source names/paths and forbidden body text, OCR text, page image, source locator, and embedding payload fields are absent. Local manifest metadata remains ignored and must not be copied into committed evidence packs.

## Verification

- Passed: `python3 -m py_compile scripts/build-mainland-bnu-primary-manifest.py`
- Passed: `python3 scripts/build-mainland-bnu-primary-manifest.py --self-test`
- Passed: local metadata-only P4 manifest run against the two owner-provided PDFs
- Passed: local manifest safety scan for source names/paths and forbidden source/payload fields
- Passed: `npm run test:rag` with 175/175 tests passing
- Passed: `npm run type-check`

## Risks And Boundaries

- This work does not open BNU P4 student-facing practice, lessons, AI Tutor runtime behavior, or adaptive recommendations.
- Any future generated BNU P4 questions or lessons must be MAIS-original and pass separate S18 source-distance, mathematical correctness, and grade-fit QA before S04/S05/S07/S15 integration.
- Cloud OCR, SimpleTex, live LLM extraction, source-text vectorization, page-referenced tutoring, or original exercise recall are out of scope unless the owner authorizes a separate controlled plan.
