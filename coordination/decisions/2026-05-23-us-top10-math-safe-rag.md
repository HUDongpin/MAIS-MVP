# U.S. Top-10-State Math Safe-RAG Decision

- Date: 2026-05-23
- Session: S16 with owner-requested implementation scope
- Topic: Copyright-compliant standards-first RAG foundation for CA, TX, FL, NY, PA, IL, OH, GA, NC, and MI
- Status: Implemented as safe-card metadata and retrieval, not raw curriculum/textbook ingestion

## Decision

MAIS will expand the U.S. math RAG foundation from California/North Carolina to the ten owner-prioritized population-large states:

- Phase 1: California, Texas, Florida, New York.
- Phase 2: Pennsylvania, Illinois, Ohio, Georgia, North Carolina, Michigan.

The committed repository stores standards-safe abstractions only:

- official source registry metadata, license posture, allowed-use policy, attribution text, last-checked date, and zero-raw-corpus retention flags
- state profile metadata: Common Core status, standards name/version, adoption/materials policy, assessment program, and CCSS crosswalk relation
- grade-overview, standards-family, textbook-compatibility, and exam-pattern safe cards
- standard identifiers, grade/domain tags, concept tags, misconception tags, and MAIS-authored generation guidance

The committed repository must not store:

- commercial textbook body text, examples, exercises, figures, tables, teacher notes, assessment-bank content, scans, OCR, or screenshots
- released/sample assessment item stems, choices, answer keys, scoring language, rubrics, student samples, diagrams, or source passages
- full official standards/framework text or lightly rewritten official wording
- raw OER lesson/task text until attribution/provenance UI and license review are implemented

## Implementation

The implementation adds or updates:

- Top-10-state U.S. RAG tracks: `US_CA_MATH`, `US_TX_MATH`, `US_FL_MATH`, `US_NY_MATH`, `US_PA_MATH`, `US_IL_MATH`, `US_OH_MATH`, `US_GA_MATH`, `US_NC_MATH`, `US_MI_MATH`.
- `unitedStatesMathStateProfiles` with population priority rank, rollout phase, standards system, Common Core status, materials policy, assessment program, and CCSS crosswalk relation.
- `unitedStatesMathSourceRegistry` fields for `allowedUse`, `verbatimLimit`, `attributionText`, and `lastCheckedAt`.
- 900 committed safe cards:
  - 120 grade-overview cards.
  - 580 standards-family cards.
  - 120 textbook-compatibility cards.
  - 80 exam-pattern cards.
- Retrieval and evidence-pack output now includes state policy, Common Core/crosswalk status, materials policy, source allowed-use limits, and attribution metadata.
- Local-only manifest tooling now accepts all ten target states and continues to write metadata-only ignored artifacts under `.local/rag/us-math/`.

## Source Boundary

Primary official/source references reviewed for this implementation:

- Common Core public license: https://www.thecorestandards.org/public-license/
- U.S. Copyright Office copyright FAQ: https://www.copyright.gov/help/faq/faq-protect.html
- California CDE math resources/framework/adoption metadata
- Texas TEA TEKS, IMRA, and STAAR metadata
- Florida FLDOE B.E.S.T., instructional-materials adoption, and assessment metadata
- NYSED Next Generation standards and mathematics assessment metadata
- Pennsylvania PA Core/SAS/assessment metadata
- Illinois ISBE standards and assessment metadata
- Ohio learning standards/HQIM/testing metadata
- Georgia K-12 Mathematics Standards and Georgia Milestones metadata
- North Carolina NCSCOS, textbook adoption, and EOG/EOC metadata
- Michigan academic standards and M-STEP metadata
- Open Up Resources and Illustrative Mathematics OER license metadata

All entries remain `rawCorpusAllowed: false` in this implementation.

## Follow-Up

- S18 should review the ten-state standards-family safe cards for curriculum accuracy before district pilots.
- S07 should wire evidence packs into AI Tutor prompts only after prompt-level originality and attribution guards are reviewed.
- S11 should add principal-demo QA once a visible U.S. pilot surface exists.
- S10/S19 should route any commercial launch through U.S. IP counsel review and document licensed-source decisions before raw OER or publisher content is ingested.
