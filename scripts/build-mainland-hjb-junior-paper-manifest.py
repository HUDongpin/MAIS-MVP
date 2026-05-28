#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland HJB junior paper archives.

The default scope is HJB S2 upper paper-package intake. The script reads ZIP
member metadata and hashes only. It never extracts or writes document body text,
protected prompt wording, worked-response wording, scoring wording, table bodies,
figure bodies, page images, page locators, OCR text, embeddings, or source item
wording. Default outputs live under `.local/`, which is ignored by the repo.
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
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


DEFAULT_OUT_DIR = Path(".local/rag/mainland-hjb-junior-papers")
DEFAULT_EXPECTED_SLOTS = ["S2:upper"]
MANIFEST_NAME = "manifest.json"
QA_REPORT_NAME = "qa-report.md"
BODY_SENTINEL = "MAIS_BODY_SENTINEL_SHOULD_NOT_APPEAR"
SUPPORTED_EXTENSIONS = {".doc", ".docx", ".pdf"}
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source archives, extracted "
    "document body text, protected prompt wording, worked-response wording, "
    "scoring wording, OCR text, table bodies, figure bodies, page images, "
    "page locators, archive member paths, or embeddings."
)

GRADE_MARKERS = [
    ("S1", ["七年级", "7年级", "初一", "七上", "七下", "7上", "7下", "S1", "s1"]),
    ("S2", ["八年级", "8年级", "初二", "八上", "八下", "8上", "8下", "S2", "s2"]),
    ("S3", ["九年级", "9年级", "初三", "九上", "九下", "9上", "9下", "S3", "s3"]),
]
UPPER_SEMESTER_MARKERS = ["上册", "上学期", "七上", "八上", "九上", "7上", "8上", "9上", "第一学期", "秋季", "upper"]
LOWER_SEMESTER_MARKERS = ["下册", "下学期", "七下", "八下", "九下", "7下", "8下", "9下", "第二学期", "春季", "lower"]

HJB_ALIGNED_UNIT_SIGNALS_BY_SLOT = {
    "S1:lower": {"一元一次不等式", "相交线与平行线", "三角形", "等腰三角形", "期中综合", "期末综合"},
    "S2:upper": {"实数", "二次根式", "一元二次方程", "直角三角形", "期中综合", "期末综合"},
    "S2:lower": {"四边形", "平面直角坐标系", "一次函数", "反比例函数", "期中综合", "期末综合"},
    "S3:upper": {"相似三角形", "锐角的三角比", "二次函数", "期中综合", "期末综合"},
    "S3:lower": {"圆与正多边形", "统计初步", "期中综合", "期末综合"},
}

UNIT_SIGNAL_CHECKS_BY_SLOT = {
    "S1:lower": [
        ("一元一次不等式", ["第15章", "第十五章", "一元一次不等式", "不等式组", "不等式"]),
        ("相交线与平行线", ["第16章", "第十六章", "相交线", "平行线", "对顶角", "邻补角", "同位角", "内错角", "同旁内角"]),
        ("三角形", ["第17章", "第十七章", "三角形", "三边关系", "内角和", "外角"]),
        ("等腰三角形", ["第18章", "第十八章", "等腰三角形", "线段垂直平分线", "等边三角形"]),
        ("平面直角坐标系", ["平面直角坐标系", "坐标系", "点的坐标", "象限", "坐标"]),
        ("期中综合", ["期中", "月考", "3月", "三月"]),
        ("期末综合", ["期末"]),
    ],
    "S2:upper": [
        ("实数", ["第19章", "第十九章", "实数", "平方根", "立方根", "无理数", "算术平方根"]),
        ("二次根式", ["第20章", "第二十章", "二次根式", "最简二次根式", "分母有理化", "根式"]),
        ("一元二次方程", ["第21章", "第二十一章", "一元二次方程", "判别式", "配方法", "公式法", "根与系数"]),
        ("直角三角形", ["第22章", "第二十二章", "直角三角形", "勾股定理", "勾股逆定理", "勾股"]),
        ("期中综合", ["期中", "月考", "10月", "十一月", "11月"]),
        ("期末综合", ["期末"]),
    ],
    "S2:lower": [
        ("四边形", ["第22章", "第二十二章", "四边形", "平行四边形", "矩形", "菱形", "正方形", "中位线", "重心"]),
        ("平面直角坐标系", ["第24章", "第二十四章", "平面直角坐标系", "坐标系", "点的坐标", "象限", "坐标"]),
        ("一次函数", ["第20章", "第二十章", "一次函数", "正比例函数", "函数图象", "函数图像", "待定系数"]),
        ("反比例函数", ["反比例函数", "双曲线", "比例系数"]),
        ("期中综合", ["期中", "月考", "3月", "三月"]),
        ("期末综合", ["期末"]),
    ],
    "S3:upper": [
        ("相似三角形", ["第24章", "第二十四章", "相似三角形", "相似形", "相似", "成比例线段", "位似"]),
        ("锐角的三角比", ["第25章", "第二十五章", "锐角的三角比", "锐角三角比", "锐角三角形比", "三角比", "正弦", "余弦", "正切"]),
        ("二次函数", ["第26章", "第二十六章", "二次函数", "抛物线", "顶点", "对称轴"]),
        ("期中综合", ["期中", "月考", "10月", "十一月", "11月", "一模"]),
        ("期末综合", ["期末", "一模"]),
    ],
    "S3:lower": [
        ("圆与正多边形", ["第27章", "第二十七章", "圆与正多边形", "圆", "正多边形", "圆心角", "弧", "弦", "切线", "垂径定理"]),
        ("统计初步", ["第28章", "第二十八章", "统计初步", "统计", "平均数", "中位数", "众数", "方差", "数据"]),
        ("期中综合", ["期中", "月考", "3月", "三月", "第二十七章", "第27章"]),
        ("期末综合", ["期末", "全册", "综合"]),
    ],
}

