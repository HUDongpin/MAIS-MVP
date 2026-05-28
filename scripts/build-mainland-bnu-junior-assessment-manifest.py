#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland BNU junior assessments.

Default target: owner-provided Beijing Normal University Press Grade 9 lower
unit and term assessment archives. Outputs are metadata-only and live under
ignored `.local/`. The script never extracts or writes document body text,
source item wording, answer text, worked-solution text, scoring wording, table
or figure bodies, page images, page locators, original member paths, OCR output,
archive names, source member names, source file identifiers, or vector payloads.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


DEFAULT_OUT_DIR = Path(".local/rag/mainland-bnu-junior-s3-lower-assessments")
DEFAULT_EXPECTED_SLOTS = ["S3:lower"]
SUPPORTED_EXTENSIONS = {".doc", ".docx", ".pdf"}
MANIFEST_NAME = "manifest.json"
QA_REPORT_NAME = "qa-report.md"
BODY_SENTINEL = "MAIS_BODY_SENTINEL_SHOULD_NOT_APPEAR"
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit private archives, source "
    "locators, archive names, member names, extracted document text, source "
    "item wording, answer text, worked-solution text, scoring wording, table "
    "bodies, figure bodies, page images, page-location data, OCR output, or "
    "vector payloads."
)

GRADE_MARKERS = [
    ("S1", ["七年级", "7年级", "初一", "七上", "七下", "7上", "7下"]),
    ("S2", ["八年级", "8年级", "初二", "八上", "八下", "8上", "8下"]),
    ("S3", ["九年级", "9年级", "初三", "九上", "九下", "9上", "9下"]),
]
UPPER_MARKERS = ["上册", "上学期", "七上", "八上", "九上", "7上", "8上", "9上", "第一学期"]
LOWER_MARKERS = ["下册", "下学期", "七下", "八下", "九下", "7下", "8下", "9下", "第二学期"]

BNU_UNITS_BY_SLOT = {
    "S1:lower": {
        1: (
            "整式的乘除",
            ["第一章", "第1章", "1章", "第一单元", "第1单元", "整式的乘除", "幂的运算", "整式乘除"],
            ["polynomial-multiply-divide", "exponent-laws", "multiplication-formulas"],
            "unit-polynomial-multiply-divide",
        ),
        2: (
            "相交线与平行线",
            ["第二章", "第2章", "2章", "第二单元", "第2单元", "相交线与平行线", "相交线与平行", "平行线"],
            ["intersecting-lines", "parallel-lines", "angle-relations"],
            "unit-intersecting-parallel-lines",
        ),
        3: (
            "变量之间的关系",
            ["第三章", "第3章", "3章", "第三单元", "第3单元", "变量之间的关系", "变量关系"],
            ["variables-relationships", "tables-graphs-formulas", "functional-thinking"],
            "unit-variable-relationships",
        ),
        4: (
            "三角形",
            ["第四章", "第4章", "4章", "第四单元", "第4单元", "三角形", "三边关系", "内角和"],
            ["triangles", "triangle-angle-sum", "triangle-inequality"],
            "unit-triangles",
        ),
        5: (
            "生活中的轴对称",
            ["第五章", "第5章", "5章", "第五单元", "第5单元", "生活中的轴对称", "图形的轴对称", "轴对称"],
            ["axis-symmetry", "reflection", "perpendicular-bisector"],
            "unit-axis-symmetry",
        ),
        6: (
            "概率初步",
            ["第六章", "第6章", "6章", "第六单元", "第6单元", "概率初步", "概率的初步", "随机事件"],
            ["probability-introduction", "random-events", "simple-probability"],
            "unit-probability-introduction",
        ),
    },
    "S2:lower": {
        1: (
            "三角形的证明及其应用",
            ["第一章", "第1章", "1章", "第一单元", "第1单元", "三角形的证明", "三角形证明", "等腰三角形", "直角三角形", "垂直平分线", "角平分线"],
            ["triangle-proof", "angle-sum", "isosceles-triangles", "right-triangles", "perpendicular-bisector", "angle-bisector"],
            "unit-triangle-proof",
        ),
        2: (
            "不等式与不等式组",
            ["第二章", "第2章", "2章", "第二单元", "第2单元", "不等式", "不等式组", "一元一次不等式", "不等式与一次函数"],
            ["linear-inequalities", "inequality-properties", "linear-inequalities-one-variable", "inequality-systems"],
            "unit-inequalities",
        ),
        3: (
            "图形的平移与旋转",
            ["第三章", "第3章", "3章", "第三单元", "第3单元", "平移", "旋转", "图形的平移", "图形的旋转", "图形运动"],
            ["geometric-transformations", "translation", "rotation", "pattern-design"],
            "unit-transformations",
        ),
        4: (
            "因式分解",
            ["第四章", "第4章", "4章", "第四单元", "第4单元", "因式分解", "提公因式", "公式法"],
            ["factorization", "common-factor", "formula-factorization", "polynomial-structure"],
            "unit-factorization",
        ),
        5: (
            "分式与分式方程",
            ["第五章", "第5章", "5章", "第五单元", "第5单元", "分式", "分式方程", "增根", "取值限制"],
            ["algebraic-fractions", "fraction-domain", "fraction-operations", "fraction-equations", "extraneous-solutions"],
            "unit-algebraic-fractions",
        ),
        6: (
            "平行四边形",
            ["第六章", "第6章", "6章", "第六单元", "第6单元", "平行四边形", "三角形中位线"],
            ["parallelogram", "quadrilaterals", "parallelogram-properties", "parallelogram-criteria", "triangle-midline"],
            "unit-parallelograms",
        ),
    },
    "S3:lower": {
        1: (
            "直角三角形的边角关系",
            ["第一章", "第1章", "1章", "第一单元", "第1单元", "直角三角形的边角关系", "锐角三角函数", "正弦", "余弦", "正切", "解直角三角形"],
            ["right-triangle-trigonometry", "sine-cosine-tangent", "angle-side-relationships", "applied-measurement"],
            "unit-right-triangle-trig",
        ),
        2: (
            "二次函数",
            ["第二章", "第2章", "2章", "第二单元", "第2单元", "二次函数", "抛物线", "顶点", "对称轴"],
            ["quadratic-functions", "parabola", "vertex", "axis-of-symmetry", "function-modeling"],
            "unit-quadratic-functions",
        ),
        3: (
            "圆",
            ["第三章", "第3章", "3章", "第三单元", "第3单元", "圆", "圆周角", "圆心角", "切线", "弧长", "扇形"],
            ["circle-geometry", "central-angle", "inscribed-angle", "tangent", "arc-sector"],
            "unit-circle",
        ),
        4: (
            "统计与概率",
            ["第四章", "第4章", "4章", "第四单元", "第4单元", "统计与概率", "统计", "概率", "频率", "方差", "平均数"],
            ["statistics-probability", "data-analysis", "probability", "frequency", "statistical-measures"],
            "unit-statistics-probability",
        ),
    },
}
EXPECTED_PATTERN_SLOTS_BY_SLOT = {
    "S1:lower": [
        "unit-polynomial-multiply-divide",
        "unit-intersecting-parallel-lines",
        "unit-probability-introduction",
        "unit-triangles",
        "unit-axis-symmetry",
        "unit-variable-relationships",
        "monthly-1-to-2-integrated",
        "midterm-1-to-3-integrated",
        "midterm-1-to-4-integrated",
        "final-1-to-6-integrated",
        "challenge-review",
    ],
    "S2:lower": [
        "unit-triangle-proof",
        "unit-inequalities",
        "unit-transformations",
        "unit-factorization",
        "unit-algebraic-fractions",
        "unit-parallelograms",
        "midterm-integrated",
        "final-integrated",
    ],
    "S3:lower": [
        "unit-right-triangle-trig",
        "unit-quadratic-functions",
        "unit-circle",
        "unit-statistics-probability",
        "monthly-midterm-integrated",
        "stage-integrated",
    ],
}


