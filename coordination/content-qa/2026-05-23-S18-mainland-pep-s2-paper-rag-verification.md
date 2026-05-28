# Mainland PEP S2 Paper-Pattern Safe-RAG Verification

- Date: 2026-05-23
- Session ID: S18
- Scope: Safe absorption of local `8上初中数学试卷.zip` and `8下初中数学试卷.zip` as S2 upper/lower Mainland PEP junior paper-pattern RAG guidance.
- Verdict: Implemented as local metadata manifest plus committed safe abstraction cards. The local manifest confirms both S2 expected slots; latest full TypeScript gates are blocked by local `tsc` hangs without diagnostics.

## Executive Summary

- Extended the junior paper manifest script from S1-only intake to S1-S3-capable junior intake with explicit `--expected-slot` coverage checks.
- Generated an ignored local manifest under `.local/rag/mainland-pep-junior-papers/`.
- Added 12 S2 paper-pattern safe cards: 6 for 8上 and 6 for 8下.
- Wired deterministic retrieval so S2 queries can surface `juniorPaperPatternCards` while P1-P6, S3, and S4-S6 remain isolated from S2 paper-pattern cards.
- Preserved the safety boundary: no source paper text, answer text, solution text, OCR, page locators, source paths, item order, or recognizable source wording is committed.

## Local Manifest Result

The manifest is local-only and ignored by Git.

| Metric | Result |
| --- | ---: |
| Archives inspected | 2 |
| 8上 supported files | 306 |
| 8下 supported files | 184 |
| Total supported files | 490 |
| Ignored visible files | 0 |
| Total bytes recorded as metadata | 199,578,682 |
| Answer-label files | 186 |
| Solution-label files | 122 |

Grade-semester coverage:

| Slot | Files | Extensions |
| --- | ---: | --- |
| S2 upper | 306 | `.doc` 1, `.docx` 300, `.pdf` 5 |
| S2 lower | 184 | `.docx` 181, `.pdf` 3 |

Per-archive role distribution:

| Archive | Slot | Files | Role distribution |
| --- | --- | ---: | --- |
| `8上初中数学试卷.zip` | S2 upper | 306 | paper 117, answer 104, solution 82, answer-solution 3 |
| `8下初中数学试卷.zip` | S2 lower | 184 | answer 79, paper 68, solution 37 |

Aggregate unit-signal counts:

| Unit signal | Count |
| --- | ---: |
| 三角形 | 101 |
| 轴对称 | 50 |
| 分式 | 47 |
| 四边形 | 37 |
| 二次根式 | 33 |
| 勾股定理 | 28 |
| 一次函数 | 17 |
| 整式加减 | 17 |
| 整式乘法与因式分解 | 15 |
| 数据分析 | 6 |
| Unknown or broad review | 179 |

Aggregate material-kind counts:

| Material kind | Count |
| --- | ---: |
| sync-practice | 275 |
| tiered-practice | 203 |
| midterm-final | 132 |
| comprehensive-assessment | 110 |
| topic-practice | 56 |
| unit-test | 38 |
| error-extension | 30 |
| calculation-practice | 11 |
| problem-solving | 3 |

## Implementation Notes

- Manifest script: `scripts/build-mainland-pep-junior-paper-manifest.py`
- Safe-card data: `data/rag/mainlandPepJuniorPaperPatterns.ts`
- Retrieval/evidence builder: `lib/rag/mainlandPepJuniorPaperPatterns.ts`
- Unified API wiring: `lib/rag/mainlandPep.ts`
- Shared types: `types/index.ts`
- Test coverage: `lib/rag/mainlandPep.test.ts`
- Package script: `rag:mainland-pep-junior-paper-manifest`

## Safety Boundary

No paper ZIPs, document body text, answer text, worked-solution text, tables, images, page content, page images, OCR dumps, embeddings, page locators, archive-entry paths, source file paths, file-order reconstruction, or protected item wording were committed.

Committed cards store only abstract metadata and generation guidance: grade, semester, material kinds, assessment families, unit-title clusters, concept tags, competency tags, skill tags, item-design tags, misconception tags, pattern summaries, solution-strategy tags, and reuse restrictions.

Manual S18 review checked that S2 cards cover the major unit clusters requested for this phase: triangles, congruence, axis symmetry, polynomial/factorization work, algebraic fractions, quadratic radicals, Pythagorean theorem, quadrilaterals, linear functions, data analysis, and integrated review patterns.

## Checks

- Passed: `python3 scripts/build-mainland-pep-junior-paper-manifest.py --self-test`
- Passed: `npm run rag:mainland-pep-junior-paper-manifest -- --expected-slot S2:upper --expected-slot S2:lower <8上 zip> <8下 zip>`
  - Result: 490 metadata-only S2 file entries in the ignored local manifest.
  - Expected slot coverage: `S2:upper` 306, `S2:lower` 184.
- Passed: `npm run test:rag` after S2 RAG wiring and S2 test additions.
  - Result: 74/74 RAG tests passed, including S2 upper/lower paper-pattern retrieval, unified helper parity, grade isolation, evidence-pack layering, and safety scans.
- Blocked on latest reruns: after final manifest-script refinements, `npm run test:rag`, `tsc -p tsconfig.rag.json`, and `npm run type-check` repeatedly hung or were killed during TypeScript compilation with no diagnostics. No assertion failures or TypeScript diagnostics were printed; stale 0% CPU `tsc` processes were stopped.

## Remaining Risk

The committed S2 paper-pattern RAG is safe for internal abstract guidance only. Any future generated S2 student-facing practice, lesson, tutor, diagnostic, or assessment output must go through a separate S18 QA package for source distance, mathematical correctness, Mainland terminology, and grade fit.