GENERIC_UNIT_SIGNAL_CHECKS = [
    ("一元一次不等式", ["一元一次不等式", "不等式组", "不等式"]),
    ("相交线与平行线", ["相交线", "平行线", "对顶角", "邻补角", "同位角", "内错角", "同旁内角"]),
    ("三角形", ["三角形", "三边关系", "内角和", "外角"]),
    ("等腰三角形", ["等腰三角形", "线段垂直平分线", "等边三角形"]),
    ("实数", ["实数", "平方根", "立方根", "无理数", "算术平方根"]),
    ("二次根式", ["二次根式", "最简二次根式", "分母有理化", "根式"]),
    ("一元二次方程", ["一元二次方程", "判别式", "配方法", "公式法", "根与系数"]),
    ("直角三角形", ["直角三角形", "勾股定理", "勾股逆定理", "勾股"]),
    ("四边形", ["四边形", "平行四边形", "矩形", "菱形", "正方形", "中位线", "重心"]),
    ("平面直角坐标系", ["平面直角坐标系", "坐标系", "点的坐标", "象限", "坐标"]),
    ("一次函数", ["一次函数", "正比例函数", "函数图象", "函数图像", "待定系数"]),
    ("反比例函数", ["反比例函数", "双曲线", "比例系数"]),
    ("相似三角形", ["相似三角形", "相似形", "成比例线段", "位似"]),
    ("锐角的三角比", ["锐角的三角比", "锐角三角比", "锐角三角形比", "三角比", "正弦", "余弦", "正切"]),
    ("二次函数", ["二次函数", "抛物线", "顶点", "对称轴"]),
    ("圆与正多边形", ["圆与正多边形", "正多边形", "圆心角", "弧", "弦", "切线", "垂径定理"]),
    ("统计初步", ["统计初步", "统计", "平均数", "中位数", "众数", "方差", "数据"]),
    ("期中综合", ["期中", "月考"]),
    ("期末综合", ["期末"]),
]

QUARANTINE_SIGNAL_CHECKS = [
    ("代数方程", ["代数方程"]),
    ("概率初步", ["概率", "随机事件", "树状图", "列表法"]),
    ("一元一次方程", ["一元一次方程"]),
    ("轴对称", ["轴对称"]),
    ("实数", ["实数", "平方根", "立方根", "无理数"]),
    ("二次根式", ["二次根式", "根式"]),
    ("一元二次方程", ["一元二次方程"]),
    ("直角三角形", ["直角三角形", "勾股定理", "勾股"]),
    ("四边形", ["四边形", "平行四边形", "矩形", "菱形", "正方形"]),
    ("平面直角坐标系", ["平面直角坐标系", "坐标系", "坐标"]),
    ("一次函数", ["一次函数", "正比例函数"]),
    ("反比例函数", ["反比例函数"]),
    ("圆与正多边形", ["圆", "正多边形", "切线", "弧", "弦"]),
    ("统计初步", ["统计", "平均数", "中位数", "众数", "方差"]),
]

CHAPTER_UNIT_BY_SLOT = {
    "S1:lower": {
        15: "一元一次不等式",
        16: "相交线与平行线",
        17: "三角形",
        18: "等腰三角形",
    },
    "S2:upper": {
        19: "实数",
        20: "二次根式",
        21: "一元二次方程",
        22: "直角三角形",
    },
    "S2:lower": {
        20: "一次函数",
        22: "四边形",
        24: "平面直角坐标系",
    },
    "S3:upper": {
        24: "相似三角形",
        25: "锐角的三角比",
        26: "二次函数",
    },
    "S3:lower": {
        27: "圆与正多边形",
        28: "统计初步",
    },
}

