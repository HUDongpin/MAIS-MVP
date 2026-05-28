# S18 HK DSE EPH Textbook Safe-RAG Review

- Date: 2026-05-22
- Session ID: S18
- Scope: DSE EPH Mathematics in Focus S4-S6 textbook safe-card layer, local manifest tooling, deterministic retrieval, and combined HK evidence-pack behavior
- Gate decision: Green for internal safe-RAG development use

## Evidence Reviewed

- `data/rag/hongKongDseEph.ts`
- `lib/rag/hongKongDseEph.ts`
- `lib/rag/hongKongDseEph.test.ts`
- `lib/rag/hongKongMath.ts`
- `scripts/build-hk-dse-eph-textbook-manifest.py`
- `types/index.ts`
- `coordination/decisions/2026-05-22-hk-dse-eph-safe-rag.md`

## Coverage

| Area | Status |
| --- | --- |
| EPH A coverage | S4 algebra, number, functions, graphs, and coordinate readiness |
| EPH B coverage | S4 geometry, measurement, trigonometry, data handling, and connected problem solving |
| EPH C coverage | S5 advanced functions, trigonometry, coordinate geometry, and circle relations |
| EPH D coverage | S5 probability, statistics, algebraic modelling, and cross-topic synthesis |
| EPH E coverage | S6 differentiation, final synthesis, and DSE paper readiness |
| Publisher isolation | `HK_EPH_MIF` receives EPH cards; `HK_UNITED_PRIME_MIA` continues to receive UP cards |
| Source retention | Committed safe cards only; local manifest artifacts stay under ignored `.local/` |

## Local Source Signals

The local manifest tooling is calibrated to the owner-provided five-PDF set and records metadata only.

| Volume | Page-count signal |
| --- | ---: |
| A | 258 |
| B | 298 |
| C | 370 |
| D | 367 |
| E | 278 |

## Safety Review

The committed DSE EPH layer contains abstract chapter, concept, competency, item-design, misconception, and generation-guidance metadata only. It does not include textbook body text, prompts, worked responses, figures, tables, page images, source locators, or embeddings.

The local manifest script records metadata, checksums, volume/grade signals, page-count signals, and safe chapter abstractions. It does not parse or persist PDF body text or page images.

## Acceptance Notes

- The layer is suitable for internal RAG evidence and original MAIS-authored lesson/question generation.
- The layer is not a raw textbook retrieval system.
- DSE UP remains separate; no UP publisher assumptions are made from EPH material.

## Follow-Up

1. Run the local manifest script against the five owner-provided PDFs when a fresh local audit artifact is needed.
2. S18 should manually sample any future generated DSE EPH questions before they become student-visible.
3. S07 should keep AI Tutor output constrained to safe evidence text and should not expose local manifest paths or source metadata.
