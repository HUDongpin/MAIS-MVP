# Mainland HJB P1 Lower Assessment Safe-RAG Decision

- Date: 2026-05-24
- Session ID: S18
- Curriculum track: `MAINLAND_HJB`
- Scope: Primary `P1` lower assessment-pattern support for MAIS Mainland math RAG
- Source handling mode: metadata-only local intake plus committed safe abstraction cards

## Decision

Accepted for MAIS safe-RAG assessment-pattern evidence only.

The owner-provided Shanghai Education Press / HJB Grade 1 lower unit-test and midterm/final archives may be represented in MAIS only through:

- local ignored metadata manifests under `.local/`;
- aggregate assessment-family, unit-title, concept-signal, competency, skill, item-type, misconception, and generation-guidance tags;
- original MAIS generation guardrails that require new wording, new values, new layouts, and new contexts.

The archives must not be represented through source ZIPs, source documents, extracted body text, OCR, item stems, answer text, worked-solution wording, tables, figures, page images, page locators, source/member/file names, source paths, or embedding payloads.

## Approved RAG Surface

The committed P1 lower RAG layer may expose seven safe abstraction cards:

- `hjb-primary-p1-lower-assessment-within-20-regrouping`
- `hjb-primary-p1-lower-assessment-within-100-number-sense`
- `hjb-primary-p1-lower-assessment-time-introduction`
- `hjb-primary-p1-lower-assessment-within-100-add-sub`
- `hjb-primary-p1-lower-assessment-length-measurement`
- `hjb-primary-p1-lower-assessment-midterm-1-to-4-integrated`
- `hjb-primary-p1-lower-assessment-final-integrated`

These cards are approved only as safe assessment-pattern evidence for assessment-like intents such as exam practice, assessment design, question drafting, and mistake diagnosis. They are not approved as a student question bank, answer key, source-paper reconstruction layer, or source-derived final-paper claim.

## Local Manifest Result

The local ignored manifest run inspected two archives and produced 73 metadata-only entries:

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Metadata entries | 73 |
| Expected slot | `P1:lower` |
| Expected slot complete | Yes |
| `.docx` entries | 32 |
| `.doc` entries | 41 |
| Primary unit-test family entries | 35 |
| Primary midterm family entries | 28 |
| Primary final family entries | 10 |
| Legacy/reference-only entries | 25 |
| Entries requiring S18 review before stronger production claims | 43 |

Document role counts are kept coarse: 32 student-assessment entries, 40 response-support entries, and 1 general document entry. No role count authorizes copying answer or solution wording.

## Legacy And Final-Material Boundary

The 25 legacy/reference-only entries remain local metadata only. They are not production-card evidence unless S18 separately approves their curriculum-version relevance.

The final integrated card is approved only as a broad P1 lower full-semester review pattern aligned to public curriculum scope and the local manifest's coarse final-family presence. It must not be used to claim exact source-paper structure, source item sequence, source coverage weighting, source wording, or answer-support wording.

## Operational Rules

- Keep source archives and generated local manifests out of Git.
- Do not run OCR, SimpleTex, live LLM extraction, or embedding creation on these files for this intake.
- Do not expose local source paths, member names, file names, page locations, or source body fields in committed code or reports.
- Use the assessment layer only for assessment-like intents; normal tutor explanation should remain on curriculum cards.
- Keep HJB primary assessment retrieval separate from PEP primary retrieval.

## Verification

Completed checks:

- Passed: `python3 scripts/build-mainland-hjb-primary-assessment-manifest.py --self-test`
- Passed: local manifest run for the two owner-provided archives
- Passed: strict local manifest field scan for forbidden payload/path/name fields
- Passed: `npm run test:rag` with 140/140 tests passing
- Passed: `npm run type-check`
- Passed: `npm run build`

## Follow-Up

S18 should perform a separate manual curriculum-version review before using legacy/reference entries, old `.doc` bundles, or specific final-paper materials to make stronger production assertions beyond broad safe RAG assessment-pattern guidance.
