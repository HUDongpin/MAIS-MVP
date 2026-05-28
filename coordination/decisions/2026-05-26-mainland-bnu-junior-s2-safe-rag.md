# Mainland BNU Junior S2 Textbook Safe-RAG Decision

- Date: 2026-05-26
- Session ID: S18
- Curriculum profile: `MAINLAND_BNU`
- Scope: Junior-secondary `S2` upper/lower textbook sequencing support
- Source handling mode: metadata-only local intake plus committed safe abstraction cards

## Decision

Accepted for MAIS safe-RAG textbook evidence only.

The owner-provided Beijing Normal University Press Grade 8 upper/lower mathematics PDFs may be represented in MAIS only through:

- local ignored metadata manifests under `.local/`;
- broad unit labels, concept IDs, competency tags, skill tags, misconception tags, safe summaries, and generation guidance;
- original MAIS guardrails that require new wording, new values, new diagrams, new examples, and new contexts.

The repository must not store source PDFs, source identifiers, protected page content, textbook examples, exercises, answers, worked responses, activity text, tables, figures, visual layouts, item order, page anchors, checksums, or vector data.

## Approved RAG Surface

The committed BNU S2 textbook RAG layer may expose safe abstraction cards for:

- S2 upper: 勾股定理; 实数; 位置与坐标; 一次函数; 二元一次方程组; 数据的分析.
- S2 lower: 三角形的证明及其应用; 不等式与不等式组; 图形的平移与旋转; 因式分解; 分式与分式方程; 平行四边形.

These cards support original MAIS explanations, diagnostics, lesson support, assessment planning, and future content drafting only. They do not authorize public question-bank launch, source textbook exercise reconstruction, page-referenced tutoring, or lesson-body publication.

The current worktree also contains BNU junior S1/S3 safe cards from parallel local work. This decision validates only the S2 upper/lower intake requested here and preserves the broader junior layer without using it as S2 evidence.

## Local Manifest Result

The local ignored manifest run inspected two owner-provided PDFs and confirmed complete S2 upper/lower coverage.

| Metric | Result |
| --- | ---: |
| Files inspected | 2 |
| Coverage target | S2 |
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
| Source identifiers present | No |

No local manifest result authorizes copying or reconstructing protected textbook wording, worked examples, exercises, diagrams, tables, activity structures, answers, or page-localized references.

## Operational Rules

- Keep source PDFs and generated local manifests out of Git.
- Do not run cloud OCR, SimpleTex, live LLM extraction, or vector creation on these PDFs without separate owner approval.
- Do not expose source identifiers, page locations, checksums, extracted page content, machine-recognized text, or vector payloads in committed code, reports, evidence packs, or screenshots.
- Keep BNU, PEP, and HJB textbook layers separated by publisher.
- Use the shared Mainland junior zhongkao layer only as aggregated cross-publisher exam-pattern guidance for assessment-like intents.
- Student-facing BNU practice, lessons, AI Tutor responses, and adaptive recommendations require separate S18 source-distance and content-quality review before launch.

## Verification

Completed checks:

- Passed: `python3 -m py_compile scripts/build-mainland-bnu-junior-manifest.py`
- Passed: `python3 scripts/build-mainland-bnu-junior-manifest.py --self-test`
- Passed: local metadata-only manifest run for the two owner-provided S2 PDFs
- Passed: local manifest safety scan for source identifiers and forbidden source/payload fields
- Passed: `npm run test:rag` with 195/195 tests passing
- Passed: `npm run type-check`
- Passed: `npm run build`

Not run:

- None.
