#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland HJB high-school assessments.

The script records archive entry metadata, hashes, coarse assessment families,
volume scope, chapter signals, and safe draft-card signals only. It never
extracts or writes document body text, prompts, worked-response wording,
scoring wording, page images, table bodies, figure bodies, page locators, or
embedding payloads.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile


DEFAULT_OUT_DIR = Path(".local/rag/mainland-hjb-high-exams")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source archives, extracted "
    "document text, prompt wording, worked-response wording, scoring wording, "
    "page images, table bodies, figure bodies, page locators, or embeddings."
)
BODY_SENTINEL = "MAIS_BODY_SENTINEL_SHOULD_NOT_APPEAR"

COMPULSORY_ONE_CHAPTERS = [
    "集合与逻辑",
    "等式与不等式",
    "幂、指数与对数",
    "幂函数、指数函数与对数函数",
    "函数的概念、性质及应用",
]

COMPULSORY_ONE_CHAPTER_BY_NUMBER = {
    1: "集合与逻辑",
    2: "等式与不等式",
    3: "幂、指数与对数",
    4: "幂函数、指数函数与对数函数",
    5: "函数的概念、性质及应用",
}

COMPULSORY_TWO_CHAPTERS = [
    "三角",
    "三角函数",
    "平面向量",
    "复数",
]

COMPULSORY_TWO_CHAPTER_BY_NUMBER = {
    6: "三角",
    7: "三角函数",
    8: "平面向量",
    9: "复数",
}

COMPULSORY_THREE_CHAPTERS = [
    "空间直线与平面",
    "简单几何体",
    "概率初步",
    "统计",
]

COMPULSORY_THREE_CHAPTER_BY_NUMBER = {
    10: "空间直线与平面",
    11: "简单几何体",
    12: "概率初步",
    13: "统计",
}

