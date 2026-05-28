# S18 Mainland HJB High Question Illustration Audit

- Date: 2026-05-27
- Generated at: 2026-05-27 20:52:58 Asia/Hong_Kong
- Session: S18 Curriculum QA and content quality
- Source: `data/mainlandHjbHighQuestions.ts` via approved HJB high question-pack JSON
- Scope: MAINLAND_HJB S4-S6, wide-scope GPT Image2 preparation queue

## Executive Summary

This audit counts Mainland HJB high-school questions that should enter a later GPT Image2 planning queue under the owner-confirmed wide-scope standard. It does not call GPT Image2, does not generate images, and does not edit product question data.

- Total HJB high questions: 6000
- GPT Image2 candidate questions (P1 + P2): 3813
- Low-priority holdout questions (P3): 2187
- Current question-level diagrams: 0
- Existing HJB high lesson-level illustration files: 60
- Unique reusable template keys: 36
- Wide-scope reusable template keys: 33
- Production order: P1 -> P2 -> P3

## Priority Totals

| Tier | Meaning | Question Count |
| --- | --- | --- |
| P1 | Question-level diagram required or strongly recommended | 1622 |
| P2 | Wide-scope teaching illustration support | 2191 |
| P3 | Low-priority holdout / no first-pass image | 2187 |

## Grade, Type, And Batch Checks

| Dimension | Breakdown |
| --- | --- |
| Grade | S4: 2000; S5: 2000; S6: 2000 |
| Wide-scope grade | S4: 573; S5: 1440; S6: 1800 |
| Question type | multiple-choice: 2400; fill-in: 2100; short-answer: 1500 |
| Wide-scope type | multiple-choice: 1381; fill-in: 1295; short-answer: 1137 |
| Generation batch | hjb-v1: 1500; hjb-v2: 1500; hjb-v3-remediated: 1500; hjb-v4-remediated: 1500 |

## Category Counts

| Illustration Category | All Questions | P1/P2 Candidate Questions | Tier |
| --- | --- | --- | --- |
| 导数曲线/切线图 | 380 | 380 | P2 |
| 概率样本空间/摸球图 | 600 | 600 | P2 |
| 函数/不等式教学辅助图 | 55 | 55 | P2 |
| 函数图像/题干显式坐标图 | 14 | 14 | P1 |
| 计数原理分支/槽位图 | 380 | 380 | P2 |
| 解析几何直线坐标图 | 380 | 380 | P1 |
| 立体几何长方体/线面关系图 | 520 | 520 | P1 |
| 平面/三角几何图 | 328 | 328 | P1 |
| 三角函数单位圆/波形图 | 256 | 256 | P2 |
| 统计数据图表 | 520 | 520 | P2 |
| 圆锥曲线坐标图 | 380 | 380 | P1 |
| 暂不生成/低优先纯符号题 | 2187 | 0 | P3 |

## Chapter And Tier Counts

