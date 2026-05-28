#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland HJB primary assessments.

The script records archive and member hashes, coarse classification, role,
legacy-review flags, and duplicate-variant grouping only. It never extracts or
writes document body text, source item wording, answer text, worked-solution
wording, scoring wording, table bodies, figure bodies, page images, page
locators, OCR output, source paths, or embedding payloads. Default outputs live
under `.local/`, which is ignored by the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile


DEFAULT_TARGET = "hjb-primary-p1-lower-assessments"
DEFAULT_OUT_DIR = Path(".local/rag/mainland-hjb-primary-assessments")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source archives, source paths, "
    "source member names, extracted document text, source item wording, answer "
    "text, worked-solution wording, scoring wording, table bodies, figure "
    "bodies, page images, page locators, OCR output, or embeddings."
)
BODY_SENTINEL = "MAIS_BODY_SENTINEL_SHOULD_NOT_APPEAR"

PRIMARY_GRADE_MARKERS = [
    ("P1", ["一年级", "1年级", "一年上", "一年下", "一上", "一下", "1上", "1下", "P1", "p1", "一年級"]),
    ("P2", ["二年级", "2年级", "二上", "二下", "2上", "2下", "P2", "p2", "二年級"]),
    ("P3", ["三年级", "3年级", "三上", "三下", "3上", "3下", "P3", "p3", "三年級"]),
    ("P4", ["四年级", "4年级", "四上", "四下", "4上", "4下", "P4", "p4", "四年級"]),
    ("P5", ["五年级", "5年级", "五上", "五下", "5上", "5下", "P5", "p5", "五年級"]),
    ("P6", ["六年级", "6年级", "六上", "六下", "6上", "6下", "P6", "p6", "六年級"]),
]
UPPER_SEMESTER_MARKERS = ["上册", "上冊", "上学期", "上學期", "第一学期", "第一學期", "一上", "二上", "三上", "1上", "2上", "3上", "upper"]
LOWER_SEMESTER_MARKERS = ["下册", "下冊", "下学期", "下學期", "第二学期", "第二學期", "一下", "二下", "三下", "1下", "2下", "3下", "lower"]
FAMILY_PRIORITY = ["midterm", "final", "unit-test", "topic-drill", "comprehensive", "lesson-practice"]

P1_UPPER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitTitle": "我是小学生与数学学习习惯",
        "conceptSignals": ["p1-school-readiness", "math-talk-listening", "classroom-routines", "数学学习习惯"],
        "markers": ["第一单元", "第1单元", "1单元", "我是小学生", "数学学习习惯"],
    },
    {
        "unitNumber": 2,
        "unitTitle": "认识立体图形",
        "conceptSignals": ["p1-solid-shapes", "cuboid-cube-cylinder-sphere", "shape-classification", "认识图形"],
        "markers": ["第二单元", "第2单元", "2单元", "认识图形", "认识立体图形"],
    },
    {
        "unitNumber": 3,
        "unitTitle": "10以内数的认识",
        "conceptSignals": ["within-10-numbers", "number-order", "cardinality-ordinality", "10以内数"],
        "markers": ["第三单元", "第3单元", "3单元", "10以内的数", "10以内数的认识"],
    },
    {
        "unitNumber": 4,
        "unitTitle": "10以内数的加减法",
        "conceptSignals": ["within-10-addition-subtraction", "part-whole", "join-separate-change", "10以内加减法"],
        "markers": ["第四单元", "第4单元", "4单元", "10以内数的加减法", "10以内加减法"],
    },
    {
        "unitNumber": 5,
        "unitTitle": "20以内的数",
        "conceptSignals": ["within-20-numbers", "place-value-tens-ones", "number-order-within-20", "20以内数"],
        "markers": ["第五单元", "第5单元", "5单元", "20以内的数", "20以内数的认识"],
    },
    {
        "unitNumber": 6,
        "unitTitle": "20以内数的加减法（一）",
        "conceptSignals": ["within-20-non-regrouping-add-sub", "place-value-calculation", "20以内加减法"],
        "markers": ["第六单元", "第6单元", "6单元", "20以内数的加减法（一）", "20以内加减法（一）"],
    },
]

P1_LOWER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitTitle": "20以内数的加减法（二）",
        "conceptSignals": ["within-20-regrouping-add-sub", "make-ten-strategy", "decompose-subtrahend", "20以内退位减法"],
        "markers": ["第一单元", "第1单元", "1单元", "20以内数的加减法（二）", "20以内退位", "进位加法", "退位减法"],
    },
    {
        "unitNumber": 2,
        "unitTitle": "100以内数的认识",
        "conceptSignals": ["within-100-numbers", "place-value-tens-ones", "number-order-within-100", "100以内数"],
        "markers": ["第二单元", "第2单元", "2单元", "100以内数的认识", "100以内的数的认识", "100以内数"],
    },
    {
        "unitNumber": 3,
        "unitTitle": "时间的初步认识",
        "conceptSignals": ["time-introduction", "clock-reading", "daily-routines", "时间初步认识"],
        "markers": ["第三单元", "第3单元", "3单元", "时间的初步认识", "时间初步认识", "钟面"],
    },
    {
        "unitNumber": 4,
        "unitTitle": "100以内数的加减法（一）",
        "conceptSignals": ["within-100-addition-subtraction", "two-digit-non-regrouping", "place-value-calculation", "100以内加减法"],
        "markers": ["第四单元", "第4单元", "4单元", "100以内数的加减法", "100以内加减法", "两位数加减"],
    },
    {
        "unitNumber": 5,
        "unitTitle": "长度的比较与测量",
        "conceptSignals": ["length-comparison", "measurement-units", "direct-indirect-comparison", "长度测量"],
        "markers": ["第五单元", "第5单元", "5单元", "长度的比较与测量", "长度比较", "长度测量"],
    },
]

P2_UPPER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitTitle": "100以内数的加减法（二）",
        "conceptSignals": ["within-100-addition-subtraction", "two-digit-subtraction", "vertical-calculation", "100以内加减法"],
        "markers": ["第一单元", "第1单元", "1单元", "100以内数的加减法（二）", "100以内数的加减法", "100以内加减法", "两位数加减"],
    },
    {
        "unitNumber": 2,
        "unitTitle": "欢乐购物街",
        "conceptSignals": ["money-renminbi", "shopping-arithmetic", "unit-conversion-yuan-jiao-fen", "人民币", "购物"],
        "markers": ["第二单元", "第2单元", "2单元", "欢乐购物街", "人民币", "购物", "元角分"],
    },
    {
        "unitNumber": 3,
        "unitTitle": "方向与位置",
        "conceptSignals": ["direction-position", "spatial-reference", "方向", "位置"],
        "markers": ["第三单元", "第3单元", "3单元", "方向", "位置", "东南西北"],
    },
    {
        "unitNumber": 4,
        "unitTitle": "表内乘法",
        "conceptSignals": ["multiplication-meaning", "equal-groups", "multiplication-facts", "表内乘法"],
        "markers": ["第四单元", "第4单元", "4单元", "表内乘法", "乘法", "乘法口诀"],
    },
    {
        "unitNumber": 5,
        "unitTitle": "分类与数学广场",
        "conceptSignals": ["classification", "math-square-review", "分类", "数学广场"],
        "markers": ["第五单元", "第5单元", "5单元", "分类", "数学广场", "整理复习"],
    },
]

P3_UPPER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitTitle": "三年级上册复习与数的运算",
        "conceptSignals": ["p3-upper-review", "place-value-review", "operation-relationships", "复习与提高"],
        "markers": ["第一单元", "第1单元", "1单元", "复习与提高", "数的运算", "两步计算", "四则混合"],
    },
    {
        "unitNumber": 2,
        "unitTitle": "用一位数乘",
        "conceptSignals": ["one-digit-multiplication", "multi-digit-times-one-digit", "regrouping-multiplication", "一位数乘"],
        "markers": ["第二单元", "第2单元", "2单元", "用一位数乘", "一位数乘", "乘法"],
    },
    {
        "unitNumber": 3,
        "unitTitle": "时间与年、月、日",
        "conceptSignals": ["time-measurement", "calendar-reasoning", "elapsed-time", "年、月、日", "时间"],
        "markers": ["第三单元", "第3单元", "3单元", "时间", "年、月、日", "年月日", "日历"],
    },
    {
        "unitNumber": 4,
        "unitTitle": "用一位数除",
        "conceptSignals": ["one-digit-division", "division-with-remainder", "division-checking", "一位数除"],
        "markers": ["第四单元", "第4单元", "4单元", "用一位数除", "一位数除", "除法"],
    },
    {
        "unitNumber": 5,
        "unitTitle": "长方形、正方形与周长",
        "conceptSignals": ["rectangle-square-features", "perimeter", "geometry-measurement", "周长"],
        "markers": ["第五单元", "第5单元", "5单元", "长方形", "正方形", "周长"],
    },
    {
        "unitNumber": 6,
        "unitTitle": "分数初步认识",
        "conceptSignals": ["fraction-introduction", "equal-parts", "unit-fraction", "几分之一", "几分之几"],
        "markers": ["第六单元", "第6单元", "6单元", "几分之一", "几分之几", "分数"],
    },
]

