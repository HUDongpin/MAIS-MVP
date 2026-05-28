# Hong Kong Math EDB Safe-RAG Decision

- Date: 2026-05-20
- Topic: Safe absorption of Hong Kong EDB mathematics curriculum materials
- Status: Implemented as aggregated HK curriculum safe-card layer

## Decision

MAIS will absorb Hong Kong EDB mathematics curriculum materials only as aggregated safe-card knowledge. The repository may store stage, document-purpose, grade, topic, competency, item-design, misconception, and original generation guidance metadata.

The repository must not store PDF body text, source wording, worked examples, source figures, tables, scoring language, or paper stems.

## First Slice

The first HK slice covers the 20-file EDB curriculum bundle through:

- whole-curriculum guide
- primary learning content, KS1/KS2 interpretation, and revision comparison
- junior secondary learning content, interpretation, and revision comparison
- senior compulsory learning content and assessment guidance
- senior M1 and M2 extension guidance
- senior learning-diversity support
- implementation timeline planning

Retrieval remains deterministic and dependency-free. It ranks by grade, stage, document purpose, topic, concept, competency, item-design tags, difficulty band, and intent.

## Local Manifest Script

`npm run rag:hk-edb-manifest -- <zip-path>` builds a local-only manifest under `.local/rag/` by default. The manifest contains ZIP directory metadata and coarse classification only.

The script must not extract or persist document body text, source examples, figures, tables, scoring language, or page content.
