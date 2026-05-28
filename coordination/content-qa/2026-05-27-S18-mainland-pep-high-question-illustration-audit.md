# S18 Mainland PEP High Question Illustration Audit

- Date: 2026-05-27
- Generated at: 2026-05-27 20:40:52 Asia/Hong_Kong
- Session: S18 Curriculum QA and content quality
- Source: `data/mainlandPepHighQuestions.ts`
- Scope: MAINLAND_PEP_HIGH S4-S6, all-teaching-illustration candidate queue

## Executive Summary

This audit counts every Mainland PEP high-school question as a teaching-illustration candidate under the owner's all-teaching-illustration scope. It does not call GPT Image2, does not edit product question data, and does not treat existing lesson illustrations as question-level diagrams.

- Total candidate questions: 4,800
- Current question-level diagrams: 0
- Existing Mainland PEP high lesson-level illustration files: 44
- Unique reusable template keys: 66
- Production order: P1 -> P2 -> P3

## Priority Totals

| Tier | Meaning | Question Count | Unique Templates |
| --- | --- | --- | --- |
| P1 | P1 high priority | 1507 | 18 |
| P2 | P2 medium priority | 2653 | 39 |
| P3 | P3 optional teaching aid | 640 | 9 |

## Grade, Type, And Batch Checks

| Dimension | Breakdown |
| --- | --- |
| Grade | S4: 1600; S5: 1600; S6: 1600 |
| Question type | fill-in: 1590; multiple-choice: 1620; short-answer: 1590 |
| Generation batch | rag-v2: 900; rag-v3: 1500; rag-v4: 1500; seed-v1: 900 |

## Topic Counts

| Topic | Tier | Questions |
| --- | --- | --- |
| 平面向量及其应用 (pep-high-s4-plane-vectors) | P1 | 160 |
| 立体几何初步 (pep-high-s4-solid-geometry-intro) | P1 | 160 |
| 圆锥曲线的方程 (pep-high-s5-conics) | P1 | 320 |
| 直线和圆的方程 (pep-high-s5-lines-circles) | P1 | 320 |
| 空间向量与立体几何 (pep-high-s5-space-vectors) | P1 | 320 |
| 解析几何综合 (pep-high-s6-analytic-geometry-synthesis) | P1 | 227 |
| 复数 (pep-high-s4-complex-numbers) | P2 | 160 |
| 指数函数与对数函数 (pep-high-s4-exp-log) | P2 | 160 |
| 函数的概念与性质 (pep-high-s4-function-properties) | P2 | 160 |
| 概率 (pep-high-s4-probability) | P2 | 160 |
| 统计 (pep-high-s4-statistics) | P2 | 160 |
| 三角函数 (pep-high-s4-trigonometry) | P2 | 160 |
| 一元函数的导数及其应用 (pep-high-s5-derivatives) | P2 | 320 |
| 成对数据的统计分析 (pep-high-s6-bivariate-data) | P2 | 229 |
| 计数原理 (pep-high-s6-counting) | P2 | 232 |
| 导数综合 (pep-high-s6-derivative-synthesis) | P2 | 227 |
| 高考风格综合练习 (pep-high-s6-exam-practice) | P2 | 226 |
| 概率统计综合 (pep-high-s6-probability-statistics-synthesis) | P2 | 227 |
| 随机变量及其分布 (pep-high-s6-random-variables) | P2 | 232 |
| 一元二次函数、方程和不等式 (pep-high-s4-quadratic-inequalities) | P3 | 160 |
| 集合与常用逻辑用语 (pep-high-s4-sets-logic) | P3 | 160 |
| 数列 (pep-high-s5-sequences) | P3 | 320 |

## Category Counts

