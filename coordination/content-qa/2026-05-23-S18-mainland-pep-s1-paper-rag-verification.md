# Mainland PEP S1 Paper-Pattern Safe-RAG Verification

- Date: 2026-05-23
- Session ID: S18
- Scope: Safe absorption of local `7上初中数学试卷.zip` and `7下初中数学试卷.zip` as S1 upper/lower Mainland PEP junior paper-pattern RAG guidance.
- Verdict: Implemented as local metadata manifest plus committed safe abstraction cards. Final targeted RAG checks passed; final full npm compiler gates were inconclusive because local `tsc` stalled without diagnostics after the last S1-only adjustment.

## Executive Summary

- Added a stricter S1-only metadata manifest script for the two local paper ZIPs.
- Generated an ignored local manifest under `.local/rag/mainland-pep-junior-s1-papers/`.
- Added 12 S1 paper-pattern safe cards covering 7上 and 7下 unit, synchronous-practice, topic-practice, and term-review patterns.
- Wired deterministic retrieval so explicit S1 queries can surface `juniorPaperPatternCards` before the broader S1-S3 zhongkao pattern layer.
- Preserved separation: P1-P6, S2-S3, and S4-S6 queries do not return S1 paper-pattern cards.

## Local Manifest Result

The manifest is local-only and ignored by Git.

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| 7上 supported files | 261 |
| 7下 supported files | 264 |
| Total supported files | 525 |
| Ignored visible files | 0 |
| Total bytes recorded as metadata | 179,273,177 |
| Answer-label files | 207 |
| Solution-label files | 162 |

Grade-semester coverage:

| Slot | Files | Extensions |
| --- | ---: | --- |
| S1 upper | 261 | `.docx` 253, `.pdf` 8 |
| S1 lower | 264 | `.doc` 5, `.docx` 256, `.pdf` 3 |

Aggregate unit-signal counts:

| Unit signal | Count |
| --- | ---: |
| 有理数 | 60 |
| 一元一次方程 | 45 |
| 整式加减 | 42 |
| 二元一次方程组 | 34 |
| 平面直角坐标系 | 30 |
| 实数 | 27 |
| 不等式 | 25 |
| 相交线与平行线 | 25 |
| 几何图形 | 18 |
| 数据收集整理 | 15 |
| Unknown or broad review | 266 |

Aggregate material-kind counts:

| Material kind | Count |
| --- | ---: |
| midterm-final | 268 |
| sync-practice | 181 |
| unit-test | 85 |
| tiered-practice | 65 |
| error-extension | 57 |
| topic-practice | 40 |
| calculation-practice | 29 |
| comprehensive-assessment | 29 |
| problem-solving | 9 |

## Implementation Notes

- Manifest script: `scripts/build-mainland-pep-junior-paper-manifest.py`
- Safe-card data: `data/rag/mainlandPepJuniorPaperPatterns.ts`
- Retrieval/evidence builder: `lib/rag/mainlandPepJuniorPaperPatterns.ts`
- Unified API wiring: `lib/rag/mainlandPep.ts`
- Shared types: `types/index.ts`
- Test coverage: `lib/rag/mainlandPep.test.ts`
- Package script: `rag:mainland-pep-junior-paper-manifest`

## Safety Boundary

No paper ZIPs, document body text, answer text, worked-solution text, tables, images, page content, page images, OCR dumps, embeddings, page locators, archive-entry paths, file-order reconstruction, or protected item wording were committed.

Committed cards store only abstract metadata and generation guidance: grade, semester, material kinds, assessment families, unit-title clusters, concept tags, competency tags, item-design tags, misconception tags, pattern summaries, and reuse restrictions.

## Checks

- Passed: `python3 scripts/build-mainland-pep-junior-paper-manifest.py --self-test`
- Passed: `npm run rag:mainland-pep-junior-paper-manifest -- <7上 zip> <7下 zip>`
  - Result: 525 metadata-only S1 file entries in the ignored local manifest.
- Passed: targeted Mainland PEP RAG runtime test via TypeScript transpile hook.
  - Result: 29/29 Mainland PEP tests passed, including S1 upper/lower paper-pattern retrieval, unified helper parity, grade separation, evidence-pack layering, and safety scans.
- Attempted: `npm run test:rag`
  - All manifest self-tests passed through the new junior paper manifest self-test.
  - The final full run stalled at `tsc -p tsconfig.rag.json` with no diagnostics and was terminated after confirming the targeted final Mainland PEP runtime checks passed.
- Attempted: `npm run type-check`
  - The final full-project run stalled at `tsc --noEmit --incremental false` with no diagnostics and was terminated.

## Remaining Risk

Full npm compiler gates should be rerun in a stable local window before release promotion. The final changed RAG behavior itself is covered by the targeted 29/29 Mainland PEP runtime test plus manifest self-tests and safety scans.

Any future generated S1 student-facing practice, lesson, tutor, diagnostic, or assessment output must go through a separate S18 QA package for source distance, mathematical correctness, Mainland terminology, and grade fit.

## Copyright And Use Notes

- PEP resources must remain subject to the PEP electronic resource copyright statement: https://www.pep.com.cn/tsg/tsg_zydh/tsg_zydh_bqsm/
- China copyright law protects reproduction, network dissemination, adaptation, and compilation rights: https://www.wipo.int/wipolex/edocs/lexdocs/laws/en/cn/cn001en.html
- National Copyright Administration public case material confirms textbook copyright protection: https://www.ncac.gov.cn/xxfb/yjdt/201906/t20190626_49544.html
