#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland BNU S4 upper assessments.

Outputs are metadata-only and live under ignored `.local/`. The script never
extracts or writes document body text, protected prompt wording, response-key
text, worked-response text, scoring wording, page images, table bodies, figure
bodies, page locators, OCR output, archive paths, member names, checksums, or
retrieval payloads.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile


DEFAULT_OUT_DIR = Path(".local/rag/mainland-bnu-high-s4-upper-assessments")
ZIP_PATHS_ENV_VAR = "MAIS_BNU_HIGH_S4_UPPER_ASSESSMENT_ZIPS"
MANIFEST_NAME = "manifest.json"
QA_REPORT_NAME = "qa-report.md"
BODY_SENTINEL = "MAIS_BODY_SENTINEL_SHOULD_NOT_APPEAR"
SUPPORTED_EXTENSIONS = {".doc", ".docx", ".pdf"}
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit private archives, archive names, "
    "member names, source paths, extracted document text, source item wording, "
    "response-key text, worked-response text, scoring wording, table bodies, "
    "figure bodies, page-location data, OCR output, checksums, derived semantic "
    "indexes, or retrieval payloads."
)

UNIT_SLOTS = [
    ("预备知识", ["第一章", "第1章", "预备知识"], "bnu-high-s4-upper-preparatory-knowledge-unit-pattern", ["sets", "inequality-properties", "quadratic-equations"]),
    ("函数", ["第二章", "第2章"], "bnu-high-s4-upper-functions-unit-pattern", ["function-definition", "domain-range", "monotonicity", "parity"]),
    ("指数运算与指数函数", ["第三章", "第3章", "指数运算", "指数函数"], "bnu-high-s4-upper-exponential-unit-pattern", ["exponents", "exponential-functions"]),
    ("对数运算与对数函数", ["第四章", "第4章", "对数运算", "对数函数"], "bnu-high-s4-upper-logarithmic-unit-pattern", ["logarithmic-operations", "logarithmic-functions"]),
    ("函数应用", ["第五章", "第5章", "函数应用"], "bnu-high-s4-upper-function-applications-unit-pattern", ["function-applications", "function-zero"]),
    ("统计", ["第六章", "第6章", "统计"], "bnu-high-s4-upper-statistics-unit-pattern", ["statistics", "sampling", "data-analysis"]),
    ("概率", ["第七章", "第7章", "概率"], "bnu-high-s4-upper-probability-unit-pattern", ["probability-foundations", "random-events"]),
]


def contains_any(text: str, markers: list[str]) -> bool:
    return any(marker in text for marker in markers)


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
    signals = ["数学", "北师大", "单元", "期中", "期末", "预备知识", "函数", "指数", "对数", "统计", "概率"]
    for candidate in candidates:
        if contains_any(candidate, signals):
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


def unit_slot_for(name: str) -> tuple[str, str, list[str]] | None:
    for chapter, markers, slot, concepts in UNIT_SLOTS:
        if contains_any(name, markers):
            return chapter, slot, concepts
    return None


def classify_member(decoded_name: str, extension: str, ordinal: int) -> dict[str, object] | None:
    compact = re.sub(r"\s+", "", decoded_name)
    compact_leaf = re.sub(r"\s+", "", Path(decoded_name).name)
    source_role = "strategy-support" if contains_any(compact_leaf, ["解析", "详解", "讲评", "参考", "答案", "教师"]) else "student-assessment"
    if contains_any(compact_leaf, ["期中"]):
        unit_signals = ["预备知识", "函数", "指数运算与指数函数", "对数运算与对数函数"]
        pattern_slots = ["bnu-high-s4-upper-midterm-function-properties-review"]
        concepts = ["function-definition", "monotonicity", "exponential-functions", "logarithmic-functions"]
        families = ["midterm"]
        material_kinds = ["midterm-final", "paper"]
    elif contains_any(compact_leaf, ["期末", "期终"]):
        unit_signals = [chapter for chapter, _markers, _slot, _concepts in UNIT_SLOTS]
        pattern_slots = ["bnu-high-s4-upper-final-full-volume-review"]
        concepts = ["function-definition", "function-applications", "statistics", "probability-foundations"]
        families = ["final", "comprehensive"]
        material_kinds = ["midterm-final", "paper"]
    else:
        unit_slot = unit_slot_for(compact)
        if not unit_slot:
            return None
        chapter, slot, concepts = unit_slot
        unit_signals = [chapter]
        pattern_slots = [slot]
        families = ["unit-test"]
        material_kinds = ["unit-test", "paper"]
    return {
        "id": f"bnu-high-s4-upper-assessment-entry-{ordinal:04d}",
        "publisher": "MAINLAND_BNU",
        "stage": "senior-secondary",
        "grade": "S4",
        "semester": "upper",
        "extension": extension,
        "sourceRole": source_role,
        "materialKinds": material_kinds,
        "assessmentFamilies": families,
        "unitSignals": unit_signals,
        "conceptSignals": concepts,
        "patternSlots": pattern_slots,
        "alignmentStatus": "support-only" if source_role == "strategy-support" else "current-safe-candidate",
        "patternMiningEligible": source_role == "student-assessment",
        "retentionPolicy": "metadata-only-local",
        "safetyNote": SAFETY_NOTE,
    }