CHAPTER_UNIT_CONTENT_MARKERS_BY_SLOT = {
    "S1:lower": {
        15: ["一元一次不等式", "不等式组", "不等式"],
        16: ["相交线", "平行线"],
        17: ["三角形", "三边关系", "内角和", "外角"],
        18: ["等腰三角形", "线段垂直平分线", "等边三角形"],
    },
    "S2:upper": {
        19: ["实数", "平方根", "立方根", "无理数"],
        20: ["二次根式", "根式"],
        21: ["一元二次方程", "判别式", "配方法", "公式法"],
        22: ["直角三角形", "勾股定理", "勾股"],
    },
    "S2:lower": {
        20: ["一次函数", "正比例函数"],
        22: ["四边形", "平行四边形", "矩形", "菱形", "正方形"],
        24: ["平面直角坐标系", "坐标系", "坐标"],
    },
    "S3:upper": {
        24: ["相似三角形", "相似形", "相似"],
        25: ["锐角的三角比", "锐角三角比", "锐角三角形比", "三角比"],
        26: ["二次函数", "抛物线"],
    },
    "S3:lower": {
        27: ["第27章", "第二十七章", "圆与正多边形", "正多边形", "圆"],
        28: ["第28章", "第二十八章", "统计初步", "统计"],
    },
}


def contains_any(text: str, markers: list[str]) -> bool:
    return any(marker in text for marker in markers)