P3_LOWER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitTitle": "三年级下册复习与乘除运算",
        "conceptSignals": ["p3-lower-review", "multiplication-division-review", "estimation-check", "复习与提高"],
        "markers": ["第一单元", "第1单元", "1单元", "复习与提高", "乘除复习", "乘除运算", "计算", "口算"],
    },
    {
        "unitNumber": 2,
        "unitTitle": "两位数乘除与问题解决",
        "conceptSignals": ["two-digit-multiplication", "division-extension", "multi-step-problem-solving", "两位数乘除"],
        "markers": ["第二单元", "第2单元", "2单元", "两位数乘", "两位数除", "两位数乘除", "两位数与两位数", "问题解决", "解应用题"],
    },
    {
        "unitNumber": 3,
        "unitTitle": "小数的初步认识",
        "conceptSignals": ["decimal-introduction", "tenths-hundredths", "decimal-reading-writing", "小数"],
        "markers": ["第三单元", "第3单元", "3单元", "小数", "小数的初步认识", "小数初步认识"],
    },
    {
        "unitNumber": 4,
        "unitTitle": "面积与周长",
        "conceptSignals": ["area-measurement", "unit-square", "rectangle-square-area", "perimeter-area-contrast", "面积"],
        "markers": ["第四单元", "第4单元", "4单元", "面积", "周长", "平方米", "平方厘米", "长方形面积", "正方形面积"],
    },
    {
        "unitNumber": 5,
        "unitTitle": "数据整理与统计表达",
        "conceptSignals": ["data-organization", "table-reading", "bar-chart-reading", "统计"],
        "markers": ["第五单元", "第5单元", "5单元", "统计", "数据", "条形统计图", "统计表"],
    },
    {
        "unitNumber": 6,
        "unitTitle": "三年级下册数学广场与整理复习",
        "conceptSignals": ["p3-lower-review", "math-square-exploration", "decimal-area-data-review", "数学广场", "整理复习"],
        "markers": ["第六单元", "第6单元", "6单元", "数学广场", "整理复习", "综合复习"],
    },
]

P4_UPPER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitTitle": "复习与提高",
        "conceptSignals": ["p4-upper-review", "operation-relationships", "fraction-review", "两位数乘除", "复习与提高"],
        "markers": ["第一单元", "第1单元", "1单元", "复习与提高", "加减关系", "乘除关系", "两位数乘除", "分数复习"],
    },
    {
        "unitNumber": 2,
        "unitTitle": "数与量",
        "conceptSignals": ["large-numbers", "rounding", "area-units", "mass-capacity-units", "大数", "四舍五入"],
        "markers": ["第二单元", "第2单元", "2单元", "数与量", "大数", "数位", "四舍五入", "平方千米", "吨", "毫升", "升"],
    },
    {
        "unitNumber": 3,
        "unitTitle": "分数的初步认识（二）",
        "conceptSignals": ["fraction-comparison", "fraction-addition-subtraction", "same-denominator-fractions", "分数大小比较"],
        "markers": ["第三单元", "第3单元", "3单元", "分数的初步认识（二）", "分数的初步认识", "分数大小", "同分母", "分数加减"],
    },
    {
        "unitNumber": 4,
        "unitTitle": "整数的四则运算",
        "conceptSignals": ["integer-four-operations", "multi-step-word-problems", "operation-laws", "整数四则运算"],
        "markers": ["第四单元", "第4单元", "4单元", "整数的四则运算", "四则运算", "三步计算", "运算定律", "解决问题"],
    },
    {
        "unitNumber": 5,
        "unitTitle": "几何小实践",
        "conceptSignals": ["circle-introduction", "line-ray-segment", "angle-measurement", "圆", "角"],
        "markers": ["第五单元", "第5单元", "5单元", "几何小实践", "圆", "线段", "射线", "直线", "角", "角的度量"],
    },
    {
        "unitNumber": 6,
        "unitTitle": "四年级上册整理与提高",
        "conceptSignals": ["p4-upper-integration", "large-number-review", "fraction-review", "operation-geometry-review", "整理与提高"],
        "markers": ["第六单元", "第6单元", "6单元", "整理与提高", "整理复习", "综合复习", "上册复习", "全册复习"],
    },
]

P4_LOWER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitTitle": "四年级下册复习与整数运算性质",
        "conceptSignals": ["p4-lower-review", "integer-four-operations", "operation-properties", "四则运算"],
        "markers": ["第一单元", "第1单元", "1单元", "复习与提高", "四则运算", "运算性质", "阶段复习"],
    },
    {
        "unitNumber": 2,
        "unitTitle": "小数的认识与加减法",
        "conceptSignals": ["decimal-meaning", "decimal-place-value", "decimal-comparison", "decimal-addition-subtraction", "小数"],
        "markers": ["第二单元", "第2单元", "2单元", "小数", "小数的认识", "小数加减", "第一、二单元"],
    },
    {
        "unitNumber": 3,
        "unitTitle": "统计与折线统计图",
        "conceptSignals": ["line-graphs", "data-trends", "statistical-display", "折线统计图", "统计"],
        "markers": ["第三单元", "第3单元", "3单元", "统计", "折线统计图", "第三四单元"],
    },
    {
        "unitNumber": 4,
        "unitTitle": "几何小实践：垂直与平行",
        "conceptSignals": ["perpendicular-lines", "parallel-lines", "geometric-construction", "垂直", "平行", "几何小实践"],
        "markers": ["第四单元", "第4单元", "4单元", "几何小实践", "垂直", "平行", "第三四单元"],
    },
    {
        "unitNumber": 5,
        "unitTitle": "四年级下册整理与提高",
        "conceptSignals": ["p4-lower-integration", "decimal-review", "statistics-review", "geometry-review", "整理与提高"],
        "markers": ["第五单元", "第5单元", "5单元", "整理与提高", "综合复习", "复习测试", "复习测试卷", "应用题题库"],
    },
]

P5_UPPER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitTitle": "小数乘除法与估算",
        "conceptSignals": ["decimal-multiplication", "decimal-division", "decimal-estimation", "place-value-decimals", "小数乘除法"],
        "markers": ["第一单元", "第1单元", "1单元", "第二单元", "第2单元", "2单元", "小数乘法", "小数除法", "除数是整数的小数除法", "循环小数", "积、商的近似值", "积商近似值", "小数乘除法"],
    },
    {
        "unitNumber": 2,
        "unitTitle": "用字母表示数与简易方程",
        "conceptSignals": ["simple-equations", "letters-as-variables", "quantitative-relationships", "equation-modeling", "简易方程"],
        "markers": ["第三单元", "第3单元", "3单元", "简易方程", "方程", "用字母表示数", "等量关系"],
    },
    {
        "unitNumber": 3,
        "unitTitle": "平面图形面积",
        "conceptSignals": ["polygon-area", "parallelogram-area", "triangle-area", "trapezoid-area", "面积"],
        "markers": ["第四单元", "第4单元", "4单元", "平面图形面积", "多边形面积", "平行四边形", "三角形", "梯形", "组合图形", "图形面积"],
    },
    {
        "unitNumber": 4,
        "unitTitle": "数据整理与平均数",
        "conceptSignals": ["data-organization", "average", "statistical-displays", "data-interpretation", "平均数"],
        "markers": ["第五单元", "第5单元", "5单元", "数据", "统计", "平均数", "统计表", "统计图"],
    },
    {
        "unitNumber": 5,
        "unitTitle": "五年级上册整理与提高",
        "conceptSignals": ["p5-upper-final-review", "decimal-operations-review", "equation-review", "area-review", "statistics-review", "整理与提高"],
        "markers": ["第六单元", "第6单元", "6单元", "整理与提高", "综合复习", "复习提高", "期末", "全册复习", "综合模拟", "末测试卷"],
    },
]

P6_LOWER_UNIT_SLOTS = [
    {
        "unitNumber": 5,
        "unitTitle": "比与比例",
        "conceptSignals": ["ratio", "proportion", "proportional-reasoning", "scale", "比与比例", "比", "比例"],
        "markers": ["第五章", "第5章", "5章", "比与比例", "比和比例", "比例"],
    },
    {
        "unitNumber": 6,
        "unitTitle": "圆与扇形",
        "conceptSignals": ["circle-sector", "circle", "sector", "circumference-area", "圆与扇形", "扇形"],
        "markers": ["第六章", "第6章", "6章", "圆与扇形", "圆和扇形", "扇形"],
    },
    {
        "unitNumber": 7,
        "unitTitle": "可能性与统计图表",
        "conceptSignals": ["probability", "data-display", "statistical-tables-graphs", "可能性", "统计图表"],
        "markers": ["第七章", "第7章", "7章", "可能性", "统计图表", "统计图"],
    },
    {
        "unitNumber": 8,
        "unitTitle": "圆柱与圆锥",
        "conceptSignals": ["cylinder-cone", "surface-area", "volume", "solid-geometry", "圆柱", "圆锥"],
        "markers": ["第八章", "第8章", "8章", "圆柱与圆锥", "圆柱", "圆锥"],
    },
    {
        "unitNumber": 9,
        "unitTitle": "二元一次方程组",
        "conceptSignals": ["linear-systems", "two-variable-linear-equations", "equation-modeling", "二元一次方程组", "方程组"],
        "markers": ["第九章", "第9章", "9章", "二元一次方程组", "二元一次", "方程组"],
    },
]

