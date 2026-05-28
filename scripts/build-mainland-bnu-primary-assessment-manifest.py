#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland BNU primary assessments.

The script records archive/member hashes, coarse classification, role, variant,
legacy-reference flags, quarantine status, and duplicate grouping only. It
never extracts or writes document body text, source item wording, response-key
text, worked-solution wording, scoring wording, table bodies, figure bodies,
page images, page-location data, OCR output, private locators, archive labels,
original labels, or vector payloads. Default outputs live under `.local/`,
which is ignored by the repository.
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


DEFAULT_TARGET = "bnu-primary-p1-upper-assessments"
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit private archives, private "
    "locators, archive labels, original labels, extracted document text, source "
    "item wording, response-key text, worked-solution wording, scoring wording, "
    "table bodies, figure bodies, page images, page-location data, OCR output, "
    "or vector payloads."
)
BODY_SENTINEL = "MAIS_BODY_SENTINEL_SHOULD_NOT_APPEAR"

P1_UPPER_UNIT_SLOTS = [
    {
        "unitNumber": 0,
        "unitSignal": "school-readiness-number-sense",
        "unitTitle": "我上学啦与生活中的数",
        "conceptSignals": ["p1-school-readiness", "p1-number-sense", "within-10-numbers", "生活中的数"],
        "markers": ["我上学啦", "生活中的数", "数学学习习惯", "第一单元", "第1单元", "1单元"],
        "safePatternId": "bnu-primary-p1-upper-assessment-school-readiness-number-sense",
    },
    {
        "unitNumber": 2,
        "unitSignal": "within-5-add-sub",
        "unitTitle": "5以内数加与减",
        "conceptSignals": ["within-5-addition-subtraction", "part-whole", "5以内加减", "分与合"],
        "markers": ["第二单元", "第2单元", "2单元", "5以内数加与减", "5以内加减", "5以内数"],
        "safePatternId": "bnu-primary-p1-upper-assessment-within-5-add-sub",
    },
    {
        "unitNumber": 3,
        "unitSignal": "classification",
        "unitTitle": "整理与分类",
        "conceptSignals": ["classification", "sorting-rules", "整理分类", "分类标准"],
        "markers": ["第三单元", "第3单元", "3单元", "整理与分类", "整理分类", "分类"],
        "safePatternId": "bnu-primary-p1-upper-assessment-classification",
    },
    {
        "unitNumber": 4,
        "unitSignal": "within-10-add-sub",
        "unitTitle": "10以内数加与减",
        "conceptSignals": ["within-10-addition-subtraction", "part-whole", "10以内加减法", "10以内数"],
        "markers": ["第四单元", "第4单元", "4单元", "10以内数加与减", "10以内加减", "10以内数"],
        "safePatternId": "bnu-primary-p1-upper-assessment-within-10-add-sub",
    },
    {
        "unitNumber": 5,
        "unitSignal": "solid-shapes",
        "unitTitle": "有趣的立体图形",
        "conceptSignals": ["solid-shapes", "shape-classification", "立体图形", "认识图形"],
        "markers": ["第五单元", "第5单元", "5单元", "有趣的立体图形", "立体图形", "认识图形"],
        "safePatternId": "bnu-primary-p1-upper-assessment-solid-shapes",
    },
]

P1_LOWER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitSignal": "within-20-addition",
        "unitTitle": "20以内数与加法",
        "conceptSignals": ["within-20-addition", "make-ten-strategy", "number-composition-within-20", "20以内数与加法"],
        "markers": ["第一单元", "第1单元", "1单元", "20以内数与加法", "20以内数加法", "进位加法"],
        "safePatternId": "bnu-primary-p1-lower-assessment-within-20-addition",
    },
    {
        "unitNumber": 2,
        "unitSignal": "shape-transformation",
        "unitTitle": "图形大变身（一）",
        "conceptSignals": ["spatial-visualization", "shape-transformation", "viewpoint-and-shape", "图形大变身", "观察物体"],
        "markers": ["第二单元", "第2单元", "2单元", "图形大变身", "观察物体", "视角"],
        "safePatternId": "bnu-primary-p1-lower-assessment-shape-transformation",
    },
    {
        "unitNumber": 3,
        "unitSignal": "within-20-subtraction",
        "unitTitle": "20以内数与减法",
        "conceptSignals": ["within-20-subtraction", "decompose-ten-strategy", "inverse-addition-check", "20以内数与减法"],
        "markers": ["第三单元", "第3单元", "3单元", "20以内数与减法", "20以内数减法", "退位减法"],
        "safePatternId": "bnu-primary-p1-lower-assessment-within-20-subtraction",
    },
    {
        "unitNumber": 4,
        "unitSignal": "within-100-number-sense",
        "unitTitle": "100以内数的认识",
        "conceptSignals": ["within-100-numbers", "place-value-tens-ones", "number-order-within-100", "100以内数"],
        "markers": ["第四单元", "第4单元", "4单元", "100以内数的认识", "100以内数", "数位表示"],
        "safePatternId": "bnu-primary-p1-lower-assessment-within-100-number-sense",
    },
    {
        "unitNumber": 5,
        "unitSignal": "within-100-add-sub",
        "unitTitle": "100以内数加与减（一）",
        "conceptSignals": ["within-100-addition-subtraction", "two-digit-non-regrouping", "place-value-calculation", "100以内加减法"],
        "markers": ["第五单元", "第5单元", "5单元", "100以内数加与减", "100以内数的加减", "100以内加减"],
        "safePatternId": "bnu-primary-p1-lower-assessment-within-100-add-sub",
    },
    {
        "unitNumber": 6,
        "unitSignal": "plane-shapes",
        "unitTitle": "有趣的平面图形（一）",
        "conceptSignals": ["plane-shapes", "shape-composition", "geometry-play", "平面图形", "有趣的图形"],
        "markers": ["第六单元", "第6单元", "6单元", "有趣的平面图形", "平面图形", "有趣的图形"],
        "safePatternId": "bnu-primary-p1-lower-assessment-plane-shapes",
    },
]

P2_UPPER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitSignal": "within-100-add-sub",
        "unitTitle": "100以内加与减",
        "conceptSignals": ["within-100-add-sub-fluency", "addition-subtraction-relationships", "100以内加减法"],
        "markers": ["第一单元", "第1单元", "1单元", "100以内加与减", "100以内加减", "加与减"],
        "safePatternId": "bnu-primary-p2-upper-assessment-within-100-add-sub-unit",
    },
    {
        "unitNumber": 2,
        "unitSignal": "measurement",
        "unitTitle": "测量（一）",
        "conceptSignals": ["length-measurement", "centimeter-meter", "measurement-units", "测量"],
        "markers": ["第二单元", "第2单元", "2单元", "测量（一）", "测量", "厘米", "米"],
        "safePatternId": "bnu-primary-p2-upper-assessment-measurement-unit",
    },
    {
        "unitNumber": 3,
        "unitSignal": "multiplication-introduction",
        "unitTitle": "数一数与乘法",
        "conceptSignals": ["multiplication-meaning", "equal-groups", "arrays", "乘法意义", "数一数与乘法"],
        "markers": ["第三单元", "第3单元", "3单元", "数一数与乘法", "乘法意义", "几个几"],
        "safePatternId": "bnu-primary-p2-upper-assessment-multiplication-introduction-unit",
    },
    {
        "unitNumber": 4,
        "unitSignal": "multiplication-facts-2-to-5",
        "unitTitle": "乘法口诀（一）",
        "conceptSignals": ["multiplication-facts", "2-to-5-times-tables", "乘法口诀", "2到5乘法"],
        "markers": ["第四单元", "第4单元", "4单元", "乘法口诀（一）", "乘法口诀一", "2-5的乘法口诀", "2到5乘法"],
        "safePatternId": "bnu-primary-p2-upper-assessment-multiplication-facts-2-to-5-unit",
    },
    {
        "unitNumber": 5,
        "unitSignal": "division-introduction",
        "unitTitle": "分一分与除法",
        "conceptSignals": ["division-meaning", "equal-sharing", "equal-grouping", "除法意义", "分一分"],
        "markers": ["第五单元", "第5单元", "5单元", "分一分与除法", "除法意义", "平均分"],
        "safePatternId": "bnu-primary-p2-upper-assessment-division-introduction-unit",
    },
    {
        "unitNumber": 6,
        "unitSignal": "shape-motion",
        "unitTitle": "图形的运动（一）",
        "conceptSignals": ["shape-transformations", "symmetry", "translation-rotation-intuition", "图形运动", "图形变化"],
        "markers": ["第六单元", "第6单元", "6单元", "图形的运动（一）", "图形的运动", "图形运动", "图形变化"],
        "safePatternId": "bnu-primary-p2-upper-assessment-shape-motion-unit",
    },
    {
        "unitNumber": 7,
        "unitSignal": "multiplication-facts-6-to-9",
        "unitTitle": "乘法口诀（二）",
        "conceptSignals": ["multiplication-facts", "6-to-9-times-tables", "乘法口诀", "6到9乘法"],
        "markers": ["第七单元", "第7单元", "7单元", "乘法口诀（二）", "乘法口诀二", "6-9的乘法口诀", "6到9乘法"],
        "safePatternId": "bnu-primary-p2-upper-assessment-multiplication-facts-6-to-9-unit",
    },
    {
        "unitNumber": 8,
        "unitSignal": "multiplication-division-application",
        "unitTitle": "乘除法的应用（一）",
        "conceptSignals": ["multiplication-division-relationship", "multiplication-division-application", "表内乘除法", "乘除法应用"],
        "markers": ["第八单元", "第8单元", "8单元", "乘除法的应用（一）", "乘除法的应用", "乘除法应用"],
        "safePatternId": "bnu-primary-p2-upper-assessment-multiplication-division-application-unit",
    },
]

P2_LOWER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitSignal": "division-strengthening",
        "unitTitle": "除法",
        "conceptSignals": ["division-meaning", "division-facts", "division-with-remainder-intuition", "余数直观", "除法"],
        "markers": ["第一单元", "第1单元", "1单元", "(1)除法", "1除法", "除法"],
        "safePatternId": "bnu-primary-p2-lower-assessment-division-strengthening",
    },
    {
        "unitNumber": 2,
        "unitSignal": "direction-position",
        "unitTitle": "方向与位置",
        "conceptSignals": ["direction-position", "relative-location", "route-description", "方向与位置"],
        "markers": ["第二单元", "第2单元", "2单元", "(2)方向与位置", "2方向与位置", "方向与位置"],
        "safePatternId": "bnu-primary-p2-lower-assessment-direction-position",
    },
    {
        "unitNumber": 3,
        "unitSignal": "large-numbers",
        "unitTitle": "生活中的大数",
        "conceptSignals": ["within-10000-numbers", "place-value-thousands-hundreds-tens-ones", "万以内数", "生活中的大数"],
        "markers": ["第三单元", "第3单元", "3单元", "(3)生活中的大数", "3生活中的大数", "生活中的大数", "万以内数"],
        "safePatternId": "bnu-primary-p2-lower-assessment-large-numbers",
    },
    {
        "unitNumber": 4,
        "unitSignal": "measurement",
        "unitTitle": "测量",
        "conceptSignals": ["length-measurement", "unit-conversion", "estimate-measure-check", "单位换算", "测量"],
        "markers": ["第四单元", "第4单元", "4单元", "(4)测量", "4测量", "测量"],
        "safePatternId": "bnu-primary-p2-lower-assessment-measurement",
    },
    {
        "unitNumber": 5,
        "unitSignal": "three-digit-add-sub",
        "unitTitle": "加与减",
        "conceptSignals": ["three-digit-addition-subtraction", "regrouping", "estimation-check", "三位数加减", "加与减"],
        "markers": ["第五单元", "第5单元", "5单元", "(5)加与减", "5加与减", "加与减", "三位数加减"],
        "safePatternId": "bnu-primary-p2-lower-assessment-three-digit-add-sub",
    },
    {
        "unitNumber": 6,
        "unitSignal": "plane-shapes",
        "unitTitle": "认识图形",
        "conceptSignals": ["plane-shapes", "shape-features", "shape-composition", "认识图形", "平面图形"],
        "markers": ["第六单元", "第6单元", "6单元", "(6)认识图形", "6认识图形", "认识图形", "平面图形"],
        "safePatternId": "bnu-primary-p2-lower-assessment-plane-shapes",
    },
    {
        "unitNumber": 7,
        "unitSignal": "time",
        "unitTitle": "时、分、秒",
        "conceptSignals": ["time-reading", "hour-minute-second", "elapsed-time-intuition", "时分秒"],
        "markers": ["第七单元", "第7单元", "7单元", "(7)时、分、秒", "7时分秒", "时、分、秒", "时分秒"],
        "safePatternId": "bnu-primary-p2-lower-assessment-time",
    },
    {
        "unitNumber": 8,
        "unitSignal": "data-recording",
        "unitTitle": "调查与记录",
        "conceptSignals": ["data-collection", "recording-data", "simple-statistics", "调查与记录"],
        "markers": ["第八单元", "第8单元", "8单元", "(8)调查与记录", "8调查与记录", "调查与记录"],
        "safePatternId": "bnu-primary-p2-lower-assessment-data-recording",
    },
]

P3_UPPER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitSignal": "mixed-operations",
        "unitTitle": "混合运算",
        "conceptSignals": ["mixed-operations", "operation-order", "two-step-calculation", "混合运算", "运算顺序"],
        "markers": ["第一单元", "第1单元", "1单元", "混合运算", "运算顺序"],
        "safePatternId": "bnu-primary-p3-upper-assessment-mixed-operations-unit",
    },
    {
        "unitNumber": 2,
        "unitSignal": "measurement-two",
        "unitTitle": "测量（二）",
        "conceptSignals": ["measurement-units", "length-measurement", "unit-conversion", "测量", "长度单位"],
        "markers": ["第二单元", "第2单元", "2单元", "测量（二）", "测量二", "测量"],
        "safePatternId": "bnu-primary-p3-upper-assessment-measurement-two-unit",
    },
    {
        "unitNumber": 3,
        "unitSignal": "large-number-add-sub",
        "unitTitle": "大数加与减（二）",
        "conceptSignals": ["large-number-addition-subtraction", "estimation-check", "multi-digit-calculation", "大数加与减"],
        "markers": ["第三单元", "第3单元", "3单元", "大数加与减（二）", "大数加与减", "加与减"],
        "safePatternId": "bnu-primary-p3-upper-assessment-large-number-add-sub-unit",
    },
    {
        "unitNumber": 4,
        "unitSignal": "living-space",
        "unitTitle": "我们生活中的空间（一）",
        "conceptSignals": ["spatial-visualization", "views-of-objects", "relative-position", "生活中的空间", "空间观念"],
        "markers": ["第四单元", "第4单元", "4单元", "我们生活中的空间（一）", "我们生活的空间（一）", "生活中的空间", "生活的空间"],
        "safePatternId": "bnu-primary-p3-upper-assessment-living-space-unit",
    },
    {
        "unitNumber": 5,
        "unitSignal": "plane-shapes",
        "unitTitle": "认识图形",
        "conceptSignals": ["plane-shapes", "angles", "rectangle-square-features", "认识图形", "角与直角"],
        "markers": ["第五单元", "第5单元", "5单元", "认识图形", "认识角", "直角", "长方形", "正方形"],
        "safePatternId": "bnu-primary-p3-upper-assessment-plane-shapes-unit",
    },
    {
        "unitNumber": 6,
        "unitSignal": "multiplication-division-application-two",
        "unitTitle": "乘除法的应用（二）",
        "conceptSignals": ["multiplication-division-application", "multiplicative-reasoning", "problem-solving", "乘除法应用"],
        "markers": ["第六单元", "第6单元", "6单元", "乘除法的应用（二）", "乘除法的应用", "乘除法应用", "乘与除"],
        "safePatternId": "bnu-primary-p3-upper-assessment-multiplication-division-application-two-unit",
    },
    {
        "unitNumber": 7,
        "unitSignal": "decimal-introduction",
        "unitTitle": "认识小数",
        "conceptSignals": ["decimal-introduction", "decimal-comparison", "tenths-hundredths-contexts", "认识小数", "小数"],
        "markers": ["第七单元", "第7单元", "7单元", "认识小数", "小数"],
        "safePatternId": "bnu-primary-p3-upper-assessment-decimal-introduction-unit",
    },
    {
        "unitNumber": 8,
        "unitSignal": "data-recording",
        "unitTitle": "调查与记录",
        "conceptSignals": ["data-collection", "data-recording", "simple-data-analysis", "调查与记录", "数据意识"],
        "markers": ["第八单元", "第8单元", "8单元", "调查与记录", "调查记录", "数据"],
        "safePatternId": "bnu-primary-p3-upper-assessment-data-recording-unit",
    },
]

