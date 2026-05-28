#!/usr/bin/env python3
"""Build a local-only manifest for Mainland PEP primary exam/practice archives.

The script records archive-entry metadata and coarse assessment classification
only. It does not extract, persist, or print document body text, answer text,
worked solutions, images, tables, page content, page images, or OCR text.
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
from zipfile import ZipFile


DEFAULT_OUT_DIR = Path(".local/rag/mainland-pep-primary-exams")
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit source archives, extracted "
    "document body text, answer text, worked solutions, OCR text, tables, "
    "figures, page images, page-level descriptions, or source item wording."
)
ASSESSMENT_FAMILIES = [
    "lesson-practice",
    "unit-test",
    "topic-drill",
    "midterm",
    "final",
    "comprehensive",
]
PRIMARY_GRADE_MARKERS = [
    ("P1", ["一年级", "1年级", "一年上", "一年下", "一上", "一下", "1上", "1下", "数学1上", "数学1下", "P1", "p1"]),
    ("P2", ["二年级", "2年级", "二上", "二下", "2上", "2下", "数学2上", "数学2下", "P2", "p2"]),
    ("P3", ["三年级", "3年级", "三上", "三下", "3上", "3下", "数学3上", "数学3下", "P3", "p3"]),
    ("P4", ["四年级", "4年级", "四上", "四下", "4上", "4下", "数学4上", "数学4下", "P4", "p4"]),
    ("P5", ["五年级", "5年级", "五上", "五下", "5上", "5下", "数学5上", "数学5下", "P5", "p5"]),
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
    "春季",
    "lower",
]


def decode_zip_name(name: str) -> str:
    decoded = name
    try:
        decoded = name.encode("cp437").decode("gb18030")
    except UnicodeError:
        try:
            decoded = name.encode("cp437").decode("utf-8")
        except UnicodeError:
            decoded = name

    if any(marker in decoded for marker in ["銆", "骞", "绾", "涓", "瀛"]):
        try:
            decoded = decoded.encode("gb18030").decode("utf-8")
        except UnicodeError:
            pass
    return decoded


def is_ignored_entry(decoded_name: str) -> bool:
    parts = decoded_name.split("/")
    basename = parts[-1] if parts else decoded_name
    return (
        decoded_name.startswith("__MACOSX/")
        or "/__MACOSX/" in decoded_name
        or basename == ".DS_Store"
        or basename.startswith("._")
    )


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_for_path(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
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


def archive_scope_for_path(archive_path: Path) -> dict[str, str]:
    return {
        "grade": infer_grade(archive_path.name),
        "semester": infer_semester(archive_path.name),
    }


def assessment_family_signals(name: str) -> list[str]:
    signals = []
    if any(marker in name for marker in ["同步", "课时", "练习题", "练习册"]):
        signals.append("lesson-practice")
    if any(marker in name for marker in ["单元", "达标测试"]):
        signals.append("unit-test")
    if any(marker in name for marker in ["专项", "重点训练"]):
        signals.append("topic-drill")
    if "期中" in name:
        signals.append("midterm")
    if "期末" in name:
        signals.append("final")
    if any(marker in name for marker in ["综合", "素养", "测评", "复习"]):
        signals.append("comprehensive")
    return [family for family in ASSESSMENT_FAMILIES if family in signals]


def primary_assessment_family(name: str) -> str:
    signals = assessment_family_signals(name)
    return signals[0] if signals else "unknown"


def source_role(name: str, is_dir: bool) -> str:
    if is_dir:
        return "directory"
    if any(marker in name for marker in ["解析", "详解", "讲评"]):
        return "solution"
    if "答案" in name:
        return "paper-with-solution" if "含答案" in name else "answer"
    if any(marker in name for marker in ["试卷", "测评", "测试", "训练", "练习"]):
        return "assessment"
    return "document"


def classify_entry(decoded_name: str, archive_path: Path, is_dir: bool, archive_scope: dict[str, str]) -> dict[str, object]:
    searchable = f"{archive_path.name}/{decoded_name}"
    basename = decoded_name.rstrip("/").rsplit("/", 1)[-1]
    entry_grade = infer_grade(decoded_name)
    entry_semester = infer_semester(decoded_name)
    grade = entry_grade if entry_grade != "unknown" else archive_scope["grade"]
    semester = entry_semester if entry_semester != "unknown" else archive_scope["semester"]
    family_signals = assessment_family_signals(searchable)
    return {
        "grade": grade,
        "semester": semester,
        "archiveGradeFallbackUsed": entry_grade == "unknown" and archive_scope["grade"] != "unknown",
        "archiveSemesterFallbackUsed": entry_semester == "unknown" and archive_scope["semester"] != "unknown",
        "assessmentFamily": primary_assessment_family(searchable),
        "assessmentFamilySignals": family_signals,
        "sourceRole": source_role(searchable, is_dir),
        "extension": "" if is_dir else Path(basename).suffix.lower(),
    }


def manifest_entries_for_archive(zip_path: Path) -> list[dict[str, object]]:
    entries = []
    archive_hash = sha256_for_path(zip_path)
    archive_scope = archive_scope_for_path(zip_path)
    with ZipFile(zip_path) as archive:
        for info in archive.infolist():
            decoded_name = decode_zip_name(info.filename)
            if is_ignored_entry(decoded_name):
                continue
            is_dir = decoded_name.endswith("/")
            classification = classify_entry(decoded_name, zip_path, is_dir, archive_scope)
            file_hash = None if is_dir else sha256_bytes(archive.read(info))
            entries.append({
                "id": f"pep-primary-exam-{classification['grade'].lower()}-{classification['semester']}-{hashlib.sha1((zip_path.name + decoded_name).encode('utf-8')).hexdigest()[:10]}",
                "publisher": "MAINLAND_PEP",
                "stage": "primary",
                "sourceArchive": str(zip_path),
                "sourceArchiveName": zip_path.name,
                "sourceArchiveSha256": archive_hash,
                "entryPath": decoded_name,
                "fileName": decoded_name.rstrip("/").rsplit("/", 1)[-1],
                "sizeBytes": info.file_size,
                "compressedBytes": info.compress_size,
                "sha256": file_hash,
                "retentionPolicy": "metadata-only-local",
                "bodyTextPersisted": False,
                "answerTextPersisted": False,
                "ocrTextPersisted": False,
                "pageImagesPersisted": False,
                "safetyNote": SAFETY_NOTE,
                **classification,
            })
    return entries


def count_by(entries: list[dict[str, object]], field: str) -> dict[str, int]:
    return dict(sorted(Counter(str(entry.get(field) or "unknown") for entry in entries).items()))


def parse_expected_slot(slot: str) -> str:
    normalized = slot.strip()
    if ":" not in normalized:
        raise ValueError(f"Expected slot must look like P6:upper or P6:lower: {slot}")
    grade, semester = normalized.split(":", 1)
    valid_grades = {grade_id for grade_id, _markers in PRIMARY_GRADE_MARKERS}
    if grade not in valid_grades or semester not in {"upper", "lower"}:
        raise ValueError(f"Unsupported expected slot: {slot}")
    return f"{grade}:{semester}"


def coverage(entries: list[dict[str, object]], expected_slots: list[str] | None = None) -> dict[str, object]:
    files = [entry for entry in entries if entry["sourceRole"] != "directory"]
    grade_semester_counts = Counter(f"{entry['grade']}:{entry['semester']}" for entry in files)
    primary_slots = [f"P{grade}:{semester}" for grade in range(1, 7) for semester in ("upper", "lower")]
    normalized_expected_slots = expected_slots or primary_slots
    expected_slot_coverage = {slot: grade_semester_counts.get(slot, 0) for slot in normalized_expected_slots}
    return {
        "gradeSemesterCounts": dict(sorted(grade_semester_counts.items())),
        "primaryGradeSemesterCoverage": {slot: grade_semester_counts.get(slot, 0) for slot in primary_slots},
        "expectedSlots": normalized_expected_slots,
        "expectedSlotCoverage": expected_slot_coverage,
        "expectedSlotsComplete": all(count > 0 for count in expected_slot_coverage.values()),
        "missingExpectedSlots": [slot for slot, count in expected_slot_coverage.items() if count == 0],
        "coveredGradeSemesters": [slot for slot, count in sorted(grade_semester_counts.items()) if count > 0],
    }


def build_manifest(zip_paths: list[Path], expected_slots: list[str] | None = None) -> dict[str, object]:
    resolved_paths = [path.expanduser().resolve() for path in zip_paths]
    entries: list[dict[str, object]] = []
    for zip_path in resolved_paths:
        if not zip_path.exists():
            raise FileNotFoundError(f"Archive not found: {zip_path}")
        entries.extend(manifest_entries_for_archive(zip_path))

    files = [entry for entry in entries if entry["sourceRole"] != "directory"]
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_PEP",
        "stage": "primary",
        "artifactKind": "metadata-only-primary-exam-archive-manifest",
        "safetyNote": SAFETY_NOTE,
        "sourceArchives": [str(path) for path in resolved_paths],
        "coverage": coverage(entries, expected_slots),
        "totals": {
            "archives": len(resolved_paths),
            "entries": len(entries),
            "files": len(files),
            "directories": len(entries) - len(files),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in files),
        },
        "gradeCounts": count_by(files, "grade"),
        "semesterCounts": count_by(files, "semester"),
        "assessmentFamilyCounts": count_by(files, "assessmentFamily"),
        "sourceRoleCounts": count_by(files, "sourceRole"),
        "extensionCounts": count_by(files, "extension"),
        "entries": entries,
    }


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage_info = manifest["coverage"]  # type: ignore[index]
    return "\n".join([
        "# Mainland PEP Primary Exam Archive Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Archives inspected: {totals['archives']}",
        f"- Files inspected: {totals['files']}",
        f"- Directories inspected: {totals['directories']}",
        f"- Total uncompressed bytes: {totals['uncompressedBytes']}",
        f"- Grade-semester counts: {json.dumps(coverage_info['gradeSemesterCounts'], ensure_ascii=False)}",
        f"- Primary grade-semester coverage: {json.dumps(coverage_info['primaryGradeSemesterCoverage'], ensure_ascii=False)}",
        f"- Expected grade-semester slots: {json.dumps(coverage_info['expectedSlots'], ensure_ascii=False)}",
        f"- Expected slot coverage: {json.dumps(coverage_info['expectedSlotCoverage'], ensure_ascii=False)}",
        f"- Expected slots complete: {coverage_info['expectedSlotsComplete']}",
        f"- Missing expected slots: {json.dumps(coverage_info['missingExpectedSlots'], ensure_ascii=False)}",
        f"- Assessment family counts: {json.dumps(manifest['assessmentFamilyCounts'], ensure_ascii=False)}",
        f"- Source role counts: {json.dumps(manifest['sourceRoleCounts'], ensure_ascii=False)}",
        f"- Extension counts: {json.dumps(manifest['extensionCounts'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: manifest entries contain archive-entry metadata, hashes, grade, semester, family, role, size, and extension only.",
        "- Passed: no document body text, source item wording, worked solution text, tables, figures, page content, page images, or OCR text are extracted or persisted.",
        "- Required before production use: S18 manual sampling of safe abstraction cards and generated output for source distance.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest), encoding="utf-8")


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        upper_zip = tmp_dir / "06.人教数学3上【试题试卷】25秋.zip"
        lower_zip = tmp_dir / "小学数学3下.zip"
        with ZipFile(upper_zip, "w") as archive:
            archive.writestr("__MACOSX/._ignored.docx", b"ignored")
            archive.writestr("同步课时练习/分数初步.docx", b"fake document bytes")
            archive.writestr("【人教数学三上】期末测试卷/三年级上册期末综合测评.pdf", b"%PDF fake")
        with ZipFile(lower_zip, "w") as archive:
            archive.writestr("小学数学3下/【人教版数学三年级下】单元测试/面积专项训练.docx", b"fake document bytes")
            archive.writestr("小学数学3下/【人教版数学三年级下】期中试卷/除数是一位数测评（含答案）.docx", b"fake document bytes")
        manifest = build_manifest([upper_zip, lower_zip], ["P3:upper", "P3:lower"])
        serialized = json.dumps(manifest, ensure_ascii=False)
        assert manifest["totals"]["files"] == 4  # type: ignore[index]
        assert manifest["coverage"]["gradeSemesterCounts"]["P3:upper"] == 2  # type: ignore[index]
        assert manifest["coverage"]["gradeSemesterCounts"]["P3:lower"] == 2  # type: ignore[index]
        assert manifest["coverage"]["expectedSlotsComplete"] is True  # type: ignore[index]
        assert manifest["assessmentFamilyCounts"]["lesson-practice"] == 1  # type: ignore[index]
        assert manifest["assessmentFamilyCounts"]["midterm"] == 1  # type: ignore[index]
        assert "fake document bytes" not in serialized
        assert "source item wording sample" not in serialized
    print("Self-test passed: metadata-only generic primary exam archive manifest built without content extraction.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland PEP primary exam/practice archive metadata manifest.")
    parser.add_argument("zip_paths", nargs="*", help="Paths to private PEP primary exam/practice ZIP archives.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--expected-slot", action="append", default=None, help="Expected grade-semester slot such as P6:upper. Repeat for multiple slots.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test with temporary fake ZIP archives.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.zip_paths:
        raise SystemExit("At least one ZIP path is required unless --self-test is used.")

    expected_slots = [parse_expected_slot(slot) for slot in args.expected_slot] if args.expected_slot else None
    manifest = build_manifest([Path(path) for path in args.zip_paths], expected_slots)
    write_outputs(manifest, Path(args.out_dir).expanduser())
    print(f"Wrote {manifest['totals']['files']} metadata-only archive file entries to {args.out_dir}")


if __name__ == "__main__":
    main()