def sorted_counter(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted(counter.items(), key=lambda item: item[0]))


def list_count(entries: list[dict[str, object]], field: str) -> dict[str, int]:
    counts: Counter[str] = Counter()
    for entry in entries:
        values = entry.get(field)
        if isinstance(values, list):
            counts.update(str(value) for value in values)
    return sorted_counter(counts)


def build_manifest(zip_paths: list[Path]) -> dict[str, object]:
    entries: list[dict[str, object]] = []
    ignored_entries: list[dict[str, object]] = []
    archives: list[dict[str, object]] = []
    ordinal = 0
    for archive_index, input_path in enumerate(zip_paths, start=1):
        zip_path = input_path.expanduser()
        if not zip_path.exists():
            raise FileNotFoundError("Archive not found.")
        if zip_path.suffix.lower() != ".zip":
            raise ValueError("Expected ZIP archive.")
        visible_files = hidden_entries = ignored_visible_files = 0
        before_count = len(entries)
        with ZipFile(zip_path) as archive:
            for info in archive.infolist():
                decoded_name = decode_zip_name(info.filename)
                if info.is_dir() or is_hidden_or_mac_entry(decoded_name):
                    hidden_entries += 1
                    continue
                visible_files += 1
                extension = Path(decoded_name).suffix.lower()
                suspicious = suspicious_reason(decoded_name)
                if suspicious or extension not in SUPPORTED_EXTENSIONS:
                    ignored_visible_files += 1
                    ignored_entries.append({"archiveOrdinal": archive_index, "extension": extension or "<none>", "reason": suspicious or "unsupported-extension"})
                    continue
                classified = classify_member(decoded_name, extension, ordinal + 1)
                if not classified:
                    ignored_visible_files += 1
                    ignored_entries.append({"archiveOrdinal": archive_index, "extension": extension, "reason": "insufficient-explicit-target-signal"})
                    continue
                ordinal += 1
                entries.append(classified)
        archive_entries = entries[before_count:]
        archives.append({
            "archiveOrdinal": archive_index,
            "visibleFiles": visible_files,
            "manifestedFiles": len(archive_entries),
            "hiddenArchiveEntriesExcluded": hidden_entries,
            "ignoredVisibleFiles": ignored_visible_files,
            "alignmentStatusCounts": sorted_counter(Counter(str(entry["alignmentStatus"]) for entry in archive_entries)),
        })
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_BNU",
        "stage": "senior-secondary",
        "gradeSemesterTarget": "S4:upper",
        "artifactKind": "metadata-only-bnu-high-s4-upper-assessment-manifest",
        "safetyPolicy": "metadata-only-local",
        "safetyNote": SAFETY_NOTE,
        "archives": archives,
        "totals": {
            "archives": len(zip_paths),
            "validDocuments": len(entries),
            "files": len(entries),
            "ignoredVisibleFiles": len(ignored_entries),
            "studentAssessmentFiles": sum(1 for entry in entries if entry["sourceRole"] == "student-assessment"),
            "strategySupportFiles": sum(1 for entry in entries if entry["sourceRole"] == "strategy-support"),
            "currentSafeCandidateFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "current-safe-candidate"),
            "supportOnlyFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "support-only"),
            "needsS18ReviewFiles": sum(1 for entry in ignored_entries if entry["reason"] == "insufficient-explicit-target-signal"),
            "quarantinedFiles": sum(1 for entry in ignored_entries if entry["reason"] != "insufficient-explicit-target-signal"),
        },
        "counts": {
            "extensions": sorted_counter(Counter(str(entry["extension"]) for entry in entries)),
            "sourceRoles": sorted_counter(Counter(str(entry["sourceRole"]) for entry in entries)),
            "assessmentFamilies": list_count(entries, "assessmentFamilies"),
            "unitSignals": list_count(entries, "unitSignals"),
            "conceptSignals": list_count(entries, "conceptSignals"),
            "patternSlots": list_count(entries, "patternSlots"),
        },
        "ignoredEntries": ignored_entries,
        "entries": entries,
    }


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    return "\n".join([
        "# Mainland BNU High S4 Upper Assessment Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Target: {manifest['gradeSemesterTarget']}",
        f"- Archives inspected: {totals['archives']}",
        f"- Valid assessment documents: {totals['validDocuments']}",
        f"- Student assessment files: {totals['studentAssessmentFiles']}",
        f"- Strategy-support files: {totals['strategySupportFiles']}",
        f"- Ignored visible files: {totals['ignoredVisibleFiles']}",
        f"- Unit coverage: {json.dumps(counts['unitSignals'], ensure_ascii=False)}",
        f"- Pattern-slot coverage: {json.dumps(counts['patternSlots'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: metadata only; no document bodies, member names, archive names, source paths, page locators, OCR output, checksums, derived semantic indexes, or retrieval payloads are written.",
        "- Passed: strategy-support files are marked `patternMiningEligible=false`.",
        "- Required before student-facing use: S18 reviews future generated MAIS practice for originality, mathematics, terminology, and grade fit.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / MANIFEST_NAME).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / QA_REPORT_NAME).write_text(qa_report(manifest), encoding="utf-8")


def assert_no_private_artifacts(manifest: dict[str, object]) -> None:
    serialized = json.dumps(manifest, ensure_ascii=False)
    for forbidden in [
        "archiveName",
        "memberName",
        "sourcePath",
        "entryPath",
        "fileName",
        "sourceFile",
        "/Users/",
        "Downloads",
        "原卷版",
        "解析版",
        BODY_SENTINEL,
        "hash",
        "embedding",
        "vector",
    ]:
        assert forbidden not in serialized, f"Manifest leaked forbidden marker: {forbidden}"


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        source_dir = Path(tmp) / "高中数学必修第一册（北师大版）"
        source_dir.mkdir(parents=True)
        unit_zip = source_dir / "unit.zip"
        term_zip = source_dir / "term.zip"

        def add_entry(archive: ZipFile, name: str) -> None:
            archive.writestr(mojibake_zip_name(name), BODY_SENTINEL.encode("utf-8"))

        with ZipFile(unit_zip, "w", compression=ZIP_DEFLATED) as archive:
            add_entry(archive, "单元测试/第一章 预备知识章末测试（原卷版）.docx")
            add_entry(archive, "单元测试/第四章 对数运算与对数函数章末测试（解析版）.docx")
            archive.writestr(mojibake_zip_name("__MACOSX/._hidden.docx"), b"hidden")
            archive.writestr("../unsafe.docx", BODY_SENTINEL.encode("utf-8"))
            archive.writestr("notes/readme.txt", BODY_SENTINEL.encode("utf-8"))
        with ZipFile(term_zip, "w", compression=ZIP_DEFLATED) as archive:
            add_entry(archive, "期中期末/期中复习卷（函数性质的应用）.docx")
            add_entry(archive, "期中期末/高一上学期期末复习数学试卷.docx")

        manifest = build_manifest([unit_zip, term_zip])
        assert manifest["totals"]["validDocuments"] == 4  # type: ignore[index]
        assert manifest["totals"]["ignoredVisibleFiles"] == 2  # type: ignore[index]
        assert manifest["totals"]["studentAssessmentFiles"] == 3  # type: ignore[index]
        assert manifest["totals"]["strategySupportFiles"] == 1  # type: ignore[index]
        assert_no_private_artifacts(manifest)
    print("Self-test passed: metadata-only BNU high S4 upper assessment manifest built without content extraction.")


def default_zip_paths() -> list[Path]:
    raw_value = os.environ.get(ZIP_PATHS_ENV_VAR, "")
    return [Path(value) for value in raw_value.split(os.pathsep) if value.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland BNU high S4 upper assessment archive metadata manifest.")
    parser.add_argument(
        "zip_paths",
        nargs="*",
        help=f"Paths to private BNU high S4 upper assessment ZIP archives. If omitted, read {ZIP_PATHS_ENV_VAR}.",
    )
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/.")
    parser.add_argument("--self-test", action="store_true", help="Run a metadata-only smoke test with temporary fake ZIP archives.")
    args = parser.parse_args()
    if args.self_test:
        run_self_test()
        return
    zip_paths = [Path(path) for path in args.zip_paths] if args.zip_paths else default_zip_paths()
    if not zip_paths:
        raise SystemExit(f"At least one ZIP path is required unless --self-test is used; pass paths or set {ZIP_PATHS_ENV_VAR}.")
    manifest = build_manifest(zip_paths)
    assert_no_private_artifacts(manifest)
    write_outputs(manifest, Path(args.out_dir).expanduser())
    print(f"Wrote {manifest['totals']['validDocuments']} metadata-only BNU high S4 upper assessment entries to {args.out_dir}")  # type: ignore[index]


if __name__ == "__main__":
    main()
