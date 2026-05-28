# Mainland BNU Primary P1 Upper Assessment Safe-RAG Decision

- Date: 2026-05-25
- Session ID: S18
- Curriculum profile: `MAINLAND_BNU`
- Scope: Primary `P1` upper unit, monthly, midterm, and final assessment-pattern support
- Source handling mode: metadata-only local intake plus committed safe abstraction cards

## Decision

Accepted for MAIS safe-RAG assessment-pattern evidence only.

The owner-provided Beijing Normal University Press / BNU Grade 1 upper assessment archives may be represented in MAIS only through:

- local ignored metadata manifests under `.local/`;
- aggregate assessment-family, unit-title, concept-signal, competency, skill, item-type, misconception, and generation-guidance tags;
- original MAIS generation guardrails that require new wording, new values, new layouts, and new contexts.

The archives must not be represented through source ZIPs, source documents, extracted body text, OCR, item stems, answer text, worked-solution wording, tables, figures, page images, page locators, source/member/file names, source paths, or embedding payloads.

## Approved RAG Surface

The committed BNU P1 upper RAG layer may expose eight safe abstraction cards:

- `bnu-primary-p1-upper-assessment-school-readiness-number-sense`
- `bnu-primary-p1-upper-assessment-within-5-add-sub`
- `bnu-primary-p1-upper-assessment-classification`
- `bnu-primary-p1-upper-assessment-within-10-add-sub`
- `bnu-primary-p1-upper-assessment-solid-shapes`
- `bnu-primary-p1-upper-assessment-monthly-1-to-2-integrated`
- `bnu-primary-p1-upper-assessment-midterm-integrated`
- `bnu-primary-p1-upper-assessment-final-integrated`

These cards are approved only as safe assessment-pattern evidence for assessment-like intents such as exam practice, assessment design, question drafting, and mistake diagnosis. They are not approved as a student question bank, answer key, source-paper reconstruction layer, or source-derived paper-structure claim.

## Local Manifest Result

The local ignored manifest run inspected two archives and produced 237 metadata-only entries.

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Metadata entries | 237 |
| Expected safe-pattern signals complete | Yes |
| Current-scope student evidence entries | 78 |
| Legacy/reference-only entries | 80 |
| `.docx` entries | 204 |
| `.doc` entries | 33 |
| Student-assessment entries | 97 |
| Response-support entries | 113 |
| Answer-card entries | 27 |

No local manifest result authorizes copying answer, explanation, scoring, table, diagram, or prompt wording. Legacy/reference entries remain local metadata only and are not production-card evidence unless S18 separately approves curriculum-version relevance.

## Operational Rules

- Keep source archives and generated local manifests out of Git.
- Do not run OCR, SimpleTex, live LLM extraction, or embedding creation on these files for this intake.
- Do not expose local source paths, member names, file names, page locations, or source body fields in committed code or reports.
- Use the assessment layer only for assessment-like intents; normal tutor explanation should remain on curriculum cards.
- Keep BNU, PEP, and HJB primary assessment retrieval separated by publisher.

## Verification

Completed checks:

- Passed: `python3 scripts/build-mainland-bnu-primary-assessment-manifest.py --self-test`
- Passed: local manifest run for the two owner-provided archives
- Passed: strict local manifest field scan for forbidden path/name/body fields
- Passed: `npm run test:rag`
- Passed: `npm run type-check`
- Passed: `npm run build`