P6_SIX_UP_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitTitle": "有理数",
        "conceptSignals": ["rational-numbers", "negative-numbers", "number-line", "absolute-value", "有理数", "数轴"],
        "markers": ["第一章", "第1章", "1章", "第一单元", "第1单元", "1单元", "有理数", "正数", "负数", "数轴", "绝对值", "相反数"],
    },
    {
        "unitNumber": 2,
        "unitTitle": "简单的代数式",
        "conceptSignals": ["algebraic-expressions", "symbolic-representation", "substitution-evaluation", "like-terms-introduction", "简单的代数式", "代数式"],
        "markers": ["第二章", "第2章", "2章", "第二单元", "第2单元", "2单元", "简单的代数式", "代数式", "用字母表示数", "同类项", "合并同类项"],
    },
    {
        "unitNumber": 3,
        "unitTitle": "一元一次方程",
        "conceptSignals": ["linear-equations", "equation-modeling", "equation-solving", "solution-checking", "一元一次方程", "一次方程"],
        "markers": ["第三章", "第3章", "3章", "第三单元", "第3单元", "3单元", "一元一次方程", "一次方程", "等式性质", "列方程"],
    },
    {
        "unitNumber": 4,
        "unitTitle": "线段与角",
        "conceptSignals": ["segments", "angles", "angle-measurement", "geometric-language", "线段", "角", "射线", "直线"],
        "markers": ["第四章", "第4章", "4章", "第四单元", "第4单元", "4单元", "线段与角", "线段", "角", "直线", "射线", "角的度量"],
    },
    {
        "unitNumber": 5,
        "unitTitle": "长方体",
        "conceptSignals": ["cuboid", "surface-area", "volume", "solid-geometry", "长方体", "体积"],
        "markers": ["第五章", "第5章", "5章", "第五单元", "第5单元", "5单元", "长方体", "表面积", "体积"],
    },
]

TARGET_CONFIGS = {
    "hjb-primary-p1-upper-assessments": {
        "label": "Mainland HJB Primary P1 Upper Assessment Manifest QA",
        "outDir": DEFAULT_OUT_DIR,
        "expectedSlots": ["P1:upper"],
        "unitSlots": P1_UPPER_UNIT_SLOTS,
        "midtermUnitCount": 4,
        "midtermConceptSignals": ["p1-upper-midterm-review", "期中", "1-4单元"],
        "finalConceptSignals": ["p1-upper-final-review", "期末", "综合"],
    },
    "hjb-primary-p1-lower-assessments": {
        "label": "Mainland HJB Primary P1 Lower Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-hjb-primary-p1-lower-assessments"),
        "expectedSlots": ["P1:lower"],
        "unitSlots": P1_LOWER_UNIT_SLOTS,
        "midtermUnitCount": 4,
        "midtermConceptSignals": ["p1-lower-midterm-1-to-4-review", "期中", "1-4单元"],
        "finalConceptSignals": ["p1-lower-final-review", "期末", "综合"],
    },
    "hjb-primary-p2-upper-assessments": {
        "label": "Mainland HJB Primary P2 Upper Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-hjb-primary-p2-upper-assessments"),
        "expectedSlots": ["P2:upper"],
        "unitSlots": P2_UPPER_UNIT_SLOTS,
        "midtermUnitCount": 3,
        "midtermConceptSignals": ["p2-upper-midterm-review", "期中", "1-3单元"],
        "finalConceptSignals": ["p2-upper-final-review", "期末", "综合"],
    },
    "hjb-primary-p3-lower-assessments": {
        "label": "Mainland HJB Primary P3 Lower Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-hjb-primary-p3-lower-assessments"),
        "expectedSlots": ["P3:lower"],
        "unitSlots": P3_LOWER_UNIT_SLOTS,
        "midtermUnitCount": 3,
        "midtermConceptSignals": ["p3-lower-midterm-review", "期中", "1-3单元"],
        "finalConceptSignals": ["p3-lower-final-review", "期末", "综合"],
    },
    "hjb-primary-p4-lower-assessments": {
        "label": "Mainland HJB Primary P4 Lower Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-hjb-primary-p4-lower-assessments"),
        "expectedSlots": ["P4:lower"],
        "unitSlots": P4_LOWER_UNIT_SLOTS,
        "midtermUnitCount": 3,
        "midtermConceptSignals": ["p4-lower-midterm-review", "期中", "1-3单元"],
        "finalConceptSignals": ["p4-lower-final-review", "期末", "综合"],
    },
    "hjb-primary-p3-upper-assessments": {
        "label": "Mainland HJB Primary P3 Upper Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-hjb-primary-p3-upper-assessments"),
        "expectedSlots": ["P3:upper"],
        "unitSlots": P3_UPPER_UNIT_SLOTS,
        "midtermUnitCount": 4,
        "midtermConceptSignals": ["p3-upper-midterm-review", "期中", "1-4单元"],
        "finalConceptSignals": ["p3-upper-final-review", "期末", "综合"],
    },
    "hjb-primary-p4-upper-assessments": {
        "label": "Mainland HJB Primary P4 Upper Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-hjb-primary-p4-upper-assessments"),
        "expectedSlots": ["P4:upper"],
        "unitSlots": P4_UPPER_UNIT_SLOTS,
        "midtermUnitCount": 3,
        "midtermConceptSignals": ["p4-upper-midterm-review", "期中", "1-3单元"],
        "finalConceptSignals": ["p4-upper-final-review", "期末", "综合"],
    },
    "hjb-primary-p5-upper-assessments": {
        "label": "Mainland HJB Primary P5 Upper Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-hjb-primary-p5-upper-assessments"),
        "expectedSlots": ["P5:upper"],
        "unitSlots": P5_UPPER_UNIT_SLOTS,
        "midtermUnitCount": 3,
        "midtermConceptSignals": ["p5-upper-midterm-review", "decimal-multiplication", "decimal-division", "simple-equations", "polygon-area", "期中", "1-3单元"],
        "finalConceptSignals": ["p5-upper-final-review", "decimal-operations-review", "equation-review", "area-review", "statistics-review", "期末", "全册复习"],
    },
    "hjb-primary-p6-lower-assessments": {
        "label": "Mainland HJB Primary P6 Six-Up Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-hjb-primary-p6-six-up-assessments"),
        "expectedSlots": ["P6:lower"],
        "unitSlots": P6_SIX_UP_UNIT_SLOTS,
        "midtermUnitCount": 2,
        "midtermConceptSignals": ["p6-six-up-midterm-review", "rational-numbers", "algebraic-expressions", "期中", "1-2章"],
        "finalConceptSignals": ["p6-six-up-final-review", "rational-numbers", "algebraic-expressions", "linear-equations", "segments", "angles", "cuboid", "期末", "综合"],
        "semesterOverride": "lower",
        "sourceScopeNote": "Owner-provided private 沪教版六年级上册 assessment archives mapped to the existing MAIS P6 lower compatibility taxonomy for safe aggregated RAG only.",
    },
    "hjb-primary-p6-lower-2024-assessments": {
        "label": "Mainland HJB Primary P6 Lower 2024 Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-hjb-primary-p6-lower-assessments"),
        "expectedSlots": ["P6:lower"],
        "unitSlots": P6_LOWER_UNIT_SLOTS,
        "midtermUnitCount": 3,
        "midtermConceptSignals": ["p6-lower-midterm-review", "期中", "5-7章"],
        "finalConceptSignals": ["p6-lower-final-review", "期末", "全册综合"],
    },
}


def sha256_for_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_for_member(archive: ZipFile, member_name: str) -> str:
    digest = hashlib.sha256()
    with archive.open(member_name) as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def decode_zip_name(name: str) -> tuple[str, str]:
    candidates: list[tuple[str, str]] = [(name, "original")]
    try:
        raw = name.encode("cp437")
        for encoding in ("gb18030", "gbk", "utf-8", "big5"):
            try:
                candidates.append((raw.decode(encoding), f"cp437-to-{encoding}"))
            except UnicodeError:
                continue
    except UnicodeEncodeError:
        pass

    for candidate, label in list(candidates):
        if any(marker in candidate for marker in ["銆", "骞", "绾", "涓", "瀛", "鏈", "锛", "勃"]):
            try:
                candidates.append((candidate.encode("gb18030").decode("utf-8"), f"{label}-mojibake-repair"))
            except UnicodeError:
                continue

    def score(value: str) -> int:
        markers = ["沪", "教", "年级", "下册", "单元", "期中", "期末", "数学", "测试", "练习", "卷", "新教材"]
        return sum(value.count(marker) * 10 for marker in markers) + sum(1 for char in value if "\u4e00" <= char <= "\u9fff")

    decoded, status = max(candidates, key=lambda candidate: score(candidate[0]))
    return decoded, status