| Illustration Category | Questions | Unique Templates |
| --- | --- | --- |
| 二次函数抛物线/符号表 | 160 | 3 |
| 函数图像/单调区间图 | 160 | 3 |
| 单位圆与三角函数波形图 | 160 | 3 |
| 圆锥曲线坐标图 | 320 | 3 |
| 复平面点/模长图 | 160 | 3 |
| 导数曲线/切线图 | 320 | 3 |
| 导数综合曲线与参数区域图 | 227 | 3 |
| 平面向量箭头/投影图 | 160 | 3 |
| 成对数据散点/回归图 | 229 | 3 |
| 指数/对数互逆曲线图 | 160 | 3 |
| 数列阶梯/模式图 | 320 | 3 |
| 概率样本空间/摸球图 | 160 | 3 |
| 概率统计综合图 | 227 | 3 |
| 空间向量与立体几何坐标图 | 320 | 3 |
| 立体几何长方体/线面关系图 | 160 | 3 |
| 统计数据分布图 | 160 | 3 |
| 解析几何直线与圆坐标图 | 320 | 3 |
| 解析几何综合图 | 227 | 3 |
| 计数原理分支/槽位图 | 232 | 3 |
| 随机变量概率分布图 | 232 | 3 |
| 集合韦恩图 | 160 | 3 |
| 高考综合解题路线图 | 226 | 3 |

## Validation

| Check | Expected | Actual | Status |
| --- | --- | --- | --- |
| CSV queue row count | 4800 | 4800 | PASS |
| Grade totals | S4: 1600; S5: 1600; S6: 1600 | S4: 1600; S5: 1600; S6: 1600 | PASS |
| Question type totals | fill-in: 1590; multiple-choice: 1620; short-answer: 1590 | fill-in: 1590; multiple-choice: 1620; short-answer: 1590 | PASS |
| Illustration priority totals | P1: 1507; P2: 2653; P3: 640 | P1: 1507; P2: 2653; P3: 640 | PASS |
| Question-level diagram count | 0 | 0 | PASS |
| Lesson-level Mainland PEP high illustration files | 44 | 44 | PASS |

## Manual Review Sample Coverage

| Illustration Category | Sample Count | Coverage Status |
| --- | --- | --- |
| 成对数据散点/回归图 | 5 | PASS - at least 5 samples listed below |
| 单位圆与三角函数波形图 | 5 | PASS - at least 5 samples listed below |
| 导数曲线/切线图 | 5 | PASS - at least 5 samples listed below |
| 导数综合曲线与参数区域图 | 5 | PASS - at least 5 samples listed below |
| 二次函数抛物线/符号表 | 5 | PASS - at least 5 samples listed below |
| 复平面点/模长图 | 5 | PASS - at least 5 samples listed below |
| 概率统计综合图 | 5 | PASS - at least 5 samples listed below |
| 概率样本空间/摸球图 | 5 | PASS - at least 5 samples listed below |
| 高考综合解题路线图 | 5 | PASS - at least 5 samples listed below |
| 函数图像/单调区间图 | 5 | PASS - at least 5 samples listed below |
| 集合韦恩图 | 5 | PASS - at least 5 samples listed below |
| 计数原理分支/槽位图 | 5 | PASS - at least 5 samples listed below |
| 解析几何直线与圆坐标图 | 5 | PASS - at least 5 samples listed below |
| 解析几何综合图 | 5 | PASS - at least 5 samples listed below |
| 空间向量与立体几何坐标图 | 5 | PASS - at least 5 samples listed below |
| 立体几何长方体/线面关系图 | 5 | PASS - at least 5 samples listed below |
| 平面向量箭头/投影图 | 5 | PASS - at least 5 samples listed below |
| 数列阶梯/模式图 | 5 | PASS - at least 5 samples listed below |
| 随机变量概率分布图 | 5 | PASS - at least 5 samples listed below |
| 统计数据分布图 | 5 | PASS - at least 5 samples listed below |
| 圆锥曲线坐标图 | 5 | PASS - at least 5 samples listed below |
| 指数/对数互逆曲线图 | 5 | PASS - at least 5 samples listed below |

## Manual Review Samples

Each category below includes 5 sample questions for S18 manual spot-checking before GPT Image2 production. These are classification samples, not image-generation prompts.

