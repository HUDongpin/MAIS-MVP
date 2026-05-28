# Mainland BNU Primary P2 Upper Assessment Safe-RAG Decision

- Date: 2026-05-25
- Session ID: S18
- Curriculum profile: `MAINLAND_BNU`
- Scope: Primary `P2` upper unit, monthly, midterm, and final assessment-pattern support
- Source handling mode: metadata-only local intake plus committed safe abstraction cards

## Decision

Accepted for MAIS safe-RAG assessment-pattern evidence only.

The owner-provided Beijing Normal University Press / BNU Grade 2 upper assessment archives may be represented in MAIS only through:

- local ignored metadata manifests under `.local/`;
- aggregate assessment-family, unit-title, concept-signal, competency, skill, item-type, misconception, and generation-guidance tags;
- original MAIS generation guardrails that require new wording, new values, new layouts, and new contexts.

The archives must not be represented through source ZIPs, source documents, original filenames, archive-member labels, extracted body text, OCR, item stems, answer text, worked-solution wording, tables, figures, page images, page locators, source paths, or embedding payloads.

## Approved RAG Surface

The committed BNU P2 upper RAG layer may expose eleven safe abstraction cards:

- `bnu-primary-p2-upper-assessment-within-100-add-sub-unit`
- `bnu-primary-p2-upper-assessment-measurement-unit`
- `bnu-primary-p2-upper-assessment-multiplication-introduction-unit`
- `bnu-primary-p2-upper-assessment-multiplication-facts-2-to-5-unit`
- `bnu-primary-p2-upper-assessment-division-introduction-unit`
- `bnu-primary-p2-upper-assessment-shape-motion-unit`
- `bnu-primary-p2-upper-assessment-multiplication-facts-6-to-9-unit`
- `bnu-primary-p2-upper-assessment-multiplication-division-application-unit`
- `bnu-primary-p2-upper-assessment-monthly-1-to-2-integrated`
- `bnu-primary-p2-upper-assessment-midterm-integrated`
- `bnu-primary-p2-upper-assessment-final-integrated`

These cards are approved only as safe assessment-pattern evidence for assessment-like intents such as exam practice, assessment design, question drafting, and mistake diagnosis. They are not approved as a student question bank, answer key, source-paper reconstruction layer, or source-derived paper-structure claim.

## Local Manifest Result

The local ignored manifest run inspected two owner-provided archives and produced 258 metadata-only entries.

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Metadata entries | 258 |
| Expected safe-pattern signals complete | Yes |
| Current-scope student evidence entries | 85 |
| Legacy/reference-only entries | 54 |
| `.docx` entries | 199 |
| `.doc` entries | 59 |
| Student-assessment entries | 85 |
| Response-support entries | 149 |
| Answer-card entries | 24 |
| Local-only quarantine entries | 173 |

No local manifest result authorizes copying answer, explanation, scoring, table, diagram, or prompt wording. Legacy/reference entries, `.doc` legacy-format entries, answer cards, and answer or explanation support materials remain local metadata only and do not become source text for committed RAG.

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
- Passed: committed-file scan for private source paths and archive names
- Passed: `npm run test:rag`
- Passed: `npm run type-check`