def should_skip_entry(decoded_name: str) -> bool:
    parts = decoded_name.split("/")
    basename = parts[-1] if parts else decoded_name
    return decoded_name.endswith("/") or "__MACOSX" in parts or basename == ".DS_Store" or basename.startswith("._")


def infer_grade(text: str) -> str:
    for grade, markers in PRIMARY_GRADE_MARKERS:
        if any(marker in text for marker in markers):
            return grade
    return "unknown"


def infer_semester(text: str) -> str:
    if any(marker in text for marker in UPPER_SEMESTER_MARKERS):
        return "upper"
    if any(marker in text for marker in LOWER_SEMESTER_MARKERS):
        return "lower"
    return "unknown"


def archive_scope_for_path(path: Path) -> dict[str, str]:
    resolved = path.expanduser().resolve()
    searchable = f"{resolved.parent.name}/{resolved.name}"
    return {
        "grade": infer_grade(searchable),
        "semester": infer_semester(searchable),
    }


def unique_ordered(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def compact(value: str) -> str:
    return re.sub(r"[\s\-_/，、。,.()[\]（）:：;；·+]+", "", value.lower())


def target_config_for(target_id: str) -> dict[str, object]:
    if target_id not in TARGET_CONFIGS:
        valid_targets = ", ".join(sorted(TARGET_CONFIGS))
        raise ValueError(f"Unsupported target {target_id}. Valid targets: {valid_targets}")
    return TARGET_CONFIGS[target_id]


def target_id_for_expected_slots(expected_slots: list[str] | None) -> str:
    if expected_slots:
        for target_id, config in TARGET_CONFIGS.items():
            if list(config["expectedSlots"]) == expected_slots:  # type: ignore[index]
                return target_id
    return DEFAULT_TARGET


def entry_extension(decoded_name: str) -> str:
    basename = decoded_name.rstrip("/").rsplit("/", 1)[-1]
    if basename.lower().endswith(".docx.wps"):
        return ".docx.wps"
    return Path(basename).suffix.lower()


def classification_text(decoded_name: str) -> str:
    parts = [part for part in decoded_name.split("/") if part]
    if len(parts) > 1 and "期中" in parts[0] and "期末" in parts[0]:
        return "/".join(parts[1:])
    return decoded_name


def unit_range_end(name: str) -> int | None:
    normalized = compact(name)
    range_match = re.search(r"1(?:-|至|到)([0-9一二三四五六七八九])(?:单元|章)", normalized)
    if not range_match:
        return None
    value = range_match.group(1)
    chinese_digits = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
    return int(value) if value.isdigit() else chinese_digits.get(value)


def unit_titles_for(name: str, target_config: dict[str, object]) -> list[str]:
    unit_slots = target_config["unitSlots"]  # type: ignore[index]
    normalized = compact(name)
    titles: list[str] = []
    for slot in unit_slots:
        if any(compact(marker) in normalized for marker in slot["markers"]):  # type: ignore[index]
            titles.append(str(slot["unitTitle"]))

    if "期中" in name and not titles:
        titles.extend(str(slot["unitTitle"]) for slot in unit_slots[: int(target_config["midtermUnitCount"])])  # type: ignore[index]
    if any(marker in name for marker in ["期末", "综合", "复习"]) and not titles:
        titles.extend(str(slot["unitTitle"]) for slot in unit_slots)

    range_end = unit_range_end(name)
    if range_end:
        titles.extend(str(slot["unitTitle"]) for slot in unit_slots[:range_end])
    return unique_ordered(titles)


def concept_signals_for(unit_titles: list[str], name: str, target_config: dict[str, object]) -> list[str]:
    unit_slots = target_config["unitSlots"]  # type: ignore[index]
    signals: list[str] = []
    for title in unit_titles:
        for slot in unit_slots:
            if title == slot["unitTitle"]:
                signals.extend(str(signal) for signal in slot["conceptSignals"])  # type: ignore[index]
    if "期中" in name:
        signals.extend(str(signal) for signal in target_config["midtermConceptSignals"])  # type: ignore[index]
    if "期末" in name:
        signals.extend(str(signal) for signal in target_config["finalConceptSignals"])  # type: ignore[index]
    return unique_ordered(signals)


def assessment_family_signals(name: str) -> list[str]:
    signals: list[str] = []
    if any(marker in name for marker in ["同步", "课时"]):
        signals.append("lesson-practice")
    if "单元" in name:
        signals.append("unit-test")
    if "期中" in name:
        signals.append("midterm")
    if "期末" in name:
        signals.append("final")
    if any(marker in name for marker in ["易错", "专项", "专题", "口算", "练习", "高频", "基础", "提高", "提升", "能力", "素养", "培优", "挑战", "冲刺", "必刷"]):
        signals.append("topic-drill")
    if any(marker in name for marker in ["综合", "复习", "检测", "考查", "测试", "测评", "自测", "月考", "模拟"]):
        signals.append("comprehensive")
    return [family for family in FAMILY_PRIORITY if family in signals]


def primary_assessment_family(name: str) -> str:
    signals = assessment_family_signals(name)
    return signals[0] if signals else "unknown"


def material_kinds_for(name: str, families: list[str]) -> list[str]:
    kinds: list[str] = []
    if "unit-test" in families:
        kinds.append("unit-test")
    if "midterm" in families or "final" in families:
        kinds.append("midterm-final")
    if "lesson-practice" in families:
        kinds.append("sync-practice")
    if "topic-drill" in families:
        kinds.append("topic-practice")
    if any(marker in name for marker in ["口算", "计算"]):
        kinds.append("calculation-practice")
    if any(marker in name for marker in ["易错", "提高", "提升", "能力", "素养"]):
        kinds.append("error-extension")
    if "comprehensive" in families:
        kinds.append("comprehensive-assessment")
    if any(marker in name for marker in ["解决问题", "应用", "综合"]):
        kinds.append("problem-solving")
    return unique_ordered(kinds)


def document_role(name: str) -> str:
    if any(marker in name for marker in ["答案", "解析", "详解", "教师", "参考"]):
        return "answer-or-solution"
    if any(marker in name for marker in ["考试版", "试题版", "学生版", "试卷", "测试", "练习", "检测", "考查", "自测", "测评"]):
        return "student-assessment"
    return "document"


def variant_role(name: str) -> str:
    if any(marker in name for marker in ["答案", "解析", "详解", "教师", "参考"]):
        return "response-support"
    if any(marker in name for marker in ["A3", "A4", "版式"]):
        return "alternate-layout"
    if any(marker in name for marker in ["考试版", "试题版", "学生版"]):
        return "student-form"
    return "base-or-other"


def difficulty_band(name: str, family: str) -> str:
    if any(marker in name for marker in ["提高", "提升", "培优", "拓展", "易错", "能力", "挑战", "尖子生", "满分", "冲刺"]):
        return "challenge"
    if any(marker in name for marker in ["基础", "同步"]):
        return "foundation"
    if family in {"midterm", "final", "comprehensive"}:
        return "exam"
    return "core"


def legacy_reference_only(name: str) -> bool:
    return any(marker in name for marker in ["老课标", "可先参考", "五年制", "旧版", "旧教材"])


def high_risk_reference_only(name: str) -> bool:
    return any(marker in name for marker in ["历年", "精编", "压轴", "专题", "尖子生", "满分", "冲刺"])


def new_textbook_signal(name: str) -> bool:
    return any(marker in name for marker in ["新教材", "2026版", "2026", "2024版", "2024"])


def logical_group_key(decoded_name: str) -> str:
    basename = decoded_name.rstrip("/").rsplit("/", 1)[-1]
    stem = re.sub(r"\.[^.]+$", "", basename)
    stem = re.sub(r"[（(][^）)]*(?:A3|A4|答案|解析|详解|教师|参考|考试版|试题版|学生版)[^）)]*[）)]", "", stem)
    stem = re.sub(r"A[34]版?|考试版|试题版|学生版|参考解析|参考答案|答案|教师版|解析版|详解版", "", stem)
    return compact(stem) or hashlib.sha1(decoded_name.encode("utf-8")).hexdigest()[:16]


def classify_entry(decoded_name: str, decoded_name_status: str, archive_scope: dict[str, str], target_config: dict[str, object]) -> dict[str, object]:
    signal_text = classification_text(decoded_name)
    grade_from_entry = infer_grade(signal_text)
    semester_from_entry = infer_semester(signal_text)
    inferred_grade = grade_from_entry if grade_from_entry != "unknown" else archive_scope["grade"]
    inferred_semester = semester_from_entry if semester_from_entry != "unknown" else archive_scope["semester"]
    grade_override = str(target_config.get("gradeOverride") or "")
    semester_override = str(target_config.get("semesterOverride") or "")
    grade = grade_override or inferred_grade
    semester = semester_override or inferred_semester
    unit_titles = unit_titles_for(signal_text, target_config)
    family_signals = assessment_family_signals(signal_text)
    family = primary_assessment_family(signal_text)
    legacy = legacy_reference_only(signal_text)
    high_risk_reference = high_risk_reference_only(signal_text)
    reference_only = legacy or high_risk_reference
    extension = entry_extension(decoded_name)
    role = document_role(signal_text)
    if legacy:
        local_only_quarantine_reason = "legacy-reference-only"
    elif high_risk_reference:
        local_only_quarantine_reason = "high-risk-reference-only"
    elif extension == ".docx.wps":
        local_only_quarantine_reason = "wps-wrapper-format"
    elif role == "answer-or-solution":
        local_only_quarantine_reason = "answer-or-solution-support"
    else:
        local_only_quarantine_reason = "none"
    local_only_quarantine = local_only_quarantine_reason != "none"
    needs_review = (
        reference_only
        or role == "answer-or-solution"
        or extension == ".doc"
        or extension == ".docx.wps"
        or grade == "unknown"
        or semester == "unknown"
        or not unit_titles
        or (family == "final" and not new_textbook_signal(signal_text))
    )
    return {
        "grade": grade,
        "semester": semester,
        "archiveGradeFallbackUsed": grade_from_entry == "unknown" and archive_scope["grade"] != "unknown",
        "archiveSemesterFallbackUsed": semester_from_entry == "unknown" and archive_scope["semester"] != "unknown",
        "inferredGradeBeforeTargetOverride": inferred_grade,
        "inferredSemesterBeforeTargetOverride": inferred_semester,
        "targetGradeOverrideUsed": bool(grade_override),
        "targetSemesterOverrideUsed": bool(semester_override),
        "extension": extension,
        "decodedNameStatus": decoded_name_status,
        "assessmentFamily": family,
        "assessmentFamilySignals": family_signals,
        "materialKinds": material_kinds_for(signal_text, family_signals),
        "unitTitles": unit_titles,
        "conceptSignals": concept_signals_for(unit_titles, signal_text, target_config),
        "difficultyBand": difficulty_band(signal_text, family),
        "documentRole": role,
        "variantRole": variant_role(signal_text),
        "legacyReferenceOnly": reference_only,
        "localOnlyQuarantine": local_only_quarantine,
        "localOnlyQuarantineReason": local_only_quarantine_reason,
        "currentEditionSignal": new_textbook_signal(signal_text),
        "needsS18Review": needs_review,
        "logicalGroupId": hashlib.sha1(logical_group_key(decoded_name).encode("utf-8")).hexdigest()[:12],
    }


def archive_record(path: Path, index: int) -> dict[str, object]:
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Archive not found: {resolved}")
    if resolved.suffix.lower() != ".zip":
        raise ValueError(f"Expected a ZIP archive: {resolved}")
    digest = sha256_for_path(resolved)
    scope = archive_scope_for_path(resolved)
    return {
        "archiveIndex": index,
        "archiveId": f"hjb-primary-assessment-archive-{digest[:12]}",
        "archiveSha256": digest,
        "sizeBytes": resolved.stat().st_size,
        "scopeGrade": scope["grade"],
        "scopeSemester": scope["semester"],
    }


def manifest_entries_for_archive(zip_path: Path, archive_meta: dict[str, object], target_config: dict[str, object]) -> list[dict[str, object]]:
    resolved = zip_path.expanduser().resolve()
    archive_scope = {"grade": str(archive_meta["scopeGrade"]), "semester": str(archive_meta["scopeSemester"])}
    entries: list[dict[str, object]] = []

    with ZipFile(resolved) as archive:
        for entry_index, info in enumerate(archive.infolist(), start=1):
            decoded_name, decoded_name_status = decode_zip_name(info.filename)
            if should_skip_entry(decoded_name):
                continue
            extension = entry_extension(decoded_name)
            if extension not in {".doc", ".docx", ".docx.wps", ".pdf"}:
                continue
            file_hash = sha256_for_member(archive, info.filename)
            classification = classify_entry(decoded_name, decoded_name_status, archive_scope, target_config)
            entries.append({
                "id": f"hjb-primary-assessment-{classification['grade'].lower()}-{classification['semester']}-{file_hash[:12]}",
                "archiveId": archive_meta["archiveId"],
                "entryIndex": entry_index,
                "memberSha256": file_hash,
                "sizeBytes": info.file_size,
                "compressedBytes": info.compress_size,
                "retentionPolicy": "metadata-only-local",
                "safetyNote": SAFETY_NOTE,
                **classification,
            })
    return entries


def count_by(entries: list[dict[str, object]], field: str) -> dict[str, int]:
    return dict(sorted(Counter(str(entry.get(field) or "unknown") for entry in entries).items()))


def count_boolean(entries: list[dict[str, object]], field: str) -> dict[str, int]:
    return {
        "false": sum(1 for entry in entries if not entry.get(field)),
        "true": sum(1 for entry in entries if bool(entry.get(field))),
    }


def count_list_values(entries: list[dict[str, object]], field: str) -> dict[str, int]:
    counter: Counter[str] = Counter()
    for entry in entries:
        for value in entry.get(field, []):
            counter[str(value)] += 1
    return dict(sorted(counter.items()))


def duplicate_groups(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    groups: dict[str, list[dict[str, object]]] = defaultdict(list)
    for entry in entries:
        groups[str(entry["logicalGroupId"])].append(entry)

    summaries = []
    for group_id, group_entries in sorted(groups.items()):
        if len(group_entries) <= 1:
            continue
        summaries.append({
            "logicalGroupId": group_id,
            "count": len(group_entries),
            "documentRoles": count_by(group_entries, "documentRole"),
            "variantRoles": count_by(group_entries, "variantRole"),
            "extensions": count_by(group_entries, "extension"),
            "assessmentFamilies": count_by(group_entries, "assessmentFamily"),
        })
    return summaries


def parse_expected_slot(slot: str) -> str:
    normalized = slot.strip()
    if ":" not in normalized:
        raise ValueError(f"Expected slot must look like P1:lower: {slot}")
    grade, semester = normalized.split(":", 1)
    valid_grades = {grade_id for grade_id, _markers in PRIMARY_GRADE_MARKERS}
    if grade not in valid_grades or semester not in {"upper", "lower"}:
        raise ValueError(f"Unsupported expected slot: {slot}")
    return f"{grade}:{semester}"


def coverage(entries: list[dict[str, object]], expected_slots: list[str]) -> dict[str, object]:
    grade_semester_counts = Counter(f"{entry['grade']}:{entry['semester']}" for entry in entries)
    expected_slot_coverage = {slot: grade_semester_counts.get(slot, 0) for slot in expected_slots}
    return {
        "gradeSemesterCounts": dict(sorted(grade_semester_counts.items())),
        "expectedSlots": expected_slots,
        "expectedSlotCoverage": expected_slot_coverage,
        "expectedSlotsComplete": all(count > 0 for count in expected_slot_coverage.values()),
        "missingExpectedSlots": [slot for slot, count in expected_slot_coverage.items() if count == 0],
        "coveredGradeSemesters": [slot for slot, count in sorted(grade_semester_counts.items()) if count > 0],
    }


def build_manifest(zip_paths: list[Path], expected_slots: list[str] | None = None, target_id: str | None = None) -> dict[str, object]:
    resolved_target_id = target_id or target_id_for_expected_slots(expected_slots)
    target_config = target_config_for(resolved_target_id)
    normalized_expected_slots = expected_slots or list(target_config["expectedSlots"])  # type: ignore[arg-type]
    archive_records = [archive_record(path, index) for index, path in enumerate(zip_paths, start=1)]
    entries: list[dict[str, object]] = []
    for zip_path, archive_meta in zip(zip_paths, archive_records):
        entries.extend(manifest_entries_for_archive(zip_path, archive_meta, target_config))

    groups = duplicate_groups(entries)
    max_group_size = max([int(group["count"]) for group in groups], default=1 if entries else 0)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "target": resolved_target_id,
        "targetLabel": target_config["label"],
        "publisher": "MAINLAND_HJB",
        "stage": "primary",
        "artifactKind": "metadata-only-primary-assessment-archive-manifest",
        "safetyNote": SAFETY_NOTE,
        "sourceScopeNote": target_config.get("sourceScopeNote", ""),
        "archives": archive_records,
        "coverage": coverage(entries, normalized_expected_slots),
        "totals": {
            "archives": len(archive_records),
            "files": len(entries),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "duplicateVariantGroups": len(groups),
            "maxDuplicateVariantGroupSize": max_group_size,
            "legacyReferenceOnly": sum(1 for entry in entries if entry["legacyReferenceOnly"]),
            "localOnlyQuarantine": sum(1 for entry in entries if entry["localOnlyQuarantine"]),
            "needsS18Review": sum(1 for entry in entries if entry["needsS18Review"]),
        },
        "gradeCounts": count_by(entries, "grade"),
        "semesterCounts": count_by(entries, "semester"),
        "assessmentFamilyCounts": count_by(entries, "assessmentFamily"),
        "assessmentFamilySignalCounts": count_list_values(entries, "assessmentFamilySignals"),
        "materialKindCounts": count_list_values(entries, "materialKinds"),
        "unitTitleCounts": count_list_values(entries, "unitTitles"),
        "documentRoleCounts": count_by(entries, "documentRole"),
        "variantRoleCounts": count_by(entries, "variantRole"),
        "extensionCounts": count_by(entries, "extension"),
        "decodedNameStatusCounts": count_by(entries, "decodedNameStatus"),
        "legacyReferenceOnlyCounts": count_boolean(entries, "legacyReferenceOnly"),
        "localOnlyQuarantineCounts": count_boolean(entries, "localOnlyQuarantine"),
        "localOnlyQuarantineReasonCounts": count_by(entries, "localOnlyQuarantineReason"),
        "needsS18ReviewCounts": count_boolean(entries, "needsS18Review"),
        "duplicateVariantGroups": groups,
        "entries": entries,
    }


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage_info = manifest["coverage"]  # type: ignore[index]
    return "\n".join([
        f"# {manifest['targetLabel']}",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Target: {manifest['target']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Stage: {manifest['stage']}",
        f"- Source scope note: {manifest.get('sourceScopeNote') or 'N/A'}",
        f"- Archives inspected: {totals['archives']}",
        f"- Files inspected: {totals['files']}",
        f"- Total uncompressed bytes: {totals['uncompressedBytes']}",
        f"- Duplicate variant groups: {totals['duplicateVariantGroups']}",
        f"- Legacy/reference-only entries: {totals['legacyReferenceOnly']}",
        f"- Local-only quarantined entries: {totals['localOnlyQuarantine']}",
        f"- Entries needing S18 review: {totals['needsS18Review']}",
        f"- Grade-semester counts: {json.dumps(coverage_info['gradeSemesterCounts'], ensure_ascii=False)}",
        f"- Expected grade-semester slots: {json.dumps(coverage_info['expectedSlots'], ensure_ascii=False)}",
        f"- Expected slot coverage: {json.dumps(coverage_info['expectedSlotCoverage'], ensure_ascii=False)}",
        f"- Expected slots complete: {coverage_info['expectedSlotsComplete']}",
        f"- Missing expected slots: {json.dumps(coverage_info['missingExpectedSlots'], ensure_ascii=False)}",
        f"- Assessment family counts: {json.dumps(manifest['assessmentFamilyCounts'], ensure_ascii=False)}",
        f"- Assessment family signal counts: {json.dumps(manifest['assessmentFamilySignalCounts'], ensure_ascii=False)}",
        f"- Material kind counts: {json.dumps(manifest['materialKindCounts'], ensure_ascii=False)}",
        f"- Unit title counts: {json.dumps(manifest['unitTitleCounts'], ensure_ascii=False)}",
        f"- Document role counts: {json.dumps(manifest['documentRoleCounts'], ensure_ascii=False)}",
        f"- Variant role counts: {json.dumps(manifest['variantRoleCounts'], ensure_ascii=False)}",
        f"- Extension counts: {json.dumps(manifest['extensionCounts'], ensure_ascii=False)}",
        f"- Decoded-name status counts: {json.dumps(manifest['decodedNameStatusCounts'], ensure_ascii=False)}",
        f"- Local-only quarantine reason counts: {json.dumps(manifest['localOnlyQuarantineReasonCounts'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: manifest entries contain hashes, sizes, extension, decoding status, coarse family/unit classification, role, legacy-review flags, and duplicate grouping only.",
        "- Passed: no source paths, source member names, document body text, source item wording, answer text, worked-solution text, tables, figures, page content, page images, OCR output, or embeddings are extracted or persisted.",
        "- Required before production use: S18 source-distance review of safe abstraction cards and any generated output.",
        "- Legacy note: entries from old-curriculum/reference folders remain local metadata only and must not drive production cards without explicit S18 approval.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest), encoding="utf-8")


def run_self_test() -> None:
    raw_gb_name = "单元测试/第一单元、20以内数的加减法（二）单元测试卷.docx".encode("gb18030").decode("cp437")
    repaired_gb_name, repaired_gb_status = decode_zip_name(raw_gb_name)
    assert "第一单元" in repaired_gb_name
    assert repaired_gb_status.startswith("cp437-to-")

    mojibake_name = "期中+期末".encode("utf-8").decode("gb18030")
    repaired_mojibake_name, repaired_mojibake_status = decode_zip_name(mojibake_name)
    assert repaired_mojibake_name == "期中+期末"
    assert repaired_mojibake_status.endswith("mojibake-repair")

    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        source_dir = tmp_dir / "一年级数学下册（沪教版）"
        source_dir.mkdir()
        unit_zip = source_dir / "单元测试.zip"
        term_zip = source_dir / "期中+期末-K149.zip"
        with ZipFile(unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("单元测试/第一单元、20以内数的加减法（二）单元测试卷（学生版）.docx", f"{BODY_SENTINEL} body sample".encode("utf-8"))
            archive.writestr("单元测试/第五单元、长度的比较与测量单元测试卷（教师版）.docx", b"fake response support")
            archive.writestr("单元测试/老课标内容（可先参考）/一年级数学下册 第一单元练习卷(A).doc", b"legacy source")
        with ZipFile(term_zip, "w") as archive:
            archive.writestr("期中+期末/期中试卷/2026版/一年级数学下学期4月学情自测·基础卷01（1-4单元）（沪教版·新教材）/试题版A3.docx", b"fake midterm form")
            archive.writestr("期中+期末/期末综合练习（一）.doc", b"fake final form")
            archive.writestr("期中+期末/期中试卷/2026版/参考答案.docx", b"fake answer support")

        manifest = build_manifest([unit_zip, term_zip], ["P1:lower"])
        serialized = json.dumps(manifest, ensure_ascii=False)
        report = qa_report(manifest)

        assert manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert manifest["totals"]["files"] == 6  # type: ignore[index]
        assert manifest["coverage"]["expectedSlotsComplete"] is True  # type: ignore[index]
        assert manifest["coverage"]["gradeSemesterCounts"]["P1:lower"] == 6  # type: ignore[index]
        assert manifest["assessmentFamilySignalCounts"]["unit-test"] == 4  # type: ignore[index]
        assert manifest["assessmentFamilySignalCounts"]["midterm"] == 2  # type: ignore[index]
        assert manifest["assessmentFamilySignalCounts"]["final"] == 1  # type: ignore[index]
        assert manifest["assessmentFamilyCounts"]["midterm"] == 2  # type: ignore[index]
        assert manifest["extensionCounts"] == {".doc": 2, ".docx": 4}  # type: ignore[index]
        assert manifest["documentRoleCounts"]["answer-or-solution"] == 3  # type: ignore[index]
        assert manifest["totals"]["legacyReferenceOnly"] == 1  # type: ignore[index]
        assert manifest["totals"]["localOnlyQuarantine"] == 3  # type: ignore[index]
        assert manifest["totals"]["needsS18Review"] >= 2  # type: ignore[index]
        assert manifest["localOnlyQuarantineReasonCounts"]["answer-or-solution-support"] == 2  # type: ignore[index]
        assert manifest["localOnlyQuarantineReasonCounts"]["legacy-reference-only"] == 1  # type: ignore[index]
        assert BODY_SENTINEL not in serialized
        assert "fake response support" not in serialized
        assert str(tmp_dir) not in serialized
        for forbidden in ['"sourcePath"', '"sourceArchiveName"', '"entryPath"', '"fileName"', "单元测试/", "期中+期末/"]:
            assert forbidden not in serialized
            assert forbidden not in report

        p3_source_dir = tmp_dir / "三年级数学下册（沪教版）"
        p3_source_dir.mkdir()
        p3_unit_zip = p3_source_dir / "单元测试.zip"
        p3_term_zip = p3_source_dir / "期中+期末-K149.zip"
        with ZipFile(p3_unit_zip, "w") as archive:
            archive.writestr("单元测试/第一单元 复习与提高练习.docx", b"fake p3 unit")
            archive.writestr("单元测试/第二单元 两位数乘两位数单元测试.docx.wps", b"fake wps wrapper")
            archive.writestr("单元测试/第四单元 面积与周长测评.docx", b"fake area assessment")
        with ZipFile(p3_term_zip, "w") as archive:
            archive.writestr("期中+期末/期中试卷/三年级数学下册4月自测（1-3单元）（沪教版·新教材）/试题版A4.docx", b"fake p3 midterm")
            archive.writestr("期中+期末/期末综合练习.doc", b"fake p3 final")

        p3_manifest = build_manifest([p3_unit_zip, p3_term_zip], target_id="hjb-primary-p3-lower-assessments")
        p3_serialized = json.dumps(p3_manifest, ensure_ascii=False)
        p3_report = qa_report(p3_manifest)

        assert p3_manifest["target"] == "hjb-primary-p3-lower-assessments"
        assert p3_manifest["totals"]["files"] == 5  # type: ignore[index]
        assert p3_manifest["coverage"]["expectedSlotsComplete"] is True  # type: ignore[index]
        assert p3_manifest["coverage"]["expectedSlotCoverage"]["P3:lower"] > 0  # type: ignore[index]
        assert p3_manifest["extensionCounts"][".docx.wps"] == 1  # type: ignore[index]
        assert p3_manifest["totals"]["localOnlyQuarantine"] == 1  # type: ignore[index]
        assert "三年级下册复习与乘除运算" in p3_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "两位数乘除与问题解决" in p3_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "面积与周长" in p3_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert str(tmp_dir) not in p3_serialized
        for forbidden in ['"sourcePath"', '"sourceArchiveName"', '"entryPath"', '"fileName"', "单元测试/", "期中+期末/"]:
            assert forbidden not in p3_serialized
            assert forbidden not in p3_report

        p4_source_dir = tmp_dir / "四年级数学上册（沪教版）"
        p4_source_dir.mkdir()
        p4_unit_zip = p4_source_dir / "单元测试.zip"
        p4_term_zip = p4_source_dir / "期中+期末-K149.zip"
        with ZipFile(p4_unit_zip, "w") as archive:
            archive.writestr("单元测试/第一单元 复习与提高单元测试卷.docx", b"fake p4 review")
            archive.writestr("单元测试/第二单元 数与量单元测评.doc", b"fake p4 number measure")
            archive.writestr("单元测试/第五单元 几何小实践测试卷（答案）.docx", b"fake p4 answer support")
        with ZipFile(p4_term_zip, "w") as archive:
            archive.writestr("期中+期末/期中试卷/四年级数学上册期中自测（1-3单元）（沪教版·新教材）/试题版A4.docx", b"fake p4 midterm")
            archive.writestr("期中+期末/期末综合练习.docx", b"fake p4 final")

        p4_manifest = build_manifest([p4_unit_zip, p4_term_zip], target_id="hjb-primary-p4-upper-assessments")
        p4_serialized = json.dumps(p4_manifest, ensure_ascii=False)
        p4_report = qa_report(p4_manifest)

        assert p4_manifest["target"] == "hjb-primary-p4-upper-assessments"
        assert p4_manifest["totals"]["files"] == 5  # type: ignore[index]
        assert p4_manifest["coverage"]["expectedSlotsComplete"] is True  # type: ignore[index]
        assert p4_manifest["coverage"]["expectedSlotCoverage"]["P4:upper"] > 0  # type: ignore[index]
        assert "复习与提高" in p4_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "数与量" in p4_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "几何小实践" in p4_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert p4_manifest["assessmentFamilyCounts"]["midterm"] == 1  # type: ignore[index]
        assert p4_manifest["assessmentFamilyCounts"]["final"] == 1  # type: ignore[index]
        assert str(tmp_dir) not in p4_serialized
        for forbidden in ['"sourcePath"', '"sourceArchiveName"', '"entryPath"', '"fileName"', "单元测试/", "期中+期末/"]:
            assert forbidden not in p4_serialized
            assert forbidden not in p4_report

        p4_lower_source_dir = tmp_dir / "四年级数学下册（沪教版）"
        p4_lower_source_dir.mkdir()
        p4_lower_unit_zip = p4_lower_source_dir / "单元测试.zip"
        p4_lower_term_zip = p4_lower_source_dir / "期中+期末-K149.zip"
        with ZipFile(p4_lower_unit_zip, "w") as archive:
            archive.writestr("合成夹/五年制旧版参考/四年级下册第二单元小数诊断教师支持.docx", b"fake p4 lower legacy answer support")
            archive.writestr("合成夹/四年级下册第三四单元统计几何合成练习.doc", b"fake p4 lower statistics geometry")
            archive.writestr("合成夹/四年级下册复习与提高合成练习.doc", b"fake p4 lower review")
        with ZipFile(p4_lower_term_zip, "w") as archive:
            archive.writestr("合成期中/2026版/四年级下册期中合成样本（1-3单元）/学生卷.docx", b"fake p4 lower midterm")
            archive.writestr("合成期中/2026版/四年级下册期中合成样本（1-3单元）/参考解析.docx", b"fake p4 lower answer support")
            archive.writestr("合成期末/四年级下册期末综合合成样本.doc", b"fake p4 lower final")

        p4_lower_manifest = build_manifest([p4_lower_unit_zip, p4_lower_term_zip], target_id="hjb-primary-p4-lower-assessments")
        p4_lower_serialized = json.dumps(p4_lower_manifest, ensure_ascii=False)
        p4_lower_report = qa_report(p4_lower_manifest)

        assert p4_lower_manifest["target"] == "hjb-primary-p4-lower-assessments"
        assert p4_lower_manifest["totals"]["files"] == 6  # type: ignore[index]
        assert p4_lower_manifest["coverage"]["expectedSlotsComplete"] is True  # type: ignore[index]
        assert p4_lower_manifest["coverage"]["expectedSlotCoverage"]["P4:lower"] > 0  # type: ignore[index]
        assert "小数的认识与加减法" in p4_lower_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "统计与折线统计图" in p4_lower_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "几何小实践：垂直与平行" in p4_lower_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert p4_lower_manifest["localOnlyQuarantineReasonCounts"]["answer-or-solution-support"] == 1  # type: ignore[index]
        assert p4_lower_manifest["localOnlyQuarantineReasonCounts"]["legacy-reference-only"] == 1  # type: ignore[index]
        assert str(tmp_dir) not in p4_lower_serialized
        for forbidden in ['"sourcePath"', '"sourceArchiveName"', '"entryPath"', '"fileName"', "合成夹/", "合成期中/", "合成期末/"]:
            assert forbidden not in p4_lower_serialized
            assert forbidden not in p4_lower_report

        p5_source_dir = tmp_dir / "五年级数学上册（沪教版）"
        p5_source_dir.mkdir()
        p5_unit_zip = p5_source_dir / "单元测试.zip"
        p5_term_zip = p5_source_dir / "期中+期末-K149.zip"
        with ZipFile(p5_unit_zip, "w") as archive:
            archive.writestr("单元测试/第二单元 小数乘法与小数除法测试.doc", b"fake p5 decimal assessment")
            archive.writestr("单元测试/第三单元 简易方程测试.docx", b"fake p5 equation assessment")
            archive.writestr("单元测试/第四单元 平面图形面积测评（答案）.docx", b"fake p5 answer support")
            archive.writestr("单元测试/第五单元 平均数与统计练习.docx", b"fake p5 data assessment")
        with ZipFile(p5_term_zip, "w") as archive:
            archive.writestr("期中+期末/期中试卷/五年级数学上册期中自测（1-3单元）（沪教版·新教材）/试题版A4.docx", b"fake p5 midterm")
            archive.writestr("期中+期末/期末试卷/2026版/五年级数学上册期末综合测评学生卷.docx", b"fake p5 final")

        p5_manifest = build_manifest([p5_unit_zip, p5_term_zip], target_id="hjb-primary-p5-upper-assessments")
        p5_serialized = json.dumps(p5_manifest, ensure_ascii=False)
        p5_report = qa_report(p5_manifest)

        assert p5_manifest["target"] == "hjb-primary-p5-upper-assessments"
        assert p5_manifest["totals"]["files"] == 6  # type: ignore[index]
        assert p5_manifest["coverage"]["expectedSlotsComplete"] is True  # type: ignore[index]
        assert p5_manifest["coverage"]["expectedSlotCoverage"]["P5:upper"] > 0  # type: ignore[index]
        assert "小数乘除法与估算" in p5_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "用字母表示数与简易方程" in p5_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "平面图形面积" in p5_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "数据整理与平均数" in p5_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert p5_manifest["assessmentFamilyCounts"]["midterm"] == 1  # type: ignore[index]
        assert p5_manifest["assessmentFamilyCounts"]["final"] == 1  # type: ignore[index]
        assert p5_manifest["localOnlyQuarantineReasonCounts"]["answer-or-solution-support"] == 1  # type: ignore[index]
        assert str(tmp_dir) not in p5_serialized
        for forbidden in ['"sourcePath"', '"sourceArchiveName"', '"entryPath"', '"fileName"', "单元测试/", "期中+期末/"]:
            assert forbidden not in p5_serialized
            assert forbidden not in p5_report

        p6_six_up_source_dir = tmp_dir / "六年级数学上册（沪教版）"
        p6_six_up_source_dir.mkdir()
        p6_six_up_unit_zip = p6_six_up_source_dir / "单元测试.zip"
        p6_six_up_term_zip = p6_six_up_source_dir / "期中期末.zip"
        with ZipFile(p6_six_up_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("单元测试/第一章 有理数 单元测试卷（原卷版）.docx", b"fake p6 six-up rational")
            archive.writestr("单元测试/第二章 简单的代数式 单元测评（解析版）.docx", b"fake p6 six-up response support")
            archive.writestr("单元测试/第三章 一元一次方程 单元测试A4.docx", b"fake p6 six-up equation")
            archive.writestr("单元测试/老课标内容（可先参考）/第五章 长方体 单元参考练习.docx", b"fake p6 six-up legacy")
        with ZipFile(p6_six_up_term_zip, "w") as archive:
            archive.writestr("期中期末/期中/六年级数学上册期中检测（1-2章）（沪教版·新教材）/试题版A3.docx", b"fake p6 six-up midterm")
            archive.writestr("期中期末/期末/六年级数学上册期末综合卷2026.pdf", b"fake p6 six-up final")
            archive.writestr("期中期末/专题复习/六年级数学上册压轴诊断练习.docx", b"fake p6 six-up high risk")

        p6_six_up_manifest = build_manifest([p6_six_up_unit_zip, p6_six_up_term_zip], target_id="hjb-primary-p6-lower-assessments")
        p6_six_up_serialized = json.dumps(p6_six_up_manifest, ensure_ascii=False)
        p6_six_up_report = qa_report(p6_six_up_manifest)

        assert p6_six_up_manifest["target"] == "hjb-primary-p6-lower-assessments"
        assert p6_six_up_manifest["targetLabel"] == "Mainland HJB Primary P6 Six-Up Assessment Manifest QA"
        assert p6_six_up_manifest["totals"]["files"] == 7  # type: ignore[index]
        assert p6_six_up_manifest["coverage"]["expectedSlotsComplete"] is True  # type: ignore[index]
        assert p6_six_up_manifest["coverage"]["expectedSlotCoverage"]["P6:lower"] == 7  # type: ignore[index]
        assert p6_six_up_manifest["extensionCounts"] == {".docx": 6, ".pdf": 1}  # type: ignore[index]
        assert p6_six_up_manifest["semesterCounts"] == {"lower": 7}  # type: ignore[index]
        assert p6_six_up_manifest["assessmentFamilySignalCounts"]["unit-test"] == 4  # type: ignore[index]
        assert p6_six_up_manifest["assessmentFamilySignalCounts"]["midterm"] == 1  # type: ignore[index]
        assert p6_six_up_manifest["assessmentFamilySignalCounts"]["final"] == 1  # type: ignore[index]
        assert p6_six_up_manifest["totals"]["legacyReferenceOnly"] == 2  # type: ignore[index]
        assert p6_six_up_manifest["totals"]["localOnlyQuarantine"] == 3  # type: ignore[index]
        assert p6_six_up_manifest["localOnlyQuarantineReasonCounts"]["answer-or-solution-support"] == 1  # type: ignore[index]
        assert p6_six_up_manifest["localOnlyQuarantineReasonCounts"]["legacy-reference-only"] == 1  # type: ignore[index]
        assert p6_six_up_manifest["localOnlyQuarantineReasonCounts"]["high-risk-reference-only"] == 1  # type: ignore[index]
        assert all(entry["targetSemesterOverrideUsed"] is True for entry in p6_six_up_manifest["entries"])  # type: ignore[index]
        assert "有理数" in p6_six_up_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "简单的代数式" in p6_six_up_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "一元一次方程" in p6_six_up_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "线段与角" in p6_six_up_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "长方体" in p6_six_up_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert str(tmp_dir) not in p6_six_up_serialized
        for forbidden in [
            '"sourcePath"',
            '"sourceArchiveName"',
            '"entryPath"',
            '"fileName"',
            "单元测试/",
            "期中期末/",
            "六年级数学上册期中检测",
            "原卷版",
            "解析版",
            "答题纸",
            "A3",
            "A4",
        ]:
            assert forbidden not in p6_six_up_serialized
            assert forbidden not in p6_six_up_report

        p6_source_dir = tmp_dir / "六年级数学下册（沪教版）"
        p6_source_dir.mkdir()
        p6_unit_zip = p6_source_dir / "单元测试.zip"
        p6_term_zip = p6_source_dir / "期中期末.zip"
        with ZipFile(p6_unit_zip, "w") as archive:
            archive.writestr("单元测试/第5章 比与比例 单元测评.docx", b"fake p6 ratio")
            archive.writestr("单元测试/第6章 圆与扇形 单元测评.docx", b"fake p6 circle sector")
            archive.writestr("单元测试/第7章 可能性与统计图表 单元卷解析.docx", b"fake p6 answer support")
            archive.writestr("单元测试/老课标内容（可先参考）/第8章 旧内容参考测试.docx", b"fake p6 legacy")
        with ZipFile(p6_term_zip, "w") as archive:
            archive.writestr("期中期末/期中/六年级数学期中模拟卷（比与比例、圆与扇形、可能性与统计图表）.docx", b"fake p6 midterm")
            archive.writestr("期中期末/期末/六年级数学期末综合卷2024.pdf", b"fake p6 final pdf")
            archive.writestr("期中期末/专题复习/六年级数学专题挑战练习.docx", b"fake p6 high risk")

        p6_manifest = build_manifest([p6_unit_zip, p6_term_zip], target_id="hjb-primary-p6-lower-2024-assessments")
        p6_serialized = json.dumps(p6_manifest, ensure_ascii=False)
        p6_report = qa_report(p6_manifest)

        assert p6_manifest["target"] == "hjb-primary-p6-lower-2024-assessments"
        assert p6_manifest["totals"]["files"] == 7  # type: ignore[index]
        assert p6_manifest["coverage"]["expectedSlotsComplete"] is True  # type: ignore[index]
        assert p6_manifest["coverage"]["expectedSlotCoverage"]["P6:lower"] == 7  # type: ignore[index]
        assert p6_manifest["extensionCounts"] == {".docx": 6, ".pdf": 1}  # type: ignore[index]
        assert p6_manifest["semesterCounts"] == {"lower": 7}  # type: ignore[index]
        assert p6_manifest["totals"]["legacyReferenceOnly"] == 2  # type: ignore[index]
        assert p6_manifest["totals"]["localOnlyQuarantine"] == 3  # type: ignore[index]
        assert p6_manifest["localOnlyQuarantineReasonCounts"]["answer-or-solution-support"] == 1  # type: ignore[index]
        assert p6_manifest["localOnlyQuarantineReasonCounts"]["legacy-reference-only"] == 1  # type: ignore[index]
        assert p6_manifest["localOnlyQuarantineReasonCounts"]["high-risk-reference-only"] == 1  # type: ignore[index]
        assert all(entry["targetSemesterOverrideUsed"] is False for entry in p6_manifest["entries"])  # type: ignore[index]
        assert "比与比例" in p6_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "圆与扇形" in p6_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "可能性与统计图表" in p6_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "圆柱与圆锥" in p6_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert "二元一次方程组" in p6_manifest["unitTitleCounts"]  # type: ignore[operator]
        assert str(tmp_dir) not in p6_serialized
        for forbidden in ['"sourcePath"', '"sourceArchiveName"', '"entryPath"', '"fileName"', "单元测试/", "期中期末/", "六年级数学下册"]:
            assert forbidden not in p6_serialized
            assert forbidden not in p6_report


    print("Self-test passed: metadata-only HJB primary assessment manifest handles target configs and Chinese ZIP archives safely.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland HJB primary assessment archive metadata manifest.")
    parser.add_argument("zip_paths", nargs="*", help="Paths to private HJB primary assessment ZIP archives.")
    parser.add_argument("--target", default=None, choices=sorted(TARGET_CONFIGS), help="Manifest target config.")
    parser.add_argument("--out-dir", default=None, help="Output directory. Defaults to the target's ignored .local/rag/ directory.")
    parser.add_argument("--expected-slot", action="append", default=None, help="Expected grade-semester slot such as P1:upper or P1:lower. Repeat for multiple slots.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test with temporary fake ZIP archives.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.zip_paths:
        raise SystemExit("At least one ZIP path is required unless --self-test is used.")

    expected_slots = [parse_expected_slot(slot) for slot in args.expected_slot] if args.expected_slot else None
    resolved_target = args.target or target_id_for_expected_slots(expected_slots)
    target_config = target_config_for(resolved_target)
    out_dir = Path(args.out_dir).expanduser() if args.out_dir else Path(target_config["outDir"])  # type: ignore[arg-type]
    manifest = build_manifest([Path(path) for path in args.zip_paths], expected_slots, resolved_target)
    write_outputs(manifest, out_dir)
    print(f"Wrote {manifest['totals']['files']} metadata-only HJB primary assessment entries to {out_dir}")


if __name__ == "__main__":
    main()