P3_LOWER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitSignal": "division",
        "unitTitle": "除法",
        "conceptSignals": ["multi-digit-division", "division-check", "remainder-meaning", "有余数除法", "除法"],
        "markers": ["第一单元", "第1单元", "1单元", "(1)除法", "1除法", "有余数除法", "除法"],
        "safePatternId": "bnu-primary-p3-lower-assessment-division-unit",
    },
    {
        "unitNumber": 2,
        "unitSignal": "shape-motion",
        "unitTitle": "图形的运动",
        "conceptSignals": ["shape-motion", "translation-rotation-symmetry", "spatial-visualization", "图形运动", "图形的运动"],
        "markers": ["第二单元", "第2单元", "2单元", "图形的运动", "图形运动", "平移", "旋转", "轴对称"],
        "safePatternId": "bnu-primary-p3-lower-assessment-shape-motion-unit",
    },
    {
        "unitNumber": 3,
        "unitSignal": "two-digit-multiplication",
        "unitTitle": "乘法",
        "conceptSignals": ["two-digit-by-two-digit-multiplication", "multiplication-estimation", "乘法", "两位数乘两位数"],
        "markers": ["第三单元", "第3单元", "3单元", "两位数乘两位数", "乘法"],
        "safePatternId": "bnu-primary-p3-lower-assessment-two-digit-multiplication-unit",
    },
    {
        "unitNumber": 4,
        "unitSignal": "mass-units",
        "unitTitle": "千克、克、吨",
        "conceptSignals": ["mass-units", "kilogram-gram-ton", "unit-conversion", "千克克吨", "质量单位"],
        "markers": ["第四单元", "第4单元", "4单元", "千克", "克", "吨", "质量单位"],
        "safePatternId": "bnu-primary-p3-lower-assessment-mass-units-unit",
    },
    {
        "unitNumber": 5,
        "unitSignal": "area",
        "unitTitle": "面积",
        "conceptSignals": ["area-meaning", "area-units", "rectangle-square-area", "面积", "面积单位"],
        "markers": ["第五单元", "第5单元", "5单元", "面积", "面积单位", "长方形面积", "正方形面积"],
        "safePatternId": "bnu-primary-p3-lower-assessment-area-unit",
    },
    {
        "unitNumber": 6,
        "unitSignal": "fraction-introduction",
        "unitTitle": "认识分数",
        "conceptSignals": ["fraction-introduction", "part-whole-fractions", "fraction-comparison", "认识分数", "分数"],
        "markers": ["第六单元", "第6单元", "6单元", "认识分数", "分数"],
        "safePatternId": "bnu-primary-p3-lower-assessment-fraction-introduction-unit",
    },
    {
        "unitNumber": 7,
        "unitSignal": "data-representation",
        "unitTitle": "数据的整理和表示",
        "conceptSignals": ["data-representation", "data-organization", "simple-statistics", "数据表示", "数据整理"],
        "markers": [
            "第七单元",
            "第7单元",
            "7单元",
            "数据的整理和表示",
            "数据的整理",
            "数据整理",
            "数据表示",
        ],
        "safePatternId": "bnu-primary-p3-lower-assessment-data-representation-unit",
    },
]

P4_LOWER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitSignal": "decimal-meaning-add-sub",
        "unitTitle": "小数的意义和加减法",
        "conceptSignals": ["decimal-meaning", "decimal-addition-subtraction", "decimal-place-value", "小数的意义", "小数加减法"],
        "markers": ["第一单元", "第1单元", "1单元", "小数的意义和加减法", "小数的意义", "小数加减法", "小数的加减法"],
        "safePatternId": "bnu-primary-p4-lower-assessment-decimal-meaning-add-sub-unit",
    },
    {
        "unitNumber": 2,
        "unitSignal": "triangles-quadrilaterals",
        "unitTitle": "认识三角形和四边形",
        "conceptSignals": ["triangles-quadrilaterals", "shape-classification", "angle-side-properties", "认识三角形", "四边形"],
        "markers": ["第二单元", "第2单元", "2单元", "认识三角形和四边形", "认识三角形", "认识四边形", "三角形", "四边形"],
        "safePatternId": "bnu-primary-p4-lower-assessment-triangles-quadrilaterals-unit",
    },
    {
        "unitNumber": 3,
        "unitSignal": "decimal-multiplication",
        "unitTitle": "小数乘法",
        "conceptSignals": ["decimal-multiplication", "scaling", "decimal-place-value", "小数乘法"],
        "markers": ["第三单元", "第3单元", "3单元", "小数乘法"],
        "safePatternId": "bnu-primary-p4-lower-assessment-decimal-multiplication-unit",
    },
    {
        "unitNumber": 4,
        "unitSignal": "observe-objects",
        "unitTitle": "观察物体",
        "conceptSignals": ["observe-objects", "views-of-solids", "spatial-visualization", "观察物体", "长方体"],
        "markers": ["第四单元", "第4单元", "4单元", "观察物体", "长方体（二）", "长方体二", "视图"],
        "safePatternId": "bnu-primary-p4-lower-assessment-observe-objects-unit",
    },
    {
        "unitNumber": 5,
        "unitSignal": "equations",
        "unitTitle": "认识方程",
        "conceptSignals": ["equations-introduction", "unknown-quantity", "equality", "认识方程", "方程", "用字母表示数"],
        "markers": ["第五单元", "第5单元", "5单元", "认识方程", "用字母表示数", "解方程", "列方程", "方程"],
        "safePatternId": "bnu-primary-p4-lower-assessment-equations-unit",
    },
    {
        "unitNumber": 6,
        "unitSignal": "data-representation-analysis",
        "unitTitle": "数据的表示和分析",
        "conceptSignals": ["data-representation-analysis", "statistical-charts", "average", "数据表示", "数据分析"],
        "markers": ["第六单元", "第6单元", "6单元", "数据的表示和分析", "数据表示", "数据分析", "平均数"],
        "safePatternId": "bnu-primary-p4-lower-assessment-data-representation-analysis-unit",
    },
    {
        "unitNumber": 7,
        "unitSignal": "math-play-review",
        "unitTitle": "数学好玩与整理复习",
        "conceptSignals": ["p4-lower-review", "mathematical-activity", "integrated-application", "数学好玩", "整理与复习"],
        "markers": ["数学好玩", "整理与复习", "总复习", "复习"],
        "safePatternId": "bnu-primary-p4-lower-assessment-final-topic-drill",
    },
]

P4_UPPER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitSignal": "large-numbers",
        "unitTitle": "认识更大的数",
        "conceptSignals": ["large-numbers", "place-value", "rounding-estimation", "认识更大的数", "大数"],
        "markers": ["第一单元", "第1单元", "1单元", "第1章", "第1章节", "认识更大的数", "大数"],
        "safePatternId": "bnu-primary-p4-upper-assessment-large-numbers-unit",
    },
    {
        "unitNumber": 2,
        "unitSignal": "lines-angles",
        "unitTitle": "线与角",
        "conceptSignals": ["lines-angles", "angle-measurement", "parallel-perpendicular", "线与角", "角度"],
        "markers": ["第二单元", "第2单元", "2单元", "第2章", "第2章节", "线与角", "角"],
        "safePatternId": "bnu-primary-p4-upper-assessment-lines-angles-unit",
    },
    {
        "unitNumber": 3,
        "unitSignal": "multiplication",
        "unitTitle": "乘法",
        "conceptSignals": ["three-digit-by-two-digit-multiplication", "multiplication-estimation", "area-model", "乘法", "三位数乘两位数"],
        "markers": ["第三单元", "第3单元", "3单元", "第3章", "第3章节", "三位数乘两位数", "乘法"],
        "safePatternId": "bnu-primary-p4-upper-assessment-multiplication-unit",
    },
    {
        "unitNumber": 4,
        "unitSignal": "operation-laws",
        "unitTitle": "运算律",
        "conceptSignals": ["operation-laws", "commutative-associative-distributive", "mental-calculation", "运算律", "简便计算"],
        "markers": ["第四单元", "第4单元", "4单元", "第4章", "第4章节", "运算律", "简便计算"],
        "safePatternId": "bnu-primary-p4-upper-assessment-operation-laws-unit",
    },
    {
        "unitNumber": 5,
        "unitSignal": "direction-position",
        "unitTitle": "方向与位置",
        "conceptSignals": ["direction-position", "coordinate-grid", "route-description", "方向与位置", "数对"],
        "markers": ["第五单元", "第5单元", "5单元", "第5章", "第5章节", "方向与位置", "数对", "位置"],
        "safePatternId": "bnu-primary-p4-upper-assessment-direction-position-unit",
    },
    {
        "unitNumber": 6,
        "unitSignal": "division",
        "unitTitle": "除法",
        "conceptSignals": ["two-digit-divisor-division", "quotient-estimation", "division-check", "除数是两位数", "除法"],
        "markers": ["第六单元", "第6单元", "6单元", "第6章", "第6章节", "除数是两位数", "除法"],
        "safePatternId": "bnu-primary-p4-upper-assessment-division-unit",
    },
    {
        "unitNumber": 7,
        "unitSignal": "negative-numbers",
        "unitTitle": "生活中的负数",
        "conceptSignals": ["negative-numbers", "signed-number-contexts", "temperature-number-line", "生活中的负数", "负数"],
        "markers": ["第七单元", "第7单元", "7单元", "第7章", "第7章节", "生活中的负数", "负数"],
        "safePatternId": "bnu-primary-p4-upper-assessment-negative-numbers-unit",
    },
    {
        "unitNumber": 8,
        "unitSignal": "probability",
        "unitTitle": "可能性",
        "conceptSignals": ["probability-intuition", "likelihood", "random-events", "fairness", "可能性"],
        "markers": ["第八单元", "第8单元", "8单元", "第8章", "第8章节", "可能性"],
        "safePatternId": "bnu-primary-p4-upper-assessment-probability-unit",
    },
]

P5_UPPER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitSignal": "decimal-division",
        "unitTitle": "小数除法",
        "conceptSignals": ["decimal-division", "decimal-place-value", "quotient-estimation", "recurring-decimals", "小数除法"],
        "markers": ["第一单元", "第1单元", "1单元", "第1章", "第1章节", "小数除法"],
        "safePatternId": "bnu-primary-p5-upper-assessment-decimal-division-unit",
    },
    {
        "unitNumber": 2,
        "unitSignal": "symmetry-translation",
        "unitTitle": "轴对称和平移",
        "conceptSignals": ["axis-symmetry", "translation", "geometric-transformation", "轴对称", "平移"],
        "markers": ["第二单元", "第2单元", "2单元", "第2章", "第2章节", "轴对称和平移", "轴对称", "平移"],
        "safePatternId": "bnu-primary-p5-upper-assessment-symmetry-translation-unit",
    },
    {
        "unitNumber": 3,
        "unitSignal": "multiples-factors",
        "unitTitle": "倍数与因数",
        "conceptSignals": ["factors-multiples", "divisibility", "prime-composite", "倍数", "因数"],
        "markers": ["第三单元", "第3单元", "3单元", "第3章", "第3章节", "倍数与因数", "倍数", "因数"],
        "safePatternId": "bnu-primary-p5-upper-assessment-multiples-factors-unit",
    },
    {
        "unitNumber": 4,
        "unitSignal": "polygon-area",
        "unitTitle": "多边形的面积",
        "conceptSignals": ["polygon-area", "parallelogram-area", "triangle-area", "trapezoid-area", "多边形面积"],
        "markers": ["第四单元", "第4单元", "4单元", "第4章", "第4章节", "多边形的面积", "多边形面积"],
        "safePatternId": "bnu-primary-p5-upper-assessment-polygon-area-unit",
    },
    {
        "unitNumber": 5,
        "unitSignal": "fraction-meaning",
        "unitTitle": "分数的意义",
        "conceptSignals": ["fraction-meaning", "fraction-division-relationship", "equivalent-fractions", "分数意义"],
        "markers": ["第五单元", "第5单元", "5单元", "第5章", "第5章节", "分数的意义", "分数意义", "分数"],
        "safePatternId": "bnu-primary-p5-upper-assessment-fraction-meaning-unit",
    },
    {
        "unitNumber": 6,
        "unitSignal": "composite-area",
        "unitTitle": "组合图形的面积",
        "conceptSignals": ["composite-area", "decompose-recompose", "irregular-area", "组合图形面积"],
        "markers": ["第六单元", "第6单元", "6单元", "第6章", "第6章节", "组合图形的面积", "组合图形面积"],
        "safePatternId": "bnu-primary-p5-upper-assessment-composite-area-unit",
    },
    {
        "unitNumber": 7,
        "unitSignal": "probability",
        "unitTitle": "可能性",
        "conceptSignals": ["probability-intuition", "likelihood", "fairness", "random-events", "可能性"],
        "markers": ["第七单元", "第7单元", "7单元", "第7章", "第7章节", "可能性"],
        "safePatternId": "bnu-primary-p5-upper-assessment-probability-unit",
    },
    {
        "unitNumber": 8,
        "unitSignal": "math-play-review",
        "unitTitle": "数学好玩与总复习",
        "conceptSignals": ["p5-upper-review", "mathematical-activity", "integrated-application", "数学好玩", "总复习"],
        "markers": ["数学好玩", "整理与复习", "总复习", "复习"],
        "safePatternId": "bnu-primary-p5-upper-assessment-final-topic-drill",
    },
]

