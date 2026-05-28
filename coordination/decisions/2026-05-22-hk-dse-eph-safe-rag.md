# HK DSE EPH Textbook Safe-RAG Decision

- Date: 2026-05-22
- Session: S18
- Topic: Safe absorption of owner-provided DSE EPH Mathematics in Focus senior-secondary textbooks
- Status: Implemented as publisher-specific safe-card layer

## Decision

MAIS may use the five owner-provided DSE EPH textbook PDFs only as local-private analysis sources for safe-card abstraction. The repository may store publisher, volume, grade, topic, concept, competency, item-design, misconception, and original generation guidance metadata.

The repository must not store textbook PDFs, extracted body text, machine-read source text, prompts, worked responses, figures, tables, page images, source locators, or embeddings.

## First Slice

The first DSE EPH slice covers:

- EPH volume A for S4 algebra, number, functions, graphs, and coordinate readiness
- EPH volume B for S4 geometry, measurement, trigonometry, data handling, and connected problem solving
- EPH volume C for S5 advanced functions, trigonometry, coordinate geometry, and circle relations
- EPH volume D for S5 probability, statistics, algebraic modelling, and cross-topic synthesis
- EPH volume E for S6 differentiation, final DSE synthesis, and paper readiness

The committed layer is `HK_EPH_MIF` only. `HK_UNITED_PRIME_MIA` remains isolated and continues to receive only DSE UP publisher cards.

## Implementation Boundary

Allowed in repository:

- DSE EPH safe cards in `data/rag/hongKongDseEph.ts`
- deterministic retrieval and evidence-pack builders in `lib/rag/hongKongDseEph.ts`
- tests that verify retrieval, publisher isolation, and source-safety guardrails
- local-only manifest tooling that writes ignored artifacts under `.local/rag/hk-dse-eph/`

Not allowed in repository:

- source PDFs or extracted PDF text
- machine-read source text
- textbook prompts, worked responses, figures, tables, or recognisable layouts
- page locators or source-document excerpts
- raw vector stores or embeddings

## Coordination Notes

- S18 owns the content-safety review of committed safe cards and any generated DSE EPH student-facing content.
- S07 may use the combined HK evidence builder for AI Tutor only through the safe evidence text.
- S04/S05 may generate original practice or lesson content from the safe cards, but must not copy or lightly rewrite any textbook source material.
- S10 should coordinate any future dependency, vector retrieval, or deployment changes.