| Tier | Grade | Chapter | Questions |
| --- | --- |
| P1 \| S4 \| 幂函数、指数函数与对数函数 | 14 |
| P1 \| S4 \| 三角 | 248 |
| P1 \| S5 \| 简单几何体 | 220 |
| P1 \| S5 \| 空间直线与平面 | 220 |
| P1 \| S5 \| 平面直角坐标系中的直线 | 280 |
| P1 \| S5 \| 圆锥曲线 | 280 |
| P1 \| S6 \| 跨册综合：立体几何与空间向量 | 80 |
| P1 \| S6 \| 跨册综合：三角向量解析几何 | 80 |
| P1 \| S6 \| 平面直角坐标系中的直线 | 100 |
| P1 \| S6 \| 圆锥曲线 | 100 |
| P2 \| S4 \| 等式与不等式 | 14 |
| P2 \| S4 \| 函数的概念、性质及应用 | 25 |
| P2 \| S4 \| 幂、指数与对数 | 1 |
| P2 \| S4 \| 幂函数、指数函数与对数函数 | 15 |
| P2 \| S4 \| 三角 | 4 |
| P2 \| S4 \| 三角函数 | 252 |
| P2 \| S5 \| 概率初步 | 220 |
| P2 \| S5 \| 统计 | 220 |
| P2 \| S6 \| 成对数据的统计分析 | 300 |
| P2 \| S6 \| 导数及其运用 | 300 |
| P2 \| S6 \| 概率初步续 | 300 |
| P2 \| S6 \| 计数原理 | 300 |
| P2 \| S6 \| 跨册综合：概率统计 | 80 |
| P2 \| S6 \| 跨册综合：函数与导数 | 80 |
| P2 \| S6 \| 跨册综合：数列与计数 | 80 |
| P3 \| S4 \| 等式与不等式 | 186 |
| P3 \| S4 \| 复数 | 248 |
| P3 \| S4 \| 函数的概念、性质及应用 | 175 |
| P3 \| S4 \| 集合与逻辑 | 200 |
| P3 \| S4 \| 幂、指数与对数 | 199 |
| P3 \| S4 \| 幂函数、指数函数与对数函数 | 171 |
| P3 \| S4 \| 平面向量 | 248 |
| P3 \| S5 \| 空间向量及其应用 | 280 |
| P3 \| S5 \| 数列 | 280 |
| P3 \| S6 \| 空间向量及其应用 | 100 |
| P3 \| S6 \| 数列 | 100 |

## Validation

| Check | Expected | Actual | Status |
| --- | --- | --- | --- |
| Total HJB high question rows | 6000 | 6000 | PASS |
| Unique question IDs | 6000 | 6000 | PASS |
| Grade totals | S4: 2000; S5: 2000; S6: 2000 | S4: 2000; S5: 2000; S6: 2000 | PASS |
| Priority totals sum to all rows | 6000 | 6000 | PASS |
| Wide-scope candidate count equals P1 + P2 | 3813 | 3813 | PASS |
| Question-level diagram count | 0 | 0 | PASS |
| Lesson-level Mainland HJB high illustration files | 60 | 60 | PASS |
| P1/P2 category sample coverage | >=5 samples per P1/P2 category | >=5 samples per P1/P2 category | PASS |

## Manual Review Sample Coverage

| Category | Tier | Rows | Samples | Status |
| --- | --- | --- | --- | --- |
| 函数图像/题干显式坐标图 | P1 | 14 | 5 | PASS |
| 解析几何直线坐标图 | P1 | 380 | 5 | PASS |
| 立体几何长方体/线面关系图 | P1 | 520 | 5 | PASS |
| 平面/三角几何图 | P1 | 328 | 5 | PASS |
| 圆锥曲线坐标图 | P1 | 380 | 5 | PASS |
| 导数曲线/切线图 | P2 | 380 | 5 | PASS |
| 概率样本空间/摸球图 | P2 | 600 | 5 | PASS |
| 函数/不等式教学辅助图 | P2 | 55 | 5 | PASS |
| 计数原理分支/槽位图 | P2 | 380 | 5 | PASS |
| 三角函数单位圆/波形图 | P2 | 256 | 5 | PASS |
| 统计数据图表 | P2 | 520 | 5 | PASS |
| 暂不生成/低优先纯符号题 | P3 | 2187 | 5 | PASS |

## P1/P2 Manual Review Samples

### 函数图像/题干显式坐标图

