#!/usr/bin/env python3
"""Build local-only metadata artifacts for Mainland BNU S5 assessments.

The target is owner-provided Beijing Normal University Press selective
compulsory-one assessment archives. Outputs are metadata-only and live under
ignored `.local/`. The script records counts, member digests, coarse roles,
assessment families, material kinds, chapter signals, and safe pattern-slot
signals only. It never extracts or writes document body text, source item
wording, response-key text, worked-response text, scoring wording, table or
figure bodies, page images, page locators, original member paths, OCR output,
archive names, source member names, extracted semantic indexes, or retrieval
payloads. Local digests are retained under `.local/` only for private dedupe
and QA traceability.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


DEFAULT_OUT_DIR = Path(".local/rag/mainland-bnu-high-s5-assessments")
ZIP_PATHS_ENV_VAR = "MAIS_BNU_HIGH_S5_ASSESSMENT_ZIPS"
SUPPORTED_EXTENSIONS = {".docx"}
MANIFEST_NAME = "manifest.json"
QA_REPORT_NAME = "qa-report.md"
BODY_SENTINEL = "MAIS_BODY_SENTINEL_SHOULD_NOT_APPEAR"
SAFETY_NOTE = (
    "Metadata-only local artifact. Do not commit private archives, archive "
    "names, source member names, source paths, extracted document text, source "
    "item wording, response-key text, worked-response text, scoring wording, "
    "table bodies, figure bodies, page images, page-location data, OCR output, "
    "derived semantic indexes, or retrieval payloads. Local digests are for "
    "private dedupe and QA traceability only and must not be committed."
)

TARGET_GRADE = "S5"
TARGET_SEMESTER = "full-year"
VOLUME_SCOPE = "selective-compulsory-1"
EXPECTED_DOCUMENTS = 40
EXPECTED_STUDENT_ASSESSMENTS = 20
EXPECTED_RESPONSE_SUPPORT = 20
KNOWN_COVERAGE_GAPS = [
    "Owner-provided S5 selective-compulsory-one assessment archives contain no clear fourth-chapter assessment slot; keep it as a source coverage gap and do not infer missing chapter coverage."
]

UNIT_CONCEPTS = {
    "直线与圆": ["line-equations", "circle-equations", "point-line-distance", "analytic-geometry"],
    "圆锥曲线": ["conics", "ellipse", "hyperbola", "parabola-conic", "line-conic-intersection"],
    "空间向量与立体几何": ["space-vectors", "solid-geometry", "spatial-proof", "distance-in-space"],
    "计数原理": ["counting-principles", "permutations-combinations", "binomial-theorem"],
    "概率": ["probability", "sample-space", "event-relationships", "counting-probability-synthesis"],
    "统计案例": ["statistical-case-study", "regression-introduction", "data-interpretation"],
    "排列组合专题": ["permutations-combinations", "case-analysis", "counting-strategy-taxonomy"],
    "二项式定理专题": ["binomial-theorem", "coefficient-extraction", "counting-algebra-connection"],
}

PATTERN_SLOT_SPECS = [
    {
        "slot": "bnu-high-s5-assessment-lines-circles-unit-core",
        "unitSignals": ["直线与圆"],
        "conceptSignals": ["line-equations", "circle-equations", "point-line-distance", "analytic-geometry"],
        "assessmentFamilies": ["unit-test"],
        "materialKinds": ["unit-test", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-lines-circles-unit-synthesis",
        "unitSignals": ["直线与圆"],
        "conceptSignals": ["line-equations", "circle-equations", "coordinate-method", "analytic-geometry-synthesis"],
        "assessmentFamilies": ["unit-test", "comprehensive"],
        "materialKinds": ["unit-test", "comprehensive-assessment", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-conics-unit-core",
        "unitSignals": ["圆锥曲线"],
        "conceptSignals": ["conics", "ellipse", "hyperbola", "parabola-conic", "standard-equations"],
        "assessmentFamilies": ["unit-test"],
        "materialKinds": ["unit-test", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-conics-unit-synthesis",
        "unitSignals": ["圆锥曲线"],
        "conceptSignals": ["conics", "line-conic-intersection", "parameter-feasibility", "conic-synthesis"],
        "assessmentFamilies": ["unit-test", "comprehensive"],
        "materialKinds": ["unit-test", "comprehensive-assessment", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-space-vectors-unit-core",
        "unitSignals": ["空间向量与立体几何"],
        "conceptSignals": ["space-vectors", "solid-geometry", "spatial-proof", "angle-distance"],
        "assessmentFamilies": ["unit-test"],
        "materialKinds": ["unit-test", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-space-vectors-unit-synthesis",
        "unitSignals": ["空间向量与立体几何"],
        "conceptSignals": ["space-vectors", "parallel-perpendicular", "spatial-proof", "distance-in-space"],
        "assessmentFamilies": ["unit-test", "comprehensive"],
        "materialKinds": ["unit-test", "comprehensive-assessment", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-counting-unit-core",
        "unitSignals": ["计数原理"],
        "conceptSignals": ["counting-principles", "permutations-combinations", "binomial-theorem"],
        "assessmentFamilies": ["unit-test"],
        "materialKinds": ["unit-test", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-counting-unit-synthesis",
        "unitSignals": ["计数原理"],
        "conceptSignals": ["case-analysis", "complement-counting", "binomial-coefficients", "counting-synthesis"],
        "assessmentFamilies": ["unit-test", "comprehensive"],
        "materialKinds": ["unit-test", "comprehensive-assessment", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-probability-unit-core",
        "unitSignals": ["概率"],
        "conceptSignals": ["probability", "sample-space", "event-relationships"],
        "assessmentFamilies": ["unit-test"],
        "materialKinds": ["unit-test", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-probability-unit-synthesis",
        "unitSignals": ["概率"],
        "conceptSignals": ["probability-modeling", "conditional-probability-readiness", "counting-probability-synthesis"],
        "assessmentFamilies": ["unit-test", "comprehensive"],
        "materialKinds": ["unit-test", "comprehensive-assessment", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-statistics-case-unit",
        "unitSignals": ["统计案例"],
        "conceptSignals": ["statistical-case-study", "regression-introduction", "data-interpretation"],
        "assessmentFamilies": ["unit-test"],
        "materialKinds": ["unit-test", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-permutation-combination-topic-review",
        "unitSignals": ["排列组合专题", "计数原理"],
        "conceptSignals": ["permutations-combinations", "case-analysis", "counting-strategy-taxonomy"],
        "assessmentFamilies": ["topic-review"],
        "materialKinds": ["topic-practice", "review", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-binomial-theorem-topic-review",
        "unitSignals": ["二项式定理专题", "计数原理"],
        "conceptSignals": ["binomial-theorem", "coefficient-extraction", "counting-algebra-connection"],
        "assessmentFamilies": ["topic-review"],
        "materialKinds": ["topic-practice", "review", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-midterm-integrated",
        "unitSignals": ["高二期中综合", "直线与圆", "圆锥曲线", "空间向量与立体几何"],
        "conceptSignals": ["analytic-geometry", "conics", "space-vectors", "assessment-synthesis"],
        "assessmentFamilies": ["midterm", "comprehensive"],
        "materialKinds": ["midterm-final", "paper"],
    },
    {
        "slot": "bnu-high-s5-assessment-final-integrated",
        "unitSignals": ["高二期末综合", "直线与圆", "圆锥曲线", "空间向量与立体几何", "计数原理", "概率", "统计案例"],
        "conceptSignals": ["analytic-geometry-synthesis", "counting-probability-synthesis", "statistics-case-study", "assessment-synthesis"],
        "assessmentFamilies": ["final", "comprehensive"],
        "materialKinds": ["midterm-final", "paper"],
    },
]

PATTERN_SLOTS = [spec["slot"] for spec in PATTERN_SLOT_SPECS]
SPEC_BY_SLOT = {spec["slot"]: spec for spec in PATTERN_SLOT_SPECS}


def contains_any(text: str, markers: list[str]) -> bool:
    return any(marker in text for marker in markers)


def sorted_unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


def sorted_counter(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted(counter.items(), key=lambda item: (-item[1], item[0])))


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
    signals = [
        "数学",
        "北师大",
        "选择性必修",
        "单元",
        "期中",
        "期末",
        "直线",
        "圆锥",
        "空间向量",
        "计数",
        "概率",
        "统计",
        "排列",
        "二项式",
    ]
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
    if contains_any(name, ["解析", "详解", "讲评", "解答", "参考", "答案", "教师"]):
        return "response-support"
    if contains_any(name, ["资源", "素材", "课件", "说明"]):
        return "assessment-resource"
    return "student-assessment"


def variant_for(name: str, source_role: str) -> str:
    if contains_any(name, ["原卷", "学生"]):
        return "student-version"
    if source_role in {"response-support", "answer-card-support"}:
        return "support-version"
    return "unspecified-student-version"


def pattern_slots_for(name: str) -> list[str]:
    slots: list[str] = []
    term_scope_name = name.replace("期中期末", "")
    is_midterm = contains_any(term_scope_name, ["期中"])
    is_final = contains_any(term_scope_name, ["期末", "期终"])
    is_synthesis = contains_any(name, ["综合", "提升", "能力"])
    is_core = contains_any(name, ["基础", "巩固", "考点梳理"])

    if is_midterm:
        slots.append("bnu-high-s5-assessment-midterm-integrated")
    if is_final:
        slots.append("bnu-high-s5-assessment-final-integrated")
    if contains_any(name, ["二项式"]):
        slots.append("bnu-high-s5-assessment-binomial-theorem-topic-review")
    if contains_any(name, ["排列组合"]):
        slots.append("bnu-high-s5-assessment-permutation-combination-topic-review")
    if contains_any(name, ["第一章", "第1章", "直线与圆"]):
        slots.append("bnu-high-s5-assessment-lines-circles-unit-synthesis" if is_synthesis and not is_core else "bnu-high-s5-assessment-lines-circles-unit-core")
    if contains_any(name, ["第二章", "第2章", "圆锥曲线"]):
        slots.append("bnu-high-s5-assessment-conics-unit-synthesis" if is_synthesis and not is_core else "bnu-high-s5-assessment-conics-unit-core")
    if contains_any(name, ["第三章", "第3章", "空间向量", "立体几何"]):
        slots.append("bnu-high-s5-assessment-space-vectors-unit-synthesis" if is_synthesis and not is_core else "bnu-high-s5-assessment-space-vectors-unit-core")
    if contains_any(name, ["第五章", "第5章", "计数原理"]):
        slots.append("bnu-high-s5-assessment-counting-unit-synthesis" if is_synthesis and not is_core else "bnu-high-s5-assessment-counting-unit-core")
    if contains_any(name, ["第六章", "第6章", "概率"]):
        slots.append("bnu-high-s5-assessment-probability-unit-synthesis" if is_synthesis and not is_core else "bnu-high-s5-assessment-probability-unit-core")
    if contains_any(name, ["第七章", "第7章", "统计案例"]):
        slots.append("bnu-high-s5-assessment-statistics-case-unit")
    return sorted_unique(slots)


def unit_signals_for(pattern_slots: list[str]) -> list[str]:
    unit_signals: list[str] = []
    for slot in pattern_slots:
        unit_signals.extend(SPEC_BY_SLOT[slot]["unitSignals"])
    return sorted_unique(unit_signals)


def concept_signals_for(pattern_slots: list[str]) -> list[str]:
    concept_signals: list[str] = []
    for slot in pattern_slots:
        concept_signals.extend(SPEC_BY_SLOT[slot]["conceptSignals"])
    return sorted_unique(concept_signals)


def material_kinds_for(pattern_slots: list[str]) -> list[str]:
    material_kinds: list[str] = []
    for slot in pattern_slots:
        material_kinds.extend(SPEC_BY_SLOT[slot]["materialKinds"])
    return sorted_unique(material_kinds) or ["paper"]


def assessment_families_for(pattern_slots: list[str]) -> list[str]:
    families: list[str] = []
    for slot in pattern_slots:
        families.extend(SPEC_BY_SLOT[slot]["assessmentFamilies"])
    return sorted_unique(families) or ["comprehensive"]


def alignment_status(source_role: str, pattern_slots: list[str], suspicious: str | None) -> tuple[str, str]:
    if suspicious:
        return "quarantine", suspicious
    if source_role in {"answer-card-support", "response-support"}:
        return "support-only", ""
    if source_role == "assessment-resource":
        return "needs-s18-review", "resource-not-assessment-form"
    if not pattern_slots:
        return "needs-s18-review", "insufficient-explicit-target-signal"
    return "current-safe-candidate", ""


def extraction_quality_for(source_role: str, extension: str, pattern_slots: list[str]) -> str:
    if source_role == "answer-card-support":
        return "support-artifact-excluded"
    if source_role == "response-support":
        return "response-support-excluded"
    if extension != ".docx":
        return "unsupported-extension"
    if not pattern_slots:
        return "needs-s18-mapping-review"
    return "metadata-ready"


def sha256_for_member(archive: ZipFile, info: ZipInfo) -> str:
    digest = hashlib.sha256()
    with archive.open(info) as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def classify_archive_entry(archive: ZipFile, info: ZipInfo, ordinal: int) -> tuple[dict[str, object] | None, dict[str, object] | None]:
    decoded_name = decode_zip_name(info.filename)
    if info.is_dir() or is_hidden_or_mac_entry(decoded_name):
        return None, None
    extension = Path(decoded_name).suffix.lower()
    suspicious = suspicious_reason(decoded_name)
    if suspicious or extension not in SUPPORTED_EXTENSIONS:
        return None, {
            "archiveOrdinal": None,
            "extension": extension or "<none>",
            "reason": suspicious or "unsupported-extension",
        }

    source_role = source_role_for(decoded_name)
    pattern_slots = pattern_slots_for(decoded_name)
    unit_signals = unit_signals_for(pattern_slots)
    concept_signals = concept_signals_for(pattern_slots)
    material_kinds = material_kinds_for(pattern_slots)
    assessment_families = assessment_families_for(pattern_slots)
    status, reason = alignment_status(source_role, pattern_slots, suspicious)

    return {
        "id": f"bnu-high-s5-assessment-entry-{ordinal:04d}",
        "publisher": "MAINLAND_BNU",
        "stage": "senior-secondary",
        "grade": TARGET_GRADE,
        "semester": TARGET_SEMESTER,
        "volumeScope": VOLUME_SCOPE,
        "extension": extension,
        "contentSha256": sha256_for_member(archive, info),
        "sourceRole": source_role,
        "variant": variant_for(decoded_name, source_role),
        "materialKinds": material_kinds,
        "assessmentFamilies": assessment_families,
        "unitSignals": unit_signals,
        "conceptSignals": concept_signals,
        "patternSlots": pattern_slots,
        "alignmentStatus": status,
        "quarantineReason": reason,
        "patternMiningEligible": status == "current-safe-candidate" and source_role == "student-assessment",
        "extractionQuality": extraction_quality_for(source_role, extension, pattern_slots),
        "retentionPolicy": "metadata-only-local",
        "safetyNote": SAFETY_NOTE,
    }, None


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


def slot_role_counts(entries: list[dict[str, object]]) -> dict[str, dict[str, int]]:
    result: dict[str, dict[str, int]] = {}
    for slot in PATTERN_SLOTS:
        slot_entries = [entry for entry in entries if slot in entry.get("patternSlots", [])]
        result[slot] = {
            "studentAssessmentFiles": sum(1 for entry in slot_entries if entry.get("sourceRole") == "student-assessment"),
            "responseSupportFiles": sum(1 for entry in slot_entries if entry.get("sourceRole") == "response-support"),
            "patternMiningEligibleFiles": sum(1 for entry in slot_entries if entry.get("patternMiningEligible") is True),
        }
    return result


def coverage(entries: list[dict[str, object]]) -> dict[str, object]:
    safe_or_support = [
        entry for entry in entries
        if entry["alignmentStatus"] in {"current-safe-candidate", "support-only", "needs-s18-review"}
    ]
    core_units = ["直线与圆", "圆锥曲线", "空间向量与立体几何", "计数原理", "概率", "统计案例"]
    unit_coverage = {
        unit_signal: sum(1 for entry in safe_or_support if unit_signal in entry.get("unitSignals", []))
        for unit_signal in core_units
    }
    pattern_slot_coverage = {
        pattern_slot: sum(1 for entry in safe_or_support if pattern_slot in entry.get("patternSlots", []))
        for pattern_slot in PATTERN_SLOTS
    }
    return {
        "target": f"{TARGET_GRADE}:{TARGET_SEMESTER}",
        "volumeScope": VOLUME_SCOPE,
        "expectedDocuments": EXPECTED_DOCUMENTS,
        "targetCoverage": {f"{TARGET_GRADE}:{TARGET_SEMESTER}": len(safe_or_support)},
        "targetCovered": len(safe_or_support) == EXPECTED_DOCUMENTS,
        "targetUnitCoverage": unit_coverage,
        "targetUnitsComplete": all(count > 0 for count in unit_coverage.values()),
        "targetPatternSlotCoverage": pattern_slot_coverage,
        "targetPatternSlotsComplete": all(count > 0 for count in pattern_slot_coverage.values()),
        "patternSlotRoleCounts": slot_role_counts(entries),
        "knownCoverageGaps": KNOWN_COVERAGE_GAPS,
        "patternMiningEligibleFiles": sum(1 for entry in entries if entry.get("patternMiningEligible") is True),
        "supportArtifactsExcluded": sum(
            1
            for entry in entries
            if entry.get("sourceRole") in {"answer-card-support", "response-support"} and entry.get("patternMiningEligible") is False
        ),
    }


def manual_review_queue(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    queue = []
    for entry in entries:
        if entry.get("alignmentStatus") not in {"needs-s18-review", "quarantine"}:
            continue
        queue.append({
            "id": entry["id"],
            "grade": entry["grade"],
            "semester": entry["semester"],
            "volumeScope": entry["volumeScope"],
            "extension": entry["extension"],
            "sourceRole": entry["sourceRole"],
            "variant": entry["variant"],
            "materialKinds": entry["materialKinds"],
            "assessmentFamilies": entry["assessmentFamilies"],
            "unitSignals": entry["unitSignals"],
            "patternSlots": entry["patternSlots"],
            "alignmentStatus": entry["alignmentStatus"],
            "quarantineReason": entry["quarantineReason"],
            "patternMiningEligible": entry["patternMiningEligible"],
        })
    return queue


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
        archive_digest = hashlib.sha256()
        before_count = len(entries)
        with zip_path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                archive_digest.update(chunk)
        with ZipFile(zip_path) as archive:
            for info in archive.infolist():
                decoded_name = decode_zip_name(info.filename)
                if is_hidden_or_mac_entry(decoded_name):
                    hidden_entries += 1
                    continue
                visible_entries += 1
                if info.is_dir():
                    continue
                visible_files += 1
                ordinal += 1
                entry, ignored = classify_archive_entry(archive, info, ordinal)
                if entry:
                    entries.append(entry)
                if ignored:
                    ignored_visible_files += 1
                    ignored["archiveOrdinal"] = archive_index
                    ignored_entries.append(ignored)
        archive_entries = entries[before_count:]
        archives.append({
            "archiveOrdinal": archive_index,
            "archiveSha256": archive_digest.hexdigest(),
            "visibleEntries": visible_entries,
            "visibleFiles": visible_files,
            "manifestedFiles": len(archive_entries),
            "hiddenArchiveEntriesExcluded": hidden_entries,
            "ignoredVisibleFiles": ignored_visible_files,
            "alignmentStatusCounts": count_by(archive_entries, "alignmentStatus"),
        })

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "publisher": "MAINLAND_BNU",
        "stage": "senior-secondary",
        "gradeSemesterTarget": f"{TARGET_GRADE}:{TARGET_SEMESTER}",
        "volumeScope": VOLUME_SCOPE,
        "artifactKind": "metadata-only-bnu-high-s5-assessment-manifest",
        "safetyPolicy": "metadata-only-local",
        "safetyNote": SAFETY_NOTE,
        "archives": archives,
        "coverage": coverage(entries),
        "totals": {
            "archives": len(zip_paths),
            "files": len(entries),
            "expectedDocuments": EXPECTED_DOCUMENTS,
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
            "quarantineReasons": count_by([entry for entry in entries if entry["quarantineReason"]], "quarantineReason"),
            "materialKinds": list_count(entries, "materialKinds"),
            "assessmentFamilies": list_count(entries, "assessmentFamilies"),
            "unitSignals": list_count(entries, "unitSignals"),
            "conceptSignals": list_count(entries, "conceptSignals"),
            "patternSlots": list_count(entries, "patternSlots"),
            "sourceRoles": count_by(entries, "sourceRole"),
            "variants": count_by(entries, "variant"),
            "extractionQuality": count_by(entries, "extractionQuality"),
        },
        "ignoredEntries": ignored_entries,
        "manualReviewQueue": manual_review_queue(entries),
        "entries": entries,
    }
    return manifest


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage_info = manifest["coverage"]  # type: ignore[index]
    counts = manifest["counts"]  # type: ignore[index]
    return "\n".join([
        "# Mainland BNU High S5 Assessment Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Publisher: {manifest['publisher']}",
        f"- Stage: {manifest['stage']}",
        f"- Target: {manifest['gradeSemesterTarget']}",
        f"- Volume scope: {manifest['volumeScope']}",
        f"- Archives inspected: {totals['archives']}",
        f"- Files manifested: {totals['files']}",
        f"- Expected documents: {totals['expectedDocuments']}",
        f"- Student-assessment files: {totals['studentAssessmentFiles']}",
        f"- Response-support files: {totals['responseSupportFiles']}",
        f"- Current safe candidate files: {totals['currentSafeCandidateFiles']}",
        f"- Support-only files: {totals['supportOnlyFiles']}",
        f"- Needs S18 review files: {totals['needsS18ReviewFiles']}",
        f"- Quarantined files: {totals['quarantinedFiles']}",
        f"- Ignored visible files: {totals['ignoredVisibleFiles']}",
        f"- Target covered: {coverage_info['targetCovered']}",
        f"- Target unit coverage: {json.dumps(coverage_info['targetUnitCoverage'], ensure_ascii=False)}",
        f"- Target pattern slot coverage: {json.dumps(coverage_info['targetPatternSlotCoverage'], ensure_ascii=False)}",
        f"- Pattern slot role counts: {json.dumps(coverage_info['patternSlotRoleCounts'], ensure_ascii=False)}",
        f"- Known coverage gaps: {json.dumps(coverage_info['knownCoverageGaps'], ensure_ascii=False)}",
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
        "- Passed: metadata only; no document bodies, source member paths, source member names, archive names, page locators, OCR output, derived semantic indexes, or retrieval payloads are written; local digests remain ignored under `.local/`.",
        "- Passed: response-support and answer-card artifacts are marked `patternMiningEligible=false`.",
        "- Passed: S5 upper/lower semester labels are normalized to `full-year` for this assessment-pattern layer.",
        "- Required before student-facing use: S18 reviews future generated MAIS practice for originality, mathematics, terminology, and grade fit.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / MANIFEST_NAME).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / QA_REPORT_NAME).write_text(qa_report(manifest), encoding="utf-8")


def add_entry(archive: ZipFile, name: str) -> None:
    archive.writestr(mojibake_zip_name(name), BODY_SENTINEL.encode("utf-8"))


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
        "unit/",
        "term/",
        "student.docx",
        "support.docx",
        BODY_SENTINEL,
        "embedding",
        "vectorPayload",
    ]:
        assert forbidden not in serialized, f"Manifest leaked forbidden marker: {forbidden}"


def run_self_test() -> None:
    with TemporaryDirectory() as tmp:
        source_dir = Path(tmp) / "synthetic-bnu-high-s5"
        source_dir.mkdir(parents=True)
        unit_zip = source_dir / "unit-archive.zip"
        term_zip = source_dir / "term-archive.zip"
        unit_names = [
            "第一章 直线与圆 基础检测 student.docx",
            "第一章 直线与圆 综合检测 student.docx",
            "第二章 圆锥曲线 基础检测 student.docx",
            "第二章 圆锥曲线 综合检测 student.docx",
            "第三章 空间向量与立体几何 基础巩固检测 student.docx",
            "第三章 空间向量与立体几何 综合提升检测 student.docx",
            "第五章 计数原理 基础检测 student.docx",
            "第五章 计数原理 综合检测 student.docx",
            "第六章 概率 基础检测 student.docx",
            "第六章 概率 综合检测 student.docx",
            "第七章 统计案例 基础检测 student.docx",
            "第七章 统计案例 综合检测 student.docx",
            "重难点01 排列组合 常见题型 student.docx",
            "重难点02 排列组合 策略复习 student.docx",
            "重难点 排列组合 常见策略 student.docx",
            "重难点03 二项式定理 策略复习 student.docx",
        ]
        term_names = [
            "高二数学 期中模拟卷 one student.docx",
            "高二数学 期中模拟卷 two student.docx",
            "高二数学 期末模拟卷 one student.docx",
            "高二数学 期末模拟卷 two student.docx",
        ]
        with ZipFile(unit_zip, "w", compression=ZIP_DEFLATED) as archive:
            for unit_name in unit_names:
                add_entry(archive, f"unit/{unit_name}")
                add_entry(archive, f"unit/{unit_name.replace('student.docx', 'support 解析.docx')}")
            archive.writestr(mojibake_zip_name("__MACOSX/._hidden.docx"), b"hidden")
            archive.writestr(mojibake_zip_name("unit/readme.txt"), b"metadata")
        with ZipFile(term_zip, "w", compression=ZIP_DEFLATED) as archive:
            for term_name in term_names:
                add_entry(archive, f"term/{term_name}")
                add_entry(archive, f"term/{term_name.replace('student.docx', 'support 解析.docx')}")

        manifest = build_manifest([unit_zip, term_zip])
        assert manifest["totals"]["files"] == 40  # type: ignore[index]
        assert manifest["totals"]["ignoredVisibleFiles"] == 1  # type: ignore[index]
        assert manifest["totals"]["studentAssessmentFiles"] == 20  # type: ignore[index]
        assert manifest["totals"]["responseSupportFiles"] == 20  # type: ignore[index]
        assert manifest["totals"]["currentSafeCandidateFiles"] == 20  # type: ignore[index]
        assert manifest["totals"]["supportOnlyFiles"] == 20  # type: ignore[index]
        assert manifest["totals"]["needsS18ReviewFiles"] == 0  # type: ignore[index]
        assert manifest["totals"]["quarantinedFiles"] == 0  # type: ignore[index]
        assert manifest["coverage"]["targetCovered"] is True  # type: ignore[index]
        assert manifest["coverage"]["targetUnitsComplete"] is True  # type: ignore[index]
        assert manifest["coverage"]["targetPatternSlotsComplete"] is True  # type: ignore[index]
        assert len(manifest["coverage"]["knownCoverageGaps"]) == 1  # type: ignore[index]
        assert manifest["coverage"]["patternMiningEligibleFiles"] == 20  # type: ignore[index]
        assert manifest["coverage"]["supportArtifactsExcluded"] == 20  # type: ignore[index]
        assert manifest["counts"]["extensions"] == {".docx": 40}  # type: ignore[index]
        for archive_summary in manifest["archives"]:  # type: ignore[index]
            assert len(archive_summary["archiveSha256"]) == 64
        for entry in manifest["entries"]:  # type: ignore[index]
            assert len(entry["contentSha256"]) == 64
        assert_no_private_artifacts(manifest)
    print("Self-test passed: metadata-only BNU high S5 assessment manifest built without content extraction.")


def default_zip_paths() -> list[Path]:
    raw_value = os.environ.get(ZIP_PATHS_ENV_VAR, "")
    return [Path(value) for value in raw_value.split(os.pathsep) if value.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Mainland BNU high S5 assessment archive metadata manifest.")
    parser.add_argument(
        "zip_paths",
        nargs="*",
        help=f"Paths to private BNU high S5 assessment ZIP archives. If omitted, read {ZIP_PATHS_ENV_VAR}.",
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
    write_outputs(manifest, Path(args.out_dir).expanduser())
    print(f"Wrote {manifest['totals']['files']} metadata-only BNU high S5 assessment entries to {args.out_dir}")


if __name__ == "__main__":
    main()
