# S18 Hong Kong Curriculum RAG Coverage Status

- Date: 2026-05-23
- Session ID: S18
- Scope: Hong Kong mathematics Safe-RAG coverage across EDB P1-S6 curriculum guidance, DSE UP textbooks, DSE EPH textbooks, and DSE examination-pattern evidence.
- Gate decision: Green for internal MAIS Safe-RAG use.

## Executive Confirmation

The owner memory is correct for the local MAIS Safe-RAG layer visible in this workspace.

| Claim | Status | Evidence |
| --- | --- | --- |
| Hong Kong mathematics curriculum standards for P1-S6 have been absorbed into Hong Kong curriculum RAG. | Confirmed | EDB local manifest has 20 PDF metadata entries across whole-curriculum, primary, junior secondary, senior compulsory, M1, M2, support, and implementation stages; committed HK EDB layer has 14 safe cards. |
| Hong Kong senior-secondary DSE UP textbooks have been absorbed. | Confirmed | DSE UP local manifest has 6 PDFs, volumes 4A-6B, S4-S6, no missing expected volumes; committed UP layer has 12 safe cards. |
| Hong Kong senior-secondary DSE EPH textbooks have been absorbed. | Confirmed | DSE EPH local manifest has 5 PDFs, volumes A-E, S4-S6, no missing expected volumes; committed EPH layer has 10 safe cards. |
| DSE Mathematics public exam papers have been absorbed. | Confirmed with recorded metadata anomalies | DSE local manifest has 71 PDF metadata entries for 2012-2023, English 36 and Chinese 35; committed DSE exam-pattern layer has 12 safe cards. |

"Absorbed" here means Safe-RAG abstraction plus metadata-only manifest evidence and deterministic retrieval tests. It does not mean source-recoverable storage, raw vector-store ingestion, extracted PDF body text, OCR text, page images, page locators, answer text, solution text, or embeddings.

## Layer Inventory

| RAG sublayer | Source family | Grade / year coverage | Local manifest signal | Committed safe-card signal | Retrieval entrypoint | Test coverage |
| --- | --- | --- | --- | --- | --- | --- |
| EDB P1-S6 curriculum layer | Hong Kong EDB mathematics curriculum materials | P1-S6, including primary, junior secondary, senior compulsory, M1, M2, support, and implementation planning | 20 PDF metadata entries; stage counts: whole-curriculum 1, primary 4, junior-secondary 3, senior compulsory 5, M1 2, M2 2, support 1, implementation 2 | 14 HK EDB safe cards in `data/rag/hongKongMathEdB.ts` | `buildHongKongMathEdBEvidencePack` and combined `buildHongKongMathEvidencePack` | HK primary, junior, M1, M2, learning-diversity, source-safety, and HK/Mainland separation tests passed |
| DSE UP textbook publisher layer | Owner-provided DSE UP Mathematics and Life senior-secondary textbooks | S4-S6; volumes 4A, 4B, 5A, 5B, 6A, 6B | 6 PDFs; 2,513 page-count signal; 12 safe-card drafts; no missing expected volumes | 12 UP safe cards in `data/rag/hongKongDseUp.ts` | `buildHongKongDseUpEvidencePack`; selected by combined HK evidence for `HK_UNITED_PRIME_MIA` and default HK profile | S4/S5/S6 retrieval, publisher isolation, combined HK evidence, and source-safety tests passed |
| DSE EPH textbook publisher layer | Owner-provided DSE EPH Mathematics in Focus senior-secondary textbooks | S4-S6; volumes A, B, C, D, E | 5 PDFs; 1,571 page-count signal; 10 safe-card drafts; no missing expected volumes | 10 EPH safe cards in `data/rag/hongKongDseEph.ts` | `buildHongKongDseEphEvidencePack`; selected by combined HK evidence for `HK_EPH_MIF` | S4/S5/S6 retrieval, publisher isolation, combined HK evidence, and source-safety tests passed |
| DSE exam-pattern layer | Hong Kong DSE Mathematics paper metadata and aggregated pattern analysis | 2012-2023; English and Chinese; Paper 1, Paper 2, answer-file metadata where present | 71 PDFs: English 36, Chinese 35; 24 Paper 1, 25 Paper 2, 22 answer-file entries | 12 DSE exam-pattern safe cards in `data/rag/hongKongDseMathExamPatterns.ts` | `buildHongKongDseMathEvidencePack`; always included by combined HK evidence | Paper 1, Paper 2, concept retrieval, combined HK evidence, and source-safety tests passed |

