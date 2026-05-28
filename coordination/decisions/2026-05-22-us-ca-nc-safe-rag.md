# U.S. CA/NC Math Safe-RAG Decision

- Date: 2026-05-22
- Session: S16 with owner-requested implementation scope
- Topic: Copyright-safe U.S. math curriculum RAG for California and North Carolina principal pilots
- Status: Implemented as first safe-card slice

## Decision

MAIS will start U.S. market curriculum support with standards-first safe cards for `US_CA_MATH` and `US_NC_MATH`, not raw textbook, assessment, or standards-document retrieval.

The repository may store:

- state, grade, and MAIS P1-S6 mapping metadata
- standard/domain identifiers and MAIS-authored short labels
- concept IDs, competency tags, item-design tags, and misconception tags
- source-registry metadata, license status, retention policy, and review date
- original MAIS generation guidance and principal-demo notes

The repository must not store:

- textbook PDFs, scans, OCR dumps, examples, exercises, teacher notes, figures, or tables
- CAASPP/Smarter Balanced or NCDPI EOG/EOC item stems, choices, answer keys, scoring language, diagrams, screenshots, or source passages
- full CDE/NCDPI standards/framework body text or lightly rewritten source language
- commercial OER or noncommercial curriculum content unless a separate license and attribution lane is implemented

## First Slice

The first implementation adds:

- `UnitedStatesMathSafeCard` and source-registry types in `types/index.ts`
- 24 safe cards in `data/rag/usMath.ts`, one per MAIS grade mapping for California and North Carolina
- deterministic retrieval and evidence-pack builders in `lib/rag/usMath.ts`
- U.S. RAG tests in `lib/rag/usMath.test.ts`
- `npm run test:rag` wiring for U.S. RAG regression coverage

No student UI, AI Tutor route, database, or live-provider behavior is changed in this slice.

## Source Registry Boundary

The source registry records public URLs and compliance metadata only. All U.S. official and assessment sources are marked `rawCorpusAllowed: false`. OER sources are also not raw-ingested in v1 because the product does not yet have attribution, license display, and content-provenance UI.

Primary references reviewed on 2026-05-22:

- California Department of Education mathematics resources: https://www.cde.ca.gov/re/cc/mathresources.asp
- California Mathematics Framework resources: https://www.cde.ca.gov/ci/pl/mathematics.asp
- California Department of Education copyright statement: https://www.cde.ca.gov/re/di/cr/
- CAASPP public assessment portal: https://www.caaspp.org/
- North Carolina Standard Course of Study: https://www.dpi.nc.gov/districts-schools/classroom-resources/office-teaching-and-learning/standard-course-study
- North Carolina mathematics supporting resources: https://www.dpi.nc.gov/districts-schools/classroom-resources/office-teaching-and-learning/standard-course-study/mathematics/standard-course-study-supporting-resources
- North Carolina EOG released forms: https://www.dpi.nc.gov/accountability/testing/eog
- North Carolina EOC released forms: https://www.dpi.nc.gov/accountability/testing/eoc
- Illustrative Mathematics licensing notice: https://illustrativemathematics.org/site-ip-content/

## Follow-Up

- S07 should wire U.S. safe evidence into AI Tutor prompts only after prompt-level originality guards are reviewed.
- S04/S18 should use the U.S. safe cards to generate and review MAIS-authored original practice items; no official released items should be used as templates.
- S10/S11 should add principal-demo QA once a visible U.S. pilot surface exists.
- A U.S. IP lawyer should review source use before commercial district pilots or any raw OER/content ingestion.