P5_LOWER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitSignal": "fraction-add-sub",
        "unitTitle": "分数加减法",
        "conceptSignals": ["fraction-addition-subtraction", "common-denominator", "equivalent-fractions", "分数加减法"],
        "markers": ["第一单元", "第1单元", "1单元", "第1章", "第1章节", "分数加减法", "异分母", "通分"],
        "safePatternId": "bnu-primary-p5-lower-assessment-fraction-add-sub-unit",
    },
    {
        "unitNumber": 2,
        "unitSignal": "cuboid-introduction",
        "unitTitle": "长方体（一）",
        "conceptSignals": ["cuboid-cube-features", "nets", "surface-area", "spatial-visualization", "长方体", "表面积"],
        "markers": ["第二单元", "第2单元", "2单元", "第2章", "第2章节", "长方体（一）", "长方体一", "表面积", "展开图"],
        "safePatternId": "bnu-primary-p5-lower-assessment-cuboid-introduction-unit",
    },
    {
        "unitNumber": 3,
        "unitSignal": "fraction-multiplication",
        "unitTitle": "分数乘法",
        "conceptSignals": ["fraction-multiplication", "part-of-part", "scaling", "分数乘法"],
        "markers": ["第三单元", "第3单元", "3单元", "第3章", "第3章节", "分数乘法", "约分计算"],
        "safePatternId": "bnu-primary-p5-lower-assessment-fraction-multiplication-unit",
    },
    {
        "unitNumber": 4,
        "unitSignal": "cuboid-volume",
        "unitTitle": "长方体（二）",
        "conceptSignals": ["volume", "cuboid-volume", "volume-units", "capacity-connection", "长方体体积"],
        "markers": ["第四单元", "第4单元", "4单元", "第4章", "第4章节", "长方体（二）", "长方体二", "体积", "容积", "体积单位"],
        "safePatternId": "bnu-primary-p5-lower-assessment-cuboid-volume-unit",
    },
    {
        "unitNumber": 5,
        "unitSignal": "fraction-division",
        "unitTitle": "分数除法",
        "conceptSignals": ["fraction-division", "reciprocal", "measurement-division", "分数除法", "倒数"],
        "markers": ["第五单元", "第5单元", "5单元", "第5章", "第5章节", "分数除法", "倒数"],
        "safePatternId": "bnu-primary-p5-lower-assessment-fraction-division-unit",
    },
    {
        "unitNumber": 6,
        "unitSignal": "position-location",
        "unitTitle": "确定位置",
        "conceptSignals": ["position-location", "coordinate-like-representation", "direction-distance", "确定位置"],
        "markers": ["第六单元", "第6单元", "6单元", "第6章", "第6章节", "确定位置", "方向", "路线"],
        "safePatternId": "bnu-primary-p5-lower-assessment-position-unit",
    },
    {
        "unitNumber": 7,
        "unitSignal": "equation-problem-solving",
        "unitTitle": "用方程解决问题",
        "conceptSignals": ["equation-problem-solving", "unknown-quantity", "linear-equations-primary", "方程解决问题"],
        "markers": ["第七单元", "第7单元", "7单元", "第7章", "第7章节", "用方程解决问题", "方程解决问题", "等量关系", "方程"],
        "safePatternId": "bnu-primary-p5-lower-assessment-equations-unit",
    },
    {
        "unitNumber": 8,
        "unitSignal": "data-analysis",
        "unitTitle": "数据的表示和分析",
        "conceptSignals": ["data-representation-analysis", "statistical-charts", "average", "data-comparison", "数据表示分析"],
        "markers": ["第八单元", "第8单元", "8单元", "第8章", "第8章节", "数据的表示和分析", "数据表示", "数据分析", "平均数"],
        "safePatternId": "bnu-primary-p5-lower-assessment-data-analysis-unit",
    },
]

P6_UPPER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitSignal": "circles",
        "unitTitle": "圆",
        "conceptSignals": ["circle", "radius-diameter", "circumference", "circle-area", "圆", "圆周长", "圆面积"],
        "markers": ["第一单元", "第1单元", "1单元", "第1章", "第1章节", "圆", "圆周长", "圆面积"],
        "safePatternId": "bnu-primary-p6-upper-assessment-circles-unit",
    },
    {
        "unitNumber": 2,
        "unitSignal": "fraction-mixed-operations",
        "unitTitle": "分数混合运算",
        "conceptSignals": ["fraction-mixed-operations", "operation-order", "fraction-word-problems", "分数混合运算"],
        "markers": ["第二单元", "第2单元", "2单元", "第2章", "第2章节", "分数混合运算", "分数四则混合"],
        "safePatternId": "bnu-primary-p6-upper-assessment-fraction-mixed-operations-unit",
    },
    {
        "unitNumber": 3,
        "unitSignal": "observe-objects",
        "unitTitle": "观察物体",
        "conceptSignals": ["viewpoints", "three-dimensional-arrangements", "spatial-visualization", "观察物体"],
        "markers": ["第三单元", "第3单元", "3单元", "第3章", "第3章节", "观察物体", "视图"],
        "safePatternId": "bnu-primary-p6-upper-assessment-observe-objects-unit",
    },
    {
        "unitNumber": 4,
        "unitSignal": "percentage-meaning",
        "unitTitle": "百分数",
        "conceptSignals": ["percentage-meaning", "fraction-decimal-percent", "percent-rate", "百分数", "百分率"],
        "markers": ["第四单元", "第4单元", "4单元", "第4章", "第4章节", "百分数", "百分率"],
        "safePatternId": "bnu-primary-p6-upper-assessment-percentage-meaning-unit",
    },
    {
        "unitNumber": 5,
        "unitSignal": "data-processing",
        "unitTitle": "数据处理",
        "conceptSignals": ["data-processing", "statistical-graphs", "data-comparison", "trend-analysis", "数据处理", "统计图"],
        "markers": ["第五单元", "第5单元", "5单元", "第5章", "第5章节", "数据处理", "统计图", "扇形统计图"],
        "safePatternId": "bnu-primary-p6-upper-assessment-data-processing-unit",
    },
    {
        "unitNumber": 6,
        "unitSignal": "ratio",
        "unitTitle": "比的认识",
        "conceptSignals": ["ratio", "equivalent-ratios", "ratio-simplification", "ratio-application", "比", "比值"],
        "markers": ["第六单元", "第6单元", "6单元", "第6章", "第6章节", "比的认识", "比值", "化简比"],
        "safePatternId": "bnu-primary-p6-upper-assessment-ratio-unit",
    },
    {
        "unitNumber": 7,
        "unitSignal": "percentage-applications",
        "unitTitle": "百分数的应用",
        "conceptSignals": ["percentage-applications", "increase-decrease-percent", "discount-interest-tax", "百分数应用"],
        "markers": ["第七单元", "第7单元", "7单元", "第7章", "第7章节", "百分数的应用", "百分数应用", "增长率", "折扣"],
        "safePatternId": "bnu-primary-p6-upper-assessment-percentage-applications-unit",
    },
]

P6_LOWER_UNIT_SLOTS = [
    {
        "unitNumber": 1,
        "unitSignal": "cylinders-cones",
        "unitTitle": "圆柱与圆锥",
        "conceptSignals": ["cylinder", "cone", "surface-area", "volume", "solid-geometry", "圆柱", "圆锥"],
        "markers": ["第一单元", "第1单元", "1单元", "第1章", "第1章节", "圆柱与圆锥", "圆柱", "圆锥"],
        "safePatternId": "bnu-primary-p6-lower-assessment-cylinders-cones-unit",
    },
    {
        "unitNumber": 2,
        "unitSignal": "proportion",
        "unitTitle": "比例",
        "conceptSignals": ["proportion", "scale", "equivalent-ratios", "solve-proportions", "比例", "比例尺"],
        "markers": ["第二单元", "第2单元", "2单元", "第2章", "第2章节", "比例", "比例尺", "解比例"],
        "safePatternId": "bnu-primary-p6-lower-assessment-proportion-unit",
    },
    {
        "unitNumber": 3,
        "unitSignal": "geometric-motion",
        "unitTitle": "图形的运动",
        "conceptSignals": ["geometric-motion", "rotation", "translation", "symmetry", "design-transformations", "图形运动"],
        "markers": ["第三单元", "第3单元", "3单元", "第3章", "第3章节", "图形的运动", "图形运动", "平移", "旋转", "轴对称"],
        "safePatternId": "bnu-primary-p6-lower-assessment-geometric-motion-unit",
    },
    {
        "unitNumber": 4,
        "unitSignal": "direct-inverse-proportion",
        "unitTitle": "正比例与反比例",
        "conceptSignals": ["direct-proportion", "inverse-proportion", "constant-rate", "constant-product", "正比例", "反比例"],
        "markers": ["第四单元", "第4单元", "4单元", "第4章", "第4章节", "正比例与反比例", "正比例和反比例", "正比例", "反比例"],
        "safePatternId": "bnu-primary-p6-lower-assessment-direct-inverse-proportion-unit",
    },
]

P1_UPPER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P1_UPPER_UNIT_SLOTS),
    "bnu-primary-p1-upper-assessment-monthly-1-to-2-integrated",
    "bnu-primary-p1-upper-assessment-midterm-integrated",
    "bnu-primary-p1-upper-assessment-final-integrated",
]

P1_LOWER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P1_LOWER_UNIT_SLOTS),
    "bnu-primary-p1-lower-assessment-monthly-1-to-2-integrated",
    "bnu-primary-p1-lower-assessment-monthly-5-to-6-integrated",
    "bnu-primary-p1-lower-assessment-midterm-integrated",
    "bnu-primary-p1-lower-assessment-final-integrated",
]

P2_UPPER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P2_UPPER_UNIT_SLOTS),
    "bnu-primary-p2-upper-assessment-monthly-1-to-2-integrated",
    "bnu-primary-p2-upper-assessment-midterm-integrated",
    "bnu-primary-p2-upper-assessment-final-integrated",
]

P2_LOWER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P2_LOWER_UNIT_SLOTS),
    "bnu-primary-p2-lower-assessment-monthly-stage-integrated",
    "bnu-primary-p2-lower-assessment-midterm-integrated",
    "bnu-primary-p2-lower-assessment-final-integrated",
]

P3_UPPER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P3_UPPER_UNIT_SLOTS),
    "bnu-primary-p3-upper-assessment-final-topic-drill",
    "bnu-primary-p3-upper-assessment-final-integrated",
]

P3_LOWER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P3_LOWER_UNIT_SLOTS),
    "bnu-primary-p3-lower-assessment-monthly-stage-integrated",
    "bnu-primary-p3-lower-assessment-midterm-integrated",
    "bnu-primary-p3-lower-assessment-final-integrated",
]

P4_UPPER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P4_UPPER_UNIT_SLOTS),
    "bnu-primary-p4-upper-assessment-monthly-1-to-2-integrated",
    "bnu-primary-p4-upper-assessment-monthly-3-to-4-integrated",
    "bnu-primary-p4-upper-assessment-monthly-5-to-6-integrated",
    "bnu-primary-p4-upper-assessment-midterm-integrated",
    "bnu-primary-p4-upper-assessment-final-integrated",
    "bnu-primary-p4-upper-assessment-final-topic-drill",
]

P4_LOWER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P4_LOWER_UNIT_SLOTS),
    "bnu-primary-p4-lower-assessment-midterm-integrated",
    "bnu-primary-p4-lower-assessment-final-integrated",
]

P5_UPPER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P5_UPPER_UNIT_SLOTS),
    "bnu-primary-p5-upper-assessment-midterm-integrated",
    "bnu-primary-p5-upper-assessment-final-integrated",
]

P5_LOWER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P5_LOWER_UNIT_SLOTS),
    "bnu-primary-p5-lower-assessment-monthly-stage-integrated",
    "bnu-primary-p5-lower-assessment-midterm-integrated",
    "bnu-primary-p5-lower-assessment-final-integrated",
    "bnu-primary-p5-lower-assessment-final-topic-drill",
]

P6_UPPER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P6_UPPER_UNIT_SLOTS),
    "bnu-primary-p6-upper-assessment-monthly-stage-integrated",
    "bnu-primary-p6-upper-assessment-midterm-integrated",
    "bnu-primary-p6-upper-assessment-final-integrated",
    "bnu-primary-p6-upper-assessment-final-topic-drill",
]

P6_LOWER_EXPECTED_SAFE_PATTERN_IDS = [
    *(slot["safePatternId"] for slot in P6_LOWER_UNIT_SLOTS),
    "bnu-primary-p6-lower-assessment-monthly-1-to-2-integrated",
    "bnu-primary-p6-lower-assessment-monthly-3-to-4-integrated",
    "bnu-primary-p6-lower-assessment-midterm-integrated",
    "bnu-primary-p6-lower-assessment-final-integrated",
    "bnu-primary-p6-lower-assessment-final-topic-drill",
]