### 成对数据散点/回归图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s6-mc-003 | S6 | multiple-choice | seed-v1 | P2 | 回归模型为 \(\hat y=4x+0\)。求 \(x=5\) 时的预测值。 |
| pep-high-s6-mc-010 | S6 | multiple-choice | seed-v1 | P2 | 回归模型为 \(\hat y=3x+3\)。求 \(x=5\) 时的预测值。 |
| pep-high-s6-mc-017 | S6 | multiple-choice | seed-v1 | P2 | 回归模型为 \(\hat y=2x-1\)。求 \(x=5\) 时的预测值。 |
| pep-high-s6-mc-024 | S6 | multiple-choice | seed-v1 | P2 | 回归模型为 \(\hat y=1x+2\)。求 \(x=5\) 时的预测值。 |
| pep-high-s6-mc-031 | S6 | multiple-choice | seed-v1 | P2 | 回归模型为 \(\hat y=5x-2\)。求 \(x=5\) 时的预测值。 |

### 单位圆与三角函数波形图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s4-mc-005 | S4 | multiple-choice | seed-v1 | P2 | 求 \(\tan45^\circ\)。 |
| pep-high-s4-mc-015 | S4 | multiple-choice | seed-v1 | P2 | 求 \(\tan45^\circ\)。 |
| pep-high-s4-mc-025 | S4 | multiple-choice | seed-v1 | P2 | 求 \(\tan45^\circ\)。 |
| pep-high-s4-mc-035 | S4 | multiple-choice | seed-v1 | P2 | 求 \(\tan45^\circ\)。 |
| pep-high-s4-mc-045 | S4 | multiple-choice | seed-v1 | P2 | 求 \(\tan45^\circ\)。 |