| Question ID | Grade | Chapter | Type | Prompt | Template |
| --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v2-s4-151 | S4 | 幂函数、指数函数与对数函数 | multiple-choice | 已知幂函数 f(x) = x^a 的图像经过点 (4, 2)，则 f(9) 的值为（ ） | P1:explicit-function-coordinate-graph:multiple-choice |
| hjb-high-ds-v2-s4-172 | S4 | 幂函数、指数函数与对数函数 | multiple-choice | 函数 f(x) = log_a (x - 1) + 2（a > 0 且 a ≠ 1）的图像恒过定点 P，则点 P 的坐标是（ ）。 | P1:explicit-function-coordinate-graph:multiple-choice |
| hjb-high-ds-v2-s4-181 | S4 | 幂函数、指数函数与对数函数 | multiple-choice | 已知幂函数 f(x) = x^a 的图像经过点 (4, 2)，则 f(x) 的单调递增区间是（ ） | P1:explicit-function-coordinate-graph:multiple-choice |
| hjb-high-ds-v2-s4-199 | S4 | 幂函数、指数函数与对数函数 | multiple-choice | 函数 y = a^x (a > 0 且 a ≠ 1) 与 y = log_a x 的图像可能是（ ）。 | P1:explicit-function-coordinate-graph:multiple-choice |
| hjb-high-ds-v2-s4-158 | S4 | 幂函数、指数函数与对数函数 | fill-in | 若函数 f(x)=a^x（a>0 且 a≠1）与 g(x)=log_a x 的图像有且仅有一个公共点，则 a 的取值范围是 ______。 | P1:explicit-function-coordinate-graph:fill-in |

### 解析几何直线坐标图

| Question ID | Grade | Chapter | Type | Prompt | Template |
| --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v1-s5-223 | S5 | 平面直角坐标系中的直线 | multiple-choice | 变式0723：选择：直线经过点 (5,8) 和 (6,28)，求斜率。 | P1:analytic-line-coordinate-plane:multiple-choice |
| hjb-high-ds-v1-s5-226 | S5 | 平面直角坐标系中的直线 | multiple-choice | 变式0726：选择：直线经过点 (10,11) 和 (11,26)，求斜率。 | P1:analytic-line-coordinate-plane:multiple-choice |
| hjb-high-ds-v1-s5-229 | S5 | 平面直角坐标系中的直线 | multiple-choice | 变式0729：选择：直线经过点 (4,8) 和 (5,28)，求斜率。 | P1:analytic-line-coordinate-plane:multiple-choice |
| hjb-high-ds-v1-s5-232 | S5 | 平面直角坐标系中的直线 | multiple-choice | 变式0732：选择：直线经过点 (3,11) 和 (4,25)，求斜率。 | P1:analytic-line-coordinate-plane:multiple-choice |
| hjb-high-ds-v1-s5-235 | S5 | 平面直角坐标系中的直线 | multiple-choice | 变式0735：选择：直线经过点 (10,2) 和 (11,6)，求斜率。 | P1:analytic-line-coordinate-plane:multiple-choice |

### 立体几何长方体/线面关系图

| Question ID | Grade | Chapter | Type | Prompt | Template |
| --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v1-s5-001 | S5 | 空间直线与平面 | multiple-choice | 变式0501：选择：长方体中同一顶点出发的两条互相垂直棱长分别为 12 和 12，这两条棱围成的矩形面积是多少？ | P1:solid-geometry-cuboid-line-plane:multiple-choice |
| hjb-high-ds-v1-s5-004 | S5 | 空间直线与平面 | multiple-choice | 变式0504：选择：长方体中同一顶点出发的两条互相垂直棱长分别为 12 和 8，这两条棱围成的矩形面积是多少？ | P1:solid-geometry-cuboid-line-plane:multiple-choice |
| hjb-high-ds-v1-s5-007 | S5 | 空间直线与平面 | multiple-choice | 变式0507：选择：长方体中同一顶点出发的两条互相垂直棱长分别为 5 和 11，这两条棱围成的矩形面积是多少？ | P1:solid-geometry-cuboid-line-plane:multiple-choice |
| hjb-high-ds-v1-s5-010 | S5 | 空间直线与平面 | multiple-choice | 变式0510：选择：长方体中同一顶点出发的两条互相垂直棱长分别为 8 和 7，这两条棱围成的矩形面积是多少？ | P1:solid-geometry-cuboid-line-plane:multiple-choice |
| hjb-high-ds-v1-s5-013 | S5 | 空间直线与平面 | multiple-choice | 变式0513：选择：长方体中同一顶点出发的两条互相垂直棱长分别为 2 和 9，这两条棱围成的矩形面积是多少？ | P1:solid-geometry-cuboid-line-plane:multiple-choice |

