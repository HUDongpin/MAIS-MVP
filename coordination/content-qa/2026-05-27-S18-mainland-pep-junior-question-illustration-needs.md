# S18 Mainland PEP Junior Question Illustration-Needs Audit

- Date: 2026-05-27
- Generated at: 2026-05-27 20:44:24 Asia/Hong_Kong
- Session: S18 Curriculum QA and content quality
- Source: `coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/question-pack.json`
- Scope: Mainland PEP junior S1-S3, v2 1200-question pack
- Method: deterministic regex classification over `promptZhHans` plus `optionsZhHans`; no GPT Image2 calls; no question-bank edits

## Executive Summary

This audit prepares the current Mainland PEP junior question bank for future GPT Image2 illustration planning. It counts question-level illustration needs, groups rows into reusable template families, and separates the first production batch from optional second-batch visual aids.

- Total questions audited: 1200
- Core illustration-needs questions: 691
- Broad illustration candidates including statistics/probability: 824
- Text-only / no planned image rows: 376
- Core reusable template families: 20
- Broad reusable template families: 23
- Recommended GPT Image2 order: plane geometry/trigonometry -> coordinate/function graphs -> number lines -> optional statistics/probability

## Category Totals

| Category | Chinese Label | Phase | GPT Image2 Batch | Questions | Definition |
| --- | --- | --- | --- | --- | --- |
| explicit_graph_or_figure | 显式图形/图象题 | core | batch-1-core-coordinate-function | 33 | 题干或选项直接出现图形、图象、网格、统计图、阴影、展开图等图示信号。 |
| coordinate_function | 坐标与函数图象 | core | batch-1-core-coordinate-function | 233 | 坐标、象限、一次函数、二次函数、反比例函数、抛物线、顶点、对称轴等。 |
| number_line | 数轴 | core | batch-1-core-number-line | 23 | 数轴、相反数、绝对值等需要或适合一维位置图的题。 |
| plane_geometry | 平面几何与三角函数 | core | batch-1-core-plane-geometry | 402 | 角、平行线、三角形、全等、勾股、四边形、圆、相似、锐角三角函数等。 |
| statistics_probability | 统计与概率可视化 | optional-second-batch | batch-2-optional-statistics-probability | 133 | 统计、数据、平均数、中位数、方差、概率、随机、表格、列表、树状图等。 |
| text_only | 纯文字/代数题 | not-needed | not-planned | 376 | 未触发插图需求规则的代数、方程、运算或文字题。 |

## Required Count Checks

| Dimension | Breakdown |
| --- | --- |
| Grade | S1: 400; S2: 400; S3: 400 |
| Question type | fill-in: 400; multiple-choice: 400; short-answer: 400 |
| Difficulty | Foundation: 230; Core: 610; Exam: 280; Challenge: 80 |
| Illustration phase | core: 691; not-needed: 376; optional-second-batch: 133 |
| GPT Image2 batch | batch-1-core-coordinate-function: 266; batch-1-core-number-line: 23; batch-1-core-plane-geometry: 402; batch-2-optional-statistics-probability: 133; not-planned: 376 |

## Grade, Topic, Type, And Difficulty Cross-Tabs

### By Grade And Category

| Grade | Category | Questions |
| --- | --- | --- |
| S1 | coordinate_function | 68 |
| S1 | number_line | 23 |
| S1 | plane_geometry | 99 |
| S1 | statistics_probability | 33 |
| S1 | text_only | 177 |
| S2 | coordinate_function | 33 |
| S2 | explicit_graph_or_figure | 33 |
| S2 | plane_geometry | 169 |
| S2 | statistics_probability | 33 |
| S2 | text_only | 132 |
| S3 | coordinate_function | 132 |
| S3 | plane_geometry | 134 |
| S3 | statistics_probability | 67 |
| S3 | text_only | 67 |

### By Topic And Category

| Topic ID | Unit Title | Category | Questions |
| --- | --- | --- | --- |
| pep-junior-s1-lower-equations-inequalities-data | 二元一次方程组、不等式与数据初步 | statistics_probability | 33 |
| pep-junior-s1-lower-equations-inequalities-data | 二元一次方程组、不等式与数据初步 | text_only | 66 |
| pep-junior-s1-lower-lines-coordinates | 相交线、平行线与平面直角坐标系 | coordinate_function | 68 |
| pep-junior-s1-lower-lines-coordinates | 相交线、平行线与平面直角坐标系 | plane_geometry | 33 |
| pep-junior-s1-upper-expressions-linear-equations | 整式初步与一元一次方程 | text_only | 66 |
| pep-junior-s1-upper-geometric-figures | 几何图形初步 | plane_geometry | 66 |
| pep-junior-s1-upper-rational-numbers | 有理数与数轴基础 | number_line | 23 |
| pep-junior-s1-upper-rational-numbers | 有理数与数轴基础 | text_only | 45 |
| pep-junior-s2-lower-linear-functions-data | 一次函数与数据分析 | coordinate_function | 33 |
| pep-junior-s2-lower-linear-functions-data | 一次函数与数据分析 | explicit_graph_or_figure | 33 |
| pep-junior-s2-lower-linear-functions-data | 一次函数与数据分析 | statistics_probability | 33 |
| pep-junior-s2-lower-roots-pythagorean-quadrilaterals | 二次根式、勾股定理与平行四边形 | plane_geometry | 68 |
| pep-junior-s2-lower-roots-pythagorean-quadrilaterals | 二次根式、勾股定理与平行四边形 | text_only | 33 |
| pep-junior-s2-upper-polynomials-fractions | 整式乘法、因式分解与分式 | text_only | 99 |
| pep-junior-s2-upper-triangles-congruence | 三角形、全等与轴对称 | plane_geometry | 101 |
| pep-junior-s3-lower-inverse-similarity-trigonometry | 反比例函数、相似与锐角三角函数 | coordinate_function | 66 |
| pep-junior-s3-lower-inverse-similarity-trigonometry | 反比例函数、相似与锐角三角函数 | plane_geometry | 134 |
| pep-junior-s3-upper-quadratics-circle-probability | 一元二次方程、二次函数、圆与概率初步 | coordinate_function | 66 |
| pep-junior-s3-upper-quadratics-circle-probability | 一元二次方程、二次函数、圆与概率初步 | statistics_probability | 67 |
| pep-junior-s3-upper-quadratics-circle-probability | 一元二次方程、二次函数、圆与概率初步 | text_only | 67 |

### By Question Type And Category

| Question Type | Category | Questions |
| --- | --- | --- |
| fill-in | coordinate_function | 66 |
| fill-in | explicit_graph_or_figure | 33 |
| fill-in | number_line | 23 |
| fill-in | plane_geometry | 190 |
| fill-in | text_only | 88 |
| multiple-choice | coordinate_function | 133 |
| multiple-choice | plane_geometry | 56 |
| multiple-choice | text_only | 211 |
| short-answer | coordinate_function | 34 |
| short-answer | plane_geometry | 156 |
| short-answer | statistics_probability | 133 |
| short-answer | text_only | 77 |

### By Difficulty And Category

| Difficulty | Category | Questions |
| --- | --- | --- |
| Challenge | plane_geometry | 50 |
| Challenge | statistics_probability | 30 |
| Core | coordinate_function | 134 |
| Core | plane_geometry | 197 |
| Core | statistics_probability | 67 |
| Core | text_only | 212 |
| Exam | coordinate_function | 99 |
| Exam | explicit_graph_or_figure | 33 |
| Exam | plane_geometry | 85 |
| Exam | statistics_probability | 36 |
| Exam | text_only | 27 |
| Foundation | number_line | 23 |
| Foundation | plane_geometry | 70 |
| Foundation | text_only | 137 |

## GPT Image2 First-Batch Template Queue

The first batch covers 691 core questions through 20 reusable template families.

