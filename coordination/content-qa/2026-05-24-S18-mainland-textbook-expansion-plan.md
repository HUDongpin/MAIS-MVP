# Mainland Mathematics Textbook Expansion Plan: BNU And HuJiaoBan

- Date: 2026-05-24
- Session ID: S18
- Workstream: Curriculum QA and content quality
- Status: Planning note, documentation-only
- Owner context: The owner will provide more HuJiaoBan textbooks and exam papers at 2026-05-24 10:00 Asia/Hong_Kong / Asia/Shanghai.

## Executive Summary

MAIS-MVP should treat Mainland mathematics as `one national curriculum standard, multiple textbook editions` rather than as a single People's Education Press implementation. The owner has already provided the Mainland national mathematics curriculum standard, and the repository currently has the most concrete implemented/update path for People's Education Press (`MAINLAND_PEP`) mathematics content.

Two Mainland textbook-edition tracks remain pending:

- Beijing Normal University Press mathematics, already represented in shared publisher vocabulary as `MAINLAND_BNU`, but not yet updated with full textbook/RAG/question/lesson coverage.
- Shanghai Education Press / HuJiaoBan mathematics, not yet represented as a production track and not yet updated with textbook/RAG/question/lesson coverage.

This note registers HuJiaoBan as a future S18 content-ingestion track only. It does not authorize edits to production question banks, lesson source, RAG data, website UI, shared types, or curriculum profile code.

## Current Repository Position

- Mainland PEP has active topic, RAG, lesson, and question-bank workstreams across primary, junior-secondary, and senior-secondary content.
- `TextbookPublisher` currently includes `MAINLAND_PEP` and `MAINLAND_BNU`, but there is no HuJiaoBan publisher identifier yet.
- The first HuJiaoBan phase should not change `CurriculumTrack`, `TextbookPublisher`, `lib/curriculumProfile.ts`, production `data/`, or website UI. A future implementation phase can coordinate with S08/S03 to add a publisher such as `MAINLAND_HJB` if the product needs version-level selection inside the app.

## Source Register

Preliminary external pointer:

- Huatu HuJiaoBan mathematics electronic textbook index: https://he.huatu.com/zt/jsdzkb/books/hjb/shuxue/index.html

Use this page only as a secondary index for discovering likely S1-S6 HuJiaoBan textbook slots. The authoritative ingestion set should be the owner-provided HuJiaoBan textbooks and exam papers delivered after 2026-05-24 10:00 Asia/Hong_Kong / Asia/Shanghai.

Before any extraction or generation work, S18 should record a source inventory with:

- textbook edition name, publisher, grade, semester/volume, file name, owner-provided vs external-index status, and whether the file is textbook or exam/practice paper;
- source licensing and storage boundary;
- whether only metadata was persisted;
- missing slots, duplicate slots, and ambiguous volume labels.

## Safe Ingestion Principles

HuJiaoBan and BNU materials must follow the same safety boundary used for existing Mainland safe-RAG work:

- Commit only safe abstractions: grade/semester metadata, unit-title clusters, concept tags, competency tags, misconception tags, source-distance notes, and QA reports.
- Do not commit textbook PDFs, page images, OCR dumps, exercises, examples, answer text, worked-solution wording, source locators, embeddings, or recognizable source layouts.
- Do not generate student-facing questions or lessons directly from source wording. Student-facing content must be MAIS-authored, source-distant, independently solvable, and manually sampled by S18 before promotion.
- Keep HuJiaoBan and BNU generation separate. Do not blend BNU evidence into HuJiaoBan packs or HuJiaoBan evidence into BNU packs.
- Keep all first-pass outputs candidate-only until S18 signs off on mathematical correctness, Simplified Chinese terminology, grade fit, curriculum-standard alignment, duplicate risk, and source distance.

## Proposed Work Packages

1. Source inventory and coverage map
   - Owner: S18
   - Output: a documentation-only inventory under `coordination/content-qa/`.
   - Goal: confirm HuJiaoBan grade/semester coverage and identify missing materials after the owner provides textbooks and papers.

2. National-standard crosswalk
   - Owner: S18, with S03 coordination before roadmap integration
   - Output: HuJiaoBan unit-to-national-standard alignment matrix.
   - Goal: show how HuJiaoBan sequencing differs from Mainland PEP while preserving the common national standard anchor.

3. Safe-RAG candidate design
   - Owner: S18, with S08 coordination before shared type changes
   - Output: safe abstraction card plan and retrieval separation rules.
   - Goal: decide whether HuJiaoBan needs a new publisher identifier such as `MAINLAND_HJB` before any code implementation.

4. Original content candidate packages
   - Owner: S18 for content QA; S04/S05 only after explicit integration assignment
   - Output: candidate question/lesson packages with solvability, duplicate, source-distance, and manual-review reports.
   - Goal: create HuJiaoBan-aligned student content without exposing original source material.

5. Product integration
   - Owner: S03/S04/S05/S08 depending on surface, after S18 approval
   - Output: roadmap, practice, lesson, and type/profile integration if the owner decides HuJiaoBan should be selectable in the website.

## BNU Track Note

Beijing Normal University Press mathematics should remain a separate pending track. The existence of `MAINLAND_BNU` in shared publisher vocabulary does not mean the content is complete. BNU should receive its own source inventory, standard crosswalk, safe-RAG plan, candidate generation, and QA signoff rather than sharing HuJiaoBan artifacts.

## Checks

Not run: research/documentation-only change. This plan does not edit application code, production data, RAG data, shared types, package configuration, or generated outputs.

## Stop Conditions

Stop and request owner/S10/S08/S03 coordination before:

- adding a HuJiaoBan publisher identifier or changing `types/index.ts`;
- changing `lib/curriculumProfile.ts` or any app-wide curriculum selection behavior;
- writing production `data/` files, RAG cards, question banks, lessons, or website UI;
- using external textbook or exam sources as authoritative instead of owner-provided materials;
- committing any source text, OCR, images, answer keys, or page-level locators.