def contains_any(text: str, markers: list[str]) -> bool:
    return any(marker in text for marker in markers)


def sorted_unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def slot_candidates_for(grade: str, semester: str, expected_slots: list[str]) -> list[str]:
    inferred_slot = f"{grade}:{semester}"
    if inferred_slot in BNU_UNITS_BY_SLOT:
        return [inferred_slot]
    return expected_slots


def unit_maps_for_slots(expected_slots: list[str]) -> list[dict[int, tuple[str, list[str], list[str], str]]]:
    return [BNU_UNITS_BY_SLOT[slot] for slot in expected_slots if slot in BNU_UNITS_BY_SLOT]


def unit_entries_for_slots(expected_slots: list[str]) -> list[tuple[str, list[str], list[str], str]]:
    entries: list[tuple[str, list[str], list[str], str]] = []
    for unit_map in unit_maps_for_slots(expected_slots):
        entries.extend(unit_map.values())
    return entries


def target_unit_signals_for(expected_slots: list[str]) -> set[str]:
    return {unit_signal for unit_signal, _markers, _concepts, _slot in unit_entries_for_slots(expected_slots)}


def expected_pattern_slots_for(expected_slots: list[str]) -> list[str]:
    slots: list[str] = []
    for expected_slot in expected_slots:
        slots.extend(EXPECTED_PATTERN_SLOTS_BY_SLOT.get(expected_slot, []))
    return sorted_unique(slots)


def decode_zip_name(name: str) -> str:
    try:
        raw = name.encode("cp437")
    except UnicodeEncodeError:
        return name
    candidates = []
    for encoding in ("gb18030", "gbk", "utf-8"):
        try:
            candidates.append(raw.decode(encoding))
        except UnicodeDecodeError:
            pass
    for candidate in candidates:
        if contains_any(candidate, ["年级", "数学", "单元", "期中", "期末", "月考", "概率", "三角形", "二次函数", "统计", "圆", "中考", "北师大"]):
            return candidate
    return candidates[0] if candidates else name


def mojibake_zip_name(name: str) -> str:
    return name.encode("utf-8").decode("cp437")


def is_hidden_or_mac_entry(decoded_name: str) -> bool:
    parts = [part for part in decoded_name.split("/") if part]
    return "__MACOSX" in parts or any(part == ".DS_Store" or part.startswith("._") for part in parts)


def suspicious_reason(decoded_name: str) -> str | None:
    parts = [part for part in decoded_name.split("/") if part]
    if decoded_name.startswith(("/", "\\")):
        return "absolute-member-location"
    if any(part == ".." for part in parts):
        return "parent-directory-member"
    return None


def infer_grade(text: str) -> str:
    for grade, markers in GRADE_MARKERS:
        if contains_any(text, markers):
            return grade
    return "unknown"


def infer_semester(text: str) -> str:
    if contains_any(text, LOWER_MARKERS):
        return "lower"
    if contains_any(text, UPPER_MARKERS):
        return "upper"
    return "unknown"