| Template ID | Category | Batch | Questions | Topic | Type | Suggested Image Kind | Representative Question |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pep-junior-illustration-template-001 | 平面几何与三角函数 | batch-1-core-plane-geometry | 33 | 相交线、平行线与平面直角坐标系 (pep-junior-s1-lower-lines-coordinates) | fill-in | parallel lines cut by a transversal diagram | pep-junior-v2-s1-k04-fi-001: 两条平行直线被一条截线所截，一组同位角中一个角为89°，另一个同位角为____。 |
| pep-junior-illustration-template-002 | 平面几何与三角函数 | batch-1-core-plane-geometry | 22 | 几何图形初步 (pep-junior-s1-upper-geometric-figures) | multiple-choice | basic plane-geometry angle diagram | pep-junior-v2-s1-k03-mc-001: 两个角组成平角，其中一个角是42°，另一个角是多少？ |
| pep-junior-illustration-template-003 | 平面几何与三角函数 | batch-1-core-plane-geometry | 22 | 几何图形初步 (pep-junior-s1-upper-geometric-figures) | fill-in | basic plane-geometry angle diagram | pep-junior-v2-s1-k03-fi-001: 线段AB长14厘米，点C是AB的中点。AC=____。 |
| pep-junior-illustration-template-004 | 平面几何与三角函数 | batch-1-core-plane-geometry | 22 | 几何图形初步 (pep-junior-s1-upper-geometric-figures) | short-answer | basic plane-geometry angle diagram | pep-junior-v2-s1-k03-sa-001: 两个角互余，其中一个角是79°。求另一个角的度数，并写出理由。 |
| pep-junior-illustration-template-005 | 平面几何与三角函数 | batch-1-core-plane-geometry | 34 | 二次根式、勾股定理与平行四边形 (pep-junior-s2-lower-roots-pythagorean-quadrilaterals) | fill-in | right triangle side-length diagram | pep-junior-v2-s2-k08-fi-001: 直角三角形两条直角边分别为5厘米和12厘米，斜边长____。 |
| pep-junior-illustration-template-006 | 平面几何与三角函数 | batch-1-core-plane-geometry | 34 | 二次根式、勾股定理与平行四边形 (pep-junior-s2-lower-roots-pythagorean-quadrilaterals) | short-answer | quadrilateral side/parallel-mark diagram | pep-junior-v2-s2-k08-sa-001: 平行四边形ABCD中，AB=6厘米。若CD与AB是对边，CD长多少？ |
| pep-junior-illustration-template-007 | 平面几何与三角函数 | batch-1-core-plane-geometry | 34 | 三角形、全等与轴对称 (pep-junior-s2-upper-triangles-congruence) | multiple-choice | triangle angle/congruence diagram | pep-junior-v2-s2-k06-mc-001: 三角形的两个内角分别为65°和67°，第三个内角是多少？ |
| pep-junior-illustration-template-008 | 平面几何与三角函数 | batch-1-core-plane-geometry | 34 | 三角形、全等与轴对称 (pep-junior-s2-upper-triangles-congruence) | fill-in | triangle angle/congruence diagram | pep-junior-v2-s2-k06-fi-001: 等腰三角形的顶角为72°，每个底角为____。 |
| pep-junior-illustration-template-009 | 平面几何与三角函数 | batch-1-core-plane-geometry | 33 | 三角形、全等与轴对称 (pep-junior-s2-upper-triangles-congruence) | short-answer | triangle angle/congruence diagram | pep-junior-v2-s2-k06-sa-001: 在△ABC和△DEF中，AB=DE=6厘米，BC=EF=12厘米，AC=DF=12厘米。可用哪一种判定说明两个三角形全等？ |
| pep-junior-illustration-template-010 | 平面几何与三角函数 | batch-1-core-plane-geometry | 67 | 反比例函数、相似与锐角三角函数 (pep-junior-s3-lower-inverse-similarity-trigonometry) | fill-in | similar triangles or similar polygons diagram | pep-junior-v2-s3-k11-fi-001: 两个相似三角形的相似比为3:1，小三角形一条对应边长14厘米，大三角形对应边长____。 |
| pep-junior-illustration-template-011 | 平面几何与三角函数 | batch-1-core-plane-geometry | 67 | 反比例函数、相似与锐角三角函数 (pep-junior-s3-lower-inverse-similarity-trigonometry) | short-answer | right-triangle trigonometry/elevation diagram | pep-junior-v2-s3-k11-sa-001: 测得旗杆顶端的仰角为45°，测量点到旗杆底部的水平距离为93米。若忽略测量高度，旗杆高约多少？ |
| pep-junior-illustration-template-012 | 坐标与函数图象 | batch-1-core-coordinate-function | 34 | 相交线、平行线与平面直角坐标系 (pep-junior-s1-lower-lines-coordinates) | multiple-choice | coordinate grid point translation diagram | pep-junior-v2-s1-k04-mc-001: 点P(4,-6)先向右平移3个单位，再向下平移3个单位，所得点的坐标是？ |
| pep-junior-illustration-template-013 | 坐标与函数图象 | batch-1-core-coordinate-function | 34 | 相交线、平行线与平面直角坐标系 (pep-junior-s1-lower-lines-coordinates) | short-answer | coordinate quadrant location diagram | pep-junior-v2-s1-k04-sa-001: 点Q(26,-32)位于哪个象限？说明判断依据。 |
| pep-junior-illustration-template-014 | 坐标与函数图象 | batch-1-core-coordinate-function | 22 | 一次函数与数据分析 (pep-junior-s2-lower-linear-functions-data) | multiple-choice | linear function coordinate-plane diagram | pep-junior-v2-s2-k09-mc-001: 一次函数y=3x-4，当x=2时，y的值是多少？ |
| pep-junior-illustration-template-015 | 坐标与函数图象 | batch-1-core-coordinate-function | 11 | 一次函数与数据分析 (pep-junior-s2-lower-linear-functions-data) | multiple-choice | linear function coordinate-plane diagram | pep-junior-v2-s2-k09-mc-003: 一次函数y=5x+2，当x=4时，y的值是多少？ |
| pep-junior-illustration-template-016 | 显式图形/图象题 | batch-1-core-coordinate-function | 33 | 一次函数与数据分析 (pep-junior-s2-lower-linear-functions-data) | fill-in | coordinate plane function graph with two marked points and slope triangle | pep-junior-v2-s2-k09-fi-001: 一次函数图象经过点(2,5)和(4,15)，它的斜率是____。 |
| pep-junior-illustration-template-017 | 坐标与函数图象 | batch-1-core-coordinate-function | 66 | 反比例函数、相似与锐角三角函数 (pep-junior-s3-lower-inverse-similarity-trigonometry) | multiple-choice | reciprocal function curve diagram | pep-junior-v2-s3-k11-mc-001: 反比例函数y=k/x经过点(25,9)，k的值是多少？ |
| pep-junior-illustration-template-018 | 坐标与函数图象 | batch-1-core-coordinate-function | 50 | 一元二次方程、二次函数、圆与概率初步 (pep-junior-s3-upper-quadratics-circle-probability) | fill-in | quadratic parabola with symmetry axis | pep-junior-v2-s3-k10-fi-001: 二次函数y=(x-9)²+2的对称轴是____。 |
| pep-junior-illustration-template-019 | 坐标与函数图象 | batch-1-core-coordinate-function | 16 | 一元二次方程、二次函数、圆与概率初步 (pep-junior-s3-upper-quadratics-circle-probability) | fill-in | quadratic parabola with symmetry axis | pep-junior-v2-s3-k10-fi-015: 二次函数y=(x+8)²+30的对称轴是____。 |
| pep-junior-illustration-template-020 | 数轴 | batch-1-core-number-line | 23 | 有理数与数轴基础 (pep-junior-s1-upper-rational-numbers) | fill-in | number line with two labeled points and distance bracket | pep-junior-v2-s1-k01-fi-001: 数轴上点A表示-6，点B表示2。A、B两点之间的距离是____。 |

## Optional Second-Batch Template Queue

The optional batch covers 133 statistics/probability rows through 3 template families.

| Template ID | Category | Batch | Questions | Topic | Type | Suggested Image Kind | Representative Question |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pep-junior-illustration-template-021 | 统计与概率可视化 | batch-2-optional-statistics-probability | 33 | 二元一次方程组、不等式与数据初步 (pep-junior-s1-lower-equations-inequalities-data) | short-answer | data table or simple chart diagram | pep-junior-v2-s1-k05-sa-001: 某小组三次测量的数据分别是41、44、47。求这三次数据的平均数。 |
| pep-junior-illustration-template-022 | 统计与概率可视化 | batch-2-optional-statistics-probability | 33 | 一次函数与数据分析 (pep-junior-s2-lower-linear-functions-data) | short-answer | data table or simple chart diagram | pep-junior-v2-s2-k09-sa-001: 一组数据按从小到大排列为38、40、42、44。求这组数据的中位数。 |
| pep-junior-illustration-template-023 | 统计与概率可视化 | batch-2-optional-statistics-probability | 67 | 一元二次方程、二次函数、圆与概率初步 (pep-junior-s3-upper-quadratics-circle-probability) | short-answer | sample-space or probability tree diagram | pep-junior-v2-s3-k10-sa-001: 袋中有17个红球和12个蓝球，随机摸出1个球。摸到红球的概率是多少？ |

## Category Question ID Lists

Full per-question metadata is in `2026-05-27-S18-mainland-pep-junior-question-illustration-needs-questions.csv`. The compact category ID list is in `2026-05-27-S18-mainland-pep-junior-question-illustration-needs-category-question-ids.csv`.

### 显式图形/图象题 (explicit_graph_or_figure)

- Phase: core
- GPT Image2 batch: batch-1-core-coordinate-function
- Question count: 33
- Question IDs: pep-junior-v2-s2-k09-fi-001 pep-junior-v2-s2-k09-fi-002 pep-junior-v2-s2-k09-fi-003 pep-junior-v2-s2-k09-fi-004 pep-junior-v2-s2-k09-fi-005 pep-junior-v2-s2-k09-fi-006 pep-junior-v2-s2-k09-fi-007 pep-junior-v2-s2-k09-fi-008 pep-junior-v2-s2-k09-fi-009 pep-junior-v2-s2-k09-fi-010 pep-junior-v2-s2-k09-fi-011 pep-junior-v2-s2-k09-fi-012 pep-junior-v2-s2-k09-fi-013 pep-junior-v2-s2-k09-fi-014 pep-junior-v2-s2-k09-fi-015 pep-junior-v2-s2-k09-fi-016 pep-junior-v2-s2-k09-fi-017 pep-junior-v2-s2-k09-fi-018 pep-junior-v2-s2-k09-fi-019 pep-junior-v2-s2-k09-fi-020 pep-junior-v2-s2-k09-fi-021 pep-junior-v2-s2-k09-fi-022 pep-junior-v2-s2-k09-fi-023 pep-junior-v2-s2-k09-fi-024<br>pep-junior-v2-s2-k09-fi-025 pep-junior-v2-s2-k09-fi-026 pep-junior-v2-s2-k09-fi-027 pep-junior-v2-s2-k09-fi-028 pep-junior-v2-s2-k09-fi-029 pep-junior-v2-s2-k09-fi-030 pep-junior-v2-s2-k09-fi-031 pep-junior-v2-s2-k09-fi-032 pep-junior-v2-s2-k09-fi-033

### 坐标与函数图象 (coordinate_function)

