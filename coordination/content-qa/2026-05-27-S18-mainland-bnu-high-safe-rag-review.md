# Mainland BNU High-School Safe RAG Review

- Date: 2026-05-27
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Status: Implemented as source-safe abstraction cards and local-only metadata tooling

## Summary

Implemented the Mainland Beijing Normal University Press high-school safe RAG foundation for the four owner-provided senior-secondary textbook volumes. The product-facing layer contains safe abstraction cards only: volume, chapter, grade/semester scope, concept tags, competency tags, item-design tags, misconception tags, safe summaries, original generation guidance, and reuse restrictions.

No source PDF, source filename, source path, checksum value, extracted body text, exercise wording, response material, worked-response wording, page image, page anchor, table body, figure body, or embedding payload was committed.

## Local Manifest Result

The ignored local manifest was generated under `.local/rag/mainland-bnu-high/`.

| Metric | Result |
| --- | ---: |
| Files inspected | 4 |
| Total pages | 879 |
| Complete four-volume v1 coverage | Yes |
| Text-layer missing files | 4 |
| Text-layer present files | 0 |
| Safe draft chapter slots | 23 |

Because all four files are scan-like for the sampled text-layer check, deeper extraction should remain local-private unless the owner separately approves a controlled OCR workflow.

## Product-Facing Safe Cards

Committed BNU high-school safe cards now cover:

- 必修 第一册: 预备知识, 函数, 指数运算与指数函数, 对数运算与对数函数, 函数应用, 统计, 概率, 数学建模活动（一）.
- 必修 第二册: 三角函数, 平面向量及其应用, 数学建模活动（二）, 三角恒等变换, 复数, 立体几何初步.
- 选择性必修 第一册: 直线与圆, 圆锥曲线, 空间向量与立体几何, 数学建模活动（三）, 计数原理, 概率, 统计案例.
- 选择性必修 第二册: 数列, 导数及其应用.

The evidence pack keeps BNU, PEP, and HJB publisher layers isolated. Tutor explanation uses BNU textbook safe cards only; assessment-like intents may add available BNU assessment-pattern cards and the shared Mainland senior-secondary exam-pattern layer, still as source-distant guidance.

## Safety Review

- Passed: committed RAG data and evidence helpers avoid source paths, source filenames, page anchors, OCR/body-text payloads, embeddings, and protected source wording.
- Passed: RAG tests check publisher isolation, four-volume coverage, evidence-layer gating, and source-artifact patterns.
- Boundary: this does not create BNU high student-facing lessons, question banks, adaptive-learning behavior, AI Tutor provider behavior, or UI integration.
- Coverage gap: any additional BNU senior-secondary volumes or assessment materials require a separate source inventory and S18 review.

## Verification

- Passed: `python3 scripts/build-mainland-bnu-high-textbook-manifest.py --self-test`
- Passed: local metadata-only manifest run against the four owner-provided files
- Passed: `npm run test:rag` with 215/215 tests passing
- Passed: `npm run type-check`
- Passed: `npm run build`

## Follow-Up

- S18 should manually review any future generated BNU high questions or lessons for source distance, mathematical correctness, grade fit, and terminology before S04/S05 integration.
- S03/S04/S05/S08/S12/S15 coordination is required before exposing BNU high roadmap, practice, lessons, API behavior, or adaptive recommendations in product surfaces.
