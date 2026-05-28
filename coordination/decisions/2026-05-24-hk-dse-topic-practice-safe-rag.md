# HK DSE Topic-Practice Safe-RAG Decision

Date: 2026-05-24

## Decision

MAIS may use the owner-provided Hong Kong DSE Mathematics topic-practice archive as a local-private analysis source for aggregated topic-practice safe cards. The committed repository must keep only metadata tooling, safe abstractions, retrieval code, tests, and review notes.

This source family is publisher-neutral for Hong Kong DSE Core Mathematics. It may support both `HK_UNITED_PRIME_MIA` and `HK_EPH_MIF` profiles because the DSE Mathematics examination is based on the shared Hong Kong curriculum standard.

## Allowed In Repository

- Aggregated topic-practice safe cards by paper component, topic cluster, concept, competency, item type, difficulty, misconception family, and original-generation guidance.
- Metadata-only manifest tooling that records language, paper component, topic coverage, aggregate-file signals, file size, checksum, duplicate signals, and missing-topic signals.
- Evidence-pack guard language requiring original MAIS-authored teaching, diagnostic, practice, hints, diagrams, and explanations.

## Not Allowed In Repository

- Source ZIPs, extracted PDFs, page images, PDF body text, OCR text, copied questions, option sets, answers, worked solutions, diagrams, tables, source locators, page references, raw embeddings, or any source-recoverable vector-store artifacts.
- Any committed per-item reconstruction that would let a user identify or recover a source exercise.

## Implementation Notes

- The committed safe-card family remains under `curriculumTrack: "HK"` and is merged into the existing DSE Mathematics exam-pattern layer.
- The local manifest output stays under `.local/rag/hk-dse-topic-practice/manifest.json`.
- Future Chinese topic-practice packs should be reviewed as a separate source family with a fresh manifest and S18 safety review.
