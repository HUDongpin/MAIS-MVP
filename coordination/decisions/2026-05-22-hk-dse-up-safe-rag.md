# HK DSE UP Textbook Safe-RAG Decision

- Date: 2026-05-22
- Session: S18
- Topic: Safe absorption of owner-provided DSE UP `数学与生活` senior-secondary textbooks
- Status: Implemented as publisher-specific safe-card layer

## Decision

MAIS may use the six owner-provided DSE UP `数学与生活` textbook PDFs only as local-private analysis sources for safe-card abstraction. The repository may store publisher, volume, grade, topic, concept, competency, item-design, misconception, and original generation guidance metadata.

The repository must not store textbook PDFs, extracted body text, machine-read source text, prompts, worked responses, figures, tables, page images, source locators, or embeddings.

## First Slice

The first DSE UP slice covers:

- `4A` and `4B` for S4
- `5A` and `5B` for S5
- `6A` and `6B` for S6

The committed layer is `HK_UNITED_PRIME_MIA` only. `HK_EPH_MIF` remains isolated and receives no UP publisher cards until a separate EPH review exists.

## Implementation Boundary

Allowed in repository:

- DSE UP safe cards in `data/rag/hongKongDseUp.ts`
- deterministic retrieval and evidence-pack builders in `lib/rag/hongKongDseUp.ts`
- tests that verify retrieval, publisher isolation, and source-safety guardrails
- local-only manifest tooling that writes ignored artifacts under `.local/rag/hk-dse-up/`

Not allowed in repository:

- source PDFs or extracted PDF text
- machine-read source text
- textbook prompts, worked responses, figures, tables, or recognisable layouts
- page locators or source-document excerpts
- raw vector stores or embeddings

## Coordination Notes

- S18 owns the content-safety review of committed safe cards and any generated DSE UP student-facing content.
- S07 may use the combined HK evidence builder for AI Tutor only through the safe evidence text.
- S04/S05 may generate original practice or lesson content from the safe cards, but must not copy or lightly rewrite any textbook source material.
- S10 should coordinate any future dependency, vector retrieval, or deployment changes.