### 平面/三角几何图

| Question ID | Grade | Chapter | Type | Prompt | Template |
| --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v1-s4-253 | S4 | 三角 | multiple-choice | 变式0253：选择：在三角形 ABC 中，若 AB=2，AC=4，求边 AB 与边 AC 的长度乘积。 | P1:plane-triangle-angle-diagram:multiple-choice |
| hjb-high-ds-v1-s4-256 | S4 | 三角 | multiple-choice | 变式0256：选择：在三角形 ABC 中，若 AB=12，AC=10，求边 AB 与边 AC 的长度乘积。 | P1:plane-triangle-angle-diagram:multiple-choice |
| hjb-high-ds-v1-s4-259 | S4 | 三角 | multiple-choice | 变式0259：选择：在三角形 ABC 中，若 AB=10，AC=10，求边 AB 与边 AC 的长度乘积。 | P1:plane-triangle-angle-diagram:multiple-choice |
| hjb-high-ds-v1-s4-262 | S4 | 三角 | multiple-choice | 变式0262：选择：在三角形 ABC 中，若 AB=10，AC=17，且 ∠A=60°，表达式 AB·AC 的值是多少？ | P1:plane-triangle-angle-diagram:multiple-choice |
| hjb-high-ds-v1-s4-265 | S4 | 三角 | multiple-choice | 变式0265：选择：在三角形 ABC 中，若 AB=7，AC=12，且 ∠A=60°，表达式 AB·AC 的值是多少？ | P1:plane-triangle-angle-diagram:multiple-choice |

### 圆锥曲线坐标图

| Question ID | Grade | Chapter | Type | Prompt | Template |
| --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v1-s5-292 | S5 | 圆锥曲线 | multiple-choice | 变式0792：选择：椭圆 x²/256+y²/121=1 中，求 c²=a²-b² 的值。 | P1:conic-coordinate-diagram:multiple-choice |
| hjb-high-ds-v1-s5-295 | S5 | 圆锥曲线 | multiple-choice | 变式0795：选择：椭圆 x²/676+y²/361=1 中，求 c²=a²-b² 的值。 | P1:conic-coordinate-diagram:multiple-choice |
| hjb-high-ds-v1-s5-298 | S5 | 圆锥曲线 | multiple-choice | 变式0798：选择：椭圆 x²/441+y²/100=1 中，求 c²=a²-b² 的值。 | P1:conic-coordinate-diagram:multiple-choice |
| hjb-high-ds-v1-s5-301 | S5 | 圆锥曲线 | multiple-choice | 变式0801：选择：椭圆 x²/225+y²/81=1 中，求 c²=a²-b² 的值。 | P1:conic-coordinate-diagram:multiple-choice |
| hjb-high-ds-v1-s5-304 | S5 | 圆锥曲线 | multiple-choice | 变式0804：选择：椭圆 x²/256+y²/81=1 中，求 c²=a²-b² 的值。 | P1:conic-coordinate-diagram:multiple-choice |

### 导数曲线/切线图

| Question ID | Grade | Chapter | Type | Prompt | Template |
| --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v1-s6-001 | S6 | 导数及其运用 | multiple-choice | 变式1001：选择：函数 f(x)=8x²+1，求 f'(19)。 | P2:derivative-curve-tangent:multiple-choice |
| hjb-high-ds-v1-s6-004 | S6 | 导数及其运用 | multiple-choice | 变式1004：选择：函数 f(x)=2x²+7，求 f'(7)。 | P2:derivative-curve-tangent:multiple-choice |
| hjb-high-ds-v1-s6-007 | S6 | 导数及其运用 | multiple-choice | 变式1007：选择：函数 f(x)=9x²+13，求 f'(6)。 | P2:derivative-curve-tangent:multiple-choice |
| hjb-high-ds-v1-s6-010 | S6 | 导数及其运用 | multiple-choice | 变式1010：选择：函数 f(x)=11x²+1，求 f'(10)。 | P2:derivative-curve-tangent:multiple-choice |
| hjb-high-ds-v1-s6-013 | S6 | 导数及其运用 | multiple-choice | 变式1013：选择：函数 f(x)=6x²+8，求 f'(7)。 | P2:derivative-curve-tangent:multiple-choice |

