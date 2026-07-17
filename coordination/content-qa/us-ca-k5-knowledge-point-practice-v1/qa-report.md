# S18 Two-Round QA Report - us-ca-k5-knowledge-point-practice-v1

## Verdict

Decision: `candidate-only-two-round-qa-pass`.

This package creates practice questions for the new California K-G5 RAG/textbook/micro-lesson knowledge-point topics and remains explicitly **not live-integrated**. It is not an approval for S04/S05 live data edits, route exposure, public curriculum claims, or production release.

## Scope

- Session owners: S21 content pipeline generation; S18 curriculum QA.
- Curriculum track: `US_CA_MATH`.
- Grade span: `K`, `P1`, `P2`, `P3`, `P4`, `P5`.
- Source knowledge-point packages: `us-ca-math-k-g5-textbooks-v1`, `us-ca-math-grade1-h-l-micro-lessons-v1`.
- Topic count: 41.
- Question count: 492.
- Questions per knowledge point: 12.
- Grade counts: K=72, P1=192, P2=48, P3=60, P4=60, P5=60.
- Source topic coverage: k-g5-textbook-lesson=29, grade1-micro-lesson=12.

## Round 1: Deterministic QA

- Method: deterministic inventory, answer-key, MC uniqueness, source-visible text, and no-old-topic checks.
- Status: `pass`.
- Accepted rows: 492/492.
- Error count: 0.
- Warning count: 0.

## Round 2: Independent QA

- Method: independent coverage, grade-fit, difficulty/type variety, bilingual-field, standard-retention, and no-live-integration review.
- Status: `pass`.
- Accepted rows: 492/492.
- Error count: 0.
- Warning count: 0.

## Source And Copyright Boundary

- The package uses public standards identifiers, existing MAIS-authored knowledge-point metadata, and fresh deterministic contexts/values.
- No raw textbook text, private corpus chunks, IXL exercise text, IXL preview wording, official standard prose, released assessment items, screenshots, answer keys, or copied diagrams are committed.
- Student-facing text was scanned for provider labels, IXL labels, candidate labels, source-distance labels, and broad public claims.

## Integration Boundary

- `integrationStatus`: `candidate-only-not-live`.
- Live files intentionally not edited: `data/usCaliforniaQuestions.ts`, `data/usCaliforniaTopics.ts`, `data/usCaliforniaLessons.ts`, S04 practice routes, S05 lesson `practiceQuestionIds`, app routes, and tests.
- If the owner later asks to promote this package, S23 must create a promotion plan, S04/S05 must receive explicit live write scope, S11 must run route/regression checks, and S22 must handle release readiness.

## Risks And Follow-Up

- This is a topic-adapted seed bank, not a complete production bank.
- Some bilingual Chinese fields are functional direct translations from deterministic templates and should receive S09 language polish before public release.
- No answer-critical visuals are included. Future visual/manipulative rows require deterministic SVG/exact-layer review.

## Evidence Files

- `question-pack.json`
- `topic-coverage.json`
- `qa-round-1.json`
- `qa-round-2.json`
- `solvability-audit.json`
- `solvability-audit.csv`
- `solvability-audit.md`
- `manual-review-results.csv`