def chinese_number_to_int(value: str) -> int | None:
    if value.isdigit():
        return int(value)
    digits = {"零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
    if value == "十":
        return 10
    if "十" in value:
        left, right = value.split("十", 1)
        tens = digits.get(left, 1) if left else 1
        ones = digits.get(right, 0) if right else 0
        return tens * 10 + ones
    return digits.get(value)


def unique_ordered(values: list[int]) -> list[int]:
    seen: set[int] = set()
    ordered: list[int] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            ordered.append(value)
    return ordered


def chapter_numbers_from_name(name: str) -> list[int]:
    numbers: list[int] = []
    for lower, upper in re.findall(r"第\s*([0-9一二三四五六七八九十两]+)\s*[~～\-—至到]\s*([0-9一二三四五六七八九十两]+)\s*章", name):
        start = chinese_number_to_int(lower)
        end = chinese_number_to_int(upper)
        if start is not None and end is not None and start <= end:
            numbers.extend(range(start, end + 1))
    for value in re.findall(r"第\s*([0-9一二三四五六七八九十两]+)\s*章", name):
        number = chinese_number_to_int(value)
        if number is not None:
            numbers.append(number)
    return unique_ordered(numbers)


def chapter_review_signals_for(name: str, slot: str, unit_signals: list[str]) -> list[str]:
    expected_units = CHAPTER_UNIT_BY_SLOT.get(slot)
    if not expected_units:
        return []
    content_markers = CHAPTER_UNIT_CONTENT_MARKERS_BY_SLOT.get(slot, {})
    for number in chapter_numbers_from_name(name):
        expected_unit = expected_units.get(number)
        expected_markers = content_markers.get(number, [expected_unit] if expected_unit else [])
        if expected_unit is None or not contains_any(name, expected_markers):
            return ["chapter-numbering-review"]
    return []


def decode_zip_name(name: str) -> str:
    try:
        raw_name = name.encode("cp437")
    except UnicodeEncodeError:
        return name

    candidates: list[str] = []
    for encoding in ("utf-8", "gb18030"):
        try:
            candidates.append(raw_name.decode(encoding))
        except UnicodeDecodeError:
            continue

    marker_terms = ["年级", "数学", "试卷", "单元", "期中", "期末", "函数", "根式", "方程", "三角形", "相似", "三角比", "沪教版"]
    for decoded in candidates:
        if any(marker in decoded for marker in marker_terms):
            return decoded
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


def sha256_for_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_for_zip_entry(archive: ZipFile, info: ZipInfo) -> str:
    digest = hashlib.sha256()
    with archive.open(info) as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def infer_grade(text: str) -> str:
    for grade, markers in GRADE_MARKERS:
        if contains_any(text, markers):
            return grade
    return "unknown"


def infer_semester(text: str) -> str:
    if contains_any(text, UPPER_SEMESTER_MARKERS):
        return "upper"
    if contains_any(text, LOWER_SEMESTER_MARKERS):
        return "lower"
    return "unknown"


def material_kinds_for(name: str) -> list[str]:
    checks = [
        ("unit-test", ["单元检测", "单元测试", "单元自测", "单元卷", "章末", "测试卷", "测试", "测评", "达标", "月考"]),
        ("sync-practice", ["同步练习", "同步小练", "课时练习", "课时", "随堂", "小练", "基础训练"]),
        ("topic-practice", ["专项练习", "专项训练", "专题训练", "专题", "专项", "培优专题", "复习"]),
        ("tiered-practice", ["分层练习", "分层", "梯度", "基础过关", "能力提升", "知识通关"]),
        ("midterm-final", ["期中", "期末"]),
        ("error-extension", ["易错", "提优", "高频", "重难", "拓展", "错题", "纠错", "压轴", "押题"]),
        ("challenge-practice", ["挑战", "尖子", "拔高", "思维", "培优"]),
        ("comprehensive-assessment", ["综合", "素养", "学情", "能力", "模拟", "仿真", "全真"]),
        ("calculation-practice", ["计算", "运算"]),
        ("problem-solving", ["解决问题", "实际问题", "应用题", "问题解决"]),
    ]
    kinds = [kind for kind, markers in checks if contains_any(name, markers)]
    if contains_any(name, ["试卷", "卷", "测试", "检测", "测评"]):
        kinds.append("paper")
    return sorted(set(kinds)) or ["paper"]


def assessment_families_for(name: str, material_kinds: list[str]) -> list[str]:
    families: list[str] = []
    if "unit-test" in material_kinds:
        families.append("unit-test")
    if "topic-practice" in material_kinds:
        families.append("topic-drill")
    if "期中" in name:
        families.append("midterm")
    if "期末" in name:
        families.append("final")
    if any(kind in material_kinds for kind in ["midterm-final", "comprehensive-assessment"]):
        families.append("comprehensive")
    return sorted(set(families)) or ["unit-test"]


def unit_signals_for(name: str, slot: str) -> list[str]:
    checks = UNIT_SIGNAL_CHECKS_BY_SLOT.get(slot, GENERIC_UNIT_SIGNAL_CHECKS)
    signals = [unit for unit, markers in checks if contains_any(name, markers)]
    chapter_units = CHAPTER_UNIT_BY_SLOT.get(slot, {})
    for number in chapter_numbers_from_name(name):
        expected_unit = chapter_units.get(number)
        if expected_unit:
            signals.append(expected_unit)
    return sorted(set(signals)) or ["unknown"]


def quarantine_signals_for(name: str, slot: str) -> list[str]:
    aligned_units = HJB_ALIGNED_UNIT_SIGNALS_BY_SLOT.get(slot, set())
    signals = [
        unit
        for unit, markers in QUARANTINE_SIGNAL_CHECKS
        if unit not in aligned_units and contains_any(name, markers)
    ]
    return sorted(set(signals))


def source_role_for(name: str, extension: str) -> str:
    if "答题卡" in name:
        return "response-sheet"
    if contains_any(name, ["解析", "详解", "讲评", "解答", "全解全析", "教师版", "全解"]):
        return "worked-response-support"
    if contains_any(name, ["参考答案", "答案", "参考资料"]):
        return "key-support"
    if extension == ".pdf":
        return "portable-assessment"
    if contains_any(name, ["试卷", "试题", "测试", "测评", "练习", "训练", "专题", "单元", "期中", "期末", "卷"]):
        return "assessment-form"
    return "support-document"


def alignment_status(
    grade: str,
    semester: str,
    source_role: str,
    unit_signals: list[str],
    quarantine_signals: list[str],
    suspicious: str | None,
    expected_slots: list[str],
) -> tuple[str, str]:
    if suspicious:
        return "quarantine", suspicious

    slot = f"{grade}:{semester}"
    if slot not in expected_slots:
        return "quarantine", "unsupported-grade-semester"
    aligned_unit_signals = HJB_ALIGNED_UNIT_SIGNALS_BY_SLOT.get(slot)
    if not aligned_unit_signals:
        return "quarantine", "unsupported-grade-semester"
    if quarantine_signals:
        return "quarantine", ",".join(quarantine_signals)
    if not set(unit_signals).intersection(aligned_unit_signals):
        return "quarantine", f"insufficient-hjb-{slot.lower()}-signal"
    if source_role in {"response-sheet", "key-support", "worked-response-support"}:
        return "aligned-support", ""
    return "aligned", ""


def classify_archive_entry(
    zip_path: Path,
    archive_hash: str,
    archive: ZipFile,
    info: ZipInfo,
    ordinal: int,
    expected_slots: list[str],
) -> tuple[dict[str, object] | None, dict[str, object] | None]:
    decoded_name = decode_zip_name(info.filename)
    if decoded_name.endswith("/") or is_hidden_or_mac_entry(decoded_name):
        return None, None

    extension = Path(decoded_name).suffix.lower()
    suspicious = suspicious_reason(decoded_name)
    if suspicious or extension not in SUPPORTED_EXTENSIONS:
        return None, {
            "archiveSha256": archive_hash,
            "memberMetadataSha1": hashlib.sha1(decoded_name.encode("utf-8", errors="replace")).hexdigest(),
            "extension": extension or "<none>",
            "reason": suspicious or "unsupported-extension",
            "sizeBytes": info.file_size,
        }

    searchable = f"{zip_path.parent.name} {zip_path.name} {decoded_name}"
    grade = infer_grade(searchable)
    semester = infer_semester(searchable)
    slot = f"{grade}:{semester}"
    material_kinds = material_kinds_for(decoded_name)
    assessment_families = assessment_families_for(decoded_name, material_kinds)
    unit_signals = unit_signals_for(decoded_name, slot)
    quarantine_signals = chapter_review_signals_for(decoded_name, slot, unit_signals) + quarantine_signals_for(decoded_name, slot)
    source_role = source_role_for(decoded_name, extension)
    status, quarantine_reason = alignment_status(grade, semester, source_role, unit_signals, quarantine_signals, suspicious, expected_slots)
    member_hash = sha256_for_zip_entry(archive, info)
    digest = hashlib.sha1(f"{archive_hash}:{member_hash}:{ordinal}".encode("utf-8")).hexdigest()[:12]

    return {
        "id": f"hjb-junior-{grade.lower()}-{semester}-paper-{digest}",
        "publisher": "MAINLAND_HJB",
        "stage": "junior-secondary",
        "grade": grade,
        "semester": semester,
        "archiveSha256": archive_hash,
        "memberSha256": member_hash,
        "extension": extension,
        "sizeBytes": info.file_size,
        "compressedBytes": info.compress_size,
        "crc32": f"{info.CRC:08x}",
        "sourceRole": source_role,
        "materialKinds": material_kinds,
        "assessmentFamilies": assessment_families,
        "unitSignals": unit_signals,
        "alignmentStatus": status,
        "quarantineReason": quarantine_reason,
        "retentionPolicy": "metadata-only-local",
    }, None


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
    normalized = slot.strip()
    if ":" not in normalized:
        raise ValueError(f"Expected slot must look like S2:upper: {slot}")
    grade, semester = normalized.split(":", 1)
    valid_grades = {grade_id for grade_id, _markers in GRADE_MARKERS}
    if grade not in valid_grades or semester not in {"upper", "lower"}:
        raise ValueError(f"Unsupported expected slot: {slot}")
    return f"{grade}:{semester}"


def coverage(entries: list[dict[str, object]], expected_slots: list[str]) -> dict[str, object]:
    aligned_entries = [entry for entry in entries if str(entry["alignmentStatus"]).startswith("aligned")]
    aligned_grade_semester_counts = Counter(f"{entry['grade']}:{entry['semester']}" for entry in aligned_entries)
    all_grade_semester_counts = Counter(f"{entry['grade']}:{entry['semester']}" for entry in entries)
    expected_slot_coverage = {slot: aligned_grade_semester_counts.get(slot, 0) for slot in expected_slots}
    target_unit_coverage: dict[str, dict[str, int]] = {}
    for slot in expected_slots:
        slot_entries = [entry for entry in aligned_entries if f"{entry['grade']}:{entry['semester']}" == slot]
        target_unit_coverage[slot] = {
            unit: sum(1 for entry in slot_entries if unit in entry.get("unitSignals", []))
            for unit in sorted(HJB_ALIGNED_UNIT_SIGNALS_BY_SLOT.get(slot, set()))
        }

    return {
        "expectedSlots": expected_slots,
        "expectedSlotCoverage": expected_slot_coverage,
        "expectedSlotsComplete": all(count > 0 for count in expected_slot_coverage.values()),
        "targetUnitCoverage": target_unit_coverage,
        "targetUnitsComplete": all(
            count > 0
            for unit_counts in target_unit_coverage.values()
            for count in unit_counts.values()
        ),
        "alignedGradeSemesterCounts": dict(sorted(aligned_grade_semester_counts.items())),
        "allGradeSemesterCounts": dict(sorted(all_grade_semester_counts.items())),
        "coveredAlignedGradeSemesters": [slot for slot, count in sorted(aligned_grade_semester_counts.items()) if count > 0],
    }


def archive_scope_counts(entries: list[dict[str, object]]) -> dict[str, object]:
    archives: dict[str, list[dict[str, object]]] = {}
    for entry in entries:
        archives.setdefault(str(entry["archiveSha256"]), []).append(entry)
    return {
        archive_sha: {
            "files": len(archive_entries),
            "alignmentStatusCounts": count_by(archive_entries, "alignmentStatus"),
            "sourceRoleCounts": count_by(archive_entries, "sourceRole"),
            "extensionCounts": count_by(archive_entries, "extension"),
        }
        for archive_sha, archive_entries in sorted(archives.items())
    }


def duplicate_and_variant_stats(entries: list[dict[str, object]]) -> dict[str, object]:
    member_hash_counts = Counter(str(entry["memberSha256"]) for entry in entries)
    duplicate_counts = [count for count in member_hash_counts.values() if count > 1]
    variant_family_counts = Counter(
        "|".join([
            str(entry["grade"]),
            str(entry["semester"]),
            ",".join(str(value) for value in entry.get("unitSignals", [])),
            str(entry["sourceRole"]),
            ",".join(str(value) for value in entry.get("materialKinds", [])),
            ",".join(str(value) for value in entry.get("assessmentFamilies", [])),
        ])
        for entry in entries
    )
    variant_groups = {family: count for family, count in variant_family_counts.items() if count > 1}
    return {
        "duplicateMemberHashGroups": len(duplicate_counts),
        "duplicateFileEntries": sum(duplicate_counts),
        "largestDuplicateGroup": max(duplicate_counts, default=0),
        "variantFamilyGroups": len(variant_groups),
        "variantFileEntries": sum(variant_groups.values()),
        "largestVariantFamily": max(variant_groups.values(), default=0),
        "topVariantFamilies": dict(sorted(variant_groups.items(), key=lambda item: (-item[1], item[0]))[:12]),
    }


def manual_review_queue(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    queue: list[dict[str, object]] = []
    for entry in entries:
        if entry.get("alignmentStatus") != "quarantine":
            continue
        queue.append({
            "id": entry["id"],
            "grade": entry["grade"],
            "semester": entry["semester"],
            "extension": entry["extension"],
            "sizeBytes": entry["sizeBytes"],
            "sourceRole": entry["sourceRole"],
            "materialKinds": entry["materialKinds"],
            "assessmentFamilies": entry["assessmentFamilies"],
            "unitSignals": entry["unitSignals"],
            "quarantineReason": entry["quarantineReason"],
        })
    return queue


def build_manifest(zip_paths: list[Path], expected_slots: list[str] | None = None) -> dict[str, object]:
    entries: list[dict[str, object]] = []
    ignored_entries: list[dict[str, object]] = []
    archive_summaries: list[dict[str, object]] = []
    slots = expected_slots or DEFAULT_EXPECTED_SLOTS
    ordinal = 0

    for input_path in zip_paths:
        zip_path = input_path.expanduser().resolve()
        if not zip_path.exists():
            raise FileNotFoundError(f"Archive not found: {zip_path}")
        if zip_path.suffix.lower() != ".zip":
            raise ValueError(f"Expected ZIP archive: {zip_path}")

        archive_hash = sha256_for_path(zip_path)
        visible_entries = 0
        visible_files = 0
        hidden_entries = 0
        ignored_visible_files = 0
        before_entries = len(entries)
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
                entry, ignored = classify_archive_entry(zip_path, archive_hash, archive, info, ordinal, slots)
                if entry:
                    entries.append(entry)
                if ignored:
                    ignored_visible_files += 1
                    ignored_entries.append(ignored)

        archive_entries = entries[before_entries:]
        archive_summaries.append({
            "archiveId": f"hjb-junior-paper-archive-{archive_hash[:12]}",
            "archiveSha256": archive_hash,
            "sizeBytes": zip_path.stat().st_size,
            "visibleEntries": visible_entries,
            "visibleFiles": visible_files,
            "manifestedFiles": len(archive_entries),
            "hiddenArchiveEntriesExcluded": hidden_entries,
            "ignoredVisibleFiles": ignored_visible_files,
            "alignmentStatusCounts": count_by(archive_entries, "alignmentStatus"),
            "quarantineReasonCounts": count_by([entry for entry in archive_entries if entry["quarantineReason"]], "quarantineReason"),
        })

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_HJB",
        "stage": "junior-secondary",
        "artifactKind": "metadata-only-hjb-junior-paper-archive-manifest",
        "safetyPolicy": "metadata-only-local",
        "archives": archive_summaries,
        "coverage": coverage(entries, slots),
        "archiveScopeCounts": archive_scope_counts(entries),
        "duplicateAndVariantStats": duplicate_and_variant_stats(entries),
        "totals": {
            "archives": len(zip_paths),
            "files": len(entries),
            "bytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "ignoredVisibleFiles": len(ignored_entries),
            "alignedFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "aligned"),
            "alignedSupportFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "aligned-support"),
            "quarantinedFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "quarantine"),
        },
        "counts": {
            "extensions": count_by(entries, "extension"),
            "alignmentStatus": count_by(entries, "alignmentStatus"),
            "quarantineReasons": count_by([entry for entry in entries if entry["quarantineReason"]], "quarantineReason"),
            "materialKinds": list_count(entries, "materialKinds"),
            "assessmentFamilies": list_count(entries, "assessmentFamilies"),
            "unitSignals": list_count(entries, "unitSignals"),
            "sourceRoles": count_by(entries, "sourceRole"),
        },
        "ignoredEntries": ignored_entries,
        "manualReviewQueue": manual_review_queue(entries),
        "entries": entries,
    }


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage_info = manifest["coverage"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    duplicate_info = manifest["duplicateAndVariantStats"]  # type: ignore[index]
    manual_review = manifest["manualReviewQueue"]  # type: ignore[index]
    return "\n".join([
        "# Mainland HJB Junior Paper Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Stage: {manifest['stage']}",
        f"- Archives inspected: {totals['archives']}",
        f"- Files manifested: {totals['files']}",
        f"- Aligned files: {totals['alignedFiles']}",
        f"- Aligned support files: {totals['alignedSupportFiles']}",
        f"- Quarantined files: {totals['quarantinedFiles']}",
        f"- Ignored visible files: {totals['ignoredVisibleFiles']}",
        f"- Expected slot coverage: {json.dumps(coverage_info['expectedSlotCoverage'], ensure_ascii=False)}",
        f"- Expected slots complete: {coverage_info['expectedSlotsComplete']}",
        f"- Target unit coverage: {json.dumps(coverage_info['targetUnitCoverage'], ensure_ascii=False)}",
        f"- Target units complete: {coverage_info['targetUnitsComplete']}",
        f"- Extension counts: {json.dumps(counts['extensions'], ensure_ascii=False)}",
        f"- Alignment status counts: {json.dumps(counts['alignmentStatus'], ensure_ascii=False)}",
        f"- Quarantine reason counts: {json.dumps(counts['quarantineReasons'], ensure_ascii=False)}",
        f"- Material-kind counts: {json.dumps(counts['materialKinds'], ensure_ascii=False)}",
        f"- Assessment-family counts: {json.dumps(counts['assessmentFamilies'], ensure_ascii=False)}",
        f"- Unit-signal counts: {json.dumps(counts['unitSignals'], ensure_ascii=False)}",
        f"- Source-role counts: {json.dumps(counts['sourceRoles'], ensure_ascii=False)}",
        f"- Duplicate/variant stats: {json.dumps(duplicate_info, ensure_ascii=False)}",
        f"- Manual-review queue entries: {len(manual_review)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: manifest entries contain archive/member hashes, extension and size metadata, grade/semester labels, material-kind labels, assessment-family labels, source-role labels, unit-signal labels, alignment status, and duplicate/variant statistics only.",
        "- Passed: the script does not extract document body text, protected prompt wording, worked-response wording, tables, images, page content, OCR text, page locators, archive member paths, or embeddings.",
        "- Required before student-facing use: S18 reviews safe pattern cards and any future generated MAIS practice for originality, mathematics, terminology, and grade fit.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / MANIFEST_NAME).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / QA_REPORT_NAME).write_text(qa_report(manifest), encoding="utf-8")


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        unit_zip = tmp_dir / "单元测试.zip"
        period_zip = tmp_dir / "期中期末.zip"
        with ZipFile(unit_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("八年级上册/第19章 实数 单元测试卷（学生版）.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("八年级上册/第20章 二次根式 专题训练解析.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("八年级上册/第21章 一元二次方程 单元测试卷.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("八年级上册/一次函数 单元测试.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("九年级上册/第24章 相似三角形 单元测试卷.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("九年级上册/第25章 锐角三角比 专题训练讲评.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("九年级上册/第26章 二次函数 单元测试卷.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("九年级上册/圆 单元测试.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("__MACOSX/._hidden.docx"), b"hidden")
            archive.writestr(mojibake_zip_name("八年级上册/资料链接.url"), b"https://example.invalid")
        with ZipFile(period_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("八年级上册/第22章 直角三角形 期末模拟测试卷.pdf"), b"%PDF " + BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("八年级上册/期中综合卷.doc"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("八年级上册/期末综合卷 答案.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("九年级上册/期中综合卷.doc"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("九年级上册/期末综合卷 答案.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("九年级上册/期末模拟测试卷.pdf"), b"%PDF " + BODY_SENTINEL.encode("utf-8"))

        manifest = build_manifest([unit_zip, period_zip], expected_slots=["S2:upper", "S3:upper"])
        serialized = json.dumps(manifest, ensure_ascii=False)
        assert manifest["totals"]["files"] == 14  # type: ignore[index]
        assert manifest["totals"]["ignoredVisibleFiles"] == 1  # type: ignore[index]
        assert manifest["totals"]["alignedFiles"] == 8  # type: ignore[index]
        assert manifest["totals"]["alignedSupportFiles"] == 4  # type: ignore[index]
        assert manifest["totals"]["quarantinedFiles"] == 2  # type: ignore[index]
        assert manifest["coverage"]["expectedSlotCoverage"]["S2:upper"] == 6  # type: ignore[index]
        assert manifest["coverage"]["expectedSlotCoverage"]["S3:upper"] == 6  # type: ignore[index]
        assert manifest["coverage"]["expectedSlotsComplete"] is True  # type: ignore[index]
        assert manifest["coverage"]["targetUnitsComplete"] is True  # type: ignore[index]
        assert manifest["counts"]["extensions"] == {".docx": 10, ".doc": 2, ".pdf": 2}  # type: ignore[index]
        assert manifest["counts"]["quarantineReasons"] == {"一次函数": 1, "圆与正多边形": 1}  # type: ignore[index]
        assert "sourceArchive" not in serialized
        assert "entryName" not in serialized
        assert "entryPath" not in serialized
        assert "fileName" not in serialized
        assert "archiveName" not in serialized
        assert "八年级上册/第19章" not in serialized
        assert "期末综合卷" not in serialized
        assert "九年级上册/第24章" not in serialized
        assert BODY_SENTINEL not in serialized

        s3_lower_unit_zip = tmp_dir / "九年级下册单元测试.zip"
        s3_lower_period_zip = tmp_dir / "九年级下册期中期末.zip"
        with ZipFile(s3_lower_unit_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("九年级下册/第27章 圆与正多边形 单元测试卷.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("九年级下册/第28章 统计初步 单元测试卷.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("九年级下册/代数方程 单元测试卷.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("__MACOSX/._hidden.docx"), b"hidden")
        with ZipFile(s3_lower_period_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("九年级下册/期中综合卷 第二十七章.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("九年级下册/期末全册综合卷.docx"), BODY_SENTINEL.encode("utf-8"))
            archive.writestr(mojibake_zip_name("九年级下册/期末全册综合卷 答案.docx"), BODY_SENTINEL.encode("utf-8"))

        s3_lower_manifest = build_manifest([s3_lower_unit_zip, s3_lower_period_zip], expected_slots=["S3:lower"])
        s3_lower_serialized = json.dumps(s3_lower_manifest, ensure_ascii=False)
        assert s3_lower_manifest["totals"]["files"] == 6  # type: ignore[index]
        assert s3_lower_manifest["totals"]["alignedFiles"] == 4  # type: ignore[index]
        assert s3_lower_manifest["totals"]["alignedSupportFiles"] == 1  # type: ignore[index]
        assert s3_lower_manifest["totals"]["quarantinedFiles"] == 1  # type: ignore[index]
        assert s3_lower_manifest["coverage"]["expectedSlotCoverage"]["S3:lower"] == 5  # type: ignore[index]
        assert s3_lower_manifest["coverage"]["expectedSlotsComplete"] is True  # type: ignore[index]
        assert s3_lower_manifest["coverage"]["targetUnitsComplete"] is True  # type: ignore[index]
        assert s3_lower_manifest["counts"]["extensions"] == {".docx": 6}  # type: ignore[index]
        assert s3_lower_manifest["counts"]["quarantineReasons"] == {"代数方程": 1}  # type: ignore[index]
        assert "sourceArchive" not in s3_lower_serialized
        assert "entryName" not in s3_lower_serialized
        assert "entryPath" not in s3_lower_serialized
        assert "fileName" not in s3_lower_serialized
        assert "archiveName" not in s3_lower_serialized
        assert "九年级下册/第27章" not in s3_lower_serialized
        assert "期末全册综合卷" not in s3_lower_serialized
        assert BODY_SENTINEL not in s3_lower_serialized
    print("Self-test passed: metadata-only HJB junior paper archive manifest built without content extraction.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland HJB junior S2 upper paper archive metadata manifest.")
    parser.add_argument("zip_paths", nargs="*", help="Paths to private HJB junior paper ZIP archives.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--expected-slot", action="append", default=None, help="Expected grade-semester slot such as S2:upper. Repeat for multiple slots.")
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
    print(f"Wrote {manifest['totals']['files']} metadata-only HJB junior paper archive file entries to {args.out_dir}")


if __name__ == "__main__":
    main()
