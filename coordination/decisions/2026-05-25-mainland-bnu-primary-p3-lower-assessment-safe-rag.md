# Mainland BNU Primary P3 Lower Assessment Safe-RAG Decision

- Date: 2026-05-25
- Session ID: S18
- Curriculum profile: `MAINLAND_BNU`
- Scope: Primary `P3` lower unit, monthly, midterm, and final assessment-pattern support
- Source handling mode: metadata-only local intake plus committed safe abstraction cards

## Decision

Accepted for MAIS safe-RAG assessment-pattern evidence only.

The owner-provided Beijing Normal University Press / BNU Grade 3 lower assessment archives may be represented in MAIS only through:

- local ignored metadata manifests under `.local/`;
- aggregate assessment-family, unit-title, concept-signal, competency, skill, item-type, misconception, and generation-guidance tags;
- original MAIS generation guardrails that require new wording, new values, new layouts, and new contexts.

The archives must not be represented through source ZIPs, source documents, extracted body text, OCR, item stems, answer text, worked-solution wording, tables, figures, page images, page locators, source/member/file names, source paths, or embedding payloads.

## Approved RAG Surface

The committed BNU P3 lower RAG layer may expose ten safe abstraction cards:

- `bnu-primary-p3-lower-assessment-division-unit`
- `bnu-primary-p3-lower-assessment-shape-motion-unit`
- `bnu-primary-p3-lower-assessment-two-digit-multiplication-unit`
- `bnu-primary-p3-lower-assessment-mass-units-unit`
- `bnu-primary-p3-lower-assessment-area-unit`
- `bnu-primary-p3-lower-assessment-fraction-introduction-unit`
- `bnu-primary-p3-lower-assessment-data-representation-unit`
- `bnu-primary-p3-lower-assessment-monthly-stage-integrated`
- `bnu-primary-p3-lower-assessment-midterm-integrated`
- `bnu-primary-p3-lower-assessment-final-integrated`

These cards are approved only as safe assessment-pattern evidence for assessment-like intents such as exam practice, assessment design, question drafting, and mistake diagnosis. They are not approved as a student question bank, answer key, source-paper reconstruction layer, or source-derived paper-structure claim.

## Local Manifest Result

The local ignored manifest run inspected two owner-provided archives and produced 199 metadata-only entries.

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Metadata entries | 199 |
| Expected safe-pattern signals complete | Yes |
| Current-scope student evidence entries | 36 |
| Local-only quarantined entries | 163 |
| Curriculum-version review entries | 46 |
| `.docx` entries | 182 |
| `.doc` entries | 17 |
| Student-assessment entries | 70 |
| Response-support entries | 112 |
| Answer-card entries | 17 |
| Unit-test family entries | 55 |
| Monthly/review-window entries | 6 |
| Midterm family entries | 46 |
| Final family entries | 81 |

No local manifest result authorizes copying answer, explanation, scoring, table, diagram, prompt wording, or source layout. Response-support entries, answer-card entries, `.doc` legacy-format entries, and curriculum-version review entries remain local metadata only and do not become source text for committed RAG.

## Operational Rules

- Keep source archives and generated local manifests out of Git.
- Do not run OCR, SimpleTex, live LLM extraction, or embedding creation on these files for this intake.
- Do not expose local source paths, member names, file names, page locations, or source body fields in committed code or reports.
- Treat curriculum-version review materials as local-only metadata until S18 separately approves curriculum-version alignment.
- Use the assessment layer only for assessment-like intents; normal tutor explanation should remain on curriculum cards.
- Keep BNU, PEP, and HJB primary assessment retrieval separated by publisher.

## Verification

Completed checks:

- Passed: `python3 scripts/build-mainland-bnu-primary-assessment-manifest.py --self-test`
- Passed: local manifest run for the two owner-provided archives
- Passed: `npm run test:rag`
- Passed: `npm run type-check`
- Passed: sensitive literal scan across production RAG and decision files
- Passed: local manifest persisted-field safety scan
