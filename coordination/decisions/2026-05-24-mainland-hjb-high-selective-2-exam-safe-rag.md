# Decision: Mainland HJB Selective-Compulsory 2 Assessment Safe RAG

- Date: 2026-05-24
- Session: S18 with owner-granted S08/S10 implementation scope
- Scope: Shanghai Education Press senior-secondary mathematics selective-compulsory-two assessment-pattern layer

## Decision

MAIS will absorb the owner-provided HJB selective-compulsory-two unit and midterm-review archives as safe-card assessment patterns only. The project will not ingest, commit, vectorize, OCR, quote, paraphrase, or redistribute source prompts, worked responses, scoring wording, tables, images, page locators, source paths, or embeddings.

## Boundaries

- `selective-compulsory-2` is added as an HJB assessment volume scope.
- Unit-test cards cover chapter 5 derivatives, chapter 6 counting principles, chapter 7 probability continuation, and chapter 8 bivariate-data analysis.
- Current review evidence is treated as midterm bridge material. The observed `期中期末总复习-P158` archive is not used to invent final-exam cards.
- Review entries involving selective-compulsory-one chapters, including lines, conics, sequences, and space vectors, are marked as cross-volume bridge evidence and do not count as selective-compulsory-two coverage completion.
- The committed RAG surface remains deterministic safe-card retrieval; no vector database or embedding dependency is introduced.

## Implementation Notes

- HJB, PEP, and BNU remain publisher-separated at the textbook and assessment layers.
- Shared Mainland senior-secondary exam-pattern cards may still support HJB through the national-standard concept spine.
- Cross-volume HJB review cards are returned only when a query explicitly asks for `cross-volume-review` or names cross-volume chapters/concepts.
- Local manifest outputs stay under `.local/rag/mainland-hjb-high-exams/` and remain ignored owner-private artifacts.

## Follow-Up Gate

Any future student-facing HJB generated questions, lessons, or paper-like sets need a separate S18 source-distance QA pass and owner-approved S03/S04/S05 integration work.