## Combined HK Evidence Behavior

The combined builder `buildHongKongMathEvidencePack` currently behaves as expected:

- HK default / `HK_UNITED_PRIME_MIA`: returns EDB curriculum guidance + DSE UP textbook publisher guidance + DSE exam-pattern guidance.
- `HK_EPH_MIF`: returns EDB curriculum guidance + DSE EPH textbook publisher guidance + DSE exam-pattern guidance.
- Publisher isolation is enforced by tests: UP profiles do not receive EPH cards, and EPH profiles do not receive UP cards.
- DSE exam-pattern guidance is publisher-neutral and remains available for both HK publisher profiles.

## Known Anomalies And Boundaries

| Area | Current note | Status |
| --- | --- | --- |
| DSE 2023 answer files | English and Chinese 2023 archives have paper metadata but no answer-file metadata. | Recorded as known missing answer-file metadata, not a coverage failure. |
| DSE 2018 English Paper 2 | One extra Paper 2 variant is present in the English metadata family. | Recorded as an extra variant requiring awareness, not a retrieval failure. |
| DSE duplicate hashes | Two duplicate-hash groups are recorded in the manifest summary. | Metadata anomaly recorded; no source content is persisted. |
| External vector DB / cloud knowledge base | This review only confirms repository and local `.local/rag` Safe-RAG state. | Not verified; requires a separate platform/vector-store audit if needed. |

The committed repository must continue to exclude raw source PDFs, ZIPs, PDF body text, OCR text, copied questions, textbook prompts, worked responses, answer text, solution wording, figures, tables, page images, page locators, raw embeddings, and source-recoverable vector stores.

## Future Update Workflow

When the owner provides additional Hong Kong primary or junior-secondary textbooks, practice books, or school/exam papers:

1. Build a metadata-only manifest first, with file counts, coarse grade/volume/paper signals, checksums when appropriate, and explicit safety notes.
2. Ask S18 to review the source family and convert only safe abstractions into committed safe cards.
3. Add deterministic retrieval tests for grade, topic, publisher/source-family isolation, and source-safety guardrails.
4. Run `npm run test:rag` before handoff.
5. Keep raw materials and generated local manifests under ignored local storage; do not commit source files or source-recoverable artifacts.

## Verification Run

- `npm run test:rag`: Passed on 2026-05-23 HKT.
- Result: 60/60 Node RAG tests passed after all manifest self-tests.
- Covered HK checks included:
  - primary HK queries prioritize primary curriculum cards and avoid senior modules;
  - junior algebra/geometry queries return junior-secondary guidance;
  - DSE UP S4-S6 retrieval and publisher isolation;
  - DSE EPH S4-S6 retrieval and publisher isolation;
  - DSE Paper 1 / Paper 2 / concept-pattern retrieval;
  - combined HK evidence pack includes curriculum, selected textbook publisher layer, and DSE exam-pattern guidance;
  - source-copying artifact guardrails for HK EDB, DSE UP, DSE EPH, and DSE exam-pattern layers.

## Follow-Up Recommendations

1. If the owner wants proof of external vector-store or cloud knowledge-base ingestion, schedule a separate S10/S12/S19 audit because this report intentionally covers only local repository and `.local/rag` evidence.
2. Before any generated student-facing HK textbook- or DSE-style questions are released, S18 should manually sample for source distance, mathematical correctness, and Hong Kong curriculum fit.
3. For future primary/junior Hong Kong uploads, create a new manifest and QA note per source family so coverage growth remains auditable.