### 概率样本空间/摸球图

| Question ID | Grade | Chapter | Type | Prompt | Template |
| --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v1-s5-112 | S5 | 概率初步 | multiple-choice | 变式0612：选择：袋中有 12 个红球和 20 个蓝球，随机取出 1 个，取到红球的概率是多少？ | P2:probability-sample-space-bag:multiple-choice |
| hjb-high-ds-v1-s5-115 | S5 | 概率初步 | multiple-choice | 变式0615：选择：袋中有 7 个红球和 7 个蓝球，随机取出 1 个，取到红球的概率是多少？ | P2:probability-sample-space-bag:multiple-choice |
| hjb-high-ds-v1-s5-118 | S5 | 概率初步 | multiple-choice | 变式0618：选择：袋中有 12 个红球和 16 个蓝球，随机取出 1 个，取到红球的概率是多少？ | P2:probability-sample-space-bag:multiple-choice |
| hjb-high-ds-v1-s5-121 | S5 | 概率初步 | multiple-choice | 变式0621：选择：袋中有 6 个红球和 12 个蓝球，随机取出 1 个，取到红球的概率是多少？ | P2:probability-sample-space-bag:multiple-choice |
| hjb-high-ds-v1-s5-124 | S5 | 概率初步 | multiple-choice | 变式0624：选择：袋中有 9 个红球和 10 个蓝球，随机取出 1 个，取到红球的概率是多少？ | P2:probability-sample-space-bag:multiple-choice |

### 函数/不等式教学辅助图

| Question ID | Grade | Chapter | Type | Prompt | Template |
| --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v2-s4-058 | S4 | 等式与不等式 | multiple-choice | 已知 x > 0, y > 0，且 2x + y + 6 = xy，则 xy 的最小值为（ ）。 | P2:function-inequality-teaching-aid:multiple-choice |
| hjb-high-ds-v2-s4-061 | S4 | 等式与不等式 | multiple-choice | 已知 a, b 为正实数，且 a + b = 4。设 M = a^2 + b^2，则 M 的最小值为（ ）。 | P2:function-inequality-teaching-aid:multiple-choice |
| hjb-high-ds-v2-s4-064 | S4 | 等式与不等式 | multiple-choice | 已知正数 x, y 满足 x + 2y = 1，则 1/x + 1/y 的最小值为（ ）。 | P2:function-inequality-teaching-aid:multiple-choice |
| hjb-high-ds-v2-s4-073 | S4 | 等式与不等式 | multiple-choice | 若 a, b 为正实数，且 a + b = 1，则 (1 + 1/a)(1 + 1/b) 的最小值为（ ） | P2:function-inequality-teaching-aid:multiple-choice |
| hjb-high-ds-v2-s4-088 | S4 | 等式与不等式 | multiple-choice | 已知正实数a, b满足ab = 1，则(1/a + 1/b)(a² + b²)的最小值为？ | P2:function-inequality-teaching-aid:multiple-choice |

### 计数原理分支/槽位图