- Phase: core
- GPT Image2 batch: batch-1-core-coordinate-function
- Question count: 233
- Question IDs: pep-junior-v2-s1-k04-mc-001 pep-junior-v2-s1-k04-mc-002 pep-junior-v2-s1-k04-mc-003 pep-junior-v2-s1-k04-mc-004 pep-junior-v2-s1-k04-mc-005 pep-junior-v2-s1-k04-mc-006 pep-junior-v2-s1-k04-mc-007 pep-junior-v2-s1-k04-mc-008 pep-junior-v2-s1-k04-mc-009 pep-junior-v2-s1-k04-mc-010 pep-junior-v2-s1-k04-mc-011 pep-junior-v2-s1-k04-mc-012 pep-junior-v2-s1-k04-mc-013 pep-junior-v2-s1-k04-mc-014 pep-junior-v2-s1-k04-mc-015 pep-junior-v2-s1-k04-mc-016 pep-junior-v2-s1-k04-mc-017 pep-junior-v2-s1-k04-mc-018 pep-junior-v2-s1-k04-mc-019 pep-junior-v2-s1-k04-mc-020 pep-junior-v2-s1-k04-mc-021 pep-junior-v2-s1-k04-mc-022 pep-junior-v2-s1-k04-mc-023 pep-junior-v2-s1-k04-mc-024<br>pep-junior-v2-s1-k04-mc-025 pep-junior-v2-s1-k04-mc-026 pep-junior-v2-s1-k04-mc-027 pep-junior-v2-s1-k04-mc-028 pep-junior-v2-s1-k04-mc-029 pep-junior-v2-s1-k04-mc-030 pep-junior-v2-s1-k04-mc-031 pep-junior-v2-s1-k04-mc-032 pep-junior-v2-s1-k04-mc-033 pep-junior-v2-s1-k04-mc-034 pep-junior-v2-s1-k04-sa-001 pep-junior-v2-s1-k04-sa-002 pep-junior-v2-s1-k04-sa-003 pep-junior-v2-s1-k04-sa-004 pep-junior-v2-s1-k04-sa-005 pep-junior-v2-s1-k04-sa-006 pep-junior-v2-s1-k04-sa-007 pep-junior-v2-s1-k04-sa-008 pep-junior-v2-s1-k04-sa-009 pep-junior-v2-s1-k04-sa-010 pep-junior-v2-s1-k04-sa-011 pep-junior-v2-s1-k04-sa-012 pep-junior-v2-s1-k04-sa-013 pep-junior-v2-s1-k04-sa-014<br>pep-junior-v2-s1-k04-sa-015 pep-junior-v2-s1-k04-sa-016 pep-junior-v2-s1-k04-sa-017 pep-junior-v2-s1-k04-sa-018 pep-junior-v2-s1-k04-sa-019 pep-junior-v2-s1-k04-sa-020 pep-junior-v2-s1-k04-sa-021 pep-junior-v2-s1-k04-sa-022 pep-junior-v2-s1-k04-sa-023 pep-junior-v2-s1-k04-sa-024 pep-junior-v2-s1-k04-sa-025 pep-junior-v2-s1-k04-sa-026 pep-junior-v2-s1-k04-sa-027 pep-junior-v2-s1-k04-sa-028 pep-junior-v2-s1-k04-sa-029 pep-junior-v2-s1-k04-sa-030 pep-junior-v2-s1-k04-sa-031 pep-junior-v2-s1-k04-sa-032 pep-junior-v2-s1-k04-sa-033 pep-junior-v2-s1-k04-sa-034 pep-junior-v2-s2-k09-mc-001 pep-junior-v2-s2-k09-mc-002 pep-junior-v2-s2-k09-mc-003 pep-junior-v2-s2-k09-mc-004<br>pep-junior-v2-s2-k09-mc-005 pep-junior-v2-s2-k09-mc-006 pep-junior-v2-s2-k09-mc-007 pep-junior-v2-s2-k09-mc-008 pep-junior-v2-s2-k09-mc-009 pep-junior-v2-s2-k09-mc-010 pep-junior-v2-s2-k09-mc-011 pep-junior-v2-s2-k09-mc-012 pep-junior-v2-s2-k09-mc-013 pep-junior-v2-s2-k09-mc-014 pep-junior-v2-s2-k09-mc-015 pep-junior-v2-s2-k09-mc-016 pep-junior-v2-s2-k09-mc-017 pep-junior-v2-s2-k09-mc-018 pep-junior-v2-s2-k09-mc-019 pep-junior-v2-s2-k09-mc-020 pep-junior-v2-s2-k09-mc-021 pep-junior-v2-s2-k09-mc-022 pep-junior-v2-s2-k09-mc-023 pep-junior-v2-s2-k09-mc-024 pep-junior-v2-s2-k09-mc-025 pep-junior-v2-s2-k09-mc-026 pep-junior-v2-s2-k09-mc-027 pep-junior-v2-s2-k09-mc-028<br>pep-junior-v2-s2-k09-mc-029 pep-junior-v2-s2-k09-mc-030 pep-junior-v2-s2-k09-mc-031 pep-junior-v2-s2-k09-mc-032 pep-junior-v2-s2-k09-mc-033 pep-junior-v2-s3-k11-mc-001 pep-junior-v2-s3-k11-mc-002 pep-junior-v2-s3-k11-mc-003 pep-junior-v2-s3-k11-mc-004 pep-junior-v2-s3-k11-mc-005 pep-junior-v2-s3-k11-mc-006 pep-junior-v2-s3-k11-mc-007 pep-junior-v2-s3-k11-mc-008 pep-junior-v2-s3-k11-mc-009 pep-junior-v2-s3-k11-mc-010 pep-junior-v2-s3-k11-mc-011 pep-junior-v2-s3-k11-mc-012 pep-junior-v2-s3-k11-mc-013 pep-junior-v2-s3-k11-mc-014 pep-junior-v2-s3-k11-mc-015 pep-junior-v2-s3-k11-mc-016 pep-junior-v2-s3-k11-mc-017 pep-junior-v2-s3-k11-mc-018 pep-junior-v2-s3-k11-mc-019<br>pep-junior-v2-s3-k11-mc-020 pep-junior-v2-s3-k11-mc-021 pep-junior-v2-s3-k11-mc-022 pep-junior-v2-s3-k11-mc-023 pep-junior-v2-s3-k11-mc-024 pep-junior-v2-s3-k11-mc-025 pep-junior-v2-s3-k11-mc-026 pep-junior-v2-s3-k11-mc-027 pep-junior-v2-s3-k11-mc-028 pep-junior-v2-s3-k11-mc-029 pep-junior-v2-s3-k11-mc-030 pep-junior-v2-s3-k11-mc-031 pep-junior-v2-s3-k11-mc-032 pep-junior-v2-s3-k11-mc-033 pep-junior-v2-s3-k11-mc-034 pep-junior-v2-s3-k11-mc-035 pep-junior-v2-s3-k11-mc-036 pep-junior-v2-s3-k11-mc-037 pep-junior-v2-s3-k11-mc-038 pep-junior-v2-s3-k11-mc-039 pep-junior-v2-s3-k11-mc-040 pep-junior-v2-s3-k11-mc-041 pep-junior-v2-s3-k11-mc-042 pep-junior-v2-s3-k11-mc-043<br>pep-junior-v2-s3-k11-mc-044 pep-junior-v2-s3-k11-mc-045 pep-junior-v2-s3-k11-mc-046 pep-junior-v2-s3-k11-mc-047 pep-junior-v2-s3-k11-mc-048 pep-junior-v2-s3-k11-mc-049 pep-junior-v2-s3-k11-mc-050 pep-junior-v2-s3-k11-mc-051 pep-junior-v2-s3-k11-mc-052 pep-junior-v2-s3-k11-mc-053 pep-junior-v2-s3-k11-mc-054 pep-junior-v2-s3-k11-mc-055 pep-junior-v2-s3-k11-mc-056 pep-junior-v2-s3-k11-mc-057 pep-junior-v2-s3-k11-mc-058 pep-junior-v2-s3-k11-mc-059 pep-junior-v2-s3-k11-mc-060 pep-junior-v2-s3-k11-mc-061 pep-junior-v2-s3-k11-mc-062 pep-junior-v2-s3-k11-mc-063 pep-junior-v2-s3-k11-mc-064 pep-junior-v2-s3-k11-mc-065 pep-junior-v2-s3-k11-mc-066 pep-junior-v2-s3-k10-fi-001<br>pep-junior-v2-s3-k10-fi-002 pep-junior-v2-s3-k10-fi-003 pep-junior-v2-s3-k10-fi-004 pep-junior-v2-s3-k10-fi-005 pep-junior-v2-s3-k10-fi-006 pep-junior-v2-s3-k10-fi-007 pep-junior-v2-s3-k10-fi-008 pep-junior-v2-s3-k10-fi-009 pep-junior-v2-s3-k10-fi-010 pep-junior-v2-s3-k10-fi-011 pep-junior-v2-s3-k10-fi-012 pep-junior-v2-s3-k10-fi-013 pep-junior-v2-s3-k10-fi-014 pep-junior-v2-s3-k10-fi-015 pep-junior-v2-s3-k10-fi-016 pep-junior-v2-s3-k10-fi-017 pep-junior-v2-s3-k10-fi-018 pep-junior-v2-s3-k10-fi-019 pep-junior-v2-s3-k10-fi-020 pep-junior-v2-s3-k10-fi-021 pep-junior-v2-s3-k10-fi-022 pep-junior-v2-s3-k10-fi-023 pep-junior-v2-s3-k10-fi-024 pep-junior-v2-s3-k10-fi-025<br>pep-junior-v2-s3-k10-fi-026 pep-junior-v2-s3-k10-fi-027 pep-junior-v2-s3-k10-fi-028 pep-junior-v2-s3-k10-fi-029 pep-junior-v2-s3-k10-fi-030 pep-junior-v2-s3-k10-fi-031 pep-junior-v2-s3-k10-fi-032 pep-junior-v2-s3-k10-fi-033 pep-junior-v2-s3-k10-fi-034 pep-junior-v2-s3-k10-fi-035 pep-junior-v2-s3-k10-fi-036 pep-junior-v2-s3-k10-fi-037 pep-junior-v2-s3-k10-fi-038 pep-junior-v2-s3-k10-fi-039 pep-junior-v2-s3-k10-fi-040 pep-junior-v2-s3-k10-fi-041 pep-junior-v2-s3-k10-fi-042 pep-junior-v2-s3-k10-fi-043 pep-junior-v2-s3-k10-fi-044 pep-junior-v2-s3-k10-fi-045 pep-junior-v2-s3-k10-fi-046 pep-junior-v2-s3-k10-fi-047 pep-junior-v2-s3-k10-fi-048 pep-junior-v2-s3-k10-fi-049<br>pep-junior-v2-s3-k10-fi-050 pep-junior-v2-s3-k10-fi-051 pep-junior-v2-s3-k10-fi-052 pep-junior-v2-s3-k10-fi-053 pep-junior-v2-s3-k10-fi-054 pep-junior-v2-s3-k10-fi-055 pep-junior-v2-s3-k10-fi-056 pep-junior-v2-s3-k10-fi-057 pep-junior-v2-s3-k10-fi-058 pep-junior-v2-s3-k10-fi-059 pep-junior-v2-s3-k10-fi-060 pep-junior-v2-s3-k10-fi-061 pep-junior-v2-s3-k10-fi-062 pep-junior-v2-s3-k10-fi-063 pep-junior-v2-s3-k10-fi-064 pep-junior-v2-s3-k10-fi-065 pep-junior-v2-s3-k10-fi-066

### 数轴 (number_line)

- Phase: core
- GPT Image2 batch: batch-1-core-number-line
- Question count: 23
- Question IDs: pep-junior-v2-s1-k01-fi-001 pep-junior-v2-s1-k01-fi-002 pep-junior-v2-s1-k01-fi-003 pep-junior-v2-s1-k01-fi-004 pep-junior-v2-s1-k01-fi-005 pep-junior-v2-s1-k01-fi-006 pep-junior-v2-s1-k01-fi-007 pep-junior-v2-s1-k01-fi-008 pep-junior-v2-s1-k01-fi-009 pep-junior-v2-s1-k01-fi-010 pep-junior-v2-s1-k01-fi-011 pep-junior-v2-s1-k01-fi-012 pep-junior-v2-s1-k01-fi-013 pep-junior-v2-s1-k01-fi-014 pep-junior-v2-s1-k01-fi-015 pep-junior-v2-s1-k01-fi-016 pep-junior-v2-s1-k01-fi-017 pep-junior-v2-s1-k01-fi-018 pep-junior-v2-s1-k01-fi-019 pep-junior-v2-s1-k01-fi-020 pep-junior-v2-s1-k01-fi-021 pep-junior-v2-s1-k01-fi-022 pep-junior-v2-s1-k01-fi-023

### 平面几何与三角函数 (plane_geometry)