### 导数曲线/切线图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s5-mc-005 | S5 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=1x^2+2x+1\)，求 \(f'(2)\)。 |
| pep-high-s5-mc-010 | S5 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=3x^2+3x+1\)，求 \(f'(4)\)。 |
| pep-high-s5-mc-015 | S5 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=5x^2-3x+1\)，求 \(f'(2)\)。 |
| pep-high-s5-mc-020 | S5 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=2x^2-2x+1\)，求 \(f'(4)\)。 |
| pep-high-s5-mc-025 | S5 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=4x^2-1x+1\)，求 \(f'(2)\)。 |

### 导数综合曲线与参数区域图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s6-mc-004 | S6 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=5x^2+1x+1\)，求 \(f'(1)\)。 |
| pep-high-s6-mc-011 | S6 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=4x^2-3x+1\)，求 \(f'(1)\)。 |
| pep-high-s6-mc-018 | S6 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=3x^2+0x+1\)，求 \(f'(1)\)。 |
| pep-high-s6-mc-025 | S6 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=2x^2+3x+1\)，求 \(f'(1)\)。 |
| pep-high-s6-mc-032 | S6 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=1x^2-1x+1\)，求 \(f'(1)\)。 |

### 二次函数抛物线/符号表

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s4-mc-002 | S4 | multiple-choice | seed-v1 | P3 | \(y=(x+2)^2-1\) 的对称轴是 \(x\) 等于多少？ |
| pep-high-s4-mc-012 | S4 | multiple-choice | seed-v1 | P3 | \(y=(x+2)^2-2\) 的对称轴是 \(x\) 等于多少？ |
| pep-high-s4-mc-022 | S4 | multiple-choice | seed-v1 | P3 | \(y=(x+2)^2-3\) 的对称轴是 \(x\) 等于多少？ |
| pep-high-s4-mc-032 | S4 | multiple-choice | seed-v1 | P3 | \(y=(x+2)^2+3\) 的对称轴是 \(x\) 等于多少？ |
| pep-high-s4-mc-042 | S4 | multiple-choice | seed-v1 | P3 | \(y=(x+2)^2+2\) 的对称轴是 \(x\) 等于多少？ |

### 复平面点/模长图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s4-mc-007 | S4 | multiple-choice | seed-v1 | P2 | 求 \((-3+3i)+(5-1i)\) 的实部。 |
| pep-high-s4-mc-017 | S4 | multiple-choice | seed-v1 | P2 | 求 \((3+5i)+(4+2i)\) 的实部。 |
| pep-high-s4-mc-027 | S4 | multiple-choice | seed-v1 | P2 | 求 \((2+2i)+(3-1i)\) 的实部。 |
| pep-high-s4-mc-037 | S4 | multiple-choice | seed-v1 | P2 | 求 \((1+4i)+(2+2i)\) 的实部。 |
| pep-high-s4-mc-047 | S4 | multiple-choice | seed-v1 | P2 | 求 \((0+1i)+(5-1i)\) 的实部。 |

### 概率统计综合图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s6-mc-006 | S6 | multiple-choice | seed-v1 | P2 | 袋中有 4 个红球和 4 个蓝球，求 \(P(\text{摸到红球})\)。 |
| pep-high-s6-mc-013 | S6 | multiple-choice | seed-v1 | P2 | 袋中有 4 个红球和 3 个蓝球，求 \(P(\text{摸到红球})\)。 |
| pep-high-s6-mc-020 | S6 | multiple-choice | seed-v1 | P2 | 袋中有 4 个红球和 7 个蓝球，求 \(P(\text{摸到红球})\)。 |
| pep-high-s6-mc-027 | S6 | multiple-choice | seed-v1 | P2 | 袋中有 4 个红球和 6 个蓝球，求 \(P(\text{摸到红球})\)。 |
| pep-high-s6-mc-034 | S6 | multiple-choice | seed-v1 | P2 | 袋中有 4 个红球和 5 个蓝球，求 \(P(\text{摸到红球})\)。 |

### 概率样本空间/摸球图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s4-mc-010 | S4 | multiple-choice | seed-v1 | P2 | 袋中有 4 个红球和 3 个蓝球，求 \(P(\text{摸到红球})\)。 |
| pep-high-s4-mc-020 | S4 | multiple-choice | seed-v1 | P2 | 袋中有 3 个红球和 5 个蓝球，求 \(P(\text{摸到红球})\)。 |
| pep-high-s4-mc-030 | S4 | multiple-choice | seed-v1 | P2 | 袋中有 2 个红球和 7 个蓝球，求 \(P(\text{摸到红球})\)。 |
| pep-high-s4-mc-040 | S4 | multiple-choice | seed-v1 | P2 | 袋中有 5 个红球和 4 个蓝球，求 \(P(\text{摸到红球})\)。 |
| pep-high-s4-mc-050 | S4 | multiple-choice | seed-v1 | P2 | 袋中有 4 个红球和 6 个蓝球，求 \(P(\text{摸到红球})\)。 |

### 高考综合解题路线图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s6-mc-007 | S6 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=4x^3\)，求 \(f'(4)\)。 |
| pep-high-s6-mc-014 | S6 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=4x^3\)，求 \(f'(3)\)。 |
| pep-high-s6-mc-021 | S6 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=4x^3\)，求 \(f'(2)\)。 |
| pep-high-s6-mc-028 | S6 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=4x^3\)，求 \(f'(6)\)。 |
| pep-high-s6-mc-035 | S6 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=4x^3\)，求 \(f'(5)\)。 |

### 函数图像/单调区间图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s4-mc-003 | S4 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=5x-1\)，求 \(f(1)\)。 |
| pep-high-s4-mc-013 | S4 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=2x-1\)，求 \(f(-2)\)。 |
| pep-high-s4-mc-023 | S4 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=4x-1\)，求 \(f(1)\)。 |
| pep-high-s4-mc-033 | S4 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=6x-1\)，求 \(f(-2)\)。 |
| pep-high-s4-mc-043 | S4 | multiple-choice | seed-v1 | P2 | 已知 \(f(x)=3x-1\)，求 \(f(1)\)。 |

