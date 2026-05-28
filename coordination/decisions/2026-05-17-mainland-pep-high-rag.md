# Mainland PEP High-School RAG Decision

- Date: 2026-05-17
- Session: S10 with owner-granted S08/S18 implementation scope
- Topic: MAIS-safe absorption and deterministic RAG for Mainland PEP high-school mathematics
- Status: Implemented as first server-side safe-card slice

## Decision

MAIS will start Mainland PEP high-school support with a safe-card RAG layer, not raw textbook retrieval.

The first code slice introduces `MAINLAND_PEP_HIGH` as a curriculum track and stores only de-copyrighted structural cards in the MAIS repository. Original curriculum standards, textbooks, exam papers, and official solutions remain in local private storage or future controlled private cloud storage.

## Implementation Boundary

The repository may contain:

- curriculum graph labels
- concept IDs
- competency tags
- item-type tags
- safe summaries
- generation guidance
- misconception tags
- originality and non-reuse guards

The repository must not contain:

- PDF textbooks or scans
- OCR dumps
- textbook example wording
- exam paper stems
- official solution wording
- page screenshots or source figures
- long source passages

## First Slice

The first slice covers 18 high-school chapters across:

- 必修 第一册 A版
- 必修 第二册 A版
- 选择性必修 第一册 A版
- 选择性必修 第二册 A版
- 选择性必修 第三册 A版

It uses deterministic retrieval by concept IDs, chapter, competency tags, item-type tags, and difficulty band. No vector database or embedding dependency is introduced in this slice.

## Coordination Notes

- S08 owns shared type integration.
- S10 owns documentation, script, and coordination changes.
- S07 should own any future AI Tutor prompt/context wiring.
- S18 should review safe-card content and future generated questions for curriculum alignment and copyright safety.
- Future high-school exam-paper ingestion must extract only topic distribution, item structure, difficulty gradient, solution strategy patterns, and misconception patterns. It must not store original stems or official explanations.

## Follow-Up

Future implementation may add:

- student curriculum-track selection
- AI Tutor evidence-pack injection behind explicit `MAINLAND_PEP_HIGH` filtering
- teacher/admin tools for reviewing generated Mainland PEP questions
- optional vector retrieval after S10 coordinates dependency and deployment implications