- Phase: core
- GPT Image2 batch: batch-1-core-plane-geometry
- Question count: 402
- Question IDs: pep-junior-v2-s1-k04-fi-001 pep-junior-v2-s1-k04-fi-002 pep-junior-v2-s1-k04-fi-003 pep-junior-v2-s1-k04-fi-004 pep-junior-v2-s1-k04-fi-005 pep-junior-v2-s1-k04-fi-006 pep-junior-v2-s1-k04-fi-007 pep-junior-v2-s1-k04-fi-008 pep-junior-v2-s1-k04-fi-009 pep-junior-v2-s1-k04-fi-010 pep-junior-v2-s1-k04-fi-011 pep-junior-v2-s1-k04-fi-012 pep-junior-v2-s1-k04-fi-013 pep-junior-v2-s1-k04-fi-014 pep-junior-v2-s1-k04-fi-015 pep-junior-v2-s1-k04-fi-016 pep-junior-v2-s1-k04-fi-017 pep-junior-v2-s1-k04-fi-018 pep-junior-v2-s1-k04-fi-019 pep-junior-v2-s1-k04-fi-020 pep-junior-v2-s1-k04-fi-021 pep-junior-v2-s1-k04-fi-022 pep-junior-v2-s1-k04-fi-023 pep-junior-v2-s1-k04-fi-024<br>pep-junior-v2-s1-k04-fi-025 pep-junior-v2-s1-k04-fi-026 pep-junior-v2-s1-k04-fi-027 pep-junior-v2-s1-k04-fi-028 pep-junior-v2-s1-k04-fi-029 pep-junior-v2-s1-k04-fi-030 pep-junior-v2-s1-k04-fi-031 pep-junior-v2-s1-k04-fi-032 pep-junior-v2-s1-k04-fi-033 pep-junior-v2-s1-k03-mc-001 pep-junior-v2-s1-k03-mc-002 pep-junior-v2-s1-k03-mc-003 pep-junior-v2-s1-k03-mc-004 pep-junior-v2-s1-k03-mc-005 pep-junior-v2-s1-k03-mc-006 pep-junior-v2-s1-k03-mc-007 pep-junior-v2-s1-k03-mc-008 pep-junior-v2-s1-k03-mc-009 pep-junior-v2-s1-k03-mc-010 pep-junior-v2-s1-k03-mc-011 pep-junior-v2-s1-k03-mc-012 pep-junior-v2-s1-k03-mc-013 pep-junior-v2-s1-k03-mc-014 pep-junior-v2-s1-k03-mc-015<br>pep-junior-v2-s1-k03-mc-016 pep-junior-v2-s1-k03-mc-017 pep-junior-v2-s1-k03-mc-018 pep-junior-v2-s1-k03-mc-019 pep-junior-v2-s1-k03-mc-020 pep-junior-v2-s1-k03-mc-021 pep-junior-v2-s1-k03-mc-022 pep-junior-v2-s1-k03-fi-001 pep-junior-v2-s1-k03-fi-002 pep-junior-v2-s1-k03-fi-003 pep-junior-v2-s1-k03-fi-004 pep-junior-v2-s1-k03-fi-005 pep-junior-v2-s1-k03-fi-006 pep-junior-v2-s1-k03-fi-007 pep-junior-v2-s1-k03-fi-008 pep-junior-v2-s1-k03-fi-009 pep-junior-v2-s1-k03-fi-010 pep-junior-v2-s1-k03-fi-011 pep-junior-v2-s1-k03-fi-012 pep-junior-v2-s1-k03-fi-013 pep-junior-v2-s1-k03-fi-014 pep-junior-v2-s1-k03-fi-015 pep-junior-v2-s1-k03-fi-016 pep-junior-v2-s1-k03-fi-017<br>pep-junior-v2-s1-k03-fi-018 pep-junior-v2-s1-k03-fi-019 pep-junior-v2-s1-k03-fi-020 pep-junior-v2-s1-k03-fi-021 pep-junior-v2-s1-k03-fi-022 pep-junior-v2-s1-k03-sa-001 pep-junior-v2-s1-k03-sa-002 pep-junior-v2-s1-k03-sa-003 pep-junior-v2-s1-k03-sa-004 pep-junior-v2-s1-k03-sa-005 pep-junior-v2-s1-k03-sa-006 pep-junior-v2-s1-k03-sa-007 pep-junior-v2-s1-k03-sa-008 pep-junior-v2-s1-k03-sa-009 pep-junior-v2-s1-k03-sa-010 pep-junior-v2-s1-k03-sa-011 pep-junior-v2-s1-k03-sa-012 pep-junior-v2-s1-k03-sa-013 pep-junior-v2-s1-k03-sa-014 pep-junior-v2-s1-k03-sa-015 pep-junior-v2-s1-k03-sa-016 pep-junior-v2-s1-k03-sa-017 pep-junior-v2-s1-k03-sa-018 pep-junior-v2-s1-k03-sa-019<br>pep-junior-v2-s1-k03-sa-020 pep-junior-v2-s1-k03-sa-021 pep-junior-v2-s1-k03-sa-022 pep-junior-v2-s2-k08-fi-001 pep-junior-v2-s2-k08-fi-002 pep-junior-v2-s2-k08-fi-003 pep-junior-v2-s2-k08-fi-004 pep-junior-v2-s2-k08-fi-005 pep-junior-v2-s2-k08-fi-006 pep-junior-v2-s2-k08-fi-007 pep-junior-v2-s2-k08-fi-008 pep-junior-v2-s2-k08-fi-009 pep-junior-v2-s2-k08-fi-010 pep-junior-v2-s2-k08-fi-011 pep-junior-v2-s2-k08-fi-012 pep-junior-v2-s2-k08-fi-013 pep-junior-v2-s2-k08-fi-014 pep-junior-v2-s2-k08-fi-015 pep-junior-v2-s2-k08-fi-016 pep-junior-v2-s2-k08-fi-017 pep-junior-v2-s2-k08-fi-018 pep-junior-v2-s2-k08-fi-019 pep-junior-v2-s2-k08-fi-020 pep-junior-v2-s2-k08-fi-021<br>pep-junior-v2-s2-k08-fi-022 pep-junior-v2-s2-k08-fi-023 pep-junior-v2-s2-k08-fi-024 pep-junior-v2-s2-k08-fi-025 pep-junior-v2-s2-k08-fi-026 pep-junior-v2-s2-k08-fi-027 pep-junior-v2-s2-k08-fi-028 pep-junior-v2-s2-k08-fi-029 pep-junior-v2-s2-k08-fi-030 pep-junior-v2-s2-k08-fi-031 pep-junior-v2-s2-k08-fi-032 pep-junior-v2-s2-k08-fi-033 pep-junior-v2-s2-k08-fi-034 pep-junior-v2-s2-k08-sa-001 pep-junior-v2-s2-k08-sa-002 pep-junior-v2-s2-k08-sa-003 pep-junior-v2-s2-k08-sa-004 pep-junior-v2-s2-k08-sa-005 pep-junior-v2-s2-k08-sa-006 pep-junior-v2-s2-k08-sa-007 pep-junior-v2-s2-k08-sa-008 pep-junior-v2-s2-k08-sa-009 pep-junior-v2-s2-k08-sa-010 pep-junior-v2-s2-k08-sa-011<br>pep-junior-v2-s2-k08-sa-012 pep-junior-v2-s2-k08-sa-013 pep-junior-v2-s2-k08-sa-014 pep-junior-v2-s2-k08-sa-015 pep-junior-v2-s2-k08-sa-016 pep-junior-v2-s2-k08-sa-017 pep-junior-v2-s2-k08-sa-018 pep-junior-v2-s2-k08-sa-019 pep-junior-v2-s2-k08-sa-020 pep-junior-v2-s2-k08-sa-021 pep-junior-v2-s2-k08-sa-022 pep-junior-v2-s2-k08-sa-023 pep-junior-v2-s2-k08-sa-024 pep-junior-v2-s2-k08-sa-025 pep-junior-v2-s2-k08-sa-026 pep-junior-v2-s2-k08-sa-027 pep-junior-v2-s2-k08-sa-028 pep-junior-v2-s2-k08-sa-029 pep-junior-v2-s2-k08-sa-030 pep-junior-v2-s2-k08-sa-031 pep-junior-v2-s2-k08-sa-032 pep-junior-v2-s2-k08-sa-033 pep-junior-v2-s2-k08-sa-034 pep-junior-v2-s2-k06-mc-001<br>pep-junior-v2-s2-k06-mc-002 pep-junior-v2-s2-k06-mc-003 pep-junior-v2-s2-k06-mc-004 pep-junior-v2-s2-k06-mc-005 pep-junior-v2-s2-k06-mc-006 pep-junior-v2-s2-k06-mc-007 pep-junior-v2-s2-k06-mc-008 pep-junior-v2-s2-k06-mc-009 pep-junior-v2-s2-k06-mc-010 pep-junior-v2-s2-k06-mc-011 pep-junior-v2-s2-k06-mc-012 pep-junior-v2-s2-k06-mc-013 pep-junior-v2-s2-k06-mc-014 pep-junior-v2-s2-k06-mc-015 pep-junior-v2-s2-k06-mc-016 pep-junior-v2-s2-k06-mc-017 pep-junior-v2-s2-k06-mc-018 pep-junior-v2-s2-k06-mc-019 pep-junior-v2-s2-k06-mc-020 pep-junior-v2-s2-k06-mc-021 pep-junior-v2-s2-k06-mc-022 pep-junior-v2-s2-k06-mc-023 pep-junior-v2-s2-k06-mc-024 pep-junior-v2-s2-k06-mc-025<br>pep-junior-v2-s2-k06-mc-026 pep-junior-v2-s2-k06-mc-027 pep-junior-v2-s2-k06-mc-028 pep-junior-v2-s2-k06-mc-029 pep-junior-v2-s2-k06-mc-030 pep-junior-v2-s2-k06-mc-031 pep-junior-v2-s2-k06-mc-032 pep-junior-v2-s2-k06-mc-033 pep-junior-v2-s2-k06-mc-034 pep-junior-v2-s2-k06-fi-001 pep-junior-v2-s2-k06-fi-002 pep-junior-v2-s2-k06-fi-003 pep-junior-v2-s2-k06-fi-004 pep-junior-v2-s2-k06-fi-005 pep-junior-v2-s2-k06-fi-006 pep-junior-v2-s2-k06-fi-007 pep-junior-v2-s2-k06-fi-008 pep-junior-v2-s2-k06-fi-009 pep-junior-v2-s2-k06-fi-010 pep-junior-v2-s2-k06-fi-011 pep-junior-v2-s2-k06-fi-012 pep-junior-v2-s2-k06-fi-013 pep-junior-v2-s2-k06-fi-014 pep-junior-v2-s2-k06-fi-015<br>pep-junior-v2-s2-k06-fi-016 pep-junior-v2-s2-k06-fi-017 pep-junior-v2-s2-k06-fi-018 pep-junior-v2-s2-k06-fi-019 pep-junior-v2-s2-k06-fi-020 pep-junior-v2-s2-k06-fi-021 pep-junior-v2-s2-k06-fi-022 pep-junior-v2-s2-k06-fi-023 pep-junior-v2-s2-k06-fi-024 pep-junior-v2-s2-k06-fi-025 pep-junior-v2-s2-k06-fi-026 pep-junior-v2-s2-k06-fi-027 pep-junior-v2-s2-k06-fi-028 pep-junior-v2-s2-k06-fi-029 pep-junior-v2-s2-k06-fi-030 pep-junior-v2-s2-k06-fi-031 pep-junior-v2-s2-k06-fi-032 pep-junior-v2-s2-k06-fi-033 pep-junior-v2-s2-k06-fi-034 pep-junior-v2-s2-k06-sa-001 pep-junior-v2-s2-k06-sa-002 pep-junior-v2-s2-k06-sa-003 pep-junior-v2-s2-k06-sa-004 pep-junior-v2-s2-k06-sa-005<br>pep-junior-v2-s2-k06-sa-006 pep-junior-v2-s2-k06-sa-007 pep-junior-v2-s2-k06-sa-008 pep-junior-v2-s2-k06-sa-009 pep-junior-v2-s2-k06-sa-010 pep-junior-v2-s2-k06-sa-011 pep-junior-v2-s2-k06-sa-012 pep-junior-v2-s2-k06-sa-013 pep-junior-v2-s2-k06-sa-014 pep-junior-v2-s2-k06-sa-015 pep-junior-v2-s2-k06-sa-016 pep-junior-v2-s2-k06-sa-017 pep-junior-v2-s2-k06-sa-018 pep-junior-v2-s2-k06-sa-019 pep-junior-v2-s2-k06-sa-020 pep-junior-v2-s2-k06-sa-021 pep-junior-v2-s2-k06-sa-022 pep-junior-v2-s2-k06-sa-023 pep-junior-v2-s2-k06-sa-024 pep-junior-v2-s2-k06-sa-025 pep-junior-v2-s2-k06-sa-026 pep-junior-v2-s2-k06-sa-027 pep-junior-v2-s2-k06-sa-028 pep-junior-v2-s2-k06-sa-029<br>pep-junior-v2-s2-k06-sa-030 pep-junior-v2-s2-k06-sa-031 pep-junior-v2-s2-k06-sa-032 pep-junior-v2-s2-k06-sa-033 pep-junior-v2-s3-k11-fi-001 pep-junior-v2-s3-k11-fi-002 pep-junior-v2-s3-k11-fi-003 pep-junior-v2-s3-k11-fi-004 pep-junior-v2-s3-k11-fi-005 pep-junior-v2-s3-k11-fi-006 pep-junior-v2-s3-k11-fi-007 pep-junior-v2-s3-k11-fi-008 pep-junior-v2-s3-k11-fi-009 pep-junior-v2-s3-k11-fi-010 pep-junior-v2-s3-k11-fi-011 pep-junior-v2-s3-k11-fi-012 pep-junior-v2-s3-k11-fi-013 pep-junior-v2-s3-k11-fi-014 pep-junior-v2-s3-k11-fi-015 pep-junior-v2-s3-k11-fi-016 pep-junior-v2-s3-k11-fi-017 pep-junior-v2-s3-k11-fi-018 pep-junior-v2-s3-k11-fi-019 pep-junior-v2-s3-k11-fi-020<br>pep-junior-v2-s3-k11-fi-021 pep-junior-v2-s3-k11-fi-022 pep-junior-v2-s3-k11-fi-023 pep-junior-v2-s3-k11-fi-024 pep-junior-v2-s3-k11-fi-025 pep-junior-v2-s3-k11-fi-026 pep-junior-v2-s3-k11-fi-027 pep-junior-v2-s3-k11-fi-028 pep-junior-v2-s3-k11-fi-029 pep-junior-v2-s3-k11-fi-030 pep-junior-v2-s3-k11-fi-031 pep-junior-v2-s3-k11-fi-032 pep-junior-v2-s3-k11-fi-033 pep-junior-v2-s3-k11-fi-034 pep-junior-v2-s3-k11-fi-035 pep-junior-v2-s3-k11-fi-036 pep-junior-v2-s3-k11-fi-037 pep-junior-v2-s3-k11-fi-038 pep-junior-v2-s3-k11-fi-039 pep-junior-v2-s3-k11-fi-040 pep-junior-v2-s3-k11-fi-041 pep-junior-v2-s3-k11-fi-042 pep-junior-v2-s3-k11-fi-043 pep-junior-v2-s3-k11-fi-044<br>pep-junior-v2-s3-k11-fi-045 pep-junior-v2-s3-k11-fi-046 pep-junior-v2-s3-k11-fi-047 pep-junior-v2-s3-k11-fi-048 pep-junior-v2-s3-k11-fi-049 pep-junior-v2-s3-k11-fi-050 pep-junior-v2-s3-k11-fi-051 pep-junior-v2-s3-k11-fi-052 pep-junior-v2-s3-k11-fi-053 pep-junior-v2-s3-k11-fi-054 pep-junior-v2-s3-k11-fi-055 pep-junior-v2-s3-k11-fi-056 pep-junior-v2-s3-k11-fi-057 pep-junior-v2-s3-k11-fi-058 pep-junior-v2-s3-k11-fi-059 pep-junior-v2-s3-k11-fi-060 pep-junior-v2-s3-k11-fi-061 pep-junior-v2-s3-k11-fi-062 pep-junior-v2-s3-k11-fi-063 pep-junior-v2-s3-k11-fi-064 pep-junior-v2-s3-k11-fi-065 pep-junior-v2-s3-k11-fi-066 pep-junior-v2-s3-k11-fi-067 pep-junior-v2-s3-k11-sa-001<br>pep-junior-v2-s3-k11-sa-002 pep-junior-v2-s3-k11-sa-003 pep-junior-v2-s3-k11-sa-004 pep-junior-v2-s3-k11-sa-005 pep-junior-v2-s3-k11-sa-006 pep-junior-v2-s3-k11-sa-007 pep-junior-v2-s3-k11-sa-008 pep-junior-v2-s3-k11-sa-009 pep-junior-v2-s3-k11-sa-010 pep-junior-v2-s3-k11-sa-011 pep-junior-v2-s3-k11-sa-012 pep-junior-v2-s3-k11-sa-013 pep-junior-v2-s3-k11-sa-014 pep-junior-v2-s3-k11-sa-015 pep-junior-v2-s3-k11-sa-016 pep-junior-v2-s3-k11-sa-017 pep-junior-v2-s3-k11-sa-018 pep-junior-v2-s3-k11-sa-019 pep-junior-v2-s3-k11-sa-020 pep-junior-v2-s3-k11-sa-021 pep-junior-v2-s3-k11-sa-022 pep-junior-v2-s3-k11-sa-023 pep-junior-v2-s3-k11-sa-024 pep-junior-v2-s3-k11-sa-025<br>pep-junior-v2-s3-k11-sa-026 pep-junior-v2-s3-k11-sa-027 pep-junior-v2-s3-k11-sa-028 pep-junior-v2-s3-k11-sa-029 pep-junior-v2-s3-k11-sa-030 pep-junior-v2-s3-k11-sa-031 pep-junior-v2-s3-k11-sa-032 pep-junior-v2-s3-k11-sa-033 pep-junior-v2-s3-k11-sa-034 pep-junior-v2-s3-k11-sa-035 pep-junior-v2-s3-k11-sa-036 pep-junior-v2-s3-k11-sa-037 pep-junior-v2-s3-k11-sa-038 pep-junior-v2-s3-k11-sa-039 pep-junior-v2-s3-k11-sa-040 pep-junior-v2-s3-k11-sa-041 pep-junior-v2-s3-k11-sa-042 pep-junior-v2-s3-k11-sa-043 pep-junior-v2-s3-k11-sa-044 pep-junior-v2-s3-k11-sa-045 pep-junior-v2-s3-k11-sa-046 pep-junior-v2-s3-k11-sa-047 pep-junior-v2-s3-k11-sa-048 pep-junior-v2-s3-k11-sa-049<br>pep-junior-v2-s3-k11-sa-050 pep-junior-v2-s3-k11-sa-051 pep-junior-v2-s3-k11-sa-052 pep-junior-v2-s3-k11-sa-053 pep-junior-v2-s3-k11-sa-054 pep-junior-v2-s3-k11-sa-055 pep-junior-v2-s3-k11-sa-056 pep-junior-v2-s3-k11-sa-057 pep-junior-v2-s3-k11-sa-058 pep-junior-v2-s3-k11-sa-059 pep-junior-v2-s3-k11-sa-060 pep-junior-v2-s3-k11-sa-061 pep-junior-v2-s3-k11-sa-062 pep-junior-v2-s3-k11-sa-063 pep-junior-v2-s3-k11-sa-064 pep-junior-v2-s3-k11-sa-065 pep-junior-v2-s3-k11-sa-066 pep-junior-v2-s3-k11-sa-067