### 集合韦恩图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s4-mc-001 | S4 | multiple-choice | seed-v1 | P3 | 在 \(U=\{1,2,\ldots,19\}\) 中，\(A\) 是 \(3\) 的倍数组成的集合，\(B\) 是 \(4\) 的倍数组成的集合。求 \(\|A\cap B\|\)。 |
| pep-high-s4-mc-011 | S4 | multiple-choice | seed-v1 | P3 | 在 \(U=\{1,2,\ldots,21\}\) 中，\(A\) 是 \(3\) 的倍数组成的集合，\(B\) 是 \(3\) 的倍数组成的集合。求 \(\|A\cap B\|\)。 |
| pep-high-s4-mc-021 | S4 | multiple-choice | seed-v1 | P3 | 在 \(U=\{1,2,\ldots,18\}\) 中，\(A\) 是 \(3\) 的倍数组成的集合，\(B\) 是 \(6\) 的倍数组成的集合。求 \(\|A\cap B\|\)。 |
| pep-high-s4-mc-031 | S4 | multiple-choice | seed-v1 | P3 | 在 \(U=\{1,2,\ldots,20\}\) 中，\(A\) 是 \(3\) 的倍数组成的集合，\(B\) 是 \(5\) 的倍数组成的集合。求 \(\|A\cap B\|\)。 |
| pep-high-s4-mc-041 | S4 | multiple-choice | seed-v1 | P3 | 在 \(U=\{1,2,\ldots,22\}\) 中，\(A\) 是 \(3\) 的倍数组成的集合，\(B\) 是 \(4\) 的倍数组成的集合。求 \(\|A\cap B\|\)。 |

### 计数原理分支/槽位图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s6-mc-001 | S6 | multiple-choice | seed-v1 | P2 | 从 6 个不同元素中，有多少种选出 2 个的方法？ |
| pep-high-s6-mc-008 | S6 | multiple-choice | seed-v1 | P2 | 从 6 个不同元素中，有多少种选出 2 个的方法？ |
| pep-high-s6-mc-015 | S6 | multiple-choice | seed-v1 | P2 | 从 6 个不同元素中，有多少种选出 2 个的方法？ |
| pep-high-s6-mc-022 | S6 | multiple-choice | seed-v1 | P2 | 从 6 个不同元素中，有多少种选出 2 个的方法？ |
| pep-high-s6-mc-029 | S6 | multiple-choice | seed-v1 | P2 | 从 6 个不同元素中，有多少种选出 2 个的方法？ |

### 解析几何直线与圆坐标图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s5-mc-002 | S5 | multiple-choice | seed-v1 | P1 | 求过 \((2,4)\) 与 \((4,10)\) 的直线斜率。 |
| pep-high-s5-mc-007 | S5 | multiple-choice | seed-v1 | P1 | 求过 \((0,2)\) 与 \((2,12)\) 的直线斜率。 |
| pep-high-s5-mc-012 | S5 | multiple-choice | seed-v1 | P1 | 求过 \((2,6)\) 与 \((4,10)\) 的直线斜率。 |
| pep-high-s5-mc-017 | S5 | multiple-choice | seed-v1 | P1 | 求过 \((0,4)\) 与 \((2,12)\) 的直线斜率。 |
| pep-high-s5-mc-022 | S5 | multiple-choice | seed-v1 | P1 | 求过 \((2,2)\) 与 \((4,4)\) 的直线斜率。 |

### 解析几何综合图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s6-mc-005 | S6 | multiple-choice | seed-v1 | P1 | 已知椭圆 \(\frac{x^2}{16}+\frac{y^2}{16}=1\)，求长轴长。 |
| pep-high-s6-mc-012 | S6 | multiple-choice | seed-v1 | P1 | 已知椭圆 \(\frac{x^2}{64}+\frac{y^2}{16}=1\)，求长轴长。 |
| pep-high-s6-mc-019 | S6 | multiple-choice | seed-v1 | P1 | 已知椭圆 \(\frac{x^2}{49}+\frac{y^2}{16}=1\)，求长轴长。 |
| pep-high-s6-mc-026 | S6 | multiple-choice | seed-v1 | P1 | 已知椭圆 \(\frac{x^2}{36}+\frac{y^2}{16}=1\)，求长轴长。 |
| pep-high-s6-mc-033 | S6 | multiple-choice | seed-v1 | P1 | 已知椭圆 \(\frac{x^2}{25}+\frac{y^2}{16}=1\)，求长轴长。 |