| Question ID | Grade | Chapter | Type | Prompt | Template |
| --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v1-s6-076 | S6 | 计数原理 | multiple-choice | 变式1076：选择：从 6 个不同元素中选 2 个组成一个无序组合，共有多少种选法？ | P2:counting-branches-slots:multiple-choice |
| hjb-high-ds-v1-s6-079 | S6 | 计数原理 | multiple-choice | 变式1079：选择：从 14 个不同元素中选 2 个组成一个无序组合，共有多少种选法？ | P2:counting-branches-slots:multiple-choice |
| hjb-high-ds-v1-s6-082 | S6 | 计数原理 | multiple-choice | 变式1082：选择：从 14 个不同元素中选 2 个组成一个无序组合，共有多少种选法？ | P2:counting-branches-slots:multiple-choice |
| hjb-high-ds-v1-s6-085 | S6 | 计数原理 | multiple-choice | 变式1085：选择：从 11 个不同元素中选 2 个组成一个无序组合，共有多少种选法？ | P2:counting-branches-slots:multiple-choice |
| hjb-high-ds-v1-s6-088 | S6 | 计数原理 | multiple-choice | 变式1088：选择：从 6 个不同元素中选 2 个组成一个无序组合，共有多少种选法？ | P2:counting-branches-slots:multiple-choice |

### 三角函数单位圆/波形图

| Question ID | Grade | Chapter | Type | Prompt | Template |
| --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v2-s4-265 | S4 | 三角 | multiple-choice | 已知函数 f(x)=2sin(ωx+φ)（ω>0，0<φ<π），且 f(0)=1，f(x) 在 x=π/6 处取得最大值。则 ω 和 φ 的值可能是（ ）。 | P2:trig-unit-circle-wave:multiple-choice |
| hjb-high-ds-v2-s4-263 | S4 | 三角 | fill-in | 已知角α的终边经过点P(-3, 4)，则sinα + cosα的值为______。 | P2:trig-unit-circle-wave:fill-in |
| hjb-high-ds-v2-s4-266 | S4 | 三角 | fill-in | 若tanθ=2，则(sinθ+cosθ)/(sinθ-cosθ)的值为______。 | P2:trig-unit-circle-wave:fill-in |
| hjb-high-ds-v2-s4-267 | S4 | 三角 | short-answer | 已知sinα=3/5，且α是第二象限角。求cos(α+π/3)的值。 | P2:trig-unit-circle-wave:short-answer |
| hjb-high-ds-v1-s4-316 | S4 | 三角函数 | multiple-choice | 变式0316：选择：函数 y=9sin(2x+7π/6) 的最小正周期是多少？ | P2:trig-unit-circle-wave:multiple-choice |

### 统计数据图表

| Question ID | Grade | Chapter | Type | Prompt | Template |
| --- | --- | --- | --- | --- | --- |
| hjb-high-ds-v1-s5-166 | S5 | 统计 | multiple-choice | 变式0666：选择：一组数据为 8，11，14，求这组数据的平均数。 | P2:statistics-chart-distribution:multiple-choice |
| hjb-high-ds-v1-s5-169 | S5 | 统计 | multiple-choice | 变式0669：选择：一组数据为 5，7，9，求这组数据的平均数。 | P2:statistics-chart-distribution:multiple-choice |
| hjb-high-ds-v1-s5-172 | S5 | 统计 | multiple-choice | 变式0672：选择：一组数据为 11，17，23，求这组数据的平均数。 | P2:statistics-chart-distribution:multiple-choice |
| hjb-high-ds-v1-s5-175 | S5 | 统计 | multiple-choice | 变式0675：选择：一组数据为 3，12，21，求这组数据的平均数。 | P2:statistics-chart-distribution:multiple-choice |
| hjb-high-ds-v1-s5-178 | S5 | 统计 | multiple-choice | 变式0678：选择：一组数据为 9，10，11，求这组数据的平均数。 | P2:statistics-chart-distribution:multiple-choice |

## GPT Image2 Production Notes

- Start with P1, grouped by `reusableTemplateKey`, to produce reusable base visuals before any question-specific overlays.
- Keep formulas, coordinates, labels, point names, angle values, and answers outside GPT Image2 generation whenever they are answer-critical.
- Treat P3 as a budget holdout unless the owner later requests full visual coverage for pure-symbolic questions.
