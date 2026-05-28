# Mainland PEP Primary Safe RAG QA Note

- Date: 2026-05-22
- Session ID: S18
- Scope: People's Education Press primary mathematics P1-P6 upper/lower safe RAG ingestion and retrieval layer
- Status: Implementation ready for local manifest runs; production content use still requires S18 manual sampling.

## Implemented Safety Position

- The first version stores only metadata manifests, safe-card drafts, and QA notes under `.local/rag/mainland-pep-primary/`.
- The ingest scripts do not extract or persist PDF body text, OCR text, exercises, worked examples, answers, tables, illustrations, page images, or page-level descriptions.
- Student-visible primary question-bank generation remains out of scope.
- Public `MAINLAND_PEP_HIGH` curriculum track remains compatible; new internal RAG evidence uses `publisher: "MAINLAND_PEP"` plus `grade` to distinguish P1-P6 from S4-S6.

## Safe Card Coverage

- P1 upper/lower: number sense, within-20 operations, within-100 place value, early shapes, position, time, classification.
- P2 upper/lower: multiplication facts, division meanings, measurement, mixed operations, data organization.
- P3 upper/lower: multi-digit operations, fraction introduction, area, decimals, calendar/time, data reading.
- P4 upper/lower: large numbers, rounding, angle measurement, multi-digit multiplication, decimals, average, geometry language.
- P5 upper/lower: decimal operations, simple equations, polygon area, factors/multiples, fractions, volume, data displays.
- P6 upper/lower: fraction operations, percent, ratio/proportion, coordinates, negative numbers, scale, primary review.

## Retrieval QA

- P1 query `20以内加减法` returns primary P1 safe cards.
- P2 query `乘法口诀` returns the P2 multiplication facts card.
- P3 query `分数初步` returns the P3 fraction introduction card.
- P4 query `大数认识` returns the P4 large-number card.
- P5 query `小数` / `方程` returns the P5 decimal/equation card.
- P6 query `百分数` / `比例` returns P6 percent/proportion safe cards.
- S4-S6 queries return high-school compatibility cards with `legacyCurriculumTrack: "MAINLAND_PEP_HIGH"` and do not retrieve primary cards.

## Required Human Review Before Production Use

- Run the manifest command against the 12 local PDF paths and confirm all P1-P6 upper/lower slots are present.
- S18 should manually sample each PDF locally to confirm the safe draft cards reflect broad unit structure without copying source expression.
- Any future generated student content must be independently authored and separately reviewed for source distance.
- Keep original PDFs, OCR output, extracted text, page screenshots, and page-level notes out of Git and out of RAG evidence.

## Checks

- Passed: `npm run test:rag`
- Partial/blocker: full `npm run type-check` was attempted after pinning TypeScript to 5.8.3, but the app-wide compiler process idled inside broad Next/type definitions for over five minutes and was stopped. The RAG-focused TypeScript compile in `npm run test:rag` passed.