### 空间向量与立体几何坐标图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s5-mc-001 | S5 | multiple-choice | seed-v1 | P1 | 已知 \(\vec a=(2,3,2)\)，\(\vec b=(4,2,3)\)，求 \(\vec a\cdot\vec b\)。 |
| pep-high-s5-mc-006 | S5 | multiple-choice | seed-v1 | P1 | 已知 \(\vec a=(4,5,3)\)，\(\vec b=(6,6,5)\)，求 \(\vec a\cdot\vec b\)。 |
| pep-high-s5-mc-011 | S5 | multiple-choice | seed-v1 | P1 | 已知 \(\vec a=(1,3,1)\)，\(\vec b=(3,4,3)\)，求 \(\vec a\cdot\vec b\)。 |
| pep-high-s5-mc-016 | S5 | multiple-choice | seed-v1 | P1 | 已知 \(\vec a=(3,5,2)\)，\(\vec b=(5,2,5)\)，求 \(\vec a\cdot\vec b\)。 |
| pep-high-s5-mc-021 | S5 | multiple-choice | seed-v1 | P1 | 已知 \(\vec a=(5,3,3)\)，\(\vec b=(7,6,3)\)，求 \(\vec a\cdot\vec b\)。 |

### 立体几何长方体/线面关系图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s4-mc-008 | S4 | multiple-choice | seed-v1 | P1 | 一个长方体的三条棱长为 \(5, 3, 6\)。求它的表面积。 |
| pep-high-s4-mc-018 | S4 | multiple-choice | seed-v1 | P1 | 一个长方体的三条棱长为 \(2, 6, 6\)。求它的表面积。 |
| pep-high-s4-mc-028 | S4 | multiple-choice | seed-v1 | P1 | 一个长方体的三条棱长为 \(4, 5, 6\)。求它的表面积。 |
| pep-high-s4-mc-038 | S4 | multiple-choice | seed-v1 | P1 | 一个长方体的三条棱长为 \(6, 4, 6\)。求它的表面积。 |
| pep-high-s4-mc-048 | S4 | multiple-choice | seed-v1 | P1 | 一个长方体的三条棱长为 \(3, 3, 6\)。求它的表面积。 |

### 平面向量箭头/投影图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s4-mc-006 | S4 | multiple-choice | seed-v1 | P1 | 已知 \(\vec a=(2,4)\)，\(\vec b=(4,1)\)，求 \(\vec a\cdot\vec b\)。 |
| pep-high-s4-mc-016 | S4 | multiple-choice | seed-v1 | P1 | 已知 \(\vec a=(4,3)\)，\(\vec b=(6,4)\)，求 \(\vec a\cdot\vec b\)。 |
| pep-high-s4-mc-026 | S4 | multiple-choice | seed-v1 | P1 | 已知 \(\vec a=(1,2)\)，\(\vec b=(3,1)\)，求 \(\vec a\cdot\vec b\)。 |
| pep-high-s4-mc-036 | S4 | multiple-choice | seed-v1 | P1 | 已知 \(\vec a=(3,5)\)，\(\vec b=(5,4)\)，求 \(\vec a\cdot\vec b\)。 |
| pep-high-s4-mc-046 | S4 | multiple-choice | seed-v1 | P1 | 已知 \(\vec a=(5,4)\)，\(\vec b=(7,1)\)，求 \(\vec a\cdot\vec b\)。 |

### 数列阶梯/模式图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s5-mc-004 | S5 | multiple-choice | seed-v1 | P3 | 等差数列满足 \(a_1=6\)，\(d=5\)。求 \(a_9\)。 |
| pep-high-s5-mc-009 | S5 | multiple-choice | seed-v1 | P3 | 等差数列满足 \(a_1=3\)，\(d=3\)。求 \(a_7\)。 |
| pep-high-s5-mc-014 | S5 | multiple-choice | seed-v1 | P3 | 等差数列满足 \(a_1=5\)，\(d=1\)。求 \(a_5\)。 |
| pep-high-s5-mc-019 | S5 | multiple-choice | seed-v1 | P3 | 等差数列满足 \(a_1=2\)，\(d=5\)。求 \(a_11\)。 |
| pep-high-s5-mc-024 | S5 | multiple-choice | seed-v1 | P3 | 等差数列满足 \(a_1=4\)，\(d=3\)。求 \(a_9\)。 |

