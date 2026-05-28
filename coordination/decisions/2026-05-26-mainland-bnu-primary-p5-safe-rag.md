# Mainland BNU Primary P5 Textbook Safe-RAG Decision

- Date: 2026-05-26
- Session ID: S18
- Curriculum profile: `MAINLAND_BNU`
- Scope: Primary `P5` upper/lower textbook sequencing support
- Source handling mode: metadata-only local intake plus committed safe abstraction cards

## Decision

Accepted for MAIS safe-RAG textbook evidence only.

The owner-provided Beijing Normal University Press Grade 5 upper and lower primary mathematics PDFs may be represented in MAIS only through:

- local ignored metadata manifests under `.local/`;
- broad unit labels, concept IDs, competency tags, skill tags, misconception tags, safe summaries, and generation guidance;
- original MAIS guardrails that require new wording, new values, new diagrams, new examples, and new contexts.

The repository must not store source PDFs, source file paths, source filenames, extracted PDF body text, OCR text, page images, page locators, textbook examples, exercises, answers, worked responses, activity text, tables, figures, visual layouts, item order, hashes, or embedding payloads.

## Approved RAG Surface

The committed BNU P5 textbook RAG layer may expose safe abstraction cards for:

- P5 upper: decimal division; symmetry and translation; factors and multiples; polygon area; fraction meaning; composite area; probability; integrated activity/review.
- P5 lower: fraction addition/subtraction; cuboid and cube surface reasoning; fraction multiplication; cuboid and cube volume/capacity reasoning; fraction division; position; equation problem solving; data representation and analysis; integrated activity/review.

These cards support original MAIS explanations, diagnostics, lesson support, assessment planning, and future content drafting only. They do not authorize public question-bank launch, source textbook exercise reconstruction, page-referenced tutoring, or lesson-body publication.

## Local Manifest Result

The local ignored manifest run inspected two owner-provided PDFs and confirmed complete P5 upper/lower coverage.

| Metric | Result |
| --- | ---: |
| Files inspected | 2 |
| Known page counts | 2 |
| Upper volume page count | 124 |
| Lower volume page count | 110 |
| Text-layer missing files | 2 |
| Body text persisted | No |
| OCR text persisted | No |
| Page images persisted | No |
| Source locators persisted | No |
| Embedding payloads persisted | No |

No local manifest result authorizes copying or reconstructing protected textbook wording, worked examples, exercises, diagrams, tables, activity structures, answers, or page-localized references.

## Operational Rules

- Keep source PDFs and generated local manifests out of Git.
- Do not run cloud OCR, SimpleTex, live LLM extraction, or embedding creation on these PDFs without separate owner approval.
- Do not expose local source paths, source filenames, page locations, hashes, OCR text, or PDF body fields in committed code, reports, evidence packs, or screenshots.
- Keep BNU, PEP, and HJB textbook layers separated by publisher.
- Student-facing BNU practice, lessons, AI Tutor responses, and adaptive recommendations require separate S18 source-distance and content-quality review before launch.

## Verification

Completed checks:

- Passed: `python3 scripts/build-mainland-bnu-primary-manifest.py --self-test`
- Passed: local metadata-only manifest run for the two owner-provided P5 PDFs
- Passed: local manifest safety scan for persisted body text, OCR text, page images, source locators, and embedding payloads
- Passed: `npm run test:rag`
- Passed: `npm run type-check`
- Attempted: `npm run build`; the first run compiled successfully but failed during unrelated prerender module lookup for existing `/classroom/join` and `/api/teacher/dashboard` routes, then a rerun hung while existing Next dev servers were using the project build output and was stopped.

Required before any future student-facing promotion:

- Source-distance sampling of generated student-facing output
- S04/S05/S07/S15 coordination depending on whether the future surface is practice, lessons, tutor, or adaptive recommendations
