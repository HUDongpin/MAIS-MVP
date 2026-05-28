# Mainland BNU P1 Lower Assessment Safe-RAG Decision

- Date: 2026-05-25
- Session ID: S18
- Curriculum track: `MAINLAND_BNU`
- Scope: Primary `P1` lower assessment-pattern support for MAIS Mainland math RAG
- Source handling mode: metadata-only local intake plus committed safe abstraction cards

## Decision

Accepted for MAIS safe-RAG assessment-pattern evidence only.

The owner-provided Beijing Normal University Press Grade 1 lower unit, monthly, midterm, and final assessment archives may be represented in MAIS only through:

- ignored local metadata manifests under `.local/`;
- aggregate assessment-family, assessment-window, unit-title, concept-signal, competency, skill, item-type, misconception, and generation-guidance tags;
- original MAIS generation guardrails requiring new wording, new values, new layouts, and new contexts.

The archives must not be represented through private ZIPs, private documents, extracted body text, OCR, source item stems, response-key text, worked-solution wording, tables, figures, page images, page locators, private locators, private labels, or vector payloads.

## Approved RAG Surface

The committed P1 lower RAG layer may expose ten safe abstraction cards:

- `bnu-primary-p1-lower-assessment-within-20-addition`
- `bnu-primary-p1-lower-assessment-shape-transformation`
- `bnu-primary-p1-lower-assessment-within-20-subtraction`
- `bnu-primary-p1-lower-assessment-within-100-number-sense`
- `bnu-primary-p1-lower-assessment-within-100-add-sub`
- `bnu-primary-p1-lower-assessment-plane-shapes`
- `bnu-primary-p1-lower-assessment-monthly-1-to-2-integrated`
- `bnu-primary-p1-lower-assessment-monthly-5-to-6-integrated`
- `bnu-primary-p1-lower-assessment-midterm-integrated`
- `bnu-primary-p1-lower-assessment-final-integrated`

These cards are approved only as aggregated assessment-pattern evidence for assessment-like intents such as exam practice, assessment design, question drafting, and mistake diagnosis. They are not approved as a student question bank, source-paper reconstruction layer, or source-derived final-paper claim.

## Local Manifest Result

The ignored local manifest inspected two archives and produced 202 metadata-only entries.

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| Metadata entries | 202 |
| Expected safe-pattern slots | 10 |
| Expected safe-pattern slots complete | Yes |
| Current-scope student-facing evidence entries | 61 |
| Local-only quarantined entries | 141 |
| Legacy/reference-only entries | 71 |
| `.docx` entries | 180 |
| `.doc` entries | 22 |
| Unit-test family entries | 24 |
| Monthly/review-window entries | 23 |
| Midterm family entries | 54 |
| Final family entries | 76 |
| Response-support entries | 53 |
| Response-form support entries | 17 |

No role count authorizes copying source wording, response keys, solution wording, or source layout.

## Operational Rules

- Keep private archives and generated local manifests out of Git.
- Do not run OCR, SimpleTex, live LLM extraction, or embedding creation on these files for this intake.
- Do not expose private locators, member labels, page locations, or source body fields in committed code or reports.
- Use the assessment layer only for assessment-like intents; normal tutor explanation should remain on curriculum cards.
- Keep BNU primary assessment retrieval separate from PEP and HJB primary retrieval.

## Verification

Completed checks during implementation:

- Passed: `python3 scripts/build-mainland-bnu-primary-assessment-manifest.py --self-test`
- Passed: local metadata-only manifest run for the two owner-provided archives

Completed project checks before handoff:

- `npm run test:rag`
- `npm run type-check`
- `npm run build`
- sensitive literal scan across changed public artifacts and local metadata outputs
