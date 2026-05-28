# Mainland BNU Junior S1 Lower Assessment Safe-RAG Decision

- Date: 2026-05-27
- Owner session: S18
- Decision: Approved for safe abstraction only

## Decision

MAIS may use a committed BNU junior S1 lower assessment-pattern layer that stores only source-distant, aggregated pattern cards for original MAIS-authored work.

This layer is allowed for:

- assessment design guidance
- exam-practice planning
- mistake diagnosis guidance
- original question drafting guidance
- revision and challenge-review planning

This layer is not allowed for:

- storing or retrieving original school-paper items
- storing answers, worked solutions, scoring wording, tables, figures, layouts, or item order
- storing source paths, source member names, page locators, hashes, OCR text, embeddings, or vector payloads
- uploading the owner-provided archive contents to external OCR, LLM, or vector services without a separate owner approval

## RAG Boundary

The BNU publisher-specific assessment layer stays separate from:

- the BNU junior textbook safe-abstraction layer
- the shared Mainland junior zhongkao layer
- PEP and HJB publisher-specific RAG layers

Evidence packs may combine these layers only as safe summaries and only for assessment-like intents: `exam-practice`, `assessment-design`, `generate-question`, and `diagnose-mistake`.

## Current Coverage

Approved S1 lower safe cards cover:

- 整式的乘除
- 相交线与平行线
- 概率初步
- 三角形
- 生活中的轴对称
- 变量之间的关系
- 第 1-2 单元月考/阶段综合
- 第 1-3 单元期中综合
- 第 1-4 单元期中综合
- 第 1-6 单元期末综合
- 期中期末高阶综合

## Follow-Up Rule

Any future move from safe abstraction to item-level ingestion requires a new owner decision covering copyright, access control, retention policy, answer-key handling, and whether OCR/vectorization is permitted.
