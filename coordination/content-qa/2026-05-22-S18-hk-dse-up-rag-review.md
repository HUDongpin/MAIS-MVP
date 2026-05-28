# S18 HK DSE UP Textbook Safe-RAG Review

- Date: 2026-05-22
- Session ID: S18
- Scope: DSE UP `数学与生活` S4-S6 textbook safe-card layer, local manifest tooling, deterministic retrieval, and combined HK evidence-pack behavior
- Gate decision: Green for internal safe-RAG development use

## Evidence Reviewed

- `data/rag/hongKongDseUp.ts`
- `lib/rag/hongKongDseUp.ts`
- `lib/rag/hongKongDseUp.test.ts`
- `lib/rag/hongKongMath.ts`
- `scripts/build-hk-dse-up-textbook-manifest.py`
- `types/index.ts`
- `coordination/decisions/2026-05-22-hk-dse-up-safe-rag.md`

## Coverage

| Area | Status |
| --- | --- |
| S4 UP coverage | Algebra foundations, functions, coordinate methods, geometry, trigonometry, data handling |
| S5 UP coverage | Advanced functions, trigonometry, coordinate/circle geometry, probability, statistics, algebraic modelling |
| S6 UP coverage | Differentiation, senior synthesis, final DSE revision, bilingual terminology, paper skills |
| Publisher isolation | `HK_UNITED_PRIME_MIA` receives UP cards; `HK_EPH_MIF` receives no UP cards |
| Source retention | Committed safe cards only; local manifest artifacts stay under ignored `.local/` |

## Safety Review

The committed DSE UP layer contains abstract chapter, concept, competency, item-design, misconception, and generation-guidance metadata only. It does not include textbook body text, prompts, worked responses, figures, tables, page images, source locators, or embeddings.

The local manifest script records metadata, checksums, volume/grade signals, page-count signals, and safe chapter abstractions. It does not parse or persist PDF body text or page images.

## Acceptance Notes

- The layer is suitable for internal RAG evidence and original MAIS-authored lesson/question generation.
- The layer is not a raw textbook retrieval system.
- EPH remains separate; no EPH publisher assumptions are made from UP material.

## Follow-Up

1. Run the local manifest script against the six owner-provided PDFs when a fresh local audit artifact is needed.
2. S18 should manually sample any future generated DSE UP questions before they become student-visible.
3. S07 should keep AI Tutor output constrained to safe evidence text and should not expose local manifest paths or source metadata.