def chinese_number_to_int(value: str) -> int | None:
    if value.isdigit():
        return int(value)
    digits = {"一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6}
    return digits.get(value)


def chapter_numbers_from_name(name: str) -> list[int]:
    numbers: list[int] = []
    range_pattern = r"第?\s*([0-9一二三四五六两]+)\s*(?:章|单元)?\s*[~～\-—至到]\s*第?\s*([0-9一二三四五六两]+)\s*(?:章|单元)?"
    for lower, upper in re.findall(range_pattern, name):
        start = chinese_number_to_int(lower)
        end = chinese_number_to_int(upper)
        if start and end and start <= end:
            numbers.extend(range(start, end + 1))
    for value in re.findall(r"第\s*([0-9一二三四五六两]+)\s*(?:章|单元)", name):
        number = chinese_number_to_int(value)
        if number:
            numbers.append(number)
    return sorted(set(number for number in numbers if 1 <= number <= 6))


def material_kinds_for(name: str) -> list[str]:
    kinds: list[str] = []
    if contains_any(name, ["单元", "章末", "测试", "检测", "测评"]):
        kinds.append("unit-test")
    if contains_any(name, ["月考", "阶段"]):
        kinds.append("monthly-assessment")
    if contains_any(name, ["专题", "专项", "培优", "基础", "能力", "提升", "训练", "压轴"]):
        kinds.append("topic-practice")
    if contains_any(name, ["期中", "期末", "模拟"]):
        kinds.append("midterm-final")
    if contains_any(name, ["综合", "全册", "全部", "模拟"]):
        kinds.append("comprehensive-assessment")
    if contains_any(name, ["复习", "冲刺", "押题", "预测", "综合", "拔高", "高频", "压轴", "高阶"]):
        kinds.append("review")
    if contains_any(name, ["试卷", "卷", "测试", "检测", "测评", "A卷", "B卷"]):
        kinds.append("paper")
    return sorted_unique(kinds) or ["paper"]


def assessment_families_for(name: str, material_kinds: list[str], unit_signals: list[str]) -> list[str]:
    families: list[str] = []
    term_scope_name = name.replace("期中期末", "")
    if "unit-test" in material_kinds:
        families.append("unit-test")
    if contains_any(name, ["月考", "阶段"]):
        families.append("monthly")
    if "期中" in term_scope_name:
        families.append("midterm")
    if "期末" in term_scope_name:
        families.append("final")
    if contains_any(name, ["专题", "专项", "复习", "高频", "基础", "提升", "压轴", "高阶", "拔高"]):
        families.append("topic-review")
    if contains_any(name, ["综合", "全册", "全部", "模拟"]) or "comprehensive-assessment" in material_kinds:
        families.append("comprehensive")
    if not families and len(unit_signals) == 1:
        families.append("unit-test")
    if not families:
        families.append("comprehensive")
    return sorted_unique(families)


def shared_zhongkao_candidate_reason(name: str) -> str | None:
    term_scope_name = name.replace("期中期末", "")
    if contains_any(term_scope_name, ["中考", "中招", "升学"]):
        return "shared-zhongkao-layer-candidate"
    if "模拟" in term_scope_name and not contains_any(term_scope_name, ["单元", "章末", "月考", "期中", "期末", "阶段"]):
        return "shared-zhongkao-layer-candidate"
    return None


def source_role_for(name: str, extension: str) -> str:
    if extension == ".pdf" or contains_any(name, ["答题卡", "答题纸", "答题支持"]):
        return "answer-card-support"
    if contains_any(name, ["全解全析", "解析", "详解", "讲评", "解答", "参考答案", "答案", "教师"]):
        return "response-support"
    if contains_any(name, ["老课标", "旧课标", "可先参考"]):
        return "legacy-reference"
    if contains_any(name, ["资源", "素材", "课件", "说明"]):
        return "assessment-resource"
    return "student-assessment"


def unit_signals_for(name: str, expected_slots: list[str]) -> list[str]:
    signals: list[str] = []
    term_scope_name = name.replace("期中期末", "")
    if contains_any(name, ["全册", "全部", "第1~6章", "第1-6章", "第一章~第六章", "第一章至第六章"]):
        signals.extend(unit[0] for unit in unit_entries_for_slots(expected_slots))
    for number in chapter_numbers_from_name(name):
        for unit_map in unit_maps_for_slots(expected_slots):
            if number in unit_map:
                signals.append(unit_map[number][0])
    for unit_signal, markers, _concepts, _slot in unit_entries_for_slots(expected_slots):
        if contains_any(name, markers):
            signals.append(unit_signal)
    if contains_any(name, ["七年级下册", "七年级数学下册", "七下", "八年级下册", "八年级数学下册", "八下", "九年级下册", "九年级数学下册", "九下"]) and contains_any(term_scope_name, ["期末", "全册", "全部"]):
        signals.extend(unit[0] for unit in unit_entries_for_slots(expected_slots))
    if "S2:lower" in expected_slots and contains_any(name, ["期中", "阶段"]):
        signals.extend(unit[0] for unit in BNU_UNITS_BY_SLOT["S2:lower"].values() if unit[3] in {
            "unit-triangle-proof",
            "unit-inequalities",
            "unit-transformations",
            "unit-factorization",
        })
    if "S3:lower" in expected_slots and contains_any(term_scope_name, ["月考", "期中"]):
        signals.extend(unit[0] for unit in BNU_UNITS_BY_SLOT["S3:lower"].values() if unit[3] in {
            "unit-right-triangle-trig",
            "unit-quadratic-functions",
        })
    if "S3:lower" in expected_slots and contains_any(term_scope_name, ["阶段综合", "全册", "全部", "期末"]):
        signals.extend(unit[0] for unit in BNU_UNITS_BY_SLOT["S3:lower"].values())
    if contains_any(name, ["高阶", "压轴", "培优", "拔高"]) and contains_any(name, ["综合", "专项", "专题", "复习"]):
        signals.extend(unit[0] for unit in unit_entries_for_slots(expected_slots))
    return sorted_unique(signals)


def concept_signals_for(unit_signals: list[str], expected_slots: list[str]) -> list[str]:
    concepts: list[str] = []
    for unit_signal in unit_signals:
        for candidate_signal, _markers, candidate_concepts, _slot in unit_entries_for_slots(expected_slots):
            if candidate_signal == unit_signal:
                concepts.extend(candidate_concepts)
    return sorted_unique(concepts)


def unit_numbers_for(unit_signals: list[str], expected_slots: list[str]) -> list[int]:
    numbers: list[int] = []
    for unit_map in unit_maps_for_slots(expected_slots):
        for number, (unit_signal, _markers, _concepts, _slot) in unit_map.items():
            if unit_signal in unit_signals:
                numbers.append(number)
    return numbers


def pattern_slots_for(name: str, unit_signals: list[str], assessment_families: list[str], expected_slots: list[str]) -> list[str]:
    slots: list[str] = []
    unit_numbers = unit_numbers_for(unit_signals, expected_slots)
    if "unit-test" in assessment_families and len(unit_signals) == 1:
        for unit_signal, _markers, _concepts, slot in unit_entries_for_slots(expected_slots):
            if unit_signal == unit_signals[0]:
                slots.append(slot)
    if "S1:lower" in expected_slots and ("monthly" in assessment_families or contains_any(name, ["第1-2章", "第1~2章", "第一章至第二章", "1-2单元"])):
        if not unit_numbers or max(unit_numbers) <= 2 or {1, 2}.issubset(unit_numbers):
            slots.append("monthly-1-to-2-integrated")
    if "S1:lower" in expected_slots and "midterm" in assessment_families:
        if {1, 2, 3, 4}.issubset(unit_numbers) or 4 in unit_numbers:
            slots.append("midterm-1-to-4-integrated")
        elif {1, 2, 3}.issubset(unit_numbers) or 3 in unit_numbers:
            slots.append("midterm-1-to-3-integrated")
        else:
            slots.append("midterm-1-to-3-integrated")
    if "S1:lower" in expected_slots and ("final" in assessment_families or contains_any(name, ["全册", "第1-6章", "第1~6章", "第一章至第六章"])):
        slots.append("final-1-to-6-integrated")
    if "S1:lower" in expected_slots and "topic-review" in assessment_families and contains_any(name, ["压轴", "高阶", "培优", "拔高", "专题", "专项"]):
        slots.append("challenge-review")
    if "S2:lower" in expected_slots and "midterm" in assessment_families:
        slots.append("midterm-integrated")
    if "S2:lower" in expected_slots and ("final" in assessment_families or "comprehensive" in assessment_families):
        slots.append("final-integrated")
    if "S3:lower" in expected_slots and ("monthly" in assessment_families or "midterm" in assessment_families or contains_any(name, ["第1-2章", "第1~2章", "第一章至第二章", "1-2单元"])):
        if not unit_numbers or max(unit_numbers) <= 2 or {1, 2}.issubset(unit_numbers):
            slots.append("monthly-midterm-integrated")
    if "S3:lower" in expected_slots and (
        "final" in assessment_families
        or contains_any(name, ["阶段综合", "全册", "全部", "期末"])
    ):
        slots.append("stage-integrated")
    return sorted_unique(slots)


def alignment_status(
    grade: str,
    semester: str,
    source_role: str,
    unit_signals: list[str],
    suspicious: str | None,
    expected_slots: list[str],
    name: str,
) -> tuple[str, str]:
    if suspicious:
        return "quarantine", suspicious
    shared_candidate_reason = shared_zhongkao_candidate_reason(name)
    if shared_candidate_reason:
        return "quarantine", shared_candidate_reason
    if f"{grade}:{semester}" not in expected_slots:
        return "quarantine", "unsupported-grade-semester"
    if source_role == "legacy-reference":
        return "legacy-reference-only", "legacy-curriculum-local-reference"
    if source_role in {"answer-card-support", "response-support"}:
        return "support-only", ""
    if not set(unit_signals).intersection(target_unit_signals_for(expected_slots)):
        return "needs-s18-review", "insufficient-explicit-target-unit-signal"
    return "current-safe-candidate", ""


def extraction_quality_for(source_role: str, extension: str, unit_signals: list[str]) -> str:
    if source_role == "answer-card-support":
        return "support-artifact-excluded"
    if source_role == "response-support":
        return "answer-or-solution-support-excluded"
    if source_role == "legacy-reference":
        return "legacy-reference-excluded"
    if extension == ".doc":
        return "needs-doc-conversion-review"
    if not unit_signals:
        return "needs-s18-mapping-review"
    return "metadata-ready"


def classify_archive_entry(
    archive: ZipFile,
    info: ZipInfo,
    ordinal: int,
    searchable_context: str,
    expected_slots: list[str],
) -> tuple[dict[str, object] | None, dict[str, object] | None, str | None]:
    decoded_name = decode_zip_name(info.filename)
    if decoded_name.endswith("/") or is_hidden_or_mac_entry(decoded_name):
        return None, None, None
    extension = Path(decoded_name).suffix.lower()
    suspicious = suspicious_reason(decoded_name)
    if suspicious or extension not in SUPPORTED_EXTENSIONS:
        return None, {
            "archiveOrdinal": None,
            "extension": extension or "<none>",
            "reason": suspicious or "unsupported-extension",
        }, None

    searchable = f"{searchable_context} {decoded_name}"
    grade = infer_grade(decoded_name)
    if grade == "unknown":
        grade = infer_grade(searchable_context)
    semester = infer_semester(decoded_name)
    if semester == "unknown":
        semester = infer_semester(searchable_context)
    unit_signals = unit_signals_for(searchable, expected_slots)
    leaf_name = decoded_name.split("/")[-1]
    material_kinds = material_kinds_for(leaf_name)
    assessment_families = assessment_families_for(leaf_name, material_kinds, unit_signals)
    role_name = decoded_name if contains_any(decoded_name, ["老课标", "旧课标", "可先参考"]) else leaf_name
    source_role = source_role_for(role_name, extension)
    status, reason = alignment_status(grade, semester, source_role, unit_signals, suspicious, expected_slots, leaf_name)
    pattern_slots = pattern_slots_for(leaf_name, unit_signals, assessment_families, expected_slots)
    dedupe_key = f"{info.file_size}:{info.CRC:08x}"

    return {
        "id": f"bnu-junior-{grade.lower()}-{semester}-assessment-entry-{ordinal:04d}",
        "publisher": "MAINLAND_BNU",
        "stage": "junior-secondary",
        "grade": grade,
        "semester": semester,
        "extension": extension,
        "sourceRole": source_role,
        "materialKinds": material_kinds,
        "assessmentFamilies": assessment_families,
        "unitSignals": unit_signals,
        "conceptSignals": concept_signals_for(unit_signals, expected_slots),
        "patternSlots": pattern_slots,
        "alignmentStatus": status,
        "quarantineReason": reason,
        "patternMiningEligible": status == "current-safe-candidate" and source_role == "student-assessment",
        "extractionQuality": extraction_quality_for(source_role, extension, unit_signals),
        "retentionPolicy": "metadata-only-local",
        "safetyNote": SAFETY_NOTE,
    }, None, dedupe_key


def sorted_counter(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted(counter.items(), key=lambda item: (-item[1], item[0])))


def count_by(entries: list[dict[str, object]], field: str) -> dict[str, int]:
    return sorted_counter(Counter(str(entry.get(field) or "unknown") for entry in entries))


def list_count(entries: list[dict[str, object]], field: str) -> dict[str, int]:
    counts: Counter[str] = Counter()
    for entry in entries:
        values = entry.get(field)
        if isinstance(values, list) and values:
            counts.update(str(value) for value in values)
        else:
            counts["unknown"] += 1
    return sorted_counter(counts)


def parse_expected_slot(slot: str) -> str:
    grade, separator, semester = slot.strip().partition(":")
    if not separator or grade not in {"S1", "S2", "S3"} or semester not in {"upper", "lower"}:
        raise ValueError(f"Unsupported expected slot: {slot}")
    return f"{grade}:{semester}"


def apply_duplicate_groups(entries: list[dict[str, object]], dedupe_keys: dict[str, str]) -> dict[str, int]:
    duplicate_counts = [count for count in Counter(dedupe_keys.values()).values() if count > 1]
    duplicate_keys = sorted(key for key, count in Counter(dedupe_keys.values()).items() if count > 1)
    group_labels = {key: f"duplicate-group-{index + 1:03d}" for index, key in enumerate(duplicate_keys)}
    for entry in entries:
        entry_id = str(entry["id"])
        duplicate_group = group_labels.get(dedupe_keys.get(entry_id, ""))
        if duplicate_group:
            entry["duplicateGroup"] = duplicate_group
    return {
        "duplicateGroups": len(duplicate_counts),
        "duplicateFileEntries": sum(duplicate_counts),
        "largestDuplicateGroup": max(duplicate_counts, default=0),
    }


def coverage(entries: list[dict[str, object]], expected_slots: list[str]) -> dict[str, object]:
    safe_or_support = [
        entry for entry in entries
        if entry["alignmentStatus"] in {"current-safe-candidate", "support-only", "legacy-reference-only", "needs-s18-review"}
    ]
    slot_counts = Counter(f"{entry['grade']}:{entry['semester']}" for entry in safe_or_support)
    target_unit_signals = target_unit_signals_for(expected_slots)
    expected_pattern_slots = expected_pattern_slots_for(expected_slots)
    unit_coverage = {
        unit_signal: sum(1 for entry in safe_or_support if unit_signal in entry.get("unitSignals", []))
        for unit_signal in sorted(target_unit_signals)
    }
    pattern_slot_coverage = {
        pattern_slot: sum(1 for entry in safe_or_support if pattern_slot in entry.get("patternSlots", []))
        for pattern_slot in expected_pattern_slots
    }
    return {
        "expectedSlots": expected_slots,
        "expectedSlotCoverage": {slot: slot_counts.get(slot, 0) for slot in expected_slots},
        "expectedSlotsComplete": all(slot_counts.get(slot, 0) > 0 for slot in expected_slots),
        "targetUnitCoverage": unit_coverage,
        "targetUnitsComplete": all(count > 0 for count in unit_coverage.values()),
        "targetPatternSlotCoverage": pattern_slot_coverage,
        "targetPatternSlotsComplete": all(count > 0 for count in pattern_slot_coverage.values()),
        "patternMiningEligibleFiles": sum(1 for entry in entries if entry.get("patternMiningEligible") is True),
        "supportArtifactsExcluded": sum(1 for entry in entries if entry.get("sourceRole") in {"answer-card-support", "response-support"} and entry.get("patternMiningEligible") is False),
    }


def manual_review_queue(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    queue = []
    for entry in entries:
        if entry.get("alignmentStatus") not in {"needs-s18-review", "quarantine", "legacy-reference-only"}:
            continue
        queue.append({
            "id": entry["id"],
            "grade": entry["grade"],
            "semester": entry["semester"],
            "extension": entry["extension"],
            "sourceRole": entry["sourceRole"],
            "materialKinds": entry["materialKinds"],
            "assessmentFamilies": entry["assessmentFamilies"],
            "unitSignals": entry["unitSignals"],
            "patternSlots": entry["patternSlots"],
            "alignmentStatus": entry["alignmentStatus"],
            "quarantineReason": entry["quarantineReason"],
            "patternMiningEligible": entry["patternMiningEligible"],
        })
    return queue


def build_manifest(zip_paths: list[Path], expected_slots: list[str] | None = None) -> dict[str, object]:
    entries: list[dict[str, object]] = []
    ignored_entries: list[dict[str, object]] = []
    archives: list[dict[str, object]] = []
    dedupe_keys: dict[str, str] = {}
    slots = expected_slots or DEFAULT_EXPECTED_SLOTS
    ordinal = 0
    for archive_index, input_path in enumerate(zip_paths, start=1):
        zip_path = input_path.expanduser().resolve()
        if not zip_path.exists():
            raise FileNotFoundError("Archive not found.")
        if zip_path.suffix.lower() != ".zip":
            raise ValueError("Expected ZIP archive.")
        searchable_context = zip_path.parent.name
        visible_entries = visible_files = hidden_entries = ignored_visible_files = 0
        before_count = len(entries)
        with ZipFile(zip_path) as archive:
            for info in archive.infolist():
                decoded_name = decode_zip_name(info.filename)
                if is_hidden_or_mac_entry(decoded_name):
                    hidden_entries += 1
                    continue
                visible_entries += 1
                if decoded_name.endswith("/"):
                    continue
                visible_files += 1
                ordinal += 1
                entry, ignored, dedupe_key = classify_archive_entry(archive, info, ordinal, searchable_context, slots)
                if entry:
                    entries.append(entry)
                    if dedupe_key:
                        dedupe_keys[str(entry["id"])] = dedupe_key
                if ignored:
                    ignored_visible_files += 1
                    ignored["archiveOrdinal"] = archive_index
                    ignored_entries.append(ignored)
        archive_entries = entries[before_count:]
        archives.append({
            "archiveOrdinal": archive_index,
            "visibleEntries": visible_entries,
            "visibleFiles": visible_files,
            "manifestedFiles": len(archive_entries),
            "hiddenArchiveEntriesExcluded": hidden_entries,
            "ignoredVisibleFiles": ignored_visible_files,
            "alignmentStatusCounts": count_by(archive_entries, "alignmentStatus"),
        })

    duplicate_stats = apply_duplicate_groups(entries, dedupe_keys)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_BNU",
        "stage": "junior-secondary",
        "gradeSemesterTarget": ",".join(slots),
        "artifactKind": "metadata-only-bnu-junior-assessment-manifest",
        "safetyPolicy": "metadata-only-local",
        "safetyNote": SAFETY_NOTE,
        "archives": archives,
        "coverage": coverage(entries, slots),
        "duplicateStats": duplicate_stats,
        "totals": {
            "archives": len(zip_paths),
            "files": len(entries),
            "ignoredVisibleFiles": len(ignored_entries),
            "currentSafeCandidateFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "current-safe-candidate"),
            "supportOnlyFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "support-only"),
            "legacyReferenceOnlyFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "legacy-reference-only"),
            "needsS18ReviewFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "needs-s18-review"),
            "quarantinedFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "quarantine"),
        },
        "counts": {
            "extensions": count_by(entries, "extension"),
            "alignmentStatus": count_by(entries, "alignmentStatus"),
            "quarantineReasons": count_by([entry for entry in entries if entry["quarantineReason"]], "quarantineReason"),
            "materialKinds": list_count(entries, "materialKinds"),
            "assessmentFamilies": list_count(entries, "assessmentFamilies"),
            "unitSignals": list_count(entries, "unitSignals"),
            "patternSlots": list_count(entries, "patternSlots"),
            "sourceRoles": count_by(entries, "sourceRole"),
            "extractionQuality": count_by(entries, "extractionQuality"),
        },
        "ignoredEntries": ignored_entries,
        "manualReviewQueue": manual_review_queue(entries),
        "entries": entries,
    }


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage_info = manifest["coverage"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    return "\n".join([
        "# Mainland BNU Junior Assessment Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Stage: {manifest['stage']}",
        f"- Target: {manifest['gradeSemesterTarget']}",
        f"- Archives inspected: {totals['archives']}",
        f"- Files manifested: {totals['files']}",
        f"- Current safe candidate files: {totals['currentSafeCandidateFiles']}",
        f"- Support-only files: {totals['supportOnlyFiles']}",
        f"- Legacy-reference-only files: {totals['legacyReferenceOnlyFiles']}",
        f"- Needs S18 review files: {totals['needsS18ReviewFiles']}",
        f"- Quarantined files: {totals['quarantinedFiles']}",
        f"- Ignored visible files: {totals['ignoredVisibleFiles']}",
        f"- Expected slot coverage: {json.dumps(coverage_info['expectedSlotCoverage'], ensure_ascii=False)}",
        f"- Target unit coverage: {json.dumps(coverage_info['targetUnitCoverage'], ensure_ascii=False)}",
        f"- Target pattern slot coverage: {json.dumps(coverage_info['targetPatternSlotCoverage'], ensure_ascii=False)}",
        f"- Pattern-mining eligible files: {coverage_info['patternMiningEligibleFiles']}",
        f"- Support artifacts excluded: {coverage_info['supportArtifactsExcluded']}",
        f"- Extension counts: {json.dumps(counts['extensions'], ensure_ascii=False)}",
        f"- Alignment status counts: {json.dumps(counts['alignmentStatus'], ensure_ascii=False)}",
        f"- Material-kind counts: {json.dumps(counts['materialKinds'], ensure_ascii=False)}",
        f"- Assessment-family counts: {json.dumps(counts['assessmentFamilies'], ensure_ascii=False)}",
        f"- Unit-signal counts: {json.dumps(counts['unitSignals'], ensure_ascii=False)}",
        f"- Pattern-slot counts: {json.dumps(counts['patternSlots'], ensure_ascii=False)}",
        f"- Source-role counts: {json.dumps(counts['sourceRoles'], ensure_ascii=False)}",
        f"- Extraction-quality counts: {json.dumps(counts['extractionQuality'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: metadata only; no document bodies, source member paths, source member names, archive names, page locators, OCR output, or vector payloads are written.",
        "- Passed: answer/solution support and answer-card artifacts are marked `patternMiningEligible=false`.",
        "- Required before student-facing use: S18 reviews future generated MAIS practice for originality, mathematics, terminology, and grade fit.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / MANIFEST_NAME).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / QA_REPORT_NAME).write_text(qa_report(manifest), encoding="utf-8")


def run_s1_lower_self_test() -> None:
    with TemporaryDirectory() as tmp:
        source_dir = Path(tmp) / "七年级数学下册（北师大版）"
        source_dir.mkdir(parents=True)
        unit_zip = source_dir / "unit-assessment-archive.zip"
        period_zip = source_dir / "term-review-archive.zip"
        with ZipFile(unit_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("unit/第一章 整式的乘除 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第二章 相交线与平行线 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第三章 变量之间的关系 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第四章 三角形 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第五章 生活中的轴对称 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第六章 概率初步 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("__MACOSX/._hidden.docx"), b"hidden")
            archive.writestr(mojibake_zip_name("unit/metadata-link.url"), b"https://example.invalid")
        with ZipFile(period_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("term/月考 第1-2章 阶段检测 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/期中 第1-3章 综合测评 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/期中 第1-4章 综合测评 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/期末 第1-6章 全册综合 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/期中期末 高阶综合 专项复习 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/期末 答题支持.pdf"), b"%PDF " + BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/老课标内容 第三章 变量之间的关系 参考材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/八年级下册 第1章 期中材料.docx"), BODY_SENTINEL.encode("utf-8"))

        manifest = build_manifest([unit_zip, period_zip], expected_slots=["S1:lower"])
        serialized = json.dumps(manifest, ensure_ascii=False)
        assert manifest["totals"]["files"] == 14  # type: ignore[index]
        assert manifest["totals"]["ignoredVisibleFiles"] == 1  # type: ignore[index]
        assert manifest["totals"]["currentSafeCandidateFiles"] == 11  # type: ignore[index]
        assert manifest["totals"]["supportOnlyFiles"] == 1  # type: ignore[index]
        assert manifest["totals"]["legacyReferenceOnlyFiles"] == 1  # type: ignore[index]
        assert manifest["totals"]["needsS18ReviewFiles"] == 0  # type: ignore[index]
        assert manifest["totals"]["quarantinedFiles"] == 1  # type: ignore[index]
        assert manifest["coverage"]["expectedSlotCoverage"]["S1:lower"] == 13  # type: ignore[index]
        assert manifest["coverage"]["targetUnitsComplete"] is True  # type: ignore[index]
        assert manifest["coverage"]["targetPatternSlotsComplete"] is True  # type: ignore[index]
        assert manifest["coverage"]["supportArtifactsExcluded"] == 1  # type: ignore[index]
        assert manifest["counts"]["extensions"] == {".docx": 13, ".pdf": 1}  # type: ignore[index]
        assert manifest["duplicateStats"]["duplicateGroups"] >= 1  # type: ignore[index]
        for forbidden in [
            "archiveName",
            "memberName",
            "sourcePath",
            "entryPath",
            "fileName",
            "sourceFile",
            "unit/第一章",
            "期末 答题支持.pdf",
            BODY_SENTINEL,
        ]:
            assert forbidden not in serialized
    print("Self-test passed: metadata-only BNU junior S1 lower assessment manifest built without content extraction.")


def run_s2_lower_self_test() -> None:
    with TemporaryDirectory() as tmp:
        source_dir = Path(tmp) / "八年级数学下册（北师大版）"
        source_dir.mkdir(parents=True)
        unit_zip = source_dir / "unit-assessment-archive.zip"
        period_zip = source_dir / "term-review-archive.zip"
        with ZipFile(unit_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("unit/第一章 三角形的证明 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第二章 不等式与不等式组 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第三章 图形的平移与旋转 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第四章 因式分解 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第五章 分式与分式方程 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第六章 平行四边形 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("__MACOSX/._hidden.docx"), b"hidden")
            archive.writestr(mojibake_zip_name("unit/metadata-link.url"), b"https://example.invalid")
        with ZipFile(period_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("term/期中 第1-4章 综合测评 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/期中 第1-4章 综合测评 答案.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/期末 第1-6章 全册综合 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/期末 全册复习 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/期末 答题支持.pdf"), b"%PDF " + BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/七年级下册 第一章 整式的乘除 参考材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/八年级下册 泛化材料.docx"), BODY_SENTINEL.encode("utf-8"))

        manifest = build_manifest([unit_zip, period_zip], expected_slots=["S2:lower"])
        serialized = json.dumps(manifest, ensure_ascii=False)
        assert manifest["totals"]["files"] == 13  # type: ignore[index]
        assert manifest["totals"]["ignoredVisibleFiles"] == 1  # type: ignore[index]
        assert manifest["totals"]["currentSafeCandidateFiles"] == 9  # type: ignore[index]
        assert manifest["totals"]["supportOnlyFiles"] == 2  # type: ignore[index]
        assert manifest["totals"]["legacyReferenceOnlyFiles"] == 0  # type: ignore[index]
        assert manifest["totals"]["needsS18ReviewFiles"] == 1  # type: ignore[index]
        assert manifest["totals"]["quarantinedFiles"] == 1  # type: ignore[index]
        assert manifest["coverage"]["expectedSlotCoverage"]["S2:lower"] == 12  # type: ignore[index]
        assert manifest["coverage"]["targetUnitsComplete"] is True  # type: ignore[index]
        assert manifest["coverage"]["targetPatternSlotsComplete"] is True  # type: ignore[index]
        assert manifest["coverage"]["supportArtifactsExcluded"] == 2  # type: ignore[index]
        assert manifest["counts"]["extensions"] == {".docx": 12, ".pdf": 1}  # type: ignore[index]
        assert manifest["duplicateStats"]["duplicateGroups"] >= 1  # type: ignore[index]
        for forbidden in [
            "archiveName",
            "memberName",
            "sourcePath",
            "entryPath",
            "fileName",
            "sourceFile",
            "unit/第一章",
            "期末 答题支持.pdf",
            BODY_SENTINEL,
        ]:
            assert forbidden not in serialized
    print("Self-test passed: metadata-only BNU junior S2 lower assessment manifest built without content extraction.")


def run_s3_lower_self_test() -> None:
    with TemporaryDirectory() as tmp:
        source_dir = Path(tmp) / "九年级数学下册（北师大版）"
        mixed_dir = Path(tmp) / "期中期末混合资料"
        source_dir.mkdir(parents=True)
        mixed_dir.mkdir(parents=True)
        unit_zip = source_dir / "unit-assessment-archive.zip"
        period_zip = mixed_dir / "term-review-archive.zip"
        with ZipFile(unit_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("unit/第一章 直角三角形的边角关系 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第二章 二次函数 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第三章 圆 单元测试 学生材料.doc"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("unit/第四章 统计与概率 单元测试 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("__MACOSX/._hidden.docx"), b"hidden")
            archive.writestr(mojibake_zip_name("unit/metadata-link.url"), b"https://example.invalid")
        with ZipFile(period_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("term/九年级下册 月考 第一章至第二章 阶段检测 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/九年级下册 期中 第1-2章 综合测评 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/九年级下册 阶段综合 全册复习 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/九年级下册 期末 全册综合 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/九年级下册 期中 第一章至第二章 答案解析.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/中考模拟 二次函数 圆 综合训练.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/九年级上册 期末 二次函数 综合.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("term/综合材料 未知范围 学生材料.docx"), BODY_SENTINEL.encode("utf-8"))

        manifest = build_manifest([unit_zip, period_zip], expected_slots=["S3:lower"])
        serialized = json.dumps(manifest, ensure_ascii=False)
        assert manifest["totals"]["files"] == 12  # type: ignore[index]
        assert manifest["totals"]["ignoredVisibleFiles"] == 1  # type: ignore[index]
        assert manifest["totals"]["currentSafeCandidateFiles"] == 8  # type: ignore[index]
        assert manifest["totals"]["supportOnlyFiles"] == 1  # type: ignore[index]
        assert manifest["totals"]["legacyReferenceOnlyFiles"] == 0  # type: ignore[index]
        assert manifest["totals"]["needsS18ReviewFiles"] == 0  # type: ignore[index]
        assert manifest["totals"]["quarantinedFiles"] == 3  # type: ignore[index]
        assert manifest["coverage"]["expectedSlotCoverage"]["S3:lower"] == 9  # type: ignore[index]
        assert manifest["coverage"]["targetUnitsComplete"] is True  # type: ignore[index]
        assert manifest["coverage"]["targetPatternSlotsComplete"] is True  # type: ignore[index]
        assert manifest["coverage"]["supportArtifactsExcluded"] == 1  # type: ignore[index]
        assert manifest["coverage"]["targetPatternSlotCoverage"]["monthly-midterm-integrated"] >= 2  # type: ignore[index]
        assert manifest["coverage"]["targetPatternSlotCoverage"]["stage-integrated"] >= 2  # type: ignore[index]
        assert manifest["counts"]["extensions"] == {".docx": 11, ".doc": 1}  # type: ignore[index]
        assert manifest["counts"]["quarantineReasons"]["shared-zhongkao-layer-candidate"] == 1  # type: ignore[index]
        assert manifest["counts"]["quarantineReasons"]["unsupported-grade-semester"] == 2  # type: ignore[index]
        assert manifest["duplicateStats"]["duplicateGroups"] >= 1  # type: ignore[index]
        for forbidden in [
            "archiveName",
            "memberName",
            "sourcePath",
            "entryPath",
            "fileName",
            "sourceFile",
            "unit/第一章",
            "期中 第一章",
            "中考模拟",
            "九年级上册 期末",
            BODY_SENTINEL,
        ]:
            assert forbidden not in serialized
    print("Self-test passed: metadata-only BNU junior S3 lower assessment manifest built without content extraction.")


def run_self_test() -> None:
    run_s1_lower_self_test()
    run_s2_lower_self_test()
    run_s3_lower_self_test()


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland BNU junior assessment archive metadata manifest.")
    parser.add_argument("zip_paths", nargs="*", help="Paths to private BNU junior assessment ZIP archives.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--expected-slot", action="append", default=None, help="Expected grade-semester slot such as S1:lower, S2:lower, or S3:lower. Repeat for multiple slots.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test with temporary fake ZIP archives.")
    args = parser.parse_args()
    if args.self_test:
        run_self_test()
        return
    if not args.zip_paths:
        raise SystemExit("At least one ZIP path is required unless --self-test is used.")
    expected_slots = [parse_expected_slot(slot) for slot in (args.expected_slot or [])] or None
    manifest = build_manifest([Path(path) for path in args.zip_paths], expected_slots)
    write_outputs(manifest, Path(args.out_dir).expanduser())
    print(f"Wrote {manifest['totals']['files']} metadata-only BNU junior assessment entries for {manifest['gradeSemesterTarget']} to {args.out_dir}")


if __name__ == "__main__":
    main()