### 随机变量概率分布图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s6-mc-002 | S6 | multiple-choice | seed-v1 | P2 | 设 \(X\sim B(8, 1/2)\)，求期望。 |
| pep-high-s6-mc-009 | S6 | multiple-choice | seed-v1 | P2 | 设 \(X\sim B(6, 1/2)\)，求期望。 |
| pep-high-s6-mc-016 | S6 | multiple-choice | seed-v1 | P2 | 设 \(X\sim B(4, 1/2)\)，求期望。 |
| pep-high-s6-mc-023 | S6 | multiple-choice | seed-v1 | P2 | 设 \(X\sim B(12, 1/2)\)，求期望。 |
| pep-high-s6-mc-030 | S6 | multiple-choice | seed-v1 | P2 | 设 \(X\sim B(10, 1/2)\)，求期望。 |

### 统计数据分布图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s4-mc-009 | S4 | multiple-choice | seed-v1 | P2 | 对于数据 \(5, 7, 9\)，求平均数。 |
| pep-high-s4-mc-019 | S4 | multiple-choice | seed-v1 | P2 | 对于数据 \(2, 4, 6\)，求平均数。 |
| pep-high-s4-mc-029 | S4 | multiple-choice | seed-v1 | P2 | 对于数据 \(5, 7, 9\)，求平均数。 |
| pep-high-s4-mc-039 | S4 | multiple-choice | seed-v1 | P2 | 对于数据 \(2, 4, 6\)，求平均数。 |
| pep-high-s4-mc-049 | S4 | multiple-choice | seed-v1 | P2 | 对于数据 \(5, 7, 9\)，求平均数。 |

### 圆锥曲线坐标图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s5-mc-003 | S5 | multiple-choice | seed-v1 | P1 | 已知椭圆 \(\frac{x^2}{49}+\frac{y^2}{4}=1\)，求长轴长。 |
| pep-high-s5-mc-008 | S5 | multiple-choice | seed-v1 | P1 | 已知椭圆 \(\frac{x^2}{16}+\frac{y^2}{9}=1\)，求长轴长。 |
| pep-high-s5-mc-013 | S5 | multiple-choice | seed-v1 | P1 | 已知椭圆 \(\frac{x^2}{36}+\frac{y^2}{16}=1\)，求长轴长。 |
| pep-high-s5-mc-018 | S5 | multiple-choice | seed-v1 | P1 | 已知椭圆 \(\frac{x^2}{64}+\frac{y^2}{4}=1\)，求长轴长。 |
| pep-high-s5-mc-023 | S5 | multiple-choice | seed-v1 | P1 | 已知椭圆 \(\frac{x^2}{25}+\frac{y^2}{9}=1\)，求长轴长。 |

### 指数/对数互逆曲线图

| Question ID | Grade | Type | Batch | Tier | Prompt |
| --- | --- | --- | --- | --- | --- |
| pep-high-s4-mc-004 | S4 | multiple-choice | seed-v1 | P2 | 求 \(\log_264\)。 |
| pep-high-s4-mc-014 | S4 | multiple-choice | seed-v1 | P2 | 求 \(\log_327\)。 |
| pep-high-s4-mc-024 | S4 | multiple-choice | seed-v1 | P2 | 求 \(\log_232\)。 |
| pep-high-s4-mc-034 | S4 | multiple-choice | seed-v1 | P2 | 求 \(\log_39\)。 |
| pep-high-s4-mc-044 | S4 | multiple-choice | seed-v1 | P2 | 求 \(\log_216\)。 |

## Notes For GPT Image2 Planning

- Use the CSV queue for budgeting and scheduling; all 4,800 rows are candidates.
- Use `generationPriority` to process P1 first, then P2, then P3.
- Use `reusableTemplateKey` to group rows into 66 topic-type visual templates before generating variants.
- Keep exact mathematical text, coordinates, labels, formulas, and answer-critical markings out of the image model when possible; add them with deterministic rendering or SVG/Canvas overlays later.
- Existing `public/lesson-illustrations/mainland-pep-high/` files are lesson-level illustrations and should not be counted as question-level diagrams.
