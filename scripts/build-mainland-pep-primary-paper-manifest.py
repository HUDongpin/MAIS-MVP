#!/usr/bin/env python3
"""Build a local-only metadata manifest for Mainland PEP primary paper archives.

The script records archive/file metadata and coarse classification only. It
does not extract, persist, or print document body text, answer text, worked
solutions, tables, images, page content, OCR text, embeddings, or source item wording.
Default outputs live under `.local/`, which is ignored by the repository.
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


DEFAULT_OUT_DIR = Path(".local/rag/mainland-pep-primary")
MANIFEST_NAME = "paper-manifest.json"
QA_REPORT_NAME = "paper-manifest-qa.md"
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source archives, extracted "
    "document body text, answer text, worked solutions, OCR text, tables, figures, "
    "page images, embeddings, source locators, or source item wording."
)
ALLOWED_EXTENSIONS = {".doc", ".docx", ".pdf"}
PRIMARY_GRADE_MARKERS = [
    ("P1", ["一年级", "1年级", "一年上", "一年下", "一上", "一下", "1上", "1下", "数学1上", "数学1下", "P1", "p1"]),
    ("P2", ["二年级", "2年级", "二上", "二下", "2上", "2下", "数学2上", "数学2下", "P2", "p2"]),
    ("P3", ["三年级", "3年级", "三上", "三下", "3上", "3下", "数学3上", "数学3下", "P3", "p3"]),
    ("P4", ["四年级", "4年级", "四上", "四下", "4上", "4下", "数学4上", "数学4下", "P4", "p4"]),
    ("P5", ["五年级", "5年级", "五上", "五下", "5上", "5下", "数学5上", "数学5下", "五年上", "五年下", "P5", "p5"]),
    ("P6", ["六年级", "6年级", "六上", "六下", "6上", "6下", "数学6上", "数学6下", "P6", "p6"]),
]
UPPER_SEMESTER_MARKERS = [
    "上册",
    "上学期",
    "一上",
    "二上",
    "三上",
    "四上",
    "五上",
    "六上",
    "1上",
    "2上",
    "3上",
    "4上",
    "5上",
    "6上",
    "数学1上",
    "数学2上",
    "数学3上",
    "数学4上",
    "数学5上",
    "数学6上",
    "一年上",
    "二年上",
    "三年上",
    "四年上",
    "五年上",
    "六年上",
    "秋季",
    "upper",
]
LOWER_SEMESTER_MARKERS = [
    "下册",
    "下学期",
    "一下",
    "二下",
    "三下",
    "四下",
    "五下",
    "六下",
    "1下",
    "2下",
    "3下",
    "4下",
    "5下",
    "6下",
    "数学1下",
    "数学2下",
    "数学3下",
    "数学4下",
    "数学5下",
    "数学6下",
    "一年下",
    "二年下",
    "三年下",
    "四年下",
    "五年下",
    "六年下",
    "春季",
    "lower",
]


def decode_zip_name(name: str) -> str:
    """Repair common Chinese filename mojibake from ZIP cp437 decoding."""
    try:
        raw_name = name.encode("cp437")
    except UnicodeEncodeError:
        return name

    for encoding in ("utf-8", "gb18030"):
        try:
            decoded = raw_name.decode(encoding)
            if any(marker in decoded for marker in ["銆", "骞", "绾", "涓", "瀛"]):
                try:
                    return decoded.encode("gb18030").decode("utf-8")
                except UnicodeError:
                    return decoded
            return decoded
        except UnicodeDecodeError:
            continue
    return name


def is_hidden_archive_entry(name: str) -> bool:
    parts = [part for part in name.split("/") if part]
    if "__MACOSX" in parts:
        return True
    return any(part.startswith("._") for part in parts)


def sha256_for_zip_entry(archive: ZipFile, info: ZipInfo) -> str:
    digest = hashlib.sha256()
    with archive.open(info) as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def infer_grade(text: str) -> str:
    for grade, markers in PRIMARY_GRADE_MARKERS:
        if any(marker in text for marker in markers):
            return grade
    return "unknown"


def infer_semester(text: str) -> str:
    if any(marker in text for marker in UPPER_SEMESTER_MARKERS) or re.search(r"(?:20)?\d{2}\s*秋", text):
        return "upper"
    if any(marker in text for marker in LOWER_SEMESTER_MARKERS) or re.search(r"(?:20)?\d{2}\s*春", text):
        return "lower"
    return "unknown"


def infer_version_season(text: str) -> str:
    year_match = re.search(r"20\d{2}", text)
    season = None
    if any(marker in text for marker in ["春", "春季", "spring"]):
        season = "spring"
    elif any(marker in text for marker in ["秋", "秋季", "autumn", "fall"]):
        season = "autumn"
    if year_match and season:
        return f"{year_match.group(0)}-{season}"
    if year_match:
        return year_match.group(0)
    if season:
        return season
    return "unknown"


def material_kinds_for(name: str) -> list[str]:
    checks = [
        ("unit-test", ["单元检测", "单元测试", "单元评测", "基础测试", "提高测试", "提优测试"]),
        ("sync-practice", ["同步练习", "同步小练", "课时练习", "小练"]),
        ("topic-practice", ["专项练习", "专项训练", "专项"]),
        ("tiered-practice", ["分层练习", "分层"]),
        ("midterm-final", ["期中", "期末"]),
        ("error-extension", ["易错", "提优", "高频", "重难", "优化"]),
        ("challenge-practice", ["奥数", "挑战", "思维拓展"]),
        ("comprehensive-assessment", ["综合", "素养", "学情自测"]),
        ("calculation-practice", ["计算"]),
        ("problem-solving", ["解决问题"])
    ]
    kinds = [kind for kind, markers in checks if any(marker in name for marker in markers)]
    return kinds or ["paper"]


def page_formats_for(name: str) -> list[str]:
    formats = []
    if re.search(r"A3", name, re.IGNORECASE):
        formats.append("A3")
    if re.search(r"A4", name, re.IGNORECASE):
        formats.append("A4")
    return formats


def unit_markers_for(name: str) -> list[str]:
    markers = set(re.findall(r"第[一二三四五六七八九十]+单元", name))
    markers.update(re.findall(r"第\d+单元", name))
    return sorted(markers)


def archive_root_and_group(name: str) -> tuple[str, str]:
    parts = [part for part in name.split("/") if part]
    if not parts:
        return "", ""
    root = parts[0]
    if len(parts) >= 3:
        return root, parts[1]
    if len(parts) >= 2 and name.endswith("/"):
        return root, parts[1]
    return root, root


def classify_archive_entry(zip_path: Path, archive: ZipFile, info: ZipInfo) -> tuple[dict[str, object] | None, dict[str, object] | None]:
    decoded_name = decode_zip_name(info.filename)
    if is_hidden_archive_entry(decoded_name) or decoded_name.endswith("/"):
        return None, None

    extension = Path(decoded_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        return None, {
            "extension": extension or "<none>",
            "reason": "unsupported-extension",
            "sizeBytes": info.file_size
        }

    root, top_group = archive_root_and_group(decoded_name)
    searchable = f"{zip_path.name} {decoded_name}"
    grade = infer_grade(searchable)
    semester = infer_semester(searchable)
    return {
        "id": f"pep-primary-paper-{grade.lower()}-{semester}-{hashlib.sha1(f'{zip_path}:{decoded_name}'.encode('utf-8')).hexdigest()[:12]}",
        "publisher": "MAINLAND_PEP",
        "stage": "primary",
        "grade": grade,
        "semester": semester,
        "versionSeason": infer_version_season(searchable),
        "sourceArchiveName": zip_path.name,
        "rootDirectory": root,
        "topGroup": top_group,
        "fileName": Path(decoded_name).name,
        "extension": extension,
        "sizeBytes": info.file_size,
        "compressedBytes": info.compress_size,
        "crc32": f"{info.CRC:08x}",
        "sha256": sha256_for_zip_entry(archive, info),
        "materialKinds": material_kinds_for(decoded_name),
        "pageFormats": page_formats_for(decoded_name),
        "unitMarkers": unit_markers_for(decoded_name),
        "hasAnswerLabel": "答案" in decoded_name,
        "hasSolutionLabel": "解析" in decoded_name,
        "retentionPolicy": "metadata-only-local",
        "bodyTextPersisted": False,
        "answerTextPersisted": False,
        "solutionTextPersisted": False,
        "ocrTextPersisted": False,
        "pageImagesPersisted": False,
        "embeddingsPersisted": False,
        "safetyNote": SAFETY_NOTE
    }, None


def sorted_counter(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted(counter.items(), key=lambda item: (-item[1], item[0])))


def coverage(entries: list[dict[str, object]]) -> dict[str, object]:
    grade_semester_counts = Counter(f"{entry['grade']}:{entry['semester']}" for entry in entries)
    grade_semester_extension_counts: dict[str, dict[str, int]] = {}
    for entry in entries:
        slot = f"{entry['grade']}:{entry['semester']}"
        extension = str(entry["extension"])
        grade_semester_extension_counts.setdefault(slot, {})
        grade_semester_extension_counts[slot][extension] = grade_semester_extension_counts[slot].get(extension, 0) + 1
    primary_slots = [f"P{grade}:{semester}" for grade in range(1, 7) for semester in ("upper", "lower")]
    return {
        "gradeSemesterCounts": dict(sorted(grade_semester_counts.items())),
        "gradeSemesterExtensionCounts": dict(sorted(
            (slot, dict(sorted(extension_counts.items())))
            for slot, extension_counts in grade_semester_extension_counts.items()
        )),
        "primaryGradeSemesterCoverage": {slot: grade_semester_counts.get(slot, 0) for slot in primary_slots},
        "coveredGradeSemesters": [slot for slot, count in sorted(grade_semester_counts.items()) if count > 0],
    }


def build_manifest(zip_paths: list[Path]) -> dict[str, object]:
    entries: list[dict[str, object]] = []
    ignored_entries: list[dict[str, object]] = []
    archive_summaries: list[dict[str, object]] = []

    for input_path in zip_paths:
        zip_path = input_path.expanduser().resolve()
        if not zip_path.exists():
            raise FileNotFoundError(f"Archive not found: {zip_path}")
        archive_entry_count = 0
        archive_file_count = 0
        archive_ignored_count = 0
        archive_hidden_count = 0
        with ZipFile(zip_path) as archive:
            for info in archive.infolist():
                decoded_name = decode_zip_name(info.filename)
                if is_hidden_archive_entry(decoded_name):
                    archive_hidden_count += 1
                    continue
                archive_entry_count += 1
                if decoded_name.endswith("/"):
                    continue
                archive_file_count += 1
                entry, ignored = classify_archive_entry(zip_path, archive, info)
                if entry:
                    entries.append(entry)
                if ignored:
                    archive_ignored_count += 1
                    ignored_entries.append({
                        "sourceArchiveName": zip_path.name,
                        **ignored
                    })
        archive_summaries.append({
            "sourceArchiveName": zip_path.name,
            "visibleEntries": archive_entry_count,
            "visibleFiles": archive_file_count,
            "manifestedFiles": sum(1 for entry in entries if entry["sourceArchiveName"] == zip_path.name),
            "hiddenArchiveEntriesExcluded": archive_hidden_count,
            "ignoredVisibleFiles": archive_ignored_count
        })

    material_counts = Counter(kind for entry in entries for kind in entry["materialKinds"])  # type: ignore[union-attr]
    top_group_counts = Counter(str(entry["topGroup"]) for entry in entries)
    extension_counts = Counter(str(entry["extension"]) for entry in entries)
    format_counts = Counter(fmt for entry in entries for fmt in entry["pageFormats"])  # type: ignore[union-attr]
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_PEP",
        "stage": "primary",
        "artifactKind": "metadata-only-primary-paper-archive-manifest",
        "safetyNote": SAFETY_NOTE,
        "archives": archive_summaries,
        "coverage": coverage(entries),
        "totals": {
            "archives": len(zip_paths),
            "files": len(entries),
            "bytes": sum(int(entry["sizeBytes"]) for entry in entries),
            "ignoredVisibleFiles": len(ignored_entries),
            "answerLabelFiles": sum(1 for entry in entries if entry["hasAnswerLabel"]),
            "solutionLabelFiles": sum(1 for entry in entries if entry["hasSolutionLabel"])
        },
        "counts": {
            "extensions": sorted_counter(extension_counts),
            "materialKinds": sorted_counter(material_counts),
            "topGroups": sorted_counter(top_group_counts),
            "pageFormats": sorted_counter(format_counts)
        },
        "ignoredEntries": ignored_entries,
        "entries": entries
    }


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage_info = manifest["coverage"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    return "\n".join([
        "# Mainland PEP Primary Paper Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Archives inspected: {totals['archives']}",
        f"- Files manifested: {totals['files']}",
        f"- Ignored visible files: {totals['ignoredVisibleFiles']}",
        f"- Grade-semester counts: {json.dumps(coverage_info['gradeSemesterCounts'], ensure_ascii=False)}",
        f"- Grade-semester extension counts: {json.dumps(coverage_info['gradeSemesterExtensionCounts'], ensure_ascii=False)}",
        f"- Primary grade-semester coverage: {json.dumps(coverage_info['primaryGradeSemesterCoverage'], ensure_ascii=False)}",
        f"- Extension counts: {json.dumps(counts['extensions'], ensure_ascii=False)}",
        f"- Material-kind counts: {json.dumps(counts['materialKinds'], ensure_ascii=False)}",
        f"- Page-format counts: {json.dumps(counts['pageFormats'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: only ZIP entry metadata, checksums, size, format labels, and coarse classifications are persisted.",
        "- Passed: the script does not extract document body text, source item wording, worked solutions, tables, images, OCR text, or embeddings.",
        "- Required before student-facing use: S18 reviews the resulting safe pattern cards and keeps generated MAIS practice original.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / MANIFEST_NAME).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / QA_REPORT_NAME).write_text(qa_report(manifest), encoding="utf-8")


def mojibake_zip_name(name: str) -> str:
    return name.encode("utf-8").decode("cp437")


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        upper_zip = tmp_dir / "03.数学5上-试题.zip"
        lower_zip = tmp_dir / "03.人教版数学5下【试题试卷】.zip"
        for marker in ("五年级", "5年级", "五上", "五下", "5上", "5下", "数学5上", "数学5下", "P5", "p5"):
            assert infer_grade(marker) == "P5", f"P5 grade marker was not recognized: {marker}"
        for marker in ("上册", "上学期", "五上", "5上", "数学5上", "秋季", "upper"):
            assert infer_semester(marker) == "upper", f"Upper semester marker was not recognized: {marker}"
        for marker in ("下册", "下学期", "五下", "5下", "数学5下", "春季", "lower"):
            assert infer_semester(marker) == "lower", f"Lower semester marker was not recognized: {marker}"
        with ZipFile(upper_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("人教版小学数学5年级上册/单元测试/五年级数学上册小数乘法检测.docx"), b"forbidden body text should never be persisted")
            archive.writestr(mojibake_zip_name("人教版小学数学5上/知识总结/五年级上册核心知识点.pdf"), b"%PDF body should never be persisted")
            archive.writestr(mojibake_zip_name("__MACOSX/._hidden.docx"), b"hidden")
            archive.writestr(mojibake_zip_name("人教版 小学数学2下/资料链接.url"), b"https://example.invalid")
        with ZipFile(lower_zip, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(mojibake_zip_name("人教版 小学数学5下/专项练习/五年级数学下册因数和倍数专项训练.docx"), b"answer body should never be persisted")
            archive.writestr(mojibake_zip_name("人教版 小学数学5下/期末试卷/五年级数学下册期末综合评测A4.doc"), b"solution body should never be persisted")
        manifest = build_manifest([upper_zip, lower_zip])
        serialized = json.dumps(manifest, ensure_ascii=False)
        coverage_info = manifest["coverage"]  # type: ignore[index]
        grade_semester_counts = coverage_info["gradeSemesterCounts"]  # type: ignore[index]
        primary_coverage = coverage_info["primaryGradeSemesterCoverage"]  # type: ignore[index]
        grade_semester_extension_counts = coverage_info["gradeSemesterExtensionCounts"]  # type: ignore[index]

        def assert_slot_count(slot: str, expected: int) -> None:
            actual = primary_coverage.get(slot, grade_semester_counts.get(slot, 0))
            assert actual == expected, (
                f"{slot} coverage expected {expected}, got {actual}; "
                f"gradeSemesterCounts={json.dumps(grade_semester_counts, ensure_ascii=False)}; "
                f"primaryGradeSemesterCoverage={json.dumps(primary_coverage, ensure_ascii=False)}"
            )

        def assert_slot_extensions(slot: str, expected: dict[str, int]) -> None:
            actual = grade_semester_extension_counts.get(slot, {})
            assert actual == expected, (
                f"{slot} extension coverage expected {json.dumps(expected, ensure_ascii=False)}, "
                f"got {json.dumps(actual, ensure_ascii=False)}; "
                f"gradeSemesterExtensionCounts={json.dumps(grade_semester_extension_counts, ensure_ascii=False)}"
            )

        assert manifest["totals"]["files"] == 4  # type: ignore[index]
        assert manifest["totals"]["ignoredVisibleFiles"] == 1  # type: ignore[index]
        assert_slot_count("P5:upper", 2)
        assert_slot_count("P5:lower", 2)
        assert_slot_extensions("P5:upper", {".docx": 1, ".pdf": 1})
        assert_slot_extensions("P5:lower", {".doc": 1, ".docx": 1})
        assert "小数乘法" in serialized
        assert "因数和倍数" in serialized
        assert "forbidden body text" not in serialized
        assert "answer body" not in serialized
        assert "solution body" not in serialized
        assert "%PDF body" not in serialized
        assert "example.invalid" not in serialized
        assert "__MACOSX" not in serialized
    print("Self-test passed: primary paper manifest supports DOC/DOCX/PDF metadata only and filters hidden/unsupported files.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland PEP primary paper archive metadata manifest.")
    parser.add_argument("zip_paths", nargs="*", help="Paths to private PEP primary paper archive ZIP files.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test with temporary fake archives.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.zip_paths:
        raise SystemExit("At least one ZIP path is required unless --self-test is used.")

    manifest = build_manifest([Path(path) for path in args.zip_paths])
    write_outputs(manifest, Path(args.out_dir).expanduser())
    print(
        f"Wrote {manifest['totals']['files']} metadata-only document entries "
        f"from {manifest['totals']['archives']} archive(s) to {args.out_dir}"
    )


if __name__ == "__main__":
    main()
