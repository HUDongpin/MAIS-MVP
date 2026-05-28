# Mainland BNU Primary P4 Textbook Safe-RAG Decision

- Date: 2026-05-26
- Session ID: S18
- Curriculum profile: `MAINLAND_BNU`
- Scope: Primary `P4` upper/lower textbook sequencing support
- Source handling mode: metadata-only local intake plus committed safe abstraction cards

## Decision

Accepted for MAIS safe-RAG textbook evidence only.

The owner-provided Beijing Normal University Press Grade 4 upper and lower primary mathematics PDFs may be represented in MAIS only through:

- local ignored metadata manifests under `.local/`;
- broad unit labels, concept IDs, competency tags, skill tags, misconception tags, safe summaries, and generation guidance;
- original MAIS guardrails that require new wording, new values, new diagrams, new examples, and new contexts.

The repository must not store source PDFs, source file paths, source filenames, extracted PDF body text, OCR text, page images, page locators, textbook examples, exercises, answers, worked responses, activity text, tables, figures, visual layouts, item order, hashes, or embedding payloads.

## Approved RAG Surface

The committed BNU P4 textbook RAG layer may expose safe abstraction cards for:

- P4 upper: large numbers; lines and angles; multi-digit multiplication; operation laws; direction and position; division with two-digit divisors; negative numbers in daily contexts; probability; integrated activity/review.
- P4 lower: decimal meaning and addition/subtraction; triangles and quadrilaterals; decimal multiplication; object views; equation introduction; data representation and analysis; integrated activity/review.

These cards support original MAIS explanations, diagnostics, lesson support, assessment planning, and future content drafting only. They do not authorize public question-bank launch, source textbook exercise reconstruction, page-referenced tutoring, or lesson-body publication.

## Local Manifest Result

The local ignored manifest run inspected two owner-provided PDFs and confirmed complete P4 upper/lower coverage.

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

No local manifest result authorizes copying or reconstructing protected textbook wording, worked examples, exercises, diagrams, tables, activity structures, answers, or page-localized references.

## Operational Rules

- Keep source PDFs and generated local manifests out of Git.
- Do not run cloud OCR, SimpleTex, live LLM extraction, or embedding creation on these PDFs without separate owner approval.
- Do not expose local source paths, source filenames, page locations, hashes, OCR text, or PDF body fields in committed code, reports, evidence packs, or screenshots.
- Keep BNU, PEP, and HJB textbook layers separated by publisher.
- Student-facing BNU practice, lessons, AI Tutor responses, and adaptive recommendations require separate S18 source-distance and content-quality review before launch.

## Verification

Completed checks:

- Passed: `python3 -m py_compile scripts/build-mainland-bnu-primary-manifest.py`
- Passed: `python3 scripts/build-mainland-bnu-primary-manifest.py --self-test`
- Passed: local metadata-only manifest run for the two owner-provided P4 PDFs
- Passed: local manifest safety scan for source names/paths and forbidden source/payload fields
- Passed: `npm run test:rag`
- Passed: `npm run type-check`

Not run:

- `npm run build`, because this task did not change routes, UI, package/config files, or server/client boundaries.
