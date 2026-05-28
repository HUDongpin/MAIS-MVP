#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland BNU S4 lower assessments.

Outputs are metadata-only and live under ignored `.local/`. The script never
extracts or writes document body text, source item wording, response-key text,
worked-response text, scoring wording, table or figure bodies, page images,
page locators, OCR output, archive names, source member names, source file
identifiers, checksums, embeddings, or vector payloads.
"""

from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


DEFAULT_OUT_DIR = Path(".local/rag/mainland-bnu-high-s4-lower-assessments")
ZIP_PATHS_ENV_VAR = "MAIS_BNU_HIGH_S4_LOWER_ASSESSMENT_ZIPS"
MANIFEST_NAME = "manifest.json"
QA_REPORT_NAME = "qa-report.md"
BODY_SENTINEL = "MAIS_BODY_SENTINEL_SHOULD_NOT_APPEAR"
SUPPORTED_EXTENSIONS = {".doc", ".docx"}
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit private archives, archive names, "
    "member names, source paths, extracted document text, source item wording, "
    "response-key text, worked-response text, scoring wording, table bodies, "
    "figure bodies, page-location data, OCR output, checksums, source "
    "identifiers, or retrieval payloads."
)

TARGET_GRADE = "S4"
TARGET_SEMESTER = "lower"
KNOWN_COVERAGE_GAPS = [
    "S4 lower chapter 3 is not represented in the current local material set; keep it as a coverage gap and do not infer a safe card without owner-provided material."
]
PATTERN_SLOTS = [
    "unit-trigonometric-functions",
    "review-trigonometric-functions",
    "unit-plane-vectors-applications",
    "review-plane-vectors-applications",
    "unit-trig-identities-transformations",
    "review-trig-identities-transformations",
    "unit-complex-numbers",
    "review-complex-numbers",
    "unit-solid-geometry-introduction",
    "midterm-integrated-s4-lower",
    "final-integrated-s4-lower",
]
UNIT_CONCEPTS = {
    "三角函数": ["trigonometric-functions", "unit-circle", "trigonometric-graphs", "periodicity"],
    "平面向量及其应用": ["plane-vectors", "vector-operations", "dot-product", "vector-applications"],
    "三角恒等变换": ["trigonometric-identities", "angle-sum-formulas", "double-angle-formulas"],
    "复数": ["complex-numbers", "complex-operations", "complex-plane"],
    "立体几何初步": ["solid-geometry", "spatial-lines-planes", "surface-volume"],
}
UNIT_SLOT_MAP = {
    "三角函数": ("unit-trigonometric-functions", "review-trigonometric-functions"),
    "平面向量及其应用": ("unit-plane-vectors-applications", "review-plane-vectors-applications"),
    "三角恒等变换": ("unit-trig-identities-transformations", "review-trig-identities-transformations"),
    "复数": ("unit-complex-numbers", "review-complex-numbers"),
    "立体几何初步": ("unit-solid-geometry-introduction", ""),
}


def contains_any(text: str, markers: list[str]) -> bool:
    return any(marker in text for marker in markers)


def unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def decode_zip_name(name: str) -> str:
    try:
        raw = name.encode("cp437")
    except UnicodeEncodeError:
        return name
    candidates: list[str] = []
    for encoding in ("gb18030", "gbk", "utf-8"):
        try:
            candidates.append(raw.decode(encoding))
        except UnicodeDecodeError:
            pass
    signals = ["数学", "北师大", "单元", "期中", "期末", "三角", "向量", "复数", "立体几何"]
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


def source_role_for(name: str) -> str:
    if contains_any(name, ["答题卡", "答题纸", "答题支持"]):
        return "answer-card-support"
    if contains_any(name, ["全解全析", "解析", "详解", "讲评", "解答", "参考", "答案", "教师"]):
        return "response-support"
    if contains_any(name, ["资源", "素材", "课件", "说明"]):
        return "assessment-resource"
    return "student-assessment"


def material_kinds_for(name: str) -> list[str]:
    kinds: list[str] = []
    if contains_any(name, ["单元", "测试", "检测", "测评"]):
        kinds.append("unit-test")
    if contains_any(name, ["章末", "重点题型", "专题", "专项"]):
        kinds.append("topic-practice")
    if contains_any(name, ["期中", "期末", "模拟"]):
        kinds.append("midterm-final")
    if contains_any(name, ["综合", "全册", "模拟"]):
        kinds.append("comprehensive-assessment")
    if contains_any(name, ["章末", "重点题型", "复习", "专题", "专项"]):
        kinds.append("review")
    if contains_any(name, ["试卷", "卷", "测试", "检测", "测评", "材料"]):
        kinds.append("paper")
    return unique(kinds) or ["paper"]


def unit_signals_for(name: str) -> list[str]:
    signals: list[str] = []
    term_scope_name = name.replace("期中期末", "")
    if contains_any(name, ["第一章", "第1章", "三角函数"]):
        signals.append("三角函数")
    if contains_any(name, ["第二章", "第2章", "平面向量", "向量及其应用"]):
        signals.append("平面向量及其应用")
    if contains_any(name, ["第四章", "第4章", "三角恒等"]):
        signals.append("三角恒等变换")
    if contains_any(name, ["第五章", "第5章", "复数"]):
        signals.append("复数")
    if contains_any(name, ["第六章", "第6章", "立体几何"]):
        signals.append("立体几何初步")
    if contains_any(term_scope_name, ["期中"]):
        signals.extend(["三角函数", "平面向量及其应用"])
    if contains_any(term_scope_name, ["期末", "全册"]):
        signals.extend(UNIT_CONCEPTS.keys())
    return unique(signals)


def pattern_slots_for(name: str, unit_signals: list[str]) -> list[str]:
    slots: list[str] = []
    term_scope_name = name.replace("期中期末", "")
    if contains_any(term_scope_name, ["期中"]):
        slots.append("midterm-integrated-s4-lower")
    if contains_any(term_scope_name, ["期末"]):
        slots.append("final-integrated-s4-lower")
    is_review = contains_any(name, ["章末", "重点题型", "复习", "专题", "专项"])
    is_unit = contains_any(name, ["单元", "测试", "检测", "测评"]) and not contains_any(term_scope_name, ["期中", "期末"])
    for unit_signal in unit_signals:
        unit_slot, review_slot = UNIT_SLOT_MAP.get(unit_signal, ("", ""))
        if is_review and review_slot:
            slots.append(review_slot)
        elif is_unit and unit_slot:
            slots.append(unit_slot)
    return unique(slots)


def concept_signals_for(unit_signals: list[str]) -> list[str]:
    concepts: list[str] = []
    for unit_signal in unit_signals:
        concepts.extend(UNIT_CONCEPTS.get(unit_signal, []))
    return unique(concepts)


def assessment_families_for(name: str, material_kinds: list[str], pattern_slots: list[str]) -> list[str]:
    families: list[str] = []
    if "unit-test" in material_kinds and not contains_any(name, ["期中", "期末"]):
        families.append("unit-test")
    if contains_any(name, ["期中"]):
        families.append("midterm")
    if contains_any(name, ["期末"]):
        families.append("final")
    if contains_any(name, ["综合", "模拟"]):
        families.append("comprehensive")
    if contains_any(name, ["章末", "重点题型", "专题", "专项"]) or any(slot.startswith("review-") for slot in pattern_slots):
        families.append("topic-review")
    if not families and len(pattern_slots) == 1:
        families.append("unit-test")
    return unique(families) or ["comprehensive"]


def classify_member(decoded_name: str, extension: str, ordinal: int) -> dict[str, object]:
    source_role = source_role_for(decoded_name)
    unit_signals = unit_signals_for(decoded_name)
    pattern_slots = pattern_slots_for(decoded_name, unit_signals)
    concept_signals = concept_signals_for(unit_signals)
    material_kinds = material_kinds_for(Path(decoded_name).name)
    status = "current-safe-candidate"
    reason = ""
    if source_role in {"answer-card-support", "response-support"}:
        status = "support-only"
    elif source_role == "assessment-resource":
        status = "needs-s18-review"
        reason = "resource-not-assessment-form"
    elif not unit_signals and not pattern_slots:
        status = "needs-s18-review"
        reason = "insufficient-explicit-target-signal"
    return {
        "id": f"bnu-high-s4-lower-assessment-entry-{ordinal:04d}",
        "publisher": "MAINLAND_BNU",
        "stage": "senior-secondary",
        "grade": TARGET_GRADE,
        "semester": TARGET_SEMESTER,
        "extension": extension,
        "sourceRole": source_role,
        "materialKinds": material_kinds,
        "assessmentFamilies": assessment_families_for(Path(decoded_name).name, material_kinds, pattern_slots),
        "unitSignals": unit_signals,
        "conceptSignals": concept_signals,
        "patternSlots": pattern_slots,
        "alignmentStatus": status,
        "quarantineReason": reason,
        "patternMiningEligible": status == "current-safe-candidate" and source_role == "student-assessment",
        "extractionQuality": "metadata-ready" if status == "current-safe-candidate" else "support-artifact-excluded",
        "retentionPolicy": "metadata-only-local",
        "safetyNote": SAFETY_NOTE,
    }


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


def coverage(entries: list[dict[str, object]]) -> dict[str, object]:
    eligible_for_coverage = [
        entry for entry in entries
        if entry["alignmentStatus"] in {"current-safe-candidate", "support-only", "needs-s18-review"}
    ]
    unit_coverage = {
        unit: sum(1 for entry in eligible_for_coverage if unit in entry.get("unitSignals", []))
        for unit in sorted(UNIT_CONCEPTS)
    }
    pattern_slot_coverage = {
        slot: sum(1 for entry in eligible_for_coverage if slot in entry.get("patternSlots", []))
        for slot in PATTERN_SLOTS
    }
    return {
        "target": f"{TARGET_GRADE}:{TARGET_SEMESTER}",
        "targetCoverage": {f"{TARGET_GRADE}:{TARGET_SEMESTER}": len(eligible_for_coverage)},
        "targetCovered": len(eligible_for_coverage) > 0,
        "targetUnitCoverage": unit_coverage,
        "targetUnitsComplete": all(count > 0 for count in unit_coverage.values()),
        "targetPatternSlotCoverage": pattern_slot_coverage,
        "targetPatternSlotsComplete": all(count > 0 for count in pattern_slot_coverage.values()),
        "knownCoverageGaps": KNOWN_COVERAGE_GAPS,
        "patternMiningEligibleFiles": sum(1 for entry in entries if entry.get("patternMiningEligible") is True),
        "supportArtifactsExcluded": sum(1 for entry in entries if entry.get("sourceRole") == "response-support"),
    }


def build_manifest(zip_paths: list[Path]) -> dict[str, object]:
    entries: list[dict[str, object]] = []
    ignored_entries: list[dict[str, object]] = []
    archives: list[dict[str, object]] = []
    ordinal = 0
    for archive_index, input_path in enumerate(zip_paths, start=1):
        zip_path = input_path.expanduser().resolve()
        if not zip_path.exists():
            raise FileNotFoundError("Archive not found.")
        if zip_path.suffix.lower() != ".zip":
            raise ValueError("Expected ZIP archive.")
        visible_entries = visible_files = hidden_entries = ignored_visible_files = 0
        before_count = len(entries)
        with ZipFile(zip_path) as archive:
            for info in archive.infolist():
                decoded_name = decode_zip_name(info.filename)
                if is_hidden_or_mac_entry(decoded_name):
                    hidden_entries += 1
                    continue
                visible_entries += 1
                if info.is_dir() or decoded_name.endswith("/"):
                    continue
                visible_files += 1
                extension = Path(decoded_name).suffix.lower()
                suspicious = suspicious_reason(decoded_name)
                if suspicious or extension not in SUPPORTED_EXTENSIONS:
                    ignored_visible_files += 1
                    ignored_entries.append({"archiveOrdinal": archive_index, "extension": extension or "<none>", "reason": suspicious or "unsupported-extension"})
                    continue
                ordinal += 1
                entries.append(classify_member(decoded_name, extension, ordinal))
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
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_BNU",
        "stage": "senior-secondary",
        "gradeSemesterTarget": f"{TARGET_GRADE}:{TARGET_SEMESTER}",
        "artifactKind": "metadata-only-bnu-high-s4-lower-assessment-manifest",
        "safetyPolicy": "metadata-only-local",
        "safetyNote": SAFETY_NOTE,
        "archives": archives,
        "coverage": coverage(entries),
        "totals": {
            "archives": len(zip_paths),
            "files": len(entries),
            "ignoredVisibleFiles": len(ignored_entries),
            "studentAssessmentFiles": sum(1 for entry in entries if entry["sourceRole"] == "student-assessment"),
            "responseSupportFiles": sum(1 for entry in entries if entry["sourceRole"] == "response-support"),
            "currentSafeCandidateFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "current-safe-candidate"),
            "supportOnlyFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "support-only"),
            "needsS18ReviewFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "needs-s18-review"),
            "quarantinedFiles": sum(1 for entry in entries if entry["alignmentStatus"] == "quarantine"),
        },
        "counts": {
            "extensions": count_by(entries, "extension"),
            "alignmentStatus": count_by(entries, "alignmentStatus"),
            "materialKinds": list_count(entries, "materialKinds"),
            "assessmentFamilies": list_count(entries, "assessmentFamilies"),
            "unitSignals": list_count(entries, "unitSignals"),
            "conceptSignals": list_count(entries, "conceptSignals"),
            "patternSlots": list_count(entries, "patternSlots"),
            "sourceRoles": count_by(entries, "sourceRole"),
            "extractionQuality": count_by(entries, "extractionQuality"),
        },
        "ignoredEntries": ignored_entries,
        "entries": entries,
    }


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage_info = manifest["coverage"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    return "\n".join([
        "# Mainland BNU High S4 Lower Assessment Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Target: {manifest['gradeSemesterTarget']}",
        f"- Archives inspected: {totals['archives']}",
        f"- Files manifested: {totals['files']}",
        f"- Student-assessment files: {totals['studentAssessmentFiles']}",
        f"- Response-support files: {totals['responseSupportFiles']}",
        f"- Current safe candidate files: {totals['currentSafeCandidateFiles']}",
        f"- Support-only files: {totals['supportOnlyFiles']}",
        f"- Ignored visible files: {totals['ignoredVisibleFiles']}",
        f"- Target unit coverage: {json.dumps(coverage_info['targetUnitCoverage'], ensure_ascii=False)}",
        f"- Target pattern slot coverage: {json.dumps(coverage_info['targetPatternSlotCoverage'], ensure_ascii=False)}",
        f"- Known coverage gaps: {json.dumps(coverage_info['knownCoverageGaps'], ensure_ascii=False)}",
        f"- Pattern-mining eligible files: {coverage_info['patternMiningEligibleFiles']}",
        f"- Support artifacts excluded: {coverage_info['supportArtifactsExcluded']}",
        f"- Extension counts: {json.dumps(counts['extensions'], ensure_ascii=False)}",
        f"- Assessment-family counts: {json.dumps(counts['assessmentFamilies'], ensure_ascii=False)}",
        f"- Unit-signal counts: {json.dumps(counts['unitSignals'], ensure_ascii=False)}",
        f"- Pattern-slot counts: {json.dumps(counts['patternSlots'], ensure_ascii=False)}",
        f"- Source-role counts: {json.dumps(counts['sourceRoles'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: metadata only; no document bodies, member names, archive names, source paths, page locators, OCR output, checksums, source identifiers, or retrieval payloads are written.",
        "- Passed: response-support artifacts are marked `patternMiningEligible=false`.",
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
        "embedding",
    ]:
        assert forbidden not in serialized, f"Manifest leaked forbidden marker: {forbidden}"


def add_entry(archive: ZipFile, name: str) -> None:
    archive.writestr(mojibake_zip_name(name), BODY_SENTINEL.encode("utf-8"))


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        source_dir = Path(tmp) / "synthetic-bnu-high-s4-lower"
        source_dir.mkdir(parents=True)
        unit_zip = source_dir / "unit-archive.zip"
        term_zip = source_dir / "term-archive.zip"
        with ZipFile(unit_zip, "w", compression=ZIP_DEFLATED) as archive:
            for unit_name in [
                "第一章 三角函数 单元测评 学生材料.docx",
                "第一章 三角函数 章末重点题型 学生材料.docx",
                "第二章 平面向量及其应用 单元测评 学生材料.docx",
                "第二章 平面向量及其应用 章末重点题型 学生材料.docx",
                "第四章 三角恒等变换 单元测评 学生材料.docx",
                "第四章 三角恒等变换 章末重点题型 学生材料.docx",
                "第五章 复数 单元测评 学生材料.docx",
                "第五章 复数 章末重点题型 学生材料.docx",
                "第六章 立体几何初步 单元测评 学生材料.docx",
            ]:
                add_entry(archive, f"unit/{unit_name}")
                add_entry(archive, f"unit/{unit_name.replace('学生材料', '教师支持')}")
            archive.writestr(mojibake_zip_name("__MACOSX/._hidden.docx"), b"hidden")
            archive.writestr(mojibake_zip_name("unit/readme.txt"), b"metadata")
        with ZipFile(term_zip, "w", compression=ZIP_DEFLATED) as archive:
            for term_name in [
                "高一下册数学期中模拟卷一 学生材料.docx",
                "高一下册数学期中模拟卷二 学生材料.docx",
                "高一下册数学期末模拟卷一 学生材料.docx",
                "高一下册数学期末模拟卷二 学生材料.docx",
                "高一下册数学期末模拟卷三 学生材料.docx",
            ]:
                add_entry(archive, f"term/{term_name}")
                add_entry(archive, f"term/{term_name.replace('学生材料', '教师支持')}")
        manifest = build_manifest([unit_zip, term_zip])
        assert manifest["totals"]["files"] == 28  # type: ignore[index]
        assert manifest["totals"]["ignoredVisibleFiles"] == 1  # type: ignore[index]
        assert manifest["totals"]["studentAssessmentFiles"] == 14  # type: ignore[index]
        assert manifest["totals"]["responseSupportFiles"] == 14  # type: ignore[index]
        assert manifest["totals"]["currentSafeCandidateFiles"] == 14  # type: ignore[index]
        assert manifest["totals"]["supportOnlyFiles"] == 14  # type: ignore[index]
        assert manifest["coverage"]["targetUnitsComplete"] is True  # type: ignore[index]
        assert manifest["coverage"]["targetPatternSlotsComplete"] is True  # type: ignore[index]
        assert len(manifest["coverage"]["knownCoverageGaps"]) == 1  # type: ignore[index]
        assert manifest["coverage"]["supportArtifactsExcluded"] == 14  # type: ignore[index]
        assert manifest["counts"]["extensions"] == {".docx": 28}  # type: ignore[index]
        assert_no_private_artifacts(manifest)
    print("Self-test passed: metadata-only BNU high S4 lower assessment manifest built without content extraction.")


def default_zip_paths() -> list[Path]:
    raw_value = os.environ.get(ZIP_PATHS_ENV_VAR, "")
    return [Path(value) for value in raw_value.split(os.pathsep) if value.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland BNU high S4 lower assessment archive metadata manifest.")
    parser.add_argument(
        "zip_paths",
        nargs="*",
        help=f"Paths to private BNU high S4 lower assessment ZIP archives. If omitted, read {ZIP_PATHS_ENV_VAR}.",
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
    print(f"Wrote {manifest['totals']['files']} metadata-only BNU high S4 lower assessment entries to {args.out_dir}")


if __name__ == "__main__":
    main()
