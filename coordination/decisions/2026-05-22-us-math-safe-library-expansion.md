# U.S. CA/NC Math Safe-Library Expansion Decision

- Date: 2026-05-22
- Session: S16 with owner-requested implementation scope
- Topic: Expanding U.S. safe RAG from grade overview cards to a three-lane personal library foundation
- Status: Implemented as safe-card library, not raw-source ingestion

## Decision

MAIS will represent California and North Carolina U.S. math curriculum knowledge through three safe-library lanes:

- `public-standards`: standards/framework/test-specification abstractions from public official sources.
- `licensed-private-library`: publisher or district material metadata that remains local/private unless written authorization permits more.
- `oer`: OER inventory metadata with commercial-use and attribution status.

The committed repository still must not contain raw official documents, textbook body text, textbook examples, released item stems, choices, answer keys, rubrics, figures, tables, screenshots, OCR text, or page content.

## Implementation

The U.S. RAG data now contains:

- 24 grade-overview cards for `US_CA_MATH` and `US_NC_MATH`.
- 116 standards-family cards covering the current K-12 standards/domain graph abstraction for CA and NC.
- 24 textbook-compatibility cards that are publisher-neutral and require owner/district authorization before publisher-specific mapping.
- 16 exam-pattern cards for CAASPP/Smarter Balanced-style and NC EOG/EOC-style public test specification abstraction.

Retrieval supports filtering by:

- `cardKinds`: `grade-overview`, `standards`, `textbook-compatibility`, `exam-pattern`
- `libraryLanes`: `public-standards`, `licensed-private-library`, `oer`
- existing state, curriculum track, grade, standard IDs, domain tags, concept IDs, topic ID, intent, and difficulty

`buildUnitedStatesMathEvidencePack()` now emits layer/card-kind metadata and keeps originality and no-endorsement guardrails in the evidence text.

## Local-Only Tooling

`npm run rag:us-math-manifest -- <paths-or-urls>` builds ignored `.local/rag/us-math/` metadata-only manifests and review drafts.

The tool:

- classifies sources into safe lanes from filenames/URLs
- records file/URL metadata only
- writes `rawCorpusAllowed: false` by default
- never extracts body text from PDFs, DOCX files, textbooks, assessments, OCR, figures, tables, or pages

## Safety Tests

`npm run test:rag` now runs:

- Mainland high-school metadata-only self-test
- U.S. safe-library manifest self-test
- HK/Mainland/U.S. RAG retrieval tests
- U.S. layer retrieval tests
- raw-source artifact scan over committed U.S. RAG cards
- basic source-similarity guard tests

## Follow-Up

- S18 should teacher-review CA/NC standards-family cards before principal pilots.
- S07 should wire U.S. evidence packs into AI Tutor prompts only after prompt-level originality guard review.
- S11 should add a visible principal-demo QA matrix once a UI/API surface exists.
- U.S. IP counsel should review source use before commercial district pilots.
