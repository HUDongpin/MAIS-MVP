#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland HJB primary paper archives.

This tool is for owner-provided Shanghai Education Press primary assessment ZIP
archives. It records archive/member metadata, hashes, grade-semester labels, and
coarse assessment signals only. It never extracts or writes document body text,
OCR text, protected stems, answer wording, worked responses, scoring wording,
table bodies, figure bodies, page images, page locators, archive member paths,
or embedding payloads. Default outputs live under `.local/`, which is ignored by
the repository.
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


DEFAULT_OUT_DIR = Path(".local/rag/mainland-hjb-primary-p2-lower-papers")
MANIFEST_NAME = "manifest.json"
QA_REPORT_NAME = "qa-report.md"
BODY_SENTINEL = "MAIS_BODY_SENTINEL_SHOULD_NOT_APPEAR"
SUPPORTED_EXTENSIONS = {".doc", ".docx", ".pdf"}
MAX_ENTRY_BYTES = 80 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES_PER_ARCHIVE = 600 * 1024 * 1024
MAX_COMPRESSION_RATIO = 120
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source archives, extracted "
    "document body text, protected prompt wording, answer wording, worked-"
    "response wording, scoring wording, OCR text, table bodies, figure bodies, "
    "page images, page locators, archive member paths, source filenames, or "
    "embeddings."
)

GRADE_MARKERS = [
    ("P1", ["一年级", "1年级", "一上", "一下", "1上", "1下", "P1", "p1"]),
    ("P2", ["二年级", "2年级", "二上", "二下", "2上", "2下", "P2", "p2"]),
    ("P3", ["三年级", "3年级", "三上", "三下", "3上", "3下", "P3", "p3"]),
    ("P4", ["四年级", "4年级", "四上", "四下", "4上", "4下", "P4", "p4"]),
    ("P5", ["五年级", "5年级", "五上", "五下", "5上", "5下", "P5", "p5"]),
    ("P6", ["六年级", "6年级", "六上", "六下", "6上", "6下", "P6", "p6"]),
]
UPPER_MARKERS = ["上册", "上学期", "第一学期", "一上", "二上", "三上", "四上", "五上", "六上", "1上", "2上", "3上", "4上", "5上", "6上", "upper"]
LOWER_MARKERS = ["下册", "下学期", "第二学期", "一下", "二下", "三下", "四下", "五下", "六下", "1下", "2下", "3下", "4下", "5下", "6下", "lower"]
EXPECTED_DEFAULT_SLOTS = ["P2:lower"]
P2_LOWER_TARGET_SIGNALS = [
    "表内除法",
    "时间",
    "万以内数",
    "两三位数加减",
    "专项诊断",
    "数学广场与整理复习",
    "期中综合",
    "期末综合",
]


def compact(value: str) -> str:
    return re.sub(r"[\s\-_/，、。,.()[\]（）:：;；·+•]+", "", value.lower())