### 统计与概率可视化 (statistics_probability)

- Phase: optional-second-batch
- GPT Image2 batch: batch-2-optional-statistics-probability
- Question count: 133
- Question IDs: pep-junior-v2-s1-k05-sa-001 pep-junior-v2-s1-k05-sa-002 pep-junior-v2-s1-k05-sa-003 pep-junior-v2-s1-k05-sa-004 pep-junior-v2-s1-k05-sa-005 pep-junior-v2-s1-k05-sa-006 pep-junior-v2-s1-k05-sa-007 pep-junior-v2-s1-k05-sa-008 pep-junior-v2-s1-k05-sa-009 pep-junior-v2-s1-k05-sa-010 pep-junior-v2-s1-k05-sa-011 pep-junior-v2-s1-k05-sa-012 pep-junior-v2-s1-k05-sa-013 pep-junior-v2-s1-k05-sa-014 pep-junior-v2-s1-k05-sa-015 pep-junior-v2-s1-k05-sa-016 pep-junior-v2-s1-k05-sa-017 pep-junior-v2-s1-k05-sa-018 pep-junior-v2-s1-k05-sa-019 pep-junior-v2-s1-k05-sa-020 pep-junior-v2-s1-k05-sa-021 pep-junior-v2-s1-k05-sa-022 pep-junior-v2-s1-k05-sa-023 pep-junior-v2-s1-k05-sa-024<br>pep-junior-v2-s1-k05-sa-025 pep-junior-v2-s1-k05-sa-026 pep-junior-v2-s1-k05-sa-027 pep-junior-v2-s1-k05-sa-028 pep-junior-v2-s1-k05-sa-029 pep-junior-v2-s1-k05-sa-030 pep-junior-v2-s1-k05-sa-031 pep-junior-v2-s1-k05-sa-032 pep-junior-v2-s1-k05-sa-033 pep-junior-v2-s2-k09-sa-001 pep-junior-v2-s2-k09-sa-002 pep-junior-v2-s2-k09-sa-003 pep-junior-v2-s2-k09-sa-004 pep-junior-v2-s2-k09-sa-005 pep-junior-v2-s2-k09-sa-006 pep-junior-v2-s2-k09-sa-007 pep-junior-v2-s2-k09-sa-008 pep-junior-v2-s2-k09-sa-009 pep-junior-v2-s2-k09-sa-010 pep-junior-v2-s2-k09-sa-011 pep-junior-v2-s2-k09-sa-012 pep-junior-v2-s2-k09-sa-013 pep-junior-v2-s2-k09-sa-014 pep-junior-v2-s2-k09-sa-015<br>pep-junior-v2-s2-k09-sa-016 pep-junior-v2-s2-k09-sa-017 pep-junior-v2-s2-k09-sa-018 pep-junior-v2-s2-k09-sa-019 pep-junior-v2-s2-k09-sa-020 pep-junior-v2-s2-k09-sa-021 pep-junior-v2-s2-k09-sa-022 pep-junior-v2-s2-k09-sa-023 pep-junior-v2-s2-k09-sa-024 pep-junior-v2-s2-k09-sa-025 pep-junior-v2-s2-k09-sa-026 pep-junior-v2-s2-k09-sa-027 pep-junior-v2-s2-k09-sa-028 pep-junior-v2-s2-k09-sa-029 pep-junior-v2-s2-k09-sa-030 pep-junior-v2-s2-k09-sa-031 pep-junior-v2-s2-k09-sa-032 pep-junior-v2-s2-k09-sa-033 pep-junior-v2-s3-k10-sa-001 pep-junior-v2-s3-k10-sa-002 pep-junior-v2-s3-k10-sa-003 pep-junior-v2-s3-k10-sa-004 pep-junior-v2-s3-k10-sa-005 pep-junior-v2-s3-k10-sa-006<br>pep-junior-v2-s3-k10-sa-007 pep-junior-v2-s3-k10-sa-008 pep-junior-v2-s3-k10-sa-009 pep-junior-v2-s3-k10-sa-010 pep-junior-v2-s3-k10-sa-011 pep-junior-v2-s3-k10-sa-012 pep-junior-v2-s3-k10-sa-013 pep-junior-v2-s3-k10-sa-014 pep-junior-v2-s3-k10-sa-015 pep-junior-v2-s3-k10-sa-016 pep-junior-v2-s3-k10-sa-017 pep-junior-v2-s3-k10-sa-018 pep-junior-v2-s3-k10-sa-019 pep-junior-v2-s3-k10-sa-020 pep-junior-v2-s3-k10-sa-021 pep-junior-v2-s3-k10-sa-022 pep-junior-v2-s3-k10-sa-023 pep-junior-v2-s3-k10-sa-024 pep-junior-v2-s3-k10-sa-025 pep-junior-v2-s3-k10-sa-026 pep-junior-v2-s3-k10-sa-027 pep-junior-v2-s3-k10-sa-028 pep-junior-v2-s3-k10-sa-029 pep-junior-v2-s3-k10-sa-030<br>pep-junior-v2-s3-k10-sa-031 pep-junior-v2-s3-k10-sa-032 pep-junior-v2-s3-k10-sa-033 pep-junior-v2-s3-k10-sa-034 pep-junior-v2-s3-k10-sa-035 pep-junior-v2-s3-k10-sa-036 pep-junior-v2-s3-k10-sa-037 pep-junior-v2-s3-k10-sa-038 pep-junior-v2-s3-k10-sa-039 pep-junior-v2-s3-k10-sa-040 pep-junior-v2-s3-k10-sa-041 pep-junior-v2-s3-k10-sa-042 pep-junior-v2-s3-k10-sa-043 pep-junior-v2-s3-k10-sa-044 pep-junior-v2-s3-k10-sa-045 pep-junior-v2-s3-k10-sa-046 pep-junior-v2-s3-k10-sa-047 pep-junior-v2-s3-k10-sa-048 pep-junior-v2-s3-k10-sa-049 pep-junior-v2-s3-k10-sa-050 pep-junior-v2-s3-k10-sa-051 pep-junior-v2-s3-k10-sa-052 pep-junior-v2-s3-k10-sa-053 pep-junior-v2-s3-k10-sa-054<br>pep-junior-v2-s3-k10-sa-055 pep-junior-v2-s3-k10-sa-056 pep-junior-v2-s3-k10-sa-057 pep-junior-v2-s3-k10-sa-058 pep-junior-v2-s3-k10-sa-059 pep-junior-v2-s3-k10-sa-060 pep-junior-v2-s3-k10-sa-061 pep-junior-v2-s3-k10-sa-062 pep-junior-v2-s3-k10-sa-063 pep-junior-v2-s3-k10-sa-064 pep-junior-v2-s3-k10-sa-065 pep-junior-v2-s3-k10-sa-066 pep-junior-v2-s3-k10-sa-067

