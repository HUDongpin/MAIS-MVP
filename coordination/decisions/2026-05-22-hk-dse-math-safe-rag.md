# HK DSE Mathematics Safe-RAG Decision

Date: 2026-05-22

## Decision

MAIS may use the owner-provided Hong Kong DSE Mathematics paper archives only as a local-private analysis source for aggregated exam-pattern safe cards. The committed repository must keep only safe abstractions, deterministic retrieval code, tests, and metadata-only tooling.

## Allowed In Repository

- Aggregated DSE pattern cards by paper component, topic cluster, concept, competency, item type, difficulty, misconception family, and original-generation guidance.
- Manifest tooling that records archive metadata, years, language variant, paper component, file size, checksum, duplicate signals, and missing-file signals.
- Evidence-pack guard language that requires original MAIS-authored questions, explanations, hints, diagrams, and teaching notes.

## Not Allowed In Repository

- Source ZIPs, extracted PDFs, images, scans, source text, machine-extracted source text, embeddings, source locators, source item wording, option sets, marking wording, worked responses, or recognisable layouts.
- Any committed per-item reconstruction that would let a user identify or recover a source paper item.

## Implementation Notes

- The DSE family stays under `curriculumTrack: "HK"` but remains separate from existing EDB curriculum guidance cards.
- AI Tutor HK evidence can combine EDB curriculum cards and DSE exam-pattern cards, but the combined pack is still safe-card-only.
- Future M1/M2 or newer-year DSE archives should be added as new safe-card families only after a fresh metadata manifest and S18 content-safety review.
