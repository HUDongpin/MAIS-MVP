# BNU P4 Upper Assessment RAG Ingestion QA

- Date: 2026-05-26
- Session ID: S18
- Scope: Beijing Normal University Press primary mathematics, Grade 4 upper assessment-pattern layer.
- Intake mode: metadata-only local manifest plus committed safe abstraction cards.

## Red Lines

- No source question stems, answers, worked responses, scoring language, tables, diagrams, page images, OCR text, page locators, private local paths, archive-member labels, or embedding payloads were committed.
- The generated local manifest remains under ignored `.local/rag/` output and is not part of the committed RAG evidence layer.
- Committed RAG cards contain only aggregated pattern summaries, concept signals, competency tags, item-type families, misconception tags, and original-generation guidance.

## Local Manifest Snapshot

- Total metadata entries observed: 183.
- Archive count: 2 owner-supplied assessment archives.
- Document formats: 54 legacy Word documents, 129 modern Word documents.
- Document roles: 56 student-assessment entries, 105 response-support entries, 22 answer-card entries.
- Assessment families: 40 unit-test entries, 11 monthly/comprehensive entries, 53 midterm entries, 79 final entries.
- Assessment windows observed: unit-test, monthly 1-2, monthly 3-4, monthly 5-6, midterm, final.
- Current-scope evidence entries: 28 metadata-only student-assessment entries.
- Local-only quarantined entries: 155.

## Coverage

- Expected safe-pattern signals: 14.
- Observed safe-pattern signals: 14.
- Missing safe-pattern signals: 0.
- Unit signals covered: large numbers, lines and angles, multiplication, operation laws, direction and position, division, negative numbers, probability.
- Stage-review signals covered: monthly 1-2, monthly 3-4, monthly 5-6, midterm, final, final topic drill.

## Quarantine Summary

- Legacy document format: 54 entries.
- Response support: 47 entries.
- Answer-card support: 14 entries.
- Curriculum-version review material: 40 entries.
- Non-quarantined metadata-only student-assessment entries: 28.

## Checks

- Passed: `python3 scripts/build-mainland-bnu-primary-assessment-manifest.py --self-test`.
- Passed: local P4 upper metadata manifest generation from the owner-supplied assessment archives.
- Passed: `npm run test:rag` with 181 passing tests.
- Passed: `npm run type-check`.

## Risks And Follow-Up

- This ingestion supports RAG assessment-pattern guidance only; it is not a student-facing question bank and does not authorize source-like question generation.
- Any future BNU P4 upper generated practice, lessons, tutor prompts, or adaptive recommendations should receive a separate S18 source-distance and math-correctness review before release.