TARGET_CONFIGS = {
    "bnu-primary-p1-upper-assessments": {
        "label": "Mainland BNU P1 Upper Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p1-upper-assessments"),
        "grade": "P1",
        "semester": "upper",
        "entryIdPrefix": "bnu-primary-assessment-p1-upper",
        "logicalGroupPrefix": "bnu-p1-upper",
        "coverageScope": "BNU P1 upper unit, monthly, midterm, and final assessments",
        "unitSlots": P1_UPPER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "一年级上册综合",
        "defaultReviewConceptSignals": ["p1-upper-review", "integrated-assessment"],
        "expectedSafePatternIds": P1_UPPER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {
            "monthly-1-to-2": ["bnu-primary-p1-upper-assessment-monthly-1-to-2-integrated"],
            "monthly-review": ["bnu-primary-p1-upper-assessment-monthly-1-to-2-integrated"],
        },
        "midtermSafePatternId": "bnu-primary-p1-upper-assessment-midterm-integrated",
        "finalSafePatternId": "bnu-primary-p1-upper-assessment-final-integrated",
    },
    "bnu-primary-p1-lower-assessments": {
        "label": "Mainland BNU P1 Lower Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p1-lower-assessments"),
        "grade": "P1",
        "semester": "lower",
        "entryIdPrefix": "bnu-primary-assessment-p1-lower",
        "logicalGroupPrefix": "bnu-p1-lower",
        "coverageScope": "BNU P1 lower unit, monthly, midterm, and final assessments",
        "unitSlots": P1_LOWER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "一年级下册综合",
        "defaultReviewConceptSignals": ["p1-lower-review", "integrated-assessment"],
        "expectedSafePatternIds": P1_LOWER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {
            "monthly-1-to-2": ["bnu-primary-p1-lower-assessment-monthly-1-to-2-integrated"],
            "monthly-5-to-6": ["bnu-primary-p1-lower-assessment-monthly-5-to-6-integrated"],
        },
        "midtermSafePatternId": "bnu-primary-p1-lower-assessment-midterm-integrated",
        "finalSafePatternId": "bnu-primary-p1-lower-assessment-final-integrated",
    },
    "bnu-primary-p2-upper-assessments": {
        "label": "Mainland BNU P2 Upper Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p2-upper-assessments"),
        "grade": "P2",
        "semester": "upper",
        "entryIdPrefix": "bnu-primary-assessment-p2-upper",
        "logicalGroupPrefix": "bnu-p2-upper",
        "coverageScope": "BNU P2 upper unit, monthly, midterm, and final assessments",
        "unitSlots": P2_UPPER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "二年级上册综合",
        "defaultReviewConceptSignals": ["p2-upper-review", "integrated-assessment"],
        "expectedSafePatternIds": P2_UPPER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {
            "monthly-1-to-2": ["bnu-primary-p2-upper-assessment-monthly-1-to-2-integrated"],
            "monthly-review": ["bnu-primary-p2-upper-assessment-monthly-1-to-2-integrated"],
        },
        "midtermSafePatternId": "bnu-primary-p2-upper-assessment-midterm-integrated",
        "finalSafePatternId": "bnu-primary-p2-upper-assessment-final-integrated",
    },
    "bnu-primary-p2-lower-assessments": {
        "label": "Mainland BNU P2 Lower Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p2-lower-assessments"),
        "grade": "P2",
        "semester": "lower",
        "entryIdPrefix": "bnu-primary-assessment-p2-lower",
        "logicalGroupPrefix": "bnu-p2-lower",
        "coverageScope": "BNU P2 lower unit, monthly, midterm, and final assessments",
        "unitSlots": P2_LOWER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "二年级下册综合",
        "defaultReviewConceptSignals": ["p2-lower-review", "integrated-assessment"],
        "expectedSafePatternIds": P2_LOWER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {
            "monthly-1-to-3": ["bnu-primary-p2-lower-assessment-monthly-stage-integrated"],
            "monthly-1-to-4": ["bnu-primary-p2-lower-assessment-monthly-stage-integrated"],
            "monthly-3-to-4": ["bnu-primary-p2-lower-assessment-monthly-stage-integrated"],
            "monthly-5-to-8": ["bnu-primary-p2-lower-assessment-monthly-stage-integrated"],
            "monthly-review": ["bnu-primary-p2-lower-assessment-monthly-stage-integrated"],
        },
        "midtermSafePatternId": "bnu-primary-p2-lower-assessment-midterm-integrated",
        "finalSafePatternId": "bnu-primary-p2-lower-assessment-final-integrated",
    },
    "bnu-primary-p3-upper-assessments": {
        "label": "Mainland BNU P3 Upper Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p3-upper-assessments"),
        "grade": "P3",
        "semester": "upper",
        "entryIdPrefix": "bnu-primary-assessment-p3-upper",
        "logicalGroupPrefix": "bnu-p3-upper",
        "coverageScope": "BNU P3 upper unit and final/topic-drill assessments",
        "unitSlots": P3_UPPER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "三年级上册综合",
        "defaultReviewConceptSignals": ["p3-upper-review", "integrated-assessment", "final-review"],
        "expectedSafePatternIds": P3_UPPER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {},
        "midtermSafePatternId": "",
        "finalSafePatternId": "bnu-primary-p3-upper-assessment-final-integrated",
        "topicDrillSafePatternId": "bnu-primary-p3-upper-assessment-final-topic-drill",
        "finalTopicDrillSafePatternId": "bnu-primary-p3-upper-assessment-final-topic-drill",
    },
    "bnu-primary-p3-lower-assessments": {
        "label": "Mainland BNU P3 Lower Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p3-lower-assessments"),
        "grade": "P3",
        "semester": "lower",
        "entryIdPrefix": "bnu-primary-assessment-p3-lower",
        "logicalGroupPrefix": "bnu-p3-lower",
        "coverageScope": "BNU P3 lower unit, monthly, midterm, and final assessments",
        "unitSlots": P3_LOWER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "三年级下册综合",
        "defaultReviewConceptSignals": ["p3-lower-review", "integrated-assessment"],
        "expectedSafePatternIds": P3_LOWER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {
            "monthly-1-to-2": ["bnu-primary-p3-lower-assessment-monthly-stage-integrated"],
            "monthly-1-to-3": ["bnu-primary-p3-lower-assessment-monthly-stage-integrated"],
            "monthly-1-to-4": ["bnu-primary-p3-lower-assessment-monthly-stage-integrated"],
            "monthly-3-to-4": ["bnu-primary-p3-lower-assessment-monthly-stage-integrated"],
            "monthly-5-to-6": ["bnu-primary-p3-lower-assessment-monthly-stage-integrated"],
            "monthly-review": ["bnu-primary-p3-lower-assessment-monthly-stage-integrated"],
        },
        "midtermSafePatternId": "bnu-primary-p3-lower-assessment-midterm-integrated",
        "finalSafePatternId": "bnu-primary-p3-lower-assessment-final-integrated",
    },
    "bnu-primary-p4-upper-assessments": {
        "label": "Mainland BNU P4 Upper Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p4-upper-assessments"),
        "grade": "P4",
        "semester": "upper",
        "entryIdPrefix": "bnu-primary-assessment-p4-upper",
        "logicalGroupPrefix": "bnu-p4-upper",
        "coverageScope": "BNU P4 upper unit, monthly, midterm, final, and topic-drill assessments",
        "unitSlots": P4_UPPER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "四年级上册综合",
        "defaultReviewConceptSignals": ["p4-upper-review", "integrated-assessment"],
        "expectedSafePatternIds": P4_UPPER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {
            "monthly-1-to-2": ["bnu-primary-p4-upper-assessment-monthly-1-to-2-integrated"],
            "monthly-3-to-4": ["bnu-primary-p4-upper-assessment-monthly-3-to-4-integrated"],
            "monthly-5-to-6": ["bnu-primary-p4-upper-assessment-monthly-5-to-6-integrated"],
            "monthly-review": [
                "bnu-primary-p4-upper-assessment-monthly-1-to-2-integrated",
                "bnu-primary-p4-upper-assessment-monthly-3-to-4-integrated",
                "bnu-primary-p4-upper-assessment-monthly-5-to-6-integrated",
            ],
        },
        "midtermSafePatternId": "bnu-primary-p4-upper-assessment-midterm-integrated",
        "finalSafePatternId": "bnu-primary-p4-upper-assessment-final-integrated",
        "topicDrillSafePatternId": "bnu-primary-p4-upper-assessment-final-topic-drill",
        "finalTopicDrillSafePatternId": "bnu-primary-p4-upper-assessment-final-topic-drill",
    },
    "bnu-primary-p4-lower-assessments": {
        "label": "Mainland BNU P4 Lower Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p4-lower-assessments"),
        "grade": "P4",
        "semester": "lower",
        "entryIdPrefix": "bnu-primary-assessment-p4-lower",
        "logicalGroupPrefix": "bnu-p4-lower",
        "coverageScope": "BNU P4 lower unit, midterm, final, and topic-drill assessments",
        "unitSlots": P4_LOWER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "四年级下册综合",
        "defaultReviewConceptSignals": ["p4-lower-review", "integrated-assessment"],
        "expectedSafePatternIds": P4_LOWER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {},
        "midtermSafePatternId": "bnu-primary-p4-lower-assessment-midterm-integrated",
        "finalSafePatternId": "bnu-primary-p4-lower-assessment-final-integrated",
        "topicDrillSafePatternId": "bnu-primary-p4-lower-assessment-final-topic-drill",
        "finalTopicDrillSafePatternId": "bnu-primary-p4-lower-assessment-final-topic-drill",
        "includeCurriculumReviewSignals": True,
    },
    "bnu-primary-p5-upper-assessments": {
        "label": "Mainland BNU P5 Upper Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p5-upper-assessments"),
        "grade": "P5",
        "semester": "upper",
        "entryIdPrefix": "bnu-primary-assessment-p5-upper",
        "logicalGroupPrefix": "bnu-p5-upper",
        "coverageScope": "BNU P5 upper unit, monthly, midterm, final, and topic-drill assessments",
        "unitSlots": P5_UPPER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "五年级上册综合",
        "defaultReviewConceptSignals": ["p5-upper-review", "integrated-assessment"],
        "expectedSafePatternIds": P5_UPPER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {
            "monthly-1-to-2": ["bnu-primary-p5-upper-assessment-monthly-stage-integrated"],
            "monthly-1-to-3": ["bnu-primary-p5-upper-assessment-monthly-stage-integrated"],
            "monthly-1-to-4": ["bnu-primary-p5-upper-assessment-monthly-stage-integrated"],
            "monthly-3-to-4": ["bnu-primary-p5-upper-assessment-monthly-stage-integrated"],
            "monthly-5-to-6": ["bnu-primary-p5-upper-assessment-monthly-stage-integrated"],
            "monthly-review": ["bnu-primary-p5-upper-assessment-monthly-stage-integrated"],
        },
        "midtermSafePatternId": "bnu-primary-p5-upper-assessment-midterm-integrated",
        "finalSafePatternId": "bnu-primary-p5-upper-assessment-final-integrated",
        "topicDrillSafePatternId": "bnu-primary-p5-upper-assessment-final-topic-drill",
        "finalTopicDrillSafePatternId": "bnu-primary-p5-upper-assessment-final-topic-drill",
        "quarantineLayoutVariants": True,
    },
    "bnu-primary-p5-lower-assessments": {
        "label": "Mainland BNU P5 Lower Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p5-lower-assessments"),
        "grade": "P5",
        "semester": "lower",
        "entryIdPrefix": "bnu-primary-assessment-p5-lower",
        "logicalGroupPrefix": "bnu-p5-lower",
        "coverageScope": "BNU P5 lower unit, monthly, midterm, final, and topic-drill assessments",
        "unitSlots": P5_LOWER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "五年级下册综合",
        "defaultReviewConceptSignals": ["p5-lower-review", "integrated-assessment"],
        "expectedSafePatternIds": P5_LOWER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {
            "monthly-1-to-2": ["bnu-primary-p5-lower-assessment-monthly-stage-integrated"],
            "monthly-1-to-3": ["bnu-primary-p5-lower-assessment-monthly-stage-integrated"],
            "monthly-1-to-4": ["bnu-primary-p5-lower-assessment-monthly-stage-integrated"],
            "monthly-3-to-4": ["bnu-primary-p5-lower-assessment-monthly-stage-integrated"],
            "monthly-5-to-6": ["bnu-primary-p5-lower-assessment-monthly-stage-integrated"],
            "monthly-7-to-8": ["bnu-primary-p5-lower-assessment-monthly-stage-integrated"],
            "monthly-5-to-8": ["bnu-primary-p5-lower-assessment-monthly-stage-integrated"],
            "monthly-review": ["bnu-primary-p5-lower-assessment-monthly-stage-integrated"],
        },
        "midtermSafePatternId": "bnu-primary-p5-lower-assessment-midterm-integrated",
        "finalSafePatternId": "bnu-primary-p5-lower-assessment-final-integrated",
        "topicDrillSafePatternId": "bnu-primary-p5-lower-assessment-final-topic-drill",
        "finalTopicDrillSafePatternId": "bnu-primary-p5-lower-assessment-final-topic-drill",
        "includeCurriculumReviewSignals": True,
        "quarantineLayoutVariants": True,
    },
    "bnu-primary-p6-upper-assessments": {
        "label": "Mainland BNU P6 Upper Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p6-upper-assessments"),
        "grade": "P6",
        "semester": "upper",
        "entryIdPrefix": "bnu-primary-assessment-p6-upper",
        "logicalGroupPrefix": "bnu-p6-upper",
        "coverageScope": "BNU P6 upper unit, monthly, midterm, final, and topic-drill assessments",
        "unitSlots": P6_UPPER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "六年级上册综合",
        "defaultReviewConceptSignals": ["p6-upper-review", "integrated-assessment", "primary-upper-review"],
        "expectedSafePatternIds": P6_UPPER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {
            "monthly-1-to-2": ["bnu-primary-p6-upper-assessment-monthly-stage-integrated"],
            "monthly-1-to-3": ["bnu-primary-p6-upper-assessment-monthly-stage-integrated"],
            "monthly-1-to-4": ["bnu-primary-p6-upper-assessment-monthly-stage-integrated"],
            "monthly-3-to-4": ["bnu-primary-p6-upper-assessment-monthly-stage-integrated"],
            "monthly-5-to-6": ["bnu-primary-p6-upper-assessment-monthly-stage-integrated"],
            "monthly-5-to-8": ["bnu-primary-p6-upper-assessment-monthly-stage-integrated"],
            "monthly-review": ["bnu-primary-p6-upper-assessment-monthly-stage-integrated"],
        },
        "midtermSafePatternId": "bnu-primary-p6-upper-assessment-midterm-integrated",
        "finalSafePatternId": "bnu-primary-p6-upper-assessment-final-integrated",
        "topicDrillSafePatternId": "bnu-primary-p6-upper-assessment-final-topic-drill",
        "finalTopicDrillSafePatternId": "bnu-primary-p6-upper-assessment-final-topic-drill",
        "includeCurriculumReviewSignals": True,
        "quarantineLayoutVariants": True,
    },
    "bnu-primary-p6-lower-assessments": {
        "label": "Mainland BNU P6 Lower Assessment Manifest QA",
        "outDir": Path(".local/rag/mainland-bnu-primary-p6-lower-assessments"),
        "grade": "P6",
        "semester": "lower",
        "entryIdPrefix": "bnu-primary-assessment-p6-lower",
        "logicalGroupPrefix": "bnu-p6-lower",
        "coverageScope": "BNU P6 lower unit, monthly, midterm, final, and transition/topic-drill assessments",
        "unitSlots": P6_LOWER_UNIT_SLOTS,
        "defaultReviewUnitTitle": "六年级下册综合",
        "defaultReviewConceptSignals": ["p6-lower-review", "integrated-assessment", "primary-secondary-transition"],
        "expectedSafePatternIds": P6_LOWER_EXPECTED_SAFE_PATTERN_IDS,
        "monthlySafePatternIdsByWindow": {
            "monthly-1-to-2": ["bnu-primary-p6-lower-assessment-monthly-1-to-2-integrated"],
            "monthly-3-to-4": ["bnu-primary-p6-lower-assessment-monthly-3-to-4-integrated"],
            "monthly-review": [
                "bnu-primary-p6-lower-assessment-monthly-1-to-2-integrated",
                "bnu-primary-p6-lower-assessment-monthly-3-to-4-integrated",
            ],
        },
        "midtermSafePatternId": "bnu-primary-p6-lower-assessment-midterm-integrated",
        "finalSafePatternId": "bnu-primary-p6-lower-assessment-final-integrated",
        "topicDrillSafePatternId": "bnu-primary-p6-lower-assessment-final-topic-drill",
        "finalTopicDrillSafePatternId": "bnu-primary-p6-lower-assessment-final-topic-drill",
        "includeCurriculumReviewSignals": True,
        "quarantineLayoutVariants": True,
    },
}


