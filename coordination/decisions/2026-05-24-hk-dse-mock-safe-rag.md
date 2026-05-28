# HK DSE Mock-Paper Safe-RAG Decision

Date: 2026-05-24

## Decision

MAIS may use the owner-provided Hong Kong DSE Mathematics mock-paper archive as a local-private metadata source for aggregated mock-paper safe cards. The committed repository must keep only metadata tooling, safe abstractions, retrieval code, tests, and review notes.

This source family is publisher-neutral for Hong Kong DSE Core Mathematics. Local path names that mention a publisher are source-location signals only and must not become a RAG publisher dimension. The mock-paper guidance may support both `HK_UNITED_PRIME_MIA` and `HK_EPH_MIF` profiles because the DSE Mathematics examination follows the shared Hong Kong curriculum standard.

## Allowed In Repository

- Aggregated mock-paper safe cards by paper component, full-paper practice goal, competency, item type, difficulty, misconception family, and original-generation guidance.
- Metadata-only manifest tooling that records owner-declared language, filename language signal, CE/DSE year signal, paper component, paper-vs-review file kind, file size, checksum, hidden-entry handling, and year-pairing signals.
- Evidence-pack guard language requiring original MAIS-authored teaching, diagnostic, practice, hints, diagrams, review routines, and teacher planning.

## Not Allowed In Repository

- Source ZIPs, extracted PDFs, page images, PDF body text, OCR text, copied questions, option sets, answers, worked solutions, diagrams, tables, source locators, page references, raw embeddings, or any source-recoverable vector-store artifacts.
- Any committed per-item reconstruction that would let a user identify or recover a source mock-paper item.
- Publisher-specific routing based on local archive path names.

## Implementation Notes

- The committed safe-card family remains under `curriculumTrack: "HK"` and is merged into the existing DSE Mathematics exam-pattern layer.
- The local manifest output stays under `.local/rag/hk-dse-mock/manifest.json`.
- Filename markers that suggest a language mismatch are recorded only as review metadata. The source family remains owner-declared English for this absorption pass.
- Future Paper 2, Chinese, or explicitly bilingual mock-paper packs should be reviewed through a separate metadata manifest and S18 safety gate before safe-card expansion.
