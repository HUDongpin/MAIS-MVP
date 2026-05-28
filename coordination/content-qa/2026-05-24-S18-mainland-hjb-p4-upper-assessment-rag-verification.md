# Mainland HJB P4 Upper Assessment Safe-RAG Verification

- Date: 2026-05-24
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Artifact status: Implemented as safe assessment-pattern RAG cards and local-only metadata tooling

## Scope

This review covers the owner-provided Shanghai Education Press / HuJiaoBan P4 upper unit-test, midterm, and final assessment archives. The implementation absorbs only aggregated assessment-pattern guidance into MAIS RAG for `MAINLAND_HJB` primary P4 upper support.

## Source Safety Boundary

- Repository retention: safe assessment-pattern cards, deterministic retrieval tests, metadata-only manifest tooling, and this redacted QA note.
- Local-only inspection: archive/member hashes, sizes, extension, grade-semester classification, assessment family, material kind, document role, variant role, duplicate grouping, and quarantine/review flags under ignored `.local/` storage.
- Not retained: source archives, source paths, source member names, extracted body text, OCR text, item wording, answer text, worked-solution text, scoring wording, tables, figures, page content, page images, page locators, visual layouts, or embedding payloads.
- No live LLM provider, cloud OCR, SimpleTex call, vector embedding generation, or student-facing question-bank generation was used.

## Coverage Result

- Local metadata manifest: 2 archives, 97 metadata-only entries, complete `P4:upper` coverage.
- Assessment families: 30 unit-test, 29 midterm, 38 final entries.
- Document roles: 58 student-assessment, 34 answer-or-solution support, 5 document entries.
- Variant roles: 41 base-or-other, 34 response-support, 22 alternate-layout entries.
- File extensions observed: 38 `.doc`, 53 `.docx`, 6 `.pdf`.
- Safety flags: 15 legacy/reference-only entries quarantined locally; 67 entries require S18 review before any future student-facing generated output.

## QA Decision

Approved for MAIS safe RAG evidence use with these restrictions:

- AI Tutor and assessment-design flows may use the P4 upper assessment-pattern layer only for original MAIS explanations, diagnostics, tutor guidance, and future draft planning.
- This work does not authorize public question-bank launch, source-paper reconstruction, answer-key exposure, or generation of full practice papers that mirror source structure.
- Future student-facing questions or assessments based on these patterns require separate S18 source-distance review and S04/S11 quality checks.
- Any future OCR-derived or full-text artifact must stay outside Git and must not be converted into committed source text, answer text, or embeddings.

## Checks

- Passed: `python3 scripts/build-mainland-hjb-primary-assessment-manifest.py --self-test`
- Passed: real owner-archive manifest generation to `.local/rag/mainland-hjb-primary-p4-upper-assessments`
- Passed: local manifest leak scan for source paths, source member names, file-name fields, body sentinel text, and protected-answer indicators
- Passed: `npm run test:rag`
- Passed: `npm run type-check`
- Not run: `npm run build` because this task did not change routes, app UI, package/config, or server/client boundaries.
