#!/usr/bin/env python3
"""Build a local-only metadata manifest for Mainland PEP junior paper archives.

The default scope is junior-secondary paper-package intake. The script keeps
only archive/file metadata and coarse classification. It does not extract,
persist, or print document body text, answer text, worked solutions, tables,
images, page content, OCR text, embeddings, page locators, archive-entry paths,
or source item wording. Default outputs live under `.local/`, which is ignored
by the repository.
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


DEFAULT_OUT_DIR = Path(".local/rag/mainland-pep-junior-papers")
MANIFEST_NAME = "manifest.json"
QA_REPORT_NAME = "qa-report.md"
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source archives, extracted "
    "document body text, answer text, worked solutions, OCR text, tables, figures, "
    "page images, embeddings, page locators, archive entry paths, or source item wording."
)
SUPPORTED_EXTENSIONS = {".doc", ".docx", ".pdf"}
JUNIOR_GRADE_MARKERS = [
    ("S1", ["七年级", "7年级", "初一", "七上", "七下", "7上", "7下", "数学7上", "数学7下", "S1", "s1"]),
    ("S2", ["八年级", "8年级", "初二", "八上", "八下", "8上", "8下", "数学8上", "数学8下", "S2", "s2"]),
    ("S3", ["九年级", "9年级", "初三", "九上", "九下", "9上", "9下", "数学9上", "数学9下", "S3", "s3"]),
]
UPPER_SEMESTER_MARKERS = ["上册", "上学期", "七上", "八上", "九上", "7上", "8上", "9上", "初一上", "初二上", "初三上", "秋季", "upper"]
LOWER_SEMESTER_MARKERS = ["下册", "下学期", "七下", "八下", "九下", "7下", "8下", "9下", "初一下", "初二下", "初三下", "春季", "lower"]
UNIT_SIGNAL_CHECKS = [
    ("有理数", ["有理数", "正数", "负数", "数轴", "相反数", "绝对值"]),
    ("整式加减", ["整式", "代数式", "同类项", "去括号", "合并同类项"]),
    ("一元一次方程", ["一元一次方程", "等式", "列方程"]),
    ("相交线与平行线", ["相交线", "平行线", "两条直线", "垂直", "对顶角", "邻补角", "同位角", "内错角", "同旁内角"]),
    ("定义命题定理", ["定义、命题、定理", "命题与定理", "定义与命题", "真命题", "假命题"]),
    ("平移", ["平移"]),
    ("几何图形", ["几何图形", "线段", "射线", "直线", "角的", "点线面体"]),
    ("实数", ["实数", "实数及其简单运算", "平方根", "立方根", "无理数", "算术平方根"]),
    ("平面直角坐标系", ["平面直角坐标系", "坐标系", "坐标", "象限", "有序数对"]),
    ("二元一次方程组", ["二元一次方程组", "方程组", "消元", "代入法", "加减法"]),
    ("不等式", ["不等式", "不等式组", "解集"]),
    ("数据分析", ["数据分析", "数据的分析", "平均数", "中位数", "众数", "方差"]),
    ("数据收集整理", ["数据收集", "数据的收集", "统计", "调查", "抽样", "频数", "统计图"]),
    ("三角形", ["三角形", "全等三角形", "角平分线", "垂直平分线"]),
    ("轴对称", ["轴对称", "等腰三角形", "等边三角形"]),
    ("整式乘法与因式分解", ["整式乘法", "乘法公式", "因式分解"]),
    ("分式", ["分式", "分式方程"]),
    ("二次根式", ["二次根式"]),
    ("勾股定理", ["勾股定理", "直角三角形"]),
    ("四边形", ["四边形", "平行四边形", "矩形", "菱形", "正方形"]),
    ("一次函数", ["一次函数", "函数图象", "待定系数"]),
    ("一元二次方程", ["一元二次方程", "配方法", "公式法", "判别式", "根与系数"]),
    ("二次函数", ["二次函数", "抛物线", "顶点", "对称轴"]),
    ("旋转", ["旋转", "中心对称", "图形变换"]),
    ("圆", ["圆", "圆周角", "切线", "垂径", "弧", "弦"]),
    ("概率初步", ["概率", "随机事件", "列表法", "树状图"]),
    ("反比例函数", ["反比例函数", "比例系数", "双曲线"]),
    ("相似", ["相似", "相似三角形", "比例线段", "位似"]),
    ("锐角三角函数", ["锐角三角函数", "正弦", "余弦", "正切", "解直角三角形", "仰角", "俯角"]),
    ("投影与视图", ["投影", "视图", "三视图", "主视图", "左视图", "俯视图"]),
]


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

    for decoded in candidates:
        if any(marker in decoded for marker in ["年级", "数学", "试卷", "有理数", "方程", "三角形", "函数"]):
            return decoded

    if candidates:
        decoded = candidates[0]
        if any(marker in decoded for marker in ["銆", "骞", "绾", "涓", "瀛"]):
            try:
                return decoded.encode("gb18030").decode("utf-8")
            except UnicodeError:
                return decoded
        return decoded

    return name


def mojibake_zip_name(name: str) -> str:
    return name.encode("utf-8").decode("cp437")


def is_ignored_entry(decoded_name: str) -> bool:
    parts = [part for part in decoded_name.split("/") if part]
    if "__MACOSX" in parts:
        return True
    if any(part == ".DS_Store" for part in parts):
        return True
    return any(part.startswith("._") for part in parts)


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


def context_text_for_zip_path(zip_path: Path) -> str:
    parts = [part for part in zip_path.parts[-4:] if part]
    return " ".join(parts)


def infer_grade(text: str) -> str:
    for grade, markers in JUNIOR_GRADE_MARKERS:
        if any(marker in text for marker in markers):
            return grade
    return "unknown"


def infer_semester(text: str) -> str:
    if any(marker in text for marker in UPPER_SEMESTER_MARKERS) or re.search(r"(?:20)?\d{2}\s*秋", text):
        return "upper"
    if any(marker in text for marker in LOWER_SEMESTER_MARKERS) or re.search(r"(?:20)?\d{2}\s*春", text):
        return "lower"
    return "unknown"


def material_kinds_for(name: str) -> list[str]:
    checks = [
        ("unit-test", ["单元检测", "单元测试", "单元卷", "测试卷", "测评", "达标", "基础测试", "提高测试", "月考"]),
        ("sync-practice", ["同步练习", "同步小练", "课时练习", "课时", "随堂", "小练", "基础训练", "导学案", "作业"]),
        ("topic-practice", ["专项练习", "专项训练", "专题训练", "专题", "专项"]),
        ("tiered-practice", ["分层练习", "分层", "梯度", "培优"]),
        ("midterm-final", ["期中", "期末"]),
        ("error-extension", ["易错", "提优", "高频", "重难", "拓展", "错题", "纠错", "压轴"]),
        ("challenge-practice", ["挑战", "尖子", "拔高", "思维"]),
        ("comprehensive-assessment", ["综合", "素养", "学情", "能力", "模拟"]),
        ("calculation-practice", ["计算", "运算"]),
        ("problem-solving", ["解决问题", "实际问题", "应用题", "问题解决"]),
    ]
    kinds = [kind for kind, markers in checks if any(marker in name for marker in markers)]
    if any(marker in name for marker in ["试卷", "卷", "测试", "检测", "测评"]):
        kinds.append("paper")
    return sorted(set(kinds)) or ["paper"]


def unit_signals_for(name: str) -> list[str]:
    signals = [unit for unit, markers in UNIT_SIGNAL_CHECKS if any(marker in name for marker in markers)]
    return signals or ["unknown"]


def source_role_for(name: str) -> str:
    if any(marker in name for marker in ["答案解析", "解析答案", "答案详解", "详解答案"]):
        return "answer-solution"
    if any(marker in name for marker in ["解析", "详解", "讲评", "解答"]):
        return "solution"
    if "答案" in name:
        return "answer"
    if any(marker in name for marker in ["试卷", "试题", "测试", "测评", "练习", "训练", "专题", "单元", "期中", "期末", "卷"]):
        return "paper"
    return "document"


def archive_root_and_group(name: str) -> tuple[str, str]:
    parts = [part for part in name.split("/") if part]
    if not parts:
        return "", ""
    root = parts[0]
    if len(parts) >= 3:
        return root, parts[1]
    if len(parts) >= 2:
        return root, parts[1]
    return root, root


def classify_archive_entry(
    zip_path: Path,
    archive: ZipFile,
    archive_hash: str,
    info: ZipInfo,
    archive_context: str,
) -> tuple[dict[str, object] | None, dict[str, object] | None]:
    decoded_name = decode_zip_name(info.filename)
    if is_ignored_entry(decoded_name) or decoded_name.endswith("/"):
        return None, None

    extension = Path(decoded_name).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        return None, {
            "archiveName": zip_path.name,
            "extension": extension or "<none>",
            "reason": "unsupported-extension",
            "sizeBytes": info.file_size,
        }

    root, top_group = archive_root_and_group(decoded_name)
    searchable = f"{archive_context} {zip_path.name} {decoded_name}"
    grade = infer_grade(searchable)
    semester = infer_semester(searchable)
    return {
        "id": f"pep-junior-paper-{grade.lower()}-{semester}-{hashlib.sha1(f'{zip_path.name}:{decoded_name}'.encode('utf-8')).hexdigest()[:12]}",
        "publisher": "MAINLAND_PEP",
        "stage": "junior-secondary",
        "grade": grade,
        "semester": semester,
        "archiveName": zip_path.name,
        "archiveSha256": archive_hash,
        "rootDirectory": root,
        "topGroup": top_group,
        "fileName": Path(decoded_name).name,
        "extension": extension,
        "sizeBytes": info.file_size,
        "compressedBytes": info.compress_size,
        "crc32": f"{info.CRC:08x}",
        "sha256": sha256_for_zip_entry(archive, info),
        "materialKinds": material_kinds_for(decoded_name),
        "unitSignals": unit_signals_for(decoded_name),
        "sourceRole": source_role_for(decoded_name),
        "hasAnswerLabel": "答案" in decoded_name,
        "hasSolutionLabel": any(marker in decoded_name for marker in ["解析", "详解", "讲评", "解答"]),
        "retentionPolicy": "metadata-only-local",
        "bodyTextPersisted": False,
        "answerTextPersisted": False,
        "solutionTextPersisted": False,
        "ocrTextPersisted": False,
        "tableContentPersisted": False,
        "imageContentPersisted": False,
        "pageImagesPersisted": False,
        "pageLocatorsPersisted": False,
        "embeddingsPersisted": False,
        "safetyNote": SAFETY_NOTE,
    }, None


def sorted_counter(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted(counter.items(), key=lambda item: (-item[1], item[0])))


def parse_expected_slot(slot: str) -> str:
    normalized = slot.strip()
    if ":" not in normalized:
        raise ValueError(f"Expected slot must look like S1:upper or S1:lower: {slot}")
    grade, semester = normalized.split(":", 1)
    valid_grades = {grade_id for grade_id, _markers in JUNIOR_GRADE_MARKERS}
    if grade not in valid_grades or semester not in {"upper", "lower"}:
        raise ValueError(f"Unsupported expected slot: {slot}")
    return f"{grade}:{semester}"


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


def coverage(entries: list[dict[str, object]], expected_slots: list[str]) -> dict[str, object]:
    grade_semester_counts = Counter(f"{entry['grade']}:{entry['semester']}" for entry in entries)
    grade_semester_extension_counts: dict[str, dict[str, int]] = {}
    for entry in entries:
        slot = f"{entry['grade']}:{entry['semester']}"
        extension = str(entry["extension"])
        grade_semester_extension_counts.setdefault(slot, {})
        grade_semester_extension_counts[slot][extension] = grade_semester_extension_counts[slot].get(extension, 0) + 1
    expected_slot_coverage = {slot: grade_semester_counts.get(slot, 0) for slot in expected_slots}
    return {
        "gradeSemesterCounts": dict(sorted(grade_semester_counts.items())),
        "gradeSemesterExtensionCounts": dict(sorted(
            (slot, dict(sorted(extension_counts.items())))
            for slot, extension_counts in grade_semester_extension_counts.items()
        )),
        "expectedSlots": expected_slots,
        "expectedSlotCoverage": expected_slot_coverage,
        "expectedSlotsComplete": all(count > 0 for count in expected_slot_coverage.values()),
        "coveredGradeSemesters": [slot for slot, count in sorted(grade_semester_counts.items()) if count > 0],
    }


def apply_single_expected_slot_fallback(entry: dict[str, object], expected_slots: list[str]) -> None:
    if len(expected_slots) != 1:
        return
    grade, semester = expected_slots[0].split(":", 1)
    if entry.get("grade") == "unknown":
        entry["grade"] = grade
    if entry.get("semester") == "unknown":
        entry["semester"] = semester


def archive_scope_counts(entries: list[dict[str, object]]) -> dict[str, object]:
    archives: dict[str, list[dict[str, object]]] = {}
    for entry in entries:
        archives.setdefault(str(entry["archiveName"]), []).append(entry)

    return {
        archive_name: {
            "files": len(archive_entries),
            "gradeSemesterCounts": sorted_counter(Counter(
                f"{entry['grade']}:{entry['semester']}" for entry in archive_entries
            )),
            "sourceRoleCounts": count_by(archive_entries, "sourceRole"),
            "extensionCounts": count_by(archive_entries, "extension"),
        }
        for archive_name, archive_entries in sorted(archives.items())
    }


def build_manifest(zip_paths: list[Path], expected_slots: list[str] | None = None) -> dict[str, object]:
    entries: list[dict[str, object]] = []
    ignored_entries: list[dict[str, object]] = []
    archive_summaries: list[dict[str, object]] = []
    slots = expected_slots or ["S1:upper", "S1:lower"]

    for input_path in zip_paths:
        zip_path = input_path.expanduser().resolve()
        if not zip_path.exists():
            raise FileNotFoundError(f"Archive not found: {zip_path}")
        archive_hash = sha256_for_path(zip_path)
        archive_context = context_text_for_zip_path(zip_path)
        archive_entry_count = 0
        archive_file_count = 0
        archive_ignored_count = 0
        archive_hidden_count = 0
        before_entries = len(entries)
        with ZipFile(zip_path) as archive:
            for info in archive.infolist():
                decoded_name = decode_zip_name(info.filename)
                if is_ignored_entry(decoded_name):
                    archive_hidden_count += 1
                    continue
                archive_entry_count += 1
                if decoded_name.endswith("/"):
                    continue
                archive_file_count += 1
                entry, ignored = classify_archive_entry(zip_path, archive, archive_hash, info, archive_context)
                if entry:
                    apply_single_expected_slot_fallback(entry, slots)
                    entries.append(entry)
                if ignored:
                    archive_ignored_count += 1
                    ignored_entries.append(ignored)
        archive_summaries.append({
            "archiveName": zip_path.name,
            "archiveSha256": archive_hash,
            "visibleEntries": archive_entry_count,
            "visibleFiles": archive_file_count,
            "manifestedFiles": len(entries) - before_entries,
            "hiddenArchiveEntriesExcluded": archive_hidden_count,
            "ignoredVisibleFiles": archive_ignored_count,
        })

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_PEP",
        "stage": "junior-secondary",
        "artifactKind": "metadata-only-junior-paper-archive-manifest",
        "safetyNote": SAFETY_NOTE,
        "archives": archive_summaries,
        "coverage": coverage(entries, slots),
        "archiveScopeCounts": archive_scope_counts(entries),
        "totals": {
            "archives": len(zip_paths),
            "files": len(entries),
            "bytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "ignoredVisibleFiles": len(ignored_entries),
            "answerLabelFiles": sum(1 for entry in entries if entry["hasAnswerLabel"]),
            "solutionLabelFiles": sum(1 for entry in entries if entry["hasSolutionLabel"]),
        },
        "counts": {
            "extensions": count_by(entries, "extension"),
            "materialKinds": list_count(entries, "materialKinds"),
            "unitSignals": list_count(entries, "unitSignals"),
            "sourceRoles": count_by(entries, "sourceRole"),
            "topGroups": count_by(entries, "topGroup"),
        },
        "ignoredEntries": ignored_entries,
        "entries": entries,
    }


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage_info = manifest["coverage"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    return "\n".join([
        "# Mainland PEP Junior Paper Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Stage: {manifest['stage']}",
        f"- Archives inspected: {totals['archives']}",
        f"- Files manifested: {totals['files']}",
        f"- Ignored visible files: {totals['ignoredVisibleFiles']}",
        f"- Expected slot coverage: {json.dumps(coverage_info['expectedSlotCoverage'], ensure_ascii=False)}",
        f"- Expected slots complete: {coverage_info['expectedSlotsComplete']}",
        f"- Archive scope counts: {json.dumps(manifest['archiveScopeCounts'], ensure_ascii=False)}",
        f"- Grade-semester extension counts: {json.dumps(coverage_info['gradeSemesterExtensionCounts'], ensure_ascii=False)}",
        f"- Extension counts: {json.dumps(counts['extensions'], ensure_ascii=False)}",
        f"- Material-kind counts: {json.dumps(counts['materialKinds'], ensure_ascii=False)}",
        f"- Unit-signal counts: {json.dumps(counts['unitSignals'], ensure_ascii=False)}",
        f"- Source role counts: {json.dumps(counts['sourceRoles'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: only ZIP metadata, hashes, size, extension, coarse role, grade-semester, material-kind, and unit-signal labels are persisted.",
        "- Passed: the script does not extract document body text, source item wording, worked solutions, tables, images, page content, OCR text, or embeddings.",
        "- Required before student-facing use: S18 reviews safe pattern cards and generated MAIS practice for originality, mathematics, terminology, and grade fit.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / MANIFEST_NAME).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / QA_REPORT_NAME).write_text(qa_report(manifest), encoding="utf-8")


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        upper_zip = tmp_dir / "8上初中数学试卷.zip"
        lower_scope = tmp_dir / "八年级数学下册（人教版）"
        lower_scope.mkdir()
        lower_zip = lower_scope / "单元测试.zip"
        with ZipFile(upper_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("八年级上册/三角形/三角形单元测试.docx"), b"forbidden upper body text")
            archive.writestr(mojibake_zip_name("八年级上册/分式/分式同步练习答案.pdf"), b"%PDF forbidden answer body")
            archive.writestr(mojibake_zip_name("八年级上册/全等三角形/全等专题训练解析.doc"), b"forbidden solution body")
            archive.writestr(mojibake_zip_name("__MACOSX/._hidden.docx"), b"hidden")
            archive.writestr(mojibake_zip_name("八年级上册/资料链接.url"), b"https://example.invalid")
        with ZipFile(lower_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("单元测试/一次函数单元测试.docx"), b"forbidden lower body text")
            archive.writestr(mojibake_zip_name("单元测试/二次根式专题练习.docx"), b"forbidden coordinate body")
            archive.writestr(mojibake_zip_name("单元测试/数据分析期末综合详解.pdf"), b"%PDF forbidden detailed body")
        manifest = build_manifest([upper_zip, lower_zip], ["S2:upper", "S2:lower"])
        serialized = json.dumps(manifest, ensure_ascii=False)
        assert manifest["totals"]["files"] == 6  # type: ignore[index]
        assert manifest["totals"]["ignoredVisibleFiles"] == 1  # type: ignore[index]
        assert manifest["coverage"]["expectedSlotCoverage"]["S2:upper"] == 3  # type: ignore[index]
        assert manifest["coverage"]["expectedSlotCoverage"]["S2:lower"] == 3  # type: ignore[index]
        assert manifest["coverage"]["expectedSlotsComplete"] is True  # type: ignore[index]
        assert manifest["archiveScopeCounts"]["8上初中数学试卷.zip"]["files"] == 3  # type: ignore[index]
        assert manifest["archiveScopeCounts"]["单元测试.zip"]["files"] == 3  # type: ignore[index]
        assert manifest["counts"]["extensions"] == {".docx": 3, ".pdf": 2, ".doc": 1}  # type: ignore[index]
        assert manifest["totals"]["answerLabelFiles"] == 1  # type: ignore[index]
        assert manifest["totals"]["solutionLabelFiles"] == 2  # type: ignore[index]
        assert "sourceArchive" not in serialized
        assert "entryPath" not in serialized
        assert "forbidden upper body text" not in serialized
        assert "forbidden lower body text" not in serialized
        assert "forbidden coordinate body" not in serialized
        assert "forbidden solution body" not in serialized
        assert "%PDF forbidden" not in serialized
    print("Self-test passed: metadata-only junior paper archive manifest built without content extraction.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland PEP junior paper archive metadata manifest.")
    parser.add_argument("zip_paths", nargs="*", help="Paths to private junior paper ZIP archives.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--expected-slot", action="append", default=None, help="Expected grade-semester slot such as S1:upper. Repeat for multiple slots.")
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
    print(f"Wrote {manifest['totals']['files']} metadata-only junior paper archive file entries to {args.out_dir}")


if __name__ == "__main__":
    main()
