# Mainland HJB High-School Safe RAG Crosswalk

- Date: 2026-05-24
- Session ID: S18
- Publisher: `MAINLAND_HJB`
- Curriculum track compatibility: `MAINLAND_PEP_HIGH`
- Status: safe-RAG abstraction implemented; student-facing question and lesson promotion remains gated.

## Safety Boundary

The repository keeps only metadata, chapter-level abstractions, concept IDs, competency tags, misconception tags, generation guidance, and QA notes. The owner-provided PDFs remain local/private. This crosswalk does not store source body text, exercises, worked-response wording, response keys, page images, table bodies, figure bodies, page locators, or embedding payloads.

## Shared-Layer Rule

MAIS should keep three Mainland textbook layers separate:

- `MAINLAND_PEP`: People's Education Press textbook sequencing and textbook-specific safe cards.
- `MAINLAND_BNU`: Beijing Normal University Press sequencing, pending separate ingestion.
- `MAINLAND_HJB`: Shanghai Education Press sequencing and safe cards.

The national-standard concept spine and aggregated Mainland senior-secondary exam-pattern layer are shared. HJB does not get a copied exam-pattern bank; it reuses the existing shared senior-secondary exam-pattern cards through concept IDs.

## HJB Chapter To Concept Crosswalk

| Volume | Grade default | Chapter | Concept IDs |
| --- | --- | --- | --- |
| 必修 第一册 | S4 upper | 集合与逻辑 | `sets`, `set-operations`, `logic-conditions`, `quantifiers` |
| 必修 第一册 | S4 upper | 等式与不等式 | `inequality-properties`, `quadratic-equations`, `quadratic-inequalities`, `basic-inequality` |
| 必修 第一册 | S4 upper | 幂、指数与对数 | `exponents`, `radicals`, `logarithmic-operations`, `base-conversion` |
| 必修 第一册 | S4 upper | 幂函数、指数函数与对数函数 | `power-functions`, `exponential-functions`, `logarithmic-functions`, `function-graphs` |
| 必修 第一册 | S4 upper | 函数的概念、性质及应用 | `function-definition`, `domain-range`, `monotonicity`, `parity`, `function-zero`, `inverse-functions` |
| 必修 第二册 | S4 lower | 三角 | `unit-circle`, `trigonometric-ratios`, `trigonometric-identities`, `sine-theorem`, `cosine-theorem` |
| 必修 第二册 | S4 lower | 三角函数 | `trigonometric-functions`, `trigonometric-graphs`, `periodicity`, `trigonometric-transformations` |
| 必修 第二册 | S4 lower | 平面向量 | `plane-vectors`, `vector-operations`, `dot-product`, `vector-coordinates`, `vector-applications` |
| 必修 第二册 | S4 lower | 复数 | `complex-numbers`, `complex-operations`, `complex-plane`, `complex-roots` |
| 必修 第三册 | S5 upper | 空间直线与平面 | `solid-geometry`, `spatial-lines-planes`, `parallel-perpendicular`, `line-plane-angle`, `distance-in-space` |
| 必修 第三册 | S5 upper | 简单几何体 | `solid-geometry`, `surface-volume`, `polyhedra`, `rotational-solids` |
| 必修 第三册 | S5 upper | 概率初步 | `probability-foundations`, `sample-space`, `random-events`, `probability-operations`, `independence` |
| 必修 第三册 | S5 upper | 统计 | `sampling`, `data-distribution`, `statistical-charts`, `statistical-estimation`, `percentiles` |
| 选择性必修 第一册 | S5 lower | 平面直角坐标系中的直线 | `analytic-geometry`, `line-equations`, `slope`, `point-line-distance` |
| 选择性必修 第一册 | S5 lower | 圆锥曲线 | `circle-equations`, `ellipse`, `hyperbola`, `parabola-conic`, `parametric-equations`, `polar-coordinates` |
| 选择性必修 第一册 | S5 lower | 空间向量及其应用 | `space-vectors`, `spatial-coordinate-system`, `line-plane-angle`, `distance-in-space`, `parallel-perpendicular` |
| 选择性必修 第一册 | S5 lower/S6 review | 数列 | `sequences`, `arithmetic-sequences`, `geometric-sequences`, `recurrence`, `mathematical-induction` |
| 选择性必修 第二册 | S6 upper/full-year | 导数及其运用 | `derivatives`, `tangent-line`, `monotonicity-extrema`, `optimization`, `function-inequalities` |
| 选择性必修 第二册 | S6 upper/full-year | 计数原理 | `counting-principles`, `permutations-combinations`, `binomial-theorem`, `case-analysis` |
| 选择性必修 第二册 | S6 upper/full-year | 概率初步续 | `conditional-probability`, `total-probability`, `bayes-formula`, `random-variables`, `binomial-distribution`, `normal-distribution` |
| 选择性必修 第二册 | S6 upper/full-year | 成对数据的统计分析 | `bivariate-data`, `correlation`, `linear-regression`, `independence-test` |

## QA Notes

- The production safe-card layer is `data/rag/mainlandHjbHigh.ts`.
- The retrieval layer is `lib/rag/mainlandHjbHigh.ts`.
- The manifest builder is `scripts/build-mainland-hjb-high-textbook-manifest.py` and writes local-only artifacts under `.local/rag/mainland-hjb-high/` by default.
- Public practice questions, lesson pages, and unit-paper layers remain out of scope until S18 completes separate source-distance, solvability, duplicate, and teacher-signoff checks.
