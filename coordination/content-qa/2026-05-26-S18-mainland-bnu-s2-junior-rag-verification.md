# Mainland BNU S2 Junior RAG Verification

- Date: 2026-05-26
- Session ID: S18
- Scope: BNU S2 upper/lower junior-secondary textbook safe RAG
- Status: Implemented as safe abstraction cards and local-only metadata tooling

## Summary

S18 safely absorbed the owner-provided Beijing Normal University Press Grade 8 upper/lower mathematics PDFs into MAIS as S2 junior-secondary textbook-sequencing safe abstraction evidence. No source PDF, source identifier, protected page content, answer material, page image, page locator, checksum, or vector payload was committed.

The current worktree also includes BNU junior S1/S3 safe cards from parallel local work. This QA report validates only the S2 upper/lower coverage requested in this task.

## Local Manifest Result

The ignored local manifest was generated under `.local/rag/mainland-bnu-junior-s2/`.

| Metric | Result |
| --- | ---: |
| Files inspected | 2 |
| Complete S2 upper/lower coverage | Yes |
| Known page counts | 2 |
| Aggregate pages | 404 |
| Text-layer present files | 0 |
| Text-layer partial files | 1 |
| Text-layer missing files | 1 |
| Missing slots | 0 |
| Duplicate slots | 0 |
| Unknown slots | 0 |
| Forbidden source or payload fields present | 0 |
| Source identifiers persisted | No |

Because one sampled volume has only partial text-layer availability and one has no sampled text layer, any deeper content review must remain local-private unless the owner separately approves a controlled extraction workflow.

## Committed Safe Cards

The BNU junior textbook RAG layer includes S2 safe cards for:

- S2 upper: 勾股定理; 实数; 位置与坐标; 一次函数; 二元一次方程组; 数据的分析.
- S2 lower: 三角形的证明及其应用; 不等式与不等式组; 图形的平移与旋转; 因式分解; 分式与分式方程; 平行四边形.

The cards contain only broad unit labels, concept IDs, competency tags, skill tags, safe summaries, misconception tags, original MAIS generation guidance, and reuse restrictions. They are not a textbook replica, question bank, lesson body, answer key, page map, or exercise-pattern reconstruction.

## Safety Review

The committed RAG data and evidence text were checked against forbidden source-artifact patterns including local user paths, download/source labels, source-path fields, page-count leakage, machine-text markers, source-locator wording, vector payload references, answer-key wording, and source-material labels.

The local manifest safety scan confirmed source identifiers, protected page content, answer material, page images, page anchors, checksums, and vector data are absent from persisted entries. Local manifest metadata remains ignored and must not be copied into committed evidence packs.

## Verification

- Passed: `python3 -m py_compile scripts/build-mainland-bnu-junior-manifest.py`
- Passed: `python3 scripts/build-mainland-bnu-junior-manifest.py --self-test`
- Passed: local metadata-only S2 manifest run against the two owner-provided PDFs
- Passed: local manifest safety scan for source identifiers and forbidden source/payload fields
- Passed: committed BNU junior RAG data/helper source-artifact scan through `npm run test:rag`
- Passed: `npm run test:rag` with 195/195 tests passing
- Passed: `npm run type-check`
- Passed: `npm run build`

## Risks And Boundaries

- This work does not open BNU S2 student-facing practice, lessons, AI Tutor runtime behavior, or adaptive recommendations.
- Any future generated BNU S2 questions or lessons must be MAIS-original and pass separate S18 source-distance, mathematical correctness, and grade-fit QA before S04/S05/S07/S15 integration.
- Cloud OCR, SimpleTex, live LLM extraction, source-text vectorization, page-referenced tutoring, or original exercise recall are out of scope unless the owner authorizes a separate controlled plan.