def unique_ordered(values: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            unique.append(value)
    return unique


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


def decode_zip_name(name: str) -> str:
    try:
        raw_name = name.encode("cp437")
    except UnicodeEncodeError:
        return name

    candidates: list[str] = []
    for encoding in ("utf-8", "gb18030", "gbk", "big5"):
        try:
            candidates.append(raw_name.decode(encoding))
        except UnicodeDecodeError:
            continue

    if not candidates:
        return name

    marker_terms = [
        "沪教版",
        "二年级",
        "数学",
        "下册",
        "下学期",
        "单元",
        "期中",
        "期末",
        "练习",
        "测试",
        "试卷",
        "参考",
    ]
    return max(candidates, key=lambda value: sum(term in value for term in marker_terms))


def hidden_or_mac_entry(decoded_name: str) -> bool:
    parts = [part for part in decoded_name.split("/") if part]
    return "__MACOSX" in parts or any(part == ".DS_Store" or part.startswith("._") for part in parts)


def suspicious_reason(decoded_name: str, info: ZipInfo) -> str | None:
    parts = [part for part in decoded_name.split("/") if part]
    if decoded_name.startswith(("/", "\\")):
        return "absolute-member-location"
    if any(part == ".." for part in parts):
        return "parent-directory-member"
    if info.file_size > MAX_ENTRY_BYTES:
        return "entry-too-large"
    if info.compress_size > 0 and info.file_size / info.compress_size > MAX_COMPRESSION_RATIO:
        return "suspicious-compression-ratio"
    return None


def parse_expected_slot(slot: str) -> str:
    normalized = slot.strip()
    if ":" not in normalized:
        raise ValueError(f"Expected slot must look like P2:lower: {slot}")
    grade, semester = normalized.split(":", 1)
    valid_grades = {grade_id for grade_id, _markers in GRADE_MARKERS}
    if grade not in valid_grades or semester not in {"upper", "lower"}:
        raise ValueError(f"Unsupported expected slot: {slot}")
    return f"{grade}:{semester}"


def infer_grade(searchable: str) -> str:
    for grade, markers in GRADE_MARKERS:
        if any(marker in searchable for marker in markers):
            return grade
    return "unknown"


def infer_semester(searchable: str) -> str:
    if any(marker in searchable for marker in UPPER_MARKERS):
        return "upper"
    if any(marker in searchable for marker in LOWER_MARKERS):
        return "lower"
    return "unknown"


def contains_any(text: str, markers: list[str]) -> bool:
    return any(marker in text for marker in markers)


def unit_signals_for(searchable: str) -> list[str]:
    normalized = compact(searchable)
    signals: list[str] = []
    unit_number_signals = {
        "第一单元": "表内除法",
        "第1单元": "表内除法",
        "1-3单元": "期中综合",
        "1至3单元": "期中综合",
        "第二单元": "时间",
        "第2单元": "时间",
        "第三单元": "万以内数",
        "第3单元": "万以内数",
        "第四单元": "两三位数加减",
        "第4单元": "两三位数加减",
        "第五单元": "数学广场与整理复习",
        "第5单元": "数学广场与整理复习",
        "第六单元": "数学广场与整理复习",
        "第6单元": "数学广场与整理复习",
    }
    for marker, signal in unit_number_signals.items():
        if compact(marker) in normalized:
            signals.append(signal)
    if contains_any(searchable, ["表内除法", "平均分", "口诀求商", "除法"]):
        signals.append("表内除法")
    if contains_any(searchable, ["时间", "钟面", "时分", "经过时间"]):
        signals.append("时间")
    if contains_any(searchable, ["万以内", "千以内", "数位", "读数", "写数", "大小比较"]):
        signals.append("万以内数")
    if contains_any(searchable, ["两位数", "三位数", "加减法", "进位", "退位", "竖式", "估算", "验算"]):
        signals.append("两三位数加减")
    if contains_any(searchable, ["口算", "填空", "应用题", "专项", "拓展", "分类", "思维"]):
        signals.append("专项诊断")
    if contains_any(searchable, ["数学广场", "总复习", "小复习", "复习", "综合"]):
        signals.append("数学广场与整理复习")
    if "期中" in searchable:
        signals.append("期中综合")
    if "期末" in searchable:
        signals.append("期末综合")
    return unique_ordered(signals) or ["unknown"]


def material_kinds_for(searchable: str) -> list[str]:
    kinds: list[str] = []
    if contains_any(searchable, ["单元", "测试", "测评"]):
        kinds.append("unit-test")
    if contains_any(searchable, ["同步", "课时", "练习"]):
        kinds.append("sync-practice")
    if contains_any(searchable, ["专项", "专题", "填空", "应用题", "口算"]):
        kinds.append("topic-practice")
    if contains_any(searchable, ["期中", "期末"]):
        kinds.append("midterm-final")
    if contains_any(searchable, ["拓展", "思维", "提高", "提升", "培优"]):
        kinds.append("challenge-practice")
    if contains_any(searchable, ["综合", "复习", "学情"]):
        kinds.append("comprehensive-assessment")
    if contains_any(searchable, ["口算", "计算", "加减", "除法"]):
        kinds.append("calculation-practice")
    if contains_any(searchable, ["应用题", "解决问题"]):
        kinds.append("problem-solving")
    if contains_any(searchable, ["易错", "错题", "解析", "参考"]):
        kinds.append("error-extension")
    return unique_ordered(kinds) or ["topic-practice"]


def assessment_families_for(searchable: str, material_kinds: list[str]) -> list[str]:
    families: list[str] = []
    if "unit-test" in material_kinds:
        families.append("unit-test")
    if "topic-practice" in material_kinds or "calculation-practice" in material_kinds:
        families.append("topic-drill")
    if "期中" in searchable:
        families.append("midterm")
    if "期末" in searchable:
        families.append("final")
    if "comprehensive-assessment" in material_kinds or "midterm-final" in material_kinds:
        families.append("comprehensive")
    return unique_ordered(families) or ["topic-drill"]


def source_role_for(searchable: str, extension: str) -> str:
    if contains_any(searchable, ["答案", "解析", "参考", "详解", "讲评", "教师版"]):
        return "answer-or-solution-support"
    if extension == ".pdf":
        return "portable-assessment"
    if contains_any(searchable, ["试卷", "试题", "测试", "测评", "练习", "训练", "单元", "期中", "期末", "卷"]):
        return "student-assessment"
    return "support-document"


def difficulty_signal_for(searchable: str) -> str:
    if contains_any(searchable, ["提高", "提升", "拓展", "思维", "挑战", "培优"]):
        return "challenge"
    if contains_any(searchable, ["基础"]):
        return "foundation"
    if contains_any(searchable, ["期中", "期末", "综合", "学情"]):
        return "exam"
    return "core"


def alignment_status(
    grade: str,
    semester: str,
    unit_signals: list[str],
    suspicious: str | None,
    expected_slots: list[str],
) -> tuple[str, str]:
    if suspicious:
        return "quarantine", suspicious
    slot = f"{grade}:{semester}"
    if slot not in expected_slots:
        return "quarantine", "unsupported-grade-semester"
    if not set(unit_signals).intersection(P2_LOWER_TARGET_SIGNALS):
        return "quarantine", "insufficient-p2-lower-signal"
    return "aligned", ""


def classify_entry(
    zip_path: Path,
    archive_hash: str,
    archive: ZipFile,
    info: ZipInfo,
    ordinal: int,
    expected_slots: list[str],
) -> tuple[dict[str, object] | None, dict[str, object] | None]:
    decoded_name = decode_zip_name(info.filename)
    if decoded_name.endswith("/") or hidden_or_mac_entry(decoded_name):
        return None, None

    extension = Path(decoded_name).suffix.lower()
    suspicious = suspicious_reason(decoded_name, info)
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
    unit_signals = unit_signals_for(searchable)
    status, quarantine_reason = alignment_status(grade, semester, unit_signals, suspicious, expected_slots)
    material_kinds = material_kinds_for(searchable)
    member_hash = sha256_for_member(archive, info)
    digest = hashlib.sha1(f"{archive_hash}:{member_hash}:{ordinal}".encode("utf-8")).hexdigest()[:12]

    return {
        "id": f"hjb-primary-{grade.lower()}-{semester}-paper-{digest}",
        "publisher": "MAINLAND_HJB",
        "stage": "primary",
        "grade": grade,
        "semester": semester,
        "archiveSha256": archive_hash,
        "memberSha256": member_hash,
        "extension": extension,
        "sizeBytes": info.file_size,
        "compressedBytes": info.compress_size,
        "crc32": f"{info.CRC:08x}",
        "sourceRole": source_role_for(searchable, extension),
        "materialKinds": material_kinds,
        "assessmentFamilies": assessment_families_for(searchable, material_kinds),
        "unitSignals": unit_signals,
        "difficultySignal": difficulty_signal_for(searchable),
        "alignmentStatus": status,
        "quarantineReason": quarantine_reason,
        "retentionPolicy": "metadata-only-local",
        "bodyTextPersisted": False,
        "answerTextPersisted": False,
        "solutionTextPersisted": False,
        "ocrTextPersisted": False,
        "pageImagesPersisted": False,
        "sourceLocatorsPersisted": False,
        "embeddingPayloadsPersisted": False,
    }, None


def coverage(entries: list[dict[str, object]], expected_slots: list[str]) -> dict[str, object]:
    aligned_entries = [entry for entry in entries if entry["alignmentStatus"] == "aligned"]
    aligned_grade_semester_counts = Counter(f"{entry['grade']}:{entry['semester']}" for entry in aligned_entries)
    expected_slot_coverage = {slot: aligned_grade_semester_counts.get(slot, 0) for slot in expected_slots}
    target_signal_coverage = {
        signal: sum(1 for entry in aligned_entries if signal in entry.get("unitSignals", []))
        for signal in P2_LOWER_TARGET_SIGNALS
    }
    return {
        "expectedSlots": expected_slots,
        "expectedSlotCoverage": expected_slot_coverage,
        "expectedSlotsComplete": all(count > 0 for count in expected_slot_coverage.values()),
        "targetSignalCoverage": target_signal_coverage,
        "targetSignalsComplete": all(count > 0 for count in target_signal_coverage.values()),
        "coveredAlignedGradeSemesters": [slot for slot, count in sorted(aligned_grade_semester_counts.items()) if count > 0],
    }


def duplicate_stats(entries: list[dict[str, object]]) -> dict[str, object]:
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
    variant_counts = [count for count in variant_family_counts.values() if count > 1]
    return {
        "duplicateMemberHashGroups": len(duplicate_counts),
        "duplicateFileEntries": sum(duplicate_counts),
        "largestDuplicateGroup": max(duplicate_counts, default=0),
        "variantFamilyGroups": len(variant_counts),
        "variantFileEntries": sum(variant_counts),
        "largestVariantFamily": max(variant_counts, default=0),
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
    slots = expected_slots or EXPECTED_DEFAULT_SLOTS
    entries: list[dict[str, object]] = []
    ignored_entries: list[dict[str, object]] = []
    archive_summaries: list[dict[str, object]] = []
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
            total_uncompressed = sum(member.file_size for member in archive.infolist())
            if total_uncompressed > MAX_UNCOMPRESSED_BYTES_PER_ARCHIVE:
                archive_summaries.append({
                    "archiveId": f"hjb-primary-paper-archive-{archive_hash[:12]}",
                    "archiveSha256": archive_hash,
                    "sizeBytes": zip_path.stat().st_size,
                    "visibleEntries": 0,
                    "visibleFiles": 0,
                    "manifestedFiles": 0,
                    "hiddenArchiveEntriesExcluded": 0,
                    "ignoredVisibleFiles": 0,
                    "archiveStatus": "quarantine",
                    "quarantineReason": "archive-uncompressed-size-too-large",
                })
                continue

            for info in archive.infolist():
                decoded_name = decode_zip_name(info.filename)
                if hidden_or_mac_entry(decoded_name):
                    hidden_entries += 1
                    continue
                visible_entries += 1
                if decoded_name.endswith("/"):
                    continue
                visible_files += 1
                ordinal += 1
                entry, ignored = classify_entry(zip_path, archive_hash, archive, info, ordinal, slots)
                if entry:
                    entries.append(entry)
                if ignored:
                    ignored_visible_files += 1
                    ignored_entries.append(ignored)

        archive_entries = entries[before_entries:]
        archive_summaries.append({
            "archiveId": f"hjb-primary-paper-archive-{archive_hash[:12]}",
            "archiveSha256": archive_hash,
            "sizeBytes": zip_path.stat().st_size,
            "visibleEntries": visible_entries,
            "visibleFiles": visible_files,
            "manifestedFiles": len(archive_entries),
            "hiddenArchiveEntriesExcluded": hidden_entries,
            "ignoredVisibleFiles": ignored_visible_files,
            "archiveStatus": "aligned-metadata",
            "alignmentStatusCounts": count_by(archive_entries, "alignmentStatus"),
        })

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_HJB",
        "stage": "primary",
        "artifactKind": "metadata-only-hjb-primary-paper-archive-manifest",
        "safetyPolicy": "metadata-only-local",
        "safetyNote": SAFETY_NOTE,
        "archives": archive_summaries,
        "coverage": coverage(entries, slots),
        "duplicateStats": duplicate_stats(entries),
        "totals": {
            "archives": len(zip_paths),
            "files": len(entries),
            "bytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "ignoredVisibleFiles": len(ignored_entries),
            "alignedFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "aligned"),
            "quarantinedFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "quarantine"),
        },
        "counts": {
            "extensions": count_by(entries, "extension"),
            "alignmentStatus": count_by(entries, "alignmentStatus"),
            "quarantineReasons": count_by([entry for entry in entries if entry["quarantineReason"]], "quarantineReason"),
            "materialKinds": list_count(entries, "materialKinds"),
            "assessmentFamilies": list_count(entries, "assessmentFamilies"),
            "unitSignals": list_count(entries, "unitSignals"),
            "difficultySignals": count_by(entries, "difficultySignal"),
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
    duplicate_info = manifest["duplicateStats"]  # type: ignore[index]
    manual_review = manifest["manualReviewQueue"]  # type: ignore[index]
    return "\n".join([
        "# Mainland HJB Primary Paper Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Stage: {manifest['stage']}",
        f"- Archives inspected: {totals['archives']}",
        f"- Files manifested: {totals['files']}",
        f"- Aligned files: {totals['alignedFiles']}",
        f"- Quarantined files: {totals['quarantinedFiles']}",
        f"- Ignored visible files: {totals['ignoredVisibleFiles']}",
        f"- Expected slot coverage: {json.dumps(coverage_info['expectedSlotCoverage'], ensure_ascii=False)}",
        f"- Expected slots complete: {coverage_info['expectedSlotsComplete']}",
        f"- Target signal coverage: {json.dumps(coverage_info['targetSignalCoverage'], ensure_ascii=False)}",
        f"- Target signals complete: {coverage_info['targetSignalsComplete']}",
        f"- Extension counts: {json.dumps(counts['extensions'], ensure_ascii=False)}",
        f"- Alignment status counts: {json.dumps(counts['alignmentStatus'], ensure_ascii=False)}",
        f"- Quarantine reason counts: {json.dumps(counts['quarantineReasons'], ensure_ascii=False)}",
        f"- Material-kind counts: {json.dumps(counts['materialKinds'], ensure_ascii=False)}",
        f"- Assessment-family counts: {json.dumps(counts['assessmentFamilies'], ensure_ascii=False)}",
        f"- Unit-signal counts: {json.dumps(counts['unitSignals'], ensure_ascii=False)}",
        f"- Difficulty-signal counts: {json.dumps(counts['difficultySignals'], ensure_ascii=False)}",
        f"- Source-role counts: {json.dumps(counts['sourceRoles'], ensure_ascii=False)}",
        f"- Duplicate stats: {json.dumps(duplicate_info, ensure_ascii=False)}",
        f"- Manual-review queue entries: {len(manual_review)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: manifest entries contain archive/member hashes, extension and size metadata, grade/semester labels, material-kind labels, assessment-family labels, source-role labels, unit-signal labels, alignment status, and duplicate statistics only.",
        "- Passed: the script does not extract document body text, protected prompt wording, answer wording, worked-response wording, tables, images, page content, OCR text, page locators, archive member paths, source filenames, or embeddings.",
        "- Required before student-facing use: S18 reviews safe pattern cards and any future generated MAIS practice for originality, mathematics, terminology, and grade fit.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / MANIFEST_NAME).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / QA_REPORT_NAME).write_text(qa_report(manifest), encoding="utf-8")


def mojibake_zip_name(name: str) -> str:
    return name.encode("utf-8").decode("cp437")


def write_fake_archive(path: Path, names: list[str]) -> None:
    with ZipFile(path, "w", compression=ZIP_DEFLATED) as archive:
        for index, name in enumerate(names):
            archive.writestr(mojibake_zip_name(name), f"{BODY_SENTINEL} fake protected document body {index}")
        archive.writestr(mojibake_zip_name("__MACOSX/._ignored.docx"), "ignored")
        archive.writestr(mojibake_zip_name("二年级下册/资料链接.url"), "https://example.invalid")


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        unit_archive = tmp_dir / "unit.zip"
        period_archive = tmp_dir / "period.zip"
        write_fake_archive(unit_archive, [
            "二年级下册/第一单元 表内除法 单元测试卷.docx",
            "二年级下册/第二单元 时间在哪里 单元测试卷.docx",
            "二年级下册/第三单元 万以内数 单元测试卷.docx",
            "二年级下册/第四单元 两三位数加减法 单元测试卷.docx",
            "二年级下册/第五单元 数学广场 综合练习.docx",
            "二年级下册/口算专项练习.docx",
        ])
        write_fake_archive(period_archive, [
            "二年级下册/期中综合 1-3单元 学情自测.docx",
            "二年级下册/期末综合复习测试.doc",
            "二年级下册/期末综合复习测试 参考资料.docx",
        ])

        manifest = build_manifest([unit_archive, period_archive], expected_slots=["P2:lower"])
        manifest_json = json.dumps(manifest, ensure_ascii=False)
        coverage_info = manifest["coverage"]  # type: ignore[index]
        totals = manifest["totals"]  # type: ignore[index]
        counts = manifest["counts"]  # type: ignore[index]

        assert totals["archives"] == 2
        assert totals["files"] == 9
        assert totals["ignoredVisibleFiles"] == 2
        assert totals["alignedFiles"] == 9
        assert coverage_info["expectedSlotCoverage"]["P2:lower"] == 9
        assert coverage_info["expectedSlotsComplete"] is True
        assert coverage_info["targetSignalsComplete"] is True
        assert counts["extensions"] == {".docx": 8, ".doc": 1}
        assert "answer-or-solution-support" in counts["sourceRoles"]
        assert BODY_SENTINEL not in manifest_json
        assert "fake protected document body" not in manifest_json
        assert "example.invalid" not in manifest_json
        assert "__MACOSX" not in manifest_json
        assert "entryPath" not in manifest_json
        assert "memberName" not in manifest_json
        assert "archiveName" not in manifest_json
        assert "fileName" not in manifest_json
        assert "第一单元" not in manifest_json
        assert "期末综合复习测试" not in manifest_json
        assert all(entry["bodyTextPersisted"] is False for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["answerTextPersisted"] is False for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["solutionTextPersisted"] is False for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["ocrTextPersisted"] is False for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["pageImagesPersisted"] is False for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["sourceLocatorsPersisted"] is False for entry in manifest["entries"])  # type: ignore[index]
        assert all(entry["embeddingPayloadsPersisted"] is False for entry in manifest["entries"])  # type: ignore[index]
    print("Self-test passed: metadata-only HJB primary paper ZIP manifest built without content extraction.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland HJB primary paper archive metadata manifest.")
    parser.add_argument("zip_paths", nargs="*", help="Paths to private HJB primary paper ZIP archives.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--expected-slot", action="append", default=None, help="Expected grade-semester slot such as P2:lower. Repeat for multiple slots.")
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
    print(f"Wrote {manifest['totals']['files']} metadata-only HJB primary paper entries to {args.out_dir}")  # type: ignore[index]


if __name__ == "__main__":
    main()