def target_config_for(target_id: str) -> dict[str, object]:
    if target_id not in TARGET_CONFIGS:
        valid_targets = ", ".join(sorted(TARGET_CONFIGS))
        raise ValueError(f"Unsupported target {target_id}. Valid targets: {valid_targets}")
    return TARGET_CONFIGS[target_id]


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
    candidates: list[tuple[str, str]] = [(name, "as-is")]
    for source_encoding in ["cp437", "latin1"]:
        try:
            raw = name.encode(source_encoding)
        except Exception:
            continue
        for target_encoding in ["utf-8", "gb18030", "gbk", "big5"]:
            try:
                candidates.append((raw.decode(target_encoding), f"{source_encoding}-to-{target_encoding}"))
            except Exception:
                pass

    def score(candidate: str) -> int:
        markers = ["北", "师", "大", "年级", "下册", "上册", "单元", "期中", "期末", "月考", "数学", "测"]
        cjk = sum(1 for char in candidate if "\u4e00" <= char <= "\u9fff")
        marker_score = sum(candidate.count(marker) * 8 for marker in markers)
        replacement_penalty = candidate.count("�") * 8 + candidate.count("?") * 2
        return cjk + marker_score - replacement_penalty

    return max(candidates, key=lambda item: score(item[0]))


def should_skip_entry(decoded_name: str) -> bool:
    parts = decoded_name.split("/")
    leaf = parts[-1]
    return decoded_name.endswith("/") or "__MACOSX" in parts or leaf.startswith("._") or leaf == ".DS_Store"


def entry_extension(decoded_name: str) -> str:
    lowered = decoded_name.lower()
    if lowered.endswith(".docx.wps"):
        return ".docx.wps"
    return Path(decoded_name).suffix.lower()


def normalize(value: str) -> str:
    return re.sub(r"[\s\-_/~～－—–，、。,.()[\]（）:：;；·+]+", "", value.lower())


def classification_text(decoded_name: str) -> str:
    parts = [part for part in decoded_name.split("/") if part]
    if len(parts) <= 1:
        return decoded_name
    return "/".join(parts[1:])


def contains_any(value: str, markers: list[str]) -> bool:
    normalized_value = normalize(value)
    return any(normalize(marker) in normalized_value for marker in markers)


def infer_unit(decoded_name: str, target_config: dict[str, object]) -> dict[str, object]:
    matches: list[tuple[int, dict[str, object]]] = []
    normalized_name = normalize(decoded_name)
    for slot in target_config["unitSlots"]:  # type: ignore[index]
        for marker in slot["markers"]:  # type: ignore[index]
            normalized_marker = normalize(str(marker))
            if normalized_marker in normalized_name:
                matches.append((len(normalized_marker), slot))
    if matches:
        _length, slot = max(matches, key=lambda match: match[0])
        return {
            "unitNumber": slot["unitNumber"],
            "unitSignal": slot["unitSignal"],
            "unitTitle": slot["unitTitle"],
            "conceptSignals": slot["conceptSignals"],
            "unitSafePatternId": slot["safePatternId"],
        }
    return {
        "unitNumber": None,
        "unitSignal": "integrated-review",
        "unitTitle": target_config["defaultReviewUnitTitle"],
        "conceptSignals": target_config["defaultReviewConceptSignals"],
        "unitSafePatternId": "",
    }


def infer_assessment_family(decoded_name: str) -> str:
    if contains_any(decoded_name, ["期末", "期末试卷", "期末综合", "小升初", "分班"]):
        return "final"
    if contains_any(decoded_name, ["期中", "期中试卷", "期中考试"]):
        return "midterm"
    if contains_any(decoded_name, ["月考", "第一次月考", "第二次月考", "第三次月考", "阶段"]):
        return "comprehensive"
    if contains_any(decoded_name, ["单元测试", "单元测评", "单元检测", "单元综合", "单元自测", "单元练习", "单元试卷", "单元测试卷", "测试卷"]):
        return "unit-test"
    if contains_any(decoded_name, ["专项", "易错", "拔高", "培优", "冲刺", "提升"]):
        return "topic-drill"
    return "comprehensive"


def infer_material_kind(decoded_name: str, assessment_family: str) -> str:
    if assessment_family == "final" and contains_any(decoded_name, ["专项", "题型特训", "培优", "易错", "冲刺", "提高", "提升", "拓展", "仿真", "突破", "小升初", "分班", "素养"]):
        return "topic-practice"
    if assessment_family in {"midterm", "final"}:
        return "midterm-final"
    if assessment_family == "unit-test":
        return "unit-test"
    if assessment_family == "topic-drill":
        return "topic-practice"
    if contains_any(decoded_name, ["口算", "计算"]):
        return "calculation-practice"
    return "comprehensive-assessment"


def infer_document_role(decoded_name: str) -> str:
    if contains_any(decoded_name, ["答题", "作答"]):
        return "answer-card"
    if contains_any(decoded_name, ["课件", "知识清单", "讲义"]):
        return "review-support"
    if contains_any(decoded_name, ["答案", "解析", "教师", "参考"]):
        return "response-support"
    return "student-assessment"


def infer_variant_role(decoded_name: str, document_role: str) -> str:
    if document_role != "student-assessment":
        return document_role
    if contains_any(decoded_name, ["A3", "Ａ３"]):
        return "student-a3"
    if contains_any(decoded_name, ["A4", "Ａ４"]):
        return "student-a4"
    if contains_any(decoded_name, ["考试版", "试题"]):
        return "student-form"
    return "student-general"


def infer_assessment_window(decoded_name: str, assessment_family: str) -> str:
    if assessment_family == "midterm":
        return "midterm"
    if assessment_family == "final":
        return "final"
    if contains_any(decoded_name, ["月考", "阶段"]):
        if contains_any(decoded_name, ["1-2", "1至2", "1到2", "一二", "第一二", "第一次", "第1次", "第一回"]):
            return "monthly-1-to-2"
        if contains_any(decoded_name, ["1-3", "1至3", "1到3", "一三", "第一三"]):
            return "monthly-1-to-3"
        if contains_any(decoded_name, ["1-4", "1至4", "1到4", "一四", "第一四"]):
            return "monthly-1-to-4"
        if contains_any(decoded_name, ["3-4", "3至4", "3到4", "三四", "第三四", "第二次", "第2次", "第二回"]):
            return "monthly-3-to-4"
        if contains_any(decoded_name, ["5-6", "5至6", "5到6", "五六", "第五六", "第三次", "第3次", "第三回"]):
            return "monthly-5-to-6"
        if contains_any(decoded_name, ["7-8", "7至8", "7到8", "七八", "第七八", "第四次", "第4次", "第四回"]):
            return "monthly-7-to-8"
        if contains_any(decoded_name, ["5-8", "5至8", "5到8", "五八", "第五八"]):
            return "monthly-5-to-8"
        return "monthly-review"
    if assessment_family == "unit-test":
        return "unit-test"
    return "integrated-review"


def legacy_reference_only(decoded_name: str) -> bool:
    return contains_any(decoded_name, ["老课标", "可先参考", "旧版", "旧内容"])


def curriculum_version_review_only(decoded_name: str) -> bool:
    return contains_any(decoded_name, ["新课标", "新教材", "2026版", "2026"])


def local_only_quarantine_reason(
    extension: str,
    document_role: str,
    variant_role: str,
    legacy_only: bool,
    curriculum_review_only: bool,
    quarantine_layout_variants: bool,
) -> str:
    if legacy_only:
        return "legacy-reference-only"
    if curriculum_review_only:
        return "curriculum-version-review"
    if extension == ".pptx":
        return "presentation-support"
    if extension == ".doc":
        return "legacy-document-format"
    if extension == ".docx.wps":
        return "wps-wrapper-format"
    if quarantine_layout_variants and variant_role in {"student-a3", "student-a4"}:
        return "layout-variant-only"
    if document_role == "review-support":
        return "review-support"
    if document_role == "response-support":
        return "response-support"
    if document_role == "answer-card":
        return "answer-card-support"
    return "none"


def safe_pattern_signals(classification: dict[str, object], target_config: dict[str, object]) -> list[str]:
    signals: set[str] = set()
    family = str(classification["assessmentFamily"])
    window = str(classification["assessmentWindow"])
    unit_pattern_id = str(classification.get("unitSafePatternId") or "")
    monthly_map = target_config["monthlySafePatternIdsByWindow"]  # type: ignore[index]

    if unit_pattern_id:
        signals.add(unit_pattern_id)
    for pattern_id in monthly_map.get(window, []):  # type: ignore[union-attr]
        signals.add(str(pattern_id))
    if family == "topic-drill" and target_config.get("topicDrillSafePatternId"):
        signals.add(str(target_config["topicDrillSafePatternId"]))
    if family == "midterm":
        midterm_pattern_id = str(target_config["midtermSafePatternId"])
        if midterm_pattern_id:
            signals.add(midterm_pattern_id)
    if family == "final":
        final_pattern_id = str(target_config["finalSafePatternId"])
        if final_pattern_id:
            signals.add(final_pattern_id)
        if classification.get("materialKind") == "topic-practice" and target_config.get("finalTopicDrillSafePatternId"):
            signals.add(str(target_config["finalTopicDrillSafePatternId"]))
    return sorted(signals)


def classify_entry(decoded_name: str, extension: str, target_config: dict[str, object]) -> dict[str, object]:
    searchable_name = classification_text(decoded_name)
    assessment_family = infer_assessment_family(searchable_name)
    unit = infer_unit(searchable_name, target_config)
    document_role = infer_document_role(searchable_name)
    variant_role = infer_variant_role(searchable_name, document_role)
    legacy_only = legacy_reference_only(searchable_name)
    curriculum_review_only = curriculum_version_review_only(searchable_name)
    quarantine_reason = local_only_quarantine_reason(
        extension,
        document_role,
        variant_role,
        legacy_only,
        curriculum_review_only,
        bool(target_config.get("quarantineLayoutVariants")),
    )
    classification = {
        "publisher": "MAINLAND_BNU",
        "stage": "primary",
        "grade": target_config["grade"],
        "semester": target_config["semester"],
        "extension": extension,
        "materialKind": infer_material_kind(searchable_name, assessment_family),
        "assessmentFamily": assessment_family,
        "assessmentWindow": infer_assessment_window(searchable_name, assessment_family),
        "documentRole": document_role,
        "variantRole": variant_role,
        "legacyReferenceOnly": legacy_only,
        "curriculumVersionReviewOnly": curriculum_review_only,
        "localOnlyQuarantine": quarantine_reason != "none",
        "localOnlyQuarantineReason": quarantine_reason,
        **unit,
    }
    classification["currentScopeEvidence"] = (
        not classification["localOnlyQuarantine"] and document_role == "student-assessment"
    )
    classification["safePatternSignals"] = safe_pattern_signals(classification, target_config)
    group_seed = "|".join([
        str(classification["grade"]),
        str(classification["semester"]),
        str(classification["assessmentFamily"]),
        str(classification["assessmentWindow"]),
        str(classification["unitSignal"]),
    ])
    classification["logicalGroupId"] = (
        f"{target_config['logicalGroupPrefix']}-{hashlib.sha256(group_seed.encode('utf-8')).hexdigest()[:12]}"
    )
    return classification


def archive_record(path: Path, index: int, target_config: dict[str, object]) -> dict[str, object]:
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"ZIP archive not found: {resolved}")
    if resolved.suffix.lower() != ".zip":
        raise ValueError(f"Expected a ZIP archive: {resolved}")
    digest = sha256_for_path(resolved)
    return {
        "archiveIndex": index,
        "archiveId": f"bnu-primary-assessment-archive-{digest[:12]}",
        "archiveSha256": digest,
        "sizeBytes": resolved.stat().st_size,
        "scopeGrade": target_config["grade"],
        "scopeSemester": target_config["semester"],
    }