### 纯文字/代数题 (text_only)

- Phase: not-needed
- GPT Image2 batch: not-planned
- Question count: 376
- Question IDs: pep-junior-v2-s1-k05-mc-001 pep-junior-v2-s1-k05-mc-002 pep-junior-v2-s1-k05-mc-003 pep-junior-v2-s1-k05-mc-004 pep-junior-v2-s1-k05-mc-005 pep-junior-v2-s1-k05-mc-006 pep-junior-v2-s1-k05-mc-007 pep-junior-v2-s1-k05-mc-008 pep-junior-v2-s1-k05-mc-009 pep-junior-v2-s1-k05-mc-010 pep-junior-v2-s1-k05-mc-011 pep-junior-v2-s1-k05-mc-012 pep-junior-v2-s1-k05-mc-013 pep-junior-v2-s1-k05-mc-014 pep-junior-v2-s1-k05-mc-015 pep-junior-v2-s1-k05-mc-016 pep-junior-v2-s1-k05-mc-017 pep-junior-v2-s1-k05-mc-018 pep-junior-v2-s1-k05-mc-019 pep-junior-v2-s1-k05-mc-020 pep-junior-v2-s1-k05-mc-021 pep-junior-v2-s1-k05-mc-022 pep-junior-v2-s1-k05-mc-023 pep-junior-v2-s1-k05-mc-024<br>pep-junior-v2-s1-k05-mc-025 pep-junior-v2-s1-k05-mc-026 pep-junior-v2-s1-k05-mc-027 pep-junior-v2-s1-k05-mc-028 pep-junior-v2-s1-k05-mc-029 pep-junior-v2-s1-k05-mc-030 pep-junior-v2-s1-k05-mc-031 pep-junior-v2-s1-k05-mc-032 pep-junior-v2-s1-k05-mc-033 pep-junior-v2-s1-k05-fi-001 pep-junior-v2-s1-k05-fi-002 pep-junior-v2-s1-k05-fi-003 pep-junior-v2-s1-k05-fi-004 pep-junior-v2-s1-k05-fi-005 pep-junior-v2-s1-k05-fi-006 pep-junior-v2-s1-k05-fi-007 pep-junior-v2-s1-k05-fi-008 pep-junior-v2-s1-k05-fi-009 pep-junior-v2-s1-k05-fi-010 pep-junior-v2-s1-k05-fi-011 pep-junior-v2-s1-k05-fi-012 pep-junior-v2-s1-k05-fi-013 pep-junior-v2-s1-k05-fi-014 pep-junior-v2-s1-k05-fi-015<br>pep-junior-v2-s1-k05-fi-016 pep-junior-v2-s1-k05-fi-017 pep-junior-v2-s1-k05-fi-018 pep-junior-v2-s1-k05-fi-019 pep-junior-v2-s1-k05-fi-020 pep-junior-v2-s1-k05-fi-021 pep-junior-v2-s1-k05-fi-022 pep-junior-v2-s1-k05-fi-023 pep-junior-v2-s1-k05-fi-024 pep-junior-v2-s1-k05-fi-025 pep-junior-v2-s1-k05-fi-026 pep-junior-v2-s1-k05-fi-027 pep-junior-v2-s1-k05-fi-028 pep-junior-v2-s1-k05-fi-029 pep-junior-v2-s1-k05-fi-030 pep-junior-v2-s1-k05-fi-031 pep-junior-v2-s1-k05-fi-032 pep-junior-v2-s1-k05-fi-033 pep-junior-v2-s1-k02-mc-001 pep-junior-v2-s1-k02-mc-002 pep-junior-v2-s1-k02-mc-003 pep-junior-v2-s1-k02-mc-004 pep-junior-v2-s1-k02-mc-005 pep-junior-v2-s1-k02-mc-006<br>pep-junior-v2-s1-k02-mc-007 pep-junior-v2-s1-k02-mc-008 pep-junior-v2-s1-k02-mc-009 pep-junior-v2-s1-k02-mc-010 pep-junior-v2-s1-k02-mc-011 pep-junior-v2-s1-k02-mc-012 pep-junior-v2-s1-k02-mc-013 pep-junior-v2-s1-k02-mc-014 pep-junior-v2-s1-k02-mc-015 pep-junior-v2-s1-k02-mc-016 pep-junior-v2-s1-k02-mc-017 pep-junior-v2-s1-k02-mc-018 pep-junior-v2-s1-k02-mc-019 pep-junior-v2-s1-k02-mc-020 pep-junior-v2-s1-k02-mc-021 pep-junior-v2-s1-k02-mc-022 pep-junior-v2-s1-k02-fi-001 pep-junior-v2-s1-k02-fi-002 pep-junior-v2-s1-k02-fi-003 pep-junior-v2-s1-k02-fi-004 pep-junior-v2-s1-k02-fi-005 pep-junior-v2-s1-k02-fi-006 pep-junior-v2-s1-k02-fi-007 pep-junior-v2-s1-k02-fi-008<br>pep-junior-v2-s1-k02-fi-009 pep-junior-v2-s1-k02-fi-010 pep-junior-v2-s1-k02-fi-011 pep-junior-v2-s1-k02-fi-012 pep-junior-v2-s1-k02-fi-013 pep-junior-v2-s1-k02-fi-014 pep-junior-v2-s1-k02-fi-015 pep-junior-v2-s1-k02-fi-016 pep-junior-v2-s1-k02-fi-017 pep-junior-v2-s1-k02-fi-018 pep-junior-v2-s1-k02-fi-019 pep-junior-v2-s1-k02-fi-020 pep-junior-v2-s1-k02-fi-021 pep-junior-v2-s1-k02-fi-022 pep-junior-v2-s1-k02-sa-001 pep-junior-v2-s1-k02-sa-002 pep-junior-v2-s1-k02-sa-003 pep-junior-v2-s1-k02-sa-004 pep-junior-v2-s1-k02-sa-005 pep-junior-v2-s1-k02-sa-006 pep-junior-v2-s1-k02-sa-007 pep-junior-v2-s1-k02-sa-008 pep-junior-v2-s1-k02-sa-009 pep-junior-v2-s1-k02-sa-010<br>pep-junior-v2-s1-k02-sa-011 pep-junior-v2-s1-k02-sa-012 pep-junior-v2-s1-k02-sa-013 pep-junior-v2-s1-k02-sa-014 pep-junior-v2-s1-k02-sa-015 pep-junior-v2-s1-k02-sa-016 pep-junior-v2-s1-k02-sa-017 pep-junior-v2-s1-k02-sa-018 pep-junior-v2-s1-k02-sa-019 pep-junior-v2-s1-k02-sa-020 pep-junior-v2-s1-k02-sa-021 pep-junior-v2-s1-k02-sa-022 pep-junior-v2-s1-k01-mc-001 pep-junior-v2-s1-k01-mc-002 pep-junior-v2-s1-k01-mc-003 pep-junior-v2-s1-k01-mc-004 pep-junior-v2-s1-k01-mc-005 pep-junior-v2-s1-k01-mc-006 pep-junior-v2-s1-k01-mc-007 pep-junior-v2-s1-k01-mc-008 pep-junior-v2-s1-k01-mc-009 pep-junior-v2-s1-k01-mc-010 pep-junior-v2-s1-k01-mc-011 pep-junior-v2-s1-k01-mc-012<br>pep-junior-v2-s1-k01-mc-013 pep-junior-v2-s1-k01-mc-014 pep-junior-v2-s1-k01-mc-015 pep-junior-v2-s1-k01-mc-016 pep-junior-v2-s1-k01-mc-017 pep-junior-v2-s1-k01-mc-018 pep-junior-v2-s1-k01-mc-019 pep-junior-v2-s1-k01-mc-020 pep-junior-v2-s1-k01-mc-021 pep-junior-v2-s1-k01-mc-022 pep-junior-v2-s1-k01-mc-023 pep-junior-v2-s1-k01-sa-001 pep-junior-v2-s1-k01-sa-002 pep-junior-v2-s1-k01-sa-003 pep-junior-v2-s1-k01-sa-004 pep-junior-v2-s1-k01-sa-005 pep-junior-v2-s1-k01-sa-006 pep-junior-v2-s1-k01-sa-007 pep-junior-v2-s1-k01-sa-008 pep-junior-v2-s1-k01-sa-009 pep-junior-v2-s1-k01-sa-010 pep-junior-v2-s1-k01-sa-011 pep-junior-v2-s1-k01-sa-012 pep-junior-v2-s1-k01-sa-013<br>pep-junior-v2-s1-k01-sa-014 pep-junior-v2-s1-k01-sa-015 pep-junior-v2-s1-k01-sa-016 pep-junior-v2-s1-k01-sa-017 pep-junior-v2-s1-k01-sa-018 pep-junior-v2-s1-k01-sa-019 pep-junior-v2-s1-k01-sa-020 pep-junior-v2-s1-k01-sa-021 pep-junior-v2-s1-k01-sa-022 pep-junior-v2-s2-k08-mc-001 pep-junior-v2-s2-k08-mc-002 pep-junior-v2-s2-k08-mc-003 pep-junior-v2-s2-k08-mc-004 pep-junior-v2-s2-k08-mc-005 pep-junior-v2-s2-k08-mc-006 pep-junior-v2-s2-k08-mc-007 pep-junior-v2-s2-k08-mc-008 pep-junior-v2-s2-k08-mc-009 pep-junior-v2-s2-k08-mc-010 pep-junior-v2-s2-k08-mc-011 pep-junior-v2-s2-k08-mc-012 pep-junior-v2-s2-k08-mc-013 pep-junior-v2-s2-k08-mc-014 pep-junior-v2-s2-k08-mc-015<br>pep-junior-v2-s2-k08-mc-016 pep-junior-v2-s2-k08-mc-017 pep-junior-v2-s2-k08-mc-018 pep-junior-v2-s2-k08-mc-019 pep-junior-v2-s2-k08-mc-020 pep-junior-v2-s2-k08-mc-021 pep-junior-v2-s2-k08-mc-022 pep-junior-v2-s2-k08-mc-023 pep-junior-v2-s2-k08-mc-024 pep-junior-v2-s2-k08-mc-025 pep-junior-v2-s2-k08-mc-026 pep-junior-v2-s2-k08-mc-027 pep-junior-v2-s2-k08-mc-028 pep-junior-v2-s2-k08-mc-029 pep-junior-v2-s2-k08-mc-030 pep-junior-v2-s2-k08-mc-031 pep-junior-v2-s2-k08-mc-032 pep-junior-v2-s2-k08-mc-033 pep-junior-v2-s2-k07-mc-001 pep-junior-v2-s2-k07-mc-002 pep-junior-v2-s2-k07-mc-003 pep-junior-v2-s2-k07-mc-004 pep-junior-v2-s2-k07-mc-005 pep-junior-v2-s2-k07-mc-006<br>pep-junior-v2-s2-k07-mc-007 pep-junior-v2-s2-k07-mc-008 pep-junior-v2-s2-k07-mc-009 pep-junior-v2-s2-k07-mc-010 pep-junior-v2-s2-k07-mc-011 pep-junior-v2-s2-k07-mc-012 pep-junior-v2-s2-k07-mc-013 pep-junior-v2-s2-k07-mc-014 pep-junior-v2-s2-k07-mc-015 pep-junior-v2-s2-k07-mc-016 pep-junior-v2-s2-k07-mc-017 pep-junior-v2-s2-k07-mc-018 pep-junior-v2-s2-k07-mc-019 pep-junior-v2-s2-k07-mc-020 pep-junior-v2-s2-k07-mc-021 pep-junior-v2-s2-k07-mc-022 pep-junior-v2-s2-k07-mc-023 pep-junior-v2-s2-k07-mc-024 pep-junior-v2-s2-k07-mc-025 pep-junior-v2-s2-k07-mc-026 pep-junior-v2-s2-k07-mc-027 pep-junior-v2-s2-k07-mc-028 pep-junior-v2-s2-k07-mc-029 pep-junior-v2-s2-k07-mc-030<br>pep-junior-v2-s2-k07-mc-031 pep-junior-v2-s2-k07-mc-032 pep-junior-v2-s2-k07-mc-033 pep-junior-v2-s2-k07-fi-001 pep-junior-v2-s2-k07-fi-002 pep-junior-v2-s2-k07-fi-003 pep-junior-v2-s2-k07-fi-004 pep-junior-v2-s2-k07-fi-005 pep-junior-v2-s2-k07-fi-006 pep-junior-v2-s2-k07-fi-007 pep-junior-v2-s2-k07-fi-008 pep-junior-v2-s2-k07-fi-009 pep-junior-v2-s2-k07-fi-010 pep-junior-v2-s2-k07-fi-011 pep-junior-v2-s2-k07-fi-012 pep-junior-v2-s2-k07-fi-013 pep-junior-v2-s2-k07-fi-014 pep-junior-v2-s2-k07-fi-015 pep-junior-v2-s2-k07-fi-016 pep-junior-v2-s2-k07-fi-017 pep-junior-v2-s2-k07-fi-018 pep-junior-v2-s2-k07-fi-019 pep-junior-v2-s2-k07-fi-020 pep-junior-v2-s2-k07-fi-021<br>pep-junior-v2-s2-k07-fi-022 pep-junior-v2-s2-k07-fi-023 pep-junior-v2-s2-k07-fi-024 pep-junior-v2-s2-k07-fi-025 pep-junior-v2-s2-k07-fi-026 pep-junior-v2-s2-k07-fi-027 pep-junior-v2-s2-k07-fi-028 pep-junior-v2-s2-k07-fi-029 pep-junior-v2-s2-k07-fi-030 pep-junior-v2-s2-k07-fi-031 pep-junior-v2-s2-k07-fi-032 pep-junior-v2-s2-k07-fi-033 pep-junior-v2-s2-k07-sa-001 pep-junior-v2-s2-k07-sa-002 pep-junior-v2-s2-k07-sa-003 pep-junior-v2-s2-k07-sa-004 pep-junior-v2-s2-k07-sa-005 pep-junior-v2-s2-k07-sa-006 pep-junior-v2-s2-k07-sa-007 pep-junior-v2-s2-k07-sa-008 pep-junior-v2-s2-k07-sa-009 pep-junior-v2-s2-k07-sa-010 pep-junior-v2-s2-k07-sa-011 pep-junior-v2-s2-k07-sa-012<br>pep-junior-v2-s2-k07-sa-013 pep-junior-v2-s2-k07-sa-014 pep-junior-v2-s2-k07-sa-015 pep-junior-v2-s2-k07-sa-016 pep-junior-v2-s2-k07-sa-017 pep-junior-v2-s2-k07-sa-018 pep-junior-v2-s2-k07-sa-019 pep-junior-v2-s2-k07-sa-020 pep-junior-v2-s2-k07-sa-021 pep-junior-v2-s2-k07-sa-022 pep-junior-v2-s2-k07-sa-023 pep-junior-v2-s2-k07-sa-024 pep-junior-v2-s2-k07-sa-025 pep-junior-v2-s2-k07-sa-026 pep-junior-v2-s2-k07-sa-027 pep-junior-v2-s2-k07-sa-028 pep-junior-v2-s2-k07-sa-029 pep-junior-v2-s2-k07-sa-030 pep-junior-v2-s2-k07-sa-031 pep-junior-v2-s2-k07-sa-032 pep-junior-v2-s2-k07-sa-033 pep-junior-v2-s3-k10-mc-001 pep-junior-v2-s3-k10-mc-002 pep-junior-v2-s3-k10-mc-003<br>pep-junior-v2-s3-k10-mc-004 pep-junior-v2-s3-k10-mc-005 pep-junior-v2-s3-k10-mc-006 pep-junior-v2-s3-k10-mc-007 pep-junior-v2-s3-k10-mc-008 pep-junior-v2-s3-k10-mc-009 pep-junior-v2-s3-k10-mc-010 pep-junior-v2-s3-k10-mc-011 pep-junior-v2-s3-k10-mc-012 pep-junior-v2-s3-k10-mc-013 pep-junior-v2-s3-k10-mc-014 pep-junior-v2-s3-k10-mc-015 pep-junior-v2-s3-k10-mc-016 pep-junior-v2-s3-k10-mc-017 pep-junior-v2-s3-k10-mc-018 pep-junior-v2-s3-k10-mc-019 pep-junior-v2-s3-k10-mc-020 pep-junior-v2-s3-k10-mc-021 pep-junior-v2-s3-k10-mc-022 pep-junior-v2-s3-k10-mc-023 pep-junior-v2-s3-k10-mc-024 pep-junior-v2-s3-k10-mc-025 pep-junior-v2-s3-k10-mc-026 pep-junior-v2-s3-k10-mc-027<br>pep-junior-v2-s3-k10-mc-028 pep-junior-v2-s3-k10-mc-029 pep-junior-v2-s3-k10-mc-030 pep-junior-v2-s3-k10-mc-031 pep-junior-v2-s3-k10-mc-032 pep-junior-v2-s3-k10-mc-033 pep-junior-v2-s3-k10-mc-034 pep-junior-v2-s3-k10-mc-035 pep-junior-v2-s3-k10-mc-036 pep-junior-v2-s3-k10-mc-037 pep-junior-v2-s3-k10-mc-038 pep-junior-v2-s3-k10-mc-039 pep-junior-v2-s3-k10-mc-040 pep-junior-v2-s3-k10-mc-041 pep-junior-v2-s3-k10-mc-042 pep-junior-v2-s3-k10-mc-043 pep-junior-v2-s3-k10-mc-044 pep-junior-v2-s3-k10-mc-045 pep-junior-v2-s3-k10-mc-046 pep-junior-v2-s3-k10-mc-047 pep-junior-v2-s3-k10-mc-048 pep-junior-v2-s3-k10-mc-049 pep-junior-v2-s3-k10-mc-050 pep-junior-v2-s3-k10-mc-051<br>pep-junior-v2-s3-k10-mc-052 pep-junior-v2-s3-k10-mc-053 pep-junior-v2-s3-k10-mc-054 pep-junior-v2-s3-k10-mc-055 pep-junior-v2-s3-k10-mc-056 pep-junior-v2-s3-k10-mc-057 pep-junior-v2-s3-k10-mc-058 pep-junior-v2-s3-k10-mc-059 pep-junior-v2-s3-k10-mc-060 pep-junior-v2-s3-k10-mc-061 pep-junior-v2-s3-k10-mc-062 pep-junior-v2-s3-k10-mc-063 pep-junior-v2-s3-k10-mc-064 pep-junior-v2-s3-k10-mc-065 pep-junior-v2-s3-k10-mc-066 pep-junior-v2-s3-k10-mc-067


