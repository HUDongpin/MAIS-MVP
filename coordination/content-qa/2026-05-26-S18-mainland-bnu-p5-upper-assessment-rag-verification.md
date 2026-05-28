# Mainland BNU P5 Upper Assessment RAG Verification

- Date: 2026-05-26
- Session ID: S18
- Scope: MAINLAND_BNU primary P5 upper assessment-pattern safe RAG
- Status: Implemented as safe abstraction cards and local-only metadata tooling

## Summary

S18 safely absorbed two owner-provided local ZIP archives for Beijing Normal University Press Grade 5 upper primary mathematics assessments into MAIS as assessment-pattern safe abstraction evidence. No source archive, source member name, private path, extracted body text, OCR text, original item wording, answer wording, worked solution, table body, figure body, page image, page locator, source hash, or embedding payload was committed.

The committed RAG layer now provides P5 upper assessment-pattern evidence for unit tests, stage review signals, midterm readiness, final readiness, and topic-focused final review. It is intended only for MAIS-original question generation, diagnosis, and teaching recommendations.

## Local Manifest Result

The ignored local manifest was generated under `.local/rag/mainland-bnu-primary-p5-upper-assessments/`.

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Metadata entries | 225 |
| `.doc` entries | 60 |
| `.docx` entries | 165 |
| Student-assessment role entries | 75 |
| Response-support role entries | 121 |
| Answer-card role entries | 29 |
| Unit-test family entries | 70 |
| Midterm family entries | 51 |
| Final family entries | 97 |
| Comprehensive family entries | 7 |
| Current-scope evidence entries | 10 |
| Local-only quarantine entries | 215 |
| Expected safe-pattern signals complete | Yes |
| Missing expected safe-pattern signals | 0 |

Quarantine remained intentionally conservative: response support, answer-card support, legacy document format, layout variants, and curriculum-version review materials stayed local-only and were not promoted to current-scope evidence.

## Committed Safe Cards

The BNU primary assessment-pattern RAG layer now includes P5 upper safe cards for:

- Unit assessments: decimal division, symmetry and translation, multiples and factors, polygon area, fraction meaning, composite area, and probability.
- Integrated assessments: stage/monthly review signal, midterm readiness, final readiness, and final topic-drill review.

Each card contains only broad concept labels, competency tags, task-family patterns, misconception patterns, original generation guidance, and explicit source-reuse restrictions. The cards do not reproduce source questions, answer keys, solution steps, layouts, tables, diagrams, or page structure.

## Safety Review

The manifest builder keeps archive and member labels out of persisted output and uses only metadata-level classification, hashed grouping, safe pattern signals, duplicate grouping, and quarantine status. The committed evidence tests include checks against private locator leakage, raw source labels, archive names, member names, hash/source-path fields, OCR/body text, answer-card labels, solution labels, page-count leakage, and embedding payload references.

The local manifest QA report confirms body text, OCR text, page images, source locators, and vector payloads were not extracted or persisted. The generated local manifest and QA report remain local-only and must not be copied into committed RAG evidence.

## Verification

- Passed: `python3 -m py_compile scripts/build-mainland-bnu-primary-assessment-manifest.py`
- Passed: `python3 scripts/build-mainland-bnu-primary-assessment-manifest.py --self-test`
- Passed: local metadata-only P5 upper assessment manifest run against the two owner-provided archives
- Passed: local manifest QA with complete expected safe-pattern signals and 0 missing expected signals
- Passed: refined leakage scan for private paths and owner-provided archive labels in committed changed files
- Passed: `npm run test:rag` with 185/185 tests passing
- Passed: `npm run type-check`
- Not run: `npm run build`, because this was a RAG data/tooling/test change with no route, UI, runtime config, or server/client boundary edits.

## Risks And Boundaries

- This work does not create a raw-content vector store, source-text retriever, answer-key retriever, or student-facing copied question bank.
- Production use still needs S18 source-distance review of generated outputs before any BNU P5 upper assessment-derived recommendations are surfaced to learners.
- Any future OCR, extraction, live LLM parsing, SimpleTex use, source-text vectorization, or page-referenced tutoring requires a separate owner-approved workflow.