def manifest_entries_for_archive(
    zip_path: Path,
    archive_meta: dict[str, object],
    target_config: dict[str, object],
) -> list[dict[str, object]]:
    resolved = zip_path.expanduser().resolve()
    entries: list[dict[str, object]] = []

    with ZipFile(resolved) as archive:
        for entry_index, info in enumerate(archive.infolist(), start=1):
            decoded_name, _decoded_name_status = decode_zip_name(info.filename)
            if should_skip_entry(decoded_name):
                continue
            extension = entry_extension(decoded_name)
            if extension not in {".doc", ".docx", ".docx.wps", ".pdf", ".pptx"}:
                continue
            file_hash = sha256_for_member(archive, info.filename)
            classification = classify_entry(decoded_name, extension, target_config)
            entries.append({
                "id": f"{target_config['entryIdPrefix']}-{file_hash[:12]}",
                "archiveId": archive_meta["archiveId"],
                "entryIndex": entry_index,
                "memberSha256": file_hash,
                "sizeBytes": info.file_size,
                "compressedBytes": info.compress_size,
                "retentionPolicy": "metadata-only-local",
                "bodyTextPersisted": False,
                "ocrTextPersisted": False,
                "pageImagesPersisted": False,
                "sourceLocatorsPersisted": False,
                "archiveMemberLabelsPersisted": False,
                "originalNamesPersisted": False,
                "embeddingPayloadsPersisted": False,
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


def coverage(entries: list[dict[str, object]], target_config: dict[str, object]) -> dict[str, object]:
    current_entries = [entry for entry in entries if entry.get("currentScopeEvidence")]
    if target_config.get("includeCurriculumReviewSignals"):
        signal_entries = [entry for entry in entries if not entry.get("legacyReferenceOnly")]
    else:
        signal_entries = [
            entry
            for entry in entries
            if not entry.get("legacyReferenceOnly") and not entry.get("curriculumVersionReviewOnly")
        ]
    expected_safe_patterns = list(target_config["expectedSafePatternIds"])  # type: ignore[arg-type]
    observed_safe_patterns = sorted({
        signal
        for entry in signal_entries
        for signal in entry.get("safePatternSignals", [])
    })
    missing_safe_patterns = [signal for signal in expected_safe_patterns if signal not in observed_safe_patterns]
    observed_unit_signals = sorted({
        str(entry["unitSignal"])
        for entry in signal_entries
        if entry.get("unitSignal") != "integrated-review"
    })
    observed_windows = sorted({str(entry["assessmentWindow"]) for entry in signal_entries})
    return {
        "scope": f"{target_config['coverageScope']} metadata only",
        "expectedSafePatternIds": expected_safe_patterns,
        "observedSafePatternIds": observed_safe_patterns,
        "missingSafePatternIds": missing_safe_patterns,
        "completeExpectedSafePatterns": len(missing_safe_patterns) == 0,
        "observedUnitSignals": observed_unit_signals,
        "observedAssessmentWindows": observed_windows,
        "legacyReferenceEntries": sum(1 for entry in entries if entry.get("legacyReferenceOnly")),
        "curriculumVersionReviewEntries": sum(1 for entry in entries if entry.get("curriculumVersionReviewOnly")),
        "localOnlyQuarantineEntries": sum(1 for entry in entries if entry.get("localOnlyQuarantine")),
        "currentScopeEvidenceEntries": len(current_entries),
    }


def build_manifest(zip_paths: list[Path], target_id: str = DEFAULT_TARGET) -> dict[str, object]:
    target_config = target_config_for(target_id)
    archive_records = [archive_record(path, index, target_config) for index, path in enumerate(zip_paths, start=1)]
    entries: list[dict[str, object]] = []
    for zip_path, archive_meta in zip(zip_paths, archive_records):
        entries.extend(manifest_entries_for_archive(zip_path, archive_meta, target_config))

    groups = duplicate_groups(entries)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "target": target_id,
        "targetLabel": target_config["label"],
        "publisher": "MAINLAND_BNU",
        "stage": "primary",
        "artifactKind": "metadata-only-primary-assessment-archive-manifest",
        "coverageScope": target_config["coverageScope"],
        "safetyNote": SAFETY_NOTE,
        "archives": archive_records,
        "coverage": coverage(entries, target_config),
        "totals": {
            "archives": len(archive_records),
            "entries": len(entries),
            "bytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "extensions": count_by(entries, "extension"),
            "documentRoles": count_by(entries, "documentRole"),
            "variantRoles": count_by(entries, "variantRole"),
            "materialKinds": count_by(entries, "materialKind"),
            "assessmentFamilies": count_by(entries, "assessmentFamily"),
            "assessmentWindows": count_by(entries, "assessmentWindow"),
            "legacyReferenceOnly": count_boolean(entries, "legacyReferenceOnly"),
            "localOnlyQuarantine": count_boolean(entries, "localOnlyQuarantine"),
            "localOnlyQuarantineReasons": count_by(entries, "localOnlyQuarantineReason"),
            "currentScopeEvidence": count_boolean(entries, "currentScopeEvidence"),
            "safePatternSignals": count_list_values(entries, "safePatternSignals"),
            "duplicateGroups": len(groups),
        },
        "duplicateGroups": groups,
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
        f"- Coverage scope: {manifest['coverageScope']}",
        f"- Archives inspected: {totals['archives']}",
        f"- Metadata entries: {totals['entries']}",
        f"- Extension counts: {json.dumps(totals['extensions'], ensure_ascii=False)}",
        f"- Document role counts: {json.dumps(totals['documentRoles'], ensure_ascii=False)}",
        f"- Material kind counts: {json.dumps(totals['materialKinds'], ensure_ascii=False)}",
        f"- Assessment family counts: {json.dumps(totals['assessmentFamilies'], ensure_ascii=False)}",
        f"- Assessment window counts: {json.dumps(totals['assessmentWindows'], ensure_ascii=False)}",
        f"- Local-only quarantine counts: {json.dumps(totals['localOnlyQuarantine'], ensure_ascii=False)}",
        f"- Local-only quarantine reason counts: {json.dumps(totals['localOnlyQuarantineReasons'], ensure_ascii=False)}",
        f"- Legacy-reference entries: {coverage_info['legacyReferenceEntries']}",
        f"- Curriculum-version review entries: {coverage_info['curriculumVersionReviewEntries']}",
        f"- Current-scope evidence entries: {coverage_info['currentScopeEvidenceEntries']}",
        f"- Complete expected safe-pattern signals: {coverage_info['completeExpectedSafePatterns']}",
        f"- Missing expected safe-pattern signals: {json.dumps(coverage_info['missingSafePatternIds'], ensure_ascii=False)}",
        f"- Duplicate logical groups: {totals['duplicateGroups']}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: manifest entries contain archive/member hashes, sizes, coarse role and assessment classifications, safe pattern signals, quarantine status, and aggregate duplicate groups only.",
        "- Passed: private locators, archive labels, original labels, document body text, source item wording, response-key text, worked-solution text, tables, figures, page content, page images, OCR output, page-location data, and vector payloads are not extracted or persisted.",
        "- Required before student-facing production use: S18 source-distance review of safe abstraction cards and any generated output.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest), encoding="utf-8")


def assert_no_source_leak(serialized: str, report: str, tmp_dir: Path) -> None:
    quoted = lambda *parts: f"\"{''.join(parts)}\""
    for forbidden in [
        quoted("source", "Path"),
        quoted("source", "ArchiveName"),
        quoted("entry", "Path"),
        quoted("file", "Name"),
        str(tmp_dir),
        "unit/",
        "term/",
        BODY_SENTINEL,
        "body sample",
    ]:
        assert forbidden not in serialized
        assert forbidden not in report


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        upper_unit_zip = tmp_dir / "upper-unit.zip"
        upper_term_zip = tmp_dir / "upper-term.zip"
        with ZipFile(upper_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 生活中的数 测评 A4.docx", f"{BODY_SENTINEL} body sample".encode("utf-8"))
            archive.writestr("unit/第二单元 5以内数加与减 解析.docx", b"fake response support")
            archive.writestr("unit/第二单元 5以内数加与减 测评.docx", b"fake within five")
            archive.writestr("unit/第三单元 整理与分类 测评.docx", b"fake classification")
            archive.writestr("unit/第四单元 10以内数加与减 答题材料.docx", b"fake response form")
            archive.writestr("unit/第四单元 10以内数加与减 测评.docx", b"fake within ten")
            archive.writestr("unit/第五单元 有趣的立体图形 测评.docx", b"fake shape")
            archive.writestr("unit/老课标内容 可先参考.doc", b"fake legacy")
        with ZipFile(upper_term_zip, "w") as archive:
            archive.writestr("term/第一次月考 1-2单元 学生卷.docx", b"fake monthly")
            archive.writestr("term/期中综合 学生卷.docx", b"fake midterm")
            archive.writestr("term/期末综合 学生卷.docx", b"fake final")
            archive.writestr("term/期末综合 参考材料.docx", b"fake response support")

        upper_manifest = build_manifest([upper_unit_zip, upper_term_zip], DEFAULT_TARGET)
        upper_json = json.dumps(upper_manifest, ensure_ascii=False)
        upper_report = qa_report(upper_manifest)
        assert upper_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert upper_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert upper_manifest["coverage"]["legacyReferenceEntries"] == 1  # type: ignore[index]
        assert upper_manifest["totals"]["documentRoles"]["student-assessment"] >= 8  # type: ignore[index]
        assert upper_manifest["totals"]["documentRoles"]["response-support"] >= 1  # type: ignore[index]
        assert_no_source_leak(upper_json, upper_report, tmp_dir)

        lower_unit_zip = tmp_dir / "lower-unit.zip"
        lower_term_zip = tmp_dir / "lower-term.zip"
        with ZipFile(lower_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 20以内数与加法 单元测评.docx", b"fake lower addition")
            archive.writestr("unit/第二单元 图形大变身（一） 单元测评.docx", b"fake lower shape transformation")
            archive.writestr("unit/第三单元 20以内数与减法 单元测评.docx", b"fake lower subtraction")
            archive.writestr("unit/第四单元 100以内数的认识 单元测评.docx", b"fake lower number sense")
            archive.writestr("unit/第五单元 100以内数加与减（一） 单元测评.docx", b"fake lower place value calculation")
            archive.writestr("unit/第六单元 有趣的平面图形（一） 单元测评.docx", b"fake lower plane shapes")
            archive.writestr("unit/第一单元 20以内数与加法 参考材料.docx", b"fake response support")
            archive.writestr("unit/老课标内容 可先参考.doc", b"fake legacy")
        with ZipFile(lower_term_zip, "w") as archive:
            archive.writestr("term/第一次月考 1-2单元 学生卷.docx", b"fake lower first monthly")
            archive.writestr("term/第三次月考 5-6单元 学生卷.docx", b"fake lower third monthly")
            archive.writestr("term/期中综合 学生卷.docx", b"fake lower midterm")
            archive.writestr("term/期末综合 学生卷.docx", b"fake lower final")
            archive.writestr("term/期末综合 参考材料.docx", b"fake lower response support")

        lower_manifest = build_manifest([lower_unit_zip, lower_term_zip], "bnu-primary-p1-lower-assessments")
        lower_json = json.dumps(lower_manifest, ensure_ascii=False)
        lower_report = qa_report(lower_manifest)
        assert lower_manifest["target"] == "bnu-primary-p1-lower-assessments"
        assert lower_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert lower_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert lower_manifest["coverage"]["legacyReferenceEntries"] == 1  # type: ignore[index]
        assert lower_manifest["coverage"]["currentScopeEvidenceEntries"] == 10  # type: ignore[index]
        assert lower_manifest["totals"]["localOnlyQuarantineReasons"]["response-support"] == 2  # type: ignore[index]
        assert lower_manifest["totals"]["localOnlyQuarantineReasons"]["legacy-reference-only"] == 1  # type: ignore[index]
        assert "monthly-1-to-2" in lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "monthly-5-to-6" in lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert_no_source_leak(lower_json, lower_report, tmp_dir)

        p2_upper_unit_zip = tmp_dir / "p2-upper-unit.zip"
        p2_upper_term_zip = tmp_dir / "p2-upper-term.zip"
        with ZipFile(p2_upper_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 100以内加与减 单元测试 A4.docx", b"fake p2 add subtract")
            archive.writestr("unit/第二单元 测量（一） 单元测试 A4.docx", b"fake p2 measurement")
            archive.writestr("unit/第三单元 数一数与乘法 单元测试 A4.docx", b"fake p2 multiplication meaning")
            archive.writestr("unit/第四单元 乘法口诀（一） 单元测试 A4.docx", b"fake p2 facts one")
            archive.writestr("unit/第五单元 分一分与除法 单元测试 A4.docx", b"fake p2 division")
            archive.writestr("unit/第六单元 图形的运动（一） 单元测试 A4.docx", b"fake p2 shape motion")
            archive.writestr("unit/第七单元 乘法口诀（二） 单元测试 A4.docx", b"fake p2 facts two")
            archive.writestr("unit/第八单元 乘除法的应用（一） 单元测试 A4.docx", b"fake p2 application")
            archive.writestr("unit/第八单元 乘除法的应用（一） 参考解析.docx", b"fake p2 response support")
            archive.writestr("unit/老课标内容 可先参考.doc", b"fake p2 legacy")
        with ZipFile(p2_upper_term_zip, "w") as archive:
            archive.writestr("term/月考 1-2单元 学生卷.doc", b"fake p2 monthly legacy document format")
            archive.writestr("term/期中综合 学生卷.docx", b"fake p2 midterm")
            archive.writestr("term/期末综合 学生卷.docx", b"fake p2 final")
            archive.writestr("term/期末综合 " + "答" + "题卡.docx", b"fake p2 answer card")

        p2_upper_manifest = build_manifest([p2_upper_unit_zip, p2_upper_term_zip], "bnu-primary-p2-upper-assessments")
        p2_upper_json = json.dumps(p2_upper_manifest, ensure_ascii=False)
        p2_upper_report = qa_report(p2_upper_manifest)
        assert p2_upper_manifest["target"] == "bnu-primary-p2-upper-assessments"
        assert p2_upper_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert p2_upper_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert p2_upper_manifest["coverage"]["legacyReferenceEntries"] == 1  # type: ignore[index]
        assert p2_upper_manifest["coverage"]["currentScopeEvidenceEntries"] == 10  # type: ignore[index]
        assert p2_upper_manifest["totals"]["localOnlyQuarantineReasons"]["legacy-document-format"] == 1  # type: ignore[index]
        assert "monthly-1-to-2" in p2_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "bnu-primary-p2-upper-assessment-monthly-1-to-2-integrated" in p2_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert_no_source_leak(p2_upper_json, p2_upper_report, tmp_dir)

        p2_lower_unit_zip = tmp_dir / "p2-lower-unit.zip"
        p2_lower_term_zip = tmp_dir / "p2-lower-term.zip"
        with ZipFile(p2_lower_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 除法 单元测试 A4.docx", b"fake p2 lower division")
            archive.writestr("unit/第二单元 方向与位置 单元测试 A4.docx", b"fake p2 lower position")
            archive.writestr("unit/第三单元 生活中的大数 单元测试 A4.docx", b"fake p2 lower large numbers")
            archive.writestr("unit/第四单元 测量 单元测试 A4.docx", b"fake p2 lower measurement")
            archive.writestr("unit/第五单元 加与减 单元测试 A4.docx", b"fake p2 lower calculation")
            archive.writestr("unit/第六单元 认识图形 单元测试 A4.docx", b"fake p2 lower shapes")
            archive.writestr("unit/第七单元 时、分、秒 单元测试 A4.docx", b"fake p2 lower time")
            archive.writestr("unit/第八单元 调查与记录 单元测试 A4.docx", b"fake p2 lower data")
            archive.writestr("unit/第八单元 调查与记录 参考解析.docx", b"fake p2 lower response support")
            archive.writestr("unit/第二单元 方向与位置 " + "答" + "题卡.docx", b"fake p2 lower answer card")
            archive.writestr("unit/老课标内容 可先参考.doc", b"fake p2 lower legacy")
        with ZipFile(p2_lower_term_zip, "w") as archive:
            archive.writestr("term/月考 1-4单元 学生卷.docx", b"fake p2 lower monthly first")
            archive.writestr("term/阶段测评 5-8单元 学生卷.docx", b"fake p2 lower monthly second")
            archive.writestr("term/期中综合 学生卷.docx", b"fake p2 lower midterm")
            archive.writestr("term/期末综合 学生卷.docx", b"fake p2 lower final")
            archive.writestr("term/期末综合 答案解析.docx", b"fake p2 lower response support")
            archive.writestr("term/月考 1-4单元 学生卷.doc", b"fake p2 lower legacy document format")

        p2_lower_manifest = build_manifest([p2_lower_unit_zip, p2_lower_term_zip], "bnu-primary-p2-lower-assessments")
        p2_lower_json = json.dumps(p2_lower_manifest, ensure_ascii=False)
        p2_lower_report = qa_report(p2_lower_manifest)
        assert p2_lower_manifest["target"] == "bnu-primary-p2-lower-assessments"
        assert p2_lower_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert p2_lower_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert p2_lower_manifest["coverage"]["legacyReferenceEntries"] == 1  # type: ignore[index]
        assert p2_lower_manifest["coverage"]["currentScopeEvidenceEntries"] == 12  # type: ignore[index]
        assert p2_lower_manifest["totals"]["localOnlyQuarantineReasons"]["response-support"] == 2  # type: ignore[index]
        assert p2_lower_manifest["totals"]["localOnlyQuarantineReasons"]["answer-card-support"] == 1  # type: ignore[index]
        assert p2_lower_manifest["totals"]["localOnlyQuarantineReasons"]["legacy-reference-only"] == 1  # type: ignore[index]
        assert p2_lower_manifest["totals"]["localOnlyQuarantineReasons"]["legacy-document-format"] == 1  # type: ignore[index]
        assert "monthly-1-to-4" in p2_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "monthly-5-to-8" in p2_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "bnu-primary-p2-lower-assessment-monthly-stage-integrated" in p2_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert_no_source_leak(p2_lower_json, p2_lower_report, tmp_dir)

        p3_upper_unit_zip = tmp_dir / "p3-upper-unit.zip"
        p3_upper_final_zip = tmp_dir / "p3-upper-final.zip"
        with ZipFile(p3_upper_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 混合运算 单元测试 A4.docx", b"fake p3 mixed operations")
            archive.writestr("unit/第二单元 测量（二） 单元测试 A4.docx", b"fake p3 measurement")
            archive.writestr("unit/第三单元 大数加与减（二） 单元测试 A4.docx", b"fake p3 large number calculation")
            archive.writestr("unit/第四单元 我们生活中的空间（一） 单元测试 A4.docx", b"fake p3 space")
            archive.writestr("unit/第五单元 认识图形 单元测试 A4.docx", b"fake p3 shapes")
            archive.writestr("unit/第六单元 乘除法的应用（二） 单元测试 A4.docx", b"fake p3 multiplication division application")
            archive.writestr("unit/第七单元 认识小数 单元测试 A4.docx", b"fake p3 decimals")
            archive.writestr("unit/第八单元 调查与记录 单元测试 A4.docx", b"fake p3 data")
            archive.writestr("unit/第八单元 调查与记录 参考解析.docx", b"fake p3 response support")
        with ZipFile(p3_upper_final_zip, "w") as archive:
            archive.writestr("term/期末题型特训 三年级上册 填空题 学生卷.docx", b"fake p3 final topic drill")
            archive.writestr("term/期末专项复习卷 数与代数 学生卷.docx", b"fake p3 final topic practice")
            archive.writestr("term/第1-5单元解决问题专项集训 学生卷.docx", b"fake p3 topic drill")
            archive.writestr("term/期末综合 参考解析.docx", b"fake p3 final response support")

        p3_upper_manifest = build_manifest(
            [p3_upper_unit_zip, p3_upper_final_zip],
            "bnu-primary-p3-upper-assessments",
        )
        p3_upper_json = json.dumps(p3_upper_manifest, ensure_ascii=False)
        p3_upper_report = qa_report(p3_upper_manifest)
        assert p3_upper_manifest["target"] == "bnu-primary-p3-upper-assessments"
        assert p3_upper_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert p3_upper_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert p3_upper_manifest["coverage"]["currentScopeEvidenceEntries"] == 11  # type: ignore[index]
        assert p3_upper_manifest["totals"]["documentRoles"]["response-support"] == 2  # type: ignore[index]
        assert p3_upper_manifest["totals"]["materialKinds"]["topic-practice"] >= 3  # type: ignore[index]
        assert "final" in p3_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "midterm" not in p3_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "bnu-primary-p3-upper-assessment-final-topic-drill" in p3_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p3-upper-assessment-final-integrated" in p3_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert_no_source_leak(p3_upper_json, p3_upper_report, tmp_dir)

        p3_lower_unit_zip = tmp_dir / "p3-lower-unit.zip"
        p3_lower_term_zip = tmp_dir / "p3-lower-term.zip"
        with ZipFile(p3_lower_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 除法 单元测试 A4.docx", b"fake p3 lower division")
            archive.writestr("unit/第二单元 图形的运动 单元测试 A4.docx", b"fake p3 lower shape motion")
            archive.writestr("unit/第三单元 乘法 单元测试 A4.docx", b"fake p3 lower multiplication")
            archive.writestr("unit/第四单元 千克、克、吨 单元测试 A4.docx", b"fake p3 lower mass")
            archive.writestr("unit/第五单元 面积 单元测试 A4.docx", b"fake p3 lower area")
            archive.writestr("unit/第六单元 认识分数 单元测试 A4.docx", b"fake p3 lower fractions")
            archive.writestr("unit/第七单元 数据的整理和表示 单元测试 A4.docx", b"fake p3 lower data")
            archive.writestr("unit/第七单元 数据的整理和表示 参考解析.docx", b"fake p3 lower response support")
            archive.writestr("unit/2026版 新教材 第一单元 整数乘法（一） 单元测试 A4.docx", b"fake curriculum review only")
        with ZipFile(p3_lower_term_zip, "w") as archive:
            archive.writestr("term/月考 1-3单元 学生卷.docx", b"fake p3 lower monthly")
            archive.writestr("term/期中综合 学生卷.docx", b"fake p3 lower midterm")
            archive.writestr("term/期末综合 学生卷.docx", b"fake p3 lower final")
            archive.writestr("term/期末综合 参考解析.docx", b"fake p3 lower final response")
            archive.writestr("term/期末综合 " + "答" + "题卡.docx", b"fake p3 lower answer card")

        p3_lower_manifest = build_manifest(
            [p3_lower_unit_zip, p3_lower_term_zip],
            "bnu-primary-p3-lower-assessments",
        )
        p3_lower_json = json.dumps(p3_lower_manifest, ensure_ascii=False)
        p3_lower_report = qa_report(p3_lower_manifest)
        assert p3_lower_manifest["target"] == "bnu-primary-p3-lower-assessments"
        assert p3_lower_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert p3_lower_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert p3_lower_manifest["coverage"]["currentScopeEvidenceEntries"] == 10  # type: ignore[index]
        assert p3_lower_manifest["coverage"]["curriculumVersionReviewEntries"] == 1  # type: ignore[index]
        assert p3_lower_manifest["totals"]["localOnlyQuarantineReasons"]["response-support"] == 2  # type: ignore[index]
        assert p3_lower_manifest["totals"]["localOnlyQuarantineReasons"]["answer-card-support"] == 1  # type: ignore[index]
        assert p3_lower_manifest["totals"]["localOnlyQuarantineReasons"]["curriculum-version-review"] == 1  # type: ignore[index]
        assert "monthly-1-to-3" in p3_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "bnu-primary-p3-lower-assessment-monthly-stage-integrated" in p3_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p3-lower-assessment-midterm-integrated" in p3_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p3-lower-assessment-final-integrated" in p3_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert_no_source_leak(p3_lower_json, p3_lower_report, tmp_dir)

        p4_upper_unit_zip = tmp_dir / "p4-upper-unit.zip"
        p4_upper_term_zip = tmp_dir / "p4-upper-term.zip"
        with ZipFile(p4_upper_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 认识更大的数 单元测试 A4.docx", b"fake p4 upper large numbers")
            archive.writestr("unit/第二单元 线与角 单元测试 A4.docx", b"fake p4 upper lines angles")
            archive.writestr("unit/第三单元 乘法 单元测试 A4.docx", b"fake p4 upper multiplication")
            archive.writestr("unit/第四单元 运算律 单元测试 A4.docx", b"fake p4 upper operation laws")
            archive.writestr("unit/第五单元 方向与位置 单元测试 A4.docx", b"fake p4 upper direction position")
            archive.writestr("unit/第六单元 除法 单元测试 A4.docx", b"fake p4 upper division")
            archive.writestr("unit/第七单元 生活中的负数 单元测试 A4.docx", b"fake p4 upper negative numbers")
            archive.writestr("unit/第八单元 可能性 单元测试 A4.docx", b"fake p4 upper probability")
            archive.writestr("unit/第八单元 可能性 参考解析.docx", b"fake p4 upper response support")
            archive.writestr("unit/第一单元 认识更大的数 单元测试.doc", b"fake p4 upper legacy document format")
        with ZipFile(p4_upper_term_zip, "w") as archive:
            archive.writestr("term/第一次月考 学生卷.docx", b"fake p4 upper first monthly")
            archive.writestr("term/第二次月考 学生卷.docx", b"fake p4 upper second monthly")
            archive.writestr("term/第三次月考 学生卷.docx", b"fake p4 upper third monthly")
            archive.writestr("term/期中综合 学生卷.docx", b"fake p4 upper midterm")
            archive.writestr("term/期末综合 学生卷.docx", b"fake p4 upper final")
            archive.writestr("term/期末专项训练 素养提升 学生卷.docx", b"fake p4 upper final topic drill")
            archive.writestr("term/期末综合 " + "答" + "题卡.docx", b"fake p4 upper answer card")
            archive.writestr("term/2026版 期末素养测评 学生卷.docx", b"fake p4 upper curriculum review")

        p4_upper_manifest = build_manifest(
            [p4_upper_unit_zip, p4_upper_term_zip],
            "bnu-primary-p4-upper-assessments",
        )
        p4_upper_json = json.dumps(p4_upper_manifest, ensure_ascii=False)
        p4_upper_report = qa_report(p4_upper_manifest)
        assert p4_upper_manifest["target"] == "bnu-primary-p4-upper-assessments"
        assert p4_upper_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert p4_upper_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert p4_upper_manifest["coverage"]["currentScopeEvidenceEntries"] == 14  # type: ignore[index]
        assert p4_upper_manifest["coverage"]["curriculumVersionReviewEntries"] == 1  # type: ignore[index]
        assert p4_upper_manifest["totals"]["localOnlyQuarantineReasons"]["legacy-document-format"] == 1  # type: ignore[index]
        assert p4_upper_manifest["totals"]["localOnlyQuarantineReasons"]["response-support"] == 1  # type: ignore[index]
        assert p4_upper_manifest["totals"]["localOnlyQuarantineReasons"]["answer-card-support"] == 1  # type: ignore[index]
        assert p4_upper_manifest["totals"]["localOnlyQuarantineReasons"]["curriculum-version-review"] == 1  # type: ignore[index]
        assert "monthly-1-to-2" in p4_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "monthly-3-to-4" in p4_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "monthly-5-to-6" in p4_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "bnu-primary-p4-upper-assessment-monthly-1-to-2-integrated" in p4_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p4-upper-assessment-monthly-3-to-4-integrated" in p4_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p4-upper-assessment-monthly-5-to-6-integrated" in p4_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p4-upper-assessment-midterm-integrated" in p4_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p4-upper-assessment-final-integrated" in p4_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p4-upper-assessment-final-topic-drill" in p4_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert_no_source_leak(p4_upper_json, p4_upper_report, tmp_dir)

        p4_lower_unit_zip = tmp_dir / "p4-lower-unit.zip"
        p4_lower_term_zip = tmp_dir / "p4-lower-term.zip"
        with ZipFile(p4_lower_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 小数的意义和加减法 单元测试 A4.docx", b"fake p4 lower decimal meaning")
            archive.writestr("unit/第二单元 认识三角形和四边形 单元测试 A4.docx", b"fake p4 lower geometry")
            archive.writestr("unit/第三单元 小数乘法 单元测试 A4.docx", b"fake p4 lower decimal multiplication")
            archive.writestr("unit/第四单元 观察物体 单元测试 A4.docx", b"fake p4 lower observing objects")
            archive.writestr("unit/第五单元 认识方程 单元测试 A4.docx", b"fake p4 lower equations")
            archive.writestr("unit/第六单元 数据的表示和分析 单元测试 A4.docx", b"fake p4 lower data")
            archive.writestr("unit/第六单元 数据的表示和分析 参考解析.docx", b"fake p4 lower response support")
            archive.writestr("unit/第一单元 小数的意义和加减法 复习课件.pptx", b"fake p4 lower presentation support")
        with ZipFile(p4_lower_term_zip, "w") as archive:
            archive.writestr("term/期中总复习/2026版/专题01 小数的意义 学生卷.docx", b"fake p4 lower midterm curriculum review")
            archive.writestr("term/期中总复习/2026版/第二单元 认识三角形和四边形 期中复习课件.pptx", b"fake p4 lower midterm slides")
            archive.writestr("term/期末综合 学生卷.docx", b"fake p4 lower final")
            archive.writestr("term/期末专项训练 数学好玩 学生卷.docx", b"fake p4 lower final topic drill")
            archive.writestr("term/期末综合 参考解析.docx", b"fake p4 lower final response")
            archive.writestr("term/2026版 专题08 方程的认识及解方程 解析.docx", b"fake p4 lower final response curriculum review")

        p4_lower_manifest = build_manifest(
            [p4_lower_unit_zip, p4_lower_term_zip],
            "bnu-primary-p4-lower-assessments",
        )
        p4_lower_json = json.dumps(p4_lower_manifest, ensure_ascii=False)
        p4_lower_report = qa_report(p4_lower_manifest)
        assert p4_lower_manifest["target"] == "bnu-primary-p4-lower-assessments"
        assert p4_lower_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert p4_lower_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert p4_lower_manifest["coverage"]["currentScopeEvidenceEntries"] == 8  # type: ignore[index]
        assert p4_lower_manifest["coverage"]["curriculumVersionReviewEntries"] == 3  # type: ignore[index]
        assert p4_lower_manifest["totals"]["extensions"][".pptx"] == 2  # type: ignore[index]
        assert p4_lower_manifest["totals"]["localOnlyQuarantineReasons"]["presentation-support"] == 1  # type: ignore[index]
        assert p4_lower_manifest["totals"]["localOnlyQuarantineReasons"]["response-support"] == 2  # type: ignore[index]
        assert p4_lower_manifest["totals"]["localOnlyQuarantineReasons"]["curriculum-version-review"] == 3  # type: ignore[index]
        assert "midterm" in p4_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "final" in p4_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "bnu-primary-p4-lower-assessment-midterm-integrated" in p4_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p4-lower-assessment-final-integrated" in p4_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p4-lower-assessment-final-topic-drill" in p4_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert_no_source_leak(p4_lower_json, p4_lower_report, tmp_dir)

        p5_upper_unit_zip = tmp_dir / "p5-upper-unit.zip"
        p5_upper_term_zip = tmp_dir / "p5-upper-term.zip"
        with ZipFile(p5_upper_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 小数除法 单元测试 A4.docx", b"fake p5 decimal division layout variant")
            archive.writestr("unit/第二单元 轴对称和平移 单元测试.docx", b"fake p5 symmetry translation")
            archive.writestr("unit/第三单元 倍数与因数 单元测试.docx", b"fake p5 factors multiples")
            archive.writestr("unit/第四单元 多边形的面积 单元测试.docx", b"fake p5 polygon area")
            archive.writestr("unit/第五单元 分数的意义 单元测试.docx", b"fake p5 fraction meaning")
            archive.writestr("unit/第六单元 组合图形的面积 单元测试.docx", b"fake p5 composite area")
            archive.writestr("unit/第七单元 可能性 单元测试.docx", b"fake p5 probability")
            archive.writestr("unit/第三单元 倍数与因数 参考解析.docx", b"fake p5 response support")
            archive.writestr("unit/第四单元 多边形的面积 " + "答" + "题卡.docx", b"fake p5 answer card")
        with ZipFile(p5_upper_term_zip, "w") as archive:
            archive.writestr("term/月考 1-2单元 学生卷.doc", b"fake p5 monthly legacy document format")
            archive.writestr("term/期中综合 学生卷.docx", b"fake p5 midterm")
            archive.writestr("term/期末综合 学生卷.docx", b"fake p5 final")
            archive.writestr("term/期末专项训练 数学好玩 学生卷.docx", b"fake p5 final topic drill")
            archive.writestr("term/2026版 期末素养测评 学生卷.docx", b"fake p5 curriculum review")

        p5_upper_manifest = build_manifest(
            [p5_upper_unit_zip, p5_upper_term_zip],
            "bnu-primary-p5-upper-assessments",
        )
        p5_upper_json = json.dumps(p5_upper_manifest, ensure_ascii=False)
        p5_upper_report = qa_report(p5_upper_manifest)
        assert p5_upper_manifest["target"] == "bnu-primary-p5-upper-assessments"
        assert p5_upper_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert p5_upper_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert p5_upper_manifest["coverage"]["currentScopeEvidenceEntries"] == 9  # type: ignore[index]
        assert p5_upper_manifest["coverage"]["curriculumVersionReviewEntries"] == 1  # type: ignore[index]
        assert p5_upper_manifest["totals"]["localOnlyQuarantineReasons"]["layout-variant-only"] == 1  # type: ignore[index]
        assert p5_upper_manifest["totals"]["localOnlyQuarantineReasons"]["legacy-document-format"] == 1  # type: ignore[index]
        assert p5_upper_manifest["totals"]["localOnlyQuarantineReasons"]["response-support"] == 1  # type: ignore[index]
        assert p5_upper_manifest["totals"]["localOnlyQuarantineReasons"]["answer-card-support"] == 1  # type: ignore[index]
        assert p5_upper_manifest["totals"]["localOnlyQuarantineReasons"]["curriculum-version-review"] == 1  # type: ignore[index]
        assert "monthly-1-to-2" in p5_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "midterm" in p5_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "final" in p5_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "bnu-primary-p5-upper-assessment-monthly-stage-integrated" in p5_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p5-upper-assessment-midterm-integrated" in p5_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p5-upper-assessment-final-integrated" in p5_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p5-upper-assessment-final-topic-drill" in p5_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert_no_source_leak(p5_upper_json, p5_upper_report, tmp_dir)

        p5_lower_unit_zip = tmp_dir / "p5-lower-unit.zip"
        p5_lower_term_zip = tmp_dir / "p5-lower-term.zip"
        with ZipFile(p5_lower_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 分数加减法 单元测试 A4.docx", b"fake p5 lower fraction add layout variant")
            archive.writestr("unit/第一单元 分数加减法 单元测试.docx", b"fake p5 lower fraction add")
            archive.writestr("unit/第二单元 长方体（一） 单元测试.docx", b"fake p5 lower cuboid surface area")
            archive.writestr("unit/第三单元 分数乘法 单元测试.docx", b"fake p5 lower fraction multiplication")
            archive.writestr("unit/第四单元 长方体（二） 单元测试.docx", b"fake p5 lower cuboid volume")
            archive.writestr("unit/第五单元 分数除法 单元测试.docx", b"fake p5 lower fraction division")
            archive.writestr("unit/第六单元 确定位置 单元测试.docx", b"fake p5 lower position")
            archive.writestr("unit/第七单元 用方程解决问题 单元测试.docx", b"fake p5 lower equations")
            archive.writestr("unit/第八单元 数据的表示和分析 单元测试.docx", b"fake p5 lower data")
            archive.writestr("unit/第三单元 分数乘法 参考解析.docx", b"fake p5 lower response support")
            archive.writestr("unit/第四单元 长方体（二） " + "答" + "题卡.docx", b"fake p5 lower answer card")
            archive.writestr("unit/老课标内容 可先参考.doc", b"fake p5 lower legacy")
        with ZipFile(p5_lower_term_zip, "w") as archive:
            archive.writestr("term/第一次月考 1-2单元 学生卷.docx", b"fake p5 lower monthly first")
            archive.writestr("term/第二次月考 3-4单元 学生卷.docx", b"fake p5 lower monthly second")
            archive.writestr("term/第三次月考 5-6单元 学生卷.docx", b"fake p5 lower monthly third")
            archive.writestr("term/第四次月考 7-8单元 学生卷.docx", b"fake p5 lower monthly fourth")
            archive.writestr("term/期中综合 学生卷.docx", b"fake p5 lower midterm")
            archive.writestr("term/期末综合 学生卷.docx", b"fake p5 lower final")
            archive.writestr("term/期末专项训练 数学好玩 学生卷.docx", b"fake p5 lower final topic drill")
            archive.writestr("term/2026版 期末素养测评 学生卷.docx", b"fake p5 lower curriculum review")

        p5_lower_manifest = build_manifest(
            [p5_lower_unit_zip, p5_lower_term_zip],
            "bnu-primary-p5-lower-assessments",
        )
        p5_lower_json = json.dumps(p5_lower_manifest, ensure_ascii=False)
        p5_lower_report = qa_report(p5_lower_manifest)
        assert p5_lower_manifest["target"] == "bnu-primary-p5-lower-assessments"
        assert p5_lower_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert p5_lower_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert p5_lower_manifest["coverage"]["currentScopeEvidenceEntries"] == 15  # type: ignore[index]
        assert p5_lower_manifest["coverage"]["curriculumVersionReviewEntries"] == 1  # type: ignore[index]
        assert p5_lower_manifest["totals"]["localOnlyQuarantineReasons"]["layout-variant-only"] == 1  # type: ignore[index]
        assert p5_lower_manifest["totals"]["localOnlyQuarantineReasons"]["legacy-reference-only"] == 1  # type: ignore[index]
        assert p5_lower_manifest["totals"]["localOnlyQuarantineReasons"]["response-support"] == 1  # type: ignore[index]
        assert p5_lower_manifest["totals"]["localOnlyQuarantineReasons"]["answer-card-support"] == 1  # type: ignore[index]
        assert p5_lower_manifest["totals"]["localOnlyQuarantineReasons"]["curriculum-version-review"] == 1  # type: ignore[index]
        assert "monthly-7-to-8" in p5_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "midterm" in p5_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "final" in p5_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "bnu-primary-p5-lower-assessment-monthly-stage-integrated" in p5_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p5-lower-assessment-midterm-integrated" in p5_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p5-lower-assessment-final-integrated" in p5_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p5-lower-assessment-final-topic-drill" in p5_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert_no_source_leak(p5_lower_json, p5_lower_report, tmp_dir)

        p6_upper_unit_zip = tmp_dir / "p6-upper-unit.zip"
        p6_upper_term_zip = tmp_dir / "p6-upper-term.zip"
        with ZipFile(p6_upper_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 圆 单元测试 A4.docx", b"fake p6 upper circle layout variant")
            archive.writestr("unit/第一单元 圆 单元测试.docx", b"fake p6 upper circle")
            archive.writestr("unit/第二单元 分数混合运算 单元测试.docx", b"fake p6 upper fraction mixed")
            archive.writestr("unit/第三单元 观察物体 单元测试.docx", b"fake p6 upper observe objects")
            archive.writestr("unit/第四单元 百分数 单元测试.docx", b"fake p6 upper percent meaning")
            archive.writestr("unit/第五单元 数据处理 单元测试.docx", b"fake p6 upper data processing")
            archive.writestr("unit/第六单元 比的认识 单元测试.docx", b"fake p6 upper ratio")
            archive.writestr("unit/第七单元 百分数的应用 单元测试.docx", b"fake p6 upper percent applications")
            archive.writestr("unit/第二单元 分数混合运算 参考解析.docx", b"fake p6 upper response support")
            archive.writestr("unit/第四单元 百分数 " + "答" + "题卡.docx", b"fake p6 upper answer card")
            archive.writestr("unit/老课标内容 可先参考.doc", b"fake p6 upper legacy")
        with ZipFile(p6_upper_term_zip, "w") as archive:
            archive.writestr("term/第一次月考 1-2单元 学生卷.docx", b"fake p6 upper monthly first")
            archive.writestr("term/第二次月考 5-6单元 学生卷.docx", b"fake p6 upper monthly second")
            archive.writestr("term/期中综合 学生卷.docx", b"fake p6 upper midterm")
            archive.writestr("term/期末综合 学生卷.docx", b"fake p6 upper final")
            archive.writestr("term/期末专项训练 数学好玩 学生卷.docx", b"fake p6 upper final topic drill")
            archive.writestr("term/2026版 期末素养测评 学生卷.docx", b"fake p6 upper curriculum review")
            archive.writestr("term/期末综合 " + "答" + "题卡.docx", b"fake p6 upper final answer card")

        p6_upper_manifest = build_manifest(
            [p6_upper_unit_zip, p6_upper_term_zip],
            "bnu-primary-p6-upper-assessments",
        )
        p6_upper_json = json.dumps(p6_upper_manifest, ensure_ascii=False)
        p6_upper_report = qa_report(p6_upper_manifest)
        assert p6_upper_manifest["target"] == "bnu-primary-p6-upper-assessments"
        assert p6_upper_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert p6_upper_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert p6_upper_manifest["coverage"]["currentScopeEvidenceEntries"] == 12  # type: ignore[index]
        assert p6_upper_manifest["coverage"]["legacyReferenceEntries"] == 1  # type: ignore[index]
        assert p6_upper_manifest["coverage"]["curriculumVersionReviewEntries"] == 1  # type: ignore[index]
        assert p6_upper_manifest["totals"]["localOnlyQuarantineReasons"]["layout-variant-only"] == 1  # type: ignore[index]
        assert p6_upper_manifest["totals"]["localOnlyQuarantineReasons"]["legacy-reference-only"] == 1  # type: ignore[index]
        assert p6_upper_manifest["totals"]["localOnlyQuarantineReasons"]["response-support"] == 1  # type: ignore[index]
        assert p6_upper_manifest["totals"]["localOnlyQuarantineReasons"]["answer-card-support"] == 2  # type: ignore[index]
        assert p6_upper_manifest["totals"]["localOnlyQuarantineReasons"]["curriculum-version-review"] == 1  # type: ignore[index]
        assert "monthly-1-to-2" in p6_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "monthly-3-to-4" in p6_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "midterm" in p6_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "final" in p6_upper_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "bnu-primary-p6-upper-assessment-monthly-stage-integrated" in p6_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p6-upper-assessment-midterm-integrated" in p6_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p6-upper-assessment-final-integrated" in p6_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p6-upper-assessment-final-topic-drill" in p6_upper_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert_no_source_leak(p6_upper_json, p6_upper_report, tmp_dir)

        p6_lower_unit_zip = tmp_dir / "p6-lower-unit.zip"
        p6_lower_term_zip = tmp_dir / "p6-lower-term.zip"
        with ZipFile(p6_lower_unit_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("unit/第一单元 圆柱与圆锥 单元测试.docx", b"fake p6 lower cylinders cones")
            archive.writestr("unit/第二单元 比例 单元测试.docx", b"fake p6 lower proportion")
            archive.writestr("unit/第三单元 图形的运动 单元测试.docx", b"fake p6 lower geometric motion")
            archive.writestr("unit/第四单元 正比例和反比例 单元测试.docx", b"fake p6 lower direct inverse")
            archive.writestr("unit/第一单元 圆柱与圆锥 参考解析.docx", b"fake p6 lower response support")
            archive.writestr("unit/第二单元 比例 " + "答" + "题卡.docx", b"fake p6 lower answer card")
            archive.writestr("unit/老课标内容 可先参考.doc", b"fake p6 lower legacy")
        with ZipFile(p6_lower_term_zip, "w") as archive:
            archive.writestr("term/第一次月考 1～2单元 学生卷.docx", b"fake p6 lower monthly first")
            archive.writestr("term/第二次月考 3～4单元 学生卷.docx", b"fake p6 lower monthly second")
            archive.writestr("term/期中综合 学生卷.docx", b"fake p6 lower midterm")
            archive.writestr("term/期末综合 学生卷.docx", b"fake p6 lower final")
            archive.writestr("term/期末专项小升初衔接 学生卷.docx", b"fake p6 lower transition topic drill")
            archive.writestr("term/2026版 4月学情自测 学生卷.docx", b"fake p6 lower curriculum review")
            archive.writestr("term/期末综合 " + "答" + "题卡.docx", b"fake p6 lower final answer card")

        p6_lower_manifest = build_manifest(
            [p6_lower_unit_zip, p6_lower_term_zip],
            "bnu-primary-p6-lower-assessments",
        )
        p6_lower_json = json.dumps(p6_lower_manifest, ensure_ascii=False)
        p6_lower_report = qa_report(p6_lower_manifest)
        assert p6_lower_manifest["target"] == "bnu-primary-p6-lower-assessments"
        assert p6_lower_manifest["totals"]["archives"] == 2  # type: ignore[index]
        assert p6_lower_manifest["coverage"]["completeExpectedSafePatterns"] is True  # type: ignore[index]
        assert p6_lower_manifest["coverage"]["currentScopeEvidenceEntries"] == 9  # type: ignore[index]
        assert p6_lower_manifest["coverage"]["legacyReferenceEntries"] == 1  # type: ignore[index]
        assert p6_lower_manifest["coverage"]["curriculumVersionReviewEntries"] == 1  # type: ignore[index]
        assert p6_lower_manifest["totals"]["localOnlyQuarantineReasons"]["legacy-reference-only"] == 1  # type: ignore[index]
        assert p6_lower_manifest["totals"]["localOnlyQuarantineReasons"]["response-support"] == 1  # type: ignore[index]
        assert p6_lower_manifest["totals"]["localOnlyQuarantineReasons"]["answer-card-support"] == 2  # type: ignore[index]
        assert p6_lower_manifest["totals"]["localOnlyQuarantineReasons"]["curriculum-version-review"] == 1  # type: ignore[index]
        assert "monthly-1-to-2" in p6_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "monthly-3-to-4" in p6_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "midterm" in p6_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "final" in p6_lower_manifest["coverage"]["observedAssessmentWindows"]  # type: ignore[operator]
        assert "bnu-primary-p6-lower-assessment-monthly-1-to-2-integrated" in p6_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p6-lower-assessment-monthly-3-to-4-integrated" in p6_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p6-lower-assessment-midterm-integrated" in p6_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p6-lower-assessment-final-integrated" in p6_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert "bnu-primary-p6-lower-assessment-final-topic-drill" in p6_lower_manifest["coverage"]["observedSafePatternIds"]  # type: ignore[operator]
        assert_no_source_leak(p6_lower_json, p6_lower_report, tmp_dir)

    print("Self-test passed: metadata-only BNU primary assessment manifest handles target configs and ZIP archives safely.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland BNU primary assessment archive metadata manifest.")
    parser.add_argument("zip_paths", nargs="*", help="Paths to private BNU primary assessment ZIP archives.")
    parser.add_argument("--target", default=DEFAULT_TARGET, choices=sorted(TARGET_CONFIGS), help="Manifest target config.")
    parser.add_argument("--out-dir", default=None, help="Output directory. Defaults to the target's ignored .local/rag/ directory.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test with temporary fake ZIP archives.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.zip_paths:
        raise SystemExit("At least one ZIP archive path is required unless --self-test is used.")

    target_config = target_config_for(args.target)
    out_dir = Path(args.out_dir).expanduser() if args.out_dir else target_config["outDir"]  # type: ignore[arg-type]
    manifest = build_manifest([Path(path) for path in args.zip_paths], args.target)
    write_outputs(manifest, out_dir)
    print(f"Wrote {manifest['totals']['entries']} metadata-only assessment entries to {out_dir}")


if __name__ == "__main__":
    main()