## Manual Review Samples

Each category includes 10 samples for S18 spot-checking before any GPT Image2 production run.

### 显式图形/图象题 (explicit_graph_or_figure)

| Question ID | Grade | Type | Difficulty | Template | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-junior-v2-s2-k09-fi-001 | S2 | fill-in | Exam | pep-junior-illustration-template-016 | 一次函数图象经过点(2,5)和(4,15)，它的斜率是____。 |
| pep-junior-v2-s2-k09-fi-002 | S2 | fill-in | Exam | pep-junior-illustration-template-016 | 一次函数图象经过点(3,7)和(5,13)，它的斜率是____。 |
| pep-junior-v2-s2-k09-fi-003 | S2 | fill-in | Exam | pep-junior-illustration-template-016 | 一次函数图象经过点(4,2)和(6,14)，它的斜率是____。 |
| pep-junior-v2-s2-k09-fi-004 | S2 | fill-in | Exam | pep-junior-illustration-template-016 | 一次函数图象经过点(5,4)和(7,12)，它的斜率是____。 |
| pep-junior-v2-s2-k09-fi-005 | S2 | fill-in | Exam | pep-junior-illustration-template-016 | 一次函数图象经过点(1,6)和(3,10)，它的斜率是____。 |
| pep-junior-v2-s2-k09-fi-006 | S2 | fill-in | Exam | pep-junior-illustration-template-016 | 一次函数图象经过点(2,8)和(4,18)，它的斜率是____。 |
| pep-junior-v2-s2-k09-fi-007 | S2 | fill-in | Exam | pep-junior-illustration-template-016 | 一次函数图象经过点(3,3)和(5,9)，它的斜率是____。 |
| pep-junior-v2-s2-k09-fi-008 | S2 | fill-in | Exam | pep-junior-illustration-template-016 | 一次函数图象经过点(4,5)和(6,17)，它的斜率是____。 |
| pep-junior-v2-s2-k09-fi-009 | S2 | fill-in | Exam | pep-junior-illustration-template-016 | 一次函数图象经过点(5,7)和(7,15)，它的斜率是____。 |
| pep-junior-v2-s2-k09-fi-010 | S2 | fill-in | Exam | pep-junior-illustration-template-016 | 一次函数图象经过点(1,2)和(3,6)，它的斜率是____。 |

### 坐标与函数图象 (coordinate_function)

| Question ID | Grade | Type | Difficulty | Template | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-junior-v2-s1-k04-mc-001 | S1 | multiple-choice | Core | pep-junior-illustration-template-012 | 点P(4,-6)先向右平移3个单位，再向下平移3个单位，所得点的坐标是？ |
| pep-junior-v2-s1-k04-mc-002 | S1 | multiple-choice | Core | pep-junior-illustration-template-012 | 点P(5,-3)先向右平移4个单位，再向下平移1个单位，所得点的坐标是？ |
| pep-junior-v2-s1-k04-mc-003 | S1 | multiple-choice | Core | pep-junior-illustration-template-012 | 点P(-5,0)先向右平移5个单位，再向下平移3个单位，所得点的坐标是？ |
| pep-junior-v2-s1-k04-mc-004 | S1 | multiple-choice | Core | pep-junior-illustration-template-012 | 点P(-4,3)先向右平移6个单位，再向下平移1个单位，所得点的坐标是？ |
| pep-junior-v2-s1-k04-mc-005 | S1 | multiple-choice | Core | pep-junior-illustration-template-012 | 点P(-3,6)先向右平移2个单位，再向下平移3个单位，所得点的坐标是？ |
| pep-junior-v2-s1-k04-mc-006 | S1 | multiple-choice | Core | pep-junior-illustration-template-012 | 点P(-2,-4)先向右平移3个单位，再向下平移1个单位，所得点的坐标是？ |
| pep-junior-v2-s1-k04-mc-007 | S1 | multiple-choice | Core | pep-junior-illustration-template-012 | 点P(-1,-1)先向右平移4个单位，再向下平移3个单位，所得点的坐标是？ |
| pep-junior-v2-s1-k04-mc-008 | S1 | multiple-choice | Core | pep-junior-illustration-template-012 | 点P(0,2)先向右平移5个单位，再向下平移1个单位，所得点的坐标是？ |
| pep-junior-v2-s1-k04-mc-009 | S1 | multiple-choice | Core | pep-junior-illustration-template-012 | 点P(1,5)先向右平移6个单位，再向下平移3个单位，所得点的坐标是？ |
| pep-junior-v2-s1-k04-mc-010 | S1 | multiple-choice | Core | pep-junior-illustration-template-012 | 点P(2,-5)先向右平移2个单位，再向下平移1个单位，所得点的坐标是？ |

