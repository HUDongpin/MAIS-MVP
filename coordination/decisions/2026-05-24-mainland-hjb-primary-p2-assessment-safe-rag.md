# Mainland HJB Primary P2 Assessment Safe-RAG Decision

- Date: 2026-05-24
- Session: S18 with owner-approved S08/S10 implementation scope
- Topic: Safe absorption of owner-provided Shanghai Education Press Grade 2 upper unit, midterm, and final assessment archives
- Status: Implemented as local-only assessment metadata tooling plus committed safe assessment-pattern cards

## Decision

MAIS will absorb the owner-provided Shanghai Education Press Grade 2 upper assessment archives only as aggregated assessment-pattern guidance for `MAINLAND_HJB` primary P2 support.

The repository may store broad assessment families, unit labels, concept IDs, competency tags, skill tags, item-type tags, misconception tags, safe pattern summaries, and original MAIS generation guidance.

The repository must not store source archives, extracted document body text, OCR text, protected stems, answer wording, worked responses, scoring wording, tables, figures, page images, page locators, source paths, source-recoverable member listings in committed RAG, or embedding payloads.

## Implemented Slice

This slice adds P2 upper HJB primary assessment-pattern cards for:

- unit checks around `100以内数的加减法（二）`
- unit checks around `欢乐购物街 / 人民币与购物应用`
- unit checks around `表内乘法`
- P2 upper midterm-style integrated assessment
- P2 upper final-style integrated assessment

These cards support original MAIS diagnostics, assessment planning, tutor support, and future question drafting only. They do not authorize copying assessment items, reconstructing source papers, generating a public student question bank, changing adaptive recommendations, or wiring live AI Tutor runtime behavior.

## Local Manifest Tool

`python3 scripts/build-mainland-hjb-primary-assessment-manifest.py --out-dir .local/rag/mainland-hjb-primary-p2-upper-assessments <private-zip-paths>` builds local-only metadata artifacts under ignored `.local/` storage.

The script records archive/member metadata, hashes, extensions, coarse role classification, assessment-family classification, difficulty signals, source-status signals, duplicate groups, and P2 upper unit signals only. It does not extract or persist protected document text, answers, worked responses, scoring wording, OCR text, page images, page locators, or embeddings.

## Source-Distance Policy

Current/new-material signals may inform aggregated pattern cards after S18 review. Legacy or old-curriculum entries remain quarantined as local metadata and must not influence committed RAG unless the owner explicitly assigns a separate alignment review.

Committed cards must stay MAIS-authored and source-distant: new values, contexts, diagrams, distractors, hints, checks, explanations, and ordering are required for any generated output.

## Coordination Notes

- S18 owns curriculum/content QA and source-distance review.
- S08 owns deterministic RAG compatibility if shared type or retrieval behavior changes.
- S10 owns package script and RAG gate coordination.
- S04/S05/S07/S15 should not expose student-facing questions, lessons, AI Tutor evidence routing, or adaptive behavior from this layer without separate quality and source-distance approval.