SAFE_PATTERN_SLOTS = [
    {
        "draftId": "hjb-high-compulsory-1-sets-logic-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-1",
        "chapters": ["集合与逻辑"],
        "conceptSignals": ["sets", "set-operations", "logic-conditions", "quantifiers"],
        "difficultyBand": "foundation",
    },
    {
        "draftId": "hjb-high-compulsory-1-equations-inequalities-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-1",
        "chapters": ["等式与不等式"],
        "conceptSignals": ["inequality-properties", "quadratic-equations", "quadratic-inequalities", "basic-inequality"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-1-powers-exponents-logarithms-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-1",
        "chapters": ["幂、指数与对数"],
        "conceptSignals": ["exponents", "radicals", "logarithmic-operations", "base-conversion"],
        "difficultyBand": "foundation",
    },
    {
        "draftId": "hjb-high-compulsory-1-power-exponential-log-functions-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-1",
        "chapters": ["幂函数、指数函数与对数函数"],
        "conceptSignals": ["power-functions", "exponential-functions", "logarithmic-functions", "function-graphs"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-1-function-concepts-applications-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-1",
        "chapters": ["函数的概念、性质及应用"],
        "conceptSignals": ["function-definition", "domain-range", "monotonicity", "parity", "function-zero"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-1-sets-logic-topic-review",
        "assessmentFamilies": ["topic-review"],
        "volumeScope": "compulsory-1",
        "chapters": ["集合与逻辑"],
        "conceptSignals": ["sets", "set-operations", "logic-conditions", "quantifiers"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-1-equations-inequalities-topic-review",
        "assessmentFamilies": ["topic-review"],
        "volumeScope": "compulsory-1",
        "chapters": ["等式与不等式"],
        "conceptSignals": ["inequality-properties", "quadratic-inequalities", "basic-inequality", "solution-sets"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-compulsory-1-powers-exponents-logarithms-topic-review",
        "assessmentFamilies": ["topic-review"],
        "volumeScope": "compulsory-1",
        "chapters": ["幂、指数与对数"],
        "conceptSignals": ["exponents", "radicals", "logarithmic-operations", "base-conversion"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-1-power-exponential-log-functions-topic-review",
        "assessmentFamilies": ["topic-review"],
        "volumeScope": "compulsory-1",
        "chapters": ["幂函数、指数函数与对数函数"],
        "conceptSignals": ["power-functions", "exponential-functions", "logarithmic-functions", "function-transformations"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-compulsory-1-function-concepts-applications-topic-review",
        "assessmentFamilies": ["topic-review"],
        "volumeScope": "compulsory-1",
        "chapters": ["函数的概念、性质及应用"],
        "conceptSignals": ["function-definition", "domain-range", "monotonicity", "parity", "function-zero", "inverse-functions"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-compulsory-1-midterm-chapters-1-3",
        "assessmentFamilies": ["midterm"],
        "volumeScope": "compulsory-1",
        "chapters": ["集合与逻辑", "等式与不等式", "幂、指数与对数"],
        "conceptSignals": ["sets", "logic-conditions", "inequality-properties", "quadratic-inequalities", "logarithmic-operations"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-compulsory-1-final-full-volume",
        "assessmentFamilies": ["final"],
        "volumeScope": "compulsory-1",
        "chapters": COMPULSORY_ONE_CHAPTERS,
        "conceptSignals": ["sets", "inequality-properties", "exponents", "exponential-functions", "logarithmic-functions", "function-definition", "function-zero"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-compulsory-2-trigonometry-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-2",
        "chapters": ["三角"],
        "conceptSignals": ["unit-circle", "trigonometric-ratios", "trigonometric-identities", "sine-theorem", "cosine-theorem"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-2-trigonometry-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-2",
        "chapters": ["三角"],
        "conceptSignals": ["unit-circle", "trigonometric-identities", "sine-theorem", "cosine-theorem", "trigonometric-modeling"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-compulsory-2-trig-functions-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-2",
        "chapters": ["三角函数"],
        "conceptSignals": ["trigonometric-functions", "trigonometric-graphs", "periodicity", "trigonometric-transformations"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-2-trig-functions-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-2",
        "chapters": ["三角函数"],
        "conceptSignals": ["trigonometric-functions", "periodicity", "trigonometric-transformations", "parameter-reasoning"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-compulsory-2-plane-vectors-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-2",
        "chapters": ["平面向量"],
        "conceptSignals": ["plane-vectors", "vector-operations", "dot-product", "vector-coordinates"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-2-plane-vectors-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-2",
        "chapters": ["平面向量"],
        "conceptSignals": ["plane-vectors", "dot-product", "vector-applications", "coordinate-method"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-compulsory-2-complex-numbers-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-2",
        "chapters": ["复数"],
        "conceptSignals": ["complex-numbers", "complex-operations", "complex-plane", "complex-roots"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-2-complex-numbers-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-2",
        "chapters": ["复数"],
        "conceptSignals": ["complex-numbers", "complex-plane", "complex-roots", "trigonometric-form"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-compulsory-2-midterm-chapters-6-7",
        "assessmentFamilies": ["midterm"],
        "volumeScope": "compulsory-2",
        "chapters": ["三角", "三角函数"],
        "conceptSignals": ["unit-circle", "trigonometric-identities", "trigonometric-functions", "periodicity"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-compulsory-2-midterm-chapters-6-8",
        "assessmentFamilies": ["midterm"],
        "volumeScope": "compulsory-2",
        "chapters": ["三角", "三角函数", "平面向量"],
        "conceptSignals": ["trigonometric-functions", "trigonometric-transformations", "plane-vectors", "dot-product"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-compulsory-2-midterm-trig-vector-integrated",
        "assessmentFamilies": ["midterm", "topic-review"],
        "volumeScope": "compulsory-2",
        "chapters": ["三角", "三角函数", "平面向量"],
        "conceptSignals": ["trigonometric-identities", "trigonometric-graphs", "plane-vectors", "vector-applications"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-compulsory-2-final-full-volume",
        "assessmentFamilies": ["final"],
        "volumeScope": "compulsory-2",
        "chapters": COMPULSORY_TWO_CHAPTERS,
        "conceptSignals": ["trigonometric-identities", "trigonometric-functions", "plane-vectors", "complex-numbers"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-compulsory-2-final-common-error-review",
        "assessmentFamilies": ["final", "topic-review"],
        "volumeScope": "compulsory-2",
        "chapters": COMPULSORY_TWO_CHAPTERS,
        "conceptSignals": ["periodicity", "phase-shift", "dot-product", "complex-plane"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-compulsory-2-final-challenge-synthesis",
        "assessmentFamilies": ["final"],
        "volumeScope": "compulsory-2",
        "chapters": COMPULSORY_TWO_CHAPTERS,
        "conceptSignals": ["trigonometric-transformations", "vector-applications", "complex-roots", "parameter-reasoning"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-compulsory-3-spatial-lines-planes-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-3",
        "chapters": ["空间直线与平面"],
        "conceptSignals": ["solid-geometry", "spatial-lines-planes", "parallel-perpendicular", "line-plane-angle"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-3-spatial-lines-planes-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-3",
        "chapters": ["空间直线与平面"],
        "conceptSignals": ["solid-geometry", "spatial-lines-planes", "distance-in-space", "parallel-perpendicular"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-compulsory-3-probability-foundations-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-3",
        "chapters": ["概率初步"],
        "conceptSignals": ["probability-foundations", "sample-space", "random-events", "probability-operations"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-3-statistics-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "compulsory-3",
        "chapters": ["统计"],
        "conceptSignals": ["sampling", "data-distribution", "statistical-charts", "statistical-estimation"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-3-midterm-chapters-10-11",
        "assessmentFamilies": ["midterm"],
        "volumeScope": "compulsory-3",
        "chapters": ["空间直线与平面", "简单几何体"],
        "conceptSignals": ["solid-geometry", "spatial-lines-planes", "surface-volume", "polyhedra"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-compulsory-3-space-vector-midterm-bridge",
        "assessmentFamilies": ["midterm", "cross-volume-review"],
        "volumeScope": "cross-volume-review",
        "chapters": ["空间直线与平面", "简单几何体", "空间向量及其应用"],
        "conceptSignals": ["solid-geometry", "surface-volume", "space-vectors", "line-plane-angle"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-compulsory-3-midterm-mock-reinforcement",
        "assessmentFamilies": ["midterm"],
        "volumeScope": "compulsory-3",
        "chapters": ["空间直线与平面", "简单几何体"],
        "conceptSignals": ["solid-geometry", "spatial-lines-planes", "surface-volume", "parallel-perpendicular"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-compulsory-3-midterm-mock-extension",
        "assessmentFamilies": ["midterm"],
        "volumeScope": "compulsory-3",
        "chapters": ["空间直线与平面", "简单几何体"],
        "conceptSignals": ["solid-geometry", "spatial-lines-planes", "surface-volume", "distance-in-space"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-compulsory-3-final-full-volume-peiyou",
        "assessmentFamilies": ["final"],
        "volumeScope": "compulsory-3",
        "chapters": COMPULSORY_THREE_CHAPTERS,
        "conceptSignals": ["solid-geometry", "probability-foundations", "sampling", "data-distribution"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-compulsory-3-final-full-volume-advanced",
        "assessmentFamilies": ["final"],
        "volumeScope": "compulsory-3",
        "chapters": COMPULSORY_THREE_CHAPTERS,
        "conceptSignals": ["solid-geometry", "probability-foundations", "sampling", "statistical-estimation"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-1-lines-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["平面直角坐标系中的直线"],
        "conceptSignals": ["analytic-geometry", "line-equations", "point-line-distance"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-selective-1-lines-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["平面直角坐标系中的直线"],
        "conceptSignals": ["analytic-geometry", "coordinate-method", "point-line-distance"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-1-conics-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["圆锥曲线"],
        "conceptSignals": ["circle-equations", "ellipse", "hyperbola", "parabola-conic"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-selective-1-conics-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["圆锥曲线"],
        "conceptSignals": ["line-conic-intersection", "ellipse", "hyperbola", "parabola-conic"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-1-space-vectors-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["空间向量及其应用"],
        "conceptSignals": ["space-vectors", "line-plane-angle", "distance-in-space"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-selective-1-space-vectors-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["空间向量及其应用"],
        "conceptSignals": ["space-vectors", "parallel-perpendicular", "line-plane-angle"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-1-sequences-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["数列"],
        "conceptSignals": ["sequences", "arithmetic-sequences", "geometric-sequences", "recurrence"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-selective-1-sequences-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["数列"],
        "conceptSignals": ["sequences", "recurrence", "mathematical-induction"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-1-midterm-integrated",
        "assessmentFamilies": ["midterm"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["平面直角坐标系中的直线", "圆锥曲线", "数列"],
        "conceptSignals": ["line-equations", "ellipse", "parabola-conic", "sequences"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-selective-1-final-full-volume",
        "assessmentFamilies": ["final"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["平面直角坐标系中的直线", "圆锥曲线", "空间向量及其应用", "数列"],
        "conceptSignals": ["line-equations", "ellipse", "space-vectors", "sequences"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-selective-1-lines-conics-synthesis",
        "assessmentFamilies": ["topic-review", "final"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["平面直角坐标系中的直线", "圆锥曲线"],
        "conceptSignals": ["line-equations", "line-conic-intersection", "ellipse"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-1-space-vectors-synthesis",
        "assessmentFamilies": ["topic-review", "final"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["空间向量及其应用"],
        "conceptSignals": ["space-vectors", "line-plane-angle", "distance-in-space"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-1-sequences-synthesis",
        "assessmentFamilies": ["topic-review", "final"],
        "volumeScope": "selective-compulsory-1",
        "chapters": ["数列"],
        "conceptSignals": ["sequences", "recurrence", "mathematical-induction"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-2-derivatives-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-2",
        "chapters": ["导数及其应用"],
        "conceptSignals": ["derivatives", "tangent-line", "monotonicity-extrema"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-selective-2-derivatives-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-2",
        "chapters": ["导数及其应用"],
        "conceptSignals": ["derivatives", "optimization", "function-inequalities"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-2-counting-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-2",
        "chapters": ["计数原理"],
        "conceptSignals": ["counting-principles", "permutations-combinations", "binomial-theorem"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-selective-2-counting-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-2",
        "chapters": ["计数原理"],
        "conceptSignals": ["counting-principles", "permutations-combinations", "case-analysis"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-2-probability-continuation-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-2",
        "chapters": ["概率初步续"],
        "conceptSignals": ["conditional-probability", "total-probability", "random-variables"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-selective-2-probability-continuation-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-2",
        "chapters": ["概率初步续"],
        "conceptSignals": ["conditional-probability", "bayes-formula", "normal-distribution"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-2-bivariate-data-unit-core",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-2",
        "chapters": ["成对数据的统计分析"],
        "conceptSignals": ["bivariate-data", "correlation", "linear-regression"],
        "difficultyBand": "core",
    },
    {
        "draftId": "hjb-high-selective-2-bivariate-data-unit-challenge",
        "assessmentFamilies": ["unit-test"],
        "volumeScope": "selective-compulsory-2",
        "chapters": ["成对数据的统计分析"],
        "conceptSignals": ["bivariate-data", "linear-regression", "independence-test"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-2-derivatives-midterm-bridge",
        "assessmentFamilies": ["midterm", "topic-review"],
        "volumeScope": "selective-compulsory-2",
        "chapters": ["导数及其应用"],
        "conceptSignals": ["derivatives", "tangent-line", "optimization"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-selective-2-lines-conics-midterm-bridge",
        "assessmentFamilies": ["midterm", "topic-review", "cross-volume-review"],
        "volumeScope": "cross-volume-review",
        "chapters": ["平面直角坐标系中的直线", "圆锥曲线", "导数及其应用"],
        "conceptSignals": ["line-equations", "ellipse", "parabola-conic", "derivatives"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-selective-2-conics-topic-review-bridge",
        "assessmentFamilies": ["midterm", "topic-review", "cross-volume-review"],
        "volumeScope": "cross-volume-review",
        "chapters": ["圆锥曲线"],
        "conceptSignals": ["circle-equations", "ellipse", "line-conic-intersection"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-2-sequences-space-vectors-review-bridge",
        "assessmentFamilies": ["midterm", "topic-review", "cross-volume-review"],
        "volumeScope": "cross-volume-review",
        "chapters": ["数列", "空间向量及其应用"],
        "conceptSignals": ["sequences", "recurrence", "space-vectors"],
        "difficultyBand": "challenge",
    },
    {
        "draftId": "hjb-high-selective-2-midterm-mock-integrated",
        "assessmentFamilies": ["midterm"],
        "volumeScope": "cross-volume-review",
        "chapters": ["平面直角坐标系中的直线", "圆锥曲线", "导数及其应用", "数列", "空间向量及其应用"],
        "conceptSignals": ["line-equations", "ellipse", "derivatives", "sequences", "space-vectors"],
        "difficultyBand": "exam",
    },
    {
        "draftId": "hjb-high-cross-volume-probability-statistics-solid-review",
        "assessmentFamilies": ["cross-volume-review"],
        "volumeScope": "cross-volume-review",
        "chapters": ["空间直线与平面", "简单几何体", "概率初步", "统计", "空间向量及其应用"],
        "conceptSignals": ["solid-geometry", "probability-foundations", "sampling", "space-vectors"],
        "difficultyBand": "exam",
    },
]

CHAPTER_MARKERS = [
    ("集合与逻辑", ["集合与逻辑"]),
    ("幂函数、指数函数与对数函数", ["幂函数、指数函数与对数函数"]),
    ("函数的概念、性质及应用", ["函数的概念、性质及应用"]),
    ("三角函数", ["三角函数"]),
    ("三角", ["三角"]),
    ("平面向量", ["平面向量"]),
    ("复数", ["复数"]),
    ("平面直角坐标系中的直线", ["平面直角坐标系中的直线", "坐标平面上的直线", "直线"]),
    ("圆锥曲线", ["圆锥曲线"]),
    ("空间向量及其应用", ["空间向量及其应用", "空间向量"]),
    ("数列", ["数列"]),
    ("导数及其应用", ["导数及其应用", "导数的概念", "导数的应用", "导数"]),
    ("计数原理", ["计数原理"]),
    ("概率初步续", ["概率初步（续）", "概率初步续", "概率初步(续)"]),
    ("成对数据的统计分析", ["成对数据的统计分析", "成对数据", "统计分析"]),
    ("空间直线与平面", ["空间直线与平面"]),
    ("简单几何体", ["简单几何体"]),
    ("概率初步", ["概率初步", "概率"]),
    ("统计", ["统计"]),
    ("等式与不等式", ["等式与不等式", "基本不等式"]),
    ("幂、指数与对数", ["幂、指数与对数"]),
]


def compact_name(value: str) -> str:
    return re.sub(r"[\s_\-/，、。,.【】\[\]（）():：;；]+", "", value)


def unique_ordered(values: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            unique.append(value)
    return unique


def is_compulsory_one_context(name: str, archive_context: str = "") -> bool:
    text = compact_name(f"{archive_context}/{name}")
    explicit_volume_markers = ["高中数学必修第一册沪教版", "必修第一册", "必修一", "必修1", "2023必修一"]
    if any(marker in text for marker in explicit_volume_markers):
        return True
    if any(compact_name(chapter) in text for chapter in COMPULSORY_ONE_CHAPTERS):
        return True
    return False


def is_compulsory_two_context(name: str, archive_context: str = "") -> bool:
    text = compact_name(f"{archive_context}/{name}")
    explicit_volume_markers = ["高中数学必修第二册沪教版", "必修第二册", "必修二", "必修2", "高一数学下学期", "高一下学期"]
    if any(marker in text for marker in explicit_volume_markers):
        return True
    if any(compact_name(chapter) in text for chapter in COMPULSORY_TWO_CHAPTERS):
        return True
    return False


def is_compulsory_three_context(name: str, archive_context: str = "") -> bool:
    text = compact_name(f"{archive_context}/{name}")
    explicit_volume_markers = ["高中数学必修第三册沪教版", "必修第三册", "必修三", "必修3", "2020必修第三册"]
    if any(marker in text for marker in explicit_volume_markers):
        return True
    if any(compact_name(chapter) in text for chapter in COMPULSORY_THREE_CHAPTERS):
        return True
    return False


def compulsory_one_chapters_from_numbers(name: str) -> list[str]:
    normalized = re.sub(r"\s+", "", name)
    chapters: list[str] = []
    for start, end in re.findall(r"第(\d+)[\-—~至到](\d+)章", normalized):
        start_number = int(start)
        end_number = int(end)
        lower = min(start_number, end_number)
        upper = max(start_number, end_number)
        chapters.extend(
            chapter
            for number, chapter in COMPULSORY_ONE_CHAPTER_BY_NUMBER.items()
            if lower <= number <= upper
        )
    for value in re.findall(r"第(\d+)章", normalized):
        chapter = COMPULSORY_ONE_CHAPTER_BY_NUMBER.get(int(value))
        if chapter:
            chapters.append(chapter)
    return unique_ordered(chapters)


def compulsory_two_chapters_from_numbers(name: str) -> list[str]:
    normalized = re.sub(r"\s+", "", name)
    chapters: list[str] = []
    for start, end in re.findall(r"第(\d+)[\-—~至到](\d+)章", normalized):
        start_number = int(start)
        end_number = int(end)
        lower = min(start_number, end_number)
        upper = max(start_number, end_number)
        chapters.extend(
            chapter
            for number, chapter in COMPULSORY_TWO_CHAPTER_BY_NUMBER.items()
            if lower <= number <= upper
        )
    for value in re.findall(r"第(\d+)章", normalized):
        chapter = COMPULSORY_TWO_CHAPTER_BY_NUMBER.get(int(value))
        if chapter:
            chapters.append(chapter)
    return unique_ordered(chapters)


def compulsory_three_chapters_from_numbers(name: str) -> list[str]:
    normalized = re.sub(r"\s+", "", name)
    chapters: list[str] = []
    for start, end in re.findall(r"第(\d+)[\-—~至到](\d+)章", normalized):
        start_number = int(start)
        end_number = int(end)
        lower = min(start_number, end_number)
        upper = max(start_number, end_number)
        chapters.extend(
            chapter
            for number, chapter in COMPULSORY_THREE_CHAPTER_BY_NUMBER.items()
            if lower <= number <= upper
        )
    for value in re.findall(r"第(\d+)章", normalized):
        chapter = COMPULSORY_THREE_CHAPTER_BY_NUMBER.get(int(value))
        if chapter:
            chapters.append(chapter)
    return unique_ordered(chapters)


def classification_text(name: str) -> str:
    parts = [part for part in name.split("/") if part]
    if parts and parts[0] in {"期中期末", "期中期末总复习-P158"}:
        return "/".join(parts[1:])
    return name


def decode_zip_name(name: str) -> str:
    try:
        raw = name.encode("cp437")
    except UnicodeEncodeError:
        return name
    for encoding in ("gb18030", "utf-8"):
        try:
            return raw.decode(encoding)
        except UnicodeError:
            continue
    return name


def should_skip_entry(decoded_name: str) -> bool:
    parts = decoded_name.split("/")
    return decoded_name.endswith("/") or "__MACOSX" in parts or any(part.startswith("._") for part in parts)


def sha256_for_member(archive: ZipFile, member_name: str) -> str:
    digest = hashlib.sha256()
    with archive.open(member_name) as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def infer_chapters(name: str, archive_context: str = "") -> list[str]:
    normalized = compact_name(name)
    chapters: list[str] = []
    for chapter, markers in CHAPTER_MARKERS:
        if chapter == "平面直角坐标系中的直线" and "空间直线" in normalized:
            continue
        if chapter == "三角" and "三角函数" in normalized:
            explicit_trigonometry_signal = "第6章" in name or re.search(r"三角\s*[、,，和及与]\s*三角函数", name)
            if not explicit_trigonometry_signal:
                continue
        if chapter == "概率初步" and "概率初步续" in normalized:
            continue
        if chapter == "统计" and "成对数据" in normalized:
            continue
        if any(compact_name(marker) in normalized for marker in markers):
            chapters.append(chapter)
    if is_compulsory_one_context(name, archive_context):
        file_name = name.rsplit("/", 1)[-1]
        chapters.extend(compulsory_one_chapters_from_numbers(name))
        if "期末" in file_name:
            chapters.extend(COMPULSORY_ONE_CHAPTERS)
        elif "期中" in file_name:
            chapters.extend(COMPULSORY_ONE_CHAPTERS[:3])
    if is_compulsory_two_context(name, archive_context):
        file_name = name.rsplit("/", 1)[-1]
        chapters.extend(compulsory_two_chapters_from_numbers(name))
        if "期末" in file_name:
            chapters.extend(COMPULSORY_TWO_CHAPTERS)
        elif "期中" in file_name and not chapters:
            chapters.extend(COMPULSORY_TWO_CHAPTERS[:3])
    if is_compulsory_three_context(name, archive_context):
        file_name = name.rsplit("/", 1)[-1]
        chapters.extend(compulsory_three_chapters_from_numbers(name))
        if "全部内容" in file_name or "期末" in file_name:
            chapters.extend(COMPULSORY_THREE_CHAPTERS)
        elif "期中" in file_name and not chapters:
            chapters.extend(COMPULSORY_THREE_CHAPTERS[:2])
    return unique_ordered(chapters)


def infer_assessment_families(name: str, archive_context: str = "") -> list[str]:
    compacted = compact_name(name)
    if is_compulsory_one_context(name, archive_context):
        families: list[str] = []
        if any(term in name for term in ["单元复习", "复习", "热考题型", "专题", "专项", "总复习", "考前"]):
            families.append("topic-review")
        elif any(term in name for term in ["单元测试", "测试卷", "单元"]):
            families.append("unit-test")
        if "期中" in name:
            families.append("midterm")
        if "期末" in name:
            families.append("final")
        return sorted(set(families)) or ["topic-review"]
    if is_compulsory_two_context(name, archive_context):
        families = []
        is_period_assessment = "期中" in name or "期末" in name
        if not is_period_assessment and any(term in name for term in ["单元测试", "测试卷", "单元"]):
            families.append("unit-test")
        if "期中" in name:
            families.append("midterm")
        if "期末" in name:
            families.append("final")
        if any(term in name for term in ["专题", "专项", "总复习", "考前", "复习", "模拟"]):
            families.append("topic-review")
        return sorted(set(families)) or ["topic-review"]
    if is_compulsory_three_context(name, archive_context):
        families = []
        if any(term in name for term in ["单元测试", "单元"]):
            families.append("unit-test")
        if "期中" in name:
            families.append("midterm")
        if "期末" in name:
            families.append("final")
        if any(term in name for term in ["空间向量与立体几何", "空间向量"]) and "期中" in name:
            families.append("cross-volume-review")
        return sorted(set(families)) or ["topic-review"]

    families: list[str] = []
    if "单元" in name:
        families.append("unit-test")
    if "期中" in name:
        families.append("midterm")
    if "期末" in name:
        families.append("final")
    if any(term in name for term in ["专题", "专项", "总复习", "考前", "复习", "模拟"]):
        families.append("topic-review")
    if any(term in name for term in ["必修第三册", "空间直线与平面", "简单几何体", "等式与不等式", "幂、指数与对数"]):
        families.append("cross-volume-review")
    if "概率初步" in name and "概率初步续" not in compacted:
        families.append("cross-volume-review")
    if "统计" in name and not any(term in compacted for term in ["成对数据", "统计分析"]):
        families.append("cross-volume-review")
    return sorted(set(families)) or ["topic-review"]


def infer_role(name: str, extension: str) -> str:
    if extension == ".pptx":
        return "presentation"
    if extension == ".pdf":
        if any(term in name for term in ["答题卡", "试题版", "考试版", "学生版"]):
            return "student-assessment-form"
        return "portable-document"
    if any(term in name for term in ["教师版", "全解", "解析", "参考"]):
        return "worked-response-support"
    if any(term in name for term in ["学生版", "原卷", "考试版", "答题卡"]):
        return "student-assessment-form"
    return "assessment-resource"


def infer_difficulty(name: str) -> str:
    if any(term in name for term in ["B卷", "能力提升", "难点", "压轴", "提高", "提升", "培优卷"]):
        return "challenge"
    if any(term in name for term in ["A卷", "知识通关", "重点", "强化"]):
        return "core"
    if any(term in name for term in ["期中", "期末", "模拟", "综合"]):
        return "exam"
    return "core"


def infer_volume_scope(name: str, chapters: list[str], families: list[str], archive_context: str = "") -> str:
    compulsory_one = set(COMPULSORY_ONE_CHAPTERS)
    compulsory_two = set(COMPULSORY_TWO_CHAPTERS)
    compulsory_three = set(COMPULSORY_THREE_CHAPTERS)
    selective_one = {"平面直角坐标系中的直线", "圆锥曲线", "空间向量及其应用", "数列"}
    selective_two = {"导数及其应用", "计数原理", "概率初步续", "成对数据的统计分析"}
    if is_compulsory_one_context(name, archive_context) and (
        not chapters or all(chapter in compulsory_one for chapter in chapters)
    ):
        return "compulsory-1"
    if is_compulsory_two_context(name, archive_context) and (
        not chapters or all(chapter in compulsory_two for chapter in chapters)
    ):
        return "compulsory-2"
    if "cross-volume-review" in families:
        return "cross-volume-review"
    if is_compulsory_three_context(name, archive_context) and (
        not chapters or all(chapter in compulsory_three for chapter in chapters)
    ):
        return "compulsory-3"
    if chapters and any(chapter in selective_one for chapter in chapters) and any(chapter in selective_two for chapter in chapters):
        return "cross-volume-review"
    if chapters and all(chapter in selective_two for chapter in chapters):
        return "selective-compulsory-2"
    if chapters and all(chapter in selective_one for chapter in chapters):
        if any(term in name for term in ["期中期末总复习-P158", "高二下学期", "下学期"]):
            return "cross-volume-review"
        return "selective-compulsory-1"
    return "cross-volume-review"


def classify_entry(name: str, extension: str, archive_context: str = "") -> dict[str, object]:
    chapters = infer_chapters(name, archive_context)
    text_for_family = classification_text(name)
    assessment_families = infer_assessment_families(text_for_family, archive_context)
    volume_scope = infer_volume_scope(name, chapters, assessment_families, archive_context)
    if volume_scope == "cross-volume-review" and "cross-volume-review" not in assessment_families:
        assessment_families = sorted([*assessment_families, "cross-volume-review"])
    return {
        "extension": extension,
        "role": infer_role(name, extension),
        "assessmentFamilies": assessment_families,
        "volumeScope": volume_scope,
        "chapters": chapters,
        "difficultyBand": infer_difficulty(text_for_family),
        "ownerProvided": True,
        "storageStatus": "local-private-owner-provided; source archive entries not copied into repo",
        "licenseStatus": "owner-provided local analysis only; no public redistribution assumed",
        "safeRetentionPolicy": "commit safe pattern cards, manifest tooling, and QA notes only",
    }


def source_entries(zip_paths: list[Path]) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for zip_path in zip_paths:
        with ZipFile(zip_path) as archive:
            for info in archive.infolist():
                decoded_name = decode_zip_name(info.filename)
                if should_skip_entry(decoded_name):
                    continue
                extension = Path(decoded_name).suffix.lower()
                digest = sha256_for_member(archive, info.filename)
                entry = {
                    "entryId": f"hjb-high-assessment-{digest[:12]}",
                    "archiveName": zip_path.name,
                    "entryName": decoded_name,
                    "fileName": decoded_name.rsplit("/", 1)[-1],
                    "sizeBytes": info.file_size,
                    "compressedBytes": info.compress_size,
                    "sha256": digest,
                    **classify_entry(decoded_name, extension, str(zip_path)),
                }
                entries.append(entry)
    return entries


def build_manifest(zip_paths: list[Path]) -> dict[str, object]:
    entries = source_entries(zip_paths)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "safetyNote": SAFETY_NOTE,
        "totals": {
            "archives": len(zip_paths),
            "files": len(entries),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "compressedBytes": sum(int(entry["compressedBytes"]) for entry in entries),
        },
        "counts": {
            "extensions": dict(sorted(Counter(str(entry["extension"]) for entry in entries).items())),
            "roles": dict(sorted(Counter(str(entry["role"]) for entry in entries).items())),
            "assessmentFamilies": dict(
                sorted(Counter(family for entry in entries for family in entry["assessmentFamilies"]).items())  # type: ignore[index]
            ),
            "volumeScopes": dict(sorted(Counter(str(entry["volumeScope"]) for entry in entries).items())),
            "chapters": dict(sorted(Counter(chapter for entry in entries for chapter in entry["chapters"]).items())),  # type: ignore[index]
            "difficultyBands": dict(sorted(Counter(str(entry["difficultyBand"]) for entry in entries).items())),
        },
        "sources": entries,
    }


def draft_cards(manifest: dict[str, object]) -> list[dict[str, object]]:
    counts = manifest["counts"]  # type: ignore[index]
    family_counts = counts["assessmentFamilies"]  # type: ignore[index]
    chapter_counts = counts["chapters"]  # type: ignore[index]
    return [
        {
            "draftId": slot["draftId"],
            "publisher": "MAINLAND_HJB",
            "curriculumTrack": "MAINLAND_PEP_HIGH",
            "stage": "senior-secondary",
            "assessmentFamilies": slot["assessmentFamilies"],
            "volumeScope": slot["volumeScope"],
            "chapters": slot["chapters"],
            "conceptSignals": slot["conceptSignals"],
            "difficultyBand": slot["difficultyBand"],
            "supportingFamilyCounts": {
                family: family_counts.get(family, 0) for family in slot["assessmentFamilies"]  # type: ignore[index]
            },
            "supportingChapterCounts": {chapter: chapter_counts.get(chapter, 0) for chapter in slot["chapters"]},  # type: ignore[index]
            "safeSummaryDraft": "Use this assessment slot only as aggregated pattern guidance for original MAIS content.",
            "sourceDistanceStatus": "safe-card-only; needs S18 review before student-facing generation claims",
        }
        for slot in SAFE_PATTERN_SLOTS
    ]


def qa_report(manifest: dict[str, object], cards: list[dict[str, object]]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    return "\n".join(
        [
            "# Mainland HJB High-School Assessment Metadata QA",
            "",
            f"- Generated at: {manifest['generatedAt']}",
            f"- Archives inspected: {totals['archives']}",
            f"- Files classified: {totals['files']}",
            f"- Safe draft cards: {len(cards)}",
            f"- Safety note: {SAFETY_NOTE}",
            "",
            "## Classification Counts",
            "",
            f"- Extensions: {json.dumps(counts['extensions'], ensure_ascii=False)}",
            f"- Roles: {json.dumps(counts['roles'], ensure_ascii=False)}",
            f"- Assessment families: {json.dumps(counts['assessmentFamilies'], ensure_ascii=False)}",
            f"- Volume scopes: {json.dumps(counts['volumeScopes'], ensure_ascii=False)}",
            f"- Chapters: {json.dumps(counts['chapters'], ensure_ascii=False)}",
            f"- Difficulty bands: {json.dumps(counts['difficultyBands'], ensure_ascii=False)}",
            "",
            "## Safety Gate",
            "",
            "- Passed: output artifacts contain archive-entry metadata, hashes, coarse classification, and safe abstraction drafts only.",
            "- Passed: no document body text, prompt wording, worked-response wording, scoring wording, page images, table bodies, figure bodies, page locators, or embedding payloads are persisted.",
            "- Required before production use: S18 review of safe cards and any future student-facing content.",
            "",
        ]
    ) + "\n"


def write_outputs(manifest: dict[str, object], cards: list[dict[str, object]], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "source-register.json").write_text(json.dumps(manifest["sources"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "safe-card-drafts.json").write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest, cards), encoding="utf-8")


def default_out_dir_for(manifest: dict[str, object]) -> Path:
    counts = manifest["counts"]  # type: ignore[index]
    volume_scopes = set(str(scope) for scope in counts["volumeScopes"].keys())  # type: ignore[index]
    for scope in ("compulsory-1", "compulsory-2", "compulsory-3", "selective-compulsory-1", "selective-compulsory-2"):
        if scope in volume_scopes and volume_scopes.issubset({scope, "cross-volume-review"}):
            return DEFAULT_OUT_DIR / scope
    return DEFAULT_OUT_DIR


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        compulsory_dir = tmp_path / "高中数学必修第一册（沪教版）"
        compulsory_dir.mkdir()
        compulsory_unit_zip = compulsory_dir / "单元测试.zip"
        compulsory_review_zip = compulsory_dir / "期中期末.zip"
        compulsory_two_dir = tmp_path / "高中数学必修第二册（沪教版）"
        compulsory_two_dir.mkdir()
        compulsory_two_unit_zip = compulsory_two_dir / "单元测试.zip"
        compulsory_two_review_zip = compulsory_two_dir / "期中期末.zip"
        compulsory_three_dir = tmp_path / "高中数学必修第三册（沪教版）"
        compulsory_three_dir.mkdir()
        compulsory_three_unit_zip = compulsory_three_dir / "单元测试.zip"
        compulsory_three_review_zip = compulsory_three_dir / "期中期末.zip"
        unit_zip = tmp_path / "单元测试.zip"
        review_zip = tmp_path / "期中期末总复习-P158.zip"
        gb18030_name = "单元测试/第5章 导数及其应用（A卷·知识通关练）（学生版）.docx"
        gb18030_mojibake = gb18030_name.encode("gb18030").decode("cp437")
        assert decode_zip_name(gb18030_mojibake) == gb18030_name
        with ZipFile(compulsory_unit_zip, "w") as archive:
            archive.writestr("单元测试/第1章 集合与逻辑 单元测试(原卷版).docx", BODY_SENTINEL)
            archive.writestr("单元测试/第1章 集合与逻辑 单元复习+热考题型(解析版).docx", BODY_SENTINEL)
            archive.writestr("单元测试/第4章 幂函数、指数函数与对数函数 单元测试卷 (解析版).docx", BODY_SENTINEL)
            archive.writestr("单元测试/第5章 函数的概念、性质及应用单元复习+热考题型(原卷版).docx", BODY_SENTINEL)
        with ZipFile(compulsory_review_zip, "w") as archive:
            archive.writestr("期中期末/期中模拟卷（考试版）【测试范围：第1-3章】（沪教版2023必修一）A4版.docx", BODY_SENTINEL)
            archive.writestr("期中期末/期末模拟考试试卷6（解析版）.docx", BODY_SENTINEL)
        with ZipFile(compulsory_two_unit_zip, "w") as archive:
            archive.writestr("单元测试/第6章 三角（A卷·知识通关练）（原卷版）.docx", BODY_SENTINEL)
            archive.writestr("单元测试/第7章 三角函数（B卷·能力提升练）（解析版）.docx", BODY_SENTINEL)
            archive.writestr("单元测试/第8章 平面向量（A卷·知识通关练）（原卷版）.docx", BODY_SENTINEL)
            archive.writestr("单元测试/第9章 复数（B卷·能力提升练）（解析版）.docx", BODY_SENTINEL)
        with ZipFile(compulsory_two_review_zip, "w") as archive:
            archive.writestr("期中期末/期中测试卷02（测试范围：第6-7章）（原卷版）.docx", BODY_SENTINEL)
            archive.writestr("期中期末/上海市高一数学下学期期中模拟试卷03（测试范围：三角、三角函数、平面向量）解析版.docx", BODY_SENTINEL)
            archive.writestr("期中期末/期末测试卷02（解析版）.docx", BODY_SENTINEL)
        with ZipFile(compulsory_three_unit_zip, "w") as archive:
            archive.writestr("单元测试/第10章 空间直线与平面 单元综合检测（重点）（原卷版）.docx", BODY_SENTINEL)
            archive.writestr("单元测试/第10章 空间直线与平面 单元综合检测（难点）（解析版）.docx", BODY_SENTINEL)
            archive.writestr("单元测试/第12章 概率初步 单元综合检测（解析版）.docx", BODY_SENTINEL)
            archive.writestr("单元测试/第13章 统计 单元综合检测（原卷版）.docx", BODY_SENTINEL)
        with ZipFile(compulsory_three_review_zip, "w") as archive:
            archive.writestr("期中期末/期中测试卷01（测试范围：第10-11章）（原卷版）.docx", BODY_SENTINEL)
            archive.writestr("期中期末/期中测试卷02（测试范围：第10-11章+空间向量与立体几何）（解析版）.docx", BODY_SENTINEL)
            archive.writestr("期中期末/高二数学上学期期中模拟卷（沪教版2020，高效培优·强化卷）（考试版A4）.docx", BODY_SENTINEL)
            archive.writestr("期中期末/高二数学上学期期中模拟卷（沪教版2020，高效培优·提升卷）（参考材料）.docx", BODY_SENTINEL)
            archive.writestr("期中期末/期末押题重难点检测卷（培优卷）（考试范围：沪教版必修第三册全部内容）（原卷版）.docx", BODY_SENTINEL)
            archive.writestr("期中期末/期末押题重难点检测卷（提高卷）（考试范围：沪教版必修第三册全部内容）（解析版）.docx", BODY_SENTINEL)
        with ZipFile(unit_zip, "w") as archive:
            archive.writestr(gb18030_name, BODY_SENTINEL)
            archive.writestr("单元测试/第5章 导数及其应用（B卷·能力提升练）（教师版）.docx", BODY_SENTINEL)
            archive.writestr("单元测试/第6章 计数原理（A卷·知识通关练）（学生版）.docx", BODY_SENTINEL)
            archive.writestr("单元测试/第7章 概率初步（续）（B卷·能力提升练）（教师版）.docx", BODY_SENTINEL)
            archive.writestr("单元测试/第8章 成对数据的统计分析（A卷·知识通关练）（学生版）.docx", BODY_SENTINEL)
        with ZipFile(review_zip, "w") as archive:
            archive.writestr(
                "期中期末总复习-P158/期中总复习/2026版/3-1导数的概念、意义及运算（期中复习讲义）（教师版）.docx",
                BODY_SENTINEL,
            )
            archive.writestr(
                "期中期末总复习-P158/期中总复习/2026版/专题02 圆锥曲线（期中复习专项训练）（学生版）.docx",
                BODY_SENTINEL,
            )
            archive.writestr(
                "期中期末总复习-P158/期中总复习/2026版/高二下学期期中模拟卷（试题版A4）PDF.pdf",
                BODY_SENTINEL,
            )

        manifest = build_manifest([
            compulsory_unit_zip,
            compulsory_review_zip,
            compulsory_two_unit_zip,
            compulsory_two_review_zip,
            compulsory_three_unit_zip,
            compulsory_three_review_zip,
            unit_zip,
            review_zip
        ])
        cards = draft_cards(manifest)
        out_dir = tmp_path / "out"
        write_outputs(manifest, cards, out_dir)
        output_text = "\n".join(path.read_text(encoding="utf-8") for path in out_dir.iterdir())

        assert manifest["totals"]["archives"] == 8  # type: ignore[index]
        assert manifest["totals"]["files"] == 31  # type: ignore[index]
        assert manifest["counts"]["extensions"][".docx"] == 30  # type: ignore[index]
        assert manifest["counts"]["extensions"][".pdf"] == 1  # type: ignore[index]
        assert manifest["counts"]["roles"]["student-assessment-form"] == 16  # type: ignore[index]
        assert manifest["counts"]["assessmentFamilies"]["unit-test"] == 15  # type: ignore[index]
        assert manifest["counts"]["assessmentFamilies"]["topic-review"] == 6  # type: ignore[index]
        assert manifest["counts"]["assessmentFamilies"]["midterm"] == 10  # type: ignore[index]
        assert manifest["counts"]["assessmentFamilies"]["final"] == 4  # type: ignore[index]
        assert manifest["counts"]["assessmentFamilies"]["cross-volume-review"] == 3  # type: ignore[index]
        assert manifest["counts"]["volumeScopes"]["compulsory-1"] == 6  # type: ignore[index]
        assert manifest["counts"]["volumeScopes"]["compulsory-2"] == 7  # type: ignore[index]
        assert manifest["counts"]["volumeScopes"]["compulsory-3"] == 9  # type: ignore[index]
        assert manifest["counts"]["volumeScopes"]["selective-compulsory-2"] == 6  # type: ignore[index]
        assert manifest["counts"]["volumeScopes"]["cross-volume-review"] == 3  # type: ignore[index]
        assert manifest["counts"]["chapters"]["集合与逻辑"] == 4  # type: ignore[index]
        assert manifest["counts"]["chapters"]["等式与不等式"] == 2  # type: ignore[index]
        assert manifest["counts"]["chapters"]["幂、指数与对数"] == 2  # type: ignore[index]
        assert manifest["counts"]["chapters"]["幂函数、指数函数与对数函数"] == 2  # type: ignore[index]
        assert manifest["counts"]["chapters"]["函数的概念、性质及应用"] == 2  # type: ignore[index]
        assert manifest["counts"]["chapters"]["三角"] == 4  # type: ignore[index]
        assert manifest["counts"]["chapters"]["三角函数"] == 4  # type: ignore[index]
        assert manifest["counts"]["chapters"]["平面向量"] == 3  # type: ignore[index]
        assert manifest["counts"]["chapters"]["复数"] == 2  # type: ignore[index]
        assert manifest["counts"]["chapters"]["空间直线与平面"] == 8  # type: ignore[index]
        assert manifest["counts"]["chapters"]["简单几何体"] == 6  # type: ignore[index]
        assert manifest["counts"]["chapters"]["概率初步"] == 3  # type: ignore[index]
        assert manifest["counts"]["chapters"]["统计"] == 3  # type: ignore[index]
        assert manifest["counts"]["chapters"]["空间向量及其应用"] == 1  # type: ignore[index]
        assert manifest["counts"]["chapters"]["导数及其应用"] == 3  # type: ignore[index]
        assert manifest["counts"]["chapters"]["计数原理"] == 1  # type: ignore[index]
        assert manifest["counts"]["chapters"]["概率初步续"] == 1  # type: ignore[index]
        assert manifest["counts"]["chapters"]["成对数据的统计分析"] == 1  # type: ignore[index]
        assert manifest["counts"]["difficultyBands"]["challenge"] == 8  # type: ignore[index]
        assert manifest["counts"]["difficultyBands"]["exam"] == 12  # type: ignore[index]
        assert len(cards) == 63
        assert all(card["publisher"] == "MAINLAND_HJB" for card in cards)
        assert BODY_SENTINEL not in output_text
    print("Self-test passed: metadata-only HJB assessment manifest handles Chinese archive entries and 63 safe draft cards.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local-only Mainland HJB high-school assessment metadata artifacts.")
    parser.add_argument("zip_paths", nargs="*", help="Path(s) to owner-provided HJB assessment archives.")
    parser.add_argument("--out-dir", default=None, help="Output directory. Defaults to an ignored .local/rag/ scope folder.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.zip_paths:
        raise SystemExit("At least one assessment archive path is required unless --self-test is used.")

    zip_paths = [Path(value).expanduser().resolve() for value in args.zip_paths]
    missing = [str(path) for path in zip_paths if not path.exists()]
    if missing:
        raise SystemExit(f"Archive not found: {', '.join(missing)}")
    non_archives = [str(path) for path in zip_paths if path.suffix.lower() != ".zip"]
    if non_archives:
        raise SystemExit(f"Only ZIP archives are supported: {', '.join(non_archives)}")

    manifest = build_manifest(zip_paths)
    cards = draft_cards(manifest)
    out_dir = Path(args.out_dir).expanduser() if args.out_dir else default_out_dir_for(manifest)
    write_outputs(manifest, cards, out_dir)
    print(f"Wrote {manifest['totals']['files']} metadata-only entries and {len(cards)} safe-card drafts to {out_dir}")  # type: ignore[index]


if __name__ == "__main__":
    main()