### 数轴 (number_line)

| Question ID | Grade | Type | Difficulty | Template | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-junior-v2-s1-k01-fi-001 | S1 | fill-in | Foundation | pep-junior-illustration-template-020 | 数轴上点A表示-6，点B表示2。A、B两点之间的距离是____。 |
| pep-junior-v2-s1-k01-fi-002 | S1 | fill-in | Foundation | pep-junior-illustration-template-020 | 数轴上点A表示-7，点B表示5。A、B两点之间的距离是____。 |
| pep-junior-v2-s1-k01-fi-003 | S1 | fill-in | Foundation | pep-junior-illustration-template-020 | 数轴上点A表示-8，点B表示8。A、B两点之间的距离是____。 |
| pep-junior-v2-s1-k01-fi-004 | S1 | fill-in | Foundation | pep-junior-illustration-template-020 | 数轴上点A表示-9，点B表示4。A、B两点之间的距离是____。 |
| pep-junior-v2-s1-k01-fi-005 | S1 | fill-in | Foundation | pep-junior-illustration-template-020 | 数轴上点A表示-10，点B表示7。A、B两点之间的距离是____。 |
| pep-junior-v2-s1-k01-fi-006 | S1 | fill-in | Foundation | pep-junior-illustration-template-020 | 数轴上点A表示-11，点B表示3。A、B两点之间的距离是____。 |
| pep-junior-v2-s1-k01-fi-007 | S1 | fill-in | Foundation | pep-junior-illustration-template-020 | 数轴上点A表示-12，点B表示6。A、B两点之间的距离是____。 |
| pep-junior-v2-s1-k01-fi-008 | S1 | fill-in | Foundation | pep-junior-illustration-template-020 | 数轴上点A表示-5，点B表示2。A、B两点之间的距离是____。 |
| pep-junior-v2-s1-k01-fi-009 | S1 | fill-in | Foundation | pep-junior-illustration-template-020 | 数轴上点A表示-6，点B表示5。A、B两点之间的距离是____。 |
| pep-junior-v2-s1-k01-fi-010 | S1 | fill-in | Foundation | pep-junior-illustration-template-020 | 数轴上点A表示-7，点B表示8。A、B两点之间的距离是____。 |

### 平面几何与三角函数 (plane_geometry)

| Question ID | Grade | Type | Difficulty | Template | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-junior-v2-s1-k04-fi-001 | S1 | fill-in | Core | pep-junior-illustration-template-001 | 两条平行直线被一条截线所截，一组同位角中一个角为89°，另一个同位角为____。 |
| pep-junior-v2-s1-k04-fi-002 | S1 | fill-in | Core | pep-junior-illustration-template-001 | 两条平行直线被一条截线所截，一组同位角中一个角为98°，另一个同位角为____。 |
| pep-junior-v2-s1-k04-fi-003 | S1 | fill-in | Core | pep-junior-illustration-template-001 | 两条平行直线被一条截线所截，一组同位角中一个角为107°，另一个同位角为____。 |
| pep-junior-v2-s1-k04-fi-004 | S1 | fill-in | Core | pep-junior-illustration-template-001 | 两条平行直线被一条截线所截，一组同位角中一个角为116°，另一个同位角为____。 |
| pep-junior-v2-s1-k04-fi-005 | S1 | fill-in | Core | pep-junior-illustration-template-001 | 两条平行直线被一条截线所截，一组同位角中一个角为45°，另一个同位角为____。 |
| pep-junior-v2-s1-k04-fi-006 | S1 | fill-in | Core | pep-junior-illustration-template-001 | 两条平行直线被一条截线所截，一组同位角中一个角为54°，另一个同位角为____。 |
| pep-junior-v2-s1-k04-fi-007 | S1 | fill-in | Core | pep-junior-illustration-template-001 | 两条平行直线被一条截线所截，一组同位角中一个角为63°，另一个同位角为____。 |
| pep-junior-v2-s1-k04-fi-008 | S1 | fill-in | Core | pep-junior-illustration-template-001 | 两条平行直线被一条截线所截，一组同位角中一个角为72°，另一个同位角为____。 |
| pep-junior-v2-s1-k04-fi-009 | S1 | fill-in | Core | pep-junior-illustration-template-001 | 两条平行直线被一条截线所截，一组同位角中一个角为81°，另一个同位角为____。 |
| pep-junior-v2-s1-k04-fi-010 | S1 | fill-in | Core | pep-junior-illustration-template-001 | 两条平行直线被一条截线所截，一组同位角中一个角为90°，另一个同位角为____。 |

### 统计与概率可视化 (statistics_probability)

| Question ID | Grade | Type | Difficulty | Template | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-junior-v2-s1-k05-sa-001 | S1 | short-answer | Exam | pep-junior-illustration-template-021 | 某小组三次测量的数据分别是41、44、47。求这三次数据的平均数。 |
| pep-junior-v2-s1-k05-sa-002 | S1 | short-answer | Exam | pep-junior-illustration-template-021 | 某小组三次测量的数据分别是42、45、48。求这三次数据的平均数。 |
| pep-junior-v2-s1-k05-sa-003 | S1 | short-answer | Exam | pep-junior-illustration-template-021 | 某小组三次测量的数据分别是43、46、49。求这三次数据的平均数。 |
| pep-junior-v2-s1-k05-sa-004 | S1 | short-answer | Exam | pep-junior-illustration-template-021 | 某小组三次测量的数据分别是44、47、50。求这三次数据的平均数。 |
| pep-junior-v2-s1-k05-sa-005 | S1 | short-answer | Exam | pep-junior-illustration-template-021 | 某小组三次测量的数据分别是8、11、14。求这三次数据的平均数。 |
| pep-junior-v2-s1-k05-sa-006 | S1 | short-answer | Exam | pep-junior-illustration-template-021 | 某小组三次测量的数据分别是9、12、15。求这三次数据的平均数。 |
| pep-junior-v2-s1-k05-sa-007 | S1 | short-answer | Exam | pep-junior-illustration-template-021 | 某小组三次测量的数据分别是10、13、16。求这三次数据的平均数。 |
| pep-junior-v2-s1-k05-sa-008 | S1 | short-answer | Exam | pep-junior-illustration-template-021 | 某小组三次测量的数据分别是11、14、17。求这三次数据的平均数。 |
| pep-junior-v2-s1-k05-sa-009 | S1 | short-answer | Exam | pep-junior-illustration-template-021 | 某小组三次测量的数据分别是12、15、18。求这三次数据的平均数。 |
| pep-junior-v2-s1-k05-sa-010 | S1 | short-answer | Exam | pep-junior-illustration-template-021 | 某小组三次测量的数据分别是13、16、19。求这三次数据的平均数。 |

### 纯文字/代数题 (text_only)

| Question ID | Grade | Type | Difficulty | Template | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-junior-v2-s1-k05-mc-001 | S1 | multiple-choice | Core | pep-junior-illustration-template-024 | 解不等式：2x-34 > 34。 |
| pep-junior-v2-s1-k05-mc-002 | S1 | multiple-choice | Core | pep-junior-illustration-template-024 | 解不等式：2x-35 > 35。 |
| pep-junior-v2-s1-k05-mc-003 | S1 | multiple-choice | Core | pep-junior-illustration-template-024 | 解不等式：2x-36 > 36。 |
| pep-junior-v2-s1-k05-mc-004 | S1 | multiple-choice | Core | pep-junior-illustration-template-024 | 解不等式：2x-37 > 37。 |
| pep-junior-v2-s1-k05-mc-005 | S1 | multiple-choice | Core | pep-junior-illustration-template-024 | 解不等式：2x-38 > 38。 |
| pep-junior-v2-s1-k05-mc-006 | S1 | multiple-choice | Core | pep-junior-illustration-template-024 | 解不等式：2x-39 > 39。 |
| pep-junior-v2-s1-k05-mc-007 | S1 | multiple-choice | Core | pep-junior-illustration-template-024 | 解不等式：2x-3 > 3。 |
| pep-junior-v2-s1-k05-mc-008 | S1 | multiple-choice | Core | pep-junior-illustration-template-024 | 解不等式：2x-4 > 4。 |
| pep-junior-v2-s1-k05-mc-009 | S1 | multiple-choice | Core | pep-junior-illustration-template-024 | 解不等式：2x-5 > 5。 |
| pep-junior-v2-s1-k05-mc-010 | S1 | multiple-choice | Core | pep-junior-illustration-template-024 | 解不等式：2x-6 > 6。 |

## Validation

| Check | Expected | Actual | Status |
| --- | --- | --- | --- |
| Total question count | 1200 | 1200 | PASS |
| Grade totals | S1: 400; S2: 400; S3: 400 | S1: 400; S2: 400; S3: 400 | PASS |
| Question type totals | fill-in: 400; multiple-choice: 400; short-answer: 400 | fill-in: 400; multiple-choice: 400; short-answer: 400 | PASS |
| Illustration category totals | coordinate_function: 233; explicit_graph_or_figure: 33; number_line: 23; plane_geometry: 402; statistics_probability: 133; text_only: 376 | coordinate_function: 233; explicit_graph_or_figure: 33; number_line: 23; plane_geometry: 402; statistics_probability: 133; text_only: 376 | PASS |
| Core illustration question count | 691 | 691 | PASS |
| Broad illustration question count | 824 | 824 | PASS |
| Core template family count | 20 | 20 | PASS |
| Broad template family count | 23 | 23 | PASS |
| Mutually exclusive category total | 1200 | 1200 | PASS |

## Files

- Per-question CSV: `2026-05-27-S18-mainland-pep-junior-question-illustration-needs-questions.csv`
- Template-family CSV: `2026-05-27-S18-mainland-pep-junior-question-illustration-needs-template-families.csv`
- Category question ID CSV: `2026-05-27-S18-mainland-pep-junior-question-illustration-needs-category-question-ids.csv`
- Machine-readable JSON: `2026-05-27-S18-mainland-pep-junior-question-illustration-needs.json`

## Notes For GPT Image2 Planning

- Start from `2026-05-27-S18-mainland-pep-junior-question-illustration-needs-template-families.csv`, not the raw question list, to generate base diagrams by template family before per-question variants.
- Keep exact mathematical text, coordinates, formulas, values, vertex labels, and answer-critical markings out of GPT Image2 when possible; add them later with deterministic SVG/Canvas overlays.
- The CSV queue deliberately includes `text_only` rows as explicit non-targets so totals reconcile to 1200.
- This audit does not verify final pedagogical necessity. It is a production-planning count that should be spot-checked before image generation.
